// WRITE the 169 HIGH position classifications to player_positions (guarded), then refresh + spot-check.
//  - INSERT (no pp row): upsert ON CONFLICT DO NOTHING; position set, shirt_number NULL.
//  - UPDATE (row exists & assigned != current): .update guarded by .eq('position','CM') so it can
//    ONLY ever touch a bug row. Skips the CM->CM no-ops automatically (assigned == current).
//  - Position only; no assists; no shirt on updates.
//  RUN (repo root): NODE_PATH=./node_modules node write_positions.js positions_HIGH.csv
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const IN = process.argv[2];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else { if (c === '"') q = true; else if (c === ',') { cells.push(cur); cur = ''; } else cur += c; }
    }
    cells.push(cur);
    const o = {}; head.forEach((h, i) => o[h] = cells[i]); return o;
  });
}

(async () => {
  const rows = parseCSV(fs.readFileSync(IN, 'utf8'));

  // re-derive existing state at write-time (source of truth), partition INSERT / UPDATE / skip
  const ids = [...new Set(rows.map(r => Number(r.api_player_id)))];
  const existing = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const batch = ids.slice(i, i + 80);
    let from = 0;
    while (true) {
      const { data, error } = await sb.from('player_positions')
        .select('api_player_id, season_year, league_code, position').in('api_player_id', batch).range(from, from + 999);
      if (error) { console.error('read err', error.message); process.exit(1); }
      (data || []).forEach(d => existing.set(d.api_player_id + '|' + d.season_year + '|' + d.league_code, d.position));
      if (!data || data.length < 1000) break; from += 1000;
    }
  }
  const inserts = [], updates = [];
  for (const r of rows) {
    const key = r.api_player_id + '|' + r.season_year + '|' + r.league_code;
    if (!existing.has(key)) {
      inserts.push({ api_player_id: Number(r.api_player_id), season_year: Number(r.season_year), league_code: r.league_code, position: r.assigned_position, shirt_number: null });
    } else if (existing.get(key) !== r.assigned_position) {
      updates.push({ api_player_id: Number(r.api_player_id), season_year: Number(r.season_year), league_code: r.league_code, position: r.assigned_position });
    } // else CM->CM no-op: skip
  }
  console.error('planned  INSERT=' + inserts.length + '  UPDATE=' + updates.length + '  (skipped no-ops=' + (rows.length - inserts.length - updates.length) + ')');

  // 1. INSERTs (guarded: ignoreDuplicates = ON CONFLICT DO NOTHING). .select() returns only inserted rows.
  const { data: insData, error: insErr } = await sb.from('player_positions')
    .upsert(inserts, { onConflict: 'api_player_id,season_year,league_code', ignoreDuplicates: true })
    .select('api_player_id');
  if (insErr) { console.error('INSERT ERROR:', insErr.message); process.exit(1); }
  console.error('INSERTs done: ' + (insData ? insData.length : 0) + ' rows actually inserted');

  // 2. UPDATEs (guarded by .eq('position','CM')). Count via .select().
  let updDone = 0;
  for (const u of updates) {
    const { data, error } = await sb.from('player_positions')
      .update({ position: u.position })
      .eq('api_player_id', u.api_player_id).eq('season_year', u.season_year).eq('league_code', u.league_code)
      .eq('position', 'CM')            // belt-and-braces: only ever touch a CM bug row
      .select('api_player_id');
    if (error) { console.error('UPDATE ERROR', u, error.message); process.exit(1); }
    updDone += (data ? data.length : 0);
  }
  console.error('UPDATEs done: ' + updDone + ' rows actually updated');

  // 3. refresh matview (try RPC; report if unavailable)
  let refreshed = false;
  for (const fn of ['refresh_player_card_mv', 'refresh_matview', 'refresh_player_card']) {
    const { error } = await sb.rpc(fn);
    if (!error) { console.error('matview refreshed via rpc ' + fn + '()'); refreshed = true; break; }
  }
  if (!refreshed) console.error('NOTE: no refresh RPC found - matview NOT refreshed from here (paste `REFRESH MATERIALIZED VIEW player_card_mv;` in Supabase SQL editor)');

  // 4. spot-check from player_card_view (live engine, reflects writes immediately)
  const spotIds = [629, 306, 302, 1640, 6009]; // KDB, Salah, Firmino, Çalhanoğlu, J.Álvarez
  const { data: sc, error: scErr } = await sb.from('player_card_view')
    .select('api_player_id, player_name, team_name, season, position_pool, position, rt')
    .in('api_player_id', spotIds).order('api_player_id').order('season');
  if (scErr) { console.error('spot err', scErr.message); process.exit(1); }
  console.error('\n=== SPOT-CHECK (player_card_view live) ===');
  const want = new Set(['629|2020', '629|2023', '306|2025', '306|2015', '302|2015', '1640|2023', '1640|2021', '1640|2025', '6009|2023']);
  sc.filter(r => want.has(r.api_player_id + '|' + r.season.slice(0, 2).padStart(0) )); // fallthrough; print all affected below
  sc.forEach(r => {
    console.error('  ' + String(r.player_name).padEnd(18) + ' ' + String(r.team_name).padEnd(18) + ' ' + r.season + '  pool=' + String(r.position_pool).padEnd(7) + ' pos=' + String(r.position).padEnd(7) + ' rt=' + r.rt);
  });
})();
