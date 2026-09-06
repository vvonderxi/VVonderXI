# DB-HYGIENE SITTING (extracted from CLAUDE.md §D PARALLEL, 2026-08-09)

**Read this when a DB sitting actually starts, NOT during a front-end session.** Extracted under the CLAUDE.md stage-file rule. **CLAUDE.md wins on any conflict.**

## THE ONE THING TO KNOW BEFORE PLANNING THIS SITTING

**The known-as-names fix and the percentile columns SHARE a matview DROP + CREATE, so they are ONE SITTING, not two.**

A matview query is FROZEN at creation (§C), so neither can be added by `REFRESH`. Both force a **DROP + CREATE of `player_card_mv` plus its 8 indexes** , including the UNIQUE `card_id` index that `REFRESH CONCURRENTLY` depends on. That is hands-on production DB work on the table the whole site reads, and doing it twice pays the risk twice for no benefit.

- **Known-as names** (item 1 below) , widen the existing `unaccent()` input so 134 unreachable players become searchable.
- **THE PROOF , percentile columns** , ~8 `percent_rank()` columns. **Full spec is in `POST_LAUNCH.md`**, not here; it is gated on three product decisions (pool / cross-league vs per-league / minutes threshold) that must be settled BEFORE the sitting, or the DROP+CREATE happens with the wrong columns.

**Trigram indexes (item 2) are INDEPENDENT** , indexes can be added to a matview without rebuilding it, so that one can ship first and alone. Verify the index catalogue before spending effort; the "no trigram index exists" claim is inferred from cold-scan timing, not read from `pg_indexes`.

**Also in scope for the same sitting if convenient:** the coarse-position tail cleanup, and the position-pool accuracy audit (§E) , both are `player_positions` work.

---

## §D PARALLEL , search follow-ups (full text as it stood at extraction)

- **SEARCH FOLLOW-UPS (logged 2026-08-07 after `bffc15e` shipped multi-field + match-count specificity). Neither is blocking , search now reaches the whole 57k instead of half of it. Recorded here because both were living ONLY in a code comment, which nobody reads until it breaks.**
  1. **KNOWN-AS NAMES NOT SEARCHABLE , 134 players unreachable by the name everyone uses. RE-SCOPED READ-ONLY 2026-08-07: THIS IS NOT AN ACCENT BUG. Do not re-scope it as one.**
     - **WHAT IS ALREADY CORRECT, so nobody re-derives it:** `player_name_norm` is ALREADY accent-folded , the view builds it as `regexp_replace(lower(unaccent(COALESCE(full_name, name))), ...)`. **The CLUB side needs NO work at all**, `team_name_norm` gets the same `unaccent()` (verified live: `münchen`/`munchen` both -> 320 rows, `beşiktaş`/`besiktas` both -> 342, `atlético`/`atletico` both -> 326). **Typed accents ALSO already work** , `vvNorm` folds the QUERY, so `Paquetá` and `Paqueta` produce the identical token today.
     - **THE ACTUAL DEFECT , one column is folded but lacks the name, the other has the name but is not folded.** The folded column is built from the **LEGAL name only**, so the known-as name never enters it: `Álex Grimaldo` -> `alejandro grimaldo garcia`, `Lucas Paquetá` -> `lucas tolentino coelho de lima`, `Trézéguet` -> `mahmoud ahmed ibrahim hassan`. `bffc15e` added the raw `player_name` column as a second branch to reach the known-as name, **but that column is UNFOLDED**, so `alex` never matches `Álex`. Neither branch alone can win.
     - **THE FIX: WIDEN THE EXISTING `unaccent()` INPUT to include the display/known-as name.** One clause , the fold is already there, you are only changing what goes into it. NOT a rewrite, NOT new folding. Simulated across all 15,289 players: **134 unreachable -> 0**. Still broken today: Nenê rt89, Borja Bastón rt86, Álex Grimaldo rt85, Fernandão rt83, Trézéguet rt81, Lucas Paquetá rt79, Álex Baena rt79.
     - **COST IS THE BLAST RADIUS, NOT THE EXPRESSION. A matview's query is FROZEN at creation (§C), so this forces a DROP + CREATE of `player_card_mv` PLUS its 8 indexes**, including the UNIQUE `card_id` index `REFRESH CONCURRENTLY` depends on. **This is HANDS-ON PRODUCTION DB WORK on the table the whole site reads , it belongs in the DB-hygiene sitting, NOT in a front-end session, and it is NOT a client-side fix.** **PAIR IT with the percentile columns in §D DEFERRED "THE PROOF"** so the DROP+CREATE is paid ONCE.
     - **TWO ALTERNATIVES SCOPED AND REJECTED (2026-08-07) , do not re-propose them.** (a) **A client-side fold CANNOT work: matching is SERVER-side.** `tokenAndFilter` feeds `.or()` on the PostgREST query in BOTH `buildRankQ` and `buildPoolQ`; `CARDS`/`POOL` come from `res.data`, i.e. rows the server ALREADY filtered. Proven: `paqueta` and `Paquetá` both return **0 rows from the server**, so there is nothing for the client to fold. Compare's client re-filter can only REMOVE rows, never add them. (b) **RPC** , `search_players(q)` **already EXISTS and is unused** (confirms the §C note), but it returns nested player objects with embedded `season_cards`, incompatible with `rowToCard`, and it does not fold either (`paqueta` -> 0). A new function would also have to absorb every filter the rankings query composes (league, position, era, rt, season), because PostgREST chaining is lost inside an RPC. (c) A side lookup table (`api_player_id` -> pre-folded text, 15,289 rows, **931 KB**) works and needs no matview change, but adds a round trip, a refresh path, and blows the URL length on broad `.in()` id lists.
  2. **TRIGRAM INDEXES , search is a SEQUENTIAL SCAN.** `ilike '%tok%'` has a leading wildcard, so no btree index can serve it. Measured: **1.7s cold, 150-700ms warm** over 57,234 rows. `pg_trgm` GIN indexes on `player_name_norm` + `team_name_norm` would fix it, and **indexes CAN be added to a matview without rebuilding it**, so this is INDEPENDENT of item 1 and can ship first.
     - **VERIFY BEFORE SPENDING EFFORT , the "no trigram index exists" claim is INFERRED from the cold-scan timing, NOT read from the catalogue.** The `exec_sql` RPC discards SELECT output, so it could not be confirmed from Terminal A. **Paste this in the Supabase SQL editor first:**
       ```sql
       select indexname, indexdef from pg_indexes
       where tablename = 'player_card_mv' order by indexname;
       ```
       **EXPECT:** 8 rows, none mentioning `gin_trgm_ops`. If a trigram index IS already there, the slowness is something else and this item is void , do not add duplicates.
     - If confirmed absent, the fix is two statements (plus `create extension if not exists pg_trgm;`). Non-destructive, no rebuild, no refresh needed.
- **`search-demo.html` (repo root) is a TRACKED QA HARNESS, not a page.** Nothing links to it and it is not in the nav. It renders CURRENT vs PROPOSED search side by side against the live matview, with preset queries, and reports match count, specificity verdict, round trips and which rows the old logic could not reach. **Use it to re-verify search behaviour after ANY change to `tokenAndFilter` / `buildRankQ` / `buildPoolQ` / the compare client re-filter.** Its "current" side is a deliberate replica of pre-`bffc15e` behaviour , if production changes again, that replica goes stale and the comparison becomes misleading, so re-read it before trusting it.
