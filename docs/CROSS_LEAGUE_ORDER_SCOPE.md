# CROSS-LEAGUE SEASON ORDER , SCOPE ONLY. NOTHING BUILT, NOTHING WRITTEN.

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
