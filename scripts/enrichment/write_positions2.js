// WRITE batch-2: 46 CCC/knowledge-classified positions from the REVIEW set -> player_positions (guarded).
//  - keys resolved from positions_REVIEW.csv by card_id
//  - INSERT if no pp row (upsert ON CONFLICT DO NOTHING; position set, shirt NULL)
//  - UPDATE only where current position IN coarse{DEF,MID,FWD,GK,UNK} or 'CM'  (belt-and-braces guard)
//  - position only; no assists
//  - append to known_players.csv (source='knowledge'); then attempt matview refresh
//  RUN (repo root): NODE_PATH=./node_modules node write_positions2.js
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const SCRATCH = '/tmp/claude-1000/-home-odoo-projects-VVonderXI/5497b4bb-5d1d-4117-b9fa-581fa2dd40e6/scratchpad';
const REVIEW = SCRATCH + '/positions_REVIEW.csv';
const DICT = SCRATCH + '/known_players.csv';
const CLASSIFIED_DATE = '2026-07-04';
const SOURCE = 'knowledge';
const GUARD = ['DEF', 'MID', 'FWD', 'GK', 'UNK', 'CM']; // only overwrite these
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// card_id -> assigned position (the 46, verbatim)
const ASSIGN = {
  175638:'Winger',151948:'CAM',138914:'CM',173247:'CAM',152401:'CAM',180554:'Winger',
  134223:'CM',144788:'CM',174611:'ST',154210:'CAM',165230:'Winger',134439:'CM',
  130481:'CAM',160594:'Winger',169868:'CM',153472:'CM',141996:'CAM',179575:'ST',
  149724:'ST',179912:'ST',175077:'Winger',135891:'CM',137012:'CM',167208:'CAM',
  181739:'ST',134764:'CAM',138045:'CAM',141576:'CAM',145980:'CAM',146936:'CAM',
  140668:'CAM',142772:'CM',151298:'CAM',151953:'Winger',152996:'Winger',165196:'CAM',
  181717:'CAM',133946:'CAM',158503:'Winger',158595:'ST',141118:'CAM',163394:'Winger',
  135213:'Winger',185070:'Winger',144577:'Winger',170212:'CAM'
};

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
  // resolve keys from positions_REVIEW.csv
  const rev = parseCSV(fs.readFileSync(REVIEW, 'utf8'));
  const byId = new Map(rev.map(r => [Number(r.card_id), r]));
  const targets = [];
  const unresolved = [];
  for (const cid of Object.keys(ASSIGN).map(Number)) {
    const r = byId.get(cid);
    if (!r) { unresolved.push(cid); continue; }
    targets.push({ cid, api: Number(r.api_player_id), sy: Number(r.season_year), lc: r.league_code, pos: ASSIGN[cid], name: r.player_name, season: r.season });
  }
  console.error('assign entries: ' + Object.keys(ASSIGN).length + '   resolved: ' + targets.length);
  if (unresolved.length) { console.error('UNRESOLVED card_ids (not in REVIEW csv): ' + unresolved.join(',')); process.exit(1); }

  // fetch live existing pp rows
  const ids = [...new Set(targets.map(t => t.api))];
  const existing = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const { data, error } = await sb.from('player_positions')
      .select('api_player_id, season_year, league_code, position').in('api_player_id', ids.slice(i, i + 80)).range(0, 999);
    if (error) { console.error('read err', error.message); process.exit(1); }
    (data || []).forEach(d => existing.set(d.api_player_id + '|' + d.season_year + '|' + d.league_code, d.position));
  }

  const inserts = [], updates = [], noops = [], blocked = [];
  for (const t of targets) {
    const key = t.api + '|' + t.sy + '|' + t.lc;
    if (!existing.has(key)) { inserts.push(t); continue; }
    const cur = existing.get(key);
    if (cur === t.pos) { noops.push({ t, cur }); }
    else if (GUARD.includes(cur)) { updates.push(t); }
    else { blocked.push({ t, cur }); }   // existing is a different NON-coarse bucket -> guard blocks; flag it
  }
  console.error('planned  INSERT=' + inserts.length + '  UPDATE=' + updates.length + '  no-op=' + noops.length + '  blocked=' + blocked.length);
  if (blocked.length) { console.error('  BLOCKED (existing non-coarse bucket != assigned, guard skips - eyeball these):'); blocked.forEach(b => console.error('    ' + b.t.cid + ' ' + b.t.name + ' ' + b.t.season + '  ' + b.cur + ' -> ' + b.t.pos + ' (NOT written)')); }
  if (noops.length) noops.forEach(n => console.error('  no-op: ' + n.t.cid + ' ' + n.t.name + ' already ' + n.cur));

  // 1. INSERTs
  const insRows = inserts.map(t => ({ api_player_id: t.api, season_year: t.sy, league_code: t.lc, position: t.pos, shirt_number: null }));
  let insDone = 0;
  if (insRows.length) {
    const { data, error } = await sb.from('player_positions')
      .upsert(insRows, { onConflict: 'api_player_id,season_year,league_code', ignoreDuplicates: true }).select('api_player_id');
    if (error) { console.error('INSERT ERROR:', error.message); process.exit(1); }
    insDone = data ? data.length : 0;
  }
  console.error('INSERTs done: ' + insDone);

  // 2. UPDATEs (guarded position IN coarse+CM)
  let updDone = 0;
  for (const u of updates) {
    const { data, error } = await sb.from('player_positions')
      .update({ position: u.pos })
      .eq('api_player_id', u.api).eq('season_year', u.sy).eq('league_code', u.lc)
      .in('position', GUARD).select('api_player_id');
    if (error) { console.error('UPDATE ERROR', u.cid, error.message); process.exit(1); }
    updDone += (data ? data.length : 0);
  }
  console.error('UPDATEs done: ' + updDone);

  // 3. append to known_players.csv (skip any (api,season) already present)
  const existingDict = new Set();
  fs.readFileSync(DICT, 'utf8').trim().split('\n').slice(1).forEach(l => { const c = l.split(','); existingDict.add(c[0] + '|' + c[1]); });
  const before = existingDict.size;
  const appendRows = [];
  const written = new Set();      // written this pass
  const dictSkipped = [];
  for (const t of [...inserts, ...updates, ...noops.map(n => n.t)]) {   // include DB no-ops: still confirmed classifications
    const k = t.api + '|' + t.sy;
    if (existingDict.has(k) || written.has(k)) { dictSkipped.push(k + ' (' + t.name + ')'); continue; }
    written.add(k);
    appendRows.push([t.api, t.sy, t.pos, SOURCE, CLASSIFIED_DATE].join(','));
  }
  if (appendRows.length) fs.appendFileSync(DICT, appendRows.join('\n') + '\n');
  const after = before + appendRows.length;
  console.error('\nknown_players.csv: ' + before + ' -> ' + after + ' rows (+' + appendRows.length + ', source=' + SOURCE + ')');
  if (dictSkipped.length) console.error('  dict skipped (api|season already present): ' + dictSkipped.join(', '));

  // 4. refresh matview (try RPC)
  let refreshed = false;
  for (const fn of ['refresh_player_card_mv', 'refresh_matview', 'refresh_player_card']) {
    const { error } = await sb.rpc(fn);
    if (!error) { console.error('matview refreshed via rpc ' + fn + '()'); refreshed = true; break; }
  }
  if (!refreshed) console.error('\nMATVIEW REFRESH: no RPC available -> paste in Supabase SQL editor:  REFRESH MATERIALIZED VIEW player_card_mv;');
})();
