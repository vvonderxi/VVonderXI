#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  VVonderXI — Player CAREER BACKFILL   (v3 — career-driven)
//  BSD /players/{id}/career/ → Supabase player_season_cards
//
//  WHY THIS REPLACES THE OLD IMPORTER:
//    BSD v2 has NO league-season roster endpoint (every /seasons/{id}/players,
//    /topscorers, /standings, /teams returned 404). The ONLY source of per-season
//    goals/assists/minutes/rating is /players/{id}/career/. So we no longer try to
//    "discover" players — we BACKFILL the players already in Supabase by walking
//    each one's career and rebuilding clean cards.
//
//  PER PLAYER (2 calls): /players/{id}/  (position, DOB, height, foot) +
//                        /players/{id}/career/  (the season stat rows)
//  SCOPE:   top-8 domestic leagues · 2019/20 → 2025/26 · min 300 minutes/season
//  rt:      calibrated 0–96 (unchanged) · positions: SPECIFIC kept (CF stays CF)
//  SAFE:    upsert — re-running never duplicates.
//
//  RUN:
//    CMD="node api/import-players.js --dry-run --limit 10"   → 10-player dry test
//    CMD="node api/import-players.js --dry-run"              → full dry run, no writes
//    CMD="node api/import-players.js"                        → real backfill
// ══════════════════════════════════════════════════════════════════════

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BSD_BASE     = 'https://sports.bzzoiro.com/api/v2';
const BSD_KEY      = process.env.BSD_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!BSD_KEY)      { console.error('❌  BSD_API_KEY not set');       process.exit(1); }
if (!SUPABASE_URL) { console.error('❌  SUPABASE_URL not set');      process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌  SUPABASE_SERVICE_KEY not set'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args     = process.argv.slice(2);
const DRY_RUN  = args.includes('--dry-run');
const LIMIT    = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

const DELAY_MS    = 350;  // BSD fair-use
const MIN_MINUTES = 300;  // a season needs >= this many minutes to become a card

// ── Scope ────────────────────────────────────────────────────────────
const LEAGUES = [
  { code: 'PL',  bsdLeagueId: 1  }, { code: 'LL',  bsdLeagueId: 3  },
  { code: 'BL',  bsdLeagueId: 5  }, { code: 'SA',  bsdLeagueId: 4  },
  { code: 'L1',  bsdLeagueId: 6  }, { code: 'PRT', bsdLeagueId: 2  },
  { code: 'ERE', bsdLeagueId: 10 }, { code: 'BPL', bsdLeagueId: 14 },
];
const SEASONS = [
  { code: '2526', year: 2025 }, { code: '2425', year: 2024 },
  { code: '2324', year: 2023 }, { code: '2223', year: 2022 },
  { code: '2122', year: 2021 }, { code: '2021', year: 2020 },
  { code: '1920', year: 2019 },
];
const YEAR_TO_CODE       = Object.fromEntries(SEASONS.map(s => [s.year, s.code]));
const LEAGUE_BY_BSD_ID   = Object.fromEntries(LEAGUES.map(l => [l.bsdLeagueId, l.code]));

// ── Position: SPECIFIC positions kept. CF stays CF (per spec). ────────
const POS_MAP = {
  'G':'GK','GK':'GK','Goalkeeper':'GK',
  'D':'CB','CB':'CB','LB':'LB','RB':'RB',
  'Centre-Back':'CB','Left Back':'LB','Right Back':'RB','Defender':'CB','Central Defender':'CB',
  'M':'CM','CM':'CM','CDM':'CDM','CAM':'CAM',
  'Midfielder':'CM','Central Midfield':'CM','Defensive Midfield':'CDM','Attacking Midfield':'CAM',
  'CF':'ST','Centre-Forward':'ST','ST':'ST','Striker':'ST',   // CF folded into ST
  'LW':'LW','RW':'RW','Left Winger':'LW','Right Winger':'RW',
  'Left Wing':'LW','Right Wing':'RW',
  'F':'ST','Forward':'ST','Attacker':'ST','Winger':'LW',       // vague labels default
};
function normalisePos(raw) {
  if (!raw) return 'MID';
  return POS_MAP[raw] || POS_MAP[String(raw).trim()] || String(raw).slice(0,3).toUpperCase();
}

// ── rt calibration (UNCHANGED — parked engine knob) ──────────────────
const RT_ANCHOR = 6.3, RT_BASE = 70, RT_SLOPE = 17;
function ratingToRt(avg, goals, assists) {
  const v = parseFloat(avg);
  if (avg != null && !isNaN(v)) {
    if (v > 20) return Math.max(50, Math.min(96, Math.round(v)));
    return Math.max(50, Math.min(96, Math.round(RT_BASE + (v - RT_ANCHOR) * RT_SLOPE)));
  }
  const out = (parseInt(goals)||0) + (parseInt(assists)||0);
  return Math.max(50, Math.min(96, 60 + Math.round(out * 0.9)));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function bsdFetch(path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BSD_BASE}${path}`, {
        headers: { 'Authorization': `Token ${BSD_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 429) { console.warn(`  ⚠️  429 on ${path} — waiting 5s`); await sleep(5000); continue; }
      if (res.status === 404) { const e = new Error(`BSD 404 — ${path}`); e.noRetry = true; throw e; }
      if (!res.ok) throw new Error(`BSD ${res.status} — ${path}`);
      stats.apiCalls++;
      return await res.json();
    } catch (err) {
      if (err.noRetry || attempt === retries) throw err;
      console.warn(`  ⚠️  Retry ${attempt}/${retries} for ${path}: ${err.message}`);
      await sleep(2000 * attempt);
    }
  }
}

