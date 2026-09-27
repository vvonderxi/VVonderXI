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

b) **Compare has 5 rt-gap verdict tags plus 2 margin-gated tags** (`the_debate`, `decided_on_record`). The game borrows the 5 gap-tag NAMES one to one: STALEMATE -> `var_close`, EDGE -> `photo_finish`, CLEAR -> `clear_edge`, DOMINANT -> `bragging_rights`, DEMOLITION -> `masterclass`. Display names are read from `VERDICT_TAGS` at runtime, never hardcoded. Thresholds stay in game config.

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
    synthetic-deck.js             stand-in deck until the real one exists (built)
    test-engine.js                determinism, conservation, hidden info, legality (built, passing)
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
  │    filter: outfield only, rt >= DECK_MIN_RT, radarFor non-null on all 5 axes, minutes floor
  │    battle.impact       = rt                                   (position-aware by construction)
  │    battle.goalThreat…  = GLOBAL percentile of radarFor .raw within the deck
  │    battle.roleMastery  = mean of radarFor .scaled (already percentile within pool)
  │    dealTier            = quintile of overall strength
  ▼
data/game-deck.json  (static, cached, no API call at play time)
  ▼
createGame(ctx, deckIds, seed)  -> state
  ▼
compare -> classify -> effects -> events
  ▼
renderer (2D, then Three.js)
```

**Decision to confirm , global vs within-pool for the named categories.** The radar is percentile
*within* pool, where CB and ST both centre near 50 on goalThreat. Used raw in a battle, a good-scoring
centre-back beats an average striker at **Goal Threat**, which a fan reads as wrong and which spends
the platform's credibility. Recommendation: named categories use the **global** percentile; the
position-relative reading gets its own category, **Master of Role**, which is where defenders win
honestly. Season Impact (rt) is already position-aware.

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

## G. V1 rules (set C from the sweep , provisional until re-run on the real deck)

1. Deal: 5 cards each, **tiered** (one card from each strength tier), 30 in the draw pile.
2. Three categories appear (never last round's). **The non-active player bans one; the active player picks from the two left.**
3. Both players secretly lock a card. Reveal.
4. Compare on the category. Verdict by margin:

| Verdict | Margin (percentile pts; Season Impact uses 0.25x in rt) | Winner chooses |
|---|---|---|
| STALEMATE (`var_close`) | 0 to 2 | nothing, both cards go home |
| EDGE | 3+ | discard your played card |
| CLEAR | 10+ | discard it **or** PRESS |
| DOMINANT | 20+ | discard it, PRESS, or discard a different card; +1 token |
| DEMOLITION | 34+ | any two of those |

5. **PRESS** = keep your card, opponent draws one. **Only allowed if you hold at least as many cards as your opponent.**
6. Loser's card returns to hand. Initiative **alternates**. 2 tokens each: reroll the three categories.
7. First to zero cards wins.

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
