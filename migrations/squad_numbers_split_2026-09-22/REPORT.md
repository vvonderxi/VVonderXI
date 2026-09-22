# SQUADNUM FOR THE SPLIT HALVES , STEP 1 COVERAGE REPORT. NOTHING WRITTEN TO THE DATABASE.

Run 2026-09-22, `scripts/squadnum/split-run.js`. **1,071 club-seasons resolved of 1,073 needed,
covering 1,657 halves.** Ledgers: `found.jsonl`, `held.jsonl`, `multiblock-recovered.jsonl`.

**HEADLINE: 940 OF 1,657 HALVES (56.7%) CAN BE GIVEN A CLUB-SPECIFIC NUMBER** , 435 of 830 new
halves and 505 of 827 originals. **The scope estimated about 545. The difference is one rule**,
and it is the answer to question 2.

---

## 1. CLUB-SEASONS AND THE HALVES THEY COVER

| outcome | club-seasons | halves |
|---|---|---|
| **resolved, numbers produced** | **368** | **517** |
| held , multiple blocks | **321** | **495** |
| held , parsed, zero cards matched | 160 | 199 |
| held , no squad block on the page | 128 | 193 |
| held , no page found | 96 | 162 |
| held , extraction suspect | 1 | 1 |

**Match outcomes inside the 526 parsed pages: 516 matched, 267 `norow` (the surname is not on the
page at all), 22 `ambiguous` (two rows share the surname and the forename cannot separate them).**
The 22 are the strict matcher refusing to guess, which is the rule that exists because a full
forename falling back to an initial once matched Diego Lopez to David Lopez.

## 2. THE MULTI-BLOCK HOLDS , A RULE CAN PICK THE BLOCK, AND IT IS NOT THE BLOCK'S IDENTITY

**WHAT THE BLOCKS ACTUALLY ARE, measured by extracting inside each SECTION of all 321 pages:**

| section heading | pages |
|---|---|
| **Appearances and goals** | **223** |
| **First-team squad** | **107** |
| Squad information | 62 |
| Squad | 41 |
| Players | 30 |
| Current squad | 28 |
| Squad appearances and goals | 19 |
| Disciplinary record | 19 |
| Reserve team | 13 |

**SO THE COMMON CASE IS NOT first-team-versus-loan-versus-academy. IT IS THE SQUAD TABLE AND THE
APPEARANCES TABLE, ON THE SAME PAGE, KEYED BY THE SAME SQUAD NUMBER.** That is why they agree, and
it is why a rule works.

**MEASURED OVER ALL 321 PAGES AND 495 CARDS:**

| | cards |
|---|---|
| matched in 2+ blocks, **every block agrees** | **205** |
| matched in **exactly one** block | **218** |
| matched in 2+ blocks, **disagree** | **1** |
| matched in no block | 71 |

**THE RULE IS AGREEMENT, NOT SELECTION: match the card against EVERY block; if every block that
contains it gives the same number, take it; if any two differ, HOLD.** That recovers **423 of 495**
and leaves **one** card for a person.
- **THE ONE DISAGREEMENT IS `SA|2014|Udinese`, L. Muriel, 24 against 20.** One card, named, held.
- **THE MATCHER IS UNCHANGED.** This changes only which blocks are consulted, so it does not
  loosen identity , SS C's rule about never closing the zero-match guard by relaxing the matcher
  is untouched, and the 22 ambiguous cards stay ambiguous.
- **AND IT CARRIES ITS OWN GUARD.** A parser that wanders into a rank table produces numbers that
  disagree with the squad table, so the shape SS C names , goal tallies read as shirts , becomes a
  HOLD rather than a write. **Refusing multi-block pages was protecting against a risk that
  agreement detects directly.**
- **THE 218 SINGLE-BLOCK MATCHES CARRY MORE RISK THAN THE 205 AGREEING ONES**, because nothing
  corroborates them. They are accepted on the same basis every number in the 2026-09-14 backfill
  was accepted , one block, one match , so they are no weaker than the existing 7,928 rows, and
  that is the bar, not certainty.

## 3. MANCHESTER CITY 2025/26 , ANSWERED, AND THE ACCEPTANCE CHECK IS MET

**Five blocks. Semenyo appears in three of them , the first-team squad table, the transfers-in
table and the appearances table , and ALL THREE say 42.** Guéhi appears in the same three and all
three say **15**.

| card | club | number | how |
|---|---|---|---|
| 188350 | Manchester City | **42** | three blocks, all agreeing |
| 130281 | Bournemouth | **24** | clean single-block page, `2025–26 AFC Bournemouth season` |
| 188094 | Manchester City | **15** | three blocks, all agreeing |

**IT IS IDENTIFIABLE FROM PAGE STRUCTURE, BUT STRUCTURE IS NOT WHAT IS NEEDED.** The block is under
`==First-team squad==` and the extractor discards headings , but since every block agrees, the
heading never has to be consulted. **Retaining headings would be a larger change for no gain here.**

**GUÉHI IS THE FINDING NOBODY ASKED FOR: his City card currently inherits #6, which is his Crystal
Palace number.** A second live instance of exactly the defect this sitting exists to fix, on the
same club-season as the acceptance case.

## WHAT IS STILL OUT OF REACH

