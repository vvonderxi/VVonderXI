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
 *  WIRED INTO api/analyse.js ON 2026-10-25 (the port, docs/PROSE_CASE_2026-10-24.md): the endpoint builds the
 *  fact list with verdictFactsFrom (the two Player lines the page sends plus the result line it prints) or
 *  notesFacts (the card payload), runs runPiece, and serves what survives. The switch VV_PROSE is still the
 *  gate (absent or off: nothing; 'verdicts': comparisons only; 'on': both), and it is OFF until the proof
 *  runs through the preview deployment pass and Lucas decides.
 */
const crypto = require('crypto');
const V = require('../../vv-core.js');
const PC = require('./prose_checks.js');

const WRITER_MODEL = 'claude-sonnet-4-6';   // the endpoint's writer
const CHECK_MODEL = 'claude-sonnet-4-6';    // the narrow check (Lucas, 2026-10-24: Sonnet)
const REJECT_SHARE = 0.25;

/* ---------- THE FACT LIST ---------- */
const LABEL_TO_TYPE = {};
for (const [k, m] of Object.entries(V.HONOUR_META)) LABEL_TO_TYPE[m.label] = k;
/*  MEANING, NOT JUST PRESENCE (Lucas, 2026-10-26, after the Cabinet fault: "the citation rule guarantees a sentence rests on
    a printed fact; it does not guarantee the sentence means what the fact means"). A World Cup is matched to the club season
    that follows it and sits among "this season's" honours by design (docs/CABINET_SPEC.md), with wonBy "team": read
    literally, "won with his team" on a Manchester United card is a World Cup won with Manchester United. The fact now says
    what it means. The same audit put the club on a shelf row's absence (cabinetFact) and bound "percentile" to a cited
    percentile (numbersOk).  */
function honourFact(label, wonBy, shelfYear, ctx) {
  const type = LABEL_TO_TYPE[label];
  const line = type && V.HONOUR_ONELINER[type];
  if (type === 'world_cup_winner') return `Honour this season: World Cup Winner, won with his country at the ${ctx && ctx.year ? ctx.year + ' ' : ''}tournament, before this club season and not with ${ctx && ctx.club ? ctx.club : 'his club'}` + (line ? `. The card says: "${line}"` : '');
  const who = wonBy === 'team' ? 'won with his team' : 'won by him';
  return `Honour this season: ${label}, ${who}` + (shelfYear != null ? `, and it is this season's own entry on the Cabinet shelf, dated ${shelfYear}, not an earlier one` : '') + (line ? `. The card says: "${line}"` : '');
}
/*  A CABINET LINE IS WHAT HE HAD WON BY THIS SEASON, NOT THIS SEASON'S HONOUR (Lucas, 2026-10-24: "add Cabinet
    lines to the fact list rather than restricting 'only' claims; giving the writer the page's own content is
    the move that keeps working"). The year is the one the card prints beside the shelf.  */
/*  A CABINET FACT IS AN EARLIER HONOUR, NEVER THIS SEASON'S (2026-10-26). The shelf is "as of this season", inclusive
    (docs/CABINET_SPEC.md: an honour appears on the face and on the shelf in the season it is won), and the payload's
    cabinet rows include this season's honour with this season's year. Passes 4 and 5 shipped "by this season he
    already held a Golden Boot in his cabinet, won in 2022" on Osimhen 22/23, whose only shelf row IS that Golden
    Boot: page-consistent, false as any reader reads it. So a shelf row that is this season's honour is stated on
    the honour fact (honourFact's shelfYear), and this fact is written only for a row from an earlier season.  */
