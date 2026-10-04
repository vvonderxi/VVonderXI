# WARMING TIERS AND THE 26-SECOND WAIT , SCOPED 2026-09-27, NOTHING SPENT

**EVERY FIGURE HERE CARRIES ITS INPUTS, because a published number whose derivation is recorded
nowhere is a claim and not a measurement.** Re-derive rather than re-quote: the model, the prompt
lengths and the output lengths all move.

## THE GATE, FIRST, BECAUSE IT DECIDES WHETHER ANY OF THIS IS SPENDABLE TODAY

**DO NOT WARM ANYTHING UNTIL CHANGE 1 LANDS.** `NOTES_VERSION` and `VERDICT_VERSION` are
fingerprints of their prompts, so the held rule-4 edit discards every warmed row on the day it
ships. Change 1 is agreed and pending, held only on sample size.

**AND THE CACHE IS ALREADY PROOF OF THAT COST.** `notes_cache` holds **177 rows** and only **25**
are on the current prompt base `v3-279c6350`. The other 152 sit on **eighteen** older bases and will
regenerate on their next view. So nothing is banked, and the reason nothing is banked is prompt
edits.

## THE COST MODEL, DERIVED

Inputs, measured 2026-09-27:

| input | value | source |
|---|---|---|
| model | `claude-sonnet-4-6` | `api/analyse.js:6` |
| `NOTES_SYSTEM` | 31,684 chars | `require('./api/analyse.js')` |
| `VERDICT_SYSTEM` | 23,820 chars | same |
| notes user message | 1,491 to 1,604 chars | built from three real cards via `vvAIStats(c,{radar:true})` |
| notes output | median 1,929 chars, p90 2,428 | 177 `notes_cache` rows |
| verdict output | median 2,420 chars, p90 2,982 | 134 `verdict_cache` rows |
| prompt caching | ON, both branches | `cache_control:{type:'ephemeral'}` at lines 856 and 916 |

Rates used: input $3, output $15, cache write $3.75, cache read $0.30 per million tokens. Token
counts from chars at ~3.9 for prose and ~3.2 for JSON.

**A BULK WARM RUN IS EXACTLY THE WORKLOAD PROMPT CACHING IS FOR**, and that is what makes this
affordable. The system block is byte-identical on every call and sequential calls sit inside the
5-minute TTL, so one write is followed by thousands of reads at a tenth of the rate.

| | cold, no cache | warm cache |
|---|---|---|
| one card's notes | $0.035 | **$0.0129** |
| one pair's verdict | $0.043 | **$0.0160** |

The verdict figure corroborates independently: QA B4b recorded a cached verdict at $0.018 from a
different route.

## TIER DEPTHS , CARDS IN VV-RANKING ORDER, HIGHEST rt FIRST

At $0.0129 per card. Ranks read off `player_card_mv` ordered by rt descending.

| budget | cards | reaches down to | note |
|---|---|---|---|
| **$10** | 775 | **rt 83** | covers all 650 cards at rt >= 85 with change over |
| **$20** | 1,550 | **rt 79** | covers the **whole rt >= 80 band, 1,414 cards, for $18.24** |
| **$40** | 3,100 | **rt 75** | 3,545 cards sit at rt >= 75, so $40 is 87% of that band |

Band counts for reference: rt >= 90 is 150, rt >= 88 is 272, rt >= 85 is 650, rt >= 80 is 1,414,
rt >= 75 is 3,545. Total scored cards 54,416 of 58,066, so **$20 warms 2.6% of the platform.**

**$20 IS THE ONE THAT LINES UP WITH SOMETHING THE PROJECT ALREADY BELIEVES.** The launch bar is
"top band clean, tail honestly flagged", and rt >= 80 is that band. It is not a budget cut to fit a
number; it is the band the platform already treats as the one that must be right.

**THE BALANCE IS THE REAL CONSTRAINT, NOT THE CAP.** $32.94 remains with auto-reload OFF, so $20 of
warming leaves $12.94 for live traffic, which at $0.0129 a card is about a thousand first views.
Warm after topping up, not before.

## WHAT WARMING ACTUALLY CHANGES FOR A VISITOR , AND IT IS LESS THAN IT SOUNDS

**A WARMED CARD STILL SHOWS "Reading the season".** `card.html` paints the wait into `glDrury` and
`notesBody` **before** the fetch, unconditionally, and the cache is checked server-side. So a warm
card swaps a 26-second wait for a round trip of a few hundred milliseconds , and shows a fraction of
a 2.6-second animation cycle while it happens, which is the mismatch already logged.

**THE REST OF THE CARD IS ALREADY IMMEDIATE, so one of the listed options is not work.** The card
face, radar, trajectory, Proof, honours and the confidence panel all render from the matview row;
only the glance, the scout report and the notes wait. On compare a deep link renders the verdict
panels without generating anything. **"Show the radar and the numbers immediately while only the
prose waits" is the behaviour today.**

