# VVonderXI , SILENT FAILURES (read when something looked fine and was wrong)

**THIS FILE IS EVIDENCE, NOT INSTRUCTION. `CLAUDE.md` IS THE MASTER SOURCE OF TRUTH.** Every rule
in here still lives in CLAUDE.md §C as its bold headline; what moved is the measurement, the
narrative and the cost. If anything here appears to conflict with CLAUDE.md, **CLAUDE.md WINS**.

**Do NOT read this at session start.** Read CLAUDE.md in full instead. Come here when a specific
thing has gone wrong and the symptom matches one of the headings below.

**Split from CLAUDE.md §C on 2026-08-16.** §C had reached 59,197 B , 39.5% of the 150k truncation
limit on its own , and §F could not be written without pushing the file past 90%. §F and §D's
closed history were already spent as levers, so the room had to come from §C. Seventeen blocks
moved; their headline sentences stayed behind, unchanged, so §C still reads top to bottom as a
complete list of rules.

**TWO MORE WERE ADDED ON 2026-08-23 and the file is now NINETEEN.** The split is not a one-off
archive , it is where this class of evidence lives from now on, so a new silent failure is written
here with its headline in §C, rather than growing §C again. The 2026-08-16 note below describes
that original move and is left as written.

**WHY THESE SEVENTEEN AND NOTHING ELSE.** They share one subject: *something reported success, or
looked correct, and was wrong.* None of them errored. None was caught by review. Almost all were
caught by running the thing rather than reading it. That is the through-line, and it is why they
are one file rather than filed by area.

**THE ONE RULE THAT GENERALISES ACROSS ALL OF THEM:** a tool reporting what it INTENDED to do is
not evidence of what landed. Assert the result, in the same harness, before believing it.

---

**AN INLINE SVG WITH A viewBox IS A REPLACED ELEMENT, SO `height:auto` RESOLVES FROM ITS RATIO AND `bottom:0` IS SILENTLY IGNORED , `inset:0` DOES NOT SIZE IT (2026-08-16). IT SURVIVED TWO BRIEFS BECAUSE NOTHING IN THE MARKUP LOOKED WRONG.**

The Playbook's card mockup drew a grey trajectory line diagonally across the Proof and Watch panels below it. The rule was:

    .cm-line{position:absolute;inset:0;pointer-events:none;overflow:visible}

and the markup was an ordinary `<svg class="cm-line" viewBox="0 0 100 44" preserveAspectRatio="none">` holding one polyline whose every point sits inside the viewBox. **Read on its own, every part of that is correct.** The polyline coordinates are in range. The parent `.cm-chart` is `position:relative` and `height:44px`. `inset:0` names all four edges.

**IT IS THE `inset:0` THAT DOES NOTHING, AND THE REASON IS THE ELEMENT TYPE, NOT THE CSS.** An inline SVG carrying a viewBox is a **REPLACED element with an intrinsic aspect ratio**. For a replaced element, `height:auto` resolves from that ratio rather than from the box, and the over-constrained `bottom` is discarded. So the SVG took the container's width and then set its own height to width x 44/100.

**MEASURED IN A REAL BROWSER, with the original rule restored on the live page: the SVG rendered 467.3px tall against a 44px chart, and the polyline ended 274.6px BELOW the chart's bottom edge.** With `overflow:visible` there was nothing to clip it, so it drew straight down the panel stack.

**WHY IT SURVIVED TWO BRIEFS.** It had been reported before and not fixed, and the reason is the shape of the evidence: **there is no wrong number anywhere to find.** A reader checking the polyline finds valid points. A reader checking the viewBox finds it matches the chart. A reader checking the container finds an explicit height. Nothing in the file is the wrong value , the defect lives in a CSS resolution rule that only shows up as a rendered box size, and the file cannot show you a rendered box size.

**THE FIX IS TWO DECLARATIONS AND BOTH ARE LOAD-BEARING:**

    .cm-line{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden}

`width`/`height` force the used size to the container instead of the ratio; `overflow:hidden` is the second belt, so that if anything ever escapes the viewBox again it is clipped rather than drawn across the page. Re-measured after: SVG 44px, polyline ending 14px INSIDE the chart.

**GENERALISE IT: `position:absolute; inset:0` is a reliable way to fill a container ONLY for non-replaced elements.** For `<svg>`, `<img>`, `<video>`, `<canvas>` and `<iframe>`, add explicit `width`/`height` , or accept that the intrinsic ratio wins. **And the general lesson is the one this whole file is about: a defect whose only symptom is a rendered geometry cannot be found by reading markup.** It needed the page open in a real browser with `getBoundingClientRect` on the SVG, the chart and the polyline. That check now runs against a local `python3 -m http.server` and should be the default for any visual change.
---

**`CREATE OR REPLACE VIEW x AS SELECT * FROM x` SUCCEEDS SILENTLY AND DESTROYS THE VIEW BODY (2026-08-11). THE SITE KEEPS LOOKING HEALTHY.**
Postgres does NOT reject a view that selects from itself. The body is replaced by a self-referential column projection and the original SQL is gone. **The matview keeps serving stale-but-good data, so nothing appears wrong** , the damage is invisible until the next `REFRESH`, which would then empty `player_card_mv` and take every page down at once, because rankings/compare/card all read it directly from the browser with no fallback.
- **WHAT HAPPENED:** `player_card_view` , the object holding the whole VV engine , was replaced by a **965-char column projection ending `FROM player_card_view`**. The 11,202-char engine body (`WITH scored AS`, `percentile_cont`, `rt_new`) was destroyed. Cause: placeholder/example DDL pasted into the SQL editor and run.
- **RECOVERED** from a `pg_get_viewdef` capture taken earlier the SAME session. Verified by **elite count 650 and rt range 11-97 matching the matview exactly** , the matview was the only intact reference, precisely because it had not been refreshed.
- **NEVER PASTE PLACEHOLDER OR EXAMPLE DDL INTO THE SQL EDITOR.** Only statements intended to run. A `CREATE OR REPLACE VIEW` skeleton is not a template , it is a live destructive statement the moment it is executed.
- **CAPTURE BEFORE YOU EDIT:** `SELECT pg_get_viewdef('player_card_view'::regclass, true);` and save the output BEFORE any view work. That capture is the only thing that made recovery possible.
- **DO NOT REFRESH THE MATVIEW IF THE VIEW LOOKS WRONG.** The stale matview is the backup. Refreshing destroys the last good copy of the data.


