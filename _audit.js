// THEME-CONTRAST AUDIT , read-only QA harness. Inject per page, call __vvAudit().
//
// WHY THIS EXISTS: elements coloured for one theme that never got the other theme's override
// render invisible (contrast ~1.0). Normal sweeps miss them for three reasons, all handled here.
//
// 1. COLLAPSED CONTAINERS. .drurybox-q lives behind max-height:0 + overflow:hidden, so a naive
//    walk skips it or measures it at zero height. This force-opens <details> and .open first.
// 2. TRANSITIONS. Toggling the theme animates background/colour, and getComputedStyle mid-flight
//    returns an INTERPOLATED value. That produced 13 phantom mid-grey failures on playbook before
//    transitions were killed (13 -> 5 real). See §C: never assert a mid-transition computed value.
// 3. GRADIENT SURFACES. VV card faces are painted with club-colour gradients, so backgroundColor
//    is transparent and a naive walk falls through to the page , which made .cname/.ctop/.col
//    "fail" in BOTH themes with opposite colours, an impossible result.
//
// [FIXED 2026-09-06] THE GRADIENT GUARD USED TO RETURN null AND DROP THE ELEMENT, AND THAT MADE
// THIS HARNESS REPORT A FALSE CLEAN, WHICH IS WORSE THAN NO HARNESS. Run on compare.html in dark
// it returned ZERO failures and 151 unmeasurable, because .vsect paints a green gradient and the
// whole panel was silently discarded , the exact panel carrying every known failure. A tool that
// answers "clean" when it means "I did not look" cannot be used as a gate.
// Gradients are now COMPOSITED: every rgb()/rgba() stop is parsed and the element is scored
// against EVERY stop, with the WORST ratio reported. That is the honest bound for a light ink on
// a dark gradient and it reproduced two figures recorded independently by 13c5fc0 (.tjcap 5.47
// dark, 5.90 light) to the second decimal. Only a background-IMAGE with no parseable stop (a
// url(), a conic/radial with named colours) is still unmeasurable.
//
// 4. [ADDED 2026-09-06] ELEMENT OPACITY COMPOUNDS WITH THE INK ALPHA AND WAS NOT READ AT ALL.
//    .h2hnr .h2hlabel is var(--vs-muted) at 0.80 under opacity:.6, so its effective alpha is
//    0.48 and it measures 2.75, not the 4.79 the token implies. 13c5fc0 recorded that class as
//    fixed by the token BECAUSE the surveys measured the ink and ignored the element. Opacity is
//    now accumulated up the ancestor chain and folded into the alpha.
//
// 5. [ADDED 2026-09-06] SVG TEXT WAS SKIPPED ENTIRELY. The tag list skipped SVG/TEXT/TSPAN, so
//    .tjpeak , pinned #E8B84B, measuring 1.74 on the light panel , was invisible to every run.
//    SS C: on SVG the ink is `fill`, not `color`. text/tspan are now walked and read via fill.
//
// LIMIT OF THE WORST-STOP RULE , READ THIS BEFORE FILING A GRADIENT FAILURE. Scoring against
// every stop and keeping the worst is a LOWER BOUND, not the ratio at the glyphs: on a 135deg
// button gradient the text may sit entirely over the dark end and read far better than the
// number here. It is the right bound for a large panel like .vsect, where text genuinely spans
// the whole gradient, and it is pessimistic for a small control. The pink CTAs (.settle,
// .vshare-main, white on linear-gradient(#E70443,#FF8FA3)) report 2.16 for exactly this reason.
// SS C already records this family being got wrong in BOTH directions , a self-painting button
// grounded against its parent under-reported and produced a false PASS. Confirm a gradient
// finding against the rendered pixels before acting on it.
//
// `out.unmeasurable` still reports HOW MANY were dropped but not which , if a page reports a
// high unmeasurable count, hand-check that region before declaring it clean.
//
// Usage: load /_audit.js into the page, then __vvAudit() per theme, waiting ~260ms after toggling.
// ── withTheme(doc, theme, fn) ────────────────────────────────────────────────
// USE THIS FOR EVERY THEME-DEPENDENT MEASUREMENT. Never toggle a theme class and read
// getComputedStyle directly.
//
// WHY IT EXISTS: theme toggling animates colour and background. getComputedStyle mid-flight
// returns an INTERPOLATED value, not the resting one. That has produced a false reading THREE
// times in this codebase: 13 phantom mid-grey failures on playbook, and , worse , an entirely
// fabricated bug where the burger drawer appeared to sit at contrast 1.02 in daylight. It was
// actually 6.05 and had never been broken; the reading was a colour caught mid-fade toward cream.
//
// Remembering to disable transitions by hand is exactly what failed, so this makes it structural:
// transitions are killed BEFORE the class changes, and restored after.
//
//   withTheme(document, 'light', function(){ return getComputedStyle(el).color; })
//
window.withTheme = function(doc, theme, fn){
  var st = doc.getElementById('__notrans');
  if(!st){ st = doc.createElement('style'); st.id='__notrans';
    st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
    doc.head.appendChild(st); }
  var had = doc.body.classList.contains('light');
  if(theme === 'light') doc.body.classList.add('light');
  else if(theme === 'dark') doc.body.classList.remove('light');
  // force a synchronous style flush so the new theme is fully resolved before fn() reads anything
  void doc.body.offsetHeight;
  var out;
  try { out = fn(); }
  finally {
    if(had) doc.body.classList.add('light'); else doc.body.classList.remove('light');
    void doc.body.offsetHeight;
  }
  return out;
};

