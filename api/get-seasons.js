// /api/get-seasons.js , VVonderXI BIGGER
// Returns all cached season cards for a specific player by api_player_id
// Table change: player_seasons → player_season_cards

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  /*  VALIDATE BEFORE COERCING. `parseInt` has no radix here and answers NaN on junk, which
      reached PostgREST as a filter value and came back as a 500 , a client error reported as
      ours. `parseInt('12abc')` is also 12, so a malformed id silently became a valid one. */
  const { api_id } = req.query;
  if (!api_id) return res.status(400).json({ error: 'api_id required' });
  const apiId = Number(api_id);
  if (!Number.isInteger(apiId)) return res.status(400).json({ error: 'api_id must be an integer' });

  try {
    const { data: cards, error } = await supabase
      .from('player_season_cards')
      .select('*')
      .eq('api_player_id', apiId)
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
          /*  NR, NEVER 0 , FIXED 2026-09-15, AND THE COMMENT ABOVE ALREADY KNEW.
              The note beside `rt` above celebrates removing exactly this defect ("`rt: r.rt
              || 75` MANUFACTURED a 75 for any null rt... Nulls now stay null") and then these
              two lines, four rows below it, went on coalescing. A rule fixed on one field and
              not applied to its siblings in the same object is the failure this platform keeps
              recording , the fix that stops at the field that complained.
              THE SCALE IS THE ARGUMENT: 3,061 rows carry a null `goals` and 31,040 a null
              `assists`, and this is a PUBLIC JSON ENDPOINT, so it was asserting a recorded
              zero for 31,040 seasons where nothing was recorded at all. Machine-readable, so
              a consumer has no prose to warn it. */
          g: r.goals != null ? r.goals : null,
          a: r.assists != null ? r.assists : null,
          age: r.age,
          club: r.team_name || ''
        };
        if (!isGK(r)) o.rt = r.rt != null ? r.rt : null;
        seasons[r.season] = o;
      }
    });

    /*  THE KEEPER STRIP IS A DENYLIST OVER `select('*')`, SO A NEW COLUMN SHIPS PUBLIC BY
        DEFAULT , LOGGED 2026-09-15, NOT CHANGED. This endpoint exports all 42 columns of
        `player_season_cards` verbatim and then removes `rt` for a keeper. The Fallback C
        invariant it cites forbids ANY field reducing a keeper season to one number, and the
        only thing enforcing that here is a hardcoded key name. Add a keeper scalar to the
        table , a save-rate score, a percentile , and it leaves this endpoint the day it is
        created, with nothing to say so. An explicit column list would invert the default. */
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
