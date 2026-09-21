/*  HALVED CARDS , THE CANARY. ONE CARD, WRITTEN AND THEN ROLLED BACK, TO PROVE THE ROLLBACK.
    ==========================================================================================
    `docs/HALVED_SPLIT_BUILD_PLAN.md` is the sitting. This runs ONE candidate of it end to end so
    the reversal is demonstrated on a card we can look at, before 828 are written.

      node scripts/halved-canary.js --before                 # snapshot, writes nothing
      node scripts/halved-canary.js --write --key 19281|2025|PL
      node scripts/halved-canary.js --verify
      node scripts/halved-canary.js --rollback

    THREE THINGS THIS FILE EXISTS TO STATE, BECAUSE NONE OF THEM IS OBVIOUS FROM THE PLAN:

    1. THE CONSTRAINT CHANGE CANNOT BE SCOPED TO ONE CARD. `UNIQUE (api_player_id, season,
       league_code)` is what forbids the second row, so it is dropped for the whole TABLE before a
       single insert. The canary is therefore a table-wide DDL change plus one row, and the
       rollback puts the constraint back. There is no smaller version of this.

    2. DROPPING IT BREAKS `import-players.js` UNTIL ITS `onConflict` IS CHANGED. That upsert names
       `api_player_id,season,league_code` (line 632), and PostgREST resolves it against a real
       unique index. With the index gone the next import run errors rather than writing wrongly ,
       loud, not silent , but the sitting must change that line in the same commit. The canary
       restores the old constraint, so nothing is left broken by this script.

    3. THE STORED `rt` COLUMN IS NOT THE SCORE. Measured on a fresh viewdef (21,846 chars):
       `psc.rt`, `psc_1.rt` and `\.rt\b` occur ZERO times, `rt_new` three. The engine never reads
       the column, so what is written there cannot move a card. It is written exactly as the
       importer writes it, for consistency with its sibling and nothing more.

    THE PROOF OF REVERSAL IS AN md5 OVER THE VIEW, NOT THE MATVIEW, and the difference matters:
    inserting one card into a percentile pool moves its neighbours, and only the view recomputes.
    A matview hash would come back identical before any refresh and prove nothing at all.
    It is computed IN SQL with `coalesce(rt::text,'NULL')` , in JS a null interpolates as the
    lowercase word "null" and yields a different hash for identical data (the 2026-09-19 trap).
*/
require('dotenv').config({ path: '.env', quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.APIFOOTBALL_KEY, BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = { PL:39, LL:140, SA:135, BL:78, L1:61, PRT:94, ERE:88, BPL:144, TR:203 };
const DIR = path.join('migrations', 'halved_split_canary_2026-09-21');
const OLD_CON = 'player_season_cards_api_player_id_season_league_code_key';
const NEW_CON = 'player_season_cards_api_player_id_season_league_code_team_id_key';
const SOURCE  = 'apifootball_split';   // a SECOND handle on these rows, independent of the ledger
const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i+1]; };
const has = n => process.argv.includes(n);

/*  exec_sql DISCARDS SELECT OUTPUT, so a value is read back through the ERROR CHANNEL: cast a
    text expression to int and parse the "invalid input syntax" message. The timeout is raised in
    the SAME call because set_config persists on the POOLED connection, not across calls.  */
async function readBack(expr) {
  const sql = `select set_config('statement_timeout','600000',false);`
            + `select (('x'||(${expr})))::int`;
  const { error } = await sb.rpc('exec_sql', { sql });
  if (!error) throw new Error('expected the error channel and got none , the expression returned null?');
  const m = /invalid input syntax for type integer: "x([\s\S]*)"/.exec(error.message);
  if (!m) throw new Error('unparseable: ' + error.message);
  return m[1];
}
async function ddl(sql) {
  const { error } = await sb.rpc('exec_sql', { sql });
  if (error) throw new Error(error.message);
}
const RT_MD5 = `select md5(string_agg(card_id::text||':'||coalesce(rt::text,'NULL'), ',' order by card_id)) from player_card_view`;
const CON_DEF = `select coalesce(string_agg(conname||' :: '||pg_get_constraintdef(oid), ' | ' order by conname),'NONE')
                 from pg_constraint where conrelid='player_season_cards'::regclass and contype in ('u','p')`;

