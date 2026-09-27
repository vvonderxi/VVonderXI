// VVonderXI Card Game , BALANCE CONFIG
// Every rule number lives here. The engine reads this object and nothing else.
// Rebalancing = editing this file (or passing overrides to createGame). Never the engine.

/** @typedef {'CHOOSE_FROM_OPTIONS'|'RANDOM'|'OPEN'} CategoryMode */
/** @typedef {'WINNER_KEEPS'|'LOSER_GETS'|'ALTERNATE'} InitiativeRule */

export const DEFAULT_CONFIG = {
  version: 'v1.3.1', // v1.3 + deal 1,2,3,3,4,5 and ladder 2/7/14/26, from the 2026-09-27 v1.3 tuning pass.

  // ---- hands and deck
  handSize: 6,
  dealMode: 'TIERED',      // 'RANDOM' | 'TIERED' (one card per dealTier per hand)
  dealTiers: [1, 2, 3, 3, 4, 5], // tier of each squad slot; the extra 6th card comes from the MIDDLE tier. null = formula
  maxHandSize: 9,          // a draw that would exceed this is skipped
  drawPileSize: 15,        // cards left in the shared pile after the deal (the Bench)
  roundCap: 60,            // safety stop; fewer cards wins, tie = draw

  // ---- categories
  categoryMode: /** @type {CategoryMode} */ ('CHOOSE_FROM_OPTIONS'),
  categoryChoices: 3,
  // Football moments (attacker in possession vs defender). The abstract stat ids still work for experiments.
  categoryPool: ['oneOnOne', 'killerBall', 'breakLines', 'counter', 'bigGame', 'ninety', 'roleDuel'],
  noRepeatLastCategory: true,
  categoryBan: true,        // non-active player bans one of the options first // last round's category is not offered again

  // ---- what happens to the LOSER's played card
  loserCardFate: 'RETURN_TO_HAND', // 'RETURN_TO_HAND' | 'DISCARD' (harsher, faster games)

  // ---- verdict ladder. minDiff is in battle points (0-100 scale).
  // A category can rescale these via its own thresholdScale (VV Score uses real rt points).
  // tagKey links to an existing VERDICT_TAGS key in vv-core, verified 2026-09-27. The four crowning verdicts
  // borrow Compare's rt-gap tags; STALEMATE borrows the margin-gated the_debate ("The Debate Lives On"), because
  // it crowns no one and var_close on Compare does crown. Display names are read from VERDICT_TAGS at runtime;
  // only the key lives here. Thresholds stay game-owned.
  verdicts: [
    { id: 'STALEMATE',  minDiff: 0,  severity: 0, crowns: false, tagKey: 'the_debate', options: [], picks: 0, bonus: [] },
    { id: 'EDGE',       minDiff: 2,  severity: 1, crowns: true,  tagKey: 'photo_finish', options: ['DISCARD_PLAYED'], picks: 1, bonus: [] },
    { id: 'CLEAR',      minDiff: 7,  severity: 2, crowns: true,  tagKey: 'clear_edge', options: ['DISCARD_PLAYED', 'PRESS'], picks: 1, bonus: [] },
    { id: 'DOMINANT',   minDiff: 14, severity: 3, crowns: true,  tagKey: 'bragging_rights', options: ['DISCARD_PLAYED', 'PRESS', 'DISCARD_OTHER'], picks: 1, bonus: [] },
    { id: 'DEMOLITION', minDiff: 26, severity: 4, crowns: true,  tagKey: 'masterclass', options: ['DISCARD_PLAYED', 'PRESS', 'DISCARD_OTHER'], picks: 2, bonus: [] },
  ],

  pressRule: 'NOT_LEADING',
  finishMinSeverity: 0,     // FINAL WHISTLE: last card needs this verdict severity to leave (0 = off, 2 = CLEAR+)     // 'ALWAYS' | 'NOT_LEADING'

  // ---- initiative (who picks the category)
  initiative: /** @type {InitiativeRule} */ ('ALTERNATE'),
  initiativeOnStalemate: 'ALTERNATE', // 'ALTERNATE' | 'KEEP'

  // ---- SUBSTITUTIONS (v1.3): 3 per player, at most one a round, in your own decision window.
  // SWAP any number of squad cards with random Bench cards; REDRAW the moments (possession only);
  // FORCED CHANGE a random rival squad card with the Bench, never on their last card. Squad size never
  // changes. null = the old tactical tokens below (the v1.2 preset).
  substitutions: { perPlayer: 3, swapMax: 'ALL', forcedChange: true, forcedNotOnLast: true, redraw: true, onePerRound: true },

  // THE CAPTAIN (off; kept for playtests): each player secretly names one card at kick-off, and it can
  // only go into Legacy last. Measured 2026-09-27: strong on skill, overlaps with substitutions.
  captain: false,

  // ---- tactical tokens: only used when substitutions is null (v1.2)
  tokensPerPlayer: 2,
  maxTokens: 3,
  enabledTokens: ['REROLL_CATEGORIES'],

  // Per-moment override of CATEGORIES[id].thresholdScale, e.g. { bigGame: 0.25 }. Empty = use the defaults.
  thresholdScales: {},

  // Per-moment explicit ladder, in the moment's own units, replacing the scaled shared ladder:
  // [VAR max, Photo min, Clear min, Brag min, Master min]. Big Game reads rt, so it uses Compare's
  // own gap tags (vv-core.js VERDICT_TAGS 5448-5452): VAR 1, Photo 2-3, Clear 4-6, Brag 7-9,
  // Master 10+. A gap of 0 or 1 is STALEMATE (The Debate Lives On), no decision.
  ladders: { bigGame: [1, 2, 4, 7, 10] },

  // Player-facing names. Engine ids never change; rename freely here.
  labels: {
    hand: 'Squad', pile: 'Bench', discard: 'Legacy', active: 'Possession',
    DISCARD_PLAYED: 'Into Legacy', PRESS: 'High Press', DISCARD_OTHER: 'Assist',
    GAIN_TOKEN: '+1 Tactical Switch', REROLL_CATEGORIES: 'Tactical Switch',
    SUB: 'Substitution', SWAP: 'Substitution', REDRAW: 'Tactical Switch', FORCED: 'Forced Change', captain: 'Captain',
  },
};

// Earlier rule sets as overrides, for playtests and for proving old seeds still reproduce byte-for-byte.
const LADDER_2_9_18_31 = { EDGE: 2, CLEAR: 9, DOMINANT: 18, DEMOLITION: 31 };
const withLadder = (mins, extra = {}) => DEFAULT_CONFIG.verdicts.map(v => ({ ...v, minDiff: mins[v.id] ?? v.minDiff, ...(extra[v.id] ?? {}) }));
/** v1.3: hand 6, formula deal 1,1,2,3,4,5, ladder 2/9/18/31, substitutions. */
export const V1_3 = { version: 'v1.3', dealTiers: null, verdicts: withLadder(LADDER_2_9_18_31) };
/** v1.2-real: hand 5, Bench 30, two tokens, +1 token on DOMINANT, ladder 2/9/18/31. */
export const V1_2 = {
  version: 'v1.2-real', handSize: 5, drawPileSize: 30, substitutions: null, dealTiers: null,
  verdicts: withLadder(LADDER_2_9_18_31, { DOMINANT: { bonus: ['GAIN_TOKEN'] } }),
};

/** Merge overrides (shallow, verdicts replaced wholesale). */
export function makeConfig(overrides = {}) {
  return { ...DEFAULT_CONFIG, ...overrides };
}
