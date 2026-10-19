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
2. **Claims that contradict the card's own percentiles.** "His Progression figure sits inside a
   breath of the 90th percentile bar" on a card reading 81; Saka's defending "separates him from
   almost any other winger" at 72; "his numbers across every dimension are higher" when the other
   card leads Reliability. **ROOT CAUSE: the writer is sent RAW per-90 dimensions, never the
   percentiles the reader sees.** It is writing about numbers it cannot see.
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
- `HELD_PAIRS`: the eight pairs the site has ever linked to answer held regardless of the switch
  (`1576399`). Homepage rotation zero pairs, Compare suggestions empty. Rows backed up at
  `migrations/verdict_hold_2026-10-17/before_verdict_cache.json`.

**Before prose comes back on, in this order:**
1. Kind 2: send the writer the percentiles the card shows, and give the checker the same.
2. Rewrite the calibration set from these twelve, the quoted sentences labelled by kind, and
   report a number PER KIND. One number is a number about kind 1.
3. Regenerate a sample (not the twelve; fresh pairs and cards) and read it against the cards.
   Prose comes back on when that sample passes, not when the code is merged.
4. A watch on the Anthropic balance (QA_PASS B4b). Nothing watches it, and the hourly ceiling
   allows about $312 a day. Live the whole time prose was on; added 2026-10-18.
5. A decision on the race where two simultaneous first requests for one uncached pair both
   generate (measured 2026-10-08). Same; added 2026-10-18.

**A cost fact the next session will meet:** on 2026-10-17 the notes cache held 731 rows and only
6 were on the current prompt. Every prompt edit makes the rest stale, so while prose was on,
almost every card opened generated fresh, unread notes. The switch stopped that; turning it back
on restarts it.

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
