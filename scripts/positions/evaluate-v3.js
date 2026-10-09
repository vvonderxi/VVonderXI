#!/usr/bin/env node
/*  EVALUATE v3 AND BUILD THE PROPOSED POOLS (2026-10-09, position fix step 3). Writes nothing to the
 *  database. Reads lineup_slots, player_positions and the matview; writes two local files.
 *
 *  1. TRUTH SET. Rows whose stored position disagrees with their own v2 lineup tally were written by
 *     hand research (the importer always stores its own tally), so the stored value there is a
 *     research answer. It is a TOP-HEAVY set (research went to famous cards first, SS C's rule on
 *     validation sets chosen by prominence), so its agreement rate is a necessary gate, never a
 *     sufficient one. Reported by era, because the provider's grid is spatial only from 2022.
 *  2. PROPOSAL. For each card: override if research wrote it, else v3 where v3 is trusted (2022+),
 *     else the stored position unchanged. Writes { card_id: newPool } for every card that changes.
 *
 *    node scripts/positions/evaluate-v3.js <out-overrides.json> <out-report.json>
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const C = require('./classify-v3.js');
const V2B = { GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', CDM: 'CDM', CM: 'CM', CAM: 'CAM', LW: 'Winger', RW: 'Winger', ST: 'ST' };
const nb = x => V2B[x] || x;
const TRUST_FROM = 2022;
const page = async (q) => { const out = []; for (let o = 0; ; o += 1000) { const { data, error } = await q().range(o, o + 999); if (error) throw error; out.push(...data); if (data.length < 1000) break; } return out; };

(async () => {
  const pp = await page(() => sb.from('player_positions').select('api_player_id,season_year,league_code,position,distribution').order('api_player_id').order('season_year').order('league_code'));
  const slots = await page(() => sb.from('lineup_slots').select('api_player_id,season_year,league_code,formation,grid_row,grid_col,row_width,pos').order('fixture_id').order('team_id').order('api_player_id'));
  const by = new Map();
  for (const s of slots) { const k = s.api_player_id + '|' + s.season_year + '|' + s.league_code; if (!by.has(k)) by.set(k, []); by.get(k).push(s); }
  const v3 = new Map(); for (const [k, ss] of by) v3.set(k, C.seasonPosition(ss));

  // 1. truth set
  const truth = new Map(); const ev = {};
  for (const r of pp) {
    const d = r.distribution; if (!d || !r.position || r.position === 'UNK') continue;
    const mx = Math.max(...Object.values(d)); const tally = Object.keys(d).filter(k => d[k] === mx).map(nb);
    if (tally.includes(nb(r.position))) continue;
    const k = r.api_player_id + '|' + r.season_year + '|' + r.league_code; truth.set(k, r.position);
    const era = r.season_year >= TRUST_FROM ? '2022+' : '2016-21'; const v = v3.get(k);
    ev[era] = ev[era] || { n: 0, agree: 0, nov3: 0, confusion: {} };
    if (!v || !v.pos) { ev[era].nov3++; continue; }
    ev[era].n++; if (v.pos === r.position) ev[era].agree++; else { const c = r.position + '->' + v.pos; ev[era].confusion[c] = (ev[era].confusion[c] || 0) + 1; }
  }
  // structural check: bucket shares by era, stored vs v3
  const share = {};
  for (const [k, v] of v3) { if (!v.pos) continue; const y = +k.split('|')[1]; share[y] = share[y] || { n: 0 }; share[y].n++; share[y][v.pos] = (share[y][v.pos] || 0) + 1; }

  // 2. proposal over cards
  const mv = await page(() => sb.from('player_card_mv').select('card_id,api_player_id,season_year,league_code,position_pool,player_name,team_name,rt').order('card_id'));
  const ov = {}, why = {};
  for (const c of mv) {
    const k = c.api_player_id + '|' + c.season_year + '|' + c.league_code;
    let tgt = null, src = null;
    if (truth.has(k)) { tgt = truth.get(k); src = 'override'; }
    else if (c.season_year >= TRUST_FROM && v3.get(k) && v3.get(k).pos) { tgt = v3.get(k).pos; src = 'v3'; }
    if (!tgt || tgt === c.position_pool) continue;
    if (c.position_pool == null && src === 'v3') { /* a null pool gaining one is a real change, counted */ }
    ov[c.card_id] = tgt; why[c.card_id] = { src, from: c.position_pool, to: tgt, name: c.player_name, team: c.team_name, yr: c.season_year, lg: c.league_code, rt: c.rt, counts: (v3.get(k) || {}).counts };
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(ov));
  fs.writeFileSync(process.argv[3], JSON.stringify({ ev, share, why }));
  const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
  for (const e of Object.keys(ev)) console.log('truth set', e, ': v3 agrees', ev[e].agree, '/', ev[e].n, pct(ev[e].agree, ev[e].n), '| no v3', ev[e].nov3, '| top confusions', JSON.stringify(Object.entries(ev[e].confusion).sort((a, b) => b[1] - a[1]).slice(0, 6)));
  console.log('v3 bucket shares by season:'); for (const y of Object.keys(share).sort()) { const s = share[y]; console.log(' ', y, ['GK', 'FB', 'CB', 'CDM', 'CM', 'CAM', 'Winger', 'ST'].map(b => b + ' ' + pct(s[b] || 0, s.n)).join('  ')); }
  const bySrc = {}; for (const w of Object.values(why)) bySrc[w.src] = (bySrc[w.src] || 0) + 1;
  console.log('cards changing pool:', Object.keys(ov).length, JSON.stringify(bySrc));
})();
