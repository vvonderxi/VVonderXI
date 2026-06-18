# VVonderXI — Card Contract v1

The canonical shape of one player-season card. Your design points at these slots; the wiring (adapter) fills them from a live `player_card_view` row. Tags and radar compute on the fly from the same row. No static snapshot, no inline DB.

When you paste the full architecture before going live, this contract stays fixed. I only map it onto your real function names, query layer and screen slots.

---

## 1. The card object (one player-season)

| UI slot | Source (player_card_view) | Notes |
|---|---|---|
| Player name | `player_name` | Surname as headline, full name on expand |
| Face / silhouette | `api_player_id` -> API-Football headshot | Member-gated toggle, ON by default; onerror falls back to the VV silhouette |
| Nationality flag | `nationality` | Via nat -> flag map |
| Club + colours | `team_name`, `primary_colour`, `secondary_colour`, `accent_colour` | Badge colours from the teams join |
| Season | `season` / `season_year` | 4-char key, e.g. `2425` renders "24/25" |
| League | `league_code`, `league_name`, `league_flag` | The 9-league scope only |
| Position | `position` (FWD/MID/DEF/GK) + CB/FB split | Tag bridge: FWD->ST, MID->CM, DEF->CB, GK->GK |
| Age | `season_age` | Use `season_age`, never `age` (age col is today's age) |
| VV Score + band | `rt` -> band | See section 2 |
| Output | `goals`, `assists` (`output`, `adj_output` available) | |
| Profile tags (max 3) | computed | See section 3, priority-ordered |
| Prestige badge | derived from band | See section 3, its own slot, never consumes a pill |
| Radar (5 spokes) | computed per-90 | See section 4 |
| Confidence dots | granular present? | X/5, see section 5 |
| Minutes / apps | `minutes`, `appearances` | Minutes drives Reliability and the 300-min floor |

---

## 2. VV Score -> band

Score = `rt`, the calibrated VV score (0-96; anchor 6.3, base 70, slope 17, clamp 50-96). **Engine is LOCKED**, no re-bake without explicit approval.

10-band ladder:

| Band | Range |
|---|---|
| S-Tier | 99 |
| Generational | 96-98 |
| Elite | 92-95 |
| World Class | 88-91 |
| Exceptional | 84-87 |
| Excellent | 80-83 |
| Very Good | 75-79 |
| Good | 70-74 |
| Okay | 60-69 |
| Poor | < 60 |

OPEN: the display may roll these 10 up to 5 bands (partial intent: S-Tier + Generational -> Elite, ... Okay + Poor -> Squad). Names not finalised. Resolve when wiring.

---

## 3. Tags (v1.1) — computed live off the row

Required inputs from the row: `minutes` + granular (`shots_on`, `passes_key`, `dribbles_success`, `passes_total`, `tackles_total`, `interceptions`, `duels_won`) + `goals`, `assists`, `rt`, `position`, `league`.

Gates:
- **300-minute floor.** Below it: no profile tags.
- **Granular wall (pre ~2015).** Null granular: no profile tags. Prestige badge + confidence dot only. Never exclude the row.
- Profile pills capped at **3**, priority-ordered (most specific identity first).

Profile tags (per-90 cutlines locked from the 56k gate):

| Tag | Pool | Rule | per-90 cutline |
|---|---|---|---|
| Goal Machine | FWD | Goal Threat top 10% | >= 1.01 |
| Creative Genius | FWD | Creation top 8% | >= 2.23 |
| Poacher | FWD | Goal Threat top 25% AND Creation <= p30 | >= 0.76 |
| Complete Forward | FWD | Goal Threat top 22% AND Creation >= p70 | >= 0.80 |
| Playmaker | MID | Creation top 10% | >= 2.20 |
| Scoring Midfielder | MID | Goal Threat top 12% | >= 0.49 |
| Box-to-Box | MID | Progression top 22% AND Defensive >= p70 | >= 2.27 |
| Defensive Monster | DEF | Defensive top 2% | >= 6.49 |
| Defensive Rock | DEF | Defensive top 12% | >= 4.94 |
| Dependable | DEF | Defensive top ~38% | pending (from gate) |
| Creative Defender | DEF | Creation top 10% | pending (from gate) |
| Ball Progressor | DEF | Progression top 10% | pending (from gate) |

Defender ladder (CB/FB pools): Dependable < Defensive Rock < Defensive Monster. Highest applicable only.

Prestige badge (separate slot, **bound to band, not rt**):
- Generational badge = Elite band and above
- Iconic badge = World Class band
- The old rt >= 85 fallback is DELETED.

Big Game Player: **parked** until a UCL field exists on the card (`ucl_apps` / `ucl_goals`), not `league = 'CL'`.

---

## 4. Radar — 5 spokes, per-90, percentile-within-position

| Spoke | Formula |
|---|---|
| Goal Threat | goals/90 + 0.3 x shots_on/90 |
| Creation | passes_key/90 + 0.5 x assists/90 |
| Progression | dribbles_success/90 + 0.02 x passes_total/90 |
| Defensive | tackles_total/90 + interceptions/90 + 0.1 x duels_won/90 |
| Reliability | min(100, minutes / (38 x 90) x 100) — raw availability, not a percentile |

Compare view overlays two players' radars.

---

## 5. Confidence dots

Modern era (granular populated) -> full dots. Pre-2015 granular wall (shots / key passes / tackles null) -> reduced dots. Carry the row honestly, never drop it. Surfaces in Compare and in the expanded card in My Locker Room.

---

## 6. Adapter direction (the wiring phase)

`player_card_view` row -> the card object in section 1. Built on the redesign branch, not the retired inline DB. The v1.1 tag rules and the radar maths live inside the adapter, reading the row's live fields. Comparisons self-cache: a pairing already in Supabase is served from the DB instead of re-firing the API or AI.

---

## Open items (resolve when architecture + gate numbers are in front of us)

1. The 5-band display rollup names.
2. The three defender cutlines marked "pending (from gate)".
3. The `api_player_id` -> headshot URL pattern, plus API-Football image terms.
4. UCL columns on the card for Big Game Player and the UCL Winner honour.
