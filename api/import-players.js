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
//   • Block selection: a player-season may carry MULTIPLE same-league stat blocks
//     (transfer/loan/duplication artifact). resolveSeasonStat() drops 0-min phantoms,
//     dedupes duplication artifacts, and SUMS genuine two-club splits into one row.
//     The 300-min floor is applied to the RESULT, not to the first block. (See §E.)
//   • Dry run: --dry-run reports NEW vs existing per league-season, writes nothing.
//
//  MODES:
//   • DEFAULT: upsert on (api_player_id, season, league_code) — DO UPDATE (fresh import;
//     re-running overwrites). Skips league-seasons already marked complete.
//   • --insert-only: ON CONFLICT DO NOTHING + reprocess completed league-seasons, so a
//     recovery run can add newly-recovered player-seasons while leaving every EXISTING
//     row (and its rt) untouchable BY CONSTRUCTION — never for fresh-import overwrites.
//
//  RUN (one league at a time):
//    node api/import-players.js --league PL --dry-run                  → validate, no writes
//    node api/import-players.js --league PL --insert-only --dry-run    → recovery preview (NEW rows only)
//    node api/import-players.js --league PL --insert-only              → recovery run (additive, rt-safe)
//    node api/import-players.js --league PL                            → fresh import (overwrites)
//  Leagues: PL LL SA BL L1 PRT ERE BPL TR
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

const args        = process.argv.slice(2);
const DRY_RUN     = args.includes('--dry-run');
const INSERT_ONLY = args.includes('--insert-only');   // ON CONFLICT DO NOTHING + reprocess completed seasons
const ONLY        = args.includes('--league') ? args[args.indexOf('--league') + 1] : null;
const FLOOR_YR    = args.includes('--from') ? parseInt(args[args.indexOf('--from') + 1]) : 2010;
const TO_YR       = args.includes('--to')   ? parseInt(args[args.indexOf('--to')   + 1]) : 2025;
const MIN_MIN     = 300;
const DELAY_MS    = 320;   // ~3 req/s — comfortably under per-minute caps

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
  if (DRY_RUN || INSERT_ONLY) return false;   // insert-only recovery re-processes completed league-seasons
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

// ══════════════════════════════════════════════════════════════════════
//  BLOCK SELECTION (design locked, CLAUDE.md §E)
//  API-Football returns ONE row per player-season with a `statistics[]` array that
//  can hold MULTIPLE blocks for the SAME league (mid-season transfer, loan parent
//  club, or a duplication artifact where the same season is copied under the player's
//  NEXT-season club). The old `.find(first league match)` grabbed the first block —
//  often a 0-minute phantom or the minor stint — dropping/mis-scoring real seasons.
//
//  Rule: keep only same-league blocks, drop 0-minute phantoms, then
//    0 real   -> no card
//    1 real   -> that block                       (recovers Delap: Man City 0m dropped, Ipswich kept)
//    >=2 real -> ARTIFACT  (Σmin > league ceiling OR every block mirrors the richest)
//                          -> DEDUPE to the max-minutes block, NEVER sum
//              : GENUINE    -> SUM goals+assists+minutes+granular into one row,
//                             dominant (max-minutes) club as team.
//  The 300-minute floor is applied to the RESULT, not to block[0].
//
//  SUMMED-PATH HARDENING (2026-07-22, §E "summed-path bug"). The mirror test needs
//  Δmin<=40, so a duplicate copied onto a block with DIFFERENT minutes slipped through
//  and got SUMMED — doubling the output (Gibbs-White 8a+8a -> 16a, rt86). Two extra
//  nets now sit in front of the sum, both deliberately CONSERVATIVE: they can undercount
//  a genuine 1+1 by one, which is far cheaper than doubling an 8 into 16.
//    (a) PROPORTIONALITY GATE — with >=2 real blocks, drop a NON-RICHEST block whose
//        output could not plausibly be EARNED in its own minutes (Poisson upper tail
//        against an elite ceiling). Runs BEFORE classification, so dropping the phantom
//        usually leaves 1 real block and the row resolves through the plain single path.
//    (b) PER-STAT DUPLICATION GUARD — dedupe to the richest block when a shared stat is
//        actually EVIDENCE of copying, which needs BOTH conditions:
//          large enough to be informative AND on comparable-minute blocks.
//
//  The two nets cover two DIFFERENT copy shapes and neither substitutes for the other
//  (measured 2026-07-22, §E):
//    LOW-MINUTE COPY  (output stapled onto a short block, Gibbs-White 8a/180m) — the
//      proportionality tail separates it by ~4 orders of magnitude (p=3.7e-5 vs 3.4e-1
//      for genuine short stints). Identical-stat matching catches it only by luck.
//    FULL-BLOCK COPY  (same season under two clubs, comparable minutes: Cunha 2600/2600
//      15g/15g, Kean 990/1006 6g/6g) — each block is individually plausible, so the
//      tail test is BLIND to it (p=1.0, p=0.96). Only the stat match sees it.
//
//  Why guard (b) needs BOTH conditions: an identical stat is only as informative as it is
//  LARGE. Identical 8a or 15g is near-conclusive; identical 1a is a common value and
//  proves nothing — treating it as proof deduped three genuine loan splits (Nunes,
//  Sturridge, Jarvis). Pairing magnitude with a minute-ratio test confines (b) to the
//  full-block shape it is actually diagnostic for.
// ══════════════════════════════════════════════════════════════════════
const num = x => (parseInt(x) || 0);                       // like n() but 0 (never null) — for summing
const LEAGUE_GAMES = { PL:38, LL:38, SA:38, L1:38, TR:38, BL:34, ERE:34, PRT:34, BPL:34 };
function seasonCeiling(code){ return (LEAGUE_GAMES[code] || 38) * 90 + 180; }   // +2-game cushion for cup/playoff bleed

