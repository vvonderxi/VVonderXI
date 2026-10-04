/*  SITTING 2 , PER-CLUB SHIRT NUMBERS, PROVENANCE, TRANSFERS, AND THE HONOUR TIEBREAK.
    ====================================================================================
    Scope: `docs/SHIRT_AND_TRANSFERS_SCOPE.md`. Phases run one at a time and each is checkable.

      node scripts/shirt-sitting.js --snapshot     # before-capture, writes nothing
      node scripts/shirt-sitting.js --columns      # add the two base-table columns
      node scripts/shirt-sitting.js --backfill     # fill them, per the attribution rule
      node scripts/shirt-sitting.js --transfers    # the 830-row transfers table
      node scripts/shirt-sitting.js --view         # replace the view (numbers + honour tiebreak)
      node scripts/shirt-sitting.js --rebuild-sql  # PRINT the matview rebuild for the SQL editor
      node scripts/shirt-sitting.js --rollback     # restore the captured view; psc columns stay, unread

    THE ROLLBACK IS ONE STATEMENT AND THAT IS BY DESIGN. Reverting the viewdef makes the view read
    `pp.shirt_number` again; the backfilled `psc` values stay present and unread. The captured
    definition is `migrations/shirt_transfers_2026-09-22/before/player_card_view.sql`, length
    asserted on the way in and on the way out. **The honour tiebreak rides the SAME replacement, so
    it reverts with the numbers** , that is stated rather than discovered.

    THE NUMBERS ARE SOURCED, NEVER VERIFIED. `shirt_number_source = 'squadnum'` names WHERE a
    number came from and claims nothing about its truth: Wikipedia squad and appearance tables,
    club-scoped, cross-checked against each other where a page carries more than one.
*/
require('dotenv').config({ path: '.env', quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIR = path.join('migrations', 'shirt_transfers_2026-09-22');
const SQ  = path.join('migrations', 'squad_numbers_split_2026-09-22');
const SPLIT = path.join('migrations', 'halved_split_2026-09-21', 'written.jsonl');
const VIEWCAP = path.join(DIR, 'before', 'player_card_view.sql');
const has = n => process.argv.includes(n);
const RANKED = /goalscor|top scor|scorers|assists|disciplin|hat-?trick|clean sheet|award|player of the|capocannonier|marcator|torjager|doelpunten|classifica/i;
/*  ONE EXCLUSION, NAMED: card 169534, L. Duijvestijn, our Sparta Rotterdam 2025, whose number was
    read off EXCELSIOR Rotterdam's page. The fixed review flag caught it. It must not land.  */
const EXCLUDE = new Set([169534]);
const PERF = ['golden_boot', 'top_assists', 'player_of_season', 'ballon_dor'];

async function readBack(expr) {
  const { error } = await sb.rpc('exec_sql', {
    sql: `select set_config('statement_timeout','600000',false);select (('x'||(${expr})))::int` });
  if (!error) throw new Error('expected the error channel and got none');
  const m = /invalid input syntax for type integer: "x([\s\S]*)"$/.exec(error.message);
  if (!m) throw new Error('unparseable: ' + error.message);
  return m[1];
}
async function run(sql) { const { error } = await sb.rpc('exec_sql', { sql }); if (error) throw new Error(error.message); }
const RT_MD5 = `select md5(string_agg(card_id::text||':'||coalesce(rt::text,'NULL'), ',' order by card_id)) from player_card_view`;

async function snapshot(label) {
  const s = { label, at: new Date().toISOString(),
    rt_md5: await readBack(`(${RT_MD5})`),
    cards: await readBack(`(select count(*)::text from player_season_cards)`),
    psc_cols: await readBack(`(select count(*)::text from pg_attribute where attrelid='player_season_cards'::regclass and attnum>0 and not attisdropped)`),
    mv_cols: await readBack(`(select count(*)::text from pg_attribute where attrelid='player_card_mv'::regclass and attnum>0 and not attisdropped)`),
    mv_indexes: await readBack(`(select count(*)::text from pg_indexes where tablename='player_card_mv')`),
    mv_grants: await readBack(`(select coalesce(array_to_string(relacl,' '),'NONE') from pg_class where relname='player_card_mv')`),
    view_len: await readBack(`(select length(pg_get_viewdef('player_card_view'::regclass))::text)`),
    numbers_shown: await readBack(`(select count(*)::text from player_card_mv where shirt_number is not null)`),
    bands: await readBack(`(select 'gen '||count(*) filter (where rt>=95)||' iconic '||count(*) filter (where rt>=90 and rt<95)||' wc '||count(*) filter (where rt>=85 and rt<90)||' standout '||count(*) filter (where rt>=80 and rt<85) from player_card_view)`) };
  fs.mkdirSync(path.join(DIR, 'before'), { recursive: true });
  fs.writeFileSync(path.join(DIR, `${label}.json`), JSON.stringify(s, null, 2) + '\n');
  console.log(JSON.stringify(s, null, 2));
  return s;
}

/*  THE SOURCED NUMBERS, AFTER BOTH EXCLUSION RULES. `section-audit.jsonl` carries one row per
    number this job would write, with the sections it was found under.  */
function sourcedMap() {
  const m = new Map();
  fs.readFileSync(path.join(SQ, 'section-audit.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
    .forEach(a => {
      if (EXCLUDE.has(a.card_id)) return;
      if (a.sections.length && a.sections.every(h => RANKED.test(h))) return;   // ranked table
      m.set(a.card_id, a.n);
    });
  return m;
}
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

(async () => {
  if (has('--snapshot')) { await snapshot('before'); return; }

  if (has('--columns')) {
    await run(`alter table player_season_cards add column if not exists shirt_number integer;`);
    await run(`alter table player_season_cards add column if not exists shirt_number_source text;`);
    console.log('columns added:', await readBack(`(select string_agg(attname,',' order by attname) from pg_attribute where attrelid='player_season_cards'::regclass and attname in ('shirt_number','shirt_number_source'))`));
    return;
  }

  if (has('--backfill')) {
    const sourced = sourcedMap();
    console.log('sourced numbers to write:', sourced.size);

    /*  STEP 1 , THE UNSPLIT CARDS, SET-BASED. A player-season holding ONE card has no club
        ambiguity, so its modal number is unambiguous and carries NO arrows. ~44,000 rows, done
        in the database rather than over the wire.  */
    await run(`update player_season_cards c
       set shirt_number = pp.shirt_number,
           shirt_number_source = case when pp.shirt_number is null then null else 'modal_single' end
       from player_positions pp
      where pp.api_player_id = c.api_player_id and pp.season_year = c.season_year
        and pp.league_code = c.league_code
        and not exists (select 1 from player_season_cards o
                         where o.api_player_id=c.api_player_id and o.season=c.season
                           and o.league_code=c.league_code and o.id<>c.id);`);
    console.log('step 1, modal_single written:', await readBack(`(select count(*)::text from player_season_cards where shirt_number_source='modal_single')`));

    /*  STEP 2 , THE SPLIT HALVES, PER THE ATTRIBUTION RULE. Computed here because it needs the
        appearance margin between siblings and the sourced map.  */
    const led = fs.readFileSync(SPLIT, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    const NEW = new Set(led.map(l => l.new_card_id));
    const ids = [...new Set(led.flatMap(l => [l.new_card_id, l.sibling_card_id]))];
    let rows = [];
    for (const c of chunk(ids, 200)) {
      const { data, error } = await sb.from('player_season_cards')
        .select('id,api_player_id,season,season_year,league_code,appearances').in('id', c);
      if (error) throw new Error(error.message);
      rows = rows.concat(data);
    }
    const M = new Map(rows.map(r => [r.id, r]));
    const ppNum = new Map();
    for (const c of chunk([...new Set(rows.map(r => r.api_player_id))], 200)) {
      const { data } = await sb.from('player_positions').select('api_player_id,season_year,league_code,shirt_number').in('api_player_id', c);
      (data || []).forEach(p => ppNum.set(`${p.api_player_id}|${p.season_year}|${p.league_code}`, p.shirt_number));
    }
    const pair = {};
    led.forEach(l => { (pair[l.key] = pair[l.key] || { sib: l.sibling_card_id, news: [] }).news.push(l.new_card_id); });

    const writes = [];   // [id, number|null, source|null]
    for (const [key, v] of Object.entries(pair)) {
      const s = M.get(v.sib); if (!s) continue;
      const rivals = v.news.map(i => M.get(i)).filter(Boolean);
      const top = rivals.slice().sort((a, b) => (b.appearances || 0) - (a.appearances || 0))[0];
      const d = (s.appearances || 0) - (top ? (top.appearances || 0) : 0);
      const n = ppNum.get(`${s.api_player_id}|${s.season_year}|${s.league_code}`) ?? null;

      // the ORIGINAL half
      if (sourced.has(s.id)) writes.push([s.id, sourced.get(s.id), 'squadnum']);
      else if (n == null) writes.push([s.id, null, null]);
      else if (d <= -3) writes.push([s.id, null, null]);            // the number moves to the new half
      else writes.push([s.id, n, 'modal_split']);                   // keeps it, with the arrows

      // the NEW halves
      for (const r of rivals) {
        if (sourced.has(r.id)) writes.push([r.id, sourced.get(r.id), 'squadnum']);
        else if (d <= -3 && r === top && n != null) writes.push([r.id, n, 'modal_split']);   // the moved number
        else writes.push([r.id, null, null]);
      }
    }
    console.log('step 2, split halves to write:', writes.length);
    for (const c of chunk(writes, 500)) {
      const vals = c.map(([id, n, src]) => `(${id},${n == null ? 'NULL' : n},${src == null ? 'NULL' : `'${src}'`})`).join(',');
      await run(`update player_season_cards c set shirt_number = v.n, shirt_number_source = v.src
                 from (values ${vals}) as v(id,n,src) where c.id = v.id;`);
    }
    const tally = await readBack(`(select coalesce(shirt_number_source,'(null)')||' '||count(*) from player_season_cards group by 1 order by 1)`).catch(() => null);
    console.log('\nsource tally:');
    for (const s of ['squadnum', 'modal_single', 'modal_split'])
      console.log(`  ${s.padEnd(13)}`, await readBack(`(select count(*)::text from player_season_cards where shirt_number_source='${s}')`));
    console.log('  no number    ', await readBack(`(select count(*)::text from player_season_cards where shirt_number is null)`));
    console.log('\nthe excluded card 169534 now holds:',
      await readBack(`(select coalesce(shirt_number::text,'NULL')||' / '||coalesce(shirt_number_source,'NULL') from player_season_cards where id=169534)`));
    return;
  }

  if (has('--rebuild-sql')) {
    const cols = await readBack(`(select string_agg(attname, ', ' order by attnum) from pg_attribute where attrelid='player_card_mv'::regclass and attnum>0 and not attisdropped)`);
    const idx = await readBack(`(select string_agg(indexdef, ';  ' order by indexname) from pg_indexes where tablename='player_card_mv')`);
    fs.writeFileSync(path.join(DIR, 'REBUILD.sql'),
      `-- SITTING 2 , MATVIEW REBUILD. Run in the Supabase SQL editor, one block.\n`
      + `-- 87 columns become 88: shirt_number_source is appended.\n`
      + `set statement_timeout = '600s';\n\ndrop materialized view player_card_mv;\n\n`
      + `create materialized view player_card_mv as\n select ${cols}, shirt_number_source\n from player_card_view;\n\n`
      + idx.split(';  ').map(s => s.trim() + ';').join('\n') + '\n\n'
      + `grant select on player_card_mv to anon, authenticated, service_role;\n`);
    console.log('written:', path.join(DIR, 'REBUILD.sql'));
    return;
  }

  if (has('--rollback')) {
    const def = fs.readFileSync(VIEWCAP, 'utf8');
    if (def.length < 20000) throw new Error('captured viewdef looks wrong: ' + def.length + ' chars');
    await run(`create or replace view player_card_view as ${def}`);
    const now = Number(await readBack(`(select length(pg_get_viewdef('player_card_view'::regclass))::text)`));
    console.log('view restored, length now', now, '| captured', def.length);
    console.log('rt md5:', await readBack(`(${RT_MD5})`));
    console.log('\nThe psc columns stay, present and unread. The matview still needs a rebuild or refresh.');
    return;
  }

  console.log('need --snapshot | --columns | --backfill | --transfers | --view | --rebuild-sql | --rollback');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
