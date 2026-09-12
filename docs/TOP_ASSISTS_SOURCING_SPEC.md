# TOP ASSISTS , SOURCING THE WINNER, 2010-2015

**Scoped 2026-09-12. APPROVED BY LUCAS, NOT STARTED. A fresh-session job.**

Read `DATA_DEFECTS.md` first, the entry *"`top_assists` WAS COMPUTED FROM OUR OWN 99%-NULL ASSISTS
COLUMN"*. This spec exists because that defect was corrected by DELETION, which left 46
league-seasons with no assists honour at all. **Deletion was the right call and this is the
separate, approved follow-up: source the winner from outside our data.**

---

## 1. SCOPE , 46 ADDITIONS. THE EIGHT 2015/16 ROWS ARE OUT OF SCOPE.

**46 league-seasons carry no `top_assists` row and cannot produce one from our data.** Coverage
measured 2026-09-12 (`season_year` 2010 means the 2010/11 season):

    PL   2010/11     3 of 401 cards carry an assist figure   0.7%
    PL   2011/12     3 of 390                                0.8%
    PL   2012/13     6 of 384                                1.6%
    PL   2013/14     5 of 390                                1.3%
    PL   2014/15    12 of 390                                3.1%
    LL   2010/11     8 of 419                                1.9%
    LL   2011/12     5 of 423                                1.2%
    LL   2012/13     7 of 420                                1.7%
    LL   2013/14     4 of 423                                0.9%
    LL   2014/15     6 of 425                                1.4%
    SA   2010/11     3 of 405                                0.7%
    SA   2011/12     5 of 434                                1.2%
    SA   2012/13     2 of 431                                0.5%
    SA   2013/14     2 of 429                                0.5%
    SA   2014/15     2 of 429                                0.5%
    BL   2010/11     3 of 342                                0.9%
    BL   2011/12     4 of 345                                1.2%
    BL   2012/13     2 of 352                                0.6%
    BL   2013/14     2 of 351                                0.6%
    BL   2014/15     1 of 360                                0.3%
    L1   2010/11     3 of 382                                0.8%
    L1   2011/12     2 of 386                                0.5%
    L1   2012/13     1 of 409                                0.2%
    L1   2013/14     1 of 399                                0.3%
    L1   2014/15     2 of 387                                0.5%
    PRT  2010/11     1 of 304                                0.3%
    PRT  2011/12     1 of 315                                0.3%
    PRT  2012/13     1 of 307                                0.3%
    PRT  2013/14     0 of 310                                0.0%
    PRT  2014/15     0 of 369                                0.0%
    ERE  2010/11     2 of 332                                0.6%
    ERE  2011/12     5 of 338                                1.5%
    ERE  2012/13     4 of 335                                1.2%
    ERE  2013/14     2 of 340                                0.6%
    ERE  2014/15     1 of 334                                0.3%
    BPL  2010/11     1 of 321                                0.3%
    BPL  2011/12     2 of 326                                0.6%
    BPL  2012/13     1 of 338                                0.3%
    BPL  2013/14     0 of 328                                0.0%
    BPL  2014/15     0 of 344                                0.0%
    BPL  2015/16     1 of 349                                0.3%
    TR   2010/11     1 of 370                                0.3%
    TR   2011/12     1 of 349                                0.3%
    TR   2012/13     0 of 348                                0.0%
    TR   2013/14     0 of 347                                0.0%
    TR   2014/15     0 of 334                                0.0%

**Nine of them hold ZERO populated assist cards.** Every one of the 46 sits far below the 25%
coverage gate, which is why the corrected writer withholds them and always will.

**THE EIGHT 2015/16 LEAGUE-SEASONS ARE DELIBERATELY EXCLUDED (Lucas, 2026-09-12).** PL, LL, SA, BL,
L1, PRT, ERE and TR each already carry a row, resolved through the coverage gate on real data at
45-61% coverage, and the values look like genuine leaders , Ozil 19, Di Maria 18, Mkhitaryan 15,
Messi and Suarez 16 each, Pogba and Pjanic 12 each, Gaitan 14, Duplan 11, Sosa 12.
**Re-sourcing them spends confidence on rows that are probably already right and creates a path
for a sourcing error to overwrite a correct computed answer.** If a source contradicts one of the
eight in passing, **LOG IT IN `DATA_DEFECTS.md` AND DO NOT ACT ON IT.**

---

## 2. SOURCE AND THE TWO-READ PROTOCOL

**[REWRITTEN 2026-09-12 PM AFTER TESTING EVERY CANDIDATE. THE ORIGINAL ORDERING WAS WRONG:
WIKIPEDIA WAS APPROVED AS PRIMARY AND CARRIES THE FACT FOR 2 OF 20 CHECKED LEAGUE-SEASONS.]**

