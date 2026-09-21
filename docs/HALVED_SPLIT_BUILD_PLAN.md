# HALVED CARDS , THE SPLIT SITTING. PLAN ONLY. NOT BUILT, NOT RUN, AWAITING LUCAS.

**Scope, counts and the rt measurements: `docs/HALVED_CARDS_SCOPE.md`.** This file is the
sitting: what is captured before, what is written, what stops it, and how it comes back.
**Shape borrowed from `migrations/matview_sitting_2026-09-15/`, which ran cleanly on 2026-09-19.**

**THE DECISION: ONE CARD PER CLUB.** A player who moved inside a league gets a card for each
club, each scored on its own football. Measured: 73 existing cards move, **zero band crossings**,
and the originals do not move at all.

---

## 0. THE INDIVIDUAL-HONOUR QUESTION IS ONE ROW, COUNTED

**Every honour row was checked against every split season: exactly ONE individual honour lands on
one.** Hamdi Harbaoui, Golden Boot, Belgian Pro League 2017. Zero team or career honours land on a
split season, because a team honour carries its club and joins to the right half by construction.

**AND THE DATA ALREADY KNEW.** That honour row reads
`team_name: "Anderlecht & Zulte Waregem"`, `honour_context: "split season between two clubs"` ,
the only compound club name in all 804 honour rows.

**IT IS ALSO THE CASE THAT PROVES WHY SPLIT IS WORTH DOING.** Today the card is Zulte Waregem
alone: **540 minutes, 6 goals, and `h_golden_boot` true.** The league's top scorer, on a card
showing six goals.

**THE RULE, as RE-RULED 2026-09-21. THE FLAG GOES ON THE HALF THAT WON THE AWARD, MEASURED BY THE
STAT THE AWARD IS FOR:**

| honour | tie-break stat |
|---|---|
| `golden_boot` | **goals** |
| `top_assists` | **assists** |
| `player_of_season`, `ballon_dor` | **minutes** (no single stat defines them) |

- **Then, always, the same deterministic chain: more minutes, then more appearances, then the lower
  `team_id`.** So the award stat decides it and the chain only ever breaks an exact tie.
- **MINUTES ALONE WAS THE FIRST RULE AND IT WAS WRONG, AND THE CASE THAT SHOWS IT IS THE ONLY CASE
  WE HAVE.** Harbaoui is **Zulte Waregem 540 minutes and 6 goals** against **Anderlecht 551 and 3**.
  Under minutes the Golden Boot lands on the half showing **three goals**, by an eleven-minute
  margin. Under goals it stays on the six. **A scoring award settled by availability is a tie-break
  that contradicts the thing being awarded.**
- **CONSEQUENCE: THE FLAG DOES NOT MOVE AT ALL.** It sits on Zulte Waregem today and stays there,
  so this rule change makes the one live case a no-op rather than a visible edit. **That is the
  check that it is right, not a reason it did not matter** , the minutes rule would have moved it.
- **The season-total line names the honour**, since it shows the combined output that won it.
- **Team honours need nothing.**

**ONE CAVEAT THAT MUST TRAVEL WITH THIS CASE, because the numbers will not agree on screen.** The
honour row records **22 goals**; the provider's league blocks for that season sum to **9**
(Zulte Waregem 6 + Anderlecht 3), so the season-total line will read 17 appearances and 9 goals
beside a Golden Boot won with 22. **Do not "fix" this by summing across competitions** , SS E is
explicit that a card is one league. State it, or the single most scrutinised card on the platform
contradicts itself.
- **NO MECHANISM IS CLAIMED FOR THE SHORTFALL, AND AN EARLIER DRAFT OF THIS LINE CLAIMED ONE THAT
  IS FALSE.** It read "Belgian play-off rounds sit outside the league id". **Measured 2026-09-21:
  they are normally INSIDE it** , Cuypers 2022 carries 39 appearances under league 144 and
  Tresoldi 2025 carries 40. The provider's own league-144 block for this player-season is simply
  short, and **the card reproduces it exactly**. Full measurement and the three other Belgian
  cases in the punchlist item; they are not this sitting's business.

