// #118 data-lock: Tier-1 CM-bug fix + null-fill for player_positions. DRY-RUN unless --write.
// Guards: CM-bug UPDATEs constrained to .eq('position','CM') (only definitionally-wrong rows change);
// null-fills INSERT via ON CONFLICT DO NOTHING. Run from repo root: NODE_PATH=./node_modules node <this> [--write]
require("dotenv").config();
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);
const WRITE = process.argv.includes("--write");
const ATT = { ST:1, Winger:1, CAM:1 }, DEFP = { CB:1, FB:1, CDM:1 };
const DICT_PATH = "scripts/enrichment/known_players.csv";

(async () => {
  // 1. load all post-2016 rows (STABLE pagination by card_id)
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await sb.from("player_card_mv")
      .select("card_id,api_player_id,season_year,league_code,position,position_pool,player_name")
      .gte("season_year", 2016).order("card_id", { ascending: true }).range(from, from + 999);
    if (error) { console.error("LOAD ERR", error.message); process.exit(1); }
    rows = rows.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
  }
  const seen = {}; rows = rows.filter(r => { if (seen[r.card_id]) return false; seen[r.card_id] = 1; return true; });
  console.error("loaded " + rows.length + " deduped post-2016 rows");

  // 2. per-player modal non-CM pool + dictionary
  const hist = {}; rows.forEach(r => { if (r.api_player_id == null) return; (hist[r.api_player_id] = hist[r.api_player_id] || []).push(r.position_pool); });
  const modal = id => { const c = {}; (hist[id] || []).forEach(p => { if (p && p !== "CM") c[p] = (c[p] || 0) + 1; }); let b = null, n = 0; for (const k in c) if (c[k] > n) { n = c[k]; b = k; } return b; };
  const dict = {}; fs.readFileSync(DICT_PATH, "utf8").split(/\n/).slice(1).forEach(l => { const p = l.split(","); if (p[0] && p[0].trim()) dict[p[0].trim() + "|" + p[1]] = p[2]; });

  // CM-bug (coarse FWD/DEF): modal coarse-gated -> dict -> coarse-DEFAULT (always resolves).
  function classifyCM(r) {
    const m = modal(r.api_player_id), want = r.position === "FWD" ? ATT : DEFP;
    if (m && want[m]) return { pos: m, via: "modal" };
    const d = dict[r.api_player_id + "|" + r.season_year]; if (d && want[d]) return { pos: d, via: "dict" };
    return { pos: r.position === "FWD" ? "Winger" : "CB", via: "default" };
  }
  // Null-fill: GK -> GK; else player's own modal; else dict; else LEAVE null (NO default , obscure tail).
  function classifyNull(r) {
    if (r.position === "GK") return { pos: "GK", via: "gk" };
    const m = modal(r.api_player_id); if (m) return { pos: m, via: "modal" };
    const d = dict[r.api_player_id + "|" + r.season_year]; if (d) return { pos: d, via: "dict" };
    return null; // leave
  }

  // 3a. CM-bug UPDATEs (pool=CM & coarse FWD/DEF)
  const cmUp = [], cmVia = { modal: 0, dict: 0, default: 0 };
  rows.filter(r => r.position_pool === "CM" && (r.position === "FWD" || r.position === "DEF")).forEach(r => {
    const c = classifyCM(r); cmVia[c.via]++;
    cmUp.push({ api_player_id: r.api_player_id, season_year: r.season_year, league_code: r.league_code, to: c.pos, via: c.via, name: r.player_name, coarse: r.position });
  });

  // 3b. null-fill INSERTs (GK + own-modal only; obscure/no-signal LEFT null)
  const nlIns = [], nlVia = { gk: 0, modal: 0, dict: 0, leave: 0 };
  rows.filter(r => r.position_pool == null).forEach(r => {
    const c = classifyNull(r); if (!c) { nlVia.leave++; return; }
    nlVia[c.via]++;
    nlIns.push({ api_player_id: r.api_player_id, season_year: r.season_year, league_code: r.league_code, to: c.pos, via: c.via, name: r.player_name });
  });

  // 4. report
  const smp = (arr, v, n) => arr.filter(u => u.via === v).slice(0, n).map(u => u.name + " " + u.season_year + " " + (u.coarse ? "CM->" : "->") + u.to).join(" | ");
  console.log("\n=== CM-BUG UPDATEs  (guard: player_positions.position = 'CM') ===");
  console.log("  total " + cmUp.length + "   modal=" + cmVia.modal + "  default=" + cmVia.default + "  dict=" + cmVia.dict);
  console.log("  sample MODAL:   " + smp(cmUp, "modal", 6));
  console.log("  sample DEFAULT: " + smp(cmUp, "default", 6));
  console.log("\n=== NULL-FILL INSERTs  (ON CONFLICT DO NOTHING) ===");
  console.log("  total " + nlIns.length + "   gk=" + nlVia.gk + "  modal=" + nlVia.modal + "   (leave null=" + nlVia.leave + ")");
  console.log("  sample GK:    " + smp(nlIns, "gk", 4));
  console.log("  sample MODAL: " + smp(nlIns, "modal", 6));

  if (!WRITE) { console.log("\n[DRY RUN] no writes. Re-run with --write to execute, append " + DICT_PATH + ", then REFRESH MATERIALIZED VIEW player_card_mv in Supabase.\n"); return; }

  // 5. EXECUTE (guarded)
  const today = new Date().toISOString().slice(0, 10);
  let upOk = 0, upErr = 0;
  for (const u of cmUp) {
    const { data, error } = await sb.from("player_positions").update({ position: u.to })
      .eq("api_player_id", u.api_player_id).eq("season_year", u.season_year).eq("league_code", u.league_code)
      .eq("position", "CM").select("api_player_id");
    if (error) { upErr++; if (upErr <= 3) console.error("UPD ERR", error.message); } else upOk += (data ? data.length : 0);
  }
  const insRows = nlIns.map(u => ({ api_player_id: u.api_player_id, season_year: u.season_year, league_code: u.league_code, position: u.to, shirt_number: null }));
  const { data: insData, error: insErr } = await sb.from("player_positions")
    .upsert(insRows, { onConflict: "api_player_id,season_year,league_code", ignoreDuplicates: true }).select("api_player_id");
  if (insErr) console.error("INS ERR", insErr.message);
  const csv = cmUp.map(u => [u.api_player_id, u.season_year, u.to, "cmbug-" + u.via, today].join(","))
    .concat(nlIns.map(u => [u.api_player_id, u.season_year, u.to, "nullfill-" + u.via, today].join(",")));
  fs.appendFileSync(DICT_PATH, "\n" + csv.join("\n"));
  console.log("WROTE: CM-bug UPDATEs applied=" + upOk + " (err=" + upErr + ")  null INSERTs=" + (insData ? insData.length : 0) + "  csv appended=" + csv.length);
  console.log(">>> NOW paste in Supabase SQL editor:  REFRESH MATERIALIZED VIEW player_card_mv;");
})();
