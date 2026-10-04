/*  25/26 POSITION WRITER , the eight double-verified movers (2026-09-11).
 *
 *  SOURCE: two INDEPENDENT Fable passes over all 67 unverified 25/26 cards at rt >= 80.
 *  Pass agreement was 65 of 67. Of 15 proposed corrections, 13 survived both passes, and
 *  these are the 8 that were HIGH CONFIDENCE IN BOTH. The five that were high on one pass
 *  and medium on the other are HELD, as are the two disagreements (Kramaric, Dewsbury-Hall)
 *  and the one low row (Malen, which was a confirm anyway). Held rows keep their evidence in
 *  research/pos2526_verified/.
 *
 *  GUARD, same shape as write_positions_pass2.js: each row carries the pool OBSERVED at
 *  dry-run time and the update guards on that exact value, so a row that moved underneath
 *  aborts instead of being overwritten. Nothing here touches `distribution`, which stays a
 *  frozen record of what the importer saw.
 *
 *  WHY THESE EIGHT AND NOT A CLASSIFIER FIX: see SS E's CAM-collapse entry. The classifier
 *  stopped emitting CAM at the 2022 boundary across all nine leagues, so the CM pool is
 *  structurally inflated for four seasons. This is a spot correction at the top of the live
 *  season, deliberately scoped, and it does NOT close that defect.
 *
 *  DRY-RUN by default. Pass --write to apply.
 *    node scripts/enrichment/write_positions_2526.js [--write]
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const WRITE = process.argv.includes('--write');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// api_player_id, season_year, league_code, target_position, expected_current_position, label
const ROWS = [
  [19170, 2025, 'PL', 'CAM',    'CM',     'M. Rogers 2526'],        // card 130295 rt 85
  [762,   2025, 'LL', 'Winger', 'ST',     'Vinicius Junior 2526'],  // card 137022 rt 85
  [350037,2025, 'SA', 'CAM',    'CM',     'N. Paz 2526'],           // card 144072 rt 85
  [31010, 2025, 'SA', 'FB',     'Winger', 'F. Dimarco 2526'],       // card 144141 rt 85
  [19281, 2025, 'PL', 'Winger', 'CM',     'A. Semenyo 2526'],       // card 130281 rt 82
  [37749, 2025, 'ERE','CM',     'CDM',    'J. Veerman 2526'],       // card 169344 rt 81
  [9971,  2025, 'LL', 'Winger', 'CM',     'Antony 2526'],           // card 137160 rt 80
  [128533,2025, 'BL', 'Winger', 'CM',     'J. Leweling 2526'],      // card 151152 rt 80
];

(async () => {
  console.log((WRITE ? 'WRITE' : 'DRY-RUN') + ' , ' + ROWS.length + ' rows\n');
  let ok = 0, skip = 0, missing = 0, failed = 0;
  for (const [id, yr, lg, target, expect, nm] of ROWS) {
    const cur = await sb.from('player_positions').select('position')
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg).maybeSingle();
    if (cur.error)  { console.log('  ERR  ' + nm + ' ' + cur.error.message); failed++; continue; }
    if (!cur.data)  { console.log('  MISS ' + nm.padEnd(24) + 'no player_positions row'); missing++; continue; }
    if (cur.data.position !== expect) {
      console.log('  SKIP ' + nm.padEnd(24) + 'is ' + cur.data.position + ', expected ' + expect + ' , row moved underneath us');
      skip++; continue;
    }
    if (!WRITE) { console.log('  would update ' + nm.padEnd(24) + expect + ' -> ' + target); ok++; continue; }
    const up = await sb.from('player_positions').update({ position: target })
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg)
      .eq('position', expect)                    // belt and braces: only ever touch the expected value
      .select('api_player_id');
    if (up.error || !up.data || !up.data.length) { console.log('  FAIL ' + nm + ' ' + (up.error ? up.error.message : 'no row updated')); failed++; continue; }
    // READ BACK, always , a write that reports success is not a write that landed (SS C)
    const back = await sb.from('player_positions').select('position')
      .eq('api_player_id', id).eq('season_year', yr).eq('league_code', lg).maybeSingle();
    if (back.data && back.data.position === target) { console.log('  OK   ' + nm.padEnd(24) + expect + ' -> ' + target); ok++; }
    else { console.log('  FAIL ' + nm.padEnd(24) + 'read back as ' + (back.data && back.data.position)); failed++; }
  }
  console.log('\n' + (WRITE ? 'written' : 'would write') + ': ' + ok + '   skipped: ' + skip + '   missing: ' + missing + '   failed: ' + failed);
  if (failed) process.exit(1);
})();
