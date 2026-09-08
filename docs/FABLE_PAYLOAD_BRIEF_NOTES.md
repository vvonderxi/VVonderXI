# NOTES BESIDE `FABLE_PAYLOAD_BRIEF.md`

**The brief is committed verbatim at `e8620d7` and is not edited by this file.** These are
observations recorded against it as the tree moves underneath it. A specification edited to
match what was built stops being a record, so corrections live here instead.

Add to this file rather than to the brief. Each note names the passage it answers, whether the
brief's RULING still stands, and what has changed under it.

---

## NOTE 1 , 2026-09-07 , the stage-tag passage: ruling stands, stated reason is out of date

**The passage.** Under THE REST OF THE PAYLOAD:

> **Stage tags, from the matview columns directly.** stage_peak, stage_the_standard,
> stage_breakout ship as claims. Not via D.tags , the audit records that route rendering in the
> wrong container on one surface and nowhere else, and the payload does not build on a broken
> route.

**THE RULING STANDS AND SHOULD NOT BE REVISITED. The matview columns are still the right
source** , they are computed once in `player_card_view` and are non-null on all 57,055 rows,
which is exactly what a claims block needs.

**THE STATED REASON NO LONGER DESCRIBES THE TREE.** The audit it cites was written against
`CLAUDE.md` SS D as it stood on 2026-09-04, which recorded the stage tags as rendering into
whichever `.tagrow` came first in the document, on one surface, with no mark. **That defect was
closed by `b585eee` at 23:06 on the same day the entry was written**, with `fb13fd2` after it.
The SS D entry was replaced on 2026-09-07 rather than corrected, for the reason recorded there.

**SO `D.tags` IS NO LONGER A BROKEN ROUTE , IT IS NOW FED BY THE VERY COLUMNS THE BRIEF NAMES.**
`getVVTags` reads `stage_peak` / `stage_breakout` / `stage_the_standard` off the row, so the two
sources the passage contrasts are the same source with one indirection between them.

**WHY THE RULING SURVIVES ITS OWN REASON.** Reading the columns directly is still correct for a
payload, and for a better reason than the one the brief gives: **`D.tags` is a DISPLAY list.**
It is name-only, it is ordered and capped for rendering, and it mixes families. The claims block
wants the flags themselves, unordered and uncapped, with nothing dropped by a display rule. The
brief arrived at the right instruction from a premise that has since expired.

**ONE THING THE BRIEF COULD NOT HAVE KNOWN, AND ANY BUILD ON THIS PASSAGE SHOULD:** there are
**two implementations of the stage rule**. `VVCore.careerStageTags` survives in `vv-core.js` as
the reference the SQL was ported from, on no render path. Measured 2026-09-07 across 331
players and 2,992 cards: **zero disagreements**. Nothing enforces that, and a comment is the
only thing holding it. **A payload that reads the columns is reading the side that ships**,
which is the correct side, but the pair is live and is recorded in SS D.

---

## NOTE 2 , 2026-09-07 , the structural fix shipped before the brief was committed

**The passage.** Under THE FINGERPRINT PLAN:

> **The structural fix, so the trap dies rather than being dodged.** The verdict fingerprint
> should incorporate the payload schema version alongside VERDICT_SYSTEM.

**DONE, in `b945f80`, immediately before the brief was committed and at Lucas's instruction to
land it first.** `cache_version` is now `VERDICT_VERSION` plus a schema revision derived from
the key set `vvAIStats` emits , names only, sorted, no values , so a payload change moves the
fingerprint with no prompt edit and no hand bump.

**The brief's sentence is left in the future tense on purpose.** It is what the design called
for, and editing it to past tense would make the record describe its own outcome.

**TWO THINGS THE BUILD ADDED THAT THE BRIEF DOES NOT MENTION**, because they were only visible
from inside the code: `scripts/prewarm_verdicts.js` writes `verdict_cache` rows DIRECTLY and
stamps the version itself, so it had to compose the same two halves or every row it wrote would
have been a permanent miss; and the client's call is guarded, because a stale `vv-core` made
the stamp throw inside `vvGenerateVerdict` and take the whole verdict down with it. **A cache
stamp must never be able to take down the thing it is stamping.**

---

## NOTE 3 , 2026-09-08 , RULING 3: the audit has run, and it does not support the margin classes

**The passage.** Under RULING 3, WEAK COMPARISONS:

> **The thresholds are provisional, and honestly labelled as such.** The outfield
> separability audit , noted and unrun since v3 of the keeper series , has just acquired its
> first concrete consumer [...] until the audit runs they are conservative defaults marked
> provisional in the config.

