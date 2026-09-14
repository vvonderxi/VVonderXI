/*  PROBE , WHAT IS ACTUALLY IN A "DUPLICATE NUMBERS" SKIP. READ-ONLY, WRITES NOTHING.
    The backfill refuses any block whose numbers repeat, and that refusal may be wrong.
    TWO SHAPES PRODUCE THE SAME SYMPTOM AND ONLY ONE IS A DEFECT:
      BENFICA SHAPE , a shirt freed in January is reissued, so two REAL squad members share
        one number on a SEASON roster. The page is correct and the skip is refusing good data.
      KAYSERISPOR SHAPE , the parser has wandered into a fixture or results table, so the
        "names" are dates, scores or opponents and numbers repeat because they are goals or
        match numbers. The page may be fine and the EXTRACTION is wrong.
    The tell is the NAMES beside the repeated number, plus how many numbers repeat at all:
    a reissue repeats one or two numbers among ~25 rows; a fixture table repeats most of them.  */
require('dotenv').config();
const { resolve } = require('./resolve.js');
const { extract, looksLikeNames } = require('./extract.js');
const { gate } = require('./resolve-guard.js');
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'VVonderXI/1.0 (squad number backfill; contact hello@vvonderxi.com)' };
const DIR = path.join(__dirname, '../../migrations/squad_numbers_2026-09-14');

(async () => {
  const held = fs.readFileSync(path.join(DIR, 'held.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const dupes = held.filter((h) => h.reason === 'duplicate numbers in the block');
  console.log('DUPLICATE-NUMBER SKIPS: ' + dupes.length + ' club-seasons, ' +
              dupes.reduce((a, b) => a + b.cards, 0) + ' cards\n');
  const out = [];
  for (const h of dupes) {
    const [lg, yr, club] = h.key.split('|');
    const r = await resolve(club, lg, Number(yr), gate);
    if (!r.title) { console.log('  ' + h.key + '  , no longer resolves'); continue; }
    let p; try {
      p = await (await fetch(`https://${r.wiki}.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page=`
        + encodeURIComponent(r.title), { headers: UA })).json();
    } catch (e) { console.log('  ' + h.key + '  , fetch failed'); continue; }
    if (p.error) { console.log('  ' + h.key + '  , ' + p.error.code); continue; }
    const blocks = extract(p.parse.wikitext['*']);
    if (!blocks.length) { console.log('  ' + h.key + '  , no block on re-read'); continue; }
    const rows = blocks[0].rows;
    const seen = {}, rep = {};
    rows.forEach((x) => { if (seen[x.no] != null) { (rep[x.no] = rep[x.no] || [seen[x.no]]).push(x.name); } else seen[x.no] = x.name; });
    const repeated = Object.keys(rep);
    const names = rows.map((x) => x.name);
    const rec = {
      key: h.key, title: r.title, wiki: r.wiki, cards: h.cards,
      rosterSize: rows.length, repeatedCount: repeated.length,
      shareRepeated: +(repeated.length / Math.max(1, new Set(rows.map((x) => x.no)).size)).toFixed(2),
      namesLookLikeNames: looksLikeNames(names),
      repeated: repeated.slice(0, 6).map((n) => ({ no: n, names: rep[n] })),
      sampleRows: rows.slice(0, 4).map((x) => x.no + ' ' + x.name),
    };
    /*  THE CLASSIFIER IS NAMED AND NARROW, BECAUSE A WRONG LABEL HERE SENDS THE SECOND PASS
        AT THE WRONG JOB. Anything that fails it is UNCLEAR and gets read by a human.  */
    rec.shape = (!rec.namesLookLikeNames || rec.shareRepeated > 0.5) ? 'KAYSERISPOR (extraction)'
              : (rec.repeatedCount <= 3 && rows.length >= 18) ? 'BENFICA (real reissue)'
              : 'UNCLEAR';
    out.push(rec);
    console.log('  ' + rec.shape.padEnd(26) + h.key.padEnd(30) +
      'roster ' + String(rec.rosterSize).padEnd(4) + 'repeats ' + String(rec.repeatedCount).padEnd(4) +
      'names? ' + (rec.namesLookLikeNames ? 'yes' : 'NO'));
    rec.repeated.slice(0, 2).forEach((d) => console.log('        #' + d.no + ' , ' + d.names.join('  |  ')));
    await new Promise((x) => setTimeout(x, 120));
  }
  fs.writeFileSync(path.join(DIR, 'dupes-probe.json'), JSON.stringify(out, null, 2) + '\n');
  const byShape = out.reduce((a, r) => { a[r.shape] = (a[r.shape] || 0) + 1; return a; }, {});
  console.log('\n  SHAPES: ' + JSON.stringify(byShape));
  console.log('  cards by shape: ' + JSON.stringify(out.reduce((a, r) => { a[r.shape] = (a[r.shape] || 0) + r.cards; return a; }, {})));
})();
