/*  OPTION 1 OF THE KIND 1 PLAN: THE WRITER CITES A NUMBERED PAGE FACT FOR EVERY SENTENCE (2026-10-24).
 *
 *  Area 9 measured that detection cannot close kind 1: at the best per-sentence judge we have (about
 *  70%), nine pieces in ten would still ship an invented fact. So the writer is given nothing but a
 *  numbered list of what the page shows, must tag every sentence with the facts it rests on, and code
 *  deletes any sentence that does not hold to them. Decided with Lucas, 2026-10-24:
 *    - THE FACT LIST is built by code from the request the page sends plus the honour and tag copy in
 *      vv-core.js: the figures and dimensions each card draws, each honour and tag with the copy the
 *      reader sees, and (for a comparison) the page's own result line. THE CHRONICLE IS LEFT OUT: its
 *      figures repeat the card's and its history is unchecked. No rendered page is needed, so a server
 *      can build it.
 *    - THE DROP RULE, CODE FIRST: a sentence is deleted when it cites nothing or an id that does not
 *      exist; when a paragraph about one player cites none of his facts; when it states a number not
 *      in the facts it cites (or a sum or difference of two of them); when it names a measure no card
 *      prints (duels, dribbles, penalties); when it crowns a player without citing the result, or
 *      against it. ALL FILLER GOES: a sentence with nothing to cite is deleted, no exemption.
 *    - THE NARROW CHECK, then: Sonnet sees only the sentence and the facts it cites and answers whether
 *      everything it states follows from them, and whether it declares an overall winner. A sentence
 *      that fails is DELETED, never rewritten (a rewrite is a new chance to invent). WHAT THIS CHECK
 *      MISSES STILL SHIPS, AND THAT IS THE HOLE THAT REMAINS; the fresh sample measures it.
 *    - A PIECE IS REJECTED WHOLE when its headline is deleted, when any paragraph (a verdict field, the
 *      scout, a stanza) falls below two sentences, or when more than a quarter of its sentences go. It
 *      gets ONE regeneration; if that is rejected too, the outcome is NO PROSE.
 *    - NO PROSE IS THE DEFAULT, NOT AN ERROR. runPiece returns { prose: null, outcome: 'no-prose' } as an
 *      ordinary result, which the page renders as today's "No written opinion here, by choice." On day
 *      one most pieces may land there, and the site must look deliberate while that is true.
 *    - KEEPERS ARE NOT COVERED YET: a keeper card or a pair with a keeper goes straight to no prose.
 *  Nothing here is wired into api/analyse.js; prose stays off (VV_PROSE) until a fresh sample passes.
 */
const V = require('../../vv-core.js');
const PC = require('./prose_checks.js');

const WRITER_MODEL = 'claude-sonnet-4-6';   // the endpoint's writer
const CHECK_MODEL = 'claude-sonnet-4-6';    // the narrow check (Lucas, 2026-10-24: Sonnet)
const REJECT_SHARE = 0.25;

