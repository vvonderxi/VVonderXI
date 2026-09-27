#!/usr/bin/env node
/*  GENERATES data/game-deck.json , the card game's deck, from player_card_mv.
 *
 *  A SNAPSHOT, WITH THE SAME STANDING HAZARD AS RADAR_POOL_REF AND KEEPER_SAVE_LADDER. Nothing
 *  warns you when it goes stale. Regenerate it after any matview refresh, re-ingest or position
 *  backfill, and only AFTER the refresh: this script reads the matview, so running it before
 *  the refresh encodes the old state in a file that looks freshly generated.
 *  Terminal G:  node scripts/gen-game-deck.js
 *
 *  READ-ONLY, AND IT NEEDS NO .env. It uses the site's own public URL and anon key, read out of
 *  card.html, so it can only see what any visitor can see. SUPABASE_URL / SUPABASE_ANON_KEY in
 *  the environment override that.
 *
 *  THE DECISIONS (docs/GAME_V1_ARCHITECTURE.md section D, taken 2026-09-27):
 *   1. SELECTION IS A QUOTA PER POSITION, BEST rt FIRST, NOT ONE rt FLOOR. rt is output-first,
 *      so a single floor at 75 gives 42% strikers and 4.8% defenders; the attack-versus-defence
 *      moments need defenders. The quotas are the synthetic deck's mix, so sims stay comparable.
 *   2. ONE CARD PER PLAYER, his highest-rt season among the pools that still had room.
 *   3. EVER PRESENT (battle.reliability) IS THE PERCENTILE OF MINUTES WITHIN THE CARD'S OWN
 *      LEAGUE-SEASON. THE POOL IS EVERY OUTFIELD CARD IN THAT LEAGUE AND SEASON WITH 900+
 *      MINUTES, NOT ONLY DECK CARDS. radarFor's reliability divides by 38 x 90, which a 34-game
 *      league can never reach; ranking inside the league-season makes season length cancel.
 *   4. MASTER OF ROLE IS THE MEAN OF THE FOUR radarFor .scaled PERCENTILES (goalThreat, creation,
 *      progression, defensive). .scaled.reliability is raw availability, not a percentile.
 *  The four named stats are percentiles of radarFor .raw ACROSS THE DECK, so a good-scoring
 *  centre-back does not beat an average striker at Goal Threat. Season Impact is rt.
 *
 *  PERCENTILE CONVENTION: fraction STRICTLY BELOW x 100, rounded. That is Postgres percent_rank,
 *  the convention RADAR_POOL_REF uses, so the game reads numbers the same way the site does.
 *
 *  NOTHING IS RE-IMPLEMENTED. radarFor, getVVTags, bandFor, bandPublic, fmtSeason and
 *  vvDisplayName are called on vv-core itself, and dealTier comes from the game's own
 *  withDealTiers. A second copy of any of them is a second implementation that can drift.  */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'game-deck.json');

const MIN_MINUTES = 900;
const QUOTAS = { ST: 72, Winger: 72, CAM: 40, CM: 72, CDM: 40, FB: 48, CB: 56 };   // 400 cards
const GAME_POS = { ST: 'ST', Winger: 'W', CAM: 'CAM', CM: 'CM', CDM: 'CDM', FB: 'FB', CB: 'CB' };
const AXES = ['goalThreat', 'creation', 'progression', 'defensive'];
const NAME_MIN_COVERAGE = 0.95;
const RADAR_INPUTS = ['goals', 'shots_on', 'passes_key', 'assists', 'dribbles_success',
                      'passes_total', 'tackles_total', 'interceptions', 'duels_won'];

function fail(msg) { console.error('FAIL: ' + msg); process.exit(1); }

// ---------------------------------------------------------------- vv-core, asserted not assumed
// A syntax check proves a file parses, never that it defined anything (CLAUDE.md, the stray
// backtick that left VVCore undefined). So require it and assert every export this script uses.
global.window = global;
require(path.join(ROOT, 'vv-core.js'));
const V = global.window.VVCore;
if (!V) fail('vv-core.js loaded but VVCore is undefined');
for (const f of ['radarFor', 'getVVTags', 'bandFor', 'bandPublic', 'fmtSeason', 'vvDisplayName'])
  if (typeof V[f] !== 'function') fail('VVCore.' + f + ' is not a function');

