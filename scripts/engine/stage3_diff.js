// Stage 3b , SWAP-DIFF (offline). Takes the SHIPPED Stage-2 engine (migrations/stage2_bounded_def_bestof.sql)
// and swaps ONLY the league weight source: wt now = engine_league_weights (computed alpha=0.5 per season)
// instead of the flat placeholder leagues.league_strength_weight. Materializes engine_stage3_rt (live view
// UNTOUCHED) and diffs vs engine_baseline_stage2 (= current live post-Stage-2 rt). No swap until approved.
// Run: NODE_PATH=./node_modules node scripts/engine/stage3_diff.js
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const exec = async (sql) => { const { error } = await sb.rpc("exec_sql", { sql }); if (error) throw new Error(error.message); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = async (t, s, b) => { for (let i = 0; i < 8; i++) { let q = sb.from(t).select(s); if (b) q = b(q); const r = await q; if (!r.error) return r.data; if (!/schema cache|does not exist/i.test(r.error.message)) throw new Error(r.error.message); await sleep(1500); } throw new Error("nv " + t); };

(async () => {
  // build candidate engine from the shipped migration, swapping only the wt source + target
  const mig = fs.readFileSync("migrations/stage2_bounded_def_bestof.sql", "utf8");
  const eng = mig
    .replace("CREATE OR REPLACE VIEW player_card_view AS", "CREATE TABLE engine_stage3_rt AS")
    .replace("COALESCE(l_1.league_strength_weight, 0.80) AS wt", "COALESCE(elw.weight, l_1.league_strength_weight, 0.80) AS wt")
    .replace("FROM player_season_cards psc_1 LEFT JOIN leagues l_1 ON psc_1.league_id = l_1.id",
             "FROM player_season_cards psc_1 LEFT JOIN leagues l_1 ON psc_1.league_id = l_1.id LEFT JOIN engine_league_weights elw ON elw.league_code = psc_1.league_code AND elw.season_year = psc_1.season_year")
    // SOCKET RE-TUNE for the spread computed weights: tilt coefficient 0.5 -> 0.35 (both base + GK), boost exponent 3.5 -> 2.5
    .replace(/\(1::numeric - r\.wt\) \* 0\.5\)/g, "(1::numeric - r.wt) * 0.35)")
    .replace("power(r.wt, 3.5::numeric)", "power(r.wt, 2.5::numeric)");
  if (!eng.includes("engine_league_weights elw")) throw new Error("wt swap did not apply , aborting");
  if ((eng.match(/\* 0\.35\)/g) || []).length < 2) throw new Error("tilt re-tune did not apply to both sockets , aborting");
  if (!eng.includes("power(r.wt, 2.5::numeric)")) throw new Error("boost exponent re-tune did not apply , aborting");
  await exec("drop table if exists engine_stage3_rt");
  await exec(eng);
  await exec("drop table if exists engine_stage3_diff");
  await exec(`create table engine_stage3_diff as select s.card_id, s.player_name, s.player_name_norm, s.position_pool, s.season_year, s.team_name, s.league_code, s.goals, s.assists, s.rt as rt_new, b.rt as rt_old from engine_stage3_rt s left join engine_baseline_stage2 b using(card_id)`);
  await exec("create index on engine_stage3_diff (player_name_norm)");
  await exec("create index on engine_stage3_diff (league_code)");
  await exec("drop table if exists engine_stage3_lg");
  await exec("create table engine_stage3_lg as select league_code, count(*) n, round(avg(rt_old)::numeric,1) old, round(avg(rt_new)::numeric,1) new, round(avg(rt_new-rt_old)::numeric,1) delta, count(*) filter (where rt_new < rt_old) down, count(*) filter (where rt_new > rt_old) up from engine_stage3_diff where rt_old is not null and rt_new is not null group by league_code");
  await exec("notify pgrst, 'reload schema'"); await sleep(2500);
  console.log("materialized engine_stage3_rt + diff (live view UNTOUCHED).\n");

  // per-league movement
  const lg = await read("engine_stage3_lg", "*");
  console.log("=== PER-LEAGUE rt SHIFT (placeholder -> computed alpha=0.5 weights) ===");
  console.table(lg.sort((a, b) => a.delta - b.delta).map(r => ({ league: r.league_code, n: r.n, old_mean: r.old, new_mean: r.new, delta: r.delta, down: r.down, up: r.up })));

  // overall
  let all = [], from = 0; while (true) { const r = await sb.from("engine_stage3_diff").select("rt_old,rt_new").not("rt_old", "is", null).not("rt_new", "is", null).range(from, from + 999); if (r.error) throw new Error(r.error.message); all = all.concat(r.data || []); if (!r.data || r.data.length < 1000) break; from += 1000; }
  const d = all.map(x => x.rt_new - x.rt_old); const moved = d.filter(x => x !== 0).length;
  const buckets = { "down 6+": d.filter(x => x <= -6).length, "down 3-5": d.filter(x => x <= -3 && x > -6).length, "down 1-2": d.filter(x => x < 0 && x > -3).length, "flat": d.filter(x => x === 0).length, "up 1-2": d.filter(x => x > 0 && x < 3).length, "up 3+": d.filter(x => x >= 3).length };
  console.log("\nTOTAL scored: " + all.length + "   moved: " + moved + " (" + Math.round(100 * moved / all.length) + "%)   mean delta: " + (d.reduce((s, x) => s + x, 0) / d.length).toFixed(2));
  console.log("distribution: " + Object.entries(buckets).map(([k, v]) => k + "=" + v).join("  "));

  // read-out anchors (peak season, old vs new)
  const pk = async (norm, pools) => { let b = q => { let x = q.ilike("player_name_norm", "%" + norm + "%"); if (pools) x = x.in("position_pool", pools); return x.order("rt_new", { ascending: false }).limit(1); }; const r = await read("engine_stage3_diff", "player_name,position_pool,season_year,league_code,goals,assists,rt_old,rt_new", b); return r && r[0]; };
  const A = [["messi", "Messi", null], ["cristiano ronaldo", "Ronaldo", null], ["haaland", "Haaland", null], ["alexanderarnold", "TAA", ["FB"]], ["van dijk", "van Dijk", ["CB"]], ["ruben%dias", "Dias", ["CB"]]];
  const ar = []; for (const [n, l, p] of A) { const r = await pk(n, p); if (r) ar.push({ player: l, lg: r.league_code, yr: r.season_year, GA: r.goals + "+" + (r.assists || 0), old: r.rt_old, new: r.rt_new, d: (r.rt_new != null && r.rt_old != null) ? r.rt_new - r.rt_old : "NR" }); }
  console.log("\n=== READ-OUT ANCHORS (peak, old -> new) ===");
  console.table(ar);
  // Grimaldo both contexts + a weak-league & strong-league sample
  const gr = await read("engine_stage3_diff", "player_name,position_pool,season_year,league_code,goals,assists,rt_old,rt_new", q => q.ilike("player_name_norm", "%grimaldo%").order("rt_new", { ascending: false }));
  console.log("=== Grimaldo by context (weak PRT vs strong BL) ===");
  console.table((gr || []).slice(0, 5).map(r => ({ yr: r.season_year, lg: r.league_code, GA: r.goals + "+" + (r.assists || 0), old: r.rt_old, new: r.rt_new, d: r.rt_new - r.rt_old })));
  // biggest droppers among high-rated cards
  const big = await sb.from("engine_stage3_diff").select("player_name,league_code,season_year,rt_old,rt_new").not("rt_old", "is", null).not("rt_new", "is", null).order("rt_old", { ascending: false }).limit(4000);
  const bigMovers = (big.data || []).map(r => ({ ...r, delta: r.rt_new - r.rt_old })).filter(r => r.rt_old >= 78).sort((a, b) => a.delta - b.delta).slice(0, 10);
  console.log("=== BIGGEST DROPPERS among high-rated cards (rt_old>=78) ===");
  console.table(bigMovers.map(r => ({ p: r.player_name.split(" ").slice(-1)[0], lg: r.league_code, yr: r.season_year, old: r.rt_old, new: r.rt_new, delta: r.delta })));
})().catch(e => { console.error("ERROR: " + e.message); process.exit(1); });
