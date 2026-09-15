/*  KEEPER_SAVE_LADDER , REGENERATE AND DIFF. Read-only; --write is not offered because the
    ladder lives inside vv-core.js and is pasted by hand, like the radar reference.

    WHY THIS EXISTS: the ladder is one of three EMBEDDED SNAPSHOTS on the platform and
    CLAUDE.md records the standing hazard for all three , nothing warns you when one goes
    stale. RADAR_POOL_REF has had `gen-radar-ref.js` since it shipped and the index figures
    got `gen-index-figures.js` at item 24. **This one had no generator at all**, so checking
    it for drift meant reconstructing the three gates from `keeperScore` by hand and
    reimplementing the percentile , which is precisely the sort of check that never gets run.
    A hazard that is documented for three things and checkable for two is documented for two.

    THE GATES ARE READ FROM THE SHIPPING CONSTANTS, NOT RETYPED. If `KEEPER_MIN_MINUTES`,
    `KEEPER_MIN_SHOTS` or `KEEPER_ERA` ever move, this generator moves with them, and a
    check that silently used the old gates would report drift that is not there.  */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const core = fs.readFileSync(require('path').join(__dirname, '../vv-core.js'), 'utf8');
const num = (name) => {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*([0-9]+)').exec(core);
  if (!m) throw new Error('[vv] gate ' + name + ' not found in vv-core.js , it has been renamed or removed');
  return Number(m[1]);
};
const MIN_MINUTES = num('KEEPER_MIN_MINUTES');
const MIN_SHOTS   = num('KEEPER_MIN_SHOTS');
const ERA         = num('KEEPER_ERA');
const committed = (() => {
  const m = /KEEPER_SAVE_LADDER\s*=\s*\[([\s\S]*?)\]/.exec(core);
  if (!m) throw new Error('[vv] KEEPER_SAVE_LADDER not found in vv-core.js');
  return m[1].split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
})();

(async () => {
  console.log('KEEPER SAVE LADDER , gates read from vv-core: ' + MIN_MINUTES + ' minutes, '
    + MIN_SHOTS + ' shots faced, ' + ERA + '+\n');
  const pool = [];
  for (let from = 0; ; from += 1000) {
    const r = await sb.from('player_card_mv').select('saves,goals_conceded,minutes,season_year,position')
      .eq('position', 'GK').gte('season_year', ERA)
      .not('saves', 'is', null).not('goals_conceded', 'is', null)
      .gte('minutes', MIN_MINUTES)
      .order('card_id', { ascending: true }).range(from, from + 999);
    if (r.error) { console.error('  read failed: ' + r.error.message); process.exit(1); }
    (r.data || []).forEach((x) => { const sf = x.saves + x.goals_conceded; if (sf >= MIN_SHOTS) pool.push(x.saves / sf); });
    if (!r.data || r.data.length < 1000) break;
  }
  pool.sort((a, b) => a - b);
  const at = (p) => { const i = (pool.length - 1) * p / 100, lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? pool[lo] : pool[lo] + (pool[hi] - pool[lo]) * (i - lo); };
  const now = []; for (let p = 0; p <= 100; p += 5) now.push(+at(p).toFixed(4));

  console.log('  gated pool: n=' + pool.length + '   ladder points: ' + now.length);
  if (committed.length !== now.length) console.log('  LENGTH MISMATCH , committed ' + committed.length);
  let max = 0, worst = null;
  now.forEach((v, i) => { const d = Math.abs(v - (committed[i] ?? 0)); if (d > max) { max = d; worst = i * 5; } });
  console.log('  max drift: ' + max.toFixed(4) + (worst != null ? ' at the ' + worst + 'th percentile' : ''));
  /*  THE BAR IS 0.005 , HALF A POINT OF SAVE PERCENTAGE. Below that the difference is
      percentile interpolation rather than the population moving, and repasting the block
      would be churn. Above it, the keeper population has genuinely changed and the ladder
      is scoring against a field that no longer exists.  */
  console.log('  ' + (max < 0.005 ? 'WITHIN TOLERANCE , no repaste needed.' : 'DRIFTED , repaste the block into vv-core.js:'));
  if (max >= 0.005) {
    const lines = [];
    for (let i = 0; i < now.length; i += 9) lines.push('                              ' + now.slice(i, i + 9).map((n) => n.toFixed(4)).join(','));
    console.log('  const KEEPER_SAVE_LADDER = [' + lines.join(',\n').trim() + '];');
  }
})();
