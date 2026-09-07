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
