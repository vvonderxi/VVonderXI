/*  BAM COVERAGE CHECK , READ-ONLY, NO API CALLS.
    ================================================================
    Turns "nothing is open" from an absence of requests into a measurement.
    Runs against exports/bam/ and the coverage reference; reports, per league:

      1. SEASON COMPLETENESS , every season the API holds from the requested
         floor year is present as a CSV + meta pair. A missing season is the
         failure that looks like nothing, because the files that ARE there are
         perfectly good.
      2. SHOTS BOUNDARY RECORDED , the measured first season carrying shots,
         read from rows_with_shots in the metas, set beside the catalogue flag.
         THE FLAG IS FIRST-APPEARANCE, NOT COMPLETENESS: Eredivisie's flag says
         2015/16 and the measured coverage was 58/54/53/53% across 2015-2018,
         reaching 100% only from 2019/20. Report the measured one.
      3. SCHEDULED COUNTS , fixtures per season against the league's own modal
         count. A season far off its league's norm is either a short archive or
         a bad pull, and neither announces itself. The bar is the league's OWN
         modal value, never a hardcoded season length: this project has paid
         twice for a hand-written table of league sizes.
      4. CLUB-NAME IDENTITY , in-season and across seasons, via club-identity.js. It USED to
         read club_names.match, which is false on every COMPLETED season by construction
         (the unplayed set is empty, so every club reads "only in played") , 93 of 94
         platform seasons, zero real splits. Punchlist 36. A completed season is now
         NOT_APPLICABLE in-season, reported and never counted as a pass, and identity across
         seasons is read from ApiTeamId in names_<slug>.csv.
      5. ZERO-FIXTURE SEASONS, CLASSIFIED THREE WAYS , and only one is ours.
         A season whose file carries no fixtures is not one thing:
           NOT_PUBLISHED  the season exists and its fixture list is not out yet.
                          Expected for a season that has not kicked off. Not a defect.
           NOT_STARTED    the API holds the season and returns nothing for it.
                          A fact about the source. Not a defect.
           DROPPED        we requested it, the API returned rows, and our export
                          wrote none. THE ONLY DEFECT, and the only one to fix.
         A check that cannot separate these hands BAM a league it cannot price
         with nothing failing. The meta records api_results beside the written
         count precisely so the third case is distinguishable from the first two
         rather than inferred.
*/
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..','..'), BAM=path.join(ROOT,'exports','bam');
const REF=path.join(BAM,'reference','shots_coverage_by_league.json');
const ref=JSON.parse(fs.readFileSync(REF,'utf8')).bam_leagues;
const {seasonNames, idNames}=require('./club-identity.js');

