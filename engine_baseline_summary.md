# Engine Baseline Snapshot , Summary (Stage 0)

Current rt shape BEFORE the engine recalibration (Decisions 1-3, see VVonderXI_Engine_Design_Log.md). Source: `player_card_mv`, 56454 player-seasons. Full per-row baseline: `engine_baseline_snapshot.csv` (diff every later stage against it).

## Per-pool rt distribution

| pool | count | mean | p50 | p90 | max |
|---|---|---|---|---|---|
| ST | 5736 | 58.5 | 58 | 82 | 97 |
| Winger | 4406 | 54.4 | 54 | 76 | 96 |
| CAM | 1794 | 55.4 | 54 | 80 | 91 |
| CM | 5773 | 52.3 | 53 | 71 | 90 |
| CDM | 2567 | 51.3 | 52 | 68 | 87 |
| FB | 4167 | 47.1 | 48 | 63 | 84 |
| CB | 6813 | 46.7 | 48 | 62 | 82 |
| GK | 2135 | 58.1 | 63 | 75 | 75 |
| (null/pre-2016) | 19971 | 42.1 | 43 | 67 | 87 |

> CB (mean ~46.7) sits ~12 pts below ST (mean ~58.5) , the defensive-blindness Decision 1+2 corrects. Target after recalibration: CB/FB means rise; ST/Winger peaks unchanged.

## Read-out names , current rt (validate every stage against these)

| read-out | pool | current rt |
|---|---|---|
| van Dijk (CB seasons) , TARGET ~85+ | CB | 2017:44 2018:71 2021:65 2022:65 2023:63 2024:64 2025:72 |
| Kanté (N'Golo) , TARGET high | CM/CDM/CAM | 2015:64 2016:61 2017:60 2018:69 2019:55 2020:NR 2021:65 2022:NR 2025:51 |
| Journeyman CB (Tarkowski) , TARGET stay mid | CB | 2018:64 2020:60 2021:63 2022:62 2023:59 2024:61 2025:66 |
| Alexander-Arnold , elite WITHIN FB pool | FB | 2017:53 2018:80 2019:83 2020:75 2021:81 2022:78 2023:73 2024:76 2025:62 |
| Messi PEAK , unchanged | ST | 2011:97 |
| Ronaldo PEAK , unchanged | Winger | 2014:96 |
| Haaland PEAK , unchanged | ST | 2022:94 |

> WRINKLE (flagged, deferred): van Dijk/Tarkowski/TAA flip FB<->CB across seasons (residual position-accuracy tail, separate from the CM-bug). van Dijk validation uses his CB seasons; the FB/CB tail is a candidate for the position pass before the defensive within-pool percentile goes live.
