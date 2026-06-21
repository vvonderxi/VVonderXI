-- ════════════════════════════════════════════════════════════════════
--  player_card_view , REBUILT with computed VV Score (rt)
--  Phase 7 engine recalibration. rt is now a computed expression.
--  ALL 44 existing columns preserved in EXACT original order.
--  Only change: the rt column now reads the computed score (vv.rt_new)
--  instead of psc.rt (the old match-rating passthrough).
-- ════════════════════════════════════════════════════════════════════
create or replace view player_card_view as
with scored as (
  select
    psc.id as card_id,
    psc.position as pos,
    psc.minutes,
    psc.season_year,
    (psc.goals + coalesce(psc.assists,0)) / nullif(psc.minutes/90.0,0) as ga90,
    (psc.goals + coalesce(psc.assists,0)) as ga_total,
    case when psc.tackles_total is not null
      then (coalesce(psc.tackles_total,0)+coalesce(psc.interceptions,0)+coalesce(psc.tackles_blocks,0))
           / nullif(psc.minutes/90.0,0)
      else null end as def90,
    case when psc.duels_total >= 20 then psc.duels_won::numeric / psc.duels_total else null end as duel_rate,
    coalesce(l.league_strength_weight, 0.80) as wt
  from player_season_cards psc
  left join leagues l on psc.league_id = l.id
  where psc.minutes >= 300 and psc.goals is not null
),
ranked as (
  select s.*,
    percent_rank() over (partition by pos order by ga90) as pos_pct,
    percent_rank() over (partition by (case when pos='GK' then 1 else 0 end) order by ga90) as abs_pct,
    percent_rank() over (partition by pos order by ga_total) as posvol_pct,
    percent_rank() over (partition by (case when pos='GK' then 1 else 0 end) order by ga_total) as absvol_pct,
    percent_rank() over (partition by pos order by minutes) as rel_pct,
    case when def90 is not null then percent_rank() over (partition by pos order by def90) else null end as defvol_pct,
    case when duel_rate is not null then percent_rank() over (partition by pos order by duel_rate) else null end as duelq_pct
  from scored s
),
vv as (
  select card_id,
    greatest(0, least(100, round(
      case when pos = 'GK'
        then least(75,
               (0.5*rel_pct*100 + 0.5*least(95, 100*(minutes::numeric/(minutes+380))))
               * (1 - (1 - wt)*0.5))
        else
          ( 0.60 * greatest(
                     ( 0.50*(0.60*pos_pct + 0.40*coalesce(abs_pct,0))
                     + 0.50*(0.60*posvol_pct + 0.40*coalesce(absvol_pct,0)) ) * 100,
                     coalesce(case when defvol_pct is not null
                                then (0.55*defvol_pct + 0.45*coalesce(duelq_pct, defvol_pct))*93
                                else null end, 0)
                   )
          + 0.40 * least(95, 100*(minutes::numeric/(minutes+380))) )
          * (1 - (1 - wt)*0.5)
      end
    )))::integer as rt_new
  from ranked
)
SELECT psc.id AS card_id,
    p.id AS player_id,
    p.api_player_id,
    p.name AS player_name,
    p.nationality,
    p.date_of_birth,
    p.is_retired,
    p.is_legacy,
    p.legacy_tier,
    psc.season,
    psc.season_year,
    psc.league_code,
    l.name AS league_name,
    l.flag_emoji AS league_flag,
    l.league_strength_weight,
    psc.team_name,
    t.primary_colour,
    t.secondary_colour,
    t.accent_colour,
    psc."position",
    psc.age,
    psc.appearances,
    psc.minutes,
    psc.goals,
    psc.assists,
    psc.goals + psc.assists AS output,
    round((psc.goals + psc.assists)::numeric * l.league_strength_weight) AS adj_output,
    psc.rating,
    vv.rt_new AS rt,
    psc.shots_total,
    psc.shots_on,
    psc.passes_total,
    psc.passes_key,
    psc.passes_accuracy,
    psc.dribbles_attempts,
    psc.dribbles_success,
    psc.tackles_total,
    psc.tackles_blocks,
    psc.interceptions,
    psc.duels_total,
    psc.duels_won,
    psc.estimated_market_value,
    (psc.season_year::numeric - EXTRACT(year FROM p.date_of_birth))::integer AS season_age,
    pp."position" AS position_pool
   FROM player_season_cards psc
     LEFT JOIN players p ON psc.player_id = p.id
     LEFT JOIN leagues l ON psc.league_id = l.id
     LEFT JOIN teams t ON psc.team_id = t.id
     LEFT JOIN player_positions pp ON pp.api_player_id = p.api_player_id AND pp.season_year = psc.season_year AND pp.league_code = psc.league_code
     LEFT JOIN vv ON vv.card_id = psc.id;
