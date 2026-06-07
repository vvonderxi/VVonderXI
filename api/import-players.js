#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  VVonderXI — Bulk Player Import Script
//  BSD/API-Football → Supabase player_season_cards
//
//  Scope:    Top 8 leagues · 6 seasons (2019/20 → 2024/25)
//  Target:   35,000–50,000 player-season cards · ~120–200 MB
//  Runtime:  3–6 hours depending on API rate limits
//
//  RESUMABLE: tracks progress in import_log table
//  SAFE:      upsert logic — re-running never duplicates data
//  RATE-LIMITED: 350ms between calls (BSD fair-use)
//
//  HOW TO RUN:
//    1. Copy .env.example to .env and fill in your keys
//    2. Run: node api/import-players.js
//    3. To resume after stopping: just run again — it skips completed pages
//    4. To force re-import a specific league/season: see --force flag below
//
//  FLAGS:
//    node import-players.js                    → full import (resumes)
//    node import-players.js --dry-run          → estimate only, no writes
//    node import-players.js --league PL        → one league only
//    node import-players.js --season 2425      → one season only
//    node import-players.js --force            → re-import even if complete
//    node import-players.js --estimate         → print estimates and exit
// ══════════════════════════════════════════════════════════════════════

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ─────────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────────
const BSD_BASE   = 'https://sports.bzzoiro.com/api/v2';
const BSD_KEY    = process.env.BSD_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!BSD_KEY)      { console.error('❌  BSD_API_KEY not set in .env'); process.exit(1); }
if (!SUPABASE_URL) { console.error('❌  SUPABASE_URL not set in .env'); process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌  SUPABASE_SERVICE_KEY not set in .env'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI flags
const args = process.argv.slice(2);
const DRY_RUN       = args.includes('--dry-run');
const ESTIMATE_ONLY = args.includes('--estimate');
const FORCE         = args.includes('--force');
const FILTER_LEAGUE = args[args.indexOf('--league') + 1] || null;
const FILTER_SEASON = args[args.indexOf('--season') + 1] || null;

const DELAY_MS = 350; // ms between API calls — BSD fair-use rate limit

// ─────────────────────────────────────────────────
//  LEAGUE CONFIG
//  BSD uses league_id (from the /leagues/ endpoint)
//  These IDs are known from existing search-player.js mapping
// ─────────────────────────────────────────────────
const LEAGUES = [
  { code: 'PL',  name: 'Premier League',     bsdLeagueId: 8,   f: 1.000, country: 'England'     },
  { code: 'LL',  name: 'La Liga',            bsdLeagueId: 87,  f: 0.978, country: 'Spain'        },
  { code: 'BL',  name: 'Bundesliga',         bsdLeagueId: 35,  f: 0.940, country: 'Germany'      },
  { code: 'SA',  name: 'Serie A',            bsdLeagueId: 115, f: 0.935, country: 'Italy'        },
  { code: 'L1',  name: 'Ligue 1',            bsdLeagueId: 34,  f: 0.878, country: 'France'       },
  { code: 'PRT', name: 'Primeira Liga',      bsdLeagueId: 131, f: 0.845, country: 'Portugal'     },
  { code: 'ERE', name: 'Eredivisie',         bsdLeagueId: 29,  f: 0.820, country: 'Netherlands'  },
  { code: 'BPL', name: 'Belgian Pro League', bsdLeagueId: 144, f: 0.790, country: 'Belgium'      },
];

// ─────────────────────────────────────────────────
//  SEASON CONFIG
//  BSD seasons: each league has a season entry per year
//  We map start-year → VVonderXI season code
//  NOTE: BSD season IDs differ per league. We discover them dynamically.
// ─────────────────────────────────────────────────
const SEASONS = [
  { code: '2425', year: 2024, label: '2024/25' },
  { code: '2324', year: 2023, label: '2023/24' },
  { code: '2223', year: 2022, label: '2022/23' },
  { code: '2122', year: 2021, label: '2021/22' },
  { code: '2021', year: 2020, label: '2020/21' },
  { code: '1920', year: 2019, label: '2019/20' },
];

// ─────────────────────────────────────────────────
//  POSITION NORMALISATION
// ─────────────────────────────────────────────────
const POS_MAP = {
  'G': 'GK', 'GK': 'GK', 'Goalkeeper': 'GK',
  'D': 'CB', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'Centre-Back': 'CB', 'Left Back': 'LB', 'Right Back': 'RB',
  'Defender': 'CB', 'Central Defender': 'CB',
  'M': 'CM', 'CM': 'CM', 'CDM': 'CDM', 'CAM': 'CAM',
  'Midfielder': 'CM', 'Central Midfield': 'CM',
  'Defensive Midfield': 'CDM', 'Attacking Midfield': 'CAM',
  'F': 'ST', 'ST': 'ST', 'CF': 'ST', 'LW': 'LW', 'RW': 'RW',
  'Centre-Forward': 'ST', 'Striker': 'ST', 'Forward': 'ST',
  'Left Winger': 'LW', 'Right Winger': 'RW',
  'Left Wing': 'LW', 'Right Wing': 'RW', 'Winger': 'LW', 'Attacker': 'ST',
};

function normalisePos(raw) {
  if (!raw) return 'MID';
  return POS_MAP[raw] || POS_MAP[raw.trim()] || raw.slice(0, 3).toUpperCase();
}

// ─────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bsdFetch(path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BSD_BASE}${path}`, {
        headers: { 'Authorization': `Token ${BSD_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.status === 429) {
        console.warn(`  ⚠️  Rate limited on ${path} — waiting 5s...`);
        await sleep(5000);
        continue;
      }
      if (!res.ok) throw new Error(`BSD ${res.status} — ${path}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠️  Retry ${attempt}/${retries} for ${path}: ${err.message}`);
      await sleep(2000 * attempt);
    }
  }
}

function convertRating(raw) {
  if (!raw) return null;
  const r = parseFloat(raw);
  if (r > 10) return Math.min(100, Math.round(r));  // already 0-100
  return Math.round(r * 10);                         // 0-10 → 0-100
}

function calcAge(dob, seasonYear) {
  if (!dob || !seasonYear) return null;
  const start = new Date(seasonYear, 7, 1); // Aug 1st of season start
  const birth = new Date(dob);
  const age = Math.floor((start - birth) / (365.25 * 24 * 3600 * 1000));
  return (age > 10 && age < 50) ? age : null;
}

// ─────────────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────────────
let stats = {
  apiCalls: 0,
  playersProcessed: 0,
  cardsInserted: 0,
  cardsSkipped: 0,
  errors: 0,
  startTime: Date.now(),
};

function logProgress() {
  const elapsed = Math.round((Date.now() - stats.startTime) / 1000);
  const rate = stats.apiCalls > 0 ? Math.round(elapsed / stats.apiCalls) : 0;
  console.log(`\n📊 Progress: ${stats.playersProcessed} players · ${stats.cardsInserted} cards inserted · ${stats.apiCalls} API calls · ${elapsed}s elapsed`);
}

// ─────────────────────────────────────────────────
//  SUPABASE HELPERS
// ─────────────────────────────────────────────────
let supabaseLeagueIdCache = {};
let supabaseTeamIdCache   = {};

async function getLeagueId(code) {
  if (supabaseLeagueIdCache[code]) return supabaseLeagueIdCache[code];
  const { data } = await supabase.from('leagues').select('id').eq('code', code).single();
  supabaseLeagueIdCache[code] = data?.id || null;
  return supabaseLeagueIdCache[code];
}

async function getOrCreateTeamId(teamName) {
  if (!teamName) return null;
  const key = teamName.toLowerCase().trim();
  if (supabaseTeamIdCache[key]) return supabaseTeamIdCache[key];
  // Try to find existing
  const { data: existing } = await supabase.from('teams').select('id').ilike('name', teamName).maybeSingle();
  if (existing) {
    supabaseTeamIdCache[key] = existing.id;
    return existing.id;
  }
  // Create new (with no colours — will get defaults)
  const { data: created } = await supabase.from('teams')
    .upsert({ name: teamName }, { onConflict: 'name' })
    .select('id').single();
  supabaseTeamIdCache[key] = created?.id || null;
  return supabaseTeamIdCache[key];
}

async function upsertPlayer(bsdPlayer) {
  if (DRY_RUN) return Math.floor(Math.random() * 999999);
  const payload = {
    api_player_id: bsdPlayer.id,
    name: bsdPlayer.name,
    full_name: bsdPlayer.full_name || bsdPlayer.name,
    nationality: bsdPlayer.nationality || null,
    position: normalisePos(bsdPlayer.position),
    date_of_birth: bsdPlayer.date_of_birth || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('players')
    .upsert(payload, { onConflict: 'api_player_id' })
    .select('id').single();
  if (error) throw new Error(`Player upsert: ${error.message}`);
  return data.id;
}

async function upsertCard(card) {
  if (DRY_RUN) { stats.cardsInserted++; return; }
  const { error } = await supabase.from('player_season_cards')
    .upsert(card, { onConflict: 'api_player_id,season,league_code' });
  if (error) {
    stats.errors++;
    console.error(`  ❌  Card upsert error: ${error.message}`);
  } else {
    stats.cardsInserted++;
  }
}

// ─────────────────────────────────────────────────
//  BSD API: DISCOVER SEASON IDs
//  BSD uses internal season IDs per league.
//  We fetch the league's seasons and find the matching year.
// ─────────────────────────────────────────────────
const bsdSeasonIdCache = {}; // `${leagueCode}-${year}` → bsdSeasonId

async function discoverSeasonId(league, seasonYear) {
  const cacheKey = `${league.code}-${seasonYear}`;
  if (bsdSeasonIdCache[cacheKey] !== undefined) return bsdSeasonIdCache[cacheKey];

  try {
    // BSD endpoint: /leagues/{id}/seasons/ or /seasons/?league={id}
    const data = await bsdFetch(`/seasons/?league=${league.bsdLeagueId}&limit=20`);
    stats.apiCalls++;
    const seasons = data.results || data.seasons || (Array.isArray(data) ? data : []);

    for (const s of seasons) {
      // BSD season name format: "2024/25" or "2024-25" or similar
      const name = s.name || s.season_name || '';
      const startYear = name.match(/^(\d{4})/)?.[1];
      if (startYear && parseInt(startYear) === seasonYear) {
        bsdSeasonIdCache[cacheKey] = s.id;
        return s.id;
      }
      // Also check start_date field
      if (s.start_date) {
        const y = new Date(s.start_date).getFullYear();
        if (y === seasonYear) {
          bsdSeasonIdCache[cacheKey] = s.id;
          return s.id;
        }
      }
    }
    console.warn(`  ⚠️  No season found for ${league.code} ${seasonYear}`);
    bsdSeasonIdCache[cacheKey] = null;
    return null;
  } catch (err) {
    console.warn(`  ⚠️  Season discovery failed for ${league.code} ${seasonYear}: ${err.message}`);
    bsdSeasonIdCache[cacheKey] = null;
    return null;
  }
}

// ─────────────────────────────────────────────────
//  BSD API: FETCH PLAYERS IN A LEAGUE+SEASON PAGE
//  BSD endpoint pattern (from existing code analysis):
//  /players/?season={seasonId}&league={leagueId}&page={n}&limit=100
// ─────────────────────────────────────────────────
async function fetchPlayersPage(bsdSeasonId, bsdLeagueId, page) {
  const data = await bsdFetch(`/players/?season=${bsdSeasonId}&league=${bsdLeagueId}&page=${page}&limit=100`);
  stats.apiCalls++;
  return data;
}

// ─────────────────────────────────────────────────
//  BSD API: FETCH PLAYER CAREER STATS
//  Returns all seasons for a specific player
// ─────────────────────────────────────────────────
async function fetchPlayerCareer(bsdPlayerId) {
  const data = await bsdFetch(`/players/${bsdPlayerId}/career/`);
  stats.apiCalls++;
  return data.seasons || data.results || (Array.isArray(data) ? data : []);
}

// ─────────────────────────────────────────────────
//  IMPORT LOG: track page-level progress
// ─────────────────────────────────────────────────
async function getLogEntry(leagueCode, seasonCode, page) {
  const { data } = await supabase.from('import_log')
    .select('*')
    .eq('league_code', leagueCode)
    .eq('season', seasonCode)
    .eq('page', page)
    .maybeSingle();
  return data;
}

async function logStart(leagueCode, seasonCode, page) {
  if (DRY_RUN) return;
  await supabase.from('import_log').upsert({
    league_code: leagueCode,
    season: seasonCode,
    page,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  }, { onConflict: 'league_code,season,page' });
}

async function logComplete(leagueCode, seasonCode, page, playersFound, cardsInserted) {
  if (DRY_RUN) return;
  await supabase.from('import_log').upsert({
    league_code: leagueCode,
    season: seasonCode,
    page,
    status: 'complete',
    players_found: playersFound,
    cards_inserted: cardsInserted,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'league_code,season,page' });
}

async function logError(leagueCode, seasonCode, page, errorMessage) {
  if (DRY_RUN) return;
  await supabase.from('import_log').upsert({
    league_code: leagueCode,
    season: seasonCode,
    page,
    status: 'error',
    error_message: errorMessage,
    completed_at: new Date().toISOString(),
  }, { onConflict: 'league_code,season,page' });
}

// ─────────────────────────────────────────────────
//  PROCESS ONE PLAYER IN A GIVEN SEASON
// ─────────────────────────────────────────────────
async function processPlayerSeason(bsdPlayer, league, season) {
  try {
    // Upsert the player record
    const playerId = await upsertPlayer(bsdPlayer);

    // Get stats for this specific season from career data
    // BSD career data: array of season rows with season_id, league_id, goals, assists, etc.
    const careerRows = bsdPlayer._careerRows || [];
    const seasonRows = careerRows.filter(r => r.season_id === bsdPlayer._targetSeasonId && r.league_id === league.bsdLeagueId);

    // If no career rows yet, use the data we already have from the player listing
    const statRow = seasonRows[0] || bsdPlayer._directStats || {};

    const goals     = parseInt(statRow.goals)   || parseInt(bsdPlayer.goals)   || 0;
    const assists   = parseInt(statRow.assists)  || parseInt(bsdPlayer.assists) || 0;
    const apps      = parseInt(statRow.appearances) || parseInt(bsdPlayer.appearances) || 0;
    const minutes   = parseInt(statRow.minutes)  || 0;
    const rawRating = statRow.avg_rating || bsdPlayer.avg_rating || null;

    // Skip if zero output and zero appearances (player wasn't active)
    if (goals === 0 && assists === 0 && apps === 0) return false;

    const age = calcAge(bsdPlayer.date_of_birth, season.year);
    const leagueId = await getLeagueId(league.code);
    const teamName = statRow.team_name || bsdPlayer.team_name || bsdPlayer.club || '';
    const teamId = teamName ? await getOrCreateTeamId(teamName) : null;

    await upsertCard({
      player_id:    playerId,
      team_id:      teamId,
      league_id:    leagueId,
      api_player_id: bsdPlayer.id,
      season:       season.code,
      season_year:  season.year,
      league_code:  league.code,
      team_name:    teamName,
      position:     normalisePos(bsdPlayer.specific_position || bsdPlayer.position),
      age,
      appearances:  apps,
      minutes,
      goals,
      assists,
      rating:       rawRating ? parseFloat(rawRating) : null,
      rt:           convertRating(rawRating),
    });

    return true;
  } catch (err) {
    stats.errors++;
    console.error(`  ❌  Player ${bsdPlayer.name} (${bsdPlayer.id}): ${err.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────────
//  IMPORT ONE LEAGUE × ONE SEASON (all pages)
// ─────────────────────────────────────────────────
async function importLeagueSeason(league, season) {
  console.log(`\n  📁  ${league.name} · ${season.label}`);

  // Discover the BSD season ID for this league+year
  const bsdSeasonId = await discoverSeasonId(league, season.year);
  await sleep(DELAY_MS);

  if (!bsdSeasonId) {
    console.log(`     ⚠️  Season not available — skipping`);
    return { players: 0, cards: 0 };
  }

  let page = 1;
  let totalPlayers = 0;
  let totalCards = 0;

  while (true) {
    // Check if this page is already complete (resumability)
    if (!FORCE && !DRY_RUN) {
      const existing = await getLogEntry(league.code, season.code, page);
      if (existing?.status === 'complete') {
        console.log(`     ✅  Page ${page} already complete (${existing.players_found} players) — skipping`);
        totalPlayers += existing.players_found || 0;
        totalCards   += existing.cards_inserted || 0;
        page++;
        // If previous page had < 100 players it was the last page
        if ((existing.players_found || 0) < 100) break;
        continue;
      }
    }

    await logStart(league.code, season.code, page);

    let pageData;
    try {
      pageData = await fetchPlayersPage(bsdSeasonId, league.bsdLeagueId, page);
      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`     ❌  Page ${page} fetch failed: ${err.message}`);
      await logError(league.code, season.code, page, err.message);
      break;
    }

    const players = pageData.results || pageData.players || (Array.isArray(pageData) ? pageData : []);
    if (!players.length) {
      console.log(`     📭  Page ${page} empty — done`);
      break;
    }

    console.log(`     📄  Page ${page}: ${players.length} players`);

    let pageCards = 0;
    for (const bsdPlayer of players) {
      // Attach the season ID so processPlayerSeason can match career rows
      bsdPlayer._targetSeasonId = bsdSeasonId;

      const inserted = await processPlayerSeason(bsdPlayer, league, season);
      if (inserted) pageCards++;
      stats.playersProcessed++;
      await sleep(DELAY_MS);
    }

    await logComplete(league.code, season.code, page, players.length, pageCards);
    totalPlayers += players.length;
    totalCards   += pageCards;

    // Last page?
    if (players.length < 100) break;

    page++;
    // Progress update every 5 pages
    if (page % 5 === 0) logProgress();
  }

  console.log(`     ✅  ${league.name} ${season.label}: ${totalPlayers} players · ${totalCards} cards`);
  return { players: totalPlayers, cards: totalCards };
}

// ─────────────────────────────────────────────────
//  ESTIMATE MODE
// ─────────────────────────────────────────────────
function printEstimate() {
  const leagues = FILTER_LEAGUE ? LEAGUES.filter(l => l.code === FILTER_LEAGUE) : LEAGUES;
  const seasons = FILTER_SEASON ? SEASONS.filter(s => s.code === FILTER_SEASON) : SEASONS;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       VVonderXI Import Estimate                     ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log(`Leagues:  ${leagues.map(l => l.code).join(', ')}`);
  console.log(`Seasons:  ${seasons.map(s => s.label).join(', ')}\n`);

  // Estimates based on typical European league squad sizes
  const playersPerLeagueSeason = { PL: 550, LL: 500, BL: 450, SA: 480, L1: 480, PRT: 400, ERE: 380, BPL: 380 };

  let totalPlayers = 0;
  let totalCards = 0;
  let totalApiCalls = 0;

  leagues.forEach(league => {
    let leagueCards = 0;
    seasons.forEach(season => {
      const players = playersPerLeagueSeason[league.code] || 400;
      const pages = Math.ceil(players / 100);
      leagueCards += players;
      totalApiCalls += 1 + pages; // 1 season discovery + n pages
    });
    totalPlayers += playersPerLeagueSeason[league.code] || 400; // unique players (approx)
    totalCards += leagueCards;
    console.log(`  ${league.code.padEnd(5)} ${league.name.padEnd(22)} → ${(leagueCards).toLocaleString()} cards`);
  });

  const deduped = Math.round(totalPlayers * 0.6); // ~40% play in multiple leagues
  const apiCallsTotal = totalApiCalls + (deduped * 0.1); // some career fetches

  console.log(`\n  ─────────────────────────────────────────────────────`);
  console.log(`  Estimated unique players:     ~${(deduped * leagues.length / leagues.length).toLocaleString()}`);
  console.log(`  Estimated total cards:         ~${totalCards.toLocaleString()}`);
  console.log(`  Estimated API calls:           ~${Math.round(apiCallsTotal).toLocaleString()}`);
  console.log(`  Estimated runtime (350ms/call): ~${Math.round(apiCallsTotal * DELAY_MS / 1000 / 60)} minutes`);
  console.log(`  Estimated storage:             ~${Math.round(totalCards * 500 / 1048576 * 3)} MB (with indexes)\n`);
  console.log(`  Storage budget:                500 MB (Supabase free tier)`);
  console.log(`  Expected usage:                ~120–200 MB ✅\n`);
}

// ─────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       VVonderXI — Bulk Player Import                ║');
  if (DRY_RUN)       console.log('║       MODE: DRY RUN (no writes)                     ║');
  if (ESTIMATE_ONLY) console.log('║       MODE: ESTIMATE ONLY                           ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  printEstimate();
  if (ESTIMATE_ONLY) return;

  const leagues = FILTER_LEAGUE ? LEAGUES.filter(l => l.code === FILTER_LEAGUE) : LEAGUES;
  const seasons = FILTER_SEASON ? SEASONS.filter(s => s.code === FILTER_SEASON) : SEASONS;

  if (!leagues.length) { console.error(`Unknown league: ${FILTER_LEAGUE}`); process.exit(1); }
  if (!seasons.length) { console.error(`Unknown season: ${FILTER_SEASON}`); process.exit(1); }

  console.log(`\nStarting import: ${leagues.length} leagues × ${seasons.length} seasons`);
  console.log(`Rate limit: ${DELAY_MS}ms between calls`);
  if (DRY_RUN) console.log('DRY RUN: estimating only, no data written\n');

  let grandTotal = { players: 0, cards: 0 };

  // Process newest season first (more valuable data)
  for (const season of seasons) {
    for (const league of leagues) {
      try {
        const result = await importLeagueSeason(league, season);
        grandTotal.players += result.players;
        grandTotal.cards   += result.cards;
      } catch (err) {
        console.error(`\n❌  Fatal error in ${league.code} ${season.label}: ${err.message}`);
        // Continue with next — don't abort the whole import
      }
    }
    // Bigger pause between seasons
    await sleep(2000);
  }

  // Final report
  const elapsed = Math.round((Date.now() - stats.startTime) / 1000);
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       IMPORT COMPLETE                               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`  Players processed:  ${stats.playersProcessed.toLocaleString()}`);
  console.log(`  Cards inserted:     ${stats.cardsInserted.toLocaleString()}`);
  console.log(`  Cards skipped:      ${stats.cardsSkipped.toLocaleString()}`);
  console.log(`  API calls made:     ${stats.apiCalls.toLocaleString()}`);
  console.log(`  Errors:             ${stats.errors}`);
  console.log(`  Total time:         ${Math.floor(elapsed/60)}m ${elapsed%60}s\n`);
  console.log(`  Run the storage query in schema.sql to check database size.`);
  console.log(`  To import 2017/18–2018/19, run with --season 1718 or --season 1819\n`);
}

main().catch(err => {
  console.error('\n💥 Unhandled error:', err.message);
  process.exit(1);
});
