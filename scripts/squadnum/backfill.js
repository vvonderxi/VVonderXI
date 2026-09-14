/*  ── THE SQUAD-NUMBER BACKFILL , ONE BATCH AT A TIME ─────────────────────────────────────
    Unit is the CLUB-SEASON, never the card: a squad where 18 of 20 have numbers reads as a
    squad and 8 of 20 reads as an outage, so completing one club beats spreading across many.
    ORDER IS WORST-COVERED FIRST , PRT, BPL, TR, ERE. Learning the method fails on Portugal at
    batch 1 is cheaper than learning it at batch 18, and if those leagues come back near-empty
    that is a finding rather than a failure.  */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { resolve } = require('./resolve.js');
const { gate, reviewFlag } = require('./resolve-guard.js');
const { extract, looksLikeNames } = require('./extract.js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const UA = { 'User-Agent': 'VVonderXI-squadnum/1.0 (hello@vvonderxi.com)' };
const DIR = path.join(__dirname, '..', '..', 'migrations', 'squad_numbers_2026-09-14');
const APPLY = process.argv.includes('--apply');
const SIZE = Number((process.argv.find((a) => a.startsWith('--size=')) || '--size=50').split('=')[1]);
const ORDER = ['PRT', 'BPL', 'TR', 'ERE', 'L1', 'LL', 'SA', 'BL', 'PL'];

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

/*  THE STRICT MATCHER , an abbreviated name of ours may match on an initial, a FULL name must
    match in full, anything else sharing a surname is AMBIGUOUS and is HELD. Letting a full
    forename fall back to its initial matched Diego Lopez to David Lopez on the pilot , wrong
    PLAYER, not wrong number, and it reported as a data disagreement.  */
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

async function targets() {
  const all = []; let from = 0;
  for (;;) {
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,api_player_id,player_name,team_name,season_year,league_code')
      .gte('season_year', 2010).lte('season_year', 2015).is('shirt_number', null)
      .order('card_id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    all.push(...data); if (data.length < 1000) break; from += 1000;
  }
  const by = {};
  all.forEach((c) => { const k = c.league_code + '|' + c.season_year + '|' + c.team_name; (by[k] = by[k] || []).push(c); });
  return Object.entries(by).sort((a, b) => {
    const la = ORDER.indexOf(a[0].split('|')[0]), lb = ORDER.indexOf(b[0].split('|')[0]);
    return la !== lb ? la - lb : a[0].localeCompare(b[0]);
  });
}

(async () => {
  const done = fs.existsSync(path.join(DIR, 'clubseasons-done.json'))
    ? new Set(JSON.parse(fs.readFileSync(path.join(DIR, 'clubseasons-done.json'), 'utf8'))) : new Set();
  const all = await targets();
  /*  ── RE-PROCESS A HELD REASON , `--redo=<reason substring>` ──────────────────────────
      A club-season refused by a guard that later turns out to be WRONG is not reachable by
      a normal run: it sits in `clubseasons-done.json` and is filtered out forever. Rather
      than editing that ledger by hand , which would lose the record that it was ever held ,
      this reads `held.jsonl`, takes the club-seasons whose reason matches, and runs only
      those. BOTH LEDGERS STAY APPEND-ONLY, so the history reads correctly afterwards: the
      club-season was held for a reason, the reason was withdrawn, and the rows arrived on a
      later batch.  */
  const REDO = (process.argv.find((a) => a.startsWith('--redo=')) || '').split('=')[1];
  let batch;
  if (REDO) {
    const held = fs.readFileSync(path.join(DIR, 'held.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const want = new Set(held.filter((h) => h.reason.includes(REDO)).map((h) => h.key));
    batch = all.filter(([k]) => want.has(k)).slice(0, SIZE);
    console.log('REDO "' + REDO + '": ' + want.size + ' club-seasons held under it, running ' + batch.length + '\n');
  } else {
    batch = all.filter(([k]) => !done.has(k)).slice(0, SIZE);
  }
  if (!REDO) console.log((APPLY ? 'BATCH' : 'DRY RUN') + ': ' + batch.length + ' club-seasons of ' + all.length + ' remaining\n');

  /*  SKIPS ARE STRUCTURED AND CARRY THEIR CARD COUNT , 2026-09-14. They used to be a
      sentence per club-season, which reads fine in a terminal and cannot be counted: it
      could not say how many CARDS a skip costs, and the cost is the whole reason the
      second pass exists. `skipSeason` records the key, the reason, the card count and the
      resolved page, and appends to `held.jsonl` so the list ACCUMULATES across batches
      instead of living in whichever stats file was written last.
      THE HELD SET IS A COMMISSION, NOT A RESIDUE. It is the entire scope of the Fable job
      that follows this backfill, so it has to arrive as a list with counts and reasons
      rather than as whatever the terminal happened to print.  */
  const stats = { clubSeasons: batch.length, resolved: 0, parsed: 0, cards: 0, matched: 0, held: { norow: 0, ambiguous: 0 }, written: 0, skipped: [], skippedCards: 0 };
  const heldLog = [];
  const skipSeason = (key, reason, cardCount, title, wiki) => {
    stats.skipped.push(key + ' , ' + reason);
    stats.skippedCards += cardCount;
    heldLog.push({ key, reason, cards: cardCount, title: title || null, wiki: wiki || null,
                   batch: null, at: new Date().toISOString() });
  };
  const writes = [], flags = [];
  for (const [key, cards] of batch) {
    const [lg, yr, club] = key.split('|');
    stats.cards += cards.length;
    const r = await resolve(club, lg, Number(yr), gate);
    if (!r.title) { skipSeason(key, 'no page', cards.length); continue; }
    stats.resolved++;
    let p; try { p = await (await fetch(`https://${r.wiki}.wikipedia.org/w/api.php?format=json&action=parse&prop=wikitext&page=` + encodeURIComponent(r.title), { headers: UA })).json(); }
    catch (e) { skipSeason(key, 'fetch failed', cards.length, r.title, r.wiki); continue; }
    if (p.error) { skipSeason(key, 'api ' + p.error.code, cards.length, r.title, r.wiki); continue; }
    const blocks = extract(p.parse.wikitext['*']);
    if (!blocks.length) { skipSeason(key, 'no squad block', cards.length, r.title, r.wiki); continue; }
    /*  MANY BLOCKS ARE HELD FOR FABLE, NOT GUESSED AT , it buys yield and nothing in
        precision, and running it during the backfill would put two sources of change in one
        write, so a surprise in the diff would have two possible causes instead of one.  */
    if (blocks.length > 1) { skipSeason(key, blocks.length + ' blocks, held for adjudication', cards.length, r.title, r.wiki); continue; }
    const rows = blocks[0].rows;
    /*  ── WHAT THE OLD DUPLICATE GUARD GOT WRONG , REPLACED 2026-09-14 ──────────────────
        IT REFUSED ANY BLOCK WHOSE NUMBERS REPEATED, AND THAT IS THREE MISTAKES AT ONCE.
        (1) A REPEATED NUMBER ON A SEASON ROSTER IS REAL DATA. A shirt freed in January is
            reissued, so two genuine squad members share it. All 14 sampled cases were this
            shape , Trabzonspor 2011 #28 Celustka and Adin, Besiktas 2012 #7 Dentinho and
            Quaresma , and NONE was a parser fault. The guard was refusing correct pages.
        (2) THE NUMBER IS NOT WHAT THE MATCH CONSULTS, SO A COLLISION CANNOT MISLEAD IT.
            `matchOne` filters rows by SURNAME, then by forename, and requires exactly one
            hit; it reads `.no` only AFTER a unique name match. Two rows sharing #21 under
            different names resolve independently and both are correct. The guard was
            protecting a column the matcher never uses to decide anything.
        (3) IT DID NOT CATCH THE THING IT EXISTED FOR. The shape worth refusing is a parser
            that has wandered into a STATISTICS table , the Heerenveen top-scorers block,
            where the "numbers" are goal tallies. Those are DISTINCT by construction, so the
            duplicate test passes them. It refused the safe case and admitted the dangerous
            one.
        WHAT REPLACES IT IS A TEST OF THE EXTRACTION, NOT OF THE NUMBERS: names that do not
        read as names, or MOST of the distinct numbers repeating, which is what a fixture or
        results table looks like. A handful of repeats among plausible names is a squad.
        THE REMAINING EXPOSURE IS NAMED RATHER THAN IMPLIED: a stats table whose rows are
        distinct and name-like still passes, which is exactly the Heerenveen case. The guard
        for that one is the ZERO-MATCH signal, not this test , see CLAUDE.md SS C.  */
    const nums = rows.map((x) => x.no);
    const distinct = new Set(nums).size;
    const repeated = nums.length - distinct;
    const namesOK = looksLikeNames(rows.map((x) => x.name));
    if (!namesOK || (distinct > 0 && repeated / distinct > 0.5)) {
      const seen = {}, dupes = [];
      rows.forEach((x) => { if (seen[x.no]) dupes.push({ no: x.no, names: [seen[x.no], x.name] }); else seen[x.no] = x.name; });
      skipSeason(key, namesOK ? 'most numbers repeat, extraction suspect' : 'rows do not read as names',
                 cards.length, r.title, r.wiki);
      heldLog[heldLog.length - 1].dupes = dupes;
      heldLog[heldLog.length - 1].rosterSize = rows.length;
      continue;
    }
    stats.parsed++;
    const fl = reviewFlag(club, r.title); if (fl) flags.push(key + ' , ' + fl);
    let matchedHere = 0;
    for (const c of cards) {
      const m = matchOne(c.player_name, rows);
      if (m.kind !== 'match') { stats.held[m.kind]++; continue; }
      const n = Number(m.row.no);
      if (!(n >= 1 && n <= 99)) { stats.held.norow++; continue; }
      stats.matched++; matchedHere++;
      writes.push({ api_player_id: c.api_player_id, season_year: c.season_year, league_code: c.league_code,
        shirt_number: n, card_id: c.card_id, name: c.player_name, page: m.row.name, club, title: r.title, wiki: r.wiki });
    }
    /*  PARSED AND MATCHED NOTHING IS A THIRD OUTCOME, AND IT WAS INVISIBLE , 2026-09-14.
        A club-season either skipped (in held.jsonl) or produced rows (in written.jsonl) ,
        except when the page parsed cleanly and NOT ONE card matched a row. That left it in
        neither ledger, and `held-report.js`'s reconciliation is what found it: attempted 350
        against held 245 + produced 103, a gap of two, ADO Den Haag and Heerenveen 2010.
        IT IS A DIFFERENT PROBLEM FROM A MISSING PAGE AND MUST ROUTE DIFFERENTLY. The page is
        there, the block is there, the roster parsed , what failed is NAME MATCHING across
        every card in the club-season, which points at a naming convention the matcher does
        not handle rather than at a source gap. That is a matcher question, not Fable's.  */
    if (matchedHere === 0 && cards.length) {
      skipSeason(key, 'parsed, zero cards matched', cards.length, r.title, r.wiki);
      heldLog[heldLog.length - 1].rosterSize = rows.length;
      heldLog[heldLog.length - 1].sampleOurs = cards.slice(0, 3).map((c) => c.player_name);
      heldLog[heldLog.length - 1].samplePage = rows.slice(0, 3).map((x) => x.name);
    }
    await new Promise((x) => setTimeout(x, 90));
  }

  const pc = (a, b) => (b ? (100 * a / b).toFixed(1) + '%' : 'n/a');
  console.log('  club-seasons   ' + stats.clubSeasons + '   resolved ' + stats.resolved + '   parsed ' + stats.parsed);
  console.log('  cards in scope ' + stats.cards);
  console.log('  matched        ' + stats.matched + '   (' + pc(stats.matched, stats.cards) + ' YIELD)');
  console.log('  held: no row ' + stats.held.norow + ', ambiguous ' + stats.held.ambiguous);
  console.log('  skipped club-seasons: ' + stats.skipped.length + '   (' + stats.skippedCards + ' cards held)');
  stats.skipped.slice(0, 14).forEach((s) => console.log('     ' + s));
  if (flags.length) { console.log('  REVIEW FLAGS:'); flags.forEach((f) => console.log('     ' + f)); }

  if (!APPLY) { console.log('\n  DRY RUN , nothing written. Add --apply.'); 
    fs.writeFileSync(path.join(DIR, 'batch1-dryrun.json'), JSON.stringify({ stats, sample: writes.slice(0, 10) }, null, 2) + '\n');
    return; }

  /*  NEVER OVERWRITE , every key is checked for an existing row first. These are inserts and
      the rollback is a delete of exactly what was inserted; an update would make that false.
      THIS CHECK WAS SILENTLY INCOMPLETE UNTIL 2026-09-14 AND BATCH 14 IS HOW WE FOUND OUT.
      It queried `.in('api_player_id', <300 ids>)` with no pagination, and PostgREST CAPS A
      RESPONSE AT 1000 ROWS BY DEFAULT , the exact trap CLAUDE.md SS C records. A player has one
      `player_positions` row per season per league, so 300 ids routinely exceed 1000 rows and
      the tail was DISCARDED WITH NO ERROR. Measured on this database: 133 ids returned exactly
      1000 against 1001 that exist.
      SO THE GUARD WAS CHECKING WHATEVER FIT, AND ITS COMMENT SAID "EVERY KEY".
      THE FAILURE IS FAIL-SAFE AND THAT IS WHY IT SURVIVED THIRTEEN BATCHES: a truncated
      `existing` set marks FEWER keys as taken, so more rows are attempted, and a genuine
      collision is then refused by the primary key , loudly, aborting the batch before any
      write. It can never overwrite. Batch 14 was simply the first batch whose players carried
      enough history to cross the cap.
      THE FIX IS TO PAGINATE UNTIL A PAGE COMES BACK SHORT, not to raise the chunk size, which
      only moves the cliff. A page of exactly 1000 is the signal that there is more.  */
  const keys = writes.map((w) => w.api_player_id);
  const existing = new Set();
  for (let i = 0; i < keys.length; i += 300) {
    const slice = keys.slice(i, i + 300);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('player_positions')
        .select('api_player_id,season_year,league_code')
        .in('api_player_id', slice)
        .order('api_player_id', { ascending: true })
        .order('season_year', { ascending: true })
        .order('league_code', { ascending: true })
        .range(from, from + 999);
      if (error) { console.error('  EXISTENCE CHECK FAILED: ' + error.message); process.exit(1); }
      (data || []).forEach((r) => existing.add(r.api_player_id + '|' + r.season_year + '|' + r.league_code));
      if (!data || data.length < 1000) break;
    }
  }
  /*  AND THE INSERT NO LONGER TRUSTS IT BLINDLY , a PK violation now reports which key
      collided rather than only that one did, because "duplicate key" with no key is what made
      this take a database scan to diagnose.  */
  const fresh = writes.filter((w) => !existing.has(w.api_player_id + '|' + w.season_year + '|' + w.league_code));
  console.log('\n  would insert ' + fresh.length + ', skipping ' + (writes.length - fresh.length) + ' that already have a row');
  for (let i = 0; i < fresh.length; i += 200) {
    const chunk = fresh.slice(i, i + 200).map((w) => ({ api_player_id: w.api_player_id, season_year: w.season_year, league_code: w.league_code, shirt_number: w.shirt_number }));
    const { error } = await sb.from('player_positions').insert(chunk);
    if (error) {
      console.error('  INSERT FAILED at ' + i + ': ' + error.message);
      if (/duplicate key/.test(error.message || '')) {
        const probe = await sb.from('player_positions').select('api_player_id,season_year,league_code')
          .in('api_player_id', chunk.map((c) => c.api_player_id));
        const have = new Set((probe.data || []).map((r) => r.api_player_id + '|' + r.season_year + '|' + r.league_code));
        const hits = chunk.filter((c) => have.has(c.api_player_id + '|' + c.season_year + '|' + c.league_code));
        console.error('  COLLIDING KEYS (' + hits.length + '): ' + JSON.stringify(hits.slice(0, 10)));
      }
      process.exit(1);
    }
    stats.written += chunk.length;
  }
  fs.appendFileSync(path.join(DIR, 'written.jsonl'), fresh.map((w) => JSON.stringify(w)).join('\n') + '\n');
  fs.writeFileSync(path.join(DIR, 'clubseasons-done.json'), JSON.stringify([...done, ...batch.map(([k]) => k)], null, 1) + '\n');
  /*  PER-BATCH STATS, NOT ONE FILE OVERWRITTEN EVERY RUN , FIXED 2026-09-14.
      This wrote a FIXED `batch1-stats.json` on every batch, so batch 2 silently replaced
      batch 1's summary and batch 3 replaced batch 2's, while the filename went on claiming
      to be batch 1. Nothing errored and nothing in the output said a record had been lost.
      NO WRITTEN ROW WAS EVER AT RISK , `written.jsonl` is append-only and reconciles
      exactly (142 + 144 + 146 = 432 at the time of the fix), which is why this is a
      record-keeping defect and not a data one. The batch NUMBER is derived from the ledger
      rather than passed in, so it cannot disagree with what is actually on disk.
      Same shape as the snapshot hazards already recorded: a file that looks freshly
      generated, is, and describes something other than what its name says.  */
  const batchNo = (() => {
    try {
      const f = path.join(DIR, 'batch-index.json');
      const n = (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).lastBatch : 0) + 1;
      fs.writeFileSync(f, JSON.stringify({ lastBatch: n }, null, 1) + '\n');
      return n;
    } catch (e) { return null; }
  })();
  /*  THE HELD LEDGER IS APPEND-ONLY, LIKE written.jsonl, AND FOR THE SAME REASON , it is the
      scope of the next job and it must survive a stats file being overwritten. Stamped with
      the batch number so a second pass can tell when a club-season was held.  */
  if (heldLog.length) {
    heldLog.forEach((h) => { h.batch = batchNo; });
    fs.appendFileSync(path.join(DIR, 'held.jsonl'),
      heldLog.map((h) => JSON.stringify(h)).join('\n') + '\n');
    console.log('  held -> held.jsonl (+' + heldLog.length + ')');
  }
  const named = batchNo == null ? 'batch-unknown-stats.json' : ('batch' + batchNo + '-stats.json');
  fs.writeFileSync(path.join(DIR, named),
    JSON.stringify({ batch: batchNo, at: new Date().toISOString(), ...stats }, null, 2) + '\n');
  console.log('  stats -> ' + named);
  console.log('  WRITTEN ' + stats.written + ' rows. Logged to written.jsonl.');
})().catch((e) => { console.error('FAILED,', e.message); process.exit(1); });
