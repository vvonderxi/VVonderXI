# FULL AUDIT SWEEP , punchlist item 8

**Run 2026-09-27. Nine shipping surfaces x two widths x two themes = 40 runs, zero harness errors.**
**Harness: `_sweep_audit.js`. Do not read a number in this file without reading SS 1 first.**

---

## 1. THE HARNESS LIED THREE TIMES BEFORE IT TOLD THE TRUTH ONCE, AND THAT IS THE MOST USEFUL THING IN THIS DOCUMENT

SEC C's rule of 2026-09-27 says: after building any check, plant a fault and confirm it fires
before trusting a single pass. **It was written this morning and it paid for itself this afternoon.**
The first self-test run reported **three of eight checks DID NOT FIRE**, and every one of the three
would otherwise have reported a clean platform:

| check | why it could not see anything | how it was found |
|---|---|---|
| `undefinedVars` | Chrome's nested-CSS support gives **every** `CSSStyleRule` a `cssRules` list that is EMPTY and TRUTHY. `if (r.cssRules) { recurse; continue; }` therefore skipped past every selector. Measured: **0 of 375 rules read.** | planted an undefined token; check stayed at 0 |
| `images.broken` | `img.complete` is false until the error fires, so a synchronous read of a just-appended broken image reads a LOADING image | planted a 404 image; check stayed at 0 |
| `flexText` | the premise was geometric and false , it asserted the run's rects share one top, and a real planted fault measured `[20,40,20,20,20,40]` because text wraps inside each column | planted a split sentence; check stayed at 0 |

**Then three more faults surfaced from the RESULTS rather than from the self-test**, each one
producing a confident finding about a page that was fine:

- **`var(--x, fallback)` is not an undefined variable.** Flagging it sent me to "fix" compare's
  `--pkvb` / `--pkvh`, which are set from JS at runtime and are working exactly as designed.
  Split into **invalid** (no fallback , the whole declaration dies) and **defaulted** (renders the
  fallback , a typo or a runtime variable, needs a human).
- **The ink must be the colour the element actually PAINTS with.** `.cm-vv` on playbook computes
  CREAM in dark and holds "84VV" entirely inside two children that each pin CHARCOAL, so the
  parent's cream is painted on nothing. Scored naively it read **cream-on-cream at 1.00** , a
  confident invisible-text finding about text that is perfectly legible, **disproved by a
  screenshot.** This is SEC C's SVG `fill`-not-`color` rule wearing an HTML face. Now only an
  element's OWN direct text is measured.
