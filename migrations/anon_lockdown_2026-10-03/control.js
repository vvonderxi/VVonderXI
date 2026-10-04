#!/usr/bin/env node
/*  THE CONTROL FOR THE ANON LOCKDOWN , RUN IT BEFORE AND AFTER.
    ================================================================================
    It replays the FOUR queries the shipping pages actually make, using the SAME
    publishable key the pages ship, and then checks the things that must now FAIL.

    WHY REPLAY RATHER THAN ASSERT: a lockdown that breaks the site is worse than the
    hole it closed, and "the grant looks right" is not the same claim as "the query
    the client sends still returns rows". These are the real queries, lifted from the
    files, with the real key.

    THE NEGATIVE HALF IS THE POINT. CLAUDE.md records three checks in one week that
    reported clean over the exact thing they existed to catch, because only their
    passing state was ever observed. Here the MUST-FAIL list is what proves the
    change took: before the block they all succeed, after it they must all be denied.

    RUN   node migrations/anon_lockdown_2026-10-03/control.js
    EXIT  0 if every READ works and every DENIED is denied; 1 otherwise.
*/
'use strict';
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.SUPABASE_URL;
/*  Read the key out of the shipped page rather than the env, so this tests what a
    VISITOR holds. If the page ever stops shipping one, that is itself a finding.  */
const KEY = fs.readFileSync(path.join(ROOT, 'card.html'), 'utf8')
  .match(/sb_publishable_[A-Za-z0-9_-]+/)[0];

const q = async (rel, qs) => {
  const r = await fetch(`${BASE}/rest/v1/${rel}?${qs}`, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'count=exact' },
  });
  const body = await r.text();
  const n = (r.headers.get('content-range') || '/?').split('/')[1];
  return { status: r.status, n, body };
};

/*  THE FOUR READS THE CLIENT MAKES. Lifted from the files, not invented:
      player_card_mv    every page
      players           card.html:2586  .select('full_name').eq('api_player_id', pid)
      split_transfers   card.html:2480 and compare.html:2033  .select('*').eq('api_player_id', ..)
      honours           vv-core.js:3360 .select(5 cols).in('honour_type', [..])          */
const MUST_WORK = [
  ['player_card_mv  (every page)', 'player_card_mv', 'select=card_id,player_name,rt&limit=2'],
  ['players         (card.html)', 'players', 'select=full_name&api_player_id=eq.1370&limit=1'],
  ['split_transfers (card+compare)', 'split_transfers', 'select=*&api_player_id=eq.19&limit=2'],
  ['honours         (vv-core)', 'honours',
   'select=honour_type,team_name,season_year,league_code,honour_context&honour_type=in.(league_champion,ucl_winner)&limit=2'],
];

/*  WHAT MUST BE DENIED AFTER THE BLOCK. Every one of these SUCCEEDS today, which is
    the whole reason the block exists.  */
const MUST_DENY = [
  ['players , the columns beyond the two granted', 'players', 'select=date_of_birth,nationality&limit=1'],
  ['players , select *', 'players', 'select=*&limit=1'],
  ['player_season_cards , no client caller', 'player_season_cards', 'select=*&limit=1'],
  ['notes_cache , written by the endpoint only', 'notes_cache', 'select=*&limit=1'],
  ['teams , no client caller', 'teams', 'select=*&limit=1'],
  ['player_card_view , 500s and nothing queries it', 'player_card_view', 'select=card_id&limit=1'],
  ['engine_stage3_rt , staging table', 'engine_stage3_rt', 'select=*&limit=1'],
  ['waitlist_emails', 'waitlist_emails', 'select=*&limit=1'],
];

const denied = r => r.status === 401 || r.status === 403 ||
                    (r.status >= 400 && /permission denied|not find the table|PGRST205|42501/i.test(r.body));

(async () => {
  let bad = 0;
  console.log('\n=== anon lockdown control , key read from card.html ===\n');
  console.log('MUST STILL WORK (the client breaks if any of these fail):');
  for (const [label, rel, qs] of MUST_WORK) {
    const r = await q(rel, qs);
    const ok = r.status >= 200 && r.status < 300 && !denied(r);
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok   ' : 'BROKE'} ${label.padEnd(34)}${r.status}  rows=${r.n}`);
  }
  console.log('\nMUST BE DENIED (all of these succeed before the block):');
  for (const [label, rel, qs] of MUST_DENY) {
    const r = await q(rel, qs);
    const ok = denied(r);
    if (!ok) bad++;
    console.log(`  ${ok ? 'denied' : 'OPEN  '} ${label.padEnd(44)}${r.status}  rows=${r.n}`);
  }
  console.log(bad
    ? `\n${bad} wrong. Before the block, expect every MUST-BE-DENIED to read OPEN , that is the baseline, not a failure.\n`
    : '\nthe client reads exactly what it needs, and nothing else.\n');
  process.exit(bad ? 1 : 0);
})();
