# VVonderXI , ARCHIVED SESSION LOG (read only when you need the WHY behind a settled decision)

**THIS FILE IS NOW THE SESSION LOG AND NOTHING ELSE.** The 9-league ingestion-gap recovery narrative that used to sit here as PART 2 was merged into `INGESTION_RECOVERY.md` on 2026-08-10. If you are looking for anything about ingestion, re-ingest, the importer or its duplication guards, go there, not here.

**THIS FILE IS NOT AUTHORITATIVE. `CLAUDE.md` IS THE MASTER SOURCE OF TRUTH.** If anything here conflicts with CLAUDE.md, **CLAUDE.md WINS** , without exception. This file is a record of what was done and why, frozen at the moment it was archived. It is NOT maintained, NOT reconciled against live code, and NOT updated when decisions change. Nothing here is a live instruction, a live "NEXT", or a live open item. Several entries contain "NEXT:" lines and rollout statuses that were true when written and are now finished or superseded , **do not act on them.**

**Do NOT read this file at session start.** Read CLAUDE.md in full instead. Come here only when you need the evidence, measurement, or reasoning behind a decision CLAUDE.md already records as locked, and only for the specific thing you are looking up.

**Split performed 2026-07-29.** CLAUDE.md had reached 179k and risked truncation on read. Everything load-bearing , the resume point, open queue, locked decisions, working protocol, and every "do NOT re-derive" invariant , was kept in or promoted into CLAUDE.md BEFORE this content was moved. Five locked designs that had lived only inside old session-log entries were lifted into CLAUDE.md §C/§D/§E first: the Compare verdict-tag system + age-tiebreaker, the VV Index anchoring notes, the mobile-Safari 3D flip invariants, the CDM def_core open question, and the card prev/next spec + post-launch data-source options. **Nothing load-bearing exists only in this file.**

**Append-only discipline still applies.** These entries are preserved byte-identical to how they were written. Never rewrite a past entry, here or in CLAUDE.md.

**2026-08-18 relocation.** CLAUDE.md hit **91.9%** of its 150k truncation limit, past its own 90% trigger, with a session-log entry still to write. The three entries below (2026-08-13, 2026-08-14, and 2026-08-14 -> 08-16) were moved here from CLAUDE.md §F; the 2026-08-16 entry was deliberately KEPT in CLAUDE.md so the next session still has recent orientation. **Load-bearing content was promoted into CLAUDE.md §C and §E BEFORE the move:** the all-57,234-card snapshot rule and the render-in-a-real-browser verification rule into §C (both are referenced from code comments, so they could not be left only here), and four open items into §E , the ~350 unresolved tier-1 cards, the one UNSURE card 164296, the three Chronicle orphans with no `players` row, and the messi-1617 paragraph count. **Nothing live was archived.** Two deferred §D specs moved to `POST_LAUNCH.md` in the same pass; see that file.

**2026-08-14 relocation.** CLAUDE.md hit 90.4% of its 150k truncation limit. The two 2026-08-11 entries below were moved here from CLAUDE.md §F. **Their three still-open items were promoted into CLAUDE.md §D before the move** (compare.html div/comment imbalance, the home-page versus regex, the 67 double-spaced folded names) , so nothing live was archived. §C and §D were left intact by instruction.

**Ordering.** PART 1 (session log) is newest-at-top, matching CLAUDE.md §F. **PART 2 is no longer in this file** (moved to `INGESTION_RECOVERY.md`, 2026-08-10); it was deliberately kept in its ORIGINAL chronological order , it is one continuous technical narrative of a single project, and reversing it would destroy the reasoning chain.

---

# PART 1 , ARCHIVED SESSION LOG (newest at top)

**Archived 2026-08-10 , four entries (2026-08-06 back to 2026-08-02) moved out of CLAUDE.md §F to bring it under 75%. Three load-bearing facts were PROMOTED into §C first: the real rt range 11 to 97 with 44% of cards below 50, the prestige-exempt-from-cap rule, and the four tag-render paths.**

### 2026-08-19 | The matview swapped without an outage, and the goalkeeper stopped being an outfielder with the numbers removed

**Six commits, `9a6c2b6` through `7b92c65`, plus this pass. The keeper thread ran the whole length of the stack: database, then card, then AI, then docs.**

**1. THE MATVIEW REBUILD, AS A SWAP RATHER THAN A DROP , 210ms of lock instead of 10-30 seconds of outage.** `player_card_mv_new` was built beside the live one, indexed, GRANTED, and then both renamed in one transaction. **The grant goes BEFORE the swap deliberately**, because a denied SELECT returns empty with no error, so a missing grant renders as an empty site rather than a fault , granting the new object while nothing reads it keeps that failure mode off production entirely. **`_old` survived as a complete indexed rollback until the site was checked by hand.** The matview is now **65 columns**: the 47 it had, plus 6 keeper/penalty, 4 discipline and 8 defensive that were already on the view.
- **Percentiles were deliberately EXCLUDED.** `POST_LAUNCH.md` names none of the eight stats and gates them on three decisions that need the distributions visible first, **and the swap makes a later rebuild cheap, so guessing now buys nothing.**
- **Verified: rt changed on ZERO of 57,234 cards**, null rt held at 3,061, range held 11-97, elite held at 650. `penalties_won` was dropped afterwards, and the importer change had to be committed FIRST or the next run would have failed every insert on a column that no longer existed.
- **`information_schema` IS BLIND TO MATVIEW GRANTS** , `role_table_grants` returns nothing for a matview, and reading it would have reported "no grants exist". `pg_class.relacl` is the authoritative source. That is now in §C.

**2. THE VERIFICATION SCRIPT FAILED AGAINST A PERFECTLY HEALTHY DATABASE, twice over.** It read `SUPABASE_ANON_KEY` from `.env`, which is EMPTY in this repo, so every request went out with a blank header and returned 401; and it accepted only HTTP 200 when PostgREST correctly returns **206** for any response carrying a Content-Range. **A script that cries wolf on a healthy database is worse than no script**, because the next person reads the red output as an outage. It now falls back to the publishable key the pages inject, which is also the more faithful test.

**3. THE SWIPE HINT BECAME A PEEK.** A "‹ swipe ›" line asked someone to read before acting and went unnoticed; a sliver of the REAL next card at the right edge explains the gesture without words. **The clip lives on the peek as a SIBLING of `#heroCard`, never on an ancestor** , §C is explicit that an ancestor clip flattens `preserve-3d` on iOS , and the hero moves by MARGIN, never transform, for the same reason. Measured at 390: the card keeps its 300px width **with and without the peek**, the sliver is 44px flush to the content edge, and the hero shifts just 5px, derived from the measured card rect rather than assumed.

**4. THE GOALKEEPER CONFIDENCE DOTS, RETIRED AND REPLACED.** The matview rebuild made the card's own disclosure the false statement , it said "not yet measured" beside a Neuer card holding 81 saves. Keepers now score on the **same 2-to-5 scale** against a keeper field set, and **top out at 4 of 5 because clean sheets are not in the source**, a ceiling that falls out of the existing formula rather than being hardcoded.
- **NO ERA BRANCH, and the data is why.** 204 cards from 2015 onward have no keeper data while 10 pre-2015 cards do, so an era rule would misfile 214 cards in both directions. What replaced the interim state is **ordinary NR** , identical to how a pre-2015 outfielder already reads , **so there is no bespoke state left to go stale the next time coverage moves.** That is the durable half of the lesson.
- Compare had a bug waiting: its "missing:" line was scoped to the advanced group, which goes empty for a keeper, so a goalkeeper would have claimed a **"full stat record"** while missing clean sheets.

**5. THE AI GUARD , THE CAUSE, NOT THE WORDING.** The prompt told the model "no goalkeeping data has been ingested". True when written, false after the rebuild , **but the model still could not see the figures, because the payload never carried them.** Rewriting the sentence alone would have left it writing about a season it still could not read. The four figures now go in **for keepers only**, because `stats_hash` covers the whole player object and adding keys for every card would have shifted every outfielder's hash and invalidated all 296 notes instead of 7. The guard now permits what the numbers contain and forbids the rest, names clean sheets as absent, **warns that a save total measures how much work a keeper was given at least as much as how well he did it**, and repeats that rt is capped at 75 and reflects availability and league strength.
- **Cache impact, measured: `NOTES_VERSION` moved, `VERDICT_VERSION` did NOT** (the guard lives in the notes-only portion, which is exactly why the versions are derived per cache). Of 296 notes rows only 7 carried the current stamp, and **exactly ONE goalkeeper note exists in the whole cache** , De Gea 2018 , so the single row that was wrong is the single row this forces to regenerate.

**6. THE GOALKEEPER CARD TREATMENT IS LOCKED, NOT BUILT.** Three spokes , save percentage, penalties saved, workload. **Four is refused** because saves and save percentage share a numerator and both saves and goals conceded rise when the defence is poor, so half the shape would be drawn by the team. **Five is refused** because there are not five honest keeper axes. Full spec relocated to `POST_LAUNCH.md`. **It is BLOCKED ON the GK-75 cap** , while rt is capped and driven by availability and league strength, no panel can say much about how well he kept goal.
- **A read-only audit found what is still outfield-shaped on a keeper card:** the radar reads 0 / 0 / 20 / 1 / 87, all arithmetically correct and none of it about goalkeeping; the Proof hands keepers the DEFENDER rows because `POOL_DIM.GK = 'def'`; the trajectory plots goals and assists, a flat zero line across fifteen seasons; and **0 of 1,000 GK cards sampled carry a single profile tag.**
- **STILL UNRESOLVED: the Commentator's Notes and scout report do not render on Neuer at all.** Both are hidden by one handler, `vvEditorialFail()`, so their absence proves the request fired and FAILED , nothing gates them on tags or on a keeper field. He has no cached note, so every view generates. **The ten-second test is to open De Gea 2018, the one keeper served from cache:** notes there but not on Neuer isolates it to generation, and the rewritten guard may already be the fix.

**7. THE RELOCATION PASS, 89.4% -> 76.3%.** The archive was checked first (66.6%, no split needed). **§D fell from 38% of the file to 27.8%**: the nine queued hygiene specs to `LAUNCH_STAGE.md`, the goalkeeper stage and the filter follow-up to their stage files, each leaving a pointer that carries the DECISIONS so nothing load-bearing lives only in a stage file. **The GK pipeline-gap block was rewritten rather than moved, because the rebuild had made it false** , it still described adding columns and re-ingesting as pending work.

### 2026-08-17/18 | Keeper data captured end to end, a pagination bug nobody could see, and the card learns to walk a list

**Seven commits, none pushed: `8634b5a` GK confidence, `e8b099c` sort tiebreak, `283bf10` card sequence, `64f0d71` backfill tooling, `28357d3` polish, `8cba855` copy, `119bd99` relocation. Cache token `20260818b`.**

**1. GK CARDS STOPPED CLAIMING A COMPLETENESS THEY CANNOT HAVE.** `confidenceFor` scored every card against seven granular fields, **all seven describing OUTFIELD play**, so a keeper was measured on how much of an outfielder's record he happened to carry. **Neuer 19/20 showed 4 of 5 under a caption reading "how complete the data behind this card is".** It now returns **null** for a keeper , not 0, not a reduced score, because any number is a claim that cannot be made , and both consumers render an explicit not-yet-measured state with **no dots** (five hollow dots read as a zero). **Compare was the worse of the two sites:** `c.confidence||0` cannot tell null from zero and would have printed **"0 / 5"**. Wording is "not yet measured", NEVER "cannot be measured", with a note to revisit on the matview rebuild. 4,302 GK cards, the other 52,932 untouched.

**2. THE SORT WAS NOT A TOTAL ORDER, AND RANKINGS HAD BEEN SILENTLY LOSING ROWS. The most consequential thing here, and it predates every feature in this session.** `applyServer` ordered by ONE low-cardinality column. **MEASURED: the SAME rows 0-99 query returned two DIFFERENT orders on consecutive calls, and the first 12 rows of a 0-99 window did not match the same query asked for rows 0-11.** Because rankings pages with `range()`, **a card could appear on TWO pages, or on NONE, as the offset advanced** , silent both ways. Fixed with `card_id` as a secondary sort; after it, 300 rows across three pages came back 300 unique. **Committed ALONE and FIRST so it reverts independently of the feature that exposed it.** Rule in §C. **It was invisible until something depended on the ordinal being stable** , a bug that corrupts only WHICH rows you see never announces itself.

**3. CARD SEQUENCE NAVIGATION.** Arrows and a counter on desktop, arrow keys, swipe on phone, and **nothing at all without a sequence**. **THE STATE IS THE QUERY, NEVER A LIST OF IDS** , ids go stale and would have to ride in the URL to survive a share, handing a visitor someone else's results. sessionStorage; `replaceState`, as season switching does. **THE VISITOR'S ORDER IS NOT ALWAYS THE SERVER'S, and missing the second reason cost a silent off-by-one:** tag filters shift later ordinals, **and a name search makes rankings re-rank each page**, so the visitor's 12th "arsenal" row was card 133491 where the server's index 11 was 131127. The sequence is rebuilt through the rankings pipeline **at the same page size**, since the re-rank is per page. The counter prints a total only when one is known; under tag filters it shows the position alone, same standard as the GK dots.

**4. API RENEWED AND THE KEEPER/PENALTY PIPELINE GAP CLOSED , 56,674 ROWS, rt UNCHANGED ON ALL 57,234 CARDS.** The free window was exactly **2022-2024, blocked in BOTH directions** (the live season was unreachable too). **`/status` IS SERVED CACHED and must not be used for quota** , it read 22 used both before and after a 51-page run while real endpoint headers decremented every call. **The run: 144 of 144 league-seasons, 5,117 pages, 5,180s, resolved 56,690, updated 56,674, missed 16, errors 0, reconciliation balances.** Full before/after snapshots: **rt changed on ZERO cards, null rt held at 3,061, range 11-97, elite 650.** The columns are **not on the matview**, so none of it is visible yet; that rebuild is the only remaining GK work (§D).
- **THREE THINGS MEASURED AND THEN NOT BUILT.** `captain` DROPPED , the provider returns **False for Bruno Fernandes 23/24, van Dijk 23/24, Kane 22/23 and Reus 19/20**. `penalties_won` stored RAW and never coalesced , **all 9 sampled players who SCORED a penalty carry null there** while the 3 populated rows scored none; at 3% it is the column to drop. Keeper saves **NOT** merged into `tackles_blocks`, which sits in the view at char 574 beside the `def_core` ingredients and would have moved rt on every GK card.

**5. `starts` CAME BACK POPULATED TO 2010 WHILE `saves` STOPS AT 2015 , SOURCE BOUNDARY, NOT A FAULT IN THE RUN.** Pre-2015 rows carry **`starts` on 16,211 and `goals_conceded` on 16**. `games.lineups` rides in the same block as minutes and appearances, which survives the 2015 wall; the keeper and penalty blocks simply do not exist before it, exactly as the `statistics_players` coverage flags predicted (PL from 2014, seven leagues from 2015, **BPL only from 2020**). **The pre-2015 nulls are the record being honest and re-running will not fill them.** This extends the §D list of fields usable across the WHOLE record to six: appearances, minutes, goals, the two discipline columns, and now `starts`.

**6. EIGHT POLISH FIXES, seven applied and one deliberately reported instead.** Arc end labels realigned to the inside edge (`translateX(-50%)` had pushed half of each outside the stage; marker positions untouched). Top Assists redrawn, **measured dx 0.00 dy 0.00** against the plaque. Squad-number copy rewritten. Honour names added to all seven trophies (**7.14:1 / 6.22:1**). **The eighth was not Reliability's button at all** , all five dimensions are handled identically with no folds; it belonged to a collapsed section-level essay and is now labelled "Read the full story", matching `#s-vv`.
- **THE SWIPE FIX IS THE ONE TO REMEMBER: the gesture was judged only at `touchend` on PASSIVE listeners, so the browser had already scrolled by the time we looked.** Deciding late was the bug. The axis is now decided DURING the gesture, with `preventDefault` on a `{passive:false}` touchmove once it locks horizontal. Ratio dropped 1.5 -> 1.0; 1.5 demanded a 56-degree cone and rejected ordinary thumb arcs.

**7. COPY.** `<79` became **`≤79`** , the band is 0-79 INCLUSIVE, so `<79` excluded 79 itself and stated the band wrongly on a public surface. Written as an escape in vv-core, since that string is rendered and an external classic script inherits the document's charset.

**8. RELOCATION PASS, 91.9% -> 80.6%, AND THE PAYING MOVE WAS NOT THE SESSION LOG.** Archive checked first (56.7%, no split needed). Three §F entries out, 2026-08-16 kept for orientation, two deferred §D specs to `POST_LAUNCH.md`. **§F is 15% of the file while §C is 35% and §D is 38%, so archiving alone cannot fix this again** , what paid was relocating open-but-not-open-YET specs out of §D.

**THE INCIDENT: `git reset --hard` DESTROYED AN HOUR OF UNCOMMITTED IMPORTER WORK.** During a commit split, resetting four front-end files to HEAD, it also wiped uncommitted changes to `api/import-players.js` and `gk_pen_backfill.js`. **Nothing was staged, so there was no git object to recover from** and it was hand-rebuilt. **The running backfill survived only because Node had already loaded the module from disk.** Rule in §C: name the files, and commit or stash unrelated work BEFORE a split, which is exactly when it is most exposed.

**METHOD NOTE, three sessions running now: THE INSTRUMENT NEEDS THE SAME SCEPTICISM AS THE CODE.** Three false alarms, each caught by a second source. **`pgrep -f <script>` matched its own shell** and reported a finished job as running. **A parser using `[A-Z]+` silently dropped `L1`**, so a whole league read as skipped when all sixteen of its seasons had run. **A stuck transition in a throttled tab produced a border colour present in no rule.** All three sit in §C beside the render-in-a-real-browser rule.

### 2026-08-16 | The Playbook rebuilt around its own components, and a rule finally generalised

**Seven commits, none pushed. Preview still on `1317d40`, so none of this is live** and the `vv-core` cache token bumped to `20260816b` has not taken effect. `1c9805c` pitch selector, `0b47e44` identity-vs-ability, `3eb9697` rarity ceiling, `46ccfe8` grey line + chip definitions, `3105daa` generic mockup, `1846109` copy pass + cream card, `618893c` career arc + verdict split.

**1. PROFILE TAGS IS A PITCH, NOT A WALL OF TEXT.** Eighteen tags in five text groups never answered the question a newcomer actually has , where does a Regista stand. Eight positions across eleven markers (WNG/FB/CB mirrored), tag lists **GENERATED FROM `eligibility()`, never hand-written**, each checked against the live matview so every listed tag is held by a real card of that position. **GK is a deliberate empty state.** Chips became tappable in `46ccfe8` with the definitions lifted verbatim from the rows the pitch replaced.

**2. THE PITCH IS WHAT EXPOSED THE ENGINE BUG , building the display surfaced a defect the engine had carried for months.** CAM showed 5 tags where CM showed 10, and the reason was that Maestro gated on family. That became the §C identity-vs-ability rule and `0b47e44`: five identity tags moved onto `position_pool`, null-pool cards stopped receiving them, **Regista 1,118 -> 635 (58.7% of its holders were defenders), Maestro +74 CAM**, every ability tag unchanged to the card. **505 cards lost their last tag and NONE is rt>=85** , the losses are entirely in the tail, so this was not the Iron Man trade.
- **The doc was wrong too, and in the direction that mattered.** §C claimed all tags sat in a 1-2% band; four identity tags were below it and had been beforehand. `3eb9697` rewrote it as a **CEILING, not a target** , rarity follows the archetype, and forcing a narrow archetype upward would admit players who are not that thing, which is the error the identity fix had just removed. The same wrong framing was corrected in `vv-core`, where it sat directly above the rarity floors and would have been read by whoever tuned next.

**3. THE GREY LINE, WHICH SURVIVED TWO BRIEFS BECAUSE NOTHING IN THE MARKUP LOOKED WRONG.** The mockup's trajectory polyline drew diagonally across the Proof and Watch panels. `inset:0` does not size an inline SVG , it is a REPLACED element with an intrinsic ratio, so `height:auto` resolved from 100:44 and `bottom:0` was silently ignored. **Measured with the old rule restored: 467.3px tall against a 44px chart, the polyline ending 274.6px below it.** Full post-mortem in `SILENT_FAILURES.md`.

**4. THE CARD MOCKUP TEACHES THE LAYOUT, NOT A PLAYER (`3105daa`, `1846109`).** It carried Messi's name, club, shirt and real 11/12 totals; now PLAYER / Attacking Midfielder . Club / 8 / 84 / 12 goals / 9 assists, with the Proof reconciling (12 and 9 over ~2,700 minutes gives exactly the 0.40 and 0.30 shown , it previously said 10 goals on the face and 50 in the table). **The Chronicle panel is the deliberate exception and is marked "(example)"** , it quotes a real editorial artefact and a fabricated one would misrepresent the feature. The card also went CREAM in both themes, following card.html's `.layer` pattern: a cream-in-both-themes surface SCOPES its own ink tokens rather than relying on `body.light`.

**5. CAREER STAGE IS AN ARC AND VERDICT TAGS ARE SPLIT BY KIND (`618893c`).** The arc runs green to crimson to gold with the four unbuilt trajectory tags shown GREYED rather than hidden, so the shape is complete and only needs colouring in. **Marker positions are computed from the bezier and verified against the RENDERED path** (within 1.8px desktop, 0.6px mobile). Verdict tags became a draggable gap-ladder spectrum plus chips for the verdicts the gap does not explain. **NO NUMBERS ANYWHERE is a product constraint, not styling** , the engine weighs a profile, not a subtraction, and arithmetic on the page would read as a lookup table. Verified on rendered text: zero digits in the section.
- **The ladder is SIX, not five.** The brief listed five for the spectrum; Bragging Rights Settled fires on a 7-9 gap per §C, so putting it under "when the gap is not the story" contradicted its own trigger. Flagged, and Lucas moved it onto the spectrum.

**METHOD NOTE, and it is the same one as last week with a new instrument: FOUR defects were invisible to reading and to a DOM shim, and needed real layout.** The grey line, the light-mode chip state, and both mobile touch targets (arc marker 19px, slider 26px, against the 44px guidance) were only found by rendering the page in a real browser via a local `python3 -m http.server` and measuring. **That is now a repeatable check and should be the default for any visual change.** Twice in the same session I reported a defect that was my own harness misreading , clicking a heading that closed the fold, and probing an element scrolled out of an iframe , so the instrument needs the same scepticism as the code.

### 2026-08-14 -> 08-16 | Tag engine finished, the Chronicle rebuilt, and The Card explained

**~20 commits, none pushed. Preview still on `1317d40`, so NONE of this is live.** This entry covers the sessions that ran without one, because the doc was too close to truncation to take them. Read the 08-14 entry below first , it is the first half of the tag work.

**1. THE TAG ENGINE IS NOW COHERENT END TO END, and the last defect was the one no bar could fix.** After the threshold rekey (below), `eligibility()` was still reading the COARSE `position` field while `TAG_THRESHOLDS_POOL` read the pool, **so a miscoded card was ADMITTED by one field and JUDGED by the other, and drew whichever bar was easiest.** An ST-pool card carrying coarse MID was eligible for Engine Room, a MID-only tag, but judged against ST's `passes90_p80` of 28.2 instead of MID's 51.9. **Measured against an 8.28% population baseline: Maestro 46.0% minority-family, Engine Room 39.4%.** Fixed by `POOL_FAMILY[pool] || coarseFam` (`04d127d`) , Maestro and Engine Room both fell to 0.9% and landed IN BAND with no threshold touched. **THE LESSON IS IN §C: raising the bars could not have fixed it, because those cards passed by WIDE MARGINS on the wrong pool's threshold.** Tuning first would have been tuning twice.
- Then `4aa8d68` tuned the seven remaining over-band tags to 1.0-2.0%, **choosing each lever on the BOTTOM EDGE rather than the count** , for Complete, two candidate levers both gave exactly 1,011 cards and overlapped on only 685. Raw floors beat multipliers on every tag.
- **Iron Man is a DELIBERATE band exception at 3.40%** and §C says why: forcing it in stripped the last tag from 84 elite cards.

