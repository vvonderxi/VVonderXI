/*  vv-a2hs.js , THE PER-BROWSER "ADD TO HOME SCREEN" STEPS, SHARED.

    WHY IT IS ITS OWN FILE AND NOT IN vv-core.js. CLAUDE.md SS C rules that if a second
    surface ever wants the install steps, they move out of index.html's `window.__a2hs`
    test seam and become a real export. `preferences.html` is now that second surface.
    It does NOT load `vv-core.js`, and adding it would mean 576 KB and a prepended
    `VV_CARD_CSS` sheet on a settings page for twenty lines of branching , against a
    platform that spent a whole pass taking page weight from 2.78 MB to 0.98 MB. So this
    follows `vv-margin.js`: a small shared module with its own `?v=` token.

    WHY IT IS SHARED AT ALL, RATHER THAN COPIED. The labels below are the product: Chrome
    on Android now says "Install and create shortcut", Samsung Internet says "Add page to"
    then "Home screen", and SS C records that these MOVE BETWEEN BROWSER VERSIONS and must
    be re-checked before editing. Two copies means a label correction lands in one of them
    and the other goes quietly stale , which is exactly the `HON_COPY` / `HON_RANK` failure
    SS C already records, where a second list keyed by label drifted twice in one week.

    THERE IS DELIBERATELY NO SERVICE WORKER, so `beforeinstallprompt` can never fire and
    there is no native prompt on any browser (SS C: the `?v=` cache token is the only thing
    that makes a shared-script change reach anyone, and a caching worker would defeat it).
    These manual steps are therefore the WHOLE install affordance, not a fallback for one.

    `plan()` RETURNS DATA, NOT HTML. It used to build index.html's phone mockup itself,
    which welded the branching to one page's presentation. It now returns a `hint`
    descriptor and each surface draws what suits it , index.html a mockup, preferences.html
    a line in a bottom sheet. A step is [glyphHTML, textHTML].  */
