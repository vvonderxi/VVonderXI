# CABINET SPEC , IMPLEMENTATION NOTES (2026-09-11)

**`docs/CABINET_SPEC.md` IS THE RULING AND IS COMMITTED VERBATIM. Nothing in this file edits
it.** This is the measurement record and the build log, the same split as
`FABLE_PAYLOAD_BRIEF.md` / `FABLE_PAYLOAD_BRIEF_NOTES.md`.

## THE EMPTY-CABINET MEASUREMENT

Measured over all 57,055 cards, cabinet defined as the spec defines it , every honour held as
of that card's own season, player-keyed rows plus team honours reachable through the player's
own cards at or before that season:

| population | cards | share |
|---|---|---|
| **empty cabinet** | 48,534 | **85.1%** |
| no season honour on the card at all | 53,823 | 94.3% |
| no player-keyed honour at or before the season | 55,451 | 97.2% |
| **cabinet present, no season honour** , the case the section exists for | **5,289** | **9.3%** |

Cabinet size on the 8,521 non-empty cards: median **1**, maximum **41**.

## THE DISPLAY RULE CONFIRMS THE RULING, IT DOES NOT DEPART FROM IT

The build prints the cabinet only when it has content. **That is what the ruling already
says**, in its own words: *"the empty cabinet is a display rule, not a copy problem , the
section does not render. Do not ship an empty box with consoling text ("nothing yet", "the
story begins")."*

It is recorded here because the measurement makes the ruling **more** load-bearing than it
reads. At 85.1%, non-rendering is not an edge case, it is the default state of the platform:
a consoling line would print on six cards in seven. The ruling was right before the number
existed and the number does not soften it.

**Two figures quoted during the build did not reproduce, and are recorded so nobody re-derives
them from this file's absence:** a "93.4% / 53,000 cards" empty-cabinet rate , the nearest real
figure is **94.3% / 53,823**, which is the rate for cards with **no season honour**, a
different quantity , and "1,014 cards with a cabinet and no season honour", measured at
**5,289**. The case for the section is five times stronger than the figure given for it.

## WHAT SHIPPED

- **`fetchHonours` builds `cabinet`** , every fetched honour with `season_year <= the card's
  season`, sorted oldest first. The rows were already on the wire: the player query never had
  a season filter, so the cabinet costs no extra round trip.
- **`cabinetWithTeamLegs(cabinet, careerRows, asOfYear, teamCache)`** , league_champion and
  ucl_winner carry a NULL `api_player_id`, so they are invisible to a player-keyed query. They
  are reached through the player's OWN cards, which is also the correct test: a trophy the club
  won before he arrived is not his. `card.html` passes `SEASON_RAW`, already loaded for the
  season switcher, and `loadSeasons` re-calls `vvApplyHonours` so the team half cannot lose the
  race.
- **`renderCabinet`** returns `''` when empty and the container is hidden on `''`.
- **The World Cup career leg is retired.** `world_cup_winner` now matches its own season like
  every other honour. `career: []` is kept on the returned object so no consumer's shape
  changes.
- **Placement: the glance**, after the chips, per the ruling (`glance, not face, not panel`).

## THE RETIREMENT DELETED 333 ANACHRONISMS, WHICH WAS NOT THE STATED REASON FOR IT

The career leg attached to **every** card a winner holds, in **both** directions. Measured:
496 card-honour pairs where the card season is AFTER the tournament (the intended career leg),
91 on the tournament year itself, and **333 where the card season is BEFORE it** , a 2010 card
of a 2014 winner printed a World Cup he had not yet won. Verified rendered: Neuer 10/11 now
shows a one-line cabinet (2010 Player of the Season) and the string "World Cup" appears
nowhere visible on the page; Neuer 18/19 shows ten dated entries including World Cup 2014.

## A DEFECT THIS BUILD CREATED AND MEASUREMENT CAUGHT

`.cabn` was written as `color:var(--cream)` with a `body.light` override, the platform's usual
pattern. **The glance panel is cream in BOTH themes** , measured `rgb(240,234,217)` either way
, so the token rendered **cream on cream at ratio 1.00 in dark mode** while looking perfect in
light. This is §C's rule verbatim: match the ink to the GROUND, not to `body.light`. Pinned to
`#2b2924`; measured **12.09 in both themes**, with `.cabyr` at 5.78.

## DEPARTURE FROM THE RULING , PLACEMENT (2026-09-11, Lucas's call)

**The ruling says "Placement: glance, not face, not panel", and the cabinet now sits in its own
foldable section immediately after Wonder Tags.** That is a panel, and the spec argues against
one by name: *"A panel buries what is, for the journeyman card, the best thing the platform has
to say about him."*

Recorded here rather than by editing the spec, which stays verbatim. The reason given for the
move is SEQUENCE: Wonder Tags has just shown what he won that season, and the cabinet widens the
same subject to what he had won by then. The two sections now read as one argument, which the
glance placement could not do.

**What the departure costs, so a later reader can weigh it:** the spec's objection stands
unanswered. A foldable section is collapsed until tapped, so on a card whose season won nothing
, Ronaldo 22/23 at rt 30, 18 honours behind a fold , the cabinet is now one tap away instead of
in view. That is exactly the burying the ruling predicted. It is a deliberate trade, not an
oversight.

**What did NOT change with it:** the empty case still removes the whole section (the layer
carries `hidden`, verified `display:none`, height 0, and the other nine sections render), and
the cabinet still prints no count.

**AND THE SECTION FOLDS CLOSED BY DEFAULT, LIKE EVERY OTHER SECTION (settled 2026-09-12).** A
build in between defaulted it OPEN whenever it had content, on the argument that a section absent
from 85.1% of cards is worth seeing rather than worth finding. **That was reversed, and the reason
is the one the paragraph above is really about: it made ONE section behave differently from its
nine neighbours.** Measured on Haaland 22/23, it was the only layer other than The Glance carrying
`open`, and The Glance is the summary, so the cabinet was not joining a pattern, it was inventing
one. An inconsistent fold does not teach the reader that this section matters; it teaches them the
folds cannot be predicted.
**MATCHING THE NEIGHBOURS MEANS WRITING NOTHING** , no `open` in the markup, no `classList`
call in the wiring. That is now literally true: `grep -c "cabLayer.classList" card.html` returns 0.
**So the cost recorded two paragraphs above stands as originally written, unmitigated, and it is
accepted.** Do not re-add a default-open as a remedy for it; if the burying is ever judged too
expensive, the answer is the PLACEMENT, which is what the ruling actually argued about.

## THREE FURTHER CHANGES, SAME PASS

1. **Pill treatment.** The cabinet renders through the same markup and classes as the season
   honour chips , `.chip.gold`, `vvMark('honour', type)` , because it is honours and should
   read as them. The only difference lives inside the pill.
2. **Prestige order.** Sorted on `HONOUR_META.tier`, which already encodes exactly the
   Playbook's order (Ballon d'Or, World Cup, UCL, League Champion, Player of the Season, Golden
   Boot, Top Assists). Read off the existing field rather than a second list , §C's
   two-sources-for-one-concept rule, and `playbook.html` already holds `HON_RANK` saying the
   same thing.
