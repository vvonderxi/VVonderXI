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

  /*  THE COMPLEMENT, AND IT EXISTS BECAUSE OF HOW THE PAGE READS RATHER THAN WHAT IT KNOWS.
      The coverage section used to open on cards_no_detail, which leads a section on an
      absence. Same fact, counted the other way up: this is what the record DOES hold, and
      the absence follows it in the same sentence. Derived rather than queried so the two
      can never disagree.  */
  add('cards_with_detail', total - noDetail, 'seasons that carry the full detailed record',
      'cards_total minus cards_no_detail, so the pair always sums to the whole record',
      'derived');

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

  /*  ── THE OPENER , THE MOST PROMINENT NUMBER ON THE SITE, SO IT IS THE LEAST ALLOWED
      TO BE TYPED. The page leads on "thirteen of fourteen Ballon d'Or seasons land in the
      Index's top three bands". Both halves are generated here.

      IT IS A READ-OUT AND NEVER A DIAL. CLAUDE.md's anchor guardrail says famous names
      validate the scale and must never tune it. A headline built on agreement is exactly
      where that slips, so: this figure is REPORTED, and nothing in the engine may ever be
      changed to move it. If a recalibration drops it, the honest act is to publish the
      lower number, not to re-tune until it comes back.

      THE MATCH IS PLAYER-AND-SEASON, NOT PLAYER-SEASON-LEAGUE. A Ballon d'Or is a global
      award and its league_code is whichever league we recorded it against, so binding on
      league would silently drop a winner who moved. Where a player holds two cards in one
      season (a cross-league move) the HIGHEST scored card is taken, because the award is
      for the player's year rather than for one of its halves.  */
  /*  EVERY HONOUR IN THE RECORD, AND NOT ONE OF THEM MOVES A SCORE. The page leads its
      refusal section on this rather than on "zero", because a count is a thing the platform
      HAS and a zero is a thing it lacks , the fact is identical either way.
      IT IS THE WHOLE TABLE ON PURPOSE, team and individual together, because the claim is
      about honours as a category. Verified against a fresh view definition: rt_new is fully
      computed before the honours CTEs are joined, so no honour of any kind can reach a score.  */
  const honours = await sb.from('honours').select('id', { count: 'exact', head: true })
    .then(r => { if (r.error) throw new Error(r.error.message); return r.count; });
  add('honours_total', honours, 'honours the record holds, none of which moves a score',
      'every row of the honours table, team and individual. The score is computed before ' +
      'honours are joined to it, so the count is independent of the engine by construction',
      'select count(*) from honours');

  /*  ONE PAGINATED READ OF THE MATVIEW, SHARED BY BOTH BLOCKS BELOW. PostgREST caps a
      select at 1000 rows SILENTLY, which SS C records as the defect that returns a plausible
      number rather than an error. player_name rides along because the spread illustration
      needs one named career.  */
  const pageAll = async (t, sel) => {
    let a = [], i = 0;
    for (;;) {
      const r = await sb.from(t).select(sel).range(i, i + 999);
      if (r.error) throw new Error(r.error.message);
      a = a.concat(r.data);
      if (r.data.length < 1000) break;
      i += 1000;
    }
    return a;
  };
  const allCards = await pageAll(MV, 'card_id,api_player_id,player_name,season_year,rt');

  /*  ── IT RATES A SEASON, NOT A PLAYER. The claim the page turns on, and the one thing a
      FIFA rating or a pundit's number cannot say about itself: those rate a PERSON, and a
      person does not have one number.
      FIVE SEASONS IS THE GATE and it is not arbitrary , a spread computed over two or three
      seasons is mostly noise about which two, and the claim is about careers. 4,387 players
      clear it.  */
  const SPREAD_MIN_SEASONS = 5;
  const careers = {};
  for (const c of allCards) {
    if (c.rt == null) continue;
    (careers[c.api_player_id] = careers[c.api_player_id] || []).push(c.rt);
  }
  const spreads = Object.values(careers)
    .filter(a => a.length >= SPREAD_MIN_SEASONS)
    .map(a => Math.max(...a) - Math.min(...a))
    .sort((x, y) => x - y);

  add('career_spread_players', spreads.length,
      `players with ${SPREAD_MIN_SEASONS} or more scored seasons`,
      `count of api_player_id having >= ${SPREAD_MIN_SEASONS} cards with a non-null rt`,
      `select count(*) from (select api_player_id from ${MV} where rt is not null ` +
      `group by 1 having count(*) >= ${SPREAD_MIN_SEASONS}) t`);

  add('career_spread_median', spreads[Math.floor(spreads.length / 2)],
      'median gap between a player\'s best scored season and his worst',
      'median of max(rt) - min(rt) per player, over players clearing the five-season gate. ' +
      'MEDIAN and not mean, because a handful of enormous spreads would carry a mean and the ' +
      'claim is about the typical career',
      `select percentile_cont(0.5) within group (order by s) from (select max(rt)-min(rt) s ` +
      `from ${MV} where rt is not null group by api_player_id having count(*) >= ${SPREAD_MIN_SEASONS}) t`);

  /*  THE ILLUSTRATION IS GENERATED TOO, AND THAT IS THE WHOLE REASON THIS BLOCK EXISTS.
      A drawing of one career with its numbers typed into the markup is an embedded snapshot,
      and SS C records that all of those go stale in silence. A recalibration would move these
      twelve values and the strip would go on drawing the old ones, confidently.
      Emitted as a series so apply-figures can rewrite and check it exactly like a span.  */
  const HAZARD = 'E. Hazard';
  const hz = allCards.filter(c => c.player_name === HAZARD && c.rt != null)
                     .sort((a, b) => a.season_year - b.season_year);
  if (hz.length < 10) throw new Error(`the spread illustration needs ${HAZARD}'s career and found ${hz.length} scored seasons`);
  add('career_spread_hazard', hz.map(c => c.rt).join(','),
      'the illustrated career, oldest season first',
      `every scored card for ${HAZARD}, ordered by season_year. The drawing marks his best, ` +
      'his worst and the mid-career dip; the other nine stay legible so the SHAPE is visible',
      `select rt from ${MV} where player_name = '${HAZARD}' and rt is not null order by season_year`);
  add('career_spread_hazard_years', hz.map(c => String(c.season_year).slice(2) + '/' + String(c.season_year + 1).slice(2)).join(','),
      'the illustrated career, season labels', 'derived from the same rows, same order', 'derived');

  /*  ── IT TELLS YOU HOW SURE IT IS. Read from the SHIPPED margin table, `vv-margin.js`,
      rather than re-derived, because that file is what the live Compare gate actually reads:
      a figure generated from a second implementation would describe a platform nobody uses.

      WHAT MAKES IT CONCRETE, WHICH IS THE WHOLE REQUIREMENT. "A standard error of 5.58
      points" is unusable to a reader. What it LETS THEM DO is know when a crown means
      something, and the platform already acts on it , Compare refuses to name a winner when
      the gap between two seasons is inside their own pooled margin. This counts how often
      that happens at the top of the ladder, which is the answer to "so what".

      EVERY PAIR, NOT A SAMPLE. 1,414 cards at rt 80+ is 999,291 pairings, which is a
      second of arithmetic, and a sampled figure on a page about precision would be a poor
      joke. Cards the table does not know are EXCLUDED rather than counted either way: the
      gate fails closed on them, so counting them as "inside" would flatter the figure.  */
  const margin = require(path.join(__dirname, '..', 'vv-margin.js'));
  const Z_BAR = margin.Z;   // 1.96, read from the shipped table so the page cannot disagree with the gate
  const elite = allCards.filter(c => c.rt != null && c.rt >= 80 && margin.seFor(c.card_id) != null);
  let inside = 0, pairs = 0;
  for (let i = 0; i < elite.length; i++) {
    for (let j = i + 1; j < elite.length; j++) {
      const m = margin.marginFor(elite[i].card_id, elite[j].card_id);
      if (m == null) continue;
      pairs++;
      if (Math.abs(elite[i].rt - elite[j].rt) < m) inside++;
    }
  }
  if (pairs < 100000) throw new Error(`margin coverage collapsed: only ${pairs} pairings at rt 80+ , the table may be stale`);
  add('elite_pairs_inside_margin', +(100 * inside / pairs).toFixed(1),
      'share of pairings between seasons at 80+ that the Index cannot separate, per cent',
      'every unordered pair of scored cards at rt >= 80 present in vv-margin.js. A pair is ' +
      'INSIDE when |rt difference| < 1.96 * sqrt(se_a^2 + se_b^2), which is the same test the ' +
      'live Compare gate applies. Cards absent from the table are excluded, not counted',
      'derived from vv-margin.js, the table the live gate reads');

  /*  AND THE PART A READER CAN USE. "A standard error of 5.8 points" is unusable; "two
      Generational seasons have to be three points apart before the Index will separate them"
      is a fact somebody can carry to a card. The error is NOT constant , it runs about
      sixfold down the ladder , so a single number would be wrong everywhere except at the
      median. Per band: 1.96 * sqrt(2) * median SE, the gap two seasons of that standing need.  */
  const BAND_EDGES = [['Generational',95,200],['Iconic',90,95],['World Class',85,90],['Standout',80,85]];
  const sep = BAND_EDGES.map(([name,lo,hi]) => {
    const ses = allCards.filter(c => c.rt != null && c.rt >= lo && c.rt < hi)
                        .map(c => margin.seFor(c.card_id)).filter(v => v != null)
                        .sort((a,b) => a-b);
    if (!ses.length) throw new Error(`no standard errors for the ${name} band , the table is stale or the bands moved`);
    const med = ses[Math.floor(ses.length/2)];
    return (Z_BAR * Math.sqrt(2) * med).toFixed(1);
  });
  add('margin_separation_points', sep.join(','),
      'points two seasons of the same standing must differ by before the Index separates them',
      'per public band, 1.96 * sqrt(2) * the median standard error in that band, read from ' +
      'vv-margin.js. Order: Generational, Iconic, World Class, Standout',
      'derived from vv-margin.js');

  add('elite_pairs_counted', pairs, 'pairings the figure above is computed over',
      'unordered pairs of rt >= 80 cards carrying a standard error', 'derived');

  const BANDS = { top3: 85, iconic: 90, gen: 95 };
  const bd = (await pageAll('honours', 'honour_type,season_year,api_player_id,player_name'))
    .filter(r => r.honour_type === 'ballon_dor' && r.api_player_id != null);
  const byPlayerSeason = {};
  for (const c of allCards) {
    if (c.rt == null) continue;
    const k = c.api_player_id + '|' + c.season_year;
    if (!byPlayerSeason[k] || c.rt > byPlayerSeason[k]) byPlayerSeason[k] = c.rt;
  }
  const bdScores = bd.map(r => byPlayerSeason[r.api_player_id + '|' + r.season_year])
                     .filter(v => v != null);

  /*  A COUNT THAT CANNOT FAIL TELLS YOU NOTHING. Every award row must resolve to a scored
      card, or the headline is quietly measuring a subset. This throws rather than reporting
      a smaller, wrong-looking-but-plausible number.  */
  if (bdScores.length !== bd.length)
    throw new Error(`ballon d'or: ${bd.length} award rows but ${bdScores.length} scored cards , ` +
                    'the headline would be measuring a subset. Resolve the missing card first.');

  add('ballon_dor_seasons', bd.length, 'Ballon d\'Or seasons the record holds',
      'honours rows with honour_type = ballon_dor and a non-null api_player_id, each resolving ' +
      'to a scored card. season_year is the SEASON the award was for, so it runs one behind the ' +
      'award year; 2019/20 is correctly absent because that award was cancelled',
      "select count(*) from honours where honour_type='ballon_dor' and api_player_id is not null");

  add('ballon_dor_top_three_bands', bdScores.filter(v => v >= BANDS.top3).length,
      'of those, the number scoring 85 or better , World Class, Iconic or Generational',
      `rt >= ${BANDS.top3} on the highest scored card for that player-season. THE MISS IS PART ` +
      'OF THE CLAIM and is published beside it, not hidden',
      `-- join honours to ${MV} on (api_player_id, season_year), take max(rt), count rt >= ${BANDS.top3}`);

  add('ballon_dor_iconic_or_better', bdScores.filter(v => v >= BANDS.iconic).length,
      'of those, the number scoring 90 or better',
      `rt >= ${BANDS.iconic}, same join`, `-- as above, rt >= ${BANDS.iconic}`);

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
