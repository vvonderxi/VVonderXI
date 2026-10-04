# SQUAD NUMBERS , the Fable prompt, ready to paste

**Scoped 2026-09-13. NOT RUN. Two calibration batches, then a decision.**

Read `docs/TOP_ASSISTS_SOURCING_SPEC.md` SS 0 first. Card resolution is a precondition here too,
and it is already done: every row below carries a `card_id` that exists. Fable is never asked to
resolve identity, only to fill one column.

**RUN EACH BATCH IN A SEPARATE FRESH CHAT.** Batch 2 must not see batch 1's answers.

---

## PASTE 1 , BATCH 1, THE BLIND CONTROL (134 rows)

These 134 cards **already carry a stored squad number** and are presented here as if we do not
have them. It is the only external check available before spending 46 batches.

**AND IT CANNOT PROVE THE PASS WORKS. MEASURED, AND THIS IS THE POINT:**

    the 134 control        median rt 89   99% at rt>=85
    the 8,771 it predicts  median rt 45    0% at rt>=85

**The control is essentially all elite cards** , someone researched the top slice, and 90 of the
134 wear 7, 9, 10 or 11. **A model finds Agüero's 10 trivially and a Gençlerbirliği squad filler's
27 not at all.** This is the same prominence bias that made the false assists honours look correct
(handover SS 0.2). So batch 1 is a NECESSARY gate and NOT a sufficient one: failing it kills the
pass, passing it says little about the tail. That is what batch 2 is for.

