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

- **STATUS 2026-08-29: PASS, re-run.** `node scripts/lint-inline.js` returns the exact pass string across all files, including the export assertion that is the load-bearing half.
### A2. Cache-token discipline
- **Check:** `vv-core.js` and `vv-marks.js` carry the SAME `?v=` on all three shipping pages.
- **How:** `for f in card.html compare.html rankings.html playbook.html; do grep -o 'vv-\(core\|marks\).js?v=[0-9a-z]*' $f; done | sort -u` **(playbook added 2026-08-28 , it loads vv-marks.js and was missing from this check.)**
- **Pass:** exactly TWO lines, one per file, the SAME token. Today: `20260827g`. **Any third value means a page was missed and one file will be served fresh against a cached copy of the other.** Ignore the gitignored demos and the two `myclub-mock*` files, which reference vv-core only in a comment.

- **STATUS 2026-08-29: PASS, re-run.** Exactly two lines, `vv-core.js?v=20260828c` and `vv-marks.js?v=20260828c`, one distinct token value across card, compare and rankings. **The token is no longer `20260827g` , it moved twice on 2026-08-28 (vv-core for the keeper panel, then vv-marks for `s-gk`).**
- **AND THE RULE IN §C WAS INCOMPLETE, corrected 2026-08-28: `playbook.html` IS A FOURTH SURFACE LOADING `vv-marks.js`** and was not in the three-page list. It had drifted to its own stale token. It is now bumped with the others; **this item's `for` loop still only checks three pages and should check four.**
### A3. Verdict tags and the share-only names
- **Check:** 14 tags, 3 share-only display names, and every share name resolves.
- **How:** assert every key of `VERDICT_SHARE_NAME` is a real key of `VERDICT_TAGS`, then assert `verdictShareName()` returns the share name when given the KEY, the TAG OBJECT and the NAME, and returns the tag's own name for the other eleven.
- **Pass:** 14 tags, 3 share names, all three resolve three ways, the other 11 pass through unchanged. **The three divergent names are DELIBERATE (§C) , a mismatch is only a defect if a share KEY has no tag behind it.**
- **NOTE, and it cost a false failure on the first run: `VERDICT_SHARE_NAME` is keyed by TAG KEY (`var_close`), not by tag name.** A check written against the name throws on a correct codebase. `verdictShareName()` deliberately accepts either, so the test must too.

- **STATUS 2026-08-29: PASS, re-run.** 14 tags, 3 share names, **zero orphan share keys**, and all three divergent names resolve identically by KEY, by TAG OBJECT and by NAME: `var_close` -> "VAR Close Call", `complete_spec` -> "The Complete Player", `league_tips` -> "The League Tips The Balance".
- **A SECOND SHAPE TRAP, beyond the one this item already warns about: `VERDICT_TAGS` is an OBJECT keyed by tag key, and the tag objects carry no `key` field.** `Object.values()` silently discards the identifier and the check throws. Use `Object.entries()`. **That is twice this item has failed on the tester's shape assumption rather than on the code.**
- **LATENT, NOT A DEFECT, recorded so nobody 'fixes' it blind: `verdictShareName(key)` returns the RAW KEY for the eleven non-divergent tags** (`fn('masterclass')` -> `"masterclass"`, not `"A Masterclass"`), because a bare string is treated as both key and name and falls through to `return name || key`. **Both live call sites (`compare.html:1486` and `:1499`) pass the tag OBJECT, for which all 14 return the correct display name, so this is unreachable today.** It would bite a future caller that passes a key, printing `masterclass` into a social post.
### A4. Mark set resolves, nothing renders blank
- **Check:** all 39 marks exist and every key used by a consumer resolves to real path data. **(38 until `s-gk`, the goalkeeper glove, was added 2026-08-28.)**
- **How:** serve locally, open card / compare / rankings, and read the one-shot console audit `VVMarks.inject()` emits.
- **Pass:** no "mark resolves to nothing" warning on any surface. **A `<use>` pointing at a missing symbol renders BLANK with no error and no layout change, so the console warning is the only signal.**

