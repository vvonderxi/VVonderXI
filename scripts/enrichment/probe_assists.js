// READ-ONLY probe: find where assists live + current fill state for the 34 cards.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const IDS = [172746,172351,169346,169768,174592,168807,156662,180202,180524,181398,169343,170986,170205,172521,182248,184247,169280,173082,161304,163158,174565,166668,167554,167555,180654,183949,163392,160409,175513,175841,176219,176597,177013,179772];

(async () => {
  // probe candidate base table player_season_cards
  const { data, error } = await sb.from('player_season_cards')
    .select('card_id, api_player_id, season_year, league_code, goals, assists, position')
    .in('card_id', IDS).order('card_id');
  if (error) { console.error('player_season_cards probe ERROR:', error.message); process.exit(1); }
  console.error('player_season_cards rows found for the 34 card_ids: ' + data.length);
  console.error('card_id | goals | assists | pos | api|season|league');
  data.forEach(r => console.error('  ' + String(r.card_id).padEnd(7) + ' g=' + String(r.goals).padEnd(3) + ' a=' + String(r.assists == null ? 'NR' : r.assists).padEnd(4) + ' pos=' + String(r.position).padEnd(5) + ' ' + r.api_player_id + '|' + r.season_year + '|' + r.league_code));
  const nrCount = data.filter(r => r.assists == null).length;
  console.error('assists currently NR (null): ' + nrCount + ' of ' + data.length);
})();
