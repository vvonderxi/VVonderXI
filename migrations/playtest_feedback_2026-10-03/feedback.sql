-- VVonderXI Duels playtest feedback. Run ONCE in the Supabase SQL editor.
-- Insert-only for the public (anon) key: testers can add feedback but can never read, change or delete any.
create table if not exists public.game_feedback (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  build           text check (char_length(build) <= 40),
  rules_version   text check (char_length(rules_version) <= 40),
  session_id      text check (char_length(session_id) <= 64),
  device          text check (device in ('touch', 'mouse')),
  viewport        text check (char_length(viewport) <= 20),
  user_agent      text check (char_length(user_agent) <= 300),
  clarity         text check (clarity in ('confusing', 'mostly', 'clear')),
  fun             smallint check (fun between 1 and 5),
  again           text check (again in ('yes', 'maybe', 'no')),
  confusing       text[] check (cardinality(confusing) <= 10),
  comment         text check (char_length(comment) <= 2000),
  name            text check (char_length(name) <= 60),
  matches_played  integer check (matches_played between 0 and 1000),
  last_match      jsonb check (pg_column_size(last_match) <= 2000)
);

alter table public.game_feedback enable row level security;

drop policy if exists "playtest feedback: anyone can insert" on public.game_feedback;
create policy "playtest feedback: anyone can insert" on public.game_feedback
  for insert to anon, authenticated with check (true);
-- No select / update / delete policy: with RLS on, the public key cannot read or change anything.

revoke all on public.game_feedback from anon, authenticated;
grant insert on public.game_feedback to anon, authenticated;

-- Read the feedback yourself (SQL editor, as owner):
-- select created_at, fun, clarity, again, confusing, comment, name, last_match from public.game_feedback order by created_at desc;