## 0.5 THE DRY RUN , 833 OF 1,740, RUN 2026-09-21, NOTHING WRITTEN

`scripts/halved-dryrun.js`, read-only. Per-row detail in `scripts/figures/halved-dryrun.jsonl`,
counts in `halved-dryrun.json`. **Every figure below is reproducible from that ledger rather than
by re-running 1,740 provider calls.**

| outcome | cards | |
|---|---|---|
| **WRITE** | **833** | 836 rows, 3 candidates missing two clubs |
| never played for the other club | 447 + 156 | 447 return one team; 156 return a second with no football |
| **already correctly fused** | **202** | the card already equals the sum , see below |
| provider repeats ONE total under BOTH clubs | 48 | 45 identical in every field, so unsplittable |
| card matches neither a block nor the sum | 39 | stale against the provider; held |
| missing block has zero appearances | 10 | |
| no block for our league id | 5 | |

**833 IS 47.9%, NOT THE TWO THIRDS THE SCOPE SAMPLED, AND THE SAMPLE IS WHAT WAS WRONG.** The 15
of 18 came from cards the `pos_row` detector had ALREADY identified as halved , a set selected by
the same property being tested, which is the validation-set rule in SS C almost word for word.
**The 1,740 are everyone who moved mid-season inside a league, most of whom simply did not play
twice.** 47.9% is the honest rate and the attrition is fully accounted for: every bucket above is
a correct skip, not a failure.

**TWO THINGS THE DRY RUN FOUND THAT THIS PLAN DID NOT ANTICIPATE, BOTH LUCAS'S CALL:**
1. **[RULED , ITS OWN SITTING, NEXT, BEFORE THE FLIP. SCOPED AFTER THIS ONE LANDS.] 202 cards are
   ALREADY FUSED** , one card holding two clubs' football under one club's name. SS E records
   **four**, from a ceiling-based detector, and says in terms that a fusion whose halves are both
   mid-table is invisible to it. This measured them from the provider instead, which is the
   instrument SS E said did not exist. **This sitting does not touch them**: splitting a fused card
   is an UPDATE or a DELETE, which breaks the insert-only rollback the whole plan rests on, and
   mixing the two would leave one rollback covering two different operations.
2. **[RULED , HELD. THE WRITE SET IS 828, NOT 833.] 5 WRITE candidates name a club that is not
   the block their minutes match** , Belec 2017 says Sampdoria and matches Benevento; also
   Marafona, Crivelli, Thiam, Amilton. Writing the other half would leave a mislabelled card
   beside a new correct one. **They are a sixth gate, `G5_card_club_disagrees`**, and they are
   held rather than skipped silently: each is a card that is wrong in some other way, and the
   ledger names all five.

**AND 357 OF THE 836 ROWS FALL UNDER THE 300-MINUTE FLOOR, SO THEY CARRY NR RATHER THAN A SCORE.
THAT IS A NEAR-DOUBLING OF THE PREDICTED RATE, NOT A CONFIRMATION OF IT , 42.7% AGAINST THE SCOPE'S
ROUGHLY 26%** (about 450 of ~1,700).
- **THE ABSOLUTE COUNT WENT DOWN AND THE RATE WENT UP, WHICH IS HOW THIS GOT MISREAD ONCE ALREADY.**
  357 is fewer cards than 450, so at a glance the prediction looks met. **The population fell from
  ~1,700 to 836 and the sub-floor halves did not fall with it** , the gates removed full seasons and
  fused cards, which are the ones that were never near the floor. **Quote the RATE for a prediction
  about a rate; an absolute count over a changed denominator is a different quantity.**

## 0.6 THE CANARY , SEMENYO, WRITTEN AND MEASURED 2026-09-21

`scripts/halved-canary.js`, record in `migrations/halved_split_canary_2026-09-21/`. **Card 130281
Bournemouth keeps 20a/1798m/10g; new card 187598 Manchester City carries 17a/1402m/7g/1as at rt 71.**

