// Stage 2 (FIRST rt change) , wire CB bounded-def + FB best-of, MATERIALIZED into engine_stage2_rt.
// The live player_card_view is NOT touched (rt unchanged live) until Lucas approves this diff.
// core = GREATEST(output-with-gravity, bounded-def_core); def_core = FLOOR_pool + SPAN_pool*def_signal (LEAST cap),
// position-gated; def_signal = 0.55*def_share_pct + 0.45*duel_quality_pct (pool-scoped). Anchors recomputed
// from the NEW base distribution. Run: NODE_PATH=./node_modules node scripts/engine/stage2_diff.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const exec = async (sql) => { const { error } = await sb.rpc("exec_sql", { sql }); if (error) throw new Error(error.message); };

// ---- tunable bounding params (the ONLY dials) ----
const P = { FLOOR_D:44, SPAN_D:22, CAP_D:64,   // CB/FB/CDM def_core (Attempt 2, goals-primacy-true)
            FLOOR_M:32, SPAN_M:24, CAP_M:60,   // CM
            SPAN_A:12,                          // ST/Winger/CAM press bonus
            // Attempt 4: defender output-rarity boost , league-scaled (wt^E), capped. ONLY defensive pools.
            BOOST_K:0.45, BOOST_E:3.5, BOOST_CAP:12 };