/* ---------- THE FACT LIST ---------- */
const LABEL_TO_TYPE = {};
for (const [k, m] of Object.entries(V.HONOUR_META)) LABEL_TO_TYPE[m.label] = k;
function honourFact(label, wonBy) {
  const type = LABEL_TO_TYPE[label];
  const line = type && V.HONOUR_ONELINER[type];
  const who = wonBy === 'team' ? 'won with his team' : 'won by him';
  return `Honour this season: ${label}, ${who}` + (line ? `. The card says: "${line}"` : '');
}
function ord(n) { n = +n; const t = n % 100, u = n % 10; return n + (t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'); }
function tagFact(tag, means) { return `Tag: ${tag}. The card says: "${means}"`; }
/*  THE BAND ONLY WHEN THE PAGE PRINTS IT (Lucas, 2026-10-24). The first fresh-sample run shipped one
    piece, Rodri v Rice, and the sentence judge's only two flags were "World Class band": the fact list
    had told the writer the band for every score, and the rendered Compare and both cards print no
    band word at all for World Class. The card face prints a prestige chip (renderPrestige) for
    Generational and Iconic ONLY (prestigeFor), and the pages print no other band name anywhere. So
    the fact carries the band exactly when prestigeFor says the page prints it, and in the word the
    page prints. That was the 2026-10-22 rule, "the writer must not state a number the reader cannot
    check", broken inside the thing enforcing it. The request's own band (P.band, "(X band)" on the
    Player line) is ignored here for the same reason: it is sent for every score.  */
function scoreFact(name, rt) {
  const pr = V.prestigeFor(V.bandFor(+rt));
  return `${name}'s VV Score: ${rt}` + (pr ? `, and the card marks the season ${pr}` : '');
}

// A comparison: the two "Player A/B:" lines Compare sends, and its rendered result line.
function sideFacts(line, P) {
  const F = [];
  const g = re => { const m = line.match(re); return m ? m[1] : null; };
  const surname = g(/^Player [AB]: ([^(]+?) \(/), short = g(/^Player [AB]: [^(]+\(([^)]+)\)/);
  const season = g(/\), (\d\d\/\d\d), /), club = g(/\d\d\/\d\d, ([^\[]+?) \[/), league = g(/\[([^\]]+)\]/);
  const pos = g(/pos ([A-Za-z]+)/), age = g(/, age (\d+)/), vv = g(/VV (\d+)/);
  const goals = g(/, (\d+) goals \d+ assists/), assists = g(/ goals (\d+) assists/);
  const min = g(/(\d+) min \//), apps = g(/min \/ (\d+) apps/);
  F.push(`${surname} (${short}), ${season} season, ${club}, ${league}, ${pos}, age ${age}`);
  if (vv) F.push(scoreFact(surname, vv));
  F.push(`${surname}: ${goals} goals and ${assists} assists in ${min} minutes over ${apps} appearances`);
  for (const d of ['Goal Threat', 'Creation', 'Progression', 'Defensive']) {
    const x = g(new RegExp(d + ' (\\d+)'));
    if (x != null) F.push(`${surname}'s ${d}: ${ord(x)} percentile among ${pos} seasons`);
  }
  const rel = g(/Reliability (\d+)% of a full season/);
  if (rel != null) F.push(`${surname}'s Reliability: he played ${rel}% of a full season`);
  const shots = g(/goals \d+ of (\d+) shots/);
  if (shots != null) F.push(`${surname}: ${goals} goals from ${shots} shots`);
  const kp = g(/key passes\/90 ([\d.]+)/);
  if (kp != null) F.push(`${surname}: ${kp} key passes per 90 minutes`);
  const H = g(/HONOURS: (.*?); (?:CAREER STAGE|TAG MEANINGS|\d+ min)/) || '';
  for (const h of (H ? H.split(/; (?=[A-Z])/) : [])) {
    const m = h.match(/^(.+?) \d{4} \((player|team)\)/);
    if (m) F.push(honourFact(m[1], m[2]));
  }
  const T = g(/TAG MEANINGS: (.*?); \d+ min/) || '';
  for (const t of (T ? T.split(' | ') : [])) { const i = t.indexOf(' = '); if (i > 0) F.push(tagFact(t.slice(0, i), t.slice(i + 3))); }
  if (/pre-2015|ONLY appearances/i.test(line)) F.push(`${surname}'s season is from before 2015: only appearances, minutes, goals and assists were recorded; every other measure is absent, not zero`);
  return { surname, facts: F, keeper: /pos GK\b/.test(line) };
}
function verdictFacts(ev) {
  const lines = ev.evidence.split('\n').filter(l => /^Player [AB]:/.test(l));
  if (lines.length !== 2) throw new Error('expected two player lines');
  const a = sideFacts(lines[0]), b = sideFacts(lines[1]);
  const result = (String(ev.page && ev.page.compare || '').match(/The Verdict\n([^\n]+)/) || [])[1];
  if (!result) throw new Error('no result line on the rendered Compare page');
  const list = [];
  a.facts.forEach((f, i) => list.push({ id: 'A' + (i + 1), side: 'A', text: f }));
  b.facts.forEach((f, i) => list.push({ id: 'B' + (i + 1), side: 'B', text: f }));
  list.push({ id: 'P1', side: null, text: `The page's own result: "${result}"` });
  const winner = /cannot separate|will not separate|Level on the Index/i.test(result) ? null
    : result.includes(a.surname) ? 'A' : result.includes(b.surname) ? 'B' : null;
  return { type: 'verdict', names: { A: a.surname, B: b.surname }, facts: list, result, winner, keeper: a.keeper || b.keeper };
}
// A card: the structured card the page sends for its notes.
function notesFacts(player) {
  const P = player, F = [], nm = P.player_name;
  F.push(`${nm}, ${P.season} season, ${P.club}, ${P.league}, ${P.position}, age ${P.age}`);
  if (P.rt != null) F.push(scoreFact(nm, P.rt));   // P.band is ignored on purpose: see scoreFact
  F.push(`${nm}: ${P.goals} goals and ${P.assists} assists in ${P.minutes} minutes over ${P.appearances} appearances`);
  const vals = (P.dimensions && P.dimensions.values) || {}, NAMES = { goalThreat: 'Goal Threat', creation: 'Creation', progression: 'Progression', defensive: 'Defensive' };
  for (const [k, x] of Object.entries(vals)) {
    if (x.percentile_in_pool != null) F.push(`${nm}'s ${NAMES[k] || k}: ${ord(x.percentile_in_pool)} percentile among ${P.pool} seasons`);
    if (x.pct_of_full_season != null) F.push(`${nm}'s Reliability: he played ${x.pct_of_full_season}% of a full season`);
  }
  if (P.shots_total != null) F.push(`${nm}: ${P.goals} goals from ${P.shots_total} shots`);
  if (P.key_passes_per90 != null) F.push(`${nm}: ${P.key_passes_per90} key passes per 90 minutes`);
  for (const h of (P.honours || [])) F.push(honourFact(h.honour, h.won_by));
  for (const t of (P.tag_glosses || [])) F.push(tagFact(t.tag, t.means));
  if (/^pre-2015/.test(P.era || '')) F.push(`${nm}'s season is from before 2015: only appearances, minutes, goals and assists were recorded; every other measure is absent, not zero`);
  return { type: 'notes', names: { A: nm }, facts: F.map((t, i) => ({ id: 'A' + (i + 1), side: 'A', text: t })), result: null, winner: null, keeper: !!P.keeper || P.position === 'GK' };
}

/* ---------- THE WRITER ---------- */
const BANNED_CROWNS = '"edges it", "shades it", "just ahead", "the better of the two", "takes it", "wins the argument", "if pushed", "on balance", "tips it", "settles this"';
const WRITER_SYSTEM = `You are the VVonderXI voice: thirty years of watching football, precise and warm. You write ONLY from a numbered list of FACTS, which is everything the reader can see on the page.

EVERY SENTENCE CITES THE FACTS IT RESTS ON, BY ID. The platform deletes, before anyone reads it:
- any sentence that cites nothing, or an id that is not in the list;
- any sentence that states anything its cited facts do not contain;
- any number that is not in the cited facts, or a plain sum or difference of two of them, or a count of the cited facts of one kind ("four honours", citing four honour facts).
If too much of a piece is deleted, the whole piece is thrown away and the reader sees no writing at all. So write fewer, truer sentences. A sentence with nothing to cite has no place: no scene-setting, no linking lines, no philosophy.

YOU MAY: restate a fact in your own words; compare cited facts ("the higher Creation", "eleven more goals"); give an opinion or judgement that rests only on cited facts ("the more complete season", citing the dimensions it compares); use the meaning the card itself gives an honour or tag, as quoted in the facts.

YOU MAY NOT state anything the facts do not hold, however true of football: transfers, arrivals or debuts; other seasons, earlier or later clubs, career history; records and firsts; title races, league positions, trophies or awards not in the facts, or a fuller name for an award than the facts give; how strong or difficult a league, team, club or opponent was; managers, team-mates, matches, dates or moments; how a player plays, moves or looks.

CROWNS. A sentence that names, implies or leans towards an overall winner of the comparison, the better season taken whole, is a crown. A lead in one measure, an honour or tag the other does not hold, or a higher figure stated as a figure is NOT a crown and may be written on any pair. ${'{CROWN_RULE}'} A crown must cite P1.

FORMAT. Reply with JSON only, no markdown. Each field is a list of sentences, each {"s": "the sentence", "cite": ["A3","B2"]}; add "new_paragraph": true to start a new paragraph inside a field.
{FORMAT}

Never use em or en dashes; use a spaced comma. British spelling.`;
const VERDICT_FORMAT = `{"who": [one sentence, a headline of at most 14 words],
 "p1": [3 to 4 sentences about Player A, citing A facts],
 "p2": [3 to 4 sentences about Player B, citing B facts],
 "h2h": [2 to 3 sentences setting the two against each other],
 "verdict": [2 to 3 sentences, the last one quotable]}`;
const NOTES_FORMAT = `{"glance": [one sentence, the essence of the season],
 "scout": [2 to 4 sentences: where the season sits on its own figures, and what it would cost to deny it],
 "notes": [[2 to 3 sentences], [2 to 3], [2 to 3], [2 to 3]]}   four stanzas: the essence, the honours and tags, the figures as evidence, a closing line`;
function writerSystem(pack) {
  const rule = pack.type === 'notes' ? 'This is a single season: there is no comparison and no crown.'
    : pack.winner ? `P1 names ${pack.names[pack.winner]} as the winner: you may name ${pack.names[pack.winner]}, and only ${pack.names[pack.winner]}, as the winner, as clearly as P1 does.`
    : `P1 says the Index cannot separate these two: NO sentence may name, imply or lean towards a winner. Banned outright: ${BANNED_CROWNS}, and every near variant. Say what each season holds that the other does not.`;
  return WRITER_SYSTEM.replace('${\'{CROWN_RULE}\'}', rule).replace('{CROWN_RULE}', rule).replace('{FORMAT}', pack.type === 'notes' ? NOTES_FORMAT : VERDICT_FORMAT);
}
function factsText(pack) {
  const head = pack.type === 'verdict' ? `Player A is ${pack.names.A}. Player B is ${pack.names.B}.\n\n` : '';
  return head + 'FACTS:\n' + pack.facts.map(f => f.id + '  ' + f.text).join('\n');
}

async function callModel(model, system, user, max_tokens, temperature) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const body = { model, max_tokens, system, messages: [{ role: 'user', content: user }] };
      if (temperature != null) body.temperature = temperature;
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body) });
      if (r.status === 429 || r.status >= 500) { await new Promise(x => setTimeout(x, 2000 * (attempt + 1))); continue; }
      const d = await r.json();
      if (!r.ok) return { ok: false, error: 'upstream ' + r.status + ' ' + JSON.stringify(d).slice(0, 200) };
      const txt = (d.content && d.content[0] && d.content[0].text) || '';
      const st = txt.indexOf('{'); let dep = 0, end = -1, q = false;
      for (let i = st; st >= 0 && i < txt.length; i++) { const c = txt[i]; if (c === '"' && txt[i - 1] !== '\\') q = !q; else if (!q && c === '{') dep++; else if (!q && c === '}' && --dep === 0) { end = i; break; } }
      if (end < 0) return { ok: false, error: 'no complete JSON (stop: ' + d.stop_reason + ')', usage: d.usage };
      return { ok: true, json: JSON.parse(txt.slice(st, end + 1)), usage: d.usage };
    } catch (e) { if (attempt === 4) return { ok: false, error: 'threw: ' + e.message }; }
  }
  return { ok: false, error: 'upstream busy after 5 tries' };
}

