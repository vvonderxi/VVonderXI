#!/usr/bin/env node
/*  WIRE THE PAGE-TRANSITION FLAG INTO THE SHIPPING SURFACES , REVERSIBLE, DEMO ONLY.
    ================================================================================
    Option C (cross-document view transitions) cannot be judged on a two-page toy, because the
    whole question is how it feels on the real journeys: rankings to a card, card to compare,
    a nav tap. Those are real navigations between real documents, so the at-rule has to be in
    the real documents.

    IT IS INERT UNTIL SWITCHED ON. With no flag set the block adds NOTHING to the page , no
    style element, no listener, no stored state, no behaviour. `?vt=1` turns it on for the rest
    of the browser session, `?vt=0` turns it off.

    WHY A sessionStorage FLAG AND NOT A QUERY PARAMETER: a cross-document transition needs the
    at-rule present in BOTH the document being left and the document being arrived at. A query
    parameter is lost on the first hop, so the second page would have no rule and the transition
    would never fire , which would read as "option C does nothing" rather than as a broken flag.

    RUN            node scripts/wire-vt-flag.js          (adds it)
    REMOVE         node scripts/wire-vt-flag.js --off    (takes it out again, byte-exact)

    SEC C: address blocks by exact string and assert the count before replacing, never by line
    index. Every file is checked for exactly one anchor and exactly one block before any write.
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/*  The surfaces a reader can actually reach. The mocks, the PDF page and the demo harnesses are
    deliberately excluded , they are not on any journey.  */
const PAGES = ['index.html', 'rankings.html', 'card.html', 'compare.html', 'vvindex.html',
               'playbook.html', 'myclub.html', 'contact.html', 'iwonder.html', 'preferences.html'];

/*  NINE PAGES WRITE `UTF-8` AND index.html WRITES `utf-8`. Found by this script REFUSING the
    front door rather than by anybody noticing, which is the guard doing its job: an anchor that
    silently matched nothing would have left the one page every journey starts from unwired, and
    the transition would then have looked broken on exactly the journey that matters most.  */
const ANCHORS = ['<meta charset="UTF-8">', '<meta charset="utf-8">'];

const MARK_OPEN  = '<!-- VV PAGE-TRANSITION FLAG';
const MARK_CLOSE = '<!-- /VV PAGE-TRANSITION FLAG -->';

const BLOCK = `
${MARK_OPEN} , DEMO ONLY, INERT UNLESS SWITCHED ON, AND REMOVABLE WITH ONE COMMAND.
     Append ?vt=1 to any page to turn cross-document view transitions on for the rest of the
     browser session; ?vt=0 turns them off. With the flag unset this adds nothing at all to the
     document. Unsupported browsers ignore the at-rule and get today's hard cut, with no
     fallback code and no error.
     Put in by scripts/wire-vt-flag.js; take out with the same script and --off.
     At the decision this either goes, or the at-rule inside it moves into each page's own CSS
     and the script around it disappears. -->
<script>try{var q=new URLSearchParams(location.search);if(q.has('vt')){q.get('vt')==='0'?sessionStorage.removeItem('vvvt'):sessionStorage.setItem('vvvt','1');}if(sessionStorage.getItem('vvvt')){var s=document.createElement('style');s.textContent='@view-transition{navigation:auto}';document.head.appendChild(s);}}catch(e){}</script>
${MARK_CLOSE}`;

const off = process.argv.includes('--off');
let changed = 0, skipped = 0, failed = 0;

for (const p of PAGES) {
  const fp = path.join(ROOT, p);
  if (!fs.existsSync(fp)) { console.log(`  MISSING  ${p}`); failed++; continue; }
  const before = fs.readFileSync(fp, 'utf8');

  /*  Count the block by its OPEN marker rather than by the whole string , if the block is ever
      hand-edited, a whole-string match would report "absent" and then add a second copy.  */
  const have = before.split(MARK_OPEN).length - 1;

  if (off) {
    if (have === 0) { console.log(`  absent   ${p}`); skipped++; continue; }
    if (have !== 1) { console.log(`  REFUSED  ${p}: ${have} blocks, expected 1`); failed++; continue; }
    const i = before.indexOf('\n' + MARK_OPEN);
    const j = before.indexOf(MARK_CLOSE);
    if (i < 0 || j < 0 || j < i) { console.log(`  REFUSED  ${p}: markers malformed`); failed++; continue; }
    const after = before.slice(0, i) + before.slice(j + MARK_CLOSE.length);
    fs.writeFileSync(fp, after);
    console.log(`  removed  ${p}  (${before.length} -> ${after.length} bytes)`);
    changed++;
    continue;
  }

  if (have === 1) { console.log(`  already  ${p}`); skipped++; continue; }
  if (have > 1)   { console.log(`  REFUSED  ${p}: ${have} blocks already present`); failed++; continue; }

  const hits = ANCHORS.filter(a => before.includes(a));
  const total = ANCHORS.reduce((n, a) => n + before.split(a).length - 1, 0);
  if (hits.length !== 1 || total !== 1) {
    console.log(`  REFUSED  ${p}: ${total} anchor occurrences across ${hits.length} forms, expected exactly 1`);
    failed++; continue;
  }
  const ANCHOR = hits[0];
  const after = before.replace(ANCHOR, ANCHOR + BLOCK);
  fs.writeFileSync(fp, after);
  console.log(`  wired    ${p}  (${before.length} -> ${after.length} bytes)`);
  changed++;
}

console.log(`\n${off ? 'REMOVE' : 'WIRE'}: ${changed} changed, ${skipped} skipped, ${failed} failed`);
process.exit(failed ? 1 : 0);
