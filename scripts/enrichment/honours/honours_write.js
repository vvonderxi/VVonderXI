// WRITE prepared honours -> honours table. Aborts if table already populated (avoids dup insert).
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length);
  const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) { const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else { if (c === '"') q = true; else if (c === ',') { cells.push(cur); cur = ''; } else cur += c; } }
    cells.push(cur); const o = {}; head.forEach((h, i) => o[h] = cells[i]); return o; });
}
const s2n = v => (v == null || v === '') ? null : v;           // empty -> null (text)
const s2i = v => (v == null || v === '') ? null : parseInt(v, 10); // empty -> null (int)

(async () => {
  const rows = parseCSV(fs.readFileSync(IN, 'utf8'));
  console.error('prepared rows: ' + rows.length);

  const { count: existing } = await sb.from('honours').select('*', { count: 'exact', head: true });
  if (existing) { console.error('ABORT: honours already has ' + existing + ' rows (not inserting to avoid duplicates).'); process.exit(1); }

  const recs = rows.map(r => ({
    honour_type: r.honour_type, season_year: s2i(r.season_year), league_code: s2n(r.league_code),
    team_name: s2n(r.team_name), api_player_id: s2i(r.api_player_id), player_name: s2n(r.player_name),
    goals: s2i(r.goals), honour_context: s2n(r.honour_context), source: r.source
  }));

  let inserted = 0;
  for (let i = 0; i < recs.length; i += 200) {
    const { data, error } = await sb.from('honours').insert(recs.slice(i, i + 200)).select('id');
    if (error) { console.error('INSERT ERROR at chunk ' + i + ': ' + error.message); process.exit(1); }
    inserted += data.length;
  }
  console.error('INSERTED: ' + inserted);

  // (1) totals by honour_type
  console.error('\n=== (1) rows written by honour_type ===');
  for (const t of ['league_champion', 'ucl_winner', 'ballon_dor', 'golden_boot']) {
    const { count } = await sb.from('honours').select('*', { count: 'exact', head: true }).eq('honour_type', t);
    console.error('  ' + t.padEnd(16) + ' ' + count);
  }
  const { count: total } = await sb.from('honours').select('*', { count: 'exact', head: true });
  console.error('  TOTAL            ' + total);

  // (2) Messi 2011/12 -> ballon_dor + golden_boot, NOT league_champion; LL 2011 champ = Real Madrid
  console.error('\n=== (2) Messi 2011/12 (season_year 2011) ===');
  const { data: messi } = await sb.from('honours').select('honour_type, league_code, team_name, player_name, goals, api_player_id').ilike('player_name', '%messi%').eq('season_year', 2011);
  messi.forEach(m => console.error('  ' + m.honour_type.padEnd(15) + ' ' + (m.league_code || '--') + ' team=' + (m.team_name || '--') + ' player=' + m.player_name + ' goals=' + (m.goals == null ? '-' : m.goals) + ' api=' + m.api_player_id));
  const { data: llChamp } = await sb.from('honours').select('team_name').eq('honour_type', 'league_champion').eq('league_code', 'LL').eq('season_year', 2011);
  console.error('  -> La Liga champion 2011/12 in honours: ' + llChamp.map(x => x.team_name).join(', ') + '  (expect Real Madrid, NOT Barcelona)');

  // (3) Barcelona 2010/11 league champion
  console.error('\n=== (3) Barcelona 2010/11 (season_year 2010) league_champion ===');
  const { data: barca } = await sb.from('honours').select('honour_type, league_code, team_name, season_year, honour_context').eq('honour_type', 'league_champion').eq('team_name', 'Barcelona').eq('season_year', 2010);
  barca.forEach(b => console.error('  ' + b.honour_type + ' ' + b.league_code + ' ' + b.team_name + ' ' + b.season_year + (b.honour_context ? ' ("' + b.honour_context + '")' : '')));
  console.error(barca.length ? '  -> present (correct: Barca won LL 2010/11)' : '  -> MISSING (unexpected)');
})();
