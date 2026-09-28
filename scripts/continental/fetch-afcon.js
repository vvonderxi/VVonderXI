/*  AFCON AS AN HONOUR , EIGHT EDITIONS. READ-ONLY UNLESS --apply.
    Scope and the measurements behind it: docs/AFCON_SCOPE.md.

    THIS IS `fetch-continental.js` WITH THREE CHANGES AND NOTHING ELSE RELAXED. The strict
    matcher, the squad-size assertion, the "matches cannot exceed squad size" assertion, the
    nationality guard, the paginated existence check and the never-overwrite insert are all
    carried across unchanged, because each of them is there for a recorded reason and an
    honour written onto the wrong card is a false CLAIM about a player, not a decoration.

    CHANGE 1 , A THIRD TEMPLATE FORM, AND IT IS WHY THREE EDITIONS READ AS EMPTY.
    The scope recorded 2010, 2013 and 2015 returning ZERO on both forms the continental job
    knows, on pages of 72 to 90 KB. Measured rather than guessed: those three use the older
    long-form `{{National football squad player}}`, 23 rows each, and they name their fields
    exactly as the modern forms do. So `nameField()` needed no change at all , only the
    template-name alternation did. **All eight editions extract: 8 of 8, 193 squad places.**

    CHANGE 2 , THE NATION IS KEYED BY ISO CODE, NOT BY THE STORED STRING.
    `players` has NO nationality id , checked against pg_attribute, the column is a bare
    string , so "by code" has to be built rather than read. Measured on the live table: Ivory
    Coast is stored THREE ways, `Côte d'Ivoire` x172, `CÃ´te d'Ivoire` x2 (UTF-8 bytes read as
    Latin-1) and `Ivory Coast` x1, and Ivory Coast wins TWO of these eight editions. A pass
    keyed on one spelling silently loses three players and reports a clean run.
    So every stored spelling is repaired, folded and mapped to an ISO-3166 alpha-3 code, and
    the candidate query fetches EVERY spelling that maps to the target code. The repair is
    exact rather than a lookup (latin1 bytes re-read as utf8) and was control-tested for
    idempotence on five strings including other diacritics before anything was built on it.

    CHANGE 3 , THE WINNER'S HEADING HAS ALIASES.
    The pages head Ivory Coast's block as `Ivory Coast`, not `Côte d'Ivoire`. Verified on both
    2015 and 2023 rather than assumed, and the alias list is tried in order with the one that
    matched reported, so a future page changing its heading shows up as a named miss rather
    than as a squad that vanished.  */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'), path = require('path');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const UA = { 'User-Agent': 'VVonderXI/1.0 (afcon honours; contact hello@vvonderxi.com)' };
const DIR = path.join(__dirname, '../../migrations/afcon_honours_2026-09-28');
const APPLY = process.argv.includes('--apply');

/*  `year` IS THE TOURNAMENT YEAR AND BECOMES season_year, matching how the 93 world_cup_winner
    and 180 continental rows are stored. AFCON 2021 was PLAYED in January 2022 and AFCON 2023
    in January 2024; both are dated to the edition's own name, which is how the record names
    them and how a reader would search. The page title carries the same year.  */
const EDITIONS = [
  { year: 2010, code: 'EGY', heads: ['Egypt'],                                  page: '2010 Africa Cup of Nations squads' },
  { year: 2012, code: 'ZMB', heads: ['Zambia'],                                 page: '2012 Africa Cup of Nations squads' },
  { year: 2013, code: 'NGA', heads: ['Nigeria'],                                page: '2013 Africa Cup of Nations squads' },
  { year: 2015, code: 'CIV', heads: ['Ivory Coast', "Côte d'Ivoire", "Cote d'Ivoire"], page: '2015 Africa Cup of Nations squads' },
  { year: 2017, code: 'CMR', heads: ['Cameroon'],                                page: '2017 Africa Cup of Nations squads' },
  { year: 2019, code: 'DZA', heads: ['Algeria'],                                 page: '2019 Africa Cup of Nations squads' },
  { year: 2021, code: 'SEN', heads: ['Senegal'],                                 page: '2021 Africa Cup of Nations squads' },
  { year: 2023, code: 'CIV', heads: ['Ivory Coast', "Côte d'Ivoire", "Cote d'Ivoire"], page: '2023 Africa Cup of Nations squads' },
];

