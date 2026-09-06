# UNK cleanup , 2026-08-21

`position_pool = 'UNK'` was a ninth value in a vocabulary that is supposed to be closed at
eight (GK, FB, CB, CDM, CM, CAM, Winger, ST). It came from the position importer's own
fallback, not from bad source data.

## Root cause, measured against live API-Football lineups

`classify()` / `derive()` ended `return 'UNK'` whenever `player.pos` was not G, D, M or F.
**The only unrecognised value is NULL** , roughly 2% of gridded starters in 2016-2019
(L1 2016 3/176, PRT 2016 4/176; 2020+ samples came back clean). Because the stored position
is the player's MODAL classification and these are fringe players (median 3 appearances),
the sentinel could WIN the vote. 164 of 194 remaining rows have UNK and nothing else.

Separately: **BPL 2016 returns no grid data at all** (176 of 176 starters skipped), which is
why Belgian coverage is thin before 2020.

## What was written

| file | cards | change |
|---|---|---|
| `01_pathA_gk.sql` | 27 | coarse GK -> pool GK. No judgement: a GK is a GK. |
| `02_pathB_inferred.sql` | 27 | pool inferred from the SAME player's other seasons, where unanimous. |

Both are guarded on `"position" = 'UNK'`, so a re-run is a no-op.

**HELD OUT of path B: api 91303, Djourou 1617.** Its single evidence season (1718 Antalyaspor,
FB) contradicts six seasons of centre-back at Arsenal, Hannover and Hamburg. Unanimity over one
season is not unanimity. Moved to path C.

## Result

- `player_positions` UNK rows: 248 -> 194
- cards with `position_pool = 'UNK'`: 125 -> 71
- rt changed on **111 of 57,234** cards; bands held at 12 / 150 / 650 (>=80 went 1412 -> 1411)
- **3 public band crossings**, all expected: cards leaving a 125-card junk bucket to be ranked
  against their real pool. Angel Rodriguez 1718 85 -> 82 and 1819 81 -> 74; one card 84 -> 85.

Snapshots are full-population per the section C rule , `before.csv`, `after_A.csv`, `after_B.csv`,
57,234 rows each, each written and read back off disk before being trusted. They are kept in this
directory but deliberately NOT committed, matching `migrations/combined_2026-08-21`, which kept its
`before_combined.csv` local too. 2.8 MB of snapshot per pass does not belong in the tree.

## Left open (section E)

Path C , 29 cards whose other seasons DISAGREE (Camavinga CM/CDM/CAM, Anguissa CAM/CM), plus
Djourou. Judgement calls, not research.
Path D , 41 cards with no other resolved season. None above rt 66, only two at rt>=60, so they
sit below where research demonstrably works. Belongs with the null-pool tail.
