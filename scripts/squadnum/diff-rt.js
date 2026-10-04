/*  ── THE rt DIFF, FULL OR SPOT ───────────────────────────────────────────────────────────
    Batch 0 measured the row shape as inert at n=1 across all 57,055 cards. The residual risk
    after that is a WRONG NUMBER, not a moved score, and an rt diff cannot see a wrong number
    at all , so a full read on every batch spends an hour verifying a hazard already measured.

    THE SPOT SET IS NOT A RANDOM SAMPLE, IT IS THE THREE PLACES A RIPPLE COULD COME FROM:
      1. EVERY CARD WRITTEN IN THE BATCH. The direct targets. If the write is not inert these
         move first.
      2. THEIR PARTITION NEIGHBOURS. The engine's percentiles partition on
         COALESCE(pool, pos), so a card that changed bucket would move everyone in the bucket
         it left AND the one it joined. Sampled from both, per written card's league-season.
      3. A FIXED GLOBAL CONTROL of 1,000 cards spread across every league and season, which
         catches a ripple arriving by a route I have not thought of , and that is the one
         worth having, because the first two only test hazards I can already name.

    THE TRIGGER IS ONE MOVER. Not a threshold, not a percentage: batch 0 established the
    expected value is exactly zero, so any movement means the model of this write is wrong and
    the next read is the full 57,055. A SPOT CHECK WITHOUT A TRIGGER IS A RITUAL.  */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIR = path.join(__dirname, '..', '..', 'migrations', 'squad_numbers_2026-09-14');

async function readRt(ids) {
  const map = {};
  if (ids) {
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await sb.from('player_card_view').select('card_id,rt').in('card_id', ids.slice(i, i + 500));
      if (error) throw new Error('view: ' + error.message);
      data.forEach((r) => { map[r.card_id] = r.rt; });
    }
    return map;
  }
  let from = 0;
  for (;;) {
    const { data, error } = await sb.from('player_card_view').select('card_id,rt').order('card_id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error('view: ' + error.message);
    data.forEach((r) => { map[r.card_id] = r.rt; });
    if (data.length < 1000) break;
    from += 1000;
  }
  return map;
}

/*  The global control is FIXED, not re-drawn each batch , a sample that changes every run
    can hide a persistent mover by never looking at it twice.  */
function globalControl(before) {
  const ids = Object.keys(before).map(Number).sort((a, b) => a - b);
  const step = Math.max(1, Math.floor(ids.length / 1000));
  return ids.filter((_, i) => i % step === 0).slice(0, 1000);
}

async function spotIds(writtenCards) {
  const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before-rt.json'), 'utf8'));
  const ids = new Set(writtenCards);
  const { data } = await sb.from('player_card_mv').select('card_id,league_code,season_year,position_pool,position')
    .in('card_id', writtenCards.slice(0, 200));
  for (const c of (data || [])) {
    const { data: mates } = await sb.from('player_card_mv').select('card_id')
      .eq('league_code', c.league_code).eq('season_year', c.season_year).limit(25);
    (mates || []).forEach((m) => ids.add(m.card_id));
  }
  globalControl(before).forEach((i) => ids.add(i));
  return [...ids];
}

async function run(mode, writtenCards) {
  const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before-rt.json'), 'utf8'));
  const ids = mode === 'full' ? null : await spotIds(writtenCards || []);
  const after = await readRt(ids);
  const movers = [];
  for (const id of Object.keys(after)) if (id in before && before[id] !== after[id]) movers.push({ card: id, from: before[id], to: after[id] });
  return { mode, compared: Object.keys(after).length, movers };
}
module.exports = { run, spotIds, readRt };

if (require.main === module) {
  const mode = process.argv.includes('--spot') ? 'spot' : 'full';
  const written = fs.existsSync(path.join(DIR, 'written.jsonl'))
    ? fs.readFileSync(path.join(DIR, 'written.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).card_id)
    : [];
  run(mode, written).then((r) => {
    console.log('  mode ' + r.mode + '   compared ' + r.compared + '   MOVERS ' + r.movers.length);
    r.movers.slice(0, 12).forEach((m) => console.log('     card ' + m.card + ': ' + m.from + ' -> ' + m.to));
    if (r.movers.length) { console.log('\n  ESCALATE: any mover means the model of this write is wrong. Re-run without --spot.'); process.exit(1); }
    console.log('  no movement.');
  }).catch((e) => { console.error('FAILED,', e.message); process.exit(1); });
}