- **STATUS 2026-08-28: PASS.** Checked on rankings, card, compare and playbook. **39 symbols injected, zero dangling `<use>` refs, zero hollow symbols**, and all 11 section headings resolve including `s-gk`. Positive control: a planted `<use>` at a missing symbol was caught, and bogus keys return falsy.
- **METHOD NOTE: the first attempt looked for inline `<path>` children and reported "294 painted, 294 empty" on marks that visibly render.** The architecture is `<use>` pointing at `<symbol>`, which is the whole point of the item. Resolve hrefs against the symbol table.
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

- **STATUS 2026-08-28: FAILED, FIXED, RE-VERIFIED.** All six sizes render and the clamp holds (a request for 8px returns 16). **`card.html:1542` rendered the glance loader with NO ink option, putting a cream base V on the cream `.layer` at contrast 1.00 , not faint, NOT DRAWN (0 non-ground pixels of 4096).** Fixed by passing `ink:'var(--charcoal)'`; now **14.31** in both themes. See the six-site table above.
### A6. The four html2canvas divergences
- **Check:** each of the four known capture gaps is either shimmed or accepted, and no NEW one has appeared.
- **How:** (a) capture a card and confirm the Generational gold rim is present in the PNG , count gold pixels in the top-left corner; (b) capture and confirm marks are not blank; (c) capture and confirm the tagline line is in the file; (d) run `VVCore.vvAuditCaptureSupport(frame)` on a composed share frame and read the console.
- **Pass:** (a) non-zero gold in the corner (was ZERO without `vvShimInsetRims`, 370 with); (b) marks visible; (c) tagline present; (d) the audit reports the shield's `drop-shadow` ONLY , that one is an accepted exception at a measured 0.31/255. **Any other feature named by the audit is new and must be investigated before merge.**

- **STATUS 2026-08-28: PASS, all four.** (a) Generational gold rim: **0 gold pixels without `vvShimInsetRims`, 654 with** , the negative control proves the test measures the shim. (b) marks drawn (3 of 3, 9 distinct tones each). (c) tagline drawn (22 tones across 1855x96). (d) `vvAuditCaptureSupport` reports **exactly one** finding, the SVG `drop-shadow`, which is the recorded accepted exception. **No new divergence.**
- **The audit is ONE-SHOT per surface**, so a second call is silent by design , hook the console before the first composition or you will read an empty result and think it passed.
### A7. Share frames, all four formats, both themes
- **Check:** nothing overflows, nothing collides, the caption and tagline fit, the card sits inside the padding.
- **How:** compose `x`, `igf`, `igs`, `dl` and measure on the live frame before capture: caption block width against frame-minus-padding, card bottom against caption top, card box against frame padding. Repeat with the LONGEST realistic name, not Messi.
- **Pass:** every format inside its padding, no card/caption overlap, caption wraps rather than overflowing. **`nowrap` overflows rather than clips, so an overflow bleeds off the image silently , the measurement is the only way to see it.**

- **STATUS 2026-08-28: PASS.** Measured with the longest real name in the database, **Raffael Caetano de Araujo at Borussia Moenchengladbach** (25 + 24 characters), across x / igf / igs / dl in both themes: card and caption inside the padding everywhere, **no card/caption overlap**, **zero elements with `scrollWidth > clientWidth`**, and the caption inside the frame with **25.9 to 41.3px** of bottom clearance and 37 to 59px at the right.
- **Corroborates §D's "the igf/igs bottom block is effectively full":** the tagline occupies **85.9% of full frame width** with this name.
### A8. Share type is legible at the size people see
- **Check:** the type survives the thumbnail, not the file.
- **How:** render each format and display at **600px wide**, which is roughly how X renders inline.
- **Pass:** wordmark and caption readable at 600px. **Judging at 100% is how the old 18px caption shipped as 9px as seen.**

