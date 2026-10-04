# MOBILE COMPARE , AUDIT. 2026-09-27. MEASURED, NOTHING FIXED.

**Driven as a user on the preview at 390, in a single iframe with the viewport asserted**
(`innerWidth === 390`, `matchMedia('(max-width:720px)')` true) , SEC C records that the browser
will not resize here and that a resize call reports success while the page stays desktop-width.

**Lucas named three faults. All three reproduce. One of them is not what it looks like.**

---

## 1. "THE SEARCH ZOOMS IN WHEN TAPPED" , IT IS NOT A ZOOM, AND THE REAL CAUSE IS WORSE

**THE CLASSIC CAUSE IS ABSENT, CHECKED FIRST.** iOS auto-zooms a focused field only when its
font-size is under 16px. **`pkSearch_A` computes to exactly 16px at 390**, and the viewport meta is
`width=device-width, initial-scale=1.0` with no `maximum-scale` and no `user-scalable=no`. So
nothing on this page triggers focus-zoom, and "make the font bigger" would fix nothing.

**WHAT ACTUALLY HAPPENS: the keyboard opens and the results list collapses.** `.pkpanel` is
`position:fixed`, **574px tall, top 206, bottom 780 , exactly the viewport floor.** It does not
know the keyboard exists.

| keyboard | visible area | results still visible |
|---|---|---|
| none | 780px | **406px of 406** |
| iOS small, 291px | 489px | **122px** |
| Android, ~300px | 480px | **113px** |
| iOS large, 336px | 444px | **77px** |

**So tapping the search costs 70 to 81 per cent of the surface you tapped it to use.** The input
itself stays visible, which is why it reads as the page having "zoomed" rather than as the panel
being the wrong height.

**THE FIX IS THE VISUAL VIEWPORT, NOT A FONT SIZE.** The panel should take its height from
`window.visualViewport` (or `100dvh` minus its own offset) and re-measure on
`visualViewport.resize`, which is the only event that fires when a keyboard opens.
**AND SEC D'S EXISTING RULING DOES NOT COVER THIS.** The 2026-09-10 viewport audit REJECTED a
`dvh` swap for `.pkresults` on the grounds that "a fraction of the LARGE viewport still sits
comfortably inside the SMALL one" , **that was measured against the URL bar, roughly 86px. A
keyboard is 291 to 336px, three to four times larger, and the conclusion does not transfer.**

**COST: medium.** One height source, one listener, and a re-measure. The risk is the one SEC D
already names , a panel that resizes mid-gesture shifts content under the reader's finger , so it
wants `svh`-like behaviour (settle, do not track continuously) rather than a live bind.

---

## 2. "THE FILTER DOES NOT DISPLAY PROPERLY" , IT IS A 140px WINDOW ONTO A 1,316px LIST

Measured with the filter open inside the picker:

| | |
|---|---|
| rail visible height | **140px** |
| rail content height | **1,316px** |
| **screenfuls of content** | **9.4** |
| groups / chips | **8 / 68** |
| **groups fully visible at once** | **1** |
| results list, filter open | **264px** (from 406) |
| **results list, filter open AND keyboard open** | **0px** |

**THE CAP IS NOT A BUG, IT IS SEC D'S OWN FIX APPLIED TOO HARD.** The 2026-09-16 phone audit found
the rail expanding in flow at 1,310px and recommended "a `max-height` plus `overflow:auto` under
the phone media query, which keeps the results on screen (measured 299px visible against 0
today)". **That shipped. 140px is what it settled on, and at 140px the control is a scroll-within-
a-scroll showing one group of eight.**

**THE LAST ROW IS THE HEADLINE: filter open plus keyboard open leaves ZERO results visible.** The
two mitigations compound instead of composing.

**COST: this is a design decision before it is a fix.** The cheap version is raising the cap and
collapsing groups to one open at a time, which is an hour. The honest version is the one SEC D
already described and declined , an overlay with an Apply button , because a filter and a result
list competing for 390 pixels is a layout that cannot be tuned into working. That is half a day
and it introduces a mode.

---

## 3. "LAYERS BADLY MANAGED" , FIVE FIXED LAYERS, AND THE PAGE SCROLLS BEHIND THE MODAL

