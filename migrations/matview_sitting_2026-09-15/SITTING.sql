-- ============================================================================
-- THE MATVIEW SITTING , 2026-09-15.  RUN IN THE SUPABASE SQL EDITOR, NOT FROM
-- CLAUDE CODE: the refresh exceeds the service role's statement_timeout and
-- cannot be run through exec_sql (CLAUDE.md SS C, measured 2026-09-11).
--
-- WHAT IT DOES: adds 11 columns , 1 for the transfer flag (item 26), 8 for the
-- Proof percentiles (item 22's sibling), and 2 for the continental honours so the
-- honours FILTER can include them. 76 existing + 11 = 87.
--
-- THE COUNT HAS ALREADY BEEN WRONG ONCE, WHICH IS WHY IT IS ARITHMETIC AND NOT A
-- FIGURE. It was specified as 78 and measured as 85, because the eight percentile
-- columns come from PROOF_DIMS in card.html, which names eight distinct stats, and
-- nobody had counted that list. It is now 87 for a third passenger. DO NOT QUOTE 85.
--
-- THE THIRD PASSENGER IS A REAL BLOCKER, NOT A TIDY-UP. `euro_winner` and
-- `copa_winner` exist in HONOUR_META, carry marks, carry prose and render on cards ,
-- and they have NO h_* column, so the honours filter cannot offer them. The filter's
-- chip list now DERIVES from HONOUR_META, which means a derived list over an
-- incomplete schema would generate a chip that filters on a column that is not
-- there. They render as inert `soon` chips until these two columns land, and they go
-- live with no code change on the day they do.
--
-- THE THREE PROOF DECISIONS, AND THE REASON THEY HANG TOGETHER:
--   pool      : the 8-bucket position pool the SCORE uses, via COALESCE(pool, pos)
--   scope     : cross-league, one ladder , no league in the PARTITION BY
--   threshold : 300 minutes, matching the importer floor
-- All three match how the VV Score already works, so the Proof panel AGREES with
-- the number above it. A percentile computed on a different basis from the score
-- beside it is a second ranking wearing the same card.
--
-- COPY TRAP, ALREADY RECORDED: the copy must read "vs the position pool 2015+",
-- NEVER "in the league". These are global percentiles.
--
-- RUN THE STEPS IN ORDER AND READ EACH RESULT. Step 2 DROPS the matview, and
-- between step 2 and step 4 THE SITE SERVES NOTHING , a denied or missing
-- matview returns empty with no error. Do not stop halfway.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- STEP 0 , CAPTURE. Run first and keep the output. Nothing here changes state.
-- ---------------------------------------------------------------------------
select count(*) as existing_columns
  from pg_attribute where attrelid='player_card_mv'::regclass and attnum>0 and not attisdropped;
-- expect 76

select indexname, indexdef from pg_indexes where tablename='player_card_mv' order by indexname;
-- expect 11 rows , they are reproduced in step 4 and in before-indexes.sql

select relacl from pg_class where relname='player_card_mv';
-- expect anon, authenticated, service_role, postgres.
-- pg_class.relacl IS THE AUTHORITATIVE SOURCE , information_schema is blind to
-- matviews entirely and returns ZERO ROWS rather than erroring.


-- ---------------------------------------------------------------------------
-- STEP 1 , THE VIEW. Append-only, so it is rt-safe and reversible on its own.
-- CREATE OR REPLACE VIEW can only APPEND columns and the existing order must be
-- preserved , build this from a FRESH pg_get_viewdef, never from a repo copy.
--
-- Append these 11 expressions to the END of the select list in player_card_view:
--
--   -- item 8: the two continental honours. Same shape as the seven h_* flags the
--   -- 2026-09-04 swap added, read off the same `hon` CTE. Without them the honours
--   -- filter has no column to query and its chips stay inert.
--   COALESCE((hon.types ? 'euro_winner'), false) AS h_euro_winner,
--   COALESCE((hon.types ? 'copa_winner'), false) AS h_copa_winner,
--   -- NOTE: match the exact expression the existing seven use in a FRESH viewdef ,
--   -- the line above is the SHAPE, not a transcription. Never hand-retype engine SQL.
--
--   -- item 26: the transfer flag's input. The player_positions row is keyed at
--   -- league-season grain while the card is per club, so a row covering MORE
--   -- appearances than the card means the shirt number may belong to the club
--   -- the player left. This column carries the pp row's own appearances so the
--   -- comparison can be made; it asserts nothing by itself.
--   pp.appearances AS pos_row_appearances,
--
--   -- The eight Proof percentiles. PARTITION BY the pool the SCORE uses, and by
--   -- the qualifying flag so sub-threshold rows cannot dilute the ladder; the
--   -- CASE then nulls them, because a percentile over a 200-minute sample is
--   -- noise wearing a number. NR, never 0 , the platform's first principle.
--   CASE WHEN s.minutes >= 300 AND s.goals IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.goals IS NOT NULL)
--               ORDER BY (s.goals::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_goals,
--   CASE WHEN s.minutes >= 300 AND s.shots_on IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.shots_on IS NOT NULL)
--               ORDER BY (s.shots_on::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_shots_on,
--   CASE WHEN s.minutes >= 300 AND s.shots_total IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.shots_total IS NOT NULL)
--               ORDER BY (s.shots_total::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_shots_total,
--   CASE WHEN s.minutes >= 300 AND s.assists IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.assists IS NOT NULL)
--               ORDER BY (s.assists::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_assists,
--   CASE WHEN s.minutes >= 300 AND s.passes_key IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.passes_key IS NOT NULL)
--               ORDER BY (s.passes_key::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_passes_key,
--   CASE WHEN s.minutes >= 300 AND s.tackles_total IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.tackles_total IS NOT NULL)
--               ORDER BY (s.tackles_total::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_tackles_total,
--   CASE WHEN s.minutes >= 300 AND s.interceptions IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.interceptions IS NOT NULL)
--               ORDER BY (s.interceptions::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_interceptions,
--   CASE WHEN s.minutes >= 300 AND s.tackles_blocks IS NOT NULL
--        THEN percent_rank() OVER (
--               PARTITION BY COALESCE(s.pool, s.pos),
--                            (s.minutes >= 300 AND s.tackles_blocks IS NOT NULL)
--               ORDER BY (s.tackles_blocks::numeric / NULLIF(s.minutes,0) * 90))
--   END AS pct_tackles_blocks,
--
-- Then verify BEFORE touching the matview:
select count(*) as view_columns
  from pg_attribute where attrelid='player_card_view'::regclass and attnum>0 and not attisdropped;
-- expect 87


-- ---------------------------------------------------------------------------
-- STEP 2 , DROP. From here until step 4 completes the site has no matview.
-- ---------------------------------------------------------------------------
drop materialized view player_card_mv;


-- ---------------------------------------------------------------------------
-- STEP 3 , CREATE at 87 columns, enumerated explicitly.
-- The matview's query is FROZEN at creation, which is why every column is named
-- here rather than select * , and why adding one costs this whole sitting.
-- ---------------------------------------------------------------------------
create materialized view player_card_mv as
select
  card_id,
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
  position,
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
  cards_red,
  honours_json,
  h_ballon_dor,
  h_world_cup_winner,
  h_ucl_winner,
  h_league_champion,
  h_player_of_season,
  h_golden_boot,
  h_top_assists,
  h_euro_winner,          -- new, item 8
  h_copa_winner,          -- new, item 8
  stage_peak,
  stage_breakout,
  stage_the_standard,
  pos_row_appearances,
  pct_goals,
  pct_shots_on,
  pct_shots_total,
  pct_assists,
  pct_passes_key,
  pct_tackles_total,
  pct_interceptions,
  pct_tackles_blocks
from player_card_view;


-- ---------------------------------------------------------------------------
-- STEP 4 , INDEXES. All 11, verbatim from the capture. The three trgm indexes
-- are what keep the front-door search off a sequential scan of 57k rows; without
-- them MIN_CHARS in index.html should go back to 2, so do not skip any.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- STEP 5 , GRANTS. A missing grant renders as an EMPTY SITE with no error.
-- ---------------------------------------------------------------------------
grant select on player_card_mv to anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- STEP 6 , VERIFY. Read every one of these before declaring it done.
-- ---------------------------------------------------------------------------
select count(*) as columns_now
  from pg_attribute where attrelid='player_card_mv'::regclass and attnum>0 and not attisdropped;
-- expect 87

select count(*) as indexes_now from pg_indexes where tablename='player_card_mv';
-- expect 11

select relacl from pg_class where relname='player_card_mv';
-- expect anon, authenticated and service_role present

select count(*) as rows_now from player_card_mv;
-- expect 57055

select count(*) as pct_populated from player_card_mv where pct_goals is not null;
-- expect a large number but NOT 57055 , pre-2015, sub-300-minute and null-stat
-- rows are NR by design. A full 57055 would mean the threshold did not apply.

select count(*) as transfer_candidates
  from player_card_mv where pos_row_appearances > appearances;
-- expect roughly 841 , this is item 26's population, and it is the number that
-- says the new column actually carries what the flag needs.