**PRIMARY: TRANSFERMARKT.** Dedicated per-league-season "Most assists" pages, reachable, complete
across all nine leagues for 2010-2015. URL shape:
`transfermarkt.com/<slug>/assistliste/wettbewerb/<code>/saison_id/<year>` (`GB1` Premier League,
`ES1` LaLiga; `saison_id` 2010 means 2010/11).

**SECOND READS, WHERE THEY EXIST:**
- **Premier League official archive , WORKS.**
  `premierleague.com/en/stats/top/players/goal-assists/<season>`, e.g. `.../2011-12`.
  **The slug is `goal-assists` with a hyphen.** `goal_assist` 404s and **`assists` silently routes
  to the GOALS table**, which is the trap recorded in `SILENT_FAILURES.md`.
- **Wikipedia , only where a "Top assists" section exists.** Verified present for **La Liga
  2010/11 and 2011/12** and absent for all five Premier League seasons, all five Serie A and all
  five Bundesliga seasons checked. **2 of 20.**

**TESTED AND REJECTED, WITH THE REASON:**
- **La Liga official archive , NO.** An Assists tab exists at
  `laliga.com/en-GB/stats/laliga-easports/assists`, but the page is pinned to the CURRENT season,
  carries **no season selector of any kind** (zero `<select>`, zero season-shaped options), and a
  season-suffixed URL returns their 404 page. **Current season only.**
- **Bundesliga official archive , NO.** It has a proper season dropdown and it lists **eight
  seasons, oldest 2019-2020**. Does not reach 2010-2014. (Reaching it also requires passing a
  consent wall whose only free path is the cookie banner; **Reject all** was taken.)
- **FBref , REJECTED, AND THIS MATTERS MORE NOW THAN IT DID.** The ~117 pre-2015 assists already
  in `player_season_cards` were themselves CCC-verified against FBref domestic-league splits, so an
  FBref-sourced winner **is not independent of the column it is correcting.** With Transfermarkt now
  PRIMARY rather than second, the second reader is the only independence in the protocol, so
  admitting FBref there would leave the whole job with no independent check at all. **The exclusion
  stands unchanged and is now load-bearing.**

**SERIE A , INCONCLUSIVE, NOT FAILED. See SS 7 for what was tried and what a patient pass needs.**

### THE HOLD RULE , NO ADJUDICATION

**Write a league-season ONLY where both reads agree on the same player AND the same number.**
Disagreement on either holds it unwritten. **The researcher does not adjudicate.** Unwritten is a
valid outcome, the same honest state `L1 2023` is deliberately left in.

## 3. WRITE SHAPE

### 3.1 DELETE BEFORE INSERT, ALWAYS, EVEN THOUGH ALL 46 ARE ADDITIONS TODAY

All 46 currently hold zero rows, so on a first clean run there is nothing to delete.
**The rule still applies unconditionally, for two reasons:** a second run of the pass would find
its own rows, and any later correction to a sourced winner hits it immediately.

**AN UPSERT CANNOT REPLACE A HOLDER.** `api_player_id` is part of the unique key, so a corrected
winner carries a different key and **INSERTS A SECOND ROW, leaving the wrong one standing** , the
league-season then shows two leaders, two pills and two cabinet entries. This is not hypothetical:
`PRT 2020` required exactly this treatment on 2026-09-12.

**Per league-season: capture existing rows to a rollback file, DELETE explicitly by `id` guarded
on the full tuple (`honour_type`, `season_year`, `league_code`, `api_player_id`), then INSERT.**

### 3.2 `api_player_id` COMES FROM THE CARD, NEVER FROM THE RESEARCH

**There is no foreign key on `honours.api_player_id`** (verified: the only constraint on the table
besides the PK is `honours_one_per_award`). A wrong id inserts cleanly and silently, and an id
belonging to a different real player produces a plausible-looking false honour.

**THE RULE: resolve the sourced name against the CARDS of that one league-season, and take the id
from the card.** That reduces the candidate set from 15,316 players to one league-season's roster.

**REFUSE AMBIGUITY, DO NOT GUESS. THE WORKED EXAMPLE:**

    PL 2011/12, Blackburn: "M. Olsson" appears TWICE
      api 19319 = Martin Tony Waikwa Olsson
      api 82006 = Marcus Jonas Munuhe Olsson
    Twin brothers, both defenders, both at Blackburn that season.

**Measured across all 1,018 club-seasons in 2010-2015, that is the ONLY duplicate display name ,
one, 0.10%.** So the refusal rule is nearly free and there is no excuse for guessing. An unmatched
or ambiguous name holds the league-season and is logged.

