# KEEPER SCORING , DESIGN BRIEF

**For Fable. Answer as a design brief, not as code.** Where you disagree with something listed
below as settled, say so and say why; the settled list is what we believe, not what is true.

**This is not the editorial question.** `docs/FABLE_BRIEF.md` covers where AI-generated prose runs
and what it receives. This file is a scoring question: how a goalkeeper gets a number.

---

## CONTEXT

VVonderXI rates individual player-SEASONS, not players and not careers. Nine European leagues
(England, Spain, Italy, Germany, France, Portugal, Netherlands, Belgium, Turkey), 2010 to present,
roughly **57,000 cards**, each scored **0 to 100** on a single figure called rt.

The scale is **output-first and rank-anchored**: band edges are pinned to ranks, so the populations
are structural constants rather than measurements. **12 seasons at 95+, 150 at 90+, 650 at 85+.**
The public ladder is Generational 95+, Iconic 90+, World Class 85+, Standout 80+, with everything
below grouped. The live range is 11 to 97 and 44% of scored cards sit below 50.

Outfield rt is built from attacking output, a bounded defensive contribution, availability, and a
computed league-strength tilt. **Goalkeepers are currently capped at 75** and their number reflects
availability and league strength and nothing about goalkeeping. **4,289 keeper cards exist; 949 of
them sit exactly at 75.**

A save-rate panel now ships on the keeper card: a percentile ladder, a saved-versus-conceded bar,
the recorded figures, and a published limitation. **None of it feeds rt.** That is the gap this
brief is about.

---

## SETTLED, WITH EVIDENCE

**1. The metric is save percentage: `saves / (saves + goals_conceded)`.**
It is the one figure on a keeper's card that is his own work rather than his team's. Shots faced
is derived, not stored, and is shots ON TARGET faced.

**2. It produces a defensible top of the pool.** Across the top 50 seasons by save% there are
**39 distinct keepers**, so it is not one or two names repeating. ter Stegen, Oblak (three
seasons), Buffon, Donnarumma, de Gea and Navas all appear in the top 20.

> **Correction to the brief as commissioned, and it matters for how much weight this carries.**
> **Alisson and Neuer are NOT in the top 20.** The top two are **D. Roef 20/21 at 88.5%** and
> **E. Özbir 22/23 at 83.6%**, neither a marquee name. The 39-distinct-keepers figure is exact.
> **Read this as "the list is not embarrassing" rather than "the list is a who's who"** , a raw
> save rate rewards a quiet season behind a good defence in a weak league, and the top of the
> list shows it. That is an argument for what the open questions are trying to settle, not
> against the metric.

**3. Save percentage is close to independent of workload, so it does not punish a keeper behind a
poor defence.** The conclusion holds on every pool definition tested. **The cited figures do not
reproduce as stated and are corrected here:**

| relationship | as commissioned | measured, gated pool (n=1,920) |
|---|---|---|
| save% against shots faced | -0.118 | **+0.109 raw**, **-0.173 per 90** |
| shots faced against goals conceded | 0.835 | **+0.876** |

> **The -0.118 was a PER-90 measurement, not raw shots faced.** Both signs are available depending
> on which you take, and **that is the point: every value is near zero (|r| <= 0.20 on every pool),
> so save% is essentially independent of workload either way.** By contrast, shots faced against
> goals conceded is **0.876** on the gated pool and rises to **0.947** unfiltered , volume tracks
> the weakness of the side in front of him almost one to one. **Workload measures the team.
> Save rate does not.** Quote the pool with the number, or the sign flips under you.

**4. Penalties saved carries no score weight.** `penalties_missed` is zero for all but 2 of 1,583
keepers, so **penalties FACED is not derivable** and the field is a count with no denominator.
Tested at 10% weight it put **Trapp above Donnarumma** and dropped **ter Stegen, the highest save%
in the pool, to 39th**. It is a stated fact on the card and never a score term.

> Worth knowing: **Trapp is himself 9th by save% (81.7%)**, so he is not a bad keeper being
> promoted. The distortion is one of ORDER , a penalty count reordered the top of a pool it has
> no business ordering.

**5. The gate is 2015 onward, 800 minutes and 60 shots faced.** Saves coverage is 0% for 2010 to
2013 and 4% in 2014, then 84 to 100%. **1,920 of 2,741 keeper cards clear the gate.** The rest get
a named reason: 1,299 pre-2015, 559 under minutes, 317 under shots, 194 with saves or conceded
unrecorded.

