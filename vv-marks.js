/* vv-marks.js , THE VVONDERXI MARK SET =========================================
 *
 *  37 original marks on one 24x24 grid, editorial-solid: filled shapes with their
 *  counters knocked out using fill-rule="evenodd", no strokes, currentColor only.
 *  Nothing here is imported or traced from Lucide, Feather, Font Awesome or any
 *  other set. The crest in Iron Man is rescaled from this repo's own rowShieldHTML
 *  and the loader is traced from the .spinelogo PNG.
 *
 *  CACHE TOKEN , READ THIS BEFORE EDITING.
 *  This file and vv-core.js share ONE ?v= value. Bump BOTH script tags together on
 *  card.html, compare.html and rankings.html, or one file is served fresh against a
 *  cached copy of the other. There is no build step, so nothing enforces the pairing
 *  except discipline and the note in CLAUDE.md section C.
 *
 *  WHY A SPRITE AND NOT INLINE SVG.
 *  rankRowHTML renders up to 100 rows with up to 3 pills each. Inline path data would
 *  repeat 300 times per page; <use> is one sprite plus 300 tiny references. <use>
 *  works inside innerHTML strings and currentColor inherits through it.
 *
 *  THE FAILURE MODE THIS GUARDS.
 *  If the sprite is not in the document when rows are inserted, every <use> renders
 *  BLANK with no error. That is the silent-failure family CLAUDE.md section C keeps
 *  recording, so inject() runs at load and a one-shot audit warns if a mark resolves
 *  to nothing.
 *
 *  KEYS MATCH THEIR SOURCES EXACTLY, so no consumer needs a translation table:
 *    tag()      keys are TAG_DEFS names in vv-core.js  ("Ball-Playing CB")
 *    honour()   keys are HONOUR_META keys in vv-core.js ("ucl_winner")
 *    section()  keys are the section ids in playbook.html ("s-vv")
 *  Three namespaces, not one flat map, because "Honours" is both a Playbook section
 *  and a family of honours; a flat map would let those collide silently.
 * ============================================================================ */
