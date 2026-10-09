-- POSITION FIX, STEP 1: storage only. Nothing here is read by the engine, the matview or any page,
-- so creating and filling these tables cannot move a score (2026-10-09).
--
-- lineup_slots: every starting-XI appearance, 2016+, with the RAW grid the old importer discarded.
-- One row per player per team per fixture. Holding this means the classifier can be rebuilt and
-- re-run at any time without another API pull.
create table if not exists public.lineup_slots (
  fixture_id    bigint  not null,
  league_code   text    not null,
  season_year   int     not null,
  team_id       int     not null,
  api_player_id int     not null,
  formation     text,
  grid_row      int,
  grid_col      int,
  row_width     int,
  pos           text,
  shirt         int,
  primary key (fixture_id, team_id, api_player_id)
);
create index if not exists lineup_slots_player on public.lineup_slots (api_player_id, season_year, league_code);
alter table public.lineup_slots enable row level security;
revoke all on public.lineup_slots from anon, authenticated;

-- position_overrides: a hand-verified position always beats the classifier. Seeded from the rows
-- whose stored position disagrees with their own lineup tally (research wrote them), so a re-run of
-- any classifier can no longer silently undo that research.
create table if not exists public.position_overrides (
  api_player_id int  not null,
  season_year   int  not null,
  league_code   text not null,
  position      text not null check (position in ('GK','FB','CB','CDM','CM','CAM','Winger','ST')),
  source        text not null,
  note          text,
  created_at    timestamptz not null default now(),
  primary key (api_player_id, season_year, league_code)
);
alter table public.position_overrides enable row level security;
revoke all on public.position_overrides from anon, authenticated;
