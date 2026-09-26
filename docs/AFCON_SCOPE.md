# AFCON AS AN HONOUR , SCOPE ONLY. NOTHING BUILT, NOTHING WRITTEN. 2026-09-26

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
