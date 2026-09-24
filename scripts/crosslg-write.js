/*  CROSS-LEAGUE SEASON ORDER , THE WRITE. RUN ONE PHASE AT A TIME, IN THIS ORDER.
    ================================================================================
    Scope: docs/CROSS_LEAGUE_ORDER_SCOPE.md. Dry run and control: scripts/crosslg-dryrun.js and
    migrations/crossleague_order_2026-09-24/.

      node scripts/crosslg-write.js --schema           # DDL only: nullable league_code, new key, two columns
      node scripts/crosslg-write.js --repair           # the seven rows dated in the wrong season
      node scripts/crosslg-write.js --canary           # ONE rung-1 pair, written and reported
      node scripts/crosslg-write.js --canary-restore   # delete it and prove the table is back
      node scripts/crosslg-write.js --run              # the remaining 604

    EVERY PHASE IS GUARDED AND EVERY PHASE PRINTS WHAT IT DID. The before-capture of all 800
    original rows is migrations/crossleague_order_2026-09-24/before/split_transfers.json, written
    and read back off disk by the dry run, and it is the rollback for the repair phase as well.

    WHY THE KEY CHANGES. A cross-league move spans two league codes, so neither one owns the row,
    and the old PRIMARY KEY (api_player_id, season_year, league_code) cannot hold it. The new key
    is (api_player_id, season_year, from_club, to_club): the event is who moved, in which season,
    between which two clubs. Verified unique over the 800 existing plus the 605 proposed , 1,405
    rows, zero collisions , before any DDL ran.
*/
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIR = path.join('migrations', 'crossleague_order_2026-09-24');
const BEFORE = path.join(DIR, 'before', 'split_transfers.json');
const PROPOSAL = path.join(DIR, 'proposal.jsonl');
const LEDGER = path.join(DIR, 'written.jsonl');
const arg = n => process.argv.includes(n);

/*  exec_sql DISCARDS SELECT OUTPUT (it returns data:null), so a value is read back through the
    ERROR channel: ('x'||<expr>)::int fails and the message carries the value. CLAUDE.md SEC C.  */
async function readBack(expr){
  const { error } = await sb.rpc('exec_sql', { sql: `select (('x'||(${expr})))::int` });
  if (!error) return '(no error , nothing read)';
  const m = String(error.message).match(/"x(.*)"/s);
  return m ? m[1] : error.message;
}
async function ddl(sql){
  const { error } = await sb.rpc('exec_sql', { sql });
  if (error) throw new Error('DDL FAILED: ' + sql + '\n  ' + error.message);
  console.log('  ok  ' + sql.replace(/\s+/g, ' ').slice(0, 110));
}
const proposal = () => fs.readFileSync(PROPOSAL, 'utf8').trim().split('\n').map(JSON.parse);
const before = () => JSON.parse(fs.readFileSync(BEFORE, 'utf8'));

/*  THE SEVEN. Each stored row carries a transfer_date outside its own season window, so a previous
    sitting matched a move from a DIFFERENT season, and orderSeasonRows has been ordering these
    pairs on evidence from the wrong year. Six are replaced with the move the export actually holds
    inside the season; the seventh is deleted, and the reason is recorded beside it.  */