async function snapshot(label) {
  const snap = {
    label, at: new Date().toISOString(),
    rt_md5: await readBack(`(${RT_MD5})`),
    rows:   await readBack(`(select count(*)::text from player_season_cards)`),
    view_rows: await readBack(`(select count(*)::text from player_card_view)`),
    constraints: await readBack(`(${CON_DEF})`),
  };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, `${label}.json`), JSON.stringify(snap, null, 2) + '\n');
  console.log(JSON.stringify(snap, null, 2));
  return snap;
}

async function providerBlocks(apiId, season, code) {
  const r = await fetch(`${BASE}/players?id=${apiId}&season=${season}`, { headers: { 'x-apisports-key': KEY } });
  const j = await r.json();
  const st = (j.response && j.response[0] && j.response[0].statistics) || [];
  const byTeam = new Map();
  for (const b of st) {
    if (b.league && b.league.id === LEAGUE_ID[code] && b.team && b.team.id != null && !byTeam.has(b.team.id))
      byTeam.set(b.team.id, b);
  }
  return { player: j.response && j.response[0] && j.response[0].player, blocks: [...byTeam.values()] };
}

/*  THE ROW IS BUILT THE WAY `import-players.js` BUILDS ONE, FIELD FOR FIELD, so a split half is
    indistinguishable from a natively imported card except for `source`. Anything taken from the
    SIBLING rather than from the provider is marked and justified.  */
