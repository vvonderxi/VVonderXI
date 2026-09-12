# SESSION NOTE , THE LAUNCH GATE, THE LABELS, AND WHAT WAS CORRECTED, 2026-09-12 (late)

**SUPERSEDES NOTHING.** `docs/HANDOVER_2026-09-12.md` routes; `CLAUDE.md` wins on any conflict.
Sits beside `_CABINET.md` and `_LABELS.md` from the same day.

## THE HEADLINE OPEN ITEM: THE ENGINE SCORES AN UNRECORDED ASSIST AS ZERO

**`COALESCE(assists, 0)` INSIDE `gaw` IS SS B's "NR FOR MISSING DATA, NEVER 0" INVERTED, IN THE
ENGINE.** From the live view:

    gaw   = goals - 0.22 * LEAST(COALESCE(penalties_scored,0), goals) + 0.7 * COALESCE(assists, 0)
    gaw90 = gaw / NULLIF(minutes / 90.0, 0)

`gaw90` is the output term, so **a card whose assists are UNRECORDED is scored exactly as one that
recorded zero**, at a 0.7 weight. **Measured over 2010-2015: 18,322 of 20,219 cards, 90.6%.** And
it is not an assists gap , twelve fields sit between 84.0% and 90.6% null across that window, with
only appearances, minutes and goals populated.

**THIS IS A LIVE SCORING DEFECT OVER A FIVE-YEAR WINDOW, NOT A COSMETIC ONE, AND NO FIX IS
PROPOSED.** Any change moves `gaw`, therefore `gaw90`, therefore the pool percentiles, therefore
**cards nobody touched** , so it needs a simulation against a full `before.json` snapshot and a
post-refresh diff against the prediction, exactly as `migrations/positions_2526_2026-09-11/` did.
**Do not tidy it into a null-safe expression on the way past.** Full record, with the two SS C
precedents that already rule on both directions (`goals_conceded` zero-filled on 28,549 outfield
cards; the `sig` null policy), in `DATA_DEFECTS.md`.

## THE LABELS ARE NOW ONE NAME PER HONOUR, AND TWO CACHES REGENERATE

`ucl_winner` is **UCL Champion** and `league_champion` is **League Title**, on the card face, the
glance, the cabinet, both rankings paths and the Playbook grid. `7f49126` had left the same honour
with two names on one card; `1f8c04e` closes it.

**`PROMPT_REV` is bumped v2 to v3, and that was a correctness decision.** The labels reach the model
in the PAYLOAD, not the system prompt, so `fingerprint(VERDICT_SYSTEM)` cannot see them; `statsHash`
covers payload values so notes invalidate themselves, but the verdict cache stamps on rt and
`cache_version` only and `payloadRev` hashes the KEY SET. Without the bump, cached verdict prose
would have said "League Champion" beside a card reading "League Title" permanently.

**MEASURED, NOT ASSUMED: 110 of 110 `verdict_cache` rows and 359 `notes_cache` rows miss and
REGENERATE ON NEXT READ.** Budget for that. The stamp goes `v2-c74e1c2c` to `v3-c74e1c2c`, and
`analyse.js:455` computes `staleVersion` with line 457 gating the hit on it, so the bump is
compared and not merely written.

**STILL TO CONFIRM ON THE PREVIEW.** The four-renderer agreement was checked by calling the shipped
functions in node, because the browser extension dropped mid-check , **that is not a render
check**. The Playbook grid WAS verified in the browser (seven cells, marks present, copy filled,
zero order warnings, zero unresolved refs). **The card face, glance, cabinet and both rankings
paths need eyes on the preview.**

## THE DEFECT UNDERNEATH IT, RECORDED AND NOT FIXED

**The Playbook keys three maps plus its markup on a DISPLAY STRING**, so a copy change is a code
change: today's rename took **eight edits instead of one**. Both failure modes are silent , change
`HONOUR_META` alone and the page teaches a dead name; change the markup alone and `honMark()`
returns `''` so **the trophy renders blank with no error** while "See more" opens empty. The one
guard covers ORDER only and warns rather than throws.

**The fix is recorded in `DATA_DEFECTS.md` and deliberately not done:** key on the honour key, drop
`HON_KEY`, read `.hn` from `HONOUR_META.label` at load the way `.hmk` already reads its mark. The
`hc-` element ids are ALREADY keyed that way, so the file runs both conventions side by side.

## THE CCC BACKFILL IS REJECTED, SQUAD NUMBERS ARE NOT

**Rejected** (`POST_LAUNCH.md`) on the shape of the gap, before feasibility: twelve fields at 84 to
90% null and **only assists feeds rt**, so filling it alone moves the score while the Proof panel
stays empty. Scope, so nobody re-derives it: 216 club-seasons, roughly 4,300 to 5,200 cards, and
**the cohort cannot be selected at all** , there is no standings source in the database. What would
make it viable is named: fill the ERA rather than one field, and a standings table.

**Squad numbers are logged separately in `LAUNCH_STAGE.md`** and are a much smaller job , a roster
fact with a real source, **no engine effect** (`shirt_number` is in no scoring expression), schema
already present, and mostly INSERT since 98.4% of the window has no `player_positions` row.

## THE LAUNCH GATE: ONE DASHBOARD CHANGE, THEN A PERSON AND A PHONE

**Read from Vercel Settings > Environments on 2026-09-12, not inferred from a branch name:
Production's Branch Tracking is `coming-soon`, serving vvonderxi.com plus four more domains.**
`vvonderxi_BIGGER` builds as a preview and deploys NOTHING.

