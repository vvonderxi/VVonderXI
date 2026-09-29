// CORE-2 experiment: GAME_DECK=real node game/sim/core-experiment.js 1200
// Per rule set: skill (Tactician v Greedy), a Tactician mirror for the match shape, and press-lover
// (Tactician valuing High Press at 1.6) v Tactician. Rules in core-rules.js; v1.3.1 is the reference.
import { fork } from 'child_process';
import fs from 'fs';
import { simulate } from './simulate.js';
import { makeConfig } from '../engine/config.js';
import { loadDeckInfo } from './deck.js';
import { core2 } from './core-rules.js';

const DEALS = { 'hand 6': [6, [1, 2, 3, 3, 4, 5]], 'hand 7 mid': [7, [1, 2, 3, 3, 3, 4, 5]], 'hand 7 spread': [7, [1, 2, 2, 3, 4, 4, 5]] };
const cells = [{ key: 'v1.3.1 (reference) | hand 6', over: {} }];
for (const [pl, press] of [['CORE-2 press 1', 1], ['CORE-2 (a) press 2', 2], ['CORE-2 (b) no press', 0]])
  for (const [dl, [handSize, dealTiers]] of Object.entries(DEALS)) cells.push({ key: `${pl} | ${dl}`, over: core2({ press, handSize, dealTiers }) });

function run(cell, n) {
  const config = makeConfig(cell.over);
  const skill = simulate({ n, config, botA: {}, botB: 'greedy' });
  const mirror = simulate({ n, config, botA: {}, botB: {} });
  const press = simulate({ n, config, botA: { params: { pressValue: 1.6 } }, botB: {} });
  const unfinished = Math.max(...[skill, mirror, press].map(r => (r.roundCapHits ?? 0) + (r.stalledRate ?? 0)));
  return { key: cell.key, skill: skill.winRateA, press: press.winRateA, rounds: mirror.roundsMean, minutes: mirror.estMinutes,
    leader4: mirror.leaderAfter4Wins, comeback: mirror.comebackRate, mix: mirror.verdictMix,
    big: mirror.verdictMixByCategory.bigGame, picks: mirror.bigWinPicks, unfinished };
}

if (process.env.CORE_CHILD) {
  process.on('message', ({ cells, n }) => { process.send(cells.map(c => run(c, n))); process.exit(0); });
} else {
  const N = +(process.argv[2] ?? 1200);
  const { name, info } = loadDeckInfo();
  console.log(info + `\n${cells.length} rule sets x ${N} matches per simulation`);
  const rows = (await Promise.all(cells.map(c => new Promise((res, rej) => {
    const ch = fork(new URL(import.meta.url).pathname, [], { env: { ...process.env, CORE_CHILD: '1' } });
    ch.on('message', m => res(m[0])); ch.on('error', rej); ch.on('exit', code => code && rej(new Error('child exit ' + code)));
    ch.send({ cells: [c], n: N });
  }))));
  fs.writeFileSync(new URL(`./core-results.${name}.json`, import.meta.url), JSON.stringify(rows, null, 1));
  const V = ['STALEMATE', 'EDGE', 'CLEAR', 'DOMINANT', 'DEMOLITION'];
  const mix = m => V.map(v => String(m?.[v] ?? 0).padStart(5)).join('');
  const f = (v, w = 6) => String(v ?? 'n/a').padStart(w);
  console.log(`\n${'rule set'.padEnd(34)} skill press rounds   min lead4 comebk | mix nodec Photo Clear  Brag Mastr | Big Game mix             | big-win picks`);
  for (const r of rows) console.log(`${r.key.padEnd(34)}${f(r.skill)}${f(r.press)}${f(r.rounds, 7)}${f(r.minutes)}${f(r.leader4)}${f(r.comeback, 7)} |    ${mix(r.mix)} | ${mix(r.big)} | ${JSON.stringify(r.picks)}${r.unfinished ? '  UNFINISHED ' + r.unfinished + '%' : ''}`);
  console.log(`\nTARGET mix${''.padEnd(56)}|      7.5 26.5   25   22 17.5`);
  console.log(`unfinished matches: ${rows.some(r => r.unfinished) ? 'see rows' : 'none in any rule set'}`);
}
