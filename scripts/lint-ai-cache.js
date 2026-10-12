#!/usr/bin/env node
/*  LINT THE AI'S CACHED PROSE (2026-10-12). Read-only: it never writes, never deletes, never
 *  calls a model.
 *
 *    node scripts/lint-ai-cache.js              rule checks over every cached verdict and note
 *    node scripts/lint-ai-cache.js --read 10    print 10 random CURRENT-prompt verdicts and 10
 *                                               notes in full, for the weekly read (SS C)
 *
 *  WHY. The verdicts and notes are the product's voice and the most-screenshotted thing on the
 *  platform, and until today nothing read them. The faults below were each MEASURED on the
 *  cache before this was written; this script turns those measurements into a standing check.
 *
 *  HARD RULES (a failure on a CURRENT-prompt row exits 1):
 *    tie-winner    rt_a == rt_b and the prose crowns a side ("edges it", "takes it", ...) or a
 *                  winner_card_id is stored. Measured 2026-10-04: 63 of 69 tie rows.
 *    inside-score  a Path B (inside the margin) row whose prose names either VV Score beside a
 *                  score word. The prompt forbids it; the chip beside it says "no ranking".
 *    dimension     "<Name> dimension" where Name is not one of the five.
 *    dash          an em or en dash (house rule: none, anywhere).
 *    glance-mark   a ** marked phrase in a note's glance line (exempt from emphasis since a585770).
 *  READ FLAGS (never fail, listed for a person): phrases that usually mean a claim beyond the
 *  payload , another season, a career, a later or earlier year. A pattern cannot tell a recalled
 *  fact from a supported one; only reading can, which is the honest limit of this script.
 *
 *  ROWS ARE GROUPED BY PROMPT BASE (the first two dash-separated segments of cache_version),
 *  per SS C: one prompt spans many version strings, and older-base rows regenerate on their
 *  next view, so they are reported but never fail the run. Rows with a null version are
 *  unservable and skipped.
 *
 *  CONTROL: run it before a prompt change lands and the tie-winner rule should fire on the old
 *  base's tie rows (it did: see the first run recorded in SS C).
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const A = require('../api/analyse.js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const base = v => (v || '').split('-').slice(0, 2).join('-');
const CUR = { A: base(A.VERDICT_VERSION), B: base(A.VERDICT_VERSION_JUDGE), N: base(A.NOTES_VERSION) };
const FIVE = ['Goal Threat', 'Creation', 'Progression', 'Defensive', 'Reliability'];
const WIN = /\b(edges? it|shades? it|takes? it|nicks? it|gets? the nod|wins? (it|this|the argument|the debate)|comes out (ahead|on top)|has the edge|is the better season)\b/i;
const CAREER = /\b(never (did|managed|again)|in his [A-Z][\w'-]+ years|his career|career[- ]best|went on to|would (later|go on)|the following season|the season before|the previous season|at his peak|later that year|years later)\b/i;
/*  "His Creation dimension" and "the dimension" are correct uses; the first version of this rule
    read "His Creation" as a dimension name and reported 154 false failures. A name is wrong only
    if it is neither one of the five (after a leading determiner) nor a bare determiner.  */
const DET = /^(The|His|Her|Their|Every|This|That|Each|A|An|One|Its)$/;
const badDim = cap => !(FIVE.includes(cap) || DET.test(cap) || FIVE.some(f => cap.endsWith(' ' + f)) || (cap.split(' ').length === 2 && DET.test(cap.split(' ')[0]) && FIVE.some(f => f.startsWith(cap.split(' ')[1]))));
const strs = o => { const out = []; (function walk(x, k) { if (typeof x === 'string') out.push([k, x]); else if (x && typeof x === 'object') for (const kk in x) walk(x[kk], kk); })(o, ''); return out; };
const parse = x => { if (typeof x === 'string') { try { return JSON.parse(x); } catch (e) { return { text: x }; } } return x || {}; };

async function all(table, cols) {
  const out = [];
  for (let o = 0; ; o += 1000) {
    const { data, error } = await sb.from(table).select(cols).not('cache_version', 'is', null).order(table === 'verdict_cache' ? 'pair_key' : 'card_id').range(o, o + 999);
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...data); if (data.length < 1000) return out;
  }
}

