/*  SITTING 3 , WHAT THE RUN ACTUALLY DID. READ-ONLY.
    ================================================================================
    Measured against `player_card_view`, which is computed on READ, because the matview has
    not been refreshed yet and would answer about the state before the run. That is the same
    distinction that cost us a false confirmation on 2026-09-26: the view tells the truth
    about the base table, the matview tells the truth about the last refresh.

      node scripts/fused-verify.js
*/
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIR = path.join('migrations', 'fused_split_2026-09-26');

async function val(subselect){
  const { error } = await sb.rpc('exec_sql', {
    sql: `select set_config('statement_timeout','120000',false); select (('x'||(${subselect})))::int` });
  if (!error) return null;
  const m = /invalid input syntax for type integer: "x([\s\S]*)"/.exec(error.message || '');
  if (!m) throw new Error(error.message);
  return m[1];
}

/*  PAGINATE , PostgREST caps at 1000 and returns exactly 1000 without saying so. */
async function all(table, sel, apply){
  let out = [], from = 0;
  for (;;){
    let q = sb.from(table).select(sel).range(from, from + 999).order('card_id', { ascending: true });
    if (apply) q = apply(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    out = out.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return out;
}

(async () => {
  const led = fs.readFileSync(path.join(DIR, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const reduced  = led.map(r => r.card_id);
  const inserted = led.flatMap(r => r.inserted);

  console.log('LEDGER');
  console.log('  cards reduced   : ' + reduced.length);
  console.log('  rows inserted   : ' + inserted.length);
  console.log('  last card_id    : ' + led[led.length - 1].card_id);

  const rows = await sb.from('player_season_cards').select('*', { count: 'exact', head: true });
  const base = JSON.parse(fs.readFileSync(path.join(DIR, 'base_count.json'), 'utf8')).rows;
  console.log('  table rows now  : ' + rows.count + '   (before the run ' + base + ', + ' + inserted.length +
              ' = ' + (base + inserted.length) + ')   ' + (rows.count === base + inserted.length ? 'RECONCILES' : 'DRIFT ' + (rows.count - base - inserted.length)));

  /*  THE SCORE IS READ FROM THE VIEW, ONE CARD AT A TIME IN BATCHES, because rt is computed. */
  async function rtFor(ids){
    let out = [];
    for (let i = 0; i < ids.length; i += 200){
      const { data, error } = await sb.from('player_card_view')
        .select('card_id,minutes,rt,team_name').in('card_id', ids.slice(i, i + 200));
      if (error) throw new Error(error.message);
      out = out.concat(data || []);
    }
    return out;
  }

  const red = await rtFor(reduced);
  const ins = await rtFor(inserted);

  const redUnscored = red.filter(r => r.rt == null);
  const insUnscored = ins.filter(r => r.rt == null);
  const redUnder    = red.filter(r => r.minutes < 300);
  const insUnder    = ins.filter(r => r.minutes < 300);

  console.log('\nTHE 300-MINUTE FLOOR, MEASURED RATHER THAN PREDICTED');
  console.log('  reduced cards now unscored : ' + redUnscored.length + ' of ' + red.length +
              '   (under 300m: ' + redUnder.length + ')');
  console.log('  inserted rows unscored     : ' + insUnscored.length + ' of ' + ins.length +
              '   (under 300m: ' + insUnder.length + ')');
  const insScored = ins.filter(r => r.rt != null);
  console.log('  inserted rows that DO score: ' + insScored.length +
              (insScored.length ? '   ' + insScored.map(r => r.card_id + ' ' + r.team_name + ' ' + r.minutes + 'm rt ' + r.rt).join(' | ') : ''));

  /*  A CARD UNSCORED FOR A REASON OTHER THAN THE FLOOR WOULD MAKE THE NOT-SCORED NOTE FALSE,
      so the two counts are compared rather than assumed equal.  */
  const mismatch = redUnscored.filter(r => r.minutes >= 300).concat(insUnscored.filter(r => r.minutes >= 300));
  console.log('  unscored for some OTHER reason (note would be false): ' + mismatch.length +
              (mismatch.length ? '  ' + mismatch.map(r => r.card_id + ' ' + r.minutes + 'm').join(', ') : ''));

  console.log('\nrt FINGERPRINT over every card in the live view');
  console.log('  md5(card_id:rt) : ' + await val(
    `select md5(string_agg(card_id::text||':'||coalesce(rt::text,'n'), ',' order by card_id)) from player_card_view`));
  console.log('  scored cards    : ' + await val(`select count(*)::text from player_card_view where rt is not null`));
  console.log('  total cards     : ' + await val(`select count(*)::text from player_card_view`));
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
