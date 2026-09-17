require('dotenv').config({quiet:true});
const {createClient}=require('@supabase/supabase-js');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
const KEEPER=['saves','goals_conceded','penalties_saved','starts'];
const DISC=['fouls_drawn','fouls_committed','cards_yellow','cards_red'];
const PEN=['penalties_scored','penalties_missed','penalties_saved'];
const med=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);const m=s.length>>1;
  return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const page=async(tbl,cols,extra)=>{let f=0,out=[];for(;;){
  let q=sb.from(tbl).select(cols).order(tbl==='player_card_mv'?'card_id':'id',{ascending:true}).range(f,f+999);
  const {data,error}=await q; if(error){console.error(tbl,error.message);process.exit(1);}
  out=out.concat(data); if(data.length<1000)break; f+=1000;} return out;};
(async()=>{
  const L=[];
  const say=x=>{L.push(x); console.log(x);};
  say('KEEPER FIELD SURVEY , read-only, '+new Date().toISOString());
  say('branch redesign-compare @ 13b4081');
  say('');

  const mv = await page('player_card_mv',
    'card_id,player_name,season,season_year,league_code,position,position_pool,minutes,starts,saves,goals_conceded,penalties_saved,penalties_scored,penalties_missed,fouls_drawn,fouls_committed,cards_yellow,cards_red,rt');
  say('player_card_mv rows: '+mv.length);
  // does psc carry the discipline pair?
  let pscCols='saves,goals_conceded,penalties_saved,penalties_scored,penalties_missed,starts,position,minutes,season_year,league_code,fouls_drawn,fouls_committed';
  const psc = await page('player_season_cards','id,'+pscCols);
  say('player_season_cards rows: '+psc.length);
  say('');

  // ---------- 1. NULL RATES ----------
  say('1. KEEPER-RELATED COLUMNS, TYPE AND NULL RATE');
  say('   all types are integer, all nullable, on both relations.');
  say('');
  const gk = mv.filter(r=>r.position==='GK');
  const nn = (rows,f)=>rows.filter(r=>r[f]!=null).length;
  say('   player_card_mv                  all rows ('+mv.length+')        GK rows ('+gk.length+')');
  [...KEEPER,...PEN.filter(x=>x!=='penalties_saved'),...DISC].forEach(f=>{
    const a=nn(mv,f), b=nn(gk,f);
    say('     '+f.padEnd(20)+
        (a+' ('+(a/mv.length*100).toFixed(1)+'% populated)').padEnd(26)+
        b+' ('+(b/gk.length*100).toFixed(1)+'%)');
  });
  say('');
  const gkP = psc.filter(r=>r.position==='GK');
  say('   player_season_cards             all rows ('+psc.length+')        GK rows ('+gkP.length+')');
  ['saves','goals_conceded','penalties_saved','starts','penalties_scored','penalties_missed','fouls_drawn','fouls_committed'].forEach(f=>{
    const a=nn(psc,f), b=nn(gkP,f);
    say('     '+f.padEnd(20)+
        (a+' ('+(a/psc.length*100).toFixed(1)+'% populated)').padEnd(26)+
        b+' ('+(b/gkP.length*100).toFixed(1)+'%)');
  });
  say('');
  say('   NOTE: cards_yellow / cards_red are on the MATVIEW but NOT on player_season_cards');
  say('   (42 columns, checked by pg_attribute). They are sourced elsewhere in the view.');
  say('');

  // ---------- 2. DISTRIBUTIONS + IMPOSSIBLES ----------
  say('2. DISTRIBUTION AND IMPOSSIBLE VALUES (GK rows on player_card_mv)');
  say('');
  say('   field                n      min     med      max');
  [...KEEPER].forEach(f=>{
    const v=gk.filter(r=>r[f]!=null).map(r=>r[f]);
    say('     '+f.padEnd(18)+String(v.length).padStart(5)+String(Math.min(...v)).padStart(8)+
        String(med(v)).padStart(8)+String(Math.max(...v)).padStart(9));
  });
  say('');
  const withSave = gk.filter(r=>r.saves!=null && r.goals_conceded!=null);
  const sf = r=>r.saves+r.goals_conceded;
  say('   *** THERE IS NO shots_faced COLUMN. It is DERIVED as saves + goals_conceded. ***');
  say('   So "saves exceeding shots faced" is impossible BY CONSTRUCTION unless');
  say('   goals_conceded is negative. It tests the arithmetic, not the data.');
  say('');
  const neg = f => gk.filter(r=>r[f]!=null && r[f]<0).length;
  say('   negative values:');
  [...KEEPER,...PEN].forEach(f=>say('     '+f.padEnd(20)+neg(f)));
  say('');
  say('   saves > (saves+goals_conceded)          : '+withSave.filter(r=>r.saves>sf(r)).length+'   (0 unless goals_conceded<0)');
  say('   save rate > 1                            : '+withSave.filter(r=>sf(r)>0 && r.saves/sf(r)>1).length);
  say('   save rate < 0                            : '+withSave.filter(r=>sf(r)>0 && r.saves/sf(r)<0).length);
  const zeroShots = withSave.filter(r=>sf(r)===0);
  say('   saves recorded but shots faced = 0       : '+zeroShots.length);
  if(zeroShots.length) say('     '+JSON.stringify(zeroShots.slice(0,8).map(r=>({card:r.card_id,name:r.player_name,season:r.season,min:r.minutes,saves:r.saves,gc:r.goals_conceded}))));
  const savesNoGC = gk.filter(r=>r.saves!=null && r.goals_conceded==null).length;
  const gcNoSaves = gk.filter(r=>r.saves==null && r.goals_conceded!=null).length;
  say('   saves present, goals_conceded NULL       : '+savesNoGC);
  say('   goals_conceded present, saves NULL       : '+gcNoSaves);
  say('   (the two always travel together if both are 0)');
  say('');
  const startsGtApps = gk.filter(r=>r.starts!=null && r.minutes!=null && r.starts*90 > r.minutes+1).length;
  say('   starts*90 exceeding minutes played       : '+startsGtApps+'   (a start is 90 min max only if never subbed)');
  require('fs').writeFileSync('/tmp/_kf_stage1.json', JSON.stringify({mvLen:mv.length}));
  global.__mv=mv; global.__psc=psc; global.__L=L;
  require('fs').writeFileSync('/tmp/keeperfields.txt', L.join('\n')+'\n');
})();
