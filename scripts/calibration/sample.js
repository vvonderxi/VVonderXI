#!/usr/bin/env node
/*  THE FRESH SAMPLE FOR OPTION 1 (2026-10-24, area 9). Tools first, then Lucas.
 *
 *    node scripts/calibration/sample.js --capture   render every item of fresh_sample.json from this repo
 *                                                   (no key) -> _local/verdict-check/fresh_evidence.json
 *    node scripts/calibration/sample.js             needs the Anthropic key (environment or ~/.config/anthropic/vv.key): the cited writer runs each item
 *                                                   (cited.js: write, drop, narrow check, one regeneration,
 *                                                   else no prose), then EVERY check runs over what ships ->
 *                                                   _local/verdict-check/fresh_<time>.json and fresh_<time>.md
 *    node scripts/calibration/sample.js --tools <fresh_<time>.json>   re-run the checks on a saved run
 *    --sample scripts/calibration/fresh_sample2.json   any of the above on another sample file; the evidence and
 *                                                   run files take the sample's tag (fresh_sample2 -> fresh2_...)
 *
 *  THE METHOD (Lucas, 2026-10-24): every check runs over the shipped prose (the number and measure
 *  checks and the crown rules in code, the model's crown read, and every sentence judged alone by Sonnet
 *  against the whole rendered page), and the report gives TWO lists: the flags, which Lucas reads to
 *  confirm they are real, and every sentence nothing flagged, which he reads for what the tools cannot
 *  see. What the narrow check missed and the tools also missed is what he is looking for.
 */
const fs = require('fs'), path = require('path');
const ENV = require('./env.js');   // the key from the environment or ~/.config/anthropic/vv.key, never .env (2026-10-25)
const C = require('./cited.js'), PC = require('./prose_checks.js');
const ROOT = path.join(__dirname, '..', '..'), DIR = path.join(ROOT, '_local', 'verdict-check');
const _si = process.argv.indexOf('--sample');
const SAMPLE_FILE = _si > 0 ? path.resolve(process.argv[_si + 1]) : path.join(__dirname, 'fresh_sample.json');
const TAG = path.basename(SAMPLE_FILE).replace(/\.json$/, '').replace(/^fresh_sample/, 'fresh');   // fresh_sample -> fresh, fresh_sample2 -> fresh2
const SAMPLE = JSON.parse(fs.readFileSync(SAMPLE_FILE, 'utf8'));
const EVF = path.join(DIR, `${TAG}_evidence.json`);
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const PRICE = { 'claude-sonnet-4-6': [3, 3.75, 0.3, 15] };
function cost(usage) {
  let c = 0;
  for (const u of usage || []) { const P = PRICE[u.model] || PRICE['claude-sonnet-4-6']; c += ((u.input_tokens || 0) * P[0] + (u.cache_creation_input_tokens || 0) * P[1] + (u.cache_read_input_tokens || 0) * P[2] + (u.output_tokens || 0) * P[3]) / 1e6; }
  return c;
}
function proseText(type, p) { return type === 'verdict' ? ['who', 'p1', 'p2', 'h2h', 'verdict'].map(k => p[k] || '').join('\n\n') : [p.glance, p.scout].concat(p.notes || []).join('\n\n'); }

