#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  prewarm_verdicts.js , pre-generate VV Verdicts for the top-band pairs
 *
 *  WHY: a verdict is deterministic given the same data, so the marquee
 *  pairings (every Messi season vs every Ronaldo season, etc.) can be paid
 *  for once, up front, and served instantly at launch instead of making the
 *  first visitor wait ~8s for a live Claude call.
 *
 *  RUN THIS ONLY AFTER the deployed invalidation fix is verified:
 *    1. fresh pair stamps rt_a/rt_b/cache_version on generate
 *    2. repeat load serves cached:true
 *    3. hand-editing rt_a in Supabase makes the next load regenerate
 *  Pre-warming before that would build rows nothing can invalidate.
 *
 *  ZERO-DRIFT BY CONSTRUCTION , everything that must match production is
 *  IMPORTED at runtime, never copied and never parsed out of source:
 *    - MODEL, VERDICT_VERSION, VERDICT_SYSTEM , require('../api/analyse.js')
 *    - verdictContext + VERDICT_TAGS + rowToCard , require('../vv-core.js')
 *  If any of those change, this script picks the change up on its next run,
 *  and a prompt edit auto-bumps VERDICT_VERSION on both sides simultaneously.
 *
 *  WHY IMPORT AND NOT PARSE: an earlier version regex-extracted the prompt from
 *  the source file. That is subtly WRONG , the source contains the two-character
 *  escape \n, while the evaluated template literal the handler actually sends
 *  contains a real newline. The parsed prompt differed from the sent prompt by
 *  2 characters inside STYLE RULE 5 (the paragraph-break instruction), which is
 *  exactly the kind of silent voice drift this script must not introduce.
 *  Importing takes the evaluated value, so there is nothing left to diverge.
 *  The user-prompt builder below mirrors compare.html:1296-1311 , that is the
 *  one hand-copied part, so keep it in sync if the prompt there changes.
 *
 *  USAGE
 *    node scripts/prewarm_verdicts.js --dry-run          # no API calls, full plan + cost estimate
 *    node scripts/prewarm_verdicts.js                    # live, rt>=95 (66 pairs, ~$1)
 *    node scripts/prewarm_verdicts.js --threshold 93     # wider pool
 *    node scripts/prewarm_verdicts.js --limit 3          # smoke-test on 3 pairs first
 *    node scripts/prewarm_verdicts.js --concurrency 2    # gentler on rate limits
 *
 *  Resumable: every run re-reads verdict_cache and skips pairs already cached
 *  FRESH (stamps matching current rt + version + model). Ctrl-C is safe , rows
 *  are written one at a time as they complete. Re-running costs nothing for
 *  work already done.
 *
 *  Requires in .env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 * ═══════════════════════════════════════════════════════════════════════════ */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const VVCore = require(path.join(__dirname, '..', 'vv-core.js'));
const { createClient } = require('@supabase/supabase-js');

// ── args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const DRY         = argv.includes('--dry-run');
const THRESHOLD   = Number(flag('threshold', 95));
const CONCURRENCY = Math.max(1, Number(flag('concurrency', 4)));
const LIMIT       = flag('limit', null) ? Number(flag('limit')) : null;

// ── IMPORT the production constants from api/analyse.js ────────────────────
// Not parsed, not copied , the same objects the live handler uses. Write and
// read cannot drift, and a prompt edit auto-bumps VERDICT_VERSION on both
// sides at once (it is a fingerprint of the prompt text).
const ANALYSE = require(path.join(__dirname, '..', 'api', 'analyse.js'));
const { MODEL, VERDICT_VERSION, VERDICT_SYSTEM: SYSTEM_PROMPT } = ANALYSE;
for (const [k, v] of Object.entries({ MODEL, VERDICT_VERSION, SYSTEM_PROMPT })) {
  if (typeof v !== 'string' || !v) {
    console.error(`FATAL: api/analyse.js did not export ${k}. It must export MODEL, VERDICT_VERSION and VERDICT_SYSTEM for this script to mirror production exactly. Refusing to run rather than guess.`);
    process.exit(1);
  }
}

// ── pricing (claude-sonnet-4-6, $/token) ───────────────────────────────────
const P_IN = 3 / 1e6, P_OUT = 15 / 1e6, P_CACHE_WRITE = P_IN * 1.25, P_CACHE_READ = P_IN * 0.1;

const need = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'].concat(DRY ? [] : ['ANTHROPIC_API_KEY']);
for (const k of need) if (!process.env[k]) { console.error(`FATAL: ${k} missing from .env`); process.exit(1); }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

// ═══ user prompt , MIRRORS compare.html:1296-1311. Keep in sync. ═══════════
const TONE = {
  tie:      'a dead heat , write the argument-continues register, never a flat draw.',
  razor:    'the finest of margins , a coin-flip decided by a sliver.',
  clear:    'a real but contested edge.',
  decisive: 'a decisive gap , write it as settled.'
};
function rad(c){ const r=(c.radar&&c.radar.raw)||{}; const n=x=>x==null?'-':x;
  return 'GoalThreat '+n(r.goalThreat)+', Creation '+n(r.creation)+', Progression '+n(r.progression)+', Defensive '+n(r.defensive)+', Reliability '+n(r.reliability); }
