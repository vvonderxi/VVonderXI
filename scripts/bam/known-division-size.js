/*  KNOWN DIVISION SIZE , the adjudicator, and it is neither endpoint.
    ================================================================
    WHY THIS TABLE EXISTS: /standings and /players disagree about which clubs
    were in a division, and NEITHER can settle it. Standings under-reports on
    some league-seasons (Super Lig 2015 comes back with 14 clubs, which the
    division has never had) and the player export over-reports on others (24
    Eredivisie clubs in an 18-team division). A dispute between two sources is
    not resolved by preferring one of them.

    The number of clubs in a division in a given season is a FACT ABOUT FOOTBALL.
    It is fixed before a ball is kicked, it is published, and it does not depend
    on what any API returns. So it is hardcoded here.

    SOURCE: division history , each league's season-by-season club count from the
    competition's own records (league season articles / RSSSF archives). NOT read
    from /standings and NOT read from /players, because those are the two sources
    being adjudicated.

    THIS IS A HAND-WRITTEN TABLE, WHICH THIS PROJECT HAS BEEN BURNED BY TWICE ,
    the league-size ceiling that produced 120 false positives, and the 90-minute
    match ceiling that flagged 70 correct cards. The difference here is that those
    two encoded a number that VARIES and was assumed constant; this encodes a
    number that is genuinely constant per league-season and is published. It is
    still the weakest link in the chain, so:
      - every entry a reader might doubt is commented
      - CONFIDENCE is declared per league, and the two I am least sure of say so
      - the classifier reports where standings AGREES, which is corroboration

    CONFIDENCE, AND WHICH ENTRIES HAVE EXTERNAL SUPPORT , measured, not assumed:
      high   PL, LL, SA, BL, ERE , unchanged sizes across the whole window
      high   L1, PRT             , one documented change each, well known
      MEDIUM BPL, TR             , both restructured repeatedly

    THE TWO MEDIUMS ARE NOT EQUALLY SUPPORTED, AND IT IS THE OPPOSITE WAY ROUND
    FROM WHAT YOU WOULD GUESS. /standings agreement with this table:

      BPL  15 of 16 seasons agree. The only divergence is 2018, where standings
           returns 19 against this table's 16 , and 19 is almost certainly the
           16 top-flight clubs PLUS Division 1B entrants to that era's Europa
           League play-offs, which is a documented feature of the Belgian format
           and therefore evidence FOR the table rather than against it.
      TR   11 of 16 seasons agree. Five diverge and standings is SHORT on every
           one: 2010 (0 clubs), 2012 (15), 2013 (17), 2014 (15), 2015 (14). None
           of those is a size the Super Lig has ever had.

    SO: BPL rests on 15 of 16 independent agreements with one explicable outlier.
    TR's 2020-2025 entries are corroborated (6 of 6), but TR 2010-2019 rest on
    this table ALONE , standings cannot confirm them because it is short or empty
    across exactly that range. THAT is the half with no external support, and it
    is the half a STANDINGS_GAP decision turns on.

    A future reader changing either league should know which cells are propped up
    by a second source and which are not. The TR 2010-2019 block is not.
*/
'use strict';

const K={};
const set=(code,from,to,n)=>{for(let y=from;y<=to;y++) (K[code]=K[code]||{})[y]=n;};

set('PL',2010,2025,20);   // 20 since 1995-96, unchanged across the window
set('LL',2010,2025,20);   // 20 since 1997-98
set('SA',2010,2025,20);   // 20 since 2004-05
set('BL',2010,2025,18);   // 18 since 1965-66
set('ERE',2010,2025,18);  // 18 since 1962-63

set('L1',2010,2022,20);   // 20 through 2022-23
set('L1',2023,2025,18);   // REDUCED TO 18 from 2023-24. Standings agrees; the
                          // export carries 19, so L1 2023-2025 is contamination.

set('PRT',2010,2013,16);  // 16 through 2013-14. Standings agrees at 16, and the
                          // export agrees at 16 , both right, nothing to fix.
set('PRT',2014,2025,18);  // EXPANDED TO 18 from 2014-15.

/*  BELGIUM , MEDIUM CONFIDENCE. First Division A ran 16, expanded to 18 for
    2020-21, and reduced back to 16 from 2023-24. The playoff split means
    /standings can return several groups, which is handled by unioning them.  */
set('BPL',2010,2019,16);
set('BPL',2020,2022,18);
set('BPL',2023,2025,16);

/*  TURKEY , MEDIUM CONFIDENCE and the most restructured of the nine. 18 through
    2019-20; expanded to 21 for 2020-21 (no relegation after the COVID-curtailed
    season); then 20, 19, 20, 19, and back to 18 for 2025-26.
    STANDINGS CORROBORATES EVERY ONE OF 2020-2025 (21,20,19,20,19,18), which is
    the strongest external check any entry in this table has.  */
set('TR',2010,2019,18);
set('TR',2020,2020,21);
set('TR',2021,2021,20);
set('TR',2022,2022,19);
set('TR',2023,2023,20);
set('TR',2024,2024,19);
set('TR',2025,2025,18);

const CONFIDENCE={PL:'high',LL:'high',SA:'high',BL:'high',ERE:'high',
  L1:'high',PRT:'high',BPL:'medium',TR:'medium'};
const SOURCE='division history (competition season records / RSSSF), not /standings and not /players';

module.exports={KNOWN_SIZE:K, CONFIDENCE, SOURCE};
