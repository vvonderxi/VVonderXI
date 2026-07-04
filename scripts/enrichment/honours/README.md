# Honours pipeline (Tier 1)

Preserved from the 2026-07-04 Tier-1 honours write. Reusable for **Tier 2** (domestic cups excluded per
CLAUDE.md §C; player-level accolades like World Cup Winner are career-context, not season tags). Same run
conventions as `../` (repo root, `NODE_PATH=./node_modules`, `.env` service key, supabase-js).

## Input
`honours_tier1_clean.csv` (304 rows) , CCC/Wikipedia-sourced: league_champion, ucl_winner, ballon_dor,
golden_boot. Columns: `honour_type, season, league, team, player_name, goals, context`.

## Pipeline order
1. `honours_prep.js` / `honours_prep2.js` , READ-ONLY: confirm `honours` schema (note the column is
   `honour_context`, not `context`; a `goals` column is required), inspect `players`, verify team-map
   targets in `player_card_view.team_name`, validate the player-resolution path.
2. `honours_dryrun.js` , normalize teams (map + verify vs `player_card_view`), resolve players to
   `api_player_id` (tiered: exact norm -> token-subset via surname/first buckets -> surname+initial;
   norm folds ß/ø/ł/đ), split "A / B" ties, map season "2011/12"->2011 and league->code, detect skips
   (no team AND no player). Writes `honours_prepared.csv` and prints (a) unmatched teams, (b) unresolved
   players, (c) skipped, (d) row count. NO writes.
3. `honours_verify.js` , READ-ONLY: pin ambiguous/collision cases against live cards (used to confirm
   Rodri=44, Salah=306, Mané=304, Cardozo=70475).
4. `honours_write.js` , INSERT `honours_prepared.csv` into `honours` (aborts if table already populated,
   to avoid duplicate inserts) + prints totals-by-type and the Messi 11/12 / Barcelona 10/11 spot-checks.

## Resolver notes / gotchas
- `honours` is a STANDALONE tag table , it does NOT feed `player_card_view`/`rt`, so **no matview refresh**
  is needed after an honours write.
- Team map extended during this run: `Roma -> AS Roma`, `Istanbul Basaksehir -> Başakşehir`, `KRC Genk -> Genk`
  (+ the originally-specified forms). `Union SG` is written without a card link (small club, not in dataset).
- Hand-verified overrides live in `honours_dryrun.js` `API_OVERRIDE`/`TEAM_OVERRIDE` (Rodri/Salah/Mané +
  the 3-player/2-team golden-boot tie). Extend these for Tier 2 as CCC surfaces new ambiguities.
- 5 golden-boot scorers resolved by unique name but could not be card-verified (club not in our dataset):
  Cardozo 70475 (verified correct), Undav 26475, Lepaul 163004, Bertaccini 129126, Harbaoui 8628
  (team string `"Anderlecht & Zulte Waregem"` left as-is).

## Result of this run
314 rows written: 143 league_champion, 16 ucl_winner, 14 ballon_dor, 141 golden_boot.
