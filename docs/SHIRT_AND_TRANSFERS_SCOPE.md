# SITTING 2 , PER-CLUB SHIRT NUMBERS, A TRANSFERS TABLE, AND THE HONOUR TIEBREAK. SCOPE ONLY.

Runs straight after sitting 1, back to back, because the interim state needs a view change and is
therefore skipped (`HALVED_SPLIT_BUILD_PLAN.md` SS 0.11). **Semenyo is the acceptance check: after
this sitting his Manchester City card reads 42 with NO arrows, and his Bournemouth card still reads 24.**

---

## 0. IT DOES NOT NEED A MATVIEW REBUILD , THE LARGEST THING IN THIS SCOPE

**`shirt_number` IS ALREADY AN ENUMERATED COLUMN ON `player_card_mv`** , line 45 of a 1,591-char
definition that is a flat `SELECT <86 columns> FROM player_card_view`. So **changing what the view
puts IN that column is a view edit plus a PLAIN REFRESH**, not a DROP and CREATE.
- **That is SS D's `player_name_norm` distinction exactly: changing a VALUE is cheap, appending a
  COLUMN is the sitting.** The 2026-09-19 rebuild took 42 seconds and a full index rebuild; a plain
  refresh is the 10 to 13 seconds Lucas has been measuring all week.
- **THE NEW COLUMN GOES ON THE BASE TABLE, NOT THE MATVIEW.** `player_season_cards.shirt_number` is
  new; nothing on the matview changes shape. **A base-table column is invisible to the matview until
  the view selects it**, which is the same trap SS C records in reverse.
- **SO THE ONLY THING HANDED TO THE SQL EDITOR IS `refresh materialized view player_card_mv`.**
  The view edit goes through `exec_sql` like every other view change, from a FRESH `pg_get_viewdef`,
  captured to a timestamped file first.

---

## 1. `shirt_number` ON THE CARD ROW

**THE IMPLEMENTATION IS (b) , `psc.shirt_number` BACKFILLED FOR EVERY CARD, AND THE VIEW READS IT
ALONE.** The number lives on the per-club row and the `player_positions` join for it disappears,
**which removes the class of bug rather than special-casing it.** rt-neutral: `shirt_number` occurs
once in the viewdef, at line 346, in the final select list and nowhere in the scoring region.
**`player_positions` keeps its whole-season row** , re-keying it on `team_id` is the obvious third
option and is ACTIVELY HARMFUL, because item 26's detector works ONLY while that row spans both
clubs.

### (b) FREEZES THE SITE ON TODAY'S NUMBERS UNLESS EVERY WRITER MOVES WITH IT

**Once the view reads `psc.shirt_number` alone, anything still writing to `player_positions` is
improving a column nobody reads.** The next squadnum run would report thousands of numbers written
and change nothing on screen , **a silent no-op that looks like a successful job**, which is this
file's most-recorded failure shape. **The census, taken 2026-09-22:**

| writer | what it writes | after (b) |
|---|---|---|
| **`scripts/import/import-positions-v2.js:132`** | the MODAL number across a whole league-season | **fix AT SOURCE, below** |
| **`scripts/squadnum/backfill.js:244`** | the club-scoped sourced number | **redirect to the card row** |
| `scripts/squadnum/batch0-canary.js:58` | one canary row | redirect with it |
| `write_positions.js:49`, `write_positions2.js:84`, `write_positions3.js:70`, `cm_bug_fill.js:82` | pp rows with `shirt_number` explicitly NULL | **no change** , position-only, and all four use `ignoreDuplicates`, so none can overwrite a number |

- **`import-positions.js` (v1) DOES NOT WRITE `shirt_number` AT ALL** , checked, not assumed.
- **SQUADNUM'S REDIRECT IS NEARLY FREE, BECAUSE IT WAS ALWAYS CARD-SHAPED.** Its ledger already
  carries `card_id` per row (`backfill.js:172`); it wrote to `player_positions` only because that
  is where the column lived. **Writing to `player_season_cards` by `id` is a SMALLER change than
  what it does today** , it removes the reason its existence-check needed pagination at all.
- **AND THE IMPORTER CAN BE FIXED AT SOURCE, WHICH RETIRES THE DEFECT FOR EVERY FUTURE IMPORT.** It
  aggregates `agg[pl.id].numbers` across the league-season, and **`team` is in scope in that same
  loop**. **Key the aggregation by `(player, team)`** and the modal number becomes club-specific by
  construction, written to that club's card, with no attribution rule needed. **Without this the
  importer must simply STOP writing the number**, because a season-wide modal value has no card to
  belong to.

