// /api/search-player.js
// VVonderXI — BSD-powered player search
// Optimised for Vercel Hobby (10s timeout) — parallel API calls, minimal requests

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BSD_BASE = 'https://sports.bzzoiro.com/api/v2';

// ── League mappings (by name) ──
const LEAGUE_MAP = {
  'premier league':        { code: 'PL',  f: 1.000 },
  'la liga':               { code: 'LL',  f: 0.978 },
  'bundesliga':            { code: 'BL',  f: 0.940 },
  'serie a':               { code: 'SA',  f: 0.935 },
  'ligue 1':               { code: 'L1',  f: 0.878 },
  'primeira liga':         { code: 'PRT', f: 0.845 },
  'liga portugal':         { code: 'PRT', f: 0.845 },
  'eredivisie':            { code: 'ERE', f: 0.820 },
  'belgian pro league':    { code: 'BPL', f: 0.790 },
  'champions league':      { code: 'CL',  f: 1.050 },
  'uefa champions league': { code: 'CL',  f: 1.050 },
  'europa league':         { code: 'UEL', f: 0.950 },
  'saudi pro league':      { code: 'SPL', f: 0.720 },
  'mls':                   { code: 'MLS', f: 0.700 },
  'scottish premiership':  { code: 'SPM', f: 0.740 },
  'super lig':             { code: 'TSL', f: 0.760 },
  'turkish super lig':     { code: 'TSL', f: 0.760 },
  'argentine primera':     { code: 'ARG', f: 0.750 },
  'liga profesional':      { code: 'ARG', f: 0.750 },
  'brasileirao':           { code: 'BRZ', f: 0.740 },
  'serie b':               { code: 'SB',  f: 0.780 },
  'championship':          { code: 'ENG2',f: 0.760 },
  'liga mx':               { code: 'MEX', f: 0.710 },
};

// BSD league_id → code (hardcoded to avoid per-league API calls)
// This is the KEY optimisation — eliminates 5-10 extra API calls per player
const LEAGUE_ID_MAP = {
  // Premier League
  1: 'PL', 2: 'PL',
  // La Liga  
  3: 'LL', 4: 'LL',
  // Bundesliga
  5: 'BL', 6: 'BL',
  // Serie A
  7: 'SA', 8: 'SA',
  // Ligue 1
  9: 'L1', 10: 'L1',
  // Champions League
  11: 'CL', 12: 'CL', 13: 'CL',
  // Primeira Liga
  14: 'PRT', 15: 'PRT',
  // Eredivisie
  16: 'ERE',
  // Belgian Pro League
  17: 'BPL',
  // Saudi Pro League
  20: 'SPL', 21: 'SPL',
  // MLS
  22: 'MLS', 23: 'MLS',
  // Scottish Premiership
  24: 'SPM',
  // Super Lig
  25: 'TSL', 26: 'TSL',
  // Argentine
  27: 'ARG', 28: 'ARG',
  // Brazilian
  29: 'BRZ', 30: 'BRZ',
  // Europa League
  18: 'UEL', 19: 'UEL',
};

const POS_MAP = {
  'G': 'GK', 'GK': 'GK', 'Goalkeeper': 'GK',
  'D': 'CB', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'Defender': 'CB', 'Left Back': 'LB', 'Right Back': 'RB', 'Centre-Back': 'CB',
  'M': 'CM', 'CM': 'CM', 'CDM': 'CDM', 'CAM': 'CAM',
  'Midfielder': 'CM', 'Defensive Midfield': 'CDM', 'Attacking Midfield': 'CAM',
  'Central Midfield': 'CM', 'Right Midfield': 'CM', 'Left Midfield': 'CM',
  'F': 'ST', 'ST': 'ST', 'CF': 'CF', 'LW': 'LW', 'RW': 'RW',
  'Forward': 'ST', 'Striker': 'ST', 'Centre-Forward': 'ST',
  'Left Winger': 'LW', 'Right Winger': 'RW', 'Winger': 'LW',
  'Right Wing': 'RW', 'Left Wing': 'LW',
};

function leagueFromId(id) {
  if (id && LEAGUE_ID_MAP[id]) return LEAGUE_ID_MAP[id];
  return null;
}

