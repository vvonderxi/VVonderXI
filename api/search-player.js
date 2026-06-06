// /api/search-player.js — VVonderXI BSD Player Search
// Architecture: BSD seasons map -> player career -> build seasons object -> cache in Supabase

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BSD_BASE = 'https://sports.bzzoiro.com/api/v2';

// League name -> internal code mapping
const LEAGUE_MAP = {
  'premier league': 'PL', 'la liga': 'LL', 'bundesliga': 'BL',
  'serie a': 'SA', 'ligue 1': 'L1', 'primeira liga': 'PRT',
  'liga portugal': 'PRT', 'eredivisie': 'ERE', 'belgian pro league': 'BPL',
  'champions league': 'CL', 'uefa champions league': 'CL',
  'europa league': 'UEL', 'saudi pro league': 'SPL', 'mls': 'MLS',
  'scottish premiership': 'SPM', 'super lig': 'TSL', 'turkish super lig': 'TSL',
  'argentine primera': 'ARG', 'liga profesional': 'ARG',
  'brasileirao': 'BRZ', 'serie b': 'SB2', 'championship': 'ENG2',
};

const POS_MAP = {
  'G': 'GK', 'GK': 'GK', 'Goalkeeper': 'GK',
  'D': 'CB', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'Centre-Back': 'CB', 'Left Back': 'LB', 'Right Back': 'RB', 'Defender': 'CB',
  'M': 'CM', 'CM': 'CM', 'CDM': 'CDM', 'CAM': 'CAM',
  'Central Midfield': 'CM', 'Defensive Midfield': 'CDM', 'Attacking Midfield': 'CAM',
  'Midfielder': 'CM', 'Right Midfield': 'CM', 'Left Midfield': 'CM',
  'F': 'ST', 'ST': 'ST', 'CF': 'CF', 'LW': 'LW', 'RW': 'RW',
  'Centre-Forward': 'ST', 'Striker': 'ST', 'Forward': 'ST',
  'Left Winger': 'LW', 'Right Winger': 'RW', 'Left Wing': 'LW', 'Right Wing': 'RW',
};

const LGS = {
  PL:{f:1.000}, LL:{f:0.978}, BL:{f:0.940}, SA:{f:0.935}, L1:{f:0.878},
  PRT:{f:0.845}, ERE:{f:0.820}, BPL:{f:0.790}, CL:{f:1.050}, UEL:{f:0.950},
  SPL:{f:0.720}, MLS:{f:0.700}, SPM:{f:0.740}, TSL:{f:0.760},
  ARG:{f:0.750}, BRZ:{f:0.740},
};

function resolveLeague(name) {
  if (!name) return 'OTHER';
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(LEAGUE_MAP)) {
    if (l.includes(k)) return v;
  }
  return 'OTHER';
}

function seasonCode(year) {
  const y = parseInt(year);
  const full = y < 100 ? 2000 + y : y;
  if (full < 2008 || full > 2026) return null;
  return String(full).slice(2) + String(full + 1).slice(2);
}

function ageAtSeason(dob, year) {
  if (!dob || !year) return null;
  const age = Math.floor((new Date(year, 7, 1) - new Date(dob)) / (365.25*24*60*60*1000));
  return (age > 10 && age < 50) ? age : null;
}

async function bsdFetch(path) {
  const res = await fetch(`${BSD_BASE}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` },
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`BSD ${res.status} ${path}`);
  return res.json();
}

// Cache BSD seasons globally (season_id -> year)
let _seasonMap = null;
let _seasonMapTime = 0;

async function getBSDSeasonMap() {
  // Refresh every hour
  if (_seasonMap && Date.now() - _seasonMapTime < 3600000) return _seasonMap;
  try {
    const data = await bsdFetch('/seasons/?limit=200');
    const rows = data.results || data.seasons || data || [];
    const map = {};
    for (const s of rows) {
      // BSD season format: {id, name: "2023/24", start_date: "2023-08-01"}
      const id = s.id || s.season_id;
      const name = s.name || s.season_name || '';
      // Parse year from name like "2023/24" or "2023-2024"
      const m = name.match(/(\d{4})[\/\-]/);
      if (m) {
        map[id] = parseInt(m[1]);
        continue;
      }
      // Try start_date
      if (s.start_date) {
        map[id] = new Date(s.start_date).getFullYear();
        continue;
      }
      // Try year field
      if (s.year >= 2008) map[id] = s.year;
    }
    console.log(`Season map built: ${Object.keys(map).length} seasons`);
    if (Object.keys(map).length > 0) {
      console.log('Sample:', JSON.stringify(Object.entries(map).slice(0, 5)));
      _seasonMap = map;
      _seasonMapTime = Date.now();
    }
    return map;
  } catch (e) {
    console.error('Season map error:', e.message);
    return _seasonMap || {};
  }
}

