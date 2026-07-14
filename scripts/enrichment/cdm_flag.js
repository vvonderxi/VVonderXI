// Stage 4: CDM position-mislabel flag (READ-ONLY). Cousin of the CM-bug fix.
// Flags CDM-pool cards that are actually attacking mids/wingers, via TWO signals:
//   (A) coarse contradiction: position_pool = CDM but coarse psc.position = FWD
//   (B) output profile:       position_pool = CDM but ga90 >= attacker Q3 (0.57), regulars only (>=900 min)
// Then determines each flagged player's MODAL attacking pool across their OTHER seasons.
// Writes cdm_flagged.csv + a reclassification plan to stdout. NO DB writes.
//   RUN: NODE_PATH=./node_modules node scripts/enrichment/cdm_flag.js
require("dotenv").config({ quiet: true });
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ATT_Q3 = 0.57;      // attacker ga90 Q3 (design log)
const MIN_FLOOR = 900;    // "regular" minutes floor for the output signal
const ATT = { ST: 1, Winger: 1, CAM: 1 };   // valid attacking destinations
const DEFP = { CB: 1, FB: 1, CDM: 1, CM: 1 };

(async () => {
  // 1. pull ALL rows (need full history for modal calc), post-2016 window like cm_bug_fill
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await sb.from("player_card_view")
      .select("card_id,api_player_id,season_year,league_code,player_name,team_name,season,position,position_pool,goals,assists,minutes,appearances,rt")
      .gte("season_year", 2016).order("card_id", { ascending: true }).range(from, from + 999);
    if (error) { console.error("LOAD ERR", error.message); process.exit(1); }
    rows = rows.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
  }
  const seen = {}; rows = rows.filter(r => { if (seen[r.card_id]) return false; seen[r.card_id] = 1; return true; });
  console.error("loaded " + rows.length + " deduped post-2016 rows");

  const ga90 = r => (r.minutes && r.minutes > 0) ? ((r.goals || 0) + (r.assists || 0)) / (r.minutes / 90) : 0;

  // 2. per-player modal pool across OTHER seasons (exclude the flagged CDM season's own pool noise)
  const hist = {};
  rows.forEach(r => { if (r.api_player_id == null) return; (hist[r.api_player_id] = hist[r.api_player_id] || []).push(r.position_pool); });
  // modal attacking pool: most common ATT pool the player carries elsewhere
  const modalAtt = id => {
    const c = {}; (hist[id] || []).forEach(p => { if (p && ATT[p]) c[p] = (c[p] || 0) + 1; });
    let b = null, n = 0; for (const k in c) if (c[k] > n) { n = c[k]; b = k; } return b;
  };
  // modal any non-CDM pool (fallback signal to see what they mostly are)
  const modalAny = id => {
    const c = {}; (hist[id] || []).forEach(p => { if (p && p !== "CDM") c[p] = (c[p] || 0) + 1; });
    let b = null, n = 0; for (const k in c) if (c[k] > n) { n = c[k]; b = k; } return b;
  };

  // 3. CDM-pool regulars count (denominator sanity vs design log 2152)
  const cdm = rows.filter(r => r.position_pool === "CDM");
  const cdmReg = cdm.filter(r => (r.minutes || 0) >= MIN_FLOOR);
  console.error("CDM pool total=" + cdm.length + "  regulars(>=" + MIN_FLOOR + "min)=" + cdmReg.length);

  // 4. flag
  const flagged = [];
  cdm.forEach(r => {
    const g = ga90(r);
    const sigCoarse = (r.position === "FWD");
    const sigOutput = (g >= ATT_Q3 && (r.minutes || 0) >= MIN_FLOOR);
    if (!sigCoarse && !sigOutput) return;
    flagged.push({ ...r, ga90: +g.toFixed(3), sigCoarse, sigOutput, modalAtt: modalAtt(r.api_player_id), modalAny: modalAny(r.api_player_id) });
  });

  const nCoarse = flagged.filter(f => f.sigCoarse).length;
  const nOutput = flagged.filter(f => f.sigOutput).length;
  const nBoth = flagged.filter(f => f.sigCoarse && f.sigOutput).length;
  console.error("FLAGGED total=" + flagged.length + "  coarse-FWD=" + nCoarse + "  output>=Q3(reg)=" + nOutput + "  both=" + nBoth);

  // 5. group by player for the reclassification plan
  const byPlayer = {};
  flagged.forEach(f => { (byPlayer[f.api_player_id] = byPlayer[f.api_player_id] || []).push(f); });

  console.log("\n=== FLAGGED PLAYERS (CDM pool -> proposed attacking pool) ===");
  console.log("api_id | player | seasons flagged | modal-ATT-pool | modal-any | -> proposed | signals");
  const plan = [];
  Object.keys(byPlayer).sort((a, b) => byPlayer[b].length - byPlayer[a].length).forEach(id => {
    const fs2 = byPlayer[id];
    const p = fs2[0];
    const mAtt = p.modalAtt, mAny = p.modalAny;
    // proposed pool: modal attacking pool if the player HAS attacking seasons; else modal-any if attacking; else CAM default (attacking-mid archetype of this bug)
    let proposed, via;
    if (mAtt) { proposed = mAtt; via = "modalAtt"; }
    else if (mAny && ATT[mAny]) { proposed = mAny; via = "modalAny"; }
    else { proposed = "CAM"; via = "default-CAM"; }
    const seasons = fs2.map(x => x.season_year).sort().join("/");
    const sigs = fs2.map(x => (x.sigCoarse ? "C" : "") + (x.sigOutput ? "O" : "")).join(",");
    const gaAvg = (fs2.reduce((s, x) => s + x.ga90, 0) / fs2.length).toFixed(2);
    console.log(
      id.padStart(6) + " | " + (p.player_name || "?").padEnd(22).slice(0, 22) +
      " | " + seasons.padEnd(24).slice(0, 24) +
      " | " + String(mAtt || "-").padEnd(7) +
      " | " + String(mAny || "-").padEnd(7) +
      " | -> " + proposed.padEnd(7) + " (" + via + ")" +
      " | ga90~" + gaAvg + " [" + sigs + "]"
    );
    fs2.forEach(x => plan.push({
      api_player_id: id, season_year: x.season_year, league_code: x.league_code,
      player_name: x.player_name, team_name: x.team_name, season: x.season, rt: x.rt,
      coarse: x.position, ga90: x.ga90, sigCoarse: x.sigCoarse, sigOutput: x.sigOutput,
      to: proposed, via
    }));
  });

  // 6. dump CSV
  const cols = ["api_player_id", "season_year", "league_code", "player_name", "team_name", "season", "rt", "coarse", "ga90", "sigCoarse", "sigOutput", "to", "via"];
  const esc = v => { v = (v == null) ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const out = "scripts/enrichment/cdm_flagged.csv";
  fs.writeFileSync(out, [cols.join(",")].concat(plan.map(p => cols.map(c => esc(p[c])).join(","))).join("\n") + "\n");
  console.log("\nwrote " + out + " (" + plan.length + " flagged rows, " + Object.keys(byPlayer).length + " players)");

  // 7. GUARDRAIL CHECK: genuine CDMs must NOT be flagged
  const GENUINE = { 44: "Rodri?", "Casemiro": 1 };
  const genuineNames = ["Rodri", "Casemiro", "Fabinho", "Busquets", "Kant", "Rice", "Partey"];
  const flaggedNames = new Set(plan.map(p => (p.player_name || "").toLowerCase()));
  console.log("\n=== GUARDRAIL: genuine-CDM watchlist (should be ABSENT) ===");
  genuineNames.forEach(n => {
    const hit = plan.filter(p => (p.player_name || "").toLowerCase().includes(n.toLowerCase()));
    console.log("  " + n.padEnd(12) + (hit.length ? "  !!! FLAGGED: " + hit.map(h => h.season_year).join(",") : "  ok (absent)"));
  });
})();
