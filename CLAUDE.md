# VVonderXI , MASTER SOURCE OF TRUTH (read this FIRST, every session, in full)

**This is the ONE reference point.** If any other document, memory, or assumption conflicts with this file, THIS FILE WINS. When you are unsure about anything , a decision, a convention, the state of the work , the answer is here. Do not re-derive decisions already recorded here. Do not trust a summary of this file; read the file.

**First actions, every session:**
1. Read this whole file.
2. Read the PROGRESS graphic (below) to orient on where the project stands.
3. Confirm the load-bearing invariants (§C) back to Lucas before proposing anything.
4. Check the SESSION LOG (§F) for what the last few sessions did.
5. Verify against LIVE code/DB before editing , docs drift, including this one. Distinguish "verified live this session" from "recorded in this doc."
6. At session END: append a SESSION LOG entry (§F) and update the PROGRESS graphic. A session that changes state but doesn't log it has failed the next chat.

Why this file exists: this project has suffered from too many documents and no clear reference point , chats rediscovering settled decisions, contradicting each other, losing work. This file is the fix. It is authoritative, current, and self-maintaining. Keep it that way.

---

## A. PROGRESS (update the bars every session)

```
=== VVONDERXI LAUNCH PROGRESS ===
Data quality   █████████████████░  ~95%   honours 629 live + NR-assist fill (71 rt>=85 done, matview refreshed); tail NR queued (194 rt80-84, 1184 rt75-79); goals-provenance audit open
Tags           ██████░░░░░░░░░░░░  ~35%   honours family COMPLETE + all bugs fixed, live cross-surface (card/rankings/mobile, rows priority-capped); profile + prestige + playbook audit remain
Compare        ███████████████░░░  ~85%   spine + accolades + story + season picker (foldable, #108 collapse) + device-split card reveal (desktop 360 3D flip / mobile scale-swap, prestige-tier VV coin) + above-fold Compare CTA (#111) + token-AND search all LIVE; C8 position filter + final polish + merge remain
Card editorial ██████████░░░░░░░░  ~55%   Glance/Scout/Notes/Profile-blurb/Data-Confidence/Wonder-Tags WIRED; K4 Proof + K5 VV-line trajectory + honours strip UI remain
Hygiene        ███░░░░░░░░░░░░░░░  ~20%   key rotation, meta, logo, QA outstanding; HYGIENE_BACKLOG_2026-07-05 (13 items) logged
Engine         ████████████████░░  ~90%   Stages 0-4 done+live (def recalib + best-of + output boost + computed league strength + CDM-mislabel cleanup); radar percentile parked; recalibration COMPLETE, remaining ideas post-launch/optional
Merge          ░░░░░░░░░░░░░░░░░░    0%    redesign-compare -> vvonderxi_BIGGER
```
LAUNCH = tags + Compare + card editorial + hygiene + merge. **Data quality is a supporting layer, NOT a blocker** , launch bar is "top band clean + tail honestly flagged via confidence dots", not 100% of 56k cards. The seductive trap is endless data-polish while Compare stays hardcoded. After honours, the center of gravity MUST shift from data to the tag->Compare product spine.

Bar legend: each block ~5.5%. Update honestly , overstating progress hurts the next chat.

---

## B. HOW LUCAS WORKS (apply every session)

- **Solo non-coder founder.** Voice-to-text input , read for INTENT, not literal transcription (typos/run-ons are normal).
- **Wants:** decisions and options FIRST, concise, no essays. Tappable/numbered choices when picking between options. ONE pasteable block at a time. Tell him EXACTLY what to paste and WHERE (Supabase SQL editor / Claude Code / Terminal C) , he is not technical, so "here's the SQL, paste it in Supabase" beats "run a query to check X". When giving steps, give the literal command, labelled with its destination.
- **Think like a senior engineer + statistician + architect.** Be decisive, don't flip-flop, don't hedge. Flag the better option and say why. Don't drag , if stuck or confused, READ THE LIVE FILES / THIS DOC rather than guessing or looping.
- **Two-terminal discipline (STRICT):** Claude Code (Terminal A) = edits/SQL/commits, NEVER pushes. Terminal C (plain) = reads/verify/push. Lucas pushes himself, always. Label every command's terminal.
- **Demo-first:** on any multi-option design choice, show it before building. Pick once, build once.
- **Honesty standard:** explicit when something is genuinely incomplete vs done. Recommend the best path, don't conservatively hedge. Own mistakes plainly, no grovelling.
- Lucas is a separate instance from the terminals , he pastes Terminal C output and query results back into chat.
- No em/en dashes anywhere (spaced comma). NR for missing data, never 0.

---

## C. LOCKED INVARIANTS (never re-derive; contradicting these = the chat is wrong)

**Safety/workflow**
- Branch `redesign-compare`. Production `vvonderxi_BIGGER` NEVER touched directly. First command each session, Terminal C: `git log --oneline -4`.
- View/engine changes via Supabase SQL editor: `pg_get_viewdef` -> edit only target lines -> `create or replace view` -> `refresh materialized view player_card_mv`. NEVER hand-retype engine SQL. **ALWAYS build view edits from a FRESH pg_get_viewdef, never the repo `new_view.sql` copy , it has drifted repeatedly.** `create or replace view` can only APPEND columns; preserve column order.
- Byte-verify edits in Terminal C before commit. `node --check` FAILS on .html. Stage named files only, never `git add .`.

**Stack**
- Supabase project `krqthvroetbxgnvwwjar`. View `player_card_view` (holds the whole VV engine). Matview `player_card_mv` (site reads this) , REFRESH after every data/view change. SQL editor caps display at 100 rows. Vercel serverless terminates after res.json() (writes before response).

