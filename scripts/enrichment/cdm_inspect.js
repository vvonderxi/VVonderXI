// READ-ONLY: dump full season pool history for specific api_player_ids (destination sanity).
require("dotenv").config({ quiet: true });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const IDS = [1640, 174, 19187, 326757, 44, 15, 108, 266, 147, 42309, 872, 2926, 37155, 37749, 511]; // Calhanoglu, Eriksen, Grealish, Bellingham?, Rodri, ?, Fabregas, DiMaria, Coutinho, Sneijder, Pjanic, Tielemans, Kokcu, Veerman, Goretzka
(async () => {
  for (const id of IDS) {
    const { data } = await sb.from("player_card_view")
      .select("api_player_id,player_name,season_year,team_name,league_code,position,position_pool,minutes,goals,assists,rt")
      .eq("api_player_id", id).order("season_year");
    if (!data || !data.length) { console.log("\n" + id + " : NO ROWS"); continue; }
    console.log("\n=== " + id + "  " + data[0].player_name + " ===");
    data.forEach(r => {
      const ga90 = r.minutes > 0 ? (((r.goals||0)+(r.assists||0))/(r.minutes/90)).toFixed(2) : "-";
      console.log("  " + r.season_year + " " + String(r.team_name||"").padEnd(16).slice(0,16) + " " + r.league_code +
        " coarse=" + String(r.position).padEnd(4) + " pool=" + String(r.position_pool).padEnd(7) +
        " min=" + String(r.minutes||0).padStart(4) + " g=" + String(r.goals||0).padStart(2) + " a=" + String(r.assists||0).padStart(2) +
        " ga90=" + ga90 + " rt=" + r.rt);
    });
  }
})();
