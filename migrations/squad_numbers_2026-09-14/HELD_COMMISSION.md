# THE HELD SET , THE SECOND PASS, SCOPED (opened 2026-09-14, live while batches run)

**THIS IS A COMMISSION, NOT A RESIDUE.** Every club-season the automated backfill refuses
lands in `held.jsonl` with its reason and its card count. When the batches finish, this file
is the whole of the next job's scope, and it is written as a scope rather than reconstructed
from terminal output later.

**THE LEDGER IS `held.jsonl`, APPEND-ONLY, ONE OBJECT PER CLUB-SEASON.** Same discipline as
`written.jsonl` and for the same reason: a stats file gets overwritten, an append-only ledger
does not. Fields: `key` (league|year|club), `reason`, `cards`, `title`, `wiki`, `batch`.

## STATE , RUN `node scripts/squadnum/held-report.js`, DO NOT READ A TABLE FROM HERE

**THE TABLE THAT USED TO SIT HERE IS DELETED RATHER THAN UPDATED.** It was accurate for one
batch and stale by the next, which is the failure this directory has now recorded three times.
`held-report.js` counts the ledger, names the owner per reason, and carries the reconciliation.

**THE RECONCILIATION IS THE POINT AND IT HAS ALREADY EARNED ITSELF.** It asserts that every
attempted club-season is either in `held.jsonl` or produced rows in `written.jsonl`. At batch 7
it reported **a GAP OF 2**, and the gap was real: **a club-season can PARSE CLEANLY AND MATCH
NOTHING**, which is a third outcome neither ledger modelled. `ERE|2010|ADO Den Haag` and
`ERE|2010|Heerenveen` had sat in neither. They are now a reason of their own.
- **IT ROUTES DIFFERENTLY FROM EVERYTHING ELSE HERE, WHICH IS WHY IT MATTERS.** The page was
  found, the block was found, the roster parsed , what failed was NAME MATCHING on every card
  in the club-season. That points at a naming convention our matcher does not handle, not at a
  source gap. **It is the matcher's problem and it is not Fable's.**
- **AND IT IS THE ARGUMENT FOR THE CHECK RATHER THAN FOR THE FIX.** Nothing was wrong with the
  data and nothing would ever have complained; the two club-seasons would simply have been
  absent from the commission, and the next pass would have inherited a scope quietly short by
  however many of these accumulate over 1,018.

**AND THE CLUB-SEASON LEDGER UNDERSTATES THE HELD POPULATION BY DESIGN , SAY BOTH NUMBERS.**
`held.jsonl` is keyed by club-season, so a card held INSIDE a club-season that otherwise
succeeded , its name matched no row, or matched ambiguously , never reaches it. That is **411
more cards across batches 3 to 7 alone** (347 no-row, 64 ambiguous), and it is a FLOOR because
batches 1 and 2 lost their stats. The report prints both figures; quoting only the club-season
total under-reports what is actually unfilled.

**THE 77 UNRECORDED ARE A SELF-INFLICTED HOLE AND ARE NAMED AS ONE.** Batches 1 and 2 ran
before per-batch stats existed, and their skip lists were overwritten by a fixed filename.
The club-seasons are recoverable , they are the entries in `clubseasons-done.json` that
produced no row in `written.jsonl` , but the REASON is not, and reason is what routes them.
**They need a read-only re-probe before the commission is handed over**, or a fifth of the
next job arrives unsorted. `probe-dupes.js` is the pattern: resolve, parse, classify, write
nothing.

## THE DUPLICATE-NUMBER SKIP IS REFUSING CORRECT PAGES , MEASURED, NOT SUSPECTED

**ALL 14 WERE RE-FETCHED AND READ (`probe-dupes.js`, `dupes-probe.json`). TWELVE ARE THE
BENFICA SHAPE AND THE OTHER TWO ARE TOO , ZERO ARE THE KAYSERISPOR SHAPE.**

- **THE BENFICA SHAPE IS REAL DATA:** a shirt freed in January is reissued, so two genuine
  squad members share one number on a SEASON roster. Trabzonspor 2011 `#28 Ondrej Celustka |
  Olcan Adin`; Besiktas 2012 `#7 Dentinho | Ricardo Quaresma`; Standard Liege 2014 `#11
  Jonathan Viera | Jiloan Hamad`. Rosters run 22 to 37 with one to three numbers repeating.
- **THE KAYSERISPOR SHAPE , the parser reading a fixture table , DOES NOT APPEAR HERE.** Its
  signature is names that are not names (dates, scores, opponents) and most numbers repeating
  rather than one or two. Every one of the 14 passed `looksLikeNames`.
- **THE TWO THE CLASSIFIER CALLED UNCLEAR ARE ALSO REAL, read row by row:**
  **Gent 2012/13** is 38 rows of genuine Belgian footballers grouped by position with six
  repeats , the Benfica shape at a bigger club with heavier January turnover, and the
  classifier's `repeatedCount <= 3` bar was simply too tight. **Lierse 2013/14** is 13 real
  players with one repeat; nothing is wrong with the rows, the BLOCK IS SHORT, which is a
  different defect and a conservative one (a player missing from the block is held as
  "no row", never written wrongly).

**AND THE DEEPER POINT: A REPEATED NUMBER CANNOT HARM THE MATCH IN THE FIRST PLACE.**
`matchOne` matches a card on the PLAYER NAME and then reads that row's number. Two rows
sharing `#21` under different names resolve independently and both are correct , Hazurov
wore it, then Saidi did. The skip is guarding the number column against a collision that the
matching never consults.

**PROPOSED, NOT DONE , IT IS A WRITE-PATH CHANGE AND THE BATCHES ARE STILL RUNNING.** Replace
the blanket duplicate skip with the extraction test the probe already implements: refuse when
`looksLikeNames` fails, or when more than half the distinct numbers repeat (the fixture-table
signature), and otherwise proceed. **Worth 289 cards on the 250 club-seasons seen so far**, and
roughly four times that if the rate holds to 1,018. Changing it mid-backfill would put two
sources of change in one write, which is the rule this job has followed since batch 0.

## WHAT IS GENUINELY FABLE'S

**The multi-block cases: 19 club-seasons, 389 cards.** A page carrying two to four squad blocks
needs a judgement about which is the league season's roster, which is exactly the adjudication
a model is for and exactly what a deterministic parser should not guess. **"No squad block"
(29 club-seasons, 572 cards) is a parser question first** , it may be a page structure the
extractor does not know, and that is cheaper to fix than to adjudicate.

**"No page" is nobody's job.** The Portugal finding governs: for those clubs the season article
was never written, in any edition, and searching harder cannot produce a page that does not
exist. Those cards want a different source or no fill at all.
