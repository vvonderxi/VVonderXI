#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  VVonderXI — Seed Supabase from index.html `var DB`  (NO external API)
//
//  Source of truth = the same `var DB` array the live frontend renders.
//    index.html  →  players (all)  +  player_season_cards (year-keyed only)
//
//  SAFE:      upsert — re-running never duplicates (idempotent)
//  FAST:      local transform + batched writes (seconds)
//  STABLE ID: synthetic negative api_player_id from name hash
//             (negative => never collides with positive BSD ids from live search)
//
//  Year-keyed seasons only (e.g. 1920, 2425) become cards — these are what the
//  frontend reads from Supabase (it filters season.length === 4). Legend keys
//  (peak/legacy/emerge/bonus/2021b) stay served from inline var DB as today.
//
//  RUN:
//    node seed-from-html.js --dry-run    → transform + counts, NO writes
//    node seed-from-html.js              → real write to Supabase
// ══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (!DRY_RUN) {
  if (!SUPABASE_URL) { console.error('SUPABASE_URL not set'); process.exit(1); }
  if (!SUPABASE_KEY) { console.error('SUPABASE_SERVICE_KEY not set'); process.exit(1); }
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

function synthId(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return -(Math.abs(h) % 2000000000) - 1;
}

function mainPosition(seasons) {
  const counts = {};
  for (const s of Object.values(seasons)) if (s.pos) counts[s.pos] = (counts[s.pos] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

// Extract `var DB = [ ... ]` from index.html via bracket matching
function extractDB(html) {
  const start = html.indexOf('var DB = [');
  if (start === -1) throw new Error('`var DB = [` not found in index.html');
  const open = html.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Could not find end of var DB array');
  return JSON.parse(html.slice(open, end + 1));
}

async function batchUpsert(table, rows, conflict, batchSize = 500) {
  let written = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(slice, { onConflict: conflict });
    if (error) throw new Error(`${table} upsert (batch ${i / batchSize + 1}): ${error.message}`);
    written += slice.length;
    console.log(`  ${table}: ${written}/${rows.length}`);
  }
  return written;
}

async function main() {
  console.log('\n=== VVonderXI — Seed Supabase from index.html var DB ===');
  console.log(DRY_RUN ? 'MODE: DRY RUN (no writes)\n' : 'MODE: LIVE WRITE\n');

  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const DB = extractDB(html);
  console.log(`Loaded ${DB.length} players from var DB\n`);

  const playerRows = [];
  const cardRows = [];
  const seenCardKey = new Set();
  const nowIso = new Date().toISOString();
  let skippedLegendCards = 0;

  for (const p of DB) {
    if (!p.name) continue;
    const id = synthId(p.name);
    const seasons = p.seasons || {};

    playerRows.push({
      api_player_id: id,
      name: p.name,
      nationality: p.nat || null,
      position: mainPosition(seasons),
      updated_at: nowIso,
    });

    for (const [sk, s] of Object.entries(seasons)) {
      if (!/^\d{4}$/.test(sk)) { skippedLegendCards++; continue; } // year keys only
      const key = `${id}|${sk}|${s.lg || ''}`;
      if (seenCardKey.has(key)) continue;
      seenCardKey.add(key);

      cardRows.push({
        api_player_id: id,
        season: sk,
        season_year: 2000 + parseInt(sk.slice(0, 2), 10),
        league_code: s.lg || 'OTHER',
        team_name: s.club || '',
        position: s.pos || null,
        age: s.age ?? null,
        goals: s.g ?? 0,
        assists: s.a ?? 0,
        rt: s.rt ?? null,
        rating: null,
        appearances: 0,
        minutes: 0,
      });
    }
  }

  console.log(`Prepared: ${playerRows.length} players, ${cardRows.length} year-keyed cards`);
  console.log(`Skipped (legend/career keys, served from inline HTML): ${skippedLegendCards}\n`);

  if (DRY_RUN) {
    console.log('Sample player row:', JSON.stringify(playerRows[0]));
    console.log('Sample card row:  ', JSON.stringify(cardRows[0]));
    console.log('\nDRY RUN complete — nothing written.');
    return;
  }

  console.log('Writing players...');
  await batchUpsert('players', playerRows, 'api_player_id');
  console.log('\nWriting cards...');
  await batchUpsert('player_season_cards', cardRows, 'api_player_id,season,league_code');

  console.log('\n=== SEED COMPLETE ===');
  console.log(`  Players upserted: ${playerRows.length}`);
  console.log(`  Cards upserted:   ${cardRows.length}`);
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