- **STATUS 2026-08-28: PASS**, confirmed numerically and by eye at 600px. Effective sizes: **x** caption 15.5 / tagline 11.5 / brand 15.0; **igf and igs** caption 27.8 / tagline 20.6 / brand 26.7; **dl** similar. **`x` is the tight one at 11.5px** and is the format to re-judge after any `SH_TYPE` change.
- **OBSERVED, OUTSIDE THIS ITEM'S SCOPE: on `x` the CARD'S OWN chips and club line get very small at 600px**, because the landscape frame sizes the card to its height. A8 scopes to wordmark and caption, both of which pass. Worth a human look before launch.
### A9. Capability-driven share controls
- **Check:** the control set matches what the browser can actually do, in all three capability states.
- **How:** on card and compare, stub `navigator.share`/`canShare` for `files`, `link`, and neither; call the relabel; read the rendered labels, the visible socials and the hint.
- **Pass:** `files` gives one Share button with the socials REMOVED; `link` and `none` give "Save post image", socials shown and marked link-only, and a hint saying to attach the image. **No two share controls may share a label.**

- **STATUS 2026-08-28: PASS**, all three states, driven through the real call site with its real options. **`files`** , socials hidden (2), main reads "Share", hint says it sends the image. **`link` and `none`** , socials visible (2) and marked "posts a link only" in `aria-label` and `title`, main reads "Save post image", hint says to attach it yourself. **No duplicate labels in any state** across the whole visible control row: "Save post image" and "Save image" are deliberately distinct and compose different frames.
### A10. Clipboard reports only what resolved
- **Check:** Copy link never claims success it did not earn, and never hangs.
- **How:** stub `navigator.clipboard` three ways , absent, rejecting, resolving , and call the handler.
- **Pass:** absent and rejecting both land "Copy failed"; resolving lands "Copied"; **all three settle within ~1.5s**. **An unbounded `writeText()` can stay pending forever on a hidden document, which is a control that silently does nothing.**

- **STATUS 2026-08-28: OUTCOMES PASS. THE TIMING BOUND IS UNVERIFIED and must be re-run on a visible tab.** Four stubs, all settling, none hanging: absent -> `false`, rejecting -> `false`, resolving -> `true`, and **a promise that never settles -> `false`**, which is the case the bounded wait exists for. Handler labels: resolving -> "Copied"; rejecting and absent -> "Copy failed" plus a toast explaining the browser blocked it. **It never claims success it did not earn.**
- **The ~1.5s bound could not be checked**: the tab reported `visibilityState:"hidden"` with a 50ms timer taking **523ms**. See the harness caveats. This half belongs with C1/C2.
### A11. Age filter and Clear-all
- **Check:** the Age range filters on `season_age`, the ends mean no bound, and Clear-all resets everything.
- **How:** on rankings, set Age to a narrow band and read the emitted query and the result count; drag to the ends; set both Age and VV Score, then Clear-all.
- **Pass:** the query uses **`season_age`, never `age`**; at the ends NO clause is emitted; Clear-all resets both ranges and every chip. **`age` is the player's CURRENT age and is identical on every season row, so filtering on it silently answers a different question , confirm by checking a card whose current age is far from its season age.**

- **STATUS 2026-08-28: PASS.** The emitted query uses **`season_age`, never `age`**. At the ends the real UI writes `{lo:null, hi:null}` and **emits ZERO clauses**, with `isActive` false, so null-age cards survive. A narrow band emits `gte(season_age,22)` + `lte(season_age,24)`. Clear-all resets both ranges and every chip.
- **THE `age` TRAP CONFIRMED DECISIVELY, not argued:** five cards that were TEENAGE seasons (`season_age` 19 to 20) by players now aged 33 to 35 are returned by a `season_age` 18-21 filter and by **ZERO** by the same filter on `age`. Filtering on `age` would have silently returned nothing.
- **METHOD NOTE: a hand-built state of `{lo:15, hi:43}` DOES emit clauses**, but the UI never produces that , it writes nulls at the ends. Read the state from `readState()`; do not synthesise it.
### A12. Filter state survives a legacy shape
- **Check:** a filter state stored by an earlier build, with no `age` key, still applies.
- **How:** hand-build a state object without `age`, pass it to `applyServer`, `isActive`, `renderActive`, `emptyStateHTML`.
- **Pass:** no throw, and the clauses that ARE present still apply. **Sequence state is persisted in sessionStorage and will outlive the deploy.**

