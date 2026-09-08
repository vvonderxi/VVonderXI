# sig = def_share_pct , DEFENDER ENGINE FIX (2026-09-08)

**PREPARED AND VERIFIED. NOT APPLIED.** The DDL below has not run against the database; the
apply step was blocked and needs a human to execute it. Everything else in the change , the
docs, the disclosure, the cache measurements , is committed.

## WHAT IT DOES

    was:  sig = 0.55*def_share_pct + 0.45*COALESCE(duel_quality_pct, def_share_pct)
    now:  sig = def_share_pct

One expression, in the `pool_sig` CTE. `duel_quality_pct` and `duel_rate` REMAIN on the view
and matview as inspection columns , they stop being engine terms, they do not stop existing.

## FILES

    capture_2026-09-08T18-44-54.sql   the view AS IT WAS, captured before any edit.
                                      17,231 bytes, verified on disk and non-empty, and
                                      verified to contain the engine (WITH scored AS,
                                      percent_rank, rt_new). THIS IS THE ROLLBACK.
    01_sig_def_share_only.sql         the new definition. Built FROM the capture by a single
                                      string replacement asserted to match exactly once,
                                      17,166 bytes. Single statement. No column added,
                                      removed or reordered, so CREATE OR REPLACE is legal.

## HOW TO APPLY , Terminal A, Node with the service key

    node -e "require('dotenv').config();const {createClient}=require('@supabase/supabase-js');
      const fs=require('fs');
      const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
      const sql=fs.readFileSync('migrations/sig_def_share_2026-09-08/01_sig_def_share_only.sql','utf8');
      sb.rpc('exec_sql',{sql}).then(r=>console.log(r.error||'applied'));"

THEN, AND ONLY THEN, refresh the matview:

    refresh materialized view player_card_mv;

`REFRESH` is correct here , NOT `DROP + CREATE`. No column changes, so the matview's frozen
column list is untouched and its grants are not at risk. It takes ACCESS EXCLUSIVE and rebuilds
11 indexes (8 btree + the 3 GIN restored the same day). `REFRESH CONCURRENTLY` is available
(the UNIQUE `idx_mv_card_id` exists) and avoids the lock at the cost of being slower.

## VERIFY AFTER APPLYING , DO NOT SKIP

1. Read the view back and assert `pool_pct_1.def_share_pct AS sig` is present and the
   `0.45::double precision * COALESCE` blend is gone.
2. Assert the viewdef length is non-trivial (~17,166). SEC C: `CREATE OR REPLACE VIEW` has
   SILENTLY DESTROYED this view's body before, and the site keeps looking healthy afterwards.
   A body under ~2,000 chars means it is damaged, not that the architecture is different.
3. Snapshot rt for ALL 57,055 cards and diff against `/tmp/rt_before.json` (taken before the
   edit, 57,055 rows, 53,994 with a non-null rt). SEC C: a target-only snapshot cannot see a
   ripple, so diff everything, not the cards predicted to move.

## WHAT THE DIFF SHOULD SHOW , SIMULATED AGAINST THE LIVE VIEW BEFORE THE EDIT

    10,770 of 50,269 scored outfield cards move (21.4%), median 2 points, max +7 / -7
    CB 61.1% | FB 58.2% | CDM 50.9% | CM 39.7% | CAM 5.9% | Winger 4.9% | ST 2.1%
    anchors UNCHANGED: b95 119.91, b90 98.89, b85 85.58
    BAND CROSSINGS: ZERO of 50,269
    highest card that moves at all: rt 71 -> 72. Nothing above 71 moves.

**IF THE DIFF DISAGREES WITH ANY OF THAT, STOP AND ROLL BACK** using the capture file. The
simulation used the view's own CTE chain, so a disagreement means the apply did something the
simulation did not.

## ROLLBACK

    CREATE OR REPLACE VIEW public.player_card_view AS <contents of capture_...sql>;
    refresh materialized view player_card_mv;

## CACHES , MEASURED, NOT ASSUMED

    verdict_cache   106 rows, 1 touches a mover (0.9%)
    notes_cache     350 rows, 23 on a mover (6.6%)

Both invalidate themselves: `notes_cache` hashes the payload (which carries rt) and
`verdict_cache` stamps rt_a/rt_b. No manual purge is needed and none should be done.

**RADAR_POOL_REF IS UNTOUCHED AND DOES NOT NEED REGENERATING** , confirmed by reading
`scripts/gen-radar-ref.js`: it selects goals, shots_on, passes_key, assists, dribbles_success,
passes_total, tackles_total, interceptions and duels_won. No `rt`, no `sig`, no `def_share`.
