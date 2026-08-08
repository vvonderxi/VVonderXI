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
//    "fail" in BOTH themes with opposite colours, an impossible result. bgOf now returns null for
//    any gradient/image ancestor and those elements are counted as UNMEASURABLE, not reported.
//
// KNOWN LIMITATION , the gradient guard trades false positives for FALSE NEGATIVES. It silently
// drops every element on a gradient-backed surface. The contact page's 13px "Got a question?"
// eyebrow (rgba(243,237,224,.6), ratio 1.00 in light) was missed exactly this way and had to be
// found by hand. `out.unmeasurable` reports HOW MANY were dropped but not which , if a page
// reports a high unmeasurable count, hand-check that region before declaring it clean.
//
// Usage: load /_audit.js into the page, then __vvAudit() per theme, waiting ~260ms after toggling.
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
  function bgOf(el){
    var layers=[], n=el;
    while(n && n!==document.documentElement){
      var cs2=getComputedStyle(n);
      if(cs2.backgroundImage && cs2.backgroundImage!=='none' && n!==document.body) return null;
      var c=cs2.backgroundColor;
      if(c && c!=='transparent'){ var p=px(c); var a=p.length>3?p[3]:1; if(a>0) layers.push([p[0],p[1],p[2],a]); }
      n=n.parentElement;
    }
    var bodyBg=getComputedStyle(document.body).backgroundColor, bp=px(bodyBg);
    var base = (bp.length>=3 && (bp[3]===undefined||bp[3]>0)) ? [bp[0],bp[1],bp[2]] : null;
    if(!base){ // gradient-only body: take the middle stop of the background-image
      var stops=(getComputedStyle(document.body).backgroundImage.match(/rgb\([^)]+\)/g)||[]).map(px);
      base = stops.length ? stops[Math.floor(stops.length/2)] : [255,255,255];
    }
    for(var i=layers.length-1;i>=0;i--){ var L=layers[i];
      base=[L[3]*L[0]+(1-L[3])*base[0], L[3]*L[1]+(1-L[3])*base[1], L[3]*L[2]+(1-L[3])*base[2]]; }
    return base.map(Math.round);
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
    if(/^(SCRIPT|STYLE|SVG|PATH|CIRCLE|LINE|RECT|G|TEXT|BR|INPUT|IMG|NOSCRIPT)$/.test(el.tagName)) continue;
    // own text only, not descendants'
    var own=''; for(var k=0;k<el.childNodes.length;k++){ if(el.childNodes[k].nodeType===3) own+=el.childNodes[k].nodeValue; }
    own=own.replace(/\s+/g,' ').trim();
    if(own.length<4) continue;
    var cs=getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') continue;
    var col=px(cs.color); if(col.length<3) continue;
    var alpha = col.length>3 ? col[3] : 1;
    var bg=bgOf(el);
    if(bg===null){ unmeasurable.push(path(el)); continue; }   // gradient/image ancestor
    var eff = alpha<1 ? [alpha*col[0]+(1-alpha)*bg[0], alpha*col[1]+(1-alpha)*bg[1], alpha*col[2]+(1-alpha)*bg[2]].map(Math.round) : col.slice(0,3);
    var ratio=cr(eff,bg);
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
