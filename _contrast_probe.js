/*  CONTRAST PROBE , CSS-COMPOSITED, FOR BUTTONS, CHIPS AND PILLS. Load it on a surface and call
    window.__contrastSweep(). It reports a ratio per element, per theme.
    ================================================================
    WHY IT EXISTS BESIDE `_pixel_audit.js` RATHER THAN REPLACING IT. The pixel harness reads the
    RENDERED ground and is the right instrument for text on a gradient or a photo. It cannot read
    a self-painting control reliably: on gold-on-gold chips it clustered the chip's own fill as the
    ground and reported 2.39 where arithmetic says 4.37, and on the pink CTA it returned 19.34 in
    one theme and 3.47 in the other for an element whose colours do not change with the theme.
    This probe composites the CSS instead, which is exact for solid and gradient fills and blind to
    images , so the two are complementary and neither is the answer everywhere.

    THREE FAULTS IT EXISTS TO AVOID, ALL PAID FOR ON 2026-09-21:

    1. CSS TRANSITIONS DO NOT PROGRESS IN A HIDDEN TAB. A themed element stays frozen at the
       PREVIOUS theme's values indefinitely, so every read after a toggle is of the wrong state.
       This is what produced a whole day of contradictions on compare: the same element read 2.66,
       13.93, 1.26 and 5.87, and a freshly created clone of it computed a different colour from the
       original in the same parent, which is the tell. killTransitions() runs before any read.

    2. SETTLE ON EVIDENCE, NEVER ON A FIXED WAIT. The evidence is a TOKEN (--ink-soft, #a49d93 dark
       against #5f594e light), not a background: a panel that is cream in both themes cannot tell
       you which theme is applied, and card faces deliberately do not flip at all.

    3. AN ELEMENT THAT PAINTS ITS OWN GRADIENT IS ITS OWN GROUND. Walking to the ancestor for those
       reported the CARD behind a gold chip and the PAGE behind the pink CTA. Every stop is scored
       and the WORST is returned, flagged `bound:true` , the glyphs may not sit on the worst stop,
       so a bound is not a reading and must not be quoted as one.
*/
(function(global){
  const P = c => (String(c).match(/[\d.]+/g) || []).map(Number);
  const lum = (r,g,b) => { const f=[r,g,b].map(v=>v/255).map(x=>x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4));
    return .2126*f[0]+.7152*f[1]+.0722*f[2]; };
  const ratio = (a,b) => { const x=lum(...a), y=lum(...b); return +(((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)); };
  const over = (fg,a,bg) => [0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));

  function killTransitions(){
    if (document.getElementById('vvprobe-kill')) return;
    const k=document.createElement('style'); k.id='vvprobe-kill';
    k.textContent='*,*::before,*::after{transition:none !important;animation:none !important}';
    document.head.appendChild(k);
  }

  async function setTheme(theme){
    killTransitions();
    document.body.classList.toggle('light', theme==='light');
    document.querySelectorAll('*').forEach(e=>{ if(e.getAnimations) e.getAnimations().forEach(a=>{ try{a.finish();}catch(x){} }); });
    const want = theme==='light' ? '5f594e' : 'a49d93';
    for (let i=0;i<60;i++){
      const v=getComputedStyle(document.body).getPropertyValue('--ink-soft').trim().toLowerCase();
      if (v.includes(want)) return { ok:true, frames:i };
      await new Promise(r=>requestAnimationFrame(r));
    }
    return { ok:false };
  }

  function ownGradientStops(cs){
    const bi = cs.backgroundImage || 'none';
    if (bi === 'none' || /url\(/.test(bi)) return null;
    const stops=(bi.match(/rgba?\([^)]*\)/g)||[]).map(P).filter(c=>c.length<4||c[3]>=0.999).map(c=>c.slice(0,3));
    return stops.length ? stops : null;
  }

  // Walk up compositing translucent layers until an opaque ground is found; fall back to the
  // page's own gradient stops, worst case, rather than inventing white.
  function groundOf(el){
    const stack=[]; const ownA=P(getComputedStyle(el).backgroundColor);
    if (ownA.length===3) return [ownA];
    if (ownA.length>3 && ownA[3]>0) stack.push([ownA.slice(0,3), ownA[3]]);
    let n=el.parentElement;
    while(n){
      const cs=getComputedStyle(n); const bc=P(cs.backgroundColor);
      if (bc.length===3 || (bc.length>3 && bc[3]>=0.999)){
        let cur=bc.slice(0,3);
        for(let i=stack.length-1;i>=0;i--) cur=over(stack[i][0],stack[i][1],cur);
        return [cur];
      }
      if (bc.length>3 && bc[3]>0) stack.push([bc.slice(0,3), bc[3]]);
      n=n.parentElement;
    }
    const page=ownGradientStops(getComputedStyle(document.body));
    if(!page) return null;
    return page.map(base=>{ let cur=base; for(let i=stack.length-1;i>=0;i--) cur=over(stack[i][0],stack[i][1],cur); return cur; });
  }

  function measure(el){
    const cs=getComputedStyle(el);
    const px=parseFloat(cs.fontSize), w=parseInt(cs.fontWeight)||400;
    const bar=(px>=24||(px>=18.66&&w>=700))?3:4.5;
    const ia=P(cs.color);
    const own=ownGradientStops(cs);
    const grounds = own || groundOf(el);
    if(!grounds) return { skip:'no opaque ground anywhere in the chain' };
    const rs=grounds.map(g=>ratio(ia.length>3?over(ia.slice(0,3),ia[3],g):ia.slice(0,3), g));
    return { ratio:Math.min(...rs), all:rs, bound:!!own||grounds.length>1, bar, px, ink:cs.color,
             ground: own ? ('own gradient, worst of '+own.length+' stops') : grounds[0].map(Math.round).join(',') };
  }

  const SEL='button, .vvf-chip, .chip, .chtagcell, .mvtag, .eflabel, .vchip, .vtag, .settle,'
          + ' .vshare-main, .ca-compare, .cm-mk, .pkchip, .fopt, [class*=chip], [class*=pill], [class*=btn]';
  const visible = e => {
    const r=e.getBoundingClientRect(); if(r.width<6||r.height<6) return false;
    let n=e; while(n&&n!==document.body){ const c=getComputedStyle(n);
      if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0) return false; n=n.parentElement; }
    return true;
  };

  global.__contrastSweep = async function(opts){
    opts=opts||{};
    const out={ surface:location.pathname };
    for(const theme of ['dark','light']){
      const st=await setTheme(theme);
      const fails=[], skips=[], seen=new Set(); let pass=0, n=0;
      for(const el of [...document.querySelectorAll(opts.sel||SEL)].filter(visible)){
        if(!el.textContent.trim()) continue;
        const m=measure(el); n++;
        const key=(el.className||el.tagName).toString().split(' ').slice(0,2).join('.');
        if(m.skip){ if(!seen.has(key)){ seen.add(key); skips.push({sel:key.slice(0,26), why:m.skip}); } continue; }
        if(m.ratio<m.bar){ if(!seen.has(key)){ seen.add(key);
          fails.push({sel:key.slice(0,26), txt:el.textContent.trim().slice(0,18), px:m.px, bar:m.bar,
                      ratio:m.ratio, bound:!!m.bound, ink:m.ink, ground:m.ground}); } }
        else pass++;
      }
      out[theme]={ settled:st.ok, measured:n, passCount:pass, fails, skips };
    }
    await setTheme('dark');
    return out;
  };
  global.__contrastMeasure = measure;
  global.__contrastSetTheme = setTheme;
})(window);
