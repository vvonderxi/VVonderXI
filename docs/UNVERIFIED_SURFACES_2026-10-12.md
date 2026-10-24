# WHAT THIS PLATFORM ASSERTS THAT NOTHING VERIFIES , THE MAP (2026-10-12)

**Start here.** This is the map of every kind of claim the platform makes that no check reads,
with what (if anything) now covers each one. It exists because a stranger asked how the league
weights are made, in a reply to a paid ad, and answering properly found the VV Index overstating
the league's effect by three times. Every defect found that week had one shape: valid, rendering,
erroring nothing, and wrong. This map is the class, so the next instance is found by looking
rather than by a stranger.

**Before 2026-10-12, six of the seven areas mapped that day had nothing checking them at all.** The only one
with any check was numbers drawn into images, and that check was a ledger run by hand.

The figures here are dated measurements. Re-derive before quoting them.

---

## THE AREAS (seven mapped 2026-10-12, more added since; count the ### headings, do not quote a number)

### 1. Sentences on the site that describe what the engine does
- **Size (measured 2026-10-12):** 142 sentences on the VV Index, Playbook and card page.
  79 verified against code, 15 wrong (14 distinct), 40 imprecise, 8 resting on a measurement or
  memory. By page, wrong / imprecise: VV Index 2 / 13, Playbook 10 / 23, card 3 / 4.
- **What covers it now:** the worked example's league step generates its numbers (`782ab82`);
  the review cadence in CLAUDE.md SS C (engine change, before a paid campaign, monthly).
- **Still to build, in order:** the VV Index batch (ten sentences, wording shown), the Playbook's
  ten wrong sentences, the Playbook's tag lists and verdict spectrum READ FROM THE CODE with a
  lint that every tag shown can be awarded, then a **claims register**: each verified sentence
  recorded with the exact code expression it depends on, and a script that fails when that
  expression changes. It cannot say a sentence is true; it says the ground moved under it, which
  is what was missing on "x 0.796".
- **What only a person can check:** prose about meaning (what a dimension "is").

### 2. What the AI writes (cached verdicts and card notes)
- **Size:** about 160 verdicts and 730 notes cached on 2026-10-12, growing with traffic.
- **What covers it now:** `scripts/lint-ai-cache.js` (`c706ec4`): hard rules for tie verdicts
  that crown a winner, a score named on an inside-margin verdict, a dimension name outside the
  five, dashes, marks on the glance; phrases that look like claims beyond the payload are listed
  to read. Control: it reproduces the 63 of 69 tie defects measured by hand on 2026-10-04.
  The prompt edit `a585770` added the two rules the defects called for (the card's fields are
  the evidence; the model knows only what it was given).
- **What only a person can check:** whether a claim about football is true. The weekly read
  (`node scripts/lint-ai-cache.js --read 10`) is the cover, and it is a person reading.
- **[2026-10-17] SUPERSEDED BY AREA 9.** When it was finally done, the read failed twelve of
  twelve, and all model prose is now off. Read area 9 before anything here.

### 3. The AI prompts' own claims about the engine
- **Size:** about 100 engine-describing sentences in each prompt. One was wrong (the pre-2015 era
  line said assists do not exist) and one was not a claim at all but an internal change note
  sent to the model on every call. Both fixed in `a585770`.
- **What covers it:** nothing automatic yet. Prompts belong in the claims register (area 1).
- **What only a person can check:** the same as area 1.

### 4. Copy that promises behaviour (privacy, empty states, disclosures, sign-up text)
- **Found live:** search text was sent to Vercel while the privacy page said it was not.
  Fixed `56c645c`: the events send a count, never the words.
- **What covers it now:** `scripts/check-privacy-fields.js`, run inside `lint-inline.js`: every
  field the code sends through four channels (Vercel events, our event table, the waitlist, the
  AI rate limiter) must be declared by a phrase on the privacy page. Controls: a planted field
  fails, a removed phrase fails, the 2026-10-11 code fails. The traffic report checks the
  retention promises (90 days, 24 hours, the hourly job) and exits 2 if any fails.
