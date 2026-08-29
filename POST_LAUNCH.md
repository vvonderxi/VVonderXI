# POST-LAUNCH , DEFERRED WORK (extracted from CLAUDE.md §D, 2026-08-09)

**Read this ONLY when a post-launch stage actually starts.** Extracted under the CLAUDE.md stage-file rule: CLAUDE.md holds the resume point, active queue and locked decisions; detailed specs for DEFERRED work live in their own file. **CLAUDE.md wins on any conflict.**

Nothing in here is launch-blocking. That is the definition of the section, not a judgement made during extraction. Every item is preserved verbatim , no summarising, no re-deciding.

**CROSS-REFERENCES INTO THIS FILE (keep them resolving):**
- **THE PROOF , PERCENTILE COLUMN** is depended on by **§D PARALLEL item 1** (pair the percentile columns with the known-as-names fix so the matview DROP+CREATE is paid once) and by the **Compare-redesign radar note** (the two-narrow-spikes radar is blocked on the same percentile-within-position work, §C RADAR_REF). CLAUDE.md keeps a live pointer to it.
- **ACCOUNTS / AUTH STAGE** points onward to `ACCOUNTS_STAGE_SPEC.md`.
- **VV INDEX / PLAYBOOK PAGE SPLIT** references §F 2026-08-07 for the Path B decision.

---

## §D DEFERRED (post-launch, explicitly NOT launch-blockers)

