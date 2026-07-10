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

---

## DECISION 5 , BAND LOCK + BEST-OF FOR DEFENSIVE POOLS (replaces Decision 2's fixed per-pool blend) (LOCKED, 2026-07-09)

**BAND LOCK (goals-primacy-protective):** solid regular CB ~73-76, peak CB ~83, van Dijk ~76; FB spans ~76 (defensive FB) to ~84-86 (peak attacking WB). Pitched deliberately LOW so a solid defender sits BELOW a genuinely productive attacker , scoring is the rarer, harder act, so the guardrail is built into the band, not left to the cap. van Dijk at 76 reads low to a fan; that trade is carried by the disclosure line + honours-as-context on the card, a conscious choice.

**def_signal bounding = FLOOR + capped LIFT, additive not multiplicative (Decision A implemented):** replaces the live `(0.55*defvol + 0.45*duelq)*93` multiplicative percentile->score. `def_core = FLOOR_pool + SPAN_pool * def_signal` (LEAST cap), where def_signal = 0.55*def_share_pct + 0.45*duel_quality_pct (pool-scoped, 55/45 volume/quality per Decision A). FLOOR/SPAN are POSITION-GATED (irreducible position-awareness): heavy for CB/FB/CDM (a competence floor , starting in a top league is itself elite among defenders), moderate for CM, ~zero-floor small-lift for ST/Winger/CAM (attackers live on output; a press bonus, never a floor , so a non-scoring forward is NOT lifted by defensive workload). The percentile MOVES you a few points within the pool band; it does not define the band.

**BEST-OF replaces Decision 2's fixed per-pool w_out/w_def blend (the key structural change):**
`core = GREATEST(output-with-gravity, bounded-def_core)` , each player scored on the job they actually do.
- WHY (recorded per Lucas): (1) it is a BETTER model, not just simpler , positions contain ARCHETYPES (attacking vs defensive FB), and best-of lets each player score on their strength, fixing the rigidity this session exposed. Proven on FB: a flat 30/70 out/def INVERTS the pool (Aurier 65.9, Wan-Bissaka 63.5 > Alexander-Arnold 49.3 > Robertson 33.2), and NO fixed ratio fixes it (at 60/40 Robertson 50.1 still < Aurier 59.5); best-of gives TAA 92, Hakimi 90, Robertson 73, defensive FBs 66-72 , a defensible ordering. (2) The attacking-FB defensive LIABILITY (TAA's ~31st-pct defending not dragging his score) is ACCEPTED in v1 and disclosed in Winter text ("electric going forward, exploitable behind"), NOT a score penalty , consistent with output-first (we do not dock strikers for not defending; rare production outweighs common competence). A small defensive-liability drag is a noted future refinement. (3) It ECHOES the live engine's existing `GREATEST(attack_term, def_term)` , not a foreign paradigm; Stage 2 just swaps the def side for the bounded floor+lift.
- CONSEQUENCE: the defensive pools no longer need per-pool `w_out/w_def` magic constants , `GREATEST(output-with-gravity, bounded-def)` does the position-aware work with FEWER dials (only the per-pool def FLOOR/SPAN/CAP), which is also less surface to tune toward a name.

**STAGE 2 = wire CB bounded-def + FB best-of. HARD SHIP GATE (cross-position read-out, Lucas-approved before live):**
(1) solid CB < a genuinely productive attacker; (2) 20-goal ST clear of any CB/FB; (3) Messi/Haaland/Ronaldo peaks UNCHANGED (structurally safe , defenders can't crack the top-12 b that anchors b95, but VERIFY); (4) if any defender floats above a comparable attacker, FLOOR/SPAN/CAP come DOWN before shipping. First rt change of the recalibration , Lucas approves the baseline diff before the matview refresh (ship).

---

## DECISION 6 , STAGE 2 SHIP CALIBRATION (LOCKED + SHIPPED 2026-07-10, evidence-driven across 4 attempts)

Ran 4 materialized attempts (engine_stage2_rt, live view untouched during testing) against the CB/FB distribution + cross-position gates. Final shipped calibration:

**def_core (bounded, additive, position-gated):** `def_core = FLOOR_pool + SPAN_pool * def_signal` (LEAST cap), def_signal = 0.55*def_share_pct + 0.45*duel_quality_pct (pool-scoped). Params: CB/FB/CDM FLOOR 44 / SPAN 22 / CAP 64; CM 32/24/60; ST/Winger/CAM = 12*def_signal (press bonus, NO floor). **core = GREATEST(output-with-gravity + boost, def_core)** (best-of).

**Defender output-rarity boost (NEW, Decision A's honest lift for van Dijk/TAA):** defensive pools only, added to the attack side: `boost = LEAST(12, 0.45 * gaw * wt^3.5)`. LEAGUE-SCALED via `wt^3.5` so weak-league output does NOT inflate. Verified: TAA 2019 (4+13, PL wt1.0) 83->85 (World Class), Grimaldo 2018 (4+11, Portugal wt0.845 -> 0.845^3.5=0.56) 77->79 (Accomplished, NOT elite) , 6 clear despite near-identical raw output. van Dijk (6 set-piece goals) 72->74; pure journeyman (Basham, ~0 output) unaffected by boost (his +9 is the def_core floor). Messi/Ronaldo/Haaland 97/96/94 UNCHANGED.

**The journey (why 70 not 76, recorded so it is never re-litigated):** Attempt 1 (FLOOR 56) gave van Dijk 76 but INVERTED goals-primacy (CB mean 63 > attacker means; pure-def FB 80 > 15-goal ST). Attempt 3 (raised ceiling) proved ~78-80 for elites is IMPOSSIBLE honestly , the ceiling filled with journeymen workhorses (Basham/Schindler/Wan-Bissaka at 79) while the acknowledged elites (van Dijk 76, Saliba 75, Dias) sat BELOW them, because their def_signal is genuinely mediocre (Decision A). Productive-winger hold-check: producers (Insigne 74, Diaz 76, etc.) held at 0 drift; the Winger pool-mean -3 is NON-producers losing an old inflated coarse-def prop (a correction). CONCLUSION: van Dijk's honest ceiling is ~70 (def) / ~74 (his output seasons); his class is carried by OUTPUT + honours + disclosure, NOT a fabricated defensive rt. Attempt 4 (Attempt-2 def_core + K=0.45 boost) = SHIPPED.

**BOUNDARY CASE ACCEPTED (Lucas):** TAA's PL 13-assist season (85) sits ABOVE a weak-league 20-goal season (Belgian, 81). This is correct LEAGUE-primacy (both league-adjusted; elite PL creation > 20 goals in Belgium), not a violation.

**### CRITICAL CAVEAT , PLACEHOLDER LEAGUE WEIGHTS ###**
Stage 2 ships on the FLAT PROVISIONAL league ladder (PL 1.00, Portugal 0.845, etc.) , the placeholder weights, NOT computed. Decision 3 (endogenous dynamic per-season league strength) is DESIGNED but NOT BUILT. So ALL of Stage 2's league-scaling , the TAA/Grimaldo separation, the wt^3.5 boost, the tilt , currently runs on provisional weights. **STAGE 3 = build dynamic league strength (the original launch-blocker).** When it lands, computed weights flow through the SAME `wt^3.5` socket + the tilt socket, and Stage 2's exact numbers will REFINE (TAA/Grimaldo/all league-scaled figures move). The method is refinable without touching the Stage-2 pipe , only the weight table swaps. Migration: migrations/stage2_bounded_def_bestof.sql.
