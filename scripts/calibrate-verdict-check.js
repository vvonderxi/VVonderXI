#!/usr/bin/env node
/*  RETIRED 2026-10-25: checkVerdictSupport left api/analyse.js with the old writer (the cited writer's drop rule
 *  and narrow check are what guard the endpoint now, scripts/calibration/cited.js). Kept for the record; it no
 *  longer runs.
 *  CALIBRATE THE CHECKING PASS BEFORE IT IS SWITCHED ON (2026-10-12).
 *
 *    node scripts/capture-verdict-evidence.js     first: the exact messages compare sends
 *    node scripts/calibrate-verdict-check.js      then: needs ANTHROPIC_API_KEY in .env, temporarily
 *
 *  It runs the SHIPPING check (api/analyse.js checkVerdictSupport, required, not copied) over
 *  every cached verdict whose evidence matches what the page sends today, and reports how many
 *  it would HOLD and why. It writes nothing to the database.
 *
 *  THE POSITIVE CONTROL decides whether the result means anything: both Salah 24/25 v Mbappe
 *  21/22 rolls from 2026-10-12 invented context ("not a serious test", "scouted him for a
 *  decade", "one of the tightest title races in years") and BOTH must be held. If either passes,
 *  the checker is too lenient and the run is void, whatever the rest says.
 *  THE OTHER HALF is the hold rate on everything else, and each hold has to be READ: a hold on a
 *  sentence the cards do support is a false hold, and a reader then sees no prose for nothing.
 *  Switch on (VV_VERDICT_CHECK=on in Vercel, Production) only when the control holds and the
 *  false holds read as rare.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');
const A = require('../api/analyse.js');
const DIR = path.join(__dirname, '..', '_local', 'verdict-check');
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set in .env. Add it for this run only, then blank it.'); process.exit(2); }
const EV = JSON.parse(fs.readFileSync(path.join(DIR, 'evidence.json'), 'utf8'));
const parse = x => typeof x === 'string' ? JSON.parse(x) : x;

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const use = EV.filter(e => e.evidenceMatches);
  const { data: rows, error } = await sb.from('verdict_cache').select('pair_key,verdict,cache_version').in('pair_key', use.map(e => e.pair_key));
  if (error) throw new Error(error.message);
  const jobs = [];
  for (const e of use) {
    const r = rows.find(x => x.pair_key === e.pair_key); if (!r) continue;
    const v = parse(r.verdict); if (v._held) continue;
    jobs.push({ label: e.pair_key + ' [' + r.cache_version.split('-').slice(0, 2).join('-') + ']', e, v, control: e.pair_key === '130728-158399' });
  }
  // the first Salah roll, deleted from the cache on 2026-10-12 and kept on disk for exactly this
  const r1f = path.join(DIR, 'salah_mbappe_roll1.json'), sm = use.find(e => e.pair_key === '130728-158399');
  if (fs.existsSync(r1f) && sm) jobs.push({ label: '130728-158399 [roll 1, deleted]', e: sm, v: parse(JSON.parse(fs.readFileSync(r1f, 'utf8'))[0].verdict), control: true });
  if (!jobs.some(j => j.control)) { console.error('no positive control in the set (is 130728-158399 captured with matching evidence?) , the run would mean nothing'); process.exit(2); }

  const res = [];
  for (const j of jobs) {
    const evidence = j.e.messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n\n');
    const c = await A.checkVerdictSupport(evidence, j.v);
    res.push({ ...j, c });
    console.log(`${c.ok ? (c.unsupported.length ? 'HOLD' : 'pass') : 'ERROR'}  ${j.control ? '(control) ' : ''}${j.label}`);
    if (c.ok) c.unsupported.forEach(f => console.log(`        "${f.quote.slice(0, 110)}" , ${f.why}`));
    else console.log('        ' + c.error);
  }
  fs.writeFileSync(path.join(DIR, 'calibration.json'), JSON.stringify(res.map(({ e, ...x }) => x), null, 1));
  const ctl = res.filter(x => x.control), rest = res.filter(x => !x.control && x.c.ok);
  const ctlHeld = ctl.filter(x => x.c.ok && x.c.unsupported.length).length;
  console.log(`\nCONTROL: ${ctlHeld} of ${ctl.length} Salah v Mbappe rolls held ${ctlHeld === ctl.length ? '(as required)' : ', VOID: the checker missed invented context'}`);
  console.log(`OTHERS: ${rest.filter(x => x.c.unsupported.length).length} of ${rest.length} held. Read every hold above: each is a true catch or a false hold.`);
  console.log(`errors: ${res.filter(x => !x.c.ok).length}. Written to _local/verdict-check/calibration.json.`);
  process.exit(ctlHeld === ctl.length ? 0 : 1);
})().catch(e => { console.error('calibration failed:', e.message); process.exit(1); });
