require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// accent/punct normaliser mirroring the DB search norm
function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

(async () => {
  console.error('== Basaksehir hunt in player_card_view.team_name ==');
  for (const pat of ['%stanbul%', '%ehir%', '%ba_ak%', '%medipol%']) {
    const { data } = await sb.from('player_card_view').select('team_name').ilike('team_name', pat).limit(10);
    const forms = [...new Set((data || []).map(r => r.team_name))];
    console.error('  ilike ' + pat.padEnd(12) + ' -> ' + (forms.length ? forms.join(' | ') : '(none)'));
  }

  // player-resolution test: recent Ballon d'Or / Golden Boot names, incl. accents + tie forms
  console.error('\n== player resolution test (players.name / full_name -> api_player_id) ==');
  const names = ['Cristiano Ronaldo', 'Lionel Messi', 'Robert Lewandowski', 'Karim Benzema', 'Luka Modric',
    'Mohamed Salah', 'Erling Haaland', 'Ciro Immobile', 'Ousmane Dembele', 'Harry Kane'];
  // pull a working set of players once (paginate name+full_name+api_player_id)
  let all = [], from = 0;
  while (true) {
    const { data, error } = await sb.from('players').select('api_player_id, api_id, name, full_name').range(from, from + 999);
    if (error) { console.error('players read err ' + error.message); break; }
    all = all.concat(data || []);
    if (!data || data.length < 1000) break; from += 1000;
  }
  console.error('  players loaded: ' + all.length);
  const idx = new Map();
  all.forEach(p => { for (const nm of [p.name, p.full_name]) { const k = norm(nm); if (k && !idx.has(k)) idx.set(k, p); } });
  for (const nm of names) {
    const hit = idx.get(norm(nm));
    console.error('  ' + nm.padEnd(22) + (hit ? '-> api_player_id=' + hit.api_player_id + '  (api_id=' + hit.api_id + ', name="' + hit.name + '")' : 'NO MATCH'));
  }
})();
