# SESSION NOTE , THE LAUNCH GATE, THE LABELS, AND WHAT WAS CORRECTED, 2026-09-12 (late)

**SUPERSEDES NOTHING.** `docs/HANDOVER_2026-09-12.md` routes; `CLAUDE.md` wins on any conflict.
Sits beside `_CABINET.md` and `_LABELS.md` from the same day.

## THE HEADLINE: THE MERGE IS DONE AND THE LAUNCH IS ONE DASHBOARD CHANGE

**Read from Vercel Settings > Environments on 2026-09-12, not inferred from a branch name:
Production's Branch Tracking is `coming-soon`, serving vvonderxi.com plus four more domains.**
`vvonderxi_BIGGER` builds as a preview and deploys NOTHING.

**And the first merge already happened**, at `4c8ce8a` on 2026-09-06, *"the platform returns,
adopting the branch's tree"*. `vvonderxi_BIGGER` carries card.html, compare.html, vv-core.js and
index.html today. Measured after a fresh fetch: merge-base **`32b19dab`**, BIGGER **11 ahead**
(ten holding commits plus the merge), redesign **85 ahead**, **`git merge-tree` zero conflicts**
over 3.7 MB, and **zero files on BIGGER absent from redesign**, so the merge deletes nothing.

**So the remaining work is 85 commits of drift, and the launch itself is flipping one setting.**
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
