# VVonderXI Card Game , V1 Architecture, Rules and First Balance Results

Written 2026-09-27 in the PM chat, from CLAUDE.md, HANDOVER_2026-09-12.md and the card contract.
**Nothing here was read from the live repo.** Section A is a set of claims for Phase 1 to verify,
not a measurement. Where the repo disagrees, the repo wins and this doc changes.

Branch: `game-v1`, cut from `redesign-compare`. The game is NOT on the launch path and must never block it.

---

## A. Current architecture relevant to the game (claims, verify in Phase 1)

| Area | What the docs record | What it means for the game |
|---|---|---|
| Frontend | Static HTML pages. `vv-core.js` loads on 5 shipping pages (`card.html`, `compare.html`, `index.html`, `playbook.html`, `rankings.html`); `vv-marks.js` beside it. **No build step.** Manual `?v=` cache tokens. | No React, so **no React Three Fiber**. Plain ES modules + JSDoc types. `game.html` becomes a new page. |
| Shared logic | `vv-core.js`: `bandFor` (9 internal bands, public ladder of 4 + grouped), `radarFor` (5 axes, percentile within position pool via `RADAR_POOL_REF`), `VERDICT_TAGS` (15: 7 ladder, of which 5 rt-gap and 2 margin-gated; 5 context; 3 age), `verdictShareName()` | Reuse for card display, tier colours, verdict names. **Not** for game thresholds. |
| Data | Supabase matview `player_card_mv` (~76 cols), read with the anon key. `card_id` = player-season key. | Card = `card_id`. No new key. |
| Keepers | Fallback C: no score anywhere, no radar, no verdict when either side is a keeper. | **Keepers excluded from the V1 deck.** Consistent with Compare. |
| Photos | API-Football headshots via `api_player_id`, VV silhouette `onerror` fallback. Square photos, **not cutouts**. | **See Phase 1 decision (c): silhouette-first, headshot layer OFF by default.** CORS verified present, see (d). |
| Serverless | 1 function in `api/` (`api/analyse.js`, counted with `git ls-files 'api/*.js'`), Vercel Pro, Fluid Compute on. | V1 adds **zero** functions. |
| Auth | Not built. Accounts + Locker is a queued stage. | V1 is guest-only vs CPU. |
| Separability | Band SEs ~1 / 2 / 3.7 / 5.7 rt points; the margin class stops Compare crowning what the engine cannot separate. | The game's STALEMATE verdict is the margin class in game form. |

---

## Phase 1 results (2026-09-27)

Verified read-only against the tree at `7e7a35b`.

a) **`vv-core.js` loads on 5 shipping pages:** `card.html`, `compare.html`, `index.html`, `playbook.html`, `rankings.html` (all on token `20260927a`). `game.html` will be the 6th and **must join the cache-token bump**. Find the surfaces by grep, never by this count.

b) **Compare has 5 rt-gap verdict tags plus 2 margin-gated tags** (`the_debate`, `decided_on_record`). The game borrows the 5 gap-tag NAMES one to one: STALEMATE -> `var_close`, EDGE -> `photo_finish`, CLEAR -> `clear_edge`, DOMINANT -> `bragging_rights`, DEMOLITION -> `masterclass`. **[Changed in v1.2-real: STALEMATE -> `the_debate`, see the tuning section. `var_close` crowns a winner on Compare, and a game STALEMATE crowns no one.]** Display names are read from `VERDICT_TAGS` at runtime, never hardcoded. Thresholds stay in game config.

c) **LOCKED: card art is silhouette-first.** The VV silhouette in club colours is the default. The API-Football headshot is an optional layer behind a config flag, **OFF by default**, until image rights are cleared with a lawyer. Holograms are designed around the silhouette.

d) **The headshot host sends `Access-Control-Allow-Origin: *`** (`media.api-sports.io/football/players/<api_player_id>.png`, checked with `curl -sI`), so no proxy is needed if photos are ever enabled.

e) **`radarFor(row)` returns `raw` and `scaled`, 5 axes** (`goalThreat`, `creation`, `progression`, `defensive`, `reliability`). For keepers every axis is null except `reliability`, so keepers stay out of the deck.

---

## B. Game architecture

Strictly one-way. Nothing below a layer can influence the layer above it.