- **Still uncovered:** process promises ("we do not fill gaps by hand", which is false: about 145
  assists were filled by hand; "you will hear once when it opens"). Only reading.
- **Blind spot of the check:** a fifth channel. A new provider or table is invisible to it until
  the channel is added.

### 5. Numbers drawn into images
- **What covers it:** `docs/MARKETING_FIGURES.md`, re-run before each publication, and
  `scripts/card-export.js`, which draws cards from live data. By hand; nothing runs it for you.

### 6. Comments and docs read as fact by future sessions
- **Size:** the handover a new session is routed to (`HANDOVER_2026-09-19.md`) was **263 commits**
  out of date on 2026-10-12. The homepage rotation comment claimed "the league weight decides"
  a pair; measured exactly, it is two of three points and the pair is inside the margin.
- **What covers it:** only the SS D rule that an open item carries the command proving it open.
  Nothing checks a comment or a routing document. Only reading.

### 7. Configuration correct but unused, or used but undocumented
- **Unused (2026-10-12):** the cron secret (no code reads it), the Google sign-in setup (no page
  signs in), the `player_career_position` table (no consumer), the league weight fallback 0.80
  (never reached: the table covers every league and season).
- **Used but documented only in a migration:** the hourly retention job.
- **What would cover it, cheaply:** an inventory script listing env variables, scheduled jobs,
  flags and event names, compared against the docs. Not built.

### 8. Controls in states the click check cannot reach (added 2026-10-13)
`scripts/check-controls.js` hit-tests every visible control on every shipping page, full length,
at desktop and phone. **Do not read the script and assume clicks are covered. It sees each page
only as it loads.** What it cannot see, in the words used when it was built:
- **States you only reach by using the page.** An open filter sheet, a shown verdict, an expanded
  panel, an open menu, a chosen card. A control that is covered only in one of those states
  passes the sweep. (The back-to-top button under the install strip was caught only because the
  strip appears on scroll, which the sweep happens to do.)
- **A click that arrives but does nothing,** for example a broken handler. The sweep proves the
  click reaches the control, never that the control acts. Catching that means clicking for real
  and reading the page's state afterwards, feature by feature, as was done for the homepage theme
  button and My Club on 2026-10-13.
- **Real phones, Safari especially.** Headless Chrome only.
- **What covers it today:** nothing automatic. The pre-push pass is the script, then about a
  minute clicking through the handful of controls the change touched and confirming each does
  what it should. **What would cover it, cheaply:** a list of named states per page (open the
  rankings filter sheet, settle a compare pair, open each fold) driven through the page's own
  functions, with the same hit-test run in each. Not built.

### 9. The model's prose, read against its own cards (added 2026-10-17). READ THIS BEFORE TURNING PROSE BACK ON
**Twelve readings, zero passes. All model prose is switched OFF** (`VV_PROSE` unset, `e930b39`):
no verdict, no glance line, no Commentator's Notes, no Scout Report is generated or served. This
is a decision about the evidence below, not an outage. Do not switch it on because a fix "should
work"; switch it on when a re-read sample passes.

**The readings, each one read sentence by sentence against the two cards (or one card) the prose
was written from, quoting every sentence the cards do not support (the full quotes are in the
2026-10-17 session; the row backups are beside the hold migration):**

| # | What | Prompt | Kinds |
|---|---|---|---|
| 1, 2 | Salah 24/25 v Mbappe 21/22, two rolls (2026-10-12) | Path B | 1 |
| 3 | Bellingham 23/24 v Foden 23/24 | Path B `v3-4a1dd3f5` | 1, 3 |
| 4 | Palmer 23/24 v Saka 23/24 | Path B `v3-4a1dd3f5` | 1, 2, 4 |
| 5 | Lewandowski 20/21 v Kane 23/24 (tie) | Path A `v3-b31aa83d` | 1 |
| 6 | Messi 11/12 v Ronaldo 14/15 | Path B `v3-4a1dd3f5` | 1 (and a crown inside the margin) |
| 7 | Haaland 22/23 v Lewandowski 20/21 | retired `v3-9a7cbfe1` | 1, 2, 3 |
| 8 | Suarez 15/16 v De Bruyne 19/20 | retired `v3-9a7cbfe1` | 1, 3 |
| 9 | Haaland 22/23 v Suarez 13/14 | Path B `v3-4a1dd3f5` | 1, 4 |
| 10 | Card notes, Tresoldi 25/26 | notes `v3-a0185f4f` | 1 |
| 11 | Card notes, Messi 11/12 | notes `v3-a0185f4f` | 1 |
| 12 | Card notes, Lammens 25/26 | notes `v3-a0185f4f` | 1 (and self-contradiction) |

