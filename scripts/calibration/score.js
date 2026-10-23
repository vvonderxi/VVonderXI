#!/usr/bin/env node
/*  SCORE THE CHECKER AGAINST THE LABELLED SET, PER KIND (2026-10-22).
 *
 *    node scripts/calibration/capture.js --audit     first: today's evidence, no key needed
 *    node scripts/calibration/score.js --selftest     the scorer's own control, no key needed
 *    node scripts/calibration/score.js [--runs N]     the run: needs ANTHROPIC_API_KEY in .env, for this run only
 *
 *  It runs the SHIPPING checker (api/analyse.js checkVerdictSupport, required, not copied) over the
 *  twelve stored pieces of prose in verdict_check_set.json, each against the message its page sends
 *  TODAY, and matches what the checker flags to the labels.
 *
 *  WHAT IT REPORTS, AND NEVER AS ONE NUMBER (area 9: one number is a number about kind 1):
 *    - per kind (1, 2, 3, 3b, 4, 5; defined in the set's "what"): caught of total, as counts.
 *    - false holds: flags that land on a "leave" sentence, split into figures, judgements and card
 *      text (a claim the rendered card states, in the Chronicle or the honour and tag copy).
 *    - unlabelled flags: listed in full, to be read by a person, counted neither way.
 *    - report_only: whether the leaked field name was flagged.
 *    - run to run: every row is shown per run, so a sentence caught once in two is visible.
 *  It writes nothing to the database. Results go to _local/verdict-check/score_<time>.json.
 *
 *  MATCHING. A flag scores every flag label it covers (the sentence rule, below). A flag matches a labelled sentence when, after lowercasing and stripping markdown and
 *  punctuation, either contains the other, or the flag covers at least 60% of the label's words.
 *  --selftest proves the matcher before any money is spent: a fake checker that flags exactly the
 *  "flag" sentences must score every kind complete with no false hold, and one that flags exactly
 *  the "leave" sentences must score nothing caught and every leave sentence held. If either fails,
 *  the matcher is broken and a real run would measure the matcher, not the checker.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const A = require('../../api/analyse.js');
const ROOT = path.join(__dirname, '..', '..');
const SET = JSON.parse(fs.readFileSync(path.join(__dirname, 'verdict_check_set.json'), 'utf8'));
const EVF = path.join(ROOT, '_local', 'verdict-check', 'evidence_set.json');
const RUNS = (() => { const i = process.argv.indexOf('--runs'); return i > 0 ? Math.max(1, +process.argv[i + 1]) : 2; })();
const SELFTEST = process.argv.includes('--selftest');

const norm = s => String(s).toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function matches(flag, quote) {
  const f = norm(flag), q = norm(quote);
  if (!f || !q) return false;
  if (f.includes(q) || q.includes(f)) return true;
  const qw = q.split(' '), fw = new Set(f.split(' '));
  return qw.filter(w => fw.has(w)).length / qw.length >= 0.6;
}
/*  The checker reads prose fields by name (verdictProse: who, p1, p2, h2h, verdict). Notes carry
    glance, scout and a list of stanzas, so they are handed over under those names in that order.  */
function proseFor(it) {
  if (it.type === 'verdict') return it.prose;
  const n = it.prose;
  return { who: n.glance || '', p1: n.scout || '', p2: (Array.isArray(n.notes) ? n.notes : [String(n.notes || '')]).join('\n\n') };
}
/*  EACH FLAG GOES TO THE ONE LABEL IT FITS BEST, never to two. Labels can overlap (J4 contains N14,
    "Creation at the 71st percentile"), and a first-match rule let one flag claim both while another
    went unassigned; the selftest caught it. Best fit: an exact match beats containment, containment
    prefers the label closest in length, and word overlap comes last.  */
function fit(flag, quote) {
  if (!matches(flag, quote)) return -1;
  const f = norm(flag), q = norm(quote);
  if (f === q) return 3;
  if (f.includes(q) || q.includes(f)) return 2 + Math.min(f.length, q.length) / Math.max(f.length, q.length) * 0.99;
  return 1;
}
/*  SENTENCE RULE (Lucas, 2026-10-23). A flag can cover more than one label: "Sixteen goals, eight
    assists, 2,933 minutes, 35 starts, never absent" holds a leave figure and a kind 2 together, and a
    checker that flags the sentence has flagged the starts. So a flag scores EVERY flag label it covers,
    and is a false hold only when it covers no flag label, charged to the leave label it fits best.  */
