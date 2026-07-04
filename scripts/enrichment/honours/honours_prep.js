// READ-ONLY prep for the Tier-1 honours write: schema + team-target + player-table discovery.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // 1. honours table columns , test 'context' vs 'honour_context' + the rest
  console.error('== honours table ==');
  const { data: hAny, error: hErr } = await sb.from('honours').select('*').limit(1);
  if (hErr) console.error('  select * ERROR: ' + hErr.message);
  else console.error('  columns (from a row, [] if empty): ' + (hAny.length ? Object.keys(hAny[0]).join(', ') : '(table empty , testing columns individually)'));
  for (const col of ['context', 'honour_context', 'honour_type', 'season_year', 'league_code', 'team_name', 'api_player_id', 'player_name', 'goals', 'source']) {
    const { error } = await sb.from('honours').select(col).limit(1);
    console.error('  col ' + col.padEnd(15) + (error ? 'MISSING (' + error.message.slice(0, 40) + ')' : 'exists'));
  }
  const { count: hCount } = await sb.from('honours').select('*', { count: 'exact', head: true });
  console.error('  existing row count: ' + hCount);

  // 2. players table , name resolution columns
  console.error('\n== players table ==');
  const { data: pAny, error: pErr } = await sb.from('players').select('*').limit(1);
  if (pErr) console.error('  select * ERROR: ' + pErr.message);
  else console.error('  columns: ' + Object.keys(pAny[0] || {}).join(', '));

  // 3. verify team-mapping targets exist in player_card_view.team_name
  console.error('\n== team-target existence in player_card_view.team_name ==');
  const targets = ['AC Milan', 'Bayern München', 'Inter', 'FC Porto', 'PSV Eindhoven', 'Club Brugge KV',
    'Paris Saint Germain', 'Fenerbahçe', 'Beşiktaş', 'Tottenham', 'Leicester'];
  for (const t of targets) {
    const { count } = await sb.from('player_card_view').select('team_name', { count: 'exact', head: true }).eq('team_name', t);
    console.error('  ' + (count ? 'OK  ' : 'MISS') + '  "' + t + '"  (' + count + ' rows)');
  }
  // Istanbul Basaksehir , find DB form
  const { data: bas } = await sb.from('player_card_view').select('team_name').ilike('team_name', '%ba%aks%').limit(5);
  const basForms = [...new Set((bas || []).map(r => r.team_name))];
  console.error('  Basaksehir DB form(s): ' + (basForms.length ? basForms.join(' | ') : 'NONE FOUND via %ba%aks%'));
})();
