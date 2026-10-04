# 25/26 position corrections , 8 written, 8 held (2026-09-11)

## STATUS: **COMPLETE. THE MATVIEW WAS REFRESHED ON 2026-09-12 AND ALL EIGHT ARE LIVE.**

**[CORRECTED 2026-09-12. THIS FILE SAID THE REFRESH WAS PENDING AND IT NO LONGER IS.]** The
refreshes run in Lucas's SQL editor lane that day , for the `top_assists` deletions and the four
sourced writes , carried the position batch with them. **Verified against `player_card_mv`:
`position_pool` agrees with `player_positions` on 8 of 8.** The site now serves the new pools.

**THAT IS WORTH NOTING AS A PATTERN, NOT JUST A FACT: a refresh run for one job lands every
pending write.** Nothing announces it. **After ANY matview refresh, check what else was sitting
unrefreshed** , the rt diff below was owed to a different job and would have been missed.

### THE PREDICTED-VERSUS-ACTUAL DIFF, MEASURED 2026-09-12 AGAINST `before.json`

**The simulator is trustworthy on MAGNITUDE and COUNT, and not on WHICH ripple cards move.**

    quantity              predicted (pool_change_sim.js)   actual
    cards moving rt       116                              113
    band crossings        6                                6
    pool changes          8                                8
    median |delta|        ,                                1
    max |delta|           ,                                3

**All six actual crossings, named:**

    130295  M. Rogers      Aston Villa 25/26 PL   CAM     85 -> 82   World Class -> Standout
    144072  N. Paz         Como 25/26 SA          CAM     85 -> 83   World Class -> Standout
    137160  Antony         Real Betis 25/26 LL    Winger  80 -> 77   Standout -> below
    151152  J. Leweling    VfB Stuttgart 25/26 BL Winger  80 -> 77   Standout -> below
    148260  I. Perisic     Inter 16/17 SA         Winger  84 -> 85   Standout -> World Class
    157846  A. Lacazette   Lyon 23/24 L1          ST      84 -> 85   Standout -> World Class

**THE FOUR RECLASSIFIED CROSSINGS WERE PREDICTED EXACTLY, BY CARD AND BY VALUE.** The two
UNTOUCHED ones were predicted in COUNT and in DIRECTION and **wrong in identity** , the dry run
named Vardy 16/17 and Alcacer 18/19, both 84 -> 85, and the cards that actually crossed are
**Perisic 16/17 and Lacazette 23/24**, also both 84 -> 85.

**SO THE RULE FOR THE NEXT DRY RUN: quote the simulator's COUNTS and never its NAMES for ripple
cards.** A direct effect is deterministic and it got all four right; a ripple is a percentile
re-rank among cards clustered at the same value, and which of several tied neighbours crosses is
not stable. **This is the same shape as SS C's CDM rule , predict the direction, never the
number, and here, never the card either.**

**Dimarco was predicted as the only riser at 85 -> 87 and he did not cross a band**, which is
consistent: 85 to 87 stays inside World Class.

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

## Everything owed after the refresh is DONE. Nothing here is outstanding.

1. **[DONE 2026-09-12.]** ~~Re-measure against `before.json`~~ , the real rt for all 57,055 cards,
   diffed. **113 movers, 6 band crossings, 8 pool changes.** See the table above.
2. **[DONE 2026-09-12, in `4a9c502` at 11:01.]** ~~Regenerate `RADAR_POOL_REF`~~
   (`scripts/gen-radar-ref.js`). **Impact was as predicted: negligible** , the 8 cards sit in
   reference pools of 1,196 to 9,764 and medians moved in the fourth decimal (CAM goalThreat/90
   median 0.1687 -> 0.1692, n 1,196 -> 1,198). **Re-verified that evening: regenerated into `/tmp`
   and compared to the committed block, BYTE-IDENTICAL, 5,154 characters both sides.**
3. **[DONE 2026-09-12, same commit.]** ~~Re-measure the margin table~~
   (`scripts/separability/gen_margin_table.js`). `4a9c502` carries `vv-margin.js` alongside
   `vv-core.js` and the `?v=` bump on all five shipping surfaces.

**AND A WARNING ABOUT RE-RUNNING THEM ANYWAY, because an evening draft of the handover said they
were still due and it was wrong.** The honours work that followed this batch **cannot move rt**:
on a fresh `pg_get_viewdef`, `rt_new` is fully computed by line 156, the `hon_rows` and `hon` CTEs
begin after it, and `hon` is consumed only by a `LEFT JOIN` feeding `honours_json` and the seven
`h_*` display flags. **A regeneration on that basis costs a bootstrap run and changes nothing.**
The trigger is a write that moves rt, never a refresh on its own.

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
