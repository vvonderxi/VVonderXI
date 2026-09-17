/*  FUSION DETECTION , READ-ONLY. Writes nothing, anywhere.
    ==========================================================
    WHY ITS OWN SCRIPT: import-players.js SUMS multi-block seasons via
    resolveSeasonStat(), so re-running it re-fuses. The aggregate is computed
    before the split is visible. Detection has to read the SOURCE BLOCKS and
    compare them to what we stored.

    WHAT IT ANSWERS: for each candidate card, does the provider still serve
    MORE THAN ONE statistics block for that player-season-league, and does our
    stored card equal their SUM? If yes, the card is fused AND the components
    are recoverable. If the provider serves one block, nothing is recoverable
    and the card is not fused.
*/
'use strict';
require('dotenv').config();
const fs=require('fs'), path=require('path');
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const KEY=process.env.APIFOOTBALL_KEY, BASE='https://v3.football.api-sports.io';
const OUT='/tmp/claude-1000/-home-odoo-projects-VVonderXI/791f5fc9-63a6-4aaa-9b92-9aacb6177d80/scratchpad';

const all=async(t,c,o)=>{const out=[];const S=1000;
  for(let f=0;;f+=S){const {data,error}=await sb.from(t).select(c).order(o,{ascending:true}).range(f,f+S-1);
    if(error)throw new Error(t+': '+error.message); out.push(...data); if(data.length<S)break;} return out;};
let calls=0, nextSlot=0; const SPACING=Math.ceil(60000/330);
const slot=async()=>{const n=Date.now(),a=Math.max(n,nextSlot);nextSlot=a+SPACING;if(a>n)await new Promise(r=>setTimeout(r,a-n));};
async function api(p){for(let i=0;i<5;i++){await slot();
  let j; try{const r=await fetch(BASE+p,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(30000)});j=await r.json();}
  catch(e){ if(i===4) throw e; nextSlot=Date.now()+2000; continue; }
  calls++; const e=j.errors,bad=Array.isArray(e)?e.length>0:(e&&Object.keys(e).length>0);
  if(bad&&e.rateLimit){nextSlot=Date.now()+15000;calls--;continue;}
  if(bad) throw new Error('API '+JSON.stringify(e));
  return j;} throw new Error('rate limited: '+p);}

(async()=>{
  const lg=await all('leagues','api_league_id,code','api_league_id');
  const apiOf={}; for(const l of lg) apiOf[l.code]=l.api_league_id;
  apiOf.TR=203;   // SS C: leagues.code is 'TSL' for Turkey while cards carry 'TR'
  const mv=await all('player_card_mv','card_id,api_player_id,player_name,team_name,league_code,season,season_year,appearances,minutes,goals,assists,rt','card_id');
  const st=await all('league_standings','league_code,season_year,played','league_code');

  /*  CEILING PER LEAGUE-SEASON, read off the data. A hardcoded season length is the
      error this project has paid for twice, and league_standings holds a PLAYOFF table
      for 16 league-seasons, so those are excluded rather than trusted.  */
  const ceil={}; for(const s of st){const k=`${s.league_code}|${s.season_year}`;ceil[k]=Math.max(ceil[k]||0,s.played||0);}
  const usable=new Set(Object.entries(ceil).filter(([,v])=>v>=30).map(([k])=>k));
  const cand=mv.filter(c=>c.appearances!=null&&usable.has(`${c.league_code}|${c.season_year}`)
                          &&c.appearances>ceil[`${c.league_code}|${c.season_year}`])
    .map(c=>({...c,ceiling:ceil[`${c.league_code}|${c.season_year}`],excess:c.appearances-ceil[`${c.league_code}|${c.season_year}`]}));
  console.log(`candidates above a usable league-season ceiling: ${cand.length}`);
  console.log(`  excess 1-2: ${cand.filter(c=>c.excess<=2).length} | 3-5: ${cand.filter(c=>c.excess>2&&c.excess<=5).length} | 6+: ${cand.filter(c=>c.excess>5).length}`);

  const res=[];
  for(const c of cand){
    const lid=apiOf[c.league_code];
    let j; try{ j=await api(`/players?id=${c.api_player_id}&season=${c.season_year}`); }
    catch(e){ res.push({...c,verdict:'FETCH_FAILED',why:e.message}); continue; }
    const r=(j.response||[])[0];
    if(!r){ res.push({...c,verdict:'NOT_AT_SOURCE',why:'provider returns no player-season'}); continue; }
    const blocks=(r.statistics||[]).filter(s=>s.league&&s.league.id===lid);
    const sum=k=>blocks.reduce((a,b)=>a+((b.games&&b.games[k])||0),0);
    const sumMin=blocks.reduce((a,b)=>a+((b.games&&b.games.minutes)||0),0);
    const rec={card_id:c.card_id,player:c.player_name,league:c.league_code,season:c.season,
      team:c.team_name,stored_apps:c.appearances,stored_min:c.minutes,ceiling:c.ceiling,excess:c.excess,
      blocks:blocks.length, block_teams:blocks.map(b=>b.team&&b.team.name),
      block_apps:blocks.map(b=>b.games&&b.games.appearences), sum_apps:sum('appearences'), sum_min:sumMin};
    if(blocks.length<=1) rec.verdict='SINGLE_BLOCK , not fused, nothing to split';
    else if(sum('appearences')===c.appearances) rec.verdict='FUSED , stored equals the SUM of '+blocks.length+' blocks, components RECOVERABLE';
    else rec.verdict='MULTI_BLOCK but stored does not equal the sum';
    res.push(rec);
  }
  fs.writeFileSync(path.join(OUT,'fusion-detect.json'),JSON.stringify(res,null,2));
  const by={}; for(const r of res){const k=(r.verdict||'').split(' ,')[0];by[k]=(by[k]||0)+1;}
  console.log('\nVERDICTS:',JSON.stringify(by,null,1));
  console.log(`\nAPI calls: ${calls}`);
  const fused=res.filter(r=>(r.verdict||'').startsWith('FUSED'));
  console.log(`\nGENUINELY FUSED, components recoverable: ${fused.length}`);
  for(const f of fused.slice(0,15))
    console.log(`  card ${f.card_id} ${f.league} ${f.season} ${f.player} | stored ${f.stored_apps}a/${f.stored_min}m = ${f.blocks} blocks [${f.block_teams.join(' + ')}] apps ${f.block_apps.join('+')}`);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
