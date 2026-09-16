# ASSISTS , NULL THAT MEANS ZERO. SCOPED, NOT RUN.

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
