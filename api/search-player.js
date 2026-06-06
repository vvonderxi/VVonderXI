// /api/search-player.js
// Searches for a player by name using BSD (Bzzoiro Sports Data) API
// Free, no rate limits, no credit card required
// Sign up at: https://sports.bzzoiro.com/register/
// Flow: Supabase cache → BSD API → cache result → return

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BSD_BASE = 'https://sports.bzzoiro.com/api/v2';

// Map BSD league names to our internal codes
const LEAGUE_NAME_MAP = {
  'Premier League':       { code: 'PL',  f: 1.000 },
  'La Liga':              { code: 'LL',  f: 0.978 },
  'Bundesliga':           { code: 'BL',  f: 0.940 },
  'Serie A':              { code: 'SA',  f: 0.935 },
  'Ligue 1':              { code: 'L1',  f: 0.878 },
  'Primeira Liga':        { code: 'PRT', f: 0.845 },
  'Liga Portugal':        { code: 'PRT', f: 0.845 },
  'Eredivisie':           { code: 'ERE', f: 0.820 },
  'Belgian Pro League':   { code: 'BPL', f: 0.790 },
  'Champions League':     { code: 'CL',  f: 1.050 },
  'UEFA Champions League':{ code: 'CL',  f: 1.050 },
  'Saudi Pro League':     { code: 'SPL', f: 0.720 },
  'MLS':                  { code: 'MLS', f: 0.700 },
  'Scottish Premiership': { code: 'SPM', f: 0.740 },
  'Super Lig':            { code: 'TSL', f: 0.760 },
  'Turkish Super Lig':    { code: 'TSL', f: 0.760 },
  'Argentine Primera':    { code: 'ARG', f: 0.750 },
  'Liga Profesional':     { code: 'ARG', f: 0.750 },
  'Brazilian Serie A':    { code: 'BRZ', f: 0.740 },
  'Brasileirao':          { code: 'BRZ', f: 0.740 },
};

// Position mapping from BSD to our codes
const POS_MAP = {
  'G': 'GK', 'GK': 'GK',
  'D': 'CB', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'M': 'CM', 'CM': 'CM', 'CDM': 'CDM', 'CAM': 'CAM',
  'F': 'ST', 'ST': 'ST', 'CF': 'CF', 'LW': 'LW', 'RW': 'RW',
};

function leagueInfo(leagueName) {
  for (const [key, val] of Object.entries(LEAGUE_NAME_MAP)) {
    if (leagueName && leagueName.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return { code: 'OTHER', f: 0.850 };
}

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function seasonCode(year) {
  const y = parseInt(year);
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
}

// Fetch BSD API with auth header
async function bsdFetch(path) {
  const res = await fetch(`${BSD_BASE}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` }
  });
  if (!res.ok) throw new Error(`BSD API error: ${res.status} ${path}`);
  return res.json();
}

// Search players by name via BSD
async function searchBSDPlayers(query) {
  const data = await bsdFetch(`/players/?name=${encodeURIComponent(query)}&limit=10`);
  return data.results || [];
}

// Get player career stats (goals, assists per season)
async function getPlayerCareer(playerId) {
  try {
    const data = await bsdFetch(`/players/${playerId}/career/`);
    return data.seasons || [];
  } catch (e) {
    return [];
  }
}

// Get player detail (photo, market value etc.)
async function getPlayerDetail(playerId) {
  try {
    return await bsdFetch(`/players/${playerId}/`);
  } catch (e) {
    return null;
  }
}

// Get league name for a league ID
async function getLeagueName(leagueId) {
  try {
    const data = await bsdFetch(`/leagues/${leagueId}/`);
    return data.name || '';
  } catch (e) {
    return '';
  }
}

