// CPU opponents. One interface: decide(ctx, view, player, legal, rng) -> action.
// They see ONLY viewFor(state, player) plus public history. Swappable for a better AI later.

import { valueOf, CATEGORIES } from '../core.js';

const other = p => (p === 'A' ? 'B' : 'A');
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/** Per-deck percentile tables so "worth" is comparable across categories. Call once per deck. */
export function prepareAI(ctx, deckIds) {
  const pct = {};
  for (const cat of ctx.config.categoryPool) {
    const vals = deckIds.map(id => valueOf(ctx.cards[id], cat) ?? -1).sort((a, b) => a - b);
    pct[cat] = v => { let lo = 0, hi = vals.length; while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; } return lo / vals.length; };
  }
  const worth = {};
  for (const id of deckIds) {
    const c = ctx.cards[id];
    worth[id] = ctx.config.categoryPool.reduce((s, cat) => s + pct[cat](valueOf(c, cat) ?? -1), 0) / ctx.config.categoryPool.length;
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
      const hand = view.players[me].hand;
      const t = legal[0].type;
      if (t === 'CHOOSE_CATEGORY' || t === 'USE_TOKEN') {
        const cats = legal.filter(a => a.type === 'CHOOSE_CATEGORY');
        return best(cats, a => Math.max(...hand.map(id => ai.pct[a.category](valueOf(ctx.cards[id], a.category) ?? -1))));
      }
      if (t === 'BAN_CATEGORY') return best(legal, a => -Math.max(...hand.map(id => ai.pct[a.category](valueOf(ctx.cards[id], a.category) ?? -1))));
      if (t === 'LOCK_CARD') return best(legal, a => valueOf(ctx.cards[a.cardId], view.category) ?? -1);
      // effects: shed as much as possible, dump the weakest other card
      return best(legal, a => a.effects.filter(e => e.startsWith('DISCARD')).length * 10 + (a.target ? 1 - ai.worth[a.target] : 0) + (a.effects.includes('PRESS') ? 1 : 0));
    },
  };
}

// ------------------------------------------------------------------ TACTICIAN
// Models the opponent's hand from public info, then plays the weakest card that
// probably wins. Params exposed so the sim can search them.
export function TacticianCPU(ai, params = {}) {
  const P = { samples: 24, oppBestProb: 0.6, shedWeight: 1.0, conserve: 1.0, pressValue: 0.7, keepStrong: 0.5, rerollBelow: 0.25, ...params };
  return {
    name: params.name ?? 'Tactician',
    decide(ctx, view, me, legal, rng) {
      const t = legal[0].type;
      const model = oppModel(ctx, view, me, ai);
      if (t === 'CHOOSE_CATEGORY' || t === 'USE_TOKEN') {
        const cats = legal.filter(a => a.type === 'CHOOSE_CATEGORY');
        const scored = cats.map(a => ({ a, s: bestCardUtility(ctx, ai, view, me, a.category, model, rng, P).u }));
        const top = scored.reduce((x, y) => (y.s > x.s ? y : x));
        const reroll = legal.find(a => a.type === 'USE_TOKEN');
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

function oppModel(ctx, view, me, ai) {
  const opp = other(me);
  const discard = new Set(view.discard);
  const mine = new Set(view.players[me].hand);
  // cards the opponent revealed and still holds
  const known = new Set();
  for (const h of view.history) { const id = h.played[opp]; if (!discard.has(id)) known.add(id); }
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
  const edge = ctx.config.verdicts.filter(v => v.crowns).reduce((m, v) => Math.min(m, v.minDiff), Infinity) * (CATEGORIES[cat].thresholdScale ?? 1);
  const oppPlays = [];
  for (let s = 0; s < P.samples; s++) {
    const oh = sampleOppHand(model, rng);
    if (!oh.length) { oppPlays.push(-1); continue; }
    const vals = oh.map(id => valueOf(ctx.cards[id], cat) ?? -1);
    oppPlays.push(rng() < P.oppBestProb ? Math.max(...vals) : vals[Math.floor(rng() * vals.length)]);
  }
  let bestU = -Infinity, bestId = hand[0];
  for (const id of hand) {
    const v = valueOf(ctx.cards[id], cat) ?? -1;
    const pWin = oppPlays.filter(o => v - o >= edge).length / oppPlays.length;
    const conserve = hand.length === 1 ? 1 : 1 + P.conserve * (1 - ai.worth[id]);
    const u = pWin * conserve;
    if (u > bestU) { bestU = u; bestId = id; }
  }
  return { id: bestId, u: bestU };
}

function best(arr, f) { let b = arr[0], bs = -Infinity; for (const x of arr) { const s = f(x); if (s > bs) { bs = s; b = x; } } return b; }
