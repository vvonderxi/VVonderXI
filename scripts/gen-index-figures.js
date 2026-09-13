#!/usr/bin/env node
/*  ── THE VV INDEX'S PUBLISHED FIGURES, GENERATED WITH THEIR DEFINITIONS ──────────────────
    Written 2026-09-13 (punchlist item 24). The VV Index rebuild publishes counts like
    "18,355 seasons with no detailed record at all", and THE QUERY BEHIND THAT NUMBER WAS
    RECORDED NOWHERE. It could not be reproduced: the obvious reading, cards with no
    shots_total, returns 21,447. Two different numbers, both defensible, and nothing on disk
    said which one the page meant.

    A FIGURE WITHOUT ITS DEFINITION IS NOT A MEASUREMENT, IT IS A CLAIM. It cannot be
    re-derived, so it cannot be checked, and it cannot be refreshed when the data moves , it
    can only be retyped from a number somebody remembers. That is the defect this closes, and
    the PDF (item 22) is downstream of it rather than the reason for it.

    THIS IS THE THIRD EMBEDDED SNAPSHOT ON THE PLATFORM and it inherits their standing hazard:
    RADAR_POOL_REF and KEEPER_SAVE_LADDER both go stale silently, and so does this. When a
    population-moving write lands, regenerate ALL THREE in that pass. None of them complains.

    WHAT BELONGS HERE AND WHAT DOES NOT , the split matters, because most of the page's
    numbers are NOT live and regenerating them would be wrong:
      , LIVE, and generated here: counts over the current matview. They move on every write.
      , EVENTS, and deliberately absent: "780 seasons recovered", "1 card crossed a band",
        "10,770 seasons moved", "Azpilicueta 70 to 72". These are records of things that
        HAPPENED. They are history and they do not move; re-deriving them against today's
        data would silently rewrite the past.
      , CONSTANTS, and deliberately absent: the 300-minute floor, penalties from 2015, the
        four source-absent players, the anchor-pinned band populations (12 / 150 / 650 / 138).
        CLAUDE.md records those as structural, guaranteed by construction, and warns against
        "correcting" them as stale.

    USAGE   node scripts/gen-index-figures.js            , prints a table
            node scripts/gen-index-figures.js --write    , writes scripts/figures/index-figures.json
*/
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const MV = 'player_card_mv';

/*  THE FILTERS MUST FOLLOW .select(), NOT PRECEDE IT. A PostgREST builder only exposes
    .eq/.is/.not after a select has been started, and calling them first throws
    "sb.from(...).not is not a function" , which reads like a version problem and is not.  */
const head = (build) => {
  const q = build(sb.from(MV).select('*', { count: 'exact', head: true }));
  return q.then(r => { if (r.error) throw new Error(r.error.message); return r.count; });
};

/*  THE DETAIL FIELDS ARE NAMED HERE, ONCE, because "detailed record" is a judgement and the
    page states it as a fact. These four are what the coverage boundary is ABOUT , the
    Playbook's own claim 2 says "from 2015/16, shots, passes, duels and dribbles as well".
    A card counts as having no detailed record when ALL FOUR are absent. A card missing only
    some of them is partial, not absent, and is counted separately so the difference is
    visible rather than buried in a definition nobody can see.  */
const DETAIL = ['shots_total', 'passes_total', 'duels_total', 'dribbles_attempts'];

async function main() {
  const figures = [];
  const add = (key, value, claim, definition, query) =>
    figures.push({ key, value, claim, definition, query });

  const total = await head(q => q);
  add('cards_total', total, 'every player season we hold',
      'every row on player_card_mv',
      `select count(*) from ${MV}`);

  const scored = await head(q => q.not('rt', 'is', null));
  add('cards_scored', scored, 'seasons carrying a VV Score',
      'rt is not null. 3,061 cards have no score and must never be counted as zero',
      `select count(*) from ${MV} where rt is not null`);

  const noDetail = await head(q => DETAIL.reduce((acc, f) => acc.is(f, null), q));
  add('cards_no_detail', noDetail, 'seasons with no detailed record at all',
      `all four of ${DETAIL.join(', ')} are null. A card missing SOME of them is partial, not absent`,
      `select count(*) from ${MV} where ${DETAIL.map(f => f + ' is null').join(' and ')}`);

  add('cards_no_detail_share', +(100 * noDetail / total).toFixed(1),
      'share of the record with no detailed stats, per cent',
      'cards_no_detail / cards_total', 'derived');

  const noShots = await head(q => q.is('shots_total', null));
  add('cards_no_shots', noShots, 'seasons with no shot data',
      'shots_total is null. KEPT ON PURPOSE as the near-miss: this is the number a reader ' +
      'would get from the obvious query, and it is NOT the headline figure. 2026-09-13 could ' +
      'not tell which of the two the page meant, which is why this file exists',
      `select count(*) from ${MV} where shots_total is null`);

  /*  BAND EDGES , the anchors are 95 / 90 / 85 / 80 (CLAUDE.md, locked). "Within a point"
      means rt sits on the edge or one below it, which is the population a growing record can
      move across a public line.  */
  const EDGES = [95, 90, 85, 80];
  let edge = 0;
  for (const b of EDGES) edge += await head(q => q.gte('rt', b - 1).lte('rt', b));
  add('cards_on_a_band_edge', edge, 'seasons within a single point of a band edge',
      `rt in [b-1, b] for each public band edge ${EDGES.join(', ')}`,
      `select count(*) from ${MV} where ` + EDGES.map(b => `(rt between ${b - 1} and ${b})`).join(' or '));

  add('cards_on_a_band_edge_share', +(100 * edge / scored).toFixed(2),
      'share of SCORED seasons within a point of a band edge, per cent',
      'cards_on_a_band_edge / cards_scored. The denominator is SCORED, not total , an unscored ' +
      'card cannot sit near a band edge and counting it dilutes the figure',
      'derived');

  const stamp = new Date().toISOString().slice(0, 10);
  const out = {
    generated: stamp,
    source: MV,
    note: 'LIVE figures only. Event figures and structural constants are deliberately absent , see the header of scripts/gen-index-figures.js.',
    figures
  };

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\nVV INDEX FIGURES , generated ${stamp} from ${MV}\n`);
  for (const f of figures)
    console.log(`  ${pad(f.key, 30)} ${pad(f.value.toLocaleString('en-GB'), 10)} ${f.claim}`);

  if (process.argv.includes('--write')) {
    const p = path.join(__dirname, 'figures', 'index-figures.json');
    fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n');
    const back = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (back.figures.length !== figures.length) throw new Error('read-back mismatch');
    console.log(`\n  wrote ${path.relative(process.cwd(), p)} , ${back.figures.length} figures, read back and asserted`);
  } else {
    console.log('\n  (dry run , pass --write to save scripts/figures/index-figures.json)');
  }
}

main().catch(e => { console.error('FAILED,', e.message); process.exit(1); });
