// TRANSFERMARKT TIER-1 POSITION FETCH , read-only, CSV out only. NEVER writes to the DB.
//
//   NODE_PATH=./node_modules node scripts/enrichment/tm_tier1_fetch.js
//
// SCOPE: the 474 remaining Tier-1 cards (rt 80-84) only. Everything below rt 80 is
// deliberately OUT and gets disclosed, not fetched , 86% of the old queue was outside
// the launch coverage standard, and batches 04-05 of the Fable run returned 3% high
// confidence at that rt, so the tail does not pay for itself.
//
// THREE CHANGES FROM tm_bulk_fetch.js:
//
// 1. PER-PLAYER IDENTITY, NOT PER-CARD. Tier 1 is 1.27 cards/player, so caching the
//    resolved TM id removes ~101 of 474 identity resolutions. The CLEARING-RULE lane was
//    scoped and REJECTED for this slice: it costs 373 profile calls and saves ~249 at the
//    measured 21% hit rate, i.e. net-negative. It remains correct for the low-rt tail
//    (5.20 cards/player) if that is ever run , do not re-derive, the economics flip on
//    cards-per-player, not on the rule.
//
// 2. TM ID IS STORED. The old CSV never kept it, so 128 of these 373 players , already
//    resolved during the first run , must be resolved again from nothing. Storing it means
//    no future pass ever repeats identity work.
//
// 3. 429 IS A PERSISTENT SIGNAL, NOT A TRANSIENT ONE. The old script backed off up to 60s
//    and then returned to a 3s delay, which walked straight back into the limit: 43 429s
//    dragged the EFFECTIVE rate to 26.74s/call against a configured 3s. Now a 429 triggers a
//    long cooldown (5/10/20/30 min) AND permanently raises the floor delay by 2s. Abort only
//    if FOUR cooldowns (5+10+20 = 35 min waited) pass with zero successful calls between
//    them , that is a real block,
//    not congestion.
const fs=require("fs");
const SP="/tmp/claude-1000/-home-odoo-projects-VVonderXI/03fc21d4-707a-4e08-9c5b-38461c9f8342/scratchpad";
const OUT="scripts/enrichment/tm_tier1_positions.csv";
const STATE="scripts/enrichment/tm_tier1_state.json";
const UA={"user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"};
const MAXCAND=4;
const NET_RETRY=2;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

let DELAY=6000;                                   // mutable floor, raised permanently on 429
const COOL=[300000,600000,1200000,1800000];       // 5m -> 10m -> 20m -> 30m
let COOLIDX=0, OKSINCE=0, PERSIST=0, COOLDOWNS=0;

const MAP={
  "Left Midfield":"Winger","Right Midfield":"Winger","Left Winger":"Winger","Right Winger":"Winger",
  "Attacking Midfield":"CAM","Second Striker":"CAM",
  "Defensive Midfield":"CDM","Central Midfield":"CM",
  "Centre-Forward":"ST",
  "Goalkeeper":"GK","Centre-Back":"CB","Left-Back":"FB","Right-Back":"FB",
};
const seasonStart=s=>{const t=String(s);return t.length===4?2000+Number(t.slice(0,2)):Number(t);};
const fold=x=>String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const clubMatches=(ourClub,pageText)=>{
  const hay=fold(pageText);
  return String(ourClub).split(/\s+/).filter(w=>w.length>=4).some(w=>hay.includes(fold(w)));
};
const strip=h=>h.replace(/<script[\s\S]*?<\/script>/g,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ");
const esc=v=>{const s=(v===null||v===undefined||v==='')?'':String(v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};

let CALLS=0, T429=0;
class Blocked extends Error{}
async function get(u,depth=0,netTry=0){
  let r;
  try{
    r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(25000)});
  }catch(e){
    if(netTry<NET_RETRY){ await sleep(5000*(netTry+1)); return get(u,depth,netTry+1); }
    throw e;
  }
  CALLS++;
  if(r.status===429||r.status===503){
    T429++;
    // consecutive cooldowns with NO successful call in between = a real block
    PERSIST = (OKSINCE===0 && COOLDOWNS>0) ? PERSIST+1 : 1;
    OKSINCE=0;
    DELAY=Math.min(20000, DELAY+2000);            // permanent floor raise
    const wait=COOL[Math.min(COOLIDX,COOL.length-1)];
    COOLIDX++; COOLDOWNS++;
    console.log("  429 -> cooldown "+(wait/60000)+"m, delay now "+DELAY+"ms (429s "+T429+", persist "+PERSIST+")");
    if(PERSIST>=4) throw new Blocked("persistent 429 after "+COOLDOWNS+" cooldowns");
    await sleep(wait);
    return get(u,depth+1,netTry);
  }
  OKSINCE++;
  if(OKSINCE>50 && COOLIDX>0){ COOLIDX=0; console.log("  recovered , cooldown ladder reset"); }
  return {s:r.status, b:await r.text()};
}

