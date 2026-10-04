# OUTFIELD SEPARABILITY , THE REPRODUCTION (2026-09-09)

**These files exist because the 2026-09-06 audit's implementation did not survive.** That
audit reimplemented `player_card_view`'s engine, validated it, measured the SEs, and left
nothing behind, so reproducing it meant re-transcribing the SQL from scratch. That is a fine
way to get INDEPENDENCE and a terrible way to get REPEATABILITY. Both now exist: this is an
independent second transcription, and it is checked in.

## RUN ORDER

    node pull_inputs.js        -> /tmp/engine_inputs.json   (57,055 cards + league weights)
    node validate.js           reimplementation vs stored rt   EXPECT 99.56% exact
    node anchor_control.js     fast anchor swap vs brute force  EXPECT 0 mismatches
    REPS=200 MODEL=pois node bootstrap_se.js   -> /tmp/se_pois.json
    REPS=200 MODEL=nb PHI=1.5 node bootstrap_se.js -> /tmp/se_nb.json
    MODEL=pois node pair_measure.js            exhaustive pairing measurement
    node real_pairings.js                      verdict_cache, at CURRENT rt

## THE TRAP THAT COST THIS PASS ITS FIRST RESULT , READ BEFORE TOUCHING `rt_reimpl.js`

**`player_card_view`'s final SELECT HAS NO WHERE CLAUSE.** It is `FROM player_season_cards
psc` with LEFT JOINs, so the view and the matview carry **every** psc row (57,055), while the
`scored` CTE that the entire engine is built on is only those with **`minutes >= 300 AND
goals IS NOT NULL`** (50,269 outfield + keepers).

Reading the matview as if it were `scored` inflates every percentile population and drags
`gaw_ref` down. The symptom is a bias **proportional to `gaw`** , +0.67 median on Wingers,
+0.11 on centre-backs , which reads like a floor bug and is not. It scored 72.30% exact.
Filtering first scored **99.56%**.

## WHAT VALIDATES THE IMPLEMENTATION

- **99.56% exact against stored rt, 99.98% within 1** on 50,269 cards. The 2026-09-06 pass
  reported 97.75% / 100%, so this transcription is closer, not merely comparable.
- **The anchors land on the recorded values independently:** b95 119.91, b90 98.89,
  b85 85.59 against the recorded 119.91 / 98.89 / 85.58. Two separate transcriptions of the
  same SQL agreeing on three order statistics is the strongest single check here.
- **The fast anchor swap has its own control.** `kthDescSwap` computes the post-swap order
  statistics in O(log n) instead of re-sorting 50,269 values per replicate. It is checked
  against a brute-force re-sort on 3,000 trials biased toward the sharp end: 0 mismatches.
  Without that control the whole bootstrap would rest on an optimisation nobody tested.

## WHY SE IS ROBUST TO THE 219 MISMATCHED CARDS

SE is the SPREAD of replicates, so any constant per-card offset cancels. A 0.44% mismatch
rate cannot move a distributional result, and the recorded audit made the same argument about
its own 2.25%.
