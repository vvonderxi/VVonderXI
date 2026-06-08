#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  VVonderXI — League Flesh-Out Import  (BSD free tier → Supabase)
//
//  Chain (all endpoints confirmed working via probe):
//    /leagues/{id}/standings/   → the league's ~20 teams (reliable list)
//    /teams/{id}/squad/         → each team's full roster
//    /players/{id}/career/      → each player's seasons (with minutes)
//
//  FILTER:    keep only seasons with minutes >= MIN_MINUTES (default 500),
//             in a recognised league. A player with no qualifying season is
//             skipped entirely (no data, no player).
//  SCOPE:     all of a kept player's recognised seasons (any league), not just
//             this one — richer career histories for comparison.
//  SAFE:      upsert (idempotent). Resumable per-team via import_log.
//  ID:        real BSD player id (positive) — distinct from the negative
//             synthetic ids used by the curated seed.
//
//  RUN:
//    node flesh-league.js --league PL --dry-run   → counts only, no writes
//    node flesh-league.js --league PL             → real write
//    node flesh-league.js --league PL --force     → re-do teams already logged
// ══════════════════════════════════════════════════════════════════════

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const argLeague = process.argv.includes('--league') ? process.argv[process.argv.indexOf('--league') + 1] : 'PL';
const MIN_MINUTES = process.argv.includes('--min-minutes')
  ? parseInt(process.argv[process.argv.indexOf('--min-minutes') + 1], 10) : 500;

const BSD = 'https://sports.bzzoiro.com/api/v2';
const KEY = process.env.BSD_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!KEY) { console.error('BSD_API_KEY not set'); process.exit(1); }

