// READ-ONLY pull: rt 80-84 big-club cards with coarse/CM positions.
// Writes a CSV and prints diagnostic counts. NO writes to the DB.
//   RUN: node pull_8084.js <out.csv>   (from repo root, so .env loads)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const OUT = process.argv[2] || 'pull_8084.csv';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 41 target big clubs (as Lucas listed them; matched by accent/space/hyphen-insensitive norm)
const TEAMS = [
  'Barcelona', 'Real Madrid', 'Atletico Madrid', 'Sevilla', 'Valencia',
  'Manchester City', 'Manchester United', 'Liverpool', 'Chelsea', 'Arsenal', 'Tottenham',
  'Juventus', 'Inter', 'AC Milan', 'Napoli', 'AS Roma', 'Lazio',
  'Bayern München', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig',
  'Paris Saint Germain', 'Marseille', 'Lyon', 'Monaco',
  'Benfica', 'FC Porto', 'Sporting CP', 'SC Braga',
  'Ajax', 'PSV Eindhoven', 'Feyenoord',
  'Club Brugge KV', 'Anderlecht', 'Genk', 'Standard Liège', 'Gent',
  'Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor'
];

// the coarse / bug labels we are standardizing (un-bucketed or API "CM" bug)
const COARSE = new Set(['DEF', 'MID', 'FWD', 'UNK', 'CM']);

// accent/space/punct-insensitive team-name normaliser
function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
const TARGET_NORMS = new Set(TEAMS.map(norm));

// CSV field escaper
function esc(v) {
  v = (v == null) ? '' : String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

(async () => {
  // 1. pull all rt 80-84 rows (paginate past the 1000-row PostgREST cap)
  let all = [];
  let from = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await sb
      .from('player_card_view')
      .select('card_id, api_player_id, season_year, league_code, player_name, team_name, season, rt, goals, assists, position_pool, position')
      .gte('rt', 80).lt('rt', 85)
      .order('rt', { ascending: false })
      .range(from, from + page - 1);
    if (error) { console.error('QUERY ERROR:', error.message); process.exit(1); }
    all = all.concat(data || []);
    if (!data || data.length < page) break;
    from += page;
  }
  console.error('total rt 80-84 rows pulled: ' + all.length);

  // 2. filter: coarse/CM label AND team in the 41 targets
  const rows = all.filter(r => {
    const coarse = (r.position_pool != null ? r.position_pool : r.position);
    return COARSE.has(coarse) && TARGET_NORMS.has(norm(r.team_name));
  });
  console.error('filtered big-club coarse rows: ' + rows.length);

  // 3. diagnostics
  const byTeam = {};
  const byCoarse = {};
  rows.forEach(r => {
    byTeam[r.team_name] = (byTeam[r.team_name] || 0) + 1;
    const c = (r.position_pool != null ? r.position_pool : r.position);
    byCoarse[c] = (byCoarse[c] || 0) + 1;
  });
  const hit = new Set(rows.map(r => norm(r.team_name)));
  const missing = TEAMS.filter(t => !hit.has(norm(t)));

  console.error('coarse breakdown: ' + JSON.stringify(byCoarse));
  console.error('per-team counts:');
  Object.keys(byTeam).sort((a, b) => byTeam[b] - byTeam[a]).forEach(t => {
    console.error('  ' + String(byTeam[t]).padStart(3) + '  ' + t);
  });
  console.error('target teams with 0 rows (POSSIBLE NAME MISMATCH): ' + (missing.length ? missing.join(', ') : 'none'));

  // 4. write CSV (sorted rt desc, then team)
  rows.sort((a, b) => (b.rt - a.rt) || (a.team_name || '').localeCompare(b.team_name || ''));
  const cols = ['card_id', 'api_player_id', 'season_year', 'league_code', 'player_name', 'team_name', 'season', 'rt', 'goals', 'assists', 'current_position'];
  const lines = [cols.join(',')];
  rows.forEach(r => {
    const coarse = (r.position_pool != null ? r.position_pool : r.position);
    lines.push([
      r.card_id, r.api_player_id, r.season_year, r.league_code,
      r.player_name, r.team_name, r.season, r.rt, r.goals, r.assists, coarse
    ].map(esc).join(','));
  });
  fs.writeFileSync(OUT, lines.join('\n') + '\n');
  console.error('wrote CSV: ' + OUT + ' (' + rows.length + ' rows)');
})();
