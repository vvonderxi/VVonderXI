# VVonderXI , PUNCHLIST

**The single tracker for Lucas's 14-item list. Opened 2026-09-13.**
**IT IS 27 ROWS NOW, NOT 14.** Items 22 to 27 arrived after the list was written, so the
denominator moves and the percentage falls without any work being undone. That is the tracker
doing its job; a list that only shrinks is a list nobody is adding to.
Update the row the moment an item moves. Lead every report with this table.

**COMPLETE: 23 of 36 rows (64%)**
*Counted as complete only when DONE. Rows waiting on Lucas or on data are NOT counted.*
**THE COUNT WAS WRONG AND IS CORRECTED (2026-09-19): it read 15 of 25 when the list holds 35
rows and 23 are DONE.** And the first correction got it wrong too , 20 of 34 , because I counted
by eye instead of counting the rows. **Derive it, never type it:**
`awk -F'|' '/^\| [0-9]/{c++; gsub(/\*/,"",$4); gsub(/^ +| +$/,"",$4); if($4 ~ /^DONE/) d++} END{print d" of "c}' docs/PUNCHLIST.md` A tracker whose own denominator is stale is the same failure it exists
to catch. **THERE IS NO ITEM 32** , it is referenced inside item 25's text but has never had a
row, so the list runs 1-31 and 33-35. Do not add one retrospectively; the reference is to work
that was folded into item 25.
**IT WENT DOWN, AND THAT IS THE TRACKER WORKING.** Items 3, 9 and 16 were marked DONE and are
reopened: 3 shipped a wait state that was not what was asked for, 9 shipped a chart that is to
scale and unreadable, and 16 was closed on a gate that measured the wrong thing. **A percentage
that only ever rises is measuring the writing, not the work.**

| ID | Item | Status | Owner | Note |
|----|------|--------|-------|------|
| 1 | Verdict reasoning , reason-to-winner, or pick-then-justify? | **DONE** | Claude | Reason-first BY CONSTRUCTION , `winner` is the last key emitted. Two paths, three server guards, one unguarded seam |
| 2 | "The Debate Lives On" fires too often | **BUILT, AWAITING LUCAS** | Lucas | Framing A built and verified. Commit held until he sees the render |
| 3 | BUG , verdict tag renders before the AI finishes | **REBUILT, AWAITING LUCAS** | Lucas | First fix was wrong. Six pre-answer leaks found on a live uncached run, all closed; the wait moved to the top of the matchup |
| 4 | Verdict tag tappable on phone, hover on desktop | **DONE** | Claude | The verdict chip already worked. The PHONE STRIP tag at the top had no data-tip |
| 5a | Individual honours outweigh team honours | **BUILT, TEXT AWAITING REVIEW** | Lucas | Mislabel fixed at root. Emphasis verified reaching a CURRENT verdict, 5 markers , the Messi screenshot predates it |
| 5b | The Story reads jumbled | **DONE** | Claude | Already fixed by 078face , same wait-class bug. Needs a hard refresh to see |
| 6 | Nani 24/25 has no Cabinet | **DONE** | Claude | DATA GAP, not a UI defect. api50940 holds ZERO honour rows, and that is correct for all six seasons we hold |
| 7 | What is left before merging to main | **DONE** | Claude | Definitive list below. The merge is clean; the GATE is a Vercel setting |
| 8 | FULL AUDIT SWEEP, mobile + desktop | NOT STARTED | Claude | **LAST**, after everything else |
| 9 | League split as a pie chart styled as a football | **DONE** | Claude | Ring dropped, measured unreadable at 1.14px per neighbour. Treatment B live: a drawn ball, shares on the chips, equal-share line |
| 10 | Instagram + X calls to action placed properly | **DONE (1 and 2)** | Claude | @vvonderxi in the X share text, follow row in the home drawer. 3 and 4 not now. **Accounts may be dormant , Lucas to confirm** |
| 11 | "Add to home screen" prompt | **DONE** | Claude | It was built and could not fire: no manifest anywhere. Manifest added, Android/iOS split, hidden when installed, prompt on the HOME page |
| 12 | VV Score on VV Index not using the pink second V | **DONE** | Claude | Was a 2-page nav drift, rankings + vvindex. Eight pages were already correct |
| 13 | hello@vvonderxi.com pill has a cut right edge | **DONE** | Claude | Not the radius. Pill was 408px in a 372px column, clipped by body's overflow-x. Font cap 27px to 23px |
| 14 | VV Index band section duplicates Playbook, reads dense | **DEMO v3, AWAITING LUCAS** | Lucas | Margin removed by his call. Coverage timeline carries it, "Zero." is the quote, five extensions in. **Contact CTA required a real fix: contact.html had NO nav at all** |
| 15 | Continental international honours, five confederations | **DONE , Euro + Copa, 180 rows LIVE** | Claude | Ten tournaments. Strict matcher ported; **the direction had to be INVERTED** (the squad is the closed set, not our nationality pool) after it produced 27 rows for a 26-man squad. **Portugal 2016 silently returned 4 of 23** because the block wraps names in `{{sortname}}`. Nationality guard: 0 refused of 153. **No MARK yet , renders named and explained with no trophy, a demo-first design task** |
| 16 | Squad number backfill via Fable | **REOPENED , RETRIEVAL** | Lucas | The gate measured RECALL, not retrieval. Prompt rewritten as a lookup task, same 39 control cards, same 30% gate |
| 17 | Verify the prose and the winner field agree | **DONE (detect + log)** | Claude | No override, no retry, no UI change. Rate owed once the cache refills |
| 18 | Does the card section need its own Cabinet explanation? | **DONE** | Claude | No. The card section carries NO links and points in prose; that clause now names the Cabinet's own section |
| 19 | Wonder Tags render as plain text, not the card's pills | **DONE** | Claude | Playbook, then Compare's accolades. Three palettes to one. **Typeface fixed after Lucas saw it: the Playbook never loaded Barlow Condensed** |
| 20 | Emphasis invisible in verdict and Story | **BUILT, AWAITING LUCAS** | Lucas | Treatment B on all five prose surfaces + the Chronicle pull-quote (item 4, 2026-09-14). One ink flips, one is pinned, one takes the fixed pair. **The Chronicle takes the wash as an ELEMENT, not a marked phrase , its data is hand-authored and carries zero markers** |
| 21 | QA_PASS re-scope | **DONE** | Claude | 145 commits / 77 files, and the 119 measured EARLIER THE SAME DAY is kept beside it to show the drift. Re-measuring is now **A0, an item**, not a prerequisite. Stale item count 42 retired, it is 44 |
| 22 | Branded VV Index PDF, sent on request | **BUILT, AWAITING LUCAS** | Lucas | `docs/pdf/vv-index.html`, eight pages, print-first. **Every live figure interpolated from the generator, none typed** , verified zero unresolved expressions. All 8 pages fit the 267mm print box. **The three open decisions were taken on my recommendations and are cheap to reverse** , eight pages, the site's voice, per-season league counts |
| 23 | Season navigation on the card, vertical | **OPTION 1 APPROVED, MOTION DEMO OUT** | Lucas | Panel STAYS and teaches the swipe. **PREMISE INVERTED: horizontal was named as the model and is the DEFICIT** , `switchSeason` already calls vvCardFlip, `seqGo` is a hard cut. Both axes, one change. `_demo_motion.html` has an on-screen frame meter because frame timing cannot be measured from a headless tab |
| 24 | A published figure nobody can re-derive | **DONE** | Claude | 18,355 did not reproduce. `scripts/gen-index-figures.js` emits every live figure WITH its query. Third snapshot of its kind |
| 25 | Rule 4 under-marking + individual honours named (item 32) | **EDITED, NOT FIXED , DO NOT EDIT AGAIN** | Lucas | ONE edit, three prompts (Path B included). **The 0.43/0.21 baseline was a near-empty v3 cache: real pre-edit level is scout 1.08 / stanza 0.65, after is 0.88 / 0.82 , FLAT.** Rule 4 verified surviving all three composed prompts. Prohibitions NOT the cause , unrestricted cards still 0.66/unit. **Per unit: scout 0.48, stanza 0.75 against a target of 2-3, so the TARGET is the open question.** Verdict half owed |
| 26 | Transfer shirt-number confidence flag | **SPEC, QUEUED TO THE MATVIEW SITTING** | Claude | 841 cards, 33.3% wrong vs 0.5%. Column joins the queued DROP+CREATE. **SCOPE CORRECTED 2026-09-14: the flag covers 2016+ ONLY** , all 6,149 pre-2016 pp rows carry NULL appearances after the backfill, so they are never examined. **For those rows `written.jsonl` is the stronger audit: 5,993 of 5,993 club-consistent.** Card-only client-side version REJECTED, per-card on a hot path |
| 27 | Pre-warm popular comparisons | **DEFERRED, TRIGGER RECORDED** | Claude | WARM AFTER THE NEXT PROMPT EDIT, NEVER BEFORE , item 25 discards every warmed row. Target is the 3 suggested matchups, which is "what we linked", not "popular". Fame-keyed warming rejected on the anchor guardrail |
| 28 | Chronicle takes no wash | **DONE** | Claude | Option 2: the pull-quote, via an inner `.cq` span. **Hand-marking the 72 narratives was REJECTED , 216 paragraphs, and routing hand-authored data through `vvEmphasis` erases the untrusted-input distinction that path exists for.** Rendered and measured: ink 10.98 on the wash, clone verified on 2 and 3 line fragments |
| 29 | "Sends the verdict as an image" line, replaced by the follow row | **DONE** | Claude | Share hint emptied, SAVE hint kept (it carries the one limitation the page admits). Follow row from `VVCore.socialRowHTML()`, fourth surface. **Two X marks coexist on DESKTOP only** , the share-X hides itself when the browser can share files |
| 30 | Playbook Five Dimensions as tap-to-reveal | **DONE** | Claude | **MY DEMO'S PREMISE WAS WRONG: the Playbook ALREADY had its own five definitions**, in `.pgdefs`, in its own register. So no copy was written and none was ported , the five rows are verbatim, only visibility and ARIA moved. Nothing is duplicated, so nothing can drift. Cost recorded: four of five are now behind a tap **Scannability cost is real on a page people consult. Revert is ONE line IN THE SCRIPT, `p.hidden=!on` to `p.hidden=false`. The CSS route I first named does NOT work , the UA sheet carries `[hidden]{display:none}` too** |
| 31 | No affordance for the vertical axis | **DONE (cue), SWIPE DECLINED** | Claude | Option A: the year carries the control. **The vertical swipe is NOT built and the reason is recorded in card.html** , it needs preventDefault across the whole gesture, which traps page scroll behind the hero. A conflict, not a gap. **Two defects caught in the render: the sync attach died on vvCardFlip's async swap, and a hardcoded cream ink was invisible on the plain face** |
| 33 | Season toggle placement, beside the trigger | **DONE** | Claude | Moved off the card face into `#seasonZone`. **Needed a row wrapper** , the zone is a COLUMN flex, so `inline-flex` on the child stacked it underneath. Ink inherits the trigger's, measured identical |
| 34 | The season panel should fold on selection | **DONE** | Claude | `switchSeason(id, fromPanel)` , the panel rows pass the flag, the stepper does not. **Stepping with the list open must not close it**, that gesture wants it visible |
| 35 | The wash is on the card's opener | **DONE** | Claude | **NOT a stray selector , my own Chronicle build, approved from a description and wrong in the render.** Measured on the deployed preview: 7 washed elements, 6 are 184-235px marked phrases in Scout and Notes, the 7th was the 751px pull-quote. Removed. **Trajectory has NO AI prose to wash , only a static caption** |
| 36 | BAM club-name check reads false on every completed season | **OPEN , DEFECT** | Claude | 93 of 94 platform-export seasons read `match:false`; 87 because the unplayed set is EMPTY, not because names differ. **6 have real unplayed names and are unexamined** |

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


