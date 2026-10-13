# WHAT THIS PLATFORM ASSERTS THAT NOTHING VERIFIES , THE MAP (2026-10-12)

**Start here.** This is the map of every kind of claim the platform makes that no check reads,
with what (if anything) now covers each one. It exists because a stranger asked how the league
weights are made, in a reply to a paid ad, and answering properly found the VV Index overstating
the league's effect by three times. Every defect found that week had one shape: valid, rendering,
erroring nothing, and wrong. This map is the class, so the next instance is found by looking
rather than by a stranger.

**Before 2026-10-12, six of these seven areas had nothing checking them at all.** The only one
with any check was numbers drawn into images, and that check was a ledger run by hand.

The figures here are dated measurements. Re-derive before quoting them.

---

## THE SEVEN AREAS

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

### Already covered, leave alone
- VV Index figures: `gen-index-figures.js` then `apply-figures.js --check` (regenerate first).
- Share and search descriptions say "more than 50,000", which cannot go stale.

---

## THE THREE HIGHEST RISKS, RANKED BY PUBLIC EMBARRASSMENT, AND WHERE EACH STANDS

1. **The AI's verdicts and notes.** The product's voice and what gets screenshotted.
   Prompt edit applied, lint built, weekly read set. Open: the four homepage pairs re-warm after
   the next deploy; the read has not happened yet.
2. **The site's sentences about the engine.** About three sessions; the VV Index batch is
   written and waiting for sign-off.
3. **The privacy page.** Fixed and checked.

## WHAT TO RUN, AND WHEN

| When | Run |
|---|---|
| Every commit | `node scripts/lint-inline.js` (includes the privacy field check) |
| Before every push that touches a page | `node scripts/check-controls.js` , every visible control on every shipping page must receive its clicks (added 2026-10-13 after the homepage header went dead for two days) |
| Every engine change, same session | re-read the dependent sentences (claims register once built) |
| Weekly | `node scripts/lint-ai-cache.js` and `node scripts/lint-ai-cache.js --read 10`, and read them |
| Before any paid campaign | full pass of the VV Index, Playbook and card page; the marketing ledger re-run |
| Monthly | full pass of the three pages; the traffic report's retention panel |
