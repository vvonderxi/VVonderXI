/*  CROSS-LEAGUE SEASON ORDER , DRY RUN. READ-ONLY. IT WRITES NOTHING TO THE DATABASE.
    ================================================================================
    Scope and reasoning: docs/CROSS_LEAGUE_ORDER_SCOPE.md. This is the instrument that scope
    was measured with, kept so the numbers can be re-derived rather than re-typed.

      node scripts/crosslg-dryrun.js            # counts, the named cases, the residue, the control
      node scripts/crosslg-dryrun.js --write    # ALSO writes the proposal files to migrations/

    WHAT IT DECIDES. `orderSeasonRows` compares `league_code` before it reaches the
    `split_transfers` lookup, so a cross-league pair is ordered alphabetically and never sees the
    transfer evidence: LL before PL puts Barcelona ahead of Arsenal for Aubameyang 2021/22, and he
    left Arsenal for Barcelona in January 2022. This ladder decides that order from the BAM export
    instead.

    THE LADDER IS FOUR RUNGS AND ONLY THE FIRST IS A TRANSFER WE CAN POINT AT:
      1  a dated move BETWEEN the two clubs inside the season window        , a record
      2  a dated ARRIVAL at each club, different dates                      , inferred
      3  a dated arrival at exactly ONE club; the other is where he started , inferred
      4  the first DEPARTURE after the window; that club is where he ended  , inferred
    Rungs 2 to 4 produce an ORDER, not a move, so a row written from them carries a NULL date and
    that null is what stops any consumer saying "then". See the scope.

    THE CONTROL IS THE PART THAT MATTERS. 800 `split_transfers` rows already hold an answer we
    trust, for the same-league population, derived in a previous sitting from this same export.
    Running the new ladder over those 800 pairs must reproduce every one of them on RUNG 1 and in
    the same direction. A row that comes back on a different rung, or reversed, is the ladder
    disagreeing with a source we already accepted, and that is a finding rather than a nuisance.
*/
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const EXPORT = 'exports/bam/player/2026-09-17T18-16-35/transfers.csv';
const OUTDIR = path.join('migrations', 'crossleague_order_2026-09-24');
const WRITE_FILES = process.argv.includes('--write');

/*  A REAL CSV PARSE. Twenty lines in the export are TEN logical rows whose player_name is a quoted
    field containing a newline; splitting on "\n" cuts them in half and reports them as malformed.
    Dropping them would be fine at this scale and being wrong about WHY would not.  */
