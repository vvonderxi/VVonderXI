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
  // Fixes 4 and 5 (Lucas, 2026-10-24, after run 2): key passes at the card's two decimals; Reliability as the card prints it.
  const kpP = Object.assign(stubPlayer(90, 'Iconic'), { key_passes_per90: 2.36, dimensions: { values: { reliability: { pct_of_full_season: 89 } } } });
  const kpF = C.notesFacts(kpP).facts.map(f => f.text);
  expect('fix 4: key passes per 90 keep two decimals (2.36 as the card prints it)', kpF.some(t => /: 2\.36 key passes per 90 minutes$/.test(t)));
  expect('fix 4: a one-decimal figure is printed as the card would (0.30, not 0.3)', C.notesFacts(Object.assign(stubPlayer(90, 'Iconic'), { key_passes_per90: 0.3 })).facts.some(f => /: 0\.30 key passes/.test(f.text)));
  expect('fix 5: Reliability reads as the card prints it, out of 100', kpF.some(t => t === "X's Reliability: 89 out of 100"));
  expect('fix 5: no fact says "of a full season" (the League Title copy says "across a full season", and that is the card\'s own text)', !kpF.some(t => /of a full season/i.test(t)) && !rodri.facts.some(f => /of a full season/i.test(f.text)) && !pack.facts.some(f => /of a full season/i.test(f.text)));
  expect('fix 5: the Compare line parses with or without the old gloss', rodri.facts.some(f => /^Rodri's Reliability: \d+ out of 100$/.test(f.text)));
  expect('fix 5: the number rule still binds the Reliability figure', (await C.judgeDraft(pack, { p1: [ok(`Messi played ${pack.facts.find(f => /^Messi's Reliability/.test(f.text)).text.match(/: (\d+)/)[1]} of 100 on Reliability.`, [pack.facts.find(f => /^Messi's Reliability/.test(f.text)).id])] }, narrow)).units[0].kept);
  // The two closable rules (Lucas, 2026-10-24, after run 2).
  const tagsBig = tagsA.length >= tagsB.length ? tagsA : tagsB, sideBig = tagsA.length >= tagsB.length ? 'Messi' : 'Neymar';
  expect('rule A: the fair pack has a side with three or more tags', tagsBig.length >= 3);
  // a subset count is deleted unless that number is some kind's page total, or a sum or difference of two sides' totals (then it is checkable by accident)
  const totals = {}; for (const f of pack.facts) { const k = C.factKind(f.text) + '/' + (f.side || 'P'); totals[k] = (totals[k] || 0) + 1; }
  const allowed = new Set(Object.values(totals)); const byK = {}; for (const [k, c] of Object.entries(totals)) (byK[k.split('/')[0]] = byK[k.split('/')[0]] || []).push(c);
  for (const cs of Object.values(byK)) for (const a of cs) for (const b of cs) { allowed.add(a + b); allowed.add(Math.abs(a - b)); }
  const sub = tagsBig.length - 1, subOk = sub >= 2 && !allowed.has(sub);
  const j7 = await C.judgeDraft(pack, { p1: [
    ok(`${sideBig} carries ${WORD[sub]} tags that speak to volume.`, tagsBig.slice(0, sub)),
    ok(`${sideBig} carries ${WORD[tagsBig.length]} tags.`, tagsBig.slice(0, 2)),
    ok(`Messi holds ${WORD[Math.abs(hon.length - pack.facts.filter(f => f.side === 'B' && /^Honour/.test(f.text)).length)]} honours Neymar does not.`, hon),
  ] }, narrow);
  expect('rule A: a count of a true subset of the cited tags is deleted (the page shows more)' + (subOk ? '' : ' [skipped: the subset size is itself a page total]'), subOk ? j7.units[0].why.some(w => /numbers not in the cited facts/.test(w)) : true);
  expect('rule A: the page\'s own tag total is kept even when fewer tag facts are cited', j7.units[1].kept);
  expect('rule A: the difference between the two sides\' honour totals is kept', j7.units[2].kept);
  // the same rule on synthetic facts, so it is exercised whatever the live pack's totals happen to be (no digits in the fact text)
  const tagF = (side, n) => Array.from({ length: n }, (_, i) => ({ id: side + (i + 2), side, text: `Tag: ${side === 'A' ? 'Alpha' : 'Beta'} ${'abcdef'[i]}. The card says: "copy"` }));
  const idF = [{ id: 'A1', side: 'A', text: 'X (X), 20/21 season, C, L, ST, age 25' }, { id: 'B1', side: 'B', text: 'Y (Y), 20/21 season, C, L, ST, age 26' }];
  const synth0 = idF.concat(tagF('A', 4)), cite3 = tagF('A', 4).slice(0, 3), txt3 = cite3.map(f => f.text).join('\n');
  expect('rule A (synthetic): "three tags" citing three of four is deleted', C.numbersOk('X carries three tags.', txt3, cite3, synth0).includes('three'));
  expect('rule A (synthetic): "four tags" citing three of four is kept, the page total', !C.numbersOk('X carries four tags.', txt3, cite3, synth0).length);
  expect('rule A (synthetic): "six tags" is deleted', C.numbersOk('X carries six tags.', txt3, cite3, synth0).includes('six'));
  const synth1 = idF.concat(tagF('A', 4), tagF('B', 1));
  expect('rule A (synthetic): "three more tags than Y" is kept, a difference of totals (4 against 1)', !C.numbersOk('X carries three more tags than Y.', txt3, cite3, synth1).length);
  expect('rule A (synthetic): "five tags between them" is kept, a sum of totals', !C.numbersOk('Five tags between them.', txt3, cite3, synth1).length);
  expect('rule A (synthetic): the accepted limit: "three tags" passes when three is also the difference of totals', !C.numbersOk('X carries three tags.', txt3, cite3, synth1).length);
  const j8 = await C.judgeDraft(pack, { who: [ok('One clear winner, 95 to 87.', ['P1', 'A2', 'B2'])] }, narrow);
  expect('rule B: on a separated pair a headline that does not name the winner rejects the piece', j8.reasons.some(r => /headline does not name Messi/.test(r)));
  const j9 = await C.judgeDraft(pack, { who: [ok('Messi wins it clearly, 95 to 87.', ['P1', 'A2', 'B2'])] }, narrow);
  expect('rule B: a headline naming the winner passes that rule', !j9.reasons.some(r => /headline does not name/.test(r)));
  const j10 = await C.judgeDraft(tie, { who: [ok('Kane and Heung-Min, two Iconic seasons.', ['A2', 'B2'])] }, narrow);
  expect('rule B: on a tie the headline need name nobody', !j10.reasons.some(r => /headline does not name/.test(r)));
  // names with diacritics (2026-10-24, sample 2): the boundary must be Unicode-aware, and the narrow check is told the counts
  expect('diacritics: "Ibrahimović wins it outright" names Ibrahimović', C.nameRe('Ibrahimović').test('Ibrahimović wins it outright, 93 to 78.'));
  expect('diacritics: "Suárez" is found before a comma', C.nameRe('Suárez').test('Payet trails Suárez, 81 to 93.'));
  expect('diacritics: "Müller" is not found inside "Müllers"', !C.nameRe('Müller').test('the Müllers of this world'));
  const zp = { type: 'verdict', names: { A: 'Ibrahimović', B: 'Lacazette' }, winner: 'A', facts: [{ id: 'A1', side: 'A', text: 'Ibrahimović (Z. Ibrahimović), 15/16 season, PSG, Ligue 1, ST, age 34' }, { id: 'B1', side: 'B', text: 'Lacazette (A. Lacazette), 24/25 season, Lyon, Ligue 1, ST, age 33' }, { id: 'P1', side: null, text: 'The page\'s own result: "Ibrahimović wins it outright , 93 to 78"' }].concat(tagF('A', 3)) };
  const jz = await C.judgeDraft(zp, { who: [ok('Ibrahimović wins it outright, 93 to 78.', ['P1'])] }, narrow);
  expect('diacritics: rule B accepts a headline naming Ibrahimović', !jz.reasons.some(r => /headline does not name/.test(r)));
  expect('diacritics: the one-sided crown guard sees "Lacazette" named in a sentence citing only A', C.engagesBothSides(zp, { cite: ['A1'], s: 'Ibrahimović did more than Lacazette.' }) && !C.engagesBothSides(zp, { cite: ['A1'], s: 'Ibrahimović did plenty.' }));
  expect('counts line: the narrow check is told each side\'s honour and tag totals', /Ibrahimović's card holds 0 honours and 3 tags in all/.test(C.countsLine(zp)) && /Lacazette's card holds 0 honours and 0 tags/.test(C.countsLine(zp)));
  // a count is bound to its kind (2026-10-24, sample 1 run 3)
  const dimF = ['Goal Threat', 'Creation', 'Progression', 'Defensive'].map((d, i) => ({ id: 'A' + (10 + i), side: 'A', text: `X's ${d}: 90th percentile among ST seasons` }));
  const stdF = { id: 'A20', side: 'A', text: 'Tag: The Standard. The card says: "Elite not once but for years. Five seasons at the top level."' };
  const synth2 = idF.concat(tagF('A', 3), dimF, [stdF]);   // X holds four tags in all (three plus The Standard), four dimensions, a copy that says Five
  const c2 = [stdF], t2 = stdF.text;
  expect('bound: "five tags" is deleted though The Standard\'s copy says Five', C.numbersOk('X carries five tags.', t2, c2, synth2).includes('five'));
  expect('bound: "four tags" is kept, the real total (not because there are four dimensions)', !C.numbersOk('X carries four tags.', t2, c2, synth2).length);
  expect('bound: "three tags" is deleted though three dimensions could be cited', C.numbersOk('X carries three tags.', t2, c2, synth2).includes('three'));
  expect('bound: "five seasons at the top level" stays, the copy\'s own number', !C.numbersOk('Five seasons at the top level, the card says.', t2, c2, synth2).length);
  expect('bound: "two honours" is deleted when the card holds none', C.numbersOk('X holds two honours.', t2, c2, synth2).includes('two'));
  // the four changes after the three lists (Lucas, 2026-10-24)
  const jc = await C.judgeDraft(pack, { p1: [ok('Messi scored his goals for Barcelona.', ['A3']), ok('Messi scored his goals for Barcelona.', ['A1', 'A3']), ok('Messi scored 37 goals in La Liga.', ['A3'])],
    p2: [ok('Neymar played for Barcelona too.', ['B3']), ok('Neymar played for Barcelona too.', ['B1'])] }, narrow);
  expect('club hole: a club named without the identity fact is deleted', jc.units[0].why.some(w => /names Barcelona without citing A1/.test(w)));
  expect('club hole: the same sentence citing A1 is kept', jc.units[1].kept);
  expect('club hole: a league named without the identity fact is deleted', jc.units[2].why.some(w => /names La Liga without citing A1/.test(w)));
  expect('club hole: team-mates share a club, so either identity fact satisfies it', jc.units[3].why.some(w => /without citing A1 or B1/.test(w)) && jc.units[4].kept);
  const jd = await C.judgeDraft(zp, { p2: [ok('Lacazette played for Lyon.', ['A1', 'B1']), ok('Lacazette played for Lyon.', ['B1']), ok('Lacazette played for Lyon.', ['A1'])] }, narrow);
  expect('club hole: a club held by one side binds to that side\'s fact only', jd.units[1].kept && jd.units[2].why.some(w => /names Lyon without citing B1,/.test(w)));
  const honA = pack.facts.find(f => f.side === 'A' && /^Honour/.test(f.text)), tagA = pack.facts.find(f => f.side === 'A' && /^Tag/.test(f.text));
  const jh = await C.judgeDraft(pack, { p1: [ok('The Peak honour sits on his card.', [tagA.id]), ok('Two honours sit on his card.', [honA.id]), ok('The tag speaks for itself.', [honA.id]), ok('The tag speaks for itself.', [tagA.id])] }, narrow);
  expect('honour binds: "honour" citing only a tag fact is deleted', jh.units[0].why.some(w => /says honour without citing an honour fact/.test(w)));
  expect('honour binds: "honours" citing an honour fact passes that rule', !jh.units[1].why.some(w => /says honour/.test(w)));
  expect('tag binds: "tag" citing only an honour fact is deleted', jh.units[2].why.some(w => /says tag without citing a tag fact/.test(w)));
  expect('tag binds: "tag" citing a tag fact passes', jh.units[3].kept);
  expect('raise the ask: verdict paragraphs ask for 4 to 5', (C.VERDICT_FORMAT.match(/4 to 5/g) || []).length === 4);
  expect('raise the ask: notes stanzas ask for 4 to 5 and the closing stanza 3 to 4', /\[\[4 to 5 sentences\], \[4 to 5\], \[4 to 5\], \[3 to 4\]\]/.test(C.NOTES_FORMAT));
  const PC2 = require('./prose_checks.js');
  expect('judge counts dropped: "seven player tags" is a count claim', PC2.isCountClaim('The page shows seven player tags, not six') && PC2.isCountClaim('Benzema holds four honours to Mbappé\'s three') && PC2.isCountClaim('tags: 5'));
  expect('judge counts dropped: a non-count claim is kept', !PC2.isCountClaim('the Iconic season that defined an era') && !PC2.isCountClaim('Premier League'));
  // format drift (2026-10-24, the four final runs): a bare-string headline, and citations written inline
  const jf = await C.judgeDraft(tie, { who: ['Kane and Heung-Min: two Iconic seasons the Index cannot split.'], p1: [ok('Kane scored his goals for Tottenham. [A1, A3]', [])] }, narrow);
  expect('format drift: a bare-string headline is read as a sentence (deleted for citing nothing, not as empty)', jf.units[0].s.startsWith('Kane and') && jf.units[0].why.includes('cites nothing') && !jf.units[0].why.includes('empty'));
  expect('format drift: an inline [A1, A3] tail becomes the citation and leaves the sentence', jf.units[1].s === 'Kane scored his goals for Tottenham.' && jf.units[1].cite.join(',') === 'A1,A3' && jf.units[1].kept);
  expect('format: the headline is specified as an object with a cite', /"who": \[\{"s":/.test(C.VERDICT_FORMAT) && /"glance": \[\{"s":/.test(C.NOTES_FORMAT));
  // the four decisions after the six runs (Lucas, 2026-10-24)
  const dimQ = ['Goal Threat', 'Creation', 'Progression', 'Defensive'].map((d, i) => ({ id: 'A' + (i + 2), side: 'A', text: `Osimhen's ${d}: 90th percentile among ST seasons` })).concat([{ id: 'A6', side: 'A', text: 'Osimhen\'s Reliability: 80 out of 100' }]);
  const tagQ4 = ['Finisher', 'Poacher', 'Workhorse', 'Iron Man'].map((t, i) => ({ id: 'A' + (i + 7), side: 'A', text: `Tag: ${t}, meaning what the card says` }));
  const allQ = dimQ.concat(tagQ4);
  const ct = dimQ.map(f => f.text).join('\n');
  expect('dimension counts: "three dimensions" citing four of them passes (a subset up to the total)', C.numbersOk('He sits in the 90s in three dimensions.', ct, dimQ, allQ).length === 0);
  expect('dimension counts: "five attributes" passes (four dimensions and Reliability)', C.numbersOk('All five attributes are on the card.', ct, dimQ, allQ).length === 0);
  expect('dimension counts: "six dimensions" on a single card is deleted', C.numbersOk('He leads in six dimensions.', ct, dimQ, allQ).join() === 'six');
  expect('dimension counts: tags stay exact, "three tags" on a four-tag card is still deleted', C.numbersOk('Three tags sit on his card.', tagQ4.map(f => f.text).join('\n'), tagQ4, allQ).join() === 'Three');
  expect('dimension counts: "four tags" on a four-tag card passes', C.numbersOk('Four tags sit on his card.', tagQ4.map(f => f.text).join('\n'), tagQ4, allQ).length === 0);
  expect('notes form: the scout and the closing stanza ask for figures and card copy only, and "cost to deny" is gone', (C.NOTES_FORMAT.match(/FIGURES AND CARD COPY ONLY/g) || []).length === 2 && !/cost to deny/.test(C.NOTES_FORMAT));
  expect('headline instruction: the result and one cited fact, nothing more, in the system prompt and the format', /THE HEADLINE STATES THE RESULT AND ONE CITED FACT, NOTHING MORE/.test(C.writerSystem(pack)) && /the result and one cited fact, nothing more/.test(C.VERDICT_FORMAT));
  // the tools' cross-unit repair: the twelve flags on the four clean runs were all true numbers; a number the page does not print still flags
  const fs2 = require('fs'), evPath2 = __dirname + '/../../_local/verdict-check/fresh2_evidence.json';
  const E2 = fs2.existsSync(evPath2) ? require(evPath2) : { items: [] };
  const ev2 = id => EV.items.find(x => x.id === id) || E2.items.find(x => x.id === id);
  const twelve = [
    ['ronaldo1516-sancho2021', 'Ronaldo scored 35 goals to Sancho\'s 8, a gap of 27.'], ['ibrahimovic1516-lacazette2425', 'Ibrahimović\'s 38 goals exceed Lacazette\'s 15 by 23.'],
    ['ibrahimovic1516-lacazette2425', 'He was described as elite not once but for years across five seasons at the top level.'], ['messi1920-candreva2122', 'Messi\'s 25 goals against Candreva\'s 7 is a gap of 18.'],
    ['messi1920-candreva2122', 'Candreva played more, and his 36 appearances against Messi\'s 33 underline the point.'], ['benzema2122-mbappe2223', 'Mbappé reached a total of two more goals than Benzema over two more appearances.'],
    ['rodri2324-rice2324', 'Rodri scored more, while Rodri\'s 8 goals in 35 appearances compares to Rice\'s 7 in 38.'], ['rodri2324-rice2324', 'Rodri logged 2938 minutes across 35.'],
    ['notes-osimhen2223', 'Four assists alongside those 26 goals across 32 appearances give a combined goal involvement of 30 in a single Serie A season.'], ['bruno2021-hazard1819', 'The Standard calls him elite not once but for years across five top level seasons.'],
    ['debruyne1718-pogba1819', 'De Bruyne created more, and his 3.24 key passes per 90 minutes outpace Pogba\'s 1.64.'], ['notes-watkins2324', 'Add 13 assists to those 19 goals and the combined figure of 32 direct goal involvements across 3221 minutes makes the case on its own.'],
  ].filter(([id]) => ev2(id));
  const stillFlagged = twelve.filter(([id, s]) => PC2.checkNumbers(s, ev2(id)).flags.length);
  expect(`tools repair: the twelve true clauses raise no flag (${twelve.length} checkable here)`, twelve.length >= 8 && stillFlagged.length === 0);
  const offPage = id => { const op = PC2.pageFigures(ev2(id)).onPage; for (let v = 51; v < 400; v++) if (!op.has(v) && v !== 90) return v; };
  const rr = offPage('rodri2324-rice2324'), rb = offPage('benzema2122-mbappe2223');
  expect('tools repair: a difference the sentence does not support still flags', PC2.checkNumbers(`Rodri scored 8 goals to Rice's 7, a gap of ${rr}.`, ev2('rodri2324-rice2324')).flags.length === 1);
  expect('tools repair: a back-bound number the page does not print still flags', PC2.checkNumbers(`Rodri logged 2938 minutes across ${rr}.`, ev2('rodri2324-rice2324')).flags.length === 1);
  expect('tools repair: "over N appearances" with N nowhere on the page still flags', PC2.checkNumbers(`Mbappé scored two more goals over ${rb} appearances.`, ev2('benzema2122-mbappe2223')).flags.length === 1);
  expect('tools repair: a count of dimensions above the page total flags, one within it does not', PC2.checkNumbers('He led in six attributes.', ev2('notes-osimhen2223')).flags.length === 1 && PC2.checkNumbers('He led in three attributes.', ev2('notes-osimhen2223')).flags.length === 0);
  expect('tools repair: "Reliability rated at 39 out of 100" binds to Reliability, not to an age', PC2.extractNumbers('with his Reliability rated at 39 out of 100')[0].unit === 'reliability' && PC2.extractNumbers('Salah at 29 led the line')[0].unit === 'years');
  // the Cabinet joins the fact list (Lucas, 2026-10-24)
  const sp = C.verdictFacts(require('../../_local/verdict-check/fresh2_evidence.json').items.find(x => x.id === 'suarez1617-payet2122'));
  const cabB = sp.facts.find(f => f.side === 'B' && /Cabinet/.test(f.text)), cabA = sp.facts.filter(f => f.side === 'A' && /Cabinet/.test(f.text)), honA2 = sp.facts.find(f => f.side === 'A' && /^Honour/.test(f.text));
  expect('cabinet: Payet\'s career Top Assists is a fact the writer can cite', !!cabB && /Top Assists \(2017\), won by him/.test(cabB.text) && C.factKind(cabB.text) === 'cabinet');
  const jcab = await C.judgeDraft(sp, { p2: [ok('Payet holds an honour in his cabinet, the Top Assists of 2017.', [cabB.id]), ok('Payet holds no honour at all.', ['B1'])] }, narrow);
  expect('cabinet: "honour" citing a Cabinet fact passes the honour binding', jcab.units[0].kept);
  expect('cabinet: "honour" citing neither an honour nor a Cabinet fact is still deleted', jcab.units[1].why.some(w => /says honour without citing an honour fact/.test(w)));
  expect('cabinet: "six honours" may be the Cabinet\'s count', cabA.length === 6 && C.numbersOk('Six honours sit in his cabinet by this season.', cabA.map(f => f.text).join('\n'), cabA, sp.facts).length === 0 && C.numbersOk('Nine honours sit in his cabinet.', cabA.map(f => f.text).join('\n'), cabA, sp.facts).join() === 'Nine');
  expect('cabinet: the writer is told what a Cabinet fact is', /A CABINET FACT is what he had won BY this season/.test(C.writerSystem(sp)));
  console.log(fails ? `\nCITED SELFTEST FAIL (${fails})` : '\nCITED SELFTEST PASS');
  process.exit(fails ? 1 : 0);
})();
