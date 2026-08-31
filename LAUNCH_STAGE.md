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
- **HONOURS ACTIVATION , BLOCKED, and the block is structural.** PostgREST cannot filter `player_card_mv` by the separate `honours` table, so honour flags have to live ON the matview. That means a **DROP + CREATE** of the object the whole site reads, plus its 8 indexes , see the §C matview trap and `scripts/enrichment/matview_rebuild_plan.md`. The chips already render inert with a "soon" marker, which is deliberate: it teaches the vocabulary before the data exists. **Do not "fix" them by hiding them.**
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
into one card, so older links stop resolving. That is a growing population , §E puts it near 1,600
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