// two same-league blocks are near-identical mirrors => the same season copied under a 2nd club
function isMirror(a, b){
  return Math.abs(num(a.games?.minutes)     - num(b.games?.minutes))     <= 40
      && Math.abs(num(a.games?.appearences) - num(b.games?.appearences)) <= 1
      && num(a.goals?.total)   === num(b.goals?.total)
      && num(a.goals?.assists) === num(b.goals?.assists);
}
function richestByMinutes(blocks){
  return blocks.reduce((m, b) => num(b.games?.minutes) > num(m.games?.minutes) ? b : m);
}

// ── SUMMED-PATH GUARDS (see header) ───────────────────────────────────
// ═══ THRESHOLDS ═══ (every tunable in this fix, in one place)
const CEIL_G90    = 1.00;  // elite-season ceiling rate, goals per 90
const CEIL_A90    = 0.60;  // elite-season ceiling rate, assists per 90
const P_IMPLAUSIBLE = 0.01;// gate (a): drop a block if its output has <1% chance at that ceiling
const MIN_SHARED_STAT = 3; // guard (b): an identical stat below this is a common value, not evidence
const MIN_MIN_RATIO = 0.5; // guard (b): minor/major minutes — below this it is not a full-block copy

// (a) PROPORTIONALITY. P(X >= observed) for a Poisson with the elite ceiling as its rate.
// Minutes-aware by construction: 1 assist in 73m is unremarkable (p=0.39), 8 assists in
// 180m is not (p=3.7e-5). No fixed minutes cliff is needed, and none is used — the richest
// block is exempt (see resolveSeasonStat), which is what protects a real elite season from
// being gated for being too good.
function poissonTail(k, lambda){                            // P(X >= k)
  if (k <= 0) return 1;
  let cum = 0, term = Math.exp(-lambda);
  for (let i = 0; i < k; i++) { cum += term; term *= lambda / (i + 1); }
  return Math.max(0, 1 - cum);
}
function outputPlausibility(b){                             // lower = less earnable in these minutes
  const m = num(b.games?.minutes);
  if (m <= 0) return 1;
  return Math.min(poissonTail(num(b.goals?.total),   CEIL_G90 * m / 90),
                  poissonTail(num(b.goals?.assists), CEIL_A90 * m / 90));
}
function isImplausible(b){ return outputPlausibility(b) < P_IMPLAUSIBLE; }

