#!/usr/bin/env node
/*  TRAFFIC REPORT (2026-10-10). One local page, regenerated on demand, for the owner to open.
 *  Reads vv_events, verdict_cache, notes_cache, api_rate_events and waitlist_emails with the
 *  service key; writes _local/traffic.html, which is gitignored and never deployed (the
 *  .vercelignore allowlist does not name _local/). Nothing here touches the site.
 *
 *    node scripts/traffic-report.js          then open _local/traffic.html
 *
 *  WHAT EACH NUMBER CAN AND CANNOT SEE, so the page never claims more than it holds:
 *    - vv_events only records on vvonderxi.com and only since 2026-10-09 ~15:35 UTC, when the
 *      mixed test rows were cleared. Page VIEWS are Vercel's, dashboard-only, and are not here.
 *    - A "visit" exists only on Compare, where each page load makes a random code. Card opens
 *      and searches carry no visit, so they are counted as events, never as people.
 *    - api_rate_events prunes itself after 24 hours, so AI generations older than that are read
 *      from the caches instead, which count a pair or card only the FIRST time it was generated.
 *    - Costs are estimates at cold-cache rates (SS D: verdict ~$0.037, note ~$0.043), not a bill.
 *    - Waitlist addresses are never written to the page, only counts by source.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const CLEAN_FROM = '2026-10-09T15:35:00Z';      // vv_events cleared of test rows
const FLIP = '2026-10-08T17:00:00Z';            // production began serving the platform
const COST = { verdict: 0.037, notes: 0.043 };
const OUT = path.join(__dirname, '..', '_local', 'traffic.html');

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yr = y => String(y).slice(2) + '/' + String(y + 1).slice(2);
const day = t => t.slice(0, 10);

async function all(table, cols, build) {
  const out = [];
  for (let o = 0; ; o += 1000) {
    let q = sb.from(table).select(cols).range(o, o + 999);
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/* ── charts, plain SVG so the page needs no library and no network ── */
function bars(rows, opts) {                      // rows: [{label, value, note}]
  const w = 640, rowH = 34, pad = 210, max = Math.max(1, ...rows.map(r => r.value));
  const h = rows.length * rowH + 8;
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="${esc(opts.title)}">`;
  rows.forEach((r, i) => {
    const y = i * rowH + 4, bw = Math.max(r.value ? 3 : 0, (w - pad - 70) * r.value / max);
    s += `<text x="${pad - 12}" y="${y + 20}" text-anchor="end" class="cl">${esc(r.label)}</text>`;
    s += `<rect x="${pad}" y="${y + 6}" width="${bw}" height="20" rx="3" class="${r.cls || 'b'}"/>`;
    s += `<text x="${pad + bw + 8}" y="${y + 21}" class="cv">${r.value}${r.note ? ' <tspan class="cn">' + esc(r.note) + '</tspan>' : ''}</text>`;
  });
  return s + '</svg>';
}
function daily(days, series) {                   // stacked columns per day
  const w = 640, h = 220, left = 34, bottom = 28, n = Math.max(1, days.length);
  const totals = days.map(d => series.reduce((a, s) => a + (s.data[d] || 0), 0));
  const max = Math.max(1, ...totals), colW = Math.min(64, (w - left - 10) / n - 10);
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Events per day">`;
  for (let g = 0; g <= 4; g++) {
    const v = Math.round(max * g / 4), y = h - bottom - (h - bottom - 12) * g / 4;
    s += `<line x1="${left}" x2="${w}" y1="${y}" y2="${y}" class="grid"/><text x="${left - 6}" y="${y + 4}" text-anchor="end" class="ax">${v}</text>`;
  }
  days.forEach((d, i) => {
    const x = left + 10 + i * ((w - left - 10) / n);
    let y = h - bottom;
    series.forEach(sr => {
      const v = sr.data[d] || 0, bh = (h - bottom - 12) * v / max;
      if (v) { y -= bh; s += `<rect x="${x}" y="${y}" width="${colW}" height="${bh}" class="${sr.cls}"><title>${esc(sr.name)}: ${v}</title></rect>`; }
    });
    s += `<text x="${x + colW / 2}" y="${h - 10}" text-anchor="middle" class="ax">${esc(d.slice(5))}</text>`;
  });
  return s + '</svg>';
}

