// Stage-4 CDM-mislabel write. GUARDED UPDATE player_positions: only rows currently position='CDM' change.
// Captures pre-write rt baseline for post-refresh verification. Appends to known_players.csv.
// DRY-RUN unless --write.  RUN: NODE_PATH=./node_modules node scripts/enrichment/cdm_write.js [--write]
require("dotenv").config({ quiet: true });
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const WRITE = process.argv.includes("--write");
const DICT = "scripts/enrichment/known_players.csv";
const PLAN = "scripts/enrichment/cdm_reclass_plan.csv";

const sleep = ms => new Promise(r => setTimeout(r, ms));
// retry a supabase thunk until it returns without error (transient throttle guard)
async function withRetry(fn, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fn();
    if (!res.error) return res;
    await sleep(300 * (i + 1));
  }
  return await fn();
}

(async () => {
  const L = fs.readFileSync(PLAN, "utf8").trim().split("\n").slice(1);
  const plan = L.map(l => { const p = l.match(/(".*?"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, "").replace(/^"|"$/g, "")); return { id: p[0], name: p[1], yr: p[2], lc: p[3], team: p[4], to: p[6] }; });
  console.log("plan rows: " + plan.length + "  (WRITE=" + WRITE + ")");

  // 1. pre-write rt baseline (from matview via view) for verification
  const before = [];
  for (const r of plan) {
    const { data } = await withRetry(() => sb.from("player_card_view").select("rt,position_pool")
      .eq("api_player_id", r.id).eq("season_year", r.yr).eq("league_code", r.lc).limit(1));
    before.push({ ...r, rt_before: data && data[0] ? data[0].rt : null, pool_before: data && data[0] ? data[0].position_pool : null });
  }
  const nullBase = before.filter(r => r.rt_before == null);
  if (nullBase.length) console.log("WARN: " + nullBase.length + " rows still null after retry: " + nullBase.map(r => r.id + "/" + r.yr).join(", "));
  fs.writeFileSync("scripts/enrichment/cdm_rt_before.csv",
    "id,name,yr,lc,to,pool_before,rt_before\n" + before.map(r => [r.id, r.name, r.yr, r.lc, r.to, r.pool_before, r.rt_before].join(",")).join("\n") + "\n");
  const nonCdm = before.filter(r => r.pool_before !== "CDM");
  console.log("baseline captured -> cdm_rt_before.csv. rows whose pool is NOT currently CDM (guard will skip): " + nonCdm.length +
    (nonCdm.length ? " [" + nonCdm.map(r => r.id + "/" + r.yr).join(", ") + "]" : ""));

  if (!WRITE) { console.log("\n[DRY RUN] no writes. Re-run with --write."); return; }

  // 2. guarded UPDATE (position='CDM' guard => nothing else can change)
  let ok = 0, err = 0, skip = 0;
  for (const r of plan) {
    const { data, error } = await withRetry(() => sb.from("player_positions").update({ position: r.to })
      .eq("api_player_id", r.id).eq("season_year", r.yr).eq("league_code", r.lc).eq("position", "CDM").select("api_player_id"));
    if (error) { err++; if (err <= 5) console.error("UPD ERR " + r.id + "/" + r.yr + ": " + error.message); }
    else if (!data || !data.length) { skip++; console.error("SKIP (no CDM row matched): " + r.name + " " + r.id + "/" + r.yr + "/" + r.lc); }
    else ok++;
  }
  // 3. append to dictionary
  const today = new Date().toISOString().slice(0, 10);
  const csv = plan.map(r => [r.id, r.yr, r.to, "cdm-mislabel", today].join(","));
  fs.appendFileSync(DICT, "\n" + csv.join("\n"));
  console.log("\nWROTE: updated=" + ok + "  skipped=" + skip + "  errors=" + err + "  dict appended=" + csv.length);
  console.log(">>> NOW paste in Supabase SQL editor:  REFRESH MATERIALIZED VIEW player_card_mv;");
})();
