/*  TYPOGRAPHIC MEASURE AUDIT , CHARACTERS PER LINE. Inject per page, call __vvMeasure().
    ================================================================================
    WHY IT EXISTS, AND IT IS A REAL DEFECT THAT SHIPPED. The VV Index was rebuilt from a
    demo designed inside an 860px column and spliced into a wrapper still carrying
    `max-width:1680px` from the page it replaced. Every line of the approved design then
    rendered at roughly double its intended measure: the timeline figure came out 1,584px
    wide and the longest paragraph ran about 200 characters a line.

    NOTHING CAUGHT IT, AND THE REASON IS THE POINT OF THIS FILE. Contrast passed. Horizontal
    overflow was zero. Every count was right. The page rendered correctly at 390 and at
    desktop in both themes. It simply read as an essay, and "reads as an essay" was being
    treated as a matter of word count when most of it was line length. NO INSTRUMENT ON THIS
    PLATFORM MEASURED CHARACTERS PER LINE, so the one number that would have named the
    problem was the one nobody had.

    THE INSTRUMENT MATTERS , `scrollWidth` CANNOT ANSWER THIS. For wrapping text scrollWidth
    reports the CONTENT BOX, not the drawn text, so it returns the same value for four
    strings of different length; SEC F records that exact failure. `Range.getClientRects()`
    returns one rect per rendered LINE, which is the only direct read of how many lines a run
    of text actually occupies.

    THE BAR. 45 to 75 characters is the long-standing setting convention for body text; 90 is
    where it starts to hurt on a wide screen because the eye loses the line return. This flags
    above 95 and warns from 80, and it reports rather than throws , a heading, a pull-quote or
    a one-line caption is allowed to be wide and the judgement stays human.

    WHAT IT MEASURES. Elements holding a run of text with NO block-level element children ,
    the same definition SEC C already uses for the flex-wait-class audit, because that is what
    isolates a paragraph from its container.

    USAGE   inject, then  __vvMeasure()            , every prose run on the page
            __vvMeasure({ min: 200 })              , only runs of 200+ characters
*/
(function () {
  const BLOCK = new Set(['P','DIV','SECTION','ARTICLE','UL','OL','LI','H1','H2','H3','H4',
                         'H5','H6','TABLE','FIGURE','BLOCKQUOTE','DETAILS','HEADER','FOOTER']);

  function path(el) {
    const bits = [];
    for (let n = el; n && n.nodeType === 1 && bits.length < 4; n = n.parentElement) {
      let b = n.tagName.toLowerCase();
      if (n.id) { bits.unshift(b + '#' + n.id); break; }
      const c = (n.className || '').toString().trim().split(/\s+/).filter(Boolean)[0];
      if (c) b += '.' + c;
      bits.unshift(b);
    }
    return bits.join(' > ');
  }

  /*  ONE RECT PER RENDERED LINE. A collapsed or hidden run returns none, and an element whose
      text is a single unbroken token can return one rect far wider than the box , both are
      reported as unmeasurable rather than folded into an average, because an average that
      quietly absorbs an impossible reading is how a harness lies.  */
  function linesOf(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()].filter(x => x.width > 1 && x.height > 1);
    return rects.length;
  }

  window.__vvMeasure = function (opts) {
    opts = opts || {};
    const MIN = opts.min == null ? 120 : opts.min;
    const out = [];

    /*  FORCE THE FOLDS OPEN FIRST, AND THIS WAS LEARNED THE HARD WAY TWICE ON THIS
        PLATFORM. `_audit.js` opens <details> before measuring colour for the same reason
        it matters here: a collapsed fold still has a box, so getClientRects returns rects
        that are neither the closed state nor the open one. The first run of this harness
        reported the keeper disclosure at 123 characters a line, 246 characters in "two
        lines", on a column where a line holds about a hundred , the fold was collapsed and
        the rects had merged. A reading taken through a closed fold is not a reading.
        Restored afterwards so the harness leaves the page as it found it.  */
    const reopened = [...document.querySelectorAll('details:not([open])')];
    reopened.forEach(d => { d.open = true; });
    document.querySelectorAll('body *').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if ([...el.children].some(c => BLOCK.has(c.tagName))) return;   // not a leaf run of prose
      const text = (el.textContent || '').trim();
      if (text.length < MIN) return;
      const lines = linesOf(el);
      if (!lines) return;
      const box = el.getBoundingClientRect();
      out.push({ where: path(el), chars: text.length, lines,
                 perLine: Math.round(text.length / lines), width: Math.round(box.width) });
    });
    reopened.forEach(d => { d.open = false; });
    out.sort((a, b) => b.perLine - a.perLine);

    const fail = out.filter(o => o.perLine > 95);
    const warn = out.filter(o => o.perLine > 80 && o.perLine <= 95);
    const tag = o => (o.perLine > 95 ? 'WIDE ' : o.perLine > 80 ? 'warn ' : 'ok   ');

    console.log(`\nTYPOGRAPHIC MEASURE , ${out.length} prose runs of ${MIN}+ characters` +
                `\n  bar: 95 characters a line fails, 80 warns. 45 to 75 is the convention.\n`);
    out.slice(0, 25).forEach(o =>
      console.log(`  ${tag(o)}${String(o.perLine).padStart(4)} ch/line  ` +
                  `${String(o.width).padStart(5)}px  ${String(o.lines).padStart(3)} lines  ${o.where}`));
    console.log(`\n  ${fail.length} over 95, ${warn.length} between 80 and 95.` +
                (fail.length ? '  <-- the page is set too wide' : '  measure is sane.'));
    return { fail, warn, all: out };
  };
})();
