#!/usr/bin/env node
/*  GENERATES `RADAR_POOL_REF` FOR vv-core.js , the radar's per-pool reference distributions.
 *
 *  WHY THIS SCRIPT EXISTS AT ALL. The constant it emits is an EMBEDDED SNAPSHOT, exactly like
 *  KEEPER_SAVE_LADDER, and §D already records what that costs: nothing warns you when it goes
 *  stale. A snapshot with no generator beside it is a set of numbers nobody can re-derive, so
 *  the generator is the half that makes the snapshot maintainable rather than magic.
 *
 *  RUN IT when the card population changes materially , a re-ingest, the transfer-halves
 *  repair, a position backfill , then paste the block into vv-core.js and re-run the radar
 *  verification. Terminal A:  node scripts/gen-radar-ref.js
 *
 *  SEMANTICS: FRACTION STRICTLY BELOW, WHICH IS POSTGRES `percent_rank`, AND THAT CHOICE IS
 *  LOAD-BEARING. The agreed plan is this snapshot now and real percent_rank columns at the
 *  shared matview rebuild. If the snapshot used mid-rank (the commoner charting convention)
 *  every card's radar would shift the day the columns landed, and the swap would look like a
 *  regression. Ties at the bottom therefore score 0, which is also the honest reading: a
 *  centre-back who took no shots is not at the 30th percentile of shooting.
 *
 *  THE REFERENCE IS GATED, THE SCORING IS NOT. Only seasons of >= REF_MIN_MINUTES enter the
 *  distribution, because a per-90 rate off 200 minutes is noise and would fatten both tails
 *  of the bar every other card is judged against. Every card is still SCORED, whatever its
 *  minutes. Pre-2015 needs no gate of its own , the granular inputs are ~0% populated there,
 *  so those cards contribute nothing to any axis by construction.  */
require('dotenv').config({quiet:true});
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const REF_MIN_MINUTES = 900;
const STEP = 5;                                    // breakpoint every 5th percentile -> 21 per axis
const AXES = ['goalThreat','creation','progression','defensive'];
const KEY  = { goalThreat:'g', creation:'c', progression:'p', defensive:'d' };

/*  THE POOL KEY MUST MATCH vv-core's poolKeyFor() EXACTLY, or a card is scored against a
    distribution built for a different population. Both read position_pool first and fall back
    to the coarse position, which is the engine's own convention (pos_pct and posvol_pct
    already partition on COALESCE(s.pool, s.pos)). Keepers are excluded entirely: they are
    suppressed before they reach a pool.  */
const POOLS = ['CB','FB','CDM','CM','CAM','Winger','ST','DEF','MID','FWD'];
function poolKeyFor(pool, pos){
  if (pool === 'GK' || pos === 'GK') return null;             // keepers never get an outfield radar
  if (pool && POOLS.indexOf(pool) !== -1) return pool;        // 8-bucket, minus GK
  const p = String(pos || '').toUpperCase();
  if (p === 'DEF' || p === 'MID' || p === 'FWD' || p === 'FOR') return p === 'FOR' ? 'FWD' : p;
  return null;                                                // UNK with no usable coarse value
}

// The four composites, byte-identical to radarFor's. Kept here rather than imported because
// this script must keep working if vv-core is mid-edit.
function composites(row){
  const m = row.minutes || 0;
  const p90 = v => (m > 0 && v != null) ? (v / m) * 90 : null;
  const comp = terms => terms.some(t => t[0] == null) ? null
                      : terms.reduce((a,t) => a + t[1]*t[0], 0);
  return {
    goalThreat:  comp([[p90(row.goals),1],[p90(row.shots_on),0.3]]),
    creation:    comp([[p90(row.passes_key),1],[p90(row.assists),0.5]]),
    progression: comp([[p90(row.dribbles_success),1],[p90(row.passes_total),0.02]]),
    defensive:   comp([[p90(row.tackles_total),1],[p90(row.interceptions),1],[p90(row.duels_won),0.1]])
  };
}

(async () => {
  let from = 0, rows = [];
  for(;;){
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,position,position_pool,minutes,goals,shots_on,passes_key,assists,dribbles_success,passes_total,tackles_total,interceptions,duels_won')
      .order('card_id', { ascending:true }).range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    rows = rows.concat(data);
    if (data.length < 1000) break;      // 1000 is PostgREST's cap, so a short page is the true end
    from += 1000;
  }
  console.error('rows read: ' + rows.length);

  const dist = {};
  POOLS.forEach(p => { dist[p] = {}; AXES.forEach(a => dist[p][a] = []); });
  let used = 0;
  for (const row of rows){
    if ((row.minutes || 0) < REF_MIN_MINUTES) continue;
    const key = poolKeyFor(row.position_pool, row.position);
    if (!key) continue;
    const c = composites(row);
    let any = false;
    AXES.forEach(a => { if (c[a] != null){ dist[key][a].push(c[a]); any = true; } });
    if (any) used++;
  }
  console.error('cards in the reference: ' + used);

  const q = (sorted, pct) => {
    if (!sorted.length) return null;
    const i = (pct/100) * (sorted.length - 1);
    const lo = Math.floor(i), hi = Math.ceil(i);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi]-sorted[lo]) * (i-lo);
  };
  const out = {};
  const report = [];
  for (const p of POOLS){
    out[p] = {};
    for (const a of AXES){
      const s = dist[p][a].slice().sort((x,y) => x-y);
      const bps = [];
      for (let k = 0; k <= 100; k += STEP) bps.push(s.length ? Math.round(q(s,k)*1000)/1000 : null);
      out[p][KEY[a]] = s.length ? bps : null;
      report.push([p, a, s.length, s.length ? bps[10] : null]);
    }
  }

  const lines = POOLS.map(p =>
    '    ' + (p.length < 7 ? p : "'"+p+"'") + ':{' +
    AXES.map(a => KEY[a] + ':' + (out[p][KEY[a]] ? '[' + out[p][KEY[a]].join(',') + ']' : 'null')).join(',') +
    '}');
  const block =
'  var RADAR_REF_MIN_MINUTES = ' + REF_MIN_MINUTES + ', RADAR_REF_STEP = ' + STEP + ';\n' +
'  var RADAR_POOL_REF = {\n' + lines.join(',\n') + '\n  };';
  fs.writeFileSync('/tmp/radar_pool_ref.js', block);

  console.error('\npool      axis          n    median(raw)');
  report.forEach(r => console.error('  ' + String(r[0]).padEnd(8) + String(r[1]).padEnd(13) +
    String(r[2]).padStart(6) + '   ' + String(r[3]).padStart(8)));
  console.error('\nwritten: /tmp/radar_pool_ref.js  (' + block.length + ' bytes)');
})();
