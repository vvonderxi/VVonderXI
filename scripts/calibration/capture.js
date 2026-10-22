#!/usr/bin/env node
/*  CAPTURE WHAT THE PAGES SEND TODAY FOR THE CALIBRATION SET (2026-10-22).
 *
 *    node scripts/calibration/capture.js   ->  _local/verdict-check/evidence_set.json
 *
 *  The checker judges prose against the message its writer receives. The calibration asks whether
 *  the stored prose of the twelve readings agrees with what the reader sees NOW, so the evidence is
 *  what the pages send TODAY, not what they sent when the prose was written.
 *
 *  Not a second implementation of the builders: it opens the SHIPPING compare.html and card.html in
 *  headless Chrome, served from this repo on a private port, and records the request each page makes
 *  to /api/analyse. The request is answered with a held/off response before it leaves the browser,
 *  so no model is called, nothing is billed and nothing is written; the event beacon fires only on
 *  the live domain. Verdicts: the page's own Compare control is pressed. Notes: the card page asks
 *  for its notes on load, and the endpoint's notesUserMessage turns that payload into the message.
 *
 *  Every item must capture, or the run exits 1: a calibration over a partial set is a different set.
 *
 *  --audit ALSO CHECKS THE RULE "THE WRITER MUST NOT STATE A NUMBER THE READER CANNOT CHECK" ON THE
 *  REQUEST THE PAGE ACTUALLY SENDS (added 2026-10-22, after a check of the shared builder alone missed
 *  the starts the card page added to its own keeper block). For a verdict the reader's pages are
 *  Compare and both cards; for notes, the card. Every number in the DATA part of the request is
 *  looked for in those pages' rendered text, folds opened. Numbers it cannot find are listed with
 *  their field. Derived figures (a sum, a difference) are not in the data part and are not checked.
 */
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { spawn } = require('child_process');
const A = require('../../api/analyse.js');
const ROOT = path.join(__dirname, '..', '..');
const SET = JSON.parse(fs.readFileSync(path.join(__dirname, 'verdict_check_set.json'), 'utf8'));
const OUT = path.join(ROOT, '_local', 'verdict-check', 'evidence_set.json');
const CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const TY = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const AUDIT = process.argv.includes('--audit');

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
/*  Installed before any page script runs. Every /api/analyse request is recorded; the page gets
    the shape the live endpoint returns while prose is off, so it settles without a model call.  */
const INTERCEPT = `(function(){ var f = window.fetch; window.__vvCaptured = [];
  window.fetch = function(u, o){ if (String(u).indexOf('/api/analyse') >= 0) {
      var b = null; try { b = JSON.parse(o.body); } catch (e) { b = { unparsed: String(o && o.body) }; }
      window.__vvCaptured.push(b);
      var notes = b && b.mode === 'notes';
      return Promise.resolve(new Response(JSON.stringify(notes ? { off: true } : { held: true, off: true, winner_card_id: null, cached: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })); }
    return f.apply(this, arguments); }; })();`;

/*  The data part of a verdict message: the two player lines, which carry every figure. The rest of
    the message is instruction text, whose numbers ("max ~14 words") are not claims about anyone.  */
