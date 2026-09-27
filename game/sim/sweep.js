import { simulate } from './simulate.js';
import { makeConfig } from '../engine/config.js';
const N = +(process.argv[2] ?? 600);
const keys = ['winRateA','firstActiveWinRate','roundsMean','activePlayerRoundWin','strongerStartWins','leaderAfter4Wins','comebackRate','drawsPerGame'];
const row = (label, r) => console.log(label.padEnd(34), keys.map(k => String(r[k]).padStart(6)).join(' '));
console.log(''.padEnd(34), keys.map(k => k.slice(0,6).padStart(6)).join(' '));
const exps = JSON.parse(process.argv[3]);
for (const [label, cfg, a, b] of exps) row(label, simulate({ n: N, config: makeConfig(cfg), botA: a ?? {}, botB: b ?? 'greedy' }));
