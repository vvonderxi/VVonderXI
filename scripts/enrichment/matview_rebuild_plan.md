# MATVIEW REBUILD , PLANNING (read-only, 2026-08-11)

No SQL executed. No writes. Nothing committed. Branch `redesign-compare`.

---

## 0. WHAT I COULD NOT READ FROM HERE , and why that matters

**`exec_sql` returns `null`.** Verified live: `select 1 as one` came back `data: null`. It executes but
discards SELECT output. `.env` holds `SUPABASE_URL` + keys and **no Postgres connection string**, so there
is no psql/`pg` route either.

**Consequence: I cannot print `pg_get_viewdef` or `pg_indexes`.** §C says never to build a view edit from
the repo's `new_view.sql` copy because it has drifted repeatedly, so I have deliberately NOT quoted it.
Paste these two in the Supabase SQL editor before writing any migration:

```sql
select pg_get_viewdef('player_card_view'::regclass, true);
select indexname, indexdef from pg_indexes where tablename = 'player_card_mv' order by indexname;
```

The second one also settles the open trigram question (item 6), which is currently **inferred from timing,
not read from the catalogue**.

---

## 1. QUEUED FOR THIS SITTING

| item | requires | blast radius |
|---|---|---|
| Known-as name search | widen the `unaccent()` input to include the display name | matview DROP + CREATE |
| Percentile columns ("The Proof") | ~8 `percent_rank()` columns + **3 product decisions first** | matview DROP + CREATE |
| Trigram indexes | `pg_trgm` + 2 GIN indexes | **independent** , no rebuild |
| Coarse-position tail cleanup | `player_positions` writes | none , different table |
| Position-pool accuracy audit (§E) | `player_positions` writes | none , different table |

The first two share one DROP + CREATE. That is the entire reason they are one sitting.

---

## 2. CURRENT STATE (live, via PostgREST)

`player_card_mv` , **47 columns**, matching the §C note that the matview enumerates columns explicitly
rather than `SELECT *`.

`player_card_view` , **55 columns**. The 8 the view has and the matview does NOT:

```
def90 · defvol_pct · team_def90 · def_share · def_share_pct · def90_pool_pct · duel_rate · duel_quality_pct
```

**These are the Stage-0/1 defensive inspection columns.** They were appended to the view and never surfaced,
which is exactly the §C trap: appending to the view surfaces nothing because the matview's column list is
frozen. **They are proof the trap is real and already live in this database.** Decide during the rebuild
whether they come across or stay view-only.

Indexes: **NOT READABLE FROM HERE** , see §0. Documented as 8, including the UNIQUE `card_id` index that
`REFRESH CONCURRENTLY` depends on.

---

## 3. KNOWN-AS NAMES , the alias source already exists

**No sourcing needed. `players.name` IS the known-as name** and `players.full_name` is the legal one.
Columns confirmed live: `id, api_id, name, full_name, nationality, position, photo_url, ..., api_player_id,
date_of_birth, is_retired, is_legacy, legacy_tier, height_cm, preferred_foot`.

15,316 player rows. **12,732 have a display name that differs from the legal name.** The folded column is
built from `COALESCE(full_name, name)`, so for those the known-as name never enters the searchable text.

**COUNT DISCREPANCY , 333, not 134.** My simulation flags a player unreachable when no token of `name`
(3+ chars) appears anywhere in the folded legal name. That yields **333**. The doc says 134. I could not
reconcile them because the original simulation is not in the repo. **Establish which definition is intended
before quoting a number** , the shape of the problem is identical either way.

Representative shape:

```
Lucão        -> lucas alexandre galdino de azevedo
Pepe         -> kepler laveran de lima ferreira
Casemiro     -> carlos henrique casimiro
Fernandinho  -> fernando luiz roza
Raphinha     -> raphael dias belloli
Jorginho     -> jorge luiz frello filho
Fabinho      -> fabio henrique tavares
Mané         -> jose manuel jimenez ortiz
Jonny        -> jonathan castro otto
Morato       -> felipe rodrigues da silva
```

Brazilian and Portuguese mononyms dominate. **Casemiro, Fernandinho, Jorginho, Fabinho and Raphinha are not
searchable by the only name anyone uses.**

### NEW FINDING , HTML ENTITIES ARE STORED IN THE NAME COLUMNS

**55 player rows and 184 CARDS carry raw HTML entities**, e.g. `name = "N. O&apos;Reilly"`,
`"M&apos;Bala Nzola"` (rt78), `"D. D&apos;Ambrosio"` (rt74), `"C. N&apos;Doye"`.

- **This is a DISPLAY bug, not only a search bug.** `player_name` is what renders on the card face, so those
  184 cards show `M&apos;Bala Nzola` literally to a visitor.
- **`player_name_norm` is CLEAN** (0 of 184) , the fold strips the entity, so search already works. Only the
  displayed string is wrong.
- Unrelated to the known-as fix but sits in the same columns. **Fix it in the same sitting** , an
  `UPDATE players SET name = replace(name,'&apos;','''')` class of fix, plus the other entities. Cheap while
  the sitting is already open; another rebuild later if missed.

---

## 4. WHAT `tokenAndFilter` SEARCHES TODAY

From `vv-core.js`, per token, OR'd:

```
player_name_norm.ilike.%tok%     folded, built from COALESCE(full_name, name)   <- has the fold, lacks the known-as name
team_name_norm.ilike.%tok%       folded
player_name.ilike.%tok%          RAW, unfolded                                 <- has the known-as name, lacks the fold
position_pool.eq.X               when the token is a position word
league_code.eq.X                 when the token is a league word
```

Multiple tokens are AND'd across those OR groups.

