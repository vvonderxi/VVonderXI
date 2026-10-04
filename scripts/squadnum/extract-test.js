/*  THE EXTRACTOR'S CONTROL SET , one page per SHAPE, with the row count each is known to
    carry. A control set narrower than the thing it guards will pass it: this exercises all
    three shapes across five editions, because testing only the English one is exactly how
    three earlier passes reported "no data" for three editions that had plenty.  */
const { extract } = require('./extract.js');
const UA = { 'User-Agent': 'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)' };
const CASES = [
  ['en', '2012–13 Hamburger SV season',                  'fields',     29, 'Drobný'],
  ['tr', 'Gençlerbirliği (futbol takımı) 2013-14 sezonu', 'fields',     27, 'Köse'],
  ['fr', 'Saison 2013-2014 du LOSC Lille',                'fields',      0, 'Enyeama'],
  /*  BENFICA CARRIES TWO GENUINE DUPLICATE NUMBERS AND THEY ARE NOT A PARSE ERROR , 9 is
      Cardozo AND Funes Mori, 50 is Oblak AND Markovic. A shirt freed in January is reissued,
      and a SEASON roster records both holders where a point-in-time squad list records one.
      SO THE UNIQUENESS CHECK IS VALID FOR A SNAPSHOT AND INVALID FOR A SEASON ROSTER, and a
      dupe GATE would wrongly reject this page. Allowed here, and flagged downstream.  */
  ['pt', 'Temporada do Sport Lisboa e Benfica de 2013–14','positional',  0, 'Oblak', 2],
  ['nl', 'AFC Ajax in het seizoen 2013/14 (mannen)',      'table',       0, 'Cillessen'],
];
(async () => {
  let bad = 0;
  for (const [w, t, wantKind, wantRows, wantName, okDupes] of CASES) {
    const u = `https://${w}.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page=` + encodeURIComponent(t);
    let j; try { j = await (await fetch(u, { headers: UA })).json(); } catch (e) { console.log('  ' + w + '  FETCH ERROR'); bad++; continue; }
    if (j.error) { console.log('  ' + w + '  ' + j.error.code); bad++; continue; }
    const b = extract(j.parse.wikitext['*']);
    const rows = b.length ? b[0].rows : [];
    const nums = rows.map((r) => r.no);
    const dupes = nums.length - new Set(nums).size;
    const hasName = rows.some((r) => r.name.includes(wantName));
    const kindOK = b.length && b[0].kind === wantKind;
    const rowsOK = wantRows ? rows.length === wantRows : rows.length >= 8;
    const ok = kindOK && rowsOK && hasName && dupes === (okDupes || 0);
    if (!ok) bad++;
    console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + w + '  ' + String(rows.length).padStart(2) + ' rows  ' +
      (b.length ? b[0].kind : 'none').padEnd(11) + ' dupes ' + dupes +
      '  expect ' + wantKind + (wantRows ? '/' + wantRows : '') + '  "' + wantName + '" ' + (hasName ? 'found' : 'MISSING'));
    await new Promise((r) => setTimeout(r, 220));
  }
  console.log('\n  ' + (bad ? bad + ' FAILURE(S)' : 'all five shapes extract, across five editions'));
  process.exit(bad ? 1 : 0);
})();
