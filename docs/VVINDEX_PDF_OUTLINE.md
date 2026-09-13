# THE VV INDEX PDF , OUTLINE FOR APPROVAL (item 22, 2026-09-13)

**NOT BUILT. This is the page plan and the line, for Lucas to approve or cut before anything is
designed.** Eight pages. Every figure comes from `scripts/figures/index-figures.json` (item 24) or
from a fact recorded in `CLAUDE.md` as structural, and each is tagged below with which.

**THE ONE-LINE RULE THIS WHOLE DOCUMENT OBEYS:**
> **It may say what we measured and what we could not. It may never say how the number is
> arrived at.**

The Playbook is already public and already defines every word. **This is not a longer Playbook.**
It is the VV Index's argument with room to make it: the same class of claim the page makes,
carried further, for someone who asked to see more.

---

## WHAT IT IS FOR, WHICH DECIDES EVERYTHING ELSE

**It is sent in reply to a request, so it is written for ONE reader who already showed interest.**
Not a brochure, not a pitch deck, not a landing page in PDF clothing. That changes the register:
it can be denser than a web page, it can assume they read the site, and it can spend its length on
the two things the site has no room for , **why the limits are limits, and what was decided rather
than discovered.**

**AND IT IS WRITTEN SO THAT BEING FORWARDED DOES NO HARM.** A requested document gets shared. Every
page has to survive landing in front of somebody who did not ask and has no context, which is
another reason nothing extractable goes in it.

---

## THE EIGHT PAGES

### 1 , Cover
The wordmark, one sentence, a date. **The date is load-bearing:** the figures move, so a PDF
without a date is a PDF that cannot be superseded. `Figures as at <generated>` from the JSON.

### 2 , What the VV Index is, in one page
The thing the site never says plainly in one place because it is spread across two pages.
- A score for a **player season**, not a player and not a career. One number, 11 to 97. *(structural)*
- **57,055 seasons, nine leagues, 2010/11 to 2025/26.** *(live: `cards_total`)*
- **53,994 of them carry a score**, and 3,061 do not, because we would rather hold back than
  publish a number we cannot stand behind. *(live: `cards_scored`)*
- The five bands, by name, with what each is meant to mean. **Lifted from the Playbook verbatim,
  not rewritten** , §E records that the two pages' band copy has already diverged and that
  vvindex is the surface making claims. A third wording would be a third thing to keep true.

### 3 , The nine leagues, and what "covered" means
The league plate's content, given room. Per-league counts, all nine, each 2010/11 to 2025/26:
PL 6,590 · LL 7,032 · SA 7,057 · BL 5,900 · L1 6,569 · PRT 6,006 · ERE 5,838 · TR 6,365 ·
BPL 5,698. *(live, re-derivable)*
- **Every league runs the whole way. The detail does not.** Goals, assists and minutes go back to
  2010/11 everywhere; shots, passes, duels and dribbles begin at 2015/16, the Premier League
  partly from 2014/15, Belgium from 2020/21. *(structural)*
- **18,725 seasons, 32.8%, have no detailed record at all.** *(live: `cards_no_detail`)*

### 4 , The five dimensions
What each one is FOR, in football terms. **Percentile within position pool**, so a centre-back and
a striker can both show a full defensive spoke without contradiction. **This page states the
semantics and gives no denominators, no weights and no breakpoints.**
- The NR rule stated as a principle: a dimension with any input missing is Not Recorded, never
  zero. **37% of cards suppress the chart entirely**, and that is the rule working. *(structural)*

### 5 , What it cannot see
The heart of it, and the page that earns the rest. Three limits, each with the reason:
- **Defending.** The game records what a defender does far more faithfully than what he prevents.
  Best defenders score below reputation. **Van Dijk in the low seventies, published with the
  reason.** Uses the item 1c wording, which makes the point without naming a lever.
- **Goalkeeping.** Not weighed. A keeper carries no score at all on this platform, and the card
  says so rather than printing a number that does not mean what it looks like.
- **Positions.** Verified by hand near the top of the ladder, coarser below it. **A high score is a
  claim we have checked; a low one is an estimate.** *(structural, the option-E disclosure)*

