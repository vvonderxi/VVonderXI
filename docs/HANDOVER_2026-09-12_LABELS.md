# SESSION NOTE , HONOUR LABELS AND THE CABINET TAIL, 2026-09-12 (late)

**SUPERSEDES NOTHING.** `docs/HANDOVER_2026-09-12.md` is the routing document, `CLAUDE.md` wins on
any conflict. This sits beside them and beside `docs/HANDOVER_2026-09-12_CABINET.md`, whose JOB 3
and JOB 4 are now DONE (commits below).

## SEVEN COMMITS, UNPUSHED. Lucas pushes, never Claude.

    4731de2  fix(card): the glance strip takes the full honour name, because it is not capped
    8d627ff  feat(playbook): the Honours section explains why a 2019 card shows a 2018 trophy
    bf4e5eb  fix(playbook): The Standard's span stops making claims it gets wrong
    a0f78ec  docs: the font rule's real boundary is what is measured, not whether it is a demo
    0cae4e0  feat(card): the cabinet years carry their own weight, size and ink only
    07192b2  fix(card): the cabinet folds closed by default, like every other section
    66d1ff4  feat(card): the cabinet heading becomes a gold pill on the shared tag-pill class

Working tree clean. Token at `20260912c` on all five shipping surfaces.

## OPEN DECISION 1: THREE HONOUR LABELS, WAITING ON LUCAS

**`HONOUR_CHIP_LABEL` has three consumers, all capped by `--cw`: the card face
(`renderTopHonourPill`), the rankings grid cell, and the rankings compact rows.** The glance strip
was the fourth and no longer reads it , it takes the full name, because it wraps and has no budget
(shipped in `4731de2`).

**THE MEASUREMENT, TAKEN ON A RENDERED CARD AT `--cw:132` IN THE TWO-UP SLOT, NOT MODELLED.**
The slot holds **37.96px**. Strings measured inside the live cell so they inherit every text
property:

    UCL                    8.4    Ballon d'Or        27.8    Golden Boot         29.8
    Champion              22.2    Top Assists        27.4    Season's Best       33.0
    World Cup             25.1    League Champion    40.1    World Cup Winner    43.8
                                  Player of the Season                           51.1

- **"Season's Best" FITS, 5.0px spare.** It becomes the widest label the face carries (Golden Boot
  29.8 is today's widest) and still clears the slot.
- **"League Champion" DOES NOT FIT , over by 2.1px.** An earlier harness said 3px spare; that was
  wrong, see the correction below.
- **"World Cup Winner" DOES NOT FIT , over by 5.8px.**

**THE HARNESS WAS WRONG BY 5px AND THE REASON IS MINE, NOT SS C's.** SS C records the card content
box as `cw * 0.86`. That ratio is **grid to CARD BOX**, and the card box is `--cw` clamped by
`max-width:92%`: at `--cw:132` the card renders **121.4px**, so grid/card is 0.848 (SS C is right)
while grid/`--cw` is **0.78**. I applied 0.86 to `--cw` and inflated the slot from 38 to 43.
**Measure the rendered element; do not multiply `--cw` by a recorded ratio.**

**AND THE SLOT DEPENDS ON THE CONTAINER, so the two rankings paths need their own measurement
before anything is committed** , the 92% clamp resolves against whatever the card's parent is, and
that is not the same element in rankings as on the card page.

### What is actually being decided
1. **POTS.** Lucas is picking. The standing recommendation is **"Season's Best"** (33.0px, fits).
   The deciding argument is meaning, not width: the honour is *of the season*, and "Best Player" /
   "Top Player" drop that and become claims about the player in general.
2. **"Champion" is the better find and it was not the one we set out to fix.** It drops "League"
   and renders two pills from "UCL" on the same face , two adjacent pills that both mean champion,
   only one saying of what. It has exactly the defect that disqualified "Best Player".
   **"League Champion" does not fit, so this needs a copy decision, not an abbreviation.**
3. **"World Cup"** alone reads as *played at* rather than *won*. Same class. **"World Cup Winner"
   does not fit either.** Also a copy decision.

**DO NOT REACH FOR AN ABBREVIATION FOR 2 OR 3. That is Lucas's instruction and it is the whole
point: the durable finding is that POTS is the only label that is not readable English.** It is NOT
that "the convention is truncation" , only two of seven are truncated and three were already short,
so there is no truncation rule to appeal to. Record it the narrow way.

**SS C's sibling-states rule applies: whatever is chosen goes to the face AND both rankings paths
in ONE pass, and all seven labels get looked at together.**

## OPEN DECISION 2: THE CABINET'S PLACEMENT , PARKED UNTIL AFTER E, NOW DUE

Recorded in `docs/CABINET_SPEC_NOTES.md` under its own heading. **The default state is settled and
is not to be reopened: it folds closed like every neighbour, and a default-open must not be
proposed as a remedy.** What is open is WHERE it sits.

Folded, the cabinet is visually indistinguishable from its nine neighbours and sits **ninth**, so
its weight comes entirely from position. The placement departure (`docs/CABINET_SPEC_NOTES.md`)
already records the accepted cost: on a card whose season won nothing, the cabinet is one tap away,
which is the burying the original ruling predicted.

**It was parked until the Playbook had explained what a cabinet is for. That shipped in `8d627ff`,
so the precondition is met and this is now the live question.**

## SMALLER THINGS LEFT STANDING

- **`playbook.html` has no `prefers-reduced-motion` anywhere except the new section** , 0 against
  29 transitions. Logged in `LAUNCH_STAGE.md` with the pattern to copy and the warning that it is
  two groups, not one sweep.
- **`.chip.gold.career` has no live instance** since `29abbe9`; the cabinet pill is its only
  consumer. Do not cite a live career chip as evidence, and do not delete the rule as dead CSS.
- **Nine demo harnesses set a page font family and never load it**, named in `SILENT_FAILURES.md`,
  with three iframe-only shells that must NOT be "fixed".
