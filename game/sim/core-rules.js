// CORE-2 rules experiment (2026-09-28), as config overrides on top of the default (v1.3.1).
//   Forced Change off (SWAP and REDRAW unchanged).
//   Photo Finish, Clear Edge: Into Legacy only.
//   Bragging Rights, Masterclass: Into Legacy AUTOMATIC (a bonus effect), then choose one of
//   High Press / Assist. Masterclass and Bragging Rights therefore give the same reward here.
//   press: 1 = High Press draws 1, 2 = draws 2 (pressDraw), 0 = no High Press (big win = Into Legacy + Assist).
import { V1_3_1 } from '../engine/config.js';

// Built on v1.3.1 (the default when it was run), so the recorded experiment keeps reproducing.
export function core2({ press = 1, dealTiers, handSize } = {}) {
  const big = press ? ['PRESS', 'DISCARD_OTHER'] : ['DISCARD_OTHER'];
  return {
    ...V1_3_1, version: 'core2',
    ...(handSize ? { handSize } : {}), ...(dealTiers !== undefined ? { dealTiers } : {}),
    substitutions: { ...V1_3_1.substitutions, forcedChange: false },
    pressDraw: press || 1,
    verdicts: V1_3_1.verdicts.map(v =>
      v.id === 'EDGE' || v.id === 'CLEAR' ? { ...v, options: ['DISCARD_PLAYED'], picks: 1, bonus: [] }
      : v.id === 'DOMINANT' || v.id === 'DEMOLITION' ? { ...v, options: big, picks: 1, bonus: ['DISCARD_PLAYED'] }
      : v),
  };
}
