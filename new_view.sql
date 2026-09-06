-- ════════════════════════════════════════════════════════════════════
--  player_card_view , ENGINE DISPERSION CALIBRATION (Blend + Option-2 curve)
--  Phase: Engine Dispersion Tuning. Date: 2026-07-01. Branch: redesign-compare.
--
--  WHAT CHANGED vs the previous live view (rt computation only):
--   1. Output currency is GOAL-WEIGHTED: goals + 0.7*assists (goals lead assists),
--      applied to both the per-90 RATE and the VOLUME signals.
--   2. RAW OUTPUT term added so genuine volume TOWERS at the top instead of
--      saturating on the percentile ceiling: attack = 0.65*percentile_blend
--      + 0.35*(100 * gaw / gaw_99thpct).  Linear, so 50 pulls clear of 40.
--   3. Output vs reliability reweighted 0.70 / 0.30 (was 0.60 / 0.40).
--   4. League tilt UNCHANGED (pyramid already adequate given 1-3).
--   5. Defensive lens UNCHANGED (the elite leak was attacking-side, not defensive).
--   6. OPTION-2 DISPERSION CURVE: anchor-based piecewise map. Cuts are placed at
--      the top 12 / 150 / 650 outfield seasons (= rt 95 / 90 / 85), top COMPRESSED
--      to 95-97 (no card scores 100 , the ceiling is a cluster of peers, not a point).
--
--  ANCHORS ARE LIVE, NOT HARDCODED (deliberate, per the "model is a belief" principle):
--   b95/b90/b85 are computed from the CURRENT distribution every refresh, so the
--   bands ALWAYS mean "top 12 / 150 / 650 seasons", forever. The BELIEF is frozen,
--   the NUMBERS self-correct. The site reads player_card_mv (matview), so the anchor
--   recompute cost is paid at REFRESH, not on every query.
--   >>> AFTER ANY IMPORT: refresh player_card_mv so the anchors recompute. <<<
--
--  GK branch UNCHANGED (least(75,...)) , outfield-only phase.
--  All 47 output columns preserved in EXACT original order. Only rt's source changed.
--  "Success. No rows returned" is the expected result for a create-or-replace view.
-- ════════════════════════════════════════════════════════════════════
create or replace view player_card_view as
with scored as (
  select
    psc.id as card_id,
    psc."position" as pos,
    psc.minutes,
    psc.season_year,
    (psc.goals + 0.7*coalesce(psc.assists,0)) as gaw,
    (psc.goals + 0.7*coalesce(psc.assists,0))::numeric / nullif(psc.minutes::numeric/90.0, 0) as gaw90,
    case when psc.tackles_total is not null
      then (coalesce(psc.tackles_total,0)+coalesce(psc.interceptions,0)+coalesce(psc.tackles_blocks,0))::numeric
           / nullif(psc.minutes::numeric/90.0, 0)
      else null end as def90,
    case when psc.duels_total >= 20 then psc.duels_won::numeric / psc.duels_total else null end as duel_rate,
    coalesce(l.league_strength_weight, 0.80) as wt
  from player_season_cards psc
  left join leagues l on psc.league_id = l.id
  where psc.minutes >= 300 and psc.goals is not null
),
ref as (
  select percentile_cont(0.99) within group (order by gaw) as gaw_ref
  from scored
  where pos <> 'GK'
),
ranked as (
  select s.*,
    percent_rank() over (partition by pos order by gaw90) as pos_pct,
    percent_rank() over (partition by (case when pos='GK' then 1 else 0 end) order by gaw90) as abs_pct,
    percent_rank() over (partition by pos order by gaw) as posvol_pct,
    percent_rank() over (partition by (case when pos='GK' then 1 else 0 end) order by gaw) as absvol_pct,
    percent_rank() over (partition by pos order by minutes) as rel_pct,
    case when def90 is not null then percent_rank() over (partition by pos order by def90) else null end as defvol_pct,
    case when duel_rate is not null then percent_rank() over (partition by pos order by duel_rate) else null end as duelq_pct
  from scored s
),
base as (
  select r.card_id,
    ( 0.70 * greatest(
        0.65 * ((0.50*(0.60*r.pos_pct + 0.40*coalesce(r.abs_pct,0))
               + 0.50*(0.60*r.posvol_pct + 0.40*coalesce(r.absvol_pct,0))) * 100)
        + 0.35 * (100 * r.gaw / nullif(rf.gaw_ref,0)),
        coalesce(case when r.defvol_pct is not null
                   then (0.55*r.defvol_pct + 0.45*coalesce(r.duelq_pct, r.defvol_pct)) * 93
                   else null end, 0)
      )
    + 0.30 * least(95, 100*(r.minutes::numeric/(r.minutes+380)))
    ) * (1 - (1 - r.wt)*0.5) as b
  from ranked r
  cross join ref rf
  where r.pos <> 'GK'
),
anchors as (
  select
    (select max(b) from base) as btop,
    (select b from base order by b desc offset 11  limit 1) as b95,
    (select b from base order by b desc offset 149 limit 1) as b90,
    (select b from base order by b desc offset 649 limit 1) as b85
),
vv as (
  select r.card_id,
    ( case
        when r.pos = 'GK' then
          greatest(0, least(75, round(
            (0.5*r.rel_pct*100 + 0.5*least(95, 100*(r.minutes::numeric/(r.minutes+380))))
            * (1 - (1 - r.wt)*0.5)
          )))
        else
          least(100, greatest(0,
            case
              when bs.b <= 80    then round(bs.b)
              when bs.b <= a.b85 then floor(80 + (bs.b-80)*5.0/(a.b85-80))
              when bs.b <= a.b90 then floor(85 + (bs.b-a.b85)*5.0/(a.b90-a.b85))
              when bs.b <= a.b95 then floor(90 + (bs.b-a.b90)*5.0/(a.b95-a.b90))
              else                    floor(95 + (bs.b-a.b95)*2.0/(a.btop-a.b95))
            end
          ))
      end )::integer as rt_new
  from ranked r
  left join base bs on bs.card_id = r.card_id
  cross join anchors a
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
    pp."position" AS position_pool,
    pp.shirt_number,
    regexp_replace(lower(unaccent(COALESCE(p.full_name, p.name))), '[^a-z0-9 ]', '', 'g') AS player_name_norm,
    regexp_replace(lower(unaccent(psc.team_name)), '[^a-z0-9 ]', '', 'g') AS team_name_norm
   FROM player_season_cards psc
     LEFT JOIN players p ON psc.player_id = p.id
     LEFT JOIN leagues l ON psc.league_id = l.id
     LEFT JOIN teams t ON psc.team_id = t.id
     LEFT JOIN player_positions pp ON pp.api_player_id = p.api_player_id AND pp.season_year = psc.season_year AND pp.league_code = psc.league_code
     LEFT JOIN vv ON vv.card_id = psc.id;
