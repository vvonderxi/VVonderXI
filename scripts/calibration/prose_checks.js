/*  THE CODE HALF OF THE PROSE CHECK (2026-10-23): ARITHMETIC AND CROWNS, NOT A MODEL.
 *
 *  Lucas, 2026-10-23: arithmetic, and "does this crown agree with the honours and the page's result",
 *  are code questions we were handing to a language model. Code repeats exactly; a model does not.
 *  Build those two even if the rest of the rewrite disappoints.
 *
 *  THE EVIDENCE IS THE RENDERED PAGE, NOT THE WRITER'S PAYLOAD (area 9, 2026-10-23). `ev` is one item
 *  of _local/verdict-check/evidence_set.json: `evidence` is the message the page sent (its figures were
 *  audited against the rendered pages, every number found), and `page` is the rendered text of Compare
 *  and each card with every fold open, so the Chronicle and the honour and tag copy count as support.
 *
 *  checkNumbers(prose, ev)   PART 2. Every number in the prose, bound to the unit beside it (goals,
 *      minutes, starts, percentile...), must be a figure the page shows for that unit, or a sum or a
 *      difference of two of them, or a ratio of two (minutes per goal), or, with "over", "almost",
 *      "roughly" and the like, close to one. A unit no page shows at all (starts, penalties, dribbles,
 *      duels, passes per 90) fails whatever the number, which is how a "32 starts" that happens to
 *      equal 32 appearances is caught (the set's own detection limit names that case).
 *      A number with no unit next to it is only looked for anywhere on the page: weak, and reported
 *      as weak (`unbound` in the result), never counted as a pass of the strong kind.
 *  checkMeasures(prose, ev)  PART 2 TOO: a measure no page shows (duels, dribbles, penalties, starts,
 *      the position cut-offs) named without any number, "the duels that pile up". Same rule.
 *  checkCrowns(sentences, reads, ev)   PART 3. `reads` says, per sentence, which side it argues for and
 *      whether it declares an overall winner; that reading is the only model step (readCrowns). Code
 *      then decides: a crown where the page says it cannot separate the pair, or names the other side,
 *      is kind 3b; a crown for a side that leads neither the player honours nor the dimensions the
 *      page draws is kind 3; a crown under a headline that crowns nobody, or the other side, is kind 4.
 *
 *  Not wired into api/analyse.js. Prose is off, and the endpoint does not have the rendered page:
 *  how the server gets the Chronicle and the copy is a decision for when the checker is switched on.
 */

const W1 = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const W10 = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ORD = /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)$/;

/*  Units, and the words that name them. NO_SOURCE are measures no page prints (area 9, the rule
    "the writer must not state a number the reader cannot check"), so any number on them fails.  */
const NO_SOURCE = { starts: 'starts', penalties: 'penalties', dribbles: 'dribbles', duels: 'duels', passes90: 'passes per 90' };
function unitOf(w, next) {
  if (/^start(s|ed)?$/.test(w)) return 'starts';
  if (/^(spot|penalty|penalties|non)$/.test(w) || (w === 'open' && next === 'play')) return 'penalties';
  if (/^dribbl/.test(w)) return 'dribbles';
  if (/^duels?$/.test(w)) return 'duels';
  if (w === 'goal' && /^(contribution|involvement)/.test(next || '')) return 'contributions';
  if (/^goals?$/.test(w)) return 'goals';
  if (/^assists?$/.test(w)) return 'assists';
  if (/^minutes?$/.test(w)) return 'minutes';
  if (/^(appearances?|apps|times|games?|matches)$/.test(w)) return 'apps';
  if (/^tags?$/.test(w)) return 'tags';
  if (/^(dimensions?|measures?|attributes?|metrics?|pillars?)$/.test(w)) return 'dimensions';
  if (/^(shots?|attempts)$/.test(w)) return 'shots';
  if (/^saves?$/.test(w)) return 'saves';
  if (/^percentile/.test(w)) return 'percentile';
  if (/^years?$/.test(w)) return 'years';
  if (/^points?$/.test(w)) return 'points';
  if (w === 'cent' || w === '%') return 'pct';
  if (/^(honours?|awards?)$/.test(w)) return 'honours';
  return null;
}
const DIM = /^(threat|creation|progression|defensive|reliability|availability)$/;

function clean(t) {
  return String(t).replace(/\*\*/g, '').replace(/[“”]/g, '"').replace(/[’‘]/g, "'").replace(/(\d),(\d{3})\b/g, '$1$2');
}
/*  Tokens with their offsets. Hyphens become spaces (forty-nine, 32-year-old, non-spot, per-90)
    except a minus sign; "%" is its own token.  */
