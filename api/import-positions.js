#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
//  VVonderXI — POSITION IMPORTER (granular positions via lineup grids)
//  For each league-season: get all fixtures → lineups → each player's grid
//  → aggregate most-common specific position across the season → store.
//  Derives LB/CB/RB · CDM/CM/CAM/LM/RM · LW/ST/RW · GK from grid row:col.
//  Resumable (checkpoints per league-season). Idempotent upsert.
//   RUN:  CMD="node api/import-positions.js"            (all leagues)
//         CMD="node api/import-positions.js --league PL" (one league)
// ══════════════════════════════════════════════════════════════════
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const BASE='https://v3.football.api-sports.io';
const KEY=process.env.APIFOOTBALL_KEY;
const supabase=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
if(!KEY){console.error('❌ APIFOOTBALL_KEY not set');process.exit(1);}

const args=process.argv.slice(2);
const ONLY=args.includes('--league')?args[args.indexOf('--league')+1]:null;
const FROM=parseInt(args.includes('--from')?args[args.indexOf('--from')+1]:'2015');
const TO=parseInt(args.includes('--to')?args[args.indexOf('--to')+1]:'2025');
const DELAY=280;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LEAGUES={PL:39,LL:140,SA:135,BL:78,L1:61,PRT:94,ERE:88,BPL:144,TR:203};
const stats={calls:0,rows:0,errors:0,fixtures:0,start:Date.now()};

async function af(path,retries=4){
  for(let a=1;a<=retries;a++){
    try{
      const r=await fetch(`${BASE}${path}`,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(15000)});
      stats.calls++;
      if(r.status===429){const w=(parseInt(r.headers.get('retry-after'))||60)*1000;console.warn(`⏳429 ${w/1000}s`);await sleep(w);continue;}
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      if(j.errors&&Object.keys(j.errors).length){const m=JSON.stringify(j.errors);if(/limit|plan|rate/i.test(m)){console.warn(`⏳quota 60s`);await sleep(60000);continue;}throw new Error(m);}
      return j;
    }catch(e){if(a===retries)throw e;console.warn(`⚠️retry ${a}: ${e.message}`);await sleep(1500*a);}
  }
}

// derive specific position from pos letter, grid, and the width of that player's row
function derive(posL,row,col,rowWidth,midRows){
  if(posL==='G')return 'GK';
  if(posL==='D'){
    if(rowWidth>=4){ if(col===1)return 'LB'; if(col===rowWidth)return 'RB'; return 'CB'; }
    return 'CB';
  }
  if(posL==='M'){
    // depth-based only: deepest row=CDM, highest=CAM, else CM. No LM/RM.
    if(midRows && midRows.length>1){
      if(row===midRows[0])return 'CDM';
      if(row===midRows[midRows.length-1])return 'CAM';
    }
    return 'CM';
  }
  if(posL==='F'){
    if(rowWidth>=3){ if(col===1)return 'LW'; if(col===rowWidth)return 'RW'; return 'ST'; }
    return 'ST';
  }
  return 'UNK';
}

async function processLeagueSeason(code,year){
  // checkpoint skip
  const {data:ck}=await supabase.from('position_progress').select('done').eq('league_code',code).eq('season_year',year).maybeSingle();
  if(ck&&ck.done){console.log(`  ⏭️  ${code} ${year} already done`);return;}

  const fx=await af(`/fixtures?league=${LEAGUES[code]}&season=${year}`);await sleep(DELAY);
  const fixtures=(fx.response||[]).filter(f=>f.fixture?.status?.short==='FT');
  if(!fixtures.length){console.log(`  – ${code} ${year}: no fixtures`);return;}

  // accumulate: playerId -> { name, posCounts: {POS: n} }
  const agg={};
  let done=0;
  for(const f of fixtures){
    const fid=f.fixture.id;
    let l;
    try{ l=await af(`/fixtures/lineups?fixture=${fid}`); }catch(e){stats.errors++;continue;}
    await sleep(DELAY);
    stats.fixtures++;
    for(const team of (l.response||[])){
      // compute row widths for THIS lineup
      const rows={};
      for(const x of (team.startXI||[])){
        const g=x.player?.grid; if(!g)continue;
        const [r,c]=g.split(':').map(Number);
        rows[r]=Math.max(rows[r]||0,c);
      }
      // midfield rows present (for CDM/CAM refinement)
      const midRows=[...new Set((team.startXI||[]).filter(x=>x.player?.pos==='M'&&x.player?.grid).map(x=>Number(x.player.grid.split(':')[0])))].sort((a,b)=>a-b);
      for(const x of (team.startXI||[])){
        const pl=x.player; const g=pl?.grid; if(!g||!pl.id)continue;
        const [r,c]=g.split(':').map(Number);
        let pos=derive(pl.pos,r,c,rows[r]||1,midRows);
        if(!agg[pl.id])agg[pl.id]={name:pl.name,counts:{}};
        agg[pl.id].counts[pos]=(agg[pl.id].counts[pos]||0)+1;
      }
    }
    done++;
  }

  // pick each player's most-common position, upsert
  let n=0;
  for(const [pid,info] of Object.entries(agg)){
    const best=Object.entries(info.counts).sort((a,b)=>b[1]-a[1])[0];
    const apps=Object.values(info.counts).reduce((a,b)=>a+b,0);
    const {error}=await supabase.from('player_positions').upsert({
      api_player_id:Number(pid), season_year:year, league_code:code,
      position:best[0], appearances:apps
    },{onConflict:'api_player_id,season_year,league_code'});
    if(error){stats.errors++;}else{stats.rows++;n++;}
  }
  await supabase.from('position_progress').upsert({league_code:code,season_year:year,done:true},{onConflict:'league_code,season_year'});
  console.log(`  ✅ ${code} ${year}: ${n} players from ${done} fixtures`);
}

(async()=>{
  const codes=ONLY?[ONLY]:Object.keys(LEAGUES);
  console.log(`╔══ Position import ${codes.join(',')} ${FROM}-${TO} ══╗`);
  for(const code of codes){
    if(!LEAGUES[code]){console.error(`unknown ${code}`);continue;}
    console.log(`📁 ${code}`);
    for(let y=TO;y>=FROM;y--){
      try{await processLeagueSeason(code,y);}catch(e){stats.errors++;console.error(`  ❌ ${code} ${y}: ${e.message}`);}
    }
  }
  console.log(`╔══ DONE ══╗ players:${stats.rows} fixtures:${stats.fixtures} calls:${stats.calls} errors:${stats.errors} time:${Math.round((Date.now()-stats.start)/1000)}s`);
})();
