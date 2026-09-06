// Stage-0 engine baseline snapshot. Reads player_card_mv (read-only), writes:
//   engine_baseline_snapshot.csv   , all player-seasons (card_id, player_name, season_year, position_pool, position, rt)
//   engine_baseline_summary.md     , per-pool rt distribution + read-out names, current shape
// Reproducible: run from repo root with  NODE_PATH=./node_modules node scripts/engine/baseline_snapshot.js
// NO writes to the DB , baseline capture only, so every later recalibration stage is measurable.
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const csv = s => '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';

(async () => {
  // load all rows (STABLE pagination by card_id)
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await sb.from("player_card_mv")
      .select("card_id,player_name,season_year,position_pool,position,rt")
      .order("card_id", { ascending: true }).range(from, from + 999);
    if (error) { console.error("LOAD ERR", error.message); process.exit(1); }
    rows = rows.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
  }
  const seen = {}; rows = rows.filter(r => { if (seen[r.card_id]) return false; seen[r.card_id] = 1; return true; });
  console.error("loaded " + rows.length + " deduped rows");

  // 1) full CSV
  const head = "card_id,player_name,season_year,position_pool,position,rt";
  const body = rows.map(r => [r.card_id, csv(r.player_name), r.season_year,
    r.position_pool == null ? "" : r.position_pool, r.position == null ? "" : r.position, r.rt == null ? "" : r.rt].join(","));
  fs.writeFileSync("engine_baseline_snapshot.csv", head + "\n" + body.join("\n") + "\n");
  console.error("wrote engine_baseline_snapshot.csv (" + rows.length + " rows)");

  // 2) summary.md
  const byPool = {}; rows.forEach(r => { if (r.rt == null) return; const k = r.position_pool || "(null/pre-2016)"; (byPool[k] = byPool[k] || []).push(r.rt); });
  let md = "# Engine Baseline Snapshot , Summary (Stage 0)\n\n";
  md += "Current rt shape BEFORE the engine recalibration (Decisions 1-3, see VVonderXI_Engine_Design_Log.md). ";
  md += "Source: `player_card_mv`, " + rows.length + " player-seasons. Full per-row baseline: `engine_baseline_snapshot.csv` (diff every later stage against it).\n\n";
  md += "## Per-pool rt distribution\n\n| pool | count | mean | p50 | p90 | max |\n|---|---|---|---|---|---|\n";
  ["ST", "Winger", "CAM", "CM", "CDM", "FB", "CB", "GK", "(null/pre-2016)"].forEach(k => {
    const a = byPool[k]; if (!a) return;
    md += "| " + k + " | " + a.length + " | " + (a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) + " | " + pct(a, 50) + " | " + pct(a, 90) + " | " + Math.max(...a) + " |\n";
  });
  md += "\n> CB (mean ~46.7) sits ~12 pts below ST (mean ~58.5) , the defensive-blindness Decision 1+2 corrects. Target after recalibration: CB/FB means rise; ST/Winger peaks unchanged.\n";

  const fmt = rs => rs.map(r => r.season_year + ":" + (r.rt == null ? "NR" : r.rt)).join(" ");
  const nameRows = (sub, extra) => rows.filter(r => (r.player_name || "").toLowerCase().includes(sub) && (!extra || extra(r))).sort((a, b) => a.season_year - b.season_year);
  const peak = sub => rows.filter(r => (r.player_name || "").toLowerCase().includes(sub) && r.rt != null).sort((a, b) => b.rt - a.rt)[0];
  const vd = nameRows("van dijk", r => r.position_pool === "CB");
  const ka = nameRows("kanté", r => r.season_year >= 2015 && (r.player_name || "").startsWith("N"));
  const tk = nameRows("tarkowski", r => r.position_pool === "CB");
  const taa = nameRows("alexander-arnold");
  const me = peak("messi"), cr = peak("cristiano ronaldo"), ha = peak("haaland");
  const pk = x => x ? x.position_pool + " | " + x.season_year + ":" + x.rt : " | ";
  md += "\n## Read-out names , current rt (validate every stage against these)\n\n";
  md += "| read-out | pool | current rt |\n|---|---|---|\n";
  md += "| van Dijk (CB seasons) , TARGET ~85+ | CB | " + fmt(vd) + " |\n";
  md += "| Kanté (N'Golo) , TARGET high | CM/CDM/CAM | " + fmt(ka) + " |\n";
  md += "| Journeyman CB (Tarkowski) , TARGET stay mid | CB | " + fmt(tk) + " |\n";
  md += "| Alexander-Arnold , elite WITHIN FB pool | FB | " + fmt(taa) + " |\n";
  md += "| Messi PEAK , unchanged | " + pk(me) + " |\n";
  md += "| Ronaldo PEAK , unchanged | " + pk(cr) + " |\n";
  md += "| Haaland PEAK , unchanged | " + pk(ha) + " |\n";
  md += "\n> WRINKLE (flagged, deferred): van Dijk/Tarkowski/TAA flip FB<->CB across seasons (residual position-accuracy tail, separate from the CM-bug). van Dijk validation uses his CB seasons; the FB/CB tail is a candidate for the position pass before the defensive within-pool percentile goes live.\n";
  fs.writeFileSync("engine_baseline_summary.md", md);
  console.error("wrote engine_baseline_summary.md");

  // echo read-out table to stdout for the reviewer
  console.log("\nREAD-OUTS:");
  console.log("  van Dijk (CB): " + fmt(vd));
  console.log("  Kanté (N'Golo): " + fmt(ka));
  console.log("  Tarkowski (CB): " + fmt(tk));
  console.log("  Alexander-Arnold (FB): " + fmt(taa));
  console.log("  Messi peak: " + pk(me).replace(" | ", " "));
  console.log("  Ronaldo peak: " + pk(cr).replace(" | ", " "));
  console.log("  Haaland peak: " + pk(ha).replace(" | ", " "));
})();
