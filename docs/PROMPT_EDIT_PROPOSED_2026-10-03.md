# THE ONE PROMPT EDIT , WRITTEN, PRICED, NOT APPLIED (2026-10-03)

**NOTHING HERE IS IN `api/analyse.js` YET.** This file is the diff to review. It exists because
`VERDICT_VERSION` is a fingerprint of the prompt text and `NOTES_SYSTEM` is built from
`VERDICT_SYSTEM`, so **every edit below costs the same rebuild whether it ships alone or with
six others.** That is the whole argument for carrying them together.

---

## WHAT THE REBUILD COSTS, MEASURED TODAY RATHER THAN ESTIMATED

| | |
|---|---|
| `notes_cache` | **720 rows, 654 on the current prompt** |
| `verdict_cache` | **205 rows, 83 on a current prompt base** |
| **discarded by any edit to `VERDICT_SYSTEM`** | **737 rows** |

**Re-warm at rates measured on 2026-10-03, not quoted from the doc:**

| | | |
|---|---|---|
| 622 notes at rt>=85 | $0.0133 each | **$8.25** |
| 71 verdicts (rt>=95 + rt>=93) | $0.0141 each | **$1.00** |
| | **deliberate re-warm** | **$9.25** |

The remaining ~44 regenerate **organically**, paid on first view rather than up front.

**THE 720 WARMED NOTES ARE PART OF WHAT THIS DISCARDS.** They were generated this morning for
$8.25 and a prompt edit throws all of them away. **That is not an argument against the edit** ,
it is an argument for making it ONCE, with everything in it, which is what this file is for.
It is also why the warm was worth doing anyway: item 25 cannot be measured without a populated
cache, and the population is what the measurement needs before the edit is justified at all.

**PRICE IT AGAIN BEFORE SHIPPING.** These rates were measured on one afternoon's batch; the
note rate in particular depends on prompt caching staying warm across the run.

---

## 0. RULE 4 BECOMES LENGTH-AWARE , THIS **REPLACES** THE QUEUED ITEM 25 EDIT

**THE QUEUED EDIT WAS TO MAKE RULE 4 LOUDER. MEASURED AT n=654, THAT WOULD HAVE MADE THE
OUTPUT WORSE**, and the reason is that the model was already complying with a sensible rule we
had never written.

**WHAT THE MEASUREMENT SAYS.** Emphasis tracks block LENGTH almost linearly:

| stanza length | marks | n |
|---|---|---|
| 0-40 words | 0.20 | 245 |
| 40-70 | 0.67 | 1,461 |
| 70-100 | 0.99 | 797 |
| 100+ | 1.30 | 113 |

**That is a constant DENSITY of roughly one phrase per 80 to 90 words**, and it predicts all
three field readings from their median length alone: glance 23 words -> 0.00, stanza 62 -> 0.75,
scout 104 -> 1.16. **Rule 4 asks for a fixed COUNT per block; the model delivers a fixed RATE.**

**AND ON A SHORT BLOCK THE RULE IS TYPOGRAPHICALLY IMPOSSIBLE.** Two to three marked phrases of
two to six words inside a 23-word glance is roughly a third of the line in bold. **The model
refusing that on 652 of 654 glances is editorial judgement, not disobedience.**

**THE REWORDING LEVER HAS ALREADY BEEN PULLED.** SS C hypothesised that "per paragraph" did not
bind to a block called a stanza. That fix IS SHIPPED , the live rule reads *"EVERY BLOCK OF
EVERY FIELD, WHATEVER THAT BLOCK IS CALLED , a paragraph, a stanza"* , and compliance is still
a third to a half. **Saying it again, louder, is repeating a failed experiment.**

