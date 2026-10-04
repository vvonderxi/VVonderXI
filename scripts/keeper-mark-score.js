/*  KEEPER MARK SCORER , SHADOW. SHIPS NOTHING, WRITES NOTHING, PRINTS TABLES.
 *
 *  Implements docs/KEEPER_MARK_PREREGISTRATION.md, which was committed BEFORE any mark
 *  count existed and is BINDING. This file does not choose z, the benchmark definition or
 *  the floor. It reads them out of the pre-registration and reports what they produce.
 *
 *      node scripts/keeper-mark-score.js
 *      node scripts/keeper-mark-score.js --k=10        (prior weight, see K below)
 *      node scripts/keeper-mark-score.js --self-test   (plants failures, proves guards bite)
 *
 *  THE ARITHMETIC CHECK RUNS BEFORE ANY TABLE IS BUILT and exits non-zero on failure.
 *  Two of the five earlier design versions died of an UNCHECKED CONVERSION, so units are
 *  asserted rather than assumed: every rate and every standard error in this file is a
 *  PROPORTION in [0,1], never a percentage point. A single 100x slip in either turns a
 *  z of 3.3 into 0.033 or 330 and the mark count into 0 or everything.
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SELF_TEST = process.argv.includes('--self-test');
const K_ARG = (process.argv.find(a => a.startsWith('--k=')) || '').split('=')[1];

/*  PRE-REGISTERED CONSTANTS , §1, §3, §4. NOT ARGUMENTS, NOT TUNABLE.
    Changing any of these means editing a file that exists to be older than its results. */
const PREREG = {
  z: 3.3,                 // §1 threshold, per side
  floorFrac: 0.01,        // §3 population floor, fraction of the gated pool
  floorSeasons: 20,       // §3 as evaluated in the pre-reg against a pool of 1,920
  shellSE: 0.5,           // §4 stability shell, in units of the season's own SE
  poolAtWriting: 1920
};
const GATE = { minMinutes: 800, minShots: 60, fromSeason: 2015 };   // the surveyed gate
const TILT = 0.35;        // engine league-tilt strength, for the §5 diagnostic only

/*  k IS NOT PRE-REGISTERED AND IS NOT DECIDABLE FROM THIS DATA. scripts/keeper-shadow-score.js
    swept k from 10 to 500 and found no plateau: churn 0-3 cards, Kendall tau 0.887-0.951,
    moderately unstable everywhere and tight nowhere. k = 10 was the LEAST BAD row and is
    inherited here as an ILLUSTRATION, exactly as that scorer flagged it. Every count below
    therefore carries that provisionality, and Table 1 reports its sensitivity rather than
    hiding it. The engine's 380 is a MINUTES constant and k is in SHOTS , not inherited. */
const K = K_ARG ? parseFloat(K_ARG) : 10;
const K_PROVISIONAL = true;

const fail = (code, msg) => { console.error('\nFATAL ' + code + ': ' + msg); process.exit(3); };
const page = async (tbl, cols, key) => {
  let out = [], from = 0;
  for (;;) { const { data, error } = await sb.from(tbl).select(cols).order(key).range(from, from + 999);
    if (error) fail('LOAD', tbl + ': ' + error.message);
    out = out.concat(data); if (data.length < 1000) break; from += 1000; }
  return out;
};
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pad = (s, n) => String(s).padStart(n);

// normal one-sided tail, Abramowitz-Stegun 26.2.17 , used only by the arithmetic check
function tail(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? p : 1 - p;
}