**THREE THINGS IT ESTABLISHED THAT THE PLAN DID NOT KNOW:**

1. **DROPPING THE CONSTRAINT BREAKS `import-players.js` UNTIL ITS `onConflict` IS CHANGED.** Line
   632 upserts with `onConflict:'api_player_id,season,league_code'`, and PostgREST resolves that
   against a REAL unique index. With the index gone the next import run **errors** , loud rather
   than silent, which is the good failure mode, and it is still a break. **The sitting must change
   that line in the same commit as the constraint.** The canary restores the old constraint, so
   nothing is left broken by it.
2. **ONE INSERT MOVED TWELVE OTHER CARDS, EVERY ONE BY EXACTLY 1, AND NONE CROSSED A BAND.**
   Measured by joining the live view to the STALE matview, which is a free before-snapshot until
   the refresh runs. The movers are **Rodri, Munetsi, Kike Barja, Ezzalzouli, Machis, Laporte
   2016, Depaoli, Vagnoman, Osako, Joosten, Sylla, Tresor** , five leagues and nine seasons, from
   a Manchester City card. **That is SS E's ingestion rule 4 rendered on one row: the percentile
   pools carry no league and no season, so a card added anywhere moves cards everywhere.** The
   PL 2025 Winger pool went 52 to 53 and the ripple left the league entirely.
3. **`player_season_cards.rt` IS A DEAD COLUMN AND IT ALMOST PRODUCED A FALSE ALARM.** The stored
   value on the Bournemouth card is **84** while the view computes **80**, and the matview served
   80 before the insert too , so the split moved that card by NOTHING and the 84 is the importer's
   own `ratingToRt` guess, which the engine has never read. **`psc.rt`, `psc_1.rt` and `\.rt\b`
   occur ZERO times in a 21,846-character viewdef.** The new half is therefore written with
   `rt: null` rather than a manufactured number.

**AND THE ITEM 26 MARK REMAINS CORRECT ON BOTH HALVES AFTER A SPLIT, which is worth knowing
before anyone reads it as a bug.** The detector is `pp.appearances > card.appearances` and the
`player_positions` row still covers the whole season, so it fires on 20 and on 17 alike. The
shirt number is still the season's and still ambiguous, and the partial-season note becomes more
true rather than less.

## 0.7 THREE THINGS THE SITTING MUST CARRY, ADDED AFTER THE CANARY (2026-09-21)

**1. `import-players.js` LINE 632 CHANGES IN THE SAME COMMIT AS THE CONSTRAINT.** Its upsert names
`onConflict:'api_player_id,season,league_code'` and PostgREST resolves that against a real unique
index; with the index gone the next run errors. **It becomes
`onConflict:'api_player_id,season,league_code,team_id'`** , which is also the CORRECT target once
cards are per club, so this is the importer catching up with the schema rather than a workaround.
**Nothing is scheduled** , both `.github/workflows` files are `workflow_dispatch` only, there is no
Vercel cron and no systemd timer touching the repo , so the window is a manual button press, and
the canary restored the old constraint rather than leaving one open overnight.
- **AND THAT WORKFLOW HAS ITS OWN DEFECT, LOGGED NOT FIXED: `import-players.yml` ASSIGNS `CMD`
  TWICE**, so the second line overwrites the first and the job named "Bulk Player Import" runs
  `import-positions-v2.js` and never `import-players.js` at all. **Do not rest a safety argument on
  that** , it is a bug, and someone fixing it restores the exposure this note describes.

**2. `player_season_cards.rt` IS A DEAD COLUMN HOLDING PLAUSIBLE WRONG VALUES , LOGGED, NOT THIS
SITTING.** It reads **84** on Semenyo's Bournemouth card where the engine computes **80**, because
it is the importer's `ratingToRt` guess and `psc.rt` occurs ZERO times in a 21,846-character
viewdef. **A dead column with believable numbers is the next false alarm waiting to happen** , it
is the exact shape SS C records for `goals_conceded` zero-filled on outfielders and for `starts`
exceeding `appearances`: present, wrong, and indistinguishable from a real value at the point of
use. It nearly produced one during the canary, and only the stale matview settled it. **Whoever
opens it decides one of: drop the column, null it, or make it a true snapshot of `rt_new`.**

