#!/usr/bin/env node
/*  TAG_THRESHOLDS_POOL DRIFT CHECK , READ-ONLY, REPORTS, NEVER REWRITES.
    ======================================================================
    WHY THIS IS A CHECKER AND NOT A GENERATOR, WHICH IS THE WHOLE DESIGN DECISION.
    The table is a CALIBRATION, not a query. `scripts/enrichment/tag_rekey_2026-08-13.txt`
    records the method: for each key, measure the pass-rate the old coarse table produced
    across all pooled cards, then set each pool's threshold at that same rate inside its own
    distribution. The TARGET RATES are the artefact; the numbers are what hit them.
    So a regenerator would rewrite thresholds against today's distribution, which MOVES TAGS
    , and CLAUDE.md is explicit that the rarity band is a CEILING and that a tag below it is
    not a defect to tune away. Silently re-tuning twenty tags because a snapshot drifted is
    the opposite of what that rule asks for. What is wanted is to KNOW when the table has
    stopped hitting its rates, and to decide deliberately.
    SO THIS REPORTS THE PASS-RATE EACH STORED THRESHOLD ACTUALLY ACHIEVES TODAY, against the
    rate it was calibrated to. It exits 1 if any key drifts past the bar.
        node scripts/check-tag-thresholds.js
        node scripts/check-tag-thresholds.js --bar 3     (percentage points, default 2)
    IT COVERS THE KEYS THE REKEY FILE NAMES AND NO OTHERS. A key added to the table since
    then has no recorded target rate, so it is listed as UNTARGETED rather than silently
    passed , an unmeasurable key must not read as a clean one.  */
'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
global.window = global; require('../vv-core.js');
const VV = global.VVCore;

const arg=(n,d)=>{const a=process.argv.slice(2),i=a.indexOf('--'+n);return i<0?d:a[i+1];};
const BAR = parseFloat(arg('bar','2'));

/*  TARGET RATES, transcribed from tag_rekey_2026-08-13.txt. These are the artefact the
    thresholds were built to hit, so they are the thing to check against , not a re-derived
    percentile, which would just be the table explaining itself.  */
const TARGET = {
  goals90_p90:10.58, goals90_p85:15.71, goals90_p80:21.48, assists90_p90:8.11,
  keypass90_p90:10.15, keypass90_p80:20.23, passes90_p90:10.96, passes90_p80:21.76,
  passacc_p80:22.40, drib90_p90:8.93, drib90_p85:14.00, defact90_p90:7.04
};
/*  The per-90 numerator behind each key. passacc_p80 is a RATE ALREADY, not a per-90, and
    CLAUDE.md records passes_accuracy as INVALID rather than sparse , it is reported and
    never used to justify a change.  */
const NUM = {
  goals90:r=>r.goals, assists90:r=>r.assists, keypass90:r=>r.passes_key,
  passes90:r=>r.passes_total, drib90:r=>r.dribbles_success,
  defact90:r=>(r.tackles_total==null&&r.interceptions==null&&r.tackles_blocks==null)?null
             :((r.tackles_total||0)+(r.interceptions||0)+(r.tackles_blocks||0))
};
const MIN_MINUTES_TAG = 900;   // the engine's own gate, read from vv-core's comment

(async () => {
  const COLS='card_id,position_pool,position,minutes,goals,assists,passes_key,passes_total,'
           + 'dribbles_success,tackles_total,interceptions,tackles_blocks,passes_accuracy';
  const rows=[]; const S=1000;
  for(let f=0;;f+=S){
    const {data,error}=await sb.from('player_card_mv').select(COLS).order('card_id',{ascending:true}).range(f,f+S-1);
    if(error) throw new Error('read: '+error.message);
    rows.push(...data); if(data.length<S) break;
  }
  const T = VV.TAG_THRESHOLDS_POOL;
  if(!T) { console.error('TAG_THRESHOLDS_POOL is not exported from vv-core.js , cannot check.'); process.exit(2); }

  const eligible = rows.filter(r => r.minutes != null && r.minutes >= MIN_MINUTES_TAG);
  const keys = new Set();
  Object.keys(T).forEach(p => Object.keys(T[p]).forEach(k => keys.add(k)));

  console.log('\nTAG_THRESHOLDS_POOL DRIFT , pass-rate achieved today vs the 2026-08-13 calibration');
  console.log('  population: ' + eligible.length + ' cards at ' + MIN_MINUTES_TAG + '+ minutes  (bar: ' + BAR + 'pp)\n');
  console.log('  key                 target    today     drift');
  console.log('  ' + '-'.repeat(46));
  let bad = 0, untargeted = [];
  for (const key of [...keys].sort()) {
    if (TARGET[key] == null) { if(!/minutes_p90|conversion_p90|int90_p90|duelswon90_p90/.test(key)) untargeted.push(key); continue; }
    const stem = key.replace(/_p\d+$/,'');
    let pass=0, denom=0;
    for (const r of eligible) {
      const pool = r.position_pool && T[r.position_pool] ? r.position_pool : null;
      if (!pool) continue;
      const th = T[pool][key]; if (th == null) continue;
      let v;
      if (stem === 'passacc') v = r.passes_accuracy;
      else { const n = NUM[stem] && NUM[stem](r); v = n==null ? null : n/(r.minutes/90); }
      if (v == null) continue;
      denom++; if (v >= th) pass++;
    }
    if(!denom) continue;
    const today = 100*pass/denom, drift = today - TARGET[key];
    const flag = Math.abs(drift) > BAR ? '  <-- DRIFTED' : '';
    if (flag) bad++;
    console.log('  ' + key.padEnd(18) + String(TARGET[key]).padStart(7) + '%' +
                today.toFixed(2).padStart(9) + '%' + (drift>=0?'+':'') + drift.toFixed(2).padStart(9) + flag);
  }
  if (untargeted.length) {
    console.log('\n  UNTARGETED (in the table, no recorded target rate , not checked, not clean):');
    console.log('    ' + untargeted.join(', '));
  }
  console.log('\n  ' + (bad ? bad + ' key(s) past the ' + BAR + 'pp bar , DECIDE, do not auto-tune. Moving a threshold moves tags.'
                            : 'every targeted key within ' + BAR + 'pp of its calibration.') + '\n');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(2); });
