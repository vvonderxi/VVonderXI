/*  ITEM 15 , CONTINENTAL HONOURS: EURO AND COPA AMERICA. READ-ONLY UNLESS --apply.
    Scope and the measurements behind it: docs/CONTINENTAL_HONOURS_SCOPE.md.

    THE STRICT MATCHER IS PORTED VERBATIM FROM THE SQUAD-NUMBER JOB AND THAT IS DELIBERATE.
    My own scoping pass used a crude "last word of the name" match and produced TWO false
    misses in four squads , it lost `Pedro (footballer, born 1987)` because the disambiguated
    title makes the surname "1987)", and reported Senegal 2021 at 0% against a pool of 82 on a
    database holding 859 Senegal cards. **AND THE STAKES ARE HIGHER HERE THAN THEY WERE THERE:
    a wrong match writes an HONOUR onto a card, which is a false CLAIM about a player, not a
    wrong decoration.** So nothing about the matcher is relaxed for convenience.

    MULTI-BLOCK IS THE NORMAL CASE HERE AND THE CLUB JOB'S REFUSAL MUST NOT BE PORTED , see
    scripts/squadnum/backfill.js, which SKIPS any page carrying more than one squad block
    ("N blocks, held for adjudication", 200 club-seasons held under it). That rule is right
    there and wrong here: a tournament page carries EVERY nation's squad by design, 16 to 24
    blocks, and the nation heading is the disambiguator rather than an ambiguity. The two jobs
    disagree for a good reason and both comments say so.

    THE NATIONALITY CHECK IS A GUARD, NOT A FILTER. A player matched inside Spain's block whose
    stored nationality is not Spain is a WRONG MATCH , the name collided across nations , and
    it is REFUSED AND REPORTED rather than silently dropped. Dropping it would hide the one
    failure this job can detect without an external source, which is exactly the kind of
    evidence the club job never had.  */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'), path = require('path');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const UA = { 'User-Agent': 'VVonderXI/1.0 (continental honours; contact hello@vvonderxi.com)' };
const DIR = path.join(__dirname, '../../migrations/continental_honours_2026-09-14');
const APPLY = process.argv.includes('--apply');

/*  TEN TOURNAMENTS. Euro and Copa America only , UEFA and CONMEBOL are ~80% of the reachable
    cards and their squads resolve almost completely, while CAF, AFC and CONCACAF are twenty
    tournaments for a ceiling near 1,000 cards, FOUR OF WHICH PROVABLY YIELD ZERO. That is a
    completeness-against-effort call and it is recorded in the scope rather than taken here.
    `year` IS THE TOURNAMENT YEAR AND BECOMES season_year, matching how the 93 existing
    world_cup_winner rows are stored (2010, 2014, 2018, 2022). Euro 2020 was played in 2021
    and is dated 2021, because the honour is dated to the year WON.  */
const TOURNAMENTS = [
  { type: 'euro_winner', page: 'UEFA Euro 2012 squads',        nation: 'Spain',     nat: 'Spain',     year: 2012 },
  { type: 'euro_winner', page: 'UEFA Euro 2016 squads',        nation: 'Portugal',  nat: 'Portugal',  year: 2016 },
  { type: 'euro_winner', page: 'UEFA Euro 2020 squads',        nation: 'Italy',     nat: 'Italy',     year: 2021 },
  { type: 'euro_winner', page: 'UEFA Euro 2024 squads',        nation: 'Spain',     nat: 'Spain',     year: 2024 },
  { type: 'copa_winner', page: '2011 Copa América squads',     nation: 'Uruguay',   nat: 'Uruguay',   year: 2011 },
  { type: 'copa_winner', page: '2015 Copa América squads',     nation: 'Chile',     nat: 'Chile',     year: 2015 },
  { type: 'copa_winner', page: 'Copa América Centenario squads', nation: 'Chile',   nat: 'Chile',     year: 2016 },
  { type: 'copa_winner', page: '2019 Copa América squads',     nation: 'Brazil',    nat: 'Brazil',    year: 2019 },
  { type: 'copa_winner', page: '2021 Copa América squads',     nation: 'Argentina', nat: 'Argentina', year: 2021 },
  { type: 'copa_winner', page: '2024 Copa América squads',     nation: 'Argentina', nat: 'Argentina', year: 2024 },
];

// ── the strict matcher, ported verbatim ───────────────────────────────────────────────
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/gi, 'i')
  .toLowerCase().replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();
