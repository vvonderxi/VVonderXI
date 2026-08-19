#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  VVonderXI , KEEPER + PENALTY BACKFILL   (2026-08-17)
//
//  Populates SIX columns on EXISTING player_season_cards rows:
//    starts, goals_conceded, saves, penalties_scored, penalties_missed, penalties_saved
//  (penalties_won was captured once, measured, and dropped on 2026-08-19 , see the note
//   in api/import-players.js. The field list comes from NEW_FIELDS, so this script needed
//   no change beyond this comment.)
//
//  WHY NOT THE IMPORTER. api/import-players.js writes with upsert(). Its default
//  mode DO-UPDATEs every column, which rewrites goals/assists/minutes and therefore
//  MOVES rt. Its --insert-only mode is ON CONFLICT DO NOTHING, which would skip all
//  57,234 existing rows and finish with a clean summary having written nothing. So
//  neither mode can do this job, and the second one FAILS SILENTLY. Hence UPDATE.
//
//  ── rt-SAFE BY CONSTRUCTION, five independent mechanisms ──────────────
//  1. The patch is assembled by ITERATING the NEW_FIELDS whitelist. There is no code
//     path by which an eighth key enters the object.
//  2. assertPatch() runs before EVERY write: keys must be a subset of NEW_FIELDS and
//     must not intersect FORBIDDEN. A violation THROWS and aborts the run.
//  3. .update(), never .upsert(). update cannot insert, so a row that is not there is
//     a counted MISS, never a silently invented card.
//  4. The seven columns are absent from the engine. Verified 2026-08-17 against a
//     FRESH pg_get_viewdef('player_card_view') (length 11,696, healthy): all seven
//     return position() = 0, while a positive control (goals/assists/minutes/position)
//     was FOUND at chars 171/212/111/75. The engine cannot read what it never
//     references. They are also absent from player_card_mv, whose column list is
//     frozen, so this write is invisible to the site until that matview is rebuilt.
//  5. Proven empirically after the fact: --snapshot before and after, then diff. Per the
//     all-57,234-card snapshot rule in §C, the snapshot covers EVERY card, not the target
//     rows — a target-only snapshot once reported a clean write and missed 137 movers and
//     two public band crossings. (That rule was promoted from §F into §C on 2026-08-18
//     when the session log was archived, precisely so this reference could not dangle.)
//
//  ── THE TWO SILENT-SUCCESS TRAPS THIS SCRIPT AVOIDS ───────────────────
//  a. import_progress. importLeagueSeason() opens with isSeasonDone(), and every
//     league-season is ALREADY marked complete from the original ingest. Reusing that
//     checkpointing would skip all 144 league-seasons and print a clean summary. This
//     script keeps its OWN state file (gk_pen_backfill_state.json) and never reads or
//     writes import_progress.
//  b. Unverified writes. Every update runs .select('id') and asserts exactly one row
//     came back. Zero affected rows is counted as a MISS, and the run ends with a
//     reconciliation that must balance. A write that "succeeds" without landing is the
//     failure mode this whole script is shaped around.
//
//  RUN (Terminal A):
//    node scripts/enrichment/gk_pen_backfill.js --snapshot before.json   → rt baseline, no writes
//    node scripts/enrichment/gk_pen_backfill.js --league PL --to 2016 --from 2016
//                                                                       → DRY RUN, one league-season
//    node scripts/enrichment/gk_pen_backfill.js --league PL --write      → arm one league
//    node scripts/enrichment/gk_pen_backfill.js --write                  → full pass, all 9 leagues
//    node scripts/enrichment/gk_pen_backfill.js --snapshot after.json    → then diff before/after
//
//  ── TWO-MEASUREMENTS-IN-ONE-COLUMN: DELIBERATELY NOT CREATED ──────────
//  Keeper saves are written to their OWN column, `saves`, and NOT merged into the
//  existing blocked-shots column `tackles_blocks`. Merging them was considered and
//  rejected for two reasons, the second of which is fatal:
//    1. It would make one column mean blocked shots for outfielders and saves for
//       keepers, so every query would have to filter on position or silently read two
//       different measurements at once. `position` is exactly the field §C and §E record
//       as unreliable, so the disambiguator would be the least trustworthy thing there.
//    2. `tackles_blocks` IS AN ENGINE INPUT. It appears in player_card_view at char 574,
//       beside tackles_total (452), interceptions (538) and duels_won (817) — the def_core
//       ingredients. Writing saves into it would feed the defensive signal and move rt on
//       all GK cards, and saves outnumber blocks by roughly an order of magnitude
//       (Alisson 83 saves in 23/24), so the inflation would be large and silent.
//  `saves` is absent from the view (position 0), which is why it is rt-safe and
//  tackles_blocks is not. Do not merge them.
//
//  DRY RUN IS THE DEFAULT. --write is required to touch anything.
//  Resumable: Ctrl-C is safe, re-running skips completed league-seasons.
//  Budget, MEASURED not estimated: a league-season is ~35 pages for older seasons and
//  51 for recent ones (PL 2023), so the full 144 league-season pass is ~5,000-7,000
//  pages, NOT the ~33,000 first assumed. The API is not the bottleneck in a write run:
//  each page is followed by ~20 individual row updates, so the ~60,000 DB round-trips
//  dominate and the wall time is ~1.5-2h. Pacing via --delay (default DELAY_MS 320).
//  Reason on the ZERO-LATENCY ceiling, 60000/DELAY per minute, not the observed rate.
//  Pre-2015 yields only `starts` (the keeper and penalty fields do not exist there).
// ══════════════════════════════════════════════════════════════════════

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Reused from the importer so this script dedupes and sums IDENTICALLY to the original
// ingest. If it resolved multi-block seasons differently, the new columns on a two-club
// row would be derived from a different block set than the goals and minutes beside them.
// Safe to require only because of the ENTRY-POINT GUARD in that file.
const {
  LEAGUES, MIN_MIN, DELAY_MS, seasonCode, sleep,
  af, deriveCeilings, resolveSeasonStat, extractNewFields, NEW_FIELDS, QUOTA,
} = require('../../api/import-players.js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const args     = process.argv.slice(2);
const WRITE    = args.includes('--write');
const ONLY     = args.includes('--league') ? args[args.indexOf('--league') + 1] : null;
const FLOOR_YR = args.includes('--from') ? parseInt(args[args.indexOf('--from') + 1]) : 2010;
const TO_YR    = args.includes('--to')   ? parseInt(args[args.indexOf('--to')   + 1]) : 2025;
const SNAPSHOT = args.includes('--snapshot') ? args[args.indexOf('--snapshot') + 1] : null;
// Backfill-only pacing override. The importer's shared DELAY_MS stays at 320; this lets a
// backfill run faster on a higher-tier key WITHOUT changing pacing for the importer too.
// Reason on the ZERO-LATENCY ceiling (1000/DELAY per second), not the observed rate: at 240
// that ceiling is 250/min against ULTRA's 450 cap, so 44% headroom even if the API answered
// instantly. The docs warn that exceeding the per-minute rate can get the key firewalled
// WITHOUT NOTICE, and the API is not the bottleneck here anyway — the ~20 row updates that
// follow each page cost far more than the sleep does. Do not tune this to save minutes.
const DELAY = args.includes('--delay') ? parseInt(args[args.indexOf('--delay') + 1]) : DELAY_MS;
// A mistyped --delay yields NaN, and sleep(NaN) resolves IMMEDIATELY, so the run would lose
// its throttle entirely and hammer the API at full speed — the exact firewall case the
// pacing exists to prevent, arriving silently and looking merely like a fast run.
if (!Number.isFinite(DELAY) || DELAY < 100) {
  console.error(`❌ --delay must be a number >= 100 (got ${JSON.stringify(args[args.indexOf('--delay') + 1])}). Refusing to run unthrottled.`);
  process.exit(1);
}
const STATE_FILE = path.join(__dirname, 'gk_pen_backfill_state.json');

// Never writable by this script. Not a comment, an assertion: see assertPatch().
const FORBIDDEN = new Set([
  'goals','assists','minutes','appearances','position','rt','rating',
  'source','team_name','team_id','player_id','api_player_id','season',
  'season_year','league_code','league_id','age','id',
]);

const S = { calls:0, resolved:0, updated:0, missed:0, allNull:0, errors:0, start:Date.now() };
const elapsed = () => Math.round((Date.now() - S.start) / 1000);

// Per-field coverage, so a run reports WHICH fields actually landed rather than just a
// row count. A row can be "updated" on `starts` alone and look identical in the totals to
// one that landed all seven, which is precisely the distinction that matters pre-2015.
const FIELD_STATS = Object.fromEntries(NEW_FIELDS.map(k => [k, { pop:0, nul:0 }]));
const SAMPLES = { keepers: [], penalties: [] };
function tally(name, team, s, ext){
  for (const k of NEW_FIELDS) ext[k] != null ? FIELD_STATS[k].pop++ : FIELD_STATS[k].nul++;
  const row = { name, team, goals: s.goals?.total ?? null, assists: s.goals?.assists ?? null,
                minutes: s.games?.minutes ?? null, ...ext };
  if (ext.saves != null && SAMPLES.keepers.length < 12) SAMPLES.keepers.push(row);
  if ((ext.penalties_scored || 0) > 0 && SAMPLES.penalties.length < 12) SAMPLES.penalties.push(row);
}

// ── state ─────────────────────────────────────────────────────────────
function loadState(){
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { done: {} }; }
}
function saveState(st){ fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 1)); }

