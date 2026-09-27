// Headless CPU-vs-CPU simulation. No Three.js, no DOM. `node game/sim/simulate.js`
import { createGame, applyAction, legalActions, viewFor, actorFor } from '../engine/game.js';
import { makeConfig } from '../engine/config.js';
import { rngFrom } from '../engine/core.js';
import { prepareAI, RandomCPU, GreedyCPU, TacticianCPU } from '../engine/ai/cpu.js';
import { loadDeck } from './deck.js';

const other = p => (p === 'A' ? 'B' : 'A');

export function runMatch(ctx, bots, seed, firstActive) {
  const rng = rngFrom(seed * 7919 + 13);
  let { state } = createGame(ctx, ctx.deckIds, seed, firstActive);
  const start = { A: state.players.A.hand.slice(), B: state.players.B.hand.slice() };
  const m = { draws: 0, discards: 0, maxDeficit: { A: 0, B: 0 }, leaderAfter4: null, tokensUsed: 0, subs: {}, stalled: false };
  let guard = 0;
  while (state.phase !== 'OVER' && guard++ < 2000) {
    const actor = actorFor(state);
    const legal = legalActions(ctx, state, actor);
    const action = bots[actor].decide(ctx, viewFor(state, actor), actor, legal, rng);
    const res = applyAction(ctx, state, action);
    state = res.state;
    for (const e of res.events) {
      if (e.type === 'CARD_DRAWN') m.draws++;
      if (e.type === 'CARD_DISCARDED') m.discards++;
      if (e.type === 'TOKEN_USED') m.tokensUsed++;
      if (e.type === 'SUB_USED') m.subs[e.sub] = (m.subs[e.sub] ?? 0) + 1;
      if (e.type === 'ROUND_START') {
        const h = e.hands;
        m.maxDeficit.A = Math.max(m.maxDeficit.A, h.A - h.B);
        m.maxDeficit.B = Math.max(m.maxDeficit.B, h.B - h.A);
        if (e.round === 5) m.leaderAfter4 = h.A === h.B ? null : h.A < h.B ? 'A' : 'B';
      }
    }
  }
  m.stalled = state.phase !== 'OVER'; // hit the 2000-action guard: a match that never finished
  return { state, start, m };
}

