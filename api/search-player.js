// /api/search-player.js — VVonderXI
// BSD career endpoint returns: season_id, league_id, goals, assists (NO year/name)
// Fix: fetch /seasons/{id}/ and /leagues/{id}/ individually per row

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BSD = 'https://sports.bzzoiro.com/api/v2';

const LEAGUE_MAP = {
  'premier league':'PL','la liga':'LL','bundesliga':'BL','serie a':'SA',
  'ligue 1':'L1','primeira liga':'PRT','liga portugal':'PRT','eredivisie':'ERE',
  'belgian pro league':'BPL','champions league':'CL','uefa champions league':'CL',
  'europa league':'UEL','saudi pro league':'SPL','mls':'MLS',
  'scottish premiership':'SPM','super lig':'TSL','turkish super lig':'TSL',
  'argentine primera':'ARG','liga profesional':'ARG','brasileirao':'BRZ',
};

const POS_MAP = {
  'G':'GK','GK':'GK','Goalkeeper':'GK',
  'D':'CB','CB':'CB','LB':'LB','RB':'RB','Centre-Back':'CB',
  'Left Back':'LB','Right Back':'RB','Defender':'CB',
  'M':'CM','CM':'CM','CDM':'CDM','CAM':'CAM','Midfielder':'CM',
  'Central Midfield':'CM','Defensive Midfield':'CDM','Attacking Midfield':'CAM',
  'F':'ST','ST':'ST','CF':'CF','LW':'LW','RW':'RW',
  'Centre-Forward':'ST','Striker':'ST','Forward':'ST',
  'Left Winger':'LW','Right Winger':'RW','Left Wing':'LW','Right Wing':'RW',
  'Winger':'LW','Attacker':'ST',
};

function lgCode(name) {
  if (!name) return 'OTHER';
  const l = name.toLowerCase();
  for (const [k,v] of Object.entries(LEAGUE_MAP)) {
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

// Cache season_id -> year lookups in memory (persists for function lifetime)
const seasonCache = {};
const leagueCache = {};

async function getSeasonYear(seasonId) {
  if (seasonCache[seasonId]) return seasonCache[seasonId];
  try {
    const d = await bsd(`/seasons/${seasonId}/`);
    // BSD season fields: name "2023/24", start_date, year, season_year
    let year = null;
    if (d.name) {
      const m = d.name.match(/(\d{4})[\/\-]/);
      if (m) year = parseInt(m[1]);
    }
    if (!year && d.start_date) year = new Date(d.start_date).getFullYear();
    if (!year && d.year >= 2008) year = d.year;
    if (!year && d.season_year >= 2008) year = d.season_year;
    if (year) {
      seasonCache[seasonId] = year;
      console.log(`Season ${seasonId} = ${year} (from: ${JSON.stringify(d)})`);
    }
    return year;
  } catch(e) {
    console.log(`Season ${seasonId} fetch failed: ${e.message}`);
    return null;
  }
}

async function getLeagueCode(leagueId) {
  if (leagueCache[leagueId]) return leagueCache[leagueId];
  try {
    const d = await bsd(`/leagues/${leagueId}/`);
    const name = d.name || d.league_name || '';
    const code = lgCode(name);
    leagueCache[leagueId] = code;
    console.log(`League ${leagueId} = ${code} (${name})`);
    return code;
  } catch(e) {
    return 'OTHER';
  }
}

async function buildPlayer(p) {
  let rows = [];
  try {
    const career = await bsd(`/players/${p.id}/career/`);
    rows = career.seasons || career.results || (Array.isArray(career) ? career : []);
  } catch(e) {
    console.log(`Career failed for ${p.name}: ${e.message}`);
  }

  console.log(`${p.name} (${p.id}): ${rows.length} rows`);

  const pos = POS_MAP[p.specific_position] || POS_MAP[p.position] || 'ST';
  const seasons = {};

  for (const row of rows) {
    // Get year from season_id
    const year = await getSeasonYear(row.season_id);
    if (!year) continue;

    const sCode = seasonCode(year);
    if (!sCode) continue;

    // Get league from league_id
    const league = await getLeagueCode(row.league_id);

    const g = parseInt(row.goals) || 0;
    const a = parseInt(row.assists) || 0;
    const rt = row.avg_rating ? Math.round(row.avg_rating * 10) : 75;
    const age = ageAt(p.date_of_birth, year);

    if (!seasons[sCode] || (g+a) > (seasons[sCode].g+seasons[sCode].a)) {
      seasons[sCode] = { pos, lg: league, g, a, rt, age, club: '' };
    }
  }

  console.log(`Seasons: ${Object.keys(seasons).sort().join(', ') || 'NONE'}`);

  return {
    name: p.name,
    api_id: p.id,
    nationality: p.nationality || '',
    dob: p.date_of_birth || null,
    position: p.position || '',
    photo: `${BSD.replace('/api/v2','')}/img/player/${p.id}/`,
    seasons,
    source: 'bsd'
  };
}

async function cache(p) {
  try {
    const { data: pl } = await supabase.from('players')
      .upsert({ api_id: p.api_id, name: p.name, nationality: p.nationality, photo_url: p.photo, updated_at: new Date().toISOString() }, { onConflict: 'api_id' })
      .select().single();
    if (!pl || !Object.keys(p.seasons).length) return;
    await supabase.from('player_seasons').upsert(
      Object.entries(p.seasons).map(([s,d]) => ({
        player_id: pl.id, api_id: p.api_id, season: s,
        season_year: 2000+parseInt(s.slice(0,2)),
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
    if (r.season?.length===4) s[r.season] = { pos:r.pos, lg:r.league_code, g:r.goals, a:r.assists, rt:r.rt||75, age:r.age, club:r.club };
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

    const data = await bsd(`/players/?name=${encodeURIComponent(q)}&limit=10`);
    const players = data.results || [];
    console.log(`Search "${q}": ${players.length} results`);

    if (!players.length) {
      const { data: cached } = await supabase.from('players').select('*,player_seasons(*)').ilike('name',`%${q}%`).limit(8);
      return res.json({ results: (cached||[]).map(p=>fmt(p,p.player_seasons)), source:'cache-fallback' });
    }

    const results = [];
    for (const p of players.slice(0,5)) {
      const player = await buildPlayer(p);
      await cache(player);
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