Verdicts and notes alike; the current Path A prompt, the current Path B prompt, a retired prompt
and the notes prompt alike. **The figures were almost always right. The failure is around them.**

**The four kinds, with the sentence that defines each:**
1. **Invented world facts** (all twelve). Transfer dates ("a January acquisition"; Palmer signed
   on 1 September 2023), records ("breaking Gerd Muller's 49-year-old record", a "record" Golden
   Boot), league and club narratives ("a Premier League club in crisis", "the best attacking trio
   in the sport's recent history"), career history ("a first full Premier League campaign").
   Often TRUE of football. Never on the card.
   **[CORRECTED 2026-10-23: "NEVER ON THE CARD" WAS WRONG FOR ANYTHING THE CHRONICLE STATES.** The
   readings checked the figures and the honours, not everything the card renders. Lewandowski's
   card says "For forty-nine years Gerd Muller's 40 stood as Bundesliga gospel"; Haaland's, "Haaland
   needed only his first season"; Messi's, "a figure no one has matched"; Kane's, "a new Bundesliga
   life"; the Player of the Season copy, "the honour his peers and the watching game give"; Iron
   Man, "never misses a game". By the rule a reader can check those, so they are not kind 1. **Kind
   1 is a world fact that no page the reader sees states: Compare, both cards, the Chronicle, the
   honour copy and the tag copy.** Ten of the original 36 kind 1 labels, among them the Muller
   example above, are "leave" in the corrected set.*
   **[NARROWED THE SAME DAY (Lucas, 2026-10-23): THE CHRONICLE COUNTS FOR ITS FIGURES ONLY.** Its
   figures were read against their cards (area 10); its records, the years they stood, scorelines,
   opponents, debuts and arrivals were not, and they are most of its text. **Kind 1 is a world fact
   no page states, where the Chronicle states only figures:** "breaking Muller's 49-year-old record"
   is kind 1 again although Lewandowski's Chronicle says it. 16 leave rows that rested on Chronicle
   history moved back to kind 1; the set is now 88 kind 1 and 38 leave. Honour and tag copy still
   count in full.]**
2. **Claims that contradict the card's own percentiles.** "His Progression figure sits inside a
   breath of the 90th percentile bar" on a card reading 81; Saka's defending "separates him from
   almost any other winger" at 72; "his numbers across every dimension are higher" when the other
   card leads Reliability. **ROOT CAUSE: the writer is sent RAW per-90 dimensions, never the
   percentiles the reader sees.** It is writing about numbers it cannot see.
   **[CORRECTED 2026-10-22: THAT WAS COMPARE'S WRITER ONLY.** Compare sent `radar per90:` raw
   values plus each position's p80/p90 cut-off for passes, none of which any page shows. The card's
   notes writer already received the percentile the card shows, with the raw per-90 beside it, and
   the three notes failed on kind 1, not kind 2. Fixed for both on 2026-10-22: both writers get the
   percentiles the page draws, and neither gets raw dimension values or cut-offs.**]**
   **THE RULE IS "WHAT THE READER SEES ON THIS PAGE", NOT "WHAT THE DATABASE HOLDS" (2026-10-22).**
   The first version of the fix nearly made a new kind-2 source: on Haaland 22/23 v Suarez 13/14 the
   head to head draws only Reliability (it shows a dimension only when both seasons have it), and the
   fix still sent Haaland's other four percentiles, numbers no reader of that page sees. The next
   person fixing a writer payload will reach for "send everything we have", and that is exactly
   wrong: every figure the writer gets must be on the page the prose sits on. Compare's line now
   reads the page's own RADAR_OK, so it cannot carry a dimension the head to head did not draw.
   **THE RULE, AS LUCAS SET IT ON 2026-10-22: THE WRITER MUST NOT STATE A NUMBER THE READER CANNOT
   CHECK.** A figure on either card or on Compare is fair; a figure that exists only in the payload
   is not. Audited the same day by searching every rendered page for every number in the message:
   starts, passes per 90, dribbles, duels and penalty goals were on no page, so they are cut; key
   passes and total shots are sent only for the positions whose card prints them. The card's
   per-position list (PROOF_DIMS) moved into the shared module so the page and the writers read one
   list. "Nineteen goals from 29 starts" on Tresoldi came from a starts figure no page shows.
   **THE PRICE, PAID KNOWINGLY: "nine from the spot, thirteen from open play" was one of the better
   lines the writer produced, and it goes with penalties. Penalties are not free to re-add: put them
   on the page first, then in the payload, never the other way round.**
   **CHECK WHAT THE PAGE SENDS, NOT WHAT THE SHARED CODE RETURNS (2026-10-22).** The first audit of
   the rule checked the shared builder (vvAIStats) and passed, while card.html was adding its own
   keeper block on top of it and still sent `starts` for every keeper. It is the second time a check
   of the pipeline missed something the page itself added. `node scripts/calibration/capture.js
   --audit` now reads the request each page actually sends, in headless Chrome, and looks for every
   number in it on the rendered pages. Control: on the code before the cut (`51465af`) it reports
   dribbles, duels, penalties, starts and passes per 90 on 11 of 12 items. Its limit: a number that
   equals a number the page shows for another reason passes (Lammens' starts 32 equal his 32
   appearances).
3. **A crown the card's own honours and dimensions contradict.** Foden over Bellingham "because
   what was recorded for Foden was more" (Bellingham: three honours to two, leads three of five
   dimensions); Suarez over De Bruyne on "individual honours two-to-one" (it is two each).
4. **A verdict that contradicts its own headline.** "The record cannot separate them cleanly"
   above "Palmer's had nothing but himself"; "Two seasons the number cannot split" above
   "Suarez did more kinds of damage ... that is enough."

**THE CHECKER AS BUILT WOULD HAVE CAUGHT KIND 1 ONLY, AND WOULD HAVE PASSED ITS OWN
CALIBRATION.** `checkVerdictSupport` (api/analyse.js, `b221ea1`, never switched on) asks a second
model to list claims the evidence does not contain. Its instructions count "an opinion,
comparison or judgement that rests only on facts in the evidence" as SUPPORTED, so kind 3 passes
by design; it compares prose with evidence and never prose with prose, so kind 4 is invisible;
the evidence it reads has no percentiles either, so kind 2 is mostly invisible. Its calibration's
positive control was the two Salah v Mbappe rolls, which are kind 1 only, so a perfect
calibration score would have said nothing about kinds 2 to 4 and the owner would have switched it
on believing it was the gate. **A check is only evidence about the failure kinds its controls
contain.**

**A phrase list is not the answer to kind 4, measured.** The tie lint's winner phrases missed both
kind 4 failures; a widened list "caught" both only by matching the wrong sentence in each.

**What is in place (2026-10-17):**
- Prose off for everything (`e930b39`). Compare shows the engine's answer, the tag, the evidence
  and "No written opinion here, by choice. The score, the tag and the evidence below are the
  verdict."; the Story panel hides; the card drops its three prose blocks without an apology.
- Kind 3: Path B is off in the page and at the server; nothing crowns inside the margin (`8ece91f`).
- Kind 4: where nothing is crowned, the model's headline and closing paragraph are not shown; the
  page writes its own (`8ece91f`). Over 81 stored no-crown rows the winner language sat in those
  two fields (58 and 26) and never in head to head alone.
- `HELD_PAIRS`: every pair the site has ever linked (eight on 2026-10-17, ten from 2026-10-19, when
  the homepage got four pairs back as cards with no prose) answers held regardless of the switch
  (`1576399`). Homepage rotation zero pairs until 2026-10-19 (now four, mixed: two separated, one
  inside the margin, one tie), Compare suggestions empty. Rows backed up at
  `migrations/verdict_hold_2026-10-17/before_verdict_cache.json`.

**Before prose comes back on, in this order:**
1. Kind 2: send the writer the percentiles the card shows, and give the checker the same.
   [DONE 2026-10-22, see the correction under kind 2 above. Verified offline, no generation.]
2. Rewrite the calibration set from these twelve, the quoted sentences labelled by kind, and
   report a number PER KIND. One number is a number about kind 1.
   **[RUN 2026-10-23, THE SHIPPING CHECKER AGAINST THE LABELLED SET: kind 1 caught 8 of 36, kind 2
   4 of 6, kind 3 0 of 3, kind 4 2 of 3; 1 false hold of 18 ("over five hundred more minutes", for
   a gap of 550), no judgement held, J3 left alone.** Two runs, identical sentence for sentence:
   the checker runs at temperature 0, so they are one measurement, not two. Results in
   `_local/verdict-check/score_2026-10-23T08-35-36-104Z.json`.
   **KIND 1 IS THE HEADLINE, NOT KIND 3.** Kind 3 at zero was predicted. Kind 1 was the one kind
   this checker existed to catch, and it catches under a quarter: **the checker we nearly switched
   on would have caught one invented fact in five.** It flags 1 to 5 sentences per piece however
   many fail; Palmer v Saka had 13 labelled and it found 5.
   **THE LABELLED SET WAS WRONG TOO.** The checker made 25 flags that matched no label; about 21
   were real failures the set did not hold (among them "Messi edges it" and "Suarez edges it" on
   pairs the page says it cannot separate), and about 4 were the checker's errors ("381 more
   minutes", plain arithmetic). A calibration is only as good as its labels, and these were built
   from readings done by hand under time pressure. A full re-read of all twelve on 2026-10-23 found
   more than the 21: 147 rows were added and approved line by line, then 27 changed after every card
   was rendered and read in full (the Chronicle correction under kind 1). The corrected set: 159 to
   flag (kind 1 72, kind 2 65, kind 3 9, kind 3b 6, kind 4 6, kind 5 1), 54 to leave (24 figures,
   7 judgements, 23 card text). New kinds: **3b**, a crown where the page itself says the Index
   cannot separate the pair (a different fault from 3, fixed differently), and **5**, a paragraph
   printed under the wrong player's name (Messi v Ronaldo: p1 is about Ronaldo and sits under
   Messi; a reader sees it at once and nothing else covers it). The set records its own detection
   limit: starts that equal appearances pass any check that looks only for the number.
   **THE CHECKER READS THE WRITER'S PAYLOAD, NOT THE PAGE, AND THAT IS THE SAME FAULT JUST FIXED IN
   THE WRITER (Lucas, 2026-10-23).** The payload has no Chronicle and no honour or tag copy, so a
   checker reading it would flag "breaking Muller's 49-year-old record" though the card states it:
   it would hold good prose. Every check built from here (parts 2 and 3 of the rewrite first) takes
   its evidence from the RENDERED PAGE: payload plus Chronicle plus honour and tag copy.
   **DECIDED (Lucas, 2026-10-23): arithmetic, and "does this crown agree with the honours and the
   page's result", are code questions, and go to code even if the rest of the rewrite
   disappoints.** Code repeats exactly; a model does not.
   **MEASURED, NOT A PRINCIPLE (2026-10-23, `b0e9025`).** The number check in code
   (`scripts/calibration/prose_checks.js`, `score.js --code`) catches kind 2 **57 of 68 with 0
   false holds of 54**, and gave byte-identical output on three runs (54 of 65 on the set it first
   ran against; it found three more real kind 2 failures the re-read had missed, now labelled).
   The model checker (Haiku 4.5, temperature 0) caught kind 2 **4 of 6, with a false hold on plain
   arithmetic**: "381 more minutes" and "over five hundred more minutes" are true sums of the two
   cards and it held them. The two were scored on different sets (6 labels then, 68 now) because
   the set was corrected between the runs; the model checker was not re-run on the corrected set.
   What code still misses: 9 comparisons with no number ("his numbers across every dimension are
   higher"), and 2 numbers that happen to appear elsewhere on the page.
   **THE CROWN READ, FIRST KEY RUN (2026-10-23).** Haiku reads who each sentence argues for and
   whether it crowns; code decides against the page. Kind 3 6 of 9, 3b 3 of 6, kind 4 4 of 6, 0
   false holds, flags byte-identical over two runs. Its three 3b misses were all "edges" wording
   ("Messi 11/12 edges it"), **the exact phrase the writer's prompt bans first as its counter-example
   for ties, and the crown reader did not recognise it as a crown.** The crown prompt now carries the
   writer's banned list word for word.
   **RE-RUN 2026-10-24: NO NET GAIN. THE PROMPT CHANGE MOVED WHICH CROWNS THE MODEL SEES, NOT HOW
   MANY.** It caught "Messi 11/12 edges it" and "favours Messi by the thinnest of margins" and lost
   "at 24 against 29: the career stage adds a dimension..." and "make Salah's the harder thing to
   have done", both caught the run before (3b 6 of 9 both times; kind 4 5 of 7 to 4 of 7). **This is
   evidence for keeping crowns in code and treating the model's crown reading as the unreliable
   half (Lucas, 2026-10-24):** the rules that decide a crown against the page are exact; which
   sentences the model calls crowns shifts with any wording change.
   **A TOOL HAS NOW FOUND, THREE TIMES, WHAT A HAND READING MISSED (Lucas, 2026-10-23).** The
   `--audit` found card.html still sending starts in its keeper block; the number check found three
   kind 2 failures two hand re-reads missed; the crown read found five more (three 3b crowns on pairs
   the page cannot separate, among them "It was enough.", plus a kind 3 and a kind 4). **The lesson
   is not that the readings were sloppy: reading prose by hand does not scale and was never going
   to.** Hand reading labels a set; tools check prose.]**
   **KIND 1: DETECTION CANNOT CLOSE IT. MEASURED 2026-10-24, NOT ESTIMATED.** Every sentence judged
   alone against the rendered page (option 2, `score.js --sentences`, `ad9dfb3`): Sonnet 4.6 catches
   kind 1 62 of 88, Haiku 4.5 58 of 88, against the shipping checker's 8. That is about 70% per
   sentence. The twelve pieces hold about 7 kind 1 failures each, so a piece ships with at least one
   uncaught with probability 1 - 0.7^7, about 92%. **At the best per-sentence detection we have,
   nine pieces in ten would ship an invention.** (The 2026-10-23 estimate assumed a 95% checker and
   got three in ten; the measured checker is far below that.) **Do not reach for a better checker
   as the answer; this calculation is why.** The writer has to stop producing them.
   Option 2's other findings: Sonnet held 1 of 38 leave sentences (Foden's Player of the Season
   copy) and its 6 extra flags were all real; Haiku held none, but about 12 of its 20 extra flags
   were opinion lines the set does not label, so its precision is worse than its score. Sonnet is
   the model for option 1's narrow check (Lucas). 8 real kind 1 failures the two models found are
   now labelled (the UNFP award name twice, "in a harder competition", "He arrived and he
   dominated.", among them).
   **THE PLAN, DECIDED 2026-10-23, IN ORDER:** (a) the "edges" re-run of the crown read; (b) option
   2, measure: every sentence judged on its own, Haiku against Sonnet, one key run, to learn how much
   of the one in five was the checker skimming; (c) option 1, prevent: the writer gets the page as a
   numbered fact list and tags every sentence with the facts it rests on, code drops any sentence
   with no tag or a tag that does not exist, and a narrow model check asks only whether each
   sentence's cited facts support it (the hole left: a real fact stretched, a Golden Boot written up
   as "a record"). Option 1 is judged on a FRESH sample, not on the twelve.
   **THE METHOD FOR READING ANY FRESH SAMPLE (Lucas, 2026-10-24; the method, not a preference): TOOLS
   FIRST, THEN LUCAS.** Run every check over the sample and give Lucas two lists: the flags, and
   every sentence nothing flagged. He reads both: the flags to confirm they are real, the unflagged
   to find what the tools cannot see. Hand reading alone missed eight failures the tools found on
   2026-10-23; tools alone cannot see what they were not built for.
   **IF OPTION 1 CANNOT GET A FRESH SAMPLE THROUGH, THE CHOICE IS CODE-WRITTEN PROSE (the model only
   orders and voices sentences code builds from the page) OR NO PROSE. Both are honest.**
   **OPTION 5, PROSE BACK WITH A KNOWN KIND 1 RATE, IS OFF THE TABLE PERMANENTLY (Lucas,
   2026-10-23).** The whole pitch is that everything on this site is checkable, and kind 1 is the
   failure a fan spots. Shipping prose with a known invention rate contradicts the product. Do not
   reopen it.
