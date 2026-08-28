/* ══════════════════════════════════════════════════════════════════════
 *  vv-core.js , VVonderXI shared render + data core
 *  Single source of truth for the card hallway. Replaces the per-file
 *  inline copies of buildCard / inkFor that had drifted across the 5
 *  card-rendering pages (compare, rankings, search, myclub, card).
 *
 *  Exposes on window:
 *    inkFor(hex)        , badge number ink (black/white) from luminance
 *    buildCard(d, cw)   , the .vvcard render function (canonical Version A)
 *    rowToCard(row)     , player_card_view row -> card object `d` (Contract v1)
 *    vvClient()         , Supabase browser client (anon key, public config)
 *
 *  Load order in each page:
 *    <script>window.VV_PUBLIC = { SUPABASE_URL: "...", SUPABASE_ANON_KEY: "..." };</script>
 *    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *    <script src="/vv-core.js"></script>
 *
 *  The service key is NEVER referenced here , this file ships to the browser.
 * ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── inkFor , canonical Version A (compare/rankings/card) ──────────────
  function inkFor(hex){
    if(!hex) return '#fff';
    let h=hex.replace('#','');
    if(h.length===3) h=h.split('').map(c=>c+c).join('');
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    // relative luminance
    const L=(0.299*r+0.587*g+0.114*b)/255;
    return L>0.6 ? '#1C1B1A' : '#fff';
  }

  // ── luma , relative luminance 0..1 for a hex (shared by shieldSplit) ──
  function luma(hex){
    if(!hex) return 0;
    var h=hex.replace('#','');
    if(h.length===3) h=h.split('').map(function(c){return c+c;}).join('');
    var r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    return (0.299*r+0.587*g+0.114*b)/255;
  }
  // ── shieldSplit , split the badge ONLY for a genuine 2nd colour: present,
  //    distinct from c1, and not near-white (data uses #FFFFFF as filler 2nd). ──
  function shieldSplit(c1,c2){
    return !!c2 && c2!==c1 && luma(c2) <= 0.80;
  }

  // ── renderTagPills (Tag Model v1.1) , shared PURE pill renderer.
  //    tags: array of {name, family, tier}. Returns the pill-markup string, or ''.
  //    Ordering AGE > signature(ATT/MID/DEF) > CROSS with stable index tiebreak ,
  //    byte-identical to the logic in buildCard / pillHTML. Callers own the empty,
  //    placeholder and legacy-d.tag branches (this function never emits them). ──
  // ── MARK LOOKUP , opt-in, and deliberately fail-soft ────────────────────────────
  //  opts.mark turns marks ON for a caller. Only rankRowHTML passes it, so this change
  //  reaches the ROW surfaces (rankings, the card search overlay, the card season list,
  //  the compare season fold) and leaves the CARD FACE alone. Adoption is one surface
  //  at a time and the card face is a different surface.
  //
  //  If vv-marks.js is missing or stale, vvMark returns '' and the pill renders exactly
  //  as it does today. Referencing VVMarks directly would throw INSIDE renderTagPills and
  //  take the whole row down, which is a much worse failure than a missing icon. The
  //  one-shot audit in vv-marks.js is what stops that silence being permanent.
  function vvMark(kind, key){
    try { return (typeof VVMarks !== 'undefined' && VVMarks && VVMarks[kind]) ? VVMarks[kind](key) : ''; }
    catch(e){ return ''; }
  }

  // ── INLINE THE MARKS BEFORE A CANVAS CAPTURE, AND PUT THEM BACK ─────────────────
  //  html2canvas DOES NOT RESOLVE `<use href="#...">`. MEASURED 2026-08-23 by reading the
  //  captured pixels back: all three marks on a Messi card came out FLAT (luminance range
  //  1 to 5) while the pills around them captured fully (range ~200). It fails SILENTLY ,
  //  the pill renders, the label renders, and there is a hole where the icon should be.
  //  Cross-origin photos and the webfonts both capture fine; only `<use>` does not.
  //
  //  So before a capture, swap each `<use>` for the referenced symbol's own geometry, and
  //  swap it back afterwards. Verified: the same three marks went from flat to ink ranges
  //  of 186 / 135 / 129.
  //
  //  THE RESTORE IS THE DANGEROUS HALF. `#shareCapture` on card.html is a LIVE element in
  //  the page, not a throwaway poster, so a capture that throws must still put the DOM
  //  back. Callers MUST invoke the returned function from a `finally`, never only on the
  //  success path.
  function vvInlineMarks(node){
    const swapped = [];
    if (!node || !node.querySelectorAll) return function(){};
    node.querySelectorAll('svg.vvm').forEach(function(svg){
      const u = svg.querySelector('use'); if (!u) return;
      const href = u.getAttribute('href') || u.getAttribute('xlink:href'); if (!href) return;
      let sym = null; try { sym = document.querySelector(href); } catch(e){ return; }
      if (!sym) return;                                  // unresolved already , leave it alone
      swapped.push({ svg: svg, html: svg.innerHTML, vb: svg.getAttribute('viewBox') });
      const vb = sym.getAttribute('viewBox'); if (vb) svg.setAttribute('viewBox', vb);
      svg.innerHTML = sym.innerHTML;
    });
    return function restore(){
      swapped.forEach(function(s){
        s.svg.innerHTML = s.html;
        if (s.vb == null) s.svg.removeAttribute('viewBox'); else s.svg.setAttribute('viewBox', s.vb);
      });
      swapped.length = 0;                                // idempotent , a second call is a no-op
    };
  }

  // ── SHIM THE INSET RIMS BEFORE A CANVAS CAPTURE, AND PUT THEM BACK ─────────────
  //  SECOND html2canvas BLIND SPOT, found 2026-08-23 by the same method as the `<use>`
  //  one: reading the captured pixels back rather than looking at the picture.
  //  **html2canvas 1.4.1 DROPS EVERY INSET box-shadow ON AN ELEMENT THAT HAS A
  //  border-radius.** Isolated with a four-box control: a FLAT box captured the ring at
  //  full strength (red-minus-blue 142 at 4px depth); the SAME shadow on a box with
  //  `border-radius:21px` captured NOTHING (8, i.e. the background). A gradient
  //  background and an additional outer shadow made no difference , the radius alone
  //  decides it. Stacked inset shadows on a flat box render correctly, so this is not a
  //  multiple-shadow limit either.
  //
  //  IT HITS EVERY VV CARD, because every card is rounded. On a Generational card the
  //  casualty is the GOLD RIM, which is the whole visual claim of the tier , the shared
  //  image would have gone out with the tier stripped off it and nothing to show the
  //  difference. Live-DOM comparison cannot see this: the computed box-shadow is present
  //  and correct on the element, and no descendant covers it. Only the pixels show it.
  //
  //  THE SHIM: for each inset layer, add an absolutely-positioned ring CHILD carrying the
  //  band as a BORDER, which html2canvas does render on a rounded box (verified, 142 at
  //  the same depth, and the corner stays dark so the ring follows the radius rather than
  //  squaring off). Children are appended in REVERSE shadow order because CSS paints the
  //  FIRST shadow on top while the DOM paints the LAST sibling on top.
  //
  //  SCOPE, deliberately narrow: only zero-offset, zero-blur inset layers are shimmed,
  //  which is what a rim is. An offset or blurred inset is a soft interior shading that a
  //  hard border cannot reproduce, so it is SKIPPED rather than approximated , a wrong
  //  ring would be worse than the missing one, and nothing in this codebase uses one.
  //
  //  Same contract as vvInlineMarks: call the returned function from a `finally`.
  function vvShimInsetRims(node){
    if (!node || !node.querySelectorAll) return function(){};
    const targets = [];
    if (node.matches && node.matches('*')) targets.push(node);
    node.querySelectorAll('*').forEach(function(el){ targets.push(el); });

    // The suppression and the position fix go through an INJECTED STYLESHEET, never through
    // el.style. Writing to .style at all reserialises the whole style attribute (`--cw:284px`
    // comes back as `--cw: 284px;`) and leaves `style=""` behind on elements that had no
    // attribute, so the restore can never be byte-identical. A stylesheet plus a temporary
    // class touches neither, and removing both leaves the DOM exactly as found , which is
    // what lets a caller ASSERT the restore rather than trust it.
    const rules = [], touched = [];
    let n = 0;

    targets.forEach(function(el){
      const cs = getComputedStyle(el);
      const layers = vvSplitShadow(cs.boxShadow).filter(function(l){ return /\binset\b/.test(l); });
      if (!layers.length) return;
      const rings = [];
      layers.forEach(function(layer){
        const colour = (layer.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i) || [])[1];
        const lens = layer.replace(/rgba?\([^)]*\)/i, '').replace(/\binset\b/, '')
                          .trim().split(/\s+/).map(parseFloat).filter(function(v){ return !isNaN(v); });
        if (!colour || lens.length < 4) return;
        const ox = lens[0], oy = lens[1], blur = lens[2], spread = lens[3];
        if (ox || oy || blur || spread <= 0) return;      // not a rim , see SCOPE above
        const ring = document.createElement('div');
        ring.setAttribute('data-vv-rim', '1');
        ring.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
          'box-sizing:border-box;border:' + spread + 'px solid ' + colour + ';' +
          'border-radius:' + cs.borderRadius + ';';
        rings.push(ring);
      });
      if (!rings.length) return;

      // SUPPRESS THE ORIGINALS FOR THE DURATION OF THE CAPTURE. Adding the rings is only
      // half the fix: html2canvas does not ignore these layers, it MISPLACES them , it
      // resolves an inset ring against the element's CONTENT box instead of its border box,
      // so on a card with 19.88px padding the gold rim is redrawn 20px in, boxing the content
      // and cutting straight through the Generational pill. Measured on a captured row: with
      // the originals left in place the gold landed at inset 26 and 233 on a 261.3px card,
      // exactly contentEdge + the 5.68-to-7.1 band, so the image carried TWO rims , the right
      // one and the wrong one. That misplaced rim is the "gold border cutting through the
      // card" defect, and it is html2canvas's, not the card's.
      // The rule needs !important because the card's own shadow is declared that way; a plain
      // override is SILENTLY IGNORED (measured: the assignment ran, threw nothing, and
      // getComputedStyle still returned all three layers, so the suppression looked applied
      // while the wrong rim kept printing).
      const cls = 'vv-rim-shim-' + (n++);
      const keep = vvSplitShadow(cs.boxShadow).filter(function(l){ return !/\binset\b/.test(l); });
      // THE CLASS IS REPEATED FOUR TIMES ON PURPOSE, the same device as `.vvrows.vvrows`
      // elsewhere in this file. `!important` does NOT settle a contest between two important
      // declarations , SPECIFICITY does, and the card's own rim is declared on `.vvcard.gen`
      // (0,2,0). A single shim class is (0,1,0), so it LOSES and the suppression silently
      // does nothing: measured, the misplaced rim came straight back at inset 26 while the
      // rule sat in the sheet looking correct. Four repetitions is (0,4,0), which clears any
      // realistic card selector without resorting to an inline style , and an inline style is
      // what makes the restore non-byte-identical, so this is not a stylistic preference.
      const sel = ('.' + cls).repeat(4);
      rules.push(sel + '{box-shadow:' + (keep.length ? keep.join(', ') : 'none') + ' !important' +
                 (cs.position === 'static' ? ';position:relative !important' : '') + '}');
      el.classList.add(cls);
      rings.reverse().forEach(function(r){ el.appendChild(r); });   // CSS paints first-on-top
      touched.push({ el: el, cls: cls, rings: rings });
    });

    if (!touched.length) return function(){};
    const sheet = document.createElement('style');
    sheet.setAttribute('data-vv-rim-sheet', '1');
    sheet.textContent = rules.join('\n');
    document.head.appendChild(sheet);

    return function restore(){
      touched.forEach(function(t){
        t.rings.forEach(function(r){ if (r.parentNode) r.parentNode.removeChild(r); });
        t.el.classList.remove(t.cls);
        if (!t.el.getAttribute('class')) t.el.removeAttribute('class');   // it had none to begin with
      });
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
      touched.length = 0;                                // idempotent, as vvInlineMarks is
    };
  }

  //  Split a computed box-shadow on its TOP-LEVEL commas only. A plain .split(',') tears
  //  `rgba(0, 0, 0, 0.85)` into four fragments and every layer after it is misread.
  function vvSplitShadow(v){
    if (!v || v === 'none') return [];
    const out = []; let depth = 0, start = 0;
    for (let i = 0; i < v.length; i++){
      const ch = v[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0){ out.push(v.slice(start, i).trim()); start = i + 1; }
    }
    out.push(v.slice(start).trim());
    return out.filter(Boolean);
  }

  // ── CARD-FACE ADOPTION , opt-in per PAGE, not per call ──────────────────────────
  //  buildCard is shared by card.html, compare.html and rankings.html, so the opt-in has
  //  to live somewhere only ONE of them turns on. It is a page-level flag rather than a
  //  third argument because buildCard has FIVE call sites on card.html alone (hero, flip
  //  swap, share, sequence peek, search-overlay grid) and threading a flag through all
  //  five invites one being missed , which would render two different card faces on the
  //  same page. compare.html and rankings.html simply never call useCardMarks(), so their
  //  cards are byte-identical to today. Each page is its own document, so the flag cannot
  //  leak between surfaces.
  //  Fail-soft is unchanged: the flag only decides whether vvMark is CONSULTED, and vvMark
  //  still returns '' when vv-marks.js is missing or stale.
  var CARD_MARKS = false;
  function useCardMarks(on){ CARD_MARKS = (on !== false); }

  function renderTagPills(tags, opts){
    if (!Array.isArray(tags) || !tags.length) return '';
    opts = opts || {};
    const baseClass = opts.baseClass || 'chtag';
    const max       = (opts.max != null) ? opts.max : 3;
    const el        = opts.el || 'span';
    const innerWrap = !!opts.innerWrap;
    const PRIO = { AGE:0, ATT:1, MID:1, DEF:1, CROSS:2 };
    const prio = f => (f in PRIO) ? PRIO[f] : 1;
    return tags
      .map((t, i) => ({ t, i }))                                   // keep original index for stable tiebreak
      .sort((a, b) => prio(a.t.family) - prio(b.t.family) || a.i - b.i)
      .slice(0, max)
      .map(x => {
        const famClass = (x.t.family in PRIO) ? `${baseClass}-${String(x.t.family).toLowerCase()}` : '';
        const inner    = innerWrap ? `<span>${x.t.name}</span>` : x.t.name;
        const mk       = opts.mark ? vvMark('tag', x.t.name) : '';
        return `<${el} class="${baseClass} ${famClass}" data-tag="${x.t.name}">${mk}${inner}</${el}>`;
      })
      .join('');
  }

  // ── renderPrestige (Contract §3) , shared prestige-pill renderer, mirrors
  //    renderTagPills's shape. baseClass 'chtag' (card) / 'rtag' (List). Returns
  //    the pill markup or '' (null/non-prestige). Callers prepend it to tags. ──
  function renderPrestige(prestige, opts){
    opts = opts || {};
    var base = opts.baseClass || 'chtag';
    var mk = opts.mark ? vvMark('tag', prestige) : '';
    if(prestige === 'Generational') return '<div class="'+base+' '+base+'-prestige-gen" data-tag="Generational"><span>'+mk+'GENERATIONAL</span></div>';
    if(prestige === 'Iconic') return '<div class="'+base+' '+base+'-prestige-ico" data-tag="Iconic"><span>'+mk+'ICONIC</span></div>';
    return '';
  }

  // ── Position display map , RENDER-ONLY rename (like the band display renames).
  //    Data bucket stays "Winger" (tags/filters/eligibility unchanged); the card
  //    just SHOWS the short code "WNG", matching GK/CB/FB/CDM/CM/CAM/ST. ──
  const POS_DISPLAY = { Winger: 'WNG' };
  function posDisplay(p){ return POS_DISPLAY[p] || p; }
  /* FULL position names, for PROSE contexts only , currently just the card's Glance sub-line.
     POS_DISPLAY above stays SHORT and must: it feeds the card-face pill and the dense result
     rows (rankRowHTML .upos, the compare picker), where "Defensive Midfielder" would break a
     layout built for three characters.
     COARSE DEF/MID/FWD/GK ARE INCLUDED DELIBERATELY , 35% of cards have a null position_pool
     and fall back to the coarse field, so without these a third of Glance lines would read
     "DEF" beside another card's "Centre Back". "Defender" is the honest label for a card whose
     pool we do not know: less precise, not abbreviated. UNK and anything unrecognised fall
     through to posDisplay, so nothing ever renders blank. */
  const POS_FULL = {
    GK:'Goalkeeper', CB:'Centre Back', FB:'Full Back',
    CDM:'Defensive Midfielder', CM:'Central Midfielder', CAM:'Attacking Midfielder',
    Winger:'Winger', ST:'Striker',
    DEF:'Defender', MID:'Midfielder', FWD:'Forward'
  };
  function posFull(p){ return POS_FULL[p] || posDisplay(p); }

  // ── buildCard , canonical Version A, with myclub's hidden-placeholder
  //    empty-tag branch adopted as the standard (keeps grid rows aligned). ──
  function buildCard(d, cw){
    const flag = d.flag ? `<span class="cflag">${d.flag}</span> ` : '';
    const full = d.full ? `<div class="full">${d.full}</div>` : '';
    // ── Tag pills (Tag Model v1.1) , built via the shared renderTagPills helper
    //    (ordering / slice / family-class all live there). tags present but empty
    //    -> invisible placeholder (reserves row height). tags absent -> legacy
    //    d.tag string fallback, else placeholder. ──
    const tagPlaceholder = `<div class="chtag one" aria-hidden="true"><span style="visibility:hidden">&middot;</span></div>`;
    // ── CHANGE 3: card-face priority-fill , FIXED total-slot budget filled in strict priority:
    //    PRESTIGE (slot 1, if any) -> HONOURS (by tier) -> PROFILE (by PRIO).
    //    total = 3 if prestige present, else 4. GLANCE STRIP is uncapped (all honours); the FACE caps.
    const hasPrestige = (d.prestige==='Generational' || d.prestige==='Iconic');
    const remaining = hasPrestige ? 2 : 4;   // slots after prestige (prestige takes 1 of the 3-slot budget)
    const honList = (d.honours && Array.isArray(d.honours.all)) ? d.honours.all : [];
    const honShown = honList.slice(0, remaining);   // top-ranked by tier (all is tier-sorted)
    const honPills = honShown.map(function(h){
      // h.type IS the HONOUR_META key, same as renderHonourPillsCompact. The mark inherits
      // the pill's own ink through currentColor , .vvcard .chtagcell.gold sets color:#5a4410
      // and the gold gradient is identical in both themes, so no light-mode branch is needed.
      var mk = CARD_MARKS ? vvMark('honour', h.type) : '';
      return '<span class="chtagcell gold" data-tag="'+escAttr(h.type)+'" data-tip="'+escAttr(h.oneliner||h.label)+'">'+mk+(HONOUR_CHIP_LABEL[h.type]||h.label)+'</span>';
    }).join('');
    const profileMax = remaining - honShown.length;   // profile fills whatever honours left open
    let profilePills = '', profileShown = 0;
    if (Array.isArray(d.tags) && d.tags.length && profileMax > 0) {
      profilePills = renderTagPills(d.tags, { baseClass:'chtagcell', max:profileMax, el:'span', innerWrap:false, mark:CARD_MARKS });
      profileShown = Math.min(d.tags.length, profileMax);
    } else if (!Array.isArray(d.tags) && d.tag && profileMax > 0) {
      profilePills = `<span class="chtagcell">${d.tag}</span>`; profileShown = 1;   // legacy string fallback
    }
    const shownCount = honShown.length + profileShown;
    const tag = shownCount
      ? `<div class="chtag${shownCount===1?' one':''}">${honPills}${profilePills}</div>`
      : tagPlaceholder;
    // ── Prestige tier pill (Contract §3) , the LOUD tag, leads the profile pills.
    //    Built via the shared renderPrestige helper; .chtag row stacks above ${tag}. ──
    const prestige = renderPrestige(d.prestige, {baseClass:'chtag', mark:CARD_MARKS});
    const c1 = d.club1 || '#2a2320', c2 = d.club2 || c1;
    const split = shieldSplit(c1, c2);
    // number ink: solid badge -> inkFor(c1); split badge -> white fill + bold OPAQUE black outline (reads on BOTH halves)
    const ink = split ? '#FFFFFF' : inkFor(c1);
    const numStroke = split ? ' stroke="#000000" stroke-width="2.5" paint-order="stroke"' : '';
    // number sizing: match the visual weight of a two-digit number like "14" (the default look).
    // single digits get a larger font so they fill the badge the same way; 3 digits shrink slightly.
    const numStr = (d.number!=null && d.number!=='') ? String(d.number) : '';
    const numSize = numStr.length>=3 ? 42 : (numStr.length===2 ? 46 : 56);
    const num = numStr ? `<text x="50" y="58" font-family="Archivo" font-weight="900" font-size="${numSize}" fill="${ink}" text-anchor="middle" dominant-baseline="central"${numStroke}>${numStr}</text>` : '';
    const uid = 'b'+Math.random().toString(36).slice(2,8);
    // badge fill: SOLID primary by default; split only for a genuine 2nd colour
    const badgeFill = split
      ? `<rect x="0" width="50" height="116" fill="${c1}"/><rect x="50" width="50" height="116" fill="${c2}"/>`
      : `<rect width="100" height="116" fill="${c1}"/>`;
    const longName = (d.surname && String(d.surname).length > 11) ? ' long' : '';
    return `<div class="vvcard${d.prestige==='Generational'?' gen':d.prestige==='Iconic'?' iconic':''}" style="--cw:${cw}px">
      <div class="ctop">
        <div class="ctl">
          <div class="cbadgewrap">
            <svg class="cbadge" viewBox="0 0 100 116"><defs><clipPath id="${uid}"><path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z"/></clipPath></defs><g clip-path="url(#${uid})">${badgeFill}</g><path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z" fill="none" stroke="rgba(0,0,0,0.30)" stroke-width="5"/><path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>${num}</svg>
            <div class="pos">${posDisplay(d.pos)}</div>
          </div>
        </div>
        <div class="yr">${d.year}</div>
        <div class="ctr"><div class="n">${d.vv}</div><div class="vv"><span class="a">V</span><span class="b">V</span></div></div>
      </div>
      <div class="cimg">${d.photo ? `<img class="cphoto" src="${d.photo}" alt="" onerror="this.style.display='none';this.parentNode.classList.add('no-photo')">` : ''}<svg viewBox="0 0 100 104" class="silh" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="s${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.22)"/><stop offset="1" stop-color="rgba(255,255,255,0.08)"/></linearGradient></defs><circle cx="50" cy="34" r="20" fill="url(#s${uid})"/><path d="M50 58 C28 58 14 74 12 96 C12 100 14 104 18 104 L82 104 C86 104 88 100 88 96 C86 74 72 58 50 58 Z" fill="url(#s${uid})"/></svg></div>
      ${prestige}${tag}
      <div class="cga"><div class="col"><div class="v">${d.goals == null ? 'NR' : d.goals}</div><div class="l">Goals</div></div><div class="divider"></div><div class="col"><div class="v">${d.assistsText == null ? 'NR' : d.assistsText}</div><div class="l">Assists</div></div></div>
      <div class="cname"><div class="nm${longName}">${flag}${d.surname}</div>${full}<div class="sub">${[d.clubname, posDisplay(d.pos), d.age].filter(x=>x!=null&&x!=='').join(' &middot; ')}</div></div>
    </div>`;
  }

  /* ════════════════════════════════════════════════════════════════════
   *  rowToCard , adapter: live player_card_view row -> card object `d`
   *  Aligned to Card Contract v1 (sections referenced inline).
   *  Headline pool rule (supersedes the contract's FWD/MID bridge):
   *  pos = position_pool || position.
   * ════════════════════════════════════════════════════════════════════ */

  // season '2324' -> '23/24' (Contract §1)
  function fmtSeason(s){
    if(s==null) return '';
    s=String(s);
    return s.length===4 ? s.slice(0,2)+'/'+s.slice(2,4) : s;
  }

  // surnameOf , particle-aware + known-as overrides
  const SURNAME_OVERRIDES = {
    'Vinícius Júnior': 'Vinícius',
  };
  const PARTICLES = new Set([
    'de','del','della','dello','degli','di','da','dos','das','do',
    'van','von','der','den','ter','ten','te',
    'le','la','du',
    'bin','ibn','al','el',
    'mac','mc',"o'",'san','santa','st'
  ]);
  const MULTI_PARTICLES = [
    ['van','der'], ['van','den'], ['van','de'],
    ['de','la'], ['de','los'], ['de','las'],
    ['dos','santos']
  ];
  function surnameOf(name){
    if(!name) return '';
    const raw = String(name).trim();
    if(SURNAME_OVERRIDES[raw]) return SURNAME_OVERRIDES[raw];
    const parts = raw.split(/\s+/);
    if(parts.length === 1) return parts[0];
    const lower = parts.map(p => p.toLowerCase());
    const lastIdx = parts.length - 1;
    for(const seq of MULTI_PARTICLES){
      const start = lastIdx - seq.length;
      if(start >= 1){
        let match = true;
        for(let i=0;i<seq.length;i++){
          if(lower[start+i] !== seq[i]){ match=false; break; }
        }
        if(match) return parts.slice(start).join(' ');
      }
    }
    const prevIdx = lastIdx - 1;
    if(prevIdx >= 1 && PARTICLES.has(lower[prevIdx])){
      return parts.slice(prevIdx).join(' ');
    }
    return parts[lastIdx];
  }

  // ── vvDisplayName , "L. Messi" + legal name -> "Lionel Messi" ─────────
  // player_card_mv.player_name is abbreviated for 63.6% of players ("L. Messi")
  // and already full for the rest ("Cristiano Ronaldo", "Neymar", "Son Heung-Min").
  // players.full_name is the full LEGAL name, so it is NOT a display name:
  //   Messi  -> "Lionel Andrés Messi Cuccittini"
  //   Salah  -> "Mohamed Salah Hamed Mahrous Ghaly"
  //   Hulk   -> "Givanildo Vieira de Souza"
  // So we borrow ONLY the given name from full_name and keep player_name's own
  // surname, which is the "known as" surname with compounds already intact
  // ("K. De Bruyne" -> "Kevin De Bruyne", never "Kevin De" or a legal variant).
  //
  // The ^X\. guard is what makes every awkward case safe: anything not in
  // initial form is returned untouched, which covers already-full names,
  // mononyms whose legal name differs entirely (Hulk, Neymar, Fred), and
  // non-Latin rows where the two fields are in OPPOSITE order
  // ("Son Heung-Min" / full_name "Heung-Min Son").
  //
  // Measured over the 9,798 abbreviated names: resolves 9,730 (99.3%).
  // The 68 left abbreviated are diminutives absent from the legal name
  // ("D. Alli" <- Bamidele; "N. Madueke" <- Noni), where abbreviating is honest.
  const _nameFold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  function vvDisplayName(playerName, fullName){
    if(!playerName) return fullName || '';
    const m = String(playerName).match(/^([A-Za-zÀ-ɏ])\.\s+(.+)$/);
    if(!m) return playerName;                       // already full / mononym / reversed order
    const initial = _nameFold(m[1]).toUpperCase(), surname = m[2];
    if(!fullName || !String(fullName).trim()) return playerName;   // no source -> keep as-is
    const toks = String(fullName).trim().split(/\s+/);
    const first = toks[0];
    if(first && _nameFold(first[0]).toUpperCase() === initial)
      return first.toLowerCase() === surname.toLowerCase() ? playerName : first + ' ' + surname;
    // The initial disagrees -> the player goes by a MIDDLE name ("H. Maguire"
    // <- "Jacob Harry Maguire"). Recover it only when exactly ONE later token
    // matches; 2+ is ambiguous ("O. Aina" <- Temitayo Olufisayo Olaoluwa) and
    // guessing there would be worse than staying abbreviated.
    const surnWords = new Set(_nameFold(surname).toLowerCase().split(/\s+/));
    const cands = toks.slice(1).filter(t => !surnWords.has(_nameFold(t).toLowerCase())
                                         && _nameFold(t[0]).toUpperCase() === initial);
    return cands.length === 1 ? cands[0] + ' ' + surname : playerName;
  }

  // ── Nationality NAME -> flag emoji (Contract §1) ──────────────────────
  // The view stores FULL COUNTRY NAMES, not ISO codes. Covers all 170
  // distinct live values incl. variant spellings and one mojibake entry.
  // UK home nations use Unicode tag sequences; unknown -> '' (card omits flag).
  const NAME_TO_ISO2 = {
    "Afghanistan":"AF","Albania":"AL","Algeria":"DZ","Angola":"AO","Argentina":"AR",
    "Armenia":"AM","Aruba":"AW","Australia":"AU","Austria":"AT","Azerbaijan":"AZ",
    "Bahrain":"BH","Barbados":"BB","Belarus":"BY","Belgium":"BE","Benin":"BJ",
    "Bolivia":"BO","Bonaire":"BQ","Bosnia and Herzegovina":"BA","Bosnia-Herzegovina":"BA",
    "Brazil":"BR","Bulgaria":"BG","Burkina Faso":"BF","Burundi":"BI",
    "CÃ´te d'Ivoire":"CI",                     // mojibake variant of Cote d'Ivoire
    "Cameroon":"CM","Canada":"CA","Cape Verde":"CV","Cape Verde Islands":"CV",
    "Central African Republic":"CF","Chad":"TD","Chile":"CL","China PR":"CN",
    "Chinese Taipei":"TW","Colombia":"CO","Comoros":"KM","Congo":"CG","Congo DR":"CD",
    "Costa Rica":"CR","Côte d'Ivoire":"CI","Croatia":"HR","Cuba":"CU",
    "Curaçao":"CW","Cyprus":"CY","Czech Republic":"CZ","Czechia":"CZ",
    "Denmark":"DK","Dominican Republic":"DO","DR Congo":"CD","Ecuador":"EC","Egypt":"EG",
    "El Salvador":"SV","England":"_ENG","Equatorial Guinea":"GQ","Eritrea":"ER",
    "Estonia":"EE","Ethiopia":"ET","Faroe Islands":"FO","Finland":"FI","France":"FR",
    "French Guiana":"GF","FYR Macedonia":"MK","Gabon":"GA","Gambia":"GM","Georgia":"GE",
    "Germany":"DE","Ghana":"GH","Gibraltar":"GI","Greece":"GR","Grenada":"GD",
    "Guadeloupe":"GP","Guatemala":"GT","Guinea":"GN","Guinea-Bissau":"GW","Guyana":"GY",
    "Haiti":"HT","Honduras":"HN","Hungary":"HU","Iceland":"IS","Indonesia":"ID",
    "Iran":"IR","Iraq":"IQ","Ireland":"IE","Ireland Republic":"IE","Israel":"IL",
    "Italy":"IT","Ivory Coast":"CI","Jamaica":"JM","Japan":"JP","Jordan":"JO",
    "Kazakhstan":"KZ","Kenya":"KE","Korea Republic":"KR","Kosovo":"XK","Laos":"LA",
    "Latvia":"LV","Lebanon":"LB","Liberia":"LR","Libya":"LY","Liechtenstein":"LI",
    "Lithuania":"LT","Luxembourg":"LU","Madagascar":"MG","Malaysia":"MY","Mali":"ML",
    "Malta":"MT","Martinique":"MQ","Mauritania":"MR","Mauritius":"MU","Mexico":"MX",
    "Moldova":"MD","Montenegro":"ME","Morocco":"MA","Mozambique":"MZ","Namibia":"NA",
    "Netherlands":"NL","New Zealand":"NZ","Niger":"NE","Nigeria":"NG","North Macedonia":"MK",
    "Northern Ireland":"_NIR","Norway":"NO","Oman":"OM","Pakistan":"PK","Palestine":"PS",
    "Panama":"PA","Paraguay":"PY","Peru":"PE","Philippines":"PH","Poland":"PL",
    "Portugal":"PT","Qatar":"QA","Republic of Ireland":"IE","Réunion":"RE","Romania":"RO",
    "Russia":"RU","Rwanda":"RW","Saint Martin":"MF","São Tomé e Príncipe":"ST",
    "Saudi Arabia":"SA","Scotland":"_SCO","Senegal":"SN","Serbia":"RS","Seychelles":"SC",
    "Sierra Leone":"SL","Slovakia":"SK","Slovenia":"SI","South Africa":"ZA","Spain":"ES",
    "St. Kitts and Nevis":"KN","Suriname":"SR","Sweden":"SE","Switzerland":"CH","Syria":"SY",
    "Tahiti":"PF","Tanzania":"TZ","Thailand":"TH","Togo":"TG","Trinidad and Tobago":"TT",
    "Tunisia":"TN","Turkey":"TR","Türkiye":"TR","Uganda":"UG","Ukraine":"UA",
    "Uruguay":"UY","USA":"US","Uzbekistan":"UZ","Venezuela":"VE","Wales":"_WAL",
    "Zambia":"ZM","Zimbabwe":"ZW"
  };
  // case-insensitive fallback index
  const NAME_TO_ISO2_LOWER = {};
  for (const k in NAME_TO_ISO2) NAME_TO_ISO2_LOWER[k.toLowerCase()] = NAME_TO_ISO2[k];

  // GB-* Unicode tag flag sequences (iOS/most modern platforms render these)
  const TAG_FLAGS = {
    _ENG:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    _SCO:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
    _WAL:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
    _NIR:'\u{1F3F4}\u{E0067}\u{E0062}\u{E006E}\u{E0069}\u{E0072}\u{E007F}'
  };
  function flagFor(nat){
    if(!nat) return '';
    const name = String(nat).trim();
    let code = NAME_TO_ISO2[name] || NAME_TO_ISO2_LOWER[name.toLowerCase()];
    if(!code) return '';
    if(code.charAt(0)==='_') return TAG_FLAGS[code] || '';
    return code.replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
  }

  // ── Band ladder (Contract §2), from rt ────────────────────────────────
  function bandFor(rt){
    if(rt==null) return null;
    if(rt>=95) return 'Generational';
    if(rt>=90) return 'Elite';
    if(rt>=85) return 'World Class';
    if(rt>=80) return 'Exceptional';
    if(rt>=68) return 'Excellent';
    if(rt>=58) return 'Very Good';
    if(rt>=45) return 'Good';
    if(rt>=30) return 'Okay';
    return 'Poor';
  }

  // ── Prestige badge (Contract §3), bound to BAND not rt ────────────────
  // Generational badge = Generational band only; Iconic badge = Elite band.
  function prestigeFor(band){
    if(!band) return null;
    if(band==='Generational') return 'Generational';
    if(band==='Elite') return 'Iconic';
    return null;
  }

  // ── Radar (Contract §4): 5 per-90 spokes, raw + provisional 0-100 ─────
  // Real scaling is percentile-within-position, PARKED until distributions
  // land (Blueprint §7). RADAR_REF caps are PROVISIONAL placeholders only.
  const RADAR_NR_MAX = 3;   // suppress the chart at this many unmeasured axes , see radarFor
  const RADAR_REF = { goalThreat:1.5, creation:2.6, progression:4.0, defensive:8.0 };
  // INTERIM cosmetic cap , no radar dimension displays a fake-perfect 100 (mirrors the rt ceiling).
  // Remove/replace when percentile-within-position scaling lands (parked, Blueprint §7).
  const RADAR_CAP = 97;
  function radarFor(row){
    /*  A SPOKE WITH NO DATA MUST NOT RENDER AS ZERO. This is the platform's own NR rule
        (SS B: NR for missing data, never 0) and the radar was the one place breaking it.
        THE WHOLE DEFECT WAS ONE LINE: `p90` returned 0 for a null input, so absence became
        zero at the FIRST step, before scaling and before RADAR_REF. The placeholder caps are
        a separate problem and fixing them would not have fixed this.
        MEASURED: Messi 11/12, 50 goals and 16 assists, rendered creation 8 and progression 0
        out of 100. Not an absent value , a WRONG one, on 36.4% of cards.

        A DIMENSION IS NR WHEN *ANY* INPUT IS ABSENT, NOT ONLY WHEN ALL ARE. A composite
        built from a subset of its terms is a DIFFERENT, SMALLER quantity plotted on the same
        axis, which is the same falsehood in a quieter form. Measured: the all-absent rule
        left Messi's creation at 8, because assists survived and key passes did not.

        A RECORDED ZERO STAYS ZERO. A keeper who scored 0 goals has a true 0, not an NR. The
        test is whether the FIELD IS NULL, never whether the value is falsy.  */
    const m = row.minutes || 0;
    const p90 = v => (m>0 && v!=null) ? (v/m)*90 : null;
    const r2 = v => v==null ? null : Math.round(v*100)/100;
    const sc = (v,ref) => v==null ? null : Math.max(0, Math.min(RADAR_CAP, Math.round(v/ref*100)));
    const comp = terms => terms.some(t => t[0]==null) ? null
                        : terms.reduce((a,t) => a + t[1]*t[0], 0);

    const goalThreat  = comp([[p90(row.goals),1],[p90(row.shots_on),0.3]]);
    const creation    = comp([[p90(row.passes_key),1],[p90(row.assists),0.5]]);
    const progression = comp([[p90(row.dribbles_success),1],[p90(row.passes_total),0.02]]);
    const defensive   = comp([[p90(row.tackles_total),1],[p90(row.interceptions),1],[p90(row.duels_won),0.1]]);
    const reliability = Math.min(100, (m/(38*90))*100);   // raw availability, not per-90 , TRUE 100 for a full season

    const scaled = {
      goalThreat:sc(goalThreat,RADAR_REF.goalThreat),
      creation:sc(creation,RADAR_REF.creation),
      progression:sc(progression,RADAR_REF.progression),
      defensive:sc(defensive,RADAR_REF.defensive),
      reliability:Math.min(RADAR_CAP, Math.round(reliability))
    };
    /*  SUPPRESS AT THREE. With three or more axes unmeasured a card has at most two real
        ones, and TWO POINTS ARE NOT A SHAPE , the polygon degenerates to a line and reads as
        a value rather than an absence. Below that the chart still says something true and the
        NR axes are labelled. Measured at N=3: 37.0% of cards suppress, essentially every
        pre-2015 card plus most keepers , exactly the populations whose radars were fabricated. */
    const nr = ['goalThreat','creation','progression','defensive','reliability']
                 .filter(k => scaled[k]==null).length;
    return {
      raw: {
        goalThreat:r2(goalThreat), creation:r2(creation), progression:r2(progression),
        defensive:r2(defensive), reliability:Math.round(reliability*10)/10
      },
      scaled: scaled,
      nr: nr,
      suppressed: nr >= RADAR_NR_MAX,
      provisional: true
    };
  }

  // ── Confidence dots (Contract §5): 5 granular present, 2 at the wall ──
  const GRANULAR = ['shots_on','passes_key','dribbles_success','passes_total',
                    'tackles_total','interceptions','duels_won'];

  /* A KEEPER IS SCORED ON KEEPER MEASURES, ON THE SAME 2-TO-5 SCALE AS EVERY OTHER CARD.
     The seven GRANULAR fields all describe OUTFIELD play, so scoring a keeper against them
     measured how much of an outfielder's record a goalkeeper happened to have , Neuer 19/20
     read 4 of 5 under a caption saying "how complete the data behind this card is".
     That was answered for a while with a NULL score and an explicit not-yet-measured state,
     which was true only because the fields were not surfaced. The matview rebuild of
     2026-08-19 surfaced them, so that wording became the false statement , it would tell a
     visitor "not yet measured" beside a card holding 81 saves. It is retired.
     What is left is NOT a special keeper state. It is ordinary NR: the source did not record
     it for that season, exactly as a pre-2015 outfielder already reads (15,181 of them score
     2 of 5 with all seven granular fields NR). So keepers get a keeper FIELD SET inside the
     normal scale, and no bespoke state that can go stale again.

     FOUR KEEPER MEASURES, OF WHICH THE SOURCE CARRIES THREE. Clean sheets are not on
     player_card_mv at all, and neither are shots faced, so a save rate cannot be derived
     either. 3 of 4 gives 2 + 3*(3/4) = 4.25 -> 4, so A KEEPER TOPS OUT AT 4 OF 5 AND THAT
     CEILING IS REAL, not a rounding artefact. Letting a keeper print 5 of 5 would claim
     parity with an outfielder's full record, which is the same overclaim in a new costume.
     Measured on the live matview: 2,784 keeper cards hold all three, 1,483 hold none, and
     only 10 hold two , the three fields move as one, so the score is honest at two values.

     THE isGK TEST IS DELIBERATELY WIDE, AND IT IS A MITIGATION, NOT THE FIX. 27 cards carry
     coarse position 'GK' with a position_pool of 'UNK', and 22 of those DO have saves data;
     under a coalesce test they would be scored against the seven outfield fields and read as
     near-empty. OR-ing the two fields pulls them in. The underlying defect is the position
     data itself (see §E position-pool accuracy) and this does not fix it , do not read this
     as the fix and close that thread. */
  function isGK(row){ return row.position === 'GK' || row.position_pool === 'GK'; }

  // key:null means the measure exists in football but not in our source, so it can never be
  // present. It still gets a row, because "we do not have this" is the honest thing to show.
  const KEEPER_SET = [
    { key:'saves',           label:'Saves' },
    { key:'goals_conceded',  label:'Goals conceded' },
    { key:'penalties_saved', label:'Penalties saved' },
    { key:null,              label:'Clean sheets' }
  ];

  /*  ── THE AI PAYLOAD , ONE BUILDER FOR BOTH MODES ────────────────────────────
      The card notes and the compare verdict were assembling their own stat blocks, so the
      model saw different things on two surfaces describing the same card. One builder, so
      they cannot drift , the same reason the row CSS and the search matcher were unified.

      WHAT IT ADDS, AND WHY EACH IS SAFE TO SAY:
      , PASSING VOLUME per 90 plus the POOL REFERENCE. The reference is the tag engine's own
        `passes90_p80` / `_p90` for that position pool, already measured and already shipping,
        so no query and no matview change. It lets the prose say "above the bar for his
        position" instead of quoting a bare number nobody can scale.
      , KEY PASSES per 90. 100% covered every season and internally consistent.
      , MINUTES, STARTS, APPEARANCES , the denominator. A rate without its sample invites the
        model to treat 12 games and 38 games as the same evidence.
      , THE KEEPER BLOCK, and the 75 CAP AS A FACT IN THE PAYLOAD, not only in the prompt.
      , THE MISSING-FIELD LIST from `confidenceFields`, so hedging is earned rather than
        stylistic.
      , ERA AND COVERAGE. Nothing granular exists before 2015; a 2012 card must not be
        written with 2024 certainty.

      `passes_accuracy` IS DELIBERATELY ABSENT AND MUST STAY ABSENT , it is a VALIDITY
      problem, not a coverage one (§E): the provider reads Kroos 92 in 2019 and 67 in 2020 at
      the same club on the same volume, and sustains Modric at 44-55. Feeding it would have
      the model assert that Kroos passed at 67%.  */
  const AI_GRANULAR_ERA = 2015;          // nothing granular exists before this
  /*  NAMED aiPer90, NOT per90. There is ALREADY a `per90` in this file (the tag engine's,
      further down) and a second function declaration of the same name in the same scope
      does not error , it HOISTS and the later one silently wins, so the first is dead code
      that looks alive. The first version of this shipped rounded values and produced
      unrounded ones, which is how it was caught. Same defect family as two fields for one
      concept: one name, two meanings, no error.  */
  function aiPer90(v, mins){
    if (v == null || !mins || mins <= 0) return null;
    return Math.round((v / (mins / 90)) * 10) / 10;
  }
  function vvAIStats(row){
    if (!row) return {};
    const pool = row.position_pool || null;
    const th   = (pool && TAG_THRESHOLDS_POOL[pool]) || null;
    const mins = row.minutes;
    const out = {
      minutes: mins != null ? mins : null,
      starts: row.starts != null ? row.starts : null,
      appearances: row.appearances != null ? row.appearances : null,
      passes_per90: aiPer90(row.passes_total, mins),
      key_passes_per90: aiPer90(row.passes_key, mins)
    };
    // the bar for HIS position, so a number can be read as high or low without a league rank
    if (th){
      out.pool = pool;
      out.pool_passes_per90_p80 = th.passes90_p80 != null ? th.passes90_p80 : null;
      out.pool_passes_per90_p90 = th.passes90_p90 != null ? th.passes90_p90 : null;
    }
    if (isGK(row)){
      out.keeper = {
        saves: row.saves != null ? row.saves : null,
        goals_conceded: row.goals_conceded != null ? row.goals_conceded : null,
        penalties_saved: row.penalties_saved != null ? row.penalties_saved : null,
        starts: row.starts != null ? row.starts : null,
        rt_is_capped_at_75: true,
        cap_reason: 'a platform measurement boundary, not a judgement on his goalkeeping'
      };
    }
    /* PREFER THE OBJECT'S OWN CONFIDENCE. rowToCard already computed it FROM THE RAW ROW and
       attached it; recomputing from a card gives a DIFFERENT answer, because a card does not
       carry every granular column. Measured: 5 from the row, 4 from the card, same season.
       The payload must agree with the Data Confidence panel the reader is looking at. */
    const cf = (Array.isArray(row.confidenceFields) && row.confidenceFields.length)
      ? row.confidenceFields : (confidenceFields(row) || []);
    out.confidence = (row.confidence != null) ? row.confidence : confidenceFor(row);
    out.missing = cf.filter(function(f){ return !f.present; }).map(function(f){ return f.label; });
    const y = row.season_year;
    out.era = (y != null && y < AI_GRANULAR_ERA)
      ? 'pre-2015: ONLY appearances, minutes, goals and discipline exist for this season. Every other measure is absent, not zero.'
      : 'granular data available for this season';
    return out;
  }

  /*  ── THE KEEPER SCORE ────────────────────────────────────────────────────────
      ONE MEASURE CARRIES IT: SAVE PERCENTAGE, saves / (saves + goals_conceded). Shots faced
      is not stored; it is that sum, and the derivation is sound because a shot on target is
      either saved or conceded.

      WHY THE RATE AND NEVER THE COUNT , this is the whole design, measured on 2,179
      keeper-seasons:
        save% vs shots faced per 90        -0.118   essentially independent
        shots faced per 90 vs conceded/90  +0.835   volume tracks team weakness almost wholly
      So RAW SAVES IS A TEAM MEASURE AND SAVE PERCENTAGE IS NOT. A keeper behind a poor
      defence faces more shots and makes more saves; the rate does not reward him for it and
      does not punish him either. Same family as the `goals_against` rejection for CBs,
      landing the other way because a rate has a denominator the team supplies to both halves.

      GLOBAL POOL PERCENTILE, NOT PER LEAGUE-SEASON. Median save% runs 66.9% (BL) to 69.6%
      (LL/PRT) , a 2.7-point spread, unlike every outfield metric, so normalising per league
      would add machinery and move nothing.

      THE GATE IS 800 MINUTES AND 60 SHOTS FACED. Ungated, the top of the pool is 300-minute
      cameos facing three shots at 100%. 1,070 of 2,990 keeper-seasons from 2015 fall outside
      it and get NO score rather than a noisy one.

      2015+ ONLY, AND THE CLIFF IS ABSOLUTE: saves coverage is 0% for 2010-2013, 4% in 2014,
      then 84-100%. 1,299 keeper-seasons before 2015 carry minutes and starts and nothing
      else. They fall through to the existing treatment with the boundary disclosed.

      NO PENALTY TERM. `penalties_saved` correlates only 0.10 with volume, so it is genuinely
      the keeper's act , but `penalties_missed` is zero for all but 2 of 1,583 keepers, so
      PENALTIES FACED IS NOT DERIVABLE and the field is a count with no denominator. Tested
      at 10% weight it put Trapp above Donnarumma and dropped ter Stegen, the highest save%
      in the pool, to 39th. It is a stated FACT on the card, never a score term.

      WHAT IT CANNOT SEPARATE, AND THIS IS PUBLISHED, NOT BURIED: shot quality. There is no
      xG, no location, no shot type. Twenty tap-ins and twenty thirty-yarders score the same.
      Nor can it see distribution, command of the area or sweeping.

      THE 75 CAP IS UNTOUCHED. Lifting it is a separate decision in a separate pass.  */
  const KEEPER_MIN_MINUTES = 800;
  const KEEPER_MIN_SHOTS   = 60;
  const KEEPER_ERA         = 2015;
  // save% at every 5th percentile of the gated pool (n=1,920), measured 2026-08-28
  const KEEPER_SAVE_LADDER = [0.4688,0.5915,0.6154,0.6299,0.6410,0.6484,0.6571,0.6639,0.6721,
                              0.6790,0.6867,0.6928,0.6988,0.7059,0.7113,0.7194,0.7273,0.7364,
                              0.7500,0.7667,0.8852];
  function keeperScore(row){
    if (!row || !isGK(row)) return null;
    const out = { eligible:false, reason:null, savePct:null, pct:null,
                  saves:row.saves, conceded:row.goals_conceded, shotsFaced:null,
                  penaltiesSaved:row.penalties_saved, minutes:row.minutes, starts:row.starts };
    if ((row.season_year||0) < KEEPER_ERA){ out.reason = 'pre-2015: shot data was never recorded'; return out; }
    if (row.saves == null || row.goals_conceded == null){ out.reason = 'saves or goals conceded not recorded'; return out; }
    const sf = row.saves + row.goals_conceded;
    out.shotsFaced = sf;
    if ((row.minutes||0) < KEEPER_MIN_MINUTES){ out.reason = 'under ' + KEEPER_MIN_MINUTES + ' minutes, too small a sample'; return out; }
    if (sf < KEEPER_MIN_SHOTS){ out.reason = 'under ' + KEEPER_MIN_SHOTS + ' shots faced, too small a sample'; return out; }
    const svp = sf > 0 ? row.saves / sf : null;
    if (svp == null){ out.reason = 'no shots faced'; return out; }
    out.savePct = svp;
    // linear interpolation into the measured ladder
    const L = KEEPER_SAVE_LADDER;
    let pct = 100;
    if (svp <= L[0]) pct = 0;
    else for (let i = 1; i < L.length; i++){
      if (svp <= L[i]){ const lo = L[i-1], hi = L[i];
        pct = (i-1)*5 + (hi > lo ? ((svp-lo)/(hi-lo))*5 : 0); break; }
    }
    out.pct = Math.max(0, Math.min(100, Math.round(pct)));
    out.eligible = true;
    return out;
  }


  /* ══ THE GOALKEEPER PANEL , replaces the radar on a keeper card ═══════════════
     IT LIVES HERE AND NOT IN card.html ON PURPOSE. §C: a card rule that lives in the
     pages and not in vv-core is a trap for the next surface , the Generational face
     was exactly that, and the copies had already drifted before anyone noticed.
     Compare will need this panel the day it renders a keeper.

     NO RADAR. Two measurable axes is not a shape. save% and penalties saved are the
     only keeper measures we hold that are the keeper's own act, and a two-point radar
     is a line. The percentile LADDER carries the score instead.

     EVERY COLOUR IS A TOKEN, SO THE HOST SURFACE DECIDES. On card.html the panel sits
     inside .layer, which is cream in BOTH themes and pins --charcoal/--ink-soft/
     --pink-ink to that cream ground. Hard-coding a theme-flipping colour here would be
     the §C mistake of pinning an ink to a ground that does not move. The one literal is
     the conceded block's rgba(0,0,0,.10) tint, which assumes a LIGHT ground , correct
     for the card layer, and the thing to revisit first if this is ever put on a dark one.

     THE BAR IS COMPOSITION, NOT MERIT, so it is drawn in ink and a muted tint and never
     in pink. Pink on this panel means the score, and only the ladder carries the score. */
  var VV_GK_CSS = `
.gkp{margin:2px 0 4px}
.gkp-k{font-family:'Archivo';font-weight:800;font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-soft);margin:16px 0 8px}
.gkp-k:first-child{margin-top:0}
.gkp-lad{display:flex;align-items:flex-end;gap:16px}
.gkp-fig{flex:none;text-align:left}
.gkp-pc{font-family:'Archivo';font-weight:800;font-size:38px;line-height:.95;color:var(--pink-ink)}
.gkp-pl{font-family:'Inter';font-size:11px;color:var(--ink-soft);margin-top:3px}
.gkp-tw{flex:1;min-width:0;padding-bottom:2px}
.gkp-tr{position:relative;height:38px}
.gkp-base{position:absolute;left:0;right:0;top:19px;height:6px;border-radius:99px;background:rgba(0,0,0,.09)}
.gkp-fill{position:absolute;left:0;top:19px;height:6px;border-radius:99px;background:linear-gradient(90deg,rgba(231,4,67,.35),var(--pink))}
.gkp-rung{position:absolute;top:12px;width:1px;height:20px;background:rgba(0,0,0,.16)}
.gkp-rlab{position:absolute;top:0;transform:translateX(-50%);font-family:'Inter';font-size:9.5px;color:var(--ink-soft);white-space:nowrap}
.gkp-mark{position:absolute;top:14px;width:3px;height:16px;border-radius:2px;background:var(--pink);transform:translateX(-1.5px)}
.gkp-ends{display:flex;justify-content:space-between;font-family:'Inter';font-size:10px;color:var(--ink-soft);margin-top:4px}
.gkp-say{font-family:'Inter';font-size:11.5px;line-height:1.5;color:var(--ink-soft);margin-top:8px}
.gkp-say b{font-family:'Archivo';font-weight:800;color:var(--pink-ink)}
.gkp-bar{display:flex;height:34px;border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,.12)}
.gkp-s{background:var(--charcoal);color:var(--cream);display:flex;align-items:center;padding-left:10px;font-family:'Archivo';font-weight:800;font-size:13px}
.gkp-c{background:rgba(0,0,0,.10);color:var(--charcoal);display:flex;align-items:center;justify-content:flex-end;padding-right:10px;font-family:'Archivo';font-weight:800;font-size:13px}
.gkp-mid{text-align:center;font-family:'Inter';font-size:11.5px;color:var(--ink-soft);margin-top:7px}
.gkp-keys{display:flex;justify-content:space-between;font-family:'Inter';font-size:10.5px;color:var(--ink-soft);margin-top:5px}
.gkp-figs{display:flex;gap:26px;flex-wrap:wrap}
.gkp-f b{display:block;font-family:'Archivo';font-weight:800;font-size:19px;line-height:1.1;color:var(--charcoal)}
.gkp-f span{font-family:'Inter';font-size:10.5px;color:var(--ink-soft);letter-spacing:.04em;text-transform:uppercase}
.gkp-lim{margin-top:18px;padding:11px 13px;border-left:2px solid var(--gold);background:rgba(232,184,75,.14);border-radius:0 8px 8px 0;font-family:'Inter';font-size:12px;line-height:1.5;color:var(--ink-soft)}
.gkp-lim b{color:var(--charcoal);font-weight:700}
.gkp-no{padding:12px 14px;border:1px dashed rgba(0,0,0,.20);border-radius:10px;font-family:'Inter';font-size:12.5px;color:var(--ink-soft);line-height:1.5}
.gkp-no b{color:var(--charcoal);font-weight:700}
@media(max-width:430px){ .gkp-lad{gap:12px} .gkp-pc{font-size:32px} .gkp-figs{gap:18px} }
`;
  function vvInjectGKCSS(){
    if (typeof document === 'undefined') return;
    if (document.getElementById('vv-gk-css')) return;
    var st = document.createElement('style'); st.id = 'vv-gk-css';
    st.textContent = VV_GK_CSS;
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) head.appendChild(st);
  }
  function gkNum(v){ return v == null ? 'NR' : v; }
  /*  k is a keeperScore() result. Returns '' for a non-keeper so a caller can use the
      return value itself as the "is this a keeper card" test and never draw an empty box. */
  function keeperPanelHTML(k){
    if (!k) return '';
    vvInjectGKCSS();
    var h = '<div class="gkp">';
    if (k.eligible){
      var rungs = [50,75,90], ticks = '';
      for (var i=0;i<rungs.length;i++){
        ticks += '<div class="gkp-rung" style="left:'+rungs[i]+'%"></div>'
              +  '<div class="gkp-rlab" style="left:'+rungs[i]+'%">'+rungs[i]+'th</div>';
      }
      h += '<div class="gkp-k">Save rate, against every goalkeeper we can measure</div>'
        +  '<div class="gkp-lad">'
        +    '<div class="gkp-fig"><div class="gkp-pc">'+(100*k.savePct).toFixed(1)
        +      '<span style="font-size:20px">%</span></div><div class="gkp-pl">shots saved</div></div>'
        +    '<div class="gkp-tw"><div class="gkp-tr"><div class="gkp-base"></div>'
        +      '<div class="gkp-fill" style="width:'+k.pct+'%"></div>'+ticks
        +      '<div class="gkp-mark" style="left:'+k.pct+'%"></div></div>'
        +      '<div class="gkp-ends"><span>weakest</span><span>strongest</span></div></div></div>'
        +  '<div class="gkp-say"><b>'+k.pct+'th percentile</b> among goalkeepers with a comparable '
        +    'sample, 2015 onward.</div>';
      var pcS = 100 * k.saves / k.shotsFaced;
      h += '<div class="gkp-k">Saved versus conceded</div>'
        +  '<div class="gkp-bar"><div class="gkp-s" style="width:'+pcS+'%">'+k.saves+'</div>'
        +    '<div class="gkp-c" style="width:'+(100-pcS)+'%">'+k.conceded+'</div></div>'
        +  '<div class="gkp-mid">'+k.shotsFaced+' shots on target faced</div>'
        +  '<div class="gkp-keys"><span>saved</span><span>conceded</span></div>'
        +  '<div class="gkp-say" style="color:var(--ink-soft)">How many shots he faced is a fact '
        +    'about the team in front of him, not a measure of how well he kept goal.</div>';
    } else {
      h += '<div class="gkp-k">Save rate</div><div class="gkp-no"><b>Not scored.</b> '
        +  k.reason + '. This card shows what was recorded and nothing more.</div>';
    }
    h += '<div class="gkp-k">Recorded</div><div class="gkp-figs">'
      +  '<div class="gkp-f"><b>'+gkNum(k.minutes)+'</b><span>minutes</span></div>'
      +  '<div class="gkp-f"><b>'+gkNum(k.starts)+'</b><span>starts</span></div>'
      +  '<div class="gkp-f"><b>'+gkNum(k.penaltiesSaved)+'</b><span>pens saved</span></div>'
      +  '<div class="gkp-f"><b>'+gkNum(k.saves)+'</b><span>saves</span></div>'
      +  '<div class="gkp-f"><b>'+gkNum(k.conceded)+'</b><span>conceded</span></div></div>'
      +  '<div class="gkp-lim"><b>What this cannot tell you.</b> We record whether a shot was '
      +  'saved, never how hard it was. A keeper facing twenty close-range chances and one facing '
      +  'twenty from distance score the same here. Nothing in these figures measures distribution, '
      +  'command of the area or sweeping, so this card does not claim any of it. Penalties saved '
      +  'is a count, not a rate: we do not know how many he faced.</div></div>';
    return h;
  }

  function confidenceFor(row){
    const keeper = isGK(row);
    const total = keeper ? KEEPER_SET.length : GRANULAR.length;
    let present = 0;
    if (keeper) { for (const m of KEEPER_SET) if (m.key && row[m.key]!=null) present++; }
    else        { for (const f of GRANULAR)   if (row[f]!=null) present++; }
    return Math.round(2 + (present/total)*3);      // linear 2..5, unchanged for outfielders
  }
  function confidenceFields(row){
    var LABELS = {
      shots_on:'Shots on target',
      passes_key:'Key passes',
      dribbles_success:'Successful dribbles',
      passes_total:'Total passes',
      tackles_total:'Tackles',
      interceptions:'Interceptions',
      duels_won:'Duels won'
    };
    var basics = [
      { label:'Minutes played', present: row.minutes != null, group:'basics' },
      { label:'Goals',          present: row.goals   != null, group:'basics' },
      { label:'Assists',        present: row.assists != null, group:'basics' }
    ];
    // A keeper gets the keeper measures, not the outfield ones. Listing "Successful
    // dribbles , NR" against a goalkeeper is the same false claim as the score was,
    // just itemised, and Compare builds its "missing:" line straight off this group.
    // present is now REAL per field, not hardcoded false , the data is on the matview.
    if (isGK(row)) {
      return basics.concat(KEEPER_SET.map(function(m){
        return { label:m.label, present: !!(m.key && row[m.key] != null), group:'keeper' };
      }));
    }
    var advanced = GRANULAR.map(function(f){
      return { label: LABELS[f] || f, present: row[f] != null, group:'advanced' };
    });
    return basics.concat(advanced);
  }

  /* ════════════════════════════════════════════════════════════════════
   *  getVVTags() , v1 PROFILE TAG ENGINE  (ported verbatim from
   *  getVVTags_v1_draft.js , round-4 tuned thresholds. SOURCE OF TRUTH.)
   *  - Position-relative thresholds per coarse family (DEF/MID/FWD/GK).
   *  - Eligibility gating: fine position_pool decides WHICH tags apply.
   *  - Null-safe: granular tags don't fire if the stat is missing.
   *  - A season earns EVERY tag it crosses; the display layer trims.
   * ════════════════════════════════════════════════════════════════════ */
  /* ── REKEYED 2026-08-13 , thresholds now come from the 8-bucket position_pool ──
     WHY: TAG_THRESHOLDS below is keyed on the COARSE position field (DEF/MID/FWD/GK),
     but eligibility() has always run on position_pool, so the two halves of the tag
     engine disagreed. Worse, a pool spans MORE THAN ONE coarse family , 4,740 of
     37,091 pooled cards (12.78%) sit in a minority family for their pool , so the
     same position faced a different bar depending on a field CLAUDE.md records as
     systematically broken (attacking mids + wingers dumped into CM by API-Football).
     MEASURED: the Goal Machine cut landed at p99.5 for a CAM read as FWD and p75.3
     for a CAM read as MID. A 24-percentile swing decided by a data defect.

     CALIBRATION (correctness, NOT rarity , no floor was tuned in this change):
     for each key, the pass-rate the coarse table produced across all pooled cards was
     measured, then each pool's value set at that same rate within its OWN distribution.
     Every pool therefore carries an identical rarity bar and the aggregate population
     is preserved by construction. Rarity tuning is a separate, later decision.

     NULL/UNK POOL (35% of cards, mostly pre-2016) STILL USES THE COARSE TABLE BELOW.
     That fallback is load-bearing , do not delete TAG_THRESHOLDS.
     GK carries minutes_p90 only, matching the existing design (no keeper stats). */
  const TAG_THRESHOLDS_POOL = {
    GK: {
      minutes_p90: 3240,
    },
    FB: {
      goals90_p90: 0.115, goals90_p85: 0.094, goals90_p80: 0.081,
      assists90_p90: 0.206,
      keypass90_p90: 1.361, keypass90_p80: 1.078,
      passes90_p90: 57.707, passes90_p80: 50.403, passacc_p80: 82,
      drib90_p90: 1.246, drib90_p85: 1.051,
      defact90_p90: 4.946, defact90_p70: 4.014,
      int90_p90: 2.321, duelswon90_p90: 6.555,
      conversion_p90: 0.25, minutes_p90: 2781,
    },
    CB: {
      goals90_p90: 0.113, goals90_p85: 0.095, goals90_p80: 0.082,
      assists90_p90: 0.156,
      keypass90_p90: 0.951, keypass90_p80: 0.652,
      passes90_p90: 65.43, passes90_p80: 57.77, passacc_p80: 82,
      drib90_p90: 1, drib90_p85: 0.794,
      defact90_p90: 4.974, defact90_p70: 4.074,
      int90_p90: 2.357, duelswon90_p90: 6.551,
      conversion_p90: 0.25, minutes_p90: 2839,
    },
    CDM: {
      goals90_p90: 0.2, goals90_p85: 0.171, goals90_p80: 0.143,
      assists90_p90: 0.235,
      keypass90_p90: 1.853, keypass90_p80: 1.453,
      passes90_p90: 62.449, passes90_p80: 54.722, passacc_p80: 85,
      drib90_p90: 1.474, drib90_p85: 1.252,
      defact90_p90: 5.159, defact90_p70: 4.109,
      int90_p90: 2.049, duelswon90_p90: 7.222,
      conversion_p90: 0.232, minutes_p90: 2762,
    },
    CM: {
      goals90_p90: 0.265, goals90_p85: 0.227, goals90_p80: 0.191,
      assists90_p90: 0.271,
      keypass90_p90: 2.038, keypass90_p80: 1.679,
      passes90_p90: 59.594, passes90_p80: 51.888, passacc_p80: 82,
      drib90_p90: 1.859, drib90_p85: 1.611,
      defact90_p90: 4.976, defact90_p70: 3.773,
      int90_p90: 2.057, duelswon90_p90: 7.479,
      conversion_p90: 0.239, minutes_p90: 2679,
    },
    CAM: {
      goals90_p90: 0.395, goals90_p85: 0.349, goals90_p80: 0.31,
      assists90_p90: 0.353,
      keypass90_p90: 2.355, keypass90_p80: 1.945,
      passes90_p90: 50.245, passes90_p80: 43.135, passacc_p80: 79,
      drib90_p90: 2.69, drib90_p85: 2.368,
      defact90_p90: 4.273, defact90_p70: 2.925,
      int90_p90: 1.677, duelswon90_p90: 7.855,
      conversion_p90: 0.25, minutes_p90: 2623,
    },
    Winger: {
      goals90_p90: 0.472, goals90_p85: 0.408, goals90_p80: 0.359,
      assists90_p90: 0.345,
      keypass90_p90: 2.235, keypass90_p80: 1.859,
      passes90_p90: 45.562, passes90_p80: 39.407, passacc_p80: 81,
      drib90_p90: 2.613, drib90_p85: 2.243,
      defact90_p90: 3.973, defact90_p70: 2.778,
      int90_p90: 1.537, duelswon90_p90: 7.531,
      conversion_p90: 0.263, minutes_p90: 2623,
    },
    ST: {
      goals90_p90: 0.674, goals90_p85: 0.596, goals90_p80: 0.534,
      assists90_p90: 0.297,
      keypass90_p90: 1.883, keypass90_p80: 1.512,
      passes90_p90: 33.611, passes90_p80: 28.232, passacc_p80: 77,
      drib90_p90: 2.12, drib90_p85: 1.832,
      defact90_p90: 2.345, defact90_p70: 1.577,
      int90_p90: 0.791, duelswon90_p90: 8.197,
      conversion_p90: 0.3, minutes_p90: 2637,
    },
  };

  // Threshold lookup, baked from live data (player_card_view, min 300 mins).
  // Per coarse family. Values are per-90 unless noted. p90 = top 10%, etc.
  const TAG_THRESHOLDS = {
    FWD: {
      goals90_p90: 0.598, goals90_p85: 0.528, goals90_p80: 0.477,
      assists90_p90: 0.318,
      keypass90_p90: 2.000, keypass90_p80: 1.645,
      passes90_p90: 35.099, passes90_p80: 30.132, passacc_p80: 78.0,
      drib90_p90: 2.440, drib90_p85: 2.124,
      defact90_p90: 2.651, defact90_p70: 1.816,
      int90_p90: 0.917, duelswon90_p90: 8.081,
      conversion_p90: 0.286, minutes_p90: 2571,
    },
    MID: {
      goals90_p90: 0.283, goals90_p85: 0.238, goals90_p80: 0.204,
      assists90_p90: 0.286,
      keypass90_p90: 2.115, keypass90_p80: 1.712,
      passes90_p90: 59.724, passes90_p80: 52.148, passacc_p80: 83.0,
      drib90_p90: 1.952, drib90_p85: 1.677,
      defact90_p90: 4.873, defact90_p70: 3.698,
      int90_p90: 1.983, duelswon90_p90: 7.450,
      conversion_p90: 0.250, minutes_p90: 2703,
    },
    DEF: {
      goals90_p90: 0.125, goals90_p85: 0.102, goals90_p80: 0.085,
      assists90_p90: 0.193,
      keypass90_p90: 1.216, keypass90_p80: 0.916,
      passes90_p90: 62.508, passes90_p80: 54.138, passacc_p80: 83.0,
      drib90_p90: 1.161, drib90_p85: 0.958,
      defact90_p90: 5.055, defact90_p70: 4.091,
      int90_p90: 2.418, duelswon90_p90: 6.571,
      conversion_p90: 0.263, minutes_p90: 2836,
    },
    GK: { // GKs earn NO profile tags in v1 (no keeper stats exist). Age + prestige only.
      minutes_p90: 3252,
    },
  };

  // ── RAW + SAMPLE GUARDS (added 2026-08-09, simulated across all 57,234 cards first) ──
  // WHY: the per-90 thresholds alone were position-relative but SCALE-BLIND. A 6-goal season
  // over 1,687 minutes clears the MID p90 goal rate and was earning "Goal Machine" (Nico
  // Williams 2526); a 1-assist season was earning "Playmaker" off key passes alone, because
  // Playmaker read passes_key and never touched assists (Barcola 2526).
  //
  // MEASURED EFFECT (% of all 57,234 cards): Goal Machine 5.45 -> 1.49, Playmaker 6.35 -> 2.78.
  // Iron Man and the two age tags are deliberately untouched , Iron Man is a minutes tag by
  // construction and the age tags key off rt, not per-90.
  //
  // MARKSMAN WAS RETIRED 2026-08-13, and the note that used to sit here (`MIN_GOALS_MARKSMAN
  // is not optional, every card Goal Machine rejects falls straight into Marksman`) described
  // exactly the defect that killed it: Marksman was defined by FAILING Goal Machine's bar, so
  // it was a TIER, not a TYPE, and its name promised precision it never measured. The rekey
  // made that visible , Kane 2021 (23 goals, 0.6706/90 against an ST bar of 0.674) dropped
  // from Goal Machine to "Marksman" by 0.004.
  //
  // WHY IT WAS NOT REDEFINED AS ACCURACY INSTEAD (measured, do not re-litigate): shots-on-target
  // ratio correlates 0.614 with conversion (0.586 within ST), so accuracy and efficiency are ONE
  // axis, and `shots_on` is 100% NULL before 2015. Shot volume correlates 0.459 with goals, so it
  // re-awards Goal Machine. Minutes-per-goal is goals-per-90 inverted (Spearman -1.000, an
  // identity). NO PENALTY FIELD EXISTS anywhere in the schema, so non-penalty goals cannot be
  // derived. Scoring is therefore TWO independent axes , volume and efficiency , and
  // shots_total vs conversion at 0.180 is the number that says so.
  // RAISED 12 -> 15 AND THE RATE CUT DROPPED ENTIRELY (2026-08-13). This REVERSES the note that
  // stood here, which rejected 15 as POSITION-BLIND because it strips De Bruyne 1920 (13g, rt91),
  // Pogba 1819, Son 1617 and Maddison 2122. That cost is REAL and was accepted with the evidence
  // in hand , it is not an oversight, and the four names above are the price.
  //
  // WHAT OVERTURNED IT: the rate cut was rejecting FULL SEASONS, not worse scorers. Among cards
  // with 20+ goals, 55 did NOT hold Goal Machine, and the rejected group averaged 3,028 minutes
  // against 2,688 for holders , +340. The gap WIDENS with volume (15+ goals +255, 18+ +318,
  // 20+ +340), which is the signature of a per-90 artefact, not a scoring judgement: a 21-goal
  // ever-present was refused while a 24-goal player in 2,500 minutes qualified.
  //
  // WHY NOT SOFTEN THE RATE INSTEAD: every softening (x0.90/x0.85/x0.80) KEEPS the 12-goal floor,
  // so the bottom edge never moves , it stays Cazorla 1213 (12g, 0.326/90), Vanaken 1718 (rt 70),
  // Toornstra 1314 (rt 72). Softening only adds cards ABOVE the floor. A hard 15 is the only
  // option whose lowest holders read as football: Defoe, Belotti, Haller, Griezmann 1819,
  // Palmer 2425, Odegaard 2223 , all exactly 15 goals over 3,150-3,320 minutes.
  //
  // THE FLOOR IS NOW HARD, NOT rawFloorOK. rawFloorOK treats a NULL raw stat as EXEMPT, which is
  // right when a rate cut is also present but CATASTROPHIC once it is the only test , it would
  // award Goal Machine to all 466 eligible cards with NULL goals. Do not route this through
  // rawFloorOK to "match the other floors". It is deliberately different because it is now the
  // WHOLE rule, and it is the reason MIN_GOALS_MARKSMAN's removal is safe.
  // FLAT 15 WAS WRONG AND WAS REPLACED SAME-DAY BY A PER-POOL FLOOR. A flat floor is
  // POSITION-BLIND, which is the exact defect the TAG_THRESHOLDS_POOL rekey above had just
  // removed: it dropped CM in Goal Machine from 38 cards to 5 and made the tag 66% strikers,
  // because it asks a midfielder to score like a forward.
  //
  // CALIBRATION: each pool's floor is the integer landing nearest a 4% within-pool rarity, the
  // same equal-rarity method as the threshold rekey. 4% (not the 14.81% that a 15-goal ST floor
  // represents) because the target sets the TOTAL: 14.81% gives 3,136 cards (5.48%, which would
  // make Goal Machine the second most common tag on the platform), while 4% gives 887 , within
  // 12 of the flat rule and within 34 of where the tag stood at HEAD.
  //
  // EQUAL-RARITY CALIBRATION IS CORRECT FOR A RATE TAG AND BREAKS ON A VOLUME TAG, AND THIS IS
  // THE THING TO REMEMBER HERE. "Top 10% of your pool by goals per 90" is a genuinely relative
  // statement, so the rekey was sound. "Goal Machine" is NOT relative , the NAME makes an
  // absolute claim about goals. A 3-goal centre-back is as rare among centre-backs as a 15-goal
  // striker is among strikers, and is still not a goal machine. Rarity and identity come apart.
  // At the first calibration the ten lowest holders were 3-goal CBs and FBs at rt 49-73.
  //
  // SO CB AND FB ARE DROPPED FROM ELIGIBILITY ENTIRELY (see eligibility() below). They were only
  // ever eligible via miscoded coarse positions (211 CB and 167 FB cards), so removing them
  // COSTS 45 CARDS AND ELIMINATES EVERY ABSURD BOTTOM HOLDER IN ONE STEP , a far better trade
  // than tightening the floor further, which would push real scorers out to fix a fringe.
  //
  // No coarse DEF fallback is defined ON PURPOSE: elig.goalMachine requires coarse FWD|MID, so a
  // DEF entry would be dead config that reads like a live rule. Verified 0 reachable cards.
  const GOAL_FLOOR_POOL   = { ST: 23, Winger: 16, CAM: 13, CM: 9, CDM: 7 };
  const GOAL_FLOOR_COARSE = { FWD: 15, MID: 9 };   // null/UNK pool only (35% of cards)
  /* POOL -> COARSE FAMILY. eligibility() resolves the family from the POOL first and falls
     back to the coarse field, EXACTLY as TAG_THRESHOLDS_POOL[pool] || TAG_THRESHOLDS[fam] does.
     WHY (measured 2026-08-14): before this, eligibility read the COARSE field while thresholds
     read the POOL, so a miscoded card was ADMITTED by one and JUDGED by the other , and it drew
     whichever bar was easiest. An ST-pool card carrying coarse MID was eligible for Engine Room
     (a MID-only tag) but judged against ST's passes90_p80 of 28.2 instead of MID's 51.9, so it
     cleared trivially. 198 Engine Room holders sat in the ST pool.
     THE DAMAGE, as a share of each tag held by minority-family cards against an 8.28% population
     baseline: Maestro 46.0%, Engine Room 39.4%, Playmaker 21.7%, Regista 18.4%, The Winger 18.4%,
     Complete 15.9%, Provider 15.7%. Every one of those tags had a bottom ten made entirely of
     cards whose pool contradicted the tag , CBs holding The Dribbler, strikers holding Regista.
     RAISING THE BARS DOES NOT FIX IT: at Provider x1.20 and The Dribbler x1.30 the bottom ten are
     still entirely CB, because those cards pass on the WRONG POOL'S threshold, not by a margin. */
  const POOL_FAMILY = { GK:'GK', ST:'FWD', Winger:'FWD', CAM:'FWD', CM:'MID', CDM:'MID', FB:'DEF', CB:'DEF' };

  function goalFloorFor(pool, fam) {
    var f = GOAL_FLOOR_POOL[pool];
    if (f != null) return f;
    var c = GOAL_FLOOR_COARSE[fam];
    return c != null ? c : null;                   // no floor -> tag unreachable, never a free pass
  }
  /* ── RARITY FLOORS (2026-08-14) ──────────────────────────────────────────────────────────
     CEILING for the platform: no tag over roughly 2.0% of all cards. IT IS A CEILING, NOT A
     TARGET, AND THERE IS NO FLOOR (corrected 2026-08-16). This pass tuned the tags that were
     OVER it; it never tried to lift anything UP to it. Maestro 0.67%, The Winger 0.52%, Poacher
     0.47% and Ball-Playing CB 0.36% sit below and are CORRECT there , each names one position
     doing one recognisable thing, so rarity follows the archetype. Loosening them to reach 1%
     would admit players who are not that thing, which is the error the identity-vs-ability fix
     removed. DO NOT AUDIT FOR UNDER-BAND TAGS. Set AFTER the eligibility fix
     (04d127d), because that alone moved Engine Room, Regista and Maestro into band without a
     single threshold changing , tuning before it would have been tuning twice.

     LEVER CHOSEN PER TAG, on the BOTTOM EDGE rather than on the count. A raw floor and a rate
     multiplier can land on the same percentage and select very different cards: for Complete the
     two candidates both gave exactly 1,011 cards and overlapped on only 685 of them.
     Measured, holders below rt 50 / holders under 1,200 minutes:
       The Wall   x1.10 -> 17.5% / 18.3%     raw tackles>=50 -> 7.7% / 1.2%   <- floor wins
       Ball Hawk  x1.15 -> 33.2% / n/a       raw int>=60     -> 26.3%         <- floor wins
       Dribbler   x1.25 -> 12.2%             raw drib>=50    -> 8.7%          <- floor wins
       Complete   x1.15 ->  4.1% / 15.5%     raw min>=1500   -> 2.3% / 0.0%   <- floor wins
     A rate multiplier scales everyone equally and keeps the thin-sample tail; a raw floor removes
     it outright.

     NULL HANDLING , every floor below goes through rawFloorOK, so a MISSING metric is EXEMPT,
     not a failure. This is the locked NR-is-not-zero rule: assists are 54.2% null, tackles 40.4%,
     interceptions 36.7%, dribbles 37.8%, and a player whose assists were never logged is not a
     player with zero assists. A NULL-rejecting floor punishes the DATA GAP as if it were a bad
     season.
     MEASURED, and the reason this is easy to get wrong: it changes ONLY Playmaker (+28 cards).
     For Provider, The Dribbler, Ball Hawk and The Wall the floor reads the SAME field the rate
     gate reads, so a null value already fails upstream and the exemption is never consulted ,
     0 cards recovered on each. Playmaker is the ONLY tag whose floor field (assists) differs
     from its rate field (passes_key), which is exactly why it was the only one bleeding.
     THE GENERAL RULE: a raw floor is NULL-sensitive only when it reads a DIFFERENT field from
     the rate gate. Check that before assuming a floor is safe.
     GOAL MACHINE IS THE ONE EXEMPTION AND STAYS NULL-REJECTING , its floor is the ENTIRE rule
     (no rate cut), so exempting null would hand the tag to all 466 eligible null-goal cards. */
  const MIN_ASSISTS_PLAYMAKER  = 5;    // was 3 via rawFloorOK. 2.73% -> 1.82%.
  const MIN_ASSISTS_PROVIDER   = 6;    // 2.83% -> 1.77%. Higher than Playmaker's ON PURPOSE:
                                       // assists ARE Provider's metric, but only corroborate
                                       // Playmaker, whose driving metric is key passes.
  const MIN_DRIBBLES_DRIBBLER  = 50;   // 3.91% -> 1.62%.
  const MIN_INT_BALLHAWK       = 60;   // 3.60% -> 1.47%.
  const MIN_TACKLES_WALL       = 50;   // 3.24% -> 1.88%. The rate lever was brittle here ,
                                       // x1.08 gave 1.91% and x1.20 gave 0.86%, so the usable
                                       // window was one step wide. The floor is not brittle.
  const MIN_MINUTES_COMPLETE   = 1500; // 2.60% -> 1.77%. "Elite at both ends" over 900 minutes
                                       // was half a season; Complete is a whole-season claim.
  /* IRON MAN IS A DELIBERATE EXCEPTION TO THE ~2% CEILING , DO NOT "FIX" IT BACK.
     x1.15 lands it at 1.71%, under the ceiling, and was REJECTED. Availability is structurally common
     in a way no other tag's signal is: the tag means "played every week", and a season-long
     ever-present is simply not a rare event. Forcing it into band stripped the LAST tag from
     84 elite cards (rt>=85) , Rashford 2223, Mane 2122, Bowen 2122 and 2324, Gordon 2324 , 45 of
     which held Iron Man and nothing else. That is the band buying rarity with coverage at the
     top of the scale, which is the wrong trade for this specific tag.
     x1.10 = 3.40%. Pool-relative, NOT a flat minutes floor, which would re-import the
     position-blindness the Goal Machine work removed. ~2,885-3,125 minutes by pool. */
  const IRONMAN_MULT           = 1.10;
  const MIN_MINUTES_TAG       = 900;  // 26.6% of cards sit below this, where per-90 inflates.
                                      // ~10 full matches. Gates every PER-90-derived tag.

  // NR IS NOT ZERO (house rule). A MISSING raw stat is EXEMPT from a raw floor rather than
  // failing it , 54.2% of rows have null assists (the pre-2015 FBref gap), and treating those
  // as 0 would silently punish a data gap as if it were a bad season. Costs 33 Playmaker cards.
  // THE NR-IS-NOT-ZERO HELPER. Used by every raw floor except Goal Machine's, which must reject
  // null because its floor is the whole rule. Briefly replaced by explicit null-rejecting checks
  // on 2026-08-14 and restored the same pass , that version dropped 28 Playmaker holders purely
  // for unrecorded assists, which is the exact failure this helper exists to prevent.
  function rawFloorOK(value, floor) {
    if (!(floor > 0)) return true;
    if (value == null) return true;      // NR , exempt, not a failure
    return value >= floor;
  }

  function per90(value, minutes) {
    if (value == null || !minutes || minutes <= 0) return null;
    return value / (minutes / 90);
  }

  // Map fine position_pool -> eligibility flags. Falls back to coarse family
  // when pool is null (38% of seasons, mostly pre-2015).
  function eligibility(coarseFam, pool) {
    // pool (8-bucket, LOCKED): GK, FB, CB, CDM, CM, CAM, Winger, ST, or null/UNK.
    // (Superseded the pre-lock LW/RW/RB/LB codes , which no longer exist in the data.)
    const p = pool || '';
    // POOL FIRST, coarse as fallback , mirrors the threshold lookup. `fam` below is the
    // RESOLVED family, so eligibility and thresholds can no longer read different fields.
    // Null/UNK pool (35% of cards, mostly pre-2016) still resolves via the coarse field.
    const fam = POOL_FAMILY[p] || coarseFam;
    const winger     = (p === 'Winger');
    const fb         = (p === 'FB');
    const centreBack = (p === 'CB');
    const striker    = (p === 'ST');
    // FB output principle (Stage-2 best-of / TAA): an attacking full-back's value IS output,
    // so FBs are eligible for the ABILITY tags (playmaker/dribbler/provider) AND the defensive
    // family (via coarse DEF). Which fires is decided by his PROFILE. But "The Winger" is a
    // POSITION-IDENTITY tag, NOT an ability tag , an attacking FB is a full-back, not a winger
    // (mirrors the engine: his output is credited, but he is scored WITHIN the FB pool, never
    // reclassified wide). So FBs are excluded from winger; wingers keep their own tag.
    //
    // IDENTITY vs ABILITY , GENERALISED 2026-08-16. The rule above was written for ONE tag and
    // never applied to the other four that share its shape, so each of them contradicted its own
    // stated meaning:
    //   Regista       "dictates tempo from deep"      , 656 of 1,118 holders (58.7%) were
    //                 DEFENDERS (CB 439, FB 217) via fam==='DEF', and 161 of those CBs already
    //                 held Ball-Playing CB, which is the tag that actually describes them.
    //   Maestro       "conductor of a team's attack"  , EXCLUDED CAM, the one position the
    //                 sentence names, because POOL_FAMILY.CAM is 'FWD' and the gate read 'MID'.
    //   The Winger / Poacher / Ball-Playing CB        , admitted null-pool cards on the coarse
    //                 field alone (52 / 37 / 14).
    // THE DISTINCTION: an ABILITY tag describes a quality anyone in range can show, so a family
    // gate is right for it (The Wall, Destroyer, Ball Hawk keep theirs, and Engine Room stays
    // MID , "the relentless heartbeat of midfield" is a central-workload claim, not a position).
    // An IDENTITY tag names a POSITION, so it must gate on position_pool DIRECTLY.
    // AND NULL POOL NEVER EARNS AN IDENTITY TAG , this is the "under-tag rather than mis-tag"
    // principle already stated on theWall/ballHawk below, applied consistently: a card with no
    // verified position cannot be said to occupy one. DO NOT re-add a coarse fallback to any
    // identity tag , the coarse field is exactly what cannot distinguish ST from Winger, or
    // CB from FB.
    // Deliberate consequence: CAM is NOT reclassified to MID. It stays in the FWD family, which
    // is correct for the goal thresholds; only the identity gates read the pool.
    return {
      // Attacker tags
      // CB and FB EXCLUDED BY POOL (2026-08-13), not just by coarse family. They reached this tag
      // only through miscoded coarse positions, and an equal-rarity volume floor handed them the
      // tag on 3 goals. See GOAL_FLOOR_POOL. Cost: 45 cards.
      // The CB/FB exclusions are now REDUNDANT (both resolve to DEF above) and are kept
      // deliberately as a guard: if POOL_FAMILY is ever re-mapped, this still holds.
      goalMachine: (fam === 'FWD' || fam === 'MID') && pool !== 'CB' && pool !== 'FB',
      clinical:    fam === 'FWD' || fam === 'MID',
      provider:    fam !== 'GK',                             // any outfielder can provide (GK excluded; FB incl.)
      poacher:     striker,                                 // IDENTITY: ST pool only (was + coarse-FWD null fallback, 37)
      winger:      winger,                                  // IDENTITY: Winger pool only (was + coarse-FWD null fallback, 52)
      // Midfield tags
      playmaker:   fam === 'MID' || fam === 'FWD' || fb,     // ability tag: + attacking FBs (key-pass creators, TAA-type)
      maestro:     (p === 'CM' || p === 'CDM' || p === 'CAM'), // IDENTITY: + CAM, the position the tag names
      deepPlaymaker: (p === 'CM' || p === 'CDM'),            // IDENTITY (Regista): deep MIDS only, never CB/FB
      engineRoom:  fam === 'MID',
      dribbler:    fam === 'MID' || fam === 'FWD' || fb,     // ability tag: + attacking FBs who carry
      // Defender tags , MID only via defensive/central pools (CDM/CM), never CAM;
      // null-pool MIDs excluded (under-tag rather than mis-tag attacking mids).
      theWall:     fam === 'DEF' || (fam === 'MID' && (pool === 'CDM' || pool === 'CM')),
      destroyer:   fam === 'DEF' || (fam === 'MID' && pool === 'CDM'),
      ballHawk:    fam === 'DEF' || (fam === 'MID' && (pool === 'CDM' || pool === 'CM')),
      ballPlaying: centreBack,                               // IDENTITY: CB pool only (was + coarse-DEF null fallback, 14)
      // Cross-dimensional
      complete:    fam !== 'GK',
      workhorse:   fam !== 'GK',
      // Age (handled separately, always eligible)
    };
  }

  const TAG_DEFS = {
  "Goal Machine":          { oneLiner: "Goals by the season, not the handful. Volume that bends a table.", def: "Some players score. This one scores, and scores, and scores again, until the goal becomes less an event than a habit. A season measured in the simplest, cruellest currency the game knows, and there was always more of it to come." },
  "Clinical":              { oneLiner: "Cold, efficient finishing. Rarely wastes a chance.", def: "There is a coldness to it, a certainty. Where others hesitate, he has already decided. The chance arrives, the net ripples, and all season long the story barely changes. Ruthless, and quietly so." },
  "Provider":              { oneLiner: "The pass before the goal. Assists at a rate few can match.", def: "He does not need his name on the scoresheet to have written the story. The vision, the weight, the moment of generosity that turns a teammate into a hero. A season spent handing out goals like gifts." },
  "Poacher":               { oneLiner: "Lives in the box, lives for the goal. A natural finisher.", def: "He does not build the move. He does not need to. He waits, in the spaces no one else sees, for the half-yard and the half-second, and then he is gone, and the net is rippling. A predator, patient and merciless." },
  "The Winger":            { oneLiner: "Drifts wide, cuts in, beats his man for fun.", def: "Give him the touchline and a defender to torment, and watch the old magic unfold. The drop of the shoulder, the burst of pace, the moment the full-back is left grasping at shadows. Football's purest thrill: a winger in full flight." },
  "Playmaker":             { oneLiner: "The creative hub. Unlocks defences with vision and weight of pass.", def: "He sees the pass a moment before anyone else, and plays it a moment before they expect. The defence is unlocked not by force but by imagination. Where others see a wall, he sees a door." },
  "Maestro":               { oneLiner: "The conductor of a team's attack. Vision, control, and the passes others don't see.", def: "He does not run the game. He composes it. Every pass a note, every movement a phrase, the rhythm of an entire team bending to his tempo. You do not watch a Maestro. You listen to him." },
  "Regista":                { oneLiner: "Dictates tempo from deep, sprays passes across the pitch.", def: "From the quietest part of the pitch, he runs the loudest game. A glance, a touch, and the ball travels forty yards to feet. He does not chase the spotlight. He bends the whole match to his rhythm and lets others dance in it." },
  "Engine Room":           { oneLiner: "The relentless heartbeat of midfield. Covering ground, linking play, never stopping.", def: "While others rest, he runs. The unseen miles, the quiet work, the lungs that never beg for mercy. No highlight reel will ever do him justice, and yet without him, none of it happens." },
  "The Dribbler":          { oneLiner: "Beats his man and keeps the ball. Carries it where others lose it.", def: "Others give the ball away when the pitch gets crowded. He keeps it. Surrounded, hounded, doubled up on, he lowers his head and goes, and the tighter the space, the more alive he seems. A footballer who treats a crowd as an invitation." },
  "The Wall":              { oneLiner: "Immovable. Wins his duels, heads everything, gives nothing away.", def: "Strikers came, and strikers left empty-handed. A season of saying no, of the header won, the tackle timed, the door bolted shut. Nothing glamorous, nothing soft, just an immovable certainty at the heart of the defence." },
  "Destroyer":             { oneLiner: "Tough, tireless, wins the ball and the battle.", def: "The unglamorous heart of a team. The tackle, the block, the ball won back before the danger grows. He does the work nobody sings about, so that those who are sung about have a stage to perform on." },
  "Ball Hawk":             { oneLiner: "Reads the pass before it is played. Lives in the passing lanes.", def: "He defends with his mind as much as his legs. The ball is cut out before it ever arrives, the danger snuffed before it draws breath. Anticipation is its own kind of pace, and his was the quickest read on the pitch." },
  "Ball-Playing CB":        { oneLiner: "Defends first, but starts attacks with the ball at his feet.", def: "The defender who is also the architect. He wins the ball, and then he does the harder thing, he uses it. A season of quelling danger at one end and igniting it at the other, all from the foundations of the team." },
  "Complete":              { oneLiner: "Elite at both ends. Gives as much as he takes away.", def: "Football usually asks a player to choose: create or destroy, build or break. He refused the choice. A season of doing it all, at both ends, with a balance that bordered on greed. The rarest profile the game produces." },
  "Iron Man":              { oneLiner: "Plays through everything, never misses a game.", def: "While others came and went, nursed and rested, he simply played. Every week, every minute, the one name the manager never had to think about. There is a quiet greatness in always being there." },
  "Wonderkid":             { oneLiner: "A teenager already producing at an elite level. The future, arriving early.", def: "We are not supposed to see this yet. One so young has no business being this good, and yet here it is, the future arriving ahead of schedule. Remember the season. You were watching greatness take its first steps." },
  "The Last Dance":        { oneLiner: "A great veteran defying age with one more elite campaign.", def: "They said the legs had gone. They said it was time. And he answered, not with words, but with one more season of the old magic, proof that class does not retire when the body ages. A final, glorious flourish, all the sweeter for being unexpected." },
  "Generational":          { oneLiner: "The highest grade the Index awards. Reserved for the rarest seasons in the history of the game.", def: "Once in a generation, the game produces a player who does not merely lead his era but defines it, who bends the limits of what we believed possible and makes them his own. This is not a rating. It is a coronation , reserved for the very few seasons that stand entirely alone." },
  "Iconic":                { oneLiner: "One of the 150 greatest seasons ever measured.", def: "The year people reach for when the argument begins. A campaign that burned so brightly it earned its place in the permanent memory of the game. The season they will still be talking about long after the final whistle of a career." }
};

  // getVVTags(row) -> array of tag objects { name, family, tier }
  // families: ATT (red), MID (green), DEF (blue), AGE, CROSS
  function getVVTags(row) {
    const tags = [];
    const fam = row.position;            // coarse: DEF/MID/FWD/GK (100% populated)
    const pool = row.position_pool;      // fine: CB/RB/.../null (62% populated)
    // Pool first (8-bucket, LOCKED); coarse family is the FALLBACK for null/UNK pools.
    const t = TAG_THRESHOLDS_POOL[pool] || TAG_THRESHOLDS[fam];
    if (!t) return tags;                 // unknown family AND unknown pool -> no tags

    const m = row.minutes;
    const elig = eligibility(fam, pool);

    // --- per-90 metrics (null-safe) ---
    const goals90    = per90(row.goals, m);
    const assists90  = per90(row.assists, m);
    const keypass90  = per90(row.passes_key, m);
    const passes90   = per90(row.passes_total, m);
    const drib90     = per90(row.dribbles_success, m);
    const defact90   = per90(
      (row.tackles_total == null ? null
        : row.tackles_total + (row.interceptions || 0) + (row.tackles_blocks || 0)),
      m);
    const int90      = per90(row.interceptions, m);
    const duelswon90 = per90(row.duels_won, m);
    const passAcc    = row.passes_accuracy;
    const conversion = (row.shots_total > 0) ? row.goals / row.shots_total : null;

    const ge = (v, thr) => v != null && v >= thr;   // >= threshold, null-safe
    const le = (v, thr) => v != null && v <= thr;   // <= threshold, null-safe

    // SAMPLE GATE , every per-90-derived tag below requires a real season behind the rate.
    // Iron Man and the age tags are OUTSIDE this gate on purpose (see the constants block).
    const okMin = (m != null && m >= MIN_MINUTES_TAG);

    // ========================= ATTACKER FAMILY (red) =========================
    // Goal Machine , pure goal VOLUME (Universal), against a floor set by the player's OWN pool.
    // NO per-90 rate cut , see GOAL_FLOOR_POOL for why it was removed rather than softened.
    // HARD null check, NOT rawFloorOK: the floor is now the ENTIRE rule, and rawFloorOK's
    // "NULL is exempt" would hand the tag to every one of the 466 eligible null-goal cards.
    const goalFloor = goalFloorFor(pool, fam);
    if (okMin && elig.goalMachine && goalFloor != null && row.goals != null && row.goals >= goalFloor)
      tags.push({ name: 'Goal Machine', family: 'ATT', tier: 'universal' });

    // Marksman RETIRED 2026-08-13 , it was a TIER (defined by failing the line above), never a
    // TYPE. Scoring is now two independent axes: Goal Machine = volume, Clinical = efficiency.
    // A season that clears the rate but not the volume floor now carries NO scoring tag, which
    // is the honest outcome: 612 cards lost their only tag, none above rt 89.

    // Clinical , high CONVERSION + real shot volume (Granular)
    // SHOT FLOOR 25 -> 30 (2026-08-13). At 25 the leaderboard was small-sample noise , Mbokani
    // 2021 topped the whole population at 0.560 on exactly 25 shots, and 4 of the top 7 were
    // 2015/16 null-pool cards converting 44-55% on 27-31 shots.
    // 40 WAS TRIED AND REJECTED ON THE TRADE, not on the noise: it removed all 8 offenders but
    // cost 53% of the tag (1137 -> 534) and untagged 1,120 cards outright. 30 removes 5 of the 8
    // for 20% (1137 -> 909). Buying the last 3 noise cards costs another third of the tag, which
    // is a bad price. Bonatini 1516 (31 shots), Onuachu 2223 (35) and Mayoral 2324 (34) survive
    // deliberately , they are the accepted residue.
    if (okMin && elig.clinical && ge(conversion, t.conversion_p90 * 0.85) && row.shots_total >= 30)
      tags.push({ name: 'Clinical', family: 'ATT', tier: 'granular' });

    // Provider , high ASSISTS (Universal)
    if (okMin && elig.provider && ge(assists90, t.assists90_p90)
        && rawFloorOK(row.assists, MIN_ASSISTS_PROVIDER))
      tags.push({ name: 'Provider', family: 'ATT', tier: 'universal' });

    // Poacher , scores BUT does little else (Granular, compound , WILL NEED TUNING)
    if (okMin && elig.poacher && ge(goals90, t.goals90_p80)
        && le(keypass90, t.keypass90_p80 * 0.7)   // low creation
        && le(drib90, t.drib90_p85 * 0.7))        // low dribbling
      tags.push({ name: 'Poacher', family: 'ATT', tier: 'granular' });

    // The Winger , dribbles + (assists or progression) (Granular)
    if (okMin && elig.winger && ge(drib90, t.drib90_p85 * 0.92)
        && (ge(assists90, t.assists90_p90 * 0.7) || ge(keypass90, t.keypass90_p80)))
      tags.push({ name: 'The Winger', family: 'ATT', tier: 'granular' });

    // ========================= MIDFIELD FAMILY (green) =========================
    // Playmaker , high KEY PASSES *and* real assists. The key-pass p90 is used STRAIGHT (the
    // old x0.92 softening is gone, so "p90" means p90); the assist floor exists because this
    // tag read passes_key and never touched assists, which is how a 1-assist season earned it.
    if (okMin && elig.playmaker && ge(keypass90, t.keypass90_p90)
        && rawFloorOK(row.assists, MIN_ASSISTS_PLAYMAKER))
      tags.push({ name: 'Playmaker', family: 'MID', tier: 'granular' });

    // Maestro , creates AND controls (Granular, compound)
    // x1.20 on the key-pass leg (2026-08-13): the pool rekey LOWERED keypass90_p80 for CM (1.712
    // -> 1.679) and CDM (-> 1.453), inflating Maestro 651 -> 980. The multiplier returns it to
    // 633, at or below where it stood. This is a rekey CORRECTION, not rarity tuning.
    if (okMin && elig.maestro && ge(keypass90, t.keypass90_p80 * 1.20) && ge(passes90, t.passes90_p80 * 0.92))
      tags.push({ name: 'Maestro', family: 'MID', tier: 'granular' });

    // Regista , high pass VOLUME + ACCURACY (Granular, compound)
    // RE-TUNE 2026-08-16, forced by the identity fix above: restricting Regista to CM/CDM removed
    // 656 defender holders and left it at 418 (0.73%). Regista is an ABILITY-shaped rule on an
    // identity-gated pool, not a narrow archetype, so unlike the four tags that sit below the band
    // by design it was worth re-tuning. SINGLE LEVER , the
    // VOLUME multiplier drops 0.87 -> 0.75 and the ACCURACY multiplier is UNTOUCHED at 0.97, so the
    // quality bar the tag was designed with still holds and only the reach on its own defining axis
    // widens. Both p80 references are per-pool, so 0.75 still means high volume FOR A DEEP MIDFIELDER.
    // Rejected: relaxing accuracy instead (0.81/0.93 also lands in band at 586) , it admits a 77%
    // passer, and "sprays passes across the pitch" is a precision claim as much as a volume one.
    /*  REGISTA AND BALL-PLAYING CB ARE SUPPRESSED (2026-08-27). BOTH GATE ON
        `passes_accuracy`, WHICH IS INVALID, NOT MERELY SPARSE , see SS E. The provider reads
        Kroos 92 in 2019 and 67 in 2020 at the same club on the same volume, and sustains
        Modric 44-55. A tag is a CLAIM ABOUT A PLAYER; these two made it from a field that
        does not mean one thing.
        AND IT IS WORSE THAN THE FIELD BEING WRONG. `ge()` is null-safe and rejects null, so
        every holder had accuracy present , which confines both tags to the 42.8% of cards
        where the field exists, a subset skewed to elite big-five players (coverage is
        14-17% for 2020-2024). A midfielder in that hole could never be a Regista however he
        played.
        COST OF SUPPRESSION: 843 awards, 635 Regista and 208 Ball-Playing CB. No false claims
        made. Removing the accuracy term instead was measured and REJECTED , it breaches the
        rarity ceiling (Regista 1.11% -> 6.31%, BPCB 0.36% -> 2.38%). Regating on
        `passes_key` was also measured: it restores the exact counts at floors of 1.77 and
        0.61 key passes per 90, but replaces 521 of 635 and 186 of 208 holders , that is a
        DIFFERENT TAG WEARING THE SAME NAME, not a repair.
        WHAT WOULD UNSUPPRESS THEM: a passing-quality field that means one thing across eras.
        Either the provider restores a consistent accuracy measure (re-check the 2020 break),
        or a second source supplies completion, or the tags are RE-DEFINED on `passes_key`
        with new names and new blurbs, so the vocabulary matches what is actually measured.
        Do NOT simply re-enable these gates.  */
    const TAGS_SUPPRESSED_INVALID_FIELD = true;
    if (!TAGS_SUPPRESSED_INVALID_FIELD && okMin && elig.deepPlaymaker && ge(passes90, t.passes90_p80 * 0.75) && ge(passAcc, t.passacc_p80 * 0.97))
      tags.push({ name: 'Regista', family: 'MID', tier: 'granular' });

    // Engine Room , high pass volume + defensive work (box-to-box) (Granular, compound)
    if (okMin && elig.engineRoom && ge(passes90, t.passes90_p80 * 0.92) && ge(defact90, t.defact90_p70 * 0.92))
      tags.push({ name: 'Engine Room', family: 'MID', tier: 'granular' });

    // The Dribbler , high DRIBBLE success (Granular)
    if (okMin && elig.dribbler && ge(drib90, t.drib90_p90 * 0.92)
        && rawFloorOK(row.dribbles_success, MIN_DRIBBLES_DRIBBLER))
      tags.push({ name: 'The Dribbler', family: 'MID', tier: 'granular' });

    // ========================= DEFENDER FAMILY (blue) =========================
    // The Wall , high DEFENSIVE VOLUME (Granular)
    if (okMin && elig.theWall && ge(defact90, t.defact90_p90 * 0.92 * 1.04)
        && rawFloorOK(row.tackles_total, MIN_TACKLES_WALL))
      tags.push({ name: 'The Wall', family: 'DEF', tier: 'granular' });

    // Destroyer , high DUELS WON (Granular)
    if (okMin && elig.destroyer && ge(duelswon90, t.duelswon90_p90 * 0.92 * 1.04)
        && ge(defact90, t.defact90_p70))   // real ball-winner: duels AND defensive actions (excludes wing-backs)
      tags.push({ name: 'Destroyer', family: 'DEF', tier: 'granular' });

    // Ball Hawk , high INTERCEPTIONS (Granular)
    if (okMin && elig.ballHawk && ge(int90, t.int90_p90 * 0.92)
        && rawFloorOK(row.interceptions, MIN_INT_BALLHAWK))
      tags.push({ name: 'Ball Hawk', family: 'DEF', tier: 'granular' });

    // Ball-Playing CB , solid defensively + high accurate passing (Granular, compound)
    if (okMin && elig.ballPlaying && ge(defact90, t.defact90_p70 * 0.85)
        && !TAGS_SUPPRESSED_INVALID_FIELD && ge(passes90, t.passes90_p80 * 0.80) && ge(passAcc, t.passacc_p80 * 0.93))
      tags.push({ name: 'Ball-Playing CB', family: 'DEF', tier: 'granular' });

    // ========================= CROSS-DIMENSIONAL =========================
    // Complete , elite at BOTH ends (Granular, compound , WILL NEED TUNING)
    const attackElite = ge(goals90, t.goals90_p85) || ge(keypass90, t.keypass90_p80);
    const defElite = ge(defact90, t.defact90_p70);
    // minutes is 0.0% null and okMin already required >=900, so this floor needs no NR exemption.
    if (okMin && elig.complete && attackElite && defElite && row.minutes >= MIN_MINUTES_COMPLETE)
      tags.push({ name: 'Complete', family: 'CROSS', tier: 'granular' });

    // Iron Man , ever-present, top minutes (Universal)
    if (elig.workhorse && ge(m, t.minutes_p90 * IRONMAN_MULT))
      tags.push({ name: 'Iron Man', family: 'CROSS', tier: 'universal' });

    // ========================= AGE FAMILY =========================
    // Wonderkid , young AND elite season (Universal). Always eligible.
    const age = row.season_age != null ? row.season_age : row.age;
    if (age != null && age <= 21 && row.rt != null && row.rt >= 82)
      tags.push({ name: 'Wonderkid', family: 'AGE', tier: 'universal' });

    // The Last Dance , veteran AND still elite (Universal). Mutually exclusive with Wonderkid.
    else if (age != null && age >= 34 && row.rt != null && row.rt >= 82)
      tags.push({ name: 'The Last Dance', family: 'AGE', tier: 'universal' });

    return tags;
  }

  function rowToCard(row){
    if(!row) return null;
    const rt   = row.rt != null ? Math.round(row.rt) : null;
    let band = bandFor(rt);
    return {
      card_id:  row.card_id != null ? row.card_id : null,   // identity, links to card.html?id=
      api_player_id: row.api_player_id != null ? row.api_player_id : null,  // stable player id (trajectory query)
      // raw honour-match keys , attachHonoursBatch/shapeHonoursForCard need these (year/league below are DISPLAY forms)
      season_year: row.season_year,
      season:      row.season,
      league_code: row.league_code,
      // ── Mini-card face slots (consumed by buildCard) ──
      year:     fmtSeason(row.season),
      club1:    row.primary_colour   || undefined,
      club2:    row.secondary_colour || undefined,
      pos:      row.position_pool || row.position || '',   // canonical pool, coarse fallback
      vv:       rt != null ? rt : '',
      flag:     flagFor(row.nationality),
      surname:  surnameOf(row.player_name),
      full:     row.player_name || '',
      // the SEARCHABLE legal-name form. `full` is the DISPLAY name ("L. Messi"), so any client-side
      // re-filter that only sees `full` strips rows the server matched via player_name_norm
      // ("lionel andres messi cuccittini") , measured: compare returned 13 rows for "Lionel Messi"
      // and rendered 0. Carried here so the shared card object can be re-filtered faithfully.
      name_norm: row.player_name_norm || '',
      clubname: row.team_name || '',
      league:   row.league_code || '',                      // league filter (My Club) + cross-page consistency
      age:      (row.season_age != null ? String(row.season_age)   // Contract §1: prefer season_age
                : (row.age != null ? String(row.age) : '')),
      goals:    row.goals != null ? row.goals : 0,
      assists:  row.assists != null ? row.assists : null,
      assistsText: (row.assists != null ? String(row.assists) : 'NR'),
      // raw stat fields , consumed by Compare's The Proof (per-90) + verdictContext (age tiebreaker)
      // + card.html's The Proof (dimension-picked per-90/total). Null-preserving: NR, never 0.
      minutes:     row.minutes != null ? row.minutes : null,
      appearances: row.appearances != null ? row.appearances : null,   // denominator for The Proof + glance games-played
      shots_on:    row.shots_on != null ? row.shots_on : null,
      shots_total: row.shots_total != null ? row.shots_total : null,
      /* passes_total and position_pool are carried so vvAIStats can build the AI block from
         a CARD as well as a raw row , without them the model gets null passing and no pool
         bar, which is silent rather than an error. */
      passes_total:   row.passes_total != null ? row.passes_total : null,
      position_pool:  row.position_pool || null,
      passes_key:     row.passes_key != null ? row.passes_key : null,
      tackles_total:  row.tackles_total != null ? row.tackles_total : null,
      tackles_blocks: row.tackles_blocks != null ? row.tackles_blocks : null,
      interceptions:  row.interceptions != null ? row.interceptions : null,
      // Keeper figures, surfaced by the 2026-08-19 matview rebuild. Carried so the card
      // and the AI payload can cite them. Null-preserving: NR, never 0 , a keeper with no
      // recorded saves has an unknown season, not a season of zero saves.
      saves:           row.saves != null ? row.saves : null,
      goals_conceded:  row.goals_conceded != null ? row.goals_conceded : null,
      penalties_saved: row.penalties_saved != null ? row.penalties_saved : null,
      starts:          row.starts != null ? row.starts : null,
      season_age:  row.season_age != null ? row.season_age : null,

      // ── Computed Contract fields (rows / expanded card / radar / poster) ──
      band:       band,                 // §2  10-band ladder
      prestige:   prestigeFor(band),    // §3  band-bound badge (Generational / Iconic / null)
      radar:      radarFor(row),        // §4  { raw, scaled, provisional }
      keeper:     keeperScore(row),     // null for an outfielder , the GK-card test
      confidence: confidenceFor(row),   // §5  X/5 dots
      confidenceFields: confidenceFields(row),   // §5b per-field present/missing breakdown

      // ── Seams: number now sourced from the view; tag/photo still blank by design ──
      number:   row.shirt_number ?? null,   // shirt number (player_positions.shirt_number, via view)
      tag:      '',                 // legacy placeholder, kept falsy for backward-compat; remove after step 3 verified
      tags:     getVVTags(row),     // Tag Model v1.1 , array of {name,family,tier}; render consumes in step 3
      photo:    row.api_player_id != null ? 'https://media.api-sports.io/football/players/' + row.api_player_id + '.png' : undefined,   // API-Football CDN headshot (URL only, no storage); onerror in buildCard falls back to silhouette
    };
  }

  /* ════════════════════════════════════════════════════════════════════
   *  vvClient , Supabase browser client from window-injected public config.
   *  Reads window.VV_PUBLIC = { SUPABASE_URL, SUPABASE_ANON_KEY }.
   *  Uses the anon key + RLS only , the service key never reaches the browser.
   * ════════════════════════════════════════════════════════════════════ */
  let _client = null;
  function vvClient(){
    if(_client) return _client;
    const cfg = root.VV_PUBLIC || {};
    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
      console.warn('vv-core: window.VV_PUBLIC.SUPABASE_URL / SUPABASE_ANON_KEY not set , no client created');
      return null;
    }
    if(!root.supabase || !root.supabase.createClient){
      console.warn('vv-core: @supabase/supabase-js not loaded before vv-core.js , no client created');
      return null;
    }
    _client = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return _client;
  }

  // ── Tag info: tap-toggle inline reveal (shared: card + compare). Replaces the
  //    old hover tooltip, which stuck on touch (no mouseout) and could pan the
  //    page. Tap a [data-tip] chip -> its info folds open inline right below it;
  //    tap it again, tap another chip, or tap outside -> it folds shut. Chips
  //    inside a card face (.vvcard) or a click-to-open wrapper ([onclick], e.g.
  //    ranking rows) are left alone , there the tap opens the card instead. ──
  (function(){
    if (typeof document === 'undefined') return;
    function closeTips(){
      var t = document.querySelectorAll('.chiptip');
      for (var i=0;i<t.length;i++){ if(t[i].parentNode) t[i].parentNode.removeChild(t[i]); }
      var o = document.querySelectorAll('[data-tip].tip-on');
      for (var j=0;j<o.length;j++){ o[j].classList.remove('tip-on'); }
    }
    function tipTarget(node){
      var el = node && node.closest && node.closest('[data-tip]');
      if (el && (el.closest('.vvcard') || el.closest('[onclick]'))) el = null;   // card face / navigable row: leave alone
      return el;
    }
    // Two presentations, chosen by the CALLER: tap -> inline fold-below (unchanged);
    // hover -> floating box, OUT OF FLOW, so it never reflows the flex-wrap chip row.
    function showTip(el, floating){
      var tip = el.getAttribute('data-tip') || ''; if (!tip) return;
      el.classList.add('tip-on');
      var box = document.createElement('div');
      box.className = floating ? 'chiptip chiptip-float' : 'chiptip';
      box.textContent = tip;
      if (floating){ document.body.appendChild(box); positionFloat(box, el); }   // out of flow -> zero reflow
      else { el.parentNode.insertBefore(box, el.nextSibling); }                   // inline fold (tap) , UNCHANGED
    }
    // Position the floating hover tip near the chip, clamped to the viewport so the
    // last chip in a wrapped row never clips at the right (or left) edge.
    function positionFloat(box, el){
      var r = el.getBoundingClientRect();
      var m = 8, vw = document.documentElement.clientWidth;
      var left = r.left + r.width/2 - box.offsetWidth/2;                // centre on the chip
      left = Math.max(m, Math.min(left, vw - box.offsetWidth - m));     // clamp -> never clips L/R edge
      var top = r.top - box.offsetHeight - 8;                           // ABOVE the chip (doesn't cover it)
      if (top < m) top = r.bottom + 8;                                  // near the top edge -> flip below
      box.style.left = left + 'px'; box.style.top = top + 'px';
    }
    // TAP / click toggle , the reachable-on-mobile mechanism (works everywhere).
    document.addEventListener('click', function(e){
      if (e.target.closest && e.target.closest('.chiptip')) return;              // tap inside an open tip: keep it
      var el = tipTarget(e.target);
      if (!el){ closeTips(); return; }                                           // tap outside any chip: fold all
      var wasOpen = el.classList.contains('tip-on');
      closeTips();                                                               // fold everything first
      if (wasOpen) return;                                                       // re-tap the open chip: just fold
      showTip(el);
    }, false);
    // HOVER , mouse-only (guarded so touch never gets it; the old hover-only stuck on touch, hence the tap toggle above).
    var hoverable = false; try{ hoverable = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches; }catch(e){}
    if (hoverable){
      document.addEventListener('mouseover', function(e){ var el=tipTarget(e.target); if(!el || el.classList.contains('tip-on')) return; closeTips(); showTip(el, true); }, false);
      document.addEventListener('mouseout', function(e){ var el=tipTarget(e.target); if(!el) return; if(e.relatedTarget && el.contains(e.relatedTarget)) return; closeTips(); }, false);
    }
  })();

  // ── Honours fetch (folded from vv-honours.js) , reuses vvClient(); fail-soft ──
  // Honours live in the standalone `honours` table (NOT the matview). Splits a
  // player's honours into SEASON (match card season_year + league_code) and CAREER
  // (world_cup_winner, shows on every card). Attach: D.honours = await fetchHonours(res.data).
  const HONOUR_META = {
    ballon_dor:        { group:'Individual', label:"Ballon d'Or",         tier:1 },
    world_cup_winner:  { group:'Career',     label:'World Cup Winner',     tier:2 },
    ucl_winner:        { group:'Team',       label:'UCL Winner',           tier:3 },
    league_champion:   { group:'Team',       label:'League Champion',      tier:4 },
    player_of_season:  { group:'Individual', label:'Player of the Season', tier:5 },
    golden_boot:       { group:'Individual', label:'Golden Boot',          tier:6 },
    top_assists:       { group:'Individual', label:'Top Assists',          tier:7 },
  };
  const HONOUR_GROUP_ORDER = ['Team','Individual','Career'];
  const HONOUR_ONELINER = {
    ballon_dor:       'The best player in the world that season.',
    world_cup_winner: 'A world champion. The prize every player covets most.',
    ucl_winner:       'Champion of Europe, the club game’s greatest prize.',
    league_champion:  'Champions. Top of the league across a full season.',
    player_of_season: 'The league’s finest over a full campaign.',
    golden_boot:      'The league’s top scorer. Nobody scored more.',
    top_assists:      'The league’s chief creator. Nobody made more.',
  };

  // ── Team-keyed honours (league_champion + ucl_winner) ────────────────────
  //  api_player_id is NULL on these , a title belongs to the winning club-season,
  //  not one player. They attach by matching the card's team+season(+league):
  //  league_champion = team+season+league; ucl_winner = team+season (UCL has no
  //  domestic league_code). Loaded ONCE per session: loadTeamHonours() memoizes
  //  the in-flight PROMISE, so concurrent callers (every page, every card) share
  //  a single fetch , it fires exactly once, never per-card or per-page-load.
  function honTeamNorm(s){
    return (s==null?'':String(s)).normalize('NFD').replace(/[̀-ͯ]/g,'')
      .toLowerCase().replace(/[^a-z0-9]/g,'');
  }
  let _teamHonoursPromise = null;   // single in-flight/settled fetch (session-once)
  let _teamHonoursCache   = null;   // resolved { lc:Map, ucl:Set } for sync reads after load
  function loadTeamHonours(){
    if(_teamHonoursPromise) return _teamHonoursPromise;   // memoized , fires exactly ONCE
    _teamHonoursPromise = (async () => {
      const empty = { lc:new Map(), ucl:new Set() };
      const sb = (typeof vvClient === 'function') ? vvClient() : null;
      if(!sb){ _teamHonoursCache = empty; return empty; }
      try {
        const res = await sb.from('honours')
          .select('honour_type,team_name,season_year,league_code,honour_context')
          .in('honour_type', ['league_champion','ucl_winner']);
        if(res.error || !res.data){ _teamHonoursCache = empty; return empty; }
        const lc = new Map(), ucl = new Set();
        for(const h of res.data){
          if(h.team_name == null || h.season_year == null) continue;
          if(h.honour_type === 'league_champion' && h.league_code)
            lc.set(honTeamNorm(h.team_name)+'|'+h.season_year+'|'+h.league_code, h);
          else if(h.honour_type === 'ucl_winner')
            ucl.add(honTeamNorm(h.team_name)+'|'+h.season_year);
        }
        const cache = { lc, ucl };
        _teamHonoursCache = cache;
        return cache;
      } catch(e){ _teamHonoursCache = empty; return empty; }
    })();
    return _teamHonoursPromise;
  }
  // Build team-honour item(s) for a card from a resolved cache. Same item shape as
  // fetchHonours' player honours (so shaping/grouping/render are identical). [] if none.
  function teamHonoursFor(card, cache){
    if(!card || !cache) return [];
    const seasonYear = card.season_year != null ? card.season_year
                     : (card.season != null ? parseInt(String(card.season).slice(0,4),10) : null);
    if(seasonYear == null || card.team_name == null) return [];
    const tn = honTeamNorm(card.team_name);
    const leagueCode = card.league_code || null;
    const mk = (type) => {
      const meta = HONOUR_META[type];
      return { type, label: meta.label, group: meta.group, tier: meta.tier,
        oneliner: HONOUR_ONELINER[type] || meta.label, context: null,
        goals: null, assists: null, season_year: seasonYear,
        league_code: (type === 'league_champion' ? leagueCode : null) };
    };
    const out = [];
    if(leagueCode && cache.lc && cache.lc.has(tn+'|'+seasonYear+'|'+leagueCode)) out.push(mk('league_champion'));
    if(cache.ucl && cache.ucl.has(tn+'|'+seasonYear)) out.push(mk('ucl_winner'));
    return out;
  }

  async function fetchHonours(row){
    const empty = { season: [], career: [], groups: {}, count: 0, has: false };
    if(!row) return empty;
    const sb = (typeof vvClient === 'function') ? vvClient() : null;
    if(!sb) return empty;
    const seasonYear = row.season_year != null ? row.season_year
                     : (row.season != null ? parseInt(String(row.season).slice(0,4), 10) : null);
    const leagueCode = row.league_code || null;
    const season = [];   // honours for THIS card's season+league
    const career = [];   // legacy , now always empty (world_cup_winner is season-specific, see loop)
    // (a)+(b) fire the PLAYER-keyed query and the (session-memoized) TEAM-honours cache in PARALLEL ,
    // independent reads, so honours cost ONE round-trip not two. Player query resolves to null on error.
    const _playerQ = (row.api_player_id != null)
      ? sb.from('honours').select('honour_type,season_year,league_code,honour_context,goals,assists')
          .eq('api_player_id', row.api_player_id).then(function(r){ return r; }, function(){ return null; })
      : Promise.resolve(null);
    const [res, teamCache] = await Promise.all([ _playerQ, loadTeamHonours() ]);
    // (a) PLAYER-keyed honours (individual + world_cup)
    if(row.api_player_id != null){
      if(res && !res.error && res.data){
        for(const h of res.data){
          const meta = HONOUR_META[h.honour_type];
          if(!meta) continue; // unknown type , skip (mirror rule: only what we define)
          const item = {
            type: h.honour_type, label: meta.label, group: meta.group, tier: meta.tier,
            oneliner: HONOUR_ONELINER[h.honour_type] || meta.label,
            context: h.honour_context || null,
            goals: h.goals != null ? h.goals : null,
            assists: h.assists != null ? h.assists : null,
            season_year: h.season_year != null ? h.season_year : null,
            league_code: h.league_code || null,
          };
          // world_cup_winner is now SEASON-SPECIFIC (season_year = tournament year, no league):
          // matches season_year like every other honour but SKIPS the league check (WC has no league).
          if(seasonYear != null && h.season_year === seasonYear
             && (h.honour_type === 'world_cup_winner'
                 || !h.league_code || !leagueCode || h.league_code === leagueCode)){
            season.push(item);
          }
        }
      }
    }
    // (b) TEAM-keyed honours (league_champion + ucl_winner) , from the parallel-fetched cache above.
    //     Never come through the api_player_id query above (their api_player_id is NULL), so no dup.
    for(const ti of teamHonoursFor(row, teamCache)){
      if(!season.some(s => s.type === ti.type && s.season_year === ti.season_year)) season.push(ti);
    }
    season.sort((a,b)=> a.tier - b.tier);   // rarer first
    // CHANGE 2: combined season+career, tier-sorted , drives glance-chip order + card-face pick.
    const all = season.concat(career).sort((a,b)=> a.tier - b.tier);
    const groups = {};
    for(const g of HONOUR_GROUP_ORDER){
      const items = all.filter(x=>x.group===g);
      if(items.length) groups[g] = items;
    }
    return {
      season, career, groups, all,
      count: season.length,                          // count badge = season honours only
      has: (season.length + career.length) > 0,
      topHonour: all.length ? all[0] : null,         // lowest tier present (season+career combined)
    };
  }

  // ── Honours render helpers (folded from vv-honours-render.js) ─────────
  // Match live markup: #glChips gold chips (.chip.gold, hover-tip free via .chip[data-tip]),
  // #wonderTags .tagrow (tap), buildCard top honour pill. STEP 1 wires renderHonourChips only.
  const HONOUR_ICON = {
    ballon_dor:       '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="9" r="6"/><path d="M9 15l-2 6 5-3 5 3-2-6"/></svg>',
    world_cup_winner: '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>',
    ucl_winner:       '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z"/></svg>',
    league_champion:  '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M6 4h12v4a6 6 0 01-12 0V4z"/></svg>',
    player_of_season: '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    golden_boot:      '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h6v7c3 0 8 1 8 4v2H4z"/></svg>',
    top_assists:      '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h4l2-6 4 12 2-6h4"/></svg>',
  };
  const HONOUR_CHIP_LABEL = {
    ballon_dor:"Ballon d'Or", world_cup_winner:'World Cup', ucl_winner:'UCL',
    league_champion:'Champion', player_of_season:'POTS', golden_boot:'Golden Boot', top_assists:'Top Assists',
  };
  function escAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  // GLANCE STRIP: gold honour chips , prepend into #glChips (before prestige+profile).
  function renderHonourChips(honours, opts){
    if(!honours || !honours.has) return '';
    const cls = (opts && opts.baseClass) || 'chip';   // card glance = 'chip'; Compare passes 'vchip'
    const items = honours.all || honours.season.concat(honours.career);   // tier-sorted combined (CHANGE 2)
    return items.map(function(h){
      const icon = HONOUR_ICON[h.type] || '';
      const label = HONOUR_CHIP_LABEL[h.type] || h.label;
      const tip = h.oneliner || h.label;   // #15: hover = clean one-liner ONLY (context/tally live in the expand)
      return '<span class="'+cls+' gold" data-tip="'+escAttr(tip)+'">'+icon+label+'</span>';
    }).join('');
  }
  // #16: Drury expansions , the emotional meaning of each honour TYPE (general, not per-player).
  //   Shown in the Wonder-Tags expand (.tmore), above the era-correct award context + tally.
  const HONOUR_DRURY = {
    ballon_dor:       'The Ballon d’Or is football’s loneliest honour. Not a team’s triumph but one player’s, held above all others for a single season. To win it is to be told, by those who watch closest, that on this earth in this year, no one played the game better.',
    world_cup_winner: 'Every four years a nation holds its breath, and for one squad it ends in glory. The World Cup is the prize a career is measured against, the one that turns a great player into an immortal. Some of the finest never lift it. Those who do are never forgotten.',
    ucl_winner:       'European nights are different, and every player knows it. To win the Champions League is to conquer the best the continent can offer, under the brightest lights, when the margins are thinnest. This is where legends are made and reputations are sealed.',
    league_champion:  'A league title is the honest prize. Not one glorious night but nine months of them, the long grind of winter fixtures and spring nerves, where consistency is everything and there is nowhere to hide. To finish top is to have been the best not once, but across a whole season.',
    player_of_season: 'Some seasons, one player stands apart. Not merely the top scorer or the finest creator, but the man who bent the whole campaign to his will, week after week, until his name was the only answer. This is the honour his peers and the watching game give to that season’s defining figure.',
    golden_boot:      'There is a purity to the Golden Boot. Not the most complete player, not the prettiest to watch, simply the one who did the thing everyone came to see, more than anyone else. To lead a league in goals across a whole season is to answer the same question every week, and never once flinch.',
    top_assists:      'The best assists are acts of generosity. To lead a league in them is to have seen the pass others missed, again and again, to have made teammates better and asked for none of the glory. The top creator is the player the goalscorers should thank first.',
  };
  // Drury-wrapped tally per honour type (#4) , poetic .tmeta line; {N} = live goals/assists count.
  const HONOUR_TALLY = {
    golden_boot:      function(h){ return (h.goals!=null ? h.goals+' goals , and the net remembers every one.' : 'The net remembers every one.'); },
    top_assists:      function(h){ return (h.assists!=null ? h.assists+' assists , '+h.assists+' times the final pass was his.' : 'Time and again, the final pass was his.'); },
    ballon_dor:       function(){ return 'The best in the world , and the world agreed.'; },
    player_of_season: function(){ return "The season's finest , by common consent."; },
    league_champion:  function(){ return 'Champions , the long season theirs.'; },
    world_cup_winner: function(){ return 'A world champion , the prize of all prizes.'; },
    ucl_winner:       function(){ return 'Champions of Europe , the brightest lights conquered.'; },
  };
  // One honour as a tap-expandable Wonder-Tags row: one-liner (.td) + Drury paragraph & meta (.tmore, #16).
  function honourRowHTML(h){
    const icon = HONOUR_ICON[h.type] || '';
    const oneLiner = h.oneliner || h.label;
    const drury = HONOUR_DRURY[h.type] || '';
    const meta = HONOUR_TALLY[h.type] ? HONOUR_TALLY[h.type](h) : '';
    const tmore = (drury || meta)
      ? '<div class="tmore">' + (drury ? escHtml(drury) : '')
        + (meta ? '<div class="tmeta">'+escHtml(meta)+'</div>' : '') + '</div>'
      : '';
    return '<div class="tagrow honour" onclick="this.classList.toggle(\'open\')">'
      + '<div class="tt">'+icon+' <span class="ttl">'+h.label+'</span> <span class="tchev">⌄</span></div>'
      + '<div class="td">'+escHtml(oneLiner)+'</div>'
      + tmore
      + '</div>';
  }
  // Wonder-Tags honour rows (tier-sorted); delegates to honourRowHTML per item.
  function renderHonourRows(honours){
    if(!honours || !honours.has) return '';
    const items = honours.all || honours.season.concat(honours.career);
    return items.map(honourRowHTML).join('');
  }
  // #17: Wonder Tags grouped into 3 named sections , SILVERWARE (Team + world_cup Career) ->
  //   INDIVIDUAL HONOURS (Individual) -> THE PLAYER (profile rows). Each renders only when non-empty.
  // Wonder-Tags "THE PLAYER" rows , tap-expandable profile-tag rows. SHARED by card + compare.
  //   prestige (Gen/Iconic) leads, then each profile tag; icon + name + one-liner + Drury def, all from TAG_DEFS.
  const WT_TAG_ICON = (function(){ var svg=function(p){ return '<svg class="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; };
    return { ATT:svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>'),
             MID:svg('<path d="M15 5l4 4"/><path d="M17 3l4 4-12 12-4 1 1-4z"/>'),
             DEF:svg('<path d="M12 3l7 3v5c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6z"/>'),
             CROSS:svg('<path d="M12 3l7 9-7 9-7-9z"/>'),
             AGE:svg('<path d="M12 3.5l2.4 5.3 5.6.5-4.3 3.7 1.3 5.5L12 21l-5.3 3 1.3-5.5L3.7 9.3l5.6-.5z"/>'),
             GEN:svg('<path d="M3 8l4 6 5-9 5 9 4-6v9H3z"/>'),
             ICO:svg('<path d="M12 3.5l1.7 4.9 4.9 1.7-4.9 1.7L12 16.7l-1.7-4.9L5.4 11.8l4.9-1.7z"/><path d="M18.5 15l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5z"/>') };
  })();
  function renderProfileTagRows(tags, prestige){
    var rows=[];
    if(prestige==='Generational' || prestige==='Iconic'){
      var pdef=TAG_DEFS[prestige];
      if(pdef) rows.push({ icon:(prestige==='Generational'?WT_TAG_ICON.GEN:WT_TAG_ICON.ICO), name:prestige, one:pdef.oneLiner, full:pdef.def });
    }
    if(Array.isArray(tags)) tags.forEach(function(t){ var def=TAG_DEFS[t.name]; if(def) rows.push({ icon:(WT_TAG_ICON[t.family]||WT_TAG_ICON.CROSS), name:t.name, one:def.oneLiner, full:def.def }); });
    return rows.map(function(r){
      return '<div class="tagrow" onclick="this.classList.toggle(\'open\')">'
        + '<div class="tt">' + r.icon + ' <span class="ttl">' + r.name + '</span> <span class="tchev">&#8964;</span></div>'
        + '<div class="td">' + r.one + '</div>'
        + '<div class="tmore">' + r.full + '</div></div>';
    }).join('');
  }
  function renderWonderTagsGrouped(honours, profileRowsHtml){
    const all = (honours && honours.all) ? honours.all : [];
    const silverware = all.filter(function(h){ const m = HONOUR_META[h.type]; return m && (m.group === 'Team' || h.type === 'world_cup_winner'); });
    const individual = all.filter(function(h){ const m = HONOUR_META[h.type]; return m && m.group === 'Individual'; });
    const sec = function(label, html){ return html ? '<div class="wtsec"><div class="wtsechead">'+label+'</div>'+html+'</div>' : ''; };
    return sec('SILVERWARE', silverware.map(honourRowHTML).join(''))
         + sec('INDIVIDUAL HONOURS', individual.map(honourRowHTML).join(''))
         + sec('THE PLAYER', profileRowsHtml || '');
  }
  // TOP-SLOT honour pill (card face, wired with the priority decision later).
  function renderTopHonourPill(honours, opts){
    if(!honours || !honours.topHonour) return '';
    const h = honours.topHonour;
    const cls = (opts && opts.baseClass) || 'chtagcell';
    const icon = HONOUR_ICON[h.type] || '';
    const label = HONOUR_CHIP_LABEL[h.type] || h.label;
    return '<span class="'+cls+' gold" data-tag="'+escAttr(h.type)+'" data-tip="'+escAttr(h.oneliner||h.label)+'">'+icon+label+'</span>';
  }

  // ── Honours BATCH (folded from vv-honours-batch.js) , ONE query for a whole
  //    page of cards (rankings). Mirrors fetchHonours' season-match (incl. the
  //    WC season-specific rule), but batched (no N round-trips). Sets card.honours in place. ──
  async function attachHonoursBatch(cards){
    if(!Array.isArray(cards) || !cards.length) return;
    const sb = (typeof vvClient === 'function') ? vvClient() : null;
    if(!sb){ cards.forEach(c=>{ if(c) c.honours = emptyHonours(); }); return; }
    const ids = [...new Set(cards.map(c => c && c.api_player_id).filter(x => x != null))];
    if(!ids.length){ cards.forEach(c=>{ if(c) c.honours = emptyHonours(); }); return; }
    let res;
    try {
      res = await sb.from('honours')
        .select('honour_type,season_year,league_code,honour_context,goals,assists,api_player_id')
        .in('api_player_id', ids);
    } catch(e){ cards.forEach(c=>{ if(c) c.honours = emptyHonours(); }); return; }
    if(res.error || !res.data){ cards.forEach(c=>{ if(c) c.honours = emptyHonours(); }); return; }
    const byPlayer = new Map();
    for(const h of res.data){
      if(!byPlayer.has(h.api_player_id)) byPlayer.set(h.api_player_id, []);
      byPlayer.get(h.api_player_id).push(h);
    }
    await loadTeamHonours();   // session-once; shapeHonoursForCard reads the resolved cache
    for(const c of cards){
      if(!c){ continue; }
      c.honours = shapeHonoursForCard(c, byPlayer.get(c.api_player_id) || []);
    }
  }
  // Shape one card's honours from its player's rows (mirrors fetchHonours; WC season-specific).
  // teamCache (optional): resolved team-honours cache; defaults to the session cache set by
  // loadTeamHonours() (attachHonoursBatch awaits it before calling, so it is ready here).
  function shapeHonoursForCard(card, rows, teamCache){
    const seasonYear = card.season_year != null ? card.season_year
                     : (card.season != null ? parseInt(String(card.season).slice(0,4),10) : null);
    const leagueCode = card.league_code || null;
    const season = [];
    for(const h of rows){
      const meta = HONOUR_META[h.honour_type];
      if(!meta) continue;
      if(seasonYear != null && h.season_year === seasonYear
         && (h.honour_type === 'world_cup_winner'
             || !h.league_code || !leagueCode || h.league_code === leagueCode)){
        season.push({
          type: h.honour_type, label: meta.label, tier: meta.tier,
          oneliner: (typeof HONOUR_ONELINER !== 'undefined' ? HONOUR_ONELINER[h.honour_type] : '') || meta.label,
          context: h.honour_context || null,
          goals: h.goals, assists: h.assists,
          season_year: h.season_year, league_code: h.league_code || null,
        });
      }
    }
    // merge TEAM-keyed honours (league_champion/ucl_winner) from the session cache
    const _tc = teamCache || _teamHonoursCache;
    if(_tc){
      for(const ti of teamHonoursFor(card, _tc)){
        if(!season.some(s => s.type === ti.type && s.season_year === ti.season_year)) season.push(ti);
      }
    }
    season.sort((a,b)=>a.tier-b.tier);
    const all = season.slice();   // WC season-specific -> all == season
    return { season, career: [], all, count: season.length, has: season.length > 0, topHonour: all.length ? all[0] : null };
  }
  function emptyHonours(){ return { season:[], career:[], all:[], count:0, has:false, topHonour:null }; }
  // Compact gold honour pills for list/compact rows (rankRowHTML) , text-only, up to 2.
  function renderHonourPillsCompact(honours, opts){
    if(!honours || !honours.has) return '';
    const cls = (opts && opts.baseClass) || 'rtag';
    const max = (opts && opts.max != null) ? opts.max : 2;   // #20: caller caps how many honour pills
    return honours.all.slice(0, max).map(function(h){
      const label = (typeof HONOUR_CHIP_LABEL !== 'undefined' ? HONOUR_CHIP_LABEL[h.type] : '') || h.label;
      const mk = (opts && opts.mark) ? vvMark('honour', h.type) : '';   // h.type IS the HONOUR_META key
      return '<span class="'+cls+' gold" data-tip="'+escAttr(h.oneliner||h.label)+'">'+mk+label+'</span>';
    }).join('');
  }

  // ── The Trajectory , shared dual-axis chart (stacked G/A bars + VV Score line).
  //    rows: [{season, goals, assists, rt, selected}] in CHRONOLOGICAL order.
  //    Card passes SEASON_ROWS (reversed); compare passes each player's rows (STEP 2).
  //    Returns legend + SVG string; '' when no rows (caller clears , no seed left behind).
  function renderTrajectory(rows, opts){
    opts = opts || {};
    if(!Array.isArray(rows) || !rows.length) return '';
    var data = rows.map(function(r){
      return { season:r.season, g:(+r.goals||0), a:(+r.assists||0),
               rt:(r.rt==null?null:+r.rt), selected:!!r.selected };
    });
    var n = data.length;
    // LEFT axis , goals + assists (dynamic max)
    var maxGA = 0; data.forEach(function(d){ var t=d.g+d.a; if(t>maxGA) maxGA=t; });
    var lstep = maxGA>40?20:(maxGA>20?10:(maxGA>8?5:2));   // finer steps at low values so a sparse chart fills the axis
    var axisTop = Math.max(lstep, Math.ceil(maxGA/lstep)*lstep);
    // RIGHT axis , VV Score (min-5 .. max+3, like the demo's 72-96)
    var rts = data.map(function(d){return d.rt;}).filter(function(x){return x!=null;});
    var hasVV = rts.length>0;
    var minRt = hasVV?Math.min.apply(null,rts):0, maxRt = hasVV?Math.max.apply(null,rts):100;
    var vvMin = hasVV?Math.max(0,minRt-5):0, vvMax = hasVV?Math.min(100,maxRt+3):100;
    if(vvMax-vvMin<8) vvMax = vvMin+8;   // single-season / flat guard
    var peakIdx=-1, peakRt=-1;
    data.forEach(function(d,i){ if(d.rt!=null && d.rt>peakRt){ peakRt=d.rt; peakIdx=i; } });
    // geometry , extra top room for peak/total labels, bottom room for axis titles
    var W=360,H=240, ml=32, mr=38, mt=42, mb=36, pw=W-ml-mr, ph=H-mt-mb;
    var single=(n===1);
    var slot=Math.min(pw/n, 72), usedW=slot*n, x0=ml+(pw-usedW)/2, bw=Math.min(44, slot*0.6);   // wider bars , clearer colour blocks
    var X=function(i){ return x0+slot*(i+0.5); };   // centre the bar cluster (neat for 1-2 seasons, full spread when many)
    var Yl=function(v){ return mt+ph-(v/axisTop)*ph; };
    var Yr=function(v){ return mt+ph-((v-vvMin)/(vvMax-vvMin))*ph; };
    var s='<defs>'
      + '<linearGradient id="tjgGoal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6E88"/><stop offset="1" stop-color="#F04E6C"/></linearGradient>'
      + '<linearGradient id="tjgAst" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0C860"/><stop offset="1" stop-color="#E0AC3C"/></linearGradient>'
      + '<filter id="tjShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.18"/></filter>'
      + '</defs>';
    // axis titles , name the two number columns so the ticks are legible
    s+='<text class="tjyl" x="'+(ml-6)+'" y="'+(mt-16)+'" text-anchor="end" style="letter-spacing:.05em">G+A</text>';
    if(hasVV) s+='<text class="tjyr" x="'+(W-mr+6)+'" y="'+(mt-16)+'" text-anchor="start" style="letter-spacing:.05em">VV</text>';
    // SHARED gridlines , LEFT (G+A) and RIGHT (VV) labels map to the SAME horizontal lines
    for(var t=0;t<=axisTop;t+=lstep){ var y=Yl(t);
      s+='<line class="tjgrid" x1="'+ml+'" y1="'+y.toFixed(1)+'" x2="'+(W-mr)+'" y2="'+y.toFixed(1)+'"/>';
      s+='<text class="tjyl" x="'+(ml-6)+'" y="'+(y+3.4).toFixed(1)+'" text-anchor="end">'+t+'</text>';
      if(hasVV){ var vvAt=Math.round(vvMin+(vvMax-vvMin)*(t/axisTop));   // VV value at this shared gridline
        s+='<text class="tjyr" x="'+(W-mr+6)+'" y="'+(y+3.4).toFixed(1)+'" text-anchor="start">'+vvAt+'</text>'; }
    }
    var xStep = n>=13?3:(n>=9?2:1);   // thin x-labels on dense charts
    data.forEach(function(d,i){ var x=X(i), bx=x-bw/2, base=Yl(0);
      if(d.selected) s+='<rect class="tjsel" x="'+(bx-4).toFixed(1)+'" y="'+(mt-2).toFixed(1)+'" width="'+(bw+8).toFixed(1)+'" height="'+(ph+2).toFixed(1)+'" rx="7"/>';
      var gTop=Yl(d.g), aTop=Yl(d.g+d.a), bars='', GAP=(d.g>0&&d.a>0)?2:0;   // clean gap so the pink/gold split reads as two blocks
      if(d.g>0) bars+='<rect x="'+bx.toFixed(1)+'" y="'+gTop.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(base-gTop).toFixed(1)+'" rx="4" fill="url(#tjgGoal)"/>';
      if(d.a>0){ var aBot=(gTop-GAP>aTop+1)?(gTop-GAP):gTop; bars+='<rect x="'+bx.toFixed(1)+'" y="'+aTop.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+(aBot-aTop).toFixed(1)+'" rx="4" fill="url(#tjgAst)"/>'; }
      if(bars) s+='<g filter="url(#tjShadow)">'+bars+'</g>';   // soft shadow lifts the stacked bar off the green
      /* invariant: thinning stays (i%xStep) and the last season is always labelled.
         The d.selected clause was REMOVED , it inserted an off-rhythm label; the selected
         season already carries the full-height .tjsel highlight band, so it was redundant. */
      if(i%xStep===0 || i===n-1){
        var xlab="’"+String(fmtSeason(d.season)).split('/').pop();   // apostrophe + END year, e.g. 2019
        s+='<text class="tjxl'+(d.selected?' tjxlsel':'')+'" x="'+x.toFixed(1)+'" y="'+(H-12)+'" text-anchor="middle">'+escHtml(xlab)+'</text>';
      }
    });
    if(hasVV){
      var pts=[]; data.forEach(function(d,i){ if(d.rt!=null) pts.push(X(i).toFixed(1)+','+Yr(d.rt).toFixed(1)); });
      if(pts.length>1) s+='<polyline class="tjline" points="'+pts.join(' ')+'" fill="none" stroke="#F0EAD9" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      data.forEach(function(d,i){ if(d.rt==null) return; var x=X(i), y=Yr(d.rt), pk=(i===peakIdx);
        s+='<circle class="tjdot" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(pk?4.5:3.1)+'" fill="'+(pk?'#E8B84B':'#F0EAD9')+'" stroke="#17151a" stroke-width="1.2"/>';
        if(pk){ var barTop=Yl(d.g+d.a), peakY=Math.min(y, barTop)-18;   // sit above BOTH the VV dot AND the season-total (which is at barTop-6) , never overlap
          s+='<text class="tjpeak" x="'+x.toFixed(1)+'" y="'+peakY.toFixed(1)+'" text-anchor="middle">'+(single?('VV '+d.rt):('PEAK '+d.rt))+'</text>'; }   // one season isn't a "peak"
      });
    }
    // season total , a clean number above the bar. Card: panel-green mask breaks the VV line. Compare: no halo
    // (the old dark-green #0A2A18 halo was leftover from the green panel , the noise); .tjtot is dark via body.light.
    data.forEach(function(d,i){ var x=X(i), tot=d.g+d.a, ty=((tot>0)?Yl(tot):Yl(0))-6, tw=String(tot).length*6+8;
      if(!opts.transparent) s+='<rect class="tjmask" x="'+(x-tw/2).toFixed(1)+'" y="'+(ty-9.5).toFixed(1)+'" width="'+tw.toFixed(1)+'" height="12" rx="3"/>';
      s+='<text class="tjtot" x="'+x.toFixed(1)+'" y="'+ty.toFixed(1)+'" text-anchor="middle">'+tot+'</text>';
    });
    var svg='<svg class="tjsvg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" width="100%">'+s+'</svg>';
    if(opts.chrome===false) return svg;   // compare: bare chart (shared head/legend/caption supplied once by the caller)
    var head='<div class="tjhead">Goals and assists per season, tracked against the V<span class="tjvp">V</span> Score they earned.</div>';
    var legend='<div class="tjlegend"><span class="tjlg"><i style="background:#E70443"></i>Goals</span><span class="tjlg"><i style="background:#E8B84B"></i>Assists</span><span class="tjlg"><i class="tjlgline"></i><span>V<span class="tjvp">V</span> Score</span></span></div>';
    var caption='<div class="tjcap">'+(single
      ? 'One season on record , the numbers so far, not yet a trajectory.'
      : 'The bars remember what he did. The line remembers what it was worth. The gap tells the story a raw tally can’t.')+'</div>';
    return head+legend+svg+caption;
  }

  // ── Unified rank/season row (.urow) , shared by rankings List + Compact AND
  //    the card / Compare season pickers (one player's seasons). Pure function:
  //    reads only its args. Deps (renderHonourPillsCompact/renderPrestige/
  //    renderTagPills/posDisplay/rowShieldHTML/shieldSplit/inkFor) are all in this
  //    file. opts: {cap, onClick(d,i)->string, showRank, active}. Back-compat: a
  //    bare number 3rd arg is treated as `cap` (rankings' original call shape).
  //    Defaults keep rankings byte-identical (showRank:true, onClick:goCard). ──
  function rowShieldHTML(d,i){
    var numStr = (d.number!=null && d.number!=='') ? String(d.number) : '';
    if(!numStr) return '';
    var c1 = d.club1 || '#2a2320', c2 = d.club2 || c1;
    var split = shieldSplit(c1, c2);
    var ink = inkFor(c1);
    var numStroke = split ? (ink==='#fff' ? ' stroke="rgba(0,0,0,0.35)" stroke-width="0.6" paint-order="stroke"' : ' stroke="rgba(255,255,255,0.6)" stroke-width="0.6" paint-order="stroke"') : '';
    var numSize = numStr.length>=3 ? 42 : (numStr.length===2 ? 46 : 56);
    var uid='rs'+i;
    var fill = split
      ? '<rect x="0" width="50" height="116" fill="'+c1+'"/><rect x="50" width="50" height="116" fill="'+c2+'"/>'
      : '<rect width="100" height="116" fill="'+c1+'"/>';
    return '<svg class="ushield" viewBox="0 0 100 116" aria-hidden="true">'
      +'<defs><clipPath id="'+uid+'"><path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z"/></clipPath></defs>'
      +'<g clip-path="url(#'+uid+')">'+fill+'</g>'
      +'<path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z" fill="none" stroke="rgba(0,0,0,0.30)" stroke-width="5"/>'
      +'<path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>'
      +'<text x="50" y="58" font-family="Archivo" font-weight="900" font-size="'+numSize+'" fill="'+ink+'" text-anchor="middle" dominant-baseline="central"'+numStroke+'>'+numStr+'</text>'
    +'</svg>';
  }
  // ── SHARED ROW CSS (#) , the rules that style what rankRowHTML emits ──────────────
  //  THESE USED TO LIVE IN THE PAGE FILES, IN THREE PLACES, AND THAT WAS THE DEFECT.
  //  rankRowHTML lived here while its CSS lived in rankings.html (global copy), in
  //  card.html (a second copy scoped under #cardSearch) and, for the seasonled variant,
  //  in card.html AND compare.html. Measured before moving: the copies were byte-IDENTICAL
  //  once the container id was normalised, so nobody had customised one.
  //
  //  WHY IT MATTERED: the renderer worked and the rows simply had no styling, with nothing
  //  to signal it. That is how pointing the compare picker at rankRowHTML produced 804px
  //  unstyled rows. Until this move, any surface adopting the shared renderer was one
  //  copy-paste from the same silent bug.
  //
  //  TWO NAMESPACES, NOT ONE, DELIBERATELY. The grid set and the season set both style
  //  .rmini and .rtag with DIFFERENT values, so one namespace would make them collide with
  //  each other. .vvrows is the list/grid container, .vvrows-season is the season fold.
  //  A container opts in by carrying the class; no static markup on any page uses these
  //  class names, so the renderer owns the whole vocabulary and nothing else can match.
  //
  //  .vvrows.vvrows IS NOT A TYPO. Those rules originally carried the container ID
  //  (#cardgrid / #csGrid), which outranks any number of classes. Dropping the ID to one
  //  class would let body.light rules (0,2,0) beat container rules that used to win at
  //  (1,1,1), silently inverting light-mode colours under pillmode. The doubled class
  //  restores the ordering.
  //
  //  .vvrows.pillmode IS ALSO NOT A SLIP , the mode class sits ON the container, so it
  //  MERGES into that compound. Writing it as a descendant (".vvrows .pillmode .urow")
  //  matches nothing, which is precisely the bug the computed-style diff caught: every
  //  row lost its padding and column-gap and grew from 80px to 637px tall.
  //
  //  WHAT DELIBERATELY DID NOT MOVE: .gridwrap / .compacthead rules (page furniture that
  //  merely mentions a mode class , .compacthead is static markup in rankings.html, not
  //  renderer output) and the Cards-view :not(.pillmode) negations. Both stay in the pages.
  //
  //  THE BACKSLASHES ARE DOUBLED because a CSS escape (content:"\00B7") is an illegal
  //  OCTAL escape inside a template literal. node --check catches it; nothing else would.
  //
  //  INJECTED AT THE FRONT OF <head> so page rules stay LATER in author order and a page
  //  can still override at equal specificity. vv-core loads in the BODY on all three pages,
  //  after the page <style> is parsed, and rows render later still, so the sheet is always
  //  in place before a row exists. No flash.
  // ── VV_CARD_CSS , the card face, beside its renderer ────────────────────────────
  //  buildCard() emits MARKUP ONLY. Until this existed the ~67 .vvcard rules lived inside
  //  each consuming page's <style>, three copies, and a page that called buildCard without
  //  them rendered a card at 632x3705px of unstyled nonsense. That was not theoretical: it
  //  broke the share demo and the html2canvas probe on their first runs, and it is the
  //  reason a share renderer could not reuse the real card at all.
  //
  //  WHAT MOVED: the 56 selectors that were present in card.html, rankings.html AND
  //  compare.html with BYTE-IDENTICAL declarations , measured, not assumed, exactly as the
  //  row move required. What did NOT move: the layout-context selectors that describe how a
  //  card sits in one page (.plinth .vvcard, .cardgrid .vvcard, .side .vvcard,
  //  #cardA .vvcard, the flip wrappers). Those are page furniture and stay.
  //
  //  IT PREPENDS, IT DOES NOT APPEND , AND THAT IS THE WHOLE HAZARD.
  //  These rules used to sit INSIDE each page's stylesheet, so page rules that follow them
  //  at EQUAL specificity currently win. Appending would invert that. The concrete case:
  //  rankings' `.vvcard .chtagcell.gold` is three classes, the same weight as the shared
  //  `.vvcard .chtag .chtagcell`, and it wins today only by coming later , append and the
  //  honour pills lose their gold. So the sheet is inserted as the FIRST child of <head>,
  //  which keeps every page rule winning exactly as it does now.
  var VV_CARD_CSS = `
body.light .vvcard{background:radial-gradient(130% 60% at 50% 0%, #F7F2E6 0%, var(--cream) 48%, var(--cream-deep) 100%) !important;color:#1C1B1A !important}
.vvcard .ctop{position:relative;height:calc(var(--cw)*0.2);margin-bottom:calc(var(--cw)*0.02)}
.vvcard .ctl{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:flex-start}
.vvcard .yr{position:absolute;left:50%;top:calc(var(--cw)*0.015);transform:translateX(-50%);font-family:'Barlow Condensed';font-weight:700;font-size:calc(var(--cw)*0.1);letter-spacing:0.02em;color:var(--charcoal);white-space:nowrap;display:inline-flex;align-items:center}
.vvcard .cbadgewrap{display:flex;align-items:center;gap:calc(var(--cw)*0.033)}
.vvcard .cbadge{width:calc(var(--cw)*0.175);height:calc(var(--cw)*0.203);flex-shrink:0;display:block;filter:drop-shadow(0 4px 9px rgba(0,0,0,0.32))}
.vvcard .pos{display:none}
.vvcard .ctr{position:absolute;right:0;top:calc(var(--cw)*-0.01);display:flex;flex-direction:column;align-items:center}
.vvcard .halo{display:none}
.vvcard .n{font-family:'Barlow Condensed';font-weight:800;font-size:calc(var(--cw)*0.17);line-height:.82;color:var(--charcoal)}
.vvcard .vv{font-family:'Bricolage Grotesque';font-weight:800;font-size:calc(var(--cw)*0.08);letter-spacing:0.02em;line-height:1;margin-top:calc(var(--cw)*0.025)}
.vvcard .vv .a{color:var(--charcoal)}
.vvcard .vv .b{color:var(--pink)}
.vvcard .cimg{width:60%;aspect-ratio:1/1;flex:0 0 auto;border-radius:calc(var(--cw)*0.05);background:linear-gradient(165deg,#3c3c42,#232328 60%,#1a1a1e);margin:0 auto calc(var(--cw)*0.035);position:relative;overflow:hidden;box-shadow:0 10px 22px -12px rgba(0,0,0,0.5),inset 0 0 0 1.5px rgba(0,0,0,0.5),inset 0 1.5px 0 0 rgba(255,255,255,0.12)}
.vvcard .cimg .silh{width:60%;height:auto;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
.vvcard .cphoto{position:absolute;width:100%;height:100%;object-fit:cover;object-position:center 22%;display:none}
body.show-photos .vvcard .cimg .cphoto{display:block}
body.show-photos .vvcard .cimg:not(.no-photo) .silh{display:none}
.vvcard .chtag{display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--cw)*0.025);margin-bottom:calc(var(--cw)*0.04)}
.vvcard .chtag .chtagcell:last-child:nth-child(odd){grid-column:1 / -1}
/* #4: odd count -> last tag spans both cols, no blank cell */
  .vvcard .chtag.one{grid-template-columns:1fr;justify-items:center}
.vvcard .chtag .chtagcell{font-family:'Barlow Condensed';font-weight:600;font-size:calc(var(--cw)*0.045);letter-spacing:0.02em;text-transform:uppercase;color:#fff;background:linear-gradient(90deg,#FF7A5C,#E70443);padding:calc(var(--cw)*0.014) calc(var(--cw)*0.016);border-radius:calc(var(--cw)*0.028);text-align:center;line-height:1.1;overflow:hidden;display:flex;align-items:center;justify-content:center;width:100%;min-height:calc(var(--cw)*0.07);box-sizing:border-box}
.vvcard .chtag.one .chtagcell{width:auto;padding-left:calc(var(--cw)*0.07);padding-right:calc(var(--cw)*0.07)}
.vvcard .chtagcell-att{background:linear-gradient(90deg,#FF7A5C,#E70443) !important}
.vvcard .chtagcell-mid{background:linear-gradient(90deg,#3FBF7F,#2FA968) !important}
.vvcard .chtagcell-def{background:linear-gradient(90deg,#5C9DFF,#4A7FE0) !important}
.vvcard .chtagcell-age{background:linear-gradient(90deg,#5A5856,#46443F) !important}
.vvcard .cga{display:flex;justify-content:center;gap:calc(var(--cw)*0.08);margin-bottom:calc(var(--cw)*0.03)}
.vvcard .cga .col{text-align:center}
.vvcard .cga .col .v{font-family:'Barlow Condensed';font-weight:800;font-size:calc(var(--cw)*0.105);line-height:.9}
.vvcard .cga .col .l{font-family:'Barlow Condensed';font-weight:600;font-size:calc(var(--cw)*0.04);letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-soft);margin-top:2px}
.vvcard .cga .divider{width:1px;background:rgba(0,0,0,0.12);align-self:stretch}
.vvcard .cname{text-align:center;margin-top:auto}
.vvcard .cname .nm{width:100%;font-family:'Barlow Condensed';font-weight:700;text-transform:uppercase;font-size:calc(var(--cw)*0.135);line-height:1;display:flex;align-items:center;justify-content:center;gap:calc(var(--cw)*0.03);white-space:nowrap}
.vvcard .cname .nm.long{font-size:calc(var(--cw)*0.09)}
.vvcard .cname .nm .cflag{font-size:calc(var(--cw)*0.07)}
.vvcard .cname .full{display:none}
.vvcard .cname .sub{font-family:'Barlow Condensed';font-weight:600;font-size:calc(var(--cw)*0.05);letter-spacing:0.04em;text-transform:uppercase;color:var(--ink-soft);margin-top:calc(var(--cw)*0.01)}
.vvcard.gen .yr{color:rgba(240,234,217,0.85)}
.vvcard.gen .n{color:#F0EAD9}
.vvcard.gen .cimg,.vvcard.iconic .cimg{width:55%;margin-top:calc(var(--cw)*0.005)}
.vvcard.gen .pos{color:#E8B84B;background:rgba(232,184,75,0.14)}
.vvcard.gen .vv .a{color:#F0EAD9}
.vvcard.gen .cga .col .l{color:rgba(240,234,217,0.5)}
.vvcard.gen .cga .divider{background:rgba(255,255,255,0.15)}
.vvcard.gen .cname .full,.vvcard.gen .cname .sub{color:rgba(240,234,217,0.6)}
/* ICONIC , bright GOLD card, dark text */
  /* THE GENERATIONAL FACE BELONGS HERE, BESIDE ITS SIBLING. The iconic face has lived in
     this sheet all along and the gen face did not , it was copied into each PAGE instead.
     That asymmetry is the SS C class defect: a rule stated in one place and not applied to
     every member of its class will be violated everywhere else.
     WHAT IT COSTS WHEN IT IS MISSING: the six gen ink rules below (.yr, .n, .vv .a,
     .cga .col .l, .cname .full/.sub, .pos) are all pinned LIGHT because they assume a dark
     face. On a surface that lacks this rule, body.light .vvcard wins and paints the face
     CREAM while those inks stay cream , year, score, labels and club line all vanish at
     about 1.09 contrast. Measured on a scratch page that loaded vv-core alone, which is
     exactly what a new surface looks like.
     The five page copies are left in place: they are identical to this on card, compare and
     rankings, so nothing moves, and preferences/myclub carry a DRIFTED rim (a flat 1.5px
     outline instead of the gold inset, no !important) which is its own decision, logged in
     SS D rather than silently overwritten here. */
  body .vvcard.gen{background:radial-gradient(130% 60% at 50% 0%, #2c2824 0%, #16120e 50%, #090706 100%) !important;color:#F0EAD9 !important;box-shadow:0 22px 50px -22px rgba(0,0,0,0.85), inset 0 0 0 calc(var(--cw)*0.02) #16120e, inset 0 0 0 calc(var(--cw)*0.025) rgba(232,184,75,0.7) !important}
  body .vvcard.iconic{background:radial-gradient(130% 60% at 50% 0%, #FBE490 0%, #E8B84B 48%, #D29A2C 100%) !important;color:#2a1d03 !important;box-shadow:0 22px 50px -22px rgba(176,120,20,0.7), inset 0 0 0 calc(var(--cw)*0.02) #E8B84B, inset 0 0 0 calc(var(--cw)*0.025) rgba(42,29,3,0.55) !important}
.vvcard.iconic .yr{color:rgba(42,29,3,0.82)}
.vvcard.iconic .pos{color:#3a2a08;background:rgba(0,0,0,0.12)}
.vvcard.iconic .vv .a{color:#2a1d03}
.vvcard.iconic .cga .col .l{color:rgba(42,29,3,0.6)}
.vvcard.iconic .cga .divider{background:rgba(0,0,0,0.18)}
.vvcard.iconic .cname .full,.vvcard.iconic .cname .sub{color:rgba(42,29,3,0.65)}
/* Prestige pills , the LOUDEST tag (reuse .rmini gen/elite language) */
  .vvcard .chtag-prestige-gen,.vvcard .chtag-prestige-ico{display:block;margin-bottom:calc(var(--cw)*0.018)}
.vvcard .chtag-prestige-gen span{display:block;text-align:center;background:linear-gradient(90deg,#2c2926,#121010);color:#F3DA88;border:1px solid rgba(232,184,75,0.55);font-weight:800;letter-spacing:0.09em;font-size:calc(var(--cw)*0.038);text-transform:uppercase;padding:calc(var(--cw)*0.013) calc(var(--cw)*0.05);border-radius:calc(var(--cw)*0.028);box-shadow:0 8px 20px -7px rgba(232,184,75,0.85)}
.vvcard .chtag-prestige-ico span{display:block;text-align:center;background:linear-gradient(90deg,#F3DA88,#E8B84B);color:#16120e;font-weight:800;letter-spacing:0.09em;font-size:calc(var(--cw)*0.038);text-transform:uppercase;padding:calc(var(--cw)*0.013) calc(var(--cw)*0.05);border-radius:calc(var(--cw)*0.028);box-shadow:0 8px 20px -7px rgba(232,184,75,0.85)}
/* MARK SIZING , belongs here, and was MISSED by the first extraction pass.
   These two rules are byte-identical in card.html, rankings.html and compare.html,
   but each carried a DIFFERENT COMMENT above it, and the extraction compared the
   selector prelude WITH its comment attached , so one shared rule read as three
   different ones and none of them qualified. The cost was visible immediately on a
   fourth surface: with no size rule a mark renders at its intrinsic 254px instead of
   12px and blows the prestige row to 0.98 of the card width.
   THE LESSON FOR THE NEXT EXTRACTION: compare DECLARATIONS, and normalise the
   selector before comparing it. A comment is not part of a selector. */
.vvcard .chtag .vvm,.vvcard .chtagcell .vvm{width:calc(var(--cw)*0.042);height:calc(var(--cw)*0.042);flex:none;margin-right:calc(var(--cw)*0.016);vertical-align:-0.09em}
.vvcard .chtagcell{display:inline-flex;align-items:center;justify-content:center}
`;
  function vvInjectCardCSS(){
    if (typeof document === 'undefined') return;
    if (document.getElementById('vv-card-css')) return;
    var st = document.createElement('style');
    st.id = 'vv-card-css';
    st.textContent = VV_CARD_CSS;
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) head.insertBefore(st, head.firstChild);   // FIRST, see the note above
  }
  vvInjectCardCSS();

  var VV_ROW_CSS = `
.vvrows.vvrows.pillmode, .vvrows.vvrows.compactmode{display:block;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px}
body.light .vvrows.vvrows.pillmode, body.light .vvrows.vvrows.compactmode{background:rgba(255,255,255,0.5);border-color:rgba(0,0,0,0.06)}
.vvrows .urow{display:grid;grid-template-columns:44px minmax(0,2.2fr) 56px minmax(0,1.5fr) 96px 264px 60px 60px 60px;align-items:center;cursor:pointer;transition:background .14s}
.vvrows.vvrows.pillmode > .urow, .vvrows.vvrows.compactmode > .urow{display:grid;justify-content:stretch}
.vvrows .urow+.urow{border-top:1px solid rgba(255,255,255,0.06)}
body.light .vvrows .urow+.urow{border-color:rgba(0,0,0,0.055)}
.vvrows .urow:hover{background:rgba(255,255,255,0.04)}
body.light .vvrows .urow:hover{background:rgba(0,0,0,0.025)}
.vvrows .urank{text-align:center;font-family:'Archivo';font-weight:900;color:rgba(243,237,224,0.58);font-variant-numeric:tabular-nums}
body.light .vvrows .urank{color:var(--ink-soft)}
.vvrows .uident{display:flex;align-items:center;gap:11px;min-width:0}
.vvrows .ushield{flex:none;display:block;width:auto}
.vvrows.pillmode .ushield{height:24px}
.vvrows.compactmode .ushield{height:20px}
.vvrows .uflag{flex:none}
.vvrows .uname{font-family:'Bricolage Grotesque';font-weight:800;letter-spacing:-.01em;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.light .vvrows .uname{color:var(--charcoal)}
.vvrows .uyear{font-weight:700;color:rgba(243,237,224,0.55);text-align:center;font-variant-numeric:tabular-nums}
body.light .vvrows .uyear{color:var(--ink-soft)}
.vvrows .uclub{font-weight:700;color:rgba(243,237,224,0.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.light .vvrows .uclub{color:var(--ink-soft)}
.vvrows .upos{font-family:'Archivo';font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:rgba(243,237,224,0.58);text-align:center}
.vvrows .uage{position:relative;margin-left:11px;font-weight:700;letter-spacing:0;text-transform:none;opacity:.72;font-variant-numeric:tabular-nums}
.vvrows .uage::before{content:"\\00B7";position:absolute;left:-8px;opacity:.55}
body.light .vvrows .upos{color:var(--ink-soft)}
.vvrows .utags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;row-gap:5px;min-width:0}
.vvrows .ugoals, .vvrows .uassists{font-weight:800;color:var(--cream);text-align:right;font-variant-numeric:tabular-nums}
body.light .vvrows .ugoals, body.light .vvrows .uassists{color:var(--charcoal)}
.vvrows .ugoals span, .vvrows .uassists span{font-family:'Archivo';font-weight:700;color:rgba(243,237,224,0.6);margin-left:1px}
body.light .vvrows .ugoals span, body.light .vvrows .uassists span{color:var(--ink-soft)}
.vvrows.pillmode .urow{column-gap:18px;padding:14px 22px}
.vvrows.pillmode .urank{font-size:17px}
.vvrows.pillmode .uflag{font-size:22px}
.vvrows.pillmode .uname{font-size:19px}
.vvrows.pillmode .uyear{font-size:13px}
.vvrows.pillmode .uclub{font-size:14px}
.vvrows.pillmode .upos{font-size:11px}
.vvrows.pillmode .ugoals, .vvrows.pillmode .uassists{font-size:15px}
.vvrows.pillmode .ugoals span, .vvrows.pillmode .uassists span{font-size:11px}
.vvrows.compactmode .urow{column-gap:14px;padding:8px 18px}
.vvrows.compactmode .urank{font-size:13px}
.vvrows.compactmode .uflag{font-size:18px}
.vvrows.compactmode .uname{font-size:16px}
.vvrows.compactmode .uyear{font-size:12px}
.vvrows.compactmode .uclub{font-size:13px}
.vvrows.compactmode .upos{font-size:10px}
.vvrows.compactmode .ugoals, .vvrows.compactmode .uassists{font-size:13px}
.vvrows.compactmode .ugoals span, .vvrows.compactmode .uassists span{font-size:10px}
.vvrows.compactmode .rmini{width:40px;height:44px;border-radius:9px}
.vvrows.compactmode .rmvv{font-size:10px}
.vvrows.compactmode .rmn{font-size:17px}
.vvrows .rtag .vvm,.vvrows-season .rtag .vvm{width:11px;height:11px;flex:none;margin-right:5px;vertical-align:-1px}\n.vvrows .rtag,.vvrows-season .rtag{display:inline-flex;align-items:center}\n.vvrows .rtag{position:relative;white-space:nowrap;font-family:'Archivo';font-weight:700;font-size:10px;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid}
.vvrows .rtag.gold{background:linear-gradient(90deg,#F0D27A,#E0A93A);border-color:transparent;color:#5a4410}
.vvrows .rtag.pink{background:rgba(255,92,122,.14);border-color:rgba(255,92,122,.5);color:#e0466a}
.vvrows .rtag.blue{background:rgba(59,111,176,.14);border-color:rgba(59,111,176,.5);color:#3f74b5}
.vvrows .rtag.green{background:rgba(46,140,90,.15);border-color:rgba(46,140,90,.5);color:#2a8455}
.vvrows .rtag.coral{background:rgba(255,122,92,.15);border-color:rgba(255,122,92,.5);color:#e0613a}
.vvrows .rtag.purple{background:rgba(150,95,205,.15);border-color:rgba(150,95,205,.5);color:#8b5bc8}
body.light .vvrows .rtag.pink{color:#af3753}
body.light .vvrows .rtag.coral{color:#a1462a}
body.light .vvrows .rtag.slate{color:#62626d}
body.light .vvrows .rtag.green{color:#236f47}
body.light .vvrows .rtag.blue{color:#36649c}
body.light .vvrows .rtag.purple{color:#784eac}
.vvrows .rtag.slate{background:rgba(120,120,135,.14);border-color:rgba(120,120,135,.45);color:#777785}
.vvrows .rtag.gen{background:#1C1B1A;border-color:rgba(232,184,75,.6);color:#F0EAD9}
.vvrows .rtag-prestige-gen{background:#1C1B1A;border-color:rgba(232,184,75,.6);color:#F3DA88;font-weight:800}
.vvrows .rtag-prestige-ico{background:linear-gradient(90deg,#F3DA88,#E8B84B);border-color:transparent;color:#16120e;font-weight:800}
.vvrows .rtag-att{background:linear-gradient(90deg,#FF7A5C,#E70443);border-color:transparent;color:#fff}
.vvrows .rtag-mid{background:linear-gradient(90deg,#3FBF7F,#2FA968);border-color:transparent;color:#fff}
.vvrows .rtag-def{background:linear-gradient(90deg,#5C9DFF,#4A7FE0);border-color:transparent;color:#fff}
.vvrows .rtag-age{background:linear-gradient(90deg,#5A5856,#46443F);border-color:transparent;color:#fff}
.vvrows .rtag-cross{background:linear-gradient(90deg,#5A5856,#46443F);border-color:transparent;color:#fff}
.vvrows .rmini{justify-self:end;margin-right:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;width:46px;height:52px;border-radius:11px;gap:1px;background:linear-gradient(155deg,#F7F2E6,#EDE6D4);border:1px solid rgba(0,0,0,.12);box-shadow:0 5px 14px -6px rgba(0,0,0,.4)}
.vvrows .rmvv{font-family:'Bricolage Grotesque';font-weight:800;font-size:11.5px;line-height:1}
.vvrows .rmvv .a{color:#1C1B1A}
.vvrows .rmvv .b{color:var(--pink)}
.vvrows .rmn{font-family:'Bricolage Grotesque';font-weight:800;font-size:20px;line-height:1;color:#1C1B1A}
.vvrows .rmini.elite{background:linear-gradient(155deg,#F3DA88,#DC9E2C);border-color:rgba(120,80,10,.4)}
.vvrows .rmini.elite .a, .vvrows .rmini.elite .rmn{color:#2a1d03}
.vvrows .rmini.gen{background:linear-gradient(155deg,#2c2926,#121010);border:1px solid rgba(232,184,75,.5)}
.vvrows .rmini.gen .a, .vvrows .rmini.gen .rmn{color:#fff}
@media (max-width:720px),(max-height:600px){
  .vvrows.vvrows.pillmode > .urow{grid-template-columns:24px minmax(0,1fr) auto auto auto auto 42px;grid-template-rows:auto auto auto;column-gap:0;row-gap:4px;padding:10px 13px;align-items:center}
  .vvrows.vvrows.pillmode > .urow > .urank{grid-column:1;grid-row:1/4;align-self:start;margin-top:2px;font-size:12px;margin-right:11px}
  .vvrows.vvrows.pillmode > .urow > .uident{grid-column:2/7;grid-row:1;min-width:0}
  .vvrows.vvrows.pillmode .uname{font-size:15.5px}
  .vvrows.vvrows.pillmode .ushield{height:18px}
  .vvrows.vvrows.pillmode > .urow > .uclub, .vvrows.vvrows.pillmode > .urow > .uyear, .vvrows.vvrows.pillmode > .urow > .upos, .vvrows.vvrows.pillmode > .urow > .ugoals, .vvrows.vvrows.pillmode > .urow > .uassists{grid-row:2;display:inline-flex;align-items:baseline;font-size:12px;font-weight:700;white-space:nowrap}
  .vvrows.vvrows.pillmode > .urow > .uclub{grid-column:2;min-width:0;overflow:hidden;text-overflow:ellipsis;color:var(--row-muted-2)}
  .vvrows.vvrows.pillmode > .urow > .uyear{grid-column:3;color:var(--row-muted);font-variant-numeric:tabular-nums}
  .vvrows.vvrows.pillmode > .urow > .upos{grid-column:4;color:var(--row-muted-2)}
  .vvrows.vvrows.pillmode > .urow > .ugoals{grid-column:5;color:var(--row-muted);font-variant-numeric:tabular-nums}
  .vvrows.vvrows.pillmode > .urow > .uassists{grid-column:6;color:var(--row-muted);font-variant-numeric:tabular-nums;margin-left:6px;margin-right:8px}
  .vvrows.vvrows.pillmode > .urow > .uclub::after, .vvrows.vvrows.pillmode > .urow > .uyear::after, .vvrows.vvrows.pillmode > .urow > .upos::after{content:"\\00B7";margin:0 6px;opacity:.45;color:var(--row-muted-2);font-weight:700}
  .vvrows.vvrows.pillmode > .urow > .ugoals span, .vvrows.vvrows.pillmode > .urow > .uassists span{color:var(--row-dim);font-weight:800;font-size:10px;margin-left:1px}
  .vvrows.vvrows.pillmode > .urow > .utags{grid-column:2/7;grid-row:3;justify-content:flex-start;margin-top:2px}
  .vvrows.vvrows.pillmode .rtag{font-size:8.5px;padding:2.5px 8px}
  .vvrows.vvrows.pillmode > .urow > .rmini{grid-column:7;grid-row:1/4;align-self:center;justify-self:end;margin:0;width:42px;height:48px}
  .vvrows.vvrows.compactmode > .urow{grid-template-columns:22px minmax(0,1fr) 34px 30px 30px 40px;grid-template-rows:auto auto;column-gap:9px;row-gap:1px;padding:7px 12px;align-items:center}
  .vvrows.vvrows.compactmode > .urow > .urank{grid-column:1;grid-row:1/3;align-self:center;font-size:11px}
  .vvrows.vvrows.compactmode > .urow > .uident{grid-column:2;grid-row:1;min-width:0}
  .vvrows.vvrows.compactmode .uname{font-size:13.5px}
  .vvrows.vvrows.compactmode .ushield{height:15px}
  .vvrows.vvrows.compactmode > .urow > .uyear{grid-column:2;grid-row:2;display:inline-flex;font-size:11px;color:var(--row-muted);font-variant-numeric:tabular-nums}
  .vvrows.vvrows.compactmode > .urow > .uyear::after{content:"\\00B7";margin:0 5px;opacity:.5;color:var(--row-muted-2)}
  .vvrows.vvrows.compactmode > .urow > .uclub{grid-column:2;grid-row:2;font-size:11px;color:var(--row-muted-2);min-width:0;overflow:hidden;text-overflow:ellipsis;text-indent:34px}
  .vvrows.vvrows.compactmode > .urow > .upos{grid-column:3;grid-row:1/3;align-self:center;text-align:center;font-size:11px}
  .vvrows.vvrows.compactmode > .urow > .ugoals{grid-column:4;grid-row:1/3;align-self:center;text-align:center;font-size:12px;color:var(--row-muted)}
  .vvrows.vvrows.compactmode > .urow > .uassists{grid-column:5;grid-row:1/3;align-self:center;text-align:center;font-size:12px;color:var(--row-muted)}
  .vvrows.vvrows.compactmode > .urow > .ugoals span, .vvrows.vvrows.compactmode > .urow > .uassists span{display:none}
  .vvrows.vvrows.compactmode > .urow > .utags{display:none}
  .vvrows.vvrows.compactmode .uage{display:block;margin:1px 0 0;font-size:10px;opacity:.6}
  .vvrows.vvrows.compactmode .uage::before{content:none}
  .vvrows.vvrows.pillmode .uage{margin-left:9px}
  .vvrows.vvrows.pillmode .uage::before{left:-7px}
  .vvrows.vvrows.compactmode > .urow > .rmini{grid-column:6;grid-row:1/3;align-self:center;justify-self:end;margin:0;width:38px;height:42px}
}

.vvrows-season .urow{display:grid;grid-template-columns:minmax(0,1fr) 44px;column-gap:11px;align-items:center;padding:10px 13px;cursor:pointer;transition:background .14s}
.vvrows-season .urow+.urow{border-top:1px solid rgba(255,255,255,0.06)}
body.light .vvrows-season .urow+.urow{border-color:rgba(0,0,0,0.055)}
.vvrows-season .urow:hover{background:rgba(255,255,255,0.045)}
body.light .vvrows-season .urow:hover{background:rgba(0,0,0,0.025)}
.vvrows-season .urow.active{background:rgba(255,92,122,0.09)}
.vvrows-season .srmain{min-width:0}
.vvrows-season .sryear{font-family:'Bricolage Grotesque';font-weight:800;font-size:18px;letter-spacing:-.01em;line-height:1.05;color:var(--cream);font-variant-numeric:tabular-nums}
body.light .vvrows-season .sryear{color:var(--charcoal)}
.vvrows-season .urow.active .sryear{color:var(--pink-ink)}
.vvrows-season .srsub{margin-top:3px;font-family:'Archivo';font-weight:700;font-size:12px;color:rgba(243,237,224,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.light .vvrows-season .srsub{color:var(--ink-soft)}
.vvrows-season .srtags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.vvrows-season .rmini{align-self:center;justify-self:end;display:flex;flex-direction:column;align-items:center;justify-content:center;width:42px;height:48px;border-radius:11px;gap:1px;background:linear-gradient(155deg,#F7F2E6,#EDE6D4);border:1px solid rgba(0,0,0,.12);box-shadow:0 5px 14px -6px rgba(0,0,0,.4)}
.vvrows-season .rmvv{font-family:'Bricolage Grotesque';font-weight:800;font-size:10px;line-height:1}
.vvrows-season .rmvv .a{color:#1C1B1A}
.vvrows-season .rmvv .b{color:var(--pink)}
.vvrows-season .rmn{font-family:'Bricolage Grotesque';font-weight:800;font-size:18px;line-height:1;color:#1C1B1A}
.vvrows-season .rmini.elite{background:linear-gradient(155deg,#F3DA88,#DC9E2C);border-color:rgba(120,80,10,.4)}
.vvrows-season .rmini.elite .a, .vvrows-season .rmini.elite .rmn{color:#2a1d03}
.vvrows-season .rmini.gen{background:linear-gradient(155deg,#2c2926,#121010);border:1px solid rgba(232,184,75,.5)}
.vvrows-season .rmini.gen .a, .vvrows-season .rmini.gen .rmn{color:#fff}
.vvrows-season .rtag{position:relative;white-space:nowrap;font-family:'Archivo';font-weight:700;font-size:9px;letter-spacing:.04em;text-transform:uppercase;padding:2.5px 8px;border-radius:999px;border:1px solid}
.vvrows-season .rtag.gold{background:linear-gradient(90deg,#F0D27A,#E0A93A);border-color:transparent;color:#5a4410}
.vvrows-season .rtag.gen{background:#1C1B1A;border-color:rgba(232,184,75,.6);color:#F0EAD9}
.vvrows-season .rtag-prestige-gen{background:#1C1B1A;border-color:rgba(232,184,75,.6);color:#F3DA88;font-weight:800}
.vvrows-season .rtag-prestige-ico{background:linear-gradient(90deg,#F3DA88,#E8B84B);border-color:transparent;color:#16120e;font-weight:800}
.vvrows-season .rtag-att{background:linear-gradient(90deg,#FF7A5C,#E70443);border-color:transparent;color:#fff}
.vvrows-season .rtag-mid{background:linear-gradient(90deg,#3FBF7F,#2FA968);border-color:transparent;color:#fff}
.vvrows-season .rtag-def{background:linear-gradient(90deg,#5C9DFF,#4A7FE0);border-color:transparent;color:#fff}
.vvrows-season .rtag-age{background:linear-gradient(90deg,#5A5856,#46443F);border-color:transparent;color:#fff}
.vvrows-season .rtag-cross{background:linear-gradient(90deg,#5A5856,#46443F);border-color:transparent;color:#fff}
`;
  function vvInjectRowCSS(){
    if (typeof document === 'undefined') return;
    if (document.getElementById('vv-row-css')) return;          // idempotent
    var st = document.createElement('style');
    st.id = 'vv-row-css';
    st.textContent = VV_ROW_CSS;
    var h = document.head || document.documentElement;
    h.insertBefore(st, h.firstChild);
  }
  vvInjectRowCSS();


  // ── OPT-IN GUARD , make the one failure this refactor cannot prevent LOUD ──────────
  //  The namespace above is opt-in, so a container that renders rows WITHOUT .vvrows or
  //  .vvrows-season gets no row CSS. That failure is invisible: the renderer works, the
  //  rows are simply unstyled, nothing throws, and the page looks merely ugly rather
  //  than broken. It is the exact bug the move was made to end (the compare picker's
  //  804px rows), so leaving the new form of it silent would repeat the mistake.
  //
  //  DELIBERATELY NOT A MutationObserver. One would fire on every DOM mutation for the
  //  life of the page, and card.html mutates constantly (flips, panels, season swaps).
  //  Instead rankRowHTML queues ONE deferred check per render batch, and the first batch
  //  that actually lands rows in the document settles it for good. Cost after that is a
  //  single boolean test per row.
  //
  //  The timeout is what makes it work: rankRowHTML returns a STRING, so at call time
  //  nothing is in the DOM yet. Every call site assigns innerHTML synchronously, so by
  //  the next task the rows are live and closest() can answer. Rows built into a
  //  detached container simply never appear and never warn, which is the right silence.
  var _rowAudit = { done:false, queued:false };
  function vvQueueRowAudit(){
    if (_rowAudit.done || _rowAudit.queued) return;
    if (typeof document === 'undefined') return;
    _rowAudit.queued = true;
    setTimeout(function(){
      _rowAudit.queued = false;
      var rows = document.getElementsByClassName('urow');
      if (!rows.length) return;                 // nothing landed yet; a later batch re-queues
      _rowAudit.done = true;                    // ONCE PER SURFACE, never once per row
      for (var i=0; i<rows.length; i++){
        var r = rows[i];
        if (r.closest && !r.closest('.vvrows,.vvrows-season')){
          console.warn('[VVonderXI] Shared row CSS is NOT applied. rankRowHTML rendered '
            + 'into a container with no .vvrows / .vvrows-season ancestor, so these rows '
            + 'are UNSTYLED (display:block instead of grid, .rmini full-width and '
            + 'transparent). Nothing throws , the renderer works, only the styling is '
            + 'missing. Fix: add class "vvrows" to a list/grid container, or '
            + '"vvrows-season" to a season-fold container. Offending container:', r.parentNode);
          return;                               // one warning is the signal; do not spam
        }
      }
    }, 0);
  }

  function rankRowHTML(d,i,opts){
    vvQueueRowAudit();                          // cheap: one deferred check per batch, then never again
    if (typeof opts === 'number') opts = { cap: opts };   // back-compat: 3rd arg was `cap`
    opts = opts || {};
    var cap = (opts.cap!=null) ? opts.cap : 3;
    var showRank = (opts.showRank !== false);             // default: show the rank cell (rankings)
    var active = opts.active ? ' active' : '';
    var tier = d.prestige==='Generational' ? ' gen' : (d.prestige==='Iconic' ? ' elite' : '');
    // #20: cap TOTAL row tags by PRIORITY , honours (tier) -> prestige -> profile; silent (full set on the card).
    var honList = (d.honours && d.honours.all) ? d.honours.all : [];
    /* PRESTIGE LEADS AND IS EXEMPT FROM THE CAP. It used to sit THIRD in priority
       (honours -> prestige -> profile) and be rendered only if slots remained, so a card with
       cap-many honours dropped it entirely , on the rt97 top card three honours filled all
       three slots and GENERATIONAL never appeared at all. It is the rarest signal on the row
       (12 Generational, 138 Iconic), so it now renders first and unconditionally.
       renderPrestige returns '' for everything else, so unranked rows are unaffected.
       Consequence, accepted: a prestige row can show cap+1 pills. .utags wraps (d5898d6). */
    var prestige = renderPrestige(d.prestige, { baseClass:'rtag', mark:true });
    var honN = Math.min(honList.length, cap);
    var honHtml = honN>0 ? renderHonourPillsCompact(d.honours, { baseClass:'rtag', max:honN, mark:true }) : '';
    var rem = cap - honN;
    var tags = (rem>0) ? renderTagPills(d.tags, { baseClass:'rtag', max:rem, mark:true }) : '';
    var assists  = (d.assists!=null) ? d.assistsText+'<span>A</span>' : 'NR';
    var click = opts.onClick ? opts.onClick(d,i) : ('goCard('+(d.card_id==null?'':d.card_id)+')');
    // ── Season-led variant (card view-all-seasons + Compare per-slot). One player,
    //    so the YEAR leads (not the name); club/pos/age/G/A collapse into one
    //    ellipsizing sub-line; tags wrap; same .rmini VV badge + same rtag pills as
    //    rankings. Fits the narrow (240-330px) season containers. ──
    if (opts.seasonLed){
      var sub = [ d.clubname, posDisplay(d.pos),
                  (d.age!=null && d.age!=='') ? 'Age '+d.age : '',
                  (d.goals!=null ? d.goals+'G' : ''),
                  (d.assists!=null ? d.assists+'A' : 'NR') ]
                .filter(function(x){ return x!=null && x!==''; }).join(' · ');
      var srtags = prestige+honHtml+tags;   // prestige FIRST
      return '<div class="urow seasonled'+tier+active+'" onclick="'+click+'">'
        +'<div class="srmain">'
          +'<div class="sryear">'+d.year+'</div>'
          +'<div class="srsub">'+sub+'</div>'
          +(srtags ? '<div class="srtags">'+srtags+'</div>' : '')
        +'</div>'
        +'<div class="rmini'+tier+'"><span class="rmvv"><span class="a">V</span><span class="b">V</span></span><span class="rmn">'+d.vv+'</span></div>'
      +'</div>';
    }
    return '<div class="urow'+tier+active+'" onclick="'+click+'">'
      +(showRank ? '<div class="urank">'+(i+1)+'</div>' : '')
      +'<div class="uident"><span class="uflag">'+(d.flag||'')+'</span>'+rowShieldHTML(d,i)+'<span class="uname">'+d.surname+'</span></div>'
      +'<div class="uyear">'+d.year+'</div>'
      +'<div class="uclub">'+d.clubname+'</div>'
      /* AGE lives INSIDE .upos , deliberately not a tenth column. The desktop grid
         is nine fixed tracks and .utags already sits close to its content width, so
         a new track would squeeze the tags. Sequence reads year, club, POS, Age NN,
         matching card.html's meta line and Cards mode ("Barcelona · ST · 24").
         d.age is '' when both season_age and age are null (4 of 57,234 cards) , the
         field is then OMITTED ENTIRELY rather than printing "Age NR" in a dense row.
         Same guard the seasonled branch above already uses. */
      +'<div class="upos">'+posDisplay(d.pos)
        +((d.age!=null && d.age!=='') ? '<span class="uage">'+d.age+'</span>' : '')
      +'</div>'
      +'<div class="utags">'+prestige+honHtml+tags+'</div>'   // prestige FIRST (matches .srtags)
      +'<div class="ugoals">'+d.goals+'<span>G</span></div>'
      +'<div class="uassists">'+assists+'</div>'
      +'<div class="rmini'+tier+'"><span class="rmvv"><span class="a">V</span><span class="b">V</span></span><span class="rmn">'+d.vv+'</span></div>'
    +'</div>';
  }

  // ── Card flip (#109) , shared 360deg reveal-through-back for Compare + Master.
  //    ONE continuous rotateY(0->360): front .vvcard 0-90, VV monogram back through
  //    90-270, front again 270-360. swap:true replaces the front content at the
  //    back-facing midpoint (~180deg, hidden) so the flip LANDS on the new card;
  //    swap:false returns to the same card (Master admire tap). The host rests as a
  //    plain .vvcard before + after (structure is wrapped only for the flip, then
  //    unwrapped), so all existing DOM contracts (host.firstElementChild, .yr,
  //    vvSizeCards) hold. opts: {swap, newHTML, cw, duration, onDone}. ──
  // Coin/back tier from the card's PRESTIGE , the identical field buildCard uses to
  // colour the FRONT (Generational->black card, Iconic->gold card, else cream). Tying
  // the coin to prestige (not a VV cut) guarantees coin colour == card colour at every
  // boundary. monogram 1st V = tier-ink, 2nd V always pink; gold/black carry the gold edge.
  function vvFlipTier(prestige){ return prestige==='Generational' ? 'black' : (prestige==='Iconic' ? 'gold' : 'cream'); }
  function vvBackFace(tier){
    tier = (tier==='black'||tier==='gold') ? tier : 'cream';
    return '<div class="vvmono vvmono-'+tier+'"><div class="vvmonomark">V<span>V</span></div></div>';
  }
  function vvCardFlip(host, opts){
    if(!host) return;
    opts = opts || {};
    var dur = opts.duration || 800;
    var swap = !!opts.swap;
    var newHTML = opts.newHTML || null;
    var cw = opts.cw;
    var tier = vvFlipTier(opts.prestige);                  // coin tier from the card's prestige (same source as the front colour)
    var startFront = host.innerHTML;                       // current plain .vvcard (resting state)
    var finalHTML = (swap && newHTML) ? newHTML : startFront;
    if(host._flipping){ host.innerHTML = finalHTML; if(opts.onDone) opts.onDone(); return; }  // guard re-entry
    host._flipping = true;

    // ── MOBILE (<=720px): scale-swap through the VV coin. NO 3D (rotateY/perspective/
    //    preserve-3d/backface all flatten unreliably on iOS) , pure transform:scale +
    //    opacity. Card shrinks to the tier VV coin, swaps under it, reopens as the new
    //    card. Front stays in-flow (no collapse). Same tier logic as the desktop flip. ──
    if (typeof window !== 'undefined' && window.innerWidth <= 720){
      var mh = 540;                                        // each phase ~0.54s -> ~1.1s total
      host.innerHTML = '<div class="vvscalewrap"'+(cw?' style="--cw:'+cw+'px"':'')+'>'
        + '<div class="vvscalefront">'+startFront+'</div>'
        + '<div class="vvscalecover">'+vvBackFace(tier)+'</div></div>';
      var swrap = host.querySelector('.vvscalewrap'), sfront = host.querySelector('.vvscalefront'), scover = host.querySelector('.vvscalecover');
      if(!swrap){ host._flipping=false; host.innerHTML=finalHTML; if(opts.onDone) opts.onDone(); return; }
      swrap.style.transition='none'; swrap.style.transform='scale(1)';
      scover.style.transition='none'; scover.style.opacity='0';
      void swrap.offsetWidth;                              // commit base
      swrap.style.transition='transform '+mh+'ms cubic-bezier(.5,0,.5,1)';
      scover.style.transition='opacity '+mh+'ms ease';
      swrap.style.transform='scale(.8)'; scover.style.opacity='1';   // collapse to the brand
      setTimeout(function(){                               // at the smallest point: swap under the opaque coin, then reopen
        if(swap && newHTML && sfront) sfront.innerHTML = newHTML;
        swrap.style.transform='scale(1)'; scover.style.opacity='0';
      }, mh);
      setTimeout(function(){
        host.innerHTML = finalHTML; host._flipping = false;
        if(opts.onDone) opts.onDone();
      }, mh*2 + 40);
      return;
    }

    // ── DESKTOP (>720px): 3D reveal-through-back flip (unchanged) ──
    host.innerHTML = '<div class="vvflipwrap"'+(cw?' style="--cw:'+cw+'px"':'')+'>'
      + '<div class="vvflipinner"><div class="vvflipfront">'+startFront+'</div>'
      + '<div class="vvflipback">'+vvBackFace(tier)+'</div></div>'
      + '<div class="vvsheen"><i></i></div></div>';       // glossy sweep overlay (Option A)
    var inner = host.querySelector('.vvflipinner'), front = host.querySelector('.vvflipfront'), sheen = host.querySelector('.vvsheen');
    if(!inner){ host._flipping=false; host.innerHTML=finalHTML; if(opts.onDone) opts.onDone(); return; }
    inner.style.transition='none'; inner.style.transform='rotateY(0deg)';
    void inner.offsetWidth;                                // commit the 0deg base
    inner.style.transition='transform '+dur+'ms cubic-bezier(.5,0,.5,1)';
    inner.style.transform='rotateY(360deg)';              // one weighted motion
    if(sheen){ void sheen.offsetWidth; sheen.classList.add('go'); }   // light sweeps across as it turns
    if(swap && newHTML){                                  // swap at the hidden back-facing midpoint
      setTimeout(function(){ if(front) front.innerHTML = newHTML; }, Math.round(dur/2));
    }
    setTimeout(function(){                                // land + normalize base (unwrap to plain .vvcard)
      host.innerHTML = finalHTML;
      host._flipping = false;
      if(opts.onDone) opts.onDone();
    }, dur + 30);
  }

  /* ════════════════════════════════════════════════════════════════════
   *  FILTER TAXONOMY , SINGLE SOURCE OF TRUTH for the filter/picker chips.
   *  rankings + compare both render their chips from here via renderFilterChips
   *  so the two UIs CANNOT drift from the engine vocabulary again.
   *   - profile[].items[].v MUST equal a TAG_DEFS key (verified in test).
   *   - prestige mirrors the two prestige badges; honours mirror HONOUR_META
   *     types (honour filtering is DEFERRED , rendered visibly "soon");
   *     position mirrors the locked 8-bucket position_pool.
   * ════════════════════════════════════════════════════════════════════ */
  const FILTER_TAXONOMY = {
    prestige: [
      { v:'Generational', l:'Generational', e:'👑' },
      { v:'Iconic',       l:'Iconic',       e:'🏅' },
    ],
    // DEFERRED (Option C , needs honour flags on the matview). Rendered "soon", inert.
    honours: [
      { v:'ballon_dor',       l:"Ballon d'Or",          e:'🥇' },
      { v:'world_cup_winner', l:'World Cup Winner',      e:'🌍' },
      { v:'ucl_winner',       l:'UCL Winner',            e:'⭐' },
      { v:'league_champion',  l:'League Champion',       e:'🏆' },
      { v:'player_of_season', l:'Player of the Season',  e:'🎖️' },
      { v:'golden_boot',      l:'Golden Boot',           e:'👟' },
      { v:'top_assists',      l:'Top Assists',           e:'🅰️' },
    ],
    // ability tags , grouped by getVVTags family. v = the tag name the engine emits.
    profile: [
      { sub:'Attack',       items:[ {v:'Goal Machine',e:'⚽'},{v:'Clinical',e:'🔫'},{v:'Provider',e:'🅰️'},{v:'Poacher',e:'🦊'},{v:'The Winger',e:'🪄'} ] },
      { sub:'Midfield',     items:[ {v:'Playmaker',e:'🧠'},{v:'Maestro',e:'🎩'},{v:'Regista',e:'🎻'},{v:'Engine Room',e:'🧭'},{v:'The Dribbler',e:'✨'} ] },
      { sub:'Defence',      items:[ {v:'The Wall',e:'🧱'},{v:'Destroyer',e:'🦮'},{v:'Ball Hawk',e:'🦅'},{v:'Ball-Playing CB',e:'🦶'} ] },
      { sub:'All-Round',    items:[ {v:'Complete',e:'💎'},{v:'Iron Man',e:'🛡️'} ] },
      { sub:'Career-Stage', items:[ {v:'Wonderkid',e:'🌱'},{v:'The Last Dance',e:'🌅'} ] },
    ],
    position: [ {v:'GK'},{v:'CB'},{v:'FB'},{v:'CDM'},{v:'CM'},{v:'CAM'},{v:'Winger'},{v:'ST'} ],
  };

  // Render chips for one taxonomy group. variant 'rankings'|'compare'; soon => inert + visibly deferred.
  //  rankings tag chips carry data-tag (readFilters reads it); prestige/position use text (readFilters
  //  matches textContent). compare chips carry onclick=pkSetFilter(this,kind,value); soon chips have none.
  function renderFilterChips(groupKey, opts){
    opts = opts || {};
    var variant = opts.variant || 'rankings';
    var soon = !!opts.soon;
    var esc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };
    function chip(kind, value, label, emoji, gold){
      var lab = (emoji ? emoji + ' ' : '') + label;
      if(variant === 'compare'){
        var cc = 'pkchip' + (soon ? ' pksoon' : '');
        var oc = soon ? '' : ' onclick="pkSetFilter(this,\'' + kind + '\',\'' + esc(value) + '\')"';
        return '<span class="' + cc + '"' + oc + '>' + lab + (soon ? ' <em class="pksoonlbl">soon</em>' : '') + '</span>';
      }
      var rc = 'fopt' + (gold ? ' gold' : '') + (soon ? ' disabled' : '');
      var dt = (kind === 'tag') ? ' data-tag="' + esc(value) + '"' : '';
      return '<span class="' + rc + '"' + dt + '>' + lab + '</span>';
    }
    if(groupKey === 'prestige') return FILTER_TAXONOMY.prestige.map(function(it){ return chip('prestige', it.v, it.l, it.e, true); }).join('');
    if(groupKey === 'honours')  return FILTER_TAXONOMY.honours.map(function(it){ return chip('honour', it.v, it.l, it.e, false); }).join('');
    if(groupKey === 'position') return FILTER_TAXONOMY.position.map(function(it){ return chip('pos', it.v, (it.l||it.v), (it.e||''), false); }).join('');
    if(groupKey === 'profile'){
      if(opts.flat){   // compare picker: flat list, no subheaders
        return FILTER_TAXONOMY.profile.map(function(g){ return g.items.map(function(it){ return chip('tag', it.v, (it.l||it.v), it.e, false); }).join(''); }).join('');
      }               // rankings: return [{sub, html}] so caller adds .subgl headers
      return FILTER_TAXONOMY.profile.map(function(g){
        return { sub:g.sub, html: g.items.map(function(it){ return chip('tag', it.v, (it.l||it.v), it.e, false); }).join('') };
      });
    }
    return '';
  }

  /* ════════════════════════════════════════════════════════════════════
   *  VERDICT_TAGS , the 14-tag Compare verdict vocabulary (single source).
   *   - 6 LADDER tags: deterministic by |rt gap| (guarantee tone matches gap).
   *   - 5 CONTEXT tags: AI-selected (judgment, no numeric trigger).
   *   - 3 AGE tags: deterministic by season_age + rt gap (no missed wonderkid).
   *  Priority when several fit: CONTEXT > AGE > LADDER (most characterful wins).
   *  verdictContext(A,B) computes the deterministic scaffold; the AI writes prose
   *  and may up-rank to a context tag it judges clearly applies.
   * ════════════════════════════════════════════════════════════════════ */
  const VERDICT_TAGS = {
    // gap ladder (deterministic)
    masterclass:      { name:'A Masterclass',                 emoji:'🏅', kind:'ladder', blurb:'One card so far ahead it stops being a contest and becomes a demonstration.', drury:'This was not a comparison. It was a lesson. One season stood and the other could only watch, and there is no shame in that.', trigger:'rt gap >= 10' },
    bragging_rights:  { name:'Bragging Rights Settled',       emoji:'🏆', kind:'ladder', blurb:'A clear, shareable result. The kind you send to the group chat.', drury:'Screenshot it. Send it. Let it speak for itself. Some verdicts are made to be shared, and this is one of them.', trigger:'rt gap 7-9' },
    clear_edge:       { name:'A Clear Edge',                  emoji:'⚖️', kind:'ladder', blurb:'The margin is real but not huge: one season clearly shades the other.', drury:'Not a landslide. Not a rout. But when you weigh the two, the scales tip, and they tip with conviction.', trigger:'rt gap 4-6' },
    photo_finish:     { name:'Photo Finish',                  emoji:'📸', kind:'ladder', blurb:'Near-identical scores, but one nicks it at the line.', drury:'They crossed the line together, or so it seemed. Only the closest look could tell them apart. And by a fraction, one was first.', trigger:'rt gap 2-3' },
    var_close:        { name:'VAR close call',               emoji:'📺', kind:'ladder', blurb:'Close enough to send it to the screen. Settled by the finest of margins.', drury:'A breath. A heartbeat. The width of a coat of paint. To separate these two feels almost unkind, and yet a verdict must be given.', trigger:'rt gap 1' },
    the_debate:       { name:'The Debate Lives On',          emoji:'🔥', kind:'ladder', blurb:"So close it won't end the argument. Fuel for the next conversation.", drury:'There will be no peace tonight. The numbers have spoken, and still the argument burns. Some debates were never meant to end.', trigger:'rt gap 0 (true tie, no age tiebreak)' },
    // contextual (AI-selected)
    different_worlds: { name:'Different Worlds',              emoji:'🌍', kind:'context', blurb:'They win on totally different things, a creator against a finisher. Both elite, in their own lane.', drury:'One paints, the other scores. One builds the cathedral, the other places the final stone. They are different answers to the same beautiful question.', trigger:'close gap + both elite + divergent radar peaks' },
    across_eras:      { name:'Class Across Eras',            emoji:'🕰️', kind:'context', blurb:'A cross-generation matchup where both players transcend their time.', drury:'Years apart, yet cut from the same cloth. Greatness does not belong to a decade. It echoes across them, and here, two echoes meet.', trigger:'season-year gap >= 8 + both elite' },
    league_tips:      { name:'League Strength Tips It',       emoji:'🌐', kind:'context', blurb:'Genuinely close on output, but the stronger league or era decides it.', drury:'On paper, almost nothing between them. But football is not played on paper. One did it against the very best, week after week.', trigger:'close output + different league strength' },
    eye_test:         { name:'The Eye Test Deceives',        emoji:'👁️', kind:'context', blurb:'The numbers disagree with the gut. One looks better; the other scores higher.', drury:'Your eyes told you one thing. The data, quietly, tells you another. Sometimes the truth hides in the spaces the highlight reel forgets.', trigger:'fewer-goals player has the higher rt' },
    complete_spec:    { name:'Complete Package vs Specialist',emoji:'🧩', kind:'context', blurb:'One balanced across every dimension, the other a peak in a single craft.', drury:'One could do everything. The other did one thing better than anyone alive. Is it better to be complete, or to be unforgettable?', trigger:'close gap + one even radar, one spiky' },
    // age (deterministic , approved 2026-07-17)
    prodigy:          { name:"The Prodigy's Edge",           emoji:'🌟', kind:'age', blurb:'A young season stands with or above an established one, and doing it this early is the rarer feat.', drury:'To command this stage at nineteen, the years ahead should frighten us all.', trigger:'rt gap <= 3 AND younger <= 21 AND >= 4 years younger' },
    ascendant:        { name:'The Ascendant',                emoji:'📈', kind:'age', blurb:'A near-tie where the younger player is still climbing, the finished portrait against the one still being painted.', drury:'One is the finished portrait; the other still being painted, and already this good.', trigger:'rt gap <= 2 AND >= 5-year gap favouring youth AND younger > 21' },
    twilight:         { name:'Twilight Brilliance',          emoji:'🌅', kind:'age', blurb:'A veteran matches a prime player; age has not dimmed him.', drury:'They said the legs would fade. The refusal does not fade.', trigger:'rt gap <= 3 AND older >= 33 AND >= 5 years older' },
  };

  // ── SHARE-ONLY DISPLAY NAMES , A LOOKUP AT THE SHARE LAYER, NOT A SECOND TAG SET ──
  //  The §C names above are LOCKED and are what Compare shows. Three of them break when
  //  lifted OUT of the comparison and dropped into a post, where the sentence is
  //  "The Verdict: {tag}." and nothing else is on screen to carry them:
  //    , 'VAR close call'  is the only lower-cased name in a set of fourteen, so beside
  //      thirteen title-cased siblings it reads as a typo rather than a style.
  //    , 'Complete Package vs Specialist' names the AXIS, not the judgement, and reads as
  //      a category label. In frame the two cards supply the contrast; out of frame nothing does.
  //    , 'League Strength Tips It' ends on a pronoun whose referent is the pair of cards.
  //      Remove the cards and "It" points at nothing.
  //  THE DIVERGENCE IS DELIBERATE. Do not "reconcile" these back , the tag set is a
  //  product vocabulary with its own locked names, and this is presentation for one
  //  surface. Any tag with no entry here shares under its own name, which is the case
  //  for the other eleven.
  const VERDICT_SHARE_NAME = {
    var_close:      'VAR Close Call',
    complete_spec:  'The Complete Player',
    league_tips:    'The League Tips The Balance',
  };
  // key OR name in, share-safe name out. Accepts either so a caller holding the tag
  // object does not have to know its key.
  function verdictShareName(tagOrKey){
    if (!tagOrKey) return '';
    const key = (typeof tagOrKey === 'string') ? tagOrKey : (tagOrKey.key || '');
    if (VERDICT_SHARE_NAME[key]) return VERDICT_SHARE_NAME[key];
    const name = (typeof tagOrKey === 'string') ? tagOrKey : (tagOrKey.name || '');
    for (const k in VERDICT_TAGS) if (VERDICT_TAGS[k].name === name && VERDICT_SHARE_NAME[k]) return VERDICT_SHARE_NAME[k];
    return name || key;
  }

  // Deterministic verdict scaffold from two card objects (rowToCard). The AI writes the
  // prose and may up-rank floorTag -> a contextHint it judges clearly applies (priority CONTEXT>AGE>LADDER).
  function verdictContext(A, B){
    const va = +A.vv || 0, vb = +B.vv || 0, g = Math.abs(va - vb);
    const engineWinner = va > vb ? 'A' : (vb > va ? 'B' : 'tie');
    const ageA = A.season_age != null ? +A.season_age : null;
    const ageB = B.season_age != null ? +B.season_age : null;
    let winner = engineWinner, tipped = false, younger = null, older = null, ageDiff = null;
    if (ageA != null && ageB != null) {
      younger = ageA <= ageB ? 'A' : 'B'; older = ageA <= ageB ? 'B' : 'A'; ageDiff = Math.abs(ageA - ageB);
      if (g <= 2 && ageDiff >= 4) { winner = younger; tipped = true; }   // coin-flip band only; never overrides gap>=3
    }
    const tone = g === 0 ? 'tie' : (g <= 2 ? 'razor' : (g <= 6 ? 'clear' : 'decisive'));
    const ladder = g === 0 ? 'the_debate' : g === 1 ? 'var_close' : g <= 3 ? 'photo_finish' : g <= 6 ? 'clear_edge' : g <= 9 ? 'bragging_rights' : 'masterclass';
    const age = [];
    if (younger) {
      const yAge = younger === 'A' ? ageA : ageB, oAge = older === 'A' ? ageA : ageB;
      if (g <= 3 && yAge <= 21 && ageDiff >= 4) age.push('prodigy');
      if (g <= 2 && ageDiff >= 5 && yAge > 21) age.push('ascendant');
      if (g <= 3 && oAge >= 33 && ageDiff >= 5) age.push('twilight');
    }
    /*  BOTH GUARD ON NR NOW. They read `s[x] || 0`, which turns an UNMEASURED axis into a
        zero , the same defect the radar itself had, one layer up. Unguarded, a card with no
        passing data reports a 'peak dimension' of goalThreat because every other axis
        coerced to 0, and varc reports a huge spread built out of absences. Those two feed
        the 'different_worlds' and 'complete_spec' VERDICT TAGS, so a fabricated zero became
        a published claim about how two players differ.
        They now return null when ANY of the four axes is unmeasured, and the two rules
        below skip rather than guess. A tag not shown is the correct answer when the shape
        it describes was never measured.  */
    const radarUsable = c => { const s = (c && c.radar && c.radar.scaled) || {};
      return ['goalThreat','creation','progression','defensive'].every(x => s[x] != null); };
    const peak = c => { if (!radarUsable(c)) return null; const s = c.radar.scaled;
      const k = ['goalThreat','creation','progression','defensive'];
      let bi = 0, bv = -1; k.forEach((x, i) => { if (s[x] > bv) { bv = s[x]; bi = i; } }); return k[bi]; };
    const varc = c => { if (!radarUsable(c)) return null; const s = c.radar.scaled;
      const a = ['goalThreat','creation','progression','defensive'].map(x => s[x]);
      const m = a.reduce((x, y) => x + y, 0) / 4;
      return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / 4); };
    const ctx = [];
    if (g <= 3 && va >= 80 && vb >= 80 && peak(A) && peak(B) && peak(A) !== peak(B)) ctx.push('different_worlds');
    if (Math.abs((A.season_year || 0) - (B.season_year || 0)) >= 8 && va >= 80 && vb >= 80) ctx.push('across_eras');
    if (((A.goals || 0) > (B.goals || 0) && va < vb) || ((B.goals || 0) > (A.goals || 0) && vb < va)) ctx.push('eye_test');
    if (g <= 3 && varc(A) != null && varc(B) != null && Math.abs(varc(A) - varc(B)) >= 14) ctx.push('complete_spec');
    const floorTag = age[0] || ladder;   // deterministic default (AGE priority 2, else LADDER 3); AI may up-rank to a contextHint
    return { gap: g, engineWinner, winner, tipped, tone, ladder, ageTags: age, contextHints: ctx, floorTag,
      ageA, ageB, younger, older, ageDiff,
      wonderkidA: (ageA != null && ageA <= 21 && va >= 82), wonderkidB: (ageB != null && ageB <= 21 && vb >= 82) };
  }

  // ── Expose ────────────────────────────────────────────────────────────
  // ── SHARED SEARCH , single source for rankings.html + Compare picker (was duplicated in both) ──
  //  vvNorm         : fold accents + lowercase (matches the DB player_name_norm / team_name_norm charset).
  //  tokenAndFilter : PostgREST .or() , cross-column AND: every token in (player_name_norm OR team_name_norm).
  //  rankBySearch   : client-side relevance re-rank (exact>prefix>word-start>mid, then rt).
  //  vvParseSearch  : split a query into { nameQ, seasonYear }. A pure 2- or 4-digit token in the data
  //                   range (2010-2025) is the SEASON , season_year is the STARTING year, so "23" -> 2023
  //                   -> 2023/24; an explicit "23/24" / "2023/24" takes the start year; a year-SHAPED token
  //                   OUT of range is DROPPED (ignored, never treated as name text); the rest is the name/club.
  //  vvSeasonLabel  : season_year -> display form, e.g. 2023 -> "23/24" (via fmtSeason).
  // NFD strips decomposable diacritics (á é ç ñ ü ğ ...); the explicit map folds the
  // NON-decomposable specials (Turkish ı, Nordic ø/æ/ð, Polish ł, Croatian đ) so the client
  // folds IDENTICALLY to the stored player_name_norm (which already folds them) , no drift.
  function vvNorm(s){ return (s==null?'':String(s)).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ı/g,'i').replace(/ø/g,'o').replace(/ł/g,'l').replace(/đ/g,'d').replace(/ð/g,'d').replace(/æ/g,'ae'); }
  // CROSS-COLUMN AND: every token must appear in the player name OR the team name, tokens AND'd.
  // -> "rodri manchester city" = (name~rodri OR team~rodri) AND (name/team~manchester) AND (~city),
  //    so club tokens disambiguate same-name players. Each token's OR-across-columns is a SUPERSET
  //    of name-only, so a mixed name+club query never returns FEWER rows than name-only would ,
  //    the ambiguity fallback ("token is both a club and a name") degrades toward showing something.
  // MULTI-FIELD (2026-08-07). Each token may land in the player name, the DISPLAY name, the club,
  // the position pool or the league , tokens still AND'd, so every token must find a home somewhere
  // in the SAME row. That AND is the over-return guard: "haaland city" = (haaland somewhere) AND
  // (city somewhere), so a City team-mate fails the haaland clause and is excluded. Never OR.
  //
  // WHY player_name IS A SEPARATE BRANCH: player_name_norm is built from COALESCE(full_name, name),
  // i.e. the LEGAL name, so a known-as name is DISCARDED whenever a legal name exists , "Nico
  // Williams" stores "nicholas williams arthuer" and "nico" matches nothing. Measured 2026-08-07:
  // 509 players (3.3%) were unreachable by their own display name, incl. Raphinha, Hulk, Casemiro,
  // Diogo Jota. Adding the raw display column rescues 375 of them (74%) with no migration. The
  // remaining 134 have ACCENTED display names (Nenê, Álex Grimaldo) and ilike does not fold accents;
  // those need player_name_norm rebuilt as full_name || ' ' || name, which forces a matview
  // DROP+CREATE (see §C, the frozen 47-column list). Deliberately deferred.
  //
  // POSITION + LEAGUE MATCH ON EXACT TOKEN EQUALITY, NEVER SUBSTRING. 'st', 'cb' and 'cm' are
  // substrings of hundreds of names, so a substring match here would flood every result set.
  var POS_TOKENS = { gk:'GK', fb:'FB', cb:'CB', cdm:'CDM', cm:'CM', cam:'CAM', winger:'Winger', st:'ST' };
  var LEAGUE_TOKENS = { pl:'PL', premier:'PL', epl:'PL', laliga:'LL', liga:'LL', ll:'LL',
    seriea:'SA', sa:'SA', bundesliga:'BL', bl:'BL', ligue1:'L1', l1:'L1',
    eredivisie:'ERE', ere:'ERE', primeira:'PRT', prt:'PRT', superlig:'TR', tr:'TR', bpl:'BPL' };
  function tokenAndFilter(q){
    var toks=vvNorm(q).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
    if(!toks.length) return null;
    var perTok=toks.map(function(t){
      var br=['player_name_norm.ilike.%'+t+'%','team_name_norm.ilike.%'+t+'%','player_name.ilike.%'+t+'%'];
      if(POS_TOKENS[t])    br.push('position_pool.eq.'+POS_TOKENS[t]);
      if(LEAGUE_TOKENS[t]) br.push('league_code.eq.'+LEAGUE_TOKENS[t]);
      return 'or('+br.join(',')+')';
    });
    return perTok.length>1 ? 'and('+perTok.join(',')+')' : perTok[0];
  }
  // Does this token address a position/league rather than a name? The compare client-side
  // re-filter needs this so it does not strip rows the server matched on those fields.
  function searchFieldToken(t){ return POS_TOKENS[t] || LEAGUE_TOKENS[t] || null; }
  // SPECIFICITY , match-count, NOT token-count. Measured 2026-08-07: "williams" is 1 token but
  // 34 matches, "city" is 1 token but 590, so token-count cannot tell them apart. If the whole
  // result set fits under the ceiling it IS the answer , show all of it. The ceiling doubles as
  // the threshold AND the cap, so "uncapped" never means unbounded.
  var SEARCH_CEIL = 300;
  // ── Search RELEVANCE re-rank (client-side; shared by rankings + compare) ──
  //    Surfaces the obvious player: exact > prefix > word-start > mid-string, THEN rt.
  //    Accent-folded (via vvNorm) so it covers the whole diacritic class, not one name.
  //    Known-as/nickname value (Rodri -> "rodrigo hernandez cascante") is DEFERRED (nickname item);
  //    the ranking SURFACES him high, known-as later makes him first.
  function _mnorm(s){ return vvNorm(s).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
  function searchTier(nameStr, toks){
    if(!toks || !toks.length) return 6;
    var hay=_mnorm(nameStr), best=6;
    for(var i=0;i<toks.length;i++){ var t=toks[i], r;
      if(hay===t) r=0;                                   // exact whole-name
      else if(hay.indexOf(t)===0) r=1;                   // name starts with token (prefix)
      else if((' '+hay+' ').indexOf(' '+t+' ')>=0) r=2;  // token IS a complete word (exact surname beats surname-prefix)
      else if((' '+hay).indexOf(' '+t)>=0) r=3;          // a word starts with token
      else if(hay.indexOf(t)>=0) r=4;                    // mid-string
      else r=6;                                          // no NAME hit (matched via team/club token)
      if(r<best) best=r;
    }
    return best;
  }
  // rows sorted by (match tier asc, rt/vv desc, stable). getName(row)->the name haystack to score.
  function rankBySearch(rows, nameQ, getName){
    if(!Array.isArray(rows)) return rows;
    var toks=_mnorm(nameQ).split(' ').filter(Boolean);
    if(!toks.length) return rows;
    return rows.map(function(r,i){ var nm=getName?getName(r):((r.player_name||'')+' '+(r.player_name_norm||''));
        var sc=(r.rt!=null?+r.rt:(r.vv!=null?+r.vv:-1));
        return { r:r, i:i, t:searchTier(nm,toks), sc:isNaN(sc)?-1:sc }; })
      .sort(function(a,b){ return (a.t-b.t) || (b.sc-a.sc) || (a.i-b.i); })
      .map(function(x){ return x.r; });
  }
  function vvYearFromDigits(d){
    if(!/^\d{2}$|^\d{4}$/.test(d)) return null;              // only 2- or 4-digit tokens are year-shaped
    var n=parseInt(d,10); if(d.length===2) n=2000+n;        // "23" -> 2023
    return (n>=2010 && n<=2025) ? n : null;                 // data range; out-of-range -> null (dropped upstream)
  }
  /* A BARE year means the season ENDING in it , "19" is 2018/19, "22" is 2021/22,
     so season_year (the STARTING year) is one less. This was previously the other
     way round: "23" resolved to 2023, i.e. 2023/24. People say "Messi 19" meaning
     the season that finished in 2019, so the ending year is the natural reading.
     SUPERSEDES the §C line that reads 'a 2- or 4-digit token ... season_year = the
     STARTING year: "23"->2023->2023/24'.
     The SPLIT form is untouched and must stay that way: "18/19" and "2018/19"
     already yield 2018 through vvYearFromDigits on the FIRST half, which is
     already the starting year. Subtracting inside vvYearFromDigits would have
     broken that, so the adjustment lives here at the bare-token call site only. */
  function vvSeasonFromBareYear(d){
    var y=vvYearFromDigits(d);
    if(y==null) return null;
    var s=y-1;                                  // ending year -> starting year
    return (s>=2010 && s<=2025) ? s : null;     // "10" -> 2009, outside the data, dropped
  }
  function vvParseSearch(q){
    var raw=(q==null?'':String(q)).trim();
    if(!raw) return { nameQ:'', seasonYear:null };
    var seasonYear=null;
    // explicit "23/24" or "2023/24" -> start year, matched BEFORE '/' is stripped by norm
    var pair=raw.match(/(?:^|\s)(\d{4}|\d{2})\/\d{2}(?=\s|$)/);
    if(pair){ var py=vvYearFromDigits(pair[1]); if(py!=null){ seasonYear=py; raw=raw.replace(pair[0],' '); } }
    var toks=vvNorm(raw).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
    var nameToks=[];
    toks.forEach(function(t){
      if(/^\d{2}$|^\d{4}$/.test(t)){                        // year-SHAPED: consume as season or drop, NEVER name text
        var y=vvSeasonFromBareYear(t);
        if(y!=null && seasonYear==null) seasonYear=y;
        return;
      }
      nameToks.push(t);
    });
    return { nameQ: nameToks.join(' '), seasonYear: seasonYear };
  }
  function vvSeasonLabel(y){ return (y==null) ? '' : fmtSeason(String(y).slice(2)+String(y+1).slice(2)); }


  /* ==========================================================================
     VVFilters , the shared filter component (added 2026-08-12, filter stage S1)
     ==========================================================================
     SHIPS UNUSED. rankings.html / card.html / compare.html are untouched this
     session; surfaces adopt it one at a time. Nothing below runs unless a page
     calls VVFilters.mount().

     FOUNDING RULE , EVERY CHIP CARRIES ITS VALUE IN data-vvf-value.
     State is NEVER read from rendered label text. The old rankings readFilters
     matched x.textContent.indexOf('Premier League') / 'Generational' / 'Goals'
     / '2020s', so a label edit, an added emoji or the EN/NL/FR toggle silently
     changed the QUERY. readState() below only ever reads data-* attributes.

     WHERE EACH GROUP RUNS IS DECLARED, NOT IMPLIED. Profile / Career-Stage /
     Trajectory are computed by getVVTags and do not exist as columns, so they
     CANNOT go to PostgREST , they run as a client predicate after the fetch.
     Everything else is a real column and runs server-side. group.where says
     which, and applyServer()/clientPredicate() each handle only their own half.
     The caller must run BOTH.

     PRESTIGE IS SEPARATE FROM THE SCORE SLIDER, deliberately. rankings did
     f.rtLo = Math.max(f.rtLo, floor), so Prestige mutated the slider's state.
     That cannot survive multi-select bands: "Elite 90-94" + "Standout 80-84" is
     a DISJOINT union and no single lo/hi pair expresses it. Each group now emits
     its own constraint and they AND together, per OR-within / AND-across.

     NO NUMBER IS HARDCODED. Band edges are derived by scanning bandFor(), and
     prestige floors by scanning prestigeFor(bandFor()), exactly as rankings now
     does. A recut in bandFor moves every threshold here automatically. */

  // ---- band edges, derived ------------------------------------------------
  // Scans bandFor across the scale and returns ordered {band, lo, hi} runs.
  function bandRanges(){
    var out=[], cur=null;
    for(var r=0;r<=100;r++){
      var b=bandFor(r);
      if(!cur || cur.band!==b){ if(cur) out.push(cur); cur={band:b, lo:r, hi:r}; }
      else cur.hi=r;
    }
    if(cur) out.push(cur);
    return out.reverse();                       // highest band first
  }
  function bandRange(name){
    var all=bandRanges();
    for(var i=0;i<all.length;i++) if(all[i].band===name) return all[i];
    return null;
  }
  function rtFloorForPrestige(p){
    for(var r=0;r<=100;r++){ if(prestigeFor(bandFor(r))===p) return r; }
    return null;
  }
  /* PUBLIC BAND LABELS are display renames, not engine names (CLAUDE.md §C:
     engine "Exceptional" ships as "Standout"). Only the LABEL is mapped here ,
     the edges still come from bandFor. */
  var VVF_BAND_LABEL = { Exceptional:'Standout', Elite:'Iconic' };
  function bandPresets(){
    var wanted=['Generational','Elite','World Class','Exceptional'];
    var out=wanted.map(function(n){
      var r=bandRange(n); if(!r) return null;
      var top=(n==='Generational');
      return { v:n, l:(VVF_BAND_LABEL[n]||n), lo:r.lo, hi:(top?null:r.hi),
               hint: top ? (r.lo+'+') : (r.lo+'-'+r.hi) };
    }).filter(Boolean);
    var lowest=bandRange('Exceptional');
    // Label is '≤79', replacing the longer '79 and under'.
    // IT IS ≤ AND NOT <, AND THAT IS NOT A STYLE CHOICE: the band is 0 to 79 INCLUSIVE, so
    // '<79' would exclude 79 itself and state the band wrongly on a public surface. If a
    // shorter form is ever wanted, '<80' is the other correct one. Never '<79'.
    // All three surfaces showing this band (this computed chip, playbook's band pill,
    // vvindex's band row) must say the SAME thing , they drifted once, on this exact label.
    // '≤' not a literal ≤ : this string is RENDERED, and an external classic script
    // has no charset of its own, so it inherits the document's. The escape cannot mojibake
    // whatever the server sends. The literals elsewhere in this file are all in comments.
    if(lowest) out.push({ v:'__below', l:'\u2264'+(lowest.lo-1), lo:null, hi:lowest.lo-1,
                          hint:'' });
    return out;
  }

  // ---- group definitions ---------------------------------------------------
  /* Flags are DECORATION. The chip's value is data-vvf-value ('PL'), never the
     label, so adding or changing an emoji cannot touch the query , that is the
     whole point of the rewrite and the reason these are safe to restore. */
  var VVF_LEAGUES=[
    {v:'PL', l:'Premier League',     e:'🇬🇧'},{v:'LL', l:'La Liga',           e:'🇪🇸'},
    {v:'SA', l:'Serie A',            e:'🇮🇹'},{v:'BL', l:'Bundesliga',        e:'🇩🇪'},
    {v:'L1', l:'Ligue 1',            e:'🇫🇷'},{v:'PRT',l:'Primeira Liga',     e:'🇵🇹'},
    {v:'ERE',l:'Eredivisie',         e:'🇳🇱'},{v:'BPL',l:'Jupiler Pro League',e:'🇧🇪'},
    {v:'TR', l:'Süper Lig',          e:'🇹🇷'}
  ];
  var VVF_SORTS=[
    {v:'rt',       l:'VV Score',  col:'rt',          asc:false},
    {v:'goals',    l:'Goals',     col:'goals',       asc:false},
    {v:'assists',  l:'Assists',   col:'assists',     asc:false},
    {v:'ga',       l:'Total G/A', col:'output',      asc:false},
    {v:'recent',   l:'Recent',    col:'season_year', asc:false},
    {v:'az',       l:'A-Z',       col:'player_name', asc:true}
  ];
  // Career-Stage is split OUT of FILTER_TAXONOMY.profile into its own group.
  function profileSubs(exclude){
    return FILTER_TAXONOMY.profile.filter(function(g){
      return exclude ? g.sub!=='Career-Stage' : g.sub==='Career-Stage'; });
  }
  function flatItems(subs){
    return subs.reduce(function(a,g){ return a.concat(g.items.map(function(it){
      return {v:it.v, l:(it.l||it.v), e:it.e}; })); }, []);
  }

  /* ── RANGE SLIDERS , ONE IMPLEMENTATION, TWO INSTANCES ────────────────────
     VV Score and Age are the same control over different columns, so they share
     one renderer, one painter, one reader and one clear. The alternative is a
     second copy of the slider keyed to 'ag', and a copy is how the row CSS came
     to style .rmini twice with different values (§C) , the second copy is the
     one that gets forgotten when the first is fixed.

     BOUNDS ARE MEASURED, NOT ASSUMED. season_age runs 15 (Mokio, Gent 23/24) to
     43 (Hilton, Montpellier 20/21) across 57,058 cards. Both extremes are real
     players, so neither end is junk to clamp away.

     A STALE BOUND IS SAFE IN THE DIRECTION THAT MATTERS, because of the
     ends-mean-no-bound rule below: if a 14-year-old is ever ingested, the slider
     parked at its floor emits NO clause and still returns him. He only disappears
     once a visitor deliberately narrows the range, which is the honest reading of
     the control. That is the same protection that should have been on rankings'
     old floor of 15 against a live min(rt) of 11.

     season_age, NEVER age. `age` is the player's CURRENT age and is identical on
     every one of his season rows , van Dijk reads 34 on a card from 2016 (§C).
     Filtering on it would silently answer a different question. */
  var VVF_RANGES = [
    { role:'rt', group:'score', col:'rt',         lo:0,  hi:100 },
    { role:'ag', group:'age',   col:'season_age', lo:15, hi:43  }
  ];
  function vvfRange(role){ for(var i=0;i<VVF_RANGES.length;i++) if(VVF_RANGES[i].role===role) return VVF_RANGES[i]; return null; }
  function vvfRangeForGroup(gk){ for(var i=0;i<VVF_RANGES.length;i++) if(VVF_RANGES[i].group===gk) return VVF_RANGES[i]; return null; }
  /* The slider markup. data-vvf-role carries the instance, so nothing downstream
     has to know which group it came from. */
  function rangeHTML(r){
    return '<div class="vvf-score">'+
      '<div class="vvf-svals"><span class="vvf-sv" data-vvf-role="'+r.role+'vmin">'+r.lo+'</span>'+
      '<span class="vvf-svdash">to</span>'+
      '<span class="vvf-sv" data-vvf-role="'+r.role+'vmax">'+r.hi+'</span></div>'+
      '<div class="vvf-dual"><div class="vvf-track"></div><div class="vvf-fill" data-vvf-role="'+r.role+'fill"></div>'+
      '<input type="range" data-vvf-role="'+r.role+'min" min="'+r.lo+'" max="'+r.hi+'" value="'+r.lo+'" aria-label="Minimum '+r.group+'">'+
      '<input type="range" data-vvf-role="'+r.role+'max" min="'+r.lo+'" max="'+r.hi+'" value="'+r.hi+'" aria-label="Maximum '+r.group+'"></div></div>';
  }

  var VVF_GROUPS=[
    { key:'sort',     label:'Sort by',      select:'single', where:'server', items:VVF_SORTS },
    { key:'score',    label:'VV Score',     select:'multi',  where:'server', kind:'score' },
    /* AGE sits directly beneath VV Score because it is the same kind of question ,
       a numeric range over a real column , and the two read as a pair. It carries no
       chips: there are no defensible age BANDS the way there are score bands, and
       inventing "Young / Prime / Veteran" would put an editorial judgement into a
       filter rail where every other cut is measured. */
    { key:'age',      label:'Age',          select:'multi',  where:'server', kind:'range' },
    { key:'league',   label:'League',       select:'multi',  where:'server', items:VVF_LEAGUES },
    { key:'position', label:'Position',     select:'multi',  where:'server',
      items:FILTER_TAXONOMY.position.map(function(p){ return {v:p.v,l:(p.l||p.v)}; }) },
    /* PRESTIGE GROUP REMOVED , Generational and Iconic are the same cut the VV
       Score bands already make (Generational 95+, Elite 90-94), so the group
       offered the identical filter twice under two vocabularies and let a user
       select two contradictory versions of one idea. FILTER_TAXONOMY.prestige is
       untouched , the BADGES still render on cards; only the filter group is gone. */
    { key:'profile',  label:'Profile',      select:'multi',  where:'client', subs:true },
    /* Career-Stage reads whatever FILTER_TAXONOMY.profile's 'Career-Stage' sub
       contains , today Wonderkid and The Last Dance, tomorrow whatever ships.
       Nothing here counts or names them, so a new stage tag appears in this
       group automatically once getVVTags emits it and the taxonomy lists it. */
    { key:'stage',    label:'Career-Stage', select:'multi',  where:'client' },
    { key:'trajectory',label:'Trajectory',  select:'multi',  where:'client', items:[],
      note:'wired, empty until Peak / The Standard / Breakout / Renaissance ship' },
    { key:'honours',  label:'Honours',      select:'multi',  where:'inert',
      items:FILTER_TAXONOMY.honours.map(function(h){ return {v:h.v,l:h.l,e:h.e}; }),
      note:'INERT , honours live in the `honours` TABLE, not on player_card_mv, and '+
           'PostgREST cannot filter the matview by a joined table. Needs honour flags '+
           'ON the matview (the DROP + CREATE in matview_rebuild_plan.md) before these '+
           'can do anything. Rendered so the vocabulary is visible; no handler attached.' }
  ];
  function vvfGroup(key){ for(var i=0;i<VVF_GROUPS.length;i++) if(VVF_GROUPS[i].key===key) return VVF_GROUPS[i]; return null; }
  function vvfItems(g){
    if(g.key==='score')   return bandPresets();
    if(g.key==='profile') return flatItems(profileSubs(true));
    if(g.key==='stage')   return flatItems(profileSubs(false));
    return g.items||[];
  }

  // ---- markup --------------------------------------------------------------
  var VVF_ESC=function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  function vvfChip(groupKey, it, opts){
    var inert=!!opts.inert;
    var lab=(it.e?it.e+' ':'')+(it.l||it.v);
    return '<button type="button" class="vvf-chip'+(inert?' vvf-inert':'')+'"'+
      ' data-vvf-group="'+VVF_ESC(groupKey)+'" data-vvf-value="'+VVF_ESC(it.v)+'"'+
      (it.lo!=null?' data-vvf-lo="'+it.lo+'"':'')+(it.hi!=null?' data-vvf-hi="'+it.hi+'"':'')+
      (inert?' disabled aria-disabled="true"':'')+
      ' aria-pressed="false">'+VVF_ESC(lab)+
      (it.hint?' <em class="vvf-hint">'+VVF_ESC(it.hint)+'</em>':'')+
      (inert?' <em class="vvf-soon">soon</em>':'')+'</button>';
  }
  function renderGroup(key){
    var g=vvfGroup(key); if(!g) return '';
    var inert=(g.where==='inert');
    /* A group with nothing to show is HIDDEN, not annotated. Trajectory was
       printing its own build note to users , "wired, empty until Peak / The
       Standard / Breakout / Renaissance ship" , which is a message to the next
       engineer, never to a visitor. Honours is different and stays: it has real
       chips rendered inert with a "soon" marker, which teaches the vocabulary.
       Trajectory has nothing to teach yet, so it costs a heading and a blank row
       and earns nothing. When the tags ship, items appear and the group returns
       on its own , no code change needed. */
    if(!g.subs && key!=='score' && g.kind!=='range' && !vvfItems(g).length) return '';
    var head='<div class="vvf-group" data-vvf-groupkey="'+VVF_ESC(key)+'" data-vvf-where="'+g.where+'"'+
             ' data-vvf-select="'+g.select+'"><div class="vvf-gl">'+VVF_ESC(g.label)+'</div>';
    var body='';
    if(key==='score'){
      /* The previous two-overlaid-thumbs treatment, restored. The flat pair of
         native tracks that replaced it was a regression. BEHAVIOUR is the new one:
         the ends mean NO bound, so dragging to either extreme removes the clause
         rather than clamping at a floor of 15. */
      body+=rangeHTML(vvfRangeForGroup('score'));
      body+='<div class="vvf-chips">'+bandPresets().map(function(it){ return vvfChip(key,it,{}); }).join('')+'</div>';
    } else if(g.kind==='range'){
      body+=rangeHTML(vvfRangeForGroup(key));
    } else if(g.subs){
      body+=profileSubs(true).map(function(sub){
        return '<div class="vvf-sub">'+VVF_ESC(sub.sub)+'</div><div class="vvf-chips">'+
          sub.items.map(function(it){ return vvfChip(key,{v:it.v,l:(it.l||it.v),e:it.e},{}); }).join('')+'</div>';
      }).join('');
    } else {
      var items=vvfItems(g);
      // g.note is DEVELOPER metadata , never rendered. An items-less group is
      // hidden above; this branch only ever runs for a group that has items.
      body+='<div class="vvf-chips">'+items.map(function(it){ return vvfChip(key,it,{inert:inert}); }).join('')+'</div>';
    }
    /* the wrapper is what keeps the group at exactly two children */
    return head+'<div class="vvf-body">'+body+'</div></div>';
  }
  function renderAll(){ return '<div class="vvf">'+VVF_GROUPS.map(function(g){ return renderGroup(g.key); }).join('')+'</div>'; }

  // ---- state ---------------------------------------------------------------
  function emptyState(){
    return { sort:'rt', score:{lo:null,hi:null,bands:[]}, age:{lo:null,hi:null},
             league:[], position:[],
             profile:[], stage:[], trajectory:[], honours:[] };
  }
  /* READS data-* ONLY. Never textContent , that is the whole point of the rewrite. */
  function readState(root){
    root=root||document;
    var st=emptyState();
    var chips=root.querySelectorAll('.vvf-chip.on[data-vvf-group]');
    for(var i=0;i<chips.length;i++){
      var c=chips[i], gk=c.getAttribute('data-vvf-group'), v=c.getAttribute('data-vvf-value');
      var g=vvfGroup(gk); if(!g || g.where==='inert') continue;
      if(gk==='score'){ st.score.bands.push(v); continue; }
      if(g.select==='single'){ st[gk]=v; } else if(st[gk] && st[gk].indexOf(v)<0){ st[gk].push(v); }
    }
    /* "AT THE ENDS" MEANS NO BOUND , never amputate silently. rankings shipped a
       floor of 15 against a live min(rt) of 11 and hid 1,030 cards. Applied to every
       range instance, so Age inherits the protection rather than re-earning it. */
    VVF_RANGES.forEach(function(r){
      var mn=root.querySelector('[data-vvf-role="'+r.role+'min"]'),
          mx=root.querySelector('[data-vvf-role="'+r.role+'max"]');
      if(!mn||!mx) return;
      var lo=+mn.value, hi=+mx.value; if(lo>hi){ var t=lo; lo=hi; hi=t; }
      st[r.group].lo = (lo<=+mn.min) ? null : lo;
      st[r.group].hi = (hi>=+mx.max) ? null : hi;
    });
    return st;
  }
  function isActive(st){
    if(!st) return false;
    if(st.sort && st.sort!=='rt') return true;
    if(st.score && (st.score.lo!=null || st.score.hi!=null || st.score.bands.length)) return true;
    if(st.age && (st.age.lo!=null || st.age.hi!=null)) return true;
    return ['league','position','profile','stage','trajectory']
      .some(function(k){ return (st[k]||[]).length>0; });
  }

  // ---- server half ---------------------------------------------------------
  function vvfRangeOr(ranges){          // [{lo,hi}] -> PostgREST or() string
    return ranges.map(function(r){
      var parts=[];
      if(r.lo!=null) parts.push('rt.gte.'+r.lo);
      if(r.hi!=null) parts.push('rt.lte.'+r.hi);
      return parts.length>1 ? 'and('+parts.join(',')+')' : parts[0];
    }).filter(Boolean).join(',');
  }
  /* Applies ONLY the server-side groups. Returns {query, applied}. The caller
     must ALSO run clientPredicate() , this half cannot see computed tags. */
  function applyServer(query, st, opts){
    opts=opts||{}; var applied=[];
    if(st.league.length){   query=query.in('league_code', st.league);      applied.push('league'); }
    if(st.position.length){ query=query.in('position_pool', st.position);  applied.push('position'); }
    /* NUMERIC RANGES , every instance, server-side, because each is a real column.
       VV Score's slider range and its band presets are SEPARATE constraints that AND.
       A narrowed range drops rows whose column is NULL (119 cards carry no season_age),
       which is unavoidable and correct: an unknown age cannot be inside a range. At the
       ends no clause is emitted at all, so those rows survive until a visitor asks a
       question they cannot answer. */
    VVF_RANGES.forEach(function(r){
      var v=st[r.group]; if(!v) return;
      if(v.lo!=null){ query=query.gte(r.col, v.lo); applied.push(r.group+'.lo'); }
      if(v.hi!=null){ query=query.lte(r.col, v.hi); applied.push(r.group+'.hi'); }
    });
    if(st.score.bands.length){
      var presets=bandPresets(), byV={};
      presets.forEach(function(p){ byV[p.v]=p; });
      var rs=st.score.bands.map(function(v){ return byV[v]; }).filter(Boolean);
      var s=vvfRangeOr(rs); if(s){ query=query.or(s); applied.push('score.bands'); }
    }
    if(!opts.headCount){
      var so=VVF_SORTS.filter(function(x){ return x.v===st.sort; })[0]||VVF_SORTS[0];
      query=query.order(so.col,{ascending:so.asc, nullsFirst:false}); applied.push('sort:'+so.col);
      /* DETERMINISTIC TIEBREAK , WITHOUT THIS THE SORT IS NOT A TOTAL ORDER AND range()
         IS NOT REPRODUCIBLE. Every sort column here is low-cardinality against 57,234
         rows (rt alone puts thousands of cards on the same value), and Postgres is free
         to return tied rows in any order , it will even choose a different plan for a
         different window size.
         MEASURED 2026-08-17, not hypothetical: the SAME rows 0-99 query returned two
         DIFFERENT orders on consecutive calls, and the first 12 rows of a 0-99 window
         did not match the same query asked for rows 0-11.
         THE LIVE BUG THIS FIXES IS IN RANKINGS, and it predates the card sequence that
         exposed it: rankings pages with range() for infinite scroll, so a card could
         appear on two pages, or on none, as the offset advanced. Silent in both
         directions , a duplicate looks like a coincidence and a missing card looks like
         it was filtered.
         card_id is unique, so appending it makes the order total and every window
         reproducible. Nothing a visitor can see changes except that ties stop
         shuffling between fetches. */
      query=query.order('card_id',{ascending:true}); applied.push('sort:card_id(tiebreak)');
    }
    return { query:query, applied:applied };
  }

  // ---- client half ---------------------------------------------------------
  /* Profile / Career-Stage / Trajectory are getVVTags output, not columns.
     OR WITHIN A GROUP, AND ACROSS GROUPS , note this DIFFERS from the rankings
     behaviour it replaces, which AND-ed selected tags together. */
  function clientPredicate(st){
    var groups=['profile','stage','trajectory'].map(function(k){ return st[k]||[]; })
                 .filter(function(a){ return a.length; });
    if(!groups.length) return function(){ return true; };
    return function(card){
      var names=(card&&card.tags)?card.tags.map(function(t){ return t.name; }):[];
      return groups.every(function(sel){ return sel.some(function(v){ return names.indexOf(v)>=0; }); });
    };
  }
  /* labelFor , the ONLY place a value maps to display text. Callers never read
     text to get state; this goes the other way, state -> text. */
  function labelFor(groupKey, value){
    var g=vvfGroup(groupKey); if(!g) return value;
    if(groupKey==='score'){
      var p=bandPresets().filter(function(x){ return x.v===value; })[0];
      return p ? p.l : value;
    }
    var it=vvfItems(g).filter(function(x){ return x.v===value; })[0];
    return it ? (it.l||it.v) : value;
  }
  /* Active-filter chips , one per SELECTION, each removable. This is what makes
     OR-within / AND-across legible: the reader sees every clause spelled out. */
  function renderActive(st){
    if(!st) return '';
    var out=[];
    function add(gk,v,extra){
      out.push('<button type="button" class="vvf-active-chip" data-vvf-remove="'+VVF_ESC(gk)+
        '" data-vvf-value="'+VVF_ESC(v)+'" aria-label="Remove filter '+VVF_ESC(labelFor(gk,v))+'">'+
        '<span class="vvf-ag">'+VVF_ESC(vvfGroup(gk)?vvfGroup(gk).label:gk)+'</span>'+
        VVF_ESC(extra||labelFor(gk,v))+'<span class="vvf-ax" aria-hidden="true">&times;</span></button>');
    }
    (st.score.bands||[]).forEach(function(v){ add('score',v); });
    /* A range reads as one clause, so it gets ONE chip, not a min chip and a max chip.
       The phrasing follows which end is bounded , "80+" and "up to 24" say more than
       "80 to 100" and "15 to 24", which would restate a bound the visitor never set. */
    VVF_RANGES.forEach(function(r){
      var v=st[r.group]; if(!v || (v.lo==null && v.hi==null)) return;
      var g=vvfGroup(r.group), lab=g?g.label:r.group;
      var txt = v.lo==null ? ('up to '+v.hi) : (v.hi==null ? (v.lo+'+') : (v.lo+' , '+v.hi));
      out.push('<button type="button" class="vvf-active-chip" data-vvf-remove="'+VVF_ESC(r.group)+'" data-vvf-value="__range"'+
        ' aria-label="Remove '+VVF_ESC(lab)+' range"><span class="vvf-ag">'+VVF_ESC(lab)+'</span>'+
        VVF_ESC(txt)+'<span class="vvf-ax" aria-hidden="true">&times;</span></button>');
    });
    ['league','position','profile','stage','trajectory'].forEach(function(gk){
      (st[gk]||[]).forEach(function(v){ add(gk,v); });
    });
    if(st.sort && st.sort!=='rt'){
      var so=VVF_SORTS.filter(function(x){ return x.v===st.sort; })[0];
      if(so) add('sort', st.sort, so.l);
    }
    return out.join('');
  }
  /* removeFrom , un-set one selection in the DOM, mirroring renderActive. */
  function removeFrom(host, groupKey, value){
    if(value==='__range'){
      var r=vvfRangeForGroup(groupKey); if(!r) return;
      var mn=host.querySelector('[data-vvf-role="'+r.role+'min"]'),
          mx=host.querySelector('[data-vvf-role="'+r.role+'max"]');
      if(mn) mn.value=mn.min; if(mx) mx.value=mx.max; paintRange(host); return;
    }
    if(groupKey==='sort'){
      var d=host.querySelector('.vvf-chip[data-vvf-group="sort"][data-vvf-value="rt"]');
      host.querySelectorAll('.vvf-chip[data-vvf-group="sort"]').forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-pressed','false'); });
      if(d){ d.classList.add('on'); d.setAttribute('aria-pressed','true'); }
      return;
    }
    var c=host.querySelector('.vvf-chip[data-vvf-group="'+groupKey+'"][data-vvf-value="'+
          (window.CSS&&CSS.escape?CSS.escape(value):value)+'"]');
    if(c){ c.classList.remove('on'); c.setAttribute('aria-pressed','false'); }
  }
  /* facetPlan , for each SERVER-side option, the state to count if it alone were
     the selection for its group. Client-side groups are omitted ON PURPOSE: their
     values are computed by getVVTags and cannot be counted without fetching every
     row, so greying them would be a guess dressed as a fact. */
  function facetPlan(st){
    var plan=[];
    VVF_GROUPS.forEach(function(g){
      if(g.where!=='server' || g.key==='sort') return;
      vvfItems(g).forEach(function(it){
        var probe=JSON.parse(JSON.stringify(st));
        if(g.key==='score'){ probe.score={lo:null,hi:null,bands:[it.v]}; }
        else probe[g.key]=[it.v];
        plan.push({group:g.key, value:it.v, state:probe});
      });
    });
    return plan;
  }
  function setAvailability(host, avail){
    host.querySelectorAll('.vvf-chip[data-vvf-group]').forEach(function(c){
      var g=c.getAttribute('data-vvf-group'), v=c.getAttribute('data-vvf-value');
      var k=g+'||'+v;
      if(!(k in avail)) return;                       // unknown -> leave alone
      var zero=(avail[k]===0) && !c.classList.contains('on');
      c.classList.toggle('vvf-zero', zero);
      if(zero) c.setAttribute('aria-disabled','true'); else c.removeAttribute('aria-disabled');
    });
  }
  /* emptyStateHTML , why a result set is empty, in the user's own selections.
     Groups now AND together and no group silently rewrites another's bounds
     (Prestige used to fold into the score floor), so a contradictory pair returns
     genuinely nothing. Saying WHICH clauses are active turns a blank panel into a
     legible one , the audit note this closes. */
  function emptyStateHTML(st, opts){
    opts=opts||{};
    var parts=[];
    (st.score.bands||[]).forEach(function(v){ parts.push(labelFor('score',v)); });
    /* EVERY range instance is named. A group that narrows the result set but is left
       out of this list makes the panel confidently incomplete , the visitor reads a
       reason that does not mention the clause actually responsible. */
    VVF_RANGES.forEach(function(r){
      var v=st[r.group]; if(!v || (v.lo==null && v.hi==null)) return;
      var g=vvfGroup(r.group), lab=(r.group==='score') ? 'VV' : (g?g.label:r.group);
      parts.push(lab + ' ' + (v.lo==null ? ('up to '+v.hi)
                : (v.hi==null ? (v.lo+'+') : (v.lo+' , '+v.hi))));
    });
    ['league','position','profile','stage','trajectory'].forEach(function(gk){
      (st[gk]||[]).forEach(function(v){ parts.push(labelFor(gk,v)); });
    });
    var head=opts.searching ? 'No seasons match your search.' : 'No seasons match these filters.';
    /* A SEARCH THAT FINDS NOTHING MUST EXPLAIN THE SCOPE, NOT JUST REPORT THE ABSENCE.
       The platform is a FIXED SCORED DATASET , nine leagues, 2010 onward , and it no longer
       falls back to a live lookup: that path was retired with the BSD provider, deliberately,
       because a live result is a player the engine cannot rate, which is not a card. So "no
       seasons match" reads as a broken site unless the boundary is stated.
       SHOWN ONLY FOR A SEARCH. A visitor who is filtering is already inside the dataset, and
       the clause list is the better answer there. */
    var scope = opts.searching
      ? '<span class="vvf-es-scope">VVonderXI scores nine leagues from 2010 onward. '+
        'If a player or a season is not in that set, no card exists for it.</span>'
      : '';
    if(!parts.length) return '<div class="vvf-empty-state">'+VVF_ESC(head)+scope+'</div>';
    return '<div class="vvf-empty-state">'+VVF_ESC(head)+
      '<span class="vvf-es-why">All of these have to be true at once , '+
      VVF_ESC(parts.join(' + '))+'</span>'+scope+'</div>';
  }
  function describe(){
    return VVF_GROUPS.map(function(g){ return {key:g.key,label:g.label,select:g.select,where:g.where,
      items:vvfItems(g).length, note:g.note||null}; });
  }

  // ---- styles + mount ------------------------------------------------------
  /* CSS lives HERE now, not per page , the three surfaces diverged precisely
     because each kept its own copy. Namespaced under .vvf with vvf- prefixed
     classes so it CANNOT touch the existing .fopt / .pkchip markup on the live
     pages, and injected only on mount so an unused import paints nothing. */
  var VVF_CSS = [
    '.vvf{display:flex;flex-direction:column;gap:18px}',
    '.vvf-group{display:flex;flex-direction:column;gap:8px}',
    '.vvf-gl{font-family:\'Archivo\';font-weight:800;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:rgba(243,237,224,0.58)}',
    'body.light .vvf-gl{color:var(--ink-soft)}',
    '.vvf-sub{font-family:\'Archivo\';font-weight:700;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:rgba(243,237,224,0.62);margin-top:4px}',
    'body.light .vvf-sub{color:var(--ink-soft);opacity:.8}',
    '.vvf-chips{display:flex;flex-wrap:wrap;gap:7px}',
    '.vvf-chip{font-family:\'Inter\';font-weight:600;font-size:13px;line-height:1;padding:8px 13px;border-radius:999px;cursor:pointer;',
    'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:var(--cream);transition:background .15s,border-color .15s,color .15s}',
    '.vvf-chip:hover{background:rgba(255,255,255,0.1)}',
    '.vvf-chip.on{background:var(--pink);border-color:transparent;color:#fff}',
    '.vvf-chip:focus-visible{outline:2px solid var(--pink);outline-offset:2px}',
    'body.light .vvf-chip{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.12);color:var(--charcoal)}',
    'body.light .vvf-chip:hover{background:rgba(0,0,0,0.07)}',
    /* MUST restate background AND border, not just colour. `body.light .vvf-chip`
       is (0,2,1) and beats `.vvf-chip.on` at (0,2,0), so the light-theme base
       rule was overriding the pink fill while .on still set white text , a
       selected chip rendered white on rgba(0,0,0,0.04), i.e. invisible. */
    'body.light .vvf-chip.on{background:var(--pink);border-color:transparent;color:#fff}',
    'body.light .vvf-chip.on:hover{background:var(--pink)}',
    '.vvf-chip.vvf-inert{opacity:.45;cursor:default}',
    '.vvf-chip.vvf-inert:hover{background:rgba(255,255,255,0.05)}',
    'body.light .vvf-chip.vvf-inert:hover{background:rgba(0,0,0,0.04)}',
    '.vvf-hint{font-style:normal;font-family:\'Archivo\';font-weight:700;font-size:10px;opacity:.62;margin-left:5px;font-variant-numeric:tabular-nums}',
    '.vvf-soon{font-style:normal;font-family:\'Archivo\';font-weight:700;font-size:9px;letter-spacing:.05em;text-transform:uppercase;opacity:.7;margin-left:5px}',
    '.vvf-empty{font-family:\'Inter\';font-size:12.5px;color:rgba(243,237,224,0.45)}',
    'body.light .vvf-empty{color:var(--ink-soft)}',
    /* VV Score slider , the previous rankings treatment, ported here so compare
       inherits it too. Two range inputs overlaid on one track, pointer-events on
       the thumbs only, with a gradient fill between them. */
    '.vvf-score{padding:2px 0 0}',
    '.vvf-svals{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:2px}',
    '.vvf-sv{font-family:\'Bricolage Grotesque\';font-weight:800;font-size:17px;color:var(--cream);font-variant-numeric:tabular-nums}',
    'body.light .vvf-sv{color:var(--charcoal)}',
    '.vvf-svdash{font-family:\'Archivo\';font-weight:700;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:rgba(243,237,224,0.58)}',
    'body.light .vvf-svdash{color:var(--ink-soft)}',
    '.vvf-dual{position:relative;height:30px;margin:0 8px}',
    '.vvf-dual .vvf-track{position:absolute;top:13px;left:0;right:0;height:5px;border-radius:4px;background:rgba(255,255,255,0.14)}',
    'body.light .vvf-dual .vvf-track{background:rgba(0,0,0,0.1)}',
    '.vvf-dual .vvf-fill{position:absolute;top:13px;height:5px;border-radius:4px;background:linear-gradient(90deg,var(--pink),#FF7A5C)}',
    '.vvf-dual input[type=range]{position:absolute;top:0;left:0;width:100%;height:30px;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}',
    '.vvf-dual input[type=range]::-webkit-slider-runnable-track{background:none;height:30px;border:none}',
    '.vvf-dual input[type=range]::-moz-range-track{background:none;height:30px;border:none}',
    '.vvf-dual input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:50%;background:var(--cream);border:3px solid var(--pink);box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;margin-top:6px}',
    '.vvf-dual input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--cream);border:3px solid var(--pink);box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer}',
    'body.light .vvf-dual input[type=range]::-webkit-slider-thumb{background:#fff}',
    'body.light .vvf-dual input[type=range]::-moz-range-thumb{background:#fff}',
    '.vvf-chip.vvf-zero{opacity:.32;cursor:not-allowed}',
    '.vvf-chip.vvf-zero:hover{background:rgba(255,255,255,0.05)}',
    'body.light .vvf-chip.vvf-zero:hover{background:rgba(0,0,0,0.04)}',
    '.vvf-active{display:flex;flex-wrap:wrap;gap:7px;align-items:center}',
    '.vvf-active:empty{display:none}',
    '.vvf-active-chip{display:inline-flex;align-items:center;gap:6px;font-family:\'Inter\';font-weight:600;font-size:12.5px;line-height:1;',
    'padding:6px 10px 6px 8px;border-radius:999px;cursor:pointer;background:rgba(255,92,122,.14);border:1px solid rgba(255,92,122,.45);color:var(--pink-ink)}',
    '.vvf-active-chip:hover{background:rgba(255,92,122,.24)}',
    'body.light .vvf-active-chip{color:var(--pink-ink)}',
    '.vvf-ag{font-family:\'Archivo\';font-weight:700;font-size:9px;letter-spacing:.06em;text-transform:uppercase;opacity:.72}',
    '.vvf-ax{font-size:15px;line-height:1;opacity:.7;margin-left:1px}',
    /* COMPACT , for a panel rather than a rail. Label to the left, chips on one
       horizontally-scrolling line per group, so eight groups fit a search panel
       without becoming a wall. Not a copy of the rail; a different shape. */
    '.vvf.vvf-compact{gap:9px}',
    '.vvf-body{display:flex;flex-direction:column;gap:8px;min-width:0}',
    '.vvf-compact .vvf-group{display:grid;grid-template-columns:78px minmax(0,1fr);align-items:start;gap:10px}',
    '.vvf-compact .vvf-body{gap:7px}',
    '.vvf-compact .vvf-gl{padding-top:8px;font-size:10.5px;line-height:1.15}',
    '.vvf-compact .vvf-chips{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:3px;scrollbar-width:none;-ms-overflow-style:none}',
    '.vvf-compact .vvf-chips::-webkit-scrollbar{display:none}',
    '.vvf-compact .vvf-chip{flex:none;font-size:12.5px;padding:7px 11px}',
    '.vvf-compact .vvf-sub{margin-top:0}',
    '.vvf-compact .vvf-score{padding:0}',
    '.vvf-compact .vvf-svals{justify-content:flex-start;gap:6px}',
    '.vvf-compact .vvf-sv{font-size:15px}',
    '.vvf-compact .vvf-dual{margin:0 8px 0 0}',
    '@media (max-width:560px){.vvf-compact .vvf-group{grid-template-columns:1fr;gap:4px}.vvf-compact .vvf-gl{padding-top:0}}',
    /* empty state , names the clauses that have to hold at once */
    '.vvf-empty-state{display:flex;flex-direction:column;gap:5px;align-items:center;text-align:center;padding:40px 14px;font-family:\'Inter\';font-size:15px;color:rgba(243,237,224,0.6)}',
    'body.light .vvf-empty-state{color:var(--ink-soft)}',
    '.vvf-es-scope{display:block;margin-top:8px;font-size:12.5px;line-height:1.5;color:var(--ink-soft)}',
    '.vvf-es-why{font-size:12.5px;opacity:.75;max-width:36ch;line-height:1.45}',
    /* ── CLEAR ALL , A PILL, AND ONE TREATMENT FOR ALL THREE SURFACES ────────
       It sat in a bar made entirely of pills and was the only bare text button on it,
       so it read as a stray link rather than a control. It now takes the bar's own
       shape: pill radius, one-pixel border, and the same pink hover the chips use.

       IT LIVES HERE AND NOT ON EACH PAGE. rankings styled it one way and card another
       (Archivo 10px muted versus Inter 12.5px pink), which is the same drift the row
       CSS had , three copies, fixed once, wrong twice. The x is a ::before so no
       surface has to change its markup to get it.

       body.light RESTATES background AND border, not just colour, for the reason the
       chip rules above record: a single-class rule loses to (0,2,0). */
    '.vvf-clear{display:inline-flex;align-items:center;gap:5px;cursor:pointer;',
      'font-family:\'Archivo\';font-weight:700;font-size:10px;letter-spacing:.04em;text-transform:uppercase;',
      'color:var(--ink-soft);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);',
      'border-radius:999px;padding:4px 11px;transition:color .15s,border-color .15s,background .15s}',
    '.vvf-clear::before{content:"\\00d7";font-size:13px;line-height:1;font-weight:600}',
    '.vvf-clear:hover{color:var(--pink-ink);border-color:var(--pink-ink);background:rgba(231,4,67,0.10)}',
    '.vvf-clear:focus-visible{outline:2px solid var(--pink);outline-offset:2px}',
    '.vvf-clear.hidden{display:none}',
    'body.light .vvf-clear{color:var(--ink-soft);background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.12)}',
    'body.light .vvf-clear:hover{color:var(--pink-ink);border-color:var(--pink-ink);background:rgba(231,4,67,0.08)}',
    '@media (max-width:720px){.vvf{gap:14px}.vvf-chip{font-size:12.5px;padding:7px 11px}.vvf-active-chip{font-size:11.5px}}',
    '@media (prefers-reduced-motion:reduce){.vvf-chip{transition:none}}'
  ].join('');
  var VVF_STYLED=false;
  function mountStyles(doc){
    doc=doc||document;
    if(VVF_STYLED && doc.getElementById('vvf-styles')) return;
    if(doc.getElementById('vvf-styles')){ VVF_STYLED=true; return; }
    var st=doc.createElement('style'); st.id='vvf-styles'; st.textContent=VVF_CSS;
    doc.head.appendChild(st); VVF_STYLED=true;
  }
  /* mount(host, opts) , renders, injects CSS, wires delegated clicks.
     Delegation, not per-chip onclick: chips are re-rendered and an inline handler
     built by string concatenation is how the recent-search chips shipped dead
     (JSON.stringify truncating the attribute, CLAUDE.md §C). */
  function mount(host, opts){
    opts=opts||{};
    if(typeof host==='string') host=document.querySelector(host);
    if(!host) return null;
    mountStyles(host.ownerDocument||document);
    host.innerHTML='<div class="vvf'+(opts.compact?' vvf-compact':'')+'">'+VVF_GROUPS.map(function(g){ return renderGroup(g.key); }).join('')+'</div>';
    var onChange=opts.onChange||function(){};
    host.addEventListener('click', function(e){
      var c=e.target.closest ? e.target.closest('.vvf-chip') : null;
      if(!c || !host.contains(c) || c.hasAttribute('disabled')) return;
      var gk=c.getAttribute('data-vvf-group'), g=vvfGroup(gk); if(!g) return;
      if(g.select==='single'){
        host.querySelectorAll('.vvf-chip[data-vvf-group="'+gk+'"]').forEach(function(x){
          x.classList.remove('on'); x.setAttribute('aria-pressed','false'); });
        c.classList.add('on'); c.setAttribute('aria-pressed','true');
      } else {
        var on=c.classList.toggle('on'); c.setAttribute('aria-pressed', on?'true':'false');
      }
      onChange(readState(host));
    });
    host.addEventListener('input', function(e){
      /* Matches INPUT specifically. The value read-outs beside the track are spans
         carrying roles that also end in min/max (rtvmin, agvmax), and a suffix match
         on the role alone would pick them up. */
      if(!e.target.matches || !e.target.matches('input[data-vvf-role]')) return;
      var role=e.target.getAttribute('data-vvf-role').replace(/(min|max)$/,'');
      var r=vvfRange(role); if(!r) return;
      var mn=host.querySelector('[data-vvf-role="'+r.role+'min"]'),
          mx=host.querySelector('[data-vvf-role="'+r.role+'max"]');
      if(mn&&mx&&+mn.value>+mx.value){           // do not let the thumbs cross
        if(e.target===mn) mx.value=mn.value; else mn.value=mx.value;
      }
      paintRange(host); onChange(readState(host));
    });
    // default sort selected
    var d=host.querySelector('.vvf-chip[data-vvf-group="sort"][data-vvf-value="rt"]');
    if(d){ d.classList.add('on'); d.setAttribute('aria-pressed','true'); }
    paintRange(host);
    return { host:host, read:function(){ return readState(host); }, clear:function(){ clear(host); onChange(readState(host)); } };
  }
  /* Paints EVERY range instance the host contains. A host may hold one, both, or
     neither , the compact picker renders a subset , so each is guarded on its own
     rather than the function bailing on the first one it cannot find. */
  function paintRange(host){
    VVF_RANGES.forEach(function(r){
      var mn=host.querySelector('[data-vvf-role="'+r.role+'min"]'),
          mx=host.querySelector('[data-vvf-role="'+r.role+'max"]');
      if(!mn||!mx) return;
      var lo=+mn.value, hi=+mx.value; if(lo>hi){ var t=lo; lo=hi; hi=t; }
      var a=host.querySelector('[data-vvf-role="'+r.role+'vmin"]'),
          b=host.querySelector('[data-vvf-role="'+r.role+'vmax"]'),
          f=host.querySelector('[data-vvf-role="'+r.role+'fill"]');
      if(a) a.textContent=lo; if(b) b.textContent=hi;
      if(f){ var MIN=+mn.min, MAX=+mx.max, span=(MAX-MIN)||1;
        f.style.left=(((lo-MIN)/span)*100)+'%'; f.style.width=((((hi-lo))/span)*100)+'%'; }
    });
  }
  function clear(host){
    host.querySelectorAll('.vvf-chip.on').forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-pressed','false'); });
    VVF_RANGES.forEach(function(r){
      var mn=host.querySelector('[data-vvf-role="'+r.role+'min"]'),
          mx=host.querySelector('[data-vvf-role="'+r.role+'max"]');
      if(mn) mn.value=mn.min; if(mx) mx.value=mx.max;
    });
    var d=host.querySelector('.vvf-chip[data-vvf-group="sort"][data-vvf-value="rt"]');
    if(d){ d.classList.add('on'); d.setAttribute('aria-pressed','true'); }
    paintRange(host);
  }

  /* ══ CARD SEQUENCE , the prev/next walk on card.html ═══════════════════════
     STORE THE QUESTION, NEVER THE ANSWER.
     What is persisted is the search text plus the filter state, i.e. the QUERY, and
     the sequence is re-derived from it on the card page. A stored list of card_ids
     would go stale the moment the data moves under it (this database is written to
     regularly, and rt itself is population-relative , see the anchor note in §C), and
     it would have to travel in the URL to survive a share, which would hand a visitor
     someone else's results dressed as their own.
     SESSION storage, not local: the sequence belongs to this tab's browsing session.
     It must survive a refresh and an in-page navigation, and it must NOT outlive the
     visit or leak into a link. A card opened from a shared URL finds no context and
     shows no controls, which is the rule , never invent an ordering.
     ONE BUILDER. seqQuery is the same builder rankings uses for its rows, its head
     count and its facet probes, so the sequence cannot drift from the list it came
     from. If these were two copies, a filter change would have to be made twice and
     the second copy would eventually be forgotten. */
  const SEQ_KEY = 'vv.seq.v1';
  function seqSave(ctx){ try{ sessionStorage.setItem(SEQ_KEY, JSON.stringify(ctx)); }catch(e){} }
  function seqLoad(){
    try{ const c = JSON.parse(sessionStorage.getItem(SEQ_KEY) || 'null'); return (c && c.st) ? c : null; }
    catch(e){ return null; }
  }
  function seqClear(){ try{ sessionStorage.removeItem(SEQ_KEY); }catch(e){} }
  function seqQuery(sb, o){
    o = o || {};
    let q = o.head ? sb.from('player_card_mv').select(o.select || '*', { count:'exact', head:true })
                   : sb.from('player_card_mv').select(o.select || '*');
    if(o.nameQ){ const sf = tokenAndFilter(o.nameQ); if(sf) q = q.or(sf); }
    if(o.seasonYear != null) q = q.eq('season_year', o.seasonYear);
    q = applyServer(q, o.st, { headCount: !!o.head }).query;
    if(!o.head && o.from != null) q = q.range(o.from, o.to != null ? o.to : o.from);
    return q;
  }
  /* Tag groups have no column to filter on, so they run as a predicate AFTER the fetch
     (same split as rankings). When one is active the server's count answers a DIFFERENT
     question, so the sequence must be materialised and counted client-side instead. */
  function seqClientActive(st){
    return !!(st && ((st.profile||[]).length || (st.stage||[]).length || (st.trajectory||[]).length));
  }
  const VVSeq = { KEY:SEQ_KEY, save:seqSave, load:seqLoad, clear:seqClear,
                  query:seqQuery, clientActive:seqClientActive };

  const VVFilters = { GROUPS:VVF_GROUPS, SORTS:VVF_SORTS, LEAGUES:VVF_LEAGUES,
    bandRanges, bandRange, bandPresets, rtFloorForPrestige,
    renderGroup, renderAll, mountStyles, mount, clear, paintRange,
    labelFor, renderActive, removeFrom, facetPlan, setAvailability, emptyStateHTML,
    emptyState, readState, isActive, applyServer, clientPredicate, describe };

  // ══════════════════════════════════════════════════════════════════════════════
  //  THE VV LOADER , the waiting state, shared by card, compare and rankings.
  //
  //  TWO MARKS, AND THE SPLIT IS A MEASUREMENT, NOT A PREFERENCE.
  //  The monogram's identity is the INTERLOCK , two Vs sharing a knocked-out overlap
  //  (§C). Rasterised and scanned across the middle of the mark, that knockout only
  //  survives at 40px and above: at 48px it cuts clean through (deepest alpha 0.00, two
  //  separate ink runs), while at 16px there is ONE run and the deepest cut is 0.50 ,
  //  antialiasing fills the seam and the two Vs merge into a single blob.
  //  So vvLoader() is for 40px and up, and anything smaller , a button, a line of text ,
  //  16 is where the WIPE stops reading as a direction, not where the mark stops reading.
  //
  //  SWEEP is the chosen animation. A band of light travels UP through the mark and the
  //  silhouette never moves, so the interlock is legible in every frame , the one option
  //  whose motion is about the knockout rather than in spite of it.
  // ══════════════════════════════════════════════════════════════════════════════
  const VV_LOADER_MIN = 16;          // two-tone floor , see the note on vvLoader

  //  LOCKED GEOMETRY , see CLAUDE.md §C. Do not re-derive it and do not nudge it by eye;
  //  it has been got wrong three times, and each element below is load-bearing.
  //
  //  THE TWO Vs ARE MIRRORED, NOT TRANSLATED. This is the correction that mattered, and it
  //  is what the earlier trace got wrong. Fitted against the one pink arm the cream V never
  //  occludes (the outer-right), a mirror predicts its two edge slopes to within 0.038 and a
  //  translation is off by 0.129 , and the stroke widths settle it independently: the pink
  //  V's RIGHT stroke measures 89-93 against the cream V's LEFT stroke at 97-103, not against
  //  the cream's right at 77-80. A translated copy would put the heavy stroke on the same
  //  side of both Vs. The asset puts them on opposite sides.
  //
  //  NO VERTICAL OFFSET. Both Vs top out on the same line. The 6px drop an earlier trace
  //  recorded on the second V was the mirror being misread as a translation.
  //
  //  THE INNER ARMS DROP 43, THE OUTER ARMS RUN FULL HEIGHT. V1's outer-left starts at the
  //  top and its inner-right starts 43 units down; V2 mirrors that, so its inner-left drops
  //  and its outer-right runs full. Measured directly on V1 (left arm present from y=4, right
  //  arm first appearing at y=47) and inherited by V2 through the mirror, because V2's
  //  inner-left arm is fully occluded in the asset and cannot be measured on its own.
  //  THIS ASYMMETRY IS WHY THE LOCKUP READS AS A W RATHER THAN AS TWO Vs. It is not decoration.
  //
  //  SEAM OFFSET 218.5 IN SOURCE UNITS, WHICH IS THE ASSET'S OWN NUMBER AND NOT A DERIVED ONE.
  //  Fixed against two landmarks the cream V does not cover , the pink apex at x=350.5 gives
  //  219.6, the pink outer-right at x=523 gives 217.3. A seam derived from the drop instead
  //  (328.5 - 0.9588 x 43 = 287.3) separates the two Vs until they read as "V V", which is the
  //  one thing the drop exists to prevent. Rendered side by side at 40px and at 150px, in both
  //  themes, only 218.5 reads as a W.
  //
  //  ASYMMETRIC STROKE WEIGHT, LEFT HEAVIER THAN RIGHT, ratio 1.27 at the drop easing to 1.21
  //  further down. Preserved exactly , neither V is rescaled, which is what the trace exists
  //  to protect. Fitted edges (source units, top of mark at y=0):
  //     outer-left  x = 0.5160y + 0.204     inner-left  x = 0.4874y + 99.37
  //     inner-right x = -0.4698y + 248.82   outer-right x = -0.4428y + 324.91
  //  Mark measures 524.0 x 338.7 in those units, ratio 1.547, normalised to the 24x24 grid.
  //
  //  THE BASE V IS ALWAYS PRESENT. Pink wipes right to left over it via clipPath, so the mark
  //  never disappears , only the colour moves.
  const VV_V1 = 'M1 4.89 L5.16 4.89 L8.36 11.45 L10.59 6.7 L13.83 6.7 L8.34 19.11 Z';
  const VV_V2 = 'M23 4.89 L18.84 4.89 L15.64 11.45 L13.41 6.7 L10.17 6.7 L15.66 19.11 Z';

  const VV_LOADER_CSS = `
.vvload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.vvload .vvlmark{display:block;flex:none}
/* THE BASE V FOLLOWS ITS GROUND, AND THE CALLER IS THE ONLY THING THAT KNOWS THE GROUND.
   Two wrong answers were tried first. Keying the base to the THEME puts a cream V on
   card.html's glance panel, which is cream in BOTH themes , the base vanishes and only the
   pink wipe is left. Plain currentColor is worse in a different way: .gdrury is pink-inked
   prose, so the base inherited pink-ink and sat at 1.59 against the pink overlay, i.e. a
   two-tone mark rendering as one tone. So the wrapper carries an explicit ink with a
   sensible default, and any surface whose text is not the page's body ink passes its own. */
.vvload{color:var(--cream,#F0EAD9)}
body.light .vvload{color:#1A1917}
.vvload .base{fill:currentColor}
.vvload .pink{fill:#E70443}
.vvload .wipe{animation:vvWipe var(--vvdur,2s) cubic-bezier(.55,.06,.4,.95) infinite}
/* The clip rect PARKS to the RIGHT of the mark (x=24, spanning 24..48, covering nothing).
   Sliding it LEFT draws its left edge across the mark, so the pink is revealed from the
   RIGHT EDGE INWARD, then withdraws right again. Get the sign wrong and the wipe runs
   left-to-right, which is a different mark's behaviour. */
@keyframes vvWipe{
  0%{transform:translateX(0)} 45%{transform:translateX(-24px)}
  58%{transform:translateX(-24px)} 100%{transform:translateX(0)}}
.vvload-l{font-family:'Inter',system-ui,sans-serif;font-size:12.5px;letter-spacing:.04em;color:var(--ink-soft,#a49d93)}
/* TWO-TONE MEANS ONE V IN EACH INK, the way the logo is drawn. Parking the wipe at full
   reveal would make the whole monogram pink, which is one-tone and reads as a different
   mark, so the still state drops the clip and hides the pink copy of the FIRST V. */
@media (prefers-reduced-motion: reduce){
  .vvload .wipe{animation:none;transform:translateX(-24px)}
  .vvload .pink.p1{display:none}
}
`;
  let LOADER_CSS_IN = false;
  function vvInjectLoaderCSS(){
    if (LOADER_CSS_IN || typeof document === 'undefined') return;
    const st = document.createElement('style');
    st.setAttribute('data-vv-loader-css', '1');
    st.textContent = VV_LOADER_CSS;
    document.head.insertBefore(st, document.head.firstChild);
    LOADER_CSS_IN = true;
  }

  //  The monogram loader. `size` is clamped UP to the measured floor rather than honoured
  //  blindly , a caller asking for 24px has misunderstood the mark, and silently giving
  //  them a blob would hide that. label is announced to screen readers and shown when
  //  `withText` is set.
  //  The two-tone loader. `size` clamps UP to the measured floor. THE FLOOR IS 16, NOT 40:
  //  the 40px number in §C is the SINGLE-INK KNOCKOUT's floor, where a 1px transparent gap
  //  is destroyed by antialiasing. Two INKS separate where a gap cannot , measured colour
  //  purity stays at 96 to 100% all the way down to 12px, and each V keeps its notch open
  //  at every size tested. Pink to base measures 3.89 dark / 3.76 light and each ink to its
  //  page ~4.05 and ~15.5, so every pair clears the 3:1 non-text bar. 16 is where the WIPE
  //  stops reading as a direction, not where the mark stops reading.
  let LOADER_UID = 0;
  function vvLoader(opts){
    opts = opts || {};
    vvInjectLoaderCSS();
    const size = Math.max(VV_LOADER_MIN, opts.size || 48);
    const label = String(opts.label || 'Loading').replace(/[&<>"]/g, '');
    const dur = opts.duration || '2s';
    const id = 'vvw' + (LOADER_UID++);
    const mark =
      '<svg class="vvlmark" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'aria-hidden="true" style="--vvdur:' + dur + '">' +
        '<defs><clipPath id="' + id + '"><rect class="wipe" x="24" y="0" width="24" height="24"/></clipPath></defs>' +
        '<path class="base" d="' + VV_V1 + '"/><path class="base" d="' + VV_V2 + '"/>' +
        '<g clip-path="url(#' + id + ')">' +
          '<path class="pink p1" d="' + VV_V1 + '"/><path class="pink p2" d="' + VV_V2 + '"/>' +
        '</g>' +
      '</svg>';
    const inkStyle = opts.ink ? ' style="color:' + String(opts.ink).replace(/["<>]/g,'') + '"' : '';
    const a11y = opts.silent
      ? ' aria-hidden="true"'                 // the caller's own visible text is the announcement
      : ' role="status" aria-live="polite"';
    return '<div class="vvload' + (opts.className ? ' ' + opts.className : '') +
           '"' + a11y + inkStyle + '>' + mark +
           (opts.silent ? ''
            : opts.withText
             ? '<span class="vvload-l">' + label + '</span>'
             : '<span class="vvload-l" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">' + label + '</span>') +
           '</div>';
  }

  //  THE TWO WAIT REGISTERS. Quick loads are a query coming back; the AI waits are a model
  //  writing prose and are several times longer, so they run slower and say what they are
  //  doing rather than just "Loading". Same mark, same wipe, different tempo.
  const VV_WAIT = {
    quick: { duration: '2s',   label: 'Loading' },
    ai:    { duration: '2.6s', label: 'Reading the season' }
  };


  // ══════════════════════════════════════════════════════════════════════════════
  //  SHARE FRAMES , the composed image a card or a comparison goes out as.
  //
  //  WHY IT LIVES HERE. card.html and compare.html both need it, and the frame reuses
  //  buildCard, so a copy on each page would be a third card renderer to keep in step.
  //  The frame chrome ships as VV_SHARE_CSS; the CARD BOX does NOT , the pages already
  //  own `.vvcard`, and moving that rule into a prepended sheet is the one extraction
  //  that was tried and REVERTED (see §C: the live card went 304x461 -> 206x395 because
  //  a prepended sheet inverts the cascade against page rules that used to follow it).
  //
  //  EVERYTHING BELOW WAS DECIDED AGAINST A RENDERED FRAME, NOT GUESSED. The variant is
  //  CORNERS: brand in one corner, caption in the diagonal opposite, so neither competes
  //  for the centre line. Ground and Plate were built, reviewed and dropped.
  // ══════════════════════════════════════════════════════════════════════════════

  //  SIZE OFF THE SHORT SIDE, NEVER THE HEIGHT. A 1200x675 and a 1080x1920 must carry type
  //  of the same optical weight, and height-derived sizing made the wide frame's caption
  //  tiny because 675 is its small number while 1920 is the large one elsewhere. The
  //  coefficients are read off rendered output: 0.026 puts the caption at 18px on the wide
  //  frame and 28px on a 1080, which survives X halving it to ~6px in a timeline.
  const SHARE_FORMATS = {
    x:   { key:'x',   name:'X / Twitter',      w:1200, h:675  },
    igf: { key:'igf', name:'Instagram feed',   w:1080, h:1350 },
    igs: { key:'igs', name:'Instagram story',  w:1080, h:1920 },
    dl:  { key:'dl',  name:'Download',         w:1000, h:1518 }
  };
  //  1.518, NOT the 1.397 in the CSS. Height is `--cw x 1.397` but width is clamped by
  //  `max-width:92%`, so the RENDERED ratio is 1.397/0.92. Reading 1.397 off the rule and
  //  sizing a frame with it leaves the card short of its box. See §C.
  const SHARE_RATIO = 1.518;
  const shShort  = F => Math.min(F.w, F.h);
  /*  TYPE SCALE, AS A FRACTION OF THE FRAME'S SHORT SIDE , one object so the three sizes
      cannot drift apart and so a demo can sweep them through the REAL code path instead of
      a copy of it.

      SIZED FOR THE THUMBNAIL, NOT FOR THE FILE. X renders a shared image inline at about
      600px wide, i.e. HALF the 1200x675 frame, so every number here is effectively halved
      before anyone reads it. The old 0.026/0.024 put the caption at 18px and the wordmark
      at 16px in the file , 9px and 8px as actually seen, which is not readable at arm's
      length on a phone. Judge any change at 600px wide, never at 100%.  */
  const SH_TYPE = { cap: 0.046, brand: 0.044, tag: 0.034, sub: 0.68 };
  const shCapPx  = F => Math.round(shShort(F) * SH_TYPE.cap);
  const shBrndPx = F => Math.round(shShort(F) * SH_TYPE.brand);
  const shTagPx  = F => Math.round(shShort(F) * SH_TYPE.tag);
  const shPad    = F => Math.round(shShort(F) * 0.055);
  const shCardW  = (F, frac) => Math.round(Math.min(shShort(F) * frac, (F.h - shPad(F) * 3.4) / SHARE_RATIO));
  const shEsc    = v => String(v == null ? '' : v).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  //  LIGHT-MODE INK IS MEASURED, NOT PICKED BY EYE. Against the cream field the worst-case
  //  ratios are: caption #6b6357 4.55 PASS, body #241f1a 12.56 PASS, band gold #8a6a1e 3.88
  //  FAIL so it is #5a4410 at 7.12, brand pink #E70443 3.59 FAIL so emphasis is #AD0332 at
  //  5.69. Dark field: #F1688E 5.85, #E0A93A 8.16, #a49c90 6.37, all PASS. Raw brand pink
  //  fails on BOTH fields and is therefore never used as ink.
  const VV_SHARE_CSS = `
.sf{display:flex;position:relative;overflow:hidden;
    background:radial-gradient(120% 90% at 20% 0%,#1e1a16 0%,#12100e 55%,#0d0b0a 100%);
    color:#F5EFE6;font-family:'Inter',system-ui,sans-serif;--emph:#F1688E;--band:#E0A93A;--quiet:#a49c90}
.sf.light{background:radial-gradient(120% 90% at 20% 0%,#FBF7EF 0%,#F2EBDD 55%,#E9E1D0 100%);
          color:#241f1a;--emph:#AD0332;--band:#5a4410;--quiet:#6b6357}
/* VVonderXI IS ONE WORD, SO THE LOCKUP GETS NO WORD SPACE.
   .sf-brand is a flex row and carried gap:7px, and .sf-vv added margin-right:.16em on top
   of it. At the 16px brand size that is 7 + 2.56 = 9.56px between the second V and the O,
   against a VV only 21.6px wide , 44% of its own width, which reads as two words. Both are
   gone; the letter rhythm now comes from letter-spacing alone, the way it does inside
   ONDERXI itself. Do not reintroduce a gap here to "separate" the two halves: they are not
   two halves, they are one word set at two sizes. */
.sf-brand{position:absolute;display:flex;align-items:baseline;gap:0;font-weight:800;letter-spacing:.14em;text-transform:uppercase;opacity:.92}
.sf-vv{letter-spacing:-0.06em}
.sf-vv .a{color:currentColor}.sf-vv .b{color:var(--emph)}
/* The caption's own wordmark , same two-tone treatment as the brand, see shCapHTML. */
.sf-cap .sf-vv2 .b{color:var(--emph)}
/*  NO nowrap ON A LINE WHOSE CONTENT VARIES. The caption is a player's name, and names run
    from "Pelé" to "Pierre-Emerick Aubameyang"; on the square formats the short side IS the
    width, so the type scales up while the room does not. Measured at the shipped scale, a
    single long card name overflowed the Instagram frame by 155px and a long compare pair by
    779px , text bleeding straight off the image, silently, because nowrap does not clip, it
    overflows. The wrapper now carries an explicit max-width (the frame minus its padding,
    passed in per format) and the caption wraps inside it.
    The TAGLINE is fixed text and fits on one line in every format, but it wraps by the same
    rule rather than being exempted , an exemption is just a defect waiting for a longer
    tagline.  */
.sf-capwrap{position:absolute;display:flex;flex-direction:column;align-items:center;gap:.42em;text-align:center}
.sf-cap{color:var(--quiet);font-weight:600;letter-spacing:.06em;line-height:1.3;text-wrap:balance}
/* The tagline now carries the BRAND, since the caption above it no longer does. So it is
   not purely the quiet line any more: the wordmark sits upright and solid, and only the
   phrase after it is the italic that matches the sheet's own .sb-foot. */
.sf-tag{color:var(--quiet);font-weight:700;letter-spacing:.04em;line-height:1.3;text-wrap:balance}
.sf-tag i{font-style:italic;font-weight:600;opacity:.82}
.sf-em{color:var(--emph);font-style:normal;font-weight:800}
.sf-tag .sf-vv2{font-weight:800;letter-spacing:.02em}
.sf-rule{height:1px;background:currentColor;opacity:.18}
.sf-sub{color:var(--quiet);font-weight:600;letter-spacing:.07em;text-transform:uppercase}
.sf-verdict{line-height:1.42}
.sf-vtag{display:inline-flex;align-items:center;border-radius:999px;background:linear-gradient(90deg,#F0D27A,#E0A93A);
         color:#5a4410;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
/* Reserves the winner tag's height above the losing card so the pair stays aligned. It is
   invisible, not display:none , removing it would let the two cards sit at different heights. */
.sf-vtag-ghost{visibility:hidden}
.sf-slot{display:flex;flex-direction:column;align-items:center}
.sf-slotcard{border-style:solid;border-color:transparent;box-sizing:content-box}
.sf-slotcard.sf-win{border-color:#E8B84B;background:rgba(232,184,75,0.10)}
.sf-score{font-family:'Archivo',Impact,sans-serif;font-weight:900;color:var(--emph);line-height:1}
.sf-stage{position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none}
.vvtoast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(14px);z-index:9999;
         /* width:max-content is load-bearing. A fixed box at left:50% with no width shrinks to
            the space between 50% and the right edge , 206px on a 412px phone , so the message
            wrapped to five lines. max-width still caps it and 92vw keeps it off both edges. */
         width:max-content;max-width:min(92vw,420px);background:#1C1B1A;color:#F0EAD9;border:1px solid rgba(255,255,255,.16);
         border-radius:12px;padding:12px 16px;font-family:'Inter',system-ui,sans-serif;font-size:13px;
         line-height:1.45;box-shadow:0 18px 40px -16px rgba(0,0,0,.7);opacity:0;transition:opacity .18s,transform .18s}
.vvtoast.on{opacity:1;transform:translateX(-50%) translateY(0)}
body.light .vvtoast{background:#FBF7EF;color:#241f1a;border-color:rgba(0,0,0,.14)}
`;
  //  The share sheet is PREPENDED for the same reason VV_CARD_CSS is , so a page rule can
  //  still override it , but nothing in it competes with a page rule today.
  let SHARE_CSS_IN = false;
  function vvInjectShareCSS(){
    if (SHARE_CSS_IN || typeof document === 'undefined') return;
    const st = document.createElement('style');
    st.setAttribute('data-vv-share-css', '1');
    st.textContent = VV_SHARE_CSS;
    document.head.insertBefore(st, document.head.firstChild);
    SHARE_CSS_IN = true;
  }

  function shBrand(px){
    return '<span class="sf-vv"><span class="a">V</span><span class="b">V</span></span>' +
           '<span style="font-size:' + Math.round(px * SH_TYPE.sub) + 'px;letter-spacing:.2em">ONDERXI</span>';
  }
  //  CORNERS. The caption's `left` is a PLACEHOLDER , vvCentreShareCaption overwrites it
  //  after the frame is in the DOM, because the card renders at max-width:92% of its
  //  wrapper and the wrapper's centre is therefore NOT the card's. Predicting it from cw
  //  was out by 11px on the wide compare frame, where the pair sits left of centre.
  /* THE CAPTION'S "VVonderXI" GETS ITS PINK V, AND IT HAS TO HAPPEN HERE RATHER THAN IN
     vvShareCaption. That function's output is ALSO the share TEXT , it goes to
     navigator.share({text}) and to the clipboard , so it must stay a plain string. Putting
     markup in it would post literal span tags to whatever the visitor pastes into.
     So the plain string stays the single source and only the RENDERED copy is marked up,
     after escaping, on the one token that is the brand. */
  const SH_BRAND_HTML = '<span class="sf-vv2"><span class="a">V</span><span class="b">V</span>onderXI</span>';
  /*  THE CAPTION DROPS ITS TRAILING BRAND IN THE FRAME ONLY. vvShareCaption() is also the
      share TEXT , it goes to navigator.share({text}) and to the clipboard , and there the
      trailing "· VVonderXI" is doing real work: it names the source in someone else's post.
      In the FRAME it is the third VVonderXI on one image (wordmark, caption, tagline), so
      the rendered copy strips it and the tagline carries the brand instead.
      One plain string remains the single source; only the rendering differs.  */
  function shCapHTML(text){
    const trimmed = String(text == null ? '' : text).replace(/\s*\u00b7\s*VVonderXI\s*$/, '');
    return shEsc(trimmed).replace(/VVonderXI/g, SH_BRAND_HTML);
  }
  /*  THE TAGLINE WAS IN THE PREVIEW AND NOT IN THE FILE, WHICH IS THE WORST OF BOTH.
      card.html's share sheet wraps the card and a `.sb-foot` tagline in a container with
      id="shareCapture" , named as though it is the capture source. It is not: the capture
      composes a SEPARATE frame here and never read that element, so the preview promised a
      line the PNG did not contain. Adding it to the frame is the fix, because the preview
      is what was designed and the output should match it.
      A container named for a job it does not do is its own trap , the name is the reason
      nobody noticed for as long as they didn't.  */
  function shChrome(F, capText){
    const P = shPad(F), bp = shBrndPx(F), cp = shCapPx(F), tp = shTagPx(F);
    return '<div class="sf-brand" style="top:' + (P * 0.8) + 'px;right:' + P + 'px;font-size:' + bp + 'px">' + shBrand(bp) + '</div>' +
           '<div class="sf-capwrap" style="bottom:' + (P * 0.7) + 'px;left:' + (F.w / 2) + 'px;transform:translateX(-50%);' +
             'width:' + (F.w - P * 2) + 'px">' +
             '<div class="sf-cap" style="font-size:' + cp + 'px">' + shCapHTML(capText) + '</div>' +
             '<div class="sf-tag" style="font-size:' + tp + 'px">' + SH_BRAND_HTML +
               ' \u00b7 <i>Every Season Tells a Different <span class="sf-em">Story</span></i></div>' +
           '</div>';
  }

  const shSeason = c => { try { return fmtSeason(c.season); } catch(e){ return c.season || ''; } };
  function vvShareCaption(spec){
    if (spec.kind === 'compare')
      return (spec.a.full || '') + ' ' + shSeason(spec.a) + ' v ' + (spec.b.full || '') + ' ' + shSeason(spec.b) + ' · VVonderXI';
    return (spec.card.full || '') + ' ' + shSeason(spec.card) + ' · ' + spec.card.vv + ' · VVonderXI';
  }

  function shCardFrame(spec, F, light){
    /*  THE WIDE FRAME GETS A BIGGER CARD; THE PORTRAIT FRAMES DO NOT. Ruled 2026-08-27 after
        rendering current / +10 / +20 / +30 in all four formats at 600px, which is how X shows
        a shared image inline. At 0.42 the card was 284px in a 1200px frame , under a quarter
        of its width, about 142px as actually seen , and the negative space was not framing it
        but stranding it. The portrait frames do not have that problem: the card already fills
        them and the restraint reads as deliberate, so igf, igs and dl keep 0.58.
        Written as 0.42 * 1.20 rather than 0.504 so the decision stays legible: it is the
        original Corners fraction, raised 20%, not a new number someone picked.
        +30% was rejected , on igf it puts the card into the caption block.  */
    const P = shPad(F), wide = F.w / F.h > 1.2;
    const cw = shCardW(F, wide ? 0.42 * 1.20 : 0.58);
    /*  RESERVE THE CAPTION'S HEIGHT ON THE WIDE FRAME. The card is centred with
        justify-content:center over the WHOLE frame height, but the caption block is
        absolutely positioned at the bottom and therefore out of flow , so the centring has
        never known it was there. At the old sizes that was invisible. With the card 20%
        bigger AND the type raised, the card's bottom edge landed 3px INTO the caption while
        leaving a band of dead space above it: cramped at the bottom, empty at the top.
        Reserving the zone as bottom padding lets flex centre the card in what is actually
        free, which both fixes the collision and uses the space that was going to waste.
        WIDE ONLY, and the condition is a PROPERTY not a format key: a short wide frame is
        where the card and the caption compete for height. The portrait frames have height to
        spare, they do not collide, and their composition is settled , 2026-08-27 ruling.  */
    const capZone = wide ? Math.round((shCapPx(F) + shTagPx(F)) * 1.35 + P * 0.9) : 0;
    return '<div class="sf' + (light ? ' light' : '') + '" style="width:' + F.w + 'px;height:' + F.h + 'px;' +
      'flex-direction:column;align-items:center;justify-content:center;' +
      'padding:' + P + 'px ' + P + 'px ' + (P + capZone) + 'px ' + P + 'px">' +
      shChrome(F, vvShareCaption(spec)) +
      '<div style="width:' + cw + 'px;position:relative;z-index:1">' + buildCard(spec.card, cw) + '</div></div>';
  }

  //  THE LEDGER. Wide frames put the pair left and the verdict block right; portrait frames
  //  stack them. Chosen against rendered mocks , the wide frame's empty right half was the
  //  open question and the ledger is what answers it.
  function shCmpFrame(spec, F, light){
    const P = shPad(F), S = shShort(F) / 1000, wide = F.w / F.h > 1.2;
    const a = spec.a, b = spec.b;
    const cw = Math.round(Math.min((F.h - P * (wide ? 2.2 : 4.6)) / SHARE_RATIO, F.w * (wide ? 0.22 : 0.38)));
    /*  THE FRAME MUST SHOW WHICH CARD THE VERDICT PICKED, AND THE SCORES CANNOT BE TRUSTED
        TO SAY IT. The engine decides the winner, and the age tiebreaker means a LOWER VV
        Score can still win (gap <= 2 and >= 4 years apart, younger takes it , §C). A reader
        of the image only sees two numbers, so without a mark they would read the higher one
        as the winner and be wrong exactly when the verdict is most interesting.
        The winner gets the gold rim AND the verdict tag directly above it, so the tag names
        the card it belongs to rather than floating beside the pair.
        A REAL BORDER, NOT AN INSET SHADOW: html2canvas drops inset box-shadow on rounded
        elements (§C), which is how the Generational rim went missing from captures. The rim
        here is an outset border on a plain wrapper, which the capture renders faithfully.
        The loser's slot keeps an EMPTY tag of the same height so the two cards stay aligned;
        a tie shows the tag above neither and rims neither.  */
    const tagPx = 14 * S, win = spec.winner;
    const tagFor = function(on){
      return '<div class="sf-vtag' + (on ? '' : ' sf-vtag-ghost') + '" style="font-size:' + tagPx +
             'px;padding:' + (7 * S) + 'px ' + (17 * S) + 'px">' + (on ? shEsc(spec.verdictTag) : '') + '</div>';
    };
    const slot = function(card, side){
      const isWin = (win === side);
      return '<div class="sf-slot" style="width:' + cw + 'px;gap:' + (9 * S) + 'px">' +
        (win === 'tie' ? '' : tagFor(isWin)) +
        '<div class="sf-slotcard' + (isWin ? ' sf-win' : '') + '" style="padding:' + (6 * S) +
        'px;border-width:' + (3 * S) + 'px;border-radius:' + (cw * 0.09) + 'px">' +
        buildCard(card, cw) + '</div></div>';
    };
    const pair = '<div style="display:flex;gap:' + (14 * S) + 'px;position:relative;z-index:1;align-items:flex-start">' +
      slot(a, 'A') + slot(b, 'B') + '</div>';
    const last = n => shEsc(String(n || '').split(' ').slice(-1)[0]);
    const block = '<div style="display:flex;flex-direction:column;align-items:' + (wide ? 'flex-start' : 'center') + ';' +
      'gap:' + (16 * S) + 'px;position:relative;z-index:1;' + (wide ? '' : 'text-align:center;') + '">' +
      (win === 'tie' ? '<div class="sf-vtag" style="font-size:' + tagPx + 'px;padding:' + (7 * S) + 'px ' + (17 * S) + 'px">' + shEsc(spec.verdictTag) + '</div>' : '') +
      '<div class="sf-verdict" style="font-size:' + ((wide ? 23 : 21) * S) + 'px;opacity:.92;max-width:' + (wide ? F.w * 0.34 : F.w * 0.78) + 'px">' + shEsc(spec.verdictLine) + '</div>' +
      '<div class="sf-rule" style="width:' + (64 * S) + 'px"></div>' +
      '<div style="display:flex;gap:' + (18 * S) + 'px;align-items:baseline">' +
        '<span class="sf-score" style="font-size:' + (26 * S) + 'px">' + a.vv + '</span>' +
        '<span class="sf-sub" style="font-size:' + (12 * S) + 'px">' + last(a.full) + '</span>' +
        '<span class="sf-sub" style="font-size:' + (12 * S) + 'px;opacity:.45">/</span>' +
        '<span class="sf-score" style="font-size:' + (26 * S) + 'px">' + b.vv + '</span>' +
        '<span class="sf-sub" style="font-size:' + (12 * S) + 'px">' + last(b.full) + '</span>' +
      '</div></div>';
    const inner = wide
      ? '<div style="flex:none">' + pair + '</div><div style="flex:1;min-width:0">' + block + '</div>'
      : pair + block;
    return '<div class="sf' + (light ? ' light' : '') + '" style="width:' + F.w + 'px;height:' + F.h + 'px;' +
      (wide ? 'align-items:center;padding:' + P + 'px ' + (P * 1.4) + 'px;gap:' + (P * 1.2) + 'px'
            : 'flex-direction:column;align-items:center;justify-content:center;padding:' + P + 'px;gap:' + (28 * S) + 'px') +
      '">' + shChrome(F, vvShareCaption(spec)) + inner + '</div>';
  }

  function vvShareFrameHTML(spec, F, light){
    return spec.kind === 'compare' ? shCmpFrame(spec, F, light) : shCardFrame(spec, F, light);
  }

  //  MEASURE, DO NOT PREDICT. See the note on shChrome.
  function vvCentreShareCaption(frame){
    /*  TARGETS THE WRAPPER, NOT `.sf-cap`. The caption used to BE the absolutely-positioned
        element; it is now a static child of `.sf-capwrap`, which carries the position, so
        writing `left` to `.sf-cap` would be a silent no-op , the assignment succeeds, the
        computed value never moves, and the caption quietly sits at the frame's centre
        instead of the card's. Exactly the family §C warns about: replacing a block shows
        what ARRIVED, never what left, and the positioning contract is what left.  */
    const cap = frame.querySelector('.sf-capwrap') || frame.querySelector('.sf-cap');
    const cards = frame.querySelectorAll('.vvcard');
    if (!cap || !cards.length) return;
    const fr = frame.getBoundingClientRect();
    let l = Infinity, r = -Infinity;
    cards.forEach(function(c){ const b = c.getBoundingClientRect(); if (b.left < l) l = b.left; if (b.right > r) r = b.right; });
    /*  CLAMPED TO THE FRAME. The block is now a real width rather than shrink-wrapped (it has
        to be, or a long name wraps to four lines instead of two), so centring it on the card
        cluster can push its edge past the frame. The clamp keeps it inside; when the block is
        as wide as the padded area there is nowhere to move and it stays frame-centred, which
        is the correct degenerate case rather than a special one.  */
    const half = cap.getBoundingClientRect().width / 2;
    const pad  = Math.round(Math.min(fr.width, fr.height) * 0.055);
    const want = (l + r) / 2 - fr.left;
    const lo   = pad + half, hi = fr.width - pad - half;
    cap.style.left = (lo > hi ? fr.width / 2 : Math.max(lo, Math.min(hi, want))) + 'px';
    cap.style.right = 'auto';
  }

  function vvLoadH2C(){
    if (window.html2canvas) return Promise.resolve();
    return new Promise(function(res, rej){
      const sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      sc.onload = res; sc.onerror = function(){ rej(new Error('html2canvas failed to load')); };
      document.head.appendChild(sc);
    });
  }

  //  RENDER OFFSCREEN AND HAND BACK A BLOB. The stage is parked off to the left rather than
  //  hidden , `display:none` and `visibility:hidden` both give html2canvas nothing to measure.
  //  scale:2 so a 1080-wide frame lands at 2160 and survives a platform re-encode.
  //  THE TWO SHIMS ARE NOT OPTIONAL AND THE FINALLY IS NOT OPTIONAL. See §C: html2canvas
  //  resolves neither `<use>` nor an inset box-shadow on a rounded box, and this stage is
  //  removed on every path so a throw cannot leave it in the document.
  /*  ── WHAT THE CAPTURE CANNOT DRAW, MEASURED IN ONE PASS (2026-08-27) ──────────
      Three divergences had been found one screenshot at a time. This list came from a
      with/without harness instead: every feature rendered as a pair designed to look
      obviously different, then the pair compared INSIDE the capture. A pair that becomes
      identical there is a feature the capture dropped. Two controls guard the method , a
      red/blue pair that must read different, and an identical pair that must read the same.

      THE LIST IS A TRAP LIST, NOT A BUG LIST. Most of these are not used on the card or the
      share frame today. They are here so the next person who reaches for one finds out now
      rather than from a screenshot later.  */
  const H2C_UNSUPPORTED = [
    { prop:'maskImage',        label:'mask-image' },
    { prop:'webkitMaskImage',  label:'-webkit-mask-image' },
    { prop:'clipPath',         label:'CSS clip-path', skip:v => v.indexOf('url(') === 0 },
    { prop:'mixBlendMode',     label:'mix-blend-mode' },
    { prop:'backgroundBlendMode', label:'background-blend-mode' },
    { prop:'filter',           label:'CSS/SVG filter (blur, drop-shadow)' }
  ];
  /*  Warns ONCE per surface, in the console, naming the element. Same guard shape as the
      row-namespace audit and the missing-mark audit, added for the same reason: an opt-in
      contract that nothing enforces gets broken silently.
      NOTE it cannot see everything. It reports features the capture DROPS. It cannot report
      a feature the capture draws WRONGLY , the card's inset gold rim is drawn, just without
      its corner radius, which is why vvShimInsetRims exists and why this is not a substitute
      for looking at a captured PNG.  */
  let H2C_WARNED = false;
  function vvAuditCaptureSupport(node){
    if (H2C_WARNED || typeof getComputedStyle === 'undefined') return [];
    const hits = [];
    const all = [node].concat(Array.prototype.slice.call(node.querySelectorAll('*')));
    all.forEach(function(el){
      const cs = getComputedStyle(el);
      H2C_UNSUPPORTED.forEach(function(f){
        const v = String(cs[f.prop] || '');
        if (!v || v === 'none' || v === 'normal') return;
        if (f.skip && f.skip(v)) return;
        hits.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
                     ? '.' + el.className.trim().split(/\s+/)[0] : ''), feature: f.label, value: v.slice(0, 60) });
      });
    });
    if (hits.length){
      H2C_WARNED = true;
      try { console.warn('[vv] the share capture cannot draw these , they will be MISSING from the PNG:', hits); } catch(e){}
    }
    return hits;
  }

  function vvRenderShareImage(spec, opts){
    opts = opts || {};
    const F = SHARE_FORMATS[opts.format] || SHARE_FORMATS[spec.kind === 'compare' ? 'x' : 'igf'];
    const light = (opts.light != null) ? opts.light
                : (typeof document !== 'undefined' && document.body.classList.contains('light'));
    vvInjectShareCSS();
    return vvLoadH2C().then(function(){
      const stage = document.createElement('div');
      stage.className = 'sf-stage';
      stage.innerHTML = vvShareFrameHTML(spec, F, light);
      document.body.appendChild(stage);
      const frame = stage.firstElementChild;
      vvCentreShareCaption(frame);
      vvAuditCaptureSupport(frame);
      const undoMarks = vvInlineMarks(frame), undoRims = vvShimInsetRims(frame);
      return html2canvas(frame, { backgroundColor: null, scale: 2, useCORS: true, logging: false })
        .then(function(cv){
          return new Promise(function(res){ cv.toBlob(function(b){ res({ blob: b, format: F }); }, 'image/png'); });
        })
        .finally(function(){ undoRims(); undoMarks(); stage.remove(); });
    });
  }

  /*  ── CLIPBOARD, WITH A BOUNDED WAIT ───────────────────────────────────────────
      navigator.clipboard.writeText() RETURNS A PROMISE THAT CAN NEVER SETTLE. Measured on
      a real browser: with the document hidden it stays PENDING indefinitely , not rejected,
      pending. So `writeText().then(ok, fail)` is not a safe way to drive a UI: neither
      branch ever runs and the control sits there having done nothing at all.

      THAT IS A WORSE FAILURE THAN THE ONE IT REPLACED. The previous code set the label
      synchronously and lied when the write failed; awaiting the promise stopped the lie and
      introduced a silent hang. Both are wrong. §C says a success state must be gated on a
      RESOLVED, CHECKED response , the missing half is that a response which never arrives
      must still resolve the UI, as a failure.

      So the wait is bounded. If the write has not confirmed in time we report FAILURE, never
      success, and the control always reaches a definite state.  */
  function vvCopyText(text, ms){
    if (typeof navigator === 'undefined' || !(navigator.clipboard && navigator.clipboard.writeText))
      return Promise.resolve(false);
    return new Promise(function(res){
      let settled = false;
      const done = function(v){ if (!settled){ settled = true; clearTimeout(timer); res(v); } };
      const timer = setTimeout(function(){ done(false); }, ms || 1200);
      try { navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); }); }
      catch(e){ done(false); }
    });
  }

  //  ── TOAST ──────────────────────────────────────────────────────────────────────
  //  Replaces alert(). alert() BLOCKS the page and, in an automated browser, wedges the
  //  whole session until a human dismisses it , which happened during this build. It is
  //  also the wrong register for a success message.
  let TOAST_T = null;
  function vvToast(msg, ms){
    if (typeof document === 'undefined') return;
    vvInjectShareCSS();
    let t = document.getElementById('vvToast');
    if (!t){ t = document.createElement('div'); t.id = 'vvToast'; t.className = 'vvtoast';
             t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
             document.body.appendChild(t); }
    t.textContent = msg;
    // SIT ABOVE THE BOTTOM NAV RATHER THAN ON IT. card.html and compare.html both carry a
    // fixed .bottomnav, and at a phone width a toast pinned to 26px lands squarely on the
    // nav , unreadable, and it covers the controls the message is telling you about. The
    // nav's height is read at show time because it is display:none on wide viewports, so a
    // hardcoded offset would leave a gap on desktop.
    let lift = 26;
    const nav = document.querySelector('.bottomnav');
    if (nav){ const nb = nav.getBoundingClientRect();
              // The height is CLAMPED to a plausible nav. A nav forced visible outside its
              // own media query measured 1123px here, which lifted the toast clean off the
              // top of the screen , a message nobody can read is worse than one sitting a
              // little low. Anything over a quarter of the viewport is not a bottom nav.
              const sane = nb.height > 0 && nb.height <= window.innerHeight * 0.25;
              if (sane && nb.bottom >= window.innerHeight - 2) lift = Math.round(nb.height) + 16; }
    t.style.bottom = lift + 'px';
    // FORCE A REFLOW, DO NOT WAIT FOR A FRAME. Reading offsetWidth commits the off-state so
    // the transition has something to run from; adding the class in a requestAnimationFrame
    // callback does the same thing ONLY IF a frame is produced, and a throttled or
    // non-compositing tab produces none , the toast then sits at opacity 0 indefinitely
    // with its class never applied. Measured that way during this build and mistaken for a
    // CSS fault. This form has no such dependency.
    void t.offsetWidth;
    t.classList.add('on');
    clearTimeout(TOAST_T);
    TOAST_T = setTimeout(function(){ t.classList.remove('on'); }, ms || 3400);
  }

  //  ── THE SHARE CHAIN ────────────────────────────────────────────────────────────
  //  Three rungs, each a real degradation rather than a retry of the same thing:
  //    1. share the FILE , the only rung that puts the image in Instagram or a DM
  //    2. share the LINK , no file support, but the OS sheet still opens
  //    3. download the file AND copy the text , no sheet at all, so hand the user both
  //       halves and SAY SO. Deciding rung 1 needs canShare({files}) specifically:
  //       navigator.share existing does NOT mean files are accepted, and calling share
  //       with an unsupported file rejects.
  //  NOTHING REPORTS SUCCESS BEFORE ITS PROMISE RESOLVES , see §C. An AbortError is the
  //  user closing the sheet, which is not a failure and must not fall through to a rung
  //  that downloads a file they did not ask for.
  /* ── CAPABILITY, SO A CONTROL NEVER PROMISES WHAT THE BROWSER CANNOT DO ──────
     Returns 'files' (rung 1, the image itself goes out), 'link' (rung 2, the OS sheet
     opens with a URL , still genuinely sharing), or 'none' (rung 3, which DOWNLOADS and
     copies the caption, and is not sharing by any reading).

     A button reading "Share" that downloads a file is the same defect class as a waitlist
     thanking someone for an email it never sent: the control reports an outcome that did
     not happen. §C already says a success state must be gated on a resolved, checked
     response; this is the same rule one step earlier, at the PROMISE rather than the
     report. Desktop Chrome has neither navigator.share nor canShare, so 'none' is not an
     edge case , it is every desktop visitor.

     The probe builds a 1-byte PNG File because canShare() inspects the file TYPE, not its
     contents, and asking with no file at all answers a different question. */
  function vvShareCapability(){
    try {
      if (typeof navigator === 'undefined') return 'none';
      if (navigator.canShare && typeof File !== 'undefined'){
        const probe = new File([new Uint8Array(1)], 'p.png', { type: 'image/png' });
        if (navigator.canShare({ files: [probe] })) return 'files';
      }
      if (navigator.share) return 'link';
    } catch(e){}
    return 'none';
  }
  /* Relabels one control to match the capability. Takes the two labels rather than
     inventing copy, so the wording stays with the surface that owns it. The icon is
     swapped too where the caller supplies one: a share glyph over a download is the same
     false promise in pictures. */
  function vvShareLabel(el, shareLabel, saveLabel, opts){
    if (!el) return 'none';
    opts = opts || {};
    /* THE CAPABILITY MAY BE PASSED IN. Left to derive its own, this function asked
       "cap === 'none'" while vvApplyShareCapability asks "can the FILE go", and the two
       disagree on the middle rung , share exists, files refused. That is the two-fields-for-
       one-concept defect in §C: the button said "Share this verdict" while the hint beside it
       said save-and-attach. One decision, made once, passed down. */
    const cap = opts.cap || vvShareCapability();
    const txt = (cap === 'files') ? shareLabel : saveLabel;
    if (opts.textNode){
      // the label is a bare text node beside an inline <svg>, so setting textContent
      // would delete the icon
      const n = el.childNodes[el.childNodes.length - 1];
      if (n && n.nodeType === 3) n.nodeValue = txt;
    } else if (opts.span){
      const sp = el.querySelector(opts.span); if (sp) sp.textContent = txt;
    } else {
      el.textContent = txt;
    }
    if (opts.saveIcon && cap !== 'files'){
      const svg = el.querySelector('svg'); if (svg) svg.outerHTML = opts.saveIcon;
    }
    el.setAttribute('data-vv-cap', cap);
    return cap;
  }

  /*  ── THE CONTROL SET FOLLOWS CAPABILITY, NOT PLATFORM ────────────────────────
      ONE FACT DRIVES ALL OF IT: a web page cannot attach a file to an X or WhatsApp post.
      The intent URLs those buttons use carry TEXT and a LINK and nothing else. There is no
      workaround, so the controls say so instead of pretending.

      canShare({files}) TRUE , the OS sheet can carry the image itself. That is the whole
      feature, so it gets ONE button and the per-platform buttons are REMOVED: tapping "X"
      there would route around the sheet and post a link INSTEAD of the image, which is
      strictly worse than the thing sitting next to it.

      canShare({files}) FALSE , the image cannot leave programmatically at all. The honest
      offer is: save it, take the caption, attach it yourself. The per-platform buttons stay
      but are marked link-only, because that is genuinely all they can do.

      The middle rung (share exists, files do not) is grouped with FALSE deliberately: what
      decides the layout is whether the IMAGE can go, and on that question rung 2 is a no.

      DOM CONTRACT , data-vvshare="main" | "social" | "hint". Attributes, not classes, so a
      restyle cannot silently unhook the behaviour.  */
  function vvApplyShareCapability(root, opts){
    if (!root) return 'none';
    opts = opts || {};
    const cap = vvShareCapability();
    const filesOK = (cap === 'files');
    const main = root.querySelector('[data-vvshare="main"]');
    if (main) vvShareLabel(main, opts.shareLabel || 'Share', opts.saveLabel || 'Save image',
                           { textNode: !!opts.textNode, saveIcon: opts.saveIcon, cap: cap });
    root.querySelectorAll('[data-vvshare="social"]').forEach(function(el){
      el.hidden = filesOK;
      el.style.display = filesOK ? 'none' : '';
      const base = el.getAttribute('data-vvshare-name') || el.getAttribute('aria-label') || '';
      if (!el.getAttribute('data-vvshare-name')) el.setAttribute('data-vvshare-name', base);
      // says what it actually does, on the control itself, for anyone who hovers or listens
      el.setAttribute('aria-label', filesOK ? base : (base + ' , posts a link only, without the image'));
      el.setAttribute('title', filesOK ? base : (base + ' , posts a link only'));
    });
    const hint = root.querySelector('[data-vvshare="hint"]');
    if (hint) hint.textContent = filesOK
      ? (opts.hintShare || 'Sends the image itself , Instagram, X, WhatsApp and anywhere else you share.')
      : (opts.hintSave  || 'Saves the image and copies the caption. Attach the image to your post yourself , a web page cannot attach it for you.');
    root.setAttribute('data-vvshare-cap', cap);
    return cap;
  }

  function vvShareCompose(spec, opts){
    opts = opts || {};
    const text = opts.text || vvShareCaption(spec);
    const url  = opts.url  || (typeof location !== 'undefined' ? location.href : '');
    const name = (opts.filename || 'vvonderxi') + '.png';
    const onDone = opts.onDone || function(){};

    function fallbackLink(){
      if (navigator.share) {
        return navigator.share({ title: 'VVonderXI', text: text, url: url })
          .then(function(){ onDone('link'); })
          .catch(function(e){ if (e && e.name === 'AbortError'){ onDone('cancelled'); return; } return dropAndCopy(null); });
      }
      return dropAndCopy(null);
    }
    function dropAndCopy(blob){
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + '\n' + url);
        copied = true;
      } catch(e){}
      if (blob){
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = href; a.download = name; a.click();
        setTimeout(function(){ URL.revokeObjectURL(href); }, 1000);
        vvToast(copied ? 'Image saved, and the caption is on your clipboard , paste it with the post.'
                       : 'Image saved to your downloads.');
        onDone('download');
      } else {
        vvToast(copied ? 'Link copied , paste it anywhere to share.'
                       : 'Sharing is not available in this browser.');
        onDone(copied ? 'copied' : 'unavailable');
      }
      return Promise.resolve();
    }

    return vvRenderShareImage(spec, opts).then(function(out){
      const blob = out && out.blob;
      if (!blob) return fallbackLink();
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })){
        return navigator.share({ files: [file], title: 'VVonderXI', text: text })
          .then(function(){ onDone('file'); })
          .catch(function(e){ if (e && e.name === 'AbortError'){ onDone('cancelled'); return; } return dropAndCopy(blob); });
      }
      // RUNG 2, and it is a REAL rung , not a synonym for rung 3. A browser can have
      // navigator.share and still refuse files, and on that browser the OS sheet still
      // opens for a link, which is a better answer than a silent download. Falling
      // straight through to dropAndCopy here was the first version's bug and it
      // contradicted the comment directly above it.
      if (navigator.share){
        return navigator.share({ title: 'VVonderXI', text: text, url: url })
          .then(function(){ onDone('link'); })
          .catch(function(e){ if (e && e.name === 'AbortError'){ onDone('cancelled'); return; } return dropAndCopy(blob); });
      }
      return dropAndCopy(blob);
    }).catch(function(){ return fallbackLink(); });
  }

  const api = { inkFor, luma, shieldSplit, buildCard, useCardMarks, vvInlineMarks, vvShimInsetRims, vvLoader, vvInjectLoaderCSS, VV_LOADER_MIN, VV_WAIT, SHARE_FORMATS, SH_TYPE, vvCopyText, vvAuditCaptureSupport, vvShareCapability, vvShareLabel, vvApplyShareCapability, vvShareFrameHTML, vvShareCaption, vvRenderShareImage, vvShareCompose, vvToast, vvInjectShareCSS, VERDICT_SHARE_NAME, verdictShareName, renderTagPills, renderPrestige, getVVTags, TAG_DEFS, rowToCard, fmtSeason, surnameOf, vvDisplayName, flagFor,
                vvNorm, tokenAndFilter, rankBySearch, vvParseSearch, vvSeasonLabel, searchFieldToken, SEARCH_CEIL,
                vvSeasonFromBareYear,
                FILTER_TAXONOMY, renderFilterChips, VERDICT_TAGS, verdictContext,
                bandFor, prestigeFor, posDisplay, posFull, radarFor, confidenceFor, confidenceFields, keeperScore, keeperPanelHTML, vvAIStats, vvClient,
                fetchHonours, HONOUR_META, HONOUR_ONELINER, HONOUR_GROUP_ORDER,
                renderHonourChips, renderHonourRows, renderTopHonourPill, HONOUR_ICON, HONOUR_CHIP_LABEL,
                attachHonoursBatch, shapeHonoursForCard, renderHonourPillsCompact, emptyHonours,
                loadTeamHonours, teamHonoursFor, honTeamNorm,
                honourRowHTML, renderWonderTagsGrouped, HONOUR_DRURY, renderTrajectory, renderProfileTagRows,
                rankRowHTML, rowShieldHTML, vvCardFlip, vvBackFace,
                VVFilters, VVSeq };
  for (const k in api) root[k] = api[k];   // globals, matching the inline-copy call sites
  root.VVCore = api;                        // namespaced handle
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
