// Stage 3a , endogenous league-strength, computed OFFLINE for inspection (Decision 3). NO score change.
// Circularity guard: reads ONLY raw ga90 (goals+assists per 90) of movers + a stayers age curve.
// Never reads rt/def_signal/percentiles. One-way: raw output -> weights. Anchored PL = 1.00.
// Output: engine_league_strength.csv + printed ladders (2023/2020/2016). Run:
//   NODE_PATH=./node_modules node scripts/engine/league_strength.js
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MIN_MIN = 900, MIN_GA = 3, WINDOW = 2, FLOOR_OBS = 12, AGE_MIN_N = 15;
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

(async () => {
  // 1) pull raw output
  let rows = [], from = 0;
  while (true) { const r = await sb.from("player_card_mv").select("api_player_id,league_code,season_year,minutes,goals,assists,season_age,league_strength_weight").range(from, from + 999);
    if (r.error) throw new Error(r.error.message); rows = rows.concat(r.data || []); if (!r.data || r.data.length < 1000) break; from += 1000; }
  const PLACEHOLDER = {}; rows.forEach(r => { if (r.league_strength_weight != null) PLACEHOLDER[r.league_code] = r.league_strength_weight; });
  const LEAGUES = Object.keys(PLACEHOLDER);

  // 2) per player-season PRIMARY league-row (max minutes), build ga90 (goals+assists per 90)
  const byPS = {}; // player -> season -> best row
  rows.forEach(r => { if (r.api_player_id == null || r.minutes == null) return; const k = r.api_player_id, y = r.season_year;
    byPS[k] = byPS[k] || {}; if (!byPS[k][y] || r.minutes > byPS[k][y].minutes) byPS[k][y] = r; });
  const seq = {}; // player -> sorted [{y,lg,ga90,age,min,ga}]
  for (const k in byPS) { const arr = Object.values(byPS[k]).map(r => ({ y: r.season_year, lg: r.league_code, min: r.minutes,
      ga: (r.goals || 0) + (r.assists || 0), ga90: ((r.goals || 0) + (r.assists || 0)) / (r.minutes / 90), age: r.season_age }))
      .sort((a, b) => a.y - b.y); seq[k] = arr; }

  // 3) AGE CURVE from stayers (same league, adjacent season, both >=900min & >=MIN_GA): median dlog by age
  const ageBuckets = {};
  for (const k in seq) { const a = seq[k]; for (let i = 0; i < a.length - 1; i++) { const c = a[i], n = a[i + 1];
    if (n.y === c.y + 1 && c.lg === n.lg && c.min >= MIN_MIN && n.min >= MIN_MIN && c.ga >= MIN_GA && n.ga >= MIN_GA && c.age != null) {
      const dlog = Math.log(n.ga90) - Math.log(c.ga90); (ageBuckets[c.age] = ageBuckets[c.age] || []).push(dlog); } } }
  const ageCurve = {}; for (const age in ageBuckets) if (ageBuckets[age].length >= AGE_MIN_N) ageCurve[age] = median(ageBuckets[age]);
  const ageAt = age => ageCurve[age] != null ? ageCurve[age] : (ageCurve[age - 1] != null && ageCurve[age + 1] != null ? (ageCurve[age - 1] + ageCurve[age + 1]) / 2 : 0);

  // 4) MOVER observations: adjacent-season league change. obs(A->B) estimates s_B - s_A = ageCurve[ageA] - (log gaB - log gaA)
  const movers = []; // {y0, A, B, obs}
  for (const k in seq) { const a = seq[k]; for (let i = 0; i < a.length - 1; i++) { const c = a[i], n = a[i + 1];
    if (n.y === c.y + 1 && c.lg !== n.lg && c.min >= MIN_MIN && n.min >= MIN_MIN && c.ga >= MIN_GA && n.ga >= MIN_GA && c.age != null) {
      const dlog = Math.log(n.ga90) - Math.log(c.ga90); const obs = ageAt(c.age) - dlog; movers.push({ y0: c.y, A: c.lg, B: n.lg, obs }); } } }

  // 5) weighted least-squares solve for a set of observations, anchor PL=0
  function solve(obsList) {
    // aggregate by ordered pair -> median + count; combine directions into undirected edges
    const pair = {}; obsList.forEach(o => { const key = o.A + ">" + o.B; (pair[key] = pair[key] || []).push(o.obs); });
    const edges = {}; // "A|B" (sorted) -> {vals:[estimates of s_hi - s_lo], A, B}
    for (const key in pair) { const [A, B] = key.split(">"); const med = median(pair[key]); const n = pair[key].length;
      const lo = A < B ? A : B, hi = A < B ? B : A; const est = (A < B) ? med : -med; // med estimates s_B - s_A; normalize to s_hi - s_lo
      const ek = lo + "|" + hi; edges[ek] = edges[ek] || { A: lo, B: hi, vals: [], n: 0 }; edges[ek].vals.push({ est, n }); edges[ek].n += n; }
    const E = Object.values(edges).map(e => ({ A: e.A, B: e.B, e: e.vals.reduce((s, v) => s + v.est * v.n, 0) / e.vals.reduce((s, v) => s + v.n, 0), w: e.n }));
    // connectivity to PL (BFS)
    const adj = {}; E.forEach(e => { (adj[e.A] = adj[e.A] || []).push(e.B); (adj[e.B] = adj[e.B] || []).push(e.A); });
    const conn = new Set(["PL"]); const q = ["PL"]; while (q.length) { const u = q.shift(); (adj[u] || []).forEach(v => { if (!conn.has(v)) { conn.add(v); q.push(v); } }); }
    // free vars = connected leagues except PL
    const free = [...conn].filter(l => l !== "PL"); const idx = {}; free.forEach((l, i) => idx[l] = i); const nf = free.length;
    const M = Array.from({ length: nf }, () => new Array(nf).fill(0)), v = new Array(nf).fill(0);
    E.forEach(ed => { if (!conn.has(ed.A) || !conn.has(ed.B)) return; const ia = ed.A === "PL" ? -1 : idx[ed.A], ib = ed.B === "PL" ? -1 : idx[ed.B], w = ed.w, e = ed.e;
      if (ia >= 0) { M[ia][ia] += w; v[ia] += -w * e; if (ib >= 0) M[ia][ib] += -w; }
      if (ib >= 0) { M[ib][ib] += w; v[ib] += w * e; if (ia >= 0) M[ib][ia] += -w; } });
    // gaussian elimination
    for (let c = 0; c < nf; c++) { let p = c; for (let r = c + 1; r < nf; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; [v[c], v[p]] = [v[p], v[c]]; if (Math.abs(M[c][c]) < 1e-9) continue;
      for (let r = 0; r < nf; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let cc = c; cc < nf; cc++) M[r][cc] -= f * M[c][cc]; v[r] -= f * v[c]; } }
    const s = { PL: 0 }; free.forEach((l, i) => s[l] = Math.abs(M[i][i]) < 1e-9 ? 0 : v[i] / M[i][i]);
    // observation count per league (incident edge weights)
    const nLeague = {}; E.forEach(ed => { nLeague[ed.A] = (nLeague[ed.A] || 0) + ed.w; nLeague[ed.B] = (nLeague[ed.B] || 0) + ed.w; });
    return { s, conn, nLeague };
  }

  // all-window pooled fallback
  const pooled = solve(movers);

  // 6) per-season computation (rolling +-WINDOW)
  const seasons = [...new Set(movers.map(m => m.y0))].sort((a, b) => a - b);
  const table = [];
  for (const S of seasons) { const win = movers.filter(m => Math.abs(m.y0 - S) <= WINDOW); const R = solve(win);
    for (const lg of LEAGUES) { let strength, tier, n = Math.round(R.nLeague[lg] || 0);
      if (R.conn.has(lg) && n >= FLOOR_OBS) { strength = Math.exp(R.s[lg]); tier = "computed"; }
      else if (pooled.conn.has(lg)) { strength = Math.exp(pooled.s[lg]); tier = "pooled"; n = Math.round(pooled.nLeague[lg] || 0); }
      else { strength = PLACEHOLDER[lg]; tier = "placeholder"; }
      table.push({ league: lg, season: S, strength: +strength.toFixed(4), n_obs: n, tier }); } }

  // write CSV
  fs.writeFileSync("engine_league_strength.csv", "league,season,strength,n_obs,tier\n" + table.map(r => [r.league, r.season, r.strength, r.n_obs, r.tier].join(",")).join("\n") + "\n");
  console.error("wrote engine_league_strength.csv (" + table.length + " rows)");

  // age curve echo
  console.log("AGE CURVE (median dlog ga90 by age, sample): " + [23, 25, 27, 29, 31, 33].map(a => a + ":" + (ageCurve[a] != null ? ageCurve[a].toFixed(3) : "NR")).join("  "));
  console.log("mover obs used: " + movers.length + "   pooled strengths (all-window): " + LEAGUES.map(l => l + " " + Math.exp(pooled.s[l] || 0).toFixed(3)).join("  ") + "\n");

  const ladder = yr => { console.log("=== LADDER " + yr + " (window " + (yr - WINDOW) + "-" + (yr + WINDOW) + ") ===");
    const rowsY = table.filter(r => r.season === yr).sort((a, b) => b.strength - a.strength);
    console.table(rowsY.map(r => ({ league: r.league, strength: r.strength, placeholder: PLACEHOLDER[r.league], n_obs: r.n_obs, tier: r.tier }))); };
  [2023, 2020, 2016].forEach(ladder);
})().catch(e => { console.error("ERROR: " + e.message); process.exit(1); });
