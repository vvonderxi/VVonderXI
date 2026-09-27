// Pure, framework-free engine primitives. No DOM, no Three.js, no Supabase.

// ---------------------------------------------------------------- RNG
// Seeded so a match is reproducible from (seed + action log). Required for sims,
// replays, and later a server-authoritative multiplayer match.
export function rngFrom(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Advance a stored rng state deterministically. Returns [value, nextState]. */
export function roll(state) {
  const r = rngFrom(state);
  const v = r();
  return [v, (state + 0x6D2B79F5) >>> 0];
}
export function shuffle(arr, seed) {
  const r = rngFrom(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- CATEGORIES
// A category knows how to read ONE number off a card. How that number was built
// (radarFor, rt, a future honours metric) is the deck generator's business, not ours.
export const CATEGORIES = {
  impact:      { id: 'impact',      label: 'Season Impact',   field: 'impact',      thresholdScale: 0.25, hint: 'VV Score. Position-aware by construction.' },
  goalThreat:  { id: 'goalThreat',  label: 'Goal Threat',     field: 'goalThreat',  thresholdScale: 1 },
  creation:    { id: 'creation',    label: 'Creation',        field: 'creation',    thresholdScale: 1 },
  progression: { id: 'progression', label: 'Progression',     field: 'progression', thresholdScale: 1 },
  defensive:   { id: 'defensive',   label: 'Defensive Wall',  field: 'defensive',   thresholdScale: 1 },
  reliability: { id: 'reliability', label: 'Ever Present',    field: 'reliability', thresholdScale: 1 },
  roleMastery: { id: 'roleMastery', label: 'Master of Role',  field: 'roleMastery', thresholdScale: 1, hint: 'Percentile within own position pool. Where defenders shine.' },
};

export function valueOf(card, categoryId) {
  const c = CATEGORIES[categoryId];
  const v = card.battle[c.field];
  return v == null ? null : v; // null = NR. Never coerce to 0 (platform rule).
}

// ---------------------------------------------------------------- COMPARISON
/**
 * @returns {{category:string, aValue:number|null, bValue:number|null, difference:number,
 *            winner:'A'|'B'|null, loser:'A'|'B'|null}}
 */
export function compare(cardA, cardB, categoryId) {
  const a = valueOf(cardA, categoryId);
  const b = valueOf(cardB, categoryId);
  // NR rule for the game: an NR value loses to any real value; NR vs NR is level.
  // The deck generator should exclude NR cards from categories they cannot contest.
  const av = a == null ? -1 : a;
  const bv = b == null ? -1 : b;
  const difference = Math.abs(av - bv);
  const winner = av === bv ? null : av > bv ? 'A' : 'B';
  return { category: categoryId, aValue: a, bValue: b, difference, winner, loser: winner ? (winner === 'A' ? 'B' : 'A') : null };
}

// ---------------------------------------------------------------- VERDICT
/** Classify a comparison against the config ladder. Renderer receives this as-is. */
export function classify(comparison, config) {
  const scale = CATEGORIES[comparison.category].thresholdScale ?? 1;
  const ladder = [...config.verdicts].sort((x, y) => y.minDiff - x.minDiff);
  let v = ladder.find(t => comparison.difference >= t.minDiff * scale) ?? ladder[ladder.length - 1];
  if (!comparison.winner) v = config.verdicts.find(t => !t.crowns) ?? v;
  return {
    verdictId: v.id,
    verdictTagKey: v.tagKey,
    severity: v.severity,
    crowns: v.crowns && !!comparison.winner,
    availableEffects: v.crowns ? v.options.slice() : [],
    picks: v.crowns ? v.picks : 0,
    bonusEffects: v.crowns ? v.bonus.slice() : [],
  };
}
