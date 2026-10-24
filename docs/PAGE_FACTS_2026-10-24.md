# WHAT THE PAGE PRINTS THAT THE FACT LIST DOES NOT KNOW ABOUT (read 2026-10-24, code and rendered pages, no key)

**Why this exists.** The Cabinet was the fourth source of page disagreement in one week, after the fact list itself (the band), the Chronicle and the dimension caption. Lucas asked for every block on `card.html` and `compare.html` that states a fact a reader can read, each marked in or out of the cited writer's fact list (`scripts/calibration/cited.js`: `sideFacts` for a Compare side, `notesFacts` for a card). Read from the rendered pages the capture holds (Suárez 16/17, card 141117, and Suárez v Payet) and from the code that builds them. **Three marks:** IN (the fact list carries it); OUT, DECIDED (left out on purpose, with the decision); OUT, GAP (the page prints it and nothing decided to leave it out).

## The card (`card.html`)

| Block | What a reader can read | Mark |
|---|---|---|
| The face | season, VV score, band chip, top honour chip, top tag chip, goals, assists, surname, club, position, age | IN (the band only when the card prints Generational or Iconic) |
| The face | squad number, nationality flag, "View all 13 seasons" (a career length) | OUT, GAP. Squad number and nationality are not football facts the writer needs; the season count is a career fact the writer is banned from. Leave out, recorded. |
| The Glance | the same figures, full name, "35 GAMES", honour chips, band, tags, squad number | IN except the squad number |
| The Profile | the archetype blurb ("A forward who both makes and takes…"), a position-pool text | OUT, GAP. It is card copy, like a tag one-liner. Cheap to add as a fact if the writer should quote it; not added. |
| The Profile | the radar and the five attribute values | IN |
| The Profile | the caption "Each dimension is a percentile against other ST seasons we can measure" | OUT, and WRONG for Reliability (§D, logged 2026-10-24) |
| The Trajectory | goals plus assists and the VV score for every season of the career, "PEAK 95", the years | OUT, DECIDED: other seasons are banned by the writer rules (kind 1 territory). The page prints them, so a reader can see what the writer may not say. |
| The Proof (goal pool: ST, Winger) | goals per 90 and total; shots on target per 90 and total; shots per 90 and total; "across 35 appearances (2,865 min)" | goals total, shots total, appearances, minutes IN; **every per-90 rate and shots on target OUT, GAP** |
| The Proof (create pool: CAM, CM, unknown) | assists; key passes per 90 and total; shots on target | assists and key passes per 90 IN; **key passes total and shots on target OUT, GAP** |
| The Proof (def pool: CDM, FB, CB) | tackles, interceptions, blocks, per 90 and total | **ALL OUT, GAP.** A defender's Proof panel is entirely unknown to the writer. The midfield and defender pairs in sample 1 (Rodri v Rice) wrote with no Proof figures at all. |
| Wonder Tags, honours | this season's honours with who won them and the one-line meaning | IN |
| Wonder Tags, honours | the long paragraph under each; the figure line ("13 assists, 13 times the final pass was his") | OUT, DECIDED: the one-liner is the card's meaning; the paragraph is colour. The figure is in the totals fact. |
| Wonder Tags, the band | "ICONIC" and its one-liner ("One of the 150 greatest seasons ever measured") | the band IN; **the one-liner OUT, GAP** (a writer saying "one of the 150 greatest" cannot cite it today) |
| Wonder Tags, tags | each tag with its one-line meaning | IN |
| Wonder Tags, tags | the long paragraph under each | OUT, DECIDED |
| Wonder Tags, career stage | Wonderkid, The Last Dance chips (`[WONDERKID]` travels in the request and is not parsed) | OUT, GAP |
| **The Cabinet** | "What he had won by this season", every honour with its years, player and team shelves | **WAS OUT; IN FROM THIS COMMIT for the player-keyed half** (`vvAIStats.cabinet`, `cabinetFact`). The team legs the card adds from the career rows (League Title, UCL) are still OUT: the payload is a subset of the page, never more. |
| Watch | a link, no fact | nothing to mark |
| The Chronicle (72 cards) | a moment, with figures and history | OUT, DECIDED (2026-10-24, option 1: the Chronicle is outside the fact list; area 10) |
| Data Confidence | the dots (5/5), Verified or NR per field, "Official league & match data" | OUT, GAP for the dots and the field list; the pre-2015 era line is IN. A sentence like "a full stat record" cannot be cited today. |
| Glance line, Scout, Notes | model prose | off |
| Keeper cards | save rate with its error, percentile band, saves, conceded, penalties saved, the save-rate series | OUT, DECIDED: the cited writer gives a keeper no prose |
| Sequence navigation, the seasons list | every other season's score | OUT, DECIDED (other seasons) |

