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

## 1. THE THIRD-STATE SCORE LEAK , AND THE CAUSE IS A CONTRADICTION INSIDE THE PROMPT

**OBSERVED, on Messi 14/15 vs Messi 12/13 (96 vs 96, third state):** paragraph 2 opened
**"Both scores read 96."** The `who` line complied , *"Two seasons. No verdict."* , and the
prose did not.

**THE RULE ALREADY EXISTS AND IS EXPLICIT.** Line 229, inside the third-state block:
*"NEITHER VV SCORE AND NEITHER BAND APPEARS IN YOUR OUTPUT."* So this is not a missing rule.

**IT IS A DIRECT CONTRADICTION WITH THE FIELD SPEC, IN THE SAME SYSTEM PROMPT.** Line 304
specifies the `who` field **unconditionally**: *"Name the winner and include BOTH VV Scores as
passed."* On a third-state pairing those two sentences cannot both be obeyed, and the model
resolved it by splitting them , which is the worst available outcome, because it looks like
compliance until you read the second paragraph.

**THE FIX IS TO MAKE THE FIELD SPEC STATE-AWARE**, so the two never disagree.

```diff
@@ api/analyse.js , the `who` field spec (currently line 304)
-- who: ONE short winner headline, max ~14 words, in the REGISTER OF THE CHOSEN TAG and the
- TONE given in the prompt. ... Name the winner and include BOTH VV Scores as passed. If AGE
- tipped a coin-flip, lead with the younger-age feat.
+- who: ONE short winner headline, max ~14 words, in the REGISTER OF THE CHOSEN TAG and the
+ TONE given in the prompt. ... Name the winner and include BOTH VV Scores as passed. If AGE
+ tipped a coin-flip, lead with the younger-age feat.
+  THIS SENTENCE DOES NOT APPLY WHEN THE RESULT LINE SAYS INSIDE THE MARGIN. That pairing has
+  its own rules below and they OVERRIDE this field spec: you name no winner and you print no
+  score, in `who` and in every other field. If you find yourself about to write a number that
+  is a VV Score, you are in the wrong branch , go and read the third-state rules again.
```

```diff
@@ api/analyse.js , third-state rule 2 (currently line 229)
 2. NEITHER VV SCORE AND NEITHER BAND APPEARS IN YOUR OUTPUT. You are given both so you can
 understand why the Index went quiet; you are not given them to print. ...
+   THIS BINDS EVERY FIELD, NOT JUST THE HEADLINE , `who`, `p1`, `p2`, `h2h` and `verdict`
+   alike. The field spec further down tells you to include both VV Scores in `who`; on THIS
+   pairing that instruction does not apply, and the measured failure was exactly this: a
+   compliant headline followed by "Both scores read 96" in the second paragraph. Writing the
+   number once, anywhere, breaks the rule as completely as ranking them would.
+   AND DO NOT PARAPHRASE THE NUMBER EITHER , "level on ninety-six", "both in the mid-nineties"
+   and "separated by a single point" are the same disclosure in words.
```

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

1. rule 4 (the emphasis / under-marking fix , item 25)
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
