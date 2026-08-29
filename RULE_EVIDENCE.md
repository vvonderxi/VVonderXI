# RULE EVIDENCE , the measurements behind the §C invariants (split 2026-08-23)

**THIS FILE IS NOT AUTHORITATIVE AND CONTAINS NO RULES. `CLAUDE.md` §C IS THE RULE. If anything here
conflicts with it, §C wins.** What lives here is the EVIDENCE: the measurement that produced a rule,
the incident that taught it, the post-mortem that closed it. Every rule stayed in §C as the bold
headline it always was, byte-identical , only the proof beneath it moved.

**Same precedent as `SILENT_FAILURES.md` (split 2026-08-16), for the same reason and by the same
method.** §C had reached 48.2% of the 150k truncation limit on its own and CLAUDE.md was at 98.3%,
which is past the point where a read is silently cut. Archiving could not help: §F was already down
to 2.9% and the mass was open work, not closed history.

**WHEN TO OPEN THIS FILE.** When a §C rule looks arbitrary and you want the number behind it; when
you are about to argue a rule is over-cautious; when a measurement disagrees with what the rule says
to expect. **You do not need it to work.** You need it when you are about to overrule something.

**DO NOT SUMMARISE BACK INTO §C, and do not delete from here to save space.** A rule shortened until
it no longer says what it cost is a rule a later session talks itself out of , that is exactly how
the Ibra line and the "1-2% rarity band" line both survived while being wrong.

---

## **`git reset --hard` IS REPO-WIDE AND DESTROYS UNCOMMITTED WORK IN FILES THAT HAVE NOTHING TO DO WITH THE TASK. USE `git checkout -- <named files>` INSTEAD (2026-08-17).** It takes no path argument in the form it is usually reached for, so "undo my working-tree changes" quietly means "undo EVERYONE'S working-tree changes", including edits made hours earlier in a different thread of work.

- **THE INCIDENT: during a commit SPLIT** , resetting four front-end files to HEAD so the first commit could contain one concern , **`git reset --hard HEAD` also wiped an hour of uncommitted work on `api/import-players.js` and `scripts/enrichment/gk_pen_backfill.js`** (live quota capture, per-field reporting, the dry-run key verification, the `--delay` flag and its NaN guard). None of it was staged, so **there was no git object to recover from**; it had to be hand-rebuilt from the conversation.
- **THE RUNNING BACKFILL SURVIVED ONLY BY LUCK OF TIMING: Node had already loaded the module from disk at launch, so the in-flight process was unaffected.** Had it crashed and been restarted from disk inside that window it would have run the older script. **Do not treat "the job kept running" as evidence the reset was harmless.**

## **WHEN A RULE READS TWO FIELDS FOR THE SAME CONCEPT, CHECK THEY AGREE BEFORE TUNING ANYTHING DOWNSTREAM (2026-08-15). The tag engine did not, and it cost a whole audit.** After the threshold rekey, `eligibility()` still read the COARSE `position` field while `TAG_THRESHOLDS_POOL` read `position_pool`. **A miscoded card was ADMITTED by one field and JUDGED by the other, so it drew whichever bar was easiest.** An ST-pool card carrying coarse MID was eligible for Engine Room (a MID-only tag) but judged against ST's `passes90_p80` of 28.2 instead of MID's 51.9, and cleared trivially , 198 Engine Room holders sat in the ST pool.

- **THE MEASURE THAT EXPOSED IT: minority-family share per tag, against an 8.28% population baseline.** **Maestro 46.0%. Engine Room 39.4%.** Playmaker 21.7%, Regista 18.4%, The Winger 18.4%, Complete 15.9%, Provider 15.7%. Every one of those had a bottom ten made ENTIRELY of cards whose pool contradicted the tag , CBs holding The Dribbler, strikers holding Regista, a CB holding Maestro on 8 key passes. **THE 8.28% AND EVERY FIGURE IN THIS BULLET ARE THE 2026-08-15 STATE, NOT CURRENT.** The baseline was re-measured on 2026-08-21 at **12.54%** (4,654 of 37,128 pooled cards), and that is the number to use now. It moved because POOL COVERAGE GREW that day, not because the tags drifted , more cards carry a `position_pool`, so more of them can disagree with the coarse field at all. **Quoting 8.28% against a later run understates the baseline and turns healthy tags into false positives.**
- **RAISING THE BARS DID NOT FIX IT AND CANNOT.** At Provider x1.20 and The Dribbler x1.30 the bottom ten were still entirely CB. **The miscoded cards were passing by WIDE MARGINS on the wrong pool's threshold, not squeaking over their own** , so a multiplier removes honest cards from the middle and leaves the offenders untouched.
- **FIXED by `POOL_FAMILY[pool] || coarseFam` inside `eligibility()`**, mirroring `TAG_THRESHOLDS_POOL[pool] || TAG_THRESHOLDS[fam]`. Maestro 46.0% -> 0.9%, Engine Room 39.4% -> 0.9%, both landing IN BAND with no threshold touched. **Tuning before this would have been tuning twice.**
- **ON THE FIVE IDENTITY TAGS THE 2026-08-15 DEFECT IS FULLY CLOSED, measured the same day: Regista CM 406 / CDM 229, The Winger 297 Winger, Poacher 268 ST, Ball-Playing CB 208 CB, Maestro CM 201 / CDM 111 / CAM 77.** No CB holds Maestro, no striker holds Regista. **Maestro's 77 CAM holders are CORRECT and must not be read as contamination** , the 2026-08-16 fix requires CAM to earn it while CAM stays in the FWD family, so they register as "minority family" BY CONSTRUCTION.

## **A STATEMENT ATTRIBUTED TO THE DOCS MUST BE CHECKED AGAINST THE DOCS BEFORE IT IS ACTED ON , AND THE DOC ITSELF CAN BE WRONG (2026-08-16). THREE CLAIMS WERE ASSERTED AS RECORDED IN ONE SESSION. TWO DID NOT EXIST AND THE THIRD EXISTED AND WAS FALSE.**

- **"GK cards must not be published until v1.2" , NOT IN ANY DOC.** A repo-wide search returns nothing about hiding, excluding or withholding keepers. The only `v1.2` reference is `VVonderXI_Engine_Design_Log.md` line 51, a constants-table row reading `GK | unchanged until saves mapping (v1.2)`, which is about ENGINE TREATMENT, not publication. **The actual recorded stance is the opposite: "disclose via confidence, don't fake" (§C) , and acting on the claim would have removed 2,706 cards from every public surface.** It got as far as a scoped implementation before the file was checked.
- **"Sportmonks was evaluated and not recommended, marginal gain limited to clearances and aerials" , NOT IN ANY DOC, AND THE FILE THAT DOES EXIST SAYS THE OPPOSITE.** `sportmonks_killtest_report.json` (untracked) records **"PASS , defensive data present across full era. Proceed to Phase 1."** The docs mention Sportmonks only as a parked post-launch option.
- **"The Ibra ordering wrinkle is a mapping defect" , THIS ONE IS RECORDED, AT §E, AND IT IS WRONG.** The line reads *"Ibra 15/16 ordering wrinkle (tier-map not monotonic at top seam)"*. **Measured: rt is a STRICTLY MONOTONE function of b , sorting all 150 cards at rt>=90 by b descending, rt goes up ZERO times.** The piecewise map is `floor()` of a continuous increasing function whose segment ends meet exactly. **100% of the 1,131 inverted pairs are explained by the LEAGUE TILT**, not the mapping. §E is corrected.

## **A TAG WHOSE NAME ASSERTS A POSITION MUST GATE ON `position_pool`. A TAG DESCRIBING A QUALITY MAY GATE ON FAMILY. THE RULE ALREADY EXISTED AND THAT IS THE WHOLE LESSON (generalised 2026-08-16).**

- **THE RULE WAS ALREADY WRITTEN DOWN, IN A COMMENT ABOVE THE WINGER GATE** , *"The Winger is a POSITION-IDENTITY tag, NOT an ability tag"* , applied to that ONE tag and never generalised. The cost: **656 of 1,118 Regista holders (58.7%) were DEFENDERS** (CB 439, FB 217, and 161 of those CBs already held Ball-Playing CB, the tag that actually describes them), and **CAM could not earn Maestro at all**, because `POOL_FAMILY.CAM` is `'FWD'` and the gate read `'MID'` , the archetypal number 10 excluded from "the conductor of a team's attack", losing De Bruyne 19/20, Bruno Fernandes 20/21 and 18/19, Ozil 15/16.
- **CONSEQUENCE, already paid: restricting Regista left it at 418 (0.73%), under the ceiling, so its VOLUME multiplier moved 0.87 -> 0.75 with the ACCURACY multiplier UNTOUCHED at 0.97.** Single lever, quality bar intact. Landed at 635 (1.11%).

## **THE 2026-08-21 "TAG RECALIBRATION IS NOW REQUIRED" WARNING WAS WRONG, AND IT IS KEPT HERE AS A CORRECTION RATHER THAN DELETED, BECAUSE THE REASONING ERROR IS THE USEFUL PART.** The claim, written the same day the engine changed and BEFORE anything was measured, was that the repartition and the `gaw` penalty weighting had moved the ground under the tag thresholds, that **"`gaw` no longer means what it meant when those bars were cut"**, and that no tag percentage recorded before that date could be quoted as current. **Measured the next day, on all 57,234 cards: the engine change moved SEVEN CARDS ACROSS TWO TAGS.**

- **WHY IT WAS WRONG , the tag engine does not read the fields that changed.** Counted in `getVVTags`: **`gaw` 0 occurrences, `pos_pct` 0, `posvol_pct` 0, `percentile` 0.** The thresholds are STATIC numbers compared against RAW per-90 stats (`goals90`, `assists90`, `keypass90`, `passes90`, `drib90`, `defact90`, `int90`, `duelswon90`, `passAcc`, `conversion`), none of which the view change touched. **`rt` is read in exactly ONE place: the `>= 82` gate on Wonderkid and The Last Dance.**
- **MEASURED by recomputing every tag against the PRE-change rt: `The Last Dance` 47 -> 42, `Wonderkid` 71 -> 73. Every other tag identical, card for card.** 177 cards crossed the `rt >= 82` line; only 7 were age-eligible, which is the entire effect.
- **THE ERROR WAS ASSUMING A SHARED INPUT FROM A SHARED SUBJECT.** rt and the tags both describe a season, both live in the same file, and both were cut against "the old distribution" , so an engine change reads like it must reach both. **It does not, because they consume DIFFERENT COLUMNS.** The check that settles it is thirty seconds of `grep` in the consumer, and it was not run before the warning was written into this file as settled.
- **WHAT STANDS FROM THE ORIGINAL ENTRY, because it was measured:** the repartition put `pos_pct`/`posvol_pct` on `position_pool` and the `gaw` change subtracted 0.22 per penalty; **26,618 of 54,173 scored cards changed rt, 390 crossed a public band**; the band COUNTS held exactly (12 / 138 / 500 / 650) because the anchors are rank-based. **All of that is true and none of it reaches the tags.**

## **THE LADDER POPULATIONS ARE ANCHOR-PINNED, NOT MEASURED , SO THE vvindex COUNTS ARE STRUCTURAL CONSTANTS AND A FUTURE SESSION MUST NOT "FIX" THEM AS STALE (logged 2026-08-13).** The band edges are RANK anchors, not score thresholds: `migrations/stage3_league_strength.sql` lines 67-70 set `b95 = OFFSET 11`, `b90 = OFFSET 149`, `b85 = OFFSET 649` , i.e. the **12th, 150th and 650th best card in the database**. So the populations are fixed BY CONSTRUCTION: **12 Generational, 150 at 90+, 650 at 85+, and 138 in the Iconic band (150 minus 12).**

- **VERIFIED EXACT on all four, live, 2026-08-13** against the post-write matview snapshot , 12 / 150 / 650 / 138, no drift on any of them.
- **THIS ALSO EXPLAINS A READ-OUT THAT LOOKS LIKE LUCK: the elite (rt>=85) count held at EXACTLY 650 before and after the 351-card tier-1 write.** That is the b85 anchor holding it there by definition, not a coincidence, and not evidence that a write "did nothing". **A stable band count is the expected result of any write; the ripple shows up as cards SWAPPING slots, never as the count moving.**

## **BAND VOCABULARY IS UNIFIED ON "ICONIC" FOR 90-94 (2026-08-13). The 90+ band had FOUR different public names.** `bandFor` emits the ENGINE name `Elite`; the public word is now **Iconic** everywhere. Before the fix: vvindex said **Iconic**, playbook's ladder said **Elite**, the filter chip said **Elite**, the card badge rendered **ICONIC**, and playbook's glossary said **Iconic Campaign** (paired with **Generational Season**).

