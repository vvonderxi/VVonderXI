#!/usr/bin/env node
/*  THE CITED WRITER'S RULES, PROVED WITHOUT A KEY (2026-10-24). A planted draft for the fair-crown pair
    (Messi 16/17 v Neymar 16/17, the page names Messi) and one for an inside-margin pair, with the narrow
    check stubbed to answer as Sonnet should. Each planted fault must be deleted for its own reason, the
    clean sentences kept, and the rejection rule must fire exactly when it should. Needs the fresh
    capture (sample.js --capture), no key.  */
const C = require('./cited.js');
const EV = require('../../_local/verdict-check/fresh_evidence.json');
const pack = C.verdictFacts(EV.items.find(x => x.id === 'messi1617-neymar1617'));
const tie = C.verdictFacts(EV.items.find(x => x.id === 'kane2021-son2122'));
const STUB = { 'A crown, fairly.': { supported: true, crown: 'A' }, 'Stretched.': { supported: false, unsupported: 'record-breaking', crown: 'none' } };
const narrow = async (p, s) => ({ ok: true, crown: 'none', supported: true, unsupported: '', ...(STUB[s.split(' ')[0] === 'Messi' && s.includes('wins it clearly') ? 'A crown, fairly.' : s.includes('record-breaking') ? 'Stretched.' : ''] || {}) });
const ok = (s, cite, extra) => ({ s, cite, ...extra });
const n = k => pack.facts.find(f => f.id === k).text;
let fails = 0;
const expect = (name, cond) => { console.log((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) fails++; };
(async () => {
  console.log('facts A3: ' + n('A3') + '\nfacts B3: ' + n('B3') + '\nP1: ' + n('P1') + '  winner ' + pack.winner);
  const draft = {
    who: [ok('Messi wins it clearly, 95 to 87.', ['P1', 'A2', 'B2'])],
    p1: [ok('Messi scored ' + n('A3').match(/(\d+) goals/)[1] + ' goals.', ['A3']), ok('Messi carried the Goal Machine tag.', [pack.facts.find(f => f.side === 'A' && /Goal Machine/.test(f.text)).id]),
      ok('He arrived at Barcelona as a boy.', []),
      ok('Messi scored 99 goals.', ['A3'])],
    p2: [ok('Neymar played for Barcelona that season.', ['B1']), ok('Neymar won the record-breaking Golden Boot.', ['B1']), ok('Neymar beat everyone in duels.', ['B1']), ok('Neymar was Messi\'s team-mate.', ['A1'])],
    h2h: [ok('Both played for Barcelona.', ['A1', 'B1']), ok('Both were in La Liga.', ['A1', 'B1'])],
    verdict: [ok('Messi wins it clearly, by eight points on the Index.', ['A2', 'B2']), ok('The page names Messi.', ['P1']), ok('It cites Z9.', ['Z9'])],
  };
  const j = await C.judgeDraft(pack, draft, narrow);
  const why = s => (j.units.find(u => u.s.startsWith(s)) || {}).why || ['(not found)'];
  const kept = s => (j.units.find(u => u.s.startsWith(s)) || {}).kept;
  expect('a fair crown citing P1 is kept', kept('Messi wins it clearly, 95 to 87.'));
  expect('a fair crown NOT citing P1 is deleted', why('Messi wins it clearly, by eight').some(w => /does not cite the result/.test(w)));
  expect('a sentence citing nothing is deleted', why('He arrived').some(w => /cites nothing/.test(w)));
  expect('a number not in the cited facts is deleted', why('Messi scored 99').some(w => /numbers not in the cited facts: 99/.test(w)));
  expect('a stretched fact is deleted by the narrow check', why('Neymar won the record-breaking').some(w => /narrow check/.test(w)));
  expect('a measure no card prints is deleted', why('Neymar beat everyone in duels').some(w => /measure/.test(w)));
  expect('a Player B paragraph citing no B fact is deleted', why('Neymar was Messi').some(w => /Player B paragraph/.test(w)));
  expect('an id that does not exist is deleted', why('It cites Z9').some(w => /do not exist/.test(w)));
  expect('a clean sentence is kept', kept('Neymar played for Barcelona that season.'));
  expect('the piece is rejected: more than a quarter deleted', j.rejected && j.reasons.some(r => /more than a quarter/.test(r)));
  // the same fair crown on an inside-margin pair is deleted
  const j2 = await C.judgeDraft(tie, { who: [ok('Kane wins it clearly.', ['P1'])] }, async () => ({ ok: true, supported: true, unsupported: '', crown: 'A' }));
  expect('a crown on a pair the page cannot separate is deleted', j2.units[0].why.some(w => /cannot separate/.test(w)));
  expect('a lost headline rejects the piece', j2.reasons.some(r => /headline/.test(r)));
  // a clean minimal piece ships
  const clean = { who: [ok('Messi wins it clearly, 95 to 87.', ['P1', 'A2', 'B2'])] };
  for (const f of ['p1', 'h2h', 'verdict']) clean[f] = [ok('Messi played for Barcelona.', ['A1']), ok('Messi was in La Liga.', ['A1'])];
  clean.p2 = [ok('Neymar played for Barcelona.', ['B1']), ok('Neymar was in La Liga.', ['B1'])];
  const j3 = await C.judgeDraft(pack, clean, narrow);
  expect('a clean piece is not rejected', !j3.rejected);
  expect('assembly keeps the kept sentences in order', C.assemble(pack, j3.units).p1 === 'Messi played for Barcelona. Messi was in La Liga.');

  /* ---- THE THREE FIXES FROM THE FIRST FRESH-SAMPLE RUN (Lucas, 2026-10-24) ---- */
  // Fix 1: a crown is an overall-winner sentence, and code decides where the model's reading can apply.
  const Bfact = tie.facts.find(f => f.side === 'B' && /goals and/.test(f.text)).id, Afact = tie.facts.find(f => f.side === 'A' && /goals and/.test(f.text)).id;
  const saysCrown = who => async () => ({ ok: true, supported: true, unsupported: '', crown: who });
  const j4 = await C.judgeDraft(tie, {
    p2: [ok(`${tie.names.B} scored his goals from few shots, a clear lead in that pillar.`, [Bfact]),
         ok(`${tie.names.B} did more than ${tie.names.A} across the whole season.`, [Bfact])],
    h2h: [ok(`${tie.names.A} did more across the whole season.`, [Afact, Bfact])],
  }, saysCrown('B'));
  const u4 = s => j4.units.find(u => u.s.startsWith(s));
  expect('fix 1: a one-sided sentence the model calls a crown is kept (one side cited, the other not named)', u4(tie.names.B + ' scored').kept);
  expect('fix 1: a one-sided sentence that names the other player is still a crown, deleted on a tie', u4(tie.names.B + ' did more').why.some(w => /cannot separate/.test(w)));
  expect('fix 1: a sentence citing both sides that the model calls a crown is deleted on a tie', u4(tie.names.A + ' did more').why.some(w => /cannot separate/.test(w)));
  const j5 = await C.judgeDraft(pack, { p1: [ok('Messi scored his goals at a rate few can match.', ['A3'])] }, saysCrown('A'));
  expect('fix 1: on the fair-crown pair, a one-sided A sentence the model calls a crown is kept without P1', j5.units[0].kept);
  expect('fix 1: notes never engage two sides', !C.engagesBothSides({ type: 'notes' }, { cite: ['A1'], s: 'x' }));
  // Fix 2: a count of the cited facts of one kind is allowed; everything else stays strict.
  const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const hon = pack.facts.filter(f => f.side === 'A' && /^Honour/.test(f.text)).map(f => f.id), tagsA = pack.facts.filter(f => f.side === 'A' && /^Tag/.test(f.text)).map(f => f.id), tagsB = pack.facts.filter(f => f.side === 'B' && /^Tag/.test(f.text)).map(f => f.id);
  expect('fix 2: the fair pack has honours and tags to count', hon.length >= 1 && tagsA.length >= 2 && tagsB.length >= 1);
  const j6 = await C.judgeDraft(pack, { p1: [
    ok(`Messi won ${WORD[hon.length]} honours this season.`, hon),
    ok(`Messi won ${WORD[hon.length + 1]} honours this season.`, hon),
    ok(`Messi carries ${tagsA.length} tags and Neymar ${tagsB.length}, ${WORD[tagsA.length + tagsB.length]} tags between them.`, tagsA.concat(tagsB)),
    ok('Messi and Neymar: two seasons, one club.', ['A1', 'B1']),
    ok(`Messi's Creation is ${WORD[7]} points above Neymar's.`, [pack.facts.find(f => f.side === 'A' && /Creation/.test(f.text)).id, pack.facts.find(f => f.side === 'B' && /Creation/.test(f.text)).id]),
  ] }, narrow);
  const u6 = i => j6.units[i];
  expect('fix 2: a count equal to the cited honours is kept', u6(0).kept);
  expect('fix 2: a count one above the cited honours is deleted', u6(1).why.some(w => /numbers not in the cited facts/.test(w)));
  expect('fix 2: per-side and total tag counts are kept', u6(2).kept);
  expect('fix 2: "two seasons" citing both identity facts is kept', u6(3).kept);
  const cre = [pack.facts.find(f => f.side === 'A' && /Creation/.test(f.text)), pack.facts.find(f => f.side === 'B' && /Creation/.test(f.text))].map(f => +f.text.match(/(\d+)(?:st|nd|rd|th) percentile/)[1]);
  expect('fix 2: a wrong gap stays deleted (strict)', Math.abs(cre[0] - cre[1]) === 7 ? true : u6(4).why.some(w => /numbers not in the cited facts: seven/.test(w)));
  // Fix 3: the band goes in the fact only when the page prints it (Generational, Iconic).
  const rodri = C.verdictFacts(EV.items.find(x => x.id === 'rodri2324-rice2324'));
  expect('fix 3: an 87 and an 86 carry no band word (the page prints none)', !rodri.facts.some(f => /World Class|band/i.test(f.text)));
  expect('fix 3: a 95 carries Generational, the word the card prints', pack.facts.some(f => /VV Score: 95, and the card marks the season Generational/.test(f.text)));
  const stubPlayer = (rt, band) => ({ player_name: 'X', season: '20/21', club: 'C', league: 'L', position: 'ST', age: 25, rt, band, goals: 1, assists: 1, minutes: 900, appearances: 10, honours: [], tag_glosses: [] });
  expect('fix 3: notes ignore the request band for an 87', !C.notesFacts(stubPlayer(87, 'World Class')).facts.some(f => /World Class|band/i.test(f.text)));
  expect('fix 3: notes mark a 90 Iconic', C.notesFacts(stubPlayer(90, 'Iconic')).facts.some(f => /VV Score: 90, and the card marks the season Iconic/.test(f.text)));
  expect('fix 3: notes print no band word for a 90 beyond the prestige word', !C.notesFacts(stubPlayer(90, 'Iconic')).facts.some(f => /\bband\b/i.test(f.text)));
  console.log(fails ? `\nCITED SELFTEST FAIL (${fails})` : '\nCITED SELFTEST PASS');
  process.exit(fails ? 1 : 0);
})();
