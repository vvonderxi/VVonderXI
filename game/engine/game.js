// VVonderXI Card Game , RULES ENGINE
// Pure reducer: (state, action) -> { state, events }.
// State is plain JSON (no class instances, no Three.js objects), so it can be
// stored in Supabase, replayed from an action log, or run server-side later.
// The renderer consumes `events`. It never decides anything.

import { shuffle, roll, compare, classify, CATEGORIES } from './core.js';

const other = p => (p === 'A' ? 'B' : 'A');
const clone = s => structuredClone(s);

/**
 * @param {object} ctx   { cards: Record<id, Card>, config }
 * @param {string[]} deckIds  pool of card ids to build this match from
 * @param {number} seed
 */
export function createGame(ctx, deckIds, seed, firstActive = 'A') {
  const { config } = ctx;
  const need = config.handSize * 2 + config.drawPileSize;
  const pool = config.dealMode === 'TIERED' ? tieredPool(ctx, deckIds, seed, need) : shuffle(deckIds, seed).slice(0, need);
  const state = {
    seed, rng: (seed ^ 0x9e3779b9) >>> 0,
    configVersion: config.version,
    phase: 'CATEGORY', round: 1, active: firstActive,
    players: {
      A: { hand: pool.slice(0, config.handSize), ...playerExtras(config) },
      B: { hand: pool.slice(config.handSize, config.handSize * 2), ...playerExtras(config) },
    },
    pile: pool.slice(config.handSize * 2),
    discard: [],
    categoryOptions: [], category: null, lastCategory: null,
    pending: null, winner: null, endReason: null,
    history: [],
  };
  if (config.substitutions) state.subLog = []; // public: who used which sub, never which cards
  const events = [{ type: 'GAME_START', active: firstActive }];
  if (config.captain) { state.phase = 'CAPTAIN'; events.push({ type: 'CAPTAIN_PROMPT' }); }
  else dealCategories(ctx, state, events);
  return { state, events };
}

// Tokens and substitutions are alternatives: with substitutions on, tokens start at 0 and are never offered.
function playerExtras(config) {
  const s = config.substitutions;
  return {
    tokens: s ? 0 : config.tokensPerPlayer, locked: null,
    ...(s ? { subs: s.perPlayer, lastSubRound: 0 } : {}),
    ...(config.captain ? { captain: null } : {}),
  };
}

/** Who must act next. One definition for the sims, the tests and the UI. */
export function actorFor(state) {
  if (state.phase === 'CAPTAIN') return state.players.A.captain == null ? 'A' : 'B';
  if (state.phase === 'CATEGORY') return state.active;
  if (state.phase === 'BAN') return other(state.active);
  if (state.phase === 'SELECT') return !state.players.A.locked ? 'A' : 'B';
  return state.pending?.winner ?? null;
}

// Each hand gets one card from each dealTier (1..handSize), so neither player starts
// with all the stars. Tiers are assigned by the deck generator, not the engine.
function tieredPool(ctx, deckIds, seed, need) {
  const { handSize } = ctx.config;
  const byTier = {};
  for (const id of shuffle(deckIds, seed)) (byTier[ctx.cards[id].dealTier] ??= []).push(id);
  const K = Math.max(...Object.keys(byTier).map(Number));
  const hands = [[], []];
  for (let t = 0; t < handSize; t++) { const tier = 1 + Math.floor(t * K / handSize); for (const h of hands) h.push(byTier[tier].pop()); }
  const used = new Set(hands.flat());
  const rest = shuffle(deckIds.filter(id => !used.has(id)), seed + 1).slice(0, need - handSize * 2);
  return [...shuffle(hands[0], seed + 2), ...shuffle(hands[1], seed + 3), ...rest];
}