3. Regenerate a sample (not the twelve; fresh pairs and cards) and read it against the cards.
   Prose comes back on when that sample passes, not when the code is merged.
4. A watch on the Anthropic balance (QA_PASS B4b). Nothing watches it, and the hourly ceiling
   allows about $312 a day. Live the whole time prose was on; added 2026-10-18.
5. A decision on the race where two simultaneous first requests for one uncached pair both
   generate (measured 2026-10-08). Same; added 2026-10-18.
6. When the fresh sample in step 3 is generated, take ONE FAIR CROWN from a separated pair and add
   it to the calibration as a supported judgement (Lucas, 2026-10-22). None of the twelve is a
   separated pair crowned fairly, so the set cannot yet test that a checker leaves a fair crown alone.
7. Any warm, of the sample or after the switch, runs through Anthropic's Message Batches API: half
   price on top of the prompt-cache discount, and the warm is the single biggest AI line (about $9
   on 2026-10-03). The warm scripts call the Messages API directly today. Added 2026-10-22.

**A cost fact the next session will meet:** on 2026-10-17 the notes cache held 731 rows and only
6 were on the current prompt. Every prompt edit makes the rest stale, so while prose was on,
almost every card opened generated fresh, unread notes. The switch stopped that; turning it back
on restarts it.

