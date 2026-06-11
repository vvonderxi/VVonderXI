#!/usr/bin/env node
// VVonderXI — VERIFY granular position data exists in API-Football lineups.
// Pulls ONE Premier League fixture's lineup and prints each player's grid.
// If grid shows "row:column" coords, we can derive LB/CB/RB/CDM/CAM/etc.
//   RUN:  CMD="node api/verify-positions.js"
require('dotenv').config();
const BASE='https://v3.football.api-sports.io';
const KEY=process.env.APIFOOTBALL_KEY;
if(!KEY){console.error('❌ APIFOOTBALL_KEY not set');process.exit(1);}
const af=async p=>(await fetch(`${BASE}${p}`,{headers:{'x-apisports-key':KEY}})).json();

(async()=>{
  // get a 2023 PL fixture
  const f=await af('/fixtures?league=39&season=2023&round=Regular Season - 1');
  const fx=f.response?.[0];
  if(!fx){console.log('no fixture',JSON.stringify(f.errors));return;}
  console.log(`Fixture: ${fx.teams.home.name} vs ${fx.teams.away.name} (id ${fx.fixture.id})\n`);

  const l=await af(`/fixtures/lineups?fixture=${fx.fixture.id}`);
  if(l.errors&&Object.keys(l.errors).length){console.log('errors',JSON.stringify(l.errors));return;}

  for(const team of (l.response||[])){
    console.log(`\n=== ${team.team.name}  formation: ${team.formation} ===`);
    for(const x of (team.startXI||[])){
      const pl=x.player;
      // grid "row:col" — row 1=GK ... higher=attack; col=left..right
      console.log(`  ${(pl.pos||'?').padEnd(2)} grid:${(pl.grid||'?').padEnd(5)}  ${pl.name}`);
    }
  }
  console.log('\n✅ If grid shows "row:col" numbers, granular positions ARE derivable.');
})();
