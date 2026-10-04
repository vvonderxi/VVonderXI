# SESSION NOTE , THE CABINET, 2026-09-12 (late)

**THIS SUPERSEDES NOTHING.** `docs/HANDOVER_2026-09-12.md` is still the routing document and
`CLAUDE.md` still wins on any conflict. This is the open tail of one session, nothing more.

## HELD UNCOMMITTED, DELIBERATELY , do not commit it to tidy the tree

`card.html`, `vv-core.js`, `docs/CABINET_SPEC_NOTES.md` , the cabinet GOLD PILL work. Lucas has
not picked a treatment yet, so it is built and not chosen. **It is finished code, not broken code**:
the tree parses, requires and lints. What it contains:
- `.chtag-cab` as a FILL MODIFIER on the shared `.chtag`, never a second pill. Gradient
  `#FAF0CE,#F2DFA4`, ink `#5a4410`, inset 1px ring at 55%, all reconciled against shipped tokens.
- `HONOUR_META.label` so full names reach the cabinet (`HONOUR_CHIP_LABEL` abbreviates for the
  GLANCE strip, which is correct there and printed "POTS" on a card).
- The POTS item logged in `CABINET_SPEC_NOTES.md` as demo-first: a FIT problem, not a rename,
  narrowest capped `--cw` in the tree is 132px, and all six season honours get looked at together.

**Two commits landed and are UNPUSHED (`4a9c502`, `dc954d6`).** Lucas pushes, never Claude.

## JOB 3 , NOT STARTED. Demo only, do not build.

Option 3 with a carve-out, which replaced the wholesale version because stripping the season
honour promotes career context over the season's own story on a card about that season:
- an honour won IN THIS SEASON keeps its Wonder Tags pill AND its sentence
- honours from PRIOR seasons appear only in the cabinet, so each honour renders in exactly one place

Demo desktop and 390, on Ibrahimovic 15/16 **and** on a card with several prior honours and none
this season. Answer two questions: does the cabinet look empty-handed when the only honour is this
season's, and does Wonder Tags look thin holding one pill instead of three.
Harness already exists: `_demo_cabvstags.html` and `_demo_cabvstags_390.html` (untracked). The 390
one uses real 390px iframes with `innerWidth` and `matchMedia` asserted, not a scaled desktop.

## JOB 4 , NOT STARTED. Read and report, no edits.

a. **The Standard.** `e897b97` made it print as career-legged. Report the SHIPPED definition read
   from the code, not what it should say, then say whether the career arc's rendering matches it.
b. **The Playbook needs a cabinet section.** `playbook.html` already styles `.cabwrap` under a
   comment reading "THE TROPHY CABINET" for the grid of honour TYPES, so the page would teach two
   cabinets. Report what is in `#s-honours` now and propose where the new section goes.

## TWO OPEN DECISIONS, BOTH LUCAS'S

1. **The Wonder Tags carve-out** (JOB 3 above). Undecided until the demo is seen. The cost that
   killed wholesale option 3 is real and measured: on Ibrahimovic 15/16 the cabinet lists `2015`
   as a year in a list while the pill carried "the league's top scorer, nobody scored more".
2. **`.arcspan::before` FADES AT 72% ON EVERY CARD, REGARDLESS OF PLAYER.** The Standard's bar is
   `left:23%; right:0` with `linear-gradient(90deg,#1B5563,#2F8290 72%,rgba(47,130,144,0.18))`.
   Both the 23% start and the 72% fade are **hardcoded**, derived from nothing about the player.
   That is what reads as "the band stops about three quarters along with a thin line continuing".
   Decide whether the extent should be data-driven or whether a fixed schematic is the intent ,
   it is a design question, not a bug, and it must not be silently "fixed" either way.

## ONE THING ALREADY CONFIRMED, so nobody re-hunts it

`.hleg` is NOT a bar and is not in the cabinet. It is 9px uppercase TEXT, three CSS rules, zero
occurrences in `card.html` and `vv-core.js`. It relates to the career leg `29abbe9` retired only by
DESCRIBING it: the World Cup cell still reads `Won by a squad , every season of a career`. That
phrase, and `HON_COPY["World Cup Winner"]`, both still state the retired rule. Belongs to JOB 4b.
