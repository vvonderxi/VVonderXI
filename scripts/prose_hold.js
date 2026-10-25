#!/usr/bin/env node
/*  HOLD ONE PAIR OR ONE CARD'S PROSE IN SECONDS, NO DEPLOY (2026-10-25, the kill switch's small half).
 *
 *    node scripts/prose_hold.js 141117-158702          hold a comparison (pair key: lower card id, dash, higher)
 *    node scripts/prose_hold.js card 130728            hold a card's notes
 *    node scripts/prose_hold.js 141117-158702 --release   or  card 130728 --release   (deletes the row: next view regenerates)
 *
 *  It rewrites the cache row the endpoint reads, keeping its stamps (rt_a, rt_b, cache_version, stats_hash), so
 *  the next request finds a fresh row that says held and answers the page's held shape (Compare) or { off: true }
 *  (the card) without calling the model. Takes effect on the next request. A pair that has never generated has no
 *  row and nothing to hold. The large half of the kill switch is the environment: remove VV_PROSE from Production
 *  and redeploy (docs/PROSE_CASE_2026-10-24.md, "OPERATIONS").
 *  THE PERMANENT HOLD is HELD_PAIRS in api/analyse.js, which survives regeneration and a changed version.  */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const args = process.argv.slice(2), release = args.includes('--release'), isCard = args[0] === 'card';
const key = isCard ? Number(args[1]) : args[0];
if (!key || (isCard && !Number.isFinite(key)) || (!isCard && !/^\d+-\d+$/.test(key))) { console.error('usage: prose_hold.js <lo-hi> | card <id>  [--release]'); process.exit(2); }
(async () => {
  const table = isCard ? 'notes_cache' : 'verdict_cache', col = isCard ? 'card_id' : 'pair_key', field = isCard ? 'notes' : 'verdict';
  if (release) { const r = await sb.from(table).delete().eq(col, key).select(col); if (r.error) throw new Error(r.error.message); console.log(`${table}: ${r.data.length} row(s) deleted for ${key}; the next view regenerates`); return; }
  const { data: row, error } = await sb.from(table).select('*').eq(col, key).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) { console.log(`${table}: no row for ${key}: it has never generated, so there is nothing to hold (HELD_PAIRS in api/analyse.js is the permanent hold)`); return; }
  const held = { _held: true, _noprose: true, why: 'held by the owner', at: new Date().toISOString(), was: row[field] };
  const r = await sb.from(table).upsert(Object.assign({}, row, { [field]: held }), { onConflict: col, ignoreDuplicates: false });
  if (r.error) throw new Error(r.error.message);
  console.log(`${table}: ${key} held; the next request answers ${isCard ? '{ off: true }' : 'the held shape'} without a model call. Release with --release.`);
})().catch(e => { console.error('prose_hold failed:', e.message); process.exit(1); });
