/*  COMPLETION REPORT GENERATOR , reads the exports, writes the report.
    ================================================================
    WHY A GENERATOR AND NOT A WRITTEN DOCUMENT: this export has been re-specified
    three times and every round produced a report paraphrased from memory, with
    figures that did not survive checking. A report assembled from the generated
    metas cannot contain a number nobody measured, and it cannot go stale while
    the data moves underneath it.

    IT REFUSES TO RUN ON AN EMPTY EXPORT. A completion report describing leagues
    that are not on disk is worse than no report, because BAM builds against it.

    QUESTIONS FOR BAM ARE EMITTED AS QUESTIONS, NOT ANSWERED. Anything that is
    BAM's decision , whether a partially-covered season is usable, what counts as
    a valid match , is printed as an open question with the measurement beside it.
    We supply the number; BAM supplies the ruling. Choosing on their behalf is how
    a spec moves for a fourth time.
*/
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..','..'), BAM=path.join(ROOT,'exports','bam');
const ref=JSON.parse(fs.readFileSync(path.join(BAM,'reference','shots_coverage_by_league.json'),'utf8')).bam_leagues;

const leagues=Object.entries(ref).map(([slug,spec])=>{
  const dir=path.join(BAM,slug);
  if(!fs.existsSync(dir)) return {slug,spec,metas:[]};
  const metas=fs.readdirSync(dir).filter(f=>/^meta_\d{4}\.json$/.test(f))
    .map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
  return {slug,spec,metas};
});
const exported=leagues.filter(l=>l.metas.length);
if(!exported.length){
  console.error('REFUSING TO WRITE , no league has been exported.');
  console.error('A completion report describing data that is not on disk is worse than none.');
  console.error('Run the export first; check state with scripts/bam/check-coverage.js.');
  process.exit(1);
}

const L=[];
L.push('# BAM export , completion report');
L.push('');
L.push(`Generated ${new Date().toISOString().slice(0,10)} by \`scripts/bam/gen-report.js\` from the`);
L.push('exported metas. **Every figure below is read from the files. None is typed.**');
L.push('');
let totMatches=0, totScheduled=0, totGoalsOnly=0;
L.push('## Per league');
L.push('');
L.push('| league | seasons | played | scheduled | with shots | goals-only | shots from (measured) |');
L.push('|---|---|---|---|---|---|---|');
for(const l of exported){
  const played=l.metas.reduce((a,m)=>a+(m.match_count||0),0);
  const sched=l.metas.reduce((a,m)=>a+(m.not_yet_played||0),0);
  const shots=l.metas.reduce((a,m)=>a+((m.shots_coverage&&m.shots_coverage.rows_with_shots)||0),0);
  const goalsOnly=played-shots;
  totMatches+=played; totScheduled+=sched; totGoalsOnly+=goalsOnly;
  const withShots=l.metas.filter(m=>m.shots_coverage&&m.shots_coverage.rows_with_shots>0).map(m=>m.season).sort();
  L.push(`| \`${l.slug}\` | ${l.metas.length}/${l.spec.expected_season_count} | ${played} | ${sched} | ${shots} | ${goalsOnly} | ${withShots.length?withShots[0]:'never'} |`);
}
L.push('');
L.push(`**Totals , played ${totMatches}, scheduled ${totScheduled}, goals-only ${totGoalsOnly}.**`);
L.push('');
L.push('`goals-only` = played matches carrying no shot data. It is the count that decides');
L.push('whether a shots-based model can fit a league, and it is measured per season rather');
L.push('than inferred from the coverage flag.');
L.push('');
L.push('## Club ids, for BAM\'s own overlap check');
L.push('');
L.push('We cannot check for shared teams against BAM\'s existing fit or its cup-mode data,');
L.push('because we hold neither. `names_<slug>.csv` carries **`ApiTeamId`** for every club,');
L.push('which is the only reliable join key across sources. BAM runs the intersection.');
L.push('**Any collision should be named, never silently deduped.**');
L.push('');
/*  EXCLUSIONS ARE EXPLAINED, NOT STATED , and the arithmetic is DERIVED here so a
    reader can see why the match loss exceeds the club-season count. Exclusion is
    per CLUB-SEASON, but a match has TWO sides: removing one club removes every
    match it played against clubs that remain. The multiplier is structural and it
    surprises people, and a surprise of that size inside a fit is far worse than
    one in a report.  */
