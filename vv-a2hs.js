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
  var API={ GLYPHS:GL, plan:plan };
  if(typeof window!=='undefined') window.VVA2HS=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})();