Live at once with the picker open:

    z 200  .mt-wrap      38x38   theme toggle , ABOVE the scrim and still hit-testable
    z  91  .joinsheet    375x382 off-screen at top 784, but stacked ABOVE the picker
    z  80  .pkpanel      375x608 the picker
    z  79  .pkscrim      375x780 covers the viewport
    z  60  .bottomnav    375x54  visible THROUGH the scrim, dimmed

**THE PAGE SCROLLS BEHIND THE OPEN MODAL , MEASURED:** `scrollTo(0,400)` moved the document from 0
to 30 while the panel stayed pinned at top 172. Thirty pixels only because an empty compare page is
810px tall; on a filled page it is the whole page moving under a fixed panel. **That is the single
strongest contributor to "panels over panels with no clear way back".**

**AND IT IS THE DIRECT CONSEQUENCE OF A DELIBERATE DECISION, WHICH IS WHY IT MUST NOT BE
"FIXED" CASUALLY.** SEC C: *"COMPARE'S PICKER TAKES NO `position:fixed` BODY LOCK , THE PANEL IS
FIXED, THE BODY IS NOT"* , because a body lock collapsed `documentElement.scrollHeight` to the
viewport and stranded 1,346px with no scrollbar to say so. **The old fix caused a worse bug than
the one it solved.** The modern answer is `overflow:hidden` on the scrolling element plus
`overscroll-behavior:contain`, which locks without re-parenting the layout , but it has to be
verified against that exact 1,346px failure before it is trusted.

**THERE IS A WAY BACK AND IT IS ONE SMALL GLYPH.** An explicit `×` (`.pkx`) exists and the scrim
is clickable (`pointer-events:auto`). So "no clear way back" is not literally true; what is true is
that the only affordance is a small × competing with five stacked layers.

**THE THEME TOGGLE ABOVE THE MODAL IS ITS OWN SMALL DEFECT.** `elementFromPoint` at its centre
returns the toggle, so it remains tappable while a modal owns the screen. A modal should own the
screen.

**COST: low for the toggle (one z-index), medium for the scroll lock** , the code is three lines
and the VERIFICATION is the work, because SEC C records exactly how this went wrong last time.

---

## WHAT I WOULD DO, IN ORDER

1. **The scroll lock and the toggle z-index.** Cheapest, and they remove most of the "panels over
   panels" feeling on their own.
2. **The visual-viewport height on the picker.** Fixes the fault Lucas felt first, and it is the
   one that makes the search usable at all.
3. **The filter, as a design decision rather than a tuning pass.** It is the only one of the three
   that cannot be fixed by getting a number right.

**NOTHING HERE IS BUILT.**

---

# BUILT 2026-09-27 , ITEMS 1 AND 2. ITEM 3 IS SCOPED BELOW AND NOT BUILT.

`27a35fa` (lock + toggle + visual-viewport height) and `0c65b65` (the flex crush the first commit
introduced). Harness: `_probe_pkkbd.html`, which re-takes every number here. `_probe_pkdt.html` is
the 1440 regression guard.

## THE NUMBERS, BEFORE AND AFTER, SAME DEFINITION BOTH SIDES

Visible results area = the part of `#pkResults_A` inside the VISUAL viewport band, at 390x780 with
a revealed comparison behind the sheet (6,284px tall, 5,504px of scroll).

| state | before | after |
|---|---|---|
| no keyboard | 406 | **440** |
| iOS small, 291 | 122 | **305** |
| Android, 300 | 113 | **296** |
| iOS large, 336 | 77 | **260** |
| filter open, no keyboard | 264 | **257** |
| filter open, kb 336 | **0** | **84**, sheet scrollable |

The no-keyboard gain is the sheet finally honouring its declared 78vh ceiling instead of stopping
34px short, because `.pkresults` carried a second and different fraction of a different viewport.

## THE 1,346px FAILURE, ANSWERED AS THE AUDIT DEMANDED

The audit said the modern lock "has to be verified against that exact failure before it is
trusted." Measured either side of the lock: `documentElement.scrollHeight` **6284 -> 6284
UNCHANGED**, 0px stranded, `body` still `static`, scroll offset **400 -> 400**, and all 6,284px
reachable after the sheet closes. `position:fixed` takes body out of flow and that is what
collapsed scrollHeight; `overflow:hidden` leaves every box where it was, so there is no offset to
save and no height to lose.