function cabinetFact(name, label, year, wonBy) {
  const who = LABEL_TO_TYPE[label] === 'world_cup_winner' ? 'won with his country' : wonBy === 'team' ? 'won with his team' : 'won by him';
  return `${name}'s Cabinet, an earlier honour on the shelf: ${label}${year ? ' (' + year + ')' : ''}, ${who}; the shelf names no club, so it cannot be said which club it was won with`;
}
function seasonYearOf(season) { const m = String(season || '').match(/^(\d\d)\/\d\d$/); if (!m) return null; const y = +m[1]; return y < 50 ? 2000 + y : 1900 + y; }
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
  /*  A SEASON WHOSE GOALS OR ASSISTS WERE NEVER RECORDED (pre-2015 on some leagues) arrives as "NR goals NR assists"
      and used to become "null goals and null assists" (found 2026-10-25 reading the code for the pairs the sample
      does not cover, not in a run). It is stated as the page prints it: not recorded.  */
  const nr = (v, what) => v != null ? `${v} ${what}` : `${what} not recorded (the page prints NR)`;
  F.push(`${surname}: ${nr(goals, 'goals')} and ${nr(assists, 'assists')} in ${min} minutes over ${apps} appearances`);
  for (const d of ['Goal Threat', 'Creation', 'Progression', 'Defensive']) {
    const x = g(new RegExp(d + ' (\\d+)'));
    if (x != null) F.push(`${surname}'s ${d}: ${ord(x)} percentile among ${pos} seasons`);
  }
  const rel = g(/Reliability (\d+)/);
  if (rel != null) F.push(reliabilityFact(surname, rel));
  /*  NO SHOTS TOTAL AND NO KEY PASSES PER 90 ON A COMPARISON (Lucas, 2026-10-24): the Compare page prints
      neither, so the line no longer carries them, and a verdict's reader could not have checked them since
      10-22. The fact list follows the page, never the other way round. The card's notes keep both.  */
  const H = g(/HONOURS: (.*?); (?:PROOF per 90|CABINET|CAREER STAGE|TAG MEANINGS|\d+ min)/) || '';
  for (const h of (H ? H.split(/; (?=[A-Z])/) : [])) {
    const m = h.match(/^(.+?) (\d{4}) \((player|team)\)/);
    if (m) F.push(honourFact(m[1], m[3], null, { club, year: m[2] }));
  }
  /*  NO CABINET FACTS ON A COMPARISON (Lucas, 2026-10-24): the Compare page does not print the Cabinet, so a
      verdict's reader cannot check it. The card's notes keep them (notesFacts).  */
  /*  THE COMPARISON'S PROOF PANEL (2026-10-24): goals, assists and shots on target per 90, and goal conversion,
      exactly as THE PROOF prints them on the Compare page. One fact per figure so a citation is precise.  */
  const PR = g(/PROOF per 90: (.*?); goal conversion (NR|\d+%)/);
  if (PR) {
    const v = k => (PR.match(new RegExp(k + ' (NR|[\\d.]+)')) || [])[1];
    const row = (k, label) => { const x = v(k); if (x && x !== 'NR') F.push(`${surname}: ${x} ${label} per 90 minutes`); else if (x === 'NR') F.push(`${surname}: ${label} per 90 not recorded this season (the page prints NR)`); };
    row('goals', 'goals'); row('assists', 'assists'); row('shots on target', 'shots on target');
    const cv = g(/goal conversion (NR|\d+%)/);
    if (cv && cv !== 'NR') F.push(`${surname}: goal conversion ${cv}, goals as a share of shots`);
  }
  const T = g(/TAG MEANINGS: (.*?); \d+ min/) || '';
  for (const t of (T ? T.split(' | ') : [])) { const i = t.indexOf(' = '); if (i > 0) F.push(tagFact(t.slice(0, i), t.slice(i + 3))); }
  if (/pre-2015|ONLY appearances/i.test(line)) F.push(`${surname}'s season is from before 2015: only appearances, minutes, goals and assists were recorded; every other measure is absent, not zero`);
  return { surname, facts: F, keeper: /pos GK\b/.test(line) };
}
function verdictFacts(ev) {
  const lines = ev.evidence.split('\n').filter(l => /^Player [AB]:/.test(l));
  if (lines.length !== 2) throw new Error('expected two player lines');
  const result = (String(ev.page && ev.page.compare || '').match(/The Verdict\n([^\n]+)/) || [])[1];
  if (!result) throw new Error('no result line on the rendered Compare page');
  return verdictFactsFrom(lines[0], lines[1], result);
}
/*  THE ENDPOINT'S ENTRY (2026-10-25): the two Player lines as the page sends them, and the result line the page
    prints and sends, already cross-checked by the server against the margin.  */
