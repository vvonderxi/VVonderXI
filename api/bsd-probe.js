// bsd-probe.js  v2 — READ-ONLY diagnostic. No DB writes.
// Fixes the season-key bug, prints raw shapes, re-tests season-scoped routes
// with a REAL season id, and samples /career/ (the proven stats source).
// Run like the importer:  CMD="node api/bsd-probe.js"

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
  return { status: r.status, json, raw: text.slice(0, 300) };
}

function rowsOf(json) {
  if (!json) return null;
  return json.results || json.seasons || json.players || json.data ||
         json.teams || json.career || (Array.isArray(json) ? json : null);
}

function describe(json) {
  const rows = rowsOf(json);
  if (Array.isArray(rows)) {
    const count = json.count ?? rows.length;
    const keys = rows[0] ? Object.keys(rows[0]) : [];
    const statKeys = keys.filter(k => /goal|assist|appearance|minute|rating|played/i.test(k));
    return `count=${count} · keys=[${keys.join(', ')}] · STAT_KEYS=[${statKeys.join(', ')}]`;
  }
  return `(no array) topKeys=[${json ? Object.keys(json).join(', ') : 'none'}]`;
}

(async () => {
  console.log('=== BSD v2 PROBE v2 — PL (league 1), 2024/25 ===\n');

  console.log('STEP 1  /leagues/1/seasons/');
  const s = await bsd(`/leagues/${LEAGUE_ID}/seasons/?limit=50`);
  console.log(`  status=${s.status}`);
  console.log(`  topLevelKeys=[${s.json ? Object.keys(s.json).join(', ') : 'none'}]`);
  const seasons = rowsOf(s.json) || [];
  console.log(`  seasonCount=${seasons.length}`);
  if (seasons[0]) console.log(`  firstSeason=${JSON.stringify(seasons[0])}`);
  if (seasons[1]) console.log(`  secondSeason=${JSON.stringify(seasons[1])}`);
  let sid = null;
  for (const x of seasons) {
    const name = String(x.name || x.season_name || x.label || '');
    const y = parseInt(x.year ?? x.start_year ?? x.season_year) ||
              parseInt(name.match(/(\d{4})/)?.[1]);
    if (y === TARGET_YEAR) { sid = x.id; break; }
  }
  console.log(`  → resolved 2024/25 season_id = ${sid}\n`);
  await sleep(DELAY_MS);

  const candidates = [
    `/leagues/${LEAGUE_ID}/seasons/${sid}/players/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/player-stats/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/topscorers/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/stats/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/standings/?limit=5`,
    `/leagues/${LEAGUE_ID}/seasons/${sid}/teams/?limit=5`,
    `/player-stats/?league=${LEAGUE_ID}&season=${sid}&limit=5`,
  ];
  console.log('STEP 2  season-scoped player-stat candidates:\n');
  for (const path of candidates) {
    const res = await bsd(path);
    if (res.status === 200) {
      console.log(`  ✅ 200  ${path}`);
      console.log(`         ${describe(res.json)}`);
    } else {
      console.log(`  ✗  ${res.status}  ${path}`);
    }
    await sleep(DELAY_MS);
  }

  console.log('\nSTEP 3  /players/{id}/career/  (proven stats source)');
  let probeId = null;
  const search = await bsd(`/players/?search=Haaland&limit=3`);
  const sr = rowsOf(search.json);
  if (Array.isArray(sr) && sr[0]) {
    probeId = sr[0].id;
    console.log(`  search Haaland → id=${probeId} (${sr[0].name})`);
  } else {
    const any = await bsd(`/players/?limit=1`);
    const ar = rowsOf(any.json);
    probeId = ar?.[0]?.id;
    console.log(`  search unsupported; using first catalogue id=${probeId}`);
  }
  await sleep(DELAY_MS);
  if (probeId) {
    const car = await bsd(`/players/${probeId}/career/`);
    console.log(`  status=${car.status}`);
    console.log(`  topLevelKeys=[${car.json ? Object.keys(car.json).join(', ') : 'none'}]`);
    const cr = rowsOf(car.json);
    if (Array.isArray(cr) && cr[0]) {
      console.log(`  careerRowCount=${cr.length}`);
      console.log(`  firstCareerRow=${JSON.stringify(cr[0])}`);
    } else {
      console.log(`  raw=${car.raw}`);
    }
  }

  console.log('\n=== PROBE DONE — paste this whole output back ===');
})();
