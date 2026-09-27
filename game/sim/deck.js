// Which deck the sims run on. GAME_DECK=synthetic (default) or GAME_DECK=real.
// real = data/game-deck.json from scripts/gen-game-deck.js. The default stays synthetic so every
// existing command reproduces the numbers it produced before this loader existed.

import fs from 'fs';
import { syntheticDeck } from './synthetic-deck.js';

const POSITIONS = new Set(['ST', 'W', 'CAM', 'CM', 'CDM', 'FB', 'CB']);
const BATTLE = ['impact', 'goalThreat', 'creation', 'progression', 'defensive', 'reliability', 'roleMastery'];
const REAL_PATH = new URL('../../data/game-deck.json', import.meta.url);

let cached = null;

export function deckName() {
  const n = (process.env.GAME_DECK ?? 'synthetic').toLowerCase();
  if (n !== 'synthetic' && n !== 'real') throw new Error(`GAME_DECK must be synthetic or real, got "${n}"`);
  return n;
}

/** Returns { name, cards, info }. Validated once per process, then cached. */
export function loadDeckInfo() {
  if (cached) return cached;
  const name = deckName();
  if (name === 'synthetic') {
    const cards = syntheticDeck();
    cached = { name, cards, info: `synthetic deck, ${Object.keys(cards).length} cards` };
    return cached;
  }
  const file = JSON.parse(fs.readFileSync(REAL_PATH, 'utf8'));
  const cards = file.cards, ids = Object.keys(cards ?? {});
  // A stale or hand-edited file must fail here, not quietly skew a sim.
  if (!ids.length || ids.length !== file.meta?.counts?.deck)
    throw new Error(`real deck: ${ids.length} cards against meta.counts.deck ${file.meta?.counts?.deck}`);
  for (const id of ids) {
    const c = cards[id];
    if (!POSITIONS.has(c.position)) throw new Error(`real deck: card ${id} position "${c.position}"`);
    if (!(c.dealTier >= 1 && c.dealTier <= 5)) throw new Error(`real deck: card ${id} dealTier ${c.dealTier}`);
    for (const k of BATTLE) if (typeof c.battle?.[k] !== 'number') throw new Error(`real deck: card ${id} battle.${k} is ${c.battle?.[k]}`);
  }
  cached = { name, cards, info: `real deck, ${ids.length} cards, md5 ${file.meta.cards_md5}, generated ${file.meta.generated_at}` };
  return cached;
}

export const loadDeck = () => loadDeckInfo().cards;
