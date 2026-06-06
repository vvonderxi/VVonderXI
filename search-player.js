// /api/search-player.js
// Searches for a player by name.
// Flow: Supabase cache → API-Football → cache result → return

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Map API-Football league IDs to our internal codes
const LEAGUE_MAP = {
  39:  { code: 'PL',  name: 'Premier League',      f: 1.000 },
  140: { code: 'LL',  name: 'La Liga',              f: 0.978 },
  78:  { code: 'BL',  name: 'Bundesliga',           f: 0.940 },
  135: { code: 'SA',  name: 'Serie A',              f: 0.935 },
  61:  { code: 'L1',  name: 'Ligue 1',              f: 0.878 },
  94:  { code: 'PRT', name: 'Primeira Liga',        f: 0.845 },
  88:  { code: 'ERE', name: 'Eredivisie',           f: 0.820 },
  144: { code: 'BPL', name: 'Belgian Pro League',   f: 0.790 },
  307: { code: 'SPL', name: 'Saudi Pro League',     f: 0.720 },
  253: { code: 'MLS', name: 'MLS',                  f: 0.700 },
  179: { code: 'SPM', name: 'Scottish Premiership', f: 0.740 },
  203: { code: 'TSL', name: 'Turkish Super Lig',    f: 0.760 },
  128: { code: 'ARG', name: 'Argentine Primera',    f: 0.750 },
  71:  { code: 'BRZ', name: 'Brazilian Serie A',    f: 0.740 },
  2:   { code: 'CL',  name: 'Champions League',     f: 1.050 },
};

// Convert API rating (0-10) to our 0-100 scale
function convertRating(apiRating) {
  if (!apiRating) return null;
  return Math.round(parseFloat(apiRating) * 10);
}

// Convert season year to our code e.g. 2023 → "2324"
function seasonCode(year) {
  const y = parseInt(year);
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
}

