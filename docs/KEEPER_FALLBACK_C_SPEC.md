# FALLBACK C — KEEPER MEASUREMENT, SHIPPING SPEC

**v6 of the keeper scoring series; supersedes v5; this is the document that ships.** The
response briefs argued toward an object. This one specifies the object that survived: no score,
no tier, no mark — the recorded measurements, their uncertainty, and a platform that says so.

---

## DECISION RECORD

**The mark object failed its pre-registered floor and is dead.** Six above-mark seasons against
a floor of twenty, at every prior-weight k from 0 to 300; best case twelve at k = 0. Recorded
without appeal, because §3 of the v5 pre-registration was written precisely so this moment
would not be a debate.

**The tilt was correctly not applied, and its result is a finding, not a lifeline.** The
registered pipeline tested the untilted stabilised rate; the tilt was a reported comparison.
Applying it after seeing counts, because it clears the floor at thirty, is the
method-change-after-unblinding the whole discipline exists to refuse. And its behaviour —
clearing the floor *with almost entirely different keepers* — is logged as evidence that the
outfield-calibrated tilt does something large and unvalidated to save rates. That goes in the
tilt's file, not in the keeper spec.

**Stability was never the problem.** Zero flips across three benchmark vintages. The object
died of rarity at the required confidence, not of fragility. The discipline held; the data was
simply not rich enough to support twenty no-hedge claims.

**The six are not published.** Naming the six above-mark seasons anywhere — card, explainer,
blog — is shipping the mark object's face after its floor failed: a leaderboard of six.
They exist in the shadow report and nowhere else.

**The prior-weight constant k retires.** Stabilisation existed to protect assertions.
Fallback C asserts nothing, so nothing shipped is stabilised: every displayed figure is a
recorded fact or a direct transform of one, and the one undecidable constant in the system
leaves the system.

**Best case at k = 0 is itself recorded as evidence.** Shrinkage pulls extremes inward, so the
mark count peaking with no shrinkage at all confirms the marked candidates were
extreme-and-thin — exactly the seasons the ceiling was built to doubt. The floor did not
narrowly miss a healthy object; it correctly measured a sparse one.

---

## THE INVARIANT

**There is no keeper scalar.** No field, column, export, sort key, or prose construction
anywhere in the platform reduces a keeper season's quality to a single number. Everything below
is an implementation of this sentence, and any future surface is tested against it before it
tests against anything else. Offline reconstruction from published raw figures is possible and
is not ours to prevent; the invariant governs what the platform computes, stores, orders by,
and says.

---

## THE PANEL SPEC

The save panel is the sole keeper measurement surface and moves to the top of the gated keeper
card, occupying the position the score holds on outfield cards. Its contents, top to bottom:

**1. The recorded figures.** Saves and goals conceded as recorded; shots on target faced,
labelled *derived* (saves + conceded); penalties saved as a count, labelled *no denominator
recorded*. The existing saved-versus-conceded bar stays.

**2. The rate, with its uncertainty.** Raw save percentage to one decimal, immediately
followed by its standard error: **74.2% ± 4.5pp on 82 shots**. The SE is not a footnote or a
hover state; it is part of the number, same type size, always. A rate printed without its SE
anywhere on the platform is a spec violation.

**3. The percentile, as a band — never a point.** The season's rate ± 1 SE, each mapped
through the empirical distribution of raw rates in the gated pool, printed as a range:

> *Between the 38th and 71st percentile of 1,920 measurable keeper seasons (2015 onward), on
> 82 shots on target faced.*

The band is the design's honesty made visible: a 60-shot season shows a wide band, a 250-shot
season a narrow one, and the reader sees evidence quality without being told about it. No point
percentile is computed, stored, or exported. Band endpoints are whole percentiles.

**4. The reference line.** The gated-pool median rate, drawn on the percentile ladder and
labelled with its value and vintage (*pool median 72.4%, 2025–26 close*). It is a published
fact, not an assertion about any season; refreshed annually at season close with the vintage
stated.

**5. The limitation block, carried and final.** No shot quality — twenty tap-ins and twenty
thirty-yard strikes record identically. Save rate is independent of workload; its relationship
to defence quality is unknown on this data. Penalties contaminate the rate slightly and
inseparably. This block is part of the panel, not a linked page.

**Prohibitions.** Nothing in the panel sorts anything: no surface, filter, API ordering, or
default list order uses the rate, the SE, the band, or its endpoints. Keeper lists order by
non-merit keys only — season, then club, then name. Exports carry the recorded figures, the SE,
and the band endpoints; no midpoint, no point percentile, no derived scalar.

---

## THE CARD SENTENCES

**Gated card (1,920), printed with the panel:**

> *The VV Score does not rate goalkeeping: save data resolves too little to stand behind a
> number. This season's shot-stopping is shown as recorded, with its uncertainty — and nothing
> finer is claimed.*

