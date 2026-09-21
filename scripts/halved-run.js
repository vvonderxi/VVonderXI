/*  HALVED CARDS , SITTING 1. THE RUN. INSERT-ONLY.
    ================================================
    `docs/HALVED_SPLIT_BUILD_PLAN.md` is the sitting. This executes it.

      node scripts/halved-run.js --snapshot     # before-capture, writes nothing to the DB
      node scripts/halved-run.js --run          # constraint change, then the inserts
      node scripts/halved-run.js --guard-a      # def_share on every written half, pre-refresh
      node scripts/halved-run.js --rollback     # delete the ledger's rows, restore the constraint

    THE GATES ARE RE-APPLIED AT WRITE TIME AGAINST A FRESH FETCH, NOT REPLAYED FROM THE DRY RUN.
    The dry run chose the CANDIDATES; it does not license the write. SS E's rule from the
    transfer-halves repair is explicit , taking a stored figure and a fresh figure into one
    operation mixes a stale write with a fresh read inside one field. So every candidate is
    fetched again and judged again, and anything that has moved since the dry run is HELD.

    THE LEDGER IS APPEND-ONLY AND IS THE ROLLBACK. Each line carries the new card_id, the key,
    the source block and the provider payload's timestamp, so a bad write is findable per row
    rather than by re-running the job. A re-run skips keys the ledger already holds, so an
    interrupted run resumes instead of restarting.

    THE CONSTRAINT CHANGE IS NOT ROLLED BACK BY `--run` AND MUST NOT BE. Sittings 2, 3 and 4 all
    depend on it. `--rollback` exists for a failure during this sitting only.
*/
require('dotenv').config({ path: '.env', quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.APIFOOTBALL_KEY, BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = { PL:39, LL:140, SA:135, BL:78, L1:61, PRT:94, ERE:88, BPL:144, TR:203 };
const DIR = path.join('migrations', 'halved_split_2026-09-21');
const LEDGER = path.join(DIR, 'written.jsonl');
const HELD   = path.join(DIR, 'held.jsonl');
const OLD_CON = 'player_season_cards_api_player_id_season_league_code_key';
const NEW_CON = 'player_season_cards_api_player_id_season_league_code_team_id_key';
const SOURCE  = 'apifootball_split';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const has = n => process.argv.includes(n);
const num = x => (x == null ? null : (parseInt(x) || 0));

async function readBack(expr) {
  const sql = `select set_config('statement_timeout','600000',false);select (('x'||(${expr})))::int`;
  const { error } = await sb.rpc('exec_sql', { sql });
  if (!error) throw new Error('expected the error channel and got none');
  const m = /invalid input syntax for type integer: "x([\s\S]*)"$/.exec(error.message);
  if (!m) throw new Error('unparseable: ' + error.message);
  return m[1];
}
async function ddl(sql) { const { error } = await sb.rpc('exec_sql', { sql }); if (error) throw new Error(error.message); }

const RT_MD5  = `select md5(string_agg(card_id::text||':'||coalesce(rt::text,'NULL'), ',' order by card_id)) from player_card_view`;
const CON_DEF = `select coalesce(string_agg(conname||' :: '||pg_get_constraintdef(oid), ' | ' order by conname),'NONE')
                 from pg_constraint where conrelid='player_season_cards'::regclass and contype in ('u','p')`;

async function snapshot(label) {
  const snap = { label, at: new Date().toISOString(),
    rt_md5: await readBack(`(${RT_MD5})`),
    rows: await readBack(`(select count(*)::text from player_season_cards)`),
    view_rows: await readBack(`(select count(*)::text from player_card_view)`),
    constraints: await readBack(`(${CON_DEF})`),
    indexes: await readBack(`(select count(*)::text from pg_indexes where tablename='player_card_mv')`),
    bands: await readBack(`(select 'gen '||count(*) filter (where rt>=95)||' iconic '||count(*) filter (where rt>=90 and rt<95)
                            ||' wc '||count(*) filter (where rt>=85 and rt<90)||' standout '||count(*) filter (where rt>=80 and rt<85)
                            from player_card_view)`) };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${label}.json`), JSON.stringify(snap, null, 2) + '\n');
  console.log(JSON.stringify(snap, null, 2));
  return snap;
}

function ledgerKeys() {
  if (!fs.existsSync(LEDGER)) return new Set();
  return new Set(fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key));
}

async function teamMap() {
  const m = new Map();
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('teams').select('id,name').range(f, f + 999).order('id');
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    data.forEach(t => m.set(t.name, t.id));
    if (data.length < 1000) break;
  }
  return m;
}

function cardFrom(block, sibling, teamId) {
  const g = block.games || {}, s = block;
  return {
    player_id: sibling.player_id, team_id: teamId, league_id: sibling.league_id,
    api_player_id: sibling.api_player_id, season: sibling.season, season_year: sibling.season_year,
    league_code: sibling.league_code, team_name: block.team.name,
    position: sibling.position, age: sibling.age,
    appearances: num(g.appearences), minutes: num(g.minutes),
    goals: num(s.goals && s.goals.total), assists: num(s.goals && s.goals.assists),
    rating: g.rating ? parseFloat(g.rating) : null,
    rt: null,                                   // the engine never reads this column , see the canary
    shots_total: num(s.shots && s.shots.total), shots_on: num(s.shots && s.shots.on),
    passes_total: num(s.passes && s.passes.total), passes_key: num(s.passes && s.passes.key),
    passes_accuracy: num(s.passes && s.passes.accuracy),
    dribbles_attempts: num(s.dribbles && s.dribbles.attempts), dribbles_success: num(s.dribbles && s.dribbles.success),
    tackles_total: num(s.tackles && s.tackles.total), tackles_blocks: num(s.tackles && s.tackles.blocks),
    interceptions: num(s.tackles && s.tackles.interceptions),
    duels_total: num(s.duels && s.duels.total), duels_won: num(s.duels && s.duels.won),
    fouls_drawn: num(s.fouls && s.fouls.drawn), fouls_committed: num(s.fouls && s.fouls.committed),
    cards_yellow: num(s.cards && s.cards.yellow), cards_red: num(s.cards && s.cards.red),
    starts: num(g.lineups),
    goals_conceded: num(s.goals && s.goals.conceded), saves: num(s.goals && s.goals.saves),
    penalties_scored: num(s.penalty && s.penalty.scored), penalties_missed: num(s.penalty && s.penalty.missed),
    penalties_saved: num(s.penalty && s.penalty.saved),
    source: SOURCE,
  };
}

(async () => {
  if (has('--snapshot')) { await snapshot('before'); return; }

  if (has('--guard-a')) {
    /*  GUARD A , run against the VIEW, which recomputes, so it does NOT wait for a refresh.
        IT EXISTS TO CATCH ONE THING: a half written with the WRONG team_id, which gets no team
        totals to divide by and whose defender then collapses.

        THE FIRST TWO VERSIONS TESTED `def_share IS NULL` AND FAILED 155 AND THEN 43 CORRECT ROWS.
        `def_share` is null for four reasons and only the last is this guard's business:
          - THE CARD IS NOT SCORED , `scored` requires `minutes >= 300 AND goals IS NOT NULL`.
            368 of 831 halves are unscored BY DESIGN; that is the NR population the scope predicted.
          - THE SEASON IS PRE-2016 , `pool_ingr` and `team_def` both cut there.
          - THE CARD HAS NO DEFENSIVE BLOCK , `def90` needs `tackles_total`, and detailed coverage
            ramps through 2016 to 2018. All 43 of the second version's failures were exactly this.
          - A WRONG team_id. This one.

        SO THE PRIMARY TEST IS DIRECT AND HAS NO CONFOUNDERS: does the half resolve to the SAME
        team_id that the rest of its club-season already uses? That is the failure, stated as
        itself, rather than inferred from a value four other things can null. The def_share test
        is kept as a secondary, scoped to rows that are ELIGIBLE for one.  */
    const led = fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    const ids = led.map(l => l.new_card_id);
    let rows = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await sb.from('player_season_cards')
        .select('id,team_id,team_name,season_year,league_code').in('id', ids.slice(i, i + 200));
      if (error) throw new Error(error.message);
      rows = rows.concat(data);
    }
    let mismatch = [], checked = 0, lone = [];
    for (const r of rows) {
      const { data: o } = await sb.from('player_season_cards').select('team_id')
        .eq('team_name', r.team_name).eq('season_year', r.season_year)
        .eq('league_code', r.league_code).neq('id', r.id).limit(8);
      const seen = [...new Set((o || []).map(x => x.team_id))];
      if (!seen.length) { lone.push(`${r.id} ${r.team_name} ${r.season_year} ${r.league_code}`); continue; }
      checked++;
      if (!seen.includes(r.team_id)) mismatch.push(`${r.id} ${r.team_name} ${r.season_year} ours=${r.team_id} others=${seen.join('/')}`);
    }
    console.log(`GUARD A , club identity: ${rows.length} halves, ${checked} checked against their club-season`);
    console.log(`  team_id mismatches : ${mismatch.length}` + (mismatch.length ? '\n    ' + mismatch.join('\n    ') : ''));
    console.log(`  club had no other card that season : ${lone.length}` + (lone.length ? ' , ' + lone.join('; ') : ''));

    let unexplained = [];
    for (let i = 0; i < ids.length; i += 300) {
      const list = ids.slice(i, i + 300).join(',');
      const bad = await readBack(`(select coalesce(string_agg(v.card_id::text||' '||v.player_name||' '||v.team_name,', '),'NONE')
        from player_card_view v join player_season_cards c on c.id = v.card_id
        where v.card_id in (${list}) and v.def_share is null
          and v.rt is not null and v.season_year >= 2016 and c.tackles_total is not null
          and coalesce(v.position_pool,'')<>'GK' and v."position"<>'GK')`);
      if (bad !== 'NONE') unexplained.push(bad);
    }
    console.log(`  eligible rows with no def_share : ${unexplained.length ? unexplained.join('; ') : 'NONE'}`);
    const ok = mismatch.length === 0 && unexplained.length === 0;
    console.log(ok ? '\nGUARD A PASSES' : '\nGUARD A FAILS , the run stops and those halves are deleted');
    if (!ok) process.exit(1);
    return;
  }

  if (has('--rollback')) {
    const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before.json'), 'utf8'));
    const led = fs.readFileSync(LEDGER, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    const ids = led.map(l => l.new_card_id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await sb.from('player_season_cards').delete().in('id', ids.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
    console.log('deleted', ids.length, 'rows');
    await ddl(`alter table player_season_cards drop constraint ${NEW_CON};`);
    await ddl(`alter table player_season_cards add constraint ${OLD_CON} unique (api_player_id, season, league_code);`);
    const after = await snapshot('after_rollback');
    console.log(after.rt_md5 === before.rt_md5 ? 'rt md5 MATCH' : `rt md5 DIFFERS ${before.rt_md5} -> ${after.rt_md5}`);
    return;
  }

  if (!has('--run')) { console.log('need --snapshot | --run | --guard-a | --rollback'); return; }

  // ── THE RUN ──────────────────────────────────────────────────────────────────────────────
  const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before.json'), 'utf8'));
  if (!before.rt_md5) throw new Error('run --snapshot first');

  const dry = fs.readFileSync('scripts/figures/halved-dryrun.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
  const candidates = dry.filter(l => l.verdict === 'WRITE' && l.team_agrees !== false);
  console.log(`candidates ${candidates.length} (the 5 club-disagreement holds are already excluded)`);

  const done = ledgerKeys();
  if (done.size) console.log(`resuming , ledger already holds ${done.size} keys`);
  const teams = await teamMap();

  // the constraint, once, and NOT rolled back , sittings 2, 3 and 4 depend on it
  const cons = await readBack(`(${CON_DEF})`);
  if (cons.includes(OLD_CON)) {
    await ddl(`alter table player_season_cards drop constraint ${OLD_CON};`);
    await ddl(`alter table player_season_cards add constraint ${NEW_CON} unique (api_player_id, season, league_code, team_id);`);
    console.log('CONSTRAINT changed , table-wide, deliberately NOT rolled back at the end');
  } else console.log('CONSTRAINT already changed , leaving it');

  const stat = { written:0, rows:0, held:0, failed:0, skipped:done.size };
  const heldReason = {};
  const holdIt = (rec, why) => { heldReason[why] = (heldReason[why]||0)+1; stat.held++;
    fs.appendFileSync(HELD, JSON.stringify({ ...rec, why }) + '\n'); };

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (done.has(c.key)) continue;
    const [apiId, season, code] = c.key.split('|');
    const rec = { key: c.key, name: c.name };

    // stored card , re-read, never replayed
    const { data: rows, error: e0 } = await sb.from('player_season_cards').select('*')
      .eq('api_player_id', +apiId).eq('season_year', +season).eq('league_code', code);
    if (e0) { stat.failed++; console.error('  DB', c.key, e0.message); continue; }
    if (rows.length !== 1) { holdIt(rec, `stored_cards_${rows.length}`); continue; }
    const sibling = rows[0];

    // fresh fetch , the gates are judged on today's answer
    let j = null;
    for (let a = 0; a < 3 && !j; a++) {
      try { j = await (await fetch(`${BASE}/players?id=${apiId}&season=${season}`, { headers:{'x-apisports-key':KEY} })).json(); }
      catch (err) { await sleep(1500); }
    }
    await sleep(320);
    const st = j && j.response && j.response[0] && j.response[0].statistics;
    if (!st) { holdIt(rec, 'G0_no_provider_answer'); continue; }

    const byTeam = new Map();
    for (const b of st) if (b.league && b.league.id === LEAGUE_ID[code] && b.team && b.team.id != null && !byTeam.has(b.team.id)) byTeam.set(b.team.id, b);
    const blocks = [...byTeam.values()];
    if (!blocks.length) { holdIt(rec, 'G1_no_block_for_league'); continue; }
    const playing = blocks.filter(b => num(b.games?.minutes) > 0 || num(b.games?.appearences) > 0);
    if (playing.length < 2) { holdIt(rec, 'G2_not_a_split'); continue; }
    const sum = blocks.reduce((a, b) => a + num(b.games?.minutes), 0);
    const match = blocks.filter(b => num(b.games?.minutes) === sibling.minutes);
    if (sibling.minutes === sum) { holdIt(rec, 'G3_already_fused'); continue; }
    if (match.length !== 1) { holdIt(rec, `G3_match_${match.length}`); continue; }
    if (match[0].team.name !== sibling.team_name) { holdIt(rec, 'G5_card_club_disagrees'); continue; }
    const missing = blocks.filter(b => b.team.id !== match[0].team.id);
    if (missing.some(b => num(b.games?.appearences) < 1)) { holdIt(rec, 'G4_zero_appearance_block'); continue; }
    const unresolved = missing.filter(b => !teams.has(b.team.name));
    if (unresolved.length) { holdIt({ ...rec, clubs: unresolved.map(b => b.team.name) }, 'precondition_no_teams_row'); continue; }

    /*  G6 , IS THE CLUB EVEN IN THIS LEAGUE THIS SEASON? Added after the first run, which wrote
        exactly one card that failed it: the provider returned a LIGUE 1 block for Saint Etienne
        2025/26, who are in Ligue 2 that season and have a 927-minute Ligue 2 block in the same
        response. Every structural gate passed it , two clubs, minutes matching one block, the
        club resolving to a real teams row , because none of them asks whether the club PLAYED
        that competition. Our own data answers it for free: a real top-flight club-season holds
        about twenty cards. Measured across the 831 written halves, the separation is total ,
        this was the only one under eight, and it had ZERO.  */
    let thin = null;
    for (const b of missing) {
      const { count } = await sb.from('player_season_cards').select('id', { count:'exact', head:true })
        .eq('team_name', b.team.name).eq('season_year', +season).eq('league_code', code);
      if (count < 8) { thin = `${b.team.name} has ${count} cards in ${code} ${season}`; break; }
    }
    if (thin) { holdIt({ ...rec, detail: thin }, 'G6_club_not_in_this_league_that_season'); continue; }

    const lines = [];
    let failedHere = false;
    for (const b of missing) {
      const { data, error } = await sb.from('player_season_cards')
        .insert(cardFrom(b, sibling, teams.get(b.team.name))).select('id');
      if (error) { stat.failed++; failedHere = true; console.error('  INSERT', c.key, b.team.name, error.message); break; }
      lines.push({ key: c.key, name: c.name, new_card_id: data[0].id, sibling_card_id: sibling.id,
                   team_name: b.team.name, minutes: num(b.games?.minutes), appearances: num(b.games?.appearences),
                   goals: num(b.goals?.total), source_team_id: b.team.id, at: new Date().toISOString() });
    }
    if (failedHere) continue;
    fs.appendFileSync(LEDGER, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
    stat.written++; stat.rows += lines.length;

    if ((i + 1) % 50 === 0) console.log(`  ${i+1}/${candidates.length}  written ${stat.written} rows ${stat.rows} held ${stat.held} failed ${stat.failed}`);
  }

  const after = await snapshot('after_write');
  console.log('\n' + JSON.stringify({ ...stat, held_reasons: heldReason }, null, 2));
  console.log(`\nrt md5  ${before.rt_md5}  ->  ${after.rt_md5}`);
  console.log('NOT REFRESHED. The matview serves the old state until the refresh runs in the SQL editor.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
