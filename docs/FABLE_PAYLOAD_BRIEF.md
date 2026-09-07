# FABLE PAYLOAD , DESIGN BRIEF

**What the prose model is told about a season. Response to the payload audit of api/analyse.js.**
The diagnosis in one line: the prose restates numbers because numbers are all it gets, and the
fix is not more numbers. It is a payload built as a **claims manifest** rather than a data dump.

---

## THE PRINCIPLE

A comparison makes prose insightful when the platform has already computed it, stands behind it,
and the model only has to voice it. A comparison makes prose descriptive when the model receives
ingredients and is left to cook , because it will either restate them or infer a claim nobody
checked. So the payload carries three blocks, each with its own licence, and the licence is
written into the system prompt as the register rule:

**Facts** , recorded numbers, always with their denominators. May be stated, never graded.
**Placements** , platform-computed percentiles within a named pool of stated size. May be
graded, because the grade is the platform's own arithmetic.
**Claims** , precomputed licensed sentences: honours, league leads, career position, stage,
margin class. May be asserted outright, because the platform already asserted them.

Nothing outside the three blocks may be inferred, ranked, or compared. The model's job is
selection and voice, not analysis. The 76-column matview stays where it is: sending all of it
would make the restating problem worse, not better, because a model given seventy numbers
writes a list with adjectives.

---

## RULING 1 , THE RADAR

**Both, as bound pairs, and never raw alone.** Each of the five dimensions ships as a pair: the
raw per-90 value and the pool percentile the reader sees on the chart, plus the pool name and
pool size once. The percentile is the licence, the raw value is the texture: percentile alone
produces adjective prose with no anchor ("elite goal threat"), raw alone is the current failure
(1.26 means nothing without the pool), and the pair produces the sentence the product wants:
*1.26 goals every 90 minutes, a rate in the 96th percentile of the winger pool.* The audit's
sharpest line settles the notes path: the card page describes a chart it cannot see. **The
notes payload gets the same five pairs.** Low percentiles are in scope on purpose , a 6th
percentile defensive number is insight, not embarrassment, and the platform already prints it.

**In the verdict path, the model never compares radars itself.** Two players' percentiles
differ by amounts the platform has not audited for separability, and two days of this project
established what happens when unseparable differences get narrated. So the platform precomputes
a per-dimension comparison claim (clearly higher, comparable, clearly lower) at a stated
threshold and sends the claim; the pairs travel alongside as texture. The model voices the
platform's comparison or stays silent on that dimension. It does not do arithmetic on noise.

---

## RULING 2 , CAREER CONTEXT

**Derived claims plus the compact series, with the claims carrying the licence.** The keeper
savePctSeries already set the precedent that a career series is payload material, and thirteen
rows of (season, rt, goals, assists) is cheap. But the series alone invites the model to run
its own trend analysis, and a model-derived "his best since 2018" is a claim nobody checked. So
the platform computes the career block: career position (*highest rt of his thirteen seasons*),
prior season and direction (*after an 80, his lowest since 2019*), the age fact (*at 32*), and
debut year. Those are statements about the platform's own published numbers , every rt in the
series is already public on a card , so voicing them asserts nothing new. The contract line:
**trajectory claims come only from the derived block; series values may be quoted as facts.**
The series is there so the prose can touch a specific year without being allowed to theorise
about the shape of a career.

---

## RULING 3 , WEAK COMPARISONS

**Weak comparisons are omitted upstream, not hedged downstream.** This is the two-day
discipline reaching the prose, and the mechanism matters: a language model is unreliable at
calibrated hedging but perfectly reliable at not mentioning what it never received. In the
notes path, if a season's comparison context does not clear the platform's bar , a league rank
that is not a lead, a career gap inside uncertainty, a percentile edge inside the threshold ,
the field is simply absent from the payload. The model cannot soften, caveat, or "to be fair"
its way around evidence it does not have. Absence is the hedge, and it is enforceable.

**The verdict path cannot omit, so it carries a margin class.** A verdict must say something
about any pair, and today the payload sends a precomputed result line (*Player B takes the
edge, 95 to 75*) that always names a winner. The payload gains a margin class , decisive,
clear, narrow, inside uncertainty , computed by rule, and the system prompt maps each class to
a register. The last class is the new one and the honest one: when two seasons sit inside the
platform's uncertainty, the verdict says the platform cannot separate them, and says it as the
verdict, not as a disclaimer under a winner. That requires two product changes beyond the
payload, named so they are not discovered later: the result line must be allowed to output
*even*, and the VERDICT TAG menu needs a too-close-to-call tag, or the UI will force a winner
the prose just refused to declare.

**The thresholds are provisional, and honestly labelled as such.** The outfield separability
audit , noted and unrun since v3 of the keeper series , has just acquired its first concrete
consumer: the margin classes need boundaries, and until the audit runs they are conservative
defaults marked provisional in the config. The audit stops being a footnote and becomes a
dependency.

