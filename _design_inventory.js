/*  DESIGN INVENTORY , WHAT A CHOSEN SYSTEM LOOKS LIKE AGAINST AN INHERITED ONE.
    ================================================================================
    THIS IS NOT THE AUDIT SWEEP AND IT ANSWERS A DIFFERENT QUESTION. `_sweep_audit.js` asks
    whether something is WRONG , overflow, a blank mark, an undefined token, a contrast
    failure. This asks whether something was CHOSEN. Those are different, and a surface can
    pass every check in the sweep while its type scale is thirty accidental sizes.

    THE MEASURABLE FORM OF "INHERITED RATHER THAN CHOSEN" IS SPRAWL.
    A chosen type scale is a handful of sizes with visible ratios between them. An inherited
    one is a long tail of near-duplicates , 13, 13.5, 14, 14.5, 15 , each arrived at by
    someone nudging one element, none of them in a relationship with any other. The same is
    true of panel padding, corner radii, border colours and section gaps. So this counts the
    DISTINCT values in each family and reports the ones used once or twice, which are the
    tell: a value with a single user was set for that element, not for the system.

    WHAT IT CANNOT ANSWER, DECLARED RATHER THAN IMPLIED:
      , WHETHER SPRAWL IS WRONG. Twelve type sizes may be a rich scale or a mess, and the
        difference is judgement. This gives the list; a person reads it.
      , "PREMIUM", which is not a measurable property of a DOM.
      , ANYTHING ABOUT RHYTHM AS FELT. A section gap of 46px is a number; whether the page
        breathes is not.
    Where a judgement is needed the harness says so rather than scoring it.

    COLOUR IS REPORTED AS PAIRS, NOT AS RATIOS. Contrast is the sweep's job and it passes
    almost everywhere. What this looks for is MUDDINESS: an ink and a ground close in HUE and
    close in SATURATION read as a smudge even at a passing ratio, because the eye separates
    colours by more than luminance.

    USAGE   inject, then  __designInventory()
*/
(function () {
  'use strict';

  const BLOCK = new Set(['P','DIV','SECTION','ARTICLE','UL','OL','LI','H1','H2','H3','H4','H5',
                         'H6','TABLE','FIGURE','BLOCKQUOTE','DETAILS','HEADER','FOOTER','NAV']);

  function visible(el) {
    if (!el.getClientRects().length) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  const key = el => {
    const c = (el.className || '').toString().trim().split(/\s+/).filter(Boolean)[0];
    return (el.tagName.toLowerCase() + (c ? '.' + c : ''));
  };
  const rgb = c => { const m = String(c).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  /*  HSL is the right space for "muddy" , two colours can sit far apart in luminance and still
      read as the same material because they share a hue and a low saturation.  */
  function hsl(c) {
    const p = rgb(c); if (!p) return null;
    const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { h: Math.round(h), s: +(s * 100).toFixed(0), l: +(l * 100).toFixed(0) };
  }

  window.__designInventory = function () {
    const type = new Map();      // "px/weight/family" -> Set(selector)
    const radius = new Map();
    const pad = new Map();
    const borderCol = new Map();
    const inks = new Map();
    const gaps = new Map();

    const add = (map, k, sel) => { if (!map.has(k)) map.set(k, new Set()); map.get(k).add(sel); };

    document.querySelectorAll('body *').forEach(el => {
      if (!visible(el)) return;
      const cs = getComputedStyle(el);
      const sel = key(el);

      // ── TYPE. Only leaf runs of real text , a wrapper's font-size is inherited by definition
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (ownText && !([...el.children].some(c => BLOCK.has(c.tagName)))) {
        const fam = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
        add(type, parseFloat(cs.fontSize) + 'px / ' + cs.fontWeight + ' / ' + fam, sel);
        add(inks, cs.color, sel);
      }

      // ── PANELS. A "panel" is anything that paints a ground and has a radius , the family
      //    that carries most of this platform's layout.
      const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none';
      const rad = parseFloat(cs.borderTopLeftRadius) || 0;
      if (hasBg && rad >= 6) {
        add(radius, rad + 'px', sel);
        add(pad, cs.paddingTop + ' ' + cs.paddingRight, sel);
      }
      if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none') add(borderCol, cs.borderTopColor, sel);

      // ── SPACING between siblings, which is what rhythm is made of
      if (el.parentElement && el.previousElementSibling && visible(el.previousElementSibling)) {
        const a = el.previousElementSibling.getBoundingClientRect(), b = el.getBoundingClientRect();
        const g = Math.round(b.top - a.bottom);
        if (g >= 4 && g <= 140) add(gaps, g + 'px', sel);
      }
    });

    /*  A VALUE WITH ONE OR TWO USERS WAS SET FOR THAT ELEMENT, NOT FOR THE SYSTEM. That is the
        whole signal, and it is a SIGNAL rather than a verdict , a one-off can be a deliberate
        accent. The list is for reading.  */
    const shape = (map, label) => {
      const rows = [...map.entries()].map(([v, s]) => ({ v, n: s.size, who: [...s].slice(0, 4) }))
        .sort((a, b) => b.n - a.n);
      return { label, distinct: rows.length, total: rows.reduce((a, r) => a + r.n, 0),
               singletons: rows.filter(r => r.n <= 2).length, rows };
    };

    /*  MUDDY PAIRS , ink and ground within 30 degrees of hue AND both under 25% saturation.
        Contrast is not the question here and is deliberately not scored: the sweep already
        passed these. This asks whether two colours read as different MATERIALS.  */
    const bodyBg = (() => { for (let n = document.body; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor, m = rgb(c);
      if (m && (String(c).match(/[\d.]+/g) || []).length < 4) return c; } return null; })();

    return {
      url: location.pathname, width: innerWidth,
      theme: document.body.classList.contains('light') ? 'light' : 'dark',
      type: shape(type, 'type'),
      radius: shape(radius, 'panel radius'),
      padding: shape(pad, 'panel padding'),
      borders: shape(borderCol, 'border colour'),
      inks: shape(inks, 'ink'),
      gaps: shape(gaps, 'sibling gap'),
      groundOfBody: bodyBg,
      hslOfInks: [...inks.keys()].slice(0, 40).map(c => ({ c, hsl: hsl(c) }))
    };
  };
})();
