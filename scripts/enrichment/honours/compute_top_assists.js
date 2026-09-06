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
        if (!agg.has(k)) agg.set(k, { lc, sy: r.season_year, api: r.api_player_id, name: r.player_name, teams: new Set(), a: 0, g: 0 });
        const o = agg.get(k); o.teams.add(r.team_name);
        o.a += (r.assists == null ? 0 : r.assists); o.g += (r.goals == null ? 0 : r.goals);
      }
      if (!data || data.length < 1000) break; from += 1000;
    }
  }

  // 2. per league-season: max assists, max goals
  const topA = new Map(), topG = new Map(); // `${lc}|${sy}` -> {name, api, val, teams, ties:[]}
  for (const o of agg.values()) {
    const k = o.lc + '|' + o.sy;
    for (const [store, metric] of [[topA, 'a'], [topG, 'g']]) {
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

  // ---- COVERAGE: low-max top-assist flags ----
  console.error('\n=== COVERAGE GAPS: league-seasons where max assists < 9 (suspect) ===');
  let low = 0;
  for (const lc of LEAGUES) for (const sy of SEASONS) { const t = topA.get(lc + '|' + sy); if (t && t.val < 9) { console.error('  ' + lc + ' ' + sy + ': max ' + t.val + ' (' + t.name + ')'); low++; } else if (!t) { console.error('  ' + lc + ' ' + sy + ': NO CARDS'); low++; } }
  if (!low) console.error('  none , all league-seasons have a credible (>=9) assist leader');

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
  for (const lc of LEAGUES) for (const sy of SEASONS) { const t = topA.get(lc + '|' + sy); if (t && t.val > 0) prepared.push({ honour_type: 'top_assists', season_year: sy, league_code: lc, api_player_id: t.api, player_name: t.name, assists: t.val, source: 'computed' }); }
  fs.writeFileSync(OUT, [cols.join(',')].concat(prepared.map(p => cols.map(c => esc(p[c])).join(','))).join('\n') + '\n');
  console.error('\n=== would write ' + prepared.length + ' top_assists rows (of ' + (LEAGUES.length * SEASONS.length) + ' possible league-seasons) -> ' + OUT + ' ===');
  const tieRows = prepared.filter(p => { const t = topA.get(p.league_code + '|' + p.season_year); return t && t.ties.length; }).length;
  console.error('  league-seasons with tied leaders (eyeball): ' + tieRows);
})();
