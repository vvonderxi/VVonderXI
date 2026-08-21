# Repartition + gaw penalty , applied 2026-08-21, ONE pass

Both changes landed in a SINGLE `create or replace view public.player_card_view`.
Section C requires it: two rescales applied in sequence leave no clean baseline to
measure either against, and these two push Standout in OPPOSITE directions
(repartition alone 812 -> 749, gaw alone 812 -> 837, together 762). Applied
separately, each would have looked like it was undoing the other.

## What changed, exactly two things

1. **Repartition.** `pos_pct` and `posvol_pct` now partition on `COALESCE(s.pool, s.pos)`
   where `pool` is the 8-bucket `player_positions."position"`, instead of the coarse
   `psc.position`. CB stops being ranked against FB; strikers stop being ranked against
   wingers. `rel_pct`, `abs_pct`, `absvol_pct` and the defensive pool are UNTOUCHED.
2. **gaw penalty, guarded.** `gaw` and `gaw90` become
   `goals - 0.22 * LEAST(COALESCE(penalties_scored,0), goals) + 0.7 * COALESCE(assists,0)`.
   A penalty is worth 0.78 of a goal. The `LEAST` guard means no card is ever docked for
   more penalties than it scored goals, which matters for the 28 impossible rows logged
   in CLAUDE.md section E.

## Files

- `capture_2026-08-21T18-29-50.sql` , the viewdef BEFORE, captured and md5-verified
  against live (41346d3f) before anything was written. This is the rollback: feed it back
  through `create or replace view public.player_card_view as <body>`.
- `01_view_repartition_and_gaw.sql` , the body that was applied. Live viewdef went
  11,915 -> 12,440 chars, md5 7622c800.

## Asserted, not assumed

Predicted read-only from the combined model FIRST, then applied, then checked against
those predictions on eleven counts. All eleven passed, including the exact number of
cards that move:

    rows 57,234 | null rt 3,061 | rt range 11-97 | cards moved 26,618
    Generational 12 | Iconic 138 | World Class 500 | elite 650 | Standout 762
    band crossings 390

Snapshots were full, 57,234 rows before and after, each read back off disk and asserted
row-for-row before being trusted.

## What this does NOT include

Tag recalibration. The thresholds were cut against the old distribution and have not been
re-measured. See the section C entry: do not quote any pre-2026-08-21 tag percentage as
current.
