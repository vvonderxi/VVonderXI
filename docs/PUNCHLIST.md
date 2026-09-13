# VVonderXI , PUNCHLIST

**The single tracker for Lucas's 14-item list. Opened 2026-09-13.**
Update the row the moment an item moves. Lead every report with this table.

**COMPLETE: 4 of 16 (25%)**

| ID | Item | Status | Owner | Note |
|----|------|--------|-------|------|
| 1 | Verdict reasoning , reason-to-winner, or pick-then-justify? | NOT STARTED | Claude | Report how the crown is actually decided |
| 2 | "The Debate Lives On" fires too often | **PENDING DECISION** | Lucas | Gate is right. The COPY asserts closeness the data does not support. Framings owed |
| 3 | BUG , verdict tag renders before the AI finishes | **DONE** | Claude | Wait chip reads "Still watching the tape", no tooltip, crown badge suppressed too |
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
| 15 | Continental international honours, five confederations | NOT STARTED | Claude | One tier below the World Cup, Fable-sourced. Scoped, not started |
| 16 | Squad number backfill via Fable | **BLOCKED** | Lucas | Batch 2 FAILED the yield gate at 7.7%. Batch 1 scoring needs Fable's returned numbers |

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


### 2 , "The Debate Lives On". MEASURED. THE RULE IS WORKING AND THE GATE IS RIGHT.

**THE RULE, verbatim, `vv-core.js` verdictContext:** `const ladder = separation !== 'separated' ? 'the_debate'`
Any pair the margin gate does not separate gets this tag. There is no second condition.

**THE MARGIN BAND IS PER-PAIR, NOT A CONSTANT.** `margin = 1.96 x pooled SE` of the two cards,
from `vv-margin.js`. It fails CLOSED: an unknown card returns null and is treated as inside.

**LUCAS'S CASE IS THE GATE WORKING, NOT A BUG.** Nani 16/17 (74) against Odegaard 25/26 (67):

    SE 7.20 and 7.60   ->   margin required 20.52   ->   actual gap 7   ->   the_debate

**The gap would have to be 21 or more to crown.** Both cards sit where the error is widest.

**HOW OFTEN IT FIRES, measured over 120,000 random pairings per pool, BOTH cards in band:**

    both rt >= 90    the_debate  91.4%     mean gap 1.7   mean margin 5.4
    both rt >= 85    the_debate  96.3%     mean gap 2.7   mean margin 9.5
    both rt >= 80    the_debate  97.1%     mean gap 4.0   mean margin 13.1
    both 70 to 79    the_debate 100.0%     mean gap 3.3   mean margin 18.5
    both 60 to 69    the_debate  97.6%     mean gap 3.2   mean margin 16.1

**97.1% at rt>=80 reproduces the code comment's 97.0% independently.** So for any realistic
comparison , two seasons worth putting side by side , the tag is effectively the DEFAULT.

**LOOSENING THE GATE IS THE ONLY LEVER AND IT DOES NOT WORK. Crown rate by confidence level:**

    pool          95% (now)    90%     80%    68%    50% coin-flip
    both >= 85         3.7%   6.1%   11.5%  20.4%   36.8%
    both >= 80         3.0%   6.2%   14.0%  23.5%   40.3%
    both 70-79         0.0%   0.1%    0.6%   2.5%   14.9%

**Even at ONE standard error the crown fires 20 to 24% of the time, and at a coin-flip 37 to 40%.**
There is no Z that produces a confident winner often AND honestly. **Lowering it crowns on noise,
which is the exact thing the gate was built to stop** , the record says the old behaviour crowned
an unsupportable winner on 61.9% of real comparisons.

**SO THE PROBLEM IS NOT THE GATE, IT IS THAT THE TAG READS AS A NON-ANSWER.** The engine is right
that it cannot separate two similar seasons; what is wrong is that the product's headline outcome,
on nearly every comparison, is a phrase that sounds like a shrug. **That is a copy and presentation
decision, not a threshold one, and it belongs to Lucas.**