// resolve a player to a TM id ONCE, using their highest-rt card's season for the club check
async function resolveIdentity(p){
  const anchor=p.cards[0];
  const base=String(p.player_name).replace(/^[A-ZÀ-Ý]\.\s*/,"").trim();
  const parts=base.split(/\s+/);
  const tries=[base];
  if(parts.length===2) tries.push(parts[1]+" "+parts[0]);
  let cands=[];
  for(const q of tries){
    const s=await get("https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query="+encodeURIComponent(q));
    cands=[...s.b.matchAll(/href="\/([a-z0-9-]+)\/profil\/spieler\/(\d+)"/g)]
      .filter((m,i,a)=>a.findIndex(x=>x[2]===m[2])===i);
    if(cands.length) break;
    await sleep(DELAY);
  }
  for(const c of cands.slice(0,MAXCAND)){
    await sleep(DELAY);
    const d=await get("https://www.transfermarkt.com/"+c[1]+"/leistungsdatendetails/spieler/"+c[2]+
      "/saison/"+seasonStart(anchor.season)+"/verein/0/liga/0/wettbewerb//pos/0/trainer_id/0/plus/1");
    // club confirmation , NEVER accept a first hit on name alone
    if(clubMatches(anchor.team_name, strip(d.b))) return {slug:c[1], id:c[2], nCand:Math.min(cands.length,MAXCAND)};
  }
  return {slug:null, id:null, nCand:Math.min(cands.length,MAXCAND)};
}

// read one season's position breakdown for an already-resolved player
async function seasonPositions(idn,card){
  const yr=seasonStart(card.season);
  await sleep(DELAY);
  const d=await get("https://www.transfermarkt.com/"+idn.slug+"/leistungsdatendetails/spieler/"+idn.id+
    "/saison/"+yr+"/verein/0/liga/0/wettbewerb//pos/0/trainer_id/0/plus/1");
  const sel=d.b.match(/<select[^>]*name="pos"[^>]*>([\s\S]*?)<\/select>/);
  const opts=sel?[...sel[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>\s*([^<]*?)\s*<\/option>/g)]:[];
  if(!opts.length) return {err:"no position selector on the season page"};
  const bd=[];
  for(const [,code,label] of opts){
    await sleep(DELAY);
    const p=await get("https://www.transfermarkt.com/"+idn.slug+"/leistungsdatendetails/spieler/"+idn.id+
      "/saison/"+yr+"/verein/0/liga/0/wettbewerb//pos/"+code+"/trainer_id/0/plus/1");
    const m=strip(p.b).match(/Total\s*:\s*(\d+)/);
    const apps=m?Number(m[1]):0;
    if(apps>0 && MAP[label]) bd.push({label,bucket:MAP[label],apps});
  }
  return {bd};
}

