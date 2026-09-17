/*  BAM EXPORT , ONE WAY, READ-ONLY.
    ================================================================
    This script reads API-Football and writes files. It holds NO Supabase client,
    no connection string and no write path into VVonderXI. It cannot touch a
    table, a view or the schema, and that is a property of the file rather than
    a promise about it: there is nothing here to write with.

    EVERY OUTPUT LANDS IN exports/bam/ AND NOWHERE ELSE. The output root is
    resolved once, below, and every write is asserted to sit inside it.

    Usage:  node scripts/bam/export-league.js --league 88 --slug eredivisie \
                 --from 2010 --to 2026
*/
'use strict';
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

const BASE = 'https://v3.football.api-sports.io';
const KEY  = process.env.APIFOOTBALL_KEY;
if (!KEY) { console.error('APIFOOTBALL_KEY not set'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..', '..', 'exports', 'bam');

/*  THE WRITE GUARD. Scope says exports land in exports/bam/ and nowhere else, so
    that is enforced here rather than trusted to every call site below. A path
    that escapes the root throws instead of writing.  */
function writeOut(rel, text) {
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep))
    throw new Error('refusing to write outside exports/bam/: ' + full);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
  return full;
}

const args = process.argv.slice(2);
const arg  = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };

const LEAGUE = Number(arg('league'));
const SLUG   = arg('slug');
const FROM   = Number(arg('from'));
const TO     = Number(arg('to'));
if (!LEAGUE || !SLUG || !FROM || !TO) { console.error('missing --league/--slug/--from/--to'); process.exit(1); }

/*  A RESULT IS NOT ONLY "FT". ERE 2021/22's playoff final finished AET and its
    relegation playoff finished PEN , measured, not assumed. A naive status==='FT'
    test flags those two as missing, which is the flag lying about real results.
    AWD (awarded) and WO (walkover) are ALSO decided, and are listed separately
    because their goals are administrative rather than played.  */
const PLAYED   = new Set(['FT', 'AET', 'PEN']);
const AWARDED  = new Set(['AWD', 'WO']);
/*  A KNOWN NON-RESULT IS NOT "MISSING". The endpoint says why the match did not
    produce a score, so the export says so too rather than folding it into a flag
    that means "we do not know".  */
const KNOWN_NR = new Set(['PST', 'CANC', 'ABD', 'SUSP', 'INT', 'TBD', 'AWD', 'WO']);