---

**FOURTH QUOTE-IN-QUOTE SILENT FAILURE IN card.html (2026-08-11). THIS IS A FAMILY, NOT FOUR ACCIDENTS.**
`JSON.stringify` inside a DOUBLE-QUOTED HTML attribute truncates it. The recent-search chips shipped with `onclick="csGoRecent("` plus a junk attribute `152626")"=""`, `chip.onclick` was `null`, and **nothing errored** , the chips rendered with correct names and simply did nothing on tap.
- **EMIT IDS THE WAY `csGo` DOES: BARE FOR NUMERICS.** The proof was in the same panel at the same moment , a result row carried `onclick="csGo(143372)"` and fired correctly, while the chip beside it was dead. Same render path, same mechanism, only the quoting differed. `csIdArg()` now does this and single-quotes only non-numeric ids.
- **THE FAMILY, and why it keeps happening: a quote character inside a quote-delimited context produces output that PARSES AND DOES NOTHING.** Three distinct instances in one file, all invisible to review and to `node --check`:
  1. **Shell quotes around JS** , `node -e '...'` ate the quotes in `addEventListener('pageshow',...)`, leaving a bare identifier that threw a ReferenceError at runtime while the file parsed. **Write the patch to a FILE and run that.**
  2. **JSON quotes inside an HTML attribute** , this entry.
  3. **CSS comment pairs when lifting by line range** , an orphan `*/` made the parser discard the whole following `@media` block, 42 of 45 rules.
- **THE SWEEP, done 2026-08-11 , the chip was the ONLY instance in card.html.** Method worth reusing: scan the inline `<script>` bodies for handler attributes built by concatenation, then check what is interpolated. Everything else is safe , `csGo` interpolates a bare number, the season trigger interpolates nothing into its handler, and the remaining hits are `textContent` assignments (which never parse). `vv-core.js`'s `rankRowHTML` interpolates only the caller's click expression and puts **no names into attributes**, which matters because the DB genuinely holds `M&apos;Bala Nzola` and `D&apos;Ambrosio`.
- **ASSERT THE HANDLER COMPILED, do not trust the markup.** `csRenderRecent` now checks `typeof el.onclick === 'function'` after render and `console.error`s with the raw attribute plus a `data-vv-handler-error` marker. A malformed handler is indistinguishable from a working one in the DOM inspector until you look at `onclick` itself.


---

**AN HTTP 200 WITH PLAUSIBLE CONTENT IS NOT EVIDENCE A SCRAPE WORKED (2026-08-13).**
Transfermarkt changed markup site-wide on 2026-08-12 between **11:32 and 18:09**. Pages still return **200 with the correct title and the correct player**, but `<select name="pos">` is gone and search results no longer carry club context.
- **THE SIGNATURE: identity failures and parse failures climbing together while the transport looks healthy.** The tier-1 run went 122 useful rows, then **208 consecutive rows with zero useful results** , idFail 123, parseFail 86, every parseFail "no position selector", not one "no positioned appearances". The parser never reached the counting stage.
- **WHAT CONFIRMED IT: re-fetching a player that had SUCCEEDED hours earlier, on the identical URL.** Neymar parsed fine at 11:32 and returns zero `<select>` elements now. Same player, same URL , so not player-specific, not IP-specific, not a block. A per-player check would have looked like bad luck; the repeat of a known-good case is what made it certain.
- **The 429s were real but incidental.** Seven cooldowns and the delay pinned at the 20s cap explain a 6.5-hour gap, but rate limiting does not produce 200s with correct titles and missing controls. **Slowing down further would have recovered nothing.**
- **VERIFY THE SPECIFIC STRUCTURE YOU PARSE, NOT THE RESPONSE CODE.** Assert the selector/table/field exists before trusting the page, and treat "parse failures rising while status stays 200" as an upstream change until proven otherwise. **Cost: 208 wasted fetches.**


---

**A QUERY THAT RETURNS EXACTLY 1000 ROWS HAS HIT PostgREST'S DEFAULT MAX-ROWS CAP, NOT THE END OF THE DATA (2026-08-12).**
It is a silent truncation , no error, no flag, just a suspiciously round number. Caught on the deep-playmaker gate: a CM/CDM pool came back as "1000" and the top-40 ranking drawn from it was the top 40 of an **arbitrary slice**, not of the real **6,582**. The names looked plausible enough to have been reported as a result.
- **PAGINATE BEFORE DRAWING ANY CONCLUSION FROM A TOP-N.** Walk `.range(from, from+999)` with a stable `.order()` until a page returns fewer than 1000, then sort in JS.
- **TREAT A COUNT OF EXACTLY 1000 AS A RED FLAG, never as a finding.** Same family as the §C verification principle: the harness quietly limited the answer, and nothing in the result says so.
- For a pure count use `select('*',{count:'exact',head:true})`, which is not subject to the row cap.


---

**A DECORATIVE ABSOLUTELY-POSITIONED ELEMENT INTERCEPTS TAPS IN WHATEVER REGION IT OCCUPIES, INVISIBLY (2026-08-11).**
`card.html`'s `.glow` is a blurred radial gradient with no content. At **<=1040px `.plinth` switches to `position:static`**, so the glow loses its containing block, resolves against **BODY**, and lands at **x68 y20, 240x240 , directly over `.topline`**. It swallowed the search trigger's tap entirely: the button rendered, the handler was bound, `csToggle` was a function, and `document.elementFromPoint()` at the trigger's centre returned **`DIV.glow`**. Desktop was unaffected because there the glow sits at y112, below the topline.
- **THE PART THAT MAKES IT LOOK LIKE SOMETHING ELSE: Back and the theme toggle stayed reachable, so it read as "the new control is broken", not "something is covering that area".** The glow is a **circle** (`border-radius:50%`), so it only hit-tests inside its ellipse , centre (188,140), radius 120. Trigger centre (183,37) is **103** away, INSIDE. Theme toggle (300,37) is 152 and Back (39,37) is 181, both outside. **A partial overlay produces a partial symptom.**
- **FIXED WITH `pointer-events:none`.** It is decorative and must never be a hit target at any width. **Do NOT "fix" it by restoring `position:relative` on `.plinth`** , that moves the glow visually, which is a design change nobody asked for.
- **RULE: for any NEW interactive element, check `document.elementFromPoint(cx,cy)` returns that element or a child , do not stop at "the handler is bound".** Binding, computed style, `display`, `visibility`, `opacity` and `pointer-events` on the element itself were ALL correct here. The cheap positive control is to set `pointer-events:none` on the suspected overlay and confirm the handler starts firing.
- Same family as the §C `span.s` lesson: the wrong layer was being interrogated. There, the selector matched nothing; here, the element was never the hit target.


