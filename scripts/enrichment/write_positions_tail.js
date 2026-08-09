// CAM-tail position writer , batched research results (2026-08-09 onward).
//
// INPUT: a returned batch CSV from cam_tail_batches/, with verified_position / confidence
// / evidence filled in. Handles one file or a whole directory.
//
//   NODE_PATH=./node_modules node scripts/enrichment/write_positions_tail.js <file-or-dir> [--write]
//
// DRY-RUN by default.
//
// ── THE IDENTITY RULE, which is the whole point of this script ──────────────────
// Rows resolve on api_player_id + season_year + league_code. NEVER on player_name.
// Display names are NOT unique here and the collisions are live and position-changing:
//   J. Rodríguez -> api517 James (CAM/CM) + api19169 Jay (ST) + api2616 (a third)
//   João Mário   -> api206 (CAM) + api41734 (FB)
//   Nenê         -> api9970 (CAM) + api41138
//   L. Pellegrini-> api782 (CAM) + api30554 (FB)
// A name-keyed write puts a wrong position on a wrong player and looks fine in the diff.
// So this script VERIFIES the echoed identity against the DB and refuses any row where
// the returned api_player_id/card_id do not still describe the same card.
//
// WRITE POLICY: only confidence=high AND a real 8-bucket position AND a genuine change.
// UNSURE, low, medium, and no-change rows are routed to the hold file, never written.
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const POOLS = ['GK','FB','CB','CDM','CM','CAM','Winger','ST'];
const WRITE = process.argv.includes('--write');
const TARGET = process.argv[2];
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function parseCSV(txt){
  const rows=[]; let row=[], cur='', q=false;
  for(let i=0;i<txt.length;i++){ const ch=txt[i];
    if(q){ if(ch==='"'){ if(txt[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"') q=true;
    else if(ch===','){ row.push(cur); cur=''; }
    else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
    else if(ch!=='\r') cur+=ch; }
  if(cur!==''||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r=>r.length>1);
}
const esc=v=>{const s=(v===null||v===undefined||v==='')?'NR':String(v);
  return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};

(async () => {
  if(!TARGET){ console.error('usage: write_positions_tail.js <file-or-dir> [--write]'); process.exit(1); }
  const files = fs.statSync(TARGET).isDirectory()
    ? fs.readdirSync(TARGET).filter(f=>/\.csv$/i.test(f) && !/^MANIFEST/i.test(f)).map(f=>path.join(TARGET,f)).sort()
    : [TARGET];
  console.log((WRITE?'WRITE':'DRY-RUN') + ' , ' + files.length + ' file(s)\n');

  // ── TWO KINDS OF HELD ROW, and only one of them is work ───────────────────────
  //   holdChange , research proposed a DIFFERENT position but at medium/low confidence.
  //                ACTIONABLE: the card may well be wrong and nobody has settled it.
  //   holdAgree  , research AGREED with the current pool, just not confidently.
  //                NOT ACTIONABLE: nothing to change, and re-researching it buys nothing.
  // These were conflated in the first version because confidence was checked before
  // change-vs-agree, so "probably already right" landed in the same file as "unresolved".
  // Batch 01: 51 held rows of which only 15 were actually work.
  const buckets = { write:[], unsure:[], holdChange:[], holdAgree:[], nochange:[],
                    badpos:[], identity:[], missing:[] };
  const confByBatch = [];   // per-file confidence mix , see the curve report at the end

  for (const file of files) {
    const conf = { high:0, medium:0, low:0, unsure:0, other:0, rows:0, rtSum:0, rtN:0 };
    confByBatch.push({ file: path.basename(file), conf });
    const rows = parseCSV(fs.readFileSync(file,'utf8'));
    const h = rows[0].map(s=>s.trim());
    const iA=h.indexOf('api_player_id'), iC=h.indexOf('card_id'),
          iV=h.indexOf('verified_position'), iF=h.indexOf('confidence'), iE=h.indexOf('evidence');
    if (iA<0 || iC<0 || iV<0) { console.log('  SKIP ' + file + ' , missing required columns'); continue; }

    for (const r of rows.slice(1)) {
      const api=Number(r[iA]), cid=Number(r[iC]);
      const want=(r[iV]||'').trim(), conf=(r[iF]||'').trim().toLowerCase(), ev=(r[iE]||'').trim();
      const rec={file:path.basename(file), api, cid, want, conf, ev, name:r[2], season:r[3]};
      // confidence mix is tallied on EVERY returned row, before any filtering, so the
      // curve reflects what the research actually said, not what survived the guards.
      const cb=confByBatch[confByBatch.length-1].conf;
      cb.rows++;
      const rtv=Number(r[10]); if(Number.isFinite(rtv)){ cb.rtSum+=rtv; cb.rtN++; }
      if(/^unsure$/i.test(want)) cb.unsure++;
      else if(conf==='high'||conf==='medium'||conf==='low') cb[conf]++;
      else cb.other++;

      // 1. IDENTITY , the echoed ids must still describe the same live card.
      if(!Number.isFinite(api) || !Number.isFinite(cid)){ buckets.identity.push({...rec,why:'ids not numeric , echo was altered'}); continue; }
      const q = await sb.from('player_card_mv')
        .select('card_id,api_player_id,player_name,season,season_year,league_code,team_name,position_pool,rt')
        .eq('card_id', cid).maybeSingle();
      if(q.error){ buckets.identity.push({...rec,why:'lookup error '+q.error.message}); continue; }
      if(!q.data){ buckets.missing.push({...rec,why:'card_id not found'}); continue; }
      if(q.data.api_player_id !== api){
        buckets.identity.push({...rec,why:'card '+cid+' belongs to api'+q.data.api_player_id+', not api'+api}); continue; }
      const card=q.data;

      // 2. ANSWER SHAPE
      if(/^unsure$/i.test(want) || want===''){ buckets.unsure.push({...rec,card}); continue; }
      if(!POOLS.includes(want)){ buckets.badpos.push({...rec,card,why:'"'+want+'" is not one of the 8 buckets'}); continue; }
      // CHANGE-vs-AGREE IS DECIDED BEFORE CONFIDENCE. That order is the fix: it is what
      // separates "may be wrong, unresolved" from "probably already right".
      const agrees = (card.position_pool === want);
      if(conf!=='high'){ (agrees ? buckets.holdAgree : buckets.holdChange).push({...rec,card}); continue; }
      if(agrees){ buckets.nochange.push({...rec,card}); continue; }
      buckets.write.push({...rec,card});
    }
  }

  const n=k=>buckets[k].length;
  console.log('  RESOLVED');
  console.log('    would write (high conf, real change) : '+n('write'));
  console.log('    already correct, high conf           : '+n('nochange'));
  console.log('    ACTIONABLE HOLD , change at med/low  : '+n('holdChange')+'   <- needs research');
  console.log('    ACTIONABLE HOLD , UNSURE             : '+n('unsure')+'   <- needs research');
  console.log('    non-actionable , AGREED at med/low   : '+n('holdAgree')+'   <- probably fine, no work');
  console.log('  REJECTED');
  console.log('    identity mismatch , NOT written      : '+n('identity'));
  console.log('    card_id not found                    : '+n('missing'));
  console.log('    position not in the 8-bucket set     : '+n('badpos'));

  if(n('identity')){
    console.log('\n  *** IDENTITY MISMATCHES , the echo contract was broken. Investigate before writing anything. ***');
    buckets.identity.slice(0,15).forEach(x=>console.log('      '+x.file+'  '+x.name+' '+x.season+'  '+x.why));
  }
  if(n('badpos')) buckets.badpos.slice(0,10).forEach(x=>console.log('      BADPOS '+x.name+' '+x.season+'  '+x.why));

  if(n('write')){
    const g={}; buckets.write.forEach(x=>{const k=x.card.position_pool+' -> '+x.want;(g[k]=g[k]||[]).push(x);});
    console.log('\n  CHANGES by transition:');
    Object.keys(g).sort((a,b)=>g[b].length-g[a].length).forEach(k=>{
      console.log('    ['+k+']  '+g[k].length);
      g[k].sort((a,b)=>(b.card.rt||0)-(a.card.rt||0)).slice(0,8).forEach(x=>
        console.log('       '+String(x.card.player_name).slice(0,20).padEnd(21)+String(x.card.season).padEnd(6)+
          String(x.card.team_name).slice(0,18).padEnd(19)+String(x.card.league_code).padEnd(4)+' rt'+String(x.card.rt).padStart(3)));
      if(g[k].length>8) console.log('       ... '+(g[k].length-8)+' more');
    });
  }

  // ── CONFIDENCE CURVE ──────────────────────────────────────────────────────────
  // Batches are ordered by rt DESCENDING, so each one is less prominent than the last.
  // The high-confidence rate SHOULD FALL as it goes: batch 01 is Palmer, De Bruyne,
  // Rashford; batch 20 is rt 20-14 in Portugal, Turkey and Belgium. A FLAT curve does
  // not mean the research is going well, it means the UNSURE instruction has stopped
  // biting and the model is guessing with a confident label. Flag it, do not celebrate it.
  // FIRES ON TWO CONSECUTIVE NON-FALLING BATCHES, NOT ONE. At ~120 rows a batch, the
  // 3-point tolerance is about 4 rows, which is inside noise , a single-batch trip would
  // cry wolf often enough to train everyone to ignore the warning, which is worse than
  // having no warning. A run of two is a signal. The per-batch delta is printed either
  // way, so a single flat batch stays VISIBLE in the data without raising an alarm.
  const FLAT_TOL = 3;   // percentage points
  const RUN_LEN  = 2;   // consecutive non-falling batches required to warn
  console.log('\n  CONFIDENCE CURVE (per batch, in the order given)');
  console.log('    batch                 rows   avg rt   high   med   low  UNSURE   %high    delta');
  let prevHi=null;
  const series=[];
  confByBatch.forEach(b=>{
    const c=b.conf, pct=c.rows? (c.high/c.rows*100) : 0;
    const avgRt=c.rtN? (c.rtSum/c.rtN) : 0;
    const d = prevHi===null ? null : pct-prevHi;
    // <= not < : a drop of EXACTLY the tolerance is a real drop. With < , a curve
    // falling a steady 3pt per batch (12pt over 5 batches) would warn, which is the
    // same cry-wolf failure the run-length rule exists to prevent.
    const fell = d===null ? null : (d <= -FLAT_TOL);
    series.push({file:b.file, pct, fell});
    console.log('    '+b.file.padEnd(22)+String(c.rows).padStart(4)+'   '+avgRt.toFixed(1).padStart(6)+
      '   '+String(c.high).padStart(4)+'  '+String(c.medium).padStart(4)+'  '+String(c.low).padStart(4)+
      '  '+String(c.unsure).padStart(6)+'   '+pct.toFixed(0).padStart(3)+'%   '+
      (d===null ? '    ,' : ((d>0?'+':'')+d.toFixed(0)+'pt').padStart(6)) +
      (fell===false ? '  flat' : ''));
    prevHi=pct;
  });
  // find runs of consecutive non-falling batches
  const runs=[]; let cur=[];
  series.forEach(s=>{ if(s.fell===false){ cur.push(s); } else { if(cur.length>=RUN_LEN) runs.push(cur); cur=[]; } });
  if(cur.length>=RUN_LEN) runs.push(cur);
  if(runs.length){
    runs.forEach(run=>{
      console.log('\n    *** WARNING , high-confidence rate failed to fall on '+run.length+
        ' CONSECUTIVE batches: '+run.map(s=>s.file+' ('+s.pct.toFixed(0)+'%)').join(' -> '));
    });
    console.log('    Each batch covers LESS prominent players than the one before, so a curve that');
    console.log('    stops falling is a RED FLAG, not a good result. The likeliest reading is that');
    console.log('    UNSURE stopped being used and the model is guessing with a confident label.');
    console.log('    Spot-check high rows from these batches BY HAND before writing any of them.');
  } else if(confByBatch.length>1){
    const singles=series.filter(s=>s.fell===false);
    if(singles.length) console.log('\n    note: '+singles.length+' batch(es) flat vs the previous one ('+
      singles.map(s=>s.file).join(', ')+'), but none consecutive , inside noise at this batch size.');
    else console.log('\n    curve falls across every batch , consistent with honest UNSURE use.');
  }

  if(!WRITE){ console.log('\n  dry run , nothing written. Re-run with --write to apply.'); return; }

  let ok=0, skip=0, miss=0, err=0;
  const done=[];
  for(const x of buckets.write){
    const cur = await sb.from('player_positions').select('position')
      .eq('api_player_id', x.api).eq('season_year', x.card.season_year).eq('league_code', x.card.league_code).maybeSingle();
    if(cur.error){ console.log('  ERR  '+x.card.player_name+'  '+cur.error.message); err++; continue; }
    if(!cur.data){ console.log('  MISS '+x.card.player_name+' '+x.card.season+'  no player_positions row'); miss++; continue; }
    if(cur.data.position !== x.card.position_pool){
      console.log('  SKIP '+x.card.player_name+' '+x.card.season+'  moved underneath us ('+cur.data.position+')'); skip++; continue; }
    const up = await sb.from('player_positions').update({ position: x.want })
      .eq('api_player_id', x.api).eq('season_year', x.card.season_year).eq('league_code', x.card.league_code)
      .eq('position', x.card.position_pool)          // guard on the pool observed during the dry run
      .select('api_player_id');
    if(up.error){ console.log('  ERR  '+x.card.player_name+'  '+up.error.message); err++; continue; }
    if(!up.data || !up.data.length){ console.log('  SKIP '+x.card.player_name+'  guard matched 0 rows'); skip++; continue; }
    ok++; done.push([x.api, x.card.season_year, x.want]);
  }
  console.log('\n  updated: '+ok+'   skipped: '+skip+'   missing row: '+miss+'   errors: '+err);

  if(done.length){
    const CSV='scripts/enrichment/known_players.csv';
    // The committed CSV does not reliably end with a newline; a bare append FUSES rows.
    const prev=fs.readFileSync(CSV,'utf8');
    const lead=(prev.length && !prev.endsWith('\n')) ? '\n' : '';
    fs.appendFileSync(CSV, lead + done.map(r=>r[0]+','+r[1]+','+r[2]+',fable-tail,2026-08-09').join('\n') + '\n');
    console.log('  appended '+done.length+' rows to known_players.csv (source=fable-tail)');
  }
  // TWO FILES, because only one of them is a work queue.
  const H='api_player_id,card_id,player_name,season,league_code,current_pool,rt,proposed_position,confidence,hold_reason,evidence,source_batch';
  const line=x=>[x.api,x.cid,x.name,x.season,(x.card&&x.card.league_code),(x.card&&x.card.position_pool),
    (x.card&&x.card.rt),x.want,x.conf,x.reason,x.ev,x.file].map(esc).join(',');
  const dump=(file,rows,label)=>{
    if(!rows.length) return;
    fs.writeFileSync(file, H+'\n'+rows.map(line).join('\n')+'\n');
    console.log('  wrote '+file+' , '+rows.length+' rows  ('+label+')');
  };
  // ACTIONABLE , the card may be wrong and nothing has settled it.
  dump('scripts/enrichment/tail_HOLD.csv', [].concat(
    buckets.holdChange.map(x=>({...x,reason:'CHANGE proposed at '+(x.conf||'blank')+' confidence , unresolved'})),
    buckets.unsure.map(x=>({...x,reason:'UNSURE , research could not establish the season role'})),
    buckets.badpos.map(x=>({...x,reason:'position outside the 8-bucket set: '+x.want})),
    buckets.identity.map(x=>({...x,reason:'IDENTITY MISMATCH , '+x.why}))),
    'needs research');
  // NOT ACTIONABLE , research agreed with what we already have, just not confidently.
  // Kept as a record so nobody re-researches them, and so a later pass can tell the
  // difference between "nobody looked" and "someone looked and agreed, weakly".
  dump('scripts/enrichment/tail_LOWCONF_AGREE.csv',
    buckets.holdAgree.map(x=>({...x,reason:'AGREED with current pool at '+(x.conf||'blank')+' confidence , no change'})),
    'no work, record only');
  console.log('  NEXT: refresh materialized view player_card_mv, then snapshot rt before/after.');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
