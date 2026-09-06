// WRITE wc_prepared.csv -> honours (honour_type='world_cup_winner'). Aborts if already present.
// Player-level accolade: NO league_code, NO team_name; country in honour_context.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
function parseCSV(text) { const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length); const head = lines[0].split(','); return lines.slice(1).map(line => { const cells = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else { if (c === '"') q = true; else if (c === ',') { cells.push(cur); cur = ''; } else cur += c; } } cells.push(cur); const o = {}; head.forEach((h, i) => o[h] = cells[i]); return o; }); }
(async () => {
  const rows = parseCSV(fs.readFileSync(IN, 'utf8'));
  console.error('prepared WC rows: ' + rows.length);
  const { count: existing } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'world_cup_winner');
  if (existing) { console.error('ABORT: ' + existing + ' world_cup_winner rows already present.'); process.exit(1); }
  const recs = rows.map(r => ({ honour_type: r.honour_type, season_year: parseInt(r.season_year, 10), api_player_id: parseInt(r.api_player_id, 10), player_name: r.player_name, honour_context: r.honour_context, source: r.source }));
  let inserted = 0;
  for (let i = 0; i < recs.length; i += 200) { const { data, error } = await sb.from('honours').insert(recs.slice(i, i + 200)).select('id'); if (error) { console.error('INSERT ERR: ' + error.message); process.exit(1); } inserted += data.length; }
  console.error('INSERTED world_cup_winner: ' + inserted);

  const byYr = {};
  const { data: all } = await sb.from('honours').select('season_year').eq('honour_type', 'world_cup_winner');
  all.forEach(r => byYr[r.season_year] = (byYr[r.season_year] || 0) + 1);
  console.error('by tournament: ' + JSON.stringify(byYr));
  // spot-checks
  const sc = async (pat, yr) => { const { data } = await sb.from('honours').select('player_name, season_year, honour_context, api_player_id, league_code, team_name').eq('honour_type', 'world_cup_winner').ilike('player_name', pat).eq('season_year', yr); return data.map(d => d.player_name + ' -> ' + d.season_year + ' ' + d.honour_context + ' (api ' + d.api_player_id + ', league=' + (d.league_code || 'NULL') + ', team=' + (d.team_name || 'NULL') + ')'); };
  console.error('\nMessi 2022: ' + (await sc('%messi%', 2022)).join('; '));
  console.error('Iniesta 2010: ' + (await sc('%iniesta%', 2010)).join('; '));
  console.error('Xavi 2010: ' + (await sc('xavi', 2010)).join('; '));
  console.error('Mbappé 2018: ' + (await sc('%mbapp%', 2018)).join('; '));
  const { count: totWC } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', 'world_cup_winner');
  const { count: totAll } = await sb.from('honours').select('*', { count: 'exact', head: true });
  console.error('\nhonours now: world_cup_winner=' + totWC + ', ALL=' + totAll);
})();
