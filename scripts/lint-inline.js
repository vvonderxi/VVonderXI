#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  INLINE LINTER , counts the CSS rules a browser would KEEP against the rules the
//  source DECLARES, and syntax-checks the inline <script> blocks.
//
//  WHY THIS EXISTS. There is no build step, so nothing parses the inline blocks before
//  they reach production, and a structural error in CSS does not fail loudly , it makes
//  the parser DISCARD a rule and carry on. Two live examples, both found by eye long
//  after they shipped:
//    , 0260a90 deleted an @media OPENER and left its closing brace, so depth went
//      negative and the next rule (.cardgrid display:grid) was dropped. The card grid
//      rendered as one column on rankings.html and in card.html's search overlay for
//      three days. grid-template-columns survived in its media variants, so the columns
//      were right and inert, which is exactly why nobody spotted it in the CSS.
//    , an orphan */ in card.html once closed a comment early and cost 42 of 45 rules.
//  Both are invisible to `node --check` (it does not reach CSS) and to a diff of computed
//  styles scoped to the rules you MEANT to change.
//
//  HOW THE COUNT WORKS. A real CSS parser is the honest way to count survivors, but this
//  repo has two dependencies and adding one for a lint script is not worth it. Instead the
//  scanner models the ONE recovery behaviour that produces the bug: at depth 0 a stray `}`
//  is a parse error, and the parser recovers by discarding through the NEXT block. So the
//  survivor count is the declared count minus one rule per stray brace, and the reported
//  line is where a browser would start dropping.
//
//  It is deliberately structural, not semantic. It does not know whether a property is
//  valid; it knows whether a rule SURVIVES. That is the failure this repo actually has.
//
//  KNOWN LIMIT, stated rather than hidden: only the stray-brace case is MODELLED as rule
//  loss, so the surviving/declared numbers are exact for that one. An orphan */ or an
//  unclosed block is REPORTED with its line but not costed, because the recovery there
//  depends on what the swallowed text happens to contain, and guessing a number would be
//  worse than not printing one. Treat any fault as "rules are being lost, go look".
//
//  USAGE
//    node scripts/lint-inline.js                 all tracked .html at the repo root
//    node scripts/lint-inline.js card.html       one or more named files
//    node scripts/lint-inline.js --json          machine-readable, for a hook or CI
//  Exit code 1 if any file has a structural break, so it can gate a commit.
// ══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const files = args.filter(a => !a.startsWith('--'));

// ── Walk CSS once, honouring comments and strings, and record structure. ──────────
// Returns declared/surviving rule counts plus every structural fault with its LINE,
// counted in the FILE, not in the extracted block, so the number is clickable.
function scanCSS(css, baseLine) {
  const faults = [];
  let i = 0, depth = 0, declared = 0, strayBraces = 0;
  let atRuleDepth = null;          // depth at which the current at-rule block opened
  const lineAt = pos => baseLine + css.slice(0, pos).split('\n').length - 1;
  let preludeStart = 0;

  while (i < css.length) {
    const ch = css[i];

    // comments , the orphan */ family
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) { faults.push({ kind: 'unclosed-comment', line: lineAt(i) }); break; }
      i = end + 2; continue;
    }
    if (ch === '*' && css[i + 1] === '/') {
      // a */ reached OUTSIDE a comment: the opener was deleted or eaten
      faults.push({ kind: 'orphan-comment-close', line: lineAt(i) });
      i += 2; continue;
    }

    // strings , a stray brace inside url() or content:"}" must not count
    if (ch === '"' || ch === "'") {
      const q = ch; i++;
      while (i < css.length && css[i] !== q) { if (css[i] === '\\') i++; i++; }
      i++; continue;
    }

    if (ch === '{') {
      const prelude = css.slice(preludeStart, i).trim();
      if (prelude.startsWith('@')) atRuleDepth = depth;      // @media / @supports wrapper
      else if (prelude) declared++;                          // a selector rule
      depth++; i++; preludeStart = i; continue;
    }

    if (ch === '}') {
      depth--;
      if (depth < 0) {
        // THE BUG. At depth 0 a } is a parse error; the browser discards through the
        // next block, so one declared rule after this point never reaches cssRules.
        strayBraces++;
        faults.push({ kind: 'stray-close-brace', line: lineAt(i) });
        depth = 0;
      }
      if (atRuleDepth !== null && depth === atRuleDepth) atRuleDepth = null;
      i++; preludeStart = i; continue;
    }

    if (ch === ';') { i++; preludeStart = i; continue; }
    i++;
  }

  if (depth > 0) faults.push({ kind: 'unclosed-block', line: lineAt(css.length - 1), depth });

  return { declared, surviving: Math.max(0, declared - strayBraces), strayBraces, faults };
}

