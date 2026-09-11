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
