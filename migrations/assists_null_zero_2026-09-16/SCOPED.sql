--  ASSISTS , NULL THAT MEANS ZERO (scoped 2026-09-16, NOT RUN)
--
--  WHY. The importer wrote a zero-assist season as NULL until part-way through 2023 and as 0
--  from 2024. Measured: 2021 and 2022 contain ZERO rows with assists = 0, while 2024 contains
--  1,558. The card therefore renders NR , "we did not record this" , for a number we know.
--  Calvert-Lewin 20/21 is the reported case: 16 goals, 72 shots, 18 key passes, assists NULL.
--
--  THE TEST FOR "WE KNOW IT" IS THE DETAIL BLOCK. passes_key is populated only when the
--  provider's detailed block arrived for that card. Block present + assists NULL means the
--  block said zero. Block absent means we genuinely have nothing, and NR is correct there.
--
--  POPULATION: 11,015 rows. The genuine gap that must KEEP its NULL is 20,025 (16,364 pre-2015,
--  3,661 from 2015 on).

BEGIN;

--  assert the population before touching it , if this is not 11015, STOP and re-measure
SELECT count(*) AS to_fix
FROM player_season_cards
WHERE assists IS NULL AND passes_key IS NOT NULL;

--  and the population that must NOT move
SELECT count(*) AS genuine_gap_left_alone
FROM player_season_cards
WHERE assists IS NULL AND passes_key IS NULL;

UPDATE player_season_cards
   SET assists = 0
 WHERE assists IS NULL
   AND passes_key IS NOT NULL;

--  after: zero rows should remain in the fixed shape
SELECT count(*) AS should_be_zero
FROM player_season_cards
WHERE assists IS NULL AND passes_key IS NOT NULL;

COMMIT;

--  THEN, AND NOT OPTIONALLY:
--    1. refresh player_card_mv (SQL editor's lane , the refresh exceeds the service role's
--       statement_timeout and cannot go through exec_sql)
--    2. REGENERATE RADAR_POOL_REF , see the README. This write MOVES the radar.
