// READ-ONLY dry-run: resolve POTS players -> api_player_id (tiered, same as Tier 1),
// disambiguate/sanity-check via league+season card existence. Stages pots_prepared.csv. NO writes.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2], OUT = process.argv[3];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const LEAGUE_MAP = { 'Premier League': 'PL', 'La Liga': 'LL', 'Serie A': 'SA', 'Bundesliga': 'BL', 'Ligue 1': 'L1', 'Primeira Liga': 'PRT', 'Eredivisie': 'ERE' };
// hand-verified overrides (key = normPlayer|league_code|season_year)
const API_OVERRIDE = { 'otavio|PRT|2022': 380, 'karim el ahmadi|ERE|2016': 2713 };
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/ß/g, 'ss').replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/[đð]/g, 'd').replace(/ı/g, 'i').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/þ/g, 'th')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const lastTok = n => { const t = n.split(' ').filter(Boolean); return t.length ? t[t.length - 1] : n; };
const firstTok = n => { const t = n.split(' ').filter(Boolean); return t.length ? t[0] : n; };
const esc = v => { v = (v == null) ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };

(async () => {
  const lines = fs.readFileSync(IN, 'utf8').replace(/\r/g, '').split('\n').filter(l => l.length);
  const rows = lines.slice(1).map(line => { const c = line.split(','); return { honour_type: c[0], season: c[1], league: c[2], player_name: c[3], award_name: c[4], context: c.slice(5).join(',') }; });
  console.error('CSV data rows: ' + rows.length);

  let players = [], from = 0;
  while (true) { const { data, error } = await sb.from('players').select('api_player_id, name, full_name').range(from, from + 999); if (error) { console.error('players err ' + error.message); break; } players = players.concat(data || []); if (!data || data.length < 1000) break; from += 1000; }
  const exactIdx = new Map(), surnameBucket = new Map(), firstBucket = new Map();
  const addExact = (k, id) => { if (!k) return; if (!exactIdx.has(k)) exactIdx.set(k, new Set()); exactIdx.get(k).add(id); };
  const addB = (m, k, e) => { if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  players.forEach(p => { const forms = [norm(p.name), norm(p.full_name)].filter(Boolean); const tokenSet = new Set(); forms.forEach(f => f.split(' ').forEach(t => tokenSet.add(t))); const e = { id: p.api_player_id, tokenSet }; forms.forEach(f => addExact(f, p.api_player_id)); [...new Set(forms.map(lastTok))].forEach(l => addB(surnameBucket, l, e)); [...new Set(forms.map(firstTok))].forEach(l => addB(firstBucket, l, e)); });
  console.error('players loaded: ' + players.length);

  function resolve(name) {
    const q = norm(name); if (!q) return { status: 'empty' };
    const qtoks = q.split(' ').filter(Boolean), qset = new Set(qtoks), qlast = qtoks[qtoks.length - 1], qfirst = qtoks[0], qinit = qfirst[0];
    if (exactIdx.has(q)) { const ids = [...exactIdx.get(q)]; return ids.length === 1 ? { status: 'ok', id: ids[0] } : { status: 'multi', ids }; }
    let pool = (surnameBucket.get(qlast) || []); if (qtoks.length === 1) pool = pool.concat(firstBucket.get(qlast) || []);
    let hits = [...new Set(pool.filter(e => [...qset].every(t => e.tokenSet.has(t))).map(e => e.id))];
    if (hits.length === 0 && qtoks.length >= 2) hits = [...new Set((surnameBucket.get(qlast) || []).filter(e => e.tokenSet.has(qlast) && (e.tokenSet.has(qfirst) || e.tokenSet.has(qinit))).map(e => e.id))];
    if (hits.length === 0) return { status: 'unresolved' };
    if (hits.length === 1) return { status: 'ok', id: hits[0] };
    return { status: 'multi', ids: hits };
  }

  const prepared = [], candidateIds = new Set();
  for (const r of rows) {
    const season_year = parseInt((r.season || '').slice(0, 4), 10);
    const league_code = LEAGUE_MAP[r.league.trim()] || ('??' + r.league);
    const okey = norm(r.player_name) + '|' + league_code + '|' + season_year;
    const res = API_OVERRIDE[okey] != null ? { status: 'ok', id: API_OVERRIDE[okey], forced: true } : resolve(r.player_name);
    if (res.ids) res.ids.forEach(id => candidateIds.add(id)); if (res.id) candidateIds.add(res.id);
    const honour_context = r.context ? (r.award_name + ' , ' + r.context) : r.award_name;
    prepared.push({ honour_type: 'player_of_season', season_year, league_code, api_player_id: '', player_name: r.player_name, honour_context, source: 'wikipedia_ccc', _res: res });
  }

  // fetch candidate cards (league_code, season_year) for disambiguation + sanity
  const idList = [...candidateIds]; const idLS = new Map();
  for (let i = 0; i < idList.length; i += 60) { const { data, error } = await sb.from('player_card_view').select('api_player_id, season_year, league_code').in('api_player_id', idList.slice(i, i + 60)).range(0, 999); if (error) { console.error('pcv err ' + error.message); break; } (data || []).forEach(c => { if (!idLS.has(c.api_player_id)) idLS.set(c.api_player_id, new Set()); idLS.get(c.api_player_id).add(c.league_code + '|' + c.season_year); }); }

  const unresolved = [], stillAmbig = [], sanityVerify = [];
  for (const p of prepared) {
    const res = p._res; const lsKey = p.league_code + '|' + p.season_year;
    if (res.status === 'ok') { p.api_player_id = res.id; if (!res.forced && idLS.has(res.id) && !idLS.get(res.id).has(lsKey)) sanityVerify.push({ pn: p.player_name, ls: lsKey, id: res.id }); }
    else if (res.status === 'multi') { const m = res.ids.filter(id => idLS.get(id) && idLS.get(id).has(lsKey)); if (m.length === 1) p.api_player_id = m[0]; else stillAmbig.push({ pn: p.player_name, ls: lsKey, ids: res.ids }); }
    else if (res.status === 'unresolved') unresolved.push({ pn: p.player_name, ls: lsKey });
    delete p._res;
  }

  const cols = ['honour_type', 'season_year', 'league_code', 'api_player_id', 'player_name', 'honour_context', 'source'];
  fs.writeFileSync(OUT, [cols.join(',')].concat(prepared.map(p => cols.map(c => esc(p[c])).join(','))).join('\n') + '\n');

  // ---- report ----
  console.error('\n=== (a) ROW COUNT TO WRITE: ' + prepared.length + ' ===');
  const resolvedN = prepared.filter(p => p.api_player_id !== '').length;
  console.error('  api resolved: ' + resolvedN + ' / ' + prepared.length + '  | api NULL: ' + (prepared.length - resolvedN));
  console.error('\n=== (b) UNRESOLVED players (write name, api NULL): ' + unresolved.length + ' ===');
  unresolved.forEach(u => console.error('  ' + u.pn + '  [' + u.ls + ']'));
  if (stillAmbig.length) { console.error('  --- STILL AMBIGUOUS (api NULL): ' + stillAmbig.length + ' ---'); stillAmbig.forEach(a => console.error('  ' + a.pn + ' [' + a.ls + '] cands ' + a.ids.join('/'))); }
  if (sanityVerify.length) { console.error('  --- RESOLVED but no card in that league-season (VERIFY): ' + sanityVerify.length + ' ---'); sanityVerify.forEach(s => console.error('  ' + s.pn + ' [' + s.ls + '] -> api ' + s.id)); }

  console.error('\n=== (c) SPOT-CHECKS ===');
  const messi = prepared.filter(p => p.league_code === 'LL' && /messi/i.test(p.player_name));
  console.error('  Messi La Liga POTS: ' + messi.length + ' rows -> seasons ' + messi.map(p => p.season_year).sort().join(', '));
  const mbappe = prepared.filter(p => p.league_code === 'L1' && /mbapp/i.test(p.player_name));
  console.error('  Mbappé Ligue 1 POTS: ' + mbappe.length + ' rows -> seasons ' + mbappe.map(p => p.season_year).sort().join(', ') + '  (api ' + [...new Set(mbappe.map(p => p.api_player_id))].join(',') + ')');
  const kroos = prepared.filter(p => /kroos/i.test(p.player_name));
  const bl1718 = prepared.filter(p => p.league_code === 'BL' && p.season_year === 2017);
  console.error('  Kroos rows anywhere: ' + kroos.length + '  | Bundesliga 2017/18 rows: ' + bl1718.length + '  (both should be 0 , Kroos excluded)');
  console.error('\n  prepared -> ' + OUT);
})();
