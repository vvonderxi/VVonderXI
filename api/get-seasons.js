// /api/get-seasons.js — VVonderXI BIGGER
// Returns all cached season cards for a specific player by api_player_id
// Table change: player_seasons → player_season_cards

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { api_id } = req.query;
  if (!api_id) return res.status(400).json({ error: 'api_id required' });

  try {
    const { data: cards, error } = await supabase
      .from('player_season_cards')
      .select('*')
      .eq('api_player_id', parseInt(api_id))
      .order('season_year', { ascending: false });

    if (error) throw error;

    // Format into VVonderXI season object: { '2425': { pos, lg, g, a, rt, age, club } }
    const seasons = {};
    (cards || []).forEach(r => {
      if (r.season?.length === 4) {
        seasons[r.season] = {
          pos: r.position,
          lg: r.league_code,
          g: r.goals || 0,
          a: r.assists || 0,
          rt: r.rt || 75,
          age: r.age,
          club: r.team_name || ''
        };
      }
    });

    return res.json({ seasons, cards: cards || [], source: 'cache' });
  } catch (err) {
    console.error('get-seasons error:', err);
    return res.status(500).json({ error: err.message });
  }
};