/* ---------- THE NARROW CHECK ---------- */
const NARROW_SYSTEM = `You check ONE sentence of football writing against the FACTS it cites, and nothing else. You do not know anything about football beyond these facts; treat anything else as unknown.

1. supported: does everything the sentence STATES follow from the cited facts? Opinion, judgement, comparison or emphasis resting only on the cited facts is fine ("the more complete season", "eleven more goals"). A fact stretched beyond what the cited facts say is NOT supported: "record-breaking" from "the league's top scorer"; a fuller or different award name than the fact gives; how hard a league or opponent was; anything about other seasons, clubs, matches, dates, careers or how a player plays.
2. crown: does the sentence declare one player the OVERALL winner of the comparison, the better season taken whole? "A", "B" or "none". Narrow or soft overall wins count ("edges it", "by the thinnest of margins", "the harder thing to have done", "the more complete season"). NOT a crown, answer "none": a lead in one measure ("the higher Creation", "a clear lead in that pillar"), an honour or tag one holds and the other does not, a band or a score stated as a figure, a strength or weakness, a sentence about one player's season alone. Those are "none" even when they favour one side plainly.

Reply with JSON only: {"supported": true or false, "unsupported": "the exact words that go beyond the facts, or empty", "crown": "A" or "B" or "none"}`;
async function narrowCheck(pack, sentence, cites) {
  const facts = pack.facts.filter(f => cites.includes(f.id)).map(f => f.id + '  ' + f.text).join('\n');
  const head = pack.type === 'verdict' ? `Player A is ${pack.names.A}. Player B is ${pack.names.B}.\n\n` : `This is a single season of ${pack.names.A}; there is no comparison, so crown is "none".\n\n`;
  const r = await callModel(CHECK_MODEL, NARROW_SYSTEM, head + 'CITED FACTS:\n' + facts + '\n\nTHE SENTENCE:\n' + sentence, 400, 0);
  if (!r.ok) return r;
  return { ok: true, supported: r.json.supported === true, unsupported: String(r.json.unsupported || ''), crown: ['A', 'B'].includes(r.json.crown) ? r.json.crown : 'none', usage: r.usage };
}

