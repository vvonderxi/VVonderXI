# SPLITTING sig , def_share_pct AGAINST duel_quality_pct

**Decision document. Measured 2026-09-08 against the live matview, read-only. The engine was
not changed by this audit and no recommendation in it has been applied.**

---

## THE PREMISE WAS WRONG AND THE CORRECTED NUMBER IS 0.194, NOT 0.076

The brief that commissioned this split cites a correlation of **0.076** between the two facets.
**Measured on the defensive pools it is 0.194**, and per pool:

    CB 0.124  |  FB 0.206  |  CDM 0.403

**The conclusion survives , 0.194 is still two things rather than one , and the case for
splitting them is unchanged.** But the number must be quoted correctly wherever this work is
cited, and the per-pool spread is itself a finding: **CDM at 0.403 is a different animal from
CB at 0.124**, so a single blend is doing measurably different jobs in the three pools it
serves. That is recorded in section 4 and is, in my view, the most actionable thing here.

---

## THE ANSWER, IN ONE PARAGRAPH

**Both facets carry real information and NEITHER is noise.** The commissioning hypothesis ,
that `duel_quality` is mostly noise because its denominator is opponent-driven , **IS NOT
SUPPORTED**: it persists year on year at 0.477, splits half within a career at 0.601, and
correlates with team strength at only 0.111. **`def_share_pct` is nevertheless the stronger
facet on every axis measured**, and the shipped weights (0.55 to it, 0.45 to duel_quality) are
already in that order, so the blend is not upside down. Whether 0.55/0.45 is the RIGHT split
is a question this audit cannot answer, because there is no external criterion of defensive
quality on this platform to optimise against , the same wall the keeper work hit.

---

## WHY THIS MATTERS MORE THAN IT LOOKS

`sig` is the whole defensive floor for CB, FB and CDM:

    FLOOR = LEAST(64, 44 + 22*sig)
    sig   = 0.55 * def_share_pct + 0.45 * COALESCE(duel_quality_pct, def_share_pct)

and that floor **IS** the score on 86% of centre-back seasons, 83% of full-back and 74% of
CDM (measured 2026-09-07). So these two facets are not a detail of the engine. On most
defenders they ARE the engine.

---

================================================================================
1. DISTRIBUTION AND DISCRIMINATION
================================================================================
BOTH PERCENTILES ARE UNIFORM BY CONSTRUCTION and reading them tells you nothing. They are
percent_rank() OVER (PARTITION BY pool ...), so the spread is flat whatever the underlying
data does. Confirmed: mean def_share_pct is 0.500 / 0.495 / 0.489 across CB / CDM / FB and
duel_quality_pct is 0.502 / 0.502 / 0.501. THE QUESTION IS WHETHER THE RAW VALUE UNDERNEATH
HAS ANYTHING TO RANK, because a percent_rank over a near-constant column manufactures a full
0-to-1 spread out of noise.

  def_share (raw), defenders, n=12,177
    min 0.0142 | p10 0.8424 | median 1.2602 | p90 1.7282 | max 6.2139
    sd 0.3731  | CV 0.292   | IQR/median 0.358

  duel_rate (raw), defenders, n=11,848
    min 0.1905 | p10 0.4615 | median 0.5526 | p90 0.6373 | max 0.8571
    sd 0.0698  | CV 0.127   | IQR/median 0.162

DEF_SHARE DISCRIMINATES ROUGHLY TWICE AS WELL. Its coefficient of variation is 0.292 against
0.127, and its inter-quartile range is 36% of its median against 16%. The p10-to-p90 span is a
factor of 2.05 for def_share and 1.38 for duel_rate.

DUEL_RATE IS THE CLUSTERED ONE. Half of all defenders sit between roughly 0.51 and 0.60 duels
won , a nine-point window on a measure whose full observed range is 0.19 to 0.86. The
percentile then stretches that nine-point window across the entire 0-to-1 scale, so two
defenders separated by 0.02 in the thing actually measured can be separated by 20 percentile
points in what the engine consumes.

================================================================================
2. YEAR-ON-YEAR STABILITY , DOES IT PERSIST FOR THE SAME PLAYER
================================================================================
Consecutive seasons, same player, 900+ minutes in both, defensive pools. n = 6,005 pairs.

                        year-on-year r      same club only (n=4,684)
  def_share_pct              0.551                 0.578
  duel_quality_pct           0.477                 0.495
  def_share  (raw)           0.537
  duel_rate  (raw)           0.548

SPLIT-HALF WITHIN A CAREER , odd seasons against even seasons, players with 4+ defensive
seasons, n = 1,136:
  def_share_pct              0.655
  duel_quality_pct           0.601