function line(c,wk){ return c.surname+' ('+(c.full||c.surname)+'), '+c.year+', '+c.clubname+' ['+(c.league||'')+'], pos '+c.pos+', age '+(c.season_age!=null?c.season_age:'NR')+(wk?' [WONDERKID]':'')+', VV '+c.vv+', '+c.goals+'G '+c.assists+'A; radar per90: '+rad(c); }

function buildUserPrompt(A, B, VC) {
  const TAGS = VVCore.VERDICT_TAGS;
  const va = +A.vv || 0, vb = +B.vv || 0, winner = VC.winner;
  const eligKeys = [VC.floorTag].concat((VC.contextHints || []).filter(k => k !== VC.floorTag));
  const tagMenu = eligKeys.map(k => { const t = TAGS[k]; return '- ' + k + ' ("' + t.name + '"): ' + t.blurb; }).join('\n');
  const toneNote = TONE[VC.tone];
  let winNote;
  if (winner === 'tie') {
    winNote = 'TIE (' + va + '=' + vb + '). Break it on the full profile and name a narrow winner. Never a flat draw.';
  } else {
    const wName = (winner === 'A' ? A : B).surname, wv = winner === 'A' ? va : vb, lv = winner === 'A' ? vb : va;
    winNote = 'Player ' + winner + ' (' + wName + ') takes the edge, ' + wv + ' to ' + lv + '.'
      + (VC.tipped
          ? ' NOTE: within a coin-flip (' + va + ' vs ' + vb + '), AGE tipped it to the younger player , the equal season at a younger age is the harder feat. Lead with that.'
          : ' Explain why; do not overturn the engine.');
  }
  return 'Compare these two player-seasons and return the VV Verdict JSON (keys: p1, p2, h2h, verdict, tag, who). p1 = Player A, p2 = Player B.\n'
    + 'Player A: ' + line(A, VC.wonderkidA) + '\n'
    + 'Player B: ' + line(B, VC.wonderkidB) + '\n'
    + 'Result: ' + winNote + '\n'
    + 'Tone: ' + toneNote + '\n'
    + 'VERDICT TAG , choose EXACTLY ONE key from this list (default to the FIRST; up-rank to a later one ONLY if it clearly fits better):\n' + tagMenu + '\n'
    + 'Return "tag" as one of those keys verbatim. Match the prose to the chosen tag and the tone.\n'
    + '"who" , the winner HEADLINE shown beside the tag chip. Write it in the register of the chosen tag and the tone above: a decisive gap reads decisive and settled, the finest of margins keeps "edges it" restraint, a tie reads as the argument continuing. It MUST NOT contradict the tag. Name the winner and include both VV scores (' + va + ' and ' + vb + '). Max ~14 words, a headline not a sentence.';
}

// ── one Anthropic call, with 429/5xx backoff ───────────────────────────────
async function callClaude(userPrompt, attempt = 0) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1024,
      // same cacheable system block as api/analyse.js , reads bill at ~0.1x
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  if ((resp.status === 429 || resp.status >= 500) && attempt < 5) {
    const wait = Number(resp.headers.get('retry-after')) * 1000 || Math.min(60000, 2000 * Math.pow(2, attempt));
    console.log(`    ${resp.status} , backing off ${Math.round(wait / 1000)}s`);
    await new Promise(r => setTimeout(r, wait));
    return callClaude(userPrompt, attempt + 1);
  }
  const data = await resp.json();
  if (!resp.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + resp.status));
  let text = (data.content && data.content[0] && data.content[0].text) || '';
  text = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let verdict;
  try { verdict = JSON.parse(text); }
  catch (e) { throw new Error('verdict JSON parse failed'); }
  for (const k of ['p1', 'p2', 'h2h', 'verdict']) {
    if (typeof verdict[k] !== 'string' || !verdict[k].trim()) throw new Error('verdict missing "' + k + '"');
  }
  return { verdict, usage: data.usage || {} };
}

