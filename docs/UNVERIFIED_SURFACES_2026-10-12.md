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
   **OPTION 1 AS DECIDED AND BUILT (Lucas, 2026-10-24; `scripts/calibration/cited.js`).** The fact
   list is built by code from the request plus the honour and tag copy in `vv-core.js`, with honour
   years left out (a "Golden Boot for 2014" on a 14/15 card was one of the failures); **the Chronicle
   is out entirely.** Every sentence cites fact ids; code deletes a sentence that cites nothing or an
   unknown id, a player paragraph citing none of his facts, a number not in its cited facts (or a sum
   or difference of two), a measure no card prints, or a crown that is not the page's or does not cite
   it. **All filler goes, no exemption: plainer prose that is entirely checkable is the product.** Then
   Sonnet sees only the sentence and its cited facts; a sentence that goes beyond them is deleted,
   never rewritten. A piece is rejected whole if its headline goes, a paragraph (verdict field, scout,
   stanza) falls below two sentences, or more than a quarter goes; one regeneration, then **NO PROSE,
   WHICH IS THE DEFAULT AND NOT AN ERROR**: the page shows today's "No written opinion here, by choice."
   On day one most pieces may land there, and the site must look deliberate while that is true.
   Keepers go straight to no prose until the writer covers them. Offline proof:
   `cited_selftest.js` (14 planted cases).
   **THE HOLE THAT REMAINS (2026-10-24): WHAT THE NARROW CHECK MISSES STILL SHIPS.** A real fact,
   stretched, that Sonnet passes against its cited facts is the residual kind 1. The fresh sample
   (`fresh_sample.json`: 8 comparisons and 4 cards, none from the twelve, Messi 16/17 v Neymar 16/17
   the fair crown) measures it, tools first then Lucas. **If the hole is not small enough, we are at
   code-written prose or no prose, and that is learned from the sample, not argued.**
   **THE FIRST FRESH-SAMPLE RUN, 2026-10-24 12:13 UTC (`_local/verdict-check/fresh_2026-10-24T12-13-42-675Z.md`):
   11 OF 12 PIECES WENT TO NO PROSE, ONE SHIPPED (Rodri v Rice, on regeneration), $1.01.** 333 sentences
   written over 24 attempts, 119 deleted: 46 by the crown rule, 40 by the number rule, 33 by the narrow
   check. Regeneration rescued 1 of 12. Read drop by drop, two of the three rules were misfiring:
   - **The crown rule deleted sentences that crown nothing.** The narrow check called any sentence that
     favours one side a crown ("Rice holds a clear lead in that pillar", "Rodri holds the Ballon d'Or,
     absent from Rice's card", "Immobile's VV Score of 93 places him in the Iconic band") and code deleted
     it against the page. On the one fair-crown pair nine plain descriptive sentences died for "a crown
     that does not cite the result"; on the seven tied pairs 38 died, and almost none declared a winner.
     **THIS IS THE THIRD TIME THE MODEL'S CROWN READING HAS BEEN THE UNRELIABLE HALF** (the 10-23 "edges"
     misses, the 10-24 re-run that moved which crowns it saw, and this), now with a delete behind it.
     **FIXED (Lucas, 2026-10-24): a crown is an overall-winner sentence and nothing else, and THE CODE
     RULE DECIDES.** The narrow check's question now defines a crown as the better season taken whole,
     with the non-examples (a lead in one measure, an honour the other lacks, a band or score as a
     figure, a one-season sentence). And code acts on the reading only where the sentence can be a
     comparison at all: it cites a fact from both sides or P1, or names the other player
     (`engagesBothSides`). A one-sided sentence is never deleted as a crown whatever the model said.
   - **The number rule deleted counts of the facts the sentence cited.** "Four honours on a single card"
     citing four honour facts, "two Golden Boot seasons", "six identical tags", "two World Class CDMs":
     about half of the 40. A reader checks a count by counting. **FIXED: a count of the cited facts of one
     kind, in all or per side, is allowed; everything else stays strict** (the same rule caught "seven
     percentile points higher" and "three points above" for a gap of 11, an uncited 3221 minutes, an age
     no fact holds, and "six goals were left in matches he did not start", and keeps catching them).
   - **The narrow check was mostly right.** Its 33 deletions are genuine kind 1 or filler: "Thirty goals"
     on a 26-goal card, "Sassuolo", "the highest available", "the harder version of the achievement", a
     run of superlatives. Two false deletions, both a sentence quoting the card's own tag or honour copy.
     **THE HOLE, SEEN WORKING AS DESCRIBED: it passed "Manchester City" and "Arsenal" in the shipped piece
     and "Napoli" in one Osimhen attempt when no cited fact held the club** (the identity fact holds it,
     and the sentence did not cite it). A real fact, uncited, that Sonnet lets through. **That count is
     the number to watch on the next run.**
   - **The shipped piece's only two flags were the fact list's fault, not the writer's.** The sentence
     judge flagged "World Class band" twice as not on the page, and it was right: the rendered Compare and
     both cards print no band word for World Class. The card face prints a prestige chip for Generational
     and Iconic only (`prestigeFor`, `renderPrestige`) and no page prints any other band name, yet the
     fact list gave the writer the band for every score. **The 10-22 rule, broken inside the thing
     enforcing it. FIXED: the score fact carries the band exactly when the page prints it, in the word it
     prints (`scoreFact`); the request's own band field is ignored.**
   **The sample was tie-heavy: seven of eight pairs came out "cannot separate" on the page, so the run
   barely tested the crown case.** If the next run is also tie-heavy, separated pairs go into the sample
   before the crown rule is judged.
   **Offline replay of the 24 saved drafts through the fixed rules, each sentence's saved narrow answer
   stubbed back in: 119 drops become 66, and 8 of 12 pieces ship instead of 1.** Optimistic by
   construction: 27 sentences the old code rules deleted before Sonnet saw them are assumed clean, and the
   replayed crown answers are the old prompt's. The self-test holds 30 planted cases (`cited_selftest.js`),
   16 of them for these three fixes.
   **THE SECOND RUN, SAME SAMPLE, 2026-10-24 12:30 UTC (`_local/verdict-check/fresh_2026-10-24T12-30-25-218Z.md`):
   10 OF 12 SHIPPED (8 first time, 2 on regeneration), 2 NO PROSE (Osimhen and Berardi notes), $2.05.**
   223 sentences written, 28 deleted (20 narrow check, 7 numbers, 1 narrow check failed to answer); the
   crown rule deleted nothing. 134 sentences shipped; the tools flagged 28 of them. **Read flag by
   flag, the shipped prose is cleaner than the flag count says, and the flags point three ways:**
   - **THE HOLE, COUNTED: 2 of 134 shipped sentences carry a fact no cited fact holds** ("Barcelona",
     "Liverpool", both true from the identity fact the sentence did not cite). That is the residual
     kind 1 of the cited writer on this sample: real facts, uncited, that Sonnet lets through.
   - **The fact list carries two numbers the page does not print, the same class as the band:** (1) key
     passes per 90 to ONE decimal (2.4, 3.2, 1.6, 2.8) where the card prints TWO (2.36, 3.24, 1.64); the
     request builder rounds to one (`aiPer90`, vv-core.js) and the card does not. Six flags. (2)
     Reliability as "he played 89% of a full season", where the card prints "Reliability · 89" under
     "ATTRIBUTE / 100" with the caption "Each dimension is a percentile against other CM seasons", and
     Sonnet flagged every "% of a full season" (four flags) as a meaning the page never states. The figure
     IS the share of a full season (`pct_of_full_season`), so the card's caption misdescribes Reliability
     (area 1) and the fact list asserts a meaning the reader cannot see. Both are decisions for Lucas,
     not writer faults.
   - **The sample's own tools over-flag, and that costs reading time:** the page number check binds
     units too tightly ("one point above Messi's 96", "Iconic at 91", "38 games", "two points"), names
     the tag "The Dribbler" as the dribbles measure (four flags), counts tags and honours it cannot see
     ("six tags" on a six-tag card), and Sonnet's "a shared trio of league honours" is wrong (both cards
     hold League Title, Player of the Season and Golden Boot). About 16 of the 28 flags.
   - **Real faults that shipped, found by the tools:** Watkins "three tags to go with it" on a four-tag
     card (the sentence cited three of the four, so the count rule allowed it: the one side effect of fix
     2 seen so far); Hamsik "three separate percentile readings above the 91st mark" at 95, 95 and 91;
     and the Messi v Neymar headline "one clear winner" that does not name him while the verdict does.
   **Tie-heavy again: the same seven of eight pairs, by construction of the sample.** Separated pairs go
   into the sample before the crown rule is judged, as decided. **Lucas's read of both lists, the flags
   and the 109 unflagged sentences (106 was a miscount), is the next step; the method stands.** The two
   lists as one file: `_local/verdict-check/fresh_run2_lists.md`.
   **AFTER RUN 2 (Lucas, 2026-10-24), FOUR THINGS BUILT, PROSE STILL OFF:**
   - **SAMPLE 2, SIX SEPARATED PAIRS (`fresh_sample2.json`, `sample.js --sample`).** Found by searching every
     top card (rt 88+, big five leagues, 2015+) against every lower card of a known name, same position
     pool, for a gap clearing the pair's own margin (`vv-margin.js`) by at least 0.8, re-asserted when the
     file was written. **Only Winger and ST pairs separate at these names; no midfield or defender pairing
     cleared its margin**, the 2026-09-09 SE finding seen again. All six are masterclass gaps (10 to 16);
     no bragging-rights pair cleared by more than 0.1, so the 7 to 9 band is untested.
   - **KEY PASSES PER 90 AT THE CARD'S TWO DECIMALS** (`aiPer90`, vv-core.js, token bumped on the five
     shipping surfaces; the fact list prints `toFixed(2)`).
   - **RELIABILITY AS THE PAGE PRINTS IT:** the Compare request line drops "% of a full season"
     (`compare.html`), the card payload's note no longer calls it a share of a season (`vv-core.js`), and the
     fact reads "Reliability: 89 out of 100". **The caption that calls every dimension a percentile is a
     live page error on card and Compare, logged in CLAUDE.md §D with its check (area 1).**
   - **THE THREE REAL FAULTS THAT SHIPPED, JUDGED (rule gap or residue):** (1) Watkins "three tags" on a
     four-tag card: **a rule gap, closable in code**: a count of one kind should equal that kind's total in
     the fact list for a side (the page's total), or a sum or difference of the two sides' totals; the
     cited subset's own count would no longer qualify. "Four honours" and "two honours Salah does not"
     (4 against 2) still pass; a true subset count ("two of his tags speak to durability") would go, the
     accepted price. (2) Hamsik "three readings above the 91st mark" at 95, 95 and 91: **residue**; it is an
     inclusive-language slip the narrow check should have read (91 is not above 91) and no code rule worth
     its false holds catches it; Lucas reads for it. (3) The Messi v Neymar headline "one clear winner"
     that does not name him while the verdict does: **a rule gap, closable in code**: on a separated pair
     the headline must contain the winner's surname or the piece is rejected to regeneration. Neither
     closable rule is built yet; Lucas decides.
   **THE SAMPLE'S OWN TOOLS NEED THREE REPAIRS BEFORE THE NEXT READ, or Lucas reads 16 false flags
   again:** "The Dribbler" is a tag name, not the dribbles measure; a count of tags or honours should be
   checked against the page's own count, which the page check can make; and the unit binding for "points"
   and "VV" should accept a VV Score and a percentile.
   **[DONE THE SAME AFTERNOON (Lucas, 2026-10-24), plus his fourth: a count the page can verify is checked
   against the page, not guessed at.** `prose_checks.js`: "The Dribbler" blanked as a tag name before either
   check; a `tags` unit whose page count comes from the request (audited against the rendered page), checked
   like honours; "points" accepts a VV Score, a percentile or a Reliability value and any difference of two;
   "at 91" is an age only between 14 and 45; "games" and "matches" are appearances; the Reliability regex
   follows the request's new shape. **Re-run over run 2's shipped prose: code flags 21 to 11, and of the 11,
   one is still false ("those two tags", a subset reference), seven are the one-decimal key passes now fixed
   at source, three are real.** The sentence judge's one wrong flag ("a shared trio") is the model's and
   stays.]**
   **LUCAS'S READ OF RUN 2 (2026-10-24): "The unflagged prose is good. Rodri v Rice and De Bruyne v Pogba
   read like someone who knows football and is being careful, and quoting the card's own tag copy works.
   That is the first time this layer has produced something I would publish."** Recorded because it is the
   first such verdict in the record, and because the method, tools first then Lucas, produced it.
   - **THE HOLE STAYS 2 OF 134.** My hand read of the unflagged list raised two more candidates ("two Iconic
     seasons, one club" on Kane v Son; "Hamšík at 29"), the same uncited-identity shape as Barcelona and
     Liverpool. **The citation record cleared both: each sentence cited the identity fact.** A reading finds
     candidates; the record decides. The method worked in the unexpected direction once, and then the
     record corrected the reader, which is also the method.
   - **A QUALITY RESIDUE, SEPARATE FROM THE HOLE (Lucas): "an availability that never watered" (Rodri v
     Rice) is garbled, true to its facts, and no rule catches it.** Prose can be true and still not
     publishable, and nothing measures that but a person. It is why the unflagged list is read, not only
     the flags.
   - **BOTH CLOSABLE RULES BUILT (`cited.js`, self-test 49 cases):** a count must equal a kind's total in
     the fact list for a side, or a sum or difference of the two sides' totals, never the cited subset
     (accepted limit, in the self-test: a subset count that happens to equal a difference of totals passes);
     and on a separated pair the headline must name the winner or the piece regenerates. The writer's
     instructions say both.
   **THE THIRD KEY SESSION, 2026-10-24 13:24 TO 13:42 UTC: SAMPLE 2 TWICE, SAMPLE 1 A THIRD TIME, ABOUT $4.80
   IN ALL, PLUS $0.30 LOST TO A KEY THAT WENT INVALID MID-RUN (`authentication_error`, three pieces in; the
   two 13:24 run files record that failure as no prose and are not results).**
   - **SAMPLE 2, SIX SEPARATED PAIRS, RUN 1 (13:30): 4 of 6 shipped**, 49 sentences, 3 tool flags, **hole 1 of
     49** ("Marseille" uncited). **THE CROWN RULE DELETED ONE SENTENCE IN 138** on six crowned pairs, against 46
     in 333 on run 1 of sample 1. Every shipped headline names the winner. **Two pieces died on a bug:**
     rule B rejected "Ibrahimović wins it outright" twice because `\b` is not a word boundary after "ć"
     (fixed, `nameRe`, Unicode letter boundaries, also in the one-sided crown guard). And the narrow check
     deleted "Three honours sit on his card" for citing two of three while the count rule had allowed the
     page's total; it is now told each side's honour and tag totals (`countsLine`).
   - **SAMPLE 2, RUN 2 (13:42, after those two fixes): 1 of 6 shipped** (Ibrahimović v Lacazette, 13
     sentences, 0 flags, hole 0). 169 written, 40 deleted (34 narrow check). **Eleven of twelve attempts
     were rejected for structure: a verdict or head-to-head paragraph down to one sentence, or a deleted
     headline, or more than a quarter gone.** Same rules, same pairs, twenty minutes apart: 4 of 6, then 1
     of 6. **A single run of six is a weak measurement; the writer's variance at its default temperature
     and a two-sentence paragraph's fragility decide more than the rules do.** Across both runs: 62
     shipped sentences, 3 tool flags, hole 1 of 62.
   - **SAMPLE 1, RUN 3 (13:38): 8 of 8 VERDICTS SHIPPED, 0 OF 4 NOTES.** 250 written, 55 deleted (48 narrow
     check, 7 numbers, no crown deletion). 100 shipped sentences, 14 tool flags, **hole 1 of 100** ("Arsenal"
     uncited). **The notes format is structurally failing:** every notes piece died on a stanza under two
     sentences (notes4, the closing line, is asked for 2 to 3 and gets 1 to 2; one deletion kills it). That is
     a format decision (a one-sentence closing stanza, or fewer stanzas), not a writer fault; Lucas decides.
     **The count rule leaked on small numbers, found by the tools:** "five tags" passed because The Standard's
     copy says "Five seasons" and "four tags" because every card has four dimensions; eight such counts
     shipped and the tools flagged them. **Fixed: a count attached to tags or honours must be that kind's
     total, sum or difference, nothing else** (`c89938d`, self-test 60 cases). The tools' tag counts no
     longer take stray page numbers.
   - **THE HOLE ACROSS EVERYTHING SHIPPED TODAY ON THE FINAL RULES: 2 of 162 sentences, both an uncited club
     that the identity fact holds** (Arsenal, Marseille). The cited writer's residual kind 1 on these
     samples is a true club name without its citation; nothing invented.
   - **THE LISTS FOR LUCAS:** `_local/verdict-check/fresh_run3_lists.md` (sample 1 run 3: 14 flags, 89
     unflagged), `fresh2_run1_lists.md` (sample 2 run 1: 3 flags, 46 unflagged) and `fresh2_run2_lists.md`
     (sample 2 run 2: 0 flags, 13 unflagged).
   **LUCAS READ THE THREE LISTS (2026-10-24): "The crown rule is done, 1 in 138 on six crowned pairs settles
   it." FOUR CHANGES, THEN TWO RUNS OF EACH SAMPLE, BECAUSE 4 OF 6 THEN 1 OF 6 ON IDENTICAL RULES IS THE
   MEASUREMENT HE NOW WORKS FROM: ONE RUN OF SIX TELLS HIM NOTHING** (`af53442`, self-test 73 cases):
   1. **THE CLUB HOLE, CLOSED.** All four misses on the final rules were a true club name without its
      citation. The club and league live in the identity fact, so a sentence naming either must cite the
      identity fact that holds it (either side's when team-mates share a club), or it goes. The writer is
      told. The last kind 1 residue with a shape, closed like the other two.
   2. **RAISE THE ASK, DO NOT LOWER THE FLOOR.** Verdict and head-to-head minimums stay at two; the writer
      is asked for 4 to 5 sentences a paragraph instead of 2 to 3, and 3 to 4 for the notes closing stanza.
      A paragraph asked for 2 and given 1 dies on one deletion; asked for 4 it survives. That, not the
      notes format, is why 0 of 4 notes shipped. `max_tokens` 2500 to 4000.
   3. **SONNET'S TAG AND HONOUR COUNTS DROPPED FROM THE TOOLS.** It counted GENERATIONAL as a tag and
      honours as tags, most of the 14 flags on sample 1 run 3. Code counts exactly. The judge is told not
      to count, and a count claim is dropped in code whatever it says (`isCountClaim`).
   4. **"HONOUR" BINDS TO AN HONOUR FACT, "TAG" TO A TAG FACT.** Peak called an honour (De Bruyne v Pogba)
      was a real fault no rule saw; the fact list knows which kind each is.
   **THE FOUR RUNS, 18:16 TO 18:38 UTC, $6.80, NO KEY FAILURE.**
   - **SAMPLE 2 (SIX SEPARATED PAIRS): 5 OF 6, THEN 6 OF 6.** 191 shipped sentences, 5 tool flags, **hole 0 of
     191**. The crown rule deleted 10 sentences in 397 across the two runs, all "a crown that does not cite
     the result", which is the rule as designed. Three regenerations in each run, every one from a headline
     the narrow check deleted for a flourish ("a season for the ages", "a season apart in class", "still
     sets the standard") or from more than a quarter gone. The headline is where the writer puts voice and
     where one deletion costs the piece; an instruction that the headline states the result and a cited fact,
     nothing more, would cut most regenerations. Not changed; Lucas decides.
   - **SAMPLE 1: 5 OF 12, THEN 5 OF 12, AND FIVE OF THE FOURTEEN NO-PROSE OUTCOMES WERE A FORMAT DRIFT OF MINE.**
     On three tie pairs in both runs (Immobile v Lewandowski, Benzema v Mbappé, Rodri v Rice) the writer
     returned the headline as a bare string, `["The Index cannot split Rodri and Rice..."]`, where every other
     sentence is `{"s", "cite"}`; the spec said "one sentence, a headline" and invited it. It parsed as an
     empty sentence citing nothing, the headline was deleted, and the piece rejected. **Fixed (`8057360`): the
     spec shows the object, a bare string is read as a sentence with no citation, and an inline "[A1, A2]"
     tail becomes the citation. Sample 1 is being run twice more on the fix; its two runs above are not the
     measurement.** Of what did ship: 177 sentences, 7 tool flags, **hole 0 of 177**. The notes shipped 1 of 8.
   - **THE HOLE ACROSS ALL FOUR RUNS: 0 OF 368 SHIPPED SENTENCES.** The club rule fired twice and the
     honour and tag binding fourteen times, all deletions, none shipped. On these samples the cited writer's
     residual kind 1 is now zero by the hole's definition (a fact the identity fact holds, uncited).
   - **THE COUNT RULE IS NOW THE SECOND DELETER, AND MOST OF IT IS COUNT WORDS.** Sample 1: 88 number
     deletions, 58 of them a count word (two to six). Some are the writer miscounting ("Four tags sit on his
     card" on a five-tag card, listing four); some are true subsets the rule now forbids ("three dimensions
     at the 96th or above", citing three of four). **A proposal, not done: allow a count up to the total for
     dimensions, which are a fixed visible set of four a reader can count; keep tags and honours exact.**
   - **THE TOOLS OVER-FLAG CROSS-UNIT ARITHMETIC.** About 10 of the 12 tool flags are true sums or
     differences bound to the wrong unit: "a gap of 18" for 25 goals against 7, "exceed by 23" for 38
     against 15, "a combined goal involvement of 32" for 19 and 13, "six more goals than assists" for 18
     and 12. Two are real ("six more goals" for 18 against 16; Pogba's exclusive tags miscounted by the
     writer, caught by Sonnet). Repair, not done: accept a bound number that is a sum or difference of any
     two page figures when the clause carries an arithmetic word (more, fewer, gap, exceed, combined, by).
   - **LISTS:** `_local/verdict-check/sample_2_run_1_final_lists.md` (3 flags, 90 unflagged),
     `sample_2_run_2_final_lists.md` (2 flags, 101 unflagged).
   - **SAMPLE 1, THE TWO CLEAN RUNS ON THE HEADLINE FIX (18:52 to 19:12 UTC, $4.97): 9 OF 12, THEN 8 OF 12.**
     Verdicts 8 of 8 then 7 of 8; notes 1 of 4 then 1 of 4. 299 shipped sentences, 7 tool flags, **hole 0 of
     299**. No empty headline. **Every one of the 7 tool flags is false, and all the same shape: a true sum or
     difference, or a number next to another unit's word, bound to the wrong unit** ("two more goals over two
     more appearances", "7 in 38", "a combined figure of 32", "1.64" read as minutes, "five top level
     seasons"). The sample's tools now have one defect left and it is that binding; the repair proposed
     above stands. **What still fails is the notes: every notes rejection is "more than a quarter deleted"
     with the closing stanza under two.** The narrow check deletes about a third of a notes piece (the
     form invites judgement: "what it would cost to deny it"), so a 21-sentence piece loses 6 to 12 and
     dies on the share rule however long the ask. A notes-shaped decision is needed: either the share rule
     relaxes for notes, or the scout and closing stanza are asked for figures and card copy only.
   **THE SIX RUNS TOGETHER, ON THE FINAL RULES: VERDICTS 26 OF 28 SHIPPED (sample 2 11 of 12, sample 1 15 of
   16), NOTES 2 OF 8; 490 SHIPPED SENTENCES; HOLE 0 OF 490; 12 TOOL FLAGS, 10 OF THEM THE SAME TOOL FAULT.**
   The two lists for each run: `_local/verdict-check/sample_1_run_3_final_lists.md` (4 flags, 162 unflagged),
   `sample_1_run_4_final_lists.md` (3 flags, 138 unflagged), and the two sample 2 files above.
   **THE COMPARISON THE WHOLE DECISION RESTS ON (Lucas, 2026-10-24, recorded explicitly at his instruction):
   on the morning of 2026-10-17 the twelve pieces of shipped prose, read sentence by sentence against their
   cards, held 88 invented world facts, about SEVEN A PIECE (kind 1 of the calibration set, re-read and
   relabelled 2026-10-23). On the evening of 2026-10-24, the cited writer on its final rules shipped 490
   sentences across six runs on twenty different pairs and cards, and the count of sentences stating a fact
   the page does not hold is ZERO.** The two figures are not measured in the same unit (facts per piece
   against sentences; the twelve were counted by Lucas and me on 2026-10-17 and 10-23, the 490 by the tools
   first and then Lucas reading every unflagged sentence of all four lists), and the 490 were read on the
   same day's rules by the same reader who built them. It is still the measurement: a writer that cannot
   state what it cannot cite, with code deleting what it states anyway, went from seven inventions a piece
   to none in 490 sentences.
   **THE FOUR DECISIONS AFTER THE SIX RUNS (Lucas, 2026-10-24, all built the same evening; self-test 76 to 88):**
   - **NOTES: THE FORM IS FIXED, THE SHARE RULE IS KEPT.** Not relaxed: it is what stops a gutted piece
     shipping, and notes need it more than verdicts, not less. The fault was the form inviting sentences
     that cannot be cited ("what it would cost to deny it" asks for judgement, and judgement has no fact
     id). The scout and the closing stanza now ask for FIGURES AND CARD COPY ONLY; the glance line asks
     for one fact, plainly (`NOTES_FORMAT` in `cited.js`).
   - **THE HEADLINE INSTRUCTION: YES.** The headline states the result and one cited fact, nothing more;
     no image, no flourish; the glance line the same. Every regeneration in six runs followed a headline
     flourish. In the system prompt and in the `who` line of the format.
   - **DIMENSION SUBSET COUNTS: ALLOWED, UP TO THE TOTAL.** A count attached to dimensions, measures,
     attributes, metrics or pillars may be any number from one up to the total the page prints (four
     dimensions and Reliability, five attributes a card, ten on a pair). Tags and honours stay exact: the
     page's whole total, or a sum or difference of the two sides' totals, never a subset. **THE ASYMMETRY,
     WRITTEN DOWN WITH ITS REASON:** every card prints the same five attributes, so a reader can count any
     subset of them by eye and check "three dimensions in the 90s" against the card; tags and honours vary
     per card, so a subset count ("three tags") cannot be checked without knowing the total, and the only
     count a reader can verify is the whole. In `numbersOk` (`cited.js`) and in `checkNumbers`
     (`prose_checks.js`), the same rule on both sides.
   - **THE TOOLS' ARITHMETIC: REPAIRED.** The twelve flags on the four clean runs were run through the
     extractor against their own evidence and are four mechanics, not one: a bare difference with no unit
     word ("a gap of 27"); a number bound BACKWARDS to the previous clause's unit word ("Rice's 7 in 38" as
     7 appearances, "2938 minutes across 35" as 35 minutes, "per 90 minutes outpace Pogba's 1.64" as 1.64
     minutes); "goal involvement" not read as goal contributions; and "over two more appearances" read as
     the qualifier "over 2". The repair, in order: an exact figure of the bound unit always passes,
     qualifier or not; a number whose unit came from the back scan, the weakest binding, is treated as an
     unbound number (it passes if the page prints it); and a number in a clause with an arithmetic word
     (gap, by, more, fewer, combined, total, apart, margin, add, between) passes if it is a sum or
     difference of two OTHER numbers stated in the same sentence. **A union of every unit's sums and
     differences was tried first and let "a gap of 40" through, because the percentiles alone make almost
     any number under 100; the same-sentence rule is what held.** Result on the four clean runs' shipped
     prose: 12 number flags to 0, and five controls with numbers the page does not print all still flag.
     **The accepted loss, recorded:** a back-bound number that is a true figure stated as the wrong unit
     ("7 appearances" when 7 is his goals) is no longer a code flag; the sentence judge, which reads the
     page, is what sees that shape now.
   **NEXT: one confirming run of each sample on all four. If the hole holds at zero and notes ship, the
   case for `VV_PROSE` on for VERDICTS ONLY is written for Lucas to decide: what is still unchecked, what
   the first week costs, and what would make him turn it off again. Notes stay off until they ship twice.
   Nothing is turned on by a session; Lucas decides.**
   **THE CASE IS WRITTEN: `docs/PROSE_CASE_2026-10-24.md`. Its first line: `VV_PROSE=on` today ships the OLD
   writer, because `api/analyse.js` still calls it and the cited writer is in no serving path; the port is
   described there and NOT started (Lucas, 2026-10-24).**
   **THE CONFIRMING RUNS (20:27 UTC) WERE CUT SHORT BY THE ANTHROPIC ACCOUNT'S MONTHLY SPEND CAP** (`400: You have
   reached your specified API usage limits. You will regain access on 2026-11-01`): the B4b cap exists and fires,
   verified by the error itself. Sample 2's writer finished, **6 of 6 shipped, hole 0 of 112 by code, 80 of 112
   sentences judged, 2 real flags**; sample 1 got 6 of 8 verdicts (one lost to the cap) and **no notes at all**, so
   the notes form is untested. The headline instruction worked (all eight headlines state the result and one fact;
   regenerations 2 in six from 3); the dimension rule did not misfire (every count deletion was a tag or honour
   count); the tools' repair held, and one new false shape ("rated at 39 out of 100" read as an age) was fixed,
   self-test 89. **One new shape for Lucas: Payet's Cabinet prints a career Top Assists while a cited sentence says
   "only Suárez holds an honour"; the Cabinet is outside the fact list, as the Chronicle is.** The full record is
   in `docs/PROSE_CASE_2026-10-24.md`, last section. **Both runs again when the cap is raised.**
   **LUCAS'S READING THE SAME NIGHT: the confirming runs are unmet, not failed; sample 2's 6 of 6 with hole 0 of
   112 stands; notes untested, so the gate holds. The cap is left to stand, verified in anger (QA_PASS B4b).**
   **WHAT ELSE THE PAGE PRINTS THAT THE FACT LIST DOES NOT KNOW (Lucas's question; answered in
   `docs/PAGE_FACTS_2026-10-24.md`, a code read of both pages block by block, no key).** In: identity, score and
   band when printed, totals, the five attributes, shots total and key passes per 90 by pool, this season's
   honours and tags with their one-liners, the result line, the era line. Out by decision: other seasons, the
   Chronicle, the long copy, keeper figures. **Out as gaps:** the Proof panel's per-90 rates and goal conversion
   on both pages and the whole defender Proof panel (tackles, interceptions, blocks: a defender pair writes with
   no Proof figures at all); the verdict tag name and the share caption that repeats it; the band's one-liner and
   the archetype blurb; Data Confidence; the career-stage chips. And a second naming error on the page itself:
   the Compare radar legend calls Reliability "Availability" (§D).
   **THE CABINET JOINS THE FACT LIST (Lucas: "add Cabinet lines to the fact list rather than restricting 'only'
   claims. Restricting the writer's language is the move that keeps costing us; giving it the page's own content
   is the one that keeps working").** `vvAIStats` now carries `cabinet` (the player-keyed half fetchHonours
   shapes; the team legs the card adds from the career rows are not in it, so the payload stays a subset of the
   page); the Compare line gains `CABINET: Top Assists 2017 (player); ...` between HONOURS and CAREER STAGE; the
   card payload gets it through `_ai` after the honours fetch (`EDITORIAL_DEPS` waits for it); `cabinetFact`
   states "X's Cabinet, what he had won by this season: Top Assists (2017), won by him"; the "honour" word binds
   to an Honour or a Cabinet fact; "N honours" may equal the Cabinet's count; the writer is told a Cabinet fact
   is what he had won BY this season and never to write that a player holds no honour when a Cabinet fact holds
   one. Years are not audited as numbers, so the capture audit stays clean (re-captured both samples, 0 unchecked
   numbers). Self-test 94. **The gap the other way, for Lucas: the Compare page prints no Cabinet** (it is on each
   card, one tap away), so under the 10-22 rule either Accolades gains a Cabinet row or the verdict fact list
   drops the Cabinet lines and the notes list keeps them. Untested in a run until the cap lifts.
   **LUCAS'S DECISIONS ON THE INVENTORY (the same night; all built, no key):** the Cabinet lines are DROPPED from
   the verdict fact list and kept for notes (the Compare page does not print the Cabinet; changing the page to
   suit the writer is backwards); **the Proof panel joins the fact list on both sides, as each page prints it**,
   because Rodri v Rice shipped with no tackles, interceptions or blocks and read well enough to be missed twice
   (`vvAIStats.proof_rows` for the card's pool rows, total and per 90 at two decimals; `proof_compare` for the
   comparison's goals, assists and shots on target per 90 and goal conversion at its own decimals; each page
   sends only what it prints; one fact per figure; NR stated as not recorded; the tools bind tackles,
   interceptions and blocks); the radar legend fixed (Availability to Reliability, §D); the band one-liner, the
   archetype blurb and Data Confidence OUT, DECIDED. Token `20261024c`, both samples re-captured with 0
   unchecked numbers, self-test 101. **Two things the per-page rule exposes, recorded in
   `docs/PAGE_FACTS_2026-10-24.md` and not changed:** on Compare a CDM pair still has no tackles, because the
   Compare Proof panel prints attacking rows for every pool; and the Compare line has carried key passes per 90
   and the shots total since 10-22, which the Compare page does not print.
   **BOTH DECIDED THE SAME NIGHT, AS CONSEQUENCES OF THE PER-PAGE RULE (Lucas: "the fact list follows the page,
   never the other way round"; the third time this week the fix was to give the writer the page rather than
   bend either one).** Key passes per 90 and the shots total are OFF the verdict fact list and off the Compare
   request line, uncheckable by a verdict's reader since 10-22 ("a rule with convenient exceptions is not one");
   the card's notes keep both. A CDM pair on Compare therefore writes with no defensive figures, which is correct
   and honest under the rule; the fault is the Compare Proof panel printing attacking rows to a defender pair,
   logged in §D as a page error, not a payload fix, so that when the panel prints per-pool rows the facts follow.
   Both samples re-captured, audit clean. Nothing runs until the cap lifts.
   **2026-10-25: THE CAP RAISED TO $140 (Lucas, deliberately; B4b verified in anger; the alerts below the month's
   spend are a live gap) AND THE PORT DONE, AS SPECCED, SWITCH STILL OFF.** The record is the "THE PORT IS DONE"
   section of `docs/PROSE_CASE_2026-10-24.md`. The proof runs go through the preview deployment with
   `sample.js --endpoint`, not through the script, and wait on Lucas setting `VV_PROSE=on` on Preview only.
   **THE SAME MORNING: `VV_PROSE=on` set via the CLI on Preview for the `redesign-compare` branch only (Production
   has none); the first preview crashed on the allowlist (the writer moved to `api/_cited/`); PASS 1 THROUGH THE
   PREVIEW: sample 2 6 of 6 (114 sentences), sample 1 7 of 12 (verdicts 5 of 8, notes 2 of 4, 140 sentences), every
   failure "the headline was deleted" on tie pairs and cards, 20 to 53 seconds a piece in the function. The tools
   wait on the key, which is not on this machine. Pass 2 at 09:19 UTC after the sample rows are cleared.**
   **PASS 1 READ (the key arrived at `~/.config/anthropic/vv.key`): 14 tool flags, 13 the tools' own (per-90 figures
   bound to count words because the 90 of "per 90" was cut from the unit window; an honours count inflated by the
   PROOF segment on the line), 1 real ("as P1 states", a fact id in prose: writer rule added). THE HEADLINE DEATHS,
   reproduced locally: a league in the headline uncited (the example citation steered to P1, A2, B2; now A1 and B1
   are in it) and, on the second attempt, tag counts off by the career-stage tags because the writer never saw the
   totals (now the first line of its facts). Both closed; pass 2 runs on the closed rules; the two-clean-runs count
   for notes starts there. Lists: `_local/verdict-check/fresh_endpoint_pass_1_lists.md`, `fresh2_endpoint_pass_1_lists.md`.**
 THE CHOICE IS CODE-WRITTEN PROSE (the model only
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
