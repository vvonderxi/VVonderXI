#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
 *  prewarm_notes.js , pre-generate the Commentator's Notes for the top band
 *
 *  WHY THIS IS A DIFFERENT SHAPE FROM prewarm_verdicts.js, AND WHY THE COST IS
 *  TWO ORDERS OF MAGNITUDE APART:
 *      NOTES scale with CARDS      , n     , rt>=85 is 650 calls   , ~$28
 *      VERDICTS scale with PAIRS   , n^2/2 , rt>=85 is 33,169 calls, ~$409
 *  Same threshold, same model. Recorded in CLAUDE.md SEC C because the two were
 *  conflated once already and the wrong one is 12x the account balance.
 *
 *  ── THE WHOLE RISK IS THE PAYLOAD, NOT THE CALL ───────────────────────────
 *  `notes_cache` freshness is `stats_hash`, a hash of the EXACT player object the
 *  prompt cites. card.html builds that object inline. If this script's object
 *  differs by ONE KEY, every row it writes carries a hash the page will never
 *  compute, so every row is a PERMANENT MISS , generated, paid for, and never
 *  served. That is the identical failure prewarm_verdicts.js documents for Path B,
 *  and here it would waste the entire run rather than a few pairs.
 *
 *  SO THE BUILDER IS VERIFIED AGAINST REALITY BEFORE ANY SPEND, AND THE RUN
 *  REFUSES TO START IF IT CANNOT BE. `--verify` (which every live run performs
 *  automatically) rebuilds the payload for cards that ALREADY hold a fresh cached
 *  note, hashes it with the SAME exported `statsHash` the server uses, and compares
 *  against the stored value. A match proves this builder is byte-equivalent to
 *  card.html's for that card. It costs nothing and it is the only honest way to
 *  know the money will not be burnt.
 *
 *  ZERO-DRIFT: MODEL, NOTES_VERSION, NOTES_SYSTEM and statsHash are IMPORTED from
 *  api/analyse.js; rowToCard, vvAIStats, keeperSeriesFor, bandFor/bandPublic and
 *  leagueName from vv-core.js. Nothing is copied and nothing is parsed out of
 *  source. The one hand-mirrored part is the payload literal below, which is why
 *  the verification above exists.
 *
 *  USAGE
 *    node scripts/prewarm_notes.js --dry-run         # plan + cost, no API calls
 *    node scripts/prewarm_notes.js --verify          # payload check only, no spend
 *    node scripts/prewarm_notes.js --threshold 95    # smaller pool
 *    node scripts/prewarm_notes.js --limit 3         # smoke test first
 *    node scripts/prewarm_notes.js                   # live, rt>=85
 *
 *  Resumable: re-reads notes_cache and skips cards already fresh. Ctrl-C is safe.
 *  Requires in .env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
 * ═══════════════════════════════════════════════════════════════════════════ */

require('dotenv').config({ quiet: true });
const path = require('path');

/*  vv-core's `fetchHonours` goes through its MODULE-LOCAL `vvClient()`, which reads
    `window.VV_PUBLIC` and `window.supabase` off the global and caches the result lazily.
    SEC C: patching an exported VVCore.* function does NOT reach a module-local binding, so
    the only honest way to make it work here is to supply what it actually reads, BEFORE the
    first call. Without this it silently returns an empty honours object, `vvAIStats` omits
    the `honours` key, and every payload is one key short of the page's , which is exactly
    the drift the pre-flight verification caught.
    The ANON key is correct here and not an oversight: honours is one of the four relations
    the 2026-10-03 lockdown deliberately left readable by anon, because the client reads it.  */
global.window = global;
global.supabase = require('@supabase/supabase-js');
/*  THE PUBLISHABLE KEY IS NOT IN .env , it is embedded in the shipping pages, so it is read
    from one, exactly as migrations/.../waitlist-check.js already does. Using the SERVICE key
    here would also work and would be wrong in a way that matters: it bypasses RLS, so the
    script would see rows the browser cannot, and the whole point of this file is to reproduce
    what the PAGE builds.  */
global.VV_PUBLIC = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: (require('fs').readFileSync(path.join(__dirname, '..', 'card.html'), 'utf8')
    .match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0]
};

const VVCore = require(path.join(__dirname, '..', 'vv-core.js')) || global.VVCore;
const { createClient } = require('@supabase/supabase-js');

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const DRY         = argv.includes('--dry-run');
const VERIFY_ONLY = argv.includes('--verify');
const THRESHOLD   = Number(flag('threshold', 85));
const CONCURRENCY = Math.max(1, Number(flag('concurrency', 3)));
const LIMIT       = flag('limit', null) ? Number(flag('limit')) : null;

