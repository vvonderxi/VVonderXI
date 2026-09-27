// CPU opponents. One interface: decide(ctx, view, player, legal, rng) -> action.
// They see ONLY viewFor(state, player) plus public history. Swappable for a better AI later.

import { valueOf, fieldFor, ladderFor, CATEGORIES } from '../core.js';
const roleOf = (view, p) => (view.active === p ? 'attack' : 'defence');

const other = p => (p === 'A' ? 'B' : 'A');
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/** Per-deck percentile tables so "worth" is comparable across categories. Call once per deck. */
export function prepareAI(ctx, deckIds) {
  const fields = Object.keys(ctx.cards[deckIds[0]].battle);
  const byField = {};
  for (const f of fields) {
    const vals = deckIds.map(id => ctx.cards[id].battle[f] ?? -1).sort((a, b) => a - b);
    byField[f] = v => { let lo = 0, hi = vals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; } return lo / vals.length; };
  }
  // pct(cat, role)(value) , percentile of a value on the field that category/role reads
  const pct = (cat, role) => byField[fieldFor(cat, role)];
  const roles = ['attack', 'defence'];
  const worth = {};
  for (const id of deckIds) {
    const c = ctx.cards[id]; let s = 0, n = 0;
    for (const cat of ctx.config.categoryPool) for (const r of roles) { s += pct(cat, r)(valueOf(c, cat, r) ?? -1); n++; }
    worth[id] = s / n;
  }
  return { deckIds, pct, worth };
}

// ------------------------------------------------------------------ RANDOM
export const RandomCPU = { name: 'Random', decide: (ctx, view, me, legal, rng) => pick(legal, rng) };

// ------------------------------------------------------------------ GREEDY: always send the best card
export function GreedyCPU(ai) {
  return {
    name: 'Greedy',
    decide(ctx, view, me, legal, rng) {
      if (legal[0].type === 'NAME_CAPTAIN') return best(legal, a => ai.worth[a.cardId]);
      legal = legal.filter(a => a.type !== 'USE_SUB'); // Greedy never uses substitutions
      // Greedy holds its captain back too, and simply never sends it while other cards remain.
      const cap = view.players[me].captain, full = view.players[me].hand;
      const hand = cap != null && full.length > 1 ? full.filter(id => id !== cap) : full;
      if (legal[0].type === 'LOCK_CARD' && hand !== full) legal = legal.filter(a => a.cardId !== cap);
      const t = legal[0].type;
      if (t === 'CHOOSE_CATEGORY' || t === 'USE_TOKEN') {
        const cats = legal.filter(a => a.type === 'CHOOSE_CATEGORY');
        return best(cats, a => Math.max(...hand.map(id => ai.pct(a.category, roleOf(view, me))(valueOf(ctx.cards[id], a.category, roleOf(view, me)) ?? -1))));
      }
      if (t === 'BAN_CATEGORY') return best(legal, a => -Math.max(...hand.map(id => ai.pct(a.category, roleOf(view, me))(valueOf(ctx.cards[id], a.category, roleOf(view, me)) ?? -1))));
      if (t === 'LOCK_CARD') return best(legal, a => valueOf(ctx.cards[a.cardId], view.category, roleOf(view, me)) ?? -1);
      // effects: shed as much as possible, dump the weakest other card
      return best(legal, a => a.effects.filter(e => e.startsWith('DISCARD')).length * 10 + (a.target ? 1 - ai.worth[a.target] : 0) + (a.effects.includes('PRESS') ? 1 : 0));
    },
  };
}

