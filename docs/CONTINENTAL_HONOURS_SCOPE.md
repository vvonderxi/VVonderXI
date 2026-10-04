# ITEM 15 , CONTINENTAL HONOURS: THE TWO QUESTIONS ANSWERED BEFORE ANY FETCHER (2026-09-14)

One tier below the World Cup, five confederations, dated to the year won, never attached to a
career. The design was already settled. **This is the part that had to be measured first.**

## 1. DOES THE SQUAD-NUMBER PIPELINE TRANSFER? MOSTLY YES, AND THE PAGE IS EASIER

**WHAT TRANSFERS UNCHANGED:** the Wikipedia fetch (`action=parse&prop=wikitext`), the STRICT
THREE-CLAUSE MATCHER, card-resolution-first, the append-only `written`/`held` ledgers with
per-batch stats, the reconciliation that asserts every unit lands in one ledger or the other,
and the zero-match guard.

**AND THE SOURCE IS BETTER SHAPED THAN THE CLUB PAGES WERE , VERIFIED, NOT ASSUMED.** A
tournament is **ONE canonical page** (`UEFA Euro 2012 squads`, 97,313 chars), nations are `===`
headings, and players sit in **`{{nat fs player}}` / `{{nat fs g player}}` TEMPLATES WITH NAMED
FIELDS**: `{{nat fs g player |no= 1|pos=GK |name=[[Iker Casillas]]|...}}`. That is structured
data, not an ad-hoc wiki table, so `byFields` is the natural extractor and the three positional
fallbacks are not needed.

**FIVE THINGS CHANGE, AND FOUR OF THEM MAKE IT SAFER:**
1. **THE CLUB GUARD DOES NOT APPLY AND MOSTLY IS NOT NEEDED.** `resolve-guard.js` answers "is
   this page about the club we asked for" from infobox, category and Wikidata P5138. A
   tournament page is about a tournament, and **the title is canonical**, so the RESOLUTION
   problem that cost the club job six wrong pages (women's sides, reserve teams, basketball)
   largely disappears. What replaces it is a cheap assertion: the winning nation's heading
   exists on the page, and the squad under it is 18 to 30 names.
2. **MULTI-BLOCK IS THE NORMAL CASE, NOT A DEFECT.** One page carries every nation, 16 to 24
   blocks. The squad-number extractor REFUSES multi-block pages , 200 club-seasons are held
   under exactly that reason. **Here the nation heading is the disambiguator and must be READ.**
   Porting the refusal would reject every page.
3. **THERE IS NO NUMBER TO EXTRACT.** The output is MEMBERSHIP, a boolean. So the duplicate
   number guard, the rank-table risk, the density dead end and the whole numeric-shape family
   are irrelevant. **The pipeline's most dangerous failure mode , writing a plausible wrong
   NUMBER , cannot occur here.**
4. **THE WRITE IS `honours` ROWS, NOT `player_positions`.** `{honour_type, season_year,
   api_player_id, player_name, source}`, exactly as the 93 `world_cup_winner` rows already are.
   No schema change, as already scoped.
5. **AND THERE IS A FREE IDENTITY GUARD THE CLUB JOB NEVER HAD.** Every match can be checked
   against `players.nationality`: a player matched inside Spain's block whose stored nationality
   is not Spain is a WRONG MATCH, detectable without any external source. The club job had no
   equivalent , it could only ever compare a name to a name.

**VOLUME IS TRIVIAL BY COMPARISON: 30 tournaments minus the dead ones, one page each, about 23
names per page , roughly 600 names, against 20,063 cards and 1,018 pages in the squad-number
job.** This is one sitting, not twenty-two batches.

## 2. CARD RESOLUTION FIRST , AND IT KILLS FOUR TOURNAMENTS OUTRIGHT

**THE RELIABLE MEASUREMENT IS THE POOL, BECAUSE IT INVOLVES NO NAME MATCHING AT ALL:** players
holding that nationality WITH a card in the tournament year or the season before. A 23-man
squad cannot resolve beyond it however good the fetcher is.

| confederation | pools per tournament | verdict |
|---|---|---|
| UEFA | 227, 278, 376, 447 | every squad fully resolvable |
| CONMEBOL | 24, 25, 53, 101, 102, 342 | all resolvable, Chile's two are tight |
| CAF | 0, 2, 3, 37, 41, 45, 82, **0** | three tournaments near-useless |
| AFC | 0, 0, 13, 15 | **half the confederation is dead** |
| CONCACAF | 10, 12, 17, 18, 18, 20, 37, 39 | thin but never zero |

**FOUR TOURNAMENTS CANNOT PRODUCE A SINGLE ROW: Ivory Coast 2015, Ivory Coast 2023, Qatar 2019,
Qatar 2023.** Not one player of that nationality holds a card in our nine leagues in that window.
**That is the top_assists lesson applied before any effort was spent: a league-season whose
leader has no card is CLOSED, not held**, and here it is knowable from one query per tournament.
**Egypt 2010 (2) and Zambia 2012 (3) are effectively dead too** , a 23-man squad yielding two rows
is not an honour anybody will meet on a card.

**THE PRECEDENT SAYS ELITE SQUADS RESOLVE ALMOST ENTIRELY.** `world_cup_winner` holds **93 rows:
23, 22, 23, 25** against squads of 23, 23, 23 and 26. So 96 to 100% of a World Cup winning squad
holds a card here. **DO NOT READ THE 100% CARD-RESOLUTION RATE OF THOSE 93 ROWS AS A RESOLUTION
RATE** , they were only ever WRITTEN for players who resolve, which is the selection bias this
project has now recorded three times. The per-tournament COUNT is the honest figure.

**AND MY OWN SCOPING MATCHER PRODUCED FALSE MISSES, WHICH IS ITSELF THE ARGUMENT FOR PORTING THE
STRICT ONE.** A crude "last word of the name" surname match reported Spain 2012 at 87%, missing
`Pedro (footballer, born 1987)` and `Xavi (footballer, born 1980)` , the disambiguated Wikipedia
title makes the surname `1987)`. It reported **Senegal 2021 at 0% against a pool of 82**, on a
database holding **859 Senegal cards with K. Koulibaly and I. Gueye in plain sight**. **Neither
number is a finding about the data; both are findings about the matcher.** The three-clause rule
from the squad-number job exists precisely for this and must be ported before any yield is quoted.

## THE RECOMMENDATION

**Euro and Copa América only, ten tournaments, and drop the other twenty.** UEFA and CONMEBOL are
~80% of the reachable cards and their squads resolve almost completely. CAF, AFC and CONCACAF are
twenty tournaments for a combined ceiling near 1,000 cards, of which four tournaments are
provably zero and two more are under five. **That is Lucas's call, not mine, and it is now a call
with numbers under it rather than an impression.**

**WHEN IT IS BUILT IT NEEDS A PLAYBOOK ENTRY IN THE SAME COMMIT** , the Honours section is the
dictionary, and a tag with no definition is a tag nobody can read.