let problems=0, leaguesSeen=0;
const line=(s)=>console.log(s);
line('BAM COVERAGE CHECK , ' + new Date().toISOString().slice(0,10));
line('');
for(const [slug,spec] of Object.entries(ref).sort()){
  const dir=path.join(BAM,slug);
  if(!fs.existsSync(dir)){ line(`  ${slug.padEnd(24)} NOT EXPORTED`); problems++; continue; }
  leaguesSeen++;
  const metas=fs.readdirSync(dir).filter(f=>/^meta_\d{4}\.json$/.test(f))
    .map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
  const have=new Set(metas.map(m=>m.season));
  const missing=spec.expected_seasons.filter(y=>!have.has(y));
  const extra=[...have].filter(y=>!spec.expected_seasons.includes(y));
  // csv beside every meta
  const noCsv=metas.filter(m=>!fs.existsSync(path.join(dir,m.csv_file))).map(m=>m.season);
  // measured shots boundary
  const withShots=metas.filter(m=>m.shots_coverage && m.shots_coverage.rows_with_shots>0)
                       .map(m=>m.season).sort();
  const measured=withShots.length?withShots[0]:null;
  // scheduled counts against the league's OWN modal total
  const totals=metas.map(m=>m.fixtures_listed).filter(n=>n>0);
  const freq={}; totals.forEach(n=>freq[n]=(freq[n]||0)+1);
  const modal=Number(Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||0);
  const odd=metas.filter(m=>m.season!==2026 && modal && Math.abs(m.fixtures_listed-modal)/modal>0.25)
                 .map(m=>`${m.season}:${m.fixtures_listed}`);
  // club-name identity
  const nameRes=metas.map(m=>({season:m.season, r:seasonNames(m)}));
  const nameFail=nameRes.filter(x=>x.r.state==='DIFFER').map(x=>`${x.season} (${x.r.names.join('/')})`);
  const noNameCheck=nameRes.filter(x=>x.r.state==='NO_CHECK').map(x=>x.season);
  const nameNA=nameRes.filter(x=>x.r.state==='NOT_APPLICABLE').length;
  const ids=idNames(path.join(BAM,'names_'+slug+'.csv'));
  const idDefects=ids.findings.filter(f=>f.kind!=='RENAME'), idRenames=ids.findings.filter(f=>f.kind==='RENAME');

  const bad=missing.length||noCsv.length||odd.length||nameFail.length||idDefects.length;
  if(bad) problems++;
  line(`  ${slug.padEnd(24)} ${String(metas.length).padStart(2)}/${spec.expected_season_count} seasons`
     + `  shots flag ${String(spec.shots_label).padEnd(9)} measured ${measured?measured+'/'+String(measured+1).slice(2):'NONE'}`);
  if(missing.length)      line(`      MISSING SEASONS      : ${missing.join(', ')}`);
  if(extra.length)        line(`      seasons beyond floor : ${extra.join(', ')}`);
  if(noCsv.length)        line(`      META WITHOUT CSV     : ${noCsv.join(', ')}`);
  if(odd.length)          line(`      FIXTURE COUNT ODD    : ${odd.join(', ')} (league modal ${modal})`);
  if(nameFail.length)     line(`      CLUB NAMES DIFFER    : ${nameFail.join(', ')}`);
  if(noNameCheck.length)  line(`      no club-name check   : ${noNameCheck.join(', ')} (older format)`);
  if(nameNA)              line(`      club names in-season : ${nameNA} season(s) complete, not applicable , identity read by team id instead`);
  if(ids.state==='NO_MAP')line(`      NO names_${slug}.csv , identity across seasons UNCHECKED`);
  idDefects.forEach(f=>   line(`      CLUB ID ${f.kind.padEnd(9)}: ${f.detail}`));
  idRenames.forEach(f=>   line(`      club renamed (id ${f.id}): ${f.detail} , not a defect; a name-keyed consumer must join on the id`));
  /*  THE THREE-WAY CLASSIFICATION. api_results is what the provider returned for
      that season; written is what we put in the CSV. Only a season where the
      provider gave rows and we wrote none is ours to fix.  */
  const zero=metas.filter(m=>(m.fixtures_listed||0)===0);
  if(zero.length){
    const cls={NOT_PUBLISHED:[],NOT_STARTED:[],DROPPED:[]};
    const thisYear=new Date().getUTCFullYear();
    for(const m of zero){
      const got=(m.api_results==null)?null:m.api_results;
      if(got&&got>0) cls.DROPPED.push(m.season);
      else if(m.season>=thisYear) cls.NOT_PUBLISHED.push(m.season);
      else cls.NOT_STARTED.push(m.season);
    }
    for(const [k,v] of Object.entries(cls)) if(v.length)
      line(`      ZERO FIXTURES / ${k.padEnd(13)}: ${v.join(', ')}${k==='DROPPED'?'   <- DEFECT, ours':''}`);
    if(cls.DROPPED.length) problems++;
    if(zero.some(m=>m.api_results==null))
      line(`      (seasons above with no api_results recorded are classified by date only , re-export to resolve)`);
  }
  if(spec.shots_absent_entirely) line(`      note: NO shot statistics in ANY season , permanently empty, not old`);
  else if(measured && spec.shots_first_season && measured!==spec.shots_first_season)
                          line(`      note: measured boundary differs from the catalogue flag`);
}
line('');
line(`${leaguesSeen} of ${Object.keys(ref).length} leagues exported.`);
line(problems? `FAIL , ${problems} league(s) with a gap.` : 'OK , every league complete.');
process.exit(problems?1:0);