/* ---------- THE DROP RULE (code) ---------- */
/*  THE CODE RULE DECIDES A CROWN; THE MODEL'S READING IS ADVISORY (Lucas, 2026-10-24). The first
    fresh-sample run deleted 46 sentences as crowns and, read one by one, almost none declared an
    overall winner: "Rice holds a clear lead in that pillar", "Rodri holds the Ballon d'Or, absent from
    Rice's card", "Immobile's VV Score of 93 places him in the Iconic band". The narrow check called any
    sentence that favours one side a crown. It is the third time the model's crown reading has been the
    unreliable half (area 9: the 10-23 "edges" misses, the 10-24 re-run that moved which crowns it saw,
    and this). So: a crown is an overall-winner sentence and nothing else (the narrow check's question
    now says so, with the non-examples), AND code only acts on the reading where the sentence can be a
    comparison at all: it cites a fact from both sides or P1, or it names the other player. A sentence
    about one season alone, citing one side, cannot crown and is never deleted as one, whatever the
    model said. The deletion itself was always code's: against the page's result, never the model's.  */
function engagesBothSides(pack, u) {
  if (pack.type !== 'verdict') return false;
  const sides = new Set(u.cite.map(c => c[0]));
  if (sides.has('P') || (sides.has('A') && sides.has('B'))) return true;
  const other = sides.has('A') ? pack.names.B : sides.has('B') ? pack.names.A : null;
  return other ? new RegExp('\\b' + other.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(u.s) : true;
}
const MEASURE = /\b(duels?|dribbl\w*|penalt(?:y|ies)(?! area))\b/i;
/*  A COUNT OF THE CITED FACTS OF ONE KIND IS A NUMBER THE READER CAN CHECK (Lucas, 2026-10-24).
    The first fresh-sample run deleted 40 sentences for a number not in the cited facts, and about
    half were counts of the facts the sentence itself cited: "four honours on a single card" citing
    four honour facts, "two Golden Boot seasons", "six identical tags", "two World Class CDMs". A
    reader checks a count by counting on the page. So the allowed values also include, for each kind
    of fact cited (honour, tag, dimension, identity, score, and so on), how many of that kind are
    cited in all and how many per side. Everything else stays strict: the same run's rule caught
    "seven percentile points higher" for a gap of 11, an uncited 3221 minutes, an age no fact holds,
    and "six goals were left in matches he did not start", and it keeps catching them.  */
const KINDS = [['result', /^The page's own result/], ['honour', /^Honour this season/], ['tag', /^Tag: /], ['score', /'s VV Score: /],
  ['dimension', /'s (?:Goal Threat|Creation|Progression|Defensive): /], ['reliability', /'s Reliability: /], ['shots', / goals from \d+ shots$/],
  ['keypasses', / key passes per 90 minutes$/], ['totals', / goals and \d+ assists in /], ['era', /before 2015/], ['identity', /, age \d+$/]];
function factKind(text) { const k = KINDS.find(([, re]) => re.test(text)); return k ? k[0] : 'other'; }
function numbersOk(sentence, citedText, citedFacts) {
  const vals = new Set();
  for (const x of PC.extractNumbers(citedText)) vals.add(x.value);
  (String(citedText).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).forEach(n => vals.add(+n));
  const base = [...vals];
  for (const a of base) for (const b of base) { vals.add(Math.abs(a - b)); vals.add(a + b); }
  const counts = {};
  for (const f of citedFacts || []) { const k = factKind(f.text); counts[k] = (counts[k] || 0) + 1; const ks = k + '/' + (f.side || 'P'); counts[ks] = (counts[ks] || 0) + 1; }
  Object.values(counts).forEach(c => vals.add(c));
  const bad = PC.extractNumbers(sentence).filter(x => !vals.has(x.value)).map(x => x.raw);
  return bad;
}
async function judgeDraft(pack, draft, narrow = narrowCheck) {
  const ids = new Set(pack.facts.map(f => f.id));
  const fields = pack.type === 'verdict' ? ['who', 'p1', 'p2', 'h2h', 'verdict'] : ['glance', 'scout', 'notes'];
  const units = [];   // { field, para, s, cite, new_paragraph }
  for (const f of fields) {
    const v = draft[f];
    if (f === 'notes') (Array.isArray(v) ? v : []).forEach((st, k) => (Array.isArray(st) ? st : []).forEach(x => units.push({ field: f, para: 'notes' + (k + 1), ...x })));
    else (Array.isArray(v) ? v : []).forEach(x => units.push({ field: f, para: f, ...x }));
  }
  const usage = [];
  await Promise.all(units.map(async u => {
    u.s = String(u.s || '').trim(); u.cite = Array.isArray(u.cite) ? u.cite.map(String) : [];
    const why = [];
    if (!u.s) why.push('empty');
    if (!u.cite.length) why.push('cites nothing');
    const unknown = u.cite.filter(c => !ids.has(c));
    if (unknown.length) why.push('cites ids that do not exist: ' + unknown.join(', '));
    if (pack.type === 'verdict' && u.field === 'p1' && !u.cite.some(c => c[0] === 'A')) why.push('a Player A paragraph citing no A fact');
    if (pack.type === 'verdict' && u.field === 'p2' && !u.cite.some(c => c[0] === 'B')) why.push('a Player B paragraph citing no B fact');
    const citedFacts = pack.facts.filter(f => u.cite.includes(f.id)), citedText = citedFacts.map(f => f.text).join('\n');
    const bad = numbersOk(u.s, citedText, citedFacts);
    if (bad.length) why.push('numbers not in the cited facts: ' + bad.join(', '));
    if (MEASURE.test(u.s) && !MEASURE.test(citedText)) why.push('names a measure no card prints');
    u.code = why.slice();
    if (!why.length) {
      const n = await narrow(pack, u.s, u.cite);
      if (!n.ok) { why.push('narrow check failed to answer: ' + n.error); }
      else {
        usage.push(n.usage); u.narrow = { supported: n.supported, unsupported: n.unsupported, crown: n.crown };
        if (!n.supported) why.push('narrow check: not supported by its cited facts: ' + n.unsupported);
        if (n.crown !== 'none' && engagesBothSides(pack, u)) {
          if (!pack.winner) why.push('a crown where the page cannot separate the pair');
          else if (n.crown !== pack.winner) why.push('a crown for the side the page does not name');
          else if (!u.cite.includes('P1')) why.push('a crown that does not cite the result');
        }
      }
    }
    u.kept = !why.length; u.why = why;
  }));
  // rejection, whole piece
  const reasons = [];
  const head = pack.type === 'verdict' ? 'who' : 'glance';
  if (!units.some(u => u.field === head && u.kept)) reasons.push('the headline was deleted');
  const paras = [...new Set(units.filter(u => u.para !== head).map(u => u.para))];
  const expected = pack.type === 'verdict' ? ['p1', 'p2', 'h2h', 'verdict'] : ['scout', 'notes1', 'notes2', 'notes3', 'notes4'];
  for (const p of expected) { const k = units.filter(u => u.para === p && u.kept).length; if (k < 2) reasons.push(`${p} has ${k} sentence${k === 1 ? '' : 's'} left`); }
  const dropped = units.filter(u => !u.kept).length;
  if (units.length && dropped / units.length > REJECT_SHARE) reasons.push(`${dropped} of ${units.length} sentences deleted, more than a quarter`);
  if (!units.length) reasons.push('no sentences');
  return { units, rejected: reasons.length > 0, reasons, dropped, total: units.length, usage, paras };
}
function assemble(pack, units) {
  const join = list => { let out = ''; list.forEach((u, i) => { out += (i === 0 ? '' : (u.new_paragraph ? '\n\n' : ' ')) + u.s; }); return out; };
  const kept = units.filter(u => u.kept);
  if (pack.type === 'verdict') { const o = {}; for (const f of ['who', 'p1', 'p2', 'h2h', 'verdict']) o[f] = join(kept.filter(u => u.field === f)); return o; }
  return { glance: join(kept.filter(u => u.field === 'glance')), scout: join(kept.filter(u => u.field === 'scout')), notes: [1, 2, 3, 4].map(k => join(kept.filter(u => u.para === 'notes' + k))) };
}

/*  ONE PIECE: write, judge, at most one regeneration, then prose or NO PROSE (the default).  */
async function runPiece(pack) {
  const attempts = [], usage = [];
  if (pack.keeper) return { prose: null, outcome: 'no-prose', why: 'keepers are not covered by the cited writer yet', attempts };
  for (let a = 1; a <= 2; a++) {
    const w = await callModel(WRITER_MODEL, writerSystem(pack), factsText(pack), 2500);
    if (w.usage) usage.push({ model: WRITER_MODEL, ...w.usage });
    if (!w.ok) { attempts.push({ attempt: a, error: w.error }); continue; }
    const j = await judgeDraft(pack, w.json);
    j.usage.forEach(u => usage.push({ model: CHECK_MODEL, ...u }));
    attempts.push({ attempt: a, draft: w.json, units: j.units, rejected: j.rejected, reasons: j.reasons, dropped: j.dropped, total: j.total });
    if (!j.rejected) return { prose: assemble(pack, j.units), outcome: a === 1 ? 'shipped' : 'shipped-on-regeneration', attempts, usage };
  }
  return { prose: null, outcome: 'no-prose', why: 'rejected twice', attempts, usage };
}

module.exports = { verdictFacts, notesFacts, scoreFact, writerSystem, factsText, runPiece, judgeDraft, numbersOk, factKind, engagesBothSides, assemble, WRITER_MODEL, CHECK_MODEL, NARROW_SYSTEM };