const num = x => (x == null ? null : (parseInt(x) || 0));
function cardFrom(block, sibling, teamId) {
  const g = block.games || {}, s = block;
  return {
    player_id: sibling.player_id,          // sibling: same player, same season , not re-resolved
    team_id: teamId,                       // OUR teams.id, matched BY NAME (api_team_id is null on all 337)
    league_id: sibling.league_id,          // sibling: our internal league id, not the provider's
    api_player_id: sibling.api_player_id,
    season: sibling.season, season_year: sibling.season_year, league_code: sibling.league_code,
    team_name: block.team.name,
    position: sibling.position,            // sibling: SS C says the coarse field is the season's, not the club's
    age: sibling.age,                       // sibling: SS C records `age` as CURRENT age, so the provider's
                                            // value today would differ from the card beside it for no reason
    appearances: num(g.appearences), minutes: num(g.minutes),
    goals: num(s.goals && s.goals.total), assists: num(s.goals && s.goals.assists),
    rating: g.rating ? parseFloat(g.rating) : null,
    rt: null,                               // NOT the score , see the header. Left null rather than
                                            // given the importer's ratingToRt guess, because nothing
                                            // reads it and a manufactured number is what SS E warns of
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
  if (has('--before')) { await snapshot('before'); return; }

  if (has('--write')) {
    const key = arg('--key'); if (!key) throw new Error('--key <api_player_id|season|CODE>');
    const [apiId, season, code] = key.split('|');
    const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before.json'), 'utf8'));
    if (!before.rt_md5) throw new Error('run --before first');

    const { data: rows, error } = await sb.from('player_season_cards').select('*')
      .eq('api_player_id', +apiId).eq('season_year', +season).eq('league_code', code);
    if (error) throw new Error(error.message);
    if (rows.length !== 1) throw new Error(`expected exactly 1 stored card, found ${rows.length}`);
    const sibling = rows[0];

    const { blocks } = await providerBlocks(apiId, season, code);
    const match = blocks.filter(b => num(b.games && b.games.minutes) === sibling.minutes);
    if (match.length !== 1) throw new Error(`gate G3: ${match.length} blocks match ${sibling.minutes} minutes`);
    if (match[0].team.name !== sibling.team_name) throw new Error('gate G5: the card names a different club');
    const missing = blocks.filter(b => b.team.id !== match[0].team.id);
    if (!missing.length) throw new Error('gate G2: one team only');
    if (missing.some(b => num(b.games && b.games.appearences) < 1)) throw new Error('gate G4: zero-appearance block');

    const written = [];
    for (const b of missing) {
      const { data: t } = await sb.from('teams').select('id').eq('name', b.team.name).limit(1);
      if (!t || !t.length) throw new Error(`precondition: no teams row named "${b.team.name}" , HELD, never created`);
      written.push({ block: b, card: cardFrom(b, sibling, t[0].id) });
    }

    console.log('CONSTRAINT , table-wide, this is not scopeable to one row');
    await ddl(`alter table player_season_cards drop constraint ${OLD_CON};`);
    await ddl(`alter table player_season_cards add constraint ${NEW_CON} unique (api_player_id, season, league_code, team_id);`);
    console.log('  dropped ' + OLD_CON + ', added ' + NEW_CON);

    const ledger = [];
    for (const w of written) {
      const { data, error: e } = await sb.from('player_season_cards').insert(w.card).select('id,team_name,minutes,appearances,goals');
      if (e) throw new Error('INSERT FAILED: ' + e.message);
      ledger.push({ key, new_card_id: data[0].id, sibling_card_id: sibling.id,
                    team_name: data[0].team_name, minutes: data[0].minutes,
                    appearances: data[0].appearances, goals: data[0].goals,
                    source_block: w.block.team, fetched_at: new Date().toISOString() });
      console.log(`  INSERTED card_id ${data[0].id} , ${data[0].team_name} ${data[0].minutes}m ${data[0].appearances}a ${data[0].goals}g`);
    }
    fs.appendFileSync(path.join(DIR, 'written.jsonl'), ledger.map(l => JSON.stringify(l)).join('\n') + '\n');
    await snapshot('after_write');
    console.log('\nNOT REFRESHED. The matview still serves the old state until the refresh runs in the SQL editor.');
    return;
  }

  if (has('--verify')) {
    const led = fs.readFileSync(path.join(DIR, 'written.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const ids = led.map(l => l.new_card_id);
    const { data } = await sb.from('player_season_cards').select('*').in('id', ids);
    console.log('ledger rows', led.length, '| found in table', data.length);
    const { count } = await sb.from('player_season_cards').select('id', { count:'exact', head:true }).eq('source', SOURCE);
    console.log(`rows carrying source='${SOURCE}':`, count, count === led.length ? '(matches the ledger)' : '(DOES NOT MATCH , stop)');
    data.forEach(r => console.log(JSON.stringify(r)));
    return;
  }

  if (has('--rollback')) {
    const before = JSON.parse(fs.readFileSync(path.join(DIR, 'before.json'), 'utf8'));
    const led = fs.readFileSync(path.join(DIR, 'written.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const ids = led.map(l => l.new_card_id);
    /*  ORDER MATTERS AND IS NOT SYMMETRIC: the OLD constraint cannot be re-added while a split
        pair exists, so the rows go first. A rollback that starts with the constraint fails and
        leaves the tree half-way.  */
    const { error: e1 } = await sb.from('player_season_cards').delete().in('id', ids);
    if (e1) throw new Error(e1.message);
    console.log('deleted', ids.length, 'row(s):', ids.join(', '));
    await ddl(`alter table player_season_cards drop constraint ${NEW_CON};`);
    await ddl(`alter table player_season_cards add constraint ${OLD_CON} unique (api_player_id, season, league_code);`);
    console.log('constraint restored');
    const after = await snapshot('after_rollback');
    const okHash = after.rt_md5 === before.rt_md5;
    const okRows = after.rows === before.rows;
    const okCon  = after.constraints === before.constraints;
    console.log(`\nrt md5      ${okHash ? 'MATCH' : 'DIFFERS'}  ${before.rt_md5} -> ${after.rt_md5}`);
    console.log(`row count   ${okRows ? 'MATCH' : 'DIFFERS'}  ${before.rows} -> ${after.rows}`);
    console.log(`constraints ${okCon  ? 'MATCH' : 'DIFFERS'}`);
    if (!(okHash && okRows && okCon)) process.exit(1);
    console.log('\nROLLBACK PROVEN. The matview still needs a refresh to serve the restored state.');
    return;
  }
  console.log('need one of --before --write --verify --rollback');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
