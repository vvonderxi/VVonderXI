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

**PRIMARY: Wikipedia per-season league articles**, i.e. the existing `wikipedia_ccc` lane.
**SECOND, INDEPENDENT READ: Transfermarkt** per-season league assist tables.
**TIEBREAK ONLY: the league's own archive.**

**WHY WIKIPEDIA IS PRIMARY , PRECEDENT INSIDE THIS TABLE.** 509 of 620 honour rows already come
from that lane, including **all 141 `golden_boot` rows**, which is the closest possible analogue:
per-season, per-league, domestic-only, one winner, ties possible. That lane has produced five
honour types with no recorded defect, and **the one honour type not sourced that way is precisely
the one that broke.**

**WHY NOT FBref, AND THIS IS THE DECISIVE ARGUMENT , IT IS ABOUT INDEPENDENCE, NOT QUALITY.**
The ~117 pre-2015 assists we already hold were themselves **CCC-verified against FBref
domestic-league splits** (`CLAUDE_ARCHIVE_2026-07.md`, the NR-ASSIST FILL). **So an FBref-sourced
winner would NOT be independent of the column it is correcting.** If FBref's definition diverges
from the league's own, we would be confirming our own bias and every check would pass for the
wrong reason. (`CLAUDE.md` SS C also records FBref losing its Opta feed in early 2026, which is a
second and lesser reason.)

**WHY TRANSFERMARKT SECOND.** A genuinely separate editorial chain, already the platform's source
for shirt and position, and strongest exactly where Wikipedia is thinnest , Portugal, the
Netherlands, Belgium and Turkey for 2010-2014. **SS E records the Transfermarkt SCRAPING lane
dying on a markup change at 122 of 474 cards. That failure mode does not apply here: 46 facts is
small enough to read by hand**, which sidesteps the scraper entirely rather than mitigating it.

**WHY NOT THE LEAGUE ARCHIVES AS PRIMARY.** Nine sites, nine formats, and several archives do not
reach 2010. Nine integrations for 46 facts. They are the right authority for a tiebreak and the
wrong one for the bulk.

### THE HOLD RULE , NO ADJUDICATION

**Write a league-season ONLY where both reads agree on the same player AND the same number.**
- Disagreement on the player, or on the count, means **HOLD the league-season unwritten.**
- **The researcher does not adjudicate.** A held league-season goes to the tiebreak archive; if
  that does not settle it, it stays unwritten and is logged. **Unwritten is a valid outcome and
  is the same honest state `L1 2023` is deliberately left in.**
- The source must state the **domestic league competition only**, matching what our `assists`
  column means where it is populated. A figure covering all competitions is not usable.
- Record the per-row confidence and both reads in the staged CSV, not just the winner.

### TIES ARE WRITTEN IN FULL

If the source names joint leaders, **every tied player gets a row.** `honours_one_per_award` is
`UNIQUE (honour_type, season_year, league_code, api_player_id)` and permits this by construction,
`golden_boot` already stores a tie (TR 2025/26, Shomurodov and Onuachu both on 22), and the
corrected computation writes ties in full. **Collapsing a tie is the behaviour that was fixed;
do not reintroduce it.**

---

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
