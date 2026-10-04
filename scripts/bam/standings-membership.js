/*  DIVISION MEMBERSHIP FROM /standings , the API answering for itself.
    ================================================================
    WHY THIS EXISTS: the export contained 24 Eredivisie clubs for 2020-2023 in an
    18-team division. The contamination is INSIDE league id 88 , the API attaches
    the top-tier id to Eerste Divisie appearances , so a whitelist on competition
    id cannot see it. A whitelist is the wrong instrument for contamination that
    wears the correct competition id.

    WHY STANDINGS AND NOT OUR OWN CLUB LIST: using VVonderXI's ERE clubs would
    make it the authority on division membership for a dataset whose purpose was
    to stop depending on it. /standings is the provider adjudicating its own data.

    WHY ALL NINE LEAGUES AND NOT JUST ERE: nothing established that ERE is the
    only league where this happens. ERE was checked because ERE was asked about.
    That is not evidence about the other eight.

    SPLIT-FORMAT LEAGUES: standings returns an ARRAY OF GROUPS, and Belgium and
    Turkey play championship/relegation rounds, so a season can have several.
    Every group is unioned , taking group[0] would silently halve those leagues.
*/
'use strict';
require('dotenv').config();
const fs=require('fs'), path=require('path');
const LEAGUES=[{code:'PL',id:39},{code:'LL',id:140},{code:'SA',id:135},{code:'BL',id:78},
 {code:'L1',id:61},{code:'PRT',id:94},{code:'ERE',id:88},{code:'BPL',id:144},{code:'TR',id:203}];
const FROM=2010,TO=2025;
const ROOT=path.resolve(__dirname,'..','..');
const KEY=process.env.APIFOOTBALL_KEY,BASE='https://v3.football.api-sports.io';
let calls=0,ns=0; const SP=Math.ceil(60000/320);
const slot=async()=>{const n=Date.now(),a=Math.max(n,ns);ns=a+SP;if(a>n)await new Promise(r=>setTimeout(r,a-n));};
async function api(p){for(let i=0;i<5;i++){await slot();
  let j; try{const r=await fetch(BASE+p,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(30000)});
    if(r.status===429){ns=Date.now()+15000;continue;} j=await r.json();}
  catch(e){ if(i===4) throw e; ns=Date.now()+2000; continue; }
  const e=j.errors,bad=Array.isArray(e)?e.length>0:(e&&Object.keys(e).length>0);
  if(bad&&e.rateLimit){ns=Date.now()+15000;continue;}
  if(bad) throw new Error(p+': '+JSON.stringify(e));
  calls++;
  if(!j.paging) throw new Error('no paging block on '+p);
  if(j.paging.total>1) throw new Error(`PAGED (${j.paging.total}) on ${p} , not handled`);
  return j;} throw new Error('rate limited: '+p);}
(async()=>{
  const out={};
  for(const l of LEAGUES) for(let y=FROM;y<=TO;y++){
    const j=await api(`/standings?league=${l.id}&season=${y}`);
    const r=(j.response||[])[0];
    const groups=(r&&r.league&&r.league.standings)||[];
    const teams=new Map();
    for(const g of groups) for(const row of (g||[])) if(row.team) teams.set(row.team.id,row.team.name);
    out[`${l.code}|${y}`]={groups:groups.length,teams:[...teams.entries()].map(([id,name])=>({id,name}))};
    process.stdout.write(`  ${l.code} ${y}: ${groups.length} group(s), ${teams.size} clubs\n`);
  }
  const f=path.join(ROOT,'exports','bam','player','standings_membership.json');
  fs.mkdirSync(path.dirname(f),{recursive:true});
  fs.writeFileSync(f,JSON.stringify({source:BASE,generated_at:new Date().toISOString(),
    calls,league_seasons:out},null,2));
  console.log(`\nDONE , ${calls} calls. ${f}`);
})().catch(e=>{console.error('FAILED:',e.message,'| calls',calls);process.exit(1);});
