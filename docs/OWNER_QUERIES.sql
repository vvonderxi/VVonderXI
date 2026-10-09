-- OWNER QUERIES , saved in the Supabase SQL editor (2026-10-09). Read-only, service role.
-- vv_events holds three kinds written by the site: 'compare' (pair key "lo-hi"),
-- 'card' (card_id), 'search_miss' (the query, when a search returned nothing).

-- 1. WAITLIST , who signed up, where, when. "Save ..." sources are people who tried to save
--    something; "My Club waitlist" / "I Wonder waitlist" signed up on the page itself.
select id, email, source, created_at::date as signed_up
from waitlist_emails order by created_at desc;

-- 2. ACTIVITY BY DAY , comparisons run, cards opened, failed searches, per day, last 30 days.
select created_at::date as day,
       count(*) filter (where kind='compare')     as comparisons,
       count(*) filter (where kind='card')        as cards_opened,
       count(*) filter (where kind='search_miss') as searches_with_no_result
from vv_events where created_at > now() - interval '30 days'
group by 1 order by 1 desc;

-- 3. MOST COMPARED PAIRS , last 30 days, with names.
select e.key as pair, count(*) as times,
       a.player_name||' '||a.season_year||' '||a.team_name as season_a,
       b.player_name||' '||b.season_year||' '||b.team_name as season_b
from vv_events e
left join player_card_mv a on a.card_id = split_part(e.key,'-',1)::bigint
left join player_card_mv b on b.card_id = split_part(e.key,'-',2)::bigint
where e.kind='compare' and e.created_at > now() - interval '30 days'
group by 1,3,4 order by times desc limit 25;

-- 4. MOST OPENED CARDS , last 30 days, with names and score.
select e.key as card_id, count(*) as opens, c.player_name, c.season_year, c.team_name, c.rt
from vv_events e left join player_card_mv c on c.card_id = e.key::bigint
where e.kind='card' and e.created_at > now() - interval '30 days'
group by 1,3,4,5,6 order by opens desc limit 25;

-- 5. SEARCHES THAT FOUND NOTHING , what people looked for and we do not have (or spell differently).
select lower(key) as searched_for, count(*) as times, max(created_at) as last_time
from vv_events where kind='search_miss' and created_at > now() - interval '30 days'
group by 1 order by times desc, last_time desc limit 50;

-- 6. AI PROSE WRITTEN PER DAY , new verdicts and card notes generated (each one a model call).
--    A cached view writes nothing, so this is cost, not traffic.
select day, sum(verdicts) as verdicts_written, sum(notes) as notes_written from (
  select created_at::date as day, count(*) as verdicts, 0 as notes from verdict_cache group by 1
  union all
  select created_at::date, 0, count(*) from notes_cache group by 1
) t where day > current_date - 30 group by day order by day desc;