**2. THE CHRONICLE WAS RENDERING ON THE WRONG PLAYER'S CARD, on three keys, and nothing looked wrong.** `CHRONICLE_MAP` matched on display name + season. **A Spanish winger at Levante was showing Son Heung-Min's Golden Boot night; the Colombian Luis Suarez at Granada was showing the Uruguayan's title-winning one; two different Paulinhos, one of them the OPPONENT'S, were showing Sporting's.** Confirmed on `api_player_id`, nationality and date of birth, then re-keyed (`f80eeb5`). **This is the §C display-name rule biting a surface written before that rule existed.**
- Same pass: **`SIGNATURE_MOMENTS` had 53 literal entries but 51 distinct keys** , two were defined twice and the later silently won, so two hand-written Chronicles were dead content. An `opponent` field was added to all 51 (not derivable , only 72 of 106 scoreline club names match a `team_name`), and the watch CTA was built on it (`56dc71c`).
- **Then 21 new Chronicles (`4fbdd34`), 51 -> 72 moments, 48 -> 69 map rows**, every one resolved to an explicit `api_player_id` before writing. Messi 12/13 (rt 96) was the highest-scoring card on the platform without one. **The low end is deliberate: Ribery 18/19 at rt 72, Aguero 20/21 at rt 59, on the principle that a great night does not require a great season.**

**3. THE CARD IS NOW EXPLAINED, AND THE PLAYBOOK SECTION WAS REBUILT FOUR TIMES GETTING THERE.** An audit found the card carries almost no explanatory copy of its own , **the squad number has none at all, the Chronicle never says what it is or why only some cards have one, and the Proof names its columns without ever explaining per-90 or NR.** So `#s-card` was written as FIRST definitions, not restatements (`6931761`, `1544ae5`), trimmed from 11 items to 6 when it overlapped the rest of the page, then **rebuilt as an annotated card mockup** (`9fed442`) and finally as **panels that expand IN PLACE** (`1559e5a`), each carrying a live representation of itself , the Glance's three figures, a six-season bar chart, a Per 90 / Total table with an NR row, the watch pill, the real Messi 11/12 quote.
- **The mockup mirrors the card page deliberately: both are a stack of expanding layers.** The separate detail pane was removed because it reserved a large empty block before anything was tapped.
- **`vvFoldSections` was extended to accept `.cardmock`** so the section folds like every other one; its count badge is skipped, since there is no repeated item list.

**4. A NAMING COLLISION WAS FIXED FROM THE WRONG END FIRST, and the correction is the interesting part.** The gold Chronicle pill read "SEASON HIGHLIGHT" (70 cards) while the universal watch link said "... 23/24 highlights" (all 57,234). `3f0ad9e` renamed the pill to SIGNATURE MOMENT. **Then the better call arrived: the pill was right and the LINK was misnamed** , a whole-season compilation is not a highlight of one thing , so `b3cc058` changed the button to "Watch Lionel Messi , 11/12 season". Both commits stand; the second says why. **The YouTube search query keeps "season highlights" deliberately: that is how YouTube indexes football footage, and a URL is not user-facing copy.**

**5. BAND VOCABULARY UNIFIED ON "ICONIC" (`33f13aa`, `899dc49`).** The 90-94 band had FOUR public names across vvindex, playbook, the filter, the card badge and the glossary. One line in `VVF_BAND_LABEL` fixed three surfaces at once because they share `VVFilters`. **Three live light-mode contrast failures were found and fixed en route** , Iconic and World Class were BOTH `var(--gold)` at 1.77:1, and Standout was 1.83:1, all of them inline styles that `body.light` could never override.

**WHAT IS OPEN.** `lionel-messi-1617` has 2 narrative paragraphs where the other 71 have 3 (a third was proposed, not chosen). Three Chronicle orphans remain unreachable , Kuyt, Kompany and Rooney have no row in `players`. **Profile Tags is still the 5-group, 18-item text layout** , a pitch-based selector has been discussed but NOT built, and nothing in the repo implements one. **And nothing is pushed: ~57 commits, preview on `1317d40`.**

**METHOD NOTE, and it is the through-line of the whole stretch: FOUR defects this week were invisible to reading and were caught only by EXECUTING the code.** The wrong-player Chronicles needed a live query; a `padEnd` swallowed a comma and took `card.html` down; a missing trailing comma did it again on the 21-entry insert; and a `data-cm` attribute on the mockup markers shadowed the panel in `closest()`, so marker clicks silently did nothing while header clicks worked. **`node --check` does not reach inline `<script>` at all** , the §D linting item is still the right fix.

### 2026-08-14 | TAG ENGINE , threshold rekey, Marksman retired, Goal Machine rebuilt

**3 commits (`bc148b8` code, `74de90e` + `9f01868` docs), NOT pushed. Every number below was produced by EXECUTING `getVVTags` over all 57,234 cards, never by reimplementing the rules , and where a rule had to be varied to model an alternative, the model was validated against the engine's own output first (it reproduced 787 exactly before any option was reported).**

**1. THE REKEY , THE ROOT DEFECT, AND IT WAS INVISIBLE FROM EVERY SURFACE.** `TAG_THRESHOLDS` was keyed on the COARSE `position` field while `eligibility()` has always run on `position_pool`, so the two halves of the tag engine disagreed. **A pool spans MORE THAN ONE coarse family** , 4,740 of 37,091 pooled cards (12.78%) sit in a minority family for their pool. **MEASURED: the Goal Machine cut landed at p99.5 for a CAM read as FWD and p75.3 for a CAM read as MID.** A 24-percentile swing decided by the field §C already records as systematically broken. Fixed by `TAG_THRESHOLDS_POOL`, calibrated so each pool carries the pass-rate the coarse table produced; the coarse table stays as the fallback for the 35% of cards with no pool (verified 0 null-pool cards changed).

**2. MARKSMAN RETIRED, AND THE ALTERNATIVE WAS MEASURED BEFORE IT WAS REJECTED.** It was a TIER, defined by failing Goal Machine's bar, never a TYPE. The rekey made it undeniable: **Kane 2021 (23 goals, 0.6706/90 against an ST bar of 0.674) dropped to "Marksman" by 0.004.** Redefining it as accuracy was tested and killed , **shots-on-target correlates 0.614 with conversion (0.586 within ST) and `shots_on` is 100% NULL pre-2015.** Full field menu + the other decided negatives are in §D.

**3. GOAL MACHINE , THE RATE CUT WAS REJECTING FULL SEASONS, NOT WORSE SCORERS.** **55 cards scored 20+ goals and were NOT Goal Machines**, and the rejected group averaged **3,028 minutes against 2,688** for holders. **The gap WIDENS with volume , 15+ goals +255, 18+ +318, 20+ +340 , which is the signature of a per-90 artefact, not a scoring judgement.** A 21-goal ever-present was refused while a 24-goal player in 2,500 minutes qualified.
- **A FLAT 15-GOAL FLOOR WAS SHIPPED AND REVERSED THE SAME DAY.** It is POSITION-BLIND, which re-imposed the exact defect the rekey had just removed: **CM fell 38 -> 5 and the tag became 66% strikers.**
- **FINAL: per-pool raw floors at 4% within-pool rarity , ST 23, Winger 16, CAM 13, CM 9, CDM 7** (null pool falls back to coarse FWD 15 / MID 9). 862 cards, 1.51%, take-up 3.2-4.3% in every pool.
- **EQUAL-RARITY CALIBRATION IS CORRECT FOR A RATE TAG AND BREAKS ON A VOLUME TAG. This is the transferable lesson.** The first calibration matched ST-at-15's rarity (14.81%) in every pool and produced **3-goal centre-backs at rt 53** as the ten lowest holders, plus 3,136 cards (5.48%). **A 3-goal CB is as rare among CBs as a 15-goal ST is among STs and is still not a goal machine** , the NAME makes an absolute claim, so rarity and identity come apart. **CB and FB were dropped from eligibility entirely: 45 cards, and every absurd bottom holder went with them.**

**4. CLINICAL 25 -> 30, and 40 was tried and rejected ON THE TRADE, not on the noise.** 40 removed all 8 small-sample offenders but cost **53% of the tag and untagged 1,120 cards**; 30 removes 5 of 8 for 20%. **MAESTRO x1.20** on the key-pass leg, correcting a rekey overshoot (980 -> 633, at or below its previous 651).

**NET: cards holding >=1 tag 25.97% -> 24.93%.** Goal Machine 853 -> 862 but composed completely differently (ST 66% -> 17.9%, CM and CDM restored). Marksman 1649 -> 0. Clinical 1141 -> 909.

**ALSO SHIPPED: the 90-94 band vocabulary unified on "Iconic"** (`bc40f33`) , it had FOUR public names across vvindex/playbook/filter/badge/glossary. One line in `VVF_BAND_LABEL` fixed three surfaces at once because they share `VVFilters`. **And §C gained the anchor-pinned finding**: the ladder populations are rank anchors (`OFFSET 11/149/649`), so 12 Generational and 650 at 85+ are structural constants, which is why the elite count held at EXACTLY 650 across the 351-card tier-1 write.

**WHAT IS OPEN.** Nothing pushed , **33 commits behind**, preview still on `1317d40`. The `fouls_drawn` tag (most orthogonal metric available, but its raw leaderboard needs a quality gate) and surfacing the four discipline fields onto the matview, both scoped in §D.

### 2026-08-13 | TIER-1 POSITION WRITE , 351 cards, and the ripple did exactly what §C said it would

**DB write + matview refresh + provenance. NOT pushed. The write artefacts are committed so the before-state is recoverable without a restore.**

**WHAT WENT IN.** 351 of the 353 Fable tier-1 returns: **126 updates, 15 inserts, 210 already correct**, i.e. **141 real changes**. Every row resolved on `card_id` with `api_player_id` asserted to agree BEFORE any write, never on display name (§C). **Every write was read back and compared to the intended value , 0 failures.** The 15 inserts are cards with NO `player_positions` row at all, where the mv had been falling back to coarse `psc.position`; those are new rows, not edits, and they are invisible in a "changed position" count. Provenance: 310 rows added to `known_players.csv` stamped `tm-fable-tier1,2026-08-13` (41 of the 351 already carried an `api_player_id|season_year` entry and were left alone).

**TWO EXCLUSIONS, and one of them was my call rather than the brief's.** `O. Aydin 2324` (card 181398) was excluded as instructed , position verified Winger but the club field is wrong (Alanyaspor in 23/24, not Fenerbahce). `Cristo Gonzalez 2324` (card 164296) came back **UNSURE**, so there was no position to write; writing it would have meant inventing one. **It is still unresolved and is the only tier-1 card in that state.**

**THE GATE PASSED ON THE LINE, NOT COMFORTABLY.** Bounds were "stop if more than 10 public band crossings or any single card moves more than 4". Result: **exactly 10 crossings and a largest move of 3.** One more crossing and the write would have stopped. **Elite (rt>=85) held at 650 and the rt range held at 11-97**, both before and after , but the elite count is stable only by coincidence: Rice and Parejo entered World Class while Samatta and Borini left it.

**THE RIPPLE IS THE POINT, AND IT WAS BIGGER THAN THE WRITE.** **137 UNTOUCHED cards moved** , 36 up, 101 down, every one by exactly +/-1 , concentrated in **CM 46, FB 28, CDM 26, CB 17**. **Two of the ten public crossings were cards nobody touched: Samatta 1819 and Borini 2223, both 85 -> 84, both losing World Class.** Borini is the card the original lesson is named after, and it moved again for the same reason. Pool census: **CAM +39, Winger +15, FB +11, CDM -11, CB -5, ST -6, CM -27, (none) -15, GK unchanged.**

**THE CDM ASYMMETRY HELD WITH ZERO EXCEPTIONS ACROSS 15 TRANSITIONS** , 13 out (7 fell, 6 flat, none rose), 2 in (both +3). Promoted to §C as evidence-backed, with the new qualifier that the SIGN is predictable and the MAGNITUDE is not.

**METHOD NOTE WORTH KEEPING: the full 57,234-row before/after snapshots are what made the ripple visible at all.** A 351-row target snapshot would have reported a clean, small, well-behaved write and silently missed 137 movers and 2 public band crossings. **Paginate past the 1000-row cap (§C) , both snapshots were read back off disk and asserted row-for-row before being trusted.**

**STILL OPEN:** the ~350 tier-1 cards the dead Transfermarkt lane never resolved (122 of 474 fetched before the markup change); the single UNSURE card; `O. Aydin`'s club field.

### 2026-07-27 -> 2026-08-01 | PRE-LAUNCH POLISH / BUG QUEUE , the 10 CLOSED items (relocated from CLAUDE.md §D on 2026-08-14)

**These are CLOSED. They were removed from CLAUDE.md §D because closed history in a live section is exactly what the relocation rule exists to move.** Item 8 (the desktop My Club coming-soon page) stayed behind , it is still open. Three live details were promoted into CLAUDE.md §C/§D first: the `nullsFirst` NULL-rt sort trap, `VVCore.vvDisplayName`, and the nickname-alias (cr7) deferral.


**TIER 0 , STOP-GAP UNWOUND (CLOSED 2026-08-01):**
0. **NOTES SOFTENING , CLOSED 2026-08-01.** The `legacy` cache branch was a stop-gap for 502s; Fluid Compute verified live (11.29s generation, past the old 10s wall), so strict invalidation was restored and the branch deleted. Notes are symmetric with verdicts again. Offline backfill deliberately not run. Full narrative: §F 2026-08-01 (archived).
**TIER 1 , BUGS (launch-blocking, wrong not just unpolished):**
1. **SEARCH ACCURACY , DONE 2026-07-27 (`e83de31`).** Root cause was substring `ilike` on `player_name_norm`, which stores the FULL LEGAL name. Fixed in the shared vv-core parser (diacritic folding, cross-column token AND, `rankBySearch` relevance, explicit season-miss), so rankings + compare both inherit it. Full narrative: §F 2026-07-27 (archived). **Still deferred: the nickname-alias index (cr7 -> Ronaldo), post-launch.**
2. **COMPARE PICKER FILTER , DONE 2026-07-27 (`4428552`).** Wiring was never broken; `buildPoolQ` ordered `rt DESC` without `nullsFirst:false`, so the pool was 50 null-rt rows and every filter matched 0. One-line fix also retired the `limit(50)` search edge. Full narrative: §F 2026-07-27 (archived).
3. **GLANCE HOVER TAGS , DONE 2026-07-27 (`d4b1860`).** Not a re-render , a flow reflow: the tap fold-below tip was also wired to hover, inserting a full-width flex item into the chip row. Hover now uses a fixed-position floating tip; the tap path is byte-identical. Full narrative: §F 2026-07-27 (archived).

**TIER 2 , CONTRAST SWEEP (exhaustive, grep-driven like the green sweep):**
4. **CONTRAST SWEEP , DONE 2026-07-27 (`16d6993`) + cream-on-light follow-up 2026-07-28 (`ccdce6c`).** 84 muted-grey-on-cream failures across 7 pages (four pages missed entirely by the earlier pass), then a second class: prose set to `--cream` on containers that had gained a light background, rendering ~1.06 contrast. Audit tool patched for both. Full narrative: §F 2026-07-27 (archived) and 2026-07-28 (archived).

**TIER 3 , POLISH/CONTENT (after bugs + contrast):**
5. **Trajectory G/A clarity , DONE 2026-07-28 (`6892c55`, Option 2).** Gap between pink/gold segments, green-panel halo removed, compare-scoped `body.light #vtraj` overrides, peak label de-collided. **Landed in the SHARED `VVCore.renderTrajectory`, so verify BOTH card and compare on any trajectory change.** Full narrative: §F 2026-07-28 (archived).
6. **Glance FULL NAME + field reorder , DONE 2026-08-01 (`462b6a4`).** Glance gained a name heading (it had none) plus `position · age · club · league · season · games`. Required a new derivation, `VVCore.vvDisplayName` (99.3%), because `player_name` is abbreviated for 63.6% of players and `players.full_name` is the LEGAL name. Full narrative: §F 2026-08-02.
7. **VV INDEX league-weight disclosure , DONE (`58efb95`); matrix/emoji restructure , CLOSED as redundant.** The disclosure shipped as "Where the league counts" (the drafted copy was factually wrong and was rewritten , percentiles are NOT partitioned by league). The visual idea is overtaken by the pentagon + the existing SVG icon system; the page uses zero emoji by design. Full narrative: §F 2026-08-01 (archived).
9. **I VVONDER real-example fix , DONE 2026-08-01 (`10d8e71`).** Not one bad chip , three inert chips, two naming players with zero rows (Henry, Maradona). Rebuilt as four real clickable pairings teaching four different engine behaviours. Full narrative: §F 2026-08-02.
10. **Playbook tag cropping , CLOSED 2026-08-01 (verified, no work needed).** 0 clipped of 19 `.libtag` at 390px; the only real defect was the tooltip, already fixed in `d5898d6`. Doc was stale.
+ **Club-token search , ALREADY SHIPPED (`e83de31`).** `tokenAndFilter` ANDs each token across player OR team name, so club name is already searchable. Distinct from the still-deferred nickname-alias idea (cr7 -> Ronaldo), which remains post-launch.

### 2026-08-11 -> 08-13 | Search overlay, the filter stage, and two methods that died
**19 commits, none pushed. This entry is the ORDER and the CAUSE , the rules themselves are in §C, the queued work in §D. Read it to understand why the week went the way it did, not to look up a decision.**

**THE THROUGH-LINE, and the single most useful thing here: NINE separate defects this week were invisible to source review and to `node --check`, and were found by driving the DEPLOYED page.** Every one rendered plausibly, parsed cleanly and did nothing, or did the wrong thing quietly. Local verification passed on all of them. **If a session ends without testing the deployed page, assume it is not finished.**

**1. THE VIEW INCIDENT CAME FIRST, AND IT SET THE TONE (08-11).** A placeholder `CREATE OR REPLACE VIEW x AS SELECT * FROM x` destroyed `player_card_view`'s 11,202-char engine body, silently, and the site kept serving because the matview held stale-but-good data. Recovered from a `pg_get_viewdef` capture taken earlier the same session. The known-as name fold then shipped through the `exec_sql` RPC after two silent no-ops through the SQL editor , Casemiro **0 -> 12**, Jorginho **0 -> 16**, elite count **650** and rt range **11-97** held. Full detail in the entry below; §C carries both rules.

**2. THE SEARCH OVERLAY, AND FOUR SILENT FAILURES IN ONE FILE (08-11 -> 08-12).** Built search as a curtain state of `card.html` , stage dims and settles, panel enters 60ms later, rows stagger 55ms apart, scrim behind the panel, recent-search chips. **Then four bugs, each found only on the deployed page, each of a different kind:** `addEventListener(pageshow,...)` unquoted by `node -e` and throwing at runtime while the file parsed; an orphan `*/` lifted with a CSS line range that made the parser discard **42 of 45 rules**; the decorative `.glow` escaping its containing block at <=1040px and swallowing the trigger's tap; and `JSON.stringify` truncating a chip's `onclick` attribute. **They share one shape , a quote or a marker inside a delimited context produces output that parses and does nothing.** §C records the family.

**3. THE PRESTIGE CORRECTION (08-12).** Found while auditing the filter ahead of extraction, and fixed immediately rather than folded into that stage, because it was live and wrong: the Prestige chips used **rt>=88 / rt>=92**, the pre-recut thresholds, against live bands of **90 / 95**. Selecting Generational returned **47 cards of which 35 were not Generational**. Now derived by scanning `bandFor` composed with `prestigeFor`, so no threshold is written down anywhere and a future recut moves it automatically.

**4. THE FILTER STAGE, THREE SESSIONS (08-12).** `VVFilters` into vv-core first, shipping unused; then rankings adopted it; then the card overlay and compare picker. **The founding rule , every chip carries `data-vvf-value` , exists because `readFilters` matched `textContent.indexOf('Premier League')`, so a label edit or the EN/NL/FR toggle would silently have changed the QUERY.**
- **The compare picker was the real finding.** Its `passF` filtered an already-fetched POOL, and browse caps that pool at the **top 50 by rt**. Measured composition: ST 32, Winger 17, CAM 1. **Five of eight position chips and four of nine league chips matched ZERO rows** , GK, CB, FB, CDM and CM were all impossible. The chips looked broken through no fault of their own. Moving to the server path took a GK filter from 50 to **300 rows, all GK**.
- Prestige was dropped as a group: verified across rt 0..100 that the VV Score bands make the **identical cut**, so it was one filter offered twice under two vocabularies.

**5. TWO FIXED-GRID CHILD BUGS, THE SAME BUG TWICE (08-12 -> 08-13).** `.ranklayout` is a 2-column grid; the active-chips bar became a third child and pushed `#cardgrid` into the rail's column, 262px wide and below the fold , which read as "results empty" AND "rows overlap the rail" at once. Then `.vvf-group` in compact form, same story: score has 3 children and profile has 9, so chips auto-placed into the **78px label column** and clipped mid-word. **A fixed column count handed extra children relocates everything after them, silently, and the symptom appears far from the cause.** Fix both times: wrap the body so the count is fixed. `.cs-meta` was a third instance, milder.

**6. AGE ON THE ROWS (08-12).** Folded into `.upos` rather than a tenth column. Worth remembering the discarded attempt: widening the mobile track stole 24px from the club name and took clipping from **15 to 50 of 60 rows**, measured against a stashed baseline, so compact now STACKS the age in the cell's spare vertical room instead.

**7. THE DEEP-PLAYMAKER GATE , GO ON ARCHETYPE, NO-GO ON THE METRIC (08-12).** Top 40 by `passes_total` per 90 reads Rodri, Verratti, Kroos, Kimmich, Busquets, Jorginho , 22 distinct players, recurring season to season, median rt 61. The archetype is real and the gap is the case for the lens. **But 33 of 40 rows come from seven possession-dominant clubs, 12 from PSG alone**, so the metric measures team possession. Amended to share-of-team passes before anything is built. §D carries the spec.

**8. TRANSFERMARKT CHANGED ITS MARKUP AND THE METHOD DIED (08-12 -> 08-13).** The tier-1 fetch resolved **122 of 471** cards, then produced **208 consecutive rows with zero useful results**. Not a block: HTTP **200**, correct title, correct player, no challenge markers , but `<select name="pos">` gone. **Confirmed by re-fetching Neymar, who had parsed fine hours earlier on the identical URL.** The 429s were real but incidental. **The 122 rows survive; the remaining ~350 Tier-1 cards need Fable or a re-pointed parser, and that is a decision, not a retry.**

**9. THE SEASON CONVENTION WAS BACKWARDS (08-13).** `vvParseSearch` read a bare "19" as 2019/20. People mean the season that FINISHED in 2019. Corrected to the ending year , and deliberately NOT inside `vvYearFromDigits`, since the split form "18/19" already yields the starting year and subtracting there would have broken it. **This changed rankings too**, and was checked there rather than assumed.

**WHAT IS OPEN.** Nothing is pushed. The tier-1 method decision (Fable vs re-point vs disclose at 122). `compare.html` carries a pre-existing div imbalance of -1 and an unbalanced CSS comment pair, byte-identical at HEAD across three commits , worth its own look, given an orphan `*/` cost 42 rules in `card.html` this week. The home-page versus regex still routes "Anthony V Smith" to Compare, and now fills two unrelated players rather than showing an empty page; the real fix is resolution-based, not a pattern.

