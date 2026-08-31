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
