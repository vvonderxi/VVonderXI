# THE CASE FOR `VV_PROSE` ON, VERDICTS ONLY (written 2026-10-24 for Lucas to decide; nothing is on)

**`VV_PROSE=on` today ships the writer that invented seven facts a piece.** `api/analyse.js` still calls the writer that was switched off on 2026-10-17: the page's own instructions, Sonnet, 1024 tokens, no citations, no drop rule, no narrow check. The cited writer (`scripts/calibration/cited.js`) lives in a calibration script and is in no serving path. **None of this week's work reaches a reader until it is ported.** So the decision is not "flip the switch". It is: port the cited writer into the verdict path, prove the port on both samples THROUGH the endpoint, then flip for verdicts only. The port is not started (Lucas, 2026-10-24: "do not start the port").

## 1. What porting `cited.js` into `api/analyse.js` involves

- **The fact list from the request.** The verdict request already carries the `Player A:` and `Player B:` lines that `verdictFacts` parses, and the honour and tag copy comes from `vv-core.js`, which the function can require. No rendered page is needed. This part moves as it is.
- **P1 from the printed result line, not from instructions.** Today the page sends `Result: <a paragraph telling the writer how to behave on a tie, a near tie or a separated pair>`. The cited writer needs P1: the sentence the page prints under "The Verdict", word for word, because every crown must cite P1 and the headline must name the player P1 names. The port has the page send that printed sentence as a body field and the server use it as P1, with one cross-check: the server recomputes the separation from `rtA`, `rtB` and `vv-margin.js`, and a request whose result line disagrees with the margin is refused. **This is kind 3's mechanism.** The old writer was told about the separation and left to argue; the cited writer's crown is bound to the page's own line and code deletes or rejects anything else. The port closes kind 3 by construction, not by prompt.
- **The pipeline inside the function.** One writer call (Sonnet 4.6, 4000 output tokens; the function's `MAX_OUTPUT_TOKENS` clamp of 2048 must allow it), then one narrow-check call per sentence in parallel (about 20), the code drop rules, whole-piece rejection, one regeneration. Worst case two attempts, about 45 model calls, perhaps 60 to 90 seconds. `vercel.json` sets fluid compute and no `maxDuration`; the Pro duration limit must be confirmed before the port, not after.
- **What ships and what is cached.** `assemble` returns the same `{who, p1, p2, h2h, verdict}` shape the page renders and `verdict_cache` stores. `cache_version` changes, so all 229 cached verdicts (every one from the old writer) regenerate on next view or are purged first. `winner_card_id` comes from P1, not from the model: `checkProseWinner` and `resolveWinnerId` retire. A no-prose outcome (rejected twice) returns the held shape the page already renders ("No written opinion here, by choice") and is cached as no-prose for that stamp, so it is not retried and billed on every view.
- **The switch becomes three-valued:** absent or `off`, `verdicts`, `on`. Under `verdicts` the notes branch returns `{ off: true }` exactly as today. Keepers get no prose from the cited writer; the function returns the held shape.
- **The old writer leaves the verdict path.** `verdictSystemFor`, the page's `system` text and the instructions block no longer reach the model on a verdict. Less to drift.
- **Proof before the flip.** Both samples run THROUGH the deployed function (a preview deployment with the key), not through the script; the tools first, then Lucas reads both lists. The self-test (`cited_selftest.js`, 88 cases) must pass unchanged.
- **Effort:** one session to port and self-test, one to run both samples through the endpoint and read them.

## 2. Cost at today's traffic

| | |
|---|---|
| Comparisons, last 30 days (events table) | 45, on 13 distinct pairs |
| Comparisons, last 7 days | 8 |
| Cost per shipped verdict, tonight's runs (writer plus narrow checks, regenerations included) | about $0.10 ($0.59 for 6 pieces, $1.14 for 12) |
| First week at today's traffic | under $1 |
| First month, even if every comparison regenerated | 45 × $0.10 = $4.50 |

Two things cost more than traffic. **A prompt edit makes every cached verdict stale** (on 2026-10-17 the notes cache held 731 rows and 6 were current), so an edit after the flip is a regeneration of every pair viewed since. **The abuse ceiling rises per piece:** the hourly limiter was sized for about $0.011 a verdict and now bounds $0.10 a verdict; QA_PASS B4b's figure of about $312 a day at full abuse must be re-derived, and the spend alarm that was a condition on 10-17 is still not built.

## 3. What is still unchecked

- **The serving path.** Zero of the 490 read sentences came through `api/analyse.js`. The port is new code until the samples run through it.
- **Pair shapes outside the sample.** All twenty items are top-five-league, 2015 or later, outfield. The separated pairs are Winger and ST only (no midfield or defender pair clears its margin at known names). No keeper (no prose by rule), no pre-2015 card (the era fact exists, never exercised in a run), no cross-era pair, no lower league.
- **The narrow check is still a model.** It is the second reader of every judgement sentence. Its misses are bounded by the citation rule (a sentence can only rest on cited facts) but not to zero, and the quality residue ("an availability that never watered") passes every rule.
- **The hole is 0 of 490, read by the tools and one reader in one day.** That bounds the rate to under about 0.6% at 95% confidence. It is not zero.
- **Tonight's four changes** (notes form, headline instruction, dimension subsets, the tools' repair) are in two confirming runs still in flight; their figures are appended below when they land.
- **The tools' accepted loss:** a number stated as the wrong unit ("7 appearances" when 7 is his goals) is no longer a code flag; the writer-side rule never checked units; the sentence judge is what sees that shape.
- **The race** (two simultaneous first requests for one pair both generate, measured 2026-10-08), **the balance watch**, **`maxDuration`**: all open since 10-18.
- **Position errors (§D item 6)** change the pool and the percentiles the prose cites. The prose would be faithful to a wrong card. Vinícius 23/24 still reads ST.
- **The Chronicle** is out of the fact list, so prose cannot contradict it, but nothing checks the Chronicle's history (area 10).

