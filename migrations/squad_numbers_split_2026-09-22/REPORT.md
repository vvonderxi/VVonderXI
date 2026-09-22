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


## D. A SAMPLE OF THE 295 CORRECTIONS , AND A REPORTING DEFECT FOUND WHILE BUILDING IT

| player | club | season | lg | shows | sourced | half | Wikipedia page |
|---|---|---|---|---|---|---|---|
| A. Semenyo | Manchester City | 2025 | PL | 24 | **42** | new | 2025–26 Manchester City F.C. season (en) |
| M. Guéhi | Manchester City | 2025 | PL | 6 | **15** | new | 2025–26 Manchester City F.C. season (en) |
| D. Hubert | Genk | 2012 | BPL | 14 | **6** | new | KRC Genk in het seizoen 2012/13 (nl) |
| N. Benezet | Evian TG | 2014 | L1 | 7 | **10** | new | Saison 2013-2014 de l'Évian Thonon Gaillard FC (fr) |
| V. Şen | Trabzonspor | 2017 | TR | 14 | **9** | new | Trabzonspor 2017-18 sezonu (tr) |
| S. Klaiber | Utrecht | 2014 | ERE | 17 | **26** | new | 2014–15 FC Utrecht season (en) |
| Y. Regäsel | Hertha BSC | 2015 | BL | 2 | **39** | new | 2015–16 Hertha BSC season (en) |
| G. Sertic | Marseille | 2016 | L1 | 27 | **13** | ORIGINAL | 2016–17 Olympique de Marseille season (en) |
| I. Sylla | Montpellier | 2022 | L1 | 12 | **3** | ORIGINAL | 2022–23 Montpellier HSC season (en) |
| S. Zuber | 1899 Hoffenheim | 2018 | BL | 9 | **17** | new | 2018–19 TSG 1899 Hoffenheim season (en) |
| M. Bodmer | Nice | 2016 | L1 | 27 | **24** | new | 2016–17 OGC Nice season (en) |
| M. Gómez | VfL Wolfsburg | 2017 | BL | 27 | **33** | new | 2017–18 VfL Wolfsburg season (en) |
| S. Sow | NEC Nijmegen | 2023 | ERE | 9 | **19** | ORIGINAL | 2023–24 NEC Nijmegen season (en) |
| S. Wagner | Bayern München | 2017 | BL | 14 | **2** | ORIGINAL | 2017–18 FC Bayern Munich season (en) |
| P. Joosten | Groningen | 2021 | ERE | 11 | **14** | new | 2021–22 FC Groningen season (en) |

**Quotas: 4 pre-2016, 11 from 2016 on, 6 leagues, 3 non-English wikis, 4 on an ORIGINAL half.**

**FOUR ROWS RE-READ OFF THE LIVE PAGES AS A CONTROL, INCLUDING THE ONE THAT LOOKS WRONG:**
Sandro Wagner really does wear **#2** at Bayern 2017/18 , odd for a striker, which is why it was
checked , and Joosten 14, Hubert 6 and Şen 9 all reproduce, the last two off Dutch and Turkish
pages. **The row that looks like an error is the one to verify, not the one to drop.**

**AND BUILDING THIS TABLE FOUND A REPORTING DEFECT , THE PAGE COLUMN LIED ON THE TWO KNOWN
ANSWERS.** The first draft showed Semenyo and Guéhi as sourced from
**"2025–26 Manchester City W.F.C. season"**, the women's page.
- **THE NUMBERS WERE NEVER WRONG.** The agreement run iterates the held records directly, so it
  read the men's page and returned 42 and 15. What was wrong was the title lookup in the REPORT: a
  first-wins map keyed by club-season, and **City is held TWICE** , once under the women's page
  from before the gate fix, once under the men's page. Measured: it is the **only** club-season
  held twice, so no other row was affected.
- **IT IS THE SAME SHAPE AS GUARD A AND AS THE `def_share` TEST: A VALUE COMPUTED FROM ONE THING
  WHILE A DIFFERENT THING IS USED.** The number came from one record and its provenance from
  another, and only putting them side by side in a table for a human showed it.
- **Fixed in `section-audit.js` by preferring the record that PRODUCED the number** , the
  multi-block one , rather than whichever was written first. **A provenance column that can
  disagree with the value it describes is worse than no provenance column**, because it is the
  thing a reviewer trusts to check everything else.