- **STATUS 2026-08-28: PASS.** A state with no `age` key at all threw in none of `applyServer`, `isActive`, `renderActive`, `emptyStateHTML`, `describe` or `clientPredicate`, and every clause that WAS present still applied: `in(league_code,["PL"])`, `in(position_pool,["ST"])`, `gte(rt,88)`, `lte(rt,97)`, plus the `order(card_id)` unique tiebreak §C requires.
### A13. Row CSS namespaces
- **Check:** rows still render with a namespace ancestor on all three surfaces.
- **How:** load each surface and read the one-shot console guard.
- **Pass:** no "rows rendered with no namespace ancestor" warning. **The opt-in reproduces a silent failure otherwise , a missed prefix once grew rows from 80px to 637px tall.**

- **STATUS 2026-08-28: PASS, with a positive control.** Rows mounted into a container with NO namespace **do** trigger the guard's warning; mounted into `.vvrows` the guard is silent, rows compute `display:grid` and stand at **80 to 81px**, against the **637px** the missed prefix once produced. `.vvrows-season` behaves identically.
- **NOTE: in GRID mode rankings renders CARDS, not `.urow`**, so a `.urow` scan on the default view finds nothing and proves nothing. Exercise `rankRowHTML` directly, or switch to a row mode.
### A14. Contrast, both themes, every surface
- **Check:** no new AA failure, and the accepted exceptions are still exactly the accepted ones.
- **How:** run the contrast harness on card, compare, rankings, playbook, vvindex, index, in BOTH themes. **On any SVG, ink is `fill` not `color`, the ground is sibling geometry (hit-test, topmost = last in document order), and a stroke counts toward legibility.**
- **Pass:** the only failures are the recorded exceptions , card-face chips 2.04 and 2.34, `.prenum` 1.00 by construction, the waiting-box edge 1.88, `.pspot` 3.89. **Anything else is new.**

**STATUS 2026-08-29: PLAYBOOK DONE, BOTH THEMES. A WORKING INSTRUMENT NOW EXISTS. Five surfaces remain.**

**THE INSTRUMENT, and it took two more corrections beyond the 2026-08-28 method:**
- **Capture per CONTAINER, not per page**, with the page's own base colour as `backgroundColor`, and **assert the bitmap height matches the host box** , `s-vv` and `s-profile` drift by 1,269px and 770px and are VOIDED rather than reported. Two sections of eleven are still unmeasured for this reason.
- **THE INK FLOOR MUST BE ABSOLUTE, NOT A SHARE.** A 2% floor works on a small chip and silently fails on sparse text in a wide box , an 11px `.label` in a 1,324px row never reaches 2%, so no candidate qualifies, the ground is returned as its own ink and it reads **1.00**, which is indistinguishable from invisible text. **`max(25 device px, 0.05%)` fixed it: the same label reads 6.08.** Padding the crop was a red herring and changed nothing.
- **SVG TEXT CANNOT BE MEASURED THIS WAY AT ALL. html2canvas draws NO SVG on this page** , the 430x258 pentagon and the 27px `<use>` marks both come back as a single flat band, so every SVG label reads 1.00 as an ARTEFACT. SVG text needs the separate instrument §C describes (ink is `fill`, ground is sibling geometry by hit-test, a stroke counts). **Excluded and declared, not silently included.**
- **ELEMENTS INSIDE A ZERO-HEIGHT ANCESTOR ARE SKIPPED** , `.cm-dq` sits in `.cm-exp` at `max-height:0;overflow:hidden` and paints nothing, which also reads as 1.00.
- **`.prenum` IS NOT A VALID CONTROL FOR A PIXEL METHOD and must not be used as one.** It is `background-clip:text` over a gradient that fades to transparent, so it has no single ink; the CSS reading of 1.00 and the pixel reading of ~1.7 are measuring different things. **`.pspot` is the control** , uniform ink, reproduces at exactly **3.89** on every run.

