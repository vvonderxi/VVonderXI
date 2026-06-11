#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  VVonderXI — API-FOOTBALL IMPORTER  (v4)
//  Source: https://v3.football.api-sports.io  (header: x-apisports-key)
//  /players?league={id}&season={year}&page={n}  → player-season cards WITH stats
//
//  DESIGN (defensive, resumable, idempotent):
//   • Rate-limit aware: paces calls + backs off on 429 (Retry-After honoured).
//   • Resumable: checkpoints each (league, season) in import_progress; a dropped
//     run skips finished league-seasons and continues.
//   • Idempotent: upsert on (api_player_id, season, league_code) — re-running never dupes.
//   • 300-minute floor: a season needs >= 300 min to become a card.
//   • Dry run: --dry-run estimates + prints sample cards, writes nothing.
//
//  RUN (one league at a time):
//    CMD="node api/import-players.js --league PL --dry-run"   → validate, no writes
//    CMD="node api/import-players.js --league PL"             → real import
//  Leagues: PL LL SA BL L1  (PRT ERE BPL added in phase 2)
// ══════════════════════════════════════════════════════════════════════

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE = 'https://v3.football.api-sports.io';
const KEY  = process.env.APIFOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!KEY)          { console.error('❌ APIFOOTBALL_KEY not set');       process.exit(1); }
if (!SUPABASE_URL) { console.error('❌ SUPABASE_URL not set');          process.exit(1); }
if (!SUPABASE_KEY) { console.error('❌ SUPABASE_SERVICE_KEY not set');   process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const ONLY      = args.includes('--league') ? args[args.indexOf('--league') + 1] : null;
const FLOOR_YR  = args.includes('--from') ? parseInt(args[args.indexOf('--from') + 1]) : 2010;
const TO_YR     = args.includes('--to')   ? parseInt(args[args.indexOf('--to')   + 1]) : 2025;
const MIN_MIN   = 300;
const DELAY_MS  = 320;   // ~3 req/s — comfortably under per-minute caps

const LEAGUES = {
  PL:{id:39},  LL:{id:140}, SA:{id:135}, BL:{id:78}, L1:{id:61},
  PRT:{id:94}, ERE:{id:88}, BPL:{id:144}, TR:{id:203},
};
const seasonCode = y => `${String(y).slice(2)}${String(y+1).slice(2)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const stats = { calls:0, cards:0, skipped:0, players:0, errors:0, start:Date.now() };
function elapsed(){ return Math.round((Date.now()-stats.start)/1000); }

async function af(path, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers:{'x-apisports-key':KEY}, signal:AbortSignal.timeout(15000) });
      stats.calls++;
      if (res.status === 429) {
        const wait = (parseInt(res.headers.get('retry-after')) || 60) * 1000;
        console.warn(`  ⏳ 429 rate limit — waiting ${wait/1000}s`); await sleep(wait); continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
      const j = await res.json();
      if (j.errors && Object.keys(j.errors).length) {
        // API-Football returns 200 with an errors object on quota/plan issues
        const msg = JSON.stringify(j.errors);
        if (/limit|plan|subscription/i.test(msg)) { console.warn(`  ⏳ quota: ${msg} — waiting 60s`); await sleep(60000); continue; }
        throw new Error(`API errors: ${msg}`);
      }
      return j;
    } catch (e) {
      if (attempt === retries) throw e;
      console.warn(`  ⚠️ retry ${attempt}/${retries} ${path}: ${e.message}`);
      await sleep(1500 * attempt);
    }
  }
}

const leagueIdCache = {}, teamCache = {};
async function getLeagueId(code){
  if (leagueIdCache[code] !== undefined) return leagueIdCache[code];
  const { data } = await supabase.from('leagues').select('id').eq('code', code).single();
  return (leagueIdCache[code] = data?.id || null);
}
async function getOrCreateTeam(name){
  if (!name) return null;
  const k = name.toLowerCase().trim();
  if (teamCache[k] !== undefined) return teamCache[k];
  const { data: ex } = await supabase.from('teams').select('id').ilike('name', name).maybeSingle();
  if (ex) return (teamCache[k] = ex.id);
  if (DRY_RUN) return (teamCache[k] = null);
  const { data: cr } = await supabase.from('teams').upsert({name}, {onConflict:'name'}).select('id').single();
  return (teamCache[k] = cr?.id || null);
}

async function checkpoint(code, year, pagesDone, totalPages, done){
  if (DRY_RUN) return;
  await supabase.from('import_progress').upsert(
    { league_code:code, season_year:year, pages_done:pagesDone, total_pages:totalPages, completed:done, updated_at:new Date().toISOString() },
    { onConflict:'league_code,season_year' });
}
async function isSeasonDone(code, year){
  if (DRY_RUN) return false;
  const { data } = await supabase.from('import_progress').select('completed').eq('league_code',code).eq('season_year',year).maybeSingle();
  return !!data?.completed;
}

async function upsertPlayer(pl, statPos){
  const payload = {
    api_player_id: pl.id,
    name:          pl.name,
    full_name:     ((pl.firstname||'')+' '+(pl.lastname||'')).trim() || pl.name,
    nationality:   pl.nationality || null,
    position:      normalisePos(statPos),
    date_of_birth: cleanDate(pl.birth?.date),
    height_cm:     pl.height ? parseInt(pl.height) : null,
    updated_at:    new Date().toISOString(),
  };
  if (DRY_RUN) return Math.floor(Math.random()*1e6);
  const { data, error } = await supabase.from('players').upsert(payload, {onConflict:'api_player_id'}).select('id').single();
  if (error) throw new Error(`player upsert: ${error.message}`);
  return data.id;
}

const POS_MAP = { Goalkeeper:'GK', Defender:'DEF', Midfielder:'MID', Attacker:'FWD' };
function normalisePos(raw){ return POS_MAP[raw] || (raw ? String(raw).slice(0,3).toUpperCase() : 'MID'); }

const RT_ANCHOR=6.3, RT_BASE=70, RT_SLOPE=17;
function ratingToRt(avg, g, a){
  const v = parseFloat(avg);
  if (!isNaN(v)) return Math.max(50, Math.min(96, Math.round(RT_BASE + (v-RT_ANCHOR)*RT_SLOPE)));
  return Math.max(50, Math.min(96, 60 + Math.round(((+g||0)+(+a||0))*0.9)));
}
const n = x => (x == null ? null : (parseInt(x) || 0));
// Accept only a clean YYYY-MM-DD; anything else (empty, malformed, '0000-00-00') -> null
function cleanDate(d){
  if (!d || typeof d !== 'string') return null;
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1];
  if (y < 1940 || y > 2015) return null;        // implausible birth year -> null
  const t = Date.parse(d);
  return isNaN(t) ? null : `${m[1]}-${m[2]}-${m[3]}`;
}

async function importLeagueSeason(code, year){
  if (await isSeasonDone(code, year)) { console.log(`  ⏭️  ${code} ${year} already complete — skip`); return; }
  const sCode = seasonCode(year);
  const leagueId = await getLeagueId(code);
  let page = 1, totalPages = 1, seasonCards = 0;

  do {
    const j = await af(`/players?league=${LEAGUES[code].id}&season=${year}&page=${page}`);
    await sleep(DELAY_MS);
    totalPages = j.paging?.total || 1;

    for (const row of (j.response || [])) {
      const pl = row.player;
      const s  = (row.statistics || []).find(x => x.league?.id === LEAGUES[code].id) || row.statistics?.[0];
      if (!s) continue;
      const minutes = n(s.games?.minutes) || 0;
      if (minutes < MIN_MIN) { stats.skipped++; continue; }

      const goals = n(s.goals?.total), assists = n(s.goals?.assists);
      const playerId = await upsertPlayer(pl, s.games?.position);
      const teamName = s.team?.name || '';
      const teamId   = await getOrCreateTeam(teamName);
      const rtVal    = ratingToRt(s.games?.rating, goals, assists);

      const card = {
        player_id:playerId, team_id:teamId, league_id:leagueId, api_player_id:pl.id,
        season:sCode, season_year:year, league_code:code, team_name:teamName,
        position:normalisePos(s.games?.position),
        age: pl.age ?? null,
        appearances:n(s.games?.appearences), minutes,
        goals, assists,
        rating: s.games?.rating ? parseFloat(s.games.rating) : null,
        rt: rtVal,
        shots_total:n(s.shots?.total), shots_on:n(s.shots?.on),
        passes_total:n(s.passes?.total), passes_key:n(s.passes?.key), passes_accuracy:n(s.passes?.accuracy),
        dribbles_attempts:n(s.dribbles?.attempts), dribbles_success:n(s.dribbles?.success),
        tackles_total:n(s.tackles?.total), tackles_blocks:n(s.tackles?.blocks), interceptions:n(s.tackles?.interceptions),
        duels_total:n(s.duels?.total), duels_won:n(s.duels?.won),
        fouls_drawn:n(s.fouls?.drawn), fouls_committed:n(s.fouls?.committed),
        cards_yellow:n(s.cards?.yellow), cards_red:n(s.cards?.red),
        source:'apifootball',
      };

      if (DRY_RUN) {
        if (seasonCards < 5) console.log(`   • ${pl.name} ${sCode} ${code} ${card.position} — ${goals}g ${assists}a ${minutes}m · tkl ${card.tackles_total} · keyP ${card.passes_key} · duW ${card.duels_won} · rt${rtVal}`);
        stats.cards++; seasonCards++;
      } else {
        const { error } = await supabase.from('player_season_cards').upsert(card, {onConflict:'api_player_id,season,league_code'});
        if (error){ stats.errors++; console.error(`  ❌ card: ${error.message}`); } else { stats.cards++; seasonCards++; }
      }
    }
    await checkpoint(code, year, page, totalPages, false);
    page++;
  } while (page <= totalPages);

  await checkpoint(code, year, totalPages, totalPages, true);
  console.log(`  ✅ ${code} ${year}: ${seasonCards} cards (${totalPages} pages) · ${stats.calls} calls · ${elapsed()}s`);
}

(async () => {
  const codes = ONLY ? [ONLY] : Object.keys(LEAGUES);
  console.log(`╔══ VVonderXI API-Football import ${DRY_RUN?'(DRY RUN)':'(LIVE)'} ══╗`);
  console.log(`Leagues: ${codes.join(', ')} · seasons ${FLOOR_YR}–${TO_YR} · min ${MIN_MIN} min\n`);

  for (const code of codes) {
    if (!LEAGUES[code]) { console.error(`Unknown league ${code}`); continue; }
    console.log(`📁 ${code}`);
    for (let y = TO_YR; y >= FLOOR_YR; y--) {
      try { await importLeagueSeason(code, y); }
      catch(e){ stats.errors++; console.error(`  ❌ ${code} ${y}: ${e.message}`); }
    }
  }

  console.log('\n╔══ COMPLETE ══╗');
  console.log(`  Cards:   ${stats.cards}`);
  console.log(`  Skipped (<${MIN_MIN}m): ${stats.skipped}`);
  console.log(`  Calls:   ${stats.calls}`);
  console.log(`  Errors:  ${stats.errors}`);
  console.log(`  Time:    ${elapsed()}s`);
})();