function dealCategories(ctx, state, events) {
  const { config } = ctx;
  let pool = config.categoryPool.slice();
  if (config.noRepeatLastCategory && state.lastCategory) pool = pool.filter(c => c !== state.lastCategory);
  const [r, next] = roll(state.rng); state.rng = next;
  const shuffled = shuffle(pool, Math.floor(r * 2 ** 31));
  if (config.categoryMode === 'OPEN') state.categoryOptions = pool;
  else state.categoryOptions = shuffled.slice(0, config.categoryChoices);
  events.push({ type: 'ROUND_START', round: state.round, active: state.active, hands: handCounts(state) });
  if (config.categoryMode === 'RANDOM') {
    state.category = shuffled[0];
    state.phase = 'SELECT';
    events.push({ type: 'CATEGORY_CHOSEN', category: state.category, by: null });
  } else {
    events.push({ type: 'CATEGORY_OPTIONS', options: state.categoryOptions.slice(), active: state.active });
    if (config.categoryBan && config.categoryMode === 'CHOOSE_FROM_OPTIONS') state.phase = 'BAN';
  }
}

const handCounts = s => ({ A: s.players.A.hand.length, B: s.players.B.hand.length });

// ------------------------------------------------------------------ legality
export function legalActions(ctx, state, player) {
  const me = state.players[player];
  if (state.phase === 'CAPTAIN')
    return me.captain == null && actorFor(state) === player ? me.hand.map(id => ({ type: 'NAME_CAPTAIN', player, cardId: id })) : [];
  if (state.phase === 'BAN' && player !== state.active)
    return [...state.categoryOptions.map(c => ({ type: 'BAN_CATEGORY', player, category: c })), ...subActions(ctx, state, player, false)];
  if (state.phase === 'CATEGORY' && player === state.active) {
    const acts = state.categoryOptions.map(c => ({ type: 'CHOOSE_CATEGORY', player, category: c }));
    if (me.tokens > 0 && ctx.config.enabledTokens.includes('REROLL_CATEGORIES') && !ctx.config.substitutions)
      acts.push({ type: 'USE_TOKEN', player, token: 'REROLL_CATEGORIES' });
    return [...acts, ...subActions(ctx, state, player, true)];
  }
  if (state.phase === 'SELECT' && !me.locked) return me.hand.map(id => ({ type: 'LOCK_CARD', player, cardId: id }));
  if (state.phase === 'EFFECT' && state.pending.winner === player) return effectCombos(ctx, state, player);
  return [];
}

// SUBSTITUTIONS, offered at the start of a round in the player's own decision window (the rival while
// banning, the possessor while choosing), at most one per player per round. Squad size never changes.
function subActions(ctx, state, player, possession) {
  const S = ctx.config.substitutions, me = state.players[player];
  if (!S || me.subs <= 0 || (S.onePerRound && me.lastSubRound === state.round)) return [];
  const acts = [];
  if (S.redraw && possession) acts.push({ type: 'USE_SUB', player, sub: 'REDRAW' });
  const eligible = me.hand.filter(id => id !== me.captain);
  const maxK = Math.min(S.swapMax === 'ALL' ? eligible.length : S.swapMax, eligible.length, state.pile.length);
  for (const cards of subsetsUpTo(eligible, maxK)) acts.push({ type: 'USE_SUB', player, sub: 'SWAP', cards });
  const opp = state.players[other(player)];
  if (S.forcedChange && state.pile.length && opp.hand.some(id => id !== opp.captain) && (!S.forcedNotOnLast || opp.hand.length > 1))
    acts.push({ type: 'USE_SUB', player, sub: 'FORCED' });
  return acts;
}
function subsetsUpTo(arr, k) {
  const out = [];
  const go = (start, cur) => { if (cur.length) out.push(cur.slice()); if (cur.length === k) return;
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); go(i + 1, cur); cur.pop(); } };
  go(0, []);
  return out;
}

