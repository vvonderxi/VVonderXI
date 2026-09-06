#!/usr/bin/env node
// VVonderXI — check how GRANULAR the /players/squads position field is.
// If it gives "Centre-Back"/"Left-Back" etc → cheap path (20 calls/league-season).
// If only "Defender" → stick with lineup grids. One call, decides our strategy.
//   RUN:  CMD="node scripts/import/verify-squad-positions.js"
require('dotenv').config();
const BASE='https://v3.football.api-sports.io';
const KEY=process.env.APIFOOTBALL_KEY;
if(!KEY){console.error('❌ APIFOOTBALL_KEY not set');process.exit(1);}
const af=async p=>(await fetch(`${BASE}${p}`,{headers:{'x-apisports-key':KEY}})).json();

(async()=>{
  // Liverpool = 40
  console.log('=== /players/squads?team=40 (Liverpool) ===');
  const s=await af('/players/squads?team=40');
  if(s.errors&&Object.keys(s.errors).length){console.log('errors:',JSON.stringify(s.errors));}
  const players=s.response?.[0]?.players||[];
  console.log(`${players.length} players. Position values:\n`);
  // show distinct position strings to judge granularity
  const positions={};
  for(const p of players){ positions[p.position]=(positions[p.position]||0)+1; }
  for(const [pos,n] of Object.entries(positions)) console.log(`  "${pos}" × ${n}`);
  console.log('\nSample players:');
  for(const p of players.slice(0,8)) console.log(`  ${p.name} -> "${p.position}"`);

  // ALSO check /players for a known player to see ITS position granularity
  console.log('\n=== /players?id=290&season=2023 (Van Dijk via search) ===');
  const vd=await af('/players?search=van dijk&season=2023&team=40');
  const stat=vd.response?.[0]?.statistics?.[0];
  console.log(`games.position = "${stat?.games?.position}"`);
  console.log('\n✅ Compare: if squads shows specific roles (Centre-Back), cheap path wins.');
})();