**3. THE AI MUST KNOW THE CARD IS ONE CLUB'S SHARE , THROUGH THE PAYLOAD, NEVER THE PROMPT.**
A split season is the most interesting thing on the card and the Verdict, Story and notes are
currently blind to it.
- **THE MECHANISM IS ALREADY IN THE FILE AND MUST BE COPIED EXACTLY: EMIT THE KEY ONLY WHEN IT
  APPLIES.** `vvAIStats` emits `not_recorded_basics` **only while assists is null**, so the key set
  moves for the affected cards and for nobody else. A `transfer` key emitted unconditionally, even
  as `null`, changes EVERY card's key set and regenerates the whole platform. **Conditional
  emission is the difference between 828 regenerations and 57,055.**
- **WHY NOT THE PROMPT: `PROMPT_REV` IS SHARED WITH `NOTES_VERSION`**, so a prompt edit to explain
  transfers discards every cached note as collateral , and **item 25 still forbids a prompt edit
  until the marking measurement is retaken.** A payload change rides `payloadRev` and `stats_hash`,
  which are per card.
- **WHAT IS FREE AND WHAT NEEDS STORAGE, SO THE SCOPE IS NOT OPTIMISTIC.** The OTHER CLUB is free:
  after the split the sibling row is `(api_player_id, season, league_code)` with a different
  `team_id`, and the card page already loads the player's seasons. **The DIRECTION and the DATE are
  not in the database at all** , they live in the BAM `transfers.csv`, which is gitignored, so a
  clone cannot read them at runtime. **Saying "moved to Manchester City in January" requires storing
  the transfer record; saying "shared with Manchester City" does not.** Do not scope the first as
  though it were the second.
- **AND THE COPY MUST NOT SAY "TWO COMPETITIONS"** , SS E records that a cross-competition fusion
  cannot exist in this data, and that wording was proposed once and would have been false on every
  card it rendered on.

## 0.8 THE FOUR SITTINGS, IN ORDER, ALL BEFORE THE FLIP (agreed 2026-09-21)

1. **HALVED SPLIT , 828.** This file. Changes the constraint and **leaves it changed.**
2. **`shirt_number` ON THE CARD ROW, plus a small table holding the transfer rows for those 828**
   , date, direction, both clubs. **Only the relevant rows, never the whole BAM export.**
3. **THE 202 FUSED CARDS** , `docs/FUSED_CARDS_SCOPE.md`. Inherits the constraint from 1.
4. **THE AI PAYLOAD FOR SPLIT CARDS**, using sitting 2's transfer data.

**SITTING 2 IS WHAT MAKES 4 POSSIBLE AND IT IS WHY IT SITS SECOND:** SS 0.7 records that the other
club is free from the sibling row but **the DIRECTION and the DATE are in no table** , they live
in the gitignored `transfers.csv`. Sitting 2 is the sitting that gives them somewhere to live.

## 0.9 EVERY WRITE PATH INTO `player_season_cards` , THE CENSUS, AND ONE OF THEM FAILS SILENTLY

**THE CONSTRAINT CHANGE BREAKS MORE THAN LINE 632, AND THE SECOND ONE IS THE DANGEROUS KIND.**
Census taken 2026-09-21 over every `.js`, `.html`, `.yml` and `.sql` in the tree.

