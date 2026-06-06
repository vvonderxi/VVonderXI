// /api/get-seasons.js
// Returns all cached seasons for a specific player by api_id
// Also fetches any missing seasons from API and adds them to cache

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { api_id } = req.query;
  if (!api_id) return res.status(400).json({ error: 'api_id required' });

  try {
    const { data: seasons, error } = await supabase
      .from('player_seasons')
      .select('*')
      .eq('api_id', parseInt(api_id))
      .order('season_year', { ascending: false });

    if (error) throw error;

    return res.json({ seasons: seasons || [], source: 'cache' });
  } catch (err) {
    console.error('get-seasons error:', err);
    return res.status(500).json({ error: err.message });
  }
};
