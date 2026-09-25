# FUSED CARDS , SITTING 3. SCOPE ONLY. NOT BUILT, NOT RUN.

**202 cards hold two clubs' football under one club's name.** Measured from the provider on
2026-09-21 by `scripts/halved-dryrun.js`; the per-card blocks are in
`scripts/figures/fused-candidates.json`. **Disjoint from the 828 halved cards by construction** ,
they are different verdicts of the same gate run, so no card is in both sittings.

**SS E RECORDS FOUR AND THE FOUR ARE NOT WRONG.** That count came from a ceiling-based detector
over `league_standings`, and SS E says in terms that a fusion whose halves are both mid-table
produces an ordinary appearance count and is invisible to it. **This is the instrument SS E said
did not exist**, and it finds 202 because it asks the provider instead of asking our own data.

---

## 0. PRE-CHECK, 2026-09-25 , THE THREE FIGURES HOLD AND ONE CONSEQUENCE IS MISSING

Re-derived by `scripts/fused-precheck.js`, read-only, against the live matview:

- **202 of 202 candidates still present**, 6 with three clubs, and **202 of 202 still name their
  largest half** , the counter-example the plan says would turn "reduce" into "reduce and rename"
  does not exist.

**AND THE THING THE PLAN DOES NOT CONTAIN: THE 300-MINUTE FLOOR.** `scored` in `player_card_view`
requires `minutes >= 300 AND goals IS NOT NULL`. A fused card carries TWO clubs' minutes, so
reducing it to the named club's share can push it under the floor:

| | |
|---|---|
| cards that keep a scored rt | **157** |
| **cards that LOSE a live rt** | **44** , 22% |
| already unscored | 1 |
| rows the split inserts | 208, of which **205 are under the floor and can never be scored (99%)** |

**SO THE SITTING'S REAL SHAPE IS NOT "ALMOST NO VISIBLE EXPOSURE".** That line was about rt BANDS
and it is true of bands , one card at rt 80, none above. It is not true of cards LOSING a score:
44 cards go from carrying a number to carrying none, the highest at **rt 53** (Zechiel 2024
Feyenoord, 505m to 253m; Depay 2022 Atletico Madrid, 399m to 283m), and **205 new cards arrive that
can never be scored at all.**

**THIS IS A DECISION ABOUT SHAPE AND IT IS LUCAS'S, NOT A DETAIL TO RESOLVE INSIDE THE RUN.** The
options are not obvious and none is free:
- **Split all 202 anyway.** The figures become true per club, and 44 cards lose their score because
  the score was only ever earned by two clubs' minutes added together. Honest, and visibly lossy.
- **Split only where both halves clear the floor.** Fewer cards change, but the rule is then
  "we tell the truth when the truth is scoreable", which is the shape this platform keeps refusing.
- **Split all 202 and disclose the unscored halves**, the way the halved sitting disclosed partial
  seasons. Most work, and the only one where a reader can tell why a card has no number.

**SEC E's own rule applies: a job scoped before a finding lands does not automatically survive it.**
Nothing is written until this is answered.

---

## 1. WHAT THE POPULATION IS, MEASURED

