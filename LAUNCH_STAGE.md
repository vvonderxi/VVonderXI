# VVonderXI , LAUNCH STAGE SPEC (deferred detail; read ONLY when this stage starts)

**THIS FILE IS NOT AUTHORITATIVE. `CLAUDE.md` WINS ON ANY CONFLICT.**

**Do NOT read this at session start.** It is deferred build detail extracted from `CLAUDE.md` §D on
2026-08-07 under the stage-file rule (recorded in the CLAUDE.md session-protocol block, first applied
in `05c41ce` for `ACCOUNTS_STAGE_SPEC.md`). CLAUDE.md holds the resume point, the active queue and the
locked decisions; this file holds the batches that are read every session but needed only when the
launch-polish stage actually begins.

**What is here:** three batches, verbatim as they stood in §D , the UI hygiene / mobile-polish batch,
the improvements batch, and the share/social tiers.

**What deliberately did NOT come here, because it is launch-BLOCKING and must stay visible:**
**SHARE/SOCIAL TIER 1** (static og/twitter meta on card + compare + index). Its actionable core lives
in §D BUILD TRACK step 5; the full reasoning is in the SHARE / SOCIAL section below. If you are doing
step-5 hygiene, read that section.

**Nothing here is built.** Every item is queued, and several carry read-only diagnoses that were done
at logging time , do not re-investigate what is already marked DIAGNOSED.

---

### UI HYGIENE / MOBILE-POLISH BATCH (logged 2026-08-02 from REAL-DEVICE findings, NOT built , the two diagnosable items are already diagnosed, read-only)

Real-device pass on mobile. Captured, not built. **Items 1b and 6 were the two "needs diagnosis" unknowns , both are now ANSWERED below, so nothing here needs re-investigating before it is built.**

1. **TRAJECTORY (compare, mobile).**
   - (a) **VV-score line too dark/prominent, overlapping the data numbers** , Messi '14 and Olise '26 season totals are hidden behind it. The `body.light #vtraj .tjline{stroke:#2a2620}` override (shipped `6892c55`, Option 2) made the line readable on the light panel but it now competes with the bar totals. Fix is z-order/offset or a lighter weight, NOT reverting the colour (it was invisible before).
   - (b) **YEARS SKIP , DIAGNOSED 2026-08-02: this is deliberate LABEL THINNING, the data is COMPLETE. NOT a data gap, do not go looking for missing seasons.** `vv-core.js renderTrajectory`: `var xStep = n>=13?3:(n>=9?2:1)` and a label renders `if(i%xStep===0 || d.selected || i===n-1)`. **PROVEN on Messi: 13 seasons 2010-2022, consecutive, ZERO gaps; every bar is drawn, only labels are thinned.** Rendered labels are `’11(i%3) ’12(SELECTED) ’14(i%3) ’17(i%3) ’20(i%3) ’23(i%3)`. **The "illogical" sequence is the SELECTED season's label breaking the every-3rd rhythm** , that is the whole bug. Fix options: suppress the selected-season label when it falls off-rhythm, or shift the thinning window so the selected season IS on-rhythm, or mark the selected season with a tick/colour rather than an extra out-of-sequence label.
   - (c) **Label/axis spacing** so bar totals, the VV line and the axis ticks stop colliding. Same shared renderer as the card (`VVCore.renderTrajectory`), so **verify BOTH surfaces** , §D Tier-3 item 5 already records this trap.
2. **COMPARE HEADER** , the darker cream band (`--surf-plinth`, from the `ac1ace0` re-skin) touches the Back pill and overlaps the daylight toggle top-right. Drop it down / shrink slightly for breathing room. Note this is the NEW plinth, so it is a re-skin follow-up, not a pre-existing issue.
3. **SHARE IMAGE** , ties to the SHARE / SOCIAL TIER 2 work (@vercel/og), do not build separately. Three concrete corrections: (a) tagline must be **"Every season tells a different story"**, NOT "The Football Legacy Platform" or "Compare Careers Define Legacies"; (b) **CREAM background, not black** , the logo clashes on black; (c) cards must render real and clean in the og image.
4. **NAV** , ~~remove **"My Locker"** (duplicates My Club)~~ **[DONE , verified 2026-08-20: zero occurrences of "My Locker" in any page]**. **STILL OPEN, the other half:** **My Club gets the same `.comingpill` "SOON" treatment as I Wonder** , this MERGES with the already-open §D step-5 item "DESKTOP MY CLUB COMING-SOON PAGE", same fix, do them together.
5. **VV BADGE** , the "VV" sits too high inside the shield, not vertically centred. Centre it. (The shield is the `c6f04a4` account badge; the cream border is INSET by `scale(0.84)` , do not "simplify" that away while adjusting, see §F 2026-08-01 (archived).)
6. **PLAYBOOK , CLOSED 2026-08-07. Both parts done; nothing outstanding.** (b) The `.liblabel` heading and its `.liblede` went with the chip library in `09d451c`; verified zero elements in the body, only the now-dead CSS remains (queued in the dead-CSS sweep above). Original diagnosis retained below for context. ~~The vocabulary fix LANDED; the heading removal is the ONLY outstanding part.~~ (a) **`bbdce99` (2026-08-01) did land and is CLEAN** , measured: `Attacker` singular 0 / plural 7, `Midfielder` 0/5, `Defender` 0/4. **Zero singular/plural duplication remains, so there is nothing to re-fix there.** Group subheadings are already the right form: Attackers, Midfielders, Defenders, All-Round, Career Stage , **keep these.** (b) **OUTSTANDING: remove the `<div class="liblabel">The full profile library</div>` heading** (still present). Decide whether the `.liblede` beneath it ("Every profile tag the engine can award, each with its own meaning.") stays or goes with it.
7. **ADD-TO-HOME-SCREEN PROMPT** , "Add VVonderXI to your phone" renders grey on black in daylight mode. Make it white/legible. Same contrast family as the `--ink-soft` sweep; check it was not missed because the prompt only renders on mobile Safari.
8. **JOIN / SAVE MODAL , reframe the copy.** Primary intent is EMAIL CAPTURE to stay updated ("add your email to stay up to date with features"); Continue-with-Google is the easy METHOD, not the lead. Current framing buries the email ask. **Copy/IA change, not a feature build** , note `vvJoin()`'s OAuth call is currently commented out and there is no auth session anywhere (see §F 2026-08-01 (archived)), so this is presentation only until accounts land.

### IMPROVEMENTS BATCH , split by effort (logged 2026-08-02, NOT built)

**QUICK FIXES (independent, small):**
1. **VV BADGE , THEME-AWARE COLOUR.** Shield is currently `fill="#1C1B1A"` (black) in both themes. Black-on-dark in Under-the-Lights is low contrast; it should be **CREAM in dark mode, black in daylight**. The badge is inlined per page (7 files, `c6f04a4`: card, iwonder, myclub, playbook, preferences, rankings, vvindex) , **it is NOT in vv-core, so this is a 7-file change**, and the inline `fill` must become a themeable value (CSS var or a `body.light` rule against a class). **Do NOT touch the `transform="translate(50 58) scale(0.84) translate(-50 -58)"` inset border while in there** , stroking the outer edge makes it invisible in light mode (§F 2026-08-01 (archived)). **SEPARATE from the vertical-centering question**, which is still open pending Lucas's eye , measurement says the VV at `y=57` is at the geometric centre and slightly BELOW the area centroid (54.7), i.e. it reads LOW not high, so that one is not to be "fixed" until he confirms at real 42px size.
2. **MASTER CARD , un-bold the games-played number.** Card-specific: the GLANCE keeps it bold (`.gm-games`, weight 900) deliberately, per the minutes-are-the-denominator philosophy , **do not remove that**. Only the master card face wants it lighter.
3. **MASTER CARD / TRAJECTORY , split the Scout report into two mini-paragraphs** for readability. Same family as the still-open §D(g) "Drury prose renders as one long paragraph", which is to be fixed at the PROMPT level, not by post-processing , check whether the Scout text is AI-written (then it is a prompt change) or static (then it is markup) before building.

**DESIGN SESSION , read-only scope + demos BEFORE any build:**
4. **COMPARE FILTER , broken AND badly designed (phone + desktop).**
   - **SCOPING CORRECTION, already found (2026-08-02): "the compare filter" spans TWO surfaces, and the exact-score control is NOT in the compare picker.** The **"Exactly 85"** button is in **`rankings.html`** , `<div class="qb" onclick="setBand(85,85,this)">Exactly 85</div>`, sitting beside "85 to 89" / "80 to 84", plus a slider. The **compare picker**'s `passF` handles only `honour, pos, prestige, tag` and has **no score branch at all**. **The read-only scope must cover both surfaces and decide which is being redesigned , they are different code.**
   - **BUG: position pills reportedly do not work.** **NOTE the earlier fix was a DIFFERENT root cause** , `4428552` fixed `buildPoolQ` ordering `rt DESC` without `nullsFirst:false`, which made every filter match 0. That is fixed and verified. So this is either a REGRESSION or a distinct defect in the `pos` branch , diagnose, do not assume it is the same bug.
   - **DESIGN: cut the exact-score filter.** VV score is a continuous ranking, not a category; nobody filters to an exact value. "Exactly 85" is a meaningless affordance.
   - **DIRECTION (Graham/Apple , ruthless subtraction).** Filter by what people ACTUALLY want: **name search PRIMARY** (in Compare you are picking a specific player), then meaningful narrowing , position, league, era, and possibly the Generational/Iconic bands that already exist in `FILTER_TAXONOMY`. **Remove filters nobody uses; make the one everyone uses (name search) fast and prominent.**
   - **SUPERSEDES the older one-line §D DEFERRED entry "Compare filter REDESIGN (whole look/UX)"** , same project, now with a direction and a scoping correction. Demo-driven, same discipline as the Compare re-skin: scope read-only, show options, pick once, build once.
   - Cross-refs that constrain the redesign: the honours chips are inert BY DESIGN until honour flags land on the matview (§D DEFERRED "OPTION C"), and `FILTER_TAXONOMY` in vv-core is the SINGLE source shared by rankings + picker , change it there, not per-surface.

### SHARE / SOCIAL , scope decision + reality check (logged 2026-07-26)
**DECISION.**
- **LAUNCH , link sharing only.** Complete the share-a-link path and make shared links unfurl with an image on Twitter/X via a DYNAMIC og:image on the share route. Folds into the Step-5 hygiene og/meta + social-image work , NOT a separate feature.
- **POST-LAUNCH , image download + Instagram.** Rendering a card/verdict to a downloadable image is a FEATURE-SIZED job (DOM-to-canvas: cross-origin player photos, webfont loading, export-quality poster), not launch polish. Instagram from the web is DOWNLOAD-THEN-POST only (no web share-to-feed API), so IG sharing DEPENDS on image generation existing first , both deferred together.

