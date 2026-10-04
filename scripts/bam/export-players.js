/*  PLAYER + TRANSFER SWEEP , API-Football is the source, not VVonderXI.
    ================================================================
    WHY THE SOURCE CHANGED: VVonderXI has no transfer dates anywhere (checked
    pg_attribute: no joined_date, no left_date on player_season_cards or players),
    and UNIQUE (api_player_id, season, league_code) makes a mid-season split
    unrepresentable. So club attribution there is per SEASON, never per date.

    HARD CONSTRAINTS THIS FILE HONOURS:
      - writes ONLY under exports/bam/player/<timestamp>/
      - never deletes anything, at all
      - never touches Supabase (no client is imported)
      - asserts paging on EVERY call. Both cap defects this week came from
        trusting a first page: the PostgREST 1000-row cap, and the Turkey
        15-vs-16-seasons error which was an unpaginated read of 6,365 rows.

    THE WHITELIST IS THE SINGLE POINT OF FAILURE, so it is a WHITELIST and not a
    blacklist. /players?id=&season= returns every competition a player appeared
    in , the Malen probe came back with seven entries for one season, including
    Friendlies, League Cup, FA Cup and two Europa League rows. A blacklist cannot
    cover a competition nobody has seen yet. Only these nine ids are admitted.

    THE PROMOTED-TEAM CASE, and it is handled by construction: a promoted club's
    prior season is a SECOND-TIER season, where there is no European football, so
    the contamination is domestic cup rather than Europa. The whitelist admits
    neither the second-tier league nor that season's cup, so such a season comes
    back with ZERO rows , visibly absent rather than quietly contaminated.
*/
'use strict';
require('dotenv').config();
const fs=require('fs'), path=require('path');

const LEAGUES=[{code:'PL',id:39,name:'Premier League'},{code:'LL',id:140,name:'La Liga'},
 {code:'SA',id:135,name:'Serie A'},{code:'BL',id:78,name:'Bundesliga'},
 {code:'L1',id:61,name:'Ligue 1'},{code:'PRT',id:94,name:'Primeira Liga'},
 {code:'ERE',id:88,name:'Eredivisie'},{code:'BPL',id:144,name:'Belgian Pro League'},
 {code:'TR',id:203,name:'Super Lig'}];
const WHITELIST=new Set(LEAGUES.map(l=>l.id));
const FROM=2010, TO=2025;                      // 2010/11 to 2025/26. NOT 2026/27.

const ROOT=path.resolve(__dirname,'..','..');
const STAMP=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
const OUT=path.join(ROOT,'exports','bam','player',STAMP);
function writeOut(name,text){
  const full=path.resolve(OUT,name);
  if(!full.startsWith(OUT+path.sep)) throw new Error('refusing to write outside '+OUT);
  fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full,text);                 // create/overwrite only. Never unlink.
  return full;
}

const KEY=process.env.APIFOOTBALL_KEY, BASE='https://v3.football.api-sports.io';
if(!KEY){console.error('APIFOOTBALL_KEY not set');process.exit(1);}
let calls=0, ns=0; const PER_MIN=320, SP=Math.ceil(60000/PER_MIN);
const slot=async()=>{const n=Date.now(),a=Math.max(n,ns);ns=a+SP;if(a>n)await new Promise(r=>setTimeout(r,a-n));};
async function api(p,{expectSinglePage=true}={}){
  for(let i=0;i<6;i++){
    await slot();
    let j;
    try{ const r=await fetch(BASE+p,{headers:{'x-apisports-key':KEY},signal:AbortSignal.timeout(30000)});
         if(r.status===429){ns=Date.now()+15000;continue;} j=await r.json(); }
    catch(e){ if(i===5) throw e; ns=Date.now()+2000; continue; }
    const e=j.errors, bad=Array.isArray(e)?e.length>0:(e&&Object.keys(e).length>0);
    if(bad&&e.rateLimit){ns=Date.now()+15000;continue;}
    if(bad) throw new Error('API '+p+': '+JSON.stringify(e));
    calls++;
    if(!j.paging) throw new Error('no paging block on '+p+' , cannot assert completeness');
    if(expectSinglePage && j.paging.total>1)
      throw new Error(`PAGED (${j.paging.total}) on ${p} , this endpoint is no longer single-page`);
    return j;
  }
  throw new Error('rate limited after 6 attempts: '+p);
}
const csv=v=>{const s=v==null?'':String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};