```diff
@@ api/analyse.js , NOTES_SYSTEM rule 4
-4. EMPHASIS , TWO TO THREE PHRASES IN EVERY UNIT OF PROSE YOU WRITE, WRAPPED IN DOUBLE
- ASTERISKS. THIS BINDS ON EVERY BLOCK OF EVERY FIELD, WHATEVER THAT BLOCK IS CALLED , a
- paragraph, a stanza, a single-paragraph field, the verdict, the head-to-head. If it is prose
- and it is longer than a headline, it carries two to three marked phrases. The only field
- exempt is the "who" headline, which is already set apart by its own type.
+4. EMPHASIS , MARKED PHRASES IN PROPORTION TO THE LENGTH OF THE BLOCK, WRAPPED IN DOUBLE
+ ASTERISKS. THIS BINDS ON EVERY BLOCK OF EVERY FIELD, WHATEVER THAT BLOCK IS CALLED , a
+ paragraph, a stanza, a single-paragraph field, the verdict, the head-to-head.
+   A SHORT BLOCK, UNDER ABOUT FORTY-FIVE WORDS: ONE marked phrase, or two at the most.
+   A LONGER BLOCK: TWO TO THREE.
+ TWO FIELDS ARE EXEMPT ENTIRELY AND CARRY NO MARKS AT ALL: the "who" headline and the
+ "glance". Both are set apart by their own type and both are too short to mark honestly , a
+ marked phrase inside a twenty-word line puts a third of it in bold, which is not emphasis,
+ it is shouting. If a block is short enough that a mark would dominate it, leave it unmarked
+ and say so by doing nothing.
```

**WHAT THIS FIXES AND WHAT IT DOES NOT , STATED RATHER THAN GLOSSED.** It removes an impossible
demand on short blocks and makes the glance's measured behaviour correct instead of a failure.
**It does NOT on its own bring long blocks to two or three.** Scout at 104 words currently reads
**1.16 against a two-to-three ask**, so the gap there is real and survives this edit. **Retake
the measurement after the edit rather than assuming it closed** , and if 1.16 is what good
writing actually wants on a 104-word block, the honest move is to change the TARGET rather than
keep missing it.

---

