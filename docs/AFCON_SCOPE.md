# AFCON AS AN HONOUR , **BUILT AND WRITTEN 2026-09-28.** Scope below, outcome first.

## WHAT SHIPPED, AND WHERE THE SCOPE WAS WRONG

**ALL EIGHT EDITIONS EXTRACTED , 8 of 8, 193 squad places.** The scope recorded 2010, 2013 and
2015 returning ZERO "on both template forms tried" and predicted "a real pass has to find out
what the remaining three use". They use a THIRD form, the older long-form
`{{National football squad player}}`, 23 rows each, and it names its fields exactly as the two
modern forms do , so `nameField()` needed no change at all and only the template alternation did.

**109 ROWS WRITTEN**, inside the scope's predicted 60 to 140, and beside what the platform already
holds: copa_winner 103, world_cup_winner 93, euro_winner 77. Per edition: 2010 **2**, 2012 **5**,
2013 **13**, 2015 **16**, 2017 **13**, 2019 **19**, 2021 **19**, 2023 **22**. Honours 804 to 913.
Record: `migrations/afcon_honours_2026-09-28/`, job `scripts/continental/fetch-afcon.js`.

**19 SQUAD PLACES WERE HELD AS AMBIGUOUS AND NEVER GUESSED**, which is the matcher working: Senegal
2021 carries TWO Gueyes, so the surname cannot resolve against our abbreviated names. The
nationality guard refused **0** of 107 players.

**THE NATIONALITY KEY IS AN ISO CODE, AND IT BOUGHT NOTHING ON THIS DATA , SAY SO RATHER THAN
CLAIM IT MATTERED.** `players` has no nationality id (checked against `pg_attribute`), so the code
is built: repair the mojibake (UTF-8 bytes read as Latin-1, exact and idempotent, control-tested
on five strings), fold, then map to alpha-3. It is the right key and it removes a real failure
mode , Ivory Coast is stored THREE ways and wins two of the eight editions. **Measured after the
run: every one of the 38 Ivory Coast matches is stored under the clean spelling, so the code
rescued ZERO rows.** The two mojibake players and the one `Ivory Coast` player are not in those
squads, or hold no card in those seasons.

**THE CARD NEEDED NO REFRESH.** The scope said rows "appear on cards the moment the view is
refreshed"; in fact `rowToCard`'s honour path queries the `honours` TABLE live by
`api_player_id`, so the 109 were on cards immediately. Only the filter flag `h_afcon_winner`
waits for a matview sitting, and the chip renders inert until then, by design.

**THE MARK COST SEVEN DRAWINGS AND THE MEASUREMENT CHOSE IT, NOT THE REASONING.** SEC C requires a
new mark to clear the closest pair already in the set. Four round-1 drawings reasoned from the
trophy family and ALL FAILED (0.466 to 0.627 against a floor of 0.681). What answered it was an
occupancy map of the shipped nine: the set packs the CENTRAL COLUMN and leaves the far edges and
extreme top and bottom nearly free, and every round-1 drawing had put its mass exactly where the
set already was. The shipped mark is edge-weighted and clears at **0.713 / 0.727** against floors
of **0.681 / 0.688** at 16px and 22px. A refinement that lowered its handles to get them further
from `ucl_winner` measured WORSE and was discarded. Harness: `_mark_pairscore.html`, checked in,
with a self-test that scores a mark against itself (0.000) and a solid box (0.434).

**FOUR HAND LISTS HAD TO BE VISITED, AND THE FOURTH WAS FOUND BY ITS OWN WARNING.** `HONOUR_META`,
the one-liner map and `HONOUR_DRURY` in `vv-core.js`; `HON_RANK` and **`HON_COPY`** in
`playbook.html`. The Playbook's own comment records that the last two honours reached five places
and not its dictionary, so it "quietly taught seven of nine" , this time the cell rendered, the
See-more button hid itself and the console said why. **It now teaches ten of ten.**

---

# THE SCOPE AS WRITTEN, 2026-09-26 , kept because its predictions are the record


Three questions were asked. All three are answered from measurement; the third has an answer that
changes when it can ship.

---

## 1. DOES THE SOURCE COVER AFCON SQUADS, AND WHICH EDITIONS?

**YES, ALL EIGHT EDITIONS IN THE CARD WINDOW, AND THE ARTICLES ARE SUBSTANTIAL.** Asked of the
Wikipedia API by existence rather than by searching for a phrasing, which is the distinction
SEC D records from the Portugal pass , a zero result is the same whether a page is unreachable or
absent.

| edition | winner | squads article | size |
|---|---|---|---|
| 2010 | Egypt | exists | 72 KB |
| 2012 | Zambia | exists | 67 KB |
| 2013 | Nigeria | exists | 87 KB |
| 2015 | Ivory Coast | exists | 90 KB |
| 2017 | Cameroon | exists | 86 KB |
| 2019 | Algeria | exists | 126 KB |
| 2021 | Senegal | exists | 165 KB |
| 2023 | Ivory Coast | exists | 148 KB |