**THE AUDIT RAN ON 2026-09-06, TWO DAYS BEFORE THE BRIEF WAS COMMITTED.** It is recorded in
`CLAUDE.md` SS C. So the margin classes are not waiting on a measurement; the measurement is
in, and it says something the brief's design does not accommodate.

**WHAT THE AUDIT FOUND.** The standard error grows roughly SIXFOLD down the ladder , **0.96
Generational, 2.00 Iconic, 3.75 World Class, 5.79 Standout**, median 5.58 over 50,269 scored
outfield cards , while band WIDTH stays a constant 5 points. Deriving the gap two seasons need
before they separate, at the 1.96 pooled SEs the brief's "inside uncertainty" class implies:

    Generational   3      Iconic   6      World Class   11      Standout   17

The UI today calls anything above a 6-point gap **decisive**. Two Standout seasons seven points
apart are **0.86 pooled SEs**, and the platform writes that as settled.

**SO A CONSTANT-GAP CLASS CANNOT WORK, FOR THE SAME REASON ONE RADAR DENOMINATOR COULD NOT
SERVE EIGHT POOLS.** The classes are roughly right at the top of the ladder and far too
permissive everywhere below it. Any margin class has to be keyed on the PAIR'S LEVEL.

**MEASURED 2026-09-08 , HOW MUCH OF THE PRODUCT THIS TOUCHES. This is the number that decides
whether the inside-uncertainty class is a tweak or a redesign, and it is a redesign.**

    real pairings in verdict_cache carrying both rt      39 of 106
      inside uncertainty                                 66.7%
      currently crown a winner                           94.9%
      INSIDE UNCERTAINTY *AND* CROWNED                   61.5%   <- verdicts naming a winner
                                                                    the engine cannot support
      where BOTH sides are rt >= 80                      91% inside (20 of 22)

    simulated pairings, 200,000 draws each
      random pair, all 50,269 scored outfield            48.1% inside
      random pair, both rt >= 80                         97.9% inside
      random pair, top 1000 by rt                        97.8% inside

    SAME-BAND PAIRS ARE 100% INSIDE UNCERTAINTY IN EVERY BAND, BY CONSTRUCTION.
    Band width is 5 and the gap needed is 6 / 11 / 17 at Iconic / World Class / Standout, so
    two seasons in one band can NEVER separate. Generational spans 95 to 97, a maximum gap of
    2 against the 3 it needs, so it cannot either.

**NO CHOICE OF CONFIDENCE LEVEL RESCUES IT.** Sweeping z:

    z      meaning              all outfield   both rt>=80   top 1000    gap needed Gen/Ic/WC/St
    1.96   95%, strict promise      48.2%         97.9%        97.8%          3 / 6 / 11 / 17
    1.64   90%                      40.5%         95.0%        95.5%          3 / 5 /  9 / 14
    1.28   80%                      34.9%         86.5%        87.9%          2 / 4 /  7 / 11
    1.00   68%, one pooled SE       26.1%         76.2%        80.1%          2 / 3 /  6 /  9

**Even at ONE pooled SE , a 68% bar nobody would publish , three quarters of top-of-ladder
pairings are inside uncertainty.** The result is not sensitive to the threshold, because it is
driven by the SE being large relative to the gaps people actually compare across.

**THE CAVEATS, BOTH OF WHICH MAKE IT WORSE RATHER THAN BETTER.** SS C records 5.58 as a LOWER
BOUND (the bootstrap holds pool, team defensive totals, league weights and position FIXED, each
carrying its own uncertainty). And the sub-80 SE is not one of the four measured band figures ,
it is the recorded population median, used because the median is dominated by sub-80 cards. The
`all outfield` row is the only one that depends on it; **every rt >= 80 figure above uses
measured band SEs only**, and those are the rows that matter.

**WHAT THIS DOES NOT SETTLE, AND MUST NOT BE READ AS SETTLING.** 1.96 is a convention, not a
law , SS C's own keeper pre-registration uses z = 3.3 for a different purpose. Whether the
platform publishes a winner it cannot statistically defend is a PRODUCT decision about what
Compare is for, and it is Lucas's. What the measurement removes is the option of believing the
current thresholds are approximately right and need tuning.

**THE MECHANISM IS ALREADY HALF-BUILT, WHICH IS THE ONE PIECE OF GOOD NEWS.** `the_debate`
("The Debate Lives On") exists as a too-close-to-call tag and the tie branch of `winNote`
already refuses to crown anyone, gives both sides their due and tells the model the chip will
read unresolved. **The brief asks for an *even* result line and a tag to match, and both
exist.** They are gated on an exact tie. Only the gate is wrong.