// ---------------------------------------------------------------- read-only REST
function publicConfig() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
    return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY };
  const html = fs.readFileSync(path.join(ROOT, 'card.html'), 'utf8');
  const url = (html.match(/SUPABASE_URL:\s*"([^"]+)"/) || [])[1];
  const key = (html.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/) || [])[1];
  if (!url || !key) fail('could not read VV_PUBLIC from card.html');
  return { url, key };
}
const { url: SB_URL, key: SB_KEY } = publicConfig();
const HEAD = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

async function get(rel, extra = {}) {
  const r = await fetch(SB_URL + '/rest/v1/' + rel, { headers: { ...HEAD, ...extra } });
  if (!r.ok) fail('HTTP ' + r.status + ' on ' + rel.split('?')[0] + ': ' + (await r.text()).slice(0, 200));
  return r;
}
async function exactCount(table, filter) {
  const r = await get(table + '?select=card_id' + (filter ? '&' + filter : ''),
                      { Prefer: 'count=exact', Range: '0-0' });
  const total = +(r.headers.get('content-range') || '').split('/')[1];
  if (!Number.isFinite(total)) fail('no exact count for ' + table);
  return total;
}
// Paginated past PostgREST's 1000-row cap, ordered on a UNIQUE key so no page repeats or drops a
// row, and the total is asserted against an exact count. A denied read returns EMPTY WITH NO
// ERROR, so zero rows is a failure here, never a result.
async function fetchAll(table, select, filter) {
  const total = await exactCount(table, filter);
  if (total === 0) fail(table + ' returned 0 rows for ' + filter + ' (denied read, or wrong filter)');
  const rows = [];
  for (let from = 0; from < total; from += 1000) {
    const r = await get(table + '?select=' + select + '&' + filter + '&order=card_id.asc',
                        { Range: from + '-' + (from + 999) });
    rows.push(...(await r.json()));
  }
  if (rows.length !== total) fail(table + ': fetched ' + rows.length + ' of ' + total);
  return rows;
}

// fraction strictly below, x100, rounded (Postgres percent_rank)
function percentRank(values) {
  const s = values.filter(v => v != null).sort((a, b) => a - b);
  const n = s.length;
  return v => {
    if (v == null || n < 2) return null;
    let lo = 0, hi = n;
    while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; }
    return Math.round(100 * lo / (n - 1));
  };
}
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