**REALITY CHECK (read-only scope, verified 2026-07-26) , the current wiring does NOT match the decision's premise:**
- **There is NO `/v/<id>` route.** No `vercel.json` rewrite, no `v.html`/`verdict.html`, no poster-id persistence anywhere. The premise "save persists a poster id, share builds /v/<id>" is not in the code , that half was never started, so there is nothing to "complete", it is a from-scratch build.
- **What IS wired:** compare `vvVerdictShare` (compare.html:1142) = `navigator.share({url: location.href, text})` + Twitter-intent fallback , shares the CURRENT URL (`compare.html?a=X&b=Y`), not a /v/ id. Card has a PARALLEL share modal (`vvShareOut`/`vvShareX`/`vvShareWhatsApp`, card.html:1593+) sharing `location.href` (`card.html?id=Z`); `vvShareURL` even carries a `/* TODO canonical permalink */`. Both destinations DO render (compare rebuilds via `loadSlotFromUrl()` from `?a=&b=`; card renders from `?id=`), so today's shared links are NOT dead , they resolve to working query-param URLs.
- **Image generation PARTIALLY exists** (contradicts "no card/verdict-to-image generation exists"): `vvVerdictSave` / `vvSaveImage` render a PNG via html2canvas and DOWNLOAD it. BUT it is prototype-grade, consistent with deferring: (a) html2canvas is lazy-loaded from a cdnjs CDN (external dep , CSP/offline/adblock risk; every other asset is self-contained); (b) the card embeds the API-Football photo `<img src="media.api-sports.io/...">` with NO `crossorigin`, so `useCORS:true` can TAINT the canvas and make `toBlob`/`toDataURL` throw (that CDN's CORS headers are unverified; photos are ON by default unless the user picked silhouette); (c) SVG-badge + CSS-gradient fidelity through html2canvas 1.4.1 is unverified. The feature-sized post-launch job = harden this (self-host the lib or native canvas, resolve the photo CORS/taint, export-quality poster).
- **NO og:image / twitter:card / og:title meta on ANY page** (grep-confirmed). A static `og-image.png` (193KB) sits in the repo root and is cache-headed in `vercel.json`, but it is UNREFERENCED , no page links it, so no shared link unfurls with ANY image today.

**LAUNCH-BLOCKER ANSWER (the user's question).** Shared links do NOT currently go nowhere , they point to the existing `?a=&b=` / `?id=` URLs, which render, so nothing is broken today. The blocker only appears IF we adopt the pretty `/v/<id>` route: then the verdict page + route + poster-id persistence must exist BEFORE share ships, or the link 404s = launch-blocking for THAT approach. **RECOMMENDED cheaper launch path: put the dynamic og:image (Step-5 hygiene) on the EXISTING query-param URLs , they already render, so an og endpoint keyed on `?a=&b=` / `?id=` gives X unfurl with NO new route, page, or persistence to build.** (Also for the eventual image build: the two share stacks are duplicated , compare `vvVerdictShare/Save` vs card `vvShareOut/vvSaveImage` , fold into one `VVCore.shareImage(node, meta)` like the other shared renderers.)

**TIERED PLAN (locked 2026-07-26) , refines the LAUNCH/POST-LAUNCH split above into three tiers.**
- **TIER 1 , LAUNCH-BLOCKING (lands in the Step-5 hygiene batch).** Add site-level STATIC og/twitter meta to the `<head>` of card.html + compare.html (+ index.html): generic brand `og-image.png` + neutral site title/description + `twitter:card=summary_large_image`. No server layer , static tags sit in the raw HTML, which the crawler reads. **PREMISE CORRECTION (verified 2026-07-26):** there is NO hardcoded-Bruno og tag , there are NO og/twitter tags AT ALL on any page (grep-confirmed empty). So Tier 1 is an ADD, not a replace, and there is no "Bruno-on-every-share" bug in the META layer to kill: today shares unfurl with only the generic `<title>VVonderXI</title>` fallback and NO image. Tier 1's real effect = shares unfurl correctly-branded (brand image + neutral copy) instead of image-less. `og-image.png` is VERIFIED (read the file) the generic VVXI brand logo at 1200x630 (correct OG spec) , wiring it is SAFE, it does NOT put Bruno (or any player) on every share.
  - **Separate REAL Bruno bug (NOT og, client-side / user-visible only , do NOT conflate with share):** card.html:556 the "See It" watch CTA `href` is hardcoded to `youtube.com/results?search_query=Bruno+Fernandes+season+highlights+2023+2024` regardless of the loaded player; and card.html:609 the demo `D={...surname:'Fernandes', full:'Bruno...'}` fallback object. Crawlers never see these (JS-only), so they don't leak to unfurls , fix in the CARD POLISH pass, not the share work. (The watch CTA should derive the query from `D.full`/`D.year`.)
- **TIER 2 , IMMEDIATE POST-LAUNCH (the rich-unfurl feature actually wanted; NOT launch-gating).** Per-link OG via a server layer on the EXISTING query-param URLs (NO /v/ route). Bot-sniff Edge Middleware -> a meta function (Mechanism B above): card `?id` -> "Player · season · VV score" + a generated card image; compare `?a&b` -> the verdict tagline + both scores (e.g. "Kane edges it, 89 to 66 · A Masterclass", pulled from `verdict_cache` by card-pair). Image via **@vercel/og , CONFIRMED runs on Hobby tier** (Edge Function, `runtime:'edge'`; renders a 1200x630 PNG from Satori JSX at request time; cache with `s-maxage`). SCOPE: (a) `middleware.js` (repo root) matching /card + /compare, UA-gated to Twitterbot / facebookexternalhit / Slackbot-LinkExpanding / Discordbot / WhatsApp / LinkedInBot / TelegramBot , humans get the untouched static SPA (zero added latency); (b) a Node meta fn reading **Supabase by `card_id` , NOT `db.json`, which was DELETED on 2026-08-31 along with `api/db.js`.** It was a 340-player snapshot dated 18 June carrying its own `rt` values, taken BEFORE the engine recalibration, so its scores contradicted the live site (its Haaland 22/23 is 92 against the platform's 90). **Building per-card OG off it would have unfurled wrong VV scores to every shared link** , the one place an error is least recoverable. Read the matview, + `verdict_cache` for compare, returning minimal HTML with the per-link og tags; (c) an `/api/og` EDGE fn using @vercel/og , the html2canvas poster is NOT reusable (Satori supports only a flexbox CSS subset, no SVG filters; fonts must be fetched as ArrayBuffers), so the poster is RE-AUTHORED , BONUS: server-side photo fetch has no CORS, so it SIDESTEPS the html2canvas taint problem. The og:image TAG is per-card only because the meta fn injects the `?id`-carrying URL , so (a)+(b) are the prerequisite for (c). All api/*.js today are Node serverless + there is no middleware yet; Edge fn + middleware coexist fine with the Node functions.
- **TIER 3 , POST-LAUNCH.** Poster download + Instagram (DOM-to-canvas export-quality). Depends on the image-gen quality work; Instagram is DOWNLOAD-THEN-POST only from the web (no share-to-feed API), so it depends on Tier 2's image gen existing first. = the earlier POST-LAUNCH image/IG item.

---

## RELOCATED FROM `CLAUDE.md` §D BUILD TRACK STEP 5 ON 2026-08-19

CLAUDE.md was at 89.4% of its truncation limit with a session-log entry still owed. These nine are
detailed specs for work that has NOT started, which is exactly what the §D relocation rule describes.
**CLAUDE.md keeps a pointer carrying each item's DECISION**, so nothing load-bearing lives only here.
CLAUDE.md wins on any conflict.

   - **[QUEUED 2026-08-02] EM/EN-DASH SWEEP , AUDITED read-only, scoped. The static text is nearly clean; THE REAL EXPOSURE IS AI-GENERATED PROSE.** House rule = spaced commas, never `—` (U+2014) or `–` (U+2013). Dashes read as an AI tell, so this matters most on exactly the surfaces that are AI-written.
     - **THE PROMPT ALREADY ENFORCES IT , do NOT "add the rule", it is there twice.** `api/analyse.js` STYLE RULE 1: *"NEVER use em-dashes (—) or en-dashes (–). Use commas, periods, or restructure. Absolute."* and `NOTES_SYSTEM = VERDICT_SYSTEM + "... Never use em-dashes, use spaced commas."` The two literal dashes in that file are the rule ILLUSTRATING the forbidden characters , **leave them, deleting them would gut the instruction.**
     - **MEASURED COMPLIANCE (2026-08-02).** verdict_cache: **106 of 295 prose fields (36%) contain a dash**, but split by prompt version it is **29/69 (42%) on UNSTAMPED legacy rows vs 0/1 on the current `v2-347d0962`**. notes_cache: **0 of 514 fields**, across 243 unstamped + 14 current `v2-8aa073e5`. **So the violations are concentrated in pre-invalidation legacy verdict rows, and the notes evidence (0/514, same base prompt + one reinforcement) suggests the rule does hold , but only ONE verdict row exists under the current prompt, which is NOT a sample. Treat compliance as UNPROVEN until more current-prompt rows exist.**
     - **THEREFORE THE FIX IS MOSTLY FREE:** the cache invalidation shipped in `6143a10`/`8399723` already makes unstamped rows MISS, so legacy dash-ridden verdicts regenerate lazily on view under the current prompt. **Re-audit AFTER the rt>=95 pre-warm** (which writes ~65 fresh current-prompt rows) , that is the real compliance sample. If dashes still appear at a material rate, THEN strengthen the prompt (move the rule to the END of VERDICT_SYSTEM, mirroring NOTES_SYSTEM's reinforcement, which is the one measurable difference between the clean and dirty populations).
     - **STATIC TEXT , only 4 live occurrences, all `&mdash;` entities, none prose:** `card.html:561-563` (three Proof placeholder rows, replaced at runtime by `renderProof`) and `compare.html:1342` (the verdict score-row separator, `97 &mdash; 96`). **DECIDED 2026-08-02 (Lucas): KEEP the score-row dash.** Introduced in `8327cb4`, matching the spec Lucas wrote ("97 — 96"). **This is a deliberate, recorded EXCEPTION to the no-dash rule, not an oversight:** a numeric score separator is typography, not prose, and the rule exists to stop dashes reading as an AI tell in written sentences. **Do not "fix" `compare.html:1342` in a future sweep.** The three `card.html:561-563` entities are Proof placeholder rows overwritten at runtime by `renderProof`, so they never reach a user either. Net: **zero prose dashes in static text.**
     - **NOT USER-FACING, leave alone:** ~90 dashes across `api/*.js` are code comments and `console.log` (server-side diagnostics). One borderline: `api/refresh-players.js:10` returns `{message:'refresh paused — BSD writer retired'}` , a dead endpoint's JSON, never rendered. `foundations.html` holds 27 more but §D already queues that file for DELETION, so they die with it , sweep it AFTER the delete, not before, or the work is wasted.
   - **[QUEUED 2026-08-01 , DO LAST IN THIS STEP] rt>=95 VERDICT PRE-WARM (65 pairs, ~$0.70). OPTIONAL POLISH, NOT a blocker.** Pre-generates every verdict among the 12 rt>=95 cards (Messi ×5, Ronaldo ×3, Suárez, Salah, Haaland, and one more) so the marquee legend comparisons load instantly on launch day instead of making the first visitor wait. **Fluid Compute already makes an uncached pair work fine (~8s first view, no 502), so this ONLY removes that first-view wait for the legends , it fixes nothing.** Ship without it if time is short.
     - **RUN NEAR THE END OF THE HYGIENE PASS, AFTER THE KEY ROTATION** , it needs `ANTHROPIC_API_KEY` temporarily in local `.env` (which is gitignored and untracked; the script only reads it into the `x-api-key` header and never logs it). **BLANK THE KEY FROM `.env` AFTERWARD.**
     - `node scripts/prewarm_verdicts.js --dry-run` -> `--limit 3` (read those 3 verdicts before spending the rest) -> full run. Resumable: re-running skips completed pairs, Ctrl-C is safe.
     - **Dry run confirmed 2026-08-01: 12 cards -> 66 pairs, 1 already warm (Messi vs Ronaldo 2011, warmed as a side effect of the Gate-2 test), 1 legacy row to refresh, 65 to generate, ~$0.70.**
     - Calls `api.anthropic.com` DIRECTLY from the laptop, not the Vercel endpoint , so no function timeout applies and it costs no serverless invocations. Parity is preserved by IMPORT, not routing: it `require()`s `MODEL`/`VERDICT_VERSION`/`VERDICT_SYSTEM` from `api/analyse.js`, so pre-warmed rows carry the exact stamp the live read expects (`v2-347d0962`) and will not regenerate on first view. Proven byte-identical to `compare.html`'s prompt across all 66 pairs.
     - DELIBERATELY NOT DONE: the wider rt>=92 tier (1,081 pairs, ~$16) and any notes backfill , demand warms those for free and the editorial is non-blocking.
   - **[QUEUED 2026-08-08] PAGE-WEIGHT , the demo markup is NOT the problem; a DUPLICATED base64 LOGO is. Measured, do not act on the original framing.**
     - **THE ITEM WAS LOGGED AS "myclub.html is 292KB, mostly base64 + preserved demo, delete the demo to reclaim ~250KB". THE MEASUREMENT SAYS OTHERWISE.** `myclub.html` is 300,277 bytes: **base64 images 210,994 (70.3%)**, the preserved `.clublayout` demo block **19,090 (6.4%)**, its card array **1,251 (0.4%)**, everything else (CSS/JS/overlay/nav) 70,193. **ZERO of the base64 sits inside the demo block.** So deleting the demo reclaims **~20 KB, not ~250 KB** , a tidiness win, not a payload win. Judge it on whether fabricated content should sit in shipped source at all (git history preserves the V1.2 design either way, per `9f5c21e`), NOT on file size.
     - **THE REAL FINDING, and it is site-wide: TWO base64 blobs are inlined into NINE pages each.** The `.spinelogo` pair , **107,250 bytes and 102,614 bytes** , are duplicated verbatim across card, compare, index, iwonder, myclub, playbook, preferences, rankings and vvindex. That is **~1.69 MB of duplicated payload across the site**, and it is re-downloaded per page because an inline data URI cannot be cached across documents. Two smaller blobs (25,502 + 23,542) are duplicated between contact and index.
     - **FIX (post-merge, not now): extract the two spine logos to real files** (e.g. `/img/spinelogo-dark.png` + `-light.png`), reference them by URL, and let the browser cache them once for the whole site. ~210 KB per page becomes ~210 KB once. **Cheap and mechanical, but it touches 9 files and is a launch-window change** , do it in the hygiene pass with the dead-CSS sweep, or hold until after the merge.
     - **Check before acting:** confirm the two blobs really are byte-identical across all nine (they hash identically today, but a future per-page tweak would silently fork them), and that no page relies on the data URI to render offline.
   - **[QUEUED 2026-08-11] NO BUILD STEP AND NO LINTING ON THE INLINE BLOCKS , THIS IS WHY QUOTE AND COMMENT ERRORS REACH PRODUCTION.** `card.html` is **~403KB of inline CSS and JS in one file**, served raw with no bundler, no minifier and no lint pass. **THREE of the four silent failures found on 2026-08-11 would have been caught by a linter on the inline blocks** and none were caught by review or by `node --check`: the unquoted `addEventListener(pageshow,...)` (a bare identifier, valid JS), the orphan `*/` that made the CSS parser discard 42 of 45 rules, and `JSON.stringify` truncating an `onclick` attribute. The fourth (`.glow` swallowing taps) is a layout fault no linter would see.
     - **CHEAPEST USEFUL VERSION, no toolchain change:** a Node script that extracts the inline `<script>` and `<style>` blocks and runs them through a parser , `node --check` for JS (already used, but it does NOT catch bare identifiers) plus a real CSS parse that COUNTS surviving rules and compares to the source count. **The rule-count comparison is the one that matters** , a CSS syntax error does not throw, it silently drops rules.
     - Add the quote-in-quote scan from §C as a second pass: handler attributes built by concatenation, and any `JSON.stringify` inside a markup string.
     - **Not launch-blocking, but it pays for itself on the next card.html edit.** Scope it with the dead-CSS sweep below , same file, same sitting.
   - **[QUEUED 2026-08-16] `vvFoldSections` UNDER-REPORTS ON MULTI-GROUP SECTIONS , cosmetic, and DELIBERATELY LEFT CONSISTENT.** `playbook.html`'s `vvFoldSections()` builds the collapsible heading badge from `sec.querySelector('.taggrid')` , the FIRST grid only , then counts `.tagdef`s inside it. A section with one grid is correct; a section with several under-reports. **Profile Tags shows 5 of 20** (it has five groups: Attackers, Midfielders, Defenders, Career Stage, All-Round) and **The Card shows 4 of 11** (three groups). Prestige, Honours and Verdict Tags are single-grid and unaffected.
     - **NOT fixed when The Card was added (2026-08-16), on purpose:** correcting it for one section would have made that section the odd one out across four. **Fix all of them together or none** , the change is one line (count `sec.querySelectorAll('.tagdef')` instead of scoping to the first grid), but it moves a visible number on four sections at once, so it wants to be a deliberate edit rather than a side effect.
   - **[QUEUED 2026-08-07] DEAD-CSS SWEEP , rules orphaned by content work, all verified zero elements + zero runtime refs.** Cheap, do them together in one pass, NOT individually. `vvindex.html`: **`.dicon`** (2 rules, orphaned by the pentagon rebuild `f7d84bf`, NOT by the Principles merge , that is why it was deliberately left out of `6240c69`). `playbook.html`: **`.liblabel`** (2 rules) + **`.liblede`** (2 rules), orphaned when the chip library was dropped in `09d451c`. **DONE 2026-08-14: `.vvb.s-strong` (2 rules) and `.vvb.s-squad` (2 rules) removed from `playbook.html`** , `s-squad` had been dead for some time, and `s-strong` was orphaned the same day by the band-pill restyle that moved the Accomplished pill onto its own class. Both verified zero `class=` in the body, zero `classList`/`querySelector`/`className` refs, zero occurrences in any inline `<script>`, and no other file references either name. **`.dicon`, `.liblabel` and `.liblede` are still outstanding.** **ADDED 2026-08-14, already located so the sweep need not rediscover them: `playbook.html` defines `--panel-t:#1C6038` and `--panel-b:#0F3A22` with ZERO `var()` uses** , `--panel-b` had been unused for some time and `--panel-t` was orphaned the same day when the World Class band pill moved to `--green-fill`. Deliberately LEFT IN PLACE rather than removed with that change, to keep the styling commit to one concern. **Two dead custom properties, not rules , confirm with `grep -c 'var(--panel-t)'` before deleting, since a token can be referenced from anywhere in the sheet.** **Method that worked in `6240c69`: confirm zero `class="x"` in the BODY and zero `classList`/`querySelector`/`className` references before deleting, and when a selector shares a media query with live rules, lift out ONLY that selector and re-verify the breakpoint at a real viewport.**
   - **[QUEUED 2026-08-01] DELETE `foundations.html` , dead prototype, confirm then remove.** A different generation entirely: `.navitem` not `.bn-item`, emoji icons, `data-i18n` attributes left from the abandoned language-toggle work, and tabs called VVerdict / Locker / Me. **Nothing links to it** , a grep for the filename across all HTML/JS/JSON returns zero. It was deliberately excluded from the 2026-08-01 nav swap for exactly this reason (converting a dead prototype's bespoke nav is churn on an unreachable page). Confirm it is genuinely dead, then delete , otherwise it is a page that will keep drifting out of sync with every UI change.
   - **[QUEUED 2026-08-01] GIT-HISTORY EMAIL SCRUB , only matters IF the repo goes public.** `livanlauwe@gmail.com` was hardcoded twice in `preferences.html` and live on the preview; removed in `c65043e` and a repo-wide grep of HEAD now returns zero. **But it remains in git history** , every commit before `c65043e` still contains it, and those are pushed to GitHub. Removing it properly means a history rewrite (`git filter-repo` + force-push), which is disruptive and rewrites every SHA. **NOT urgent while the repo is private** , this is a decision to take deliberately if/when it is made public, not a silent assumption that the grep covered it.
   - **[QUEUED 2026-08-01] LATENT , `.tip[data-tip]` tooltips on `myclub.html` + `preferences.html` share the un-clampable shape that was just fixed on playbook.** Same pattern: a CSS `::after` centred on its host (`left:50%; transform:translateX(-50%)`) with no way to clamp to the viewport, so a host near a screen edge pushes the bubble off-screen. **Not cropping today** , they sit on wide full-width rows rather than in a wrapped chip cloud, so nothing ever lands near an edge. It WILL bite the moment the pattern is reused in a wrap layout. Fix is the same as `d5898d6`: a fixed-position box positioned by the `positionFloat` clamp (centre on host, clamp to `[8, vw-width-8]`, above by default, flip below near the top). Note those two pages DO load `vv-core.js`, so unlike playbook they could use the real helper rather than a mirror , but check for double-tooltips first, since `vv-core`'s handler targets `[data-tip]` broadly.

---

## RELOCATED FROM `CLAUDE.md` §D ON 2026-08-19 , FILTER FOLLOW-UP

One session's work benefiting all three surfaces. CLAUDE.md keeps the decisions; this is the detail.

### FILTER FOLLOW-UP (VVFilters , ONE session, and every item benefits ALL THREE surfaces) , logged 2026-08-13, NOT built
The component is adopted on rankings, the card overlay and the compare picker, so anything fixed inside `VVFilters` is fixed three times over. That is the reason to do these together rather than surface by surface.
- **CLEAR ALL IS A BARE LINK. Restyle as a proper pill, consistently placed.** It lives in the component, so one fix covers all three. (Its VISIBILITY was already made consistent on 2026-08-13 , rankings used to hide it until a filter was active and was the odd one out; all three now show it whenever the panel is open.)
- **AGE FILTER , min/max range mirroring the VV Score slider.** `season_age` is already on the view and already rendered in the rankings rows, so **this is UI only** , no view change, no matview rebuild. The slider machinery (`.vvf-dual`, the two-thumb clamp, `paintRange`) is already generic; it needs a second instance and a `gte`/`lte` pair in `applyServer`.
- **[UNBLOCKED 2026-09-08 , THE FLAGS ARE ALREADY ON THE MATVIEW. THIS ENTRY SAID "STRUCTURAL" AND IT IS NO LONGER TRUE.] HONOURS ACTIVATION IS NOW UI WORK, NOT A REBUILD.** Verified against `pg_attribute`: `player_card_mv` carries **`h_ballon_dor`, `h_golden_boot`, `h_league_champion`, `h_player_of_season`, `h_top_assists`, `h_ucl_winner`, `h_world_cup_winner`, and `honours_json`**. The original reasoning was right , PostgREST cannot filter the matview by the separate `honours` table, so the flags had to live ON it , and that condition has since been met. **No DROP + CREATE is required to activate these chips.** The chips already render inert with a "soon" marker, which is deliberate: it teaches the vocabulary before the data exists. **Do not "fix" them by hiding them.**
- **TRAJECTORY GROUP , wired and HIDDEN.** It populates itself the moment Peak / The Standard / Breakout / Renaissance ship and the taxonomy lists them , no code change needed. An empty group is hidden rather than shown as a heading over a blank row, and `g.note` is developer metadata that must never render (it leaked to users once).
- **ROW CSS INTO vv-core , the one with the highest defect-prevention value, do it FIRST.** `rankRowHTML` lives in vv-core but its **~110 CSS rules live in the PAGE files**: rankings has a copy, `card.html` has a second scoped under `#cardSearch`, and compare has **none**. Move the rules beside the renderer, namespaced, and delete the copies.
  - **THIS DUPLICATION HAS ALREADY CAUSED TWO UNSTYLED-ROW BUGS.** It is why `pkRow` could emit classes nothing styled (§C, 2026-08-13), and why pointing the picker at `rankRowHTML` produced **804px unstyled rows** , `display:block` instead of grid, `.rmini` 518px wide and transparent , rather than being the one-line change it looks like.
  - **Until this is done, any surface adopting the shared renderer is one copy-paste from the same bug, with no signal when it happens**, because unstyled rows still render.


---

## RELOCATED FROM `CLAUDE.md` §D ON 2026-08-24

Both blocks below are things to LOOK AT and confirm, not things to build. They were
taking 2.6 KB in the file that is read first every session for work that starts by
opening a page and checking it.

### TWO UNCLOSED VERIFICATION POINTS (from 2026-07-24, promoted here 2026-08-02 during the second archive pass , they were the only load-bearing content in the archived entries)
Both were shipped-but-unconfirmed and have never been ticked off. **Neither is a known bug; both are "Lucas to look and confirm".** Do not silently assume they are fine.
- **COMPARE SEASON-FOLD , shipped as HARDENING, not a confirmed fix (`52171a0`).** Reported: the season dropdown auto-collapses on select. Could NOT be reproduced from source , `839baba` (absolute-dropdown) was pure CSS and did not undo `84d3222`'s re-open JS, and no later commit regressed it. The one real weakness found was a timing race: `wasOpen` read the DOM at the end of an async flip plus two awaits. Fix was an authoritative `SLOT_OPEN[slot]` flag set the instant the user opens/folds and read directly. **That fixes the PLAUSIBLE cause, not a confirmed repro. IF IT STILL HAPPENS: the next lead is the absolute-dropdown positioning merely APPEARING collapsed , needs a screen recording rather than more guessing.**
- **COMPARE SEASON ORDER , NO CHANGE MADE, deliberately.** Reported oldest-first; the source is ALREADY newest-first (`order('season_year',{ascending:false})` since `feb0aff`), verified empirically (Hazard returns Real Madrid 2021 top -> Lille 2010 bottom, 12 seasons) with no CSS `column-reverse`. **Inverting correct code would have broken it, so nothing was changed.** If it still reads oldest-first after a HARD refresh, it is a stale deploy / cached bundle , send the preview URL to inspect the deployed bundle. (Cross-ref the standing `vv-core.js` no-cache-buster trap.)

### VERIFY ON RETURN , **ANSWERED 2026-08-29, READ-ONLY. The expected answer was RIGHT about the caches and INCOMPLETE about the platform.**

**(1) YES, every uncached generate writes.** `api/analyse.js:304` upserts into `verdict_cache` on `pair_key`, the canonical min-max card pair. Write-on-generate, never an explicit save, and wrapped so a failed cache write still returns the verdict.
**(2) `verdict_cache` and `notes_cache` CARRY NO USER OR SESSION IDENTITY** , columns are `pair_key,card_id_a,card_id_b,verdict,winner_card_id,model,created_at,rt_a,rt_b,cache_version` and `card_id,notes,model,created_at,rt,stats_hash,cache_version`. Pure content caches, exactly as expected.
  - **BUT THE PLATFORM DOES HOLD PER-SESSION COMPARISON RECORDS, IN A DIFFERENT TABLE, AND THE EXPECTED ANSWER MISSED IT.** `comparison_log` carries `session_id` alongside both player names, both seasons, both scores, the winner and the deciding factor , literally "session X compared Y vs Z". `search_log` carries `session_id` and the query. **43 and 11 rows.** See the §E entry on `api/log.js`.
**(3) CONFIRMED: `saved_verdicts` DOES NOT EXIST** (zero matching tables), so the explicit-save path is genuinely unbuilt and accounts remain deferred. `locker_profiles` exists at **0 rows**, written only by `api/auth.js`.
**(4) GROWTH IS BOUNDED BY REAL UNIQUE PAIRS AND IS NOT A LAUNCH CONCERN.** `verdict_cache` holds **93 rows against 93 distinct `pair_key` values** , exactly one row per pair, so the key is doing its job. `notes_cache` holds 315. No cleanup needed at this scale.

#### the original questions, kept for context
- **WHAT A COMPARISON PERSISTS TO SUPABASE.** Answer these read-only before any accounts/data work: (1) does generating a compare verdict WRITE to `verdict_cache` every time, keyed by what (card-pair?), write-on-generate vs only on explicit save? (2) is there ANY per-user/per-session record of comparisons ("user X compared Y vs Z"), or is `verdict_cache` purely a CONTENT cache keyed by pair with NO user identity? (3) confirm "Save this verdict" (explicit save -> `saved_verdicts`) is SEPARATE from the auto-cache, and `saved_verdicts` does NOT exist yet (accounts deferred). (4) `verdict_cache` growth , bounded by real unique pairs; any cleanup concern before launch? **EXPECTED ANSWER: content cache keyed by pair, no user identity , confirm or correct.** (Cross-ref: the verdict system is in `/api/analyse.js` + the `verdict_cache` table; notes_cache is the single-card analogue.)


---

## RELOCATED FROM `CLAUDE.md` §D ON 2026-08-24 , PRE-LAUNCH POLISH / BUG QUEUE

Ten of its twelve items were already closed and archived; what remained was ONE open build
item and a body of CLOSED design narrative. The open threads are named in the §D pointer,
so nothing here is the only copy of an open item , this is the reasoning behind them.

### PRE-LAUNCH POLISH / BUG QUEUE , ONE ITEM LEFT (logged 2026-07-27; the 10 CLOSED items moved to `CLAUDE_ARCHIVE.md` on 2026-08-14)
**Items 0-7, 9 and 10 are DONE or CLOSED and are no longer here.** Three things inside them were still live and were promoted BEFORE the move , the `nullsFirst` NULL-rt sort trap and `vvDisplayName` into §C, the nickname-alias deferral into §D PARALLEL. **Do not go looking for the closed items to check a status; they are closed.**
Priority order. These are build-completeness gaps (ship-readiness), several never previously logged. Work top-down.
8. **My Club / VV Index nav swap , NAV DONE 2026-08-01 (`c65043e` + `1e78c1a`). REMAINING: the desktop My Club coming-soon page.** All 8 pages with a bottom nav now read **Home · Rankings · Compare · VV Index · Playbook**; My Club is removed from every BOTTOM nav (grep-confirmed zero in HEAD) **, but it is STILL IN THE HAMBURGER DRAWER on all 8 pages as `.navitem.soon`, so the page remains publicly reachable and needs launch treatment like any other (corrected 2026-08-20; the original claim said "every nav", which is true only of the bottom nav, and the grep that "confirmed" it was scoped to the bottom-nav markup)**, VV Index reuses the layered-diamond icon + two-tone `V<pink>V</pink> Index` markup that already existed, and active states are preserved (incl. card.html -> Rankings as its parent section, a regression caught mid-build). **FOUND EN ROUTE: the nav was ALREADY inconsistent and the plan above did not capture it** , `iwonder.html` and `preferences.html` had dropped **Home** and appended VV Index, a worse shape than the one this item described; both were brought into line rather than treated as precedent. **[OPEN] DESKTOP MY CLUB COMING-SOON PAGE** , deferred deliberately, a separate change from the nav. `myclub.html` presents as a live page with no coming-soon treatment anywhere, and it now has **no active nav tab** (it is no longer in the nav) , left that way rather than guessing a parent. Reuse `iwonder.html`'s `.comingpill` pattern (`<div class="comingpill"><span class="dot"></span> Coming soon</div>` + its CSS), which is now also used by the preferences Account section, so all three unbuilt features read the same. Small, self-contained. [POLISH]
**DEFERRED DESIGN (own demo-driven sessions, NOT this queue):**
- **Compare filter REDESIGN , SUPERSEDED 2026-08-02.** Now carried by the IMPROVEMENTS BATCH item 4 in `LAUNCH_STAGE.md`, which adds the direction (name search primary, ruthless subtraction, cut the exact-score filter) and the scoping correction (the "Exactly 85" control is in `rankings.html`, NOT the compare picker). **Work from that entry, not this line.**
- **Social sharing TIER 2** (per-link OG via @vercel/og) , already scoped in the SHARE / SOCIAL tiers in `LAUNCH_STAGE.md`.
- **COMPARE VISUAL REDESIGN , DIRECTION 1 (tonal depth + verdict hero) SHIPPED 2026-08-02 (`ac1ace0`). Design sitting CLOSED.** All three directions were mocked against a real pair (Messi vs Ronaldo 11/12) with the real cached verdict; Lucas picked **(1) Tonal depth only**. Delivered: four surface tiers (page floor / plinth / panel / hero) and `.vfinal` lifted from `rgba(0,0,0,0)` to the hero surface. Full mechanism in the §F 2026-08-02 entry. **Directions (2) brand-palette-as-layout and (3) Under-the-Lights are NOT deferred, they were considered and NOT chosen** , the mocks surfaced why: the VV cards are DARK objects, so darkening the stage costs card contrast, and a dark-on-dark payoff has weaker hierarchy than a light stage with a bright hero. **CORRECTION to the old entry: there is no `VVonderXI_Concept_UnderTheLights` file** anywhere in the repo or on disk (only `VVonderXI_Concept_Daylight.html` in ~/Downloads) , "Under the Lights" is the DARK THEME, already implemented, and its green was already live on `.vsect` and suppressed by `body.light`. The old "starting reference = the concept files" instruction pointed at nothing.
  - **[OPEN, separate item , NOT a redesign bug] THE OVERLAID RADAR RENDERS AS TWO NARROW SPIKES.** Real values are Messi `[92,8,0,0,96]` and Ronaldo `[82,6,0,0,97]` , Creation, Progression and Defensive read ~0 because `RADAR_REF` (vv-core.js:345) is still the PROVISIONAL placeholder cap set. The re-skin frames the chart correctly but cannot fix its shape. Closing this is the parked **percentile-within-position** work on the engine track (§C RADAR_REF / §D DEFERRED "THE PROOF , PERCENTILE COLUMN", same dependency). Until then the radar is honest but visually thin, on BOTH card and compare.
  - **PREMIUM TRAJECTORY TREATMENT , Option 3 (VV score in its OWN lane).** Tier-3 shipped Option 2 for the compare trajectory (`6892c55`: clean pink/gold gap, dark visible VV line, no green-panel halo, peak-label de-collision). Option 3 was the boldest "line vs bars" fix but needs vertical room a redesign allows: **split the plot , bars own the lower ~70%, the VV score becomes a slim sparkline strip in the top ~25% with its own mini-axis, so the line never crosses the bars.** Best read of the VV-vs-output story; prototype it here (optionally combined with GROUPED side-by-side goals/assists bars , the Option 1 direction , if the dual-chart width allows). Shared renderer `VVCore.renderTrajectory` (card + compare), so any change is verified on BOTH surfaces.


---

## COMPARE #101 , THE CLOSED INVENTORY (relocated from `CLAUDE.md` §D BUILD TRACK step 2, 2026-08-25)

**WHY THIS IS HERE: it is a DO-NOT-REBUILD list, not a plan.** Compare's spine was wired across the Batch-B sessions and verified live 2026-07-16, and a stale framing in the old plan ("kill hardcoded Henry/Haaland") nearly sent a session rebuilding it , those were demo objects already nulled at `compare.html:819`. **The three items still OPEN (d, g, h) stayed in `CLAUDE.md` §D; nothing open lives only here.**

2. **COMPARE #101 , FLOW-POLISH pass, NOT a feature-build (spine is BUILT + LIVE, verified live 2026-07-16).** DONE + working (do NOT re-build): shared token-AND search (byte-identical to rankings, same player_card_mv path); verdict "The Edge" (rt decides -> exact tie breaks to AI via /api/analyse, Drury/Winter two-register voice, server-side verdict_cache by card-pair, free-for-all no auth); accolades (real honours , incl. Silverware post-#2 team-join , + profile tags via renderWonderTagsGrouped, both slots); radar (drawDualRadar from live CMP_A/B.radar); trajectory; deep-link ?a=&b=; smart back-path vvBack() wired to a visible .vvback control. The old "kill hardcoded Henry/Haaland" framing was STALE , they are demo objects nulled at compare.html:819; the spine was wired in the Batch-B sessions. REMAINING (updated 2026-07-19) , ~95% DONE: [DONE] (a) go-to-player pills (seecard -> card.html?id, 765f653); (b) user-controlled fold (wasOpen preserve + the open season list is now an ABSOLUTE dropdown so it no longer grows .matchup and displaces the Compare pill, 84d3222 + 839baba); (c) back-path verified (vvBack cold deep-link -> rankings.html, no fix needed) + subheading clip fixed (foldable heading flex->block so it wraps in the narrow 2-col grid, 84d3222); (e) C8 position filter SATISFIED (picker pos chips + passF 'pos' branch live). [NET-NEW this session, beyond the original flow-polish scope] the full **VERDICT-TAG SYSTEM** shipped (11fd7c3): 14 VERDICT_TAGS + verdictContext age-tiebreaker + Proof/Data-Confidence de-hardcoded + crown 'Edge' badge wired to the selected tag , full locked design now in §C “Compare VERDICT layer”. [OPEN] (d) picker pager "show more"/count (optional, still limit(50)); 2 residual green sub-panels in playbook (.tagdef.open .drury, .vvband.open .vvband-story) for the green=Compare-only rule. [DONE 2026-07-24] (f) **.vwho WINNER-LINE was STATIC ("edges it") regardless of rt gap** , contradicted the selected verdict tag beside it. FIXED as designed: the AI now returns a `who` key (added to the /api/analyse output contract + system-prompt spec + swapVerdict cache-swap; front-end prompt passes the selected tag + tone + both VV scores), written in the register of the chosen tag , decisive gap reads settled, finest margin keeps "edges it", tie reads as the argument continuing. `vvSetVerdict` uses `v.who`; the old hardcoded phrasing is retained ONLY as a fallback for the loading placeholder / cache-miss / error paths (NOT a client-side tone table). Age-tiebreak wording preserved via the prompt's age-tip note + the fallback branch. No DB. Verified live on the Vercel preview (Vercel holds ANTHROPIC_API_KEY; the local .env does not, so read-outs could not be generated locally , fallback degrades safely on any bad output). (g) **DRURY PROSE renders as one long paragraph** , break into 2-3 shorter paragraphs for readability. Do it at the PROMPT level (instruct /api/analyse to return paragraph breaks), NOT post-processing. Applies to the verdict prose (Compare) + card editorial. (h) **TRAJECTORY chart is cramped + axis labels unclear**, worst on a single-season player , needs a layout pass (VVCore.renderTrajectory, shared card + compare): sizing/padding + legible dual-axis labels + a sensible single-point presentation. Radar percentile-within-position stays PARKED on the engine track (provisional RADAR_REF placeholders , NOT a Compare bug). Then final polish + merge.


---

## OG/META TIER 1 , WHAT SHIPPED (relocated from `CLAUDE.md` §D, 2026-08-25)

- **[DONE 2026-08-20] og/meta + social image , TIER 1 SHIPPED (`01b0d73`).** There were ZERO og/twitter/description tags on any page; there are now 15 per page on nine pages, absolute URLs on `https://vvonderxi.com`, and `og-image.png` (1200x630) is referenced for the first time instead of sitting unused behind a cache header. **Five titles were WRONG, not merely plain** , rankings read "Web Shell", compare "Web Compare", preferences "My Club" (a different page), and all 57,234 cards read just "VVonderXI". Copy is recorded in `docs/meta_proposal.md`, which now describes LIVE pages and drifts if either side moves. **Tier 2 per-link unfurls stay post-launch**, so every shared card link still unfurls identically , that is the accepted Tier 1 boundary, not an oversight. **The tags are inert until `vvonderxi.com` actually resolves; confirm the domain is live before launch day.**


---

## RELOCATED FROM `CLAUDE.md` §C ON 2026-08-28 , VV INDEX STEP-4 EXPLAINER COPY

Drafted 2026-07-19, still NOT on the page. Deferred page copy, not an invariant , which is why it
left §C. **The one INVARIANT in the original block stayed behind in §C: display re-anchor only,
never the engine.** CLAUDE.md wins on any conflict.

**VV INDEX content + anchoring notes (drafted 2026-07-19 for the Step-4 explainer, NOT yet on the page , promoted here from the archived session log)**
- (a) League strength is measured from **980 quality-filtered TRANSFERS** (both leagues in our nine, adjacent seasons, >=900 min each side, measurable output) , "cleaner beats bigger": a mover's output delta across a real league boundary is the signal, not squad reputation.
- (b) **The Index CHART uses AVERAGE-ANCHORED display while the ENGINE stays PL-ANCHORED.** The tilt socket is AFFINE, so re-anchoring the engine would change scores. **Display re-anchor only, NEVER the engine.**
- (c) ANCHOR DISCLOSURE: we measure leagues RELATIVE TO EACH OTHER, not whether football overall rose or fell (no absolute claim about the global level over time).



---

## THE THREE LIVE PRODUCTION DEFECTS THE MERGE FIXES (relocated from `CLAUDE.md` §D, 2026-08-29)

**All three are defects in `vvonderxi_BIGGER`, not on the branch, so NONE of them can be fixed before
the merge without touching production, which the branch rule forbids.** §D keeps the decision; this
keeps the measurement. **Re-verify against the live domain before launch day , these were measured on
2026-08-27 and the deployed site can move without a commit on this branch.**

   - **[LIVE PRODUCTION DEFECT, FOUND 2026-08-27] `/api/analyse` IS DEAD ON PRODUCTION , IT REQUESTS A RETIRED MODEL, SO NO EDITORIAL HAS GENERATED ON THE LIVE SITE.** `POST https://vvonderxi.com/api/analyse` returns **HTTP 404 `{"error":"model: claude-sonnet-4-20250514"}`**. Production's `api/analyse.js` hardcodes that string at line 65; the model no longer exists, so **every verdict and every set of Commentator's Notes falls back to the outage line.** The branch is on `claude-sonnet-4-6`, so **THE MERGE FIXES IT AND NOTHING ELSE NEEDS TO** , it cannot be fixed before then without touching `vvonderxi_BIGGER`.
     - **AND IT MEANS THE CREDIT QUESTION IS STILL OPEN.** The request never reaches Anthropic, so a 404 here says NOTHING about whether the account has credit. **Do not read this as an out-of-credit signal** , that has to be tested separately, and the local `.env` carries no `ANTHROPIC_API_KEY` to test it with (§D already records that Vercel holds the key and local does not).
     - **A MODEL ID IS A DEPENDENCY WITH AN EXPIRY AND NOTHING WATCHES IT.** There is no build step and no check that the configured model still exists, so the failure mode is silent: the site keeps serving, the panels keep rendering, and the prose is simply never there. **Worth a QA item after the merge**, since the branch's model string will age exactly the same way.
   - **[LIVE PRODUCTION DEFECT, FOUND 2026-08-27] THE DEPLOYED SITE'S TITLE READS "VVonderXI — The Football Intelligence Platform". THE BRAND LINE IS "The Football LEGACY Platform", AND THE WRONG ONE IS IN `og:title` AND `<title>` ON PRODUCTION RIGHT NOW, SO EVERY UNFURLED LINK HAS CARRIED IT.** It also uses an em dash, against the house rule. **THIS IS A PRODUCTION DEFECT, NOT A BRANCH ITEM** , `redesign-compare` never says "Intelligence" in a title, so **THE MERGE FIXES IT AND NOTHING ELSE NEEDS TO**. Until the merge lands it is live and uncorrectable without touching `vvonderxi_BIGGER`, which the branch rule forbids.
   - **AND THE FIX IS NOT "PUT THE BRAND LINE IN THE TITLE".** `docs/meta_proposal.md` settled this: **"The Football Legacy Platform" is a HOME-PAGE line, at `index.html` and in compare's verdict-poster footer. It is NOT meta copy.** The branch deliberately ships PER-PAGE titles instead , "VVonderXI , Player Cards", "VVonderXI , Compare" , which is what Tier 1 was for. **Do not "restore" the brand line into nine titles.**
   - **THE DEPLOYED SITE IS NOT THIS BRANCH, AND THE GAP IS WIDER THAN THE TITLE (measured 2026-08-27 against the live domain).** `vvonderxi.com` IS live and served by Vercel , **the recorded assumption that the domain is not yet resolving is STALE.** What it serves is production, and it differs on every axis that matters to sharing: **6 `og:` + 4 `twitter:` tags against the branch's 9 + 5**; **`og:url` hardcoded to the bare domain on every page** rather than per-page; **`og-image.png?v=2`** rather than the branch's un-versioned reference; and **no `vv-core.js` at all**.
     - **SO "TIER 1 SHIPPED" IS TRUE OF THE BRANCH AND FALSE OF THE SITE.** The commit is real; it has never been deployed. **State it that way** , a reader who checks the log and not the domain will conclude the opposite, which is what happened here.
     - **AND NOTHING ON THE BRANCH HAS EVER BEEN TESTED AGAINST THE LIVE DOMAIN.** Every meta verification to date was done on local files or a preview. **The domain being live means the bot-UA `curl` checks the Tier 2 text work needs are available NOW**, which was not true when that work was scoped.


---

## THE LATENT TOOLTIP CLAMP , WHY IT IS MEASURED AND NOT FIXED (relocated from `CLAUDE.md` §D, 2026-08-29)

     - **[MEASURED 2026-08-29, NOT FIXED, AND THE REASON MATTERS] LATENT TOOLTIP CLAMP.** The shape is real: `.tip[data-tip]:hover::after` uses `left:50%; transform:translateX(-50%); width:max-content; max-width:230px` with **no horizontal clamp**, so a trigger near either edge puts half the tooltip off-screen. **But it is UNREACHABLE on both pages today, for two different reasons, and neither is 'it happens not to wrap'.**
       - **`preferences.html` declares the rule and has ZERO `data-tip` elements.** Dead CSS carrying a known-bad shape.
       - **`myclub.html` has four, and ALL FOUR sit inside `.clublayout`, which computes `display:none`** , the coming-soon overlay (`9f5c21e`) replaced the locker, so the markup carrying them is not rendered. Measured at 390px: the triggers have **zero-width boxes**, which is the tell.
       - **SO DO NOT ADD A CLAMP TO MARKUP THAT DOES NOT RENDER.** The fix belongs to whoever un-hides the locker, and it belongs in the SAME change, because that is the moment it starts cropping. **A clamp added now would be untestable and would look shipped.**
       - **AND NOTE THE INSTRUMENT FAULT, because it nearly produced a wrong bug report:** deriving the tooltip box from `trigger centre +/- max-width/2` returned a confident **115px left overflow** on all four , computed from a centre of 0, which is what a zero-width box gives you. **Assert the trigger has a non-zero box before measuring anything positioned relative to it.**

---

# PRE-MERGE QUEUE LOGGED 2026-08-30 (four items; the other three are in `POST_LAUNCH.md`)

**Each was checked against the tree before being written. Where the check disagreed with the
report, the check is what is recorded** , two of these are not what they were reported as, and
one is already fixed.

## P1. [DONE 2026-08-30] THE HOME-PAGE SUGGESTIONS NAMED PLAYERS THAT RETURN NOTHING , TWO OF THEM, NOT ONE

`index.html:313`, the rotating placeholder array. Queried against `player_card_mv`:

| placeholder | result |
|---|---|
| `Search "Thierry Henry"` | **ZERO hits** |
| `Try "Messi vs Jude Bellingham"` | **"Jude Bellingham" ZERO hits** (`J. Bellingham` exists) |
| `Try "Haaland vs Mbappé"` | both resolve |
| `Search "Rodri 23/24"` | resolves |
| `Try "Bellingham vs Lamine Yamal"` | both resolve |
| `Search "Van Dijk"` | resolves |

**The second one was not in the report and is the same defect.** `player_name` is `J. Bellingham`
and `player_name_norm` does not carry "Jude", so the platform's own front door advertises a query
its own search cannot answer. **This is now worse than it was**, because the box searches live: the
suggestion used to route away, and now it sits there returning "No seasons match".

**THE "vs" HALF OF THE REQUEST IS ALREADY DONE , DO NOT ADD ANOTHER.** Three of the six are already
`vs` examples and one is already a season example (`Rodri 23/24`), so the vocabulary is taught. The
work is replacing the two dead names, not adding a form.

**RULE WORTH KEEPING: a suggestion is a promise the search has to honour.** Any name written into
that array must be checked against `player_card_mv` first, in the abbreviated form the column
actually stores.

**FIXED:** `Thierry Henry` -> `Mohamed Salah`, `Messi vs Jude Bellingham` -> `Messi vs Bellingham`.
All six re-verified through the real path (`vvParseSearch` + `tokenAndFilter`), both sides of every
`vs`. **THE STATIC `placeholder` ATTRIBUTE ON THE INPUT CARRIED THE DEAD NAME TOO** and was fixed in
the same change , it is what every visitor sees before the rotation starts, so fixing only the array
would have left the worst instance in place. **AND "Henry" IS ITSELF A TRAP: it resolves to
A. Robertson**, so a replacement has to be checked for resolving to the player you MEANT, not merely
for returning rows.

## P2. [CLOSED 2026-08-30 , NOT A BUG] CARD SWIPE-BACK WORKS. IT IS A CORRECT NO-OP AT INDEX 0

`card.html:2072` reads `seqGo(dx < 0 ? 1 : -1)` , swipe left forward, swipe right back , and
`seqGo` accepts a negative delta. **There is no forward-only branch to find.** Two explanations fit
the symptom and they are cheap to tell apart:

- **`seqGo` returns early at `if(idx < 0) return;`.** At the FIRST card of a sequence, back is
  correctly a no-op and is indistinguishable from broken. Arriving from a share link or opening the
  top row both give index 0.
- **`SEQ` is absent**, in which case `touchstart` sets `tracking=false` and NEITHER direction works.
  Lucas reports forward working, so this one is probably not it.

**MEASURED WITH REAL TOUCH EVENTS, NOT BY READING THE CODE.** Opened rankings at 390x844, clicked
the FOURTH row to land at `SEQ.index` 3, then dispatched real `Input.dispatchTouchEvent` swipes:

```
  left : index 3 -> 4   card 142695 -> 143526   MOVED
  right: index 4 -> 3   card 143526 -> 142695   MOVED
  right: index 3 -> 2   card 142695 -> 141999   MOVED
  right: index 2 -> 1   card 141999 -> 141853   MOVED
  right: index 1 -> 0   card 141853 -> 143372   MOVED
  right: index 0 -> 0   card 143372 -> 143372   no move
```

**Swipe-back works in both directions and correctly stops at the start. CLOSED.** The report was
almost certainly made from the first card of a list, or from a card reached without a sequence at
all (a share link), where `touchstart` sets `tracking=false` and NEITHER direction fires.

**THE ONE REAL RESIDUE IS AN AFFORDANCE, NOT A DEFECT, AND IT IS NOT BEING BUILT.** On desktop the
arrows carry `.seqbtn:disabled` at `opacity:.28`, so the end of the list is visible. **On phone the
chevrons are deliberately hidden , the gesture is the control , so at index 0 a back-swipe is
silently ignored with nothing to say why.** That is what makes a correct no-op read as a broken
feature. If it is ever addressed, it belongs with the `.seqpeek` affordance, which already shows the
NEXT card and has no backward twin.

## P3. [DONE 2026-08-30, SUPPRESSION HALF] THE KEEPER CARD SHOWED OUTFIELD PANELS , `renderProof` HAD NO KEEPER GATE AT ALL

**Confirmed in the tree: `grep` for a keeper gate inside `renderProof` returns ZERO.** It picks its
dimension with `PROOF_DIMS[POOL_DIM[D.pos] || 'create']`, so a goalkeeper falls through to a
creation panel. **This is the platform making a claim it cannot support, on the one position where
it already publishes a limitation.**

**WHAT IS ALREADY KEEPER-AWARE, so it is not rebuilt:** the radar is replaced by
`VVCore.keeperPanelHTML` on card.html, and the trajectory by `keeperTrajectoryHTML` on BOTH card and
compare, with the mismatch line and an altered legend. **The five-shape and head-to-head on compare
are NOT gated.**

**SPLIT THE WORK, AND THE FIRST HALF IS PRE-MERGE:**
- **PRE-MERGE: suppress what is meaningless.** A keeper card must not render an outfield Proof
  panel. Suppressing costs nothing and removes a false claim; §C's rule is disclose, never fabricate.
- **POST-MERGE: the keeper-specific replacement** , what Proof and head-to-head should SAY about a
  keeper, and splitting Profile properly when both sides are keepers. Design work, demos required,
  logged in `POST_LAUNCH.md`.

**SUPPRESSION SHIPPED AND RENDER-VERIFIED:**

| surface | keeper | outfield control |
|---|---|---|
| `card.html` Proof | `hidden`, `display:none`, height **0** | visible, height **65** |
| `compare` head-to-head, keeper v outfield | 1 row, **0 bars**, mismatch copy | , |
| `compare` head-to-head, keeper v keeper | 1 row, **0 bars**, both-keeper copy | , |
| `compare` head-to-head, outfield v outfield | , | **5 rows, 4 bars** |

**BOTH GATES READ `pos === 'GK' || keeper`, NOT `pos` ALONE** , `keeperScore()` returns null for a
keeper who misses the minutes or shots gates, and §E records `position` as unreliable on the corrupt
2025/26 block, so either field alone would miss cards. **The copy follows the trajectory's existing
mismatch line rather than inventing a second vocabulary for the same idea.**

## P4. [DONE 2026-08-30] THE COMPARE SHARE POSTER , OPTION B SHIPPED, PLUS A RIM BUG THE DEMO EXPOSED

**THE EARLIER "cannot be captured without an AI call" NOTE WAS WRONG AND IS CORRECTED HERE.** That
diagnosis said compare keeps its card objects in closure scope. It does not , `CMP_A` and `CMP_B`
are readable from page scope, which the keeper head-to-head gate now relies on. Every failed attempt
had used `?a=127885`, **the one card logged in P5 as failing to load in compare**, so `CMP_A` was
null for a reason that had nothing to do with scope. **A wrong diagnosis that sounds structural will
stop the next person trying at all , that is why it is corrected rather than deleted.**

**METHOD THAT WORKS, no AI call and no cached verdict needed:** load a pair that loads, build the
spec by hand from `CMP_A`/`CMP_B`, and render it with `VVCore.vvShareFrameHTML(spec, F, light)` plus
`vvCentreShareCaption`. Measured on `?a=131185&b=133155` at format `x` (1200x675).

**(1) THE NUMBERS ARE IN TWO DIFFERENT TYPEFACES, IN ONE IMAGE , CONFIRMED.**
The card faces render 91 and 51 in **Barlow Condensed w800 44.88px**. The poster's own score readout
renders the SAME two numbers in **Archivo w900 17.55px**. The year (`yr`) and the small `v` are also
Barlow Condensed. So the poster disagrees with the card it is a poster of, on the one element the
whole image is about.

**(2) CORRECTED 2026-08-30 , "THE RIGHT HALF IS EMPTY" WAS MY OWN BUG, NOT THE POSTER'S.**
The first render passed a synthetic spec using `tag:` and `line:`. **The builder reads
`spec.verdictTag` and `spec.verdictLine`.** Both fields were therefore empty, which blanked the
verdict tag above the winner AND the whole verdict paragraph in the right column , and I reported the
resulting hole as a layout defect, in bold, as "worse than the report".
**Rendered with the CORRECT field names the right column is properly occupied**: the verdict tag sits
above the winner's card, the verdict prose fills 634 to 1042 of a 1200px frame, and the score readout
sits under its own rule. **The two-column composition works.**
**WHAT IS REAL: the 30px gap is tight, and it is tighter than it measures.** The winner carries a gold
rim that eats into it, so the visual separation is less than 30px , at 600px, the size X renders,
that is under 15px between two busy card faces.
**THE LESSON IS THE ONE THIS FILE KEEPS RECORDING: a synthetic fixture that is silently wrong produces
a confident finding about the wrong thing.** Same family as the 127885 control in P5, in the same
session. **Assert the fixture populated what you think it populated before measuring what it renders.**

**(3) THE BOTTOM BLOCK AND THE WORDMARK ARE ENTIRELY INTER , CONFIRMED.**
`.sf-cap` Inter w600, `.sf-tag` Inter w700 italic, `.sf-brand` Inter w800. The product's card
language is Barlow Condensed plus Archivo. **Nothing in the bottom third of the poster is set in a
typeface the card uses.**

**AND REMEMBER THE VIEWING SIZE: §C records that X renders a shared image at roughly 600px, half
this frame.** Every size above halves before anyone reads it , the 17.55px score readout becomes
about 9px.

**STILL UNVERIFIED, AND IT IS A NARROW GAP: the html2canvas capture itself.** Everything above is
measured in the RENDERED FRAME, which settles typography and geometry because those are layout
facts. It does not settle what the library additionally drops , §C is explicit that the capture is a
different renderer and that a rounded inset shadow survives a support sweep and is still absent from
the real card's corner. `vvRenderShareImage` returns something other than a data-URL string; three
attempts to unwrap it produced 15 bytes of non-PNG. **Whoever fixes this must read a real captured
PNG before believing the fix landed** , find the return shape first, it is not a string.

## P5. [DONE 2026-08-30 , AND IT WAS NOT WHAT I LOGGED] A CARD THAT DOES NOT EXIST RENDERED A SILENT BLANK

**THE PREMISE WAS WRONG. `card_id` 127885 does not "fail to load in compare" , IT HAS NEVER
EXISTED.** Absent from the before AND after snapshots of the whole matview, and there are no
card_ids at all in the 127870-127900 range. It was a bad test fixture I carried through most of a
session, and it produced three separate misreadings before anyone questioned it.

**WHAT COMPARE ACTUALLY DID WAS CORRECT.** `player_card_mv?card_id=eq.127885` returns **zero rows**,
`.single()` therefore 406s with `PGRST116 "The result contains 0 rows"`, and `fetchCard` logs and
returns null. Nothing to fix there.

**THE REAL DEFECT WAS ON card.html, AND IT IS THE ONE WORTH HAVING FOUND.** The load path did
`return` on a missing row, leaving the page on its emptied demo skeleton , blank score, blank
sub-line, every panel present, and **no not-found state anywhere**. Indistinguishable from a load
that never finished. A stale bookmark, or a link to a card merged away by a data repair, showed a
reader a blank card and told them nothing.

**FIXED: `vvCardNotFound(id, missing)`.** It replaces the hero rather than sitting beside it , a
half-rendered card next to an explanation reads as broken rather than missing. **It separates the
two cases**: `PGRST116` is the ordinary one (stale link, merged card, typed id) and gets its own
words; anything else is a real fault and says so rather than blaming the reader's link. **The scope
sentence is pulled from `VVFilters.emptyStateHTML`**, the same string rankings and the home page use,
so the platform says one thing about its own boundaries , with its own copy as a fallback rather
than an empty box.

**AND IT NAMES THE CAUSE THE REPAIR QUEUE CREATES:** seasons split across two clubs are being merged
into one card, so older links stop resolving. That is a growing population , §E puts it at 1,462 measured
cards , and this is what a reader will hit.

| id | | |
|---|---|---|
| 127885 | never existed | not-found shown, scope line present, link out |
| 999999999 | bogus | not-found shown |
| 133095 | real (control) | **no** not-found, score 91 renders |

**AND ONE CORRECTION TO WORK ALREADY REPORTED AS VERIFIED , THE SAME BAD FIXTURE VOIDED A CONTROL.**
The P3 keeper suppression was reported with an "outfield control" of 127885, which does not exist,
so `D.pos` read `CAM` off the demo default and the Proof panel measured 65px tall while showing
blank rows. **The gate itself is correct** , re-run against a real CAM (133095, De Bruyne, rt 91)
the Proof panel renders **Assists 0.64, Key passes 4.40, Shots on target 1.00** while the keeper's
stays hidden at height 0. **The fix was right and the control was worthless. A control that cannot
fail is not a control** , assert the fixture exists before trusting what it proves.



## P4 RESULT , OPTION B, AND THE RIM FIX THAT CAME WITH IT

**Option B chosen: type unified plus real separation between the cards.** `.sf-score` and `.sf-cap`
follow the card into **Barlow Condensed** (the card face is Barlow Condensed throughout, measured);
`.sf-tag` and `.sf-brand` are **Archivo**, the platform's label voice.

**THE GOLD WINNER RIM WAS NOT CENTRED, AND THE CAUSE WAS THE CARD, NOT THE RIM.** The slot is
`--cw` (264px) and so is the wrapper's content box, but the card renders at **242.9px** because
`.vvcard` carries `max-width:92%` , the clamp §C records as the reason the rendered ratio is 1.518
and not 1.397. **A block child with a max-width and no auto margins stays LEFT-aligned**, so the card
sat against the rim on the left with 21.1px of slack on the right (gap 6.0 / 27.1). `.sf-slot`
already centred the WRAPPER, which is exactly why this looked like a rim problem.
**Fix: `display:flex; justify-content:center` on `.sf-slotcard`. DO NOT nudge the border, and DO NOT
remove the 92% clamp** , it is load-bearing for the card's geometry everywhere else.

**VERIFIED IN CAPTURED PIXELS, NOT THE DOM** , a dependency-free PNG decoder reading the gold rim and
the card edge at four heights: **inset L=16 R=17, card centre 183.0 against rim centre 183.5, offset
0.5px**, identical on every row. Was 21.1px.

**AND THE FIX EXPOSED THAT THE OLD GAP WAS NEVER REAL.** The 30px between card faces WAS that
uncentred slack , spacing produced by the bug. Centring reclaimed it and the true gap collapsed to
about 19px, so the gap constant went `14 * S` -> `34 * S`, measured **44px** between faces.

**`VV_SHARE_CSS` IS SHARED, SO THE SINGLE-CARD POSTER WAS CAPTURED TOO , ALL FOUR FORMATS, BOTH
THEMES, EIGHT CAPTURES.** No horizontal overflow, no scroll overflow, no card-caption collision in
any of them. **The §C constraint that matters held: the igf/igs tagline occupies 93.8% of the usable
width against the 94% recorded on 2026-08-27** , the type change did not eat the little room that
block has left. **That bottom block is still effectively full and nothing may be added to it.**

**AND THE §C BACKTICK RULE BIT DURING THIS CHANGE.** A CSS comment written into `VV_SHARE_CSS` , a
template literal , contained backticks around `.vvcard` and a property name. `node --check` passes
that and leaves the module silently half-defined. **The `require`-and-assert-the-export guard caught
it immediately.** Keep using it; a syntax check proves a file parses, never that it means what you
wrote.


---

# RELOCATED FROM `CLAUDE.md` SS D STEP 6 ON 2026-09-01 , THE CLOSED LAUNCH-BLOCKERS

**Ten settled bullets, moved verbatim. They are CLOSED, not cancelled** , each records why a current setting is the way it is, and several read as odd without the history (an absent Vercel variable that is correct, a deployed site that was not the branch, a search fallback deliberately removed). `CLAUDE.md` SS D keeps a pointer.

**Moved because `CLAUDE.md` hit 99.0% of its truncation limit and SS F alone could not pay.**

   - **[LIVE PRODUCTION DEFECTS, MEASURED 2026-08-27] THREE THINGS ARE BROKEN ON THE DEPLOYED SITE AND THE MERGE FIXES ALL THREE , NOTHING ELSE NEEDS TO.**  **, the measurements are in `LAUNCH_STAGE.md`** **(1) `/api/analyse` IS DEAD** , production hardcodes a RETIRED model and returns 404, so **no editorial has ever generated on the live site** and every panel falls back to the outage line. The branch is on a live model. **A MODEL ID IS A DEPENDENCY WITH AN EXPIRY AND NOTHING WATCHES IT** , worth a QA item after the merge, since the branch's string ages the same way. **And the 404 says NOTHING about account credit** , the request never reaches Anthropic. **(2) THE TITLE READS "The Football Intelligence Platform"**, against the brand line, with an em dash, in `og:title` and `<title>`, so every unfurled link has carried it. **The fix is NOT to put the brand line in nine titles** , `docs/meta_proposal.md` settled that it is a HOME-PAGE line and the branch ships per-page titles deliberately. **(3) THE DEPLOYED SITE IS NOT THIS BRANCH AT ALL** , fewer meta tags, `og:url` hardcoded to the bare domain, no `vv-core.js`.
     - **SO "TIER 1 SHIPPED" IS TRUE OF THE BRANCH AND FALSE OF THE SITE. State it that way** , a reader who checks the log and not the domain concludes the opposite, which is what happened here. **`vvonderxi.com` IS live and served by Vercel; the recorded assumption that it is not yet resolving is STALE**, which also means the bot-UA `curl` checks the Tier 2 work needs are available NOW.
   - **[DONE 2026-08-20] og/meta + social image , TIER 1 SHIPPED (`01b0d73`), detail in `LAUNCH_STAGE.md`.** Two things survive the move because they are still ACTIONS: **the tags are inert until `vvonderxi.com` actually resolves, so confirm the domain is live before launch day**, and **Tier 2 per-link unfurls stay post-launch**, so every shared card link unfurls identically , the accepted Tier 1 boundary, not an oversight.
   - **[DONE 2026-08-31] THE API-FOOTBALL KEY IS ROTATED**, updated in GitHub secrets, verified authenticating (HTTP 200, Ultra, active, 0/75000 used). Fingerprints recorded in `QA_PASS.md` C5 , **`8dab9c72ec3e` -> `0c6a1822ce7b`** , so the rotation is provable rather than asserted. `BSD_API_KEY` is deleted from GitHub secrets and Vercel.
   - **AND `APIFOOTBALL_KEY` CORRECTLY DOES NOT EXIST IN VERCEL , THAT ABSENCE IS NOT A FAULT.** Every `/api/` reference in every shipping page was traced: the branch calls exactly ONE endpoint, `/api/analyse`, and **none of the four endpoints production calls reads `APIFOOTBALL_KEY` either**. The seven functions that read it are called by no page; the GitHub workflow runs them with `node` in its own runner. **Nothing was failing silently in production. Do not "fix" this by adding the key to Vercel** , see the next line for why that would be actively harmful.
   - **[DONE 2026-08-31] THE SEVEN IMPORTERS ARE OUT OF `api/` , MOVED TO `scripts/import/`, NOT GUARDED. REMOVING A WRITE SURFACE BEATS GUARDING ONE.** Same defect class as `api/search-player.js`, which §E blames for the PL 2025/26 corruption. **DEPLOYED FUNCTION COUNT 13 -> 6, AND THEN -> 3 ON 2026-08-31** when `auth.js`, `log.js` and `refresh-players.js` were removed as well , uncalled, unauthenticated, and two of the three wrote. Only `analyse`, `db` and `get-seasons` remain, and **only `/api/analyse` is called by any page.** **Well inside Hobby's cap of 12, so Vercel Pro is a CHOICE rather than a dependency.** What each removed file did, and what the accounts stage must not repeat, is in `POST_LAUNCH.md`. The two callers were updated and re-verified , the workflow's invocations, and `scripts/enrichment/gk_pen_backfill.js`, which requires eleven exports from `import-players.js` (the dependency this file already warned about). **Five of the six survivors also have no caller; `auth.js` and `log.js` are public, uncalled and WRITE. Audit in `QA_PASS.md` C11.** The original finding, for the record: **THOSE SEVEN WERE DEPLOYED, PUBLIC, UNAUTHENTICATED AND WROTE TO THE DATABASE.** No `CRON_SECRET`, no `Authorization` check, no guard of any kind on any of them. **What stops a caller today is the MISSING variable, not a guard** , which is why adding the key to Vercel would convert a dormant surface into a live one. **Same shape as `api/search-player.js`, which was retired for exactly this.** Moving them under `scripts/` also takes the deployed count 13 -> 6, back inside Hobby's cap.
   - **[SETTLED 2026-08-20] THE API-FOOTBALL KEY WAS GENUINELY EXPOSED AND ROTATION WAS REQUIRED. The repo can never show it** , the exposure was in a CHAT TRANSCRIPT, never committed, which is why every repo-side search comes back empty (evidence in `RULE_EVIDENCE.md`). **OPERATIONAL CONSTRAINT: rotate only when NO BACKFILL IS RUNNING** , a rotation mid-run kills every in-flight request and the enrichment scripts checkpoint per league-season, so a half-written run is the expensive failure. **GENERALISE IT: 'not in the repo' is not 'not leaked'. A secret can escape through a transcript, a screenshot or a paste, and no amount of grepping HEAD will ever see it , ask where it was USED, not only where it was stored.**
   - **[DECISION 2026-08-27] THE MERGE REMOVES LIVE SEARCH, AND THAT IS DELIBERATE AND CORRECT , NOT AN OMISSION.** Production's home page falls back to an online lookup when a query misses the local set; the branch has no equivalent and will not get one. **The platform is a FIXED SCORED DATASET. A live lookup returns a player the engine cannot rate, which is not a card**, so the fallback was offering something the product cannot honour. It also carried the write path that corrupted the PL 2025/26 block (§E).
   - **THE COPY CONSEQUENCE WAS FIXED IN THE SAME PASS.** With no fallback, a search that misses used to say only "No seasons match your search.", which reads as a broken site. The empty state now states the boundary , **nine leagues, 2010 onward** , and only on a SEARCH, because a visitor who is filtering is already inside the dataset and the clause list is the better answer there.
   - **[CLEARED 2026-08-30] PRODUCTION DEPLOYS AGAIN.** Its build had failed since 2026-06-15 on Hobby's 12-function cap against 16 deployed. **Vercel Pro is on, redeploy Ready in 11s, `vvonderxi.com` assigned.** The branch ships 13 functions after the BSD retirement , **still over Hobby's cap, so Pro is what makes the merge deployable**, not the reduction. Post-mortem in §C.


## Closed hygiene items relocated from `CLAUDE.md` SS D step 5, 2026-09-01

     - **[DONE 2026-08-29] PAGE-WEIGHT** , the demo markup was never the problem. The two base64 logos duplicated across nine pages are extracted to `assets/spinelogo-{dark,light}.png`; site HTML 2.78 MB -> 0.98 MB.
     - **[DONE 2026-08-29] DEAD-CSS SWEEP** , `.dicon`, `.liblabel`, `.liblede` removed, confirmed zero-reference in markup AND in JS first; **`.libgroup` IS live and was left alone.** The item said TWO dead custom properties; there were FOUR , and **`--pinkglow` died of a missing hyphen: the live token is `--pink-glow`.** A re-scan reports zero declared-but-unreferenced custom properties.
     - **[DONE , VERIFIED 2026-08-30] DELETE `foundations.html`.** Gone from the tree. **It is still named in PRODUCTION's `vercel.json` `builds` array**, harmless only because production still carries the file; the branch's `vercel.json` does not reference it at all.


---

## HYGIENE, LOGGED NOT FIXED: `playbook.html` HAS NO `prefers-reduced-motion` SUPPORT AT ALL (found 2026-09-12)

**Measured: 0 occurrences of `prefers-reduced-motion` in `playbook.html`, against 29 `transition`
declarations and one `@keyframes`.** Three other shipping pages already guard , `card.html`,
`index.html` and `vvindex.html` , so the playbook is the outlier, not the norm.

**THE PATTERN TO COPY IS ALREADY IN THE TREE, DO NOT INVENT ONE.** `card.html` uses BOTH halves:
a `@media (prefers-reduced-motion:reduce)` block that keeps opacity and drops transform and blur,
AND a JS `matchMedia('(prefers-reduced-motion: reduce)')` check that skips the animation and jumps
straight to the end state. `index.html` has the blunt version, `*{transition:none!important}`.

**DELIBERATELY NOT FIXED IN THE 2026-09-12 PASS.** Sweeping 29 transitions is its own job with its
own verification, and folding it into a feature commit would make both unreviewable. **The new
cabinet section carries its own guard**, so this is a pre-existing gap, not one that pass widened.

**WHEN IT IS DONE, IT IS NOT A FIND-AND-REPLACE.** The blunt `*{transition:none!important}` is
right for a page whose motion is decorative; the playbook's folds and the career arc use transition
to communicate state change, so those want the opacity-preserving treatment instead. **Judge them
in two groups, not one.**


---

## LEAGUE PILL COUNTS ON TAP , A ROUNDED BAND, NOT AN EXACT NUMBER (logged 2026-09-12, Lucas wants it, NOT BUILT)

**Tapping a league pill should say how much is behind it, as a BAND: "more than 10,000 season
cards", never "10,347".**

**THE BAND IS THE POINT, NOT A HEDGE.** An exact count is a number that goes stale the moment
anything is ingested, and this file already records what a written count costs , the
contrast-exceptions heading, the vvindex band populations, the `.chip.gold.career` census. A band
stays true across a re-ingest, a backfill and the transfer-halves repair, all of which are queued.

**WHERE THE NUMBER COMES FROM MATTERS AND IS NOT SETTLED.** `player_card_mv` holds 57,055 rows but
**3,061 have a null rt**, and SS C's own rule is that a null-rt row is not a scored card. So decide
before building whether the band counts ALL cards in the league or only SCORED ones, and say which
in the copy. **Do not count with a hardcoded total** , SS C: count the population, never quote it.

**BAND THRESHOLDS ARE A COPY DECISION, NOT AN ENGINEERING ONE.** "More than 10,000" reads well for
a big league and badly for a small one; BPL and the smaller leagues are a fraction of the PL's
volume, so a single threshold will either flatter the small leagues or insult them. **Bring the
thresholds to Lucas with the real per-league counts beside them.**

**SS C SIBLING STATES: the league pills appear on rankings, on the Compare picker and in the filter
rail. Whatever is decided applies to all of them in one pass, or to none.**


---

## SQUAD NUMBERS FOR 2010-2015 , A SEPARATE AND MUCH SMALLER JOB (logged 2026-09-12, NOT BUILT)

**SPLIT OUT DELIBERATELY FROM THE REJECTED CCC BACKFILL** (`POST_LAUNCH.md`) so it is not lost with
it. The backfill was rejected because twelve stat fields sit at 84 to 90% null and only assists
feeds rt. **None of that applies to a squad number.**

**WHY THIS ONE IS TRACTABLE WHERE THE OTHER IS NOT:**
- **It is a ROSTER FACT with a real source.** A squad list for a club-season is published, stable
  and checkable, which is the kind of claim the position passes returned at HIGH confidence.
- **IT HAS NO ENGINE EFFECT.** `shirt_number` appears in no scoring expression, so a fill cannot
  move a score, cannot ripple across a pool, and needs no simulation or snapshot.
- **The schema already exists.** `player_positions` carries `shirt_number` and holds **320 rows for
  2010-2015, of which 164 have a null shirt number**.

**THE SIZE, MEASURED: 19,899 of 20,219 cards in the window (98.4%) have NO `player_positions` row
at all.** So this is mostly INSERT, not UPDATE , which SS C already records for the pre-2016 era,
and an insert is the safer of the two.

**DO NOT LET IT GROW BACK INTO THE BACKFILL.** The moment a pass is asked for a shirt number AND an
assist total in the same breath, it inherits the engine problem and the era-gap problem and stops
being this job. **One field, one source, no scores touched.**

---

## OPEN BUT UNVERIFIED, MOVED FROM `CLAUDE.md` §D ON 2026-10-18, WORD FOR WORD

**Every item below was listed as open, outstanding or queued in `CLAUDE.md` §D, and none carried a check that proves it is still open. By Lucas's rule (2026-10-18) an item with no such check does not stay in the live queue. Several are known stale: §D recorded three of four 2026-10-04 "quick wins" as open when they were done. So BEFORE PROPOSING ANY ITEM FROM THIS SECTION, run a check against the tree or the database and write the check beside it; if it is still open, move it back into `CLAUDE.md` §D with that check. `CLAUDE.md` wins on any conflict.**

### BUILD TRACK (ordered, dependency-first , do in this order)

1. **TAG KEYSTONE , DONE (2026-07-19).** Eligibility 8-bucket fix, honours team-join, one FILTER_TAXONOMY, and de-orphaning of BOTH playbook surfaces (glossary `.tagdef` + library `.libtag`). All four drifting consumer surfaces reconciled against TAG_DEFS. Full narrative: §F 2026-07-19 (archived). Unbuilt ideas surfaced during removal are preserved in §D DEFERRED.
2. **COMPARE #101 , FLOW-POLISH, ~95% DONE. THE SPINE IS BUILT AND LIVE , DO NOT RE-BUILD IT.** The full closed inventory of what already works (shared token-AND search, the Edge verdict + `verdict_cache`, accolades, radar, trajectory, deep-link `?a=&b=`, `vvBack`, items a/b/c/e/f and the net-new verdict-tag system) moved to `LAUNCH_STAGE.md` on 2026-08-25. **Read it before touching Compare** , it exists so a session does not rebuild shipped work, which the stale "kill hardcoded Henry/Haaland" framing nearly caused once.
   - **THREE OPEN ITEMS, named here so they cannot be lost with the narrative:** **(d)** picker pager "show more"/count (optional, still `limit(50)`) plus 2 residual green sub-panels in playbook (`.tagdef.open .drury`, `.vvband.open .vvband-story`) for the green=Compare-only rule; **(g) [DONE, fixed at the prompt as the entry required]** Drury prose used to render as ONE long paragraph. STYLE RULE 5 in `api/analyse.js` now requires 2 to at most 3 short paragraphs for p1/p2 and TWO for the verdict, separated by `\n\n`, and `compare.html` splits on `\n\n` into separate `.vquote` elements. Never post-processing, exactly as the entry insisted; **(h)** the trajectory chart is cramped with unclear axis labels, worst on a single-season player , a layout pass on the SHARED `VVCore.renderTrajectory`, so it must be checked on card AND compare.
   - **[CLOSED 2026-09-05] The two-narrow-spikes radar was NOT a Compare bug and is now fixed at the source** , scaling is percentile within position pool (`RADAR_POOL_REF`, vv-core.js). **The collapsed axis was `goalThreat` (median 13), NOT creation or defensive, which were the healthiest at 40 and 38** , this entry said the opposite for months. Full record in §D.
3. **CARD + DESIGN-LOCK.** Wire the Proof off hardcoded Bruno; K5 trajectory VV-line chart; refined-crest shield; card-reveal flip; G/A colours; glance-on-phone. Identity line + defender flag.
4. **CONTENT + HONESTY.** [DONE 2026-08-07] VV Index honesty/method section , the nine prose blocks are now scannable cards (icon + gist + `<details>` fold), Principles is ABSORBED into it, and the section is retitled **"The Method, and Its Limits"**. **[THE COUNT THAT WAS HERE , "6 strengths / 5 limits / 1 coda" , IS STALE AND IS DELETED RATHER THAN INCREMENTED, 2026-09-08.] The section has grown since (a defender-engine disclosure was added that day) and a written count of a list that grows is a promise the list cannot keep , the same lesson SS C records against the contrast-exceptions heading. Count the `details class="wmc"` blocks in `vvindex.html` if you need a number.** See §F. REMAINING: VV Index explainer (content already drafted in the design log , lift it); five-dimensions radar voice; search empty/loading/no-result states; result-cap raise (250-500, "showing X of Y"); Data Confidence panel.
5. **MOBILE + HYGIENE SWEEP.** Tag-crop sweep (390px); Playbook dark-mode revert; enforce green=Compare-only rule (see LOCKED RULES); badge colours; em-dash sweep (spaced comma house rule); **[OPEN , logged 2026-07-21] PLATFORM-WIDE CONTRAST PASS on secondary/body text** , muted grey secondary text on the cream light-mode surface reads washed out (fails legibility, not just aesthetics). Darken the muted greys (e.g. the #8a8276 / rgba(...,0.5) family) on light mode across card/compare/rankings/playbook so secondary text holds contrast; audit against WCAG AA. security/RLS + API-Football key rotation (exposed) + og/meta + social image + contact-form endpoint + OAuth published.
   - **THE NINE QUEUED HYGIENE SPECS MOVED TO `LAUNCH_STAGE.md` ON 2026-08-19** (13,582 bytes). They are detailed specs for work that has not started, which is what the rule at the top of this file says belongs in a stage file. **Read that file when the hygiene pass starts; the DECISIONS are kept here so nothing load-bearing lives only there:**
     - **EM/EN-DASH SWEEP** , the prompt ALREADY enforces the rule twice, do NOT "add" it, and the two literal dashes in `api/analyse.js` are the rule ILLUSTRATING the forbidden characters , deleting them would gut the instruction. **[LINE NUMBERS MOVE, AND THIS ONE HAS MOVED TWICE , THE REGEX IS NOW AT `compare.html:2329`, re-measured 2026-09-12. GREP FOR IT, NEVER CITE THE NUMBER.] THE `compare.html:1342` SCORE-ROW DASH EXCEPTION NO LONGER DESCRIBES THE TREE (re-checked 2026-08-29).** Line 1342 is now `pkQ(slot,'Results')`; the line numbers moved. **The ONLY em/en dash left in any shipping HTML is `compare.html:1776`, inside a REGEX CHARACTER CLASS `[-\u2013\u2014]` that MATCHES dashes the model might emit.** It is tooling for the rule, not a violation of it, and deleting it would stop the guard working. **The sweep is effectively clean; do not go looking for a score-row dash that is no longer there.**
     - **[THE COST FIGURES IN THIS ENTRY AND IN `MERGE_READINESS` ARE STALE AND UNDERSTATE BY ROUGHLY 1.7x , RE-DERIVED FROM THE SHIPPED PROMPTS 2026-09-27. AND THE BINDING CONSTRAINT IS THE BALANCE, NOT THE CAP: $32.94 with auto-reload OFF, so requests stop dead when it empties. See QA_PASS B4b.]**
       - **MEASURED RATHER THAN QUOTED: `VERDICT_SYSTEM` is 23,820 chars, `NOTES_SYSTEM` 31,684** , about **6,600** and **8,800** input tokens before any payload. **Output is REAL, from the caches rather than estimated: a verdict generates a median 2,424 chars (~673 tok) and a note 1,947 (~541), n=130 and n=177.** Token counts are chars/3.6 because no Anthropic key exists locally; the console is the authority.
       - **PROMPT CACHING IS ON AND IT IS THE WHOLE ECONOMICS OF A BATCH** , both branches send `cache_control: {type:'ephemeral'}`. A cache READ is a tenth of the input rate and a WRITE is 1.25x, on a **5-minute** TTL. **So a back-to-back warming run pays about a tenth on the biggest component, and a LIVE site with sporadic traffic mostly pays the 1.25x WRITE and is more expensive per call than no caching at all.** At published Sonnet rates a verdict is roughly **$0.037 cold and $0.014 warm**, a note **$0.043 and $0.013**.
       - **THE RECORDED $0.018 AND $0.024 PREDATE PROMPT GROWTH** (Path B, the honours block, the rule 4 edits). **Do not quote them.**
     - **rt>=95 VERDICT PRE-WARM** , 65 pairs, ~$0.70, OPTIONAL polish that fixes nothing. Needs `ANTHROPIC_API_KEY` in local `.env` temporarily; **blank it afterwards.**
       - **[SCOPED AND DEFERRED 2026-09-13, punchlist item 27. THE TRIGGER IS THE WHOLE ENTRY: WARM AFTER THE NEXT PROMPT EDIT, NEVER BEFORE.]** `VERDICT_VERSION` is `PROMPT_REV + fingerprint(VERDICT_SYSTEM)`, so **any** prompt change discards every warmed row. **Item 25, the rule 4 under-marking fix, is an agreed and PENDING prompt edit**, so warming today is money spent twice. Evidence that this is not theoretical: `notes_cache` holds **362 rows and exactly ONE carries the current version**. `stats_hash` is a second invalidator, and the queued matview sitting can move it.
       - **THE TARGET LIST IS THREE PAIRS, AND THE HONEST NAME FOR IT IS "WHAT WE HAPPENED TO LINK", NOT "POPULAR".** With no traffic there is no popularity. Compare's empty state carries **three suggested matchups**, resolved against live rows , those are the guaranteed first comparison for any visitor who does not type, which is the only real signal that exists. **Warming by FAME was rejected on principle: SS C's anchor guardrail says famous names are a read-out and never a dial, and a fame-keyed warm list reintroduces exactly that by the back door.** The rt>=95 band above is defensible and is a band, not a popularity claim.
       - **AND THE 26-SECOND WAIT IS A UX PROBLEM BEFORE IT IS A COST PROBLEM.** Item 3's wait state , the loader at the top of the compare panel , is built and awaiting Lucas. **A well-handled 26 seconds is a different product from a blank one, and that fix is free and already done.** Ship it before spending anything on cache.
         - **[IT IS LIVE, NOT PENDING , VERIFIED IN THE CODE 2026-10-04, AND "awaiting Lucas" ABOVE READS AS "not shipped".]** It was re-proposed as a pre-flip quick win on the strength of that wording and is in fact complete: `#mvWait` is in the markup, `vvSetVerdict` toggles `.matchup.waiting` through **one state switch rather than at the three call sites** (so a path added later cannot forget), `.matchup.waiting .mvwait{display:flex}` lays it out at **every** width, and the slot is filled with `VVCore.vvLoader({size:64, label:'Reading the seasons', withText:true})`. There is even a `vvHoldLoader` across the three loader nodes so a fast answer cannot flash it.
         - **SO THE OPEN PART IS LUCAS'S EYES ON A REAL PHONE, NOT A BUILD** , which is a different item and should be worded as one. **A plan line that says "awaiting Lucas" about finished work is indistinguishable from one that says "not done"**, and that is the whole SS D failure mode.
       - **ORDER: item 3's wait state, then item 25's prompt edit, THEN warm the three suggested matchups. Then let real traffic define the list.** Cost is roughly a penny a pair, so the sum is not the constraint; the prompt fingerprint is.
     - **NO LINTING ON THE INLINE BLOCKS** , three of the four 2026-08-11 silent failures would have been caught by one. `node --check` does NOT reach inline `<script>`.
     - **`vvFoldSections` UNDER-REPORTS** , cosmetic, and left inconsistent DELIBERATELY: fix all four sections together or none.
     - **THREE CLOSED HYGIENE ITEMS MOVED TO `LAUNCH_STAGE.md` 2026-09-01:** the page-weight extraction (2.78 MB -> 0.98 MB), the dead-CSS sweep, and the `foundations.html` deletion. **The last one still matters at merge time , production's `vercel.json` names a file that no longer exists.**
     - **GIT-HISTORY EMAIL SCRUB** , only matters IF the repo goes public; a history rewrite, so a deliberate decision not a silent assumption.
     - **[MEASURED 2026-08-29, NOT FIXED, AND THE REASON MATTERS] LATENT TOOLTIP CLAMP.**  **, the per-page measurement is in `LAUNCH_STAGE.md`** `.tip[data-tip]:hover::after` has no horizontal clamp, so a trigger near either edge puts half the tooltip off-screen. **But it is UNREACHABLE on both pages today** , `preferences.html` declares the rule and has ZERO `data-tip` elements, and `myclub.html`'s four all sit inside `.clublayout`, which computes `display:none` behind the coming-soon overlay. **DO NOT ADD A CLAMP TO MARKUP THAT DOES NOT RENDER.** The fix belongs to whoever un-hides the locker, in the SAME change, because that is the moment it starts cropping.
       - **AND NOTE THE INSTRUMENT FAULT, because it nearly produced a wrong bug report:** deriving the tooltip box from `trigger centre +/- max-width/2` returned a confident 115px overflow on all four , computed from a centre of 0, which is what a zero-width box gives you. **Assert the trigger has a non-zero box before measuring anything positioned relative to it.**
       - **[THE SAME CLASS WAS HIT FOR REAL ON 2026-09-12, REACHABLE RATHER THAN LATENT, AND THE FIX IS RECORDED HERE SO THE TWO ABOVE DO NOT RE-DERIVE IT.]** The Playbook's new league-chip popover is chip-anchored on desktop (`left:50%` + `translateX(-50%)`, 232px wide) and **at 390 it ran off the right edge on the last chips , scrollWidth 414 against clientWidth 388, 26px gone, with no scrollbar to say so.** Unlike `preferences`/`myclub` this one RENDERS, so it was a live defect rather than a latent one.
         - **THE FIX IS AN ANCHOR SWAP, NOT A CLAMP, AND IT IS WHY NO ARITHMETIC IS NEEDED: drop `position:relative` from the CHIP at phone width so the absolutely-positioned panel resolves against the STRIP instead, then `left:0;right:0;width:auto`.** The panel then spans its container by construction and **cannot exceed it at any width or any chip position** , verified by opening all nine in turn, zero overflow on every one. A clamp computes a number that can be wrong; a container-anchored panel has no number to get wrong. **That is the pattern to reuse on `preferences` and `myclub`.**
         - **AND THE FIRST ATTEMPT SILENTLY LOST, WHICH IS THIS FILE'S OWN MEDIA-QUERY RULE BITING AGAIN.** The `@media (max-width:720px)` block was written ABOVE the `.lgtip` rules it had to override. **The query matched (`matchMedia` true) and the computed `position` still read `static`** , so "the query fired" proved nothing. The block is now LAST in the sheet with a comment saying it must stay there. **Verify the COMPUTED VALUE, never that the media query matched.**
6. **MERGE + LAUNCH. [DONE , LIVE ON vvonderxi.com SINCE 2026-10-08, FIRST PRODUCTION DEPLOY `dad8b16`.]** Final QA pass; merge redesign-compare -> vvonderxi_BIGGER; waitlist live. **Everything below in this step describes the road to that deploy; none of it is a pending gate now.**
   - **THE QA PASS IS WRITTEN AND LIVES IN `QA_PASS.md` (2026-08-27). IT DID NOT EXIST BEFORE THAT** , this step and the handover both called it "the only gate" for months while nothing anywhere said what it checked. **Four groups: automated, live-domain, needs-Lucas, post-deploy. THE ITEM COUNT IS DELIBERATELY NOT WRITTEN HERE , it was recorded as 42 and is 44, because A0 was added and the list grows. `grep -c "^### [A-D][0-9]" QA_PASS.md` is the answer, and a number in this sentence is a promise it cannot keep , the same lesson this file records against the contrast-exceptions heading.**
   - **EVERY ITEM IS what-to-check / how-to-check / what-a-pass-looks-like, AND NO ITEM MAY BE SATISFIED BY READING CODE** , this session alone produced six defects that only a rendered or executed check could find, and reading the source would have passed all six. **Where an item can produce a false pass it carries a control; if the control does not behave, the result is void.**
   - **RE-MEASURE BEFORE RUNNING IT.** The pass is scoped to **599 commits, 186 files, +205,155 / -10,204** measured 2026-08-27, against the 517/167 the plan had recorded. **If the figures have moved, the surface has moved.**
   - **[THE MERGE SHAPE BELOW IS SUPERSEDED. RE-MEASURED 2026-09-12 AFTER A FRESH FETCH, AND THE FIRST MERGE HAS ALREADY HAPPENED.]** `4c8ce8a`, **2026-09-06**, *"Merge redesign-compare into vvonderxi_BIGGER , the platform returns, adopting the branch's tree"*, parents `afb9970` and `32b19da`. **`vvonderxi_BIGGER` now carries the platform** , card.html, compare.html, vv-core.js and index.html are all on it.
     - **THE CURRENT SHAPE: merge-base `32b19dab`; `origin/vvonderxi_BIGGER` = `4c8ce8a`, ELEVEN ahead (ten holding-page commits plus that merge); `origin/redesign-compare` = 85 ahead.** So what remains is **85 commits of drift**, not an atomic first merge.
     - **AND IT IS CLEAN: `git merge-tree` over 3.7 MB of output reports ZERO conflict blocks, and ZERO files exist on BIGGER that are absent from redesign**, so nothing would be silently deleted , which is the exact danger `4c8ce8a`'s own message records from the previous attempt (22 conflicts and 183 files silently dropped by a naive three-way).
     - **BIGGER IS SIMPLY BEHIND: it has no `vv-margin.js` and zero `cabinetLayer` against redesign's two.** That is drift, not divergence.
     - **[TRUE ON 2026-09-12, FALSE SINCE 2026-10-08.] THE REAL GATE WAS THE VERCEL SETTING: Production then tracked `coming-soon`, so merging to `vvonderxi_BIGGER` deployed nothing.** The flip happened on 2026-10-08 and Production now deploys `vvonderxi_BIGGER`.
   - [SUPERSEDED, KEPT FOR THE RECORD] clean FAST-FORWARD, ZERO conflicts. `vvonderxi_BIGGER` (local AND origin) tip == the merge-base (`5bdbadb`); production is a STRICT ANCESTOR, 0 ahead, so it never received independent commits and nothing can conflict.
   - **BUT THE MERGE IS ATOMIC AND IT IS NOW ROUGHLY DOUBLE WHAT THIS PLAN WAS WRITTEN AGAINST. MEASURED 2026-08-20: 167 files, +201,009 / -9,571 lines, 517 commits** (against ~91 files / +72k / 275 commits on 2026-07-19). **A fast-forward has NO merge commit and NO merge-review safety net , the ONLY gate is the Step-6 QA pass on the branch BEFORE merging.** So the drift is not bookkeeping: that single gate now covers almost twice the surface. **Scope the QA pass to the MEASURED figures and re-measure first , the branch keeps moving.**
   - **SEQUENCING (hard rule):** Step 5 hygiene , API-Football key rotation, OAuth published, vercel.json review , MUST land BEFORE the merge/deploy, not after (the merge = production the instant it deploys).
     - **[ALL THREE ARE CLOSED , CORRECTED TWICE ON 2026-09-19.] `QA_PASS.md` C5 records the API-Football key ROTATED on 2026-08-31, provably: fingerprint `sha256[:12]` `8dab9c72ec3e` -> `0c6a1822ce7b`, and the key in local `.env` fingerprints to `0c6a1822ce7b` (checked 2026-09-19). C7 records OAuth PUBLISHED (out of test mode, Email and Google both enabled) and `vercel.json` REVIEWED, both 2026-09-06.** Same shape SS D keeps producing: a plan line that is not updated when the work closes, and a session reading it starts work that is finished.
       - **AND THE FIRST CORRECTION REPEATED THE ERROR IT WAS FIXING.** `b7566a7` closed OAuth and `vercel.json` off C7 and declared the rotation "the only one still open" , without reading C5, the item directly above C7 in the same file. **A correction scoped to the item you were looking at inherits every other stale claim in the line.** Read every QA item the plan line names, not only the one that prompted the edit.
       - **ONE HALF OF C5 IS UNCONFIRMED AND IS HELD, NOT FAILED: the old key being DEAD.** C5's record shows the new key authenticating; it does not show the old one being refused. Lucas to confirm in the provider dashboard.
     - **AND THE PARENTHETICAL IS ALSO STALE, WHICH CHANGES WHEN THE RULE BINDS.** "The merge = production the instant it deploys" stopped being true when Vercel's production branch moved to `coming-soon`, and the 2026-09-06 merge deployed nothing. **The rule binds at the DEPLOY, not at the merge.** [Since 2026-10-08 Production deploys `vvonderxi_BIGGER` again, so a push there IS the deploy.] C7 carries the corrected reasoning.
     - **OAUTH IS A PASS WITH NOTHING BEHIND IT AND MUST NOT BE READ AS "ACCOUNTS WORK".** The provider is configured and idle: `api/auth.js` is deleted, `locker_profiles` holds 0 rows, and no shipping page has a sign-in control. Publishing was done now because provider review is the SLOW half and cannot be done on launch day.
   - **THE CLOSED LAUNCH-BLOCKERS ARE IN `LAUNCH_STAGE.md` , RELOCATED 2026-09-01 (ninth relief pass).** Ten settled bullets: the three live production defects and the fact that TIER 1 IS TRUE OF THE BRANCH AND WAS FALSE OF THE SITE, the og/meta Tier 1 ship, the API-Football key exposure AND its rotation, why `APIFOOTBALL_KEY` correctly does not exist in Vercel, the seven importers moving out of `api/`, the live-search removal and its copy fix, and production deploying again. **Read it before the merge , they are CLOSED, not cancelled, and several are the reason a current setting looks odd.**
   - **[DONE , THE MERGE AND THE DEPLOY HAPPENED 2026-10-08.] PRE-MERGE CHECK:** run `git fetch origin` in Terminal C immediately before merging, then re-measure the merge-base and both ahead-counts , **do NOT check for "0-ahead", which is the superseded shape.** BIGGER is expected to be 11 ahead of `32b19dab` and redesign far more; what matters is that `git merge-tree` still reports no conflicts and that no file exists on BIGGER and not on redesign.

### FILTER FOLLOW-UP (VVFilters) , FULL SPEC IN `LAUNCH_STAGE.md` (logged 2026-08-13, moved 2026-08-19, NOT built)
ONE session, and every item benefits ALL THREE surfaces, because the component is shared. **[DONE 2026-08-20 , `0260a90` + `ebf9534`] ROW CSS INTO vv-core IS SHIPPED; the rest of this stage is untouched.** 148 rules moved (116 grid + 32 season), replacing 296 rule instances across three files; rankings 358 -> 242, card 717 -> 569, compare 712 -> 680. Two namespaces, `.vvrows` and `.vvrows-season`, because both sets style `.rmini` and `.rtag` with DIFFERENT values and one namespace would make them collide with each other. `.vvrows.vvrows` is deliberate: those rules carried the container ID, and a single class would let `body.light` start beating them. **The copies were byte-IDENTICAL before the move, measured, so no surface changed** , proven by diffing every computed property on 5,776 element states across three surfaces, two themes and 390/1920: ZERO differences. **The verification earned its keep: the FIRST attempt produced 2,050 differences**, because `.pillmode .urow` is a descendant selector whose mode class sits ON the container, so prefixing it matched nothing and every row grew from 80px to 637px tall. **A follow-up guard (`ebf9534`) warns once per surface when rows render with no namespace ancestor**, because the opt-in reproduces the same silent failure otherwise. **The compare picker still uses `pkRow` and was deliberately NOT switched** , a behavioural change to a live surface, kept separate so a failure can be attributed. The remaining decisions that must survive: **[DONE 2026-09-12 , `a4f4e08`. HONOURS ACTIVATION IS NO LONGER BLOCKED AND THIS ENTRY USED TO SAY IT WAS STRUCTURAL.]** Six honour types filter server-side off the flags the 2026-09-04 matview swap added: `h_ballon_dor`, `h_ucl_winner`, `h_league_champion`, `h_player_of_season`, `h_golden_boot`, `h_top_assists`. The old text , "PostgREST cannot filter the matview by the separate honours table, so it needs the flags ON the matview" , diagnosed it correctly and the flags then landed. **The inert "soon" chips are deliberate , do NOT "fix" them by hiding them**, they teach the vocabulary before the data exists. **TRAJECTORY GROUP is wired and hidden**, and populates itself the moment the four trajectory tags ship.
### DEFECTS LOGGED 2026-08-24 , **FULL RECORD IN `RULE_EVIDENCE.md`** (relocated 2026-09-01). Five of seven closed 2026-08-25; the sixth and seventh are below.
- **TWO DECISIONS FROM THAT BATCH MUST NOT BE REVERTED:** a function that escapes ON PURPOSE cannot also be the path a marker arrives by , `vvSetVerdict`/`vvSetStory` take model output, so `textContent` is correct and the wait comes through `vvWaitHTML` behind an `opts.wait` flag; and **the share control is labelled from `VVCore.vvShareCapability()`, never a fixed string**, because `navigator.share` is undefined on desktop and a button reading "Share this verdict" that downloads reports an outcome that did not happen.
- **[OPEN] "Save image" appears to do nothing , BLOCKED ON A HUMAN EYE, NOT ON A FIX.** The toast is UNMEASURED and both attempts to measure it were artefacts: a hidden tab clamps timers and freezes transitions, which manufactures exactly this symptom (five 50ms timers took 4,497ms, an 18x throttle). **Assert `document.visibilityState === 'visible'` and that a 50ms timer takes ~50ms BEFORE trusting any duration, opacity or transition reading.** What needs no browser: the CSS is present and correctly specific, `vvToast` clears its own timer and sets 3400ms, `vvLedgerSpec()` returns a valid spec, and the share row is always-visible markup with no sheet that could close over the feedback.

### UI HYGIENE / MOBILE-POLISH BATCH , **see `LAUNCH_STAGE.md`** (8 real-device items, logged 2026-08-02, NOT built; the two that needed diagnosis are ALREADY DIAGNOSED there , do not re-investigate).
### IMPROVEMENTS BATCH , **see `LAUNCH_STAGE.md`** (quick fixes + a demo-driven Compare-filter redesign, logged 2026-08-02, NOT built).
### TWO UNCLOSED VERIFICATION POINTS , **see `LAUNCH_STAGE.md`** (from 2026-07-24, moved 2026-08-24)
Both are shipped-but-unconfirmed and neither is a known bug , **"Lucas to look and confirm", not a build.** The Compare season-fold was hardened without a confirmed repro (`52171a0`); the Compare season ORDER was deliberately NOT changed because the source is already newest-first and inverting correct code would have broken it. **Do not silently assume either is fine.**

### PRE-LAUNCH POLISH / BUG QUEUE , **see `LAUNCH_STAGE.md`** (logged 2026-07-27, moved 2026-08-24)
Ten of twelve items are closed. **THREE OPEN THREADS, named here so they cannot be lost with the narrative:**
- **[CLOSED 2026-08-29, IT WAS ALREADY BUILT , THIS ITEM WAS STALE, NOT OUTSTANDING.] DESKTOP MY CLUB COMING-SOON.** `myclub.html` carries a full coming-soon treatment and has since **`9f5c21e`** ("coming-soon overlay , card-back wall replaces the fabricated locker"): a "Coming soon" eyebrow, the value line, an email capture with a Notify button, and a failure message that KEEPS the typed address. **The §D text saying it "still presents as a live page with no coming-soon treatment" was wrong when I re-read it, and would have caused a rebuild of shipped work.**
  - **THE ONE REAL RESIDUE IS A DECISION, NOT A BUG, AND IT IS LUCAS'S: the two coming-soon surfaces use two different treatments.** `iwonder.html` uses `.comingpill` , a pink pill, 1px border, glowing dot. `myclub.html` uses `.mceyebrow` , plain gold uppercase text, no pill, no dot. **Both are deliberate-looking and neither is broken.** Unifying them is a visual change to a live page, so it is not being made silently. **§C's sibling-states rule applies: if they are unified, look at both together at the size they ship at, not one in isolation.**
  - **STILL TRUE FROM THE ORIGINAL ITEM: `myclub.html` has no active bottom-nav tab but IS still in the hamburger drawer on all nine pages**, so it remains publicly reachable. That is consistent with a coming-soon page and is not a defect.
- **[CLOSED 2026-09-05] THE OVERLAID RADAR RENDERED AS TWO NARROW SPIKES**, on BOTH card and compare. **Scaling is now PERCENTILE WITHIN POSITION POOL** , `RADAR_POOL_REF` in `vv-core.js`, generated by `scripts/gen-radar-ref.js`. The four fixed `RADAR_REF` constants are gone.
  - **MEASURED BEFORE AND AFTER, all 57,055 cards.** The pool gap that was the whole defect is closed: **goalThreat median CB 6 / ST 40 became CB 48 / ST 46**, and every pool now centres near 50 on every axis by construction. **Radars with at most two axes reaching 25/100 fell from 10,395 (28.9% of rendered) to 8,625 (24.6%)**.
  - **THE REMAINING 24.6% IS NOT THE SAME DEFECT AND MUST NOT BE "FIXED" THE SAME WAY.** Decomposed: **34% of it (2,930 cards) is NR-limited** , only three axes measured, so three strong axes are impossible by construction , and the other **5,695 (16.3% of rendered) genuinely sit low across four or five measured axes.** In a percentile system a below-average season is SUPPOSED to draw small. Driving this number to zero would mean re-inflating the scale.
  - **IT IS STAGE ONE OF TWO, BY DECISION.** `RADAR_POOL_REF` is an EMBEDDED SNAPSHOT with the same standing hazard as `KEEPER_SAVE_LADDER` , **nothing warns you when it goes stale, so regenerate it after any re-ingest, the transfer-halves repair, or a position backfill.** Real `percent_rank` columns land at the shared matview rebuild. **The snapshot uses FRACTION STRICTLY BELOW, which is what Postgres `percent_rank` returns**, precisely so that swap moves nobody's radar.
  - **KEEPERS NOW SUPPRESS EVERYWHERE, AND THIS FIXED A LIVE COMPARE DEFECT.** `card.html` always swapped in the keeper panel, but **`compare.html` never gated on position at all, so 966 keeper cards drew an outfield pentagon** (GK pool medians: goalThreat 0, creation 3, defensive 2). The gate is now in `radarFor` itself, so every surface inherits it. **`raw` goes null too, not just `scaled`**, because `raw` is what the AI prompt cites.
  - **NULL-POOL CARDS FALL BACK TO THE COARSE DEF/MID/FWD, which is the engine's own convention** (`pos_pct` and `posvol_pct` already partition on `COALESCE(s.pool, s.pos)`). **This does NOT breach the §C null-pool rule, which is scoped to IDENTITY TAGS** , a percentile is a comparison, not a claim that a player occupies a position. Worth 3,123 radars: 35% of cards carry no pool, but 84.4% of those already suppress.
  - **STILL OPEN, DELIBERATELY OUT OF SCOPE: the three unused denominators.** `shots_total`, `dribbles_attempts` and `duels_total` are on the matview and well populated 2015+ (87.7% / 89.2% / 93.3%), so the radar plots successes as rates and **never accuracy**. Adding them changes what the five dimensions MEAN, which touches the Playbook copy, the AI prompt payload and every cached verdict. **`passes_accuracy` is the fourth and is NOT usable** , §E records it as invalid rather than sparse.
  - **[CORRECTED 2026-09-05. THIS ENTRY NAMED THE WRONG THREE AXES AND WOULD HAVE SENT A SESSION TO FIX THE HEALTHY ONES.]** It read *"Creation, Progression and Defensive read ~0"*. Measured with the shipped `radarFor` over all 57,055 cards, those are the **healthiest** axes , median scaled **creation 40, defensive 38, progression 36**. **The collapsed axis is `goalThreat`, median 13**, and reliability sits at 44.
  - **THE CAUSE IS NOT THAT THE CONSTANTS ARE TOO HIGH, IT IS THAT THERE ARE ONLY FOUR OF THEM FOR EIGHT POOLS.** `RADAR_REF` is one denominator set applied to every position, so an axis that is central to one pool and irrelevant to another is scored on the same bar. **On that single denominator, goalThreat reads a median of 6 for CB and 40 for ST**; defensive reads 41 for CB and 21 for ST. Raising or lowering a shared constant moves both together and cannot fix either.
  - **THE MEASURED SYMPTOM IS 28.9% OF RENDERED RADARS HAVING AT MOST TWO AXES REACH 25/100** , 10,395 of 35,972. That is the "two narrow spikes", counted.
  - **THE NR BEHAVIOUR IS CORRECT AND IS NOT PART OF THIS DEFECT , DO NOT "FIX" IT.** A dimension is NR when ANY input is absent and 37.0% of cards suppress the chart entirely (21,083). That is the platform's own NR rule working, and the comment block in `radarFor` records what it cost to get right.
- **PORTUGAL'S SQUAD NUMBERS ARE NOT RECOVERABLE FROM WIKIPEDIA AND THAT IS A CEILING, NOT A TUNING FAILURE (measured 2026-09-13, and it CORRECTS my own earlier diagnosis).** A generic search found 0 of 14 Portuguese clubs; per-edition query templates lifted it to 3, and I recorded at the time that the rest were "very likely recoverable with a better query". **They are not.**
- **THE CHECK THAT SETTLED IT DID NOT ASSUME A TITLE**, which is the whole point after being wrong three times on exactly that distinction. Instead of searching for a phrasing, read what the LEAGUE season page links to, and read the category. `Primeira Liga de 2016-17` links to **three** club-season pages , Porto, Benfica and Olhanense , and `Categoria:Temporadas de clubes de futebol de Portugal` has **THREE members**: Benfica, Porto, Braga.
- **SO pt.wikipedia CARRIES SEASON PAGES FOR THE BIG CLUBS ONLY, and the resolver already finds them.** The other eleven clubs have no season article in any edition checked. **Searching harder cannot produce a page that was never written**, and the correct next move for those cards is a different source entirely (Transfermarkt, or the clubs' own sites) or leaving them unfilled.
- **THE GENERAL SHAPE, because it is the mirror of the earlier finding: "the failure was the question, not the data" is TRUE UNTIL IT IS NOT, and the two look identical from a search box.** A zero result is the same whether a page is unreachable or absent. **What distinguishes them is asking a question that does not mention a title at all** , what links here, what is in the category. Do that BEFORE concluding either way.

**THE CARD'S TWO NAVIGATION AXES HAVE OPPOSITE POLISH, AND THE ONE THAT LOOKED FINISHED IS THE ONE NOBODY BUILT (found 2026-09-13, punchlist item 23).** `switchSeason` already calls **`vvCardFlip`** , 800ms, a 3D `rotateY(0->360)` on desktop and a scale-swap through the VV coin on mobile, coin tier from prestige. **`seqGo` has NO transition at all**: `window.scrollTo(top)` then `await loadCard()`, a hard cut.
- **THE REQUEST CAME IN WITH IT BACKWARDS, AND THE INSTINCT BEHIND IT IS USUALLY RIGHT.** Horizontal was named as the model to follow and vertical as the thing needing work. **Copy the thing that feels finished is a good rule; it failed here because the thing that felt finished was the one with nothing in it** , a hard cut has no jank, no half-frames and no stutter, so it can read as deliberate restraint rather than as an absence. **A missing transition is invisible in exactly the way a bad one is not.**
- **SO THEY MOVE TOGETHER OR NOT AT ALL.** One function, one grammar: same 800ms, same `cubic-bezier(.5,0,.5,1)`, different axis. Doing them separately is two passes over `vvCardFlip` and a window where the two axes disagree.
- **AND THE CARD IS NOT THE HEAVY THING THE QUESTION ASSUMED , 43 DOM NODES, 2 SVGs, ONE RASTER, 300x455 at `--cw` 326 on a 390 phone.** The expensive part of a season switch is the network round trip inside `switchSeason`, not the paint.
- **FRAME TIMING CANNOT BE MEASURED FROM THIS HARNESS AND MUST NOT BE ESTIMATED.** The tab reports `hidden`, a 50ms timer took **919ms**, and `requestAnimationFrame` does not fire at all , which hangs the call rather than returning a bad number. `_demo_motion.html` therefore carries its own on-screen frame meter (worst frame, dropped frames, fps) so the measurement is taken on a real device. **Worst frame beats average: a mean of 58fps with one 120ms stall is a bad transition wearing a good number.**

**[OPEN] PREMIUM TRAJECTORY , Option 3** (VV score in its own lane, bars in the lower ~70%, a slim sparkline strip above with its own mini-axis). Needs the vertical room a redesign allows. Shared renderer `VVCore.renderTrajectory`, so any change must be checked on card AND compare.

### OPEN , COMPARE'S PHONE FLOW: ONE REAL COST, TWO MINOR, SCOPED NOT BUILT (audited 2026-09-16 at 390, single iframe, viewport asserted)
**THE FLOW IS NOT THE PROBLEM AND THE AUDIT SAYS SO WITH NUMBERS , do not redesign it on a feeling.** The empty state is **810px against a 780 viewport**, one screen, with the Compare button at **top 400** and nothing below the fold that matters. The picker panel is **574px of which 406px is results, 71%**, which is efficient.
- **THE ONE REAL COST IS THE FILTER RAIL EXPANDING IN FLOW: 1,310px of chips, eight groups, 58 chips, 1.7 screenfuls before a single result.** The two largest groups are **357px (16 chips)** and **226px (9)** , 583px of the 1,212 measured. On desktop the rail is a column beside a grid; at 390 it stacks into a wall. **The fix demoed is the smallest one: a `max-height` plus `overflow:auto` under the phone media query, which keeps the results on screen (measured 299px visible against 0 today) and changes nothing about the flow.** An overlay-with-Apply is the better phone pattern and introduces a mode and a control, which is more than the problem needs.
- **MINOR, AND BOTH ARE JUDGEMENT RATHER THAN DEFECT:** the "Add to my club" buttons sit **between the cards and the Compare button**, the most valuable space on the screen, advertising a feature that is not live; and several tap targets are under the 44px minimum , back button **55x26**, add-to-club **155x31**, mode toggle **38x38**.
- **AN INSTRUMENT FAULT WORTH KEEPING: a visibility filter that ignores `opacity` reports a dormant overlay as a full-screen blocker.** The first pass of this audit reported `.joinscrim` covering the entire viewport. It is `opacity:0; pointer-events:none` , inert. **Filter on the computed opacity AND every ancestor's, or a hidden element reads as the most prominent thing on the page.**

### OPEN , CARRIED OUT OF THE 2026-08-28 TO 2026-10-08 SESSION LOGS BEFORE THEY WERE ARCHIVED (2026-10-18)
**These were the only places these items were written down in this file. Relocation moves closed history only, so an open item inside an archived entry is a lost item. None was re-checked today unless it says so.**
- **TWO SIMULTANEOUS FIRST REQUESTS FOR ONE UNCACHED PAIR BOTH GENERATE (measured 2026-10-08, three tabs within 1.7s: two model calls, one refused by the concurrency limit, last writer wins the cache).** No corruption, one duplicated generation. A per-pair lock would close it and was judged not worth a dependency at that traffic. **Moot while prose is off; re-decide before it returns.**
- **THE ANTHROPIC BALANCE IS WATCHED BY NOTHING.** Recorded at $32.94 on 2026-09-27 with auto-reload off, before about $9 of warming; the global 300-an-hour ceiling permits about $312 a day (2026-10-04), so the ceiling does not protect the balance. QA_PASS B4b is the fix and is Lucas's. **Generation is zero while prose is off, so the exposure returns with prose.**
- **THE SHARE POSTER ENLARGES A 150px HEADSHOT 3.65x AND NO LARGER SOURCE EXISTS (2026-10-04).** A product call, Lucas's.
- **`top_assists` SOURCING HAS 33 OF 46 LEAGUE-SEASONS LEFT (2026-09-12).** Commission card resolution FIRST on any next external pass; spec in `docs/TOP_ASSISTS_SOURCING_SPEC.md`.
- **FROM 2026-09-19, ROUTED TO `docs/HANDOVER_2026-09-19.md` AND `docs/PUNCHLIST.md`:** punchlist 36 (the BAM club-name check reads false on 93 of 94 completed seasons); `.pghint` and the continental chip glyphs as demos; whether the story and scout prose take Fraunces; the Eredivisie overlap (Lucas).

### OPEN , CARRIED OUT OF THE 2026-08-11/13 SESSION LOGS BEFORE THEY WERE ARCHIVED (2026-08-14)
These three were the ONLY live items inside those entries. Everything else in them is closed history and now lives in `CLAUDE_ARCHIVE.md`. **They are recorded here because relocation moves CLOSED history only , an open item inside an archived entry is a lost item.**
- **[CLOSED 2026-08-21] `compare.html` DIV IMBALANCE AND CSS COMMENT PAIR , BOTH BALANCED. DO NOT RE-OPEN IT ON A RAW COUNT** , a naive scan still reports `/*` 141 against `*/` 142 and that extra one is inside a REGEX LITERAL, not a comment. Evidence in `SILENT_FAILURES.md`.
- **THE HOME-PAGE VERSUS REGEX STILL ROUTES A THREE-WORD NAME TO COMPARE.** "Anthony V Smith" is read as "Anthony v Smith" and now fills **two unrelated players** rather than showing an empty page, which is worse than the original symptom. **The real fix is resolution-based (does each side resolve to a card?), not a better pattern** , do not ship another regex.
- **67 DOUBLE-SPACED FOLDED NAMES in `player_name_norm`, up from 4**, introduced by the known-as fold: `players.name` already contains double spaces (`J.  McGinn`) and `concat_ws` now brings that field in. **Search is NOT affected** (`tokenAndFilter` matches each token as its own substring, so inter-token spacing is never compared , verified). Cosmetic. Fix with a `regexp_replace(..., '\\s+', ' ')` collapse **at the next view edit**; not worth a write of its own.

### OPEN , THREE FIELDS NOW ASSERT A VALUE THEY CANNOT STAND BEHIND, AND THE SHAPE IS THE SAME EVERY TIME (pattern named 2026-09-13)
**ONE DEFECT, TWO CONSUMERS, AND THE TRUTH KEPT IN `confidenceFields` RATHER THAN READ OFF THE VALUE.** Three instances, and naming it as a class is the point , each was found separately and each looked like its own small thing:
1. **`goals` coalesced to 0** , 3,061 cards render a 0 for goals that were never recorded. The AI payload half is fixed and reads `vvAIStats.recorded`; the card face half is not. Full entry below.
2. **`shirt_number` on a mid-season transfer card** , 841 cards inherit a number from a `player_positions` row covering BOTH clubs, so it may belong to the club the player left. 33.3% wrong against 0.5% elsewhere. Full entry in SS E.
3. **`starts` greater than `appearances` on 774 cards** , SS E records `starts` as the wrong field and says to use `appearances`. Same shape: a value is present, is wrong, and nothing on the card says so.
- **THE COMMON FAILURE IS NOT THE WRONG VALUE, IT IS THAT THE FIELD HAS NO WAY TO SAY "UNKNOWN" AT THE POINT OF USE.** By the time a card exists the 0 is indistinguishable from a real zero and the shirt number is indistinguishable from a verified one. **THE TRUTH IS ALWAYS UPSTREAM, IN THE RAW ROW, AND `confidenceFields` IS WHERE THE CARD ALREADY KEEPS THAT KIND OF KNOWLEDGE.** Any consumer that needs to know reads it there; nobody reads it off `c.goals` or `c.number`.
- **AND THE RENDERING IS A SEPARATE DECISION FROM THE FLAG, EVERY TIME.** Carrying a confidence field costs nothing visible and can land whenever. Changing what 3,061 or 841 card faces show is a visual change to a live surface that needs a render and Lucas, per SS C. **Do not bundle them: the flag is objective, the rendering is a judgement.**
- **THE SHIRT-NUMBER RENDERING IS HELD ON A NAMED BLOCKER AND MUST NOT BE DECIDED AROUND.** `docs/HANDOVER_2026-09-12.md` SS 0.0 records the blank-shield question as Lucas's, asked three times, unanswered, with "do not write a default". **Suppressing 841 shields moves cards INTO the blank state and therefore lands on that same surface**, in the opposite direction , and the two interact: if blanks stay blank, suppression is consistent; if the backfill fills blanks, then blank comes to mean "not done yet" and saying that about these 841 would be false. **When the blank-shield question is answered, apply the same answer to BOTH populations in one change.**
- **THE COST OF SUPPRESSING, SO IT IS NOT ARGUED FROM PRINCIPLE ALONE: the number is RIGHT on roughly two of every three of the 841.** Blanking all of them removes a correct number from about 560 cards to remove a wrong one from about 280. **That is why it is a flag first and a rendering second.**
- **WHERE IT LANDS IN CODE:** `rowToCard` already computes `confidenceFields(row)` from the RAW row at `vv-core.js:2866` and attaches it. The transfer flag goes beside it, derived from the `pos_row_appearances` column queued in `DB_HYGIENE_STAGE.md`. **`rowToCard` is the single choke point , card face, rankings rows and the share capture all read what it returns, so one field reaches every surface and no renderer changes.**

### OPEN , `rowToCard` COALESCES `goals` TO 0, AND THE CARD FACE IS THE SECOND CONSUMER OF THE SAME DEFECT (logged 2026-09-13, NOT fixed, needs a decision AND a render)
**[RE-READ 2026-09-16 AND THE ENTRY IS HALF WRONG. IT PRAISES `assists` FOR STAYING NR, AND ON 11,015 CARDS NR IS HIDING A ZERO WE KNOW.]** The importer wrote a zero-assist season as NULL until 2023, so "assists is not coalesced and shows NR" is correct for the genuine gap and **wrong for the larger population where the value is a known zero** , see SS E. **The two fields are wrong in OPPOSITE directions: `goals` asserts a zero it does not have, `assists` withholds one it does.** Fixing either by copying the other's behaviour would break it.
**AND BEFORE REMOVING ANY COALESCE ON THESE FIELDS, READ THE COMPENSATING-ERROR NOTE IN SS E.** The engine's `COALESCE(assists, 0)` was wrong AND the stored NULLs were wrong, in opposite directions, and they cancelled. Removing the coalesce on its own is not a tidy-up , it is a rescore of every card in the affected pools, and it looks like a one-line improvement.
**`rowToCard` does `goals: row.goals != null ? row.goals : 0`, so a card whose goals were NEVER RECORDED renders a 0 on its face.** 3,061 cards are in that state, 2,497 of them outfield. `assists` beside it is NOT coalesced and already has an `assistsText` carrying `NR`, so the two basics are treated differently three lines apart.
- **THE AI PAYLOAD HALF OF THIS IS FIXED (2026-09-13) AND THE CARD FACE HALF IS NOT.** The payload now reads `vvAIStats.recorded`, which is derived from `confidenceFields` and therefore sees the truth the coalesce hides. **That is the argument for eventually doing the face too: it is ONE defect surfacing on TWO consumers, and only one of them has been closed.** A fix that stops at the consumer that complained is how a defect comes back.
- **IT IS HELD BECAUSE IT IS A VISIBLE CHANGE TO A LIVE SURFACE, NOT BECAUSE IT IS WRONG.** 3,061 cards would show `NR` where they currently show `0`. That needs a rendered demo at both widths and Lucas picking it, exactly like any other face change , SS C's rule that a visual change is not verified until it has been rendered and measured.
- **DO NOT FIX IT BY READING `c.goals` ANYWHERE.** By the time a card exists the value is 0 and indistinguishable from a real zero. The truth lives in `confidenceFields`, which rowToCard computes from the RAW row and attaches. Any consumer that needs to know reads that.

### VERIFY ON RETURN , **see `LAUNCH_STAGE.md`** (read-only, captured 2026-07-28, moved 2026-08-24)
Four read-only questions about what a comparison persists to Supabase. **EXPECTED ANSWER: `verdict_cache` is a CONTENT cache keyed by pair with NO user identity , confirm or correct.**

### SHARE / SOCIAL , **see `LAUNCH_STAGE.md`** for the full three-tier scope + the read-only reality check (logged 2026-07-26).
- **ONLY TIER 1 IS LAUNCH-BLOCKING, and it lands in BUILD TRACK step 5 , kept here so it cannot be buried in a stage file.** Add site-level STATIC og/twitter meta to the `<head>` of card.html + compare.html (+ index.html): the generic brand `og-image.png` + neutral title/description + `twitter:card=summary_large_image`. **No server layer** , static tags in the raw HTML, which the crawler reads. **It is an ADD, not a replace: there are NO og/twitter tags on ANY page today** (grep-confirmed), so shares currently unfurl with the bare `<title>` and no image. `og-image.png` is verified the generic VVXI brand logo at 1200x630 , wiring it puts no player on any share.
- Tiers 2 (per-link OG via @vercel/og) and 3 (poster download + Instagram) are POST-LAUNCH and fully scoped in `LAUNCH_STAGE.md`. **Shared links are NOT broken today** , they point at the existing `?a=&b=` / `?id=` URLs, which render.
### DEFERRED (post-launch, explicitly NOT launch-blockers)
### DEFERRED (post-launch, explicitly NOT launch-blockers) , **FULL SPECS EXTRACTED 2026-08-09 to `POST_LAUNCH.md`. Read that file only when a post-launch stage starts.**
Nothing below is launch-blocking. This is the INDEX; the detail lives in `POST_LAUNCH.md`.
- Premium/motion pass; accounts/Locker (waitlist for now); language toggle EN/NL/FR.
- **ACCOUNTS / AUTH STAGE** , spec in `ACCOUNTS_STAGE_SPEC.md` (unchanged, not moved). Nothing built; `migrations/waitlist_emails.sql` stays untracked until this stage starts.
- **[THE THREE PROOF PRODUCT DECISIONS ARE MADE , 2026-09-15, AND THEY ARE ALL THE SAME DECISION.] POOL: the 8-bucket `position_pool` the SCORE uses, via `COALESCE(pool, pos)`. SCOPE: CROSS-LEAGUE, one ladder. THRESHOLD: 300 minutes, matching the importer floor.**
  - **THE REASONING IS ONE SENTENCE AND IT GOVERNS ANY FUTURE PERCENTILE ON THIS PLATFORM: all three match how the VV Score already works, so the Proof panel AGREES with the number above it rather than telling a different story. A percentile computed on a different basis from the score it sits beside is a SECOND RANKING WEARING THE SAME CARD.**
  - **THE EIGHT COLUMNS ARE NOT A GUESS , THEY ARE `PROOF_DIMS` IN `card.html`, WHICH ALREADY NAMES EXACTLY EIGHT DISTINCT STATS:** goals, shots_on, shots_total, assists, passes_key, tackles_total, interceptions, tackles_blocks. **The matview goes from 76 columns to 85**, not to 78 , the count must come from that list, not from an estimate.
  - **THE BLOCK IS WRITTEN AND NOT RUN: `migrations/matview_sitting_2026-09-15/SITTING.sql`**, with the before-capture of all 76 columns, 11 index definitions and the grants beside it. **It is the SQL editor's lane** , the refresh exceeds the service role's timeout and cannot go through `exec_sql`.
  - **AND THE KNOWN-AS FOLD IS NOT A PASSENGER , IT SHIPPED 2026-08-11.** The sitting carries `pos_row_appearances` and the eight percentiles, and nothing else.
- **THE PROOF , PERCENTILE COLUMN (Path 1, post-launch enhancement) , POINTER KEPT LIVE, TWO ACTIVE ITEMS DEPEND ON IT.** Launch Proof is TRIMMED (per-90 + minutes/apps denominator, no percentile). **NOT a data gap** , every stat is on the mv (2015+). Gated on THREE PRODUCT DECISIONS (pool: 8-bucket vs coarse / cross-league vs per-league / minutes threshold), then ~8 `percent_rank()` columns appended to `player_card_view`, matview refresh, `rowToCard` + `renderProof`. **COPY TRAP: the engine percentiles are GLOBAL/cross-league, so it must read "vs the position pool 2015+", NEVER "in the league".** Depended on by **§D PARALLEL item 1** (share the matview DROP+CREATE , one sitting). **NO LONGER BLOCKS THE RADAR** , the radar shipped its own per-pool percentile snapshot on 2026-09-05 and does not wait on these columns; when they land, `radarFor` should read them instead of `RADAR_POOL_REF`, and the semantics were chosen to match so nothing moves. Full spec in `POST_LAUNCH.md`.
- **VV INDEX / PLAYBOOK PAGE SPLIT** , the two pages duplicate the 5 bands, the 5 dimensions, and now BOTH render their own pentagon. Long-term answer = split; LAUNCH ships Path B instead. Full analysis in `POST_LAUNCH.md`.
- **PREMIUM PASS** , Compare season-dropdown rows as mini VV cards; VV Index motion ideas (incl. the HARD RULE that limitation disclosures stay STILL). `POST_LAUNCH.md`.
- **January mid-season DUAL-CARD , RESOLVED 2026-07-21: NOT dual cards. ONE season, ONE row, SUMMED.** Rationale + the 82%-artifact finding in `POST_LAUNCH.md`.
- Advanced-data VV Score v2 (radar percentile-within-position , **SHIPPED 2026-09-05, see §D**; GK saves/goals_conceded to lift the GK-75 cap , **this is a BUILD, not a lift: §C records that the keeper formula reads neither field and is minutes-plus-league only**); `dribbles_past` re-ingest; POST-LAUNCH DATA-SOURCE OPTIONS; OPTION C honours-in-filter; VERDICT_CACHE prompt-version bump (48 stale-prose rows); the 13 unbuilt prestige-tag ideas + the unbuilt profile-tag library. All in `POST_LAUNCH.md`.

### PARALLEL / ANYTIME (no dependency, slot in whenever)
- **SEARCH FOLLOW-UPS + the `search-demo.html` QA harness , FULL SPECS EXTRACTED 2026-08-09 to `DB_HYGIENE_STAGE.md`.** Neither is blocking; search now reaches the whole 57k. **(1) [SHIPPED 2026-08-11 AND THIS ENTRY DESCRIBED IT AS OPEN FOR A MONTH , CORRECTED 2026-09-15.] KNOWN-AS NAMES ARE SEARCHABLE.** The view builds `player_name_norm` as `btrim(regexp_replace(lower(unaccent(concat_ws(' ', p.name, p.full_name))), ...))` , it ALREADY concatenates the known-as name AND the legal name. **Verified by searching, not by reading: all four players this entry named as unreachable resolve today** , `nene` returns Nené and Nenê, `borja baston` Borja Bastón, `grimaldo` Álex Grimaldo, `paqueta` Lucas Paquetá.
  - **AND SS F HAD IT RIGHT THE WHOLE TIME** , the 2026-08-11 log records the fold shipping, and SS D's own double-spacing note even explains it as a CONSEQUENCE of the fold ("`concat_ws` now brings that field in"). **Two sections of this file disagreed for a month and the wrong one was the one a planner reads.**
  - **THE COST WAS NOT THE WRONG WORDS, IT WAS A QUEUE ENTRY: it was listed as a passenger on the matview DROP+CREATE sitting, which it does not need and never did.** `player_name_norm` already exists on the matview, so changing its VALUE needs a view edit and a plain REFRESH , appending a COLUMN is what needs the rebuild. A stale entry does not merely misinform, **it books a maintenance window for work that is finished.**
  - **SAME SHAPE AS THE MERGE RECORD AND THE QA SCOPE**, both of which also went stale in SS D while the truth sat elsewhere. **When SS D and SS F disagree, SS F is a dated log and SS D is a plan , check the log, then the database, then correct the plan.** **(2) TRIGRAM INDEXES** , a leading-wildcard `ilike` is a SEQUENTIAL SCAN (1.7s cold over 57,234 rows); `pg_trgm` GIN indexes fix it and need NO rebuild, so this one can ship first and alone. **THE PLANNING FACT: (1) and the percentile columns (`POST_LAUNCH.md`) SHARE a matview DROP + CREATE plus its 8 indexes , ONE SITTING, and the percentile product-decisions must be settled BEFORE it starts.** Two alternatives (a client-side fold, an RPC) were scoped and REJECTED , do not re-propose them.
- **NICKNAME-ALIAS INDEX (cr7 -> Ronaldo) , STILL DEFERRED, post-launch.** Distinct from club-token search, which ALREADY SHIPPED in `e83de31` (`tokenAndFilter` ANDs each token across player OR team name, so a club name is already searchable) and distinct from the known-as fold, which shipped 2026-08-11. This is the remaining piece: a hand-built alias map for names nobody types in full.
- Mobile-responsive fixes; logo + og/meta polish; coarse-position tail cleanup (DB-wide "CM" tail below rt80 + ~18k coarse tail via known_players.csv dictionary, no CCC needed for known names).
- **CARD / RANKINGS improvement queue (logged 2026-07-26, QUEUED , not built).** Checked against existing items; overlaps noted.
  1. **[NEW] Glance , add LEAGUE to the glance line.** `glSub` (card.html ~L692) currently reads `pos · club · year · Age`; add which of the 9 leagues (from `D.league`/`league_code`, display name via LEAGUE_NAMES). Alongside club/position/age.
  2. **[NEW] Glance , add GAMES/APPEARANCES beside goals + assists.** The glance stats show G + A only; add appearances (on `player_card_mv.appearances` + psc.appearances; may need `rowToCard` to carry it) so G/A has denominator context (12g in 15 games vs 38). High value given the minutes-based engine philosophy.
  3. **The Proof , DECIDED 2026-07-26: TRIM for launch (Path 2), percentile column deferred post-launch (Path 1, see DEFERRED below).** Launch panel = per-90 rate + minutes/apps denominator context (the sample the rate is over) + season total; the deferred `.pctn`/`.pct` elements REMOVED (not hidden). Depends on `rowToCard` carrying `appearances` (wired with item 2's glance games-played , same dependency, done once).
  4. **[PARTIAL DUP] Rankings LIST view , wonder tags crop/truncate** (Goal Machine, Provider, Generational cut off in pillmode). RELATED to §D build-track step 5 "Tag-crop sweep (390px)" but more specific: this is the LIST/pillmode row tag rendering truncating tag names, not only a 390px issue , fold into that sweep or handle as its own pillmode tag-fit fix.
