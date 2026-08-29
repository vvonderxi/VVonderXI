-- ════════════════════════════════════════════════════════════════════════════
-- TRIGRAM INDEXES FOR THE FRONT-DOOR LIVE SEARCH , 2026-08-29
--
-- RUN THIS IN THE SUPABASE SQL EDITOR, NOT THROUGH Claude Code.
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block, and the
-- exec_sql RPC is a plpgsql function, so its body always is one. Confirmed by
-- probe: SQLSTATE 25001. The probe left nothing behind.
--
-- The extension is ALREADY INSTALLED (pg_trgm 1.6, 2026-08-29). Only the three
-- indexes remain.
--
-- RUN THE THREE STATEMENTS ONE AT A TIME. If the editor wraps a multi-statement
-- paste in a transaction, CONCURRENTLY fails with the same 25001.
--
-- DO NOT RUN WHILE A BACKFILL IS IN FLIGHT.
-- ════════════════════════════════════════════════════════════════════════════

create index concurrently if not exists idx_mv_pname_trgm
  on player_card_mv using gin (player_name_norm gin_trgm_ops);

create index concurrently if not exists idx_mv_tname_trgm
  on player_card_mv using gin (team_name_norm gin_trgm_ops);

create index concurrently if not exists idx_mv_pnameraw_trgm
  on player_card_mv using gin (player_name gin_trgm_ops);

analyze player_card_mv;
