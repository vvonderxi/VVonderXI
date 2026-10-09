-- vv_events , three product events, insert-only for anon, 2026-10-09.
-- Same posture as waitlist_emails: anon may INSERT and nothing else; reads are service-role
-- (the SQL editor) only. The CHECKs bound what an anonymous writer can put in a row.
create table if not exists public.vv_events (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('compare','card','search_miss')),
  key        text not null check (char_length(key) between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists vv_events_kind_created on public.vv_events (kind, created_at desc);
alter table public.vv_events enable row level security;
revoke all on public.vv_events from anon, authenticated;
grant insert on public.vv_events to anon;
drop policy if exists anon_insert_events on public.vv_events;
create policy anon_insert_events on public.vv_events for insert to anon with check (true);
notify pgrst, 'reload schema';