function tokens(text) {
  const t = clean(text).replace(/([A-Za-z0-9])-(?=[A-Za-z0-9])/g, '$1 ');
  const out = [], re = /\d+(?:\.\d+)?(?:st|nd|rd|th)?|%|[A-Za-zÀ-ÿ']+|[.,;:!?()"]/g; let m;
  while ((m = re.exec(t))) out.push({ s: m[0], lw: m[0].toLowerCase(), i: m.index, end: m.index + m[0].length });
  return { t, toks: out };
}
const PUNCT = /^[.,;:!?()"]$/;

/*  Every number in a text, with its unit, qualifier and the clause it sits in.  */
function extractNumbers(text) {
  const { t, toks } = tokens(text), out = [];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k]; let v = null, j = k, ordinal = false;
    if (/^\d/.test(tk.s)) {
      ordinal = /(st|nd|rd|th)$/.test(tk.s);
      v = parseFloat(tk.s);
      const before = t[tk.i - 1], after = t[tk.end];
      if (before === '/' || after === '/' || (/^(19|20)\d\d$/.test(tk.s))) continue;   // seasons and years
    } else if (W10[tk.lw] != null) {
      v = W10[tk.lw];
      const n = toks[k + 1];
      if (n && ORD.test(n.lw)) { k++; continue; }                                    // twenty-second
      if (n && W1[n.lw] != null && W1[n.lw] < 10 && W1[n.lw] > 0) { v += W1[n.lw]; j = k + 1; }
    } else if (W1[tk.lw] != null) {
      v = W1[tk.lw];
    } else continue;
    if (toks[j + 1] && toks[j + 1].lw === 'hundred') { v *= 100; j++; }
    if (toks[j + 1] && toks[j + 1].lw === 'and' && toks[j + 2] && toks[j + 2].lw === 'a' && toks[j + 3] && toks[j + 3].lw === 'half') { v += 0.5; j += 3; }
    // the clause: between the nearest punctuation either side
    let a = k; while (a > 0 && !PUNCT.test(toks[a - 1].s)) a--;
    let b = j; while (b < toks.length - 1 && !PUNCT.test(toks[b + 1].s)) b++;
    const clause = t.slice(toks[a].i, toks[b].end).trim();
    // ahead stops at the next number, so "123 for 28 goals" does not give 123 the unit of 28
    let e = j + 1; while (e <= b && !/^\d/.test(toks[e].s) && W1[toks[e].lw] == null && W10[toks[e].lw] == null) e++;
    const ahead = toks.slice(j + 1, e).map(x => x.lw), back = toks.slice(a, k).map(x => x.lw);
    if (toks[k - 1] && toks[k - 1].lw === 'per' && v === 90) { k = j; continue; }       // the 90 of "per 90"
    if (tk.lw === 'one' && !/^(more|fewer|additional|less)$/.test((toks[j + 1] || {}).lw || '')) { k = j; continue; }   // "one lane each", "one goal every
    // unit: the next three words first, a no-source word anywhere in the clause next, then the words before
    let unit = null;
    for (let q = 0; q < Math.min(3, ahead.length) && !unit; q++) {
      const w = ahead[q];
      if (w === 'per' && /^(90|ninety)$/.test(ahead[q + 1] || '')) { unit = ahead.slice(0, q).some(x => /^pass/.test(x)) && !ahead.slice(0, q).includes('key') ? 'passes90' : 'per90'; break; }
      if (w === 'year' && ahead[q + 1] === 'old') { unit = 'years'; break; }
      unit = unitOf(w, ahead[q + 1]);
      if (unit === 'points' && q > 1) unit = null;   // "33 underline the point" is not 33 points (2026-10-24)
    }
    let bind = unit ? 'ahead' : null;
    if (unit === 'shots' && back.concat(ahead).some(w => /^dribbl/.test(w))) unit = 'dribbles';
    if (unit === 'shots' && back.concat(ahead).some(w => /^(non|spot|penalty)$/.test(w))) unit = 'penalties';
    if (!unit || unit === 'goals' || unit === 'shots') {
      const win = back.slice(-6).concat(ahead.slice(0, 6));
      for (let q = 0; q < win.length; q++) { const u = unitOf(win[q], win[q + 1]); if (u && NO_SOURCE[u]) { unit = u; bind = 'window'; break; } }
    }
    if (!unit) {
      const bw = back.slice(-4);
      if (bw.some(w => DIM.test(w))) { unit = bw.some(w => /^(reliability|availability)$/.test(w)) ? 'reliability' : 'dimension'; bind = 'dim'; }   // before the age rule: "Reliability rated at 39" is not an age (2026-10-24, the confirming run)
      else if ((/^(at|aged)$/.test(bw[bw.length - 1] || '') || (bw.slice(-2).join(' ') === 'age of')) && v >= 14 && v <= 45) { unit = 'years'; bind = 'age'; }   // "Iconic at 91" is a score, not an age
      else { for (let q = bw.length - 1; q >= 0 && !unit; q--) unit = unitOf(bw[q], bw[q + 1]); if (unit) bind = 'back'; }
    }
    if (ordinal && unit !== 'percentile') { k = j; continue; }                    // the 41st goal
    let qual = (back.slice(-2).join(' ').match(/(over|more than|almost|nearly|roughly|about|around|some|under|close to)$/) || [])[1] || null;
    if (qual === 'over' && /^(more|fewer|extra|additional|less)$/.test(ahead[0] || '')) qual = null;   // "over two more appearances" is a span (2026-10-24)
    out.push({ value: v, raw: t.slice(tk.i, toks[j].end), unit, qualifier: qual, clause, bind });
    k = j;
  }
  return out;
}