```
data/game-deck.json      (generated snapshot, like RADAR_POOL_REF)
   │  cards: { id, name, position, rt, band, photo, dealTier, battle:{...} }
   ▼
CATEGORY ENGINE          core.js  CATEGORIES + valueOf()         reads one number off a card
   ▼
COMPARISON ENGINE        core.js  compare()  -> ComparisonResult
   ▼
VERDICT ENGINE           core.js  classify() -> VerdictResult     ladder from config
   ▼
RULE / EFFECT ENGINE     game.js  applyAction(), effects          pure reducer
   ▼
GAME STATE               plain JSON, seeded rng, action log      no Three.js objects, ever
   ▼
PRESENTATION EVENTS      [{type:'REVEAL'…}, {type:'VERDICT'…}, {type:'CARD_DISCARDED'…}]
   ▼
RENDERER                 2D prototype first, Three.js later      animates events, decides nothing
```

**The engine is a reducer:** `applyAction(ctx, state, action) -> { state, events }`.
- State is JSON, so it can live in Supabase, replay from `(seed, actions[])`, or run server-side.
- `viewFor(state, player)` is the only thing a client ever sees: opponent hand is a count, their
  locked card is a boolean, the pile is a count. Multiplayer sends ONLY this.
- The renderer queues events and plays them. Skip/fast mode = play the same events faster.

---

## C. Files

```
game.html                         new page (loads vv-core.js , ADD TO THE CACHE-BUMP LIST, it becomes a 6th surface)
game/
  engine/
    config.js                     BALANCE CONFIG , every tunable number (built)
    core.js                       rng, categories, compare, classify (built)
    game.js                       reducer, effects, initiative, viewFor (built)
    ai/cpu.js                     Random / Greedy / Tactician behind one interface (built)
  sim/
    simulate.js  sweep.js  grid.js   headless CPU-vs-CPU harness (built)
    moments.js                    per-moment and per-position read-out (built)
    deck.js                       GAME_DECK=synthetic|real loader, validated (built)
    synthetic-deck.js             stand-in deck, still the default for the sims (built)
    ladder-sweep.js               verdict-ladder sweep (built)
    rules-experiment.js           hand / Bench / substitutions / Captain experiment (built)
    test-engine.js                determinism, conservation, hidden info, legality, subs, Captain (built, passing)
  ui2d/                           Phase 5: DOM prototype, playtest the loop
  render3d/                       Phase 6+: Three.js
    scene.js  table.js  card3d.js  hologram.js  fx.js  director.js (event queue -> animations)
  vendor/three.module.min.js      one pinned version, vendored, not a CDN
data/game-deck.json               generated
scripts/gen-game-deck.js          generator (Phase 4)
docs/GAME_V1_ARCHITECTURE.md      this file
```

---

## D. Data flow

```
player_card_mv (anon key, read-only)
  │  scripts/gen-game-deck.js , run by hand, like gen-radar-ref.js
  │    filter: outfield, 7 named pools, 900+ minutes, rt not null, radarFor non-null on all axes
  │    select: quota per position, best rt first, one card per player (400 cards)
  │    battle.impact       = rt                                   (position-aware by construction)
  │    battle.goalThreat…  = percent_rank of radarFor .raw across the deck
  │    battle.reliability  = percent_rank of minutes within own league-season (all outfield 900+)
  │    battle.roleMastery  = mean of the 4 radarFor .scaled percentiles (not reliability)
  │    dealTier            = quintile of overall strength (withDealTiers, reused)
  ▼
data/game-deck.json  (static, cached, no API call at play time)
  ▼
createGame(ctx, deckIds, seed)  -> state
  ▼
compare -> classify -> effects -> events
  ▼
renderer (2D, then Three.js)
```

**Decision taken , global vs within-pool for the named categories: GLOBAL (deck-wide).** The radar is percentile
*within* pool, where CB and ST both centre near 50 on goalThreat. Used raw in a battle, a good-scoring
centre-back beats an average striker at **Goal Threat**, which a fan reads as wrong and which spends
the platform's credibility. Recommendation: named categories use the **global** percentile; the
position-relative reading gets its own category, **Master of Role**, which is where defenders win
honestly. Season Impact (rt) is already position-aware.

**Phase 4 decisions (2026-09-27), built into `scripts/gen-game-deck.js`:**

