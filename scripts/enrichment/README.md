# Enrichment pipeline , position + assist standardization

Preserved from the 2026-07-04 "Standout" (rt80-84) big-club sweep. These scripts were authored in a
`/tmp` scratchpad and reference absolute `/tmp/.../scratchpad` paths internally (a `SCRATCH` const or
argv) , kept verbatim for provenance. To re-run: adjust paths, run from repo root with
`NODE_PATH=./node_modules` so the repo's `.env` (Supabase `SUPABASE_SERVICE_KEY`) and `@supabase/supabase-js`
resolve. All DB access is via supabase-js (PostgREST).

## Pipeline order
1. `pull_8084.js` , READ `player_card_view` (rt 80-84, 41 big clubs, coarse/CM positions) -> `pull_8084.csv`.
2. `classify.js` , 8-bucket judgment map + regista->CDM / false-9->ST rules + REVIEW->HIGH triage;
   self-checks coverage -> `positions_HIGH.csv` / `positions_REVIEW.csv`.
3. `write_positions.js` , guarded write of the 169 HIGH (INSERT if no `player_positions` row / UPDATE
   where `position='CM'`) + spot-check.
4. `write_positions2.js` , batch-2: 46 from-knowledge REVIEW cards (UPDATE guard = `position IN` coarse+CM).
5. `write_positions3.js` , batch-3: 34 CCC-verified REVIEW cards; positions + FILL-ONLY assists
   (`player_season_cards.assists WHERE assists IS NULL`; card_id = `player_season_cards.id`).
6. `probe_schema.js` / `probe_assists.js` , read-only schema + fill-state probes.

## Guardrails baked into the write scripts
- INSERT via upsert `ignoreDuplicates` (= `ON CONFLICT DO NOTHING`).
- UPDATE guarded by `.in('position', [DEF,MID,FWD,GK,UNK,CM])` , a curated 8-bucket is NEVER overwritten.
- Assists are fill-only (`WHERE assists IS NULL`).
- Matview refresh is NOT possible via supabase-js (no RPC); after any write run
  `REFRESH MATERIALIZED VIEW player_card_mv;` in the Supabase SQL editor.

## known_players.csv , THE REUSABLE DICTIONARY (248 entries)
Schema: `api_player_id, season_year, position, source, classified_date`.
Keyed by `(api_player_id, season_year)` , league-agnostic. `source` provenance tiers:
`auto+rule` (169, the HIGH auto-classified set), `knowledge` (45), `ccc` (34).
Apply DB-wide later to fix the API-Football "CM" bug tail below rt80 WITHOUT re-judging known players.
