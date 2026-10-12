#!/usr/bin/env node
/*  EVERY FIELD THE CODE SENDS MUST BE DECLARED ON THE PRIVACY PAGE (2026-10-12).
 *
 *    node scripts/check-privacy-fields.js        exits 1 on any undeclared field
 *
 *  WHY IT EXISTS. On 2026-10-11 a `search_performed` event started sending the typed search
 *  text to Vercel. The privacy page said Vercel counts page views and that searches which
 *  find something are not recorded. Both became false, nothing errored, and it was found a day
 *  later only because someone was mapping what nothing verifies. This is the check that would
 *  have failed that commit.
 *
 *  WHAT IT DOES. It reads the code, not the docs, for every channel that sends data:
 *    - Vercel named events     window.va('event', { name, data:{ ...fields } })
 *    - our event table         VVCore.vvBeacon(kind, key)  -> public.vv_events
 *    - the waitlist            fetch(.../rest/v1/waitlist_emails, body:{ ...fields })
 *    - the AI rate limiter     sb.from('api_rate_events').insert({ ...fields })  (server side)
 *  Each (channel, event, field) must appear in MANIFEST below, and each MANIFEST entry names a
 *  phrase that must appear in the privacy page's VISIBLE text (comments, scripts and styles
 *  stripped). So the check fails in three ways:
 *    1. the code sends something the manifest does not know          -> declare it, or stop
 *    2. the manifest's phrase is no longer on the privacy page        -> the page changed
 *    3. (warning only) the manifest declares something no code sends  -> stale declaration
 *
 *  WHAT IT CANNOT DO, STATED SO NOBODY READS A PASS AS MORE THAN IT IS. It cannot tell whether
 *  the privacy SENTENCE is a fair description of the field, only that a sentence about it
 *  exists. It sees only the four channels above; a new kind of outbound call (another
 *  provider, a new table) is invisible until a channel is added here. And it reads the source
 *  with patterns, so a call written in an unusual shape can slip past: the control test below
 *  is what proves the patterns still match the code as written.
 *
 *  CONTROL (run when this file changes): add `query:q` to the homepage search_performed data,
 *  run, expect FAIL naming va search_performed.query; remove it, expect OK.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

/*  The declarations. `phrase` is matched case-insensitively against the privacy page's visible
    text, whitespace collapsed. Keep each phrase short and specific to the field it declares. */
const MANIFEST = [
  // Vercel named events
  { ch: 'va', ev: 'card_viewed',          field: 'player', phrase: 'which card was opened' },
  { ch: 'va', ev: 'email_signup',         field: 'source', phrase: 'that someone joined a waitlist, and which one' },
  { ch: 'va', ev: 'home_pair_opened',     field: 'pair',   phrase: 'which pairing on the home page was opened' },
  { ch: 'va', ev: 'search_performed',     field: 'page',   phrase: 'that a search ran on the home page or a card page' },
  { ch: 'va', ev: 'search_performed',     field: 'results',phrase: 'how many results it found' },
  { ch: 'va', ev: 'search_result_opened', field: 'page',   phrase: 'the position of a home page result that was opened' },
  { ch: 'va', ev: 'search_result_opened', field: 'rank',   phrase: 'the position of a home page result that was opened' },
  // our own event table: the beacon sends a kind and one key
  { ch: 'beacon', ev: 'card',        field: 'key', phrase: 'that a card was opened, and which one' },
  { ch: 'beacon', ev: 'compare',     field: 'key', phrase: 'that two seasons were compared, and which pair' },
  { ch: 'beacon', ev: 'search_miss', field: 'key', phrase: 'the text of a search that found nothing, cut to 120 characters' },
  { ch: 'beacon', ev: 'cmp_step',    field: 'key', phrase: 'which steps of a comparison a visit reached' },
  // the waitlist
  { ch: 'waitlist', ev: 'waitlist_emails', field: 'email',  phrase: 'your email address, and which list you joined' },
  { ch: 'waitlist', ev: 'waitlist_emails', field: 'source', phrase: 'your email address, and which list you joined' },
  // the AI rate limiter (server)
  { ch: 'ratelimit', ev: 'api_rate_events', field: 'ip',          phrase: 'we store your ip address, the time and the kind of request' },
  { ch: 'ratelimit', ev: 'api_rate_events', field: 'kind',        phrase: 'we store your ip address, the time and the kind of request' },
  { ch: 'ratelimit', ev: 'api_rate_events', field: 'finished_at', phrase: 'we store your ip address, the time and the kind of request' },
];

