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
