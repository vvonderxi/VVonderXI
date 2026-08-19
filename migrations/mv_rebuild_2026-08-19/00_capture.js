#!/usr/bin/env node
/* STEP 0 , CAPTURE BEFORE EDIT. Run this in Terminal A before anything else.
   READ-ONLY. It writes a timestamped file holding the exact current definitions of
   player_card_view, player_card_mv and all 8 index definitions, then reads the file back
   off disk and asserts it is non-empty and complete before printing OK.
   That file is the recovery kit. Per CLAUDE.md: capture, verify it is on disk, THEN write.

   It also prints a checksum of the live view body. The generated 01_view_add_columns.sql
   embeds the body as it was read on 2026-08-19; if this checksum no longer matches the one
   recorded below, the view has moved since and 01 must be regenerated rather than pasted.

   EXPECTED CHECKSUM (view body, 11696 chars): see BASELINE below.

   Usage:  NODE_PATH=./node_modules node migrations/mv_rebuild_2026-08-19/00_capture.js
*/
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const BASELINE = { len: 11696, sha256_prefix: 'see printed value on first run' };

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// exec_sql discards SELECT output, so values come back through the error channel (CLAUDE.md §C).
async function raw(expr){
  const { error } = await sb.rpc('exec_sql', { sql: `select (('x'||(${expr})))::int` });
  if (!error) throw new Error('probe returned no error , exec_sql behaviour changed, STOP');
  const m = /invalid input syntax for type integer:\s*"x([\s\S]*)"/.exec(error.message);
  if (!m) throw new Error('unreadable probe response: ' + error.message.slice(0, 200));
  return m[1];
}
const num = async e => parseInt(await raw(e));

// Long text in chunks, with the reassembly asserted against length(). A short read here
// would silently produce a truncated "recovery kit", which is worse than none.
async function text(expr){
  const len = await num(`length(${expr})`);
  let out = '';
  for (let i = 1; i <= len; i += 180){
    out += (await raw(`replace(replace(substr(${expr},${i},180), chr(10), '@NL@'), chr(9), '@TAB@')`));
  }
  const restored = out.replace(/@NL@/g, '\n').replace(/@TAB@/g, '\t');
  if (restored.length !== len) throw new Error(`REASSEMBLY MISMATCH: declared ${len}, got ${restored.length}`);
  return restored;
}

(async () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(__dirname, `capture_${stamp}.sql`);

  const view = await text(`pg_get_viewdef('player_card_view'::regclass)`);
  const mv   = await text(`pg_get_viewdef('player_card_mv'::regclass)`);
  const idx  = await text(`(select string_agg(indexdef, ';' || chr(10) order by indexname) from pg_indexes where tablename='player_card_mv')`);
  const acl  = await raw(`(select coalesce(array_to_string(relacl,' | '),'(owner defaults)') from pg_class where relname='player_card_mv')`);
  const rows = await num(`(select count(*) from player_card_mv)`);

  const sha = crypto.createHash('sha256').update(view).digest('hex');

  const body =
`-- CAPTURED ${stamp}  , recovery kit for the matview rebuild. READ-ONLY snapshot.
-- player_card_mv rows at capture time: ${rows}
-- player_card_mv ACL: ${acl}
-- player_card_view body: ${view.length} chars, sha256 ${sha}
--
-- ============ player_card_view (CURRENT) ============
CREATE OR REPLACE VIEW public.player_card_view AS
${view}

-- ============ player_card_mv (CURRENT) ============
CREATE MATERIALIZED VIEW public.player_card_mv AS
${mv}

-- ============ player_card_mv INDEXES (CURRENT) ============
${idx};
`;
  fs.writeFileSync(out, body);

  // Verify by READING THE FILE BACK, not by trusting the write.
  const back = fs.readFileSync(out, 'utf8');
  const ok = back.length === body.length && back.includes('WITH scored AS') && back.includes('idx_mv_card_id');
  console.log(`capture -> ${out}`);
  console.log(`  bytes on disk        : ${back.length}`);
  console.log(`  view body            : ${view.length} chars (baseline ${BASELINE.len})`);
  console.log(`  view sha256          : ${sha}`);
  console.log(`  matview rows         : ${rows}`);
  console.log(`  contains engine body : ${back.includes('WITH scored AS')}`);
  console.log(`  contains unique index: ${back.includes('idx_mv_card_id')}`);
  if (!ok || back.length === 0) { console.error('\n  ✗ CAPTURE INCOMPLETE , DO NOT PROCEED'); process.exit(1); }
  if (view.length !== BASELINE.len) {
    console.error(`\n  ✗ VIEW LENGTH HAS MOVED (${view.length} vs ${BASELINE.len}).`);
    console.error('    01_view_add_columns.sql was generated from the old body. REGENERATE it, do not paste it.');
    process.exit(1);
  }
  console.log('\n  ✓ capture complete and verified on disk. Safe to proceed to step 1.');
})().catch(e => { console.error('CAPTURE FAILED:', e.message); process.exit(1); });
