# CROSS-LEAGUE SEASON ORDER , THE SCOPE. **IT IS BUILT NOW. READ THIS BLOCK FIRST.**

> **[SUPERSEDED IN PART, 2026-09-24. THE TITLE SAID "NOTHING BUILT" AND THE FIGURES BELOW ARE THE
> PRE-ALIAS ONES. Both were true when this was written and neither is now, and SEC C's own rule is
> that a superseded paragraph left above its correction gets read first and acted on.]**
>
> **WHAT SHIPPED:** the schema change (`3562ab4`), the seven wrong-season repairs (`ef237c8`), the
> four Turkish aliases (`27678db`), **609** rows written with `orderSeasonRows`'s league-code branch
> deleted (`c8a87b8`), and the three stale fetch gates that meant nothing asked for the new rows
> (`de36ea3`).
>
> **WHAT THE NUMBERS BECAME.** Sections 1 and 3 below record the ladder at **605 of 614, 98.5%**,
> with an 8-pair residue, because they were measured BEFORE the alias map. With the aliases and
> `fk` added to the club-type suffixes it is **609 of 613, 99.3%**, and the residue is exactly the
> **four players the export does not carry**: Cisse 2011/12, van Bommel 2010/11, Ghezzal 2011/12,
> Simao 2010/11. The rung split shipped as transfer_row 529, arrival_both 39, arrival_one 36,
> next_departure 5.
>
> **AND TWO RUNGS CHANGED SHAPE AFTER THE CONTROL RAN**, which sections 1 and 2 predate: rung 1
> ignores rows dated at either season boundary (a 1 July line closes the previous loan, a late-June
> line closes this one), and rung 3 reads the phase, because an arrival in July is the club he
> STARTED at rather than the one he joined. Taking the earliest direct row reversed 17 of the 800
> control rows and taking the latest reversed 39; after both corrections, zero.
>
> **Section 5 is the one part still unbuilt**, and it is scope.


**THE DEFECT.** A player who plays in two different leagues in one season holds two cards, and
`VVCore.orderSeasonRows` puts them in order by **league code, alphabetically**:

```js
if (a.league_code !== b.league_code) return String(a.league_code||'').localeCompare(String(b.league_code||''));
```

That line sits **above** the `split_transfers` lookup, so a cross-league pair never reaches the
transfer evidence at all. `LL` sorts before `PL`, so **Aubameyang 2021/22 draws Barcelona before
Arsenal, and he left Arsenal for Barcelona in January 2022.**

**IT IS WRONG ON THE AXIS TODAY AND IT WOULD BE WRONG OUT LOUD IN A CAPTION.** The trajectory
club labels made it visible; they did not cause it. The card's season list, the compare picker and
the compare trajectory all read this same function.

---

## 0. THE POPULATION , AND THE 432 THAT HAS BEEN QUOTED TWICE IS WRONG

Measured against `player_card_mv`, all 57,885 cards, 2026-09-24:

| | |
|---|---|
| **cross-league player-seasons** | **614** |
| cards in them | 1,229 |
| distinct players | **571** |
| of those seasons, two cards / three cards | 613 / 1 |
| same-league multi-card player-seasons (the sitting-1 population) | 826 |

**432 IS NOT ANY OF THESE NUMBERS.** It came out of a SEC E line and I repeated it in a report
without re-deriving it. **The unit that matters is the player-SEASON, because that is what gets
ordered: 614.** 571 is the player count and is the wrong denominator for this job.

---

## 1. HOW MANY CAN BE DATED FROM `transfers.csv`

Source: `exports/bam/player/2026-09-17T18-16-35/transfers.csv`, 203,987 rows,
`player_id,player_name,from_club,to_club,date,type`.

**THE ID NAMESPACE IS OURS , CHECKED, NOT ASSUMED.** 567 of the 571 cross-league players have at
least one row in the file, so `player_id` is `api_player_id`.

**AND `split_transfers` IS ALREADY THIS FILE.** All **800 of 800** existing rows are found
**verbatim** in `transfers.csv` on `(player_id, from_club, to_club, date, type)`. So adding
cross-league rows from the same export mixes nothing , this is the same source, reaching a
population the same-league key could not represent.

### The ladder, measured rung by rung

A season window of `Y-07-01` to `(Y+1)-06-30`. Club names compared on significant tokens with a
subset rule, which is what makes `Hellas Verona` match `Verona` and `Kasımpaşa` match `Kasimpasa`;
equality alone refused about a third of the real pairs.

