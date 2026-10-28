/*  A DRY RUN OF THE REPLACEMENT FOR THE TOKENIZER'S BINDING ON THE SERVER (2026-10-28). The current numbersOk asks
    prose_checks.extractNumbers for every number's unit and uses the unit for four things only: tags/honours (bound to the
    kind's total), dimensions (a subset is allowed), pct (not a percentile), percentile (a cited one). Everything else is
    value membership. The replacement extracts numbers plainly and assigns a kind ONLY by explicit adjacency
    ("four tags", "four further tags", "97 per cent", "97%", "96th percentile", "three dimensions") or by ellipsis after
    such a count in the same clause ("four tags to Rodri's three"). Sums and differences are rounded to two decimals.  */
const fs = require('fs'), path = require('path');
const C = require('../../api/_cited/cited.js'), PC = require('../../api/_cited/prose_checks.js');
const { minimalNumbers } = require('../../api/_cited/minimal_numbers.js');   // one copy: the shipped module (c5)
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
module.exports = { minimalNumbers, numbersOkMin };   // numbersOkMin is what cited.js's numbersOk became in c5; kept here as the dry run's record
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