**The defect in one line: one column has the fold but not the name, the other has the name but not the fold.
Neither branch can win alone.** Widening the `unaccent()` input so the folded column contains BOTH names
fixes it with no front-end change at all , `tokenAndFilter` already queries `player_name_norm`.

**If instead a NEW column were added** (say `alias_norm`), `tokenAndFilter` would need one extra branch, and
that is a `vv-core.js` edit , which means **bumping `?v=` in card.html, compare.html and rankings.html**
(§C, added 2026-08-11). Widening the existing column avoids that entirely and is the cheaper path.

---

## 5. PERCENTILE COLUMNS

Queued as ~8 `percent_rank() OVER (PARTITION BY <pool> ORDER BY stat/min*90)` columns appended to
`player_card_view`, then carried into the matview, then `rowToCard` carries them and `renderProof` fills
`.pctn`/`.pct`.

**THREE PRODUCT DECISIONS GATE THIS. They must be settled BEFORE the sitting or the rebuild ships the wrong
columns:**

1. **Pool** , `position_pool` (8-bucket) or coarse `position` (DEF/MID/FWD/GK)?
2. **Cross-league or per-league** , the engine's existing percentiles are GLOBAL. Copy must read
   *"vs the position pool 2015+"*, never *"in the league"*.
3. **Minutes threshold** for pool membership, to exclude tiny-sample noise.

Pre-2015 and GK resolve to NR. **The position programme is still running**, and `position_pool` is its
output , percentiles partitioned by a bucket that is still changing would need recomputing afterwards.
That is an argument for either settling positions first or partitioning on the coarse column.

---

## 6. TRIGRAM INDEXES , independent, and cheap

Measured `1.7s cold / 150-700ms warm` over 57,234 rows. `ilike '%tok%'` has a leading wildcard so no btree
can serve it.

**Verify first** (§0 query) , the "no trigram index" claim is inferred from timing, not read. If confirmed
absent: `create extension if not exists pg_trgm;` plus two GIN indexes on `player_name_norm` and
`team_name_norm`.

**Indexes can be added to a matview WITHOUT rebuilding it.** So this ships first, alone, reversibly, and
**it is the only item here that is safe to do while the site is live.** Build cost on 57k rows is small; use
`CREATE INDEX CONCURRENTLY` so it does not lock reads.

---

## 7. MIGRATION ORDER

```
PHASE 0  READ          pg_get_viewdef + pg_indexes from the SQL editor. Save both verbatim.
                       Nothing below is safe without them , the 8 index definitions must be
                       recreated exactly, including the UNIQUE card_id index.

PHASE 1  INDEPENDENT   pg_trgm + 2 GIN indexes, CONCURRENTLY. No rebuild. Reversible.
                       Ship and verify separately, before touching the view.

PHASE 2  DECIDE        the 3 percentile product decisions. No SQL.

PHASE 3  VIEW          CREATE OR REPLACE VIEW player_card_view , APPEND-ONLY.
                       Widen the unaccent() input; append the percentile columns.
                       Column ORDER must be preserved; replace can only append (§C).
                       rt is untouched, so this is rt-safe on its own.
                       AT THIS POINT NOTHING HAS CHANGED FOR THE SITE , the matview
                       still serves the old frozen column list.

PHASE 4  MATVIEW       DROP + CREATE player_card_mv, then recreate ALL 8 indexes.
                       *** THIS IS THE ONLY DESTRUCTIVE STEP AND THE ONLY OUTAGE ***

PHASE 5  VERIFY        row count 57,234; column count 47 + new; spot-check that
                       Casemiro/Jorginho/Fernandinho now return rows; re-run search-demo.html.

PHASE 6  OPTIONAL      HTML-entity cleanup on players.name, then REFRESH (no rebuild needed).
```

**Append-only vs destructive:** Phase 3 is append-only and reversible. **Phase 4 is the destructive one** ,
`CREATE OR REPLACE` cannot add columns to a matview, and Postgres has no `ALTER MATERIALIZED VIEW ... ADD
COLUMN`. A `REFRESH` will NOT pick up new columns; the stored query is frozen at creation.

---

## 8. WHAT CAN BREAK, AND WHEN

- **THE SITE IS DOWN BETWEEN DROP AND CREATE.** Every page reads `player_card_mv` directly from the browser
  , rankings, compare, card. There is no fallback and no cache. A DROP leaves the anon role querying a
  relation that does not exist: **hard errors, not degraded results.** Do it at low traffic.
- **`REFRESH CONCURRENTLY` breaks until the UNIQUE `card_id` index is back.** Recreate indexes in the same
  transaction as the CREATE if possible, and never leave the matview live without that index.
- **RLS / GRANTS are the easy thing to forget.** A dropped matview loses its grants. If the anon role's
  SELECT is not re-granted, **the site 404s or returns empty with no error** , and per §C a denied SELECT
  under RLS returns `{data:[],error:null}`, i.e. it looks like "no results", not like a fault. Verify with a
  positive control using the ANON key, not the service key.
- **The 8 view-only defensive columns** (§2) are a live example of the frozen-column trap. Decide
  deliberately whether they cross over.
- **`position_pool` is changing under us right now** , the Transfermarkt bulk fetch is still writing
  positions. Percentiles partitioned by it would be computed against a moving target.
- **`search-demo.html` is the regression harness** , re-run it after Phase 4. Its "current" side replicates
  pre-`bffc15e` behaviour and will look wrong if not re-read first.
- **No front-end change is needed if the existing column is widened.** If a NEW column is added instead,
  `vv-core.js` changes and `?v=` must be bumped on every shipping surface that loads it. GREP, DO NOT COUNT: `grep -l 'vv-core.js\|vv-marks.js' *.html` , it was three pages when this was written and it is five now.