// ── the guarantee ─────────────────────────────────────────────────────
// Throws rather than warns. A patch that has drifted is not something to log and carry
// on from: it means the whitelist is no longer the whitelist, and the next 57,000 rows
// would inherit whatever leaked in.
function assertPatch(patch){
  const keys = Object.keys(patch);
  for (const k of keys) {
    if (!NEW_FIELDS.includes(k)) throw new Error(`PATCH GUARD: '${k}' is not in NEW_FIELDS. Aborting.`);
    if (FORBIDDEN.has(k))        throw new Error(`PATCH GUARD: '${k}' is FORBIDDEN. Aborting.`);
  }
  return keys.length;
}

// ── rt snapshot: EVERY card, not just the targets ─────────────────────
async function snapshot(file){
  const rows = [];
  let f = 0;
  while (true) {
    const { data, error } = await supabase.from('player_card_view')
      .select('card_id,rt').order('card_id', { ascending: true }).range(f, f + 999);
    if (error) throw new Error(`snapshot: ${error.message}`);
    rows.push(...(data || []));
    process.stdout.write(`\r  snapshot: ${rows.length} rows`);
    if (!data || data.length < 1000) break;
    f += 1000;                                   // paginate past the 1000-row PostgREST cap (§C)
  }
  fs.writeFileSync(file, JSON.stringify(rows));
  // Read it back and assert, rather than trusting the write (§C: verify by READING).
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (back.length !== rows.length) throw new Error(`snapshot readback mismatch: ${back.length} vs ${rows.length}`);
  console.log(`\n  ✓ ${rows.length} cards -> ${file} (read back and verified)`);
}

