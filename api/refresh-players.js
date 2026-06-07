// /api/refresh-players.js — VVonderXI BIGGER
// Vercel Cron Job — runs daily at 3am UTC
// Refreshes stale players in priority order:
//   Tier 1: search_count >= 50 → daily refresh
//   Tier 2: search_count >= 10 → weekly refresh
//   Tier 3: all others → on-demand only
// Uses BSD API (not RapidAPI). Table: player_season_cards.

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BSD = 'https://sports.bzzoiro.com/api/v2';
const DELAY_MS = 350;

const SEASON_CODE = y => `${String(y).slice(2)}${String(y+1).slice(2)}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function bsd(path) {
  const r = await fetch(`${BSD}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`BSD ${r.status} ${path}`);
  return r.json();
}

// Season/league ID caches
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
    if (year) seasonCache[seasonId] = year;
    return year;
  } catch { return null; }
}

async function getLeagueCode(leagueId) {
  if (leagueCache[leagueId]) return leagueCache[leagueId];
  const LEAGUE_MAP = {
    'premier league':'PL','la liga':'LL','bundesliga':'BL','serie a':'SA',
    'ligue 1':'L1','primeira liga':'PRT','liga portugal':'PRT','eredivisie':'ERE',
    'belgian pro league':'BPL','champions league':'CL','saudi pro league':'SPL','mls':'MLS',
  };
  try {
    const d = await bsd(`/leagues/${leagueId}/`);
    const name = (d.name || '').toLowerCase();
    let code = 'OTHER';
    for (const [k,v] of Object.entries(LEAGUE_MAP)) {
      if (name.includes(k)) { code = v; break; }
    }
    leagueCache[leagueId] = code;
    return code;
  } catch { return 'OTHER'; }
}

async function refreshPlayer(player) {
  try {
    const career = await bsd(`/players/${player.api_player_id}/career/`);
    await sleep(DELAY_MS);
    const rows = career.seasons || career.results || (Array.isArray(career) ? career : []);

    const cards = [];
    for (const row of rows) {
      const year = await getSeasonYear(row.season_id);
      await sleep(DELAY_MS);
      if (!year || year < 2019) continue; // Only refresh 6-season window
      const sCode = SEASON_CODE(year);
      if (!['2425','2324','2223','2122','2021','1920'].includes(sCode)) continue;
      const league = await getLeagueCode(row.league_id);
      await sleep(DELAY_MS);

      cards.push({
        player_id: player.id,
        api_player_id: player.api_player_id,
        season: sCode,
        season_year: year,
        league_code: league,
        team_name: row.team_name || '',
        position: player.position || 'MID',
        age: null, // recalculated below if dob available
        goals: parseInt(row.goals) || 0,
        assists: parseInt(row.assists) || 0,
        rating: row.avg_rating ? parseFloat(row.avg_rating) : null,
        rt: row.avg_rating ? Math.round(parseFloat(row.avg_rating) * 10) : null,
        appearances: parseInt(row.appearances) || 0,
        minutes: parseInt(row.minutes) || 0,
      });
    }

    if (cards.length) {
      await supabase.from('player_season_cards')
        .upsert(cards, { onConflict: 'api_player_id,season,league_code' });
    }

    await supabase.from('players')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', player.id);

    return cards.length;
  } catch(e) {
    console.error(`Refresh failed for ${player.name}: ${e.message}`);
    return 0;
  }
}

module.exports = async (req, res) => {
  // Verify cron auth
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  if (!process.env.BSD_API_KEY) {
    return res.status(200).json({ message: 'No BSD_API_KEY configured — skipping refresh' });
  }

  try {
    // Get Tier 1 + Tier 2 players that haven't been updated today
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: players } = await supabase
      .from('players')
      .select('id, api_player_id, name, position, search_count, updated_at')
      .lte('updated_at', cutoff)
      .in('refresh_tier', [1, 2])
      .order('search_count', { ascending: false })
      .limit(15); // Stay within 15 players × ~8 API calls each = 120 calls max

    const refreshed = [];
    let totalCards = 0;

    for (const player of (players || [])) {
      const count = await refreshPlayer(player);
      refreshed.push({ name: player.name, cards_updated: count });
      totalCards += count;
      await sleep(1000); // Pause between players
    }

    console.log(`Refresh: ${refreshed.length} players, ${totalCards} cards updated`);
    return res.json({
      success: true,
      refreshed: refreshed.length,
      cards_updated: totalCards,
      players: refreshed
    });

  } catch(err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: err.message });
  }
};