(async () => {
  const [V, N] = await Promise.all([
    all('verdict_cache', 'pair_key,verdict,winner_card_id,rt_a,rt_b,cache_version'),
    all('notes_cache', 'card_id,notes,cache_version'),
  ]);
  const hard = [], read = [], tally = {};
  const t = (b, k) => { tally[b] = tally[b] || { rows: 0 }; tally[b][k] = (tally[b][k] || 0) + 1; };

  for (const r of V) {
    const b = base(r.cache_version), path = b === CUR.A ? 'A' : b === CUR.B ? 'B' : 'old', cur = path !== 'old';
    t(b, 'rows'); const o = parse(r.verdict), S = strs(o), all = S.map(x => x[1]).join(' \n ');
    const hit = (rule, detail) => { t(b, rule); if (cur) hard.push(`${rule.padEnd(12)} verdict ${r.pair_key} [${b}] ${detail}`); };
    if (r.rt_a != null && r.rt_a === r.rt_b) {
      const m = all.match(WIN);
      if (m) hit('tie-winner', `"${m[0]}" on a tie at ${r.rt_a}`);
      else if (r.winner_card_id != null) hit('tie-winner', `winner_card_id ${r.winner_card_id} stored on a tie`);
    }
    if (path === 'B' || (path === 'old' && /judge/i.test(r.cache_version || ''))) {
      for (const rt of [r.rt_a, r.rt_b]) if (rt != null) {
        const re = new RegExp(`(VV|score|Index|rated|rating)[^.\\n]{0,30}\\b${rt}\\b|\\b${rt}\\b[^.\\n]{0,20}(VV|score|rating)`, 'i');
        const m = all.match(re); if (m) { hit('inside-score', `"${m[0].slice(0, 60)}"`); break; }
      }
    }
    for (const m of all.matchAll(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) dimension\b/g)) if (badDim(m[1])) hit('dimension', `"${m[0]}"`);
    if (/[–—]/.test(all)) hit('dash', 'em or en dash in the prose');
    const c = all.match(CAREER); if (c) { t(b, 'read-flag'); if (cur) read.push(`verdict ${r.pair_key}: "${c[0]}"`); }
  }
  for (const r of N) {
    const b = base(r.cache_version), cur = b === CUR.N; t(b, 'rows');
    const o = parse(r.notes), S = strs(o), all = S.map(x => x[1]).join(' \n ');
    const hit = (rule, detail) => { t(b, rule); if (cur) hard.push(`${rule.padEnd(12)} note ${r.card_id} [${b}] ${detail}`); };
    for (const m of all.matchAll(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) dimension\b/g)) if (badDim(m[1])) hit('dimension', `"${m[0]}"`);
    if (/[–—]/.test(all)) hit('dash', 'em or en dash in the prose');
    const g = S.filter(x => x[0] === 'glance').map(x => x[1]).join(' ');
    if (/\*\*[^*]+\*\*/.test(g)) hit('glance-mark', 'marked phrase in the glance line');
    const c = all.match(CAREER); if (c) { t(b, 'read-flag'); if (cur) read.push(`note ${r.card_id}: "${c[0]}"`); }
  }

  const ri = process.argv.indexOf('--read');
  if (ri > 0) {
    const n = +process.argv[ri + 1] || 10, pick = (arr, k) => arr.sort(() => Math.random() - 0.5).slice(0, k);
    const cv = V.filter(r => [CUR.A, CUR.B].includes(base(r.cache_version))), cn = N.filter(r => base(r.cache_version) === CUR.N);
    console.log(`WEEKLY READ , ${Math.min(n, cv.length)} of ${cv.length} current verdicts, ${Math.min(n, cn.length)} of ${cn.length} current notes. Read each against the two cards it is about.\n`);
    for (const r of pick(cv, n)) { console.log(`=== verdict ${r.pair_key}  rt ${r.rt_a} v ${r.rt_b}  [${base(r.cache_version) === CUR.B ? 'Path B, inside the margin' : 'Path A'}]`); strs(parse(r.verdict)).forEach(([k, v]) => console.log(`  ${k}: ${v}`)); console.log(); }
    for (const r of pick(cn, n)) { console.log(`=== note ${r.card_id}`); strs(parse(r.notes)).forEach(([k, v]) => console.log(`  ${k}: ${v}`)); console.log(); }
    return;
  }

  console.log(`AI CACHE LINT , ${V.length} verdicts, ${N.length} notes (stamped rows only). Current bases: Path A ${CUR.A}, Path B ${CUR.B}, notes ${CUR.N}.`);
  for (const [b, x] of Object.entries(tally).sort((a, c) => c[1].rows - a[1].rows)) {
    const tag = b === CUR.A ? ' (current Path A)' : b === CUR.B ? ' (current Path B)' : b === CUR.N ? ' (current notes)' : '';
    console.log(`  ${b.padEnd(14)}${tag.padEnd(19)} ` + Object.entries(x).map(([k, v]) => `${k} ${v}`).join(', '));
  }
  if (read.length) { console.log(`\n  ${read.length} current row(s) to READ (possible claims beyond the payload):`); read.slice(0, 30).forEach(l => console.log('    ' + l)); }
  if (hard.length) { console.log(`\nFAIL , ${hard.length} rule failure(s) on current-prompt rows:`); hard.slice(0, 40).forEach(l => console.log('  ' + l)); process.exit(1); }
  console.log('\nOK , no rule failures on current-prompt rows. Older-base rows regenerate on their next view.');
})().catch(e => { console.error('ai cache lint failed:', e.message); process.exit(2); });