BOTH PERSIST, AND NEITHER IS NOISE. This is the finding that most surprised me and it cuts
against the brief's suspicion. duel_quality is lower on every stability measure but not by
much, and 0.477 to 0.601 is a real player-level signal, not circumstance. A facet measuring
mostly noise would sit near zero here and neither does.

RESTRICTING TO THE SAME CLUB RAISES BOTH SLIGHTLY, which is the expected direction , some of
the year-on-year movement is genuinely a change of team , and it does not reorder them.

================================================================================
3. WHAT EACH FACET TRACKS , MINUTES, LEAGUE, TEAM
================================================================================
Defenders, 900+ minutes, team-season known (n = 11,711). Team strength = mean rt of that
team-season over squads of 8+ scored cards.

                        minutes    team strength   team_def90   league weight
  def_share_pct         -0.029        0.000          -0.060        -0.020
  duel_quality_pct       0.127        0.111          -0.007         0.039

NEITHER TRACKS THE TEAM MORE THAN THE PLAYER, and this also cuts against the brief's
hypothesis. The opponent-driven denominator worried about in the brief does not show up as a
team effect: duel_quality_pct correlates 0.111 with team strength and 0.127 with minutes,
which are small. def_share_pct is essentially orthogonal to all four , its 0.000 against team
strength is the cleanest number in this report.

WORTH NAMING: def_share is a SHARE of the team's own defensive actions, so it is normalised
against the team by construction. That is why it is clean here, and it is a design property
rather than luck.

================================================================================
4. POSITION ENTANGLEMENT WITHIN THE DEFENSIVE POOLS
================================================================================
The percentiles are computed WITHIN pool, so entanglement cannot show in them and does not:
means are 0.489-0.500 for def_share_pct and 0.501-0.502 for duel_quality_pct across the three.
That is construction working, not evidence.

THE RAW MEDIANS ARE WHERE A POOL DIFFERENCE WOULD LIVE:
  def_share   CB 1.269 | FB 1.249 | CDM 1.226      spread 3.5%
  duel_rate   CB 0.573 | FB 0.554 | CDM 0.511      spread 12.1%

DUEL_RATE IS POSITION-ENTANGLED AND DEF_SHARE IS NOT. A CDM wins duels at 0.511 and a CB at
0.573 , a 6.2-point gap on a measure whose own inter-quartile range is about 9 points. The
per-pool percentile absorbs this correctly TODAY, but it means the raw duel rate is partly
measuring WHERE a player stands rather than how well he does it, and any future use of the raw
number outside its pool would import that.

AND THE TWO FACETS AGREE VERY DIFFERENTLY BY POOL: corr is CB 0.124, FB 0.206, CDM 0.403. On
centre-backs they are close to independent; on CDMs they share about 16% of variance. A single
0.55/0.45 blend is being applied to three pools in which the two ingredients mean measurably
different things relative to each other.

================================================================================
5. WHICH IS CARRYING REAL INFORMATION
================================================================================
BOTH ARE. NEITHER IS NOISE. That is the honest answer and it is not the answer the brief
expected, so it is worth stating plainly before the nuance: the hypothesis that duel_quality is
mostly noise with an opponent-driven denominator IS NOT SUPPORTED. It persists year on year at
0.477, splits half at 0.601, and tracks team strength at 0.111.

BUT THEY ARE NOT EQUAL, AND def_share_pct IS THE STRONGER FACET ON EVERY AXIS MEASURED:
  - discriminates about 2x better in the raw (CV 0.292 vs 0.127)
  - more stable year on year (0.551 vs 0.477) and split-half (0.655 vs 0.601)
  - orthogonal to team strength (0.000 vs 0.111) and to minutes (-0.029 vs 0.127)
  - not position-entangled in the raw (3.5% spread vs 12.1%)

THE CURRENT WEIGHTS ARE ALREADY IN THAT ORDER , 0.55 to the stronger facet, 0.45 to the weaker
, so the blend is not upside down. Whether 0.55/0.45 is the RIGHT split is a different question
and this audit does not answer it: nothing here estimates an optimal weighting, because there
is no external criterion of defensive quality on this platform to optimise against. That is the
same wall the keeper work hit, and it should be said rather than glossed.

TWO THINGS THAT WOULD MATTER MORE THAN REWEIGHTING:
  a) THE COALESCE IS A SILENT DOUBLE-COUNT, AND IT IS SMALL. Where duel_quality_pct is NULL,
     sig becomes 0.55*ds + 0.45*ds = ds exactly. That affects 329 defender cards, 2.1% of the
     pool. Not urgent, but it means 2.1% of defenders are scored by a one-facet sig while the
     platform describes a two-facet one. An explicit null policy would be more honest than a
     COALESCE that silently changes what the measure IS.
  b) THE PER-POOL DISAGREEMENT IS THE REAL FINDING. CB 0.124 against CDM 0.403 means one blend
     is doing different jobs in different pools. If anything here justifies engine work, it is
     that, not the weights.