| | |
|---|---|
| cards | **202** , 196 with two clubs, **6 with three** |
| rows to insert | **208** (one per extra club) |
| rows to reduce | **202** (the existing card, cut to its named club's share) |
| by league | SA 55, ERE 32, TR 25, BPL 24, PL 22, L1 16, LL 13, PRT 9, BL 6 |
| by season | spread 2010 to 2025, with **40 in 2025** , the live season |
| rt | **median 39, max 80**, one card at 80 and **none at 85+** |
| honours landing on one | **ZERO** |

**THE SINGLE MOST USEFUL FACT: ALL 202 NAME THE LARGER HALF. 202 of 202, no exceptions.** The
card already carries the club the player played most for, so **the split relabels nothing** , the
existing row keeps its name and loses the other club's figures. **Check this again before the run
rather than trusting this line**, because a single counter-example changes the operation from
"reduce" to "reduce and rename".

**AND THE VISIBLE EXPOSURE IS ALMOST NIL, WHICH IS THE OPPOSITE OF THE HALVED SITTING.** One card
at rt 80 (**W. Bony, Swansea 2014**, null pool), none above, median 39. **Zero honours.** So this
sitting moves almost nothing a reader would recognise , which is an argument for doing it
carefully rather than an argument that it does not matter.

## 2. WHY IT CANNOT RIDE THE HALVED SITTING , THE OPERATION IS DIFFERENT

**The halved sitting is INSERT-ONLY, and that is the whole basis of its rollback: delete exactly
what was inserted.** A fused card cannot be repaired that way, because the wrong figures are on a
row that already exists and is already published.

**THE OPERATION IS `UPDATE` + `INSERT`, AND THE UPDATE IS THE REASON THIS IS ITS OWN SITTING.**

- **KEEP THE EXISTING `card_id`. Do NOT delete-and-reinsert.** `card_id` is the player-season key:
  it is the whole card URL (`?id=`), it keys `notes_cache`, and it composes `verdict_cache`'s
  `pair_key`. Deleting the row orphans every cached verdict and note that names it, and the
  orphan rows are then unservable but still occupy their key , the exact state SS C records for
  the 194 notes orphans. **Reducing the row in place costs nothing and keeps all of that valid.**
- **THE CACHES THEN INVALIDATE CORRECTLY, AND ONLY BECAUSE OF A FIX MADE ON 2026-09-19.** Changing
  minutes and goals is a VALUE change: `stats_hash` covers values, so notes regenerate; and
  `payloadRev` is a KEY SET, which would have been blind , **the fourth `cache_version` segment,
  the client-derived value stamp, is what makes the verdict side regenerate too.** Without it this
  sitting would have left published verdict prose citing figures the card no longer shows.
- **THE ROLLBACK IS THEREFORE A FULL-ROW RESTORE, NOT A DELETE.** Capture every column of all 202
  rows before touching them, restore by `UPDATE`, and delete the 208 inserted rows. **Both halves
  of that have to be proven, and the rt md5 over the view is what proves it** , as the canary did.

## 3. WHAT IT INHERITS FROM SITTING 1, AND MUST NOT REDO

- **THE CONSTRAINT IS ALREADY CHANGED.** Sitting 1 drops `UNIQUE (api_player_id, season,
  league_code)` for `UNIQUE (api_player_id, season, league_code, team_id)` **and does not roll it
  back**. This sitting needs that constraint and must not re-apply it.
- **THE WRITE-PATH FIXES ARE ALREADY IN**, see the census in `HALVED_SPLIT_BUILD_PLAN.md`. If they
  are not, this sitting inherits the same silent-write hazard.
- **THE SIX GATES ARE THE SAME GATES**, minus the ones that do not apply: a fused card passes G3 by
  definition (card minutes EQUAL the sum), so **the fused path's G3 is inverted** and must be
  written as its own test rather than reused by flipping a boolean.

## 4. THE ONE NUMBER THIS SCOPE CANNOT SUPPLY

**NO rt DELTA IS OFFERED, AND NONE SHOULD BE QUOTED UNTIL IT IS MEASURED.** Every one of the 202
loses minutes (sum to largest half) while 208 new cards enter the pools, so scores move in both
directions and the percentile ripple reaches cards nobody touched , the canary showed **one
insert moving twelve unrelated cards across five leagues**.
- **THE HONEST INSTRUMENT IS `scripts/separability/rt_reimpl.js`, 99.56% exact against stored rt**,
  run offline over the proposed end state. SS E already rules that a figure offered for this
  without naming its method is not a measurement.
- **A NAIVE EXTRAPOLATION FROM THE CANARY WOULD BE WRONG IN BOTH DIRECTIONS**: ripples overlap, so
  it is not 202x12; and a fused card changes its OWN minutes, which the canary's insert did not.

## 5. WHAT STOPS IT

- Any card that does **not** name its largest half (the relabel case), which the measurement says
  is zero and the run must re-check.
- A restored row that does not match its captured original column for column.
- The rt md5 failing to return to its before value on rollback.
- **Any figure that cannot be reproduced from the ledger plus the before-capture.**
