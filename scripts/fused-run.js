/*  SITTING 3 , THE OTHER 201 FUSED CARDS. RESUMABLE BY CONSTRUCTION.
    ================================================================================
    Scope: docs/FUSED_CARDS_SCOPE.md. The canary is scripts/fused-canary.js and is DONE.

      node scripts/fused-run.js --status    # where did it stop. Reads the ledger + the table.
      node scripts/fused-run.js --plan      # no network, no write. Reconciliation + predictions.
      node scripts/fused-run.js --run       # write, one card at a time, resumable
      node scripts/fused-run.js --rollback  # undo every row in the ledger, newest first

    WHY IT SURVIVES BEING KILLED, AND IT IS NOT THE LEDGER THAT MAKES IT SAFE.
    The ledger is a speed and reporting device. The thing that makes a double-write
    IMPOSSIBLE is guard G2, the fused test: a fused card's stored minutes EQUAL the sum of
    its provider blocks. The moment a card has been split, its stored minutes equal its
    LARGEST block, so G2 fails and the card is refused. A second pass over an already-written
    card therefore cannot insert a duplicate, whether or not the ledger survived.
    That is the same guard that refuses a card which was never a fusion, doing a second job.

    THE LEDGER IS APPEND-ONLY AND IS WRITTEN AFTER THE INSERT, NEVER BEFORE. A crash between
    the write and the ledger line leaves a card that IS split and NOT recorded , which
    --status reports as a mismatch between the table count and the ledger, and which G2 then
    skips on the next run. The opposite order would record work that never happened, which is
    the failure that cannot be detected from the data.
*/
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.APIFOOTBALL_KEY;
const DIR = path.join('migrations', 'fused_split_2026-09-26');
const LEDGER = path.join(DIR, 'ledger.jsonl');
const CANDS = 'scripts/figures/fused-candidates.json';
const arg = n => process.argv.includes(n);

/*  THE CANARY CARD. Written and rolled back on 2026-09-25/26, so it is UNSPLIT today and is
    excluded here because Lucas holds it as one of the five.  */
const CANARY = 187486;

/*  THE FIVE HOLDS , the cards where "the largest half" is decided by under 5% of the season's
    minutes. Measured, not chosen: docs/FUSED_CARDS_SCOPE.md SS 0.5. They are held because the
    note a card receives turns on which half was the whole, and on a one-minute margin that is a
    coin flip wearing a rule. NOT because the split itself is wrong , the card keeps the name it
    already carries either way.  */
const HOLD = [187486, 187084, 187484, 187133, 186883];

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const n0  = v => (v === null || v === undefined ? null : Number(v));
const mins = b => (b.minutes != null ? b.minutes : b.min);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/*  THE CARD SHAPE IS THE IMPORTER'S, FIELD FOR FIELD , copied verbatim from
    scripts/fused-canary.js, which copied it from scripts/import/import-players.js. A card this
    sitting writes must be indistinguishable from one the importer writes.  */
function cardFromBlock(s, base, teamId, teamName, shirt){
  return {
    player_id: base.player_id, team_id: teamId, league_id: base.league_id, api_player_id: base.api_player_id,
    season: base.season, season_year: base.season_year, league_code: base.league_code, team_name: teamName,
    position: base.position, age: base.age,
    appearances: n0(s.games?.appearences), minutes: n0(s.games?.minutes),
    goals: n0(s.goals?.total), assists: n0(s.goals?.assists),
    rating: s.games?.rating ? parseFloat(s.games.rating) : null,
    rt: null,
    shots_total: n0(s.shots?.total), shots_on: n0(s.shots?.on),
    passes_total: n0(s.passes?.total), passes_key: n0(s.passes?.key), passes_accuracy: n0(s.passes?.accuracy),
    dribbles_attempts: n0(s.dribbles?.attempts), dribbles_success: n0(s.dribbles?.success),
    tackles_total: n0(s.tackles?.total), tackles_blocks: n0(s.tackles?.blocks), interceptions: n0(s.tackles?.interceptions),
    duels_total: n0(s.duels?.total), duels_won: n0(s.duels?.won),
    fouls_drawn: n0(s.fouls?.drawn), fouls_committed: n0(s.fouls?.committed),
    cards_yellow: n0(s.cards?.yellow), cards_red: n0(s.cards?.red),
    starts: n0(s.games?.lineups), goals_conceded: n0(s.goals?.conceded), saves: n0(s.goals?.saves),
    penalties_scored: n0(s.penalty?.scored), penalties_missed: n0(s.penalty?.missed), penalties_saved: n0(s.penalty?.saved),
    source: 'apifootball',
    shirt_number: shirt.number, shirt_number_source: shirt.source,
  };
}

