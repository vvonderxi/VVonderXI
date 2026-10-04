-- SITTING 2 , MATVIEW REBUILD. Run in the Supabase SQL editor, one block.
-- 87 columns become 88: shirt_number_source is appended.
set statement_timeout = '600s';

drop materialized view player_card_mv;

create materialized view player_card_mv as
 select card_id, player_id, api_player_id, player_name, nationality, date_of_birth, is_retired, is_legacy, legacy_tier, season, season_year, league_code, league_name, league_flag, league_strength_weight, team_name, primary_colour, secondary_colour, accent_colour, position, age, appearances, minutes, goals, assists, output, adj_output, rating, rt, shots_total, shots_on, passes_total, passes_key, passes_accuracy, dribbles_attempts, dribbles_success, tackles_total, tackles_blocks, interceptions, duels_total, duels_won, estimated_market_value, season_age, position_pool, shirt_number, player_name_norm, team_name_norm, def90, defvol_pct, team_def90, def_share, def_share_pct, def90_pool_pct, duel_rate, duel_quality_pct, starts, goals_conceded, saves, penalties_scored, penalties_missed, penalties_saved, fouls_drawn, fouls_committed, cards_yellow, cards_red, honours_json, h_ballon_dor, h_world_cup_winner, h_ucl_winner, h_league_champion, h_player_of_season, h_golden_boot, h_top_assists, h_euro_winner, h_copa_winner, stage_peak, stage_breakout, stage_the_standard, pos_row_appearances, pct_goals, pct_shots_on, pct_shots_total, pct_assists, pct_passes_key, pct_tackles_total, pct_interceptions, pct_tackles_blocks, shirt_number_source
 from player_card_view;

CREATE INDEX idx_mv_api_player ON public.player_card_mv USING btree (api_player_id);
CREATE UNIQUE INDEX idx_mv_card_id ON public.player_card_mv USING btree (card_id);
CREATE INDEX idx_mv_era ON public.player_card_mv USING btree (season_year);
CREATE INDEX idx_mv_league ON public.player_card_mv USING btree (league_code);
CREATE INDEX idx_mv_name_norm ON public.player_card_mv USING btree (player_name_norm text_pattern_ops);
CREATE INDEX idx_mv_name_trgm ON public.player_card_mv USING gin (player_name_norm gin_trgm_ops);
CREATE INDEX idx_mv_pname_trgm ON public.player_card_mv USING gin (player_name gin_trgm_ops);
CREATE INDEX idx_mv_pos ON public.player_card_mv USING btree (position_pool);
CREATE INDEX idx_mv_rt ON public.player_card_mv USING btree (rt);
CREATE INDEX idx_mv_team_norm ON public.player_card_mv USING btree (team_name_norm text_pattern_ops);
CREATE INDEX idx_mv_team_trgm ON public.player_card_mv USING gin (team_name_norm gin_trgm_ops);

grant select on player_card_mv to anon, authenticated, service_role;