async function buildPlayer(bsdPlayer, seasonMap) {
  // Get career stats
  let careerRows = [];
  try {
    const career = await bsdFetch(`/players/${bsdPlayer.id}/career/`);
    careerRows = career.results || career.seasons || (Array.isArray(career) ? career : []);
  } catch (e) {
    console.error(`Career failed for ${bsdPlayer.name}:`, e.message);
  }

  console.log(`${bsdPlayer.name} (id:${bsdPlayer.id}): ${careerRows.length} career rows`);
  if (careerRows.length > 0) {
    console.log('Row[0]:', JSON.stringify(careerRows[0]));
  }

  const pos = POS_MAP[bsdPlayer.position] || 'ST';
  const seasons = {};

  for (const row of careerRows) {
    // Resolve year: try season map first, then direct fields
    const sid = row.season_id || row.season;
    let year = seasonMap[sid];

    if (!year) {
      // Try direct year fields on the row
      if (row.season_year >= 2008 && row.season_year <= 2026) year = row.season_year;
      else if (row.year >= 2008 && row.year <= 2026) year = row.year;
    }

    if (!year || year < 2008 || year > 2026) continue;

    const sCode = seasonCode(year);
    if (!sCode) continue;

    // Resolve league
    const lgName = row.league_name || row.competition_name || row.league || '';
    const lgCode = resolveLeague(lgName);

    const g = parseInt(row.goals) || 0;
    const a = parseInt(row.assists) || 0;
    const rt = row.avg_rating ? Math.round(row.avg_rating * 10) : 75;
    const age = ageAtSeason(bsdPlayer.date_of_birth, year);

    // Keep highest G+A per season
    if (!seasons[sCode] || (g + a) > (seasons[sCode].g + seasons[sCode].a)) {
      seasons[sCode] = {
        pos, lg: lgCode, g, a, rt, age,
        club: row.team_name || row.club || '',
      };
    }
  }

  console.log(`Seasons: ${Object.keys(seasons).sort().join(', ') || 'NONE'}`);

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
      .upsert({ api_id: p.api_id, name: p.name, nationality: p.nationality, photo_url: p.photo, updated_at: new Date().toISOString() }, { onConflict: 'api_id' })
      .select().single();
    if (!player) return;

    const rows = Object.entries(p.seasons).map(([s, d]) => ({
      player_id: player.id, api_id: p.api_id, season: s,
      season_year: 2000 + parseInt(s.slice(0, 2)),
      league_code: d.lg, league_name: d.lg, league_api_id: 0,
      pos: d.pos, age: d.age, goals: d.g, assists: d.a, rt: d.rt, club: d.club || '',
      appearances: 0, minutes: 0,
    }));
    if (rows.length) {
      await supabase.from('player_seasons').upsert(rows, { onConflict: 'api_id,season,league_api_id' });
    }
  } catch (e) { console.error('Cache error:', e.message); }
}

function formatCached(player, seasons) {
  const s = {};
  (seasons || []).forEach(r => {
    if (r.season?.length === 4) {
      s[r.season] = { pos: r.pos, lg: r.league_code, g: r.goals, a: r.assists, rt: r.rt || 75, age: r.age, club: r.club };
    }
  });
  return { name: player.name, api_id: player.api_id, nationality: player.nationality, photo: player.photo_url, seasons: s, source: 'cache' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  try {
    if (!process.env.BSD_API_KEY) {
      const { data: cached } = await supabase.from('players').select('*, player_seasons(*)').ilike('name', `%${q}%`).limit(8);
      return res.json({ results: (cached || []).map(p => formatCached(p, p.player_seasons)), source: 'cache-no-key' });
    }

    // Get season map (cached in memory)
    const seasonMap = await getBSDSeasonMap();
    console.log(`Season map has ${Object.keys(seasonMap).length} entries`);

    // Search BSD
    const data = await bsdFetch(`/players/?name=${encodeURIComponent(q)}&limit=10`);
    const bsdPlayers = data.results || [];
    console.log(`BSD search "${q}": ${bsdPlayers.length} results`);

    if (!bsdPlayers.length) {
      // Fall back to Supabase cache
      const { data: cached } = await supabase.from('players').select('*, player_seasons(*)').ilike('name', `%${q}%`).limit(8);
      return res.json({ results: (cached || []).map(p => formatCached(p, p.player_seasons)), source: 'cache-fallback' });
    }

    const results = [];
    for (const bp of bsdPlayers.slice(0, 5)) {
      const player = await buildPlayer(bp, seasonMap);
      await cachePlayer(player);
      results.push(player);
    }

    return res.json({ results, source: 'bsd' });

  } catch (err) {
    console.error('Error:', err.message);
    const { data: cached } = await supabase.from('players').select('*, player_seasons(*)').ilike('name', `%${q}%`).limit(8).catch(() => ({ data: [] }));
    if (cached?.length) return res.json({ results: cached.map(p => formatCached(p, p.player_seasons)), source: 'cache-error' });
    return res.status(500).json({ error: err.message });
  }
};