/*  THE FIGURES THE PAGE SHOWS, PER UNIT. From the message the page sent (audited against the
    rendered pages) and from the numbers the rendered page states beside a unit word.  */
function pageFigures(ev) {
  const F = {}, add = (u, v) => { if (v == null || isNaN(v)) return; (F[u] = F[u] || new Set()).add(+v); };
  const sides = [];
  if (/Card data:\n/.test(ev.evidence)) {
    const P = JSON.parse(ev.evidence.split('Card data:\n')[1]);
    const s = { goals: P.goals, assists: P.assists, minutes: P.minutes, apps: P.appearances, age: +P.age, shots: P.shots_total, pct: [], rel: null, kp90: P.key_passes_per90, honours: (P.honours || []).length, playerHonours: (P.honours || []).filter(h => h.won_by === 'player').length, cabinet: (P.cabinet || []).length, tags: (P.tag_glosses || []).length, dims: {} };
    const vals = (P.dimensions && P.dimensions.values) || {};
    for (const [k, x] of Object.entries(vals)) { if (x.percentile_in_pool != null) { s.pct.push(x.percentile_in_pool); s.dims[k] = x.percentile_in_pool; } if (x.pct_of_full_season != null) s.rel = x.pct_of_full_season; }
    if (P.keeper) { const K = P.keeper; add('saves', K.saves); add('shots', K.shots_faced_derived); add('pct', K.save_rate_pct); add('points', K.save_rate_se_pp); (K.percentile_band || []).forEach(x => add('percentile', x)); add('pct', K.pool_median_pct); }
    (P.savePctSeries || []).forEach(x => add('pct', x.savePct));
    if (P.rt != null) add('score', P.rt);
    sides.push(s);
  } else {
    for (const l of ev.evidence.split('\n').filter(x => /^Player [AB]:/.test(x))) {
      const g = re => { const m = l.match(re); return m ? +m[1] : null; };
      const s = { side: l[7], surname: (l.match(/^Player [AB]: ([^(]+?) \(/) || [])[1], goals: g(/, (\d+) goals \d+ assists/), assists: g(/ goals (\d+) assists/), minutes: g(/(\d+) min \//), apps: g(/min \/ (\d+) apps/), age: g(/, age (\d+)/), shots: g(/goals \d+ of (\d+) shots/), kp90: g(/key passes\/90 ([\d.]+)/), rel: g(/Reliability (\d+)/), pct: [], dims: {} };
      const T = (l.match(/TAG MEANINGS: (.*?); \d+ min/) || [])[1] || '';
      s.tags = T ? T.split(' | ').length : 0;
      for (const d of ['Goal Threat', 'Creation', 'Progression', 'Defensive']) { const x = g(new RegExp(d + ' (\\d+)')); if (x != null) { s.pct.push(x); s.dims[d] = x; } }
      if (s.rel != null) s.dims.Reliability = s.rel;
      const H = (l.match(/HONOURS: (.*?); (?:CABINET|CAREER STAGE|TAG MEANINGS|\d+ min)/) || [])[1] || '';
      const hs = H ? H.split(/; (?=[A-Z])/) : [];
      s.honours = hs.length; s.playerHonours = hs.filter(h => /\(player/.test(h)).length;
      const CB = (l.match(/CABINET: (.*?); (?:CAREER STAGE|TAG MEANINGS|\d+ min)/) || [])[1] || '';
      s.cabinet = CB ? CB.split(/; (?=[A-Z])/).length : 0;   // "N honours" may be the Cabinet's count too (2026-10-24)
      add('score', g(/VV (\d+)/));
      sides.push(s);
    }
  }
  for (const s of sides) {
    add('goals', s.goals); add('assists', s.assists); add('minutes', s.minutes); add('apps', s.apps); add('years', s.age);
    add('shots', s.shots); add('per90', s.kp90); s.pct.forEach(x => { add('percentile', x); add('dimension', x); });
    if (s.rel != null) { add('reliability', s.rel); add('pct', s.rel); add('dimension', s.rel); }
    add('contributions', (s.goals || 0) + (s.assists || 0)); add('honours', s.playerHonours); add('honours', s.honours); if (s.cabinet) add('honours', s.cabinet);
    add('tags', s.tags);   // A COUNT THE PAGE CAN VERIFY IS CHECKED AGAINST THE PAGE (Lucas, 2026-10-24): the tag count comes from the request, which the capture audits against the rendered page
  }
  // the rendered page: a number beside a unit word counts for that unit; every number counts as "on the page"
  const pageText = [ev.page && ev.page.compare || ''].concat(Object.values((ev.page && ev.page.cards) || {})).join('\n');
  const onPage = new Set();
  for (const x of extractNumbers(pageText)) { onPage.add(x.value); if (x.unit && x.unit !== 'tags' && x.unit !== 'honours') add(x.unit, x.value); }   // counts come from the audited request only, not from numbers that happen to sit near "tags" on the page
  (clean(pageText).match(/\d+(?:\.\d+)?/g) || []).forEach(n => onPage.add(+n));
  return { F, onPage, sides };
}

function near(v, set, qual) {
  for (const a of set) {
    if (qual === 'over' || qual === 'more than') { if (a > v && a <= v * 1.25) return true; }
    else if (qual === 'almost' || qual === 'nearly' || qual === 'under' || qual === 'close to') { if (a < v && a >= v * 0.85) return true; }
    else if (Math.abs(a - v) <= Math.max(0.1 * v, 0.5)) return true;
  }
  return false;
}
function derived(F, unit) {
  const base = [...(F[unit] || [])], out = new Set(base);
  for (const a of base) for (const b of base) { out.add(Math.abs(a - b)); out.add(a + b); }
  if (unit === 'points') for (const u of ['percentile', 'reliability', 'score']) { const xs = [...(F[u] || [])]; xs.forEach(x => out.add(x)); for (const a of xs) for (const b of xs) out.add(Math.abs(a - b)); }   // "one point above Messi's 96", "separated by two points" (2026-10-24)
  if (unit === 'years') { const xs = [...(F.years || [])]; for (const a of xs) for (const b of xs) out.add(Math.abs(a - b)); }
  if (unit === 'minutes' || unit === 'shots') {   // "every 49 minutes", "one goal every three and a half shots"
    const num = [...(F[unit] || [])], den = [...(F.goals || []), ...(F.assists || []), ...(F.contributions || [])];
    for (const a of num) for (const b of den) if (b) { out.add(Math.round(a / b)); out.add(Math.floor(a / b)); out.add(Math.round(a / b * 2) / 2); }
  }
  return out;
}

/*  A TAG NAME IS NOT A MEASURE (Lucas, 2026-10-24). "The Dribbler" was flagged four times in run 2 as the
    dribbles measure no page prints; the tag is on the page and the sentence was quoting it. Tag names
    that contain a measure word are blanked before either check reads the prose.  */
const TAG_NAMES = /\bThe Dribbler\b/gi;
function stripTagNames(prose) { return String(prose).replace(TAG_NAMES, 'that tag'); }
/*  THE CROSS-UNIT REPAIR (Lucas, 2026-10-24: "ten of twelve flags are one fault and it is making me distrust
    the list"). The twelve flags on the four clean runs of both samples were all true numbers: a bare
    difference with no unit word ("a gap of 27", 35 goals against 8); a number bound BACKWARDS to the
    previous clause's unit word ("Rice's 7 in 38" read as 7 appearances, "2938 minutes across 35" as 35
    minutes, "per 90 minutes outpace Pogba's 1.64" as 1.64 minutes); "goal involvement" not read as
    contributions; "over two more appearances" read as the qualifier "over 2". So, in order: an exact
    figure of the bound unit always passes, qualifier or not; a number whose unit came from the BACK scan,
    the weakest binding, passes if it is an exact figure of ANY unit on the page or a number the page
    prints; and a number in a clause with an arithmetic word (gap, by, more, fewer, combined, total,
    apart, margin, add, between) passes if it is a sum or difference of two OTHER numbers stated in the
    same sentence, whatever unit it was bound to (the writer did the arithmetic on figures it stated; a
    union of every unit's sums and differences was tried first and let "a gap of 40" through, because
    the percentiles alone make almost any number under 100). The accepted loss: a back-bound number that is a true figure stated
    as the wrong unit ("7 appearances" when 7 is his goals) is no longer a code flag; the sentence judge,
    which reads the page, is what sees that shape now.  */
const ARITH = /\b(gap|by|more|fewer|less|extra|combined|total|together|sum|difference|apart|margin|add(?:ed|s)?|plus|between|separat(?:e|es|ed|ing)|clear of|ahead of|behind|short of)\b/i;
function sentencesOf(text) { return clean(text).replace(/(\d)\.(\d)/g, '$1\u0000$2').match(/[^.!?]+(?:[.!?]+["']?|$)/g) || []; }
function checkNumbers(prose, ev) {
  const { F, onPage, sides } = pageFigures(ev), flags = [], unbound = [];
  const nums = [];
  for (const sent of sentencesOf(stripTagNames(prose))) {
    const xs = extractNumbers(sent.replace(/\u0000/g, '.'));
    for (const n of xs) {
      const others = xs.filter(o => o !== n).map(o => o.value), stated = new Set();
      for (const a of others) for (const b of others) if (a !== b || others.filter(v => v === a).length > 1) { stated.add(Math.round((a + b) * 100) / 100); stated.add(Math.round(Math.abs(a - b) * 100) / 100); }
      nums.push(Object.assign(n, { stated }));
    }
  }
  for (const n of nums) {
    const why = (u, more) => ({ quote: n.clause, why: `"${n.raw}" ${more}`, kind: 2, check: 'numbers', unit: u });
    const rescue = () => (n.bind === 'back' && onPage.has(n.value)) || (ARITH.test(n.clause) && n.stated.has(n.value));
    if (NO_SOURCE[n.unit]) {
      if (!(F[n.unit] && F[n.unit].has(n.value))) flags.push(why(n.unit, `is a number of ${NO_SOURCE[n.unit]}, which no page shows`));
      continue;
    }
    /*  A COUNT OF DIMENSIONS MAY BE ANY NUMBER UP TO THE TOTAL THE PAGE PRINTS (Lucas, 2026-10-24): every card
        prints the same five attributes, four dimensions and Reliability, and a reader can count any subset.
        Tags and honours vary per card, so those counts stay exact (the page's total only). The asymmetry is
        deliberate: a fixed visible set can be subset by eye; a variable one cannot be checked without the total.  */
    if (n.unit === 'dimensions') {
      const total = sides.reduce((t, s) => t + Object.keys(s.dims || {}).length, 0);
      if (!(n.value >= 1 && n.value <= total)) flags.push(why('dimensions', `is a count of dimensions above the ${total} the page prints`));
      continue;
    }
    if (n.unit && n.unit !== 'honours' && n.unit !== 'tags') {
      const set = derived(F, n.unit);
      if (!set.size) { if (!rescue()) flags.push(why(n.unit, `is a figure of a kind (${n.unit}) no page shows for this pair`)); else unbound.push({ raw: n.raw, clause: n.clause, crossUnit: n.unit }); continue; }
      const ok = set.has(n.value) || (n.qualifier ? near(n.value, set, n.qualifier) : (n.unit === 'shots' || n.unit === 'minutes') && near(n.value, set, null) && !Number.isInteger(n.value));
      if (!ok) { if (rescue()) unbound.push({ raw: n.raw, clause: n.clause, crossUnit: n.unit }); else flags.push(why(n.unit, `matches no ${n.unit} figure on the page (${[...(F[n.unit] || [])].join(', ') || 'none'}), nor a sum or difference of two`)); }
      continue;
    }
    if (n.unit === 'honours') { if (!derived(F, 'honours').has(n.value)) flags.push(why('honours', 'matches no honours count on the page')); continue; }
    if (n.unit === 'tags') { if (!derived(F, 'tags').has(n.value)) flags.push(why('tags', `matches no tag count on the page (${[...(F.tags || [])].join(', ') || 'none'}), nor a sum or difference of two`)); continue; }
    if (onPage.has(n.value) || (n.qualifier && near(n.value, onPage, n.qualifier))) unbound.push({ raw: n.raw, clause: n.clause });
    else if (ARITH.test(n.clause) && n.stated.has(n.value)) unbound.push({ raw: n.raw, clause: n.clause, crossUnit: 'arithmetic' });   // "a gap of 27", 35 goals against 8 in the same sentence
    else flags.push(why(null, 'is a number that appears nowhere on the page, nor is it a sum or difference of two figures stated in the sentence'));
  }
  return { flags, unbound };
}

/*  A MEASURE NO PAGE SHOWS, NAMED WITHOUT A NUMBER (2026-10-23). "The duels that pile up", "without a
    single penalty", "the pool bar": the same rule as the numbers, since a reader cannot check a claim
    about a measure the page never prints. Keepers' cards print penalties saved, so a keeper's penalty
    is exempt.  */
const MEASURES = [
  [/\bduels?\b/i, 'duels', /Duels won/], [/\bdribbl/i, 'dribbles', /Successful dribbles/],
  [/\b(penalt(?!y area)|spot\b|non spot|open play)/i, 'penalties', null],
  [/\bpool bar\b|\bbar for (his|the) (position|pool)|percentile bar|\bcut ?off/i, 'the position cut-offs', null],
];
/*  Starts are left to the number check: as a word, "start" is mostly a verb ("before they start").
    A sentence about COVERAGE, whether the measure was recorded at all, is checkable: every card's data
    panel lists "Successful dribbles" and "Duels won" as Verified or not recorded. So "Shots, key passes,
    dribbles... none are recorded" and "documented at full depth: shots, dribbles, duels" pass; "the
    duels that pile up" does not.  */
const COVERAGE = /\b(none|neither|not recorded|no record|absent|exists?|present|recorded|documented|available|missing)\b/i;
function checkMeasures(prose, ev) {
  const keeper = /"keeper":/.test(ev.evidence), flags = [];
  const pageText = [ev.page && ev.page.compare || ''].concat(Object.values((ev.page && ev.page.cards) || {})).join('\n') + '\n' + ev.evidence;
  const text = clean(stripTagNames(prose)).replace(/([A-Za-z])-(?=[A-Za-z])/g, '$1 ');
  for (const sent of (text.match(/(?:\d\.\d|[^.!?])+[.!?]*/g) || [])) {
    const coverage = COVERAGE.test(sent);
    for (const cl of (sent.match(/(?:\d[.,]\d|[^;,:])+/g) || [])) {
      for (const [re, name, notRecorded] of MEASURES) {
        if (!re.test(cl) || (keeper && name === 'penalties')) continue;
        if (coverage && notRecorded && notRecorded.test(pageText)) continue;
        flags.push({ quote: cl.trim(), why: `names ${name}, which no page shows`, kind: 2, check: 'measures' }); break;
      }
    }
  }
  return flags;
}

/*  SENTENCES, KEPT WITH THEIR FIELD. A verdict's headline is `who`; a card's is the glance line.  */
function splitSentences(prose, type) {
  const fields = type === 'verdict' ? ['who', 'p1', 'p2', 'h2h', 'verdict'] : ['glance', 'scout', 'notes'];
  const out = [];
  for (const f of fields) {
    const txt = Array.isArray(prose[f]) ? prose[f].join('\n\n') : (prose[f] || '');
    // a decimal point is not a sentence end: "4.09 per 90" was split into "4." and "09 per 90" (found 2026-10-24)
    (clean(txt).replace(/(\d)\.(\d)/g, '$1\u0000$2').match(/[^.!?]+(?:[.!?]+["']?|$)/g) || []).map(s => s.replace(/\u0000/g, '.').trim()).filter(Boolean).forEach(s => out.push({ field: f, n: out.length + 1, sentence: s }));
  }
  return out;
}

/*  THE ONE MODEL STEP OF PART 3: WHO DOES EACH SENTENCE ARGUE FOR, AND IS IT A CROWN. The model does
    not judge whether a crown is deserved; code does, from the page. Needs ANTHROPIC_API_KEY.  */
const CROWN_MODEL = 'claude-haiku-4-5-20251001';
const CROWN_SYSTEM = `You read a comparison of two football player-seasons, sentence by sentence. For each numbered sentence say which player it argues for, and whether it declares an overall winner of the comparison.

favours: "A" or "B" when the sentence argues that player's season is better, stronger, rarer, harder or more complete, in whole or on the point it makes; "none" when it describes, balances or argues for neither.
crown: true ONLY when the sentence settles the comparison as a whole for one player: names him the winner, says he edges it, takes it, prevails, that his season was the better or rarer or harder one overall, or that the matter is settled or tipped in his favour. A point in one player's favour that leaves the whole open is not a crown. A sentence saying the two cannot be separated is not a crown.
These are ALWAYS crowns, however softly or narrowly put, including "by the thinnest of margins": "edges it", "edges" the rivalry or the comparison, "shades it", "just ahead", "the better of the two", "takes it", "wins the argument", "if pushed", "on balance", "favours" him overall, "tips it", "settles this", and every near variant. A narrow win is still a win.

Reply with JSON only: {"reads":[{"n":1,"favours":"A","crown":false}, ...]} with one entry per sentence, in order.`;
async function readCrowns(sentences, nameA, nameB) {
  try {
    const body = 'Player A is ' + nameA + '. Player B is ' + nameB + '.\n\n' + sentences.map(s => s.n + '. ' + s.sentence).join('\n');
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: CROWN_MODEL, max_tokens: 4096, temperature: 0, system: CROWN_SYSTEM, messages: [{ role: 'user', content: body }] }) });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: 'crown read upstream ' + r.status };
    const txt = (d.content && d.content[0] && d.content[0].text) || '', m = txt.match(/\{[\s\S]*\}/);
    const out = m ? JSON.parse(m[0]) : null;
    if (!out || !Array.isArray(out.reads)) return { ok: false, error: 'crown read shape invalid' };
    return { ok: true, reads: out.reads };
  } catch (e) { return { ok: false, error: 'crown read threw: ' + (e && e.message) }; }
}

/*  WHAT THE PAGE SAYS: the verdict panel's own answer line, as rendered.  */
function pageResult(ev, sides) {
  const t = (ev.page && ev.page.compare) || '', line = (t.match(/The Verdict\n([^\n]*)/) || [])[1] || '';
  if (/cannot separate|will not separate/i.test(line)) return { winner: null, line };
  for (const s of sides) if (s.surname && line.indexOf(s.surname) === 0) return { winner: s.side, line };
  return { winner: undefined, line };   // unreadable: the crown check refuses to judge
}

function checkCrowns(sentences, reads, ev) {
  const { sides } = pageFigures(ev), flags = [];
  if (sides.length !== 2) return { flags, note: 'not a comparison' };
  const R = pageResult(ev, sides);
  if (R.winner === undefined) return { flags, error: 'the page\'s answer line could not be read: "' + R.line + '"' };
  const by = Object.fromEntries(sides.map(s => [s.side, s])), other = x => (x === 'A' ? 'B' : 'A');
  const leads = x => Object.keys(by[x].dims).filter(d => by[other(x)].dims[d] != null && by[x].dims[d] > by[other(x)].dims[d]).length;
  const rd = n => reads.find(r => r.n === n) || {};
  const head = sentences.filter(s => s.field === 'who').map(s => rd(s.n)), headCrown = (head.find(h => h.crown) || {}).favours || null;
  for (const s of sentences) {
    const r = rd(s.n); if (!r.crown || !/^[AB]$/.test(r.favours)) continue;
    const X = r.favours, Y = other(X), nm = by[X].surname;
    if (R.winner === null) flags.push({ quote: s.sentence, kind: '3b', check: 'crowns', why: `crowns ${nm} where the page says "${R.line}"` });
    else if (R.winner !== X) flags.push({ quote: s.sentence, kind: '3b', check: 'crowns', why: `crowns ${nm} where the page names ${by[Y].surname}` });
    if (by[X].playerHonours <= by[Y].playerHonours && leads(X) < leads(Y))
      flags.push({ quote: s.sentence, kind: 3, check: 'crowns', why: `crowns ${nm}, who leads neither the player honours (${by[X].playerHonours} v ${by[Y].playerHonours}) nor the dimensions the page draws (${leads(X)} v ${leads(Y)})` });
    if (s.field !== 'who' && headCrown !== X)
      flags.push({ quote: s.sentence, kind: 4, check: 'crowns', why: headCrown ? `crowns ${nm} under a headline that crowns ${by[headCrown].surname}` : `crowns ${nm} under a headline that crowns nobody` });
  }
  return { flags, result: R, honours: { A: by.A.playerHonours, B: by.B.playerHonours }, leads: { A: leads('A'), B: leads('B') } };
}

/*  OPTION 2 OF THE KIND 1 PLAN: EVERY SENTENCE JUDGED ALONE (2026-10-24, area 9). The shipping checker
    read a whole piece and flagged 1 to 5 sentences however many failed; this asks one question per
    sentence, against the rendered page, so no sentence can be skipped. It measures how much of the
    one in five was skimming. It cannot close kind 1 (area 9's arithmetic); it decides what option
    1's narrow check is built from. The page is sent once per piece and cached; each sentence is a
    small call on top. The Chronicle is marked as evidence for its figures only (Lucas, 2026-10-23).  */
const JUDGE_MODELS = { haiku: 'claude-haiku-4-5-20251001', sonnet: 'claude-sonnet-4-6' };
const JUDGE_SYSTEM = `You check ONE sentence of football writing against THE PAGE, which is everything the reader can see about the players: the comparison screen and each player's card, with every section open.

Answer one question: does the sentence state a fact about the world that THE PAGE does not state?

A world fact is anything that happened or is so outside these figures: transfers and arrivals, debuts, earlier or later seasons and clubs, career history, records and firsts, title races and league positions, what a club, team-mate, manager, opponent or league was like, a match, a date, an award not shown on the page. True of football does not make it supported; only THE PAGE does.

NOT a world fact, never flag these: opinion, judgement, comparison or emphasis resting on what the page shows ("the more complete season", "a remarkable return"); restating the page in other words; plain arithmetic on the page's figures; the meaning the page itself gives an honour or tag; HOW MANY tags or honours a card holds (code counts those exactly; you do not).

THE CHRONICLE (marked on the page) counts as support for its FIGURES only. Its records, the years they stood, scorelines, opponents, debuts and arrivals are NOT support: a sentence resting on them is a world fact the page does not state.

Reply with JSON only: {"unsupported": true or false, "claim": "the exact words of the unsupported fact, or empty", "why": "a few words"}.`;
/*  CODE COUNTS, THE MODEL DOES NOT (Lucas, 2026-10-24). Sonnet counted GENERATIONAL as a tag and honours as
    tags, which was most of the 14 flags on sample 1 run 3. A judge flag whose claim is a count of tags or
    honours is dropped here whatever the prompt said.  */
const COUNT_CLAIM = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b[^.]{0,40}\b(tags?|honours?)\b|\b(tags?|honours?)\b[^.]{0,12}\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i;
function isCountClaim(claim) { return COUNT_CLAIM.test(String(claim || '')); }
function markChronicle(text) {
  return String(text).replace(/The Chronicle ✶ SIGNATURE MOMENT\n⌄\n([\s\S]*?)\nWonder Tags/g,
    (m, body) => '[THE CHRONICLE, SUPPORT FOR ITS FIGURES ONLY]\n' + body + '\n[END OF THE CHRONICLE]\nWonder Tags');
}
function judgePage(ev) {
  const parts = [];
  if (ev.page.compare) parts.push('=== THE COMPARISON SCREEN ===\n' + ev.page.compare);
  for (const [id, t] of Object.entries(ev.page.cards || {})) parts.push('=== CARD ' + id + ' ===\n' + markChronicle(t));
  return parts.join('\n\n');
}
async function judgeSentence(page, sentence, model) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: JUDGE_MODELS[model], max_tokens: 800, temperature: 0, system: JUDGE_SYSTEM,
          messages: [{ role: 'user', content: [
            { type: 'text', text: 'THE PAGE:\n' + page, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: 'THE SENTENCE:\n' + sentence } ] }] }) });
      if (r.status === 429 || r.status >= 500) { await new Promise(x => setTimeout(x, 2000 * (attempt + 1))); continue; }
      const d = await r.json();
      if (!r.ok) return { ok: false, error: 'judge upstream ' + r.status };
      const txt = ((d.content && d.content[0] && d.content[0].text) || '').replace(/^```(?:json)?\s*|\s*```$/g, '');
      // the first complete JSON object; Sonnet sometimes adds a line of comment after it
      const st = txt.indexOf('{'); let dep = 0, end = -1, q = false;
      for (let i = st; st >= 0 && i < txt.length; i++) { const c = txt[i]; if (c === '"' && txt[i - 1] !== '\\') q = !q; else if (!q && c === '{') dep++; else if (!q && c === '}' && --dep === 0) { end = i; break; } }
      if (end < 0) throw new Error('no complete JSON object (stop: ' + d.stop_reason + ')');
      const o = JSON.parse(txt.slice(st, end + 1));
      return { ok: true, unsupported: o.unsupported === true, claim: String(o.claim || ''), why: String(o.why || ''), usage: d.usage };
    } catch (e) { if (attempt === 4) return { ok: false, error: 'judge threw: ' + e.message }; }
  }
  return { ok: false, error: 'judge: upstream busy after 5 tries' };
}

module.exports = { isCountClaim, extractNumbers, pageFigures, checkNumbers, checkMeasures, splitSentences, readCrowns, checkCrowns, pageResult, CROWN_SYSTEM, JUDGE_MODELS, judgePage, judgeSentence };