const REPAIRS = [
  { k:[90513,2010,'PL'],  to:{ from_club:'Everton',       to_club:'Tottenham',   transfer_date:'2011-01-19', transfer_type:'€ 3.6M' }, was:'Tottenham -> Everton 2012-01-02' },
  { k:[30786,2014,'SA'],  to:{ from_club:'Genoa',         to_club:'Juventus',    transfer_date:'2015-02-02', transfer_type:'N/A' },        was:'Juventus -> Genoa 2019-01-24' },
  { k:[115227,2011,'SA'], to:{ from_club:'Lazio',         to_club:'Genoa',       transfer_date:'2012-01-19', transfer_type:'Loan' },       was:'Genoa -> Lazio 2011-01-18' },
  { k:[50100,2015,'TR'],  to:{ from_club:'Gaziantepspor', to_club:'Trabzonspor', transfer_date:'2016-01-23', transfer_type:'€ 2.8M' }, was:'Trabzonspor -> Gaziantepspor 2017-01-10' },
  { k:[31802,2010,'SA'],  to:{ from_club:'Udinese',       to_club:'Genoa',       transfer_date:'2011-01-18', transfer_type:'Loan' },         was:'Udinese -> Genoa 2013-01-01 (direction was right, the date was three seasons out)' },
  { k:[31406,2024,'LL'],  to:{ from_club:'Real Sociedad', to_club:'Valencia',    transfer_date:'2025-01-04', transfer_type:'Loan' },         was:'Real Sociedad -> Valencia 2026-01-07 (direction was right, the date was a season out)' },
  /*  DELETED RATHER THAN CORRECTED. Posch's 2024/25 is a THREE-card Serie A season (Atalanta,
      Bologna, Como) and one from-to row cannot order three clubs. orderSeasonRows only consults a
      transfer row when the group holds exactly two cards, so this row is inert for ordering as
      well as wrong about the season. A row that is both is not worth replacing with a partial one. */
  { k:[711,2024,'SA'], del:true, was:'Bologna -> Como 2026-01-20 , a 2025/26 move on a 2024/25 season' },
];

async function fetchAll(){
  const { data, error } = await sb.from('split_transfers').select('*');
  if (error) throw new Error(error.message);
  return data;
}

