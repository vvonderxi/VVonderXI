// READ-ONLY: how does player_positions store the CDM value for flagged rows? (for the write guard)
require("dotenv").config({ quiet: true });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const probes = [[207,2017,"SA"],[47289,2016,"LL"],[635,2017,"PL"],[1989,2016,"TR"],[178,2019,"PL"]];
(async () => {
  const vals = {};
  for (const [id,yr,lc] of probes) {
    const { data, error } = await sb.from("player_positions")
      .select("api_player_id,season_year,league_code,position,shirt_number").eq("api_player_id",id).eq("season_year",yr);
    console.log(id+" "+yr+" "+lc+" -> "+(error?("ERR "+error.message):JSON.stringify(data)));
    (data||[]).forEach(r=>vals[r.position]=(vals[r.position]||0)+1);
  }
  // distinct position values in player_positions that map to CDM pool?
  const { data: distinct } = await sb.from("player_positions").select("position").limit(2000);
  const dv={}; (distinct||[]).forEach(r=>dv[r.position]=(dv[r.position]||0)+1);
  console.log("\nprobe hit position values:", JSON.stringify(vals));
  console.log("distinct player_positions.position sample:", JSON.stringify(dv));
})();
