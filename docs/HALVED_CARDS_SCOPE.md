# HALVED CARDS , SCOPE. NOTHING BUILT, NOTHING WRITTEN.

**[RE-SCOPED FOR SPLIT, 2026-09-21. THE FIRST VERSION MEASURED SUMMING AND SAID SO ONLY IN
PASSING.] THE DECISION IS ONE CARD PER CLUB.** Everything under "a)" below (the count, the
source, Semenyo) holds unchanged. **Section c) and e) as first written describe the SUMMED
shape and are superseded by the SPLIT sections at the end of this file** , they are kept
because the contrast is the argument: summing moves far more of the platform than splitting
does, which is the opposite of what it looks like from the outside.

**The defect:** a player who moves between two clubs INSIDE one league has two blocks of a season
at the provider and one row here, because `player_season_cards` carries
`UNIQUE (api_player_id, season, league_code)`. The second block is refused, so the card holds one
club's share and says nothing about it. **Semenyo 25/26 is the named case:** Bournemouth 1,798
minutes and 10 goals on the card, against 3,200 and 17 across Bournemouth and Manchester City.

---

## a) THE REAL COUNT , 1,740 CARDS, AGAINST THE DETECTOR'S 841, AND THEY BARELY OVERLAP

Source: `exports/bam/player/2026-09-17T18-16-35/transfers.csv`, the BAM export. 203,997 rows,
**151,557 after de-duplication** (the file repeats rows; a count taken without deduping is wrong).

Filter: a transfer dated in December, January or February, seasons 2010 to 2025, where BOTH clubs
map to the SAME one of our nine leagues (club to league via the nine `names_<slug>.csv` maps).

| | |
|---|---|
| same-league mid-season moves | **4,752** (4,638 distinct player-season-league) |
| of those, **a card exists** | **1,740** |
| no card at all | 2,898 |
| **pre-2016, which the old detector can NEVER see** | **724** |
| also flagged by `pos_row_appearances > appearances` | **306** |
| **carded, and the detector is blind to them** | **1,434** |

**The old detector flags 841 and only 306 of those are in this list.** The two instruments are
not measuring the same thing and neither is a superset: the detector fires on appearance-count
gaps that are often play-off rounds or lineup-data artefacts (SS E records 364 of its 841 at a gap
of 1 to 2, where an adjacent-club-change proxy runs at 49% against a 34% baseline), while the
transfer log knows about moves on cards the detector cannot examine at all.

**By league:** SA 973, PL 864, TR 633, LL 532, ERE 519, PRT 379, L1 350, BPL 257, BL 245.
**By season** it is flat at 200 to 350 a year, with 2025 highest at 423.

**WHAT 1,740 IS NOT.** It is "a card exists for a player who moved mid-season within one league",
not "this card is provably short". On a 28-card sample checked against the provider, **24 return
two distinct clubs and 19 are genuinely short** (68% of the sample, 79% of the two-club rows). The
rest had a second club with almost no minutes, or the card already covers the whole season.
**So the honest figure is ~1,700 candidates of which roughly two thirds are real**, and the exact
population is knowable only by asking the provider per card , which is one call each.

## b) SEMENYO, CONFIRMED IN THE SOURCE

`19281,A. Semenyo,Bournemouth,Manchester City,2026-01-08,Transfer` , mid-season, same league,
season 2025. Present, dated, and duplicated in the file, which is why the de-duplication above
is not optional.

## c) THE MIGRATION , THREE SHAPES, AND THE RECOMMENDED ONE NEEDS NO SCHEMA CHANGE

1. **`team_id` in the key** , `UNIQUE (api_player_id, season, league_code, team_id)`. Two cards
   per split season, one per club, each honest on its own. **[THIS IS THE CHOSEN SHAPE , see the
   SPLIT re-scope at the end of this file, where the consumer list below is answered surface by
   surface and the rt impact is re-measured.]** **It reverses SS E's one-summed-card
   ruling and touches every consumer that assumes one card per player-season-league:** season
   navigation, the compare picker, the honours join, the filters, `card_id` as "the whole card
   state". It also doubles the rows a split player contributes to every percentile pool.
