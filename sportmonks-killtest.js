#!/usr/bin/env node
/**
 * VVonderXI x Sportmonks , KILL TEST
 *
 * Purpose: answer ONE question before any migration work begins.
 *   "Are defensive and advanced attacking stats actually POPULATED
 *    for our worst-case leagues at our earliest target season?"
 *
 * This is deliberately NOT a coverage audit. It is a go / no-go probe.
 * It writes a report and touches nothing else. No Supabase. No writes.
 *
 * Run:  SPORTMONKS_API_TOKEN=xxx node sportmonks-killtest.js
 * Out:  ./sportmonks_killtest_report.json  +  console summary
 */

const TOKEN = process.env.SPORTMONKS_API_TOKEN;
if (!TOKEN) {
  console.error('FATAL: SPORTMONKS_API_TOKEN is not set. Aborting.');
  process.exit(1);
}

const BASE = 'https://api.sportmonks.com/v3';

// Worst-case leagues. If these three fail, the big five do not rescue the migration,
// because a stat we only have for 5 of 9 leagues is unusable in a cross-league engine.
const TARGET_LEAGUES = ['Süper Lig', 'Pro League', 'Eredivisie'];

// Earliest season VVonderXI cares about, plus a modern control.
// The control matters: if modern is rich and 2010/11 is empty, the answer is
// "suitable from year X onwards", which is a different product decision.
const EARLY_TARGET = '2011';   // matched against season name, loose
const MODERN_CONTROL = '2022'; // known-good era, proves the probe itself works

// What we are actually shopping for. Matched case-insensitively against type names,
// so it survives us not knowing Sportmonks' internal IDs.
const WANTED = {
  defensive: [
    'tackle', 'interception', 'clearance', 'block', 'duel', 'aerial',
    'recover', 'dispossess', 'error', 'last man', 'ball won', 'ball lost',
  ],
  attacking_advanced: [
    'expected goal', 'xg', 'expected assist', 'xa', 'big chance',
    'key pass', 'through ball', 'dribble', 'touch', 'progressive',
    'shots on target', 'shots total', 'cross',
  ],
  baseline: ['goal', 'assist', 'minutes', 'appearance', 'rating'],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = { generated_at: new Date().toISOString(), steps: {}, verdict: null };

async function api(path, params = {}) {
  const qs = new URLSearchParams({ api_token: TOKEN, ...params });
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.message || res.statusText;
    throw new Error(`HTTP ${res.status} on ${path} , ${msg}`);
  }
  // Sportmonks reports remaining quota in the envelope. Worth surfacing.
  if (body.rate_limit) report.rate_limit = body.rate_limit;
  await sleep(250); // be polite, this is somebody else's server
  return body;
}