### 6 , What it chose
Not limits. Decisions, and the page says so.
- **The scale leans toward attacking output, because that is where the evidence is.**
- **Honours sit beside the number and never inside it.** The "Zero." argument.
- **Cross-league comparability was chosen over per-league fairness**, deliberately, and the cost
  is stated: adding a Belgian midfielder moves a Spanish striker.

### 7 , How much the ground moves
The honesty page, and **the one that carries your ruling on the standard errors.**
- **872 seasons, 1.61% of scored cards, sit within a single point of a band edge.** *(live)*
- **The consequence, not the numbers:** the top band separates cleanly; **the middle bands are
  closer together than their width suggests, and we say so.** No standard errors, no anchors, no
  per-band figures. A reader learns that the ladder is not uniformly precise and cannot reconstruct
  how imprecise.
- One worked example of the record growing: 780 seasons recovered, one card crossed a band.
  *(EVENT , a fixed historical fact, never regenerated)*

### 8 , Get in touch
The item 1a CTA, same words as the page. **No form, no tracking, no QR.** `hello@vvonderxi.com`.

---

## THE LINE, DRAWN EXPLICITLY

**OUT, and each for its own reason rather than one blanket rule:**

| out | why |
|---|---|
| The rank anchors (b95 119.91, b90 98.89, b85 85.59) | these three numbers **are** the scale; they let anyone reproduce band placement |
| The piecewise map and the 95 to 97 compression | the shape of the top of the ladder |
| Term weights, `def_share_pct`, the `def_core` floor, the minutes saturation curve | the formula |
| The keeper branch | it is minutes and league and nothing else; saying so invites the obvious question |
| League weights as a table | computed and endogenous, PL = 1.00. The single most extractable thing we hold |
| **Separability standard errors** | **ruled OUT 2026-09-13. The consequence is published, the instrument is not.** A critic needs the SEs to argue a band is meaningless; a reader needs only to know the middle is softer than it looks |
| Tag thresholds and rarity cut points | a second extractable model |
| Anything about cache, prompts or how the prose is generated | not the subject, and it is a surface nobody asked about |

**IN, and worth saying plainly because it looks like it should be out:** the band POPULATIONS
(12 / 150 / 650 / 138). They are anchor-pinned, so they are guaranteed true and do not drift, and
they are already published on vvindex. **Withholding them would be theatre, not security.**

---

## PRODUCTION

- **ONE-OFF DESIGN THAT READS GENERATED FIGURES.** Not a rebuilt-on-every-change document, which
  is a pipeline nobody needs. The six live figures come from `index-figures.json`; regenerating
  the PDF means re-running the generator and re-exporting.
- **EVERY NUMBER IN IT IS TAGGED live / event / constant in the source**, so whoever refreshes it
  knows which ones to touch. Re-deriving an EVENT figure against today's data silently rewrites
  the past , the generator's header spells this out.
- **HOSTING: none for v1.** `contact.html` is a plain `mailto:hello@vvonderxi.com`, there is no
  form and no endpoint, and the project has **zero Supabase storage buckets**. The request arrives
  as an email and the reply carries the attachment. Sent on request, because **the request is the
  signal** , a linked PDF turns an interested reader into a download and tells us nothing.
- **IF IT IS EVER LINKED, IT GOES IN THE REPO, NOT STORAGE.** It is a static asset on a static
  site, it versions with the code that generated it, and it cannot drift from the page it
  summarises. Adding a bucket means a public-or-signed decision and an RLS decision to serve a
  file whose audience is currently nobody.

**ESTIMATE: one session, most of it writing rather than building.** The generator, which was the
dependency, is done.

## THREE THINGS I WANT DECIDED BEFORE I WRITE IT

1. **Eight pages, or four?** Four would be cover, what it is, what it cannot see, get in touch ,
   tighter and it loses pages 3, 6 and 7. My view is eight: page 7 is the one that earns trust and
   page 6 is the one the site has least room for.
2. **Does it carry the VV Index's voice or a flatter one?** The site's register is confident and
   quite loud. A document that will be forwarded to strangers might want a quieter one. My view is
   keep the voice , it is the product's, and a neutral version reads like everyone else's.
3. **Does it name the nine leagues' per-season counts, or only the totals?** Per-season is more
   useful and it is also a fuller map of coverage than we publish anywhere today.