Two further guards, since there is no foreign key: **refuse any row whose
`(api_player_id, season_year, league_code)` does not already resolve to a card**, which makes
orphans structurally impossible, and **assert the card's club is plausible for the sourced winner.**

### 3.3 THE SOURCE MARKER

    source = 'wikipedia_ccc_leader_only'

**Distinct from `wikipedia_ccc` and from `computed`, and it must be set at WRITE TIME.** Nothing in
the platform reads `honours.source` today , the three `select()` calls in `vv-core.js` fetch
`honour_type, season_year, league_code, honour_context, goals, assists, api_player_id` and never
`source` , **which is exactly why this is free to do now and expensive to retrofit later.** The
separation either exists when the rows are written or it does not exist at all.

The sourced total goes in the existing `honours.assists` column, which already carries the value
for computed rows and is already read into the honour item by `fetchHonours` (`vv-core.js:3012`).

---

## 4. PRECONDITION , THE PILL-FIT CHECK

**MUST BE RUN ON A REAL RENDERED CARD AT `--cw` 132 TWO-UP, NOT IN A HARNESS, BEFORE ANYTHING
SHIPS.** A 2026-09-12 demo measured the two-up cell inner at 60.14px with `"Top Assists, 15"`
fitting in 38.70px, **but that harness rendered the pill WITHOUT its honour mark and in the wrong
colour, and its slot figure disagrees with SS C's rendered measurement of 37.96px by 22px.**
SS C records `"Top Assists"` alone at **38.0 against a 37.96 slot**, already a rounding error from
clipping. **The harness cannot settle this. Measure the real card.**

**APPROVED FALLBACK, PRE-AGREED BY LUCAS: if the value does not fit the face pill, show it on the
uncapped surfaces only , the glance, the Wonder Tags rows, the rankings rows
(`overflow:visible`) and the `--cw` 260 grid card , and leave the face pill reading
`"Top Assists"`.**

**And the reason that is not a compromise, in Lucas's words: the contradiction lives in the stat
block, which is on the face, so the honest pairing is what matters and the value does not have to
be on the pill to achieve it.** The card showing `Top Assists` beside `ASSISTS NR` is already
honest; printing the sourced figure wherever there is room makes it *explained* as well.

Render of the pairing (David Silva, Man City, PL 2011/12, whose `assists` is genuinely NR):
`/tmp/claude-chrome-screenshots-KQUk2I/screenshot-1789229768036-82.jpg`

---

## 5. BATCH SHAPE

**One league-season per unit, 46 units.** Order: PL, LL, SA, BL, L1 first (best-documented, and
the five a reader is most likely to check), then ERE, PRT, then BPL and TR last (thinnest sources,
most likely to be held).

Per unit: two independent reads -> compare -> hold on any disagreement -> resolve
`api_player_id` against that league-season's cards -> refuse ambiguity -> stage a CSV carrying both
reads and the confidence -> dry run -> delete-if-present -> insert -> read back and assert.

**Then refresh `player_card_mv`**, because `h_top_assists` mirrors the table and rankings reads the
flag. The refresh cannot be run from Claude Code (8s statement timeout, re-confirmed 2026-09-12);
it is Lucas's lane in the SQL editor.

---

## 6. WHAT THIS JOB MAY NOT BECOME

**It is ONE fact per league-season: the name of the leader and his total.** The moment it is asked
for a second player, or a full table, or "while we are in there", it becomes the assists backfill
that was rejected , and that rejection is permanent for a structural reason recorded in
`DATA_DEFECTS.md`: **the percentile pools carry no `season_year` in any of their eleven
`PARTITION BY` clauses, so every era-bounded fill is a partial fill of every pool.**

---

## 7. SERIE A , INCONCLUSIVE, SO THE NEXT ATTEMPT DOES NOT START FROM ZERO

**NOT "no assists". NOT verified either. Recorded as UNRESOLVED on purpose.**

**WHAT IS ESTABLISHED AND IS GOOD NEWS:** `legaseriea.it` has by far the deepest season archive of
any official site tested , **27 seasons, back to 2000/2001**, comfortably covering 2010-2014. The
English host is `en.legaseriea.it` and the stats path is `/serie-a/statistiche`, with a Players
view at `/serie-a/statistiche/giocatori`.

**WHAT WAS TRIED, SO IT IS NOT REPEATED:**
1. `legaseriea.it/en/serie-a/statistics` , redirects to the homepage.
2. Found the real link by reading the site's own nav: `/serie-a/statistiche`.
3. Cookie banner , **Reject** taken (it reappears per host, so expect it again on `en.` pages).
4. Opened the season dropdown: 27 seasons confirmed, 2000/2001 to 2026/2027.
5. Clicked `2011/2012`, then switched to the **Players** view.
6. Checked the **General** and **Passes** tabs for an assists column.

