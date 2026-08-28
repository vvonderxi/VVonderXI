# STEP-6 QA PASS , THE ONLY GATE ON THE MERGE

**WHY THIS FILE EXISTS.** `CLAUDE.md` §D step 6 has said "Final QA pass" since the plan was
written and never said what it checks. The handover calls it "the only gate". A gate nobody
enumerated is not a gate. **The merge is a clean FAST-FORWARD, so there is no merge commit and
no review step: whatever is wrong on the branch becomes production the instant it deploys.**

**RE-MEASURED 2026-08-27, immediately before writing this** , the docs' figures were stale and
the branch keeps moving:

| | measured now | recorded in §D |
|---|---|---|
| commits ahead of production | **599** | 517 |
| production ahead (must be 0) | **0** | 0 |
| files / lines | **186 files, +205,155 / -10,204** | 167, +201,009 / -9,571 |

**RE-MEASURE AGAIN BEFORE RUNNING THIS.** If the figures have moved, the surface has moved.

## THE RULE THAT GOVERNS EVERY ITEM

**NO ITEM MAY BE SATISFIED BY READING CODE.** This session produced defects that only a rendered
or executed check could find: a rim that vanished from captures, a tagline present in a preview
and absent from the file, a caption that overflowed its frame, a clipboard promise that never
settled, an ink at 1.09 contrast, and a comment asserting a property directly above code that
violated it. **Reading the source would have passed all six.** Each item below therefore says how
to check it, and the check is always an execution, a render, a measurement or a query.

**AND HOLD THE INSTRUMENT TO THE SAME STANDARD AS THE CODE.** Several "defects" this session were
the harness: a colour histogram blind to rotation, a hidden tab faking a dead control, a crop
compared against a different crop, a case-sensitive grep reporting a fact as lost. **Where an item
can produce a false pass, it carries a control. Run the control first; if the control does not
behave, the result is void.**

---

# GROUP A , AUTOMATED, RUNNABLE BEFORE THE MERGE

Runnable now, on the branch, with no domain and no human eye.

### HARNESS CAVEATS , READ BEFORE TRUSTING ANY NUMBER IN GROUP A (added 2026-08-28)

Both were found producing confident, wrong numbers during this pass. Neither is fixed; both
are avoidable if you know about them.

- **A THROTTLED TAB VOIDS EVERY TIMING, OPACITY AND TRANSITION READING.** Chrome freezes
  transitions and clamps timers in a background tab. Measured here: `document.visibilityState`
  `"hidden"`, `document.hasFocus()` false, and **a 50ms timer taking 558ms , an 11x throttle**.
  **ASSERT FIRST, EVERY TIME:** `visibilityState === 'visible'` AND a 50ms timer returning in
  under ~200ms. If either fails, the run is void, not merely noisy. This is the same fault
  already recorded in section D against the toast.
