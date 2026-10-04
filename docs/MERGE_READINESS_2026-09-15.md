# MERGE READINESS , THE SWEEP OF 2026-09-15

**READ THIS FIRST, AND IT IS THE ONLY THING ON THIS PAGE THAT CAN COST MONEY IF IT IS SKIPPED.**

**The deployed surface is now ONE serverless function, `api/analyse.js`. Today it gained an
input/output bound, an origin allowlist and a rate limit. NONE OF IT IS LIVE.** Everything in
this note is on `redesign-compare`. Vercel's production branch is `coming-soon`, which serves
the holding page, so vvonderxi.com is running none of it.

**Someone reading this repository would conclude the endpoint is protected. It is not yet.**
The protections become real at the same moment the platform does , when production's branch
tracking is flipped , and not before. That flip is the launch, not the merge.

---

## 1. WHAT THE SWEEP FOUND, IN ORDER OF WHAT IT WOULD HAVE COST

**THE ENDPOINT WAS AN OPEN ANTHROPIC PROXY.** `messages`, `system` and `max_tokens` all arrived
from the request body and went to Anthropic on our key, with `Access-Control-Allow-Origin: *`,
no auth and no rate limit. **The caller chose what each call cost.** Not a broken code path ,
every line did what it said , which is why no behavioural sweep would have found it.

**IT SURVIVED BECAUSE EVERY PRIOR REVIEW ASKED WHETHER IT WORKED.** The cache stamps, the
A/B swap, the winner check and the prompt splice were all audited hard and repeatedly, and
every one of those is a question about correctness for a caller we trust. **Nobody asked what
an untrusted caller could do with the same three fields**, and the answer was in one
destructuring line the whole time. A file can be the most-audited on the platform and
unexamined in one direction.

**A CACHE VERSION COULD DESCRIBE A PROMPT THAT DID NOT WRITE IT.** `customSystem` overrode the
system prompt while the stamp was picked from the `judge` flag, so a row could be written by a
prompt nobody has ever seen and stamped as ours , then served to every later visitor for that
pair. Same shape as the Path B splice: a value computed from one thing while a different thing
is used.

**THREE PUBLIC-DATA DEFECTS.** `api/get-seasons.js` asserted a recorded **0** for goals on
3,061 rows and assists on **31,040** (54.8% of the database) from a machine-readable endpoint;
a public 500 returned `err.message`, which on this platform means Supabase table and column
names; and two log tables held session-linked records with no consumer.

**FIVE UNDEFINED CSS VARIABLES, ALL LIVE.** The worst was rankings' visible "Filters" button
carrying three on one rule , measured on the live page as `background: rgba(0,0,0,0)` and
`border: 0px none`. **The pill had no background and no border and was rendering as bare text.**

---

## 2. WHAT WAS FIXED

| | |
|---|---|
| Output ceiling | clamped to **2048** tokens; input capped at **120,000 chars**; `messages` shape validated |
| Origin allowlist | the **four** domains read off the Vercel project, plus a wildcard for Vercel's generated branch URLs. **Absent Origin refused** |
| Rate limit | **30 new generations/hour/IP, 2 concurrent**, on `api_rate_events`. Refusals recorded in the ledger |
| Error leakage | upstream text and `err.message` logged, never echoed |
| Cache stamp | fingerprinted from the prompt actually sent; `VERDICT_VERSION_JUDGE` exported |
| Unreadable rows | a verdict row that cannot be stamped is no longer written |
| Deployed surface | **2 functions to 1** , `api/log.js` was already gone, `api/get-seasons.js` deleted |
| Data | 194 orphan notes rows deleted, `comparison_log` + `search_log` dropped, all captured first |
| CSS | five undefined variables fixed across four surfaces |
| Snapshots | `KEEPER_SAVE_LADDER` got the generator it never had; both snapshots verify current |