// ── one league-season ─────────────────────────────────────────────────
async function backfillLeagueSeason(code, year, st){
  const key = `${code}|${year}`;
  if (st.done[key]) { console.log(`  ⏭️  ${code} ${year} already done — skip`); return; }

  const L = LEAGUES[code].id;
  const sCode = seasonCode(year);
  let page = 1, totalPages = 1;
  const local = { resolved:0, updated:0, missed:0, allNull:0 };

  // DRY RUN MUST PROVE THE KEYS MATCH. Without this the dry run counts a row and skips
  // before touching the database, so it reports "missed 0" having checked nothing — false
  // comfort about precisely the failure this script exists to prevent. So in dry run we
  // pull the existing (api_player_id) set for this league-season once and check membership
  // in memory: same answer as the real run's affected-row assertion, zero writes, one query.
  const existing = new Set();
  if (!WRITE) {
    let f = 0;
    while (true) {
      const { data, error } = await supabase.from('player_season_cards')
        .select('api_player_id').eq('season_year', year).eq('league_code', code).range(f, f + 999);
      if (error) throw new Error(`existing-fetch ${code} ${year}: ${error.message}`);
      (data || []).forEach(r => existing.add(r.api_player_id));
      if (!data || data.length < 1000) break;
      f += 1000;                                 // paginate past the 1000-row cap (§C)
    }
  }

  do {
    const j = await af(`/players?league=${L}&season=${year}&page=${page}`);
    S.calls++;
    await sleep(DELAY);
    totalPages = j.paging?.total || 1;

    for (const row of (j.response || [])) {
      const s = resolveSeasonStat(row.statistics, L, code, year);
      if (!s) continue;
      const minutes = (s.games?.minutes || 0);
      if (minutes < MIN_MIN) continue;           // same floor as the ingest, so the same population
      local.resolved++; S.resolved++;

      // WHITELIST-BUILT. Iterating NEW_FIELDS is what makes an eighth key impossible.
      //
      // COALESCE SEMANTICS: a null is OMITTED from the patch rather than written as null,
      // so a re-run can never wipe a real value with a null it happened to get this time.
      // The source is not perfectly stable — a block that resolved with penalty data on one
      // pass can come back thinner on another — and under a plain write the second pass
      // would silently erase the first pass's work while reporting a successful update.
      // ACCEPTED CONSEQUENCE: a field cannot be CLEARED by this script once it is set. To
      // null something you must do it deliberately in SQL. That is the correct trade here,
      // because the failure it prevents is silent and the one it creates is not.
      const ext = extractNewFields(s);
      tally(row.player.name, s.team?.name || '', s, ext);
      const patch = {};
      for (const k of NEW_FIELDS) if (ext[k] != null) patch[k] = ext[k];
      assertPatch(patch);

      // Nothing non-null to write. Skipping keeps the updated count meaningful and saves
      // ~16,600 pointless round-trips across the pre-2015 seasons, where only `starts` exists.
      if (Object.keys(patch).length === 0) { local.allNull++; S.allNull++; continue; }

      // Dry run: count what WOULD land, and what would NOT, by the same key the real write
      // uses. S.updated must move too, or the reconciliation reports a false failure on
      // every dry run (it did, on the first one).
      if (!WRITE) {
        if (existing.has(row.player.id)) { local.updated++; S.updated++; }
        else                             { local.missed++;  S.missed++;  }
        continue;
      }  // dry run: count what WOULD land

      const { data, error } = await supabase.from('player_season_cards')
        .update(patch)
        .eq('api_player_id', row.player.id)
        .eq('season', sCode)
        .eq('league_code', code)
        .select('id');

      if (error) { S.errors++; console.error(`  ❌ ${row.player.name}: ${error.message}`); continue; }
      // THE ASSERTION THAT MATTERS. 0 rows means the card is not in our table (below the
      // 300-min floor at ingest, or never ingested). That is a MISS, not a success, and
      // it is never turned into an insert.
      if (!data || data.length === 0) { local.missed++; S.missed++; continue; }
      if (data.length > 1) throw new Error(`KEY GUARD: ${data.length} rows matched ${row.player.id}/${sCode}/${code}. Aborting.`);
      local.updated++; S.updated++;
    }
    page++;
  } while (page <= totalPages);

  console.log(`  ${code} ${year}: resolved ${local.resolved} · ${WRITE ? 'updated' : 'would update'} ${local.updated} · missed ${local.missed} · all-null skipped ${local.allNull}`);
  if (WRITE) { st.done[key] = { updated: local.updated, missed: local.missed, at: new Date().toISOString() }; saveState(st); }
}

