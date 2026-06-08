#!/usr/bin/env node
// Diagnose why 0 players are kept: dump raw squad + career shapes.
const BSD='https://sports.bzzoiro.com/api/v2';
const KEY=process.env.BSD_API_KEY;
if(!KEY){console.error('BSD_API_KEY not set');process.exit(1);}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function g(p){const r=await fetch(`${BSD}${p}`,{headers:{Authorization:`Token ${KEY}`},signal:AbortSignal.timeout(12000)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}

(async()=>{
  console.log('\n=== CAREER DIAGNOSTIC (Man City, id 12) ===\n');
  const sq=await g('/teams/12/squad/'); await pause(400);
  const players=sq.j?.players||sq.j?.results||[];
  console.log('squad players:', players.length);
  console.log('first squad player RAW:', JSON.stringify(players[0]), '\n');

  // inspect 3 players' careers in full
  for(const sp of players.slice(0,3)){
    console.log('────────────────────────────────────');
    console.log(`PLAYER: ${sp.name} (id ${sp.id})`);
    const c=await g(`/players/${sp.id}/career/`); await pause(400);
    console.log('career status:', c.status, '| top-level keys:', c.j?Object.keys(c.j):null);
    const rows=c.j?.seasons||c.j?.results||(Array.isArray(c.j)?c.j:[]);
    console.log('season rows:', rows.length);
    if(rows[0]){
      console.log('FIRST ROW RAW:', JSON.stringify(rows[0]));
      console.log('row keys:', Object.keys(rows[0]));
      console.log('minutes value:', rows[0].minutes, '| typeof:', typeof rows[0].minutes);
      // resolve season + league for that row
      const s=await g(`/seasons/${rows[0].season_id}/`); await pause(400);
      console.log('season detail RAW:', JSON.stringify(s.j));
      const lg=await g(`/leagues/${rows[0].league_id}/`); await pause(400);
      console.log('league detail RAW:', JSON.stringify(lg.j));
    }
    console.log('');
  }
  console.log('=== DONE ===');
  console.log('Look for: does a season row have minutes >= 500? what is the minutes field actually called?');
})();
