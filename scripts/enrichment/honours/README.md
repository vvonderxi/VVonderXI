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

## top_assists (computed from our own data)
`compute_top_assists.js` (read-only validation + coverage report) -> `top_assists_write.js` (write) ->
`migrate_top_assists.js` (move counts from honour_context into the numeric `assists` column).
- Per league-season, aggregate assists per player (sum across cards, so mid-season transfers aren't
  split; NR treated as 0), take the max. Write `honour_type='top_assists', source='computed'`.
- CREDIBLE CUT: only write league-seasons with max >= 9. A sub-9 "leader" means sparse coverage, not a
  real honour , 41 thin-coverage league-seasons (pre-2015 + Belgian/Turkish/early Portugal-Eredivisie)
  are EXCLUDED. Ties at the max are all written (shared honour), like golden_boot.
- Validation gate: computed max-goals cross-checked vs the written golden_boot rows (120/127 api match);
  known assist leaders confirmed (De Bruyne PL 19/20 = 20, Messi LL 19/20 = 21).
- 120 rows written across 103 league-seasons (14 with ties). Because it's computed-from-our-data, it
  honestly reflects exactly where our assist coverage is real.
- The `assists` numeric column was added to `honours` for this (golden_boot uses `goals`).

## player_of_season (CCC)
`pots_dryrun.js` (resolve + validate) -> `pots_write.js` (guarded insert). Input `pots_final.csv` (102 rows,
7 leagues 2010/11-2024/25, Rule A "continuous best player per league"; Kroos 2017/18 excluded , Real
Madrid, not a Bundesliga club). Tiered resolver, disambiguated on league+season card existence (no team
column). `honour_context` = award_name + era note (era-correct name matters: PFA vs PL POTS). 101/102
resolved; 1 unresolved (Theo Janssen, not in players). Overrides: Otávio->380, Karim El Ahmadi->2713.

## world_cup_winner (CCC, player-level accolade)
`wc_dryrun.js` -> `wc_write.js`. Input `world_cup_winners.csv` (95 players, 4 squads). PLAYER-LEVEL career
accolade , attaches to the player, surfaces as context on ALL their season cards; does NOT feed rt and is
NOT a season tag. `season_year` = tournament year (2010/14/18/22); `honour_context` = country; NO
league_code / NO team_name. WRITE ONLY where the player resolves to a CARD in our DB (a squad member with
no card is skipped). 93/95 written; 2 genuinely uncarded (Höwedes, Franco Armani).

## Resolver lesson (applies to all batches)
Dual-surname / suffix DB name forms defeat last-token surname bucketing: Spanish paternal+maternal
("Casillas Fernández", "Puyol i Saforcada", "Hernández Creus"=Xavi) and Arabic ("El Ahmadi Al Aroos").
Patched per-batch via hand-verified `API_OVERRIDE` maps (see each `*_dryrun.js`). A token-anywhere match
would generalize this , backlog.
