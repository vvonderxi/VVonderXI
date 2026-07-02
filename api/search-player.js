// /api/search-player.js — VVonderXI BIGGER
// BSD career endpoint → Supabase player_season_cards
// Table change: player_seasons → player_season_cards

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

// In-memory caches (persist for function lifetime on warm instances)
const seasonCache = {};
const leagueCache = {};

async function getSeasonYear(seasonId) {
  if (seasonCache[seasonId]) return seasonCache[seasonId];
  try {
    const d = await bsd(`/seasons/${seasonId}/`);
    let year = null;
    if (d.name) { const m = d.name.match(/(\d{4})[\/\-]/); if (m) year = parseInt(m[1]); }
    if (!year && d.start_date) year = new Date(d.start_date).getFullYear();
    if (!year && d.year >= 2008) year = d.year;
    if (!year && d.season_year >= 2008) year = d.season_year;
    if (year) seasonCache[seasonId] = year;
    return year;
  } catch(e) { return null; }
}

async function getLeagueCode(leagueId) {
  if (leagueCache[leagueId]) return leagueCache[leagueId];
  try {
    const d = await bsd(`/leagues/${leagueId}/`);
    const code = lgCode(d.name || d.league_name || '');
    leagueCache[leagueId] = code;
    return code;
  } catch(e) { return 'OTHER'; }
}

async function buildPlayer(p) {
  let rows = [];
  try {
    const career = await bsd(`/players/${p.id}/career/`);
    rows = career.seasons || career.results || (Array.isArray(career) ? career : []);
  } catch(e) {
    console.log(`Career failed for ${p.name}: ${e.message}`);
  }

  const pos = POS_MAP[p.specific_position] || POS_MAP[p.position] || 'ST';
  const seasons = {};

  for (const row of rows) {
    const year = await getSeasonYear(row.season_id);
    if (!year) continue;
    const sCode = seasonCode(year);
    if (!sCode) continue;
    const league = await getLeagueCode(row.league_id);
    const g = parseInt(row.goals) || 0;
    const a = parseInt(row.assists) || 0;
    const rt = row.avg_rating ? Math.round(parseFloat(row.avg_rating) * 10) : 75;
    const age = ageAt(p.date_of_birth, year);

    if (!seasons[sCode] || (g+a) > (seasons[sCode].g + seasons[sCode].a)) {
      seasons[sCode] = { pos, lg: league, g, a, rt, age, club: row.team_name || '' };
    }
  }

  return {
    name: p.name,
    api_id: p.id,
    nationality: p.nationality || '',
    dob: p.date_of_birth || null,
    position: pos,
    seasons,
    source: 'bsd'
  };
}

async function cachePlayer(p) {
  try {
    // Upsert into players table (BIGGER schema: api_player_id, not api_id)
    const { data: pl } = await supabase.from('players')
      .upsert({
        api_player_id: p.api_id,
        name: p.name,
        nationality: p.nationality,
        position: p.position,
        date_of_birth: p.dob || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'api_player_id' })
      .select('id').single();

    if (!pl || !Object.keys(p.seasons).length) return;

    // Upsert into player_season_cards (BIGGER schema)
    await supabase.from('player_season_cards').upsert(
      Object.entries(p.seasons).map(([s, d]) => ({
        player_id: pl.id,
        api_player_id: p.api_id,
        season: s,
        season_year: 2000 + parseInt(s.slice(0, 2)),
        league_code: d.lg,
        team_name: d.club || '',
        position: d.pos,
        age: d.age,
        goals: d.g,
        assists: d.a,
        rt: d.rt,
        appearances: 0,
        minutes: 0,
      })),
      { onConflict: 'api_player_id,season,league_code' }
    );

    // Track search count — direct increment (rpc 'increment' doesn't exist on free tier)
    await supabase.rpc('increment_search_count', { player_id: pl.id })
      .catch(async () => {
        // Fallback: fetch current count and increment manually
        try {
          const { data: cur } = await supabase.from('players')
            .select('search_count').eq('id', pl.id).single();
          await supabase.from('players')
            .update({ search_count: ((cur?.search_count || 0) + 1) })
            .eq('id', pl.id);
        } catch(e) {} // Non-critical — ignore
      });
  } catch(e) {
    console.log('Cache error:', e.message);
  }
}

// Look a name up in Supabase (our cache: seeded curated players + anything BSD
// has fetched before). Returns formatted players that actually have season data.
async function searchSupabase(q) {
  const { data, error } = await supabase.rpc('search_players', { q });
  if (error || !data) return [];

  // RPC returns [{ player: {...} }] ranked (exact/word/prefix/substring, then peak rt).
  // Reshape each into the cache format, dedupe by name (a player may exist twice:
  // seeded + BSD-cached — keep the richer one), keep only players with seasons.
  const byName = {};
  for (const row of data) {
    const p = row.player;
    if (!p) continue;
    const seasons = {};
    (p.season_cards || []).forEach(r => {
      if (r.season?.length === 4) {
        seasons[r.season] = {
          pos: r.position, lg: r.league_code,
          g: r.goals, a: r.assists, rt: r.rt || 75,
          age: r.age, club: r.team_name || ''
        };
      }
    });
    const count = Object.keys(seasons).length;
    if (count === 0) continue;
    const f = { name: p.name, api_id: p.api_player_id, nationality: p.nationality, seasons, source: 'cache' };
    const existing = byName[f.name];
    if (!existing || count > Object.keys(existing.seasons).length) byName[f.name] = f;
  }
  return Object.values(byName).slice(0, 8);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

  try {
    // ── 1. SUPABASE FIRST ────────────────────────────────────────────
    // Our own cache (681 seeded players + anything fetched before).
    // Fast, free, no BSD quota used.
    const cached = await searchSupabase(q);
    if (cached.length) {
      return res.json({ results: cached, source: 'supabase' });
    }

    // ── 2. NO BSD KEY → nothing more we can do ───────────────────────
    if (!process.env.BSD_API_KEY) {
      return res.json({ results: [], source: 'no-key' });
    }

    // ── 3. BSD LIVE (only when the cache misses) ─────────────────────
    // Fetch from BSD, cache into Supabase for next time, return.
    const data = await bsd(`/players/?name=${encodeURIComponent(q)}&limit=10`);
    const players = data.results || [];

    if (!players.length) {
      return res.json({ results: [], source: 'zero' });
    }

    const results = [];
    for (const p of players.slice(0, 5)) {
      const player = await buildPlayer(p);
      await cachePlayer(player); // saves to Supabase → enriches the cache
      // Only keep players that actually have analyzable season data.
      // (BSD sometimes knows a player's profile but has zero stats — e.g. some
      // leagues on the free tier. A player with no seasons is useless to analyse.)
      if (player.seasons && Object.keys(player.seasons).length > 0) {
        results.push(player);
      }
    }

    if (!results.length) {
      return res.json({ results: [], source: 'zero' });
    }

    return res.json({ results, source: 'bsd' });

  } catch(err) {
    console.error('search-player error:', err.message);
    // Best-effort: if BSD blew up, try the cache one more time
    try {
      const cached = await searchSupabase(q);
      if (cached.length) return res.json({ results: cached, source: 'cache-error' });
    } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
