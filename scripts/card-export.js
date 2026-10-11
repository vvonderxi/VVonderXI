#!/usr/bin/env node
/*  CARD-FACE EXPORT (2026-10-11). One card, as a transparent PNG, from the REAL renderer.
 *
 *    node scripts/card-export.js <card_id> <width_px> [out.png]
 *    default output: _local/cards/card-<card_id>-<width>.png  (gitignored)
 *
 *  WHY THIS EXISTS. Marketing's Python card renderer drifted from the real card four times
 *  (geometry, rim, supersampling, shields) and never drew tags. This is not a third renderer:
 *  it opens the SHIPPING card.html in the installed Chrome, with the shipping shared script and
 *  the real database row, and screenshots the card element. Nothing about the card is
 *  re-implemented, so it cannot drift; when the card changes, the export changes with it.
 *
 *  IT IS THE CARD PAGE'S CARD, SPECIFICALLY. The card's outer frame is styled in each page
 *  rather than in the shared script (SS C: six page-level copies of the prestige frame, which
 *  differ by a hairline). This export is card.html's hero card. Do not present it as the
 *  rankings or Compare card.
 *
 *  HOW THE WIDTH WORKS. The card is laid out at its normal size on the card page and rendered
 *  at a higher pixel density to reach the requested width. It is NOT laid out at the target
 *  width: the card's smallest text has fixed minimum sizes, so a card laid out larger is not
 *  proportionally the same card. The output is exactly what a visitor sees, sharper.
 *
 *  WHAT IT DOES NOT DO, ON PURPOSE. It serves the repo on a private local port, so the page's
 *  event beacon (live domain only) writes nothing and the AI endpoint does not exist here, so no
 *  paid generation can fire. It needs the network for the database row and the player photo.
 *  Season arrows and any page furniture are hidden at capture time; the card itself is never
 *  restyled except to drop the page background behind it, which is what makes it transparent.
 *  THE CORNERS ARE NOT FULLY CLEAR, BY CHOICE: they carry the card's own drop shadow (measured at
 *  most 9% opacity). The same box-shadow declaration draws the card's rim, so removing it would
 *  remove the rim; the shadow is part of the card as it appears on the page.
 *
 *  NO DEPENDENCIES: it drives the installed Chrome over the DevTools protocol with Node's
 *  built-in WebSocket (Node 22+).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const [cardId, widthArg, outArg] = process.argv.slice(2);
if (!/^\d+$/.test(cardId || '') || !/^\d+$/.test(widthArg || '')) {
  console.error('usage: node scripts/card-export.js <card_id> <width_px> [out.png]'); process.exit(2);
}
const WIDTH = +widthArg;
const OUT = outArg || path.join(ROOT, '_local', 'cards', `card-${cardId}-${WIDTH}.png`);
const CHROME = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
if (!CHROME) { console.error('no Chrome found; set CHROME=/path/to/chrome'); process.exit(2); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/' || p === '') p = '/index.html';
      if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const wait = new Map();
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; wait.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  return { send, evaluate, close: () => ws.close() };
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vvcard-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--force-color-profile=srgb', `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  let page;
  try {
    let portFile = path.join(prof, 'DevToolsActivePort'), dport;
    for (let i = 0; i < 100 && !dport; i++) { await sleep(100); if (fs.existsSync(portFile)) dport = fs.readFileSync(portFile, 'utf8').split('\n')[0]; }
    if (!dport) throw new Error('Chrome did not open a DevTools port');
    const tab = await (await fetch(`http://127.0.0.1:${dport}/json/new?about:blank`, { method: 'PUT' })).json();
    page = await cdp(tab.webSocketDebuggerUrl);
    await page.send('Page.enable'); await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1800, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/card.html?id=${cardId}` });

    // wait for the real card: built, its photo decoded, fonts loaded
    let ready = false;
    for (let i = 0; i < 150 && !ready; i++) {
      await sleep(200);
      ready = await page.evaluate(`(function(){ var c=document.querySelector('#heroCard .vvcard'); if(!c||!c.querySelector('.cname')) return false;
        var imgs=[].slice.call(c.querySelectorAll('img')); return document.fonts.status==='loaded' && imgs.every(function(i){ return i.complete; }); })()`);
    }
    if (!ready) throw new Error('the card did not finish rendering in 30s (check the card_id and the network)');
    const shown = await page.evaluate(`(function(){ var c=document.querySelector('#heroCard .vvcard'); var n=c.querySelector('.cname'); return { name:n.innerText.replace(/\\s+/g,' ').trim(), cardIdOnPage:(new URLSearchParams(location.search)).get('id') }; })()`);
    if (String(shown.cardIdOnPage) !== String(cardId)) throw new Error('the page loaded a different card: ' + shown.cardIdOnPage);

    // capture-time styling only: no page background, no season arrows, no furniture over the card
    await page.evaluate(`(function(){ var s=document.createElement('style'); s.id='vvExportCapture';
      s.textContent='html,body{background:transparent!important;background-image:none!important}'
        +'body::before,body::after{display:none!important}'
        +'.seasonstep,.vv-totop,.bottomnav,.spine,.a2hs{display:none!important}';
      document.head.appendChild(s); return true; })()`);
    await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await sleep(150);

    const rect = await page.evaluate(`(function(){ var c=document.querySelector('#heroCard .vvcard'); c.scrollIntoView({block:'center'});
      var b=c.getBoundingClientRect(); return { x:b.left+window.scrollX, y:b.top+window.scrollY, w:b.width, h:b.height }; })()`);
    // Chrome rounds the clip to whole device pixels, so a first pass can land a pixel or two short of
    // the width asked for; one corrective pass scales by the measured shortfall.
    let scale = WIDTH / rect.w, buf;
    for (let pass = 0; pass < 3; pass++) {
      const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale } });
      buf = Buffer.from(shot.data, 'base64');
      const got = buf.readUInt32BE(16); if (got === WIDTH) break;
      scale = scale * WIDTH / got;
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, buf);
    const pw = buf.readUInt32BE(16), ph = buf.readUInt32BE(20);
    console.log(`${shown.name} (card ${cardId}) -> ${path.relative(process.cwd(), OUT)}  ${pw}x${ph}px, laid out at ${Math.round(rect.w)}x${Math.round(rect.h)} on card.html`);
  } finally {
    try { page && page.close(); } catch (e) {}
    chrome.kill('SIGTERM'); srv.close();
    setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} }, 500);
  }
})().catch(e => { console.error('card export failed:', e.message); process.exit(1); });