const shipping = execSync('git ls-files "*.html"', { cwd: ROOT }).toString().split('\n')
  .filter(f => f && !f.startsWith('_') && !f.startsWith('docs/') && !/demo|mock|^search/.test(f));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const stripJsComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

const keysOf = obj => {   // top-level keys of a JS object literal's body, shorthand included
  const out = []; let depth = 0, tok = '';
  for (const ch of obj + ',') {
    if ('{(['.includes(ch)) depth++;
    else if ('})]'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { const m = tok.trim().match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*(:|$)/); if (m) out.push(m[1]); tok = ''; }
    else tok += ch;
  }
  return out;
};
const bodyAfter = (s, i) => {   // the {...} starting at or after index i, brace-matched
  const a = s.indexOf('{', i); if (a < 0) return ''; let d = 0;
  for (let j = a; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) return s.slice(a + 1, j); }
  return '';
};

const sent = [];   // { ch, ev, field, where }
for (const f of [...shipping, 'vv-core.js']) {
  const src = stripJsComments(read(f).replace(/<!--[\s\S]*?-->/g, ''));
  for (const m of src.matchAll(/va\(\s*['"]event['"]\s*,/g)) {
    const obj = bodyAfter(src, m.index);
    const name = (obj.match(/name\s*:\s*['"]([\w-]+)['"]/) || [])[1];
    const di = obj.search(/data\s*:\s*\{/);
    if (!name) { sent.push({ ch: 'va', ev: '(unnamed)', field: '(unparsed)', where: f }); continue; }
    if (di < 0) { sent.push({ ch: 'va', ev: name, field: '(no data object)', where: f }); continue; }
    for (const k of keysOf(bodyAfter(obj, di))) sent.push({ ch: 'va', ev: name, field: k, where: f });
  }
  for (const m of src.matchAll(/vvBeacon\(\s*['"]([\w-]+)['"]/g)) sent.push({ ch: 'beacon', ev: m[1], field: 'key', where: f });
  for (const m of src.matchAll(/vvBeacon\(\s*([^'"\s,)][^,)]*)\s*,/g)) if (!/^kind$/.test(m[1])) sent.push({ ch: 'beacon', ev: '(dynamic kind: ' + m[1] + ')', field: 'key', where: f });
  for (const m of src.matchAll(/rest\/v1\/waitlist_emails/g)) {
    const seg = src.slice(m.index, m.index + 600), b = seg.match(/body\s*:\s*JSON\.stringify\(\s*\{([^}]*)\}/);
    if (!b) { sent.push({ ch: 'waitlist', ev: 'waitlist_emails', field: '(unparsed body)', where: f }); continue; }
    for (const k of keysOf(b[1])) sent.push({ ch: 'waitlist', ev: 'waitlist_emails', field: k, where: f });
  }
}
{ const f = 'api/analyse.js', src = stripJsComments(read(f));
  for (const m of src.matchAll(/from\(\s*['"]api_rate_events['"]\s*\)\s*\.insert\(/g))
    for (const k of keysOf(bodyAfter(src, m.index + m[0].length - 1))) sent.push({ ch: 'ratelimit', ev: 'api_rate_events', field: k, where: f }); }

const privacy = read('privacy.html').replace(/<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, ' ').replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').toLowerCase();

const key = x => x.ch + ' ' + x.ev + '.' + x.field;
const declared = new Map(MANIFEST.map(d => [key(d), d]));
const problems = [], warnings = [];
const seen = new Set();
for (const s of sent) {
  const k = key(s); if (seen.has(k + s.where)) continue; seen.add(k + s.where);
  if (!declared.has(k)) problems.push(`UNDECLARED  ${k}  (sent from ${s.where}) , declare it on the privacy page and in MANIFEST, or stop sending it`);
}
for (const d of MANIFEST) {
  if (!privacy.includes(d.phrase.toLowerCase())) problems.push(`MISSING ON PAGE  ${key(d)}  , privacy.html no longer says "${d.phrase}"`);
  if (!sent.some(s => key(s) === key(d))) warnings.push(`declared but not sent  ${key(d)}`);
}
const channels = ['va', 'beacon', 'waitlist', 'ratelimit'].map(c => c + ' ' + sent.filter(s => s.ch === c).length).join(', ');
console.log(`check-privacy-fields: ${sent.length} sends found (${channels}) across ${shipping.length + 2} files, ${MANIFEST.length} declarations.`);
warnings.forEach(w => console.log('  warn  ' + w));
if (problems.length) { problems.forEach(p => console.log('  FAIL  ' + p)); console.log(`FAIL , ${problems.length} problem(s).`); process.exit(1); }
console.log('OK , every field the code sends is declared on the privacy page.');
