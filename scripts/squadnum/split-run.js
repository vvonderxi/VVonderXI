/*  SQUAD NUMBERS FOR THE SPLIT HALVES , RETRIEVAL ONLY. IT WRITES NOTHING TO THE DATABASE.
    ========================================================================================
    Sitting 2 step 1. It answers one question , which of the 1,657 halves can be given a
    CLUB-SPECIFIC shirt number , and it is deliberately separated from the write because it
    reads external pages and has its own failure modes. Tangling the two would give a surprise
    in the diff two possible causes instead of one, which is the reason `backfill.js` refused to
    adjudicate multi-block pages during a write.

      node scripts/squadnum/split-run.js                 # every club-season the halves need
      node scripts/squadnum/split-run.js --limit 12      # a pilot
      node scripts/squadnum/split-run.js --only PL|2025|Manchester City

    IT REUSES THE PIPELINE RATHER THAN REIMPLEMENTING IT. `resolve` + `gate` for the page,
    `extract` for the roster, and `matchOne` for identity , all imported, none copied. The
    matcher in particular has already produced a wrong-PLAYER match once (Diego Lopez to David
    Lopez), and a second copy of that rule is the drift SS C records against `careerStageTags`.
    `backfill.js` now exports it and guards its own run behind `require.main`.

    WHY IT CANNOT JUST BE `backfill.js --size=...`: that job's `targets()` is hardcoded to
    `season_year 2010..2015 AND shirt_number IS NULL`. **Both clauses exclude this work** , 617
    of the 1,073 club-seasons are 2016 or later, and every new half already carries an inherited
    number, so the null filter would skip exactly the cards this exists to fix.

    ITS LEDGERS ARE ITS OWN , `migrations/squad_numbers_split_2026-09-22/`. The 2026-09-14
    ledgers are the record of a job that ran and must not gain rows from a different one.
*/
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { resolve } = require('./resolve.js');
const { gate, reviewFlag } = require('./resolve-guard.js');
const { extract, looksLikeNames } = require('./extract.js');
const { matchOne } = require('./backfill.js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const UA = { 'User-Agent': 'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)' };
const DIR = path.join(__dirname, '..', '..', 'migrations', 'squad_numbers_split_2026-09-22');
const FOUND = path.join(DIR, 'found.jsonl'), HELD = path.join(DIR, 'held.jsonl'), DONE = path.join(DIR, 'done.json');
const SPLIT = path.join(__dirname, '..', '..', 'migrations', 'halved_split_2026-09-21', 'written.jsonl');
const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function targets() {
  const led = fs.readFileSync(SPLIT, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const ids = [...new Set(led.flatMap(l => [l.new_card_id, l.sibling_card_id]))];
  let rows = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,api_player_id,player_name,team_name,season_year,league_code,shirt_number')
      .in('card_id', ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows = rows.concat(data);
  }
  const by = {};
  rows.forEach(c => { const k = `${c.league_code}|${c.season_year}|${c.team_name}`; (by[k] = by[k] || []).push(c); });
  return Object.entries(by).sort();
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const done = fs.existsSync(DONE) ? new Set(JSON.parse(fs.readFileSync(DONE, 'utf8'))) : new Set();
  let all = await targets();
  const only = arg('--only');
  if (only) all = all.filter(([k]) => k === only);
  else all = all.filter(([k]) => !done.has(k));
  const lim = +arg('--limit') || 0; if (lim) all = all.slice(0, lim);
  console.log(`${all.length} club-seasons to resolve${done.size ? ` (${done.size} already done)` : ''}`);

  const stats = { clubseasons: 0, cards: 0, resolved: 0, parsed: 0, matched: 0,
                  held: { norow: 0, ambiguous: 0 }, zeroMatch: 0 };
  const heldLog = [], found = [], flags = [];
  const skip = (key, reason, cards, title, wiki, extra) => {
    heldLog.push({ key, reason, cards, title: title || null, wiki: wiki || null, ...(extra || {}), at: new Date().toISOString() });
  };

  for (const [key, cards] of all) {
    const [lg, yr, club] = key.split('|');
    stats.clubseasons++; stats.cards += cards.length;
    let r;
    try { r = await resolve(club, lg, Number(yr), gate); }
    catch (e) { skip(key, 'resolve threw: ' + e.message, cards.length); continue; }
    if (!r || !r.title) { skip(key, 'no page', cards.length); done.add(key); continue; }
    stats.resolved++;
    let p;
    try { p = await (await fetch(`https://${r.wiki}.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page=`
          + encodeURIComponent(r.title), { headers: UA })).json(); }
    catch (e) { skip(key, 'fetch failed', cards.length, r.title, r.wiki); continue; }
    if (p.error) { skip(key, 'api ' + p.error.code, cards.length, r.title, r.wiki); done.add(key); continue; }
    const blocks = extract(p.parse.wikitext['*']);
    if (!blocks.length) { skip(key, 'no squad block', cards.length, r.title, r.wiki); done.add(key); continue; }
    if (blocks.length > 1) { skip(key, blocks.length + ' blocks, held for adjudication', cards.length, r.title, r.wiki); done.add(key); continue; }
    const rows = blocks[0].rows;
    const nums = rows.map(x => Number(x.no)).filter(n => n >= 1 && n <= 99);
    const distinct = new Set(nums).size, repeated = nums.length - distinct;
    const namesOK = looksLikeNames(rows.map(x => x.name));
    if (!namesOK || (distinct > 0 && repeated / distinct > 0.5)) {
      skip(key, namesOK ? 'most numbers repeat, extraction suspect' : 'rows do not read as names',
           cards.length, r.title, r.wiki, { rosterSize: rows.length });
      done.add(key); continue;
    }
    stats.parsed++;
    const fl = reviewFlag(club, r.title); if (fl) flags.push(key + ' , ' + fl);

    let hereMatched = 0;
    for (const c of cards) {
      const m = matchOne(c.player_name, rows);
      if (m.kind !== 'match') { stats.held[m.kind] = (stats.held[m.kind] || 0) + 1; continue; }
      const n = Number(m.row.no);
      if (!(n >= 1 && n <= 99)) { stats.held.norow++; continue; }
      stats.matched++; hereMatched++;
      found.push({ card_id: c.card_id, api_player_id: c.api_player_id, season_year: c.season_year,
                   league_code: c.league_code, club, shirt_number: n, inherited_now: c.shirt_number,
                   name: c.player_name, page_row: m.row.name, title: r.title, wiki: r.wiki,
                   at: new Date().toISOString() });
    }
    /*  PARSED AND MATCHED NOTHING IS A GUARD, NOT A GAP , SS C. It is the only instrument that
        has ever caught a RANK TABLE being read as a squad, and it must never be closed by
        loosening the matcher. It carries both name lists so the mismatch reads without a refetch. */
    if (hereMatched === 0) {
      stats.zeroMatch++;
      skip(key, 'parsed, zero cards matched', cards.length, r.title, r.wiki,
           { rosterSize: rows.length, ourNames: cards.map(c => c.player_name), pageNames: rows.slice(0, 12).map(x => x.name) });
    }
    done.add(key);

    if (found.length) { fs.appendFileSync(FOUND, found.splice(0).map(x => JSON.stringify(x)).join('\n') + '\n'); }
    if (heldLog.length >= 20) { fs.appendFileSync(HELD, heldLog.splice(0).map(x => JSON.stringify(x)).join('\n') + '\n'); }
    fs.writeFileSync(DONE, JSON.stringify([...done]) + '\n');
    if (stats.clubseasons % 50 === 0) console.log(`  ${stats.clubseasons}/${all.length}  resolved ${stats.resolved} parsed ${stats.parsed} matched ${stats.matched} zero-match ${stats.zeroMatch}`);
    await sleep(350);
  }
  if (found.length) fs.appendFileSync(FOUND, found.map(x => JSON.stringify(x)).join('\n') + '\n');
  if (heldLog.length) fs.appendFileSync(HELD, heldLog.map(x => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync(DONE, JSON.stringify([...done]) + '\n');
  console.log('\n' + JSON.stringify(stats, null, 2));
  if (flags.length) console.log('\nREVIEW FLAGS (not refusals):\n  ' + flags.join('\n  '));
  console.log('\nNOTHING WAS WRITTEN TO THE DATABASE.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