**6. There is no shot quality. No xG, no location, no shot type.** Twenty tap-ins and twenty
thirty-yard strikes score identically. Nor is there anything measuring distribution, command of
the area or sweeping. This is published on the card and on both explainer pages as a limitation,
not buried.

---

## OPEN QUESTIONS

**Q1. How does save% become a 0-100 rt that sits credibly beside an outfield score?**
The scale is output-first and rank-anchored. A keeper produces no output in that sense. A raw
percentile of save% within the keeper pool is defensible as a keeper-versus-keeper statement but
says nothing about whether an 85 keeper season is the same achievement as an 85 striker season.
**What is the honest claim a cross-position number is making, and can save% support it?**

**Q2. Should the 75 cap lift, and what replaces it as a ceiling?**
The cap binds on **949 cards sitting exactly at 75**. Lifting it moves those and reshapes the
keeper distribution. It also interacts with a parked repartition: `rel_pct` currently partitions
on the coarse position field, and half of a keeper's rt comes from that single term. **Repartitioning
it onto the fine pool sends 27 coarse-GK cards into a 125-card mixed bucket and modelling showed
nine keepers landing exactly on the cap , the cap absorbing a wrong answer.** So the cap is
currently hiding two different things. **Does it lift before or after the repartition, and if it
lifts, what stops a keeper reaching 95?**

**Q3. How is availability weighted against quality for a keeper?**
Keepers are the most ever-present position in football; a first-choice keeper plays nearly every
minute. Availability therefore discriminates far less among keepers than among outfielders, while
being a larger share of what we can currently measure. **Iron Man is already a documented exception
to our rarity ceiling for exactly this reason** (3.40%, deliberately not tuned down, because a
season-long ever-present is not a rare event). **Does availability earn any weight in a keeper's
score, or is it a fact about the season rather than a measure of the keeper?**

**Q4. What does a Generational keeper season look like, and does the band vocabulary mean the same
thing across positions?**
Generational is 95+ and there are twelve, ever. **Should any of them be a keeper?** If the bands
are rank-anchored globally, admitting keepers changes who occupies the top slots. If keepers are
banded within their own pool, then "Iconic" means two different things on two cards and the
platform is quietly running two vocabularies. **Neither is obviously right. Say which, and say
what the card should print.**

**Q5. Global keeper pool, or per league-season?**
Currently global. The spread across the nine leagues is **2.7 points of save%**, which is small,
and a per-league pool shrinks every comparison set. But a global pool lets a keeper in a weak
league accumulate a high save rate against weaker shots, and the top of the list above suggests
that is happening. **Is 2.7 points small enough to ignore, or is it small because save% is
compressing something real?**

**Q6. Penalties saved as a TAG rather than a score term. What is the honest threshold?**
A tag needs rarity (our ceiling is roughly 2% of cards) and it needs to mean something.

> **Correction: the commissioned figure of 47.9% saved zero does not reproduce.**
> **In the gated pool it is 51.1% (981 of 1,920). At the 900-minute pool it is 53.1%
> (1,152 of 2,169).** Either way, **more than half the pool saved none**, which makes the
> distribution even lumpier than the brief assumed.

With no denominator, a threshold on the raw count rewards whoever happened to face the most.
**Is there an honest tag here at all, or is the right answer that penalties saved stays a printed
figure and never becomes a badge?**

---

## WHAT A GOOD ANSWER LOOKS LIKE

A design brief. Recommendations with the reasoning attached, the trade-off named, and the thing
you would refuse to do. Not code, not a formula handed down without an argument.

**Say where you disagree with the settled list.** Four of its six points were commissioned with
figures, and three of those figures were wrong on checking. The conclusions survived; the
citations did not. **Assume the same could be true of the reasoning.**

Two constraints that are not up for negotiation, because they are what the platform is:

- **NR is never zero.** A missing measurement is shown as missing. A keeper with no recorded saves
  is not a keeper who made none.
- **A measurement boundary is stated as the platform's limit, never as a judgement on the player.**
  The current cap line reads: the VV Score does not yet weigh goalkeeping, so keepers are capped
  at 75. Whatever replaces it has to be sayable in one honest sentence on a card.