function effectCombos(ctx, state, player) {
  const { verdict, played } = state.pending;
  const hand = state.players[player].hand; // played card already back in hand at this point
  // THE CAPTAIN only goes into Legacy last: never an Assist target, and never Into Legacy while others remain.
  const cap = ctx.config.captain ? state.players[player].captain : null;
  const others = hand.filter(id => id !== played[player] && id !== cap);
  const oppN = state.players[other(player)].hand.length;
  // FINAL WHISTLE: your last card only leaves on a big enough verdict, so a finisher must be kept back.
  const finishing = hand.length === 1 && verdict.severity < (ctx.config.finishMinSeverity ?? 0);
  const opts = verdict.availableEffects.filter(e => {
    if (finishing && e === 'DISCARD_PLAYED') return false;
    if (e === 'DISCARD_PLAYED' && cap && played[player] === cap && hand.length > 1) return false;
    if (e === 'DISCARD_OTHER') return others.length > 0;
    // NOT_LEADING: you may only attack the other hand if you hold at least as many cards (catch-up tool, not a finisher)
    if (e === 'PRESS' && ctx.config.pressRule === 'NOT_LEADING') return hand.length >= oppN;
    return true;
  });
  if (!opts.length) return [{ type: 'CHOOSE_EFFECTS', player, effects: [] }];
  const k = Math.min(verdict.picks, opts.length);
  const combos = k === 2 ? pairs(opts) : opts.map(o => [o]);
  const acts = [];
  for (const effects of combos) {
    if (effects.includes('DISCARD_OTHER')) for (const t of others) acts.push({ type: 'CHOOSE_EFFECTS', player, effects, target: t });
    else acts.push({ type: 'CHOOSE_EFFECTS', player, effects });
  }
  return acts;
}
const pairs = a => a.flatMap((x, i) => a.slice(i + 1).map(y => [x, y]));

// ------------------------------------------------------------------ reducer
export function applyAction(ctx, prev, action) {
  const state = clone(prev);
  const events = [];
  const legal = legalActions(ctx, prev, action.player);
  if (!legal.some(a => sameAction(a, action))) throw new Error(`Illegal action in phase ${prev.phase}: ${JSON.stringify(action)}`);

  switch (action.type) {
    case 'USE_TOKEN': {
      state.players[action.player].tokens -= 1;
      events.push({ type: 'TOKEN_USED', player: action.player, token: action.token });
      if (action.token === 'REROLL_CATEGORIES') rerollCategories(ctx, state, events);
      break;
    }
    case 'NAME_CAPTAIN': {
      state.players[action.player].captain = action.cardId;
      events.push({ type: 'CAPTAIN_NAMED', player: action.player }); // which card stays secret
      if (state.players.A.captain != null && state.players.B.captain != null) { state.phase = 'CATEGORY'; dealCategories(ctx, state, events); }
      break;
    }
    case 'USE_SUB': {
      const me = state.players[action.player];
      me.subs -= 1; me.lastSubRound = state.round;
      const count = action.sub === 'SWAP' ? action.cards.length : action.sub === 'FORCED' ? 1 : 0;
      state.subLog.push({ round: state.round, player: action.player, sub: action.sub, count });
      events.push({ type: 'SUB_USED', player: action.player, sub: action.sub, count }); // no card ids: face-down
      if (action.sub === 'REDRAW') rerollCategories(ctx, state, events);
      if (action.sub === 'SWAP') for (const id of action.cards) exchangeWithBench(state, action.player, id);
      if (action.sub === 'FORCED') {
        const opp = other(action.player), o = state.players[opp];
        const elig = o.hand.filter(id => id !== o.captain);
        const [r, next] = roll(state.rng); state.rng = next;
        exchangeWithBench(state, opp, elig[Math.floor(r * elig.length)]);
      }
      break;
    }
    case 'BAN_CATEGORY': {
      state.categoryOptions = state.categoryOptions.filter(c => c !== action.category);
      state.phase = 'CATEGORY';
      events.push({ type: 'CATEGORY_BANNED', category: action.category, by: action.player, options: state.categoryOptions.slice() });
      break;
    }
    case 'CHOOSE_CATEGORY': {
      state.category = action.category;
      state.phase = 'SELECT';
      events.push({ type: 'CATEGORY_CHOSEN', category: action.category, by: action.player });
      break;
    }
    case 'LOCK_CARD': {
      const p = state.players[action.player];
      p.locked = action.cardId;
      p.hand = p.hand.filter(id => id !== action.cardId);
      events.push({ type: 'CARD_LOCKED', player: action.player }); // id withheld: hidden until REVEAL
      if (state.players.A.locked && state.players.B.locked) resolveBattle(ctx, state, events);
      break;
    }
    case 'CHOOSE_EFFECTS': {
      applyEffects(ctx, state, events, action);
      finishRound(ctx, state, events);
      break;
    }
  }
  return { state, events };
}