// (b) per-stat duplication, NARROWED. Fires only when a shared NONZERO stat is both LARGE
// ENOUGH TO BE INFORMATIVE and carried on COMPARABLE-MINUTE blocks — the signature of a
// full-block copy. Identical 1a on a 73m block beside a 358m block is neither.
function minuteRatio(a, b){
  const x = num(a.games?.minutes), y = num(b.games?.minutes);
  const hi = Math.max(x, y);
  return hi > 0 ? Math.min(x, y) / hi : 0;
}
function sharesStat(a, b){
  const g = num(a.goals?.total),   gb = num(b.goals?.total);
  const s = num(a.goals?.assists), sb = num(b.goals?.assists);
  const bigMatch = (g >= MIN_SHARED_STAT && g === gb) || (s >= MIN_SHARED_STAT && s === sb);
  return bigMatch && minuteRatio(a, b) >= MIN_MIN_RATIO;
}
function hasDuplicatedStat(real){
  for (let i = 0; i < real.length; i++)
    for (let j = i + 1; j < real.length; j++)
      if (sharesStat(real[i], real[j])) return true;
  return false;
}
// "richest" = most minutes, tie-broken by output (a true copy ties on minutes too)
function richestBlock(blocks){
  return blocks.reduce((m, b) => {
    const bm = num(b.games?.minutes), mm = num(m.games?.minutes);
    if (bm !== mm) return bm > mm ? b : m;
    const bo = num(b.goals?.total) + num(b.goals?.assists);
    const mo = num(m.goals?.total) + num(m.goals?.assists);
    return bo > mo ? b : m;
  });
}
// >=2 real blocks: duplication artifact? (union of two SUFFICIENT tests — see §E)
function isArtifact(real, code){
  const sumMin = real.reduce((t, b) => t + num(b.games?.minutes), 0);
  if (sumMin > seasonCeiling(code)) return true;           // (A) physically impossible in one season => copies
  const rich = richestByMinutes(real);                     // (B) every block mirrors the richest => same season copied
  return real.every(b => b === rich || isMirror(b, rich));
}
// combine >=2 genuine same-league stints into one synthetic block (same shape as an API block)
function sumStat(real, L){
  const rich = richestByMinutes(real);
  // Sum, but PRESERVE null: if every contributing block is null for a field, the result is null
  // (storing 0 would claim knowledge the source never gave — Data Confidence depends on this).
  const S = pick => {
    let any = false, tot = 0;
    real.forEach(b => { const v = pick(b); if (v != null) { any = true; tot += num(v); } });
    return any ? tot : null;
  };
  const wMean = pick => {                                   // minute-weighted mean for ratio/avg fields
    let ws = 0, w = 0;
    real.forEach(b => { const v = parseFloat(pick(b)), m = num(b.games?.minutes);
      if (!isNaN(v) && m > 0) { ws += v * m; w += m; } });
    return w ? +(ws / w).toFixed(2) : null;
  };
  return {
    games:    { minutes: S(b=>b.games?.minutes), appearences: S(b=>b.games?.appearences),
                position: rich.games?.position, rating: wMean(b=>b.games?.rating) },
    goals:    { total: S(b=>b.goals?.total), assists: S(b=>b.goals?.assists) },
    shots:    { total: S(b=>b.shots?.total), on: S(b=>b.shots?.on) },
    passes:   { total: S(b=>b.passes?.total), key: S(b=>b.passes?.key), accuracy: wMean(b=>b.passes?.accuracy) },
    dribbles: { attempts: S(b=>b.dribbles?.attempts), success: S(b=>b.dribbles?.success) },
    tackles:  { total: S(b=>b.tackles?.total), blocks: S(b=>b.tackles?.blocks), interceptions: S(b=>b.tackles?.interceptions) },
    duels:    { total: S(b=>b.duels?.total), won: S(b=>b.duels?.won) },
    fouls:    { drawn: S(b=>b.fouls?.drawn), committed: S(b=>b.fouls?.committed) },
    cards:    { yellow: S(b=>b.cards?.yellow), red: S(b=>b.cards?.red) },
    team: rich.team, league: { id: L },
    _shape: 'summed', _blocks: real.length,
  };
}
// resolve a player's statistics[] into ONE stat block for the target league (or null if no real stint)
function resolveSeasonStat(statistics, L, code){
  const same = (statistics || []).filter(x => x.league?.id === L);
  let real   = same.filter(b => num(b.games?.minutes) > 0);      // drop 0-minute phantoms
  if (real.length === 0) return null;

  // (a) proportionality gate — multi-block only. The richest block is EXEMPT: a genuine
  // elite season posts a low tail probability too, and it must never be gated for being
  // too good. Only the minor blocks are candidates, so a block is dropped for output it
  // could not have earned, never for output that is merely exceptional.
  let gated = 0;
  if (real.length >= 2) {
    const rich = richestByMinutes(real);
    const kept = real.filter(b => b === rich || !isImplausible(b));
    if (kept.length >= 1) { gated = real.length - kept.length; real = kept; }
  }

  if (real.length === 1) return Object.assign({}, real[0], { _shape:'single',  _blocks:1, _gated:gated });
  if (isArtifact(real, code))
    return Object.assign({}, richestByMinutes(real),           { _shape:'deduped', _blocks:real.length, _gated:gated });
  // (b) per-stat duplication guard — sits in front of the sum
  if (hasDuplicatedStat(real))
    return Object.assign({}, richestBlock(real),               { _shape:'deduped', _blocks:real.length, _gated:gated });
  return Object.assign(sumStat(real, L),                       { _gated:gated });   // genuine split
}