// Fetch all historical seasons from API-Football for a player
async function fetchAllSeasonsFromAPI(playerId) {
  const headers = {
    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPIDAPI_KEY
  };

  // Get available seasons for this player
  const seasonsRes = await fetch(
    `https://api-football-v1.p.rapidapi.com/v3/players/seasons?player=${playerId}`,
    { headers }
  );
  const seasonsData = await seasonsRes.json();
  const availableSeasons = seasonsData.response || [];

  const allStats = [];

  // Fetch stats for each season (limit to last 8 seasons to control API calls)
  const recentSeasons = availableSeasons.slice(-8);
  
  for (const year of recentSeasons) {
    const statsRes = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players?id=${playerId}&season=${year}`,
      { headers }
    );
    const statsData = await statsRes.json();
    const playerData = statsData.response?.[0];
    if (!playerData) continue;

    const player = playerData.player;
    const statistics = playerData.statistics || [];

    for (const stat of statistics) {
      const leagueId = stat.league?.id;
      const leagueInfo = LEAGUE_MAP[leagueId];
      // Only store leagues we track
      if (!leagueInfo) continue;

      allStats.push({
        season_year: year,
        season_code: seasonCode(year),
        league_api_id: leagueId,
        league_code: leagueInfo.code,
        league_name: leagueInfo.name,
        club: stat.team?.name || '',
        pos: stat.games?.position?.slice(0, 3).toUpperCase() || '',
        age: player.age || null,
        goals: stat.goals?.total || 0,
        assists: stat.goals?.assists || 0,
        appearances: stat.games?.appearences || 0,
        minutes: stat.games?.minutes || 0,
        rating: stat.games?.rating || null,
        rt: convertRating(stat.games?.rating),
        yellow_cards: stat.cards?.yellow || 0,
        red_cards: stat.cards?.red || 0,
      });
    }
  }

  return allStats;
}

// Save player + all seasons to Supabase
async function cachePlayerInSupabase(playerInfo, allSeasonStats) {
  // Upsert player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .upsert({
      api_id: playerInfo.id,
      name: playerInfo.name,
      full_name: playerInfo.firstname + ' ' + playerInfo.lastname,
      nationality: playerInfo.nationality,
      position: playerInfo.position,
      photo_url: playerInfo.photo,
    }, { onConflict: 'api_id' })
    .select()
    .single();

  if (playerError) {
    console.error('Error upserting player:', playerError);
    return null;
  }

  // Upsert all season stats
  const seasonRows = allSeasonStats.map(s => ({
    player_id: player.id,
    api_id: playerInfo.id,
    season: s.season_code,
    season_year: s.season_year,
    league_code: s.league_code,
    league_name: s.league_name,
    league_api_id: s.league_api_id,
    club: s.club,
    pos: s.pos,
    age: s.age,
    goals: s.goals,
    assists: s.assists,
    appearances: s.appearances,
    minutes: s.minutes,
    rating: s.rating,
    rt: s.rt,
    yellow_cards: s.yellow_cards,
    red_cards: s.red_cards,
  }));

  if (seasonRows.length > 0) {
    const { error: seasonError } = await supabase
      .from('player_seasons')
      .upsert(seasonRows, { onConflict: 'api_id,season,league_api_id' });

    if (seasonError) console.error('Error upserting seasons:', seasonError);
  }

  return player;
}

// Format cached player data for frontend
function formatCachedPlayer(player, seasons) {
  const seasonsFormatted = {};
  seasons.forEach(s => {
    const code = s.season;
    if (!seasonsFormatted[code]) {
      seasonsFormatted[code] = {
        pos: s.pos,
        lg: s.league_code,
        g: s.goals,
        a: s.assists,
        rt: s.rt || 80,
        age: s.age,
        club: s.club,
        appearances: s.appearances,
      };
    }
  });

  return {
    name: player.name,
    api_id: player.api_id,
    nationality: player.nationality,
    photo: player.photo_url,
    seasons: seasonsFormatted,
    source: 'cache'
  };
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  try {
    // Step 1: Check Supabase cache first
    const { data: cachedPlayers } = await supabase
      .from('players')
      .select(`
        *,
        player_seasons (
          season, season_year, league_code, league_name,
          pos, age, goals, assists, rt, club, appearances
        )
      `)
      .ilike('name', `%${q}%`)
      .limit(10);

    if (cachedPlayers && cachedPlayers.length > 0) {
      const results = cachedPlayers.map(p => formatCachedPlayer(p, p.player_seasons || []));
      return res.json({ results, source: 'cache' });
    }

    // Step 2: Not in cache — call API-Football
    if (!process.env.RAPIDAPI_KEY) {
      return res.json({ results: [], source: 'no-api-key', message: 'Add RAPIDAPI_KEY to use live search' });
    }

    const searchRes = await fetch(
      `https://api-football-v1.p.rapidapi.com/v3/players?search=${encodeURIComponent(q)}&league=39&season=2023`,
      {
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        }
      }
    );
    const searchData = await searchRes.json();
    const apiPlayers = searchData.response || [];

    if (!apiPlayers.length) {
      return res.json({ results: [], source: 'api', message: 'No players found' });
    }

    // Step 3: For each result, fetch full history and cache
    const results = [];
    for (const item of apiPlayers.slice(0, 5)) {
      const playerInfo = item.player;
      const allSeasons = await fetchAllSeasonsFromAPI(playerInfo.id);
      const cached = await cachePlayerInSupabase(playerInfo, allSeasons);

      if (cached) {
        const { data: seasons } = await supabase
          .from('player_seasons')
          .select('*')
          .eq('api_id', playerInfo.id);

        results.push(formatCachedPlayer(cached, seasons || []));
      }
    }

    // Update search cache log
    await supabase.from('search_cache').upsert(
      { search_term: q.toLowerCase(), last_searched: new Date().toISOString(), result_count: results.length },
      { onConflict: 'search_term' }
    );

    return res.json({ results, source: 'api' });

  } catch (err) {
    console.error('search-player error:', err);
    return res.status(500).json({ error: err.message });
  }
};
