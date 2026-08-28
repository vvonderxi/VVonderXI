# FABLE AS THE INTERPRETIVE LAYER , BRIEF

**Status: a brief, not a build. Nothing here has been implemented.** Written 2026-08-28 against the
`redesign-compare` branch. Every inventory item below was read off the live code this session, not
recalled , where a number is an estimate it says so.

**The question this answers.** VVonderXI's engine produces a defensible number and a set of tags. It
cannot produce a sentence. Everywhere the platform has to say *what a season was*, rather than *what
it scored*, a model writes it. This brief sets out where that already happens, what the model can
currently see, and where a richer payload would let it say something TRUE that the engine cannot , as
against merely something longer.

---

## 1. THE INVENTORY , EVERY PLACE AI TEXT RUNS TODAY

There is **one endpoint**, `api/analyse.js`, with **two modes**, feeding **four visible surfaces**.
Model on the branch: **`claude-sonnet-4-6`**.

| # | Surface | Mode | Where it renders | Shape |
|---|---|---|---|---|
| 1 | Glance line | `notes` | `card.html`, under the name | ONE sentence |
| 2 | Commentator's Notes | `notes` | `card.html`, its own panel | 4 stanzas, 2 to 3 sentences each |
| 3 | Scout report | `notes` | `card.html`, in The Trajectory | 2 short paragraphs |
| 4 | Compare verdict | default | `compare.html` | JSON: `p1`, `p2`, `h2h`, `verdict`, `tag`, `who` |

**One call serves 1 to 3.** They are generated together and cached together, so they cannot disagree
with each other , that is deliberate and must survive any change.

**Surface 4 also SELECTS**, it does not only write. The model picks one verdict tag from a supplied
menu, and the six ladder tags and three age tags are decided compare-side before it is asked. So the
model's judgement is bounded to the five CONTEXT tags, and the prose must then match the tag it chose.

### What each receives now

**Notes mode** gets, per card: name, season, age, club, league, position, goals, assists, rt, tag
names , plus the enriched block from `VVCore.vvAIStats(D)`: per-90 rates with the **position-pool
threshold bar** for each, the minutes / starts / appearances denominator, the **named missing-field
list**, an era flag, and (new this session) the keeper block naming the 75 cap.

**Verdict mode** gets: one composed line per player, the computed result and tone, and the tag menu.
It is a **thinner payload than notes**, and that asymmetry is not a decision anyone made , it is
where the two features happened to land.

### What is deliberately withheld, and must stay withheld
- **`passes_accuracy`.** Invalid, not sparse: the provider reads Kroos 92 in 2019 and 67 in 2020 at
  the same club on the same volume. The prompt names it and says why, so the model does not reach for
  a pass-completion story it cannot support.
- **Anything the engine does not measure**, stated as a boundary rather than a silence , the GK cap is
  the worked example.

---

## 2. WHERE A RICHER PAYLOAD BUYS TRUTH, NOT LENGTH

The test for every item below: **does the model currently say something vague, or something false,
that this datum would fix?** Anything that only makes the prose longer is not on this list.

**a. Career shape.** The model sees ONE season and is asked, in the scout paragraph, where it sits in
the player's arc. It cannot see the arc. `SEASON_ROWS` is already loaded client-side for the
trajectory chart, so **the neighbouring seasons cost nothing to send.** This is the single largest gap
between what the prose asserts and what the model can know, and it is currently answered by inference
from age. **Highest value, lowest cost.**

**b. The pool the player is being judged against.** The model gets a per-90 rate and a threshold bar.
It does not get *how many players cleared that bar*, so "among the very best" is a guess dressed as a
measurement. Rarity is already computed for tags.

**c. The verdict payload's asymmetry.** Surface 4 is asked to settle an argument on less information
than surface 2 gets to describe one season. Bringing verdict mode up to `vvAIStats` parity is mostly
plumbing and would let the verdict cite the same evidence the card does , today the two surfaces can
describe the same player from different pictures.

**d. What the engine deliberately did NOT count.** The `gaw` penalty adjustment, the league tilt, the
CDM defensive benefit. When a famous name scores lower than a reader expects, the honest answer is
usually one of these, and the model cannot currently give it , so it either avoids the subject or
invents a reason.

