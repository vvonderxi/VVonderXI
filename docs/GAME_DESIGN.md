# VVonderXI Card Game , DESIGN BIBLE v1.3

Companion to `GAME_V1_ARCHITECTURE.md`. That file says how it is built; this one says what it is.
Rules numbers live in `game/engine/config.js` (`v1.3`). If this doc and config disagree, config wins.

**The fantasy:** put legendary football seasons against each other and settle the debate, one moment at a time.
**Working title:** VVonderXI Duels.

---

## 1. THE 30-SECOND PITCH (read this out loud to a new player)

> Get all six of your seasons into your **Legacy** before your rival does.
> Every turn is a **match moment**. Whoever has possession picks it, after the other side strikes one of three off.
> You both play a season face-down. Reveal. **Bigger number wins the moment.**
> Win it, and that season walks into your Legacy. Win it big, and you choose how to hurt them.

Four sentences, no exceptions, no tables. If a rule cannot be taught inside this, it is an advanced rule.

---

## 2. THE RULES

**Setup**
- Each player gets a **Squad** of 6 seasons dealt by strength tier (one from each of the five tiers, plus a second from the top tier), so nobody starts with all the stars.
- The other 15 cards are the **Bench**, face-down.
- Toss for **Possession**. Each player has **3 Substitutions** for the match.

**A turn**
1. **Three moments flip up** (never the one just played).
2. **The defender strikes one off. The attacker picks** from the two left.
3. **Both lock a season face-down.**
4. **Kick-off.** Reveal, duel, verdict.
5. **The winner takes the reward.** The loser's season goes back to their Squad.
6. **Possession switches.**

**Substitutions** (3 per player, at most one a round, used at the start of a round in your own decision:
the defender while striking a moment off, the attacker while picking one). Your Squad never changes size.
- **Substitution:** swap any number of your Squad seasons with random seasons from the Bench, face-down.
- **Tactical Switch** (attacker only): redraw the three moments.
- **Forced Change:** one random season from your rival's Squad goes to the Bench and a random Bench season
  replaces it. **Not allowed when your rival is down to their last season.**

**The verdict** (margin between the two numbers , the same words the Compare page uses)