const PART = new Set(['van', 'der', 'den', 'de', 'di', 'da', 'del', 'le', 'la', 'von', 'ten', 'ter']);
function split(n) {
  const t = fold(n).split(' ').filter(Boolean);
  if (t.length <= 1) return { fore: '', sur: t[0] || '' };
  let i = t.length - 1; while (i > 0 && PART.has(t[i - 1])) i--;
  return { fore: t.slice(0, i).join(' '), sur: t.slice(i).join(' ') };
}
const isAb = (n) => /^[A-Z]\.\s/.test(String(n).trim());
/*  ── THE SAME RULE, POINTED THE OTHER WAY , AND IT CANNOT BE DONE BY SWAPPING ARGUMENTS ──
    `matchOne` tests `isAb` on the LOOKUP name, because in the club job the lookup name was
    always ours. Here the lookup is a full Wikipedia name and the CANDIDATES are ours, so
    calling `matchOne(squadName, ourPlayers)` would test the wrong side: `Kalidou Koulibaly`
    reads as not-abbreviated, demand a full forename match against our stored `K. Koulibaly`,
    and match NOTHING. With 63.6% of `player_name` abbreviated (Section C) that is most of the
    database, and it would have failed as a near-zero yield rather than as an error.
    THE RULE IS UNCHANGED AND THE ALLOWANCE STILL BELONGS TO OUR SIDE: an ABBREVIATED name of
    ours may match on the initial, a FULL name of ours must match in full, and anything else
    sharing a surname is AMBIGUOUS and is HELD. Only the direction of the loop moved.  */
function matchSquadRow(squadName, ourPlayers) {
  const q = split(squadName);
  const sur = ourPlayers.filter((c) => split(c.player_name).sur === q.sur);
  if (!sur.length) return { kind: 'norow' };
  const hits = sur.filter((c) => {
    const o = split(c.player_name);
    if (!o.fore || !q.fore) return true;                       // one side gives no forename
    if (isAb(c.player_name)) return o.fore.charAt(0) === q.fore.charAt(0);
    return o.fore === q.fore || o.fore.split(' ')[0] === q.fore.split(' ')[0];
  });
  if (hits.length !== 1) return { kind: 'ambiguous' };
  return { kind: 'match', row: { ref: hits[0] } };
}
function matchOne(ourName, rows) {
  const ours = split(ourName), ab = isAb(ourName);
  const sur = rows.filter((r) => split(r.name).sur === ours.sur);
  if (!sur.length) return { kind: 'norow' };
  let h;
  if (!ours.fore) h = sur;
  else if (ab) h = sur.filter((r) => split(r.name).fore.charAt(0) === ours.fore.charAt(0));
  else {
    h = sur.filter((r) => split(r.name).fore === ours.fore);
    if (!h.length) h = sur.filter((r) => split(r.name).fore.split(' ')[0] === ours.fore.split(' ')[0]);
  }
  if (h.length !== 1) return { kind: 'ambiguous' };
  return { kind: 'match', row: h[0] };
}

/*  THE SQUAD BLOCK , heading to the next heading of ANY level. `{{nat fs player}}` and its
    goalkeeper variant `{{nat fs g player}}` carry NAMED FIELDS, so the name is read from
    `|name=` rather than by counting columns. The `g` variant is easy to miss and costs the
    keeper of every squad , my first pass matched `nat fs player` only and returned 0 names
    on a block that plainly had 23.  */
/*  ── READING THE name= FIELD , AND WHY A NAIVE SPLIT ON "|" IS NOT ENOUGH ───────────────
    Some squads write the name as a bare link, `|name=[[Iker Casillas]]`, and others wrap it
    in a sort template, `|name={{sortname|Cristiano|Ronaldo}}`. A capture that stops at the
    next "|" reads the SECOND form as the literal text "{{sortname".
    IT FAILED SILENTLY AND PLAUSIBLY, WHICH IS THE POINT. Portugal 2016 came back as 23 rows
    all named "{{sortname", matched 4 of 23, and 4 looks like an ordinary low yield rather
    than a parse failure , Portugal is a smaller nation, so "most of that squad has no card"
    is a believable story. It was caught by comparing it against Spain 16 and Italy 24 on the
    same run, not by anything the code said.
    SO THE FIELD IS READ WITH BRACE DEPTH, then the two wrappers are unwound:
    `{{sortname|First|Last}}` gives "First Last" (a third parameter is a sort key, not a name)
    and `{{sort|key|display}}` gives the display half.  */
