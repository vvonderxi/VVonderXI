-- ══════════════════════════════════════════════════════════════════════
--  VVonderXI , GOALKEEPER + PENALTY COLUMNS on player_season_cards
--  2026-08-17
--
--  WHY: api/import-players.js has always DISCARDED these fields. The merge kept
--  goals:{total,assists} and dropped goals.conceded / goals.saves from the SAME
--  object, and never read the penalty block at all. The data was arriving and
--  being thrown away, so this is a pipeline gap, not a data gap.
--
--  SCHEMA CHECK (run twice, 2026-08-17): player_season_cards had 36 columns and
--  NONE of these seven existed. A scan of all 45 exposed tables for
--  conceded|save|penalt|start|lineup|cleansheet|gk|keeper returned exactly one
--  match, import_log.started_at, a timestamp. There is no differently-named
--  column already holding any of this.
--
--  NO DEFAULT, DELIBERATELY. A `default 0` would stamp zero into all 57,234
--  existing rows the instant this ran, destroying the NR distinction before the
--  backfill could populate anything, and it is not recoverable afterwards.
--  Nullable-with-no-default is the entire point. ADD COLUMN without a default is
--  metadata-only in modern Postgres, so this is instant and rewrites no table.
--
--  rt-SAFE: verified against a FRESH pg_get_viewdef('player_card_view') on
--  2026-08-17 (view length 11,696 chars, healthy). All seven names return
--  position() = 0, i.e. absent from the view body, while a positive control
--  (goals, assists, minutes, position) was FOUND at chars 171/212/111/75. The
--  engine cannot read what it does not reference, so these columns cannot move
--  rt. They are also invisible to the site until player_card_mv is rebuilt.
--
--  RUN: Supabase SQL editor. Lucas runs migrations himself.
-- ══════════════════════════════════════════════════════════════════════

alter table public.player_season_cards
  add column if not exists penalties_scored integer,
  add column if not exists penalties_missed integer,
  add column if not exists penalties_saved  integer,
  add column if not exists penalties_won    integer,
  add column if not exists goals_conceded   integer,
  add column if not exists saves            integer,
  add column if not exists starts           integer;

comment on column public.player_season_cards.penalties_scored is
  'API-Football penalty.scored. Source emits a real 0, so NULL means not recorded, never zero. Absent pre-2015.';

comment on column public.player_season_cards.penalties_missed is
  'API-Football penalty.missed. Source emits a real 0, so NULL means not recorded, never zero. Absent pre-2015.';

comment on column public.player_season_cards.penalties_saved is
  'API-Football penalty.saved. NULL means not applicable (outfielder) or not recorded; 0 means a keeper saved none. Absent pre-2015.';

comment on column public.player_season_cards.penalties_won is
  'API-Football penalty.won, stored raw. UNRELIABLE, treat with suspicion: only ~5% populated, and populated in the wrong places. In a 55-block PL 2016 sample, all 9 players who SCORED a penalty carry NULL here (Milner scored 7), while the 3 rows that ARE populated scored none. Zero overlap. So NULL does NOT mean "won none", it means the source is silent, and this column must never be coalesced to 0. Kept only because it costs nothing to capture in a pass that is happening anyway.';

comment on column public.player_season_cards.goals_conceded is
  'API-Football goals.conceded. The source returns 0 for outfielders (not applicable, not measured), so never average this column without filtering to keepers first. Absent pre-2015.';

comment on column public.player_season_cards.saves is
  'API-Football goals.saves. NULL means not applicable (outfielder) or not recorded. Absent pre-2015.';

comment on column public.player_season_cards.starts is
  'API-Football games.lineups. Unlike the keeper and penalty fields this IS populated pre-2015, alongside appearances, minutes, goals and the two discipline columns.';

-- NOT ADDED, both deliberate:
--   captain (games.captain)  , the provider gets it WRONG. False for Bruno Fernandes
--     2023/24, van Dijk 2023/24, Kane 2022/23 and Reus 2019/20, all club captains in
--     those exact seasons. A column of wrong data is worse than no column.
--   penalties_committed (penalty.commited) , same inverted-NULL problem as penalty.won
--     (6 of 55 non-null, value 1 only, never 0) and far less analytical value.
