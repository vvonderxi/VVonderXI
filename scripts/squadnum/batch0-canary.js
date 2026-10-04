/*  ── BATCH 0 , ONE ROW, AND ITS ONLY JOB IS TO TEST THE SHAPE OF THE WRITE ───────────────
    NOT the pipeline: the 2016/17 held-out pilot already measured that at 98.9% precision over
    3,577 numbers. What is untested is the ROW: `player_positions` holds 43,659 rows and NOT
    ONE has a NULL position, so inserting a shirt number without one has no precedent here.

    WHY IT SHOULD BE rt-NEUTRAL, read from a fresh viewdef rather than assumed: the view
    defines `pp."position" AS position_pool`, a DIRECT read with no COALESCE. Pre-2016 cards
    have no pp row, so position_pool is ALREADY null, and inserting a row with a null position
    leaves it null. The engine partitions on COALESCE(pool, pos), which is unchanged.

    THAT IS A PREDICTION. This script measures it, and the measurement is the whole point ,
    SS C: a 351-row write once moved 137 cards nobody had touched, one across a public band.

    ROLLBACK IS AUTOMATIC AND UNCONDITIONAL ON ANY MOVEMENT. The row is deleted before the
    script reports, so a surprise cannot sit in the database while somebody reads the output.  */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIR = path.join(__dirname, '..', '..', 'migrations', 'squad_numbers_2026-09-14');
const CANARY = JSON.parse(fs.readFileSync('/tmp/claude-1000/-home-odoo-projects-VVonderXI/4d335d70-fa93-465f-96f0-82ffcecec40d/scratchpad/canary.json', 'utf8'));
const APPLY = process.argv.includes('--apply');

async function fullViewRt() {
  const map = {}; let from = 0;
  for (;;) {
    const { data, error } = await sb.from('player_card_view')
      .select('card_id,rt').order('card_id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error('view read: ' + error.message);
    data.forEach((r) => { map[r.card_id] = r.rt; });
    if (data.length < 1000) break;
    from += 1000;
  }
  return map;
}

(async () => {
  const key = { api_player_id: CANARY.pick.api, season_year: CANARY.season_year, league_code: CANARY.league_code };
  console.log('CANARY: ' + CANARY.pick.name + '  card ' + CANARY.pick.card + '  rt ' + CANARY.pick.rt
    + '  ->  shirt ' + CANARY.pick.no + '   (' + CANARY.title + ')');
  console.log('key: ' + JSON.stringify(key));

  /*  NEVER OVERWRITE. If a row already exists this is an UPDATE path, which is not what was
      approved and not what the rollback undoes , stop rather than adapt.  */
  const { data: exists } = await sb.from('player_positions').select('*')
    .eq('api_player_id', key.api_player_id).eq('season_year', key.season_year).eq('league_code', key.league_code);
  if (exists && exists.length) { console.error('STOP: a row already exists for this key , this would be an update, not an insert.'); process.exit(1); }
  console.log('no existing row , this is an INSERT, as scoped');

  if (!APPLY) { console.log('\nDRY RUN. Nothing written. Pass --apply to run batch 0.'); return; }

  const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before-rt.json'), 'utf8'));
  console.log('\nbefore snapshot: ' + Object.keys(before).length + ' cards');

  let inserted = false;
  try {
    const { error } = await sb.from('player_positions').insert([{ ...key, shirt_number: Number(CANARY.pick.no) }]);
    if (error) throw new Error('insert: ' + error.message);
    inserted = true;
    console.log('inserted. reading the FULL view back...');
    const after = await fullViewRt();
    console.log('after read: ' + Object.keys(after).length + ' cards');

    const movers = [];
    for (const id of Object.keys(before)) {
      if (!(id in after)) { movers.push({ card: id, from: before[id], to: '(absent)' }); continue; }
      if (before[id] !== after[id]) movers.push({ card: id, from: before[id], to: after[id] });
    }
    const appeared = Object.keys(after).filter((id) => !(id in before));

    console.log('\n  cards compared       ' + Object.keys(before).length);
    console.log('  rt MOVERS            ' + movers.length + (movers.length ? '   <-- STOP' : '   (expected: 0)'));
    console.log('  cards appeared       ' + appeared.length);
    if (movers.length) movers.slice(0, 12).forEach((m) => console.log('     card ' + m.card + ': ' + m.from + ' -> ' + m.to));

    const verdict = movers.length === 0 && appeared.length === 0;
    fs.writeFileSync(path.join(DIR, 'batch0-result.json'), JSON.stringify({
      ran: new Date().toISOString(), key, shirt: Number(CANARY.pick.no),
      cardsCompared: Object.keys(before).length, movers, appeared, passed: verdict,
      /*  Kept whatever the answer: a canary that passed is the evidence the batch rests on,
          and one that failed is the reason it stopped.  */
    }, null, 2) + '\n');

    if (!verdict) {
      console.log('\n  MOVEMENT DETECTED , rolling back and stopping.');
    } else {
      console.log('\n  ZERO MOVEMENT. The row shape is rt-neutral, as predicted from the viewdef.');
      console.log('  The row is STILL ROLLED BACK , batch 0 proves the shape, it does not start the backfill.');
    }
  } finally {
    if (inserted) {
      const { error } = await sb.from('player_positions').delete()
        .eq('api_player_id', key.api_player_id).eq('season_year', key.season_year).eq('league_code', key.league_code);
      console.log('  rollback: ' + (error ? 'FAILED , ' + error.message : 'row deleted'));
      const { data: check } = await sb.from('player_positions').select('api_player_id')
        .eq('api_player_id', key.api_player_id).eq('season_year', key.season_year).eq('league_code', key.league_code);
      console.log('  verified: ' + ((check && check.length) ? 'ROW STILL PRESENT , INTERVENE' : 'no row remains'));
    }
  }
})().catch((e) => { console.error('FAILED,', e.message); process.exit(1); });
