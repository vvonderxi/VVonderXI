# BAM export , coverage and status

Generated 2026-09-17 from API-Football's league catalogue. **Regenerate with
`node scripts/bam/check-coverage.js`; do not edit the numbers by hand.**

## STATUS: NOT YET DELIVERED

`exports/bam/` currently contains this `reference/` directory and **no match data**.
Thirteen leagues had been exported and were lost to an error on our side , the completed
files were cleared before a re-pull was confirmed possible, and the API-Football
subscription lapsed in between. **Nothing is lost permanently**: one run restores all
fourteen leagues, roughly 31,000 calls and about 80 minutes, once the subscription is live.

Run `node scripts/bam/check-coverage.js` at any time for the true state. It reports 0 of 14
today and will report gaps per league once data exists.

## THE FOURTEEN LEAGUES

| slug | API id | first season the API holds | our floor | seasons expected | shots from |
|---|---|---|---|---|---|
| `england-league-one` | 41 | 2011/12 | 2014/15 | 13 | 2015/16 |
| `england-league-two` | 42 | 2011/12 | 2014/15 | 13 | 2017/18 |
| `england-national-league` | 43 | 2011/12 | 2014/15 | 13 | **no shots, ever** |
| `eredivisie` | 88 | 2010/11 | 2010/11 | 17 | 2015/16 |
| `ekstraklasa` | 106 | 2018/19 | 2018/19 | 9 | 2018/19 |
| `bulgaria-first-league` | 172 | 2018/19 | 2018/19 | 9 | 2018/19 |
| `scotland-premiership` | 179 | 2010/11 | 2014/15 | 13 | 2015/16 |
| `greece-super-league` | 197 | 2011/12 | 2014/15 | 13 | 2016/17 |
| `austria-bundesliga` | 218 | 2011/12 | 2014/15 | 13 | 2015/16 |
| `cyprus-first-division` | 318 | 2018/19 | 2018/19 | 9 | 2018/19 |
| `armenia-premier-league` | 342 | 2012/13 | 2014/15 | 13 | **no shots, ever** |
| `czech-liga` | 345 | 2018/19 | 2018/19 | 9 | 2019/20 |
| `slovenia-prvaliga` | 373 | 2018/19 | 2018/19 | 9 | 2019/20 |
| `israel-ligat-haal` | 383 | 2016/17 | 2016/17 | 11 | 2021/22 |

## TWO THINGS GENUINELY ABSENT, NOT MERELY OLD

**`armenia-premier-league` (342) and `england-national-league` (43) have NO fixture
statistics in ANY season.** `HS`, `AS`, `HST` and `AST` will be empty on every row, in
every year, permanently. That is the API, not a gap in the pull, and no re-run changes it.
Both leagues still carry full results , dates, clubs, full-time and half-time scores.

**`HxG` and `AxG` are empty on every row of every league.** API-Football does not serve
expected goals on this plan , probed on Eredivisie, the Premier League and La Liga: sixteen
statistic types, none of them xG. The columns are kept so BAM's reader does not change, and
they are **not** derived from shots. A proxy BAM computes is BAM's model; a number we
invented under an xG heading would be ours wearing BAM's name.

## THE SHOTS BOUNDARY IS FIRST-APPEARANCE, NOT COMPLETENESS

The column above says when shots first appear. **It does not mean every season after it is
fully covered.** Measured on Eredivisie: the flag says 2015/16, and actual per-match
coverage ran **58%, 54%, 53%, 53%** across 2015-2018, reaching 100% only from **2019/20**.

**Read the measured figure, not the flag.** Every `meta_<SEASON>.json` carries
`shots_coverage.rows_with_shots` against `rows_total`. Fitting a shots-based model on a
season that is half covered will quietly weight it wrong.

## A SEASON WITH NO FIXTURES IS THREE DIFFERENT THINGS, AND ONLY ONE IS A DEFECT

If a season's file carries no fixtures, `check-coverage.js` classifies it rather than
reporting a blank, because the three causes need different responses and only one is ours:

| classification | meaning | is it a defect? |
|---|---|---|
| `NOT_PUBLISHED` | the season exists, its fixture list is not out yet | no , expected before kickoff |
| `NOT_STARTED` | the API holds the season and returns nothing for it | no , a fact about the source |
| `DROPPED` | the API returned rows and our export wrote none | **yes , ours to fix** |

Each `meta_<SEASON>.json` records **`api_results`**, the count the provider returned, beside
the number of rows written. That is what makes the third case provable instead of inferred:
without it, an empty season is ambiguous between "the API had none" and "we lost them", and
a league BAM cannot price would look identical to a league that has not started.

**No season is currently classified**, because no export exists. The check reports
`0 of 14 leagues exported` and will classify every zero-fixture season on the first run.

## FILE FORMAT

Per league, per season: `<slug>_<SEASON>.csv` and `meta_<SEASON>.json`, plus
`names_<slug>.csv` and `manifest.json`.

Columns, in order:

```
Date,HomeTeam,AwayTeam,FTHG,FTAG,HTHG,HTAG,HS,AS,HST,AST,HxG,AxG
```

- `Date` is `DD/MM/YYYY` from the UTC kickoff.
- **Every listed fixture is a row, played or not.** An unplayed fixture carries its date and
  both clubs and leaves every score and shot column **empty** , never `0`. A zero is a
  result; an empty cell is not.
- `HTHG`/`HTAG` come from the same response as the full-time score. No extra call.
- Counts, the through-date and the missing-fixture flag live in `meta_<SEASON>.json`, never
  as rows inside the CSV.

## THE CLUB-NAME CHECK

A fixture list naming clubs differently from the results splits a club's rating with nothing
failing. Every season's meta carries `club_names`: the played and unplayed name counts, any
name appearing in only one set, and a `match` boolean. Verified on Eredivisie 2026/27 before
the format was settled , 18 clubs on both sides, zero asymmetry, because both sets come from
the same response.

`reference/canonical_clubs.json` holds our club vocabulary to map against, and
`reference/club_alias_map.json` the 33 aliases we derived, with the traps named , `Verona`
fuzzy-matches `Everton` above the correct `Hellas Verona`.

## MISSING VERSUS NOT YET PLAYED

`missing_count` in each meta means: listed, kicked off, no result returned, and no stated
reason. A future date is not-yet-played and is never flagged. A postponement or cancellation
is reported under its own name , Eredivisie 2019/20 carries 74 `CANC` fixtures, the season
abandoned to COVID.

**The limit:** it compares results against the returned fixture list, which is the only
fixture source. A match never listed cannot be detected. The round census in each meta is
the independent check, and it is regular-season only.
