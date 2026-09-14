/*  ROLLBACK CAPTURE FOR THE SQUAD-NUMBER BACKFILL , READ ONLY.
    SS C: a target-only snapshot cannot see a ripple, so this captures rt for EVERY card in
    the database and not just the ~20,063 in scope. The 2026-08-13 incident is the precedent:
    a 351-row write moved 137 cards nobody had touched, one of them across a public band.
    IT ALSO COUNTS THE POPULATION RATHER THAN QUOTING IT , the total has been 57,234 and is
    57,055, and a hardcoded figure is how a partial snapshot passes for a complete one.  */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const DIR = path.join(__dirname, '..', '..', 'migrations', 'squad_numbers_2026-09-14');

async function pageAll(table, select, order, filter) {
  const out = []; let from = 0;
  for (;;) {
    let q = sb.from(table).select(select).order(order, { ascending: true }).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

(async () => {
  console.log('capturing, read only...');
  const cards = await pageAll('player_card_mv', 'card_id,api_player_id,season_year,league_code,rt,position_pool,shirt_number', 'card_id');
  const pp = await pageAll('player_positions', 'api_player_id,season_year,league_code,position,shirt_number', 'api_player_id');
  const stamp = new Date().toISOString();

  /*  rt is written as a flat map rather than rows , the diff after each batch compares this
      against a fresh read, and a map makes a missing card as visible as a changed one.  */
  const rtMap = {}; cards.forEach((c) => { rtMap[c.card_id] = c.rt; });
  const poolMap = {}; cards.forEach((c) => { poolMap[c.card_id] = c.position_pool; });

  const before = {
    captured: stamp,
    counts: {
      cards: cards.length,
      cardsScored: cards.filter((c) => c.rt != null).length,
      cardsWithNumber: cards.filter((c) => c.shirt_number != null).length,
      cardsPre2016NoNumber: cards.filter((c) => c.season_year < 2016 && c.shirt_number == null).length,
      positionRows: pp.length,
      positionRowsNullPosition: pp.filter((r) => r.position == null).length,
    },
    /*  THE KEY SET IS THE ROLLBACK. These are INSERTS, so undoing them is a delete of exactly
        the triples written , and knowing which triples EXISTED beforehand is what makes an
        accidental update detectable.  */
    existingPositionKeys: pp.map((r) => r.api_player_id + '|' + r.season_year + '|' + r.league_code),
  };
  fs.writeFileSync(path.join(DIR, 'before-summary.json'), JSON.stringify(before, null, 2) + '\n');
  fs.writeFileSync(path.join(DIR, 'before-rt.json'), JSON.stringify(rtMap) + '\n');
  fs.writeFileSync(path.join(DIR, 'before-pool.json'), JSON.stringify(poolMap) + '\n');

  /*  READ IT BACK OFF DISK AND ASSERT IT ROW FOR ROW , SS C. A capture that was never
      verified is a capture you find out about during the rollback.  */
  const backRt = JSON.parse(fs.readFileSync(path.join(DIR, 'before-rt.json'), 'utf8'));
  const backSum = JSON.parse(fs.readFileSync(path.join(DIR, 'before-summary.json'), 'utf8'));
  let mismatch = 0;
  for (const c of cards) if (backRt[c.card_id] !== c.rt) mismatch++;
  if (mismatch || Object.keys(backRt).length !== cards.length) {
    console.error('CAPTURE FAILED read-back: ' + mismatch + ' mismatches, ' + Object.keys(backRt).length + ' vs ' + cards.length);
    process.exit(1);
  }
  console.log('\n  cards                        ' + before.counts.cards);
  console.log('  scored                       ' + before.counts.cardsScored);
  console.log('  carrying a shirt number      ' + before.counts.cardsWithNumber);
  console.log('  pre-2016 with NO number      ' + before.counts.cardsPre2016NoNumber + '   <- the target');
  console.log('  player_positions rows        ' + before.counts.positionRows);
  console.log('  ... with a NULL position     ' + before.counts.positionRowsNullPosition + '   <- the untested shape');
  console.log('\n  read back and asserted row for row: ' + cards.length + ' rt values, 0 mismatches');
})().catch((e) => { console.error('FAILED,', e.message); process.exit(1); });