- **THE RENAME IS DISPLAY-ONLY AND CANNOT REACH A QUERY , proven, not assumed.** `VVF_BAND_LABEL = { Exceptional:'Standout', Elite:'Iconic' }` maps only the chip's `l`; the chip's `v` stays `Elite` and is what lands in `data-vvf-value` (vv-core:1831), which `readFilters` reads back by attribute (1894), and which `applyServer` turns into **numeric `rt.gte`/`rt.lte` bounds** via the band's lo/hi (1933-1940). **No label string enters the query at any point.** `bandFor` still returns `Elite` and `bandRange` still derives every edge by SCANNING it, so no number is hardcoded and a future recut still propagates automatically.
- **ONE LINE FIXED THREE SURFACES** , rankings, the card overlay and the compare picker all render chips from the shared `VVFilters`, so the label lives in exactly one place. **This is the payoff of the data-vvf-value rule; a label edit is provably safe.**
- **THE GLOSSARY SUFFIXES WERE A MATCHED PAIR, so both had to move.** Changing only "Iconic Campaign" would have left "Generational Season" beside a bare "Iconic". Every code surface (TAG_DEFS keys, FILTER_TAXONOMY.prestige labels, both `data-tag` badges) keys them BARE, so the glossary was the sole outlier and is now aligned.
- **CORRECTION TO THE "79 and under" DRIFT:** playbook and vvindex BOTH already said "under"; the outlier was `vv-core`'s computed lowest chip, which said "and below". Fixed in vv-core, not in the pages.

## **A SORT ON A LOW-CARDINALITY COLUMN IS NOT A TOTAL ORDER, SO `range()` PAGINATION SILENTLY DUPLICATES AND DROPS ROWS. THIS WAS LIVE IN RANKINGS AND NOBODY COULD SEE IT (2026-08-17).** `applyServer` ordered by ONE column. Every sort option is low-cardinality against 57,234 rows , rt alone puts thousands of cards on the same value , and **Postgres is free to return tied rows in any order, and will pick a DIFFERENT PLAN for a different window size.**

- **MEASURED, and it is not a hypothetical: the SAME rows 0-99 query returned TWO DIFFERENT ORDERS ON CONSECUTIVE CALLS, and the first 12 rows of a 0-99 window did NOT match the same query asked for rows 0-11.**
- **THE LIVE CONSEQUENCE: rankings pages with `range()` for infinite scroll, so a card could appear on TWO pages, or on NONE, as the offset advanced.** Silent in both directions , a duplicate reads as coincidence, and a missing card reads as "the filter must have excluded it".
- **FIXED by appending `card_id` (unique) as a secondary sort in `applyServer`.** After it: rows 0-99 stable across calls, its prefix matches the 0-11 window, and 300 rows across three appended pages came back 300 unique with zero duplicates.

## **CDM IS ASYMMETRIC , MOVING INTO IT RAISES rt, MOVING OUT OF IT LOWERS rt. Predicting only the inbound half cost two public band crossings (2026-08-10).**

- **MEASURED, 11 big-club writes:** `CM -> CDM` moved **UP** (Casemiro +1, Kimmich +1, Fernandinho +2). `CDM -> anything` moved **DOWN** (Kroos -3, Di Maria -2, Eriksen -2 and -2, Ribery -2 and 0).

## **MECHANISM: a card sitting in CDM draws a `def_core` benefit from the defensive pool. Moving it out REMOVES that benefit.** So the demotion is prior inflation leaving, not new error , those cards were being credited for defensive work they were never doing. **State it that way when it is questioned**, because a famous name losing a band reads like a bug.

- **THE COST OF THE HALF-RULE: the handover said "expect rt movement only on CDM transitions, and expect it upward."** Correct on inbound, silent on outbound, and the outbound half is where the band crossings came from , **Kroos 17/18 Standout -> Accomplished and Di Maria 19/20 World Class -> Standout.** A rule that names one direction reads as complete.

## **CONFIRMED AT SCALE 2026-08-13 , 15 CDM transitions in one write, ZERO exceptions in either direction. The rule is now evidence-backed, not observed once.**

- **13 LEAVING CDM: 7 fell (-1 to -3), 6 held flat, NONE ROSE.** Gallagher -2, Mkhitaryan -3, Joaquin -3, Banega -3, Didavi -2, Lucas Vazquez -2, Clauss -1; Dallas, Marcos Alonso, Birsa, Conti, Caligiuri and Sneijder unchanged. **2 ENTERING CDM: both +3** (Rice 2324 and Parejo 1718, each 82 -> 85).

## **CLAUDE CODE CAN EXECUTE DDL VIA THE `exec_sql` RPC WITH THE SERVICE KEY , USE IT FOR VIEW CHANGES (proven 2026-08-11).**

- **THE EDITOR RUNS ONLY HIGHLIGHTED TEXT WHEN A SELECTION EXISTS**, so a stray selection silently executes a FRAGMENT and reports success. That is why the view sat at exactly 11,202 chars twice with no error shown. **Unchanged-and-no-error is the signature of a statement that never ran** , a wrong `CREATE OR REPLACE VIEW` fails LOUDLY, it cannot leave the old view intact.
- **SECOND INSTANCE, 2026-08-17, AND IT FAILED PARTIALLY RATHER THAN CLEANLY, WHICH IS WORSE.** `migrations/gk_penalties_columns.sql` (one `ALTER TABLE` adding SEVEN columns, a comment header, and seven trailing `COMMENT ON COLUMN` statements) was pasted whole and **applied NOTHING**; the verification query returned 0 new columns. **The editor displays only the FINAL statement's result**, so a file whose last statement is a comment or a verification block reports success regardless of what happened above it. Re-running the ALTERs alone in a clean window worked. **But the recovery covered only THREE of the seven columns, and the check afterwards was run on those same three** , so it returned 3 of 3, read as "the migration applied", while `starts`, `penalties_scored`, `penalties_saved` and `penalties_won` were silently absent. `penalties_scored` is the field that makes non-penalty goals derivable, so the most valuable column in the migration was the one missing.

## **THE VIEW MIXES TWO POSITION KEYS FOR ONE CONCEPT, AND THE TAG ENGINE WAS FIXED WHILE THE VIEW WAS NOT (found 2026-08-20, DOCUMENTATION ONLY, no engine change made).**

- **EVERY `percent_rank` in `player_card_view` partitions on `psc.position`, the COARSE 4-bucket column** , `pos_pct`, `posvol_pct`, `rel_pct`, `defvol_pct`. **The defender output boost is gated on `ps.pool`, the 8-bucket `position_pool`** (`base` CTE: `ps.pool = ANY (ARRAY['CB','FB','CDM'])`), and `pool_ingr` reads `pp."position"`. **So the view is not consistent with itself, never mind with the tag engine**, which was rekeyed to `position_pool` on 2026-08-15 (`vv-core.js:890`, `TAG_THRESHOLDS_POOL[pool] || TAG_THRESHOLDS[fam]`).
- **EFFECT: CB and FB are ranked in ONE `DEF` percentile; wingers, strikers and attacking mids share ONE `FWD` percentile. Every outfield card is affected.** A full-back is measured for `pos_pct` against centre-backs, then handed a boost gated on the bucket that knows they are different. **GK is UNAFFECTED** because coarse `GK` and pool `GK` are the same set, which is also why this stayed invisible while the keeper work was the thing being looked at.
- **VERIFIED LIVE 2026-08-20** against `pg_get_viewdef('public.player_card_view')` , md5 `41346d3f`, 11,915 chars, reassembled through base64 and length-asserted. Not read from a migration file.

## **The failure mode is not disagreement, it is AGREEMENT.** Every internal cross-check answers "do these two fields tell the same story". A row that is wholly someone else's tells a perfectly consistent story , wrong, and self-consistent. **Consistency is what this corruption PRODUCES, so consistency cannot be the test for it.**

- **INSTANCE ONE, the coarse-versus-pool cross-check.** Comparing `psc.position` against `position_pool` found 2 suspect cards in the PL 2025/26 block and reported the rest clean. **`Alex Telles` is stored coarse `GK` AND pool `GK` over 1,980 minutes at Leeds, passes the check, and is scored on the keeper branch and capped at 75. He is a left-back.** The cards the check CANNOT see are exactly the ones where both fields were written wrong together.
- **INSTANCE TWO, and worse because it was the correction to the first: the NAME spot-check.** Having found the block, plausibility was judged by reading the names , Pickford at Everton, Leno at Fulham , and the block was written into THIS FILE as "partial, not wholesale". **`api 803` renders as `Jordan Pickford` in our `players` table and the provider says it is `L. Pernica`.** The names came from the same corrupted import as the cards. **The check was reading the forgery to authenticate the forgery**, and it put a wrong entry in the source of truth that had to be corrected the same day.

## **A UI THAT REPORTS SUCCESS BEFORE ITS REQUEST RESOLVES IS A LIE WITH A TICK NEXT TO IT. ANY SUCCESS STATE MUST BE GATED ON A RESOLVED, CHECKED RESPONSE (2026-08-20).**

- **TWO INSTANCES IN ONE DAY, which is why this is a rule and not a bug report.** (1) **The waitlist thanks on `iwonder.html` and `myclub.html`** hid the form and printed "You're on the list" BEFORE the request was made, then swallowed every failure in a bare `.catch(function(){})`. Over quota, rate-limited or down, the visitor saw a tick and the address went nowhere , on the two pages actually collecting emails. Fixed in `a838fb6` by awaiting the fetch and branching on `r.ok`. (2) **The editorial panels**, which hid themselves on an API failure so a service outage looked identical to a card that simply has no editorial. Fixed in `a34e9b0` by naming the outage.

## **THIS IS THE SAME FAMILY AS THE SILENT NO-OPS ABOVE**, inverted: those look like nothing happened when something broke, these look like something worked when nothing did. **The second is worse, because nobody goes looking.**

- **THIRD INSTANCE, SAME DAY: `navigator.sendBeacon()` RETURNING `true` IS NOT DELIVERY (2026-08-21).** It reports **QUEUED**, nothing more. Sending from an HTTPS page to `http://127.0.0.1` was **mixed-content blocked and the payload discarded silently**, while the call returned `true` and the receiver never saw a byte. **A `fetch()` on the same route did not fail either, it HUNG** until the tool timed out, which is its own kind of lie. **The only proof of delivery is the RECEIVER confirming receipt** , the file on disk still held the earlier probe, which is how this was caught. Same rule as `r.ok` above, one layer lower: the sender's own report of success is never the evidence.

## **IN A THREE-MEMBER CLUSTER, DISTINCTNESS MUST BE CHECKED PAIRWISE ACROSS ALL THREE. SEPARATING A FROM B WITHOUT TESTING AGAINST C JUST MOVES THE COLLISION (2026-08-21, mark set).**

- **MEASURED, twice, in the same cluster.** The defender marks were The Wall, Destroyer and Ball Hawk. First cut: The Wall and Destroyer were both "a dot beside a vertical bar" and merged at 16px. The re-cut gave Destroyer an angular diagonal, which separated it from The Wall **and landed it on top of Ball Hawk**, both resolving to a diagonal stroke with a blob. **One fix, one new collision, zero net progress.** Only the third cut, checked as a set, held: a wide brick barrier, two opposed triangles, and a smooth curve.

## **THE CHECK IS N CHOOSE 2, NOT N MINUS 1.** Three members means three pairs, and the pair you did not change is the one that breaks. Render all of them together, at the smallest size they will ship at, and look at every pair.

- **THE UNDERLYING RULE IS THAT THE DIFFERENTIATOR MUST BE THE SILHOUETTE.** A shared device with a detail varied inside it fails, because the shared container dominates and the varied detail is a handful of pixels , that is how one goal frame with three different fillings produced three marks nobody could tell apart. **The finisher set only worked once the outline itself changed: three balls, a ring, a box.**

## **NULL-POOL POLICY , DECIDED 2026-08-21, OPTION E: BACKFILL THE TOP SLICE, ACCEPT THE COARSE TAIL, DISCLOSE IT. The numbers made this decision, so they are recorded with it.**

- **THE POPULATION IS HUGE AND THE PROBLEM IS SMALL, and that gap IS the decision.** **20,064 of 54,173 scored cards (37.0%) have no verified `position_pool`.** But they sit almost entirely in the tail: median rt **40** against **56** for pooled cards, and **only 82 sit at rt>=80, 8 at rt>=85, and ZERO at rt>=90.** That is **82 of the 1,462 cards at rt>=80, or 5.6%.**
- **SO THE FIX IS ONE SITTING, NOT A PROGRAMME.** Backfilling 82 cards is an afternoon. Backfilling 20,064 is not: the handover records the research confidence curve collapsing to **3% high-confidence below roughly rt 56**, and the null-pool MEDIAN is 40, so most of this population sits BELOW where research demonstrably stops working. **Option D, backfill everything, was rejected on that measurement and not on effort.**
- **WHAT WAS REJECTED AND WHY.** **A, leave the coarse fallback** , the repartition model moved **11,992 null-pool cards UP by a mean of +1.35 with exactly ONE falling**, purely because their comparison set empties as pooled cards leave; nobody chose that. **B, exclude them from the percentiles** , needs a second scoring path that does not exist, and 20,064 cards would lose an rt. **C, freeze them** , two regimes coexisting for ever and unexplainable on a public surface. **F, a parallel coarse partition** , defensible, but two schemes to maintain and explain for a population that is 5.6% of the visible ladder.