let supabase = null;
if (!DRY_RUN) {
  if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set'); process.exit(1); }
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const DELAY_MS = 350;

// BSD league_id for the league we want to flesh out (standings source)
const LEAGUE_IDS = { PL:1, LL:3, BL:5, SA:4, L1:6, PRT:2, ERE:10, BPL:14 };
const leagueId = LEAGUE_IDS[argLeague];
if (!leagueId) { console.error(`Unknown league code: ${argLeague}`); process.exit(1); }

// name → VVonderXI code (which seasons count as "recognised")
const LEAGUE_MAP = {
  'premier league':'PL','la liga':'LL','bundesliga':'BL','serie a':'SA',
  'ligue 1':'L1','primeira liga':'PRT','liga portugal':'PRT','eredivisie':'ERE',
  'belgian pro league':'BPL','jupiler pro league':'BPL','champions league':'CL',
  'uefa champions league':'CL','europa league':'UEL','saudi pro league':'SPL','mls':'MLS',
  'scottish premiership':'SPM','super lig':'TSL','turkish super lig':'TSL',
  'argentine primera':'ARG','liga profesional':'ARG','brasileirao':'BRZ',
};
const POS_MAP = {
  'G':'GK','GK':'GK','Goalkeeper':'GK','D':'CB','CB':'CB','LB':'LB','RB':'RB',
  'Centre-Back':'CB','Left Back':'LB','Right Back':'RB','Defender':'CB',
  'M':'CM','CM':'CM','CDM':'CDM','CAM':'CAM','Midfielder':'CM',
  'F':'ST','ST':'ST','CF':'CF','FWD':'ST','LW':'LW','RW':'RW','Striker':'ST','Forward':'ST','Attacker':'ST',
};

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function lgCode(name){ if(!name) return 'OTHER'; const l=name.toLowerCase(); for(const [k,v] of Object.entries(LEAGUE_MAP)) if(l.includes(k)) return v; return 'OTHER'; }
function normalisePos(raw){ if(!raw) return null; return POS_MAP[raw] || POS_MAP[String(raw).trim()] || String(raw).slice(0,3).toUpperCase(); }
function seasonCode(year){ const y=parseInt(year); if(!y||y<2008||y>2026) return null; return String(y).slice(2)+String(y+1).slice(2); }
function ageAt(dob, year){ if(!dob||!year) return null; const a=Math.floor((new Date(year,7,1)-new Date(dob))/(365.25*24*3600*1000)); return (a>10&&a<50)?a:null; }

let stats = { apiCalls:0, teams:0, playersSeen:0, playersKept:0, cards:0, errors:0, start:Date.now() };

async function bsd(path, retries=3){
  for(let attempt=1; attempt<=retries; attempt++){
    try{
      const r = await fetch(`${BSD}${path}`, { headers:{Authorization:`Token ${KEY}`}, signal:AbortSignal.timeout(12000) });
      if(r.status===429){ console.warn(`  rate limited ${path} — waiting 5s`); await sleep(5000); continue; }
      if(!r.ok) throw new Error(`BSD ${r.status} ${path}`);
      stats.apiCalls++;
      return await r.json();
    }catch(e){ if(attempt===retries) throw e; await sleep(1500*attempt); }
  }
}

const seasonCache={}, leagueCache={}, teamNameCache={};
async function getSeasonYear(id){
  if(seasonCache[id]!==undefined) return seasonCache[id];
  try{
    const d=await bsd(`/seasons/${id}/`);
    let y=null;
    if(d.year>=2000) y=d.year;
    if(!y && d.season_year>=2000) y=d.season_year;
    if(!y && d.start_date) y=new Date(d.start_date).getFullYear();
    if(!y && d.name){ let m=d.name.match(/(20\d{2})/); if(m) y=parseInt(m[1]); else { let m2=d.name.match(/\b(\d{2})[\/\-](\d{2})\b/); if(m2) y=2000+parseInt(m2[1]); } }
    seasonCache[id]= y||null; return seasonCache[id];
  }catch(e){ seasonCache[id]=null; return null; }
}
async function getLeagueCode(id){
  if(leagueCache[id]!==undefined) return leagueCache[id];
  try{ const d=await bsd(`/leagues/${id}/`); leagueCache[id]=lgCode(d.name||d.league_name||''); }catch(e){ leagueCache[id]='OTHER'; }
  return leagueCache[id];
}
async function getTeamName(id){
  if(teamNameCache[id]!==undefined) return teamNameCache[id];
  try{ const d=await bsd(`/teams/${id}/`); teamNameCache[id]=d.name||d.team_name||''; }catch(e){ teamNameCache[id]=''; }
  return teamNameCache[id];
}

// Robustly pull {id,name} teams out of a standings payload
function parseStandings(j){
  let arr = j.standings || j.results || (Array.isArray(j) ? j : null);
  if(!Array.isArray(arr)) return [];
  return arr.map(x => { const t = x.team || x; return { id: t.id || t.team_id, name: t.name || t.team_name }; })
            .filter(t => t.id);
}

// ── import_log resumability (per team) ──────────────────────────────
async function teamDone(teamId){
  if(DRY_RUN || FORCE) return false;
  const { data } = await supabase.from('import_log').select('status')
    .eq('league_code', argLeague).eq('season','SQUAD').eq('page', teamId).maybeSingle();
  return data?.status === 'complete';
}
async function logTeam(teamId, players, cards){
  if(DRY_RUN) return;
  await supabase.from('import_log').upsert({
    league_code: argLeague, season:'SQUAD', page: teamId, status:'complete',
    players_found: players, cards_inserted: cards, completed_at: new Date().toISOString(),
  }, { onConflict:'league_code,season,page' });
}

// ── write one player + their qualifying cards ───────────────────────
async function savePlayer(sp){ // sp = squad player
  stats.playersSeen++;
  let career;
  try { career = await bsd(`/players/${sp.id}/career/`); await sleep(DELAY_MS); }
  catch(e){ stats.errors++; return 0; }

  const rows = career.seasons || career.results || (Array.isArray(career) ? career : []);
  const cards = [];
  for(const row of rows){
    const minutes = parseInt(row.minutes) || 0;
    if(minutes < MIN_MINUTES) continue;              // ← the 500-min filter
    const year = await getSeasonYear(row.season_id); await sleep(DELAY_MS);
    const sCode = seasonCode(year);
    if(!sCode) continue;
    const code = await getLeagueCode(row.league_id); await sleep(DELAY_MS);
    if(code === 'OTHER') continue;                    // recognised leagues only
    const teamName = row.team_name || (row.team_id ? await getTeamName(row.team_id) : '');
    if(row.team_id && !row.team_name) await sleep(DELAY_MS);
    const rating = row.avg_rating != null ? parseFloat(row.avg_rating) : null;
    cards.push({
      api_player_id: sp.id,
      season: sCode,
      season_year: year,
      league_code: code,
      team_name: teamName || '',
      position: normalisePos(sp.specific_position || sp.position),
      age: ageAt(sp.date_of_birth, year),
      appearances: parseInt(row.matches) || 0,
      minutes,
      goals: parseInt(row.goals) || 0,
      assists: parseInt(row.assists) || 0,
      rating: rating,
      rt: rating != null ? Math.round(rating * 10) : null,
    });
  }

  if(!cards.length) return 0;                          // no qualifying season → skip player
  stats.playersKept++;

  if(DRY_RUN){ stats.cards += cards.length; return cards.length; }

  // upsert player, get id, link cards
  const { data: pl, error: pe } = await supabase.from('players').upsert({
    api_player_id: sp.id,
    name: sp.name,
    nationality: sp.nationality || null,
    position: normalisePos(sp.specific_position || sp.position),
    date_of_birth: sp.date_of_birth || null,
    updated_at: new Date().toISOString(),
  }, { onConflict:'api_player_id' }).select('id').single();
  if(pe || !pl){ stats.errors++; console.error(`  player upsert failed for ${sp.name}: ${pe?.message}`); return 0; }

  const withId = cards.map(c => ({ ...c, player_id: pl.id }));
  const { error: ce } = await supabase.from('player_season_cards')
    .upsert(withId, { onConflict:'api_player_id,season,league_code' });
  if(ce){ stats.errors++; console.error(`  cards upsert failed for ${sp.name}: ${ce.message}`); return 0; }

  stats.cards += cards.length;
  return cards.length;
}

async function main(){
  console.log('\n=== VVonderXI — League Flesh-Out ===');
  console.log(`League: ${argLeague} (BSD id ${leagueId}) | Min minutes: ${MIN_MINUTES} | ${DRY_RUN?'DRY RUN (no writes)':'LIVE WRITE'}${FORCE?' | FORCE':''}\n`);

  const standings = await bsd(`/leagues/${leagueId}/standings/`); await sleep(DELAY_MS);
  const teams = parseStandings(standings);
  console.log(`Teams found: ${teams.length}`);
  console.log(teams.map(t => `${t.id}:${t.name}`).join(' | ') + '\n');
  if(!teams.length){ console.error('No teams parsed from standings — aborting.'); process.exit(1); }

  for(const team of teams){
    if(await teamDone(team.id)){ console.log(`  ⏭  ${team.name} (${team.id}) already done — skipping`); continue; }
    console.log(`\n  📁  ${team.name} (${team.id})`);
    let squad;
    try { squad = await bsd(`/teams/${team.id}/squad/`); await sleep(DELAY_MS); }
    catch(e){ console.error(`     squad fetch failed: ${e.message}`); stats.errors++; continue; }

    const players = squad.players || squad.results || (Array.isArray(squad) ? squad : []);
    console.log(`     squad: ${players.length} players`);
    stats.teams++;

    let teamCards = 0, teamKept = 0;
    for(const sp of players){
      const n = await savePlayer(sp);
      if(n > 0) teamKept++;
      teamCards += n;
    }
    console.log(`     kept ${teamKept}/${players.length} players · ${teamCards} cards`);
    await logTeam(team.id, players.length, teamCards);
  }

  const secs = Math.round((Date.now()-stats.start)/1000);
  console.log('\n=== FLESH-OUT COMPLETE ===');
  console.log(`  Teams processed:   ${stats.teams}`);
  console.log(`  Players seen:      ${stats.playersSeen}`);
  console.log(`  Players kept:      ${stats.playersKept}  (had a season >= ${MIN_MINUTES} mins)`);
  console.log(`  Players dropped:   ${stats.playersSeen - stats.playersKept}  (no qualifying season)`);
  console.log(`  Cards written:     ${stats.cards}`);
  console.log(`  API calls:         ${stats.apiCalls}`);
  console.log(`  Errors:            ${stats.errors}`);
  console.log(`  Time:              ${Math.floor(secs/60)}m ${secs%60}s`);
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
