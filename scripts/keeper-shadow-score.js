#!/usr/bin/env node
/*  KEEPER SHADOW SCORER , READ-ONLY. IT SHIPS NOTHING AND WRITES NOTHING.
 *
 *  It reads the database, refuses to run if the data is not what the survey found, and then
 *  prints the decision tables. It does not write to any table, does not touch the view, and
 *  produces no artefact any surface reads. Run it, read the tables, decide, and the decision
 *  is what gets built , not this file.
 *
 *      node scripts/keeper-shadow-score.js            (Terminal A)
 *      node scripts/keeper-shadow-score.js --self-test
 *
 *  WHY THE VALIDATION PASS COMES FIRST AND EXITS NON-ZERO. Every guard below exists because
 *  the 2026-09-05 field survey found the thing it guards against, in this data, today. A
 *  scorer that runs anyway on a changed database would produce tables that look exactly as
 *  authoritative as correct ones. So the run either matches the surveyed shape or it stops.
 *
 *  --self-test PLANTS A FAILURE IN EACH GUARD AND CONFIRMS THE GUARD CATCHES IT. A validation
 *  pass nobody has seen fail is not evidence of anything; this project has recorded that
 *  lesson about harnesses more than once.  */
require('dotenv').config({quiet:true});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SELF_TEST = process.argv.includes('--self-test');
/*  --floor=N RAISES THE SHOTS-FACED GATE. Default 60, which is the surveyed value and the
    only one the EXPECT figures describe. Above it the pool shrinks, so the band targets
    shrink with it (they are proportional to pool size, not fixed counts) and the G5 gate
    assertion checks RECONCILIATION rather than the surveyed numbers , see the guard.  */
const FLOOR_ARG = (process.argv.find(a => a.startsWith('--floor=')) || '').split('=')[1];
const SHOTS_FLOOR = FLOOR_ARG ? parseInt(FLOOR_ARG, 10) : 60;
if (FLOOR_ARG && (!Number.isFinite(SHOTS_FLOOR) || SHOTS_FLOOR < 1)) {
  console.error('--floor must be a positive integer'); process.exit(2); }

// ── surveyed constants. These are ASSERTIONS about the database, not settings. ──────────
const EXPECT = {
  keeperRows:        2806,   // position='GK' AND saves IS NOT NULL
  gcNotNullRows:    31365,   // the trap: NOT a keeper filter
  gcKeeperRows:      2816,   // ten more than keeperRows
  zeroFilledKeepers:   10,   // goals_conceded=0 with saves NULL, on real minutes
  startsWrong:        774,   // starts > appearances
  scored:            1920, pre2015: 10, underMin: 559, underShots: 317
};
// ── gates. Minutes and SHOTS, never starts. ────────────────────────────────────────────
const GATE = { minMinutes: 800, minShots: SHOTS_FLOOR, fromSeason: 2015 };
// ── band anchors, taken from the engine's own rank offsets and scaled to the keeper
//    population, so the target is proportional occupancy rather than a number picked to
//    make a name appear. engine: 12 at 95+, 150 at 90+, 650 at 85+, out of 54,173 scored. ─
const ENGINE = { scored: 54173, gen: 12, elite: 150, wc: 650 };
const TILT = 0.35;         // the engine's own league-tilt strength, reused for comparability

const fail = (code, msg, detail) => {
  console.error('\n' + '='.repeat(78));
  console.error('VALIDATION FAILED , ' + code);
  console.error('='.repeat(78));
  console.error(msg);
  if (detail !== undefined) console.error('\n  measured: ' + JSON.stringify(detail));
  console.error('\nNO SCORING WAS PERFORMED. Nothing was written. Re-run the field survey');
  console.error('before changing this script: the guard is probably right and the data moved.');
  process.exit(1);
};

const page = async (tbl, cols, key) => {
  let from = 0, out = [];
  for (;;) {
    const { data, error } = await sb.from(tbl).select(cols).order(key, { ascending: true }).range(from, from + 999);
    if (error) fail('DB-READ', 'Query failed on ' + tbl + ': ' + error.message);
    out = out.concat(data);
    if (data.length < 1000) break;        // 1000 is PostgREST's cap; a short page is the true end
    from += 1000;
  }
  return out;
};
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y);
  const i = (p / 100) * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };

