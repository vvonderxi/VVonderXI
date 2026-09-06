-- Stage 1 (engine recalibration) , def_share INSPECTION columns, rt UNTOUCHED.
-- Built from the live pg_get_viewdef of player_card_view. Adds 3 CTEs (team_def, dshare, dshare_pct)
-- + 5 appended inspection columns (def90, defvol_pct, team_def90, def_share, def_share_pct).
-- All 47 existing columns preserved in exact order; vv.rt_new AS rt is the only rt source, unchanged.
CREATE OR REPLACE VIEW player_card_view AS
 WITH scored AS (
         SELECT psc_1.id AS card_id,
            psc_1."position" AS pos,
            psc_1.minutes,
            psc_1.season_year,
            psc_1.goals::numeric + 0.7 * COALESCE(psc_1.assists, 0)::numeric AS gaw,
            (psc_1.goals::numeric + 0.7 * COALESCE(psc_1.assists, 0)::numeric) / NULLIF(psc_1.minutes::numeric / 90.0, 0::numeric) AS gaw90,
                CASE
                    WHEN psc_1.tackles_total IS NOT NULL THEN (COALESCE(psc_1.tackles_total, 0) + COALESCE(psc_1.interceptions, 0) + COALESCE(psc_1.tackles_blocks, 0))::numeric / NULLIF(psc_1.minutes::numeric / 90.0, 0::numeric)
                    ELSE NULL::numeric
                END AS def90,
                CASE
                    WHEN psc_1.duels_total >= 20 THEN psc_1.duels_won::numeric / psc_1.duels_total::numeric
                    ELSE NULL::numeric
                END AS duel_rate,
            COALESCE(l_1.league_strength_weight, 0.80) AS wt
           FROM player_season_cards psc_1
             LEFT JOIN leagues l_1 ON psc_1.league_id = l_1.id
          WHERE psc_1.minutes >= 300 AND psc_1.goals IS NOT NULL
        ), ref AS (
         SELECT percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (scored.gaw::double precision)) AS gaw_ref
           FROM scored
          WHERE scored.pos <> 'GK'::text
        ), ranked AS (
         SELECT s.card_id, s.pos, s.minutes, s.season_year, s.gaw, s.gaw90, s.def90, s.duel_rate, s.wt,
            percent_rank() OVER (PARTITION BY s.pos ORDER BY s.gaw90) AS pos_pct,
            percent_rank() OVER (PARTITION BY (CASE WHEN s.pos = 'GK'::text THEN 1 ELSE 0 END) ORDER BY s.gaw90) AS abs_pct,
            percent_rank() OVER (PARTITION BY s.pos ORDER BY s.gaw) AS posvol_pct,
            percent_rank() OVER (PARTITION BY (CASE WHEN s.pos = 'GK'::text THEN 1 ELSE 0 END) ORDER BY s.gaw) AS absvol_pct,
            percent_rank() OVER (PARTITION BY s.pos ORDER BY s.minutes) AS rel_pct,
                CASE WHEN s.def90 IS NOT NULL THEN percent_rank() OVER (PARTITION BY s.pos ORDER BY s.def90) ELSE NULL::double precision END AS defvol_pct,
                CASE WHEN s.duel_rate IS NOT NULL THEN percent_rank() OVER (PARTITION BY s.pos ORDER BY s.duel_rate) ELSE NULL::double precision END AS duelq_pct
           FROM scored s
        ), base AS (
         SELECT r.card_id,
            (0.70::double precision * GREATEST(0.65::double precision * ((0.50::double precision * (0.60::double precision * r.pos_pct + 0.40::double precision * COALESCE(r.abs_pct, 0::double precision)) + 0.50::double precision * (0.60::double precision * r.posvol_pct + 0.40::double precision * COALESCE(r.absvol_pct, 0::double precision))) * 100::double precision) + 0.35::double precision * ((100::numeric * r.gaw)::double precision / NULLIF(rf.gaw_ref, 0::double precision)), COALESCE(CASE WHEN r.defvol_pct IS NOT NULL THEN (0.55::double precision * r.defvol_pct + 0.45::double precision * COALESCE(r.duelq_pct, r.defvol_pct)) * 93::double precision ELSE NULL::double precision END, 0::double precision)) + (0.30 * LEAST(95::numeric, 100::numeric * (r.minutes::numeric / (r.minutes + 380)::numeric)))::double precision) * (1::numeric - (1::numeric - r.wt) * 0.5)::double precision AS b
           FROM ranked r CROSS JOIN ref rf
          WHERE r.pos <> 'GK'::text
        ), anchors AS (
         SELECT ( SELECT max(base.b) AS max FROM base) AS btop,
            ( SELECT base.b FROM base ORDER BY base.b DESC OFFSET 11 LIMIT 1) AS b95,
            ( SELECT base.b FROM base ORDER BY base.b DESC OFFSET 149 LIMIT 1) AS b90,
            ( SELECT base.b FROM base ORDER BY base.b DESC OFFSET 649 LIMIT 1) AS b85
        ), vv AS (
         SELECT r.card_id,
                CASE WHEN r.pos = 'GK'::text THEN GREATEST(0::double precision, LEAST(75::double precision, round((0.5::double precision * r.rel_pct * 100::double precision + (0.5 * LEAST(95::numeric, 100::numeric * (r.minutes::numeric / (r.minutes + 380)::numeric)))::double precision) * (1::numeric - (1::numeric - r.wt) * 0.5)::double precision)))
                    ELSE LEAST(100::double precision, GREATEST(0::double precision,
                    CASE WHEN bs.b <= 80::double precision THEN round(bs.b)
                        WHEN bs.b <= a.b85 THEN floor(80::double precision + (bs.b - 80::double precision) * 5.0::double precision / (a.b85 - 80::double precision))
                        WHEN bs.b <= a.b90 THEN floor(85::double precision + (bs.b - a.b85) * 5.0::double precision / (a.b90 - a.b85))
                        WHEN bs.b <= a.b95 THEN floor(90::double precision + (bs.b - a.b90) * 5.0::double precision / (a.b95 - a.b90))
                        ELSE floor(95::double precision + (bs.b - a.b95) * 2.0::double precision / (a.btop - a.b95))
                    END))
                END::integer AS rt_new
           FROM ranked r LEFT JOIN base bs ON bs.card_id = r.card_id CROSS JOIN anchors a
        ),
        team_def AS (
         SELECT psc_t.team_id, psc_t.season_year, psc_t.league_code,
            SUM(COALESCE(psc_t.tackles_total, 0) + COALESCE(psc_t.interceptions, 0) + COALESCE(psc_t.tackles_blocks, 0))::numeric AS team_def_actions,
            SUM(psc_t.minutes)::numeric AS team_minutes
           FROM player_season_cards psc_t
          WHERE psc_t.season_year >= 2016 AND psc_t.tackles_total IS NOT NULL AND psc_t.minutes > 0
          GROUP BY psc_t.team_id, psc_t.season_year, psc_t.league_code
        ),
        dshare AS (
         SELECT r.card_id, r.pos,
            td.team_def_actions * 90.0 / NULLIF(td.team_minutes, 0::numeric) AS team_def90,
            r.def90 / NULLIF(td.team_def_actions * 90.0 / NULLIF(td.team_minutes, 0::numeric), 0::numeric) AS def_share
           FROM ranked r
             JOIN player_season_cards psc_s ON psc_s.id = r.card_id
             LEFT JOIN team_def td ON td.team_id = psc_s.team_id AND td.season_year = psc_s.season_year AND td.league_code = psc_s.league_code
          WHERE r.def90 IS NOT NULL AND r.pos <> 'GK'::text AND r.season_year >= 2016
        ),
        dshare_pct AS (
         SELECT dshare.card_id, dshare.pos, dshare.team_def90, dshare.def_share,
            percent_rank() OVER (PARTITION BY dshare.pos ORDER BY dshare.def_share) AS def_share_pct
           FROM dshare
        )
 SELECT psc.id AS card_id, p.id AS player_id, p.api_player_id, p.name AS player_name, p.nationality, p.date_of_birth, p.is_retired, p.is_legacy, p.legacy_tier, psc.season, psc.season_year, psc.league_code, l.name AS league_name, l.flag_emoji AS league_flag, l.league_strength_weight, psc.team_name, t.primary_colour, t.secondary_colour, t.accent_colour, psc."position", psc.age, psc.appearances, psc.minutes, psc.goals, psc.assists, psc.goals + psc.assists AS output, round((psc.goals + psc.assists)::numeric * l.league_strength_weight) AS adj_output, psc.rating, vv.rt_new AS rt, psc.shots_total, psc.shots_on, psc.passes_total, psc.passes_key, psc.passes_accuracy, psc.dribbles_attempts, psc.dribbles_success, psc.tackles_total, psc.tackles_blocks, psc.interceptions, psc.duels_total,
    psc.duels_won,
    psc.estimated_market_value,
    (psc.season_year::numeric - EXTRACT(year FROM p.date_of_birth))::integer AS season_age,
    pp."position" AS position_pool,
    pp.shirt_number,
    regexp_replace(lower(unaccent(COALESCE(p.full_name, p.name))), '[^a-z0-9 ]'::text, ''::text, 'g'::text) AS player_name_norm,
    regexp_replace(lower(unaccent(psc.team_name)), '[^a-z0-9 ]'::text, ''::text, 'g'::text) AS team_name_norm,
    rk.def90,
    rk.defvol_pct,
    dshare_pct.team_def90,
    dshare_pct.def_share,
    dshare_pct.def_share_pct
   FROM player_season_cards psc
     LEFT JOIN players p ON psc.player_id = p.id
     LEFT JOIN leagues l ON psc.league_id = l.id
     LEFT JOIN teams t ON psc.team_id = t.id
     LEFT JOIN player_positions pp ON pp.api_player_id = p.api_player_id AND pp.season_year = psc.season_year AND pp.league_code = psc.league_code
     LEFT JOIN vv ON vv.card_id = psc.id
     LEFT JOIN ranked rk ON rk.card_id = psc.id
     LEFT JOIN dshare_pct ON dshare_pct.card_id = psc.id;