async function tools(run) {
  const EV = JSON.parse(fs.readFileSync(EVF, 'utf8'));
  let judgeUse = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 };
  for (const r of run.items) {
    r.flags = []; r.unflagged = []; r.dropped_counts = [];
    if (!r.prose) continue;
    const it = SAMPLE.items.find(x => x.id === r.id), ev = EV.items.find(x => x.id === r.id);
    const sents = PC.splitSentences(r.prose, it.type);
    const add = (quote, tool, why) => r.flags.push({ quote, tool, why });
    // code: numbers and measures against the whole rendered page
    const n = PC.checkNumbers(proseText(it.type, r.prose), ev);
    n.flags.forEach(f => add(f.quote, 'numbers (code)', f.why));
    PC.checkMeasures(proseText(it.type, r.prose), ev).forEach(f => add(f.quote, 'measures (code)', f.why));
    // crowns: the model reads who each sentence argues for, code decides against the page
    if (it.type === 'verdict') {
      const sides = PC.pageFigures(ev).sides;
      const cr = await PC.readCrowns(sents, sides[0].surname, sides[1].surname);
      if (cr.ok) PC.checkCrowns(sents, cr.reads, ev).flags.forEach(f => add(f.quote, 'crowns (model read, code rule)', f.why));
      else add('(the whole piece)', 'crowns', 'the crown read failed: ' + cr.error);
    }
    // every sentence judged alone by Sonnet against the whole rendered page
    const page = PC.judgePage(ev);
    for (let i = 0; i < sents.length; i += 6) {
      const res = await Promise.all(sents.slice(i, i + 6).map(s => PC.judgeSentence(page, s.sentence, 'sonnet')));
      res.forEach((j, k) => {
        if (j.usage) for (const key of Object.keys(judgeUse)) judgeUse[key] += j.usage[key] || 0;
        if (!j.ok) add(sents[i + k].sentence, 'sentence judge (Sonnet)', 'failed to answer: ' + j.error);
        else if (j.unsupported && (PC.isCountClaim(j.claim) || PC.isCountClaim(sents[i + k].sentence))) (r.dropped_counts = r.dropped_counts || []).push({ sentence: sents[i + k].sentence, claim: j.claim, why: j.why });   // kept on the record, not in the flags (Lucas, 2026-10-25): so the question "did the filter hide a true catch" can be answered from the run file
        else if (j.unsupported) add(sents[i + k].sentence, 'sentence judge (Sonnet)', j.claim + ' , ' + j.why);   // the sentence too (2026-10-25): the judge counted honours as tags on "Immobile's carries one" where the count word sat earlier in the sentence   // code counts tags and honours; the model's counts are dropped (2026-10-24)
      });
    }
    const norm = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    for (const s of sents) if (!r.flags.some(f => norm(s.sentence).includes(norm(f.quote)) || norm(f.quote).includes(norm(s.sentence)))) r.unflagged.push(s.sentence);
    console.log(`${r.id}: ${sents.length} sentences shipped, ${r.flags.length} flags, ${r.unflagged.length} unflagged`);
  }
  run.tools_usage = { model: 'claude-sonnet-4-6', ...judgeUse };
  return run;
}

function report(run) {
  const L = [`# ${run.sample || 'Fresh sample'}, option 1 (cited writer), ${run.at}`, ''];
  const by = o => run.items.filter(r => r.outcome === o).length;
  L.push(`Shipped first time: ${by('shipped')}. Shipped on regeneration: ${by('shipped-on-regeneration')}. No prose: ${by('no-prose')}. Of ${run.items.length}.`);
  L.push(`Cost: writer and narrow check about $${run.cost_write.toFixed(2)}, the tools about $${(run.cost_tools || 0).toFixed(2)}.`, '');
  // worth reading, not only defensible (Lucas, 2026-10-24): sentences written against sentences left, per paragraph
  L.push('## Written against survived (the last attempt; a pass with four of twelve left is not prose anyone wants)', '',
    '| piece | outcome | written | survived | per paragraph, left of written |', '|---|---|---|---|---|');
  for (const r of run.items) {
    const a = [...r.attempts].reverse().find(x => !x.error);
    if (!a) { L.push(`| ${r.id} | ${r.outcome} | writer failed | | |`); continue; }
    const paras = [...new Set(a.units.map(u => u.para))];
    const per = paras.map(p => { const us = a.units.filter(u => u.para === p); return `${p} ${us.filter(u => u.kept).length}/${us.length}`; }).join(', ');
    L.push(`| ${r.id} | ${r.outcome}${r.attempts.length > 1 ? ` (attempt ${a.attempt})` : ''} | ${a.total} | ${a.total - a.dropped} | ${per} |`);
  }
  L.push('');
  for (const r of run.items) {
    L.push(`## ${r.id}: ${r.outcome.toUpperCase()}` + (r.result ? `  (page: "${r.result}")` : ''));
    r.attempts.forEach(a => {
      if (a.error) { L.push(`- attempt ${a.attempt}: the writer failed: ${a.error}`); return; }
      L.push(`- attempt ${a.attempt}: ${a.total - a.dropped} of ${a.total} sentences kept` + (a.rejected ? `; REJECTED: ${a.reasons.join('; ')}` : ''));
      a.units.filter(u => !u.kept).forEach(u => L.push(`  - deleted [${u.field}] "${u.s}" , ${u.why.join('; ')}`));
    });
    if (r.prose) {
      L.push('', '### FLAGS (read to confirm they are real)');
      if (!r.flags.length) L.push('none');
      r.flags.forEach(f => L.push(`- [${f.tool}] "${f.quote}" , ${f.why}`));
      L.push('', '### NOTHING FLAGGED THESE (read for what the tools cannot see)');
      r.unflagged.forEach(s => L.push(`- ${s}`));
    }
    L.push('');
  }
  return L.join('\n');
}