| rule | what it reads | pairs | share |
|---|---|---|---|
| **1** | a dated move **between the two clubs** inside the window | **540** | 87.9% |
| **2** | a dated **arrival at each club** inside the window, different dates | **38** | 6.2% |
| **3** | a dated arrival at **exactly one** club , the other is where he started | **23** | 3.7% |
| **4** | the first **departure after** the window , the club he left is where he finished | **4** | 0.7% |
| | **orderable from the export** | **605** | **98.5%** |
| | nothing dated | 4 | 0.7% |
| | player absent from `transfers.csv` | 4 | 0.7% |

**RULE 2 EXISTS BECAUSE A LOAN RETURN IS NOT A TRANSFER BETWEEN THE TWO CLUBS.** Our two cards can
be two loan spells with the parent club in between, so there is no direct row and there never will
be: the chain runs Napoli to Torino, Torino to Napoli, Napoli to Espanyol.

**THE FOUR "NOTHING DATED" ARE CLUB-NAME MISSES, NOT MISSING DATA** , `Erzurumspor FK` against
`Erzurum BB`, `Akhisarspor` against `Akhisar Belediye` (twice), `Gaziantep FK` against
`Gazişehir Gaziantep`. All four are Turkish clubs the export names differently. A short alias map
takes the ladder to about **99.2%**, and the true residue is the **4 players the export does not
carry at all** plus the **1 three-card season**, which needs its own answer and is not in scope
here.

**AUBAMEYANG IS IN THE 1.5% AND THE RULE THAT SAVES HIM IS RULE 4.** The export has no
Arsenal-to-Barcelona row at all. It has `Barcelona -> Chelsea 2022-09-01`, which is a departure
**from Barcelona** after the season ended, so Barcelona is where he finished and Arsenal came
first. His 2017/18 split is a plain rule 1: `Borussia Dortmund -> Arsenal 2018-01-31`.

---

## 2. WHERE THE ROWS LIVE , EXTEND `split_transfers`, AND WIDEN ITS KEY

**Today:** `PRIMARY KEY (api_player_id, season_year, league_code)`, `league_code NOT NULL`,
columns `from_club, to_club, transfer_date, transfer_type`, 800 rows.

**THE KEY IS THE BLOCKER, NOT THE TABLE.** A cross-league move spans two league codes, so neither
one owns the row, and a lookup keyed on one league can only ever find half a pair. That is also why
the function never consults it for a cross-league pair.

**THE PROPOSAL, AND IT IS ONE TABLE RATHER THAN A SIBLING:**

- `league_code` becomes **NULLABLE**. Null means *this move crosses leagues, so no single league
  owns it* , which is a fact about the event rather than a missing value.
- The primary key becomes **`(api_player_id, season_year, from_club, to_club)`**. The event is
  identified by who moved, in which season, between which two clubs. That admits both kinds and it
  admits the one three-card season, which the current key cannot.
- **`source text NOT NULL`** , `'bam_transfers_2026-09-17'` for all 800 existing rows and every new
  one. The table is single-source today and nothing in it says so; the moment a second source is
  possible, an unmarked row is unattributable.
- **`decided_by text NOT NULL`** , which rung placed the row. This is the column that keeps the
  table honest, see below.

**WHY NOT A SIBLING TABLE.** Every consumer , the card season list, the compare picker, the compare
trajectory, and the Data Confidence notes , asks one question: *which club came first in this
season*. A second table makes each of them ask it twice and keeps two fallbacks in step. SEC C
already records that two places for one concept is a defect even when both are populated.

**WHY NOT KEEP THE LEAGUE IN THE KEY AND WRITE THE DESTINATION LEAGUE.** It reads as tidy and it
collides: a player with a same-league split in league Y and a cross-league move into Y in the same
season produces two rows on one key. That case exists , it is the three-card season.

### The part that must not be fudged: rules 2 to 4 are not transfers

**ONLY RULE 1 PRODUCES A MOVE THE SOURCE ACTUALLY RECORDS.** Rules 2, 3 and 4 produce an **order**,
inferred from arrivals and departures. Writing them into `from_club -> to_club` with a date would
invent a transfer the export does not contain.

So:

- **Rule 1, 540 rows:** the BAM row verbatim , `from_club`, `to_club`, `transfer_date`,
  `transfer_type`, `decided_by = 'transfer_row'`.