const readLedger = () => !fs.existsSync(LEDGER) ? []
  : fs.readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

async function tableCount(){
  const { count, error } = await sb.from('player_season_cards').select('*', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count;
}

/*  --status , WHERE DID IT STOP. Run this FIRST on any restart.  */
async function status(){
  const led = readLedger();
  const inserted = led.reduce((a, r) => a + (r.inserted || []).length, 0);
  const rows = await tableCount();
  const base = fs.existsSync(path.join(DIR, 'base_count.json'))
    ? JSON.parse(fs.readFileSync(path.join(DIR, 'base_count.json'), 'utf8')).rows : null;
  console.log('STATUS');
  console.log('  ledger lines (cards written) : ' + led.length);
  console.log('  rows inserted per the ledger : ' + inserted);
  console.log('  last card_id in the ledger   : ' + (led.length ? led[led.length - 1].card_id : '(none)'));
  console.log('  player_season_cards rows now : ' + rows);
  if (base == null) console.log('  base count before the run    : (not captured , this run has not started)');
  else {
    const want = base + inserted;
    console.log('  base count before the run    : ' + base);
    console.log('  expected now (base+inserted) : ' + want);
    console.log('  RECONCILES                   : ' + (want === rows ? 'YES' : 'NO , drift ' + (rows - want) +
      '  (a card split but not yet recorded, or a row written by something else)'));
  }
  return led;
}

async function main(){
  fs.mkdirSync(path.join(DIR, 'before'), { recursive: true });
  const cands = JSON.parse(fs.readFileSync(CANDS, 'utf8'));

  if (arg('--status')) { await status(); return; }

  /*  THE POPULATION, DERIVED RATHER THAN TYPED. 202 candidates, minus the canary card, minus the
      holds. Every count in the report comes from this list, never from a number in a document. */
  const attempted = cands.filter(c => c.card_id !== CANARY);
  const holds     = attempted.filter(c => HOLD.includes(c.card_id));
  const targets   = attempted.filter(c => !HOLD.includes(c.card_id));

  if (arg('--plan')){
    const three = targets.filter(c => c.blocks.length >= 3);
    let losesScore = 0, insertsUnscored = 0, insertsTotal = 0;
    targets.forEach(c => {
      const sorted = c.blocks.slice().sort((a,b) => mins(b) - mins(a));
      if (mins(sorted[0]) < 300) losesScore++;
      sorted.slice(1).forEach(b => { insertsTotal++; if (mins(b) < 300) insertsUnscored++; });
    });
    console.log('PLAN , nothing written, no network.\n');
    console.log('  candidates in file        : ' + cands.length);
    console.log('  canary card excluded      : 1  (' + CANARY + ', written and rolled back)');
    console.log('  attempted this run        : ' + attempted.length);
    console.log('  HELD                      : ' + holds.length + '  ' + holds.map(c => c.card_id + ' ' + c.name).join(' | '));
    console.log('  to write                  : ' + targets.length);
    console.log('  of those, three-club       : ' + three.length + '  ' + three.map(c => c.card_id).join(', '));
    console.log('\n  PREDICTIONS, to be measured after the run:');
    console.log('    reduced cards falling under the 300m floor : ' + losesScore);
    console.log('    rows inserted                              : ' + insertsTotal);
    console.log('    of those, under the floor (never scorable) : ' + insertsUnscored +
                '   (' + (100*insertsUnscored/insertsTotal).toFixed(1) + '%)');
    console.log('\n  HOLD SET RECONCILES: ' + cands.length + ' = ' + targets.length + ' written + ' +
                holds.length + ' held + 1 canary');
    return;
  }

  if (arg('--rollback')){
    const led = readLedger();
    console.log('ROLLBACK , ' + led.length + ' cards, newest first');
    for (const r of led.slice().reverse()){
      const cap = JSON.parse(fs.readFileSync(path.join(DIR, 'before', 'card_' + r.card_id + '.json'), 'utf8'));
      for (const id of r.inserted){
        const d = await sb.from('player_season_cards').delete().eq('id', id);
        if (d.error) throw new Error('delete ' + id + ': ' + d.error.message);
      }
      const u = await sb.from('player_season_cards').update(cap).eq('id', r.card_id);
      if (u.error) throw new Error('restore ' + r.card_id + ': ' + u.error.message);
    }
    console.log('  restored ' + led.length + ' cards and deleted ' +
                led.reduce((a,r)=>a+r.inserted.length,0) + ' inserted rows. Ledger left in place as the record.');
    return;
  }

  if (!arg('--run')){ console.log('pick a phase: --status | --plan | --run | --rollback'); return; }

  /*  BASE COUNT CAPTURED ONCE, WRITE-ONCE, so --status can reconcile on any later restart. */
  const bcPath = path.join(DIR, 'base_count.json');
  if (!fs.existsSync(bcPath)) fs.writeFileSync(bcPath, JSON.stringify({ rows: await tableCount(), at: new Date().toISOString() }, null, 1));

  /*  ONE QUERY, NOT ONE PER CARD: our league_id -> the provider's api_league_id. */
  const { data: lgs, error: lge } = await sb.from('leagues').select('id,api_league_id,code');
  if (lge) throw new Error(lge.message);
  const LEAGUE_API_ID = new Map(lgs.map(l => [l.id, l.api_league_id]));
  console.log('league map: ' + lgs.map(l => l.code + ' ' + l.id + '->' + l.api_league_id).join(', '));

  /*  23 OF THE 202 CARRY A NULL `league_id`, ALL TURKISH, SO THE MAP ABOVE IS NOT ENOUGH.
      The fallback is DERIVED, not typed: for each `league_code` in the population, take the
      distinct non-null `league_id` its populated siblings carry, and assert there is exactly one.
      A hand alias would have been needed otherwise , the card says `TR` and the leagues table
      says `TSL`, which is the two-names-for-one-thing trap SS C records, and deriving it from
      the rows means no third spelling can be invented here.  */
  let popRows = [];
  for (let i = 0; i < cands.length; i += 100){
    const { data, error } = await sb.from('player_season_cards')
      .select('id,league_code,league_id').in('id', cands.slice(i, i+100).map(c => c.card_id));
    if (error) throw new Error(error.message);
    popRows = popRows.concat(data || []);
  }
  const CODE_LEAGUE_ID = new Map();
  popRows.filter(r => r.league_id != null).forEach(r => {
    if (!CODE_LEAGUE_ID.has(r.league_code)) CODE_LEAGUE_ID.set(r.league_code, new Set());
    CODE_LEAGUE_ID.get(r.league_code).add(r.league_id);
  });
  for (const [code, set] of CODE_LEAGUE_ID)
    if (set.size !== 1) throw new Error('league_code ' + code + ' maps to ' + set.size + ' league_ids , stop');
  const codeToOurId = new Map([...CODE_LEAGUE_ID].map(([c, s]) => [c, [...s][0]]));
  console.log('null league_id on ' + popRows.filter(r => r.league_id == null).length +
              ' of ' + popRows.length + ' candidates, resolved by code: ' +
              [...codeToOurId].map(([c,i]) => c + '->' + i).join(', '));

  const led = await status();
  const done = new Set(led.map(r => r.card_id));
  console.log('\nRUN , ' + targets.length + ' targets, ' + done.size + ' already in the ledger and skipped\n');

  const res = { written: [], held: [], failed: [] };
  holds.forEach(c => res.held.push({ card_id: c.card_id, name: c.name, why: 'margin under 5%, held by decision' }));

  /*  --limit N , a POSITIVE CONTROL before the full run. The previous attempt held all 197 on a
      false reason and only an empty capture directory said so. One card written and reported
      proves the guards pass as well as fire.  */
  const li = process.argv.indexOf('--limit');
  const LIMIT = li > -1 ? Number(process.argv[li+1]) : Infinity;

  for (const c of targets){
    if (res.written.length >= LIMIT) break;
    if (done.has(c.card_id)) continue;
    try {
      const { data: rows, error } = await sb.from('player_season_cards').select('*').eq('id', c.card_id);
      if (error) throw new Error(error.message);
      if (!rows || rows.length !== 1) throw new Error('expected one row, got ' + (rows||[]).length);
      const row = rows[0];

      /*  THE PROVIDER'S LEAGUE ID, NOT OURS , THIS WAS A BUG AND IT HELD ALL 197 ON A FALSE
          REASON. `player_season_cards.league_id` is our internal key (Eredivisie is 7); the
          provider's is 88, which the canary had HARDCODED and so never exposed the difference.
          Comparing them matched no block, `same` came back empty, and every card was refused with
          "provider now returns 0 blocks" , a message that reads as the provider having changed
          rather than as my own instrument being wrong. Nothing was written, which is the guard
          working; the REASON it gave was not.  */
      const ourLeagueId = row.league_id != null ? row.league_id : codeToOurId.get(row.league_code);
      const leagueId = LEAGUE_API_ID.get(ourLeagueId);
      if (!leagueId) { res.held.push({ card_id: c.card_id, name: c.name, why: 'no api_league_id for league_id ' + row.league_id + ' / code ' + row.league_code }); continue; }
      const r = await fetch('https://v3.football.api-sports.io/players?id=' + row.api_player_id + '&season=' + row.season_year,
                            { headers: { 'x-apisports-key': KEY } });
      const j = await r.json();
      if (!r.ok || (j.errors && Object.keys(j.errors).length)) throw new Error('provider: ' + JSON.stringify(j.errors));
      const p = (j.response || [])[0];
      if (!p) throw new Error('provider returned no player');
      const same = (p.statistics || []).filter(x => x.league?.id === leagueId && num(x.games?.minutes) > 0);

      // G1 , the block count must match what the candidates file measured
      if (same.length !== c.blocks.length)
        { res.held.push({ card_id: c.card_id, name: c.name, why: 'provider now returns ' + same.length + ' blocks, file says ' + c.blocks.length }); continue; }
      if (same.length < 2)
        { res.held.push({ card_id: c.card_id, name: c.name, why: 'fewer than two blocks' }); continue; }

      // G2 , the fused test. ALSO the idempotency guard: an already-split card fails it.
      const sum = same.reduce((a, s) => a + num(s.games.minutes), 0);
      if (sum !== row.minutes)
        { res.held.push({ card_id: c.card_id, name: c.name, why: 'stored ' + row.minutes + 'm != block sum ' + sum + 'm (not a fusion, or already split)' }); continue; }

      // G3 , the card must name its largest block
      const sorted = same.slice().sort((a,b) => num(b.games.minutes) - num(a.games.minutes));
      const named = sorted[0], others = sorted.slice(1);
      if (named.team.name !== row.team_name)
        { res.held.push({ card_id: c.card_id, name: c.name, why: 'card names ' + row.team_name + ', largest block is ' + named.team.name + ' (relabel case)' }); continue; }

      // G4 , every other club resolves to EXACTLY ONE teams row. Never loosen this.
      const ids = [];
      let clubFail = null;
      for (const o of others){
        const { data: t, error: te } = await sb.from('teams').select('id,name').eq('name', o.team.name);
        if (te) throw new Error(te.message);
        if (!t || t.length !== 1) { clubFail = 'teams lookup for "' + o.team.name + '" returned ' + (t||[]).length; break; }
        ids.push(t[0].id);
      }
      if (clubFail) { res.held.push({ card_id: c.card_id, name: c.name, why: clubFail }); continue; }

      const shirt = { number: row.shirt_number,
                      source: row.shirt_number_source === 'modal_single' ? 'modal_split' : row.shirt_number_source };
      const reduced = cardFromBlock(named, row, row.team_id, row.team_name, shirt);
      const inserts = others.map((o, i) => cardFromBlock(o, row, ids[i], o.team.name, shirt));

      // CAPTURE BEFORE WRITE, WRITE-ONCE, READ BACK OFF DISK
      const cap = path.join(DIR, 'before', 'card_' + c.card_id + '.json');
      if (!fs.existsSync(cap)){
        fs.writeFileSync(cap, JSON.stringify(row, null, 1));
        if (JSON.parse(fs.readFileSync(cap, 'utf8')).id !== row.id) throw new Error('capture read-back mismatch');
      }

      const up = await sb.from('player_season_cards').update(reduced).eq('id', c.card_id);
      if (up.error) throw new Error('update: ' + up.error.message);
      const ins = await sb.from('player_season_cards').insert(inserts).select('id');
      if (ins.error) throw new Error('insert: ' + ins.error.message);
      const newIds = ins.data.map(d => d.id);

      // LEDGER LINE AFTER THE WRITE, NEVER BEFORE
      fs.appendFileSync(LEDGER, JSON.stringify({ card_id: c.card_id, name: c.name, key: c.key,
        minutes_before: row.minutes, minutes_after: reduced.minutes, inserted: newIds,
        inserted_minutes: inserts.map(x => x.minutes), at: new Date().toISOString() }) + '\n');
      res.written.push(c.card_id);
      if (res.written.length % 25 === 0) console.log('  ... ' + res.written.length + ' written (last ' + c.card_id + ')');
    } catch (e) {
      res.failed.push({ card_id: c.card_id, name: c.name, why: e.message });
      console.log('  FAILED ' + c.card_id + ' ' + c.name + ' , ' + e.message);
    }
    await sleep(350);   // provider pacing
  }

  console.log('\nRESULT');
  console.log('  written : ' + res.written.length);
  console.log('  held    : ' + res.held.length);
  res.held.forEach(h => console.log('      ' + h.card_id + ' ' + h.name + ' , ' + h.why));
  console.log('  failed  : ' + res.failed.length);
  res.failed.forEach(h => console.log('      ' + h.card_id + ' ' + h.name + ' , ' + h.why));
  fs.writeFileSync(path.join(DIR, 'result.json'), JSON.stringify(res, null, 1));
  console.log('\n  THE MATVIEW HAS NOT BEEN REFRESHED. Lucas runs it, then the drift check.');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
