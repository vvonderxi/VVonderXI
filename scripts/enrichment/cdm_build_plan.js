// Build the Option-1 reclassification plan from hand-verified archetype decisions.
// Input: cdm_flagged.csv (coarse=FWD rows only). Output: cdm_reclass_plan.csv + cdm_dropped.csv.
// NO DB writes. Decisions keyed by api_player_id (apply to all that player's flagged coarse=FWD rows).
const fs = require("fs");

// DROP (exclude): central/def mids mis-tagged FWD, fullbacks, deep roles, or unverifiable obscure.
const DROP = {
  23:   "fullback (FB) — not a pure attacker; CDM->FB is a separate accuracy question, keeps boost anyway",
  25400:"central mid (career CM:6 dominant) — versatile left/central mid, not a pure attacker",
  39043:"central mid / RB (career CM:3 FB:1) — Lucas-named false-positive",
  14395:"defensive mid / CB (career CDM:3 CM:1 CB:1) — Lucas-named false-positive",
  2692: "unverifiable central (career CDM:1, ga90 0.13) — Lucas-named false-positive",
  326757:"Jobe Bellingham — central/def mid (0g 1a, ga90 0.05) — Lucas-named false-positive",
  180644:"central-leaning (career CDM:2 CM:1), obscure, no attacking history — unverifiable",
  2601: "Kamada 2025 Palace — playing deep central this season, ga90 0 — leave CDM",
  61878:"obscure single-season (career CDM:1), archetype unverifiable",
  62081:"obscure single-season (career CDM:1), archetype unverifiable",
  62192:"obscure single-season (career CDM:1), archetype unverifiable",
  // moved KEEP->DROP: no in-DB attacking corroboration (career CDM-only, low ga90) — don't assert what data can't support
  7585: "no in-DB corroboration (career CDM:1, ga90 0.25) — name-recognition only",
  68196:"no in-DB corroboration (career CDM:1, ga90 0.20) — name-recognition only",
  105295:"no in-DB corroboration (career CDM:1, ga90 0) — same profile as Jobe Bellingham",
  47289:"no in-DB corroboration (career CDM:3 only, ga90 0.25) — famous RW but data can't support it",
  50095:"no in-DB corroboration (career CDM:2 only, ga90 0.39) — same profile",
};

// KEEP (reclassify): destination by archetype. c = confidence note.
const KEEP = {
  // NOTE: 7585/68196/105295/47289/50095 moved to DROP (no in-DB attacking corroboration)
  178:  ["Winger","wide forward (Spurs)"],
  207:  ["Winger","career Winger:7 — clear"],
  516:  ["Winger","clear winger"],
  554:  ["Winger","Southampton wide/attacking — Lucas-named"],
  635:  ["Winger","career Winger:4 — clear"],
  663:  ["Winger","Lyon young wide forward"],
  1356: ["Winger","right winger/wing-back"],
  1763: ["Winger","right winger — Lucas-named"],
  1989: ["Winger","clear winger (Besiktas)"],
  1992: ["Winger","winger — low-output seasons kept per rule"],
  2116: ["Winger","wide attacker (Standard)"],
  24:   ["ST","forward (career ST:4)"],
  2382: ["ST","forward (Kayserispor)"],
  2605: ["Winger","known winger, injury/bench season (ga90 0)"],
  2751: ["Winger","Australian winger"],
  2790: ["Winger","career Winger:6 — clear"],
  2799: ["ST","forward/second-striker (career ST:3)"],
  2808: ["Winger","winger/forward"],
  3175: ["Winger","winger"],
  3313: ["Winger","winger *check"],
  8453: ["Winger","career Winger:4"],
  8616: ["Winger","Belgian winger"],
  13645:["Winger","winger *check"],
  16839:["Winger","attacking mid/winger"],
  19195:["Winger","left winger (Villa)"],
  19246:["Winger","winger by trade"],
  21496:["Winger","winger"],
  21503:["Winger","winger"],
  22095:["ST","forward/wide (career ST:4)"],
  25352:["Winger","Salomon Kalou — winger/forward"],
  25647:["Winger","Ibrahima Traore — winger *check"],
  30562:["ST","forward (career ST:5)"],
  39095:["ST","forward (career ST:3)"],
  39137:["Winger","winger"],
  41124:["CAM","attacking mid (career CAM:3), very low output *check"],
  44612:["Winger","Garry Rodrigues — career Winger:5"],
  48022:["Winger","winger *check"],
  48579:["Winger","winger/forward"],
  49851:["Winger","Robinho — winger/forward"],
  49852:["Winger","Eljero Elia — winger"],
  50123:["Winger","Silvestre Varela — winger"],
  50180:["Winger","career Winger:8 — clear"],
  62004:["Winger","attacking/wide *check"],
  83023:["Winger","Kerim Frei — winger, 0-output season"],
  85772:["Winger","forward/winger"],
};