```
SQUAD NUMBERS , research task

You are given a fixed list of players. For each row, return the SQUAD NUMBER that
player wore for that club in that season. You are filling one column in a table
that already exists.

RULES

1. DO NOT CHANGE THE IDENTITY COLUMNS. card_id, player_name, club and season are
   given and are correct. Echo card_id back exactly. Never add a player, never
   remove one, never re-order, never correct a spelling. If a player looks wrong
   to you, fill the number you believe is right for the row AS GIVEN and say so
   in evidence. Resolving identity is not your task.

2. THE NUMBER IS AN INTEGER 1 TO 99. Not a range, not "unknown", not a guess
   dressed as a number. If you do not know it, the field is null and confidence
   is "none".

3. TWO PLAYERS IN ONE SQUAD CANNOT SHARE A NUMBER. Before returning a club, check
   your own answers for that club. If two rows collide, you are wrong about at
   least one: set BOTH to null with confidence "none" and say which pair collided.
   Do not pick one.

4. IF TWO ROWS IN THE SAME CLUB SHARE A PLAYER NAME, they are different people,
   often related. Fill both or neither. Never assign a number by guessing which
   one is which.

5. A NUMBER YOU REMEMBER FROM A DIFFERENT SEASON IS NOT AN ANSWER. Squad numbers
   change between seasons and mid-season. If your recollection is of the player at
   that club but you cannot place it in THIS season, confidence is "low" and you
   say so in evidence.

6. CONFIDENCE, one of: high | medium | low | none.
   high   = you can place the number in this club and this season specifically
   medium = confident in the number, less certain it is this exact season
   low    = a recollection you would not defend
   none   = you do not know. This is a complete and acceptable answer, and a batch
            that is mostly "none" is a useful result, not a failed one.

7. EVIDENCE is one short clause naming WHAT you are drawing on , a squad list, a
   shirt, a transfer announcement, a match report. "I recall it" is not evidence
   and should be reported as low with that said plainly.

8. DO NOT EXPLAIN, DO NOT SUMMARISE, DO NOT ADD COMMENTARY. Return the table only.

OUTPUT , one row per input row, pipe-separated, header included, nothing else:

card_id | player_name | club | season | number | confidence | evidence

INPUT , card_id | player_name | club | season | league
134542 | S. Agüero | Manchester City | 2015/16 | PL
134697 | H. Kane | Tottenham | 2015/16 | PL
134711 | R. Mahrez | Leicester | 2015/16 | PL
134725 | J. Vardy | Leicester | 2015/16 | PL
134750 | C. Eriksen | Tottenham | 2015/16 | PL
134759 | O. Giroud | Arsenal | 2015/16 | PL
134773 | D. Payet | West Ham | 2015/16 | PL
134782 | D. Alli | Tottenham | 2015/16 | PL
134800 | M. Özil | Arsenal | 2015/16 | PL
134864 | Diego Costa | Chelsea | 2014/15 | PL
134971 | S. Agüero | Manchester City | 2014/15 | PL
135106 | H. Kane | Tottenham | 2014/15 | PL
135359 | S. Agüero | Manchester City | 2013/14 | PL
135435 | Yaya Touré | Manchester City | 2013/14 | PL
135556 | L. Suárez | Liverpool | 2013/14 | PL
135593 | Daniel Andre Sturridge | Liverpool | 2013/14 | PL
135628 | R. Lukaku | West Brom | 2012/13 | PL
135738 | G. Bale | Tottenham | 2012/13 | PL
135915 | Miguel Pérez Cuesta | Swansea | 2012/13 | PL
135934 | L. Suárez | Liverpool | 2012/13 | PL
135966 | Robin van Persie | Manchester United | 2012/13 | PL
136138 | S. Agüero | Manchester City | 2011/12 | PL
136348 | Robin van Persie | Arsenal | 2011/12 | PL
136350 | Emmanuel Adebayor | Tottenham | 2011/12 | PL
136542 | Dimitar Ivanov Berbatov | Manchester United | 2010/11 | PL
136722 | C. Tevez | Manchester City | 2010/11 | PL
136742 | Robin van Persie | Arsenal | 2010/11 | PL
141190 | Rubén Castro | Real Betis | 2015/16 | LL
141249 | Aduriz | Athletic Club | 2015/16 | LL
141268 | K. Gameiro | Sevilla | 2015/16 | LL
141373 | A. Griezmann | Atletico Madrid | 2015/16 | LL
141402 | L. Messi | Barcelona | 2015/16 | LL
141405 | K. Benzema | Real Madrid | 2015/16 | LL
141441 | Neymar | Barcelona | 2015/16 | LL
141521 | G. Bale | Real Madrid | 2015/16 | LL
141575 | L. Suárez | Barcelona | 2015/16 | LL
141579 | Cristiano Ronaldo | Real Madrid | 2015/16 | LL
141714 | Aduriz | Athletic Club | 2014/15 | LL
141827 | A. Griezmann | Atletico Madrid | 2014/15 | LL
141853 | L. Messi | Barcelona | 2014/15 | LL
141880 | Neymar | Barcelona | 2014/15 | LL
141882 | C. Bacca | Sevilla | 2014/15 | LL
141999 | Cristiano Ronaldo | Real Madrid | 2014/15 | LL
142265 | L. Messi | Barcelona | 2013/14 | LL
142353 | Diego Costa | Atletico Madrid | 2013/14 | LL
142407 | A. Sánchez | Barcelona | 2013/14 | LL
142422 | Cristiano Ronaldo | Real Madrid | 2013/14 | LL
142478 | Rubén Castro | Real Betis | 2012/13 | LL
142558 | Francisco Medina Luna | Rayo Vallecano | 2012/13 | LL
142695 | L. Messi | Barcelona | 2012/13 | LL
142834 | R. Falcao | Atletico Madrid | 2012/13 | LL
142838 | Cristiano Ronaldo | Real Madrid | 2012/13 | LL
142864 | Soldado | Valencia | 2012/13 | LL
142878 | Álvaro Negredo | Sevilla | 2012/13 | LL
143372 | L. Messi | Barcelona | 2011/12 | LL
143384 | K. Benzema | Real Madrid | 2011/12 | LL
143508 | R. Falcao | Atletico Madrid | 2011/12 | LL
143526 | Cristiano Ronaldo | Real Madrid | 2011/12 | LL
143528 | G. Higuaín | Real Madrid | 2011/12 | LL
143732 | David Villa | Barcelona | 2010/11 | LL
143808 | L. Messi | Barcelona | 2010/11 | LL
143921 | G. Rossi | Villarreal | 2010/11 | LL
143927 | S. Agüero | Atletico Madrid | 2010/11 | LL
143939 | Llorente | Athletic Club | 2010/11 | LL
143953 | Cristiano Ronaldo | Real Madrid | 2010/11 | LL
143985 | Soldado | Valencia | 2010/11 | LL
143989 | Álvaro Negredo | Sevilla | 2010/11 | LL
148342 | P. Dybala | Juventus | 2015/16 | SA
148588 | L. Insigne | Napoli | 2015/16 | SA
148619 | C. Bacca | AC Milan | 2015/16 | SA
148701 | G. Higuaín | Napoli | 2015/16 | SA
148724 | M. Icardi | Inter | 2015/16 | SA
148742 | M. Pjanić | AS Roma | 2015/16 | SA
149155 | C. Tevez | Juventus | 2014/15 | SA
149524 | Luca Toni | Hellas Verona | 2013/14 | SA
149582 | C. Tevez | Juventus | 2013/14 | SA
149732 | Antonio Di Natale | Udinese | 2012/13 | SA
150011 | E. Cavani | Napoli | 2012/13 | SA
150154 | Antonio Di Natale | Udinese | 2011/12 | SA
150281 | Diego Alberto Milito | Inter | 2011/12 | SA
150412 | Z. Ibrahimović | AC Milan | 2011/12 | SA
150437 | E. Cavani | Napoli | 2011/12 | SA
150585 | Antonio Di Natale | Udinese | 2010/11 | SA
150846 | E. Cavani | Napoli | 2010/11 | SA
150877 | Samuel Eto'o Fils | Inter | 2010/11 | SA
154701 | Raffael Caetano de Araújo | Borussia Mönchengladbach | 2015/16 | BL
154840 | R. Lewandowski | Bayern München | 2015/16 | BL
154851 | T. Müller | Bayern München | 2015/16 | BL
154931 | J. Hernández | Bayer Leverkusen | 2015/16 | BL
154942 | H. Mkhitaryan | Borussia Dortmund | 2015/16 | BL
154943 | P. Aubameyang | Borussia Dortmund | 2015/16 | BL
155056 | A. Meier | Eintracht Frankfurt | 2014/15 | BL
155593 | R. Lewandowski | Borussia Dortmund | 2013/14 | BL
155614 | M. Mandžukić | Bayern München | 2013/14 | BL
155786 | S. Kießling | Bayer Leverkusen | 2012/13 | BL
155955 | R. Lewandowski | Borussia Dortmund | 2012/13 | BL
156291 | M. Reus | Borussia Mönchengladbach | 2011/12 | BL
156294 | R. Lewandowski | Borussia Dortmund | 2011/12 | BL
156303 | K. Huntelaar | FC Schalke 04 | 2011/12 | BL
156404 | M. Gómez | Bayern München | 2011/12 | BL
156735 | M. Gómez | Bayern München | 2010/11 | BL
156738 | P. Cissé | SC Freiburg | 2010/11 | BL
161181 | Á. Di María | Paris Saint Germain | 2015/16 | L1
161183 | H. Ben Arfa | Nice | 2015/16 | L1
161191 | Z. Ibrahimović | Paris Saint Germain | 2015/16 | L1
161209 | E. Cavani | Paris Saint Germain | 2015/16 | L1
161211 | A. Lacazette | Lyon | 2015/16 | L1
161530 | A. Gignac | Marseille | 2014/15 | L1
161649 | A. Lacazette | Lyon | 2014/15 | L1
161999 | Z. Ibrahimović | Paris Saint Germain | 2013/14 | L1
162403 | Z. Ibrahimović | Paris Saint Germain | 2012/13 | L1
162793 | Nenê | Paris Saint Germain | 2011/12 | L1
162824 | O. Giroud | Montpellier | 2011/12 | L1
163222 | Moussa Sow | Lille | 2010/11 | L1
167490 | Jonas Gonçalves Oliveira | Benfica | 2015/16 | PRT
167597 | Konstantinos Mitroglou | Benfica | 2015/16 | PRT
167612 | I. Slimani | Sporting CP | 2015/16 | PRT
168401 | J. Martínez | FC Porto | 2012/13 | PRT
169111 | Hulk | FC Porto | 2010/11 | PRT
173207 | A. Milik | Ajax | 2015/16 | ERE
173239 | L. de Jong | PSV Eindhoven | 2015/16 | ERE
173271 | V. Janssen | AZ Alkmaar | 2015/16 | ERE
173594 | M. Depay | PSV Eindhoven | 2014/15 | ERE
173879 | A. Finnbogason | Heerenveen | 2013/14 | ERE
173929 | G. Pellè | Feyenoord | 2013/14 | ERE
174209 | A. Finnbogason | Heerenveen | 2012/13 | ERE
174228 | W. Bony | Vitesse | 2012/13 | ERE
174256 | G. Pellè | Feyenoord | 2012/13 | ERE
174285 | J. Altidore | AZ Alkmaar | 2012/13 | ERE
174532 | B. Dost | Heerenveen | 2011/12 | ERE
174594 | L. de Jong | Twente | 2011/12 | ERE
174607 | Sanharib Malki | Roda | 2011/12 | ERE
174863 | D. Bulykin | ADO Den Haag | 2010/11 | ERE
185041 | M. Gómez | Beşiktaş | 2015/16 | TR
```

