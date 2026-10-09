#!/usr/bin/env node
/*  PULL LINEUPS WITH THEIR RAW SLOTS (2026-10-09, position fix step 1).
 *
 *  The old importer (scripts/import/import-positions-v2.js) classified every starting-XI slot on the
 *  fly and kept only the tally, so the grid that decided each call was thrown away. That is why the
 *  team-sheet errors (Doue in the midfield row, Robertson tallied 100% CB, no CAM after 2022) could
 *  not be diagnosed. This stores the raw slot instead: fixture, team, player, formation, grid row and
 *  column, the row's width, the API's coarse G/D/M/F and the shirt.
 *
 *  It writes ONLY to public.lineup_slots, which nothing in the engine, the matview or the pages reads.
 *  Resumable: a fixture already stored is skipped. Paced under the 450-a-minute plan limit.
 *
 *    node scripts/positions/pull-lineups.js                 # every league, 2016..2025
 *    node scripts/positions/pull-lineups.js --league PL --from 2018 --to 2018
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.APIFOOTBALL_KEY;
if (!KEY) { console.error('APIFOOTBALL_KEY not set'); process.exit(1); }

const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const ONLY = arg('--league', null), FROM = +arg('--from', 2016), TO = +arg('--to', 2025);
const LEAGUES = { PL: 39, LL: 140, SA: 135, BL: 78, L1: 61, PRT: 94, ERE: 88, BPL: 144, TR: 203 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stats = { calls: 0, fixtures: 0, rows: 0, empty: 0, errors: 0, t0: Date.now() };

/* ~6.5 calls a second across all workers, under the 450-a-minute limit with headroom. */
let nextSlot = 0;
async function gate() { const now = Date.now(); const at = Math.max(now, nextSlot); nextSlot = at + 155; if (at > now) await sleep(at - now); }

async function af(path) {
  for (let a = 1; a <= 5; a++) {
    await gate();
    try {
      const r = await fetch('https://v3.football.api-sports.io' + path, { headers: { 'x-apisports-key': KEY }, signal: AbortSignal.timeout(20000) });
      stats.calls++;
      if (r.status === 429) { await sleep(30000); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (j.errors && Object.keys(j.errors).length) {
        const m = JSON.stringify(j.errors);
        if (/limit|rate|quota/i.test(m)) { await sleep(30000); continue; }
        throw new Error(m);
      }
      return j;
    } catch (e) { if (a === 5) throw e; await sleep(1500 * a); }
  }
}

async function storedFixtures(code, year) {
  const ids = new Set();
  for (let o = 0; ; o += 1000) {
    const { data, error } = await sb.from('lineup_slots').select('fixture_id').eq('league_code', code).eq('season_year', year)
      .order('fixture_id').order('team_id').order('api_player_id').range(o, o + 999);
    if (error) throw error;
    data.forEach(r => ids.add(Number(r.fixture_id)));
    if (data.length < 1000) break;
  }
  return ids;
}

async function insert(rows) {
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await sb.from('lineup_slots').upsert(rows.slice(i, i + 1000), { onConflict: 'fixture_id,team_id,api_player_id', ignoreDuplicates: true });
    if (error) { stats.errors++; console.error('insert error', error.message); } else stats.rows += Math.min(1000, rows.length - i);
  }
}

async function leagueSeason(code, year) {
  const fx = await af(`/fixtures?league=${LEAGUES[code]}&season=${year}`);
  const done = await storedFixtures(code, year);
  const todo = (fx.response || []).filter(f => f.fixture?.status?.short === 'FT' && !done.has(f.fixture.id));
  let buf = [];
  const worker = async () => {
    while (todo.length) {
      const f = todo.shift();
      let l; try { l = await af(`/fixtures/lineups?fixture=${f.fixture.id}`); } catch (e) { stats.errors++; continue; }
      stats.fixtures++;
      const teams = l.response || [];
      if (!teams.length) { stats.empty++; continue; }
      for (const t of teams) {
        const xi = (t.startXI || []).map(x => x.player).filter(p => p && p.id);
        const width = {};
        for (const p of xi) if (p.grid) { const [r, c] = p.grid.split(':').map(Number); width[r] = Math.max(width[r] || 0, c); }
        for (const p of xi) {
          const [r, c] = p.grid ? p.grid.split(':').map(Number) : [null, null];
          buf.push({ fixture_id: f.fixture.id, league_code: code, season_year: year, team_id: t.team.id, api_player_id: p.id,
                     formation: t.formation || null, grid_row: r, grid_col: c, row_width: r != null ? width[r] : null, pos: p.pos || null, shirt: p.number ?? null });
        }
      }
      if (buf.length >= 2000) { const b = buf; buf = []; await insert(b); }
    }
  };
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  if (buf.length) await insert(buf);
  const min = ((Date.now() - stats.t0) / 60000).toFixed(1);
  console.log(`${code} ${year}: ${done.size} already stored, ${(fx.response || []).length} fixtures | totals calls ${stats.calls} fixtures ${stats.fixtures} rows ${stats.rows} empty ${stats.empty} errors ${stats.errors} | ${min} min`);
}

(async () => {
  for (const code of ONLY ? [ONLY] : Object.keys(LEAGUES))
    for (let y = FROM; y <= TO; y++) {
      try { await leagueSeason(code, y); } catch (e) { stats.errors++; console.error(code, y, 'FAILED', e.message); }
    }
  console.log('DONE', JSON.stringify(stats));
})();
