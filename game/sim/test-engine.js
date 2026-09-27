// node game/sim/test-engine.js , invariants the renderer and multiplayer rely on
import assert from 'node:assert/strict';
import { createGame, applyAction, legalActions, viewFor } from '../engine/game.js';
import { makeConfig } from '../engine/config.js';
import { rngFrom } from '../engine/core.js';
import { loadDeckInfo } from './deck.js';
import { runMatch } from './simulate.js';
import { prepareAI, TacticianCPU, RandomCPU } from '../engine/ai/cpu.js';

const { cards: deck, info } = loadDeckInfo();
console.log(info);
const ctx = { cards: deck, config: makeConfig(), deckIds: Object.keys(deck) };
const ai = prepareAI(ctx, ctx.deckIds);
let n = 0, gapStalemates = 0;
for (let seed = 1; seed <= 300; seed++) {
  const bots = { A: seed % 2 ? TacticianCPU(ai) : RandomCPU, B: RandomCPU };
  const r1 = runMatch(ctx, bots, seed, 'A'), r2 = runMatch(ctx, bots, seed, 'A');
  assert.deepEqual(r1.state, r2.state, 'determinism: same seed + bots must replay identically');
  const s = r1.state;
  const all = [...s.players.A.hand, ...s.players.B.hand, ...s.pile, ...s.discard];
  assert.equal(new Set(all).size, all.length, 'conservation: no card duplicated');
  assert.equal(all.length, ctx.config.handSize * 2 + ctx.config.drawPileSize, 'conservation: no card lost');
  assert.ok(s.phase === 'OVER');
  if (s.endReason === 'EMPTY_HAND') assert.equal(s.players[s.winner].hand.length, 0);
  // a round has a winner exactly when its verdict crowns; a STALEMATE with a real gap still has none
  for (const h of s.history) {
    assert.equal(h.winner === null, h.verdict === 'STALEMATE', `round winner must be null exactly on STALEMATE (seed ${seed})`);
    if (h.verdict === 'STALEMATE' && h.diff > 0) gapStalemates++;
  }
  n++;
}
// hidden information: opponent hand and locked card never leak through viewFor
let { state } = createGame(ctx, ctx.deckIds, 42, 'A');
const v = viewFor(state, 'A');
assert.equal(typeof v.players.B.hand, 'number'); assert.equal(typeof v.pile, 'number'); assert.ok(!('rng' in v));
// illegal action rejected
assert.throws(() => applyAction(ctx, state, { type: 'LOCK_CARD', player: 'A', cardId: state.players.B.hand[0] }));
assert.ok(gapStalemates > 0, 'control: no STALEMATE with a non-zero gap occurred, so the winner rule was never exercised');
console.log(`ok , ${n} matches replayed deterministically, card conservation held, hidden info redacted, illegal action rejected, no-decision rounds carry no winner (${gapStalemates} with a gap)`);
