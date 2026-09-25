/*  SITTING 3 CANARY , ONE FUSED CARD, WRITTEN AND THEN RESTORED. RUN ONE PHASE AT A TIME.
    ================================================================================
    Scope: docs/FUSED_CARDS_SCOPE.md, docs/FUSED_SPLIT_BUILD_PLAN.md.

      node scripts/fused-canary.js --dry       # capture, fetch, build, print. Writes NOTHING.
      node scripts/fused-canary.js --write     # UPDATE the fused row + INSERT the other club
      node scripts/fused-canary.js --restore   # put it back, and prove it column by column

    THE PICK IS ONE OF THE 44, WHICH IS THE HALF OF THIS SITTING NOBODY HAS SEEN ON A REAL CARD.
    Card 187486, G. Zechiel, Feyenoord 2024/25 ERE, rt 53 today. It satisfies every criterion the
    build plan set at once: exactly two clubs, currently scored, and a CDM with def_share 0.766,
    which is a pool where `sig = def_share_pct` is load-bearing , so the reduction moves something
    in the engine as well as on the face. And it LOSES its score: 505 minutes become 253, under the
    300-minute floor `scored` requires.

    THE OPERATION IS UPDATE + INSERT AND THE card_id IS KEPT. It is the card URL, it keys
    notes_cache, and it composes verdict_cache's pair_key. Deleting and re-inserting would orphan
    every cached verdict and note that names it.
*/
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.APIFOOTBALL_KEY;
const DIR = path.join('migrations', 'fused_split_2026-09-25');
const CARD_ID = 187486;
const LEAGUE_ID = 88;            // Eredivisie, api-football
const arg = n => process.argv.includes(n);

const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
const n0  = v => (v === null || v === undefined ? null : Number(v));

/*  THE CARD SHAPE IS THE IMPORTER'S, FIELD FOR FIELD , scripts/import/import-players.js. It is
    copied rather than imported because that file is a runnable script with no exports, and it is
    copied VERBATIM rather than summarised: a card this sitting writes must be indistinguishable
    from one the importer writes, or the next re-import produces a diff nobody can explain.  */
function cardFromBlock(s, base, teamId, teamName, shirt){
  return {
    player_id: base.player_id, team_id: teamId, league_id: base.league_id, api_player_id: base.api_player_id,
    season: base.season, season_year: base.season_year, league_code: base.league_code, team_name: teamName,
    position: base.position,
    age: base.age,
    appearances: n0(s.games?.appearences), minutes: n0(s.games?.minutes),
    goals: n0(s.goals?.total), assists: n0(s.goals?.assists),
    rating: s.games?.rating ? parseFloat(s.games.rating) : null,
    rt: null,                                   // psc.rt is a dead column; the view computes the score
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
    /*  THE SHIRT FIELDS ARE PART OF THE SPLIT, NOT A PASSENGER , sitting 2 created this problem.
        `modal_single` means "one club that season, so no ambiguity exists" and carries NO arrows;
        the moment the card has a sibling that value is FALSE. The number itself is the season-wide
        modal one, so it belongs to whichever club he started more for and is now ambiguous: the
        source becomes `modal_split`, which is the value that draws the arrows. A number found by
        squadnum for the specific club-season would override it, and that is phase A of the full
        run, not the canary.  */
    shirt_number: shirt.number, shirt_number_source: shirt.source,
  };
}

async function base(){
  const { data, error } = await sb.from('player_season_cards').select('*').eq('id', CARD_ID);
  if (error) throw new Error(error.message);
  if (!data || data.length !== 1) throw new Error('expected exactly one row for card ' + CARD_ID + ', got ' + (data||[]).length);
  return data[0];
}

async function blocks(apiId, year){
  const r = await fetch('https://v3.football.api-sports.io/players?id=' + apiId + '&season=' + year,
                        { headers: { 'x-apisports-key': KEY } });
  const j = await r.json();
  if (!r.ok || (j.errors && Object.keys(j.errors).length)) throw new Error('provider: ' + JSON.stringify(j.errors));
  const p = (j.response || [])[0];
  if (!p) throw new Error('provider returned no player for ' + apiId + ' ' + year);
  /*  ONE LEAGUE, AS resolveSeasonStat DOES. A card can never mix competitions, so the blocks that
      matter are this league's, and a 0-minute phantom is dropped exactly as the importer drops it. */
  const same = (p.statistics || []).filter(x => x.league?.id === LEAGUE_ID && num(x.games?.minutes) > 0);
  return { player: p.player, same };
}