const excl=require('./exclusions.js');
const overlap=excl.loadOverlap(ROOT);
L.push('## Exclusions , what was removed, and why the match loss is larger than it looks');
L.push('');
if(overlap===null){
  L.push('**BAM\'s overlap list has not been supplied**, so NOTHING is excluded on those');
  L.push('grounds. We cannot compute it , we hold neither BAM\'s seven-league fit nor its');
  L.push(`cup-mode data. Supply \`${excl.OVERLAP_FILE}\` and it is applied on the next run.`);
  L.push('');
}
let exSeasons=0, exMatches=0;
const exRows=[];
for(const l of exported) for(const m of l.metas){
  const v=excl.seasonExcluded({...m,slug:l.slug}, overlap);
  if(!v.excluded) continue;
  exSeasons++; exMatches+=(m.match_count||0);
  exRows.push(`| \`${l.slug}\` | ${m.season} | ${m.match_count||0} | ${v.reason} |`);
}
if(exRows.length){
  L.push('| league | season | matches removed | reason |');
  L.push('|---|---|---|---|');
  exRows.forEach(r=>L.push(r));
  L.push('');
  const pct=totMatches?((exMatches/totMatches)*100).toFixed(1):'0.0';
  L.push(`**${exSeasons} season(s) excluded, ${exMatches} matches , ${pct}% of the domestic export.**`);
  L.push('');
  L.push('**Why this is larger than the club-season count suggests.** Exclusion is per');
  L.push('club-season, but every match has two sides. Removing one club removes each match it');
  L.push('played against clubs that remain, so the match loss scales with how many fixtures');
  L.push('each excluded club contested, not with how many clubs were named. In a league where');
  L.push('every club plays every other twice, excluding one club of N removes roughly');
  L.push('`2 x (N-1)` matches while the club count falls by one. **That is structural and');
  L.push('correct, not a defect , but it is why the figure can be several times what a');
  L.push('club-count estimate predicts.**');
  L.push('');
}else{
  L.push('**No season currently meets an exclusion rule.**');
  L.push('');
}
L.push('## Open questions , BAM\'s to answer, not ours');
L.push('');
/*  THE ISRAELI EXCLUSION IS PUT TO BAM RATHER THAN SETTLED. The ruling was made on
    the premise that every split season is missing its championship round. Any
    Israeli season the export shows as SINGLE-PHASE does not meet that premise, and
    excluding it would be applying a ruling past its reason.  */
const isr=exported.find(l=>l.slug===excl.ISRAEL_SLUG);
if(isr){
  const split=isr.metas.filter(m=>excl.israelSplitSeason({...m,slug:isr.slug})).map(m=>m.season);
  const single=isr.metas.filter(m=>!excl.israelSplitSeason({...m,slug:isr.slug})).map(m=>m.season);
  L.push(`- **Israel , excluded as split: ${split.join(', ')||'none'}. Served single-phase, KEPT: ${single.join(', ')||'none'}.**`);
  L.push('  The ruling was "exclude the split seasons", on the premise that the championship');
  L.push('  round is missing. **A season the API serves as single-phase does not meet that');
  L.push('  premise**, so it is kept rather than excluded on a reason that does not apply to');
  L.push('  it. **Confirm that is what you want** , it is your ruling and we have applied it');
  L.push('  to its stated reason rather than to the league.');
}
for(const l of exported){
  const partial=l.metas.filter(m=>{
    const sc=m.shots_coverage||{}; const r=sc.rows_total?sc.rows_with_shots/sc.rows_total:1;
    return sc.rows_total && r>0 && r<0.95;});
  if(partial.length) L.push(`- **\`${l.slug}\`** , ${partial.length} season(s) partially covered: `
    +partial.map(m=>`${m.season} (${m.shots_coverage.rows_with_shots}/${m.shots_coverage.rows_total})`).join(', ')
    +'. **Usable with a caveat, or excluded?** You are the one fitting on them.');
  const short=l.metas.filter(m=>m.round_census && m.round_census.short_rounds && m.round_census.short_rounds.length);
  if(short.length) L.push(`- **\`${l.slug}\`** , ${short.length} season(s) with short rounds, which can mean a `
    +'phase the API does not serve. **Usable, or excluded?**');
}
L.push('- **Rules 1 and 2 have never been defined to us.** Send them and the valid-match count');
L.push('  and the goals-only fallback under those rules come straight out of the table above.');
L.push('');
fs.writeFileSync(path.join(BAM,'COMPLETION_REPORT.md'),L.join('\n')+'\n');
console.log(`written , ${exported.length} leagues, ${totMatches} played matches`);