- Premium/motion pass; accounts/Locker (waitlist for now); language toggle EN/NL/FR.
- **ACCOUNTS / AUTH STAGE , spec extracted 2026-08-03: see `ACCOUNTS_STAGE_SPEC.md`** (waitlist table + insert-only RLS + the grant, the 5 mapped CTA trigger sites with their `source` values, settled modal copy, the RLS verification method, 2 open questions). Nothing built; `migrations/waitlist_emails.sql` stays untracked until this stage starts.
- **VV INDEX / PLAYBOOK PAGE SPLIT , post-launch (logged 2026-07-26, CORRECTED 2026-08-07 , the old description named a page structure that no longer exists).** **WHAT CHANGED:** vvindex no longer has a separate "Principles Behind the Score" section , it was ABSORBED into the honesty section, which is now titled **"The Method, and Its Limits"**. The page is **3 sections, not 4**: The Five Dimensions -> The Bands -> The Method, and Its Limits. So the old phrasing "bands + 5 dimensions + principles + all disclosures" is stale; read it as **bands + 5 dimensions + method/limits**. **THE CORE PROBLEM STILL STANDS, AND GOT SHARPER, NOT SOFTER.** vvindex and playbook still duplicate **the 5 bands AND the 5 dimensions**, and as of `5b19aeb` **BOTH PAGES NOW RENDER THEIR OWN PENTAGON** , the duplication is no longer conceptual, it is the same component built twice (vvindex `.fd` interactive, playbook `.pgsvg` static). Verified 2026-08-07: both pages carry 5 band rows and all five dimension names. **DIVISION OF UNIQUE CONTENT (re-verified, unchanged):** playbook uniquely owns "what percentile means" + "what Data Confidence means" (vvindex has ZERO occurrences of either); vvindex uniquely owns the honesty/method disclosures. **LONG-TERM RIGHT ANSWER = SPLIT** (unchanged): vvindex becomes a lean landing (hero + pitch + a short "how it works" teaser + CTAs + a "Read how the VV Score works ->" link); the full methodology consolidates into **playbook** (already cleanUrls-routed + a nav item on ~8 pages, already carries bands + dimensions + a TOC), deduping the cross-page repetition. Needs NO new page/route, but it IS a routing/nav + cross-page content-reconciliation project, DELIBERATELY NOT done in the pre-merge stable window. **NOTE THE DECISION UPSTREAM OF IT IS NOW HALF-ANSWERED:** the old open question was "does playbook become 'The Method' and absorb everything, or do the two pages keep distinct jobs" , and **vvindex has since taken the name "The Method, and Its Limits" for its own section**, which is an argument for the two pages keeping distinct jobs (vvindex = why trust the number, playbook = how to read a card). Not a decision, but the naming now leans one way and a future split should either honour that or deliberately rename. **LAUNCH ships Path B instead** (progressive-disclosure restructure of the single vvindex page , inverted pyramid, claims + honesty OPEN, machinery collapsed; see §F).
- **THE PROOF , PERCENTILE COLUMN (Path 1, deliberate post-launch enhancement).** The launch Proof is TRIMMED (per-90 + minutes/apps denominator, no percentile , see §D PARALLEL item 3). Adding the percentile column back is a DELIBERATE post-launch enhancement. **NOT a data gap , every stat is on the mv (2015+); the distribution is the 54k rows.** The real gate is THREE PRODUCT DECISIONS: (1) POOL , `position_pool` (8-bucket) vs coarse (DEF/MID/FWD/GK); (2) CROSS-LEAGUE vs per-league , the engine's existing percentiles are GLOBAL/cross-league (§E audit), so the copy MUST read "vs the position pool 2015+", NOT "in the league" (the old hardcoded Bruno copy's "every midfielder in the league" was wrong); (3) MINUTES THRESHOLD for the pool (exclude tiny-sample noise). Once decided: ~8 `percent_rank() OVER (PARTITION BY position_pool ORDER BY stat/min*90)` columns appended to `player_card_view` (same SQL pattern the rt calc already runs; append-only, rt-safe), matview refresh, `rowToCard` carries them, `renderProof` fills `.pctn`/`.pct`. ~HALF-DAY of work once the 3 decisions are made. Pre-2015 + GK -> NR (null granular). Ties to the parked radar-percentile-within-position work (§C RADAR_REF).
- **PREMIUM PASS , Compare season-dropdown rows as MINI VV CARDS.** The live dropdown ships Option B (2026-07-24, commit after 913b483): flat rows , season+club left, tier-coloured VV score right (bandFor cutoffs: >=95 gold #C79A2E, >=80 charcoal/cream, <80 muted grey #9a9588), no tags. The premium version renders each row as a mini VV card with the full cream/gold/black card TREATMENT, flipping or scaling into the full card on select. DEFERRED to the motion pass , needs its OWN width budget (a card treatment is wider/taller than a flat row, so the width:min(240px,100%) containment + the 390px 2-col constraint must be re-verified) and animation verification (the flip/scale into the selected card, shared with vvCardFlip). Not a launch blocker.
- **PREMIUM PASS , VV INDEX motion ideas (logged 2026-07-26, deferred to the post-launch premium/motion pass).** GOVERNING PRINCIPLE: **animate the concept, never the page** , motion must make an IDEA clearer, not just livelier. No GIFs. CSS/SVG only, plays ONCE on scroll-into-view, NEVER loops (respect `prefers-reduced-motion`).
  - **Score-drift demo** (for "where the ground still moves") , a card reading 85 then settling to 84 as the field fills, showing the relative-score concept in motion. **FLAGGED as the ONE candidate that could ship AT LAUNCH** , the motion genuinely teaches a concept that is hard to grasp from text (the score moving as coverage grows). The other two are strictly post-launch.
  - **Band ladder settle** , Generational / Iconic / etc. cutlines or tiers stacking/settling into place on scroll. Deferred.
  - **Attacking-vs-defensive weighting bar** , a bar that fills once on scroll-into-view to show the deliberate tilt (pairs with the "Where the scale leans" disclosure). Deferred.
  - **HARD RULE , the limitation disclosures themselves stay STILL.** Animating an admission of thin data reads as a sales pitch; stillness reads as sincerity. Motion is for teaching a concept (score-drift, the ladder, the weighting), never for dressing up a caveat. The "What We Measure, and What We Don't" cards do not move.
- January mid-season DUAL-CARD (split a season at the winter window) , **RESOLVED 2026-07-21: NOT dual cards. LOCKED answer = ONE season, ONE row, SUMMED (goals+assists+minutes combined, dominant club as team_name).** A genuine two-club same-league season is summed into a single card (see the importer block-selection fix in `INGESTION_RECOVERY.md`). Rationale: (a) it matches the single-card model + fixes the understatement (Rashford's real 6g/4a season vs the current 2g/4a minor-half card); (b) the "two real blocks" signal is 82% API DUPLICATION ARTIFACTS (mirror-identical stats under the next-season club , Cunha Wolves/Man Utd 15g/15g), so literal dual-cards would mass-produce false duplicates. If per-club split-cards are ever revisited, they are BLOCKED until artifact-detection (the ceiling+mirror rule in `INGESTION_RECOVERY.md`) is validated , scope that first.
- Advanced-data VV Score v2 (radar percentile-within-position; GK saves/goals_conceded mapping to lift the GK-75 cap); dribbles_past re-ingest experiment (confirmed NOT in DB , defensive signal for outfielders).
- **[SHIPPED 2026-08-17/18 in `283bf10`, NOT PARKED , THIS ENTRY WAS STALE AND IS KEPT ONLY AS A POINTER.]** **CARD PREV/NEXT NAVIGATION IS LIVE**: arrows and a counter on desktop, arrow keys, swipe on phone, and **nothing at all when there is no sequence**. It walks the SAME filtered and sorted list the visitor arrived from, which was the locked spec. **THE STATE IS THE STORED QUERY, NEVER A LIST OF IDS** , `rankings.html` writes it through `VVSeq.save` on row click and `card.html` re-derives the page through the same `VVSeq.query`, so two copies cannot drift; ids would go stale and would have to ride in the URL to survive a share, handing a visitor someone else's results. It writes with **`replaceState`, never `pushState`**, for the same reason season switching does: Back is `history.back()`, so pushing would make Back crawl the sequence one card at a time instead of returning to the list. **EDITORIAL REGENERATES ON CARD CHANGE** , `seqGo()` awaits a full `loadCard()`, which reaches `vvLoadEditorial(D)`; that function guards on `EDITORIAL_FOR === D.card_id`, so a new card clears and refetches while the same card reuses. **Do not rebuild any of this.** The remaining prev/next work, if any, is polish on top of a shipped feature.
- **POST-LAUNCH DATA-SOURCE OPTIONS (parked, logged 2026-07-19; promoted here from the archived session log).** FBref lost its Opta feed early 2026 but the StatsBomb layer remains and is scrapeable; Sportmonks from EUR29/mo with advanced add-ons climbing; `dribbles_past` is the ONE unused API-Football defensive field , a half-day ADDITIVE re-ingest, but MODEST expectation (same opportunity confound as the other defensive signals, per Decision A).
- **OPTION C , honours-in-filter (scoped follow-up to the #3 vocab reconciliation).** The 7 honour filter chips are rendered but DEFERRED/visibly "soon" in both rankings + compare, because honours are NOT on `player_card_mv` (attached client-side after the query). Wiring them needs honour flags ON the matview (e.g. boolean columns or an honour-type array per card-season) so `player_card_mv` can be filtered by honour server-side , then flip the honour chips live in both UIs. Also fold in GK ability tags + their filters when GK scoring lands (both currently emit nothing). Not a launch blocker.
- **UNBUILT PRESTIGE-TAG IDEAS (13, prose preserved on removal 2026-07-19).** Glossary inventions with NO engine rule and NO design doc behind them , provenance traced unambiguously: none ever appeared in any `.md`/`.js` in git history, all 13 entered playbook.html in ONE bulk commit `3e67af1 "Add files via upload"`, and the only doc naming them (`docs/PLAYBOOK_MIRROR_AUDIT.md`) itself labels them "NOT computed , orphans." Removed from the playbook glossary in the FILTER_TAXONOMY reconciliation (engine emits only 2 prestige tiers: Generational Season, Iconic Campaign). Kept ONLY as repurpose candidates if the prestige tier set is ever expanded. NOT a commitment. The 13 names + their one-line glossary blurbs: Role Breaker (output that completely defies the position , a defender who scores, a midfielder who rivals the strikers); Legacy Season (a player's career-best season, the touchstone by which all their others are measured); Unplayable (a season of such complete dominance that opponents simply had no answer); The Carry (dragged an ordinary team to extraordinary heights, almost single-handed); One-Club Immortal (a defining season from a player woven into the very fabric of one club); Talisman (the heartbeat of the side, the man the whole team leaned on); Breakthrough of the Season (a young player's explosive arrival among the elite); The Difference Maker (decided the biggest games, delivered when it mattered most); The Untouchable (a goalkeeping or defensive season so commanding it bordered on impassable); The Phenomenon (a talent so rare it transcends the usual measures of a great season); The Golden Season (a historic goalscoring campaign, the kind that rewrites the record books); The Provider (a historic creative campaign, an assist machine at the peak of the art); The Romantic Season (a fairytale campaign, the underdog story that football lives for).
- **UNBUILT PROFILE-TAG IDEAS from the playbook `.libtag` LIBRARY (reconciled 2026-07-19).** The playbook had a SECOND orphan surface beyond the glossary , a "full profile tag library" chip cloud (42 chips) advertising tags the engine never emits. Reconciled against TAG_DEFS (the single source): now holds exactly the 19 engine profile tags. Of the 32 orphans removed, THREE trace to a real design spec (`VVonderXI_Card_Contract_v1 (1).md` §3, per-90 cutlines locked from the 56k gate) , DESIGNED-BUT-UNBUILT, preserved here as build candidates (NOT a commitment): (1) **Box-to-Box** , MID, Progression top 22% AND Defensive >= p70, per-90 cutline >=2.27; (2) **Defensive Rock** (library chip "Rock") , DEF, Defensive top 12%, cutline >=4.94, part of the ladder Dependable < Defensive Rock < Defensive Monster (SUPERSEDED by the live "The Wall" which occupies this DEF slot); (3) **Big-Game Player** , the contract explicitly PARKS it "until a UCL field exists on the card (`ucl_apps`/`ucl_goals`)", so it is designed + deliberately deferred, not an invention. The other 29 removed chips were `3e67af1` bulk-upload inventions with no spec. CAREER-STAGE finding (the cloud's Rising Talent/Peak/Veteran/Twilight/Breakout/Mr Consistent/Super Sub/Clutch): NOT a lost design , the career-stage CONCEPT was built, just differently, as **Wonderkid** + **The Last Dance** (live profile tags) plus the **3 age VERDICT tags** (Prodigy's Edge / Ascendant / Twilight Brilliance). The 7-chip granular cloud was invention, not a specified family. GK NOTE: the empty "Keepers" library group was removed (engine awards NO GK profile tags in v1 because saves / goals_conceded were never ingested); the group returns when GK scoring is built (see the GK-75 cap + saves-mapping DEFERRED item).
- **VERDICT_CACHE prompt-version bump (48 stale-prose rows).** The verdict-tag system (14 tags + tone + age, commit 11fd7c3) added `tag`/tone/age awareness to the /api/analyse prompt AFTER 48 verdict_cache rows were already written. Those rows' CHIPS are correct (client-side verdictContext floorTag computes them fresh), but their PROSE predates the new prompt (no tag reference, no close-call tone, no age-tiebreaker framing). To refresh: bump a prompt-version string (e.g. the MODEL const or a new `prompt_version` column checked alongside `model` in analyse.js's cache-hit guard) so the 48 stale rows MISS and regenerate with the full prompt. No data-loss (rows overwrite on next comparison, not deleted). Lucas deferred this earlier (preferred client-side chip compute, don't discard); logged so it survives. Cost = ~48 fresh AI calls, free-for-all.

---

## RELOCATED FROM `CLAUDE.md` §D ON 2026-08-18

CLAUDE.md was at 91.9% of its 150k truncation limit. These two blocks are detailed specs for work that has NOT started, which is exactly what the §D relocation rule says belongs in a stage file. **CLAUDE.md keeps a pointer to each, carrying the DECISIONS** (CB and FB get no lens; the share-of-team amendment; the six decided-negative tag metrics) **so nothing load-bearing lives only here.** CLAUDE.md still wins on any conflict.

### ENGINE , PERCENTILE REPARTITION (coarse position -> position_pool) , logged 2026-08-20, POST-MERGE, NOT built
**THE DETAIL LIVES IN `CLAUDE.md` SECTION C, under "THE VIEW MIXES TWO POSITION KEYS FOR ONE CONCEPT". Read it there and do not restate it here** , this is a queue entry, not a second copy.

**One line of what it is:** every `percent_rank` in `player_card_view` partitions on the coarse 4-bucket `psc.position` while the defender boost and the tag engine both use the 8-bucket `position_pool`, so CB and FB share one DEF percentile and wingers, strikers and attacking mids share one FWD percentile.

**Why it sits here and not in the launch queue:** repartitioning moves every outfield score. It is not a bug fix that can be slipped in, and nothing on the site is wrong today in a way a visitor can see.

**SEQUENCING, and this is the load-bearing part: pair it with the `gaw` penalty change and apply both in ONE pass.** Both rescale the same population. Done sequentially they produce two rounds of band churn and no clean baseline to measure either against. Tag floors need recalibrating after, because they are keyed to distributions that will have moved.

### ENGINE , DEEP-PLAYMAKER LENS (CM/CDM ONLY) , logged 2026-08-12, NOT built
**SEQUENCING: AFTER engine recalibration, BEFORE trajectory tags.** Do not start it earlier , it reads the same pools the recalibration moves.

**WHAT IT IS.** A THIRD lens in the existing best-of, alongside the attacking path and `def_core`. Scoped to **CM and CDM only**.
- **Dominant term: within-pool percentile of `passes_total` per 90.** Within-pool, not global , the point is to rank a deep playmaker against his own position, exactly as `def_core` does.
- **Blended at modest weight: ~~`passes_accuracy`~~ and `passes_key`.** Volume is the signal; creation is the corroboration. **SUPERSEDED 2026-08-27 , `passes_accuracy` IS OUT, it is a VALIDITY problem not a coverage one; see the field-menu entry below. `passes_key` only.**
- **CDM GETS A TWO-WAY GATE: `min(ball-use percentile, defensive percentile)`.** A tackle machine with no ball use cannot ride one axis into a high score, and neither can a pure passer who never defends. **This gate is the reason the lens is safe to give CDM at all** , without it the lens would re-create the exact inflation Stage 4 removed, where the `def_core` floor propped players at a competence baseline they had not earned.
- **CEILING BOUNDED AT 93 PRE-TILT, matching `def_core`.** Same bound, same reason: a lens is a correction, not a route to the top of the scale.
- **ATTACKER rt UNTOUCHED. Messi 97 holds.** That is the read-out check, not the target , cf. the ANCHOR GUARDRAIL in §C: famous names are a validity check, never a dial.

**GATE RUN 2026-08-12 , PASSED ON ARCHETYPE, FAILED ON THE METRIC AS SPECIFIED. READ THIS BEFORE BUILDING.**
- **THE ARCHETYPE IS REAL.** Top 40 by `passes_total` per 90 (CM/CDM, >=900 min, 2016+) reads **Rodri x4, Verratti x7, Kroos x3, Kimmich x3, Busquets x2, Jorginho x2**, plus Vitinha, Tchouameni, Modric, Xhaka, Enzo Fernandez. **22 distinct players across 40 rows, recurring season to season** , the signature of a stable player property, not noise. True pool **6,582 cards (CDM 2,094 / CM 4,488)**.
- **AND THE GAP IS THE CASE FOR THE LENS: median rt 61 among the highest-volume passers in world football, max 86.**
- **BUT THE METRIC MEASURES THE TEAM, NOT THE PLAYER. 33 of 40 rows come from seven possession-dominant clubs, 12 from PSG alone.** Hojbjerg, Paredes, Gueye, Seri, Eustaquio and Fabian Ruiz appear alongside Kroos , they are not his peers as passers, they were on sides that held the ball.
- **AMENDMENT, BINDING: the dominant term becomes SHARE OF TEAM PASSES, mirroring `def_share`, or the percentile computed PER LEAGUE-SEASON. NOT raw per-90.** This is the same confound and the same fix as July Stage 1b on the defensive side , the answer was already in the design log before this gate ran.
- **PRINCIPLE, and it is why this matters beyond one column: shipping a metric that rewards being at PSG would be open to exactly the criticism the CB decision refuses , a number that LOOKS like class but MEASURES circumstance.** The two decisions have to stand or fall together.

**WHAT DOES NOT GET BUILT , both of these are decisions, not omissions.**
- **FB GETS NO LENS.** The attacking path already serves full-backs , **TAA 85** is the evidence. Full-backs are not mis-served by the current engine, so a lens would be solving a problem that does not exist. **Cost: two disclosure lines**, nothing more.
- **CB GETS NO LENS. THIS IS A PERMANENT PUBLISHED LIMITATION, NOT A BACKLOG ITEM.** Evidence-settled at July Stage 1b and **re-confirmed August**: tackles, interceptions, blocks and duels measure **workload and archetype, not class**, and `goals_against` is a **TEAM property** (confound-proven , elite CBs on mid sides 1.57 GA/g vs journeymen 1.51). **van Dijk stays 70-74 and the platform SAYS WHY.**
  - **NEVER MINT A WITHIN-POOL CB SCORE TO FAKE PARITY.** A number that ranks CBs against each other would look like the others and mean nothing , it would be a fabricated class signal wearing the same clothes as a measured one. This is the same call as the retired "van Dijk 85+" target: **disclose, do not fabricate.** If a future session proposes a CB lens, the answer is already recorded here and the burden is new EVIDENCE, not a new formula.

**COVERAGE , the lens is only as good as `passes_total`.**
- **Complete 2017+. Partial 2016. ABSENT pre-2015.** Anything the lens touches before 2017 is thinner than it looks.
- **Excluded league-seasons: BPL 2016-2019, PRT 2016, TR 2016, BPL 2023.** Those combinations have no usable passing data and must be excluded explicitly rather than scored on nulls.
- Consequence to design for up front: a CM/CDM card outside coverage gets **no lens**, and must fall through to the existing best-of rather than to a zero. Confidence dots carry the disclosure, per the standing "disclose the boundary" stance.

### TAG-ENGINE FIELD MENU , what the data can still support (measured 2026-08-13, NOT built)
Established while retiring Marksman. **Read this before proposing any new profile tag** , it is the menu, and two of its entries are decided negatives that must not be re-litigated.

- **`fouls_drawn` per 90 IS THE MOST ORTHOGONAL METRIC ON THE PLATFORM , Spearman -0.003 vs goals and -0.053 vs conversion (Pearson -0.023 / -0.068).** Nothing else comes close to that independence. It is a genuine unclaimed identity ("the fouled man") and a strong candidate for a NON-SCORING tag.
  - **BUT THE RAW LEADERBOARD IS NOT CLEAN, and an earlier note in this session overstated it.** The real top ten (shots>=25, min>=900) is **F. Vazquez 1516 5.62, Leo Scienza 2425 5.62, Victor Andrade 1718 5.28 (rt 24), Neymar 1718 5.21 (rt 88), Rochinha 1819 5.14 (rt 35), D. Lezcano 1617 4.87, Francisco Geraldes 1617 4.82 (rt 55), Matheus Pereira 1718 4.66, J. Grealish 1920 4.65 (rt 80), J. Cuadrado 1516 4.58.** Neymar and Grealish are there; so are cards at **rt 24 and rt 35**. **It needs a quality gate like every other rate metric , do not ship it off the raw rate.**
  - **ZAHA IS NOT IN THAT LIST.** He was named in passing when this was logged and the data does not support it: his best is **1617 at 3.60/90, rank #82**. Recorded because a plausible-sounding name in a doc becomes a fact nobody rechecks.
- **`cards_yellow` / `cards_red` ARE 99.7% POPULATED INCLUDING PRE-2015 (0.0% null 2010-2014).** They are **the ONLY granular fields that survive the 2015 wall**. The complete list of fields usable across the WHOLE record is just four: **appearances, minutes, goals, and the two discipline columns.** Everything else is ~99.3% null before 2015.
  - **BUT ALL FOUR DISCIPLINE FIELDS ARE ABSENT FROM `player_card_mv`** (`fouls_drawn`, `fouls_committed`, `cards_yellow`, `cards_red` live on `player_season_cards` only), so the tag engine **cannot see them at all** today. Surfacing them means the **matview DROP + CREATE** plus its 8 indexes , see the §C matview trap. **Do it in the SAME sitting as the percentile columns and the known-as work**, never on its own.
- **`passes_accuracy` IS NOT A COVERAGE PROBLEM. IT IS A VALIDITY PROBLEM, AND THAT IS A STRONGER AND DIFFERENT REASON NOT TO GATE ON IT (corrected 2026-08-27, this entry previously said the opposite).** The old wording , "72.4% null overall and getting worse" , framed it as a field we do not have enough of. **We have plenty of it and it does not mean one thing.**
  - **THE EVIDENCE, STRAIGHT FROM THE PROVIDER, NOT FROM OUR COPY: Kroos at Real Madrid, La Liga, reads accuracy 92 in 2019, 67 in 2020 and 67 in 2023, on 2,147 / 2,021 / 2,369 passes.** Same club, same role, same volume, twenty-five points gone in one summer. **The same break runs through the whole archetype: Kimmich 69 -> 62, Jorginho 88 -> 56, and Modric 44-55, Kovacic 41-59, Pedri 42-47 sustained across seasons.** No elite midfielder passes at 44%.
  - **AND IT IS ALSO ABSENT, INTERMITTENTLY, AT SOURCE.** `players?id=...&season=...` returns `"accuracy":null` while `total` and `key` are populated and match our stored values exactly , verified on Bruno Guimaraes 2024 Premier League. **This is NOT the goalkeeper shape.** The keeper fields were arriving and being discarded by one line in our merge; this one never arrives. **A re-run fills nothing.**
  - **CONSEQUENCE FOR THE TWO TAGS THAT GATE ON IT TODAY , Regista (635 holders, 1.11%) and Ball-Playing CB (208, 0.36%), at `vv-core.js` lines 1184 and 1214.** Their `passacc_p80` thresholds are computed over a population that mixes pre-2020 and post-2020 values, so **the bar itself is contaminated**. Holder rates differ by era in OPPOSITE directions: **Regista 1.72% pre-2020 against 1.45% after; Ball-Playing CB 0.26% before against 0.72% after, nearly three times as many.** **NOT ESTABLISHED AS CAUSED BY THE FIELD** , that needs a controlled re-run with the gate removed , but a field that moved 25 points for the same player cannot be assumed innocent of it.
  - **SO: DO NOT PROPOSE A NEW TAG OR LENS THAT GATES ON `passes_accuracy`, AND TREAT THE TWO EXISTING GATES AS SUSPECT RATHER THAN SETTLED.** **`passes_key` is the corroborator that survives** , 100% covered in every season 2015-2025 and internally consistent. **The deep-playmaker lens must be built on volume plus key passes, never on accuracy** (see the gate run above, whose own "blend accuracy at modest weight" line is superseded by this entry).
- **DECIDED NEGATIVES , do not re-propose without NEW DATA, not a new formula:**
  - **PENALTIES: SOLVED, and this entry used to say the opposite.** `penalties_scored` went live with the 2026-08-19 matview swap and sits on both `player_season_cards` and `player_card_mv` , **38,291 rows, of which 32,986 are outfield cards carrying goals AND penalties (re-verified live 2026-08-20)**. Non-penalty goals ARE now derivable as `goals - penalties_scored`, so the one thing that separates a spot-kick specialist from an open-play scorer exists.
  - **THIS IS THE ENABLING CONDITION FOR THE `gaw` PENALTY CHANGE**, which `CLAUDE.md` section C says to apply in ONE pass together with the percentile repartition, never sequentially.
  - **MINUTES-PER-GOAL: Spearman -1.000 against goals-per-90.** It is that number inverted, an identity, not a relationship.
  - **SHOTS-ON-TARGET: 0.614 with conversion (0.586 within ST) and 100% NULL pre-2015.** Accuracy and efficiency are one axis.
  - **SHOT VOLUME: 0.459 with goals** , it re-awards Goal Machine. The only thing it uniquely finds is high-volume/low-conversion (Ziyech x4 in the top ten), which is a criticism, not a badge.
  - **GOALS AS A SHARE OF TEAM OUTPUT: the one that ALMOST worked, and the closest call here.** With goals held fixed it is driven almost entirely by the team total (within the 12-15 goal band, share vs goals 0.139 but share vs TEAM goals **-0.963**), so the "carrying a weak side" signal is real and isolable, and the top list reads correctly (Giakoumakis VVV 61.9%, Defoe Sunderland 60.0%, Pukki Norwich 52.4%). **BLOCKED ON THE DENOMINATOR, NOT THE IDEA:** team goals are summed from player cards and the importer's 300-minute floor means **recorded squad size is median 20 (p10 16) against a real 25-30**, so share is biased upward, unevenly by squad. Same family as the `goals_against` rejection for CBs , a number that looks like a player property and partly measures his surroundings. **Revisit the moment true team goals can be sourced (`league_standings`) or the 300-minute floor is relaxed.**
  - **`rating` (API composite) is available and statistically independent-ish (0.36 / 0.24) and is REJECTED ON PRINCIPLE:** it is an external black-box grade, and importing it would put someone else's judgement inside the VV engine.

---

## RELOCATED FROM `CLAUDE.md` §D ON 2026-08-19 , GOALKEEPER CARD TREATMENT

Locked design, not started. CLAUDE.md keeps a pointer carrying every DECISION; this file holds the
detail and the measurements. CLAUDE.md wins on any conflict.

### GOALKEEPER CARD , **SUPERSEDED AND BUILT 2026-08-28. THE THREE-SPOKE RADAR IS DEAD; THERE IS NO RADAR ON A KEEPER CARD.**

**READ THIS HEADER BEFORE THE SPEC BELOW IT.** Everything from "THE RADAR , THREE SPOKES" down is the
2026-08-19 design and is kept ONLY as the reasoning trail. It was superseded by measurement, not by taste,
and the measurements are here so nobody reinstates it.

**WHAT SHIPPED INSTEAD:** `VVCore.keeperScore()` plus `VVCore.keeperPanelHTML()`, wired into `card.html`'s
Profile layer, with a new `s-gk` section on the playbook. **A percentile LADDER carries the score, a
saved-versus-conceded bar carries the composition, and the recorded figures are stated.** No radar.

**WHY THE THREE SPOKES DIED , THREE MEASURED REASONS:**
- **PENALTIES SAVED IS NOT A SCOREABLE AXIS, AND THIS IS THE ONE THAT KILLED IT.** The old spec already
  flagged 53.3% of the pool at zero and called it a rendering question. It is worse than that:
  **`penalties_missed` is zero for all but 2 of 1,583 keepers, so PENALTIES FACED IS NOT DERIVABLE** and
  the field is a count with no denominator. **Tested at 10% weight it put Trapp above Donnarumma and
  dropped ter Stegen , the highest save% in the pool , to 39th.** A spoke needs a rate. This has none.
  It is a stated FACT on the card and never a score term.
- **WORKLOAD IS NOT A MEASURE OF THE KEEPER, so a spoke overstates it.** Measured on the gated pool:
  **shots faced against save% is -0.118**, while **shots faced against goals conceded is +0.835.** Volume
  tracks the weakness of the team in front of him, near enough one-to-one. Given a spoke it reads as
  credit; given a bar with the count beneath it, it reads as context, which is what it is.
- **THAT LEAVES ONE HONEST AXIS, AND ONE AXIS IS NOT A SHAPE.** With penalties out and workload demoted,
  the three-spoke radar is a one-spoke radar wearing two decorations. **A ladder against the keeper pool
  says strictly more than a triangle could**, because it shows WHERE in the pool he sits.

**WHAT SURVIVED FROM THE OLD SPEC, UNCHANGED AND STILL TRUE:** shots faced is DERIVED as
`saves + goals_conceded` and is SHOTS ON TARGET faced (the card says "shots on target faced"); the pool is
keeper-only; shot quality is a PUBLISHED limitation, now on both the card and the playbook; the GK-75 cap
is untouched and is still the real job behind this.

**WHAT THE BUILD ADDED THAT THE SPEC DID NOT HAVE:**
- **GATES: 800 minutes AND 60 shots faced, 2015+.** 1,920 of 4,289 keeper cards score. The rest get a
  named reason , 1,299 pre-2015, 559 under minutes, 317 under shots, 194 with saves or conceded unrecorded.
- **THE LADDER IS AN EMBEDDED PERCENTILE TABLE (`KEEPER_SAVE_LADDER`), not a live query**, measured on the
  gated pool at every 5th percentile. **It is a snapshot: if the keeper population changes materially it
  must be re-measured**, and nothing warns you.
- **NO PER-LEAGUE NORMALISATION.** The spread across the nine leagues is 2.7 points of save%, which is not
  worth a per-league pool that would shrink every comparison set.
- **THE CAP IS STATED ON THE CARD**, one line under the score, because two keepers at the 54th and the 97th
  percentile both print 75 and the ladder underneath would otherwise contradict the number above it.

**THE PROOF ROWS BELOW ARE STILL UNBUILT AND STILL BLOCKED** on the percentile columns, exactly as the old
spec says. The panel does not depend on them.

---

#### THE SUPERSEDED 2026-08-19 SPEC , reasoning trail only, DO NOT BUILD FROM THIS
**Outfield cards keep the five-dimension radar UNCHANGED. GK cards get their own treatment, applied to every keeper card on the platform.** This is a locked design decision, not an open question , do not re-derive the spoke count.

**WHY IT EXISTS: a keeper card is currently an outfielder's card with the numbers emptied out.** Measured live on Neuer 19/20, which now holds saves 81, goals conceded 31, penalties saved 1: the radar reads Goal Threat 0, Creation 0, Progression 20, Defensive 1, Reliability 87 , **all of it arithmetically correct and none of it about goalkeeping** (the 20 is passing volume leaking through `0.02*passes_total`; the 87 is availability). The Proof lists Tackles 2, Interceptions NR, Blocks NR, because `POOL_DIM.GK = 'def'` hands keepers the defender row set. Not one of saves, goals conceded or penalties saved appears anywhere on the card.

**THE RADAR , THREE SPOKES. NOT FIVE, NOT FOUR.**
- **Save percentage** , `saves / (saves + goals_conceded)`. The one axis that is mostly the keeper rather than the team.
- **Penalties saved** , the only measure that is purely his own.
- **Workload** , shots faced, as CONTEXT rather than credit.
- **WHY NOT FOUR (i.e. adding raw saves):** saves and save percentage share a numerator, so a busy season would inflate two spokes for one reason , the double-count the method exists to prevent. And saves and goals conceded BOTH rise when the defence in front is poor, so half a four-spoke shape would be drawn by the team rather than the keeper. Separately, **a four-point radar renders as a diamond and reads as a shape rather than a profile.**
- **WHY NOT FIVE:** there are not five honest keeper axes. **Clean sheets are not in the source and are a team measure anyway.**

**THE PROOF , the same treatment as outfield cards, with percentile bars.** Carries **saves, save percentage, goals conceded, penalties saved and shots faced**. **Every number appears here; only the ones that mean something get a spoke.** Percentiles run against the **KEEPER pool** and **2015+ only**, since no saves data exists before that, **and the panel must say so.**

**THE PUBLISHED LIMITATION , shot quality is not in the source**, so a tap-in and a top-corner strike count the same. Save percentage separates keepers **partially, not fully. State it rather than implying the rate is definitive.**

**BLOCKED ON , THE GK-75 CAP.** While rt is capped and driven by availability and league strength, **no panel can say much about how well he kept goal.** This treatment is worth building anyway, but **the cap is the real job behind it.**

**ALSO NEEDS UPDATING , `vvindex.html`'s five-dimension section AND playbook's equivalent must BOTH explain that goalkeepers are measured on a different set, and why.** Both currently describe the five dimensions as though they apply to every card.

**FOUR MEASUREMENTS THE BUILD WILL NEED, taken 2026-08-19 so nobody re-derives them:**
- **`shots faced` IS NOT A COLUMN AND MUST BE DERIVED: `saves + goals_conceded`.** There is no shots-faced, save-percentage or clean-sheet column anywhere on the matview. **So it is shots ON TARGET faced** , it excludes blocked shots, shots off target, and anything off the frame. **Do not label it plain "shots faced" on the card without that qualifier**, or the number claims more than it is.
- **ALL THREE SPOKES COME FROM TWO SOURCE NUMBERS PLUS PENALTIES SAVED**, since save percentage is the RATIO of `saves`/`(saves+conceded)` and workload is their SUM. **That is a clean volume-and-rate decomposition rather than a double-count**, and it is the reason the three-spoke set holds up where four would not , but a future session will ask, so it is written down.
- **PENALTIES SAVED IS A SPARSE AXIS AND THE BUILD MUST DECIDE HOW IT RENDERS. 53.3% of the usable pool sits at ZERO** (1,162 of 2,179 cards over 900 minutes; 677 at one, 238 at two, 76 at three, 26 at four or more). **A spoke that is zero for over half the population collapses to a point on most cards.** Not a reason to drop it , it is the only purely-his-own measure , but decide the treatment deliberately rather than discovering it at render time.
- **THE POOL: 4,304 GK cards, of which 2,806 have saves and 2,179 clear 900 minutes.** Save percentage over that pool runs **33.3 / 68.5 / 100.0** (min / median / max), so the axis genuinely discriminates. **Earliest saves data is 2014, not 2015** , 10 cards , so gate on DATA PRESENCE per card, never on the season year, exactly as the confidence rework had to.

**DEPENDENCY THAT WILL BITE IF MISSED: the Proof's percentile bars do not exist yet for ANY position.** The launch Proof was trimmed to per-90 plus denominator (§D PARALLEL item 3), and the percentile columns are parked in `POST_LAUNCH.md` behind three unmade product decisions (pool, cross-league vs per-league, minutes threshold). **The keeper Proof inherits that block** , build the rows first and the bars with the percentile work, or settle those three decisions as part of this stage.


---

## RELOCATED FROM `CLAUDE.md` §D ON 2026-08-24 , VERDICT-TAG MARKS

### VERDICT-TAG MARKS , FOURTEEN, AND THEY ARE A SET PROBLEM. POST-MERGE (queued 2026-08-23, NOT started)
The fourteen VERDICT tags are the only named things on the platform with **no mark**, so `playbook.html` renders them as EMOJI through a deliberate fallback in `pbIcon()` , eight `.vchip` buttons and the six slider verdicts. **That fallback is load-bearing: do not strip the emoji until the marks exist**, or the section renders bare.
- **WHY IT IS POST-MERGE AND NOT A QUICK PASS: fourteen new marks must be checked against the seventeen already on that page, which is 465 pairs, not fourteen.** The trophies were 21 pairs and still took four iterations, and the collision that mattered there (`s-prestige` against the star, the disc and `s-vv`) only appeared when two sets were checked TOGETHER. A fourteen-member set added to a ten-member and a seven-member set on one page is a bigger version of exactly that problem.
- **AND THE SET IS HARDER THAN THE TROPHIES, because its members are ABSTRACT.** Seven trophies are seven objects. "A Clear Edge", "Photo Finish" and "VAR Close Call" are three ways of saying *narrow margin*, and "The Prodigy's Edge" / "The Ascendant" / "Twilight Brilliance" are three points on one age axis. **Near-synonyms are where pairwise distinctness is hardest to buy**, and forcing it risks the marks lying about what separates the tags.
- **THE HARNESS IS BUILT AND THE METHOD IS PROVEN , reuse it, do not rewrite it.** `_demo_marks_set.html` (gitignored) rasterises every mark at **16px**, the smallest shipping size, scores every pair by intersection-over-union, and **runs a POSITIVE CONTROL FIRST that must fail** (a duplicated pair scored 0.94, an unrelated mark 0.37). Warn at 0.52, collide at 0.62. `VVMarks.raw()` exists for exactly this. **A similarity harness that has not been shown to catch a planted collision is worthless.**
- **THREE OF THE FOURTEEN CARRY A SHARE-ONLY DISPLAY NAME** (§C: `VAR Close Call`, `The Complete Player`, `The League Tips The Balance`). **The mark keys must follow `VERDICT_TAGS[].name`, NOT the share name**, or `VVMarks.tag()` resolves to nothing and renders a blank pill , the silent failure the mark audit exists to catch.


---

## GK PIPELINE BACKFILL , THE MEASUREMENTS (relocated from `CLAUDE.md` §D, 2026-08-25)

**Closed work. The three decisions that must not be re-litigated stayed in `CLAUDE.md` §D.**

**DONE, do not re-plan it.** The keeper fields were arriving in the API response and being discarded by one line in the importer's merge. `player_season_cards` went 36 -> 43 columns, a 144 league-season backfill wrote **56,674 rows with rt unchanged on all 57,234 cards**, and the **2026-08-19 matview swap** surfaced them: `saves` 2,813, `goals_conceded` 31,365, `penalties_scored` 38,291, `starts` 56,555, plus the four discipline fields. **Pre-2015 yields `starts` only** , 16,211 rows against 16 with goals_conceded , because those blocks do not exist before 2015, so re-running will not fill them. `penalties_won` was captured, measured (1,701 rows, not one of them 0, so NULL conflated "won none" with "not recorded") and **dropped**. **Clean sheets are NOT on this endpoint and never were** , they would have to be derived or sourced elsewhere, and Sportmonks' evaluation never tested goalkeeping, so any provider decision on GK needs its own probe. **What remains is not pipeline work: it is the GK-75 cap (engine) and the keeper card treatment (see the stage above).**


---

## PER-CARD OG , THE GENERATED IMAGE IS DEFERRED. THE TEXT HALF IS NOT (scoped 2026-08-27)

**THE SPLIT: per-card TITLE and DESCRIPTION with the existing brand image is one session and carries no drift cost. The GENERATED per-card IMAGE is deferred, and the reason is not effort , it is that it adds a THIRD renderer of the same card.**

**WHY A THIRD RENDERER IS THE REAL PRICE.** The card is already drawn twice: the live DOM, and the html2canvas capture. Satori (what `@vercel/og` renders with) is a third, and it is not a near-copy , it supports only a flexbox CSS subset, no SVG filters, and fonts must be fetched as ArrayBuffers. So the card would be RE-AUTHORED, not reused.

**THE COST IS ONGOING, NOT ONE-OFF, AND THIS SESSION PRICED IT.** Two renderers diverged four separate times, each found individually and each needing its own fix or ruling:
- **THE RIM.** html2canvas drops an inset `box-shadow` on a rounded element, so the Generational gold rim vanished from every capture. Measured 2026-08-27: **ZERO gold pixels in the card's top-left corner without `vvShimInsetRims`, 370 with it.** Needed a capture-time shim.
- **THE MARKS.** `<use href="#...">` references resolve to nothing in the capture, so a mark renders BLANK , no error, no layout change. Needed `vvInlineMarks`.
- **THE TAGLINE.** Present in the card sheet's preview and ABSENT from the captured PNG, because the capture composes a separate frame and never read the element the preview showed. The container is even named `id="shareCapture"`, which is the reason nobody checked. Fixed 2026-08-26.
- **THE SHIELD'S SHADOW.** `filter: drop-shadow` is dropped outright. Accepted rather than shimmed, at a measured mean of 0.31/255 , blur cannot be faked without a visible hard edge.

**GENERALISE IT: each of those was invisible until someone looked at a specific pixel region, and each cost a session's attention. A third renderer does not add a third of that , it adds a new pairing to keep in sync FOREVER, and the two-renderer pairing already needed a dedicated audit harness (`vvAuditCaptureSupport`, §C) to stop the discoveries arriving one screenshot at a time.** The same defect class the trophies and the loader already recorded: **two drawings of one thing drift, and nothing tells you.**

**WHAT WOULD CHANGE THE DECISION.** If the OG image were a genuinely DIFFERENT artefact rather than a copy of the card , a text-and-score composition that never claims to be the card face , the drift argument mostly evaporates, because there is nothing to keep in sync. **That is the version worth building when it is built.** Re-rendering the card in Satori is the version to refuse.

**NOT A BLOCKER FOR THE TEXT HALF.** Per-card title and description need the middleware and the meta function only; they reference `og-image.png`, which already exists and is already correct.


---

## KEEPER TRAJECTORY , PLOT SAVE% INSTEAD OF rt (scoped 2026-08-29, NOT BUILT)

**THE PREMISE IS CORRECT AND THE NUMBERS ARE WORSE THAN THE COMPLAINT.** On the 1,538 gated
keeper cards that carry an rt: **rt against MINUTES correlates 0.942. rt against SAVE% correlates
0.245.** The line is a minutes chart. **39.2% of them sit exactly on the 75 cap**, so for two in
five keepers it is a FLAT minutes chart, and the whole gated pool spans just **35 distinct rt
values between 39 and 75**.

**COVERAGE , WHAT IT COSTS.** Across the **798 keepers with more than one season** (3,906
season-rows): **2,569 rows are plottable on save% (65.8%)** and **1,337 are ABSENT (34.2%)**.
**166 keepers would have NO line at all** , every season either pre-2015 or missing the fields.
Examples: S. Proto (8 seasons), F. Boeckx (6), J. Gillet (6).

**WHAT THE NAMED CARDS LOOK LIKE** (`--` is ABSENT, never zero):
- **Buffon , 11 seasons, 6 plottable.** `10:-- 11:-- 12:-- 13:-- 14:-- 15:81% 16:74% 17:75%
  18:74% 19:70% 20:76%` , **the first five seasons are a gap and the line starts mid-card.**
- **Casillas , 8 seasons, 4 plottable.** `10:-- 11:-- 12:-- 14:-- 15:69% 16:78% 17:77% 18:72%`
  , **half the card is absent, and note 13 is missing entirely**, so the gap is not even
  contiguous.
- Neuer 15/10, Lloris 13/8, De Gea 15/10 , all the same shape: a five-season hole then a line.

**THE DESIGN PROBLEMS THIS RAISES, none of them settled:**
1. **THE BARS ARE AS WRONG AS THE LINE AND THE BRIEF ONLY MENTIONS THE LINE.** `renderTrajectory`
   plots goals+assists as bars on the LEFT axis and rt as a line on the RIGHT. **For a keeper the
   bars are 0+0 on every season.** Fixing the line and leaving the bars gives a chart of empty
   columns with a line above them. **Decide both or neither.**
2. **THE AXIS RANGE IS THE OPPOSITE PROBLEM TO rt.** Save% for gated keepers runs roughly 60-85%,
   so a 0-100 axis flattens every career into a line near the top. It needs its own zoomed scale,
   and a zoomed scale makes small differences look large , the reverse of the current fault.
3. **HOW IS "ABSENT" DRAWN?** A gap in the line, a greyed band, or a labelled region. **A gap
   risks reading as a bad season rather than an unmeasured one**, which is precisely the NR
   failure the radar work just removed. Casillas shows the gap need not be contiguous.
4. **166 KEEPERS GET AN EMPTY CHART.** They need the same treatment the radar got: say what is
   missing rather than draw nothing.
5. **`renderTrajectory` IS SHARED BY card AND compare** (§D), so any change must be checked on
   both, and compare draws TWO players , a keeper against an outfielder would then be plotting
   two different quantities on one chart. **That case needs a rule before this is built.**

**CHEAPEST HONEST INTERIM, if the full build is not wanted: suppress the trajectory on keeper
cards** and say why, exactly as the radar is suppressed above three nulls. That removes a
misleading chart today without inventing a new one.
