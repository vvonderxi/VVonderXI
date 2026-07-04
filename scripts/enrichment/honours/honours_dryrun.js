// READ-ONLY dry-run for the Tier-1 honours write (v3 resolver: exact -> token-subset -> surname+initial,
// via surname/first buckets; team+season cross-check disambiguates; norm folds ss/o/l/d specials).
// Writes honours_prepared.csv. NO DB writes.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2], OUT = process.argv[3];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TEAM_MAP = {
  'Milan': 'AC Milan', 'Bayern Munich': 'Bayern München', 'Inter Milan': 'Inter', 'Porto': 'FC Porto',
  'PSV': 'PSV Eindhoven', 'Club Brugge': 'Club Brugge KV', 'Paris Saint-Germain': 'Paris Saint Germain',
  'Fenerbahce': 'Fenerbahçe', 'Besiktas': 'Beşiktaş', 'Tottenham Hotspur': 'Tottenham',
  'Leicester City': 'Leicester', 'Istanbul Basaksehir': 'Başakşehir', 'KRC Genk': 'Genk', 'Roma': 'AS Roma'
};
const LEAGUE_MAP = { 'La Liga': 'LL', 'Premier League': 'PL', 'Serie A': 'SA', 'Bundesliga': 'BL', 'Ligue 1': 'L1', 'Primeira Liga': 'PRT', 'Eredivisie': 'ERE', 'Belgian Pro League': 'BPL', 'Süper Lig': 'TR' };
// hand-verified overrides (key = normPlayer|season_year|honour_type)
const API_OVERRIDE = { 'rodri|2023|ballon_dor': 44, 'salah|2018|golden_boot': 306, 'mane|2018|golden_boot': 304 };
const TEAM_OVERRIDE = { 'salah|2018|golden_boot': 'Liverpool' };  // 3-player/2-team tie: Salah's club
const mapTeam = t => { t = (t || '').trim(); return t ? (TEAM_MAP[t] || t) : ''; };
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/ß/g, 'ss').replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/[đð]/g, 'd').replace(/ı/g, 'i').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/þ/g, 'th')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const lastTok = n => { const t = n.split(' ').filter(Boolean); return t.length ? t[t.length - 1] : n; };
const firstTok = n => { const t = n.split(' ').filter(Boolean); return t.length ? t[0] : n; };
const esc = v => { v = (v == null) ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

(async () => {
  const lines = fs.readFileSync(IN, 'utf8').replace(/\r/g, '').split('\n').filter(l => l.length);
  const rows = lines.slice(1).map(line => { const c = line.split(','); return { honour_type: c[0], season: c[1], league: c[2], team: c[3], player_name: c[4], goals: c[5], context: c.slice(6).join(',') }; });
  console.error('CSV data rows: ' + rows.length);
  const { error: gErr } = await sb.from('honours').select('goals').limit(1);
  console.error('honours.goals column: ' + (gErr ? 'MISSING' : 'exists'));

  let players = [], from = 0;
  while (true) { const { data, error } = await sb.from('players').select('api_player_id, name, full_name').range(from, from + 999); if (error) { console.error('players err ' + error.message); break; } players = players.concat(data || []); if (!data || data.length < 1000) break; from += 1000; }
  console.error('players loaded: ' + players.length);
  const exactIdx = new Map(), surnameBucket = new Map(), firstBucket = new Map();
  const addExact = (k, id) => { if (!k) return; if (!exactIdx.has(k)) exactIdx.set(k, new Set()); exactIdx.get(k).add(id); };
  const addBucket = (m, k, e) => { if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  players.forEach(p => {
    const forms = [norm(p.name), norm(p.full_name)].filter(Boolean);
    const tokenSet = new Set(); forms.forEach(f => f.split(' ').forEach(t => tokenSet.add(t)));
    const e = { id: p.api_player_id, tokenSet };
    forms.forEach(f => { addExact(f, p.api_player_id); });
    [...new Set(forms.map(lastTok))].forEach(l => addBucket(surnameBucket, l, e));
    [...new Set(forms.map(firstTok))].forEach(l => addBucket(firstBucket, l, e));
  });

  function resolve(name) {
    const q = norm(name); if (!q) return { status: 'empty' };
    const qtoks = q.split(' ').filter(Boolean), qset = new Set(qtoks);
    const qlast = qtoks[qtoks.length - 1], qfirst = qtoks[0], qinit = qfirst[0];
    if (exactIdx.has(q)) { const ids = [...exactIdx.get(q)]; return ids.length === 1 ? { status: 'ok', id: ids[0] } : { status: 'multi', ids }; }
    let pool = (surnameBucket.get(qlast) || []); if (qtoks.length === 1) pool = pool.concat(firstBucket.get(qlast) || []);
    let hits = [...new Set(pool.filter(e => [...qset].every(t => e.tokenSet.has(t))).map(e => e.id))];
    if (hits.length === 0 && qtoks.length >= 2)
      hits = [...new Set((surnameBucket.get(qlast) || []).filter(e => e.tokenSet.has(qlast) && (e.tokenSet.has(qfirst) || e.tokenSet.has(qinit))).map(e => e.id))];
    if (hits.length === 0) return { status: 'unresolved' };
    if (hits.length === 1) return { status: 'ok', id: hits[0] };
    return { status: 'multi', ids: hits };
  }

  const prepared = [], skipped = [], tieTeamMismatch = [];
  const champUclTeams = new Set(), candidateIds = new Set();
  for (const r of rows) {
    const ht = r.honour_type;
    const season_year = parseInt((r.season || '').slice(0, 4), 10);
    const league_code = r.league ? (LEAGUE_MAP[r.league.trim()] || ('??' + r.league)) : '';
    const rawTeam = (r.team || '').trim(), rawPlayer = (r.player_name || '').trim();
    const context = (r.context || '').trim(), goals = (r.goals || '').trim();
    if (!rawTeam && !rawPlayer) { skipped.push({ ht, season: r.season, league: r.league, context }); continue; }
    const players_ = rawPlayer.includes('/') ? rawPlayer.split('/').map(s => s.trim()).filter(Boolean) : (rawPlayer ? [rawPlayer] : ['']);
    const teams_ = rawTeam.includes('/') ? rawTeam.split('/').map(s => s.trim()).filter(Boolean) : [rawTeam];
    if (players_.length > 1 && teams_.length > 1 && players_.length !== teams_.length) tieTeamMismatch.push({ ht, season: r.season, players: players_, teams: teams_ });
    for (let i = 0; i < players_.length; i++) {
      const pn = players_[i];
      const okey = norm(pn) + '|' + season_year + '|' + ht;
      let team = mapTeam(teams_.length > 1 ? (teams_[i] || '') : teams_[0]);
      if (TEAM_OVERRIDE[okey]) team = TEAM_OVERRIDE[okey];
      let res = { status: 'na' };
      if ((ht === 'ballon_dor' || ht === 'golden_boot') && pn) {
        if (API_OVERRIDE[okey] != null) res = { status: 'ok', id: API_OVERRIDE[okey], forced: true };
        else { res = resolve(pn); if (res.ids) res.ids.forEach(id => candidateIds.add(id)); if (res.id) candidateIds.add(res.id); }
      }
      if ((ht === 'league_champion' || ht === 'ucl_winner') && team) champUclTeams.add(team);
      prepared.push({ honour_type: ht, season_year, league_code, team_name: team || '', player_name: pn || '', goals: (ht === 'golden_boot' ? goals : ''), honour_context: context, source: 'wikipedia_ccc', _res: res });
    }
  }

  const idList = [...candidateIds]; const idTeams = new Map(), idCards = new Map();
  for (let i = 0; i < idList.length; i += 60) {
    const { data, error } = await sb.from('player_card_view').select('api_player_id, season_year, team_name').in('api_player_id', idList.slice(i, i + 60)).range(0, 999);
    if (error) { console.error('pcv err ' + error.message); break; }
    (data || []).forEach(c => { if (!idTeams.has(c.api_player_id)) { idTeams.set(c.api_player_id, new Set()); idCards.set(c.api_player_id, new Set()); } idTeams.get(c.api_player_id).add(c.team_name); idCards.get(c.api_player_id).add(c.season_year + '|' + c.team_name); });
  }

  const unresolved = [], stillAmbig = [], collisionVerify = [];
  for (const p of prepared) {
    const res = p._res; p.api_player_id = '';
    if (res.status === 'ok') {
      p.api_player_id = res.id;
      if (!res.forced && p.honour_type === 'golden_boot' && p.team_name && idTeams.has(res.id) && !idTeams.get(res.id).has(p.team_name)) collisionVerify.push({ pn: p.player_name, season: p.season_year, team: p.team_name, id: res.id });
    } else if (res.status === 'multi') {
      const match = res.ids.filter(id => idCards.get(id) && idCards.get(id).has(p.season_year + '|' + p.team_name));
      if (match.length === 1) p.api_player_id = match[0];
      else stillAmbig.push({ pn: p.player_name, ht: p.honour_type, season: p.season_year, team: p.team_name, ids: res.ids });
    } else if (res.status === 'unresolved') unresolved.push({ pn: p.player_name, ht: p.honour_type, season: p.season_year });
    delete p._res;
  }

  const unmatchedTeams = [];
  for (const t of [...champUclTeams].sort()) { const { count } = await sb.from('player_card_view').select('team_name', { count: 'exact', head: true }).eq('team_name', t); if (!count) unmatchedTeams.push(t); }

  const cols = ['honour_type', 'season_year', 'league_code', 'team_name', 'api_player_id', 'player_name', 'goals', 'honour_context', 'source'];
  fs.writeFileSync(OUT, [cols.join(',')].concat(prepared.map(p => cols.map(c => esc(p[c])).join(','))).join('\n') + '\n');

  const byType = {}; prepared.forEach(p => byType[p.honour_type] = (byType[p.honour_type] || 0) + 1);
  console.error('\n=== (a) UNMATCHED champion/UCL teams ===\n' + (unmatchedTeams.length ? unmatchedTeams.join('\n') : '  none'));
  console.error('\n=== (b) UNRESOLVED players (write name, api NULL): ' + unresolved.length + ' ===');
  unresolved.forEach(u => console.error('  ' + u.pn + '  [' + u.ht + ' ' + u.season + ']'));
  if (stillAmbig.length) { console.error('  --- STILL AMBIGUOUS after cross-check (api NULL): ' + stillAmbig.length + ' ---'); stillAmbig.forEach(a => console.error('  ' + a.pn + ' [' + a.ht + ' ' + a.season + ' ' + a.team + '] cands ' + a.ids.join('/'))); }
  if (collisionVerify.length) { console.error('  --- RESOLVED but no card at listed club (VERIFY same-name collision): ' + collisionVerify.length + ' ---'); collisionVerify.forEach(c => console.error('  ' + c.pn + ' [gb ' + c.season + ' ' + c.team + '] -> api ' + c.id)); }
  console.error('\n=== (c) SKIPPED (no team AND no player): ' + skipped.length + ' ===');
  skipped.forEach(s => console.error('  ' + s.ht + ' ' + s.season + ' ' + (s.league || '') + '  ("' + s.context + '")'));
  console.error('\n=== tie team/player count mismatch (eyeball) ===\n' + (tieTeamMismatch.length ? tieTeamMismatch.map(t => '  ' + t.ht + ' ' + t.season + ': players[' + t.players.join(', ') + '] vs teams[' + t.teams.join(', ') + ']').join('\n') : '  none'));
  console.error('\n=== (d) FINAL ROW COUNT TO WRITE: ' + prepared.length + ' ===');
  console.error('  by type: ' + JSON.stringify(byType));
  const pr = prepared.filter(p => p.honour_type === 'ballon_dor' || p.honour_type === 'golden_boot');
  console.error('  player rows: ' + pr.length + '  | api resolved: ' + pr.filter(p => p.api_player_id !== '').length + '  | api NULL: ' + pr.filter(p => p.api_player_id === '').length);
})();
