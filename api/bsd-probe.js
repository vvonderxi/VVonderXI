// bsd-probe.js — READ-ONLY diagnostic. No DB writes. Finds the correct v2
// endpoint that returns a league-season's players WITH goals/assists.
// Run exactly like the importer:  node api/bsd-probe.js
// It tests PL (league 1), season 2024/25.

const BSD_BASE = 'https://sports.bzzoiro.com/api/v2';
const LEAGUE_ID = 1;       // PL
const TARGET_YEAR = 2024;  // 2024/25
const DELAY_MS = 350;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function bsd(path) {
  const r = await fetch(`${BSD_BASE}${path}`, {
    headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, raw: text.slice(0, 200) };
}

function describe(json) {
  if (json == null) return 'no JSON';
  const rows = json.results || json.data || (Array.isArray(json) ? json : null);
  if (Array.isArray(rows)) {
    const count = json.count ?? rows.length;
    const first = rows[0];
    const keys = first ? Object.keys(first) : [];
    const hasStats = keys.some(k => /goal|assist|appearance|minute|rating/i.test(k));
    return `count=${count} · firstItemKeys=[${keys.join(', ')}] · HAS_STATS=${hasStats ? 'YES ✅' : 'no'}`;
  }
  return `object · keys=[${Object.keys(json).join(', ')}]`;
}

(async () => {
  console.log('=== BSD v2 PROBE — PL (league 1), 2024/25 ===\n');

  // 1) Resolve season id the way the importer does
  console.log('STEP 1  /leagues/1/seasons/');
  const s = await bsd(`/leagues/${LEAGUE_ID}/seasons/?limit=50`);
  console.log(`  status=${s.status}`);
  const seasons = s.json?.results || s.json?.data || (Array.isArray(s.json) ? s.json : []);
  if (seasons[0]) console.log(`  firstSeasonObject=${JSON.stringify(seasons[0])}`);
  let sid = null;
  for (const x of seasons) {
    const name = String(x.name || x.season_name || x.label || '');
    const y = parseInt(x.year ?? x.start_year ?? x.season_year) ||
              parseInt(name.match(/(\d{4})/)?.[1]);
    if (y === TARGET_YEAR) { sid = x.id; break; }
  }
  console.log(`  → resolved 2024/25 season_id = ${sid}\n`);
  await sleep(DELAY_MS);

  // 2) Candidate endpoints for league-season player stats
  const candidates = [
    `/players/?season=${sid}&league=${LEAGUE_ID}&limit=5`,            // current (broken) approach
    `/leagues/${LEAGUE_ID}/seasons/${sid}/players/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/topscorers/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/player-stats/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/standings/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/teams/?limit=5`,
    `/player-stats/?league=${LEAGUE_ID}&season=${sid}&limit=5`,
    `/topscorers/?league=${LEAGUE_ID}&season=${sid}&limit=5`,
    `/teams/?league=${LEAGUE_ID}&season=${sid}&limit=5`,
  ];

  console.log('STEP 2  candidate player-stats endpoints:\n');
  for (const path of candidates) {
    const res = await bsd(path);
    if (res.status === 200) {
      console.log(`  ✅ 200  ${path}`);
      console.log(`         ${describe(res.json)}`);
    } else {
      console.log(`  ✗  ${res.status}  ${path}   ${res.json?.detail || res.raw}`);
    }
    await sleep(DELAY_MS);
  }

  console.log('\n=== PROBE DONE — paste this whole output back ===');
})();
