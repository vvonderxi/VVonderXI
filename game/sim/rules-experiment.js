// Rules experiment: hand / Bench size, substitutions, the Captain. All behind config flags; the default
// config is untouched. Run on the deck you mean:  GAME_DECK=real node game/sim/rules-experiment.js 1200
// Per rule set: skill (Tactician v Greedy; Greedy never uses subs), a Tactician mirror for the match
// shape, and SUBS VALUE (Tactician with subs v Tactician without, same rules) wherever subs exist.
// The CPU's sub use is a simple documented heuristic (cpu.js), so every sub figure is a LOWER BOUND.
// Pinned to the deal formula and the ladder it was run on (2/9/18/31, +1 token on DOMINANT in token mode;
// the token does nothing under substitutions), so it reproduces its recorded results.

import { fork } from 'child_process';
import fs from 'fs';
import { simulate } from './simulate.js';
import { makeConfig, V1_2 } from '../engine/config.js';
import { loadDeckInfo } from './deck.js';

const SUB_BASE = { perPlayer: 3, forcedChange: true, redraw: true, onePerRound: true };
const RULES = {
  tokens:        null,
  'subs N2 guard': { ...SUB_BASE, swapMax: 2, forcedNotOnLast: true },
  'subs N2':       { ...SUB_BASE, swapMax: 2, forcedNotOnLast: false },
  'subs ALL guard':{ ...SUB_BASE, swapMax: 'ALL', forcedNotOnLast: true },
  'subs ALL':      { ...SUB_BASE, swapMax: 'ALL', forcedNotOnLast: false },
};
const cells = [];
for (const handSize of [5, 6, 7]) for (const drawPileSize of [30, 15]) for (const [rules, substitutions] of Object.entries(RULES))
  for (const captain of [false, true]) cells.push({ key: `hand ${handSize} bench ${drawPileSize} | ${rules}${captain ? ' + captain' : ''}`,
    handSize, drawPileSize, rules, captain, over: { handSize, drawPileSize, substitutions, captain, dealTiers: null, verdicts: V1_2.verdicts } });

function run(cell, n) {
  const config = makeConfig(cell.over);
  const skill = simulate({ n, config, botA: {}, botB: 'greedy' });
  const mirror = simulate({ n, config, botA: {}, botB: {} });
  const value = cell.over.substitutions ? simulate({ n, config, botA: {}, botB: { params: { useSubs: false } } }) : null;
  const unfinished = Math.max(...[skill, mirror, value].filter(Boolean).map(r => (r.roundCapHits ?? 0) + (r.stalledRate ?? 0)));
  return { ...cell, skill: skill.winRateA, subsValue: value?.winRateA ?? null, rounds: mirror.roundsMean, minutes: mirror.estMinutes,
    comeback: mirror.comebackRate, leader4: mirror.leaderAfter4Wins, subs: mirror.subsPerGame, unfinished,
    capped: mirror.roundCapHits, stalled: mirror.stalledRate };
}

if (process.env.RULES_CHILD) {
  process.on('message', ({ cells, n }) => { process.send(cells.map(c => run(c, n))); process.exit(0); });
} else {
  const N = +(process.argv[2] ?? 1200);
  const { name, info } = loadDeckInfo();
  console.log(info + `\n${cells.length} rule sets x ${N} matches per simulation`);
  const k = 11, parts = Array.from({ length: k }, (_, i) => cells.filter((_, j) => j % k === i));
  const rows = (await Promise.all(parts.map(p => new Promise((res, rej) => {
    const c = fork(new URL(import.meta.url).pathname, [], { env: { ...process.env, RULES_CHILD: '1' } });
    c.on('message', res); c.on('error', rej); c.on('exit', code => code && rej(new Error('child exit ' + code)));
    c.send({ cells: p, n: N });
  })))).flat();
  fs.writeFileSync(new URL(`./rules-results.${name}.json`, import.meta.url), JSON.stringify(rows, null, 1));

  const f = (v, w = 6) => String(v ?? 'n/a').padStart(w);
  const sub = r => r.subs ? `${f(r.subs.SWAP ?? 0, 5)}${f(r.subs.REDRAW ?? 0, 7)}${f(r.subs.FORCED ?? 0, 7)}` : `${f('', 5)}${f('', 7)}${f('', 7)}`;
  const head = `${'rule set'.padEnd(44)} skill subsVal rounds   min comeback lead@R4  SWAP REDRAW FORCED  unfinished%`;
  const line = r => `${r.key.padEnd(44)}${f(r.skill)}${f(r.subsValue, 8)}${f(r.rounds, 7)}${f(r.minutes)}${f(r.comeback, 9)}${f(r.leader4, 8)}${sub(r)}${f(r.unfinished, 12)}`;
  const byKey = Object.fromEntries(rows.map(r => [r.key, r]));
  console.log('\nTABLE 1 , hand and Bench size, v1.2 rules (tokens, no captain)\n' + head);
  for (const h of [5, 6, 7]) for (const b of [30, 15]) console.log(line(byKey[`hand ${h} bench ${b} | tokens`]));
  console.log('\nTABLE 2 , substitutions and the Captain at hand 5, Bench 30 (sub columns = uses per match, both players)\n' + head);
  for (const rules of Object.keys(RULES)) for (const cap of [false, true]) console.log(line(byKey[`hand 5 bench 30 | ${rules}${cap ? ' + captain' : ''}`]));
  const ranked = rows.filter(r => r.unfinished === 0 && r.comeback >= 33).sort((a, b) => b.skill - a.skill);
  console.log('\nTABLE 3 , best 3 of all ' + rows.length + ' by skill, among rule sets with zero unfinished matches and comebacks >= 33\n' + head);
  for (const r of ranked.slice(0, 3)) console.log(line(r));
  const bad = rows.filter(r => r.unfinished > 0);
  console.log(`\nunfinished matches: ${bad.length ? bad.map(r => `${r.key} ${r.unfinished}% (cap ${r.capped}, stalled ${r.stalled})`).join(' | ') : 'none in any of the ' + rows.length + ' rule sets'}`);
}