### THE ATTRIBUTION RULE , REVISED 2026-09-22. A NUMBER IS MOVED OR MARKED, NOT DISCARDED

| population | rule |
|---|---|
| **ORIGINAL, pre-2016** | **KEEP, always** , sourced |
| **ORIGINAL, 2016+, leads by 3+ appearances** | **KEEP**, marked inferred |
| **ORIGINAL, 2016+, within 2 appearances** | **KEEP**, marked inferred |
| **ORIGINAL, 2016+, other club leads by 3+** | **MOVE the number to the new half** |
| **NEW half** | squadnum where it resolves; else the moved number where there is one; else blank |

**PRE-2016 "KEEP ALWAYS" IS EXACT, NOT APPROXIMATELY SAFE.** Of 380 pre-2016 originals, **129 carry
a number and ALL 129 are in squadnum's ledger** , zero from anywhere else. The other **251 have no
number today**, so there is nothing to keep or remove.

**THE TWO CHANGES ARE BOTH ABOUT NOT THROWING EVIDENCE AWAY:**
- **THE 94 ARE MOVED, NOT BLANKED.** The margin that says the number is not the original's says, by
  the same evidence, that it IS the other club's. **Blanking used half the finding and discarded
  the other half.**
- **THE 111 WITHIN 2 ARE KEPT WITH THE ARROWS** , item 26's own ruling, applied where I had failed
  to apply it. **Blank means "not found"; blanking these would claim we found nothing when we found
  a number we cannot place**, which is weaker and less true than what the arrows already say.

### THE REVISED COUNTS, MEASURED

**ORIGINAL halves , 827**

| | | arrows |
|---|---|---|
| sourced, pre-2016 squadnum | **129** | no |
| inferred, leads by 3+ | **241** | **yes** |
| inferred, within 2 | **111** | **yes** |
| number MOVED to the new half | **94** | , |
| no number today | **252** | , |
| **carrying a number** | **481** | |

**NEW halves , 830**

| | | arrows |
|---|---|---|
| squadnum sourced (estimate) | **about 268** | no |
| moved numbers landing where squadnum finds nothing | **about 63** of the 94 | **yes** |
| **carrying a number / blank** | **about 331 / 499** | |

**TOTAL , 1,657 HALVES: ABOUT 812 CARRY A NUMBER , 397 VERIFIED WITHOUT ARROWS, 415 INFERRED WITH
THEM , AND ABOUT 845 BLANK.** Against 638 under the previous rule and 545 under the first.
**Only 94 numbers leave a card at all, and every one lands on its sibling.**
- **Two of the 94 come from a three-club season**; the number goes to the half with the most
  appearances and the third card stays blank.
- **PRECEDENCE IS EXPLICIT: `squadnum` BEATS a moved or modal number.** About 31 of the 94 land on
  a new half squadnum is expected to resolve anyway, and there the sourced value wins and the
  arrows come off.

### PROVENANCE , STORED BESIDE THE NUMBER, AND THE ARROWS READ IT

**THE WORD IS "SOURCED", NEVER "VERIFIED" , RULED 2026-09-22, AND IT IS A CLAIM ABOUT EVIDENCE.**
These numbers come from Wikipedia squad and appearance tables, club-scoped and cross-checked
against each other where a page carries more than one. **That is sourcing, not confirmation.**
Nobody has put them to the club, and the pages are edited by volunteers , the same reason SS F
records that an assist total is a judgement by a scout rather than a fact with one answer.
- **THE STORED VALUE STAYS `squadnum`**, which names WHERE the number came from and claims nothing
  about its truth. That is why the column records a source rather than a confidence.
- **NO CARD TEXT, TOOLTIP OR DOCUMENT MAY CALL THESE NUMBERS VERIFIED.** If a word is needed in
  copy, it is **sourced**. **This is not pedantry: "verified" is the word that would let a later
  session treat a squadnum number as beating a disagreeing external source**, which inverts SS E's
  rule that a disagreement with our own data is not evidence the source is wrong.

**`player_season_cards.shirt_number_source`, four values, each a FACT rather than a judgement:**

| value | meaning | arrows |
|---|---|---|
| `squadnum` | read off that club's own squad and appearance tables, club-scoped and cross-checked | **NO** |
| `modal_single` | the modal number, and the player-season holds ONE card, so no club ambiguity exists | **NO** |
| `modal_split` | the modal number attributed across a split by the appearance margin | **YES** |
| `null` | no number | nothing to qualify |

