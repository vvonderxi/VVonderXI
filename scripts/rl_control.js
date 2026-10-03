/*  CONTROL TEST FOR THE THREE LIMITER CHANGES , 2026-10-03.
    Plants a fault for each and confirms it fires, then puts it back and confirms it passes.
    A check whose failing state has never been observed is not evidence (CLAUDE.md SEC C).  */
'use strict';
const path = require('path');
const ROOT = '/home/odoo/projects/VVonderXI';

// ── fake supabase, installed in the require cache BEFORE analyse.js is loaded ──
let LEDGER = [];            // rows inserted by the limiter
let COUNTS = {};            // { hourlyIP, inflightIP, allIPs }
let FAIL   = null;          // 'read' | 'write' | 'throw' | null
function thenable(val){ return { then: (ok, err) => Promise.resolve(val).then(ok, err) }; }
function builder(table, op){
  const st = { table, op, filters: {} };
  const api = {};
  ['eq','in','is','gte','lt','lte','neq','order','limit','range'].forEach(m => {
    api[m] = (k, v) => { st.filters[m] = st.filters[m] || []; st.filters[m].push([k, v]); return api; };
  });
  api.select = (c, o) => { st.head = !!(o && o.head); return api; };
  api.single = () => thenable(resolve(st, true));
  api.maybeSingle = () => thenable({ data: null, error: null });
  api.then = (ok, err) => Promise.resolve(resolve(st, false)).then(ok, err);
  return api;
}
function resolve(st, single){
  if (FAIL === 'throw') throw new Error('planted: client threw');
  if (st.op === 'select'){
    if (FAIL === 'read') return { count: null, error: { message: 'planted: ledger read error' } };
    const hasIP = (st.filters.eq || []).some(f => f[0] === 'ip');
    const inflight = !!(st.filters.is || []).some(f => f[0] === 'finished_at');
    if (!hasIP) return { count: COUNTS.allIPs, error: null };
    if (inflight) return { count: COUNTS.inflightIP, error: null };
    return { count: COUNTS.hourlyIP, error: null };
  }
  if (st.op === 'insert'){
    if (FAIL === 'write') return { data: null, error: { message: 'planted: ledger write error' } };
    LEDGER.push(st.row);
    return single ? { data: { id: 'row-' + LEDGER.length }, error: null } : { error: null };
  }
  return { data: null, error: null };
}
const fakeClient = {
  from(table){
    return {
      select: (c, o) => { const b = builder(table, 'select'); return b.select(c, o); },
      insert: (row) => { const b = builder(table, 'insert'); b._st = row; const bb = builder(table, 'insert');
                         // keep the row on the state the resolver sees
                         const st = { table, op: 'insert', row, filters: {} };
                         const api = { select: () => ({ single: () => thenable(resolve(st, true)) }),
                                       then: (ok, err) => Promise.resolve(resolve(st, false)).then(ok, err) };
                         return api; },
      upsert: () => thenable({ error: null }),
      update: () => ({ eq: () => thenable({ error: null }) }),
      delete: () => ({ lt: () => ({ then: (ok) => { if (ok) ok({}); return Promise.resolve({}); } }) })
    };
  }
};
const sbPath = require.resolve('@supabase/supabase-js', { paths: [ROOT] });
require.cache[sbPath] = { id: sbPath, filename: sbPath, loaded: true, exports: { createClient: () => fakeClient } };

// ── env + anthropic stub ──
process.env.SUPABASE_URL = 'https://stub.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'stub-service-key';
process.env.ANTHROPIC_API_KEY = 'stub-key';
let UPSTREAM_CALLS = 0, PROBE_CALLS = 0, LAST_BODY = null;
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (String(url).indexOf('/v1/models/') >= 0){
    /*  probeModel, not a generation , counting it as one is the harness fault that made every
        success read as "upstream 2" and every refusal as "upstream 1".  */
    PROBE_CALLS++;
    return { ok: true, status: 200, json: async () => ({ id: 'stub' }) };
  }
  if (String(url).indexOf('api.anthropic.com') >= 0){
    UPSTREAM_CALLS++; LAST_BODY = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({
      content: [{ type: 'text', text: JSON.stringify({ glance:'g', scout:'s', notes:['a','b','c','d'],
        p1:'x', p2:'y', h2h:'z', verdict:'v', tag:'the_debate', who:'w' }) }],
      stop_reason: 'end_turn' }) };
  }
  return realFetch(url, opts);
};

const handler = require(path.join(ROOT, 'api/analyse.js'));

function mkres(){
  const r = { _status: 200, _json: null, _headers: {}, _ended: false };
  r.setHeader = (k, v) => { r._headers[k.toLowerCase()] = String(v); };
  r.status = (c) => { r._status = c; return r; };
  r.json = (o) => { r._json = o; return r; };
  r.end = () => { r._ended = true; return r; };
  return r;
}
async function call(body, origin){
  const before = UPSTREAM_CALLS;
  const req = { method: 'POST', headers: { origin: origin || 'https://vvonderxi.com', 'x-forwarded-for': '203.0.113.7' }, body };
  const res = mkres();
  await handler(req, res);
  /*  THE CACHE UPSERT AND rlEnd ARE FIRE-AND-FORGET, so without this the next case's reset()
      lands before they do and their effects are attributed to the next case. That is what made
      a 413 report "upstream 1".  */
  await new Promise(r => setTimeout(r, 25));
  res._upstream = UPSTREAM_CALLS - before;
  return res;
}
const verdictBody = (n) => ({ messages: [{ role:'user', content: 'x'.repeat(n) }], cardIdA: 1, cardIdB: 2, rtA: 90, rtB: 88 });
const notesBody   = (n) => ({ mode: 'notes', cardId: 123, player: { blob: 'x'.repeat(n), rt: 90 } });

