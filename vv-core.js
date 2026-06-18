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

  // ── buildCard , canonical Version A, with myclub's hidden-placeholder
  //    empty-tag branch adopted as the standard (keeps grid rows aligned). ──
  function buildCard(d, cw){
    const flag = d.flag ? `<span class="cflag">${d.flag}</span> ` : '';
    const full = d.full ? `<div class="full">${d.full}</div>` : '';
    const tag = d.tag ? `<div class="chtag"><span>${d.tag}</span></div>` : `<div class="chtag" aria-hidden="true"><span style="visibility:hidden">&middot;</span></div>`;
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
    return `<div class="vvcard" style="--cw:${cw}px">
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
      ${tag}
      <div class="cga"><div class="col"><div class="v">${d.goals}</div><div class="l">Goals</div></div><div class="divider"></div><div class="col"><div class="v">${d.assists}</div><div class="l">Assists</div></div></div>
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
    if(rt>=99) return 'S-Tier';
    if(rt>=96) return 'Generational';
    if(rt>=92) return 'Elite';
    if(rt>=88) return 'World Class';
    if(rt>=84) return 'Exceptional';
    if(rt>=80) return 'Excellent';
    if(rt>=75) return 'Very Good';
    if(rt>=70) return 'Good';
    if(rt>=60) return 'Okay';
    return 'Poor';
  }

  // ── Prestige badge (Contract §3), bound to BAND not rt ────────────────
  // Generational badge = Elite band and above; Iconic badge = World Class band.
  const GEN_BANDS = { 'Elite':1, 'Generational':1, 'S-Tier':1 };
  function prestigeFor(band){
    if(!band) return null;
    if(GEN_BANDS[band]) return 'Generational';
    if(band==='World Class') return 'Iconic';
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

  function rowToCard(row){
    if(!row) return null;
    const rt   = row.rt != null ? Math.round(row.rt) : null;
    const band = bandFor(rt);
    return {
      card_id:  row.card_id != null ? row.card_id : null,   // identity, links to card.html?id=
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
      assists:  row.assists != null ? row.assists : 0,

      // ── Computed Contract fields (rows / expanded card / radar / poster) ──
      band:       band,                 // §2  10-band ladder
      prestige:   prestigeFor(band),    // §3  band-bound badge (Generational / Iconic / null)
      radar:      radarFor(row),        // §4  { raw, scaled, provisional }
      confidence: confidenceFor(row),   // §5  X/5 dots

      // ── Seams not yet sourced (left blank by design) ──
      number:   null,        // shirt number , not in the view (cosmetic, open item)
      tag:      '',          // Tag Model v1.1 not wired yet -> hidden-placeholder pill
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
  const api = { inkFor, buildCard, rowToCard, fmtSeason, surnameOf, flagFor,
                bandFor, prestigeFor, radarFor, confidenceFor, vvClient };
  for (const k in api) root[k] = api[k];   // globals, matching the inline-copy call sites
  root.VVCore = api;                        // namespaced handle
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