---

**THREE SILENT-FAILURE MODES FOUND IN ONE SESSION ON card.html (2026-08-11). ALL THREE PARSE CLEANLY AND DO NOTHING.**
Same family as the `.replace()` no-op below: the tool reports success, the file is valid, and the behaviour is simply absent. None of them produce a console error.
1. **WRITING JS VIA `node -e '...'` STRIPS INNER SINGLE QUOTES, producing bare identifiers.** `addEventListener(pageshow,...)` threw a **ReferenceError at runtime while `node --check` PASSED** , `pageshow` is a valid identifier, so the file parses. It killed the handler AND every listener registered after it on the same IIFE (`resize` was corrupted the same way and never attached). **Write the patch to a FILE and execute that instead.** Audit for it with a bare-identifier scan on `addEventListener` / `getElementById` / `classList` / `getItem` / `setItem`.
2. **AN ORPHAN `*/` IN LIFTED CSS MAKES THE PARSER SWALLOW THE ENTIRE FOLLOWING `@media` BLOCK during error recovery , 42 of 45 rules discarded, no console error, the sheet still reports valid.** Cause: lifting a line RANGE out of another file that began on the LAST line of a multi-line comment, so the closer came across without its opener. A `decomment()` that strips complete `/* ... */` pairs does NOT catch a lone closer. **Check comment-marker balance when lifting CSS by line range** (count `/*` vs `*/`), and verify the rules SURVIVED by counting parsed `cssRules`, not by reading the source.
3. **`rowToCard` EMITS `surname` / `full` / `clubname` / `year` / `vv`, NOT THE DB COLUMN NAMES.** `d.player_name` is silently `undefined` (as are `team_name` and `rt` , `rt` becomes `vv`). Anything reading a card object by its DB column name stores or renders blank. **Inspect `Object.keys()` on a real card object before writing field access**, and note this also breaks measurement code: `JSON.stringify` renders `undefined` inside an array as `null`, which reads as "the data is null" rather than "the field name is wrong".


---

**A SILENT NO-OP IS A SUCCESSFUL-LOOKING FAILURE , ASSERT THE REPLACEMENT LANDED, NEVER TRUST `.replace()` (2026-08-10).**
A patch script searched for `done.map(r => r[0]+...` while the file actually contained `done.map(r=>r[0]+...` , no spaces around the arrow. **Python's `str.replace()` does not error on a non-match; it returns the string unchanged.** So the surrounding edits applied, the target line did not, `node --check` passed (the file was still valid), and the script printed its own success message. The writer then stamped 7 rows `fable-tail,2026-08-09` while reporting `source=tm-ccc, date=2026-08-10` **on screen**. The DB write was correct throughout; only the provenance record was wrong, and provenance is the entire point of `known_players.csv`.
- **WHAT CAUGHT IT: reading `known_players.csv` itself, NOT the script's output.** The success message was confidently wrong. A tool reporting what it INTENDED to do is not evidence of what landed on disk.
- **RULE: every string replacement in a patch script carries `assert old in s` (or equivalent) BEFORE the replace, and the result is grep-verified after.** The second attempt at this same edit had the assert and failed loudly and instantly, which is what a broken patch should do. Same family as the §C verification principle: a missing signal is not evidence, and here the missing signal was "the replace did nothing".
- **APPLIES BEYOND PATCH SCRIPTS:** any edit whose failure mode is "changes nothing" , sed without a match, a `git add` of a path that does not exist, an `.eq()` guard matching zero rows. **Prefer tools that fail loudly on a missed anchor** (the `Edit` tool errors on a non-unique or absent `old_string`; a hand-rolled `.replace()` does not).


---

**A DISPLAY NAME IS NOT A KEY , `player_name` maps to MORE THAN ONE `api_player_id`, and matching research output on it would have written the wrong player's card (found 2026-08-09, pass-2 position batch).**
Research tools return `player_name` + `season`, because that is what a human reads. **That pair is NOT unique.** Resolving it against the mv surfaced three live collisions in a 55-row batch, i.e. a rate high enough that it WILL happen again on any future research pass:
- **`J. Rodríguez`** = **FIVE players, not three. CORRECTED 2026-08-21** by counting `players` directly rather than counting what one batch happened to surface: **api 517, 2616, 2979, 19169, 415155.** The originals named here were **api517 James Rodríguez** (Real Madrid / Bayern, rt 80-81), **api19169 Jay Rodriguez** (West Brom, rt 14-65) and **api2616** (LL). **The count was understated because it was derived from a 55-row batch, so it measured that batch and not the table.** A collision count that is too low weakens the very rule it exists to justify, and the rule is the identity contract every research write depends on.
- **`João Mário`** = **api206** (Benfica, 17g, rt80) AND **api41734** (FC Porto, a full-back, rt56).
- **`Nenê`** = **api9970** (PSG, rt 85-89) AND **api41138** (Cagliari, rt 30-58).

---

