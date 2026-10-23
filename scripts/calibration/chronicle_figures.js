#!/usr/bin/env node
/*  THE CHRONICLE, READ AGAINST THE CARD IT SITS ON, FIGURES ONLY (2026-10-23, area 10).
 *
 *    node scripts/calibration/chronicle_figures.js   ->  _local/verdict-check/chronicle_<time>.json
 *
 *  Every Chronicle moment is hand-written in card.html and was shipped without being read against
 *  its card. Salah 24/25's said 28 goals on a card that says 29. The checkers treat the Chronicle as
 *  page text a reader can check, so a wrong line there would let prose that repeats it pass.
 *
 *  For every row of CHRONICLE_MAP: every card of that player and season is rendered from this repo
 *  in headless Chrome (capture.js's server and browser, every fold open), the moment's own words
 *  (quote and narrative; the scoreline and date line is left out, that is the hand pass) are the
 *  prose, and the rest of the rendered card plus the request the card sends is the page. The number
 *  binding of prose_checks.js then runs exactly as it does on the model's prose. No key, no model.
 *
 *  A flag here means "a figure the card does not show", which is two different things: a season
 *  figure the card CONTRADICTS (Salah's 28), or a match or part-season figure ("a hat-trick",
 *  "twelve in his first nine games") the card was never going to hold. The script cannot tell them
 *  apart; read every flag. Exits 1 if any moment fails to render.
 */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const A = require('../../api/analyse.js');
const { serve, cdp, sleep, INTERCEPT, OPEN_ALL, CHROME } = require('./capture.js');
const { extractNumbers, checkNumbers } = require('./prose_checks.js');
const ROOT = path.join(__dirname, '..', '..');

(async () => {
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const srv = await serve(), port = srv.address().port;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vvchron-'));
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
  const out = [];
  let failed = 0;
  try {
    let dp; for (let i = 0; i < 100 && !dp; i++) { await sleep(100); const f = path.join(prof, 'DevToolsActivePort'); if (fs.existsSync(f)) dp = fs.readFileSync(f, 'utf8').split('\n')[0]; }
    if (!dp) throw new Error('Chrome did not start');
    const t = await (await fetch(`http://127.0.0.1:${dp}/json/new?about:blank`, { method: 'PUT' })).json();
    const p = await cdp(t.webSocketDebuggerUrl);
    await p.send('Page.enable'); await p.send('Page.addScriptToEvaluateOnNewDocument', { source: INTERCEPT });
    await p.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // the map and the moments, read from the page itself, not re-parsed from the file
    await p.send('Page.navigate', { url: `http://127.0.0.1:${port}/card.html` });
    let map = null;
    for (let i = 0; i < 60 && !map; i++) { await sleep(250); map = await p.ev(`typeof CHRONICLE_MAP!=='undefined' ? CHRONICLE_MAP : null`).catch(() => null); }
    const moments = await p.ev(`SIGNATURE_MOMENTS`);
    const unmapped = Object.keys(moments).filter(k => !map.some(r => r.key === k));
    console.log(`${Object.keys(moments).length} moments, ${map.length} in the map, unreachable: ${unmapped.join(', ') || 'none'}\n`);

    for (const row of map) {
      const m = moments[row.key];
      const prose = [m.quote].concat(m.narrative || []).join(' ');
      const states = extractNumbers(prose).length;
      const { data, error } = await db.from('player_card_mv').select('card_id').eq('api_player_id', row.api).eq('season', row.season);
      if (error) throw new Error(error.message);
      if (!data.length) { console.log(`${row.key}  NO CARD for api ${row.api} season ${row.season}`); out.push({ key: row.key, cards: [], rendered: false }); failed++; continue; }
      for (const { card_id } of data) {
        await p.send('Page.navigate', { url: `http://127.0.0.1:${port}/card.html?id=${card_id}` });
        let body = null;
        for (let i = 0; i < 120 && !body; i++) { await sleep(250); body = await p.ev(`(window.__vvCaptured||[]).filter(function(b){return b && b.mode==='notes';})[0] || null`).catch(() => null); }
        await sleep(2500);
        const full = await p.ev(OPEN_ALL).catch(() => '');
        const chron = await p.ev(`(function(){ var l=document.getElementById('chronicleLayer'); return l && l.style.display!=='none' ? l.innerText : null; })()`).catch(() => null);
        if (!body || !full || chron == null) {
          console.log(`${row.key}  card ${card_id}  ${!body ? 'NO CARD REQUEST' : chron == null ? 'CHRONICLE NOT SHOWN' : 'NO PAGE TEXT'}`);
          out.push({ key: row.key, card_id, rendered: false }); failed++; continue;
        }
        // the page is the card WITHOUT its own Chronicle, or every Chronicle figure would match itself
        const ev = { evidence: A.notesUserMessage(body.player || {}), page: { cards: { [card_id]: full.replace(chron, '') } } };
        const { flags, unbound } = checkNumbers(prose, ev);
        out.push({ key: row.key, card_id, rendered: true, states, flags, unbound });
        console.log(`${row.key}  card ${card_id}  ${states} figure${states === 1 ? '' : 's'}, ${flags.length} flagged` + flags.map(f => `\n    ${f.why}  |  ${f.quote}`).join(''));
      }
    }
    p.close();
  } finally { ch.kill(); srv.close(); }
  const file = path.join(ROOT, '_local', 'verdict-check', `chronicle_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(out, null, 1));
  const ok = out.filter(x => x.rendered), withFig = ok.filter(x => x.states), flagged = ok.filter(x => x.flags.length);
  console.log(`\n${ok.length} cards rendered, ${failed} failed; ${withFig.length} state a figure; ${flagged.length} carry a flag -> ${path.relative(ROOT, file)}`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('chronicle pass failed:', e.message); process.exit(1); });