(async () => {
  console.log('KEEPER MARK SCORER , SHADOW. Ships nothing, writes nothing.');
  console.log('Implements docs/KEEPER_MARK_PREREGISTRATION.md (binding, committed before any count).');
  console.log('k = ' + K + (K_PROVISIONAL ? '  [PROVISIONAL , not decidable from this data, see header]' : '') + '\n');

  const mv = await page('player_card_mv',
    'card_id,player_name,season,season_year,league_code,team_name,position,minutes,' +
    'appearances,saves,goals_conceded,rt,league_strength_weight', 'card_id');
  let elw = [], f = 0;
  for (;;) { const { data } = await sb.from('engine_league_weights').select('league_code,season_year,weight').range(f, f + 999);
    elw = elw.concat(data); if (data.length < 1000) break; f += 1000; }
  const W = new Map(); elw.forEach(r => W.set(r.league_code + '|' + r.season_year, r.weight));
  const wtFor = r => { const k = W.get(r.league_code + '|' + r.season_year);
    return k != null ? k : (r.league_strength_weight != null ? r.league_strength_weight : 0.80); };

  // ---- pool, on the surveyed gate ------------------------------------------------------
  const keepers = mv.filter(r => r.position === 'GK' && r.saves != null);
  const SF = r => r.saves + r.goals_conceded;
  const POOL = keepers.filter(r => r.season_year >= GATE.fromSeason && r.minutes >= GATE.minMinutes && SF(r) >= GATE.minShots);

  const p0 = POOL.reduce((a, r) => a + r.saves, 0) / POOL.reduce((a, r) => a + SF(r), 0);
  const stab = (r, k) => (r.saves + k * p0) / (SF(r) + k);          // PROPORTION
  const seOf = r => Math.sqrt(stab(r, K) * (1 - stab(r, K)) / SF(r)); // PROPORTION
  const tiltOf = r => stab(r, K) * (1 - (1 - wtFor(r)) * TILT);

  // =====================================================================================
  // ARITHMETIC CHECK , AGAINST THE PROMISE'S OWN DEFINITIONS, BEFORE ANY TABLE IS READ
  // =====================================================================================
  console.log('='.repeat(78));
  console.log('ARITHMETIC CHECK , reads the pre-registration, not any table');
  console.log('='.repeat(78));
  const A = []; const chk = (code, label, ok, detail) => { A.push({ code, ok });
    console.log('  [' + (ok ? 'PASS' : 'FAIL') + '] ' + code.padEnd(11) + label + (detail !== undefined ? '   ' + JSON.stringify(detail) : '')); };

  const oneSided = tail(PREREG.z);
  const expFalse = oneSided * PREREG.poolAtWriting;
  chk('A1-CEILING', 'z=3.3 gives <= 1 expected false mark per side on the pre-reg pool',
      expFalse <= 1, { tail: +oneSided.toExponential(4), expectedFalsePerSide: +expFalse.toFixed(4) });
  let lo = 0, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (tail(m) > 1 / PREREG.poolAtWriting) lo = m; else hi = m; }
  chk('A2-ROUND  ', 'z=3.3 is the CONSERVATIVE rounding of the exact z, not a loosening',
      PREREG.z >= hi, { exactZ: +hi.toFixed(4), used: PREREG.z });
  chk('A3-FLOOR  ', 'floor = ceil(1% of the pre-reg pool) = 20 seasons',
      Math.ceil(PREREG.floorFrac * PREREG.poolAtWriting) === PREREG.floorSeasons,
      { onePct: PREREG.floorFrac * PREREG.poolAtWriting, stated: PREREG.floorSeasons });

  /*  A4/A5 ARE THE CONVERSION GUARDS. This is what killed two design versions: a rate held
      as a percentage and an SE held as a proportion compare fine in code and are wrong by
      100x. Both are asserted to be proportions on real rows, not on constants. */
  const rateRange = POOL.map(r => stab(r, K));
  chk('A4-UNIT-R ', 'every shrunken rate is a PROPORTION in [0,1], never a percentage',
      Math.min(...rateRange) >= 0 && Math.max(...rateRange) <= 1,
      { min: +Math.min(...rateRange).toFixed(4), max: +Math.max(...rateRange).toFixed(4) });
  const seRange = POOL.map(seOf);
  chk('A5-UNIT-SE', 'every SE is a PROPORTION and plausibly binomial (0 < SE < 0.5)',
      Math.min(...seRange) > 0 && Math.max(...seRange) < 0.5,
      { min: +Math.min(...seRange).toFixed(5), max: +Math.max(...seRange).toFixed(5), median: +med(seRange).toFixed(5) });
  /*  A6 , the same-units assertion stated as a ratio. If a rate were in pp and an SE in
      proportion, a typical |distance| would land in the hundreds. This checks the SCALE of
      the quantity the threshold is applied to, which is the thing z means. */
  const bmProbe = med(POOL.map(r => stab(r, K)));
  const dProbe = POOL.map(r => Math.abs(stab(r, K) - bmProbe) / seOf(r));
  chk('A6-SCALE  ', 'median |distance| is O(1) SEs, so numerator and denominator share units',
      med(dProbe) > 0.05 && med(dProbe) < 5, { medianAbsDistanceSE: +med(dProbe).toFixed(3) });
  if (SELF_TEST) chk('A7-PLANT  ', 'self-test plants a pp/proportion mix and the guard catches it',
      !(Math.max(...POOL.map(r => stab(r, K) * 100)) <= 1), { note: 'rate*100 must FAIL A4' });

  if (A.some(x => !x.ok)) fail('ARITHMETIC', 'A check against the pre-registration failed. No table is printed.');
  console.log('\n  All arithmetic checks pass. Tables follow.\n');

  // =====================================================================================
  const BM = med(POOL.map(r => stab(r, K)));           // §2 benchmark, THIS vintage
  const dist = r => (stab(r, K) - BM) / seOf(r);
  const above = POOL.filter(r => dist(r) > PREREG.z);
  const below = POOL.filter(r => dist(r) < -PREREG.z);
  const floorNow = Math.ceil(PREREG.floorFrac * POOL.length);

  console.log('='.repeat(78));
  console.log('1 , MARK COUNTS AGAINST THE §3 FLOOR');
  console.log('='.repeat(78));
  console.log('  gated pool                 ' + pad(POOL.length, 6));
  console.log('  floor, 1% of pool (ceil)   ' + pad(floorNow, 6) + '   pre-reg states 20 against 1,920');
  console.log('  ABOVE-mark seasons         ' + pad(above.length, 6));
  console.log('  BELOW-mark seasons         ' + pad(below.length, 6));
  console.log('  floor met (above >= floor) ' + pad(above.length >= floorNow ? 'YES' : 'NO', 6));
  if (above.length < floorNow) {
    console.log('\n  §3: "IF THE FLOOR FAILS, FALLBACK C SHIPS. The ceiling in §1 is NOT lowered');
    console.log('  to reach the floor." The threshold is NOT moved by this run.');
  }
  console.log('\n  SENSITIVITY TO k (which is not decidable , see header). Reported so the count');
  console.log('  is not read as firmer than the constant under it:');
  console.log('    k      benchmark   above   below');
  [0, 5, 10, 20, 50, 100, 300].forEach(kk => {
    const b = med(POOL.map(r => stab(r, kk)));
    const se = r => Math.sqrt(stab(r, kk) * (1 - stab(r, kk)) / SF(r));
    const d = r => (stab(r, kk) - b) / se(r);
    console.log('    ' + pad(kk, 4) + pad(b.toFixed(5), 12) + pad(POOL.filter(r => d(r) > PREREG.z).length, 8) +
      pad(POOL.filter(r => d(r) < -PREREG.z).length, 8));
  });

  console.log('\n' + '='.repeat(78));
  console.log('2 , THE MARKED LISTS');
  console.log('='.repeat(78));
  const show = (title, arr, sign) => {
    console.log('\n  ' + title + ' , ' + arr.length + ' season' + (arr.length === 1 ? '' : 's'));
    if (!arr.length) { console.log('    (none)'); return; }
    console.log('    ' + 'player'.padEnd(24) + 'seas  lg   rate     shots    SE      dist(SE)');
    arr.slice().sort((a, b) => sign * (dist(b) - dist(a))).slice(0, 40).forEach(r => {
      console.log('    ' + String(r.player_name || '').slice(0, 23).padEnd(24) +
        String(r.season || r.season_year).padEnd(6) + String(r.league_code || '').padEnd(5) +
        pad(stab(r, K).toFixed(4), 8) + pad(SF(r), 8) + pad(seOf(r).toFixed(5), 9) + pad(dist(r).toFixed(2), 10));
    });
    if (arr.length > 40) console.log('    ... ' + (arr.length - 40) + ' more');
  };
  show('ABOVE the mark', above, 1);
  show('BELOW the mark', below, -1);

  console.log('\n' + '='.repeat(78));
  console.log('3 , SHELL POPULATIONS AT THE §4 DEFINITION (0.5 of the season\'s own SE)');
  console.log('='.repeat(78));
  const shellAt = (bound, sgn) => POOL.filter(r => Math.abs(dist(r) - sgn * PREREG.z) <= PREREG.shellSE);
  const shA = shellAt(PREREG.z, 1), shB = shellAt(PREREG.z, -1);
  console.log('  within 0.5 SE of the ABOVE boundary   ' + pad(shA.length, 5) +
    '   (' + (100 * shA.length / POOL.length).toFixed(2) + '% of pool)');
  console.log('  within 0.5 SE of the BELOW boundary   ' + pad(shB.length, 5) +
    '   (' + (100 * shB.length / POOL.length).toFixed(2) + '% of pool)');
  console.log('  §4: a refresh may flip ONLY seasons inside these shells. A flip outside is a');
  console.log('  TRIGGERED REVIEW, not accepted drift.');

  console.log('\n' + '='.repeat(78));
  console.log('4 , BENCHMARK VALUE AND VINTAGE (§2 requires all three published)');
  console.log('='.repeat(78));
  const yrs = POOL.map(r => r.season_year);
  console.log('  value  (stabilised gated-pool median, shrunken rates)  ' + BM.toFixed(6));
  console.log('  vintage (max season_year in the gated pool)            ' + Math.max(...yrs));
  console.log('  pool    (size the value was computed over)             ' + POOL.length);
  console.log('  computed ' + new Date().toISOString().slice(0, 10) + ' at k = ' + K + ' (provisional)');
  console.log('  pooled prior p0                                       ' + p0.toFixed(6));

  console.log('\n' + '='.repeat(78));
  console.log('5 , TILTED VERSUS UNTILTED MARK COMPOSITION');
  console.log('='.repeat(78));
  console.log('  The pre-reg benchmark is on SHRUNKEN rates, untilted. This is a DIAGNOSTIC,');
  console.log('  not an alternative definition , the tilt is not applied to any mark above.');
  const bmT = med(POOL.map(tiltOf));
  const seT = r => Math.sqrt(tiltOf(r) * (1 - tiltOf(r)) / SF(r));
  const dT = r => (tiltOf(r) - bmT) / seT(r);
  const aboveT = POOL.filter(r => dT(r) > PREREG.z), belowT = POOL.filter(r => dT(r) < -PREREG.z);
  const idsA = new Set(above.map(r => r.card_id)), idsAT = new Set(aboveT.map(r => r.card_id));
  console.log('  untilted  above ' + pad(above.length, 4) + '   below ' + pad(below.length, 4) + '   benchmark ' + BM.toFixed(5));
  console.log('  tilted    above ' + pad(aboveT.length, 4) + '   below ' + pad(belowT.length, 4) + '   benchmark ' + bmT.toFixed(5));
  console.log('  in BOTH above sets      ' + pad([...idsA].filter(x => idsAT.has(x)).length, 4));
  console.log('  untilted only           ' + pad([...idsA].filter(x => !idsAT.has(x)).length, 4));
  console.log('  tilted only             ' + pad([...idsAT].filter(x => !idsA.has(x)).length, 4));

  console.log('\n' + '='.repeat(78));
  console.log('6 , REFRESH SIMULATION , LAST THREE SEASON-CLOSE BENCHMARKS');
  console.log('='.repeat(78));
  console.log('  §2 freezes a vintage per release and refreshes annually at season close.');
  console.log('  Each row recomputes the benchmark over the pool AS IT STOOD at that close,');
  console.log('  then re-marks TODAY\'S pool against it. §4: flips inside the 0.5 SE shell are');
  console.log('  the disclosure working; flips OUTSIDE it are a TRIGGERED REVIEW.\n');
  const closes = [...new Set(yrs)].sort((a, b) => b - a).slice(1, 4).reverse();
  console.log('    vintage  poolThen  benchmark   above  below  flipsVsToday  inShell  OUTSIDE');
  closes.forEach(y => {
    const then = POOL.filter(r => r.season_year <= y);
    const b = med(then.map(r => stab(r, K)));
    const d = r => (stab(r, K) - b) / seOf(r);
    const aboveY = new Set(POOL.filter(r => d(r) > PREREG.z).map(r => r.card_id));
    const belowY = new Set(POOL.filter(r => d(r) < -PREREG.z).map(r => r.card_id));
    let flips = 0, inShell = 0, outside = 0;
    POOL.forEach(r => {
      const nowA = idsA.has(r.card_id), nowB = below.some(x => x.card_id === r.card_id);
      const thenA = aboveY.has(r.card_id), thenB = belowY.has(r.card_id);
      if (nowA !== thenA || nowB !== thenB) { flips++;
        // §4 shell is measured against the season's OWN SE at the boundary it crossed
        const nearAbove = Math.abs(dist(r) - PREREG.z) <= PREREG.shellSE;
        const nearBelow = Math.abs(dist(r) + PREREG.z) <= PREREG.shellSE;
        if (nearAbove || nearBelow) inShell++; else outside++; }
    });
    console.log('    ' + pad(y, 7) + pad(then.length, 10) + pad(b.toFixed(5), 12) +
      pad(aboveY.size, 7) + pad(belowY.size, 7) + pad(flips, 14) + pad(inShell, 9) + pad(outside, 9));
  });
  console.log('\n  Nothing above was written. This scorer ships nothing.');
})();
