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
  expect('the notes form (2026-10-26): two stanzas of 3 to 4, the scout 3 to 4, fewer sentences than facts', /\[\[3 to 4 sentences\], \[3 to 4 sentences\]\]/.test(C.NOTES_FORMAT) && /"scout": \[3 to 4 sentences/.test(C.NOTES_FORMAT) && /FEWER SENTENCES THAN FACTS/.test(C.NOTES_FORMAT));
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
  expect('notes form: the scout asks for the figures and nothing else, and "cost to deny" is gone', /THE FIGURES AND NOTHING ELSE/.test(C.NOTES_FORMAT) && !/cost to deny/.test(C.NOTES_FORMAT));
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
  // the Cabinet joins the NOTES fact list and stays out of the verdict's (Lucas, 2026-10-24: the Compare page does not print it)
  const sp = C.verdictFacts(require('../../_local/verdict-check/fresh2_evidence.json').items.find(x => x.id === 'suarez1617-payet2122'));
  expect('cabinet: a comparison carries no Cabinet facts', !sp.facts.some(f => /Cabinet/.test(f.text)));
  const osiEv = EV.items.find(x => x.id === 'notes-osimhen2223'), osiP = JSON.parse(osiEv.evidence.split('Card data:\n')[1]);
  const np = C.notesFacts(Object.assign({}, osiP, { cabinet: [{ honour: 'Golden Boot', year: 2022, won_by: 'player' }, { honour: 'League Title', year: 2017, won_by: 'team' }, { honour: 'Top Assists', year: 2019, won_by: 'player' }] }));
  const cabs = np.facts.filter(f => /'s Cabinet, an earlier honour on the shelf/.test(f.text));
  expect('cabinet: a card states the EARLIER honours on the shelf with the year and who won it, and this season\'s own shelf row is on the honour fact, not a Cabinet fact (2026-10-26)', cabs.length === 2 && /Cabinet, an earlier honour on the shelf: League Title \(dated 2017 on the shelf; the shelf's year is a season's label, not a calendar date, and the page prints only the year\), won with his team/.test(cabs[0].text) && C.factKind(cabs[0].text) === 'cabinet' && np.facts.some(f => /^Honour this season: Golden Boot, won by him, and it is this season's own entry on the Cabinet shelf, dated 2022, not an earlier one\./.test(f.text)));
  const jcab = await C.judgeDraft(np, { scout: [ok('He holds an honour in his cabinet from 2019, the Top Assists.', [cabs[1].id]), ok('He holds no honour at all.', ['A1'])] }, narrow);
  expect('cabinet: "honour" citing a Cabinet fact passes the honour binding', jcab.units[0].kept);
  expect('cabinet: "honour" citing neither an honour nor a Cabinet fact is still deleted', jcab.units[1].why.some(w => /says honour without citing an honour fact/.test(w)));
  expect('cabinet: "three honours" may be the Cabinet\'s count', C.numbersOk('Two honours sit in his cabinet before this season.', cabs.map(f => f.text).join('\n'), cabs, np.facts).length === 0 && C.numbersOk('Nine honours sit in his cabinet.', cabs.map(f => f.text).join('\n'), cabs, np.facts).join() === 'Nine');
  expect('cabinet: the writer is told what a Cabinet fact is', /A CABINET FACT is what he had won BY this season/.test(C.writerSystem(np)));
  // the Proof panel joins the fact list, as each page prints it (Lucas, 2026-10-24)
  const rrp = C.verdictFacts(EV.items.find(x => x.id === 'rodri2324-rice2324'));
  const g90 = rrp.facts.find(f => f.side === 'A' && / goals per 90 minutes$/.test(f.text)), cv = rrp.facts.find(f => f.side === 'A' && /goal conversion \d+%/.test(f.text));
  expect('proof (comparison): goals, assists and shots on target per 90 and goal conversion are facts, as THE PROOF prints them', !!g90 && !!cv && rrp.facts.filter(f => f.side === 'A' && / per 90 minutes$/.test(f.text)).length === 3 && C.factKind(g90.text) === 'proof' && C.factKind(cv.text) === 'conversion');
  const gv = g90.text.match(/: ([\d.]+) goals/)[1];
  expect('proof (comparison): the printed per-90 figure passes and an invented one is deleted', C.numbersOk(`Rodri scores ${gv} goals per 90.`, g90.text, [g90], rrp.facts).length === 0 && C.numbersOk('Rodri scores 1.37 goals per 90.', g90.text, [g90], rrp.facts).join() === '1.37');
  const osiN = C.notesFacts(osiP), tk = osiN.facts.filter(f => / in all, [\d.]+ per 90 minutes$| not recorded this season /.test(f.text));
  expect('proof (card): the pool\'s three rows are facts; the goals row, whose total the totals fact holds, states its per-90 rate only (2026-10-26)', tk.length === 2 && osiP.proof_rows && osiP.proof_rows.length === 3 && osiN.facts.some(f => /^V\. Osimhen: 0\.90 goals per 90 minutes$/.test(f.text)) && osiN.facts.filter(f => /\b26\b/.test(f.text)).length === 1);
  const defP = Object.assign({}, osiP, { position: 'CDM', proof_rows: [{ label: 'Tackles', total: 71, per90: 2.18 }, { label: 'Interceptions', total: 40, per90: 1.23 }, { label: 'Blocks', total: null, per90: null }] });
  const dn = C.notesFacts(defP), tkF = dn.facts.find(f => /71 tackles in all, 2.18 per 90 minutes$/.test(f.text)), blF = dn.facts.find(f => /blocks not recorded this season/.test(f.text));
  expect('proof (card): a defender\'s tackles, interceptions and blocks are facts, NR stated as not recorded', !!tkF && !!blF);
  expect('proof (card): "71 tackles" citing the row passes; "80 tackles" is deleted', C.numbersOk('He made 71 tackles in all.', tkF.text, [tkF], dn.facts).length === 0 && C.numbersOk('He made 80 tackles in all.', tkF.text, [tkF], dn.facts).join() === '80');
  expect('tools: tackles, interceptions and blocks are units the number check binds', PC2.extractNumbers('71 tackles and 40 interceptions and 9 blocks').map(x => x.unit).join(',') === 'tackles,interceptions,blocks');
  // the per-page rule, closed (Lucas, 2026-10-24): a comparison carries no shots total and no key passes per 90, which the Compare page does not print; the card keeps both
  const dbp = C.verdictFacts(EV.items.find(x => x.id === 'debruyne1718-pogba1819'));
  expect('per-page rule: a comparison carries no key passes per 90 and no shots total', !dbp.facts.some(f => / key passes per 90 minutes$| goals from \d+ shots$/.test(f.text)) && dbp.facts.some(f => / goals per 90 minutes$/.test(f.text)));
  expect('per-page rule: the card keeps shots total and key passes per 90, each in ONE fact: "goals from shots" only when the Proof panel has no shots row, key passes only when it has no key-passes row (2026-10-26)', !osiN.facts.some(f => / goals from \d+ shots$/.test(f.text)) && C.notesFacts(Object.assign({}, osiP, { proof_rows: [] })).facts.some(f => / goals from 105 shots$/.test(f.text)) && kpF.some(t => / key passes per 90 minutes$/.test(t)) && C.notesFacts(Object.assign({}, kpP, { proof_rows: [{ label: 'Key passes', total: 80, per90: 2.36 }] })).facts.filter(f => /key passes/.test(f.text)).length === 1);
  // the port (2026-10-25): the endpoint's entry builds the same pack from the two lines and the printed result line
  const dbEv = EV.items.find(x => x.id === 'debruyne1718-pogba1819'), dbLines = dbEv.evidence.split('\n').filter(l => /^Player [AB]:/.test(l));
  const viaEndpoint = C.verdictFactsFrom(dbLines[0], dbLines[1], 'The Index cannot separate these two.');
  expect('port: verdictFactsFrom builds the pack the endpoint uses, identical to the calibration pack', JSON.stringify(viaEndpoint.facts) === JSON.stringify(C.verdictFacts(dbEv).facts) && viaEndpoint.winner === null);
  expect('port: the rules version is derived from the prompts and a hand rev', /^c\d+-[0-9a-f]{8}$/.test(C.RULES_VERSION));
  const V2 = require('../../vv-core.js');
  expect('port: the result line is one function for the page and the server', V2.vvResultLine({ ladder: 'bragging_rights' }, { surname: 'Kane', vv: 92 }, { surname: 'Mertens', vv: 79 }, 'A') === 'Kane wins it clearly , 92 to 79' && V2.vvResultLine({ separation: 'inside' }, {}, {}, 'tie') === 'The Index cannot separate these two.');
  expect('port: the captured request carries the printed result line and no instructions', !!(dbEv.body && typeof dbEv.body.resultLine === 'string') && !/Result:|Tone:|VERDICT TAG/.test(dbEv.evidence));
  // pass 1 of the proof runs (2026-10-25): the headline cites the identity facts; the writer sees the totals
  expect('headline: the format example cites A1 and B1 on a comparison and A1 on a card', /"cite": \["P1", "A1", "B1", "A2", "B2"\]/.test(C.VERDICT_FORMAT) && /"cite": \["A1", "A3"\]/.test(C.NOTES_FORMAT) && /THE HEADLINE OBEYS EVERY RULE BELOW/.test(C.writerSystem(pack)));
  expect('totals: the writer\'s facts open with each card\'s honour and tag totals', /card holds \d+ honours? and \d+ tags? in all/.test(C.factsText(pack).split('FACTS:')[0]) && /card holds \d+ honours? and \d+ tags? in all/.test(C.factsText(np).split('FACTS:')[0]));
  // pass 1 flags (2026-10-25): per-90 binding, the honours segment, fact ids in prose
  expect('tools: "0.46 assists per 90" binds to per90, not to assists; "1.31 shots on target per 90" the same', PC2.extractNumbers('Hazard\'s 0.46 assists per 90 is the higher figure').map(x => x.unit).join() === 'per90' && PC2.extractNumbers('Shots on target per 90 of 1.31 and goals per 90 of 0.53')[0].unit === 'per90' && PC2.extractNumbers('12 assists in all')[0].unit === 'assists');
  const ibEv = require('../../_local/verdict-check/fresh2_evidence.json').items.find(x => x.id === 'ibrahimovic1516-lacazette2425');
  expect('tools: the honours count stops at the PROOF segment (Ibrahimović holds three, not four)', PC2.pageFigures(ibEv).sides[0].honours === 3 && PC2.checkNumbers('Ibrahimović holds three honours this season', ibEv).flags.length === 0);
  const jid = await C.judgeDraft(pack, { p1: [ok('Messi scored 37 goals, as P1 states.', ['A3', 'P1']), ok('Messi scored 37 goals.', ['A3'])] }, narrow);
  expect('writer: a sentence that quotes a fact id is deleted', jid.units[0].why.some(w => /quotes a fact id/.test(w)) && !jid.units[1].why.some(w => /fact id/.test(w)));
  expect('tools: "landed at 39 out of 100" is Reliability; "0.42 goals and 0.35 assists per 90" are two rates', PC2.extractNumbers('his Reliability landed at 39 out of 100')[0].unit === 'reliability' && PC2.extractNumbers('at 0.42 goals and 0.35 assists per 90 minutes').map(x => x.unit).join() === 'per90,per90' && PC2.extractNumbers('scored 29 goals and 13 assists')[0].unit === 'goals');
  const jcb = await C.judgeDraft(pack, { p1: [ok('The Golden Boot sits in his cabinet from this season.', [honA.id]), ok('The Golden Boot is this season\'s honour.', [honA.id])] }, narrow);
  expect('cabinet word: on a comparison "cabinet" is deleted; the same honour without the word passes', jcb.units[0].why.some(w => /says cabinet without citing a Cabinet fact/.test(w)) && !jcb.units[1].why.some(w => /cabinet/.test(w)) && jcab.units[0].kept);
  expect('tools (pass 3): "at 33 percent" is a share, "shots on target 55 times" are shots, "four point to" is not points', PC2.extractNumbers('his goal conversion stands at 33 percent')[0].unit === 'pct' && PC2.extractNumbers('He placed his shots on target 55 times')[0].unit === 'shots' && PC2.extractNumbers('six tags in all against Kane\'s four point to a sharper edge').map(x => x.unit).join() === 'tags,' && PC2.extractNumbers('two points above Messi')[0].unit === 'points');
  // the pairs the sample does not cover (2026-10-25, read from the code): a keeper gets no prose; NR goals are stated as not recorded, never "null"
  const gkLine = 'Player B: Neuer (M. Neuer), 19/20, Bayern [Bundesliga], pos GK, age 33, VV NR, NR goals NR assists; dimensions: Reliability 90; 2900 min / 33 apps';
  const gkPack = C.verdictFactsFrom(dbLines[0], gkLine, 'The Index cannot separate these two.');
  expect('uncovered: a keeper on either side makes the pack a keeper pack, which runPiece answers with no prose and no model call', gkPack.keeper === true);
  expect('uncovered: NR goals and assists are stated as not recorded, never as null', !/null/.test(gkPack.facts.map(f => f.text).join(' ')) && gkPack.facts.some(f => /goals not recorded \(the page prints NR\) and assists not recorded/.test(f.text)));
  const nrNotes = C.notesFacts(Object.assign({}, osiP, { goals: null, assists: null, shots_total: 50 }));
  expect('uncovered: a card with no goals recorded says so and skips the goals-from-shots fact', nrNotes.facts.some(f => /goals not recorded \(the card prints NR\)/.test(f.text)) && !nrNotes.facts.some(f => /null/.test(f.text)) && !nrNotes.facts.some(f => / goals from \d+ shots$/.test(f.text)));
  // pass 4 (2026-10-25)
  const dimP = pack.facts.find(f => f.side === 'A' && /Progression: \d+(st|nd|rd|th) percentile/.test(f.text)), dimV = dimP.text.match(/(\d+)(?:st|nd|rd|th) percentile/)[1];
  expect('writer: a percentile called a percentage is deleted; called a percentile it passes', C.numbersOk(`His Progression at ${dimV} per cent is high.`, dimP.text, [dimP], pack.facts).some(w => /called a percentage/.test(w)) && C.numbersOk(`His Progression at the ${dimV}th percentile is high.`, dimP.text, [dimP], pack.facts).length === 0);
  expect('tools (pass 4): "Per 90 minutes he records 0.53 goals" is a rate; "nearly four times Candreva\'s rate" is not appearances; "30 plus goals" is over 30', PC2.extractNumbers('Per 90 minutes he records 0.53 goals')[0].unit === 'per90' && PC2.extractNumbers('nearly four times Candreva\'s rate')[0].unit === null && PC2.extractNumbers('both scoring 30 plus goals')[0].qualifier === 'over');
  // NOTES WORTH READING, 2026-10-26 (Lucas: build 1 and 2; "ranking and comparing within the card is allowed, interpretation is not")
  const rk = s => C.rankingOk(osiN, s);
  expect('ranking: Lucas\'s relation lives, "Goal Threat at the 96th percentile is his strongest dimension"', rk('Goal Threat at the 96th percentile is his strongest dimension.').length === 0);
  expect('ranking: Lucas\'s judgement dies, "His finishing was the best part of his game"', rk('His finishing was the best part of his game.').some(w => /ranks nothing the card names/.test(w)));
  expect('ranking: a wrong superlative is deleted ("Creation is his weakest dimension" when Defensive is)', rk('Creation is his weakest dimension.').length === 1 && rk('Defensive at the 16th percentile is his weakest dimension.').length === 0);
  expect('ranking: a pairwise comparison the right way round lives, the wrong way round dies', rk('Creation at the 60th percentile sits above Progression at the 37th.').length === 0 && rk('Progression at the 37th percentile sits above Creation at the 60th.').length === 1 && rk('Creation is lower than Goal Threat.').length === 0);
  expect('ranking: Reliability may be set against a dimension, never called strongest or weakest', rk('Reliability at 76 out of 100 sits below Goal Threat at the 96th percentile.').length === 0 && rk('Reliability of 76 is his highest attribute.').length === 1);
  expect('ranking: "more goals than assists" names no attribute and dies', rk('He scored more goals than assists.').length === 1);
  expect('ranking: quoted card copy is not a ranking ("The best season of his career", quoted or paraphrased verbatim)', rk('The tag Peak reads: "The best season of his career, and a genuinely elite one."').length === 0 && rk('Peak means the best season of his career, and a genuinely elite one.').length === 0);
  expect('ranking: two superlatives in one sentence, each governing the name before it', rk('Goal Threat is his strongest dimension and Defensive his weakest.').length === 0 && rk('Goal Threat at the 96th percentile is his strongest dimension, Defensive at the 16th his weakest.').length === 0);
  expect('ranking: a comparative with one side unnamed dies ("sit behind a Goal Threat")', rk('His 55 shots on target sit behind a Goal Threat at the 96th percentile.').length === 1);
  expect('ranking: a plain figure sentence is untouched', rk('He put 55 shots on target across 32 appearances.').length === 0);
  const gbF = osiN.facts.filter(f => /Honour this season: Golden Boot/.test(f.text));
  expect('honour: "his first Golden Boot" dies (the card cannot know a first)', C.honourRepeatOk(osiN, 'His first Golden Boot came at 24.', gbF).some(w => /cannot know a first/.test(w)));
  expect('honour: "a second Golden Boot" with no earlier shelf row dies', C.honourRepeatOk(osiN, 'A second Golden Boot, after 2022.', gbF).some(w => /the shelf holds 0 earlier/.test(w)));
  const hamEv = EV.items.find(x => x.id === 'notes-hamsik1617'), hamN = C.notesFacts(JSON.parse(hamEv.evidence.split('Card data:\n')[1])), hamCab = hamN.facts.filter(f => /Cabinet/.test(f.text));
  expect('honour: a repeat that cites the earlier shelf row lives; one that does not cite it dies', hamCab.length === 1 && C.honourRepeatOk(hamN, 'A second Top Assists, after the one in 2012.', hamCab).length === 0 && C.honourRepeatOk(hamN, 'A second Top Assists, after the one in 2012.', []).length === 1);
  expect('honour: "The second is Peak" is a listing, not a repeat honour', C.honourRepeatOk(osiN, 'The second is Peak.', []).length === 0);
  expect('honour: "The first honour reads" is a listing, "his first Golden Boot" and "a first honour" are firsts', C.honourRepeatOk(osiN, 'The first honour reads: "Champions."', gbF).length === 0 && C.honourRepeatOk(osiN, 'The Golden Boot was his first.', gbF).length === 1 && C.honourRepeatOk(osiN, 'He claimed a first honour.', gbF).length === 1 && C.honourRepeatOk(osiN, 'His first Serie A Golden Boot.', gbF).length === 1);
  const a3 = osiN.facts.find(f => /26 goals and 4 assists/.test(f.text)).id, a11 = osiN.facts.find(f => /0\.90 goals per 90/.test(f.text)).id, peakF = osiN.facts.find(f => /^Tag: Peak/.test(f.text)).id, gmF = osiN.facts.find(f => /^Tag: Goal Machine/.test(f.text)).id;
  const once = await C.judgeDraft(osiN, { glance: [ok('Osimhen scored 26 goals for Napoli in Serie A.', ['A1', a3])],
    scout: [ok('He scored 26 goals in all.', [a3]), ok('Osimhen scored 26 goals, no more.', [a3]), ok('He scored 0.90 goals per 90 minutes for Napoli.', ['A1', a11]), ok('Osimhen played in Serie A.', ['A1'])],
    notes: [[ok('Osimhen carries two honours and two tags on this card.', ['A9', 'A10', gmF, peakF]), ok('The tag Peak reads: "The best season of his career, and a genuinely elite one."', [peakF]), ok('Peak is defined as the best season of his career, and a genuinely elite one.', [gmF])], [ok('Goal Threat is his strongest dimension.', [osiN.facts[3].id]), ok('Defensive is his weakest.', [osiN.facts[6].id])]] }, narrow);
  const ou = s => once.units.find(u => u.s.startsWith(s));
  expect('once: a second body sentence citing the same figure fact is deleted, the first kept, and the glance\'s fact may be stated once more in the body', ou('Osimhen scored 26 goals for').kept && ou('He scored 26 goals in all').kept && ou('Osimhen scored 26 goals, no more').why.some(w => /already cited by an earlier sentence/.test(w)));
  expect('once: a count sentence and the quotation may both cite an honour or tag fact (quote-once governs copy)', ou('Osimhen carries two honours').kept && ou('The tag Peak reads').kept);
  const twoTag = C.notesFacts(Object.assign({}, osiP, { honours: [], cabinet: [], tag_glosses: osiP.tag_glosses.slice(0, 1) })), tt = twoTag.facts.filter(f => /^Tag: /.test(f.text));
  const jtt = await C.judgeDraft(twoTag, { glance: [ok('Osimhen scored 26 goals for Napoli.', ['A1', twoTag.facts[2].id])], scout: [ok('He scored 0.90 goals per 90 minutes.', [twoTag.facts.find(f => /0\.90 goals per 90/.test(f.text)).id]), ok('He put 55 shots on target in all.', [twoTag.facts.find(f => /55 shots on target/.test(f.text)).id])], notes: [[ok('One tag sits on the card, Goal Machine.', tt.map(f => f.id))], [ok('Goal Threat is his strongest dimension.', [twoTag.facts[3].id]), ok('Defensive is his weakest.', [twoTag.facts[6].id])]] }, narrow);
  expect('stanza floor: a one-tag card with no honour may have a one-sentence honours-and-tags stanza (the floor is two or the number of honour, tag and shelf facts)', jtt.units.filter(u => u.para === 'notes1' && u.kept).length === 1 && !jtt.rejected);
  const noTag = C.notesFacts(Object.assign({}, osiP, { honours: [], cabinet: [], tag_glosses: [] }));
  const jnt = await C.judgeDraft(noTag, { glance: [ok('Osimhen scored 26 goals for Napoli.', ['A1', noTag.facts[2].id])], scout: [ok('He scored 0.90 goals per 90 minutes.', [noTag.facts.find(f => /0\.90 goals per 90/.test(f.text)).id]), ok('He put 55 shots on target in all.', [noTag.facts.find(f => /55 shots on target/.test(f.text)).id])], notes: [[], [ok('Goal Threat is his strongest dimension.', [noTag.facts[3].id]), ok('Defensive is his weakest.', [noTag.facts[6].id])]] }, narrow);
  expect('stanza floor: a card with no honour and no tag has an empty first stanza, dropped on assembly', !jnt.rejected && C.assemble(noTag, jnt.units).notes.length === 1);
  expect('counts line: the narrow check and the writer are told the card prints four dimensions and Reliability', /prints 4 dimensions and Reliability/.test(C.countsLine(osiN)));
  expect('once: the identity fact may be cited by every sentence that names the club or league', ou('He scored 0.90').kept && ou('Osimhen played in Serie A').kept);
  expect('once: card copy printed twice is deleted the second time, even under a different citation', ou('The tag Peak reads').kept && ou('Peak is defined').why.some(w => /repeats card copy/.test(w)));
  expect('once: a ranked stanza of two survives, and the piece has two stanzas', ou('Goal Threat is his strongest').kept && ou('Defensive is his weakest').kept && once.paras.includes('notes2') && !once.paras.includes('notes3'));
  expect('once: a verdict is untouched by the once rule (its paragraphs may re-cite a fact)', (await C.judgeDraft(pack, { who: [ok('Messi wins it clearly, 95 to 87.', ['P1', 'A1', 'B1', 'A2', 'B2'])], p1: [ok('Messi scored ' + n('A3').match(/(\d+) goals/)[1] + ' goals.', ['A3']), ok('Messi scored ' + n('A3').match(/(\d+) goals/)[1] + ' goals in all.', ['A3'])], p2: [ok('Neymar played for Barcelona that season.', ['B1']), ok('Neymar played in La Liga.', ['B1'])], h2h: [ok('Both played for Barcelona.', ['A1', 'B1']), ok('Both were in La Liga.', ['A1', 'B1'])], verdict: [ok('Messi wins it clearly.', ['P1']), ok('The page names Messi.', ['P1'])] }, narrow)).units.every(u => u.kept));
  expect('assemble: a card assembles two stanzas', C.assemble(osiN, once.units).notes.length === 2);
  expect('writer: told each fact once, the ranking rule with both of Lucas\'s sentences, and that the shelf holds this season', /EACH FACT IS CITED BY ONE SENTENCE ONLY/.test(C.writerSystem(osiN)) && /his finishing was the best part of his game/.test(C.writerSystem(osiN)) && /Goal Threat at the 96th percentile is his strongest dimension/.test(C.writerSystem(osiN)) && /THE CABINET SHELF IS "AS OF THIS SEASON"/.test(C.writerSystem(osiN)));
  expect('rules version: CITED_REV moved past c1 for the code rules', /^c[2-9]$/.test(C.CITED_REV));
  // pass 6 (2026-10-26): the two causes sample 1's tie pairs died on, closed
  expect('tie headline: the writer is told to put each score beside its own name, never "both scoring 93 and 91"', /THE HEADLINE ON A TIE PUTS EACH SCORE BESIDE ITS OWN NAME/.test(C.writerSystem(tie)) && !/EACH SCORE BESIDE ITS OWN NAME/.test(C.writerSystem(pack)));
  const aDims = ['Goal Threat', 'Creation', 'Progression', 'Defensive'].map(d => pack.facts.find(f => f.side === 'A' && f.text.includes("'s " + d + ':'))).filter(Boolean), aV = C.cardAttributes(pack, 'A'), aMax = Object.entries(aV).filter(([k]) => k !== 'Reliability').sort((x, y) => y[1] - x[1]);
  const jv = await C.judgeDraft(pack, { who: [ok('Messi wins it clearly, 95 to 87.', ['P1', 'A1', 'B1', 'A2', 'B2'])],
    p1: [ok(`${aMax[aMax.length - 1][0]} is his strongest dimension.`, [aDims[0].id]), ok(`${aMax[0][0]} is his strongest dimension.`, [aDims[0].id]), ok('Messi scored ' + n('A3').match(/(\d+) goals/)[1] + ' goals.', ['A3'])],
    p2: [ok('Neymar played for Barcelona that season.', ['B1']), ok('Neymar played in La Liga.', ['B1'])],
    h2h: [ok("Messi's Creation sits above Neymar's.", ['A1', 'B1']), ok('Both were in La Liga.', ['A1', 'B1'])],
    verdict: [ok('Messi wins it clearly.', ['P1']), ok('The page names Messi, rated Clinical.', ['P1', pack.facts.find(f => f.side === 'A' && /^Tag: /.test(f.text)).id])] }, narrow);
  const jvu = s => jv.units.find(u => u.s.startsWith(s));
  expect('verdict ranking gate: a wrong "strongest dimension" in p1 is deleted by code, the right one kept', jvu(aMax[aMax.length - 1][0] + ' is his strongest').why.some(w => /^ranking:/.test(w)) && jvu(aMax[0][0] + ' is his strongest').kept);
  expect('verdict ranking gate: the head to head\'s cross-player comparison is left to the narrow check', jvu("Messi's Creation sits above").kept);
  expect('a tag is not a rating: "rated Clinical" is deleted', jvu('The page names Messi, rated').why.some(w => /calls a tag a rating/.test(w)));
  // the meaning audit (Lucas, 2026-10-26): facts whose meaning depends on context the writer does not have
  const dbp2 = C.verdictFacts(EV.items.find(x => x.id === 'debruyne1718-pogba1819')), wc = dbp2.facts.find(f => f.side === 'B' && /World Cup Winner/.test(f.text));
  expect('meaning: a World Cup on a club card is won with his country, before the season and not with the club', !!wc && /won with his country at the 2018 tournament, before this club season and not with Manchester United/.test(wc.text));
  expect('meaning: a shelf row says it names no club', /the shelf names no club/.test(hamCab[0].text));
  expect('meaning: "Reliability at the 94th percentile" is deleted, a cited 96th percentile passes, a difference of two cited percentiles passes', C.numbersOk('His Reliability sits at the 76th percentile.', osiN.facts[7].text, [osiN.facts[7]], osiN.facts).some(w => /called a percentile/.test(w)) && C.numbersOk('Goal Threat at the 96th percentile.', osiN.facts[3].text, [osiN.facts[3]], osiN.facts).length === 0 && C.numbersOk('Goal Threat is 36 percentile points above Creation.', osiN.facts[3].text + '\n' + osiN.facts[4].text, [osiN.facts[3], osiN.facts[4]], osiN.facts).length === 0);
  const jm = await C.judgeDraft(osiN, { glance: [ok('Osimhen made 32 starts for Napoli.', ['A1', osiN.facts[2].id])], scout: [ok('He kept two clean sheets.', [osiN.facts[2].id]), ok('He scored 0.90 goals per 90 minutes.', [osiN.facts[8].id])], notes: [[ok('Peak reads: "The best season of his career, and a genuinely elite one."', [osiN.facts.find(f => /^Tag: Peak/.test(f.text)).id])], [ok('Goal Threat is his strongest dimension.', [osiN.facts[3].id]), ok('Defensive is his weakest.', [osiN.facts[6].id])]] }, narrow);
  expect('meaning: "starts" and "clean sheets" are measures no outfield card prints, deleted', jm.units[0].why.some(w => /names a measure no card prints/.test(w)) && jm.units[1].why.some(w => /names a measure no card prints/.test(w)));
  expect('meaning: the writer is told a shelf honour names no club and a World Cup is his country\'s', /A shelf honour names no club/.test(C.writerSystem(osiN)) && /A World Cup is won with his country/.test(C.writerSystem(osiN)));
  // pass 8 (2026-10-27): the 1 of "Ligue 1" is a name, not a number
  const ibra = C.verdictFacts(require('../../_local/verdict-check/fresh2_evidence.json').items.find(x => x.id === 'ibrahimovic1516-lacazette2425')), ibraC = ibra.facts.filter(f => ['P1', 'A1', 'B1', 'A2', 'B2'].includes(f.id));
  expect('"Ligue 1": the 1 is not extracted as a number, so "three honours in Ligue 1" is not an honour count of 1', !PC2.extractNumbers('taking three honours in Ligue 1 at Paris Saint Germain').some(x => x.value === 1) && !C.numbersOk('Ibrahimović wins it outright, 93 to 78, in Ligue 1.', ibraC.map(f => f.text).join('\n'), ibraC, ibra.facts).length);
  expect('"Ligue 1": a real 1 still counts ("1 honour" on a three-honour card is deleted)', C.numbersOk('He holds 1 honour in Ligue 1.', ibraC.map(f => f.text).join('\n'), ibraC, ibra.facts).join() === '1');
  // the meaning audit's three residues, closed (2026-10-28): percentiles across pools, a dimension glossed as a statistic, the shelf year as a date
  const bh = C.verdictFacts(EV.items.find(x => x.id === 'bruno2021-hazard1819')), bhA = bh.facts.find(f => f.side === 'A' && /Creation/.test(f.text)), bhB = bh.facts.find(f => f.side === 'B' && /Creation/.test(f.text)), bhRA = bh.facts.find(f => f.side === 'A' && /Reliability/.test(f.text)), bhRB = bh.facts.find(f => f.side === 'B' && /Reliability/.test(f.text));
  const mnA = pack.facts.find(f => f.side === 'A' && /Creation/.test(f.text)), mnB = pack.facts.find(f => f.side === 'B' && /Creation/.test(f.text));
  expect('pools: CAM v Winger, a sentence citing a dimension of each side is deleted; one side alone passes; Reliability of both passes; a same-pool pair passes',
    C.poolsOf(bh).A === 'CAM' && C.poolsOf(bh).B === 'Winger' && C.crossPoolOk(bh, [bhA, bhB]).length === 1 && !C.crossPoolOk(bh, [bhA]).length && !C.crossPoolOk(bh, [bhRA, bhRB]).length && !C.crossPoolOk(pack, [mnA, mnB]).length);
  const jbh = await C.judgeDraft(bh, { who: [ok('The Index cannot separate Fernandes and Hazard.', ['P1', 'A1', 'B1'])], p1: [ok('Fernandes sits at the 94th percentile for Creation among CAM seasons.', ['A1', bhA.id])], p2: [ok('Hazard sits at the 96th percentile for Creation among Winger seasons.', ['B1', bhB.id])],
    h2h: [ok("Hazard's Creation at the 96th percentile sits above Fernandes's 94th.", [bhA.id, bhB.id]), ok("Fernandes's Reliability of 91 is above Hazard's 86.", [bhRA.id, bhRB.id])], verdict: [ok('The page cannot separate them.', ['P1'])] }, narrow);
  expect('pools: in a judged piece the cross-pool percentile sentence is deleted for pools and the Reliability one kept', jbh.units.find(u => /^Hazard's Creation/.test(u.s)).why.some(w => /^pools:/.test(w)) && jbh.units.find(u => /^Fernandes's Reliability/.test(u.s)).kept);
  expect('dimension gloss: "a measure of his tackling" and "reflects his finishing" beside a dimension are deleted; a figure beside a dimension, a ranking, and card copy pass',
    C.dimensionGlossOk(osiN, 'Defensive at the 16th percentile is his weakest, a measure of his tackling.').length === 1 && C.dimensionGlossOk(osiN, 'Goal Threat at the 96th percentile reflects his finishing.').length === 1
    && !C.dimensionGlossOk(osiN, 'Goal Threat at the 96th percentile is his strongest dimension, with 26 goals.').length && !C.dimensionGlossOk(osiN, 'Creation at the 60th percentile sits above Progression at the 37th, a genuine strength.').length
    && !C.dimensionGlossOk(osiN, 'Peak reads: "The best season of his career, and a genuinely elite one." His Creation sits at the 60th percentile.').length);
  expect('shelf year: the Cabinet fact says the year is a season\'s label and that the page prints only the year', /dated 2012 on the shelf; the shelf's year is a season's label, not a calendar date, and the page prints only the year/.test(hamCab[0].text));
  expect('shelf year: "won in 2012", "from 2012" and "the 2012/13 season" are deleted; "dated 2012" and "the shelf\'s 2012 row" pass',
    C.shelfYearOk(hamN, 'An earlier Top Assists, won in 2012.').length === 1 && C.shelfYearOk(hamN, 'An earlier Top Assists honour from 2012 sits on his shelf.').length === 1 && C.shelfYearOk(hamN, 'Top Assists from the 2012/13 season sits on his shelf.').length === 1
    && !C.shelfYearOk(hamN, 'An earlier Top Assists sits on the shelf, dated 2012.').length && !C.shelfYearOk(hamN, "The shelf's 2012 row is a Top Assists.").length);
  const jsh = await C.judgeDraft(bh, { who: [ok('The Index cannot separate Fernandes and Hazard.', ['P1', 'A1', 'B1'])], p1: [ok("Fernandes's card, dated 2020/21 on the shelf, scores 90.", ['A1', 'A2'])], p2: [ok('Hazard scores 90.', ['B1', 'B2'])], h2h: [ok('Both score 90.', ['A2', 'B2'])], verdict: [ok('The page cannot separate them.', ['P1'])] }, narrow);
  expect('"shelf" without a cited shelf entry is deleted (a comparison has no shelf)', jsh.units.find(u => /^Fernandes's card/.test(u.s)).why.some(w => /says shelf/.test(w)));
  expect('shelf year: this season\'s own shelf entry on the honour fact is covered too ("recording it as 2023" on Watkins 23/24 is deleted)', (() => { const w = EV.items.find(x => x.id === 'notes-watkins2324'); const wn = C.notesFacts(JSON.parse(w.evidence.split('Card data:\n')[1])); return wn.facts.some(f => /dated 2023, not an earlier one/.test(f.text)) && C.shelfYearOk(wn, 'Watkins won Top Assists this season, the card recording it as 2023.').length === 1 && !C.shelfYearOk(wn, "This season's Top Assists is the shelf's own entry, dated 2023.").length; })());
  expect('the writer is told all three', /A DIMENSION \(Goal Threat, Creation, Progression, Defensive\) IS A PERCENTILE THE CARD PRINTS/.test(C.writerSystem(bh)) && /WHEN THE TWO PLAYERS' POOLS DIFFER/.test(C.writerSystem(bh)) && /A SHELF YEAR IS A SEASON'S LABEL, NOT A DATE/.test(C.writerSystem(osiN)));
  expect('rules version: CITED_REV c4', C.CITED_REV === 'c4');
  console.log(fails ? `\nCITED SELFTEST FAIL (${fails})` : '\nCITED SELFTEST PASS');
  process.exit(fails ? 1 : 0);
})();