**WHERE IT STALLED, AND THE TWO PROBLEMS ARE SEPARABLE:**
- **The season reset to the current one when the Clubs/Players toggle was used.** So the tab and
  the season are not independent in the order they were driven. **Set the view FIRST, then the
  season**, and re-read the rendered season label before trusting anything.
- **No assists column was found, but the tables expose no `<th>` to read and the body text
  contained zero occurrences of "assist".** That is as consistent with an extraction failure as
  with the data being absent, and **it must not be recorded as absence.**

**THE ONE SHORT ATTEMPT WAS MADE, 2026-09-12 PM. RESULT: NO IDENTIFIABLE ASSISTS COLUMN.**
- **The ordering fix WORKED** , setting the view (Players) BEFORE the tab stopped the reset, and
  Attack and Passes now switch cleanly. That part of the earlier failure is solved and recorded.
- **Attack columns:** GP, G, PKA, C, CT, HC, ASP, GD, SRC, INT, RFG, FAT, TS, PT.
  **Passes columns:** GP, CT, HC, ASP, GD, SRC, INT, RFG, FAT, TS, PT, GOB, SOT, UCC.
- **None is labelled as assists, there is NO legend or glossary on the page, the headers are not
  `th` elements so they expose no `title`, and hovering a column code produces no tooltip.**
- **`ASP` and `GD` are the only plausible candidates and BOTH WERE REFUSED.** Guessing an
  abbreviation is exactly the error that produced "Assistant referees" as an assists table and
  Drogba on 33 assists. **A column is not an assists column until the source says so.**

**CONCLUSION: Serie A joins the ONE-READ group.** Its five league-seasons take
`transfermarkt_leader_only_unverified` if phase 2 ever runs. The deep archive is real and is not
the problem; the metric simply is not published in a form that can be read with confidence.

**IF SOMEONE RETURNS TO IT ANYWAY, THIS IS WHAT IS LEFT TO TRY:**
- Drive the UI in the order **Players -> Attack/Passes tab -> season**, screenshotting after each
  step rather than reading the DOM, since the DOM read returned nothing on a page that was visibly
  rendering data.
- If assists are genuinely absent from the official site, Serie A joins the one-read group and its
  five league-seasons take `transfermarkt_leader_only_unverified`.
- **Do not spend more than one short session on it.** Five league-seasons are at stake and the
  fallback is already defined.

---

## 8. PHASE 1 RESULT , THE HOLD RATE, MEASURED 2026-09-12

**7 league-seasons had two reads available. 2 agreed. 5 held. HOLD RATE 71.4%.**

    league-season   Transfermarkt          second read                        verdict
    PL 2010/11      Nani 17                PL official: Nani 14               HOLD, number
    PL 2011/12      David Silva 15         PL official: David Silva 15        WRITTEN
    PL 2012/13      Hazard 12, Mata 12     PL official: Mata 12 (Hazard 11)   HOLD, leader set
    PL 2013/14      Suarez 13, Gerrard 13  PL official: Gerrard 13 (Suarez 12) HOLD, leader set
    PL 2014/15      Cesc Fabregas 18       PL official: Cesc Fabregas 18      WRITTEN
    LL 2010/11      Messi 21               Wikipedia: Ozil 18, Messi 18       HOLD, player+number
    LL 2011/12      Messi 19               Wikipedia: Ozil 17                 HOLD, player+number

**WRITTEN: 2 rows, `source = 'sourced_leader_only_verified'`, ids 635 and 636. honours 620 -> 622.**

**THE PATTERN IN THE DISAGREEMENTS IS SYSTEMATIC, NOT RANDOM, AND THAT IS THE FINDING.**
Transfermarkt's totals run **equal or higher, never lower**: Nani 17 against 14, Messi 21 against
18, Ozil 19 against 18, Suarez 13 against 12, Hazard 12 against 11. **Two of the five holds are
caused purely by Transfermarkt crediting ONE more assist to the runner-up**, which promotes him
into a tie that the official source does not have. **The leader is usually right; the count is
usually higher.**

**SO THE DEFINITIONAL SEAM PREDICTED IN SS 2 IS REAL AND IT SHOWED UP ON THE FIRST CHECK**, exactly
as Lucas said it would. It is not a transcription problem and it will not be fixed by better
reading , the two sources are counting different things, and where a single extra credited assist
creates a tie, the two sources disagree about **who led the league**.