**e. NOT WORTH SENDING, and the reason matters.** Raw provider fields we do not trust
(`passes_accuracy`), anything the engine ignores in scoring, and any field whose null means "not
recorded" without a flag saying so. **A model handed an unlabelled null will treat it as a zero and
write a sentence about it**, which is the same defect the radar had.

---

## 3. WHAT SWITCHING TO FABLE WOULD AND WOULD NOT BUY

**Would.** Fable (`claude-fable-5`) is the stronger interpretive writer, and this workload is almost
entirely register: sustaining a voice across four stanzas, matching prose to a chosen tag, and knowing
when a claim is not earned. The last of those is the one that matters , the failure mode here is not
clumsy prose, it is **confident prose about a number that does not support it.**

**Would not.** It does not fix any data gap in section 2. A better writer given one season still
cannot see the career arc. **Do the payload work first, or the upgrade is judged on the wrong thing.**

**Cost.** Notes are cached per card and verdicts per pair, both content-keyed with no user identity, so
steady-state cost is a function of unique cards viewed, not traffic. **Fable on the cold path only.**
An honest estimate of the cache-warm ratio is not possible from here , the caches were invalidated this
session and production has never generated at all (see below).

---

## 4. THE OPERATIONAL FACTS ANY CHANGE MUST RESPECT

- **`VERDICT_VERSION` and `NOTES_VERSION` are DERIVED**: `PROMPT_REV` plus a fingerprint of the exact
  system prompt. **Editing a prompt auto-invalidates its cache and you cannot forget.** Changing the
  model also misses, because the cache row stores `model`. **So a payload change and a model change
  are each a full regeneration.** Do them together or pay twice.
- **`stats_hash` fingerprints the whole cited payload**, so adding a field to `vvAIStats` invalidates
  every cached note by design. This session's enrichment already did that: **93 verdict rows and 314
  notes rows went stale.**
- **THE PRE-WARM MUST BE LAST.** Any pre-warm run before a payload or model change is money spent on
  rows that will immediately miss.
- **PRODUCTION HAS NEVER GENERATED A SINGLE LINE.** `vvonderxi.com/api/analyse` returns HTTP 404
  `{"error":"model: claude-sonnet-4-20250514"}` , production hardcodes a retired model, so every
  verdict and every set of notes on the live site has fallen back to the outage line. **The merge
  fixes it and nothing else needs to.** It also means **the Anthropic credit question is untested**:
  the request never reaches Anthropic, so the 404 says nothing either way.
- **A MODEL ID IS A DEPENDENCY WITH AN EXPIRY AND NOTHING WATCHES IT.** There is no build step and no
  check that the configured model still exists. The failure is silent: the site serves, the panels
  render, the prose is simply never there. **Whatever model is chosen, this needs a check.**

---

## 5. THE HONESTY CONSTRAINTS , NON-NEGOTIABLE, AND THEY ARE THE PRODUCT

These already exist as prompt rules and must survive any rewrite. They are listed because a model
change is exactly when someone reaches for a cleaner prompt.

1. **Percentiles are not ranks.** "Top 10% of his pool" is not "the 10th best player".
2. **A rate without its sample is not a claim.** Per 90 over 400 minutes is not per 90 over 3,000.
3. **Hedge where the data earns a hedge**, and only there. Manufactured uncertainty is its own lie.
4. **Name the era boundary** rather than writing around a gap.
5. **Name a measurement boundary as the platform's limit, never as a judgement on the player.** The GK
   cap is the case that forced this: the number is low because we do not measure goalkeeping, not
   because he kept goal badly.
6. **NR is never zero.** Anywhere. This is the rule the whole platform is built on.

---

## 6. WHAT HAS TO BE DECIDED BEFORE ANY OF THIS IS BUILT

1. **Payload first or model first?** Recommendation: **payload first.** Section 2a and 2c are real gaps
   in what the prose can truthfully say; a model change judged before them is judged on the wrong
   variable, and each change costs a full regeneration anyway.
2. **Fable everywhere, or Fable on the verdict only?** The verdict both selects and writes, and is the
   surface where a wrong call is most visible. It is the strongest candidate for a split.
3. **Is the career arc in scope?** It is the largest truth gap and the cheapest fix, but it changes
   what the notes ARE , from a season description to a career claim. That is a product decision.
4. **Who pre-warms, and when?** After 1 and 2 are settled, never before.