## WAIT REDUCTION, RANKED BY WIN OVER COST

### 1. DO NOT PAINT THE LOADER UNTIL THE FETCH HAS BEEN IN FLIGHT FOR ~250ms , FREE, AND IT SUBSUMES THE 2.6s PROBLEM

One timer and one guard, client-side, invalidates nothing. A warmed card then shows **no loader at
all** instead of a flash of a partial cycle, so it converts warming from "shorter wait" into "no
wait", which is what the money is actually buying.

**AND IT IS THE FIX FOR THE 2.6s CYCLE RATHER THAN A SEPARATE ONE.** The cycle only mismatched on
SHORT waits; any loader that still paints after a 250ms delay is waiting on a real generation of
roughly 26 seconds, where a 2.6s cycle is correct. Changing the duration would have been treating
the symptom on the wrong population.

Do this one regardless of everything else on this page.

### 2. STREAM THE PROSE , THE BIGGEST PERCEIVED WIN AND THE ONE REAL RISK

26 seconds to the whole answer becomes roughly 2 seconds to the first words. Anthropic supports SSE
and the endpoint would relay it.

**THE RISK IS NOT PLUMBING, IT IS THE GUARD.** `checkProseWinner` and `resolveWinnerId` run on the
COMPLETE text before anything is stored or shown, and they exist because the prose must not name a
winner it is not allowed to name. Streaming puts unvalidated text on screen and then has to retract
it. That is a product decision, not an optimisation: either validate mid-stream, or stream only the
fields with no winner constraint (the notes, the scout report) and keep the verdict atomic.
**The second is the honest first step , the notes are four stanzas about one player with no winner
to get wrong.**

Cost: a session for the notes half, more for the verdict half plus the guard decision. Post-launch.

### 3. A FASTER FIRST PASS , REJECTED, AND NOT ON COST

Two models means two voices, and the register of the prose is the product. A narrower version ,
Haiku for the one-line glance, Sonnet for the rest , would put the first line up fast, but it splits
the payload into two cache stamps and two invalidation paths for one sentence. Listed, not
recommended.

### 4. A SHORTER PROMPT , REJECTED ON MEASUREMENT

**The wait is output-bound, not input-bound.** Notes generate ~600 output tokens against ~8,100
cached input tokens that bill at a tenth of the rate and contribute little to generation time.
Halving the prompt would save about a tenth of a cent and almost none of the 26 seconds. The only
lever on output length is asking for shorter prose, which is a change to the writing and not a
performance fix.

## COMPARISONS ARE NOT WARMABLE, AND THAT IS THE PLAIN ANSWER

Pairs scale as n squared: the 1,414 cards at rt >= 80 make roughly a million pairs, so warming even
the top band's pairings is four orders of magnitude beyond any budget here. Restricting to same band
and same position pool cuts it by a large constant and leaves it still impossible.

**AND THERE IS NO EVIDENCE TO CHOOSE FROM.** With no traffic there is no popularity, and warming by
FAME is refused on principle , SEC C's anchor guardrail says famous names are a read-out and never a
dial, and a fame-keyed warm list reintroduces exactly that by the back door.

**SO THE DEFENSIBLE SET IS THREE PAIRS: the suggested matchups on compare's empty state**, which are
the guaranteed first comparison for any visitor who does not type. Roughly five cents. Everything
beyond that waits for real traffic to define it.

**The fix for comparisons is therefore item 1 above and then streaming, not cache.** A 26-second
wait that shows the numbers immediately, paints no loader until it has earned one, and then writes
in front of you is a different product from a blank 26 seconds. That is where the effort belongs.

---

## THE GATE, RESTATED AS LUCAS SET IT (2026-09-27) , TWO CONDITIONS, AND THE REMINDING IS CLAUDE'S JOB

1. **The rule 4 edit must have SHIPPED.** Not agreed, not scoped , shipped. Every version is a
   prompt fingerprint, so anything warmed before it is discarded by it.
2. **Lucas tops the balance up BEFORE the spend.** $32.94 remains with auto-reload OFF, so $20 of
   warming would leave about a thousand cold first views and then a hard stop.

**AND HE ASKED NOT TO BE THE ONE WHO REMEMBERS: "Remind me at that point rather than assuming I
remember."** So it is written into the punchlist row for item 27 as well as here, because a
reminder that depends on somebody remembering is the rule this project has already recorded as
forgotten. **When item 25 ships, say so in the same breath and put the three tiers back on the
table.**

**ITEM 1 ON THIS PAGE IS DONE , `9d0744d`, the 250ms loader hold.** So the "no wait" half of what
warming buys is already in place and free: a warmed card now shows no loader at all rather than a
flash of one. That changes the value of warming from "a shorter wait" to "no wait", which is the
version worth $20 rather than the version worth arguing about.
