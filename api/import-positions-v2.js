#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
//  VVonderXI — POSITION IMPORTER v2 (formation-relative + distribution)
//  Fixes CDM/CAM: classifies mids by depth RELATIVE to that game's defensive
//  & forward rows (formation-independent). Stores FULL position distribution
//  (so future logic tweaks never need a re-pull). Resumable + scopeable.
//   RUN:  CMD="node api/import-positions-v2.js --league PL"
//         CMD="node api/import-positions-v2.js --league PL --from 2020 --to 2025"
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
const DELAY=300;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LEAGUES={PL:39,LL:140,SA:135,BL:78,L1:61,PRT:94,ERE:88,BPL:144,TR:203};
const stats={calls:0,rows:0,errors:0,fixtures:0,start:Date.now()};

async function af(path,retries=4){
  for(let a=1;a<=retries;a++){
    try{
      const r=await fetch(`${BASE}${path}`,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(15000)});
      stats.calls++;
      // read remaining quota from headers for visibility
      const rem=r.headers.get('x-ratelimit-requests-remaining');
      if(r.status===429){const w=(parseInt(r.headers.get('retry-after'))||60)*1000;console.warn(`⏳429 wait ${w/1000}s (daily remaining: ${rem})`);await sleep(w);continue;}
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const j=await r.json();
      if(j.errors&&Object.keys(j.errors).length){const m=JSON.stringify(j.errors);if(/limit|plan|rate|quota/i.test(m)){console.warn(`⏳quota wait 60s (remaining: ${rem})`);await sleep(60000);continue;}throw new Error(m);}
      j.__remaining=rem;
      return j;
    }catch(e){if(a===retries)throw e;console.warn(`⚠️retry ${a}: ${e.message}`);await sleep(1500*a);}
  }
}

// classify ONE appearance into a specific position, formation-relative
function classify(posL,row,col,rowWidth,defRow,fwdRow){
  if(posL==='G')return 'GK';
  if(posL==='D'){
    if(rowWidth>=4){ if(col===1)return 'LB'; if(col===rowWidth)return 'RB'; return 'CB'; }
    return 'CB';
  }
  if(posL==='F'){
    if(rowWidth>=3){ if(col===1)return 'LW'; if(col===rowWidth)return 'RW'; return 'ST'; }
    return 'ST';
  }
  if(posL==='M'){
    // Wide midfielders: outermost player in a 4+-wide row is a wide attacker.
    // No LM/RM in the recognized pool set, so map to LW/RW (winger-eligible),
    // mirroring the D-branch's rowWidth>=4 LB/RB wide-detection.
    if(rowWidth>=4){
      if(col===1)        return 'LW';
      if(col===rowWidth) return 'RW';
    }
    // central: depth relative to this game's defensive & forward rows
    if(fwdRow>defRow){
      const depth=(row-defRow)/(fwdRow-defRow);
      if(depth<=0.45)return 'CDM';
      if(depth>=0.70)return 'CAM';
    }
    return 'CM';
  }
  return 'UNK';
}

async function processLeagueSeason(code,year){
  const {data:ck}=await supabase.from('position_progress').select('done').eq('league_code',code).eq('season_year',year).maybeSingle();
  if(ck&&ck.done){console.log(`  ⏭️  ${code} ${year} done`);return;}

  const fx=await af(`/fixtures?league=${LEAGUES[code]}&season=${year}`);await sleep(DELAY);
  const fixtures=(fx.response||[]).filter(f=>f.fixture?.status?.short==='FT');
  if(!fixtures.length){console.log(`  – ${code} ${year}: no fixtures`);return;}

  const agg={}; // pid -> {name, counts:{POS:n}}
  let done=0, lastRem='?';
  for(const f of fixtures){
    let l; try{ l=await af(`/fixtures/lineups?fixture=${f.fixture.id}`); }catch(e){stats.errors++;continue;}
    lastRem=l.__remaining||lastRem;
    await sleep(DELAY); stats.fixtures++;
    for(const team of (l.response||[])){
      const xi=(team.startXI||[]).filter(x=>x.player?.grid);
      if(!xi.length)continue;
      // row widths + def/fwd rows for this lineup
      const rows={}; let defRow=99, fwdRow=0;
      for(const x of xi){
        const [r,c]=x.player.grid.split(':').map(Number);
        rows[r]=Math.max(rows[r]||0,c);
        if(x.player.pos==='D'){defRow=Math.min(defRow,r);}
        if(x.player.pos==='F'){fwdRow=Math.max(fwdRow,r);}
      }
      if(defRow===99)defRow=2; if(fwdRow===0)fwdRow=5;
      for(const x of xi){
        const pl=x.player; const [r,c]=pl.grid.split(':').map(Number);
        const pos=classify(pl.pos,r,c,rows[r]||1,defRow,fwdRow);
        if(!pl.id)continue;
        if(!agg[pl.id])agg[pl.id]={name:pl.name,counts:{}};
        agg[pl.id].counts[pos]=(agg[pl.id].counts[pos]||0)+1;
      }
    }
    done++;
  }

  let n=0;
  for(const [pid,info] of Object.entries(agg)){
    const entries=Object.entries(info.counts).sort((a,b)=>b[1]-a[1]);
    const apps=entries.reduce((s,e)=>s+e[1],0);
    const best=entries[0];
    // distribution as {POS: pct}
    const dist={}; for(const [p,c] of entries) dist[p]=Math.round(c/apps*100);
    const {error}=await supabase.from('player_positions').upsert({
      api_player_id:Number(pid), season_year:year, league_code:code,
      position:best[0], appearances:apps, distribution:dist
    },{onConflict:'api_player_id,season_year,league_code'});
    if(error){stats.errors++;}else{stats.rows++;n++;}
  }
  await supabase.from('position_progress').upsert({league_code:code,season_year:year,done:true},{onConflict:'league_code,season_year'});
  console.log(`  ✅ ${code} ${year}: ${n} players, ${done} fixtures (quota left: ${lastRem})`);
}

(async()=>{
  const codes=ONLY?[ONLY]:Object.keys(LEAGUES);
  console.log(`╔══ Position import v2 — ${codes.join(',')} ${FROM}-${TO} ══╗`);
  for(const code of codes){
    if(!LEAGUES[code]){console.error(`unknown ${code}`);continue;}
    console.log(`📁 ${code}`);
    for(let y=TO;y>=FROM;y--){
      try{await processLeagueSeason(code,y);}catch(e){stats.errors++;console.error(`  ❌ ${code} ${y}: ${e.message}`);}
    }
  }
  console.log(`╔══ DONE ══╗ players:${stats.rows} fixtures:${stats.fixtures} calls:${stats.calls} errors:${stats.errors} time:${Math.round((Date.now()-stats.start)/1000)}s`);
})();
