// SYNTHETIC deck, shaped like VVonderXI data, for balance sims ONLY.
// Replaced by data/game-deck.json from scripts/gen-game-deck.js (real player_card_mv rows).
// Nothing here is a claim about a real player.

import { rngFrom } from '../engine/core.js';

const PROFILES = { // goalThreat, creation, progression, defensive (latent means before percentiling)
  ST:  [85, 55, 45, 20], W: [66, 70, 72, 28], CAM: [60, 85, 66, 30],
  CM:  [40, 64, 70, 55], CDM: [24, 46, 62, 80], FB: [20, 50, 62, 66], CB: [16, 22, 46, 82],
};
const MIX = [['ST', .18], ['W', .18], ['CAM', .10], ['CM', .18], ['CDM', .10], ['FB', .12], ['CB', .14]];

export function syntheticDeck(n = 400, seed = 7) {
  const r = rngFrom(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const pickPos = () => { let u = r(), acc = 0; for (const [p, w] of MIX) { acc += w; if (u <= acc) return p; } return 'CB'; };
  const raw = [];
  for (let i = 0; i < n; i++) {
    const pos = pickPos();
    const rt = Math.min(97, 72 + Math.floor(-Math.log(r() + 1e-9) * 6));
    const q = (rt - 72) / 25;
    const prof = PROFILES[pos];
    const lat = prof.map(m => m + q * 18 + gauss() * 11);
    const reliability = 55 + q * 12 + (pos === 'CB' || pos === 'FB' ? 6 : 0) + gauss() * 15;
    raw.push({ id: `S${String(i).padStart(3, '0')}`, pos, rt, lat, reliability, mastery: q * 60 + gauss() * 14 });
  }
  const pctOf = (vals) => { const s = [...vals].sort((a, b) => a - b); return v => Math.round(99 * s.indexOf(v) / (s.length - 1)); };
  const cols = [0, 1, 2, 3].map(k => pctOf(raw.map(x => x.lat[k])));
  const rel = pctOf(raw.map(x => x.reliability));
  const byPos = {};
  for (const x of raw) (byPos[x.pos] ??= []).push(x.mastery);
  const mast = Object.fromEntries(Object.entries(byPos).map(([p, v]) => [p, pctOf(v)]));
  const cards = {};
  for (const x of raw) {
    cards[x.id] = {
      id: x.id, name: `${x.pos} ${x.id}`, position: x.pos, rt: x.rt,
      battle: {
        impact: x.rt,
        goalThreat: cols[0](x.lat[0]), creation: cols[1](x.lat[1]), progression: cols[2](x.lat[2]), defensive: cols[3](x.lat[3]),
        reliability: rel(x.reliability), roleMastery: mast[x.pos](x.mastery),
      },
    };
  }
  return withDealTiers(cards, 5);
}

/** dealTier 1..k by quintile of mean battle percentile. The real generator does the same. */
export function withDealTiers(cards, k) {
  const ids = Object.keys(cards);
  const cats = Object.keys(cards[ids[0]].battle).filter(c => c !== 'impact');
  const score = id => cats.reduce((s, c) => s + (cards[id].battle[c] ?? 0), 0) + cards[id].rt;
  ids.sort((a, b) => score(b) - score(a));
  ids.forEach((id, i) => { cards[id].dealTier = Math.min(k, 1 + Math.floor(i * k / ids.length)); });
  return cards;
}
