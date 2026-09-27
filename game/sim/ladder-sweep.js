// Verdict-ladder sweep. Run on the deck you mean: GAME_DECK=real node game/sim/ladder-sweep.js <mode>
//   quantiles N        mirror N matches on the current config, read the real round gaps, and print
//                      the cut points that would land exactly on TARGET (a first estimate only:
//                      the ladder changes what the CPU plays, so the grid has to confirm it)
//   grid N '<json>'    json = { edge:[..], clear:[..], dominant:[..], demolition:[..], bigGame:[..] }
//                      mirror every combination at N, rank by distance from TARGET, then run
//                      skill / PRESS at 2N on the best TOP. Work is split over child processes.
// Verdict mix is reported for Big Game and for the other six moments separately.

import { fork } from 'child_process';
import { simulate, runMatch } from './simulate.js';
import { makeConfig, DEFAULT_CONFIG } from '../engine/config.js';
import { scaleFor } from '../engine/core.js';
import { prepareAI, TacticianCPU } from '../engine/ai/cpu.js';
import { loadDeckInfo } from './deck.js';

const VERDICTS = ['STALEMATE', 'EDGE', 'CLEAR', 'DOMINANT', 'DEMOLITION'];
const SHORT = { STALEMATE: 'VAR', EDGE: 'Photo', CLEAR: 'Clear', DOMINANT: 'Brag', DEMOLITION: 'Master' };
export const TARGET = { STALEMATE: 7.5, EDGE: 26.5, CLEAR: 25, DOMINANT: 22, DEMOLITION: 17.5 };
const SKILL_FLOOR = 62;
const TOP = 8;

const ladderConfig = ({ edge, clear, dominant, demolition, bigGame }) => makeConfig({
  verdicts: DEFAULT_CONFIG.verdicts.map(v => ({ ...v, minDiff:
    v.id === 'EDGE' ? edge : v.id === 'CLEAR' ? clear : v.id === 'DOMINANT' ? dominant : v.id === 'DEMOLITION' ? demolition : v.minDiff })),
  thresholdScales: { bigGame },
  ladders: {},   // a swept scale only means something without the explicit Big Game ladder
});

// Combine per-moment verdict mixes into one mix, weighted by how often each moment was played.
function pooledMix(r, keep) {
  const acc = Object.fromEntries(VERDICTS.map(v => [v, 0])); let w = 0;
  for (const [cat, share] of Object.entries(r.categoryMix)) {
    if (!keep(cat)) continue; w += share;
    for (const v of VERDICTS) acc[v] += share * (r.verdictMixByCategory[cat]?.[v] ?? 0);
  }
  return Object.fromEntries(VERDICTS.map(v => [v, w ? +(acc[v] / w).toFixed(1) : null]));
}
const distance = mix => +VERDICTS.reduce((s, v) => s + Math.abs(mix[v] - TARGET[v]), 0).toFixed(1);

function mirrorRow(L, n) {
  const m = simulate({ n, config: ladderConfig(L), botA: {}, botB: {} });
  const all = Object.fromEntries(VERDICTS.map(v => [v, m.verdictMix[v] ?? 0]));
  return { L, all, dist: distance(all), others: pooledMix(m, c => c !== 'bigGame'), big: pooledMix(m, c => c === 'bigGame'),
           rounds: m.roundsMean, comeback: m.comebackRate, bigAtk: m.activeWinByCategory.bigGame };
}
function fullRow(row, n) {
  const c = ladderConfig(row.L);
  const skill = simulate({ n, config: c, botA: {}, botB: 'greedy' }).winRateA;
  const press = simulate({ n, config: c, botA: { params: { pressValue: 1.6 } }, botB: {} }).winRateA;
  return { ...mirrorRow(row.L, n), skill, press };
}

// ---- child process: mirror a slice of ladders, send rows back
if (process.env.LADDER_CHILD) {
  process.on('message', ({ ladders, n, full }) => {
    process.send(ladders.map(x => full ? fullRow(x, n) : mirrorRow(x, n)));
    process.exit(0);
  });
} else {
  const { info } = loadDeckInfo();
  const mode = process.argv[2];
  const N = +(process.argv[3] ?? 600);
  console.log(info);
  if (mode === 'quantiles') quantiles(N);
  else if (mode === 'grid') await grid(N, JSON.parse(process.argv[4]));
  else { console.error('mode: quantiles N | grid N <json>'); process.exit(1); }
}

