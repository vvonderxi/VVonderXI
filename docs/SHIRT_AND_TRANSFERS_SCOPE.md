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

**THE RULE, as ruled: a half shows the number squadnum found FOR ITS OWN CLUB, or NOTHING. It never
inherits the season's number.** Blank means "not found", and for that club it was not found.

**TWO IMPLEMENTATIONS, AND THE SECOND IS RECOMMENDED:**
- **(a) A `CASE` in the view** , read `psc.shirt_number` when the player-season holds more than one
  card, else `COALESCE(psc.shirt_number, pp.shirt_number)`. Smallest write, most complex view.
- **(b) BACKFILL `psc.shirt_number` FOR EVERY CARD AND HAVE THE VIEW READ `psc.shirt_number` ALONE.**
  **Recommended.** The number then lives where it belongs , on the per-club row , and the
  `player_positions` join for shirt number disappears entirely, **which removes the whole class of
  bug rather than special-casing it.** Cost: a one-time write to the 36,829 cards that carry a
  number. **It is rt-neutral , `shirt_number` occurs ONCE in the viewdef, at line 346, in the final
  select list, and nowhere in the scoring region** (the same check that cleared `appearances`).
- **`player_positions` KEEPS ITS WHOLE-SEASON ROW EITHER WAY.** Re-keying it on `team_id` is the
  obvious third option and is ACTIVELY HARMFUL: item 26's detector is
  `pp.appearances > card.appearances`, which works ONLY because that row spans both clubs.
  **Splitting it would make the flag stop firing silently.**

### EXPECTED COVERAGE , MEASURED AGAINST WHAT SQUADNUM HAS ALREADY DONE

**1,657 halves** (830 new + 827 siblings; three pairs have three clubs).

| | new halves | siblings |
|---|---|---|
| total | 830 | 827 |
| pre-2016 / 2016+ | 380 / 450 | 380 / 447 |
| club-season squadnum RESOLVED | 174 | 188 |
| club-season squadnum HELD | 206 | 192 |
| never attempted (all 2016+) | 450 | 447 |

**THE PER-CARD MATCH RATE ON TRANSFER HALVES IS 68.6%, MEASURED RATHER THAN ASSUMED** , of the 188
pre-2016 siblings sitting in a club-season squadnum resolved, **129 got a number**. That is the rate
to apply, not squadnum's global 38.5% (7,928 numbers against 20,599 pre-2016 cards), which is
dragged down by club-seasons that never resolved at all.

**THE ESTIMATE, WITH ITS METHOD, SO IT CAN BE ARGUED WITH:**
- **362 halves in a RESOLVED club-season x 68.6% = about 248 numbers.**
- **398 halves in a HELD club-season = about 0.** squadnum already failed those pages , 147 "no
  squad block", 85 "no page", 121 "duplicate numbers". **197 of the 647 holds are "N blocks, held
  for adjudication" and are recoverable by hand**, so this is a floor rather than a verdict.
- **897 halves never attempted (all 2016+) x 48.3% x 68.6% = about 297.** The 48.3% is squadnum's
  own club-season resolution rate (492 resolved of 1,018 attempted) on 2010 to 2015.
- **TOTAL: ROUGHLY 545 OF 1,657 FILLED, ABOUT 33%, AND ROUGHLY 1,110 BLANK.**

**THE WEAK PART IS NAMED: the 2016+ third of that estimate applies a PRE-2016 resolution rate to a
LATER era.** Wikipedia club-season coverage improves with recency, so **297 is more likely a floor
than a ceiling, and the honest band is about 500 to 800 filled.** It will not be known until
squadnum is pointed at 2016+, which it never has been.
- **PORTUGAL IS A KNOWN CEILING AND WILL NOT MOVE: 78 PRT halves, and SS D records that pt.wikipedia
  carries season pages for THREE clubs.** Expect almost all of those blank, and do not read it as a
  pipeline failure , SS D already measured that it is the source, not the query.
- **AND SEMENYO SHOULD COME THROUGH:** Manchester City 2025/26 is exactly the kind of club-season
  that resolves. **If his card does not read 42 after this sitting, the sitting has not worked**,
  whatever the aggregate says.

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

**THE RULE TO IMPLEMENT, EXTENDED FROM THE AGREED ONE BECAUSE THE AGREED ONE DOES NOT COVER SIX
CASES:**

| honour | tie-break |
|---|---|
| `golden_boot` | **goals** |
| `top_assists` | **assists** |
| `ballon_dor`, `player_of_season` | **minutes** |
| `world_cup_winner`, `euro_winner`, `copa_winner` | **minutes** |
| `league_champion`, `ucl_winner` | **nothing , already club-joined and correct** |

**THE NATIONAL HONOURS ARE THE EXTENSION AND THE REASONING IS THAT THERE IS NO CLUB STAT TO USE.**
A Euro is not won with goals for Southampton. **So they follow the same fallback as Ballon d'Or:
the half with more minutes is the season's primary club card.** Then the deterministic chain , more
minutes, then more appearances, then the lower `team_id`.
- **HARBAOUI STILL DOES NOT MOVE.** Zulte Waregem has 6 goals against Anderlecht's 3, so the Golden
  Boot stays where it already sits. **The change is a no-op on the one case everyone will look at**,
  which is the check that the rule is right rather than a reason it did not matter.
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
