/*  HALVED CARDS , DRY RUN. READ-ONLY. IT WRITES NOTHING TO SUPABASE, EVER.
    ========================================================================
    Runs the six gates from `docs/HALVED_CARDS_SCOPE.md` section 5 across every candidate and
    reports how many survive each one. **The point is the ATTRITION, not the total** , the
    scope sampled a third of candidates as false splits, and a dry run that agrees with that
    sample is the evidence the real run is allowed to start.

      python3 scripts/halved-candidates.py --json /tmp/keys.json
      node scripts/halved-dryrun.js --keys /tmp/keys.json          # ~1,740 provider calls
      node scripts/halved-dryrun.js --keys /tmp/keys.json --limit 40   # a slice, smoke test

    THE GATES, IN ORDER, EACH COUNTED SEPARATELY SO A DROP IS ATTRIBUTABLE:
      G0  the provider answers at all for that player-season
      G1  at least one block carries our league id
      G2  two or more DISTINCT teams after deduping on `team.id`   , the provider repeats blocks
      G3  the stored card equals exactly ONE block's minutes       , equal to the SUM means the
                                                                     card is already fused (SS E)
      G4  every missing block has at least one appearance          , a zero-minute spell is a
                                                                     transfer, not a season

    WHY DEDUPE ON `team.id` AND NOT ON THE NAME: the first pass of this measurement summed
    duplicate blocks and produced 1,594 to 3,188 minutes , entirely plausible figures for a
    season, which is exactly why it went unnoticed. A club renamed mid-export (Bastia) keeps its
    id; two clubs never share one.

    OUTPUT: `scripts/figures/halved-dryrun.json` (the counts, and the query behind them) plus
    `scripts/figures/halved-dryrun.jsonl`, one line per candidate carrying its verdict and the
    blocks it was judged on , so any figure here is reproducible per row rather than by re-running.
*/
require('dotenv').config({ path: '.env', quiet: true });
const fs = require('fs'), path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.APIFOOTBALL_KEY, BASE = 'https://v3.football.api-sports.io';
if (!KEY) { console.error('APIFOOTBALL_KEY missing'); process.exit(1); }

const LEAGUE_ID = { PL:39, LL:140, SA:135, BL:78, L1:61, PRT:94, ERE:88, BPL:144, TR:203 };
const OUT = path.join(__dirname, 'figures');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i+1]; };

/*  THE CANDIDATE KEYS ARE DERIVED IN ONE PLACE, NOT TWO. `scripts/halved-candidates.py --json`
    owns the derivation; this reads what it wrote. A second implementation here would be a
    second answer to "how many candidates are there", and this file already records what two
    implementations of one rule cost.  */
function candidateKeys() {
  const f = arg('--keys');
  if (!f || !fs.existsSync(f)) {
    console.error('need --keys <path>, produced by:\n'
      + '  python3 scripts/halved-candidates.py --json <path>');
    process.exit(1);
  }
  const keys = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(keys) || !keys.length || !keys[0].code || !LEAGUE_ID[keys[0].code]) {
    console.error('key file is not the expected shape'); process.exit(1);
  }
  return keys;
}

/*  THE PROVIDER'S CLUB ID CANNOT REACH OURS: `teams.api_team_id` is NULL on all 337 rows
    (measured 2026-09-21), so the only link between a provider block and a `teams` row is the
    NAME , and SS C records name matching as exactly what split seven Premier League clubs into
    two team rows in 25/26. A write whose club does not resolve would create a duplicate club,
    and that is the shape Guard A catches as a null `def_share`. Measured here as a PRECONDITION
    beside the gates, never folded into them: adding a sixth gate after the count was agreed
    would change the number this run exists to produce.  */
async function teamNames() {
  const byName = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('teams').select('id,name').range(from, from + 999).order('id');
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    for (const t of data) byName.set(t.name, t.id);
    if (data.length < 1000) break;
  }
  return byName;
}

async function allCards() {
  const byKey = new Map();
  for (let from = 0; ; from += 1000) {
    /*  READ THE WRITE TARGET, NOT THE MATVIEW. `player_card_mv` does not expose `team_id` at all
        (87 columns, none of them it), and team_id is what a split is keyed on , so a dry run over
        the matview could not check that the stored card's CLUB agrees with the block its minutes
        match. `player_season_cards` carries both, and is the table the sitting inserts into.  */
    const { data, error } = await sb.from('player_season_cards')
      .select('id,player_id,api_player_id,season,season_year,league_code,team_id,league_id,team_name,appearances,minutes,goals,rt')
      .range(from, from + 999).order('id');
    if (error) throw new Error(error.message);
    if (!data || !data.length) break;
    for (const c of data) byKey.set(`${c.api_player_id}|${c.season_year}|${c.league_code}`, c);
    if (data.length < 1000) break;
  }
  return byKey;
}

