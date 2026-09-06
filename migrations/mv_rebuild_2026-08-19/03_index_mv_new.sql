-- STEP 3 , the 8 indexes, mirroring the live ones exactly. NO OUTAGE.
-- Temporary idx_mvn_* names because idx_mv_* still belong to the live matview; they are
-- renamed back in step 07 once the old object is gone.
-- THE UNIQUE ONE IS NOT OPTIONAL: REFRESH MATERIALIZED VIEW CONCURRENTLY requires it, and
-- without it every future refresh takes an exclusive lock instead.
CREATE INDEX idx_mvn_rt ON public.player_card_mv_new USING btree (rt);
CREATE INDEX idx_mvn_league ON public.player_card_mv_new USING btree (league_code);
CREATE INDEX idx_mvn_pos ON public.player_card_mv_new USING btree (position_pool);
CREATE INDEX idx_mvn_era ON public.player_card_mv_new USING btree (season_year);
CREATE INDEX idx_mvn_name_norm ON public.player_card_mv_new USING btree (player_name_norm text_pattern_ops);
CREATE INDEX idx_mvn_team_norm ON public.player_card_mv_new USING btree (team_name_norm text_pattern_ops);
CREATE INDEX idx_mvn_api_player ON public.player_card_mv_new USING btree (api_player_id);
CREATE UNIQUE INDEX idx_mvn_card_id ON public.player_card_mv_new USING btree (card_id);
ANALYZE public.player_card_mv_new;
