# VVonderXI , ARCHIVED SESSION LOG, JULY 2026 (part 1)

**THIS FILE IS NOT AUTHORITATIVE. `CLAUDE.md` IS THE MASTER SOURCE OF TRUTH.** If anything here conflicts with CLAUDE.md, CLAUDE.md wins.

**Do NOT read this file at session start.** It is the oldest third of the session log, split out on 2026-08-11 when `CLAUDE_ARCHIVE.md` reached 87% of the 150k truncation limit and could not absorb the entries being relocated out of CLAUDE.md. Everything load-bearing was promoted into CLAUDE.md §C/§D/§E during the earlier archive passes; nothing here is needed to resume work.

**Contents:** 34 entries, 2026-07-28 back to 2026-07-03. Preserved byte-identical , append-only discipline applies, never rewrite a past entry.

**Newer entries live in `CLAUDE_ARCHIVE.md` (August 2026).**

---

### 2026-07-28 | Cream-on-light contrast blind spot + Compare trajectory Option 2 + redesign logged as its own sitting

**Front-end only, no DB. Commits ccdce6c, 107cf82, 6892c55, ff5ff12, 47eadc4 on `redesign-compare` (NOT pushed). Written retroactively 2026-07-29 during the CLAUDE.md archive split , this session and 07-27 had logged into §D but never got a §F entry.**
- **CREAM-ON-LIGHT PROSE , the contrast sweep's blind spot (ccdce6c).** The 07-27 grep sweep missed an entire CLASS: prose set to `color:var(--cream)` / `rgba(243,237,224,α)` / `#F3EDE0` whose CONTAINER picked up a light-mode `background:rgba(255,255,255,0.6)` during the green sweep, but whose TEXT never got a `body.light` override (`--cream` is never redefined in light mode). Rendered CR ~1.04-1.08 , cream on white, effectively invisible. **The audit tool missed it because it EXCLUDED cream/rgba-cream as "dark-mode text"** , the exclusion was the bug. Fixed with `body.light{color:#3a352e}` (the PRIMARY body tone, not the muted secondary tone , these are primary reading prose): card `.tagrow .td`/`.tmore` (Wonder Tag descriptions), `.narrative .np` (Commentator's Notes), `.darkbox .q` (Scout quote); shared `.tagrow` on compare; playbook `.tagdef .drury`/`.open`, `.pctbox .t`/`.b`, `.vvband-story`. Rendered 1.06 -> 11.06. **VV Index was NOT affected , it already had the overrides, the page doing it right.** AUDIT PATCHED to catch the class going forward (resolve the container's light bg, composite the cream text over it, flag <4.5; excludes pills with their own bg + `.gen`/`.iconic` dark card faces): 9 genuine catches pre-fix -> 0 post-fix. Residual tool limitation: standalone-class children like `.vvband-story` need DOM ancestry static CSS cannot trace, caught by hand.
- **COMPARE TRAJECTORY G/A CLARITY , Option 2 SHIPPED (6892c55), closing §D Tier-3 item 5.** The dual trajectory was built for the old dark-green panel and read badly on the now-light verdict panel. (a) BARS: 2px gap between pink (goals) and gold (assists) so the stack reads as two blocks not a striped smear, widened `min(38,slot*0.5)` -> `min(44,slot*0.6)`. (b) Removed the dark-green `#0A2A18` total halo , a green-panel leftover and the single biggest noise source; season total is now a clean number above the bar. (c) VV line/dots/peak were cream/gold (`#F0EAD9`/`#E8B84B`), invisible on the light panel , added compare-scoped `body.light #vtraj` overrides (line/dots `#2a2620`, peak `#7a5c12`). **Card untouched** (it uses `#trajHost` on the green `.tjbox`; zero `#vtraj`). (d) Peak label de-collided from the season total (`min(dot,barTop)-18`, always above both). (e) COPY: compare caption "what he did / it was worth" -> "what they did / they were worth" (two players); the card's singular is correct and stays.
  - **CORRECTION to §D Tier-3 item 5's premise:** it said to check `drawTrajectory` as "a SEPARATE renderer, untouched by the Option A `renderTrajectory` restructure". The fix landed in the SHARED `VVCore.renderTrajectory`; player names were already wired (drawTrajectory receives `CMP_A/CMP_B.surname`). Any future trajectory change must be verified on BOTH surfaces.
- **COMPARE VISUAL REDESIGN logged as a deferred DESIGN SITTING, not a fix (107cf82).** Page reads stale/flat, too much white, too one-colour. Demo-driven, **show mockups before any code**, three directions safest -> boldest: tonal depth + verdict-as-hero / brand palette doing layout work / "Under the Lights" floodlit backdrop (Lucas already liked it on mobile). Kept deliberately SEPARATE from the scoped Tier-3 fixes.
- **TRAJECTORY OPTION 3 logged to that redesign session (ff5ff12).** Split the plot , bars own the lower ~70%, the VV score becomes a slim sparkline strip in the top ~25% with its own mini-axis so the line never crosses the bars. Best read of the VV-vs-output story but needs vertical room only a redesign allows; optionally combined with grouped side-by-side bars.
- **RESUME ITEM captured (47eadc4):** what a comparison actually persists to Supabase , read-only questions in §D "VERIFY ON RETURN". Expected answer: `verdict_cache` is a CONTENT cache keyed by card-pair with NO user identity; `saved_verdicts` does not exist yet.
- NEXT: §D Tier-3 remainder (glance full name + field reorder, VV Index league-weight disclosure, nav swap, iwonder real-example, playbook tag crop) then hygiene + merge.

### 2026-07-27 | PRE-LAUNCH QUEUE logged + all three Tier-1 bugs fixed + Tier-2 contrast sweep (84 fails -> 0)

**Front-end only, no DB. Commits 1b8aad2, e83de31, 4428552, d4b1860, 16d6993 on `redesign-compare` (NOT pushed). Written retroactively 2026-07-29 during the CLAUDE.md archive split.**
- **QUEUE LOGGED (1b8aad2):** the §D PRE-LAUNCH POLISH / BUG QUEUE , Tier 1 bugs (launch-blocking, wrong not just unpolished) / Tier 2 contrast / Tier 3 polish, reconciled against live code. Several items had never been logged anywhere before.
- **TIER-1 #1 SEARCH ACCURACY (e83de31).** "Rodri 18" returned wrong players. **ROOT CAUSE: substring `ilike` on `player_name_norm`, which stores the FULL LEGAL name** , "rodri" matched 192 players through hidden middle names (Lucas *Rodrigo* Moura, Raúl ... *Rodríguez*), displayed as names containing no visible "Rodri", ordered by rt rather than relevance. All four fixes landed in the SHARED vv-core parser so rankings + compare inherit them: (a) `vvNorm` folds the NON-decomposable specials (ı ø ł đ ð æ) so the client folds identically to the stored norm , fixes the whole Turkish/Nordic/Polish diacritic CLASS, not one name; (b) `tokenAndFilter` per-token CROSS-COLUMN AND (each token in player OR team name) so "rodri manchester city" disambiguates and a mixed name+club query never returns fewer rows than name-only; (c) NEW exported `rankBySearch` , relevance re-rank exact > prefix > word-exact > word-start > mid, then rt; (d) season-miss now EXPLICIT ("No {season} season for that name , showing all"), soft not silent. Verified live: "Rodri" -> Rodrigo/Rodri top, "rodri manchester city" -> Rodri@ManCity, "nunez"/"sule" -> Núñez/Süle top, "Haaland 12" -> explicit miss. DEFERRED: real-Rodri-#1 needs the known-as VALUE (the nickname-alias item) , ranking already surfaces him at #2.
- **TIER-1 #2 COMPARE PICKER FILTER (4428552).** Reported static. **The wiring was never broken** (chips -> `pkSetFilter` -> `renderPicker` -> `passF`, all correct; Honours inert by design). The real defect: `buildPoolQ` ordered `rt DESC` WITHOUT `nullsFirst:false`, and **Postgres defaults DESC to NULLS FIRST**, so the default picker pool was 50 null-rt (unrated) rows. Prestige/tag derive from the rt band, so every filter matched 0 and looked dead. One line (`nullsFirst:false`, matching rankings) cured THREE things: prestige now returns 12 Generational / 38 Iconic and tag filters match; the `limit(50)` search edge logged under bug #1 (rated matches pushed out of the fetched window by nulls-first) is the SAME root cause and is now retired; the default picker no longer surfaces unrated seasons. Pool top rt `[null×50]` -> `[97,96,96,96,96,95]`, 0 nulls. Deferred product call: whether to EXCLUDE `rt is null` seasons from the picker entirely (currently only deprioritised).
- **TIER-1 #3 GLANCE HOVER TAGS (d4b1860).** Glance tags disappeared/rearranged on desktop hover. **Root cause was a FLOW REFLOW, not a re-render:** the shared tag-tip `showTip` inserts a full-width `.chiptip` (`flex-basis:100%`) INTO the `#glChips` flex-wrap row , that inline fold-below is the intended TAP behaviour, but it was ALSO wired to desktop HOVER, so a pointer sweep repeatedly inserted/removed a full-width flex item and wrapped the chips onto new lines. FIX decouples hover from tap AT THE CALL SITE: `showTip(el, floating)`; the `mouseover` handler passes `floating:true` -> a `.chiptip-float` (`position:fixed`, appended to body, `pointer-events:none`) placed by `positionFloat` (centre-on-chip, viewport-clamped so the last chip in a wrapped row never clips, above-the-chip with flip-below near the top). Out of flow, so chips do not move at all. The click/tap path is BYTE-IDENTICAL; `closeTips`/`mouseout`/`tipTarget` untouched, card-face `.vvcard`/`[onclick]` pills still excluded.
- **TIER-2 CONTRAST SWEEP , TOTAL, grep-verified (16d6993): 84 genuine muted-grey-on-cream failures -> 0.** The earlier `--ink-soft` pass had **missed FOUR pages entirely** (iwonder, myclub, preferences, index , all zero `--ink-soft`), plus residual grey families on covered pages (card `.dc-*`/`.js-*`, compare `.vvback`/`.js-*`, rankings `.vseg`/`.ranksearch`/`.rankempty`) and CASE-mismatches the lowercase-only original perl had skipped (`.js-*` used `#8A8578`). Added `--ink-soft` to the 4 missed pages (index already had its own `--muted` , darkened its light value to `#5f594e`); migrated all failing hardcoded-hex AND `rgba(40,36,30 / 28,27,26, <0.7)` grey text to `var(--ink-soft)` (light `#5f594e` = 5.30, dark `#8a8276`); `.rtag` family got `body.light` overrides darkened to AA while keeping the bright unqualified value for dark mode (darkening the unqualified value would have broken dark); `.cst-vv.low` -> readable grey. Excluded as not-cream: white-on-coloured-pill (82), light-grey-on-dark (27), brand/accent/tier (191), and `#766b55` (an rgba on the GOLD iconic card face, not cream). 7 files. **The audit tool false-flags exactly 1 (`.rtag.slate`) , its `body.light` override `#62626d` = 4.60 wins in light; the tool is cascade-blind.**
- NEXT (as it stood at session end): the cream-on-light class was found the following day , see the 07-28 entry.

### 2026-07-24 (cont.) | SEASON SEARCH shipped + shared matcher lifted to vv-core (one mechanism)

**Front-end only, no DB, no schema change. Commit 6115f72 on `redesign-compare` (NOT pushed).**
- **SEASON SEARCH: "hazard 23" now surfaces the 2023/24 season directly** instead of returning nothing (a year token used to break the name-AND filter -> empty). `vvParseSearch(q) -> {nameQ, seasonYear}`: 2-/4-digit token in range 2010-2025 is the season (season_year = STARTING year, "23"->2023->2023/24); "23/24"/"2023/24" takes the start year; out-of-range year-shaped tokens DROPPED (ignored, never name text); bare year filters to that season. Applied server-side via `.eq('season_year',y)` , season_year is already the era-filter column, so no schema change. Graceful degrade: in-range season with no matching row for that name -> drop the season, show all + a subtle "No 23/24 season for that search , showing all" hint (rankings count line; picker `.pkhint`).
- **ONE MECHANISM: `vvNorm`/`tokenAndFilter`/`vvParseSearch`/`vvSeasonLabel` lifted into vv-core.js** (export as globals), the byte-identical `tokenAndFilter`/`vvNorm` copies DELETED from both rankings.html and compare.html. **§C corrected , the "Compare uses RPC `search_players`" claim was STALE; the RPC is called NOWHERE; both surfaces query the matview directly.** Picker: season filter in loadPool (server) + renderPicker re-filters on the PARSED name, not the raw text (raw would strip the year token and empty the results).
- **VERIFIED live (read-outs):** "hazard 23" -> Thorgan Hazard 23/24 (a real HIT , Eden has no 2023 season but Thorgan does, so NOT a degradation); "hazard 2018" -> the three Hazards' 18/19; "hazard 99" -> year ignored, all Hazard seasons; "eden hazard 23" -> DEGRADES (Eden has no 2023) to all 12 Eden seasons + hint; "2018" -> that season.
- **`cr7` FINDING (confirmed pre-existing, NOT masked by this change):** returns 0 rows because search matches literal normalized name/club SUBSTRINGS and no row contains "cr7" (Ronaldo's `player_name_norm` = "cristiano ronaldo dos santos aveiro"; "ronaldo" matches fine). The query is BYTE-IDENTICAL old vs new (raw "cr7" and parsed nameQ "cr7" both -> `player_name_norm.ilike.%cr7%,team_name_norm.ilike.%cr7%`) , the parser passes it through unchanged (7 is single-digit, not year-shaped). So it is a standing search limitation, not a regression.
- **DEFERRED (new idea, post-launch): NICKNAME ALIAS INDEX** , map nicknames/shorthands (cr7 -> Ronaldo, r9 -> Ronaldo Nazario, etc.) so name search matches beyond literal normalized substrings. Separate feature, own table/lookup; not this change.
- NEXT: Lucas verifies the batch on preview once pushed (season search; + the still-open item-1 season order after hard-refresh and item-3 fold after deploy). Unpushed stack on redesign-compare: ff6a1f1 (Proof), 52171a0 (Compare-New + fold), 137e5ec (§F log), 6115f72 (season search). Only c77fa4e (.vwho) is live.

### 2026-07-24 | Card editorial + Compare polish: .vwho AI winner-line, The Proof wired, Compare-New CTA, fold hardening

**On the launch spine now (recovery track closed). Front-end only, no DB. Commits on `redesign-compare`.**
- **.vwho WINNER-LINE , SHIPPED + DEPLOYED (commits 9b26c17 code + c77fa4e docs, PUSHED , the one push Lucas explicitly directed; §D(f) marked DONE).** The winner headline was a fixed string ("X edges it, 90 to 32") that contradicted the selected verdict tag. Now the AI writes it: `/api/analyse` gains a `who` key (output contract + system-prompt spec tying the register to the chosen tag + tone; `swapVerdict` carries it through the cache swap unchanged). compare.html prompt requests `who` with the tag/tone/both VV scores; `vvSetVerdict` uses `v.who`, keeping the old phrasing ONLY as a fallback (loading placeholder / cache-miss / error) , NOT a client-side tone table. A bad/absent output degrades to the old phrasing. **Could NOT generate local read-outs , ANTHROPIC_API_KEY is Vercel-only (local .env blank).** VERIFY ON PREVIEW (all 3 pairings confirmed uncached this session): DECISIVE `?a=133289&b=133218` Hazard 2018 rt90 vs Sturridge 2018 rt48 (expect Masterclass, decisive line); RAZOR `?a=132265&b=132293` Kane 2021 rt89 vs De Bruyne 2021 rt88 (expect VAR-close, "edges it" survives); TIE `?a=131142&b=133415` Isak 2023 vs Sterling 2018 both rt89 age24 (expect Debate-Lives-On, level/unresolved).
- **THE PROOF (card.html) , SHIPPED (commit ff6a1f1).** Last hardcoded panel (static Bruno Creation stats on every card) now dynamic: `rowToCard` carries passes_key/tackles_total/tackles_blocks/interceptions; `renderProof(D)` picks the dimension by position pool (ST/Winger=goal, CAM/CM=creation, CB/FB/CDM=def, GK=def->NR) and fills per-90 + season total. PERCENTILE COLUMN DEFERRED (needs the parked engine percentile work) , blanked + bar hidden, DOM kept. Also fixed CARD_PLAYER bare-URL default ("bruno-fernandes-2324"->"__none__") so a param-less card.html no longer renders Bruno's Chronicle. NOT browser-verified , logic mirrors the working vvSetProof.
- **COMPARE-NEW CTA (item 2) , SHIPPED (commit 52171a0).** Secondary ghost pill under Compare, shown once a slot is filled; `vvCompareNew()` clears both slots + folds + verdict, re-renders empty slots, drops ?a=/?b=, scrolls to the matchup. No navigation.
- **SEASON-FOLD HARDENING (item 3) , SHIPPED as HARDENING, NOT a confirmed fix (commit 52171a0). OPEN VERIFICATION POINT.** The fold auto-collapses on season-select per Lucas. Diagnosed: 839baba (absolute-dropdown) was PURE CSS , did NOT undo 84d3222's re-open JS; no later commit regressed it; both flip paths fire onDone. Could NOT reproduce from source. The one visible weakness: `wasOpen` read the DOM at the end of an async flip + 2 awaits (timing race). FIX = authoritative `SLOT_OPEN[slot]` flag, set the instant the user opens/folds, read directly. **Fixes the PLAUSIBLE cause, not a confirmed repro. IF IT PERSISTS after deploy: next lead is the absolute-dropdown positioning appearing collapsed , needs a screen recording; Lucas will record what he actually sees rather than guess.**
- **SEASON ORDER (item 1) , NO CHANGE, OPEN VERIFICATION POINT.** Reported oldest-first; source is ALREADY newest-first (query `order('season_year',{ascending:false})` since feb0aff; verified empirically , Hazard returns Real Madrid 2021 top -> Lille 2010 bottom, 12 seasons; no CSS column-reverse). Deliberately NOT changed (inverting correct code would break it). **Lucas to HARD-REFRESH the preview and confirm; if still oldest-first it is a stale deploy / cached bundle -> send the preview URL to inspect the deployed bundle.**
- NEXT: Lucas verifies on preview (season order after hard-refresh; fold after deploy; the 3 .vwho matchups). Then continue card editorial (K5 VV-line trajectory; the deferred Proof percentile column) + the remaining §D(g) Drury paragraph-breaks and §D(h) trajectory layout.

### 2026-07-23 (cont. 3) | Recovery COMPLETE + wrong-block pass parked post-launch , BACK ON THE LAUNCH SPINE

**RESUME POINT , READ FIRST.**
- **The 9-league INGESTION-GAP RECOVERY is COMPLETE (780 recoveries, see entry below). That track is CLOSED.**
- **CENTRE OF GRAVITY IS BACK ON THE LAUNCH SPINE (§D): tags / Compare / card editorial / hygiene / merge.** The data-recovery detour is done and the remaining data work is deferred; do not reopen it pre-launch.
- **WRONG-BLOCK PASS , DEFERRED POST-LAUNCH (parked, NOT awaiting a decision).** Scoped read-only (PL 109 true cases, ~500-900 nine-league); rewrites existing rows + entangled with FBref assists; 3 policy questions recorded but unanswered. Full detail §E "POST-ROLLOUT WORK REMAINING" item 3. Do not pick up pre-launch.
- **CARD EDITORIAL is the active track now (§A ~55%).** IN PROGRESS this session: card.html The Proof panel (K4) being de-hardcoded (was static Bruno Creation stats on every card) + CARD_PLAYER bare-URL Bruno-Chronicle default fix.
- All work committed on `redesign-compare`, **NOT pushed** (Lucas pushes).


---

### 2026-07-23 (cont. 2) | ROLLOUT COMPLETE , ERE + BPL shipped, all 9 leagues done (780 recoveries)

**THE INGESTION-GAP RECOVERY IS COMPLETE.** All 9 leagues re-ingested insert-only with the hardened importer. **780 player-seasons recovered** (PL 67, LL 93, L1 52, SA 167, TR 145, PRT 64, BL 35, ERE 90, BPL 67). psc -> 57,234. **1 public band crossing total** (Charles 2018 LL) , far below the order-~10 model. Zero blank-team cards written. Zero errors across all 9 live passes.
- **ERE:** 90 recovered (5748->5838), top rt67, MAE 5.6 (best), 0 public crossings. Proxy's one big miss (Branderhorst GK -15) = a keeper with no prior season to tag him GK, slipped the exclusion; harmless (nowhere near flag line).
- **BPL:** 67 recovered (5631->5698), top rt79 (G. Bruno, proxy exact), MAE 5.7, 0 public crossings. **Section 5 flagged ZERO , the derived 45-app/4050-min ceiling validated on the league it was built for** (Belgian playoffs; static 34 would have mass-deduped genuine full seasons).
- **The importer that did this** (all committed on redesign-compare, NOT pushed): block-selection (phantom-drop/artifact-dedupe/genuine-sum) + proportionality gate + narrowed per-stat guard + season-derived apps/minutes ceilings + exact-minute mirror + blank-team skip. Insert-only throughout; existing rows never rewritten; matview refreshed after each league.
- **Existing-row movement across the rollout:** all +-1 except a handful of -2 (full-season-defender team_def90 shifts); flip rate tracks recovered MINUTES not row count (BL 1.74 high on full-season recoveries, ERE/BPL/SA ~0.7 on low-minute); internal 57/58 & 44/45 crossings throughout, publicly invisible.
- **POST-ROLLOUT (deferred, none launch-blocking):** (1) combined-score duplication guard, motivating case Basacikoglu; (2) blank-team re-run once promoted-club names backfill; (3) **WRONG-BLOCK PASS , now SCOPED (PL 109, ~500-900 nine-league), a separate gated project BLOCKED on 3 policy questions, see §E item 3**; (4) watch-list validation (8 rows). Full detail §E.
- NEXT SESSION: the recovery track is CLOSED. Center of gravity returns to the launch spine (§D): tags/Compare/card editorial/hygiene/merge. Note card.html The Proof is still hardcoded (§F 07-23 audit).

### 2026-07-23 (cont.) | BL SHIPPED (35 rows) · predicted anchor crossing did NOT fire · rollout at 7 of 9

**RESUME POINT , READ FIRST.**
- **7 of 9 done: 623 recoveries.** 2 remain: **ERE, BPL (~180 more).** NEXT = **ERE**.
- **THE GATE (every league):** snapshot -> `--insert-only --dry-run` -> report (per-season skew, OUTFIELD-ONLY proxy, shapes, summed-with-output, implausible via DERIVED ceiling, collisions) -> **explicit go** -> live -> refresh -> diff, crossings split internal/public. Section-5 apps ceiling in the report reads from ceilings.json (snapshot lacks appearances) , re-cache if stale.
- **1 public crossing across all 623** (Charles 2018 LL). BL was the strongest anchor setup (Guirassy rt86 into 77 incumbents) and produced ZERO , the anchor needs a card AT the seam, not above it. Remaining expectation: order 0-1.
- **BPL note: derived apps ceiling 45** (Belgian playoffs) , the league the old static constant would have broken. Both remaining leagues have a live 2025 season -> expect blank-team skips (guard handles them).
- All committed on `redesign-compare`, NOT pushed.

**BL this session:** 35 recovered (5867->5902), 0 errors, 0 public crossings. Guirassy rt86 World Class (proxy exact). Proxy MAE 7.3 (best). Flip rate 1.74 (highest, all high-minute recoveries). 2 watch-list rows (Burke, Scherhant). The predicted 2nd public crossing did NOT fire , all 66 seam-incumbents held; one elite card above the seam does not shift the b85 cutline enough (n=1).

### 2026-07-23 | PRT SHIPPED (64 rows) + blank-team guard · rollout at 6 of 9

**RESUME POINT , READ FIRST.**
- **6 of 9 leagues done: PL 67 + LL 93 + L1 52 + SA 167 + TR 145 + PRT 64 = 588 recoveries.** 3 remain: **BL, ERE, BPL (~270 more).** NEXT = **BL**.
- **THE GATE (every league):** snapshot rt -> `--insert-only --dry-run` -> report (per-season skew, OUTFIELD-ONLY proxy, shapes, summed-with-output rows, implausible lines via DERIVED ceiling not a constant, collisions) -> **explicit go from Lucas** -> live `--insert-only` -> refresh -> diff with crossings split internal/public.
- **1 public crossing across all 588** (Charles 2018 LL). Remaining expectation: order 1-2.
- All work committed on `redesign-compare`, **NOT pushed** (Lucas pushes). Latest: d1e97ab (blank-team guard).
- **BL/ERE/BPL each have a live 2025 season -> expect blank-team skips (promoted clubs not yet named at source); the guard handles them, self-healing on a later pass.** BPL especially: derived apps ceiling is 45 (playoffs), already handled.

**PRT this session:**
- 64 recovered (5943->6007), 0 errors, 0 public crossings, Taremi 2020 rt82 (proxy predicted 82, exact).
- **Blank-team guard (d1e97ab):** skip rows with no team_name , they degrade on 2 of 3 surfaces and self-heal under insert-only. First use: 21 PRT 2025 rows skipped (Estrela Amadora + promoted clubs, name not yet at source). Deferred: re-run PRT once names backfill.

### 2026-07-22 (cont. 4) | SA + TR SHIPPED · season-derived ceilings · mirror relaxed · ROLLOUT PAUSED at 5 of 9

**RESUME POINT , READ THIS FIRST NEXT SESSION.**
- **Rollout is PAUSED by Lucas after TR. DO NOT START PRT.** 5 of 9 leagues done: **PL 67 + LL 93 + L1 52 + SA 167 + TR 145 = 524 recoveries.** 4 remain: **BL, PRT, ERE, BPL (~360 more recoveries).**
- **THE GATE, unchanged, run it every league:** snapshot league rt -> `--insert-only --dry-run` -> report (per-season skew, OUTFIELD-ONLY output proxy, shapes, summed rows with output on >1 block, implausible lines, collisions) -> **explicit go from Lucas** -> live `--insert-only` -> refresh matview -> existing-row diff with crossings split internal vs public.
- **1 public band crossing across all 524 recoveries** (Charles 2018 LL, 85->84). Revised expectation for the remaining 4 leagues: **order 1-3**, concentrated at the 84/85 seam.
- Uncommitted/unpushed: nothing. All work committed on `redesign-compare`, **NOT pushed** (Lucas pushes).

**Shipped this stretch:**
- **SA 167 rows** (6891->7058). Kean 2024 Fiorentina rt87 World Class. 115 movers all +-1, 4 crossings all internal, zero public.
- **TR 145 rows** (6220->6365). 96 movers, one -2, 5 crossings all internal, zero public, 0 new rows at rt>=85.
- **Season-derived ceilings (2258e21)** , the static `LEAGUE_GAMES` was WRONG for 5 of 9 leagues (BPL runs to 45 apps / 4050 min against a nominal 34; TR changes size 34/35/36/38/40 by season). Both ceilings now derive per (league, season) from stored rows, tolerance **apps +1** (cannot be more , Esposito sits only +2 above a true season) and **minutes +90**. Fallback: season -> league-wide -> **DISABLED**, never the nominal constant. Regression: PL 67/67 re-resolved from live source, 0 mismatches; LL/L1/SA unchanged.
- **Mirror relaxed to fire on exact minute equality regardless of appearances (commit after 11e5117)** , measured 3/3 perfect association across 239 multi-block rows. Blast radius exactly 1 row (TR Kapacak), zero change to shipped leagues.
- **appsCeiling cushion dropped (b5430d8)** , caught SA Esposito's 40-appearance card in a 38-game league.

**Open, deliberately deferred:**
- **Post-rollout: combine the two guards into a joint duplication score.** Motivating case Basacikoglu (shipped, card_id 187304, 555m 0g/6a rt50, probably 0g/3a). Measured as exactly ONE row across 239 multi-block rows , not a class.
- **Watch-list: comparable minutes + shared stat below MIN_SHARED_STAT.** LL 0, L1 1, SA 3, TR (Kapacak now removed by the mirror fix). Revisit with all 9 leagues visible.
- **card.html The Proof is STILL fully hardcoded** (static markup at card.html:533-535, Bruno's 23/24 figures, no id and no JS binding , the only `proofrow` references are CSS). compare.html's Proof IS dynamic (`vvSetProof`). Also found this session: `var CARD_PLAYER = "bruno-fernandes-2324"` (card.html:1382) means a bare `card.html` with no query params renders Bruno's Chronicle; and the Chronicle is curated to **8 player-seasons** total, hiding itself otherwise.

### 2026-07-22 (cont. 3) | L1 SHIPPED (52 rows) , zero public crossings; Lepaul rt87 validated; dry-run eyeball screen found unreliable
- **L1 LIVE (DB write, matview refreshed): 52 recovered, psc 6517 -> 6569, 0 errors.** Live counts matched the dry run season-for-season. 73 movers, **ALL +-1**, 0 vanished. **8 band crossings, ALL INTERNAL (57/58 seam), ZERO PUBLIC** , mover rt range was 34-64, nowhere near a public seam. Ripple share 12% (LL was 27%). 3 of 52 unscored (null goals).
- **E. Lepaul 2025 Rennes 2702m 21g/5a -> rt87 World Class, #24 of 6277 scored L1 cards.** Highest-output summed row produced so far, and it holds up: the Angers half contributes only 175m/1g, so a dedupe would land at essentially the same rt. Summing is not inflating this card.
- **The dry-run "rt > 85" screen is UNRELIABLE , do not trust it alone.** It uses the importer's rating-based `ratingToRt`, which diverges hard from the view's output-driven rt (Clauss importer 89 -> view 72; Doue 87 -> view 69) and MISSED Lepaul entirely. Screen future dry runs on predicted OUTPUT, not importer rt.
- **SCOREBOARD: 212 recoveries across PL+LL+L1, 1 public crossing total.** Tracking below the "order ~10" model. NEXT: SA, same gate.

### 2026-07-22 (cont. 2) | DECISION: accept + disclose, finish the rollout , relative-score disclosure SHIPPED + L1 dry run clean
- **LOCKED (Lucas): ACCEPT AND DISCLOSE, FINISH THE ROLLOUT.** Rollout un-halted. Reasoning: the scale STABILISES as coverage completes, so stopping halfway carries the exposure and keeps the churn ahead of us. **Partitioning REJECTED , cross-league comparability IS the product.** **Anchor-freezing REJECTED , freezing to incomplete data locks in a known-wrong scale.** Full reasoning in §E.
- **DISCLOSURE SHIPPED (front-end, no DB): vvindex.html "What We Measure, and What We Don't" gains a 4th principle block, "Where the ground still moves"** , states plainly that the VV Score is relative, ranks a season against every season measured, and that scores can move by a point as coverage grows ("a card that read 85 last month may read 84 today, not because the football changed, but because the company it is measured against grew more complete"). Sits alongside the NR/incomplete-record, position-lens and silent-defending notes. Verified balanced (3 opens / 3 closes, file div balance 0), section now has 4 principle blocks.
- **L1 DRY RUN CLEAN (read-only, 587 calls): 52 recoveries** (6517 -> 6569 if run). 27 single / 25 summed / 0 deduped. Skew 75% 2020+ (weaker than LL's 92%). Proportionality gate fired once , Mama Balde 2024, Lyon 31m 0g/**3a** (8.7 a/90) + Brest 1154m 2g/3a -> gated to the Brest block. **0 implausible lines** (no appearances-ceiling violations). 0 collisions. Highest recoveries: Clauss 2024 Nice 2311m 3g/8a and Doue 2024 PSG 1734m 6g/6a, both `single`; watch Lepaul 2025 Rennes 2702m **21g**/5a (genuine Angers->Rennes split, likely to land high on view rt). 8 summed rows carry output on >1 block; 5 share a single assist at ratio<0.5 and were deliberately NOT deduped (the accepted trade), 1 (Grandsir 2018) sits exactly at ratio 0.50 but shares only 1 assist so the stat threshold declined it , guard (b)'s AND working as designed.
- NEXT: await go for the L1 LIVE pass (snapshot already captured: 6517 rows, 66 at rt>=85). Then SA/BL/PRT/ERE/BPL/TR, same gate each time.

### 2026-07-22 (cont.) | LL rollout SHIPPED (93 rows) + appearances ceiling , then ROLLOUT HALTED: public band crossing + unpartitioned-percentile finding
- **LL LIVE (DB write, matview refreshed): 93 recovered, psc 6939 -> 7032, 0 errors, 0 duplicate team rows.** Includes commit 83b28e7 (appearances ceiling + deterministic dedupe tiebreak), which caught LL Navarro 2024 summing to a **48-appearance card in a 38-game league**. Sorloth 2024 and Ayoze Perez 2024 both land rt85 (real, `single` shape). 12 of 93 land UNSCORED (null goals -> the `scored` CTE drops them) , pre-existing behaviour, 2990 such cards DB-wide.
- **LUCAS HALTED THE ROLLOUT.** Do not start SA/BL/L1/PRT/ERE/BPL/TR. Decision pending on terms.
- **The LL pass falsified FOUR things §E asserted , all corrected in §E, all worth reading before touching data again:** movement is NOT all +-1 (4 rows moved -2, all teammates of a 3213m recovered CB); there IS a public band crossing (**Charles 2018 Eibar 85 -> 84, World Class -> Standout**, with NO recovered teammate); the global ripple is 27% of movement not "~0"; flip rate tracks recovered MINUTES not row count.
- **THE STRUCTURAL "no public crossings because def_core cannot reach 80+" ARGUMENT IS RETIRED.** It is true and irrelevant , a card sitting ON 85 needs a one-point nudge, not an 80+ def_core.
- **ROOT CAUSE FOUND (read-only audit): the engine's percentiles are NOT partitioned by league or season.** `pos_pct`/`rel_pct`/etc partition by COARSE `psc.position` only; `abs_pct` partitions only GK-vs-outfield (one global pool); `gaw_ref` is a single global scalar; and the band anchors b85/b90/b95 are literally the 650th/150th/12th best cards in the DB. Only the defensive pool is narrowly scoped. **Adding a Belgian midfielder can move a Spanish striker, and adding any high-rt card can demote a card sitting on 85.** Charles is almost certainly the anchor effect (LL added two rt85 cards). Caveat: read from `migrations/stage3_league_strength.sql`, corroborated against the live mv column list, but `exec_sql` returns no rows so a fresh `pg_get_viewdef` was NOT obtained , verify in the SQL editor.
- **EXPOSURE: 876 of 53,624 scored cards (1.63%) sit within ONE POINT of a public band boundary** (461 at 79/80, 273 at 84/85, 128 at 89/90, 14 at 94/95). PL most exposed at 3.40%.
- **MODEL for the remaining 7 leagues: ~497 recoveries -> ~545 movers -> ~3-5 public crossings from the ripple (two estimators agree), PLUS an anchor effect the estimators do not capture; honest total order ~10, concentrated at the 84/85 seam.**
- NEXT: Lucas decides whether to continue and on what terms. Options worth scoping if he wants them: partition the output percentiles by season and/or league; freeze the anchors; or accept the crossings and disclose. §A bars unchanged.

### 2026-07-22 | Summed-path fix SHIPPED (proportionality gate + narrowed dup guard) + 7 rows re-inserted (DB write) , remediation CLOSED
- **Importer patch committed `e311cd3` on redesign-compare, NOT pushed** (Lucas pushes). Two nets in front of the genuine-split SUM, covering two DIFFERENT copy shapes , neither substitutes for the other: (a) PROPORTIONALITY GATE (Poisson upper tail vs an elite ceiling, `CEIL_G90=1.00`/`CEIL_A90=0.60`/`P_IMPLAUSIBLE=0.01`, **richest block EXEMPT** so a genuine elite season is never gated for being too good , that exemption is what let the old `LOW_MIN_BLOCK=600` cliff be deleted); (b) PER-STAT DUPLICATION GUARD narrowed to `MIN_SHARED_STAT=3` **AND** `MIN_MIN_RATIO=0.5`. All 5 thresholds live in one block at the top of the guards section.
- **Two design corrections found by testing, both recorded in §E:** §E's original guard (a) said "identical goals AND identical assists" , that formulation MISSES Gibbs-White (matches on assists only), so it is OR; and Lucas's AND-narrowing of guard (b) reverses CHILWELL (shared 1g < 3, and the mirror test misses him at Δapps=4), so he sums to 515m 2g and clears the floor. All 7 re-inserted, not 6.
- **FERGUSON WAS A FALSE-POSITIVE DELETE** , old and new code both give Brighton 411m 1g/0a. He was removed on suspicion alone. (The earlier "possibly Ferguson" also matched the WRONG player: Nathan 127605, not Evan 129643.)
- **Verified read-only before any write:** 60 clean PL rows re-resolved = 0 shape changes under BOTH the conservative and refined rules. Cunha + Kean still deduped (Kean is caught by guard (b) alone , mirror misses on Δa=1, ceiling misses at 1996m). Delap still recovers.
- **DB WRITE:** 7 rows in as card_id 186878-186884, PL psc 6758->6765, matview refreshed. Gibbs-White **rt86 -> rt80**, out of World Class. 11 existing rows moved, all +-1, 0 vanished, **1 internal band crossing (publicly invisible)**. Flip rate 1.57/recovered is ABOVE the modelled 0.64 , scale the rollout estimate by recovered MINUTES, not row count. Global pool-percentile ripple is small but NOT zero (4 of 11 movers are non-teammates), correcting §E's "empirically ~0".
- NEXT: resume rollout LL onward with the patched importer (note: the refined rule may newly recover players BEYOND the known set, so dry-run each league first). §A bars unchanged , this is a data-correctness fix inside the existing ~95% Data-quality bar, not new surface.

### 2026-07-21 | Playbook 2nd-surface de-orphan + card.html audit + ingestion-gap scoping + 25/26 dup-team FIX (DB write)
- **PLAYBOOK LIBRARY reconciliation (commit dd3e029 + this session's uncommitted follow-ups):** the glossary was NOT the only orphan surface , a 2nd `.libtag` "full profile tag library" (42 chips) was also orphaned. Reconciled to the engine 19 (32 removed incl. empty Keepers group, 2 renames, 7 added, "Character & Moments"->"All-Round"). The tag-vocab drift spanned FOUR consumer surfaces (rankings chips, compare picker, glossary .tagdef, library .libtag), all now sourced from TAG_DEFS. 3 library designed-but-unbuilt tags (Box-to-Box, Defensive Rock, Big-Game Player , real Card Contract cutlines) logged in §D DEFERRED before removal.
- **card.html AUDIT (read-only):** the "not started / hardcoded to Bruno" claim was STALE. Bruno `D={}` (line 603) is a standalone-demo default; `loadCard()` replaces it with `rowToCard(live row)` on `?id`. Glance/Profile/Trajectory/WonderTags/Notes/DataConfidence/honours/squad-shield/identity-line/season-switcher/flip/radar are ALL DYNAMIC. Step-3 is ~80% done. The ONE live-hardcoded element = **The Proof per-90 rows (card.html:534-536)** , frozen to Bruno 23/24 Creation stats, no JS fill, shows on every card. Also unbuilt: G/A colour-coding (values dynamic, no colour), defender flag. Chronicle = curated dict (53 moments), hides when no entry (not frozen).
- **INGESTION COVERAGE GAP scoped (read-only, 12 API-Football diagnostic calls) , full detail §E.** ~20/club = 300-min floor BY DESIGN (universal across 9 leagues). Marquee gap splits TWO ways: (1) SOURCE-ABSENT (Rooney/Gerrard/Lampard/Kompany , API-Football has the player entity but no season-stats linkage; `/players?search=gerrard&league=39&season=2013`=0; re-ingest CANNOT recover); (2) IMPORTER STAT-BLOCK BUG (Delap , source HAS his Ipswich 24/25 PL 37app/2612min/12g, but the importer's `(statistics).find(x=>x.league.id===39)` grabs the FIRST PL block = Man City null-min => <300 => skipped; RECOVERABLE by picking the max-minutes block + insert-only re-ingest). Re-ingest cost ~3.5-4.5k calls (~5-6% of 75k), 1-2h, MUST be insert-only + checkpoint-bypass to keep existing rt frozen.
- **25/26 DUP-TEAM NAMES , FIXED (DB WRITE + matview refreshed).** 7 PL clubs split short/long name in season_year 2025 (all source=apifootball; live-season name inconsistency, no team-name canonicalization in the importer). Remapped 59 rows minority long-form -> canonical short form via guarded UPDATE on player_season_cards.team_name (season_year=2025, league_code=PL, per-variant, 0 collisions). player_card_mv REFRESHED (exec_sql). Verified: 27->20 teams, 0 variants left, 598 rows unchanged (no player-season moved/duped , team_name is not part of the (api_player_id,season,league_code) key). CLEANUP: deleted 2 orphan legacy `teams` rows (Tottenham Hotspur id 6, Newcastle United id 7; both 0 refs; other 5 long-forms never had rows). NOTE: 19 relabelled cards carry team_id=NULL (pre-existing, display uses team_name , not fixed, out of scope). ROOT CAUSE still open: add a canonical-team-alias map to `api/import-players.js` so future live seasons don't re-split.
- Delap-class importer stat-block fix SCOPED + DESIGN LOCKED this session (multi-block prevalence ~6.5%, ~300-600 dropped 2020+-skewed; 46/56 two-real cases are API duplication artifacts vs ~10 genuine splits). Block-selection rule locked (phantom-drop -> single / artifact-dedupe / genuine-sum; league-aware ceiling + mirror-test union; floor-on-result) , see §E. Mid-season-transfer question RESOLVED: one summed row, not dual cards (§D DEFERRED). Code NOT written (held). NEXT: write the block-selection patch + convert importer to insert-only, dry-run one league-season, verify Delap recovers + zero existing-rt deltas.

### 2026-07-19 | Compare #101 flow-polish COMPLETE + VERDICT-TAG SYSTEM shipped + doc reconciliation
- 10 commits on redesign-compare (front-end; NO DB writes; live on JS deploy): 765f653 go-to-player pills + dynamic "See It" YouTube; 11fd7c3 verdict-tag system; 29af942 card-glow horizontal-scroll fix; 3e2ae78 crown-badge->tag + green-scope; 84d3222 fold-state/subheading/tooltip/playbook-de-green; 839baba open-fold layout fix; + doc commits. §D/§F were STALE before this entry (last was 07-16, none of the above logged) , the "docs lag reality" problem the audit flagged; §D Steps 1-2 + this entry now reconcile it.
- **FLOW-POLISH DONE:** go-to-player (seecard pills -> card.html?id); user-controlled fold (season list is an ABSOLUTE dropdown , out of flow, so an open list no longer grows .matchup / displaces the Compare pill; holds in all 4 states + 390px); back-path verified (vvBack cold deep-link -> rankings.html); subheading clip fixed (foldable heading flex->block wraps in the narrow 2-col grid); C8 satisfied (picker pos chips + passF). OPEN: picker pager (optional), 2 residual playbook green sub-panels.
- **VERDICT-TAG SYSTEM (design LOCKED + SHIPPED, 11fd7c3).** The verdict PROSE was already live (rt-decides -> tie->AI /api/analyse, Drury/Winter, verdict_cache); NET-NEW = the TAG-SELECTION + AGE layer + de-hardcoding The Proof / Data Confidence / the crown badge (all were frozen Henry/Haaland demo content).
  - 14 VERDICT_TAGS , single source in vv-core, each {name,emoji,blurb,drury,trigger}: 6 gap-LADDER (DETERMINISTIC by |rt gap|: Masterclass >=10, Bragging Rights 7-9, Clear Edge 4-6, Photo Finish 2-3, VAR close call 1, The Debate Lives On 0); 5 CONTEXT (AI-SELECTED, judgment, no numeric trigger: Different Worlds, Class Across Eras, League Strength Tips It, The Eye Test Deceives, Complete Package vs Specialist); 3 AGE (DETERMINISTIC, below).
  - ROUTE C hybrid: ladder + age fire deterministically compare-side (verdictContext); context tags are AI-picked from an eligible set; AI always writes the Drury prose. PRIORITY when several fit (LOCKED): CONTEXTUAL > AGE > LADDER (most characterful wins; ladder is the floor/default). Chip is client-robust: verdictContext.floorTag renders the deterministic tag even on the 48 tagless pre-change cache rows (see verdict_cache prompt-bump DEFERRED item).
  - CLOSE-CALL TONE buckets feed the prompt register: 0 tie / 1-2 razor (finest-margins) / 3-6 clear / 7+ decisive.
- **AGE-AS-TIEBREAKER , LOCKED + BOUNDED.** Applies ONLY when rt gap <=2 AND age diff >=4y -> the YOUNGER player wins the coin-flip (the equal-ish season at a younger age is the harder feat). NEVER at gap >=3 (higher rt wins; age is colour only). Does NOT add points, does NOT enter or shift rt. Age lives in the VERDICT layer ONLY , consistent with the Wonderkid TAG (age is a tag/verdict signal, never an rt input). Read-out proof: Yamal '25 (rt88, age18) vs Son '24 (rt89, age31), gap 1 -> tiebreak names Yamal; would NOT fire at gap >=4.
- **THE 3 AGE TAGS (exact triggers, approved this session):** (1) The Prodigy's Edge (teen phenom): gap <=3 AND younger <=21 AND >=4y younger , "To command this stage at nineteen, the years ahead should frighten us all." (2) Twilight Brilliance (veteran): gap <=3 AND older >=33 AND >=5y older , "They said the legs would fade. The refusal does not fade." (3) The Ascendant (22-25 riser, NOT teen): gap <=2 AND >=5y gap favouring youth AND younger >21 , "One is the finished portrait; the other still being painted, and already this good." Distinct/non-overlapping: Prodigy=teen, Ascendant=young-adult, Twilight=veteran.
- **VV INDEX content notes (for the Step-4 explainer; drafted, NOT yet on the page):** (a) league strength measured from 980 quality-filtered TRANSFERS (both leagues in our nine, adjacent seasons, >=900 min each side, measurable output) , "cleaner beats bigger" (a mover's output delta across a real league boundary is the signal, not squad reputation). (b) The Index CHART uses AVERAGE-ANCHORED display while the ENGINE stays PL-ANCHORED , the tilt socket is AFFINE, so re-anchoring the engine would change scores; display re-anchor only, never the engine. (c) ANCHOR DISCLOSURE: we measure leagues RELATIVE TO EACH OTHER, not whether football overall rose or fell (no absolute claim about the global level over time).
- **POST-LAUNCH DATA OPTIONS (parked):** FBref lost its Opta feed early 2026 but the StatsBomb layer remains + is scrapeable; Sportmonks from EUR29/mo, advanced add-ons climbing; dribbles_past is the ONE unused API-Football defensive field , half-day ADDITIVE re-ingest, MODEST expectation (same opportunity confound as the other defensive signals per Decision A).
- **FEATURE IDEA (parked):** card prev/next navigation ordered by the view the user ARRIVED FROM (filtered ranking, search results) , shares the state-passing mechanism with the Compare go-to-player work. **SPEC (locked while parked):** (a) prev/next step through the SAME filtered + sorted list the user came from, in that order (not a global/default ordering); (b) the BACK control returns to that exact filtered/sorted list state ("based on your view"), NOT a reset to the default rankings , same state-passing channel as vvBack / the Compare go-to-player pills. Both directions read the arrival-view state; neither falls back to default when a filter/sort was active.

### 2026-07-16 | Phase 1 TAG KEYSTONE shipped (3 commits) + Compare #101 scoping correction
- **PHASE 1 (tag keystone, §D build-track step 1) COMPLETE , 3 commits on redesign-compare (NOT pushed; front-end only, NO DB writes / NO matview refresh , live on next JS deploy):**
  1. `16360ba` , **eligibility() 8-bucket fix.** getVVTags eligibility() checked a DEAD pre-lock pool vocab (LW/RW/RB/LB); The Winger fired only 78x (0.1%) instead of 790. Fixed to 8-bucket (Winger/FB/CB/...). Per the Stage-2/TAA principle FBs are eligible for the ABILITY tags (Playmaker/Dribbler/Provider) but NOT "The Winger" (a POSITION-identity tag , attacking FB is scored within the FB pool, never reclassified wide). Verified vs live: The Winger 78->790 (pure Winger recovery, 0 FB), Playmaker +729 FB, Dribbler +601 FB; 15 other tags 0 change; van Dijk/CBs unchanged.
  2. `bf1b0fa` , **honours team-join.** 159 team-keyed honours (143 league_champion + 16 ucl_winner) have api_player_id NULL so never attached (Silverware showed World Cup only). Added a second match path keyed by card team+season(+league); loaded once per page via in-flight-memoized promise (loadTeamHonours). 2992 distinct cards gain Silverware (2869 LC + 334 UCL). Verified: Messi/Iniesta 2010 -> League Champion + UCL; van Dijk 2018 -> UCL only (independent lookups); Bruno 2020 Man Utd -> EMPTY (no false positive). No dup (team rows carry no api_player_id).
  3. `6397086` , **vocab reconciliation (#3).** Filter/picker chips were hand-authored, duplicated, drifted (18 invented tags, 2 stale renames, + dead filter LOGIC). Built FILTER_TAXONOMY + renderFilterChips in vv-core as the SINGLE SOURCE OF TRUTH (both UIs render from it, can't drift). rankings: chips from taxonomy + POS map FB/Winger fixed (was dead). compare: passF fixed (tag matched empty p.tag placeholder -> now p.tags[].name; + prestige branch); honour chips DEFERRED (Option C) + visibly "soon". Verified DEAD->LIVE: compare Goal Machine 0->185; rankings FB 0->4721, Winger 0->4684.
- **OPTION C logged (§D DEFERRED):** honours-in-filter needs honour flags on player_card_mv; chips render "soon" until then. Tiny follow-up flagged: stale rankTagColor() legacy keys (Talisman/Target Man) fall through to a default , harmless.
- **COMPARE #101 SCOPING CORRECTION (read-only, verified live code):** the master doc's "verdict + accolades hardcoded Henry/Haaland" was STALE. The Compare SPINE IS BUILT + WORKING , verdict "The Edge" (rt->tie->AI /api/analyse, Drury/Winter, verdict_cache, free), accolades (real honours incl. new Silverware + tags), radar (drawDualRadar from live CMP_A/B.radar), trajectory, deep-link ?a=&b=, smart back vvBack(). Henry/Haaland = demo nulled at compare.html:819. #101 is a FLOW-POLISH pass. THE ONE REAL GAP = go-to-player (no link OUT from a filled slot/verdict to card.html). §D step 2 rewritten to match. NEXT: verify spine in-browser, then build go-to-player.

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

---

# PART 2 , MOVED 2026-08-10

**The 9-league ingestion-gap recovery narrative is no longer in this file.** It was merged into
**`INGESTION_RECOVERY.md`**, which now holds the whole thread in one place: the summary layer
(extracted from CLAUDE.md §E) followed by this full narrative, sections 2.0 to 2.3.

**Why it moved:** this archive reached 148,312 bytes = 98.9% of the 150k truncation limit, so the
next session-log archive pass had nowhere to go and would have truncated SILENTLY from the
OLDEST end. Moving the ingestion narrative out was the cleanest cut, and it also removed a hop:
the thread had been spread across CLAUDE.md §E, `INGESTION_RECOVERY.md` and this file.

**Do not look for ingestion content here.** `INGESTION_RECOVERY.md` is the single source for it,
including section 2.2, which an OPEN work item still depends on (the combined-score duplication
guard).