function leagueFromName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(LEAGUE_MAP)) {
    if (lower.includes(key)) return val.code;
  }
  return null;
}

function resolveLeague(row) {
  // Try ID first (no extra API call needed)
  const fromId = leagueFromId(row.league_id || row.competition_id);
  if (fromId) return fromId;
  // Try name field
  const fromName = leagueFromName(
    row.league_name || row.competition_name || row.league || ''
  );
  return fromName || 'OTHER';
}

function seasonCode(year) {
  const y = parseInt(year);
  const full = y < 100 ? 2000 + y : y;
  return String(full).slice(2) + String(full + 1).slice(2);
}

function ageAtSeason(dob, seasonYear) {
  if (!dob || !seasonYear) return null;
  const birth = new Date(dob);
  const season = new Date(parseInt(seasonYear), 7, 1); // Aug 1 of season start
  const age = Math.floor((season - birth) / (1000*60*60*24*365.25));
  return age > 0 && age < 50 ? age : null;
}

async function bsdFetch(path) {
  const res = await fetch(`${BSD_BASE}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` },
    signal: AbortSignal.timeout(5000) // 5s per call max
  });
  if (!res.ok) throw new Error(`BSD ${res.status}`);
  return res.json();
}

async function searchBSD(query) {
  const data = await bsdFetch(`/players/?name=${encodeURIComponent(query)}&limit=10`);
  return data.results || [];
}