### 16 , THE SQUAD-NUMBER PASS. BOTH GATES SCORED. THE ANDED VERDICT IS STOP.

**GATE 1 , BATCH 1 PRECISION, high-confidence rows only, against the stored numbers.**

    high-confidence rows scored   122 of 134
    agree with stored             117
    disagree                        5
    PRECISION                    95.9%     gate was >=95 proceed
    headline verdict             PASS

**BUT THE HEADLINE IS INFLATED BY THE CONTROL'S OWN NUMBER SKEW, AND THE SPLIT IS THE FINDING:**

    stored number IS 7/9/10/11      n=83   precision 98.8%
    stored number is NOT 7/9/10/11  n=39   precision 89.7%   <- the 85-94 STOP AND READ band

**The control is 68% iconic numbers (83 of 122). A real squad is about 20%** , four of roughly
twenty-five numbers on a roster. **The 8,771 cards this job exists to fill are overwhelmingly NOT
iconic numbers**, so 89.7% is the figure that predicts the work, and it does not clear the gate.

**AND THE MECHANISM IS VISIBLE IN THE UNCERTAIN ROWS: FABLE DEFAULTS TO 9.**

    all 8 medium/low rows answered exactly "9"          100%
    Fable answered 9 or 10 on 68 of 134 batch-1 rows     51%
    four of the five disagreements are Fable saying 9 or 10

**That is positional inference, not recall** , a forward it cannot place gets the striker's number.
It is not pure guessing (a constant "always answer 9" scores only 26.2%), but it means the
confidence label is doing less work than it appears to on exactly the cards that are hard.

**GATE 2 , BATCH 2 YIELD, high-confidence rows only.**

    Genclerbirligi 2013/14   21 of 21 null, zero at any confidence
    Hamburger SV 2012/13      8 of 18 filled, 3 at high confidence
    COMBINED YIELD           3 of 39 = 7.7%     gate was >=30 proceed, 10-29 marginal, <10 stop
    verdict                  FAIL

**The three it knew are Adler, van der Vaart and Son** , an international goalkeeper, a Real
Madrid galactico, and a player who became one of the Premier League's best-known forwards. **The
only cards it knew were the famous ones, inside a batch chosen to contain none.**

**THE ANDED VERDICT: STOP. The pass does not proceed and nothing is written.** Gate 2 fails on its
own, and Gate 1 passes only on a figure the control's composition inflates.

### THE FIVE DISAGREEMENTS , NOT SCORED AS MISSES. EXTERNAL CHECK OWED BEFORE BLAME IS ASSIGNED.

`player_positions` holds 320 rows for 2010-2015 with 156 numbers, a thin hand-built set from the
same importer that produced everything else. **A disagreement is not evidence that Fable is wrong.**

    card    player            club, season          stored   Fable   Fable's evidence
    135628  R. Lukaku         West Brom 2012/13       20       10     loan announcement, WBA squad list
    143989  Alvaro Negredo    Sevilla 2010/11         18        9     Sevilla squad list
    161530  A. Gignac         Marseille 2014/15        9       10     Marseille squad list
    162824  O. Giroud         Montpellier 2011/12     17        9     Montpellier title squad list
    174256  G. Pelle          Feyenoord 2012/13       19        9     signing announcement, Feyenoord squad list

