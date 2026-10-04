-- ════════════════════════════════════════════════════════════════════════════
-- ANON LOCKDOWN , PART 2 , 2026-10-03
-- Run AFTER APPLY.sql. Paste step by step and read each check.
--
-- Three jobs: finish the policy cleanup, close the sequences, and open the ONE
-- narrow write path the waitlist needs (route A).
-- ════════════════════════════════════════════════════════════════════════════


-- ── STEP 1 , the last three misnamed policy sets ───────────────────────────
-- Same shape as the seven already dropped: named for a service role, scoped to
-- roles=PUBLIC. Inert today because no grant reaches these tables, so this is
-- about the RECORD as much as the access , the next person to read the policy
-- list should not see "Service insert" and assume a service role is scoped.

drop policy if exists "Service insert log"     on public.import_log;
drop policy if exists "Service update log"     on public.import_log;
drop policy if exists "Service insert seasons" on public.player_seasons;
drop policy if exists "Service insert search"  on public.search_cache;
drop policy if exists "Service update search"  on public.search_cache;

-- CHECK , expect NO policy whose cmd is a/w/d to remain on roles=PUBLIC.
-- What should be left: the "Public read ..." SELECT policies, the two anon/auth
-- read policies on split_transfers, the two locker_profiles policies, and
-- anon_insert_waitlist (which step 3 is about).
select c.relname, p.polname, p.polcmd::text as cmd,
       coalesce((select string_agg(r.rolname,'+') from pg_roles r where r.oid = any(p.polroles)),'PUBLIC') as roles
from pg_policy p join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' order by 1, 2;


-- ── STEP 2 , the sequences ─────────────────────────────────────────────────
-- APPLY.sql revoked ALL TABLES and did not touch sequences, so twelve still
-- carry anon=rwU. Low severity and worth closing: USAGE lets a caller burn
-- sequence numbers, which leaves gaps in future ids. With no INSERT grant it
-- cannot create a row, so this is nuisance rather than exposure.

revoke all on all sequences in schema public from anon, authenticated;

-- CHECK , expect 0 rows.
select c.relname, a::text
from pg_class c join pg_namespace n on n.oid = c.relnamespace, unnest(c.relacl) a
where n.nspname = 'public' and c.relkind = 'S'
  and (a::text like 'anon=%' or a::text like 'authenticated=%');


-- ── STEP 3 , the waitlist write path (ROUTE A) ─────────────────────────────
-- waitlist_emails already has RLS ON and an INSERT policy for roles=anon
-- (`anon_insert_waitlist`). APPLY.sql removed the table GRANT, so the policy is
-- currently unreachable. This hands back INSERT and nothing else: anon can add a
-- row and cannot read, change or delete one.
--
-- THE UNIQUE INDEX IS THE RATE LIMIT. Route A has no throttle, so the ceiling on
-- abuse is one row per distinct address. Without it the same address, or junk,
-- could be inserted without limit.
--
-- THE DEDUPE MUST RUN FIRST OR THE INDEX CANNOT BUILD. Three rows share one
-- address (test signups from 2026-09-02); this keeps the EARLIEST of each.
-- Expect 7 rows to become 5.

delete from public.waitlist_emails a
 using public.waitlist_emails b
 where lower(a.email) = lower(b.email) and a.id > b.id;

create unique index if not exists waitlist_emails_email_lower_uniq
  on public.waitlist_emails (lower(email));

grant insert on public.waitlist_emails to anon;

-- `id` is GENERATED ALWAYS AS IDENTITY, so no sequence grant is needed and the
-- client must never send an id. The client also must not chain .select() onto
-- the insert: that would ask PostgREST to return the row, which needs a SELECT
-- privilege anon deliberately does not have.

-- CHECK , expect 5 rows, the index present, and anon holding INSERT only.
select (select count(*) from public.waitlist_emails) as rows_after_dedupe,
       (select count(*) from pg_indexes
         where schemaname='public' and indexname='waitlist_emails_email_lower_uniq') as unique_index,
       (select string_agg(a::text,' | ')
          from pg_class c join pg_namespace n on n.oid=c.relnamespace, unnest(c.relacl) a
         where n.nspname='public' and c.relname='waitlist_emails' and a::text like 'anon=%') as anon_grant;
-- anon_grant should read  anon=a/postgres   , `a` is INSERT and nothing else.

notify pgrst, 'reload schema';


-- ── AFTERWARDS ─────────────────────────────────────────────────────────────
-- In Terminal C, confirm the lockdown still holds and the one new path works:
--   node migrations/anon_lockdown_2026-10-03/control.js        , 4 ok, 8 denied
--   node migrations/anon_lockdown_2026-10-03/waitlist-check.js , insert ok, read denied
