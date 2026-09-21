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

**THE RULE, as ruled:**
- **The `h_*` flag goes on the half with more MINUTES**, so filters, rankings and the Cabinet
  count the award exactly once. **Deterministic tie-break, because this case is a knife-edge:**
  more minutes, then more appearances, then the lower `team_id`. Harbaoui is **Anderlecht 551**
  against **Zulte Waregem 540** , an eleven-minute margin, so **the flag MOVES off the card that
  carries it today.** That is the rule working, and it must be stated in the run record rather
  than discovered later.
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

**AND THE FLAG LANDS ON THE WORSE HALF , SAY IT BEFORE THE RUN, NOT AFTER.** Zulte Waregem is
**540 minutes and 6 goals**; Anderlecht is **551 minutes and 3 goals**. The minutes tie-break
therefore puts the Golden Boot on the card showing **three**, by an eleven-minute margin. That is
the ruled rule working exactly as written, and it is the kind of outcome that reads as a bug to
anyone who meets it cold. **It is one card and it is the only one**, so it is a decision to take
with open eyes rather than a reason to re-open the rule.

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
