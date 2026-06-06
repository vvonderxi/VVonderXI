// /api/search-player.js — VVonderXI
// BSD career returns: season_id, league_id, goals, assists — NO year
// Solution: sort season_ids descending, assign years from current season backwards

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BSD = 'https://sports.bzzoiro.com/api/v2';

const LEAGUE_ID_MAP = {
  // Mapped from BSD debug data + common knowledge
  // league_id 6 = Ligue 1 (Hakimi at PSG), 7 = Champions League
  // league_id 30, 31 = Serie A / Champions League (Inter era)
  // We fetch league names individually and cache them
};

const LEAGUE_NAME_MAP = {
  'premier league':'PL','la liga':'LL','bundesliga':'BL','serie a':'SA',
  'ligue 1':'L1','ligue1':'L1','primeira liga':'PRT','liga portugal':'PRT',
  'eredivisie':'ERE','belgian pro league':'BPL','champions league':'CL',
  'uefa champions league':'CL','europa league':'UEL','conference league':'UECL',
  'saudi pro league':'SPL','mls':'MLS','scottish premiership':'SPM',
  'super lig':'TSL','turkish super lig':'TSL','argentine primera':'ARG',
  'liga profesional':'ARG','brasileirao':'BRZ','serie b':'SB2',
  'championship':'ENG2','2. bundesliga':'BL2','serie b italia':'SA2',
};

const POS_MAP = {
  'G':'GK','GK':'GK','Goalkeeper':'GK',
  'D':'CB','CB':'CB','LB':'LB','RB':'RB','Centre-Back':'CB',
  'Left Back':'LB','Right Back':'RB','Defender':'CB','Wing-Back':'RB',
  'M':'CM','CM':'CM','CDM':'CDM','CAM':'CAM','Midfielder':'CM',
  'Central Midfield':'CM','Defensive Midfield':'CDM','Attacking Midfield':'CAM',
  'Right Midfield':'CM','Left Midfield':'CM','Box-to-box':'CM',
  'F':'ST','ST':'ST','CF':'CF','LW':'LW','RW':'RW',
  'Centre-Forward':'ST','Striker':'ST','Forward':'ST','Attacker':'ST',
  'Left Winger':'LW','Right Winger':'RW','Left Wing':'LW','Right Wing':'RW','Winger':'LW',
};

function lgCode(name) {
  if (!name) return 'OTHER';
  const l = name.toLowerCase();
  for (const [k,v] of Object.entries(LEAGUE_NAME_MAP)) {
    if (l.includes(k)) return v;
  }
  return 'OTHER';
}

function seasonCode(year) {
  const y = parseInt(year);
  if (!y || y < 2008 || y > 2026) return null;
  return String(y).slice(2) + String(y+1).slice(2);
}

function ageAt(dob, year) {
  if (!dob || !year) return null;
  const a = Math.floor((new Date(year,7,1) - new Date(dob)) / (365.25*24*3600*1000));
  return (a>10 && a<50) ? a : null;
}

async function bsd(path) {
  const r = await fetch(`${BSD}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` },
    signal: AbortSignal.timeout(5000)
  });
  if (!r.ok) throw new Error(`BSD ${r.status} ${path}`);
  return r.json();
}

// Cache league names in memory
const leagueCache = {};

async function getLeagueName(leagueId) {
  if (leagueCache[leagueId]) return leagueCache[leagueId];
  try {
    const d = await bsd(`/leagues/${leagueId}/`);
    const name = d.name || d.league_name || d.title || '';
    leagueCache[leagueId] = name;
    console.log(`League ${leagueId} = "${name}"`);
    return name;
  } catch(e) {
    leagueCache[leagueId] = '';
    return '';
  }
}

// Infer season years from season_id ordering
// BSD season_ids are sequential — higher = more recent
// Current season start year = 2025 (we're in June 2026, so 25/26 is current)
function inferSeasonYears(rows) {
  if (!rows.length) return {};
  
  // Sort by season_id descending (highest = most recent)
  const sorted = [...rows].sort((a,b) => b.season_id - a.season_id);
  
  // Current season: we're in June 2026, so the just-completed season is 2024/25
  // Most recent season_id = 2024 start year
  const currentYear = new Date().getFullYear(); // 2026
  const mostRecentStartYear = currentYear - 2; // 2024 (2024/25 season)
  
  const yearMap = {};
  sorted.forEach((row, index) => {
    yearMap[row.season_id] = mostRecentStartYear - index;
  });
  
  console.log('Season year inference:', JSON.stringify(yearMap));
  return yearMap;
}

