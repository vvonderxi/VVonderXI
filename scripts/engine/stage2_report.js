// Stage 2 diff report , engine_stage2_rt (new) vs engine_baseline_snapshot (old = current live rt).
// Read-only reporting; no live change. Run: NODE_PATH=./node_modules node scripts/engine/stage2_report.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const exec = async (sql) => { const { error } = await sb.rpc("exec_sql", { sql }); if (error) throw new Error(error.message); };
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function q(tbl, build){ for(let i=0;i<8;i++){ const r=await build(sb.from(tbl)); if(!r.error) return r.data; if(!/schema cache|does not exist/i.test(r.error.message)) throw new Error(r.error.message); await sleep(1500);} throw new Error("not visible: "+tbl); }

(async () => {
  await exec("drop table if exists engine_stage2_diff");
  await exec(`create table engine_stage2_diff as
    select s.card_id, s.player_name, s.player_name_norm, s.position_pool, s.season_year, s.team_name, s.goals, s.assists, b.rt as rt_old, s.rt as rt_new
    from engine_stage2_rt s left join engine_baseline_snapshot b using (card_id)`);
  await exec("create index on engine_stage2_diff (player_name_norm)");
  await exec("create index on engine_stage2_diff (position_pool)");
  await exec("drop table if exists engine_stage2_pool");
  await exec(`create table engine_stage2_pool as
    select coalesce(position_pool,'(none)') as pool, count(*) n,
      round(avg(rt_old)::numeric,1) avg_old, round(avg(rt_new)::numeric,1) avg_new,
      round(avg(rt_new-rt_old)::numeric,1) delta, max(rt_new) max_new
    from engine_stage2_diff where rt_old is not null and position_pool is not null group by 1`);
  await exec("notify pgrst, 'reload schema'");

  // 1) per-pool shift
  const pool = await q("engine_stage2_pool", t=>t.select("*"));
  const ORD={ST:1,Winger:2,CAM:3,CM:4,CDM:5,FB:6,CB:7,GK:8};
  console.log("\n=== PER-POOL rt SHIFT (old=current live, new=Stage 2) ===");
  console.table(pool.sort((a,b)=>(ORD[a.pool]||9)-(ORD[b.pool]||9)));

  // 2) anchor defenders , peak (max new) with old
  const peak = async (norm, pools) => { const d = await q("engine_stage2_diff", t=>{ let x=t.select("player_name,position_pool,season_year,team_name,goals,assists,rt_old,rt_new").ilike("player_name_norm","%"+norm+"%"); if(pools) x=x.in("position_pool",pools); return x.order("rt_new",{ascending:false}).limit(1);}); return d[0]; };
  const defs=[["van dijk","van Dijk",["CB"]],["ruben%dias","Dias",["CB"]],["saliba","Saliba",["CB"]],["koulibaly","Koulibaly",["CB"]],["tarkowski","Tarkowski",["CB"]],["maguire","Maguire",["CB"]],["scott%dann","Dann(jrny)",["CB"]],
    ["alexanderarnold","TAA",["FB"]],["hakimi","Hakimi",["FB"]],["robertson","Robertson",["FB"]],["cancelo","Cancelo",["FB"]],["wanbissaka","Wan-Bissaka",["FB"]],["aurier","Aurier(jrny)",["FB"]]];
  const drows=[]; for(const [nm,lbl,pl] of defs){ const r=await peak(nm,pl); if(r) drows.push({player:lbl,pool:r.position_pool,yr:r.season_year,GA:r.goals+"+"+(r.assists||0),peak_old:r.rt_old,peak_new:r.rt_new,delta:r.rt_new-r.rt_old}); }
  console.log("\n=== ANCHOR DEFENDERS , peak rt old -> new ===");
  console.table(drows);

  // 3) cross-position GATES
  const atk=[["messi","Messi"],["cristiano ronaldo","Ronaldo"],["haaland","Haaland"]];
  const arows=[]; for(const [nm,lbl] of atk){ const r=await peak(nm,null); if(r) arows.push({player:lbl,pool:r.position_pool,yr:r.season_year,peak_old:r.rt_old,peak_new:r.rt_new,delta:r.rt_new-r.rt_old}); }
  console.log("\n=== GATE A , Messi/Ronaldo/Haaland peaks MUST be unchanged ===");
  console.table(arows);

  const topDef = await q("engine_stage2_diff", t=>t.select("player_name,position_pool,season_year,rt_new").in("position_pool",["CB","FB"]).order("rt_new",{ascending:false}).limit(8));
  console.log("\n=== GATE B , highest-scoring DEFENDERS (CB/FB). None should reach elite-attacker territory ===");
  console.table(topDef.map(r=>({player:r.player_name.split(" ").slice(-1)[0],pool:r.position_pool,yr:r.season_year,rt_new:r.rt_new})));

  const lowST = await q("engine_stage2_diff", t=>t.select("player_name,season_year,goals,rt_new").eq("position_pool","ST").gte("goals",20).order("rt_new",{ascending:true}).limit(6));
  console.log("\n=== GATE C , LOWEST-rated 20-goal STs. Even these must be CLEAR of any CB/FB ===");
  console.table(lowST.map(r=>({player:r.player_name.split(" ").slice(-1)[0],yr:r.season_year,goals:r.goals,rt_new:r.rt_new})));
})().catch(e => { console.error("REPORT ERROR: " + e.message); process.exit(1); });
