-- ════════════════════════════════════════════════════════════════════════════
-- ANON LOCKDOWN , 2026-10-03
-- Paste ONE STEP AT A TIME into the Supabase SQL editor and read the check after
-- each. Do not paste the whole file at once: the checks are how you know it took.
--
-- WHAT IS WRONG TODAY. The publishable key that ships in every page holds
-- `arwdDxtm` on 44 relations , that is SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES, TRIGGER and MAINTAIN, not read-only. On 18 of them RLS is OFF, so
-- the grant is the only gate and a stranger can write. On players,
-- player_season_cards, teams and leagues RLS is ON but carries policies NAMED
-- "Service insert"/"Service update" that are scoped to `roles=PUBLIC` with
-- USING=true and CHECK=true, so they permit anon to INSERT and UPDATE.
--
-- WHAT MAKES THIS SAFE TO RUN. Verified before writing it, not assumed:
--   * NO shipping page writes to the database. Zero .insert/.update/.delete/
--     .upsert in any of the ten shipping HTML files. The client is read-only.
--   * The client reads exactly FOUR relations: player_card_mv, players (two
--     columns), split_transfers, honours.
--   * service_role has rolbypassrls = TRUE, and all 80 importer/script files use
--     SUPABASE_SERVICE_KEY. So NOTHING depends on the PUBLIC write policies ,
--     the importers bypass RLS entirely and are unaffected by step 3.
--   * api/analyse.js uses SUPABASE_SERVICE_KEY for both the rate limiter and the
--     caches, so revoking anon on notes_cache cannot touch it.
--
-- ROLLBACK: ROLLBACK.sql in this directory. BEFORE.txt holds the full prior state.
-- ════════════════════════════════════════════════════════════════════════════


-- ── STEP 1 ─────────────────────────────────────────────────────────────────
-- Take every verb from anon, everywhere.
--
-- THE TWO MATVIEW LINES ARE NOT REDUNDANT AND MUST NOT BE DROPPED. In Postgres
-- `ALL TABLES IN SCHEMA` covers tables, views and foreign tables and does NOT
-- cover MATERIALIZED views. Without the explicit lines, player_card_mv keeps
-- arwdDxtm and the main hole stays open while every check looks clean , which is
-- the same matview blindness CLAUDE.md already records for information_schema.

revoke all on all tables in schema public from anon;
revoke all on public.player_card_mv     from anon;
revoke all on public.player_card_mv_old from anon;

-- CHECK , expect 0 rows. Any row here is a relation still granted to anon.
select c.relkind, c.relname, a::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace, unnest(c.relacl) a
where n.nspname = 'public' and c.relkind in ('r','m','v') and a::text like 'anon=%';


-- ── STEP 2 ─────────────────────────────────────────────────────────────────
-- Hand back exactly the four reads the shipping pages make, and nothing else.
-- The players grant is COLUMN-LEVEL on purpose: card.html:2586 selects
-- `full_name` filtered by `api_player_id`, so those two columns are the whole
-- need. A column grant needs no client change, where a replacement view would
-- have meant editing card.html , and a code change would then have to land
-- before the merge.

grant select on public.player_card_mv  to anon;
grant select on public.split_transfers to anon;
grant select on public.honours         to anon;
grant select (api_player_id, full_name) on public.players to anon;

-- CHECK , expect exactly these four, and players must show the two columns only.
select c.relkind, c.relname, a::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace, unnest(c.relacl) a
where n.nspname = 'public' and a::text like 'anon=%'
union all
select 'col', attname, 'anon has SELECT'
from pg_attribute
where attrelid = 'public.players'::regclass
  and has_column_privilege('anon', attrelid, attname, 'SELECT')
order by 2;


-- ── STEP 3 ─────────────────────────────────────────────────────────────────
-- The write policies that are named for a service role and scoped to PUBLIC.
-- service_role bypasses RLS, so these grant nothing the importers need and
-- everything an anonymous caller should not have.

drop policy if exists "Service insert players" on public.players;
drop policy if exists "Service update players" on public.players;
drop policy if exists "Service insert cards"   on public.player_season_cards;
drop policy if exists "Service update cards"   on public.player_season_cards;
drop policy if exists "Service insert teams"   on public.teams;
drop policy if exists "Service update teams"   on public.teams;
drop policy if exists "Service insert leagues" on public.leagues;

-- CHECK , expect only the four "Public read ..." SELECT policies to remain.
select c.relname, p.polname, p.polcmd::text as cmd
from pg_policy p join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' order by 1, 2;


-- ── STEP 4 ─────────────────────────────────────────────────────────────────
-- RLS on the three tables that had none. After step 1 anon holds no grant on
-- notes_cache at all, so this is defence in depth: it means a future accidental
-- GRANT does not silently reopen the table.
--
-- honours and split_transfers ARE still read by the client, and RLS ON with no
-- policy denies everything , so they each need an explicit read policy or the
-- site breaks. That is the trap in this step.

alter table public.honours         enable row level security;
alter table public.split_transfers enable row level security;
alter table public.notes_cache     enable row level security;

create policy "anon read honours"
  on public.honours         for select to anon using (true);
create policy "anon read split_transfers"
  on public.split_transfers for select to anon using (true);

-- CHECK , expect RLS ON for all three, and the two new read policies present.
select c.relname, c.relrowsecurity as rls_on,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('honours','split_transfers','notes_cache') order by 1;


-- ── STEP 5 , OPTIONAL, AND I RECOMMEND IT ──────────────────────────────────
-- `authenticated` carries the IDENTICAL arwdDxtm grants. OAuth is published, so
-- an account can be created, and locker_profiles currently holds 0 rows , so
-- there is no user to break and nothing on any page signs anyone in. Leaving it
-- means the hole closed for anonymous callers stays open for anyone who signs up.
-- Skip this ONLY if you would rather not touch the accounts stage today.

revoke all on all tables in schema public from authenticated;
revoke all on public.player_card_mv     from authenticated;
revoke all on public.player_card_mv_old from authenticated;

grant select on public.player_card_mv  to authenticated;
grant select on public.split_transfers to authenticated;
grant select on public.honours         to authenticated;
grant select (api_player_id, full_name) on public.players to authenticated;

create policy "auth read honours"
  on public.honours         for select to authenticated using (true);
create policy "auth read split_transfers"
  on public.split_transfers for select to authenticated using (true);


-- ── LAST ───────────────────────────────────────────────────────────────────
-- PostgREST caches the schema. If the control below reports something odd
-- immediately after, reload it once and re-run before concluding anything:
notify pgrst, 'reload schema';

-- THEN, in Terminal C:
--   node migrations/anon_lockdown_2026-10-03/control.js
-- Expect: four reads ok, eight denied, exit 0.
