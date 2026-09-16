# ASSISTS , NULL THAT MEANS ZERO. **RUN 2026-09-16.**

## RESULT

**11,015 rows written. 0 remaining in the target shape. The genuine gap of 20,025 untouched.**
`assists = 0` now stands on 15,051 rows (11,015 new plus the 4,036 written as 0 since 2023).

**rt IS UNCHANGED ON ALL 57,055 CARDS, MEASURED OVER THE FULL POPULATION RATHER THAN SPOT-CHECKED.**
An md5 of every `(card_id, rt)` pair in card order, taken from the LIVE view either side of the
write, is **byte-identical**: `88cd61c9e6d4345a51d017bc0ae021e4`, with `sum(rt)` 2,661,188 and
min/max 11/97 on both sides. Captures in `rt-fingerprint-before.json` / `-after.json`.

**AND THE METHOD IS THE PART WORTH REUSING.** Paging 57,055 rows out of the live view was not
possible , it times out at depth , and reading the MATVIEW would have measured the pre-write
state, because the matview is stale until a refresh nobody can run from here. **One SQL statement
that fingerprints the whole population inside the database has neither problem**, and an
identical md5 is a stronger claim than a row diff assembled client-side.

**TWO COLUMNS CAME BACK.** `output` and `adj_output` are `goals + assists` uncoalesced, and
`NULL + x` is `NULL`, so both were null on all 11,015 cards. Calvert-Lewin 20/21 now reads
`goals 16, assists 0, output 16, adj_output 16`.

## STILL OWED , AND BLOCKED ON A REFRESH THIS SESSION CANNOT RUN

**`RADAR_POOL_REF` and `KEEPER_SAVE_LADDER` have NOT been regenerated, deliberately.** Both
generators read `player_card_mv`, and **the matview is stale until it is refreshed** , so running
them now would write a file that looks fresh and encodes the pre-write state. That is the exact
hazard CLAUDE.md records against `gen-radar-ref.js`.

**ORDER: refresh the matview (SQL editor), THEN regenerate both snapshots.** The radar shift is
real and expected , 11,015 cards join the creation pool and every card's breakpoints move.

## THE vvindex COPY NEEDED THE REPAIR, NOT A REWRITE

It reads: *"For seasons before 2015, and for some competitions beyond Europe's principal leagues,
figures like assists were never logged at source... A player who created nothing and a player
whose creation was never counted are different players, and we will not flatten one into the
other."*

**Measured against what remains, that is now accurate: pre-2015 is 98.6% gap, Belgium 50.5%, and
the other eight leagues 3.3% to 5.4%.** Before today the platform was flattening 11,015 players
who created nothing into players whose creation was never counted , **the precise thing the copy
promises it does not do.** The sentence was aspirational and the data was wrong; the data now
matches the sentence.

---

## THE ORIGINAL SCOPING FOLLOWS

**11,015 rows.** `assists IS NULL AND passes_key IS NOT NULL` , the detailed block arrived and
said zero, and the platform has been rendering **NR** for it.

## WHAT IT MOVES, AND WHAT IT CANNOT

| | |
|---|---|
| **rt** | **NOTHING. Verified against the live viewdef, not assumed.** `assists` appears nine times in `player_card_view`; four are the `top_assists` honour string, one is the column passthrough, and **the two that reach scoring are both `COALESCE(psc_1.assists, 0)`** inside `gaw` and `gaw90`. The engine has always read NULL as zero. |
| **`output` / `adj_output`** | **FIXED, and they are broken today.** Both are `psc.goals + psc.assists` uncoalesced, and `NULL + x` is `NULL` in SQL, so **both columns are null on all 11,015 cards right now.** They are display columns computed after scoring, so correcting them changes no score. |
| **The radar** | **IT MOVES, AND THIS IS THE REASON THIS IS NOT A ONE-LINE FIX.** `radarFor`'s composite is `terms.some(t => t[0]==null) ? null : ...` , **one null term nulls the whole axis** , so `creation` is NR on these cards today and becomes a measured value. That adds 11,015 cards to the creation pool and **shifts `RADAR_POOL_REF`'s breakpoints for every card on the platform.** |

## SO THE ORDER IS FIXED

1. Run `SCOPED.sql` , it asserts **11,015** before writing and **0** after.
2. Refresh `player_card_mv` , **SQL editor's lane**, the refresh exceeds the service role's
   `statement_timeout`.
3. **Regenerate `RADAR_POOL_REF`** with `scripts/gen-radar-ref.js`, and the other two snapshots in
   the same pass. None of them complains when stale.
4. Snapshot rt before and after anyway. It **should** be unchanged on all 57,055 cards; that is a
   prediction, and the platform's own rule is that a target-only snapshot cannot see a ripple.

## WHAT IT DOES NOT TOUCH

**The genuine gap keeps its NULL: 20,025 cards** with no detail block , 16,364 pre-2015 and
3,661 from 2015 on. **NR is correct there and must stay.** A blanket `COALESCE(assists,0)` would
destroy that distinction, which is the defect this repair exists to end rather than to spread.

## THE COPY THAT GOES WITH IT

`vvindex.html` states plainly: *"assists were never logged at source. Where a number was never
recorded, we mark it NR. Not Recorded. It is not a zero."* **That sentence is false for these
11,015 cards today** , NR is standing in for exactly a zero. The copy becomes true again the
moment this runs, which is the argument for running it rather than documenting around it.