function nameField(body) {
  const i = body.search(/\|\s*name\s*=/);
  if (i < 0) return null;
  let j = body.indexOf('=', i) + 1, depth = 0, out = '';
  for (; j < body.length; j++) {
    const c = body[j];
    if (c === '{' && body[j + 1] === '{') { depth++; out += c; continue; }
    if (c === '}' && body[j + 1] === '}') { depth--; out += c; continue; }
    if (c === '|' && depth === 0) break;
    if (c === '\n' && depth === 0) break;
    out += c;
  }
  let n = out.trim();
  const sn = /^\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)/i.exec(n);
  if (sn) n = (sn[1].trim() + ' ' + sn[2].trim()).trim();
  else {
    const so = /^\{\{\s*sort\s*\|[^|}]*\|([^|}]*)/i.exec(n);
    if (so) n = so[1].trim();
  }
  n = n.replace(/^\[\[|\]\]$/g, '');
  if (n.includes('|')) n = n.split('|').pop();
  return n.replace(/\{\{|\}\}/g, '').replace(/\(.*?\)/g, '').trim() || null;
}
function squadOf(wt, nation) {
  const re = new RegExp('^===+\\s*' + nation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*===+', 'm');
  const m = wt.match(re);
  if (!m) return null;
  const from = m.index + m[0].length;
  const nxt = wt.slice(from).search(/^==+[^=]/m);
  const seg = wt.slice(from, nxt > 0 ? from + nxt : wt.length);
  const rows = [...seg.matchAll(/\{\{nat fs (?:g )?player([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/gi)]
    .map((t) => {
      const n = nameField(t[1]);
      return n ? { name: n } : null;
    }).filter(Boolean);
  return rows;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const writes = [], held = [], guardHits = [];
  for (const t of TOURNAMENTS) {
    const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page='
      + encodeURIComponent(t.page), { headers: UA })).json();
    if (j.error) { held.push({ ...t, reason: 'page ' + j.error.code, cards: 0 }); console.log('  ' + t.page + ' , ' + j.error.code); continue; }
    const rows = squadOf(j.parse.wikitext['*'], t.nation);
    if (!rows) { held.push({ ...t, reason: 'nation heading not on the page', cards: 0 }); console.log('  ' + t.page + ' , no ' + t.nation + ' heading'); continue; }
    /*  A SQUAD IS 18 TO 30. Outside that the block is not a squad , the assertion replaces the
        club guard, which cannot apply to a tournament page.  */
    if (rows.length < 18 || rows.length > 30) {
      held.push({ ...t, reason: 'block is ' + rows.length + ' names, not a squad', cards: 0 });
      console.log('  ' + t.page + ' , block ' + rows.length + ' names'); continue;
    }
    // our candidate cards: anyone of that nationality holding a card, name-matched strictly
    const cand = [];
    let from = 0;
    for (;;) {
      const r = await sb.from('player_card_mv').select('api_player_id,player_name,nationality')
        .eq('nationality', t.nat).order('api_player_id', { ascending: true }).range(from, from + 999);
      if (r.error) { console.error(r.error.message); break; }
      (r.data || []).forEach((x) => cand.push(x));
      if (!r.data || r.data.length < 1000) break;
      from += 1000;
    }
    const byId = new Map();
    cand.forEach((c) => { if (!byId.has(c.api_player_id)) byId.set(c.api_player_id, c); });
    const ours = [...byId.values()];
    /*  THE SQUAD IS THE AUTHORITATIVE SET, SO IT IS THE ONE ITERATED , CORRECTED 2026-09-14.
        The first build ran it the other way, matching each of OUR players against the squad,
        and the output said it was wrong on its own face: SPAIN 2024 PRODUCED 27 ROWS FOR A
        26-MAN SQUAD and Brazil 2019 produced 25 for 23. Two of our players can match one
        squad row , two Spaniards called Rodri , so "more honours than squad members" was
        reachable, and each extra one is a FALSE CLAIM on somebody's card.
        IT ALSO MADE `ambiguous` MEANINGLESS: matching 1,211 Spanish players against 23 rows
        counts every unresolvable surname collision in the whole nationality, so Spain 2012
        reported 35 ambiguous when at most 23 players can be in the squad at all.
        THE CLUB JOB ITERATES CARDS AND THAT WAS RIGHT THERE for the opposite reason , a
        club-season is about 20 cards and the PAGE is the big set. Here the page is the small
        authoritative set and our nationality pool is the big one. Same rule, inverted inputs:
        iterate whichever side is the closed list.  */
    let matched = 0, norow = 0, amb = 0;
    for (const sq of rows) {
      const m = matchSquadRow(sq.name, ours);
      if (m.kind !== 'match') {
        if (m.kind === 'norow') norow++;
        else { amb++; held.push({ ...t, reason: 'ambiguous: ' + sq.name, cards: 0 }); }
        continue;
      }
      const c = m.row.ref;
      matched++;
      writes.push({ honour_type: t.type, season_year: t.year, league_code: null,
        team_name: null, api_player_id: c.api_player_id, player_name: c.player_name,
        source: 'wikipedia_continental', honour_context: t.nation + ' ' + t.year,
        page: t.page, matchedTo: sq.name });
    }
    /*  AN ASSERTION, NOT A HOPE: a squad of N cannot yield more than N honours. This is the
        check that would have caught the inverted build immediately instead of leaving it to
        be noticed in a printed table.  */
    if (matched > rows.length) { console.error('  IMPOSSIBLE: ' + matched + ' matches for a ' + rows.length + '-man squad'); process.exit(1); }
    console.log('  ' + (t.nation + ' ' + t.year).padEnd(18) + 'squad ' + String(rows.length).padStart(3) +
      '   our ' + String(ours.length).padStart(4) + '   matched ' + String(matched).padStart(3) +
      '   ambiguous ' + amb);
    await new Promise((x) => setTimeout(x, 150));
  }

  /*  THE NATIONALITY GUARD , REFUSE AND REPORT. Every write was produced by searching WITHIN
      one nationality, so a violation here means the query or the match crossed a nation, and
      that is a wrong PLAYER rather than a wrong honour. It has never fired in testing, which
      is why it prints its own scope: a guard that cannot be seen to fire is not evidence.  */
  const ids = [...new Set(writes.map((w) => w.api_player_id))];
  const nat = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const r = await sb.from('players').select('api_player_id,nationality').in('api_player_id', ids.slice(i, i + 200));
    (r.data || []).forEach((x) => nat.set(x.api_player_id, x.nationality));
  }
  const clean = writes.filter((w) => {
    const want = (TOURNAMENTS.find((t) => t.type === w.honour_type && t.year === w.season_year) || {}).nat;
    const got = nat.get(w.api_player_id);
    if (got && want && got !== want) { guardHits.push({ ...w, storedNationality: got, expected: want }); return false; }
    return true;
  });
  console.log('\n  proposed rows      : ' + writes.length);
  console.log('  NATIONALITY GUARD  : ' + guardHits.length + ' refused' + (guardHits.length ? ' , REPORTED BELOW, not dropped silently' : ' (checked ' + ids.length + ' players)'));
  guardHits.forEach((g) => console.log('     REFUSED ' + g.player_name + ' , stored ' + g.storedNationality + ', block was ' + g.expected));
  console.log('  clean rows         : ' + clean.length);

  fs.writeFileSync(path.join(DIR, 'proposed.json'), JSON.stringify({ clean, guardHits, held }, null, 2) + '\n');
  if (!APPLY) { console.log('\n  DRY RUN , nothing written. Add --apply.'); return; }

  // never overwrite: paginate the existence check, the 1000-row cap bit this project once already
  const existing = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('honours').select('api_player_id,honour_type,season_year')
        .in('api_player_id', slice).order('api_player_id', { ascending: true }).range(from, from + 999);
      if (error) { console.error('  EXISTENCE CHECK FAILED: ' + error.message); process.exit(1); }
      (data || []).forEach((r) => existing.add(r.api_player_id + '|' + r.honour_type + '|' + r.season_year));
      if (!data || data.length < 1000) break;
    }
  }
  const fresh = clean.filter((w) => !existing.has(w.api_player_id + '|' + w.honour_type + '|' + w.season_year));
  console.log('  inserting ' + fresh.length + ', skipping ' + (clean.length - fresh.length) + ' that already exist');
  for (let i = 0; i < fresh.length; i += 200) {
    const chunk = fresh.slice(i, i + 200).map((w) => ({ honour_type: w.honour_type, season_year: w.season_year,
      league_code: null, team_name: null, api_player_id: w.api_player_id, player_name: w.player_name,
      source: w.source, honour_context: w.honour_context }));
    const { error } = await sb.from('honours').insert(chunk);
    if (error) { console.error('  INSERT FAILED at ' + i + ': ' + error.message); process.exit(1); }
  }
  fs.appendFileSync(path.join(DIR, 'written.jsonl'), fresh.map((w) => JSON.stringify(w)).join('\n') + '\n');
  console.log('  WRITTEN ' + fresh.length + ' rows. Logged to written.jsonl.');
})();