- **The ground must CONTAIN the element.** playbook's `.lscale .lhim em` is a 43px label sitting
  ABOVE a 3px gold tick; the DOM-ancestor walk scored gold on gold at **1.00**. The ground walk
  now returns null when the box escapes its painter. SEC C already records this for SVG ("the
  ground is sibling geometry, not a CSS background") and it is just as true in HTML.

**A control that only ever agreed would have shipped six false findings and one missed defect.**
The positive control is `.pspot`, pinned at **3.89** in SEC C: the corrected harness reproduces
3.89 on all ten instances, in both themes and both widths.

---

## 2. THE ONE REAL DEFECT, AND IT WAS INVISIBLE FROM EVERY DIRECTION EXCEPT A CONSOLE LISTENER

**`card.html` threw `ReferenceError: isKeeper is not defined` on every card load, since
2026-09-22 (`06b08e4`).**

`renderDcFlags()` (lines 2077-2163) reads `isKeeper` and `dcFields`. Both are locals of
`renderPanels`. The commit that created `renderDcFlags` **split the block out of renderPanels and
left the two declarations behind** , SEC C's block-rewrite rule exactly: *the diff shows what
ARRIVED, never what left.*

**What it cost, measured rather than inferred:**

| | before | after |
|---|---|---|
| Data Confidence field rows, outfield card | **0** | 10 (Basics, Advanced metrics) |
| Data Confidence field rows, keeper card | **0** | 7 (Basics, **Goalkeeping**) |
| the keeper sentence on a keeper card | the OUTFIELD wording | the keeper wording |
| unhandled rejections | 1 per load | 0 |

**Why nothing caught it for five days, and this is the part worth keeping.** The throw happens at
the line that REPLACES `.dc-note`'s text , and that text is **also hardcoded in the markup at
`card.html:1468`**. So the note read correctly, the dots read correctly, and only the rows below
were missing. **A panel that renders its own explanation from static markup cannot tell you that
the thing it is explaining failed to render.** The commit's own subject was
*"1,499 split halves get their disclosure back"*.

It was found by attaching an `unhandledrejection` listener, which no previous sweep of this
platform has done. **Nothing else in the sweep , not contrast, not overflow, not a blank mark ,
could have seen it.**

---

## 3. WHAT WAS CLEAN, ACROSS ALL 40 RUNS

- **Horizontal overflow: 0px on every surface, both widths, both themes.**
- **Unresolved `<use>` references: zero.** No blank marks anywhere.
- **Broken images: zero. Missing `alt`: zero.**
- **Invalid (no-fallback) undefined variables: zero.**
- **Console errors and unhandled rejections: zero** on all nine surfaces after the card fix.
- **Cache tokens agree.** Five surfaces load a shared module; `vv-core.js` and `vv-marks.js` are
  both `20260927a` on all five. `vv-margin.js` carries `20260912b`, **which is correct** , that
  file's last change is `4a9c502`, 2026-09-12. A token older than its siblings is only stale if
  the FILE moved after it, which is the test that was run.
- **Contrast: exactly ONE failing element across the whole platform**, `.pspot` at **3.89**
  against a 4.5 bar , SEC C's recorded, accepted exception, reproduced to the hundredth.

---

## 4. WHAT WAS FIXED

| surface | finding | fix |
|---|---|---|
| card.html | `isKeeper` / `dcFields` out of scope, throwing on every load | declared in `renderDcFlags` |
| compare.html | `var(--char)` , used once, defined nowhere, fallback `#1C1B1A` happens to equal `--charcoal`, so it has rendered right by accident | `var(--charcoal, #1C1B1A)` |
| card.html | `.dc-see` reads `var(--ink)`, which exists nowhere | pinned `#1C1B1A` |
| playbook.html | `.shirtsrc` reads `var(--panel)` and `var(--ink)`, neither defined | pinned `#FBF8F2` / `#1C1B1A` |
| playbook.html | three prose runs at **163 / 111 / 97** characters a line, `max-width:none` | measures set, now **54 / 80 / 64** |

**The three pinned inks are pinned BECAUSE THEIR GROUNDS DO NOT FLIP, and that was measured, not
assumed.** card's `.layer` is `rgb(240,234,217)` in both themes (ink 14.31 either way);
playbook's `.shirtsrc` is `rgb(251,248,242)` in both (16.22 either way). SEC C's rule is to match
the ink to the GROUND rather than to `body.light` , so the literal is correct here and the
`var()` wrapper was the defect: it names a token that exists nowhere, and the day anyone defines
`--ink` these three would silently start flipping against a ground that does not.

**`ch` IS THE ADVANCE WIDTH OF "0", NOT OF AN AVERAGE CHARACTER**, and the first attempt at the
measures used it as if the name were the meaning: `74ch` rendered **97** real characters a line.
The shipped values are derived from the rendered reading (`chNow x 70 / measured-per-line`),
which is why they are 53, 58 and 65 rather than round numbers.

---

## 5. WHAT IS LOGGED AND NOT FIXED , DECISIONS, NOT OVERSIGHTS

### 5.1 TAP TARGETS UNDER 44px ARE A PLATFORM-WIDE PATTERN, NOT A PLAYBOOK ONE

Playbook reports 85 to 88 and every other surface 4 to 16, **which is the page having more
controls rather than worse ones.** Grouped by what they are, the real list is short and repeats
across the platform:

| control | size | where |
|---|---|---|
| `button.more` / `.hmore` / `.drurybox-more` | **65x12, 62x12** | playbook, 31 of them , the smallest targets on the platform |
| `a.bn-item` (the bottom nav) | 73-76 x **34** | **every page** |
| `button.modetoggle` | 38x38 | every page |
| `div.avatar` | 36x42 | every page |
| `button.backbtn` | 55x26 | card, compare |
| the season stepper chevrons | **17x11** | card |
| `button.addclub` / `a#seeA` / `a#seeB` | 162x31 / 145x27 | compare |
| `button.arcmk` / `.cm-mk` | 28x28 / 32x32 | playbook |

SEC D already records the compare three (back 55x26, add-to-club 155x31, toggle 38x38) as
*"judgement rather than defect"*. **This sweep says the same judgement is owed platform-wide, and
names the two that are worse than anything previously recorded: the 12px-tall fold triggers and
the 17x11 season chevrons.** Not fixed here , enlarging a control is a visual change to nine live
surfaces and belongs to Lucas, in one pass, not scattered through an audit.

### 5.2 THE CONTRAST SWEEP HAS A DECLARED BLIND SPOT AND IT IS LARGE

Elements whose ground is a gradient, an image, or a box their painter does not contain are
returned as **UNMEASURABLE**, never folded into a pass. Per surface, worst case:

`rankings 1208 · playbook 336 · vvindex 266 · compare 35 · card 31 · card GK 21 · preferences 17 ·
index 15 · contact 13 · myclub 6`

**Do not read "one contrast failure" as "the platform is clean".** Read it as: of the elements a
CSS walker can honestly ground, one fails, and it is the recorded exception. The instrument for
the rest is `_pixel_audit.js`, which times out on pages this tall , that is QA A14's territory
and it is deliberately its own session.

### 5.3 A TRACKED PAGE NOTHING LINKS TO

The shipping set was **derived from the link graph out of `index.html`**, not typed , SEC C
records that a written list of surfaces has been wrong three times. It returns nine surfaces.
Five tracked non-demo pages are NOT reachable from the front door: `iwonder.html` (coming-soon,
recorded in SEC D), `myclub-mock.html` and `myclub-mock-B.html` (dev mocks, SEC C says
deliberately unreachable), `search-demo.html` (a QA harness) , and `search.html`.

**[CORRECTED 2026-09-28. THIS ENTRY CALLED `search.html` "the same class as the orphan
endpoints" AND THAT FRAMING IS WRONG , IT IS A DELIBERATE REDIRECT AND IT IS KEPT.]** It was a
258 KB real page, the original Search surface, until `51174b2` on 2026-06-27: *"Unify Search into
Rankings: repoint all nav to rankings.html, search.html becomes redirect stub"*. It is now 1,517
bytes carrying a meta-refresh AND a JS redirect, so it works with and without JS, and it forwards
query params (`?q=messi` to `rankings.html?q=messi`). No stylesheet, no shared module, no
behaviour, no write path, and it is a static file rather than a serverless function.
**An orphan endpoint was a live public WRITE surface with no product behind it; this has no
behaviour at all.** Being unreachable from inside the site is its DESIGN , it exists to catch
links from outside. Kept.

**THE LESSON IS ABOUT THE SWEEP, NOT THE FILE: "nothing links to it" is a measurement, and "same
class as X" is an inference, and the two were reported in one breath.** The measurement was
right and the inference was wrong, and the inference is the half that argued for deleting
something. SS C already records that an unverified premise is most costly when it argues for
REMOVING something.

---

## 6. HOW TO RE-RUN IT

```
python3 -m http.server 8765
```
Then in a browser tab, inject `_sweep_audit.js` and:

```js
await __sweepSelfTest();   // MUST report 8 of 8 before anything below is evidence
await __sweep();           // the current document
```

**If the self-test does not report 8 of 8, stop.** A sweep whose controls have not fired is not a
clean platform, it is an untested instrument , which is what three of these eight checks were
for their first twenty minutes of existence.