/*  ── THE NATIONALITY CODE ──────────────────────────────────────────────────────────────
    `repair` undoes one specific corruption: a UTF-8 byte sequence that was read as Latin-1.
    It is exact, not a guess, and it is IDEMPOTENT , control-tested on Senegal, Côte d'Ivoire,
    Guinea-Bissau, Curaçao and Türkiye, all stable across two passes, none damaged. A string
    that does not round-trip cleanly is returned untouched rather than mangled.  */
const repair = (s) => {
  try { const d = Buffer.from(String(s), 'latin1').toString('utf8');
        return d.includes('�') ? String(s) : d; } catch (e) { return String(s); }
};
const fold = (s) => repair(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
/*  ONLY THE NATIONS THIS JOB TOUCHES. A full ISO table would be a second, unmaintained copy
    of a standard; this names the seven it needs, and `codeOf` returns null for everything
    else so an unmapped spelling is a REPORTED miss rather than a silent wrong bucket.  */
const CODE_BY_FOLD = {
  'egypt': 'EGY', 'zambia': 'ZMB', 'nigeria': 'NGA', 'cameroon': 'CMR',
  'algeria': 'DZA', 'senegal': 'SEN',
  'cote d ivoire': 'CIV', 'ivory coast': 'CIV', 'cote divoire': 'CIV',
};
const codeOf = (nat) => CODE_BY_FOLD[fold(nat)] || null;

// ── the strict matcher, ported verbatim from the continental job ──────────────────────
const nfold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/gi, 'i')
  .toLowerCase().replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();
const PART = new Set(['van', 'der', 'den', 'de', 'di', 'da', 'del', 'le', 'la', 'von', 'ten', 'ter']);
function split(n) {
  const t = nfold(n).split(' ').filter(Boolean);
  if (t.length <= 1) return { fore: '', sur: t[0] || '' };
  let i = t.length - 1; while (i > 0 && PART.has(t[i - 1])) i--;
  return { fore: t.slice(0, i).join(' '), sur: t.slice(i).join(' ') };
}
const isAb = (n) => /^[A-Z]\.\s/.test(String(n).trim());
/*  THE ALLOWANCE BELONGS TO OUR SIDE: an ABBREVIATED name of ours may match on the initial, a
    FULL name of ours must match in full, and anything else sharing a surname is AMBIGUOUS and
    is HELD. SEC C records three wrong-player matches from relaxing exactly this.  */
function matchSquadRow(squadName, ourPlayers) {
  const q = split(squadName);
  const sur = ourPlayers.filter((c) => split(c.player_name).sur === q.sur);
  if (!sur.length) return { kind: 'norow' };
  const hits = sur.filter((c) => {
    const o = split(c.player_name);
    if (!o.fore || !q.fore) return true;
    if (isAb(c.player_name)) return o.fore.charAt(0) === q.fore.charAt(0);
    return o.fore === q.fore || o.fore.split(' ')[0] === q.fore.split(' ')[0];
  });
  if (hits.length !== 1) return { kind: 'ambiguous' };
  return { kind: 'match', row: { ref: hits[0] } };
}

/*  `nameField` IS UNCHANGED FROM THE CONTINENTAL JOB and handles all three template forms,
    which was verified on a real row from each before this was written: a bare link
    (`|name=[[Essam El-Hadary]]`), a piped link (`|club=[[K.S.C. ...|Lokeren]]`) and a sort
    template (`|name={{sortname|Seny|Dieng}}`). Brace depth, then unwind the two wrappers.  */
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