3. **Multiples extend the pill.** Years sit inside it behind a hairline rule rather than on a
   separate line: `UCL | 2013 2015 2016 2017`.

**There was no 8-line cap to remove.** One was asked for and never built, for the reason it was
later asked to be removed by: seven honour types means at most seven pills, measured maximum 7
across all 8,521 non-empty cabinets.

## DEFERRED, DELIBERATELY

- **Compare has no cabinet yet, and the retirement costs it information in the meantime.** Its
  accolades panel rendered the World Cup through the career leg; with the leg gone it shows
  only on the tournament-year card until the cabinet is added there too.
- **The AI payload does not carry the cabinet.** `vvAIStats` still emits `leg` per honour and
  `_hon.career` is now always empty, so World Cup winners lose their career entry from the
  verdict payload. The key set is unchanged, so `payloadRev` does NOT move and the fingerprint
  cannot see this , **values changed, not shape**. It costs nothing today only because the
  whole verdict cache is already stale from the Path B prompt change.
- **The Playbook section is not written.** It needs the season-honour/cabinet distinction, the
  as-of freeze, *the cabinet appears with its first entry*, and the ruling's standing refusal:
  no cabinet-derived metrics, ever. `HON_COPY["World Cup Winner"]` still states the retired
  rule outright and must be rewritten in that pass.
