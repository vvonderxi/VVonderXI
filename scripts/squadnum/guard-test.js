/*  THE GUARD'S OWN CONTROL SET. A guard that never fires is indistinguishable from one that
    does not work, so this asserts BOTH directions and is the thing to run before any batch.  */
const { gate, reviewFlag } = require('./resolve-guard.js');
const MUST_REFUSE = [
  ['Nacional','2016–17 Liga Nacional de Básquet season',{category:'Liga Nacional de Básquet'}],
  ['PEC Zwolle','2016–17 PEC Zwolle (women) season',{infobox:'PEC Zwolle',wikidata:'PEC Zwolle Vrouwen'}],
  ['Fenerbahçe','2016–17 Fenerbahçe S.K. (basketball) season',{infobox:'Fenerbahçe',wikidata:"Fenerbahçe Men's Basketball"}],
  ['Werder Bremen','2016–17 SV Werder Bremen II season',{category:'SV Werder Bremen II'}],
  ['FSV Mainz 05','2016–17 1. FSV Mainz 05 II season',{category:'1. FSV Mainz 05 II'}],
];
const MUST_ACCEPT = [
  ['Everton','2016–17 Everton F.C. season',{infobox:'Everton',category:'Everton F.C.',wikidata:'Everton F.C.'}],
  ['Tottenham','2016–17 Tottenham Hotspur F.C. season',{wikidata:'Tottenham Hotspur F.C.'}],
  ['Bayern München','2016–17 FC Bayern Munich season',{wikidata:'FC Bayern Munich'}],
  ['Lyon','2016–17 Olympique Lyonnais season',{wikidata:'Olympique Lyonnais'}],
  ['Inter','2016–17 Inter Milan season',{wikidata:'Inter Milan'}],
  ['West Brom','2016–17 West Bromwich Albion F.C. season',{wikidata:'West Bromwich Albion F.C.'}],
  ['Excelsior','2016–17 Excelsior Rotterdam season',{wikidata:'Excelsior Rotterdam'}],
];
const FLAG = [['Sparta Rotterdam','Excelsior Rotterdam', true],
              ['Everton','Everton F.C.', false],
              ['Tottenham','Tottenham Hotspur F.C.', false]];
(async () => {
  let fail = 0;
  console.log('MUST REFUSE');
  for (const [c, t, l] of MUST_REFUSE) {
    const r = await gate(c, t, l, { checkSport: false });
    if (r.ok) { fail++; console.log('  FAIL  accepted  ' + c + ' -> ' + t); }
    else console.log('  ok    refused   ' + c.padEnd(16) + r.why);
  }
  console.log('\nMUST ACCEPT , any refusal here is a FALSE refusal');
  for (const [c, t, l] of MUST_ACCEPT) {
    const r = await gate(c, t, l, { checkSport: false });
    if (!r.ok) { fail++; console.log('  FAIL  refused   ' + c + ' -> ' + t + '   ' + r.why); }
    else console.log('  ok    accepted  ' + c);
  }
  console.log('\nREVIEW FLAG , fires on a same-city different club, silent otherwise');
  for (const [c, l, want] of FLAG) {
    const f = reviewFlag(c, l);
    const got = !!f;
    if (got !== want) { fail++; console.log('  FAIL  ' + c + ' expected ' + (want?'flag':'silence')); }
    else console.log('  ok    ' + (got ? 'flagged  ' : 'silent   ') + c.padEnd(18) + (f || ''));
  }
  console.log('\n  ' + (fail ? fail + ' FAILURE(S)' : 'all controls behave, both directions'));
  process.exit(fail ? 1 : 0);
})();