- **Rules 2 to 4, 65 rows:** `from_club` and `to_club` carry the **derived order**,
  **`transfer_date` and `transfer_type` are NULL**, and `decided_by` is `'arrival_both'`,
  `'arrival_one'` or `'next_departure'`.
- **The 8 residue pairs get no row at all.**

**A NULL DATE IS THEREFORE THE MARKER EVERY CONSUMER ALREADY NEEDS.** Anything that states sequence
in prose , the caption option on the trajectory, the partial-season note on the card , says
"then" only where `transfer_date IS NOT NULL`, and "and" otherwise. That is the rule the trajectory
demo already follows by hand.

**`transfer_date` IS `NOT NULL` TODAY**, so this is a second column whose nullability changes. Both
are one migration, and the before-capture is the whole table at 800 rows.

---

## 3. THE FALLBACK FOR THE REMAINDER , AND WHAT IT MAY NOT CLAIM

**The league-code branch is DELETED.** The lookup becomes `(api_player_id, season_year)` returning
a list, and the pair is matched on its two club names , which works for both kinds and makes the
league irrelevant to ordering, as it should be.

**When no row exists, the fallback is the one same-league pairs already use:**

1. **`appearances` descending**, then
2. **`card_id` ascending** , a unique tiebreak, so the order is stable across loads.

**ONE FALLBACK IN THE CODE RATHER THAN TWO.** It is deterministic, it is not league code, and it is
what the function does today once the league branch is gone, so the change removes a rule rather
than adding one.

**AND IT IS NOT A CLAIM ABOUT CHRONOLOGY , THAT IS THE POINT.** Most appearances first says who he
played more for, nothing else. On those 8 pairs the bars may still be in the wrong order, and the
only honest mitigation is that **nothing in the interface says they are in time order**: no "then",
no "moved", no date. The fallback decides a display order; `decided_by` and `transfer_date` decide
what may be said about it.

**A "best guess" fallback was considered and rejected.** Minutes, first appearance date, anything
derived from our own tables , none of them records when he arrived, and a plausible-looking guess
in the one place we cannot check is how the `top_assists` defect survived two months.

---

## 4. WHAT THIS DOES NOT COVER

- **The one three-card player-season.** Three clubs, two orderings, and the key admits it but the
  ladder above was measured on pairs only. It needs its own look before the run.
- **The same-league population.** Untouched , 800 rows, already correct.
- **The alias map** for the four Turkish club-name misses. Small, and it should be written down as
  a map rather than folded into the token matcher, so the next reader can see what was equated.
- **Whether the card's own season list changes order visibly.** Reordering a cross-league season
  changes what the season stepper walks and what the picker shows, on 614 seasons. It is a visible
  change to a live surface, so it wants a before-and-after and Lucas, exactly like any other.

---

## 5. ADDENDUM , THE THREE-CARD SEASONS. SCOPE ONLY, MEASURED 2026-09-24

Section 4 left "the one three-card player-season" as needing its own look. Measured against all
57,885 cards, **there are FOUR, and none has four**:

| player | season | cards | rows held |
|---|---|---|---|
| D. Drăguş | 2025/26 | Trabzonspor (TR) a6, Eyüpspor (TR) a12, Gaziantep FK (TR) a11 | `Trabzonspor -> Gaziantep FK` |
| F. Depaoli | 2020/21 | Atalanta (SA) a5, Benevento (SA) a15, Sampdoria (SA) a2 | `Sampdoria -> Benevento` |
| S. Posch | 2024/25 | Atalanta (SA) a5, Como (SA) a5, Bologna (SA) a14 | **none** |
| Unai Núñez | 2025/26 | Celta Vigo (LL) a4, Hellas Verona (SA) a17, Valencia (LL) a13 | `Celta Vigo -> Valencia` |

Three are one league throughout; Núñez is the only mixed one, two leagues across three cards.
**Posch holds none because his row was DELETED in the repair pass** , it carried a 2025/26 move on
a 2024/25 season, and one from-to row cannot order three clubs anyway.

### What they fall back to, and it is wrong on at least two

`orderSeasonRows` consults a transfer row only when `group.length === 2`, so **a three-card season
never reaches the evidence even when a row exists**. All four take the fallback, appearances
descending then `card_id`:

