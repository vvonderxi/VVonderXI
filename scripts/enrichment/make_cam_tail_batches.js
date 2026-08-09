// Regenerates the CAM-tail research batches from the LIVE matview.
//
// WHY THIS IS TRACKED: only batches 01-05 are committed under cam_tail_batches/.
// 06-21 were deliberately left out as noise , but that is only defensible if they
// are genuinely reproducible, which means THIS script has to exist in the repo.
// Without it the claim is false and the inputs are lost.
//
//   NODE_PATH=./node_modules node scripts/enrichment/make_cam_tail_batches.js
//
// Batch 01 is cut at rt>=80 on purpose (the named public bands, the visible cards);
// everything after is 50 players per batch, rt descending, a player's seasons kept
// together so each player is ONE research lookup.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SEL="card_id,api_player_id,player_name,season,season_year,league_code,team_name,position,position_pool,goals,assists,minutes,rt";
async function fetchTail(){
  let cam=[],f=0;
  for(;;){ const r=await sb.from("player_card_mv").select(SEL).eq("position_pool","CAM").range(f,f+999);
    if(r.error) throw new Error(r.error.message);
    cam=cam.concat(r.data||[]); if((r.data||[]).length<1000) break; f+=1000; }
  const fm=cam.filter(c=>c.position==='FWD'||c.position==='MID');
  const held=new Set();
  for(const hf of ['scripts/enrichment/pass2_HOLD.csv']){
    try{ require('fs').readFileSync(hf,'utf8').split('\n').slice(1).filter(Boolean)
      .forEach(l=>held.add(Number(l.split(',')[4]))); }catch(e){}
  }
  const tail=fm.filter(c=>!held.has(c.card_id));
  const byP={}; tail.forEach(c=>(byP[c.api_player_id]=byP[c.api_player_id]||[]).push(c));
  return Object.keys(byP).map(id=>({id:+id,name:byP[id][0].player_name,
    best:Math.max(...byP[id].map(c=>c.rt??0)),
    rows:byP[id].sort((a,b)=>a.season_year-b.season_year)}))
    .sort((a,b)=>b.best-a.best||a.name.localeCompare(b.name));
}
const fs=require("fs");
(async()=>{
const players = await fetchTail();
const OUT="cam_tail_batches";
fs.mkdirSync(OUT,{recursive:true});

const esc=v=>{const s=(v===null||v===undefined||v==='')?'NR':String(v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
const HDR="api_player_id,card_id,player_name,season,club,league,current_pool,goals,assists,minutes,rt,verified_position,confidence,evidence";

// Batch 1 is the rt>=80 tier , the named public bands, the cards a visitor actually sees.
// After that, 50 players per batch, rt descending, seasons kept together so a player is ONE lookup.
const visible = players.filter(p=>p.best>=80);
const rest    = players.filter(p=>p.best<80);
const batches = [visible];
for(let i=0;i<rest.length;i+=50) batches.push(rest.slice(i,i+50));

let manifest=[];
batches.forEach((b,i)=>{
  const n=String(i+1).padStart(2,"0");
  const rows=b.flatMap(p=>p.rows);
  // The three ANSWER columns are left genuinely EMPTY , not "NR". NR is the house token
  // for missing DATA; an empty answer cell is an unanswered question. Do not conflate them.
  const body=rows.map(c=>[c.api_player_id,c.card_id,c.player_name,c.season,c.team_name,
    c.league_code,c.position_pool,c.goals,c.assists,c.minutes,c.rt].map(esc).join(",")+",,,");
  const f=OUT+"/batch_"+n+".csv";
  fs.writeFileSync(f,HDR+"\n"+body.join("\n")+"\n");
  const rts=b.map(p=>p.best);
  manifest.push({batch:n,players:b.length,cards:rows.length,
    rt_hi:Math.max(...rts),rt_lo:Math.min(...rts),file:f});
});
console.log("batch  players  cards   rt range        file");
manifest.forEach(m=>console.log("  "+m.batch+"   "+String(m.players).padStart(5)+"  "+
  String(m.cards).padStart(5)+"   "+String(m.rt_hi).padStart(3)+"-"+String(m.rt_lo).padEnd(3)+
  "        "+m.file));
console.log("\ntotals: "+manifest.reduce((n,m)=>n+m.players,0)+" players, "+
  manifest.reduce((n,m)=>n+m.cards,0)+" cards, "+manifest.length+" batches");
fs.writeFileSync(OUT+"/MANIFEST.json",JSON.stringify(manifest,null,1));
})().catch(e=>{console.error("FATAL",e.message);process.exit(1);});