| Verdict | Margin (six moments) | Margin in Big Game (rt points, Compare's own ranges) | Reward (choose) |
|---|---|---|---|
| **The Debate Lives On , no decision** | 0 to 1 | 0 to 1 | Nothing. Both seasons go home. No round winner. |
| **Photo Finish** | 2+ | 2 to 3 | Into Legacy |
| **A Clear Edge** | 9+ | 4 to 6 | Into Legacy **or** High Press |
| **Bragging Rights Settled** | 18+ | 7 to 9 | Into Legacy, High Press **or** Assist |
| **Masterclass** | 31+ | 10+ | **Any two** of those |

Values as of config `v1.3`; `game/engine/config.js` is the source and wins on any conflict.

- **Into Legacy:** your winning season leaves your Squad for good. One step closer.
- **High Press:** keep your season; your rival brings a card on from the Bench. **Only if you hold at least as many cards as they do** , it is a way back into a game, not a way to finish one.
- **Assist:** your winning season stays, and sends a *different* season from your Squad into Legacy. Keep the hero, clear the passenger.

**Optional playtest rule, off by default , The Captain:** each player secretly names one season at kick-off,
and it can only go into Legacy last. Measured strong on skill, but it overlaps with Substitutions (it cannot
be swapped), so V1 ships without it. `captain: true` in config turns it on.

**Win:** empty Squad. Everyone understands "get rid of your hand" from Uno; the football twist is that getting rid of a card means it earned its place in your Legacy.

---

## 3. THE MOMENTS

The side in possession **attacks**; the other **defends**. Asymmetric moments read a different number for each side, which is how a centre-back becomes the best card in your hand.

| Moment | Attacker uses | Defender uses | What the duel shows |
|---|---|---|---|
| **One on One** | Goal Threat | Defensive Wall | Striker bears down on goal, defender slides in |
| **The Killer Ball** | Creation | Defensive Wall | Playmaker threads it through, defender reads it |
| **Break the Lines** | Progression | Defensive Wall | Carrier drives at the back line, tackle or not |
| **Counter-Attack** | Progression | Progression | Foot race from halfway |
| **Big Game** | Season Impact (VV Score) | Season Impact | Both under the floodlights, auras collide |
| **Full Ninety** | Ever Present | Ever Present | Stadium clock runs 0 to 90, one figure fades |
| **Master of Role** | Role mastery (vs own position) | Role mastery | Each performs their position's signature move |

**Measured (real 400-card deck, v1.3, 1,200 matches, CPU v CPU):** every position wins 39% to 53% of the rounds it is played in. Strikers 53%, wingers 48%, centre-backs 43%, full-backs 39%. No position is dead, but full-backs are the weakest and the spread (14 points) is wider than on the synthetic deck; watch it in playtests.

**Honesty note, same as the VV Index:** Defensive Wall reads the platform's thinnest data. The game is balanced because every number is a percentile within the deck, but game copy must never call a defensive number precise.

---

## 4. HOW A PLAYER THINKS (the design is working if these happen)

- "He's attacking, so I strike off One on One , my defenders are weak this hand."
- "Killer Ball needs my best creator, but I only need to *beat* his defender, not bury him."
- "Masterclass would let me Assist my weakest card into Legacy. Worth sending the star?"
- "I'm behind, so High Press is open to me. He's not allowed to press back."
- "He's down to one card and it's his possession next. Can I strike off the moment he wants?"

---

## 5. CARD ANATOMY (Yu-Gi-Oh structure, VVonderXI skin)

```
┌──────────────────────────────┐   frame colour = public band
│ ★★★★★        GENERATIONAL    │   pips = band level (1 to 5), like level stars
│ ┌──────────────────────────┐ │
│ │                          │ │   art window: silhouette in club colours
│ │      [ silhouette ]      │ │   (headshot is an optional layer, OFF , rights)
│ │                     #10  │ │   squad number, season stamp
│ └──────────────────────────┘ │
│ MESSI                 11/12  │   surname headline, season
│ FWD · Barcelona · La Liga    │   type line
│ ◆ Goal Machine ◆ Playmaker   │   Wonder Tags as the "effect text"
│──────────────────────────────│
│ ATT 97            DEF 41     │   headline pair: best attack stat / Defensive Wall
│ VV 97                        │
└──────────────────────────────┘
```
- **Frame by band:** Generational gold foil with animated sheen; Iconic, World Class, Standout, Accomplished each with a flat frame. Foil is earned, never default.
- **Hover or long-press:** the card tilts and shows all seven moment numbers on a panel.
- **Card back:** charcoal, VV mark, cream rule. Identical for every card (hidden information).
- **Keepers:** not in the deck (Fallback C: no score).

---

## 6. THE SUMMON (the Yu-Gi-Oh moment)

Two speeds from the same event stream. **Cinematic** the first time each moment type is seen, then **fast** by default; hold to replay cinematic.

| t (cinematic) | Beat | What happens | Fast mode |
|---|---|---|---|
| 0.0 | **Lock** | Both cards slam face-down onto the two summoning circles. The circles take the moment's pitch shape (penalty arc for One on One, centre circle for Big Game). | kept |
| 0.4 | **Whistle** | Short whistle. Both cards flip, foil sweep across the face. | kept |
| 0.8 | **Summon** | Light column from each card. The hologram builds **bottom-up** through a rising scan plane, scanlines crawling, particles drawn up into it. The figure lands its summon pose. Name and season banner unfurl. | cut |
| 2.0 | **Standoff** | Camera arcs from table view to side-on broadcast angle. Stat plaques rise: **ATT 91 · vs · DEF 88**, counting up. | plaques only |
| 2.8 | **Duel** | The choreography for (moment, who won, verdict) plays, 2 to 3 s. | cut |
| 5.0 | **Verdict** | The tag stamps across the pitch in the Compare voice: *Photo Finish*. Intensity scales with severity. | kept |
| 6.0 | **Consequence** | Into Legacy: winner hologram bows out, card dissolves into gold particles that stream to your Legacy pedestal, counter ticks 6 → 5. Loser hologram de-rezzes, card slides home. High Press: a card fires from the Bench into the rival's Squad. | kept |
| 7.5 | **Reset** | Camera returns to table view, hands re-fan. | kept |

~7.5 s cinematic, ~2.5 s fast. Over an ~8-round match that is the 5-minute target without the spectacle going stale.

**Severity escalation, premium not tacky:**
| Verdict | Treatment |
|---|---|
| The Debate Lives On | A VAR-screen overlay, freeze, "no decision". Both figures reset. |
| Photo Finish | One pulse. Final frame of the duel in slow motion. |
| A Clear Edge | Rim light flares on the winner, short particle burst. |
| Bragging Rights | Shockwave ring across the pitch, camera push-in, crowd swell. |
| Masterclass | Floodlights surge, 360° camera orbit, loser hologram shatters into shards. Rare by construction (under 1 round in 5), so it stays special. |

Gold (#E8B84B) and pink (#E70443) carry the effects. No rainbow, no lens-flare spam.

---

## 7. THE DUEL CHOREOGRAPHY

The engine never knows animations exist. `render3d/choreo.json` maps each outcome to clips:

| Moment | Attacker wins | Defender wins | No decision |
|---|---|---|---|
| One on One | dribble → shoot → celebrate | sprint → slide_tackle → ball away | shoot → block, both reset |
| Killer Ball | through_pass → receiver ghost runs in | intercept → clear | pass → deflection |
| Break the Lines | dribble past → drive on | standing_tackle → win ball | shoulder duel, stalemate |
| Counter-Attack | race, winner pulls clear | race, winner pulls clear | dead heat |
| Big Game | aura surge, loser dims | aura surge, loser dims | auras lock |
| Full Ninety | clock 0-90, loser kneels | clock 0-90, loser kneels | both finish standing |
| Master of Role | position signature move, spotlight | same | both spotlit |

About 16 clips compose all 21 outcomes. Verdict picks the variant: Masterclass One on One is a nutmeg and a finish; Photo Finish is a goal off the post.

### 7b. EVERY FIGURE MOVES LIKE ITS SEASON

Any card can meet any card: striker vs striker, centre-back vs winger, a striker forced to defend.
Moments never restrict who is played; a striker defending a One on One simply brings his low
Defensive Wall, which is the tactical cost. **The moment decides WHO wins. The card decides HOW it looks.**

The director reads each revealed card's own data and picks the style. The engine still decides nothing visual,
and the renderer still decides nothing about the result.

| Card data | Drives |
|---|---|
| Position pool (ST, W, CAM, CM, CDM, FB, CB) | Base archetype: where the figure stands, how it runs, which clip family it uses |
| Goal Threat | Finish style: tap-in vs driven shot vs top-corner curler |
| Creation | Pass style: simple lay-off vs no-look through ball |
| Progression | Carry: touches per dribble, stepovers, burst speed (playback rate) |
| Defensive Wall | Defending: jockey vs full slide, shoulder strength of the block |
| Ever Present | Stamina read in Full Ninety: who is still upright at 90 |
| VV band | Aura: Generational figures carry a gold trail, lower bands none |
| **Wonder Tags** | **Signature moves.** The tag a card already wears on the site becomes its finisher: Goal Machine = power finish, Playmaker = no-look pass, The Wall = shoulder wall, Iron Man = still sprinting at 90 |

So a winger in Counter-Attack sprints wide with a stepover, a centre-back in the same moment makes the
recovery run, and two strikers in One on One look like two different strikers.

**How this stays buildable:** the deck generator writes a small `anim` profile per card
(`archetype`, `finishStyle`, `passStyle`, `pace`, `flair`, `power`, `signature`). The director combines
(moment, outcome, verdict) with each card's profile. Clips come in about 3 variants per key action,
around 30 in total, and continuous stats become blend weights and playback rate rather than more clips.
The Wonder Tags are the payoff: the platform's own tag engine becomes the game's move list.

---

## 8. BLENDER VS THREE.JS , WHAT GETS BUILT WHERE

**Rights rule behind the whole look:** figures are **stylised, faceless light-figures** in club colours with the shirt number. No likeness, so no image-rights exposure, and it reads as a hologram rather than a failed photo.

**Blender (scripted, headless, in `game/blender/`, so Terminal G can regenerate everything):**
1. **Footballer base mesh:** one stylised athletic figure, ~8k triangles, no facial detail, kit as separate material slots (shirt, shorts, socks, boots). Rigged.
2. **Animation clips (~30: about 16 actions, key ones in ~3 style variants, see 7b):** idle_stance, summon_pose, sprint, dribble, shoot, finesse_shot, through_pass, intercept, slide_tackle, standing_tackle, block, stumble, celebrate_small, celebrate_big, dejected, walk_off. Author in Blender or use a licensed motion library , **check the commercial licence of any library before use.**
3. **Table and arena:** bevelled pitch slab, rim, two summoning pedestals, Legacy pedestals, Bench tray. Baked ambient occlusion.
Export: glTF 2.0 binary, meshopt or Draco compressed, named animation clips, one file per asset.

**Three.js (procedural, no Blender needed):**
- Cards: rounded box, canvas-drawn face texture from design tokens, shared back texture.
- Hologram material: custom shader , fresnel rim in club secondary colour, club primary tint at ~35% opacity, scrolling scanlines, additive blending, `uRevealY` for the bottom-up summon, spawn flicker.
- Summoning circles, light columns, shockwaves: shader planes.
- Particles: one instanced system, pooled, hard cap 2,000.
- Floodlights: sprites plus one baked environment map. **No real-time shadows**; blob shadow decals.

**Budgets (desktop first):** 60 fps, under ~100 draw calls, 1k textures, first load under ~5 MB, figure skinned once and recoloured per club by material uniforms.

---

## 9. ONBOARDING

- **First match is a guided Friendly:** 3 cards each, possession fixed, one moment of each asymmetric kind, verdicts explained as they land.
- Every moment card states its own rule in one line: *"Your Goal Threat vs their Defensive Wall."*
- Advanced rules unlock by being encountered, never by a rules screen: High Press appears the first time you win A Clear Edge while behind.

---

## 10. OPEN DESIGN PROBLEM (do not call the game finished until this is settled)

"How strong a card do I actually need?" is not yet rewarded: bigger verdicts shed more cards, so sending your best is rarely wrong. The current CPU has no lookahead, so this is **unproven, not disproven**.

**Next experiment, cheap to simulate: THE CAPTAIN.** At kick-off each player secretly names one season Captain. The Captain can only go into Legacy **last**; if it wins earlier it stays in the Squad. You must protect your Captain for the final moment, and your rival spends the late game trying to guess who it is. Football-true, one sentence to teach. Run it through the grid before anyone builds UI for it.
