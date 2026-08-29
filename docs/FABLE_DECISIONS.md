# DECISIONS SETTLED BY THE FABLE ANSWERS

**THE VERBATIM ANSWERS ARE NOT IN THIS REPO YET.** This file records the DECISIONS as Lucas
stated them on 2026-08-29. It is not the answers, does not quote them, and must not be cited as
though it were. **When the two answers arrive they go in beside this file as
`FABLE_ANSWER_KEEPER.md` and `FABLE_ANSWER_EDITORIAL.md`, verbatim and unedited**, and this file
becomes the index to them.

Briefs: `KEEPER_SCORING_BRIEF.md` (scoring), `FABLE_BRIEF.md` (editorial).

---

## FROM THE KEEPER SCORING ANSWER

**K1. The keeper score is a STABILISED save% percentile, not a raw one.**
Raw save% over a real season carries roughly **6pp of standard error** against a competitive
range of about **10pp**, so the raw rate is noise-dominated at the margin and a percentile built
straight off it would rank noise. Stabilisation is the fix.

**K2. 60 shots faced is a DISPLAY gate, not a SCORING gate.**
This **overturns settled point 5 of the brief**, which stated the gate as 800 minutes AND 60
shots without distinguishing the two purposes. Sub-threshold keepers are still scored; what the
threshold governs is what the card is willing to SHOW.

**K3. Repartition `rel_pct` BEFORE lifting the 75 cap. Never the reverse.**
The cap is currently absorbing a wrong answer , modelling showed nine keepers landing exactly on
75 under a naive repartition. Lifting first would bake that in and make it unrecoverable.

**K4. Band keepers within their OWN pool. Preserve global RARITY, not global RANKS. Withhold
Generational from keepers, and state it as the platform's limit.**
So "Iconic" on a keeper card means iconic among keepers, the rarity of that band still matches
the outfield rarity, and the top band is not awarded because we cannot yet support the claim.
**The withholding is published as our limitation, not implied as a judgement on keepers.**

**K5. Availability earns EVIDENCE weight, never SCORE weight.**
Minutes and starts raise how much we trust a keeper's rate; they never raise the rate itself.

**K6. Global keeper pool. The league tilt does the cross-league work. Publish if it misbehaves.**
No per-league pools. The existing tilt is the mechanism, and if it fails to correct a weak-league
save rate, that failure is disclosed rather than patched.

**K7. No penalty tag, and refuse a manufactured denominator.**
Penalties saved stays a printed figure. Inventing a "penalties faced" estimate to create a rate
is explicitly rejected.

## FROM THE EDITORIAL ANSWER

**E1. The career arc IS in scope, with per-row null discipline, and scoped to the SCOUT REPORT
only.**
Neighbouring seasons go into the payload. Every row carries its own nulls honestly, and the arc
informs the scout paragraph alone , not the glance line, not the notes, not the verdict.

**E2. The model-existence check goes into the MERGE, not into a later model change.**
Production currently requests a retired model and 404s, so no editorial has ever generated live.
The check that a configured model still exists ships WITH the merge that fixes it.


---

## WHAT CAN LAND BEFORE THE MERGE, CHECKED AGAINST THE TREE

### CAN LAND , and E2 MUST

**E2 , the model-existence check. MUST land with the merge, by its own terms.**
`api/analyse.js:6` hardcodes `const MODEL = 'claude-sonnet-4-6'` and **there is no existence
check anywhere in the file** (grep: zero hits). Production hardcodes a retired id and 404s, so
the merge is the fix and the check belongs in the same change. **Small, self-contained, no data
dependency.**

**E1 , the career arc in the scout report. CAN land.**
`SEASON_ROWS` is already loaded client-side on `card.html` (11 references) for the trajectory
chart, so the neighbouring seasons cost nothing to send. **Two caveats:** it bumps the prompt
fingerprint and therefore invalidates every cached note, so it must land BEFORE any pre-warm;
and it cannot be verified end-to-end until the merge, because production's `/api/analyse` is
dead, so the prose it produces cannot be read on the live site first.

**K7 , no penalty tag. Already true, nothing to build.** Record only.

**K5 , availability as evidence not score. Already honoured by the shipped card**, which prints
minutes and starts as recorded figures and feeds neither into anything. Record as a constraint
on the future score.

**K6 , global pool. Already what the shipped ladder does.** Record; the "publish if it
misbehaves" half is a disclosure commitment that only becomes actionable once scoring exists.

**K2 , the display-versus-scoring split. CAN land, and it is currently MOOT but should still be
recorded in the code.** Today `keeperScore()` returns early under 60 shots and the card shows a
named not-scored reason, so the threshold already governs DISPLAY and only display , there is no
score for it to gate. **The ruling changes nothing today and constrains what happens when
scoring is built**, so the honest action now is a comment at `KEEPER_MIN_SHOTS` saying which of
the two it is, not a behaviour change.

### CANNOT LAND BEFORE THE MERGE

**K1 , the stabilised save% percentile as a real rt.** This is engine work: it changes `rt` on
keeper cards, which means a `player_card_view` edit plus a matview refresh, and it moves scores
on up to 1,920 gated cards. **Engine changes are not merge-window work**, and §C's rule that a
write needs a full before/after snapshot of all 57,234 cards applies.

**K3 , repartition `rel_pct`. UNBLOCKED 2026-08-29, AND IT IS A ZERO-MOVEMENT CHANGE.**
It was parked behind the corrupt block; C9 now resolves to six clean cards and three needing a
sum repair, **none of which is a goalkeeper**. Re-measured, the danger §E named has gone:
- **`rel_pct` is read in exactly ONE place**, verified from `pg_get_viewdef` rather than from the
  doc: `CASE WHEN (r.pos = 'GK') THEN ... LEAST(75, ...)`. **Only goalkeepers' rt can move.**
- **The GK partition is IDENTICAL before and after.** `pos = 'GK'` gives **4,289**;
  `COALESCE(pool,pos) = 'GK'` gives **4,289**. Of those, 2,718 already carry `pool='GK'` and
  1,571 carry a NULL pool that coalesces to GK. **Cards with a CONFLICTING pool: 0. Cards
  entering the bucket from outside: 0.**
- **The modelled hazard is gone too.** §E predicted 27 coarse-GK cards falling into a mixed `UNK`
  bucket; `UNK` is now **71 cards of which ZERO are GK**. The nine-card block contains **zero**
  GK. **Nothing can be capped at 75 by mistake, because nothing changes bucket.**
**SO THE REPARTITION CAN PROCEED AND DOES NOT WAIT ON THE THREE.** The sum repair is a separate,
non-GK, rt-touching write. **Still do it as its own change with the full before/after snapshot
§C requires** , zero PREDICTED movement is a reason to verify, not a reason to skip verifying.

**Lifting the 75 cap.** Follows K3 by K3's own ordering. Post-merge, after the repartition.

**K4 , keeper banding and withholding Generational.** Depends on a keeper score existing, so it
follows K1. **The disclosure copy cannot ship early either** , it would describe a banding the
platform does not yet do.

### THE SHAPE OF IT

**Two of nine land in the merge window (E1, E2), four are already true and need only recording
(K2, K5, K6, K7), and three are a post-merge chain in a fixed order: K3 repartition, then the
cap, then K1 scoring, then K4 banding.** That order is K3's ruling and is not negotiable by
convenience.
