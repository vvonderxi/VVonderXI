alter table public.player_season_cards
  add column if not exists starts           integer,
  add column if not exists penalties_scored integer,
  add column if not exists penalties_saved  integer,
  add column if not exists penalties_won    integer;