**AND IT IS THE SAME SHAPE THE CONTINENTAL PASS ALREADY READS.** Sections are `===Country===` and
players are `{{nat fs ...}}` rows, the family the Euro and Copa squad pages use. The 180 rows the
platform already holds under `source = 'wikipedia_continental'` , 77 Euro and 103 Copa , came from
that same shape.

**THE EXTRACTION IS NOT UNIFORM ACROSS THE EIGHT AND THAT IS THE REAL COST.** Counted per winner
section: **2012 Zambia 23, 2017 Cameroon 23, 2019 Algeria 23, 2021 Senegal 28, 2023 Ivory Coast 27
, and 2010, 2013 and 2015 return ZERO on both template forms tried.** Those three are not empty
pages (72 to 90 KB each); they use markup neither probe knew.

**THAT COUNT WAS WRONG TWICE BEFORE IT WAS RIGHT, IN OPPOSITE DIRECTIONS, AND IT IS RECORDED AS A
COST RATHER THAN A DETAIL.** The first probe looked for `{{nat fs player}}` and returned 0 on all
eight; the second looked for `{{nat fs g player}}` and returned 0 on six. Recent articles use the
`g` form and older ones do not. **A real pass has to handle at least two markup forms and find out
what the remaining three use** , budget that, not "read the squad list".

**REALISTIC TOTAL: about 190 squad places** across the eight, taking the three unread editions at
the 23 the others of their era carry.

---

## 2. HOW MANY CARDS WOULD GAIN IT?

**UPPER BOUND, MEASURED: 249.** Cards we hold in the nine leagues, in the season the tournament
fell in, for a player of the winning nation:

```
  2010 Egypt         2      2017 Cameroon     30
  2012 Zambia        2      2019 Algeria      30
  2013 Nigeria      30      2021 Senegal      62
  2015 Ivory Coast  43      2023 Ivory Coast  50
```

**249 IS AN UPPER BOUND, NOT AN ESTIMATE.** It counts every card of that nationality that season,
not squad members. The honour attaches to the squad, so the real figure is the intersection of
about 190 squad places with the players who hold a card in one of our nine leagues that season.
**Expect the order of 60 to 140 rows**, which puts AFCON alongside what the platform already holds:
**euro_winner 77, copa_winner 103, world_cup_winner 93.**

**A DATA DEFECT FOUND WHILE MEASURING IT, LOGGED HERE BECAUSE IT WILL BITE THE PASS: `nationality`
CARRIES THREE SPELLINGS FOR ONE COUNTRY.** `Côte d'Ivoire` 172 players, **`CÃ´te d'Ivoire` 2 , a
mojibake double-encoding** , and `Ivory Coast` 1. Two of the eight editions are won by that
country, so a pass keyed on the nationality string alone silently loses three players. (18 of
15,316 players carry no nationality at all.)

---

## 3. DOES IT NEED A MATVIEW COLUMN?

**TO BE FILTERABLE, YES. TO APPEAR ON A CARD, NO , AND THAT SPLIT IS WHAT DECIDES WHEN IT SHIPS.**

`player_card_mv` carries nine `h_*` flags today: `h_ballon_dor, h_copa_winner, h_euro_winner,
h_golden_boot, h_league_champion, h_player_of_season, h_top_assists, h_ucl_winner,
h_world_cup_winner`. The filter rail reads those flags server-side, so an AFCON chip needs
`h_afcon_winner` beside them, **and a matview column means a DROP and CREATE , the matview's query
is frozen at creation, and the last sitting measured the outage at about 42 seconds.**

**BUT THE CARD DOES NOT READ A FLAG.** Honours reach a card through `honours_json`, which is built
from the `honours` table in the view, so **rows written for AFCON appear on cards the moment the
view is refreshed, with no schema change at all.**

**AND THE FILTER CHIP IS ALREADY SAFE WITHOUT THE COLUMN.** SEC C item 8 records that the chip list
is derived from `HONOUR_META` and that a type with no column renders as an inert `soon` chip rather
than an error , which is deliberate, because the chips teach the vocabulary before the data exists.
So the order is: write the rows, ship the card treatment, let the chip sit inert, and let
`h_afcon_winner` ride the next matview sitting with whatever else is queued.

**WHAT ELSE THE TYPE NEEDS, so the size is honest:** an entry in `HONOUR_META`, a **mark** in the
shared set, a one-liner and the Drury expansion. The mark is the part with a real bar , SEC C
requires a new mark to clear the closest pair already in the set, measured by rasterising every
pair at the sizes it ships at, and the set already holds two trophies that collided on their first
drawing.

---

## THE SIZE, IN ONE LINE

**About 190 squad places to read across eight articles in at least two markup forms, yielding an
expected 60 to 140 honour rows, which appear on cards with no schema change; one matview column
whenever the next sitting runs; one new mark that has to clear the set's own floor.** Nothing here
blocks the flip, and nothing here is urgent enough to hold it.
