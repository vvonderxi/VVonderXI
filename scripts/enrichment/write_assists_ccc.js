// WRITE CCC-RESEARCHED ASSISTS , 28 cards, fill-only.
//
// ============================================================================
//  PROVENANCE. READ THIS BEFORE CHANGING ANY VALUE.
// ============================================================================
//  These 28 assist figures are HAND-RESEARCHED, not provider data. They were
//  produced by the CCC research lane alongside the batch-3 position work and
//  were originally written by `write_positions3.js`, a script named for
//  POSITIONS. They were lifted out into this file on 2026-09-12 because an
//  rt-touching write must not hide inside a job named for something else.
//
//  WHERE THEY SIT IN THE WIDER PICTURE (full record: DATA_DEFECTS.md, entry
//  "A POSITIONS SCRIPT SILENTLY WRITES assists"):
//    - `player_season_cards.assists` holds THREE sources, not one.
//      * post-2015 bulk      : API-Football, `goals.assists`, via
//                              scripts/import/import-players.js
//      * pre-2015 marquee    : CCC research verified against FBref
//                              domestic-league splits (the NR-ASSIST FILL,
//                              ~117 cards, median rt 88, 89.7% at rt>=85)
//      * these 28            : CCC research, this file
//      CLAUDE.md SS C's provenance line said "Assists = FBref domestic-league"
//      and that described only the marquee batch. Corrected 2026-09-12.
//    - THE VALUES ARE NOT IN QUESTION and were deliberately NOT reverted
//      (Lucas, 2026-09-12). None of the 28 holds an honour, so live exposure
//      is `gaw` and therefore rt, nothing else.
//
//  WHAT ONE OF THESE VALUES ONCE DID, so nobody treats a hand-fill as harmless:
//    `163158` (Nene, Ligue 1 2010/11, 9 assists) was one of only THREE
//    populated assist cards in a 382-card league-season. The computed
//    top_assists pass took the maximum of those three and crowned him the
//    league's top assister. The false honour reached his card face, glance,
//    cabinet and the rankings filter and survived until 2026-09-12.
//    A SELECTIVE FILL MAKES EVERY COMPUTED MAXIMUM LAND ON A FAMOUS NAME AND
//    LOOK CORRECT. That is why it was never spotted.
//
//  MATVIEW REFRESH OWNERSHIP (explicit, so neither half silently stops):
//    THIS SCRIPT OWNS ITS OWN REFRESH. `write_positions3.js` owns its own.
//    Both write rt-affecting data, so both must refresh; splitting the file
//    must not leave one half assuming the other did it. The refresh usually
//    CANNOT be run from here (8s statement_timeout, see CLAUDE.md SS C), so the
//    fallback message below is the normal path, not an error.
//
//  RUN (repo root): NODE_PATH=./node_modules node scripts/enrichment/write_assists_ccc.js
//  Fill-only and idempotent: every one of the 28 is already populated, so a
//  re-run writes NOTHING. It is safe to run and proves nothing changed.
// ============================================================================
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// card_id -> assists. 7 of these are pre-2015, where a single value can decide
// a league; the rest run 2015-2025. Named in full in DATA_DEFECTS.md.
const ASSIST = {
  172746:9,172351:10,169346:8,169768:11,174592:6,168807:7,156662:2,180202:2,180524:6,181398:8,
  169343:4,170986:3,170205:9,172521:4,182248:10,184247:5,169280:6,173082:4,161304:8,163158:9,
  174565:2,166668:8,167554:12,167555:13,180654:4,183949:7,163392:8,160409:5
};

(async () => {
  let filled = 0, noop = 0; const filledList = [];
  for (const cid of Object.keys(ASSIST).map(Number)) {
    const v = ASSIST[cid];
    const { data, error } = await sb.from('player_season_cards')
      .update({ assists: v }).eq('id', cid).is('assists', null).select('id');
    if (error) { console.error('ASSIST ERROR', cid, error.message); process.exit(1); }
    if (data && data.length) { filled++; filledList.push(cid + '=' + v); } else noop++;
  }
  console.error('ASSISTS (fill-only): filled ' + filled + ' / already-had ' + noop + '  [rt moves on refresh]');
  if (filledList.length) console.error('  filled: ' + filledList.join(', '));
  else console.error('  nothing written , all 28 already populated, which is the expected steady state.');

  // ---- matview refresh, OWNED BY THIS SCRIPT (see header) ----
  if (!filled) { console.error('no write, so no refresh needed.'); return; }
  let refreshed = false;
  for (const fn of ['refresh_player_card_mv', 'refresh_matview', 'refresh_player_card']) {
    const { error } = await sb.rpc(fn); if (!error) { console.error('matview refreshed via ' + fn + '()'); refreshed = true; break; }
  }
  if (!refreshed) console.error('MATVIEW REFRESH IS OWED AND WAS NOT DONE. Paste in the Supabase SQL editor:\n  set statement_timeout = \'600s\'; refresh materialized view player_card_mv;');
})();