2. **One card, both halves SUMMED** , no schema change at all. This is what SS E already ruled and
   what `resolveSeasonStat()` already does when it sees both blocks; the failure is that the
   second block never arrived. The club shown is where most of the season was played, and the
   confidence field says the season was split. **[WAS "Recommended" , SUPERSEDED 2026-09-21.
   REJECTED: a summed card still puts one club's badge, colours and shirt number on output from
   two, and Semenyo's Manchester City season still does not exist.]**
3. **A separate spell table** , `player_season_spells (player, season, league, club, minutes,
   goals, ...)`, the card stays summed and the spells carry the per-club breakdown for display.
   This is the only shape that can answer "what did he do at each club" without changing the card
   contract. **Worth having later; not required for the repair.**

## d) THE RE-INGEST , ABOUT 1,700 CALLS, AND WHAT CANNOT BE REPAIRED

- **One call per candidate card:** `/players?id=<api_player_id>&season=<season_year>` returns
  every block for that player-season, so the whole population is **~1,740 calls**, against a
  75,000/day Ultra allowance. It is not a full re-import (5,089 page calls) and must not become
  one: `import-players.js` in default mode rewrites all ~57,000 rows.
- **DEDUPE BY TEAM BEFORE SUMMING.** The provider returns duplicate blocks for one club on some
  rows, and a naive sum doubles that club , I hit exactly this on the first pass of the sample
  and the numbers looked plausible (1,594 to 3,188). Keep one block per `team.id`.
- **Cards that do not return per-club blocks:** measured twice, **15 of 18** and **24 of 28**
  return two distinct clubs, so roughly **one in seven cannot be repaired from this source**.
  Those stay exactly as they are and take the disclosure instead. **That is the honest ceiling,
  and it must be stated wherever the repair's coverage is described.**

## e) WHAT MOVES , MEASURED, NOT ARGUED

Run offline through the checked-in engine re-transcription (`scripts/separability/rt_reimpl.js`,
99.56% exact against stored rt), over the WHOLE population, twice, and diffed. Nothing written.

**Repairing NINETEEN cards moved 201 cards' rt.**

| | |
|---|---|
| repaired cards that moved | 16 of 19 |
| **untouched cards that moved** | **185** |
| median absolute delta on a repaired card | **9 points** |
| largest | **+16** |
| band crossings | **12, of which 10 are on cards nobody touched** |

Semenyo 80 to 87, Standout to World Class. Piatek 2018 SA 80 to 90, Standout to Iconic. Bruun
Larsen 2024 BL 46 to 62. And ten untouched cards crossed a band edge, mostly 80 to 79, because
every repaired card re-ranks its percentile pool , SS C's ripple rule, at scale.

**Extrapolating: ~1,700 repairs will move thousands of cards and cross bands well beyond the
repaired set.** This is a platform-wide rescore, not a patch to 1,700 rows.

**ONE LIMITATION, STATED RATHER THAN GLOSSED:** the simulation summed minutes, goals, assists and
penalties. It did NOT recompute `def_share`, which divides a player's defensive output by ONE
club's team totals and has no correct value for a summed season. That is the same open question
SS E records for the four fused cards, and it is unresolved for this repair too.

## f) RECOMMENDATION , DO IT BEFORE THE FLIP, AND NOT IN LAUNCH WEEK

**Yes, before.** Three reasons, in order:

1. **After the flip, these numbers are published.** A rescore that moves thousands of cards and
   crosses band edges is invisible now and a correction notice later. The platform's own rule is
   that a score is a claim; changing the claim under a reader is the expensive version.
2. **The caches are keyed on rt.** `verdict_cache` invalidates on `rt_a`/`rt_b` and the notes on
   `stats_hash`, so the repair discards a large slice of both. Doing it now costs regeneration
   nobody sees; doing it later costs it while people are reading.
3. **It is measurable offline, today.** The dry run above cost no writes and no quota, and the
   before/after capture is the same shape as the matview sitting that already ran.

**But not as part of the launch sequence.** It is its own sitting, with a full before/after
snapshot, the three embedded snapshots regenerated in the same pass (`RADAR_POOL_REF`, the keeper
ladder, the index figures), and the QA items that depend on rt re-run afterwards. **If it cannot
have its own sitting before the flip, the right call is to ship with the disclosure and repair
after** , the disclosure is honest, and a rushed rescore is not.

**Do not hand-edit.** A manual fix hits the same unique constraint the importer does, and the
source is a script away.

---

# SPLIT , THE RE-SCOPE, 2026-09-21

**WHAT I MEASURED FIRST AND WHAT IT WAS.** The 80 to 87 on Semenyo was ONE card given 3,200
minutes and 17 goals from two clubs. That is the fused shape, and it leaves Bournemouth's badge,
colours and shirt number on output from two clubs , the worse shape SS C already records, and
still no Manchester City season. **The `def_share` caveat in the sum section is about that
summed card, not about split.**

## 1) THE MIGRATION , THE COLUMN IS ALREADY THERE

**`player_season_cards` ALREADY CARRIES `team_id`, `league_id` and `team_name`.** The change is
the constraint alone: `UNIQUE (api_player_id, season, league_code)` becomes
`UNIQUE (api_player_id, season, league_code, team_id)`. No column is added and no row is
rewritten; the repair INSERTS the missing half.

**AND `def_share` IS NOT STORED , IT IS COMPUTED IN THE VIEW**, from a `team_def` CTE that
aggregates each club's defensive totals. **So a correctly written half gets its OWN defensive
share automatically at the next refresh**, provided `team_id` and `team_name` are right. That
matters, because the simulation below shows what happens when it is missing.

**WHAT EVERY SURFACE THAT ASSUMES ONE CARD PER PLAYER-SEASON-LEAGUE DOES WITH TWO:**

| surface | what happens | needs work? |
|---|---|---|
| **card page season list** | two rows for one year, and the sub line ALREADY reads `club · pos · age · G · A`, so they read "25/26 · Bournemouth" and "25/26 · Manchester City" | **no code change**; the repeated year is a visual judgement |
| **compare picker** | same renderer, same outcome | no |
| **season navigation** (`seqGo`, `switchSeason`) | walks `card_id`, which stays the key , SS C's "`card_id` IS the player-season key" is unaffected | no |
| **rankings** | a split player contributes TWO rows to one season. **The `range()` pagination rule already demands a unique tiebreak** (SS C), so this is a pre-existing requirement, not a new one | check the tiebreak |
| **percentile pools** | gain roughly 1,200 scored halves, which is the ripple measured below | no code |
| **honours** | the table is keyed `(honour_type, season_year, league_code, team_name, api_player_id)`. **A TEAM honour carries `team_name`, so it lands on the correct half by construction.** An INDIVIDUAL honour (Golden Boot, Ballon d'Or, Top Assists) is season-level and has no club , it would attach to both halves, or to neither, or to the club where most of the season was played. **This is the one real design question and it is named here rather than answered** |
| **the Cabinet** | reads honours, so it follows whatever that decision is | follows |
| **published counts** | "57,055 seasons" grows by the number of halves written | figures regenerate |

## 2) rt MOVEMENT FOR SPLIT , RE-MEASURED, SAME 19, SAME METHOD

The existing card keeps its own stats and a NEW card is added for the other club, so the pools
GAIN members rather than members changing value. Whole population, twice, nothing written.

| | split | (sum, for contrast) |
|---|---|---|
| existing cards whose rt moved | **73** | 201 |
| of which the 19 originals | **0** | 16 |
| **band crossings** | **0** | 12 |

**SPLIT IS THE GENTLER OPERATION ON THE EXISTING PLATFORM, AND THAT IS NOT THE INTUITION.**
Summing rewrites 19 scores and pushes ten untouched cards across band edges; splitting leaves
every existing score where it is and moves 73 cards by percentile pressure alone, crossing
nothing. **The 19 originals do not move at all.**

**The new halves score on their own minutes, which is the point:** Semenyo's Manchester City
half is **71** beside his Bournemouth **80**. Piatek's two halves are 80 and 80. Ranocchia's
second half is 55 against a kept 45.

**THE DEFENSIVE-SHARE VARIANT, AND WHY IT IS A MODELLING ARTEFACT RATHER THAN A RISK.** Run with
the new half carrying NO `def_share`, defenders collapse , Rose 61 to **21**, Ballo-Toure 64 to
**38** , because the defensive FLOOR is lost. **That cannot happen in the real repair**, since
the view derives `def_share` per club. It is recorded because it is exactly what a half written
with a wrong or missing `team_id` would look like, and it would look like a scoring bug.

## 3) THE 300-MINUTE FLOOR , A QUARTER OF THE HALVES ARRIVE UNSCORED

**5 of the 19 halves fall under 300 minutes** and are therefore not scored at all: Walker-Peters
242, Bernat 245, Rabiot 198, Rony Lopes 115, Bruun Larsen 2019 64. **Extrapolated, roughly 450
of ~1,700 halves.**

The short one is almost always the SECOND half , the January arrival , so the card that appears
is the one with less football on it. Those cards exist, carry NR rather than a score, and join
the 3,061 cards that already have a null rt. **That is the honest outcome and it is not a
failure: a 198-minute spell is not a season, and the alternative is a score built on nothing.**

## 4) A SEASON-TOTAL LINE , YES, AND IT NEEDS NO NEW DATA

**Recommended.** Split makes every field on the card true and loses the campaign: two cards of
1,798 and 1,402 minutes never say 3,200. The sibling is joinable on
`(api_player_id, season, league_code)`, so the line is derivable on the card page with no new
column and no second query beyond the seasons already loaded.

Wording, so it states a fact rather than implying a score: *"Across the season: 37 appearances,
17 goals at two clubs. Each card scores the club it names."* **It must NOT present a combined
rt** , there is no such number, and inventing one re-creates the fused card in prose.

## 5) TELLING A REAL SPLIT FROM A FALSE ONE , A PRECONDITION, NOT A HEURISTIC

One in three candidates is not genuinely halved, and **writing a false split is worse than
leaving a real one**: it invents a season that did not happen. Every write is therefore gated on
the provider's own answer for that exact card, checked in this order:

1. **Fetch** `/players?id=<api_player_id>&season=<season_year>`, one call.
2. **Keep only blocks for that league id**, then **DEDUPE BY `team.id`** , the provider returns
   duplicate blocks for one club on some rows, and a naive sum doubles it. I hit this on the
   first pass and the numbers looked entirely plausible (1,594 to 3,188).
3. **Require two or more DISTINCT teams.** One team means there was no split; skip.
4. **Require the stored card to match exactly ONE block's minutes, not the sum.** If it already
   equals the sum, the card is ALREADY fused and must not be split , that is SS E's four fused
   cards, and splitting them would be a second wrong answer.
5. **Require the missing block to have at least one appearance.** A zero-minute spell is a
   transfer, not a season.
6. Anything failing any gate is **logged and skipped**, never guessed.

**The ledger is append-only and names the source block for every row written**, the same shape
as the squad-number backfill, so a bad write is findable per row rather than by re-running the
whole job.
