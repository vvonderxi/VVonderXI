// READ-ONLY dry-run: World Cup winners. Resolve -> api; WRITE ONLY if the player has a card in our DB.
// Nationality disambiguates same-name candidates. Stages wc_prepared.csv. NO writes.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2], OUT = process.argv[3];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/ß/g, 'ss').replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/[đð]/g, 'd').replace(/ı/g, 'i').replace(/æ/g, 'ae').replace(/œ/g, 'oe').replace(/þ/g, 'th')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const lastTok = n => { const t = n.split(' ').filter(Boolean); return t.length ? t[t.length - 1] : n; };
const firstTok = n => { const t = n.split(' ').filter(Boolean); return t.length ? t[0] : n; };
const esc = v => { v = (v == null) ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
// hand-verified overrides (carded players the surname matcher missed; key = norm(name)|year|country)
const API_OVERRIDE = {
  'iker casillas|2010|Spain': 367, 'carles puyol|2010|Spain': 116880, 'xabi alonso|2010|Spain': 90657,
  'victor valdes|2010|Spain': 90515, 'alvaro arbeloa|2010|Spain': 90521, 'carlos marchena|2010|Spain': 116941,
  'xavi|2010|Spain': 42041, 'javi martinez|2010|Spain': 514
};

(async () => {
  const lines = fs.readFileSync(IN, 'utf8').replace(/\r/g, '').split('\n').filter(l => l.length);
  const rows = lines.slice(1).map(line => { const c = line.split(','); return { honour_type: c[0], year: c[1], country: c[2], player_name: c.slice(3).join(',') }; });
  console.error('CSV data rows: ' + rows.length);

  let players = [], from = 0;
  while (true) { const { data, error } = await sb.from('players').select('api_player_id, name, full_name, nationality').range(from, from + 999); if (error) { console.error('players err ' + error.message); break; } players = players.concat(data || []); if (!data || data.length < 1000) break; from += 1000; }
  const exactIdx = new Map(), surnameBucket = new Map(), firstBucket = new Map(), natOf = new Map();
  const addExact = (k, id) => { if (!k) return; if (!exactIdx.has(k)) exactIdx.set(k, new Set()); exactIdx.get(k).add(id); };
  const addB = (m, k, e) => { if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  players.forEach(p => { natOf.set(p.api_player_id, p.nationality || ''); const forms = [norm(p.name), norm(p.full_name)].filter(Boolean); const tokenSet = new Set(); forms.forEach(f => f.split(' ').forEach(t => tokenSet.add(t))); const e = { id: p.api_player_id, tokenSet }; forms.forEach(f => addExact(f, p.api_player_id)); [...new Set(forms.map(lastTok))].forEach(l => addB(surnameBucket, l, e)); [...new Set(forms.map(firstTok))].forEach(l => addB(firstBucket, l, e)); });
  console.error('players loaded: ' + players.length);

  function resolve(name) {
    const q = norm(name); if (!q) return { ids: [] };
    const qtoks = q.split(' ').filter(Boolean), qset = new Set(qtoks), qlast = qtoks[qtoks.length - 1], qfirst = qtoks[0], qinit = qfirst[0];
    if (exactIdx.has(q)) return { ids: [...exactIdx.get(q)] };
    let pool = (surnameBucket.get(qlast) || []); if (qtoks.length === 1) pool = pool.concat(firstBucket.get(qlast) || []);
    let hits = [...new Set(pool.filter(e => [...qset].every(t => e.tokenSet.has(t))).map(e => e.id))];
    if (hits.length === 0 && qtoks.length >= 2) hits = [...new Set((surnameBucket.get(qlast) || []).filter(e => e.tokenSet.has(qlast) && (e.tokenSet.has(qfirst) || e.tokenSet.has(qinit))).map(e => e.id))];
    return { ids: hits };
  }

  // resolve all, collect candidate ids
  const cand = rows.map(r => ({ r, ids: resolve(r.player_name).ids, ov: API_OVERRIDE[norm(r.player_name) + '|' + r.year + '|' + r.country] }));
  const allIds = [...new Set(cand.flatMap(c => c.ids).concat(cand.map(c => c.ov).filter(x => x != null)))];

  // which candidate ids have >=1 card?
  const carded = new Set();
  for (let i = 0; i < allIds.length; i += 60) { const { data, error } = await sb.from('player_card_view').select('api_player_id').in('api_player_id', allIds.slice(i, i + 60)).range(0, 999); if (error) { console.error('pcv err ' + error.message); break; } (data || []).forEach(c => carded.add(c.api_player_id)); }

  const natEq = (id, country) => norm(natOf.get(id)) === norm(country);
  const prepared = [], skipped = [];
  for (const { r, ids, ov } of cand) {
    if (ov != null) {
      if (carded.has(ov)) prepared.push({ honour_type: 'world_cup_winner', season_year: parseInt(r.year, 10), api_player_id: ov, player_name: r.player_name, honour_context: r.country, source: 'wikipedia_ccc' });
      else skipped.push({ pn: r.player_name, yr: r.year, country: r.country, reason: 'override id ' + ov + ' has NO card (unexpected)' });
      continue;
    }
    const cardedIds = ids.filter(id => carded.has(id));
    let chosen = null, reason = null;
    if (ids.length === 0) reason = 'unresolved (not in players)';
    else if (cardedIds.length === 0) reason = 'resolved but NO card in DB';
    else if (cardedIds.length === 1) chosen = cardedIds[0];
    else { const byNat = cardedIds.filter(id => natEq(id, r.country)); if (byNat.length === 1) chosen = byNat[0]; else reason = 'ambiguous (' + cardedIds.length + ' carded, nat-match ' + byNat.length + ')'; }
    if (chosen != null) prepared.push({ honour_type: 'world_cup_winner', season_year: parseInt(r.year, 10), api_player_id: chosen, player_name: r.player_name, honour_context: r.country, source: 'wikipedia_ccc' });
    else skipped.push({ pn: r.player_name, yr: r.year, country: r.country, reason });
  }

  const cols = ['honour_type', 'season_year', 'api_player_id', 'player_name', 'honour_context', 'source'];
  fs.writeFileSync(OUT, [cols.join(',')].concat(prepared.map(p => cols.map(c => esc(p[c])).join(','))).join('\n') + '\n');

  console.error('\n=== (a) RESOLVED-TO-CARD (write) vs SKIPPED ===');
  console.error('  WRITE: ' + prepared.length + ' / ' + rows.length + '   SKIP: ' + skipped.length);
  const byYr = {}; prepared.forEach(p => byYr[p.season_year] = (byYr[p.season_year] || 0) + 1);
  console.error('  written by tournament: ' + JSON.stringify(byYr));
  console.error('  --- skipped (' + skipped.length + ') ---');
  skipped.forEach(s => console.error('    ' + s.pn.padEnd(24) + ' ' + s.yr + ' ' + s.country + '  , ' + s.reason));

  console.error('\n=== (b) SPOT-CHECKS ===');
  const find = (re, yr) => prepared.filter(p => re.test(p.player_name) && (yr == null || p.season_year === yr)).map(p => p.player_name + ' -> ' + p.season_year + ' ' + p.honour_context + ' (api ' + p.api_player_id + ')');
  console.error('  Messi 2022: ' + (find(/messi/i, 2022).join('; ') || 'NONE'));
  console.error('  Iniesta 2010: ' + (find(/iniesta/i, 2010).join('; ') || 'NONE'));
  console.error('  Xavi 2010: ' + (find(/^xavi$/i, 2010).join('; ') || 'NONE'));
  console.error('  France 2018 sample: ' + prepared.filter(p => p.season_year === 2018).slice(0, 5).map(p => p.player_name + ' (api ' + p.api_player_id + ')').join('; '));
  console.error('\n  prepared -> ' + OUT);
})();