| path | verb | after the constraint change |
|---|---|---|
| `scripts/import/import-players.js:631` | `upsert`, `onConflict:'api_player_id,season,league_code'` | **ERRORS, loudly.** Fix: add `,team_id` |
| `scripts/enrichment/gk_pen_backfill.js:254` | `update` filtered `.eq(api_player_id).eq(season).eq(league_code)` | **WRITES BOTH HALVES, SILENTLY.** Fix: add `.eq('team_id', ...)` or key on `id` |
| `scripts/enrichment/write_assists_ccc.js:63` | `update ... .eq('id', cid)` | safe , keyed by row id |
| `scripts/halved-canary.js` and the sitting's own writer | `insert` / `delete` by `id` | safe |
| `migrations/**/*.sql` | historical `update`/`delete`, already applied | not re-runnable |
| `schema.sql:309-310` | RLS policies permitting service insert/update | not a writer |

**`gk_pen_backfill.js` IS THE ONE TO FIX FIRST, BECAUSE IT IS THE ONE THAT WILL NOT TELL YOU.** Its
filter is the OLD unique key written out as three `.eq()` calls, so after the split it matches BOTH
cards of a split player-season and writes one club's keeper and penalty figures onto both. **And
its own assertion cannot catch it: the comment above says "0 rows means the card is not in our
table", so it tests for ZERO and a two-row update passes.** That is SS C's rule exactly , a guard
is only evidence inside its own scope, and this one's scope was "did anything match", never "did
exactly one thing match".

**AND NEITHER CI WORKFLOW ACTUALLY RUNS WHAT ITS NAME SAYS, WHICH IS WHY THE CENSUS HAD TO BE A
GREP AND NOT A READ OF THE WORKFLOWS:**
- **`import-players.yml` assigned `CMD` twice**, so the job named "Bulk Player Import" ran
  `import-positions-v2.js` and never `import-players.js`. **`cd80460` dutifully updated BOTH
  invocations when the importers moved out of `api/`** , which is how a dead line survives a
  refactor: it still looks maintained. **FIXED 2026-09-21.**
- **`seed-supabase.yml` runs `node api/seed-from-html.js`, which `06c884d` DELETED.** The workflow
  is dead and still listed. **Logged, not touched** , deleting a workflow is Lucas's call.

**AND FIXING THE `CMD` BUG WAS NOT COSMETIC: THAT BUG WAS THE ONLY THING KEEPING A THIRD DEFECT
HARMLESS.** The workflow invoked `import-players.js` with **no `--insert-only`**, and SS E is
explicit that the default write is an upsert that rewrites rows and shifts existing rt. **So
repairing the double assignment on its own would have armed a one-button rewrite of ~57,000 cards.**
The rewritten workflow therefore makes the job an explicit CHOICE, **defaults `insert_only` to
true**, wires the `dry_run` input that was being offered and discarded, and keeps `positions` as
the default job so pressing the button still does exactly what it did yesterday.

## 0.10 THE NEW HALF CARRIES NO SHIRT NUMBER , MEASURED, AND THE ANSWER SPLITS BY ERA

**The canary showed it: Semenyo's Manchester City card rendered #24, his Bournemouth number. His
City number is 42.** Both halves read one number from one `player_positions` row.

**MEASURED OVER THE 828, AND THE TWO ERAS HAVE DIFFERENT ANSWERS FOR DIFFERENT REASONS:**

| | cards | whose number is it |
|---|---|---|
| **pre-2016** | **380** | **the ORIGINAL half's, BY CONSTRUCTION** |
| **2016+** | **448** | the **MODAL** number across the season |

- **PRE-2016 IS NOT A STATISTIC, IT IS A PROPERTY.** Those rows exist only because
  `scripts/squadnum/` created them (SS E: 5,993 rows carrying only a shirt number), and that
  pipeline resolves a squad page **for the club the card names** and is verified **5,993 of 5,993
  club-consistent**. So the number is the original half's and the new half genuinely has none.
  **129 of the 380 are named explicitly in `written.jsonl`.**
- **2016+ IS THE MODAL NUMBER, read out of `import-positions-v2.js:128-129`** , the most frequent
  number across grid-positioned starts in that league-season. **It therefore belongs to whichever
  club he started more matches for, which is not the same thing as the club the card names.**
  Measured by appearances: **original 278 (62.1%), the MISSING half 142 (31.7%), undecidable 28.**