================================================================================
5b. THE NULL POLICY , SETTLED 2026-09-08. sig RENORMALISES, AND THAT IS CORRECT.
================================================================================
THREE THINGS, PLAINLY, SO NOBODY RE-OPENS THIS:

  1. WHEN duel_quality_pct IS NULL, sig RENORMALISES ONTO THE ONE AVAILABLE FACET.
     0.55*ds + 0.45*COALESCE(dq, ds) collapses to 0.55*ds + 0.45*ds = 1.00*ds exactly.
     Those cards are scored by def_share_pct alone at full weight.

  2. THAT IS CORRECT BEHAVIOUR AND NOT A BUG. It is what you would write deliberately: with
     one facet unmeasured, the honest move is to use the other at full weight rather than to
     score the absence. An earlier note in this session called it a "double-count", and that
     was WRONG , nothing is counted twice, the weight is redistributed. The only real defect
     is that the COALESCE DISGUISES it: a reader of the view sees a two-facet blend, and 329
     cards get a one-facet measure with no marker in the expression.

  3. duel_quality_pct IS NULL IS ALREADY THE MARKER, ON THE MATVIEW, TODAY. No new column is
     needed and no rebuild is needed. Any consumer , the tag engine, the payload, a future
     audit , can already distinguish a one-facet card from a two-facet one with a null test on
     a column that is already there.

THE POPULATION: 329 defender cards, 2.1% of the pool. CB 170, FB 113, CDM 46. All 2015+.
Median 965 minutes, median rt 52.

WHY THE FACET IS MISSING, AND IT IS ALMOST NEVER A REAL ZERO:
     159  duels_total was never recorded (NULL)
     168  duels_total > 0 but under the `duels_total >= 20` gate in the view's duel_rate CASE
       2  genuinely played and won none (duels_total = 0)
  So 327 of 329 are an ABSENCE or a deliberate small-sample gate. Two are a measurement.

--------------------------------------------------------------------------------
OPTION B , NULL THE sig SO THE FLOOR FALLS TO 0 , IS MEASURED AND REJECTED.
--------------------------------------------------------------------------------
RECORDED HERE BECAUSE IT IS THE OBVIOUS "FIX" AND IT IS A DISASTER. It looks principled: if a
facet is unmeasured, do not score it. Measured on the live view's own CTE chain:

     306 of the 329 cards MOVE
     median drop of 27.07 points of b, maximum 44.41
     every affected card sits at rt 38 to 70, BELOW the 80 knee where rt = round(b),
     so the drop is very nearly one-for-one in rt , a card at 52 falls to about 25

IT PUNISHES 327 CARDS FOR A MISSING FIELD. That is the rule this platform states in its own
first principles , NR for missing data, never 0 , and it is the same defect class section E
already records against goals_conceded being zero-filled on outfielders: a not-applicable
sentinel written as data. A defender whose duels were never recorded is not a defender who
lost them.

--------------------------------------------------------------------------------
THE VIEW EDIT IS DEFERRED, DELIBERATELY.
--------------------------------------------------------------------------------
Making the expression explicit , CASE WHEN duel_quality_pct IS NULL THEN def_share_pct ELSE
0.55*ds + 0.45*dq END , is verified IDENTICAL to what ships today on every row (tolerance
1e-12). It changes no score, so it buys clarity and nothing else.
Against that: section C records that CREATE OR REPLACE VIEW has SILENTLY DESTROYED this view's
body before, so the edit needs a captured pg_get_viewdef, a byte-verified read-back, and the
whole capture-before-edit discipline. That is real risk for zero numeric gain.
**IT WAITS FOR A COMMIT THAT CHANGES A NUMBER** , the floor_bound column, the percentile
columns, or whatever else opens the view next. Do it THEN, in the same edit, not on its own.

================================================================================
6. WHAT THIS DOES NOT ESTABLISH
================================================================================
- It does not say either facet is a GOOD measure of defending. It measures internal properties
  , spread, persistence, confounding , not validity. There is no external ground truth here.
- Stability is not ability. A player who plays the same role at the same club will look stable
  whether or not the measure tracks skill; the same-club restriction raises both correlations
  rather than separating them, which is consistent with role persistence as much as with skill.
- 900 minutes is the sample gate used throughout. Below it both facets will be noisier and
  none of these figures describe that population.
- Nothing here re-runs the anchors. Every figure is on the facets themselves, not on rt.