(function(){
  var GL={
    share:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3B6FB0" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="M8.5 6.5 12 3l3.5 3.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    plus:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    dots:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>',
    burger:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    down:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v13"/><path d="M6.5 11.5 12 17l5.5-5.5"/></svg>'
  };

  /*  THE STEPS ARE PER BROWSER, NOT PER PLATFORM, and SS C records that as a CORRECTNESS
      point rather than a nicety: a Chrome instruction shown to a Samsung user is WRONG,
      not roughly right. Anything unrecognised gets the generic line instead of confident
      wrong steps.
      iPadOS reports a desktop UA, hence the MacIntel + maxTouchPoints test.  */
  function plan(ua){
    ua = ua || (typeof navigator!=='undefined' ? (navigator.userAgent||'') : '');
    var nav = (typeof navigator!=='undefined') ? navigator : {};
    var iOS=/iphone|ipad|ipod/i.test(ua) || (nav.platform==='MacIntel' && nav.maxTouchPoints>1 && !/Android/i.test(ua));
    var samsung=/SamsungBrowser/i.test(ua);
    var criOS=/CriOS/i.test(ua);
    var androidChrome=/Android/i.test(ua) && /Chrome\//i.test(ua) && !samsung && !/EdgA|OPR|Firefox/i.test(ua);
    if(iOS && criOS) return {key:'ios-chrome', hd:'Two taps to add it',
      steps:[[GL.share,'Tap <b>Share</b>, right of the address bar'],[GL.plus,'Then <b>Add to Home Screen</b>']],
      hint:{pos:'right', glyph:GL.share, label:'top, in the address bar'}};
    if(iOS && !/FxiOS|EdgiOS|OPT\//i.test(ua)) return {key:'ios-safari', hd:'Two taps to add it',
      steps:[[GL.share,'Tap <b>Share</b>, in the bar at the bottom'],[GL.plus,'Scroll, then <b>Add to Home Screen</b>']],
      hint:{pos:'centre', glyph:GL.share, label:'middle of the bottom bar'}};
    if(samsung) return {key:'samsung', hd:'Three taps to add it',
      steps:[[GL.burger,'Tap the <b>menu</b>, bottom right'],[GL.plus,'<b>Add page to</b>, then <b>Home screen</b>']],
      hint:{pos:'right', glyph:GL.burger, label:'bottom right'}};
    if(androidChrome) return {key:'android-chrome', hd:'Two taps to add it',
      steps:[[GL.dots,'Tap the <b>three-dot menu</b>, by the address bar'],[GL.down,'Then <b>Install and create shortcut</b>']],
      hint:{pos:'right', glyph:GL.dots, label:'beside the address bar'},
      note:'Older versions of Chrome say <b>Add to Home screen</b> instead.'};
    return {key:'generic', hd:'Add it to your home screen',
      steps:[[GL.plus,'Look for <b>Add to Home screen</b> or <b>Install</b> in your browser’s own menu']]};
  }

  /*  NOTHING ELSE LIVES HERE ON PURPOSE. `isStandalone` was written into this module and
      taken back out: it is a one-line `matchMedia` test that preferences.html already had,
      and the thing worth sharing is the LABELS, which drift. An export nobody calls reads
      as authoritative and goes stale unwatched , SS C's parked-renderer hazard.  */
  /*  mount() , THE STRIP ITSELF, MOVED OFF THE HOMEPAGE (owner's decision 2026-10-11).
      It used to live inline on index.html, gated on a second visit. Two things killed that: an
      X in-app browser showed it on arrival, over the search box, to what looked like a cold ad
      visitor, and the owner's rule is that the front door never asks. It now lives only on
      pages a reader reaches after deciding they like this , the VV Index and the Playbook ,
      and it waits until they have scrolled most of a screen, which is the reading signal.
      Phones only, never in an installed app, and a dismissal is permanent.
      THE CSS IS DATA, NOT A TEMPLATE LITERAL: SS C records a backtick inside a template literal
      silently cutting a module short, and these rules came with comments full of them.
      THE STRIP SITS ABOVE THE PAGE'S BOTTOM NAV, measured rather than typed, and the body is
      padded by the strip's height while it shows so the end of the page stays reachable.  */
  var A2HS_CSS = ".a2hs{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));\nz-index:90;display:none;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-lg);\nbackground:rgba(26,23,21,.96);border:1px solid rgba(243,237,224,.16);\nbox-shadow:0 18px 40px -16px rgba(0,0,0,.8);backdrop-filter:blur(8px)}\nbody.light .a2hs{background:rgba(255,253,247,.97);border-color:rgba(28,27,26,.14)}\n.a2hs.show{display:flex}\n.a2hs .ico{width:30px;height:30px;border-radius:var(--r-md);flex:none}\n.a2hs .txt{flex:1;min-width:0;font-family:'Inter';font-size:12.5px;line-height:1.4;\ncolor:rgba(243,237,224,.82)}\nbody.light .a2hs .txt{color:#3a352e}\n.a2hs .txt b.hd{font-family:'Archivo';font-weight:800;display:block;font-size:13px;color:var(--cream)}\nbody.light .a2hs .txt b.hd{color:var(--charcoal)}\n.a2hs .add{flex:none;font-family:'Archivo';font-weight:800;font-size:11.5px;letter-spacing:.04em;\ntext-transform:uppercase;padding:9px 14px;border-radius:var(--r-pill);border:none;cursor:pointer;\nbackground:linear-gradient(135deg,#FF5C7A,#E70443);color:#fff}\n.a2hs .no{flex:none;background:none;border:none;cursor:pointer;font-size:18px;line-height:1;\npadding:4px 2px;color:rgba(243,237,224,.42)}\nbody.light .a2hs .no{color:#8a8276}\n.a2hs.steps{align-items:flex-start}\n.a2hs .ss{display:flex;flex-direction:column;gap:8px;margin-top:8px}\n.a2hs .st{display:flex;align-items:center;gap:9px;font-size:12.5px;line-height:1.35}\n.a2hs .st .n{flex:none;width:18px;height:18px;border-radius:var(--r-pill);display:grid;place-items:center;\nfont-family:'Archivo';font-weight:800;font-size:10px;background:rgba(243,237,224,.13);color:var(--cream)}\nbody.light .a2hs .st .n{background:rgba(28,27,26,.09);color:var(--charcoal)}\n.a2hs .st .gl{flex:none;width:18px;height:18px;display:grid;place-items:center}\n.a2hs .st>span:last-child{flex:1 1 auto;min-width:0}\n.a2hs .st b{font-weight:700;color:var(--cream)}\nbody.light .a2hs .st b{color:var(--charcoal)}\n.a2hs .mock{margin-top:10px}\n.a2hs .mockbar{height:30px;border-radius:var(--r-md);border:1px dashed rgba(243,237,224,.22);\ndisplay:flex;align-items:center;gap:6px;padding:0 7px}\nbody.light .a2hs .mockbar{border-color:rgba(28,27,26,.2)}\n.a2hs .mockbar .fill{flex:1;height:16px;border-radius:var(--r-pill);background:rgba(243,237,224,.09)}\nbody.light .a2hs .mockbar .fill{background:rgba(28,27,26,.07)}\n.a2hs .mockbar .spot{flex:none;width:20px;height:20px;display:grid;place-items:center;border-radius:var(--r-md);\nbackground:rgba(231,4,67,.20);outline:1.5px solid #E70443}\n.a2hs .mockcap{margin-top:5px;font-family:'Archivo';font-weight:700;font-size:9.5px;letter-spacing:.05em;\ntext-transform:uppercase;color:#F1688E}\nbody.light .a2hs .mockcap{color:#AD0332}\n.a2hs .mockcap.c{text-align:center} .a2hs .mockcap.r{text-align:right}\n.a2hs .note{margin-top:8px;font-size:11.5px;opacity:.72}\n@media (min-width:721px){ .a2hs{display:none !important} }";
  function mount(opts){
    opts = opts || {};
    if(typeof document === 'undefined' || document.getElementById('a2hs')) return;
    var K='vvA2HS';
    function get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
    function set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone===true;
    if(standalone || get(K)==='no') return;
    if(!(window.matchMedia && window.matchMedia('(max-width:720px)').matches)) return;
    var st=document.createElement('style'); st.textContent=A2HS_CSS; document.head.appendChild(st);
    var el=document.createElement('div'); el.className='a2hs'; el.id='a2hs';
    el.setAttribute('role','dialog'); el.setAttribute('aria-label','Add VVonderXI to your home screen');
    el.innerHTML='<img class="ico" src="/icon-192.png" alt="">'
      + '<div class="txt" id="a2hsTxt"><b class="hd">Keep VVonderXI one tap away</b>Add it to your home screen. It opens full screen, like an app.</div>'
      + '<button class="add" id="a2hsAdd" type="button">Add</button>'
      + '<button class="no" id="a2hsNo" type="button" aria-label="Not now">&times;</button>';
    document.body.appendChild(el);
    var nav=document.querySelector(opts.nav || '.bottomnav'), padWas=document.body.style.paddingBottom;
    function place(){
      var r = nav ? nav.getBoundingClientRect() : null;
      var above = (r && r.height && getComputedStyle(nav).display!=='none') ? Math.max(0, window.innerHeight - r.top) : 0;
      el.style.bottom = (above + 10) + 'px';
      document.body.style.paddingBottom = el.classList.contains('show') ? (el.offsetHeight + above + 24) + 'px' : padWas;
    }
    function show(){ el.classList.add('show'); place(); }
    var armed=false;
    function onScroll(){ if(armed) return;
      if(window.scrollY > window.innerHeight * (opts.after || 0.6)){ armed=true; window.removeEventListener('scroll', onScroll); setTimeout(show, 800); } }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', function(){ if(el.classList.contains('show')) place(); });
    document.getElementById('a2hsNo').onclick=function(){ el.classList.remove('show'); place(); set(K,'no'); };
    function mock(pos,glyph,label){
      var fill='<span class="fill"></span>', spot='<span class="spot">'+glyph+'</span>';
      var inner = pos==='centre' ? fill+spot+fill : fill+spot;
      return '<div class="mock"><div class="mockbar">'+inner+'</div><div class="mockcap '+(pos==='centre'?'c':'r')+'">'+label+'</div></div>';
    }
    function renderSteps(p){
      var steps=p.steps.map(function(s,i){ return '<div class="st"><span class="n">'+(i+1)+'</span><span class="gl">'+s[0]+'</span><span>'+s[1]+'</span></div>'; }).join('');
      var h=p.hint, drawn = h ? mock(h.pos, h.glyph, h.label) : '';
      document.getElementById('a2hsTxt').innerHTML='<b class="hd">'+p.hd+'</b><div class="ss">'+steps+'</div>'+(p.note?'<div class="note">'+p.note+'</div>':'')+drawn;
      el.classList.add('steps','show'); place();
    }
    /*  THE TEST SEAM MOVES WITH THE STRIP (SS C, window.__a2hs): the case is chosen from a
        user-agent string captured at load, so the five branches can only be checked by
        rendering each one through this.  */
    window.__a2hs={ plan:plan, render:renderSteps, show:show };
    document.getElementById('a2hsAdd').onclick=function(){ renderSteps(plan()); this.style.display='none'; };
  }
  var API={ GLYPHS:GL, plan:plan, mount:mount };
  if(typeof window!=='undefined') window.VVA2HS=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})();
