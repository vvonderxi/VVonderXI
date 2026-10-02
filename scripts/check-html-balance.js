#!/usr/bin/env node
/*  HTML NESTING CHECK , AND THE REASON IT EXISTS IS THAT THE OBVIOUS VERSION LIES.
    ================================================================================
    On 2026-10-02 a hand-rolled balance check reported FIVE stray closing tags in `vvindex.html`
    and every one of them was fine. It counted `<p>` as an element that must be closed, and HTML
    AUTO-CLOSES `<p>` when a block-level element opens. So every unclosed paragraph stayed on the
    stack and made the next legitimate `</div>` look stray. It sent a session chasing a document
    fault that did not exist, while the real fault , an HTML comment closed with a CSS
    terminator (star-slash) instead of the HTML one , was invisible to it.
    AND THAT LITERAL CANNOT BE WRITTEN HERE: the first draft of this very comment spelled it
    out and closed itself on line 8, which is the same shape CLAUDE.md records for the
    em-dash rule that contained the characters it forbade. A comment describing a
    terminator must not contain it.

    SO THE RULES THIS IMPLEMENTS, EACH OF WHICH THE NAIVE VERSION GETS WRONG:
      , VOID elements never close (`br`, `img`, `meta`, `input`, ...).
      , `<p>` is CLOSED IMPLICITLY by any block-level start tag, and by `</div>` and friends.
      , So are `li`, `dt`, `dd`, `option`, `thead`/`tbody` rows and cells. The list below is the
        subset this codebase actually uses; add to it rather than guessing.
      , `<script>` and `<style>` contents are NOT markup and are skipped wholesale , a `<div>`
        inside a template literal is text, not a tag, and counting it is how a clean file reads
        as broken.
      , Comments are skipped, AND AN UNCLOSED COMMENT IS REPORTED, because that is the fault
        that actually happened and no balance counter can see it.

    IT IS STILL NOT A BROWSER. Where this and a rendered DOM disagree, THE DOM WINS , see the
    tell recorded in CLAUDE.md: markup present in `documentElement.innerHTML` but absent from
    `querySelector` means it is in the document as TEXT, and no static check will tell you that.

    USAGE   node scripts/check-html-balance.js [file ...]      (defaults to the shipping pages)
*/
'use strict';
const fs = require('fs');
const path = require('path');

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta',
                      'param','source','track','wbr']);
/*  Elements that an opening block-level tag implicitly closes. Keyed by the element on the
    stack; the value is the set of start tags that end it.  */
const BLOCK = new Set(['address','article','aside','blockquote','details','div','dl','fieldset',
  'figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','header','hr','main','nav',
  'ol','p','pre','section','table','ul']);
const IMPLICIT = {
  p:  t => BLOCK.has(t),
  li: t => t === 'li',
  dt: t => t === 'dt' || t === 'dd',
  dd: t => t === 'dt' || t === 'dd',
  option: t => t === 'option' || t === 'optgroup',
  thead: t => t === 'tbody' || t === 'tfoot',
  tbody: t => t === 'tbody' || t === 'tfoot',
  tr: t => t === 'tr',
  td: t => t === 'td' || t === 'th' || t === 'tr',
  th: t => t === 'td' || t === 'th' || t === 'tr',
  summary: t => BLOCK.has(t)
};

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  const problems = [];
  const lineAt = i => src.slice(0, i).split('\n').length;
  const stack = [];
  let i = 0;

  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt < 0) break;

    /*  AN UNCLOSED COMMENT IS THE FAULT THIS FILE WAS WRITTEN FOR , an HTML comment closed
        with the wrong terminator swallows everything after it, and a tag counter cannot see
        it because there are no tags left to count.  */
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      if (end < 0) { problems.push(`UNCLOSED COMMENT opened line ${lineAt(lt)} , everything after it is swallowed as text`); break; }
      const body = src.slice(lt + 4, end);
      if (new RegExp('\\*' + '/').test(body))
        problems.push(`line ${lineAt(lt)}: comment contains "*/" , a CSS terminator inside an HTML comment, check it is not meant to close it`);
      i = end + 3; continue;
    }

    const m = /^<\s*(\/?)([a-zA-Z][\w:-]*)/.exec(src.slice(lt, lt + 60));
    if (!m) { i = lt + 1; continue; }
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    let gt = src.indexOf('>', lt);
    if (gt < 0) { problems.push(`line ${lineAt(lt)}: tag <${tag}> never closes its angle bracket`); break; }
    const selfClosed = src[gt - 1] === '/';

    /*  RAW TEXT ELEMENTS: their contents are not markup. Skipping them is what stops a
        `<div>` inside a JS template literal being counted as a tag.  */
    if (!closing && (tag === 'script' || tag === 'style')) {
      /*  JUMP PAST THE CLOSING TAG, NOT TO IT. Landing ON `</script>` re-reads it as a close
          with nothing matching on the stack, and the first version of this file reported 18
          such "problems" across six clean pages , a guard that cries on a clean run is worse
          than no guard, because the next person silences it.  */
      const close = src.toLowerCase().indexOf(`</${tag}`, gt);
      if (close < 0) { i = src.length; continue; }
      const closeEnd = src.indexOf('>', close);
      i = closeEnd < 0 ? src.length : closeEnd + 1;
      continue;
    }

    if (!closing) {
      if (!VOID.has(tag) && !selfClosed) {
        while (stack.length) {
          const top = stack[stack.length - 1];
          const rule = IMPLICIT[top.tag];
          if (rule && rule(tag)) stack.pop(); else break;
        }
        stack.push({ tag, line: lineAt(lt) });
      }
    } else {
      if (VOID.has(tag)) { i = gt + 1; continue; }
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.tag === tag) { stack.pop(); break; }
        const rule = IMPLICIT[top.tag];
        if (rule) { stack.pop(); continue; }          // implicitly closed, not an error
        problems.push(`line ${lineAt(lt)}: </${tag}> while <${top.tag}> from line ${top.line} is still open`);
        stack.pop(); break;
      }
    }
    i = gt + 1;
  }
  for (const s of stack) if (!IMPLICIT[s.tag]) problems.push(`<${s.tag}> opened line ${s.line} is never closed`);
  return problems;
}

const files = process.argv.slice(2).length ? process.argv.slice(2)
  : ['index.html','rankings.html','card.html','compare.html','playbook.html','vvindex.html']
      .map(f => path.resolve(__dirname, '..', f));
let bad = 0;
for (const f of files) {
  const p = check(f);
  console.log(`  ${path.basename(f).padEnd(16)} ${p.length ? p.length + ' problem(s)' : 'ok'}`);
  p.slice(0, 8).forEach(x => console.log(`      ${x}`));
  bad += p.length;
}
console.log(bad ? `\n${bad} problem(s)` : '\nall files nest cleanly');
process.exit(bad ? 1 : 0);