(async () => {
  if (process.argv.includes('--capture')) {
    const { captureItems } = require('./capture.js');
    const out = await captureItems(SAMPLE.items, { audit: true });
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(EVF, JSON.stringify({ captured_at: new Date().toISOString(), items: out }, null, 1));
    for (const e of out.filter(x => x.captured && x.page && x.page.compare)) console.log(`${e.id}: page says "${(e.page.compare.match(/The Verdict\n([^\n]+)/) || [])[1]}"`);
    const miss = out.filter(x => !x.captured).length, unchecked = out.filter(x => x.unchecked && x.unchecked.length);
    for (const x of unchecked) console.log(`AUDIT: ${x.id} sends numbers the rendered pages do not print: ${JSON.stringify(x.unchecked)}`);
    console.log(`\n${out.length - miss} of ${out.length} captured -> ${path.relative(ROOT, EVF)}${unchecked.length ? `; AUDIT FAILED on ${unchecked.length}` : '; audit clean'}`);
    process.exit((miss || unchecked.length) ? 1 : 0);   // an audit that printed its misses and exited 0 was a check that could not fail (2026-10-25)
  }
  const NO_TOOLS = process.argv.includes('--no-tools');   // an endpoint pass can run without the key: the writer runs on the server; the tools run later with --tools <file>
  if (!process.env.ANTHROPIC_API_KEY && !(NO_TOOLS && process.argv.includes('--endpoint'))) { console.error('no Anthropic key: export ANTHROPIC_API_KEY or put the key in ' + ENV.KEY_FILE + ' (never in .env).'); process.exit(2); }
  if (!fs.existsSync(EVF)) { console.error('no evidence: run with --capture first'); process.exit(2); }
  const ti = process.argv.indexOf('--tools');
  if (ti > 0) {
    const f = path.resolve(process.argv[ti + 1]), run = JSON.parse(fs.readFileSync(f, 'utf8'));
    await tools(run); run.cost_tools = cost([run.tools_usage]);
    fs.writeFileSync(f, JSON.stringify(run, null, 1)); fs.writeFileSync(f.replace(/\.json$/, '.md'), report(run));
    console.log(`\n-> ${path.relative(ROOT, f.replace(/\.json$/, '.md'))}`);
    return;
  }
  const EV = JSON.parse(fs.readFileSync(EVF, 'utf8'));
  /*  --endpoint <url>: THE PROOF RUN GOES THROUGH THE DEPLOYED FUNCTION, NOT THIS SCRIPT (Lucas, 2026-10-25). Each
      item's exact request body, as the page sent it and the capture recorded it, is POSTed to <url>/api/analyse
      with an Origin the allowlist accepts; the response is what a reader would get. The outcome is read off the
      response shape (a verdict, { held } for no prose, { off } for a card with none), then the same tools run over
      what shipped. The server does not return the writer's attempts, so the deletion record and the citation-based
      hole count are not available on an endpoint run: the tools and the reading are.  */
  const ei = process.argv.indexOf('--endpoint');
  if (ei > 0) {
    const base = process.argv[ei + 1].replace(/\/$/, ''), origin = process.argv.includes('--origin') ? process.argv[process.argv.indexOf('--origin') + 1] : base;
    const run = { at: new Date().toISOString(), sample: path.basename(SAMPLE_FILE), evidence_captured_at: EV.captured_at, endpoint: base, writer: C.WRITER_MODEL, check: C.CHECK_MODEL, items: [] };
    for (const it of SAMPLE.items) {
      const ev = EV.items.find(x => x.id === it.id);
      if (!ev || !ev.captured || !ev.body) { console.error(it.id + ': no captured request body (re-run --capture)'); process.exit(2); }
      const t0 = Date.now();
      let status = 0, data = null;
      try {
        const r = await fetch(base + '/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': origin }, body: JSON.stringify(ev.body) });
        status = r.status; data = await r.json().catch(() => null);
      } catch (e) { data = { error: 'fetch threw: ' + e.message }; }
      const secs = Math.round((Date.now() - t0) / 100) / 10;
      let outcome, prose = null;
      if (status === 200 && data && data.verdict) { outcome = data.cached ? 'shipped (cached)' : 'shipped'; prose = data.verdict; }
      else if (status === 200 && data && typeof data.glance === 'string') { outcome = data.cached ? 'shipped (cached)' : 'shipped'; prose = { glance: data.glance, scout: data.scout, notes: data.notes }; }
      else if (status === 200 && data && (data.held || data.off)) outcome = 'no-prose';
      else outcome = 'failed ' + status + ' ' + JSON.stringify(data).slice(0, 120);
      const pack = it.type === 'verdict' ? C.verdictFacts(ev) : C.notesFacts(ev.player);
      run.items.push({ id: it.id, type: it.type, result: pack.result, winner: pack.winner, facts: pack.facts, outcome, why: null, prose, attempts: [], status, seconds: secs, winner_card_id: data && data.winner_card_id });
      console.log(`${it.id}: ${outcome}  (${secs}s)`);
    }
    run.cost_write = null;
    const f = path.join(DIR, `${TAG}_endpoint_${stamp()}.json`);
    const failedItems = run.items.filter(x => /^failed/.test(x.outcome)).length;
    if (NO_TOOLS) { fs.writeFileSync(f, JSON.stringify(run, null, 1)); console.log(`\nsaved without the tools -> ${path.relative(ROOT, f)}   (run: node scripts/calibration/sample.js --sample ${path.relative(ROOT, SAMPLE_FILE)} --tools ${path.relative(ROOT, f)} with the key in the environment or ~/.config/anthropic/vv.key)`); if (failedItems) { console.error(`${failedItems} request(s) FAILED at the endpoint`); process.exit(1); } return; }
    console.log('\nthe writer ran on the server (its spend is on the account, not measured here). Now every check over what shipped:\n');
    await tools(run); run.cost_tools = cost([run.tools_usage]);
    fs.writeFileSync(f, JSON.stringify(run, null, 1)); fs.writeFileSync(f.replace(/\.json$/, '.md'), report(run));
    console.log(`\ntools: about $${run.cost_tools.toFixed(2)}\n-> ${path.relative(ROOT, f)}\n-> ${path.relative(ROOT, f.replace(/\.json$/, '.md'))}`);
    return;
  }
  const run = { at: new Date().toISOString(), sample: path.basename(SAMPLE_FILE), evidence_captured_at: EV.captured_at, writer: C.WRITER_MODEL, check: C.CHECK_MODEL, items: [] };
  const usage = [];
  for (const it of SAMPLE.items) {
    const ev = EV.items.find(x => x.id === it.id);
    if (!ev || !ev.captured) { console.error(it.id + ': not captured'); process.exit(2); }
    const pack = it.type === 'verdict' ? C.verdictFacts(ev) : C.notesFacts(ev.player);
    const r = await C.runPiece(pack);
    (r.usage || []).forEach(u => usage.push(u));
    run.items.push({ id: it.id, type: it.type, result: pack.result, winner: pack.winner, facts: pack.facts, outcome: r.outcome, why: r.why || null, prose: r.prose, attempts: r.attempts });
    console.log(`${it.id}: ${r.outcome}` + r.attempts.map(a => a.error ? `  [${a.attempt}: writer failed]` : `  [${a.attempt}: kept ${a.total - a.dropped}/${a.total}${a.rejected ? ', rejected: ' + a.reasons.join('; ') : ''}]`).join(''));
  }
  run.cost_write = cost(usage);
  console.log(`\nwriter and narrow check: about $${run.cost_write.toFixed(2)}. Now every check over what shipped:\n`);
  await tools(run); run.cost_tools = cost([run.tools_usage]);
  const f = path.join(DIR, `${TAG}_${stamp()}.json`);
  fs.writeFileSync(f, JSON.stringify(run, null, 1)); fs.writeFileSync(f.replace(/\.json$/, '.md'), report(run));
  console.log(`\ntools: about $${run.cost_tools.toFixed(2)}\n-> ${path.relative(ROOT, f)}\n-> ${path.relative(ROOT, f.replace(/\.json$/, '.md'))}`);
})().catch(e => { console.error('sample failed:', e.stack || e.message); process.exit(1); });