function calcAge(dob, seasonYear) {
  if (!dob || !seasonYear) return null;
  const age = Math.floor((new Date(seasonYear, 7, 1) - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
  return (age > 10 && age < 50) ? age : null;
}

const stats = { apiCalls: 0, playersProcessed: 0, cardsInserted: 0, cardsSkipped: 0, skippedNoId: 0, errors: 0, startTime: Date.now() };
function logProgress() {
  const s = Math.round((Date.now() - stats.startTime) / 1000);
  console.log(`\n📊  ${stats.playersProcessed} players · ${stats.cardsInserted} cards · ${stats.cardsSkipped} skipped · ${stats.apiCalls} calls · ${s}s`);
}

// ── Supabase + BSD lookups (cached) ──────────────────────────────────
const leagueIdCache = {}, teamIdCache = {}, bsdTeamNameCache = {}, seasonById = {};

async function getLeagueId(code) {
  if (leagueIdCache[code] !== undefined) return leagueIdCache[code];
  const { data } = await supabase.from('leagues').select('id').eq('code', code).single();
  return (leagueIdCache[code] = data?.id || null);
}

async function getBsdTeamName(bsdTeamId) {
  if (!bsdTeamId) return '';
  if (bsdTeamNameCache[bsdTeamId] !== undefined) return bsdTeamNameCache[bsdTeamId];
  try {
    const d = await bsdFetch(`/teams/${bsdTeamId}/`);
    await sleep(DELAY_MS);
    return (bsdTeamNameCache[bsdTeamId] = d?.name || '');
  } catch { return (bsdTeamNameCache[bsdTeamId] = ''); }
}

async function getOrCreateTeamId(teamName) {
  if (!teamName) return null;
  const key = teamName.toLowerCase().trim();
  if (teamIdCache[key] !== undefined) return teamIdCache[key];
  const { data: existing } = await supabase.from('teams').select('id').ilike('name', teamName).maybeSingle();
  if (existing) return (teamIdCache[key] = existing.id);
  if (DRY_RUN) return (teamIdCache[key] = null);
  const { data: created } = await supabase.from('teams').upsert({ name: teamName }, { onConflict: 'name' }).select('id').single();
  return (teamIdCache[key] = created?.id || null);
}

// ── Preload: build season_id → { year, league_code } for the 8 leagues ─
async function preloadSeasonMap() {
  console.log('Preloading season ids for 8 leagues...');
  for (const league of LEAGUES) {
    try {
      const d = await bsdFetch(`/leagues/${league.bsdLeagueId}/seasons/?limit=50`);
      await sleep(DELAY_MS);
      const rows = d.seasons || d.results || (Array.isArray(d) ? d : []);
      for (const s of rows) {
        const year = parseInt(s.year) || parseInt(String(s.name || '').match(/(\d{4})/)?.[1]);
        if (YEAR_TO_CODE[year]) seasonById[s.id] = { year, league_code: league.code };
      }
    } catch (e) { console.warn(`  ⚠️  season preload failed for ${league.code}: ${e.message}`); }
  }
  console.log(`  → mapped ${Object.keys(seasonById).length} in-window league-seasons\n`);
}

// ── Load every player already in Supabase ────────────────────────────
async function loadAllPlayers() {
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('players')
      .select('id, api_player_id, name').not('api_player_id', 'is', null).range(from, from + PAGE - 1);
    if (error) throw new Error(`load players: ${error.message}`);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

async function upsertPlayerDetail(detail) {
  const payload = {
    api_player_id: detail.id,
    name:          detail.name,
    full_name:     detail.full_name || detail.name,
    nationality:   detail.nationality || null,
    position:      normalisePos(detail.specific_position || detail.position),
    date_of_birth: detail.date_of_birth || null,
    height_cm:     detail.height_cm || null,        // NEW
    preferred_foot: detail.preferred_foot || null,  // NEW
    updated_at:    new Date().toISOString(),
  };
  if (DRY_RUN) return Math.floor(Math.random() * 999999);
  const { data, error } = await supabase.from('players')
    .upsert(payload, { onConflict: 'api_player_id' }).select('id').single();
  if (error) throw new Error(`player upsert: ${error.message}`);
  return data.id;
}

async function upsertCard(card) {
  if (DRY_RUN) { stats.cardsInserted++; return; }
  const { error } = await supabase.from('player_season_cards').upsert(card, { onConflict: 'api_player_id,season,league_code' });
  if (error) { stats.errors++; console.error(`  ❌  card upsert: ${error.message}`); }
  else stats.cardsInserted++;
}

// ── Backfill one player ──────────────────────────────────────────────
async function backfillPlayer(p) {
  try {
    const detail = await bsdFetch(`/players/${p.api_player_id}/`);
    await sleep(DELAY_MS);
    const career = await bsdFetch(`/players/${p.api_player_id}/career/`);
    await sleep(DELAY_MS);

    const playerId = await upsertPlayerDetail(detail);
    const position = normalisePos(detail.specific_position || detail.position);
    const rows = career.seasons || career.results || (Array.isArray(career) ? career : []);

    for (const row of rows) {
      const meta = seasonById[row.season_id];
      if (!meta) continue;                       // not a top-8 in-window season
      // cross-check league via career row's league_id when present
      if (row.league_id != null && LEAGUE_BY_BSD_ID[row.league_id]
          && LEAGUE_BY_BSD_ID[row.league_id] !== meta.league_code) continue;

      const minutes = parseInt(row.minutes) || 0;
      if (minutes < MIN_MINUTES) { stats.cardsSkipped++; continue; }

      const goals   = parseInt(row.goals)   || 0;
      const assists = parseInt(row.assists) || 0;
      const matches = parseInt(row.matches) || parseInt(row.appearances) || 0;
      const avg     = row.avg_rating;

      const teamName = await getBsdTeamName(row.team_id);
      const teamId   = teamName ? await getOrCreateTeamId(teamName) : null;
      const leagueId = await getLeagueId(meta.league_code);
      const seasonCode = YEAR_TO_CODE[meta.year];
      const rtVal = ratingToRt(avg, goals, assists);

      if (DRY_RUN) {
        console.log(`   • ${detail.name} ${seasonCode} ${meta.league_code} ${position} — ${goals}g ${assists}a ${minutes}m rt${rtVal}`);
      }

      await upsertCard({
        player_id:     playerId,
        team_id:       teamId,
        league_id:     leagueId,
        api_player_id: p.api_player_id,
        season:        seasonCode,
        season_year:   meta.year,
        league_code:   meta.league_code,
        team_name:     teamName,
        position,
        age:           calcAge(detail.date_of_birth, meta.year),
        appearances:   matches,
        minutes,
        goals,
        assists,
        rating:        (avg != null && avg !== '') ? parseFloat(avg) : null,
        rt:            rtVal,
      });
    }
    stats.playersProcessed++;
  } catch (e) {
    stats.errors++;
    console.error(`  ❌  ${p.name} (${p.api_player_id}): ${e.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────
(async () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log(`║  VVonderXI — CAREER BACKFILL  ${DRY_RUN ? '(DRY RUN)        ' : '(LIVE)           '}║`);
  console.log('╚════════════════════════════════════════════════╝');

  await preloadSeasonMap();

  let players = await loadAllPlayers();
  console.log(`Loaded ${players.length} players from Supabase.`);
  const orphaned = players.filter(p => !(Number(p.api_player_id) > 0));
  players = players.filter(p => Number(p.api_player_id) > 0);
  stats.skippedNoId = orphaned.length;
  console.log(`  ${orphaned.length} have no real BSD id (synthetic/legend) — skipped.`);
  console.log(`  ${players.length} have a real BSD id — will backfill.`);
  if (LIMIT) { players = players.slice(0, LIMIT); console.log(`--limit ${LIMIT} → testing on ${players.length}.`); }
  console.log('');

  for (let i = 0; i < players.length; i++) {
    await backfillPlayer(players[i]);
    if ((i + 1) % 25 === 0) logProgress();
  }

  logProgress();
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  BACKFILL COMPLETE                              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`  Players processed:  ${stats.playersProcessed}`);
  console.log(`  Cards inserted:     ${stats.cardsInserted}`);
  console.log(`  Cards skipped (<${MIN_MINUTES}m): ${stats.cardsSkipped}`);
  console.log(`  Players skipped (no BSD id):   ${stats.skippedNoId}`);
  console.log(`  API calls:          ${stats.apiCalls}`);
  console.log(`  Errors:             ${stats.errors}`);
})();