const KINDS = [1, 2, 3, '3b', 4, 5];
function scoreRun(flagsById) {
  const kinds = {}, rows = [], falseHolds = [], unlabelled = [], reportOnly = [];
  KINDS.forEach(k => kinds[k] = [0, 0]);
  for (const it of SET.items) {
    const flags = flagsById[it.id] || [];
    const labels = [].concat(it.flag.map(l => ({ cls: 'flag', l })), it.leave.map(l => ({ cls: 'leave', l })), it.report_only.map(l => ({ cls: 'report', l })));
    const hit = labels.map(() => null);
    flags.forEach(f => {
      const cov = labels.map((x, i) => ({ i, v: fit(f.quote, x.l.quote) })).filter(c => c.v >= 0);
      const fl = cov.filter(c => labels[c.i].cls === 'flag');
      const pick = cls => cov.filter(c => labels[c.i].cls === cls).sort((a, b) => b.v - a.v)[0];
      if (fl.length) fl.forEach(c => { hit[c.i] = hit[c.i] || f; });
      else if (pick('leave')) { const c = pick('leave'); hit[c.i] = hit[c.i] || f; }
      else if (pick('report')) { const c = pick('report'); hit[c.i] = hit[c.i] || f; }
      else unlabelled.push({ item: it.id, quote: f.quote, why: f.why });
    });
    labels.forEach((x, i) => {
      const f = hit[i];
      if (x.cls === 'flag') { kinds[x.l.kind][1]++; if (f) kinds[x.l.kind][0]++; rows.push({ item: it.id, kind: x.l.kind, quote: x.l.quote, caught: !!f }); }
      else if (x.cls === 'leave') { if (f) falseHolds.push({ item: it.id, type: x.l.type, quote: x.l.quote, flag: f.quote, why: f.why }); }
      else reportOnly.push({ item: it.id, quote: x.l.quote, flagged: !!f });
    });
  }
  const leaveN = SET.items.reduce((a, it) => a + it.leave.length, 0);
  return { kinds, rows, falseHolds, leaveN, unlabelled, reportOnly };
}
function print(label, s) {
  console.log(`\n=== ${label}`);
  for (const k of KINDS) console.log(`  kind ${k}: caught ${s.kinds[k][0]} of ${s.kinds[k][1]}`);
  const ty = t => s.falseHolds.filter(x => t.test(x.type)).length;
  console.log(`  false holds: ${s.falseHolds.length} of ${s.leaveN} leave sentences (${ty(/^figure/)} figures, ${ty(/judgement/)} judgements, ${ty(/card text/)} card text)`);
  s.falseHolds.forEach(x => console.log(`    FALSE HOLD [${x.item}, ${x.type}] "${x.quote.slice(0, 90)}" , checker said: ${x.why || ''}`));
  s.rows.filter(r => !r.caught).forEach(r => console.log(`    missed [${r.item}, kind ${r.kind}] "${r.quote.slice(0, 90)}"`));
  console.log(`  unlabelled flags (read each by hand): ${s.unlabelled.length}`);
  s.unlabelled.forEach(x => console.log(`    [${x.item}] "${String(x.quote).slice(0, 110)}" , ${x.why || ''}`));
  s.reportOnly.forEach(x => console.log(`  report only [${x.item}] "${x.quote}": ${x.flagged ? 'flagged' : 'not flagged'}`));
}

(async () => {
  if (SELFTEST) {
    const good = {}, bad = {};
    for (const it of SET.items) { good[it.id] = it.flag.map(l => ({ quote: l.quote, why: 'planted' })); bad[it.id] = it.leave.map(n => ({ quote: n.quote, why: 'planted' })); }
    const g = scoreRun(good), b = scoreRun(bad);
    const gOk = KINDS.every(k => g.kinds[k][0] === g.kinds[k][1]) && g.falseHolds.length === 0 && g.unlabelled.length === 0;
    const bOk = KINDS.every(k => b.kinds[k][0] === 0) && b.falseHolds.length === b.leaveN && b.unlabelled.length === 0;
    /*  C, the sentence rule: one flag on a whole sentence that holds a leave figure and a kind 2.  */
    const c = scoreRun({ 'palmer-saka': [{ quote: 'Sixteen goals, eight assists, 2,933 minutes, 35 starts, never absent.', why: 'planted' }] });
    const cOk = c.rows.some(r => r.quote === '35 starts' && r.caught) && c.falseHolds.length === 0 && c.unlabelled.length === 0;
    print('SELFTEST A: a checker that flags exactly the flag sentences', g);
    print('SELFTEST B: a checker that flags exactly the leave sentences', b);
    console.log(`\nSELFTEST ${gOk && bOk && cOk ? 'PASS' : 'FAIL'}: A ${gOk ? 'scored every kind complete with no false hold' : 'WRONG'}, B ${bOk ? 'caught nothing and held every leave sentence' : 'WRONG'}, C ${cOk ? 'a flag on a mixed sentence scored its kind 2 and held nothing' : 'WRONG'}`);
    process.exit(gOk && bOk && cOk ? 0 : 1);
  }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set in .env. Add it for this run only, then blank it.'); process.exit(2); }
  if (!fs.existsSync(EVF)) { console.error('no evidence: run node scripts/calibration/capture.js --audit first'); process.exit(2); }
  const EV = JSON.parse(fs.readFileSync(EVF, 'utf8'));
  const runs = [];
  for (let r = 1; r <= RUNS; r++) {
    const flagsById = {}, errors = [];
    for (const it of SET.items) {
      const e = EV.items.find(x => x.id === it.id);
      if (!e || !e.captured) { errors.push(it.id + ': no evidence'); continue; }
      const c = await A.checkVerdictSupport(e.evidence, proseFor(it));
      if (!c.ok) { errors.push(it.id + ': ' + c.error); continue; }
      flagsById[it.id] = c.unsupported;
    }
    const s = scoreRun(flagsById); s.errors = errors; runs.push({ flagsById, score: s });
    print(`RUN ${r} of ${RUNS}`, s);
    if (errors.length) console.log(`  ERRORS (${errors.length}), the run is incomplete:\n    ` + errors.join('\n    '));
  }
  const f = path.join(ROOT, '_local', 'verdict-check', 'score_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  fs.writeFileSync(f, JSON.stringify({ evidence_captured_at: EV.captured_at, runs }, null, 1));
  console.log(`\nwritten to ${path.relative(ROOT, f)}`);
})().catch(e => { console.error('score failed:', e.message); process.exit(1); });