// ── main ──────────────────────────────────────────────────────────────
(async () => {
  if (SNAPSHOT) { console.log(`╔══ rt SNAPSHOT -> ${SNAPSHOT} ══╗`); await snapshot(SNAPSHOT); return; }

  const codes = ONLY ? [ONLY] : Object.keys(LEAGUES);
  for (const c of codes) if (!LEAGUES[c]) { console.error(`Unknown league ${c}`); process.exit(1); }

  console.log(`╔══ VVonderXI keeper/penalty backfill ${WRITE ? '(LIVE WRITE)' : '(DRY RUN — no writes)'} ══╗`);
  console.log(`Leagues: ${codes.join(', ')} · seasons ${FLOOR_YR}-${TO_YR} · min ${MIN_MIN} min`);
  console.log(`Fields:  ${NEW_FIELDS.join(', ')}`);
  if (!WRITE) console.log(`\n  DRY RUN. Nothing will be written. Add --write to arm.\n`);

  // Must run: resolveSeasonStat's artifact tests consult these ceilings, and without them
  // the ceiling tests are DISABLED, which would resolve multi-block seasons differently
  // from the original ingest. DB-derived, costs no API calls.
  await deriveCeilings();

  const st = loadState();
  for (const code of codes) {
    console.log(`\n📁 ${code}`);
    for (let y = TO_YR; y >= FLOOR_YR; y--) {
      try { await backfillLeagueSeason(code, y, st); }
      catch (e) {
        if (/GUARD/.test(e.message)) throw e;      // a guard failure aborts everything
        S.errors++; console.error(`  ❌ ${code} ${y}: ${e.message}`);
      }
    }
  }

  console.log('\n╔══ COMPLETE ══╗');
  console.log(`  Resolved (over ${MIN_MIN}m):  ${S.resolved}`);
  console.log(`  ${WRITE ? 'Updated' : 'Would update'}:           ${S.updated}`);
  console.log(`  Missed (no such row):    ${S.missed}`);
  console.log(`  Skipped (all seven NR):  ${S.allNull}`);
  console.log(`  Errors:                  ${S.errors}`);
  console.log(`  Pages fetched:           ${S.calls}`);   // pages, not raw calls: af() retries internally
  console.log(`  Time:                    ${elapsed()}s`);
  // Reconciliation. If this does not balance, something was neither written nor accounted
  // for, which is exactly the "reported success, wrote nothing" failure mode.
  const acc = S.updated + S.missed + S.allNull;
  console.log(`\n  Reconciliation: ${S.updated} + ${S.missed} + ${S.allNull} = ${acc} vs ${S.resolved} resolved ` +
              `${acc === S.resolved ? '✓ balances' : '✗ DOES NOT BALANCE — investigate before trusting this run'}`);

  console.log('\n  ── PER-FIELD COVERAGE (of resolved rows) ──');
  for (const k of NEW_FIELDS) {
    const { pop, nul } = FIELD_STATS[k];
    const t = pop + nul;
    console.log(`     ${k.padEnd(17)} populated ${String(pop).padStart(5)} / ${t}  (${t ? (100*pop/t).toFixed(1) : '0.0'}%)   NR ${nul}`);
  }

  const show = r => `     ${r.name.slice(0,22).padEnd(23)} ${String(r.team).slice(0,16).padEnd(17)} ` +
    `min ${String(r.minutes).padStart(4)} starts ${String(r.starts).padStart(2)} | goals ${String(r.goals).padStart(4)} ` +
    `conceded ${String(r.goals_conceded).padStart(4)} saves ${String(r.saves).padStart(4)} | ` +
    `pen ${r.penalties_scored}/${r.penalties_missed} saved ${r.penalties_saved}`;
  if (SAMPLES.keepers.length)   { console.log('\n  ── KEEPERS (saves non-null) ──');            SAMPLES.keepers.forEach(r => console.log(show(r))); }
  if (SAMPLES.penalties.length) { console.log('\n  ── OUTFIELD PENALTY TAKERS (scored > 0) ──'); SAMPLES.penalties.forEach(r => console.log(show(r))); }

  // Quota from the LIVE rate-limit headers captured during the run, costing no extra call.
  // NOT from /status: that endpoint is served cached and reported the same figure before
  // and after a 51-page run, which would have understated real usage by 51.
  if (QUOTA.dayRemaining != null) {
    console.log(`\n  ── QUOTA (live headers, last response of this run) ──`);
    console.log(`     day    ${QUOTA.dayLimit - QUOTA.dayRemaining} used of ${QUOTA.dayLimit}, ${QUOTA.dayRemaining} remaining`);
    console.log(`     minute ${QUOTA.minLimit - QUOTA.minRemaining} used of ${QUOTA.minLimit} (DELAY ${DELAY}ms, ceiling ${Math.round(60000/DELAY)}/min)`);
  }
})();
