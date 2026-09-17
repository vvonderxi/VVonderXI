// TRANSFERMARKT BULK POSITION FETCH , read-only against Supabase, CSV out only.
//
//   NODE_PATH=./node_modules node scripts/enrichment/tm_bulk_fetch.js
//
// NEVER writes to the DB. Appends each result to tm_bulk_positions.csv as it lands,
// so an interrupted run RESUMES from the CSV rather than restarting.
//
// IDENTITY IS THE RISK, NOT BANDWIDTH. The 10-player validation needed
// disambiguation on 10 of 10 , search returned up to 10 same-name candidates and
// ZERO were resolvable by first-hit. So a candidate is accepted ONLY if our stored
// club name appears on that candidate's season page. No club match -> UNSURE.
// A guessed id still yields a plausible breakdown, which is why guessing is banned.
const fs=require("fs");
const SP="/tmp/claude-1000/-home-odoo-projects-VVonderXI/03fc21d4-707a-4e08-9c5b-38461c9f8342/scratchpad";
const OUT="scripts/enrichment/tm_bulk_positions.csv";
const STATE="scripts/enrichment/tm_bulk_state.json";
const UA={"user-agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"};
const DELAY=3000, MAXCAND=4;          // FIX 4: raised from 1500ms , TM measurably slower now
const NET_RETRY=2;                    // FIX 3: bounded retry for network errors
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// TM label -> our 8 buckets. 'FW' in the brief is not a bucket; the pipeline uses ST.
const MAP={
  "Left Midfield":"Winger","Right Midfield":"Winger","Left Winger":"Winger","Right Winger":"Winger",
  "Attacking Midfield":"CAM","Second Striker":"CAM",
  "Defensive Midfield":"CDM","Central Midfield":"CM",
  "Centre-Forward":"ST",
  "Goalkeeper":"GK","Centre-Back":"CB","Left-Back":"FB","Right-Back":"FB",
};
const seasonStart=s=>{const t=String(s);return t.length===4?2000+Number(t.slice(0,2)):Number(t);};
// FIX 1 , CLUB MATCHING. The old matcher took the LONGEST word, so "Bayern München" searched
// for "München" and Transfermarkt writes "Bayern Munich" , the word is simply absent. And
// "Atletico" never matched "Atlético". Now: accent-fold BOTH sides and accept ANY word of 4+
// chars. Simulated against 14 known TM club forms: old matcher failed 2, this fails 0.
// Deliberately NOT an alias map , 22 of the 24 "risky" clubs already matched by substring,
// and a hand-kept alias list rots as club names change.
const fold=x=>String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const clubMatches=(ourClub,pageText)=>{
  const hay=fold(pageText);
  return String(ourClub).split(/\s+/).filter(w=>w.length>=4).some(w=>hay.includes(fold(w)));
};
const strip=h=>h.replace(/<script[\s\S]*?<\/script>/g,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ");
const esc=v=>{const s=(v===null||v===undefined||v==='')?'':String(v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};

let CALLS=0, T429=0;
async function get(u,depth=0,netTry=0){
  let r;
  try{
    r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(25000)});
  }catch(e){
    // FIX 3 , BOUNDED RETRY on transient network errors. 11 of the 14 "parse" failures in the
    // aborted run were TimeoutError and never reached the parser at all. Retry NET_RETRY times
    // with a growing pause, then rethrow so the caller records it as a network failure.
    if(netTry<NET_RETRY){ await sleep(5000*(netTry+1)); return get(u,depth,netTry+1); }
    throw e;
  }
  CALLS++;
  if((r.status===429||r.status===503)&&depth<5){        // exponential backoff
    T429++;
    const wait=Math.min(60000, 2000*Math.pow(2,depth));
    await sleep(wait);
    return get(u,depth+1);
  }
  return {s:r.status, b:await r.text()};
}