let pass = 0, fail = 0;
function check(name, cond, detail){
  if (cond){ pass++; console.log('  PASS  ' + name + (detail ? '   ' + detail : '')); }
  else     { fail++; console.log('  FAIL  ' + name + (detail ? '   ' + detail : '')); }
}
function reset(counts){ LEDGER = []; UPSTREAM_CALLS = 0; FAIL = null; COUNTS = Object.assign({ hourlyIP:0, inflightIP:0, allIPs:0 }, counts||{}); }

(async () => {
  console.log('\n── 1. THE INPUT CAP, BOTH BRANCHES ─────────────────────────────');
  reset();
  let r = await call(verdictBody(11000));
  check('verdict under 12,000 proceeds', r._status !== 413 && r._upstream === 1, 'status ' + r._status + ', upstream ' + r._upstream);
  reset();
  r = await call(verdictBody(13000));
  check('verdict over 12,000 refused 413', r._status === 413 && r._upstream === 0, 'status ' + r._status + ', upstream ' + r._upstream);
  reset();
  r = await call(notesBody(11000));
  check('notes under 12,000 proceeds', r._status !== 413 && r._upstream === 1, 'status ' + r._status + ', upstream ' + r._upstream);
  reset();
  r = await call(notesBody(13000));
  check('notes over 12,000 refused 413  (THE HOLE)', r._status === 413 && r._upstream === 0, 'status ' + r._status + ', upstream ' + r._upstream);
  reset();
  r = await call({ mode:'notes', cardId:'not-a-number', player:{ blob:'x'.repeat(13000) } });
  check('notes over cap refused even with NO usable cardId', r._status === 413 && r._upstream === 0, 'status ' + r._status);

  console.log('\n── 2. THE GLOBAL CEILING ───────────────────────────────────────');
  reset({ allIPs: 299 });
  r = await call(verdictBody(100));
  check('299 across all callers proceeds', r._status !== 429 && r._upstream === 1, 'status ' + r._status);
  reset({ allIPs: 300 });
  r = await call(verdictBody(100));
  check('300 refused 429', r._status === 429 && r._upstream === 0, 'status ' + r._status);
  check('  reason reaches the reader as the platform, not the connection',
        /platform is at its hourly generation ceiling/.test(r._json && r._json.error || ''), JSON.stringify(r._json));
  check('  ledger row kind is refused:global',
        LEDGER.length === 1 && LEDGER[0].kind === 'refused:global', JSON.stringify(LEDGER));
  check('  Retry-After is 300', r._headers['retry-after'] === '300', r._headers['retry-after']);
  reset({ allIPs: 400 });
  r = await call(notesBody(100));
  check('the notes branch is behind it too', r._status === 429 && LEDGER[0] && LEDGER[0].kind === 'refused:global', 'status ' + r._status);
  // ordering: an over-limit address must be told it is their own problem
  reset({ allIPs: 400, hourlyIP: 30 });
  r = await call(verdictBody(100));
  check('an over-limit IP in a busy hour gets refused:hourly, not :global',
        LEDGER[0] && LEDGER[0].kind === 'refused:hourly' && /this connection/.test(r._json.error), JSON.stringify(LEDGER[0]));
  reset({ allIPs: 0, inflightIP: 2 });
  r = await call(verdictBody(100));
  check('concurrency still fires and still says in flight',
        r._status === 429 && LEDGER[0].kind === 'refused:concurrent' && /in flight/.test(r._json.error), r._headers['retry-after']);

  console.log('\n── 3. FAIL-OPEN, ALL FOUR PATHS ────────────────────────────────');
  reset({ allIPs: 999 }); FAIL = 'read';
  r = await call(verdictBody(100));
  check('ledger READ error fails open even at 999 global', r._upstream === 1 && r._status !== 429, 'upstream ' + r._upstream + ', status ' + r._status);
  reset({ allIPs: 999 }); FAIL = 'throw';
  r = await call(verdictBody(100));
  check('a throw fails open', r._upstream === 1 && r._status !== 429, 'upstream ' + r._upstream);
  reset(); FAIL = 'write';
  r = await call(verdictBody(100));
  check('ledger WRITE error fails open', r._upstream === 1 && r._status !== 429, 'upstream ' + r._upstream);
  reset();
  const noIP = mkres();
  await handler({ method:'POST', headers:{ origin:'https://vvonderxi.com' }, body: verdictBody(100) }, noIP);
  check('no client ip fails open', UPSTREAM_CALLS === 1 && noIP._status !== 429, 'upstream ' + r._upstream);

  console.log('\n── 4. THE HARNESS ITSELF (negative controls) ───────────────────');
  reset({ allIPs: 300 });
  r = await call(verdictBody(100));
  const fired = r._status === 429;
  reset({ allIPs: 0 });
  r = await call(verdictBody(100));
  check('the ceiling check can both fire and not fire', fired && r._status !== 429, 'fired at 300, clear at 0');
  check('the origin allowlist still refuses a stranger', (await call(verdictBody(100), 'https://evil.example'))._status === 403);

  console.log('\n' + (fail ? '  ' + fail + ' FAILED, ' : '  ') + pass + ' of ' + (pass + fail) + ' checks pass\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS THREW:', e); process.exit(2); });