(async () => {
  const [ev, verdicts, notes, rate, wait] = await Promise.all([
    all('vv_events', 'id,kind,key,created_at', q => q.gte('created_at', CLEAN_FROM).order('id')),
    all('verdict_cache', 'pair_key,card_id_a,card_id_b,created_at', q => q.gte('created_at', FLIP).order('pair_key')),
    all('notes_cache', 'card_id,created_at', q => q.gte('created_at', FLIP).order('card_id')),
    all('api_rate_events', 'ip,kind,started_at', q => q.order('id')),
    all('waitlist_emails', 'source,created_at', q => q.order('id')),
  ]);

  // names for every card the page mentions, read from the matview, never the view (SS C)
  const ids = new Set();
  ev.forEach(e => { if (e.kind === 'card') ids.add(+e.key); if (e.kind === 'compare') e.key.split('-').forEach(x => ids.add(+x)); });
  verdicts.forEach(v => { ids.add(v.card_id_a); ids.add(v.card_id_b); });
  notes.forEach(n => ids.add(n.card_id));
  const C = new Map();
  const idl = [...ids].filter(Boolean);
  for (let i = 0; i < idl.length; i += 200) {
    const { data, error } = await sb.from('player_card_mv').select('card_id,player_name,team_name,season_year,rt').in('card_id', idl.slice(i, i + 200));
    if (error) throw error;
    data.forEach(c => C.set(c.card_id, c));
  }
  const cardCell = id => {
    const c = C.get(+id);
    if (!c) return `<span class="mut">card ${esc(id)}</span>`;
    return `<a href="https://vvonderxi.com/card?id=${c.card_id}">${esc(c.player_name)}</a> <span class="mut">${yr(c.season_year)}, ${esc(c.team_name)}</span>`;
  };
  const vv = id => { const c = C.get(+id); return c && c.rt != null ? c.rt : 'NR'; };

  /* ── events per day ── */
  const kinds = { card: 'Card opens', compare: 'Comparisons', search_miss: 'Searches that found nothing' };
  const series = Object.keys(kinds).map((k, i) => ({ name: kinds[k], cls: 's' + i, data: {} }));
  const visits = {};                                  // Compare visits per day, by distinct code
  ev.forEach(e => {
    const d = day(e.created_at);
    const sr = series.find(s => s.name === kinds[e.kind]);
    if (sr) sr.data[d] = (sr.data[d] || 0) + 1;
    if (e.kind === 'cmp_step') (visits[d] = visits[d] || new Set()).add(e.key.split('|')[0]);
  });
  const vSeries = { name: 'Compare visits', cls: 's3', data: Object.fromEntries(Object.entries(visits).map(([d, s]) => [d, s.size])) };
  const days = [];
  for (let t = new Date(CLEAN_FROM.slice(0, 10)); t <= new Date(); t = new Date(t.getTime() + 864e5)) days.push(t.toISOString().slice(0, 10));

  /* ── the Compare funnel, one row per visit code ── */
  const vis = new Map();
  ev.filter(e => e.kind === 'cmp_step').forEach(e => {
    const [code, ...rest] = e.key.split('|');
    if (!vis.has(code)) vis.set(code, new Set());
    vis.get(code).add(rest.join('|'));
  });
  const has = (s, re) => [...s].some(x => re.test(x));
  const V = [...vis.values()];
  const steps = [
    ['Arrived on Compare', s => has(s, /^arrive:/)],
    ['Opened a picker themselves', s => has(s, /^open:[AB]:user/)],
    ['Searched', s => has(s, /^search:/)],
    ['Picked a first player', s => has(s, /^pick:/) || s.has('suggested') || has(s, /^arrive:(one|pair)/)],
    ['Had both players', s => (s.has('pick:A') && s.has('pick:B')) || s.has('suggested') || has(s, /^arrive:pair/) || (has(s, /^arrive:one/) && has(s, /^pick:/))],
    ['Pressed Compare', s => s.has('press')],
    ['Saw a verdict', s => has(s, /^verdict:(shown|keeper)/)],
  ];
  const funnel = steps.map(([label, f], i) => ({ label, value: V.filter(f).length, cls: i === steps.length - 1 ? 'bp' : 'b' }));
  const arrivals = {};
  V.forEach(s => [...s].filter(x => x.startsWith('arrive:')).forEach(x => { const k = x.slice(7).replace(':', ', '); arrivals[k] = (arrivals[k] || 0) + 1; }));
  const fails = {};
  V.forEach(s => [...s].filter(x => /^verdict:/.test(x) && !/shown|keeper/.test(x)).forEach(x => { fails[x.slice(8)] = (fails[x.slice(8)] || 0) + 1; }));

  /* ── cards, pairs, misses ── */
  const tally = (arr) => { const m = {}; arr.forEach(k => m[k] = (m[k] || 0) + 1); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const topCards = tally(ev.filter(e => e.kind === 'card').map(e => e.key));
  const pairsRun = tally(ev.filter(e => e.kind === 'compare').map(e => e.key));
  const misses = {};
  ev.filter(e => e.kind === 'search_miss').forEach(e => { const k = e.key.toLowerCase(); misses[k] = misses[k] || { n: 0, last: '' }; misses[k].n++; misses[k].last = e.created_at; });
  // a search fires per typing pause, so "marado", "maradon", "maradona" are one person typing: fold prefixes into the longest
  const mk = Object.keys(misses).sort((a, b) => b.length - a.length), folded = [];
  mk.forEach(k => { const host = folded.find(f => f.q.startsWith(k)); if (host) host.n += misses[k].n; else folded.push({ q: k, n: misses[k].n, last: misses[k].last }); });
  folded.sort((a, b) => b.n - a.n);

  /* ── AI generations ── */
  const gen = { verdict: 0, notes: 0 }, refused = {}, addrs = new Set();
  rate.forEach(r => { addrs.add(r.ip); if (gen[r.kind] != null) gen[r.kind]++; else refused[r.kind] = (refused[r.kind] || 0) + 1; });
  const cost24 = gen.verdict * COST.verdict + gen.notes * COST.notes;
  const costFlip = verdicts.length * COST.verdict + notes.length * COST.notes;

  /* ── waitlist ── */
  const bySource = {};
  wait.forEach(w => { const k = w.source || 'unknown'; bySource[k] = bySource[k] || { n: 0, last: '' }; bySource[k].n++; bySource[k].last = w.created_at; });
  const waitSince = wait.filter(w => w.created_at >= FLIP).length;

  /* ── the page ── */
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const stat = (n, l) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`;
  const table = (head, rows) => rows.length
    ? `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p class="empty">Nothing yet.</p>';
  const legend = series.concat([vSeries]).map(s => `<span><i class="${s.cls}"></i>${esc(s.name)}</span>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VVonderXI Traffic</title><link rel="stylesheet" href="../fonts/vv-fonts.css">
<style>
:root{--charcoal:#1C1B1A;--ink-soft:#5f594e;--pink:#E70443;--pink-ink:#AD0332;--gold:#A8760F;--line:rgba(28,27,26,.12);--card:#FBF8F2}
*{box-sizing:border-box}
body{margin:0;color:var(--charcoal);font:15px/1.55 'Inter',system-ui,sans-serif;background:radial-gradient(900px 500px at 16% -80px,rgba(218,41,28,.08),transparent 60%),linear-gradient(180deg,#EEF4F6 0%,#ECEFE6 48%,#E9E0D0 100%);min-height:100vh}
.wrap{max-width:980px;margin:0 auto;padding:40px 24px 80px}
.mark{font:900 15px 'Archivo',sans-serif;letter-spacing:.04em}.mark .p{color:var(--pink)}
h1{font:800 44px/1.05 'Bricolage Grotesque','Archivo',sans-serif;margin:10px 0 6px;letter-spacing:-.02em}
.sub{color:var(--ink-soft);margin:0 0 28px;max-width:62ch}
h2{font:700 13px 'Barlow Condensed',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--pink-ink);margin:0 0 4px}
h3{font:700 22px/1.2 'Bricolage Grotesque','Archivo',sans-serif;margin:0 0 14px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin:0 0 18px;box-shadow:0 18px 40px -30px rgba(28,27,26,.35)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 18px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.stat .n{font:800 34px/1 'Archivo',sans-serif}.stat .l{color:var(--ink-soft);font-size:13px;margin-top:6px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media(max-width:760px){.grid2{grid-template-columns:1fr}h1{font-size:34px}}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;font:700 12px 'Barlow Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}td.r,th.r{text-align:right}
a{color:var(--charcoal);font-weight:600;text-decoration:none;border-bottom:1px solid rgba(231,4,67,.35)}a:hover{color:var(--pink-ink)}
.mut{color:var(--ink-soft);font-size:13px}.empty{color:var(--ink-soft);font-style:italic}
.note{color:var(--ink-soft);font-size:13px;margin:12px 0 0;max-width:72ch}
.chart{width:100%;height:auto;display:block}.cl{font:500 13px 'Inter',sans-serif;fill:var(--charcoal)}.cv{font:800 14px 'Archivo',sans-serif;fill:var(--charcoal)}.cn{font:400 12px 'Inter';fill:var(--ink-soft)}
.ax{font:500 11px 'Inter',sans-serif;fill:var(--ink-soft)}.grid{stroke:var(--line)}
.b{fill:#cfc6b4}.bp,.s1{fill:var(--pink)}.s0{fill:var(--charcoal)}.s2{fill:var(--gold)}.s3{fill:#8FA3A8}
.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--ink-soft);margin:10px 0 0}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}
.legend i.s0{background:var(--charcoal)}.legend i.s1{background:var(--pink)}.legend i.s2{background:var(--gold)}.legend i.s3{background:#8FA3A8}
.vv{font:800 15px 'Archivo',sans-serif}
</style></head><body><div class="wrap">
<div class="mark">V<span class="p">V</span>onderXI</div>
<h1>Traffic</h1>
<p class="sub">What visitors did on vvonderxi.com since ${esc(CLEAN_FROM.slice(0, 16).replace('T', ' '))} UTC. Generated ${esc(now)}. Page views live in Vercel's dashboard and are not on this page.</p>
<div class="stats">
${stat(ev.filter(e => e.kind === 'card').length, 'card opens')}
${stat(V.length, 'Compare visits')}
${stat(ev.filter(e => e.kind === 'compare').length, 'comparisons run')}
${stat(folded.length, 'searches that found nothing')}
${stat(gen.verdict + gen.notes, 'AI generations, last 24 hours')}
${stat(waitSince, 'waitlist signups since launch')}
</div>
<div class="panel"><h2>Every day</h2><h3>Events per day</h3>${daily(days, series.concat([vSeries]))}<div class="legend">${legend}</div>
<p class="note">A card open is counted each time a card loads, so stepping through one player's seasons counts every season. Only Compare carries a visit, so the grey bars are people on Compare and the rest are events.</p></div>
<div class="panel"><h2>Compare</h2><h3>How far visits got</h3>${bars(funnel, { title: 'Compare funnel' })}
<p class="note">${V.length ? 'Arrived as: ' + Object.entries(arrivals).map(([k, n]) => esc(k) + ' ' + n).join(', ') + '. ' : ''}${Object.keys(fails).length ? 'Verdicts that failed: ' + Object.entries(fails).map(([k, n]) => esc(k) + ' ' + n).join(', ') + '. ' : ''}On desktop both pickers open by themselves, so "opened a picker" counts only a picker the visitor opened.</p></div>
<div class="grid2">
<div class="panel"><h2>Cards</h2><h3>Most opened</h3>${table(['Card', '<span class="r">VV</span>', '<span class="r">Opens</span>'], topCards.slice(0, 20).map(([id, n]) => [cardCell(id), `<span class="vv">${vv(id)}</span>`, n]))}</div>
<div class="panel"><h2>Compare</h2><h3>Pairs compared</h3>${table(['Pair', 'Runs'], pairsRun.slice(0, 20).map(([k, n]) => [k.split('-').map(cardCell).join('<br>'), n]))}
<p class="note">Pairs whose verdict was first written since launch, which catches comparisons made before the events existed:</p>
${table(['Pair', 'First generated'], verdicts.sort((a, b) => a.created_at < b.created_at ? 1 : -1).slice(0, 12).map(v => [cardCell(v.card_id_a) + '<br>' + cardCell(v.card_id_b), esc(v.created_at.slice(5, 16).replace('T', ' '))]))}</div>
</div>
<div class="grid2">
<div class="panel"><h2>Search</h2><h3>Searches that found nothing</h3>${table(['Typed', 'Times', 'Last'], folded.slice(0, 25).map(f => [esc(f.q), f.n, esc(f.last.slice(5, 16).replace('T', ' '))]))}
<p class="note">A search is recorded at each pause in typing, so partial words are folded into the longest one.</p></div>
<div class="panel"><h2>AI</h2><h3>Generations and cost</h3>${table(['', '<span class="r">Count</span>', '<span class="r">Est. cost</span>'], [
    ['Verdicts, last 24 hours', gen.verdict, '$' + (gen.verdict * COST.verdict).toFixed(2)],
    ['Card notes, last 24 hours', gen.notes, '$' + (gen.notes * COST.notes).toFixed(2)],
    ...Object.entries(refused).map(([k, n]) => [esc(k.replace('refused:', 'Refused, ')) + ', last 24 hours', n, '']),
    ['New verdicts since launch', verdicts.length, '$' + (verdicts.length * COST.verdict).toFixed(2)],
    ['New card notes since launch', notes.length, '$' + (notes.length * COST.notes).toFixed(2)],
  ])}
<p class="note">${addrs.size} address${addrs.size === 1 ? '' : 'es'} in the last 24 hours. Costs are estimates at cold rates (24h $${cost24.toFixed(2)}, since launch $${costFlip.toFixed(2)}); the Anthropic console is the bill. "Since launch" counts a pair or card only the first time it was ever generated, so regenerations after a prompt change are missing from it.</p></div>
</div>
<div class="panel"><h2>Waitlist</h2><h3>Signups by source</h3>${table(['Source', 'Signups', 'Latest'], Object.entries(bySource).map(([k, v]) => [esc(k), v.n, esc(v.last.slice(0, 10))]))}</div>
</div></body></html>`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);
  console.log('wrote', path.relative(process.cwd(), OUT), '| events', ev.length, '| compare visits', V.length, '| cards named', C.size);
})().catch(e => { console.error('traffic report failed:', e.message); process.exit(1); });
