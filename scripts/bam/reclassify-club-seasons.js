/*  RECLASSIFY AND REBUILD club_seasons.csv , no API calls, files only.
    ================================================================
    THREE-WAY CLASSIFICATION against KNOWN_SIZE, which is neither endpoint:

      CONTAMINATED   export > known size, AND standings >= known size
                     -> filter to standings membership. Standings is complete
                        enough here to be trusted as a membership list.
      STANDINGS_GAP  standings < known size
                     -> DO NOT FILTER, whatever the export count is. A filter
                        built on an incomplete membership list is worse than no
                        filter: it deletes real clubs and leaves no trace.
                        Membership is flagged UNVERIFIED.
      CLEAN          export == known size -> untouched.

    THE FOURTH CASE IS THE ONE THAT MATTERS AND IT IS WHY THE RULE IS TWO-PART:
    a league-season can be BOTH contaminated and standings-short. Filtering it
    would drop the contamination AND real clubs, indistinguishably. Those are
    left unfiltered and flagged , the honest outcome is a known-bad aggregate
    that says so, not a silently-thinned one.

    player_seasons.csv IS NOT TOUCHED. A player's row is correctly labelled by a
    source that mislabels; membership filtering belongs at the aggregate.
*/
'use strict';
const fs=require('fs'), path=require('path');
const {KNOWN_SIZE,CONFIDENCE,SOURCE}=require('./known-division-size.js');
const ROOT=path.resolve(__dirname,'..','..');
const base=path.join(ROOT,'exports','bam','player');
const dir=path.join(base,fs.readdirSync(base).filter(f=>/^\d{4}-/.test(f))[0]);
const st=JSON.parse(fs.readFileSync(path.join(base,'standings_membership.json'),'utf8')).league_seasons;

function readCsv(f){const L=fs.readFileSync(f,'utf8').trim().split('\n');
  const h=L[0].split(',');return L.slice(1).map(l=>{const c=l.split(',');const o={};h.forEach((k,i)=>o[k]=c[i]);return o;});}
const rows=readCsv(path.join(dir,'player_seasons.csv'));

const agg={}; for(const r of rows){
  const k=`${r.league_code}|${r.season}|${r.club_id}`;
  const a=agg[k]=agg[k]||{club:r.club,league:r.league_code,season:+r.season,club_id:r.club_id,
    n:0,mins:0,g:0,a:0,ratings:[],weighted:0};
  const m=+r.minutes||0, rat=r.rating?parseFloat(r.rating):null;
  a.n++; a.mins+=m; a.g+=+r.goals||0; a.a+=+r.assists||0;
  if(rat!=null&&!isNaN(rat)){ a.ratings.push({r:rat,m}); a.weighted+=rat*m; }
}
const byLs={}; for(const a of Object.values(agg)) (byLs[`${a.league}|${a.season}`]=byLs[`${a.league}|${a.season}`]||[]).push(a);