async function buildPlayer(p) {
  let rows = [];
  try {
    const career = await bsd(`/players/${p.id}/career/`);
    rows = career.seasons || career.results || (Array.isArray(career) ? career : []);
  } catch(e) {
    console.log(`Career failed ${p.name}: ${e.message}`);
  }

  console.log(`${p.name} (${p.id}): ${rows.length} rows, season_ids: ${rows.map(r=>r.season_id).join(',')}`);

  const pos = POS_MAP[p.specific_position] || POS_MAP[p.position] || 'ST';
  
  // Infer years from season_id ordering
  const yearMap = inferSeasonYears(rows);
  
  // Get unique league IDs and fetch names in parallel
  const leagueIds = [...new Set(rows.map(r => r.league_id).filter(Boolean))];
  await Promise.all(leagueIds.map(id => getLeagueName(id)));

  const seasons = {};
  for (const row of rows) {
    const year = yearMap[row.season_id];
    if (!year || year < 2008 || year > 2026) continue;
    
    const sCode = seasonCode(year);
    if (!sCode) continue;

    const lName = leagueCache[row.league_id] || '';
    const league = lgCode(lName);

    const g = parseInt(row.goals) || 0;
    const a = parseInt(row.assists) || 0;
    const rt = row.avg_rating ? Math.round(row.avg_rating * 10) : 75;
    const age = ageAt(p.date_of_birth, year);

    // Keep best entry per season
    if (!seasons[sCode] || (g+a) > (seasons[sCode].g+seasons[sCode].a)) {
      seasons[sCode] = { pos, lg: league, g, a, rt, age, club: '' };
    }
  }

  console.log(`Seasons built: ${Object.keys(seasons).sort().join(', ') || 'NONE'}`);

  return {
    name: p.name,
    api_id: p.id,
    nationality: p.nationality || '',
    dob: p.date_of_birth || null,
    position: p.position || '',
    photo: `https://sports.bzzoiro.com/img/player/${p.id}/`,
    seasons,
    source: 'bsd'
  };
}

async function cachePlayer(p) {
  try {
    const { data: pl } = await supabase.from('players')
      .upsert({ api_id: p.api_id, name: p.name, nationality: p.nationality, photo_url: p.photo, updated_at: new Date().toISOString() }, { onConflict: 'api_id' })
      .select().single();
    if (!pl || !Object.keys(p.seasons).length) return;
    await supabase.from('player_seasons').upsert(
      Object.entries(p.seasons).map(([s,d]) => ({
        player_id: pl.id, api_id: p.api_id, season: s,
        season_year: 2000 + parseInt(s.slice(0,2)),
        league_code: d.lg, league_name: d.lg, league_api_id: 0,
        pos: d.pos, age: d.age, goals: d.g, assists: d.a, rt: d.rt, club: d.club||'',
        appearances: 0, minutes: 0,
      })),
      { onConflict: 'api_id,season,league_api_id' }
    );
  } catch(e) { console.log('Cache error:', e.message); }
}

function fmt(p, seasons) {
  const s = {};
  (seasons||[]).forEach(r => {
    if (r.season?.length===4) {
      s[r.season] = { pos:r.pos, lg:r.league_code, g:r.goals, a:r.assists, rt:r.rt||75, age:r.age, club:r.club };
    }
  });
  return { name:p.name, api_id:p.api_id, nationality:p.nationality, photo:p.photo_url, seasons:s, source:'cache' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  try {
    if (!process.env.BSD_API_KEY) {
      const { data } = await supabase.from('players').select('*,player_seasons(*)').ilike('name',`%${q}%`).limit(8);
      return res.json({ results: (data||[]).map(p=>fmt(p,p.player_seasons)), source:'no-key' });
    }

    // Always call BSD fresh — Supabase cache only as fallback
    const data = await bsd(`/players/?name=${encodeURIComponent(q)}&limit=10`);
    const players = data.results || [];
    console.log(`BSD "${q}": ${players.length} players`);

    if (!players.length) {
      const { data: cached } = await supabase.from('players').select('*,player_seasons(*)').ilike('name',`%${q}%`).limit(8);
      return res.json({ results: (cached||[]).map(p=>fmt(p,p.player_seasons)), source:'cache-fallback' });
    }

    const results = [];
    for (const p of players.slice(0,5)) {
      const player = await buildPlayer(p);
      await cachePlayer(player);
      results.push(player);
    }

    return res.json({ results, source:'bsd' });

  } catch(err) {
    console.error('Error:', err.message);
    const { data } = await supabase.from('players').select('*,player_seasons(*)').ilike('name',`%${q}%`).limit(8).catch(()=>({data:[]}));
    if (data?.length) return res.json({ results: data.map(p=>fmt(p,p.player_seasons)), source:'cache-error' });
    return res.status(500).json({ error: err.message });
  }
};
