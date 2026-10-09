-- RETENTION, ENFORCED BY THE DATABASE (2026-10-09).
-- privacy.html promises two deletions: rate-limit rows (which hold IP addresses) after 24 hours,
-- and event rows after 90 days. Before this, the first ran only when a new AI generation happened
-- (rows sat for 25+ hours on a quiet day) and the second did not exist. This job makes both true
-- on a clock, every hour at minute 17, independent of traffic.
-- Requires the pg_cron extension, enabled in the Supabase dashboard (Database > Extensions).
select cron.schedule(
  'vv_retention_hourly',
  '17 * * * *',
  $$delete from public.api_rate_events where started_at < now() - interval '24 hours';
    delete from public.vv_events where created_at < now() - interval '90 days';$$
);