window.__vvAudit = function(){
  // 1. FORCE-OPEN every collapsed container FIRST. This is the whole reason .drurybox-q
  //    survived earlier sweeps: it lives behind max-height:0 + overflow:hidden, so a naive
  //    walk either skips it or measures it at zero height.
  var st = document.getElementById('__auditcss');
  if(!st){ st=document.createElement('style'); st.id='__auditcss';
    // transitions OFF: theme toggling animates background/colour, and getComputedStyle
    // mid-transition returns an INTERPOLATED value (§C). That produced phantom mid-grey
    // backgrounds on the first run. Kill transitions and animations outright.
    st.textContent='*{transition:none!important;animation:none!important;max-height:none!important;overflow:visible!important}'+
                   '.tagdef .drury,.drurybox-q,.vvband-story,.dmore,.wmc-b,.fd-panel,.bdef,.foldbody,.vfoldbody{opacity:1!important;visibility:visible!important}';
    document.head.appendChild(st); }
  document.querySelectorAll('details').forEach(function(d){ d.open=true; });
  // OPEN THE BURGER DRAWER. It is closed by default, so no sweep ever saw its six nav labels ,
  // which sat at contrast 1.02 in light mode, cream on a cream drawer. Same blind spot as
  // .drurybox-q, one level further out: force-opening <details> and .open was not enough,
  // because this one needs a click.
  var _b=document.getElementById('burger'); if(_b) _b.click();
  document.querySelectorAll('.menu,.drawer').forEach(function(m){ m.classList.add('open'); });
  // Only 'open' , the class these components actually use. Adding 'show'/'vopen' blindly
  // risks triggering unrelated rules and inventing findings.
  ['tagdef','drurybox','vvband','band','section','vsect','wmc','fd-panel','emptystate'].forEach(function(c){
    document.querySelectorAll('.'+c).forEach(function(e){ e.classList.add('open'); });
  });

  var px=function(s){ return (String(s).match(/[\d.]+/g)||[]).map(Number); };
  function lum(c){ var f=function(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
  function cr(a,b){ var l1=lum(a), l2=lum(b); return +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2)); }
  // composite every translucent background up the chain onto an opaque base
  // Returns null when any ancestor paints a GRADIENT or IMAGE. The VV card faces are drawn on
  // club-colour gradients, so backgroundColor is transparent there and a naive walk falls through
  // to the page , which made .cname/.ctop/.col/.chtag "fail" in BOTH themes with opposite colours,
  // an impossible result. Those elements are UNMEASURABLE by this method, not broken; report them
  // separately rather than inventing findings.
  // Returns an ARRAY of candidate grounds. A solid chain gives one; a gradient ancestor
  // contributes every parsed stop, so the caller can score against all of them and keep the
  // worst. Returns null only when an image ancestor yields no parseable stop at all.
  function bgOf(el){
    var layers=[], n=el, gradStops=null;
    while(n && n!==document.documentElement){
      var cs2=getComputedStyle(n);
      if(cs2.backgroundImage && cs2.backgroundImage!=='none' && n!==document.body){
        var st=(cs2.backgroundImage.match(/rgba?\([^)]+\)/g)||[]).map(px).filter(function(q){return q.length>=3;});
        if(!st.length) return null;          // url() or named-colour gradient , genuinely unmeasurable
        if(!gradStops) gradStops=st;          // nearest gradient ancestor wins, like paint order
        break;                                // it is opaque, so nothing above it contributes
      }
      var c=cs2.backgroundColor;
      if(c && c!=='transparent'){ var p=px(c); var a=p.length>3?p[3]:1; if(a>0) layers.push([p[0],p[1],p[2],a]); }
      n=n.parentElement;
    }
    if(gradStops){
      return gradStops.map(function(g){
        var base=[g[0],g[1],g[2]];
        for(var i=layers.length-1;i>=0;i--){ var L=layers[i];
          base=[L[3]*L[0]+(1-L[3])*base[0], L[3]*L[1]+(1-L[3])*base[1], L[3]*L[2]+(1-L[3])*base[2]]; }
        return base.map(Math.round);
      });
    }
    var bodyBg=getComputedStyle(document.body).backgroundColor, bp=px(bodyBg);
    var base = (bp.length>=3 && (bp[3]===undefined||bp[3]>0)) ? [bp[0],bp[1],bp[2]] : null;
    if(!base){ // gradient-only body: take the middle stop of the background-image
      var stops=(getComputedStyle(document.body).backgroundImage.match(/rgb\([^)]+\)/g)||[]).map(px);
      base = stops.length ? stops[Math.floor(stops.length/2)] : [255,255,255];
    }
    for(var i=layers.length-1;i>=0;i--){ var L=layers[i];
      base=[L[3]*L[0]+(1-L[3])*base[0], L[3]*L[1]+(1-L[3])*base[1], L[3]*L[2]+(1-L[3])*base[2]]; }
    return [base.map(Math.round)];
  }
  function path(el){
    var p=el.tagName.toLowerCase();
    if(el.id) return p+'#'+el.id;
    var c=(typeof el.className==='string'?el.className:'').trim().split(/\s+/).filter(function(x){return x&&x!=='open'&&x!=='show'&&x!=='vopen';});
    if(c.length) p+='.'+c.slice(0,3).join('.');
    var par=el.parentElement;
    if(par && typeof par.className==='string' && par.className.trim()){
      var pc=par.className.trim().split(/\s+/).filter(function(x){return x&&x!=='open'&&x!=='show'&&x!=='vopen';});
      if(pc.length) p=pc[0]+' > '+p;
    }
    return p;
  }
  var out=[], seen={}, unmeasurable=[];
  var els=document.querySelectorAll('body *');
  for(var i=0;i<els.length;i++){
    var el=els[i];
    // TEXT/TSPAN are NOT skipped any more , SS C: on SVG the ink is fill, not color, and
    // skipping them hid .tjpeak at 1.74 on the light panel from every previous run.
    if(/^(SCRIPT|STYLE|SVG|PATH|CIRCLE|LINE|RECT|G|BR|INPUT|IMG|NOSCRIPT)$/i.test(el.tagName)) continue;
    // own text only, not descendants'
    var own=''; for(var k=0;k<el.childNodes.length;k++){ if(el.childNodes[k].nodeType===3) own+=el.childNodes[k].nodeValue; }
    own=own.replace(/\s+/g,' ').trim();
    if(own.length<4) continue;
    var cs=getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') continue;
    var isSvgText=/^(TEXT|TSPAN)$/i.test(el.tagName);
    var col=px(isSvgText ? cs.fill : cs.color); if(col.length<3) continue;
    // ELEMENT OPACITY COMPOUNDS WITH THE INK ALPHA. Accumulated up the chain, because a dimmed
    // wrapper dims its children too. Missing this is why .h2hlabel read 4.79 and renders 2.75.
    var op=1, oN=el;
    while(oN && oN!==document.body){ var o=parseFloat(getComputedStyle(oN).opacity); if(!isNaN(o)) op*=o; oN=oN.parentElement; }
    // An element at opacity 0 paints NOTHING. Folding that into the alpha makes the ink equal
    // the ground and reports a perfect 1.00 , indistinguishable from invisible text, and the
    // exact artefact the playbook run recorded. Skip it like display:none. Found by this
    // harness reporting .lbl and .tmore at 1.00, both sitting at opacity:0.
    if(op<=0.01){ continue; }
    var alpha = (col.length>3 ? col[3] : 1) * op;
    var grounds=bgOf(el);
    if(grounds===null){ unmeasurable.push(path(el)); continue; }   // image with no parseable stop
    // score against EVERY candidate ground and keep the WORST , the honest bound on a gradient
    var ratio=Infinity, eff=null, bg=null;
    for(var gi=0; gi<grounds.length; gi++){
      var G=grounds[gi];
      var e2 = alpha<1 ? [alpha*col[0]+(1-alpha)*G[0], alpha*col[1]+(1-alpha)*G[1], alpha*col[2]+(1-alpha)*G[2]].map(Math.round) : col.slice(0,3);
      var r2 = cr(e2,G);
      if(r2<ratio){ ratio=r2; eff=e2; bg=G; }
    }
    if(ratio>=4.5) continue;
    var fs=parseFloat(cs.fontSize)||14, fw=parseInt(cs.fontWeight)||400;
    var large=(fs>=24)||(fs>=18.66&&fw>=700);
    if(large && ratio>=3) continue;            // WCAG large-text threshold
    var key=path(el)+'|'+ratio;
    if(seen[key]) continue; seen[key]=1;
    out.push({ sel:path(el), ratio:ratio, color:'rgb('+eff.join(',')+')', bg:'rgb('+bg.join(',')+')',
               px:Math.round(fs), w:fw, text:own.slice(0,52) });
  }
  out.sort(function(a,b){ return a.ratio-b.ratio; });
  out.unmeasurable=unmeasurable.length;
  return out;
};
