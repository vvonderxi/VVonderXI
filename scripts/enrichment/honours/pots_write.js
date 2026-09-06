// WRITE pots_prepared.csv -> honours (honour_type='player_of_season'). Aborts if already present.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length); const head = lines[0].split(',');
  return lines.slice(1).map(line => { const cells = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else { if (c === '"') q = true; else if (c === ',') { cells.push(cur); cur = ''; } else cur += c; } } cells.push(cur); const o = {}; head.forEach((h, i) => o[h] = cells[i]); return o; });
}
const s2n = v => (v == null || v === '') ? null : v;
const s2i = v => (v == null || v === '') ? null : parseInt(v, 10);
(async () => {
  const rows = parseCSV(fs.readFileSync(IN, 'utf8'));
  console.error('prepared POTS rows: ' + rows.length);
  const { count: existing } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'player_of_season');
  if (existing) { console.error('ABORT: ' + existing + ' player_of_season rows already present.'); process.exit(1); }
  const recs = rows.map(r => ({ honour_type: r.honour_type, season_year: s2i(r.season_year), league_code: s2n(r.league_code), api_player_id: s2i(r.api_player_id), player_name: s2n(r.player_name), honour_context: s2n(r.honour_context), source: r.source }));
  let inserted = 0;
  for (let i = 0; i < recs.length; i += 200) { const { data, error } = await sb.from('honours').insert(recs.slice(i, i + 200)).select('id'); if (error) { console.error('INSERT ERR: ' + error.message); process.exit(1); } inserted += data.length; }
  console.error('INSERTED player_of_season: ' + inserted);

  // spot-checks
  const { data: messi } = await sb.from('honours').select('season_year').eq('honour_type', 'player_of_season').eq('league_code', 'LL').ilike('player_name', '%messi%').order('season_year');
  console.error('\nMessi La Liga POTS: ' + messi.length + ' -> ' + messi.map(m => m.season_year).join(', '));
  const { data: mbappe } = await sb.from('honours').select('season_year, api_player_id').eq('honour_type', 'player_of_season').eq('league_code', 'L1').ilike('player_name', '%mbapp%').order('season_year');
  console.error('Mbappé Ligue 1 POTS: ' + mbappe.length + ' -> ' + mbappe.map(m => m.season_year).join(', ') + ' (api ' + [...new Set(mbappe.map(m => m.api_player_id))].join(',') + ')');
  const { count: kroos } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'player_of_season').ilike('player_name', '%kroos%');
  const { count: bl17 } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'player_of_season').eq('league_code', 'BL').eq('season_year', 2017);
  console.error('Kroos POTS rows: ' + kroos + '  | BL 2017/18 POTS rows: ' + bl17 + '  (both 0 expected)');
  const { count: totPots } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'player_of_season');
  const { count: totAll } = await sb.from('honours').select('*', { count: 'exact', head: true });
  console.error('\nhonours now: player_of_season=' + totPots + ', ALL=' + totAll);
})();
