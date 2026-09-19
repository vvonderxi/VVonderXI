#!/usr/bin/env node
/*  THE PINNED-INK / BARE-ALPHA SWEEP , STATIC, REPORTS, NEVER CHANGES ANYTHING.
    ============================================================================
    THREE INSTANCES IN ONE DAY MADE THIS A CLASS RATHER THAN THREE BUGS:
      #rankFBtn   cream `var(--cream)` on a ground that flips    1.04 light
      .gk3 .lax   rgba(243,237,224,.42) dark / #7a736a light     3.66 / 1.71
      .lgfoot     `opacity:.55` and no ink of its own            1.19 light
    All three are SS C's rule , an ink pinned to a ground that moves, or an alpha standing in
    for an ink , and none of them errors, renders oddly, or shows up in a diff.

    WHAT IT FLAGS. A rule that sets a colour the theme cannot follow, on a page that HAS a
    light theme, with no `body.light` counterpart:
      A  a literal hex/rgb `color:` with no body.light override for the same selector
      B  `opacity:` on a rule that sets no `color:` of its own (an alpha dimming an inherited
         ink , the .lgfoot shape)
      C  a `color:` that is present in BOTH themes with the SAME value (an override that
         exists and changes nothing , the .lax shape, which is worse than an absent one
         because it reads as handled)

    WHAT IT IS NOT. It is a STATIC scan and it cannot know a ground, so it cannot tell a
    failure from a pass , SS C is explicit that only a rendered measurement settles contrast.
    Everything here is a CANDIDATE for the pixel harness, not a defect. It is deliberately
    noisy in the safe direction.
        node scripts/scan-pinned-ink.js            every shipping surface
        node scripts/scan-pinned-ink.js --all      include demos and mocks
*/
'use strict';
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
const ALL=process.argv.includes('--all');

const files=fs.readdirSync(ROOT).filter(f=>f.endsWith('.html'))
  .filter(f=>ALL || !/^_(demo|probe)|mock/.test(f));

const HEXCOL=/color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/;
let total=0;
const report=[];

for(const f of files){
  const src=fs.readFileSync(path.join(ROOT,f),'utf8');
  //  only the page's own <style> blocks , inline style attributes are a different problem
  /*  STRIP COMMENTS FIRST. Without this the scan matched COMMENT TEXT as a selector , it
      reported `/* 44x44 IS THE TOUCH-TARGET FLOOR...` as a rule , which is this file's own
      recorded trap in a new place: prose inside a file joins any scan of that file.  */
  const css=(src.match(/<style[^>]*>([\s\S]*?)<\/style>/g)||[]).join('\n')
                .replace(/\/\*[\s\S]*?\*\//g,' ');
  if(!css) continue;
  const hasLightTheme=/body\.light/.test(css);
  if(!hasLightTheme){ report.push({file:f, skip:'no light theme on this surface'}); continue; }

  //  crude rule split , good enough for a candidate scan, and it says so
  const rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(m=>({sel:m[1].trim().replace(/\s+/g,' '), body:m[2].trim()}))
    .filter(r=>r.sel && !r.sel.startsWith('@'));

  const lightSels=new Set(rules.filter(r=>/(^|,|\s)body\.light\b/.test(r.sel))
    .map(r=>r.sel.replace(/body\.light\s*/g,'').trim()));
  const lightVal=new Map();
  rules.filter(r=>/(^|,|\s)body\.light\b/.test(r.sel)).forEach(r=>{
    const m=r.body.match(HEXCOL); if(m) lightVal.set(r.sel.replace(/body\.light\s*/g,'').trim(), m[1].toLowerCase()); });

  const hits=[];
  for(const r of rules){
    if(/(^|,|\s)body\.light\b/.test(r.sel)) continue;
    const col=r.body.match(HEXCOL);
    const hasOpacity=/(^|;)\s*opacity\s*:/.test(r.body);
    const covered=lightSels.has(r.sel);
    if(col && !covered)                    hits.push({kind:'A pinned literal, no light rule', sel:r.sel, val:col[1]});
    else if(col && covered && lightVal.get(r.sel)===col[1].toLowerCase())
                                           hits.push({kind:'C same value in both themes',     sel:r.sel, val:col[1]});
    else if(!col && hasOpacity){
      /*  0 AND 1 ARE NOT DIMMING , they are show/hide. An element at opacity:0 paints nothing
          and one at opacity:1 is fully opaque; neither is an alpha standing in for an ink, and
          counting them buried the real cases under toggle noise.  */
      const o=parseFloat((r.body.match(/opacity\s*:\s*([\d.]+)/)||[])[1]);
      if(o>0 && o<1) hits.push({kind:'B alpha, no ink of its own', sel:r.sel, val:o});
    }
  }
  if(hits.length){ total+=hits.length; report.push({file:f, hits}); }
}

console.log('\nPINNED-INK / BARE-ALPHA CANDIDATES , static scan, NOT measurements\n');
for(const r of report){
  if(r.skip){ console.log('  '+r.file.padEnd(20)+', '+r.skip); continue; }
  console.log('  '+r.file+'   ('+r.hits.length+')');
  const byKind={};
  r.hits.forEach(h=>{ (byKind[h.kind]=byKind[h.kind]||[]).push(h); });
  for(const k of Object.keys(byKind).sort()){
    console.log('    '+k+'  x'+byKind[k].length);
    byKind[k].slice(0,6).forEach(h=>console.log('        '+h.sel.slice(0,58).padEnd(58)+' '+String(h.val).trim()));
    if(byKind[k].length>6) console.log('        ... and '+(byKind[k].length-6)+' more');
  }
}
console.log('\n  '+total+' candidates. EVERY ONE NEEDS THE PIXEL HARNESS , a static scan cannot\n'
          + '  know a ground, so none of these is a defect until it has been measured.\n');
