-- player_card_mv , DEFINITION AND INDEXES AS THEY STOOD BEFORE THE 2026-09-04 SWAP
-- Captured 2026-09-04T20:28:37.882Z from pg_matviews.definition and pg_indexes.indexdef.
-- Definition body asserted at 1144 chars; index block asserted at 672 chars.
-- 65 columns, 8 indexes. (column count from pg_attribute , information_schema.columns is BLIND to matviews)
--
-- THIS FILE IS THE ROLLBACK for the swap to the 71-column matview.
-- To revert: DROP MATERIALIZED VIEW player_card_mv; then run the CREATE below, then the
-- 8 CREATE INDEX statements, then REFRESH MATERIALIZED VIEW player_card_mv.
-- The pre-swap matview is ALSO kept live as player_card_mv_old, so the faster revert is a
-- rename swap back; this file exists in case that object is ever dropped.
--
CREATE MATERIALIZED VIEW public.player_card_mv AS
 SELECT card_id,
    player_id,
    api_player_id,
    player_name,
    nationality,
    date_of_birth,
    is_retired,
    is_legacy,
    legacy_tier,
    season,
    season_year,
    league_code,
    league_name,
    league_flag,
    league_strength_weight,
    team_name,
    primary_colour,
    secondary_colour,
    accent_colour,
    "position",
    age,
    appearances,
    minutes,
    goals,
    assists,
    output,
    adj_output,
    rating,
    rt,
    shots_total,
    shots_on,
    passes_total,
    passes_key,
    passes_accuracy,
    dribbles_attempts,
    dribbles_success,
    tackles_total,
    tackles_blocks,
    interceptions,
    duels_total,
    duels_won,
    estimated_market_value,
    season_age,
    position_pool,
    shirt_number,
    player_name_norm,
    team_name_norm,
    def90,
    defvol_pct,
    team_def90,
    def_share,
    def_share_pct,
    def90_pool_pct,
    duel_rate,
    duel_quality_pct,
    starts,
    goals_conceded,
    saves,
    penalties_scored,
    penalties_missed,
    penalties_saved,
    fouls_drawn,
    fouls_committed,
    cards_yellow,
    cards_red
   FROM player_card_view;;

-- indexes (8)
CREATE INDEX idx_mv_api_player ON public.player_card_mv USING btree (api_player_id);
CREATE UNIQUE INDEX idx_mv_card_id ON public.player_card_mv USING btree (card_id);
CREATE INDEX idx_mv_era ON public.player_card_mv USING btree (season_year);
CREATE INDEX idx_mv_league ON public.player_card_mv USING btree (league_code);
CREATE INDEX idx_mv_name_norm ON public.player_card_mv USING btree (player_name_norm text_pattern_ops);
CREATE INDEX idx_mv_pos ON public.player_card_mv USING btree (position_pool);
CREATE INDEX idx_mv_rt ON public.player_card_mv USING btree (rt);
CREATE INDEX idx_mv_team_norm ON public.player_card_mv USING btree (team_name_norm text_pattern_ops);
