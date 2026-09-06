require("dotenv").config({ quiet: true });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const T = [[25647,2016,"?"],[39095,2021,"?"],[39137,2021,"?"],[44612,2019,"?"],[48022,2021,"?"],[48579,2018,"?"],[49851,2018,"?"],[50123,2018,"?"],[50180,2019,"?"],[62004,2019,"?"],[83023,2020,"?"],[85772,2020,"?"]];
(async () => {
  for (const [id, yr] of T) {
    const { data: pp } = await sb.from("player_positions").select("season_year,league_code,position,shirt_number").eq("api_player_id", id).eq("season_year", yr);
    const { data: cv } = await sb.from("player_card_view").select("card_id,season_year,league_code,team_name,position,position_pool,minutes").eq("api_player_id", id).eq("season_year", yr).order("card_id");
    console.log("\n=== " + id + " " + yr + " ===");
    console.log("  player_positions: " + JSON.stringify(pp));
    console.log("  card_view rows:   " + (cv || []).map(r => r.league_code + "/" + (r.team_name||"").slice(0,12) + " coarse=" + r.position + " pool=" + r.position_pool + " min=" + r.minutes).join("  ||  "));
  }
})();
