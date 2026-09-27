// node game/sim/test-engine.js , invariants the renderer and multiplayer rely on
import assert from 'node:assert/strict';
import { createGame, applyAction, legalActions, viewFor, actorFor } from '../engine/game.js';
import { makeConfig } from '../engine/config.js';
import { rngFrom } from '../engine/core.js';
import { loadDeckInfo } from './deck.js';
import { runMatch } from './simulate.js';
import { prepareAI, TacticianCPU, RandomCPU, GreedyCPU } from '../engine/ai/cpu.js';

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

// ---- SUBSTITUTIONS + CAPTAIN (experiment flags). Driven action by action so every rule is checked
// at the moment it applies, not inferred from the end state.
{
  const cfg = makeConfig({ substitutions: { perPlayer: 3, swapMax: 'ALL', forcedChange: true, forcedNotOnLast: false, redraw: true, onePerRound: true }, captain: true, handSize: 7, drawPileSize: 15 });
  const cx = { cards: deck, config: cfg, deckIds: Object.keys(deck) };
  const aix = prepareAI(cx, cx.deckIds);
  const used = { SWAP: 0, REDRAW: 0, FORCED: 0 };
  let captainBlocks = 0, games = 0;
  const play = (seed, bots) => {
    const rng = rngFrom(seed * 31 + 7);
    let { state } = createGame(cx, cx.deckIds, seed, seed % 2 ? 'A' : 'B');
    const tiers = p => new Set(state.players[p].hand.map(id => deck[id].dealTier)).size;
    assert.equal(tiers('A'), 5, 'tiered deal: a 7-card hand spans all 5 tiers'); assert.equal(tiers('B'), 5);
    const total = cx.config.handSize * 2 + cx.config.drawPileSize;
    for (let guard = 0; state.phase !== 'OVER' && guard < 4000; guard++) {
      const actor = actorFor(state);
      const legal = legalActions(cx, state, actor);
      const action = bots[actor].decide(cx, viewFor(state, actor), actor, legal, rng);
      const before = { A: state.players.A.hand.length, B: state.players.B.hand.length, pile: state.pile.length };
      if (state.phase === 'EFFECT') {
        const cap = state.players[actor].captain, played = state.pending.played[actor];
        const capBlocked = played === cap && state.players[actor].hand.length > 1;
        if (capBlocked) { captainBlocks++; assert.ok(!legal.some(a => a.effects?.includes('DISCARD_PLAYED')), 'captain cannot go Into Legacy while others remain'); }
        assert.ok(!legal.some(a => a.target === cap), 'captain is never an Assist target');
      }
      const res = applyAction(cx, state, action);
      state = res.state;
      if (action.type === 'USE_SUB') {
        used[action.sub]++;
        assert.deepEqual({ A: state.players.A.hand.length, B: state.players.B.hand.length, pile: state.pile.length }, before, 'a sub never changes squad or Bench size');
      }
      for (const p of ['A', 'B']) assert.ok(state.players[p].subs >= 0 && cx.config.substitutions.perPlayer - state.players[p].subs === state.subLog.filter(s => s.player === p).length, 'subs spent match the log, never more than 3');
      for (const e of res.events) if (e.type === 'CARD_DISCARDED' && e.cardId === state.players[e.player].captain)
        assert.equal(state.players[e.player].hand.length, 0, 'captain only leaves last');
      const all = [...state.players.A.hand, ...state.players.B.hand, ...state.pile, ...state.discard,
                   ...['A', 'B'].map(p => state.players[p].locked).filter(Boolean)];
      assert.equal(all.length, total, 'conservation with subs: no card lost'); assert.equal(new Set(all).size, total, 'no card duplicated');
    }
    assert.equal(state.phase, 'OVER', 'match finished');
    const v = viewFor(state, 'A'); assert.ok(!('captain' in v.players.B), "rival's captain is hidden");
    games++;
    return state;
  };
  for (let seed = 1; seed <= 150; seed++) {
    const bots = { A: TacticianCPU(aix), B: seed % 2 ? RandomCPU : GreedyCPU(aix) };
    assert.deepEqual(play(seed, bots), play(seed, bots), 'determinism with subs and captain');
  }
  for (const k of Object.keys(used)) assert.ok(used[k] > 0, `control: sub ${k} was never used, so its rules were never exercised`);
  assert.ok(captainBlocks > 0, 'control: the captain rule never had to block anything');
  console.log(`ok , subs + captain: ${games / 2} seeds played twice (hand 7, Bench 15), determinism, conservation, squad size, sub count, captain rules held; used SWAP ${used.SWAP} REDRAW ${used.REDRAW} FORCED ${used.FORCED}, captain blocked ${captainBlocks} times`);
}