**Check each against kicker.de / tff.org.tr / the club's own archive before concluding.** If Fable
is right on any of them, that is a finding about OUR data and it belongs in `DATA_DEFECTS.md`.
**Four of the five are Fable answering 9 or 10, which is the default pattern above, so the prior
leans toward our stored value , but a prior is not a check.**


### 1 , HOW THE CROWN IS ACTUALLY DECIDED. Reason-first by construction, with one unguarded seam.

**TWO DECIDERS, NEVER BOTH AT ONCE, chosen by whether the margin gate separated the pair.**

**SEPARATED , THE ENGINE DECIDES, AND THE MODEL IS TOLD NOT TO OVERTURN IT.** `verdictContext`
computes `engineWinner` from rt alone, before any prose exists. The prompt: *"the VV Index has
already decided the winner: you do not overturn it, you explain why that season prevailed."*
**The model's `winner` field is IGNORED server-side on this path** , `resolveWinnerId` only reads
it when `aiJudge` is set. So this path IS pick-then-justify, and that is correct: **the picker is
the engine, and the score is the platform's own claim.**

**INSIDE THE MARGIN , THE MODEL DECIDES, AND ITS ANSWER IS THE VERDICT.** The caller sends no
winner. The model weighs the record and names a season. This is the path Lucas's screenshot came
from.

**ON THE QUESTION ASKED: IT REASONS FIRST, AND THAT IS ARCHITECTURAL RATHER THAN HOPEFUL.** The
requested JSON key order is:

    p1, p2, h2h, verdict, tag, who, winner

**`winner` is LAST.** A model generates left to right, so it has written both player pieces, the
head-to-head, the verdict prose and the headline **before** it emits the decision token. The field
is explicitly *"A MACHINE FIELD AND IT NEVER APPEARS IN YOUR PROSE"*, and the prompt requires it to
*"agree with what you actually wrote"*.

**THE MODEL'S ANSWER IS TREATED AS UNTRUSTED AND THREE GUARDS HOLD IT** (`resolveWinnerId`, pure
and exported so it can be tested without a key or a network call):
1. it must be exactly the string "A" or "B" , anything else, **a card id included**, is a decline
2. "A"/"B" resolve against the ids THIS REQUEST carried, **never against anything in the model's
   text**, so a hallucinated id cannot reach the table
3. the resolved id must be one of the two in the pair

**A decline and a failed check both land on `null`, which is the safe state** , no crown, no
`winner_card_id`, pairing reads unresolved.

**THE ONE UNGUARDED SEAM, AND IT IS THE ONE THAT PRODUCED THE SCREENSHOT: NOTHING CHECKS THAT THE
PROSE AND THE `winner` FIELD AGREE.** The prompt names the failure exactly , *"crowning one season
in the prose and returning the other, or null, puts a badge over the season you argued against"* ,
and then relies on the model to comply. **Every other property of that field is verified server
side; this one is not.** It is checkable: the prose is right there in the same response.

### 2 , FRAMING A , BUILT AND VERIFIED. COMMIT HELD FOR LUCAS.

**The contradiction was one tag, and the headline was already right.** An inside pair the model
judged floored on `photo_finish`, whose blurb reads **"Near-identical scores"** , printed beside a
headline saying the season was taken **on the record rather than on the number**, about a
seven-point gap. New tag **`decided_on_record`**, "Decided on the Record", blurb *"The score could
not separate them. The record could."* It names WHERE the decision came from rather than how wide
it was, which is the property `photo_finish` was chosen for and does not have.

**`photo_finish` IS UNTOUCHED** , it is still correct on its own ladder rung, a SEPARATED pair at
gap 2 to 3. That is why this is a new key and not a rewrite.

**`the_debate` AND THE FALLBACK HEADLINE STOPPED CLAIMING CLOSENESS.**

    was   "Too close for the Index to separate."  /  "So close it won't end the argument."
    now   "The Index cannot separate these two."  /  "A real gap, but smaller than the error
                                                      on the scores. The argument is still open."

**VERIFIED ON THE RENDERED PAGE WITH REAL PROSE, BOTH STATES:**

    model decided   headline "Odegaard, on creation , eleven assists to Nani's four"
                    tag      "Decided on the Record"
                    checks   names a season YES | claims closeness NO | reads as no-result NO
    model declined  headline "The Index cannot separate these two."
                    tag      "The Debate Lives On"
                    checks   names a winner NO | claims closeness NO

**AND THE FIRST ATTEMPT PRINTED THE SAME SENTENCE TWICE** , the fallback headline and the tag blurb
both read "The Index cannot separate these two", one under the other. Caught by reading the
rendered output rather than the diff; the blurb now carries the finding instead of repeating the
headline.


### 17 , THE PROSE-VERSUS-FIELD SEAM. SCOPED, NOT BUILT.

**DETECTION , TARGET `who`, NOT THE LONG PROSE.** `who` is a purpose-built winner headline, max
~14 words, and the prompt already requires it to *"Name the winner"*. The long prose argues both
sides by design, so it is the worst place to look for a decision; the headline is the model's own
one-line statement of it. Measured on the 60 cached rows that have a `who` and a crowned winner:

    who contains the WINNER's surname            54 of 60   90%
    who ALSO contains the loser's surname        15 of 60   25%
    when both appear, FIRST-NAMED is the winner  13 of 14   93%

**SO THE OBVIOUS ROUTE WORKS ABOUT NINE TIMES IN TEN, AND THAT IS THE WHOLE PROBLEM.** Layered
(surname present, then first-position when both are), it lands somewhere near 90%, which is
**enough to FLAG a disagreement and nowhere near enough to OVERRIDE a crown on.**

**WHAT IT GETS WRONG, NAMED:**
1. **TWO SEASONS OF THE SAME PLAYER , name matching is completely blind.** Messi 11/12 against
   Messi 14/15 puts the identical surname on both sides, and the prose says "the 2011 season", not
   the name. **2 of 113 cached pairs are already this**, and it is a deliberate, supported flow ,
   SS C records the same degenerate case for `.vtname`. No name-based detector can ever read it.
2. **BOTH NAMES IN THE HEADLINE, 25% of the time.** "Salah edges it, but De Bruyne makes the case"
   names the loser in the same breath as the winner. First-position rescues 93% of those and fails
   on the rest.
3. **SHARED SURNAMES.** 345 of 14,713 distinct `player_name` values belong to more than one player
   , Paulinho is six people, A. Traore and J. Rodriguez are five each. Within a single pairing it
   is rare, but the name is not a key, which SS C already records as an identity rule.
4. **A DECLINE HAS NO POSITIVE FORM.** "Two ways to be great" names nobody, and is correct. Absence
   of a name is not evidence of a decline , it is also what a detector failure looks like.

**ON A MISMATCH , I WOULD NEITHER TRUST THE PROSE NOR RETRY, AND NOT YET.**

**The case for trusting the prose is good and I nearly agree with it.** It is the reasoned artefact,
the field is one token, and the generation order means the field is a READOUT of reasoning already
done , so a disagreement is most likely the readout failing, not the reasoning. **The flaw is that
it assumes we can read the prose.** We can, about 90% of the time. **Acting on an uncertain reading
of an uncertain signal compounds two error rates**, and the failure it produces is the worst one
available: a badge over the season the prose argued against, which is exactly the defect being
fixed, arrived at from the other side.