function verdictFactsFrom(lineA, lineB, result) {
  const a = sideFacts(lineA), b = sideFacts(lineB);
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
  const nrN = (v, what) => v != null ? `${v} ${what}` : `${what} not recorded (the card prints NR)`;
  F.push(`${nm}: ${nrN(P.goals, 'goals')} and ${nrN(P.assists, 'assists')} in ${P.minutes} minutes over ${P.appearances} appearances`);
  const vals = (P.dimensions && P.dimensions.values) || {}, NAMES = { goalThreat: 'Goal Threat', creation: 'Creation', progression: 'Progression', defensive: 'Defensive' };
  for (const [k, x] of Object.entries(vals)) {
    if (x.percentile_in_pool != null) F.push(`${nm}'s ${NAMES[k] || k}: ${ord(x.percentile_in_pool)} percentile among ${P.pool} seasons`);
    if (x.pct_of_full_season != null) F.push(reliabilityFact(nm, x.pct_of_full_season));
  }
  /*  EACH FIGURE LIVES IN ONE FACT (2026-10-26, Lucas: "Watkins gives the same 19-from-86 three ways"). The goals
      total sat in the totals fact, the "goals from shots" fact and the Proof panel's goals row, so the once-a-fact
      rule below could not stop a figure recurring. Now: the totals fact holds goals and assists; a Proof row whose
      total the totals fact already holds states its per-90 rate only; the "goals from shots" fact is written only
      when the Proof panel has no shots row, and the key-passes fact only when it has no key-passes row. Every figure
      is still one the card prints, in the form the card prints it.  */
  const rows = P.proof_rows || [], rowLabel = r => String(r.label || '').toLowerCase(), hasRow = l => rows.some(r => rowLabel(r) === l);
  if (P.shots_total != null && P.goals != null && !hasRow('shots')) F.push(`${nm}: ${P.goals} goals from ${P.shots_total} shots`);
  if (P.key_passes_per90 != null && !hasRow('key passes')) F.push(`${nm}: ${Number(P.key_passes_per90).toFixed(2)} key passes per 90 minutes`);
  const sy = seasonYearOf(P.season), season = P.honours || [], shelf = P.cabinet || [];
  const thisSeasons = c => season.some(h => h.honour === c.honour && (h.year != null ? +h.year === +c.year : (sy != null && +c.year === sy)));
  for (const h of season) { const own = shelf.find(c => c.honour === h.honour && thisSeasons(c)); F.push(honourFact(h.honour, h.won_by, own ? own.year : null, { club: P.club, year: h.year })); }
  for (const h of shelf) if (!thisSeasons(h)) F.push(cabinetFact(nm, h.honour, h.year, h.won_by));
  /*  THE CARD'S PROOF PANEL (2026-10-24): the pool's three rows, total and per 90, as renderProof prints them.
      A defender's card is tackles, interceptions and blocks, and the writer had none of it.  */
  for (const r of rows) {
    const label = rowLabel(r);
    const held = (label === 'goals' && P.goals != null && +r.total === +P.goals) || (label === 'assists' && P.assists != null && +r.total === +P.assists);
    if (r.total == null && r.per90 == null) F.push(`${nm}: ${label} not recorded this season (the card prints NR)`);
    else if (held && r.per90 != null) F.push(`${nm}: ${Number(r.per90).toFixed(2)} ${label} per 90 minutes`);
    else if (!held) F.push(`${nm}: ${r.total != null ? r.total : 'NR'} ${label} in all, ${r.per90 != null ? Number(r.per90).toFixed(2) : 'NR'} per 90 minutes`);
  }
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
- any number that is not in the cited facts, or a plain sum or difference of two of them, or a count that equals how many facts of one kind a player's card holds in the list ("four honours", when the list holds four honour facts for him; "two honours he does not", when one holds four and the other two). THE TOTALS ARE GIVEN TO YOU at the top of the facts ("X's card holds 2 honours and 6 tags in all"): a count of tags or honours must be that total, and Peak, The Standard, Breakout and Wonderkid ARE tags and are in it. A count of dimensions or attributes may be any number up to the total the card prints ("three dimensions in the 90s" is fine; the card prints four dimensions and Reliability, five attributes); a count of tags or honours must be the card's whole total, never a subset.

THE HEADLINE STATES THE RESULT AND ONE CITED FACT, NOTHING MORE. No image, no flourish, no "a season for the ages", no "a season apart in class": the result as P1 gives it, and one figure or one honour, in plain words. The glance line on a card is the same: one fact, plainly. THE HEADLINE OBEYS EVERY RULE BELOW LIKE ANY SENTENCE: if it names a club, a league, a position or an age it must cite A1 (and B1), and the whole piece is thrown away when the headline is deleted, so cite A1 and B1 in it as a matter of course. THE HEADLINE NAMES THE WINNER when P1 names one; a headline that does not is thrown away with the piece.
If too much of a piece is deleted, the whole piece is thrown away and the reader sees no writing at all. So write fewer, truer sentences. A sentence with nothing to cite has no place: no scene-setting, no linking lines, no philosophy.

A SENTENCE THAT NAMES A CLUB, A LEAGUE OR AN AGE MUST CITE THAT PLAYER'S FIRST FACT (A1 or B1), which is where they are. A SENTENCE THAT SAYS "HONOUR" MUST CITE AN HONOUR FACT OR A CABINET FACT, AND ONE THAT SAYS "TAG" A TAG FACT: Peak, The Standard and the rest are tags, never honours. A CABINET FACT is what he had won BY this season, with its year; it is not this season's honour, so say "by this season" or "in his cabinet", and never write that a player holds no honour when his Cabinet facts hold one. THE WORD "CABINET" NAMES THAT BLOCK OF THE CARD AND NOTHING ELSE: never call this season's honours a cabinet, and on a comparison (which has no Cabinet facts) do not use the word at all.

THE PROOF PANEL IS IN THE FACTS, as the page prints it: on a comparison, goals, assists and shots on target per 90 and goal conversion; on a card, the three rows of the player's position (a defender's tackles, interceptions and blocks). Quote them at the decimals given; "not recorded" means the page prints NR, and you may say so.

YOU MAY: restate a fact in your own words; compare cited facts ("the higher Creation", "eleven more goals"); give an opinion or judgement that rests only on cited facts ("the more complete season", citing the dimensions it compares); use the meaning the card itself gives an honour or tag, as quoted in the facts.

YOU MAY NOT state anything the facts do not hold, however true of football: transfers, arrivals or debuts; other seasons, earlier or later clubs, career history; records and firsts; title races, league positions, trophies or awards not in the facts, or a fuller name for an award than the facts give; how strong or difficult a league, team, club or opponent was; managers, team-mates, matches, dates or moments; how a player plays, moves or looks.

CROWNS. A sentence that names, implies or leans towards an overall winner of the comparison, the better season taken whole, is a crown. A lead in one measure, an honour or tag the other does not hold, or a higher figure stated as a figure is NOT a crown and may be written on any pair. ${'{CROWN_RULE}'} A crown must cite P1.

ON A CARD (the notes), THREE MORE RULES, ALL ENFORCED IN CODE:
- EACH FACT IS CITED BY ONE SENTENCE ONLY. A sentence that cites a fact an earlier sentence already cited is deleted. The exceptions: the identity fact A1, which any sentence naming the club, league or age must cite; the glance line, whose fact may be stated once more in the body; and an honour or tag fact, which a count sentence and its one quotation may both cite. The card copy itself is printed once: a second quotation of the same honour or tag line is deleted. So a figure is stated once and never restated. Write fewer sentences than there are facts. In the honours-and-tags stanza, one honour or tag a sentence, quoted in the card's words.
- RANKING WITHIN THE CARD IS ALLOWED, JUDGEMENT IS NOT. You may say which dimension is strongest or weakest, or that one attribute is above or below another, by naming them with their card names (Goal Threat, Creation, Progression, Defensive, Reliability) in the same clause; the code checks the order against the figures and deletes the sentence when it is wrong. "Goal Threat at the 96th percentile is his strongest dimension" lives. A sentence that ranks, compares or praises without naming the attributes it ranks is deleted: "his finishing was the best part of his game" dies, and so does "more goals than assists". Strongest and weakest are among the four dimensions; above and below set any two of the five attributes against each other, one named before the word and one after. The "opinion or judgement" allowed above is for a comparison; on a card there is none.
- THE CABINET SHELF IS "AS OF THIS SEASON", SO THIS SEASON'S HONOUR SITS THERE TOO. A Cabinet fact in this list is an EARLIER honour only: say "before this season" or "an earlier". Never write that an honour is his first; the card cannot know what he won off the Index, and the sentence is deleted. A second or repeat honour ("a second Golden Boot, after 2022's") must cite the Cabinet fact that holds the earlier one and is deleted otherwise. A shelf honour names no club: never say which club an earlier honour was won with. A World Cup is won with his country, never with the club on the card, and it sits among this season's honours because the tournament came before the season.