// Build VVonderXI-compatible player object from BSD data
async function buildPlayerFromBSD(bsdPlayer) {
  const career = await getPlayerCareer(bsdPlayer.id);
  const seasons = {};

  // Build league name cache to avoid repeated requests
  const leagueCache = {};

  for (const row of career) {
    const year = row.season_id;
    const sCode = seasonCode(row.season_year || year);

    // Get league name (cached)
    if (!leagueCache[row.league_id]) {
      leagueCache[row.league_id] = await getLeagueName(row.league_id);
    }
    const lName = leagueCache[row.league_id];
    const lg = leagueInfo(lName);

    // Calculate RT from average rating (BSD uses 0-10 scale)
    const rt = row.avg_rating ? Math.round(row.avg_rating * 10) : 75;

    seasons[sCode] = {
      pos: POS_MAP[bsdPlayer.position] || bsdPlayer.position || 'ST',
      lg: lg.code,
      g: row.goals || 0,
      a: row.assists || 0,
      rt: rt,
      age: calcAge(bsdPlayer.date_of_birth) || null,
      club: '', // available from team detail if needed
    };
  }

  return {
    name: bsdPlayer.name,
    api_id: bsdPlayer.id,
    nationality: bsdPlayer.nationality || '',
    photo: `https://sports.bzzoiro.com/img/player/${bsdPlayer.id}/`,
    seasons,
    source: 'bsd'
  };
}

// Save to Supabase cache
async function cachePlayer(playerData) {
  const { data: player, error } = await supabase
    .from('players')
    .upsert({
      api_id: playerData.api_id,
      name: playerData.name,
      nationality: playerData.nationality,
      photo_url: playerData.photo,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'api_id' })
    .select()
    .single();

  if (error || !player) return null;

  // Upsert all seasons
  const seasonRows = Object.entries(playerData.seasons).map(([sCode, s]) => ({
    player_id: player.id,
    api_id: playerData.api_id,
    season: sCode,
    season_year: parseInt('20' + sCode.slice(0, 2)),
    league_code: s.lg,
    league_name: s.lg,
    league_api_id: 0,
    pos: s.pos,
    age: s.age,
    goals: s.g,
    assists: s.a,
    rt: s.rt,
    club: s.club || '',
    appearances: 0,
    minutes: 0,
  }));

  if (seasonRows.length > 0) {
    await supabase.from('player_seasons')
      .upsert(seasonRows, { onConflict: 'api_id,season,league_api_id' });
  }

  return player;
}

// Format cached Supabase player for frontend
function formatCachedPlayer(player, seasons) {
  const seasonsFormatted = {};
  (seasons || []).forEach(s => {
    seasonsFormatted[s.season] = {
      pos: s.pos,
      lg: s.league_code,
      g: s.goals,
      a: s.assists,
      rt: s.rt || 75,
      age: s.age,
      club: s.club,
      appearances: s.appearances,
    };
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

// ── MAIN HANDLER ──
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query too short — minimum 2 characters' });
  }

  try {
    // Step 1: Check Supabase cache first
    const { data: cached } = await supabase
      .from('players')
      .select(`*, player_seasons(*)`)
      .ilike('name', `%${q}%`)
      .limit(8);

    if (cached && cached.length > 0) {
      const results = cached.map(p => formatCachedPlayer(p, p.player_seasons));
      return res.json({ results, source: 'cache' });
    }

    // Step 2: Not in cache — call BSD API
    if (!process.env.BSD_API_KEY) {
      return res.json({
        results: [],
        source: 'no-api-key',
        message: 'Add BSD_API_KEY to Vercel environment variables. Sign up free at sports.bzzoiro.com/register'
      });
    }

    const bsdPlayers = await searchBSDPlayers(q);

    if (!bsdPlayers.length) {
      return res.json({ results: [], source: 'bsd', message: 'No players found' });
    }

    // Step 3: Build full player data and cache (limit to first 5 results)
    const results = [];
    for (const bsdPlayer of bsdPlayers.slice(0, 5)) {
      const playerData = await buildPlayerFromBSD(bsdPlayer);
      await cachePlayer(playerData);
      results.push(playerData);
    }

    // Log search
    await supabase.from('search_cache').upsert(
      { search_term: q.toLowerCase(), last_searched: new Date().toISOString(), result_count: results.length },
      { onConflict: 'search_term' }
    );

    return res.json({ results, source: 'bsd' });

  } catch (err) {
    console.error('search-player error:', err);
    return res.status(500).json({ error: err.message });
  }
};