async function importLeagueSeason(code, year){
  if (await isSeasonDone(code, year)) { console.log(`  ⏭️  ${code} ${year} already complete — skip`); return; }
  const sCode = seasonCode(year);
  const leagueId = await getLeagueId(code);
  const L = LEAGUES[code].id;

  // DRY-RUN and INSERT-ONLY both need to know which player-seasons ALREADY exist, so existing
  // rows are never touched (insert-only) and the dry run can report exactly what is NEW.
  const existing = new Set();
  if (DRY_RUN || INSERT_ONLY) {
    let f = 0;
    while (true) {
      const { data, error } = await supabase.from('player_season_cards')
        .select('api_player_id').eq('season_year', year).eq('league_code', code).range(f, f + 999);
      if (error) { console.warn(`  ⚠️ existing-fetch ${code} ${year}: ${error.message}`); break; }
      (data || []).forEach(r => existing.add(r.api_player_id));
      if (!data || data.length < 1000) break; f += 1000;
    }
  }

  let page = 1, totalPages = 1, seasonCards = 0, existingHit = 0;
  const shapeCount = { single:0, deduped:0, summed:0 };
  const newRows = [];   // dry-run only

  do {
    const j = await af(`/players?league=${L}&season=${year}&page=${page}`);
    await sleep(DELAY_MS);
    totalPages = j.paging?.total || 1;

    for (const row of (j.response || [])) {
      const pl = row.player;
      const s = resolveSeasonStat(row.statistics, L, code);      // phantom-drop + artifact-dedupe + genuine-sum
      if (!s) { stats.skipped++; continue; }                     // no real same-league stint
      const minutes = num(s.games?.minutes);
      if (minutes < MIN_MIN) { stats.skipped++; continue; }      // 300-min floor on the RESULT, not block[0]

      const goals = n(s.goals?.total), assists = n(s.goals?.assists);
      const isNew = !existing.has(pl.id);
      shapeCount[s._shape]++;

      if (DRY_RUN) {
        if (isNew) newRows.push({ name: pl.name, shape: s._shape, blocks: s._blocks, g: goals, a: assists, m: minutes, team: s.team?.name || '' });
        else existingHit++;
        seasonCards++;
        continue;                                                // no writes, no player/team lookups
      }

      // LIVE. Insert-only: an already-present player-season is untouchable — skip before any write.
      if (INSERT_ONLY && !isNew) { existingHit++; continue; }

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

      // insert-only => ON CONFLICT DO NOTHING (belt-and-braces with the pre-skip above);
      // default (fresh import) => upsert overwrites as before.
      const { error } = await supabase.from('player_season_cards')
        .upsert(card, { onConflict:'api_player_id,season,league_code', ignoreDuplicates: INSERT_ONLY });
      if (error){ stats.errors++; console.error(`  ❌ card: ${error.message}`); } else { stats.cards++; seasonCards++; }
    }
    await checkpoint(code, year, page, totalPages, false);
    page++;
  } while (page <= totalPages);

  await checkpoint(code, year, totalPages, totalPages, true);

  if (DRY_RUN) {
    console.log(`\n  ── ${code} ${year} DRY RUN${INSERT_ONLY?' (insert-only)':''} (${totalPages} pages, ${stats.calls} calls) ──`);
    console.log(`     resolved qualifying seasons: ${seasonCards}`);
    console.log(`     already-existing: ${existingHit}`);
    console.log(`     NEW inserts: ${newRows.length}  ·  shapes(all resolved): single ${shapeCount.single} · deduped/artifact ${shapeCount.deduped} · summed/genuine-split ${shapeCount.summed}`);
    const byShape = k => newRows.filter(r => r.shape === k);
    console.log(`     NEW by shape: single ${byShape('single').length} · deduped ${byShape('deduped').length} · summed ${byShape('summed').length}`);
    if (INSERT_ONLY)
      console.log(`     existing rows that WOULD BE MODIFIED: 0  (insert-only: pre-skipped + ON CONFLICT DO NOTHING)`);
    else
      console.log(`     ⚠️ existing rows that WOULD BE OVERWRITTEN (default mode): ${existingHit}  — use --insert-only to protect them`);
    if (newRows.length) {
      console.log(`     — NEW player-seasons —`);
      newRows.sort((a,b)=>b.m-a.m).forEach(r => console.log(`       + ${r.name} — ${r.team} · ${r.m}m ${r.g}g ${r.a}a  [${r.shape}${r.blocks>1?' x'+r.blocks:''}]`));
    }
  } else {
    const mode = INSERT_ONLY ? ` · insert-only (${existingHit} existing untouched)` : '';
    console.log(`  ✅ ${code} ${year}: ${seasonCards} ${INSERT_ONLY?'new ':''}cards (${totalPages} pages)${mode} · ${stats.calls} calls · ${elapsed()}s`);
  }
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
