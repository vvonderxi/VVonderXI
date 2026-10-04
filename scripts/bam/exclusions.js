/*  BAM'S EXCLUSION RULINGS , decided by BAM, applied automatically.
    ================================================================
    These are BAM's calls, not ours. They are encoded here so they are applied on
    every run rather than remembered, and so the report can state WHY a row is
    absent instead of leaving a gap a later reader has to explain.

    EXCLUDED ROWS ARE COUNTED AND REPORTED, NEVER SILENTLY DROPPED. A row removed
    without a record is indistinguishable from a row that was never fetched, and
    that ambiguity is what the three-way empty-season classification exists to
    prevent elsewhere.
*/
'use strict';

/*  1. OVERLAP WITH BAM'S EXISTING SEVEN-LEAGUE FIT.
    BAM keeps its existing fit as the source for anything it already covers. The
    new data's value is the clubs and seasons NOT already in it, and an
    unvalidated import must not quietly replace validated data.

    WE CANNOT COMPUTE THE OVERLAP , we do not hold BAM's fit or its cup-mode
    Championship data. BAM supplies the list; we apply it. The file is a JSON
    array of {league_slug, season, api_team_id} or {league_slug, season} for a
    whole season. Until it is supplied, NOTHING is excluded on these grounds and
    the report says so rather than implying the rule was applied.  */
const OVERLAP_FILE='exports/bam/reference/bam_overlap_exclusions.json';

/*  2. ISRAEL , ALL SPLIT SEASONS EXCLUDED.
    Missing 10 to 20 championship-round matches per season is SYSTEMATIC bias, not
    a random gap: in a split format those are the highest-stakes games, played
    between the strongest clubs. Dropping them does not thin the sample evenly, it
    removes the top of it, which biases every rating fitted on what remains.
    Revisit only if a complete source appears.

    THE SEASON LIST IS NOT HARDCODED , a season is excluded when the export shows
    it is split and short. Hardcoding six years would go stale the moment a
    seventh is pulled, and this project has paid twice for a hand-written table.  */
const ISRAEL_SLUG='israel-ligat-haal';

function israelSplitSeason(meta){
  if(meta.slug!==ISRAEL_SLUG) return false;
  const rc=meta.round_census||{};
  return Boolean(rc.short_rounds && rc.short_rounds.length);
}

function loadOverlap(root){
  const fs=require('fs'), path=require('path');
  const p=path.join(root,OVERLAP_FILE);
  if(!fs.existsSync(p)) return null;          // null means "not supplied", not "empty"
  return JSON.parse(fs.readFileSync(p,'utf8'));
}

/*  Returns {excluded:boolean, reason:string|null} for a whole season.  */
function seasonExcluded(meta, overlap){
  if(israelSplitSeason(meta))
    return {excluded:true, reason:'Israel split season , championship round not served; '
      +'systematic bias, not a random gap (BAM ruling)'};
  if(overlap) for(const o of overlap)
    if(o.league_slug===meta.slug && o.season===meta.season && !o.api_team_id)
      return {excluded:true, reason:'already covered by BAM\'s seven-league fit (BAM ruling)'};
  return {excluded:false, reason:null};
}

module.exports={seasonExcluded, loadOverlap, israelSplitSeason, OVERLAP_FILE, ISRAEL_SLUG};