**Engine / bands**
- `bandFor` (vv-core.js) emits 9 internal bands; PUBLIC ladder = top 4 named + 1 grouped. Public labels are DISPLAY renames: engine "Exceptional" shows as "Standout"; grouped lower field shows as "Accomplished". Do not collapse the 9.
- Band thresholds (recut to recalibrated scale, live): Generational 95, Elite 90, World Class 85, Standout(=Exceptional) 80. Lower internal bands unchanged. NO Generational output gate exists , rarity is guaranteed by the output-first scale (can't reach 95 without elite output). Two coupled threshold places: bandFor + ladder display numbers (vvindex.html, playbook.html).
- **Top-of-scale cap LIVE:** no card scores 100. Top piecewise segment compressed 95-100 -> 95-97 (else-line 2.0 not 5.0). Messi 11/12 = 97 (ceiling). Pantheon clusters as peers 95-97; ties allowed.
- Two prestige badges only: Generational badge = Generational band; Iconic = Elite band. S-Tier retired.
- **ANCHOR GUARDRAIL:** bands/scores derive from LIVE top-N anchors, never hardcoded, never tuned until a famous name lands where wanted. Famous names are a READ-OUT (validity check), never a DIAL. Greatness = density in the elite band, not any single #1.
- GK capped at 75 (pending keeper-stats). Defenders scored in own pool; disclose via confidence, don't fake.
- **Defensive data + engine recalibration (Phase 2) , SOURCE OF TRUTH (finding 5 Jul):** defensive data EXISTS in the DB, NO external sourcing needed. Fields on `player_card_view` + `player_season_cards`: `tackles_total, tackles_blocks, interceptions, duels_total, duels_won`; `league_standings.goals_against` = team defensive record. Coverage 2015-2025 ≈ 85-95% populated; pre-2015 ≈ 0% (API-Football stats start ~2015). Validated: van Dijk (CB) high tackles/interceptions vs Messi/Haaland low , data separates defenders from attackers correctly.
- **Recalibration MUST add a defensive dimension** (Phase 2, after data-lock, alongside dynamic league strength) so defensive players get equal treatment: scored on tackles+interceptions+blocks PER-90, ranked WITHIN position pool (percentile). Target: van Dijk peak ≈ 85+ (sanity exhibit , a READ-OUT, not a dial; anchor guardrail holds). Duels = SECONDARY only (attackers rack them up, not defender-specific). Pre-2015 gap disclosed via confidence dots. Position-aware weighting integrates the defensive score with attacking output + league strength. SUPERSEDES the interim "GK capped 75 / defenders in own pool, disclose don't fake" stopgap once built.
- **DATA BUG (flag for data-accuracy/position pass):** `age` column = CURRENT age (van Dijk shows 34 on every season row) , use `season_age` for per-season age. May relate to the Lukaku position issue.
- **Engine recalibration DESIGN LOCKED (2026-07-08, Fable session) , full detail in `VVonderXI_Engine_Design_Log.md` (repo root, authoritative).** 4 decisions: (1) DEFENSIVE SIGNAL = SHARE-of-team-defending (opportunity-adjusted volume , player's per-90 defensive actions / team's per-90, percentile within pool; corrects the denominator like per-90 corrects for minutes, stays team-agnostic , refines the "raw per-90" note above) + duel-win-rate quality; (2) position-aware weighting + goals-primacy gravity; (3) ENDOGENOUS league strength with a circularity guard; (4) 6-stage implementation order. NEXT EXECUTABLE = Stage 0/1 (snapshot + ingredients-only view columns). Design done. **UPDATE 2026-07-09 (Decision 4/Option A, LOCKED, evidence-driven , see design log + §F):** Stage 0/1/1b EXECUTED (inspection columns only, rt UNTOUCHED). The share-of-team-defending innovation does NOT rescue van Dijk; NEITHER volume-share NOR duel-quality discriminates CB class (they capture archetype); team goals_against is a TEAM property (confound-proven , elite CBs on mid sides 1.57 GA/g vs journeymen 1.51). SO: def_signal stays a MODEST, DISCLOSED input (workload/archetype, not a class verdict); goals_against REJECTED for individual scoring; "van Dijk 85+" target RETIRED (disclose, don't fabricate). Stage 2 = integrate a bounded def_signal into position-aware weighting, NOT "find the magic formula." **UPDATE 2026-07-10 (DECISION 6, SHIPPED):** Stage 2 LIVE , bounded def_core + best-of + league-scaled defender output boost (LEAST(12,0.45*gaw*wt^3.5)). van Dijk ~70/74, TAA 85, Grimaldo 79, peaks unchanged, CB mean 46.7->~56. **UPDATE 2026-07-10 (DECISION 7, SHIPPED): league weights now COMPUTED (Stage 3 built + live) , placeholder ladder retired.** Endogenous league strength from mover least-squares (scoring-env-corrected, alpha=0.5), anchored PL=1.00, in engine_league_weights. Sockets re-tuned for the spread range (tilt 0.5->0.35, boost exp 3.5->2.5). Peaks held (Messi 97), weak leagues settle ~1-3 lower, Grimaldo Benfica22 78->71. Migration migrations/stage3_league_strength.sql. Engine Stages 0-3 done + live.

**Search (two separate paths, no shared code)**
- rankings.html queries matview directly; Compare/api uses RPC `search_players`. Any matching/normalization change goes to BOTH. Normalization: `regexp_replace(lower(unaccent(coalesce(full_name,name))), '[^a-z0-9 ]','','g')`.

**Position system (LOCKED 8 buckets)**
- Every card resolves to exactly one of: **GK, FB, CB, CDM, CM, CAM, Winger, ST**. No LW/RW split.
- Map: RB/LB/wing-back->FB; DM->CDM; central mid->CM; AM/true #10 orchestrator->CAM; RW/LW/wide-forward->Winger; ST/CF/second-striker->ST. Ambiguous forward: goal-scoring->ST, wide->Winger, orchestrating->CAM; judge by role played MOST that season.
- shirt_number + position live in `player_positions` (PK: api_player_id, season_year, league_code; position + shirt_number nullable). NO pre-2016 rows exist -> pre-2016 needs INSERT (guarded), not UPDATE. Card reads pp.position (via position_pool), falls back to coarse psc.position (DEF/MID/FWD/GK) when no pp row.
- API-Football's auto-imported positions have a SYSTEMATIC bug: attacking mids + wingers dumped into "CM" (De Bruyne, Mbeumo, Bruno, Palmer, Pepe, Olise). Trust Transfermarkt/CCC-verified data OVER the auto-map.

**Honours = a TAG family (tier: Prestige -> Honours -> Performance)**
- Season honour tags (6): League Champion (ONE reused tag, team-season lookup), UCL Winner, Ballon d'Or, Golden Boot, Top Assists, Player of the Season.
- Player-LEVEL accolades (career context for Commentator's Notes + verdicts, NOT season tags): World Cup Winner, etc.
- Excluded from season tags: domestic cups. Data is table-shaped (Wikipedia), ~500-800 rows. Build as first piece of tag validation.

**Provenance**
- Assists = FBref domestic-league. Shirt+position = Transfermarkt. Don't mix within a field.

---

## D. CURRENT STATE / ACTIVE TASK

**Active:** Standout (rt80-84) sweep DONE , 250 classified, 249 positions + 7 assists written, REVIEW queue cleared, known_players.csv dictionary at 248. Honours Tier-1 WRITTEN (314 rows, first tag family live). MATVIEW REFRESH PENDING for the position/assist writes (paste `REFRESH MATERIALIZED VIEW player_card_mv;` in Supabase SQL editor; honours needs no refresh). Open threads: goals-provenance audit (Euro goals may inflate rt), data-fix team_name (181398 Aydin, 108547 Onyekuru), prior top-150 shirt+assist sweep.

**Then:** honours Tier-2 -> TAG VALIDATION + card/Compare wiring -> Compare -> card editorial -> hygiene -> merge.

---

## E. BACKLOG / HORIZON (not launch-blockers unless marked)

- **LAUNCH-BLOCKERS:** tag validation; Compare build; card.html editorial (Proof/Wonder Tags/Notes); API-Football key rotation (exposed); og/meta + social image; contact-form endpoint (errors); OAuth published; 390px QA; merge to vvonderxi_BIGGER.
- **Quality (not blockers):** GOALS-PROVENANCE audit , some cards' `goals` include European-competition goals but the engine is domestic-only (confirmed Vanaken x5 + Mboyo, figures match all-comps totals); could inflate rt for Euro-competition clubs; audit vs domestic-only source. DATA-FIX team_name: 181398 Aydin (Alanyaspor not Fenerbahce 23/24), 108547 Onyekuru (not Arsenal, HELD). DB-wide "CM" bug tail below rt80 , fix at scale via known_players.csv dictionary (built this session, no CCC needed for known players); ~18k coarse-position tail (v2 script); shirt/position tail below rt85; Ibra 15/16 ordering wrinkle (47.1 output at 94, tier-map not monotonic at top seam , engine session); rankings A-Z sort bug; result-cap raise (250-500, "showing X of Y"); Data Confidence expandable panel; season-switcher; card hero text overflow.
- **Post-launch:** accounts/Locker (waitlist now); language toggle EN/NL/FR.

---

## F. SESSION LOG (append-only; newest at top; NEVER rewrite past entries)

Each session appends: date | chat/task | what was done | status | anything the next chat must know.

### 2026-07-14 | Stage 4 EXECUTED: CDM position-mislabel cleanup (61 attackers reclassified out of CDM) , design log Stage-4
- SHIPPED + LIVE (matview refreshed, verified vs player_card_mv): 61 rows / 45 players reclassified out of the CDM pool (50->Winger, 9->ST, 2->CAM) , clear wide-attackers/forwards the API had dumped in CDM (Perišić, Quaresma, Robben, Mahrez, Lucas Moura, Kalou, Eljero Elia, Varela, Gürler, Garry Rodrigues, El Ghazi + obscure wingers; NB Di María/Coutinho/Fàbregas were Bucket-C output-only and were NOT touched , kept CDM). Guarded UPDATE on player_positions (.eq(position,'CDM') guard => nothing else touchable); 61/61 correct, 0 skipped, 0 errors. Dictionary known_players.csv +61 rows source=cdm-mislabel (now 1878).
- SCOPE = Option 1 "clear attackers only" (Lucas-approved). Flagging reproduced the design-log numbers exactly (CDM regulars 2152, output>=Q3 47). Of 121 flagged (81 coarse=FWD + 40 output-only): kept ONLY the coarse=FWD clear attackers WITH in-DB attacking corroboration (an attacking-pool season elsewhere OR real ga90). EXCLUDED: all 40 Bucket-C output-only deep-playmakers/registas (kept CDM), the coarse=FWD false-positives (Jobe Bellingham/Amiri/Jakić/Aursnes = central mids mis-tagged FWD; Sergio Gómez = FB; Gerhardt = CM), and 5 obscure single-CDM-season names with NO in-DB corroboration (Susaeta/Torje/Jantscher/D.Larsson/Lazarević , name-recognition only; principle: don't assert what data can't support, and their ~0 ga90 means the boost shed is negligible so leaving them CDM costs nothing).
- ###KEY FINDING , corrects the design log's "~1-2" rt estimate### actual mean delta -5.3, range 0 to -31, 0 cards inflated. The real inflator was NOT the output-rarity boost (~1-2) but the CDM def_core FLOOR (~44-51) propping ZERO-output wingers at a defender's competence baseline. Removing the floor (attacking pools have no floor, only output) drops non-producers to honest value (Usami 0g/436min 51->20; Frei 0g 47->22) while REAL scorers are unchanged (Benavente 9g, Pedro Henrique 9g = delta 0). 13 flat / 35 small (-1..-9) / 13 large (-10..-31). Correct behaviour, larger than billed.
- GENUINE CDMs verified UNTOUCHED on matview: Rodri (86), Çalhanoğlu@Inter 2021/23/25 (85/85/81), Pjanić (81), Veerman (81), Banega (80), Sneijder (80). The Çalhanoğlu@Inter->CDM lock held (design log listed him as a mislabel; CLAUDE.md master wins , kept CDM).
- ###OPEN QUESTION (disclosed, not oversight)### the SAME def_core floor still props the ~40 Bucket-C deep-playmakers we deliberately left in CDM (Eriksen's Spurs 88/89 seasons, Fàbregas-deep, etc.). Defensible for genuine registas + consistent with the Çalhanoğlu lock, so NOT reclassified. Flag if deep-playmaker treatment is ever revisited.
- Pipeline (all scripts/enrichment/, dry-run-first, reproducible): cdm_flag.js (flag+modal) -> cdm_adjudicate.js (career-pool dump) -> cdm_build_plan.js (hand-verified archetype map, writes cdm_reclass_plan.csv + cdm_dropped.csv) -> cdm_write.js --write (guarded UPDATE + rt baseline cdm_rt_before.csv) -> cdm_verify.js. Rollback = re-UPDATE the 61 back to CDM (baseline preserved in cdm_rt_before.csv/known_players.csv).
- ENGINE TRACK: Stages 0-4 done + live. NEXT = pivot back to launch/Compare track (Stage 4 was optional data-hygiene, not a launch blocker).

### 2026-07-10 | Stage 3 SHIPPED: endogenous league strength , computed weights replace placeholders (design log DECISION 7)
- BUILT + LIVE: league weights now COMPUTED from our own data (Decision 3), placeholder flat ladder RETIRED. Method: 980 age-adjusted MOVER observations (>=900 min each side of an adjacent-season cross-league move), weighted least-squares over the 9-league network anchored PL=1.00, medians per edge, rolling +-2 window, age curve from ~21.7k stayer pairs. Circularity-safe: reads ONLY raw g+a per 90 + league scoring rate, never rt. Weights: engine_league_weights (144 rows), engine_league_weights.csv. Scripts: scripts/engine/league_strength.js + league_strength_v2.js (--load).
- SCORING-ENV CORRECTION (alpha=0.5): raw ga90 read high-scoring leagues (BL/ERE) as weak (style confound , BL below Ligue 1). Fix: normalize output by league scoring rate ga90/env^alpha. alpha=0.5 locked after inspecting raw/0.5/0.65/1.0 (full over-corrects BL>LL; 0.65 reshuffles top without fixing residuals; 0.5 lifts BL into top-4 cluster, PL/LL/SA clean top). The 2 residual soft spots (BL~L1 2020, TR~L1 2016) don't move with alpha => genuine era mover-data, not the confound, disclosed not engineered.
- SOCKET RE-TUNE (fit sockets to spread weights, does not distort ladder): placeholder was compressed (0.76-0.98), computed is spread (0.51-1.0) => tilt (1-(1-wt)*0.5) + boost wt^3.5 over-swung (weak stars -13). Re-tuned tilt 0.5->0.35, boost exp 3.5->2.5 => whole-league-star drops fell to ~-5/-7; PL unaffected (wt=1 tilt=identity).
- SHIP DIFF (gated, approved, verified 0 mismatches before refresh): 67% move, mean -1.14. PRT -3.1/ERE -2.1/BL -1.7/LL -1.3/L1 -1.1/BPL -1.0/SA -0.4/PL 0/TR 0. Peaks HELD (Messi 97, Ronaldo 96, Haaland 94->95, TAA 85->86, van Dijk 74). Grimaldo Benfica22 -7 (78->71), BL seasons -1/-2, separation intact. Elite weak-league scorers barely move (Gyokeres 39g PRT 91) = accepted output-first behavior.
- Migration: migrations/stage3_league_strength.sql. Rollback: migrations/stage3_ROLLBACK_prev_view.sql. NEW baseline: engine_baseline_stage3 (Stage-4 ref; Stage-0/2 preserved). Diff scripts: scripts/engine/stage3_diff.js.
- ENGINE TRACK STATUS: Stages 0-3 done + live (def recalibration + best-of + output boost + computed league strength). rt is now the fully recalibrated engine. Remaining engine ideas (post-launch/optional): dribbles_past re-ingest (defensive signal, not in DB), radar percentile, GK saves mapping. NEXT could be Stage 4 (if any) OR pivot back to the launch/Compare track.

### 2026-07-10 | Stage 2 SHIPPED: bounded-def + best-of + league-scaled defender output boost (FIRST live rt change) , design log DECISION 6
- SHIPPED calibration (4 attempts, materialized/gated before live): def_core = FLOOR_pool + SPAN_pool*def_signal (LEAST cap), position-gated , CB/FB/CDM 44/22/64, CM 32/24/60, ST/Winger/CAM = 12*def_signal (press bonus, no floor). core = GREATEST(output-with-gravity + boost, def_core). def_signal = 0.55*def_share_pct + 0.45*duel_quality_pct (pool-scoped).
- DEFENDER OUTPUT-RARITY BOOST (defensive pools only, added to attack side): boost = LEAST(12, 0.45*gaw*wt^3.5), LEAGUE-SCALED. TAA 2019 (4+13 PL) 83->85; Grimaldo 2018 (4+11 Portugal wt0.845) 77->79 (6 clear via wt^3.5=0.56); van Dijk 72->74 (set-piece output); journeymen unaffected by boost. Messi/Ronaldo/Haaland 97/96/94 UNCHANGED.
- KEY OUTCOME: van Dijk's honest ceiling is ~70 (def) / ~74 (output seasons), NOT 76 , Attempt 3 proved raising the ceiling fills it with journeymen workhorses (Basham/Schindler 79) not elites; elites' def_signal is genuinely mediocre (Decision A). van Dijk's class = output + honours + disclosure, never a fabricated defensive rt. Boundary case ACCEPTED: TAA PL 85 > weak-league 20-goal ST 81 = correct league-primacy.
- Per-pool rt shift: CB 46.7->~56, FB 47.1->~56, CDM 51->~58, CM 52->~55; ST/Winger/CAM ~unchanged (non-producers -3 = losing an old inflated coarse-def prop, a correction); GK 0.
- ###CRITICAL### Stage 2 runs on PLACEHOLDER (flat provisional) league weights (PL 1.00, Portugal 0.845...). Decision 3 dynamic league strength is DESIGNED, NOT BUILT. All league-scaling (TAA/Grimaldo, wt^3.5 boost, tilt) is provisional. STAGE 3 = build dynamic league strength (original launch-blocker); computed weights flow through the same wt^3.5 + tilt sockets and Stage 2 numbers REFINE. Migration: migrations/stage2_bounded_def_bestof.sql. Infra: engine_stage2_rt/diff materialized tables + exec_sql helper. NEXT after ship: re-snapshot engine_baseline_snapshot as the new Stage-3 reference.

### 2026-07-09 (cont.) | Stage 2 design locked: BAND + BEST-OF for defensive pools (design log DECISION 5)
- BAND LOCK (goals-primacy-protective, Lucas pitched low): solid CB ~73-76, peak ~83, van Dijk ~76; FB ~76 (defensive) to ~84-86 (peak attacking WB). Low so a solid defender sits BELOW a productive attacker; van Dijk-76-reads-low carried by disclosure + honours context.
- BOUNDING: def_core = FLOOR_pool + SPAN_pool*def_signal (LEAST cap), ADDITIVE not multiplicative (kills the live (0.55*defvol+0.45*duelq)*93). def_signal = 0.55*def_share_pct + 0.45*duel_quality_pct (pool-scoped, 55/45). FLOOR/SPAN position-gated: heavy CB/FB/CDM (competence floor), moderate CM, ~zero-floor small-lift ST/Winger/CAM (attackers live on output, never floored by defending).
- BEST-OF replaces Decision 2's fixed per-pool w_out/w_def blend: core = GREATEST(output-with-gravity, bounded-def). Proven necessary on FB , flat 30/70 INVERTS the pool (Aurier/Wan-Bissaka > TAA/Robertson); no fixed ratio fixes it; best-of gives TAA 92 / Robertson 73 / defensive FBs 66-72. Echoes the live engine's existing GREATEST(attack,def). Attacking-FB liability accepted+disclosed (Winter text), not a score penalty. Fewer dials (only per-pool def FLOOR/SPAN/CAP).
- NEXT: WIRE Stage 2 (first rt change). HARD SHIP GATE before matview refresh (Lucas approves diff): solid CB < productive attacker; 20-goal ST clear of any CB/FB; Messi/Haaland/Ronaldo peaks UNCHANGED; if any defender floats above a comparable attacker, FLOOR/SPAN/CAP come down. Build via engine_stage2_rt materialized table (live view untouched until approval).

### 2026-07-09 | Engine recalibration Stage 0/1/1b EXECUTED + Decision A locked (def_signal modest+disclosed; team-outcome rejected)
Ran the first engine-recalibration code (INSPECTION only, rt UNTOUCHED). Authoritative detail: VVonderXI_Engine_Design_Log.md DECISION 4.

- INFRA: DB now has `exec_sql(text)` helper (service-role, SECURITY DEFINER) , Lucas pasted it once, so Terminal-A Node scripts run DDL via the service key (no connection string; confirmed the service key alone otherwise CANNOT do DDL). Also materialized `engine_def_inspect` (snapshot table of the inspection columns, rebuilt per stage) for fast reads , the full view is too expensive to filter over PostgREST (8s timeout).
- STAGE 0 (committed b2efcb6): `engine_baseline_snapshot` , 56,454-row rt baseline (CSV + Supabase table) so every later stage is diffable. Loaded via scripts/engine/load_baseline_to_supabase.js.
- STAGE 1 + 1b (committed c5e3060, f874a3e): added def_signal INSPECTION columns to player_card_view (def90, defvol_pct, team_def90, def_share, def_share_pct, def90_pool_pct, duel_rate, duel_quality_pct , within position_pool, 2016+). rt path byte-identical/untouched. Migrations: migrations/stage1_def_share.sql, stage1b_pool_scoped_def.sql. Inspection columns are VIEW-ONLY (not on player_card_mv , matview schema is fixed at CREATE; site unaffected).
- FINDINGS (evidence vs a real CB distribution , Dias/Saliba/VVD/Koulibaly/Maguire + journeymen): (1) share-of-team-defending does NOT rescue van Dijk (his def_share ~0.8-1.2, below journeyman Tarkowski's 1.3-1.6). (2) NEITHER volume-share NOR duel-quality discriminates class , duel_rank puts Maguire/Tarkowski ABOVE Dias/Saliba/Koulibaly; signals capture ARCHETYPE not class. (3) team goals_against is a TEAM property, CONFOUND-PROVEN: on mid/lower sides (rank>=8) elite CBs 1.57 GA/g vs journeymen 1.51 (indistinguishable); van Dijk's Liverpool GA swings 0.58-1.39 while his duel_rank holds 89-92; Maguire's GA halved by moving Hull->Man Utd.
- DECISION A (LOCKED): def_signal stays a MODEST, DISCLOSED input (workload/archetype, NOT a class verdict); team goals_against REJECTED for individual scoring; "van Dijk 85+" target RETIRED (unreachable without tuning , individual elite-CB class is largely invisible to aggregate data, so we DISCLOSE per Decision 1.7). Stage 2 reframed = "integrate a modest, disclosed def_signal into position-aware weighting," NOT "find the magic formula." Also flagged: Decision 2's FB 30/70 out/def would underrate attacking FBs (TAA duel_rank 3-27) , needs output to carry more.
- STATUS: engine track , inspection + philosophy locked; NO rt change yet. NEXT = Stage 2 (position-aware weighting w/ bounded def_signal). Compare/launch track unchanged.

### 2026-07-08 | Engine recalibration DESIGN phase complete (Fable session, 4 decisions locked)
Design-only , NO engine code changed. Authoritative detail: VVonderXI_Engine_Design_Log.md (repo root; newest-at-bottom running log).

- 4 DECISIONS LOCKED: (1) defensive signal built on SHARE-OF-TEAM-DEFENDING (opportunity-adjusted volume , player's per-90 defensive actions / team per-90, percentile within pool; stays team-agnostic) + duel-win-rate quality (>=50-duel floor); (2) position-aware weighting + goals-primacy gravity; (3) ENDOGENOUS league strength with a circularity guard; (4) a 6-stage implementation order.
- Builds on the #118 position data-lock (position_pool clean 2016+) + the defensive-data finding (§C): recalibration now has reliable pools AND a locked design.
- NEXT EXECUTABLE STEP = Stage 0/1: snapshot + ingredients-only view columns (expose the raw defensive/context ingredients on the view before any scoring change).
- STATUS: design complete, execution not started. Engine track (parallel to the Compare/launch track).

### 2026-07-08 | #118 position data-lock: CM-bug + null-fill cleanup RAN
Cleared the position_pool tail for the defensive within-pool percentile (engine recalibration prep). DB write done + matview refreshed.

- CM-BUG FIXED: the definitionally-wrong CM tail , FWD/DEF coarse mislabeled central-mid , 1,437 rows reclassified (993 via each player's own dominant other-season pool; 444 coarse-default FWD->Winger / DEF->CB where no signal). Guarded UPDATE (.eq('position','CM')) so no curated bucket was touched.
- NULLS FILLED: 131 resolvable post-2016 pool-NULLs (25 GK->GK; 106 from each player's own other-season pool). INSERT ON CONFLICT DO NOTHING.
- position_pool now CLEAN on the 2016+ window (the field the defensive percentile pools on). Matview REFRESHED (player_card_mv).
- Script: scripts/enrichment/cm_bug_fill.js (dry-run-first, reproducible/auditable, alongside write_positions.js); provenance appended to known_players.csv (source tags cmbug-modal / cmbug-default / nullfill-gk / nullfill-modal).
- DEFERRED (post-Fable polish, NOT blocking recalibration): 207 obscure BPL/ERE pool-NULLs (confidence dots) + ~6k MID-coarse CM rows needing CM/CAM/CDM nuance.
- This CLEARS the position data-lock for the engine recalibration (defensive within-pool percentile now has reliable 2016+ pools).

### 2026-07-08 | Device-split card reveal + shared season picker + search fix (Batch B tail)
Big UI arc across card.html + compare.html + vv-core.js. All on redesign-compare, committed through ece8520.

- SHARED SEASON PICKER (ddf5519 extract + feb0aff wire): rankRowHTML + rowShieldHTML moved into vv-core (opts {cap,onClick,showRank,active,seasonLed}; rankings byte-identical via back-compat). Foldable rankings-style SEASON-LED rows (year leads, club·pos·age·G·A subline ellipsizes, tags wrap, .rmini VV badge) on BOTH the card "view all seasons" and the Compare per-slot switcher. Season fetches widened select('*') -> rowToCard -> attachHonoursBatch. #108 (5d5591c): bottom "Collapse" for long lists (>=6 seasons) , folds + scrolls back to the top trigger; both surfaces.
- DEVICE-SPLIT CARD REVEAL (shared VVCore.vvCardFlip): DESKTOP >720px = 360deg reveal-through-back 3D flip (front .vvcard -> VV coin at 180 -> new card at 360, content swap at the hidden midpoint, ~0.8s); MOBILE <=720px = pure transform:scale + opacity scale-swap through the coin (NO 3D , iOS Safari flattens preserve-3d unreliably). Wired on Compare (season-switch + player-swap) AND Master (season-switch + card-FACE tap-admire, excluding .yr + layer headers). Coin/back TIER derived from PRESTIGE (Generational->black, Iconic->gold, else cream) = the SAME field that colours the front card, so coin colour == card colour by construction (34d93a1 killed the earlier VV-cut mismatch).
- THE MOBILE-SAFARI 3D BATTLE (why the flip took ~8 commits , invariants NOW LOCKED, do NOT re-derive):
  1. Faces need EXPLICIT dims off --cw (width:var(--cw) + height:calc(--cw*1.397)); NEVER % (resolves to 0 against the auto-sized in-flow parent , hit as both zero-width AND zero-height bugs).
  2. FRONT in-flow (position:relative) + BACK absolute overlay , card box comes from the real card (no collapse).
  3. -webkit-transform-style:preserve-3d + NO will-change (Safari flattener) + card-scaled -webkit-perspective:calc(--cw*3.6).
  4. NO overflow clip on ANY flip ancestor (iOS flattens preserve-3d under a clip) , the horizontal-scroll guard moved OFF the cards onto sibling blocks (.verdict/.vafter) + min-width:0 on drifting grids.
  5. Mobile = scale-swap not 3D; coin tier from prestige.
  Trail: 6fbb183 edge-pivot(superseded) -> 4aef735 flip+tiers -> f7b1af7 front-in-flow -> 8eb6b92 webkit/will-change -> 5fc06e1 back-height -> 85a5a82 overflow-clip -> f4fad57 back-width -> 88b9ace mobile scale-swap -> 1403009 Master -> 34d93a1 prestige-tier.
- COMPARE CTA ABOVE-THE-FOLD #111 (8bfebac): "Compare this player" pill under "Add to my club" in .plinth (clubpill style; deep-links compare.html?a=<card_id> -> slot A); retired the buried in-layer compareCta1; kept the bottom action-row CTA.
- SEARCH TOKEN-AND + ACCENT-FOLD (ece8520): search_players RPC already token-ANDs; matched the two front-end paths to it. Shared tokenAndFilter(q) (vvNorm fold + strip to [a-z0-9 ] + split on spaces; require EVERY token in player_name_norm OR team_name_norm) in rankings.html + compare.html. Fixes "jordan lukaku" (non-adjacent tokens, middle names) + "Suárez" in the picker (was raw player_name, no fold). Empirically verified vs live DB.
- STATUS: Compare reveal/picker/CTA/search all LIVE + mobile-safe. Compare bar 78->85%. NEXT: C8 position filter, final Compare polish, then merge redesign-compare -> vvonderxi_BIGGER.

### 2026-07-07 | Defensive data FOUND in-DB + engine recalibration decision (Phase 2)
Launch-relevant ENGINE decision (source-of-truth also recorded in §C Engine/bands). No code change , a locked decision + data finding for the Phase-2 recalibration.

- FINDING (5 Jul): defensive data EXISTS in the DB , no external sourcing needed. Fields on player_card_view + player_season_cards: tackles_total, tackles_blocks, interceptions, duels_total, duels_won. league_standings.goals_against = team defensive record. Coverage 2015-2025 ≈ 85-95% populated; pre-2015 ≈ 0% (API-Football stats start ~2015). Validated: van Dijk (CB) high tackles/interceptions vs Messi/Haaland low , the data separates defenders from attackers correctly.
- ENGINE IMPACT: the recalibration (Phase 2, after data-lock, alongside dynamic league strength) MUST add a defensive dimension so defensive players get equal treatment , scored on tackles+interceptions+blocks per-90, ranked WITHIN position pool (percentile). Target: van Dijk peak ≈ 85+ (sanity exhibit). Duels = secondary only. Pre-2015 gap disclosed via confidence dots. Position-aware weighting integrates defensive score with attacking output + league strength. Anti-confirmation-bias holds (van Dijk = read-out, not dial).
- FABLE'S ROLE: the data question is answered; the DESIGN/reasoning (defensive formula, within-pool percentile, position-aware weighting, league-strength integration) is where Mythos-tier reasoning is applied on the engine track.
- DATA BUG: `age` column = current age (van Dijk shows 34 every row) , use `season_age`. May relate to the Lukaku position issue , flag for the data-accuracy/position pass.

### 2026-07-07 | Compare finish batch (Batch B) + shared season picker
Session focus: finish the Compare product spine + build one shared season picker for card + Compare.

- PREMIUM TRAJECTORY ported to Compare: shared vv-core renderTrajectory (opts chrome:false + transparent halo), ALL seasons, ONE shared head/legend/caption, CMP season selected.
- AI-FEEL PROMPT FIX (api/analyse.js): STYLE RULES block , banned em/en-dashes + AI-tell phrases ("not just X but Y", "a testament to", "cements"...), Winter/Drury two-register voice; cleaned the prompt's OWN example text.
- BRAND: "VV Engine" -> "VV Index" site-wide.
- COMPARE ACCOLADES: swapped hover-tooltip .vchip chips for card-style tap-expandable Wonder Tags (renderWonderTagsGrouped + renderProfileTagRows) , killed the tooltip left-crop; odd-tag-count card-face fill (last cell spans both cols) propagated across card/rankings/compare.
- CARD FIXES (commit effa5be): #104 horizontal-scroll lock (body overflow-x:clip , chosen over hidden to preserve the sticky spine + plinth); #105 tap-toggle-INLINE tags site-wide (shared vv-core click handler replaces the sticking hover tooltip; skips .vvcard card-face + [onclick] nav rows); #106 position on the card face (.sub -> CLUB·POS·AGE in buildCard, all surfaces); #107 removed the visible "Master Card View" crumb + trimmed <title>.
- COMPARE MOBILE BUGS: #93 season-search input 16px (no iOS zoom); #94 season A/B slot vertical alignment (edge-flag reserved 30px box); #97 floating back-to-top FAB (>400px).
- TRAJECTORY SQUISH #91 (commit e9d25d0): pair stack breakpoint 620->720px (in step with the page); mobile per-chart cap 330->430px.
- STORY PER-PLAYER SPLIT #96 (commit 55bee8b): airy editorial , pink/blue full-height left accent bars + colour-matched names + generous padding + mobile vertical spacing (no boxes).
- STORY/VERDICT TEXT #102 (commit 93688fd): verdict pull-quote measure cap 620px + line-height 1.45 + more air above the gold who-line; story prose 15.5->16px.
- SHARED SEASON PICKER (commit ddf5519 extract + feb0aff wire): rankRowHTML + rowShieldHTML moved into vv-core with options {cap,onClick,showRank,active,seasonLed}; RANKINGS BYTE-IDENTICAL via a number-3rd-arg back-compat branch. Season-led variant (YEAR leads, club·pos·age·G·A subline ellipsizes, tags wrap, .rmini VV badge). Namespaced .seasonrows CSS block copied identically into card + compare. Both season fetches widened select('*') -> rowToCard -> attachHonoursBatch (club/pos/tags/VV/honours). CARD view-all-seasons reuses existing fold; COMPARE per-slot gets the same collapsed "All N seasons" fold (replaced year-only .cmp-spill pills). Clicks: card -> switchSeason, compare -> vvSwitchSlotSeason; current season highlighted pink; collapsed by default on both.
- NOTE: §A Compare bar was ~45% live (not the ~62% recalled); bumped to ~78%.
- NEXT: C8 position filter + remaining Compare polish -> card K4 Proof / K5 trajectory -> hygiene -> merge.

### 2026-07-05 | Honours bug-batch (Batch 1) + build-state reconciliation
Session focus: fix honours bugs across all surfaces, reconcile the TRUE build-state (3 sources), NR-assist fill.

**BATCH 1 , 4 honours/display bugs (commit f6cb461, pushed):**
1. World Cup was showing on EVERY card for a player (career-wide) , now SEASON-SPECIFIC (matches tournament-year card only, like all trophies). Messi 2011/12 no longer shows WC; his 2022 PSG card does. fetchHonours + shapeHonoursForCard both updated.
2. Honours were INVISIBLE in rankings (search/list) , card view used buildCard (has priority-fill) but d.honours was never fetched; list/compact had no honour logic. Fixed: attachHonoursBatch(CARDS) , ONE batched honours query per page (not per-card; 50 cards = 1 query), + renderHonourPillsCompact in list/compact rows. Honours now show on the card face + rows in all rankings views.
3. Wonder Tags broken on mobile , honour-row .ci SVG icons were unsized -> rendered ~300x150px, blowing out layout. Fixed: .tagrow .tt .ci{width:15px;height:15px;flex-shrink:0}. Tap mechanism was fine.
4. Radar dimensions showed fake 100/100 , provisional linear scale (raw div RADAR_REF x100) clamped at 100; low placeholder refs let elite output max out; reliability maxed at full-season. Fixed: RADAR_CAP=97 display cap. IMPORTANT: raw.reliability stays TRUTHFUL (100 = genuinely played full season); only the radar DISPLAY caps. The other 4 dims capped at scaling site. INTERIM , real fix is percentile-within-position scaling (parked, engine phase).

**FOLLOW-UP (post-Batch-1, this session):** #14 rowToCard carries season_year/season/league_code (rankings honours had matched nothing without them) + #15 clean Winter hovers + #16 Drury expansions + #17 grouped Wonder Tags (Silverware/Individual/The Player) = commit 1385002. #20 rankings ROW tags now priority-capped (honours > prestige > profile; 3 list / 2 compact; silent, no crop) = commit 3af7a40. Caveat logged: league_champion/ucl_winner are team-keyed (NULL api_player_id) so they never attach to players , SILVERWARE currently shows World Cup only.

**NR-ASSIST FILL (data, done):** 71 rt>=85 pre-2016 marquee cards had NULL assists (scored 85+ on goals alone). CCC verified all 71 vs FBref domestic-league splits; written via guarded UPDATE (assists IS NULL); matview refreshed. Their rt nudges up. Remaining NR: 194 at rt80-84, 1184 at rt75-79 (queued, tiered). 4 goal-count flags noted (separate goals-provenance audit).

**BUILD-STATE RECONCILED (3 sources: docs + PM + LIVE verify) , corrects earlier stale estimates:**
- Compare ~45% (was estimated ~8%): slots/deep-link/season-switch/speed/mobile-template/verdict-radar-trajectory LIVE. REMAINING: C5 verdict "The Edge" + C6 Accolades still hardcoded Henry/Haaland (B2); C8 position filter (passF); See-Player, back path, layout clip, edge-pivot flip, radar overlay.
- Card editorial ~55% (was ~20%): Glance/Scout/Notes/Profile-blurb/Data-Confidence/Wonder-Tags WIRED. REMAINING: K4 Proof (hardcoded Bruno); K5 trajectory VV-line chart (greenfield); honours strip UI; defender flag; identity line; refined-crest shield.
- Honours: DONE + all bugs fixed (this session). Winter one-liners, prestige ranking, card-face priority-fill, cross-surface (card/rankings/mobile).
- Tags ~35%: honours family complete; profile/prestige/playbook-audit remain.

**NEW BACKLOG (docs/HYGIENE_BACKLOG_2026-07-05.md, 13 items):** WC fix(done), rankings honours(done), mobile icons(done), radar cap(done); + accolades category division, custom branded icons, sticky filter+scroll-top-arrow, unify Compare picker, filter taxonomy+dynamic sort, radar percentile(engine), VV Index attacking-lean Graham disclosure.

**NEXT:** Compare Accolades (C6 , wire honours into .vtchips, replace Henry/Haaland demo; quick, renderers exist). Then C5 verdict, card K4 Proof + K5 trajectory, tag system/playbook audit. Engine dynamic-league-strength = parallel launch-blocker.

### 2026-07-04 | Honours -> cards: fetch + render layer + polish (Winter voice, prestige rank, card-face fill) + WNG
- HONOURS NOW SURFACE ON CARDS end-to-end. fetchHonours() folded into vv-core.js (reuses vvClient,
  fail-soft empty shape); wired into card.html loadCard + switchSeason and compare.html fetchCard, so
  D.honours carries each season's OWN honours (season = match season_year+league_code; world_cup_winner
  = career, shows on every card). Commit 199fe5e.
- RENDER LAYER (commit 5d8447d): renderHonourChips / renderHonourRows / renderTopHonourPill folded into
  vv-core.js, reusing existing markup , #glChips gold chips (.chip.gold, hover-tip free via
  .chip[data-tip]) + #wonderTags tap-expandable .tagrow.honour (mobile one-liner + goal/assist tally in
  .tmore). Honours PREPEND above prestige+profile in both.
- POLISH (this commit): (1) honour one-liners rewritten to WINTER VOICE (sharp, authoritative, no dashes);
  (2) prestige RANKING re-cut , HONOUR_META.tier = ballon_dor 1 > world_cup 2 > ucl 3 > league 4 > POTS 5
  > golden_boot 6 > top_assists 7; season+career now COMBINED + TIER-SORTED (fetchHonours.all, topHonour =
  lowest tier), driving glance-chip order AND card-face pick; (3) CARD-FACE PRIORITY-FILL in buildCard , a
  LOOP over the top-N honours: fixed budget 3 slots if prestige / 4 if not, filled Prestige -> Honours(by
  tier) -> Profile(by PRIO); glance strip stays UNCAPPED. Gold .chtagcell.gold CSS added to card+compare.
  Verified: Messi 11/12 (rt 97, Generational) = prestige + Ballon d'Or + World Cup on face; 9/9 slot-math
  examples; Lautaro 23/24 (rt 89, no prestige) = 3 honours + 1 profile.
- TOP-SLOT position = ADDITIVE (Option A): position stays the identity marker; face honour pills are the new tier.
- WNG DISPLAY (commit 11f2da6): position bucket "Winger" RENDERS as "WNG" (render-only, like the band
  renames) across card/rankings/compare via vv-core posDisplay() + POS_DISPLAY. DATA bucket unchanged
  (tags/eligibility/filters/AI-prompt preserved). myclub.html left as-is (no vv-core; own buildCard copy).
- STATE: honours fully wired card-side (face pills + glance chips + Wonder Tags). Compare Accolades
  (.vtchips) still the hardcoded Henry/Haaland demo -> next: consume the honour renderers there. Honours
  standalone (no rt / no matview refresh).
- NOTE (carry-over): the position/assist writes STILL need `REFRESH MATERIALIZED VIEW player_card_mv;`.
- NEXT: wire Compare Accolades to real honours; then honours Tier-2 / profile-tag validation.

### 2026-07-04 | Card hero-name fix: particle-aware surnameOf (vv-core.js, commit eeaab53)
- Vinícius Júnior card showed "Junior" -> traced to surnameOf() naive last-token render (data was already
  correct: player_name = "Vinícius Júnior"; bug was front-end , hero shows last word, full name hidden).
  SYSTEMATIC across multi-word names: De Bruyne->"Bruyne", van Dijk->"Dijk", de Ligt->"Ligt", de Jong->"Jong".
- FIX (commit eeaab53): particle-aware surnameOf , keeps nobiliary particles (de/van/von/ter/da/dos/di/
  del/al/el/mac/mc...) + multi-word (van der, de la, dos santos) with the surname; SURNAME_OVERRIDES
  known-as map for exceptions (Vinícius Júnior->Vinícius). 14/14 tests pass. Front-end only, no
  DB/rt/matview change; live on JS deploy. Backlog: extend overrides for suffix/nickname cases (Filho, Neto).

### 2026-07-04 | Honours completed: top_assists + player_of_season + world_cup_winner (honours -> 629)
- honours table now 629 rows / 7 honour_types: league_champion 143, ucl_winner 16, ballon_dor 14,
  golden_boot 141 (Tier-1 CCC = 314) + top_assists 120 (computed) + player_of_season 102 (CCC) +
  world_cup_winner 93 (CCC, player-level).
- PLAYER_OF_SEASON (102): CCC "continuous best player per league" (Rule A), 7 leagues, 2010/11-2024/25.
  Tiered resolver 101/102 -> api; 1 unresolved (Theo Janssen, genuinely not in players). Overrides:
  Otávio->380 (Porto, not Bordeaux/Famalicao namesakes), Karim El Ahmadi->2713. honour_context =
  award_name + proxy-era note (era-correct name matters: PFA vs official PL POTS). Kroos 2017/18 EXCLUDED
  (Real Madrid, not a Bundesliga club). Validated: Messi LL POTS=7, Mbappé L1=5, Kroos absent.
- WORLD_CUP_WINNER (93 of 95): PLAYER-LEVEL career accolade , attaches to the player, can surface as
  context on ALL their season cards; does NOT feed rt, NOT a season tag. Written ONLY where the player
  resolves to a CARD in our DB (2 skipped: Höwedes, Franco Armani , genuinely uncarded). season_year =
  tournament year (2010/14/18/22); country in honour_context; NO league_code / NO team_name. Validated:
  Messi 2022, Iniesta/Xavi 2010, France 2018 squad , all league/team NULL.
- RESOLVER LESSON (patched via per-batch API_OVERRIDE): dual-surname / suffix DB name forms defeat
  last-token surname bucketing , Spanish paternal+maternal ("Casillas Fernández", "Puyol i Saforcada",
  "Hernández Creus"=Xavi) and Arabic ("El Ahmadi Al Aroos"). 8 WC names recovered this way (Casillas 367,
  Puyol 116880, Xabi Alonso 90657, Valdés 90515, Arbeloa 90521, Marchena 116941, Xavi 42041, Javi
  Martínez 514). Backlog: a token-anywhere matcher would generalize this.
- top_assists (recap): computed from our data, >=9 credible cut, ties both-written, 41 thin-coverage
  seasons excluded; numeric `assists` column added + 120 counts migrated into it.
- honours is STANDALONE (no rt / no matview refresh). Pipelines preserved: scripts/enrichment/honours/
  (honours Tier-1, top_assists x3, pots x3, wc x3 + input + prepared CSVs).
- NEXT: wire honours into card/Compare (tag surfacing); honours Tier-2 (domestic cups excluded per SecC).

### 2026-07-04 | Honours Tier-1 WRITTEN (first tag family live)
- honours table POPULATED Tier 1: 314 rows = 143 league_champion, 16 ucl_winner, 14 ballon_dor,
  141 golden_boot (source='wikipedia_ccc'). Input 304 CCC/Wikipedia rows -> 314 after tie-splits
  ("A / B" player -> separate honour rows). goals column carries golden_boot tallies.
- TEAM-SEASON JOIN VALIDATED: Messi 11/12 = Ballon d'Or + Golden Boot (api 154) but NOT League Champion
  (LL 11/12 champion correctly = Real Madrid). Barcelona 10/11 = league_champion present. Champions are
  keyed to the winning TEAM, not a star player's club , the join is precise.
- RESOLVER (honours_dryrun.js): tiered player match exact-norm -> token-subset (surname/first buckets)
  -> surname+initial; norm folds ss/o/l/d specials (ß/ø/ł/đ); team+season cross-check disambiguates
  same-name players + catches collisions. 3 hand overrides: Rodri->44 (Man City, not 3 other Rodris),
  Salah->306 (not Ibrahim Salah 375000), Mane->304 (not Getafe's "Mané" 116847). Team map extended:
  Roma->AS Roma, Istanbul Basaksehir->Başakşehir, KRC Genk->Genk.
- Union SG (BPL champ 24/25) written WITHOUT card-link (not in dataset) , factual honour. 4 rows SKIPPED
  (COVID / not-awarded: no team AND no player). 5 golden-boot scorers resolved by unique name but not
  card-verifiable (club untracked): Cardozo 70475 (confirmed correct), Undav, Lepaul, Bertaccini,
  Harbaoui (team string "Anderlecht & Zulte Waregem" left as-is).
- honours is a STANDALONE tag table , does NOT feed player_card_view/rt, so NO matview refresh needed
  after an honours write.
- Pipeline preserved: scripts/enrichment/honours/ (commit 815bcc1), reusable for Tier 2 (domestic cups
  excluded per SecC; player-level accolades = career context, not season tags).
- STATUS: first tag family live + validated. NEXT: honours Tier 2 OR tag VALIDATION -> wire into card/Compare.

### 2026-07-04 | REVIEW queue cleared (batch-2+3) + data-fix / goals-provenance flags
- REVIEW QUEUE CLEARED: all 80 rt80-84 big-club REVIEW cards classified + written (batch-2 = 46
  from-knowledge; batch-3 = 34 CCC-verified). With the 169 HIGH, full 250-card Standout sweep done
  (1 HELD: Onyekuru).
- POSITION WRITES total across 3 batches: 249 -> player_positions (guarded: INSERT if no row / UPDATE
  only where position IN coarse{DEF,MID,FWD,GK,UNK}+CM; 0 curated buckets overwritten).
- ASSISTS: batch-3 filled 7 NR assists (fill-only, player_season_cards.assists; card_id = psc.id; the
  view recomputes rt from goals+assists so those 7 rt values move UP on refresh). 6 goals-mismatch cards
  got position only.
- DICTIONARY: known_players.csv = 248 rows (169 auto+rule + 45 knowledge + 34 ccc), keyed
  (api_player_id, season_year). Reusable for the DB-wide CM-tail fix.
- MATVIEW REFRESH PENDING (one paste covers all position+assist writes):
  `REFRESH MATERIALIZED VIEW player_card_mv;` in Supabase SQL editor. supabase-js has no refresh RPC.
- DATA-FIX LIST (team_name errors; positions/assists themselves correct): Aydin 181398 (Alanyaspor not
  Fenerbahce 23/24 -> should fall out of the big-club filter); Onyekuru 108547 (not Arsenal; HELD).
- GOALS-PROVENANCE ISSUE (AUDIT): some cards' goals include EUROPEAN-competition goals but the engine is
  DOMESTIC-only. Confirmed Vanaken x5 + Mboyo (figures match all-comps totals). Risk: inflates
  output->rt for Euro-competition clubs. Audit goals vs domestic-only source.
- Scripts preserved: scripts/enrichment/ (commit 7fb37fe).

### 2026-07-04 | Position standardization: rt80-84 "Standout" band + DB-direct pipeline
- BUILT a DB-DIRECT read/write pipeline from Terminal A (.env service key + supabase-js) , FIRST time
  writing to the DB from here; previously all SQL was chat-paste round-trips. Three reusable scripts
  (scratchpad): pull_8084.js (read player_card_view paginated, 41-club + coarse/CM filter),
  classify.js (8-bucket judgment map + regista/false-9 rules + triage + self-check), write_positions.js
  (guarded INSERT/UPDATE + spot-check). Reusable for the DB-wide cleanup.
- PULLED 250 rt80-84 cards at 41 big clubs carrying coarse/CM-bug positions. Classified ALL into the 8
  buckets: 169 HIGH (written), 80 REVIEW (pending CCC), 1 HELD (108547 Onyekuru/Arsenal = wrong-TEAM
  data error, needs a data fix not a position).
- RULES applied both sets: deep-lying regista in front of defense -> CDM (Çalhanoğlu@Inter x3);
  false-9 -> ST (Firmino, Totti-as-false-9); box-to-box -> CM. Kroos/Parejo left CM (deep playmaker but
  NOT the single pivot). API-Football "CM" bug corrected (De Bruyne->CAM, Salah->Winger, etc.).
- WROTE player_positions (guarded, position-only, no assists, no rt impact): 87 INSERT (86 pre-2016 +
  Mbeumo 25/26; ON CONFLICT DO NOTHING; position + shirt NULL) + 67 UPDATE (WHERE position='CM'
  belt-and-braces; 15 CM->CM no-ops skipped). Spot-check confirmed De Bruyne/Salah/Firmino/
  Çalhanoğlu-Inter/Álvarez all resolve the correct position_pool.
- MATVIEW REFRESH PENDING: supabase-js has no refresh RPC -> Lucas must paste
  `REFRESH MATERIALIZED VIEW player_card_mv;` in Supabase SQL editor. Source view already correct;
  site stale until refreshed.
- ASSET STARTED: known_players.csv , the REUSABLE dictionary (169 entries: api_player_id, season_year,
  position, source=auto+rule, classified_date). Keyed by (api_player_id, season_year) => league-agnostic.
- KEY INSIGHT: the "CM" bug tail exists DB-WIDE BELOW rt80 (verified live: De Bruyne 24/25, Çalhanoğlu
  Inter 22/23 & 24/25, Milan 20/21 all still CM , out of this pull's rt80 scope). known_players.csv is
  the mechanism to fix the CM-bug tail at scale DB-wide (dictionary-driven, no CCC needed for known players).
- CCC PROTOCOL (the 80 REVIEW): positions_REVIEW.csv = obscure players + true toss-ups (CM/CAM/CDM,
  Winger/ST). Verify obscure/toss-up cards on Transfermarkt via CCC in chunks of 25; then guarded write
  + append to known_players.csv.
- STATUS: Standout-band big-club positions clean once matview refreshed. NEXT: refresh -> (optional)
  clear 80 REVIEW via CCC -> honours -> tags. Pipeline + dictionary now exist for DB-wide CM-tail fix.

### 2026-07-03/04 | Engine cleanup + data enrichment (this session)
- Bands re-cut to 95/90/85/80 (commit 18c6059). GK "blocker" closed (stale read, not a bug). Elite-assist check passed (0.7 weight kept).
- 101 assists backfilled (22 marquee + 79 World Class), FBref domestic, verified.
- Top-of-scale cap BUILT + LIVE (commit ebc8ce6): 95-100 -> 95-97, Messi 11/12 = 97. Also fixed new_view.sql norm-drift.
- Tagline -> "Every Season Tells a Different Story" site-wide (commit 480390b).
- Rankings rt-ceiling bug fixed 96->97 across 11 coupled spots (commit f7745d3) , top-of-scale seasons were being filtered out.
- Position auto-map: ~37,700 cards standardized to 8 buckets (format only; inherited API-Football accuracy errors).
- Verified by hand: top 40 + 100 = 140 cards shirt+position (Transfermarkt).
- Honours specced as a tag family. Progress-graphic + this master-doc structure established.
- IN PROGRESS at session end: top-150 verification sweep (CCC), ~50 of 97 rows collected, write pending.
- STATUS: engine clean and trustworthy; top band nearly fully enriched; NEXT is finish 150 -> honours -> tags.

---

**Update discipline:** when a decision is locked/deferred/verified, edit the relevant section immediately. Append to §F every session. Update §A bars every session. A stale master doc is the exact failure this file exists to prevent.