---

## PASTE 2 , BATCH 2, THE TAIL (39 rows, two full squads)

**This is the batch that actually decides it.** Two complete club-seasons where we hold NOTHING,
chosen to span the difficulty rather than to flatter:

    Hamburger SV 2012/13 BL      rank 7, 18 cards, median rt 44   , a big name, mid-table
    Gençlerbirliği S.K. 2013/14 TR  rank 9, 21 cards, median rt 35   , the hard case, and an
                                                                        alias-mapped club

**There is no ground truth here, so batch 2 cannot measure accuracy.** What it measures is YIELD
(what share come back high) and SELF-CONSISTENCY (rule 3 can actually fire, because these are
whole squads rather than one starred player per club , which is the other thing batch 1 cannot
test: its 134 rows are spread over 113 club-seasons).

Same prompt, different INPUT block.

```
SQUAD NUMBERS , research task

You are given a fixed list of players. For each row, return the SQUAD NUMBER that
player wore for that club in that season. You are filling one column in a table
that already exists.

RULES

1. DO NOT CHANGE THE IDENTITY COLUMNS. card_id, player_name, club and season are
   given and are correct. Echo card_id back exactly. Never add a player, never
   remove one, never re-order, never correct a spelling. If a player looks wrong
   to you, fill the number you believe is right for the row AS GIVEN and say so
   in evidence. Resolving identity is not your task.

2. THE NUMBER IS AN INTEGER 1 TO 99. Not a range, not "unknown", not a guess
   dressed as a number. If you do not know it, the field is null and confidence
   is "none".

3. TWO PLAYERS IN ONE SQUAD CANNOT SHARE A NUMBER. Before returning a club, check
   your own answers for that club. If two rows collide, you are wrong about at
   least one: set BOTH to null with confidence "none" and say which pair collided.
   Do not pick one.

4. IF TWO ROWS IN THE SAME CLUB SHARE A PLAYER NAME, they are different people,
   often related. Fill both or neither. Never assign a number by guessing which
   one is which.

5. A NUMBER YOU REMEMBER FROM A DIFFERENT SEASON IS NOT AN ANSWER. Squad numbers
   change between seasons and mid-season. If your recollection is of the player at
   that club but you cannot place it in THIS season, confidence is "low" and you
   say so in evidence.

6. CONFIDENCE, one of: high | medium | low | none.
   high   = you can place the number in this club and this season specifically
   medium = confident in the number, less certain it is this exact season
   low    = a recollection you would not defend
   none   = you do not know. This is a complete and acceptable answer, and a batch
            that is mostly "none" is a useful result, not a failed one.

7. EVIDENCE is one short clause naming WHAT you are drawing on , a squad list, a
   shirt, a transfer announcement, a match report. "I recall it" is not evidence
   and should be reported as low with that said plainly.

8. DO NOT EXPLAIN, DO NOT SUMMARISE, DO NOT ADD COMMENTARY. Return the table only.

OUTPUT , one row per input row, pipe-separated, header included, nothing else:

card_id | player_name | club | season | number | confidence | evidence

INPUT , card_id | player_name | club | season | league
185445 | A. Kulusic | Gençlerbirliği S.K. | 2013/14 | TR
185512 | Ahmet Yılmaz Çalık | Gençlerbirliği S.K. | 2013/14 | TR
185502 | Bogdan Sorin Stancu | Gençlerbirliği S.K. | 2013/14 | TR
185498 | D. Tošić | Gençlerbirliği S.K. | 2013/14 | TR
185711 | Deniz Naki | Gençlerbirliği S.K. | 2013/14 | TR
185429 | Doga Kaya | Gençlerbirliği S.K. | 2013/14 | TR
185566 | Ermin Zec | Gençlerbirliği S.K. | 2013/14 | TR
185659 | F. Kaplan | Gençlerbirliği S.K. | 2013/14 | TR
185458 | Hakan Aslantaş | Gençlerbirliği S.K. | 2013/14 | TR
185647 | J. Durmaz | Gençlerbirliği S.K. | 2013/14 | TR
185591 | J. Gosso | Gençlerbirliği S.K. | 2013/14 | TR
185677 | M. Çelik | Gençlerbirliği S.K. | 2013/14 | TR
185657 | N. Çalışkan | Gençlerbirliği S.K. | 2013/14 | TR
185606 | N. Tomić | Gençlerbirliği S.K. | 2013/14 | TR
185594 | Oktay Delibalta | Gençlerbirliği S.K. | 2013/14 | TR
185451 | Özgür İleri | Gençlerbirliği S.K. | 2013/14 | TR
185648 | R. Köse | Gençlerbirliği S.K. | 2013/14 | TR
185746 | R. Petrović | Gençlerbirliği S.K. | 2013/14 | TR
185486 | S. Kurtuluş | Gençlerbirliği S.K. | 2013/14 | TR
185541 | Sedat Bayrak | Gençlerbirliği S.K. | 2013/14 | TR
185442 | Serkan Yanik | Gençlerbirliği S.K. | 2013/14 | TR
155839 | Artoms Rudņevs | Hamburger SV | 2012/13 | BL
155835 | D. Aogo | Hamburger SV | 2012/13 | BL
155907 | D. Diekmeier | Hamburger SV | 2012/13 | BL
155768 | H. Westermann | Hamburger SV | 2012/13 | BL
155862 | I. Iličević | Hamburger SV | 2012/13 | BL
156053 | J. Bruma | Hamburger SV | 2012/13 | BL
155965 | M. Badelj | Hamburger SV | 2012/13 | BL
155841 | M. Jansen | Hamburger SV | 2012/13 | BL
155984 | M. Mancienne | Hamburger SV | 2012/13 | BL
155836 | Maximilian Beister | Hamburger SV | 2012/13 | BL
155920 | P. Skjelbred | Hamburger SV | 2012/13 | BL
155865 | Petr Jiráček | Hamburger SV | 2012/13 | BL
155882 | R. Adler | Hamburger SV | 2012/13 | BL
156015 | Rafael van der Vaart | Hamburger SV | 2012/13 | BL
155973 | Slobodan Rajković | Hamburger SV | 2012/13 | BL
156001 | Son Heung-Min | Hamburger SV | 2012/13 | BL
155983 | T. Rincón | Hamburger SV | 2012/13 | BL
155840 | Zhi Gin Andreas Lam | Hamburger SV | 2012/13 | BL
```

