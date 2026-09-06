# VVonderXI , DOC MAINTENANCE (the relief-pass history and its method)

**THIS FILE IS EVIDENCE, NOT INSTRUCTION. `CLAUDE.md` IS THE MASTER SOURCE OF TRUTH.** The RULES
that govern a relief pass stayed in `CLAUDE.md` §D as a compact block; what moved here is the
narrative of each pass , what was cut, what it bought, and what went wrong doing it. If anything
here appears to conflict with `CLAUDE.md`, **CLAUDE.md WINS**.

**Do NOT read this at session start.** Come here when you are about to run a relief pass on
`CLAUDE.md`, or when you want to know why a previous one made the choice it did.

**Split from `CLAUDE.md` §D on 2026-08-31**, when the file hit **98.8%** of the 150k truncation
limit , the highest it had ever been, and past its own 90% trigger. The three pass narratives were
themselves ~5 KB of closed history sitting in the section that was supposed to hold the active
queue, which is the same defect the passes below keep finding elsewhere.

**THE MEASUREMENT THAT PROMPTED IT (2026-08-31):** §C 62,421 B (42% of the file), §D 43,718 B
(30%), §E 20,092 B (14%), §F 12,408 B (8%). **§C had grown back** after the 2026-08-29 pass
declared it incompressible, and **§F cannot pay , it is 8%.**

---

**RELIEF PASS 2026-08-29: 94.8% -> 88.0%, AND IT WAS §E THAT PAID, NOT §C.** The 2026-08-28 pass concluded §C was the mass and that §D or §E would have to be reached into next , correct, and §E was the cheaper half. **New file `DATA_DEFECTS.md`, the `SILENT_FAILURES.md` shape applied to the data track: eight §E entries keep their headline and their decision, and only the forensics moved.** §D also gave up the three live production-defect narratives (to `LAUNCH_STAGE.md`), the closed half of the 2026-08-24 defect batch (to `RULE_EVIDENCE.md`) and the tooltip-clamp measurement.
- **§C IS NOW GENUINELY INCOMPRESSIBLE AND THE NEXT PASS MUST NOT AIM AT IT.** Measured with the documented method, its 55 blocks average ~500 bytes and the largest, `Engine / bands` at 13,043, is **28 separate locked rules**, not one long entry. The 2026-08-24 pass already stripped the evidence out of the six biggest. **What is left is rules, and rules do not move.**
- **DESTINATION CHECK BEFORE THE NEXT ONE: `CLAUDE_ARCHIVE.md` took the two oldest §F entries and is now at 83.1% , it is CLOSE TO NEEDING ITS OWN SPLIT and cannot take much more.** `DATA_DEFECTS.md` 13.2%, `SILENT_FAILURES.md` 27.5%, `LAUNCH_STAGE.md` 36.3%, `POST_LAUNCH.md` 36.6%, `RULE_EVIDENCE.md` 66.0%, `INGESTION_RECOVERY.md` 44.0%.
- **METHOD, CARRIED FORWARD AND USED THIS TIME: address blocks by EXACT STRING and assert `count(old)==1` before replacing.** Every move in this pass was an assert-then-replace, and the byte count was read after each one , which is what caught the previous pass's clobbered line and is cheap enough to keep doing.

