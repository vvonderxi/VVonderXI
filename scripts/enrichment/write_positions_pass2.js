// pass-2 position writer , double-verified batch (2026-08-09).
//
// SOURCE: pass2_WRITE.csv , 55 rows, two independent research passes (Sofascore, then
// Transfermarkt/official) that AGREED on every row (verified_position == pass1, 0 disagreements).
//
// OF THE 55: 19 resolve to a card that is ALREADY correct (no write). 5 were AMBIGUOUS on
// (player_name, season) alone and are excluded , four are NAME COLLISIONS between different
// players (J. Rodriguez = Jay Rodriguez api19169 vs James Rodriguez api517; Joao Mario api41734
// vs api206; Nene api41138 vs api9970), and all four land on a card that is already CAM anyway.
// The fifth, Coutinho 1718, is one player (api147) with TWO league-cards from a split season
// (Liverpool PL, Barcelona LL); the evidence describes only the Barcelona half, so ONE row cannot
// authorise BOTH cards. Both are HELD. That leaves the 31 below.
//
// GUARD: unlike write_positions_cam.js this does NOT hardcode CAM. Each row carries the pool
// OBSERVED during the dry run, and the update guards on that exact value, so a row that moved
// underneath us aborts instead of being overwritten.
//
// DRY-RUN by default. Pass --write to apply.
//   NODE_PATH=./node_modules node scripts/enrichment/write_positions_pass2.js [--write]
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// api_player_id, season_year, league_code, target_position, expected_current_position, label
const ROWS = [
  [2206,2021,'L1','CM','CAM','B. Bourigeaud 2122'],
  [636,2018,'PL','Winger','CAM','Bernardo Silva 1819'],
  [636,2021,'PL','CM','CAM','Bernardo Silva 2122'],
  [636,2023,'PL','CM','CAM','Bernardo Silva 2324'],
  [1485,2025,'PL','CM','CAM','Bruno Fernandes 2526'],
  [2001,2020,'TR','Winger','CAM','C. Larin 2021'],
  [930,2020,'LL','CM','CAM','Carlos Soler 2021'],
  [1096,2025,'PL','CM','CAM','D. Szoboszlai 2526'],
  [1152,2016,'BL','Winger','CAM','E. Forsberg 1617'],
  [1161,2021,'PL','Winger','CAM','E. Smith Rowe 2122'],
  [1457,2019,'SA','Winger','CAM','H. Mkhitaryan 1920'],
  [161897,2024,'ERE','CM','CAM','I. Saibari 2425'],
  [129718,2024,'LL','CM','CAM','J. Bellingham 2425'],
  [25635,2022,'BL','Winger','CAM','J. Hofmann 2223'],
  [37156,2016,'ERE','CM','CAM','J. Toornstra 1617'],
  [583,2018,'PRT','ST','CAM','João Félix 1819'],
  [47320,2021,'LL','Winger','CAM','Juanmi 2122'],
  [629,2020,'PL','CM','CAM','K. De Bruyne 2021'],
  [629,2021,'PL','CM','CAM','K. De Bruyne 2122'],
  [12994,2015,'SA','CM','CAM','M. Hamšík 1516'],
  [38130,2016,'ERE','Winger','CAM','M. Mahi 1617'],
  [909,2016,'PL','Winger','CAM','M. Rashford 1617'],
  [909,2021,'PL','Winger','CAM','M. Rashford 2122'],
  [47323,2018,'LL','Winger','CAM','Mikel Oyarzabal 1819'],
  [631,2020,'PL','Winger','CAM','P. Foden 2021'],
  [631,2022,'PL','Winger','CAM','P. Foden 2223'],
  [631,2023,'PL','Winger','CAM','P. Foden 2324'],
  [147,2015,'PL','Winger','CAM','Philippe Coutinho 1516'],
  [572,2016,'PRT','Winger','CAM','Pizzi 1617'],
  [572,2018,'PRT','Winger','CAM','Pizzi 1819'],
  [2413,2018,'PL','Winger','CAM','Richarlison 1819'],
];
(async () => {
  console.log((WRITE ? 'WRITE' : 'DRY-RUN') + ' , ' + ROWS.length + ' rows\n');
  let ok=0, skip=0, missing=0, err=0;
  const done = [];   // only rows the DB actually accepted get recorded in the CSV
  for (const [id, yr, lg, target, expect, nm] of ROWS) {
    const cur = await sb.from('player_positions').select('position')
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg).maybeSingle();
    if (cur.error) { console.log('  ERR  ' + nm + '  ' + cur.error.message); err++; continue; }
    if (!cur.data) { console.log('  MISS ' + nm.padEnd(24) + lg + '  no player_positions row'); missing++; continue; }
    if (cur.data.position !== expect) {
      console.log('  SKIP ' + nm.padEnd(24) + lg + '  is ' + cur.data.position + ', expected ' + expect); skip++; continue; }
    if (!WRITE) { console.log('  would update ' + nm.padEnd(24) + lg + '  ' + expect + ' -> ' + target); ok++; continue; }
    const up = await sb.from('player_positions').update({ position: target })
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg)
      .eq('position', expect)                 // belt-and-braces: only the pool we actually observed
      .select('api_player_id');
    if (up.error) { console.log('  ERR  ' + nm + '  ' + up.error.message); err++; continue; }
    if (!up.data || !up.data.length) { console.log('  SKIP ' + nm.padEnd(24) + lg + '  guard matched 0 rows'); skip++; continue; }
    console.log('  UPDATED ' + nm.padEnd(24) + lg + '  ' + expect + ' -> ' + target);
    ok++; done.push([id, yr, target]);
  }
  console.log('\n  ' + (WRITE?'updated':'would update') + ': ' + ok +
    '   skipped: ' + skip + '   missing row: ' + missing + '   errors: ' + err);
  if (WRITE && done.length) {
    const CSV = 'scripts/enrichment/known_players.csv';
    // The committed CSV does NOT reliably end with a newline. A bare append FUSES the last
    // existing row into the first new one (it did, on the 2026-08-09 batch-1 run). Always check.
    const prev = fs.readFileSync(CSV, 'utf8');
    const lead = (prev.length && !prev.endsWith('\n')) ? '\n' : '';
    const line = lead + done.map(r => r[0]+','+r[1]+','+r[2]+',tm-ccc-pass2,2026-08-09').join('\n') + '\n';
    fs.appendFileSync(CSV, line);
    console.log('  appended ' + done.length + ' rows to known_players.csv (source=tm-ccc-pass2)');
    console.log('  NEXT: refresh materialized view player_card_mv');
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
