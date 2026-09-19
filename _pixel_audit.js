/*  PIXEL CONTRAST HARNESS , THE INSTRUMENT A14 HAS ASKED FOR TWICE AND NEVER HAD.
    ================================================================================
    WHY IT HAD TO EXIST. `_audit.js` walks CSS ancestors for a ground. That works only where
    some ancestor paints a solid colour, and three of this platform's surfaces do not:
    playbook and vvindex paint via a background-IMAGE on `body` over a transparent base with
    `html` transparent too, and the CARD FACE is a radial-gradient with
    `background-color: rgba(0,0,0,0)`. On those the walker either falls through to nothing or
    composites the gradient and scores its WORST STOP , which is a BOUND, not a reading. The
    compare CTA proved the cost: worst-stop said 2.16 where the glyphs actually sit at 2.77.
    A bound that understates by 0.6 cannot carry a ruling, and four chip ratios sit within
    0.3 of the bar.

    WHAT IT DOES. Renders the element's host to a canvas via html2canvas, crops to the
    element's own box, and separates INK from GROUND by pixel population rather than by the
    cascade. The ground is the modal colour cluster; the ink is the cluster furthest from it
    in luminance that still holds a real share of the crop.

    THE FOUR THINGS THAT MADE EARLIER ATTEMPTS FAIL, ALL FIXED HERE AND ALL RECORDED IN A14:
      1. NEAREST-CLUSTER INK picks an antialiased EDGE tone , it read .pspot at 1.92 against
         its known 3.89. Ink is the FURTHEST cluster, not the nearest.
      2. AN INK FLOOR EXPRESSED AS A SHARE silently fails on sparse text in a wide box. An
         11px label in a 1,324px row never reaches 2%, no candidate qualifies, the ground is
         returned as its own ink and it reads 1.00 , indistinguishable from invisible text.
         The floor is ABSOLUTE: max(25 device px, 0.05%).
      3. ONE CAPTURE PER SURFACE drifts. html2canvas returned 20090px where the DOM box was
         18732px, so every crop lands on flat background. Capture PER HOST, and ASSERT the
         bitmap height matches the host box , mismatched hosts are VOIDED, never reported.
      4. THE BACKDROP MUST BE THE HOST'S OWN GROUND, not the page's. `.layer-b-inner` is
         transparent and takes its cream from an ancestor; capturing it against the page base
         put cream-panel text on a dark backdrop and produced 17 false failures.

    AND IT DECLARES WHAT IT CANNOT SEE. html2canvas draws NO SVG here, so SVG text comes back
    as a flat band and reads 1.00 as an ARTEFACT. SVG is EXCLUDED and listed, not silently
    included , SS C's rule is that ink is `fill`, the ground is sibling geometry by hit-test,
    and a stroke counts toward legibility, none of which a pixel crop can answer.

    USE, from a page that has html2canvas loaded (card/compare do; others get it injected):
        await __pixelAudit({ host:'.vvcard', sel:'.chtag' })
        await __pixelAudit({ controls:true })      // reproduce .pspot 3.89 before trusting anything
*/
(function(){
  'use strict';
  const LUM = c => { const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const CR = (a,b) => { const l1=LUM(a), l2=LUM(b);
    return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2)); };

  async function ensureH2C(){
    if (window.html2canvas) return true;
    const urls=['/vendor/html2canvas.min.js','https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];
    for(const u of urls){ try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src=u; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); if(window.html2canvas) return true; }catch(e){} }
    return false;
  }

  /*  The first ancestor that actually PAINTS. Not the page , see failure 4 above. */
  function opaqueGround(el){
    let p = el;
    while (p && p !== document.documentElement){
      const cs = getComputedStyle(p), bc = cs.backgroundColor;
      if (bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bc)) return bc;
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;  // painted, but not a flat colour
      p = p.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || '#ffffff';
  }

  function clusters(data, w, h){
    const bins = new Map();
    for (let i=0;i<data.length;i+=4){
      if (data[i+3] < 200) continue;                     // skip transparent
      const k = (data[i]>>3)+','+(data[i+1]>>3)+','+(data[i+2]>>3);
      let b = bins.get(k);
      if (!b) bins.set(k, b = {n:0, r:0, g:0, bl:0});
      b.n++; b.r+=data[i]; b.g+=data[i+1]; b.bl+=data[i+2];
    }
    return [...bins.values()].map(b=>({ n:b.n, c:[Math.round(b.r/b.n),Math.round(b.g/b.n),Math.round(b.bl/b.n)] }))
                             .sort((x,y)=>y.n-x.n);
  }

  /*  Read the page's own rendered colour next to a box. Returns a css rgb() string, or null
      if the capture cannot be trusted , never a guess.  */
  async function sampleGround(hr){
    try{
      const dpr = 1;
      const W = 10, H = Math.max(4, Math.min(40, Math.round(hr.height)));
      // a strip immediately LEFT of the host, clamped into the viewport
      let x = Math.round(hr.left - W - 2);
      if (x < 0) x = Math.round(hr.right + 2);
      if (x < 0 || x + W > document.documentElement.scrollWidth) return null;
      const y = Math.round(hr.top + window.scrollY);
      const c = await window.html2canvas(document.body, { backgroundColor:null, scale:dpr,
        logging:false, x, y, width:W, height:H, scrollX:0, scrollY:0,
        windowWidth:document.documentElement.clientWidth });
      if (!c || !c.width || !c.height) return null;
      const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      const cl = clusters(d, c.width, c.height);
      if (!cl.length) return null;
      const g = cl[0].c;
      return 'rgb(' + g[0] + ',' + g[1] + ',' + g[2] + ')';
    }catch(e){ return null; }
  }

  async function measure(el, opts){
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return { skip:'zero box' };
    if (el.closest('svg')) return { skip:'SVG , excluded by declaration, not measurable this way' };
    const cs = getComputedStyle(el);
    if (+cs.opacity === 0 || cs.visibility === 'hidden') return { skip:'not painted' };
    // a zero-height ancestor paints nothing and reads 1.00
    for (let p=el.parentElement;p;p=p.parentElement){ const pr=p.getBoundingClientRect();
      if (pr.height === 0) return { skip:'zero-height ancestor' }; if (p===document.body) break; }

    const host = (opts.host && el.closest(opts.host)) || el.parentElement || el;
    const hr = host.getBoundingClientRect();
    /*  FAILURE 5, FOUND 2026-09-19 ON PLAYBOOK , AN UNRESOLVABLE BACKDROP MUST VOID, NOT
        REPORT. `opaqueGround` returns null when the nearest painting ancestor uses a
        background-IMAGE, and the old fallback was `document.body`'s background-color , which
        on playbook and vvindex is `rgba(0,0,0,0)`. html2canvas then composited the host onto
        TRANSPARENT, so the crop's modal cluster was not the rendered ground at all and every
        element on those pages read 1.2 to 2.3 on text that is plainly legible.
        THAT IS THE SAME CLASS OF ERROR THE CSS WALKER MAKES ON THESE PAGES, arrived at by a
        different route, and it would have been reported as five confident failures. A harness
        whose ground is unknown must say so , SS C: a guard that never fires is
        indistinguishable from one that does not work, and a WRONG ground is worse than none.  */
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const bodyOpaque = bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent';
    /*  AND WHERE NOTHING PAINTS A FLAT COLOUR, SAMPLE THE PAGE AS RENDERED , added
        2026-09-19, closing the void that left playbook and vvindex unmeasured.
        Those pages DO paint a ground, just not as a background-color: playbook's `body`
        stacks thirteen gradients ending in an opaque linear-gradient between --page-1 and
        --page-3. So the colour is real, it is position-dependent, and it can only be read
        by rendering it. `sampleGround` captures a small strip of BODY beside the host and
        takes its modal cluster , body is what paints, so the strip contains the true ground.
        IT SAMPLES BESIDE THE HOST, NOT INSIDE IT, so text cannot contaminate the sample, and
        it crops rather than capturing the page , a full-body capture is the drift failure
        already recorded above (20090px against an 18732px box).
        `opts.backdrop` overrides it, which is the one-parameter escape for any surface where
        even this is wrong.  */
    let backdrop = opts.backdrop || opaqueGround(host) || (bodyOpaque ? bodyBg : null);
    if (!backdrop) backdrop = await sampleGround(hr);
    if (!backdrop) return { skip:'VOID , no backdrop resolvable and the page sample failed' };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = await window.html2canvas(host, { backgroundColor: backdrop, scale: dpr,
      logging:false, useCORS:true, width:Math.ceil(hr.width), height:Math.ceil(hr.height) });

    // FAILURE 3: assert the bitmap matches the host box, or void this element.
    const expect = Math.ceil(hr.height)*dpr, got = canvas.height;
    if (Math.abs(expect-got) > 2*dpr) return { skip:'VOID , bitmap '+got+' vs host '+expect };

    const x = Math.round((r.left-hr.left)*dpr), y = Math.round((r.top-hr.top)*dpr);
    const w = Math.max(1,Math.round(r.width*dpr)), h = Math.max(1,Math.round(r.height*dpr));
    if (x<0||y<0||x+w>canvas.width||y+h>canvas.height) return { skip:'crop outside host' };
    const ctx = canvas.getContext('2d');
    const px = ctx.getImageData(x,y,w,h).data;
    const cl = clusters(px,w,h);
    if (!cl.length) return { skip:'no opaque pixels' };

    const ground = cl[0];
    // FAILURE 2: absolute floor, not a share.
    const floor = Math.max(25, Math.round(w*h*0.0005));
    // FAILURE 1: ink is the FURTHEST cluster by luminance that clears the floor.
    /*  ACCUMULATE THE INK CORE RATHER THAN DEMANDING ONE FAT BIN , FIXED 2026-09-19 after the
        first playbook run declined `em`, `span.mut` and `span.lgpc`. 3-bit binning splits
        ANTIALIASED small text across many bins, so at 8 to 11px no single bin clears the
        absolute floor and the element reads as unmeasurable. Requiring one bin therefore
        fails on exactly the text this harness exists to judge , the chips are 8.5 to 11px.
        SO: take every non-ground bin, order by luminance DISTANCE from the ground (furthest
        first , failure 1 still holds, the nearest bins are the antialiased edge), and
        accumulate until the floor is met. The ink is the count-weighted mean of that core.
        This keeps both earlier guarantees: the edge tones are added LAST and only if the
        core is still short, and the floor stays ABSOLUTE. The control is what proves it ,
        `.pspot` must still read 3.89 after this change, or the change is wrong.  */
    const cand = cl.slice(1).map(c => ({ c:c.c, n:c.n, d:Math.abs(LUM(c.c) - LUM(ground.c)) }))
                            .sort((a,b) => b.d - a.d);
    let acc = 0, R = 0, G = 0, B = 0;
    for (const c of cand){
      if (acc >= floor) break;
      acc += c.n; R += c.c[0]*c.n; G += c.c[1]*c.n; B += c.c[2]*c.n;
    }
    const ink = acc >= floor ? { n:acc, c:[Math.round(R/acc), Math.round(G/acc), Math.round(B/acc)] } : null;
    if (!ink) return { skip:'no ink mass above the absolute floor , nothing painted in this crop' };
    return { ratio: CR(ink.c, ground.c), ink:ink.c, ground:ground.c,
             inkPx:ink.n, groundPx:ground.n, floor, px:cs.fontSize, weight:cs.fontWeight,
             text:(el.textContent||'').trim().slice(0,22) };
  }

  window.__pixelAudit = async function(opts){
    opts = opts || {};
    if (!(await ensureH2C())) return { error:'html2canvas unavailable , cannot run the pixel method' };
    const out = { controls:{}, results:[], skipped:[] };

    /*  CONTROLS FIRST, ALWAYS. A14: an instrument that cannot reproduce .pspot 3.89 is not
        evidence about anything else on the page. .prenum is NOT a valid control here , it is
        background-clip:text over a fading gradient, so it has no single ink.  */
    const ctl = document.querySelector('.pspot');
    if (ctl){ const m = await measure(ctl,{}); out.controls.pspot = m.ratio!=null ? m.ratio : m;
      out.controls.pspotExpected = 3.89;
      out.controls.pass = m.ratio!=null && Math.abs(m.ratio-3.89) <= 0.25; }
    else out.controls.pspot = 'absent on this surface';

    const els = [...document.querySelectorAll(opts.sel || 'body *')].filter(e=>{
      if (opts.sel) return true;
      const t=[...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim());
      return t && e.getBoundingClientRect().width>0;
    }).slice(0, opts.limit || 40);

    for (const el of els){
      const m = await measure(el, opts);
      if (m.skip) { out.skipped.push({ sel:el.tagName.toLowerCase()+'.'+(el.className||'').toString().split(' ')[0], why:m.skip }); continue; }
      out.results.push(Object.assign({ sel:el.tagName.toLowerCase()+'.'+(el.className||'').toString().split(' ')[0] }, m));
    }
    out.results.sort((a,b)=>a.ratio-b.ratio);
    return out;
  };
})();
