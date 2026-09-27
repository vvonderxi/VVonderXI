import { simulate, runMatch } from './simulate.js';
import { makeConfig } from '../engine/config.js';
import { loadDeckInfo } from './deck.js';
import { prepareAI, TacticianCPU } from '../engine/ai/cpu.js';
const N = +(process.argv[2] ?? 1000);
const ABSTRACT = ['impact', 'goalThreat', 'creation', 'progression', 'defensive', 'reliability', 'roleMastery'];
const MOMENTS  = ['oneOnOne', 'killerBall', 'breakLines', 'counter', 'bigGame', 'ninety', 'roleDuel'];
const { cards: deck, info } = loadDeckInfo();
console.log(info);
for (const [label, pool] of [['ABSTRACT stats', ABSTRACT], ['FOOTBALL MOMENTS', MOMENTS]]) {
  const config = makeConfig({ categoryPool: pool });
  const skill = simulate({ n: N, config, deck, botA: {}, botB: 'greedy' });
  const press = simulate({ n: N, config, deck, botA: { params: { pressValue: 1.6 } }, botB: {} });
  const m = simulate({ n: N, config, deck, botA: {}, botB: {} });
  // position share of round wins, and how often each position is played
  const ctx = { cards: deck, config, deckIds: Object.keys(deck) };
  const ai = prepareAI(ctx, ctx.deckIds);
  const plays = {}, wins = {};
  for (let i = 0; i < 400; i++) {
    const { state } = runMatch(ctx, { A: TacticianCPU(ai), B: TacticianCPU(ai) }, 9000 + i, i % 2 ? 'B' : 'A');
    for (const h of state.history) for (const p of ['A', 'B']) {
      const pos = deck[h.played[p]].position; plays[pos] = (plays[pos] ?? 0) + 1;
      if (h.winner === p) wins[pos] = (wins[pos] ?? 0) + 1;
    }
  }
  const posLine = ['ST','W','CAM','CM','CDM','FB','CB'].map(p => `${p} ${Math.round(100*(wins[p]??0)/(plays[p]||1))}%`).join('  ');
  console.log(`\n${label}\n  skill T>G ${skill.winRateA}  | press-lover ${press.winRateA}  | rounds ${m.roundsMean}  | attacker/active wins round ${m.activePlayerRoundWin}  | leader@R4 ${m.leaderAfter4Wins}  | comeback ${m.comebackRate}`);
  console.log(`  round win rate when played:  ${posLine}`);
  console.log(`  moment mix: ${JSON.stringify(m.categoryMix)}`);
  console.log(`  attacker round-win: ` + pool.map(c => `${c} ${m.activeWinByCategory[c] == null ? 'NR' : m.activeWinByCategory[c] + '%'}`).join('  '));
}