async function get(params) {
  const url = `${BASE}/fixtures?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { 'x-apisports-key': KEY }, signal: AbortSignal.timeout(30000) });
    if (res.status === 429) { await new Promise(r => setTimeout(r, 4000 * attempt)); continue; }
    const json = await res.json();
    /*  API-FOOTBALL RETURNS HTTP 200 WITH AN `errors` BODY. A status check alone
        reads a quota refusal or a bad parameter as a successful empty season.  */
    const errs = json.errors;
    const hasErr = Array.isArray(errs) ? errs.length > 0 : (errs && Object.keys(errs).length > 0);
    if (hasErr) throw new Error('API error: ' + JSON.stringify(errs));
    if (json.paging && json.paging.total > 1)
      throw new Error(`paged response (${json.paging.total} pages) not handled for ${params}`);
    return json;
  }
  throw new Error('rate limited after 3 attempts: ' + params);
}

(async () => {
  const retrievedAt = new Date().toISOString();
  const manifest = { league_id: LEAGUE, slug: SLUG, source: BASE, retrieved_at: retrievedAt, seasons: [] };

  for (let year = FROM; year <= TO; year++) {
    const json = await get(`league=${LEAGUE}&season=${year}`);
    const rows = json.response || [];
    if (!rows.length) { console.log(`  ${year}: EMPTY, skipped`); continue; }

    const matches = rows.map(f => ({
      fixture_id:  f.fixture.id,
      date_utc:    f.fixture.date,
      status:      f.fixture.status.short,
      round:       f.league.round,
      home_id:     f.teams.home.id,
      home:        f.teams.home.name,
      away_id:     f.teams.away.id,
      away:        f.teams.away.name,
      home_goals:  f.goals.home,
      away_goals:  f.goals.away,
      ht_home:     f.score.halftime.home,
      ht_away:     f.score.halftime.away
    })).sort((a, b) => a.date_utc.localeCompare(b.date_utc));

    const played  = matches.filter(m => PLAYED.has(m.status));
    const awarded = matches.filter(m => AWARDED.has(m.status));

    /*  THE FLAG. "Missing" means the fixture list says this match kicked off and
        no result came back, and the endpoint gives no reason for it. A future
        date is simply not yet played and is NOT flagged; a PST or CANC is a
        stated reason and is reported under its own name.
        THE LIMIT IS REAL AND IS STATED IN THE OUTPUT: this compares the returned
        results against the returned FIXTURE LIST, which is the only fixture
        source there is. It cannot see a match that was never listed. The round
        census below is the independent check on that, and it is regular-season
        only , playoff rounds are not uniform and are appended as a season runs. */
    const nowMs = Date.now();
    const missing = matches.filter(m =>
      Date.parse(m.date_utc) < nowMs && !PLAYED.has(m.status) && !KNOWN_NR.has(m.status));
    const nullScore = played.filter(m => m.home_goals === null || m.away_goals === null);
    const unplayedReason = {};
    for (const m of matches)
      if (KNOWN_NR.has(m.status)) unplayedReason[m.status] = (unplayedReason[m.status] || 0) + 1;

    const byRound = {};
    for (const m of matches) byRound[m.round] = (byRound[m.round] || 0) + 1;
    const sizes = Object.values(byRound);
    const modal = sizes.sort((a, b) =>
      sizes.filter(v => v === b).length - sizes.filter(v => v === a).length)[0];
    const shortRounds = Object.entries(byRound)
      .filter(([, n]) => n < modal).map(([r, n]) => ({ round: r, fixtures: n, modal }));

    const through = played.length ? played[played.length - 1].date_utc.slice(0, 10) : null;

    const meta = {
      league_id: LEAGUE, slug: SLUG, season: year,
      season_label: `${year}/${String(year + 1).slice(2)}`,
      through,                                   // latest PLAYED match in this file
      fixtures_to: matches[matches.length - 1].date_utc.slice(0, 10),
      retrieved_at: retrievedAt,
      match_count: played.length,                // results BAM can rate on
      fixtures_total: matches.length,            // scheduled, played or not
      not_yet_played: matches.filter(m => Date.parse(m.date_utc) >= nowMs).length,
      awarded_count: awarded.length,
      unplayed_with_reason: unplayedReason,
      missing_count: missing.length,
      missing: missing.map(m => ({ fixture_id: m.fixture_id, date_utc: m.date_utc,
                                   status: m.status, home: m.home, away: m.away })),
      null_score_count: nullScore.length,
      round_census: { modal_fixtures_per_round: modal, rounds: Object.keys(byRound).length,
                      short_rounds: shortRounds },
      flag_limit: 'missing = listed, kicked off, no result and no stated reason. '
                + 'Compared against the returned fixture list, which is the only fixture '
                + 'source; a match never listed cannot be detected. short_rounds is the '
                + 'independent check and is regular-season only.'
    };

    writeOut(path.join(SLUG, `${SLUG}_${year}.json`), JSON.stringify({ meta, matches }, null, 2));
    manifest.seasons.push({ season: year, through, match_count: played.length,
      fixtures_total: matches.length, missing_count: missing.length,
      unplayed_with_reason: unplayedReason, short_rounds: shortRounds.length });
    console.log(`  ${year}: ${played.length} played / ${matches.length} listed, `
      + `through ${through}, missing ${missing.length}`);
    await new Promise(r => setTimeout(r, 200));
  }

  const totals = manifest.seasons.reduce((a, s) => {
    a.match_count += s.match_count; a.fixtures_total += s.fixtures_total;
    a.missing_count += s.missing_count; return a;
  }, { match_count: 0, fixtures_total: 0, missing_count: 0 });
  manifest.totals = totals;
  manifest.through = manifest.seasons.map(s => s.through).filter(Boolean).sort().pop();
  writeOut(path.join(SLUG, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nmanifest: ${manifest.seasons.length} seasons, ${totals.match_count} matches, `
    + `through ${manifest.through}, missing ${totals.missing_count}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