1. **Selection is a quota per position, best rt first, not one rt floor.** rt is output-first, so a
   floor at 75 gives 765 ST against 41 CB (42% strikers, 4.8% FB plus CB). Quotas copy the synthetic
   deck's mix so the sims stay comparable: ST 72, W 72, CAM 40, CM 72, CDM 40, FB 48, CB 56 = 400.
2. **One card per player**, his highest-rt season among the pools that still had room.
3. **Ever Present is the percentile of minutes within the card's own league-season.** The pool is
   every outfield card in that league and season with 900+ minutes, not only deck cards (38,784 cards,
   144 league-seasons). `radarFor`'s reliability divides by 38 x 90, which a 34-game league can never
   reach; ranking inside the league-season makes season length cancel.
4. **Master of Role is the mean of the four `radarFor` .scaled percentiles.** `.scaled.reliability`
   is raw availability, not a percentile, so it is left out.

Percentile convention everywhere: fraction strictly below x100, rounded (Postgres `percent_rank`), the
same as `RADAR_POOL_REF`. Nothing is re-implemented: `radarFor`, `getVVTags`, `bandFor`, `bandPublic`,
`fmtSeason` and `vvDisplayName` are called on vv-core, and `dealTier` comes from `withDealTiers`.

**First generation (matview 58,066 rows): the deck is 2015/16 to 2025/26 only.** The radar needs
detailed stats, which do not exist before 2015 (and the Premier League only partly in 2014/15). So 7 of
the 12 seasons at rt 95+ can never enter the deck, including Messi 11/12 (97), the highest card on the
platform. The top of the deck is 95 (Salah 24/25, Haaland 22/23, Messi 17/18, Suárez 15/16).

**DECIDED: V1 is the Modern Era deck, by design.** It holds the seasons with full radar data, about
2015/16 onward. Pre-2015 seasons are a later, separate **Legends** deck with its own moment set.
**Not a defect**, and not to be "fixed" by loosening the radar filter.