const cls={}, dropped=[]; let dropClubSeasons=0, dropMinutes=0;
for(const [k,list] of Object.entries(byLs)){
  const [lg,yr]=k.split('|');
  const known=KNOWN_SIZE[lg]?.[+yr] ?? null;
  const sIds=new Set(((st[k]&&st[k].teams)||[]).map(t=>String(t.id)));
  const sCount=sIds.size, eCount=list.length;
  let c;
  if(known==null) c='UNKNOWN_SIZE';
  else if(sCount<known) c='STANDINGS_GAP';
  else if(eCount>known) c='CONTAMINATED';
  else c='CLEAN';
  cls[k]={classification:c,known_size:known,standings_count:sCount,export_count:eCount,
    confidence:CONFIDENCE[lg]};
  if(c==='CONTAMINATED'){
    const keep=list.filter(a=>sIds.has(String(a.club_id)));
    const cut=list.filter(a=>!sIds.has(String(a.club_id)));
    cls[k].clubs_dropped=cut.map(a=>a.club);
    cls[k].minutes_dropped=cut.reduce((s,a)=>s+a.mins,0);
    dropClubSeasons+=cut.length; dropMinutes+=cls[k].minutes_dropped;
    for(const a of cut) dropped.push({league:lg,season:+yr,club:a.club,minutes:a.mins});
    byLs[k]=keep;
  }
}
const hdr='club,league,season,squad_size,total_minutes,mean_rating,minutes_weighted_rating,top11_mean_rating,goals,assists';
const line=a=>{const rs=a.ratings.map(x=>x.r);
  const mean=rs.length?rs.reduce((s,v)=>s+v,0)/rs.length:null;
  const wm=a.mins?a.weighted/a.mins:null;
  const t11=a.ratings.slice().sort((x,y)=>y.m-x.m).slice(0,11).map(x=>x.r);
  const tm=t11.length?t11.reduce((s,v)=>s+v,0)/t11.length:null;
  return [a.club,a.league,a.season,a.n,a.mins,mean?.toFixed(3)??'',wm?.toFixed(3)??'',tm?.toFixed(3)??'',a.g,a.a]
    .map(v=>{const s=v==null?'':String(v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',');};

// unfiltered first , written, never replacing anything by deletion
const allAgg=Object.values(agg).sort((a,b)=>`${a.league}${a.season}${a.club}`.localeCompare(`${b.league}${b.season}${b.club}`));
fs.writeFileSync(path.join(dir,'club_seasons_unfiltered.csv'),[hdr,...allAgg.map(line)].join('\n')+'\n');
const kept=Object.values(byLs).flat().sort((a,b)=>`${a.league}${a.season}${a.club}`.localeCompare(`${b.league}${b.season}${b.club}`));
fs.writeFileSync(path.join(dir,'club_seasons.csv'),[hdr,...kept.map(line)].join('\n')+'\n');

const meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
const tally={}; for(const v of Object.values(cls)) tally[v.classification]=(tally[v.classification]||0)+1;
meta.membership={
  adjudicator:'KNOWN_SIZE , clubs per division per season',
  known_size_source:SOURCE,
  known_size_confidence:CONFIDENCE,
  why_not_either_endpoint:'/standings under-reports on some league-seasons (Super Lig 2015 returns 14 '
    +'clubs, a size the division has never had) and the player export over-reports on others (24 '
    +'Eredivisie clubs in an 18-team division). A dispute between two sources is not settled by '
    +'preferring one. Division size is fixed before a season starts and is published.',
  rule:{CONTAMINATED:'export > known AND standings >= known -> filtered to standings membership',
        STANDINGS_GAP:'standings < known -> NOT filtered at any export count; membership UNVERIFIED',
        CLEAN:'export == known -> untouched'},
  both_contaminated_and_short:'left UNFILTERED and flagged. Filtering on an incomplete membership '
    +'list drops real clubs indistinguishably from contamination.',
  tally, per_league_season:cls,
  club_seasons_dropped:dropClubSeasons, minutes_dropped:dropMinutes,
  dropped_detail:dropped,
  files:{filtered:'club_seasons.csv',unfiltered:'club_seasons_unfiltered.csv'},
  player_seasons_untouched:true};
fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify(meta,null,2));

console.log('classification tally:',JSON.stringify(tally));
console.log('club-seasons dropped:',dropClubSeasons,'| minutes dropped:',dropMinutes);
console.log('club_seasons.csv           :',kept.length,'rows');
console.log('club_seasons_unfiltered.csv:',allAgg.length,'rows');
console.log('\nper classification:');
for(const c of ['CONTAMINATED','STANDINGS_GAP','CLEAN','UNKNOWN_SIZE']){
  const ks=Object.entries(cls).filter(([,v])=>v.classification===c).map(([k])=>k);
  if(ks.length) console.log(`  ${c} (${ks.length}): ${ks.join(', ')}`);
}