**The case for a retry is weaker than it looks.** It costs a second generation on a path that is
already the slow one, there is no guarantee the second answer is self-consistent either, and
**it destroys the signal** , you would never learn how often the model contradicts itself, because
every instance would be silently papered over.

**SO: DETECT, LOG, CHANGE NOTHING IN THE UI. Then decide with a rate instead of an instinct.**
That is reversible, costs one boolean in the cache row, and answers the question the other two
options assume the answer to. **If the rate turns out to be near zero the seam is closed for free.
If it is material, the log will also say WHICH direction it fails in**, which is what decides
between prose-trust and retry.

**MEASURE IT AFTER THE CACHE REFILLS. Only 3 of 113 rows postdate the margin gate**, and the seam
only exists on Path B, so today's cache can say nothing about it. Same standing as the emphasis
density question and for the same reason.


### 4 , DONE, AND IT WAS THE OTHER TAG.

**THE VERDICT-SECTION CHIP ALREADY WORKED and I verified it rather than trusting the comment
beside it.** `#vEdgeTag` binds to vv-core's shared `[data-tip]` handler: **tap folds the blurb open
inline and tapping again closes it; hover shows a floating box.** Measured on the rendered page,
both presentations, not read off the source.

**THE DEFECT WAS THE TAG A PHONE READER MEETS FIRST.** Lucas's words were "at the top ... without
scrolling", and that is a DIFFERENT element: `.mvtag` inside `#mvStrip`, which sits at the top of
`.matchup` above the cards and is `display:none` on desktop. **It was rendered without a
`data-tip` at all**, so the tag you see first was the one you could not ask about, while the one a
long scroll below it had been tappable all along.

**ONE SOURCE, NOT A SECOND STRING.** It now carries the same `tagObj.blurb` the chip uses, so the
two cannot drift into describing one tag two ways. Verified at a true 390: strip `display:block`,
top at **83px in a 696px viewport** so it is visible without scrolling, tap opens the blurb, tap
again closes, and the tip is byte-identical to the verdict chip's.