(async () => {
  const t0 = Date.now();
  const keys = candidateKeys();
  const cards = await allCards();
  const teams = await teamNames();
  console.log(`candidate keys ${keys.length} | cards in player_season_cards ${cards.size}`);

  let cand = keys.map(k => ({ ...k, card: cards.get(`${k.api_player_id}|${k.season}|${k.code}`) }))
                 .filter(c => c.card);
  console.log(`candidates WITH a card: ${cand.length}`);
  const lim = +arg('--limit') || 0; if (lim) cand = cand.slice(0, lim);

  const G = { G0:0, G1:0, G2:0, G2b:0, G3:0, G4:0 };
  const reasons = {}, writes = [], lines = [];
  const bump = r => reasons[r] = (reasons[r] || 0) + 1;

  for (let i = 0; i < cand.length; i++) {
    const c = cand[i];
    let j = null;
    for (let attempt = 0; attempt < 3 && !j; attempt++) {
      try {
        const res = await fetch(`${BASE}/players?id=${c.api_player_id}&season=${c.season}`,
                                { headers: { 'x-apisports-key': KEY } });
        j = await res.json();
      } catch (e) { await sleep(1500); }
    }
    await sleep(320);
    const rec = { key:`${c.api_player_id}|${c.season}|${c.code}`, name:c.name, card_id:c.card.id,
                  card_min:c.card.minutes, card_team:c.card.team_name };

    const st = j && j.response && j.response[0] && j.response[0].statistics;
    if (!st) { rec.verdict = 'G0_no_provider_answer'; bump(rec.verdict); lines.push(rec); continue; }
    G.G0++;

    const lid = LEAGUE_ID[c.code];
    const byTeam = new Map();                       // DEDUPE ON team.id, never on the name
    for (const b of st) {
      if (b.league && b.league.id === lid && b.team && b.team.id != null && !byTeam.has(b.team.id))
        byTeam.set(b.team.id, { team_id:b.team.id, team:b.team.name,
                                apps:b.games && b.games.appearences || 0,
                                min:b.games && b.games.minutes || 0,
                                goals:b.goals && b.goals.total || 0 });
    }
    const blocks = [...byTeam.values()];
    rec.blocks = blocks;
    if (!blocks.length) { rec.verdict = 'G1_no_block_for_league'; bump(rec.verdict); lines.push(rec); continue; }
    G.G1++;

    if (blocks.length < 2) { rec.verdict = 'G2_single_team_not_a_split'; bump(rec.verdict); lines.push(rec); continue; }
    G.G2++;


    /*  THE ZERO-MINUTE BLOCK IS TESTED FIRST, AND THE ORDER IS THE WHOLE POINT. A block with no
        minutes makes `sum` equal the other block by arithmetic, so a fused-test placed above this
        one labels "he never played for the second club" as "already fused". It did, on 164 of 350
        , the bucket read as a population five times its real size, and the wrong number was the
        plausible one. A gate that can be satisfied by arithmetic rather than by meaning has to be
        ordered after the gate that removes the arithmetic.  */
    const playing = blocks.filter(b => b.min > 0 || b.apps > 0);
    if (playing.length < 2) { rec.verdict = 'G2b_never_played_for_the_other_club'; bump(rec.verdict); lines.push(rec); continue; }

    G.G2b++;
    const sum = blocks.reduce((a, b) => a + b.min, 0);
    const match = blocks.filter(b => b.min === c.card.minutes);
    if (c.card.minutes === sum && blocks.length > 1) { rec.verdict = 'G3_already_fused'; bump(rec.verdict); lines.push(rec); continue; }
    if (match.length !== 1) { rec.verdict = match.length ? 'G3_ambiguous_match' : 'G3_card_matches_no_block'; bump(rec.verdict); lines.push(rec); continue; }
    G.G3++;

    /*  NOT A GATE, A REPORTED FACT. If the block whose minutes match is not the club the card
        names, the card is odd in some other way and the split would inherit it. Counted and
        named rather than folded into the pass rate, because adding a sixth gate after the fact
        would change the number this run exists to produce.  */
    rec.team_agrees = match[0].team === c.card.team_name;
    if (!rec.team_agrees) bump('note_matched_block_club_differs_from_card');

    const missing = blocks.filter(b => b.team_id !== match[0].team_id);
    if (missing.some(b => b.apps < 1)) { rec.verdict = 'G4_zero_appearance_block'; bump(rec.verdict); lines.push(rec); continue; }
    G.G4++;

    rec.missing_club_resolves = missing.map(b => teams.has(b.team) ? teams.get(b.team) : null);
    if (rec.missing_club_resolves.some(x => x === null)) bump('note_missing_club_has_no_teams_row');

    rec.verdict = 'WRITE'; rec.have = match[0]; rec.missing = missing;
    bump('WRITE'); writes.push(rec); lines.push(rec);

    if ((i + 1) % 100 === 0) {
      console.log(`  ${i+1}/${cand.length}  write=${writes.length}  ${((Date.now()-t0)/1000|0)}s`);
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, 'halved-dryrun.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
    }
  }

  const rowsToWrite = writes.reduce((a, w) => a + w.missing.length, 0);
  const byLeague = {}, bySeason = {};
  for (const w of writes) { const [, s, l] = w.key.split('|');
    byLeague[l] = (byLeague[l] || 0) + 1; bySeason[s] = (bySeason[s] || 0) + 1; }

  const summary = {
    generated: new Date().toISOString(),
    source: 'exports/bam/player/2026-09-17T18-16-35/transfers.csv, deduped, Dec/Jan/Feb, both clubs in our nine leagues',
    candidates_with_card: cand.length,
    gates: G, reasons,
    cards_to_split: writes.length, rows_to_insert: rowsToWrite,
    precondition_missing_club_resolves_to_a_teams_row: {
      rows_resolving: writes.reduce((a,w)=>a + w.missing_club_resolves.filter(x=>x!==null).length, 0),
      rows_unresolved: writes.reduce((a,w)=>a + w.missing_club_resolves.filter(x=>x===null).length, 0),
      unresolved_names: [...new Set(writes.flatMap(w =>
        w.missing.filter((_,i)=>w.missing_club_resolves[i]===null).map(b=>b.team)))].sort()
    },
    by_league: byLeague, by_season: bySeason,
    note: 'READ-ONLY. Nothing was written to Supabase. Per-row detail in halved-dryrun.jsonl.'
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'halved-dryrun.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'halved-dryrun.jsonl'), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  console.log(JSON.stringify(summary, null, 2));
})();
