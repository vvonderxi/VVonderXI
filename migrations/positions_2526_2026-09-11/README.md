# 25/26 position corrections , 8 written, 8 held (2026-09-11)

## STATUS: THE WRITE IS APPLIED AND THE MATVIEW REFRESH IS **PENDING**.

`player_positions` carries the eight new values. **`player_card_mv` still serves the old
pools**, so no published score has moved yet and the site shows the previous answer. Until the
refresh runs, the base table and the matview disagree by design, not by accident.

**The refresh could NOT be run from Claude Code.** The recipe recorded in §C , one `exec_sql`
call carrying `set_config('statement_timeout','600000',false)` beside the refresh , was run
twice and died at **8.6s** both times on the 8s timeout. It is not that `set_config` fails: a
control proved the setting takes (the next statement in the same call reads `10min`, a separate
call reads `8s`). The refresh is killed at 8s regardless. There is no connection string in
`.env`, only REST keys, so there is no psql route either.

**To finish, in the Supabase SQL editor:**

```sql
set statement_timeout = '600s';
refresh materialized view player_card_mv;
```

## Still owed after the refresh, and NOTHING WARNS YOU

1. **Re-measure against `before.json`** , the real rt for all 57,055 cards, diffed. The
   simulation predicted 116 movers and 6 band crossings; the point of the diff is to find out
   whether `scripts/separability/pool_change_sim.js` can be trusted next time.
2. **Regenerate `RADAR_POOL_REF`** (`scripts/gen-radar-ref.js`). It reads `player_card_mv`
   DIRECTLY, so running it before the refresh writes a snapshot of the pre-write state into a
   file that looks freshly generated. **Simulated impact: negligible** , the 8 cards sit in
   reference pools of 1,196 to 9,764, medians move in the fourth decimal (CAM goalThreat/90
   median 0.1687 -> 0.1692, n 1,196 -> 1,198). Regenerate anyway: a stale embedded snapshot is
   a standing hazard, and the point is that it stops being stale.
3. **Re-measure the margin table** (`scripts/separability/gen_margin_table.js`). It descends
   from the same matview via `pull_inputs.js` -> `bootstrap_se.js`. Path B's crowning gate reads
   per-card standard errors off these scores, so a moved rt moves a margin.

Cached verdicts need no action , `rt_a`/`rt_b` stamps make a moved card a cache miss.

## What was written

Two INDEPENDENT Fable passes over all 67 unverified 25/26 cards at rt >= 80. Pass agreement
**65 of 67**. Of 15 proposed corrections, 13 survived both passes; these are the **8 that were
HIGH CONFIDENCE IN BOTH**.

| card | player | from | to |
|---|---|---|---|
| 130295 | M. Rogers | CM | CAM |
| 137022 | Vinícius Júnior | ST | Winger |
| 144072 | N. Paz | CM | CAM |
| 144141 | F. Dimarco | Winger | FB |
| 130281 | A. Semenyo | CM | Winger |
| 169344 | J. Veerman | CDM | CM |
| 137160 | Antony | CM | Winger |
| 151152 | J. Leweling | CM | Winger |

Writer: `scripts/enrichment/write_positions_2526.js`, guarded on the expected-current pool,
every row read back after the update. 8 written, 0 skipped, 0 missing, 0 failed.

## What was held, and why

Eight rows. Two where the passes DISAGREED (Kramarić CAM/ST, Dewsbury-Hall CAM/CM), five where
they agreed on a change but split on confidence (Gibbs-White, Enzo Fernández, McTominay,
Asensio, Valverde), and one low-confidence row that was a confirm anyway (Malen). Full record
with both passes' evidence lines: `research/pos2526_verified/`.

## Predicted effect, from the dry run

116 of 57,055 cards move rt; **6 band crossings**, two of them cards nobody touched (Vardy
16/17 and Alcácer 18/19, both 84 -> 85). Reclassified crossings: Nico Paz 85 -> 83 and Rogers
85 -> 82 out of World Class, Antony and Leweling 80 -> 77 out of the bands. Dimarco is the only
riser, 85 -> 87, because FB is a pool where the defensive signal is load-bearing.

## Scope, and what this does NOT fix

This is a spot correction at the top of one season. §E records the underlying defect: the
classifier **stopped emitting CAM at the 2022 boundary across all nine leagues**, so the CM pool
is structurally inflated for four seasons. Eight cards do not touch that.

## Rollback

`before.json` holds `card_id, rt, position_pool` for all 57,055 cards as of immediately before
the write. To revert, set the eight rows in the table above back to their `from` value and
refresh.
