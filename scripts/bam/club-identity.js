/*  BAM CLUB IDENTITY , two checks, because one comparison cannot cover both states of a season.
    ================================================================
    PUNCHLIST 36. The exporter's club_names.match compared a season's PLAYED name set with its
    UNPLAYED one and was false whenever either set held a name the other lacked. On a COMPLETED
    season the unplayed set is empty, so every club read "only in played" and match was false by
    construction: 93 of 94 platform-export seasons, zero of them a real name split. The six that
    carried unplayed names were real football , cancelled Belgian relegation play-off legs, an
    awarded Nantes v Bastia, Gaziantep's withdrawal after the February 2023 earthquake , and every
    one had an EMPTY only_in_unplayed.

    1. IN-SEASON (seasonNames). A fixture naming a club the results never do is a split. That is
       only_in_unplayed, and it is meaningful whenever unplayed fixtures exist. only_in_played is
       meaningful ONLY while the season is still running (not_yet_played > 0): mid-season every
       club has a fixture left, so a results-only name is a split; after the last round no club
       does, so it means nothing. A season with no unplayed fixtures is NOT_APPLICABLE, which is
       reported as such and is NEVER counted as a pass.

    2. ACROSS SEASONS (idNames). names_<slug>.csv carries ApiTeamId, the stable key. One id under
       two names whose season spans OVERLAP is a SPLIT , a defect. Disjoint spans are a RENAME ,
       not a defect in the export, but a real hazard for any consumer that keys clubs by name:
       l1 team 1305 is "Bastia" 2012-2015 and "SC Bastia" 2016, so a name-keyed rating history
       breaks between the two. One name under two ids is a COLLISION , a defect.

    Works on metas written before this change: it reads only_in_unplayed, only_in_played and
    not_yet_played, never the old match boolean.
*/
'use strict';
const fs=require('fs');

function seasonNames(meta){
  const c=meta && meta.club_names;
  if(!c) return {state:'NO_CHECK'};
  const onlyU=c.only_in_unplayed||[], onlyP=c.only_in_played||[];
  if(onlyU.length) return {state:'DIFFER', names:onlyU, why:'a fixture names a club the results never do'};
  if(!c.unplayed) return {state:'NOT_APPLICABLE', why:'no unplayed fixtures, so the two lists cannot be compared'};
  if((meta.not_yet_played||0)>0 && onlyP.length) return {state:'DIFFER', names:onlyP, why:'mid-season, results name a club no remaining fixture does'};
  return {state:'OK'};
}

function idNames(namesCsvPath){
  if(!fs.existsSync(namesCsvPath)) return {state:'NO_MAP', findings:[]};
  const lines=fs.readFileSync(namesCsvPath,'utf8').trim().split('\n');
  const head=lines.shift().split(',');
  const col=(k)=>{const i=head.indexOf(k); if(i<0) throw new Error('names map has no '+k+' column: '+namesCsvPath); return i;};
  const iN=col('ClubName'), iId=col('ApiTeamId'), iF=col('FirstSeason'), iL=col('LastSeason');
  // club names contain no commas in these maps; assert it rather than assume it
  const rows=lines.map(l=>{const p=l.split(','); if(p.length!==head.length) throw new Error('unexpected comma in names map row: '+l); return {name:p[iN],id:p[iId],first:+p[iF],last:+p[iL]};});
  const byId={}, byName={}, findings=[];
  rows.forEach(r=>{(byId[r.id]=byId[r.id]||[]).push(r); (byName[r.name]=byName[r.name]||[]).push(r);});
  for(const [id,rs] of Object.entries(byId)){
    if(rs.length<2) continue;
    rs.sort((a,b)=>a.first-b.first);
    let overlap=false; for(let i=1;i<rs.length;i++) if(rs[i].first<=rs[i-1].last) overlap=true;
    findings.push({kind:overlap?'SPLIT':'RENAME', id, detail:rs.map(r=>`"${r.name}" ${r.first}-${r.last}`).join(', ')});
  }
  for(const [name,rs] of Object.entries(byName)) if(rs.length>1)
    findings.push({kind:'COLLISION', name, detail:rs.map(r=>`id ${r.id}`).join(', ')});
  return {state:findings.some(f=>f.kind!=='RENAME')?'DEFECT':(findings.length?'RENAMES_ONLY':'OK'), findings};
}

module.exports={seasonNames, idNames};
