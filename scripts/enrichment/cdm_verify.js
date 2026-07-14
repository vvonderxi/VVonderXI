// Post-write verification (reads live player_card_view). Compares rt vs cdm_rt_before.csv.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function withRetry(fn, t = 5) { for (let i = 0; i < t; i++) { const r = await fn(); if (!r.error) return r; await sleep(300 * (i + 1)); } return fn(); }

(async () => {
  const B = fs.readFileSync("scripts/enrichment/cdm_rt_before.csv", "utf8").trim().split("\n").slice(1)
    .map(l => { const p = l.split(","); return { id: p[0], name: p[1], yr: p[2], lc: p[3], to: p[4], rt_before: +p[6] }; });

  let poolOk = 0, poolBad = 0, dropped = 0, up = 0, flat = 0, deltas = [];
  console.log("=== RECLASSIFIED (live view) ===");
  for (const r of B) {
    const { data } = await withRetry(() => sb.from("player_card_view").select("position_pool,rt,position")
      .eq("api_player_id", r.id).eq("season_year", r.yr).eq("league_code", r.lc).limit(1));
    const row = data && data[0];
    const poolNow = row ? row.position_pool : "?", rtNow = row ? row.rt : null;
    const d = rtNow != null ? rtNow - r.rt_before : null;
    if (poolNow === r.to) poolOk++; else { poolBad++; }
    if (d != null) { deltas.push(d); if (d < 0) dropped++; else if (d > 0) up++; else flat++; }
    if (poolNow !== r.to || (d != null && d > 0))
      console.log("  " + (poolNow !== r.to ? "POOL-MISMATCH " : "RT-UP ") + r.name + " " + r.yr + " " + r.lc + " pool " + r.to + "->" + poolNow + " rt " + r.rt_before + "->" + rtNow + " (" + (d > 0 ? "+" : "") + d + ")");
  }
  const avg = deltas.length ? (deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(2) : "-";
  console.log("pool correct: " + poolOk + "/" + B.length + "  (mismatch " + poolBad + ")");
  console.log("rt: dropped " + dropped + ", flat " + flat + ", up " + up + "  | mean delta " + avg + "  | range [" + Math.min(...deltas) + "," + Math.max(...deltas) + "]");

  console.log("\n=== GENUINE CDMs (must still be CDM, rt unchanged) ===");
  const G = [[44, 2023, "Rodri"], [44, 2022, "Rodri"], [1640, 2021, "Çalhanoğlu@Inter"], [1640, 2023, "Çalhanoğlu@Inter"], [1640, 2025, "Çalhanoğlu@Inter"], [872, 2016, "Pjanić"], [37749, 2023, "Veerman"], [37749, 2025, "Veerman"], [2050, 2016, "Banega"], [42309, 2016, "Sneijder"]];
  for (const [id, yr, nm] of G) {
    const { data } = await withRetry(() => sb.from("player_card_view").select("position_pool,rt,league_code").eq("api_player_id", id).eq("season_year", yr).limit(1));
    const row = data && data[0];
    console.log("  " + nm.padEnd(18) + yr + " -> pool=" + (row ? row.position_pool : "?") + " rt=" + (row ? row.rt : "?") + (row && row.position_pool === "CDM" ? "  OK" : "  <-- CHECK"));
  }
  // Casemiro (find his id)
  const { data: cas } = await withRetry(() => sb.from("player_card_view").select("api_player_id,season_year,position_pool,rt").ilike("player_name", "%Casemiro%").order("season_year", { ascending: false }).limit(3));
  console.log("  Casemiro sample: " + (cas || []).map(r => r.season_year + ":" + r.position_pool + "/rt" + r.rt).join("  "));
})();