(async () => {
  fs.mkdirSync(path.join(DIR, 'before'), { recursive: true });
  const row = await base();
  const { player, same } = await blocks(row.api_player_id, row.season_year);

  console.log('CANARY , card ' + CARD_ID + '   ' + player.name + '   ' + row.season + ' ' + row.league_code);
  console.log('  stored today : ' + row.team_name + '   ' + row.minutes + 'm  ' + row.appearances + 'a  ' +
              row.goals + 'g  ' + row.assists + 'a');
  console.log('  provider blocks in this league:');
  same.forEach(s => console.log('     ' + s.team.name + '  ' + s.games.minutes + 'm  ' + s.games.appearences + 'a  ' +
                                s.goals.total + 'g  ' + s.goals.assists + 'a'));

  if (same.length !== 2) throw new Error('expected two blocks, got ' + same.length + ' , do not proceed');
  const sum = same.reduce((a, s) => a + num(s.games.minutes), 0);
  /*  THE FUSED TEST, WRITTEN AS ITS OWN CHECK RATHER THAN AS G3 WITH A FLIPPED BOOLEAN: a fused
      card's stored minutes EQUAL the block sum. If they do not, this card is not what the
      candidates file says it is and nothing should be written.  */
  if (sum !== row.minutes) throw new Error('stored ' + row.minutes + 'm != block sum ' + sum + 'm , not a fusion, stop');
  console.log('  fused test   : stored ' + row.minutes + 'm equals the block sum ' + sum + 'm  OK');

  const named = same.slice().sort((a,b) => num(b.games.minutes) - num(a.games.minutes))[0];
  const other = same.find(s => s !== named);
  if (named.team.name !== row.team_name)
    throw new Error('card names ' + row.team_name + ' but the largest block is ' + named.team.name + ' , relabel case, stop');
  console.log('  names largest: ' + row.team_name + '  OK');

  const { data: t, error: te } = await sb.from('teams').select('id,name').eq('name', other.team.name);
  if (te) throw new Error(te.message);
  if (!t || t.length !== 1) throw new Error('teams lookup for "' + other.team.name + '" returned ' + (t||[]).length + ' , stop');
  const otherTeamId = t[0].id;

  /*  BOTH HALVES TAKE THE SAME NUMBER AND THE SAME AMBIGUITY, because it is the same season-wide
      modal number and neither club can now claim it.  */
  const shirt = { number: row.shirt_number,
                  source: row.shirt_number_source === 'modal_single' ? 'modal_split' : row.shirt_number_source };
  const reduced = cardFromBlock(named, row, row.team_id, row.team_name, shirt);
  const inserted = cardFromBlock(other, row, otherTeamId, other.team.name, shirt);

  console.log('\n  REDUCE card ' + CARD_ID + ' to ' + reduced.team_name + ': ' +
              row.minutes + 'm -> ' + reduced.minutes + 'm,  ' + row.goals + 'g -> ' + reduced.goals + 'g,  ' +
              row.assists + 'a -> ' + reduced.assists + 'a');
  console.log('  INSERT a new card for ' + inserted.team_name + ' (team_id ' + otherTeamId + '): ' +
              inserted.minutes + 'm  ' + inserted.appearances + 'a  ' + inserted.goals + 'g  ' + inserted.assists + 'a');
  console.log('  shirt        : ' + row.shirt_number + ' , source ' + row.shirt_number_source +
              ' becomes ' + shirt.source + ' on BOTH halves (it is the season-wide modal number)');
  console.log('  the 300-minute floor: ' + reduced.minutes + 'm and ' + inserted.minutes +
              'm , both under 300, so BOTH halves are unscored after this. The card reads rt 53 today.');

  if (arg('--dry')){ console.log('\n  --dry: NOTHING WRITTEN.'); return; }

  if (arg('--write')){
    /*  CAPTURE BEFORE WRITE, AND READ IT BACK OFF DISK. Write-once: a capture that a second run
        can overwrite is not a capture, which cost a recovery on 2026-09-24.  */
    const cap = path.join(DIR, 'before', 'card_' + CARD_ID + '.json');
    if (fs.existsSync(cap)) console.log('  capture already exists and was NOT touched');
    else { fs.writeFileSync(cap, JSON.stringify(row, null, 1));
           const back = JSON.parse(fs.readFileSync(cap, 'utf8'));
           if (back.id !== row.id) throw new Error('capture read-back mismatch');
           console.log('  before-capture written and verified off disk: ' + Object.keys(back).length + ' columns'); }

    const up = await sb.from('player_season_cards').update(reduced).eq('id', CARD_ID);
    if (up.error) throw new Error('update: ' + up.error.message);
    const ins = await sb.from('player_season_cards').insert(inserted).select('id');
    if (ins.error) throw new Error('insert: ' + ins.error.message);
    const newId = ins.data[0].id;
    fs.writeFileSync(path.join(DIR, 'canary_written.json'), JSON.stringify({ reduced_card_id: CARD_ID, inserted_card_id: newId }, null, 1));
    console.log('\n  WRITTEN.');
    console.log('    reduced card_id : ' + CARD_ID + '   (' + reduced.team_name + ')');
    console.log('    inserted card_id: ' + newId + '   (' + inserted.team_name + ')');
    console.log('\n  THE MATVIEW HAS NOT BEEN REFRESHED , the site still serves the old row until Lucas runs it.');
    return;
  }

  if (arg('--restore')){
    const cap = JSON.parse(fs.readFileSync(path.join(DIR, 'before', 'card_' + CARD_ID + '.json'), 'utf8'));
    const wrote = JSON.parse(fs.readFileSync(path.join(DIR, 'canary_written.json'), 'utf8'));
    const del = await sb.from('player_season_cards').delete().eq('id', wrote.inserted_card_id);
    if (del.error) throw new Error('delete: ' + del.error.message);
    const put = await sb.from('player_season_cards').update(cap).eq('id', CARD_ID);
    if (put.error) throw new Error('restore: ' + put.error.message);
    const now = await base();
    /*  COLUMN BY COLUMN, NOT A ROW COUNT. A restore that writes the right NUMBER of rows with one
        wrong value passes a count and fails the thing the capture exists for.  */
    const diff = Object.keys(cap).filter(k => String(cap[k]) !== String(now[k]));
    const gone = await sb.from('player_season_cards').select('id').eq('id', wrote.inserted_card_id);
    console.log('RESTORE');
    console.log('  inserted row ' + wrote.inserted_card_id + ' now returns ' + (gone.data || []).length + ' rows (want 0)');
    console.log('  columns compared: ' + Object.keys(cap).length + '   differing: ' + diff.length +
                (diff.length ? '  -> ' + diff.map(k => k + ' cap=' + cap[k] + ' now=' + now[k]).join(', ') : '  , identical'));
    return;
  }
  console.log('\npick a phase: --dry | --write | --restore');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