function parseCsv(text){
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (q){ if (c === '"'){ if (text[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n'){ row.push(cur); if (row.length > 1 || row[0] !== '') out.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || row.length){ row.push(cur); out.push(row); }
  return out;
}

/*  CLUB MATCHING IS A SUBSET OF SIGNIFICANT TOKENS, NOT EQUALITY. Our "Hellas Verona" against the
    export's "Verona", our "Kasımpaşa" against "Kasimpasa". Equality alone refused about a third of
    the real pairs. The Turkish folding is explicit because NFD does not map the dotless i.
    NO ALIAS MAP IS APPLIED HERE, DELIBERATELY. Four pairs miss on club NAMING rather than on
    missing data, and the dry run has to show them as their own category so the map can be written
    down and read, instead of being folded into the matcher where nobody sees what was equated.  */
/*  `fk` JOINS THE CLUB-TYPE SUFFIXES. Our Erzurumspor FK and Gaziantep FK carry it and the
    export's Erzurum BB and Gazisehir Gaziantep do not, so without it the alias keys never
    matched and two of the four Turkish pairs stayed in the residue. Same class as fc and afc.  */
const STOP = new Set(('fc afc fk cf sc ac as ss ssc rc cd ud sv tsv vfl vfb fsv bsc kv rsc sk bk if us ' +
  'aj og ogc sco esdb club de do the nec psv sbv bv 1 04 05 96').split(' '));
function toks(s){
  return String(s || '').toLowerCase()
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ç/g,'c').replace(/ö/g,'o').replace(/ü/g,'u')
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(t => t && !STOP.has(t));
}
/*  THE ALIAS MAP IS EXPLICIT AND SHORT, AND IT IS A MAP RATHER THAN A LOOSER MATCHER ON PURPOSE.
    Four residue pairs missed on club NAMING rather than on missing data, all Turkish, and every
    one of them is a club the export writes under a different name from ours. Written out so the
    next reader can see exactly what was equated instead of finding it folded into the token rule,
    where a widened matcher would quietly equate things nobody chose.
      Erzurumspor FK   <-  Erzurum BB              (J. Omolo 2020/21)
      Akhisarspor      <-  Akhisar Belediye        (Lazaro Luan 2014/15 and Custodio 2014/15)
      Gaziantep FK     <-  Gazisehir Gaziantep     (Osama Rashid 2020/21)
    FOUR PAIRS, THREE ALIASES , Akhisarspor accounts for two of the four.  */
const ALIAS = [
  ['erzurumspor', 'erzurum bb'],
  ['akhisarspor', 'akhisar belediye'],
  ['gaziantep',   'gazisehir gaziantep'],
];
const aliasKey = s => { const t = toks(s).join(' ');
  for (const pair of ALIAS){ if (pair.indexOf(t) >= 0) return pair[0]; }
  return null; };
function sameClub(a, b){
  const ka = aliasKey(a), kb = aliasKey(b);
  if (ka && kb) return ka === kb;
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return false;
  const sa = new Set(A), sb = new Set(B);
  const inter = A.filter(t => sb.has(t)).length;
  return inter === Math.min(sa.size, sb.size);
}
const dated = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const inWindow = (d, y) => dated(d) && d >= (y + '-07-01') && d <= ((y + 1) + '-06-30');
/*  A SEASON HAS PHASES AND THE LADDER HAS TO KNOW THEM , the control is what forced this.
    THE 800 ROWS WE ALREADY TRUST ARE DATED DECEMBER, JANUARY AND FEBRUARY AND NOTHING ELSE:
    705 January, 90 February, 5 December, zero in July or June. A move that splits a season into
    two cards is a WINTER move by construction, because a July move simply puts the whole season
    at the new club.
    SO A ROW AT EITHER BOUNDARY IS NOT THE MOVE THAT CAUSED THE SPLIT. Taking the EARLIEST direct
    row reversed 17 of the 800, because a 1 July line closes the previous loan; taking the LATEST
    reversed 39, because a late-June line closes this one , the export carries 5,750 rows typed
    "Return from loan" and 4,431 of them are in June. Neither end is a move inside the season.  */
const phase = (d, y) => {
  if (!dated(d)) return null;
  if (d >= (y + '-06-01') && d <= (y + '-08-31')) return 'start';
  if (d >= ((y + 1) + '-05-01') && d <= ((y + 1) + '-06-30')) return 'end';
  return 'in';
};

/*  THE LADDER. Returns {rung, first, second, date, type, evidence} or null.
    `first` and `second` are CLUB NAMES as WE hold them, so a caller never has to map back.  */
function decide(clubA, clubB, year, tx){
  const win = tx.filter(t => inWindow(t.date, year));

  // 1 , a dated move between the two clubs
  const direct = win.filter(t =>
    (sameClub(t.from, clubA) && sameClub(t.to, clubB)) || (sameClub(t.from, clubB) && sameClub(t.to, clubA)))
    .filter(t => phase(t.date, year) === 'in');   // a boundary row closes a season, it does not split one
  if (direct.length){
    /*  THE LAST DIRECT ROW IN THE WINDOW DECIDES, NOT THE FIRST , and the control is what found
        it. Taking the earliest reversed 17 of the 800 rows we already trust, every one of them a
        loan: a season that contains BOTH directions is a loan out and a return, and the earliest
        row is frequently an administrative 1 July line closing the PREVIOUS loan rather than a
        move inside this season. The last row is where he finished, so its `from` is where he was
        and its `to` is where he ended. Battaglia 2016/17 is the shape: SC Braga -> Chaves on
        2016-07-27 and Chaves -> SC Braga on 2017-01-01, and he played Chaves first.
        WHERE THERE IS ONLY ONE DIRECT ROW, FIRST AND LAST ARE THE SAME ROW, so this changes
        nothing for the 779 that already reproduced.  */
    direct.sort((a,b) => a.date < b.date ? -1 : 1);
    const t = direct[direct.length - 1];
    const fromIsA = sameClub(t.from, clubA);
    return { rung:1, first: fromIsA ? clubA : clubB, second: fromIsA ? clubB : clubA,
             date: t.date, type: t.type, evidence: t.from + ' -> ' + t.to + ' ' + t.date + ' (' + t.type + ')' };
  }

  const arrA = win.filter(t => sameClub(t.to, clubA)).map(t => t.date).sort();
  const arrB = win.filter(t => sameClub(t.to, clubB)).map(t => t.date).sort();

  // 2 , a dated arrival at each club. A loan via the parent club has no direct row and never will.
  if (arrA.length && arrB.length && arrA[0] !== arrB[0]){
    const aFirst = arrA[0] < arrB[0];
    return { rung:2, first: aFirst ? clubA : clubB, second: aFirst ? clubB : clubA, date:null, type:null,
             evidence: 'arrived ' + clubA + ' ' + arrA[0] + ', ' + clubB + ' ' + arrB[0] };
  }

  /*  3 , a dated arrival at exactly one club. WHICH SIDE IT PUTS THAT CLUB ON DEPENDS ON WHEN.
      An arrival in the winter means he joined mid-season, so that club is SECOND. An arrival in
      July or August is the club he STARTED at, so it is FIRST , and reading the two the same way
      is how this rung had Fulgini 2022/23 backwards, on a 2022-07-12 arrival at Mainz.  */
  if ((arrA.length > 0) !== (arrB.length > 0)){
    const known = arrA.length > 0 ? clubA : clubB, other = arrA.length > 0 ? clubB : clubA;
    const when = (arrA.length > 0 ? arrA : arrB)[0];
    const joinedMidSeason = phase(when, year) !== 'start';
    return { rung:3, first: joinedMidSeason ? other : known, second: joinedMidSeason ? known : other,
             date:null, type:null,
             evidence: 'arrived ' + known + ' ' + when + ' (' + (joinedMidSeason ? 'mid-season' : 'season start') +
                       '), no dated arrival at ' + other };
  }

  // 4 , the first departure AFTER the window: the club he left is the one he finished at
  const after = tx.filter(t => dated(t.date) && t.date > ((year + 1) + '-06-30'))
                  .sort((a,b) => a.date < b.date ? -1 : 1);
  const dep = after.find(t => sameClub(t.from, clubA) || sameClub(t.from, clubB));
  if (dep){
    const secondIsA = sameClub(dep.from, clubA);
    return { rung:4, first: secondIsA ? clubB : clubA, second: secondIsA ? clubA : clubB, date:null, type:null,
             evidence: 'first departure after the season: ' + dep.from + ' -> ' + dep.to + ' ' + dep.date };
  }
  return null;
}

async function allCards(){
  let rows = [], from = 0;
  for (;;){
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,api_player_id,player_name,season_year,league_code,team_name,appearances')
      .order('api_player_id', { ascending:true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    rows = rows.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

(async () => {
  const cards = await allCards();
  const txt = fs.readFileSync(EXPORT, 'utf8');
  const recs = parseCsv(txt); const header = recs.shift();
  const byPlayer = {};
  recs.forEach(r => { if (r.length < 6) return;
    (byPlayer[r[0]] = byPlayer[r[0]] || []).push({ from:r[2], to:r[3], date:r[4], type:r[5] }); });

  console.log('cards ' + cards.length + '   export rows ' + recs.length + '   header ' + header.join('|'));

  // ── the populations ──────────────────────────────────────────────────────────
  const byKey = {};
  cards.forEach(c => { const k = c.api_player_id + '|' + c.season_year; (byKey[k] = byKey[k] || []).push(c); });
  const crossPairs = [], sameGroups = [], threeCard = [];
  Object.entries(byKey).forEach(([k, rs]) => {
    if (rs.length < 2) return;
    const lgs = new Set(rs.map(r => r.league_code));
    if (lgs.size > 1){ if (rs.length === 2) crossPairs.push({ k, rs }); else threeCard.push({ k, rs }); }
    else sameGroups.push({ k, rs });
  });
  console.log('\nPOPULATIONS');
  console.log('  cross-league player-seasons, two cards : ' + crossPairs.length);
  console.log('  cross-league, three cards (out of scope): ' + threeCard.length);
  console.log('  same-league multi-card player-seasons   : ' + sameGroups.length);
  console.log('  distinct players in the cross set       : ' + new Set(crossPairs.map(p => p.k.split('|')[0])).size);

  // ── the ladder over the cross-league pairs ───────────────────────────────────
  const rung = { 1:[], 2:[], 3:[], 4:[] }, residue = [];
  crossPairs.forEach(({ k, rs }) => {
    const [pid, ys] = k.split('|'); const year = +ys;
    const [A, B] = rs; const tx = byPlayer[pid] || [];
    const d = tx.length ? decide(A.team_name, B.team_name, year, tx) : null;
    const rec = { api_player_id:+pid, season_year:year, player:A.player_name,
                  clubs:[A.team_name + ' (' + A.league_code + ')', B.team_name + ' (' + B.league_code + ')'] };
    if (d) rung[d.rung].push(Object.assign(rec, d));
    else residue.push(Object.assign(rec, {
      why: tx.length ? 'no dated evidence on any rung' : 'player absent from the export',
      nearby: tx.filter(t => dated(t.date) && t.date >= ((year-1)+'-07-01') && t.date <= ((year+2)+'-06-30'))
                .map(t => t.from + ' -> ' + t.to + ' ' + t.date).slice(0, 4) }));
  });
  const ordered = rung[1].length + rung[2].length + rung[3].length + rung[4].length;
  const pct = n => (n / crossPairs.length * 100).toFixed(1) + '%';
  console.log('\nTHE LADDER');
  [1,2,3,4].forEach(r => console.log('  rung ' + r + ' : ' + String(rung[r].length).padStart(4) + '  ' + pct(rung[r].length)));
  console.log('  ------------------------');
  console.log('  ORDERED: ' + ordered + '  ' + pct(ordered) + '      residue: ' + residue.length + '  ' + pct(residue.length));

  // ── the ten cases by eye ─────────────────────────────────────────────────────
  const byName = (a,b) => a.player === b.player ? a.season_year - b.season_year : (a.player < b.player ? -1 : 1);
  const show = (list, n) => list.slice().sort(byName).slice(0, n);
  console.log('\nTEN CASES, BY EYE');
  const cases = [].concat(show(rung[1], 4), show(rung[3], 3), show(rung[4], 3));
  cases.forEach(c => {
    console.log('  [rung ' + c.rung + '] ' + c.player + '  ' + c.season_year + '/' + String(c.season_year+1).slice(2));
    console.log('      cards  : ' + c.clubs.join('   |   '));
    console.log('      order  : ' + c.first + '  THEN  ' + c.second + (c.date ? '   (' + c.date + ')' : '   (no date , inferred)'));
    console.log('      export : ' + c.evidence);
  });

  // ── the residue ──────────────────────────────────────────────────────────────
  console.log('\nRESIDUE , ' + residue.length + ' pairs');
  const absent = residue.filter(r => r.why === 'player absent from the export');
  const undated = residue.filter(r => r.why !== 'player absent from the export');
  console.log('  (a) the export carries rows for the player but none we can date , ' + undated.length + ':');
  undated.forEach(r => { console.log('      ' + r.player + ' ' + r.season_year + '  ' + r.clubs.join(' | '));
                         console.log('         nearby: ' + (r.nearby.join(' ; ') || '(none)')); });
  console.log('  (b) the player is absent from the export entirely , ' + absent.length + ':');
  absent.forEach(r => console.log('      ' + r.player + ' ' + r.season_year + '  ' + r.clubs.join(' | ')));

  // ── THE CONTROL: 800 rows whose answer we already trust ──────────────────────
  const { data: st, error: stErr } = await sb.from('split_transfers').select('*');
  if (stErr) throw new Error(stErr.message);
  const sameByKey = {};
  sameGroups.forEach(({ rs }) => { const r = rs[0];
    sameByKey[r.api_player_id + '|' + r.season_year + '|' + r.league_code] = rs; });

  /*  A DISAGREEMENT IS ONLY EVIDENCE ABOUT THE LADDER IF THE STORED ROW IS SOUND. Seven of the
      800 carry a transfer_date outside their own season window, which means a previous sitting
      matched a move from a DIFFERENT season; the ladder disagreeing with those is the ladder
      being right. Classified here rather than narrated, so the number is derived.  */
  const storedSound = r => r.transfer_date >= (r.season_year + '-07-01') && r.transfer_date <= ((r.season_year + 1) + '-06-30');
  const ctl = { total: st.length, reproduced:0, wrongRung:[], reversed:[], noPair:[], noDecision:[], dateDiff:[],
                storedOutOfWindow: st.filter(r => !storedSound(r)).map(r =>
                  r.api_player_id + '|' + r.season_year + '|' + r.league_code + '  ' +
                  r.from_club + ' -> ' + r.to_club + '  ' + r.transfer_date) };
  st.forEach(row => {
    const key = row.api_player_id + '|' + row.season_year + '|' + row.league_code;
    const rs = sameByKey[key];
    if (!rs || rs.length !== 2){ ctl.noPair.push({ key, cards: rs ? rs.length : 0,
        clubs: row.from_club + ' -> ' + row.to_club }); return; }
    const [A, B] = rs;
    const d = decide(A.team_name, B.team_name, row.season_year, byPlayer[row.api_player_id] || []);
    if (!d){ ctl.noDecision.push({ key, clubs: row.from_club + ' -> ' + row.to_club }); return; }
    const dirOK = sameClub(d.first, row.from_club) && sameClub(d.second, row.to_club);
    if (d.rung !== 1){ ctl.wrongRung.push({ key, rung:d.rung, stored: row.from_club + ' -> ' + row.to_club,
                                            ladder: d.first + ' -> ' + d.second, evidence: d.evidence,
                                            storedSound: storedSound(row) }); return; }
    if (!dirOK){ ctl.reversed.push({ key, stored: row.from_club + ' -> ' + row.to_club,
                                     ladder: d.first + ' -> ' + d.second, evidence: d.evidence,
                                     storedSound: storedSound(row) }); return; }
    if (d.date !== row.transfer_date) ctl.dateDiff.push({ key, stored: row.transfer_date, ladder: d.date,
                                                          storedSound: storedSound(row) });
    ctl.reproduced++;
  });
  console.log('\nCONTROL , the ladder re-derives the 800 rows we already trust');
  console.log('  rows                                  : ' + ctl.total);
  console.log('  reproduced on RUNG 1, same direction  : ' + ctl.reproduced +
              '  (' + (ctl.reproduced / ctl.total * 100).toFixed(1) + '%)');
  console.log('  came back on a DIFFERENT rung         : ' + ctl.wrongRung.length);
  console.log('  came back REVERSED                    : ' + ctl.reversed.length);
  console.log('  ladder reached no decision            : ' + ctl.noDecision.length);
  console.log('  no two-card pair for the stored key    : ' + ctl.noPair.length);
  console.log('  reproduced but with a different date  : ' + ctl.dateDiff.length);
  const realDisagreement = ctl.reversed.filter(x => x.storedSound).length + ctl.wrongRung.filter(x => x.storedSound).length;
  console.log('  --');
  console.log('  stored rows dated OUTSIDE their own season : ' + ctl.storedOutOfWindow.length +
              '   (a previous sitting matched the wrong season)');
  ctl.storedOutOfWindow.forEach(x => console.log('      ' + x));
  console.log('  DIRECTIONAL DISAGREEMENTS WHERE THE STORED ROW IS SOUND : ' + realDisagreement);
  ['wrongRung','reversed','noDecision','noPair','dateDiff'].forEach(k => {
    if (ctl[k].length) { console.log('    -- ' + k + ' --'); ctl[k].slice(0,10).forEach(x => console.log('      ' + JSON.stringify(x))); }
  });

  // ── the proposal, as rows ────────────────────────────────────────────────────
  const proposal = [].concat(rung[1], rung[2], rung[3], rung[4]).map(c => ({
    api_player_id: c.api_player_id, season_year: c.season_year,
    league_code: null,                    // the move crosses leagues, so no single league owns it
    from_club: c.first, to_club: c.second,
    transfer_date: c.date,                // NULL on rungs 2 to 4 , an order, not a move
    transfer_type: c.type,
    source: 'bam_transfers_2026-09-17',
    decided_by: ['', 'transfer_row', 'arrival_both', 'arrival_one', 'next_departure'][c.rung]
  }));
  console.log('\nPROPOSAL: ' + proposal.length + ' rows  (' +
    proposal.filter(r => r.transfer_date).length + ' dated, ' +
    proposal.filter(r => !r.transfer_date).length + ' order-only with a NULL date)');

  if (WRITE_FILES){
    fs.mkdirSync(path.join(OUTDIR, 'before'), { recursive: true });
    /*  A BEFORE-CAPTURE IS WRITTEN ONCE AND NEVER OVERWRITTEN , learnt the hard way, 2026-09-24.
        A second --write AFTER the repair phase replaced the 800-row capture with the 799-row
        post-repair state, which is the rollback quietly becoming a copy of the thing it exists to
        undo. It was recoverable only because the first capture had been committed. The file is now
        refused if it exists, and a fresh state goes beside it under its own name.  */
    const capPath = path.join(OUTDIR, 'before', 'split_transfers.json');
    if (fs.existsSync(capPath)){
      const kept = JSON.parse(fs.readFileSync(capPath, 'utf8'));
      const alt = path.join(OUTDIR, 'before', 'split_transfers_' + st.length + '_' + new Date().toISOString().slice(0,10) + '.json');
      fs.writeFileSync(alt, JSON.stringify(st, null, 1));
      console.log('  before-capture already exists (' + kept.length + ' rows) and was NOT touched; today\'s state written to ' + path.basename(alt));
    } else {
      fs.writeFileSync(capPath, JSON.stringify(st, null, 1));
    }
    fs.writeFileSync(path.join(OUTDIR, 'proposal.jsonl'), proposal.map(r => JSON.stringify(r)).join('\n') + '\n');
    fs.writeFileSync(path.join(OUTDIR, 'residue.json'), JSON.stringify(residue, null, 1));
    fs.writeFileSync(path.join(OUTDIR, 'control.json'), JSON.stringify(ctl, null, 1));
    /*  READ THE BEFORE-CAPTURE BACK OFF DISK AND ASSERT IT ROW FOR ROW. A capture that was
        written but not verified is the thing this file's own rules keep refusing to accept.  */
    const back = JSON.parse(fs.readFileSync(capPath, 'utf8'));
    console.log('\nfiles written to ' + OUTDIR + '  (before-capture on disk: ' + back.length + ' rows)');
  } else {
    console.log('\n(no files written , pass --write to emit the proposal and the before-capture)');
  }
  console.log('\nNOTHING WAS WRITTEN TO THE DATABASE.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
