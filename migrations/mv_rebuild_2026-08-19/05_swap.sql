-- STEP 5 , THE SWAP. This is the only step that touches production.
-- Both renames in ONE transaction, so readers see the old object or the new one and never
-- a missing relation. The lock is held for the duration of two catalogue updates:
-- milliseconds, against the 10-30 seconds a DROP + CREATE would have cost.
BEGIN;
ALTER MATERIALIZED VIEW public.player_card_mv     RENAME TO player_card_mv_old;
ALTER MATERIALIZED VIEW public.player_card_mv_new RENAME TO player_card_mv;
COMMIT;