function matchTypes(types, needles) {
  const hits = {};
  for (const n of needles) {
    hits[n] = types
      .filter(t => (t.name || '').toLowerCase().includes(n.toLowerCase()))
      .map(t => ({ id: t.id, name: t.name }));
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/* STEP 1 , does the stat even exist as a concept on this plan?        */
/* ------------------------------------------------------------------ */
async function step1_types() {
  console.log('\n[1/4] Fetching statistic type catalogue...');
  let page = 1, all = [], more = true;
  while (more && page <= 20) {
    const r = await api('/core/types', { page, per_page: 100 });
    all = all.concat(r.data || []);
    more = r.pagination?.has_more ?? false;
    page++;
  }
  console.log(`      ${all.length} types returned.`);

  const found = {
    defensive: matchTypes(all, WANTED.defensive),
    attacking_advanced: matchTypes(all, WANTED.attacking_advanced),
    baseline: matchTypes(all, WANTED.baseline),
  };

  for (const [group, hits] of Object.entries(found)) {
    const missing = Object.entries(hits).filter(([, v]) => v.length === 0).map(([k]) => k);
    console.log(`      ${group}: ${missing.length ? 'NO TYPE for , ' + missing.join(', ') : 'all present'}`);
  }

  report.steps.types = { total: all.length, found };
  report.steps.types.all_names = all.map(t => `${t.id} ${t.name}`).sort();
  return all;
}

/* ------------------------------------------------------------------ */
/* STEP 2 , do we have the leagues, and how far back do seasons go?    */
/* ------------------------------------------------------------------ */
async function step2_leagues() {
  console.log('\n[2/4] Resolving target leagues and season depth...');
  const out = {};
  for (const name of TARGET_LEAGUES) {
    let league = null;
    try {
      const r = await api(`/football/leagues/search/${encodeURIComponent(name)}`);
      league = (r.data || [])[0] || null;
    } catch (e) {
      out[name] = { error: e.message };
      console.log(`      ${name}: SEARCH FAILED , ${e.message}`);
      continue;
    }
    if (!league) {
      out[name] = { error: 'not found or not on plan' };
      console.log(`      ${name}: NOT AVAILABLE on this plan`);
      continue;
    }
    const s = await api(`/football/leagues/${league.id}`, { include: 'seasons' });
    const seasons = (s.data?.seasons || [])
      .map(x => ({ id: x.id, name: x.name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    out[name] = {
      league_id: league.id,
      league_name: league.name,
      season_count: seasons.length,
      earliest: seasons[0]?.name || null,
      latest: seasons[seasons.length - 1]?.name || null,
      seasons,
    };
    console.log(`      ${league.name}: ${seasons.length} seasons, ${out[name].earliest} to ${out[name].latest}`);
  }
  report.steps.leagues = out;
  return out;
}

/* ------------------------------------------------------------------ */
/* STEP 3 , pick a real player from a real squad in each test season   */
/* ------------------------------------------------------------------ */
async function pickPlayer(seasonId) {
  const teams = await api(`/football/teams/seasons/${seasonId}`);
  const team = (teams.data || [])[0];
  if (!team) return null;
  const squad = await api(`/football/squads/seasons/${seasonId}/teams/${team.id}`);
  const entries = squad.data || [];
  // Prefer a defender. Defenders are the whole reason we are here.
  const pick = entries.find(e => [5, 6, 148].includes(e.position_id)) || entries[0];
  if (!pick) return null;
  return { team_id: team.id, team_name: team.name, player_id: pick.player_id };
}

/* ------------------------------------------------------------------ */
/* STEP 4 , the actual test: is the field POPULATED, not just defined? */
/* ------------------------------------------------------------------ */
async function probeSeason(label, seasonId) {
  const pick = await pickPlayer(seasonId);
  if (!pick) return { season_id: seasonId, error: 'no squad data returned' };

  const r = await api(`/football/players/${pick.player_id}`, {
    include: 'statistics.details.type',
    filters: `playerStatisticSeasons:${seasonId}`,
  });

  const stats = r.data?.statistics || [];
  const details = stats.flatMap(s => s.details || []);
  const populated = details
    .map(d => ({
      type: d.type?.name || `type_${d.type_id}`,
      value: d.value,
    }))
    .filter(d => d.value !== null && d.value !== undefined);

  const names = populated.map(p => p.type.toLowerCase());
  const coverage = {};
  for (const [group, needles] of Object.entries(WANTED)) {
    coverage[group] = needles.filter(n => names.some(nm => nm.includes(n.toLowerCase())));
  }

  console.log(`      ${label} (player ${pick.player_id}, ${pick.team_name}): ` +
    `${populated.length} populated fields, ` +
    `${coverage.defensive.length}/${WANTED.defensive.length} defensive`);

  return {
    season_id: seasonId,
    sample_player_id: pick.player_id,
    sample_team: pick.team_name,
    populated_field_count: populated.length,
    coverage,
    raw_populated: populated,
  };
}

async function step3and4(leagues) {
  console.log('\n[3/4] + [4/4] Probing real player-seasons...');
  const out = {};
  for (const [name, info] of Object.entries(leagues)) {
    if (info.error) continue;
    const early = info.seasons.find(s => String(s.name).includes(EARLY_TARGET));
    const modern = info.seasons.find(s => String(s.name).includes(MODERN_CONTROL));
    out[name] = {};
    console.log(`    ${name}:`);
    if (early) out[name].early = await probeSeason(`early ${early.name}`, early.id);
    else { out[name].early = { error: `no season matching ${EARLY_TARGET}` };
           console.log(`      early: NO SEASON matching ${EARLY_TARGET}`); }
    if (modern) out[name].modern = await probeSeason(`modern ${modern.name}`, modern.id);
    else out[name].modern = { error: `no season matching ${MODERN_CONTROL}` };
  }
  report.steps.probe = out;
  return out;
}

/* ------------------------------------------------------------------ */
function verdict(probe) {
  const rows = [];
  for (const [league, r] of Object.entries(probe)) {
    rows.push({
      league,
      early_defensive: r.early?.coverage?.defensive?.length ?? 0,
      early_fields: r.early?.populated_field_count ?? 0,
      modern_defensive: r.modern?.coverage?.defensive?.length ?? 0,
      modern_fields: r.modern?.populated_field_count ?? 0,
    });
  }
  const earlyOk = rows.every(r => r.early_defensive >= 4);
  const modernOk = rows.every(r => r.modern_defensive >= 4);
  let v;
  if (earlyOk && modernOk) v = 'PASS , defensive data present across full era. Proceed to Phase 1.';
  else if (modernOk) v = 'CONDITIONAL , defensive data is modern-era only. This is an era-scoped decision, not a migration. Do not proceed without deciding what happens to pre-cutoff cards.';
  else v = 'FAIL , defensive data is not populated for worst-case leagues. Sportmonks does not solve the defender gap. Stop here.';
  report.verdict = { rows, verdict: v };
  return { rows, v };
}

(async () => {
  try {
    await step1_types();
    const leagues = await step2_leagues();
    const probe = await step3and4(leagues);
    const { rows, v } = verdict(probe);

    console.log('\n================ VERDICT ================');
    console.table(rows);
    console.log(v);
    if (report.rate_limit) console.log('Quota:', JSON.stringify(report.rate_limit));

    const fs = await import('node:fs/promises');
    await fs.writeFile('sportmonks_killtest_report.json', JSON.stringify(report, null, 2));
    console.log('\nFull report written to sportmonks_killtest_report.json');
  } catch (e) {
    console.error('\nPROBE ABORTED:', e.message);
    console.error('This is itself a finding. Record which step failed and why.');
    process.exit(1);
  }
})();