## 4. What would make Lucas turn it off (agreed in advance, so it is not decided under embarrassment)

- **Any shipped sentence stating a fact the page does not hold, found by anyone.** Off that day; the pair joins `HELD_PAIRS`; the shape goes into the self-test before prose returns.
- **Any crown that contradicts the page's result line, or a headline that does not name P1's winner.** Off.
- **A day's Anthropic spend above $5 with no matching traffic in the events table.** Until the alarm exists this is a manual read.
- **Any verdict request that times out at the function.** The page's fallback hides it, which is why it must be an off trigger and not a tolerated rate.
- **Not an off trigger, but a product decision:** a no-prose rate above a third of new pairs over a week. Tonight's runs ship 26 of 28 verdicts; if the live rate is lower, the site is "sometimes a verdict" and the fallback line is doing the work.

## Recommendation

Do not flip now; it would ship the old writer. Approve the port with the proof step, then flip for verdicts only after both samples pass through the endpoint. Notes stay off until they ship twice.

## BEFORE AND AFTER, IN ONE PLACE (written 2026-10-25, before the decision, at Lucas's instruction)

**17 October, what the old writer shipped.** Twelve pieces of live prose, nine verdicts and three card notes across four prompt versions, were read sentence by sentence against the cards they were written from, by Lucas and by me, and the set was re-read and relabelled on 23 October with every card rendered. The twelve held **222 labelled claims: 88 invented world facts** (kind 1, present in all twelve pieces, about seven a piece: transfers, debuts, other seasons, "a January acquisition"), **69 claims that contradicted the card's own figures** (kind 2, about six a piece, because the writer was sent raw per-90 values and never the percentiles the reader saw), **19 crowns the cards' own honours and dimensions contradicted** (kinds 3 and 3b), **7 verdicts that contradicted their own headline** (kind 4), one kind 5, and 38 claims that were true. **Zero of twelve passed.** The checker built to catch this caught kind 1 only and was never switched on.

