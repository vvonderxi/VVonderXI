/*  NEUTRAL VENUE , A CURATED LIST, NOT A MEASUREMENT. Read this before using it.
    ================================================================================
    WHAT THIS IS: a hand-maintained list of ties played at a neutral ground. It is
    NOT derived from the data and it is NOT complete. Anything absent from it is
    reported as a normal home tie, which is the safe default because that is what
    the overwhelming majority are.

    WHY NOT DERIVE IT FROM THE VENUE , and this was decided rather than skipped.
    The obvious check is "the venue is not the home club's ground". It is rejected:
    GROUND SHARES (San Siro, Stadio Olimpico, the Allianz-era shares) and TEMPORARY
    STADIUMS (a club playing a season elsewhere during a rebuild) both produce FALSE
    NEUTRALS. A false neutral on a real home tie removes home advantage from a match
    that had it , and home advantage is the thing BAM is modelling, so the error
    lands directly on the estimate it is trying to make.

    AND IT IS NOT USED AS A CROSS-REFERENCE EITHER , ALSO DELIBERATE. A second
    signal that disagreed with this list would have to be adjudicated per fixture,
    and nobody would know which was right. One curated source that declares its own
    scope beats two sources that disagree.

    WHAT THE LIST COVERS:
      1. FINALS , neutral by competition design, every season.
      2. THE 2020 BUBBLE , the Champions League and Europa League final stages were
         played as single-leg tournaments at neutral grounds in August 2020.
      3. THIRD-COUNTRY TIES for sanctions or safety , Ukrainian clubs from 2022 and
         Israeli clubs from late 2023 played "home" ties abroad. THIS IS THE
         CATEGORY MOST LIKELY TO BE INCOMPLETE: it is per-club and per-window, the
         windows move, and a club can return home mid-competition.

    WHAT IT DOES NOT COVER, stated so BAM does not trust it past its scope:
      - one-off relocations for stadium bans, safety orders or local disorder
      - ties moved for weather or scheduling
      - any club-specific relocation not listed in RELOCATED below
      - and it says nothing about DOMESTIC leagues; it is UEFA-only.

    THE HONEST SUMMARY FOR THE REPORT: a fixture flagged neutral is neutral. A
    fixture NOT flagged is "not on the list", which is not the same as "played at
    home". Treat the flag as high-precision and unknown-recall.
*/
'use strict';

/*  Finals are neutral by design. Keyed by competition id; the round label the API
    uses for a final is matched case-insensitively.  */
const FINAL_ROUND=/final/i;
const NOT_A_FINAL=/semi|quarter|round of|play-?off|qualifying|group/i;

/*  Competition + season where the whole knockout phase was played at neutral
    grounds. 2019-20 only.  */
const BUBBLE=[
  {league:2, season:2019, from:'2020-08-01', note:'Champions League final stages, Lisbon'},
  {league:3, season:2019, from:'2020-08-01', note:'Europa League final stages, Germany'},
];

/*  Clubs whose HOME ties were played in a third country, with the window. Curated.
    A club returning home mid-window needs the window narrowed, not a new entry.  */
const RELOCATED=[
  {country:'Ukraine', from:'2022-02-24', to:null, note:'full-scale invasion; home ties played abroad'},
  {country:'Israel',  from:'2023-10-07', to:null, note:'security; home ties played abroad'},
];

function isFinal(round){ return FINAL_ROUND.test(round||'') && !NOT_A_FINAL.test(round||''); }

/*  Returns {neutral:boolean, reason:string|null}. `reason` is what goes in the
    export beside the flag, so a reader can see WHY rather than trusting a boolean. */
function classify(fx){
  const round=fx.league&&fx.league.round;
  if(isFinal(round)) return {neutral:true, reason:'final'};
  const lid=fx.league&&fx.league.id, season=fx.league&&fx.league.season, date=(fx.fixture&&fx.fixture.date||'').slice(0,10);
  for(const b of BUBBLE)
    if(lid===b.league && season===b.season && date>=b.from) return {neutral:true, reason:'2020 bubble , '+b.note};
  const homeCountry=fx._homeCountry;   // supplied by the caller from its own team map
  if(homeCountry) for(const r of RELOCATED)
    if(homeCountry===r.country && date>=r.from && (!r.to||date<=r.to))
      return {neutral:true, reason:'third country , '+r.note};
  return {neutral:false, reason:null};
}

module.exports={classify, BUBBLE, RELOCATED, isFinal,
  SCOPE:'curated list; high precision, unknown recall; UEFA only; not derived from venue'};