(async()=>{
  const started=new Date().toISOString();
  const meta={source:BASE, started_at:started, out:path.relative(ROOT,OUT),
    scope:{leagues:LEAGUES, seasons:`${FROM}-${TO}`, season_count:TO-FROM+1},
    included_competition_ids:LEAGUES.map(l=>({id:l.id,name:l.name})),
    excluded_competition_ids:'WHITELIST , every competition id not in the included list is dropped. '
      +'Observed and dropped in testing: UEFA Champions League (2), Europa League (3), '
      +'Europa Conference League (848), Friendlies Clubs, domestic cups (League Cup, FA Cup, etc.), '
      +'Super Cups, and ALL second tiers. A promoted club\'s prior season yields ZERO rows.',
    league_seasons:{}, calls:{}, notes:[]};

  // ---- 1. team ids per league-season -------------------------------------
  console.log('PHASE 1 , team ids per league-season');
  const teamSeasons=[]; const teamName={};
  for(const l of LEAGUES) for(let y=FROM;y<=TO;y++){
    const j=await api(`/teams?league=${l.id}&season=${y}`);
    const ts=(j.response||[]).map(x=>x.team);
    for(const t of ts){ teamName[t.id]=t.name; teamSeasons.push({code:l.code,lid:l.id,season:y,team:t.id}); }
    meta.league_seasons[`${l.code}|${y}`]={teams:ts.length};
  }
  meta.calls.teams=calls;
  console.log(`  ${teamSeasons.length} team-seasons, ${Object.keys(teamName).length} distinct teams, ${calls} calls`);

  // ---- 2. transfers, per team, all-time ----------------------------------
  console.log('PHASE 2 , transfers (per team, all-time)');
  const tLines=['player_id,player_name,from_club,to_club,date,type'];
  let tRows=0,tNull=0; const tDates=[]; const before=calls;
  const ids=Object.keys(teamName).map(Number);
  for(let i=0;i<ids.length;i++){
    const j=await api(`/transfers?team=${ids[i]}`);
    for(const p of (j.response||[])){
      const pid=p.player&&p.player.id, pname=p.player&&p.player.name;
      for(const t of (p.transfers||[])){
        tRows++; if(!t.date) tNull++; else tDates.push(String(t.date).slice(0,10));
        tLines.push([pid,pname,t.teams&&t.teams.out&&t.teams.out.name,
          t.teams&&t.teams.in&&t.teams.in.name,t.date,t.type].map(csv).join(','));
      }
    }
    if((i+1)%50===0) console.log(`  ${i+1}/${ids.length} teams, ${tRows} rows, ${calls} calls`);
  }
  meta.calls.transfers=calls-before;
  /*  THE FILE MUST SAY WHAT IT CONTAINS. /transfers is ALL-TIME per team and
      accepts no season parameter (verified: "The Season field do not exist."), so
      this CSV is UNFILTERED by date and reaches back decades , well outside the
      stated 2010/11-2025/26 scope. Keeping it unfiltered is deliberate, BAM can
      cut it, but a consumer must not have to discover the range by reading the
      rows. Recorded here rather than implied.  */
  tDates.sort();
  const CUT='2010-07-01';
  meta.transfers={rows:tRows,null_dates:tNull,
    null_rate_pct:tRows?+(tNull/tRows*100).toFixed(3):null,
    earliest_transfer_date:tDates[0]||null,
    latest_transfer_date:tDates[tDates.length-1]||null,
    rows_on_or_after_2010_07_01:tDates.filter(d=>d>=CUT).length,
    rows_before_2010_07_01:tDates.filter(d=>d<CUT).length,
    date_filter:'NONE , unfiltered, /transfers takes no season parameter'};
  writeOut('transfers.csv',tLines.join('\n')+'\n');
  console.log(`  transfers.csv , ${tRows} rows, ${tNull} null dates`);

  // ---- 3. player-seasons, league-filtered --------------------------------
  console.log('PHASE 3 , player seasons (league-filtered)');
  const pLines=['player_id,player_name,league_code,league_id,season,club,club_id,position,appearances,minutes,goals,assists,rating'];
  const agg={}; let pRows=0, dropped=0; const pageDist={}; const before3=calls;
  for(let i=0;i<teamSeasons.length;i++){
    const ts=teamSeasons[i];
    let page=1,total=1;
    /*  RECORD THE PAGE COUNT PER TEAM-SEASON. A call total landing UNDER estimate
        is the same tell both cap defects gave this week, so the distribution has
        to be inspectable rather than inferred from a cumulative figure. Without
        this, "fewer pages on thin squads" is a story and not a measurement.  */
    do{
      const j=await api(`/players?team=${ts.team}&season=${ts.season}&page=${page}`,{expectSinglePage:false});
      total=j.paging.total;
      for(const r of (j.response||[])){
        for(const s of (r.statistics||[])){
          if(!s.league || !WHITELIST.has(s.league.id)){ dropped++; continue; }
          if(s.league.id!==ts.lid || s.league.season!==ts.season) { dropped++; continue; }
          if(!s.team || s.team.id!==ts.team) { dropped++; continue; }
          const mins=(s.games&&s.games.minutes)||0, apps=(s.games&&s.games.appearences)||0;
          const rating=s.games&&s.games.rating?parseFloat(s.games.rating):null;
          pRows++;
          pLines.push([r.player.id,r.player.name,ts.code,ts.lid,ts.season,s.team.name,s.team.id,
            s.games&&s.games.position,apps,mins,(s.goals&&s.goals.total)||0,
            (s.goals&&s.goals.assists)||0,rating].map(csv).join(','));
          const k=`${ts.code}|${ts.season}|${s.team.id}`;
          const a=agg[k]=agg[k]||{club:s.team.name,league:ts.code,season:ts.season,
            n:0,mins:0,g:0,a:0,ratings:[],weighted:0};
          a.n++; a.mins+=mins; a.g+=(s.goals&&s.goals.total)||0; a.a+=(s.goals&&s.goals.assists)||0;
          if(rating!=null){ a.ratings.push({r:rating,m:mins}); a.weighted+=rating*mins; }
        }
      }
      page++;
    }while(page<=total);
    pageDist[total]=(pageDist[total]||0)+1;
    if((i+1)%200===0) console.log(`  ${i+1}/${teamSeasons.length} team-seasons, ${pRows} rows, ${calls} calls`);
  }
  meta.calls.players=calls-before3;
  writeOut('player_seasons.csv',pLines.join('\n')+'\n');
  console.log(`  player_seasons.csv , ${pRows} rows (${dropped} non-whitelist entries dropped)`);

  // ---- 4. club-season aggregates, computed AFTER the league filter -------
  console.log('PHASE 4 , club-season aggregates');
  const cLines=['club,league,season,squad_size,total_minutes,mean_rating,minutes_weighted_rating,top11_mean_rating,goals,assists'];
  for(const [k,a] of Object.entries(agg).sort()){
    const rs=a.ratings.map(x=>x.r);
    const mean=rs.length?rs.reduce((s,v)=>s+v,0)/rs.length:null;
    const wm=a.mins?a.weighted/a.mins:null;
    const top11=a.ratings.slice().sort((x,y)=>y.m-x.m).slice(0,11).map(x=>x.r);
    const t11=top11.length?top11.reduce((s,v)=>s+v,0)/top11.length:null;
    cLines.push([a.club,a.league,a.season,a.n,a.mins,
      mean!=null?mean.toFixed(3):'',wm!=null?wm.toFixed(3):'',t11!=null?t11.toFixed(3):'',
      a.g,a.a].map(csv).join(','));
  }
  writeOut('club_seasons.csv',cLines.join('\n')+'\n');
  console.log(`  club_seasons.csv , ${Object.keys(agg).length} club-seasons`);

  meta.player_seasons={rows:pRows,non_whitelist_dropped:dropped,
    pages_per_team_season:pageDist,
    mean_pages:+(Object.entries(pageDist).reduce((a,[k,v])=>a+ +k*v,0)/
                 Object.values(pageDist).reduce((a,v)=>a+v,0)).toFixed(3)};
  meta.club_seasons={rows:Object.keys(agg).length};
  meta.calls.total=calls;
  meta.finished_at=new Date().toISOString();
  meta.notes.push('Every aggregate is computed AFTER the whitelist filter.');
  meta.notes.push('top11_mean_rating = mean rating of the 11 players with the most minutes.');
  meta.notes.push('paging.total asserted on every call; /teams and /transfers required single-page.');
  writeOut('meta.json',JSON.stringify(meta,null,2));
  console.log(`\nDONE , ${calls} calls. Output: ${path.relative(ROOT,OUT)}`);
})().catch(e=>{console.error('FAILED:',e.message,'| calls',calls);process.exit(1);});