**25 October, what the serving path ships.** The cited writer, in `api/analyse.js` behind the real request and the real cache, ran both samples twice on the closed rules through the branch preview: passes 2 and 3, 36 pieces (28 verdicts, 8 notes), **36 of 36 shipped, 706 sentences, 17 to 56 seconds a piece, no server-side death.** Against the same four kinds: **kind 1, invented world facts: 0 of 706** found by the tools or by my reading (the writer can only state what it cites, code deletes what it states anyway, and 63 of pass 2's 349 sentences name a club or league, each cited or it could not have shipped). **Kind 2, contradicting the page's figures: 0 real** (the code number check and the Sonnet judge raised 15 flags across the two passes, every one read: the tools' own binding shapes, fixed as they appeared, and the judge counting the band chip as a tag). **Kind 3, a crown against the page: 0 by construction**, since a crown must cite the result line the page prints and the server rebuilds; the one crown flag in pass 3 was the Haiku read calling "The Index cannot separate Rodri and Rice, with Rodri taking the Ballon d'Or" a crown. **Kind 4, a verdict against its headline: 0 by construction**, since the headline must name the winner the result line names or the piece is rejected.

**The caveats, stated plainly.** (1) The unit is not the same: 17 October counted claims found by two human readers; today counts sentences cleared by the tools and one reader, me, with Lucas's reading of the pass 2 and pass 3 lists still to come (his reading of 490 earlier script-run sentences found zero). (2) The pieces are not the same: the twelve of 17 October were the homepage and linked pairs (several now in `HELD_PAIRS`); today's twenty are a built sample, top-five-league, 2015 or later, outfield, separated pairs Winger and ST only, no keeper, no pre-2015 card. (3) The hole as defined on the script runs, a club or league named without its citation, cannot be counted on an endpoint run because the server returns prose and not the citation record; it is enforced server-side on every sentence, which is a stronger guarantee and a weaker measurement. (4) The narrow check is still a model, and the judgement sentences it passes rest on cited facts but are judgements. (5) Two passes on one build is Lucas's own gate, met for verdicts (14 of 14 and 14 of 14) and for notes (4 of 4 and 4 of 4); the earlier script-run history (4 of 6 then 1 of 6 on one day) is why one pass is not enough. (6) One wording residue is known and closable, "sit in his cabinet" for this season's honours; the rule waits for pass 4.

**The comparison the decision rests on, in one sentence:** seven invented facts a piece and zero of twelve pieces passing on 17 October, against zero invented facts in 706 sentences and 36 of 36 pieces shipping on 25 October, through the serving path, with the units and the sample stated above.

## THE NOTES' TWO PASSES ON THE RULES THEY WOULD SHIP (2026-10-25, passes 4 and 5, 13:09 and 14:10 UTC, the same build)

The card's glance line, Scout Report and Notes were gated on two clean passes on the rules they would actually ship, since the cabinet rule and the NR wording landed after passes 2 and 3. Both passes ran through the branch preview built from `8cb7fbe`, whose code is byte for byte the Production deploy `d17e3fe` (the difference is documentation), with the sample rows cleared between.

| | Pass 4 | Pass 5 |
|---|---|---|
| **Notes, four cards** | **4 of 4, 93 sentences, 2 flags (both the tools)** | **4 of 4, 87 sentences, 0 flags** |
| Verdicts, fourteen pairs | 13 of 14 (Kane v Mertens, share rule, fair) | 13 of 14 (De Bruyne v Pogba, "16 assists lead the league" refused twice, fair) |
| Seconds a notes piece | 19 to 23 | 18 to 20 |
| Flags in all, real on my reading | 7, one wording fault ("97 per cent" for a percentile; a writer rule in the repo since `17be70e`, not on this build) | 3, none |

The notes read like the card: "Osimhen, 24, scored 26 goals for Napoli in Serie A in 22/23, earning the Golden Boot." The two verdict losses are the rules working on writer faults, one in fourteen each pass, and verdicts are live regardless. Lists: `fresh_endpoint_pass_4_lists.md`, `fresh2_endpoint_pass_4_lists.md`, `fresh_endpoint_pass_5_lists.md`, `fresh2_endpoint_pass_5_lists.md`. **The flip to `on` is `vercel env add VV_PROSE production --force` with the value `on`, then `vercel redeploy` of the production deployment; no push is needed, since Production already runs the code these passes ran.** The percentile-is-not-a-percentage rule is the one closure that is in the repo and not on that build; carrying it means a push and a changed rule set.

## OPERATIONS: THE PAIRS THE SAMPLE DOES NOT COVER, THE KILL SWITCH, THE SPEND ALARM (2026-10-25, Lucas's three questions before the decision)

**1. What the code does on a pair the sample never saw, read from the code, not from runs.**
- **A keeper on either side:** no prose, no model call. `sideFacts` marks the pack a keeper on `pos GK`, `runPiece` returns no-prose at once, the server caches it as such and answers the held shape; a keeper's card gets `{ off: true }`. Self-tested.
- **A pre-2015 season:** prose is attempted from what the page prints. The dimensions arrive as NR and produce no facts; the Proof rows arrive as NR and are stated as "not recorded"; goals or assists never recorded are stated as not recorded (this read found that they would have become "null goals"; fixed and self-tested, waits for pass 4). Fewer facts, the same rules; a piece with too little to say dies on the share rule and the reader sees the result and no prose. The era sentence ("only appearances, minutes, goals and assists were recorded") exists on the card's notes only.
- **A cross-era pair:** nothing era-specific; each side's facts are its own season's, other seasons are banned, the result line comes from the two scores and the pair's margin. Prose is attempted like any pair.
- **A lower-league pair, or any pair whose margin `vv-margin.js` cannot give:** the engine's own rule applies before the writer: an unknown margin is treated as not separated, the page prints "The Index cannot separate these two", the server rebuilds the same line, and the writer gets a tie pack with no crown. Prose is attempted; it agrees with the page by construction.
- **A CDM pair:** covered (Rodri v Rice shipped in passes 2 and 3) and, on Compare, written with no defensive Proof rows, which is the §D page error, not a writer fault.
- **A browser tab holding the old `compare.html`:** its request carries no `resultLine`; the server answers 400 and the page shows its failure line, no prose. **A held pair:** the held shape, whatever the switch. **A fourth new comparison in a minute from one address:** 429 and the page's wait line.
Nothing in the list is "unknown": every shape is either no prose, the same rules on fewer facts, or the engine's existing answer.

**2. The kill switch, measured on Preview on 2026-10-25.** Two halves.
- **The whole thing off, from the repo, about 30 seconds:** `vercel env rm VV_PROSE production --project v-vonder-xi --yes` then `vercel redeploy <the current production deployment url>`. Measured on Preview: the variable removed, the redeploy ready in 12 seconds, the next request answered the off shape. **The cache does not keep serving a bad piece:** the switch is tested before the cache is read (`api/analyse.js`), so with it off no cached verdict or note reaches a reader, and the rows stay in the table for reading. Production deployments are Lucas's by the ways of working; the two commands are his to run, or mine on his word.
- **One pair or one card, in seconds, no deploy:** `node scripts/prose_hold.js <lo-hi>` or `node scripts/prose_hold.js card <id>` rewrites the cache row the endpoint reads so the next request answers held or off without a model call; `--release` deletes the row so it regenerates. **The permanent hold is `HELD_PAIRS` in `api/analyse.js`,** which survives regeneration and a changed version.
- **Not a kill:** deleting a cache row (the next view regenerates); changing the key (the function answers 502 and the page shows an outage).

**3. The spend alarm, built, mail pending one key.** `api/spend-check.js` on a Vercel cron at 23:30 UTC counts the day's generations in `api_rate_events` (one row per verdict or notes generation; cache hits write nothing; the table prunes after 24 hours, hence daily and late), prices them at $0.12 a piece (the measured figure was about $0.10 with regenerations; the bound errs loud), compares with `SPEND_ALERT_USD` (default $5) and mails `ALERT_TO` through Resend with `RESEND_API_KEY`. Protected by the existing `CRON_SECRET`. Without the three variables it counts, logs and answers; it cannot mail. `node scripts/spend_today.js` gives the same count from the repo at any hour (on 2026-10-25 it read 42 verdict and 14 notes generations, the three proof passes and two probes, about $6.72 at the bound). **It is an estimate; the bill is the Anthropic Console, which is Lucas's, as are its alerts, still below the month's spend.** What Lucas adds: a Resend sending key restricted to the domain, into the Vercel project as `RESEND_API_KEY`, plus `ALERT_TO` and the threshold.

## THE PORT IS DONE (2026-10-25, commit on this date; the switch is still off)

Built as specced in section 1, with one correction to the spec: the shared function that prints the result line (`VVCore.vvResultLine`) now lives in `vv-core.js`, so the page prints it, sends it, and the server rebuilds it from the two scores, the ages on the lines and the pair's margin (`vv-margin.js`, loaded as the global vv-core looks for) and refuses a request whose line disagrees. Measured without a key: all 18 captured requests of both samples agree with the server's line; a wrong line is refused with 400.

- **`api/analyse.js`** is 647 lines, from 1,339. The old writer, the judge block, the notes prompt, the checker and the winner helpers are gone (git history before this commit). The switch is three-valued: absent or anything else is off; `verdicts` serves comparisons only; `on` serves both. The fact list is built with `verdictFactsFrom` (the two Player lines plus the agreed result line) or `notesFacts` (the card payload); `runPiece` writes, checks, deletes and rejects; a twice-rejected piece is cached as no-prose and the page gets the held shape (Compare) or `{ off: true }` (the card); an upstream failure on every attempt is a 502 and is not cached. The crown and `winner_card_id` come from the engine's context, never the model. Keepers get no prose without a model call. The cache version is the cited writer's `RULES_VERSION` (a hand rev for the code rules plus a fingerprint of its prompts and formats) with the page's `payloadRev` and `statsRev`, so every row the old writer wrote is stale by construction. The rate limit counts a generation, not a model call. `vercel.json` gives the function 120 seconds.
- **`compare.html`** sends the two Player lines and `resultLine`, nothing else of the old instructions (the tone note, the tag menu and the headline spec are gone; the verdict tag is the engine's). The request is about 2,000 characters.
- **`scripts/calibration/sample.js --endpoint <preview url>`** posts each captured request to the deployed function and runs the same tools over what comes back. The server does not return the writer's attempts, so an endpoint run has the tools and the reading, not the deletion record.
- **What the proof runs need from Lucas:** `VV_PROSE=on` in the Vercel project **scoped to Preview only** (never Production), the Anthropic key present in the Preview environment, and the preview URL of this branch. The per-IP limit is 30 generations an hour, so one pass of both samples (18) fits and the second pass runs an hour later.
- **Checks:** `node scripts/calibration/cited_selftest.js` (107 cases, including the port's entry and the shared result line); `node scripts/lint-inline.js` (re-pinned to the cited prompts and the new payload hash); the smoke test with a stub key reached the writer on all 18 requests and refused a wrong line, missing lines, and notes under `verdicts`.
- **Known and left:** `scripts/rl_control.js` has not driven the handler since the 10-17 switch (it never sets `VV_PROSE`); `scripts/calibrate-verdict-check.js` is retired in its header.

## THE PROOF RUNS THROUGH THE PREVIEW DEPLOYMENT (2026-10-25)

Both samples were posted to the branch preview with `sample.js --endpoint`, the exact request the page sends, and the tools ran over what came back.

| | Pass 1 (08:17 UTC, before the closures) | Pass 2 (09:19 UTC, closed rules) |
|---|---|---|
| Sample 2, six separated pairs | 6 of 6 shipped, 114 sentences | 6 of 6, 111 sentences |
| Sample 1, eight pairs | verdicts 5 of 8 | 8 of 8 |
| Sample 1, four cards | notes 2 of 4 | 4 of 4 |
| Seconds a piece in the function | 20 to 53 | 17 to 56 |
| Tool flags | 14 (13 the tools' own, 1 real: "as P1 states") | 8 (none real on my reading, below) |
| Server-side deaths | 5, all "the headline was deleted" | 0 |

**Pass 1's five deaths were one repeated cause, closed before pass 2:** a league named in the headline without the identity fact (the example citation steered the writer to P1, A2 and B2) and, on the second attempt, tag counts off by Peak and The Standard because the writer never saw the totals. Both are in `cited.js` now (the headline cites A1 and B1; the totals open the writer's facts). The real flag, a fact id in prose, is a writer rule.

**Pass 2's eight flags, read:** three are the tools (a conversion difference called "points", "at 39 out of 100" read as an age, two rates sharing one "per 90"), all fixed and self-tested the same morning; three are the Sonnet judge counting honours as tags or missing a per-90 figure that the Compare Proof prints; one is the judge misreading "the Ballon d'Or and the UCL sit in his cabinet from this season" (both are this season's honours on Accolades; the word "cabinet" is the writer's, and a reader of the card's Cabinet block could stumble on it: a wording residue for Lucas, not a false fact); one, "0.92 goals and 0.16 assists per 90", is the fixed shape. The hole as defined (a club or league named without its citation) cannot be counted by citation on an endpoint run, but the club rule runs server-side on every sentence; 63 of pass 2's 349 shipped sentences name a club or league and every one was cited or it would not have shipped.

**Pass 3 (10:21 UTC, the pass-2 build, nothing changed): 18 of 18 again, 357 sentences, 19 to 34 seconds, 7 flags, none real on my reading:** three the tools ("at 33 percent" read as an age, "shots on target 55 times" as appearances, "four point to" as Index points; all fixed after the pass), one a count word bound to goals, one the Haiku crown read on a "cannot separate" headline, one the judge calling "the Golden Boot in La Liga" a world fact when the card prints the league and the honour. Lists: `fresh_endpoint_pass_3_lists.md`, `fresh2_endpoint_pass_3_lists.md`.

**The count filter audited:** the 139 count-claim sentences in the four pass files were re-judged; 9 came back unsupported and all 9 are the judge counting the band chip as a tag or reading the Cabinet as this season's honours. No true catch was hidden; the code count check is the arbiter and was right every time.

**What this does and does not say.** On the closed rules the serving path shipped 18 of 18, notes 4 of 4, inside the function's time, through the real request and the real cache, with the tools finding nothing I read as a false fact. It is one pass on the closed rules (notes need a second, by Lucas's gate), and the lists are his to read: `_local/verdict-check/fresh_endpoint_pass_2_lists.md` (238 sentences) and `fresh2_endpoint_pass_2_lists.md` (111). The switch is off in Production.

## Confirming runs on the four decisions (20:27 UTC, both cut short by the Anthropic spend cap)

**The account's monthly spend cap fired during both runs:** every model call after about 20:35 UTC returned `400 invalid_request_error: You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.` That is the cap QA_PASS B4b asks for (Console, Settings > Limits), which no session could verify from here; it exists and it fires, which is the one good thing the cap did tonight. Nothing more can run until Lucas raises it or 1 November. The key was still in `.env` when the runs started (Lucas had said it was out); it is still there.

| | Sample 2 (six separated pairs) | Sample 1 (eight pairs, four cards) |
|---|---|---|
| Writer | complete: **6 of 6 shipped**, 2 on regeneration | verdicts 6 of 8 (Rodri v Rice lost to the cap, 17 of 20 narrow checks failed; Benzema v Mbappé a real rejection, headline then share rule); **the four notes never ran** (writer failed on the cap twice each) |
| Shipped sentences | 112 | 110 (verdicts only) |
| Code hole (club or league named without its fact) | 0 of 112 | 0 of 110 |
| Tools | 80 of 112 sentences judged before the cap; **2 real flags**, 1 false; 33 unjudged | none ran |
| Lists | `_local/verdict-check/sample_2_run_3_confirm_lists.md` (the 33 "failed to answer" entries are unjudged sentences, not flags) | `sample_1_run_5_confirm_lists.md` (unjudged throughout) |

**What the partial evidence says about the four decisions:**
- **Headline instruction: worked.** All eight sample 2 headlines state the result and one fact ("Salah wins it outright, 92 to 81, with the Golden Boot to his name"). One was deleted (a league named without its fact), against three flourish deletions a run before. Regenerations 2 in six, from 3.
- **Dimension subsets: no misfire.** Every count deletion in both runs is a tag or honour count the writer got wrong or subset ("five tags" on a six-tag card), which must stay exact; no dimension count was deleted.
- **Notes form: untested.** The cap took all four notes pieces before the writer answered.
- **Tools' repair: held.** No cross-unit arithmetic flag in 80 judged sentences. One new false shape found and fixed the same night ("Reliability rated at 39 out of 100" bound to an age; the dimension word now wins over the "at N" rule; self-test 89).

**The one real read for Lucas, a new shape:** Suárez v Payet, "only Suárez holds an honour, the Top Assists award". True of the season (Payet 21/22 has no honour fact) and the sentence cites it correctly. But Payet's card prints The Cabinet, "What he had won by this season: Top Assists, 2017", and a reader sees a Top Assists on both cards. The Cabinet is page content outside the fact list, as the Chronicle is. Decision: add Cabinet lines to the fact list (so "only X holds an honour" can be checked against it), or forbid "only" and "no honour" claims unless the sentence says "this season". Not a hole, nothing invented; a page-agreement shape.

**So the confirming runs do not confirm.** Sample 2's writer result (6 of 6, hole 0 of 112 by code) is the one clean figure. The condition for this case, "the hole holds at zero and notes ship", is unmet on evidence, not failed: it needs the two runs again once the cap is raised, and that is also when Lucas reads the lists.
