# HALVED CARDS , SCOPE, MEASURED 2026-09-21. NOTHING BUILT, NOTHING WRITTEN.

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
   per split season, one per club, each honest on its own. **It reverses SS E's one-summed-card
   ruling and touches every consumer that assumes one card per player-season-league:** season
   navigation, the compare picker, the honours join, the filters, `card_id` as "the whole card
   state". It also doubles the rows a split player contributes to every percentile pool.
2. **One card, both halves SUMMED** , no schema change at all. This is what SS E already ruled and
   what `resolveSeasonStat()` already does when it sees both blocks; the failure is that the
   second block never arrived. The club shown is where most of the season was played, and the
   confidence field says the season was split. **Recommended.**
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