// ------------------------------------------------------------------ TACTICIAN
// Models the opponent's hand from public info, then plays the weakest card that
// probably wins. Params exposed so the sim can search them.
// SUBSTITUTION HEURISTIC , deliberately simple, so every result on the substitution rules is a LOWER
// BOUND on what a thinking player gets from them. At most one sub a round, checked in this order:
//   1. FORCED CHANGE when the rival holds <= forcedAt cards (2) and I am not ahead (I hold >= theirs):
//      disrupt a rival who is about to finish.
//   2. SWAP every eligible card whose worth is below swapBelow (0.35; an average Bench card is ~0.5),
//      weakest first, up to the variant's N. With N = ALL it also fires when my mean worth is below
//      swapMeanBelow (0.40), then swapping every card below 0.5.
//   3. REDRAW the moments when the best one on offer looks poor (the old token rule, rerollBelow).
// The captain is never swapped (the engine excludes it). THE CAPTAIN: name the highest-worth card.
export function TacticianCPU(ai, params = {}) {
  const P = { samples: 24, oppBestProb: 0.6, shedWeight: 1.0, conserve: 1.0, pressValue: 0.7, keepStrong: 0.5, rerollBelow: 0.25,
              useSubs: true, forcedAt: 2, swapBelow: 0.35, swapMeanBelow: 0.40, ...params };
  return {
    name: params.name ?? 'Tactician',
    decide(ctx, view, me, legal, rng) {
      if (legal[0].type === 'NAME_CAPTAIN') return best(legal, a => ai.worth[a.cardId]);
      if (P.useSubs) { const s = chooseSub(ctx, ai, view, me, legal, P); if (s) return s; }
      legal = legal.filter(a => a.type !== 'USE_SUB' || (P.useSubs && a.sub === 'REDRAW'));
      const t = legal[0].type;
      const model = oppModel(ctx, view, me, ai);
      if (t === 'CHOOSE_CATEGORY' || t === 'USE_TOKEN') {
        const cats = legal.filter(a => a.type === 'CHOOSE_CATEGORY');
        const scored = cats.map(a => ({ a, s: bestCardUtility(ctx, ai, view, me, a.category, model, rng, P).u }));
        const top = scored.reduce((x, y) => (y.s > x.s ? y : x));
        const reroll = legal.find(a => a.type === 'USE_TOKEN' || a.type === 'USE_SUB');
        if (reroll && top.s < P.rerollBelow) return reroll;
        return top.a;
      }
      if (t === 'BAN_CATEGORY') {
        return best(legal, a => -bestCardUtility(ctx, ai, view, me, a.category, model, rng, P).u);
      }
      if (t === 'LOCK_CARD') {
        const { id } = bestCardUtility(ctx, ai, view, me, view.category, model, rng, P);
        return legal.find(a => a.cardId === id);
      }
      // effects
      const handAfterBase = view.players[me].hand.slice();
      const played = view.pending.played[me];
      return best(legal, a => {
        let h = handAfterBase.slice(), s = 0;
        for (const e of a.effects) {
          if (e === 'DISCARD_PLAYED') { h = h.filter(x => x !== played); s += P.shedWeight + P.keepStrong * (1 - ai.worth[played]); }
          if (e === 'DISCARD_OTHER') { h = h.filter(x => x !== a.target); s += P.shedWeight + P.keepStrong * (1 - ai.worth[a.target]); }
          if (e === 'PRESS') s += (view.pile > 0 ? P.pressValue : 0);
        }
        if (!a.effects.includes('DISCARD_PLAYED')) s += P.keepStrong * ai.worth[played] * 0.5;
        if (h.length === 0) s += 100; // winning move
        return s;
      });
    },
  };
}

function chooseSub(ctx, ai, view, me, legal, P) {
  const subs = legal.filter(a => a.type === 'USE_SUB');
  if (!subs.length) return null;
  const opp = other(me);
  const myN = view.players[me].hand.length;
  const oppN = typeof view.players[opp].hand === 'number' ? view.players[opp].hand : view.players[opp].hand.length;
  const forced = subs.find(a => a.sub === 'FORCED');
  if (forced && oppN <= P.forcedAt && myN >= oppN) return forced;
  const swaps = subs.filter(a => a.sub === 'SWAP');
  if (swaps.length) {
    const cap = view.players[me].captain;
    const elig = view.players[me].hand.filter(id => id !== cap).sort((a, b) => ai.worth[a] - ai.worth[b]);
    const maxK = Math.max(...swaps.map(a => a.cards.length));
    const mean = elig.reduce((s, id) => s + ai.worth[id], 0) / (elig.length || 1);
    const bar = ctx.config.substitutions?.swapMax === 'ALL' && mean < P.swapMeanBelow ? 0.5 : P.swapBelow;
    const pickIds = new Set(elig.filter(id => ai.worth[id] < bar).slice(0, maxK));
    if (pickIds.size) {
      const hit = swaps.find(a => a.cards.length === pickIds.size && a.cards.every(id => pickIds.has(id)));
      if (hit) return hit;
    }
  }
  return null; // REDRAW is decided with the moment choice, as the old token was
}

