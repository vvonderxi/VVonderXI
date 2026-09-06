# VVonderXI — VV-v2 Engine Blueprint
*Design spec for the next-generation VV Score, built on API-Football data + Ian Graham's "How to Win the Premier League." Architecture is LOCKED; only numerical weights wait for the big-five data distributions.*

---

## 0. Guiding identity
- **It's not a FIFA rating — it's a VV Score.** A point of view, openly VVonderXI's own (Graham, P154: "all data-driven models reflect the beliefs and decisions of their creators").
- **Fan-first, scout-deep.** Output (goals/assists) is the melody everyone hears; the deeper metrics are the harmony underneath. The depth rewards the curious, it doesn't gate the casual.
- **Teach by delight, not by essay.** Deeper insight should be discoverable (tap a spoke, read a line), never a lecture.

---

## 1. The honest data ceiling (read first)
- API-Football gives **season AGGREGATE counts**, not event sequences. So VV-v2 is an **aggregate-profile model**, NOT a Possession Value model.
- True Possession Value (Graham P156) needs event data in sequence (StatsBomb/Opta tier) — not purchased. So Graham's **philosophy guides us; his method is out of reach.** Design as if we have PV = the "theorize before you have data" error (P19). We don't pretend.
- What we CAN read per card: goals, assists, shots (total/on), key passes, total passes, pass accuracy, dribbles (attempts/success), tackles, blocks, interceptions, duels (total/won), fouls (drawn/committed), cards, minutes, appearances, rating, position, age.

---

## 2. The five dimensions (= the five radar spokes)
Each spoke is fed by specific fields and weighted PER POSITION.

**1. GOAL THREAT** *(headline weight — fan-first)*
- Fields: goals, assists, shots, shots on target.
- Output stays the loudest signal. But adjust by **finishing quality**: shots→goals conversion is the xG proxy (P27, P137). 15 goals from 40 shots ≠ 15 from 90.

**2. CREATION**
- Fields: key passes, assists, dribbles completed.
- Closest stand-in for progression currency. Weight **key passes > dribbles** (P215: the dribble's value is the pass *after* it, into space). Assists treated as noisy (great key pass + poor finisher = 0 assists).

**3. PROGRESSION / BALL USE** *(de-weighted, context-gated)*
- Fields: pass accuracy, total passes.
- Value is higher up-pitch and central (P178). A CB's 90% = sideways recycling; a CAM's 85% under pressure = gold. Most at risk of becoming a vanity metric — keep small unless position/role implies risk.

**4. DEFENSIVE VALUE**
- Fields: tackles, interceptions, blocks, duels won.
- PV's admitted weak point (P156) — measured here as activity + duel success. Honest limitation: under-credits elite positional defenders who don't need to tackle. Flag in UI, don't hide.

**5. RELIABILITY / AVAILABILITY**
- Fields: minutes, appearances.
- Injury risk is a top cause of failure (P232). Rewards players actually on the pitch; doubles as the sample-size guard.

---

## 3. Five principles that are RULES, not decoration
1. **One currency, normalised to opportunity** (P156, P207). Everything PER-90, never raw. (Messi 0.86 vs Ronaldo 0.83 G/90 — fewer goals, better rate.)
2. **Filter luck from skill — demand sample** (P83, P104, P224 / Poisson "Law of Small Numbers"). = the **300-minute floor**; per-90 banned on tiny samples.
3. **Per-position, per-location weighting** (P178). A tackle (CB) and a key pass (CAM) are each that role's currency. Position-specific weights are the spine.
4. **The model is a set of beliefs** (P154). Weights are explicitly VVonderXI's football opinion = the brand. Own it.
5. **Extreme characteristics > balanced mediocrity** (P85, P202). A spiky radar (one maxed spoke) can beat an even one. Encode a **peak-trait bonus**, not just an average. Visually obvious on the overlay.

---

## 4. Headline-vs-depth balance (product decision — LOCKED)
- **Goals & assists carry strong weight** — fan-facing product, output is the emotional truth. A model that ranks a ball-recycler above Haaland loses users.
- Graham depth does NOT replace output — it **explains and adjusts** it.
- Depth is **progressive disclosure**: casual user sees the big Goal Threat spoke and nods; curious user taps the low Creation spoke and *learns*. Reward engagement, don't gate entry.

---

## 5. Radar / spider overlay (the visual home — planned compare-page feature)
- The 5 dimensions ARE the 5 spokes. Overlay two players → shape tells the story instantly.
- Defender bulges to Defensive Value; playmaker to Creation. Graham's "extreme characteristics" becomes visually literal: spiky = game-changer, small/even = squad filler.
- The model and the visual are ONE design.

---

## 6. "The Principles Behind the VV Score" — website explainer section (planned)
Short, human, fan-language. Pays homage to Graham; teaches the deeper side of football. ~5 punchy principles, one example each:
- **Goals are noisy without context** — a tap-in and a screamer count the same on the scoreline, not here.
- **Per-90 beats raw totals** — Messi scored fewer goals than Ronaldo, in far fewer minutes; per-90, he's ahead.
- **Defenders create value you can't see in a scoreline** — the best defending often means a tackle never needed to happen.
- **A spiky profile can beat a balanced one** — one elite trait (a "game-changer") can be worth more than being decent at everything.
- **It's a point of view, not a FIFA card** — the VV Score is VVonderXI's football opinion, inspired by the data revolution that won Liverpool the league.
Purpose: teaches + builds trust (show the working) + differentiates from FIFA-stat clones. Keep it delightful, not a lecture.

---

## 7. PARKED until big-five data lands (do NOT set early)
- Actual per-position **weights** per spoke.
- Conversion-rate / finishing **baselines**.
- Where **"elite" sits** on each spoke (percentile thresholds, per position, per league).
- These need real distributions from the imported data. Setting them now = the mistake we explicitly avoided. Architecture above needs no data and is final.

---

## 8. Build sequence
1. Finish big-five import (PL→LL→SA→BL→L1).
2. Run **distribution analysis** — real per-position, per-league percentiles from our own data.
3. Design VV-v2 weights against those distributions (Lucas drives football judgment; this doc + book = brief).
4. Build radar overlay on the compare page (5 spokes).
5. Build the "Principles Behind the VV Score" explainer section.
6. Re-bake + deploy.

*Engine stays PARKED until step 3. Source of truth: this blueprint + Lucas's 114 book highlights.*
