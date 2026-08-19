-- STEP 8 , LAST, AND ONLY AFTER THE IMPORTER CHANGE IS COMMITTED.
-- HARD DEPENDENCY: api/import-players.js still writes penalties_won in its card payload.
-- Drop this column before that code changes and the NEXT importer or backfill run fails on
-- every insert with "column penalties_won does not exist".
--
-- WHY IT GOES: 1,701 non-null rows (2.97%), and NOT ONE of them is 0, so NULL conflates
-- "won none" with "not recorded" and the column cannot be read at all. 3,232 rows scored a
-- penalty and are NULL here; only 438 carry both, so 88% of penalty scorers have no value.
-- Nothing reads it: not on the view, not on the matview, grep finds only writers.
ALTER TABLE public.player_season_cards DROP COLUMN penalties_won;
