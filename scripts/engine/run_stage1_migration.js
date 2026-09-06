// Stage 1 migration runner , applies migrations/stage1_def_share.sql via the service key (Node, no
// connection string). Requires the one-time exec_sql(text) helper to exist in the DB (see PREFLIGHT
// message below if it does not). Then: apply view -> refresh matview -> run the van Dijk/Tarkowski
// lift query -> print the result table. Run from repo root:
//   NODE_PATH=./node_modules node scripts/engine/run_stage1_migration.js
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BOOTSTRAP = `-- ONE-TIME enable (paste once in the Supabase SQL editor), then never again:
create or replace function public.exec_sql(sql text) returns void
  language plpgsql security definer set search_path = public as $$
begin execute sql; end $$;
revoke all on function public.exec_sql(text) from public, anon, authenticated;
grant execute on function public.exec_sql(text) to service_role;`;

const exec = async (sql) => {
  const { error } = await sb.rpc("exec_sql", { sql });
  if (error) throw new Error(error.message);
};

(async () => {
  // PREFLIGHT , is the exec_sql helper present?
  const probe = await sb.rpc("exec_sql", { sql: "select 1" });
  if (probe.error && /Could not find the function/i.test(probe.error.message)) {
    console.log("\n[BLOCKED] The exec_sql() helper does not exist yet , this is the one-time enable:\n");
    console.log(BOOTSTRAP);
    console.log("\nPaste that once in the Supabase SQL editor, then re-run this script. Nothing else needed ever again.\n");
    process.exit(3);
  }
  if (probe.error) throw new Error(probe.error.message);
  console.log("preflight: exec_sql() present.");

  // 1) apply the view migration
  const migration = fs.readFileSync("migrations/stage1_def_share.sql", "utf8");
  await exec(migration);
  console.log("applied: migrations/stage1_def_share.sql (CREATE OR REPLACE VIEW player_card_view)");

  // 2) refresh the matview the site reads (rt is untouched, so this is a no-op for the 47 shared
  //    columns; the 5 inspection columns are VIEW-ONLY , a matview's schema is fixed at CREATE time,
  //    REFRESH cannot add columns, and inspection columns intentionally do not belong on the site matview).
  await exec("refresh materialized view player_card_mv");
  console.log("refreshed: player_card_mv (rt unchanged; inspection columns live on player_card_view only)");

  // 3) lift query , raw-rank (defvol_pct) vs share-rank (def_share_pct). Query the VIEW: the inspection
  //    columns exist there, not on the matview.
  const { data, error } = await sb.from("player_card_view")
    .select("player_name,season_year,team_name,position_pool,def90,defvol_pct,team_def90,def_share,def_share_pct")
    .eq("position_pool", "CB")
    .or("player_name.ilike.%van dijk%,player_name.ilike.%tarkowski%")
    .order("player_name").order("season_year");
  if (error) throw new Error(error.message);

  const r2 = (x, n) => (x == null ? "NR" : Number(x).toFixed(n));
  const rows = data.map(d => ({
    player: (d.player_name || "").split(" ").slice(-1)[0],
    yr: d.season_year, team: (d.team_name || "").slice(0, 12),
    def90: r2(d.def90, 2),
    raw_rank: d.defvol_pct == null ? "NR" : (d.defvol_pct * 100).toFixed(1),
    team_def90: r2(d.team_def90, 2),
    def_share: r2(d.def_share, 3),
    share_rank: d.def_share_pct == null ? "NR" : (d.def_share_pct * 100).toFixed(1),
    lift: (d.def_share_pct == null || d.defvol_pct == null) ? "NR" : ((d.def_share_pct - d.defvol_pct) * 100).toFixed(1),
  }));
  console.log("\n=== LIFT: raw def90 rank vs opportunity-adjusted share rank (CB pool) ===");
  console.table(rows);
  console.log("\nlift = share_rank - raw_rank (positive = share metric credits the player more than raw volume did).");
})().catch(e => { console.error("MIGRATION ERROR: " + e.message); process.exit(1); });