```
Drăguş      Eyüpspor a12   ->  Gaziantep FK a11  ->  Trabzonspor a6
Depaoli     Benevento a15  ->  Atalanta a5       ->  Sampdoria a2
Posch       Bologna a14    ->  Atalanta a5       ->  Como a5
Núñez       Hellas Verona a17 -> Valencia a13    ->  Celta Vigo a4
```

**Depaoli is exactly reversed.** The export holds `Sampdoria -> Atalanta 2020-10-02` and
`Sampdoria -> Benevento 2021-01-26`, so he went Sampdoria, then Atalanta, then Benevento, and the
chart draws Benevento first. **Drăguş is wrong too**: `Trabzonspor -> Eyüpspor 2025-07-18`,
`Eyüpspor -> Trabzonspor 2026-01-07`, `Trabzonspor -> Gaziantep FK 2026-01-08`.

**AND NOTHING SAYS SO.** There is no marker, no null date, no `decided_by` , the fallback is
indistinguishable from an ordered pair, which is the same shape as the league-code sort this scope
was written to remove.

### What it would take, and why it is not being done here

- **The schema already admits it.** The new key `(api_player_id, season_year, from_club, to_club)`
  holds two rows for one player-season, which is what a three-club season needs.
- **The ladder does not.** Every rung answers "which of these TWO came first". Ordering three
  clubs is a different question: it needs a sequence built from arrivals and departures, and the
  `group.length === 2` guard in `orderSeasonRows` would have to become a sort over several rows
  rather than a pairwise swap.
- **Four seasons, highest rt 62, nothing at rt 80 or above.** The whole population is in the tail,
  so this is a correctness item rather than a visible one.

### The sitting, as agreed , FOUR SEASONS, SO THE CANARY IS THE POPULATION

**1. THE GUARD BECOMES A SEQUENCE.** `orderSeasonRows` swaps a PAIR when a transfer row names both
clubs. For three cards it needs an ORDER over the group: build each club's arrival date from the
export the ladder already reads (a dated arrival, a dated departure from the club before it), sort
by it, and fall through to the existing appearances rule for any club the evidence cannot place.
**The pairwise swap stays for two-card seasons, untouched** , 796 same-league and 609 cross-league
pairs are verified on it and none of them may move.

**2. EVERY ORDERED THREE-CARD SEASON CARRIES `decided_by`.** That is the whole point of doing this
rather than leaving it: today the fallback is indistinguishable from an ordering, and after this it
must not be. A club placed from evidence carries its rung; a club left to the fallback carries
nothing, and **a season with any unplaced club is not an ordered season** and keeps the "say
nothing" treatment below.

**3. THE ROWS FIT THE TABLE ALREADY.** The key `(api_player_id, season_year, from_club, to_club)`
holds two rows for one player-season, which is what a three-club season needs. No DDL.

**4. THE CANARY IS ONE OF THE FOUR, AND THE POPULATION IS THE OTHER THREE.** Write one season's
rows, report the order it produces against the export, **prove the restore column by column**, then
the rest. At four seasons the canary is a third of the job, which is the right ratio for a change
that alters an ordering function three surfaces read.

**5. WHAT WOULD STOP IT.** A two-card pair moving, at all. A season ordered with a club the evidence
did not place. `decided_by` absent on any row written here. And the same control as last time: every
existing row re-derived through the changed function, unchanged.

**IN THE MEANTIME, NO SURFACE NAMES THEM , CONFIRMED, NOT ASSUMED.**
- **The trajectory axis labels a year holding EXACTLY TWO cards and leaves three unlabelled**
  (`renderTrajectory`, 2026-09-24). Verified on all four: Dragus, Depaoli, Posch 2024/25 and Nunez
  emit no club labels, while Semenyo's pair and Posch's OTHER season, a genuine two-card split,
  still do.
- **The Data Confidence note was already right** and needed no change: `partialSeasonNote` falls
  back to the undated form for three clubs and lists them **alphabetically**, which states no
  sequence. The dated wording is reached only when the group is a pair.
- **The A2 caption is a DEMO and carries the same constraint in writing**, so a decision taken from
  it cannot ship a caption that names three clubs in order.
- **The bars themselves still sit left to right and that is NOT fixed.** A time axis implies
  sequence by construction. What is fixed is the platform naming one.

**THE HONEST INTERIM IS TO SAY NOTHING RATHER THAN TO GUESS.** The order shown is the fallback's,
it is wrong on at least two of the four, and until the sequence work is done no surface should
state or imply that a three-card season is in time order , which is the same rule already written
for the four undated cross-league pairs.
