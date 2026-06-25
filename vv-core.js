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
        return `<${el} class="${baseClass} ${famClass}">${inner}</${el}>`;
      })
      .join('');
  }

  // ── renderPrestige (Contract §3) , shared prestige-pill renderer, mirrors
  //    renderTagPills's shape. baseClass 'chtag' (card) / 'rtag' (List). Returns
  //    the pill markup or '' (null/non-prestige). Callers prepend it to tags. ──
  function renderPrestige(prestige, opts){
    opts = opts || {};
    var base = opts.baseClass || 'chtag';
    if(prestige === 'Generational') return '<div class="'+base+' '+base+'-prestige-gen"><span>GENERATIONAL</span></div>';
    if(prestige === 'Iconic') return '<div class="'+base+' '+base+'-prestige-ico"><span>ICONIC</span></div>';
    return '';
  }

  // ── buildCard , canonical Version A, with myclub's hidden-placeholder
  //    empty-tag branch adopted as the standard (keeps grid rows aligned). ──
  function buildCard(d, cw){
    const flag = d.flag ? `<span class="cflag">${d.flag}</span> ` : '';
    const full = d.full ? `<div class="full">${d.full}</div>` : '';
    // ── Tag pills (Tag Model v1.1) , built via the shared renderTagPills helper
    //    (ordering / slice / family-class all live there). tags present but empty
    //    -> invisible placeholder (reserves row height). tags absent -> legacy
    //    d.tag string fallback, else placeholder. ──
    const tagPlaceholder = `<div class="chtag" aria-hidden="true"><span style="visibility:hidden">&middot;</span></div>`;
    let tag;
    if (Array.isArray(d.tags)) {
      if (d.tags.length) {
        tag = renderTagPills(d.tags, { baseClass:'chtag', max:3, el:'div', innerWrap:true });
      } else {
        tag = tagPlaceholder;                                             // tags present but empty -> placeholder (req 3)
      }
    } else {
      tag = d.tag ? `<div class="chtag"><span>${d.tag}</span></div>` : tagPlaceholder;  // legacy fallback (req 4) / placeholder
    }
    // ── Prestige tier pill (Contract §3) , the LOUD tag, leads the profile pills.
    //    Built via the shared renderPrestige helper; .chtag row stacks above ${tag}. ──
    const prestige = renderPrestige(d.prestige, {baseClass:'chtag'});
    const c1 = d.club1 || '#2a2320', c2 = d.club2 || c1;
    // number ink: on a split badge the number sits centred, so judge against the dominant/left colour
    const ink = inkFor(c1);
    const numStroke = (ink==='#fff' && c2!==c1) ? ' stroke="rgba(0,0,0,0.25)" stroke-width="0.6" paint-order="stroke"' : (ink!=='#fff' && c2!==c1 ? ' stroke="rgba(255,255,255,0.5)" stroke-width="0.6" paint-order="stroke"' : '');
    // number sizing: match the visual weight of a two-digit number like "14" (the default look).
    // single digits get a larger font so they fill the badge the same way; 3 digits shrink slightly.
    const numStr = (d.number!=null && d.number!=='') ? String(d.number) : '';
    const numSize = numStr.length>=3 ? 42 : (numStr.length===2 ? 46 : 56);
    const num = numStr ? `<text x="50" y="58" font-family="Archivo" font-weight="900" font-size="${numSize}" fill="${ink}" text-anchor="middle" dominant-baseline="central"${numStroke}>${numStr}</text>` : '';
    const uid = 'b'+Math.random().toString(36).slice(2,8);
    // badge fill: solid (c2==c1), or vertical split
    const badgeFill = (c2===c1)
      ? `<rect width="100" height="116" fill="${c1}"/>`
      : `<rect x="0" width="50" height="116" fill="${c1}"/><rect x="50" width="50" height="116" fill="${c2}"/>`;
    return `<div class="vvcard${d.prestige==='Generational'?' gen':d.prestige==='Iconic'?' iconic':''}" style="--cw:${cw}px">
      <div class="ctop">
        <div class="ctl">
          <div class="yr">${d.year}</div>
          <div class="cbadgewrap">
            <svg class="cbadge" viewBox="0 0 100 116"><defs><clipPath id="${uid}"><path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z"/></clipPath></defs><g clip-path="url(#${uid})">${badgeFill}</g><path d="M50 4 L92 18 L92 60 C92 88 72 104 50 112 C28 104 8 88 8 60 L8 18 Z" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.5"/>${num}</svg>
            <div class="pos">${d.pos}</div>
          </div>
        </div>
        <div class="ctr"><div class="halo"></div><div class="vv"><span class="a">V</span><span class="b">V</span></div><div class="n">${d.vv}</div></div>
      </div>
      <div class="cimg">${d.photo ? `<img class="cphoto" src="${d.photo}" alt="" onerror="this.style.display='none';this.parentNode.classList.add('no-photo')">` : ''}<svg viewBox="0 0 100 104" class="silh" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="s${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,255,255,0.22)"/><stop offset="1" stop-color="rgba(255,255,255,0.08)"/></linearGradient></defs><circle cx="50" cy="34" r="20" fill="url(#s${uid})"/><path d="M50 58 C28 58 14 74 12 96 C12 100 14 104 18 104 L82 104 C86 104 88 100 88 96 C86 74 72 58 50 58 Z" fill="url(#s${uid})"/></svg></div>
      ${prestige}${tag}
      <div class="cga"><div class="col"><div class="v">${d.goals}</div><div class="l">Goals</div></div><div class="divider"></div><div class="col"><div class="v">${d.assistsText}</div><div class="l">Assists</div></div></div>
      <div class="cname"><div class="nm">${flag}${d.surname}</div>${full}<div class="sub">${d.clubname} &middot; ${d.age}</div></div>
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

  // surname = last token of the display name (card shows surname big, full below)
  function surnameOf(name){
    if(!name) return '';
    const parts=String(name).trim().split(/\s+/);
    return parts[parts.length-1];
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
    if(rt>=94) return 'Generational';
    if(rt>=88) return 'Elite';
    if(rt>=82) return 'World Class';
    if(rt>=76) return 'Exceptional';
    if(rt>=68) return 'Excellent';
    if(rt>=58) return 'Very Good';
    if(rt>=45) return 'Good';
    if(rt>=30) return 'Okay';
    return 'Poor';
  }

  // ── Prestige badge (Contract §3), bound to BAND not rt ────────────────
  // Generational badge = Elite band and above; Iconic badge = World Class band.
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

    // Deep-Lying Playmaker , high pass VOLUME + ACCURACY (Granular, compound)
    if (elig.deepPlaymaker && ge(passes90, t.passes90_p80 * 0.87) && ge(passAcc, t.passacc_p80 * 0.97))
      tags.push({ name: 'Deep-Lying Playmaker', family: 'MID', tier: 'granular' });

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

    // Ball-Playing Defender , solid defensively + high accurate passing (Granular, compound)
    if (elig.ballPlaying && ge(defact90, t.defact90_p70 * 0.85)
        && ge(passes90, t.passes90_p80 * 0.80) && ge(passAcc, t.passacc_p80 * 0.93))
      tags.push({ name: 'Ball-Playing Defender', family: 'DEF', tier: 'granular' });

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

      // ── Seams not yet sourced (left blank by design) ──
      number:   null,        // shirt number , not in the view (cosmetic, open item)
      tag:      '',                 // legacy placeholder, kept falsy for backward-compat; remove after step 3 verified
      tags:     getVVTags(row),     // Tag Model v1.1 , array of {name,family,tier}; render consumes in step 3
      photo:    undefined    // headshot URL pattern unresolved -> silhouette fallback
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

  // ── Expose ────────────────────────────────────────────────────────────
  const api = { inkFor, buildCard, renderTagPills, renderPrestige, getVVTags, rowToCard, fmtSeason, surnameOf, flagFor,
                bandFor, prestigeFor, radarFor, confidenceFor, vvClient };
  for (const k in api) root[k] = api[k];   // globals, matching the inline-copy call sites
  root.VVCore = api;                        // namespaced handle
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
