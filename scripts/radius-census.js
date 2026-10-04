#!/usr/bin/env node
/*  RADIUS CENSUS AND REWRITE , SOURCE DECLARATIONS, NOT COMPUTED VALUES.
    ================================================================================
    WHY SOURCE AND NOT COMPUTED, because the first census was wrong in a way worth recording.
    A computed-value census buckets `border-radius:50%` by whatever it RESOLVES to on each
    element, so one source declaration appears as many different numbers and a "50px cluster"
    materialises that no stylesheet contains. There are 28 `50%` declarations across the six
    pages and they are a CIRCLE idiom, not a pill: on a square box 50% and 999px draw the same
    shape, on a rectangle 50% draws an ELLIPSE and 999px draws a stadium. They are left alone.

    THE FOUR TOKENS, chosen from the measured clusters:
      --r-sm    3px    hairline and inline marks
      --r-md    8px    small controls, bars, chips
      --r-lg   14px    panels and containers  (already the most-shared value, all six pages)
      --r-pill 999px   fully round
    Four rather than three because the 6 to 11 band is load-bearing: it holds 74 elements at
    9px on playbook including .pctbar, a progress bar 18px tall, and a 14px radius on an 18px
    bar reads as a mistake.

    WHAT IS DELIBERATELY NOT TOUCHED, each for its own reason:
      50%                     a circle, a different idiom (see above)
      calc(var(--cw)*...)     card-scaled by design, SEC C
      0                       not a radius
      multi-value shorthands  deliberate asymmetric shapes, e.g. a sheet with square bottom
      anything inside a .vvcard rule   the card box lives in the pages, SEC C

    RUN   node scripts/radius-census.js            report only, writes nothing
          node scripts/radius-census.js --apply    rewrite
          node scripts/radius-census.js --revert   restore from the .radbak files
*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html','rankings.html','card.html','compare.html','playbook.html','vvindex.html'];

const TOKENS = { '--r-sm':3, '--r-md':8, '--r-lg':14, '--r-pill':999 };
const mapPx = n => n <= 5 ? '--r-sm' : n <= 11 ? '--r-md' : n <= 26 ? '--r-lg' : '--r-pill';

const apply = process.argv.includes('--apply');
const revert = process.argv.includes('--revert');

if (revert) {
  let n = 0;
  for (const p of PAGES) {
    const bak = path.join(ROOT, p + '.radbak');
    if (fs.existsSync(bak)) { fs.copyFileSync(bak, path.join(ROOT, p)); fs.unlinkSync(bak); n++; console.log('  reverted ' + p); }
  }
  console.log(`\nreverted ${n} files`); process.exit(0);
}

/*  A declaration is rewritable only if it is a SINGLE px length. Everything else is listed
    under `kept` with its reason, so the report says what it declined as well as what it took.  */
const DECL = /border-radius:\s*([^;}]+)/g;
const report = { mapped: {}, kept: {}, perFile: {} };
const bump = (o,k) => o[k] = (o[k]||0)+1;

for (const p of PAGES) {
  const fp = path.join(ROOT, p);
  let src = fs.readFileSync(fp, 'utf8');

  /*  SEC C: the card BOX stays in the pages, so a .vvcard radius in a page is card geometry
      and not part of this vocabulary. Blank those regions out of the match space rather than
      trying to detect them per declaration.  */
  const guard = [];
  src.replace(/\.vvcard[^{}]*\{[^}]*\}/g, (m, i) => { guard.push([i, i + m.length]); return m; });
  const inGuard = i => guard.some(([a,b]) => i >= a && i < b);

  let changed = 0, kept = 0;
  const out = src.replace(DECL, (whole, val, idx) => {
    const v = val.trim();
    if (inGuard(idx)) { bump(report.kept, 'inside a .vvcard rule'); kept++; return whole; }
    if (/^var\(/.test(v))            { bump(report.kept, 'already a token'); kept++; return whole; }
    if (/%/.test(v))                 { bump(report.kept, '50% and other percentages , circle idiom'); kept++; return whole; }
    if (/calc|var\(--cw/.test(v))    { bump(report.kept, 'card-scaled calc'); kept++; return whole; }
    if (/^0$|^0px$/.test(v))         { bump(report.kept, 'zero'); kept++; return whole; }
    if (/\s|\//.test(v))             { bump(report.kept, 'multi-value shorthand , deliberate shape'); kept++; return whole; }
    const m = /^(\d+(?:\.\d+)?)px$/.exec(v);
    if (!m)                          { bump(report.kept, 'unrecognised: ' + v); kept++; return whole; }
    const tok = mapPx(parseFloat(m[1]));
    bump(report.mapped, `${m[1]}px -> ${tok} (${TOKENS[tok]}px)`);
    changed++;
    return 'border-radius:var(' + tok + ')';
  });

  report.perFile[p] = { rewritten: changed, kept };

  if (apply && changed) {
    fs.copyFileSync(fp, fp + '.radbak');
    /*  Define the tokens on :root. Every page carries its own inline stylesheet and there is
        no shared sheet, so the block goes into each one , the same reason the cache token is
        per page.  */
    const decl = Object.entries(TOKENS).map(([k,v]) => `${k}:${v}px`).join(';');
    const tokenBlock = `\n/* RADIUS SCALE , four values, measured 2026-09-28. sm hairline, md small controls and bars,\n   lg panels, pill fully round. 50% is a CIRCLE and is a separate idiom, deliberately not folded in.\n   See scripts/radius-census.js for the mapping and what it declines to touch. */\n:root{${decl}}\n`;
    let withTokens = out;
    const i = withTokens.indexOf('<style>');
    if (i < 0) { console.log(`  REFUSED ${p}: no <style> block found`); continue; }
    withTokens = withTokens.slice(0, i + 7) + tokenBlock + withTokens.slice(i + 7);
    fs.writeFileSync(fp, withTokens);
  }
}

console.log(apply ? '=== APPLIED ===' : '=== REPORT ONLY, nothing written ===');
console.log('\nper file:');
for (const [f,o] of Object.entries(report.perFile)) console.log(`  ${f.padEnd(16)} rewrite ${String(o.rewritten).padStart(3)}   keep ${String(o.kept).padStart(3)}`);
console.log('\nmapped:');
for (const [k,v] of Object.entries(report.mapped).sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log('\nkept, with reason:');
for (const [k,v] of Object.entries(report.kept).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
const tot = Object.values(report.perFile).reduce((a,o)=>a+o.rewritten,0);
console.log(`\nTOTAL rewritten: ${tot}`);
