// READ-ONLY: for every coarse=FWD flagged CDM row (Bucket A + genuine-winger B),
// dump the player's FULL career pool history so destinations can be hand-verified by archetype.
// Excludes Bucket C (output-only, coarse=MID) entirely per approved Option-1 scope.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const L = fs.readFileSync("scripts/enrichment/cdm_flagged.csv", "utf8").trim().split("\n").slice(1);
  const rows = L.map(l => { const p = l.match(/(".*?"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, "").replace(/^"|"$/g, "")); return { id: p[0], yr: p[1], name: p[3], team: p[4], rt: p[6], coarse: p[7], ga90: +p[8], sc: p[9] === "true", so: p[10] === "true" }; });
  const fwd = rows.filter(r => r.sc);   // coarse=FWD only (Bucket A + winger-B)
  const byId = {}; fwd.forEach(r => { (byId[r.id] = byId[r.id] || []).push(r); });
  const ids = Object.keys(byId);
  console.log("coarse=FWD flagged players: " + ids.length + " (" + fwd.length + " rows)\n");

  // pull full career pool history for each
  for (const id of ids) {
    const { data } = await sb.from("player_card_view")
      .select("season_year,team_name,league_code,position,position_pool,minutes,goals,assists")
      .eq("api_player_id", id).order("season_year");
    // pool distribution across whole career
    const dist = {};
    (data || []).forEach(r => { if (r.position_pool) dist[r.position_pool] = (dist[r.position_pool] || 0) + 1; });
    const distStr = Object.keys(dist).sort((a, b) => dist[b] - dist[a]).map(k => k + ":" + dist[k]).join(" ");
    const fl = byId[id];
    const flStr = fl.map(f => f.yr + "(" + f.team.slice(0, 10) + ",ga90=" + f.ga90 + ")").join(" ");
    console.log(id.padStart(6) + " | " + (fl[0].name || "?").padEnd(24).slice(0, 24) + " | career-pools: " + distStr);
    console.log("       flagged: " + flStr);
  }
})();
