/*  A DRY RUN OF THE REPLACEMENT FOR THE TOKENIZER'S BINDING ON THE SERVER (2026-10-28). The current numbersOk asks
    prose_checks.extractNumbers for every number's unit and uses the unit for four things only: tags/honours (bound to the
    kind's total), dimensions (a subset is allowed), pct (not a percentile), percentile (a cited one). Everything else is
    value membership. The replacement extracts numbers plainly and assigns a kind ONLY by explicit adjacency
    ("four tags", "four further tags", "97 per cent", "97%", "96th percentile", "three dimensions") or by ellipsis after
    such a count in the same clause ("four tags to Rodri's three"). Sums and differences are rounded to two decimals.  */
const fs = require('fs'), path = require('path');
const C = require('../../api/_cited/cited.js'), PC = require('../../api/_cited/prose_checks.js');
const W = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90, hundred:100 };
const TENS = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
function minimalNumbers(text) {
  const t = String(text).replace(/[“”]/g, '"').replace(/(\d),(\d{3})\b/g, '$1$2');
  const re = /\d+(?:\.\d+)?(?:st|nd|rd|th)?|[A-Za-zÀ-ÿ']+|[.,;:!?()"]/g, toks = []; let m;
  while ((m = re.exec(t))) toks.push({ s: m[0], lw: m[0].toLowerCase(), i: m.index, end: m.index + m[0].length });
  const out = [];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k]; let v = null, j = k, ordinal = false;
    if (/^\d/.test(tk.s)) {
      if (t[tk.i - 1] === '/' || t[tk.end] === '/' || /^(19|20)\d\d$/.test(tk.s)) continue;      // seasons and years
      if (toks[k - 1] && toks[k - 1].lw === 'per' && /^(90|ninety)$/.test(tk.lw)) continue;       // the 90 of per 90
      ordinal = /(st|nd|rd|th)$/.test(tk.s); v = parseFloat(tk.s);
    } else if (TENS[tk.lw] != null && toks[k + 1] && W[toks[k + 1].lw] != null && W[toks[k + 1].lw] < 10) { v = TENS[tk.lw] + W[toks[k + 1].lw]; j = k + 1; }
    else if (W[tk.lw] != null) { v = W[tk.lw]; if (tk.lw === 'one' && !/^(more|fewer|additional|less)$/.test((toks[k + 1] || {}).lw || '')) continue; if (toks[k - 1] && toks[k - 1].lw === 'per' && v === 90) continue; }
    else continue;
    const a1 = (toks[j + 1] || {}).lw || '', a2 = (toks[j + 2] || {}).lw || '', a3 = (toks[j + 3] || {}).lw || '', b1 = (toks[k - 1] || {}).lw || '';
    let unit = null;
    const kindWord = w => /^tags?$/.test(w) ? 'tags' : /^honours?$/.test(w) ? 'honours' : /^(dimensions?|attributes?)$/.test(w) ? 'dimensions' : null;
    if (ordinal) { unit = a1 === 'percentile' ? 'percentile' : 'ordinal'; }
    else if (a1 === '%' || (a1 === 'per' && a2 === 'cent') || a1 === 'percent') unit = 'pct';
    else if (kindWord(a1)) unit = kindWord(a1);
    else if (/^(further|more|other|shared|such|individual|collective|separate|of)$/.test(a1) && kindWord(a2)) unit = kindWord(a2);
    else if (a1 === 'of' && /^(his|her|their|the|its)$/.test(a2) && kindWord(a3)) unit = kindWord(a3);
    else {
      // ellipsis: "four tags to Rodri's three", "Kane's four against Mertens's two": a bare count after a possessive or "to/against/and"
      // takes the kind of the nearest explicit count earlier in the clause
      const clauseStart = (() => { let a = k; while (a > 0 && !/^[.;:]$/.test(toks[a - 1].s)) a--; return a; })();
      // only a BARE count is elliptical: the next token is punctuation, the end, or a joining word, never the number's own noun ("35 goals", "seven assists more")
      const bare = !a1 || /^[.,;:!?()"]$/.test(a1) || /^(to|against|and|or|than|in|on|of|this|that|where|while|yet|but|more|fewer)$/.test(a1);
      // a tag or honour total never exceeds twelve; a bare number above that after a possessive is a score, a percentile or a figure ("Neymar's 87")
      if (bare && v <= 12) for (let q = k - 1; q >= clauseStart; q--) { const kw = kindWord(toks[q].lw); if (kw && q > 0 && (/^\d+$/.test(toks[q - 1].s) || W[toks[q - 1].lw] != null)) { if (/'s$|^(to|against|and|versus|with|holds|carries|those|these)$/.test(b1)) unit = kw; break; } }
    }
    out.push({ value: v, raw: t.slice(tk.i, toks[j].end), unit, ordinal });
    k = j;
  }
  return out;
}
/*  numbersOk with the minimal extractor and rounded sums.  */
function numbersOkMin(sentence, citedText, citedFacts, allFacts) {
  const r2 = x => Math.round(x * 100) / 100;
  const vals = new Set();
  (String(citedText).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).forEach(n => vals.add(+n));
  for (const x of minimalNumbers(citedText)) vals.add(x.value);   // number words in the facts' card copy ("Five seasons", "one more elite campaign"), as the current rule has
  const base = [...vals]; for (const a of base) for (const b of base) { vals.add(r2(Math.abs(a - b))); vals.add(r2(a + b)); }
  const per = {}; for (const f of allFacts || citedFacts || []) { const k = C.factKind(f.text) + '/' + (f.side || 'P'); per[k] = (per[k] || 0) + 1; }
  const byKind = {}; for (const [k, c] of Object.entries(per)) { const kind = k.split('/')[0]; (byKind[kind] = byKind[kind] || []).push(c); vals.add(c); }
  const kindSet = {}; for (const [kind, cs] of Object.entries(byKind)) { const S = new Set(cs); for (const a of cs) for (const b of cs) { S.add(a + b); S.add(Math.abs(a - b)); } kindSet[kind] = S; S.forEach(v => vals.add(v)); }
  if (kindSet.cabinet) kindSet.honour = new Set([...(kindSet.honour || []), ...kindSet.cabinet]);
  const BOUND = { tags: 'tag', honours: 'honour' };
  const dimTotal = (per['dimension/A'] || 0) + (per['dimension/B'] || 0) + (per['reliability/A'] || 0) + (per['reliability/B'] || 0);
  const pctIn = new Set(); for (const f of citedFacts || []) (String(f.text).match(/(\d+)%|Reliability: (\d+) out of 100/g) || []).forEach(m => pctIn.add(+m.replace(/\D/g, '')));
  const pctileIn = new Set(); for (const f of citedFacts || []) (String(f.text).match(/(\d+)(?:st|nd|rd|th) percentile/g) || []).forEach(m => pctileIn.add(+m.replace(/\D/g, '')));
  const pctileOk = new Set(pctileIn); for (const a of pctileIn) for (const b of pctileIn) pctileOk.add(Math.abs(a - b));
  const bad = [];
  for (const x of minimalNumbers(sentence)) {
    if (x.unit === 'ordinal') continue;
    if (x.unit === 'percentile') { if (!pctileOk.has(x.value)) bad.push(x.raw + ' called a percentile, and no cited fact prints it as one'); continue; }
    if (x.unit === 'pct') { if (!pctIn.has(x.value) && (citedFacts || []).some(f => new RegExp('\\b' + x.value + '(?:st|nd|rd|th) percentile').test(f.text))) { bad.push(x.raw + ' called a percentage, it is a percentile'); continue; } if (!vals.has(x.value)) bad.push(x.raw); continue; }
    if (x.unit === 'dimensions') { if (!(x.value >= 1 && x.value <= dimTotal)) bad.push(x.raw); continue; }
    if (BOUND[x.unit]) { if (!(kindSet[BOUND[x.unit]] || new Set()).has(x.value)) bad.push(x.raw); continue; }
    if (!vals.has(x.value)) bad.push(x.raw);
  }
  return bad;
}
module.exports = { minimalNumbers, numbersOkMin };
if (require.main === module) {
  const dir = path.join(__dirname, '..', '..', '_local', 'verdict-check') + '/';
  const EVS = { fresh: require(dir + 'fresh_evidence.json'), fresh2: require(dir + 'fresh2_evidence.json'), notes4_sample: require(dir + 'notes4_sample_evidence.json') };
  const files = fs.readdirSync(dir).filter(f => /^(fresh2?_2026|notes4_sample_2026).*\.json$/.test(f)).sort();
  let units = 0, same = 0, onlyOld = [], onlyNew = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(dir + f)); const ev = EVS[f.startsWith('fresh2') ? 'fresh2' : f.startsWith('notes4') ? 'notes4_sample' : 'fresh'];
    for (const it of j.items || []) {
      const e = ev.items.find(x => x.id === it.id); if (!e) continue;
      const pack = /Card data:/.test(e.evidence) ? C.notesFacts(JSON.parse(e.evidence.split('Card data:\n')[1])) : C.verdictFacts(e);
      const seen = new Set();
      const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); if (o.s && Array.isArray(o.cite)) { if (seen.has(o.s)) return; seen.add(o.s); units++; const cf = pack.facts.filter(x => o.cite.includes(x.id)), ct = cf.map(x => x.text).join('\n'); const a = C.numbersOk(o.s, ct, cf, pack.facts), b = numbersOkMin(o.s, ct, cf, pack.facts); if (!!a.length === !!b.length) same++; else if (a.length) onlyOld.push([f.slice(0, 20), o.s.slice(0, 120), a.join(','), b.join(',')]); else onlyNew.push([f.slice(0, 20), o.s.slice(0, 120), a.join(','), b.join(',')]); } for (const k of Object.keys(o)) walk(o[k]); };
      walk(it);
    }
  }
  console.log('units', units, 'same verdict', same, 'deleted by the current rule only', onlyOld.length, 'deleted by the minimal rule only', onlyNew.length);
  console.log('\n-- current rule only (the binding\'s deletions):'); onlyOld.forEach(x => console.log('  ' + x.join(' || ')));
  console.log('\n-- minimal rule only:'); onlyNew.forEach(x => console.log('  ' + x.join(' || ')));
  // the Ligue 1 headline and the pass 9 difference
  const ibra = C.verdictFacts(EVS.fresh2.items.find(x => x.id === 'ibrahimovic1516-lacazette2425')), ibraC = ibra.facts.filter(f => ['P1', 'A1', 'B1', 'A2', 'B2'].includes(f.id));
  console.log('\nLigue 1 headline, minimal rule:', JSON.stringify(numbersOkMin('Ibrahimović wins it outright, 93 to 78, taking three honours in Ligue 1 at 34.', ibraC.map(f => f.text).join('\n'), ibraC, ibra.facts)));
  console.log('1 honour on a three-honour card, minimal rule:', JSON.stringify(numbersOkMin('He holds 1 honour in Ligue 1.', ibraC.map(f => f.text).join('\n'), ibraC, ibra.facts)));
  console.log('0.78 minus 0.20 = 0.58, minimal rule:', JSON.stringify(numbersOkMin('a difference of 0.58', 'Messi: 0.78 goals per 90 minutes\nCandreva: 0.20 goals per 90 minutes', [{ text: 'Messi: 0.78 goals per 90 minutes', side: 'A' }, { text: 'Candreva: 0.20 goals per 90 minutes', side: 'B' }], [])), 'current:', JSON.stringify(C.numbersOk('a difference of 0.58', 'Messi: 0.78 goals per 90 minutes\nCandreva: 0.20 goals per 90 minutes', [{ text: 'Messi: 0.78 goals per 90 minutes', side: 'A' }, { text: 'Candreva: 0.20 goals per 90 minutes', side: 'B' }], [])));
}