// ── main ───────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n  VV VERDICT PRE-WARM${DRY ? '  [DRY RUN , no API calls, nothing written]' : ''}`);
  console.log(`  model ${MODEL} | cache_version ${VERDICT_VERSION} | system prompt ${SYSTEM_PROMPT.length} chars (read from api/analyse.js)\n`);

  const { data: rows, error } = await sb.from('player_card_mv').select('*').gte('rt', THRESHOLD);
  if (error) { console.error('pool query failed:', error.message); process.exit(1); }
  const cards = rows.map(r => VVCore.rowToCard(r)).filter(c => c.card_id != null)
                    .sort((a, b) => a.card_id - b.card_id);

  // canonical order: A is always the LOWER card_id, so rt_a/rt_b map straight
  // through with no swap , the same trap analyse.js handles via `swapped`.
  const pairs = [];
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      pairs.push({ A: cards[i], B: cards[j], key: cards[i].card_id + '-' + cards[j].card_id });

  // resumability: skip only pairs already cached FRESH , same hit test as analyse.js
  const { data: existing } = await sb.from('verdict_cache')
    .select('pair_key, rt_a, rt_b, cache_version, model, verdict')
    .in('pair_key', pairs.map(p => p.key));
  const byKey = new Map((existing || []).map(r => [r.pair_key, r]));
  const isFresh = (p) => {
    const r = byKey.get(p.key);
    if (!r || !r.verdict || r.model !== MODEL) return false;
    if (r.rt_a == null || r.rt_b == null || r.cache_version == null) return false;   // legacy -> regenerate
    if (r.cache_version !== VERDICT_VERSION) return false;
    return r.rt_a === (+p.A.vv || 0) && r.rt_b === (+p.B.vv || 0);
  };
  const cachedFresh = pairs.filter(isFresh);
  let todo = pairs.filter(p => !isFresh(p));
  const stale = todo.filter(p => byKey.has(p.key)).length;
  if (LIMIT) todo = todo.slice(0, LIMIT);

  console.log(`  pool rt>=${THRESHOLD}: ${cards.length} cards -> ${pairs.length} pairs`);
  console.log(`  already cached fresh (skipped): ${cachedFresh.length}`);
  console.log(`  stale/unstamped rows to refresh: ${stale}`);
  console.log(`  to generate: ${todo.length}${LIMIT ? `  (--limit ${LIMIT})` : ''}\n`);
  if (!todo.length) { console.log('  nothing to do , pool fully warm.\n'); process.exit(0); }

  const est = todo.length * ((SYSTEM_PROMPT.length / 3.7) * P_CACHE_READ + 353 * P_IN + 622 * P_OUT);
  console.log(`  estimated cost: ~$${est.toFixed(2)} (actual tally from API usage below)\n`);

  if (DRY) {
    const p = todo[0], VC = VVCore.verdictContext(p.A, p.B);
    console.log('  ── sample prompt (first pair) ' + '─'.repeat(44));
    console.log(buildUserPrompt(p.A, p.B, VC).split('\n').map(l => '  ' + l).join('\n'));
    console.log('\n  DRY RUN , no API calls made, nothing written.\n');
    process.exit(0);
  }

  let done = 0, failed = 0, tin = 0, tout = 0, tcw = 0, tcr = 0;
  const t0 = Date.now();
  const queue = todo.slice();

  async function worker(id) {
    while (queue.length) {
      const p = queue.shift();
      const label = `${p.A.surname} ${p.A.year} vs ${p.B.surname} ${p.B.year}`;
      try {
        const VC = VVCore.verdictContext(p.A, p.B);
        const { verdict, usage } = await callClaude(buildUserPrompt(p.A, p.B, VC));
        const winnerId = VC.winner === 'A' ? p.A.card_id : (VC.winner === 'B' ? p.B.card_id : null);
        const { error: werr } = await sb.from('verdict_cache').upsert({
          pair_key: p.key, card_id_a: p.A.card_id, card_id_b: p.B.card_id,
          rt_a: +p.A.vv || 0, rt_b: +p.B.vv || 0, cache_version: VERDICT_VERSION,   // stamped from creation, imported from analyse.js
          verdict, winner_card_id: winnerId, model: MODEL
        }, { onConflict: 'pair_key', ignoreDuplicates: false });
        if (werr) throw new Error('DB write: ' + werr.message);

        tin  += usage.input_tokens || 0;              tout += usage.output_tokens || 0;
        tcw  += usage.cache_creation_input_tokens || 0; tcr += usage.cache_read_input_tokens || 0;
        const spend = tin * P_IN + tout * P_OUT + tcw * P_CACHE_WRITE + tcr * P_CACHE_READ;
        done++;
        console.log(`  [${String(done + failed).padStart(3)}/${todo.length}] ${label.padEnd(44).slice(0, 44)} ${VC.floorTag.padEnd(16)} $${spend.toFixed(3)}`);
      } catch (e) {
        failed++;
        console.log(`  [${String(done + failed).padStart(3)}/${todo.length}] ${label.padEnd(44).slice(0, 44)} FAILED , ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, (_, i) => worker(i)));

  const spend = tin * P_IN + tout * P_OUT + tcw * P_CACHE_WRITE + tcr * P_CACHE_READ;
  const mins = (Date.now() - t0) / 60000;
  console.log(`\n  ── done ${'─'.repeat(56)}`);
  console.log(`  generated ${done} | failed ${failed} | ${mins.toFixed(1)} min`);
  console.log(`  tokens , input ${tin.toLocaleString()} | output ${tout.toLocaleString()} | cache write ${tcw.toLocaleString()} | cache read ${tcr.toLocaleString()}`);
  console.log(`  ACTUAL SPEND: $${spend.toFixed(2)}   (avg $${done ? (spend / done).toFixed(4) : '0'}/verdict)`);
  if (tcr > 0) console.log(`  prompt cache saved ~$${((tcr * P_IN) - (tcr * P_CACHE_READ)).toFixed(2)} vs uncached`);
  if (failed) console.log(`\n  ${failed} failed , re-run to retry (completed pairs are skipped).`);
  console.log('');
  process.exit(failed ? 1 : 0);
})();
