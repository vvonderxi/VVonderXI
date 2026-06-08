#!/usr/bin/env node
// VVonderXI — find the reliable "teams in a league" endpoint (read-only)
// We know team_id 12 = Man City (PL). The correct endpoint should return ~20
// teams for the PL season and INCLUDE id 12.

const BSD = 'https://sports.bzzoiro.com/api/v2';
const KEY = process.env.BSD_API_KEY;
if (!KEY) { console.error('BSD_API_KEY not set'); process.exit(1); }
const pause = ms => new Promise(r => setTimeout(r, ms));

async function get(path) {
  try {
    const r = await fetch(`${BSD}${path}`, { headers:{Authorization:`Token ${KEY}`}, signal:AbortSignal.timeout(12000) });
    let j=null; try{ j=await r.json(); }catch{}
    return { ok:r.ok, status:r.status, j };
  } catch(e){ return { ok:false, status:'ERR', err:e.message }; }
}

// pull a team-list out of whatever shape comes back, find ids + names
function teams(j){
  if(!j) return [];
  let arr = j.results || j.teams || j.standings || (Array.isArray(j)?j:null);
  if(!arr && j.standings && Array.isArray(j.standings)) arr=j.standings;
  if(!Array.isArray(arr)) return [];
  return arr.map(x => x.team || x).map(t => ({ id:t.id||t.team_id, name:t.name||t.team_name }));
}

async function probe(label, path){
  const { ok, status, j, err } = await get(path);
  if(!ok){ console.log(`FAIL [${status}] ${label}  ${path}  ${err||''}`); return; }
  const t = teams(j);
  const has12 = t.some(x => String(x.id)==='12');
  const total = j.count!=null ? j.count : t.length;
  console.log(`PASS [${status}] ${label}`);
  console.log(`     ${path}`);
  console.log(`     count=${total} | parsed ${t.length} teams | includes Man City(12)? ${has12 ? 'YES ✅' : 'no'}`);
  console.log(`     first teams: ${t.slice(0,8).map(x=>`${x.id}:${x.name}`).join(' | ')}\n`);
}

(async () => {
  console.log('\n=== FIND "TEAMS IN PL" ENDPOINT ===\n');
  const lg = await get('/leagues/1/');
  const season = lg.j?.current_season?.id || 337;
  console.log(`Current PL season id = ${season}\n`);

  await probe('teams ?league=1 (suspected unfiltered)', '/teams/?league=1'); await pause(400);
  await probe('teams ?league=1&season',                 `/teams/?league=1&season=${season}`); await pause(400);
  await probe('teams ?season',                          `/teams/?season=${season}`); await pause(400);
  await probe('seasons/{id}/teams',                     `/seasons/${season}/teams/`); await pause(400);
  await probe('standings ?season',                      `/standings/?season=${season}`); await pause(400);
  await probe('standings ?league&season',               `/standings/?league=1&season=${season}`); await pause(400);
  await probe('leagues/1/standings',                    `/leagues/1/standings/`); await pause(400);
  await probe('seasons/{id}/standings',                 `/seasons/${season}/standings/`); await pause(400);

  console.log('=== DONE ===');
  console.log('WINNER = the endpoint that returns ~20 teams AND "includes Man City(12)? YES".');
  console.log('That is the one I build the PL flesh-out on.');
})();