function dataLines(ev) { return ev.split('\n').filter(l => /; dimensions: /.test(l)).join('\n'); }
function auditNumbers(data, pages) {
  const P = pages.replace(/(\d),(\d{3})/g, '$1$2'), nums = new Set(P.match(/\d+(?:\.\d+)?/g) || []);
  const has = n => nums.has(n) || nums.has(String(+n)) || nums.has((+n).toFixed(1)) || nums.has((+n).toFixed(2)) || nums.has(String(Math.round(+n)));
  const out = [], D = data.replace(/(\d),(\d{3})/g, '$1$2'), re = /("?[A-Za-z_][A-Za-z_ \/]*"?\s*[:=]?\s*)?(-?\d+(?:\.\d+)?)/g; let m;
  while ((m = re.exec(D))) { const n = m[2].replace(/^-/, ''); if (/^(19|20)\d\d$/.test(n) || /^\d{6}$/.test(n)) continue;
    if (!has(n)) out.push(((m[1] || '').replace(/[":=\s]+/g, ' ').trim().split(' ').slice(-2).join(' ') + ' ' + n).trim()); }
  return [...new Set(out)];
}

(async () => {
  const srv = await serve(), port = srv.address().port;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vvcal-'));
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  const out = [];
  try {
    let dp; for (let i = 0; i < 100 && !dp; i++) { await sleep(100); const f = path.join(prof, 'DevToolsActivePort'); if (fs.existsSync(f)) dp = fs.readFileSync(f, 'utf8').split('\n')[0]; }
    if (!dp) throw new Error('Chrome did not start');
    const t = await (await fetch(`http://127.0.0.1:${dp}/json/new?about:blank`, { method: 'PUT' })).json();
    const p = await cdp(t.webSocketDebuggerUrl);
    await p.send('Page.enable'); await p.send('Page.addScriptToEvaluateOnNewDocument', { source: INTERCEPT });
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const pageText = async url => {
      await p.send('Page.navigate', { url });
      for (let i = 0; i < 120; i++) { await sleep(250); const ok = await p.ev(`!!(window.D || (window.CMP_A && window.CMP_B))`).catch(() => false); if (ok) break; }
      await sleep(3500);
      return p.ev(`(function(){ document.querySelectorAll('details').forEach(function(x){x.open=true;}); document.querySelectorAll('.layer').forEach(function(x){x.classList.add('open');}); return document.body.innerText; })()`);
    };
    for (const it of SET.items) {
      let body = null;
      if (it.type === 'verdict') {
        await p.send('Page.navigate', { url: `http://127.0.0.1:${port}/compare.html?a=${it.cards[0]}&b=${it.cards[1]}` });
        let pressed = false;
        for (let i = 0; i < 120 && !body; i++) {
          await sleep(250);
          if (!pressed) pressed = await p.ev(`(function(){ var s=document.querySelector('.settle'); if(!s||s.disabled||document.querySelectorAll('.vvcard').length<2) return false; s.click(); return true; })()`).catch(() => false);
          else body = await p.ev(`(window.__vvCaptured||[]).filter(function(b){return b && b.messages;})[0] || null`).catch(() => null);
        }
      } else {
        await p.send('Page.navigate', { url: `http://127.0.0.1:${port}/card.html?id=${it.cards[0]}` });
        for (let i = 0; i < 120 && !body; i++) {
          await sleep(250);
          body = await p.ev(`(window.__vvCaptured||[]).filter(function(b){return b && b.mode==='notes';})[0] || null`).catch(() => null);
        }
      }
      if (!body) { console.log(`${it.id}  NOT CAPTURED`); out.push({ id: it.id, captured: false }); continue; }
      const evidence = it.type === 'verdict'
        ? body.messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n\n')
        : A.notesUserMessage(body.player || {});
      const entry = { id: it.id, captured: true, evidence, chars: evidence.length };
      if (AUDIT) {
        let pages = '';
        if (it.type === 'verdict') pages += await p.ev(`(function(){ document.querySelectorAll('details').forEach(function(x){x.open=true;}); document.querySelectorAll('.layer').forEach(function(x){x.classList.add('open');}); return document.body.innerText; })()`);
        for (const c of it.cards) pages += '\n' + await pageText(`http://127.0.0.1:${port}/card.html?id=${c}`);
        entry.unchecked = auditNumbers(it.type === 'verdict' ? dataLines(evidence) : JSON.stringify(body.player || {}), pages);
      }
      out.push(entry);
      console.log(`${it.id}  captured, ${evidence.length} chars` + (AUDIT ? `, ${entry.unchecked.length ? 'NOT ON ANY PAGE: ' + entry.unchecked.join('; ') : 'every number found on the pages'}` : ''));
    }
    p.close();
  } finally { ch.kill(); srv.close(); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ captured_at: new Date().toISOString(), items: out }, null, 1));
  const miss = out.filter(x => !x.captured).length;
  console.log(`\n${out.length - miss} of ${out.length} captured -> ${path.relative(ROOT, OUT)}`);
  process.exit(miss ? 1 : 0);
})().catch(e => { console.error('capture failed:', e.message); process.exit(1); });