- **SO OVERALL IT IS THE ORIGINAL ON ROUGHLY 658 OF 828, ABOUT 79%** , which supports the ruling:
  **the new half carries NO number until sitting 2 lands. Blank means "not found", and for that
  club it genuinely was not found.**
- **AND THE INVERSION MATTERS MORE THAN THE HEADLINE: ON THOSE 142 CARDS THE NUMBER ON THE
  EXISTING CARD IS ALREADY THE OTHER CLUB'S.** The split does not create that error, it exposes
  it, and blanking the new half does not fix it. **Item 26's mark is what covers those**, and it
  stays until sitting 2 supplies a real per-club number.
- **THE LIMIT ON THE 2016+ FIGURE, STATED RATHER THAN GLOSSED: APPEARANCES ARE A PROXY FOR
  GRID-POSITIONED STARTS.** The modal rule counts lineup entries carrying a `grid`; I compared
  block `appearances`. A player with more appearances at one club and more STARTS at the other is
  counted wrongly here. **And the margin is thin: the median difference is 6 appearances, but 112
  of the 448 sit within 2** , near a coin flip, where the modal rule is weak evidence either way.

## 1. THE TWO GUARDS, BOTH MECHANICAL

**GUARD A , AN EMPTY DEFENSIVE SHARE STOPS THE WRITE.** `def_share` is derived in the view from
each club's team totals, so a correctly written half gets its own. A half written with a wrong
`team_id` gets NOTHING, and the dry run shows exactly what that looks like: **Rose 61 to 21,
Ballo-Toure 64 to 38** , a collapsed defender that reads as a scoring bug, not a data one.
**After the refresh and before the sitting is declared done: every newly written half must have a
non-null `def_share`, or that half is deleted and the run stops.** Outfield only; keepers have no
defensive share by design.

**GUARD B , THE NR QUERIES, ALREADY CONFIRMED CLEAN (2026-09-21).** About 450 halves arrive under
the 300-minute floor and carry a null rt, so `ORDER BY rt DESC` would put them FIRST (SS C).
Audited before the plan was written:

| | |
|---|---|
| `index.html:793`, `card.html:4222`, `compare.html` x3 | `nullsFirst:false` present |
| **`vv-core.js:6020`** | applies `nullsFirst:false` to **any** sort column, so rankings is covered whatever the reader picks |
| **`vv-core.js:6037`** | adds `card_id` as a unique tiebreak , the `range()` pagination rule SS C requires, already satisfied |
| `scripts/enrichment/pull_8084.js:53` | **no guard, and it ships nothing** , an enrichment read. Left, named here |

**Re-run this grep as step 1 of the sitting**, because the guarantee is about the tree on the day,
not about this table.

## 2. BEFORE , THE SNAPSHOT, CAPTURED FIRST AND VERIFIED ON DISK

Into `migrations/halved_split_<date>/before/`:
1. **`rt` for every card**: `card_id, rt` for all 57,055, plus the md5 of the pair list computed
   IN SQL with `coalesce(rt::text,'NULL')` , not in JS, where a null interpolates as lowercase
   "null" and produces a different hash for identical data (the 2026-09-19 trap).
2. **The constraint definition**, from `pg_constraint`, verbatim.
3. **Row count, column count (`pg_attribute`), index list (`pg_indexes`), grants (`pg_class.relacl`)**
   , `information_schema` is blind to matviews and answers 0 rather than erroring.
4. **A fresh `pg_get_viewdef`** of `player_card_view`, with its length asserted.
5. **The three embedded snapshots as they stand**: `RADAR_POOL_REF`, `KEEPER_SAVE_LADDER`,
   `scripts/figures/index-figures.json`.
6. **Band populations** , the anchor-pinned 12 / 150 / 650 / 138, so a change in WHO occupies
   them is visible without arguing about the counts.

## 3. THE WRITE , INSERT ONLY, ONE CALL PER CARD, LEDGER PER ROW

