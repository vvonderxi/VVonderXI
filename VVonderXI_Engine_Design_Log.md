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

---

## DECISION 4 , DEF_SIGNAL IS MODEST + DISCLOSED; TEAM-OUTCOME REJECTED (LOCKED, 2026-07-09, evidence-driven)

Executed Stage 0 (baseline snapshot) + Stage 1/1b (INSPECTION-only view columns, rt untouched: def90, defvol_pct, team_def90, def_share, def_share_pct, def90_pool_pct, duel_rate, duel_quality_pct , all within position_pool, 2016+). Read the signals against a real CB distribution (Dias, Saliba, van Dijk, Koulibaly, Maguire + journeymen). The findings overturn the optimistic parts of Decision 1.

**Finding 1 , the share-of-team-defending innovation (Decision 1.1) does NOT rescue van Dijk.** His def_share sits ~0.8-1.2 (he defends about his team's average, sometimes less); the journeyman Tarkowski sits 1.3-1.6 and stays above him. Liverpool's team def-volume is not actually suppressed enough to correct (team_def90 ~2.2-2.8 vs Burnley/Everton ~2.6-3.5). Share-adjustment is a real refinement but it is NOT the elite-defender rescue the design hoped for.

**Finding 2 , neither volume-share NOR duel-quality is a class discriminator.** Within the CB pool, sorted by duel quality: van Dijk 90th pct (right), but Maguire 87th and Tarkowski 83rd rank ABOVE elite Dias (69), Saliba (67), Koulibaly (44). Volume is worse (inverse to class , Dias 13, van Dijk 20 at the bottom; journeymen high). Root cause: the signals capture defender ARCHETYPE (ball-winner vs high-volume vs space-defender), not class, and class cuts across all archetypes. No blend of these two ingredients recovers CB class.

**Finding 3 , team-defensive-outcome (goals_against) is a TEAM property, not a player signal , CONFOUND-PROVEN.** Cross-sectionally GA/game separates the elites cleanly (Dias/Saliba/van Dijk/Koulibaly 0.91-1.03, gap to journeymen 1.34+), which is seductive. But it fails the confound test decisively: (a) within-player , van Dijk's Liverpool GA/g swings 0.58-1.39 season to season while his duel_rank holds 89-92; Maguire's GA/g halved (2.11 Hull -> ~1.0 Man Utd) purely by transferring to a richer club. (b) CLEANEST TEST , on mid/lower-table sides only (rank >= 8), elite/quality CBs average 1.57 GA/g (24 seasons) vs journeymen 1.51 (54 seasons) , indistinguishable, journeymen marginally better. Strip out the elite club and an elite CB's team defends no better than a journeyman's. Wiring goals_against would credit Maguire for Manchester United's wage bill. Decision 1.4's exclusion holds, now with proof.

**DECISION (Option A, locked):**
1. **def_signal stays a MODEST input** (volume-share + duel quality per Decision 1's blend), framed honestly as *defensive workload and ball-winning archetype*, NOT a verdict on defensive class. It correctly lifts genuine high-workload / ball-winning defenders; it does not adjudicate elite class and must not be weighted as if it does.
2. **Team goals_against / clean sheets REJECTED for individual scoring** (confound-proven this session; clean-sheet rate isn't in league_standings anyway). Revisiting remains a deliberate argued exception, never a default.
3. **The "van Dijk -> 85+" read-out target is RETIRED.** It is not reachable from aggregate defensive data without tuning toward one name (anchor-guardrail violation). Individual elite-CB class is largely INVISIBLE to our data; we DISCLOSE that (Decision 1.7 confidence dots + explainer: "we measure the defending you carried and the duels you won; positional/aerial/leadership value beyond that we acknowledge, we do not fabricate it"), rather than force it.
4. **Stage 2 is reframed:** "integrate a modest, disclosed def_signal into position-aware weighting (Decision 2)," NOT "find the magic defensive formula." The weights should keep def_signal's influence bounded and honest for CB/FB pools, since the signal is archetype/workload, not class.

**Also flagged (for Decision 2 weights):** Alexander-Arnold is a POOR dueler (3-27th pct within FB) with only mid volume , his greatness is entirely attacking. Decision 2's FB 30/70 out/def split would badly underrate attacking FBs; the FB (and Winger-as-FB) weighting needs output to carry more than a flat 70%-def share allows.

**Infra note:** DB now has `exec_sql(text)` (service-role) so migrations run from Node (service key), and a materialized `engine_def_inspect` table (snapshot of the inspection columns, rebuilt per stage) for fast engine reads. Migrations: `migrations/stage1_def_share.sql`, `migrations/stage1b_pool_scoped_def.sql`.