const sameAction = (a, b) => a.sub === b.sub && JSON.stringify(a.cards ?? null) === JSON.stringify(b.cards ?? null) &&
  a.type === b.type && a.player === b.player && a.category === b.category &&
  a.cardId === b.cardId && a.token === b.token && a.target === b.target &&
  JSON.stringify(a.effects ?? null) === JSON.stringify(b.effects ?? null);

function rerollCategories(ctx, state, events) {
  const exclude = new Set(state.categoryOptions);
  let pool = ctx.config.categoryPool.filter(c => !exclude.has(c));
  if (pool.length < ctx.config.categoryChoices) pool = ctx.config.categoryPool.slice();
  const [r, next] = roll(state.rng); state.rng = next;
  state.categoryOptions = shuffle(pool, Math.floor(r * 2 ** 31)).slice(0, ctx.config.categoryChoices);
  events.push({ type: 'CATEGORY_OPTIONS', options: state.categoryOptions.slice(), active: state.active, reroll: true });
}

// One squad card goes to a random Bench slot and that slot's card comes into the squad, in its place.
function exchangeWithBench(state, player, id) {
  const [r, next] = roll(state.rng); state.rng = next;
  const i = Math.floor(r * state.pile.length);
  const incoming = state.pile[i];
  state.pile[i] = id;
  const hand = state.players[player].hand;
  hand[hand.indexOf(id)] = incoming;
}

function resolveBattle(ctx, state, events) {
  const idA = state.players.A.locked, idB = state.players.B.locked;
  events.push({ type: 'REVEAL', cards: { A: idA, B: idB }, category: state.category });
  const comparison = compare(ctx.cards[idA], ctx.cards[idB], state.category, state.active);
  const verdict = classify(comparison, ctx.config);
  events.push({ type: 'COMPARISON', ...comparison });
  // A verdict that does not crown has no round winner. COMPARISON keeps who was numerically ahead;
  // VERDICT, pending and history say null, so initiative, effects and every stat see a no-decision.
  const roundWinner = verdict.crowns ? comparison.winner : null;
  events.push({ type: 'VERDICT', winner: roundWinner, ...verdict });

  const played = { A: idA, B: idB };
  state.players.A.locked = null; state.players.B.locked = null;
  state.pending = { comparison, verdict, winner: roundWinner, played };

  if (!verdict.crowns) {
    // Stalemate: both cards go home. The margin class, in game form.
    state.players.A.hand.push(idA); state.players.B.hand.push(idB);
    events.push({ type: 'CARD_RETURNED', player: 'A', cardId: idA }, { type: 'CARD_RETURNED', player: 'B', cardId: idB });
    finishRound(ctx, state, events);
    return;
  }
  const w = comparison.winner, l = comparison.loser;
  // winner's card returns to hand for now; effects decide whether it leaves
  state.players[w].hand.push(played[w]);
  const loserCap = ctx.config.captain ? state.players[l].captain : null;
  if (ctx.config.loserCardFate === 'DISCARD' && !(played[l] === loserCap && state.players[l].hand.length > 0)) {
    state.discard.push(played[l]);
    events.push({ type: 'CARD_DISCARDED', player: l, cardId: played[l], reason: 'LOST' });
  } else {
    state.players[l].hand.push(played[l]);
    events.push({ type: 'CARD_RETURNED', player: l, cardId: played[l] });
  }
  for (const b of verdict.bonusEffects) applyOne(ctx, state, events, w, b, null);
  state.phase = 'EFFECT';
  events.push({ type: 'EFFECT_PROMPT', player: w, options: verdict.availableEffects, picks: verdict.picks });

  // Forced single option: resolve without a prompt (UI can still animate the choice).
  const combos = effectCombos(ctx, state, w);
  const distinct = new Set(combos.map(c => c.effects.join('+')));
  if (distinct.size === 1 && !(combos[0].effects ?? []).includes('DISCARD_OTHER')) {
    applyEffects(ctx, state, events, combos[0]);
    finishRound(ctx, state, events);
  }
}