const ENGINE = `
WITH scored AS (
  SELECT psc_1.id AS card_id, psc_1."position" AS pos, psc_1.minutes, psc_1.season_year,
    psc_1.goals::numeric + 0.7 * COALESCE(psc_1.assists, 0)::numeric AS gaw,
    (psc_1.goals::numeric + 0.7 * COALESCE(psc_1.assists, 0)::numeric) / NULLIF(psc_1.minutes::numeric/90.0, 0::numeric) AS gaw90,
    CASE WHEN psc_1.tackles_total IS NOT NULL THEN (COALESCE(psc_1.tackles_total,0)+COALESCE(psc_1.interceptions,0)+COALESCE(psc_1.tackles_blocks,0))::numeric / NULLIF(psc_1.minutes::numeric/90.0, 0::numeric) ELSE NULL::numeric END AS def90,
    CASE WHEN psc_1.duels_total >= 20 THEN psc_1.duels_won::numeric / psc_1.duels_total::numeric ELSE NULL::numeric END AS duel_rate,
    COALESCE(l_1.league_strength_weight, 0.80) AS wt
  FROM player_season_cards psc_1 LEFT JOIN leagues l_1 ON psc_1.league_id = l_1.id
  WHERE psc_1.minutes >= 300 AND psc_1.goals IS NOT NULL
), ref AS ( SELECT percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (scored.gaw::double precision)) AS gaw_ref FROM scored WHERE scored.pos <> 'GK'::text
), ranked AS (
  SELECT s.card_id, s.pos, s.minutes, s.season_year, s.gaw, s.gaw90, s.def90, s.duel_rate, s.wt,
    percent_rank() OVER (PARTITION BY s.pos ORDER BY s.gaw90) AS pos_pct,
    percent_rank() OVER (PARTITION BY (CASE WHEN s.pos='GK'::text THEN 1 ELSE 0 END) ORDER BY s.gaw90) AS abs_pct,
    percent_rank() OVER (PARTITION BY s.pos ORDER BY s.gaw) AS posvol_pct,
    percent_rank() OVER (PARTITION BY (CASE WHEN s.pos='GK'::text THEN 1 ELSE 0 END) ORDER BY s.gaw) AS absvol_pct,
    percent_rank() OVER (PARTITION BY s.pos ORDER BY s.minutes) AS rel_pct
  FROM scored s
), team_def AS (
  SELECT psc_t.team_id, psc_t.season_year, psc_t.league_code,
    SUM(COALESCE(psc_t.tackles_total,0)+COALESCE(psc_t.interceptions,0)+COALESCE(psc_t.tackles_blocks,0))::numeric AS team_def_actions,
    SUM(psc_t.minutes)::numeric AS team_minutes
  FROM player_season_cards psc_t
  WHERE psc_t.season_year >= 2016 AND psc_t.tackles_total IS NOT NULL AND psc_t.minutes > 0
  GROUP BY psc_t.team_id, psc_t.season_year, psc_t.league_code
), pool_ingr AS (
  SELECT r.card_id, pp."position" AS pool, r.def90, r.duel_rate,
    r.def90 / NULLIF(td.team_def_actions * 90.0 / NULLIF(td.team_minutes,0::numeric), 0::numeric) AS def_share
  FROM ranked r
    JOIN player_season_cards psc_s ON psc_s.id = r.card_id
    JOIN players p_s ON psc_s.player_id = p_s.id
    LEFT JOIN player_positions pp ON pp.api_player_id = p_s.api_player_id AND pp.season_year = psc_s.season_year AND pp.league_code = psc_s.league_code
    LEFT JOIN team_def td ON td.team_id = psc_s.team_id AND td.season_year = psc_s.season_year AND td.league_code = psc_s.league_code
  WHERE r.def90 IS NOT NULL AND r.pos <> 'GK'::text AND r.season_year >= 2016 AND pp."position" IS NOT NULL
), pool_pct AS (
  SELECT card_id, pool,
    CASE WHEN def_share IS NOT NULL THEN percent_rank() OVER (PARTITION BY pool ORDER BY def_share) ELSE NULL::double precision END AS def_share_pct,
    CASE WHEN duel_rate IS NOT NULL THEN percent_rank() OVER (PARTITION BY pool ORDER BY duel_rate) ELSE NULL::double precision END AS duel_quality_pct
  FROM pool_ingr
), pool_sig AS (
  SELECT card_id, pool, 0.55::double precision * def_share_pct + 0.45::double precision * COALESCE(duel_quality_pct, def_share_pct) AS sig
  FROM pool_pct
), base AS (
  SELECT r.card_id,
    (0.70::double precision * GREATEST(
        (0.65::double precision * ((0.50::double precision * (0.60::double precision * r.pos_pct + 0.40::double precision * COALESCE(r.abs_pct,0::double precision)) + 0.50::double precision * (0.60::double precision * r.posvol_pct + 0.40::double precision * COALESCE(r.absvol_pct,0::double precision))) * 100::double precision) + 0.35::double precision * ((100::numeric * r.gaw)::double precision / NULLIF(rf.gaw_ref, 0::double precision))
         + CASE WHEN ps.pool IN ('CB','FB','CDM') THEN LEAST(${P.BOOST_CAP}::double precision, ${P.BOOST_K}::double precision * r.gaw::double precision * power(r.wt, ${P.BOOST_E}::numeric)::double precision) ELSE 0::double precision END),
        COALESCE(CASE
            WHEN ps.pool IN ('CB','FB','CDM') THEN LEAST(${P.CAP_D}::double precision, ${P.FLOOR_D}::double precision + ${P.SPAN_D}::double precision * ps.sig)
            WHEN ps.pool = 'CM' THEN LEAST(${P.CAP_M}::double precision, ${P.FLOOR_M}::double precision + ${P.SPAN_M}::double precision * ps.sig)
            WHEN ps.pool IN ('ST','Winger','CAM') THEN ${P.SPAN_A}::double precision * ps.sig
            ELSE NULL::double precision END, 0::double precision)
      ) + (0.30 * LEAST(95::numeric, 100::numeric * (r.minutes::numeric / (r.minutes + 380)::numeric)))::double precision) * (1::numeric - (1::numeric - r.wt) * 0.5)::double precision AS b
  FROM ranked r CROSS JOIN ref rf LEFT JOIN pool_sig ps ON ps.card_id = r.card_id
  WHERE r.pos <> 'GK'::text
), anchors AS (
  SELECT (SELECT max(base.b) FROM base) AS btop,
    (SELECT base.b FROM base ORDER BY base.b DESC OFFSET 11 LIMIT 1) AS b95,
    (SELECT base.b FROM base ORDER BY base.b DESC OFFSET 149 LIMIT 1) AS b90,
    (SELECT base.b FROM base ORDER BY base.b DESC OFFSET 649 LIMIT 1) AS b85
), vv AS (
  SELECT r.card_id,
    CASE WHEN r.pos = 'GK'::text THEN GREATEST(0::double precision, LEAST(75::double precision, round((0.5::double precision * r.rel_pct * 100::double precision + (0.5 * LEAST(95::numeric, 100::numeric * (r.minutes::numeric/(r.minutes+380)::numeric)))::double precision) * (1::numeric - (1::numeric - r.wt) * 0.5)::double precision)))
      ELSE LEAST(100::double precision, GREATEST(0::double precision,
        CASE WHEN bs.b <= 80::double precision THEN round(bs.b)
          WHEN bs.b <= a.b85 THEN floor(80::double precision + (bs.b-80::double precision) * 5.0::double precision/(a.b85-80::double precision))
          WHEN bs.b <= a.b90 THEN floor(85::double precision + (bs.b-a.b85) * 5.0::double precision/(a.b90-a.b85))
          WHEN bs.b <= a.b95 THEN floor(90::double precision + (bs.b-a.b90) * 5.0::double precision/(a.b95-a.b90))
          ELSE floor(95::double precision + (bs.b-a.b95) * 2.0::double precision/(a.btop-a.b95)) END))
    END::integer AS rt_new
  FROM ranked r LEFT JOIN base bs ON bs.card_id = r.card_id CROSS JOIN anchors a
)
SELECT psc.id AS card_id, p.name AS player_name,
  regexp_replace(lower(unaccent(COALESCE(p.full_name,p.name))), '[^a-z0-9 ]'::text,''::text,'g'::text) AS player_name_norm,
  pp."position" AS position_pool, psc.season_year, psc.team_name, psc.goals, psc.assists, psc.minutes, vv.rt_new AS rt
FROM player_season_cards psc
  LEFT JOIN players p ON psc.player_id = p.id
  LEFT JOIN player_positions pp ON pp.api_player_id = p.api_player_id AND pp.season_year = psc.season_year AND pp.league_code = psc.league_code
  LEFT JOIN vv ON vv.card_id = psc.id`;

(async () => {
  console.log("params: " + JSON.stringify(P));
  await exec("drop table if exists engine_stage2_rt");
  await exec("create table engine_stage2_rt as " + ENGINE);
  await exec("create index on engine_stage2_rt (player_name_norm)");
  await exec("create index on engine_stage2_rt (position_pool)");
  await exec("notify pgrst, 'reload schema'");
  console.log("materialized engine_stage2_rt (live view UNTOUCHED).");
})().catch(e => { console.error("BUILD ERROR: " + e.message); process.exit(1); });
