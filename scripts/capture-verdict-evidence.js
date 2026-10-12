#!/usr/bin/env node
/*  CAPTURE THE EXACT MESSAGE COMPARE SENDS FOR A PAIR, WITHOUT SENDING IT (2026-10-12).
 *
 *    node scripts/capture-verdict-evidence.js [--limit N]   -> _local/verdict-check/evidence.json
 *
 *  The checking pass (api/analyse.js, checkVerdictSupport) compares a verdict with the user message
 *  its writer received. The cache stores the prose but not that message, and rebuilding it here
 *  would be a second implementation of compare.html's builder, which SS C rules out: a script that
 *  assembles a function's inputs has taken on the page's job and can fail at it. So this opens the
 *  SHIPPING compare.html in headless Chrome, served from this repo on a private port, presses the
 *  page's own Compare control, and intercepts the request to /api/analyse before it leaves. The
 *  page is answered with a held response, so no model is called, nothing is billed, nothing is
 *  written; the event beacon fires only on the live domain, so it writes nothing either.
 *
 *  For each cached verdict pair it records the request body (messages, payloadRev, statsRev, rt,
 *  judge) beside the cached row's version string, so the calibration can use only rows whose
 *  evidence matches what the page sends today (same payloadRev and statsRev segments).
 */
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { spawn } = require('child_process');
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_local', 'verdict-check', 'evidence.json');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i > 0 ? +process.argv[i + 1] : Infinity; })();
const CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const TY = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve() {
  return new Promise(r => { const s = http.createServer((q, res) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TY[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0, '127.0.0.1', () => r(s)); });
}
async function cdp(u) {
  const ws = new WebSocket(u); let id = 0; const w = new Map();
  await new Promise((a, b) => { ws.onopen = a; ws.onerror = b; });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && w.has(m.id)) { const x = w.get(m.id); w.delete(m.id); m.error ? x.rej(new Error(m.error.message)) : x.res(m.result); } };
  const send = (m, p = {}) => new Promise((res, rej) => { const i = ++id; w.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  return { send, ev, close: () => ws.close() };
}
/*  Installed before any page script runs: the /api/analyse request is recorded and answered
    with a held response, so the page settles without a model call.  */
const INTERCEPT = `(function(){ var f = window.fetch; window.__vvCaptured = null;
  window.fetch = function(u, o){ if (String(u).indexOf('/api/analyse') >= 0) {
      try { window.__vvCaptured = JSON.parse(o.body); } catch (e) { window.__vvCaptured = { unparsed: String(o && o.body) }; }
      return Promise.resolve(new Response(JSON.stringify({ held: true, winner_card_id: null, cached: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
    return f.apply(this, arguments); }; })();`;

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const rows = [];
  for (let o = 0; ; o += 1000) {
    const { data, error } = await sb.from('verdict_cache').select('pair_key,card_id_a,card_id_b,cache_version,rt_a,rt_b').not('cache_version', 'is', null).order('pair_key').range(o, o + 999);
    if (error) throw new Error(error.message); rows.push(...data); if (data.length < 1000) break;
  }
  const todo = rows.slice(0, LIMIT);
  const srv = await serve(), port = srv.address().port;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vvcap-'));
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  const out = [];
  try {
    let dp; for (let i = 0; i < 100 && !dp; i++) { await sleep(100); const f = path.join(prof, 'DevToolsActivePort'); if (fs.existsSync(f)) dp = fs.readFileSync(f, 'utf8').split('\n')[0]; }
    const t = await (await fetch(`http://127.0.0.1:${dp}/json/new?about:blank`, { method: 'PUT' })).json();
    const p = await cdp(t.webSocketDebuggerUrl);
    await p.send('Page.enable'); await p.send('Page.addScriptToEvaluateOnNewDocument', { source: INTERCEPT });
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    /*  THE STAMP DEPENDS ON SLOT ORDER (statsRev is computed over the ordered pair), so a row
        written from b-then-a does not match a capture taken a-then-b. Try lowest id first, then
        the other order if the evidence does not match.  */
    const captureOnce = async (a, b) => {
      await p.send('Page.navigate', { url: `http://127.0.0.1:${port}/compare.html?a=${a}&b=${b}` });
      let pressed = false, body = null;
      for (let i = 0; i < 80 && !body; i++) {
        await sleep(250);
        if (!pressed) pressed = await p.ev(`(function(){ var s=document.querySelector('.settle'); if(!s||s.disabled||document.querySelectorAll('.vvcard').length<2) return false; s.click(); return true; })()`).catch(() => false);
        else body = await p.ev('window.__vvCaptured').catch(() => null);
      }
      return body;
    };
    for (const r of todo) {
      const seg = r.cache_version.split('-');
      const matches = b => !!b && seg[2] === String(b.payloadRev) && seg[3] === String(b.statsRev);
      let body = await captureOnce(r.card_id_a, r.card_id_b), order = 'lo-hi';
      if (!matches(body)) { const b2 = await captureOnce(r.card_id_b, r.card_id_a); if (matches(b2) || !body) { body = b2; order = 'hi-lo'; } }
      const entry = { pair_key: r.pair_key, cache_version: r.cache_version, rt: [r.rt_a, r.rt_b], captured: !!body, order };
      if (body) Object.assign(entry, { messages: body.messages, payloadRev: body.payloadRev || null, statsRev: body.statsRev || null, judge: body.judge || null,
        evidenceMatches: seg[2] === String(body.payloadRev) && seg[3] === String(body.statsRev) });
      out.push(entry);
      process.stdout.write(`${r.pair_key} ${body ? (entry.evidenceMatches ? 'match' : 'captured, evidence differs') : 'NOT CAPTURED'}\n`);
    }
    p.close();
  } finally { ch.kill(); srv.close(); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  const m = out.filter(x => x.evidenceMatches).length, c = out.filter(x => x.captured).length;
  console.log(`\n${out.length} pairs: ${c} captured, ${m} with evidence matching the cached row -> ${path.relative(ROOT, OUT)}`);
})().catch(e => { console.error('capture failed:', e.message); process.exit(1); });
