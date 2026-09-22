# SITTING 2 , PER-CLUB SHIRT NUMBERS, A TRANSFERS TABLE, AND THE HONOUR TIEBREAK. SCOPE ONLY.

Runs straight after sitting 1, back to back, because the interim state needs a view change and is
therefore skipped (`HALVED_SPLIT_BUILD_PLAN.md` SS 0.11). **Semenyo is the acceptance check: after
this sitting his Manchester City card must read 42, not 24.**

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

**THE RULE , REVISED 2026-09-22. A NUMBER IS ONLY REMOVED WHERE THERE IS EVIDENCE IT IS WRONG.**
The first version of this file said "the number squadnum found for its own club, or nothing", and
that is too strong: **it would have wiped several hundred numbers that are correct**, because
squadnum failing to re-source a club-season is not evidence about the number already there.

| population | rule |
|---|---|
| **ORIGINAL half, pre-2016** | **KEEP, always** |
| **ORIGINAL half, 2016+** | **KEEP** where this club leads by **3 or more appearances**; **BLANK** where the other club leads, or the margin is within 2 |
| **NEW half** | squadnum where it resolves, **BLANK** otherwise |

**PRE-2016 "KEEP ALWAYS" COSTS NOTHING AND IS PROVABLE, NOT A CONCESSION.** Of the 380 pre-2016
original halves, **129 carry a number and ALL 129 are in squadnum's ledger** , zero came from
anywhere else. They were read off that club's own squad page and are verified club-consistent
(SS E: 5,993 of 5,993). **The other 251 have no number today**, so there is nothing to keep or
remove. The rule is exact rather than approximately safe.

### THE REVISED COUNTS, MEASURED

**ORIGINAL halves , 827**

| | |
|---|---|
| pre-2016, KEEP | **129** (251 more have no number today) |
| 2016+, KEEP , this club leads by 3+ | **241** |
| 2016+, BLANK , the other club leads | **94** |
| 2016+, BLANK , within 2 appearances | **111** |
| **kept / blanked / never had one** | **370 / 205 / 252** |

**NEW halves , 830**

| | |
|---|---|
| club-season squadnum resolved , 174 x 68.6% | **about 119** |
| club-season squadnum held , 206 | **0** |
| never attempted, all 2016+ , 450 x 48.3% x 68.6% | **about 149** |
| **filled / blank** | **about 268 / 562** |

**TOTAL: ABOUT 638 OF 1,657 FILLED, AND ONLY 205 EXISTING NUMBERS REMOVED.** The earlier version of
this scope reached ~545 filled and would have blanked originals wholesale. **The difference is not
the estimate, it is which originals survive** , 241 correct 2016+ numbers are kept on evidence
rather than discarded for want of a re-source.

**AND THE COST OF THE TWO BLANK GROUPS IS DIFFERENT, SO BOTH ARE STATED:**
- **THE 94 WHERE THE OTHER CLUB LEADS ARE CLEARLY WORTH BLANKING.** At the measured 68% rate that
  removes roughly 64 wrong numbers to lose about 30 right ones.
- **THE 111 WITHIN-2 CASES ARE CLOSE TO A COIN FLIP, AND BLANKING THEM IS A JUDGEMENT, NOT A
  CORRECTION.** It removes roughly 55 wrong and 55 right. **It is defensible , a blank is honest
  about a margin that cannot decide , and it is the same trade SS D already weighs for the 841**,
  where blanking removes a correct number from two cards in three. **Recorded so nobody later reads
  those 111 as errors that were found.**

**THE THRESHOLD IS APPLIED TO A PROXY AND THAT MUST TRAVEL WITH IT.** The modal rule in
`import-positions-v2.js:128` counts **grid-positioned STARTS**; this rule compares **appearances**,
because that is what the card carries. A player with more appearances at one club and more starts
at the other is judged wrongly here. **`starts` is not the escape** , SS E records it as the wrong
field on 774 cards.

**RUN `scripts/squadnum/guard-test.js` BEFORE ANY BATCH** , the resolver's controls, which SS C says
must pass first, and which caught a false refusal the 119-pair live run did not.

---

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

**THE ACCEPTANCE CHECK IS ONE CARD: Semenyo's Manchester City half reads 42.** Aggregate coverage
is the scope's estimate and will be argued about; that card either says 42 or the sitting failed.
