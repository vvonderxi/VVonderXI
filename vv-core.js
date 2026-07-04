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
        return `<${el} class="${baseClass} ${famClass}" data-tag="${x.t.name}">${inner}</${el}>`;
      })
      .join('');
  }

  // ── renderPrestige (Contract §3) , shared prestige-pill renderer, mirrors
  //    renderTagPills's shape. baseClass 'chtag' (card) / 'rtag' (List). Returns
  //    the pill markup or '' (null/non-prestige). Callers prepend it to tags. ──
  function renderPrestige(prestige, opts){
    opts = opts || {};
    var base = opts.baseClass || 'chtag';
    if(prestige === 'Generational') return '<div class="'+base+' '+base+'-prestige-gen" data-tag="Generational"><span>GENERATIONAL</span></div>';
    if(prestige === 'Iconic') return '<div class="'+base+' '+base+'-prestige-ico" data-tag="Iconic"><span>ICONIC</span></div>';
    return '';
  }

  // ── Position display map , RENDER-ONLY rename (like the band display renames).
  //    Data bucket stays "Winger" (tags/filters/eligibility unchanged); the card
  //    just SHOWS the short code "WNG", matching GK/CB/FB/CDM/CM/CAM/ST. ──
  const POS_DISPLAY = { Winger: 'WNG' };
  function posDisplay(p){ return POS_DISPLAY[p] || p; }

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
      return '<span class="chtagcell gold" data-tag="'+escAttr(h.type)+'" data-tip="'+escAttr(h.oneliner||h.label)+'">'+(HONOUR_CHIP_LABEL[h.type]||h.label)+'</span>';
    }).join('');
    const profileMax = remaining - honShown.length;   // profile fills whatever honours left open
    let profilePills = '', profileShown = 0;
    if (Array.isArray(d.tags) && d.tags.length && profileMax > 0) {
      profilePills = renderTagPills(d.tags, { baseClass:'chtagcell', max:profileMax, el:'span', innerWrap:false });
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
    const prestige = renderPrestige(d.prestige, {baseClass:'chtag'});
    const c1 = d.club1 || '#2a2320', c2 = d.club2 || c1;
    const split = shieldSplit(c1, c2);
    // number ink: solid badge -> inkFor(c1) reliably contrasts; split -> add a contrast halo
    const ink = inkFor(c1);
    const numStroke = split ? (ink==='#fff' ? ' stroke="rgba(0,0,0,0.35)" stroke-width="0.6" paint-order="stroke"' : ' stroke="rgba(255,255,255,0.6)" stroke-width="0.6" paint-order="stroke"') : '';
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
      <div class="cname"><div class="nm${longName}">${flag}${d.surname}</div>${full}<div class="sub">${d.clubname} &middot; ${d.age}</div></div>
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
  const RADAR_REF = { goalThreat:1.5, creation:2.6, progression:4.0, defensive:8.0 };
  function radarFor(row){
    const m = row.minutes || 0;
    const p90 = v => (m>0 && v!=null) ? (v/m)*90 : 0;
    const r2 = v => Math.round(v*100)/100;
    const sc = (v,ref) => Math.max(0, Math.min(100, Math.round(v/ref*100)));

    const goalThreat  = p90(row.goals) + 0.3*p90(row.shots_on);
    const creation    = p90(row.passes_key) + 0.5*p90(row.assists);
    const progression = p90(row.dribbles_success) + 0.02*p90(row.passes_total);
    const defensive   = p90(row.tackles_total) + p90(row.interceptions) + 0.1*p90(row.duels_won);
    const reliability = Math.min(100, (m/(38*90))*100);   // raw availability, not per-90

    return {
      raw: {
        goalThreat:r2(goalThreat), creation:r2(creation), progression:r2(progression),
        defensive:r2(defensive), reliability:Math.round(reliability*10)/10
      },
      // provisional 0-100 (reliability is already 0-100); order matches DIMS
      scaled: {
        goalThreat:sc(goalThreat,RADAR_REF.goalThreat),
        creation:sc(creation,RADAR_REF.creation),
        progression:sc(progression,RADAR_REF.progression),
        defensive:sc(defensive,RADAR_REF.defensive),
        reliability:Math.round(reliability)
      },
      provisional: true   // flag: scaling is placeholder, not real percentiles
    };
  }

  // ── Confidence dots (Contract §5): 5 granular present, 2 at the wall ──
  const GRANULAR = ['shots_on','passes_key','dribbles_success','passes_total',
                    'tackles_total','interceptions','duels_won'];
  function confidenceFor(row){
    let present = 0;
    for (const f of GRANULAR) if (row[f]!=null) present++;
    const frac = present / GRANULAR.length;       // 0 at the wall, 1 fully granular
    return Math.round(2 + frac*3);                 // linear 2..5
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

  function per90(value, minutes) {
    if (value == null || !minutes || minutes <= 0) return null;
    return value / (minutes / 90);
  }

  // Map fine position_pool -> eligibility flags. Falls back to coarse family
  // when pool is null (38% of seasons, mostly pre-2015).
  function eligibility(fam, pool) {
    // pool can be: CB, RB, LB, CDM, CM, CAM, ST, LW, RW, GK, UNK, or null
    const p = pool || '';
    const wide = (p === 'LW' || p === 'RW' || p === 'RB' || p === 'LB');
    const centreBack = (p === 'CB');
    const striker = (p === 'ST');
    return {
      // Attacker tags
      goalMachine: fam === 'FWD' || fam === 'MID',          // anyone who can score
      clinical:    fam === 'FWD' || fam === 'MID',
      provider:    fam !== 'GK',                             // any outfielder can provide (GK excluded)
      poacher:     striker || (fam === 'FWD' && !pool),      // strikers (or coarse-FWD fallback)
      winger:      wide || (fam === 'FWD' && !pool),         // wide players (or coarse-FWD fallback)
      // Midfield tags
      playmaker:   fam === 'MID' || fam === 'FWD',
      maestro:     fam === 'MID',
      deepPlaymaker: fam === 'MID' || fam === 'DEF',         // deep mids + ball-playing CBs
      engineRoom:  fam === 'MID',
      dribbler:    fam === 'MID' || fam === 'FWD',
      // Defender tags , MID only via defensive/central pools (CDM/CM), never CAM;
      // null-pool MIDs excluded (under-tag rather than mis-tag attacking mids).
      theWall:     fam === 'DEF' || (fam === 'MID' && (pool === 'CDM' || pool === 'CM')),
      destroyer:   fam === 'DEF' || (fam === 'MID' && pool === 'CDM'),
      ballHawk:    fam === 'DEF' || (fam === 'MID' && (pool === 'CDM' || pool === 'CM')),
      ballPlaying: centreBack || (fam === 'DEF' && !pool),   // CBs (or coarse-DEF fallback)
      // Cross-dimensional
      complete:    fam !== 'GK',
      workhorse:   fam !== 'GK',
      // Age (handled separately, always eligible)
    };
  }

  const TAG_DEFS = {
  "Goal Machine":          { oneLiner: "Goals by the season, not the handful. Volume that bends a table.", def: "Some players score. This one scores, and scores, and scores again, until the goal becomes less an event than a habit. A season measured in the simplest, cruellest currency the game knows, and there was always more of it to come." },
  "Marksman":              { oneLiner: "A reliable source of goals, season after season. The dependable hand in front of goal.", def: "Not the name that headlines the highlight reel, but the one the table quietly depends on. Week after week the chances came, and week after week they were taken. Honest, steady scoring is its own kind of art." },
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
  "Iconic":                { oneLiner: "A season in the top five percent ever recorded, remembered forever.", def: "The year people reach for when the argument begins. A campaign that burned so brightly it earned its place in the permanent memory of the game. The season they will still be talking about long after the final whistle of a career." }
};

  // getVVTags(row) -> array of tag objects { name, family, tier }
  // families: ATT (red), MID (green), DEF (blue), AGE, CROSS
  function getVVTags(row) {
    const tags = [];
    const fam = row.position;            // coarse: DEF/MID/FWD/GK (100% populated)
    const pool = row.position_pool;      // fine: CB/RB/.../null (62% populated)
    const t = TAG_THRESHOLDS[fam];
    if (!t) return tags;                 // unknown family -> no tags

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

    // ========================= ATTACKER FAMILY (red) =========================
    // Goal Machine , high goal VOLUME (Universal)
    const gotGoalMachine = elig.goalMachine && ge(goals90, t.goals90_p90);
    if (gotGoalMachine)
      tags.push({ name: 'Goal Machine', family: 'ATT', tier: 'universal' });

    // Marksman , good-but-not-elite scorer, the tier BELOW Goal Machine (no double-tag)
    if (elig.goalMachine && !gotGoalMachine && ge(goals90, t.goals90_p85 * 0.907))
      tags.push({ name: 'Marksman', family: 'ATT', tier: 'universal' });

    // Clinical , high CONVERSION + real shot volume (Granular)
    if (elig.clinical && ge(conversion, t.conversion_p90 * 0.85) && row.shots_total >= 25)
      tags.push({ name: 'Clinical', family: 'ATT', tier: 'granular' });

    // Provider , high ASSISTS (Universal)
    if (elig.provider && ge(assists90, t.assists90_p90))
      tags.push({ name: 'Provider', family: 'ATT', tier: 'universal' });

    // Poacher , scores BUT does little else (Granular, compound , WILL NEED TUNING)
    if (elig.poacher && ge(goals90, t.goals90_p80)
        && le(keypass90, t.keypass90_p80 * 0.7)   // low creation
        && le(drib90, t.drib90_p85 * 0.7))        // low dribbling
      tags.push({ name: 'Poacher', family: 'ATT', tier: 'granular' });

    // The Winger , dribbles + (assists or progression) (Granular)
    if (elig.winger && ge(drib90, t.drib90_p85 * 0.92)
        && (ge(assists90, t.assists90_p90 * 0.7) || ge(keypass90, t.keypass90_p80)))
      tags.push({ name: 'The Winger', family: 'ATT', tier: 'granular' });

    // ========================= MIDFIELD FAMILY (green) =========================
    // Playmaker , high KEY PASSES (Granular)
    if (elig.playmaker && ge(keypass90, t.keypass90_p90 * 0.92))
      tags.push({ name: 'Playmaker', family: 'MID', tier: 'granular' });

    // Maestro , creates AND controls (Granular, compound)
    if (elig.maestro && ge(keypass90, t.keypass90_p80) && ge(passes90, t.passes90_p80 * 0.92))
      tags.push({ name: 'Maestro', family: 'MID', tier: 'granular' });

    // Regista , high pass VOLUME + ACCURACY (Granular, compound)
    if (elig.deepPlaymaker && ge(passes90, t.passes90_p80 * 0.87) && ge(passAcc, t.passacc_p80 * 0.97))
      tags.push({ name: 'Regista', family: 'MID', tier: 'granular' });

    // Engine Room , high pass volume + defensive work (box-to-box) (Granular, compound)
    if (elig.engineRoom && ge(passes90, t.passes90_p80 * 0.92) && ge(defact90, t.defact90_p70 * 0.92))
      tags.push({ name: 'Engine Room', family: 'MID', tier: 'granular' });

    // The Dribbler , high DRIBBLE success (Granular)
    if (elig.dribbler && ge(drib90, t.drib90_p90 * 0.92))
      tags.push({ name: 'The Dribbler', family: 'MID', tier: 'granular' });

    // ========================= DEFENDER FAMILY (blue) =========================
    // The Wall , high DEFENSIVE VOLUME (Granular)
    if (elig.theWall && ge(defact90, t.defact90_p90 * 0.92 * 1.04))
      tags.push({ name: 'The Wall', family: 'DEF', tier: 'granular' });

    // Destroyer , high DUELS WON (Granular)
    if (elig.destroyer && ge(duelswon90, t.duelswon90_p90 * 0.92 * 1.04)
        && ge(defact90, t.defact90_p70))   // real ball-winner: duels AND defensive actions (excludes wing-backs)
      tags.push({ name: 'Destroyer', family: 'DEF', tier: 'granular' });

    // Ball Hawk , high INTERCEPTIONS (Granular)
    if (elig.ballHawk && ge(int90, t.int90_p90 * 0.92))
      tags.push({ name: 'Ball Hawk', family: 'DEF', tier: 'granular' });

    // Ball-Playing CB , solid defensively + high accurate passing (Granular, compound)
    if (elig.ballPlaying && ge(defact90, t.defact90_p70 * 0.85)
        && ge(passes90, t.passes90_p80 * 0.80) && ge(passAcc, t.passacc_p80 * 0.93))
      tags.push({ name: 'Ball-Playing CB', family: 'DEF', tier: 'granular' });

    // ========================= CROSS-DIMENSIONAL =========================
    // Complete , elite at BOTH ends (Granular, compound , WILL NEED TUNING)
    const attackElite = ge(goals90, t.goals90_p85) || ge(keypass90, t.keypass90_p80);
    const defElite = ge(defact90, t.defact90_p70);
    if (elig.complete && attackElite && defElite)
      tags.push({ name: 'Complete', family: 'CROSS', tier: 'granular' });

    // Iron Man , ever-present, top minutes (Universal)
    if (elig.workhorse && ge(m, t.minutes_p90))
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
      // ── Mini-card face slots (consumed by buildCard) ──
      year:     fmtSeason(row.season),
      club1:    row.primary_colour   || undefined,
      club2:    row.secondary_colour || undefined,
      pos:      row.position_pool || row.position || '',   // canonical pool, coarse fallback
      vv:       rt != null ? rt : '',
      flag:     flagFor(row.nationality),
      surname:  surnameOf(row.player_name),
      full:     row.player_name || '',
      clubname: row.team_name || '',
      league:   row.league_code || '',                      // league filter (My Club) + cross-page consistency
      age:      (row.season_age != null ? String(row.season_age)   // Contract §1: prefer season_age
                : (row.age != null ? String(row.age) : '')),
      goals:    row.goals != null ? row.goals : 0,
      assists:  row.assists != null ? row.assists : null,
      assistsText: (row.assists != null ? String(row.assists) : 'NR'),

      // ── Computed Contract fields (rows / expanded card / radar / poster) ──
      band:       band,                 // §2  10-band ladder
      prestige:   prestigeFor(band),    // §3  band-bound badge (Generational / Iconic / null)
      radar:      radarFor(row),        // §4  { raw, scaled, provisional }
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

  // ── Tooltip viewport-guard , one delegated listener shifts any [data-tip]
  //    bubble back on-screen via --tip-shift (consumed by the ::after transform). ──
  (function(){
    if (typeof document === 'undefined') return;
    function guard(e){
      var el = e.target.closest && e.target.closest('[data-tip]');
      if(!el) return;
      var r = el.getBoundingClientRect();
      var center = r.left + r.width/2;
      var half = 130, margin = 10, vw = window.innerWidth, shift = 0;
      if(center - half < margin) shift = margin - (center - half);
      else if(center + half > vw - margin) shift = (vw - margin) - (center + half);
      el.style.setProperty('--tip-left', Math.round(center) + 'px');
      el.style.setProperty('--tip-bottom', Math.round(window.innerHeight - r.top + 9) + 'px');
      el.style.setProperty('--tip-shift', Math.round(shift) + 'px');
    }
    document.addEventListener('mouseover', guard, true);
    document.addEventListener('focusin', guard, true);
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
    player_of_season: 'The league’s outstanding player across the campaign.',
    golden_boot:      'The league’s top scorer. Nobody scored more.',
    top_assists:      'The league’s chief creator. Nobody made more.',
  };
  async function fetchHonours(row){
    const empty = { season: [], career: [], groups: {}, count: 0, has: false };
    if(!row || row.api_player_id == null) return empty;
    const sb = (typeof vvClient === 'function') ? vvClient() : null;
    if(!sb) return empty;
    const seasonYear = row.season_year != null ? row.season_year
                     : (row.season != null ? parseInt(String(row.season).slice(0,4), 10) : null);
    const leagueCode = row.league_code || null;
    let res;
    try {
      res = await sb.from('honours')
        .select('honour_type,season_year,league_code,honour_context,goals,assists')
        .eq('api_player_id', row.api_player_id);
    } catch(e){ return empty; }
    if(res.error || !res.data) return empty;
    const season = [];   // honours for THIS card's season+league
    const career = [];   // world_cup_winner etc. (player-level)
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
      if(h.honour_type === 'world_cup_winner'){
        career.push(item);
      } else if(seasonYear != null && h.season_year === seasonYear
                 && (!h.league_code || !leagueCode || h.league_code === leagueCode)){
        season.push(item);
      }
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
  function renderHonourChips(honours){
    if(!honours || !honours.has) return '';
    const items = honours.all || honours.season.concat(honours.career);   // tier-sorted combined (CHANGE 2)
    return items.map(function(h){
      const icon = HONOUR_ICON[h.type] || '';
      const label = HONOUR_CHIP_LABEL[h.type] || h.label;
      const tip = (h.oneliner || h.label) + (h.context ? '  ,  ' + h.context : '');
      return '<span class="chip gold" data-tip="'+escAttr(tip)+'">'+icon+label+'</span>';
    }).join('');
  }
  // WONDER TAGS: tap-expandable honour rows (wired NEXT step, not this one).
  function renderHonourRows(honours){
    if(!honours || !honours.has) return '';
    const items = honours.all || honours.season.concat(honours.career);   // tier-sorted combined (CHANGE 2)
    return items.map(function(h){
      const icon = HONOUR_ICON[h.type] || '';
      const oneLiner = h.oneliner || h.label;
      let more = h.context ? h.context : '';
      if(h.goals != null)   more = (more? more+' , ':'') + h.goals + ' goals';
      if(h.assists != null) more = (more? more+' , ':'') + h.assists + ' assists';
      return '<div class="tagrow honour" onclick="this.classList.toggle(\'open\')">'
        + '<div class="tt">'+icon+' '+h.label+' <span class="tchev">⌄</span></div>'
        + '<div class="td">'+escHtml(oneLiner)+'</div>'
        + (more ? '<div class="tmore">'+escHtml(more)+'</div>' : '')
        + '</div>';
    }).join('');
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

  // ── Expose ────────────────────────────────────────────────────────────
  const api = { inkFor, luma, shieldSplit, buildCard, renderTagPills, renderPrestige, getVVTags, TAG_DEFS, rowToCard, fmtSeason, surnameOf, flagFor,
                bandFor, prestigeFor, posDisplay, radarFor, confidenceFor, confidenceFields, vvClient,
                fetchHonours, HONOUR_META, HONOUR_ONELINER, HONOUR_GROUP_ORDER,
                renderHonourChips, renderHonourRows, renderTopHonourPill, HONOUR_ICON, HONOUR_CHIP_LABEL };
  for (const k in api) root[k] = api[k];   // globals, matching the inline-copy call sites
  root.VVCore = api;                        // namespaced handle
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