**RESULT , PLAYBOOK, 142 elements probed per theme, 10 failures in each, and the SAME ten:**
- **`.prenum` "95+" 1.78 and "90+" 1.70** , the RECORDED accepted exception. No action.
- **`.dcl` x6 at 2.46 against a 4.5 bar, 8.5px/600 , NEW, NOT ON THE ACCEPTED LIST.** The display-case chip labels ("World Cup Winner", "UCL Winner", "League Champion", "Player of the Season", "Golden Boot", "Top Assists"). **Gold `#E8B84B` on the dark cabinet, and the ratio is IDENTICAL in both themes because the cabinet ground does not flip.** Confirmed by rendering: the inactive chips are visibly dimmer than the active one. **A decision is needed , size, weight, brightness, or accept and record it with its ratio like the other five.**
  - **METHOD NOTE: CSS arithmetic said 6.59 dark / 1.45 light and was WRONG**, because it assumed the chip sat on the page ground rather than on the cabinet. **The pixel scan's identical-in-both-themes reading was right.** A screenshot settled it.
- **`.vmono` 1.67 dark / 2.54 light , NOT AN AA FAILURE, and the instrument found it by accident.** In a glyph-dense 15px box the MODAL colour is a glyph, not the ground, so the measurement compared **ink to ink**. Both inks are fine against the ground (charcoal **14.31**, pink-ink **6.16** on cream). **What it actually surfaced is the base-to-overlay pair at 2.32** , precisely the multi-ink case §C says no contrast check on text would ever catch. Worth a look at 15px; not a WCAG item.

**PROGRESS 2026-08-29: card and vvindex added, both themes. STILL TO RUN: compare, rankings, index.**
- **CARD , 20 elements per theme, ONE failure in each and it is the same one:** `.chtag-att`
  "Clinical" at **3.88** against 4.5, 11px. **A third card-face chip**, alongside the two already
  accepted at 2.04 and 2.34. Same family, closer to the bar. **Rule it with the others.**
- **vvindex , 112 elements per theme across `.wmc` and `.band`, ZERO text failures.** The only
  flag is `.bchev`, the band disclosure chevron glyph, at **3.42 dark / 2.45 light**. **Not body
  text** , a UI affordance judged against the 3:1 non-text bar, which it clears in dark and
  misses in light.
- **A THIRD HOST RULE, learned the expensive way: THE CAPTURE BACKDROP MUST BE THE HOST'S OWN
  GROUND, NOT THE PAGE'S.** `.layer-b-inner` is transparent and takes its cream from the ancestor
  `.layer`; capturing it against the page base put cream-panel text on a dark backdrop and
  produced **17 false failures on text that renders perfectly**. Walk up to the first opaque
  background and pass THAT as `backgroundColor`.
- **AND PICK A HOST THAT DOES NOT CLIP.** `.layer-b` carries `max-height:3000px`, so html2canvas
  renders the full content height and the crop drifts by up to 2,034px , six of seven card
  panels voided until the host moved to `.layer-b-inner`.
- **BATCH SIZE IS A REAL LIMIT: 60 hosts x 2 themes times out the evaluator.** Run in chunks of
  about ten hosts.

**SUPERSEDED , the 2026-08-28 entry, kept because it records four methods that do NOT work:**
**STATUS 2026-08-28: NOT RUN. NO AVAILABLE INSTRUMENT PASSES ITS OWN CONTROLS AT PAGE SCALE, AND
THIS ITEM SHOULD NOT BE MARKED PASSED UNTIL ONE DOES.** Five were tried:
1. **The CSS walker** , reads only `backgroundColor`, falls through gradient bodies to white.
   Reported the loader at 1.20 where it is 14.81.
2. **The gradient-aware variant** , scores text against decorative 26px radial stops nowhere
   near it. **51 failures on a visibly legible page.**
3. **Pixel capture, nearest-cluster ink** , picks an antialiased EDGE tone. Read `.pspot` at
   1.92 against its recorded 3.89.
4. **Pixel capture, glyph-core ink** (clusters holding >=2% of the crop, furthest from the
   ground). **THIS ONE WORKS: it reproduced `.pspot` at exactly 3.89 and `.prenum` at 1.00.**
   But it needs ONE CAPTURE PER ELEMENT , ~260 elements on the playbook alone, times two
   themes, times six surfaces.
5. **The same method batched into one capture per surface** , html2canvas returned a bitmap
   **20090px tall where the DOM box is 18732px**, so every crop drifts downward and lands on
   flat background. A uniform scale correction does not fix it (the extra height is appended,
   not stretched) and the controls still fail: `.pspot` reads 1.01.