async function main() {
  const matviewRows = await exactCount('player_card_mv', '');

  // ---- 1. Ever Present pool: every outfield card with 900+ minutes, all leagues and seasons.
  const outfield = (await fetchAll('player_card_mv',
      'card_id,league_code,season_year,minutes,position,position_pool',
      'minutes=gte.' + MIN_MINUTES + '&position=neq.GK'))
    .filter(r => r.position_pool !== 'GK');
  const lsGroups = {};
  for (const r of outfield) (lsGroups[r.league_code + '|' + r.season_year] ??= []).push(r.minutes);
  const lsRank = Object.fromEntries(Object.entries(lsGroups).map(([k, v]) => [k, percentRank(v)]));

  // ---- 2. Candidates: named outfield pool, a score, and every radar input present.
  const candFilter = 'minutes=gte.' + MIN_MINUTES + '&position=neq.GK&rt=not.is.null'
    + '&position_pool=in.(' + Object.keys(QUOTAS).join(',') + ')'
    + RADAR_INPUTS.map(c => '&' + c + '=not.is.null').join('');
  const rows = await fetchAll('player_card_mv', '*', candFilter);

  const excluded = { suppressed: 0, nr: 0, poolMismatch: 0, noLeagueSeason: 0 };
  const cands = [];
  for (const row of rows) {
    const radar = V.radarFor(row);
    if (!radar || radar.suppressed) { excluded.suppressed++; continue; }
    if (radar.nr !== 0 || AXES.some(a => radar.raw[a] == null || radar.scaled[a] == null)) { excluded.nr++; continue; }
    if (radar.pool !== row.position_pool) { excluded.poolMismatch++; continue; }
    if (!lsRank[row.league_code + '|' + row.season_year]) { excluded.noLeagueSeason++; continue; }
    cands.push({ row, radar });
  }
  // The radar pool key and the game position must be the same thing, or a card is scored in one
  // pool and played as another. Any mismatch is a vv-core change this script has not caught up to.
  if (excluded.poolMismatch) fail(excluded.poolMismatch + ' cards: radarFor pool differs from position_pool');

  // ---- 3. Select: best rt first, per-position quota, one card per player. Total order, no ties.
  cands.sort((a, b) => b.row.rt - a.row.rt || b.row.minutes - a.row.minutes || a.row.card_id - b.row.card_id);
  const taken = Object.fromEntries(Object.keys(QUOTAS).map(p => [p, 0]));
  const players = new Set();
  const deck = [];
  for (const c of cands) {
    const p = c.row.position_pool;
    if (taken[p] >= QUOTAS[p] || players.has(c.row.api_player_id)) continue;
    taken[p]++; players.add(c.row.api_player_id); deck.push(c);
  }
  for (const p of Object.keys(QUOTAS)) if (taken[p] !== QUOTAS[p]) fail(p + ' filled ' + taken[p] + ' of ' + QUOTAS[p]);

  // ---- 4. Display names. The matview has no full name, so one read of players. A denied anon
  // read returns empty with no error, so coverage is asserted rather than trusted.
  const ids = [...new Set(deck.map(c => c.row.api_player_id))];
  const fullName = {};
  for (let i = 0; i < ids.length; i += 100) {
    const r = await get('players?select=api_player_id,full_name&api_player_id=in.(' + ids.slice(i, i + 100).join(',') + ')');
    for (const x of await r.json()) if (x.full_name && String(x.full_name).trim()) fullName[x.api_player_id] = x.full_name;
  }
  const nameCoverage = Object.keys(fullName).length / ids.length;
  if (nameCoverage < NAME_MIN_COVERAGE)
    fail('players.full_name returned for ' + (100 * nameCoverage).toFixed(1) + '% of deck players, need '
         + (100 * NAME_MIN_COVERAGE) + '% (a denied read returns empty, not an error)');

  // ---- 5. Battle values and card payload.
  const deckRank = Object.fromEntries(AXES.map(a => [a, percentRank(deck.map(c => c.radar.raw[a]))]));
  const cards = {};
  for (const { row, radar } of deck) {
    const base = row.player_name || '';
    const abbreviated = /^[A-Za-zÀ-ɏ]\.\s/.test(base);
    const name = abbreviated && fullName[row.api_player_id] ? (V.vvDisplayName(base, fullName[row.api_player_id]) || base) : base;
    const battle = {
      impact: row.rt,
      goalThreat: deckRank.goalThreat(radar.raw.goalThreat),
      creation: deckRank.creation(radar.raw.creation),
      progression: deckRank.progression(radar.raw.progression),
      defensive: deckRank.defensive(radar.raw.defensive),
      reliability: lsRank[row.league_code + '|' + row.season_year](row.minutes),
      roleMastery: Math.round(AXES.reduce((s, a) => s + radar.scaled[a], 0) / AXES.length),
    };
    for (const [k, v] of Object.entries(battle)) if (v == null) fail('card ' + row.card_id + ' battle.' + k + ' is null');
    const id = String(row.card_id);
    cards[id] = {
      id, card_id: row.card_id, api_player_id: row.api_player_id,
      name, season: V.fmtSeason(row.season), season_year: row.season_year,
      club: row.team_name, league: row.league_code,
      position: GAME_POS[row.position_pool], rt: row.rt,
      band: V.bandPublic(V.bandFor(row.rt)),
      colours: { primary: row.primary_colour ?? null, secondary: row.secondary_colour ?? null, accent: row.accent_colour ?? null },
      shirt: row.shirt_number ?? null,
      tags: V.getVVTags(row).map(t => t.name),
      battle,
    };
  }
  const { withDealTiers } = await import(path.join(ROOT, 'game', 'sim', 'synthetic-deck.js'));
  withDealTiers(cards, 5);

  // ---- 6. Controls. The deck-wide percentile exists so position reads right; assert it does.
  const byPos = {};
  for (const c of Object.values(cards)) (byPos[c.position] ??= []).push(c);
  const med = (p, k) => median(byPos[p].map(c => c.battle[k]));
  if (!(med('ST', 'goalThreat') > med('CB', 'goalThreat'))) fail('ST median Goal Threat is not above CB');
  if (!(med('CB', 'defensive') > med('ST', 'defensive'))) fail('CB median Defensive Wall is not above ST');

  // ---- 7. Write: meta pretty, one card per line, cards in card_id order.
  const order = Object.keys(cards).sort((a, b) => +a - +b);
  const cardLines = order.map(id => '    ' + JSON.stringify(id) + ': ' + JSON.stringify(cards[id]));
  const md5 = crypto.createHash('md5').update(cardLines.join('\n')).digest('hex');
  const meta = {
    generator: 'scripts/gen-game-deck.js',
    generated_at: new Date().toISOString(),
    source: { table: 'player_card_mv', rows_at_generation: matviewRows },
    hazard: 'Snapshot. Regenerate only AFTER a matview refresh, re-ingest or position backfill.',
    filters: { min_minutes: MIN_MINUTES, outfield_only: true, pools: Object.keys(QUOTAS), radar_all_axes: true, rt_not_null: true },
    quotas: QUOTAS, one_card_per_player: true,
    battle: {
      impact: 'rt',
      goalThreat: 'percent_rank of radarFor .raw across the deck', creation: 'same', progression: 'same', defensive: 'same',
      reliability: 'percent_rank of minutes within own league-season, pool = all outfield cards with 900+ minutes',
      roleMastery: 'mean of radarFor .scaled goalThreat, creation, progression, defensive',
      convention: 'fraction strictly below x100, rounded (Postgres percent_rank)',
    },
    counts: { ever_present_pool: outfield.length, league_seasons: Object.keys(lsGroups).length,
              candidate_rows: rows.length, eligible: cands.length, deck: order.length, excluded },
    name_coverage: +nameCoverage.toFixed(4),
    cards_md5: md5,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const metaJson = JSON.stringify(meta, null, 2).split('\n').map((l, i) => i ? '  ' + l : l).join('\n');
  fs.writeFileSync(OUT, '{\n  "meta": ' + metaJson + ',\n  "cards": {\n' + cardLines.join(',\n') + '\n  }\n}\n');

  // Read it back off disk and assert it before trusting it.
  const back = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  if (Object.keys(back.cards).length !== order.length) fail('read-back card count differs');
  if (back.meta.cards_md5 !== md5) fail('read-back md5 differs');

  // ---- 8. Report.
  const pad = (s, n) => String(s).padEnd(n);
  console.log('matview rows ' + matviewRows + ' | ever-present pool ' + outfield.length + ' in ' + Object.keys(lsGroups).length
    + ' league-seasons | candidates ' + rows.length + ' | eligible ' + cands.length + ' | excluded ' + JSON.stringify(excluded));
  console.log('\n' + pad('pos', 5) + pad('n', 5) + pad('rt min', 8) + pad('rt med', 8) + pad('rt max', 8)
    + pad('goalThr', 9) + pad('create', 8) + pad('progr', 7) + pad('defWall', 9) + pad('ever', 6) + 'role');
  for (const p of ['ST', 'W', 'CAM', 'CM', 'CDM', 'FB', 'CB']) {
    const rts = byPos[p].map(c => c.rt);
    console.log(pad(p, 5) + pad(byPos[p].length, 5) + pad(Math.min(...rts), 8) + pad(median(rts), 8) + pad(Math.max(...rts), 8)
      + pad(med(p, 'goalThreat'), 9) + pad(med(p, 'creation'), 8) + pad(med(p, 'progression'), 7)
      + pad(med(p, 'defensive'), 9) + pad(med(p, 'reliability'), 6) + med(p, 'roleMastery'));
  }
  const tiers = {}; for (const c of Object.values(cards)) tiers[c.dealTier] = (tiers[c.dealTier] ?? 0) + 1;
  const tagged = Object.values(cards).filter(c => c.tags.length).length;
  console.log('\ndeal tiers ' + JSON.stringify(tiers) + ' | cards with >=1 Wonder Tag ' + tagged + '/' + order.length
    + ' | name coverage ' + (100 * nameCoverage).toFixed(1) + '%');
  console.log('top 5: ' + Object.values(cards).sort((a, b) => b.rt - a.rt || a.card_id - b.card_id).slice(0, 5)
    .map(c => c.name + ' ' + c.season + ' ' + c.position + ' ' + c.rt).join(' | '));
  console.log('wrote ' + path.relative(ROOT, OUT) + ' , ' + order.length + ' cards, md5 ' + md5);
}

main().catch(e => fail(e && e.stack || String(e)));
