require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
(async () => {
  for (const t of ['player_season_cards', 'player_card_view']) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error) { console.error(t + ' ERROR: ' + error.message); continue; }
    console.error('\n== ' + t + ' columns ==');
    console.error(Object.keys(data[0] || {}).join(', '));
  }
  // does player_season_cards have assists? sample one of our cards via api/season/league
  const { data: d2, error: e2 } = await sb.from('player_season_cards')
    .select('*').eq('api_player_id', 47371).eq('season_year', 2011).limit(3); // Guidetti Feyenoord 1112
  if (e2) console.error('sample err ' + e2.message);
  else console.error('\n== sample Guidetti 2011 rows: ' + d2.length + ' ==\n' + JSON.stringify(d2, null, 1));
})();