(async()=>{
  const players=JSON.parse(fs.readFileSync(SP+"/tm_players_tier1.json"));
  const done=new Set();
  if(fs.existsSync(OUT)) fs.readFileSync(OUT,"utf8").split("\n").slice(1).filter(Boolean)
    .forEach(l=>done.add(l.split(",")[0]));
  else fs.writeFileSync(OUT,"card_id,api_player_id,tm_id,player_name,season,club,current_pool,verified_position,confidence,evidence,source,fetched_at\n");

  // rt DESCENDING by each player's best card
  const queue=players.map(p=>({...p,cards:p.cards.filter(c=>!done.has(String(c.card_id)))}))
                     .filter(p=>p.cards.length)
                     .sort((a,b)=>b.cards[0].rt-a.cards[0].rt);
  const nCards=queue.reduce((n,p)=>n+p.cards.length,0);
  console.log("TIER 1 , players "+queue.length+" · cards "+nCards+" · already done "+done.size);
  console.log("DELAY "+DELAY+"ms · cooldowns "+COOL.map(c=>c/60000+"m").join("/")+" · abort only on 3 barren cooldowns\n");

  let nDone=0,nChange=0,nConfirm=0,nUnsure=0,nIdFail=0,nParseFail=0,nNetFail=0,nPlayers=0;
  const t0=Date.now();
  const write=(c,tm,vp,conf,ev)=>{
    fs.appendFileSync(OUT,[c.card_id,c.api_player_id,tm||"",c.player_name,c.season,c.team_name,
      c.position_pool,vp,conf,ev,"transfermarkt",new Date().toISOString()].map(esc).join(",")+"\n");
    if(vp==="UNSURE") nUnsure++; else if(vp===c.position_pool) nConfirm++; else nChange++;
    fs.writeFileSync(STATE,JSON.stringify({done:++nDone,total:nCards,players:nPlayers,calls:CALLS,
      change:nChange,confirm:nConfirm,unsure:nUnsure,idFail:nIdFail,parseFail:nParseFail,netFail:nNetFail,
      t429:T429,cooldowns:COOLDOWNS,delay:DELAY,updated:new Date().toISOString()}));
  };

  try{
    for(const p of queue){
      nPlayers++;
      let idn={slug:null,id:null,nCand:0};
      try{ idn=await resolveIdentity(p); }
      catch(e){
        if(e instanceof Blocked) throw e;
        const code=(e&&e.cause&&e.cause.code)||e.name;
        nNetFail+=p.cards.length;
        p.cards.forEach(c=>write(c,"", "UNSURE","low","NETWORK "+code+" during identity , card not attempted"));
        continue;
      }
      if(!idn.id){
        nIdFail+=p.cards.length;
        p.cards.forEach(c=>write(c,"", "UNSURE","low",
          "identity not resolved: club '"+c.team_name+"' on none of "+idn.nCand+" candidate(s)"));
        continue;
      }
      for(const c of p.cards){
        try{
          const r=await seasonPositions(idn,c);
          if(r.err){ nParseFail++; write(c,idn.id,"UNSURE","low",r.err); continue; }
          const tot=r.bd.reduce((n,x)=>n+x.apps,0);
          if(!tot){ nParseFail++; write(c,idn.id,"UNSURE","low","no positioned appearances for that season"); continue; }
          const agg={}; r.bd.forEach(x=>agg[x.bucket]=(agg[x.bucket]||0)+x.apps);
          const rank=Object.entries(agg).sort((a,b)=>b[1]-a[1]);
          const top=rank[0], second=rank[1]?rank[1][1]:0;
          const share=top[1]/tot;
          let vp=top[0];
          let conf = share>0.5 ? "high" : (top[1]-second)/tot>=0.15 ? "medium" : "low";
          if(conf==="low" && top[1]===second) vp="UNSURE";
          write(c,idn.id,vp,conf,
            r.bd.sort((a,b)=>b.apps-a.apps).map(x=>x.label+" "+x.apps).join(", ")+
            "  (base "+tot+", "+top[0]+" "+(share*100).toFixed(0)+"%)");
        }catch(e){
          if(e instanceof Blocked) throw e;
          const code=(e&&e.cause&&e.cause.code)||e.name;
          const net=/Timeout|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|fetch failed|TypeError/i.test(code+" "+e.message);
          if(net) nNetFail++; else nParseFail++;
          write(c,idn.id,"UNSURE","low",(net?"NETWORK ":"ERROR ")+code);
        }
      }
      if(nPlayers%25===0){
        const mins=((Date.now()-t0)/60000).toFixed(0);
        console.log("["+mins+"m] players "+nPlayers+"/"+queue.length+" · cards "+nDone+"/"+nCards+
          " · ok "+(100*(nDone-nParseFail-nIdFail-nNetFail)/Math.max(nDone,1)).toFixed(1)+"%"+
          " · idFail "+nIdFail+" · netFail "+nNetFail+" · UNSURE "+nUnsure+
          " · change "+nChange+" · confirm "+nConfirm+" · calls "+CALLS+" · 429s "+T429+" · delay "+DELAY);
      }
    }
    console.log("\nFINISHED. cards "+nDone+" · change "+nChange+" · confirm "+nConfirm+
      " · UNSURE "+nUnsure+" · idFail "+nIdFail+" · netFail "+nNetFail+" · parseFail "+nParseFail+" · calls "+CALLS);
  }catch(e){
    if(e instanceof Blocked){
      console.log("\nABORT , "+e.message+". "+nDone+" cards written, resume by re-running (CSV is the checkpoint).");
      process.exit(2);
    }
    throw e;
  }
})().catch(e=>{console.error("FATAL",e.message);process.exit(1);});