const L = fs.readFileSync("scripts/enrichment/cdm_flagged.csv", "utf8").trim().split("\n").slice(1);
const rows = L.map(l => { const p = l.match(/(".*?"|[^,]*)(,|$)/g).map(x => x.replace(/,$/, "").replace(/^"|"$/g, "")); return { id: p[0], yr: p[1], lc: p[2], name: p[3], team: p[4], rt: p[5+1], coarse: p[7], ga90: p[8], sc: p[9] === "true", so: p[10] === "true" }; });
const fwd = rows.filter(r => r.sc);

const esc = v => { v = (v == null) ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const keepRows = [], dropRows = [];
fwd.forEach(r => {
  if (KEEP[r.id]) keepRows.push({ ...r, to: KEEP[r.id][0], basis: KEEP[r.id][1] });
  else if (DROP[r.id]) dropRows.push({ ...r, reason: DROP[r.id] });
  else dropRows.push({ ...r, reason: "UNCLASSIFIED (not in decision map)" });
});

const kc = ["id","name","yr","lc","team","from","to","ga90","basis"];
fs.writeFileSync("scripts/enrichment/cdm_reclass_plan.csv",
  [kc.join(",")].concat(keepRows.map(r => [r.id,r.name,r.yr,r.lc,r.team,"CDM",r.to,r.ga90,r.basis].map(esc).join(","))).join("\n") + "\n");
fs.writeFileSync("scripts/enrichment/cdm_dropped.csv",
  ["id,name,yr,lc,team,ga90,reason"].concat(dropRows.map(r => [r.id,r.name,r.yr,r.lc,r.team,r.ga90,r.reason].map(esc).join(","))).join("\n") + "\n");

// pretty print
const toCount = {}; keepRows.forEach(r => toCount[r.to] = (toCount[r.to] || 0) + 1);
console.log("=== RECLASSIFY (KEEP): " + keepRows.length + " rows / " + Object.keys(KEEP).length + " players  ->  " + JSON.stringify(toCount) + " ===");
keepRows.sort((a,b)=> a.to.localeCompare(b.to) || a.name.localeCompare(b.name)).forEach(r =>
  console.log("  " + r.name.padEnd(24).slice(0,24) + " " + r.yr + " " + String(r.team).padEnd(16).slice(0,16) + " ga90=" + String(r.ga90).padEnd(5) + " CDM -> " + r.to.padEnd(7) + "  " + r.basis));
console.log("\n=== DROP (keep CDM): " + dropRows.length + " rows / " + Object.keys(DROP).length + " players ===");
dropRows.sort((a,b)=>a.name.localeCompare(b.name)).forEach(r =>
  console.log("  " + r.name.padEnd(24).slice(0,24) + " " + r.yr + " " + String(r.team).padEnd(16).slice(0,16) + " ga90=" + String(r.ga90).padEnd(5) + "  " + r.reason));
console.log("\n(* = lower-confidence archetype call, worth your closer look. wrote cdm_reclass_plan.csv + cdm_dropped.csv)");