- **A naming collision to settle there:** `playbook.html` already styles `.cabwrap` under a
  "THE TROPHY CABINET" comment for the grid of seven honour TYPES. Two meanings of "cabinet"
  on one page.

---

## `.chip.gold.career` HAS NO LIVE INSTANCE, AND THE CABINET IS ITS ONLY CONSUMER (2026-09-12)

**Stated on its own because it is a fact about the CSS, not about any one proposal, and because it
is the kind of thing a later session will cite as evidence without checking.**

`29abbe9` retired the World Cup career leg. Since then `honours.career` is returned as a literal
`[]` , both from the honours builder and from `emptyHonours()` , so `isCareer` never fires in
`renderHonourChips` and **no card renders a `.chip.gold.career` chip.** Measured on Haaland 22/23:
4 season chips, 0 career chips.

**THE RULE ITSELF IS NOT DEAD, ONLY ITS OLD CONSUMER IS.** The declaration and the comment that
explains it both survive in `card.html`: saturated `#F0D27A,#E0A93A` means won THIS season, pale
`#FAF0CE,#F2DFA4` with an inset ring means won in ANOTHER season, engraved rather than filled. The
cabinet pill `.chtag-cab` reuses that treatment exactly, which is correct , the cabinet is the only
surface on the card that speaks about other seasons.

**SO: DO NOT CITE A LIVE CAREER CHIP AS EVIDENCE OF THE SEASON-VERSUS-CAREER RULE. THERE ISN'T ONE.**
The rule is real, the cabinet honours it, and the only way to see it rendered is the cabinet itself.
**And do not delete `.chip.gold.career` as dead CSS either** , it is the declaration `.chtag-cab`
was reconciled against, and removing it would leave the cabinet's values unexplained.

## PARKED UNTIL AFTER THE PLAYBOOK SECTION: THE CABINET'S PLACEMENT (2026-09-12, Lucas's call)

**NOT the default state, which is settled , it folds closed like every neighbour. The open question
is WHERE it sits.** Folded, the cabinet is visually indistinguishable from its nine neighbours and
sits ninth in the stack, so **its weight comes entirely from its position**, and its position is the
one thing the original ruling argued about.

**DELIBERATELY NOT REOPENED NOW, and explicitly not to be re-litigated as a default-open remedy**
, see the placement section above, which records that trade as accepted. **Raise it AFTER the
Playbook cabinet section ships**, because that section is what explains to a reader what a cabinet
is for, and placement cannot be judged before the thing has been explained.

## DEFERRED: A GLOSS UNDER EACH YEAR. ITS HONEST HOME IS THE PILL'S TOOLTIP (2026-09-12)

**SHIPPED INSTEAD: SIZE AND INK ONLY.** `.caby` went from Archivo 700 at 12px in `#2b2924` to **800
at 16px in `#241f1b`**, with the shelf rule from 2px to 3px so it does not read as a hairline the
numerals have outgrown. No pills on years , a column of pills stops reading as a shelf, because the
shelf IS the heading and the years are what sit on it.

**THE GLOSS WAS DEMOED AGAINST IT AND DEFERRED ON THREE MEASUREMENTS, not on taste.**
- **It doubles the section on the cards that already have the most to show.** Lewandowski 23/24,
  a twelve-year run and an eight-year run: panel **468px to 697px**.
- **Half its lines wrap at 390.** In a 178px two-column shelf, **10 of 20 glosses run to two lines**
  , and the first measurement said 0 of 20 because the harness was not loading Inter. See
  `SILENT_FAILURES.md`.