---

## THE REST OF THE PAYLOAD

**Honours, both forms collapsed to one.** honours_json carries year and whether the player or
the team won it, which is exactly the shape prose needs. Highest insight per byte in the entire
matview: the model currently writes about Salah 24/25 without knowing about the Golden Boot,
the Player of the Season award, or the title. Claims block, asserted outright.

**Stage tags, from the matview columns directly.** stage_peak, stage_the_standard,
stage_breakout ship as claims. Not via D.tags , the audit records that route rendering in the
wrong container on one surface and nowhere else, and the payload does not build on a broken
route.

**Denominators, as bound pairs, the audit's sharpest omission.** Goals with shots taken,
dribbles succeeded with attempted, duels won with total, penalties scored beside goals so
*nine of the twenty-nine from the spot* is available. Pairs are facts: the prose may state 29
from 104, and may not grade the conversion, because a ratio without a reference is one more
number to restate. If the platform wants graded accuracy sentences, it computes pool
percentiles for the three or four headline ratios and promotes them to placements. Until then
the pairs stay in the facts block, stated and ungraded. Trade off named: some texture is
deferred until the platform does the arithmetic, which is the correct direction of deferral.

**League-season claims, top ranks only.** The platform computes leads and podium ranks per
league-season for headline stats and sends only those that clear the bar, as finished
sentences: *led the Premier League in assists*, *most tackles by a winger in the league*. The
cross-position surprise the commission named , a winger leading his league in tackles , falls
out of exactly this block. No distributions, no full ranks, nothing below third: *17th in fouls
drawn* is the restating disease with a rank attached.

**Tag glosses.** Tag names travel today with no meaning attached, so the model either ignores
them or guesses. Each tag ships as name plus its one-line platform definition, so the prose
voices what Iron Man means here, not what it sounds like.

**Refused fields.** The provider rating (7.79): an external black-box grade the platform
cannot explain and therefore cannot defend, and prose must never voice a number the platform
would not stand behind , it does not enter the payload in either path, ever. Engine internals
(due, adj_output, share percentages): machinery, not claims. Identity trivia (shirt number,
club colours, date of birth beyond age). The full matview: the restating problem scales with
payload size unless every field carries a licence, which is the whole design.

**Keepers, for completeness.** The Fallback C contract governs: keeper payloads carry the
recorded figures, the percentile band as a band, evidence status, and the platform limit
sentence. No adjectives, no comparisons, no scalar. The savePctSeries stays, quoted as fact.
Nothing in this brief loosens that.

---

## THE FINGERPRINT PLAN

Both constraints are load bearing, so the plan says which fingerprints move, when, and why the
trap cannot recur.

**Notes: one atomic payload v2, one invalidation, paid once.** stats_hash fingerprints the
whole player object, so every field addition invalidates every cached note. The expensive
mistake is dribbling fields in across releases and paying full regeneration N times. All notes
payload changes in this brief land as a single schema, in one release, with one invalidation
and one regeneration pass. The schema gains an explicit payload_version field so that every
future addition is a deliberate versioned event with a known cost, not an accident with a
surprise bill.

**Verdicts: the system prompt moves in the same commit, and it must anyway.** The trap is that
payload fields added without editing VERDICT_SYSTEM leave the fingerprint unmoved, serving
cached prose while new evidence flows underneath it. This design cannot fall into the trap
even accidentally, because the margin classes, the claim licences, and the register rules all
live in the system prompt: the prompt edit is not an obligation bolted on, it is half the
design. VERDICT_SYSTEM bumps, the 106 rows regenerate, done.

**The structural fix, so the trap dies rather than being dodged.** The verdict fingerprint
should incorporate the payload schema version alongside VERDICT_SYSTEM. Then a payload change
without a prompt change still moves the fingerprint, and the failure mode , new evidence under
stale prose , becomes impossible by construction instead of prevented by discipline. One line
of hashing; the difference between a rule people follow and a rule the system enforces.

**Sequencing.** Schema and prompt land together; notes invalidate and regenerate; verdicts
regenerate off the bumped fingerprint; the provisional margin thresholds ship marked
provisional; the outfield audit, when it runs, updates the thresholds and bumps VERDICT_SYSTEM
again, which is correct, because the register genuinely changed.

---

## WHAT I WOULD REFUSE TO DO

Send the raw radar without its percentile, in either path, one more day. Let the model compare,
rank, or trend anything the platform did not precompute. Hedge weak comparisons in prose
instead of omitting them from the payload. Ship a verdict register without an inside
uncertainty class, or the class without the *even* result line and the tag to match. Voice the
provider rating, ever. Send the full matview and call it context. Add a notes field outside a
versioned schema release. Change the verdict payload and the system prompt in different
commits. And the inherited set stands: nothing tuned to reputation, no consumer classified from
memory, and the keeper contract exactly as specified in Fallback C.