### 10. The Chronicle, read against the card it sits on (added 2026-10-23). FIGURES MEASURED, HISTORY NOT
The Chronicle is a hand-written moment per player-season, hardcoded in `card.html` and rendered
on the card as "The Chronicle". **72 moments are written; 69 are reachable from a card** (each
keyed to one player and season); 3 (`dirk-kuyt-1617`, `vincent-kompany-1819`, `wayne-rooney-1011`)
have no key row and render nowhere. **49 of the 72 state a season or match figure** (goals,
assists, games, points and the like; counted by pattern, so a floor rather than an exact count).
- **Nothing has ever read one against its own card.** No document, script or log records a check;
  each was written per card and shipped. The one read so far was by accident: Salah 24/25 says "a
  season of 28 goals" and the card says 29, and 29 is right (CLAUDE.md §D, with its check). That is
  one error in the one moment read for figures.
- **Why it matters more now:** the calibration's kind 1 rule treats what the Chronicle states as
  page text a reader can check, and the checkers build their evidence from it. A wrong Chronicle
  line is therefore not only a live error; it would make a checker pass prose that repeats it.
- **What covers it today:** nothing. **What would cover it:** for each of the 69, every figure the
  moment states read against the card's own figures (the same number binding `prose_checks.js`
  does, run with the Chronicle as the prose and the rest of the card as the page), then the
  remaining world facts (dates, scorelines, opponents) read by hand against a source. The figure half is
  built (below); the hand half is not.