**AND THE MEASUREMENT NEARLY FAILED FOR A REASON SS C ALREADY RECORDS.** Reading `w.CMP_A` across
the iframe boundary threw , `CMP_A` is a top-level `let`, which is NOT a property of `window`. The
frame's own `eval` runs in its global scope and sees it. **That is the exact binding trap in SS C
("`window.X` IS A DIFFERENT BINDING FROM A SCRIPT-SCOPED `let`/`const` , `let D`, `let CMP_A`,
`const sb` have all bitten"), hit for the fourth recorded time.**


### 17 , BUILT. DETECT AND LOG, NOTHING ELSE.

`checkProseWinner` in `api/analyse.js`, pure and exported like `resolveWinnerId` so it runs without
a key or a network call. It reads `who` (the purpose-built winner headline), compares it to the
model's `winner` field, and records the result. **No override, no retry, no UI difference.**

**IT REPORTS UNDETECTABLE RATHER THAN GUESSING**, which is the half that matters:

    agree true        prose and field name the same season
    agree false       THE DEFECT , prose names one, field returns the other
    agree null        one side named nobody. A decline has no positive form, and absence of a
                      name is also what detector failure looks like, so it is NOT a disagreement
    checked false     same surname (two seasons of one player) or no headline , it refuses to
                      read what cannot be read

**SIDES ARE CARD IDS, NEVER "A"/"B"**, because the stored row may be swapped into canonical lo/hi
order and A/B would then mean the opposite of what was checked.

**STORED ON A COPY SO THE RESPONSE IS BYTE-IDENTICAL TO BEFORE.** Mutating `canonical` would have
leaked the annotation to the client whenever the pair is NOT swapped (`canonical === verdict`
there) and not when it is (`swapVerdict` builds a new object from a fixed key list). **An
annotation present or absent depending on the lo/hi order of two card ids is invisible until
something starts reading it.**

    select verdict->'_winner_check' from verdict_cache where verdict ? '_winner_check'

**THE RATE IS OWED AND CANNOT BE TAKEN YET.** Only 3 of 113 rows postdate the margin gate and the
seam only exists on Path B. Re-measure when the cache has current rows, same standing as the
emphasis-density question.

### 5b , ALREADY FIXED BY 078face. No separate cause.

The Story had the SAME defect as the verdict , `.vsprose-wait` set `display:flex` and was never
removed, so each paragraph split into three anonymous flex items and rendered in the loading voice.
**`vvSetStory` was worse than the verdict, because `first.cloneNode(false)` copied the wait class
onto every additional paragraph**, so all four Story paragraphs were affected where the verdict had
one. Fixed in `078face` and verified rendered at the time.
**Lucas's complaint predates the fix and it is not deployed yet** , page HTML is not cache-busted,
so it needs a push and a hard refresh before he can see it.

### 5a , THE PAYLOAD DISTINGUISHES THEM. THE PROMPT SAYS NOTHING ABOUT WEIGHT.

**`won_by` IS ALREADY EMITTED** , `vvAIStats` sends `won_by:'team'` or `'player'` per honour, and
compare's `aiBlock` prints it. So the model CAN tell a squad medal from a personal award.

**BUT NOTHING TELLS IT TO WEIGH THEM DIFFERENTLY, AND THE PROMPT REPEATEDLY FLATTENS THEM.** Every
mention treats honours as one class of evidence , *"the honours each won"*, *"A trophy is a fact"*,
*"if one has the honours and the other has the rarer output"*. **`won_by` exists for ATTRIBUTION,
not weight** , its own comment says it *"keeps a team title from being written as a personal one"*.
So Lucas is right: a League Title and a Golden Boot arrive as the same kind of evidence.

**AND THERE IS A MISLABEL UNDERNEATH IT, ON THE HONOUR WHERE IT MATTERS MOST.** The mapping is
`won_by: h.group === 'Team' ? 'team' : 'player'`, and `world_cup_winner` carries
`group:'Career'` , so **the World Cup is emitted as `won_by:"player"`.** Verified:

    {"honour":"World Cup Winner","year":2018,"won_by":"player", ...}
    {"honour":"League Title",    "year":2018,"won_by":"team",   ...}
    {"honour":"Golden Boot",     "year":2018,"won_by":"player", ...}

**`group` is doing two jobs** , it answers "which shelf does this sit on" (Individual / Team /
Career) and is being read as "who won it". A World Cup is a squad achievement and Lucas lists it as
a team honour. **Fixing the label is a small, safe change; adding a weighting rule to the prompt is
a judgement about how the platform values a medal against an award, and that is Lucas's call.**


### 7 , WHAT IS LEFT BEFORE MERGING. Measured 2026-09-13, not quoted.

**THE MERGE ITSELF IS NOT THE PROBLEM AND IS NOT WHERE THE RISK IS.**

    merge-base            32b19dab
    origin/BIGGER         4c8ce8a    11 ahead of base
    origin/redesign       955ec71   119 ahead of base   (+5 unpushed locally)
    git merge-tree        4.0 MB of output, ZERO conflict blocks
    files on BIGGER absent from redesign                 ZERO , the merge deletes nothing

**THREE FIGURES IN THE DOCS ARE STALE AND ALL THREE POINT THE SAME WAY , THE JOB IS SMALLER
THAN RECORDED.**

1. **THE QA PASS IS SCOPED TO A SURFACE FIVE TIMES TOO BIG.** `QA_PASS.md` and SS D record
   **599 commits, 186 files, +205,155 / -10,204**. Re-measured against the CURRENT merge-base:
   **119 commits, 65 files, +10,833 / -753.** The old figures describe the pre-merge world;
   `4c8ce8a` already took the platform across on 2026-09-06, so what remains is drift, not a
   first crossing. **Re-scope the pass before running it , SS D's own instruction.**
2. **THE 12-FUNCTION HOBBY CAP IS A NON-ISSUE NOW.** SS C records the branch shipping 13
   functions and production 16. Measured: **`api/` holds TWO files on BOTH branches** ,
   `analyse.js` and `get-seasons.js`. The importers moved out and BSD was retired. Nothing to
   count, and Pro is on anyway.
3. **`foundations.html` IS NOT A DANGLING REFERENCE.** SS D warns production's `vercel.json`
   names a file that no longer exists. Read it: it names `og-image.png` and nothing else. A
   grep for "foundations" hits PROSE in the tag copy , "the foundations of the team" , on both
   branches. **False positive; the item is closed.**

**SO THE REAL GATE IS NOT A MERGE, IT IS A SETTING.** Vercel's Production environment tracks
**`coming-soon`**, which serves vvonderxi.com plus four more domains. **Merging redesign into
`vvonderxi_BIGGER` deploys NOTHING.** Whoever ships the platform changes Production's branch
tracking, and THAT is the launch. Read it in the dashboard, never inferred from a branch name.

**WHAT ACTUALLY REMAINS, IN ORDER:**

    1  push the 5 unpushed commits                        Lucas, any time
    2  re-scope QA_PASS.md to 119/65/+10,833              small, do it before running the pass
    3  run the QA pass                                    4 groups, 10 need Lucas, count the headings
    4  punchlist 8, the full audit sweep                  LAST by instruction, after every item
    5  flip Vercel Production to the platform branch      THE LAUNCH. Lucas, in the dashboard

**OPEN DECISIONS THAT GATE NOTHING TECHNICALLY BUT SHOULD BE SETTLED FIRST:** punchlist 2
(framing A, built, awaiting his eye), 5a (the weighting text, drafted below), and the four
unstarted build items 9, 10, 11 and 14 , **none of which is launch-blocking, and all of which
are cheaper to do before a QA pass than after one**, because each one re-opens a surface the
pass has already checked.

**[SUPERSEDED 2026-09-19 BY `QA_PASS.md` C5. THE ROTATION WAS NOT DECLINED, IT WAS DONE.]**
C5 records it rotated on 2026-08-31 with the fingerprint changing, `8dab9c72ec3e` ->
`0c6a1822ce7b`, and the local key fingerprints to the new value. Lucas has no memory of
declining a rotation. **The item is closed because it was done, not because it was dropped** ,
and that difference matters: "declined" reads as an accepted risk. The one open half is
confirming the OLD key is dead, which is Lucas's, in the provider dashboard.


### 9 , THE FOOTBALL PIE. THREE TREATMENTS, AND THE GEOMETRY IS THE WHOLE PROBLEM.

**THE DATA FIRST.** Nine leagues spanning **36.0 to 44.5 degrees** against a perfectly equal
40.0, a **1.24 ratio** end to end. **As a data chart this says almost nothing** , which is the
same finding that killed the per-pill counts in `ed704f5`. As a BALL it is an advantage: a
football's panels are supposed to be regular.

**BUT A FOOTBALL IS FIVE-FOLD SYMMETRIC AND OUR DATA IS NINE-FOLD.** Any treatment that makes
the wedges BE the panels has to give up one job or the other, and A and B both do:

    A  cream panels, hairline seams, dark pentagon centre   reads as a PIE WEARING A PENTAGON
    B  flag-derived tints, same geometry                    reads as a PIE, plainly
    C  a real football inside, the nine leagues as an
       OUTER RING around it                                 both jobs intact

**C IS THE ONLY ONE THAT KEEPS BOTH.** The inner graphic is the recognisable 2D football , one
centre pentagon, five around it , and the data sits in a ring outside, where 36 to 44.5 degrees
reads honestly as "near-equal" instead of pretending to be a panel layout. **A and B are shown
because they are what "pie chart styled as a football" literally asks for, and seeing them is
the argument for C.**

All three carry the existing hover/tap detail: cards, share of the record, clubs a season,
clubs in all, and the detailed-stats start , the same facts the league pills already show, from
the same source.

**NOT BUILT. Lucas picks.** If C, the pentagon placement wants one more pass , they currently
all point the same way rather than radially, which is visible at size.

### 9 , The league split, as a ball rather than a chart. Treatment C, live on the Playbook.

**[SUPERSEDED THE SAME DAY, AND THE WRITE-UP BELOW IS KEPT BECAUSE THE PARTS THAT ARE STILL TRUE
ARE STILL SHIPPED.] Lucas saw the render and it reads as a ring with a football pasted into the
middle. The measurement he asked for settles it: the wedges ARE to scale, and the median gap
between two NEIGHBOURING leagues is 0.88 degrees, which is 1.14px of arc at 168px and 0.90px at
132px. The 11px end-to-end difference is between the largest and smallest, which sit on opposite
sides of the ring and can never be compared directly. THE CHART IS TO SCALE AND UNREADABLE AT THE
SAME TIME , decorative, whatever the caveat in the stylesheet says.**
- **AND TRUE LEAGUE COLOURS MAKE IT WORSE: four of the nine leagues are red and two are navy**, so
  real colours are LESS separable than the invented palette. Colour cannot be the cue here; the
  flag on each chip already is.
- **STILL TRUE AND STILL SHIPPED: the angular hit test, the popover sharing one set of facts with
  the chip, and the pentagon-orientation finding.** Three replacement treatments are demoed in
  `_demo_ball2.html`; the recommendation is to stop drawing the data as a ring.


**THE PICK WAS C AND THE REASON IS THE DATA, NOT THE DRAWING.** The nine leagues span **36.0 to
44.5 degrees against a perfectly equal 40.0, a 1.24 ratio end to end** , 7,057 cards at the top and
5,698 at the bottom. A ball whose panels ARE the wedges therefore has to give up one job or the
other, because a football is five-fold symmetric and the data is nine-fold. **C keeps them apart:
an outer ring carries the nine, and a drawn football sits inside it carrying nothing.** The caveat
is written into the stylesheet above `.lgball`, in the same words: an object that carries facts, not
a chart that reveals a pattern. **Same finding as `ed704f5`**, which rejected a per-pill count for
the identical reason and wrote one floor sentence instead.

**THE PENTAGON ORIENTATION IS FIXED AND THE FIX IS INVISIBLE, WHICH IS THE CORRECT OUTCOME.** Each
of the five outer panels is placed with `rotate(k x 72deg) translateY(...)`, and because `rotate`
runs BEFORE `translateY` each panel is carried out to its own bearing AND turned to face it. **A
regular pentagon is invariant under a 72-degree rotation, so radial and stamped draw the same
pixels here.** That is what a real ball looks like; the note in the code says so, so nobody adds an
offset later to make the difference visible.

**A REAL DEFECT CAME OUT OF BUILDING IT, AND IT WAS IN THE DEMO TOO.** The demo used the CSS
pie-slice trick for its hit areas , `rotate(a) skewY(90-deg)` on a quarter-size box. **That trick
needs an `overflow:hidden` clip to become a wedge. Without one the boxes are overlapping
parallelograms and the LAST one in the DOM wins almost everywhere**: measured on the real page,
pointing at La Liga's gold wedge opened **Super Lig**. It is replaced by an angular hit test , the
bearing under the pointer, matched against the same cumulative arcs the conic gradient was built
from, so what you point at and what you see cannot disagree. **Verified by sampling the midpoint of
all nine arcs: nine of nine map to themselves, and the football at the centre is inert.**

**ONE SET OF FACTS. A wedge does not open a second panel** , it opens the chip's own popover, the
one that already shipped, so the ball and the strip can never say different things. A wedge OPENS
rather than toggles, because on a desktop the click arrives through a hover that has already opened
it and a toggle would close the panel as you reached for it.

**MEASURED, RENDERED, BOTH THEMES:** ball 168px desktop / 132px at phone widths off one `--bs`
variable; no horizontal overflow at 1440, 1100, 900, 760, 700, 560, 430 or 360; the ball stays
inside the plate at every one; side by side down to 560 and stacked below it; the popover at 390
renders full width under the chip row and fully in the viewport. **The opacity readings taken while
the tab was hidden are void and were discarded** , a 50ms timer took 768ms, the section C artefact;
the screenshots are the evidence.

### 19 , The dictionary starts speaking the card's colour language, and a three-copy drift closes with it

**THE REASON TO DO IT THIS WAY IS THE DRIFT, NOT THE PLAYBOOK.** The family fills were literals
inside `.vvcard .chtagcell-*`, reachable only from inside a card, and **the honour gold was not in
`vv-core` at all , it was declared THREE times, in `card.html`, `compare.html` and
`rankings.html`.** Adding a fourth copy for the Playbook was the obvious build and the wrong one.
The fills are now tokens declared once, and every existing rule reads them.

**THE RULES ARE NOT MOVED, ONLY THEIR VALUES, AND THAT IS DELIBERATE.** `vv-core`'s own note is
explicit that `VV_CARD_CSS` PREPENDS and that `.vvcard .chtagcell.gold` in the pages wins only by
coming later , relocating it would lose the gold on every honour pill. A token changes no cascade:
same selector, same specificity, same position, one source of colour.

**THE FAMILY IS LOOKED UP, NEVER TRANSCRIBED.** `FILTER_TAXONOMY.profile` already maps every tag
name to its group and is the same object the filter rail reads. The grey chip beside each name held
the family as TEXT, which WAS a transcription; it is hidden now. **All 16 tag names classify, zero
unclassified**, and an unknown name keeps the default charcoal pill rather than rendering unstyled.

**THE ONE THING THE PICK COULD NOT HAVE ANTICIPATED, MEASURED BEFORE SHIPPING: white on the card's
GRADIENTS runs 2.34 to 7.08**, because a gradient has two stops and the text crosses both. SS C
accepts that ON THE CARD FACE and scopes the exception to the face, so a dictionary entry , body
copy on a page of body copy , takes the gradient's DARK stop as a flat fill instead. Measured on
the shipping page at 19px/700, which is WCAG large text: **att 4.67, def 3.89, cross 9.73, honours
4.37, and midfield 3.00 exactly at the bar.** That green is the same one SS C already lists as an
accepted card-face exception at 2.34; here it clears rather than sits under. **If the gradients are
ever re-cut, re-cut the solids with them in the same edit**, or a tag reads as two families.

**AND A RULE I WROTE WAS DELETED BEFORE IT SHIPPED.** I added a `.tagdef.prestige` override, then
counted the rendered rows: sixteen `.tagdef` elements and **not one carries `.prestige`** , those
tags moved to their own exhibit. A rule guarding a class no element has is a selector that matches
nothing. The older `.tagdef.prestige` block further up the sheet is in the same state and is left
for its own sweep.

### 10 and 11 , the follow ask, and an install prompt that could never have fired

**10. THE X SHARE TEXT SAID "VVonderXI" AS A WORD, AND ON X A WORD IS NOT A LINK.** The single
highest-intent moment on the platform , someone posting a card , was the one place we were not
asking. `VVCore.vvXText` swaps the brand word for the handle on the X intent ONLY: WhatsApp renders
a handle as dead text, and the copy-link payload is read by a person rather than a platform.
It REPLACES rather than appends, because "on VVonderXI via @vvonderxi" says the same thing twice.

**AND THE DRAWER ROW REACHES LESS THAN I SAID IT WOULD , CORRECTED HERE RATHER THAN QUIETLY.** I
proposed it as "one tap from any of the nine pages". **Only `index.html` has a drawer.** The other
eight navigate by the `.spine` rail, which is `display:none` below 720px, so a row placed there
would be desktop-only. The home page is where a phone visitor lands, which is why the row is worth
having on its own , but a genuinely platform-wide follow ask is nine more copies or a vv-core
injector that reaches only the five surfaces which load it. **Not decided unilaterally.**

**11. THE FEATURE WAS ALREADY BUILT AND COULD NOT WORK ON ANY PLATFORM.** `preferences.html` had
the row, a `beforeinstallprompt` handler, an iOS fallback sheet, and two helper functions. Three
faults, and the first disabled the rest:
- **THERE WAS NO MANIFEST.** Not a broken one , none, and no page linked one. Chrome requires an
  installable manifest before it fires `beforeinstallprompt`, so the Android path was dead code
  from the day it was written.
- **SO EVERY TAP FELL THROUGH TO THE iOS SHEET**, which told Android users to find Safari's Share
  button.
- **`isStandalone()` WAS DEFINED AND NEVER CALLED**, so the row offered to install the app to
  someone already inside the installed app.

**THE LESSON IS THE SHAPE, NOT THE BUG: every piece existed and nothing connected them.** It read
as finished in the source and had never once appeared correctly on a screen.

**THE PROMPT IS ON THE HOME PAGE, AND IT IS `position:fixed` BECAUSE IT HAS TO BE.** SS D records
`index.html` as the one page meant to be a single fixed screen, and a defect was fixed in September
where 86px of dead scroll appeared on an iPhone. **Measured: the strip adds ZERO height and the page
still does not scroll.** It waits for a second visit, hides for good once dismissed, and only
appears when there is something real to offer , a waiting prompt, or iOS, where there never will be
one and the instructions are all we have.

### 14 , and the one real defect the demo work turned up

**CONTACT.HTML WAS THE ONLY PAGE IN THE PRODUCT WITH NO NAVIGATION AT ALL.** Every other page,
`preferences` and `myclub` and `iwonder` included, carries the spine rail and the bottom bar. This
one had a back chevron calling `history.back()` **with no fallback**, so a visitor arriving DIRECTLY
, a shared link, a search result, or the new CTA on the VV Index , landed on a page with no way
onward, and the chevron did nothing at all, silently. It now carries the five-destination bar and
the chevron falls back to the home page.

**THE SPINE IS NOT ADDED, AND THAT IS A DECISION RATHER THAN AN OMISSION.** This page's body is
`max-width:412px; margin:0 auto` at EVERY viewport , it is a phone-shaped sheet, not a platform
page, and a rail cannot sit beside a centred 412px column without redesigning it. **That is Lucas's
call, not something to smuggle into a nav fix.**

**AND THE BOTTOM BAR SHOWS AT EVERY WIDTH HERE, ALONE ON THE PLATFORM.** Everywhere else it is
`display:none` until 720px because the spine takes over; this page has no spine to hand over to, so
hiding it above 720 would restore the exact defect being fixed.
- **THE WAY THAT WAS FOUND IS THE POINT.** I copied the rules across with a line-based regex, which
  lifted the `display:flex` rule OUT of its `@media (max-width:720px)` wrapper and left it
  contradicting the `display:none` above it. **The paste read fine. Measuring the rendered page at
  1200 is what caught it** , the same family SS C records as a block move losing its `@media`
  closer.

### 19 , part two. Compare's accolades, and three palettes becoming one

**THE RENDERER WAS ALREADY SHARED AND ALREADY CARRIED THE FAMILY.** `renderProfileTagRows` lives in
vv-core, card and compare both call it, and every row has carried `data-fam` and `data-tag` all
along. **The treatment was the part that was not shared:** it lived as `#wonderTags .tagrow[data-fam]`
in card.html, scoped to an id only the card has, so compare rendered identical markup as plain text.
No new renderer, no fourth copy , CSS only.

**AND THE CARD HAD ALREADY DONE THE CONTRAST WORK, BETTER THAN I DID.** Its MID and DEF were
hand-darkened to `#258652` and `#4374CC` with the note "darkened, see above", against the tokens I
built yesterday from the gradient's dark stop. Measured against white: **card 4.55 and 4.56, full AA
, mine 3.00 and 3.89, large-text only.** Three of five families already agreed exactly. The better
pair won and became the tokens.

**SO THIS CLOSES AN OPEN ITEM RATHER THAN ONLY ADDING A FEATURE:** the Playbook's midfield pill was
sitting at **exactly 3.00**, flagged the day it shipped as the one at the bar. It is **4.55** now,
and defence moved 3.89 to 4.56, with no edit to the Playbook at all.

**VERIFIED ON ALL THREE SURFACES:** compare's accolades draw gold silverware, gold Iconic, the
engraved Standard and the family fills; the CARD is unchanged, ATT and MID computing to the exact
same values as before; the Playbook improved without being touched.

**AND SECTION C'S OWN TRAP CAUGHT ME TWICE IN ONE EDIT.** Writing the comment for these tokens I used
backticks around two hex values , inside a CSS comment, inside `VV_CARD_CSS`, which is a template
literal. It ended the literal early and left the module half-defined. `node --check` passed; the
require-and-assert guard failed loudly, which is exactly why section C prescribes it. **Then I wrote
the sentence explaining that mistake, with backticks, and broke it again.** The payload is asserted
backtick-free now as part of the check.

### 20 , the emphasis was there all along and could not be seen

**THREE SEPARATE THINGS, AND ONLY ONE OF THEM WAS VISIBLE.**

**(a) THE VISUAL STEP.** `.vvem` set weight 700 against a body already at 600, in Bricolage
Grotesque ITALIC, same colour and same size. A 100-unit step in a display italic is not emphasis,
it is a rounding error. Lucas reported "no bold" and he was right: it was there and it could not be
seen.

**(b) THE DEAD RULE, AND IT HELD THE ANSWER.** `compare.html` has carried
`.vsprose b{font-style:normal;font-weight:800;color:var(--gold)}` , gold, upright, 800 , for
months, **and it has never once rendered**, because it targets `b` and nothing emits one: the model
writes double asterisks and `vvEmphasis` produces `<strong class="vvem">`. A designed treatment
that has never appeared is the same shape as the wait class applied in markup and never removed.
It is REPOINTED rather than deleted, and the `b` selector is kept: if the pipeline ever emits a
`<b>` again it lands on the same treatment instead of on nothing.

**THE UPRIGHT CUT DOES AS MUCH WORK AS THE COLOUR.** The body is italic, so breaking the italic run
is the signal a reader's eye catches first and the gold is the reinforcement rather than the
mechanism. That is why weight-alone at 800 was the weakest of the three demoed, and why the rule
someone designed here was right the first time.

**MEASURED ON THE REAL PAGE, BOTH PROSE SHAPES, BOTH THEMES:** 800 upright against a 600 italic
body, gold `#E8B84B` in dark at **10.24** on the Story ground and **8.29** on the verdict ground,
`#7e5a10` in light at **5.90** and **6.26**. The headline keeps its own rule and takes no emphasis.

**(c) THE MODEL UNDER-MARKING THE VERDICT FIELD , LOGGED IN SECTION C, NOT ACTED ON.** Measured on
a freshly generated preview verdict: p1 two phrases, p2 two, h2h one, **verdict ZERO**. The
hypothesis is plausible and untested, and `VERDICT_VERSION` fingerprints the prompt, so an edit
would regenerate every cached row on a guess. **Measure several current verdicts first.**

### 20 , part two. Five prose surfaces, three different right answers

**THE SURVEY WAS THE POINT, AND ONLY ONE OF THE FIVE HAD EVER BEEN LOOKED AT.** Every surface that
runs model output through `vvEmphasis` was deciding separately what emphasis means:

| surface | base | before | after |
|---|---|---|---|
| compare `.vsprose` / `.vquote` | Bricolage italic 600 | 700, invisible | 800 upright, gold |
| card `#scoutBody` | Bricolage italic 700 | 800, weight only | 800 upright, gold |
| card `#notesBody` | Bricolage italic 600 | 700, invisible | 800 upright, gold |
| card `#glDrury` | Bricolage italic **800**, pink | **700 , LIGHTER THAN ITS BASE** | none, neutralised |

**`#glDrury` WAS NOT INVISIBLE, IT WAS INVERTED.** The generic 700 is lighter than that line's own
800, so an emphasised phrase came out LESS bold than the sentence around it. It now takes none at
all, which is the `.vwho` decision rather than a new one: one short line at 800 italic in pink is
already emphasis by construction, and anything added inside it can only fight it.

**AND THE INK IS NOT THE SAME ON BOTH PAGES, WHICH IS THE FINDING WORTH KEEPING.** Compare's prose
grounds flip with the theme, so it reads the theme-aware `--vvem-ink`. **The card's editorial boxes
are CREAM IN BOTH THEMES** , composited, rgb(240,235,218) dark and rgb(249,247,240) light, with a
pinned #3a352e base ink , so handing them the same token put gold on cream at **1.54, WORSE than
the weight-only treatment it replaced.** They read `--vvem-ink-fixed` instead: **5.24 and 5.82.**
Section C in one line: match the ink to the GROUND, not to `body.light`.

**TWO MEASUREMENTS LIED FIRST, BOTH IN WAYS SECTION C ALREADY RECORDS.** The card page opens in
LIGHT, so a reading taken without setting the theme explicitly reported the light value for both
themes and looked correct. And the box ground is a translucent `rgba(255,255,255,0.03)` over a
cream card, so reading the nearest non-transparent background gave **1.84** where compositing every
layer gives **1.54**. **A contrast number is only worth acting on once every layer beneath it has
been composited.**

### 1 , how the crown is actually decided

**THE ANSWER IS REASON-FIRST, AND IT IS STRUCTURAL RATHER THAN INSTRUCTED.** The required output
format is `{"p1", "p2", "h2h", "verdict", "tag", "who", "winner"}` , **`winner` is the LAST key**.
A model generates left to right, so every token of the argument is emitted before the winner token
and the field is conditioned on the prose. Nothing has to trust an instruction to "think first".

**AND THERE ARE TWO PATHS, CHOSEN BY THE ENGINE BEFORE THE MODEL IS EVER CALLED.**

**Path 1, the gap clears the margin.** The engine has already decided, and the prompt says so in its
own words , "the VV Index has already decided the winner: you do not overturn it, you explain it".
**The model's `winner` is not merely ignored, it is unreachable**: `resolveWinnerId` returns the
CALLER's `winnerCardId` on this path, and client-side `applyVerdictOutcome` returns early without
reading the model's answer at all. Here it IS pick-then-justify , but the pick is arithmetic, and
the thing being justified is a measured gap rather than a preference.

**Path 2, the gap sits inside the margin, outfield pairs only.** The model genuinely decides.
**Three server-side guards, and they are cheap and total:** the value must be the literal "A" or
"B", anything else including a card id is a decline; "A"/"B" resolve against the ids THIS REQUEST
carried, so a hallucinated id cannot enter the table; and the resolved id must be one of the two in
the pair. **A decline and a failed check both land on `null`, which is the safe state** , no crown,
no `winner_card_id`.

**THE ONE UNGUARDED SEAM IS AGREEMENT BETWEEN THE PROSE AND THE FIELD.** Every other property of
that field is verified server-side; whether the headline names the same season the field does is
not. The prompt names the failure itself , "crowning one season in the prose and returning the
other puts a badge over the season you argued against" , and then relies on compliance. That is
what item 17 detects and logs, at about 90% reliability, with no override.

**A NOTE ON THE HEADLINE, because it sharpens the seam:** `who` is emitted BEFORE `winner`. So a
disagreement is not the model changing its mind between two calls , it is one generation
contradicting itself in the space of two keys.

### 15 , continental honours, scoped

**NO SCHEMA CHANGE IS NEEDED, AND THAT IS THE CHEAP HALF.** `HONOUR_META.tier` is read only in JS
and only for sorting; the database stores `{leg, type, year}` and no tier at all. The World Cup
already ships the exact mechanism a continental honour needs , `leg:"career"`, `wonBy:"team"`, a
dated cabinet entry on every later card , so this is new META plus new ROWS, not new structure.

**THE EXPENSIVE HALF IS THAT THE FIVE CONFEDERATIONS ARE NOT COMPARABLE, AND THE NUMBERS ARE STARK.**
Upper-bound reach, measured as every card whose player holds the nationality of a nation that won
that confederation's tournament in our window:

| confederation | winning nations in window | cards, upper bound |
|---|---|---|
| UEFA | Spain, Portugal, Italy | **11,603** |
| CONMEBOL | Uruguay, Chile, Brazil, Argentina | **5,779** |
| CAF | Egypt, Zambia, Nigeria, Ivory Coast, Cameroon, Algeria, Senegal | 2,517 |
| AFC | Japan, Australia, Qatar | **553** |
| CONCACAF | USA, Mexico | **503** |

**These are ceilings, not counts** , a squad is about 23 players and most hold no card in our nine
leagues. But the RATIO is the decision: **UEFA and CONMEBOL are roughly 80% of the possible reach,
and AFC and CONCACAF are under 1% of the database each**, while costing the same per tournament to
source , 4 Asian Cups and 8 Gold Cups against 4 Euros.

**SO THE RECOMMENDATION IS TO SEQUENCE RATHER THAN COMMISSION ALL FIVE.** Euro first: four
tournaments, the highest reach, and squads almost entirely inside the nine leagues, which is also
the easiest set to verify. Then Copa America. **Then decide whether AFC, CONCACAF and OFC are worth
twenty more tournaments for a combined ceiling near 1,000 cards** , that is a judgement about
completeness against effort, and it is Lucas's.

**AND IT SHOULD NOT BE COMMISSIONED BEFORE ITEM 16 IS SCORED.** Both are external sourcing passes
of the same shape, and 16's retrieval prompt is written and un-run. Running a second before the
first has told us whether retrieval clears its gate is spending the same unknown twice.

### 19 , part three. The pills were the right colour in the wrong typeface

**THE PLAYBOOK NEVER LOADED BARLOW CONDENSED.** `card.html` requests it; `playbook.html` requests
Bricolage, Archivo and Inter and nothing else. I set the dictionary pills in
`'Barlow Condensed', Archivo, sans-serif` on the strength of the card's rule, and the stack fell
straight through to Archivo , which is not condensed, so every pill rendered about a third too
wide. **Measured rather than eyeballed: "GOAL MACHINE" at 19px/700 came to 155px in the declared
stack and 155px in Archivo, against 103px once the font actually loads.** That is the whole
complaint , "the font is wrong on both and the size is wrong on mobile" is one cause with two
symptoms.

**AND `.cm-sb` ON THE SAME PAGE HAS THE SAME BUG, OLDER THAN MINE.** It has asked for Barlow
Condensed since before this work and the page has never served it. Fixed by the same font request.

**A SECOND DEFECT THE SAME MEASUREMENT CAUGHT: the honour headings were not pills at all, they were
BARS.** `.hcell` is a flex column, `align-items` defaults to stretch, and **stretch applies to a
flex item whatever its own `display` says** , so `display:inline-flex` did not shrink-wrap them.
All four rendered at exactly 305px at 390 regardless of whether they read "Ballon d'Or" or "World
Cup Winner", **and four different labels coming back the same width is the tell.** They hug their
text now: 117, 168, 130, 125, 193. The card's own rows solve this with `flex:0 0 auto`, which I
carried into the shared `.tagrow` rules and did not carry into this one.

### 9 , reversed. The football comes off the Playbook

**BUILT, THEN REMOVED ON LUCAS SEEING IT IN PLACE: it is irrelevant there.** The plate's job is to
say which competitions the record covers and where the detail begins, and a drawing of a football
answers neither.

**NOTHING MEASURED WAS LOST WITH IT**, and that is not a consolation , it is the same finding that
removed the ring two days earlier. The drawing never carried a measurement. The chips, their
shares, the popover and the equal-share line all survive, and they are the parts that were ever
saying anything.

### 36 , the BAM club-name check cannot tell a finished season from a broken one

**THE MECHANISM.** `export-league-csv.js` builds `club_names` by splitting a season's fixtures
into a PLAYED name set and an UNPLAYED one, and sets `match` only when neither holds a name the
other lacks. **On a completed season the unplayed set is EMPTY, so every club reads as "only in
played" and `match` is false by construction.** The check is only meaningful while a season still
has fixtures to play , which is exactly the case it was verified on, Eredivisie 2026/27.

**MEASURED 2026-09-19 over the nine platform-league exports, counted rather than quoted: 93 of 94
seasons read `match:false`.** 87 of them have an unplayed set of zero, so the false is the
empty set and says nothing about names. **The only season reading true is Eredivisie 2019/20**,
and only because 74 `CANC` fixtures populate its unplayed set.
**My first report of this said "94 of 108". Both numbers were wrong** , there are 94 seasons,
and I quoted a denominator I had not counted. Corrected before it was written here.

**THE CONSEQUENCE IS FOR THE BRIEF, NOT THE PLATFORM EXPORTS.** `check-coverage.js` does not read
the platform directories today, so nothing prints. **Once the fourteen brief leagues are exported,
it will print `CLUB NAMES DIFFER` on every completed season of every league**, and FAIL each one.
A guard that fires on every row is a guard nobody reads , the real mismatch it exists for would
arrive inside a wall of false ones.

**SIX SEASONS DO CARRY UNPLAYED NAMES AND I HAVE NOT LOOKED AT THEM:** BPL 2011, 2012, 2013 and
2014 (two unplayed names each), L1 2013 (two) and TR 2022 (two). **They may be real name
asymmetries, abandoned fixtures, or play-off entrants , unknown.** Read them before the fix,
because the fix changes what they report.

**THE FIX IS NOT SCOPED.** The shape it needs is a comparison against a vocabulary that exists on a
finished season , the regular-season `club_set` already in the same meta is the obvious candidate
, rather than against the unplayed set. **Do not "fix" it by treating an empty unplayed set as a
pass:** that turns the check off on exactly the seasons BAM fits on, and a name split in a
finished season is the case with the most rows behind it.