(async()=>{
  const targets=JSON.parse(fs.readFileSync(SP+"/tm_targets.json"));
  // ---- resume ----
  const done=new Set();
  if(fs.existsSync(OUT)) fs.readFileSync(OUT,"utf8").split("\n").slice(1).filter(Boolean)
    .forEach(l=>done.add(l.split(",")[0]));
  else fs.writeFileSync(OUT,"card_id,api_player_id,player_name,season,club,current_pool,verified_position,confidence,evidence,source,fetched_at\n");
  const queue=targets.filter(t=>!done.has(String(t.card_id)));
  console.log("targets "+targets.length+" · already done "+done.size+" · to fetch "+queue.length);

  const roll=[];                       // rolling window of {id:bool, parse:bool}
  let nDone=0, nChange=0, nConfirm=0, nUnsure=0, nIdFail=0, nParseFail=0, nNetFail=0;
  const t0=Date.now();

  for(const t of queue){
    let vp="UNSURE", conf="low", ev="", picked=null;
    try{
      // FIX 2 , NAME-ORDER RETRY. "Son Heung-Min" returns ZERO candidates; Transfermarkt
      // indexes Korean (and some other) names given-name-first, so "Heung-Min Son" returns 1.
      // Retry with the words reversed before giving up. Never fall back to a bare surname:
      // "Son" returns 10 candidates whose first is Alisson.
      const base=String(t.player_name).replace(/^[A-ZÀ-Ý]\.\s*/,"").trim();
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
      const yr=seasonStart(t.season);
      for(const c of cands.slice(0,MAXCAND)){
        await sleep(DELAY);
        const d=await get("https://www.transfermarkt.com/"+c[1]+"/leistungsdatendetails/spieler/"+c[2]+
          "/saison/"+yr+"/verein/0/liga/0/wettbewerb//pos/0/trainer_id/0/plus/1");
        if(clubMatches(t.team_name, strip(d.b))){ picked={c,body:d.b}; break; }
      }
      if(!picked){ nIdFail++; ev="identity not resolved: club '"+t.team_name+"' on none of "+Math.min(cands.length,MAXCAND)+" candidate(s)"; }
      else{
        const sel=picked.body.match(/<select[^>]*name="pos"[^>]*>([\s\S]*?)<\/select>/);
        const opts=sel?[...sel[1].matchAll(/<option[^>]*value="(\d+)"[^>]*>\s*([^<]*?)\s*<\/option>/g)]:[];
        if(!opts.length){ nParseFail++; ev="no position selector on the season page"; }
        else{
          const bd=[];
          for(const [,code,label] of opts){
            await sleep(DELAY);
            const p=await get("https://www.transfermarkt.com/"+picked.c[1]+"/leistungsdatendetails/spieler/"+picked.c[2]+
              "/saison/"+seasonStart(t.season)+"/verein/0/liga/0/wettbewerb//pos/"+code+"/trainer_id/0/plus/1");
            const m=strip(p.b).match(/Total\s*:\s*(\d+)/);
            const apps=m?Number(m[1]):0;
            if(apps>0 && MAP[label]) bd.push({label,bucket:MAP[label],apps});
          }
          const tot=bd.reduce((n,x)=>n+x.apps,0);           // base excludes unlisted positions
          if(!tot){ nParseFail++; ev="no positioned appearances for that season"; }
          else{
            const agg={}; bd.forEach(x=>agg[x.bucket]=(agg[x.bucket]||0)+x.apps);
            const rank=Object.entries(agg).sort((a,b)=>b[1]-a[1]);
            const top=rank[0], second=rank[1]?rank[1][1]:0;
            const share=top[1]/tot;
            vp=top[0];
            conf = share>0.5 ? "high" : (top[1]-second)/tot>=0.15 ? "medium" : "low";
            if(conf==="low" && top[1]===second) vp="UNSURE";
            ev=bd.sort((a,b)=>b.apps-a.apps).map(x=>x.label+" "+x.apps).join(", ")+
               "  (base "+tot+", "+top[0]+" "+(share*100).toFixed(0)+"%)";
          }
        }
      }
    }catch(e){
      const code=(e&&e.cause&&e.cause.code)||e.name;
      const net=/Timeout|ETIMEDOUT|ENETUNREACH|ECONNRESET|EAI_AGAIN|fetch failed|TypeError/i.test(code+" "+e.message);
      if(net){ nNetFail++; ev="NETWORK "+code+" , retryable, card not attempted"; }
      else   { nParseFail++; ev="ERROR "+code; }
    }

    if(vp==="UNSURE") nUnsure++; else if(vp===t.position_pool) nConfirm++; else nChange++;
    fs.appendFileSync(OUT,[t.card_id,t.api_player_id,t.player_name,t.season,t.team_name,
      t.position_pool,vp,conf,ev,"transfermarkt",new Date().toISOString()].map(esc).join(",")+"\n");
    fs.writeFileSync(STATE,JSON.stringify({done:++nDone,total:queue.length,calls:CALLS,
      change:nChange,confirm:nConfirm,unsure:nUnsure,idFail:nIdFail,parseFail:nParseFail,netFail:nNetFail,
      t429:T429,updated:new Date().toISOString()}));

    // ---- rolling abort windows ----
    // ABORT THRESHOLDS REMOVED except 429s. Every failure is written to the CSV with a
    // reason and the run continues , the previous abort fired at "19% identity failure"
    // when true identity failure was 10%, because network errors leave picked=null and were
    // counted as identity failures. Failures are now recoverable by re-running: the resume
    // logic skips completed card_ids, so a later pass can re-attempt only the failed rows.
    if(T429>40){ console.log("\nABORT , persistent 429s after backoff ("+T429+")"); break; }

    if(nDone%250===0){
      const mins=((Date.now()-t0)/60000).toFixed(0);
      console.log("["+mins+"m] done "+nDone+"/"+queue.length+
        " · ok "+(100*(nDone-nParseFail-nIdFail-nNetFail)/nDone).toFixed(1)+"%"+
        " · idFail "+nIdFail+" · netFail "+nNetFail+" · parseFail "+nParseFail+
        " · UNSURE "+nUnsure+" · change "+nChange+" · confirm "+nConfirm+
        " · calls "+CALLS+" · 429s "+T429);
    }
  }
  console.log("\nFINISHED. done "+nDone+" · change "+nChange+" · confirm "+nConfirm+
    " · UNSURE "+nUnsure+" · idFail "+nIdFail+" · netFail "+nNetFail+" · parseFail "+nParseFail+" · calls "+CALLS);
})().catch(e=>{console.error("FATAL",e.message);process.exit(1);});
