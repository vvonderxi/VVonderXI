#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
//  VVonderXI — STANDINGS IMPORTER
//  /standings?league={id}&season={year} → final table per league-season
//  Stores: team, rank, points, played, W/D/L, goals for/against, goal diff.
//  Powers the COMPETITIVE-DEPTH league factor (§42).
//  ~144 calls total (9 leagues × 16 seasons). Resumable, idempotent.
//
//  RUN:  CMD="node scripts/import/import-standings.js"            (all leagues)
//        CMD="node scripts/import/import-standings.js --league PL" (one league)
// ══════════════════════════════════════════════════════════════════
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE='https://v3.football.api-sports.io';
const KEY=process.env.APIFOOTBALL_KEY;
const supabase=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
if(!KEY){console.error('❌ APIFOOTBALL_KEY not set');process.exit(1);}

const args=process.argv.slice(2);
const ONLY=args.includes('--league')?args[args.indexOf('--league')+1]:null;
const FROM=2010, TO=2025, DELAY=320;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const LEAGUES={PL:39,LL:140,SA:135,BL:78,L1:61,PRT:94,ERE:88,BPL:144,TR:203};
const stats={calls:0,rows:0,errors:0,start:Date.now()};

async function af(path,retries=4){
  for(let a=1;a<=retries;a++){
    try{
      const r=await fetch(`${BASE}${path}`,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(15000)});
      stats.calls++;
      if(r.status===429){const w=(parseInt(r.headers.get('retry-after'))||60)*1000;console.warn(`⏳ 429 wait ${w/1000}s`);await sleep(w);continue;}
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      if(j.errors&&Object.keys(j.errors).length){const m=JSON.stringify(j.errors);if(/limit|plan/i.test(m)){console.warn(`⏳ quota wait 60s`);await sleep(60000);continue;}throw new Error(m);}
      return j;
    }catch(e){if(a===retries)throw e;console.warn(`⚠️ retry ${a}: ${e.message}`);await sleep(1500*a);}
  }
}

async function importLeagueSeason(code,year){
  const j=await af(`/standings?league=${LEAGUES[code]}&season=${year}`);await sleep(DELAY);
  const table=j.response?.[0]?.league?.standings?.[0];   // primary table
  if(!table||!table.length){console.log(`  – ${code} ${year}: no standings`);return;}
  let n=0;
  for(const t of table){
    const row={
      league_code:code, season_year:year,
      team_name:t.team?.name||null, rank:t.rank??null, points:t.points??null,
      played:t.all?.played??null, win:t.all?.win??null, draw:t.all?.draw??null, lose:t.all?.lose??null,
      goals_for:t.all?.goals?.for??null, goals_against:t.all?.goals?.against??null,
      goal_diff:t.goalsDiff??null,
    };
    const {error}=await supabase.from('league_standings').upsert(row,{onConflict:'league_code,season_year,team_name'});
    if(error){stats.errors++;console.error(`  ❌ ${error.message}`);}else{stats.rows++;n++;}
  }
  console.log(`  ✅ ${code} ${year}: ${n} teams`);
}

(async()=>{
  const codes=ONLY?[ONLY]:Object.keys(LEAGUES);
  console.log(`╔══ Standings import ${codes.join(',')} ${FROM}-${TO} ══╗`);
  for(const code of codes){
    if(!LEAGUES[code]){console.error(`unknown ${code}`);continue;}
    console.log(`📁 ${code}`);
    for(let y=TO;y>=FROM;y--){
      try{await importLeagueSeason(code,y);}catch(e){stats.errors++;console.error(`  ❌ ${code} ${y}: ${e.message}`);}
    }
  }
  console.log(`╔══ DONE ══╗ rows:${stats.rows} calls:${stats.calls} errors:${stats.errors} time:${Math.round((Date.now()-stats.start)/1000)}s`);
})();