function quantiles(N) {
  const deck = loadDeckInfo().cards, config = makeConfig();
  const ctx = { cards: deck, config, deckIds: Object.keys(deck) };
  const ai = prepareAI(ctx, ctx.deckIds);
  const gaps = { others: [], bigGame: [] };  // gap in LADDER units (difference / scale); ties stay VAR whatever the ladder
  for (let i = 0; i < N; i++) {
    const { state } = runMatch(ctx, { A: TacticianCPU(ai), B: TacticianCPU(ai) }, 1 + i, i % 2 ? 'B' : 'A');
    for (const h of state.history) (h.category === 'bigGame' ? gaps.bigGame : gaps.others).push(h.winner ? h.diff / scaleFor(h.category, config) : -1);
  }
  const cum = [TARGET.STALEMATE, TARGET.STALEMATE + TARGET.EDGE, TARGET.STALEMATE + TARGET.EDGE + TARGET.CLEAR,
               100 - TARGET.DEMOLITION].map(x => x / 100);
  for (const [k, g] of Object.entries({ ...gaps, all: [...gaps.others, ...gaps.bigGame] })) {
    const s = g.slice().sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    const ties = (100 * s.filter(x => x < 0).length / s.length).toFixed(1);
    console.log(`${k.padEnd(8)} rounds ${String(s.length).padStart(6)} | exact ties ${ties}% | cuts for target: EDGE ${q(cum[0]).toFixed(1)}  CLEAR ${q(cum[1]).toFixed(1)}  DOMINANT ${q(cum[2]).toFixed(1)}  DEMOLITION ${q(cum[3]).toFixed(1)}`);
  }
}

async function grid(N, spec) {
  const ladders = [];
  for (const edge of spec.edge) for (const clear of spec.clear) for (const dominant of spec.dominant)
    for (const demolition of spec.demolition) for (const bigGame of spec.bigGame)
      if (edge < clear && clear < dominant && dominant < demolition) ladders.push({ edge, clear, dominant, demolition, bigGame });
  const shard = async (list, n, full) => {
    const k = Math.min(11, list.length), parts = Array.from({ length: k }, (_, i) => list.filter((_, j) => j % k === i));
    const out = await Promise.all(parts.map(p => new Promise((res, rej) => {
      const c = fork(new URL(import.meta.url).pathname, [], { env: { ...process.env, LADDER_CHILD: '1' } });
      c.on('message', res); c.on('error', rej); c.on('exit', code => code && rej(new Error('child exit ' + code)));
      c.send({ ladders: p, n, full });
    })));
    return out.flat();
  };
  console.log(`grid: ${ladders.length} ladders x ${N} mirror matches`);
  const mirror = (await shard(ladders, N, false)).sort((a, b) => a.dist - b.dist);
  const best = await shard(mirror.slice(0, TOP).map(r => ({ L: r.L })), 2 * N, true);
  best.sort((a, b) => a.dist - b.dist);

  const mixStr = m => VERDICTS.map(v => String(m[v]).padStart(5)).join('');
  const L = r => `${r.L.edge}/${r.L.clear}/${r.L.dominant}/${r.L.demolition} x${r.L.bigGame}`;
  console.log(`\nTARGET (all moments)            ${VERDICTS.map(v => SHORT[v].padStart(5)).join('')}\n${''.padEnd(32)}${mixStr(TARGET)}`);
  console.log(`\nBEST ${TOP} of the mirror stage, re-run at ${2 * N}:`);
  console.log(`${'ladder E/C/D/X x bigGame'.padEnd(26)}${'dist'.padStart(6)}  ALL ${VERDICTS.map(v => SHORT[v].padStart(5)).join('')} | OTHER SIX ${''.padEnd(19)} | BIG GAME ${''.padEnd(19)} | skill press rounds comeback bigAtk`);
  for (const r of best) console.log(`${L(r).padEnd(26)}${String(r.dist).padStart(6)}      ${mixStr(r.all)} | ${mixStr(r.others)}     | ${mixStr(r.big)}    | ${String(r.skill).padStart(5)}${r.skill < SKILL_FLOOR ? '!' : ' '}${String(r.press).padStart(5)} ${String(r.rounds).padStart(6)} ${String(r.comeback).padStart(8)} ${String(r.bigAtk).padStart(6)}`);
  console.log(`\nmirror-stage distance, all ${mirror.length}: best ${mirror[0].dist}, median ${mirror[Math.floor(mirror.length / 2)].dist}, worst ${mirror.at(-1).dist}`);
}