**RELIEF PASS 2026-08-28: 94.0% -> under 90%**, §C evidence to `RULE_EVIDENCE.md` (64%), 55 headlines in and out, zero lost. **METHOD WARNING: once a pass has shifted a line, address blocks by EXACT STRING, never by index** , an index edit overwrote a blank separator and only the byte count going UP revealed it.
**RELIEF PASS DONE 2026-08-24: 97.1% -> 87.5%. The file had crossed its own 90% trigger and stayed there for four commits.** What paid, in order: **§D DEFERRED SPECS to their stage files** (the rule at the top of this doc, and the biggest single win , the pre-launch queue alone was 5.3 KB for one open item), then **§C NARRATIVE to `RULE_EVIDENCE.md`** on the six largest rules, the `SILENT_FAILURES.md` shape again , **the RULES stayed in §C as their bold headlines and only the measurement and reasoning moved.**
- **§C IS STILL THE MASS AND WILL NEED THIS AGAIN: 45.1% of the limit before the pass.** `Engine / bands` alone was 20.9 KB. **§F cannot pay , it is 2.9%.**
- **A MEASUREMENT WARNING FOR THE NEXT PASS: a regex that finds rule headlines by matching a bold run to end-of-line MERGES BLOCKS and reports one of them at 25 KB.** That sent this pass at the wrong target first. **Split §C on lines that BEGIN with a bold delimiter at column 0, and measure to the next one.**
- **CHECK BOTH THE SOURCE AND THE DESTINATIONS FIRST.** `CLAUDE_ARCHIVE.md` is at 79.9% and is NOT a viable destination; `POST_LAUNCH.md` 22.7%, `LAUNCH_STAGE.md` 28.4% and `RULE_EVIDENCE.md` 24.7% all have room.
- **AND VERIFY BY GREPPING FOR THE FACT, NEVER BY TRUSTING A POINTER.** Fourteen load-bearing strings were checked present in `CLAUDE.md` after the move , the priority order, the 1.518 ratio, the 58-rule limit, the seven-card measurement, the three open threads out of the pre-launch queue, and the verdict-mark key contract among them.

**RELIEF PASS DONE 2026-08-24: 97.1% -> 87.5%. The file had crossed its own 90% trigger and stayed there for four commits.** What paid, in order: **§D DEFERRED SPECS to their stage files** (the rule at the top of this doc, and the biggest single win , the pre-launch queue alone was 5.3 KB for one open item), then **§C NARRATIVE to `RULE_EVIDENCE.md`** on the six largest rules, the `SILENT_FAILURES.md` shape again , **the RULES stayed in §C as their bold headlines and only the measurement and reasoning moved.**
- **§C IS STILL THE MASS AND WILL NEED THIS AGAIN: 45.1% of the limit before the pass.** `Engine / bands` alone was 20.9 KB. **§F cannot pay , it is 2.9%.**
- **A MEASUREMENT WARNING FOR THE NEXT PASS: a regex that finds rule headlines by matching a bold run to end-of-line MERGES BLOCKS and reports one of them at 25 KB.** That sent this pass at the wrong target first. **Split §C on lines that BEGIN with a bold delimiter at column 0, and measure to the next one.**
- **CHECK BOTH THE SOURCE AND THE DESTINATIONS FIRST.** `CLAUDE_ARCHIVE.md` is at 79.9% and is NOT a viable destination; `POST_LAUNCH.md` 22.7%, `LAUNCH_STAGE.md` 28.4% and `RULE_EVIDENCE.md` 24.7% all have room.
- **AND VERIFY BY GREPPING FOR THE FACT, NEVER BY TRUSTING A POINTER.** Fourteen load-bearing strings were checked present in `CLAUDE.md` after the move , the priority order, the 1.518 ratio, the 58-rule limit, the seven-card measurement, the three open threads out of the pre-launch queue, and the verdict-mark key contract among them.

---

# THE OPEN ITEM , `CLAUDE.md` NEEDS A STRUCTURAL ANSWER, NOT A NINTH RELIEF PASS (logged 2026-08-31, NOT started)

**THE MEASUREMENT.** `CLAUDE.md` sits at **98.2%** of the 150k truncation limit , 95.8% before
the 2026-08-31 session began, 98.8% at its peak, 97.5% after the eighth pass, and **98.2% once
this item was logged. Recording the problem consumed a third of the room the pass had just
bought**, which is the clearest statement of it available. Section shares,
measured with the documented column-0 method:

| section | bytes | share of file |
|---|---|---|
| §C locked invariants | 62,421 | **42%** |
| §D launch master plan | 43,718 | 30% |
| §E open data threads | 20,092 | 14% |
| §F session log | 12,408 | 8% |
| §A + §B + head | ~9,562 | 6% |