**[SECTION 1 APPLIED 2026-10-09, both diffs, on Lucas's instruction once live traffic made 66 contradicting verdicts worth more than the warm cache. Field names written as "who" in double quotes, not backticks, because the prompt is a template literal. Versions moved: Path A v3-9bf2be0f to v3-d2986f92, Path B v3-ddd9c19c to v3-9a7cbfe1, notes v3-279c6350 to v3-28bfe954. Discarded: 660 notes, 102 verdicts, regenerated on view. Re-measure the five figures in the table below once tie rows exist on the new base.]**

## 1. THE TIE STATE CROWNS A WINNER IN PROSE , MEASURED AT n=69, AND THE ORIGINAL DIAGNOSIS HERE WAS THE WRONG HALF OF IT

**[REWRITTEN 2026-10-04 ON A MEASUREMENT. THE SECTION THIS REPLACES CALLED IT A SCORE LEAK AND
PROPOSED A FIX FOR THE THIRD STATE. BOTH THE DEFECT AND THE STATE WERE MISIDENTIFIED, AND THE
PROPOSED DIFF WOULD HAVE BITTEN THE WRONG PAIRINGS.]**

**THE POPULATION, NOT AN ANECDOTE.** Every `verdict_cache` row on the current Path A base whose
`rt_a` equals its `rt_b` , **69 rows**:

| | |
|---|---|
| prose using banned winner language (`edges it`, `shades it`, `takes it`, ...) | **63 of 69 (91%)** |
| `who` headlines containing a VV Score | **65 of 69 (94%)** |
| `winner` field returning "A" or "B" rather than null | **66 of 69** |
| `tag` correctly set to `the_debate` | **67 of 69** |
| Path B control, where a winner IS permitted | 10 of 19, correct |

Live headlines, verbatim: *"Messi edges it, barely, 96 to 96. The debate lives on."* and
*"Salah edges it, 95-95. The full profile decides what the goals alone cannot."*

**THE STATE IS `tie`, NOT `inside`, AND THAT IS WHY THE OLD DIFF WOULD HAVE MISSED.**
`verdictContext` sets `separation = g === 0 ? 'tie' : (separated ? 'separated' : 'inside')`, so
a gap of zero never reaches the `inside` branch. The replaced section proposed gating the fix on
*"WHEN THE RESULT LINE SAYS INSIDE THE MARGIN"*, which is the phrase that governs `inside`
pairings , the ones measured here at **0 of 19 naming a score**. **It would have tightened the
state that is already clean and left the state that fails 91% of the time untouched.**

**AND THE SCORE IS NOT THE DEFECT ON A TIE, BECAUSE THE UI PRINTS IT ANYWAY.** `_showScore` in
`compare.html` is `separation !== 'inside'`, so a tie renders "96 & 96" directly beneath the
prose, deliberately, with a comment explaining that an exact tie is one of the two cases where
the score line can be read without implying a rank. **Prose naming a number the page prints four
inches below it is redundant, not a disclosure.** The old section's prohibition on paraphrase ,
*"level on ninety-six"*, *"both in the mid-nineties"* , would have forbidden the most natural
way to write a tie verdict, in order to hide a figure already on screen.

**WHAT IS ACTUALLY WRONG IS THE WINNER, AND IT CONTRADICTS THE CHIP BESIDE IT.** The model picks
`the_debate` correctly on 67 of 69 , whose blurb reads that the argument is not over , and then
crowns a season in the prose on 63 of them. One row, two answers.

**SEVERITY, STATED HONESTLY, BECAUSE IT WAS OVER-RANKED ONCE ALREADY TODAY: IT IS PROSE ONLY.
NO CARD IS EVER BADGED ON A TIE.** `applyVerdictOutcome` opens with
`if (ctx.separation !== 'inside') return out;`, so a model-returned winner is discarded on a
tie. **Control-tested rather than read**, the same context with the model crowning A:

```
separation=tie        -> winner=tie   decidedBy=null    floorTag=(none)
separation=inside     -> winner=A     decidedBy=ai      floorTag=prodigy
separation=separated  -> winner=tie   decidedBy=null    floorTag=(none)
```

The `inside` row is the positive control: the gate CAN fire, so the `tie` row is a refusal
rather than a dead path. **So the machine state is correct throughout , chip, badge and
`winner` all say unresolved , and only the sentences disagree.**

**IT CANNOT BE FIXED FROM THE USER PROMPT, AND THAT IS ESTABLISHED RATHER THAN ASSUMED.**
`compare.html` already carries the prohibition twice. The tie `winNote` says *"Do NOT name a
winner and do NOT say either 'edges it'"*. The non-separated `_whoSpec` says *"THERE IS NO
WINNER TO NAME"* and offers **"Salah edges it" as its explicit counter-example** , and the model
produced that exact string. **A user-prompt line naming the forbidden phrase loses to the system
prompt 91% of the time, so restating it again is the repeat-a-failed-experiment move SS C
records against item 25.**

**THE SYSTEM-SIDE CAUSE IS LINE 304, AND THE REPLACED SECTION WAS RIGHT ABOUT THAT MUCH.** The
`who` field spec is unconditional: *"Name the winner and include BOTH VV Scores as passed."* The
measured output , 63 of 69 naming a winner, 65 of 69 printing a score , is near-exact compliance
with those two demands. **The old section identified the right sentence and the wrong trigger.**

**SO THE FIX IS TO MAKE LINE 304 STATE-AWARE ON THE ABSENCE OF A WINNER RATHER THAN ON THE WORDS
"INSIDE THE MARGIN":**

```diff
@@ api/analyse.js , the `who` field spec (currently line 304)
- ... Name the winner and include BOTH VV Scores as passed. If AGE tipped a coin-flip, lead
- with the younger-age feat.
+ ... Name the winner and include BOTH VV Scores as passed. If AGE tipped a coin-flip, lead
+ with the younger-age feat.
+  THAT SENTENCE APPLIES ONLY WHERE THE RESULT LINE NAMES A WINNER OR ASKS YOU TO JUDGE ONE.
+  WHERE IT SAYS THERE IS NO WINNER , whether because the two scores are LEVEL or because the
+  gap sits inside the margin , `who` names none, and neither does any other field. Banned
+  outright in that state, in prose as well as in the headline: "edges it", "shades it", "takes
+  it", "just ahead", "the better of the two", "gets the nod", "by the narrowest". A closing
+  line that leaves the reader in no doubt which season you preferred IS a winner, whatever
+  words it used, and the chip rendered beside you will read "The Debate Lives On".
+  THE SCORES ARE A SEPARATE QUESTION AND THEY ARE NOT FORBIDDEN ON A LEVEL PAIRING , the page
+  prints both beneath your line there. Do not repeat them in `who`, for the same reason you do
+  not repeat a scoreline on a separated pair: the UI already renders it.
```

**AND LINE 235 DESCRIBES A MECHANISM THAT NO LONGER EXISTS, WHICH IS THE SECOND HALF.** It
reads *"If a tiebreak has already decided it, there IS a winner: name them and lead with the
reason they took it."* SS C records the age tiebreaker as **retired** , `tipped` is false
unconditionally , so that clause can never apply and the model is being offered a route to a
crown that the engine closed.

```diff
@@ api/analyse.js , line 235
- If a tiebreak has already decided it, there IS a winner: name them and lead with the reason
- they took it. If the Result line says the pairing is GENUINELY LEVEL with no tiebreak, do NOT
- crown anyone ...
+ NOTHING BREAKS A TIE ON THIS PLATFORM. Where the two published scores are equal there is no
+ tiebreak, no winner and no crown , age describes a season here, it never awards it. Do NOT
+ crown anyone ...
```

**COST AND TIMING, WHICH IS WHY THIS IS STAGED AND NOT APPLIED.** Both diffs touch
`VERDICT_SYSTEM`, which `VERDICT_VERSION` fingerprints and which `NOTES_SYSTEM` is built from,
so applying either discards **655 cached notes , the whole rt>=85 band, 650 of 650 cards , and
88 live-hittable verdicts.** On 2026-10-04 that band is 100% warm and a production flip is
imminent, so applying a prose-only fix would turn the best-warmed surface on the platform cold
on launch day. **It rides with the rest of this document, once, deliberately.**

**AND WHEN IT SHIPS, THE 69 EXISTING ROWS DO NOT NEED DELETING** , the fingerprint moves, so
every one of them becomes a miss and regenerates on next view. Re-measure the same five figures
afterwards rather than assuming the edit worked; the query is the one in this section's table.

---

## 2. THE MODEL MAY NOT CONTRADICT THE CARD'S OWN FIELDS

**OBSERVED, on Robertson 19/20 vs Retegui 24/25:** the payload carried `pos CB`; the verdict
wrote *"Creation from a **left-back**"* and *"genuinely rare for a **full-back**"*.

**THE MODEL IS RIGHT ABOUT FOOTBALL AND WRONG ABOUT OUR CARD** , Robertson is a left-back, and
SS E records the stored pool as a known defect. **That is what makes it dangerous rather than
harmless:** the prose will render beside a card face reading `CB`, so the platform contradicts
itself on screen, and the same mechanism would "correct" a field that was RIGHT.

```diff
@@ api/analyse.js , new rule in the shared tail (below THIRD_STATE_END, so BOTH paths get it)
+THE CARD'S FIELDS ARE THE EVIDENCE, AND YOU MAY NOT OVERRULE THEM FROM MEMORY.
+The position, club, league, age and figures in the payload are what this platform published
+for this season. If the payload says the position is CB, then for this verdict he is a CB ,
+you may write about what he did, never about what you believe the field should have said.
+This is not a style rule. The reader is looking at a card that prints those same fields, so a
+verdict that calls him a full-back while the card says CB makes the platform contradict itself
+in the reader's eye, and the reader cannot tell which half is wrong.
+IF A FIELD LOOKS WRONG TO YOU, WRITE AROUND IT. Describe the output, the honours and the
+role as the figures show it, and leave the label alone. Never announce the discrepancy either
+, "listed as a centre-back but really a full-back" is the same error wearing a hedge.
+REFINING A FIELD IS ALLOWED. CROSSING IT IS NOT, AND THE LINE IS THE FIELD'S OWN MEANING.
+`FB` covers both flanks, so writing "right-back" about an FB is the same claim said more
+precisely, and it is better writing. `CB` and `FB` are DIFFERENT buckets, so writing
+"left-back" about a CB replaces our answer with yours.
+THE TEST: could the card's value and your word both be true of the same player at once? A
+right-back IS a full-back, so yes. A left-back is NOT a centre-back, so no. When the honest
+answer is no, use the card's word.
```

---

## 3. NO CLAIM ABOUT SEASONS THE PAYLOAD DOES NOT CONTAIN , THE MOST DANGEROUS OF THE THREE

**OBSERVED, on C. Ronaldo 11/12 vs Salah 24/25:** *"...something Ronaldo never did in his
Madrid years."* **The payload contains ONE Ronaldo season.** A claim about what he did or did
not do across nine of them cannot be supported by it.

**IT IS THE MOST DANGEROUS BECAUSE NOTHING IN THE OUTPUT MARKS IT AS A GUESS.** A wrong figure
can be checked against the card sitting beside it; a career claim has no card, reads as
authoritative, and is indistinguishable in tone from the sentences around it that ARE
evidenced. It is the same failure as rule 2 , reasoning from world knowledge where the
evidence stops , and it is harder to catch because there is nothing to compare it against.

```diff
@@ api/analyse.js , new rule in the shared tail (below THIRD_STATE_END)
+YOU ARE COMPARING TWO SEASONS AND YOU KNOW NOTHING ELSE. Every claim you make must be
+supported by what is in this payload: these two seasons, their figures, their honours, their
+positions, their leagues and their ages. You may not write about a player's OTHER seasons,
+his career totals, what he won before or after, how this compares with his peak, or what any
+third player did. You were not given those and you cannot check them.
+THE TEST IS ONE QUESTION: could a reader verify this sentence from the two cards in front of
+them? If not, it does not belong in the verdict, however true you believe it to be.
+"Something he never did in his Madrid years" is the measured failure , nine seasons' worth of
+claim from a payload holding one. It reads as authoritative, nothing marks it as recalled
+rather than recorded, and that is precisely why it is forbidden.
+THE ERA AND THE COVERAGE BOUNDARY ARE NOT EXCEPTIONS , they are IN the payload. Saying a
+pre-2015 season carries a thinner record is reading the evidence. Saying what that player did
+in 2016 is not.
```

---

## WHAT THE SINGLE EDIT NOW CARRIES

0. **rule 4 made LENGTH-AWARE** , REPLACES the queued item 25 edit, which measurement shows would have made it worse
2. 5a weighting
3. the honour tier
4. the identical-scores wording
5. **the third-state score leak** (new, 2026-10-03)
6. **no contradicting the card's fields** (new, 2026-10-03)
7. **no claims beyond the payload** (new, 2026-10-03)

**ITEMS 5 TO 7 WERE FOUND BY READING SIX VERDICTS, WHICH IS THE ARGUMENT FOR READING MORE
BEFORE SHIPPING THIS.** Five comparisons produced three distinct reasoning defects, none of
which any sweep of rendering would have found. **The cheapest thing available before an edit
that costs $9.25 and discards 737 rows is to read another dozen verdicts and see whether the
list is still growing.** If it is, the edit is premature.

**AND MEASURE ITEM 25 FIRST, OR THE EDIT CANNOT BE JUDGED.** SS C withdrew the item 25 figures
and set the gate as "both prompt bases have stopped moving". The 720 notes warmed today are the
population that gate was waiting for. **Taking the measurement is free and it is the only thing
that says whether rule 4 needs changing at all** , and if it does not, this edit is six changes
rather than seven.