**Stated honestly: `overflow:hidden` does not stop a PROGRAMMATIC scroll and must not**, because
this page depends on `scrollTo` elsewhere. A synthetic wheel or touch cannot test the user half
either, since an untrusted event never scrolls, so that half rests on the computed value plus the
CSS contract rather than on a test that could not fail.

**Desktop is untouched by construction.** Both effects live inside `@media (max-width:820px)`, so
the WIDTH decides whether the class does anything. Verified at 1440: `pklock` is on
`documentElement`, `html` overflow is still `visible`, the page still scrolls, and the panel is
still the anchored in-flow one , which SEC C requires, because compare auto-opens both slots and the
page must reach slot B.

## TWO THINGS THE FIRST BUILD GOT WRONG, BOTH CAUGHT BY MEASURING

- **The settle floor was 60px** to shut out an iOS URL-bar collapse. A URL bar collapses ON SCROLL,
  which item 1 has just made impossible while the sheet is up, so the case it was sized for cannot
  happen , and at 60 it measurably ignored 291 -> 300 -> 336, leaving the panel where it was. It is
  24px, which follows a keyboard swap (alphabetic to numeric is roughly 40px).
- **`flex:1 1 auto` on the list** stretched a two-row result to fill a 608px sheet, and separately
  the flex column crushed `.pkmore` from 182px to 36px. Only `.pkresults` may give way now.

## ITEM 3, THE FILTER , SCOPED, NOT BUILT. LUCAS PICKS AFTER LAUNCH.

**THE PROBLEM IS NOT A NUMBER, WHICH IS WHY IT IS HERE AND NOT ABOVE.** The rail is 1,316px of
content in 8 groups and 58 chips, inside a `.vvf` scroller capped at 140px , **9.4 screenfuls**,
and ONE group fully visible. It is a desktop COLUMN beside a grid, stacked into a phone sheet.
There are now THREE viewport fractions nested inside each other on this surface: the sheet at 78vh,
`.pkmore` at 40vh, and `.vvf` at 140px. Two of the three are invisible to the reader.

### Option A , the cheap version (about half a session)

Raise the `.vvf` cap and open one group at a time.

- Raise `max-height:140px` to a share of the SHEET rather than a constant, and make the groups an
  accordion: one open, the rest collapsed to their labels.
- 8 labels at ~28px is 224px of always-visible structure, so the reader sees the whole taxonomy and
  scrolls inside one group instead of through all eight.
- **Cost:** two CSS values and a click handler on the group headers. No new mode, no new control,
  nothing to dismiss. Reversible in one commit.
- **What it does not fix:** the filter still competes with the results inside one sheet. At kb 336
  with the filter open the list is at its 88px floor whatever the rail does, because the sheet is
  428px and the fold takes 183 of it. A reader filtering with the keyboard up still cannot see what
  they are filtering.

### Option B , overlay with Apply (about a session and a half)

The filter becomes its own full-height sheet over the picker, with Cancel and Apply.

- Gets the whole 780px band, so all 8 groups and 58 chips fit with room to breathe , no nested
  scrollers at all, which removes the three-fractions problem rather than tuning it.
- Apply means the query runs ONCE instead of on every chip, so the results do not churn underneath.
- Cancel means a reader can explore the taxonomy and back out, which the live rail cannot offer.
- **Cost:** a new mode and a new dismissal path on a surface that already has five fixed layers,
  plus draft state (chips chosen but not applied) that must survive a Cancel and must not leak into
  the live query. `VVFilters.mount` is shared with rankings and the card page, so the draft cannot
  live in the component without touching them , it has to be held by compare and diffed on Apply.
- **The real risk is the one SEC C keeps recording:** a second modal over a modal is how the layer
  management got confusing in the first place. It would have to REPLACE the picker sheet rather than
  stack on it.

### WHICH I WOULD TAKE, AND WHY IT IS STILL LUCAS'S CALL

**B is the right phone pattern and A is the right next commit.** A is cheap, reversible, and
recovers the taxonomy, which is the complaint a reader would actually voice ("I cannot see what the
filters are"). B is a better product and a genuine piece of design work with draft state and a
shared component behind it, and it is not a thing to build in the week of a launch.

**Do not do both.** A's accordion is the thing B deletes, so building A and then B means writing
the group-collapse logic to throw it away. If B is the answer, go straight to B after launch.