**WHY ANOTHER PASS WILL NOT DO IT, AND THIS IS THE WHOLE POINT OF THE ITEM.**
- **§C IS 42% AND WAS DECLARED INCOMPRESSIBLE ON 2026-08-29 , IT HAS GROWN BACK SINCE.** That
  declaration was correct about the technique, not about the trend: every pass strips EVIDENCE out
  of §C and leaves the RULES, so §C converges on pure rules and then keeps growing, one rule per
  session, forever. **A file that gains rules faster than it can shed evidence has no steady state.**
- **§F CANNOT PAY , IT IS 8%.** Archiving both older entries buys 7.6 KB, roughly one session's
  growth.
- **`CLAUDE_ARCHIVE.md` IS AT 83% AND IS NOT A VIABLE DESTINATION.** It would need its own split
  first, which is a second problem, not a solution to this one.
- **THE STAGE FILES ARE FILLING TOO:** `RULE_EVIDENCE.md` 66%, `INGESTION_RECOVERY.md` 45%,
  `POST_LAUNCH.md` 49%, `LAUNCH_STAGE.md` 48%. The evidence has to keep going somewhere.

**SO THE QUESTION IS NOT "WHAT DO WE CUT NEXT", IT IS "WHAT IS THE STEADY STATE".** Four candidate
shapes, recorded so the decision starts from options rather than from a blank page. **None is
chosen and none is started.**

1. **SPLIT §C INTO ITS OWN FILE, READ AT SESSION START ALONGSIDE A MUCH SMALLER `CLAUDE.md`.**
   Mechanically the biggest single win. **The cost is the premise:** this file exists because the
   project had too many documents and no reference point, and a mandatory second file is a second
   reference point. Would need the entry rule rewritten so it reads as one document in two parts.
2. **SPLIT §C BY DOMAIN AND LOAD PER TASK** , front-end / data / infra. Cheaper to read, but it
   requires a session to know which domain it is in BEFORE it reads the rules, and several of the
   worst incidents in this file came from a session not knowing that.
3. **RETIRE RULES INTO TOOLING , THE LEVER NO PASS HAS USED.** A rule that a check now enforces
   does not need to be read to be obeyed. The codebase already carries `vvAuditCaptureSupport`,
   the row-namespace guard, the missing-mark audit and `scripts/lint-inline.js`, and each of those
   corresponds to a §C rule still written out in full. **This is the only candidate that reduces
   the rule COUNT rather than moving bytes**, and it is the only one that attacks the growth rate
   instead of the level. Needs a criterion for when a rule is safely tool-enforced.
4. **VERIFY THE 150k LIMIT ITSELF.** It is quoted everywhere in this file and has never been
   measured. If it is wrong in either direction, every percentage above is wrong with it.
   **Cheap, and it should be done FIRST**, because it may change which of 1 to 3 is needed.

**WHAT MUST NOT HAPPEN: a ninth pass that buys 6 KB and resets the clock to 90%.** The last three
passes each bought roughly one to two months and the interval is shortening , 2026-08-24, 08-28,
08-29, 08-31. **The trigger has fired four times in eight days.**


---

## THE NINTH PASS, AND WHY IT IS THE LAST CHEAP ONE (2026-09-01)

**99.0% -> 88.3%, then back to 90.0% the same day.** The pass moved 19,738 bytes; four commits of
rules and rulings in the same session spent roughly a fifth of it. **That is the shape of the
problem in one line: relief is being consumed faster than it is bought.**

| moved | bytes | to |
|---|---|---|
| §F, two entries | 7,598 | `CLAUDE_ARCHIVE.md` |
| §D step 6, ten closed launch-blockers | 6,300 | `LAUNCH_STAGE.md` |
| §D step 5, three DONE items | 875 | `LAUNCH_STAGE.md` |
| §D, the 2026-08-24 defect batch | 2,641 | `RULE_EVIDENCE.md` |
| §D, the shipped goalkeeper card | 2,324 | `POST_LAUNCH.md` |

**THE PROMOTE CHECK EARNED ITS KEEP AND IS NOT OPTIONAL.** Three facts existed ONLY inside the two
entries queued for archiving , the browser-will-not-resize fault, the `window.X` binding fault, and
the picker's no-body-lock ruling , and **all three had been re-hit in the session doing the
archiving.** Archiving first would have destroyed them.

