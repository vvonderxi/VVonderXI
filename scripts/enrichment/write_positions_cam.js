// CAM->Winger writer , Tier-A Transfermarkt-verified batch (2026-08-09).
//
// WHY A NEW SCRIPT: write_positions.js and cm_bug_fill.js both guard .eq('position','CM').
// These rows are CAM, so those writers would have matched NOTHING and reported success ,
// a silent no-op. This one guards .eq('position','CAM') so it can only ever touch a row
// that is currently CAM, and only for the exact (api_player_id, season_year, league_code)
// keys listed below.
//
// DRY-RUN by default. Pass --write to apply.
//   NODE_PATH=./node_modules node scripts/enrichment/write_positions_cam.js [--write]
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// api_player_id, season_year, league_code, -> Winger. Transfermarkt main position verified 2026-08-09.
const ROWS = [
  [1460,2021,'PL','B. Saka'],
  [247,2020,'ERE','C. Gakpo'], [247,2021,'ERE','C. Gakpo'],
  [873,2016,'SA','F. Bernardeschi'], [873,2017,'SA','F. Bernardeschi'], [873,2018,'SA','F. Bernardeschi'],
  [873,2021,'SA','F. Bernardeschi'], [873,2025,'SA','F. Bernardeschi'],
  [1922,2017,'L1','F. Thauvin'], [1922,2018,'L1','F. Thauvin'],
  [19428,2019,'PL','J. Bowen'], [19428,2021,'PL','J. Bowen'], [19428,2022,'PL','J. Bowen'],
  [331,2020,'SA','L. Insigne'],
  [277,2019,'BL','M. Diaby'], [277,2021,'BL','M. Diaby'],
  [22236,2020,'SA','Rafael Leao'], [22236,2021,'SA','Rafael Leao'],
  [1496,2016,'PRT','Raphinha'], [1496,2017,'PRT','Raphinha'], [1496,2018,'PRT','Raphinha'],
  [1496,2019,'L1','Raphinha'], [1496,2020,'PL','Raphinha'], [1496,2021,'PL','Raphinha'],
];
(async () => {
  console.log((WRITE ? 'WRITE' : 'DRY-RUN') + ' , ' + ROWS.length + ' CAM -> Winger\n');
  let ok=0, skip=0, missing=0;
  const done = [];   // only rows the DB actually accepted get recorded in the CSV
  for (const [id, yr, lg, nm] of ROWS) {
    const cur = await sb.from('player_positions').select('position,shirt_number')
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg).maybeSingle();
    if (cur.error) { console.log('  ERR  ' + nm + ' ' + yr + ' ' + cur.error.message); continue; }
    if (!cur.data) { console.log('  MISS ' + nm.padEnd(17) + yr + ' ' + lg + '  no player_positions row'); missing++; continue; }
    if (cur.data.position !== 'CAM') { console.log('  SKIP ' + nm.padEnd(17) + yr + ' ' + lg + '  is ' + cur.data.position + ', not CAM'); skip++; continue; }
    if (!WRITE) { console.log('  would update ' + nm.padEnd(17) + yr + ' ' + lg + '  CAM -> Winger'); ok++; continue; }
    const up = await sb.from('player_positions').update({ position: 'Winger' })
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg)
      .eq('position', 'CAM')                      // belt-and-braces: only ever touch a CAM row
      .select('api_player_id');
    if (up.error) { console.log('  ERR  ' + nm + ' ' + up.error.message); continue; }
    console.log('  UPDATED ' + nm.padEnd(17) + yr + ' ' + lg); ok++; done.push([id, yr]);
  }
  console.log('\n  ' + (WRITE?'updated':'would update') + ': ' + ok + '   skipped(not CAM): ' + skip + '   missing row: ' + missing);
  if (WRITE && done.length) {
    const CSV = 'scripts/enrichment/known_players.csv';
    // The committed CSV does NOT end with a newline. A bare append therefore FUSES the last
    // existing row into the first new one (it did, on the 2026-08-09 run , the row read
    // "85772,2020,Winger,cdm-mislabel,2026-07-141460,2021,Winger,tm-ccc,..."). Always check.
    const prev = fs.readFileSync(CSV, 'utf8');
    const lead = (prev.length && !prev.endsWith('\n')) ? '\n' : '';
    const line = lead + done.map(r => r[0]+','+r[1]+',Winger,tm-ccc,2026-08-09').join('\n')+'\n';
    fs.appendFileSync(CSV, line);
    console.log('  appended ' + done.length + ' rows to known_players.csv (source=tm-ccc)');
    console.log('  NEXT: refresh materialized view player_card_mv');
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
