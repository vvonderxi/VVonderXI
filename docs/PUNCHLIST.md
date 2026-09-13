# VVonderXI , PUNCHLIST

**The single tracker for Lucas's 14-item list. Opened 2026-09-13.**
Update the row the moment an item moves. Lead every report with this table.

**COMPLETE: 3 of 14 (21%)**

| ID | Item | Status | Owner | Note |
|----|------|--------|-------|------|
| 1 | Verdict reasoning , reason-to-winner, or pick-then-justify? | NOT STARTED | Claude | Report how the crown is actually decided |
| 2 | "The Debate Lives On" fires too often , measure tag distribution | IN PROGRESS | Claude | Nani 74 vs Odegaard 67 is a 7pt gap with no winner |
| 3 | BUG , verdict tag renders before the AI finishes | NOT STARTED | Claude | Needs a loading state, football-flavoured line |
| 4 | Verdict tag tappable on phone, hover on desktop | NOT STARTED | Claude | Meaning available without scrolling |
| 5 | Individual honours outweigh team honours in the verdict | NOT STARTED | Claude | Story also reads jumbled, as the verdict did |
| 6 | Nani 24/25 has no Cabinet | **DONE** | Claude | DATA GAP, not a UI defect. api50940 holds ZERO honour rows, and that is correct for all six seasons we hold |
| 7 | What is left before merging to main | NOT STARTED | Claude | Definitive list |
| 8 | FULL AUDIT SWEEP, mobile + desktop | NOT STARTED | Claude | **LAST**, after everything else |
| 9 | League split as a pie chart styled as a football | NOT STARTED | Claude | Keep the existing hover/tap detail |
| 10 | Instagram + X calls to action placed properly | NOT STARTED | Claude | Propose placements, not buried in Me > Contact |
| 11 | "Add to home screen" prompt | NOT STARTED | Claude | Possibly under Playbook |
| 12 | VV Score on VV Index not using the pink second V | **DONE** | Claude | Was a 2-page nav drift, rankings + vvindex. Eight pages were already correct |
| 13 | hello@vvonderxi.com pill has a cut right edge | **DONE** | Claude | Not the radius. Pill was 408px in a 372px column, clipped by body's overflow-x. Font cap 27px to 23px |
| 14 | VV Index band section duplicates Playbook, reads dense | NOT STARTED | Claude | Propose concise + visual |

**ORDER AGREED:** 6, 12, 13 first (small). Then 2 and 3 (substantive verdict problems).
Item 8 is last by instruction.


---

## CLOSED ITEMS , what was found

### 6 , Nani has no Cabinet. DATA GAP, not a UI defect.
**`api_player_id` 50940 holds ZERO rows in `honours`.** The Cabinet is empty because the data is
empty, and the UI is behaving correctly. Checked the obvious false positive too: Lazio 2017 does
carry one honour row for that club-season, but it is **Immobile's Golden Boot, keyed to his own
api_player_id**, so Nani correctly does not inherit it.
- **AND ZERO IS THE RIGHT ANSWER FOR THE SEASONS WE HOLD.** Nani's six cards are Fenerbahce 2015,
  Valencia 2016, Lazio 2017, Sporting 2018, Adana Demirspor 2023, Estrela 2024. He won nothing we
  track in any of them. **His decorated period is Manchester United 2007 to 2014, and he has no
  card before 2015 at all** , outside the coverage window entirely.
- **ONE THING FOR LUCAS, NOT A BUG: the honour vocabulary has `world_cup_winner` and no continental
  international honour.** Nani won Euro 2016 and holds a 2016 card, so if the Euro were tracked he
  would carry a dated Cabinet entry from 2016 onward on four cards. **That is a scope decision, not
  a defect**, and it is the only route by which this particular card could ever show a Cabinet.

### 12 , the pink second V. A TWO-PAGE NAV DRIFT, not a vvindex problem.
The house pattern is `V<span style="color:var(--pink-ink)">V</span>`. Audited all ten surfaces:
**`rankings.html` and `vvindex.html` wrote "The VV Rankings" plain; the other eight were already
correct.** On vvindex the same nav bar carried a plain "The VV Rankings" directly beside a treated
"The VV Index", which is what makes it visible. Both fixed; all ten now agree.
- **THE HERO `<h1>` IS NOT A DEFECT AND WAS NOT TOUCHED.** `.hero h1 .b{color:var(--pink-ink)}`
  makes BOTH Vs pink, which is the page-title convention it shares with Playbook's
  `<span class="b">Playbook</span>`. Deliberate, not drift.
- **THE TWO PROSE INSTANCES INSIDE `.wmc-b` FOLDS WERE ALSO LEFT.** "A VV Score is an estimate"
  reads as running text, and the platform does not mark every mention , Playbook's own
  goalkeeping note writes "The VV Index" plain in body copy. **Marking every occurrence would be
  a different decision and a noisier page.** Flag it if you want it.

### 13 , the cut right edge. NOT THE BORDER RADIUS.
**The pill has `border-radius:18px` and always did.** The cause is two rules meeting:
`body` on contact.html is `max-width:412px` with `overflow-x:hidden`, giving a **372px content
column**, and at the old `clamp(19px,3.4vw,27px)` the pill measured **408px**. Body's own clip cut
it at 1166 while the pill ran to 1182 , **16px gone, which is exactly the rounded corner.**
- **THE `vw` TERM COULD NEVER HAVE SAVED IT.** The column is a FIXED 412px at every viewport, so on
  any wide screen `3.4vw` pins to the cap against a container that never grows. **This was
  desktop-only**; at 390 the clamp floors at 19px and the pill has always fitted.
- Measured: 27px overflows by 36, 24px by 2, **23px fits with 9px to spare**. Cap is now 23px.
- **`max-width:100%` ADDED AS A HARD GUARD, WHICH IS NOT THE FIX.** A longer address or a font swap
  can never silently clip again , it wraps instead, which is visible. It does not fire at 23px.
