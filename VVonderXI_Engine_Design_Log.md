# VVonderXI , Engine Recalibration Design Log (Fable session)
*Running record of locked design decisions. Commit to repo + mirror key entries into CLAUDE.md so every chat knows the state. Newest at bottom.*

---

## DECISION 1 , THE DEFENSIVE SIGNAL (LOCKED, 2026-07-08)

**def_signal, computed within each position_pool, 2016+ window, one global distribution per pool across all 9 leagues** (league strength stays downstream in its own socket , no double-counting).

1. **Volume component , opportunity-adjusted (the key innovation):**
   player's per-90 defensive actions (tackles_total + interceptions + tackles_blocks) DIVIDED BY his team's per-90 defensive actions that season = his SHARE of the team's defensive work , then percentile within pool.
   - WHY: raw per-90 activity is opportunity-dependent (relegation CB makes 70 tackles because the ball lives in his third; van Dijk at dominant Liverpool makes 40 because it rarely visits his , measured ~5.2 vs ~2.5-3.2 per-90 for the SAME player, Southampton vs Liverpool). Share-of-team-work cancels the team context out of both cases.
   - This does NOT violate team-agnostic: it corrects the DENOMINATOR (like per-90 corrects for minutes), it does not credit team success. Aligned with industry possession-adjustment practice, done honestly within our data (team defensive volume = sum of own players' rows, plain SQL).
   - FALLBACK: where the team aggregate is unreliable (thin data), fall back to raw per-90 percentile + confidence dot.

2. **Quality component:** duel win rate (duels_won/duels_total), minimum ~50 duels floor (below floor: component drops out, signal = volume only). Percentile within pool. Opportunity-INDEPENDENT by construction , the complement to volume. Pool-scoping closes the attacker-inflation vector (attackers are not in the CB pool).

3. **Blend: 65% volume-share + 35% duel quality.** Constants in the view, tunable one at a time.

4. **Exclusions (explicit):** duels NEVER enter as volume. Fouls/cards out (referee noise). league_standings.goals_against OUT of v1 (team OUTCOME , crosses the team-agnostic line; revisiting it later = deliberate argued exception, never a default).

5. **Pools granular as-is:** CB / FB / CDM separate, never merged (different activity baselines). EVERY pool gets a def_signal (pressing winger ranks among wingers); how much it counts per position = Decision 2.

6. **Sum raw counts BEFORE percentiling, equal weights** (tackles+interceptions+blocks): no principled basis in aggregate data for differential weights (Graham P19 , no invented precision); percentile-per-stat-then-average would over-weight rare noisy blocks.

7. **Disclosure (Winter voice, product requirement):** activity stats under-credit the purest positional defenders (the tackle never needed). The quality term partially compensates; the residue is disclosed, not hidden. Pre-2016: no pools, no stats, no defensive scoring , confidence dots.

**PRODUCT REQUIREMENT (Lucas, locked):** the reasoning must be EXPLAINED in the product , the VV Index explainer / "Principles Behind the VV Score" page (Winter voice) must cover: share-of-team-defending (we do not count your tackles, we measure how much of the defending you carried), duel win rate (how often you won your battle), and why goals remain the peak currency. Every engine decision in this log needs its plain-language explainer line.

---

## DECISION 2 , POSITION-AWARE WEIGHTING + CEILING ARCHITECTURE (LOCKED, 2026-07-08)

Pipe unchanged (core -> 70/30 reliability -> league tilt). Core redefined as TWO LAYERS, each doing one job:

- **Layer 1 , pool performance ("judged among your kind"):**
  pool_perf = w_out * output-pct-within-pool + w_def * def_signal
- **Layer 2 , goals-primacy anchor:**
  core = w_abs * absolute-ga90-pct (all players) + (1 - w_abs) * pool_perf
  The absolute component is the anchor that keeps goals the peak currency; its WEIGHT varies by pool (heavy for attackers, light for defenders , they aren't crushed by a currency they don't trade in, but still feel its gravity).

**Starting constants (view-tunable, one at a time):**
| Pool | w_abs | pool_perf out/def |
| ST | .40 | 90/10 |
| Winger | .35 | 80/20 |
| CAM | .30 | 75/25 |
| CM | .25 | 55/45 |
| CDM | .20 | 30/70 |
| FB | .15 | 30/70 |
| CB | .15 | 20/80 |
| GK | unchanged until saves mapping (v1.2) |

**Ceiling = GRAVITY, not a cap:** peak CB maths to ~high-80s; a once-a-decade perfect defensive season can brush 92 (door heavy, not welded). 30-goal ST cores ~99 -> mid-90s. "Top band DOMINATED by attacking output," naturally rare rather than forbidden.

**Consequences (logged honestly):**
- Pre-2016 rows keep the output-only formula (no pools/def stats). Different formula by era , disclosed via confidence dots + explainer, never fabricated backwards.
- Kanté-type CMs rise on defensive share (45% def weight) with zero name-tuning.
- Read-outs to check AFTER implementation: van Dijk ~85+, Kanté high, journeyman CB mid, Messi/Haaland unchanged, Alexander-Arnold (elite output WITHIN FB pool).

## CONTROVERSIAL-TAKES REGISTER (product requirement , each needs a plain-language explainer on the VV Index page, Winter voice)
1. Share-of-team-defending: "we do not count your tackles, we measure how much of the defending you carried."
2. Duel win rate as the quality read: "how often you won your battle."
3. Goals-primacy gravity: "your score is anchored to the game's rarest currency, goals , then earned among your own kind, at your own job." Why a perfect CB season lands high-80s, not 95.
4. Era split: pre-2016 seasons scored output-only (data honesty), disclosed via confidence dots.
5. Positional-defender residue: activity + share still under-credit the tackle never needed , partially offset by duel rate, openly disclosed.
(Additions from Decision 3 below.)

## DECISION 3 , ENDOGENOUS LEAGUE STRENGTH (LOCKED, 2026-07-08)

**Replaces the UEFA-coefficient alternative entirely , our own data, our own point of view.**

- **Estimator:** player-as-own-control. Every mover with >=900 min on EACH side of a move, adjacent seasons: log-ratio of ga90 across the move = evidence of relative league difficulty. All observations solved together as ONE least-squares over the 9-league network (thin pairs connect through hubs), anchored PL = 1.00. Standard estimator family, plain SQL on raw columns.
- **Bias controls:** (1) AGING , age curve estimated from STAYERS (same-league season pairs by season_age) subtracted from each mover ratio; (2) SELECTION/MEAN-REVERSION , medians not means + both directions of the network cancel structurally; residue disclosed. (3) DEFENDER ASSUMPTION , strength measured through attacking output (the currency that travels); defenders INHERIT the weights. Disclosed on the register.
- **Dynamics:** strength(league, season) on a rolling +-2 season window , era-natural, noise-proof. Output data runs to 2010, so league strength covers FULL history (unlike the 2016+ defensive window).
- **Floors + fallback chain:** below observation floor -> league all-window estimate -> placeholder ladder last resort; confidence flag records the tier used.
- **Socket:** tilt formula 1-(1-weight)*0.5 UNTOUCHED; only the table feeding weight swaps (placeholder -> computed). Method refinable forever without touching the pipe.
- **Circularity guard (STRUCTURAL):** table computed ONLY from raw ga90 of movers + stayers age curve. Never reads rt/def_signal/percentiles. One-way flow: raw output -> league weights -> VV.
- **Distributions vs movers (Lucas Q, answered):** within-pool percentiles rank players WITHIN a context; only movers calibrate difficulty BETWEEN contexts (same player, both contexts). Percentile first, league tilt second.

**Register additions:** (6) "We measured league strength ourselves , hundreds of border-crossers, not a coefficient table." (7) "An Eredivisie 90 and a PL 85 are different currencies , here is how we know." (8) Defenders inherit attacker-measured league weights (assumption, disclosed).
