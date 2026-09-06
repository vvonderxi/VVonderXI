// apifootball-probe.js — READ-ONLY. No DB writes. ~12 calls, <1 min.
// Confirms league IDs, available seasons (true history depth), the per-player
// stat field shape, and pagination — so we build the schema/importer to reality.
// Run like the others:  CMD="node scripts/import/apifootball-probe.js"

const BASE = 'https://v3.football.api-sports.io';
const KEY  = process.env.APIFOOTBALL_KEY;
const DELAY = 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// API-Football league IDs for your top 8 (we confirm these resolve below)
const LEAGUES = [
  { code:'PL',  id:39  }, { code:'LL',  id:140 }, { code:'SA',  id:135 },
  { code:'BL',  id:78  }, { code:'L1',  id:61  }, { code:'PRT', id:94  },
  { code:'ERE', id:88  }, { code:'BPL', id:144 },
];

async function af(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY } });
  const j = await r.json().catch(() => null);
  return { status: r.status, j };
}

(async () => {
  if (!KEY) { console.error('❌ APIFOOTBALL_KEY not set'); process.exit(1); }
  console.log('=== API-FOOTBALL PROBE ===\n');

  // 0) account status — confirms key works + shows plan/limits
  const st = await af('/status'); await sleep(DELAY);
  console.log('STATUS:', JSON.stringify(st.j?.response || st.j));
  console.log('');

  // 1) per league: confirm name + list available seasons (history depth)
  console.log('LEAGUES & AVAILABLE SEASONS (true "all the way back"):');
  for (const lg of LEAGUES) {
    const d = await af(`/leagues?id=${lg.id}`); await sleep(DELAY);
    const item = d.j?.response?.[0];
    const name = item?.league?.name + ' / ' + item?.country?.name;
    const seasons = (item?.seasons || []).map(s => s.year);
    const withStats = (item?.seasons || []).filter(s => s.coverage?.players === true).map(s => s.year);
    console.log(`  ${lg.code} (id ${lg.id}): ${name}`);
    console.log(`     seasons: ${seasons[0]}–${seasons[seasons.length-1]} (${seasons.length} total)`);
    console.log(`     with player coverage: ${withStats.length ? withStats[0]+'–'+withStats[withStats.length-1] : 'see seasons'}`);
  }
  console.log('');

  // 2) the prize: /players for PL 2024 — field shape + pagination
  console.log('PLAYER STAT SHAPE  (/players?league=39&season=2024&page=1):');
  const p = await af('/players?league=39&season=2024&page=1'); await sleep(DELAY);
  console.log(`  status=${p.status} · totalPages=${p.j?.paging?.total} · resultsThisPage=${p.j?.results}`);
  const sample = p.j?.response?.[0];
  if (sample) {
    console.log(`  player: ${sample.player?.name} (age ${sample.player?.age}, ${sample.player?.nationality})`);
    const s = sample.statistics?.[0] || {};
    console.log('  --- statistic block keys ---');
    console.log('  games   :', JSON.stringify(s.games));
    console.log('  goals   :', JSON.stringify(s.goals));
    console.log('  shots   :', JSON.stringify(s.shots));
    console.log('  passes  :', JSON.stringify(s.passes));
    console.log('  tackles :', JSON.stringify(s.tackles));
    console.log('  duels   :', JSON.stringify(s.duels));
    console.log('  dribbles:', JSON.stringify(s.dribbles));
    console.log('  fouls   :', JSON.stringify(s.fouls));
    console.log('  cards   :', JSON.stringify(s.cards));
  }

  console.log('\n=== PROBE DONE — paste this whole output back ===');
})();
