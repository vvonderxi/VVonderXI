# Club-name resolution , reference for BAM

Generated 2026-09-16 from VVonderXI's live database, read-only. Three files beside this one.

## WHAT THIS IS AND IS NOT , READ THIS PART

**It is a head start and a list of known traps. It is not a drop-in.**

Our alias map's left-hand side is **our own `league_standings` table's vocabulary**, which stores
ASCII-folded club names, and its right-hand side is **our canonical card names**. Both sides are
ours. **BAM's club names come from somewhere else**, so no entry here will match BAM's input
verbatim. What transfers is the *shape* of the problem and the specific clubs that break.

Use `canonical_clubs.json` as the target vocabulary so BAM maps onto ours rather than inventing a
third. Two vocabularies can be reconciled; three cannot.

## FILES

| file | what it holds |
|---|---|
| `club_alias_map.json` | 33 aliases: 11 that ASCII folding resolves mechanically, 22 that needed adjudication. Every entry carries a confidence and a reason |
| `resolve_guard_blocklist.json` | the live disqualifier regex, the Wikidata sport check, and why the principled version was rejected at 29% false refusals |
| `canonical_clubs.json` | 331 club names as they appear on cards, plus the 337-row `teams` table with ids, short names and countries |

## THE TRAP YOU WILL HIT FIRST, AND IT IS NOT THE ONE WE WROTE DOWN

`DATA_DEFECTS.md` names **Mönchengladbach** as the danger: `Borussia Monchengladbach` supposedly
near-matches both `Borussia Mönchengladbach` and `Borussia Dortmund`, so an automatic near-match
would attach a whole squad to the wrong club.

**Measured against our vocabulary on 2026-09-16, that is not the sharpest case.** Unfolded,
Gladbach scores **0.9583** against itself and **0.5854** against Dortmund , a gap of 0.37. Fold
first and it matches **exactly**. The recorded warning is directionally right (a loose threshold
admits Dortmund) and it is not where a matcher actually fails.

**The real trap is `Verona`, and it fails confidently.** Ranked against all 331 of our club names:

```
1. 0.7692  Everton          <- wrong, different country
2. 0.6667  Girona           <- wrong, different country
3. 0.6316  Hellas Verona    <- CORRECT, ranked third
```

**Two clubs in two other countries outrank the right answer.** A top-1 fuzzy match sends Hellas
Verona's results to Everton, and nothing about the score looks suspicious.

**Fold before you match, and never accept a top-1 fuzzy match on a short club name.**

## THE CASES WHERE THE RIGHT ANSWER WINS BY ALMOST NOTHING

These are near-ties where the runner-up is a **genuinely different club**, so a threshold that
accepts the leader accepts the wrong club on the next input:

| standings name | correct | runner-up | gap |
|---|---|---|---|
| `Gazişehir Gaziantep` | Gaziantep FK | **Gaziantepspor** (different club) | 0.018 |
| `Osmanlıspor` | Ankaraspor (renamed) | İstanbulspor, Samsunspor | 0.027 |
| `Akhisar Belediye` | Akhisarspor | Arminia Bielefeld (Germany) | 0.034 |
| `Istanbul Basaksehir` | Başakşehir | İstanbulspor (different club) | 0.044 |

Turkish club names are the worst class: `-spor` is a shared suffix, so string distance is
dominated by a token that carries no identifying information.

## THREE THAT NEED FOOTBALL KNOWLEDGE, NOT STRING DISTANCE

No metric resolves these, because the strings were never close:

- **`Waasland-beveren` to `SK Beveren`** , renamed club.
- **`Osmanlıspor` to `Ankaraspor`** , same club, renamed.
- **`Verona` to `Hellas Verona`** , the league name omits the club's actual name.

`DATA_DEFECTS.md` says "three needed football knowledge" and then lists two. The third is
recorded there as unnamed; on this derivation `Verona` is the case that fits.

## OUR OWN VOCABULARY IS NOT CLEAN, AND THAT IS ON US

- **`Beerschot` and `Beerschot VA` both exist as card names**, 0.003 apart. One club, two entries.
  The alias for `Beerschot Wilrijk` is left **ambiguous** rather than guessed.
- **`Mersin İdman Yurdu` is unresolved.** The only candidate is `Mersin Talimyurdu SK` and the two
  names were not verified as the same club. Held rather than filled.
- **`Ankaragücü` and `Ankaraspor` are different clubs** and both are ours.
- Our `teams` table has **337** rows against **331** distinct card names, so the two are not
  one-to-one.

`CLAUDE.md` records the same canonicalisation gap separately for seven Premier League clubs that
split across long and short name variants in 2025/26. **There is no shared team-alias map in the
codebase**; this file is the closest thing that now exists, and it was derived for this export.

## HOW THE ALIAS MAP WAS DERIVED

338 distinct `league_standings.team_name` values against 331 distinct card `team_name` values.
305 match exactly. Of the 33 that do not: 11 resolve by unaccent-and-lowercase alone, and 22 were
adjudicated by hand and are marked `confirmed` (19), `likely` (1), `ambiguous` (1) or
`unresolved` (1). **A mapping was only marked confirmed where the target name was verified to
exist in our vocabulary**, not where it seemed plausible.