**717 halves get no club-specific number**, and the reasons are not the same kind of thing:
- **162 have no page at all** and **193 have a page with no squad block** , a source ceiling, and
  SS D already records Portugal as the extreme case.
- **199 are `parsed, zero cards matched`** , the guard. **It is a first-class held reason and must
  not be closed by loosening the matcher**; some are a wrong page (the W.F.C. case) and some are a
  player genuinely absent from that page's squad table. **These are not separated yet and the
  report does not claim they are.**
- **71 more matched no block on a multi-block page**, same character.

## INSTRUMENT FAULTS IN THIS RUN, BOTH MINE

- **My first section-attribution probe was wrong and its output is discarded.** It located a block
  by searching the wikitext for a surname, which finds the first occurrence anywhere on the page,
  so it reported the first-team squad as sitting under "Pre-season". **The corrected method splits
  the wikitext into sections and runs `extract` inside each**, which is what the table above uses.
- **`reviewFlag` is comparing the club's lead token against the YEAR** , it printed
  `"oh" vs "2011"`, `"sparta" vs "2017"`, `"estac" vs "2015"` on ten club-seasons. **It is a flag,
  not a gate, so nothing was refused by it**, but every one of those ten is noise and the flag is
  not doing what SS C records it doing (Sparta Rotterdam against Excelsior Rotterdam). **Logged,
  not fixed , it sits outside this sitting.**


---

# ADDENDUM , 2026-09-22, THE THREE CHECKS BEFORE THE SITTING

## A. THE UNCORROBORATED NUMBERS ARE NOT COMING FROM RANKED TABLES , ZERO OF 735

**735 of the 940 numbers rest on a SINGLE block that nothing else on the page checks** , 218 from
multi-block pages where only one block matched, and 517 from pages carrying one block. Lucas's
question is the right one: if that block were a top-scorers or discipline table, the "number" is a
rank and it would be stored as sourced.

**`scripts/squadnum/section-audit.js` names the section each number came from**, by splitting the
wikitext into sections and extracting inside each , not by searching for a surname, which is the
method that reported a first-team squad as sitting under "Pre-season".

| section | numbers |
|---|---|
| Appearances and goals | 337 |
| Squad information | 114 |
| First-team squad | 96 |
| Squad statistics | 45 |
| Players / Squad / Current squad | 92 |
| Appearances | 22 |
| Spelerskern, Kadro, Selectie (nl, tr) | 32 |
| Disciplinary record | 20 |

**FROM A RANKED TABLE: ZERO.** The audit flagged three and **all three are my own instruments:**
- **Andy Carroll, Newcastle 2010/11, #9, section "Appearances, goals and cards".** My `RANKED`
  pattern matched the word **cards**, which is part of an ordinary squad table's heading. #9 is his
  correct number. **Pattern fixed; `disciplin` already covers the real disciplinary tables.**
- **Two Kortrijk club-seasons reported "section could not be located".** The Dutch page carries its
  squad under `Spelerskern` with `Doel / Verdediging / Middenveld / Aanval` SUB-headings, so the
  table spans them and per-section extraction sees nothing. **Read directly: one block, a genuine
  squad list, 1 Rémi Pillot, 16 Darren Keet, 3 Baptiste Martin.** A limit of the audit, not a
  defect in the number.
- **All 20 "Disciplinary record" numbers also appear under a squad-like heading on the same page**,
  so none rests on a ranked table alone.

## B. THE FIXED REVIEW FLAG CAUGHT A WRONG-CLUB NUMBER IMMEDIATELY

`reviewFlag` was comparing our club's lead token against the page's **YEAR** , `"oh" vs "2011"` ,
because `sig()` kept pure-digit tokens. **Ten flags in the run, all noise.** Digits are now stripped,
symmetrically, so clubs whose names contain numbers are unaffected (1899 Hoffenheim, Schalke 04 and
Mainz 05 all still pass the gate, checked).

**After the fix: 13 flags across 977 club/title pairs, and one of them is real.**
**`Sparta Rotterdam` resolved to `Excelsior Rotterdam`'s page on three seasons**, which is the exact
case SS C records, and it produced **one number: card 169534, L. Duijvestijn, #10 from Excelsior's
squad, where the card shows 70.** **Excluded.** The other twelve are abbreviation-against-expansion
(OH Leuven / Oud-Heverlee, St. Truiden / Sint-Truidense, Estac Troyes / ES Troyes, Robur Siena / AC
Siena) , twelve false flags to catch one wrong club is the trade SS C already accepts.

## C. FINAL COUNTS, SOURCED OVERRIDING THE EARLIER RULES

| | sourced, NO arrows | inferred, ARROWS | blank |
|---|---|---|---|
| **ORIGINAL halves (827)** | **504** | 109 | 214 |
| **NEW halves (830)** | **435** | 62 | 333 |
| **TOTAL (1,657)** | **939** | **171** | **547** |

All 62 inferred numbers on new halves are the MOVED numbers. **1,110 of 1,657 halves carry a
number and only 171 of them wear the arrows.**

**CORRECTIONS , a sourced number that DIFFERS from what the card shows today: 295.** That is the
real size of the defect this sitting exists to fix, and it is larger than the 145 the first pass
saw, because the agreement rule recovered the multi-block pages. **Semenyo 24 to 42 and Guéhi 6 to
15 are two of the 295.**
