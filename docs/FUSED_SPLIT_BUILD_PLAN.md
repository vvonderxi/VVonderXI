# SITTING 3 , THE 202 FUSED CARDS. PLAN ONLY. NOT BUILT, AWAITING LUCAS.

Scope and the original measurement: `docs/FUSED_CARDS_SCOPE.md`. **Re-measured against the live
database on 2026-09-22, after sittings 1 and 2**, and every figure holds.

**THE DEFECT: one card holds two clubs' football under one club's name.** The mirror of the halved
cards, and the population SS E could not see , its ceiling-based detector finds four, because a
fusion whose halves are both mid-table produces an ordinary appearance count.

---

## 0. RE-MEASURED, AND THE TWO POPULATIONS ARE DISJOINT

| | |
|---|---|
| fused cards | **202** , all still present |
| of which two clubs / three | **196 / 6** |
| rows the split inserts | **208** |
| **overlap with the 830 halved splits** | **ZERO** , checked on 400, none sits in a multi-card player-season |
| rt | median **39**, max **80**, **one** card at 80+, none at 85+ |
| honours landing on one | **ZERO** |
| `shirt_number_source` today | 159 `modal_single`, 43 none |
| club-seasons the new halves need a number from | **183** |

**ALL 202 NAME THEIR LARGER HALF , 202 of 202, no exceptions.** So the existing row keeps its club
and loses the other's figures; **nothing is relabelled.** **Re-check this before the run rather
than trusting this line** , one counter-example turns "reduce" into "reduce and rename".

## 1. IT IS `UPDATE` + `INSERT`, AND THAT IS WHY IT IS ITS OWN SITTING

Sitting 1 was insert-only and its rollback was a delete of exactly what it inserted. **A fused card
cannot be repaired that way: the wrong figures are on a row that already exists and is published.**

- **KEEP THE EXISTING `card_id`. DO NOT DELETE AND RE-INSERT.** It is the card URL, it keys
  `notes_cache`, and it composes `verdict_cache`'s `pair_key`. Deleting orphans every cached
  verdict and note naming it, and the orphan then occupies its key unservable , the state SS C
  records for the 194 notes orphans. **Reducing in place costs nothing and keeps all of it valid.**
- **THE CACHES THEN INVALIDATE CORRECTLY, AND ONLY BECAUSE OF THE 2026-09-19 FIX.** Changing
  minutes and goals is a VALUE change: `stats_hash` covers values so notes regenerate, and
  `payloadRev` is a KEY SET, which would have been blind. **The fourth `cache_version` segment, the
  client-derived value stamp, is what makes the verdict side regenerate too.** Without it this
  sitting would leave published prose citing figures the card no longer shows.
- **THE CONSTRAINT IS ALREADY RIGHT.** Sitting 1 left `UNIQUE (api_player_id, season, league_code,
  team_id)` in place and `import-players.js` already targets it. **Nothing schema-level is owed.**

## 2. THREE PHASES, AND THE RETRIEVAL IS SEPARATE AGAIN

**PHASE A , SQUADNUM FOR THE 183 NEW CLUB-SEASONS. Read-only, no database writes.**
Same shape as sitting 2 step 1, same reason: it reads external pages and has its own failure modes,
and tangling it into the write gives a surprise in the diff two possible causes instead of one.
**Run `scripts/squadnum/guard-test.js` first**, and expect the same rates , roughly a third of
club-seasons resolving outright, with the agreement rule recovering most multi-block pages.

**PHASE B , THE WRITE.**
1. **Fetch and re-gate each of the 202** , the gates are judged on today's answer, never replayed.
   The fused test is the INVERSE of sitting 1's G3: a fused card's minutes EQUAL the block sum, so
   **write it as its own test rather than reusing G3 with a flipped boolean.**
2. **UPDATE the existing row** to the named club's block, verbatim from the provider.
3. **INSERT the other 208**, built exactly as `import-players.js` builds a card.
4. **Set `shirt_number` and `shirt_number_source` on BOTH halves** , see section 3.
5. **Append to `split_transfers`** , the same event, the same table.

**PHASE C , THE rt DIFF**, section 5.

## 3. THE SHIRT NUMBER IS NEW WORK THAT SITTING 2 CREATED, AND IGNORING IT LEAVES A LIE

**159 of the 202 currently read `modal_single`, and that value becomes FALSE the moment the card
has a sibling.** `modal_single` means "one club that season, so no ambiguity exists" and carries
NO arrows. After the split there are two clubs and the number is the season-wide modal one, which
belongs to whichever club he started more for.

- **So every fused card's source must be RE-DERIVED, not left.** `squadnum` where phase A resolves
  it; otherwise `modal_split`, with the arrows, attributed by the same appearance margin sitting 2
  used , keep on the half leading by 3+, move to the other where it trails by 3+.