// ── Extract inline blocks, keeping the line each one starts on. ───────────────────
function blocks(src, tag) {
  const out = [];
  const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)</${tag}>`, 'gi');
  let m;
  while ((m = re.exec(src))) {
    if (tag === 'script' && /\ssrc\s*=/i.test(m[1])) continue;   // external, not ours to parse
    out.push({ body: m[2], line: src.slice(0, m.index).split('\n').length, attrs: m[1] });
  }
  return out;
}

function lintFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const res = { file, css: { declared: 0, surviving: 0, faults: [] }, js: [] };

  for (const b of blocks(src, 'style')) {
    const r = scanCSS(b.body, b.line);
    res.css.declared += r.declared;
    res.css.surviving += r.surviving;
    res.css.faults.push(...r.faults);
  }

  // inline <script> , node --check parses without executing, so browser globals are fine.
  // Skip JSON-LD and template types, which are data and not JavaScript.
  for (const b of blocks(src, 'script')) {
    const type = (b.attrs.match(/type\s*=\s*["']([^"']+)/i) || [])[1] || '';
    if (type && !/javascript|module/i.test(type)) continue;
    const tmp = path.join(require('os').tmpdir(), `vvlint-${process.pid}-${b.line}.js`);
    try {
      fs.writeFileSync(tmp, b.body);
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      const msg = String(e.stderr || e.message).split('\n').slice(0, 3).join(' ').trim();
      res.js.push({ line: b.line, error: msg.slice(0, 160) });
    } finally { try { fs.unlinkSync(tmp); } catch (_) {} }
  }
  return res;
}

const targets = files.length
  ? files
  : fs.readdirSync(process.cwd()).filter(f => f.endsWith('.html')).sort();

const results = targets.map(lintFile);
const broken = results.filter(r => r.css.faults.length || r.js.length);

if (JSON_OUT) {
  console.log(JSON.stringify({ results, ok: broken.length === 0 }, null, 1));
} else {
  console.log('INLINE LINT , CSS rules surviving vs declared, and inline JS syntax\n');
  for (const r of results) {
    const lost = r.css.declared - r.css.surviving;
    const flag = (r.css.faults.length || r.js.length) ? '  <-- BREAK' : '';
    console.log(`  ${r.file.padEnd(22)} css ${String(r.css.surviving).padStart(4)} / ${String(r.css.declared).padEnd(4)}` +
                `${lost ? `  LOSING ${lost}` : '           '}  js ${r.js.length ? r.js.length + ' error(s)' : 'ok'}${flag}`);
    for (const f of r.css.faults)
      console.log(`      ${f.kind} at ${r.file}:${f.line}` +
                  (f.kind === 'stray-close-brace' ? '   , the next rule is discarded by the browser' : ''));
    for (const j of r.js) console.log(`      inline script at ${r.file}:${j.line} , ${j.error}`);
  }
  console.log(broken.length
    ? `\n  ${broken.length} file(s) with a structural break. A discarded rule does not error at runtime , it just stops applying.`
    : '\n  All files parse clean: every declared rule survives, every inline script checks.');
}

process.exit(broken.length ? 1 : 0);
