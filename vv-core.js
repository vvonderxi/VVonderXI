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
  const RADAR_REF = { goalThreat:1.5, creation:2.6, progression:4.0, defensive:8.0 };
  // INTERIM cosmetic cap , no radar dimension displays a fake-perfect 100 (mirrors the rt ceiling).
  // Remove/replace when percentile-within-position scaling lands (parked, Blueprint §7).
  const RADAR_CAP = 97;
  function radarFor(row){
    const m = row.minutes || 0;
    const p90 = v => (m>0 && v!=null) ? (v/m)*90 : 0;
    const r2 = v => Math.round(v*100)/100;
    const sc = (v,ref) => Math.max(0, Math.min(RADAR_CAP, Math.round(v/ref*100)));

    const goalThreat  = p90(row.goals) + 0.3*p90(row.shots_on);
    const creation    = p90(row.passes_key) + 0.5*p90(row.assists);
    const progression = p90(row.dribbles_success) + 0.02*p90(row.passes_total);
    const defensive   = p90(row.tackles_total) + p90(row.interceptions) + 0.1*p90(row.duels_won);
    const reliability = Math.min(100, (m/(38*90))*100);   // raw availability, not per-90 , TRUE 100 for a full season

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
        reliability:Math.min(RADAR_CAP, Math.round(reliability))   // display caps at RADAR_CAP; raw.reliability stays true
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

  // ── RAW + SAMPLE GUARDS (added 2026-08-09, simulated across all 57,234 cards first) ──
  // WHY: the per-90 thresholds alone were position-relative but SCALE-BLIND. A 6-goal season
  // over 1,687 minutes clears the MID p90 goal rate and was earning "Goal Machine" (Nico
  // Williams 2526); a 1-assist season was earning "Playmaker" off key passes alone, because
  // Playmaker read passes_key and never touched assists (Barcola 2526).
  //
  // MEASURED EFFECT (% of all 57,234 cards): Goal Machine 5.45 -> 1.49, Marksman 4.82 -> 2.88,
  // Playmaker 6.35 -> 2.78. Cards with >=1 tag 37.2% -> 26.0%. ZERO cards at rt>=85 lose all
  // their tags. Iron Man and the two age tags are deliberately untouched , Iron Man is a
  // minutes tag by construction and the age tags key off rt, not per-90.
  //
  // MARKSMAN'S FLOOR IS NOT OPTIONAL, and it is the non-obvious one. Marksman fires on
  // `!gotGoalMachine`, so EVERY card the Goal Machine floor rejects falls straight into it.
  // Without MIN_GOALS_MARKSMAN the fix does not remove the misfire, it RENAMES it (Williams
  // 2526 simply became "Marksman" on the same 6 goals) and Marksman inflates to 8.78%,
  // the most common profile tag on the platform. Do not remove one floor without the other.
  const MIN_GOALS_GOALMACHINE = 12;   // 1.49% of cards. 15 was rejected: it is POSITION-BLIND,
                                      // and would strip De Bruyne 1920 (13g, rt91), Pogba 1819,
                                      // Son 1617, Maddison 2122 , midfielders who clear the MID
                                      // p90 rate (0.283/90 ~= 8.8 goals over 2,800 min) easily.
  const MIN_GOALS_MARKSMAN    = 8;    // leaves a clean 8-11 band below Goal Machine's 12.
  const MIN_ASSISTS_PLAYMAKER = 3;    // Barcola 2526 (1 assist) dies; his 2425 (10) survives.
  const MIN_MINUTES_TAG       = 900;  // 26.6% of cards sit below this, where per-90 inflates.
                                      // ~10 full matches. Gates every PER-90-derived tag.

  // NR IS NOT ZERO (house rule). A MISSING raw stat is EXEMPT from a raw floor rather than
  // failing it , 54.2% of rows have null assists (the pre-2015 FBref gap), and treating those
  // as 0 would silently punish a data gap as if it were a bad season. Costs 33 Playmaker cards.
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
  function eligibility(fam, pool) {
    // pool (8-bucket, LOCKED): GK, FB, CB, CDM, CM, CAM, Winger, ST, or null/UNK.
    // (Superseded the pre-lock LW/RW/RB/LB codes , which no longer exist in the data.)
    const p = pool || '';
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
    return {
      // Attacker tags
      goalMachine: fam === 'FWD' || fam === 'MID',          // scorers only (FBs are creators, not scorers)
      clinical:    fam === 'FWD' || fam === 'MID',
      provider:    fam !== 'GK',                             // any outfielder can provide (GK excluded; FB incl.)
      poacher:     striker || (fam === 'FWD' && !pool),      // strikers (or coarse-FWD fallback)
      winger:      winger || (fam === 'FWD' && !pool),       // POSITION tag: Winger pool + coarse-FWD fallback (NOT FBs)
      // Midfield tags
      playmaker:   fam === 'MID' || fam === 'FWD' || fb,     // ability tag: + attacking FBs (key-pass creators, TAA-type)
      maestro:     fam === 'MID',                            // central conductor , kept MID-only
      deepPlaymaker: fam === 'MID' || fam === 'DEF',         // deep mids + ball-playing CBs + FBs (Regista)
      engineRoom:  fam === 'MID',
      dribbler:    fam === 'MID' || fam === 'FWD' || fb,     // ability tag: + attacking FBs who carry
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

    // SAMPLE GATE , every per-90-derived tag below requires a real season behind the rate.
    // Iron Man and the age tags are OUTSIDE this gate on purpose (see the constants block).
    const okMin = (m != null && m >= MIN_MINUTES_TAG);

    // ========================= ATTACKER FAMILY (red) =========================
    // Goal Machine , high goal VOLUME (Universal). Rate AND raw total AND real sample.
    const gotGoalMachine = okMin && elig.goalMachine && ge(goals90, t.goals90_p90)
      && rawFloorOK(row.goals, MIN_GOALS_GOALMACHINE);
    if (gotGoalMachine)
      tags.push({ name: 'Goal Machine', family: 'ATT', tier: 'universal' });

    // Marksman , good-but-not-elite scorer, the tier BELOW Goal Machine (no double-tag).
    // Its own raw floor is load-bearing: this branch catches everything Goal Machine rejects.
    if (okMin && elig.goalMachine && !gotGoalMachine && ge(goals90, t.goals90_p85 * 0.907)
        && rawFloorOK(row.goals, MIN_GOALS_MARKSMAN))
      tags.push({ name: 'Marksman', family: 'ATT', tier: 'universal' });

    // Clinical , high CONVERSION + real shot volume (Granular)
    if (okMin && elig.clinical && ge(conversion, t.conversion_p90 * 0.85) && row.shots_total >= 25)
      tags.push({ name: 'Clinical', family: 'ATT', tier: 'granular' });

    // Provider , high ASSISTS (Universal)
    if (okMin && elig.provider && ge(assists90, t.assists90_p90))
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
    if (okMin && elig.maestro && ge(keypass90, t.keypass90_p80) && ge(passes90, t.passes90_p80 * 0.92))
      tags.push({ name: 'Maestro', family: 'MID', tier: 'granular' });

    // Regista , high pass VOLUME + ACCURACY (Granular, compound)
    if (okMin && elig.deepPlaymaker && ge(passes90, t.passes90_p80 * 0.87) && ge(passAcc, t.passacc_p80 * 0.97))
      tags.push({ name: 'Regista', family: 'MID', tier: 'granular' });

    // Engine Room , high pass volume + defensive work (box-to-box) (Granular, compound)
    if (okMin && elig.engineRoom && ge(passes90, t.passes90_p80 * 0.92) && ge(defact90, t.defact90_p70 * 0.92))
      tags.push({ name: 'Engine Room', family: 'MID', tier: 'granular' });

    // The Dribbler , high DRIBBLE success (Granular)
    if (okMin && elig.dribbler && ge(drib90, t.drib90_p90 * 0.92))
      tags.push({ name: 'The Dribbler', family: 'MID', tier: 'granular' });

    // ========================= DEFENDER FAMILY (blue) =========================
    // The Wall , high DEFENSIVE VOLUME (Granular)
    if (okMin && elig.theWall && ge(defact90, t.defact90_p90 * 0.92 * 1.04))
      tags.push({ name: 'The Wall', family: 'DEF', tier: 'granular' });

    // Destroyer , high DUELS WON (Granular)
    if (okMin && elig.destroyer && ge(duelswon90, t.duelswon90_p90 * 0.92 * 1.04)
        && ge(defact90, t.defact90_p70))   // real ball-winner: duels AND defensive actions (excludes wing-backs)
      tags.push({ name: 'Destroyer', family: 'DEF', tier: 'granular' });

    // Ball Hawk , high INTERCEPTIONS (Granular)
    if (okMin && elig.ballHawk && ge(int90, t.int90_p90 * 0.92))
      tags.push({ name: 'Ball Hawk', family: 'DEF', tier: 'granular' });

    // Ball-Playing CB , solid defensively + high accurate passing (Granular, compound)
    if (okMin && elig.ballPlaying && ge(defact90, t.defact90_p70 * 0.85)
        && ge(passes90, t.passes90_p80 * 0.80) && ge(passAcc, t.passacc_p80 * 0.93))
      tags.push({ name: 'Ball-Playing CB', family: 'DEF', tier: 'granular' });

    // ========================= CROSS-DIMENSIONAL =========================
    // Complete , elite at BOTH ends (Granular, compound , WILL NEED TUNING)
    const attackElite = ge(goals90, t.goals90_p85) || ge(keypass90, t.keypass90_p80);
    const defElite = ge(defact90, t.defact90_p70);
    if (okMin && elig.complete && attackElite && defElite)
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
      passes_key:     row.passes_key != null ? row.passes_key : null,
      tackles_total:  row.tackles_total != null ? row.tackles_total : null,
      tackles_blocks: row.tackles_blocks != null ? row.tackles_blocks : null,
      interceptions:  row.interceptions != null ? row.interceptions : null,
      season_age:  row.season_age != null ? row.season_age : null,

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
      return '<span class="'+cls+' gold" data-tip="'+escAttr(h.oneliner||h.label)+'">'+label+'</span>';
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
  function rankRowHTML(d,i,opts){
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
    var prestige = renderPrestige(d.prestige, { baseClass:'rtag' });
    var honN = Math.min(honList.length, cap);
    var honHtml = honN>0 ? renderHonourPillsCompact(d.honours, { baseClass:'rtag', max:honN }) : '';
    var rem = cap - honN;
    var tags = (rem>0) ? renderTagPills(d.tags, { baseClass:'rtag', max:rem }) : '';
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
      { sub:'Attack',       items:[ {v:'Goal Machine',e:'⚽'},{v:'Marksman',e:'🎯'},{v:'Clinical',e:'🔫'},{v:'Provider',e:'🅰️'},{v:'Poacher',e:'🦊'},{v:'The Winger',e:'🪄'} ] },
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
    const peak = c => { const s = (c.radar && c.radar.scaled) || {}; const k = ['goalThreat','creation','progression','defensive']; let bi = 0, bv = -1; k.forEach((x, i) => { if ((s[x] || 0) > bv) { bv = s[x] || 0; bi = i; } }); return k[bi]; };
    const varc = c => { const s = (c.radar && c.radar.scaled) || {}; const a = ['goalThreat','creation','progression','defensive'].map(x => s[x] || 0); const m = a.reduce((x, y) => x + y, 0) / 4; return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / 4); };
    const ctx = [];
    if (g <= 3 && va >= 80 && vb >= 80 && peak(A) !== peak(B)) ctx.push('different_worlds');
    if (Math.abs((A.season_year || 0) - (B.season_year || 0)) >= 8 && va >= 80 && vb >= 80) ctx.push('across_eras');
    if (((A.goals || 0) > (B.goals || 0) && va < vb) || ((B.goals || 0) > (A.goals || 0) && vb < va)) ctx.push('eye_test');
    if (g <= 3 && Math.abs(varc(A) - varc(B)) >= 14) ctx.push('complete_spec');
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
    if(lowest) out.push({ v:'__below', l:(lowest.lo-1)+' and under', lo:null, hi:lowest.lo-1,
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

  var VVF_GROUPS=[
    { key:'sort',     label:'Sort by',      select:'single', where:'server', items:VVF_SORTS },
    { key:'score',    label:'VV Score',     select:'multi',  where:'server', kind:'score' },
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
    if(!g.subs && key!=='score' && !vvfItems(g).length) return '';
    var head='<div class="vvf-group" data-vvf-groupkey="'+VVF_ESC(key)+'" data-vvf-where="'+g.where+'"'+
             ' data-vvf-select="'+g.select+'"><div class="vvf-gl">'+VVF_ESC(g.label)+'</div>';
    var body='';
    if(key==='score'){
      /* The previous two-overlaid-thumbs treatment, restored. The flat pair of
         native tracks that replaced it was a regression. BEHAVIOUR is the new one:
         the ends mean NO bound, so dragging to either extreme removes the clause
         rather than clamping at a floor of 15. */
      var lo=0, hi=100;
      body+='<div class="vvf-score">'+
        '<div class="vvf-svals"><span class="vvf-sv" data-vvf-role="rtvmin">'+lo+'</span>'+
        '<span class="vvf-svdash">to</span>'+
        '<span class="vvf-sv" data-vvf-role="rtvmax">'+hi+'</span></div>'+
        '<div class="vvf-dual"><div class="vvf-track"></div><div class="vvf-fill" data-vvf-role="rtfill"></div>'+
        '<input type="range" data-vvf-role="rtmin" min="'+lo+'" max="'+hi+'" value="'+lo+'">'+
        '<input type="range" data-vvf-role="rtmax" min="'+lo+'" max="'+hi+'" value="'+hi+'"></div></div>';
      body+='<div class="vvf-chips">'+bandPresets().map(function(it){ return vvfChip(key,it,{}); }).join('')+'</div>';
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
    return { sort:'rt', score:{lo:null,hi:null,bands:[]}, league:[], position:[],
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
    var mn=root.querySelector('[data-vvf-role="rtmin"]'), mx=root.querySelector('[data-vvf-role="rtmax"]');
    if(mn&&mx){
      var lo=+mn.value, hi=+mx.value; if(lo>hi){ var t=lo; lo=hi; hi=t; }
      // "at the ends" means NO bound , never amputate silently (rankings shipped a
      // floor of 15 against a live min(rt) of 11, hiding 1,030 cards)
      st.score.lo = (lo<=+mn.min) ? null : lo;
      st.score.hi = (hi>=+mx.max) ? null : hi;
    }
    return st;
  }
  function isActive(st){
    if(!st) return false;
    if(st.sort && st.sort!=='rt') return true;
    if(st.score && (st.score.lo!=null || st.score.hi!=null || st.score.bands.length)) return true;
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
    // VV Score , slider range AND band presets are SEPARATE constraints that AND
    if(st.score.lo!=null){ query=query.gte('rt', st.score.lo); applied.push('score.lo'); }
    if(st.score.hi!=null){ query=query.lte('rt', st.score.hi); applied.push('score.hi'); }
    if(st.score.bands.length){
      var presets=bandPresets(), byV={};
      presets.forEach(function(p){ byV[p.v]=p; });
      var rs=st.score.bands.map(function(v){ return byV[v]; }).filter(Boolean);
      var s=vvfRangeOr(rs); if(s){ query=query.or(s); applied.push('score.bands'); }
    }
    if(!opts.headCount){
      var so=VVF_SORTS.filter(function(x){ return x.v===st.sort; })[0]||VVF_SORTS[0];
      query=query.order(so.col,{ascending:so.asc, nullsFirst:false}); applied.push('sort:'+so.col);
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
    if(st.score.lo!=null || st.score.hi!=null){
      out.push('<button type="button" class="vvf-active-chip" data-vvf-remove="score" data-vvf-value="__range"'+
        ' aria-label="Remove score range"><span class="vvf-ag">VV Score</span>'+
        (st.score.lo==null?'up to '+st.score.hi:(st.score.hi==null?st.score.lo+'+':st.score.lo+' , '+st.score.hi))+
        '<span class="vvf-ax" aria-hidden="true">&times;</span></button>');
    }
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
    if(groupKey==='score' && value==='__range'){
      var mn=host.querySelector('[data-vvf-role="rtmin"]'), mx=host.querySelector('[data-vvf-role="rtmax"]');
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
    if(st.score.lo!=null || st.score.hi!=null){
      parts.push('VV ' + (st.score.lo==null ? ('up to '+st.score.hi)
                : (st.score.hi==null ? (st.score.lo+'+') : (st.score.lo+' , '+st.score.hi))));
    }
    ['league','position','profile','stage','trajectory'].forEach(function(gk){
      (st[gk]||[]).forEach(function(v){ parts.push(labelFor(gk,v)); });
    });
    var head=opts.searching ? 'No seasons match your search.' : 'No seasons match these filters.';
    if(!parts.length) return '<div class="vvf-empty-state">'+VVF_ESC(head)+'</div>';
    return '<div class="vvf-empty-state">'+VVF_ESC(head)+
      '<span class="vvf-es-why">All of these have to be true at once , '+
      VVF_ESC(parts.join(' + '))+'</span></div>';
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
    '.vvf-sub{font-family:\'Archivo\';font-weight:700;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:rgba(243,237,224,0.42);margin-top:4px}',
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
    '.vvf-svdash{font-family:\'Archivo\';font-weight:700;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:rgba(243,237,224,0.5)}',
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
    '.vvf-es-why{font-size:12.5px;opacity:.75;max-width:36ch;line-height:1.45}',
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
      if(!e.target.matches || !e.target.matches('[data-vvf-role="rtmin"],[data-vvf-role="rtmax"]')) return;
      var mn=host.querySelector('[data-vvf-role="rtmin"]'), mx=host.querySelector('[data-vvf-role="rtmax"]');
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
  function paintRange(host){
    var mn=host.querySelector('[data-vvf-role="rtmin"]'), mx=host.querySelector('[data-vvf-role="rtmax"]');
    if(!mn||!mx) return;
    var lo=+mn.value, hi=+mx.value; if(lo>hi){ var t=lo; lo=hi; hi=t; }
    var a=host.querySelector('[data-vvf-role="rtvmin"]'), b=host.querySelector('[data-vvf-role="rtvmax"]'),
        f=host.querySelector('[data-vvf-role="rtfill"]');
    if(a) a.textContent=lo; if(b) b.textContent=hi;
    if(f){ var MIN=+mn.min, MAX=+mx.max, span=(MAX-MIN)||1;
      f.style.left=(((lo-MIN)/span)*100)+'%'; f.style.width=((((hi-lo))/span)*100)+'%'; }
  }
  function clear(host){
    host.querySelectorAll('.vvf-chip.on').forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-pressed','false'); });
    var mn=host.querySelector('[data-vvf-role="rtmin"]'), mx=host.querySelector('[data-vvf-role="rtmax"]');
    if(mn) mn.value=mn.min; if(mx) mx.value=mx.max;
    var d=host.querySelector('.vvf-chip[data-vvf-group="sort"][data-vvf-value="rt"]');
    if(d){ d.classList.add('on'); d.setAttribute('aria-pressed','true'); }
    paintRange(host);
  }

  const VVFilters = { GROUPS:VVF_GROUPS, SORTS:VVF_SORTS, LEAGUES:VVF_LEAGUES,
    bandRanges, bandRange, bandPresets, rtFloorForPrestige,
    renderGroup, renderAll, mountStyles, mount, clear, paintRange,
    labelFor, renderActive, removeFrom, facetPlan, setAvailability, emptyStateHTML,
    emptyState, readState, isActive, applyServer, clientPredicate, describe };

  const api = { inkFor, luma, shieldSplit, buildCard, renderTagPills, renderPrestige, getVVTags, TAG_DEFS, rowToCard, fmtSeason, surnameOf, vvDisplayName, flagFor,
                vvNorm, tokenAndFilter, rankBySearch, vvParseSearch, vvSeasonLabel, searchFieldToken, SEARCH_CEIL,
                vvSeasonFromBareYear,
                FILTER_TAXONOMY, renderFilterChips, VERDICT_TAGS, verdictContext,
                bandFor, prestigeFor, posDisplay, radarFor, confidenceFor, confidenceFields, vvClient,
                fetchHonours, HONOUR_META, HONOUR_ONELINER, HONOUR_GROUP_ORDER,
                renderHonourChips, renderHonourRows, renderTopHonourPill, HONOUR_ICON, HONOUR_CHIP_LABEL,
                attachHonoursBatch, shapeHonoursForCard, renderHonourPillsCompact, emptyHonours,
                loadTeamHonours, teamHonoursFor, honTeamNorm,
                honourRowHTML, renderWonderTagsGrouped, HONOUR_DRURY, renderTrajectory, renderProfileTagRows,
                rankRowHTML, rowShieldHTML, vvCardFlip, vvBackFace,
                VVFilters };
  for (const k in api) root[k] = api[k];   // globals, matching the inline-copy call sites
  root.VVCore = api;                        // namespaced handle
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
