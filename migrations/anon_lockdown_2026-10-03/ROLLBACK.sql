-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK FOR THE ANON LOCKDOWN , 2026-10-03
--
-- READ THIS BEFORE RUNNING IT. This restores the state captured in BEFORE.txt,
-- which is a state where the publishable key shipped in every page can INSERT,
-- UPDATE, DELETE and TRUNCATE 44 relations. It is here because a migration
-- without a reversal is not a migration, NOT because reverting is a neutral act.
--
-- IF THE SITE BROKE, THE FIRST THING TO TRY IS NOT THIS FILE. The likely cause
-- is narrower and cheaper to fix:
--   * a read the control did not cover , grant SELECT on that one relation
--   * PostgREST serving a stale schema , run: notify pgrst, 'reload schema';
--   * honours or split_transfers returning 0 rows , their RLS read policy from
--     step 4 is missing, so add it rather than reverting everything
-- Reverting the whole block to fix one missing grant reopens all 44.
-- ════════════════════════════════════════════════════════════════════════════

-- ── undo step 4 , RLS and its read policies ────────────────────────────────
drop policy if exists "anon read honours"         on public.honours;
drop policy if exists "anon read split_transfers" on public.split_transfers;
drop policy if exists "auth read honours"         on public.honours;
drop policy if exists "auth read split_transfers" on public.split_transfers;

alter table public.honours         disable row level security;
alter table public.split_transfers disable row level security;
alter table public.notes_cache     disable row level security;

-- ── undo step 3 , the PUBLIC-scoped write policies ─────────────────────────
-- Recreated exactly as BEFORE.txt records them: roles=PUBLIC, USING/CHECK true.
create policy "Service insert players" on public.players
  for insert with check (true);
create policy "Service update players" on public.players
  for update using (true);
create policy "Service insert cards"   on public.player_season_cards
  for insert with check (true);
create policy "Service update cards"   on public.player_season_cards
  for update using (true);
create policy "Service insert teams"   on public.teams
  for insert with check (true);
create policy "Service update teams"   on public.teams
  for update using (true);
create policy "Service insert leagues" on public.leagues
  for insert with check (true);

-- ── undo steps 1, 2 and 5 , the grants ─────────────────────────────────────
-- BEFORE.txt records anon and authenticated holding arwdDxtm on every relation.
-- `ALL TABLES IN SCHEMA` does not reach materialized views, so they are named.
grant all on all tables in schema public to anon;
grant all on public.player_card_mv     to anon;
grant all on public.player_card_mv_old to anon;

grant all on all tables in schema public to authenticated;
grant all on public.player_card_mv     to authenticated;
grant all on public.player_card_mv_old to authenticated;

notify pgrst, 'reload schema';

-- VERIFY THE REVERSAL rather than assuming it , expect 44 rows, matching
-- BEFORE.txt, and re-running control.js should show eight OPEN again.
select c.relkind, c.relname, a::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace, unnest(c.relacl) a
where n.nspname = 'public' and c.relkind in ('r','m','v') and a::text like 'anon=%'
order by 2;
