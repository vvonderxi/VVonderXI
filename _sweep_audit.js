/*  FULL AUDIT SWEEP , punchlist item 8. ONE HARNESS, EVERY SHIPPING SURFACE, BOTH WIDTHS,
    BOTH THEMES.
    ================================================================================
    WHY IT IS ONE FILE. The sweep has been attempted as a sequence of ad-hoc probes before and
    each one measured a slightly different thing, so the results could not be compared across
    surfaces. This runs the SAME nine checks everywhere and returns one shape, which is what
    makes "playbook has three and rankings has none" a finding rather than a coincidence of
    how each was probed.

    EVERY CHECK CARRIES A CONTROL, and the controls are the point rather than a formality.
    SEC C, 2026-09-27: three checks in one week reported clean over the exact thing they existed
    to catch, and all three were found by PLANTING A FAULT, never by reading the code. So this
    file ships with `__sweepSelfTest()`, which injects a real fault for each check and asserts
    the check fires. A sweep whose self-test has not been run is not evidence.

    WHAT IT DOES NOT DO, DECLARED RATHER THAN IMPLIED:
      , CONTRAST. The CSS walker cannot ground `vvindex` or `playbook` (base painted on html
        with a background-image over a transparent base) or the card face (radial-gradient over
        rgba(0,0,0,0)), and `_pixel_audit.js` times out on a page this tall. Contrast is
        reported ONLY where a ground resolves opaque, and every element whose ground does NOT
        resolve is listed as UNMEASURABLE, never folded into a pass.
      , ANYTHING BEHIND A NETWORK FETCH THAT HAS NOT RESOLVED. The sweep waits, then reports
        what it found; a surface whose data never arrived is reported as such.

    USAGE   inject, then  await __sweep()            , the current document
            __sweepSelfTest()                        , plant faults, confirm every check fires
*/
(function () {
  'use strict';

  const BLOCK = new Set(['P','DIV','SECTION','ARTICLE','UL','OL','LI','H1','H2','H3','H4','H5',
                         'H6','TABLE','FIGURE','BLOCKQUOTE','DETAILS','HEADER','FOOTER','NAV']);
  const TAPPABLE = 'a[href], button, input, select, textarea, [role="button"], [onclick], [tabindex]';

  const LUM = c => {
    const m = String(c).match(/[\d.]+/g); if (!m) return null;
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]);
  };
  const CR = (a, b) => { const l1 = LUM(a), l2 = LUM(b);
    if (l1 == null || l2 == null) return null;
    return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2); };

  function path(el) {
    const bits = [];
    for (let n = el; n && n.nodeType === 1 && bits.length < 3; n = n.parentElement) {
      let b = n.tagName.toLowerCase();
      if (n.id) { bits.unshift(b + '#' + n.id); break; }
      const c = (n.className || '').toString().trim().split(/\s+/).filter(Boolean)[0];
      if (c) b += '.' + c;
      bits.unshift(b);
    }
    return bits.join('>');
  }

  /*  VISIBLE means visible to a READER, which is not what `display` alone answers. SEC D
      records an audit that reported a dormant overlay as a full-screen blocker because its
      filter ignored opacity; and a zero-area box reads as present to every geometric test.
      Every ancestor is walked, because opacity:0 on a parent hides a child that computes 1.  */
  function visible(el) {
    if (!el.getClientRects().length) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /*  THE GROUND IS RESOLVED BY WALKING TO THE FIRST OPAQUE PAINT, AND IT RETURNS null RATHER
      THAN GUESSING. SEC C: walking CSS ancestors falls through to the page and INVENTS a
      ground , that fault produced a whole withdrawn survey. A gradient, an image or a fully
      transparent chain yields null here and the element is reported UNMEASURABLE.  */
  function ground(el) {
    const box = el.getBoundingClientRect();
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;   // gradient or image
      const bg = cs.backgroundColor;
      const m = String(bg).match(/[\d.]+/g);
      if (!m || (m.length >= 4 && +m[3] !== 1)) continue;                     // not opaque, keep walking
      if (n !== el) {
        const p = n.getBoundingClientRect();
        if (box.left < p.left - 1 || box.right > p.right + 1 ||
            box.top < p.top - 1 || box.bottom > p.bottom + 1) return null;    // escapes its painter
      }
      return bg;
    }
    return null;
  }

  // ── 1. HORIZONTAL OVERFLOW, and WHAT overflows ────────────────────────────────
  function overflow() {
    const de = document.documentElement;
    const px = de.scrollWidth - de.clientWidth;
    const culprits = [];
    if (px > 0) {
      const lim = de.clientWidth;
      document.querySelectorAll('body *').forEach(el => {
        if (!visible(el)) return;
        const r = el.getBoundingClientRect();
        if (r.right > lim + 1 || r.left < -1) {
          culprits.push({ where: path(el), right: Math.round(r.right), left: Math.round(r.left),
                          w: Math.round(r.width) });
        }
      });
    }
    // report only the OUTERMOST offenders , a wide child reports every ancestor too
    const outer = culprits.filter(c => !culprits.some(o => o !== c && c.where.startsWith(o.where + '>')));
    return { px, culprits: outer.slice(0, 8) };
  }

  // ── 2. UNRESOLVED <use> , a mark pointing at a symbol not in the document draws BLANK,
  //       with no error and no layout change (SEC C). This is the only way to see it.
  function unresolvedUse() {
    const bad = [];
    document.querySelectorAll('use').forEach(u => {
      const href = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
      if (!href.startsWith('#')) return;
      if (!document.getElementById(href.slice(1))) bad.push({ where: path(u), href });
    });
    return bad;
  }

  /*  ── 3. UNDEFINED CUSTOM PROPERTIES. An undefined var() makes the WHOLE declaration invalid
      at computed-value time, so the element silently loses a background, a border or an ink.
      SEC C: a per-file source scan over-reported 22 against a real 5, because the shared module
      consumes tokens the PAGES define. This reads the RENDERED document, so the union is
      automatic, and it only reports tokens read by a rule that MATCHES something , an
      unreachable rule is not a defect (the `.tip[data-tip]` ruling, applied to variables).  */
  function undefinedVars() {
    const used = new Map();                            // token -> Set(selector)
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      const walk = list => { for (const r of list) {
        if (r.cssRules && r.cssRules.length) walk(r.cssRules);
        if (!r.style || !r.selectorText) continue;
        const txt = r.cssText;
        let m, re = /var\(\s*(--[\w-]+)\s*(,)?/g;
        while ((m = re.exec(txt))) {
          const key = m[1];
          if (!used.has(key)) used.set(key, { sels: new Set(), everBare: false });
          used.get(key).sels.add(r.selectorText);
          if (!m[2]) used.get(key).everBare = true;     // read with NO fallback somewhere
        }
      } };
      walk(rules);
    }
    const bad = [], defaulted = [];
    for (const [tok, rec] of used) {
      const sels = rec.sels;
      // does ANY live element resolve it? if no rule even matches, it is unreachable, not broken
      let anyMatch = false, resolved = false;
      for (const sel of sels) {
        let els = []; try { els = [...document.querySelectorAll(sel)]; } catch (e) { continue; }
        if (!els.length) continue;
        anyMatch = true;
        for (const el of els) {
          if (getComputedStyle(el).getPropertyValue(tok).trim()) { resolved = true; break; }
        }
        if (resolved) break;
      }
      if (anyMatch && !resolved) {
        (rec.everBare ? bad : defaulted).push({ token: tok, selectors: [...sels].slice(0, 3) });
      }
    }
    bad.defaulted = defaulted;      // carried on the array so the sweep shape does not change
    return bad;
  }

  // ── 4. TAP TARGETS. 44px is the platform minimum; report the visible interactive
  //       elements under it, with their size, so the judgement stays human.
  function tapTargets() {
    const small = [];
    document.querySelectorAll(TAPPABLE).forEach(el => {
      if (!visible(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) {
        small.push({ where: path(el), w: Math.round(r.width), h: Math.round(r.height),
                     text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) });
      }
    });
    return small;
  }

  // ── 5. MEASURE , characters per line on leaf prose runs. Folds forced open and restored;
  //       SEC C records a reading taken through a closed <details> as not a reading.
  function measure(min) {
    min = min || 120;
    const reopened = [...document.querySelectorAll('details:not([open])')];
    reopened.forEach(d => { d.open = true; });
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!visible(el)) return;
      if ([...el.children].some(c => BLOCK.has(c.tagName))) return;
      const text = (el.textContent || '').trim();
      if (text.length < min) return;
      const r = document.createRange(); r.selectNodeContents(el);
      const lines = [...r.getClientRects()].filter(x => x.width > 1 && x.height > 1).length;
      if (!lines) return;
      out.push({ where: path(el), perLine: Math.round(text.length / lines), lines });
    });
    reopened.forEach(d => { d.open = false; });
    out.sort((a, b) => b.perLine - a.perLine);
    return { over95: out.filter(o => o.perLine > 95), warn: out.filter(o => o.perLine > 80 && o.perLine <= 95).length,
             worst: out.slice(0, 3) };
  }

  /*  ── 6. CONTRAST, WHERE IT CAN HONESTLY BE MEASURED. Leaf text runs only. Elements whose
      ground does not resolve opaque are counted as UNMEASURABLE and named , never silently
      passed, which is the failure that voided the 2026-08-23 survey. Large text takes the
      3.0 bar (18.66px bold or 24px), everything else 4.5.  */
  function contrast() {
    const fails = [], unmeasurable = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!visible(el)) return;
      if ([...el.children].some(c => BLOCK.has(c.tagName))) return;
      const own = [...el.childNodes].filter(n => n.nodeType === 3)
                    .map(n => n.textContent).join(' ').trim();
      if (own.length < 2) return;            // all its text lives in children that set their own ink
      const text = own;
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.fontSize), wt = parseInt(cs.fontWeight, 10) || 400;
      const g = ground(el);
      if (!g) { unmeasurable.push(path(el)); return; }
      const ratio = CR(cs.color, g);
      if (ratio == null) { unmeasurable.push(path(el)); return; }
      const bar = (px >= 24 || (px >= 18.66 && wt >= 700)) ? 3.0 : 4.5;
      if (ratio < bar) fails.push({ where: path(el), ratio, bar, px: Math.round(px * 10) / 10,
                                    text: text.replace(/\s+/g, ' ').slice(0, 26) });
    });
    fails.sort((a, b) => a.ratio - b.ratio);
    return { fails: fails.slice(0, 20), failCount: fails.length,
             unmeasurable: unmeasurable.length, unmeasurableSample: [...new Set(unmeasurable)].slice(0, 6) };
  }

  // ── 7. IMAGES , broken, and missing alt on anything that is not decorative.
  function images() {
    const broken = [], noalt = [];
    document.querySelectorAll('img').forEach(img => {
      if (!visible(img)) return;
      if (img.complete && img.naturalWidth === 0) broken.push({ where: path(img), src: (img.currentSrc || img.src).slice(-60) });
      if (!img.hasAttribute('alt')) noalt.push(path(img));
    });
    return { broken, noalt };
  }

  /*  ── 8. THE FLEX-WAIT-CLASS SHAPE (SEC C). An element that computes to flex or grid, holds a
      run of text, and has NO block-level children renders one sentence across several columns.
      It is invisible in markup and obvious on screen, so only a rendered enumeration finds it.  */
  function flexText() {
    const bad = [];
    document.querySelectorAll('body *').forEach(el => {
      if (!visible(el)) return;
      const d = getComputedStyle(el).display;
      if (!/^(flex|grid|inline-flex|inline-grid)$/.test(d)) return;
      if ([...el.children].some(c => BLOCK.has(c.tagName))) return;
      const text = (el.textContent || '').trim();
      if (text.length < 40) return;
      /*  THE SIGNATURE IS A SENTENCE CUT IN TWO, NOT AN ICON BESIDE A HEADING. Measured on
          vvindex: `.wmc-t` is <span class="picon"> plus ONE text run, which is the design and
          renders exactly right; the recorded defect is <text><strong><text>, where the bare
          text lands in TWO separate anonymous items and the sentence breaks across columns.
          So the test is TWO OR MORE non-empty text nodes, which is what `.vquote-wait` became
          the day vvEmphasis inserted a <strong> into it.  */
      const kids = [...el.childNodes];
      const textRuns = kids.filter(n => n.nodeType === 3 && n.textContent.trim()).length;
      const els = kids.filter(n => n.nodeType === 1);
      const CONTROL = /^(INPUT|BUTTON|SELECT|TEXTAREA|SVG|IMG|LABEL|VIDEO|CANVAS)$/;
      const controls = els.filter(n => CONTROL.test(n.tagName)).length;
      const phrasing = els.filter(n => !CONTROL.test(n.tagName)).length;
      if (textRuns >= 2 && phrasing >= 1 && controls === 0) {
        bad.push({ where: path(el), display: d, items: kids.filter(n =>
                     n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())).length,
                   text: text.replace(/\s+/g, ' ').slice(0, 40) });
      }
    });
    return bad;
  }

  // ── 9. the page's own cache token, so a surface serving a stale shared module is visible
  function tokens() {
    const out = [];
    document.querySelectorAll('script[src]').forEach(s => {
      const m = s.getAttribute('src').match(/(vv-[a-z]+\.js)(?:\?v=([^"'&]*))?/);
      if (m) out.push({ file: m[1], v: m[2] || null });
    });
    return out;
  }

  window.__sweep = async function (opts) {
    opts = opts || {};
    if (opts.settle !== false) await new Promise(r => setTimeout(r, opts.settle || 400));
    return {
      url: location.pathname + location.search,
      width: innerWidth,
      theme: document.body.classList.contains('light') ? 'light' : 'dark',
      ground: getComputedStyle(document.body).backgroundColor,
      overflow: overflow(),
      unresolvedUse: unresolvedUse(),
      undefinedVars: undefinedVars(),
      tapTargets: tapTargets(),
      measure: measure(opts.min),
      contrast: contrast(),
      images: images(),
      flexText: flexText(),
      tokens: tokens(),
      counts: { elements: document.querySelectorAll('body *').length,
                text: (document.body.innerText || '').length }
    };
  };

  /*  THE SELF-TEST. Plants ONE real fault per check and asserts the check fires, then removes
      it and asserts the check goes quiet again. Both halves matter: a check that fires on
      everything is as useless as one that fires on nothing.
      SEC C, 2026-09-27: "break the thing on purpose, watch the check fail, put it back, watch
      it pass". The planted fault is the CHEAPEST REAL ONE in each case.  */
  window.__sweepSelfTest = async function () {
    const results = [];
    const run = async (name, plant, read) => {
      const before = read();
      const undo = plant();
      await new Promise(r => setTimeout(r, 30));   // let a failing fetch actually fail
      const during = read();
      undo();
      const after = read();
      results.push({ check: name, quietBefore: before === 0, firedOnFault: during > before,
                     quietAfter: after === before, before, during, after,
                     ok: during > before && after === before });
    };

    const host = document.createElement('div');
    host.id = '__sweepfault';
    document.body.appendChild(host);

    await run('overflow', () => {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:0;width:' + (innerWidth + 300) + 'px;height:4px;background:#111';
      host.appendChild(d); return () => d.remove();
    }, () => overflow().px > 0 ? 1 : 0);

    await run('unresolvedUse', () => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      u.setAttribute('href', '#__sweep_no_such_symbol__');
      s.appendChild(u); host.appendChild(s); return () => s.remove();
    }, () => unresolvedUse().length);

    await run('undefinedVars', () => {
      const st = document.createElement('style');
      st.textContent = '#__sweepfault .sweepvar{color:var(--__sweep_undefined_token__)}';
      document.head.appendChild(st);
      const d = document.createElement('div'); d.className = 'sweepvar'; d.textContent = 'x';
      host.appendChild(d);
      return () => { st.remove(); d.remove(); };
    }, () => undefinedVars().filter(v => v.token === '--__sweep_undefined_token__').length);

    await run('tapTargets', () => {
      const b = document.createElement('button');
      b.style.cssText = 'width:10px;height:10px;padding:0'; b.textContent = '.';
      host.appendChild(b); return () => b.remove();
    }, () => tapTargets().length);

    await run('measure', () => {
      const d = document.createElement('div');
      d.style.cssText = 'width:4000px;font:12px monospace;position:absolute;left:0;top:0';
      d.textContent = 'x'.repeat(400).replace(/x/g, (c, i) => i % 6 ? 'a' : ' ');
      host.appendChild(d); return () => d.remove();
    }, () => measure(120).over95.length);

    await run('images.broken', () => {
      const i = document.createElement('img');
      i.src = '/__sweep_no_such_image__.png'; i.alt = 'x';
      i.style.cssText = 'width:10px;height:10px';
      host.appendChild(i);
      return () => i.remove();
    }, () => images().broken.length);

    await run('flexText', () => {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;width:600px';
      d.innerHTML = 'a sentence that a flex container will lay out as columns <strong>because</strong> it holds an element child';
      host.appendChild(d); return () => d.remove();
    }, () => flexText().length);

    await run('contrast', () => {
      const d = document.createElement('div');
      d.style.cssText = 'background:#808080;color:#7a7a7a;font-size:12px;width:80px';
      d.textContent = 'invisible text';
      host.appendChild(d); return () => d.remove();
    }, () => contrast().failCount);

    host.remove();
    const bad = results.filter(r => !r.ok);
    console.log('\nSWEEP SELF-TEST , ' + (results.length - bad.length) + ' of ' + results.length + ' checks proven to fire');
    results.forEach(r => console.log('  ' + (r.ok ? 'ok  ' : 'FAIL') + ' ' + r.check.padEnd(16) +
      ' before ' + r.before + ' -> fault ' + r.during + ' -> restored ' + r.after));
    return { ok: bad.length === 0, results };
  };
})();