## The comparison (`compare.html`)

| Block | What a reader can read | Mark |
|---|---|---|
| The two faces | as the card face | as above |
| "All 13 seasons ▾" | a dropdown of every season with its score | OUT, DECIDED (other seasons) |
| The Verdict | the result line ("Suárez wins it outright , 93 to 81") | IN as P1, word for word from the rendered page in calibration; **the endpoint does not have it today** (the page sends separation instructions instead; `docs/PROSE_CASE_2026-10-24.md`) |
| The Verdict | "93 TO 81", "12 points" | IN (the scores; the gap is a difference of two cited numbers) |
| The Verdict | the verdict tag chip (one of fourteen: The Debate Lives On, and the rest) | **OUT, GAP.** The page names the comparison with a tag the writer has never heard of. The share caption prints it too ("The Verdict: <tag>"). |
| The Verdict | "No written opinion here, by choice…" | the off state, nothing to mark |
| The shape of each season | the overlaid radar; the legend says **"Availability"** where every other block says Reliability; "5 of 5 measured" | values IN; **the name OUT and a second naming disagreement**: the radar legend calls the fifth attribute Availability, the head-to-head and the card call it Reliability. "5 of 5 measured" OUT, GAP. |
| The shape of each season | the caption "Each dimension is a percentile within that player's own position pool" | OUT, WRONG for Reliability (§D) |
| Head to head | five values a side, the green dot on the winner of each | IN (the dot is a comparison of two cited numbers) |
| Accolades | each side's honours, band, tags with one-liners | IN; long paragraphs OUT, DECIDED |
| Accolades | **no Cabinet row** | **THE GAP THE OTHER WAY, FROM THIS COMMIT:** the verdict fact list now carries Cabinet lines and the Compare page does not print the Cabinet (it is on each card, one tap away). Under the 2026-10-22 rule, the writer must not state what the reader cannot check on the page, so either Accolades gains a Cabinet row or the Cabinet lines are dropped from the VERDICT list and kept for notes. Lucas decides; recorded in area 9. |
| The Trajectory | both careers, season by season, with peaks | OUT, DECIDED (other seasons) |
| The Proof | per 90 only: goals, assists, shots on target, **goal conversion %** (and the create and def rows by pool) | **ALL OUT, GAP.** The Compare Proof panel is entirely per-90 and percentage, and the fact list holds totals. "Goal conversion 29%" is printed and uncitable; "0.91 goals per 90" the same. |
| Data Confidence | "5/5", "La Liga · 12 seasons on record · full stat record" | OUT, GAP (the season count is a career fact; "full stat record" is a coverage claim) |
| Share | the caption "X or Y. The Verdict: <tag>." | OUT, GAP (the verdict tag again) |

## What this says

- **IN today:** identity, score and band (when printed), totals, the five attributes, shots total and key passes per 90 where the pool prints them, this season's honours and tags with the card's one-liners, the result line, the era line, and from this commit the Cabinet's player half.
- **OUT by decision, correctly:** every other season (Trajectory, seasons lists, sequence navigation), the Chronicle, the long tag and honour paragraphs, keeper figures.
- **OUT as gaps, in order of how often a writer would reach for them:**
  1. **The Proof panel's per-90 rates and goal conversion** on both pages, and **the whole defender Proof panel** (tackles, interceptions, blocks). The page prints them as evidence and the writer cannot cite them. Add them to `vvAIStats` as the page prints them (per 90 at the page's decimals, totals where the card prints totals), by pool, the same way key passes per 90 was added on 10-22.
  2. **The verdict tag name** (fourteen tags) and the share caption that repeats it. One fact line: "The page names this comparison <tag>: <its one-liner>".
  3. **The band's one-liner** ("One of the 150 greatest seasons ever measured") and the archetype blurb: card copy the writer may quote, like a tag one-liner.
  4. **Data Confidence** (dots, "full stat record", seasons on record) and the career-stage chips: add or forbid; today a sentence about data coverage is uncitable and gets deleted, which is the safe direction.
  5. **Squad number, nationality:** leave out.
- **Two naming disagreements on the pages themselves, both area 1:** Reliability is called a percentile by the caption (logged), and Availability by the Compare radar legend (new, this read).
- **The Compare page prints less than the cards** (no Cabinet, no totals in its Proof) while the fact list is built once for both readers. The rule that the payload states nothing the page does not print has to be read per page, and the Compare page is the narrower one.

Nothing in this file was changed on the pages. The Cabinet lines are the only addition to the fact list, by Lucas's decision; every other gap is recorded for him.
