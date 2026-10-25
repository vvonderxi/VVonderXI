#!/usr/bin/env node
/*  TODAY'S GENERATION COUNT AND ESTIMATED SPEND, FROM THE REPO (2026-10-25): the same count api/spend-check.js makes
 *  on its daily cron, for a hand check at any hour. Reads the Supabase settings from .env. No model call.  */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PER_PIECE_USD = 0.12;
(async () => {
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const { data, error } = await sb.from('api_rate_events').select('kind, started_at').gte('started_at', dayStart.toISOString());
  if (error) throw new Error(error.message);
  const n = { verdict: 0, notes: 0, refused: 0 };
  for (const r of data) { if (r.kind === 'verdict') n.verdict++; else if (r.kind === 'notes') n.notes++; else if (/^refused/.test(r.kind || '')) n.refused++; }
  console.log(`${dayStart.toISOString().slice(0, 10)} UTC so far: ${n.verdict} verdict and ${n.notes} notes generations, ${n.refused} refused; about $${((n.verdict + n.notes) * PER_PIECE_USD).toFixed(2)} at $${PER_PIECE_USD} a piece (an upper bound; the Console has the bill)`);
})().catch(e => { console.error('spend_today failed:', e.message); process.exit(1); });