**In all three, the collision partner was a DIFFERENT POSITION** , a full-back and a striker among them , so a name-keyed write would not merely have hit the wrong card, it would have written a position that is wrong for that player too, and it would have looked entirely plausible in the diff.
- **RULE: resolve every research row to `api_player_id` + `season_year` + `league_code` BEFORE writing, and when a name resolves to more than one card, STOP and read the evidence text against the intended player.** Never write from `(player_name, season)`.
- **A SECOND, DIFFERENT CAUSE produces the same "more than one card" symptom, and must not be conflated with it: ONE player with a season SPLIT ACROSS LEAGUES** (Coutinho 1718 = api147 at Liverpool PL and Barcelona LL; Baumgartner 2526 = api715 in BL and PL). Same `api_player_id`, two cards, both real. **Distinguish by counting DISTINCT `api_player_id`s, not cards.** A split season is also unwritable from one research row, but for the opposite reason: the evidence usually describes only ONE half (Coutinho's names Barcelona Jan-May and is silent on the Liverpool half), so it cannot authorise both cards.
- **THE HOLD RECORD IS `scripts/enrichment/pass2_HOLD.csv`** , carries `api_player_id` + `card_id` per row precisely so this resolution is never redone from names.


---

**VERIFICATION PRINCIPLE , A MISSING SIGNAL IS NOT EVIDENCE. Cost two false alarms in one day (2026-08-03/04); both were reported as real problems and neither existed.**
An empty result, an unchanged value or a silent no-op can mean "broken" OR "the harness cannot show this". **Before concluding something is broken, establish a POSITIVE CONTROL , prove what "working" looks like in the SAME harness.**
- **False alarm 1 , the `locker_profiles` "anon can read everyone's data" hole.** An anon `select` returned `{data:[],error:null}` and I read "no error" as "permitted". **A DENIED select under RLS returns EMPTY, not an error.** The table was already correctly locked (`users_read_own_profile`, SELECT to `authenticated`, `auth.uid() = user_id`; no anon policy). **Control that settled it: seed a real row with the SERVICE key, then read as anon , the row existing while anon sees zero is the proof.** I nearly had a correct policy dropped.
- **False alarm 2 , the playbook "See more accordion is dead, all Drury prose unreachable".** `max-height` stayed `0px` after `.tagdef.open` applied, so I called the rule broken , twice, including a bogus "confirmed pre-existing" from comparing two files in the SAME broken harness. **Control that settled it: disable the transition , `max-height` jumps straight to 600px and the prose expands. The rule was always fine.** The misread clue: the card grew 136->179px on open, which is the NON-transitioned `margin`/`padding` landing instantly while the transitioned properties stay frozen , the signature of a stalled transition, not a cascade failure.
- **ROOT CAUSE OF BOTH: comparing two things inside the same faulty harness proves only that the harness affects both equally.** Same shape as anchoring a verification on the same faulty assumption as the edit (see the playbook `id="s-profile"` note in §F 2026-08-04).
- **HARNESS LIMIT, remember this: CSS transitions, animations and `requestAnimationFrame` CANNOT be measured in a background-tab iframe** , Chrome throttles it (`document.visibilityState === 'hidden'`) and transitioned properties never advance from their start value. **Either disable the transition and assert the TARGET value, or assert the class/DOM change and trust the CSS.** Never assert a mid-transition computed value.


---

**CSS GOTCHA , A MEDIA QUERY ADDS NO SPECIFICITY. This bit THREE times in one session (2026-08-02); assume it will bite again.**
Every page here is ONE long inline `<style>` with responsive rules scattered through it, and later rules of EQUAL specificity win regardless of media query. So a `@media` override silently does nothing whenever a same-specificity rule appears later in the sheet , and it fails QUIETLY: the layout half-changes and looks plausible.
- `compare.html` , `@media (max-width:720px){.vwho{font-size:23px}}` lost to a later `.verdict .vwho` (0,2,0). Fixed with `.verdict .vfinal .vwho` (0,3,0). Same for `.vquote`.
- `vvindex.html` , `@media (min-width:900px){.fd-lab{font-size:8.4px}}` lost to the base `.fd-lab` (0,1,0) declared AFTER it. Fixed with `.fd .fd-lab` (0,2,0). Symptom: the pentagon grew but the label compensation did not apply, rendering labels at 20px.
- Related shape: an APPENDED override block loses to existing `body.light X` rules, which is why the Compare re-skin edits the EXISTING `body.light` block rather than appending one.

---

**RULE: when adding a responsive override, either place it AFTER every competing rule or out-specify them , and VERIFY the computed value, never assume the media query won.**


---

**BLOCK-REWRITE INVARIANT LOSS , when you REPLACE a block wholesale, the diff shows what arrived, NOT what left.**
A rewritten block reads as correct on its own terms while silently dropping a guard the old block enforced. Reviewing the new block proves the new block is coherent; it proves nothing about what the old one was protecting against. Same family as the §C verification principle above , the check shares an assumption with the edit.
- **CONFIRMED CASE: `d364550` (compare verdict finish) dropped the score-suppression guard** during a wholesale rewrite of the verdict block, and it was not visible in review , the replacement looked complete. It had to be restored in `efb82c2`.
- **A note at the time claimed THREE guards were lost; on inspection only ONE was genuine.** Recorded honestly rather than inflated , the rule stands on one real instance, and overstating it would make the next chat hunt for two failures that never happened.
- **SECOND CONFIRMED CASE, 2026-08-13, AND THE RULE ABOVE WAS ALREADY WRITTEN WHEN IT HAPPENED.** `67feec7` rewrote compare's `pkRow` from memory during the picker rebuild. It emitted class names that **do not exist** , `cmpr-main` / `cmpr-n` / `cmpr-s` / `cmpr-vv` against a stylesheet defining `cmprail` / `cmpmain` / `cmpl1` / `cmpnm` / `cmpfl` / `cmpl2` / `cmpright` / `cmpvv` / `cmpga`. Only `.cmprow` matched. **Every row rendered as unstyled text at Inter 400**, and four fields vanished: the club-colour rail, the flag, the position and the G/A line. `rankBySearch` went with them, so picker results also lost relevance ordering.
- **WHY IT SURVIVED REVIEW: the replacement was internally coherent, `node --check` passed, and nothing errored.** It was found only when the rendered picker was measured against the card overlay for an unrelated visual question, one commit AFTER it was approved. **A block rewrite is not reviewable by reading the new block.**
- **THE PRACTICAL TEST THAT WOULD HAVE CAUGHT IT IN SECONDS: diff the CLASS NAMES the old and new block emit against the class names the stylesheet defines.** Emitted-but-undefined is a silent failure every time.
- **RULE, before rewriting any block: list the invariants that block enforces, then confirm each one survives BY NAME in the replacement.** Not "does the new block look right" , "is guard X still here, is guard Y still here". Applies hardest to the shared renderers (`vv-core.js`), the `/api/analyse.js` prompts, and any SQL view block.


---

**A BASELINE DIFF THAT ONLY COMPARES EXISTING RULES IS BLIND TO NEW ONES , and that blindness let me tell Lucas a real bug did not exist (2026-08-09).**
Lucas reported that the nav menu labels rendered crimson. Asked to find "text that only became pink to fix contrast", I diffed every current pink-text rule against the pre-sweep baseline, matched selector-for-selector, and reported **NONE , every element now using `--pink-ink` was already pink**. That was wrong.
- **THE BUG WAS A RULE I HAD ADDED.** The Class-3 pink policy appended `body.light .navitem .lbl{color:var(--pink-ink)}` to SEVEN files, turning EVERY spine-nav label crimson. The audit had flagged `.navitem .lbl` at 2.43 , but that reading came from the **ACTIVE** item, and I applied the fix to **all** labels.
- **WHY THE DIFF MISSED IT: a NEW rule has no baseline counterpart, so my script classified it "OK , appended by the sweep, not a recolour."** The one category it excused was the one containing the bug. **A rule that did not exist before IS a recolour if it repaints an element that was previously styled by something else , check what the ELEMENT rendered before, not whether its SELECTOR existed before.**
- **SECOND ERROR, compounding it: I fixed the wrong menu.** Lucas said "burger/nav menu"; I fixed `index.html`'s drawer, which was already correct, and shipped a commit for it. The crimson was on the SPINE nav of playbook / preferences / rankings / vvindex. **`.navitem` exists in BOTH components , confirm WHICH ONE renders the reported symptom before fixing either.** Same failure as the `span.s` hunt: overriding a component nobody had confirmed the element belonged to.
- **WHAT ACTUALLY SETTLED IT: a screenshot.** Lucas insisted on seeing it rather than being told the measurement. Four separate hand-measurements during this episode were mid-transition garbage; the render was right every time. **When a user reports what they SEE and the measurement disagrees, the render wins , go and look.**


---

**NEVER MEASURE A THEME-DEPENDENT VALUE BY HAND , USE `withTheme()` IN `_audit.js`. This produced a false reading THREE times, and the third time it INVENTED A BUG.**
Theme toggling animates `color` and `background`. `getComputedStyle` mid-flight returns an **INTERPOLATED** value, not the resting one. Toggling a class and reading immediately is therefore meaningless, and the wrong answer looks entirely plausible.
- **(1)** 13 phantom mid-grey failures on playbook , `.tagdef` animates `background .18s`, so the audit read blends of the two themes.
- **(2)** Ad-hoc checks during the pink work reported `.tagdef.prestige` as light-in-dark, which it is not.
- **(3) THE EXPENSIVE ONE: the burger drawer was reported invisible in daylight at contrast 1.02, and it had NEVER been broken.** `.navitem` animates `color .2s`; the reading caught a colour mid-fade toward cream. The true pre-fix value was **6.05**, already passing. A "fix" was written, committed with a false number in the message, and the commit had to be amended. **Lucas independently reported seeing the labels as crimson , that was the SAME artifact, the same fade seen by eye.**
- **RULE: every theme-dependent measurement goes through `withTheme(doc, theme, fn)` in `_audit.js`.** It installs `transition:none!important` BEFORE touching the class, forces a synchronous style flush, runs the callback, then restores the original theme. **Remembering to disable transitions by hand is exactly what failed three times , do not rely on it.**
- **Corollary for BUG REPORTS: a colour someone reports seeing during or just after a theme switch is not evidence.** Reproduce it at rest, with transitions disabled, before believing it.


---

**A SELECTOR THAT MATCHES NOTHING IS NOT A SPECIFICITY PROBLEM. Cost FOUR failed attempts on one element (2026-08-08).**
Compare's `span.s` ("Season A") measured 2.64 on a light ground. Four overrides were written for it , `body.light .s`, then `body.light .vfinal .s`, then `body.light .vfinal .vscore .s`, then `body.light .verdict .vstorycol .vsname` , and **every one changed nothing, because every one matched NO ELEMENT AT ALL.** The node lives in **`.pkhead-row h2 .s`, inside the PICKER SHEET**, not the verdict. It was fixed in one step the moment the actual matching rules were listed.
- **THE DIAGNOSIS WAS WRONG THREE TIMES OVER, and the wrong diagnosis was the expensive part.** After attempt 2 it was recorded as the §C specificity trap (an equal-specificity rule losing on source order). After attempt 3, as a source-order fix (place the override AFTER the base). **Both theories were plausible, both had precedent in this very file, and both were unfalsifiable without checking the one thing nobody checked: whether the selector hit the node.**
- **RULE, before writing ANY style override: confirm the selector actually matches the element.** In the console: `[...document.styleSheets].flatMap(sh=>[...sh.cssRules]).filter(r=>r.selectorText && el.matches(r.selectorText) && /color\s*:/.test(r.style.cssText))` , that lists the rules genuinely applying to `el`. **Do not assume which component an element belongs to from its class name alone**; `.s`, `.nm`, `.td`, `.l` and friends are reused across components here.
- **ORDER OF SUSPICION when an override does nothing: (1) does the selector match the node at all, (2) is it out-specified, (3) is it losing on source order.** This session went 2 -> 3 -> 2 -> 3 and never reached 1. **Check 1 first , it is the cheapest and it is the answer more often than the other two.**
- **THIS SUPERSEDES the "specificity trap" framing FOR THIS CASE.** The §C media-query/specificity gotcha above is real and has its own genuine instances; this was not one of them.


---

**GRADIENT SURFACES ARE UNVERIFIED, NOT CLEAN , the contrast audit CANNOT see them (2026-08-08).**
The theme-contrast harness (`_audit.js`, tracked) reads `backgroundColor` and returns null for any element under a gradient or image ancestor, so **every element painted on a VV card face is SKIPPED**. Skipped counts at the end of the pass: **rankings 2,726 · myclub 93 · playbook 41 light / 51 dark · compare 19/49 · card 20.**
- **So "eight of ten pages report zero failures" means ZERO OF WHAT COULD BE MEASURED.** It is not a clean bill for card.html, compare.html, rankings.html, myclub.html or playbook.html.
- **STATUS OF THOSE FIVE PAGES: PENDING USER VISUAL VERIFICATION.** A visual-pass checklist was handed to Lucas on 2026-08-08 for his real device , card faces in BOTH themes (surname, flag, sub-line, season, VV score, shirt watermark, stat labels, tag chips), deliberately including a **yellow/gold club** and a **white/light club**, since a light gradient under light text is where this breaks. **Do NOT record these pages as contrast-clean until he confirms by eye.**
- **This is the same blind spot that hid the contact page's "Got a question?" eyebrow** , an inline-styled element at ratio 1.00 that the sweep dropped silently and that was only found because it was named by hand. A high unmeasurable count is a REASON TO LOOK, not a reason to move on.

---

## html2canvas 1.4.1 renders a SUBSET of CSS , the capture is a different renderer from the browser (2026-08-23)

**Rule in `CLAUDE.md` §C. This is the measurement behind it.**

**HOW IT SURFACED, AND WHY NOTHING CAUGHT IT EARLIER.** The share frames were reviewed against the
live DOM for two sessions. A computed-style diff of the demo card against a real `card.html` card at
identical `cw` was run repeatedly and driven down to **one difference, `--peek-shift`, which is
card.html-only and inert** , i.e. the live card was, to measurement, perfect. **The shared image was
missing its gold rim the whole time.** The live DOM cannot see this class of defect: the element's
computed `box-shadow` is present and correct, no descendant covers it, and `elementFromPoint`
returns the card. Only reading the captured pixels back shows it.

**DEFECT 1 , INSET box-shadow IS DROPPED ON ANY ROUNDED ELEMENT.** Every VV card is rounded
(`border-radius: 20.732px` at `cw` 284), so on a Generational card this removes the **gold rim**,
which is the entire visual claim of the tier. Nothing else in the picture distinguishes a
Generational card from any other, so the image would have gone out with the tier stripped and no
way to tell.

**THE FOUR-BOX CONTROL, which is the transferable part.** Four boxes, same declaration
(`rgb(22,18,14) 0 0 0 4px inset, rgba(232,184,75,.9) 0 0 0 7px inset`), differing in ONE property
each, captured together, scored by red-minus-blue at the ring depth:

| box | | score |
|---|---|---|
| flat | no radius | **142** , the ring renders at full strength |
| rounded | `border-radius:21px` | **8** , background, i.e. nothing |
| rounded + gradient background | | **8** |
| rounded + an outer drop shadow | | **8** |

**The radius alone decides it.** A gradient background and an additional non-inset layer make no
difference, and stacked inset shadows on a FLAT box render correctly, so it is not a
multiple-shadow limit either. One variable at a time turned "the capture looks wrong somewhere"
into a named cause in a single pass; guessing which of four properties mattered would have cost
the afternoon.

**DEFECT 2 , WHERE IT DOES DRAW ONE, IT RESOLVES THE RING AGAINST THE CONTENT BOX.** This is the
**"gold border cutting through the card"** Lucas reported, and it is html2canvas's, not the card's.
On a 261.3px card with 19.88px padding the rim was redrawn at **inset 26 and 233**, which is
exactly `contentEdge (19.88) + the 5.68-to-7.1 visible band`. Measured on a captured row against a
correct rim at inset 5 and 254. It reads as a rectangle boxing the content, **interrupted where the
Generational pill's dark fill covers it** , the gold column ran y 61-211 and y 233-369 with a gap at
212-232, and the pill sits at insetT 211.3. That interruption is what made it look like a border
"crossing" the pill.

**FOUR THINGS THE FIX NEEDED, each of which failed silently first.**
1. **The ring must be a BORDER on an absolutely-positioned child**, not another inset shadow.
   Verified rendering at 142 at the same depth, with the corner staying dark, so it follows the
   radius rather than squaring off. An outset shadow on the child works identically; the border is
   simpler.
2. **Children are appended in REVERSE shadow order.** CSS paints the FIRST shadow on top; the DOM
   paints the LAST sibling on top.
3. **The originals must be SUPPRESSED for the duration**, or the image carries two rims , the right
   one and the wrong one. Adding the ring is only half the fix, and the half that shows.
4. **Only zero-offset, zero-blur inset layers are shimmed.** An offset or blurred inset is soft
   interior shading that a hard border cannot reproduce, so it is skipped rather than approximated.
   A wrong ring is worse than a missing one, and nothing in this codebase uses one.

**AND THE RESTORE HAD TO STOP TOUCHING `el.style` TO BE PROVABLE.** Writing to `.style` at all
reserialises the whole attribute (`--cw:280px` comes back as `--cw: 280px;`) and leaves `style=""`
behind on elements that had no attribute, so `outerHTML` before/after can never match and the
caller cannot ASSERT the restore. Moving the suppression into an injected `<style>` plus a
temporary class made the round trip byte-identical.

**VERIFICATION, 24 frames x 4 sizes x 2 themes:** 0 elements rendering ink live but flat in the
capture, **24 of 24 Generational cards carrying exactly one rim at the border box and 0 at the
content edge** (scanned across the full half-width so a misplaced rim could not hide beyond the
window), 0 restore failures, 0 stray nodes or stylesheets.

**TWO HARNESS FAULTS DURING THIS, recorded because both were nearly reported as product bugs.**
Four "restore failures" were **three of my own sweep calls interleaving** after CDP timeouts , the
tool stopped waiting, the page kept running, and concurrent sweeps shimmed the same frame; a
re-entry guard cleared them. One apparent leak was **the page still settling after load**,
disproved by a no-capture control that waited the same interval and found the markup unchanged.
Same rule as ever: hold the instrument to the standard of the code.

---

## `el.style` assignment fails silently against `!important`, and `!important` does not beat `!important` (2026-08-23)

**Rule in `CLAUDE.md` §C. This is the measurement behind it.**

**PART ONE , THE ASSIGNMENT THAT DID NOTHING.** Suppressing the card's inset layers began as
`el.style.boxShadow = keep`. It ran, returned, threw nothing, and `getComputedStyle(card).boxShadow`
came back with **all three layers still in place** , byte-identical to before. A scan for a matching
`!important` rule via `card.matches(r.selectorText)` returned **nothing**, which made it look like
the assignment itself was at fault. The settling test was direct:
`card.style.setProperty('box-shadow','none','important')` produced `"none"` immediately. So an
important rule does match; the specificity scan simply missed it (a selector `matches()` could not
parse, or a sheet it could not read). **The lesson is not "find the rule" , it is that the write
gave no signal either way.**

**PART TWO , AND THEN THE STYLESHEET LOST ANYWAY.** Moving the override into an injected sheet to
keep the restore byte-identical reintroduced the defect exactly. The rule was present, well-formed
and carried `!important`, and the misplaced rim **came straight back at inset 26**. Cause:
`!important` does not settle a contest between two important declarations , specificity does, like
any other pair. A single shim class is **(0,1,0)** and the card's own rim is declared on
`.vvcard.gen`, **(0,2,0)**. The class is now repeated four times, **(0,4,0)**, the same device as
`.vvrows.vvrows` and used for the same reason. An inline important declaration would also have won,
but inline is what makes the restore unprovable, so this is not a stylistic preference.

**WHY IT BELONGS IN THIS FILE.** Both halves are the same shape as the `.replace()` no-op: the
operation reports success, the diff shows the intended change, and the effect is absent. **An
override that silently loses is indistinguishable from one that was never written**, and it is
worse than a crash, because you go on debugging the thing you believe you already fixed. The guard
is one line , read the computed value back after setting it.


---

## `compare.html` DIV/COMMENT COUNT , A FALSE POSITIVE THAT LOOKS LIKE A DEFECT (relocated from `CLAUDE.md` §D, 2026-08-25)

**The one-line guard stayed in `CLAUDE.md` §D so a future session counting delimiters trips over it there.**

- **[CLOSED 2026-08-21] `compare.html` DIV IMBALANCE AND CSS COMMENT PAIR , BOTH BALANCED, AND THE RESIDUAL COUNT IS A FALSE POSITIVE.** Measured at HEAD: **`<div>` 156 / `</div>` 156, delta 0** (was -1). **A NAIVE COUNT STILL REPORTS `/*` 141 against `*/` 142, AND THAT ONE EXTRA IS NOT A COMMENT** , it is inside a JavaScript REGEX LITERAL at line 1720, a `String.replace` call whose pattern ends `\s*` immediately before the regex's own closing delimiter, where `\s*` followed by the closing delimiter spells `*/`. **Do NOT re-open this on the raw count.** Walking the file with a real open/close scanner returns exactly one such hit and zero orphan comments. If it is ever checked again, verify surviving `cssRules` in a browser, not the source text , that was the original instruction and it is still the right one.

---

## A WEBFONT DOES NOT LOAD INSIDE A CAPTURED SVG , THE SQUAD NUMBER SHIPPED IN TIMES (2026-08-31)

**THE SYMPTOM.** The shield's squad number came out of the share capture in a serif , a Times ,
on a card face where every other glyph is Archivo or Barlow Condensed. Nothing in the markup says
serif. The `<text>` carries `font-family="Archivo"`, Archivo is loaded on the page, and
`document.fonts.check('900 46px Archivo')` returns true.

**THE LIVE CARD WAS ALWAYS CORRECT AND THAT IS WHY IT SURVIVED.** Measured on the real badge:
`getComputedTextLength()` is **61.342** against a canvas measurement of Archivo at **61.364** and
serif at **46**. The DOM paints Archivo. **Only the capture was wrong**, and nobody reads a
captured PNG at the size the number is legible.

**THE MECHANISM.** html2canvas draws an inline `<svg>` by serialising it to a standalone
`data:image/svg+xml` and handing that to an `Image`. Chrome renders SVG-as-image in a restricted
mode that blocks **every resource fetch**, so the `@font-face` Google Fonts installed on the page
does not exist inside that image and `font-family="Archivo"` falls back.

**IT IS THE SAME MECHANISM AS THE `<use href="#...">` FAILURE ALREADY IN THIS FILE.** A serialised
SVG loses everything outside itself. That one lost a symbol reference; this one loses a font. The
two shims now sit together in `vv-core.js` for that reason.

**THE MEASUREMENT , ONE CAPTURE, FOUR CELLS, TWO CONTROLS.** Ink-width of the string "23":

| cell | ink width | reading |
|---|---|---|
| SVG, `font-family="Archivo"` | **85** | dropped |
| SVG, `font-family="serif"` | **85** | , the control it collapsed onto |
| SVG, `font-family="monospace"` | **99** | positive control: generic families DO work, they are OS-resolved, not fetched |
| HTML, `font-family:Archivo`, same capture | **114** | the webfont draws fine as HTML , this is SVG-specific, not an html2canvas font limit |

**EMBEDDING THE FACE DOES NOT WORK, AND IT WAS TESTED RATHER THAN ASSUMED.** An `@font-face`
whose `src` is the woff2 as a `data:` URI, inside the SVG's own `<style>`, still measured **85**.
In the same capture a `<style>` rule setting `fill` DID apply (red 3016 px, dark 0) and one setting
`font-family:monospace` DID apply (99). **So stylesheets survive the serialisation and font
LOADING is what is blocked, data URIs included.** There is no way in from the SVG side.

**METHOD FAULT WORTH KEEPING, because the first run of that probe was void.** An SVG `<style>`
inside an HTML document is **DOCUMENT-scoped**, not scoped to its own `<svg>`. The first probe
painted *every* cell red , including the control that had no `<style>` at all , and reported four
identical readings. **Scope by the svg's own id, and always keep a cell that must NOT change.**

**THE FIX IS A CAPTURE-TIME SHIM, NEVER A CARD CHANGE** , `VVCore.vvShimShieldNumbers(node)`,
restored from a `finally` exactly like `vvInlineMarks` and `vvShimInsetRims`. It hides the `<text>`
and puts the number over the badge as HTML, which the capture draws with the real font. §C: the
card is the product and the capture is a consumer of it; when they disagree, shim the capture.

**THE SPLIT-BADGE OUTLINE BECOMES A `text-shadow`.** `paint-order:stroke` is SVG-only. The
2026-08-27 support sweep lists `text-shadow` as KEPT, so the shim translates the 2.5-unit stroke
into eight offsets at **half** that radius , SVG strokes are centred, so only the outer half shows.
Verified in a captured PNG on a genuine split badge (`shieldSplit` needs `luma(c2) <= 0.80`, so a
white second colour is REJECTED and the stroke branch is easy to miss , the first three test cards
all rendered solid and never exercised it).

**VERIFIED:** both badges on a compare frame, all four formats, both themes, and the DOM restored
byte-for-byte after eight consecutive captures (`document.body.innerHTML.length` identical).


---

## THE 2026-08-23 CONTRAST SURVEY IS VOID , THREE INSTRUMENT FAULTS, ALL FALSE FAILURES (2026-09-01)

**THE SURVEY WAS RE-RUN AND WITHDRAWN.** The 2026-08-23 pass was already known to have ONE fault
(reading `color` where SVG paints with `fill`). The re-run found **three**, and every one produced
FALSE FAILURES , entries that read as defects and were not:

1. **`fill` vs `color` on SVG text.** The recorded one. `getComputedStyle(el).color` returns an
   inherited colour the glyph never paints with.
2. **THE GROUND FELL THROUGH A GRADIENT.** `.vvcard` paints a `radial-gradient`, so its
   `backgroundColor` is transparent and an ancestor walk climbs past the card to the page. A
   Generational card in light mode reported **1.14**; it measures **6.25**.
3. **A LAYERED BACKGROUND WAS READ ACROSS LAYERS.** The stadium-light stack on `card.html` is
   twelve translucent radial layers over an opaque base. Reading colour stops across the whole
   string picked a 0.07-alpha highlight and then fell through to white, reporting page-level inks
   at **1.09** on a page that is visibly dark.

**WHY IT IS NOT SPOT-CORRECTABLE.** Three independent faults spanning SVG, gradient and layered
grounds means the POPULATION of entries is untrustworthy, not a handful of them. Patching the
entries someone happened to question would leave every unquestioned entry standing on the same
broken instrument. **Re-measure what you need; cite nothing from it.**

**THE CORRECTED INSTRUMENT'S CONTRACT , THE REUSABLE PART.** Resolve the ground by what actually
PAINTS, not by what CSS says:
- **SVG text hit-tests its sibling shapes** in the same `<svg>` whose box contains the text's
  centre, TOPMOST wins, which in SVG is the LAST in document order.
- **A gradient resolves from its own colour stops**, sampled at the text's vertical position
  within that box.
- **A layered background is walked from the LAST layer upward**, because the last layer is the
  bottom one, and the first opaque stop found is the base.
- **A stroke counts.** A glyph is legible if EITHER its fill or its outline separates.

**AND IT CARRIES FIVE CONTROLS, BECAUSE EACH FAULT WAS INVISIBLE UNTIL ONE CAUGHT IT:** flat pass,
flat fail, gradient fail, SVG-over-sibling pass AND SVG-over-sibling fail. **Every one of the three
faults was found by a control disagreeing, never by reading the code.** A contrast instrument
without controls is not evidence.

**THE DEFECT THAT PROMPTED THE RE-RUN IS THE PROOF THE OLD ONE WAS BLIND:** the card's club/pos/age
sub-line sat at **1.90 in dark mode on every plain card on every surface** , the large majority of
cards , and the 2026-08-23 pass did not report it.


---

## THE HARNESS FAULTS , PROMOTED OUT OF THE 2026-08-28/29 LOGS BEFORE THEY WERE ARCHIVED (2026-09-01)

**These were recorded ONLY inside two session-log entries and were about to be archived with them.
All three were re-hit during the 2026-09-01 session, which is how the omission was found.**

**(1) THE BROWSER WILL NOT RESIZE IN THIS ENVIRONMENT.** A resize call reports SUCCESS while
`innerWidth` stays at the desktop value and `outerWidth` reports **0**. Every measurement taken
after it is a desktop measurement wearing a mobile label. **Hit twice: 2026-08-28 and again
2026-09-01, where `resize_window` returned "Successfully resized to 390x844" and the page was
still at 1920 with the mobile media query FALSE.**
- **THE METHOD: measure in a SINGLE iframe with its own viewport, and assert
  `matchMedia('(max-width:820px)').matches` AND `innerWidth` before believing any number.** One
  frame, not many , an eight-iframe contact sheet made the compositor return stale and blank
  captures, which is a different failure that looks like a rendering bug.

**(2) `window.X` IS A DIFFERENT BINDING FROM A SCRIPT-SCOPED `let` OR `const`, SO SEEDING STATE
FROM OUTSIDE SILENTLY MEASURES THE OLD STATE.** A top-level `var` or `function` becomes a window
property; `let` and `const` do not. **Three instances, all live code:** `let D` on card.html
(2026-08-28), `let CMP_A` on compare.html and `const sb`/`vvClient()` (both 2026-09-01).
- **Setting `window.CMP_A` renders nothing and reports no error** , the page keeps showing empty
  slots and the numbers look plausible, because an empty slot and a card are the same box.
- **THE METHOD: drive the page through its OWN functions** (`openPicker` / `pkPick`), never by
  assigning to `window`. **And a harness that cannot move the state under test reports a failure
  and a pass identically.**

**(3) MONKEY-PATCHING AN EXPORTED `VVCore.*` FUNCTION DOES NOT REACH A CALLER THAT USES THE
MODULE-LOCAL BINDING.** `vvRenderShareImage` calls the local `vvShareFrameHTML`, so patching the
export is ignored. **Two "negative controls" came back byte-identical to the positive case and only
the identical byte count revealed it.** To break a module-internal path, break the INPUT on disk.

**AND THE DATA CORRECTIONS FROM THE SAME ENTRIES:** the card population is **57,058**, not the
57,234 quoted in older text; and **`psc.rt` and `player_card_mv.rt` DISAGREE , the matview is what
the site reads, so never quote `psc.rt` as a card's score.** A `body:not(.light)` selector at
(0,2,1) beat `.wmg-h.neutral` at (0,2,0) on `vvindex.html`, correct in light and wrong in dark,
which is why that one survived.