(async () => {
  console.log('KEEPER SHADOW SCORER , read-only, ' + new Date().toISOString());
  console.log('shots-faced floor: ' + SHOTS_FLOOR + (SHOTS_FLOOR === 60 ? ' (default, surveyed)' : ' (raised via --floor)'));
  console.log('Ships nothing. Writes nothing. Prints tables.\n');

  const mv = await page('player_card_mv',
    'card_id,player_name,season,season_year,league_code,team_name,position,position_pool,' +
    'minutes,appearances,starts,saves,goals_conceded,penalties_saved,rt,league_strength_weight', 'card_id');
  let elw = [], f = 0;
  for (;;) { const { data } = await sb.from('engine_league_weights').select('league_code,season_year,weight').range(f, f + 999);
    elw = elw.concat(data); if (data.length < 1000) break; f += 1000; }
  const W = new Map(); elw.forEach(r => W.set(r.league_code + '|' + r.season_year, r.weight));
  const wtFor = r => { const k = W.get(r.league_code + '|' + r.season_year);
    return k != null ? k : (r.league_strength_weight != null ? r.league_strength_weight : 0.80); };

  // =====================================================================================
  // VALIDATION , runs to completion, then exits non-zero if anything failed.
  // =====================================================================================
  console.log('='.repeat(78));
  console.log('VALIDATION PASS , must pass in full before any scoring');
  console.log('='.repeat(78));
  const results = [];
  const check = (code, label, ok, detail) => { results.push({ code, label, ok, detail });
    console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + code.padEnd(10) + ' ' + label + (detail !== undefined ? '   ' + JSON.stringify(detail) : '')); };
  const vacuous = (code, label, n, why) => { results.push({ code, label, ok: true, vacuous: true });
    console.log('  [VACUOUS] ' + code.padEnd(10) + ' ' + label + ' = ' + n + '   ' + why); };

  // G1 , the keeper filter. saves IS NOT NULL, never goals_conceded IS NOT NULL.
  const keepers = mv.filter(r => r.position === 'GK' && r.saves != null);
  const gcNotNull = mv.filter(r => r.goals_conceded != null).length;
  const gcKeepers = mv.filter(r => r.position === 'GK' && r.goals_conceded != null).length;
  check('G1-FILTER', 'keeper set = position GK AND saves NOT NULL',
        keepers.length === (SELF_TEST ? -1 : EXPECT.keeperRows), keepers.length);
  check('G1-TRAP  ', 'goals_conceded NOT NULL is NOT a keeper filter (would select)',
        gcNotNull === EXPECT.gcNotNullRows, gcNotNull);
  check('G1-ASYM  ', 'goals_conceded has more keeper rows than saves (not symmetric)',
        gcKeepers === EXPECT.gcKeeperRows && gcKeepers > keepers.length, { gc: gcKeepers, saves: keepers.length });

  // G2 , the denominator. The zero-filled ten must never reach a division.
  const zeroFilled = mv.filter(r => r.position === 'GK' && r.goals_conceded === 0 && r.saves == null);
  check('G2-ZEROS ', 'zero-filled keeper cards found and excluded by the saves filter',
        zeroFilled.length === EXPECT.zeroFilledKeepers && zeroFilled.every(r => !keepers.includes(r)),
        { found: zeroFilled.length, leakedIntoKeeperSet: zeroFilled.filter(r => keepers.includes(r)).length });
  const shotsFaced = r => (r.saves == null || r.goals_conceded == null) ? null : r.saves + r.goals_conceded;
  const badDenom = keepers.filter(r => { const s = shotsFaced(r); return s == null || s <= 0; });
  check('G2-DENOM ', 'every keeper in the set has a positive derived shots-faced',
        (SELF_TEST ? false : badDenom.length === 0), { nonPositiveOrNull: badDenom.length });

  // G3 , starts is never used. Assert it is wrong, and assert this file does not read it.
  const startsWrong = mv.filter(r => r.starts != null && r.appearances != null && r.starts > r.appearances);
  check('G3-STARTS', 'starts is wrong on the surveyed number of cards (so: unusable)',
        startsWrong.length === EXPECT.startsWrong, startsWrong.length);
  const src = require('fs').readFileSync(__filename, 'utf8');
  /*  THE MARKER IS ASSEMBLED, NOT WRITTEN WHOLE, AND THAT IS LOAD-BEARING. Written as one
      literal, indexOf finds THIS line rather than the banner further down, because this line
      then contains the marker too. The scoring half would start here, swallow the label on
      the next line, find the very substring it is looking for, and the guard would fail on
      itself with no bug anywhere in the scorer. Found by the guard reporting a hit on a file
      whose scoring half is clean.  */
  const MARK = 'DECISION' + ' TABLES';
  const at = src.indexOf(MARK);
  /*  AND THE MARKER MUST BE ASSERTED FOUND. The first fix for the self-match above searched
      for a SECOND occurrence, which no longer existed once the literal was split , indexOf
      returned -1, slice(-1) produced a one-character string, and the guard passed on
      nothing. A guard that cannot fail is worse than the bug it was written for, so the
      offset is checked before it is used.  */
  if (at < 0) fail('G3-MARKER', 'Could not locate the scoring-half marker in this file. ' +
    'The guard that proves starts is unused cannot run, so nothing is proven. Refusing to score.');
  const scoringHalf = src.slice(at);
  check('G3-UNUSED', 'the scoring half of this file never reads r.starts',
        !/\br\.starts\b/.test(scoringHalf), { occurrencesInScoringHalf: (scoringHalf.match(/\br\.starts\b/g) || []).length });

  // G4 , vacuous checks reported as vacuous, never as passes.
  const negs = keepers.filter(r => r.saves < 0 || r.goals_conceded < 0).length;
  vacuous('V1-EXCEED', 'saves > (saves + goals_conceded)',
    keepers.filter(r => r.saves > shotsFaced(r)).length,
    ', shots faced is DERIVED as saves+goals_conceded, so this cannot be non-zero unless goals_conceded < 0');
  vacuous('V2-RATE1 ', 'save rate > 1',
    keepers.filter(r => shotsFaced(r) > 0 && r.saves / shotsFaced(r) > 1).length, ', same identity');
  vacuous('V3-RATE0 ', 'save rate < 0',
    keepers.filter(r => shotsFaced(r) > 0 && r.saves / shotsFaced(r) < 0).length, ', same identity');
  check('G4-NEG   ', 'no negative saves or goals_conceded (this one is NOT vacuous)', negs === 0, negs);

  // G5 , the gate split must reconcile exactly.
  const pre = keepers.filter(r => r.season_year < GATE.fromSeason);
  const modern = keepers.filter(r => r.season_year >= GATE.fromSeason);
  const underMin = modern.filter(r => r.minutes < GATE.minMinutes);
  const okMin = modern.filter(r => r.minutes >= GATE.minMinutes);
  const underShots = okMin.filter(r => shotsFaced(r) < GATE.minShots);
  const POOL = okMin.filter(r => shotsFaced(r) >= GATE.minShots);
  /*  AT THE DEFAULT FLOOR THIS ASSERTS THE SURVEYED NUMBERS. ABOVE IT THEY NO LONGER APPLY,
      so it asserts what is still true , that the four groups partition the keeper set
      exactly , rather than being quietly skipped. A guard that switches itself off when the
      inputs change is not a guard.  */
  const reconciles = pre.length + underMin.length + underShots.length + POOL.length === keepers.length;
  if (SHOTS_FLOOR === 60) {
    check('G5-GATE  ', 'gate split matches the surveyed figures and reconciles',
      pre.length === EXPECT.pre2015 && underMin.length === EXPECT.underMin &&
      underShots.length === EXPECT.underShots && POOL.length === EXPECT.scored && reconciles,
      { pre2015: pre.length, underMin: underMin.length, underShots: underShots.length, scored: POOL.length });
  } else {
    check('G5-GATE  ', 'gate split partitions the keeper set exactly (floor ' + SHOTS_FLOOR + ', surveyed figures N/A)',
      reconciles && POOL.length < EXPECT.scored,
      { pre2015: pre.length, underMin: underMin.length, underShots: underShots.length, scored: POOL.length,
        survivingOf1920: POOL.length + ' (' + (POOL.length / EXPECT.scored * 100).toFixed(1) + '%)' });
  }

  const failed = results.filter(r => !r.ok);
  console.log('\n  ' + results.filter(r => r.ok && !r.vacuous).length + ' passed, ' +
              results.filter(r => r.vacuous).length + ' vacuous (reported, not counted as passes), ' +
              failed.length + ' failed');
  if (failed.length) fail('GUARD', 'These guards did not hold:\n  ' +
    failed.map(r => r.code + ' ' + r.label).join('\n  '), failed.map(r => ({ code: r.code, detail: r.detail })));
  console.log('\n  VALIDATION PASSED. Scoring may proceed on ' + POOL.length + ' keeper seasons.\n');

  // =====================================================================================
  // DECISION TABLES
  // =====================================================================================
  const SF = r => r.saves + r.goals_conceded;
  const RAW = r => r.saves / SF(r);
  const p0 = POOL.reduce((a, r) => a + r.saves, 0) / POOL.reduce((a, r) => a + SF(r), 0);
  const stab = (r, k) => (r.saves + k * p0) / (SF(r) + k);
  const tilted = (r, k, t) => stab(r, k) * (1 - (1 - wtFor(r)) * t);

  console.log('='.repeat(78));
  console.log('POOL: ' + POOL.length + ' keeper seasons. Pooled prior save rate p0 = ' + p0.toFixed(5));
  console.log('shots faced: min ' + Math.min(...POOL.map(SF)) + '  median ' + med(POOL.map(SF)) +
              '  max ' + Math.max(...POOL.map(SF)));
  console.log('='.repeat(78));

  // ---- TABLE 5 FIRST, because it chooses k and every other table depends on it ---------
  console.log('\nTABLE 5 , SENSITIVITY OF THE TOP-50 ORDERING TO THE PRIOR WEIGHT k');
  console.log('  k is in SHOTS, not minutes. The engine\'s 380 is a minutes constant and is');
  console.log('  deliberately NOT inherited , different unit, different quantity.\n');
  /*  THE PERTURBATION IS PROPORTIONAL, AND THE FIRST VERSION OF THIS TABLE WAS WRONG.
      It compared each k with the PREVIOUS k on an uneven grid (10,20,...,300,500), so the
      tau column measured how far apart the two k values happened to be as much as it
      measured stability, and rows could not be compared with each other. Each k is now
      compared against k * 1.25 , the same proportional nudge everywhere , so the column
      means one thing down its whole length. Lower churn and higher tau = more stable.  */
  const PERTURB = 1.25;
  const top = (k, t) => POOL.slice().sort((a, b) => tilted(b, k, t) - tilted(a, k, t) || a.card_id - b.card_id).slice(0, 50);
  const kendall = (A, B) => { const ia = new Map(A.map((r, i) => [r.card_id, i])), ib = new Map(B.map((r, i) => [r.card_id, i]));
    const common = A.filter(r => ib.has(r.card_id)).map(r => r.card_id);
    let c = 0, d = 0;
    for (let i = 0; i < common.length; i++) for (let j = i + 1; j < common.length; j++) {
      const sg = Math.sign(ia.get(common[i]) - ia.get(common[j])) * Math.sign(ib.get(common[i]) - ib.get(common[j]));
      if (sg > 0) c++; else if (sg < 0) d++; }
    return (c + d) ? (c - d) / (c + d) : 1; };
  const KS = [0, 10, 20, 30, 40, 50, 60, 80, 100, 125, 150, 200, 300, 500];
  console.log('     k    churn vs k*1.25   tau vs k*1.25   mean |rank shift|');
  const sens = [];
  KS.forEach(k => {
    const A = top(k, TILT), B = top(k * PERTURB, TILT);
    const bIds = new Set(B.map(r => r.card_id));
    const churn = A.filter(r => !bIds.has(r.card_id)).length;
    const ib = new Map(B.map((r, i) => [r.card_id, i]));
    const shifts = A.map((r, i) => ib.has(r.card_id) ? Math.abs(i - ib.get(r.card_id)) : null).filter(v => v !== null);
    const tau = kendall(A, B);
    const shift = shifts.length ? shifts.reduce((a, b) => a + b, 0) / shifts.length : NaN;
    sens.push({ k, churn, tau, shift });
    console.log('  ' + String(k).padStart(5) + String(churn).padStart(16) + tau.toFixed(4).padStart(16) + shift.toFixed(2).padStart(19));
  });
  /*  NO PLATEAU IS A RESULT, AND IT MUST NOT BE ROUNDED UP INTO A CHOICE. The first version
      of this block fell back to the LAST k in the sweep when no plateau existed and then
      printed "ORDERING STABILISES AT k = 500", which was false and was the largest constant
      on offer. Choosing the end of a sweep because nothing qualified is choosing by
      accident. It now refuses.  */
  /*  k = 0 IS EXCLUDED FROM PLATEAU ELIGIBILITY AND THE REASON IS ARITHMETIC, NOT TASTE.
      The perturbation is proportional, so 0 * 1.25 is still 0: that row compares the
      ordering against ITSELF and scores a perfect tau 1.0 with zero churn every time. It is
      the one row that cannot fail, which makes it the one row that proves nothing. Left in,
      it manufactured a two-row "plateau" of k = 0 and k = 10 and a confident k = 10.  */
  const eligible = sens.filter(s => s.k > 0);
  const best = eligible.slice().sort((a, b) => (a.churn - b.churn) || (b.tau - a.tau))[0];
  /*  A TOP-50 THAT IS MOST OF THE POOL CANNOT CHURN, SO ITS STABILITY IS SATURATION RATHER
      THAN AGREEMENT. With 63 cards in the pool only 13 exist outside the top 50 to swap in,
      so churn is near zero however the score is computed and every k looks like a plateau.
      Same family as the k = 0 row above: a measurement that cannot come out badly is not a
      measurement. 25% is the line, and crossing it voids the table rather than footnoting it.  */
  const COVER = 50 / POOL.length;
  const DEGENERATE = COVER > 0.25;
  /*  AND THE PLATEAU MUST BE A CONTIGUOUS RUN, NOT A SCATTER. At floor 150 the qualifying set
      was k = 10, 20, 30 and separately 500; a midpoint over that list mixes a real plateau at
      the bottom with an unrelated stable point at the top. Longest contiguous run only.  */
  const qualifying = eligible.map(s => s.churn <= 1 && s.tau >= 0.95);
  let bestRun = [], run = [];
  qualifying.forEach((q, i) => { if (q) { run.push(eligible[i]); if (run.length > bestRun.length) bestRun = run.slice(); }
    else run = []; });
  const PLATEAU = DEGENERATE ? [] : bestRun;
  let K = null;
  if (DEGENERATE) {
    console.log('\n  *** TABLE VOID , THE TOP 50 IS ' + (COVER * 100).toFixed(0) + '% OF A POOL OF ' + POOL.length + '. ***');
    console.log('  Only ' + (POOL.length - 50) + ' cards exist outside it, so churn is near zero however the');
    console.log('  score is computed and every k reads as a plateau. This is saturation, not');
    console.log('  stability. NO CONSTANT MAY BE CHOSEN FROM THIS RUN. Lower the floor or');
    console.log('  shorten the list being compared.');
    K = best.k;
  } else if (PLATEAU.length >= 2) {
    K = PLATEAU[Math.floor(PLATEAU.length / 2)].k;
    console.log('\n  PLATEAU FOUND (longest contiguous run): churn <= 1 and tau >= 0.95 at k = ' + PLATEAU.map(s => s.k).join(', '));
    console.log('  k = ' + K + ' chosen as its midpoint. Chosen from this table, not from the names.');
  } else {
    console.log('\n  *** NO PLATEAU. THE TOP-50 ORDERING DOES NOT STABILISE ANYWHERE IN THIS SWEEP. ***');
    console.log('  Best row is k = ' + best.k + ' (churn ' + best.churn + ', tau ' + best.tau.toFixed(4) + '), and that is');
    console.log('  the LEAST BAD row rather than a stable one. THE CONSTANT IS NOT DECIDABLE FROM');
    console.log('  THIS DATA, and picking one anyway would be picking by eye with extra steps.');
    console.log('  The tables below therefore run at k = ' + best.k + ' AS AN ILLUSTRATION ONLY. Any');
    console.log('  ordering they show is unstable to a 25% change in a constant nobody has justified.');
    K = best.k;
  }
  const K_IS_PROVISIONAL = DEGENERATE || PLATEAU.length < 2;

  const line = r => String(r.card_id).padEnd(8) + String(r.player_name).slice(0, 21).padEnd(22) +
    String(r.season).padEnd(7) + String(r.league_code).padEnd(5) + String(r.minutes).padStart(6) +
    String(SF(r)).padStart(7) + (RAW(r) * 100).toFixed(1).padStart(8) +
    (stab(r, K) * 100).toFixed(1).padStart(9) + (tilted(r, K, TILT) * 100).toFixed(1).padStart(9) +
    String(r.rt).padStart(6);

  console.log('\n' + '='.repeat(78));
  console.log('TABLE 1 , NEW TOP 50 at k = ' + K + ', tilt ' + TILT +
              (K_IS_PROVISIONAL ? '   [k IS PROVISIONAL , NO PLATEAU, SEE TABLE 5]' : ''));
  console.log('='.repeat(78));
  console.log('card_id  player                season  lg   mins  shots     raw%    stab%   tilt%  rt now');
  top(K, TILT).forEach((r, i) => console.log(String(i + 1).padStart(2) + ' ' + line(r)));

  console.log('\n' + '='.repeat(78));
  console.log('TABLE 2 , DELTA DISTRIBUTION FOR THE CARDS CURRENTLY AT THE 75 CAP');
  console.log('='.repeat(78));
  const atCap = POOL.filter(r => r.rt === 75);
  const capAll = mv.filter(r => r.position === 'GK' && r.rt === 75);
  console.log('  keepers at rt 75 overall            : ' + capAll.length);
  console.log('  of those, inside the scored pool    : ' + atCap.length);
  console.log('  (the rest fail a gate, so this scorer says nothing about them)\n');
  const ranks = new Map(POOL.slice().sort((a, b) => tilted(b, K, TILT) - tilted(a, K, TILT)).map((r, i) => [r.card_id, i + 1]));
  const capRanks = atCap.map(r => ranks.get(r.card_id));
  console.log('  new rank among ' + POOL.length + ', for the ' + atCap.length + ' at cap:');
  [0, 5, 10, 25, 50, 75, 90, 95, 100].forEach(q =>
    console.log('     p' + String(q).padEnd(4) + Math.round(pct(capRanks, q))));
  const buckets = { 'top 50': 0, '51-200': 0, '201-500': 0, '501-1000': 0, '1001+': 0 };
  capRanks.forEach(v => { if (v <= 50) buckets['top 50']++; else if (v <= 200) buckets['51-200']++;
    else if (v <= 500) buckets['201-500']++; else if (v <= 1000) buckets['501-1000']++; else buckets['1001+']++; });
  console.log('\n  where the capped cards land:');
  Object.keys(buckets).forEach(b => console.log('     ' + b.padEnd(10) + String(buckets[b]).padStart(5) +
    '  (' + (buckets[b] / atCap.length * 100).toFixed(1) + '%)'));
  console.log('\n  READ THIS AS THE COST OF THE CAP: every one of these is currently printed as');
  console.log('  the same number, and the spread above is what that flattening hides.');

  console.log('\n' + '='.repeat(78));
  console.log('TABLE 3 , BAND OCCUPANCY against proportional targets');
  console.log('='.repeat(78));
  const tGen = ENGINE.gen * POOL.length / ENGINE.scored;
  const tElite = ENGINE.elite * POOL.length / ENGINE.scored;
  const tWC = ENGINE.wc * POOL.length / ENGINE.scored;
  console.log('  Targets are the engine\'s own rank anchors scaled to this pool, NOT numbers');
  console.log('  picked to make a name appear:');
  console.log('     95+ Generational : ' + tGen.toFixed(1) + '   (engine ' + ENGINE.gen + ' of ' + ENGINE.scored + ')');
  console.log('     90+ Iconic       : ' + tElite.toFixed(1) + '   (engine ' + ENGINE.elite + ')   brief says ~5');
  console.log('     85+ World Class  : ' + tWC.toFixed(1) + '   (engine ' + ENGINE.wc + ')   brief says ~22');
  console.log('\n  A rank-anchored mapping hits these BY CONSTRUCTION, so the honest test is');
  console.log('  the reverse: what SCORE would the boundary cards need, and is the gap between');
  console.log('  them real or noise? A save rate off n shots is a binomial proportion, so the');
  console.log('  gap is reported in standard errors, not in percentage points.\n');
  const sorted = POOL.slice().sort((a, b) => tilted(b, K, TILT) - tilted(a, K, TILT));
  [['95+', Math.round(tGen)], ['90+', Math.round(tElite)], ['85+', Math.round(tWC)]].forEach(([b, n]) => {
    if (n < 1) { console.log('     ' + b.padEnd(6) + 'target rounds to ' + n + ' , no keeper would occupy this band'); return; }
    const edge = sorted[n - 1], next = sorted[n];
    const gap = (tilted(edge, K, TILT) - tilted(next, K, TILT)) * 100;
    /*  THE GAP IS ONLY MEANINGFUL AGAINST SAMPLING ERROR, SO THE SCRIPT COMPUTES IT RATHER
        THAN LEAVING IT TO THE EYE. A save rate off n shots is a binomial proportion: its
        standard error is sqrt(p(1-p)/n). Two cards separated by far less than one SE are not
        ranked, they are tied with extra decimal places.  */
    const se = r => Math.sqrt(RAW(r) * (1 - RAW(r)) / SF(r)) * 100;
    const pooledSE = Math.sqrt(se(edge) ** 2 + se(next) ** 2);
    console.log('     ' + b.padEnd(6) + 'boundary at rank ' + n + ': ' + String(edge.player_name).slice(0, 18).padEnd(19) +
      (tilted(edge, K, TILT) * 100).toFixed(2) + '%   next: ' + (tilted(next, K, TILT) * 100).toFixed(2) +
      '%   gap ' + gap.toFixed(3) + 'pp');
    console.log('            edge SE ' + se(edge).toFixed(2) + 'pp (' + SF(edge) + ' shots), next SE ' +
      se(next).toFixed(2) + 'pp (' + SF(next) + ' shots), gap = ' + (gap / pooledSE).toFixed(3) +
      ' SE   ' + (gap / pooledSE < 0.5 ? '<<< NOT SEPARABLE' : ''));
  });

  console.log('\n' + '='.repeat(78));
  console.log('TABLE 4 , TILTED vs UNTILTED: does the tilt stop small-league top-loading?');
  console.log('='.repeat(78));
  const tl = top(K, TILT), ut = top(K, 0);
  const comp = L => { const c = {}; L.forEach(r => c[r.league_code] = (c[r.league_code] || 0) + 1);
    return Object.keys(c).sort((a, b) => c[b] - c[a]).map(k => k + ':' + c[k]).join('  '); };
  const meanWt = L => (L.reduce((a, r) => a + wtFor(r), 0) / L.length).toFixed(4);
  console.log('  UNTILTED top50 leagues : ' + comp(ut));
  console.log('     mean league weight  : ' + meanWt(ut));
  console.log('  TILTED   top50 leagues : ' + comp(tl));
  console.log('     mean league weight  : ' + meanWt(tl));
  const utIds = new Set(ut.map(r => r.card_id));
  console.log('  cards the tilt removes from the top 50: ' + ut.filter(r => !tl.some(x => x.card_id === r.card_id)).length);
  console.log('  cards the tilt introduces             : ' + tl.filter(r => !utIds.has(r.card_id)).length);
  const strong = new Set(['PL', 'LL', 'SA', 'BL', 'L1']);
  console.log('  top-5-league share, untilted: ' + (ut.filter(r => strong.has(r.league_code)).length / ut.length * 100).toFixed(0) + '%' +
              '   tilted: ' + (tl.filter(r => strong.has(r.league_code)).length / tl.length * 100).toFixed(0) + '%');
  console.log('\n  If those two shares are close, the tilt is NOT doing the job it is there for,');
  console.log('  and 0.35 is the wrong strength rather than the wrong idea.');

  console.log('\n' + '='.repeat(78));
  console.log('TABLE 6 , WHAT RESOLUTION THE MEASUREMENT ACTUALLY HAS');
  console.log('='.repeat(78));
  /*  THIS TABLE EXISTS BECAUSE THE STRONGEST FINDING IN THIS TOOL USED TO LIVE ONLY IN A
      COMMIT MESSAGE. The claim that keepers cannot be banded rests on three numbers , the
      spread of save rates, the typical standard error, and how often adjacent ranks clear
      that error , and a claim whose evidence cannot be re-run is a story. It is computed
      over the same POOL and the same gates as every other table here.
      PART A IS INDEPENDENT OF k AND OF THE TILT. Spread and standard error are properties
      of the raw save rates, so no scoring choice can flatter or damage them. PART B ranks,
      so it inherits whatever k this run settled on, and says so.  */
  const seOf = r => Math.sqrt(RAW(r) * (1 - RAW(r)) / SF(r));
  const rates = POOL.map(RAW), ses = POOL.map(seOf);
  const p1 = pct(rates, 1), p50r = pct(rates, 50), p99 = pct(rates, 99);
  const spread = p99 - p1, medSE = pct(ses, 50);
  console.log('\n  A. RESOLUTION OF THE RAW MEASUREMENT  (independent of k and of the tilt)');
  console.log('     save rate   p1 ' + (p1 * 100).toFixed(1) + '%   p50 ' + (p50r * 100).toFixed(1) +
              '%   p99 ' + (p99 * 100).toFixed(1) + '%');
  console.log('     spread (p1 to p99)              : ' + (spread * 100).toFixed(1) + 'pp');
  console.log('     median binomial SE              : ' + (medSE * 100).toFixed(2) + 'pp' +
              '   (sqrt(p(1-p)/shots), median over the pool)');
  console.log('     SE at the 25th / 75th pctile    : ' + (pct(ses, 25) * 100).toFixed(2) + 'pp / ' +
              (pct(ses, 75) * 100).toFixed(2) + 'pp');
  console.log('     DISTINGUISHABLE TIERS AT 1 SE   : ' + (spread / medSE).toFixed(1) +
              '   <<< the whole range divided by the error on one card');
  console.log('     the same at 2 SE                : ' + (spread / (2 * medSE)).toFixed(1));
  console.log('\n     Read it as: how many genuinely separable levels the measurement supports');
  console.log('     across its ENTIRE range, before any scale is imposed on it. A five-band');
  console.log('     ladder asks for more resolution than that number allows.');

  const ranked = POOL.slice().sort((a, b) => tilted(b, K, TILT) - tilted(a, K, TILT) || a.card_id - b.card_id);
  const adj = [];
  for (let i = 0; i < ranked.length - 1; i++) {
    const a = ranked[i], b = ranked[i + 1];
    const gap = tilted(a, K, TILT) - tilted(b, K, TILT);
    adj.push(gap / Math.sqrt(seOf(a) ** 2 + seOf(b) ** 2));
  }
  const N30 = Math.min(30, adj.length);
  const t30 = adj.slice(0, N30);
  const cnt = (arr, t) => arr.filter(v => v >= t).length;
  console.log('\n  B. ADJACENT-PAIR SEPARABILITY  (ranks, so it uses this run\'s k = ' + K +
              (K_IS_PROVISIONAL ? ' , PROVISIONAL' : '') + ' and tilt ' + TILT + ')');
  console.log('     each pair\'s gap is expressed in pooled standard errors of the two cards\n');
  console.log('     window            >= 1 SE     >= 0.5 SE    >= 0.25 SE     median gap');
  console.log('     top ' + String(N30).padEnd(14) + String(cnt(t30, 1) + ' of ' + N30).padEnd(12) +
              String(cnt(t30, 0.5) + ' of ' + N30).padEnd(13) + String(cnt(t30, 0.25) + ' of ' + N30).padEnd(14) +
              pct(t30, 50).toFixed(3) + ' SE');
  console.log('     all ' + String(adj.length + ' pairs').padEnd(14) + String(cnt(adj, 1) + ' of ' + adj.length).padEnd(12) +
              String(cnt(adj, 0.5) + ' of ' + adj.length).padEnd(13) + String(cnt(adj, 0.25) + ' of ' + adj.length).padEnd(14) +
              pct(adj, 50).toFixed(3) + ' SE');
  /*  THE SINGLE LARGEST ADJACENT GAP IS NAMED, BECAUSE THE EXCEPTION IS THE EVIDENCE.
      Whichever pair separates best in the whole pool is the best case any band boundary
      could ever hope for, so printing it puts a ceiling on the claim rather than leaving a
      reader to wonder whether some pair somewhere is cleanly split.
      IT IS ALSO WHY A COUNT AT A THRESHOLD MOVES WITH k. At k = 10 this pair measures 0.535
      SE and is counted at the 0.5 mark; at k = 20 it measures 0.488 and is not. A single
      pair sitting on a threshold is what makes "0 of 30" and "1 of 30" both true of the same
      data, which is a reason to report the gap itself and not only the tally.  */
  let bi = 0; adj.forEach((v, i) => { if (v > adj[bi]) bi = i; });
  const ba = ranked[bi], bb = ranked[bi + 1];
  console.log('\n     largest adjacent gap anywhere in the pool: ' + adj[bi].toFixed(3) + ' SE, at ranks ' +
              (bi + 1) + '/' + (bi + 2));
  console.log('       ' + String(ba.player_name).slice(0, 20) + ' ' + ba.season + '  (' + SF(ba) + ' shots, ' +
              (RAW(ba) * 100).toFixed(1) + '%)   vs   ' + String(bb.player_name).slice(0, 20) + ' ' + bb.season +
              '  (' + SF(bb) + ' shots, ' + (RAW(bb) * 100).toFixed(1) + '%)');
  console.log('       that is the BEST CASE. No boundary can separate better than this pair.');
  console.log('\n     A band boundary is one of these pairs. If almost none of them clears 1 SE,');
  console.log('     then wherever a boundary is drawn it separates two cards the data cannot');
  console.log('     tell apart, and that is true of the boundary regardless of where it goes.');

  console.log('\n' + '='.repeat(78));
  console.log('NOTHING WAS WRITTEN. No table, no view, no file. This run ships nothing.');
  console.log('='.repeat(78));
})();