---

## WHAT WOULD MAKE ME TRUST THE PASS

**Judge on HIGH-confidence rows only**, because those are the only ones that would be written.
Medium, low and none are held by the write path regardless, so their accuracy does not decide this.

### Batch 1 , the control. PRECISION. This one has an answer to check against.

    >= 95% agreement on high-confidence rows   PROCEED to batch 2
    85 to 94%                                  STOP and read every disagreement individually
    < 85%                                      STOP. The pass is not reliable enough to write from.

**A DISAGREEMENT DOES NOT AUTOMATICALLY MEAN FABLE IS WRONG, AND THIS IS NOT A FORMALITY.** Our 134
came from the same importer that produced everything else, and `player_positions` holds only 320
rows for 2010-2015 with 156 numbers , a thin, hand-built set. **Any disagreement is checked against
an external source before we decide whose error it is.** If Fable turns out to be right on some of
them, that is a finding about OUR data and it belongs in `DATA_DEFECTS.md`.

### Batch 2 , the tail. YIELD and SELF-CONSISTENCY. No answer to check against.

    high-confidence yield >= 30%   the pass is worth 46 batches
    10 to 29%                      marginal , worth running only the strongest leagues
    < 10%                          not worth it. The tail is where the 8,771 live.

    rule-3 collisions              ANY self-collision it reports is GOOD , the guard works
    rule-3 collisions it MISSED    a duplicate number we catch that it did not is a red flag,
                                   because it means the internal check is not being run