- **THE FIGURE PASS, 2026-10-23 (`node scripts/calibration/chronicle_figures.js`, no key).** Every
  map row's cards rendered from the repo, the moment's quote and narrative checked by the
  `prose_checks.js` number binding against the rest of the card. **70 cards rendered, 0 failed**
  (69 moments; one shows on two cards). 67 state a number; 60 state one the card does not show,
  and **almost all of those are match or history figures the card was never going to hold** ("five
  goals in nine minutes", "for forty-nine years", "Jimmy Greaves scored 266"). Read by hand, every
  flag, for a season figure the card contradicts:
  - **Salah 24/25:** "a season of 28 goals", card 29. Known, §D.
  - **Cisse 11/12, A SECOND LIVE ERROR:** the Newcastle moment ("Thirteen goals in fourteen games")
    also renders on his Freiburg 11/12 card (card 156405, 9 goals in 17). The map keys on player and
    season, so a player who moved mid-season gets the moment on both cards. §D.
  - **Haaland 22/23, judgement:** "Thirty-five goals in a single season, a record" on a card that
    says 36. The same on-the-day count as Salah's, but the narrative says so ("number thirty-five").
  - **Every other season figure agrees with its card** (Kane 16/17's 29, Messi 11/12's fifty, Gomis
    17/18's 29th; Gomis's 28 and Messi's 232 are the old records they broke).
- **FIXED 2026-10-23 (`ffc6f24`):** Salah 24/25 reads 29; Haaland 22/23 reads Thirty-six, and its
  "number thirty-five" became "the goal that broke it"; the map is keyed on card_id, so Cisse's
  Freiburg card shows nothing (the pass opens every other card of a mapped player-season to prove it).
- **THE RULE THAT FOLLOWS (Lucas, 2026-10-23): THE CHRONICLE IS CHECKABLE EVIDENCE FOR ITS FIGURES
  ONLY.** Records, years, scorelines and opponents are not checked, so prose resting on them is kind
  1 (area 9's kind 1 definition, and the set's own `what`). It widens when a hand pass against a
  source covers them, not before.
- **WHAT THIS MEANS FOR THE CHECKERS:** the Chronicle's season figures are sound enough to keep as
  evidence, with two cards fixed. **Its history is not checked at all, and it is most of the text:**
  the records, the years they stood, the scorelines and dates. The kind 1 rule leaves a sentence
  alone when the Chronicle states it, so an unchecked record there still decides a label.

### Already covered, leave alone
- VV Index figures: `gen-index-figures.js` then `apply-figures.js --check` (regenerate first).
- Share and search descriptions say "more than 50,000", which cannot go stale.

---

## THE THREE HIGHEST RISKS, RANKED BY PUBLIC EMBARRASSMENT, AND WHERE EACH STANDS

1. **The AI's verdicts and notes.** The product's voice and what gets screenshotted.
   **[2026-10-17] Read twelve times against the cards, failed twelve times. Prose is OFF.** See
   area 9 for the kinds, why the checker would not have caught them, and the order of work
   before it comes back.
2. **The site's sentences about the engine.** About three sessions; the VV Index batch is
   written and waiting for sign-off.
3. **The privacy page.** Fixed and checked.

## WHAT TO RUN, AND WHEN

| When | Run |
|---|---|
| Every commit | `node scripts/lint-inline.js` (includes the privacy field check) |
| Before every push that touches a page | `node scripts/check-controls.js` , every visible control on every shipping page must receive its clicks (added 2026-10-13 after the homepage header went dead for two days). **Page-as-loaded only: open sheets, shown verdicts and expanded panels are NOT checked (area 8)**, so click through the controls the change touched as well |
| After every push, Terminal C | `node scripts/check-deployed.js` , the live site must serve HEAD byte for byte; waits up to 4 minutes, then fails naming every file that differs (added 2026-10-13 after two pushes reached GitHub and never built). Then `VV_BASE=https://vvonderxi.com node scripts/check-controls.js` to hit-test the deployed pages, not the local tree |
| Every engine change, same session | re-read the dependent sentences (claims register once built) |
| Weekly | `node scripts/lint-ai-cache.js` and `node scripts/lint-ai-cache.js --read 10`, and read them. **While prose is off (area 9) there is nothing new to read; the read restarts the day it is switched on, and it is read against the cards, by kind** |
| Before any paid campaign | full pass of the VV Index, Playbook and card page; the marketing ledger re-run |
| Monthly | full pass of the three pages; the traffic report's retention panel |
