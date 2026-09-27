// VVonderXI Card Game , BALANCE CONFIG
// Every rule number lives here. The engine reads this object and nothing else.
// Rebalancing = editing this file (or passing overrides to createGame). Never the engine.

/** @typedef {'CHOOSE_FROM_OPTIONS'|'RANDOM'|'OPEN'} CategoryMode */
/** @typedef {'WINNER_KEEPS'|'LOSER_GETS'|'ALTERNATE'} InitiativeRule */

export const DEFAULT_CONFIG = {
  version: 'v1.0-sim-C', // set C from the 2026-09-27 sweep, synthetic deck. Re-run on real deck.

  // ---- hands and deck
  handSize: 5,
  dealMode: 'TIERED',      // 'RANDOM' | 'TIERED' (one card per dealTier per hand)
  maxHandSize: 9,          // a draw that would exceed this is skipped
  drawPileSize: 30,        // cards left in the shared pile after the deal
  roundCap: 60,            // safety stop; fewer cards wins, tie = draw

  // ---- categories
  categoryMode: /** @type {CategoryMode} */ ('CHOOSE_FROM_OPTIONS'),
  categoryChoices: 3,
  categoryPool: ['impact', 'goalThreat', 'creation', 'progression', 'defensive', 'reliability', 'roleMastery'],
  noRepeatLastCategory: true,
  categoryBan: true,        // non-active player bans one of the options first // last round's category is not offered again

  // ---- what happens to the LOSER's played card
  loserCardFate: 'RETURN_TO_HAND', // 'RETURN_TO_HAND' | 'DISCARD' (harsher, faster games)

  // ---- verdict ladder. minDiff is in battle points (0-100 scale).
  // A category can rescale these via its own thresholdScale (VV Score uses real rt points).
  // tagKey links to an existing VERDICT_TAGS key in vv-core (the 5 rt-gap ladder tags, verified 2026-09-27).
  // Display names are read from VERDICT_TAGS at runtime; only the key lives here. Thresholds stay game-owned.
  verdicts: [
    { id: 'STALEMATE',  minDiff: 0,  severity: 0, crowns: false, tagKey: 'var_close', options: [], picks: 0, bonus: [] },
    { id: 'EDGE',       minDiff: 3,  severity: 1, crowns: true,  tagKey: 'photo_finish', options: ['DISCARD_PLAYED'], picks: 1, bonus: [] },
    { id: 'CLEAR',      minDiff: 10, severity: 2, crowns: true,  tagKey: 'clear_edge', options: ['DISCARD_PLAYED', 'PRESS'], picks: 1, bonus: [] },
    { id: 'DOMINANT',   minDiff: 20, severity: 3, crowns: true,  tagKey: 'bragging_rights', options: ['DISCARD_PLAYED', 'PRESS', 'DISCARD_OTHER'], picks: 1, bonus: ['GAIN_TOKEN'] },
    { id: 'DEMOLITION', minDiff: 34, severity: 4, crowns: true,  tagKey: 'masterclass', options: ['DISCARD_PLAYED', 'PRESS', 'DISCARD_OTHER'], picks: 2, bonus: [] },
  ],

  pressRule: 'NOT_LEADING',
  finishMinSeverity: 0,     // FINAL WHISTLE: last card needs this verdict severity to leave (0 = off, 2 = CLEAR+)     // 'ALWAYS' | 'NOT_LEADING'

  // ---- initiative (who picks the category)
  initiative: /** @type {InitiativeRule} */ ('ALTERNATE'),
  initiativeOnStalemate: 'ALTERNATE', // 'ALTERNATE' | 'KEEP'

  // ---- tactical tokens
  tokensPerPlayer: 2,
  maxTokens: 3,
  enabledTokens: ['REROLL_CATEGORIES'],
};

/** Merge overrides (shallow, verdicts replaced wholesale). */
export function makeConfig(overrides = {}) {
  return { ...DEFAULT_CONFIG, ...overrides };
}