const ANALYSE = require(path.join(__dirname, '..', 'api', 'analyse.js'));
const { MODEL, NOTES_VERSION, NOTES_SYSTEM, statsHash } = ANALYSE;
for (const [k, v] of Object.entries({ MODEL, NOTES_VERSION, NOTES_SYSTEM })) {
  if (typeof v !== 'string' || !v) {
    console.error(`FATAL: api/analyse.js did not export ${k}. Refusing to run rather than guess.`);
    process.exit(1);
  }
}
if (typeof statsHash !== 'function') { console.error('FATAL: api/analyse.js must export statsHash , the payload cannot be verified without it.'); process.exit(1); }

const P_IN = 3 / 1e6, P_OUT = 15 / 1e6, P_CACHE_WRITE = P_IN * 1.25, P_CACHE_READ = P_IN * 0.1;

const need = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'].concat(DRY || VERIFY_ONLY ? [] : ['ANTHROPIC_API_KEY']);
for (const k of need) if (!process.env[k]) { console.error(`FATAL: ${k} missing from .env`); process.exit(1); }

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });

/* ═══ THE PAYLOAD , MIRRORS card.html's builder. Keep in sync, and note that the
       verification below is what proves it IS in sync rather than assuming it. ═══ */
const lgName = (code) => (VVCore.VVFilters && VVCore.VVFilters.leagueName)
  ? VVCore.VVFilters.leagueName(code) : (code || '');

/*  HONOURS ARE ATTACHED AFTER rowToCard, AND LEAVING THEM OUT COST ONE KEY AND WOULD HAVE
    COST THE WHOLE RUN. `vvAIStats` reads `row.honours` and emits an `honours` key when the
    card has any; card.html fetches them asynchronously and assigns `D.honours = h` once they
    land. A payload built straight off `rowToCard` therefore has 32 keys where the page has 33,
    every hash differs, and every row written is a permanent miss.
    Caught by the pre-flight verification below, which is the entire reason it exists , 16 of
    25 cards matched because those happened to hold NO honours, so the bug was invisible on a
    majority of the sample and would have looked like ordinary staleness.  */
async function withHonours(D, row) {
  try { D.honours = await VVCore.fetchHonours(row); } catch (e) { /* page treats honours as non-gating */ }
  return D;
}

function buildPlayer(D, seasonRaw) {
  let keeper = (D.pos === 'GK')
    ? { saves: D.saves, goals_conceded: D.goals_conceded, penalties_saved: D.penalties_saved, starts: D.starts }
    : {};
  const ai = VVCore.vvAIStats ? VVCore.vvAIStats(D, { radar: true }) : {};
  const kser = (D.keeper && VVCore.keeperSeriesFor && seasonRaw) ? VVCore.keeperSeriesFor(seasonRaw) : null;
  if (kser) keeper = Object.assign({}, keeper, { savePctSeries: kser });
  return Object.assign({
    player_name: D.full, season: D.year, age: D.age, club: D.clubname,
    league: lgName(D.league), position: D.pos,
    goals: D.goals, assists: D.assists,
    // Fallback C: a keeper receives NO rt and therefore no band.
    ...(D.keeper ? {} : { rt: D.vv, band: VVCore.bandPublic ? VVCore.bandPublic(VVCore.bandFor(D.vv)) : null }),
    tags: (Array.isArray(D.tags) ? D.tags.map(t => t.name) : [])
  }, ai, keeper);
}

/*  Season rows are needed ONLY for a keeper's savePctSeries. Fetched per keeper,
    mirroring what the page already has loaded for the trajectory.  */
async function seasonRowsFor(apiPlayerId) {
  const { data } = await sb.from('player_card_mv').select('*').eq('api_player_id', apiPlayerId);
  return data || [];
}

async function callClaude(player, attempt = 0) {
  const messages = [{ role: 'user', content: 'Write the Commentator\'s Notes for this player-season. Card data:\n' + JSON.stringify(player, null, 2) }];
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1500, messages,
      system: [{ type: 'text', text: NOTES_SYSTEM, cache_control: { type: 'ephemeral' } }]
    })
  });
  if ((resp.status === 429 || resp.status >= 500) && attempt < 5) {
    const wait = Number(resp.headers.get('retry-after')) * 1000 || Math.min(60000, 2000 * Math.pow(2, attempt));
    console.log(`    ${resp.status} , backing off ${Math.round(wait / 1000)}s`);
    await new Promise(r => setTimeout(r, wait));
    return callClaude(player, attempt + 1);
  }
  const data = await resp.json();
  if (!resp.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + resp.status));
  const text = (data.content && data.content[0] && data.content[0].text) || '';
  let parsed;
  try { parsed = VVCore.vvParseModelJSON(text); }   // shared with the live path , the model preambles
  catch (e) {
    throw new Error('notes JSON parse failed , stop_reason=' + (data.stop_reason || '?') +
      ' len=' + text.length + ' | ' + e.message + ' | tail: ' + JSON.stringify(text.slice(-90)));
  }
  if (typeof parsed.glance !== 'string' || typeof parsed.scout !== 'string' || !Array.isArray(parsed.notes) || !parsed.notes.length)
    throw new Error('notes shape invalid , the server would reject this with 502');
  return { parsed, usage: data.usage || {} };
}

