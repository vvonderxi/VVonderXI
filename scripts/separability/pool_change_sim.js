/*  POOL-CHANGE DRY RUN , what a position reclassification does to every score, offline.
 *
 *  WHY THIS EXISTS. A position write moves cards between pools, and the engine computes
 *  percentiles WITHIN a pool (`pos_pct`, `posvol_pct`, the def_share rank, and the FLOOR
 *  branches). So reclassifying N cards does not move N scores , it re-percentiles everyone
 *  left in both pools. SS C's rule is that a target-only snapshot cannot see a ripple, and
 *  until now the only way to see one was to write to the database and refresh the matview.
 *
 *  This runs the checked-in engine re-transcription twice , once on the stored pools, once
 *  on the proposed ones , and diffs every card. Nothing is written anywhere.
 *
 *  BOTH SIDES USE THE REIMPLEMENTATION, never stored rt, so its 0.44% transcription error
 *  cancels instead of being reported as movement.
 *
 *  Usage:
 *    node scripts/separability/pull_inputs.js              # refresh /tmp/engine_inputs.json
 *    node scripts/separability/pool_change_sim.js <overrides.json>
 *  where overrides.json is { "<card_id>": "<new pool>", ... }
 */
const fs = require('fs');
const { buildEngine, bFor, anchorsOf, rtFrom } = require('./rt_reimpl.js');

const OV = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const raw = JSON.parse(fs.readFileSync('/tmp/engine_inputs.json', 'utf8'));
const cards = raw.cards || raw;

const band = v => v >= 95 ? 'Generational' : v >= 90 ? 'Iconic' : v >= 85 ? 'World Class' : v >= 80 ? 'Standout' : 'below 80';
const run = rows => {
  const E = buildEngine({ ...raw, cards: rows });
  const bs = E.out.map(s => bFor(s, E));
  const A = anchorsOf(bs);
  const m = new Map();
  E.out.forEach((s, i) => m.set(s.card_id, rtFrom(bs[i], A)));
  return { rt: m, A };
};

const before = run(cards);
const after  = run(cards.map(c => OV[c.card_id] ? { ...c, position_pool: OV[c.card_id] } : c));

let moved = 0, crossings = [], changedSelf = [];
const hist = {};
for (const c of cards) {
  const a = before.rt.get(c.card_id), b = after.rt.get(c.card_id);
  if (a == null || b == null) continue;
  const d = b - a;
  hist[d] = (hist[d] || 0) + 1;
  if (d !== 0) moved++;
  if (band(a) !== band(b)) crossings.push({ card: c.card_id, name: c.player_name, yr: c.season_year, from: a, to: b, fromBand: band(a), toBand: band(b), reclassified: !!OV[c.card_id] });
  if (OV[c.card_id]) changedSelf.push({ card: c.card_id, name: c.player_name, from: c.position_pool, to: OV[c.card_id], rtBefore: a, rtAfter: b, d });
}
console.log('anchors before:', JSON.stringify(before.A));
console.log('anchors after :', JSON.stringify(after.A));
console.log('\npools reassigned      :', Object.keys(OV).length);
console.log('cards whose rt MOVED  :', moved, 'of', cards.length);
console.log('rt delta histogram    :', JSON.stringify(hist));
console.log('\nBAND CROSSINGS        :', crossings.length);
crossings.sort((x, y) => y.to - x.to).forEach(x =>
  console.log('  ' + (x.reclassified ? '[reclassified] ' : '[UNTOUCHED]    ') + x.name + ' ' + x.yr + '  ' + x.from + ' -> ' + x.to + '  ' + x.fromBand + ' -> ' + x.toBand));
console.log('\nthe reclassified cards themselves:');
changedSelf.sort((x, y) => y.rtAfter - x.rtAfter).forEach(x =>
  console.log('  ' + String(x.card).padEnd(8) + (x.name || '').padEnd(22) + x.from + ' -> ' + x.to +
              '   rt ' + x.rtBefore + ' -> ' + x.rtAfter + (x.d ? '  (' + (x.d > 0 ? '+' : '') + x.d + ')' : '')));
