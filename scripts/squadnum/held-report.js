/*  THE HELD TABLE, COUNTED FROM THE LEDGER , never maintained by hand.
    HELD_COMMISSION.md carries a table of counts, and a hand-kept copy of a growing ledger
    goes stale in silence. That is the exact failure this directory already records twice
    (the clobbered batch stats, and a README that named files it no longer matched), so the
    table gets a generator rather than a discipline.  */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '../../migrations/squad_numbers_2026-09-14');
const held = fs.readFileSync(path.join(DIR, 'held.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const done = JSON.parse(fs.readFileSync(path.join(DIR, 'clubseasons-done.json'), 'utf8'));
const rows = fs.readFileSync(path.join(DIR, 'written.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const produced = new Set(rows.map((r) => r.league_code + '|' + r.season_year + '|' + r.club));

/*  A CLUB-SEASON CAN BE HELD AND LATER RESOLVED, AND THE LEDGER KEEPS BOTH , 2026-09-14.
    When a guard is withdrawn, `--redo` re-runs the club-seasons it had refused, so a key
    legitimately appears in held.jsonl AND produces rows. THAT IS THE HISTORY WE WANTED: held
    for a reason, reason withdrawn, rows arrived later. The ledgers are append-only and correct.
    WHAT WAS WRONG WAS THIS REPORT'S ARITHMETIC. It counted every held key as outstanding and
    reported a GAP OF 7 against an attempted count that had itself grown by the 121 re-runs.
    The reconciliation is now: PRODUCED + STILL-UNRESOLVED == DISTINCT ATTEMPTED, and both
    sides are de-duplicated. The check firing on its own bookkeeping is the check working.  */
const resolved = new Set([...new Set(held.map((h) => h.key))].filter((k) => produced.has(k)));
/*  A KEY CAN BE HELD TWICE UNDER DIFFERENT REASONS AND ONLY THE LATEST IS ITS STATE.
    When the duplicate-number guard was withdrawn, the re-run judged those club-seasons again
    and seven were refused for a NEW reason , so held.jsonl honestly carries both entries, and
    a naive count put each of them in two rows of the table. The ledger stays append-only; the
    REPORT takes the last entry per key, which is what "currently held, and why" means.  */
const latest = new Map();
held.forEach((h) => latest.set(h.key, h));
const open = [...latest.values()].filter((h) => !resolved.has(h.key));
const by = {};
open.forEach((h) => { (by[h.reason] = by[h.reason] || { cs: 0, cards: 0 }).cs++; by[h.reason].cards += h.cards; });
const OWNER = { 'no page': 'nobody , the page does not exist in any edition',
  'no squad block': 'parser first, then Fable', 'duplicate numbers in the block': 'nobody , the skip is wrong',
  'parsed, zero cards matched': 'the matcher, not Fable , the page was fine' };
console.log('HELD SET , ' + new Set(done).size + ' of 1,018 club-seasons attempted' +
            (done.length !== new Set(done).size ? '   (' + (done.length - new Set(done).size) + ' re-run after a guard was withdrawn)' : '') + '\n');
Object.entries(by).sort((a, b) => b[1].cards - a[1].cards).forEach(([r, v]) => {
  const owner = OWNER[r] || (/blocks, held/.test(r) ? 'Fable , adjudication' : /UNRECORDED/.test(r) ? 're-probe, ours' : '');
  console.log('  ' + r.slice(0, 52).padEnd(54) + String(v.cs).padStart(3) + ' cs  ' + String(v.cards).padStart(5) + ' cards   ' + owner);
});
console.log('\n  TOTAL ' + open.length + ' club-seasons, ' + open.reduce((a, b) => a + b.cards, 0) + ' cards held');
if (resolved.size) console.log('  RESOLVED since being held (a guard was withdrawn): ' + resolved.size + ' club-seasons');
/*  AND THE CARD-LEVEL HOLDS, WHICH THIS LEDGER CANNOT SEE , held.jsonl is keyed by
    CLUB-SEASON, so a card held inside a club-season that otherwise succeeded (its name did
    not match a row, or matched ambiguously) never appears above. Those cards are held too,
    and quoting the club-season total as "cards held" understates the real figure.  */
const stats = fs.readdirSync(DIR).filter((f) => /^batch\d+-stats\.json$/.test(f));
const cardHeld = stats.reduce((a, f) => {
  const h = (JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).held) || {};
  a.norow += h.norow || 0; a.ambiguous += h.ambiguous || 0; return a;
}, { norow: 0, ambiguous: 0 });
console.log('  plus cards held INSIDE parsed club-seasons: ' + (cardHeld.norow + cardHeld.ambiguous) +
            ' (no row ' + cardHeld.norow + ', ambiguous ' + cardHeld.ambiguous + ')');
console.log('  read from ' + stats.length + ' stats files , batches 1 and 2 were clobbered, so this is a FLOOR');
/*  THE CHECK THAT MATTERS: every attempted club-season is either held or produced rows.
    A gap means a club-season was consumed and left no trace in either ledger.  */
/*  BOTH SIDES DE-DUPLICATED: `done` is appended per batch and a redo re-appends, so its raw
    length counts re-runs twice.  */
const attempted = new Set(done).size;
const stillHeld = new Set(open.map((h) => h.key)).size;
const gap = attempted - stillHeld - produced.size;
console.log('  reconciliation: produced ' + produced.size + ' + still held ' + stillHeld +
            ' = ' + attempted + ' attempted' + (gap === 0 ? '   RECONCILES' : '   GAP OF ' + gap + ' , investigate'));