**THE TWO GATES ARE ANDED. High precision on batch 1 with 5% yield on batch 2 means the model knows
the famous cards and nothing else, which is the prominence bias restated , and writing only what it
is confident about would fill in exactly the cards that least need filling.**

### And the thing neither batch can settle

**Accuracy on the TAIL is not measurable from here.** Batch 1 measures precision on elite cards;
batch 2 measures yield on ordinary ones; nothing measures precision on ordinary ones. **Closing
that needs a handful of batch-2 rows spot-checked against an external source by hand** , Lucas's
call, maybe ten rows. Until that is done, the honest statement is that the pass is trusted on the
shape of cards batch 1 contains and assumed on the rest.

**DO NOT LET A GOOD BATCH-1 NUMBER STAND IN FOR THAT.** It is the same substitution the assists
pass made: a fill measured on marquee cards and generalised to the population.

---

## THE TEN SPOT-CHECKS , PRE-REGISTERED 2026-09-13, BEFORE ANY RESULT EXISTS

**NOMINATED BEFORE BATCH 2 RUNS SO THEY CANNOT BE CHOSEN TO FLATTER THE OUTCOME.** This is the only
measurement of PRECISION ON ORDINARY CARDS, which is the thing the whole job rests on and which
neither batch measures. Same standing as `docs/KEEPER_MARK_PREREGISTRATION.md`.