### 2026-08-11 | KNOWN-AS NAME FOLD shipped (search follow-up 1) + the view-destruction incident

**DB write + matview refresh + docs. Commit `9fc9008` (docs) and this one. NOT pushed.**

**1. KNOWN-AS NAMES ARE SEARCHABLE , `DB_HYGIENE_STAGE.md` follow-up (1) is DONE.**
`player_name_norm` now folds **`concat_ws(' ', p.name, p.full_name)`** instead of `COALESCE(p.full_name, p.name)`, so the known-as name and the legal name are BOTH in the searchable text. **ONE line of the view changed** (line 201 of 218), +19 chars, 11,202 -> 11,221. Applied via the `exec_sql` RPC, not the SQL editor (see §C).
- **MEASURED, matview before -> after:** Casemiro **0 -> 12**, Jorginho **0 -> 16**, Fernandinho **0 -> 9**, Raphinha **0 -> 12**, Fabinho **0 -> 11**. **Salah unchanged at 26** , the control, proving the fold widened the column without disturbing names that already worked.
- **ENGINE UNTOUCHED, verified before and after:** elite (rt>=85) **650**, rt range **11 / 97**, **57,234** rows, on both the view and the refreshed matview. `REFRESH MATERIALIZED VIEW player_card_mv` took **4.3s** (plain, ACCESS EXCLUSIVE, site locked for that window).
- **NO FRONT-END CHANGE AND NO MATVIEW REBUILD WERE NEEDED.** `tokenAndFilter` already queries `player_name_norm`, and the matview's frozen column list already contains it , the frozen-query trap only bites on ADDED columns, so widening an EXISTING column's expression propagates on a plain REFRESH. **No `?v=` bump required.** This is exactly why widening beat adding an `alias_norm` column.
- Backup kept at `~/Downloads/player_card_view_BACKUP_2026-08-11T120335Z.sql` (11,411 bytes, verified on disk before the write).

**2. TWO OPEN ITEMS FOUND DURING VERIFICATION, neither blocking:**
- **NULL rt SORTS FIRST on `ORDER BY rt DESC`** (Postgres default), so a null-rt row can take the top slot. Hit while spot-checking Salah, whose top row read `null` until re-read with `NULLS LAST`; 1 of his 26 rows has a null rt. **Same trap as the Compare picker bug** (`buildPoolQ` missing `nullsFirst:false`, fixed in `4428552`) , it is a property of the DATA that is still live, so any new `rt DESC` query needs `nullsFirst:false`.
- **67 DOUBLE-SPACED FOLDED NAMES, up from 4 , introduced by this change and cosmetic.** `players.name` already contains double spaces (`J.  McGinn` -> `j  mcginn john mcginn`); `COALESCE` had been preferring `full_name`, and `concat_ws` now brings that field in. **Search is NOT affected** , `tokenAndFilter` matches each token as its own substring, so inter-token spacing is never compared (verified: a double-spaced row still matches on a single token). Fix with a `regexp_replace(..., '\\s+', ' ')` collapse at the NEXT view edit; not worth a write of its own.

**3. THE VIEW WAS DESTROYED AND RECOVERED EARLIER THE SAME DAY.** An accidental `CREATE OR REPLACE VIEW x AS SELECT * FROM x` replaced the 11,202-char engine body with a 965-char self-referential projection, silently. Full lesson in §C, including the two rules that matter most: **the stale matview is the backup, so do NOT refresh a view that looks wrong**, and **capture `pg_get_viewdef` before any view work**. A read that day concluded "the engine is not in a view" , that was true of the damaged database and false of the system; the §Stack line now records this so it is not re-derived.

**STILL OPEN on the search track:** follow-up (2) **trigram indexes** (`pg_trgm` + 2 GIN, `CREATE INDEX CONCURRENTLY`, no rebuild, safe while live) is now the only piece of `DB_HYGIENE_STAGE.md` left and can ship alone. **The percentile columns still need the matview DROP + CREATE** and their 3 product decisions , they no longer share a sitting with the known-as fix, since that shipped without a rebuild. Plan in `scripts/enrichment/matview_rebuild_plan.md` (untracked).


### 2026-08-10 (cont.) | BIG-CLUB write , 11 cards, 3 band crossings, and the outbound-CDM asymmetry

**The 798-unchecked finding produced its first write.** `bigclub_batches/` 01-05 (184 cards, 99 players, the big-club subset of the unchecked population) came back and was written.

