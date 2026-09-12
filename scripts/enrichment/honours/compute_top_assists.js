// READ-ONLY: compute top-assists (and max-goals) per league-season from player_card_view.
// Validates coverage vs known cases + cross-checks max-goals against written golden_boot rows.
// Stages top_assists_prepared.csv. NO DB writes.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const OUT = process.argv[2];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LEAGUES = ['LL', 'PL', 'SA', 'BL', 'L1', 'PRT', 'ERE', 'BPL', 'TR'];
const SEASONS = []; for (let y = 2010; y <= 2025; y++) SEASONS.push(y);
const esc = v => { v = (v == null) ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

(async () => {
  // 1. pull all cards per league (all seasons), aggregate by (season_year, api_player_id)
  // agg key -> {api, name, teams:Set, a:sumAssists, g:sumGoals}
  const agg = new Map(); // `${lc}|${sy}|${api}` -> {...}
  for (const lc of LEAGUES) {
    let from = 0;
    while (true) {
      const { data, error } = await sb.from('player_card_view')
        .select('api_player_id, player_name, team_name, season_year, assists, goals, league_code')
        .eq('league_code', lc).gte('season_year', 2010).lte('season_year', 2025).range(from, from + 999);
      if (error) { console.error('read err ' + lc + ': ' + error.message); process.exit(1); }
      for (const r of (data || [])) {
        const k = lc + '|' + r.season_year + '|' + r.api_player_id;
        if (!agg.has(k)) agg.set(k, { lc, sy: r.season_year, api: r.api_player_id, name: r.player_name, teams: new Set(), a: 0, g: 0, aKnown: false, gKnown: false });
        const o = agg.get(k); o.teams.add(r.team_name);
        /*  NR IS NOT ZERO. This used to read `o.a += (r.assists == null ? 0 : r.assists)`,
            which scored an UNRECORDED season as a zero-assist season and let the max of a
            handful of populated cards stand as the league leader. Assists are 99%+ null
            before 2015, so that is how Van Persie held PL top_assists for 2011/12 on 9,
            picked from the three populated cards in a 390-card league-season.
            Nulls are now EXCLUDED: a player enters the ranking only if at least one of his
            rows for that league-season carries a real assist figure. */
        if (r.assists != null) { o.a += r.assists; o.aKnown = true; }
        if (r.goals   != null) { o.g += r.goals;   o.gKnown = true; }
      }
      if (!data || data.length < 1000) break; from += 1000;
    }
  }

  // 1b. COVERAGE per league-season, measured on CARDS not on aggregated players.
  //     This is the gate. See MIN_COVERAGE below.
  const cover = new Map();   // `${lc}|${sy}` -> {tot, aPop, gPop}
  for (const o of agg.values()) {
    const k = o.lc + '|' + o.sy;
    if (!cover.has(k)) cover.set(k, { tot: 0, aPop: 0, gPop: 0 });
    const c = cover.get(k); c.tot++; if (o.aKnown) c.aPop++; if (o.gKnown) c.gPop++;
  }

  /*  THE GATE IS COVERAGE, NOT VALUE, AND THE BAR SITS IN A MEASURED EMPTY GAP.
      The old guard printed a league-season as suspect when the winning VALUE was < 9.
      Van Persie's value was exactly 9, so the worst row on the platform passed by one,
      and lowering the threshold would only be the same guess one notch down.
      Measured over all 120 written rows on 2026-09-12, coverage share splits cleanly:
        10 rows at 0.5% to 1.9%   <- every one of them an artefact
         0 rows between 1.9% and 45.0%
        13 rows at 45% to 52%, then the bulk at 50-70%, and 21 rows above 90%.
      A healthy league-season is only ~50-70% populated (the importer's 300-minute floor
      keeps the tail out), so a high bar would refuse legitimate seasons. 0.25 is the
      MIDPOINT OF AN EMPTY REGION: anything from ~0.05 to ~0.44 refuses exactly the same
      ten rows, which is what makes it robust rather than tuned.  */
  const MIN_COVERAGE = 0.25;
  const covShare = (k, kind) => { const c = cover.get(k); return (!c || !c.tot) ? 0 : (kind === 'a' ? c.aPop : c.gPop) / c.tot; };

  // 2. per league-season: max assists, max goals
  const topA = new Map(), topG = new Map(); // `${lc}|${sy}` -> {name, api, val, teams, ties:[]}
  for (const o of agg.values()) {
    const k = o.lc + '|' + o.sy;
    for (const [store, metric, known] of [[topA, 'a', 'aKnown'], [topG, 'g', 'gKnown']]) {
      if (!o[known]) continue;            // a player with NO recorded figure is not in the ranking
      const cur = store.get(k);
      if (!cur || o[metric] > cur.val) store.set(k, { name: o.name, api: o.api, val: o[metric], team: [...o.teams].join('+'), ties: [] });
      else if (cur && o[metric] === cur.val && o[metric] > 0) cur.ties.push(o.name);
    }
  }

  // 3. golden_boot rows already written
  const gb = new Map(); // `${lc}|${sy}` -> [{name, api, goals}]
  const { data: gbRows } = await sb.from('honours').select('league_code, season_year, player_name, api_player_id, goals').eq('honour_type', 'golden_boot');
  (gbRows || []).forEach(r => { const k = r.league_code + '|' + r.season_year; if (!gb.has(k)) gb.set(k, []); gb.get(k).push(r); });

  // ---- VALIDATION SAMPLES ----
  const show = (lc, sy, label) => { const t = topA.get(lc + '|' + sy); console.error('  ' + label.padEnd(22) + (t ? t.name + '  ' + t.val + ' assists  (api ' + t.api + ', ' + t.team + ')' + (t.ties.length ? '  [ties: ' + t.ties.join(', ') + ']' : '') : 'NO DATA')); };
  console.error('=== VALIDATION: top-assist samples ===');
  show('PL', 2019, 'PL 2019/20'); console.error('    (expect De Bruyne ~20)');
  show('LL', 2011, 'LL 2011/12'); console.error('    (expect Messi region)');
  show('SA', 2024, 'SA 2024/25'); show('SA', 2023, 'SA 2023/24'); show('SA', 2022, 'SA 2022/23');

  // ---- THE COVERAGE GATE: league-seasons we refuse to resolve ----
  console.error('\n=== UNRESOLVED: league-seasons below the ' + (MIN_COVERAGE * 100) + '% assist-coverage bar ===');
  console.error('    (these are NOT written. The leader is unknown to us, which is not the same as absent.)');
  let refused = 0;
  for (const lc of LEAGUES) for (const sy of SEASONS) {
    const k = lc + '|' + sy, t = topA.get(k), c = cover.get(k);
    if (!c || !c.tot) { console.error('  ' + lc + ' ' + sy + ': NO CARDS'); refused++; continue; }
    const sh = covShare(k, 'a');
    if (sh < MIN_COVERAGE) { console.error('  ' + lc + ' ' + sy + ': UNRESOLVED , only ' + c.aPop + ' of ' + c.tot + ' cards carry an assist figure (' + (sh * 100).toFixed(1) + '%)' + (t ? ', would have written ' + t.name + ' on ' + t.val : '')); refused++; }
  }
  if (!refused) console.error('  none , every league-season clears the coverage bar');

  // ---- CROSS-CHECK: computed max-goals vs golden_boot ----
  console.error('\n=== GOLDEN_BOOT cross-check (computed max-goals vs written golden_boot) ===');
  let match = 0, mism = 0; const mismatches = [];
  for (const [k, entries] of gb.entries()) {
    const t = topG.get(k);
    const [lc, sy] = k.split('|');
    const apiMatch = t && entries.some(e => e.api_player_id === t.api);
    const goalMatch = t && entries.some(e => e.goals != null && e.goals === t.val);
    if (apiMatch) match++;
    else { mism++; mismatches.push('  ' + lc + ' ' + sy + ': golden_boot [' + entries.map(e => e.player_name + ' ' + (e.goals == null ? '?' : e.goals)).join(' / ') + ']  vs OUR max [' + (t ? t.name + ' ' + t.val : 'NO DATA') + ']' + (goalMatch ? '  (goal-count matches, api differs)' : '')); }
  }
  console.error('  api matches: ' + match + ' / ' + (match + mism) + '   mismatches: ' + mism);
  mismatches.forEach(m => console.error(m));

  // ---- stage prepared top_assists rows (max>0 only) ----
  const cols = ['honour_type', 'season_year', 'league_code', 'api_player_id', 'player_name', 'assists', 'source'];
  const prepared = [];
  let gated = 0;
  for (const lc of LEAGUES) for (const sy of SEASONS) {
    const k = lc + '|' + sy, t = topA.get(k);
    if (!t || t.val <= 0) continue;
    if (covShare(k, 'a') < MIN_COVERAGE) { gated++; continue; }   // THE GATE, applied to the write
    prepared.push({ honour_type: 'top_assists', season_year: sy, league_code: lc, api_player_id: t.api, player_name: t.name, assists: t.val, source: 'computed' });
  }
  console.error('  withheld by the coverage gate: ' + gated + ' league-season(s)');
  fs.writeFileSync(OUT, [cols.join(',')].concat(prepared.map(p => cols.map(c => esc(p[c])).join(','))).join('\n') + '\n');
  console.error('\n=== would write ' + prepared.length + ' top_assists rows (of ' + (LEAGUES.length * SEASONS.length) + ' possible league-seasons) -> ' + OUT + ' ===');
  const tieRows = prepared.filter(p => { const t = topA.get(p.league_code + '|' + p.season_year); return t && t.ties.length; }).length;
  console.error('  league-seasons with tied leaders (eyeball): ' + tieRows);
})();