NEVER WRITE A FACT ID IN A SENTENCE ("as P1 states", "see A3"): the ids are for the "cite" list only, and a sentence that mentions one is deleted.

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
/*  THE HEADLINE CITES THE IDENTITY FACTS (2026-10-25, pass 1 of the proof runs: 5 of 18 pieces died on "the headline
    was deleted", and the repeated cause was a league named in the headline, "Premier League CDMs", "in Serie A", with
    the example citation steering the writer to P1, A2 and B2 only, so the club rule deleted it). A1 and B1 are in
    the example now, and the writer is told the headline obeys the club rule like any sentence.  */
const VERDICT_FORMAT = `{"who": [{"s": "one sentence, a headline of at most 14 words: the result and one cited fact, nothing more", "cite": ["P1", "A1", "B1", "A2", "B2"]}],
 "p1": [4 to 5 sentences about Player A, citing A facts],
 "p2": [4 to 5 sentences about Player B, citing B facts],
 "h2h": [4 to 5 sentences setting the two against each other],
 "verdict": [4 to 5 sentences, the last one quotable]}`;
/*  THE NOTES FORM, FIXED; THE SHARE RULE KEPT (Lucas, 2026-10-24, after the six runs: notes 2 of 8, every
    rejection the share rule). "What it would cost to deny it" asked for judgement, and judgement has no
    fact id: the narrow check deleted about a third of every notes piece. The share rule is not relaxed,
    it is what stops a gutted piece shipping and notes need it more than verdicts. The scout and the
    closing stanza now ask for figures and the card's own copy only.  */
/*  THE NOTES FORM, SHORTER, EACH BLOCK ONE JOB (Lucas, 2026-10-26, after the flip: "correct and they repeat themselves").
    Four stanzas of 4 to 5 sentences from about eighteen facts was one sentence a fact, and the closing stanza was told to
    restate: the only way to fill it was repetition. Now three blocks with distinct jobs and fewer sentences than facts,
    and the once-a-fact rule in judgeDraft makes restating a deletion rather than a habit.  */
const NOTES_FORMAT = `{"glance": [{"s": "one sentence, one fact of the season, plainly", "cite": ["A1", "A3"]}],
 "scout": [3 to 4 sentences, THE FIGURES AND NOTHING ELSE: the totals, the Proof panel's rows at the decimals given, key passes where the card prints them; each figure stated once; no judgement],
 "notes": [[3 to 4 sentences], [3 to 4 sentences]]}   two stanzas: first THE HONOURS AND TAGS, this season's honours and the tags in the card's own words, each quoted once, and any earlier honour on the Cabinet shelf stated as earlier; second THE SHAPE OF THE SEASON, the dimensions ranked by their card names (the strongest, the weakest, one above another), Reliability out of 100, and the VV Score with the word the card prints beside it, closing on the score. FEWER SENTENCES THAN FACTS: every fact is cited by one sentence only and nothing is restated`;