- **RESULT: 119 of 184 CONFIRM the existing pool.** The value of this pass is largely NEGATIVE evidence , the big-club cards are mostly right, which the 798 finding could not assume. 65 changes proposed, **11 at high confidence and written**; 54 held at medium/low in `bigclub_HOLD.csv`, 52 weak agreements in `bigclub_LOWCONF_AGREE.csv`. **Confidence 42% high**, against 3% at the bottom of the CAM tail , the curve behaving, since these are the best-documented players in the dataset.
- **THE 11: Ribery x2 and Di Maria were sitting in CDM. Wingers in the defensive-midfield bucket** , the clearest misfiles found anywhere in the programme. Eriksen x2 CDM -> CAM (he was Spurs' creator, not a holder). Plus Kroos CDM -> CM, Kulusevski CM -> Winger, Calhanoglu CM -> CAM, and Kimmich/Casemiro/Fernandinho CM -> CDM.
- **THREE BAND CROSSINGS, the most of any write in the programme:** Kroos 17/18 **82 -> 79 Standout -> Accomplished**; Di Maria 19/20 **86 -> 84 World Class -> Standout**; and one on an UNTOUCHED card, Borini 22/23 **84 -> 85 Standout -> World Class**, purely from the CDM pool percentiles shifting. **38 untouched cards moved, largest +/-3.** Pool census CDM 2837 -> 2834, Winger 4920 -> 4924.
- **DECISION (Lucas): COMMITTED, NOT REVERTED.** The demotions are prior inflation leaving, not new error , see the §C entry on the CDM asymmetry. The position calls are right; the rt cost is the correction of a benefit those cards never earned.
- **TOOLING: `write_positions_tail.js` gained `--hold-prefix`.** Without it this run would have CLOBBERED `tail_HOLD.csv`, since both research streams share the writer. Verified byte-identical after the run.

### 2026-08-10 | CAM tail continued to 151 cards + THE CLEARING RULE (with its measured hit rate) + archive split

**Continues the 2026-08-09 session. Writes: Coman 7, Nico Williams 2, the eight-player pass 11. RUNNING TOTAL 151 cards across EIGHT writes, CAM pool 1,870 -> 1,721, ONE band crossing in the whole programme (Souček 20/21).**

**THE CLEARING RULE, and the number that justifies it.** A held row can be cleared without per-season research ONLY when the player's Transfermarkt **main position AND every listed secondary position are wide** , read from the profile, **NOT inferred from the player's other cards**.
- **MEASURED HIT RATE: 4 of 8 players, 11 of 25 rows.** Qualified: McNeil, Antony, Gelson Martins, Honorat. Excluded: **Sarr (Second Striker), Bamba (Centre-Forward), Mahi (Attacking Midfield), Ghezzal (Attacking Midfield)** , the same shape as Pépé (Centre-Forward, Second Striker), who failed the rule in the first pass.
- **HALF the players with a wide MAIN position carried a central alternative on the SECOND line.** Main position alone is not sufficient and never was. Reading only the first line would have looked like 8-for-8 support.
- **THE BROAD "his other seasons were Winger so this one is too" HEURISTIC WOULD HAVE WRITTEN 14 UNVERIFIABLE ROWS**, and they would have looked correct afterwards , a plausible bucket on the right player, invisible in any diff. That is the whole reason the rule is written in terms of the PROFILE and not the player's own card history.
- **LM/RM COUNT AS WIDE** (decided explicitly): a player whose only alternatives are left or right midfield has no central role to switch to, which is exactly what the rule tests. 8 of the 11 written rows depend on this reading; only Antony is the pure LW/RW case. The 8-bucket system has no LM/RM, so they fold to Winger anyway.
- **14 rows for the four excluded players stay in `tail_HOLD.csv`** and need per-season work, not a rule.

**PROGRAMME RUN COMPLETED 2026-08-10 , all 92 eligible hold-players read, 5 chunks.**
- **FINAL CLEARING-RULE HIT RATE: 21 of 100 players, 47 of 226 rows (21%).** Chunk-by-chunk qualified/excluded: **0/20, 5/15, 5/15, 3/17, 4/8**, plus the earlier 4/8 pass. **Chunk 1 returned ZERO because it was the highest-rt players (83 down to 74), and high-rt attackers are systematically MORE versatile** , Sarabia, Bernardo Silva, Szoboszlai, Fornals, Shaqiri all read central-main. **The rule's yield RISES as rt falls**, the opposite of the research-confidence curve. Do not read a low chunk-1 yield as the rule failing.
- **79 PLAYERS EXCLUDED BECAUSE THEY ARE GENUINELY MULTI-ROLE.** The commonest secondaries are Attacking Midfield, Centre-Forward and Second Striker. Two variants worth remembering: **Right-Back appears as a secondary** (Corona, Ndao, Şahiner, Diatta) so the rule correctly excludes a DEFENSIVE alternative too, not just a central attacking one.
- **PHASE 1 CLOSED THE PASS-1 VERIFICATION GAP.** Of 85 pass-1 high-confidence rows, only 1 still needed writing (Richarlison 17/18); 31 had already been written independently. **35 pass-1 proposals were later confirmed by an independent source with ZERO contradictions.**
- **IDENTITY DISCIPLINE UNDER AUTOMATION , three traps hit and caught.** (a) An **empty "other position" list is the DANGEROUS direction** , a parse failure and a genuine absence look identical, and only one should qualify. Luis Díaz and Elia were re-read in the browser to confirm their profiles genuinely carry no other-position label. (b) **A first-of-N search hit is safe ONLY when it EXCLUDES.** Héldon and Miguel Cardoso returned 10 hits each; **Ladislav Krejčí returned 2 and the first is a CENTRE-BACK**, almost certainly the wrong man , the exclusion stands because leaving a row held is safe, but its recorded reason should not be trusted. (c) Every QUALIFIER was cross-checked DB-name against TM-name before writing; searching by legal name returns known-as names (Nolito for Manuel Agudo Durán, Jason for David Remeseiro Salgueiro, Nani for Luís Carlos Almeida da Cunha).
- **THE BIGGER PROBLEM IS NOT THE CAM TAIL. 798 cards at rt>=70 sit in CAM/CM/CDM with a coarse MID/FWD position and have NEVER been written or held , they entered no sweep at all** (base population 981, minus what is written or held). **731 of the 798 are in CM or CDM, which EVERY CAM-scoped pass was structurally blind to** , the Nico Williams 25/26 case, generalised. Top of the list: De Bruyne 19/20 rt91, Bruno Fernandes 20/21 rt90, Yaya Toure 13/14 rt90 (CM), Eriksen 16/17 rt89 (CDM), Alli 16/17 rt89, Palmer 24/25 rt88. **Most are probably CORRECT , De Bruyne and Eriksen genuinely are central , the point is that nothing has checked them.** Full ranking in `position_risk_report.txt` (4 groups) and the launch-relevant subset in `position_bigclub_review.csv` (236 big-club cards, 184 unchecked, Real Madrid 19 / Bayern 30 / Man City 30 / Arsenal 18 all-unchecked). **Treat Group 2 as the launch list and the Group 1 long tail as a disclosed limit, not a work queue.**
- **MARKER BUG, found while building that report and worth remembering: DO NOT identify "already written" by SOURCE in `known_players.csv`.** The `knowledge` label is ALSO used by rows dated **2026-07-04** from an earlier session, which set cards TO CAM. Filtering on source made those read as resolved , Coutinho 17/18 showed WRITTEN when it is still CAM and still held. **Filter on DATE (`>= 2026-08-09`).** 13 cards moved back into the unresolved pool once corrected. Same family as every other silent-wrong-answer in this session: the check looked right and the number was plausible.
- **REMAINING: 297 tail_HOLD + 27 pass2_HOLD.** The 79 multi-role exclusions need per-season work; no rule covers them. 118 hold rows propose something other than Winger and are outside the rule entirely.

**OTHER FACTS FROM THE CONTINUATION:**
- **Nico Williams 25/26 was in `CM`, not CAM**, so every CAM-scoped pass was structurally unable to see it (the documented coarse-MID bug). His 21/22 was in CAM but at rt25, below the rt56 floor batches 01-05 reached. **Two cards missed for two DIFFERENT reasons, neither a research failure.** Batch 03 had independently proposed Winger for 21/22 at medium confidence , the override released a gated correct answer rather than overruling the research.
- **`CLAUDE_ARCHIVE.md` SPLIT: 98.9% -> 73.6%.** PART 2 merged into `INGESTION_RECOVERY.md`, which now holds that thread whole. **The merge removed a hop rather than adding a file.** The archive is now the session log and nothing else. **NEXT CUT when it crosses 90%: PART 1 by month.** Note the constraint has MOVED , CLAUDE.md is now the nearer limit.
- **A SILENT `.replace()` NO-OP mis-stamped 7 rows of provenance** (`fable-tail` instead of `tm-ccc`) while the writer printed success. DB was always correct; only the record was wrong. Caught by reading the file, not the message. Rule now in §C, and every replacement in this session's later patches was asserted , which then caught two more stale anchors during the archive split that reading the diff had missed.
- **TRANSFERMARKT WENT INTO MAINTENANCE mid-pass and no substitute source was used.** Under that pressure I navigated to a GUESSED TM id for Sarr rather than searching; it resolved to the maintenance page so nothing came of it, but the real id (410225) is not the one I guessed (376662). **Every lookup goes through search. A guessed id that resolves gives a plausible profile for the wrong player.**

### 2026-08-09 | Tag engine fix + 115 position reclassifications + doc relocation , 5 commits

**Commits `c90f5e3`, `549c19c`, `27b465e`, `c4ad9e2` + this batch (uncommitted at time of writing). Front-end + DB writes + docs. NOT pushed.**

**1. TAG ENGINE , RAW + SAMPLE GUARDS (`c4ad9e2`). Two odd cards turned out to be a STRUCTURAL fault, not two bugs.**
- **THE DIAGNOSIS CHAIN.** Nico Williams 25/26 held "Goal Machine" on **6 goals**; Barcola 25/26 held "Playmaker" on **1 assist**. Neither was a data error , both figures are correct. The fault was in the award logic, and it was three separate things compounding: (a) the thresholds are **percentile-only with NO absolute floor**, so a small raw total over small minutes clears an elite per-90 rate; (b) an **undocumented `x0.92` softening** on Playmaker meant "p90" did not mean p90; (c) **Playmaker read `passes_key` and NEVER touched assists at all**, which is how a 1-assist season earned a creator tag.
- **THE MARKSMAN CASCADE , the finding that changed the fix, and it was not in the brief.** Marksman fires on **`!gotGoalMachine`**, so every card the new Goal Machine floor rejects falls straight into it. **The Goal Machine floor ALONE takes Marksman from 4.82% to 8.78%**, the most common profile tag on the platform, and Williams 25/26 would simply have become "Marksman" on the same 6 goals. **The fix as specified would have RENAMED the misfire, not killed it.** Marksman therefore got its own raw floor (>=8). **Do not remove one floor without the other**; the constant carries that warning in the code.
- **APPLIED:** Goal Machine `>=12` goals, Marksman `>=8`, Playmaker `>=3` assists + `x0.92` dropped, all per-90 tags gated at `minutes >= 900`, and a **missing raw stat is EXEMPT from a raw floor** (NR is not zero , 54.2% of rows have null assists).
- **`>=12` NOT `>=15`, deliberately: 15 is POSITION-BLIND.** It would strip De Bruyne 19/20 (13g, rt91), Pogba, Son, Maddison , midfielders who clear the MID p90 rate (0.283/90 ~= 8.8 goals over 2,800 min) comfortably. A flat 15 re-imposes a striker's yardstick on midfielders, which is the exact thing the position-relative system exists to prevent.
- **RESULT:** Goal Machine 5.45% -> 1.49%, Marksman 4.82% -> 2.88%, Playmaker 6.35% -> 2.78%. **Cards with >=1 tag 37.2% -> 26.0%.** ZERO cards at rt>=85 lose all tags.
- **METHOD THAT CAUGHT A REAL BUG: a PARITY HARNESS.** The simulator was first run with every guard neutralised and had to reproduce the LIVE `getVVTags` on **0 of 57,234 rows differing** before any figure was trusted. That check failed on the first attempt , the NR-exempt logic was wrong and was silently dropping every null-assist row. **Review would not have found it; the harness did.**
- **PERCENTAGES ARE PROVISIONAL** , the position work moves cards between the coarse FWD/MID/DEF threshold tables, which changes which per-90 bar a card is measured against. Re-run the simulation after the tail settles.

**2. POSITION RECLASSIFICATIONS , 115 cards written across three batches, all rt-verified.**
- `c90f5e3` **24** Tier-A CAM->Winger (Transfermarkt-verified). `549c19c` **31** pass-2 (two research passes agreeing). **This batch: 75** from the Fable CAM-tail run, batches 01-05.
- **rt impact across all three: 4 cards moved, 1 public band crossing** , **T. Souček 20/21 CAM->CDM, 79 -> 82, Accomplished -> Standout**. The other three movers (Rodri 21/22 +3, Souček 21/22 +2, Tonali 21/22 +2) are all **CAM->CDM as well, and that is the whole pattern: CDM is the ONE destination pool where the defensive signal is load-bearing.** Every CAM->Winger and CAM->CM row moved 0, because for attackers the bounded `def_core` loses to the attacking path in the best-of. **Expect rt movement ONLY on CDM transitions in future batches.**
- **SOURCE-HIERARCHY FINDING, and it is the root cause of the whole CAM problem: API-Football does not STATE a position, it INFERS one from a lineup grid cell.** `api/import-positions-v2.js` `classify()` reads `row`/`col`/`rowWidth` and buckets by depth. The M-branch only calls a player wide when `rowWidth>=4`; the F-branch uses `>=3`. **That asymmetry is why wingers in a midfield three land in CAM.** Transfermarkt and Sofascore state the role outright. **So for POSITION, research beats the API** , the opposite of the assists field, where FBref is authoritative and research is not. Do not generalise one field's provenance to another (cross-ref §C Provenance).
- **THE CLASSIFIER FIX CANNOT BE DRY-RUN FROM STORED DATA.** `player_positions.distribution` holds **post-classification** counts (`{CAM:60, CM:40}`); the `rowWidth>=4 -> >=3` change alters classification **before** that aggregation, and the raw grid is discarded. The file header's claim that it "stores FULL position distribution (so future logic tweaks never need a re-pull)" is **FALSE for this tweak**. A real dry run needs a re-pull of the 37 league-seasons covering the 55 human-verified cards: **~14,100 API-Football calls, ~18.8% of the 75k budget, ~70 min.** **Patch the importer to persist the raw grid BEFORE any future re-pull**, or this wall reappears every time.
- **`distribution` IS A FROZEN HISTORICAL RECORD AND DISAGREES WITH `position`.** Later passes (ours included) overwrite `position` but never touch `distribution`, so e.g. api1696 2025 PL reads `pos=Winger` with `dist={"CM":100}`. It also still carries the **retired LW/RW/LB/RB codes** that §C says no longer exist in the data. **Do not read `distribution` as current state.**

**3. THE CONFIDENCE CURVE AS A QUALITY INSTRUMENT (new, keep using it).** Batches are ordered rt-DESCENDING, so each covers less prominent players than the last. The high-confidence rate MUST fall. **Baseline measured 2026-08-09:**
```
batch 01  146 rows  avg rt 78.1   65% high      batch 04  117 rows  avg rt 60.3   3% high
batch 02  130 rows  avg rt 64.0   15% high      batch 05   97 rows  avg rt 56.6   3% high
batch 03  105 rows  avg rt 64.4   13% high
```
**A FLAT CURVE IS A WARNING, NOT A GOOD RESULT** , it means the UNSURE instruction stopped biting and the model is guessing with a confident label. `write_positions_tail.js` fires only on **TWO CONSECUTIVE** non-falling batches (a single trip is ~4 rows at this batch size, inside noise, and would train everyone to ignore the alarm). **Boundary bug found by unit test and fixed: the comparison is `<=` not `<`, else a steady 3pt-per-batch decline , a genuinely healthy curve , warns on every batch.**
- **HOLD FILES ARE SPLIT INTO TWO STATES** (the first version conflated them): `tail_HOLD.csv` = changes proposed at med/low + UNSURE, **actionable**; `tail_LOWCONF_AGREE.csv` = research agreed with the current pool but weakly, **not actionable**. Batch 01 alone was 51 held rows of which only 15 were work.
- **IDENTITY IS ENFORCED IN CODE, not by trust.** Every row's echoed `api_player_id`/`card_id` is verified against the live mv before writing; a mismatch is refused. Smoke-tested with a deliberately corrupted id. 595 rows returned across 5 batches: **0 identity breaks, 0 order breaks, 0 vocabulary violations.**

**4. DOC RELOCATION (`27b465e`) , 89.5% -> 74.6%.** Three stage files created (`POST_LAUNCH.md`, `INGESTION_RECOVERY.md`, `DB_HYGIENE_STAGE.md`); 344 of 345 substantive lines verbatim, one deliberate pointer redirect; five ingestion facts promoted into §E BEFORE cutting. §C's debugging lessons and §D step 5 deliberately NOT moved , see the §-preamble bullet for why.
- **`CLAUDE_ARCHIVE.md` WAS AT 98.9% AND WAS THE BINDING CONSTRAINT ON THE NEXT §F PASS. RESOLVED 2026-08-10 , now 73.2%, see §-preamble.** It has no headroom; an archive pass today truncates silently from the OLDEST end. This session routed everything into NEW files precisely because that route is blocked. **Split the archive BEFORE the next §F archive pass, not after.**

**OPEN QUEUE, in priority order:**
1. **The tail below rt56 is NOT worth running as-is** , batches 04-05 returned **3% high confidence**, so ~97% of the remaining ~1,150 cards would land in the hold file. That is the evidence, not a hunch. Either accept the tail stays CAM-labelled and disclose, or find a source that actually covers small-league players.
2. **351 actionable hold rows** (`tail_HOLD.csv`) + **15** from batch 01 already in there. **108** non-actionable in `tail_LOWCONF_AGREE.csv`.
3. **85 unwritten pass-1 high-confidence rows** , 32 would move (2 Iconic: Palmer 23/24, Tadić 18/19), 51 confirm, 2 ambiguous. **Pass 1 has NO independent verification: its 162 rows have ZERO overlap with the 24 Transfermarkt-verified cards.** Recommended: hand-verify the 14 movers at rt>=85 before writing any.
4. **OG/META TIER 1 is bigger than "add tags"** , **ZERO og/twitter/description tags on all 15 pages**, AND the titles are the entire unfurl today and several are wrong: rankings "Web Shell", compare "Web Compare", **preferences "My Club"** (wrong page), search "Rankings", card.html "VVonderXI" on all 57,234 cards. **Fix titles first.** `og-image.png` verified 1200x630.
5. **`vv-core.js` cache-buster** , cached copies served the OLD tags after the `c4ad9e2` deploy. Needs a consistent version token across ~9 pages (card.html references it twice).
6. **Dead cron** , `vercel.json` fires `/api/refresh-players` daily at 03:00 and that handler is a deliberate no-op ("BSD writer retired"). Delete or rewrite.
7. **The API-Football key "(exposed)" note is UNSUBSTANTIATED** , the key is NOT in HEAD, NOT in git history (`log --all -S` returns 0 commits), never in any HTML, and `.env` is gitignored + untracked. No deployed function touches it. The claim traces only to §D/§F "NEXT" lines with no incident recorded anywhere. **Either Lucas knows of an out-of-band leak and rotates, or the doc should be corrected.** Also found: 10 CLI-only scripts in `/api` deploy as serverless functions with no handler.
8. **Vercel Pro** , the gate is LICENSING (Hobby is non-commercial-only), not capacity; Fluid already solved the timeout. Practical win is 1-day log retention vs 1 hour. **No codebase change needed when it flips.**

### 2026-08-07 | Playbook 5-dimensions + VV Index honesty section rebuilt as cards, then REFRAMED (Principles absorbed) , 5 commits

**Front-end only, NO DB. Commits `ee65d59`, `5b19aeb` (playbook), `a6dc4f9`, `7ed7001`, `6240c69` (vvindex) on `redesign-compare`, NOT pushed.**

- **PLAYBOOK (`ee65d59`, `5b19aeb`).** Glossary sub-headers restyled as gold dividers rather than quiet labels. The text-heavy 5-dimensions section became a **STATIC pentagon + five Henry Winter descriptions** , static deliberately, NOT the vvindex interactive `.fd` component. **The extraction to a shared `VVCore.renderPentagon` was SCOPED AND REJECTED: playbook does NOT load `vv-core.js`** (grep matches comments only; `VVCore` is `undefined` at runtime on both playbook and vvindex), so sharing it would have meant adding a script tag to a working page to save one SVG. Dead tooltip code removed in the same pass. **CONSEQUENCE FOR §D: both pages now render their own pentagon** , the cross-page duplication is now the same component built twice, not just the same idea told twice. §D PAGE SPLIT item corrected.
- **VV INDEX , THREE COMMITS, and the second one changed the brief.**
  - `a6dc4f9` , the nine `.principle` prose blocks became nine cards: `.picon` SVG icon + heading + always-visible one-line gist + full prose behind a **native `<details>`** fold. No JS , `toggleStory`/`vvFoldSections` are page-local to playbook and vvindex loads no vv-core, so `<details>` was the only fold needing nothing added. Grouped honestly at 3 strengths / 6 limits, no filler written to balance it.
  - `7ed7001` , **the real problem was page-flow, not one section.** Read-only found THREE defects: "Position is the lens" (Principles) and "Where the lens must change" (Measure) were the same claim in the same metaphor 650px apart; defenders were covered 3x; and **the page argued against itself** , "Goals aren't the only glory" promised goals are not everything while "Where the scale leans" admitted the score tilts toward them, neither acknowledging the other. Fix = absorb Principles (it was the SMALLEST section, 175px, and it sat between Five Dimensions and The Bands, interrupting them). **Page is now 3 sections: Five Dimensions -> The Bands -> The Method, and Its Limits.** The contradiction is resolved IN PLACE by one card that states both truths and opens by naming the tension. Defenders deliberately land at 2x not 1x (Dimensions = how it is read, honesty card = where that reading fails , complementary). Two new strength cards; **the planned USP card was DROPPED, not built** , its content is already the hero lede, so it would have added a fresh instance of the duplication being removed. Net **6 strengths / 5 limits / 1 coda**, which also fixed the 3-vs-6 imbalance as a side effect.
  - `6240c69` , CSS orphaned by the merge stripped, section retitled **"The Method, and Its Limits"** (the old title described only the honesty half once Principles moved in).
- **LEAGUE-STRENGTH READ-ONLY , THE COPY WAS MAKING A FALSE CLAIM, NOW FIXED. Read this before writing any league copy again.** The shipped fold said league strength is *"built into the score rather than bolted on after"*. **That is false.** Per `migrations/stage3_league_strength.sql`, percentiles are `PARTITION BY s.pos` ONLY , never by league , and the weight is applied as a FINAL MULTIPLIER on the assembled base score, `* (1 - (1 - wt) * 0.35)`. It is literally bolted on after. Replaced with *"part of the score, not a badge beside it"*, which is true of a multiplier. **THE REAL METHOD** (`scripts/engine/league_strength_v2.js`, verified live): the ONLY input is player output (`minutes, goals, assists, season_age`) , **no coefficients, no results, no standings, no goal difference, no market values, nothing external**. Three ingredients: (1) **movers** , cross-league consecutive seasons, >=900 min AND >=3 G+A on BOTH sides; (2) **stayers** , 8,337 same-league transitions build a median log-output-change-by-age curve, so a mover's change is corrected for the age they moved at; (3) **scoring environment** , output divided by `env^0.5` where env is the league-season aggregate (g+a)/90, so a high-scoring league is read as NEITHER strong nor weak. Solved as a **weighted least-squares over the league graph** (not an average of deltas), anchored PL=1.00, **per season with a +/-2 window**. Live `engine_league_weights` = 144 rows, 134 computed / 9 pooled-fill (all 2025, no next season to observe yet) / 1 pooled.
  - **TWO TRAPS.** (a) **The "980 transfers" figure in §C is STALE , the live recount is 991** (the recovery rollout added seasons). **Do not put a move count in copy**; it drifts. (b) **PL is the ANCHOR, not the ceiling** , La Liga reaches **1.045** and Serie A **1.027**, i.e. measured ABOVE the Premier League in their strongest seasons. Any copy implying PL tops the ladder is wrong.
  - **MAGNITUDE, because the raw weights overstate it:** the 0.35 damping means Portugal's weakest 0.460 is a **-18.9%** score effect, not -54%. Bundesliga's weakest 0.700 is -10.5%. `adj_output` still multiplies by the OLD placeholder `l.league_strength_weight` , a legacy display column, nothing to do with `rt`.
- **PROCESS NOTE , the slice-boundary bug, caught by a check rather than by luck.** Removing the Principles section left an **orphan `</div>` (81/82)** because the slice consumed ONE closing tag where the markup has TWO (`.wm-close` plus the wrapper). Caught because the region's div balance was verified BEFORE cutting and the whole file re-counted after. Same family as the playbook wrong-region deletion , **always balance-check a slice before removing it, never trust the anchor string alone.**
- **HARNESS NOTE:** `resize_window` reports success but does NOT narrow a maximised window (`innerWidth` stayed 1920 while height applied). 390px was verified in a real 390px **iframe in the foreground tab** , layout there is faithful; transitions are not, so the fold was asserted via the `open` attribute and measured body height, never the chevron rotation.
- NEXT: `.dicon` + playbook `.liblabel`/`.liblede` dead-CSS sweep (queued §D step 5, cheap, do together); then §D step 5 hygiene proper (key rotation, og/meta, Vercel Pro, My Club coming-soon, `foundations.html` delete, rt>=95 pre-warm LAST) -> QA -> merge.

### 2026-08-06 | Rankings prestige was being DROPPED (not mis-ordered) + the false scale range

**Front-end only, no DB. Commit `df84645`. Written retroactively 2026-08-07 from the commit.**
- **PRESTIGE WAS NOT MERELY MIS-ORDERED, IT WAS BEING DROPPED.** Row priority was honours -> prestige -> profile with prestige rendered ONLY if slots remained, so any card with cap-many honours lost it entirely , on the **rt 97 top card three honours filled all three slots and GENERATIONAL never appeared.** Prestige now renders FIRST and is **EXEMPT from the cap** (it is the rarest signal on the row: 12 Generational, 138 Iconic; `renderPrestige` returns `''` otherwise, so unranked rows are untouched). **Accepted consequence: a prestige row shows cap+1 pills**, and `.utags` wraps (`d5898d6`).
- **FOUR tag-rendering paths were ENUMERATED rather than assumed, after a first pass fixed only ONE of the two row templates and the verification still reported success.** `vv-core:1273 srtags` (season-led row) FIXED; `vv-core:1284 utags` (list/pill row) FIXED; `vv-core:117 chtagcell` (card face) **already correct , prestige is its OWN `.chtag` row above the tag row, so it never entered the honShown/profileMax budget**; compact mode renders no tags (`display:none`). **This is the block-rewrite/enumeration lesson in practice , "I fixed the renderer" is not the same as "I fixed every path through it."**
- **SCALE COPY , "from 50 to 96" was wrong at BOTH ends.** Real range on `player_card_mv` is **11 to 97** (Messi 11/12 the sole 97). The floor was the worse error: **24,031 of 54,173 scored cards (44%) sit BELOW rt 50** , the 50 was a default SLIDER position in rankings, never a scale floor. Removed from `playbook.html` and reworded in `vvindex.html` (the two differ on purpose , vvindex's sentence runs on into "It is not a popularity contest", so pasting the playbook wording would have broken the flow). **A hardcoded ceiling also contradicted the page's own "100 is unreachable by design" and the ground-still-moves disclosure, and would need changing again at the first 98.** Zero "from 50 to" instances remain.

### 2026-08-04 | Compare VERDICT FINISH (3 states) + 3 follow-ups, trajectory legibility, playbook glossary merge

**Front-end + prompt, no DB. Commits `09d451c`, `61cb4f4`, `61eea33`, `d364550`, `2236cfc`, `efb82c2`, `c86362d`. Written retroactively 2026-08-07 from the commits. This is the entry §C's "playbook `id="s-profile"` note" points at.**
- **VERDICT FINISH (`d364550`) , the blank pill on ties was a MISSING DESIGN CASE, not a rendering fault.** `.edge-flag` uses `visibility:hidden` (which reserves its 30px box ON PURPOSE so cards do not jump when a flag appears) and `vvSetVerdict` only added `.ef-show` for a decided winner, so a tie left a reserved 30px void above each card. **THREE STATES, all distinguished by data the engine ALREADY returns** , display/layout only, no new engine logic: **1 CLEAR WINNER** (gap>0, winner A/B, gold flag crowns) · **2 TIPPED NEAR-TIE** (gap=0 + tipped, winner A/B, **still crowned** , the scores are level but the age tiebreak decided it) · **3 TRUE TIE** (gap=0, not tipped, winner `'tie'`, **one centred pill, no crown , a tie has no side**). Real pairs: Messi 97/Ronaldo 96 gap1 not-tipped · Haaland 95/Salah 95 gap0 TIPPED · Mbappé 92/Neymar 92 gap0 true tie.
  - **THE TRIAD:** conclusion 30px/800 · score 23px **PINK** · tagline 15px italic (the selected tag's own blurb from `VERDICT_TAGS`, not new copy), then two-paragraph prose below a divider. Score uses **"to"** when one side won, **"&"** when level, and **NEVER a dash** (house rule, asserted programmatically across all three states).
  - **REGRESSION INTRODUCED AND FIXED IN THE SAME COMMIT:** the tie pill first went inside `.vscenter`, the centre grid column, where its 183px intrinsic width **SIZED that column** , grid became `80 | 183 | 80`, squeezing cards to 80px and pushing "Add to my club" off-screen at 390px. Moved to a direct child of `.matchup` with **`grid-column:1/-1`** so it is its own centred row and cannot size a column (`149.5 | 44 | 149.5`, cards 138px).
- **TIE COHERENCE (`2236cfc`) , THE MODEL WAS NOT DRIFTING, IT WAS OBEYING EXPLICIT INSTRUCTIONS, IN THREE PLACES.** A true tie showing "The Debate Lives On" beside "Neymar edges it on context" was a headline contradicting its own prose. The order to crown a winner lived in `VERDICT_SYSTEM` **and in TWO USER-prompt strings** (`winNote(tie)`, `toneNote.tie`) , **and the user prompt is more specific and immediate than the system prompt, so editing only the system prompt would have left a direct order standing.** All three moved together, plus the `.vwho` fallback on the no-AI path. **The system rule now BRANCHES ON THE RESULT LINE:** tiebreak decided it -> name them and lead with the reason; genuinely level -> do not crown anyone. The old rule's real job (preventing a wet non-answer) was kept via an explicit "never a limp both-were-great draw either." Bumped `VERDICT_VERSION v2-eb105f1a -> v2-0a430509` and `NOTES_VERSION v2-0404cb75 -> v2-81e8059a` (NOTES_SYSTEM embeds VERDICT_SYSTEM), staling ~73 verdicts + ~263 notes to regenerate lazily under Fluid.
  - **DELIBERATELY NOT BATCHED with the pending dash-sweep prompt change** , that change is CONDITIONAL on the post-pre-warm re-audit, and **this regeneration wave IS the ~73-row current-prompt sample that audit needs** (only ONE such row existed before). Adding it now would destroy the measurement.
- **DOUBLE SCORE (`efb82c2`) , two halves, and the second is a block-rewrite casualty.** (a) **The prompt was ACTIVELY DEMANDING it** , "Name the winner and include both VV scores"; now asks for the winner and the REASON with an explicit do-not-write-the-score instruction. (b) **A containment guard existed in `cb5c18c`; `d364550` rewrote that whole block into the triad and DROPPED it** (measured: suppression in cb5c18c = 1, after = 0), so every cached verdict had been double-printing since. Restored as a **display-time trailing scoreline strip** , conservative by design: trailing position only, BOTH numbers must match the live va/vb, only separator shapes seen in real cached rows. **BUG CAUGHT IN THE FIRST TEST RUN: the strip appended a full stop to ANY line lacking one even when nothing matched, quietly editing prose it must never touch** , the tell was `changed:true` with visually identical output. Now gated on the pattern actually matching. **NO version bump** (user prompt + client display only), so cached rows keep their stamp and the strip carries them until the wave from `2236cfc` reaches them.
- **TRAJECTORY (`c86362d`) , three fixes to the SHARED renderer, invariants listed BEFORE editing per the d364550 lesson.** (1) **OVERLAP , the cause was an asymmetry between the two surfaces:** `renderTrajectory` emits the opaque `.tjmask` only when `!opts.transparent`, and **compare passes `transparent:true`, so it has NO mask** and the VV line ran through the digits (6 of 13 totals colliding). Fixed with a **text halo** (`paint-order:stroke` on `.tjtot`, 3.4px, in the PANEL colour per surface) , additive, the card keeps all 13 masks. **The geometric collision count is UNCHANGED at 6 and that is correct: the halo moves nothing, it wins on paint order.** (2) **LINE , dotted `#3a352e` 2.2px dash 1.5/4, QUARANTINED to `body.light #vtraj .tjline`** i.e. compare-only AND light-only; card both themes + compare dark verified still cream 2.4px no dash. (3) **LABEL RHYTHM , removed ONLY the `|| d.selected` clause**; the selected season already carries the full-height `.tjsel` band, so the extra label was redundant as well as off-rhythm.
- **PLAYBOOK GLOSSARY MERGE (`09d451c`) , 19 profile tags appeared TWICE inside one section** (full `.tagdef` definitions in a flat ungrouped list, plus `.libtag` chips whose only unique contribution was the position grouping). Merged into one grouped glossary: Attackers 6, Midfielders 5, Defenders 4, Career Stage 2, All-Round 2.
  - **RECONCILED AGAINST THE ENGINE FIRST, and `TAG_DEFS` is NOT the authority for grouping or emoji** , it holds only `oneLiner` and `def`; the families live in `getVVTags` (ATT/MID/DEF/CROSS/AGE). **DESTROYER WAS MISGROUPED** , the library had it under Midfielders, the engine says DEF (hence 5 and 4, not 6 and 3). Emoji had no engine source, so those were judgement calls resolving DUPLICATES: the library showed one emoji for two different tags (Ball Hawk / Ball-Playing CB) and The Winger was sharing Playmaker's wand.
  - **ANCHORED ON `id="s-profile"`. A first attempt anchored on the string "Profile Tags", which appears TWICE (TOC link + h2); the slice started from the TOC, spanned the wrong region and deleted the Honours section plus 9 definitions.** Reverted from backup, not in history. **The verification had inherited the same faulty anchor, which is why it reported success** , the failure only surfaced on listing section ids. **That is now the standing check: list section ids before/after.**
- **`61eea33` , compare header gap.** `.matchup` butted at 0px against `.topline`. The gap was ALWAYS 0; it only became a visible defect once `ac1ace0` gave `.matchup` a background. **On mobile it was genuinely OVERLAPPING** , the 38px mode toggle, not the 30px Back pill, is the binding constraint at narrow widths. 22px at both breakpoints, editing the EXISTING rules per the §C specificity gotcha.
- **`61cb4f4` , the §C verification principle** (a missing signal is not evidence; both false alarms + their positive controls; the background-tab harness limit). Already promoted into §C , see there, not here.

### 2026-08-03 | Batch A UI (badge, SOON pills, nav) + join/save modal made honest + the stage-file doc rule

**Front-end + docs, no DB. Commits `4602b92`, `046b45c`, `9edffc6`, `05c41ce`, `ac03c4d`. Written retroactively 2026-08-07 from the commits.**
- **VV BADGE (`ac03c4d`) , text `y="57" -> y="54"` on all 7 badge pages**, matching the measured **area centroid (54.7)** rather than the geometric midpoint (58): the shield tapers to a point, so it is top-heavy and the optical centre sits ABOVE the geometric one. **NOTE the brief's reasoning was INVERTED** , it described the VV as sitting too high while asking to nudge it up. The value specified (54) is the one the measurement supports, so the action stood.
- **BADGE THEME-AWARE , this needed more than the fill.** A cream shield swallows both the cream inset border AND the cream first "V", so **all three flip together**; the pink second V stays (it reads on either ground). **Done with classes + CSS, not by editing the inline attributes , presentation attributes lose to CSS**, so the inline `fill=`/`stroke=` values remain as a fallback. The `scale(0.84)` inset transform is UNTOUCHED.
- **MY CLUB "SOON" PILL , two non-obvious costs:** `.soontag` CSS existed ONLY in `index.html`, so 8 files needed the rule added; and **THREE pages (card, compare, rankings) use a `<div class="navitem" onclick=...>` rather than an `<a href>`**, which the first pass missed entirely , **caught by the verification table, not by the edit.**
- **I WONDER REMOVED FROM THE NAV** (it existed in only two menus). The page still exists and still resolves, simply unlinked , the same state My Club was left in after the nav swap. **MASTER-CARD GAMES: confirmed a NO-OP** , there is only ONE games element site-wide (`.gm-games`, weight 900, card glance), which the brief said to keep bold.
- **JOIN/SAVE MODAL (`4602b92`) , the sheet promised a feature that does not exist.** `vvJoin()` sets a localStorage flag, its OAuth call is commented out, nothing reads a session, and it ends with `location.href="myclub.html"` , so the button never signed anyone in, it navigated to a placeholder. Reworded in BOTH copies (card + compare, identical markup) **plus the FOUR `ctx` overrides passed to `vvTrySave()`**, each of which promised a save that cannot happen and would have overwritten the sub line. **The opt-in label is future-tense ON PURPOSE** , the checkbox only writes localStorage and there is no email field, so "keep me posted" as a present claim is a promise we cannot keep. **LEFT ALONE deliberately: compare's "Save this verdict" TRIGGER button** , it is the entry point, not modal copy, and relabelling it would remove how the feature is discovered.
- **DOC RESTRUCTURE , the stage-file rule (`9edffc6`) + its first application (`05c41ce`).** CLAUDE.md holds the resume point + active queue + locked decisions; detailed specs for DEFERRED work belong in their own file. **This is the real fix for the doc refilling: the two compression passes proved the remaining mass is OPEN work, which cannot be compressed but CAN be relocated** , archiving only moves closed history, and closed history is no longer the bulk. Accounts spec -> `ACCOUNTS_STAGE_SPEC.md` (89% -> 86%), done immediately because there were **under 1,600 bytes of headroom to the 90% trigger , a single log entry would have crossed it before the fix ran.**
- **WAITLIST SPEC ENRICHED (`046b45c`) , the coming-soon buttons become the lead-gen funnel.** No new UI (the buttons already call `vvTrySave(ctx)`); the point is the `source` column, already in the staged migration. **FIVE live trigger sites were mapped, not two**, and `card.html:619` "add to the wall" is a THIRD distinct motivation that was not in the brief. Full detail in `ACCOUNTS_STAGE_SPEC.md`; nothing built.

### 2026-08-02 | COMPARE RE-SKIN shipped (Direction 1, tonal depth) + compare markup hardened

**Front-end only, NO DB. Commits `8f6fa83`, `ac1ace0` on `redesign-compare`, NOT pushed. The Compare visual-redesign design sitting is CLOSED , §D updated.**

- **SCOPING FIRST (read-only), and it changed the brief.** Measured the live page rather than reading CSS: every one of the 7 `.vsect` computed to **identical `rgb(255,255,255)`**, the `.verdict` stage to a 4-unit cream gradient, and **`.vfinal` , the payoff , to `rgba(0,0,0,0)`, i.e. the ONLY block on the page with no treatment at all**, 118px tall between two solid white panels, starting **79% down a 2,801px scroll**. So the diagnosis was not "add colour": the brand palette was already there and SUPPRESSED (`--panel-t:#1C6038` is applied to `.vsect` and overridden by `body.light`, and every page ships `<body class="light">`). The build-up outweighed the payoff on size, container, colour and position simultaneously.
- **THREE DIRECTIONS MOCKED against Messi vs Ronaldo 11/12** using the REAL cached verdict (`v2-347d0962`, tag `var_close`, rt 97/96). Lucas chose **Direction 1, tonal depth**. **The mocks earned their cost by producing two findings that reading could not:** (1) **the VV cards are DARK objects, so darkening the stage REDUCES card contrast** , the opposite of what "less white" implies, and it killed directions 2 and 3; (2) a dark-on-dark payoff has WEAKER hierarchy than a light stage with a bright hero, because it cannot invert. A second high-fidelity mock then rendered the real `buildCard`, the verbatim `drawDualRadar` and the shared `renderTrajectory` inside the new frame before any production edit.
- **SHIPPED (`ac1ace0`) , four surface tiers, light / dark:**
  ```
  page floor  ...#E2D9C7 gradient   body      (deepened from #E9E0D0)
  plinth      #DCD2BE / #171412     .matchup  (cards sit ON something)
  stage       #EFE8DA / #141011     .verdict  (holds the sections)
  panel       #FBF8F2 / green       .vsect    (supporting; warmed off pure white)
  hero        #FFFFFF / #2A2422     .vfinal   (the payoff)
  ```
  `.vfinal` gained its own surface, a pink-tinted border, 38px padding, a drop shadow + 7px pink halo, and the **pink->gold rule inlaid on its top edge**.
- **MAPPING CORRECTION caught before the production edit:** the approved mock put hero treatment on `.verdict`, but **`.verdict` is the STAGE containing all seven sections , `.vfinal` is the payoff.** Applying it to `.verdict` would have made the whole stage the hero and changed nothing about the actual problem.
- **ALL EDITS TO EXISTING RULES**, per Lucas's instruction , `:root`, the `body.light` block, `.matchup`, `.verdict`, `body.light .verdict`, `body.light .vsect`, `.vfinal`, and the two existing mobile media queries. Nothing appended. The demo had hit exactly the specificity fight this avoids (`.verdict{display:none}` and `body.light .verdict{background:…}` both out-specified an appended layer).
- **COMPONENTS UNTOUCHED , surfaces only, verified live:** 2 `.vvcard` from `buildCard`, 1 `#vradar` with 2 overlaid shapes, 2 trajectory SVGs.
- **WHY PANELS FOLLOW THE BODY THEME (the load-bearing constraint).** Chart colours are `body.light`-qualified, so a dark panel under a light body renders the VV line `#2a2620` on near-black , **the same invisible-ink class as the `var(--ink)` bug**. Measured live: light -> VV line `#2a2620` on `#FBF8F2`, radar grid `rgba(0,0,0,.12)`; dark -> VV line `rgb(240,234,217)`, grid `rgba(255,255,255,.14)`. **Never put a chart on a ground its overrides were not written for.**
- **DARK-MODE GREEN KEPT, deliberately against the approved mock.** The mock replaced `.vsect`'s Under-the-Lights green with neutral dark panels and Lucas approved the mock , but §D LOCKED RULES name that green as Compare's identity, so it was preserved and FLAGGED rather than silently dropped. Lucas confirmed: *"you were right not to silently drop a §D LOCKED decision."* **Consequence, stated plainly: in dark mode the hero is NOT the brightest element** (green panels luminance 0.089 vs hero 0.019); out-shining them needs `#60554e`, a washed-out grey that would look wrong. So **light mode gets hierarchy by BRIGHTNESS, dark mode by DIFFERENCE** (the only warm-neutral panel, the only brand rule, the only gold display type). Accepted knowingly.
- **MOBILE REGRESSION found and fixed:** the plinth padding cut card width **159px -> 121px**, because `vvSizeCards` derives `cw` from `window.innerWidth` and cannot see a container's padding. `.matchup` padding drops to `20px 8px 18px` at <=820px (cards back to 138px), `.vfinal` to `30px 18px 26px` at <=720px. 390px both themes: no overflow, no horizontal scroll, cards still side by side.
- **FLIP SAFETY verified on the live ancestor chain**, not assumed , `.vvcard -> #cardA -> .side -> .matchup -> .canvas -> body`: `overflow:visible` and `will-change:auto` at EVERY level, 0 clipping ancestors. §C invariants 3 and 4 both hold; the new plinth deliberately sets no overflow and the `.edge-flag` badge is unclipped.
- **MARKUP HARDENING (`8f6fa83`) , the last hardcoded player is gone from compare.** Three markup spots named Thierry Henry (ZERO rows in the dataset): the Proof column headers and both watch buttons (labels + YouTube hrefs). **NOT a live bug, and this corrects a claim I made during scoping:** `.verdict` is `display:none` and the ONLY thing adding `.show` is the `.settle` onclick , the same handler that refreshes those strings synchronously, before `vvGenerateVerdict()`. I had reported it as a bug after reaching that state by adding `.show` directly in a test, which is not a real path. The real issue was the latent hazard: correctness rested on "the verdict is only ever revealed by the button that also refreshes it", and **auto-opening the verdict on a deep link is an obvious redesign move that would have broken it**. Now neutral `Season A`/`Season B` and the hrefs DROPPED rather than pointed at `#` (an `<a>` with no href is genuinely inert; `vvUpdateWatchLinks` sets `el.href` when real data lands and early-returns on a null card). Also corrected two scoping mis-annotations: `vvSetProof` DOES update `.vp-a`/`.vp-b`, and `CMP_A`/`CMP_B` ARE nulled (880/890) , CLAUDE.md was right on both.
- **KNOWN, unchanged by this work:** the overlaid radar renders as two narrow SPIKES because `RADAR_REF` is still provisional (see the §D item). The re-skin frames it correctly; only the parked percentile work fixes the shape.
- NEXT: desktop My Club coming-soon page, then §D step 5 hygiene (key rotation, og/meta, Vercel Pro) -> QA -> merge.


Entries from **2026-07-24 (cont.) back to 2026-07-03/04**. The three most recent entries at the time of the split (2026-07-28, 2026-07-27, 2026-07-24 ×2, and the 2026-07-23 (cont. 3) "back on the launch spine" marker) stayed in CLAUDE.md §F.

*(Moved 2026-08-02, second archive pass , CLAUDE.md had reached 93% of the 150k truncation limit. The three unclosed items inside these entries , the compare season-fold verification, the season-order verification, and the SLOT_OPEN fix , were promoted to CLAUDE.md §D BEFORE the move.)*

### 2026-08-01 (cont.) | Tier-3 sweep: switchSeason URL state, I VVonder rebuilt as 4 live chips, glance name + reorder , and 3 queue items found ALREADY SHIPPED

**Front-end only. NO DB change (deliberately , see the matview finding). Commits `52519bf`, `10d8e71`, `462b6a4` on `redesign-compare`, NOT pushed.**

- **SWITCHSEASON URL STATE (`52519bf`).** Selecting a season swapped the rendered data but never touched the URL, so a refresh reverted to the arrival season and a copied link carried the wrong one. **`card_id` IS the player-season key** (Messi's four seasons carry four ids), so writing `?id=` is the whole state and the initial load already reads it. **replaceState, NOT pushState:** the card's Back button is `history.back()` (card.html:502), so pushing would make Back step through every season toggle instead of returning to rankings. Other params (`p`/`s`/`key` -> Chronicle resolver) preserved by mutating the existing URL. Verified live: Messi 2019 -> 2020, reload lands on 20/21, `history.length` unchanged.
- **I VVONDER , the whole example section was aspirational (`10d8e71`).** §D item 9 logged ONE bad chip; there were **three chips, all inert `<div>`s with no links at all**, and **two** named players with ZERO rows (Thierry Henry , the only "Henry" matches are middle names like Andrew *Henry* Robertson; and Maradona). Rebuilt as FOUR real clickable pairings chosen to teach four DIFFERENT engine behaviours rather than four versions of one: Haaland 22/23 rt95 vs Salah 24/25 rt95 (gap 0, ten years apart -> **age-tiebreak**, The Ascendant); Messi vs Ronaldo 11/12 rt97/96 (gap 1, same league same season -> VAR close call); Lewandowski 20/21 vs Kane 23/24 rt93/93 (gap 0, age gap under the 4y floor -> engine **DECLINES**, The Debate Lives On); TAA vs De Bruyne 19/20 rt86/91 (gap 5 -> **A Clear Edge**, the only cross-position pair and the only decisive one, since the other three are ties). Every card_id read back off `player_card_mv`, every link followed in-browser. Eight distinct players, no reuse, no NR fields. Chips became `<a class="iwchip live">` with a pink border + hover lift + `Compare it >` , they are the only live links on a Coming-soon page, so they must read as clickable. **Audited the rest of the page: the 4 rotating search-bar placeholders name no player or season; no pre-data citation survives anywhere.** Also confirmed there was no "stale hardcoded ID" to inherit , the only Vardy reference is a card.html Chronicle entry keyed by name+season, and these four are the ONLY hardcoded compare deep-links in the repo.
- **GLANCE NAME + FIELD REORDER (`462b6a4`) , the item's premise was wrong and the fix is a new derivation.** §D said to add `D.full`; `D.full` is just `row.player_name`, **abbreviated for 63.6% of players**, so it would never have produced a full name. And `players.full_name` is the full **LEGAL** name , "Lionel Andrés Messi Cuccittini", "Mohamed Salah Hamed Mahrous Ghaly", Hulk -> "Givanildo Vieira de Souza" , so it cannot be shown raw either. **NEW `VVCore.vvDisplayName`:** borrow ONLY the given name from `full_name`, keep `player_name`'s own surname (the "known as" surname, compounds already intact -> "K. De Bruyne" -> "Kevin De Bruyne"). A `^X\.\s` guard returns anything not in initial form untouched, which covers already-full names, mononyms whose legal name differs entirely, and **non-Latin rows where the two fields are in OPPOSITE order** ("Son Heung-Min" / full_name "Heung-Min Son"). Where the initial disagrees the player goes by a MIDDLE name ("H. Maguire" <- "Jacob Harry Maguire"); recovered only when exactly ONE later token matches (2+ is ambiguous , "O. Aina" <- Temitayo Olufisayo Olaoluwa). **Measured: 9,730 of 9,798 abbreviated names, 99.3%.** The 68 left alone are diminutives absent from the legal name (Dele <- Bamidele, Noni), where abbreviating is honest. Validated on 16 hand-picked cases across every class.
  - **DATA PATH , the matview finding that killed the obvious approach. `player_card_mv` does NOT `SELECT *`; it enumerates all 47 columns explicitly, and a matview's query is frozen at creation.** So appending a column to `player_card_view` surfaces it NOWHERE , `REFRESH` re-runs the stored list. Postgres has no `ALTER MATERIALIZED VIEW ... ADD COLUMN`, so the only route is DROP + CREATE of the matview the whole site reads, plus its **8 indexes** including the UNIQUE `card_id` index that `REFRESH CONCURRENTLY` depends on. **I had told Lucas this was "append-only, rt-safe" , that was correct about the VIEW and wrong about the MATVIEW; corrected before anything was run.** Chose a client-side lookup instead: one indexed `players` query by `api_player_id`, fired only when the name is actually abbreviated (~36% of cards make no request), cached per player so season-switching refetches nothing, guarded so a fast switch cannot let a stale response overwrite a newer card, and degrading to the abbreviated name on every failure path (= previous behaviour, no regression path). **Confirmed the ANON key can read `players.full_name` , RLS is not in the way** (all prior checks had used the service key).
  - **Renders progressively:** `player_name` paints synchronously, the derived name replaces it ~50-60ms later (measured 277 -> 336ms Messi, 224 -> 268ms Kane). The placeholder is deliberately **EMPTY**, not the file's demo convention , a MutationObserver trace showed every card flashing "Bruno Fernandes" for ~165ms before its own data landed, and a name is identifying in a way "CAM · Man Utd" is not. `min-height` reserves the line.
  - **META LINE** now `position · age · club · league · season · games`. Games is **weighted, not repositioned** (900, full ink vs the muted line) , the stated order would have moved it to LAST, which contradicted the item's own "not buried" intent; weight serves it better, and it leads row two when the line wraps. Each field is its own `white-space:nowrap` span with separators as the only breakable nodes , the first pass split "Premier League" across lines. 390px, 5 cards incl. the longest combinations: zero mid-field breaks, two lines max, no horizontal scroll. Built from DOM nodes, not innerHTML, because club names contain "&" (Brighton & Hove Albion).
  - **`var(--ink)` DOES NOT EXIST in card.html** (only `--ink-soft`), so the heading and the games emphasis silently inherited the MUTED grey and the emphasis did nothing. Both now use the codebase's mode-aware pattern: `var(--cream)` unqualified for dark + `body.light` override to `#2a2620`. Confirmed computed `rgb(42,38,32)`.
- **QUEUE RECONCILIATION , 3 of 4 remaining Tier-3 items were DOC DRIFT, not work.** Verified against code, not the doc: **club-token search** was already delivered by the Tier-1 search fix (`e83de31` , `tokenAndFilter` ANDs each token across player OR team name); **playbook tag cropping** measures clean at 390px (0 clipped of 19 `.libtag`, tooltip clamp present from `d5898d6`); **VV Index matrix/emoji** is overtaken , the pentagon replaced Five Dimensions, Principles already has 12 SVG `.picon`s, Bands is already an accordion, the disclosures must stay still by rule, and the page has zero emoji by design. Only the **desktop My Club coming-soon page** is genuinely open (`myclub.html` has 0 `comingpill` vs iwonder's 3).
- **KNOWN GOTCHA:** `vv-core.js` is loaded with no cache-buster (`<script src="/vv-core.js">`), so a stale cached copy makes any vv-core change silently no-op while looking fine , this cost real debugging time when `vvDisplayName` came back `undefined`. **Hard-refresh after any vv-core change.**
- NEXT: desktop My Club coming-soon page; then §D step 5 hygiene (key rotation, og/meta, Pro plan) -> QA -> merge. Name derivation is verified structurally but its long tail is unvalidated against football knowledge , a wrong first name on a card would most likely be a middle-name player where the unique-token rule chose the wrong given name.

### 2026-08-01 | CACHE INVALIDATION shipped (3 commits) + the 502 it caused + Fluid Compute , plus CLAUDE.md split

**Commits `39a2c37` (doc split), `6143a10`, `8399723`, `f03da27`. DB write: `migrations/cache_stamps.sql` applied via exec_sql. PUSHED (explicitly directed).**
- **[SUPERSEDED 2026-08-10: the recovery narrative described here has since moved AGAIN, out of this file and into `INGESTION_RECOVERY.md`. The session-log half stayed.]** **CLAUDE.md 179k -> 95k (`39a2c37`).** Historical session logs (29 entries, 07-23 and older) + the closed 9-league recovery narrative moved to `CLAUDE_ARCHIVE.md`. Five locked designs that lived ONLY inside archived entries were promoted into §C/§D/§E first (verdict-tag system + age-tiebreaker, VV Index anchoring notes, mobile-Safari 3D invariants, CDM def_core open question, card prev/next spec + data-source options). Also wrote the two MISSING §F entries (07-27, 07-28) so the log has no hole at the boundary. **Archive is NOT authoritative , CLAUDE.md wins on any conflict; its "NEXT" lines are stale.**
- **THE BUG THAT STARTED IT (found by Lucas 2026-07-28, §D VERIFY ON RETURN):** verdict prose was cached forever with NO invalidation. Measured: **47 of 70 rows cite VV scores that are no longer live** (Garnacho 2023 cached as 79, live 71). Prose renders BESIDE freshly-read scores, so the panel contradicted itself; the tag chip self-heals but the prose does not.
- **FIX (`6143a10`):** `rt_a`/`rt_b`/`cache_version` on verdict_cache, `rt`/`stats_hash`/`cache_version` on notes_cache. Three miss conditions: unstamped / version drift / data moved. Legacy rows are NOT deleted , they miss and self-heal on view. `stats_hash` = key-sorted sha256 of the whole cited `player` payload, so a goals fix that leaves rt unchanged still invalidates. **Swap trap:** `pair_key` is canonical min-max so `rt_a` binds to the LOWER card_id, mapped through the same `swapped` flag as the payload , verified for both slot orders.
- **HARDENED (`8399723`):** versions are now DERIVED , `VERDICT_VERSION`/`NOTES_VERSION` = `PROMPT_REV + fingerprint(prompt)`, so a prompt edit auto-bumps and you cannot forget. Also SPLIT per cache (one shared constant meant editing the notes prompt invalidated every verdict row). Prompts moved to module scope; `MODEL`/`VERDICT_SYSTEM`/`NOTES_SYSTEM`/versions exported.
- **`scripts/prewarm_verdicts.js` written** (rt>=95, 66 pairs, ~$0.72, resumable, real token tally). **NOT RUN.** It IMPORTS the constants rather than parsing them , which caught a real bug: regex-parsing the prompt yields the SOURCE text (5578 chars, literal `\n`) not the EVALUATED literal the handler sends (5576, real newline), diverging inside STYLE RULE 5. Parity proof executes `compare.html`'s extracted source vs the script over all 66 pairs: byte-identical.
- **THEN IT 502'd , a regression from the above.** Stamping turned a 100%-hit notes population into ~96% miss, so every card view ran a 10-16s generation against Vercel's **10s** ceiling. Diagnosed as TIMEOUT not crash: handler mock-invokes clean, 9 of 252 rows completed and got stamped, fast calls returned 200 in 270ms-1.2s. (Vercel documents timeout as 504; observed 502 , unresolved, not decision-relevant.) **The cliff is PRE-EXISTING; the stamp change walked the whole population off it.**
- **FIXED (`f03da27`):** (1) notes legacy softening , serve pre-stamp rows, hit rate 4% -> 100%; verdict path deliberately left strict. (2) **Fluid Compute** `{"fluid": true}` , Hobby 300s default AND max, free, Node.js supported, our module scope is all-`const` so the shared-process model is safe, and Vercel excludes I/O wait from Active CPU billing.
- **THE SOFTENING IS A STOP-GAP , see §D TIER 0.** Flip notes back to strict once Fluid is confirmed.
- **PRO PLAN IS A PRE-LAUNCH REQUIREMENT, separate from the timeout:** Vercel states the Hobby plan "restricts users to non-commercial, personal use only". A public product launch on Hobby is outside those terms. Pro = $20/dev/month (also 1 day of runtime logs vs 1 hour , would have surfaced this 502 immediately).
- **UI/CONTENT BATCH , shield badge, nav swap, preferences cleanup, two VV Index disclosures, cropping fixes.**
  - **VV SHIELD ACCOUNT BADGE (`c6f04a4`).** The top-right badge was a hardcoded red "L" on 7 pages. Now the VVonderXI shield, using the ACTUAL card shield path (`M50 4 L92 18 …` on `0 0 100 116`, the same one in `card.html` + `rowShieldHTML`), so it shares a silhouette with the squad badges. **It stays an ACCOUNT button, not a logo** , all 7 pages now navigate to preferences (was 2 of 7), with `role=button`, aria-label, Enter/Space, focus ring. **The cream border had to be INSET** (`scale(0.84)` about the centre): stroking the outer edge made it invisible in light mode, cream-on-cream. Do not "simplify" it back to a plain outline stroke.
  - **NAV SWAP , 8 pages (`c65043e` carried preferences, `1e78c1a` the rest).** All now **Home · Rankings · Compare · VV Index · Playbook**; My Club removed everywhere. **The nav was ALREADY inconsistent** , `iwonder`/`preferences` had dropped Home and appended VV Index, a worse shape than the plan described; brought into line, not treated as precedent. `card.html` -> Rankings parent highlight was dropped by the first rebuild and restored. `foundations.html` excluded (dead prototype , see §D step 5).
  - **PREFERENCES CLEANUP + EMAIL LEAK (`c65043e`).** `livanlauwe@gmail.com` was hardcoded TWICE and live on the preview; removed, HEAD greps clean (but see §D step 5 , it remains in git history). Removed the fake-user header (`.meprofile`/`.meav`/`.mename`/`.memail`) and its dead CSS: **there is no auth** , `api/auth.js` exists but NOTHING reads a session (zero `getSession`/`getUser`/`onAuthStateChange`) and `vvJoin()`'s OAuth call is commented out. The inert Account rows (Email/Privacy/**Sign out with no handler at all**) became one `.comingpill` state, matching iwonder. Kept everything wired: Daylight, Player faces, Add to Home Screen, Contact us, Version.
  - **VV INDEX DISCLOSURES (`58efb95`).** Two, written against the engine as verified read-only, not as described. **"Where the league counts"** , closes the §D item-7 gap. The draft claimed "measured against the competition it was actually played in", which is **FALSE**: percentiles are `PARTITION BY s.pos` only, so a striker is ranked against every striker in all 9 leagues and 16 seasons at once and the league weight is applied AFTER as `* (1 - (1-wt) * 0.35)`. Replaced with the true and stronger claim , strength is measured from ~980 real transfers, not assigned by reputation. **"Where the ground still moves"** , MERGED into one block naming the TWO distinct causes; the first merge attempt silently DROPPED the completeness cause. Both are distinct in the engine: completeness moves scores via the global position percentiles, the benchmark via the `b85/b90/b95/btop` anchors (the 650th/150th/12th/1st best card, **no league or season filter** , confirmed empirically: rt>=85 is exactly 650 cards, rt>=90 exactly 150, rt>=95 exactly 12). **This is why importing a 2025 season can move a 2011 one.**
  - **CROPPING FIXES (`d5898d6`).** rankings `.utags` was `nowrap`+`overflow:hidden`, slicing the 3rd tag (3 of 10 rows, 24-43px) -> now wraps; row heights vary 87/109px, 68/32 split, accepted, 3-tag cap kept. playbook `.libtag` tooltip was an un-clampable centred `::after`, pushing 10 of 19 bubbles 49-61px off-screen at 390px -> now a fixed box using `positionFloat`'s clamp, **mirrored in ~20 lines because playbook does NOT load vv-core** (importing it would double-fire tooltips). Also gained a tap path it never had. Left alone: compare `.pkchips` (intentional scroller), card-face `.chtagcell` (structural).
  - **PLAYBOOK VOCABULARY.** Glossary pills and library headings used two spellings of one taxonomy (`Attacker`/`Attackers`, `Career-Stage`/`Career Stage`). Reconciled to plural + space, 15 pills updated; `Verdict`/`Honour`/`Profile`/`Prestige` left singular , they label a tag TYPE, not a position group, and have no library heading.
  - **"Fold all & top" -> "Fold all"** on the card (`c6d7126`) , label only; it still folds every `.layer` AND scrolls to top, and the up-arrow icon carries the "top".
- **VV INDEX "THE FIVE DIMENSIONS" REBUILT AS A PENTAGON (`f7d84bf` + `6a058a3`). THE OLD `.dim` CARD MARKUP IS GONE , do not go looking for it.** The five stacked click-to-expand `.dim` text cards are replaced by ONE interactive SVG pentagon (`.fd` / `#fd`), with the explanation revealed beneath it one dimension at a time.
  - **SCHEMATIC, NOT DATA** , a regular symmetric pentagon illustrating the five axes. It plots nobody. Deliberate: the real radar still scales against provisional `RADAR_REF` placeholders (percentile-within-position is parked on the engine track), so a shape implying measurement here would promise what the data cannot deliver.
  - **COPY IS THE OLD COPY, VERBATIM** , all ten strings (5 `.dd` leads + 5 `.dmore` bodies) were extracted programmatically and verified **byte-identical** to the pre-change file. Nothing rewritten. `Defensive` stays the single-word label (matching the card radar) while the body keeps "defensive value" , the two forms that already existed, no third one added.
  - **INTERACTION** = ARIA tablist (`role=tab`/`tabpanel`, `aria-selected`, roving tabindex, arrows/Home/End/Enter/Space). All five panels live in the DOM. Goal Threat selected by default so the panel is never blank. Tap, not hover-only; desktop labels hover to pink.
  - **AFFORDANCE IS BOUNDED, per §D's motion rule ("plays ONCE on scroll-into-view, NEVER loops").** `IntersectionObserver` (threshold 0.5) adds `.fd-live` when the pentagon is actually SEEN , that starts both the staggered dot pulse (3s cycle, 0.28s stagger) and the clock. One `settle()` ends it on **first tap OR 9s**, whichever comes first (idempotent, clears the timer). Class is `.fd-settled` (was `.fd-tapped` , renamed once a timer could also end it). A page-load timer was rejected: the section sits ~956px down, so it would expire before anyone reached it.
  - **Reduced motion:** no pulse at all, hint still shows and still settles on the timer.
  - **Colour is mode-dependent** (same bright-in-dark / darkened-in-light pattern as the `.rtag` family): `#DE3A5E` in light (~3.9:1 on cream), `--pink` `#FF5C7A` in dark.
  - **Two bugs caught by rendering it, not by reading it:** (1) centred labels at the side vertices OVERLAPPED their own dots , side labels now anchor outward (`start` right, `end` left); (2) `.idxwrap`'s 48px side padding leaves a 279px container at 390px, scaling the SVG to 0.698 and rendering labels at **8.72px** , too small; labels bump to 15.5px in user units below 480px, landing at **10.81px** (in line with the card radar's 10.5px). Verified at a true 390px viewport: no clipping, no horizontal scroll, nearest label 65.8px from the edge. Containment is structural , every label lies inside the 0-400 viewBox and the SVG scales as a unit.
- NEXT: Lucas verifies Fluid is live (fresh notes generation completes, no 502). Then , flip notes to strict, optional offline backfill of 252+70 rows (~$3.94), Gate-2 verification of the invalidation on the deployed build (fresh pair stamps -> repeat `cached:true` -> hand-edited `rt_a` regenerates), THEN the rt>=95 pre-warm.
- **~~KNOWN OPEN~~ , FIXED 2026-08-01 (`52519bf`), see the entry above.** `switchSeason` on card.html did NOT write the selected season to the URL, so a refresh reverted to the arrival season and a copied link carried the arrival season, not the one on screen. Now `history.replaceState`s the new `card_id` into `?id=`. **`card_id` IS the player-season key** (one id per season , Messi's four seasons carry four ids), so `?id=` is the whole state and the initial load already reads it. **replaceState, NOT pushState:** the card's Back button is `history.back()` (card.html:502), so pushing would make Back step through every season toggle instead of returning to rankings. Other params (`p`/`s`/`key` -> the Chronicle resolver) are preserved by mutating the existing URL. Verified live: Messi 2019 -> 2020, URL follows, reload lands on 20/21, `history.length` unchanged.

---

### ⬇ JULY 2026 ENTRIES (2026-07-28 and earlier) ARE IN `CLAUDE_ARCHIVE_2026-07.md`

Split out 2026-08-11 because this file had reached 87% of the 150k truncation limit and could not take the §F entries being relocated from CLAUDE.md. 34 entries moved, byte-identical. Nothing load-bearing lives only there , the earlier archive passes promoted those facts into CLAUDE.md §C/§D/§E first.


---

## RELOCATED FROM `CLAUDE.md` §F ON 2026-08-29 (tenth pass)

**Promote-checked before moving: twelve load-bearing facts from these two entries were grepped present in `CLAUDE.md` first. TWO WERE NOT** , the loader floor (§C read as 40 where the live constant is 16) and the caveat that the whole 2026-08-23 SVG contrast survey needs re-running. **Both were fixed in `CLAUDE.md` in the same commit rather than the entries being moved on top of them.** That is the second time the check has caught a stale promotion claim; do not skip it.

### 2026-08-24 | Two-tone loader shipped, the AI waits found, contrast rulings applied, and a relief pass

**1. THE LOADER WAS REBUILT TO THE TWO-TONE SPEC AND THE SPEC IS NOT IN THE REPO.** It is not in `POST_LAUNCH.md` and not anywhere , `#1A1917`, `2.6s`, "Reading the seasons" and "right to left" return ZERO hits across every file. The only loader reference is a bare line in the superseded 2026-08-09 handover. **Built from Lucas's message instead, and the trace VERIFIED against the `.spinelogo` PNG rather than taken on trust: left stroke 97.6 vs right 77.6, a 1.26 ratio.** The asymmetry is real. **`VV_LOADER_MIN` 40 -> 16** , see §C.

**2. THE AI WAITS WERE THE LONGEST ON THE SITE AND HAD NO LOADER.** Three states, one `/api/analyse` call: the glance Drury line ran a pink shimmer, Commentator's Notes showed an empty panel, and the Scout report showed nothing at all. All three now carry the mark at 2.6s. **The 400 path was tested and was already sound** , `vvEditorialFail()` names the outage; it now also empties the bodies, because an animation inside a `display:none` subtree still schedules frames.

**3. CONTRAST RULINGS APPLIED. Fixed:** `.cm-mk` sized to the 3:1 large-text bar with the pink fill untouched (19px bold, 3.89); `.tjvp` off green, 1.27 -> 7.85. **Accepted with their ratios so a later pass stops re-finding them:** card-face chips 2.04 and 2.34, `.prenum` 1.00 by construction, the waiting box edge 1.88, and `.pspot` 3.89 , the last REVISITABLE only if the pitch is redesigned. **And a correction to my own survey: the G+A label was reported at 1.82 and is 3.63** , the sweep read `color` on SVG `<text>` where `fill` paints, so **every SVG figure in the 2026-08-23 survey needs re-running before it is trusted.**

**4. RELIEF PASS, 97.1% -> 87.7%.** §D deferred specs to their stage files, then §C narrative to `RULE_EVIDENCE.md` on the six largest rules. **Rules stayed; only evidence moved.** Fourteen load-bearing strings grepped present afterwards. Detail and the method warning are in §D.

### 2026-08-21 | The tag audit that unwrote yesterday's warning, and a relocation pass at 98%

**Read-only audit, then docs. No engine change, no floor touched.**

**1. THE "TAG RECALIBRATION IS NOW REQUIRED" WARNING WAS MINE AND IT WAS WRONG.** Written the same day the engine changed and BEFORE anything was measured. **Measured on all 57,234 cards, the change moved SEVEN CARDS ACROSS TWO TAGS** , The Last Dance 47 -> 42, Wonderkid 71 -> 73, every other tag identical card for card. `getVVTags` reads `gaw` **zero** times, `pos_pct` zero, `posvol_pct` zero; `rt` only at the `>= 82` gate those two tags share. **Full correction and the reasoning error in §C**, kept as a correction rather than deleted.

**2. NO TAG IS OVER THE CEILING EXCEPT IRON MAN AT 3.40%, the documented exception, unmoved.** 15.23% of cards hold a tag. **The apparent collapses against the 2026-08-13 file are not collapses** , that baseline predates the rarity pass AND the identity fix, so Ball Hawk 3.49 -> 1.47 and The Dribbler 3.82 -> 1.61 are correct changes reading as damage, and **Marksman 1,649 -> 0 is a RETIRED tag.** Fixed by writing `scripts/enrichment/tag_distribution_2026-08-21.txt` as the post-pass baseline.

**3. THE 2026-08-15 ELIGIBILITY-VERSUS-THRESHOLD DEFECT IS FULLY CLOSED** (figures in §C). **The method error is worth more than the result: run across all eighteen tags, the minority-family diagnostic flagged ELEVEN, and every one was the test pointed at the wrong class** , ability tags gate on family and are SUPPOSED to span pools, so Iron Man at 65.2% is availability doing what availability does. Baseline also moved 8.28% -> **12.54%** on coverage growth, not tag drift.

**4. RELOCATION PASS, 98.0% -> 88.6%.** The file was already at 95.7% at HEAD, past its own 90% trigger, truncation silent, read first every session. Archive checked first (66.6%, no split needed; now 79.9%). Three §F entries moved. **§C IS NOW THE MASS AND §F CANNOT PAY AGAIN , §C 46.1%, §D 24.3%, §E 8.3%, §F 3.1%.** The next pass must split evidence out of §C the way `SILENT_FAILURES.md` already did; archiving cannot reach it.


---

## RELOCATED FROM `CLAUDE.md` SS F ON 2026-09-01 (ninth pass)

**Two entries, 7,598 bytes. `CLAUDE.md` was at 99.0% of its 150k truncation limit and a ruling had to be compressed mid-write to fit.**

**THREE FACTS WERE PROMOTED OUT OF THESE ENTRIES FIRST, AND THE CHECK EARNED ITS KEEP:** the browser-will-not-resize fault (`outerWidth` 0), the `window.X` versus script-scoped `let` binding fault, and the compare picker's no-body-lock ruling existed NOWHERE ELSE , and all three had been re-hit in the session doing the archiving. They are now in SS C with their evidence in `SILENT_FAILURES.md`. Archiving without the check would have destroyed them.
### 2026-08-29 | Two mobile fixes shipped, one built-then-removed on measurement, the transfer halves scoped, and a relief pass that §E paid for

**1. THE COMPARE PICKER'S SCROLL CHAINED INTO THE PAGE AND NOW DOES NOT.** `overscroll-behavior:contain` on both `.pkresults` rules. Verified at 390x844: list parked at the end of its scroll, eight further wheel events, page unmoved with 871px still scrollable behind it, positive control run first.

**2. THE COMPANION BODY LOCK WAS BUILT, MEASURED, AND REMOVED , AND THAT IS THE ENTRY WORTH KEEPING.** Locking the page while the picker is up is the obvious second half and it is wrong for THIS picker: `.pkpanel` is an **anchored IN-FLOW panel**, not an overlay, and compare auto-opens BOTH slots on a bare load. With `position:fixed` on body, `documentElement.scrollHeight` collapsed to the viewport while body stayed 1,365px tall at 1440x900 and 2,190px at 390x844 , **465px unreachable on desktop, 1,346px on mobile, with no scrollbar to say so.** The finding is left as a comment where the lock would go. **A fix that is correct for a pattern is not correct for every instance of it; render it before believing it.**

**3. RANKINGS VIEW TOGGLES 36x30 -> 44x44.** Icon unchanged, hit area only; checked at both widths, no overflow, `.rankfbar` unchanged at 52px. **Nine targets under 44px remain on rankings** , `rankfbtn` at 33 and five `bn-item` at 34 , deliberately untouched, since the bottom nav is site-wide.

**4. OPTION C AND THE SETTLE BUTTON ARE RECORDED, NOT BUILT** (`POST_LAUNCH.md`), with the demoed figures and three risks. **The one that matters is pre-existing: `.filterrail` goes static at 1100px while `.bottomnav` appears at 720px, so 720-1100px gets NEITHER treatment.** Option C does not create that hole, it is just the first change that makes it visible.

**5. THE THREE TRANSFER HALVES ARE SCOPED , `migrations/transfer_halves_2026-08-29/PLAN.md`, NOT RUN.** §E justified the repair on the minutes reconciling with the sibling, which is an INTERNAL check, and §C forbids exactly that. **Re-verified against the provider under the CORRECT ids: both halves are real, and the three impostor ids return no 2025 season at all.** The merge rule is `resolveSeasonStat()`, already shipped , take its output verbatim rather than adding the stored halves, which disagree with the provider on appearances. **It needs a human nod first: richest-by-minutes moves all three cards to a different club** (Forest -> Villa, City -> Fulham, West Ham -> Burnley).

**6. THREE DOC CORRECTIONS FOUND WHILE SCOPING.** **The population is 57,058, not the 57,234 quoted in §C and §E.** **`psc.rt` and `player_card_mv.rt` disagree and the matview is what the site reads** , the halves are 41/18/37 in the mv and 69/67/68 in `psc`; never quote `psc.rt` as a card's score. And **`source` says `apifootball` on all six rows including the impostor-keyed three**, which is the `UNIQUE (source, api_player_id)` argument demonstrated in live data.

**7. RELIEF PASS, 94.8% -> 88.0%, AND §E PAID.** New `DATA_DEFECTS.md`. **THE PROMOTE CHECK EARNED ITS KEEP TWICE BEFORE THE TWO OLDEST §F ENTRIES COULD BE ARCHIVED** , §C read as `VV_LOADER_MIN` 40 where the live constant is **16** (it would have sent a session to "fix" correct code), and the caveat that the whole 2026-08-23 SVG contrast survey needs re-running existed ONLY in the entry about to be moved. **Both were corrected in `CLAUDE.md` first.** **§C is now genuinely incompressible** , its 55 blocks average ~500 bytes and the largest is 28 separate rules, not one entry. Detail and the destination sizes are in §D.

### 2026-08-28 | Keeper scoring and the keeper card, built , and the locked three-spoke radar killed by its own measurements

**1. THE GOALKEEPER CARD IS BUILT AND THE LOCKED DESIGN DID NOT SURVIVE CONTACT WITH THE NUMBERS.** The 2026-08-19 spec locked a THREE-SPOKE radar. **There is now no radar on a keeper card at all**, and it was measurement that did it, not taste: `penalties_saved` has no derivable denominator, and at 10% weight it put Trapp above Donnarumma while dropping ter Stegen, the highest save% in the pool, to 39th; **workload measures the team, not the keeper , shots faced against save% is -0.118, against goals conceded +0.835.** Two of three spokes fail, and one honest axis is not a shape. **A ladder against the keeper pool says strictly more than a triangle could.** Full supersession in `POST_LAUNCH.md`, decisions in §D.

**2. WHAT SHIPPED.** `VVCore.keeperScore()` (800 minutes AND 60 shots faced, 2015+, global keeper-pool percentile off an embedded ladder) and `VVCore.keeperPanelHTML()`, wired into card.html's Profile layer, plus the `s-gk` playbook section. **1,920 of 2,806 keeper cards score; every card that does not gets a NAMED reason.** The panel went in **vv-core, not card.html**, per §C's rule about card rules trapped in the pages.

**THE DENOMINATOR IS KEEPER SEASONS THAT CARRY SAVE DATA** , `position='GK' AND saves IS NOT NULL` = **2,806**, not all 4,289 keeper seasons. The sentence names three gates, and a card with no save recorded was never eligible to fail them: it could not have been scored however the keeper played, so counting it as a miss reports OUR data gap as HIS shortfall. Adding `goals_conceded IS NOT NULL` returns the same 2,806, so the two fields always travel together. It reconciles exactly: **1,920 scored + 10 pre-2015 + 559 under minutes + 317 under shots = 2,806**, where those 10 are the only pre-2015 seasons that DO carry save data and so were genuinely tested against the era gate. Measured 2026-09-02.

**3. THE CAP IS NOW STATED, AND THAT WAS THE REAL DEFECT.** Two keepers at the 54th and the 97th percentile both print 75, so the header silently contradicted the ladder beneath it. One line under the score now says why. **The keeper-aware fallback matters as much: `vvProfileBlurb` correctly returns nothing for an all-null keeper radar, but the FALLBACK read "measured across five dimensions"**, which is the one thing a keeper card is not.

**4. TWO INSTRUMENT FAULTS, BOTH CAUGHT BY CONTROLS, AND THE SECOND WOULD HAVE PASSED BROKEN CODE.** The window would not resize (`outerWidth` reports 0), so the 390px media query was tested in an IFRAME with its own viewport, asserting `matchMedia` matched before believing any measurement. Then the keeper-to-outfielder transition test reported the radar never coming back , **because it set `window.D`, which is a DIFFERENT binding from the script-scoped `let D` that `drawRadar` reads.** Re-run against the real binding with a control proving the harness moved it, the transition is clean in both directions. **A harness that cannot move the state under test reports a failure and a pass identically.**

**5. VERIFIED BY RENDERING AND BY CAPTURE, NOT BY READING.** Contrast measured on every pair in both themes (all pass; the saved count correctly INVERTS with its block, which is §C's match-the-ink-to-the-ground rule working). Captured in html2canvas at scale 2 and probed on the five features most likely to diverge , **the `overflow:hidden` clip on the radiused bar SURVIVES**, which was the real risk given the inset-rim history.

**6. vvindex NOW SAYS IT TOO, and measuring it found a PRE-EXISTING bug.** `body:not(.light) .wmg-h` is (0,2,1) and beat `.wmg-h.neutral` at (0,2,0), so in DARK mode the "Where We Cannot See" header rendered the same gold as "What We Measure" , correct in light, wrong in dark, which is why it survived. **BOTH contrast harnesses fail their controls on this page**, so neither number was quoted; the check used instead was ink-equivalence against the already-shipping Method section.

**7. §C RELIEF PASS, 94.0% -> under 90%.** 55 rule headlines in, 55 out, ZERO lost. **One line was clobbered and the BYTE COUNT is what caught it** , a line-index edit ran against indices an earlier round had already shifted, overwriting a blank separator with a duplicate paragraph. **The file got BIGGER, which is the only reason it was seen.**

**NEXT / OPEN:** `s-gk` has no mark in `vv-marks.js` and renders its glove emoji through the `pbMarks` fallback. **§C is still the mass at ~36% and the next pass will have to reach into §D (25%) or §E (16%)** , §C's remaining bulk is rules, and rules cannot move.

## RETIRED CLAIMS, MOVED FROM `RULES.md` AND `CLAUDE.md` ON 2026-10-18 (split piece 2)

**Each block below was a superseded or withdrawn claim sitting beside its correction. Before it moved, every fact in it that is still true was searched for in its destination, and the four found nowhere else were promoted first: age never enters rt; a rule that loses to another needs the conflict removed; honours stay in the notes payload; both search surfaces centre. Moved word for word.**

### From `RULES.md`

- **[SUPERSEDED, KEPT FOR THE RULE IT STATES ABOUT WHERE AGE MAY LIVE] AGE-AS-TIEBREAKER IS BOUNDED:** only when rt gap <=2 AND age diff >=4y, and the YOUNGER card wins. **NEVER at gap >=3.** **Age lives in the VERDICT layer ONLY , it does NOT add points and does NOT enter rt, and THAT half is still binding.**

### From `RULES.md`

**[HISTORY , THE ENGINE THAT RAN UNTIL 2026-09-08] `sig` RENORMALISED ONTO ONE FACET WHEN `duel_quality_pct` WAS NULL, AND THAT WAS CORRECT.**  **, full record in `docs/BLEND_SPLIT_AUDIT.md`**
- **`0.55*ds + 0.45*COALESCE(dq, ds)` COLLAPSES TO `1.00*ds` EXACTLY.** With one facet unmeasured, the honest move is to use the other at full weight rather than score the absence. **Nothing is counted twice** , an earlier note in this session called it a "double-count" and that was wrong; the weight is REDISTRIBUTED. The only genuine defect is that the COALESCE DISGUISES it, so a reader of the view sees a two-facet blend where 329 cards get a one-facet measure.
- **`duel_quality_pct IS NULL` IS ALREADY THE MARKER, ON THE MATVIEW, TODAY , NO COLUMN AND NO REBUILD NEEDED.** Any consumer can already tell a one-facet card from a two-facet one. **329 cards, 2.1% of the defensive pool** (CB 170, FB 113, CDM 46), and the facet is missing because **159 have no `duels_total` at all and 168 sit under the view's `duels_total >= 20` gate. Only TWO are a real zero.**
- **THE OBVIOUS FIX IS A DISASTER AND IS MEASURED, SO NOBODY PROPOSES IT AGAIN.** Nulling `sig` so the floor falls to 0 moves **306 of the 329 cards, median 27.07 points of `b`, maximum 44.41** , and every one sits at rt 38 to 70, BELOW the 80 knee where `rt = round(b)`, so a card at 52 falls to about 25. **It punishes 327 cards for a missing field**, which is this file's own first principle inverted (NR for missing data, never 0) and the same defect class as `goals_conceded` zero-filled on outfielders.
- **MAKING THE EXPRESSION EXPLICIT IS VERIFIED IDENTICAL on every row (1e-12) and is DEFERRED ON PURPOSE.** It changes no score, so it buys clarity and nothing else, against the real risk that `CREATE OR REPLACE VIEW` has silently destroyed this view's body before. **It waits for a commit that changes a NUMBER** , floor_bound, the percentile columns, whatever opens the view next , and rides in that edit rather than earning its own.

### From `RULES.md`

**[SUPERSEDED, KEPT FOR THE ONE THING IT GOT RIGHT: IT IDENTIFIED LINE 304 AS THE CAUSE.] (1) THE THIRD STATE LEAKED A VV SCORE, AND THE CAUSE IS A CONTRADICTION INSIDE THE SYSTEM PROMPT RATHER THAN A MISSING RULE.** On Messi 14/15 against Messi 12/13 (96 against 96) paragraph 2 opened **"Both scores read 96."**
- **THE RULE IS PRESENT AND EXPLICIT** , third-state rule 2: *"NEITHER VV SCORE AND NEITHER BAND APPEARS IN YOUR OUTPUT."* So nothing was forgotten.
- **AND THE FIELD SPEC FOR `who` CONTRADICTS IT UNCONDITIONALLY** , *"Name the winner and include BOTH VV Scores as passed."* On a third-state pairing the two sentences cannot both be obeyed. **The model split them: a compliant headline ("Two seasons. No verdict.") followed by the score in the prose.** That is the worst of the three possible outcomes, because it reads as compliance until the second paragraph.
- **SO THE FIX IS TO MAKE THE FIELD SPEC STATE-AWARE, NOT TO RESTATE THE PROHIBITION LOUDER.** A rule that loses to another rule is not a rule that needs emphasis; it needs the conflict removed. **The same shape as the splice: a value computed from one thing while a different thing is used.**
- **AND IT MUST FORBID THE PARAPHRASE TOO** , "level on ninety-six", "both in the mid-nineties", "separated by a single point" are the identical disclosure in words, and a check that greps for digits passes all three.

### From `RULES.md`

**[THE ORIGINAL CLAIM, KEPT FOR ITS REASONING ABOUT WHAT WOULD HAVE BEEN TRUE] THE NOTES PAYLOAD IS DECIDED BY A RACE (found 2026-10-03, WRONG).**
- **`card.html` FETCHES HONOURS ASYNCHRONOUSLY AND ASSIGNS `D.honours` WHEN THEY LAND**, while the notes payload is built on its own schedule. `vvAIStats` emits an `honours` key only when the card has any. **So whether that key is in the payload depends on which network call wins**, and `stats_hash` fingerprints the payload.
- **THE EVIDENCE IS THAT THE STORED ROWS DISAGREE WITH EACH OTHER.** Rebuilding the payload offline and comparing against `notes_cache` matched **16 of 25 WITHOUT honours and 9 of 25 WITH**. **Neither is 25**, which is only possible if some stored rows carry the key and some do not.
- **THE COST IS SPURIOUS REGENERATION AND UNRELIABLE CACHE HITS** , a card whose note was written on the slow path re-generates on the fast one, and vice versa, for ever, at a model call each time. **It is invisible because a regenerated note looks exactly like a cached one.**
- **DO NOT "FIX" IT BY DROPPING HONOURS FROM THE PAYLOAD.** The honours are real signal the prose cites. The fix is to make the notes request WAIT for the honours promise it already has a handle on, so the payload is deterministic , and that write invalidates every cached note once, deliberately, which is the cheaper of the two bills.
- **AND IT IS WHY `scripts/prewarm_notes.js` REFUSES TO SPEND UNTIL ITS PAYLOAD IS PROVEN.** It rebuilds the object for cards that already hold a cached note and compares its `statsHash` against the stored value, because a one-key difference makes every row it writes a **permanent miss** , generated, paid for, never served. That check caught the missing `honours` key, and then caught this race. **A warm script that cannot prove its payload is a way to spend money on rows nothing will ever read.**

### From `CLAUDE.md`

**[THE ORIGINAL CLAIM, FALSE SINCE SOME POINT BEFORE 2026-10-04] `rankings.html` `.gridwrap` is LEFT-ALIGNED with no auto margins** (`max-width:1680px`, `margin:0`), measured at 1920: x84 -> right 1764, leaving **141px dead on the right**. It only READS as centred because 1680 is wide enough that the gap is small. `card.html`'s search overlay was worse at `max-width:1320px` (501px dead) and has now been set to **1680 + `margin-inline:auto`**, so the two surfaces no longer match: card centres, rankings does not.
- **DELIBERATELY NOT FIXED IN rankings.html** , it is a live surface and this is a visual change to the main grid, so it belongs with the Compare/rankings filter redesign rather than a drive-by edit.
- When that stage runs, decide ONE rule for both (centre, or left-align at a shared max-width) and apply it to `.gridwrap` and `#cardSearch` together. Cross-ref the IMPROVEMENTS BATCH filter item in `LAUNCH_STAGE.md`.

### From `CLAUDE.md`

- **[THE ORIGINAL ENTRY, KEPT FOR ITS REASONING] `api/log.js` IS A DEPLOYED PUBLIC ENDPOINT THAT WRITES SESSION-LINKED COMPARISON RECORDS, AND NOTHING ON THE BRANCH CALLS IT ANY MORE (found 2026-08-29, read-only, NOT removed).** It inserts into `comparison_log` , `session_id` plus both player names, both seasons, both scores, the winner and the deciding factor , and into `search_log` (`session_id` + the query). **Grep of every shipping `.html` finds NO caller on this branch**, and the row timestamps agree: last comparison write **2026-06-30**, last search write **2026-06-11**, 43 and 11 rows.
  - **THIS IS THE SAME SHAPE AS `api/search-player.js`, WHICH IS WHY IT IS LOGGED HERE RATHER THAN IGNORED** , an orphaned public write endpoint that outlived its caller. **The difference is that it writes to its own log tables and not to `players`, so it is NOT a corruption path.** What it is, is a session-linked personal-data surface with no product behind it.
  - **DECIDE BEFORE LAUNCH: delete it, or keep it and say so.** Keeping a live endpoint that records what a visitor compared, when no feature reads it, is a privacy surface nobody chose. **Deleting it also drops the deployed function count by one.** Not urgent, not corrupting; a deliberate decision, like the BSD one.

## RELOCATED FROM `CLAUDE.md` §F ON 2026-10-18 (split piece 3a): THE ENTRIES DATED 2026-08-28 TO 2026-10-08, WORD FOR WORD

**Their open items were carried into `CLAUDE.md` §D first, and every rule they say is "in §C" was found in `RULES.md` before the move.**

### 2026-10-08 | Contact's desktop, the email shipped, Resend verified, the save sheet rebuilt, and a load test before the flip

**Commits `8228cb6` to `ce9b29b` plus the drafts.** `git log` is the record; this keeps what it cannot say.

**1. THE LOAD TEST, AND WHAT IT FOUND.** 50 simulated visitors for 62 seconds, 5,196 requests at 83 a second, built from the pages' OWN query builders (`VVSeq.query`, `tokenAndFilter`) and the URLs captured off the live card and rankings pages. **Zero platform errors on 5,037 of them.** Latency under that load: p50 100 to 290 ms per shape, **p95 0.7 to 2.4 s**, the trigram name search the slowest (`rank.search` p95 1.8 s, its head count p95 2.4 s) against about 60 to 550 ms alone. **Two of 288 search counts returned 500 under load** and could not be reproduced in a burst of 40; the page degrades to a null total and still renders rows. **One 503 on the rankings head count was seen on a single real page load** before any test; alone it answers in 240 to 455 ms. The 159 `400`s in the table were MY query, not the platform's: I keyed `split_transfers` on `card_id` and the pages key it on `api_player_id`. **An instrument fault in a load table reads exactly like a platform fault, and the fix is to replay the page's shape, never a guess at it.**
- **THE DUPLICATE-GENERATION RACE IS REAL, MEASURED ON ONE UNCACHED PAIR WITH THREE TABS FIRING THE PAGE'S OWN `vvGenerateVerdict()` WITHIN 1.7 SECONDS.** Tabs A and B BOTH generated (two model calls, 19 and 20 s, two different headlines for the same pair), tab C got **429, "Too many verdicts at once. Press Compare again in a moment."**, and its retry 60 s later came back from cache in 4 s carrying B's prose, the last writer. Ledger: two `verdict` rows and one `refused:concurrent`; `verdict_cache` +1. **So the concurrency limit works and is what three people behind one NAT would meet, and the cost of the race is one duplicated generation per simultaneous first request, not corruption.** A per-pair lock would close it; at this traffic it is not worth a dependency. Cost of the run: two cold verdicts, about $0.08.
- **WHAT COULD NOT BE SIMULATED, STATED:** real browsers in parallel (hidden tabs throttle timers 17x), more than one source address, the 30-an-hour cap (deliberately skipped at $1.10), and uncached notes on card open.

**2. THE OTHER WORK OF THE DAY, ONE LINE EACH.** Contact took the platform frame above 720 with its phone column byte-identical. The launch email was reworked as a brand would, chosen from two, then cut to one with the subject "The doors are open" and three links, the home link written as what the front door is. Resend verified `vvonderxi.com` on two CNAMEs and a DKIM TXT (my predicted MX-plus-SPF was Resend's old scheme and is withdrawn); the inbound MX it also offers was NOT added. The save sheet lost its Google G and its pre-ticked opt-in that wrote to localStorage and was read by nothing, and became a waitlist with three intent sources. The signup confirmation is drafted, one template, one varying sentence. The post-flip queue is written in SS D in order.

**NEXT / OPEN:** Lucas flips. Then the queue: launch send, signup webhook plus confirmation, the dashboard, the lint assertion.

### 2026-10-07 | No card on the worked example, a link under the 92 instead, and the evidence-or-subject rule

**1. THE WORKED EXAMPLE DOES NOT GET MBAPPÉ'S CARD, BY DECISION, AND THE REASON IS NOW A §C RULE.** Costed before anything was built: a second raster and a second drift check, +370px on a 1,072px block at 390 (34%), and a gold Iconic face printing its own 92 beside the walk's gold 92. The deciding argument was none of those: the card would be the walk's SUBJECT, not evidence, and its four chips contradict the closing line that says the score ignores them. Rule in §C, "A CARD ON A PAGE IS EITHER EVIDENCE OR SUBJECT".

**2. WHAT SHIPPED INSTEAD IS THE 92's CAPTION , "Open his card", `card.html?id=158399`.** Every other number in the walk carried a small label and the outcome did not. Measured: 44px tap target, hit-tested at three points in both themes and at 390 and 700; contrast 5.03 dark / 5.97 light; block height 1,072 to 1,113 at 390 and 471 to 500 at desktop, all of it the right column widening to the link's 100px and the left prose re-wrapping.
- **THE ID IS TYPED IN AN href THAT `apply-figures` CANNOT REWRITE, SO THE GENERATOR ASSERTS IT.** `WALK_CARD_ID` sits beside `WALK_NAME` / `WALK_YEAR` in `gen-index-figures.js` and the run throws if the walk's season resolves to a different card. Run with `--write`: passes, and `walk_card_id` is now in the JSON beside its derivation. `apply-figures` reports 0 rewritten.
- **ONE LAYOUT FAULT CAUGHT BY MEASUREMENT, NOT BY EYE: as `inline-block` the link sat BESIDE the 92 on desktop** (gap to the number's bottom read -28px) and under it only at 390, where the column was too narrow for both. `display:block` with `text-align:right` on the column fixed both widths.
- **AND A HARNESS FAULT WORTH ONE LINE: `elementFromPoint` on the link returned the bottom nav**, because `scrollIntoView({block:'end'})` parked the outcome row under the fixed nav. The real page pads the body for the nav; the probe did not scroll past it. **Centre the target in the viewport before hit-testing anything near a fixed bar.**

**NEXT / OPEN:** Lucas flips. Nothing today moved a prompt fingerprint or a database row.

### 2026-10-06 | The Home mark becomes the lockup, and the control for the demo found a dead active tab

**1. THE BOTTOM NAV'S HOME GLYPH IS NOW THE LOCKED TWO-TONE LOCKUP, ON ALL NINE PAGES THAT CARRY THE NAV.** It was two separate stroked Vs with a gap, under 10px tall, and read as two letters. It is now the loader's own two paths, filled, left V on the tab ink and right V on brand pink. Lucas picked it from a rendered demo of four treatments at 390 (`_demo_homemark.html`, untracked). **The avatar shield was refused on measurement, not taste:** the only filled block in a row of outlines, its VV about 7px tall, and it already sits top right on every phone screen pointing at preferences.
- **THE GEOMETRY IS NOW IN TEN PLACES , the shared module and nine pages.** Asserted byte-equal to the module's two constants on the day (9 of 9). **Nothing enforces it afterwards.** A comment beside each copy says to change them together; that is a rule that depends on remembering, and it is recorded here as owed a lint assertion rather than as solved.

**2. IN LIGHT MODE ON A PHONE THE ACTIVE TAB WAS NOT HIGHLIGHTED, ON EVERY PAGE THAT HAS ONE, AND NOBODY HAD REPORTED IT.** `body.light .bn-item` is (0,2,1) and outranked `.bn-item.on` at (0,2,0), so the active tab computed `rgb(95,89,78)`, identical to its neighbours, on rankings, card, compare, playbook and vvindex. Dark was always correct, which is the positive control. Arrived in `5a83528` with the contrast token. Fixed by adding `body.light .bn-item.on` to the same rule; active now reads `rgb(173,3,50)` in light on all five, measured in a 390 frame with `matchMedia` and `innerWidth` asserted.
- **IT IS SS C'S THEME-OVERRIDE RULE RUNNING THE OTHER WAY.** That entry is about a theme override that LOSES to a heavier base rule. Here the theme rule WON, over a state class it was never meant to touch. **Adding `body.light` to a base rule raises it above every unprefixed state rule on the same element**, so a theme fix can silently delete a state. Check `.on`, `.open`, `.active` siblings whenever a `body.light` variant of a base rule is written.
- **AND IT WAS FOUND ONLY BECAUSE THE DEMO WAS MEASURED AGAINST THE LIVE PAGE.** The demo copied the nav rules with `body.light` retargeted to a wrapper class, which lowered the specificity and FIXED the defect inside the demo. A control comparing demo against the real page at 390 disagreed on one colour, and that was the finding. **A demo that retargets a selector has changed its weight** , the same family as a demo supplying its own tokens.
- **IT ALSO CHANGED WHAT THE HOME DECISION MEANT.** With no active tab showing, Home's pink V was the loudest thing in the light row and read as the active tab. The mark was chosen against the row as it now behaves.

**3. TWO STATUS LINES IN THIS FILE WERE STALE AT SESSION START, BOTH IN THE DIRECTION SS D WARNS ABOUT.** The progress bar says the post-split matview refresh is outstanding: `player_card_mv`, `player_card_view` and `player_season_cards` all count **58,066**, the expected figure, so it has run (row counts only; the scores hash was not re-run). And 2026-10-04's NEXT says the three suggested matchups are cold: all three hold rows on the current Path B base with matching rt, and Lucas confirmed them warm on the preview on 2026-10-06.
- **MY OFFLINE STAMP REBUILD FOR THOSE THREE WAS VOID AND IS RECORDED AS VOID.** It returned zero honours for Messi 11/12, so it could not match and proved nothing either way. Third instance of the offline builder missing honours; the page load was the instrument.

**NEXT / OPEN:** Lucas merges and flips. **The Anthropic balance is still the launch risk** , $32.94 recorded on 09-27 before roughly $9 of warming, auto-reload off, and no alert watches a balance. Owed after the flip: a lint assertion tying the nine nav copies to the module's lockup constants.

### 2026-10-04 | A pre-flip pass, and the two biggest findings were both invisible to a disk audit

**Commits `f5d011f` onward.** `git log` is the record; this keeps what it cannot say.

**1. THE FIGURES CHECKER COULD NOT SEE ITS OWN FIGURE.** `apply-figures` matched keys as
`([a-z_]+)`, no digits, so `data-fig="walk_gaw90"` matched nothing and the run printed
**"31 figures, 0 drifted"** while the page published **1.056** against a generated **1.158**.
**Third fault in that one regex**, after the greedy quantifier and the tag anchor, and all
three shrank what it could reach while reporting clean. Rule in SS C.

**2. AND THE COPY AROUND THAT NUMBER PROMISED A SUM IT DOES NOT COMPUTE.** "His goals and
assists become a single number" invites 1.336; `gaw` discounts assists to 0.7 and penalties to
0.78. **The number was right, the sentence was wrong, and the checker could not see either.**

**3. EIGHT COPY DEFECTS, EVERY ONE FOUND BY READING RENDERED PROSE.** The Playbook said a
keeper carries no score and, 4KB later, that every keeper is capped at 75 and the cap is stated
on the card , a sentence Fallback C retired. The VV Index had a clause with no verb, a 97%
with no denominator whose pull line claimed the opposite of the figure above it, 2015/16 on
both sides of its own boundary, and a "them" with no antecedent. **No sweep on this platform
can see any of them**: every page laid out perfectly throughout.

**4. ~1.1 MB OF EAGER THIRD-PARTY HEADSHOTS ON THE DEFAULT RANKINGS VIEW** , 100 images,
mean 22.8 KB, almost all below the fold, **invisible to a disk-based audit because they are
cross-origin.** More than the 1.8 MB the 2026-08-29 page-weight extraction removed, put back
by one surface. Now lazy at the single choke point.
**AND IT WOULD HAVE SHIPPED A BLANK SHARE POSTER:** the capture stage is parked off to the
LEFT rather than hidden, which is exactly the condition under which a lazy image is never
fetched, so `vvSettleImages`' 4s bound would have expired and html2canvas drawn nothing.
Forced eager there rather than at each call site , the state every capture passes through.

**5. THE TIE VERDICT FINDING, AND I RANKED IT WRONG TWICE BEFORE MEASURING IT PROPERLY.**
91% of tie verdicts crown a winner in prose beside a chip reading "The Debate Lives On".
**First I called it a documented non-defect; then the day's first must-fix; it is neither.**
`applyVerdictOutcome` returns early on `tie`, so **no card is ever badged** , control-tested
with `inside` as the positive. Prose only, and the fix is a system-prompt edit that would
discard 655 warm notes, so it is staged rather than applied. Full record in SS C and in
`docs/PROMPT_EDIT_PROPOSED_2026-10-03.md`, whose section 1 was rewritten: it had aimed its fix
at the `inside` state, measured at **0 of 19** failures, and would have missed this entirely.

**6. TWO OF MY OWN FINDINGS WITHDRAWN.** The "unnamed search input" was a false positive , the
inputs are `<label>`-wrapped or carry a placeholder, and my name check read only
`aria-label||title||textContent||placeholder`. And my images pass was **under-measured**: it
loaded pages with no query string, and `rankings.html` persists its view in `localStorage`
where List and Compact ship **zero raster**, so it measured a platform with almost no images.

**NEXT / OPEN:** **The spend cap (QA B4b) is the only thing that bounds the bill** , the global
300/hr ceiling permits **$312/day** against a recorded **$32.94** balance, so the ceiling does
not protect it. All three suggested matchups on compare's empty state are **cold**, and the
verdict cache holds **88** live-hittable pairs. The share poster enlarges a 150px headshot
**3.65x** and no larger source exists , a product call. Nothing today moved a prompt
fingerprint, so no cached row was discarded.

### 2026-09-26/27 | Sitting 3, and three times the instrument was the thing that was wrong

**Commits `5597739` to `23f0db2`.** `git log` is the record; this entry keeps what it cannot say.

**1. THE TWO NOT-SCORED NOTES SHIPPED BEFORE THE RUN, WHICH WAS THE CONDITION.** 44 reduced
cards and ~200 inserted halves must not sit blank waiting for a second pass. `notScoredNote`
in vv-core, two variants, because a card that never had a score and a card that LOST one are
different events. **A contradiction that only rendering found: `partialSeasonNote` asserted
"the figures AND THE SCORE cover that share only" on a card whose score had just been removed,
in the box directly above a note explaining there is no score.** Fixed opt-in, so every
existing caller renders byte-identically. **And the approved copy said "two clubs" where six
of the 202 hold three** , caught by counting the population rather than by reading the note.

**2. SITTING 3 RAN: 181 split, 181 inserted, 20 held, 0 failed.** Full record in SS E.

**3. THE MATVIEW WAS OUT OF STEP AND A CORRECT REFRESH WAS THE CAUSE.** Refreshed 18:12:58;
the canary rollback landed 18:19:58. **Seven minutes.** It photographed a base table that
still held the canary. **The verification that followed read `player_card_view`, which is
computed on READ and therefore always agrees with the base table , the one check that can
never fail.** The drift check in SS C came out of this and has now fired on both sides: 0/true
after the rollback refresh, **and `-181`/false the next morning, which is how we learned the
post-run refresh had not been run at all.**

**4. THE UNIQUE KEY IS FOUR COLUMNS, NOT THREE**, found because the canary's insert succeeded
where the recorded key says it cannot. Four entries marked. **Nothing about the 841 halved
cards is re-scoped on it.**

**5. THREE INSTRUMENT FAULTS, ALL MINE, ALL CAUGHT BEFORE A WRITE.** `league_id` is OUR key
and the canary had the provider's HARDCODED, so the first run held all 197 with "provider now
returns 0 blocks" , **a message that reads as the source having changed rather than as my own
tool being wrong.** 23 Turkish cards carry a null `league_id` and say `TR` where the leagues
table says `TSL`. And the `--limit 1` control is the only reason either was found: **an empty
capture directory was the sole evidence the first run had done nothing.**
**A guard that holds everything looks exactly like caution.**

**6. A NARROW ESCAPE WORTH KEEPING.** I recorded failing to capture a pre-run rt snapshot. The
matview had not been refreshed, so it still HELD that state , dumped to disk, md5 reproduces
(`a918ff3b...`). **A stale matview is a liability for reading and an asset for recovery, and
only until somebody refreshes.**

**NEXT / OPEN:** **The post-run refresh is outstanding**, so the site still serves the pre-split
state , correct and consistent, just old. Run it, then the drift check; expect **58,066 rows**
and `06bf3e41820b92d6b2f4e5fd4c93ea63`. **Six cards unscored by a NULL rather than the floor are
LOGGED AND DEFERRED to after launch by Lucas** , do not patch a zero we cannot prove. **Next
from Claude is item 8, the full audit sweep, and nothing before it**; the preview URL, QA groups
B/C/D, the six punchlist reviews, the comparisons, the spend cap and the old API key are Lucas's.

### 2026-09-19 | A day of claims that had no derivation behind them, and the tools that now supply one

**Routing: `docs/HANDOVER_2026-09-19.md` is the entry point; it REPLACES 09-17 rather than patching it.** 30 commits, `44cd234` to `573df0a` (counted with `git log --oneline 44cd234^..573df0a | wc -l`). `git log` is the record; this entry keeps what the log cannot say.

**1. WHAT CLOSED.** The matview sitting ran (`dce5ed7`): 87 columns, rt md5 unchanged, and **the outage measured for the first time at ~42s**, the indexes being the expensive half. Step 5 is closed on all three items; the rotation was done 2026-08-31 and two documents said otherwise for nineteen days (`272f69c`). BAM is delivered on both halves for the platform's nine leagues and is **0 of 14 on the brief**, and its data is gitignored, so a clone holds manifests and no CSVs.

**2. WHAT SHIPPED.** A14's pixel harness (`_pixel_audit.js`) with `.pspot` 3.89 as its standing control, three pinned-ink defects fixed, `.lgco` recorded unmeasurable with its reason. The compare verdict panel: centred, a fading plate, Fraunces upright at 66 KB, coverage bars below three shared dimensions. `RADAR_POOL_REF` repasted after three stale days. A value stamp on `verdict_cache`. **Item 26** (`573df0a`): a mark under the shield on 477 cards, opt-in, with two conditional notes.

**3. THE PATTERN, AND IT IS ONE PATTERN: EVERY WRONG CLAIM TODAY WAS A NUMBER OR A STATUS WITH NO DERIVATION BEHIND IT.** The punchlist read 15 of 25 against 35 rows; a README said "generated" with no generator; a plan line said Step 5 was open after it closed; my own correction of that line read C7 and not C5 and repeated the error; I quoted "94 of 108" for a set of 94. **Each was fixed by attaching a derivation** , the awk in the punchlist header, `gen-readme.js`, the QA item cited by letter, a count re-run before writing. The failure shapes are written out in the handover SS "failure shapes"; the one to carry forward is that a status line which is not re-derived when its subject changes becomes an instruction to redo finished work.

**4. INSTRUMENT FAULTS, MINE:** an impact check compared OLD with OLD because the snapshot was not exported (caught by a control asserting the two blocks differ); a real click aimed before any screenshot had fixed the coordinate frame landed on the card face and reported a flip; a capture on a hidden tab timed out the evaluator and had nevertheless finished. **Each was caught by a control that had to change, which is the only reason the second reading was trusted.**

**NEXT / OPEN:** Lucas: item 26 on `/card.html?id=131548` [CORRECTED 2026-10-04 , it read 134303, and that card no longer carries the mark: the squad-number backfill sourced West Ham's own table for it, so it is `squadnum` #23 now and correctly unflagged], the old API-Football key being dead (C5's open half), B4b's spend cap, the Eredivisie overlap, the Vercel flip. Mine: punchlist 36 (the BAM club-name check reads false on 93 of 94 completed seasons; six with real unplayed names unexamined), `.pghint` and the continental chip glyphs as demos, and whether the story and scout prose take Fraunces. **Item 25 stays gated.**

### 2026-09-15 | The most-audited file on the platform was an open Anthropic proxy

**1. THE ENDPOINT TOOK `messages`, `system` AND `max_tokens` FROM THE REQUEST BODY AND SENT THEM
TO ANTHROPIC ON OUR KEY**, with `Access-Control-Allow-Origin: *`, no auth and no rate limit. **The
caller chose what each call cost.** Not a broken code path , every line did what it said , which
is why no behavioural sweep found it. **It survived because every prior review asked whether the
file WORKED**: the cache stamps, the A/B swap, the winner check and the prompt splice were all
audited hard and repeatedly, and every one is a question about correctness for a caller we trust.
**Nobody asked what an untrusted caller could do with the same three fields.** A file can be the
most-audited on the platform and unexamined in one direction.
Now bounded (2048 output tokens, 120k input chars, message shape), behind an **origin allowlist**
built from the FOUR domains read off the Vercel project plus a wildcard for Vercel's GENERATED
branch URLs, which are not in the domain list at all , and behind a **rate limit**, 30 new
generations per hour per IP and 2 concurrent, on one Supabase table rather than a new vendor.
**Each states its own limit in the code**: the allowlist stops another WEBSITE, not a script;
the limiter stops one ADDRESS, not a pool; and the cache is doing most of the defence, since the
check runs after the cache lookup so nothing repeated is ever billed.

**2. A CACHE VERSION COULD DESCRIBE A PROMPT THAT DID NOT WRITE IT , THE SAME SHAPE AS THE PATH B
SPLICE.** `customSystem` overrode the prompt while the stamp was picked from the `judge` FLAG, so
a row could be written by a prompt nobody has seen and stamped as ours, then served to every later
visitor for that pair. Fixed by fingerprinting the function's RETURN VALUE, so the two cannot
disagree by construction. **Zero rows regenerate , all three versions byte-identical, asserted.**
`VERDICT_VERSION_JUDGE` is now exported: there are THREE prompts and the module announced two.

**3. ITEM 25 IS WITHDRAWN AND MUST BE RETAKEN FROM SCRATCH.** The verdict figures were taken over
"every row on a v3 prompt", which spans **FIVE prompt bases including Path B** , a mixture with
no named composition. The NOTES figures survive that (notes versions carry no payloadRev, so an
exact match IS a base match) **but fall for a better reason: the pre-edit baseline MOVED, 1.08 to
1.30, as its own population kept filling.** So 1.08-to-0.88 read flat and 1.30-to-0.88 is a DROP
of 0.42 , the edit may have made marking WORSE. **1.53 pooled SEs, under the 1.96 bar, so it is a
signed direction at a sample size that cannot carry a verdict.** The gate is now explicit: both
bases must stop moving, and the current Path A prompt has ZERO rows.

**4. THE BASELINE ERROR, THREE TIMES IN ONE DAY, AND THE REPETITION IS THE FINDING.** The stale
0.43 measured a cache mid-refill; the 1.08 measured a base still filling; the cache-health counts
measured a population half of which could never participate (194 of 366 notes rows were orphans
that the read path treats as a MISS). **Each time the number was right about the rows it saw and
wrong about what those rows were.** Before quoting any figure over a cache, ask what fraction of
the denominator is ELIGIBLE to be counted, not merely what fraction has arrived.

**5. THE DEPLOYED SURFACE IS ONE FUNCTION.** `api/log.js` was already gone (SS E described it as
live, and the same entry's BSD claim was stale too). `api/get-seasons.js` was deleted , and it had
**no caller in any `.html` in the entire history of any branch**, so it was stillborn rather than
orphaned. It was fixed hours before it was deleted and **both the record and the migration README
say so**, because a later reader finding `034b91e` must not conclude it was in use. It had been
asserting a recorded **0** for assists on **31,040 rows, 54.8% of the database**, from a
machine-readable endpoint.

**6. FIVE UNDEFINED CSS VARIABLES, ALL LIVE, AND `var(--ink)` ALREADY HAD ITS OWN RULE HERE.**
Rankings' visible "Filters" button carried THREE on one rule , measured live as
`background: rgba(0,0,0,0)` and `border: 0px none`, so the pill had no background and no border.
**A per-file scan reported 22 and the real count is 5** , `vv-core` consumes tokens the PAGES
define, the same shape as the dead-export scan that accused `VVSeq` , and one flag was PROSE, the
comment about this exact trap.

**7. DATA REMOVED, ALL CAPTURED AND VERIFIED FIRST:** 194 orphan notes rows, and the
`comparison_log` / `search_log` tables, whose 43 pairings across 33 sessions now live in
`migrations/orphan_endpoints_2026-09-15/`. Both verified by a read-back that ERRORS rather than
returning empty, since an empty read cannot tell "dropped" from "unreadable".

**INSTRUMENT FAULTS, ALL MINE:** replacing `global.fetch` made the limiter's own ledger reads hang
on the same latch as the model call (supabase-js uses fetch); latching two calls while keeping one
resolver, where a never-resolved promise is not an open handle so node exited silently reporting
success; `grep -c` counting LINES not occurrences, which made a correct doc look stale; and
**`pkill -f <pattern>` matching the shell running it, twice.**

**NEXT / OPEN:** **`docs/MERGE_READINESS_2026-09-15.md` leads with the thing this repo would
otherwise mislead a reader about , none of today's protections are live, because production
tracks `coming-soon`.** The one gap with a cost attached is **distributed abuse**, which nothing
in the code can see: **QA_PASS B4b**, five minutes in the Anthropic console, cap $100 and alerts
at $20 and $50, derived from a cached verdict at $0.018 and legitimate use at $4 a month.
**QA A14, the platform contrast re-run, is the only sweep left and is deliberately its own
session.** Item 26's SITTING.sql, item 22's PDF, item 25's measurement and the blank-shield
question are all Lucas's.

### 2026-09-12 | The assists honour was a maximum over three cards, and the fix was deletion

**1. `top_assists` WAS COMPUTED FROM A COLUMN THAT IS 99%+ NULL BEFORE 2015, AND EVERY INTERNAL
CHECK PASSED IT.** Van Persie held the PL 2011/12 assists honour on **9**, the maximum of **three**
populated cards in a **390-card** league-season. **Eleven rows deleted**, rollback captures in
`migrations/top_assists_sparse_2026-09-12/`. The write path (`top_assists_write.js`) lost its
`MIN = 9` floor for a **`MIN_COVERAGE = 0.25`** gate, stopped reading null as zero, and now carries
every tied player rather than one. `honours` ends at **624**, `top_assists` at **113 of 144**.

**2. THE FINDING WITH THE LONGEST REACH , A FILL PRIORITISED BY PROMINENCE MAKES EVERY COMPUTED
EXTREMUM LOOK CORRECT.** The pre-2015 assists that DO exist were filled for marquee cards only ,
**117 cards, median rt 88, 89.7% at rt >= 85, against a population median of 42.** So the maximum
over the populated set was a star **by construction**, and the false honours landed on Messi, Van
Persie, Suarez, Giroud and Nene. **A sparse maximum over a random sample looks obviously wrong and
gets caught. Over a sample selected for fame it looks exactly like the right answer**, which is why
this survived from July to September. **This applies to any selective fill of any field.**

**3. THE ASSISTS BACKFILL IS CLOSED PERMANENTLY, ON ONE STRUCTURAL FACT: THE PERCENTILE POOLS CARRY
NO `season_year`.** Eleven `PARTITION BY` clauses in the live view, not one of them partitioning by
season. **So every pool mixes 2010 with 2025 and ANY era-bounded fill is a PARTIAL fill of every
pool** , measured at **3.1x to 8.3x worse per card than a complete one**, with the same imputed
value giving a median gain of 0 under a full fill and **+7** under the narrowed variant. Real scope
is **31,040 cards across 2,422 of 2,740 club-seasons, 88% of the database.** Both narrowed variants
rejected. **Do not re-propose a subset.**
**[SCOPE CORRECTED 2026-09-16, AND THE STRUCTURAL ARGUMENT SURVIVES WHILE THE FIGURE DOES NOT.]**
**The 31,040 counts every NULL assist as a gap. 11,015 of them are KNOWN ZEROS** , the importer
wrote a zero-assist season as NULL until 2023, see SS E. **The genuine gap is 20,025 cards, and
only 3,661 of those are 2015 or later; 16,364 are pre-2015.** So the recorded scope overstates
the absence by **35.5%**. **WHAT STILL HOLDS: the partitioning fact.** The pools carry no
`season_year`, so an era-bounded fill is still a partial fill of every pool, and that reasoning
is untouched by what the nulls mean. **WHAT DOES NOT: any argument that rests on the SIZE of the
gap**, including the sense that the 2015+ era is substantially unfilled , it is 3,661 cards, not
tens of thousands.

**4. "WHO WON THE ASSIST CROWN" IS NOT A SINGLE FACT INDEPENDENT OF WHO IS COUNTING, AND THAT IS
WHAT CLOSED PHASE 2 , NOT THE 71% HOLD RATE.** Transfermarkt is **equal or higher than the official
record on 5 of 5** disagreements, never lower; a recording error scatters both ways and this does
not. **And the rule cannot be NAMED**, which is worse than an alternative definition: Transfermarkt
publishes none anywhere reachable, and its own guide explains why , assists are entered per match
by **volunteer scouts** and aggregated automatically. **There is no offset to apply because there is
no rule.** Late in the session a **second provider showed the same signature**: worldfootball gives
Gerrard 14 / Suarez 13 on PL 2013/14 against the official 13 / 12, **+1 on both, a level shift not
a re-ordering.** Two providers agreeing with each other and disagreeing with the official record in
one direction are **NOT two independent reads**. **DO NOT apply a -1 correction** , LL 2010/11 is
+3. **This scope does NOT leak into shirt numbers or positions**, which are roster facts with one
answer; an assist is a judgement about who touched the ball before a goal.

**5. FOUR ROWS WERE SOURCED AND WRITTEN, FROM TWO RUNS, AND THE AUDIT WAS WORTH MORE THAN THE ROWS.**
Phase 1 wrote 2 of 7 (**71% hold rate**); a 45-row external report yielded **2 more from 11 nominal
CONFIRMEDs**. All four carry `source = sourced_leader_only_verified`. The three things that killed
the rest, in order of cost:
- **CARD RESOLUTION IS A PRECONDITION, NOT A FINAL CHECK.** Named and verified: **Nani PL 2010/11,
  Juan Mata PL 2012/13, Hakim Ziyech ERE 2014/15 have NO CARD.** **The 300-minute importer floor
  explains none of the three** , their squads carry 14 to 21 cards down to **313 minutes**, and
  each of the three played far more than players who did get one. They are **source-absent
  individuals**, the Rooney/Gerrard class, and a re-ingest will not recover them. A league-season
  whose leader has no card is **CLOSED, not held**.
- **ONE LINEAGE WEARING TWO NAMES.** The confirmation bar is **lineage, not source count**.
  **AN AWARD NAMED FOR A METRIC IS NOT THE METRIC** , the report cited the PL Playmaker award as
  evidence for the assists TABLE. The award IS given for most assists, which is exactly why the
  conflation is invisible, but it is adjudicated from one provider's count, so award-plus-archive
  is one reading twice. **Golden Boot is not the goals table.**
- **A `CONFIRMED` LABEL CONTRADICTED BY THE ROW'S OWN NOTES.** The evidence governs, not the column.

**6. A REFRESH RUN FOR ONE JOB LANDS EVERY PENDING WRITE, AND NOTHING ANNOUNCES IT.** The refreshes
run for the honours work carried the **eight 25/26 position corrections** with them , they had been
recorded as pending in two documents and are now **live, 8 of 8 verified**. The owed diff is done:
**113 rt movers (predicted 116), 6 band crossings (predicted 6), median |delta| 1, max 3.**
**`pool_change_sim.js` is trustworthy on COUNTS and not on NAMES** , it got all four RECLASSIFIED
crossings exactly right by card and value, and named the wrong two UNTOUCHED ripple cards (predicted
Vardy 16/17 and Alcacer 18/19; actual **Perisic 16/17 and Lacazette 23/24**, all four 84 -> 85).
Which of several tied neighbours re-ranks is not stable. **Same shape as SS C's CDM rule: predict
the direction, never the number, and for a ripple, never the card.**

**INSTRUMENTS THAT LIED, FOUR IN ONE DAY, EACH CAUGHT BY A CONTROL:** `range()` pagination **without
`ORDER BY`** reported 49.5% of club-seasons carrying a duplicate name against a real **0.10%**;
`scrollWidth` reported "fits" for wrapping text, returning **63 for four strings of different
length** (`Range.getClientRects()` is correct); an SPA returned **200 for a path it redirects away
from**, which would have recorded Van Persie's 30 GOALS as an assists total; and reading a
Transfermarkt column **by position** gave Drogba 33 assists and turned Silva's AGE into his assist
count (fixed by keying on the `vorlagen` sort key and reading direct children). **Also: I audited
the read-only staging twin instead of the write path and claimed 19 players held no honour they had
earned. False , `top_assists_write.js` already writes every tied player.** An audit of the twin is
not an audit of the write path.

**7. TWO DIFFERENT QUANTITIES BOTH CAME OUT AS 113 TODAY AND I CONFLATED THEM IN A HANDOVER LINE.
THE COINCIDENCE IS THE WARNING.** **113 cards carry `h_top_assists`** after the honours writes, and
**113 cards moved rt** from the POSITION batch measured against `before.json`. They share nothing
but the number. **Honours are DISPLAY-ONLY and cannot move a score** , read off a fresh
`pg_get_viewdef` (17,766 chars): `rt_new` is fully computed by line 156, the `hon_rows` and `hon`
CTEs begin after it, and `hon` is consumed only by a `LEFT JOIN` feeding `honours_json` and the
seven `h_*` flags. **Zero honours references appear anywhere before `rt_new` is defined.**
**So today's honour writes moved ZERO scores**, and a NEXT line reading "113 cards' rt has moved"
as a reason to regenerate was wrong twice over , wrong about the cause, and wrong that anything
was owed. **When two figures match, check they are the same QUANTITY before reasoning from the
match** , the same family as SS C's two-fields-for-one-concept rule.

**NEXT / OPEN:** **NO REGENERATION IS OWED, AND THIS LINE PREVIOUSLY SAID THE OPPOSITE.**
`RADAR_POOL_REF` and the margin table were regenerated after the MORNING refresh, in **`4a9c502`**
(11:01), which also bumped the `?v=` token on all five shipping surfaces. **Nothing has moved rt
since**, verified three ways: `RADAR_POOL_REF` regenerated into `/tmp` is **BYTE-IDENTICAL** to the
committed block (5,154 chars both sides, built from per-90 rates over 25,901 cards, so any write to
goals, assists, minutes or pools would have moved a breakpoint); the viewdef proof above; and
**zero rows written to `player_season_cards` or `player_positions` today**, with
`write_assists_ccc.js` reporting `filled 0 / already-had 28`. **Re-run them when something actually
moves rt, not on a schedule.** **Squad numbers (variant
A) is BLOCKED on one unanswered product question and Lucas has said to stop asking** , the blank
shield decision; he will bring it. The `top_assists` sourcing job has **33 of 46 league-seasons
left** and its spec now carries a SS 0 and a SS 10 that did not exist this morning; **commission
card resolution FIRST on any next external pass** , roughly a fifth of the Fable report's effort
went into seasons that could never have produced a row.

### 2026-09-05 | The radar was one denominator for eight pools, and the doc named the wrong axes

**1. SCALING IS NOW PERCENTILE WITHIN POSITION POOL.** The four fixed `RADAR_REF` constants
served all eight pools at once, so an axis central to one position and irrelevant to another
was divided by the same number. **Measured over all 57,055 cards: goalThreat had a median of
6 for CB and 40 for ST on that one denominator**, while defensive ran the other way, 41 to 21.
No value of a shared constant could have fixed either , it moves both together. After:
**CB 48 / ST 46**, every pool near 50 on every axis by construction. Radars with at most two
axes reaching 25/100 fell **10,395 (28.9% of rendered) to 8,625 (24.6%)**.

**2. THE REMAINING 24.6% IS NOT THE SAME DEFECT AND MUST NOT BE DRIVEN TO ZERO.** 2,930 of
them (34%) measure only three axes, so three strong axes are impossible by construction ,
that is the NR rule working. The other **5,695 (16.3% of rendered) genuinely sit low across
four or five measured axes**, and in a percentile system a below-average season is SUPPOSED
to draw small. Re-inflating this number means re-inflating the scale.

**3. `RADAR_POOL_REF` IS AN EMBEDDED SNAPSHOT AND NOTHING WARNS YOU WHEN IT GOES STALE.**
**`scripts/gen-radar-ref.js` regenerates it** , 21 breakpoints per axis per pool, built from
25,901 cards of 900+ minutes. **REGENERATE IT AFTER THE TRANSFER-HALVES REPAIR AND AFTER ANY
POSITION BACKFILL**, both of which are queued: the repair moves 968 material cards' per-90
rates in BOTH directions, and a backfill moves cards between pools, which changes the
distribution they are scored against AND the one they leave.
**[2026-09-15: ALL THREE SNAPSHOTS NOW HAVE A GENERATOR, AND THE KEEPER LADDER'S WAS THE ONE MISSING.]** `RADAR_POOL_REF` has had `gen-radar-ref.js` since it shipped and the index figures got `gen-index-figures.js` at item 24, but **`KEEPER_SAVE_LADDER` had none** , checking it for drift meant reconstructing the three gates out of `keeperScore` by hand and reimplementing the percentile, which is exactly the check that never gets run. **A hazard documented for three things and checkable for two is documented for two.** `scripts/gen-keeper-ladder.js` closes it, **reads the gates out of `vv-core.js` rather than retyping them** (so a moved gate cannot produce phantom drift), and reports against a 0.005 bar , half a point of save percentage, below which the difference is percentile interpolation rather than the population moving.
- **BOTH WERE VERIFIED CURRENT ON 2026-09-15, AFTER A DAY THAT WROTE 7,928 SHIRT NUMBERS AND 180 HONOURS.** `RADAR_POOL_REF` regenerated BYTE-IDENTICAL, 5,174 chars both sides. The keeper pool is still exactly **n=1,920** with **max drift 0.0003**. Unchanged is the correct answer , both writes are display data , and it demonstrates the backfill's rt-neutrality independently of the 22 spot diffs.

**THIS IS THE SECOND SNAPSHOT OF ITS KIND ON THE PLATFORM. `KEEPER_SAVE_LADDER` IS THE
FIRST, AND IT CARRIES THE IDENTICAL HAZARD.** Two is a class, not a coincidence , when a
future session runs a population-moving write, BOTH have to be regenerated in that pass, and
neither will complain if they are not.
**THE SEMANTICS ARE FRACTION STRICTLY BELOW, WHICH IS WHAT POSTGRES `percent_rank` RETURNS**,
chosen so the eventual swap to real matview columns moves nobody's radar. Mid-rank would have
shifted every card on the day the columns landed and read as a regression.

**4. A LIVE COMPARE DEFECT, FIXED IN THE SAME PASS: 966 KEEPER CARDS DREW AN OUTFIELD RADAR.**
`card.html` always swapped in the keeper panel; **`compare.html` never gated on position at
all**, and `vvComputeSpokes` only asks that both sides measured an axis. GK pool medians say
what it looked like: goalThreat 0, creation 3, defensive 2. **Percentile scaling would have
made this worse**, turning a visibly empty chart into a confident one built out of nothing.
The gate is now in `radarFor` itself so every surface inherits it, and **`raw` goes null too,
not just `scaled`, because `raw` is what the AI prompt cites.**

**5. THREE SURFACES CARRIED COPY THE CHANGE MADE FALSE, AND ONLY ONE SELF-HEALED.**
`card.html`'s note was gated on `radar.provisional` and went blank on its own.
**`compare.html`'s was set UNCONDITIONALLY, so it would have told visitors the dimensions are
"not percentiles" on the day they became percentiles** , nothing would ever have switched it
off. `playbook.html` asserted in prose that the caps were still provisional. **A scaling
change is a COPY change, and the copy does not track the code.** Compare also gained the
sentence that case needs: each card is scored against its own pool, so a centre-back and a
striker can both show a full defensive spoke without contradiction.

**6. §C AND §D HAD THE SYMPTOM BACKWARDS FOR MONTHS.** They recorded *"Creation, Progression
and Defensive read ~0"*. Measured, those were the **healthiest** axes at 40, 36 and 38;
**goalThreat, at 13, was the collapsed one.** A session acting on that entry would have gone
to fix the three axes that were working. Both entries corrected, and §D CLOSED rather than
only corrected , left as `[OPEN]` it would have sent the next session to rebuild shipped work.

**VERIFIED, RENDERED AND MEASURED:** the live card note reads "Each dimension is a percentile
against other ST seasons we can measure, not an absolute rate" (§C's copy trap forbids "in
the league", and it does not say it). `node --check` plus a require-and-assert-export on
vv-core; `lint-inline` clean. **The highest-risk failure is the two `poolKeyFor` copies
diverging, so it was tested directly: 0 differences across all 57,055 rows, and a planted
divergence produced 856**, so the harness can see drift. Token bumped to `20260905k` on all
five shipping surfaces, found by `grep -l` rather than the count written in the rule.

**NEXT / OPEN:** **The three unused denominators are deliberately NOT done.** `shots_total`,
`dribbles_attempts` and `duels_total` are on the matview and well populated 2015+ (87.7% /
89.2% / 93.3%), so the radar plots successes as rates and **never accuracy**. Adding them
changes what the five dimensions MEAN , Playbook copy, the AI prompt payload, and every
cached verdict, since the version is a fingerprint of the prompt. **`passes_accuracy` is the
fourth and is NOT usable**, see §E. Ruled a separate decision, with the numbers already
measured. **The Proof percentile columns still need the shared matview sitting; the radar no
longer waits on them.**

### 2026-09-01 | The truncation limit was measured, and it does not exist

**1. THE "150k TRUNCATION LIMIT" IS NOT REAL. THE CAP IS 4 MiB AND THE BEHAVIOUR IS SKIP, NOT
TRUNCATE.** Read from the Claude Code binary's own memory loader: `Rce = 4194304`, with
`[CLAUDE.md] skipping <path>: not a regular file or exceeds 4194304 byte limit`. **This file is at
3.3% of it.** Corroborated empirically , at 143,645 bytes it reached the model complete.
**SUPERSEDES the 2026-08-31 NEXT line below, which says this file is at ~97% of a 150k limit and
"1.4 KB from silent truncation". That was true of a number nobody had checked and false of the
software.** The real pressure is the performance advisory, whose floor is 40,000 chars, and this
file has been over that since long before anyone started counting. Rule at the top of this file;
method and provenance in `DOC_MAINTENANCE.md`.

**2. NINE RELIEF PASSES, AN ESCALATION TO "BINDING CONSTRAINT" AND ONE RULING COMPRESSED MID-WRITE
ALL RAN AGAINST A PHANTOM.** The 150k entered on 2026-08-03 by calling 133,449 bytes "88%" , the
percentage was assumed and the limit back-derived. **§C already says an unverified premise is most
costly when it argues for REMOVING something. It argued for removals for a month; the check cost
one session.**

**3. THE CARD FACE NOW CLEARS AA EVERYWHERE, and the defect that started it was invisible to the
old survey.** The sub-line sat at **1.90 in dark mode on every plain card on every surface** because
`var(--ink-soft)` flips and the card face does not. Fixed with pinned literals on all three faces
plus a `max(11.5px, ...)` floor; the iconic pink V is an ACCEPTED exception (no pink clears 4.5 on
gold). **The 2026-08-23 contrast survey is VOID** , the re-run found FOUR instrument faults, three
producing false failures and one, grounding a self-painting element against its parent, producing
false PASSES. A fifth (the theme not actually applying) is fixed by asserting it after the wait.

**4. COMPARE IS TWO-UP ON A PHONE and the picker is a fixed sheet.** Slot B went from 0 pixels
visible to fully above the fold; page height 2190 -> 844. The empty state carries three suggested
matchups, each resolved against live rows and dropped if either side misses , which caught a pair
that cannot exist (Henry 03/04, before the 2010 dataset) and one whose diacritic an ilike misses.

**NEXT / OPEN:** **The pre-merge queue is empty.** Remaining survey failures are accepted
exceptions only. **The four structural shapes for this file stand as a judgement call, not a
deadline** , the strongest is now retiring rules into tooling, because it reduces what must be READ
each session, which is the cost that actually exists.

### 2026-08-31 | Four share-poster items, and the squad number was shipping in Times

**1. THE SQUAD NUMBER RENDERED SERIF IN EVERY SHARED IMAGE AND THE LIVE CARD WAS NEVER WRONG.**
A webfont does not load inside a captured SVG. Rule in §C, full measurement and method in
`SILENT_FAILURES.md`. Fixed with `VVCore.vvShimShieldNumbers`, the third capture-time shim.

**2. THE POSTER'S BOTTOM-LINE WORDMARK MATCHES THE LOGO ASSET** , the two-tone rule was scoped to
`.sf-cap`, so `.sf-tag` drew its second V in `currentColor` and one image showed the mark two ways.
Scoped to `.sf-vv2` itself now, so a third placement cannot regress it.

**3. THE CORNER MARK IS THE REAL ASSET AND THE FALLBACK IS NOW WIRED.** `shBrandText` was described
as "not dead code" while nothing called it , the same unearned claim this file keeps recording. It
is an `onerror` fallback now, tested by taking the asset off the server, and `vvSettleImages` waits
for the image so it runs BEFORE html2canvas clones the DOM. Verified warm and cold, both grounds.

**4. THE FRAME IS NOT CLIPPING THE CAPTION , MEASURED IN THE PNG, ALL FOUR FORMATS.** Clearance
below the tagline: **x 25.9, igf 41.3, igs 41.3, dl 38.5**, and zero bright pixels below the
tagline box. A clipped bottom line on X is X's compose preview, downstream of us. **Any 16:9 crop
of the 4:5 igf frame keeps y 371 to 979 while the caption starts at 1189 , it removes the WHOLE
bottom block, not one line.**

**INSTRUMENT FAULT WORTH KEEPING: monkey-patching an exported `VVCore.*` function does NOT reach
`vvRenderShareImage`, which calls the module-local binding.** Two negative controls came back
byte-identical to the positive case and only the identical byte count showed it. **To break a
module-internal path, break the input on disk, not the export.** (The other fault, SVG `<style>`
being document-scoped, is in `SILENT_FAILURES.md`.)

**VERIFIED:** DOM restored byte-for-byte after eight consecutive captures; `vvAuditCaptureSupport`
still reports only the accepted shield `drop-shadow`, so no new divergence (QA A6, now five).

**NEXT / OPEN:** **`CLAUDE.md` IS AT ~97% OF THE 150k TRUNCATION LIMIT, PAST ITS OWN 90% TRIGGER
AND THE HIGHEST IT HAS BEEN** , it was already at 95.8% before this session's rule and log entry.
Truncation is silent and this file is read first every session. **`CLAUDE_ARCHIVE.md` is at 83% and
cannot absorb much, so the next pass needs its destination decided BEFORE it starts.** Archiving
the two older §F entries buys only 7.6 KB and spends the archive's last headroom; §F is 7% of the
file, so it cannot pay. This is the most urgent doc-side item.

## RELOCATED FROM `CLAUDE.md` §D ON 2026-10-18 (split piece 3b): CLOSED, WORD FOR WORD

### [CLOSED 2026-10-04 , IT WAS ALREADY FIXED AND THIS ENTRY SENT A SESSION TO DO IT AGAIN.] CONTENT-COLUMN CENTRING
**`rankings.html:128` reads `.gridwrap{padding:30px 48px 60px;width:100%;max-width:1680px;margin-inline:auto}` , the auto margin this entry says is absent has been there for some time.** Measured on the rendered page at **1920**: `.gridwrap` spans 155..1835 inside a canvas of 84..1905, so **margin-left and margin-right both compute to 70.5px and it is centred** (71px clear either side, asserted rather than eyeballed). At 1440 the margins compute to 0 because the container is narrower than the 1680 cap, so there is nothing to distribute , which is correct, and is why a reading taken only at 1440 looks like the old defect.
- **THE COST WAS A FULL ROUND TRIP: it was quoted to Lucas as a one-line quick win, approved, and then found done.** Same shape SS D keeps producing , the plan line was not updated when the work closed, so it became an instruction to redo finished work. **Third instance in two days**, after Step 5's three items and the wait state directly below.
- **AND THE MEASUREMENT IS THE LESSON, NOT THE FIX: `margin-inline:auto` RESOLVING TO 0px IS NOT EVIDENCE IT IS MISSING.** An auto margin distributes only the space a `max-width` leaves over. **Read it at a width where the cap actually binds**, or the correct code reads exactly like the bug.
- **BOTH SURFACES NOW CENTRE THE SAME WAY:** `card.html` `#cardSearch` is also `max-width:1680px;margin-inline:auto` (read 2026-10-18). The original left-aligned claim is in `CLAUDE_ARCHIVE.md`, "RETIRED CLAIMS" (2026-10-18).
