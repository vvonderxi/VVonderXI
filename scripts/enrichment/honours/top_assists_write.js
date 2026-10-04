// Recompute top-assists (ALL tied players) and WRITE to honours (honour_type='top_assists').
// Auto-detects an 'assists' column; falls back to honour_context="N assists". Aborts if already written.
//
// THIS IS THE WRITE PATH. `compute_top_assists.js` is the read-only staging/validation twin, and
// on 2026-09-12 a coverage fix was applied THERE FIRST, to the file that writes nothing. Both
// defects below lived here, in the file that actually inserts. Fix both twins or neither.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LEAGUES = ['LL', 'PL', 'SA', 'BL', 'L1', 'PRT', 'ERE', 'BPL', 'TR'];

/*  THE OLD GATE WAS `MIN = 9` ON THE VALUE, AND IT IS HOW VAN PERSIE GOT PL 2011/12 ON 9 ASSISTS
    OUT OF THREE POPULATED CARDS IN A 390-CARD LEAGUE-SEASON. Worse, it was structurally unable to
    catch itself: this file WROTE only when the max was >= 9, while the staging twin WARNED only
    when the max was < 9, so no written row could ever be flagged. The guard and the gate were the
    same number pointing opposite ways, and the overlap was empty.
    THE GATE IS NOW COVERAGE. See compute_top_assists.js for the measurement: coverage share
    splits into ten artefact rows at 0.5-1.9% and nothing at all until 45%, so any bar from ~5%
    to ~44% behaves identically and 0.25 is the midpoint of an empty region. A healthy
    league-season is only 50-70% populated (the importer's 300-minute floor), so DO NOT RAISE
    THIS: at 0.60 the gate refuses 78 of 120 correct rows. */
const MIN_COVERAGE = 0.25;

(async () => {
  // detect assists column
  const { error: aErr } = await sb.from('honours').select('assists').limit(1);
  const hasAssists = !aErr;
  console.error("honours.assists column: " + (hasAssists ? 'exists -> writing to it' : 'MISSING -> routing count into honour_context (\"N assists\")'));

  // guard: already written?
  const { count: existing } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'top_assists');
  if (existing) { console.error('ABORT: ' + existing + ' top_assists rows already present.'); process.exit(1); }

  // aggregate assists per (league, season, player)
  const agg = new Map();
  for (const lc of LEAGUES) {
    let from = 0;
    while (true) {
      const { data, error } = await sb.from('player_card_view').select('api_player_id, player_name, season_year, assists').eq('league_code', lc).gte('season_year', 2010).lte('season_year', 2025).range(from, from + 999);
      if (error) { console.error('read err ' + error.message); process.exit(1); }
      for (const r of (data || [])) { const k = lc + '|' + r.season_year + '|' + r.api_player_id; if (!agg.has(k)) agg.set(k, { lc, sy: r.season_year, api: r.api_player_id, name: r.player_name, a: 0, known: false });
        /* NR IS NOT ZERO. This read `a += (r.assists == null ? 0 : r.assists)`, which scored an
           UNRECORDED season as a zero-assist season and let a handful of populated cards decide
           a league. A player now enters the ranking only if he has a real figure. */
        if (r.assists != null) { agg.get(k).a += r.assists; agg.get(k).known = true; } }
      if (!data || data.length < 1000) break; from += 1000;
    }
  }

  // coverage per league-season, measured on players carrying a real figure
  const cover = new Map();
  for (const o of agg.values()) { const k = o.lc + '|' + o.sy; if (!cover.has(k)) cover.set(k, { tot: 0, pop: 0 }); const c = cover.get(k); c.tot++; if (o.known) c.pop++; }
  const covOK = k => { const c = cover.get(k); return !!c && c.tot > 0 && (c.pop / c.tot) >= MIN_COVERAGE; };

  // per league-season: max among players WITH a figure, then ALL players at max (ties are real)
  const maxByLS = new Map();
  for (const o of agg.values()) { if (!o.known) continue; const k = o.lc + '|' + o.sy; if (!maxByLS.has(k) || o.a > maxByLS.get(k)) maxByLS.set(k, o.a); }
  const recs = [];
  const byLS = new Map();
  let gated = 0; const gatedSeen = new Set();
  for (const o of agg.values()) {
    const k = o.lc + '|' + o.sy; const mx = maxByLS.get(k);
    if (!covOK(k)) { if (!gatedSeen.has(k)) { gatedSeen.add(k); gated++; } continue; }   // THE GATE
    if (o.known && mx > 0 && o.a === mx) {
      const rec = { honour_type: 'top_assists', season_year: o.sy, league_code: o.lc, api_player_id: o.api, player_name: o.name, source: 'computed' };
      if (hasAssists) rec.assists = o.a; else rec.honour_context = o.a + ' assists';
      recs.push(rec); byLS.set(k, (byLS.get(k) || 0) + 1);
    }
  }
  const leagueSeasons = byLS.size, tieLS = [...byLS.values()].filter(v => v > 1).length;
  console.error('league-seasons written: ' + leagueSeasons + '  | total rows (incl ties): ' + recs.length + '  | tie league-seasons: ' + tieLS);
  console.error('league-seasons WITHHELD by the ' + (MIN_COVERAGE * 100) + '% coverage gate: ' + gated + '  (unresolved, not absent)');

  // write
  let inserted = 0;
  for (let i = 0; i < recs.length; i += 200) { const { data, error } = await sb.from('honours').insert(recs.slice(i, i + 200)).select('id'); if (error) { console.error('INSERT ERR: ' + error.message); process.exit(1); } inserted += data.length; }
  console.error('INSERTED top_assists rows: ' + inserted);

  // ---- spot-checks ----
  const valField = hasAssists ? 'assists' : 'honour_context';
  const fmt = r => r.player_name + ' = ' + (hasAssists ? r.assists : r.honour_context) + '  (api ' + r.api_player_id + ')';
  console.error('\n=== spot-check: De Bruyne PL 2019/20 (expect 20) ===');
  const { data: kdb } = await sb.from('honours').select('player_name, api_player_id, ' + valField).eq('honour_type', 'top_assists').eq('league_code', 'PL').eq('season_year', 2019);
  kdb.forEach(r => console.error('  ' + fmt(r)));
  console.error('\n=== spot-check: Messi La Liga top_assists rows ===');
  const { data: messi } = await sb.from('honours').select('season_year, player_name, api_player_id, ' + valField).eq('honour_type', 'top_assists').eq('league_code', 'LL').ilike('player_name', '%messi%').order('season_year');
  messi.forEach(r => console.error('  LL ' + r.season_year + ': ' + fmt(r)));
  console.error('\n=== spot-check: a TIE (SA 2023/24, expect Leão + Dybala both 9) ===');
  const { data: tie } = await sb.from('honours').select('player_name, api_player_id, ' + valField).eq('honour_type', 'top_assists').eq('league_code', 'SA').eq('season_year', 2023);
  tie.forEach(r => console.error('  ' + fmt(r)));

  const { count: totalTA } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'top_assists');
  const { count: totalAll } = await sb.from('honours').select('*', { count: 'exact', head: true });
  console.error('\n=== honours table now: top_assists=' + totalTA + ', ALL honour rows=' + totalAll + ' ===');
})();
