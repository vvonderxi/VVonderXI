-- STEP 7 , ONLY after the anon-key verification in step 6 passes.
-- Until this runs, player_card_mv_old is a complete, indexed rollback: swap the two names
-- back and the site is exactly as it was.
DROP MATERIALIZED VIEW public.player_card_mv_old;
-- The old indexes go with it, which frees the canonical names.
ALTER INDEX idx_mvn_rt RENAME TO idx_mv_rt;
ALTER INDEX idx_mvn_league RENAME TO idx_mv_league;
ALTER INDEX idx_mvn_pos RENAME TO idx_mv_pos;
ALTER INDEX idx_mvn_era RENAME TO idx_mv_era;
ALTER INDEX idx_mvn_name_norm RENAME TO idx_mv_name_norm;
ALTER INDEX idx_mvn_team_norm RENAME TO idx_mv_team_norm;
ALTER INDEX idx_mvn_api_player RENAME TO idx_mv_api_player;
ALTER INDEX idx_mvn_card_id RENAME TO idx_mv_card_id;