- **THIS IS WHAT REMOVES THE CONTRADICTION: a sourced 42 under arrows saying it may be the other
  club's is FALSE.** The arrows must describe the number beneath them.
- **ITEM 26'S TRIGGER BECOMES A READ RATHER THAN A DETECTOR.** Today `numberClubUncertain` derives
  uncertainty from `pp.appearances > card.appearances` at a gap of 3, 2016+. **After this sitting
  it reads `shirt_number_source === 'modal_split'`** , resolved once, at write time, with the
  evidence in hand, rather than re-derived on every render from the column this sitting retires.
- **THE PARTIAL-SEASON NOTE IS UNAFFECTED AND STAYS ON ALL OF THEM.** It is about the figures and
  the score, not the number. **Only the shirt-number line is gated on provenance.**
- **`modal_single` IS NOT A FORMALITY** , it keeps the arrows off the ~36,000 cards that were never
  split, without special-casing them in the renderer.

**SEMENYO, TRACED THROUGH THE RULE:** Manchester City 2025/26 and Bournemouth 2025/26 are both
club-seasons squadnum should resolve, so **both halves land `squadnum`: City 42 with NO arrows,
Bournemouth 24 with NO arrows.** If squadnum fails Bournemouth, that half falls to `modal_split` at
24 WITH arrows , a weaker pass, **to be reported as one rather than counted as success.**

## 2. A TRANSFERS TABLE FOR THE 830 SPLITS

**Only the relevant rows. Not the whole export.** `transfers.csv` holds 151,557 deduped rows and is
gitignored; a clone has the manifests and no CSVs, so **the data has to live in the database for
sitting 4 to read it at runtime.**

**FEASIBILITY, MEASURED: 800 OF 827 PAIRS (96.7%) HAVE A TRANSFER ROW NAMING BOTH CLUBS WITH A
MID-SEASON DATE.** 26 have no row naming both, 1 falls outside the December-January-February window.
- **MATCH STRICTLY, ON BOTH CLUBS AND THE WINDOW.** A loose match , either club, any date in the
  season , returns 99.0% and is WRONG: it picks up Grifo's July move and Essugo's August move to a
  different league. **The looser number is the more flattering one, which is why it is recorded
  here as rejected rather than left out.**
- **MOST OF THESE ARE LOANS, WHICH CHANGES THE COPY: Loan 430, N/A 133, Free 57, Transfer 25,
  Swap 7, and a tail of fees.** "Moved to" is wrong for the majority. Sitting 4's prose must say
  "joined on loan" where the type says so, and the table must carry the type for it to.
- **SHAPE:** `(api_player_id, season_year, league_code, from_club, to_club, transfer_date,
  transfer_type)`, one row per split. **No matview impact** , sitting 4 reads it directly.
- **`transfer_type` IS NOT OPTIONAL AND IS NOT DECORATION , IT IS 430 OF 800 ROWS.** Without it
  sitting 4 writes "moved to Manchester City" for a majority of cards where the truth is "joined on
  loan", and a loan back to a parent club reads as a transfer that never happened. **Carry the
  provider's own string rather than a derived label** , the vocabulary is Loan, Free, Transfer,
  Swap, N/A and a tail of fees, and collapsing it now loses the fee, which is the one part nobody
  can reconstruct later.
- **DIRECTION IS RESOLVED BY NAME, against each half's `team_name`.** The 26 unmatched pairs carry
  no direction and no date; **they get a club name and nothing else, rather than a guess.**

---

## 3. THE HONOUR TIEBREAK , CONFIRMED BY QUERY, AND IT IS SIX CASES, NOT ONE

**Harbaoui double-counts: `h_golden_boot` is TRUE on both halves** , card 178133 Zulte Waregem
(540m, 6g) and card 187764 Anderlecht (551m, 3g). **The agreed tiebreak was never implemented**, and
a Golden Boot filter lists him twice.

**AND THE FIRST QUERY UNDER-COUNTED, BECAUSE IT TESTED SIX FLAGS AND THE MATVIEW CARRIES NINE.**
Across all nine `h_*` columns there are **SIX** double-counted pairs:

| flag | pairs | |
|---|---|---|
| `h_world_cup_winner` | 2 | Llorente 2020 SA, Fernando Torres 2010 PL |
| `h_copa_winner` | 2 | Pinilla 2016 SA, Orellana 2016 LL |
| `h_euro_winner` | 1 | José Fonte 2016 PL |
| `h_golden_boot` | 1 | Harbaoui 2017 BPL |