0. **RESOLVE THE MISSING CLUB TO A `teams` ROW BY NAME, AND REFUSE TO CREATE ONE.** This is a
   precondition the first draft of this plan did not name. **`teams.api_team_id` is NULL on all
   337 rows** (measured 2026-09-21), so the provider's `team.id` cannot reach ours and the only
   link is the club NAME. SS C records name matching as the exact mechanism that split seven
   Premier League clubs into two `teams` rows in 25/26. **A missing block whose club name does
   not match an existing row is HELD, never inserted** , creating the team row would fragment the
   club, and the damage would surface later as Guard A's null `def_share`. The dry run reports
   how many rows clear this before the sitting starts.
1. **Constraint change**, in the SQL editor: drop `UNIQUE (api_player_id, season, league_code)`,
   add `UNIQUE (api_player_id, season, league_code, team_id)`. **No column is added** , the table
   already carries `team_id`, `league_id` and `team_name`. **Note `player_card_mv` does NOT expose
   `team_id`** (87 columns, none of them it), so anything that needs the club id reads
   `player_season_cards`, which is the write target anyway.
2. **Per candidate card** (~1,740, one provider call each, ~1,740 calls against a 75,000/day
   allowance): fetch, filter to the league id, **dedupe blocks by `team.id`**, then apply the six
   gates from the scope. **Anything that fails a gate is logged and skipped, never guessed.**
3. **INSERT the missing half only.** No existing row is updated, which is what makes the rollback
   a delete of exactly what was inserted , the same argument the squad-number backfill rests on,
   and the same reason its guard had to be paginated.
4. **Append-only ledger**, `written.jsonl`: the new `card_id`, the key, the source block, the
   minutes and goals written, and the provider payload's own timestamp. **A bad write is then
   findable per row rather than by re-running the job.**
5. **Refresh the matview in the SQL editor** , it exceeds the service role's 8s statement timeout
   and cannot go through `exec_sql`.

## 4. AFTER , IN THIS ORDER

1. **Guard A**, above. Any half with a null `def_share` is deleted and the run stops.
2. **Diff rt for all 57,055** against the before-snapshot: expect the originals unchanged, a few
   hundred movers by percentile pressure, and **band crossings reported by name** rather than
   counted. The dry run says zero on 19; a real run of ~1,700 will not be zero, and the record
   must say which cards and by how much.
3. **Regenerate all three embedded snapshots in the SAME pass** , `RADAR_POOL_REF`, the keeper
   ladder, the index figures. **None of them complains when it is stale**, and this run changes
   the population every one of them is computed over.
4. **Item 26's mark becomes unnecessary for every card that was split** , each half is now true
   about its own club. The flag stays for candidates that failed a gate.
5. **Re-run the rt-dependent QA items**, and re-read any published figure that counts seasons.

## 5. ROLLBACK , ORDER MATTERS AND IT IS NOT SYMMETRIC

1. **Delete exactly the rows in the ledger**, by `card_id`.
2. **Then** restore the old constraint. **In that order:** the old unique constraint cannot be
   re-added while a split pair exists, so a rollback that tries the constraint first fails and
   leaves the tree half-way.
3. **Refresh the matview** (SQL editor) and assert the rt md5 matches the before-snapshot,
   computed the same way in SQL.
4. Restore the three snapshots from `before/`.

## 6. WHAT STOPS THE SITTING

- Any newly written half with a null `def_share` (Guard A).
- The rt diff showing a band crossing on a card that is neither split nor in a pool that gained
  one , that would mean something other than this change moved.
- The provider returning a different block shape than the gates expect, on more than a handful.
- **Any figure that cannot be reproduced from the ledger.** The run record is the ledger plus the
  before-snapshot; anything asserted beyond them is a claim.

## 7. WHEN

**Before the production-branch flip, as its own sitting, not inside launch week** , agreed
2026-09-21. After the flip these are published numbers and the verdict and notes caches would
regenerate while people are reading.
