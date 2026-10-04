// WRITE batch-3: 34 CCC-verified REVIEW cards.
//   POSITIONS (34) -> player_positions (guarded: INSERT if no row / UPDATE where position IN coarse+CM)
//   [MOVED OUT 2026-09-12] The 28 CCC assist values this script used to write now live in
//     `write_assists_ccc.js`, with their provenance. An rt-touching write must not hide inside a
//     job named for positions. See DATA_DEFECTS.md, "A POSITIONS SCRIPT SILENTLY WRITES assists".
//     (That set excluded the 6 goals-mismatch cards: Vanaken x5 + Mboyo -> position only.)
//   append all 34 positions to known_players.csv (source='ccc'); attempt matview refresh
//   RUN (repo root): NODE_PATH=./node_modules node write_positions3.js
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const SCRATCH = '/tmp/claude-1000/-home-odoo-projects-VVonderXI/5497b4bb-5d1d-4117-b9fa-581fa2dd40e6/scratchpad';
const REVIEW = SCRATCH + '/positions_REVIEW.csv';
const DICT = SCRATCH + '/known_players.csv';
const CLASSIFIED_DATE = '2026-07-04';
const SOURCE = 'ccc';
const GUARD = ['DEF', 'MID', 'FWD', 'GK', 'UNK', 'CM'];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ASSIGN = {
  172746:'CAM',172351:'CAM',169346:'CAM',169768:'CAM',174592:'ST',168807:'ST',156662:'ST',
  180202:'ST',180524:'ST',181398:'Winger',179772:'ST',169343:'CAM',170986:'CAM',170205:'Winger',
  172521:'CM',182248:'Winger',184247:'CAM',169280:'Winger',173082:'ST',161304:'Winger',163158:'CAM',
  174565:'ST',166668:'Winger',167554:'CAM',167555:'FB',175513:'CAM',175841:'CAM',176219:'CAM',
  176597:'CAM',177013:'CAM',180654:'CAM',183949:'CAM',163392:'Winger',160409:'Winger'
};
function parseCSV(text) {
  const lines = text.trim().split('\n'); const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) { const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else { if (c === '"') q = true; else if (c === ',') { cells.push(cur); cur = ''; } else cur += c; } }
    cells.push(cur); const o = {}; head.forEach((h, i) => o[h] = cells[i]); return o; });
}

(async () => {
  const rev = parseCSV(fs.readFileSync(REVIEW, 'utf8'));
  const byId = new Map(rev.map(r => [Number(r.card_id), r]));
  const targets = []; const unresolved = [];
  for (const cid of Object.keys(ASSIGN).map(Number)) {
    const r = byId.get(cid);
    if (!r) { unresolved.push(cid); continue; }
    targets.push({ cid, api: Number(r.api_player_id), sy: Number(r.season_year), lc: r.league_code, pos: ASSIGN[cid], name: r.player_name, season: r.season });
  }
  console.error('positions to write: ' + targets.length + (unresolved.length ? '  UNRESOLVED: ' + unresolved.join(',') : ''));
  if (unresolved.length) process.exit(1);

  // ---- POSITIONS (player_positions, guarded) ----
  const ids = [...new Set(targets.map(t => t.api))];
  const existing = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const { data, error } = await sb.from('player_positions')
      .select('api_player_id, season_year, league_code, position').in('api_player_id', ids.slice(i, i + 80)).range(0, 999);
    if (error) { console.error('pp read err', error.message); process.exit(1); }
    (data || []).forEach(d => existing.set(d.api_player_id + '|' + d.season_year + '|' + d.league_code, d.position));
  }
  const inserts = [], updates = [], noops = [], blocked = [];
  for (const t of targets) {
    const key = t.api + '|' + t.sy + '|' + t.lc;
    if (!existing.has(key)) inserts.push(t);
    else { const cur = existing.get(key);
      if (cur === t.pos) noops.push({ t, cur });
      else if (GUARD.includes(cur)) updates.push(t);
      else blocked.push({ t, cur }); }
  }
  console.error('POSITIONS  INSERT=' + inserts.length + '  UPDATE=' + updates.length + '  no-op=' + noops.length + '  blocked=' + blocked.length);
  if (blocked.length) blocked.forEach(b => console.error('  BLOCKED ' + b.t.cid + ' ' + b.t.name + ' ' + b.cur + '->' + b.t.pos + ' (guard skipped, NOT written)'));

  const insRows = inserts.map(t => ({ api_player_id: t.api, season_year: t.sy, league_code: t.lc, position: t.pos, shirt_number: null }));
  let insDone = 0;
  if (insRows.length) {
    const { data, error } = await sb.from('player_positions').upsert(insRows, { onConflict: 'api_player_id,season_year,league_code', ignoreDuplicates: true }).select('api_player_id');
    if (error) { console.error('INSERT ERROR:', error.message); process.exit(1); } insDone = data ? data.length : 0;
  }
  let updDone = 0;
  for (const u of updates) {
    const { data, error } = await sb.from('player_positions').update({ position: u.pos })
      .eq('api_player_id', u.api).eq('season_year', u.sy).eq('league_code', u.lc).in('position', GUARD).select('api_player_id');
    if (error) { console.error('UPDATE ERROR', u.cid, error.message); process.exit(1); } updDone += (data ? data.length : 0);
  }
  console.error('POSITIONS written: INSERT ' + insDone + ' / UPDATE ' + updDone);

  /*  ASSISTS ARE NO LONGER WRITTEN HERE (moved 2026-09-12 to write_assists_ccc.js).
      THIS SCRIPT WRITES POSITIONS AND THE DICTIONARY, NOTHING THAT FEEDS rt DIRECTLY.
      Do not add a scoring-field write back into this file. */

  // ---- dictionary append (all 34 positions, source=ccc) ----
  const existingDict = new Set();
  fs.readFileSync(DICT, 'utf8').trim().split('\n').slice(1).forEach(l => { const c = l.split(','); existingDict.add(c[0] + '|' + c[1]); });
  const before = existingDict.size; const appendRows = []; const written = new Set(); const skipped = [];
  for (const t of targets) { const k = t.api + '|' + t.sy;
    if (existingDict.has(k) || written.has(k)) { skipped.push(k + '(' + t.name + ')'); continue; }
    written.add(k); appendRows.push([t.api, t.sy, t.pos, SOURCE, CLASSIFIED_DATE].join(',')); }
  if (appendRows.length) fs.appendFileSync(DICT, appendRows.join('\n') + '\n');
  console.error('\nknown_players.csv: ' + before + ' -> ' + (before + appendRows.length) + ' (+' + appendRows.length + ', source=ccc)');
  if (skipped.length) console.error('  dict skipped (already present): ' + skipped.join(', '));

  /*  ---- matview refresh, OWNED BY THIS SCRIPT ----
      Explicit since the assists half was split out: write_assists_ccc.js owns ITS refresh and
      this one owns this. Neither may assume the other ran. A position write moves position_pool,
      which moves the percentile pools, so this refresh is owed whenever anything above wrote. */
  let refreshed = false;
  for (const fn of ['refresh_player_card_mv', 'refresh_matview', 'refresh_player_card']) {
    const { error } = await sb.rpc(fn); if (!error) { console.error('matview refreshed via ' + fn + '()'); refreshed = true; break; }
  }
  if (!refreshed) console.error('\nMATVIEW REFRESH: no RPC -> paste in Supabase SQL editor:  REFRESH MATERIALIZED VIEW player_card_mv;');
})();
