# WHAT THE PAGE PRINTS THAT THE FACT LIST DOES NOT KNOW ABOUT (read 2026-10-24, code and rendered pages, no key)

**Why this exists.** The Cabinet was the fourth source of page disagreement in one week, after the fact list itself (the band), the Chronicle and the dimension caption. Lucas asked for every block on `card.html` and `compare.html` that states a fact a reader can read, each marked in or out of the cited writer's fact list (`scripts/calibration/cited.js`: `sideFacts` for a Compare side, `notesFacts` for a card). Read from the rendered pages the capture holds (Suárez 16/17, card 141117, and Suárez v Payet) and from the code that builds them. **Three marks:** IN (the fact list carries it); OUT, DECIDED (left out on purpose, with the decision); OUT, GAP (the page prints it and nothing decided to leave it out).

## The card (`card.html`)

| Block | What a reader can read | Mark |
|---|---|---|
| The face | season, VV score, band chip, top honour chip, top tag chip, goals, assists, surname, club, position, age | IN (the band only when the card prints Generational or Iconic) |
| The face | squad number, nationality flag, "View all 13 seasons" (a career length) | OUT, GAP. Squad number and nationality are not football facts the writer needs; the season count is a career fact the writer is banned from. Leave out, recorded. |
| The Glance | the same figures, full name, "35 GAMES", honour chips, band, tags, squad number | IN except the squad number |
| The Profile | the archetype blurb ("A forward who both makes and takes…"), a position-pool text | OUT, DECIDED (Lucas, 2026-10-24): judgement the writer does not need |
| The Profile | the radar and the five attribute values | IN |
| The Profile | the caption "Each dimension is a percentile against other ST seasons we can measure" | OUT, and WRONG for Reliability (§D, logged 2026-10-24) |
| The Trajectory | goals plus assists and the VV score for every season of the career, "PEAK 95", the years | OUT, DECIDED: other seasons are banned by the writer rules (kind 1 territory). The page prints them, so a reader can see what the writer may not say. |
| The Proof (goal pool: ST, Winger) | goals per 90 and total; shots on target per 90 and total; shots per 90 and total; "across 35 appearances (2,865 min)" | **IN FROM 2026-10-24 (second commit): `proof_rows`, the pool's three rows with total and per 90 at the card's two decimals, NR stated as not recorded** |
| The Proof (create pool: CAM, CM, unknown) | assists; key passes per 90 and total; shots on target | **IN, the same way** |
| The Proof (def pool: CDM, FB, CB) | tackles, interceptions, blocks, per 90 and total | **IN, the same way.** Was the biggest gap in this read: Rodri v Rice shipped with no tackles, interceptions or blocks. |
| Wonder Tags, honours | this season's honours with who won them and the one-line meaning | IN |
| Wonder Tags, honours | the long paragraph under each; the figure line ("13 assists, 13 times the final pass was his") | OUT, DECIDED: the one-liner is the card's meaning; the paragraph is colour. The figure is in the totals fact. |
| Wonder Tags, the band | "ICONIC" and its one-liner ("One of the 150 greatest seasons ever measured") | the band IN; the one-liner **OUT, DECIDED (Lucas, 2026-10-24): judgement the writer does not need** |
| Wonder Tags, tags | each tag with its one-line meaning | IN |
| Wonder Tags, tags | the long paragraph under each | OUT, DECIDED |
| Wonder Tags, career stage | Wonderkid, The Last Dance chips (`[WONDERKID]` travels in the request and is not parsed) | OUT, GAP |
| **The Cabinet** | "What he had won by this season", every honour with its years, player and team shelves | **IN for the card's notes, the player-keyed half** (`vvAIStats.cabinet`, `cabinetFact`). The team legs the card adds from the career rows (League Title, UCL) are OUT: the payload is a subset of the page, never more. **Not in the verdict list** (below). |
| Watch | a link, no fact | nothing to mark |
| The Chronicle (72 cards) | a moment, with figures and history | OUT, DECIDED (2026-10-24, option 1: the Chronicle is outside the fact list; area 10) |
| Data Confidence | the dots (5/5), Verified or NR per field, "Official league & match data" | OUT, DECIDED (Lucas, 2026-10-24): a claim about our data that prose should never make. The pre-2015 era line stays IN. |
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
| The shape of each season | the overlaid radar; the legend said **"Availability"** where every other block says Reliability; "5 of 5 measured" | values IN; **the legend FIXED to Reliability the same night** (§D, live when pushed). "5 of 5 measured" OUT, DECIDED with Data Confidence. |
| The shape of each season | the caption "Each dimension is a percentile within that player's own position pool" | OUT, WRONG for Reliability (§D) |
| Head to head | five values a side, the green dot on the winner of each | IN (the dot is a comparison of two cited numbers) |
| Accolades | each side's honours, band, tags with one-liners | IN; long paragraphs OUT, DECIDED |
| Accolades | **no Cabinet row** | **DECIDED (Lucas, 2026-10-24): the Cabinet lines are DROPPED from the verdict fact list and kept for notes.** The 10-22 rule is about what the reader can check, and on Compare the Cabinet is not in front of them; changing the page to suit the writer is backwards. The Compare request line no longer carries it. |
| The Trajectory | both careers, season by season, with peaks | OUT, DECIDED (other seasons) |
| The Proof | per 90 only: goals, assists, shots on target, **goal conversion %**, the SAME four rows for every pool | **IN FROM 2026-10-24 (second commit): `proof_compare`, the four figures at this page's decimals (two, two, one, a whole percent), one fact each.** **[2026-10-28: the conversion fact carried the gloss "goals as a share of shots" from this commit until CITED_REV c6, and no page prints it; struck (Lucas: the fact list follows the page), the same call as the Reliability gloss.]** **Still true, and for Lucas:** the Compare Proof panel prints the same attacking rows for every pool, so a CDM comparison (Rodri v Rice) now has goals, assists, shots on target and conversion per 90 and STILL no tackles, interceptions or blocks on this page; those are on the cards, one tap away, exactly the Cabinet's position. The writer gets them for notes, not for verdicts, by the same rule. |
| Data Confidence | "5/5", "La Liga · 12 seasons on record · full stat record" | OUT, DECIDED (Lucas, 2026-10-24) |
| Share | the caption "X or Y. The Verdict: <tag>." | OUT, GAP (the verdict tag again) |

