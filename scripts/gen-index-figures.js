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

  /*  THE TWO LIMITS FIGURES, ADDED 2026-10-01 FOR THE VV INDEX REBUILD. A THIRD WAS DERIVED
      AND REFUSED , see CLAUDE.md: a position-verification figure came back at 97.7% against
      64.9% and measures GRANULARITY, not whether a person checked it, so the claim it was
      meant to support stays unnumbered. Do not re-derive it; the flag it needs is not
      collected.  */

  /*  NOT ONE CENTRE-BACK IN THE TOP BAND. The claim is that the game records what a defender
      DOES and not what he prevents, so the best defenders score below their reputation.
      ITS RECONCILIATION IS THE 650 ITSELF: the band edges are RANK anchors, so that count is
      a structural constant (SEC C, anchor-pinned populations). If it ever reads anything but
      650 the anchors have moved, and every sentence on the page built on 650 went stale in
      the same instant , so this throws rather than quietly publishing a new denominator.  */
  const eliteTotal = await head(q => q.gte('rt', 85));
  if (eliteTotal !== 650)
    throw new Error(`the 85+ band holds ${eliteTotal}, not the anchor-pinned 650 , the anchors have moved and every figure keyed to 650 is stale`);
  const eliteCB = await head(q => q.gte('rt', 85).eq('position_pool', 'CB'));
  const eliteNoPool = await head(q => q.gte('rt', 85).is('position_pool', null));
  /*  AND THE UNCLASSIFIED REMAINDER IS CHECKED RATHER THAN WAVED AT, because one defender
      hiding among them would falsify a published ZERO. Read individually on 2026-10-01: 14
      forwards and one midfielder. If any of them ever resolves to a DEF coarse position the
      zero is no longer sayable, so that throws too.  */
  const eliteNoPoolDef = await head(q => q.gte('rt', 85).is('position_pool', null).eq('position', 'DEF'));
  if (eliteNoPoolDef > 0)
    throw new Error(`${eliteNoPoolDef} of the ${eliteNoPool} unclassified top-band seasons are coarse DEF , the "zero centre-backs" claim can no longer be published without reading them`);
  /*  THE GENERATIONAL POPULATION , anchor-pinned like the 650 and checked the same way. SEC C
      records that the band edges are RANK anchors, so this is a STRUCTURAL CONSTANT: it does
      not drift as the record grows, and a future session must not "correct" it as stale. It is
      generated rather than typed precisely so that if it ever stops being 12 the page finds out
      in the same instant the anchors move.  */
  const generational = await head(q => q.gte('rt', 95));
  if (generational !== 12)
    throw new Error(`the Generational band holds ${generational}, not the anchor-pinned 12 , the anchors have moved and the rarity copy is stale`);
  add('generational_seasons', generational, 'seasons in the Generational band, ever',
      'rt >= 95. Anchor-pinned: the band edge is a rank, so the population is fixed by construction',
      `select count(*) from ${MV} where rt >= 95`);

  add('elite_centrebacks', eliteCB, 'centre-back seasons among the 650 at 85 or better',
      'position_pool = CB and rt >= 85. The 15 cards with no pool were read individually and ' +
      'are 14 FWD and 1 MID, which is what makes a published zero sayable rather than merely true of what we can see',
      `select count(*) from ${MV} where rt >= 85 and position_pool = 'CB'`);

  /*  KEEPERS ARE READ ON A DIFFERENT MEASURE, AND THE FIGURE IS THE PLAIN COUNT. A first
      version counted keepers with no rt and would have been FALSE: Fallback C removed the
      keeper score from the CARD FACE and the share caption, NOT from the column, so 3,734 of
      these carry an rt and the count would have published the minutes floor as "not scored".
      ITS RECONCILIATION IS THE POSITION VOCABULARY: keepers plus outfielders must be the
      whole record. SEC E records that the coarse column has already gained UNK and FOR, and
      a fifth value would silently shrink one side of this figure.  */
  const gk = await head(q => q.eq('position', 'GK'));
  const notGk = await head(q => q.neq('position', 'GK'));
  const noPos = await head(q => q.is('position', null));
  if (gk + notGk + noPos !== total)
    throw new Error(`GK ${gk} + non-GK ${notGk} + null ${noPos} = ${gk + notGk + noPos}, not the ${total} cards on the matview , the position vocabulary has changed under this figure`);
  add('keeper_seasons', gk, 'goalkeeper seasons read on a measure of their own',
      "position = 'GK'. The plain count, NOT a count of keepers without a score , Fallback C " +
      'removed the keeper score from the card face and not from the column, so a no-score count would be false',
      `select count(*) from ${MV} where position = 'GK'`);

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
  const allCards = await pageAll(MV, 'card_id,api_player_id,player_name,season_year,league_code,rt');

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

  /*  ── NINE LEAGUES, ONE LADDER. Answers the obvious suspicion about a cross-league index:
      that it is a Premier League index wearing nine badges.

      THE TOTAL IS NOT GENERATED AND MUST NOT BE. 650 at rt 85+ is ANCHOR-PINNED , the band
      edges are rank anchors, so that population is fixed by construction and SS C warns
      against "correcting" it as stale. What IS live, and what this generates, is WHICH
      seasons occupy those slots. The page states the 650 as the structural constant it is
      and generates the split.  */
  const ELITE_BAR = 85;
  const eliteRows = allCards.filter(c => c.rt != null && c.rt >= ELITE_BAR);
  /*  THE NAME COMES FROM vv-core's CANONICAL MAP, NOT FROM THE `leagues` TABLE, AND THAT
      IS NOT tidiness , the join MISSES. SS C records it: the leagues row for the Turkish
      league carries code 'TSL' while every card carries 'TR', so a lookup keyed on the
      card's league_code silently returns nothing and the page would have printed a bare
      "TR" beside eight real league names. Keying off vv-core means the page and the rest of
      the platform cannot disagree about what a league is called.  */
  global.window = global.window || global;
  require(path.join(__dirname, '..', 'vv-core.js'));
  const lgName = (code) => {
    const f = global.VVCore && global.VVCore.VVFilters;
    const n = f && f.leagueName ? f.leagueName(code) : null;
    if (!n || n === code) throw new Error(`no canonical name for league code "${code}" , vv-core's map is short`);
    return n;
  };
  const byLeague = {};
  eliteRows.forEach(c => { byLeague[c.league_code] = (byLeague[c.league_code] || 0) + 1; });
  const ordered = Object.entries(byLeague).sort((a, b) => b[1] - a[1]);

  /*  A RECONCILIATION THAT CAN FAIL. The per-league counts must sum to the band population,
      or the split is being taken over a different set from the one the page names.  */
  const lgSum = ordered.reduce((t, [, n]) => t + n, 0);
  if (lgSum !== eliteRows.length)
    throw new Error(`league split sums to ${lgSum} against ${eliteRows.length} cards at ${ELITE_BAR}+`);

  add('elite_league_names', ordered.map(([code]) => lgName(code)).join('|'),
      'leagues holding seasons at 85 or better, most first',
      'display names from vv-core\'s canonical map, NOT the leagues table , that table keys ' +
      'the Turkish league as TSL while cards carry TR. Pipe-separated, since a name may hold a comma',
      `select league_code, count(*) from ${MV} where rt >= ${ELITE_BAR} group by 1 order by 2 desc`);

  add('elite_league_counts', ordered.map(([, n]) => n).join(','),
      'their counts, in the same order', 'same query', 'as above');

  /*  THE FLOOR, NOT JUST THE SHARE , ADDED 2026-10-02 WHEN THE NINE-LEAGUE CHART WAS CUT.
      A bare "70 per cent outside the Premier League" is true even if eight leagues contribute
      one season each, so the share alone does not answer the suspicion it is quoted against.
      The MINIMUM does: no league below this number means the spread is real, in one clause,
      and it replaced a chart rather than summarising it.
      IT THROWS IF A LEAGUE EVER DROPS OUT ENTIRELY, because a missing league would make the
      minimum describe eight leagues while the sentence says nine.  */
  if (ordered.length !== 9)
    throw new Error(`the top band spans ${ordered.length} leagues, not 9 , the "no league has fewer than" sentence names nine`);
  add('elite_league_min', Math.min(...ordered.map(([, n]) => n)),
      'the smallest number of seasons at 85 or better any one league holds',
      'min of elite_league_counts. The floor is what makes the 70 per cent meaningful , a share ' +
      'can hide a long tail of ones and a floor cannot',
      'derived from the same query as elite_league_counts');

  const outsidePL = eliteRows.filter(c => c.league_code !== 'PL').length;
  add('elite_outside_pl_share', Math.round(100 * outsidePL / eliteRows.length),
      'share of seasons at 85 or better from outside the Premier League, per cent',
      'the direct answer to "is this just a Premier League index". Rounded to a whole number ' +
      'because a decimal here implies a precision the claim does not need',
      `select round(100.0 * count(*) filter (where league_code <> 'PL') / count(*)) from ${MV} where rt >= ${ELITE_BAR}`);

  /*  ── THE SCORING WALK. Every number the page shows of one season being scored, produced
      by RUNNING THE ENGINE rather than by reading a card. A hand-typed 132.90 is exactly
      what this page argues against, and an intermediate like PERF exists nowhere in the
      database , it is a step, not a column, so it can only come from the engine itself.

      IT RUNS `scripts/separability/rt_reimpl.js`, the independent re-implementation that
      validates at 99.57% exact against stored rt. That is deliberate and it is the one
      place on this page where a SECOND implementation is the right tool: the stored rt is
      the answer, and what the walk needs is the working, which the view does not expose.
      The walk ASSERTS its own rt against the stored one below , if the transcription ever
      drifts from the SQL, this throws rather than publishing a plausible wrong chain.  */
  const RT = require(path.join(__dirname, 'separability', 'rt_reimpl.js'));
  const ENGINE_COLS = 'card_id,position,position_pool,season_year,league_code,minutes,goals,' +
    'assists,penalties_scored,tackles_total,interceptions,tackles_blocks,duels_won,duels_total,' +
    'team_def90,def90,def_share,def_share_pct,rt,league_strength_weight,player_name';
  const engCards = await pageAll(MV, ENGINE_COLS);
  const engW = await sb.from('engine_league_weights').select('league_code,season_year,weight')
    .then(r => { if (r.error) throw new Error(r.error.message); return r.data; });
  const E = RT.buildEngine({ cards: engCards, weights: engW });
  const bAll = E.out.map(x => RT.bFor(x, E));
  const anchors = RT.anchorsOf(bAll);

  /*  THE SUBJECT IS A DECISION, NOT A CONVENIENCE , CHANGED FROM SALAH 24/25 ON 2026-10-04.
      Salah is Premier League, and the Premier League is the engine's baseline, so his league
      weight is exactly 1.000 and the walk's last step displayed "x 1" , a step that states a
      real and unusual property of this platform (league strength is MEASURED, from players
      who moved, not assigned by reputation) and then demonstrated nothing at all.
      Mbappe 21/22 is Ligue 1, measured at 0.7958 for that season, so the step finally shows
      its own point. He also has 28 goals AND 17 assists, so the opening step , that goals and
      assists become one figure , is visible in the inputs; Kane 17/18 was the other candidate
      and his 2 assists would have hidden it.
      THE NAME MUST MATCH THE STORED STRING EXACTLY, accent included, or the guard below
      throws rather than quietly walking a different season.  */
  const WALK_NAME = 'Kylian Mbappé', WALK_YEAR = 2021;
  const wi = E.out.findIndex(x => x.name === WALK_NAME && x.season_year === WALK_YEAR && x.minutes > 3000);
  if (wi < 0) throw new Error(`the scoring walk needs ${WALK_NAME} ${WALK_YEAR} and did not find it`);
  const W = E.out[wi], wb = bAll[wi], wrt = RT.rtFrom(wb, anchors);
  if (wrt !== W.rt_stored)
    throw new Error(`walk mismatch: re-implementation says ${wrt}, the database says ${W.rt_stored} , ` +
                    'the transcription has drifted and the walk would publish a wrong chain');

  const pp = E.posPct.get(W.pool).get(W.gaw90), pv = E.posvolPct.get(W.pool).get(W.gaw);
  const ap = E.absPctMap.get(W.gaw90),          av = E.absvolPctMap.get(W.gaw);
  const blended = (0.50 * (0.60 * pp + 0.40 * ap) + 0.50 * (0.60 * pv + 0.40 * av)) * 100;
  const rankTerm = 0.65 * blended;
  const volTerm  = 0.35 * (100 * W.gaw / E.gaw_ref);
  const PERF  = rankTerm + volTerm;
  const AVAIL = 0.30 * Math.min(95, 100 * (W.minutes / (W.minutes + 380)));

  const w1 = (k, v, claim, def) => add(k, v, claim, def, 'scripts/separability/rt_reimpl.js, run over the live matview');
  w1('walk_player', W.name, 'the season the walk follows', 'chosen for a recognisable, unambiguous attacking season');
  w1('walk_season', String(W.season_year).slice(2) + '/' + String(W.season_year + 1).slice(2), 'its season label', 'derived');
  w1('walk_goals', W.goals, 'goals', 'player_card_mv.goals');
  w1('walk_assists', W.assists, 'assists', 'player_card_mv.assists');
  /*  THE ENGINE'S OWN OBJECTS DO NOT CARRY EVERY RAW FIELD , it normalises to what the
      score needs, so `penalties_scored` is consumed into gaw and then gone. The walk shows
      the penalty count as an INPUT, so it comes from the source row rather than the
      normalised one. Reading it off W returned undefined and the printer threw on it,
      which is the friendly version of this mistake.  */
  const wRaw = engCards.find(c => c.card_id === W.card_id);
  if (!wRaw) throw new Error('the walk card vanished between the read and the engine');
  w1('walk_pens', wRaw.penalties_scored, 'penalties among those goals', 'player_card_mv.penalties_scored');
  w1('walk_minutes', W.minutes, 'minutes played', 'player_card_mv.minutes');
  w1('walk_gaw', +W.gaw.toFixed(2), 'the single output number', 'goals - 0.22*min(pens,goals) + 0.7*assists');
  w1('walk_gaw90', +W.gaw90.toFixed(3), 'the same number per 90 minutes', 'gaw / (minutes/90)');
  w1('walk_pct_pool_rate', +(pp * 100).toFixed(1), 'his rate, ranked inside his position pool', 'percent_rank of gaw90 within pool');
  w1('walk_pct_pool_vol', +(pv * 100).toFixed(1), 'his volume, ranked inside his position pool', 'percent_rank of gaw within pool');
  w1('walk_pct_all_rate', +(ap * 100).toFixed(1), 'his rate, ranked against every outfielder', 'percent_rank of gaw90, all non-GK');
  w1('walk_pct_all_vol', +(av * 100).toFixed(1), 'his volume, ranked against every outfielder', 'percent_rank of gaw, all non-GK');
  w1('walk_rank_term', +rankTerm.toFixed(1), 'the ranking half of the performance number', '0.65 * blended percentile, pool 60 / all 40, rate 50 / volume 50');
  w1('walk_vol_term', +volTerm.toFixed(1), 'the raw-volume half', '0.35 * 100 * gaw / the 99th-percentile season');
  w1('walk_perf', +PERF.toFixed(1), 'the performance number', 'rank term plus volume term');
  w1('walk_avail', +AVAIL.toFixed(1), 'the availability number', '0.30 * min(95, 100*minutes/(minutes+380))');
  w1('walk_weight', +W.wt.toFixed(3), 'his league weight that season', 'engine_league_weights, computed from players who moved');
  w1('walk_b', +wb.toFixed(1), 'the assembled figure, before the ladder', '(0.70*max(perf,floor) + avail) * (1-(1-weight)*0.35)');
  w1('walk_rt', wrt, 'what comes out', 'the rank-anchored ladder applied to the figure above');
  w1('walk_anchors', [anchors.b85, anchors.b90, anchors.b95].map(v => v.toFixed(1)).join(','),
     'the ladder anchors at 85, 90 and 95', 'the 650th, 150th and 12th highest figure in the record');
  w1('walk_pool', W.pool, 'the position pool he is read against', 'player_card_mv.position_pool');
  /*  THE LEAGUE'S NAME, so step 3 can say which one rather than "his league". The engine's
      output object does NOT carry league_code (rt_reimpl.js drops it after computing the
      weight), so it is read back off the card row by card_id and resolved through the SAME
      `lgName` guard as the elite table above , which throws rather than printing a bare code,
      and which exists because the `leagues` table says TSL where every card says TR.  */
  const wRow = engCards.find(c => c.card_id === W.card_id);
  if (!wRow) throw new Error('the walk card vanished from engCards , cannot name its league');
  w1('walk_league', lgName(wRow.league_code), 'the league that season was played in',
     'player_card_mv.league_code, named through vv-core\'s canonical map');

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

  /*  THE TWO FIGURES THAT MOVED UP BESIDE THE HEADLINE ON 2026-10-02, AND WERE TYPED UNTIL
      THEN. The page claimed "3 sit inside the twelve highest-scoring seasons" and "70" for
      Modric with no generator entry behind either , exactly the shape CLAUDE.md records as a
      claim rather than a measurement.  */
  const topTwelve = allCards.filter(c => c.rt != null).sort((x, y) => y.rt - x.rt).slice(0, 12);
  const topTwelveKeys = new Set(topTwelve.map(c => c.api_player_id + '|' + c.season_year));
  add('ballon_dor_in_top_twelve', bd.filter(r => topTwelveKeys.has(r.api_player_id + '|' + r.season_year)).length,
      "Ballon d'Or seasons that also sit inside the twelve highest-scoring seasons in the record",
      'the twelve highest rt values, joined to the Ballon d\'Or rows. Twelve is the Generational ' +
      'band, which is anchor-pinned, so the denominator is a structural constant',
      'top 12 by rt, intersected with the ballon_dor honour rows');

  /*  THE NAMED MISS. The page states the one Ballon d'Or season the Index does NOT place in
      the top three bands, by name and by score, which is the counterweight to the 13 of 14 and
      is the reason that claim is believable. IT THROWS IF THERE IS NOT EXACTLY ONE , two
      misses and the sentence is wrong, zero and it is boasting.  */
  const bdWithScores = bd.map(r => ({ r, v: byPlayerSeason[r.api_player_id + '|' + r.season_year] }))
                         .filter(x => x.v != null);
  /*  `BANDS.top3`, NOT `BANDS.worldClass` , the object is { top3, iconic, gen } and the
      first draft read a property that does not exist, so `v < undefined` was false for all
      fourteen and the check reported ZERO misses on data containing exactly one. It threw
      rather than publishing that, which is the guard doing its job on its own author.  */
  const missed = bdWithScores.filter(x => x.v < BANDS.top3);
  if (missed.length !== 1)
    throw new Error(`${missed.length} Ballon d'Or seasons fall below the top three bands, not 1 , the named-miss sentence says "the one the Index misses"`);
  add('ballon_dor_miss_score', missed[0].v,
      "the VV Score of the one Ballon d'Or season the Index does not place in its top three bands",
      'the single ballon_dor row scoring below the 85 band edge. Throws if there is ever ' +
      'more than one, because the page names it in the singular',
      'ballon_dor rows with rt < 85');
  add('ballon_dor_miss_player', missed[0].r.player_name || 'that season',
      'who it was', 'the same row', 'as above');

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