**Placeholder club colours on 122 of the 400 deck cards (measured 2026-09-27).** 62 clubs share the
identical palette `#1a1a2e` / `#ffffff` / `#e94560` (Brighton, Nottingham Forest and Brentford among
them); one more pair of clubs shares `#000000` / `#FFFFFF` / `#e94560`. The values come straight from
`primary_colour` / `secondary_colour` / `accent_colour` on `player_card_mv`, so this is a data gap
upstream, not a generator fault. **It blocks decision (c)'s club-coloured silhouette for about 30% of
the deck** and needs real colours in the database (Terminal A's lane) before the silhouette art ships.
Regenerate the deck after that fix.

**Standing hazard, same as `RADAR_POOL_REF`:** `game-deck.json` is a snapshot. Regenerate it after
any matview refresh, re-ingest or position backfill, and only AFTER the refresh (the generator reads
the matview, so running it before encodes the old state).

---

## E. Reused vs new

| Reuse as-is | Reuse the name, not the logic | New, game-only |
|---|---|---|
| `card_id`, `player_card_mv`, anon read path | `VERDICT_TAGS` ladder names for the game verdict classes (via `tagKey`); `var_close` for STALEMATE | Battle categories + thresholds |
| `radarFor` raw + scaled, `bandFor`, band colours, VV marks | Margin class -> STALEMATE | Effects, tokens, initiative |
| Headshot URL + silhouette fallback | | Deal tiers, deck snapshot |
| Design tokens, fonts, cream card | | Engine, sim, renderer |

The Compare ladder fires on rt gap; game categories live on a 0-100 percentile scale. So the game
borrows the **words** and keeps its own **thresholds** in config. Compare stays untouched.
Context tags (AI-picked) and age tags stay exclusive to Compare; the AI verdict prose is not called
by the game (cost, latency, and a battle needs a number, not an essay).

---

## F. Blender vs Three.js

| Asset | Tool | Why |
|---|---|---|
| Card | Three.js | Rounded box + two canvas textures. Card faces drawn with Canvas2D from existing tokens. |
| Pitch table | Three.js first | Plane + stripe shader + vignette. Blender only if the procedural version reads cheap in the demo. |
| Arena / table rim / deck tray | **Blender, optional** | One glTF, Draco, baked AO lightmap, under ~1.5 MB. The only asset worth modelling. |
| Holograms | Three.js | Shader on stacked planes (mask, scanlines, rim glow, additive layers, parallax). No 3D players. |
| Particles, beams, bursts | Three.js | Instanced points, pooled. |
| Floodlights | Three.js | Sprites + one baked env map. No real-time shadows. |

---

## G. V1 rules (v1.3.1, the default since 2026-09-27; `config.js` wins on any conflict)

1. Deal: 6 cards each, **tiered** (tiers 1, 2, 3, 3, 4, 5, so the extra card comes from the middle), 15 on the Bench.
2. Three moments appear (never last round's). **The non-active player bans one; the active player picks from the two left.**
3. **Substitutions, 3 per player, at most one a round, in your own decision window** (non-active while banning,
   active while choosing): SWAP any number of squad cards with random Bench cards; REDRAW the moments
   (active only); FORCED CHANGE one random rival squad card with the Bench, **not on their last card**.
   Squad size never changes. Bragging Rights no longer grants anything extra.
4. Both players secretly lock a card. Reveal.
5. Compare on the moment. Verdict by margin:

| Verdict | Six moments (percentile pts) | Big Game (rt pts, Compare's ranges) | Winner chooses |
|---|---|---|---|
| STALEMATE (`the_debate`) | 0 to 1 | 0 to 1 | nothing, both cards go home, no round winner |
| EDGE | 2+ | 2 to 3 | discard your played card |
| CLEAR | 7+ | 4 to 6 | discard it **or** PRESS |
| DOMINANT | 14+ | 7 to 9 | discard it, PRESS, or discard a different card |
| DEMOLITION | 26+ | 10+ | any two of those |

6. **PRESS** = keep your card, opponent draws one. **Only allowed if you hold at least as many cards as your opponent.**
7. Loser's card returns to hand. Initiative **alternates**.
8. First to zero cards wins.

Earlier rule sets are presets in `config.js`, each proven to reproduce its committed behaviour byte-for-byte
(300 of 300 final states, both decks): `makeConfig(V1_3)` = v1.3 (deal 1,1,2,3,4,5, ladder 2/9/18/31) and
`makeConfig(V1_2)` = v1.2-real (hand 5, Bench 30, 2 tokens, +1 token on DOMINANT). Any override that changes
`handSize` must also name `dealTiers` (or `null` for the formula); a mismatched list is refused, not guessed.

---

## H. Phases

| # | Phase | Status |
|---|---|---|
| 1 | Verify section A against the repo (read-only) | next |
| 2+3 | Architecture + engine + sim harness | **built in chat, ready to commit** |
| 4 | `gen-game-deck.js` -> real `game-deck.json`, re-run the grid on real cards | |
| 5 | 2D DOM prototype, human playtests (is it fun?) | |
| 6 | Three.js table + 3D cards | |
| 7 | Holograms , **demo 3 treatments on 10 real headshots first** | |
| 8 | Verdict effects, first-time vs fast sequence | |
| 9 | Perf + mobile, ISMCTS CPU | |
| later | Accounts, PvP, `games` / `game_players` / `game_actions` / `ratings`, Realtime | |

---

## First balance results (synthetic deck, 1,200 matches per cell, seeded, reproducible)

| Set | Skill (Tact v Greedy) | PRESS-lover v Tact | Rounds | Active wins round | Leader after R4 wins | Comebacks | Better start wins |
|---|---|---|---|---|---|---|---|
| Brief as written (no ban, random deal, loser gets init) | 48 | , | 7.6 | **80** | 77 | 17 | ~65 |
| A ban+tiered, LOSER_GETS, press always | 62.2 | **60.3** | 7.6 | 64.5 | 74.7 | 25.1 | 53 |
| **C ban+tiered, ALTERNATE, press not-leading** | **66.6** | **53.1** | 7.5 | 62.5 | 66.6 | 36.0 | 54.5 |
| D ban+tiered, WINNER_KEEPS, press not-leading | 70.8 | 36.5 | 7.3 | 58.6 | 49.3 | 52.1 | 50 |
| F = C with 6-card hands | 60.2 | 56.3 | 9.6 | 61.6 | 60.8 | 39.4 | 54 |

What the sweep found:
1. **As written, category choice decides 80% of rounds.** The ban step takes it to ~60%.
2. **Unrestricted PRESS is a runaway**: keep the card that just won, bury the opponent. Restricting it to
   "not leading" turns it into a catch-up tool (53% , viable, not dominant).
3. **Random deals made the starting hand decide ~70% of games.** Tiered deals take it to ~54%.
4. WINNER_KEEPS scores highest on skill but the early game stops mattering (leader after R4 wins 49%)
   and PRESS becomes a trap. ALTERNATE is the balance point.
5. **A real bug the sim caught:** a locked card had left the hand, so the second player's CPU modelled a
   4-card opponent. Fixed. Multiplayer UI must show the locked card as on the table, not gone.
6. **OPEN , "how strong a card do I need?" is not yet rewarded.** Holding back stars is neutral to
   negative for this CPU, with or without a FINAL WHISTLE rule (last card needs CLEAR+ to leave,
   `finishMinSeverity`, off by default). The cause is structural: bigger verdicts shed more cards,
   which rewards sending your best. **The CPU has no lookahead, so this is unproven, not disproven.**
   Settle it with an ISMCTS CPU and human playtests before calling the core idea validated.
7. Matches run ~7.5 rounds. At ~30 to 35s a round that is ~4 min, under the 5 to 10 min target.
   6-card hands reach ~5.5 min at some cost to skill. Decide after human playtests.

Every number above is on a synthetic deck and moves when the real one lands. The harness is the
deliverable; these figures are its first run.

## Real-deck balance results (2026-09-27, 1,200 matches per cell, seeded)

Same code, same seeds, deck swapped: `GAME_DECK=real` (400-card Modern Era deck, md5 `efa43134`) against
the synthetic default. Both use the football-moment pool that is now the default, so the synthetic
column here is NOT the table above (that one was run on the abstract stat pool). Run with
`GAME_DECK=real node game/sim/grid.js 1200` and `GAME_DECK=real node game/sim/moments.js 1200`.

**Set C (the V1 rules), synthetic -> real:**

| Measure | Synthetic | Real |
|---|---|---|
| Skill (Tact v Greedy) | 64.0 | 65.4 |
| PRESS-lover v Tact | 53.8 | 51.9 |
| Rounds | 7.4 | **8.1** |
| Attacker wins round | 63.3 | 63.9 |
| Leader after R4 wins | 65.3 | 63.5 |
| Comebacks | 35.4 | 36.9 |
| Better start wins | 56.7 | 57.3 |
| Verdicts EDGE / CLEAR / DOMINANT / DEMOLITION / STALEMATE | 26 / 24 / 24 / 18 / 8 | **33 / 25 / 19 / 12 / 11** |

**Attacker round-win per moment (share of crowned rounds won by the player in possession, who also chose the moment):**

| Deck | One on One | Killer Ball | Break the Lines | Counter | **Big Game** | Full Ninety | Master of Role |
|---|---|---|---|---|---|---|---|
| Synthetic | 63.2 | 63.3 | 60.4 | 63.8 | **65.1** | 62.7 | 64.5 |
| Real | 60.6 | 63.1 | 61.8 | 64.6 | **67.8** | 65.9 | 64.5 |

**Round win rate when played, by position (real):** ST 56, W 53, CAM 47, CM 43, CDM 46, FB 45, CB 47.
Moment mix (real): Full Ninety and Master of Role are chosen least, 11.5% each, against 15 to 16% for the rest.

What moved, and what it means:
1. **The set C conclusion holds.** Every rule set keeps its rank on skill and PRESS; ALTERNATE is still
   the balance point, WINNER_KEEPS still kills the early game (leader after R4 at 50.5).
2. **The real deck is compressed at the top, so verdicts shrink.** Every card is an elite season, so big
   gaps are rarer: DEMOLITION falls from 18% to 12%, EDGE rises to 33%, STALEMATE to 11%. Matches run
   0.7 rounds longer (~4 min at 30s a round). The verdict thresholds were set on the synthetic spread and
   are the first thing to re-tune.
3. **Big Game is the most attacker-favoured moment at 67.8%**, about 4 points above the average. It is
   rt with a 0.25 threshold scale on a deck whose rt runs 72 to 95, and the attacker chose it.
   Not broken; the number to watch.
4. **Full Ninety is barely a contest on this deck.** Ever Present medians are 81 to 91 in every position,
   so the CPU rarely picks it. A deck of elite seasons is a deck of ever-presents.
5. **Position spread is 13 points (ST 56 against CM 43)**, wider than synthetic (44 to 52). Strikers and
   wingers win more rounds than midfielders. A CPU finding, not yet a player one.
6. **Sets A and B produce identical mirror results on both decks** (the Tactician mirror never reaches a
   state where PRESS NOT_LEADING differs from ALWAYS); only the PRESS-lover column separates them.
   Pre-existing, not introduced by the loader.

## Tuning pass v1.2-real (2026-09-27, real deck, 1,200 matches per cell, seeded)

**What changed:**
1. **Full Ninety spreads 0 to 100.** The league-season percentile of minutes (unchanged, it removes the
   34-game-league bias) is re-ranked, unrounded, across the 400 deck cards. Before, every position sat at
   a median of 81 to 91; now the medians run CM 37 to ST 61. Same 400 cards; 114 changed `dealTier`.
   Deck md5 `1c0d4868`.
2. **Shared ladder 2 / 9 / 18 / 31** for the six percentile moments (was 3 / 10 / 20 / 34), picked from a
   540-ladder sweep (`game/sim/ladder-sweep.js`). EDGE cannot sit between 2 and 3: gaps are whole numbers,
   so VAR on those six is about 6% at 2 and 9% at 3, never 7 to 8.
3. **Big Game uses Compare's own rt-gap ranges, not a scale.** `config.ladders.bigGame = [1, 2, 4, 7, 10]`
   (vv-core.js VERDICT_TAGS 5448-5452): Photo 2-3, Clear 4-6, Brag 7-9, Master 10+, and a gap of 0 or 1 is
   STALEMATE. `ladderFor()` in `core.js` serves both `classify` and the CPU's edge estimate.
4. **STALEMATE maps to `the_debate` ("The Debate Lives On").** `var_close` is no longer used by the game.
5. **A verdict that does not crown has no round winner.** VERDICT, pending and history carry `winner: null`;
   COMPARISON keeps who was numerically ahead. `test-engine.js` now asserts it on every round and fails on
   the old engine. Under set C (ALTERNATE) no outcome changes; only the statistics do, because a
   gap-STALEMATE was being counted as a win. Under LOSER_GETS and WINNER_KEEPS it also changes initiative.

**Set C results:**

| | STALEMATE | Photo | Clear | Brag | Master |
|---|---|---|---|---|---|
| Target | 7-8 | 25-28 | 25 | 22 | 17-18 |
| All moments | 7.6 | 30.3 | 24.7 | 20.5 | 16.9 |
| Big Game alone | 21.7 | 34.1 | 23.5 | 11.9 | 8.7 |

Skill (Tact v Greedy) 63.2 (floor 62). PRESS-lover 52.2. Rounds 7.5. Comebacks 37.1. Leader after R4
wins 64.3. Attacker round-win, crowned rounds only: overall 63.9; One on One 64.1, Killer Ball 65.2,
Break the Lines 62.1, Counter 62.7, **Big Game 68.7**, Full Ninety 63.7, Master of Role 62.7.

**What it means:**
1. **Big Game is now a high-variance moment the CPU avoids.** The deck's rt runs only 72 to 95, so 21.7% of
   Big Game rounds end within a point and decide nothing, and Masterclass there is rare (8.7%). The CPU
   picks it 10.3% of the time against 14 to 16% for the rest. When it does decide, the attacker takes it
   68.7%. Compare's ranges were built for any two seasons, not only elite ones; this is the cost of using
   them exactly.
2. **The overall mix is on target within about 2 points**; Photo runs high and Brag low, mostly from Big Game.
3. **Skill fell 2 points** against the same ladder with Big Game at scale 0.20 (65.2 in the sweep). That
   version gave Big Game its own on-target mix (Master 17%) but not Compare's ranges.
4. **Full Ninety is a real contest now**: chosen 16.1% (was 11.5%).


## Rules experiment and v1.3 (2026-09-27, real deck, 1,200 matches per simulation, seeded)

`GAME_DECK=real node game/sim/rules-experiment.js 1200`: 60 rule sets (hand 5 / 6 / 7 x Bench 30 / 15 x
tokens or four substitution variants x Captain off / on), each run as Tactician v Greedy (skill), a
Tactician mirror (match shape) and, where subs exist, **subs value** = Tactician with subs v Tactician
without, same rules. Minutes assume 30 s a round and exclude time spent on subs.

**Read every figure here as a lower bound on the rules and partly a measure of the bots:**
- The substitution heuristic is deliberately simple (`cpu.js`, documented above `TacticianCPU`). Without the
  last-card guard it forces a change on the rival's last card, which after good play is usually their
  weakest, so it helps them; that is why the no-guard variants score lower.
- **Greedy never uses substitutions**, so "skill" mixes thinking with having subs. Subs value isolates the subs.
- **The first Captain run was void.** Both bots named their best card Captain and kept playing it; it won but
  could not leave, so 4 to 13.6% of matches hit the round cap. With captain-aware bots (hold it back unless
  it is the last card or the only one that can win) **no rule set in the experiment leaves a match unfinished.**

**Hand and Bench, v1.2 rules (tokens, no Captain):** hand 5 skill 63.2, 7.5 rounds, comebacks 37.1, leader
after R4 64.3; hand 6: 61.2, 9.4, 40.7, 60.3; hand 7: 61.8, 11.4, 43.8, 56.5. **Bench 30 and 15 are identical
under tokens**: a 15-card Bench never runs out and holds the same first 15 cards. It only matters once SWAP
draws from it.

**Substitutions and the Captain, hand 5, Bench 30:**

| Rule set | Skill | Subs value | Rounds | Comebacks | Lead R4 | SWAP / REDRAW / FORCED per match |
|---|---|---|---|---|---|---|
| tokens (v1.2) | 63.2 | n/a | 7.5 | 37.1 | 64.3 | none |
| tokens + Captain | 70.5 | n/a | 7.8 | 31.5 | 69.8 | none |
| subs N2, guard | 65.8 | 66.8 | 7.7 | 34.9 | 66.3 | 2.07 / 0.49 / 1.60 |
| subs N2, no guard | 61.9 | 63.2 | 7.6 | 33.6 | 68.5 | 2.10 / 0.31 / 2.54 |
| subs ALL, guard | 66.6 | 66.4 | 7.7 | 33.2 | 67.6 | 2.16 / 0.47 / 1.60 |
| subs ALL, no guard | 62.3 | 63.2 | 7.6 | 33.4 | 68.0 | 2.21 / 0.27 / 2.53 |
| subs N2 + Captain | 66.4 | 55.8 | 7.5 | 29.7 | 71.0 | 2.01 / 0.33 / 1.61 |
| subs ALL + Captain | 68.1 | 57.5 | 7.6 | 30.1 | 70.1 | 2.24 / 0.31 / 1.61 |

With a Captain the guard never applies (your last card is always the Captain, which Forced Change cannot
pick), so guard and no-guard are identical and shown once.

**Under the v1.3 rules (subs ALL, guard, no Captain), by hand size:**

| Hand / Bench | Skill | Subs value | Rounds | Min | Comebacks | Lead R4 |
|---|---|---|---|---|---|---|
| 5 / 15 | 65.5 | 69.0 | 7.8 | 3.9 | 34.7 | 66.8 |
| 5 / 30 | 66.6 | 66.4 | 7.7 | 3.8 | 33.2 | 67.6 |
| **6 / 15 (v1.3)** | **66.3** | **67.4** | **9.8** | **4.9** | **39.9** | **59.8** |
| 6 / 30 | 63.9 | 67.0 | 9.8 | 4.9 | 38.6 | 61.1 |
| 7 / 15 | 62.8 | 66.8 | 11.7 | 5.9 | 42.6 | 58.0 |
| 7 / 30 | 63.5 | 65.7 | 11.7 | 5.9 | 42.1 | 58.7 |

**Why v1.3 is hand 6, Bench 15, subs ALL with the guard, Captain off (decided 2026-09-27):** hand 6 is where
comebacks rise and the round-4 leader stops deciding games (59.8) without losing skill; hand 7 adds a little
more comeback for 3.5 points of skill and a minute a match. Substitutions are worth 67% to a thinking player.
The Captain was strong on skill but snowbally at hand 5 and overlaps with substitutions (subs value falls to
56 to 58% with it), so it stays a flag for playtests.

**v1.3 re-run (grid set C and moments, real deck):** skill 66.3, PRESS-lover 56.3, 9.8 rounds (~4.9 min),
comebacks 39.9, leader after R4 59.8, zero unfinished matches.

| Verdict mix | STALEMATE | Photo | Clear | Brag | Master |
|---|---|---|---|---|---|
| Target (set on v1.2) | 7-8 | 25-28 | 25 | 22 | 17-18 |
| v1.3, all moments | 9.7 | **35.4** | 25.0 | **16.8** | **13.1** |
| v1.3, Big Game | 28.7 | 34.8 | 23.2 | 8.9 | 4.5 |

Attacker round-win: One on One 63.3, Killer Ball 67.7, Break the Lines 60.5, Counter 56.5, Big Game 63.7,
Full Ninety 60.5, Master of Role 56.3. Big Game is chosen 9.1%. By position: ST 53, W 48, CAM 44, CM 42,
CDM 44, FB 39, CB 43.

**Open after v1.3, in order:**
1. **The verdict ladder has drifted off target.** 2/9/18/31 was tuned at hand 5 with tokens; with swaps
   clearing weak cards, hands are closer in strength and gaps shrink (Photo 35%, Master 13%). Re-run
   `ladder-sweep.js` on v1.3 before playtests.
2. **PRESS-lover beats the Tactician 56.3%** (52.2 on v1.2): High Press is slightly strong again.
3. **Full-backs win 39% of rounds**, the weakest position, and the spread is 14 points.
4. The grid's F and G sets were changed from "hand 6" to "hand 5" variants, since hand 6 is now the default.

## v1.3.1 tuning pass (2026-09-27, real deck, 1,200 matches per simulation, seeded)

**Deal: the 6th card from the middle tier (1, 2, 3, 3, 4, 5) instead of a second top-tier card (1, 1, 2, 3, 4, 5).**
New flag `dealTiers`. On the v1.3 ladder the middle deal cut PRESS-lover from 56.3 to 52.7 and lifted the two
weakest positions (FB 41 to 44, CB 42 to 48, spread 11 to 8 points), at a cost of 2 comebacks and ~4 points
of round-4 leader.

**Ladder: 2 / 7 / 14 / 26 for the six moments** (was 2/9/18/31), from a 160-ladder sweep on each deal, Big Game
kept on Compare's ranges. EDGE stays at 2: with no-decision rounds carrying no winner, the six moments' real tie
rate is lower than first estimated, so EDGE 2 lands them at 7.3% (on target) and EDGE 1 would drop them to 2.5%.
The overall no-decision share (~9%) is Big Game's, whose 24 to 28% comes from Compare's fixed ranges.

| Verdict mix | No decision | Photo | Clear | Brag | Master |
|---|---|---|---|---|---|
| Target | 7-8 | 25-28 | 25 | 22 | 17-18 |
| v1.3 | 9.7 | 35.4 | 25.0 | 16.8 | 13.1 |
| **v1.3.1, all moments** | **8.9** | **25.8** | **24.3** | **23.0** | **17.9** |
| v1.3.1, six moments | 7.3 | 24.7 | 24.4 | 24.6 | 19.1 |
| v1.3.1, Big Game | 24.4 | 37.0 | 23.7 | 8.7 | 6.1 |

**v1.3.1 re-run (grid set C and moments):** skill 66.5, PRESS-lover 54.3, 9.2 rounds (~4.6 min), comebacks
37.9, **leader after R4 64.7** (v1.3: 59.8), zero unfinished matches. Attacker round-win 58.7 to 65.0 across
the moments (Killer Ball highest, Big Game 60.3). By position: ST 50, W 47, CAM 44, CM 41, CDM 44, FB 43, CB 49.

**Also fixed:** `ladder-sweep.js quantiles` read "no round winner" as an exact tie, which stopped being true
when no-decision rounds lost their winner; it overstated ties (7.8% against a real 2.6%). It now reads the raw
gap of every round. The v1.2 sweep ran before that change and is unaffected.

**Open after v1.3.1:**
1. **The round-4 leader wins 64.7%**, the price of the middle deal plus the steeper ladder. Watch it in playtests.
2. **Big Game still ends in no decision 24% of the time** and is chosen least (9.6%), by design of Compare's ranges.
3. **CM is now the weakest position at 41%**; FB and CB improved.