function writerSystem(pack) {
  const rule = pack.type === 'notes' ? 'This is a single season: there is no comparison and no crown.'
    : pack.winner ? `P1 names ${pack.names[pack.winner]} as the winner: you may name ${pack.names[pack.winner]}, and only ${pack.names[pack.winner]}, as the winner, as clearly as P1 does. The headline MUST name ${pack.names[pack.winner]}.`
    : `P1 says the Index cannot separate these two: NO sentence may name, imply or lean towards a winner. Banned outright: ${BANNED_CROWNS}, and every near variant. Say what each season holds that the other does not. THE HEADLINE ON A TIE PUTS EACH SCORE BESIDE ITS OWN NAME ("${pack.names.A} 93, ${pack.names.B} 91"), NEVER "both scoring 93 and 91" or "both Iconic at 93 and 91": the check reads that as each holding both, deletes the headline, and the piece is thrown away.`;
  return WRITER_SYSTEM.replace('${\'{CROWN_RULE}\'}', rule).replace('{CROWN_RULE}', rule).replace('{FORMAT}', pack.type === 'notes' ? NOTES_FORMAT : VERDICT_FORMAT);
}
function factsText(pack) {
  /*  THE WRITER SEES THE TOTALS (2026-10-25, pass 1 of the proof runs): "Five tags" over a list of six names, "four
      tags" beside Peak, on every second attempt; the counts line had gone to the narrow check and never to the
      writer, and it does not count Peak or The Standard as tags. Now it is the first line of its facts.  */
  const head = (pack.type === 'verdict' ? `Player A is ${pack.names.A}. Player B is ${pack.names.B}.\n` : '') + countsLine(pack) + '\n\n';
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
  const dims = {}; for (const f of pack.facts) { const k = factKind(f.text); if (k === 'dimension' || k === 'reliability') { const s = f.side || 'P'; dims[s] = dims[s] || { d: 0, r: 0 }; dims[s][k === 'dimension' ? 'd' : 'r']++; } }
  return Object.entries(per).map(([s, c]) => `${pack.names[s] || s}'s card holds ${c.honour} honour${c.honour === 1 ? '' : 's'} and ${c.tag} tag${c.tag === 1 ? '' : 's'} in all (a count of these is correct even when the sentence cites only some)` + (dims[s] ? `, and prints ${dims[s].d} dimension${dims[s].d === 1 ? '' : 's'}${dims[s].r ? ' and Reliability' : ''}` : '')).join('. ') + '.';
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
const MEASURE = /\b(duels?|dribbl\w*|penalt(?:y|ies)(?! area)|starts?|clean sheets?|saves?|aerial\w*|crosses|expected goals|xg)\b/i;   // starts, clean sheets, saves, aerials, crosses and xG added 2026-10-26: appearances are not starts, and none of these is printed on an outfield card
/*  A COUNT OF THE CITED FACTS OF ONE KIND IS A NUMBER THE READER CAN CHECK (Lucas, 2026-10-24).
    The first fresh-sample run deleted 40 sentences for a number not in the cited facts, and about
    half were counts of the facts the sentence itself cited: "four honours on a single card" citing
    four honour facts, "two Golden Boot seasons", "six identical tags", "two World Class CDMs". A
    reader checks a count by counting on the page. So the allowed values also include, for each kind
    of fact cited (honour, tag, dimension, identity, score, and so on), how many of that kind are
    cited in all and how many per side. Everything else stays strict: the same run's rule caught
    "seven percentile points higher" for a gap of 11, an uncited 3221 minutes, an age no fact holds,
    and "six goals were left in matches he did not start", and it keeps catching them.  */
const KINDS = [['result', /^The page's own result/], ['honour', /^Honour this season/], ['cabinet', /'s Cabinet, an earlier honour on the shelf: /], ['tag', /^Tag: /], ['score', /'s VV Score: /],
  ['dimension', /'s (?:Goal Threat|Creation|Progression|Defensive): /], ['reliability', /'s Reliability: /], ['shots', / goals from \d+ shots$/],
  ['keypasses', / key passes per 90 minutes$/], ['proof', / per 90 minutes$| not recorded this season /], ['conversion', /: goal conversion \d+%/],
  ['totals', / goals and \d+ assists in /], ['era', /before 2015/], ['identity', /, age \d+$/]];
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
  /*  A PERCENTILE IS NOT A PERCENTAGE (pass 4, 2026-10-25: "Hazard's Progression at 97 per cent" for the 97th percentile).
      A number the sentence calls a percentage must be a percentage in the cited facts (goal conversion, Reliability
      out of 100); one that exists only as a percentile is deleted.  */
  const pctIn = new Set(); for (const f of citedFacts || []) (String(f.text).match(/(\d+)%|Reliability: (\d+) out of 100/g) || []).forEach(m => pctIn.add(+m.replace(/\D/g, '')));
  const pctWrong = PC.extractNumbers(sentence).filter(x => x.unit === 'pct' && !pctIn.has(x.value) && (citedFacts || []).some(f => new RegExp('\\b' + x.value + '(?:st|nd|rd|th) percentile').test(f.text))).map(x => x.raw + ' called a percentage, it is a percentile');
  /*  A NUMBER CALLED A PERCENTILE MUST BE A PERCENTILE IN THE CITED FACTS, OR A DIFFERENCE OF TWO (2026-10-26, the meaning
      audit): Reliability is out of 100 and the page's caption already misdescribes it as a percentile (§D), so "Reliability
      at the 94th percentile" was one misreading away and no rule saw it.  */
  const pctileIn = new Set(); for (const f of citedFacts || []) (String(f.text).match(/(\d+)(?:st|nd|rd|th) percentile/g) || []).forEach(m => pctileIn.add(+m.replace(/\D/g, '')));
  const pctileOk = new Set(pctileIn); for (const a of pctileIn) for (const b of pctileIn) pctileOk.add(Math.abs(a - b));
  const pctileWrong = PC.extractNumbers(sentence).filter(x => x.unit === 'percentile' && !pctileOk.has(x.value)).map(x => x.raw + ' called a percentile, and no cited fact prints it as one');
  const bad = PC.extractNumbers(sentence).filter(x => x.unit === 'dimensions' ? !(x.value >= 1 && x.value <= dimTotal)
    : BOUND[x.unit] ? !(kindSet[BOUND[x.unit]] || new Set()).has(x.value) : !vals.has(x.value)).map(x => x.raw);
  return bad.concat(pctWrong, pctileWrong);
}
/* ---------- RANKING WITHIN THE CARD (code), 2026-10-26 ---------- */
/*  LUCAS'S LINE: "Goal Threat at 96 is his strongest dimension" is a relation between two printed numbers; "his finishing
    was the best part of his game" is a judgement. The code tells them apart by one test: a sentence with a ranking word
    must name, by its card name and in the same clause, the attribute it ranks, and the order it states must be the order
    the figures give. A ranking that names nothing, or that the code cannot parse into one shape below, is deleted.
    Shapes: a superlative (strongest, weakest and their kin) governs the nearest dimension name before it in the clause,
    else the first after, and that dimension must be the maximum (or minimum) of the four; a comparative (above, below,
    exceeds, trails and their kin) takes the last attribute named before it and the first named after it, any two of the
    five, and the figures must stand in that order. Card copy that is quoted is stripped first, so Peak's "the best
    season of his career" is not a ranking. Notes only: a comparison already has its own rules.  */
const ATTRS = ['Goal Threat', 'Creation', 'Progression', 'Defensive', 'Reliability'];
const SUP_MAX = /\b(strongest|highest|best|most \w+|dominant|commanding|standout|biggest|largest|greatest)\b/gi;
const SUP_MIN = /\b(weakest|lowest|worst|least \w+|smallest|softest|weak spot|weakness)\b/gi;
/*  "more goals than assists" has up to three words between the comparative and "than"; both halves are the mark.  */
const CMP_GT = /\b(above|ahead of|exceeds?|outstrips?|surpasses?|outscores?|eclipses?|dwarfs?|(?:more|greater|higher|stronger|better|bigger|larger)\b(?:\s+\w+){0,3}\s+than)\b/gi;
const CMP_LT = /\b(below|behind|trails?|lags?|(?:less|fewer|lower|weaker|worse|smaller)\b(?:\s+\w+){0,3}\s+than)\b/gi;
function cardAttributes(pack, side) {
  const v = {};
  for (const f of pack.facts) {
    if (side && f.side !== side) continue;
    let m = f.text.match(/'s (Goal Threat|Creation|Progression|Defensive): (\d+)(?:st|nd|rd|th) percentile/); if (m) v[m[1]] = +m[2];
    m = f.text.match(/'s Reliability: (\d+) out of 100/); if (m) v.Reliability = +m[1];
  }
  return v;
}
function copyLines(pack) { return pack.facts.map(f => (f.text.match(/The card says: "([^"]+)"/) || [])[1]).filter(Boolean); }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\async function judgeDraft(pack, draft, narrow = narrowCheck) {');
function stripCopy(s, pack) {
  let t = s;
  for (const c of copyLines(pack)) for (const p of [c].concat(c.split(/(?<=[.!?])\s+/))) if (p.replace(/[^\p{L}]/gu, '').length >= 8) t = t.replace(new RegExp(esc(p.replace(/[.!?]$/, '')), 'gi'), ' ');
  return t.replace(/"[^"]*"/g, ' ').replace(/'[^']{12,}'/g, ' ');
}
function rankingOk(pack, sentence, side) {
  const vals = cardAttributes(pack, side), why = [];
  const t = stripCopy(sentence, pack);
  const names = txt => { const out = []; for (const a of ATTRS) { const re = new RegExp('\\b' + a + '\\b', 'gi'); let m; while ((m = re.exec(txt))) out.push({ name: a, at: m.index }); } return out.sort((x, y) => x.at - y.at); };
  const dims = ATTRS.slice(0, 4).filter(a => vals[a] != null);
  const max = Math.max(...dims.map(a => vals[a])), min = Math.min(...dims.map(a => vals[a]));
  for (const clause of t.split(/;|\b(?:and|while|but|whereas)\b/i)) {
    const nm = names(clause);
    const occ = (re, kind) => { const out = []; re.lastIndex = 0; let m; while ((m = re.exec(clause))) out.push({ kind, word: m[1], at: m.index }); return out; };
    const marks = occ(SUP_MAX, 'max').concat(occ(SUP_MIN, 'min'), occ(CMP_GT, 'gt'), occ(CMP_LT, 'lt'));
    for (const k of marks) {
      if (!nm.length) { why.push(`"${k.word}" ranks nothing the card names (a ranking must name the attribute by its card name)`); continue; }
      if (k.kind === 'max' || k.kind === 'min') {
        const before = nm.filter(x => x.at < k.at), target = before.length ? before[before.length - 1] : nm.find(x => x.at > k.at);
        if (!target) { why.push(`"${k.word}" names no attribute in its clause`); continue; }
        if (target.name === 'Reliability') { why.push(`"${k.word}" of Reliability: it is not a percentile, and strongest or weakest is among the four dimensions`); continue; }
        const v = vals[target.name], want = k.kind === 'max' ? max : min;
        if (v !== want) why.push(`"${k.word}" for ${target.name} (${v}), but the ${k.kind === 'max' ? 'highest' : 'lowest'} dimension is ${want}`);
      } else {
        const before = nm.filter(x => x.at < k.at), after = nm.filter(x => x.at > k.at);
        if (!before.length || !after.length) { why.push(`"${k.word}" does not set one named attribute against another (one before the word, one after)`); continue; }
        const a = before[before.length - 1].name, b = after[0].name, va = vals[a], vb = vals[b];
        if (va == null || vb == null) { why.push(`"${k.word}" compares an attribute the card does not print`); continue; }
        const okOrder = k.kind === 'gt' ? va > vb : va < vb;
        if (!okOrder) why.push(`"${a} ${k.word} ${b}" is the wrong way round (${va} against ${vb})`);
      }
    }
  }
  return why;
}
/*  A FIRST CANNOT BE KNOWN, A REPEAT MUST CITE THE EARLIER ONE (2026-10-26). "His first Golden Boot" is a claim about every
    season off the Index; the card holds this season and the shelf as of it, so it is deleted. "A second Golden Boot" is a
    relation between this season's honour and an earlier shelf row, and must cite that Cabinet fact.  */
const ORDINAL = { second: 1, third: 2, fourth: 3 };
function honourRepeatOk(pack, sentence, citedFacts) {
  const why = [], t = stripCopy(sentence, pack);
  const labels = [...new Set(pack.facts.map(f => (f.text.match(/^Honour this season: (.+?), won|'s Cabinet, an earlier honour on the shelf: (.+?)(?: \(\d{4}\))?, won/) || []).slice(1).find(Boolean)).filter(Boolean))];
  const named = labels.filter(l => nameRe(l).test(t));
  /*  "The first honour reads: ..." is a listing, not a first (local run 2, 2026-10-26, Osimhen): the rule fires on "first"
      within two words before an honour's name, or "his first" or "a first" beside the name or the word honour.  */
  const firstOf = l => new RegExp('\\bfirst\\b(?:\\s+\\w+){0,2}\\s+' + esc(l) + '\\b|\\b' + esc(l) + '\\b[^.;]{0,25}\\b(?:his|a) first\\b', 'i');
  if (named.some(l => firstOf(l).test(t)) || /\b(?:his|a) first honour\b/i.test(t)) why.push('calls an honour his first: the card cannot know a first');
  const rep = t.match(/\b(second|third|fourth|another|again|repeat(?:ed|s)?|retain(?:ed|s)?|back-to-back|successive|consecutive|once more)\b/i);
  if (rep) {
    const need = ORDINAL[rep[1].toLowerCase()] || 1;
    const prior = l => pack.facts.filter(f => new RegExp("'s Cabinet, an earlier honour on the shelf: " + esc(l) + '\\b').test(f.text));
    if (!named.length && /\bhonours?\b/i.test(t)) why.push(`"${rep[1]}" honour naming no honour`);
    for (const l of named) {
      const p = prior(l);
      if (p.length < need) why.push(`"${rep[1]}" ${l}: the shelf holds ${p.length} earlier`);
      else if (!p.some(f => citedFacts.some(c => c.id === f.id))) why.push(`"${rep[1]}" ${l} without citing the Cabinet fact that holds the earlier one`);
    }
  }
  return why;
}
const words5 = s => { const w = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean); const out = []; for (let i = 0; i + 5 <= w.length; i++) out.push(w.slice(i, i + 5).join(' ')); return out; };

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
  for (const u of units) {
    u.s = String(u.s || '').trim(); u.cite = Array.isArray(u.cite) ? u.cite.map(String) : [];
    const tail = u.s.match(/\s*\[((?:[ABP]\d+)(?:\s*,\s*[ABP]\d+)*)\]\s*$/);   // "... [A1, A2]" written inline: take the ids, drop the tail
    if (tail) { u.s = u.s.slice(0, tail.index).trim(); for (const id of tail[1].split(/\s*,\s*/)) if (!u.cite.includes(id)) u.cite.push(id); }
    const why = u.why = [];
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
    if (/\b(?:[AB]\d{1,2}|P1)\b/.test(u.s)) why.push('quotes a fact id in the sentence');   // "as P1 states" shipped in pass 1 of the proof runs (2026-10-25)
    /*  "CABINET" IS THE CARD'S WORD FOR WHAT HE HAD WON BY THIS SEASON (Lucas, 2026-10-25, pass 2: "the Ballon d'Or and
        the UCL sit in his cabinet from this season alone" was this season's honours in the card's word for a
        different block). The word may name only a Cabinet fact; a comparison has none, so there it is deleted.  */
    if (/\bcabinets?\b/i.test(u.s) && !kinds.has('cabinet') && !citedFacts.some(f => /on the Cabinet shelf/.test(f.text))) why.push('says cabinet without citing a Cabinet fact');   // an honour fact that names this season's own shelf entry counts (2026-10-26)
    if (/\btags?\b/i.test(u.s) && !kinds.has('tag')) why.push('says tag without citing a tag fact');
    if (pack.type === 'notes') { rankingOk(pack, u.s).forEach(w => why.push('ranking: ' + w)); honourRepeatOk(pack, u.s, citedFacts).forEach(w => why.push('honour: ' + w)); }
    /*  THE GATE ON A COMPARISON'S OWN-PLAYER PARAGRAPHS (pass 6, 2026-10-26): told the card's ranking rule, the writer ranked
        inside verdicts too, and wrongly ("Progression at the 95th percentile is his strongest dimension" beside a Goal
        Threat at the 97th) in both pieces sample 1 lost. The narrow check caught them; the code now does, against that
        player's own figures, on p1 and p2 when the sentence does not name the other player. The head to head and the
        verdict set one player against the other and stay with the narrow check.  */
    if (pack.type === 'verdict' && (u.field === 'p1' || u.field === 'p2') && !engagesBothSides(pack, u)) rankingOk(pack, u.s, u.field === 'p1' ? 'A' : 'B').forEach(w => why.push('ranking: ' + w));
    /*  A TAG IS NOT A RATING (pass 6: "His VV Score is 87, rated Peak"). A tag name after rated, marked, graded or banded is deleted.  */
    const tagNames = pack.facts.map(f => (f.text.match(/^Tag: (.+?)\. The card says/) || [])[1]).filter(Boolean);
    if (tagNames.some(n => new RegExp('\\b(?:rated|marked|graded|banded)\\s+(?:as\\s+)?(?:an?\\s+)?' + esc(n) + '\\b', 'i').test(u.s))) why.push('calls a tag a rating (rated, marked or graded with a tag name)');
    u.code = why.slice();
  }
  /*  EACH FACT ONCE, EACH QUOTE ONCE, ON A CARD (Lucas, 2026-10-26). In order of reading: a sentence that cites a fact an
      earlier surviving sentence already cited is deleted (A1 excepted), and a sentence that prints five running words of
      card copy an earlier surviving sentence already printed is deleted. Decided on the code-surviving sentences, before
      the narrow check, so the result is one pass and deterministic.  */
  if (pack.type === 'notes') {
    /*  THREE EDGES FROM THE FIRST LOCAL RUN (2026-10-26, 2 of 4 shipped, no loss to repetition): the glance line's fact
        restated in the body is the lede, not repetition, so the glance's citations are not recorded; a count sentence
        ("two honours and two tags") must cite honour and tag facts by the binding rule and the quotations must cite the
        same facts, so honour and tag facts are governed by quote-once (the copy printed once) rather than id-once; the
        identity fact is exempt as before. Every other fact, a figure or a shelf row, is cited by one sentence.  */
    const used = new Set(), printed = new Set(), copies = copyLines(pack).map(c => ({ c, w: new Set(words5(c)) })), idf = new Set(identityFacts(pack).map(x => x.id));
    const kindOf = id => factKind((pack.facts.find(x => x.id === id) || { text: '' }).text), copyKind = id => ['honour', 'tag'].includes(kindOf(id));
    for (const u of units) {
      if (u.why.length || u.field === 'glance') continue;
      const dup = u.cite.filter(c => used.has(c) && !idf.has(c) && !copyKind(c));
      if (dup.length) { u.why.push(`cites ${dup.join(', ')}, already cited by an earlier sentence (each fact once on a card)`); u.code = u.why.slice(); continue; }
      const w = new Set(words5(u.s)), quotes = copies.filter(x => [...x.w].some(y => w.has(y))).map(x => x.c);
      const again = quotes.filter(q => printed.has(q));
      if (again.length) { u.why.push('repeats card copy an earlier sentence already printed: "' + again[0].slice(0, 40) + '"'); u.code = u.why.slice(); continue; }
      u.cite.forEach(c => used.add(c)); quotes.forEach(q => printed.add(q));
    }
  }
  await Promise.all(units.map(async u => {
    const why = u.why;
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
  const expected = pack.type === 'verdict' ? ['p1', 'p2', 'h2h', 'verdict'] : ['scout', 'notes1', 'notes2'];
  /*  THE HONOURS-AND-TAGS STANZA CAN ONLY BE AS LONG AS THE CARD'S HONOURS AND TAGS (2026-10-26: Berardi, no honour and
      two tags, died twice on "notes1 has 1 sentence left"). Its floor is two, or the number of honour, tag and shelf
      facts when that is smaller; a card with none of them has an empty stanza, dropped by assemble.  */
  const copyFacts = pack.facts.filter(f => ['honour', 'tag', 'cabinet'].includes(factKind(f.text))).length;
  for (const p of expected) { const need = p === 'notes1' ? Math.min(2, copyFacts) : 2; const k = units.filter(u => u.para === p && u.kept).length; if (k < need) reasons.push(`${p} has ${k} sentence${k === 1 ? '' : 's'} left`); }
  const dropped = units.filter(u => !u.kept).length;
  if (units.length && dropped / units.length > REJECT_SHARE) reasons.push(`${dropped} of ${units.length} sentences deleted, more than a quarter`);
  if (!units.length) reasons.push('no sentences');
  return { units, rejected: reasons.length > 0, reasons, dropped, total: units.length, usage, paras };
}
function assemble(pack, units) {
  const join = list => { let out = ''; list.forEach((u, i) => { out += (i === 0 ? '' : (u.new_paragraph ? '\n\n' : ' ')) + u.s; }); return out; };
  const kept = units.filter(u => u.kept);
  if (pack.type === 'verdict') { const o = {}; for (const f of ['who', 'p1', 'p2', 'h2h', 'verdict']) o[f] = join(kept.filter(u => u.field === f)); return o; }
  return { glance: join(kept.filter(u => u.field === 'glance')), scout: join(kept.filter(u => u.field === 'scout')), notes: [1, 2].map(k => join(kept.filter(u => u.para === 'notes' + k))).filter(Boolean) };
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

/*  THE RULES VERSION, DERIVED (2026-10-25, the same scheme as the old PROMPT_REV + fingerprint, RULES.md §C): the
    writer's instructions, the narrow check's and both formats are fingerprinted, so an edit to any of them
    stales every cached verdict and note. CITED_REV is bumped by hand for a change to a CODE rule (a drop rule,
    the share, the crown gate), which the fingerprint cannot see.  */
const CITED_REV = 'c3';   // c2, 2026-10-26: once-a-fact, quote-once, the ranking gate, the honour-repeat rule, two stanzas; c3, 2026-10-27: the 1 of "Ligue 1" is not a number
const RULES_VERSION = CITED_REV + '-' + crypto.createHash('sha256').update(WRITER_SYSTEM + NARROW_SYSTEM + VERDICT_FORMAT + NOTES_FORMAT + REJECT_SHARE).digest('hex').slice(0, 8);
module.exports = { rankingOk, honourRepeatOk, stripCopy, cardAttributes, seasonYearOf, verdictFactsFrom, RULES_VERSION, CITED_REV, WRITER_SYSTEM, verdictFacts, notesFacts, scoreFact, reliabilityFact, nameRe, countsLine, identityFacts, VERDICT_FORMAT, NOTES_FORMAT, writerSystem, factsText, runPiece, judgeDraft, numbersOk, factKind, engagesBothSides, assemble, WRITER_MODEL, CHECK_MODEL, NARROW_SYSTEM };