export function simulate({ n = 2000, config = makeConfig(), deck = loadDeck(), botA, botB, seed0 = 1 } = {}) {
  const ctx = { cards: deck, config, deckIds: Object.keys(deck) };
  const ai = prepareAI(ctx, ctx.deckIds);
  const mk = spec => spec === 'random' ? RandomCPU : spec === 'greedy' ? GreedyCPU(ai) : TacticianCPU(ai, spec?.params ?? {});
  const bots = { A: mk(botA), B: mk(botB) };
  const S = { games: 0, wins: { A: 0, B: 0, draw: 0 }, firstActiveWins: 0, rounds: [], verdicts: {}, cats: {}, draws: 0, discards: 0,
    comebacks: 0, comebackEligible: 0, snowball: 0, snowballEligible: 0, activeRoundWins: 0, crownedRounds: 0, strongerHandWins: 0, strongerHandGames: 0,
    elitePlays: 0, eliteWins: 0, capped: 0, tokens: 0, stalled: 0, subs: {}, catCrowned: {}, catActiveWins: {}, catVerdicts: {} };
  for (let i = 0; i < n; i++) {
    const first = i % 2 ? 'B' : 'A';
    const { state, start, m } = runMatch(ctx, bots, seed0 + i, first);
    S.games++;
    const w = state.winner; S.wins[w ?? 'draw']++;
    if (w === first) S.firstActiveWins++;
    if (state.endReason === 'ROUND_CAP') S.capped++;
    if (m.stalled) S.stalled++;
    for (const [k, v] of Object.entries(m.subs)) S.subs[k] = (S.subs[k] ?? 0) + v;
    S.rounds.push(state.history.length); S.draws += m.draws; S.discards += m.discards; S.tokens += m.tokensUsed;
    for (const h of state.history) {
      S.verdicts[h.verdict] = (S.verdicts[h.verdict] ?? 0) + 1;
      S.cats[h.category] = (S.cats[h.category] ?? 0) + 1;
      const cv = (S.catVerdicts[h.category] ??= {}); cv[h.verdict] = (cv[h.verdict] ?? 0) + 1;
      if (h.winner) {
        S.crownedRounds++; S.catCrowned[h.category] = (S.catCrowned[h.category] ?? 0) + 1;
        if (h.winner === h.active) { S.activeRoundWins++; S.catActiveWins[h.category] = (S.catActiveWins[h.category] ?? 0) + 1; }
      }
      for (const p of ['A', 'B']) if (ai.worth[h.played[p]] >= 0.85) { S.elitePlays++; if (h.winner === p) S.eliteWins++; }
    }
    if (w) {
      const loser = other(w);
      if (Math.max(m.maxDeficit.A, m.maxDeficit.B) >= 2) { S.comebackEligible++; if (m.maxDeficit[w] >= 2) S.comebacks++; }
      if (m.leaderAfter4) { S.snowballEligible++; if (m.leaderAfter4 === w) S.snowball++; }
      const q = p => start[p].reduce((s, id) => s + ai.worth[id], 0);
      if (q('A') !== q('B')) { S.strongerHandGames++; if (q(w) > q(loser)) S.strongerHandWins++; }
    }
  }
  const pct = (a, b) => b ? +(100 * a / b).toFixed(1) : null;
  const sorted = S.rounds.slice().sort((a, b) => a - b);
  const totalRounds = S.rounds.reduce((a, b) => a + b, 0);
  return {
    matchup: `${bots.A.name} (A) vs ${bots.B.name} (B)`, games: S.games,
    winRateA: pct(S.wins.A, S.games), winRateB: pct(S.wins.B, S.games), drawRate: pct(S.wins.draw, S.games),
    firstActiveWinRate: pct(S.firstActiveWins, S.games - S.wins.draw),
    roundsMean: +(totalRounds / S.games).toFixed(1), roundsP10: sorted[Math.floor(n * .1)], roundsP50: sorted[Math.floor(n * .5)], roundsP90: sorted[Math.floor(n * .9)],
    estMinutes: +((totalRounds / S.games) * 30 / 60).toFixed(1),
    activePlayerRoundWin: pct(S.activeRoundWins, S.crownedRounds),
    verdictMix: Object.fromEntries(Object.entries(S.verdicts).map(([k, v]) => [k, pct(v, totalRounds)])),
    categoryMix: Object.fromEntries(Object.entries(S.cats).map(([k, v]) => [k, pct(v, totalRounds)])),
    // per category: share of CROWNED rounds won by the player in possession (the attacker, who also chose it)
    verdictMixByCategory: Object.fromEntries(Object.entries(S.catVerdicts).map(([c, vs]) => [c, Object.fromEntries(Object.entries(vs).map(([k, v]) => [k, pct(v, S.cats[c])]))])),
    activeWinByCategory: Object.fromEntries(Object.entries(S.catCrowned).map(([k, v]) => [k, pct(S.catActiveWins[k] ?? 0, v)])),
    drawsPerGame: +(S.draws / S.games).toFixed(2), discardsPerGame: +(S.discards / S.games).toFixed(2), tokensPerGame: +(S.tokens / S.games).toFixed(2),
    comebackRate: pct(S.comebacks, S.comebackEligible), leaderAfter4Wins: pct(S.snowball, S.snowballEligible),
    strongerStartWins: pct(S.strongerHandWins, S.strongerHandGames), eliteCardRoundWin: pct(S.eliteWins, S.elitePlays),
    roundCapHits: pct(S.capped, S.games), stalledRate: pct(S.stalled, S.games),
    subsPerGame: Object.fromEntries(Object.entries(S.subs).map(([k, v]) => [k, +(v / S.games).toFixed(2)])),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = +(process.argv[2] ?? 1000);
  for (const [a, b] of [['tact', 'tact'], ['tact', 'greedy'], ['greedy', 'tact'], ['tact', 'random']]) {
    const spec = x => x === 'tact' ? {} : x;
    console.log(JSON.stringify(simulate({ n, botA: spec(a), botB: spec(b) }), null, 1));
  }
}