- **THE 43 WITH NO NUMBER STAY BLANK unless phase A finds one.** Blank still means "not found".
- **THIS IS THE COST OF HAVING SHIPPED SITTING 2 FIRST, AND IT IS THE RIGHT ORDER ANYWAY** , doing
  fused first would have left 202 cards needing the same treatment retro-fitted.

## 4. THE HONOUR TIEBREAK NEEDS NOTHING , IT IS ALREADY AUTOMATIC

**Zero honours land on a fused season today**, so there is nothing to fix. **And if one did, the
view now handles it**: sitting 2's `DISTINCT ON` keeps one card per honour per player-season-league
for the four performance honours, and it is keyed on the data, not on a card list. **A card
appearing where none was before is handled by construction.**
- **World Cup, Euro and Copa still land on both halves, deliberately** , career status and national
  honours, not earned by either club season.

## 5. THE rt DIFF IS OWED BEFORE THE WRITE, NOT AFTER

**Every one of the 202 LOSES minutes** (sum to its own club's share) while 208 new cards enter the
pools, so scores move in both directions and the ripple reaches cards nobody touched. **The canary
measured one insert moving twelve unrelated cards across five leagues.**
- **RUN IT OFFLINE FIRST WITH `scripts/separability/rt_reimpl.js`** , 99.56% exact against stored
  rt, which SS E names as the honest instrument. Report predicted movers and **band crossings by
  name**, not counted.
- **THE VISIBLE EXPOSURE IS ALMOST NIL AND THAT IS NOT A REASON TO SKIP THE DIFF.** One card at
  rt 80, none above, median 39. **The ripple is the part that can surprise**, because it lands on
  cards that were never fused.
- **REGENERATE ALL THREE EMBEDDED SNAPSHOTS IN THE SAME PASS** , `RADAR_POOL_REF`,
  `KEEPER_SAVE_LADDER`, `scripts/figures/index-figures.json`. **None of them complains when stale**,
  and this run moves the population every one is computed over. SS E records the assists repair
  missing exactly this and costing 94.7% of cards a wrong creation spoke for three days.

## 6. BEFORE, AND THE ROLLBACK IS NOT ONE STATEMENT THIS TIME

**BEFORE** , into `migrations/fused_split_<date>/before/`: **every column of all 202 rows**, which
is the rollback and not merely a record; the rt md5 computed IN SQL with
`coalesce(rt::text,'NULL')`; row and column counts from `pg_attribute`; `pg_indexes`;
`pg_class.relacl`; a fresh `pg_get_viewdef` with its length asserted; and the band populations.

**ROLLBACK, IN THIS ORDER:**
1. **Delete the 208 inserted rows** by the ledger's ids.
2. **Restore the 202 updated rows** column for column from the before-capture.
3. **Refresh** and assert the rt md5 returns.

**IT IS A FULL-ROW RESTORE, NOT A DELETE, AND BOTH HALVES HAVE TO BE PROVEN.** Sitting 2's rollback
was one statement because the view could simply be reverted; **this one changes DATA and there is
no equivalent shortcut.** Say so plainly rather than let the last sitting's ease set the
expectation.

## 6.5 THE CANARY , ONE CARD, WRITTEN AND ROLLED BACK, BEFORE THE OTHER 201

**The rollback here is a full-row restore and NOT one statement, so it is proven rather than
described.** Sitting 1's canary existed because an insert-only rollback still had to be shown
working; this one has more to show, because it must put a MODIFIED row back exactly as it was.

1. **Pick one fused card, two clubs, with a `def_share` and a scored rt** , so the reduction has
   something visible to move. Not the rt-80 card; a median one.
2. **Capture every column of it**, verified on disk.
3. **UPDATE it to the named club's block, INSERT the other**, ledger both.
4. **Report both card ids and stop** , Lucas reads the pair, as he did Semenyo.
5. **Roll back: delete the inserted row, restore the captured row column for column, and assert
   the rt md5 returns to its before value.** A column-by-column comparison, not a row count , a
   restore that writes the right number of rows with one wrong value passes a count and fails the
   thing the capture exists for.
6. **Only then the other 201.**

**THE REFRESH IS LUCAS'S LANE BOTH TIMES**, so the canary costs two refreshes. At 10 to 13 seconds
and with production serving `coming-soon`, that is not a reason to skip it.

## 7. WHAT STOPS IT

- Any card that does not name its largest half , the relabel case, measured at zero, re-checked.
- A restored row that does not match its capture column for column.
- The rt md5 failing to return on rollback.
- **A band crossing on a card that is neither fused nor in a pool that gained one** , that would
  mean something other than this change moved.
- **Any figure that cannot be reproduced from the ledger plus the before-capture.**

## 8. WHAT IS NOT IN THIS SITTING

- **The on-card and playbook copy** , queued separately, and it must land BEFORE or WITH this,
  because sitting 2 already made two on-card sentences false and this sitting adds a third case.
- The AI payload (sitting 4), which reads `split_transfers` and will pick these rows up for free.