**WHAT TO DO:** run method 4 offline in batches, or fix the batched capture's vertical
alignment against a control BEFORE scanning. **VALIDATE ANY REPLACEMENT AGAINST THE RECORDED
EXCEPTIONS FIRST , `.pspot` 3.89 and `.prenum` 1.00 are the two known values, and an
instrument that cannot reproduce them is not evidence about anything else on the page.**

### A15. Data baselines , capture, do not assert
- **Check:** record the state of the known data defects so the merge does not silently inherit a changed one.
- **How:** query and RECORD: total cards, null `rt`, `position_pool='UNK'`, coarse `position='FOR'`, `card_id < 120000`.
- **Pass:** figures recorded in the session log. **Measured 2026-08-27: 57,058 total, 3,061 null rt, 71 UNK, 36 FOR, 9 in the old corrupt block. THE DOCS SAY 125 UNK AND 185 IN THE BLOCK , both have moved, so this item CAPTURES a baseline rather than asserting an old one.**

- **STATUS 2026-08-28: SATISFIED BY ITS OWN TEXT.** This item's pass condition is "figures recorded", and the 2026-08-27 figures are recorded in the line above. **Re-measured 2026-08-28: total is 57,058, unchanged.** Nothing to re-run.
### A16. GK matview swap is intact
- **Check:** the keeper and discipline columns are present and populated on the matview the site reads.
- **How:** query `player_card_mv` for non-null counts on `saves`, `goals_conceded`, `penalties_scored`, `penalties_missed`, `penalties_saved`, `starts`, `cards_yellow`, `cards_red`, `fouls_committed`, `fouls_drawn`, and confirm the column count is 65. **THE DISCIPLINE COLUMNS ARE `cards_yellow` / `cards_red`, NOT `yellow_cards` / `red_cards` , guessing the obvious name reports a MISSING COLUMN on a healthy matview.**
- **Pass:** all eight columns present and non-empty. **`information_schema` is BLIND to matview grants , if the site renders empty with no error, check `pg_class.relacl`, not `role_table_grants`.**

- **STATUS 2026-08-28: PASS, measured.** Non-null counts on `player_card_mv` , saves 2,813 / goals_conceded 31,365 / penalties_scored 38,291 / penalties_missed 38,291 / penalties_saved 2,816 / starts 56,555 / cards_yellow 57,055 / cards_red 57,055 / fouls_committed 36,832 / fouls_drawn 37,673. **Column count exactly 65**, as specified.
### A17. Engine repartition and the position vocabulary are NOT half-applied
- **Check:** the repartition is parked, and nothing on the branch has partially applied it.
- **How:** confirm `rel_pct` still partitions on the coarse field, and that the band counts hold.
- **Pass:** band populations still **12 / 150 / 650** (rank-anchored, so they hold by construction) and no card's `rt` moved without a recorded write. **The repartition is PARKED behind the corrupt block , gating the GK branch on `COALESCE(pool,pos)` would cap a corrupt outfield season at 75 and make bad data look plausible.**

- **STATUS 2026-08-28: PASS, measured two ways.** Band populations **12 / 150 / 650**, holding exactly. And read straight out of `pg_get_viewdef`: `percent_rank() OVER (PARTITION BY s.pos ORDER BY s.minutes) AS rel_pct` , the COARSE field, and **no `coalesce(r.pool` anywhere in the view**, so the repartition is genuinely parked rather than half-applied. Viewdef is 12,440 chars and contains `rt_new`, so the engine is intact (§C: under ~2,000 chars means damaged).
- **NOTE, not a failure: the 80+ band reads 1,406 against the 1,412 recorded in §E.** The three RANK-ANCHORED bands are 95/90/85 and those hold by construction; 1,412 was a modelled figure, not an anchor. Worth a line in §E rather than a re-audit.
### A18. No secret is reachable from a deployed endpoint
- **Check:** the BSD credential and base URL surface.
- **How:** `git grep -ln "BSD_API_KEY\|sports.bzzoiro.com"`
- **Pass:** a DECISION is recorded for each hit. **Measured 2026-08-27: THIRTEEN files, of which FOUR are deployed endpoints , `api/bsd-probe.js`, `api/debug-player.js`, `api/import-players.js` and `api/search-player.js` , plus five GitHub workflow files and `.env.example`. §E records FIVE files; it is thirteen.** Nothing here writes `api_player_id` today, but the second provider is one edit away from reintroducing the identity collision that produced the corrupt block.

