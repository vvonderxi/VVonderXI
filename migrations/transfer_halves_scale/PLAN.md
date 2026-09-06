# TRANSFER HALVES AT SCALE , SCOPE ONLY. NOT RUN. Scoped 2026-09-04.

Follows the staged pattern that worked on the three by hand
(`migrations/transfer_halves_2026-08-29/PLAN.md`): capture, snapshot, one transaction,
refresh, diff, assert. Nothing here is applied.

---

## 1. HOW MANY, AND HOW THEY ARE IDENTIFIED , THE HONEST ANSWER IS THAT WE DO NOT KNOW YET

**There is no per-card halved flag, and ~1,600 is not a count.** `INGESTION_RECOVERY.md` is
explicit: *"Extrapolated ~1,600 cards across 144 league-seasons , an ORDER from a three-season
sample, NOT a count."* It rests on 34 of 51 splits verified against the provider in PL 2023/24,
PL 2025/26 and SA 2023/24. **Any plan that opens by asserting 1,600 cards is asserting an
extrapolation.**

**TWO INTERNAL SIGNALS EXIST AND NEITHER IS A COUNT.** Both were measured:

| signal | hits | why it is not the answer |
|---|---|---|
| same normalised name + season + league under >1 api id | **174 player-seasons, 353 cards** | catches genuine splits (B. Soumaré 19/20 L1: 379m + 1216m) but also two DIFFERENT players sharing a common name , `murilo`, `nunosantos`, `marcospaulo` all appear twice in PRT |
| season under 55% of that player's own minutes median | **5,600 cards** (5,186 scored) | mostly injuries, benchings, and moves out of the nine covered leagues. A candidate POOL, not a defect list |

**THE PROVIDER IS THE ONLY AUTHORITY, WHICH §C ALREADY SAYS.** The three-card repair was
re-done against API-Football precisely because *"our own data cannot authenticate our own
data."* A card is halved if and only if the provider returns MORE THAN ONE block for that
player-season-league and the stored row matches only one of them.

**SO THE COUNT IS AN OUTPUT OF THE RUN, NOT AN INPUT TO IT.** Stage 1 below produces it, and
it is a read-only pass that writes nothing.

---

## 2. COST , MEASURED FROM `import_progress`, NOT ESTIMATED

`import_progress` records **144 league-seasons totalling 5,115 pages** across 16 seasons
(2010-2025) and 9 leagues, averaging 35.5 pages per league-season.

| route | calls | API time at DELAY_MS 320 | share of one day |
|---|---|---|---|
| **full re-scan** (`/players?league=&season=&page=`) | **~5,115** | **~57 min** | Ultra 6.8% · Pro 68% |
| targeted `/players?id=&season=` on the 5,600-card pool | ~5,600 | ~62 min | similar |

**TAKE THE FULL RE-SCAN.** It is fewer calls than the targeted pass, and the targeted pass has
false NEGATIVES by construction: a halved season belonging to a player whose minutes median is
already low never enters the pool. The re-scan sees every player-season in the covered leagues
and cannot miss one.

**This is well inside one day on any paid plan.** It is not a reason to keep or restore Ultra.

---

## 3. WHAT MOVES, AND WHETHER A BAND ANCHOR SHIFTS

**A halved card is UNDERSTATED, so every repair RAISES a score. Nothing falls except by
displacement.**

**THE BAND ANCHORS HOLD BY CONSTRUCTION, AND THAT IS THE POINT TO BE CAREFUL ABOUT.** Measured
today on `player_card_mv`: **95+ = 12, 90+ = 150, 85+ = 650.** These are RANK-anchored counts,
not score thresholds, so after the refresh they will still read 12 / 150 / 650. **The count
holding is not evidence that nothing moved , it is guaranteed.** What changes is MEMBERSHIP:
every repaired card that climbs into a band pushes the lowest-ranked card out of it.

**The exposure at the edges is small.** Of the 5,600-card candidate pool, the number sitting in
the band just below each anchor is **0, 0, 0 and 1** for 95 / 90 / 85 / 80 respectively ,
halved seasons score low, so few of them are near the top bands. **The ripple is far more likely
among UNTOUCHED cards being displaced than among repaired ones arriving.**

**WHAT THIS REPAIR IS ACTUALLY FOR: the career-stage tags.** Peak is winner-takes-all, so a
halved season names the WRONG YEAR, not merely a lower number. Measured on the 330 Peak tags:

- **38 (11.5%) are currently TIED** , two seasons at the identical score, resolved only by the
  earliest-season tie-break. These can move on any repair at all.
- **152 (46%) have a runner-up within 3 points.**
- 79 have a margin above 8 and are effectively immovable.

---

## 4. WHAT WOULD BE ASSERTED

**Before, and the run aborts if any fails:**
1. Full row capture of every card the run will touch, written to a timestamped file, **read
   back off disk and asserted non-empty**. Deletes are otherwise irreversible.
2. **Snapshot ALL scored cards** from `player_card_mv` (`card_id, rt`), paginated past the
   1000-row cap, read back and asserted row-for-row. A target-only snapshot cannot see a ripple.
3. `resolveSeasonStat()` returns `_shape:'summed'` with `_blocks >= 2` for every card queued.
   **Anything else is not a half and must not be written.**

**After:**
4. **Band anchors read exactly 12 / 150 / 650.** Stated as a guard against the arithmetic
   breaking, NOT as evidence the run was correct , they hold by construction.
5. **Every untouched card that crossed 95 / 90 / 85 / 80 is listed by name**, in both
   directions. Displacement is expected; silent displacement is not.
6. **Every repaired card's minutes strictly INCREASED.** A repair that lowers minutes means the
   wrong block was taken.
7. **`UNIQUE (api_player_id, season, league_code)` holds** , exactly one card per player-season
   -league afterwards, confirmed per `api_player_id`.
8. **No card gained a `rating` or `passes_accuracy` outside the min/max of its own blocks** ,
   those are minute-weighted means and cannot legitimately exceed either input.
9. **NR is still NR**: no field that was null before is 0 after. `resolveSeasonStat` preserves
   null by design and this asserts it held at scale.
10. **Re-run the Peak/Breakout/Standard rules before and after and diff the tag sets.** This is
    the reason the repair is happening; the tag movement is the result, not a side effect.

**Reversible.** No foreign key points at `player_season_cards`, so the captured rows plus the
transaction file restore the prior state.

---

## 5. WHAT IS BLOCKED ON THIS

**Peak, Breakout and The Standard are built and HELD UNCOMMITTED** pending this repair. Peak is
winner-takes-all and 46% of its tags sit within 3 points of a rival season, so publishing before
the repair means publishing tags that will move.

**A SECOND RULING IS NEEDED AND IS NOT ABOUT THE REPAIR: the 38 tied peaks.** Two seasons at the
identical score, currently separated by an arbitrary earliest-wins tie-break. That is not a data
problem and no repair fixes it , it needs a rule.