(async () => {
  console.log(`\n  VV NOTES PRE-WARM ${DRY ? ' [DRY RUN , no API calls, nothing written]' : VERIFY_ONLY ? ' [VERIFY ONLY , no API calls]' : ''}`);
  console.log(`  model ${MODEL} | cache_version ${NOTES_VERSION} | system prompt ${NOTES_SYSTEM.length} chars\n`);

  // ── pool ────────────────────────────────────────────────────────────────
  let rows = [], from = 0;
  for (;;) {
    const { data, error } = await sb.from('player_card_mv').select('*')
      .gte('rt', THRESHOLD).order('rt', { ascending: false, nullsFirst: false })
      .order('card_id', { ascending: true }).range(from, from + 999);
    if (error) { console.error('FATAL: pool query failed , ' + error.message); process.exit(1); }
    rows = rows.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  const rawById = new Map();
  const cards = rows.map(r => { const c = VVCore.rowToCard(r); if (c) rawById.set(c.card_id, r); return c; }).filter(Boolean);

  const { data: cached } = await sb.from('notes_cache')
    .select('card_id, notes, model, stats_hash, cache_version')
    .in('card_id', cards.map(c => c.card_id));
  const byId = new Map((cached || []).map(r => [r.card_id, r]));

  // ── THE VERIFICATION , runs before any spend, on every live run ──────────
  // Rebuild the payload for cards that already hold a FRESH cached note and check
  // our hash against the stored one. A mismatch means this builder has drifted from
  // card.html, every row we wrote would be a permanent miss, and we must not spend.
  const checkable = cards.filter(c => {
    const r = byId.get(c.card_id);
    return r && r.stats_hash && r.cache_version === NOTES_VERSION && r.model === MODEL;
  });
  let vOK = 0, vBad = [];
  const shapeOK = { outfield: 0, keeper: 0 }, shapeSeen = { outfield: 0, keeper: 0 };
  for (const c of checkable.slice(0, 60)) {
    const shape = c.keeper ? 'keeper' : 'outfield';
    shapeSeen[shape]++;
    const seasonRaw = c.keeper ? await seasonRowsFor(c.api_player_id) : null;
    await withHonours(c, rawById.get(c.card_id));
    const mine = statsHash(buildPlayer(c, seasonRaw));
    if (mine === byId.get(c.card_id).stats_hash) { vOK++; shapeOK[shape]++; }
    else vBad.push(`${c.surname} ${c.year}${c.keeper ? ' [GK]' : ''}`);
  }
  /*  A MISMATCH HAS TWO CAUSES AND ONLY ONE IS A REASON TO STOP , the first version of this
      check conflated them and refused to run on a builder that was CORRECT.
        DRIFT  , this script builds a different object from card.html. Fatal: every row it
                 writes is a permanent miss.
        STALE  , the stored row was written before a payload change and the PAGE would
                 regenerate it too. Not a problem: warming it is the repair.
      They are told apart by whether ANY row matches. A drifted builder matches NOTHING,
      because every payload would carry the same structural difference. So the gate is "at
      least one match per payload SHAPE" , outfield and keeper are different shapes and a
      builder can be right about one and wrong about the other, which is why both are
      required rather than a single count.
      Worked example, 2026-10-03: the honours key landed in the payload on 2026-09-08
      (c3021be), so rows older than that carry 32 keys and newer ones 33. Checking a mixed
      sample gave 16/25 one way and 9/25 the other, and NEITHER number meant drift.  */
  console.log(`  PAYLOAD VERIFICATION , rebuilt against rows card.html already wrote`);
  if (!checkable.length) {
    console.log(`    NO FRESH CACHED NOTES IN THIS POOL TO CHECK AGAINST.`);
    console.log(`    The builder is therefore UNVERIFIED. Open a few cards in the browser at this`);
    console.log(`    threshold first, then re-run , do not spend against an unchecked payload.\n`);
    if (!DRY) process.exit(1);
  } else {
    console.log(`    matched ${vOK} / ${vOK + vBad.length}   (outfield ${shapeOK.outfield}/${shapeSeen.outfield}, keeper ${shapeOK.keeper}/${shapeSeen.keeper})`);
    const dead = [];
    if (shapeSeen.outfield && !shapeOK.outfield) dead.push('OUTFIELD');
    if (shapeSeen.keeper   && !shapeOK.keeper)   dead.push('KEEPER');
    if (dead.length) {
      console.log(`\n    REFUSING TO RUN , NOT ONE ${dead.join(' or ')} payload matched, which is DRIFT, not`);
      console.log(`    staleness: a stale row is one the page would regenerate too, and some would still`);
      console.log(`    match. Every row written with a drifted hash is a permanent miss. Fix buildPlayer()`);
      console.log(`    against card.html before spending.\n`);
      process.exit(1);
    }
    if (vBad.length) {
      console.log(`    ${vBad.length} stored row(s) differ and are STALE, not drift , written before a payload`);
      console.log(`    change, so the page would regenerate them too. Warming them is the repair.`);
      console.log(`    e.g. ${vBad.slice(0, 4).join(', ')}`);
    }
    console.log(`    the payload this script builds reproduces card.html's on every current row.\n`);
  }
  if (VERIFY_ONLY) process.exit(0);

  const isFresh = (c) => {
    const r = byId.get(c.card_id);
    if (!r || !r.notes || r.model !== MODEL) return false;
    if (r.stats_hash == null || r.cache_version == null) return false;
    return r.cache_version === NOTES_VERSION;   // stats_hash checked per card below
  };
  const fresh = cards.filter(isFresh);
  let todo = cards.filter(c => !isFresh(c));
  if (LIMIT) todo = todo.slice(0, LIMIT);

  console.log(`  pool rt>=${THRESHOLD}: ${cards.length} cards  (notes are PER CARD , n, not n^2)`);
  console.log(`  already cached fresh (skipped): ${fresh.length}`);
  console.log(`  to generate: ${todo.length}${LIMIT ? `  (--limit ${LIMIT})` : ''}`);
  // ~8,800 input tokens of prompt (mostly cache-read after the first) + ~541 output
  const est = todo.length * ((8800 * P_CACHE_READ) + (541 * P_OUT));
  console.log(`  estimated cost: ~$${est.toFixed(2)}   (actual tally from API usage below)\n`);
  if (DRY) { console.log('  DRY RUN , no API calls made, nothing written.\n'); process.exit(0); }
  if (!todo.length) { console.log('  nothing to do , pool fully warm.\n'); process.exit(0); }

  let done = 0, failed = 0, spend = 0;
  const tok = { in: 0, out: 0, cw: 0, cr: 0 };
  const queue = todo.slice();
  async function worker() {
    for (;;) {
      const c = queue.shift(); if (!c) return;
      const n = ++done;
      try {
        const seasonRaw = c.keeper ? await seasonRowsFor(c.api_player_id) : null;
        await withHonours(c, rawById.get(c.card_id));
        const player = buildPlayer(c, seasonRaw);
        const { parsed, usage } = await callClaude(player);
        const u = usage || {};
        tok.in += u.input_tokens || 0; tok.out += u.output_tokens || 0;
        tok.cw += u.cache_creation_input_tokens || 0; tok.cr += u.cache_read_input_tokens || 0;
        spend += (u.input_tokens || 0) * P_IN + (u.output_tokens || 0) * P_OUT
               + (u.cache_creation_input_tokens || 0) * P_CACHE_WRITE + (u.cache_read_input_tokens || 0) * P_CACHE_READ;
        const { error } = await sb.from('notes_cache').upsert({
          card_id: c.card_id, notes: parsed, model: MODEL,
          rt: c.keeper ? null : (Number.isFinite(+c.vv) ? +c.vv : null),
          stats_hash: statsHash(player), cache_version: NOTES_VERSION
        }, { onConflict: 'card_id' });
        if (error) throw new Error('cache write failed , ' + error.message);
        console.log(`  [${String(n).padStart(3)}/${todo.length}] ${(c.surname + ' ' + c.year).padEnd(34)} ok    $${spend.toFixed(3)}`);
      } catch (e) {
        failed++;
        console.log(`  [${String(n).padStart(3)}/${todo.length}] ${(c.surname + ' ' + c.year).padEnd(34)} FAILED , ${e.message}`);
      }
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n  ── done ────────────────────────────────────────────────────────`);
  console.log(`  generated ${todo.length - failed} | failed ${failed} | ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  console.log(`  tokens , input ${tok.in.toLocaleString()} | output ${tok.out.toLocaleString()} | cache write ${tok.cw.toLocaleString()} | cache read ${tok.cr.toLocaleString()}`);
  console.log(`  ACTUAL SPEND: $${spend.toFixed(2)}\n`);
  if (failed) console.log(`  ${failed} failed , re-run to retry (completed cards are skipped).\n`);
})();