---

## RELOCATED FROM `CLAUDE.md` §C ON 2026-08-24 , ENGINE / BANDS NARRATIVE

The RULES stayed in §C, byte-identical as headlines. What moved is the measurement and the
reasoning behind them, in the same shape as the 2026-08-16 `SILENT_FAILURES.md` split.


### Engine recalibration , the six decisions and the evidence behind each

- **Engine recalibration DESIGN LOCKED (2026-07-08, Fable session) , full detail in `VVonderXI_Engine_Design_Log.md` (repo root, authoritative).** 4 decisions: (1) DEFENSIVE SIGNAL = SHARE-of-team-defending (opportunity-adjusted volume , player's per-90 defensive actions / team's per-90, percentile within pool; corrects the denominator like per-90 corrects for minutes, stays team-agnostic , refines the "raw per-90" note above) + duel-win-rate quality; (2) position-aware weighting + goals-primacy gravity; (3) ENDOGENOUS league strength with a circularity guard; (4) 6-stage implementation order. NEXT EXECUTABLE = Stage 0/1 (snapshot + ingredients-only view columns). Design done. **UPDATE 2026-07-09 (Decision 4/Option A, LOCKED, evidence-driven , see design log + §F):** Stage 0/1/1b EXECUTED (inspection columns only, rt UNTOUCHED). The share-of-team-defending innovation does NOT rescue van Dijk; NEITHER volume-share NOR duel-quality discriminates CB class (they capture archetype); team goals_against is a TEAM property (confound-proven , elite CBs on mid sides 1.57 GA/g vs journeymen 1.51). SO: def_signal stays a MODEST, DISCLOSED input (workload/archetype, not a class verdict); goals_against REJECTED for individual scoring; "van Dijk 85+" target RETIRED (disclose, don't fabricate). Stage 2 = integrate a bounded def_signal into position-aware weighting, NOT "find the magic formula." **UPDATE 2026-07-10 (DECISION 6, SHIPPED):** Stage 2 LIVE , bounded def_core + best-of + league-scaled defender output boost (LEAST(12,0.45*gaw*wt^3.5)). van Dijk ~70/74, TAA 85, Grimaldo 79, peaks unchanged, CB mean 46.7->~56. **UPDATE 2026-07-10 (DECISION 7, SHIPPED): league weights now COMPUTED (Stage 3 built + live) , placeholder ladder retired.** Endogenous league strength from mover least-squares (scoring-env-corrected, alpha=0.5), anchored PL=1.00, in engine_league_weights. Sockets re-tuned for the spread range (tilt 0.5->0.35, boost exp 3.5->2.5). Peaks held (Messi 97), weak leagues settle ~1-3 lower, Grimaldo Benfica22 78->71. Migration migrations/stage3_league_strength.sql. Engine Stages 0-3 done + live.

**Search (both surfaces query the matview directly; matching logic is SHARED in vv-core)**


### The tag-recalibration warning that was wrong, and the two baselines

- **THE 2026-08-21 "TAG RECALIBRATION IS NOW REQUIRED" WARNING WAS WRONG, AND IT IS KEPT HERE AS A CORRECTION RATHER THAN DELETED, BECAUSE THE REASONING ERROR IS THE USEFUL PART.** The claim, written the same day the engine changed and BEFORE anything was measured, was that the repartition and the `gaw` penalty weighting had moved the ground under the tag thresholds, that **"`gaw` no longer means what it meant when those bars were cut"**, and that no tag percentage recorded before that date could be quoted as current. **Measured the next day, on all 57,234 cards: the engine change moved SEVEN CARDS ACROSS TWO TAGS.**  **, evidence in `RULE_EVIDENCE.md`**
  - **SO THE GENERAL RULE: BEFORE DECLARING A DOWNSTREAM CONSUMER AFFECTED, GREP THE CONSUMER FOR THE FIELDS THAT ACTUALLY CHANGED.** A warning recorded here is acted on by every later session; a wrong one costs a re-audit and, worse, teaches the next reader to distrust numbers that are correct. **This is the same failure the "a statement attributed to the docs must be checked" rule names, committed by the session writing the doc rather than the one reading it.**
  - **QUOTE THE 2026-08-21 BASELINE, NOT THE 2026-08-13 ONE , `scripts/enrichment/tag_distribution_2026-08-21.txt`.** The 08-13 file predates BOTH the rarity pass and the identity fix, so against it two correct changes read as collapses (Ball Hawk 3.49 -> 1.47, The Dribbler 3.82 -> 1.61) and **a RETIRED tag reads as a total collapse (Marksman 1,649 -> 0)**. Post-pass state: no tag over the ceiling except **Iron Man at 3.40%, the documented exception, unchanged**; the four below-band identity archetypes still below by design; 15.23% of cards hold at least one tag.


### The rarity ceiling , the four below-band archetypes and why they stay

- **THE RARITY BAND IS A CEILING, NOT A TARGET. NO TAG SHOULD EXCEED ROUGHLY 2%; THERE IS NO FLOOR, AND A TAG SITTING BELOW THE BAND IS NOT A DEFECT TO TUNE AWAY (corrected 2026-08-16).** The old wording , "all tags in a 1-2% rarity band" , was **overstated and was overstated before the identity fix**: measured live on all 57,234 cards, **Maestro 0.67%, The Winger 0.52%, Poacher 0.47% and Ball-Playing CB 0.36%** all sit below it, and all four did so beforehand. The 2026-08-14/15 rarity pass tuned the tags that were **OVER** the ceiling and never claimed to lift anything up to it.
  - **THE FOUR BELOW-BAND TAGS ARE NARROW IDENTITY ARCHETYPES, AND THAT IS WHY THEY ARE RARE.** Poacher, Ball-Playing CB, The Winger and Maestro each name ONE position doing ONE recognisable thing. **RARITY FOLLOWS THE ARCHETYPE** , how many cards hold the tag is a property of how many players actually are that thing, not a dial.
  - **FORCING THEM UPWARD WOULD ADMIT PLAYERS WHO ARE NOT THAT THING, WHICH IS PRECISELY THE ERROR THE IDENTITY-VS-ABILITY FIX JUST REMOVED.** Loosening Maestro to reach 1% means calling someone a conductor who does not conduct; the same move on Ball-Playing CB re-admits the full-backs that fix just excluded. **A tag that is below band is doing its job. Leave it.**
  - **SO THE ONLY RARITY QUESTION WORTH ASKING IS "IS ANYTHING OVER ~2%".** Do not audit for under-band tags, and do not write "all tags sit in a 1-2% band" into any doc or copy again , it is not true, and acting on it damages the tags it names.


### Rendering and measuring in a real browser , and the five harness false alarms

- **A VISUAL CHANGE IS NOT VERIFIED UNTIL IT HAS BEEN RENDERED AND MEASURED IN A REAL BROWSER (2026-08-16, promoted out of §F).** Reading the markup and probing a DOM shim both missed defects that a real layout exposed immediately: the grey trajectory line escaping its panel, a light-mode chip state, and two touch targets under the 44px guidance. Serve the page (`python3 -m http.server`) and measure the rendered geometry.
  - **AND HOLD THE INSTRUMENT TO THE SAME STANDARD AS THE CODE.** On 2026-08-16 two "defects" were the harness misreading (a click that closed the fold, an element scrolled out of an iframe). On 2026-08-17 three more were: `pgrep -f <script>` matched **its own shell** and reported a finished job as running; a log parser using `[A-Z]+` silently dropped **L1**, reporting Ligue 1 as an entirely skipped league when all 16 of its seasons had run; and a stuck CSS transition in a throttled background tab produced a border colour that did not exist in any rule. **A fresh element, a second source, or a positive control settles it , see the missing-signal rule below.**


### Compare VERDICT layer , the full locked design, all 14 tags and their exact triggers

**Compare VERDICT layer (design LOCKED 2026-07-19, SHIPPED 11fd7c3 , promoted here from the archived session log; do NOT re-derive)**
- **14 VERDICT_TAGS**, single source in vv-core, each `{name,emoji,blurb,drury,trigger}`: **6 gap-LADDER** (DETERMINISTIC by |rt gap|: Masterclass >=10, Bragging Rights 7-9, Clear Edge 4-6, Photo Finish 2-3, VAR close call 1, The Debate Lives On 0); **5 CONTEXT** (AI-SELECTED, judgment, no numeric trigger: Different Worlds, Class Across Eras, League Strength Tips It, The Eye Test Deceives, Complete Package vs Specialist); **3 AGE** (DETERMINISTIC, below).
- **ROUTE C hybrid:** ladder + age fire deterministically compare-side (`verdictContext`); context tags are AI-picked from an eligible set; the AI always writes the Drury prose. **PRIORITY when several fit (LOCKED): CONTEXTUAL > AGE > LADDER** (most characterful wins; ladder is the floor/default). Chip is client-robust: `verdictContext.floorTag` renders the deterministic tag even on the 48 tagless pre-change cache rows (see the verdict_cache prompt-bump DEFERRED item).
- **CLOSE-CALL TONE buckets** feed the prompt register: 0 tie / 1-2 razor (finest-margins) / 3-6 clear / 7+ decisive.
- **AGE-AS-TIEBREAKER , LOCKED + BOUNDED.** Applies ONLY when rt gap <=2 AND age diff >=4y -> the YOUNGER player wins the coin-flip (the equal-ish season at a younger age is the harder feat). NEVER at gap >=3 (higher rt wins; age is colour only). Does NOT add points, does NOT enter or shift rt. **Age lives in the VERDICT layer ONLY** , consistent with the Wonderkid TAG (age is a tag/verdict signal, never an rt input). Read-out proof: Yamal '25 (rt88, age18) vs Son '24 (rt89, age31), gap 1 -> tiebreak names Yamal; would NOT fire at gap >=4.
- **THE 3 AGE TAGS (exact triggers):** (1) **The Prodigy's Edge** (teen phenom): gap <=3 AND younger <=21 AND >=4y younger , "To command this stage at nineteen, the years ahead should frighten us all." (2) **Twilight Brilliance** (veteran): gap <=3 AND older >=33 AND >=5y older , "They said the legs would fade. The refusal does not fade." (3) **The Ascendant** (22-25 riser, NOT teen): gap <=2 AND >=5y gap favouring youth AND younger >21 , "One is the finished portrait; the other still being painted, and already this good." Distinct/non-overlapping: Prodigy=teen, Ascendant=young-adult, Twilight=veteran.


### Comparing CSS rules by selector , all three failures and the 58-rule outcome

**COMPARING CSS RULES BY SELECTOR IS WRONG THREE WAYS, AND I HIT ALL THREE IN ONE DAY (2026-08-23). THE THIRD ONE HAPPENED AFTER THE LESSON WAS ALREADY WRITTEN DOWN.**
- **THE TASK: find rules identical across card.html, rankings.html and compare.html so they can move into `VV_CARD_CSS`.** Sounds like a set intersection on selectors. It is not.
- **(1) THE COMMENT IS NOT PART OF THE SELECTOR.** The parser took everything before `{` as the prelude, so a rule written identically in three files but commented differently read as three different selectors and never qualified. Cost: the mark-sizing rules stayed in the pages, and a card on a new surface rendered its marks at the intrinsic **254px instead of 12px**, blowing the prestige row to 0.98 of the card width.
- **(2) THE SAME SELECTOR APPEARS AT DIFFERENT DEPTHS AND MEANS DIFFERENT THINGS.** `.vvcard` occurs 4 to 6 times per page , once at top level and again inside media queries with different declarations. A flat scan moved the wrong instance and DELETED page-specific rules that were never added anywhere (`rankings .vvcard{cursor:pointer}`, `compare .vvcard{cursor:default}`). **Only depth-0 rules that occur EXACTLY ONCE in a file are safe to compare.**
- **(3) AND THE ONE THAT MATTERS MOST , I RECORDED THE FIX FOR (1) IN THE SOURCE AFTER PASS TWO AND DID NOT RE-RUN PASS THREE WITH IT.** The comment in `vv-core.js` says "compare DECLARATIONS, and normalise the selector before comparing it" and the very next extraction did neither. **Writing a lesson down is not applying it. If a rule is discovered mid-task, the work already done under the old rule has to be REDONE, not just annotated.**
- **THE OUTCOME, AND IT IS A LIMIT NOT A WIN: the last four rules CANNOT be moved.** `.vvcard` carries `width:var(--cw)`, `max-width:92%` and `height:calc(var(--cw)*1.397)`, and moving it into a PREPENDED sheet inverts the cascade against page rules that used to follow it , the live card went from 304x461 to **206x395, ratio 1.917, radius gone**. Reverted. **`VV_CARD_CSS` holds 58 rules and the card box stays in the pages.** A new surface must therefore still supply the box itself, which is the standing cost of not finishing this.
- **THE RENDERED CARD RATIO IS 1.518, NOT 1.397, AND BOTH NUMBERS ARE CORRECT.** Height is `--cw x 1.397`; width is clamped by `max-width:92%` to `0.92 x --cw`. So `461 / 304 = 1.518` is what a share frame must be sized against. **Do not read 1.397 off the CSS and size an image with it.**


---

## THE API-FOOTBALL KEY EXPOSURE , THE EVIDENCE (relocated from `CLAUDE.md` §D, 2026-08-25)

**The RULE stays in `CLAUDE.md` §D BUILD TRACK step 6 , 'not in the repo' is not 'not leaked'. Only the repo-side checks moved here.**

- **[SETTLED 2026-08-20] THE API-FOOTBALL KEY WAS GENUINELY EXPOSED, AND THE DOC AND THE REPO WERE BOTH RIGHT.** Every repo-side check is clean , not in HEAD, not in git history (`git log --all -S` returns 0), never in any HTML, `.env` gitignored and untracked. **The exposure was in a CHAT TRANSCRIPT, never committed**, which is exactly why the searches came back empty and why the 2026-08-09 handover could not substantiate it. **So rotation IS required and the repo can never show it.** **OPERATIONAL CONSTRAINT: rotate only when NO BACKFILL IS RUNNING** , a rotation mid-run kills every in-flight request and the enrichment scripts checkpoint per league-season, so a half-written run is the expensive failure. **GENERALISE IT: 'not in the repo' is not 'not leaked'. A secret can escape through a transcript, a screenshot or a paste, and no amount of grepping HEAD will ever see it , ask where it was USED, not only where it was stored.**


---

## THE LOADER MONOGRAM GEOMETRY , THE FULL TRACE (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**THE LOADER MONOGRAM'S GEOMETRY IS LOCKED. IT HAS BEEN GOT WRONG THREE TIMES, SO EVERY ELEMENT IS RECORDED WITH THE REASON IT EXISTS (locked 2026-08-25, live in `vv-core.js` as `VV_V1`/`VV_V2`).** Do not re-derive it, do not nudge it by eye, and do not rescale either V , the rescale is what destroys the stroke asymmetry the trace exists to preserve.
- **THE TWO Vs ARE MIRRORED, NOT TRANSLATED. This is the correction, and the two earlier traces both got it wrong the same way.** Fitted against the ONE pink arm the cream V never occludes (the outer-right), a mirror predicts its two edge slopes to within **0.038** and a translation is off by **0.129**. **The stroke widths settle it independently: the pink V's RIGHT stroke measures 89-93 against the cream V's LEFT stroke at 97-103, not against the cream's right at 77-80.** A translated copy puts the heavy stroke on the same side of both Vs; the asset puts them on opposite sides. **A mark measured only where the two shapes overlap cannot tell mirror from translation , find the arm that is never occluded and fit THAT.**
- **NO VERTICAL OFFSET.** Both Vs top out on the same line. **The 6px drop an earlier trace recorded on the second V was the mirror being misread as a translation**, not a real offset.
- **THE INNER ARMS DROP 43 SOURCE UNITS; THE OUTER ARMS RUN FULL HEIGHT.** Measured directly on V1 (left arm present from y=4, right arm first appearing at y=47) and inherited by V2 through the mirror, **because V2's inner-left arm is fully occluded in the asset and cannot be measured at all** , the pink run that appears to emerge tracks the cream's right edge to within 1-2px the whole way down, so it is an exposed sliver, not an edge. **THIS ASYMMETRY IS WHY THE LOCKUP READS AS A W RATHER THAN AS TWO Vs. It is not decoration.**
- **SEAM OFFSET IS 218.5, WHICH IS THE ASSET'S OWN NUMBER AND NOT A DERIVED ONE.** Fixed against two landmarks the cream V does not cover: the pink apex at x=350.5 gives **219.6**, the pink outer-right at x=523 gives **217.3**. **A seam DERIVED from the drop instead (`328.5 - 0.9588 x 43 = 287.3`) separates the two Vs until they read as "V V", which is the one thing the drop exists to prevent** , and a true edge-to-edge touch (305.9) is further apart still. Rendered side by side at 40px and 150px in both themes, **only 218.5 reads as a W.** **THE GENERAL POINT: a number derived from a formula is a PREDICTION, and the asset is the measurement. When they disagree, measure a landmark the formula never touched.**
- **ASYMMETRIC STROKE WEIGHT STAYS, LEFT HEAVIER THAN RIGHT** , ratio **1.27 at the drop easing to 1.21** further down. Fitted edges, source units, top of mark at y=0: outer-left `x = 0.5160y + 0.204`, inner-left `x = 0.4874y + 99.37`, inner-right `x = -0.4698y + 248.82`, outer-right `x = -0.4428y + 324.91`. Mark measures **524.0 x 338.7**, ratio **1.547**, normalised onto the 24x24 grid. **The asset's own single-V width and height are 324.7 x 338.7, not the 328.5 x 343 an earlier spec assumed** , a 1.2% difference, and the narrowing rate 0.9588 matches exactly, which is how both were confirmed to be the same trace.
- **THE BASE V IS ALWAYS PRESENT.** Pink wipes right to left over it via `clipPath`, so **the mark never disappears , only the colour moves.** The reduced-motion still state hides the pink copy of V1 only, leaving base-left plus pink-right, which is the logo's own arrangement.


---

## THE html2canvas SWEEP , METHOD, CONTROLS AND MEASUREMENTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**THE FULL html2canvas SUPPORT SWEEP, MEASURED IN ONE PASS (2026-08-27). THREE DIVERGENCES HAD BEEN FOUND ONE SCREENSHOT AT A TIME; THIS IS THE REST.**
- **THE METHOD, and it is reusable: render every feature as a WITH / WITHOUT pair designed to look obviously different, capture once, then compare each pair INSIDE THE CAPTURE.** A pair that becomes identical there is a feature the capture dropped. **TWO CONTROLS GUARD IT** , a red/blue pair that must read different and an identical pair that must read the same. Live in `_demo_h2c_audit.html`; the check now also ships as `VVCore.vvAuditCaptureSupport`, which warns once per surface naming the element.
- **DROPPED , the capture draws NOTHING:** `<use>` references, **CSS `mask-image`**, **CSS `clip-path` (polygon)**, **`mix-blend-mode`**, **`background-blend-mode`**, **CSS/SVG `filter`** (both `blur` and `drop-shadow`).
- **KEPT , verified rather than assumed:** SVG `clipPath` on a `<g>` (so the club shield's split shape is safe), SVG `text` `paint-order:stroke`, `background-clip:text`, `overflow:hidden` clipping a child, `conic-gradient`, `text-shadow`, `transform`, group `opacity`, and OUTSET `box-shadow`.
- **THE METRIC'S LIMIT, AND IT MATTERS: IT DETECTS "DROPPED", NEVER "DRAWN WRONGLY".** The isolation pair for a rounded inset `box-shadow` reported KEPT , and on the real card that same rim is **absent from the corner entirely** (measured: ZERO gold pixels in the top-left 70x70 without `vvShimInsetRims`, 370 with it). **A feature can pass this harness and still be wrong in the real composition, so it is not a substitute for reading a captured PNG.**
- **AN ACCEPTED EXCEPTION, WITH ITS NUMBER: the squad shield's `filter: drop-shadow(rgba(0,0,0,.32) 0 4px 9px)` IS dropped, and it does not matter.** Rasterised with and against on the card's own dark ground the shadow moves the image by a mean of **0.31/255 and a max of 8/255** , imperceptible. **Blur cannot be shimmed**, so faking it means a hard-edged shadow where a soft one belongs, which would be a visible artefact traded for nothing. **Left as is. Do not "fix" it.**
- **AND THE ONE THING THIS SWEEP DID NOT FIND: the reported grey box behind the squad number could NOT be reproduced**, on the raw card capture or the shimmed share capture. What looked grey to a first pass was the card's own radial gradient (`#2c2824` at the top), which a loose neutral-colour detector matches. If it reappears, capture the frame and diff it against a clone of the SAME region , a crop of the badge alone against a crop of the badge IN CONTEXT is not a comparison, and that mistake produced a false positive here.


---

## THE THREE SVG CONTRAST INSTRUMENT FAULTS , THE NUMBERS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**A CONTRAST AUDIT NEEDS THREE THINGS RIGHT ON SVG, AND GETTING ONE RIGHT IS NOT ENOUGH. EACH FIX EXPOSED THE NEXT (2026-08-23/24).**
- **(1) THE INK IS `fill`, NOT `color`.** `getComputedStyle(el).color` on an SVG `<text>` returns the INHERITED text colour, which the element never paints with. It reported the G+A axis label at **1.82** when it is **3.63** , the charcoal it measured appears nowhere on screen.
- **(2) THE GROUND IS SIBLING GEOMETRY, NOT A CSS BACKGROUND.** Fixing (1) alone produced **NINE FALSE FAILURES** in one run. SVG text sits on `<rect>` and `<path>` fills inside the same `<svg>`; walking CSS ancestors falls through to the page and invents a ground. A white shirt number on a club shield was scored against the cream panel BEHIND the svg and reported at **1.2** when the real pair is white on blue at **8.35**. **HIT-TEST INSTEAD:** take the painted shapes in the same `<svg>` whose box contains the text's centre and use the TOPMOST, which in SVG is the LAST in document order.
- **(3) AND A STROKE CARRIES LEGIBILITY THAT A FILL-ONLY MEASUREMENT CANNOT SEE.** The card badge's number is white with an opaque black outline precisely so it reads across a split shield's seam. Measuring fill-versus-ground called that **1.93 and a defect**; it is neither. **A glyph is legible if EITHER its fill or its outline separates from the ground** , that is the design language, and the audit has to score both. Checked that way: 28 distinct ink/ground pairs across every club colour, ZERO failing.
- **SO THE PATTERN, AND IT IS THE POINT: an instrument that is wrong in one way hides the ways it is wrong in the others.** Each correction made the next visible and each intermediate state produced confident, wrong numbers. **The errors ran in BOTH directions** , (1) and (2) overstated and bought fixes nobody needed, while a fill-only reading of an outlined glyph would understate a real one. **Do not trust a contrast figure for anything inside an `<svg>` unless all three are handled.**


---

## THE FIXED-GROUND INSTANCES , THE MEASURED RATIOS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**A TOKEN THAT FLIPS WITH THE THEME IS WRONG ON A GROUND THAT DOES NOT. THIRD INSTANCE, AND THE THIRD ONE FAILED IN A WAY NO CONTRAST CHECK COULD SEE (2026-08-24).**
- **The rule is one line: match the ink to the GROUND, not to `body.light`.** A surface that keeps one colour in both themes needs an ink pinned to that colour; a surface that follows the theme needs the token. Getting it backwards is invisible in whichever theme you happened to be looking at.
- **THE THREE:** the playbook display case and prestige hero, charcoal in both themes, took light-mode `--ink-soft` and rendered at **1.72 and 1.77**. The card's waiting box was styled with a 5% WHITE fill and a border-COLOUR with no width, invisible on cream **from the day it shipped**. And the loader's base V, keyed to the theme, went CREAM on card.html's glance panel, which is cream in both themes , the base vanished and only the pink wipe was left.
- **THEN `currentColor` LOOKED LIKE THE GENERAL FIX AND WAS WORSE, BECAUSE IT INHERITS FROM THE PROSE RATHER THAN THE PANEL.** `.gdrury` is pink-inked editorial voice, so the base V took `--pink-ink` and sat at **1.59 against the pink overlay** , a TWO-TONE mark rendering as ONE TONE. **NO CONTRAST CHECK ON THE TEXT WOULD EVER CATCH THIS: the text was fine, the ground was fine, and every ink on the page passed AA.** The defect is between the mark's own two halves, which no text-vs-ground audit looks at.
- **SO A MULTI-INK OBJECT NEEDS ITS PARTS CHECKED AGAINST EACH OTHER, not only against the ground.** Three pairs, not one: base to ground, overlay to ground, and **base to overlay**. The loader now takes an explicit ink and the card passes its panel's charcoal; measured 14.31 and 17.20 to ground, 3.89 and 4.67 for the pink, **3.68 base to overlay**.
- **AND THE INVERSE IS EQUALLY WRONG , DO NOT PIN AN INK ON A GROUND THAT MOVES.** Hardcoding `var(--cream)` for the compare verdict put a cream mark on the LIGHT panel at **1.13**, because that panel does follow the theme. Pinning is correct ONLY where the ground is fixed.


---

## THE GENERATIONAL FACE TRAP , THE MEASUREMENTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**A CARD RULE THAT LIVES IN THE PAGES AND NOT IN `vv-core.js` IS A TRAP FOR THE NEXT SURFACE, AND THE GENERATIONAL FACE WAS ONE (2026-08-27). FIXED , the rule now sits beside its sibling in `VV_CARD_CSS`.**
- **THE ASYMMETRY WAS THE WHOLE DEFECT.** `body .vvcard.iconic{...}` had always lived in `VV_CARD_CSS`; `body .vvcard.gen{...}` did not , it was copied into each PAGE instead. Meanwhile **six `.gen` ink rules in vv-core are pinned LIGHT** (`.yr`, `.n`, `.vv .a`, `.cga .col .l`, `.cname .full/.sub`, `.pos`) because they assume the dark face vv-core never supplied. **Same §C class rule as always: a rule stated in one place and not applied to every member of its class will be violated everywhere else.**
- **WHAT IT COSTS WHEN THE RULE IS ABSENT: `body.light .vvcard` wins, paints the face CREAM, and those six inks stay cream , year, score, labels and club line all vanish at 1.09 contrast against 14.99 in dark.** Measured on a scratch page that loaded vv-core alone, which is exactly what a new surface looks like. **The three live pages were never affected** and neither was the shipped share image, because each page carried its own copy.
- **AND THE COPIES HAD ALREADY DRIFTED, WHICH IS THE ARGUMENT AGAINST DUPLICATION IN ONE LINE.** Five pages carry it: `card`/`compare`/`rankings` have the gold inset rim with `!important`; **`preferences`/`myclub` have a flat 1.5px outline and no `!important`**, so a Generational card is rimmed differently depending on the page. The page copies were LEFT IN PLACE (identical to the new vv-core rule on the three that matter, so nothing moves); the drift is logged in §D rather than silently overwritten.
- **THE LESSON FOR ANY NEW SURFACE: `VV_CARD_CSS` must be sufficient on its own.** §C already says the card BOX stays in the pages and a new surface must supply its own; **a prestige FACE is not part of the box and must not have been left there.**


---

## THE SHARE-FRAME TYPE AND OVERFLOW MEASUREMENTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**THE SHARE FRAME IS JUDGED AT 600px, NOT AT 100%, AND ITS TEXT MUST NEVER BE `nowrap` (2026-08-26).** Two rules from one pass, both of which will bite again the moment the frame is redesigned.
- **X RENDERS A SHARED IMAGE INLINE AT ROUGHLY 600px, HALF THE 1200x675 FRAME, SO EVERY TYPE SIZE IS HALVED BEFORE ANYONE READS IT.** The shipped coefficients put the caption at 18px and the wordmark at 16px , **9px and 8px as actually seen.** Sizes live in `SH_TYPE` as fractions of the frame's SHORT side so the three cannot drift. **Judge any change to them at 600px wide; the file is never the thing anyone reads.**
- **`white-space:nowrap` ON A LINE WHOSE CONTENT VARIES IS AN OVERFLOW WAITING FOR A LONGER NAME, AND nowrap OVERFLOWS RATHER THAN CLIPS, SO IT BLEEDS OFF THE IMAGE SILENTLY.** On the square formats the short side IS the width, so type scales up while the room does not: measured, one long card name overflowed the Instagram frame by **155px** and a long compare pair by **779px**. The caption block now takes an explicit width (frame minus padding) and wraps. **An explicit width is required, not just `max-width`** , shrink-to-fit put a long name on FOUR lines where a real width puts it on two.
- **AND `vvCentreShareCaption` MOVES THAT BLOCK UNDER THE CARDS, SO IT IS CLAMPED TO THE FRAME.** A full-width block centred on a left-sitting card pair would leave the frame. When the block is as wide as the padded area there is nowhere to move and it stays frame-centred, which is the correct degenerate case.
- **A CONTAINER NAMED FOR A JOB IT DOES NOT DO IS ITS OWN TRAP.** `card.html` wraps the card and its tagline in `id="shareCapture"`, but the capture composes a SEPARATE frame in vv-core and never reads that element , so the preview showed a tagline the PNG never contained. **The name is the reason nobody checked.**


---

## SEASON SEARCH , THE FULL PARSING BEHAVIOUR (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **SEASON SEARCH (2026-07-24):** `vvParseSearch(q)` splits a query into `{nameQ, seasonYear}`. **CORRECTED 2026-08-13: a BARE year now means the season ENDING in it** , "19" is 2018/19, "22" is 2021/22, so `season_year` (the starting year) is one LESS than the token. People say "Messi 19" meaning the season that finished in 2019. The old reading ("23"->2023->2023/24) is superseded. **The SPLIT form is unchanged and must stay so: "23/24"/"2023/24" takes the START year directly**, which is why the adjustment lives in `vvSeasonFromBareYear` at the bare-token call site and NOT inside `vvYearFromDigits` , subtracting there would have broken the split form. **This changed rankings too**, since both surfaces share `vvParseSearch`; year-shaped tokens OUT of range are dropped (ignored, never name text); a bare year filters to that season. Applied server-side via `.eq('season_year', y)` (no schema change , season_year is already the era-filter column). Graceful degrade: an in-range season with no matching row for that name drops the season filter and shows all + a "No 23/24 season for that search , showing all" hint (both surfaces). Picker applies it in loadPool (server) + renderPicker (client re-filter uses the PARSED name, not the raw text).


---

## NULL-POOL IDENTITY TAGS , THE COUNTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **NULL-POOL CARDS NEVER RECEIVE AN IDENTITY TAG. A CARD WITH NO VERIFIED POSITION CANNOT BE SAID TO OCCUPY ONE (2026-08-16).** 20,143 cards (35.2%) have no pool, and the coarse field is exactly the one that cannot tell ST from Winger, or CB from FB , so a coarse fallback on an identity tag is a guess wearing the tag's authority. It was handing out **The Winger 52, Poacher 37, Ball-Playing CB 14**, all unverifiable by construction.
  - **THIS PRINCIPLE WAS ALSO ALREADY STATED ONCE AND NOT GENERALISED** , the `theWall`/`ballHawk` comment says *"null-pool MIDs excluded (under-tag rather than mis-tag attacking mids)"*, applied to that one branch. Same failure as the rule above, in the same function, on the same day.
  - **DO NOT RE-ADD A COARSE FALLBACK TO AN IDENTITY TAG** to lift its count. Under-tagging is the correct behaviour here; see the rarity CEILING rule above, which says a low count is not a defect.


---

## THE PRESTIGE TAG-CAP EXEMPTION , THE COUNTS AND THE FOUR PATHS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **PRESTIGE IS EXEMPT FROM THE ROW TAG CAP (rankings), and it is exempt because it was being DROPPED, not mis-ordered.** Row priority was honours -> prestige -> profile with prestige rendered only if slots remained, so a card with cap-many honours lost it entirely , the rt 97 top card showed no GENERATIONAL at all. Prestige now renders FIRST and outside the cap (12 Generational, 138 Iconic; `renderPrestige` returns '' otherwise). **Accepted consequence: a prestige row shows cap+1 pills.** **There are FOUR tag-render paths and a fix must be checked against all four** , `vv-core:srtags` (season row), `vv-core:utags` (list/pill row), `vv-core:chtagcell` (card face, where prestige is its own row and never entered the budget), and compact mode (renders none). A first pass fixed one row template and still reported success.


---

## THE RAW-FLOOR NULL SENSITIVITY , PER-TAG COUNTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **A RAW FLOOR IS NULL-SENSITIVE ONLY WHEN IT READS A DIFFERENT FIELD FROM ITS RATE GATE (2026-08-15).** All six floors added in the rarity pass were briefly written NULL-REJECTING and it changed exactly ONE tag: **Playmaker lost 28 holders purely for unrecorded assists**, violating the locked NR-is-not-zero rule (assists are 54.2% null). For Provider, The Dribbler, Ball Hawk and The Wall the floor reads the SAME field the rate gate reads, so a null already fails upstream and the exemption is never consulted , **0 cards recovered on each.** All floors now go through `rawFloorOK`. **`GOAL MACHINE` IS THE ONE EXEMPTION AND MUST STAY NULL-REJECTING** , its floor is the ENTIRE rule with no rate cut, so exempting null would hand the tag to all 466 eligible null-goal cards.


---

## IRON MAN AT 3.40% , THE REJECTED ALTERNATIVE AND THE CARDS IT COST (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **IRON MAN IS A DELIBERATE EXCEPTION TO THE ~2% RARITY CEILING. DO NOT "FIX" IT BACK (2026-08-15).** It sits at **3.40%** (`minutes_p90 x1.10`). **x1.15 lands it at 1.71%, under the ceiling, and was REJECTED.** Availability is structurally common in a way no other tag's signal is , the tag means "played every week", and a season-long ever-present is not a rare event. **Forcing it into band stripped the LAST tag from 84 elite cards (rt>=85)**, 45 of which held Iron Man and nothing else: Rashford 2223, Mane 2122, Bowen 2122 and 2324, Gordon 2324. **That is buying rarity with coverage at the top of the scale, which is the wrong trade for this tag specifically.**


---

## THE RIPPLE SNAPSHOT , THE WRITES IT CAUGHT (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **A TARGET-ONLY SNAPSHOT CANNOT SEE A RIPPLE. SNAPSHOT ALL 57,234 CARDS BEFORE AND AFTER ANY WRITE, NEVER JUST THE ROWS YOU TOUCHED (2026-08-13, promoted out of §F 2026-08-14).** The tier-1 position write changed 351 rows and **137 UNTOUCHED cards moved**, two of them across a public band (Samatta 1819 and Borini 2223, both 85 -> 84). **A 351-row snapshot would have reported a clean, small, well-behaved write and missed every one of them.** Paginate past the 1000-row cap, read the file back off disk and assert it row-for-row before trusting it. Used again on 2026-08-17 to prove the keeper/penalty backfill moved rt on **0 of 57,234** cards.


---

## THE INTERLOCK FLOOR , THE PER-SIZE MEASUREMENTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

**THE INTERLOCK DIES BELOW 40px. A 16px MONOGRAM IS NOT A SMALL MONOGRAM, IT IS A DIFFERENT MARK (measured 2026-08-23).**
- **The identity is the knocked-out overlap** (see the rule directly below), and that knockout is the FIRST thing scaling destroys. Rasterised and scanned across the middle of the mark, counting separate ink runs and the deepest alpha inside its span:

| px | 16 | 20 | 24 | 28 | 32 | 40 | 48 | 64 |
|---|---|---|---|---|---|---|---|---|
| interlock reads | no | no | barely | no | barely | **yes** | **yes** | **yes** |
| deepest cut | 0.50 | 0.50 | 0.25 | 0.62 | 0.38 | 0.13 | **0.00** | **0.00** |

- **At 48px the knockout cuts clean through, at 16px antialiasing fills the seam and the two Vs merge into one blob.** `VV_LOADER_MIN = 40` in `vv-core.js` is that number, and **`vvLoader()` CLAMPS a smaller request UP rather than honouring it** , a caller asking for 24px has misunderstood the mark, and quietly handing them a blob would hide the mistake instead of surfacing it.
- **SO SMALL CONTEXTS GET A DIFFERENT THING, NOT A SHRUNKEN MONOGRAM , `vvLoaderBars()`**, three bars, no brand claim. Buttons and inline text are exactly the sizes that cannot carry the interlock. **This is the SAME LOGIC as the single-colour translation below**: use the form the context can actually carry, and do not make a claim the pixels cannot support.
- **DO NOT "fix" the small case by widening the knockout for a second, small-size drawing.** That is two drawings of one thing, which is precisely the defect the display-case trophies had , the page and the pills had drifted apart and nothing would ever have said so.


---

## THE TWO-FIELDS DEFECT , THE PER-TAG NUMBERS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **WHEN A RULE READS TWO FIELDS FOR THE SAME CONCEPT, CHECK THEY AGREE BEFORE TUNING ANYTHING DOWNSTREAM (2026-08-15). The tag engine did not, and it cost a whole audit.** After the threshold rekey, `eligibility()` still read the COARSE `position` field while `TAG_THRESHOLDS_POOL` read `position_pool`. **A miscoded card was ADMITTED by one field and JUDGED by the other, so it drew whichever bar was easiest.** An ST-pool card carrying coarse MID was eligible for Engine Room (a MID-only tag) but judged against ST's `passes90_p80` of 28.2 instead of MID's 51.9, and cleared trivially , 198 Engine Room holders sat in the ST pool.  **, evidence in `RULE_EVIDENCE.md`**
  - **GENERALISE IT: two fields for one concept is a defect even when both are populated.** The pair only has to disagree on a minority of rows to corrupt the tail, and the tail is exactly where a rarity audit looks.
  - **RUN THIS DIAGNOSTIC ON IDENTITY TAGS ONLY. POINTED AT ABILITY TAGS IT REPORTS THE DESIGN AS A DEFECT (2026-08-21).** Re-run across all eighteen tags, it flagged ELEVEN , Iron Man 65.2%, Provider 50.9%, Goal Machine 50.0%, Playmaker 47.2%, Complete 46.3% , and **every one was the test aimed at the wrong class.** The rule directly above says ability tags gate on family and SHOULD span pools, so a high minority share there is the tag working. **Iron Man spanning every pool is availability doing what availability does.**


---

## THE IDENTITY-VERSUS-ABILITY GATING SPLIT (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **A TAG WHOSE NAME ASSERTS A POSITION MUST GATE ON `position_pool`. A TAG DESCRIBING A QUALITY MAY GATE ON FAMILY. THE RULE ALREADY EXISTED AND THAT IS THE WHOLE LESSON (generalised 2026-08-16).**  **, evidence in `RULE_EVIDENCE.md`**
  - **IDENTITY tags , gate on the POOL, never on the family:** Regista (CM/CDM), Maestro (CM/CDM/CAM), The Winger (Winger), Poacher (ST), Ball-Playing CB (CB). The name makes a claim about WHERE a player stands, so only the pool can settle it.
  - **ABILITY tags , family gating is CORRECT and must stay:** The Wall, Destroyer, Ball Hawk, Engine Room, Complete, Iron Man. They describe something any position in range can show, so a broader gate is not a defect.
  - **SO THE LESSON IS NOT THE FIX. It is that A RULE STATED IN ONE PLACE AND NOT APPLIED AS A CLASS WILL BE VIOLATED EVERYWHERE ELSE.** A comment above one gate is not a rule, it is a note. When you write one, either apply it to every member of its class in the same change or promote it here , those are the only two endings that hold.
  - **CAM IS NOT RECLASSIFIED TO MID and must not be.** It stays in the FWD family, which is correct for the goal thresholds; only the identity gates read the pool. Fixing the gate, not the mapping, is the whole point.


---

## THE RANK ANCHORS , THE OFFSET VALUES (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **THE LADDER POPULATIONS ARE ANCHOR-PINNED, NOT MEASURED , SO THE vvindex COUNTS ARE STRUCTURAL CONSTANTS AND A FUTURE SESSION MUST NOT "FIX" THEM AS STALE (logged 2026-08-13).** The band edges are RANK anchors, not score thresholds: `migrations/stage3_league_strength.sql` lines 67-70 set `b95 = OFFSET 11`, `b90 = OFFSET 149`, `b85 = OFFSET 649` , i.e. the **12th, 150th and 650th best card in the database**. So the populations are fixed BY CONSTRUCTION: **12 Generational, 150 at 90+, 650 at 85+, and 138 in the Iconic band (150 minus 12).**  **, evidence in `RULE_EVIDENCE.md`**
  - **CONSEQUENCE FOR COPY: vvindex's "roughly a dozen" (Generational) and its hundred-and-fifty boundary (Iconic) are GUARANTEED TRUE and DO NOT drift as the database grows.** What changes is WHICH seasons occupy the slots, which the page's own **"Where the ground still moves"** card already discloses. **The copy and the disclosure are consistent , do not "correct" either one.**
  - **THE ONE REAL DRIFT RISK IS A RECUT, NOT DATA GROWTH. If the OFFSET values are ever changed, the vvindex copy must be updated IN THE SAME COMMIT** , otherwise accurate copy silently becomes wrong with nothing in the diff to show it.


---

## THE RANGE() PAGINATION DEFECT , THE MEASUREMENTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **A SORT ON A LOW-CARDINALITY COLUMN IS NOT A TOTAL ORDER, SO `range()` PAGINATION SILENTLY DUPLICATES AND DROPS ROWS. THIS WAS LIVE IN RANKINGS AND NOBODY COULD SEE IT (2026-08-17).** `applyServer` ordered by ONE column. Every sort option is low-cardinality against 57,234 rows , rt alone puts thousands of cards on the same value , and **Postgres is free to return tied rows in any order, and will pick a DIFFERENT PLAN for a different window size.**  **, evidence in `RULE_EVIDENCE.md`**
  - **GENERALISE IT: any query that paginates with `range()`, or that relies on an ordinal meaning the same thing twice, needs a UNIQUE tiebreak in its ORDER BY.** Ordering by a score, a date, a name or a band is never enough on its own.
  - **AND NOTE HOW IT SURFACED: it was invisible until a feature depended on the ordinal being STABLE** (the card sequence re-deriving the list a visitor came from). A bug that only corrupts which rows you see, never whether the page loads, will not announce itself , it needs a consumer that asks the same question twice and compares.


---

## THE THREE FALSE DOC CLAIMS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **A STATEMENT ATTRIBUTED TO THE DOCS MUST BE CHECKED AGAINST THE DOCS BEFORE IT IS ACTED ON , AND THE DOC ITSELF CAN BE WRONG (2026-08-16). THREE CLAIMS WERE ASSERTED AS RECORDED IN ONE SESSION. TWO DID NOT EXIST AND THE THIRD EXISTED AND WAS FALSE.**  **, evidence in `RULE_EVIDENCE.md`**
  - **SO CHECKING THE FILE IS NECESSARY AND NOT SUFFICIENT.** A recorded claim is a claim, not a measurement. **When a measurement contradicts the doc, the doc is what changes, in the same session, or the next reader inherits the same wrong premise.** The Ibra line survived because every session that read it treated "it is written down" as "it was verified".
  - **AND NOTE WHICH DIRECTION IS DANGEROUS.** The two absent claims would each have caused a BUILD , hiding keepers, or ruling out a provider. **An unverified premise is most costly when it argues for removing something**, because the removal looks like caution.


---

## THE FOUR BAND NAMES (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the measurement behind it.**

- **BAND VOCABULARY IS UNIFIED ON "ICONIC" FOR 90-94 (2026-08-13). The 90+ band had FOUR different public names.** `bandFor` emits the ENGINE name `Elite`; the public word is now **Iconic** everywhere. Before the fix: vvindex said **Iconic**, playbook's ladder said **Elite**, the filter chip said **Elite**, the card badge rendered **ICONIC**, and playbook's glossary said **Iconic Campaign** (paired with **Generational Season**).  **, evidence in `RULE_EVIDENCE.md`**
  - **FOOTNOTE, minor: the "only three pages load vv-core.js" line above is off by two.** `myclub-mock.html` and `myclub-mock-B.html` also reference it, with **no `?v=` token at all** and **zero inbound links** , unreachable dev mocks, deliberately not bumped. The practical rule (bump card/compare/rankings) is unchanged.


---

## THE THREE SHARE-ONLY VERDICT NAMES , THE FULL REASONING (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the reasoning behind it.**

**THREE VERDICT TAGS HAVE A SHARE-ONLY DISPLAY NAME. THE DIVERGENCE IS DELIBERATE , DO NOT RECONCILE IT (locked 2026-08-23).**
- **The 14 names in the Compare VERDICT layer above are UNCHANGED and remain what Compare renders.** The share layer holds a SEPARATE lookup, `VERDICT_SHARE_NAME` + `verdictShareName()` in vv-core, consulted only when a tag is written into post text. **Eleven tags have no entry and share under their own name.**
- **`VAR close call` -> `VAR Close Call`.** Casing only. It is the ONLY lower-cased name in a set of fourteen, so beside thirteen title-cased siblings in a feed it reads as a typo rather than a style.
- **`Complete Package vs Specialist` -> `The Complete Player`.** The original names the AXIS, not the judgement. **In frame the two cards supply the contrast; out of frame nothing does**, and it lands as a category label.
- **`League Strength Tips It` -> `The League Tips The Balance`.** The original ends on a pronoun whose referent is the pair of cards. **Remove the cards and "It" points at nothing.**
- **WHY A LOOKUP AND NOT A RENAME: the tag set is a product vocabulary with locked names, and this is PRESENTATION FOR ONE SURFACE.** Renaming would move the name everywhere , the chip, the AI prompt contract, the 48 stale cache rows keyed on it , to fix a sentence that only exists in a share post. **A later session finding the two lists different will be tempted to "fix" the drift. This entry is why it must not.**
- **THE TEST THAT FOUND THEM: put every tag in the target sentence and read all of them, not one example.** `"The Verdict: {tag}."` , eleven survived, three did not. **A format that works for one tag is not a format; the set has to hold.** Same shape as the pairwise-distinctness rule for marks.


---

## THE CACHE-TOKEN INCIDENTS (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the reasoning behind it.**

- **`vv-core.js` CACHE TOKEN IS MANUAL , BUMP `?v=` IN card.html, compare.html AND rankings.html WHENEVER vv-core.js CHANGES, OR CLIENTS GET THE STALE FILE.** Added 2026-08-11 (`?v=20260811a`), **CURRENT VALUE `?v=20260823b` as of 2026-08-23** , the token has been live on all three pages since it was added, so any note calling the cache-buster outstanding is STALE (it was still listed as pending in the 2026-08-09 handover). Those are the ONLY three pages that load it (verified , myclub/playbook/index/vvindex/preferences/iwonder/contact do NOT, and playbook says so explicitly at line 241). **The token does not maintain itself: there is no build step, so nothing bumps it for you.** Forgetting is the SAME failure the token exists to fix , a stale cached copy makes any vv-core change **silently no-op while looking fine**, which cost real debugging time when a new export came back `undefined` and again when cached copies served the OLD tag logic after `c4ad9e2`. **HARD-REFRESH after any vv-core change**, and suspect this first when a shared-renderer edit "does nothing".


---

## THE DERIVED CACHE-STAMP SCHEME (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the reasoning behind it.**

- **AI CACHE INVALIDATION IS STAMP-BASED AND THE VERSIONS ARE DERIVED, NOT HAND-SET.** `verdict_cache` carries `rt_a`/`rt_b`/`cache_version`; `notes_cache` carries `rt`/`stats_hash`/`cache_version`. Three miss conditions: unstamped / version drift / data moved. `VERDICT_VERSION` and `NOTES_VERSION` = `PROMPT_REV + fingerprint(prompt)`, so **editing a prompt auto-bumps its version and you cannot forget** , and they are SPLIT per cache, so editing the notes prompt does not invalidate every verdict row. `stats_hash` = key-sorted sha256 of the whole cited `player` payload, so a goals fix that leaves rt unchanged STILL invalidates. Legacy rows are never deleted; they miss and self-heal on view. **SWAP TRAP: `pair_key` is canonical min-max, so `rt_a` binds to the LOWER `card_id`** and must be mapped through the same `swapped` flag as the payload.


---

## THE SHARED CACHE TOKEN , WHY THE TWO FILES ARE COUPLED (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the reasoning behind it.**

**`vv-marks.js` AND `vv-core.js` SHARE ONE `?v=` TOKEN. BUMP BOTH SCRIPT TAGS TOGETHER OR ONE IS SERVED FRESH AGAINST A CACHED COPY OF THE OTHER (locked 2026-08-21).**
- **The mark set lives in its own file** , 37 original marks, one 24x24 grid, editorial-solid with `evenodd` knockouts, `currentColor` only. It is separate from `vv-core.js` because 200 KB of renderer plus a sprite of path data is how a module stops being maintainable, **not** because the two are independent. They are not: `renderTagPills` will call `VVMarks.tag()`, so a stale copy of either one breaks the other.
- **THERE IS NO BUILD STEP, SO NOTHING ENFORCES THE PAIRING.** No constant is shared at runtime; the token is typed into the `<script>` tags on card.html, compare.html and rankings.html. **The single token is a DISCIPLINE, and this entry is the only thing holding it.** Bump both tags to the same value in the same commit, every time either file changes.
- **THE FAILURE IS THE USUAL SILENT ONE.** A `<use>` pointing at a symbol that is not in the document renders **BLANK**, with no error and no layout change , a pill with a label and a hole where the mark should be. `VVMarks.inject()` runs at load and a one-shot audit warns once per surface when a mark resolves to nothing, which is the same guard shape as `vvQueueRowAudit`, added for the same reason.
- **KEYS MATCH THEIR SOURCES EXACTLY and must keep matching:** `tag()` on `TAG_DEFS` names, `honour()` on `HONOUR_META` keys, `section()` on the `s-` ids in `playbook.html`. **Three namespaces, not one flat map** , "Honours" is both a Playbook section and a family of honours, and a flat map would let those collide silently. **Renaming a tag in `TAG_DEFS` without renaming its mark key leaves a blank pill, not an error.**


---

## THE ACCEPTED CONTRAST EXCEPTIONS , THE FULL REASONING (relocated from §C, 2026-08-27)

**The RULE stays in `CLAUDE.md` §C. This is the reasoning behind it.**

**THREE CONTRAST FAILURES ARE ACCEPTED EXCEPTIONS, RULED 2026-08-24. THEY ARE RECORDED WITH THEIR RATIOS SO A LATER AUDIT RE-FINDS THEM AND STOPS, RATHER THAN RE-OPENING THEM.**
- **CARD-FACE CHIPS , the gold band label at 2.04 and the green `chtagcell` text at 2.34.** Both sit on the card's own colour system, where the fill carries the tag's identity. **Changing the ink is a redesign of the card, not a contrast fix**, and the card face is the product. Left as is.
- **`.prenum` ("95+", "90+") fading to fully transparent.** It is `background-clip:text` over `linear-gradient(rgba(255,255,255,.72), rgba(255,255,255,0))`, so the bottom of an 88px numeral has ZERO alpha and scores 1.00 by construction. **Deliberate and decorative**, and the number is also written in the copy beside it. Left as is.
- **THE WAITING BOX EDGE AT 1.88 against the page**, under the 3:1 non-text bar. **A skeleton should be quiet** , it is a placeholder for content that is arriving, not a control. Left as is.
- **`.pspot`, THE PITCH POSITIONS , cream on brand pink at 3.89 with an 11px label, so the bar is 4.5.** ACCEPTED. **The `.cm-mk` remedy does not transfer and the numbers are why:** that marker reached the 3:1 LARGE-text bar by growing to 19px bold, but the pitch labels are words, not digits , **"WNG" at 19px bold measures 52px and needs a circle of about 62px against the current 38px**, and eleven of those overlap on the pitch. So the only routes left are darkening the brand pink (ruled out), shortening the labels, or enlarging the pitch. **REVISITABLE IF THE PITCH IS EVER REDESIGNED** , a larger pitch changes the arithmetic and this becomes solvable by size, exactly as `.cm-mk` was.


---

## RELOCATED FROM `CLAUDE.md` §C ON 2026-08-28 , RELIEF PASS

**THE RULES DID NOT MOVE.** Every headline below is still in §C, byte-identical, as the bold
line it always was. What moved is the MEASUREMENT and the INCIDENT behind it. Each entry is
reproduced in full as it stood in §C, so nothing is paraphrased away.

**CLAUDE.md WINS ON ANY CONFLICT.**

### THE RARITY BAND IS A CEILING, NOT A TARGET (2026-08-16)

- **THE RARITY BAND IS A CEILING, NOT A TARGET. NO TAG SHOULD EXCEED ROUGHLY 2%; THERE IS NO FLOOR, AND A TAG BELOW THE BAND IS NOT A DEFECT TO TUNE AWAY (corrected 2026-08-16).**  **, evidence in `RULE_EVIDENCE.md`** The old "all tags in a 1-2% band" wording was overstated. **Maestro 0.67%, The Winger 0.52%, Poacher 0.47%, Ball-Playing CB 0.36%** all sit below it and always did. **THEY ARE NARROW IDENTITY ARCHETYPES AND RARITY FOLLOWS THE ARCHETYPE** , how many cards hold the tag is a property of how many players actually ARE that thing, not a dial. **Forcing them up admits players who are not that thing**, which is exactly the error the identity-vs-ability fix removed. **SO THE ONLY RARITY QUESTION WORTH ASKING IS "IS ANYTHING OVER ~2%".** Never write "all tags sit in a 1-2% band" into any doc or copy again.

### THE 2026-08-21 TAG RECALIBRATION WARNING WAS WRONG

- **THE 2026-08-21 "TAG RECALIBRATION IS NOW REQUIRED" WARNING WAS WRONG, AND THE REASONING ERROR IS THE USEFUL PART.**  **, evidence in `RULE_EVIDENCE.md`** Written the same day the engine changed and BEFORE anything was measured. **Measured on all 57,234 cards, the change moved SEVEN CARDS ACROSS TWO TAGS.** **SO: BEFORE DECLARING A DOWNSTREAM CONSUMER AFFECTED, GREP THE CONSUMER FOR THE FIELDS THAT ACTUALLY CHANGED** , `getVVTags` reads `gaw` zero times. A wrong warning costs a re-audit and teaches the next reader to distrust numbers that are correct. **QUOTE THE 2026-08-21 BASELINE, NOT THE 2026-08-13 ONE** (`scripts/enrichment/tag_distribution_2026-08-21.txt`) , the older file predates both the rarity pass and the identity fix, so correct changes read as collapses and a RETIRED tag reads as a total collapse.

### NULL-POOL CARDS NEVER RECEIVE AN IDENTITY TAG (2026-08-16)

- **NULL-POOL CARDS NEVER RECEIVE AN IDENTITY TAG , A CARD WITH NO VERIFIED POSITION CANNOT BE SAID TO OCCUPY ONE (2026-08-16).**  **, evidence in `RULE_EVIDENCE.md`** 35.2% of cards have no pool, and the coarse field is exactly the one that cannot tell ST from Winger or CB from FB, so a coarse fallback on an identity tag is a guess wearing the tag's authority. **DO NOT RE-ADD A COARSE FALLBACK TO LIFT A COUNT** , under-tagging is the correct behaviour, and a low count is not a defect (see the rarity CEILING rule). **This principle was ALSO already stated once and not generalised** , same failure as the rule above, in the same function, on the same day.

### IRON MAN IS A DELIBERATE EXCEPTION TO THE RARITY CEILING (2026-08-15)

- **IRON MAN IS A DELIBERATE EXCEPTION TO THE ~2% RARITY CEILING. DO NOT "FIX" IT BACK (2026-08-15).**  **, evidence in `RULE_EVIDENCE.md`** It sits at **3.40%**, and the tighter multiplier that would bring it under the ceiling was REJECTED. **Availability is structurally common in a way no other tag's signal is** , the tag means "played every week", and a season-long ever-present is not a rare event. **Forcing it into band stripped the LAST tag from 84 elite cards, 45 of which held Iron Man and nothing else. That is buying rarity with coverage at the top of the scale, which is the wrong trade for this tag specifically.**

### A RAW FLOOR IS NULL-SENSITIVE ONLY WHEN IT READS A DIFFERENT FIELD (2026-08-15)

- **A RAW FLOOR IS NULL-SENSITIVE ONLY WHEN IT READS A DIFFERENT FIELD FROM ITS RATE GATE (2026-08-15).**  **, evidence in `RULE_EVIDENCE.md`** Written null-rejecting, all six floors changed exactly ONE tag , Playmaker lost 28 holders purely for unrecorded assists, violating the locked NR-is-not-zero rule. Where the floor reads the SAME field as the rate gate a null already fails upstream, so the exemption is never consulted. All floors now go through `rawFloorOK`. **`GOAL MACHINE` IS THE ONE EXEMPTION AND MUST STAY NULL-REJECTING** , its floor is the ENTIRE rule with no rate cut, so exempting null would hand the tag to every eligible null-goal card.

### DEFENSIVE DATA + THE PHASE-2 RECALIBRATION SPEC (finding 5 Jul)

- **Defensive data + engine recalibration (Phase 2) , SOURCE OF TRUTH (finding 5 Jul):** defensive data EXISTS in the DB, NO external sourcing needed. Fields on `player_card_view` + `player_season_cards`: `tackles_total, tackles_blocks, interceptions, duels_total, duels_won`; `league_standings.goals_against` = team defensive record. Coverage 2015-2025 ≈ 85-95% populated; pre-2015 ≈ 0% (API-Football stats start ~2015). Validated: van Dijk (CB) high tackles/interceptions vs Messi/Haaland low , data separates defenders from attackers correctly.
- **Recalibration MUST add a defensive dimension** (Phase 2, after data-lock, alongside dynamic league strength) so defensive players get equal treatment: scored on tackles+interceptions+blocks PER-90, ranked WITHIN position pool (percentile). Target: van Dijk peak ≈ 85+ (sanity exhibit , a READ-OUT, not a dial; anchor guardrail holds). Duels = SECONDARY only (attackers rack them up, not defender-specific). Pre-2015 gap disclosed via confidence dots. Position-aware weighting integrates the defensive score with attacking output + league strength. SUPERSEDES the interim "GK capped 75 / defenders in own pool, disclose don't fake" stopgap once built.

### A VISUAL CHANGE IS NOT VERIFIED UNTIL RENDERED IN A REAL BROWSER (2026-08-16)

- **A VISUAL CHANGE IS NOT VERIFIED UNTIL IT HAS BEEN RENDERED AND MEASURED IN A REAL BROWSER (2026-08-16).**  **, evidence in `RULE_EVIDENCE.md`** Reading the markup and probing a DOM shim both missed defects a real layout exposed at once. Serve the page (`python3 -m http.server`) and measure the rendered geometry. **AND HOLD THE INSTRUMENT TO THE SAME STANDARD AS THE CODE** , five "defects" across two days were the harness misreading, including `pgrep -f` matching its own shell and a log parser silently dropping a whole league. **A fresh element, a second source, or a positive control settles it.**

### `ORDER BY rt DESC` PUTS NULL FIRST

- **`ORDER BY rt DESC` PUTS NULL FIRST , Postgres default, and it is LIVE DATA, not a hypothetical.** A null-rt row takes the top slot of any `rt DESC` query unless `nullsFirst:false` is passed. It broke the Compare picker once (`buildPoolQ` returned 50 null-rt rows, so **every filter matched 0**, fixed in `4428552`) and surfaced again spot-checking Salah, whose top row read `null` , 1 of his 26 rows has a null rt. **Any new `rt DESC` query needs `nullsFirst:false`.** 3,061 of 57,234 cards have a null rt.

### THE COMPARE-USES-RPC CLAIM IS STALE (2026-07-24)

- **CORRECTION 2026-07-24: the old claim that "Compare uses RPC `search_players`" is STALE , the RPC is NOT called anywhere in the front-end.** BOTH rankings.html and the Compare picker query `player_card_mv` directly. The matching logic (`vvNorm`, `tokenAndFilter`, `vvParseSearch`, `vvSeasonLabel`) now lives ONCE in vv-core.js (was byte-identical copies in each file) , change it there and both surfaces update. DB norm columns: `player_name_norm` / `team_name_norm` = `regexp_replace(lower(unaccent(coalesce(full_name,name))), '[^a-z0-9 ]','','g')`.

### PRESTIGE IS EXEMPT FROM THE ROW TAG CAP

- **PRESTIGE IS EXEMPT FROM THE ROW TAG CAP (rankings), AND IT IS EXEMPT BECAUSE IT WAS BEING DROPPED, NOT MIS-ORDERED.**  **, evidence in `RULE_EVIDENCE.md`** Prestige now renders FIRST and outside the cap. **Accepted consequence: a prestige row shows cap+1 pills.** **THERE ARE FOUR TAG-RENDER PATHS AND A FIX MUST BE CHECKED AGAINST ALL FOUR** , `vv-core:srtags`, `vv-core:utags`, `vv-core:chtagcell` and compact mode. A first pass fixed one row template and still reported success.

### A TARGET-ONLY SNAPSHOT CANNOT SEE A RIPPLE (2026-08-13)

- **A TARGET-ONLY SNAPSHOT CANNOT SEE A RIPPLE. SNAPSHOT ALL 57,234 CARDS BEFORE AND AFTER ANY WRITE, NEVER JUST THE ROWS YOU TOUCHED (2026-08-13).**  **, evidence in `RULE_EVIDENCE.md`** A 351-row write moved 137 UNTOUCHED cards, two across a public band , a target-scoped snapshot would have reported it clean. **Paginate past the 1000-row cap, read the file back off disk and assert it row-for-row before trusting it.**

### `player_card_mv` DOES NOT `SELECT *` , the matview's column list is FROZEN

- **`player_card_mv` DOES NOT `SELECT *` , it enumerates all 47 columns EXPLICITLY, and a matview's query is FROZEN at creation.** So appending a column to `player_card_view` surfaces it **NOWHERE**: `REFRESH` re-runs the stored column list. Postgres has no `ALTER MATERIALIZED VIEW ... ADD COLUMN`, so the only route is **DROP + CREATE of the matview the whole site reads, plus its 8 indexes** including the UNIQUE `card_id` index that `REFRESH CONCURRENTLY` depends on. **"Append-only, rt-safe" is true of the VIEW and FALSE of the MATVIEW , do not conflate them** (this was stated wrongly once and corrected before anything was run). Prefer a client-side lookup over a matview rebuild unless the column is genuinely required at query time.

### `information_schema` IS BLIND TO MATVIEW GRANTS (2026-08-19)

- **`information_schema` IS BLIND TO MATVIEW GRANTS , `pg_class.relacl` IS THE AUTHORITATIVE SOURCE (2026-08-19).** `role_table_grants` returns NOTHING for a materialized view, so a permissions check run against it reports "no grants exist" on a matview that is granted correctly. **A denied SELECT returns EMPTY WITH NO ERROR**, so a missing grant renders as an empty site rather than a fault , which is why the 2026-08-19 swap GRANTED the new matview before renaming it, while nothing was reading it.

### `vv-core.js` CACHE TOKEN IS MANUAL

- **`vv-core.js` CACHE TOKEN IS MANUAL , BUMP `?v=` IN card.html, compare.html AND rankings.html WHENEVER vv-core.js CHANGES, OR CLIENTS GET THE STALE FILE.**  **, the incident history is in `RULE_EVIDENCE.md`** Those are the ONLY three pages that load it. **The token does not maintain itself: there is no build step, so nothing bumps it for you.** Forgetting is the SAME failure the token exists to fix , a stale cached copy makes any vv-core change **silently no-op while looking fine**. **HARD-REFRESH after any vv-core change**, and suspect this first when a shared-renderer edit "does nothing".

### AI CACHE INVALIDATION IS STAMP-BASED AND DERIVED

- **AI CACHE INVALIDATION IS STAMP-BASED AND THE VERSIONS ARE DERIVED, NOT HAND-SET.**  **, the full scheme is in `RULE_EVIDENCE.md`** `VERDICT_VERSION` and `NOTES_VERSION` = `PROMPT_REV + fingerprint(prompt)`, so **editing a prompt auto-bumps its version and you cannot forget**, and they are SPLIT per cache. `stats_hash` is a key-sorted sha256 of the whole cited payload, so a goals fix that leaves rt unchanged STILL invalidates. Legacy rows are never deleted; they miss and self-heal on view. **SWAP TRAP: `pair_key` is canonical min-max, so `rt_a` binds to the LOWER `card_id`** and must be mapped through the same `swapped` flag as the payload.

### CLAUDE CODE CAN EXECUTE DDL VIA `exec_sql` , the fold_fix.sql proof and the two sub-rules

`fold_fix.sql` applied **unmodified, on the first attempt**, through the RPC after **two silent no-ops through the Supabase SQL editor**. The file was never wrong; the paste was not reaching the database.
  - **THE GENERAL RULE: VERIFY THE WHOLE MIGRATION, NOT THE COLUMNS YOU HAPPEN TO REMEMBER.** Count against the file's own list: `select count(*) from information_schema.columns where table_name='x' and column_name in (...)` with EVERY name, asserting it equals the expected number. **A check scoped to a subset can only ever confirm the subset.**
  - **AND KEEP DDL FILES SINGLE-STATEMENT WHEN THEY GO THROUGH THE EDITOR.** Comments and verification blocks belong in a separate paste, or the file's success indicator reports on the comment rather than on the DDL. The `exec_sql` RPC route (below) does not have this failure mode and is the better route for anything multi-statement.

### THREE VERDICT TAGS HAVE A SHARE-ONLY DISPLAY NAME , the rename argument and the test

- **IT IS KEYED BY TAG KEY (`var_close`), NOT BY NAME**, and `verdictShareName()` accepts either. A check written against the name throws on a correct codebase , that cost a false QA failure on 2026-08-27.
- **WHY A LOOKUP AND NOT A RENAME: the tag set is a product vocabulary with locked names, and this is PRESENTATION FOR ONE SURFACE.** Renaming would move the name everywhere , the chip, the AI prompt contract, the stale cache rows keyed on it. **A later session finding the two lists different will be tempted to "fix" the drift. This entry is why it must not.**
- **THE TEST THAT FOUND THEM: put every tag in the target sentence and read all of them, not one example.** Eleven survived, three did not. **A format that works for one tag is not a format; the set has to hold.**

### THE SHARE FRAME , vvCentreShareCaption and the misnamed shareCapture container

- **AND `vvCentreShareCaption` MOVES THAT BLOCK UNDER THE CARDS, SO IT IS CLAMPED TO THE FRAME.** A full-width block centred on a left-sitting card pair would leave the frame.
- **A CONTAINER NAMED FOR A JOB IT DOES NOT DO IS ITS OWN TRAP.** `card.html` wraps the card and its tagline in `id="shareCapture"`, but the capture composes a SEPARATE frame in vv-core and never reads that element , the preview showed a tagline the PNG never contained. **The name is the reason nobody checked.**

### THE html2canvas SWEEP , the drop-shadow exception, measured

- **ACCEPTED EXCEPTION: the squad shield's `drop-shadow` IS dropped and does not matter** , measured at a mean of 0.31/255 on the card's dark ground. **Blur cannot be shimmed, so faking it trades a visible hard edge for nothing. Do not "fix" it.**

### A PAGE'S HTML IS NOT CACHE-BUSTED , the incident and the asymmetry

- **IT COST A WRONG CONCLUSION THIS SESSION.** Attributes added to card.html's share buttons were verified present in the file and absent in the DOM, which reads exactly like a failed edit. **Add a query param (`?cb=1`) or hard-refresh before concluding that markup did not apply**, and suspect this FIRST when a file and the page disagree.
- **NOTE THE ASYMMETRY THAT MAKES IT CONFUSING: the JS is fresh while the HTML is stale**, so the page half-updates and the symptom looks like a selector or a scoping bug rather than a cache.

### FORGED-BUT-CONSISTENT CORRUPTION , the agreement mechanism in full

- **The failure mode is not disagreement, it is AGREEMENT.** Every internal cross-check answers "do these two fields tell the same story". A row that is wholly someone else's tells a perfectly consistent story , wrong, and self-consistent. **Consistency is what this corruption PRODUCES, so consistency cannot be the test for it.**  **, evidence in `RULE_EVIDENCE.md`**

### FORGED-BUT-CONSISTENT , the cheap tells, worked

- **AND A CHEAP TELL WHEN NO EXTERNAL SOURCE IS TO HAND: look for things that cannot both be true.** One `api_player_id` holding two clubs in one season with minutes summing past 3,420. A pooled goalkeeper with 5 goals. A league-season carrying 600 cards where every other year of the same league carries 384 to 441. **Those are internal checks that test the WORLD rather than our own field agreement, which is why they survive.**

### A CONTRAST AUDIT NEEDS THREE THINGS RIGHT ON SVG , the pattern, in full

- **THE PATTERN, AND IT IS THE POINT: an instrument wrong in one way hides the ways it is wrong in the others.** Each correction made the next visible, every intermediate state produced confident wrong numbers, and **the errors ran in BOTH directions** , bought fixes nobody needed, and would have hidden real ones.

### THREE CONTRAST FAILURES ARE ACCEPTED EXCEPTIONS , the reasoning per exception

- **CARD-FACE CHIPS** , the gold band label at **2.04** and the green `chtagcell` text at **2.34**. The fill carries the tag's identity; changing the ink is a redesign of the card, and the card face is the product.
- **`.prenum` ("95+", "90+") at 1.00 by construction** , `background-clip:text` over a gradient that ends fully transparent. Deliberate and decorative, and the number is also written in the copy beside it.
- **THE WAITING BOX EDGE AT 1.88** against the page, under the 3:1 non-text bar. A skeleton should be quiet , it is a placeholder, not a control.
- **`.pspot`, THE PITCH POSITIONS , cream on brand pink at 3.89 with an 11px label, so the bar is 4.5. ACCEPTED.** The `.cm-mk` remedy does not transfer: that marker reached the 3:1 LARGE-text bar by growing to 19px bold, but the pitch labels are WORDS, not digits, and eleven of them overlap on the pitch. **REVISITABLE IF THE PITCH IS EVER REDESIGNED** , a larger pitch makes this solvable by size, exactly as `.cm-mk` was.

### CDM IS ASYMMETRIC , the 208-card zero-move baseline and the sign narrative

CDM is the ONE destination pool where the defensive signal is load-bearing, so it is the only transition family that moves rt at all , every `CAM -> Winger` and `CAM -> CM` write across 208 cards moved exactly ZERO. That much was already recorded. **What was NOT recorded is that the effect has a SIGN, and the earlier note stated only the direction that had been observed.**
- **MECHANISM: a card sitting in CDM draws a `def_core` benefit from the defensive pool. Moving it out REMOVES that benefit.** So the demotion is prior inflation leaving, not new error , those cards were being credited for defensive work they were never doing. **State it that way when it is questioned**, because a famous name losing a band reads like a bug.  **, evidence in `RULE_EVIDENCE.md`**

### THE LOADER MONOGRAM , why both earlier traces read mirror as translation

- **THE TWO Vs ARE MIRRORED, NOT TRANSLATED** , both earlier traces got this wrong the same way, and it is why the mark never sat right. **A mark measured only where the two shapes overlap cannot tell mirror from translation: find the arm that is never occluded and fit THAT.**

### THE LOADER MONOGRAM , the seam offset, derived versus measured

- **SEAM OFFSET IS 218.5, THE ASSET'S OWN NUMBER, NOT A DERIVED ONE.** A seam derived from the drop instead (287.3) separates the two Vs until they read as "V V", which is the one thing the drop exists to prevent. **THE GENERAL POINT: a number from a formula is a PREDICTION and the asset is the MEASUREMENT , when they disagree, measure a landmark the formula never touched.**

### `vv-marks.js`/`vv-core.js` SHARED TOKEN , the blank-<use> failure mode

- **THE FAILURE IS THE USUAL SILENT ONE.** A `<use>` pointing at a symbol not in the document renders **BLANK**, with no error and no layout change. `VVMarks.inject()` warns once per surface when a mark resolves to nothing , the same guard shape as `vvQueueRowAudit`, added for the same reason.

### `git reset --hard` IS REPO-WIDE , the incident

- **`git reset --hard` IS REPO-WIDE AND DESTROYS UNCOMMITTED WORK IN FILES THAT HAVE NOTHING TO DO WITH THE TASK. USE `git checkout -- <named files>` INSTEAD (2026-08-17).** It takes no path argument in the form it is usually reached for, so "undo my working-tree changes" quietly means "undo EVERYONE'S working-tree changes", including edits made hours earlier in a different thread of work.  **, evidence in `RULE_EVIDENCE.md`**

### THE html2canvas SWEEP , the dropped-versus-drawn-wrongly limit, measured

A rounded inset `box-shadow` passes `vvAuditCaptureSupport` and is still absent from the real card's corner: **zero gold pixels without `vvShimInsetRims`, 370 with it.** The harness detects DROPPED, never DRAWN WRONGLY, so it is not a substitute for reading a captured PNG.

### NULL-POOL POLICY , a WRONG pool is not a MISSING pool

- **SEPARATE AND NOT COVERED BY THIS POLICY: a WRONG pool is not a MISSING pool.** The repartition model's twelve biggest falls at rt>=85 are all creative players stored in the ST or Winger pool. **No null-pool policy touches them.** The narrow verifiable set is **15 cards: ST pool, rt>=80, assists >= goals.** Note the wider signal is NOT usable , at `assists >= 1.5x goals` the list is 24 cards and mostly LEGITIMATE wingers (Sane, Di Maria, Saka, David Silva, Messi at PSG), because a creative winger is an archetype and not an error.


---

## THE 2026-08-24 DEFECT BATCH , THE FIVE THAT CLOSED (relocated from `CLAUDE.md` §D, 2026-08-29)

**The decisions stayed in §D as headlines. This is the measurement behind them.**

### DEFECTS LOGGED 2026-08-24 , FIVE OF SEVEN CLOSED 2026-08-25. The two left open are one item, and the reason they are still open is an INSTRUMENT problem, not a missing fix.
**CLOSED: (1) the escaped loader `11bfdfb`, (3) Copy link `f5309ec`, (5) the wordmark gap and (6) the caption's pink V `c0ba301`, (7) the loader geometry `92bb39a`, and the capability relabel `f60354b`.** Each carries its measurement in its own commit message; the geometry is locked in §C.
- **ONE LESSON FROM (1) THAT IS NOT ALREADY A RULE: a function that escapes ON PURPOSE cannot also be the path a marker arrives by.** `vvSetVerdict`/`vvSetStory` receive model output, so `textContent` is correct and must stay , the wait comes through `vvWaitHTML` behind an `opts.wait` flag. **Do not "fix" a later version of this by switching the prose to `innerHTML`.**
- **(3) and the card's `vvCopyLink`/`vvShareOut` were four more instances of the report-success-before-it-resolves rule already in §C**, including a comment asserting the property directly above code that violated it twice.

**(4) CLOSED 2026-08-25 BY RELABELLING ON CAPABILITY (`f60354b`). The chain was never broken , it was the LABEL.** Measured on desktop Chrome 151: **`navigator.share` and `navigator.canShare` are both `undefined`**, so rungs 1 and 2 cannot fire and the download IS the designed rung 3. **A button reading "Share this verdict" that downloads is the same defect class as a waitlist thanking someone for an email it never sent** , the control reports an outcome that did not happen, which is the §C success-gating rule one step earlier, at the PROMISE rather than the report. `VVCore.vvShareCapability()` now drives the wording and the icon on both surfaces. **Do not "simplify" this back to a fixed label.**