(async () => {
  if (arg('--schema')){
    console.log('SCHEMA , one statement at a time, each verified after it runs\n');
    console.log('  before: ' + await readBack(
      `select 'rows '||count(*)||'  cols '||(select count(*) from pg_attribute where attrelid='public.split_transfers'::regclass and attnum>0 and not attisdropped) from split_transfers`));
    /*  THE ORDER IS FORCED AND THE DATABASE SAID SO: `league_code` cannot lose NOT NULL while it
        is part of the primary key , "column league_code is in a primary key". So the old key goes
        first, then the nullability, then the new key. Attempted the other way round and refused,
        which is the constraint doing its job rather than a surprise.  */
    await ddl(`alter table public.split_transfers drop constraint split_transfers_pkey`);
    await ddl(`alter table public.split_transfers alter column league_code drop not null`);
    await ddl(`alter table public.split_transfers alter column transfer_date drop not null`);
    await ddl(`alter table public.split_transfers add column if not exists source text`);
    await ddl(`alter table public.split_transfers add column if not exists decided_by text`);
    await ddl(`update public.split_transfers set source='bam_transfers_2026-09-17', decided_by='transfer_row' where source is null`);
    await ddl(`alter table public.split_transfers alter column source set not null`);
    await ddl(`alter table public.split_transfers alter column decided_by set not null`);
    await ddl(`alter table public.split_transfers add constraint split_transfers_pkey primary key (api_player_id, season_year, from_club, to_club)`);
    /*  THE COLUMN COMMENTS ARE NOT DECORATION. decided_by is the only thing in the row that says
        whether the order is a record or an inference, and rung 4's caveat has to travel with it or
        a future session re-derives it from scratch before it can decide whether to drop it.  */
    await ddl(`comment on column public.split_transfers.league_code is
      'NULL means the move CROSSES leagues, so no single league owns the row. Not a missing value.'`);
    await ddl(`comment on column public.split_transfers.transfer_date is
      'NULL where the order was inferred rather than recorded , see decided_by. A consumer may only say "then" where this is set.'`);
    await ddl(`comment on column public.split_transfers.decided_by is
      'transfer_row = a dated move between the two clubs inside the season, the only rung that is a record. arrival_both / arrival_one = inferred from dated arrivals; a season-start arrival means that club came FIRST. next_departure = inferred from the first departure AFTER the season, so the club he left is where he finished , that departure can be YEARS later (Ahamada 2015/16 reads off a 2019 move), and it is the thinnest rung. Four rows use it; they can be dropped without re-deriving why.'`);
    await ddl(`comment on column public.split_transfers.source is
      'The export the row came from. All 800 original rows were verified verbatim in bam_transfers_2026-09-17.'`);
    console.log('\n  after : ' + await readBack(
      `select 'rows '||count(*)||'  cols '||(select count(*) from pg_attribute where attrelid='public.split_transfers'::regclass and attnum>0 and not attisdropped) from split_transfers`));
    console.log('  pkey  : ' + await readBack(`select pg_get_constraintdef(oid) from pg_constraint where conname='split_transfers_pkey'`));
    console.log('  nulls : ' + await readBack(`select string_agg(attname||':'||(not attnotnull)::text,', ' order by attnum) from pg_attribute where attrelid='public.split_transfers'::regclass and attnum>0 and not attisdropped`));
    console.log('  stamped: ' + await readBack(`select count(*)::text from split_transfers where source='bam_transfers_2026-09-17' and decided_by='transfer_row'`));
    return;
  }

  if (arg('--repair')){
    console.log('REPAIR , the seven rows dated in the wrong season\n');
    let fixed = 0, removed = 0;
    for (const r of REPAIRS){
      const [pid, yr, lg] = r.k;
      const { data: cur } = await sb.from('split_transfers').select('*')
        .eq('api_player_id', pid).eq('season_year', yr).eq('league_code', lg);
      if (!cur || cur.length !== 1){ console.log('  SKIP ' + r.k.join('|') + ' , found ' + (cur ? cur.length : 0) + ' rows'); continue; }
      if (r.del){
        const { error } = await sb.from('split_transfers').delete()
          .eq('api_player_id', pid).eq('season_year', yr).eq('league_code', lg);
        if (error) throw new Error(error.message);
        removed++; console.log('  DEL  ' + r.k.join('|') + '   was ' + r.was);
      } else {
        const { error } = await sb.from('split_transfers')
          .update(Object.assign({}, r.to, { source:'bam_transfers_2026-09-17', decided_by:'transfer_row' }))
          .eq('api_player_id', pid).eq('season_year', yr).eq('league_code', lg);
        if (error) throw new Error(error.message);
        fixed++;
        console.log('  FIX  ' + r.k.join('|') + '\n         was ' + r.was +
                    '\n         now ' + r.to.from_club + ' -> ' + r.to.to_club + ' ' + r.to.transfer_date);
      }
    }
    const all = await fetchAll();
    const out = all.filter(x => !(x.transfer_date >= (x.season_year + '-07-01') && x.transfer_date <= ((x.season_year + 1) + '-06-30')) && x.transfer_date);
    console.log('\n  repaired ' + fixed + ', deleted ' + removed + ', table now ' + all.length + ' rows');
    console.log('  rows still dated outside their own season: ' + out.length + (out.length ? ' , ' + out.map(x => x.api_player_id + '|' + x.season_year).join(', ') : ' , none'));
    return;
  }

  if (arg('--canary') || arg('--canary-restore')){
    const rows = proposal();
    /*  RUNG 1 FOR THE CANARY, NOT RUNG 4: the point is to prove the write and the restore, so the
        row under test should be the kind 523 of the 605 are, carrying a real date.  */
    const pick = rows.find(r => r.decided_by === 'transfer_row');
    console.log('CANARY , one row: ' + JSON.stringify(pick) + '\n');
    if (arg('--canary')){
      const { error } = await sb.from('split_transfers').insert(pick);
      if (error) throw new Error(error.message);
      const { data: back } = await sb.from('split_transfers').select('*')
        .eq('api_player_id', pick.api_player_id).eq('season_year', pick.season_year)
        .eq('from_club', pick.from_club).eq('to_club', pick.to_club);
      console.log('  written and read back: ' + JSON.stringify(back));
      const all = await fetchAll();
      console.log('  table now ' + all.length + ' rows (was ' + (all.length - 1) + ')');
      const { data: cards } = await sb.from('player_card_mv')
        .select('card_id,player_name,season_year,league_code,team_name,appearances')
        .eq('api_player_id', pick.api_player_id).eq('season_year', pick.season_year);
      console.log('  the pair it orders: ' + cards.map(c => c.team_name + ' (' + c.league_code + ') apps ' + c.appearances + ' card ' + c.card_id).join('   |   '));
      console.log('  player: ' + (cards[0] || {}).player_name);
    } else {
      const { error } = await sb.from('split_transfers').delete()
        .eq('api_player_id', pick.api_player_id).eq('season_year', pick.season_year)
        .eq('from_club', pick.from_club).eq('to_club', pick.to_club);
      if (error) throw new Error(error.message);
      /*  A RESTORE IS PROVEN COLUMN BY COLUMN, NOT BY A ROW COUNT. A restore that writes the right
          NUMBER of rows with one wrong value passes a count and fails the thing the capture is for. */
      const all = await fetchAll();
      const cap = before();
      const norm = r => [r.api_player_id, r.season_year, r.league_code, r.from_club, r.to_club, r.transfer_date, r.transfer_type].join('\u0001');
      const nowSet = new Set(all.map(norm)), capSet = new Set(cap.map(norm));
      const missing = cap.filter(r => !nowSet.has(norm(r)));
      const extra = all.filter(r => !capSet.has(norm(r)));
      console.log('  deleted. table ' + all.length + ' rows, capture ' + cap.length);
      console.log('  rows in the capture that are NOT in the table now : ' + missing.length +
                  (missing.length ? ' , ' + missing.map(r => r.api_player_id + '|' + r.season_year).join(', ') : ''));
      console.log('  rows in the table now that are NOT in the capture : ' + extra.length +
                  (extra.length ? ' , ' + extra.map(r => r.api_player_id + '|' + r.season_year + ' ' + r.from_club + '->' + r.to_club).join(', ') : ''));
      console.log('\n  NOTE: the repair phase changed seven rows on purpose, so a clean restore shows');
      console.log('  those seven as differences against the ORIGINAL capture. Anything else is a fault.');
    }
    return;
  }

  if (arg('--run')){
    const rows = proposal();
    const existing = await fetchAll();
    const have = new Set(existing.map(r => [r.api_player_id, r.season_year, r.from_club, r.to_club].join('\u0001')));
    const todo = rows.filter(r => !have.has([r.api_player_id, r.season_year, r.from_club, r.to_club].join('\u0001')));
    console.log('RUN , proposal ' + rows.length + ', already present ' + (rows.length - todo.length) + ', to insert ' + todo.length);
    let done = 0;
    for (let i = 0; i < todo.length; i += 100){
      const chunk = todo.slice(i, i + 100);
      const { error } = await sb.from('split_transfers').insert(chunk);
      if (error) throw new Error('insert failed at ' + i + ': ' + error.message);
      fs.appendFileSync(LEDGER, chunk.map(r => JSON.stringify(r)).join('\n') + '\n');
      done += chunk.length;
      console.log('  inserted ' + done + ' / ' + todo.length);
    }
    const all = await fetchAll();
    const cross = all.filter(r => r.league_code === null);
    console.log('\n  table ' + all.length + ' rows   cross-league (league_code NULL) ' + cross.length);
    const byRung = {};
    cross.forEach(r => byRung[r.decided_by] = (byRung[r.decided_by] || 0) + 1);
    console.log('  by decided_by: ' + Object.entries(byRung).map(e => e[0] + ' ' + e[1]).join(', '));
    console.log('  dated ' + cross.filter(r => r.transfer_date).length + ', order-only ' + cross.filter(r => !r.transfer_date).length);
    return;
  }

  console.log('pick a phase: --schema | --repair | --canary | --canary-restore | --run');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