- **The data will not support it evenly.** `team_name` is null on most individual honours , the rows
  literally carry `honour_context: "club not listed in source"` , so a Golden Boot cannot be glossed
  with a club. What survives is `goals` and `league_code`, plus the club off the career row for a
  team leg, which makes the gloss **four different rules by honour type**. Rendered, Player of the
  Season glosses to a bare "Bundesliga", which tells the reader nothing.

**AND IT QUIETLY REINTRODUCES A SCOREBOARD.** "41 goals" beside "2020" invites comparison down the
column, and `docs/CABINET_SPEC.md` forbids the cabinet ranking or grading by name. That is the same
objection the count rule already carries, arriving by a different door.

**IF IT IS EVER WANTED, THE HOME IS THE TOOLTIP THE PILL ALREADY HAS, NOT A LINE UNDER EVERY YEAR.**
The heading pill carries `data-tip` with the honour's one-liner today. A per-year detail belongs
there, revealed on demand, where it costs no height, cannot wrap, and does not sit in a column
inviting comparison.

## CONSIDERED AND REJECTED: THE WONDER TAGS CARVE-OUT (2026-09-12). DO NOT PROPOSE IT AGAIN.

**THE PROPOSAL.** An honour won IN THIS SEASON keeps its pill in the glance strip; honours from
PRIOR seasons appear only in the cabinet. It came from a real observation: on Haaland 22/23 the
render shows UCL, Champion, POTS and Golden Boot in the glance strip at the top and the same four
again in the cabinet at the bottom. **The duplication is real. The proposed remedy was not.**

**IT WAS REJECTED BECAUSE THE PLATFORM ALREADY IMPLEMENTS BOTH HALVES OF IT.**
1. **The glance strip is ALREADY season-only.** `renderHonourChips` renders `honours.season`, so
   the first half of the rule describes existing behaviour. Measured on Haaland 22/23 at 390: the
   glance holds **4 gold pills in the current build, in the gold-pill build, and in the carve-out
   build , identical in all three.** The carve-out cannot thin a strip it does not touch.
2. **The season-versus-career distinction is ALREADY a shipped visual rule.** `.chip.gold` is a
   SATURATED `#F0D27A,#E0A93A` and means won this season; `.chip.gold.career` is a PALE
   `#FAF0CE,#F2DFA4` with an inset ring and means won in another season. The cabinet pill
   `.chtag-cab` reuses the career treatment exactly, so the cabinet is already coded as "earlier
   seasons" in the platform's own language. **The two blocks share a shape and a word, never a fill.**

**ONE PRECISION ON POINT 2, BECAUSE THE REJECTION PARTLY RESTS ON IT AND IT WOULD BE EASY TO
OVERSTATE. `.chip.gold.career` HAS NO LIVE INSTANCE ANY MORE.** `29abbe9` retired the World Cup
career leg, and `honours.career` is now returned as a literal `[]` (vv-core, the honours builder and
`emptyHonours`), so `isCareer` never fires and **zero cards render a career chip** , measured on
Haaland 22/23: 4 season chips, 0 career chips. **The season-versus-career FILL RULE therefore
survives in CSS and in the comment that explains it, and the cabinet pill is now its ONLY consumer.**
That does not weaken the rejection , it sharpens it: the pale gold means "not this season" and the
cabinet is the only surface that says that, so the cabinet is where the treatment belongs. **But do
not cite a live career chip as evidence, because there isn't one.**

**SO IT WAS ONE CHANGE, NOT TWO, AND THE CHANGE WAS DESTRUCTIVE.** The only thing it could alter is
`cabinetWithTeamLegs`, from `yr <= asOfYear` to `yr < asOfYear`. **Measured, that takes Haaland
22/23 from FOUR SHELVES AND FIVE YEARS DOWN TO ONE SHELF AND ONE YEAR** , a lone "Player of the
Season, 2020" under a strip of four. On a rt 95 card that is the entire trophy cabinet.

