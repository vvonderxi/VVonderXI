// /api/refresh-players.js — VVonderXI BIGGER  (CORRECTED)
// Vercel Cron Job — runs daily at 3am UTC
// FIX SUMMARY (vs previous version):
//   1) rt no longer = avg_rating*10 (which compressed to 63–76). It now maps the
//      BSD match rating onto VVonderXI's curated 0–96 scale via ratingToRt().
//   2) Club-only: ingest ONLY the 8 target domestic leagues (no Champions/Europa/cups).
//   3) 2025/26 now included in the season window (the season is finished = final data).
// NOTE: ratingToRt() is the one scoring-adjacent choice here — tune the two
//       calibration constants (RT_ANCHOR / RT_SLOPE) and sanity-check the result
//       against players you know before committing.

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BSD = 'https://sports.bzzoiro.com/api/v2';
const DELAY_MS = 350;

// ---- Club-only scope: the 8 domestic leagues. Anything else is skipped. ----
const TOP8 = ['PL','LL','BL','SA','L1','PRT','ERE','BPL'];

// ---- Season window (now includes 2526 since 2025/26 is a finished season) ----
const SEASON_KEEP = ['2526','2425','2324','2223','2122','2021','1920'];

const SEASON_CODE = y => `${String(y).slice(2)}${String(y+1).slice(2)}`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Calibration: BSD avg match rating (~5.5–8.5) -> VVonderXI 0–96 scale ----
// Calibrated so the BSD mean (~6.8) lands near the curated historical mean (~79).
// rt is a SEASON RATING; the VV Engine adds goals/assists output on top of it.
const RT_ANCHOR = 6.3;   // rating that maps to RT_BASE
const RT_BASE   = 70;    // rt at the anchor
const RT_SLOPE  = 17;    // rt points per +1.0 of match rating
function ratingToRt(avg, goals, assists) {
  const v = parseFloat(avg);
  if (avg != null && !isNaN(v)) {
    if (v > 20) return Math.max(50, Math.min(96, Math.round(v))); // already on 0–100
    const rt = Math.round(RT_BASE + (v - RT_ANCHOR) * RT_SLOPE);
    return Math.max(50, Math.min(96, rt));
  }
  // No rating available (older seasons): fall back to a rough output estimate
  const out = (parseInt(goals) || 0) + (parseInt(assists) || 0);
  return Math.max(50, Math.min(96, 60 + Math.round(out * 0.9)));
}

async function bsd(path) {
  const r = await fetch(`${BSD}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` },
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`BSD ${r.status} ${path}`);
  return r.json();
}

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
    'belgian pro league':'BPL',
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
      if (!year || year < 2019) continue;
      const sCode = SEASON_CODE(year);
      if (!SEASON_KEEP.includes(sCode)) continue;

      const league = await getLeagueCode(row.league_id);
      await sleep(DELAY_MS);
      if (!TOP8.includes(league)) continue; // CLUB-ONLY: skip European/cups/off-scope

      const goals = parseInt(row.goals) || 0;
      const assists = parseInt(row.assists) || 0;

      cards.push({
        player_id: player.id,
        api_player_id: player.api_player_id,
        season: sCode,
        season_year: year,
        league_code: league,
        team_name: row.team_name || '',
        position: player.position || 'MID',
        age: null,
        goals,
        assists,
        rating: row.avg_rating ? parseFloat(row.avg_rating) : null,
        rt: ratingToRt(row.avg_rating, goals, assists),  // <-- FIXED: 0–96 scale
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
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  if (!process.env.BSD_API_KEY) {
    return res.status(200).json({ message: 'No BSD_API_KEY configured — skipping refresh' });
  }
  try {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: players } = await supabase
      .from('players')
      .select('id, api_player_id, name, position, search_count, updated_at')
      .lte('updated_at', cutoff)
      .in('refresh_tier', [1, 2])
      .order('search_count', { ascending: false })
      .limit(15);

    const refreshed = [];
    let totalCards = 0;
    for (const player of (players || [])) {
      const count = await refreshPlayer(player);
      refreshed.push({ name: player.name, cards_updated: count });
      totalCards += count;
      await sleep(1000);
    }
    console.log(`Refresh: ${refreshed.length} players, ${totalCards} cards updated`);
    return res.json({ success: true, refreshed: refreshed.length, cards_updated: totalCards, players: refreshed });
  } catch(err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ error: err.message });
  }
};