### 3 , the tag renders before the AI finishes. CONFIRMED, with the line.

**`compare.html:2675`, and the comment says so in its own words:**

    vvSetVerdict(null,'',winner,va,vb,VC,TAGS[VC.floorTag],null,false,{wait:true,label:_waitLab});
    // show deterministic floor tag immediately

`vvSetVerdict` sets the chip **unconditionally**, with no `opts.wait` guard:
`if(chip && tagObj){ chip.innerHTML=tagObj.emoji+' '+tagObj.name; ... chip.style.display=''; }`

**So the chip shows a client-side floor tag while the request is still out, and is REPLACED with
`TAGS[chosen]` when the model answers.** A reader sees a conclusion, then sees it change. Worse
than an empty space, because the first one looks settled.


### 3 , DONE. The wait chip.
`vvSetVerdict` set the chip unconditionally; it is now branched on `opts.wait`. The wait state
renders **"Still watching the tape"** as a dashed, muted `.vtag-wait` with **no `data-tip`** ,
there is no meaning to reveal yet, and a tooltip on a loading state invites a tap that answers
nothing. **The crown BADGE above the winning card is suppressed in the wait too**, for the same
reason: `opts.wait` passes a deterministic winner, which would crown a side pre-emptively.
Verified rendered: wait shows the dashed chip with no crown; answered shows the gold tag and its
tooltip.

### 2 , THE FRAMING. What I found is sharper than "the tag fires too often".

**THE PROSE IS REQUIRED TO NAME A WINNER. Path B's instruction, verbatim from compare.html:**
> "Weigh the whole record , the honours actually won, the recorded figures with their
> denominators, where each sits in his own position pool, the role and what that role makes rare,
> the league, the minutes behind every rate, the career stage and the age , and **NAME THE SEASON
> YOU JUDGE BETTER**, leading with the reason rather than the name."

**So the model is not overstepping. It is doing what it is told**, and "on those grounds, this one
belongs to Odegaard" is the instruction being followed.

**AND THE TAG IS ALREADY DESIGNED TO FOLLOW THAT DECISION.** `applyVerdictOutcome` in vv-core says
so in its own comment: *"THE TAG FOLLOWS THE SAME DECISION, because the one it had contradicts a
crown. An inside pair floors on 'the_debate', whose blurb reads 'so close it won't end the
argument' , printed beside a badge naming a winner, on the same row."* When the model names a
winner and the server verifies the id, `floorTag` becomes **`photo_finish`**, not `the_debate`.

**SO A SCREENSHOT SHOWING BOTH MEANS THE MODEL'S PROSE AND ITS `winner` FIELD DISAGREED.** The
prose argued for Odegaard while the field came back null (or the id failed verification), so
`applyVerdictOutcome` returned early and the tag stayed on the floor. **That is a prompt-contract
violation, not a UI bug**, and it is the thing to watch: the same prompt says *"Return your answer
in the winner field as well: A, B, or null if you declined."*

**THE CACHE CANNOT MEASURE HOW OFTEN.** Only **3 of 113** cached rows were created after the margin
gate shipped, and the 13 no-crown rows in it come from the OLD rule. Measured on the cache the
answer is 0%, and **that 0% is an artefact of staleness, not evidence.** It needs re-measuring once
the cache refills, same as the emphasis density question.

**THE COPY IS THE PART THAT IS ACTUALLY WRONG, AND IT IS OURS, NOT THE MODEL'S.** Current state:

    headline   "Too close for the Index to separate."
    blurb      "So close it won't end the argument. Fuel for the next conversation."

**On Nani 74 against Odegaard 67 that is false.** The gap is SEVEN POINTS and the margin required
is 20.52. They are not close , the measurement is imprecise. **The copy asserts a closeness the
data does not support**, which is the same class of error as a band claiming reproducibility it
cannot deliver (SS E, vvindex `.bjury`). The honest statement is "the Index cannot tell these
apart", and those are different sentences.