function oppModel(ctx, view, me, ai) {
  const opp = other(me);
  const discard = new Set(view.discard);
  const mine = new Set(view.players[me].hand);
  // cards the opponent revealed and still holds. After a sub that moved THEIR squad (their SWAP, my
  // FORCED CHANGE) we cannot know which revealed cards left, so only later reveals count as known.
  const since = (view.subLog ?? []).filter(s => (s.sub === 'SWAP' && s.player === opp) || (s.sub === 'FORCED' && s.player === me))
    .reduce((m, s) => Math.max(m, s.round), 0);
  const known = new Set();
  for (const h of view.history) { if (h.round < since) continue; const id = h.played[opp]; if (!discard.has(id)) known.add(id); }
  // A locked card is face-down on the table, not gone: the opponent chose it from the full hand.
  const oppSize = (typeof view.players[opp].hand === 'number' ? view.players[opp].hand : view.players[opp].hand.length) + (view.players[opp].locked ? 1 : 0);
  const knownArr = [...known].slice(0, oppSize);
  const unknownPool = ai.deckIds.filter(id => !discard.has(id) && !mine.has(id) && !known.has(id));
  return { knownArr, unknownN: oppSize - knownArr.length, unknownPool };
}

function sampleOppHand(model, rng) {
  const h = model.knownArr.slice();
  for (let i = 0; i < model.unknownN; i++) h.push(model.unknownPool[Math.floor(rng() * model.unknownPool.length)]);
  return h;
}

function bestCardUtility(ctx, ai, view, me, cat, model, rng, P) {
  const hand = view.players[me].hand;
  const mins = ladderFor(cat, ctx.config);
  const edge = ctx.config.verdicts.filter(v => v.crowns).reduce((m, v) => Math.min(m, mins[v.id]), Infinity);
  const oppPlays = [];
  for (let s = 0; s < P.samples; s++) {
    const oh = sampleOppHand(model, rng);
    if (!oh.length) { oppPlays.push(-1); continue; }
    const vals = oh.map(id => valueOf(ctx.cards[id], cat, roleOf(view, other(me))) ?? -1);
    oppPlays.push(rng() < P.oppBestProb ? Math.max(...vals) : vals[Math.floor(rng() * vals.length)]);
  }
  // THE CAPTAIN is held back: played only as the last card, or when it is the only card that can win.
  // A captain that wins while others remain cannot leave, so sending it early wastes the round.
  const cap = view.players[me].captain, holdCap = cap != null && hand.length > 1 && hand.includes(cap);
  let bestU = -Infinity, bestId = holdCap ? hand.find(id => id !== cap) : hand[0], bestP = 0, capU = -Infinity, capP = 0;
  for (const id of hand) {
    const v = valueOf(ctx.cards[id], cat, roleOf(view, me)) ?? -1;
    const pWin = oppPlays.filter(o => v - o >= edge).length / oppPlays.length;
    const conserve = hand.length === 1 ? 1 : 1 + P.conserve * (1 - ai.worth[id]);
    const u = pWin * conserve;
    if (holdCap && id === cap) { capU = u; capP = pWin; continue; }
    if (u > bestU) { bestU = u; bestId = id; bestP = pWin; }
  }
  if (holdCap && bestP === 0 && capP > 0) return { id: cap, u: capU };
  return { id: bestId, u: bestU };
}

function best(arr, f) { let b = arr[0], bs = -Infinity; for (const x of arr) { const s = f(x); if (s > bs) { bs = s; b = x; } } return b; }
