#!/usr/bin/env node
/*  POSITION SUSPECT SCREEN (2026-10-09). Read-only: reads player_card_mv (never the view, SS C) and
 *  player_positions; writes local files only.
 *
 *  THE QUESTION: does a season's own stat profile look like the position it is labelled? Each card
 *  with 900+ minutes from 2016 on gets nine per-90 rates (goals, shots, key passes, assists,
 *  dribble attempts, tackles, interceptions, passes, fouls drawn), log-scaled and standardised by
 *  the median and spread of the whole population. Each pool's PROFILE is the median of its cards.
 *  A card is a SUSPECT when another pool's profile is clearly closer than its own: the margin is
 *  (distance to own pool) - (distance to the nearest other pool), in standard units.
 *
 *  It is a SCREEN, not a classifier. It ranks cards for a human to check and gives the rates that
 *  put each one there. It never writes a position. The profiles are built from labels that are
 *  partly wrong, which blurs them, so it errs toward missing cases, not inventing them.
 *
 *    node scripts/positions/screen-suspects.js <out.json>
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const F = ['goals', 'shots_total', 'passes_key', 'assists', 'dribbles_attempts', 'tackles_total', 'interceptions', 'passes_total', 'fouls_drawn'];
const LABEL = { goals: 'goals', shots_total: 'shots', passes_key: 'key passes', assists: 'assists', dribbles_attempts: 'dribbles', tackles_total: 'tackles', interceptions: 'interceptions', passes_total: 'passes', fouls_drawn: 'fouls drawn' };
const POOLS = ['FB', 'CB', 'CDM', 'CM', 'CAM', 'Winger', 'ST'];
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function load() {
  const out = [];
  for (let o = 0; ; o += 1000) {
    const { data, error } = await sb.from('player_card_mv')
      .select('card_id,api_player_id,player_name,team_name,season_year,league_code,position_pool,rt,minutes,' + F.join(','))
      .gte('season_year', 2016).gte('minutes', 900).order('card_id').range(o, o + 999);
    if (error) throw error; out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

function profile(cards) {
  const rows = cards.filter(c => POOLS.includes(c.position_pool) && F.every(f => c[f] != null));
  const tr = c => F.map(f => Math.log1p(90 * c[f] / c.minutes));
  rows.forEach(c => { c._x = tr(c); });
  const center = F.map((_, i) => med(rows.map(c => c._x[i])));
  const scale = F.map((_, i) => med(rows.map(c => Math.abs(c._x[i] - center[i]))) * 1.4826 || 1);
  rows.forEach(c => { c._z = c._x.map((v, i) => (v - center[i]) / scale[i]); });
  const prof = {};
  for (const p of POOLS) { const m = rows.filter(c => c.position_pool === p); prof[p] = F.map((_, i) => med(m.map(c => c._z[i]))); }
  const dist = (z, p) => Math.sqrt(z.reduce((s, v, i) => s + (v - prof[p][i]) ** 2, 0));
  for (const c of rows) {
    const own = dist(c._z, c.position_pool);
    let best = null, bd = Infinity; for (const p of POOLS) if (p !== c.position_pool) { const d = dist(c._z, p); if (d < bd) { bd = d; best = p; } }
    c.suggest = best; c.margin = own - bd;
    // the rates that most separate the label from the suggestion, in plain words
    const gaps = F.map((f, i) => ({ f, d: c._z[i] - prof[c.position_pool][i], toward: Math.abs(c._z[i] - prof[best][i]) < Math.abs(c._z[i] - prof[c.position_pool][i]) }));
    c.reasons = gaps.filter(g => g.toward).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3)
      .map(g => LABEL[g.f] + ' ' + (90 * c[g.f] / c.minutes).toFixed(2) + '/90 ' + (g.d > 0 ? 'high' : 'low') + ' for a ' + c.position_pool);
  }
  rows.marginFor = (c, label) => { const own = dist(c._z, label); let best = null, bd = Infinity; for (const p of POOLS) if (p !== label) { const d = dist(c._z, p); if (d < bd) { bd = d; best = p; } } return { margin: own - bd, suggest: best }; };
  return rows;
}

(async () => {
  const rows = profile(await load());
  fs.writeFileSync(process.argv[2], JSON.stringify(rows.map(c => ({ card_id: c.card_id, api_player_id: c.api_player_id, name: c.player_name, team: c.team_name, yr: c.season_year, lg: c.league_code, pool: c.position_pool, rt: c.rt, suggest: c.suggest, margin: +c.margin.toFixed(3), reasons: c.reasons }))));
  console.log('scored cards (2016+, 900+ minutes):', rows.length);
  /* VALIDATE=<file of {card_id: oldLabel, ...}> scores each listed card under that label, against the
     profiles built from today's labels, so a known-wrong label can be checked for whether it is flagged. */
  if (process.env.VALIDATE) {
    const V = JSON.parse(fs.readFileSync(process.env.VALIDATE, 'utf8')); const byId = new Map(rows.map(c => [String(c.card_id), c]));
    const res = Object.entries(V).map(([id, lab]) => { const c = byId.get(String(id)); if (!c) return null; const r = rows.marginFor(c, lab.old); return { id, name: c.player_name, yr: c.season_year, old: lab.old, truth: lab.truth, margin: +r.margin.toFixed(3), suggest: r.suggest }; }).filter(Boolean);
    fs.writeFileSync(process.env.VALIDATE + '.out.json', JSON.stringify(res));
    console.log('validated', res.length, 'of', Object.keys(V).length, '(the rest are under 900 minutes or pre-2016)');
  }
})();