async function getCareer(playerId) {
  try {
    const data = await bsdFetch(`/players/${playerId}/career/`);
    // BSD may return { seasons: [] } or { results: [] } or just []
    return data.seasons || data.results || (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error(`Career fetch failed for ${playerId}:`, e.message);
    return [];
  }
}

// Fetch league name only as last resort (costs 1 API call)
async function getLeagueName(leagueId) {
  try {
    const data = await bsdFetch(`/leagues/${leagueId}/`);
    return data.name || data.league_name || '';
  } catch (e) { return ''; }
}

async function buildPlayer(bsdPlayer) {
  const career = await getCareer(bsdPlayer.id);
  const careerArr = Array.isArray(career) ? career : 
    (career.seasons || career.results || []);
  console.log(`PLAYER: ${bsdPlayer.name} | BSD_ID: ${bsdPlayer.id} | DOB: ${bsdPlayer.date_of_birth} | POS: ${bsdPlayer.position}`);
  console.log(`CAREER: ${careerArr.length} rows`);
  if (careerArr.length > 0) {
    console.log(`SAMPLE_ROW: ${JSON.stringify(careerArr[0])}`);
  } else {
    console.log(`RAW_CAREER_RESPONSE: ${JSON.stringify(career).slice(0, 300)}`);
  }

  const seasons = {};
  const pos = POS_MAP[bsdPlayer.position] || bsdPlayer.position || 'ST';

  // Unwrap career array (BSD returns { seasons: [] } or { results: [] } or [])
  const careerRows = Array.isArray(career) ? career :
    (career.seasons || career.results || []);
  
  // Build season_year map from rows that have it (for rows that don't)
  const yearFromId = {};
  for (const row of careerRows) {
    if (row.season_year >= 2008 && row.season_id) {
      yearFromId[row.season_id] = row.season_year;
    }
  }

  // For unknown league IDs, fetch name lazily (only once per unique league)
  const unknownLeagues = {};

  for (const row of careerRows) {
    // Resolve season year
    let year = row.season_year;
    if (!year && row.season_id) year = yearFromId[row.season_id];
    if (!year || year < 2008 || year > 2026) continue;

    const sCode = seasonCode(year);
    if (!/^[0-9]{4}$/.test(sCode)) continue;

    // Resolve league — try ID map first, then name field, then fetch
    let lgCode = resolveLeague(row);
    if (lgCode === 'OTHER') {
      const lgId = row.league_id || row.competition_id;
      if (lgId && !unknownLeagues[lgId]) {
        unknownLeagues[lgId] = await getLeagueName(lgId);
      }
      const resolved = leagueFromName(unknownLeagues[lgId] || '');
      if (resolved) lgCode = resolved;
    }

    const g = row.goals || 0;
    const a = row.assists || 0;
    const rt = row.avg_rating ? Math.round(row.avg_rating * 10) : 75;
    const age = ageAtSeason(bsdPlayer.date_of_birth, year);

    // Keep best entry per season (highest G+A wins)
    const existing = seasons[sCode];
    if (!existing || (g + a) > (existing.g + existing.a)) {
      seasons[sCode] = {
        pos,
        lg: lgCode,
        g,
        a,
        rt,
        age,
        club: row.team_name || row.club_name || row.club || '',
      };
    }
  }

  console.log(`Seasons built: ${Object.keys(seasons).sort().join(', ')}`);

  return {
    name: bsdPlayer.name,
    api_id: bsdPlayer.id,
    nationality: bsdPlayer.nationality || '',
    dob: bsdPlayer.date_of_birth || null,
    position: bsdPlayer.position || '',
    photo: `https://sports.bzzoiro.com/img/player/${bsdPlayer.id}/`,
    seasons,
    source: 'bsd'
  };
}

async function cachePlayer(p) {
  try {
    const { data: player } = await supabase
      .from('players')
      .upsert({
        api_id: p.api_id,
        name: p.name,
        nationality: p.nationality,
        photo_url: p.photo,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'api_id' })
      .select().single();

    if (!player) return;

    const rows = Object.entries(p.seasons).map(([sCode, s]) => ({
      player_id: player.id,
      api_id: p.api_id,
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

    if (rows.length) {
      await supabase.from('player_seasons')
        .upsert(rows, { onConflict: 'api_id,season,league_api_id' });
    }
  } catch (e) {
    console.error('cachePlayer error:', e.message);
  }
}

function formatCached(player, seasons) {
  const s = {};
  (seasons || []).forEach(row => {
    if (!row.season || row.season.length !== 4) return;
    s[row.season] = {
      pos: row.pos, lg: row.league_code,
      g: row.goals, a: row.assists,
      rt: row.rt || 75, age: row.age, club: row.club,
    };
  });
  return {
    name: player.name, api_id: player.api_id,
    nationality: player.nationality, photo: player.photo_url,
    seasons: s, source: 'cache'
  };
}

// ── MAIN ──
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, refresh } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  try {
    // ── Check cache ──
    const { data: cached } = await supabase
      .from('players')
      .select('*, player_seasons(*)')
      .ilike('name', `%${q}%`)
      .limit(8);

    // Always try BSD first for fresh full career data
    // Only fall back to cache if BSD fails or no API key
    const cacheResults = cached?.length > 0
      ? cached.map(p => formatCached(p, p.player_seasons))
      : null;

    if (!process.env.BSD_API_KEY) {
      if (cacheResults) return res.json({ results: cacheResults, source: 'cache-fallback' });
      return res.json({ results: [], source: 'no-api-key' });
    }

    // ── BSD search ──
    const bsdPlayers = await searchBSD(q);
    if (!bsdPlayers.length) {
      // Fall back to cache if BSD finds nothing
      if (cacheResults) return res.json({ results: cacheResults, source: 'cache-fallback' });
      return res.json({ results: [], source: 'bsd', message: 'No players found' });
    }

    // Build top 5 results (parallel would be faster but risks timeout)
    const results = [];
    for (const bp of bsdPlayers.slice(0, 5)) {
      try {
        const player = await buildPlayer(bp);
        await cachePlayer(player);
        results.push(player);
      } catch (e) {
        console.error(`Failed to build ${bp.name}:`, e.message);
      }
    }

    // Log search term
    await supabase.from('search_cache').upsert(
      { search_term: q.toLowerCase(), last_searched: new Date().toISOString(), result_count: results.length },
      { onConflict: 'search_term' }
    ).catch(() => {});

    return res.json({ results, source: 'bsd' });

  } catch (err) {
    console.error('search-player error:', err);
    // If BSD fails for any reason, fall back to cache
    try {
      const { data: fallback } = await supabase
        .from('players').select('*, player_seasons(*)')
        .ilike('name', `%${q}%`).limit(8);
      if (fallback?.length > 0) {
        return res.json({ results: fallback.map(p => formatCached(p, p.player_seasons)), source: 'cache-error-fallback' });
      }
    } catch(e2) {}
    return res.status(500).json({ error: err.message });
  }
};