**And the first merge already happened**, at `4c8ce8a` on 2026-09-06, *"the platform returns,
adopting the branch's tree"*. `vvonderxi_BIGGER` carries card.html, compare.html, vv-core.js and
index.html today. Measured after a fresh fetch: merge-base **`32b19dab`**, BIGGER **11 ahead**
(ten holding commits plus the merge), redesign **85 ahead**, **`git merge-tree` zero conflicts**
over 3.7 MB, and **zero files on BIGGER absent from redesign**, so the merge deletes nothing.

**So the remaining work is 85 commits of drift, and the launch itself is flipping one setting.**

**AFTER THAT SETTING, WHAT IS LEFT NEEDS A PERSON AND A PHONE, NOT A SESSION.** Neither is closable
from here and neither is done: **C1, the toast** , the pass criterion is the toast visible for
about 3.4s, and every measurement attempt hit `visibilityState:"hidden"` with timers throttled
roughly 18x, which manufactures exactly the symptom of a dead toast. **C4, real devices** , the
mobile-Safari 3D flip, the swipe axis lock and the 390 tag crop, on an actual iPhone and an actual
Android. C2 and C3 are the same shape. **Declined and not to be raised again: API-Football and
Supabase key rotation.**
Do NOT check for "0-ahead" before merging , that is the superseded shape and it will now always
fail. Check merge-tree and the file-set instead.

## WHAT JOB 1 CORRECTED (commit `33a4719`)

- **The merge record** in SS D and in the handover. Both described a pending fast-forward against
  merge-base `5bdbadb` with production a strict ancestor. All of it was false.
- **The CAM collapse estimate**, which was roughly double: **33 league-seasons, 16,105 rows** (from
  2022 on, CAM share under 2%, out of 142), not ~70, so ~26,600 calls is about twice what is needed.
  The testable hypothesis is recorded with it, and the old arithmetic was half wrong , **the
  boundary case is `defRow`, not the row number**: row 4 of a five-row grid is 0.75 at defRow 1 and
  clears the 0.70 CAM bar, but 0.667 at defRow 2 and falls to CM. **Verified in code that the
  importer never persists `row`, `col`, `rowWidth`, `defRow`, `fwdRow`**, so it cannot be tested
  without a re-pull. That is the blocker, unchanged.
- **THREE ITEMS EXISTED NOWHERE IN THE TREE BEFORE TODAY** , zero matches across every `.md` and
  every shipping `.html`. They were live only in conversation. Now written: league pill counts as a
  rounded band in `LAUNCH_STAGE.md`; the Playbook mockup ratio and the filter-panel popup in
  `POST_LAUNCH.md`, each with the SS C rule it will collide with.

**Also settled: C1 (toast) and C4 (real devices) are NOT done.** No commit and no doc closes
either, and both are structurally unclosable from here , C1 needs a visible focused tab, C4 needs
a real iPhone and a real Android. **Declined and not to be raised again: API-Football and Supabase
key rotation.**

## THREE OPEN DECISIONS

1. **The World Cup label.** With `League Title` and `UCL Champion` shipped (`7f49126`), **"World
   Cup" is the only honour left whose label does not say what was done.** Nothing longer fits:
   measured on the rendered card, the two-up slot at `--cw` 132 is **37.96px**, "World Cup Winner"
   is **43.8** and even "World Champion" is **38.8**. Needs a copy decision, not an abbreviation.
2. **The cabinet's placement on the card.** Parked until the Playbook explained what a cabinet is
   for; that shipped in `8d627ff`, so it is due. The default state is settled and must not be
   reopened as a remedy , it folds closed like every neighbour. Record in `CABINET_SPEC_NOTES.md`.
3. **The cabinet panel cap.** Raised after the flex row landed. Measured: capping at 430px takes
   Lewandowski from 354px to 380px, so it makes the YEARS worse. It is a decision about the pill
   and the prose only.

## JOB 3, SPECIFIED AND DEMOED NOWHERE , THE CARD-FACE SUB-LINE CROPS

`.vvcard .cname .sub` (in `vv-core.js`, so card, compare and rankings share it) is
`club · position · age` with `text-overflow:ellipsis`. **The ellipsis eats the AGE, not the
position.** Mobile only: breaks at 390 and below, clear from 405 up, and zero clipped elements at
560 through 1920. **3,716 cards clip at 390 (6.5%), 12,092 at 340 (21.2%).** Bruno is the 1,564th
widest of 28,415 distinct strings; the worst is `Borussia Monchengladbach · WNG · 24`, over by 57px.

**THE FIX IS LAYOUT, NOT COPY** , the club gets its own element carrying the ellipsis, with
position and age `flex-shrink:0` after it, so the club truncates and the two small fields always
render. **Demo at 340, 360, 375 and 390 on the worst case and on Bruno. Not started.**

## TWO QUESTIONS FOR LUCAS

1. **Almada and Dovbyk show no identity mismatch anywhere in the tree.** Neither appears in
   `research/pos2526_verified/`, and both have plausible rows: api 6067 Almada, 2024 Lyon L1 rt 56
   CM and 2025 Atletico Madrid LL rt 52 Winger; api 15811 Dovbyk, 2023 Girona LL rt 89 ST, 2024 and
   2025 Roma SA rt 76 and 59 ST. **If that finding came from another session, it needs to say where.**
2. **Player of the Season 2025 is genuinely empty.** Zero `player_of_season` rows for
   `season_year` 2025, against 5 to 7 for every season 2010 to 2024. **And the source file stops
   too** , `scripts/enrichment/honours/pots_final.csv` runs to "2024/25". **The eight verified
   names are outside the repo if they exist.**