**WHY THE TENTH PASS CANNOT BE CHEAP:**
- **`CLAUDE_ARCHIVE.md` is at 88.6%** after taking the two §F entries. It would need its own split
  first, which is a second problem, not a solution.
- **§F is back to a single entry.** It cannot pay again for months.
- **§D's closed history is now relocated.** What is left there is the open queue.
- **§C is 42% and is rules.** Stripping evidence from it is what the last four passes did.

**SO THE NEXT MOVE IS STRUCTURAL, AND THE FOUR SHAPES ARE ABOVE.** Do the cheap check first: the
150k limit has never been measured, and every percentage in this file depends on it.


---

# THE LIMIT, MEASURED AT LAST , THE 150k NEVER EXISTED (2026-09-01)

**Every percentage in every relief pass above was computed against a number nobody had checked.**

## What it actually is

Read out of the Claude Code binary's own memory loader (`claude.exe`, strings, same chunk as the
`[CLAUDE.md] skipping` message and 5,981 bytes from it, sitting immediately beside the literal
"Codebase and user instructions are shown below..." preamble that wraps this file):

```js
War = 0.05, Rce = 4194304, zar = 40000;
function l4e(){ ... return Math.max(zar, Math.round(contextTokens * War * charsPerToken)); }
// loader:
if (o.totalBytes > Rce) return { kind: "skipped" };
n(`[CLAUDE.md] skipping ${e}: not a regular file or exceeds ${Rce} byte limit`);
g("context_claude_md_load", "file_skipped_special_or_oversize");
```

- **HARD CAP: 4,194,304 bytes (4 MiB).**
- **THE BEHAVIOUR IS SKIP, NOT TRUNCATE.** Above the cap the file is not loaded AT ALL. That is
  worse than truncation , you lose everything, not the tail , and it is 30x away.
- **SOFT ADVISORY: `max(40000, contextTokens x 0.05 x charsPerToken)`**, which produces the warning
  **"Large CLAUDE.md will impact performance (N chars > threshold)"**. On a 1M-context session that
  is 200,000 chars; on an ordinary 200k-context session it is the **40,000-char floor**.

## The numbers that matter

| | bytes | share |
|---|---|---|
| hard cap (skip) | 4,194,304 | , |
| `CLAUDE.md` today | 136,800 | **3.3%** |
| at session start, arrived COMPLETE | 143,645 | 3.4% |
| soft advisory, 1M context | 200,000 | file is 68% |
| soft advisory FLOOR, 200k context | 40,000 | **file is 342%** |

**EMPIRICAL CORROBORATION, independent of reading the binary:** at 143,645 bytes this file reached
the model with its final paragraph intact. Nothing was truncated, at 95.8% of a limit that does not
exist.

## Where 150k came from

Introduced 2026-08-03 in `9edffc6`, wording it as "before CLAUDE.md crosses 90% of the 150k
truncation limit (it was 88% when this was written)". The file was 133,449 bytes that day.
**133,449 / 0.88 = 151,646.** The percentage was assumed and the limit back-derived from it. No
measurement is recorded in any commit that touches the figure.

## What this changes, and what it does not

- **The cliff was imaginary. There is no deadline and no silent loss.** Nine passes, an escalation
  to "binding constraint", and a ruling compressed mid-write to fit, all against a phantom.
- **The context cost is real and is paid every session**, and on a normal 200k-context session this
  file has been over the advisory threshold since long before anyone started counting.
- **So the direction was right and the urgency was invented.** Relieve for readability and context
  cost, on judgement.
- **The strongest of the four shapes is now retiring rules into tooling**, because it reduces what
  must be READ every session, which is the cost that actually exists.

**THE LESSON IS THE ONE THIS PROJECT KEEPS RE-LEARNING: a recorded claim is a claim, not a
measurement.** §C already holds that an unverified premise is most costly when it argues for
REMOVING something. This one argued for removals for a month. **The check took one session.**
