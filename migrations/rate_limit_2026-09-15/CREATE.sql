--  API RATE LIMIT , one table, no new vendor (2026-09-15)
--
--  WHY A TABLE AND NOT KV: at the measured traffic this counter ticks about three times a
--  day. Vercel KV or Upstash would mean a dependency and a bill for that. We already hold a
--  Supabase service key in the only function that needs it.
--
--  ONE ROW PER *NEW GENERATION*, NOT PER REQUEST. The check runs AFTER the cache lookup, so a
--  cache hit costs nothing and is never counted , the cache is most of the defence and the
--  limiter only has to bound what is actually billable.
--
--  finished_at NULL = in flight. That is how concurrency is counted, and it is also the field
--  that can strand a slot if a function dies mid-flight, which is why every read of it carries
--  a staleness floor rather than trusting the null.

create table if not exists public.api_rate_events (
  id          bigserial primary key,
  ip          text        not null,
  kind        text        not null,          -- 'verdict' | 'notes'
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

--  The two queries this table exists to answer, both keyed on ip + a time floor.
create index if not exists idx_rate_ip_started  on public.api_rate_events (ip, started_at desc);
create index if not exists idx_rate_ip_inflight on public.api_rate_events (ip, finished_at, started_at desc);

--  NOBODY BUT THE SERVICE ROLE MAY READ OR WRITE IT. It holds IP addresses, so it is the most
--  sensitive table on the platform despite being the smallest. RLS on with no policy means the
--  anon and authenticated roles get nothing; the service role bypasses RLS by design.
alter table public.api_rate_events enable row level security;
revoke all on public.api_rate_events from anon, authenticated;

comment on table public.api_rate_events is
  'Rate-limit ledger for api/analyse.js. One row per NEW model generation (cache hits are not counted). finished_at null means in flight. Retention: rows older than 24h are deleted opportunistically by the endpoint; nothing here is needed beyond the sliding window.';
