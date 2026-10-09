-- Removes the hourly retention job. The privacy policy's 24-hour and 90-day sentences stop being
-- enforced the moment this runs, so change the policy in the same sitting.
select cron.unschedule('vv_retention_hourly');