## What this says

- **IN today:** identity, score and band (when printed), totals, the five attributes, shots total and key passes per 90 where the pool prints them, this season's honours and tags with the card's one-liners, the result line, the era line, and from this commit the Cabinet's player half.
- **OUT by decision, correctly:** every other season (Trajectory, seasons lists, sequence navigation), the Chronicle, the long tag and honour paragraphs, keeper figures.
- **The gaps, as Lucas decided them the same night:**
  1. **The Proof panel: CLOSED.** `vvAIStats` now carries `proof_rows` (the card's pool rows, total and per 90 at two decimals) and `proof_compare` (the comparison's four figures at its own decimals); each page sends only what it prints; the writer gets one fact per figure and is told NR means not recorded. Both samples re-captured, audit clean.
  2. **The verdict tag name:** stays out for now.
  3. **The band's one-liner and the archetype blurb: OUT, DECIDED.** Judgement the writer does not need.
  4. **Data Confidence: OUT, DECIDED.** A claim about our data that prose should never make. The career-stage chips stay out with it.
  5. **Squad number, nationality:** out.
- **Two consequences of the per-page rule, decided by Lucas the same night.** His reason, in his words: **"the fact list follows the page, never the other way round"**, the third time this week the fix was to give the writer the page rather than bend either one. (i) **Key passes per 90 and the shots total are OFF the verdict fact list** and off the Compare request line: the Compare page prints neither (it prints conversion, not the shots total; key passes only on the card), so they had been uncheckable by a verdict's reader since 10-22, and "a rule with convenient exceptions is not one". The card's notes keep both. (ii) **A CDM pair on Compare writes with no defensive figures, and that is correct and honest under the rule.** The fault is the Compare Proof panel printing attacking rows to a defender pair, logged in §D as a page error, not a payload fix: when the panel prints per-pool rows the facts follow automatically.
- **Two naming disagreements on the pages themselves, both area 1:** Reliability is called a percentile by the caption (logged, open), and was called Availability by the Compare radar legend (fixed the same night, one word).
- **The Compare page prints less than the cards** (no Cabinet, no totals in its Proof) while the fact list is built once for both readers. The rule that the payload states nothing the page does not print has to be read per page, and the Compare page is the narrower one.

The pages changed in two places, both one line: the Compare radar legend, and the Compare request line (the Proof figures in, the Cabinet out). The fact list gained the Proof panel on both sides and the Cabinet on the card side.
