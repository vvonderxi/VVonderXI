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
    /*  FALLBACK C , NO KEEPER SCALAR LEAVES THIS ENDPOINT.
        docs/KEEPER_FALLBACK_C_SPEC.md, THE INVARIANT: "No field, column, EXPORT, sort key,
        or prose construction anywhere in the platform reduces a keeper season's quality to
        a single number." This is a public, deployed JSON endpoint, so it is an export.

        BOTH PAYLOADS ARE STRIPPED, not just the pretty one. The `seasons` map is the
        obvious place; `cards` is the raw matview rows and carried rt straight through,
        which is the half that would have survived a fix aimed only at the first.

        AND NOTE WHAT WAS ALREADY WRONG HERE: `rt: r.rt || 75` MANUFACTURED a 75 for any
        null rt. For a keeper that invented the cap; for anyone it turned "not scored" into
        a number. Nulls now stay null.  */
    const isGK = r => r.position === 'GK' || r.position_pool === 'GK';
    const seasons = {};
    (cards || []).forEach(r => {
      if (r.season?.length === 4) {
        const o = {
          pos: r.position,
          lg: r.league_code,
          g: r.goals || 0,
          a: r.assists || 0,
          age: r.age,
          club: r.team_name || ''
        };
        if (!isGK(r)) o.rt = r.rt != null ? r.rt : null;
        seasons[r.season] = o;
      }
    });

    const safeCards = (cards || []).map(r => {
      if (!isGK(r)) return r;
      const { rt, ...rest } = r;      // the keeper's scalar does not leave the building
      return rest;
    });

    return res.json({ seasons, cards: safeCards, source: 'cache' });
  } catch (err) {
    console.error('get-seasons error:', err);
    return res.status(500).json({ error: err.message });
  }
};
