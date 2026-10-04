-- SITTING 2 , ACCEPTANCE. Run AFTER the matview rebuild. Read-only.
-- Every row must read as the "expected" column says.

-- 1. THE FOUR NAMED CARDS
select card_id, player_name, team_name, season_year,
       shirt_number, shirt_number_source,
       (shirt_number_source = 'modal_split') as shows_arrows,
       case card_id
         when 188350 then '42, squadnum, no arrows'
         when 130281 then '24, squadnum'
         when 188094 then '15, squadnum, no arrows'
         when 169534 then 'NOT 10 , the Excelsior number must not land'
       end as expected
  from player_card_mv
 where card_id in (188350, 130281, 188094, 169534)
 order by card_id;

-- 2. THE FIFTEEN SAMPLED CORRECTIONS , "now" is what each card showed BEFORE the sitting
with sampled(card_id, before_number, sourced) as (values
  (188350,24,42),(188094,6,15),(188090,14,6),(187983,7,10),(187818,14,9),
  (188147,17,26),(187907,2,39),(160468,27,13),(157985,12,3),(187878,9,17),
  (188275,27,24),(187738,27,33),(170196,9,19),(154009,14,2),(188233,11,14))
select s.card_id, m.player_name, m.team_name, m.season_year, m.league_code,
       s.before_number, s.sourced as expected_now, m.shirt_number as actual_now,
       m.shirt_number_source,
       (m.shirt_number = s.sourced) as ok
  from sampled s join player_card_mv m using (card_id)
 order by ok, m.player_name;

-- 3. THE SHAPE OF THE WHOLE CHANGE
select coalesce(shirt_number_source,'(no number)') as source, count(*)
  from player_card_mv group by 1 order by 2 desc;

-- 4. THE HONOUR TIEBREAK , Harbaoui must appear once, the five national honours twice
select 'harbaoui golden boot' as check, count(*) filter (where h_golden_boot) as flagged, count(*) as halves
  from player_card_mv where api_player_id=8628 and season_year=2017 and league_code='BPL'
union all select 'fonte euro', count(*) filter (where h_euro_winner), count(*)
  from player_card_mv where api_player_id=2675 and season_year=2016 and league_code='PL';
