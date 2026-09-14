# SQUAD NUMBER BACKFILL , CAPTURE AND BATCH 0 (2026-09-14)

**BATCH 0 PASSED AND THE DATABASE IS BACK TO ITS BEFORE STATE.** One row inserted, the full
view read back, zero rt movers across all 57,055 cards, row deleted, absence verified.
`player_positions` is 43,659 rows with 0 NULL positions, exactly as captured.

## WHAT BATCH 0 WAS FOR, AND WHAT IT WAS NOT

It tested the SHAPE OF THE ROW, not the pipeline. The pipeline was measured separately against
the 2016/17 held-out set , 3,577 numbers we already hold and did not fetch , at **98.9%
precision**. What had no precedent was the row itself: `player_positions` holds 43,659 rows and
**not one has a NULL position**, so writing a shirt number without one had never been done.

**THE PREDICTION, read from a fresh viewdef rather than assumed:** the view defines
`pp."position" AS position_pool`, a DIRECT read with no COALESCE. Pre-2016 cards have no `pp`
row, so `position_pool` is ALREADY null; inserting a row with a null position leaves it null,
and the engine partitions on `COALESCE(pool, pos)`, unchanged. **Measured: 0 movers.** The
prediction held, and it was still worth measuring , SS C records a 351-row write that moved 137
cards nobody had touched, one of them across a public band.

## FILES

| file | what it is |
|---|---|
| `before-summary.json` | counts plus **every existing `player_positions` key**, so an accidental UPDATE is detectable |
| `before-rt.json` | rt for all 57,055 cards, the diff baseline |
| `before-pool.json` | `position_pool` for all 57,055, because that is the column the write could plausibly disturb |
| `batch0-result.json` | the canary run, kept whether it passed or failed |

**THE THREE CAPTURE FILES ARE ON DISK AND DELIBERATELY NOT IN GIT , 2.4 MB, and that follows
the precedent of `positions_2526_2026-09-11` (2.7 MB, 2 files tracked) and
`bsd_block_cleanup_2026-08-23` (1.9 MB, 2 tracked).** Only this README and `batch0-result.json`
are versioned. **THE CONSEQUENCE IS REAL AND IS STATED RATHER THAN DISCOVERED: if this working
copy is lost, the rollback baseline goes with it.** Re-capture before resuming a part-finished
backfill rather than trusting an older file, because a baseline taken after a batch is not a
baseline.

**THE CAPTURE WAS READ BACK OFF DISK AND ASSERTED ROW FOR ROW** , 57,055 rt values, 0
mismatches. A capture that was never verified is one you find out about during the rollback.

**AND THE MATVIEW SNAPSHOT IS A VALID BEFORE, VERIFIED RATHER THAN ASSUMED:** `player_card_view`
and `player_card_mv` were compared over 1,000 cards and agree exactly, so the captured matview
rt is the same baseline a live view read produces. That is what makes a single after-read enough.

## THE TARGET

**20,063 cards, 1,018 club-seasons, all pre-2016.** Post-2016 is 99.6% covered already.

Wikipedia coverage was sampled in the target era rather than carried over from 2016/17:
**2010/11 71% of clubs usable, 2012/13 86%, 2014/15 86%.**

## ROLLBACK

These are INSERTS, so rollback is a delete of an exact key set. Every batch appends the
`(api_player_id, season_year, league_code)` triples it wrote to `written.jsonl`; deleting those
triples restores this state. `before-summary.json`'s key list is the control: any key that
existed BEFORE must never appear in `written.jsonl`.

**A REFRESH IS NOT NEEDED TO UNDO AND IS NEEDED TO SHOW.** `player_positions` feeds the view
immediately and the matview only on refresh, and SS C records that the refresh cannot be run
from Claude Code , it is Lucas's lane in the Supabase SQL editor:

    set statement_timeout = '600s'; refresh materialized view player_card_mv;


---

# BATCH 1 , WRITTEN 2026-09-14. 142 ROWS, ZERO rt MOVERS.

**THE REAL YIELD IS 14.8%, AND IT IS A FLOOR RATHER THAN A HEADLINE.** 964 cards in scope
across 50 club-seasons, 143 matched, 142 written (one already had a row). The last measured
figure before this was 43.4%, from the 2016/17 pilot.

**THE DROP IS THE BATCH ORDER WORKING, NOT THE METHOD FAILING.** Batch 1 is worst-covered
first: **every club-season in it is Portuguese**, and yesterday's link-and-category check
already established that `pt.wikipedia` carries club-season pages for the big clubs only ,
`Primeira Liga de 2010-11` links to three, the category holds three. The skip list says it in
one column: **Academica, Beira-Mar, Guimaraes, Maritimo, Naval, Olhanense, Pacos Ferreira,
Portimonense, Rio Ave, Uniao de Leiria, Vitoria Setubal , all "no page".** 20 of 50
club-seasons resolved, 12 parsed.

**SO 14.8% IS THE NUMBER FOR THE WORST LEAGUE ON THE LIST AND NOT AN ESTIMATE OF THE JOB.**
Turkey measured 66.7% on tr.wikipedia and the big-five leagues have near-total en coverage.
**Quoting 14.8% as the project figure would be as wrong as quoting 43.4% was**, in the other
direction , and the honest position is that neither is known until the leagues with coverage
have run.

## WHAT WAS WRITTEN

| | |
|---|---|
| rows inserted | **142**, all `PRT` |
| `player_positions` | 43,659 -> **43,801** |
| rows with a NULL position | 0 -> **142** , the new shape, as designed |
| **rt movers, FULL read of 57,055** | **0** |
| held , no row | 78 |
| held , ambiguous | 21 |
| held , many blocks | Sporting CP 2010/11, for adjudication |
| held , duplicate numbers | 0 in this batch |

The full diff was run twice and agreed both times: `mode full compared 57055 MOVERS 0`.

## THE DIFF POLICY FROM BATCH 2

**Full on batch 1, spot after**, because batch 0 measured the row shape as inert across the
whole database and the residual risk is a WRONG NUMBER, which an rt diff cannot see at all.

**THE SPOT SET IS NOT A SAMPLE, IT IS THE THREE PLACES A RIPPLE COULD COME FROM** , see
`scripts/squadnum/diff-rt.js`: every card written in the batch; their partition neighbours,
because the engine's percentiles partition on `COALESCE(pool, pos)`; and **a FIXED global
control of 1,000 cards** spread across every league and season, which is the only one of the
three that can catch a route nobody has thought of. The control is fixed rather than re-drawn,
because a sample that changes every run can hide a persistent mover by never looking twice.

**THE TRIGGER IS ONE MOVER.** Not a threshold and not a percentage: batch 0 established the
expected value is exactly zero, so any movement means the model of this write is wrong and the
next read is the full 57,055. **A spot check without a trigger is a ritual.**