- **THE CONTRAST WALKER FALLS THROUGH GRADIENTS AND INVENTS A WHITE GROUND.** It reads only
  `backgroundColor`; every VV page paints its body in gradients, so the walk reaches the root
  and returns white. **It reported the card hero skeleton's loader at 1.20 , a failure , on a
  ground that is actually `rgb(26,23,24)`, where the true figure is 14.81.** It did the same on
  `rankings` (1.20 reported, 16.30 actual) and on `vvindex`, where the gradient-aware variant is
  no better: that one scores text against decorative 26px radial stops sitting nowhere near it
  and reported **51 failures on a visibly legible page**.
  - **THE TELL: if any ancestor has a `background-image`, the ground is UNRESOLVED. Say so and
    stop , do not report a ratio.**
  - **WHAT SETTLES IT INSTEAD:** capture the element with html2canvas passing the page's own
    base colour as `backgroundColor` (take it from the body's final gradient stop, do not guess),
    then read the two dominant colours inside the mark's own box. **Capturing with
    `backgroundColor:null` does NOT work** , a translucent panel then composites onto an implicit
    white and reproduces the same false reading.
  - **AND WHERE THE GROUND IS A SOLID COLOUR THE WALKER IS FINE.** The glance-panel failure it
    found was real and confirmed by pixels.

### A1. Every file parses and every declared rule survives
- **Check:** no syntax error, no silently truncated CSS, every shared module exports what pages expect.
- **How:** `node scripts/lint-inline.js`
- **Pass:** "All files parse clean, every declared rule survives, every inline script checks, and every shared module exports what it should." **A stray backtick inside `VV_CARD_CSS` once passed `node --check` and left `VVCore` undefined, so the export assertion is the load-bearing half , not the parse.**

### A2. Cache-token discipline
- **Check:** `vv-core.js` and `vv-marks.js` carry the SAME `?v=` on all three shipping pages.
- **How:** `for f in card.html compare.html rankings.html; do grep -o 'vv-\(core\|marks\).js?v=[0-9a-z]*' $f; done | sort -u`
- **Pass:** exactly TWO lines, one per file, the SAME token. Today: `20260827g`. **Any third value means a page was missed and one file will be served fresh against a cached copy of the other.** Ignore the gitignored demos and the two `myclub-mock*` files, which reference vv-core only in a comment.

### A3. Verdict tags and the share-only names
- **Check:** 14 tags, 3 share-only display names, and every share name resolves.
- **How:** assert every key of `VERDICT_SHARE_NAME` is a real key of `VERDICT_TAGS`, then assert `verdictShareName()` returns the share name when given the KEY, the TAG OBJECT and the NAME, and returns the tag's own name for the other eleven.
- **Pass:** 14 tags, 3 share names, all three resolve three ways, the other 11 pass through unchanged. **The three divergent names are DELIBERATE (§C) , a mismatch is only a defect if a share KEY has no tag behind it.**
- **NOTE, and it cost a false failure on the first run: `VERDICT_SHARE_NAME` is keyed by TAG KEY (`var_close`), not by tag name.** A check written against the name throws on a correct codebase. `verdictShareName()` deliberately accepts either, so the test must too.

### A4. Mark set resolves, nothing renders blank
- **Check:** all 39 marks exist and every key used by a consumer resolves to real path data. **(38 until `s-gk`, the goalkeeper glove, was added 2026-08-28.)**
- **How:** serve locally, open card / compare / rankings, and read the one-shot console audit `VVMarks.inject()` emits.
- **Pass:** no "mark resolves to nothing" warning on any surface. **A `<use>` pointing at a missing symbol renders BLANK with no error and no layout change, so the console warning is the only signal.**

### A5. The loader, at every wired size
- **Check:** the two-tone mark renders as a W, in both themes, at every size actually used.
- **How:** serve locally; render `VVCore.vvLoader({size:n})` at 64/48/44/40/22/16 in both themes; screenshot.
- **Pass:** the interlock reads at every size, the base V is visible in both themes, and the pink wipes without the base disappearing. **The base must never vanish , that is the whole design guarantee.**
- **AND CHECK THE INK AT EVERY CALL SITE, AGAINST ITS GROUND AND NOT AGAINST THE THEME.** The
  loader's default base ink flips with `body.light`. That is correct only where the GROUND flips
  too. **`card.html`'s glance panel is `.layer`, which is cream in BOTH themes, so the default
  put a cream V on cream at contrast 1.00 , not faint, NOT DRAWN (0 non-ground pixels of 4096).**
  Fixed 2026-08-28 by passing `ink:'var(--charcoal)'`, and `VVCore.vvAuditLoaderInk()` now warns
  once per surface when a base falls under 1.6 against a resolvable ground.
- **THE SIX CALL SITES, ALL MEASURED 2026-08-28:** card:1167 AI wait **14.41** (explicit ink),
  card:1519 hero **14.81** (by capture), card:1542 glance **1.00 -> 14.31** (fixed),
  rankings:507 **16.30 / 13.42** (by capture), compare:1428 **15.72 / 16.57**,
  compare:1721 `.vwait` **15.72 / 14.41**. **Four of six sit on gradient grounds and can only be
  settled by capture , see the harness caveats above.**

### A6. The four html2canvas divergences
- **Check:** each of the four known capture gaps is either shimmed or accepted, and no NEW one has appeared.
- **How:** (a) capture a card and confirm the Generational gold rim is present in the PNG , count gold pixels in the top-left corner; (b) capture and confirm marks are not blank; (c) capture and confirm the tagline line is in the file; (d) run `VVCore.vvAuditCaptureSupport(frame)` on a composed share frame and read the console.
- **Pass:** (a) non-zero gold in the corner (was ZERO without `vvShimInsetRims`, 370 with); (b) marks visible; (c) tagline present; (d) the audit reports the shield's `drop-shadow` ONLY , that one is an accepted exception at a measured 0.31/255. **Any other feature named by the audit is new and must be investigated before merge.**

### A7. Share frames, all four formats, both themes
- **Check:** nothing overflows, nothing collides, the caption and tagline fit, the card sits inside the padding.
- **How:** compose `x`, `igf`, `igs`, `dl` and measure on the live frame before capture: caption block width against frame-minus-padding, card bottom against caption top, card box against frame padding. Repeat with the LONGEST realistic name, not Messi.
- **Pass:** every format inside its padding, no card/caption overlap, caption wraps rather than overflowing. **`nowrap` overflows rather than clips, so an overflow bleeds off the image silently , the measurement is the only way to see it.**

### A8. Share type is legible at the size people see
- **Check:** the type survives the thumbnail, not the file.
- **How:** render each format and display at **600px wide**, which is roughly how X renders inline.
- **Pass:** wordmark and caption readable at 600px. **Judging at 100% is how the old 18px caption shipped as 9px as seen.**

### A9. Capability-driven share controls
- **Check:** the control set matches what the browser can actually do, in all three capability states.
- **How:** on card and compare, stub `navigator.share`/`canShare` for `files`, `link`, and neither; call the relabel; read the rendered labels, the visible socials and the hint.
- **Pass:** `files` gives one Share button with the socials REMOVED; `link` and `none` give "Save post image", socials shown and marked link-only, and a hint saying to attach the image. **No two share controls may share a label.**

### A10. Clipboard reports only what resolved
- **Check:** Copy link never claims success it did not earn, and never hangs.
- **How:** stub `navigator.clipboard` three ways , absent, rejecting, resolving , and call the handler.
- **Pass:** absent and rejecting both land "Copy failed"; resolving lands "Copied"; **all three settle within ~1.5s**. **An unbounded `writeText()` can stay pending forever on a hidden document, which is a control that silently does nothing.**

### A11. Age filter and Clear-all
- **Check:** the Age range filters on `season_age`, the ends mean no bound, and Clear-all resets everything.
- **How:** on rankings, set Age to a narrow band and read the emitted query and the result count; drag to the ends; set both Age and VV Score, then Clear-all.
- **Pass:** the query uses **`season_age`, never `age`**; at the ends NO clause is emitted; Clear-all resets both ranges and every chip. **`age` is the player's CURRENT age and is identical on every season row, so filtering on it silently answers a different question , confirm by checking a card whose current age is far from its season age.**

### A12. Filter state survives a legacy shape
- **Check:** a filter state stored by an earlier build, with no `age` key, still applies.
- **How:** hand-build a state object without `age`, pass it to `applyServer`, `isActive`, `renderActive`, `emptyStateHTML`.
- **Pass:** no throw, and the clauses that ARE present still apply. **Sequence state is persisted in sessionStorage and will outlive the deploy.**

### A13. Row CSS namespaces
- **Check:** rows still render with a namespace ancestor on all three surfaces.
- **How:** load each surface and read the one-shot console guard.
- **Pass:** no "rows rendered with no namespace ancestor" warning. **The opt-in reproduces a silent failure otherwise , a missed prefix once grew rows from 80px to 637px tall.**

### A14. Contrast, both themes, every surface
- **Check:** no new AA failure, and the accepted exceptions are still exactly the accepted ones.
- **How:** run the contrast harness on card, compare, rankings, playbook, vvindex, index, in BOTH themes. **On any SVG, ink is `fill` not `color`, the ground is sibling geometry (hit-test, topmost = last in document order), and a stroke counts toward legibility.**
- **Pass:** the only failures are the recorded exceptions , card-face chips 2.04 and 2.34, `.prenum` 1.00 by construction, the waiting-box edge 1.88, `.pspot` 3.89. **Anything else is new.**

### A15. Data baselines , capture, do not assert
- **Check:** record the state of the known data defects so the merge does not silently inherit a changed one.
- **How:** query and RECORD: total cards, null `rt`, `position_pool='UNK'`, coarse `position='FOR'`, `card_id < 120000`.
- **Pass:** figures recorded in the session log. **Measured 2026-08-27: 57,058 total, 3,061 null rt, 71 UNK, 36 FOR, 9 in the old corrupt block. THE DOCS SAY 125 UNK AND 185 IN THE BLOCK , both have moved, so this item CAPTURES a baseline rather than asserting an old one.**

### A16. GK matview swap is intact
- **Check:** the keeper and discipline columns are present and populated on the matview the site reads.
- **How:** query `player_card_mv` for non-null counts on `saves`, `goals_conceded`, `penalties_scored`, `penalties_missed`, `penalties_saved`, `starts`, `cards_yellow`, `cards_red`, `fouls_committed`, `fouls_drawn`, and confirm the column count is 65. **THE DISCIPLINE COLUMNS ARE `cards_yellow` / `cards_red`, NOT `yellow_cards` / `red_cards` , guessing the obvious name reports a MISSING COLUMN on a healthy matview.**
- **Pass:** all eight columns present and non-empty. **`information_schema` is BLIND to matview grants , if the site renders empty with no error, check `pg_class.relacl`, not `role_table_grants`.**

### A17. Engine repartition and the position vocabulary are NOT half-applied
- **Check:** the repartition is parked, and nothing on the branch has partially applied it.
- **How:** confirm `rel_pct` still partitions on the coarse field, and that the band counts hold.
- **Pass:** band populations still **12 / 150 / 650** (rank-anchored, so they hold by construction) and no card's `rt` moved without a recorded write. **The repartition is PARKED behind the corrupt block , gating the GK branch on `COALESCE(pool,pos)` would cap a corrupt outfield season at 75 and make bad data look plausible.**

### A18. No secret is reachable from a deployed endpoint
- **Check:** the BSD credential and base URL surface.
- **How:** `git grep -ln "BSD_API_KEY\|sports.bzzoiro.com"`
- **Pass:** a DECISION is recorded for each hit. **Measured 2026-08-27: THIRTEEN files, of which FOUR are deployed endpoints , `api/bsd-probe.js`, `api/debug-player.js`, `api/import-players.js` and `api/search-player.js` , plus five GitHub workflow files and `.env.example`. §E records FIVE files; it is thirteen.** Nothing here writes `api_player_id` today, but the second provider is one edit away from reintroducing the identity collision that produced the corrupt block.

---

# GROUP B , NEEDS THE LIVE DOMAIN, AFTER THE MERGE

`vvonderxi.com` IS live and served by Vercel, so these are runnable the moment the merge deploys.
**None of them can be run before it: the branch has never been deployed anywhere and no preview
URL is recorded.**

### B1. Production's title and brand line , RUN THIS FIRST
- **Check:** the live title no longer says "Intelligence".
- **How:** `curl -s https://vvonderxi.com/ | grep -oP '(?<=<title>)[^<]*'` and the same for `/card`, `/compare`, `/rankings`.
- **Pass:** every page carries its own title, none contains "Intelligence", none contains an em dash. **This is the defect every unfurled link has carried. It is the first thing to confirm and the reason this group is ordered.**

### B2. The full meta set landed
- **Check:** 15 tags per page on nine pages, with per-page `og:url`.
- **How:** `curl` each page, count `og:` and `twitter:` tags, extract `og:url`.
- **Pass:** 9 `og:` + 5 `twitter:` + 1 description per page; nine UNIQUE absolute `og:url` values. **Production served 6 and 4 with `og:url` hardcoded to the bare domain, so a count of 6 means the deploy did not take.**

### B3. og:image actually resolves
- **Check:** the referenced image is fetchable at the absolute URL.
- **How:** `curl -sI https://vvonderxi.com/og-image.png`
- **Pass:** 200, `image/png`, 1200x630. **A tag pointing at a 404 unfurls as no image at all, which looks identical to having no tag.**

### B4. Extensionless routing
- **Check:** `cleanUrls` serves the paths the meta tags claim.
- **How:** `curl -s -o /dev/null -w '%{http_code}'` for `/card`, `/compare`, `/rankings`, `/playbook`, `/vvindex`.
- **Pass:** 200 on each. **The og:url values are extensionless; if routing differs, every canonical URL is wrong.**

### B5. Functions still deploy
- **Check:** the function set survives the merge.
- **How:** `curl https://vvonderxi.com/api/get-seasons` (no argument) and `/api/db`.
- **Pass:** `{"error":"api_id required"}` with 400, and 200 respectively , the function's OWN guard is the proof it executed. **DO NOT probe the importers: `import-*` and `refresh-players` write to the database.**

### B6. The AI path works in production
- **Check:** `/api/analyse` generates rather than falling back.
- **How:** open a compare that is not in `verdict_cache` and watch for real prose.
- **Pass:** prose arrives and the panel does not show the outage line. **Vercel holds `ANTHROPIC_API_KEY`; the local `.env` may not, so this CANNOT be verified before deploy.**

---

# GROUP C , NEEDS LUCAS PERSONALLY

No harness substitutes for these. Several were attempted this session and defeated by the
environment, which is itself the reason they are listed.

### C1. The toast
- **Check:** does the toast appear, and for how long.
- **How:** on a VISIBLE, focused tab, trigger Copy link and Save image and watch.
- **Pass:** the toast is visible for about 3.4s and readable. **Every attempt here reported `visibilityState:"hidden"` with timers throttled ~18x, which manufactures exactly the symptom of a dead toast. ASSERT `document.visibilityState === 'visible'` and that a 50ms timer takes ~50ms before trusting any timing number.**

### C2. Clicking the share controls
- **Check:** Copy link, Save image, Save post image, X and WhatsApp all do what they say.
- **How:** click each one, on a real browser, and watch the label, the toast and the download.
- **Pass:** each control reaches a definite state. **The automation's click tool stopped delivering events mid-session , the positive control received ZERO clicks , so every click-based claim needs your hands.**

### C3. Real unfurls
- **Check:** paste a card link and a compare link into WhatsApp, iMessage, X and Slack.
- **How:** paste, look.
- **Pass:** the right title and description, and the brand image. **Unfurlers cache per-URL and aggressively, so links already shared will keep a stale preview , test with a URL nobody has posted.**

### C4. Real devices
- **Check:** the mobile-Safari 3D flip, swipe axis lock, the 390px tag crop, and the card at phone width.
- **How:** an actual iPhone and an actual Android.
- **Pass:** the flip works, swipe does not fight the page scroll, no tag is cropped. **The flip invariants cost ~8 commits to learn and are listed in §C , iOS flattens `preserve-3d` under a clip, so a new overflow rule anywhere in the ancestry breaks it silently.**

### C5. API-Football key rotation
- **Check:** the exposed key is rotated.
- **How:** rotate in the provider dashboard and update the Vercel env var. **MUST land BEFORE the merge (§D sequencing).**
- **Pass:** the old key is dead and the site still loads data. **ROTATE ONLY WHEN NO BACKFILL IS RUNNING** , a mid-run rotation kills every in-flight request and the enrichment scripts checkpoint per league-season, so a half-written run is the expensive failure.

### C6. Vercel plan and the function limit
- **Check:** which plan, and whether 16 functions are within it.
- **How:** the Vercel dashboard.
- **Pass:** a plan that permits the deployed function count, and **Vercel Pro**, which §C records as a pre-launch requirement because Hobby restricts commercial use. **16 functions deploy and run today , proven by probing the live endpoints , but the plan behind that is not visible from the repo.**

### C7. OAuth published and `vercel.json` reviewed
- **Check:** both, before the merge.
- **How:** provider dashboard and a read of `vercel.json`.
- **Pass:** OAuth out of test mode; `vercel.json` reviewed. **§D sequencing: these MUST land before the merge, because the merge is production the instant it deploys.**

### C8. The two open defects
- **Check:** decide each before merging.
- **How:** **(1) "Save image appears to do nothing"** , covered by C1/C2; it may already be fixed by the bounded clipboard change. **(2) The overlaid radar rendering as two narrow spikes** on card and compare , this is NOT a redesign bug, it is the provisional `RADAR_REF` placeholder set, and it is visible on every card.
- **Pass:** each is fixed, or consciously accepted and recorded as shipping. **The radar one is the more visible of the two and has no fix short of the parked percentile work , decide whether it ships.**

### C9. The corrupt PL 2025/26 block
- **Check:** whether the remaining rows ship.
- **How:** review the 9 remaining `card_id < 120000` rows against the provider.
- **Pass:** a recorded decision. **These are rows attached to the WRONG PLAYER , a keeper at Leeds with 5 goals. Internal consistency checks CANNOT find them, because both fields agree and both are wrong; only the external provider settles identity.**

### C10. The final read of the diff
- **Check:** 599 commits and 186 files land atomically.
- **How:** `git fetch origin` in Terminal C, confirm `origin/vvonderxi_BIGGER` is still **0 ahead**, then read the diff stat.
- **Pass:** 0 ahead, and the figures match what this pass was scoped against. **The 0-ahead count is only as fresh as the last fetch.**

---

# GROUP D , POST-DEPLOY, IN THIS ORDER

The merge is a fast-forward: it becomes production the instant it deploys. **These run
immediately after, not the next day.**

### D1. Production says "Legacy" , the first thing to confirm
- **Check:** the live title and og:title no longer say "Intelligence".
- **How:** `curl -s https://vvonderxi.com/ | grep -oP '(?<=<title>)[^<]*'`, then `/card`, `/compare`, `/rankings`, and the same for `og:title`.
- **Pass:** every page carries its own title, none contains "Intelligence", none contains an em dash. **If it still says Intelligence the deploy did not take, and every link shared from that moment carries the wrong brand line again.**

### D2. The meta set is live
- **Check:** the branch's 15 tags per page replaced production's 10.
- **How:** `curl` each of the nine pages; count `property="og:` and `name="twitter:`; extract every `og:url`.
- **Pass:** 9 + 5 + 1 per page and nine UNIQUE absolute `og:url` values. **A count of 6 `og:` means you are still looking at production, not the branch.**

### D3. og:image resolves and the routes exist
- **Check:** the image the tags point at is fetchable, and the extensionless paths serve.
- **How:** `curl -sI https://vvonderxi.com/og-image.png`; then `curl -s -o /dev/null -w '%{http_code}'` for `/card`, `/compare`, `/rankings`, `/playbook`, `/vvindex`.
- **Pass:** 200 and `image/png` at 1200x630; 200 on every route. **A tag pointing at a 404 unfurls as no image, which is indistinguishable from having no tag.**

### D4. The site loads and reads data
- **Check:** cards render with real numbers from the matview.
- **How:** open card, compare and rankings in a browser and look.
- **Pass:** real scores, tags and photos. **A denied matview SELECT returns EMPTY WITH NO ERROR, so an empty grid is a permissions symptom, not an empty database , check `pg_class.relacl`, never `role_table_grants`.**

### D5. The AI path works in production
- **Check:** `/api/analyse` generates rather than falling back.
- **How:** open a compare pair that is not in `verdict_cache` and watch the verdict panel.
- **Pass:** real prose arrives, no outage line, and the loader is replaced rather than left animating. **Vercel holds `ANTHROPIC_API_KEY` and the local `.env` may not, so this is the first moment it CAN be checked.**

### D6. Functions survived the deploy
- **Check:** the function set still executes.
- **How:** `curl https://vvonderxi.com/api/get-seasons` with no argument, and `/api/db`.
- **Pass:** `{"error":"api_id required"}` with 400, and 200 , the function's OWN guard proves it ran. **DO NOT probe `import-*` or `refresh-players`: they write to the database.**

### D7. One real share, end to end
- **Check:** the whole share chain works from a real device on the real domain.
- **How:** from a phone, share a card and a compare verdict; paste both links into WhatsApp and X.
- **Pass:** the image goes out where the OS sheet supports files, the unfurl shows the right title, and the saved PNG opens. **Use URLs nobody has posted , unfurlers cache per-URL and a stale preview will mask a correct deploy.**

### D8. Record the result
- **Check:** the merge is logged with what actually happened.
- **How:** append a §F entry: the measured merge figures, the A15 data baselines, every item accepted rather than fixed, and anything this pass found.
- **Pass:** the entry exists and names the accepted items explicitly. **A session that changes state and does not log it has failed the next chat.**

---

## WHAT THIS PASS DELIBERATELY DOES NOT COVER

- **Tier 2 per-link OG.** Post-launch, and the generated image is deferred with its reasoning in `POST_LAUNCH.md`.
- **The engine repartition, the `UNK`/`FOR` cleanup and the null-pool backfill.** All parked behind the corrupt block; A15 and A17 only confirm they have not been half-applied.
- **The fifteen non-runtime `api/` functions.** Proposed for a move to `scripts/`, not yet moved; A18 covers the credential exposure, which is the part that matters before a public launch.
- **`myclub.html`'s coming-soon treatment**, still open in §D and still publicly reachable from the hamburger drawer on eight pages.