**ZERO CACHED ROWS REGENERATE FROM ANY OF IT.** All three prompt versions are byte-identical
before and after , asserted, not assumed.

---

## 3. WHAT IS STILL OPEN, AND WHO HOLDS IT

**DISTRIBUTED ABUSE IS NOT COVERED BY ANYTHING BUILT TODAY , see section 4.** A pool of
addresses gets 30 an hour from each and no per-IP rule can see it. **This is the one remaining
gap with a cost attached, and it is five minutes of Lucas's time.**

- **Item 26**, `migrations/matview_sitting_2026-09-15/SITTING.sql` , written, not run, needs the
  SQL editor (the refresh exceeds the service role's timeout).
- **Item 22**, the PDF , built, awaiting a read.
- **Item 25**, the emphasis measurement , gated, and the gate is explicit: **both prompt bases
  must stop moving**, and the current Path A prompt has **zero** rows.
- **The blank-shield question** , unanswered, and it governs two populations at once.
- **QA A14, the platform contrast re-run** , the buttons-and-chips half of the 2026-09-01 survey
  is void, so it needs a full re-measure. Large enough to be its own session.
- **B-group and D-group QA** , every item needs the deployed site, so they run at merge time.

**AND THE QA SCOPE IS A THIRD OF WHAT THE PLAN RECORDS.** Re-measured against the current
merge-base `32b19dab`: **200 commits, 130 files, +36,080 / -933**, against the plan's 599 / 186
/ +205,155. Not drift , a different base, because the 2026-09-06 merge already absorbed most of
it. **Scoping the pass to 599 commits would over-scope by a factor of three.**

---

## 4. SPEND ALERTING , THE ONLY INSTRUMENT THAT SEES DISTRIBUTED ABUSE

**Set this in the Anthropic Console under Settings > Limits. It is the last thing between us and
an unbounded bill, and nothing in the code can replace it.**

### The numbers, derived from the shipped prompts and caps rather than estimated

| | |
|---|---|
| A verdict, system block cached | **$0.018** |
| A commentator's note, cached | **$0.024** |
| **Legitimate use at measured traffic** | **$0.14 a day, about $4 a month** |
| One abusive IP, at the rate limit's ceiling | **$0.73/hour, $17 a day** |
| Ten IPs | **$175 a day** |
| Fifty IPs | **$873 a day** |

### What to set

1. **MONTHLY SPEND CAP: $100.** Legitimate use is about $4 a month, so this is 25x headroom and
   cannot be reached by real traffic at today's volumes. **A sustained ten-address attack hits
   it in under a day**, which converts an unbounded bill into a bounded one plus an outage.
   Pre-launch, that trade is the right way round.
2. **ALERT AT $20.** This is five times legitimate use and roughly one day of a **single**
   abusive IP running at the rate limit's ceiling , the smallest real abuse signal that exists.
   If this fires and nothing was announced, treat it as an incident, not a curiosity.
3. **ALERT AT $50** as the second line: past this it is not a blip and the cap is hours away.

### The rule for moving them, so the next person raises them on evidence

**These are set against PRE-LAUNCH traffic and they WILL fire on launch day if the platform
finds an audience. That is not a false alarm, it is the threshold doing its job and telling you
the baseline moved.** Re-derive rather than doubling by feel:

    -- the new legitimate daily figure, from the caches themselves
    select date_trunc('day', created_at) d, count(*)
    from notes_cache group by 1 order by 1 desc limit 14;

**Set the alert at 5x the busiest legitimate day and the cap at 25x the legitimate month, and
write the new figures into this file in the same change.** A threshold whose derivation is not
recorded becomes a number nobody dares touch, which is how alerting gets switched off instead
of raised.

**AND THE CAP IS NOT A RATE LIMIT.** It stops the bill, not the abuse, and it stops the site
with it , every visitor gets a failed generation once it is hit. It is the backstop for the
case the per-IP limit cannot see, and it should never be the thing that catches a problem
first.