**THE SELECTION RULE IS DETERMINISTIC AND REPRODUCIBLE, WHICH IS THE POINT.** Sort each squad by
`rt` DESCENDING and take evenly spaced ranks including both extremes: **1, 5, 9, 13, 17 of 18** for
Hamburger SV and **1, 6, 11, 16, 21 of 21** for Gençlerbirliği. No judgement was applied to which
names look checkable, and the two rt-14 cards at the bottom of each squad are in by construction.

### Hamburger SV 2012/13, Bundesliga

    rank  card_id  player                rt
     1    155839   Artoms Rudņevs        78
     5    155768   H. Westermann         62
     9    155841   M. Jansen             47
    13    155907   D. Diekmeier          26
    17    155973   Slobodan Rajković     18

### Gençlerbirliği S.K. 2013/14, Süper Lig

    rank  card_id  player                     rt
     1    185502   Bogdan Sorin Stancu        72
     6    185445   A. Kulusic                 50
    11    185606   N. Tomić                   35
    16    185458   Hakan Aslantaş             21
    21    185711   Deniz Naki                 14

### The source each is checked against, and why it is not Transfermarkt alone

**TRANSFERMARKT IS A LEGITIMATE SOURCE HERE AND IS ALREADY THE PLATFORM'S DECLARED ONE FOR THIS
FIELD** , `CLAUDE.md` SS C records shirt number and position as Transfermarkt-sourced, and
`DATA_DEFECTS.md` states explicitly that the assists definitional finding **does not leak into
shirt numbers**: a shirt number is a roster fact with one answer, an assist is a judgement.

**BUT IT MAY NOT BE THE ONLY READ, FOR THE LINEAGE REASON.** If the model is recalling
Transfermarkt, checking its answer against Transfermarkt confirms one lineage against itself ,
exactly the trap `TOP_ASSISTS_SOURCING_SPEC.md` SS 9 exists to catch. So each row gets a governing
or editorial record FIRST, and Transfermarkt as the second read.

    Hamburger SV 2012/13   PRIMARY   kicker.de season archive , independent German football
                                     record with its own editorial squad lists
                           SECOND    Transfermarkt, or bundesliga.com's own season archive
    Gençlerbirliği 2013/14 PRIMARY   tff.org.tr , the Turkish Football Federation, the
                                     governing body's own competition record
                           SECOND    Transfermarkt, or mackolik for the same season

**FIRST STEP IS REACHABILITY, NOT THE NUMBERS.** The assists pass lost time to sources that looked
obvious and did not carry the season , the La Liga archive is current-season only, the Bundesliga
archive reaches back to 2019/20, and a Premier League slug silently redirected to the goals table.
**Check each source actually serves 2012/13 and 2013/14 before checking a single player**, and
record any that does not, so the next pass does not re-test it.

### How the ten are read

    10 of 10 agree        precision on ordinary cards is established. Proceed to batch 3.
    8 or 9 agree          proceed, and record the misses , if they cluster at low rt, the pass
                          has a floor and the write should carry a minutes or rt gate
    <= 7 agree            STOP. High-confidence output is not reliable on the cards this job
                          exists to fill, whatever batch 1 said.

**A ROW WHERE BOTH EXTERNAL SOURCES DISAGREE WITH EACH OTHER IS NOT A MISS , IT IS UNRESOLVED**, and
it counts as neither agreement nor disagreement. Say so and reduce the denominator.
