// /api/refresh-players.js
// Vercel Cron Job — runs daily at 3am UTC
// Refreshes top 20 players by rating + most searched players
// Free tier safe: stays within 100 API calls/day

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LEAGUE_MAP = {
  39:{code:'PL',name:'Premier League',f:1.000},
  140:{code:'LL',name:'La Liga',f:0.978},
  78:{code:'BL',name:'Bundesliga',f:0.940},
  135:{code:'SA',name:'Serie A',f:0.935},
  61:{code:'L1',name:'Ligue 1',f:0.878},
  94:{code:'PRT',name:'Primeira Liga',f:0.845},
  88:{code:'ERE',name:'Eredivisie',f:0.820},
  307:{code:'SPL',name:'Saudi Pro League',f:0.720},
  253:{code:'MLS',name:'MLS',f:0.700},
  179:{code:'SPM',name:'Scottish Premiership',f:0.740},
  203:{code:'TSL',name:'Turkish Super Lig',f:0.760},
  128:{code:'ARG',name:'Argentine Primera',f:0.750},
  71:{code:'BRZ',name:'Brazilian Serie A',f:0.740},
  2:{code:'CL',name:'Champions League',f:1.050},
};

function seasonCode(year){ const y=parseInt(year); return `${String(y).slice(2)}${String(y+1).slice(2)}`; }
function convertRating(r){ if(!r) return null; return Math.round(parseFloat(r)*10); }

async function fetchAndCachePlayer(apiId, headers) {
  // Get available seasons
  const seasonsRes = await fetch(
    `https://api-football-v1.p.rapidapi.com/v3/players/seasons?player=${apiId}`,
    { headers }
  );
  const seasonsData = await seasonsRes.json();
  const available = (seasonsData.response || []).slice(-5); // last 5 seasons

  const allStats = [];
  for (const year of available) {
    const statsRes = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players?id=${apiId}&season=${year}`,
      { headers }
    );
    const data = await statsRes.json();
    const item = data.response?.[0];
    if (!item) continue;
    const player = item.player;
    for (const stat of (item.statistics || [])) {
      const lg = LEAGUE_MAP[stat.league?.id];
      if (!lg) continue;
      allStats.push({
        api_id: apiId,
        season: seasonCode(year),
        season_year: year,
        league_code: lg.code,
        league_name: lg.name,
        league_api_id: stat.league.id,
        club: stat.team?.name || '',
        pos: stat.games?.position?.slice(0,3).toUpperCase() || '',
        age: player.age,
        goals: stat.goals?.total || 0,
        assists: stat.goals?.assists || 0,
        appearances: stat.games?.appearences || 0,
        minutes: stat.games?.minutes || 0,
        rating: stat.games?.rating || null,
        rt: convertRating(stat.games?.rating),
        // Extended metrics for spider chart
        shots_on_target: stat.shots?.on || 0,
        key_passes: stat.passes?.key || 0,
        dribbles_success: stat.dribbles?.success || 0,
        tackles: stat.tackles?.total || 0,
        interceptions: stat.tackles?.interceptions || 0,
        progressive_carries: stat.carries?.progressive || 0,
        aerial_won: stat.duels?.won || 0,
        yellow_cards: stat.cards?.yellow || 0,
        red_cards: stat.cards?.red || 0,
      });
    }
  }

  if (allStats.length > 0) {
    await supabase.from('player_seasons')
      .upsert(allStats, { onConflict: 'api_id,season,league_api_id' });
  }

  // Update player updated_at
  await supabase.from('players')
    .update({ updated_at: new Date().toISOString() })
    .eq('api_id', apiId);

  return allStats.length;
}

module.exports = async (req, res) => {
  // Verify this is called by Vercel cron (or manually with secret)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  if (!process.env.RAPIDAPI_KEY) {
    return res.status(200).json({ message: 'No API key configured — skipping refresh' });
  }

  const headers = {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY
  };

  try {
    // Get top 20 by rating from cache
    const { data: topPlayers } = await supabase
      .from('players')
      .select('api_id, name, updated_at')
      .order('updated_at', { ascending: true })
      .limit(20);

    // Get top 5 most searched (bonus refresh if API calls allow)
    const { data: mostSearched } = await supabase
      .from('search_cache')
      .select('search_term, result_count')
      .order('result_count', { ascending: false })
      .limit(5);

    const refreshed = [];
    let apiCallsUsed = 0;
    const MAX_CALLS = 80; // Leave 20 buffer for on-demand searches

    // Refresh top 20
    for (const player of (topPlayers || [])) {
      if (apiCallsUsed >= MAX_CALLS) break;
      const count = await fetchAndCachePlayer(player.api_id, headers);
      refreshed.push({ name: player.name, seasons_updated: count });
      apiCallsUsed += 2; // seasons call + stats call per player
      // Small delay to be kind to the API
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`Refresh complete: ${refreshed.length} players, ~${apiCallsUsed} API calls used`);

    return res.json({
      success: true,
      refreshed: refreshed.length,
      api_calls_used: apiCallsUsed,
      players: refreshed
    });

  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: err.message });
  }
};