(function (global) {
  'use strict';

  // Profile tags + the two prestige tags. Keys are TAG_DEFS names, all 20 of them.
  var TAGS = {
    'Goal Machine':      '<g fill="currentColor"> <circle cx="12" cy="5.6" r="3.4"/><circle cx="6.2" cy="16.4" r="3.4"/><circle cx="17.8" cy="16.4" r="3.4"/></g>',
    'Clinical':          '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Zm0 2.6a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z"/> <circle cx="12" cy="12" r="3.4"/></g>',
    'Provider':          '<g fill="currentColor"> <path d="M2.4 2.8 9.6 7.2 2.4 11.6V8.9h6.2v-.7H2.4Z"/> <path d="M2.4 12.4 9.6 16.8 2.4 21.2v-2.7h6.2v-.7H2.4Z"/> <path d="M12.8 7.6 20 12l-7.2 4.4v-2.7H19v-.7h-6.2Z"/></g>',
    'Poacher':           '<g fill="currentColor"> <path fill-rule="evenodd" d="M3.6 7.2h16.8v9.6H3.6Zm2.4 2.4v4.8h12V9.6Z"/> <circle cx="12" cy="12" r="2.6"/></g>',
    'The Winger':        '<g fill="currentColor"> <path d="M2.2 21.8V9.4h3.6v6.2l9.9-9.9-2.4-2.4h8.5v8.5l-2.4-2.4-9.9 9.9v2.5Z"/></g>',
    'Playmaker':         '<g fill="currentColor"> <circle cx="7.4" cy="12" r="3"/> <path d="M11.6 11h9.2v2h-9.2Z M11.9 6.2l7.6 3.1-.8 1.9-7.6-3.1Z M11.1 16.8l7.6-3.1.8 1.9-7.6 3.1Z"/></g>',
    'Maestro':           '<g fill="currentColor"> <circle cx="12" cy="12" r="3"/> <path d="M11 2.6h2v5.2h-2Z M11 16.2h2v5.2h-2Z M2.6 11h5.2v2H2.6Z M16.2 11h5.2v2h-5.2Z M5.4 4.0 9.1 7.7 7.7 9.1 4.0 5.4Z M18.6 4.0 20 5.4l-3.7 3.7-1.4-1.4Z M4.0 18.6 7.7 14.9l1.4 1.4-3.7 3.7Z M20 18.6 18.6 20l-3.7-3.7 1.4-1.4Z"/></g>',
    'Regista':           '<g fill="currentColor"> <circle cx="5.6" cy="18.4" r="3"/> <path d="M8.4 16.4C12.6 15.2 16.4 11.6 18.4 6.6l1.9.8c-2.2 5.6-6.5 9.6-11.2 11Z"/> <path d="M16.9 4.4h4.9v4.9l-1.9-1.9-3-3Z"/></g>',
    'Engine Room':       '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 4.2c-5.6 0-10.2 3.5-10.2 7.8S6.4 19.8 12 19.8s10.2-3.5 10.2-7.8c0-2.2-1.2-4.2-3.2-5.6l-1.9 2.6c1.3.9 2 2 2 3s-2.9 4.6-7.1 4.6S4.9 13 4.9 12 7.8 7.4 12 7.4Z"/> <path d="M10.4 1.8 16.2 6l-5.8 4.2Z"/></g>',
    'The Dribbler':      '<g fill="currentColor"> <circle cx="17.2" cy="5.8" r="2.8"/><circle cx="17.2" cy="18.2" r="2.8"/> <path d="M2.2 2.6h3.4v18.8H2.2Z M6.6 5.2h5.2v2.9H6.6Z M6.6 15.9h5.2v2.9H6.6Z"/></g>',
    'The Wall':          '<g fill="currentColor"> <path fill-rule="evenodd" d="M2.6 11.4h18.8v9.2H2.6Zm2.2 2.2v1.6h5.1v-1.6Zm7.3 0v1.6h5.1v-1.6Zm-4.2 3.6v1.6h5.1v-1.6Zm7.3 0v1.6h4v-1.6Zm-11.4 0v1.6h2.1v-1.6Z"/> <circle cx="12" cy="6" r="3.2"/></g>',
    'Destroyer':         '<g fill="currentColor"> <path d="M1.8 12 9 5.4v13.2Z"/><path d="M22.2 12 15 18.6V5.4Z"/> <path d="M11.2 8.4h1.6v7.2h-1.6Z"/></g>',
    'Ball Hawk':         '<g fill="currentColor"> <path d="M2.4 21.4a14 14 0 0 1 14-14v3.4a10.6 10.6 0 0 0-10.6 10.6Z"/> <circle cx="17.6" cy="6.6" r="3.6"/></g>',
    'Ball-Playing CB':   '<g fill="currentColor"> <circle cx="5.2" cy="19" r="2.4"/><circle cx="12" cy="19" r="2.4"/><circle cx="18.8" cy="19" r="2.4"/> <path d="M12 2 18.2 8.6h-4.2v5.8h-4V8.6H5.8Z"/></g>',
    'Complete':          '<g fill="currentColor"> <path d="M12 4.4 18.6 9.2 16.1 17H7.9L5.4 9.2Z"/> <circle cx="12" cy="2.6" r="2.2"/><circle cx="20.4" cy="8.7" r="2.2"/> <circle cx="17.2" cy="18.6" r="2.2"/><circle cx="6.8" cy="18.6" r="2.2"/> <circle cx="3.6" cy="8.7" r="2.2"/></g>',
    'Iron Man':          '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 2.2 19.2 4.6v7.1c0 4.8-3.4 7.5-7.2 8.9-3.8-1.4-7.2-4.1-7.2-8.9V4.6Zm-2.5 5.9v1.8h1.4v4.2H9.5v1.8h5v-1.8h-1.4V9.9h1.4V8.1Z"/></g>',
    'Wonderkid':         '<g fill="currentColor"> <path d="M1.8 18.2h20.4v3.2H1.8Z"/> <path d="M4.6 9.4h4.2v7.4H4.6Z"/><path d="M6.7 2.6 10.9 8H2.5Z"/></g>',
    'The Last Dance':    '<g fill="currentColor"> <path d="M1.8 18.2h15.8v3.2H1.8Z"/> <path d="M15.2 8.6h4.2v8.2h-4.2Z"/><path d="M12.8 4.8h9v3h-9Z"/></g>',
    'Generational':      '<g fill="currentColor"> <path fill-rule="evenodd" d="M6.2 2.6h11.6l4.2 6.2L12 21.8 2 8.8Zm1.6 3-2.4 3.6h3.9l1.4-3.6Zm4.2 0-1.4 3.6h6.8l-1.4-3.6Zm4.8 0 1.4 3.6h3.9l-2.4-3.6ZM6 12.4l4.2 5.4-2-5.4Zm4.6 0 1.4 4.6 1.4-4.6Zm4.4 0-2 5.4 4.2-5.4Z"/></g>',
    'Iconic':            '<g fill="currentColor"> <path d="M10.4 21.4C5.6 19.8 2.6 15.6 2.6 10.4c0-2.6.7-5 1.9-6.9 2.6 2.2 4.4 5.6 4.4 9.4 0 1.6-.3 3-.8 4.3l2.3 1.4Z"/> <path d="M13.6 21.4c4.8-1.6 7.8-5.8 7.8-11 0-2.6-.7-5-1.9-6.9-2.6 2.2-4.4 5.6-4.4 9.4 0 1.6.3 3 .8 4.3l-2.3 1.4Z"/></g>',
  };

  // Team honours are footed and vertical; individual awards are objects with no base.
  var HONOURS = {
    'ballon_dor':        '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Zm0 3.5 2.9 2.1-1.1 3.4h-3.6L9.1 8Z"/></g>',
    'world_cup_winner':  '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 2.2a4.6 4.6 0 0 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 2.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z"/> <path d="M9.5 11.2h5l-1.1 6.2h2.4v2.3H8.2v-2.3h2.4Z"/> <path d="M6.6 20.2h10.8v1.9H6.6Z"/></g>',
    'ucl_winner':        '<g fill="currentColor"> <path fill-rule="evenodd" d="M9.4 1.8h5.2v8.4a2.6 2.6 0 0 1-1.9 2.5v5.9h2.3v2.4H9v-2.4h2.3v-5.9a2.6 2.6 0 0 1-1.9-2.5Z"/> <path fill-rule="evenodd" d="M9.4 2.6C6.2 2.6 4.4 5 4.4 7.6s1.8 5 5 5v-2.2c-1.9 0-2.8-1.4-2.8-2.8s.9-2.8 2.8-2.8Z"/> <path fill-rule="evenodd" d="M14.6 2.6c3.2 0 5 2.4 5 5s-1.8 5-5 5v-2.2c1.9 0 2.8-1.4 2.8-2.8s-.9-2.8-2.8-2.8Z"/></g>',
    'league_champion':   '<g fill="currentColor"> <path fill-rule="evenodd" d="M7.4 4.6h9.2v4.3a4.6 4.6 0 0 1-3.5 4.5v3.7h2.7v2.3H8.2v-2.3h2.7v-3.7A4.6 4.6 0 0 1 7.4 8.9Zm2.8 1.8 1.8 3.1 1.8-3.1Z"/> <path d="M7.4 6.1v1.9a1.1 1.1 0 0 0 .9 1v1.9A3 3 0 0 1 5.5 8V6.1ZM16.6 6.1h2.9V8a3 3 0 0 1-2.8 2.9V9a1.1 1.1 0 0 0 .9-1Z"/></g>',
    'player_of_season':  '<g fill="currentColor"> <path d="M12 1.8 15.1 8.5 22.4 9.4 17 14.4 18.5 21.6 12 18 5.5 21.6 7 14.4 1.6 9.4 8.9 8.5Z"/></g>',
    'golden_boot':       '<g fill="currentColor"> <path fill-rule="evenodd" d="M4.2 6.2h4.4v5.1c1.9.3 3.6 1 5.2 2 1.9 1.2 4.2 1.9 6.8 2.1v3.4H4.2Zm2.6 8.9v1.6h2.1v-1.6Z"/></g>',
    'top_assists':       '<g fill="currentColor"> <path fill-rule="evenodd" d="M9.2 1.6a6.6 6.6 0 0 0-2.6 12.7v6.1l3.4 2 3.4-2v-2.4h-2.4v-2.6h2.4v-1.1A6.6 6.6 0 0 0 9.2 1.6Zm0 3.2a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z"/></g>',
  };

  // Playbook section marks. Keys are the ids in playbook.html.
  var SECTIONS = {
    's-vv':              '<g fill="currentColor"> <path d="M2.4 16.6a9.6 9.6 0 0 1 19.2 0h-3.3a6.3 6.3 0 0 0-12.6 0Z"/> <path d="M11.13 15.94 16.13 9.34 17.87 10.66 12.87 17.26Z"/> <circle cx="12" cy="16.6" r="2.4"/> <path d="M1.8 19.4h20.4v2.2H1.8Z"/></g>',
    's-dim':             '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 1.6 22.4 9.2l-4 12.2H5.6l-4-12.2Zm0 3.5L5 10.2l2.7 8.2h8.6l2.7-8.2Z"/></g>',
    's-pct':             '<g fill="currentColor"> <path d="M1.6 19.4h2.6v2.2H1.6Z M5.2 16.6h2.6v5H5.2Z M8.8 12.4h2.6v9.2H8.8Z M12.4 9.6h2.6v12h-2.6Z M16 13.8h2.6v7.8H16Z M19.6 18.2h2.6v3.4h-2.6Z"/> <path d="M12.8 1.6h1.8v6.2h-1.8Z M10.6 2.4h6.2v1.8h-6.2Z"/></g>',
    's-card':            '<g fill="currentColor"> <path fill-rule="evenodd" d="M4.4 2.4h15.2v19.2H4.4Zm2.6 2.6v14h10V5Z"/> <path d="M8.6 6.8h6.8v4.4H8.6Z M8.6 13h6.8v1.8H8.6Z M8.6 16h4.4v1.8H8.6Z"/></g>',
    's-conf':            '<g fill="currentColor"> <circle cx="4" cy="12" r="2.6"/><circle cx="10" cy="12" r="2.6"/><circle cx="16" cy="12" r="2.6"/> <path fill-rule="evenodd" d="M20.6 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Zm0 1.5a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"/></g>',
    's-prestige':        '<g fill="currentColor"> <path d="M2.2 6.4 7 11.2l5-6.6 5 6.6 4.8-4.8-2 12.4H4.2Z"/><path d="M4.2 19.4h15.6v2.2H4.2Z"/></g>',
    's-honours':         '<g fill="currentColor"> <path fill-rule="evenodd" d="M12 1.8a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm0 2.8a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z"/> <path d="M7.4 15.4 4.8 22.4l4-1.8 3.2 1.8-1.4-6.2Zm9.2 0-2.2.6 1.6 6.4 1.2-1.8 4 1.2Z"/></g>',
    's-profile':         '<g fill="currentColor"> <path fill-rule="evenodd" d="M2.2 7.2h13.4a5.4 5.4 0 0 1 0 10.8H2.2Zm2.8 2.8v5.2h10.6a2.6 2.6 0 0 0 0-5.2Z"/> <circle cx="17.4" cy="12.6" r="2"/></g>',
    's-verdict':         '<g fill="currentColor"> <path d="M11 2.2h2v19.6h-2Z M3.2 6.6h17.6v2.2H3.2Z"/> <path fill-rule="evenodd" d="M6.2 9.6 9.8 17H2.6Zm0 3.8L4.9 16.4h2.6Z"/> <path fill-rule="evenodd" d="M17.8 9.6 21.4 17h-7.2Zm0 3.8-1.3 3h2.6Z"/></g>',
  };

  // Brand marks. The loader keeps the logo INTERLOCK, not its two colours , see section C.
  var BRAND = {
    'loader':            '<g fill="currentColor"> <path fill-rule="evenodd" d="M1.6 5.6h3.6l3.2 7.2 3.2-7.2h3.6l-5 12.8H6.6Zm7 0h3.6l3.2 7.2 3.2-7.2h3.6l-5 12.8h-3.6Z"/></g>',
  };

  var SETS = { tag: TAGS, honour: HONOURS, section: SECTIONS, brand: BRAND };
  var PREFIX = 'vvm-';

  function slug(kind, key) {
    return PREFIX + kind + '-' + String(key).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  var injected = false;
  function inject() {
    if (injected || typeof document === 'undefined') return;
    if (document.getElementById('vv-marks-sprite')) { injected = true; return; }
    var parts = [];
    Object.keys(SETS).forEach(function (kind) {
      var set = SETS[kind];
      Object.keys(set).forEach(function (key) {
        parts.push('<symbol id="' + slug(kind, key) + '" viewBox="0 0 24 24">' + set[key] + '</symbol>');
      });
    });
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'vv-marks-sprite');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    svg.innerHTML = '<defs>' + parts.join('') + '</defs>';
    (document.body || document.documentElement).appendChild(svg);
    injected = true;
  }

  // Returns '' for an unknown key rather than throwing, so one bad name never takes a
  // whole row down. The audit below is what makes that silence visible in development.
  function mark(kind, key, opts) {
    var set = SETS[kind];
    if (!set || !Object.prototype.hasOwnProperty.call(set, key)) return '';
    opts = opts || {};
    var cls = 'vvm' + (opts.className ? ' ' + opts.className : '');
    var size = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';
    return '<svg class="' + cls + '"' + size + ' viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
           '<use href="#' + slug(kind, key) + '"/></svg>';
  }

  // ONE-SHOT AUDIT. A <use> pointing at a missing symbol renders blank and reports
  // nothing, so this makes it loud once per surface and then stops. Same shape as
  // vvQueueRowAudit in vv-core.js and for the same reason.
  var audit = { done: false, queued: false };
  function queueAudit() {
    if (audit.done || audit.queued || typeof document === 'undefined') return;
    audit.queued = true;
    setTimeout(function () {
      audit.queued = false;
      var uses = document.querySelectorAll('use[href^="#' + PREFIX + '"]');
      if (!uses.length) return;                 // nothing rendered yet; a later batch re-queues
      audit.done = true;                        // once per surface, never once per mark
      for (var i = 0; i < uses.length; i++) {
        var id = (uses[i].getAttribute('href') || '').slice(1);
        if (!document.getElementById(id)) {
          console.warn('[VVonderXI] Mark "' + id + '" resolves to nothing, so it is rendering BLANK. ' +
            'Nothing throws when this happens. Either VVMarks.inject() has not run on this page, or the ' +
            'key does not exist in vv-marks.js. Consumer:', uses[i].parentNode);
          return;                               // one warning is the signal, do not spam
        }
      }
    }, 0);
  }

  function api(kind) {
    return function (key, opts) { inject(); queueAudit(); return mark(kind, key, opts); };
  }

  global.VVMarks = {
    inject: inject,
    tag: api('tag'),
    honour: api('honour'),
    section: api('section'),
    brand: api('brand'),
    has: function (kind, key) {
      return !!SETS[kind] && Object.prototype.hasOwnProperty.call(SETS[kind], key);
    },
    ids: function (kind) { return kind ? Object.keys(SETS[kind] || {}) : Object.keys(SETS); },
    count: function () {
      return Object.keys(SETS).reduce(function (n, k) { return n + Object.keys(SETS[k]).length; }, 0);
    }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
  }
})(typeof window !== 'undefined' ? window : this);