- **STATUS 2026-08-28: PASS.** `git grep -ln "BSD_API_KEY\|sports.bzzoiro.com"` now returns **FOUR** files, down from thirteen, and every one is a deliberate RECORD rather than a credential: `CLAUDE.md`, `QA_PASS.md`, `migrations/bsd_block_cleanup_2026-08-23/README.md`, and a post-mortem COMMENT at `api/import-players.js:133`. **The three BSD endpoints are gone.** `api/` now holds 15 files. **The key still needs revoking at the provider and removing from Vercel's env , code no longer reading it is not the same as it being dead (C5-adjacent, but a separate credential).**
---

# GROUP B , NEEDS THE LIVE DOMAIN, AFTER THE MERGE

`vvonderxi.com` IS live and served by Vercel, so these are runnable the moment the merge deploys.
**None of them can be run before it: the branch has never been deployed anywhere and no preview
URL is recorded.**

**ALL SIX ARE PARKED FOR POST-MERGE (confirmed 2026-08-28).** Each asserts a state that only
exists once the branch is deployed, and the branch has never been deployed anywhere.

**BUT TWO WERE PRE-CHECKED AGAINST PRODUCTION TODAY, because they test infrastructure the merge
does not change, and a failure in either would be a blocker nobody would discover until after
deploying:**
- **B3 og:image , PRE-CHECK PASSES.** `https://vvonderxi.com/og-image.png` returns **200,
  `image/png`, 193,595 bytes, 1200x630** , the exact size the tags claim. The asset is real and
  fetchable today, so B3 after the merge is only re-confirming the tag POINTS at it.
- **B4 extensionless routing , PRE-CHECK PASSES.** `/card`, `/compare`, `/rankings`, `/playbook`
  and `/vvindex` all return **200** on production now, so `cleanUrls` works and the extensionless
  `og:url` values the branch emits will resolve.
- **B1, B2, B5, B6 CANNOT be usefully pre-checked**: B1 and B2 assert the merge FIXED production's
  title and tag count (both already measured wrong, which is the defect), B5 needs the merged
  function set, and B6 needs `ANTHROPIC_API_KEY`, which lives only in Vercel. **B6 additionally
  cannot pass until the merge, because production requests a RETIRED model and 404s , see §D.**

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
- **STATUS 2026-08-29: RESOLVED, AND THE PREMISE WAS WRONG. NOTHING WAS DELETED. Six of the nine are CLEAN, three need a SUM repair.**
  - **SIX ARE CORRECT CARDS THAT HAPPEN TO CARRY A LOW `card_id`** , Bijol (api 833, Leeds), Mazraoui (545, Man Utd), Gravenberch (542, Liverpool), Joelinton (723, Newcastle), de Ligt (532, Man Utd), Kluivert (792, Bournemouth). **Verified against the provider on BOTH axes: `/players/profiles` returns the same person for every id, and `/players?season=2025` puts every one at the club we record.** Each is the only card for its `api_player_id` in 2025/26.
  - **THREE ARE THE KNOWN TRANSFER HALVES AND ARE NOT DUPLICATES , THEY ARE THE MISSING HALF.** Douglas Luiz (108645, 613m), Bobb (108799, 579m), Ward-Prowse (109011, 694m). Their ids belong to OTHER PEOPLE at the provider (4304 Migert Taulla, 3651 Rustem Hoxha, 4696 Menaouar Benyettou) , the `source`-discriminator defect, live. **But the minutes reconcile exactly with the correctly-keyed sibling: 613+331=944, 579+472=1,051, 694+415=1,109.** The repair is a SUM into one card, which is what `UNIQUE (api_player_id, season, league_code)` already implies. **Deleting them loses minutes held nowhere else.**
  - **A LOW `card_id` IDENTIFIED THE BLOCK AND IS NOT A TEST FOR AN INDIVIDUAL ROW.** It was the right heuristic for FINDING it and is worthless for JUDGING one: two thirds of the survivors are clean. **Judge on provider identity and on club.**

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