**THE MECHANISM, READ OFF A FRESH VIEWDEF RATHER THAN INFERRED , `hon_rows` IS THREE UNIONED LEGS:**
- **'team' leg** joins `honours` on NORMALISED CLUB NAME + season + league, for `league_champion`
  and `ucl_winner`. **Club-scoped, so it lands on the right half by construction** , which is why
  58 split pairs carry an honour and only six double-count.
- **'player' leg** joins on `(api_player_id, season_year)` with **NO CLUB**, for everything except
  `world_cup_winner`. **That is the double-count**, and it covers `golden_boot`, `top_assists`,
  `ballon_dor`, `player_of_season`, `euro_winner` and `copa_winner`.
- **'career' leg** joins `world_cup_winner` on player with `psc3.season_year >= h.season_year`, no
  club. Also double-counts.

**THE RULE TO IMPLEMENT , RULED 2026-09-22, AND IT IS NARROWER THAN THE VERSION THIS FILE FIRST
CARRIED. ONLY PERFORMANCE HONOURS ARE TOUCHED.**

| honour | what it is | tie-break |
|---|---|---|
| `golden_boot` | earned by the season's performance | **goals** |
| `top_assists` | earned by the season's performance | **assists** |
| `player_of_season`, `ballon_dor` | earned by the season's performance | **minutes** |
| `world_cup_winner` | **career status** | **NOTHING , leave on both halves** |
| `euro_winner`, `copa_winner` | won with the NATIONAL TEAM | **NOTHING , leave on both halves** |
| `league_champion`, `ucl_winner` | club honour, already club-joined | nothing , already correct |

**SO THE VIEW CHANGE TOUCHES FOUR HONOUR TYPES AND, ON TODAY'S DATA, EXACTLY ONE CARD PAIR.**
Harbaoui's Golden Boot is the only performance honour sitting on a split season. The other five
double-counts are left alone **on purpose**, and the reason is different for each group:
- **WORLD CUP IS CAREER STATUS AND THE VIEW ALREADY TREATS IT THAT WAY.** The 'career' leg attaches
  it to EVERY card from the winning season onward, so a winner holds it on dozens of cards already.
  **Both halves carrying it is consistent with that, not an exception to it** , Torres 2010 and
  Llorente 2020 are correct as they stand.
- **EURO AND COPA ARE WON WITH THE NATIONAL TEAM, SO NO CLUB STAT CAN ARBITRATE THEM.** This file
  previously proposed a MINUTES tiebreak for them and that was wrong: **it would pick a club at
  random and present the result as a finding.** Fonte's Euro was not won at West Ham rather than
  Southampton. Leaving it on both halves says something true; picking one says something false.
- **THE DISTINCTION IS "WAS THIS EARNED BY THIS CLUB SEASON", NOT "IS THIS INDIVIDUAL".** Both
  groups are individual; only one is a property of the football on the card.

- **IT IS A VIEW EDIT INSIDE `hon_rows`, AND THE OUTPUT COLUMN LIST DOES NOT CHANGE** , so
  `CREATE OR REPLACE VIEW` accepts it. **Capture `pg_get_viewdef` to a timestamped file first**, and
  assert its length on the way back in; SS C records this view being silently destroyed once.

---

## 4. BEFORE, ROLLBACK, AND WHAT IS HANDED OVER

**BEFORE** , into `migrations/shirt_transfers_2026-09-22/before/`: the rt md5 computed IN SQL with
`coalesce(rt::text,'NULL')`; row and column counts from `pg_attribute`; `pg_indexes`; the grants
from `pg_class.relacl`; **the full `pg_get_viewdef` with its length asserted**; the band populations
(12 / 138 / 500 / 766 as of sitting 1); and **every `shirt_number` currently on the matview**, since
that is the value being replaced.

**ROLLBACK, AND THE ORDER IS NOT SYMMETRIC:** restore the view from the captured definition FIRST,
then null the new column, then refresh. **The view is what makes the column visible**, so reversing
that order leaves a window where the site reads a column that is being emptied underneath it.
- **The honour edit and the shirt-number edit are ONE view replacement**, so they roll back together
  and cannot be reverted independently. **If that is not wanted, they are two sittings, not one.**

**HANDED TO LUCAS: `set statement_timeout = '600s'; refresh materialized view player_card_mv;`** ,
a plain refresh, not a rebuild, so 10 to 13 seconds rather than 42.

**THE ACCEPTANCE CHECK IS ONE PAIR: Semenyo's Manchester City half reads 42 with NO ARROWS, and his Bournemouth half still reads 24.** Aggregate coverage is an estimate and will be argued about; that pair either reads 42 and 24 clean, or the sitting failed.
