-- ═══════════════════════════════════════════════════════════════════════════
-- CACHE INVALIDATION STAMPS , verdict_cache + notes_cache
-- Paste into the Supabase SQL editor. Additive, nullable, no backfill.
-- NO matview refresh needed (player_card_mv is untouched, rt does not move).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHY: both caches served content forever with no invalidation. Measured
-- 2026-07-29: 47 of 70 verdict rows cite VV scores that are no longer the
-- live rt (Garnacho 2023 cached as 79, live 71). The prose is served next to
-- FRESH scores, so the panel contradicts itself.
--
-- WHAT: stamp each cached row with the inputs its prose was written against.
-- On read, a stamp that disagrees with live data is a MISS, so the row
-- regenerates. Legacy rows carry NULL stamps and are ALWAYS a miss, so they
-- self-heal lazily on next view , no bulk delete, cost spread across real
-- traffic, and only rows someone actually looks at are ever regenerated.
--
-- rt is a WHOLE NUMBER on player_card_mv (verified: 0 fractional values in a
-- 2,000-row sample, range 11-97). It only ever moves in whole points, so
-- smallint is exact and there is no rounding step to add.

-- ── verdict_cache ──────────────────────────────────────────────────────────
-- rt_a / rt_b bind to card_id_a / card_id_b, which are the CANONICAL lo/hi
-- card ids (pair_key = min-max), NOT the requester's A/B slot order. The
-- writer maps through the same `swapped` flag already used for the verdict
-- payload.
alter table verdict_cache
  add column if not exists rt_a          smallint,
  add column if not exists rt_b          smallint,
  add column if not exists cache_version text;

-- ── notes_cache ────────────────────────────────────────────────────────────
-- rt is kept as its own readable column for inspection ("which score was this
-- written against"); stats_hash is the complete signal , a sha256 prefix over
-- the exact `player` payload the prompt cites (name, season, age, club,
-- league, position, goals, assists, rt, sorted tags), so ANY cited stat
-- changing invalidates, not just rt.
alter table notes_cache
  add column if not exists rt            smallint,
  add column if not exists stats_hash    text,
  add column if not exists cache_version text;

-- ── verify ─────────────────────────────────────────────────────────────────
-- select count(*) filter (where rt_a is null) as unstamped_verdicts from verdict_cache;
-- select count(*) filter (where stats_hash is null) as unstamped_notes from notes_cache;
-- Expect 70 and 249 immediately after this migration; both drift to 0 as
-- cards are viewed. Nothing is deleted.
