// Stage 3a v2 , league-strength WITH scoring-environment correction (fixes the high-scoring-league
// style confound, e.g. Bundesliga read as weak). Normalizes each player-season output by the league's
// own scoring rate that season: rel = ga90_i / env(league,season), env = league aggregate (g+a)/90.
// Measures share-difficulty (player's real difficulty change), not the league's absolute scoring style.
// Still endogenous + circularity-safe (raw output + league scoring rate; no rt). Computes RAW and
// CORRECTED side by side. Offline, no swap. Run: NODE_PATH=./node_modules node scripts/engine/league_strength_v2.js
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const MIN_MIN = 900, MIN_GA = 3, WINDOW = 2, FLOOR_OBS = 12, AGE_MIN_N = 15;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

(async () => {
  let rows = [], from = 0;
  while (true) { const r = await sb.from("player_card_mv").select("api_player_id,league_code,season_year,minutes,goals,assists,season_age,league_strength_weight").range(from, from + 999);
    if (r.error) throw new Error(r.error.message); rows = rows.concat(r.data || []); if (!r.data || r.data.length < 1000) break; from += 1000; }
  const PLACEHOLDER = {}; rows.forEach(r => { if (r.league_strength_weight != null) PLACEHOLDER[r.league_code] = r.league_strength_weight; });
  const LEAGUES = Object.keys(PLACEHOLDER);

  // ENV: league-season aggregate scoring rate = sum(g+a) / sum(90s), regular players
  const envAgg = {}; rows.forEach(r => { if (r.minutes >= MIN_MIN) { const k = r.league_code + "|" + r.season_year; envAgg[k] = envAgg[k] || { ga: 0, m: 0 }; envAgg[k].ga += (r.goals || 0) + (r.assists || 0); envAgg[k].m += r.minutes / 90; } });
  const envRate = (lg, y) => { const e = envAgg[lg + "|" + y]; return e && e.m > 0 ? e.ga / e.m : null; };

  // primary league-season per player (max minutes)
  const byPS = {}; rows.forEach(r => { if (r.api_player_id == null || r.minutes == null) return; byPS[r.api_player_id] = byPS[r.api_player_id] || {}; const c = byPS[r.api_player_id][r.season_year]; if (!c || r.minutes > c.minutes) byPS[r.api_player_id][r.season_year] = r; });
  const seq = {};
  for (const k in byPS) seq[k] = Object.values(byPS[k]).map(r => { const ga90 = ((r.goals || 0) + (r.assists || 0)) / (r.minutes / 90); const env = envRate(r.league_code, r.season_year);
    return { y: r.season_year, lg: r.league_code, min: r.minutes, ga: (r.goals || 0) + (r.assists || 0), ga90, rel: env ? ga90 / env : null, relHalf: env ? ga90 / Math.sqrt(env) : null, rel65: env ? ga90 / Math.pow(env, 0.65) : null, age: r.season_age }; }).sort((a, b) => a.y - b.y);

  // build obs for a value-accessor (raw log ga90 OR log rel)
  function buildTable(valOf) {
    // age curve (stayers)
    const ab = {};
    for (const k in seq) { const a = seq[k]; for (let i = 0; i < a.length - 1; i++) { const c = a[i], n = a[i + 1];
      if (n.y === c.y + 1 && c.lg === n.lg && c.min >= MIN_MIN && n.min >= MIN_MIN && c.ga >= MIN_GA && n.ga >= MIN_GA && c.age != null && valOf(c) > 0 && valOf(n) > 0)
        (ab[c.age] = ab[c.age] || []).push(Math.log(valOf(n)) - Math.log(valOf(c))); } }
    const ac = {}; for (const age in ab) if (ab[age].length >= AGE_MIN_N) ac[age] = median(ab[age]);
    const ageAt = age => ac[age] != null ? ac[age] : (ac[age - 1] != null && ac[age + 1] != null ? (ac[age - 1] + ac[age + 1]) / 2 : 0);
    // movers
    const mv = [];
    for (const k in seq) { const a = seq[k]; for (let i = 0; i < a.length - 1; i++) { const c = a[i], n = a[i + 1];
      if (n.y === c.y + 1 && c.lg !== n.lg && c.min >= MIN_MIN && n.min >= MIN_MIN && c.ga >= MIN_GA && n.ga >= MIN_GA && c.age != null && valOf(c) > 0 && valOf(n) > 0) {
        const dlog = Math.log(valOf(n)) - Math.log(valOf(c)); mv.push({ y0: c.y, A: c.lg, B: n.lg, obs: ageAt(c.age) - dlog }); } } }
    const solve = obsList => {
      const pair = {}; obsList.forEach(o => (pair[o.A + ">" + o.B] = pair[o.A + ">" + o.B] || []).push(o.obs));
      const edges = {}; for (const key in pair) { const [A, B] = key.split(">"); const med = median(pair[key]), n = pair[key].length; const lo = A < B ? A : B, hi = A < B ? B : A; const est = A < B ? med : -med; const ek = lo + "|" + hi; edges[ek] = edges[ek] || { A: lo, B: hi, s: 0, w: 0 }; edges[ek].s += est * n; edges[ek].w += n; }
      const E = Object.values(edges).map(e => ({ A: e.A, B: e.B, e: e.s / e.w, w: e.w }));
      const adj = {}; E.forEach(e => { (adj[e.A] = adj[e.A] || []).push(e.B); (adj[e.B] = adj[e.B] || []).push(e.A); });
      const conn = new Set(["PL"]), q = ["PL"]; while (q.length) { const u = q.shift(); (adj[u] || []).forEach(v => { if (!conn.has(v)) { conn.add(v); q.push(v); } }); }
      const free = [...conn].filter(l => l !== "PL"), idx = {}; free.forEach((l, i) => idx[l] = i); const nf = free.length;
      const M = Array.from({ length: nf }, () => new Array(nf).fill(0)), v = new Array(nf).fill(0);
      E.forEach(ed => { const ia = ed.A === "PL" ? -1 : idx[ed.A], ib = ed.B === "PL" ? -1 : idx[ed.B], w = ed.w, e = ed.e;
        if (ia >= 0) { M[ia][ia] += w; v[ia] += -w * e; if (ib >= 0) M[ia][ib] += -w; } if (ib >= 0) { M[ib][ib] += w; v[ib] += w * e; if (ia >= 0) M[ib][ia] += -w; } });
      for (let c = 0; c < nf; c++) { let p = c; for (let r = c + 1; r < nf; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; [v[c], v[p]] = [v[p], v[c]]; if (Math.abs(M[c][c]) < 1e-9) continue; for (let r = 0; r < nf; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let cc = c; cc < nf; cc++) M[r][cc] -= f * M[c][cc]; v[r] -= f * v[c]; } }
      const s = { PL: 0 }; free.forEach((l, i) => s[l] = Math.abs(M[i][i]) < 1e-9 ? 0 : v[i] / M[i][i]);
      const nL = {}; E.forEach(ed => { nL[ed.A] = (nL[ed.A] || 0) + ed.w; nL[ed.B] = (nL[ed.B] || 0) + ed.w; }); return { s, conn, nL };
    };
    const pooled = solve(mv); const seasons = [...new Set(mv.map(m => m.y0))].sort((a, b) => a - b); const tbl = {};
    for (const S of seasons) { const R = solve(mv.filter(m => Math.abs(m.y0 - S) <= WINDOW)); for (const lg of LEAGUES) { let st, tier, n = Math.round(R.nL[lg] || 0);
      if (R.conn.has(lg) && n >= FLOOR_OBS) { st = Math.exp(R.s[lg]); tier = "computed"; } else if (pooled.conn.has(lg)) { st = Math.exp(pooled.s[lg]); tier = "pooled"; } else { st = PLACEHOLDER[lg]; tier = "placeholder"; }
      tbl[lg + "|" + S] = { strength: +st.toFixed(4), n, tier }; } }
    return { tbl, seasons, nMv: mv.length, pooledS: pooled.s };
  }

  const RAW = buildTable(x => x.ga90);
  const HALF = buildTable(x => x.relHalf);
  const A65 = buildTable(x => x.rel65);
  const ENV = buildTable(x => x.rel);
  console.log("env-corrected mover obs: " + ENV.nMv + "   (raw: " + RAW.nMv + ")");
  console.log("recent league scoring env (g+a per 90, 2023): " + LEAGUES.map(l => l + " " + (envRate(l, 2023) || 0).toFixed(2)).sort().join("  "));
  fs.writeFileSync("engine_league_strength_v2.csv", "league,season,strength_env,strength_raw,n_obs,tier\n" +
    ENV.seasons.flatMap(S => LEAGUES.map(l => [l, S, (ENV.tbl[l + "|" + S] || {}).strength, (RAW.tbl[l + "|" + S] || {}).strength, (ENV.tbl[l + "|" + S] || {}).n, (ENV.tbl[l + "|" + S] || {}).tier].join(","))).join("\n") + "\n");
  for (const yr of [2023, 2020, 2016]) { console.log("\n=== LADDER " + yr + " , ranked by a0.65 ===");
    console.table(LEAGUES.map(l => ({ league: l, half_0_5: (HALF.tbl[l + "|" + yr] || {}).strength, a0_65: (A65.tbl[l + "|" + yr] || {}).strength, full_1_0: (ENV.tbl[l + "|" + yr] || {}).strength })).sort((a, b) => b.a0_65 - a.a0_65)); }

  // FINALIZE locked alpha=0.5 weights for all (league x 2010-2025); write CSV; load DB table if --load
  const W = [];
  for (const lg of LEAGUES) for (let y = 2010; y <= 2025; y++) { const cell = HALF.tbl[lg + "|" + y];
    let w, tier; if (cell) { w = cell.strength; tier = cell.tier; }
    else if (HALF.pooledS[lg] != null) { w = +Math.exp(HALF.pooledS[lg]).toFixed(4); tier = "pooled-fill"; }
    else { w = PLACEHOLDER[lg]; tier = "placeholder"; }
    W.push({ league_code: lg, season_year: y, weight: w, tier }); }
  fs.writeFileSync("engine_league_weights.csv", "league_code,season_year,weight,tier\n" + W.map(r => [r.league_code, r.season_year, r.weight, r.tier].join(",")).join("\n") + "\n");
  console.log("\nwrote engine_league_weights.csv (" + W.length + " rows, alpha=0.5)");
  if (process.argv.includes("--load")) {
    const exec = async (sql) => { const { error } = await sb.rpc("exec_sql", { sql }); if (error) throw new Error(error.message); };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await exec("drop table if exists engine_league_weights");
    await exec("create table engine_league_weights (league_code text, season_year integer, weight numeric, tier text, primary key(league_code, season_year))");
    await exec("notify pgrst, 'reload schema'"); await sleep(2500);
    let ok = 0; for (let i = 0; i < W.length; i += 500) { const { data, error } = await sb.from("engine_league_weights").upsert(W.slice(i, i + 500), { onConflict: "league_code,season_year" }).select("league_code"); if (error) throw new Error(error.message); ok += (data ? data.length : 0); }
    console.log("LOADED engine_league_weights: " + ok + " rows");
  }
})().catch(e => { console.error("ERROR: " + e.message); process.exit(1); });