/*  THREE TEMPLATE FORMS, and the third is the whole reason the scope reported three empty
    editions. `nat fs player` (2012, 2017, 2019), `nat fs g player` (2021, 2023) and the older
    `National football squad player` (2010, 2013, 2015). Case-insensitive because the pages
    capitalise it inconsistently within one article.  */
const ROW_RE = /\{\{\s*(?:nat fs (?:g )?player|national football squad player)([^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)\}\}/gi;
function squadOf(wt, heads) {
  for (const h of heads) {
    const re = new RegExp('^===+\\s*' + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*===+', 'm');
    const m = wt.match(re);
    if (!m) continue;
    const from = m.index + m[0].length;
    const nxt = wt.slice(from).search(/^==+[^=]/m);
    const seg = wt.slice(from, nxt > 0 ? from + nxt : wt.length);
    const rows = [...seg.matchAll(ROW_RE)].map((t) => {
      const n = nameField(t[1]); return n ? { name: n } : null;
    }).filter(Boolean);
    return { head: h, rows };
  }
  return null;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });

  /*  BUILD THE SPELLING->CODE MAP FROM THE LIVE TABLE, ONCE. This is what makes the pass
      code-keyed rather than string-keyed: the CODE decides which spellings to fetch, instead
      of one spelling being assumed to be the only one.  */
  const spellings = new Map();                       // code -> Set(stored spelling)
  const seen = new Set();
  for (let from = 0; ; from += 1000) {
    const r = await sb.from('players').select('nationality').order('api_player_id', { ascending: true }).range(from, from + 999);
    if (r.error) { console.error(r.error.message); process.exit(1); }
    (r.data || []).forEach((x) => {
      if (x.nationality == null || seen.has(x.nationality)) return;
      seen.add(x.nationality);
      const c = codeOf(x.nationality);
      if (!c) return;
      if (!spellings.has(c)) spellings.set(c, new Set());
      spellings.get(c).add(x.nationality);
    });
    if (!r.data || r.data.length < 1000) break;
  }
  console.log('NATIONALITY CODES , every stored spelling that maps to one:');
  for (const [c, set] of [...spellings].sort()) console.log('  ' + c + '  ' + [...set].map((s) => JSON.stringify(s)).join('  '));
  console.log();

  const writes = [], held = [], guardHits = [], extraction = [];
  for (const e of EDITIONS) {
    const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page='
      + encodeURIComponent(e.page), { headers: UA })).json();
    if (j.error) { held.push({ ...e, reason: 'page ' + j.error.code }); extraction.push({ year: e.year, squad: 0, why: 'page ' + j.error.code }); continue; }
    const s = squadOf(j.parse.wikitext['*'], e.heads);
    if (!s) { held.push({ ...e, reason: 'no heading, tried ' + e.heads.join(' / ') }); extraction.push({ year: e.year, squad: 0, why: 'no heading' }); continue; }
    /*  A SQUAD IS 18 TO 30. Outside that the block is not a squad , the assertion that
        replaces the club guard, which cannot apply to a tournament page.  */
    if (s.rows.length < 18 || s.rows.length > 30) {
      held.push({ ...e, reason: 'block is ' + s.rows.length + ' names, not a squad' });
      extraction.push({ year: e.year, squad: s.rows.length, why: 'not a squad size' }); continue;
    }
    extraction.push({ year: e.year, code: e.code, head: s.head, squad: s.rows.length });

    // candidates: EVERY stored spelling that maps to this edition's code
    const wantSpellings = [...(spellings.get(e.code) || [])];
    const cand = [];
    for (let from = 0; ; from += 1000) {
      const r = await sb.from('player_card_mv').select('api_player_id,player_name,nationality')
        .in('nationality', wantSpellings).order('api_player_id', { ascending: true }).range(from, from + 999);
      if (r.error) { console.error(r.error.message); break; }
      (r.data || []).forEach((x) => cand.push(x));
      if (!r.data || r.data.length < 1000) break;
    }
    const byId = new Map();
    cand.forEach((c) => { if (!byId.has(c.api_player_id)) byId.set(c.api_player_id, c); });
    const ours = [...byId.values()];

    /*  ITERATE THE SQUAD, NOT OUR POOL. The squad is the closed authoritative set; our
        nationality pool is the big one. The continental job was built the other way first and
        produced 27 rows for a 26-man squad , each extra one a false claim on a card.  */
    let matched = 0, norow = 0, amb = 0;
    for (const sq of s.rows) {
      const m = matchSquadRow(sq.name, ours);
      if (m.kind !== 'match') {
        if (m.kind === 'norow') norow++;
        else { amb++; held.push({ ...e, reason: 'ambiguous: ' + sq.name }); }
        continue;
      }
      const c = m.row.ref;
      matched++;
      writes.push({ honour_type: 'afcon_winner', season_year: e.year, league_code: null,
        team_name: null, api_player_id: c.api_player_id, player_name: c.player_name,
        source: 'wikipedia_continental', honour_context: s.head + ' ' + e.year,
        page: e.page, matchedTo: sq.name, code: e.code });
    }
    if (matched > s.rows.length) { console.error('  IMPOSSIBLE: ' + matched + ' matches for a ' + s.rows.length + '-man squad'); process.exit(1); }
    console.log('  ' + (s.head + ' ' + e.year).padEnd(20) + e.code + '  squad ' + String(s.rows.length).padStart(3) +
      '   our ' + String(ours.length).padStart(4) + '   matched ' + String(matched).padStart(3) +
      '   norow ' + String(norow).padStart(3) + '   ambiguous ' + amb);
    await new Promise((x) => setTimeout(x, 180));
  }

  console.log('\nEXTRACTION , ' + extraction.filter((x) => x.squad >= 18).length + ' of ' + EDITIONS.length + ' editions read a squad cleanly');
  extraction.forEach((x) => console.log('   ' + x.year + '  ' + String(x.squad).padStart(3) + ' names' + (x.why ? '   ' + x.why : '   ' + x.code + ' via "' + x.head + '"')));

  /*  THE NATIONALITY GUARD , REFUSE AND REPORT, NOW ON CODES. Every write came from a query
      scoped to one code, so a violation means the match crossed a nation , a wrong PLAYER,
      not a wrong honour. Comparing CODES rather than strings is what lets it see through the
      three Ivory Coast spellings instead of refusing two correct players.  */
  const ids = [...new Set(writes.map((w) => w.api_player_id))];
  const nat = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const r = await sb.from('players').select('api_player_id,nationality').in('api_player_id', ids.slice(i, i + 200));
    (r.data || []).forEach((x) => nat.set(x.api_player_id, x.nationality));
  }
  const clean = writes.filter((w) => {
    const got = codeOf(nat.get(w.api_player_id));
    if (got && got !== w.code) { guardHits.push({ ...w, storedNationality: nat.get(w.api_player_id), storedCode: got }); return false; }
    return true;
  });
  console.log('\n  proposed rows      : ' + writes.length);
  console.log('  NATIONALITY GUARD  : ' + guardHits.length + ' refused' + (guardHits.length ? ' , REPORTED BELOW, not dropped silently' : ' (checked ' + ids.length + ' players against their code)'));
  guardHits.forEach((g) => console.log('     REFUSED ' + g.player_name + ' , stored ' + JSON.stringify(g.storedNationality) + ' (' + g.storedCode + '), block was ' + g.code));
  console.log('  clean rows         : ' + clean.length);

  fs.writeFileSync(path.join(DIR, 'proposed.json'), JSON.stringify({ extraction, clean, guardHits, held }, null, 2) + '\n');
  if (!APPLY) { console.log('\n  DRY RUN , nothing written. Add --apply.'); return; }

  // never overwrite: the existence check is PAGINATED, the 1000-row cap bit this project once already
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