**AND THE DAMAGE LANDS ON EXACTLY THE BEST CARDS.** On a card whose player won nothing that season
the carve-out does nothing at all: Ronaldo 21/22 (card 132317, rt 87, 18 honours, none in 21/22)
measured **0 glance honour pills and 5 shelves / 18 years, identical in all three builds.** So the
effect is zero where there is no overlap and maximal where the player had his best season , it
empties the cabinets of the players the cabinet exists for.

**`cabinetWithTeamLegs` KEEPS `yr <= asOfYear`. THE CABINET INCLUDES THE CARD'S OWN SEASON.**
That is the decision, and the duplication thread is closed with it: the cabinet is a record of what
had been won BY this season, which necessarily includes this one.

**THE GENERAL LESSON, and this file already records its sibling: before proposing a rule, check
whether the platform implements it.** Both halves were shipped, one in a render function and one in
a CSS comment that states the reasoning in full. The proposal was a restatement of existing
behaviour plus one deletion, and only the deletion would have taken effect.

## DEMO-FIRST ITEM, NOT IN THIS PASS: "POTS" REACHES FOUR RENDER PATHS, NOT TWO

**Logged 2026-09-12, deliberately untouched. CORRECTED THE SAME DAY , the first version of this
item named two surfaces and there are FOUR, which is exactly the failure SS C warns about:
"THERE ARE FOUR TAG-RENDER PATHS AND A FIX MUST BE CHECKED AGAINST ALL FOUR".**
`HONOUR_META.label` now supplies full names to the Cabinet, so no abbreviation reaches it.
`HONOUR_CHIP_LABEL` still feeds every other path, and `POTS` is not a word , it reads as a typo
rather than as Player of the Season.

**THE FOUR CONSUMERS, counted in the code rather than remembered:**
- `renderHonourChips` , the GLANCE STRIP (card `chip`, Compare `vchip`)
- `renderTopHonourPill` , the CARD FACE top slot
- `renderHonourPillsCompact` , rankings LIST and COMPACT rows, capped at 2
- the rankings GRID cell, `chtagcell gold`, capped by whatever the tag cap leaves

**AND THEY DO NOT SHARE A CONSTRAINT, WHICH IS WHY ONE FIX WILL NOT SERVE ALL FOUR.**
**The GLANCE STRIP IS NOT CAPPED AT ALL** , `#glChips{display:flex;flex-wrap:wrap;gap:7px}`,
and `renderHonourChips` is called with no `max`. It wraps. **It could take the full name today
with no geometry work**, so filing it beside the card face as a "fit problem" was wrong.
The card face and the two rankings paths ARE capped, and those are the ones that need a label
chosen for the narrowest geometry.

**ON THE CAPPED THREE IT IS NOT A RENAME, IT IS A FIT PROBLEM, WHICH IS WHY IT NEEDS A DEMO
AND NOT A COMMIT.** The face pill is capped by `--cw`, and the narrowest `--cw` in the tree is **132px**
(rankings compact); the same pill also ships at 138, 145 and 165. "Player of the Season"
does not fit any of them, so the answer is a THIRD string , a label chosen to be legible at
the narrowest capped geometry , not the long name and not the current acronym.

**MEASURE BEFORE PROPOSING ONE.** Render the candidate on a real card at `--cw` 132 and 145
with three tags present, not in isolation: SS C records that the face is already negative on
clearance at those sizes before the 2026-09-07 re-cut, and a longer label spends the room that
re-cut bought back.

**SAME CLASS AS THE SIBLING-STATES RULE.** The six season honours share one pill geometry, so
whatever is decided for Player of the Season gets looked at against the other five at the same
size, in one pass , not fixed for the one that reads worst.

**THE LIKELY SHAPE OF THE ANSWER, TO BE DEMOED NOT ASSUMED: TWO STRINGS, NOT ONE.** The glance
strip takes `HONOUR_META.label` like the cabinet (no cap, so no cost), and the three capped paths
take a third string chosen at 132px. That is one more label map, not two, because `HONOUR_CHIP_LABEL`
already exists and would simply stop being read by the uncapped surface.

**PROMOTE TO SS D WHEN THE CABINET WORK COMMITS.** It lives here only because this file is the
cabinet notes; it is a card-face and rankings item, not a cabinet item.