function applyEffects(ctx, state, events, action) {
  const w = action.player;
  events.push({ type: 'EFFECTS_CHOSEN', player: w, effects: action.effects, target: action.target ?? null });
  for (const e of action.effects) applyOne(ctx, state, events, w, e, action.target);
}

function applyOne(ctx, state, events, w, effect, target) {
  const me = state.players[w], opp = state.players[other(w)];
  const played = state.pending.played[w];
  switch (effect) {
    case 'DISCARD_PLAYED':
      me.hand = me.hand.filter(id => id !== played); state.discard.push(played);
      events.push({ type: 'CARD_DISCARDED', player: w, cardId: played, reason: 'WON' }); break;
    case 'DISCARD_OTHER':
      me.hand = me.hand.filter(id => id !== target); state.discard.push(target);
      events.push({ type: 'CARD_DISCARDED', player: w, cardId: target, reason: 'DISCARD_OTHER' }); break;
    case 'PRESS':
      if (state.pile.length && opp.hand.length < ctx.config.maxHandSize) {
        const id = state.pile.shift(); opp.hand.push(id);
        events.push({ type: 'CARD_DRAWN', player: other(w), cardId: id, reason: 'PRESS' });
      } else events.push({ type: 'EFFECT_FIZZLED', effect, reason: state.pile.length ? 'MAX_HAND' : 'PILE_EMPTY' });
      break;
    case 'GAIN_TOKEN':
      if (!ctx.config.substitutions && me.tokens < ctx.config.maxTokens) { me.tokens++; events.push({ type: 'TOKEN_GAINED', player: w }); }
      break;
    default: throw new Error('Unknown effect ' + effect);
  }
}

function finishRound(ctx, state, events) {
  const p = state.pending;
  state.history.push({
    round: state.round, active: state.active, category: state.category, played: p.played,
    diff: p.comparison.difference, verdict: p.verdict.verdictId, winner: p.winner,
    handsAfter: handCounts(state),
  });
  for (const pl of ['A', 'B']) if (state.players[pl].hand.length === 0) {
    state.phase = 'OVER'; state.winner = pl; state.endReason = 'EMPTY_HAND';
    events.push({ type: 'GAME_OVER', winner: pl, reason: 'EMPTY_HAND' }); return;
  }
  if (state.round >= ctx.config.roundCap) {
    const { A, B } = handCounts(state);
    state.phase = 'OVER'; state.winner = A === B ? null : A < B ? 'A' : 'B'; state.endReason = 'ROUND_CAP';
    events.push({ type: 'GAME_OVER', winner: state.winner, reason: 'ROUND_CAP' }); return;
  }
  // initiative
  const prevActive = state.active;
  if (!p.winner) state.active = ctx.config.initiativeOnStalemate === 'KEEP' ? prevActive : other(prevActive);
  else if (ctx.config.initiative === 'WINNER_KEEPS') state.active = p.winner;
  else if (ctx.config.initiative === 'LOSER_GETS') state.active = other(p.winner);
  else state.active = other(prevActive);
  if (state.active !== prevActive) events.push({ type: 'INITIATIVE', active: state.active });

  state.lastCategory = state.category; state.category = null; state.pending = null;
  state.round += 1; state.phase = 'CATEGORY';
  dealCategories(ctx, state, events);
}

// ------------------------------------------------------------------ hidden information
/** What `player` is allowed to see. Multiplayer sends ONLY this to each client. */
export function viewFor(state, player) {
  const opp = other(player);
  const v = clone(state);
  v.players[opp].hand = v.players[opp].hand.length;
  v.players[opp].locked = !!state.players[opp].locked;
  v.pile = state.pile.length;
  if ('captain' in v.players[opp]) delete v.players[opp].captain;
  delete v.rng; delete v.seed;
  return v;
}
