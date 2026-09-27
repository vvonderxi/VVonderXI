import { simulate } from './simulate.js';
import { makeConfig } from '../engine/config.js';
import fs from 'fs';
const N = +(process.argv[2] ?? 1000);
import { DEFAULT_CONFIG } from '../engine/config.js';
// 'late press' ladder: PRESS only from DOMINANT up, CLEAR offers DISCARD_OTHER instead
const late = DEFAULT_CONFIG.verdicts.map(v => v.id === 'CLEAR' ? { ...v, options: ['DISCARD_PLAYED', 'DISCARD_OTHER'] } : v);
const base = { categoryBan: true, dealMode: 'TIERED', pressRule: 'ALWAYS', initiative: 'LOSER_GETS' };
const sets = {
  'A  LOSER_GETS  press ALWAYS':     { ...base },
  'B  LOSER_GETS  press NOT_LEADING': { ...base, pressRule: 'NOT_LEADING' },
  'C  ALTERNATE   press NOT_LEADING': { ...base, pressRule: 'NOT_LEADING', initiative: 'ALTERNATE' },
  'D  WINNER_KEEPS press NOT_LEADING':{ ...base, pressRule: 'NOT_LEADING', initiative: 'WINNER_KEEPS' },
  'E  ALTERNATE   press late only':   { ...base, initiative: 'ALTERNATE', verdicts: late },
  'F  C + hand 6':                    { ...base, pressRule: 'NOT_LEADING', initiative: 'ALTERNATE', handSize: 6 },
  'G  E + hand 6':                    { ...base, initiative: 'ALTERNATE', verdicts: late, handSize: 6 },
};
const out = {};
console.log('set'.padEnd(36), 'skill  pressWR  rounds  active  leader4  comeback  startQ  verdicts(E/C/D/X/S)');
for (const [k, cfg] of Object.entries(sets)) {
  const c = makeConfig(cfg);
  const skill = simulate({ n: N, config: c, botA: {}, botB: 'greedy' });
  const press = simulate({ n: N, config: c, botA: { params: { pressValue: 1.6 } }, botB: {} });
  const mirror = simulate({ n: N, config: c, botA: {}, botB: {} });
  const v = mirror.verdictMix;
  out[k] = { skill, press, mirror };
  console.log(k.padEnd(36), String(skill.winRateA).padStart(5), String(press.winRateA).padStart(8), String(mirror.roundsMean).padStart(7),
    String(mirror.activePlayerRoundWin).padStart(7), String(mirror.leaderAfter4Wins).padStart(8), String(mirror.comebackRate).padStart(9),
    String(mirror.strongerStartWins).padStart(7), `  ${v.EDGE}/${v.CLEAR}/${v.DOMINANT}/${v.DEMOLITION}/${v.STALEMATE}`);
}
fs.writeFileSync(new URL('./grid-results.json', import.meta.url), JSON.stringify(out, null, 1));
