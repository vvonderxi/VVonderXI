-- 2026-10-09: allow the Compare funnel's step rows. Kind list was compare, card, search_miss.
alter table public.vv_events drop constraint vv_events_kind_check;
alter table public.vv_events add constraint vv_events_kind_check check (kind = any (array['compare','card','search_miss','cmp_step']));