The score slot on keeper cards is **removed, not dashed**. A dash says a score is missing; the
truth is that for keepers, no score exists as a category. The panel occupies the slot.

**Ungated, below the evidence floor (876: 559 under minutes, 317 under shots).** The figures
exist and are shown — NR is never zero, and recorded facts are not hidden for being thin — but
no band, no reference line, no comparison:

> *Below the evidence floor — [n] shots on target faced, under the [60-shot / 800-minute]
> minimum. What was recorded is shown; no comparison is made.*

**Ungated, unrecorded (1,493: 1,299 pre-2015, 194 fields unrecorded).** No panel, because
there is nothing measured to put in one:

> *Saves were not recorded for this season — [coverage begins in 2015 / the fields were not
> captured]. Nothing is shown because nothing was measured: an unrecorded save is not a save
> that never happened.*

Every ungated card prints its specific ledger reason, not a generic one; the ledger has them
and the reader gets them. The retired sentence — capped at 75 — appears nowhere, and no keeper
card anywhere carries an rt.

---

## THE EXPLAINER — PUBLISH THE NEGATIVE RESULT

A platform whose culture is published limitations should publish this one in full, because it
is the strongest proof of the culture it will ever have. A methods-page section, public copy:

> **Why keepers have no number.** We tried to score goalkeeping, properly. The gap between the
> best and worst measurable keeper seasons is about 25 percentage points of save rate; a
> typical single season carries around 4 points of statistical error. At the confidence we
> require before printing a claim — chosen so that at most one season in the entire collection
> is expected to carry a claim it doesn't deserve — only six seasons in eleven years
> distinguish themselves from the pool's typical level. Six is not enough to build a scale, a
> ladder, or a badge on. So keeper cards show the measurements themselves, with their
> uncertainty, and no number — until data that sees the quality of each shot shrinks that
> error. The full audit is linked below.*

Link the audit (span, SE tables, the ceiling derivation) in whatever public form the shadow
report can be redacted to. The six seasons are redacted from it.

---

## CONSUMER RULES, FINAL FORM

All prior inventory discipline stands — traced not remembered, exclusion not relabelling,
caches invalidated, the switchover gated on the classified list. Final states:

**rt surfaces.** Keepers excluded from every rt-sorted or rt-filtered surface. A keeper row in
an rt list is a release blocker. Band × position filters return the stated reason: *keepers are
measured, not scored.*

**Keeper list surfaces.** Non-merit ordering only (season, club, name). No "top keepers" view
exists, and no filter facet encodes quality — facets are league, season, club, minutes-band as
a fact, and evidence status (measured / below floor / unrecorded).

**Compare.** Two keeper panels render side by side with bands visible. One line of registered
copy between them, always:

> *These panels report each season's measurements against the pool, not against each other.
> Overlapping bands are not distinguishable on this evidence — and most bands overlap.*

**Fable.** Receives recorded figures, band, evidence status, and the limit sentence. May state
facts, quote the band as a band, and voice the platform's limit. May not grade, rank, or
compare keeper seasons, and may not attach quality adjectives to shot-stopping — *strong*,
*elite*, *poor* applied to a keeper season is the platform asserting through prose what it
refuses to assert in numbers. Prose laundering is the named failure; the contract, not the
prompt, prevents it.

**Tags.** Iron Man unchanged. No measurement-derived keeper tag exists; penalties saved remains
a printed count with no denominator and no badge, permanently.

---

## REOPEN CONDITIONS

This spec is the platform's limit, not its position on goalkeeping, and it names its own exit.
The question reopens when either holds: a per-shot data source (location, type, or xG) is
ingested for keeper-faced shots, or any upstream change materially shrinks the per-season SE.
On reopen, the process restarts at the promise, not at the object: confidence promise first,
false-claim ceiling second, fresh pre-registration third, counts last — the v5 template is repo
property now. The baseline to beat is on the record: six seasons cleared at this SE. And the
validation gate from v2 keeps running on every refresh regardless, because the August fields
now have a permanent consumer and permanent scrutiny.

---

## REFUSED, PERMANENTLY OR UNTIL REOPEN

Publishing the six. Applying the tilt, or any method change, after unblinding. Lowering the
ceiling or the floor retroactively to resurrect the mark. Any keeper scalar — score, tier,
mark, point percentile, or midpoint — anywhere. Sorting any surface by rate, SE, or band.
Quality adjectives in generated prose about keeper seasons. A dash where the score slot was.
Generic ungated reasons where the ledger has specific ones. Zero-fill, penalty badges,
manufactured denominators, consumers classified from memory — the permanent set, unchanged
since v2, now embedded in a spec instead of a brief.

---

*Series record: v1 fell to the repartition premise, v2 to the availability-formula finding, v3
to the separability audit, v4 to the pooled-SE arithmetic, v5 to its own pre-registered floor —
each version killed by a measurement it asked for. This one ships because it is the first
whose every claim is a recorded fact.*
