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
/*  A CABINET LINE IS WHAT HE HAD WON BY THIS SEASON, NOT THIS SEASON'S HONOUR (Lucas, 2026-10-24: "add Cabinet
    lines to the fact list rather than restricting 'only' claims; giving the writer the page's own content is
    the move that keeps working"). The year is the one the card prints beside the shelf.  */
function cabinetFact(name, label, year, wonBy) {
  return `${name}'s Cabinet, what he had won by this season: ${label}${year ? ' (' + year + ')' : ''}, ${wonBy === 'team' ? 'won with his team' : 'won by him'}`;
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
/*  RELIABILITY AND KEY PASSES AS THE CARD PRINTS THEM (Lucas, 2026-10-24; area 9, run 2). The fact said
    "he played 89% of a full season" and the card prints "Reliability 89" under ATTRIBUTE / 100 with no
    such gloss; Sonnet flagged every one against the page. Key passes per 90 came at one decimal and the
    card prints two (toFixed(2)), so the fact prints two as well. Same rule as scoreFact: a fact states
    what the reader can find on the page, in the form the page gives it.  */
function reliabilityFact(name, v) { return `${name}'s Reliability: ${v} out of 100`; }
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
  const rel = g(/Reliability (\d+)/);
  if (rel != null) F.push(reliabilityFact(surname, rel));
  const shots = g(/goals \d+ of (\d+) shots/);
  if (shots != null) F.push(`${surname}: ${goals} goals from ${shots} shots`);
  const kp = g(/key passes\/90 ([\d.]+)/);
  if (kp != null) F.push(`${surname}: ${Number(kp).toFixed(2)} key passes per 90 minutes`);
  const H = g(/HONOURS: (.*?); (?:CABINET|CAREER STAGE|TAG MEANINGS|\d+ min)/) || '';
  for (const h of (H ? H.split(/; (?=[A-Z])/) : [])) {
    const m = h.match(/^(.+?) \d{4} \((player|team)\)/);
    if (m) F.push(honourFact(m[1], m[2]));
  }
  const CB = g(/CABINET: (.*?); (?:CAREER STAGE|TAG MEANINGS|\d+ min)/) || '';
  for (const h of (CB ? CB.split(/; (?=[A-Z])/) : [])) {
    const m = h.match(/^(.+?)(?: (\d{4}))? \((player|team)\)$/);
    if (m) F.push(cabinetFact(surname, m[1], m[2], m[3]));
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
    if (x.pct_of_full_season != null) F.push(reliabilityFact(nm, x.pct_of_full_season));
  }
  if (P.shots_total != null) F.push(`${nm}: ${P.goals} goals from ${P.shots_total} shots`);
  if (P.key_passes_per90 != null) F.push(`${nm}: ${Number(P.key_passes_per90).toFixed(2)} key passes per 90 minutes`);
  for (const h of (P.honours || [])) F.push(honourFact(h.honour, h.won_by));
  for (const h of (P.cabinet || [])) F.push(cabinetFact(nm, h.honour, h.year, h.won_by));
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
- any number that is not in the cited facts, or a plain sum or difference of two of them, or a count that equals how many facts of one kind a player's card holds in the list ("four honours", when the list holds four honour facts for him; "two honours he does not", when one holds four and the other two). A count of dimensions or attributes may be any number up to the total the card prints ("three dimensions in the 90s" is fine; the card prints four dimensions and Reliability, five attributes); a count of tags or honours must be the card's whole total, never a subset.

THE HEADLINE STATES THE RESULT AND ONE CITED FACT, NOTHING MORE. No image, no flourish, no "a season for the ages", no "a season apart in class": the result as P1 gives it, and one figure or one honour, in plain words. The glance line on a card is the same: one fact, plainly. THE HEADLINE NAMES THE WINNER when P1 names one; a headline that does not is thrown away with the piece.
If too much of a piece is deleted, the whole piece is thrown away and the reader sees no writing at all. So write fewer, truer sentences. A sentence with nothing to cite has no place: no scene-setting, no linking lines, no philosophy.

A SENTENCE THAT NAMES A CLUB, A LEAGUE OR AN AGE MUST CITE THAT PLAYER'S FIRST FACT (A1 or B1), which is where they are. A SENTENCE THAT SAYS "HONOUR" MUST CITE AN HONOUR FACT OR A CABINET FACT, AND ONE THAT SAYS "TAG" A TAG FACT: Peak, The Standard and the rest are tags, never honours. A CABINET FACT is what he had won BY this season, with its year; it is not this season's honour, so say "by this season" or "in his cabinet", and never write that a player holds no honour when his Cabinet facts hold one.

YOU MAY: restate a fact in your own words; compare cited facts ("the higher Creation", "eleven more goals"); give an opinion or judgement that rests only on cited facts ("the more complete season", citing the dimensions it compares); use the meaning the card itself gives an honour or tag, as quoted in the facts.

YOU MAY NOT state anything the facts do not hold, however true of football: transfers, arrivals or debuts; other seasons, earlier or later clubs, career history; records and firsts; title races, league positions, trophies or awards not in the facts, or a fuller name for an award than the facts give; how strong or difficult a league, team, club or opponent was; managers, team-mates, matches, dates or moments; how a player plays, moves or looks.

CROWNS. A sentence that names, implies or leans towards an overall winner of the comparison, the better season taken whole, is a crown. A lead in one measure, an honour or tag the other does not hold, or a higher figure stated as a figure is NOT a crown and may be written on any pair. ${'{CROWN_RULE}'} A crown must cite P1.

FORMAT. Reply with JSON only, no markdown. Each field is a list of sentences, each {"s": "the sentence", "cite": ["A3","B2"]}; add "new_paragraph": true to start a new paragraph inside a field.
{FORMAT}

Never use em or en dashes; use a spaced comma. British spelling.`;
/*  RAISE THE ASK, DO NOT LOWER THE FLOOR (Lucas, 2026-10-24, after sample 2 run 2 and sample 1 run 3). A
    paragraph asked for 2 to 3 sentences and given 2 dies on one deletion; asked for 4 to 5 it survives.
    Eleven of twelve sample 2 attempts and all four notes pieces were rejected for a paragraph or stanza
    under two. The minimum of two is unchanged.  */
/*  THE HEADLINE IS AN OBJECT LIKE EVERY OTHER SENTENCE (2026-10-24, the four final runs). "[one sentence, a
    headline]" read as a bare string, and on three tie pairs in both runs the writer returned
    ["The Index cannot split Rodri and Rice..."], which parsed as an empty sentence citing nothing: the
    headline was deleted and the piece rejected, five of sample 1's fourteen no-prose outcomes. The spec now
    shows the object, and judgeDraft reads a bare string as a sentence with no citation rather than as empty.  */
/*  THE HEADLINE INSTRUCTION (Lucas, 2026-10-24, after the six runs): every regeneration in six runs followed a
    headline the narrow check deleted for a flourish ("a season for the ages", "a season apart in class").
    The headline states the result and one cited fact, nothing more; the glance line the same.  */
const VERDICT_FORMAT = `{"who": [{"s": "one sentence, a headline of at most 14 words: the result and one cited fact, nothing more", "cite": ["P1", "A2", "B2"]}],
 "p1": [4 to 5 sentences about Player A, citing A facts],
 "p2": [4 to 5 sentences about Player B, citing B facts],
 "h2h": [4 to 5 sentences setting the two against each other],
 "verdict": [4 to 5 sentences, the last one quotable]}`;
/*  THE NOTES FORM, FIXED; THE SHARE RULE KEPT (Lucas, 2026-10-24, after the six runs: notes 2 of 8, every
    rejection the share rule). "What it would cost to deny it" asked for judgement, and judgement has no
    fact id: the narrow check deleted about a third of every notes piece. The share rule is not relaxed,
    it is what stops a gutted piece shipping and notes need it more than verdicts. The scout and the
    closing stanza now ask for figures and the card's own copy only.  */
const NOTES_FORMAT = `{"glance": [{"s": "one sentence, one fact of the season, plainly", "cite": ["A2", "A3"]}],
 "scout": [4 to 5 sentences, FIGURES AND CARD COPY ONLY: each sentence states a figure from the facts or quotes the meaning the card gives an honour or tag; no judgement, no verdict on the season, nothing a fact id cannot carry],
 "notes": [[4 to 5 sentences], [4 to 5], [4 to 5], [3 to 4]]}   four stanzas: the figures that define the season; the honours and tags, in the card's own words; the dimensions and Reliability as evidence; a closing stanza of 3 to 4 sentences that is FIGURES AND CARD COPY ONLY, restating the two or three figures the season rests on, no judgement and no flourish`;
function writerSystem(pack) {
  const rule = pack.type === 'notes' ? 'This is a single season: there is no comparison and no crown.'
    : pack.winner ? `P1 names ${pack.names[pack.winner]} as the winner: you may name ${pack.names[pack.winner]}, and only ${pack.names[pack.winner]}, as the winner, as clearly as P1 does. The headline MUST name ${pack.names[pack.winner]}.`
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
/*  THE NARROW CHECK IS TOLD THE PAGE'S COUNTS (2026-10-24, sample 2). "Three honours sit on his card" cited
    two of Ronaldo's three honour facts: the code rule allowed three (the page's total) and the narrow check,
    seeing two facts, deleted it. One line of totals per side, built by code, keeps the two rules in step.  */
function countsLine(pack) {
  const per = {};
  for (const s of Object.keys(pack.names || {})) per[s] = { honour: 0, tag: 0 };   // a side with nothing still gets its line
  for (const f of pack.facts) { const k = factKind(f.text); if (k !== 'honour' && k !== 'tag') continue; const s = f.side || 'P'; per[s] = per[s] || { honour: 0, tag: 0 }; per[s][k]++; }
  return Object.entries(per).map(([s, c]) => `${pack.names[s] || s}'s card holds ${c.honour} honour${c.honour === 1 ? '' : 's'} and ${c.tag} tag${c.tag === 1 ? '' : 's'} in all (a count of these is correct even when the sentence cites only some)`).join('. ') + '.';
}
async function narrowCheck(pack, sentence, cites) {
  const facts = pack.facts.filter(f => cites.includes(f.id)).map(f => f.id + '  ' + f.text).join('\n');
  const head = (pack.type === 'verdict' ? `Player A is ${pack.names.A}. Player B is ${pack.names.B}.\n` : `This is a single season of ${pack.names.A}; there is no comparison, so crown is "none".\n`) + countsLine(pack) + '\n\n';
  const r = await callModel(CHECK_MODEL, NARROW_SYSTEM, head + 'CITED FACTS:\n' + facts + '\n\nTHE SENTENCE:\n' + sentence, 400, 0);
  if (!r.ok) return r;
  return { ok: true, supported: r.json.supported === true, unsupported: String(r.json.unsupported || ''), crown: ['A', 'B'].includes(r.json.crown) ? r.json.crown : 'none', usage: r.usage };
}

/* ---------- THE DROP RULE (code) ---------- */
function identityFacts(pack) {
  return pack.facts.filter(f => /, age \d+$/.test(f.text)).map(f => {
    const m = f.text.match(/^(.*?), \d\d\/\d\d season, (.*?), (.*?), ([A-Za-z]+), age (\d+)$/);
    return m ? { id: f.id, side: f.side, club: m[2], league: m[3], age: m[5] } : { id: f.id, side: f.side };
  });
}
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
/*  A NAME WITH A DIACRITIC HAS NO ASCII WORD BOUNDARY (2026-10-24, sample 2). \bIbrahimović\b never
    matches: "ć" is not \w, so the boundary after it is not there. Rule B rejected "Ibrahimović wins it
    outright" twice for not naming him. Letters and digits in any script are the boundary instead.  */
function nameRe(name) { return new RegExp('(?<![\\p{L}\\p{N}])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'iu'); }
function engagesBothSides(pack, u) {
  if (pack.type !== 'verdict') return false;
  const sides = new Set(u.cite.map(c => c[0]));
  if (sides.has('P') || (sides.has('A') && sides.has('B'))) return true;
  const other = sides.has('A') ? pack.names.B : sides.has('B') ? pack.names.A : null;
  return other ? nameRe(other).test(u.s) : true;
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
const KINDS = [['result', /^The page's own result/], ['honour', /^Honour this season/], ['cabinet', /'s Cabinet, what he had won by this season: /], ['tag', /^Tag: /], ['score', /'s VV Score: /],
  ['dimension', /'s (?:Goal Threat|Creation|Progression|Defensive): /], ['reliability', /'s Reliability: /], ['shots', / goals from \d+ shots$/],
  ['keypasses', / key passes per 90 minutes$/], ['totals', / goals and \d+ assists in /], ['era', /before 2015/], ['identity', /, age \d+$/]];
function factKind(text) { const k = KINDS.find(([, re]) => re.test(text)); return k ? k[0] : 'other'; }
function numbersOk(sentence, citedText, citedFacts, allFacts) {
  const vals = new Set();
  for (const x of PC.extractNumbers(citedText)) vals.add(x.value);
  (String(citedText).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).forEach(n => vals.add(+n));
  const base = [...vals];
  for (const a of base) for (const b of base) { vals.add(Math.abs(a - b)); vals.add(a + b); }
  /*  THE COUNT IS THE PAGE'S TOTAL, NOT THE CITED SUBSET (Lucas, 2026-10-24, after run 2). "Three tags to go
      with it" on a four-tag card shipped because the sentence cited three of the four; a reader counts
      four. So a count must equal a kind's total in the fact LIST for a side (what the page shows), or a sum
      or difference of the two sides' totals ("two honours Salah does not": 4 against 2). A true subset
      count ("two of his tags speak to durability") is deleted, the accepted price of plain prose.  */
  const per = {};
  for (const f of allFacts || citedFacts || []) { const k = factKind(f.text) + '/' + (f.side || 'P'); per[k] = (per[k] || 0) + 1; }
  const byKind = {};
  for (const [k, c] of Object.entries(per)) { const kind = k.split('/')[0]; (byKind[kind] = byKind[kind] || []).push(c); vals.add(c); }
  const kindSet = {};
  for (const [kind, cs] of Object.entries(byKind)) { const S = new Set(cs); for (const a of cs) for (const b of cs) { S.add(a + b); S.add(Math.abs(a - b)); } kindSet[kind] = S; S.forEach(v => vals.add(v)); }
  /*  A COUNT IS BOUND TO ITS KIND (2026-10-24, sample 1 run 3). "Five tags" passed because The Standard's copy
      says "Five seasons", and "four tags" because every card has four dimensions: the union of every kind's
      small totals let most small counts through. A number the sentence attaches to tags or honours must be
      that kind's total, sum or difference, and nothing else.  */
  const BOUND = { tags: 'tag', honours: 'honour' };
  /*  "N HONOURS" MAY ALSO BE THE CABINET'S COUNT (2026-10-24): both the season's honours and the Cabinet are
      honours the page prints, so a count bound to the word may equal either kind's total.  */
  if (kindSet.cabinet) { kindSet.honour = new Set([...(kindSet.honour || []), ...kindSet.cabinet]); }
  /*  A COUNT OF DIMENSIONS MAY BE ANY NUMBER UP TO THE TOTAL THE CARD PRINTS (Lucas, 2026-10-24, after the six
      runs: the count rule was the second deleter, 58 of 88 number deletions in sample 1's first two runs, and
      some were true subsets, "three dimensions at the 96th or above" citing three of four). Every card prints
      the same five attributes, four dimensions and Reliability, so a reader can count any subset by eye.
      Tags and honours vary per card and a subset cannot be checked without the total, so those stay exact.
      The asymmetry is deliberate: a fixed visible set may be subset, a variable one may not.  */
  const dimTotal = (per['dimension/A'] || 0) + (per['dimension/B'] || 0) + (per['reliability/A'] || 0) + (per['reliability/B'] || 0);
  const bad = PC.extractNumbers(sentence).filter(x => x.unit === 'dimensions' ? !(x.value >= 1 && x.value <= dimTotal)
    : BOUND[x.unit] ? !(kindSet[BOUND[x.unit]] || new Set()).has(x.value) : !vals.has(x.value)).map(x => x.raw);
  return bad;
}
async function judgeDraft(pack, draft, narrow = narrowCheck) {
  const ids = new Set(pack.facts.map(f => f.id));
  const fields = pack.type === 'verdict' ? ['who', 'p1', 'p2', 'h2h', 'verdict'] : ['glance', 'scout', 'notes'];
  const units = [];   // { field, para, s, cite, new_paragraph }
  for (const f of fields) {
    const v = draft[f];
    const asUnit = x => typeof x === 'string' ? { s: x, cite: [] } : (x && typeof x === 'object' ? x : { s: '', cite: [] });   // a bare string is a sentence with no citation, not an empty sentence
    if (f === 'notes') (Array.isArray(v) ? v : []).forEach((st, k) => (Array.isArray(st) ? st : []).forEach(x => units.push({ field: f, para: 'notes' + (k + 1), ...asUnit(x) })));
    else (Array.isArray(v) ? v : []).forEach(x => units.push({ field: f, para: f, ...asUnit(x) }));
  }
  const usage = [];
  await Promise.all(units.map(async u => {
    u.s = String(u.s || '').trim(); u.cite = Array.isArray(u.cite) ? u.cite.map(String) : [];
    const tail = u.s.match(/\s*\[((?:[ABP]\d+)(?:\s*,\s*[ABP]\d+)*)\]\s*$/);   // "... [A1, A2]" written inline: take the ids, drop the tail
    if (tail) { u.s = u.s.slice(0, tail.index).trim(); for (const id of tail[1].split(/\s*,\s*/)) if (!u.cite.includes(id)) u.cite.push(id); }
    const why = [];
    if (!u.s) why.push('empty');
    if (!u.cite.length) why.push('cites nothing');
    const unknown = u.cite.filter(c => !ids.has(c));
    if (unknown.length) why.push('cites ids that do not exist: ' + unknown.join(', '));
    if (pack.type === 'verdict' && u.field === 'p1' && !u.cite.some(c => c[0] === 'A')) why.push('a Player A paragraph citing no A fact');
    if (pack.type === 'verdict' && u.field === 'p2' && !u.cite.some(c => c[0] === 'B')) why.push('a Player B paragraph citing no B fact');
    const citedFacts = pack.facts.filter(f => u.cite.includes(f.id)), citedText = citedFacts.map(f => f.text).join('\n');
    const bad = numbersOk(u.s, citedText, citedFacts, pack.facts);
    if (bad.length) why.push('numbers not in the cited facts: ' + bad.join(', '));
    if (MEASURE.test(u.s) && !MEASURE.test(citedText)) why.push('names a measure no card prints');
    /*  THE CLUB HOLE, CLOSED (Lucas, 2026-10-24). Every miss across both samples on the final rules was a true
        club name in a sentence that did not cite the identity fact holding it (Barcelona, Liverpool, Arsenal,
        Marseille): the narrow check cannot see what is not cited. The club and league live in the identity
        fact, so a sentence naming either must cite that side's identity fact or it goes.  */
    const idfs = identityFacts(pack), named = new Map();   // name -> the identity fact ids that hold it (two team-mates share a club)
    for (const idf of idfs) for (const x of [idf.club, idf.league]) if (x && nameRe(x).test(u.s)) named.set(x, (named.get(x) || []).concat(idf.id));
    for (const [x, ids] of named) if (!ids.some(id => u.cite.includes(id))) why.push(`names ${x} without citing ${ids.join(' or ')}, the fact that holds it`);
    /*  "HONOUR" BINDS TO AN HONOUR FACT, "TAG" TO A TAG FACT (Lucas, 2026-10-24). De Bruyne v Pogba shipped Peak
        called an honour; no rule saw it, and the fact list knows which kind each is.  */
    const kinds = new Set(citedFacts.map(f => factKind(f.text)));
    if (/\bhonours?\b/i.test(u.s) && !kinds.has('honour') && !kinds.has('cabinet')) why.push('says honour without citing an honour fact');   // a Cabinet fact is an honour too (2026-10-24)
    if (/\btags?\b/i.test(u.s) && !kinds.has('tag')) why.push('says tag without citing a tag fact');
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
  /*  ON A SEPARATED PAIR THE HEADLINE NAMES THE WINNER (Lucas, 2026-10-24, after run 2). Messi v Neymar
      shipped "one clear winner" above a verdict that crowned Messi: a kind 4 shape by the letter, the
      headline and the body disagreeing on what the page decided. Exact and cheap: the winner's surname
      must appear in a kept headline sentence, or the piece goes to regeneration.  */
  else if (pack.type === 'verdict' && pack.winner) {
    const nm = pack.names[pack.winner], re = nameRe(nm);
    if (!units.some(u => u.field === head && u.kept && re.test(u.s))) reasons.push(`the headline does not name ${nm}, whom the page crowns`);
  }
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
    const w = await callModel(WRITER_MODEL, writerSystem(pack), factsText(pack), 4000);   // 4 to 5 sentences a paragraph needs the room
    if (w.usage) usage.push({ model: WRITER_MODEL, ...w.usage });
    if (!w.ok) { attempts.push({ attempt: a, error: w.error }); continue; }
    const j = await judgeDraft(pack, w.json);
    j.usage.forEach(u => usage.push({ model: CHECK_MODEL, ...u }));
    attempts.push({ attempt: a, draft: w.json, units: j.units, rejected: j.rejected, reasons: j.reasons, dropped: j.dropped, total: j.total });
    if (!j.rejected) return { prose: assemble(pack, j.units), outcome: a === 1 ? 'shipped' : 'shipped-on-regeneration', attempts, usage };
  }
  return { prose: null, outcome: 'no-prose', why: 'rejected twice', attempts, usage };
}

module.exports = { verdictFacts, notesFacts, scoreFact, reliabilityFact, nameRe, countsLine, identityFacts, VERDICT_FORMAT, NOTES_FORMAT, writerSystem, factsText, runPiece, judgeDraft, numbersOk, factKind, engagesBothSides, assemble, WRITER_MODEL, CHECK_MODEL, NARROW_SYSTEM };
