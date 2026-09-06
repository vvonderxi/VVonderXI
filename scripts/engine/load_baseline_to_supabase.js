// Load engine_baseline_snapshot.csv into the Supabase table engine_baseline_snapshot.
// Prereq: run the CREATE TABLE from engine_baseline_snapshot.sql in the Supabase SQL editor FIRST
//         (supabase-js / PostgREST cannot run DDL). Then load the data here (service key, batched upsert).
// DRY-RUN by default (parses CSV, no writes). Run from repo root:
//   NODE_PATH=./node_modules node scripts/engine/load_baseline_to_supabase.js          # dry-run
//   NODE_PATH=./node_modules node scripts/engine/load_baseline_to_supabase.js --write  # load
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);
const WRITE = process.argv.includes("--write");

// minimal RFC-4180 field parser (handles the quoted player_name with commas / escaped quotes)
function parseLine(line) {
  const out = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else { if (c === '"') inQ = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  }
  out.push(cur); return out;
}

(async () => {
  const raw = fs.readFileSync("engine_baseline_snapshot.csv", "utf8").split(/\r?\n/).filter(l => l.length);
  raw.shift(); // header
  const rows = raw.map(l => {
    const f = parseLine(l);
    return {
      card_id: Number(f[0]),
      player_name: f[1],
      season_year: f[2] === "" ? null : Number(f[2]),
      position_pool: f[3] === "" ? null : f[3],
      position: f[4] === "" ? null : f[4],
      rt: f[5] === "" ? null : Number(f[5]),
    };
  });
  console.error("parsed " + rows.length + " rows from engine_baseline_snapshot.csv");
  console.log("  sample: " + JSON.stringify(rows.slice(0, 2)));
  console.log("  nulls , position_pool: " + rows.filter(r => r.position_pool == null).length + "   rt: " + rows.filter(r => r.rt == null).length);

  if (!WRITE) { console.log("\n[DRY RUN] parsed OK, no writes. After the CREATE TABLE (engine_baseline_snapshot.sql), re-run with --write.\n"); return; }

  let ok = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { data, error } = await sb.from("engine_baseline_snapshot").upsert(batch, { onConflict: "card_id" }).select("card_id");
    if (error) { console.error("BATCH ERR @" + i + ": " + error.message); process.exit(1); }
    ok += (data ? data.length : 0);
  }
  console.log("LOADED " + ok + " rows into engine_baseline_snapshot.");
})();
