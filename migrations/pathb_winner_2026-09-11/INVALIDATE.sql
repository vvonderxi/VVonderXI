--  PATH B , DELIBERATE INVALIDATION OF verdict_cache (written 2026-09-11, NOT YET RUN)
--
--  WHY NOT RELY ON THE FINGERPRINT. VERDICT_VERSION is PROMPT_REV + fingerprint(VERDICT_SYSTEM),
--  so editing the prompt already makes every row fail staleVersion and regenerate. That is
--  enough for the PROSE and is NOT enough for the DECISION: winner_card_id is a separate
--  column, it is read straight out of the row, and 97 of the 110 rows carry a Path A winner
--  computed from the two VV Scores. A row that is stale on prose still hands the front end a
--  crown, and Path B may reach the opposite verdict on the same pair. Nulling it is the point.
--
--  WHAT THIS DOES, and it is reversible from the backup beside this file:
--    cache_version -> NULL   marks the row UNSTAMPED, which analyse.js already treats as a
--                            miss (`unstamped` at api/analyse.js), so it regenerates on demand
--    winner_card_id -> NULL  removes the Path A decision so nothing can serve it in the window
--                            between this running and the row being regenerated
--  The prose is deliberately LEFT IN PLACE. It is never served (unstamped is a miss) and it is
--  the only record of what Path A said about these 110 pairs.
--
--  SEQUENCING , READ BEFORE RUNNING. This should run AFTER Path B has been validated, not
--  before. The moment it runs, every one of these pairs regenerates under the new prompt for
--  whoever opens it next. Running it against an unvalidated prompt means the first readers are
--  the experiment.
--
--  BACKUP: verdict_cache_backup_2026-09-11.json in this directory, 110 rows, 285,032 bytes,
--  captured with the service role immediately before this file was written.

BEGIN;

--  assert the population before touching it , if this is not 110, STOP and re-read
SELECT count(*) AS rows_total,
       count(winner_card_id) AS rows_with_path_a_winner
FROM verdict_cache;

UPDATE verdict_cache
   SET cache_version  = NULL,
       winner_card_id = NULL;

--  expect: 110 rows, 0 with a winner, 0 stamped
SELECT count(*) AS rows_total,
       count(winner_card_id) AS rows_with_winner,
       count(cache_version) AS rows_stamped
FROM verdict_cache;

COMMIT;
