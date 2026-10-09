-- Removes the two storage tables. Nothing reads them, so no score or page changes.
drop table if exists public.lineup_slots;
drop table if exists public.position_overrides;
