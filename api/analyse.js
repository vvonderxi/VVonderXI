// /api/analyse.js , VVonderXI BIGGER
// Proxies requests to Anthropic Claude API securely

const crypto = require('crypto');
/*  THE CITED WRITER AND THE ENGINE'S OWN READING OF A PAIR (2026-10-25, the port). vv-margin.js is set as the
    global vv-core's verdictContext looks for, so the server reads the pair's margin exactly as the page does.  */
global.VVMargin = global.VVMargin || require('../vv-margin.js');
const VVCore = require('../vv-core.js');
const CITED = require('./_cited/cited.js');   // under api/ so the allowlisted upload carries it; the underscore keeps it from becoming a function

/*  ── parseModelJSON , THE MODEL PREAMBLES AND WE WERE BINNING GOOD ANSWERS (2026-10-03) ──
    Measured on the rt>=95 warm run: 29% of pairs failed to parse, and the decisive case came
    back `stop_reason=end_turn` carrying COMPLETE, VALID JSON prefixed by "I need to ...".
    The model had finished and been paid for; we discarded the answer.
    It concentrates on TIES, because that is where the model reasons longest, so it hits the
    marquee pairings a visitor is most likely to ask for.

    BOTH BRANCHES OF THIS FILE STRIPPED ``` FENCES AND NOTHING ELSE, and prose is not a fence:
      - the NOTES branch answered 502 "notes parse failed", so a card lost its Commentator's
        Notes and Scout Report outright , the first prose a visitor meets;
      - the VERDICT branch returned raw AND DID NOT CACHE, so every later visitor to that pair
        paid for a regeneration that failed again and no cache could ever form.

    IT TRIES THE PLAIN PARSE FIRST and only then falls back, so every string that parses today
    still parses by the identical route , this cannot regress what already works.

    IT IS NOT A TRUNCATION FIX. A response cut at max_tokens has no closing brace and still
    throws, correctly; raising the ceiling to 2048 was tested and did NOT solve that case.

    THIS IS A DELIBERATE TWIN OF `VVCore.vvParseModelJSON`, NOT AN OVERSIGHT. This file requires
    `crypto` and nothing else, and pulling the whole browser module into the serverless bundle
    for eight lines is the wrong trade. `lintParseModelJSON()` in scripts/lint-inline.js runs
    BOTH implementations over one control set and fails if they ever disagree , a tripwire,
    because SEC C records that a rule depending on somebody remembering is already forgotten.  */
function parseModelJSON(text){
  let t = String(text == null ? '' : text)
    .replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(t); }
  catch (e) {
    const i = t.indexOf('{'), j = t.lastIndexOf('}');
    if (i < 0 || j <= i) throw e;
    return JSON.parse(t.slice(i, j + 1));
  }
}

const MODEL = CITED.WRITER_MODEL;   // the cited writer's model, claude-sonnet-4-6; the cache's `model` column

/* ── MODEL EXISTENCE , the check that did not exist when production died ───────
   A MODEL ID IS A DEPENDENCY WITH AN EXPIRY AND NOTHING WAS WATCHING IT.
   Production hardcoded `claude-sonnet-4-20250514`, the model was retired, and
   every request 404'd. The site kept serving, the panels kept rendering, and the
   prose was simply never there , the front end cannot tell a retired model from
   a bad night at the API, so it showed the outage line for months.

   TWO PARTS, because one is not enough:
     1. probeModel()  , asks the API ONCE per process whether MODEL is served,
        and logs loudly if not. Cheap: one GET, cached for the process lifetime.
     2. isModelMissing() , classifies a failed generate. A 404 naming the model
        is a CONFIGURATION error and must not be reported as an outage.

   IT FAILS OPEN, DELIBERATELY. No key, a network error, or an unexpected shape
   all return null, and null never blocks a call. A watchdog that can take the
   feature down when IT breaks is worse than the fault it watches for. */
let MODEL_OK = null;                 // null = unknown, true = served, false = missing
async function probeModel() {
  if (MODEL_OK !== null) return MODEL_OK;
  if (!process.env.ANTHROPIC_API_KEY) return null;      // cannot tell; not evidence
  try {
    const r = await fetch('https://api.anthropic.com/v1/models/' + encodeURIComponent(MODEL), {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }
    });
    if (r.status === 404) {
      MODEL_OK = false;
      console.error('[vv] CONFIGURED MODEL IS NOT SERVED: "' + MODEL + '". Every editorial ' +
                    'request will fail and the site will show the outage line. Update MODEL in ' +
                    'api/analyse.js. This is a CONFIGURATION error, not an outage.');
      return false;
    }
    if (r.ok) { MODEL_OK = true; return true; }
    return null;                                        // 401/429/5xx say nothing about the model
  } catch (e) { return null; }
}
function isModelMissing(status, msg) {
  return status === 404 && /model/i.test(String(msg || ''));
}

/*  THE PROMPT VERSION LIVES WITH THE PROMPTS NOW (2026-10-25). The old PROMPT_REV + fingerprint(prompt) scheme
    and its hand-bump rule moved to scripts/calibration/cited.js as RULES_VERSION (CITED_REV + a fingerprint of
    the writer's and the narrow check's instructions and both formats); the derivation is the same, RULES.md §C.  */

/*  Freshness signal for the notes cache: hash the player payload the prompt cites.
    IT NORMALISES THE TOP LEVEL ONLY, AND THE PAYLOAD IS TWO LEVELS DEEP , say so, because
    this comment used to claim "key-sorted so field order can't false-invalidate" without
    qualification, and that is a completeness claim the code does not support. Same shape as
    the backfill's "every key is checked for an existing row first", which is the sentence
    that stopped anyone checking.
    WHAT WOULD FALSIFY IT: `vvAIStats` emits nested OBJECTS , `recorded {goals, assists}` on
    every card and `keeper {...14 keys}` on a goalkeeper , and neither is reached by the sort
    below, so their key ORDER goes into the hash verbatim. Today both are built by object
    literals, so the order is deterministic and the hash is stable. REORDER EITHER LITERAL,
    or add a key to one conditionally, and every cached note silently re-hashes and
    regenerates, with nothing in the diff to say why.
    IT IS PINNED RATHER THAN FIXED, DELIBERATELY. Sorting recursively is two lines and would
    change the hash of ALL 366 cached notes immediately , `recorded` is present on every card
    and its keys are not in alphabetical order , which would discard the very population the
    item 25 measurement is waiting to settle. `scripts/lint-inline.js` pins the hash of a
    canonical payload instead, so the latent defect can no longer land in silence, and the
    recursive version rides the NEXT notes prompt edit, which invalidates the cache anyway.
    Same reasoning as the `sig` COALESCE in CLAUDE.md: a change that buys only clarity waits
    for a commit that was already paying the cost.  */
const statsHash = (p) => {
  if (!p || typeof p !== 'object') return null;
  const norm = {};
  Object.keys(p).sort().forEach(k => {
    norm[k] = Array.isArray(p[k]) ? p[k].slice().map(String).sort() : p[k];
  });
  return crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex').slice(0, 16);
};

/*  THE OLD WRITER LEFT THIS FILE ON 2026-10-25 (the port, docs/PROSE_CASE_2026-10-24.md). VERDICT_SYSTEM, the
    judge block, NOTES_SYSTEM, checkProseWinner, resolveWinnerId, verdictSystemFor and the PROMPT_REV versions
    are in git history before this commit. Twelve pieces of its prose were read on 2026-10-17 and held 88
    invented world facts, about seven a piece; the cited writer that replaced it shipped 490 sentences with
    none (area 9 of docs/UNVERIFIED_SURFACES_2026-10-12.md). The writer is scripts/calibration/cited.js: a
    numbered fact list built from the request, a sentence cites or is deleted, a gutted piece is rejected.  */

/*  ── THE RATE LIMIT , 30 NEW GENERATIONS PER HOUR PER IP, 2 CONCURRENT (built 2026-09-15) ──
    THE HONEST LIMIT, BESIDE THE ALLOWLIST'S. The origin allowlist stops another WEBSITE
    spending our credit from its visitors' browsers. THIS stops a SCRIPTED client running up
    the bill from one address. It does NOT stop a DISTRIBUTED one , anybody with a pool of
    addresses gets 30 an hour from each, and no per-IP rule can see that. Detecting
    distributed abuse needs a different instrument entirely (spend alerting at the provider),
    and none is in place.
    AND THE CACHE IS STILL DOING MOST OF THE DEFENCE. This check runs AFTER the cache lookup,
    so a repeat pair or a warm card is never counted and never billed. The limiter only has
    to bound what is genuinely new, which at measured traffic is 2.6 verdicts and 3.7 notes
    a day.

    WHERE 30 COMES FROM , IT IS A MEASUREMENT, NOT A ROUND NUMBER. The busiest 60 minutes in
    the platform's whole history is 5 verdict generations and 9 notes generations, ACROSS ALL
    USERS. A single session's maximum is 7 comparisons. 30 per IP per hour is therefore about
    six times the busiest hour the platform has ever had, from one address.

    WHAT WOULD FALSIFY IT , SO THE NEXT PERSON RAISES IT ON EVIDENCE RATHER THAN ON A
    COMPLAINT. A refusal is written into this same table as kind 'refused:hourly' or
    'refused:concurrent', so the check is a query and not a log hunt:
      (1) THE REAL-USER SIGNATURE: an IP that was refused in an hour where it ALSO generated
          successfully several times, i.e. a browsing session that walked into the wall rather
          than a script that hammered it. One of these is enough to raise the cap.
      (2) HEADROOM GONE: any IP whose successful generations in a single hour reach 10 , a
          third of the cap. At that point 30 is no longer six times the observed peak and the
          margin this number was chosen for has evaporated.
      (3) SHARED EGRESS: a launch behind school, office or carrier NAT puts many real people
          on one address, which is per-IP's known failure mode. The tell is a single IP with
          many DISTINCT pair_keys rather than repeats.
    The query, and it needs no new tooling:
      select ip, date_trunc('hour', started_at) h,
             count(*) filter (where kind in ('verdict','notes')) AS ok,
             count(*) filter (where kind like 'refused%') AS refused
      from api_rate_events group by 1,2 having count(*) filter (where kind like 'refused%') > 0;
    IF THAT RETURNS A ROW WITH BOTH `ok` AND `refused` NON-ZERO, 30 IS TOO LOW. Raise it and
    change this comment in the same commit.

    IT FAILS OPEN, DELIBERATELY AND LOUDLY. If the ledger is unreachable the request proceeds,
    because a Supabase blip must not take the site down for a counter that ticks three times a
    day. CLAUDE.md's own rule applies though , fail-safe is a property of the CONSEQUENCE and
    never evidence about the guard , so every fail-open logs at error level. A silent
    fail-open is a limiter that has stopped working and nobody has noticed.  */
const RL_PER_HOUR   = 30;
const RL_CONCURRENT = 2;
/*  ── THE STALENESS FLOOR, CUT FROM 5 MINUTES TO 90 SECONDS ON MEASURED DATA (2026-10-04) ──
    THE NUMBER THIS REPLACES WAS NEVER WRONG, IT WAS UNMEASURED. 5 minutes was chosen before
    any generation had been timed. The ledger now holds real ones: over 32 closed generations
    the median is 0.7s (a cache hit or a fast failure) and the MAXIMUM is 23.6s. So 90 seconds
    is still 3.8x the slowest call this platform has ever made, and 5 minutes was 12.7x it.
    WHY IT MATTERS RATHER THAN BEING TIDINESS: 17 of 49 generations in the ledger , 35% , never
    closed their slot, because the client navigated away or the function died before its
    `finally`. A leaked slot is indistinguishable from a live one until this floor releases it,
    and RL_CONCURRENT is 2. So two aborted requests inside the window refuse a REAL visitor,
    and at 5 minutes that refusal lasts up to five. This is the likeliest way a genuine reader
    meets a 429 on launch day, and it costs nothing to shorten.
    THE BOUND THAT MUST NOT BE CROSSED IS THE GENERATION ITSELF. If this ever drops below the
    time a real generation takes, the floor starts releasing slots that are still in use and
    the concurrency limit stops limiting anything. 23.6s is the measured ceiling; re-read it
    from the ledger before moving this number again, and never set it from memory:
      select max(extract(epoch from finished_at - started_at)) from api_rate_events
       where finished_at is not null and kind in ('notes','verdict');
    AND THE RETRY-AFTER IS UNCHANGED AT 30s, which is still shorter than this floor, so a
    refused reader who waits once is not told to come back before a slot can possibly free.  */
const RL_STALE_MIN  = 1.5;  // 90s , a slot older than this is a dead function, not a live request

/*  ── THE GLOBAL CEILING , BECAUSE A PER-IP LIMIT CANNOT SEE A POOL OF ADDRESSES (2026-10-03) ──
    MEASURED ON THE LIVE PREVIEW RATHER THAN REASONED: 40 sequential calls carrying a forged
    `Origin` header returned 24 allowed and then HTTP 429 from call #25 , exactly 30 once the
    six already spent from that address are counted. The per-IP limit is real and exact, and it
    bounds ONE address. A hundred addresses get thirty each and nothing in this file can see it.
    THE ORIGIN ALLOWLIST IS NOT A SECOND LINE HERE, and the same test proved it: four forged
    origins were refused 403, and the 200s above came from node with the header set by hand.
    `Origin` is a request header. It stops another WEBSITE's browser, never a script.

    300 IS 21x THE BUSIEST HOUR THE PLATFORM HAS EVER HAD , five verdicts and nine notes across
    all users. At the tightened input cap it bounds the hour at about $13.
    AND IT IS SET GENEROUSLY ON PURPOSE. That 14/hour baseline comes from a platform with no
    traffic, so a ceiling tuned from it would refuse real visitors on launch day, which is the
    one day it matters. If a real hour ever reaches 300, RAISE THIS , do not read the refusals
    as abuse without checking the grouping query above for many DISTINCT addresses.

    AND IT BUYS TIME RATHER THAN BOUNDING THE BALANCE , SAY SO RATHER THAN LETTING IT READ AS A
    SOLUTION. At 300/hour a prepaid balance of ~$24 still empties in under two hours of
    sustained abuse. The hard stop is the provider's own spend cap (QA_PASS B4b). This ceiling
    and that cap are complements; the cap is the one that actually stops.  */
const RL_GLOBAL_PER_HOUR = 300;

/*  x-forwarded-for is a LIST and the client's address is the FIRST entry; everything after it
    is proxies. Taking the last, or the whole string, keys the limit on Vercel's edge rather
    than on the caller, which would put every visitor in one bucket.  */
function clientIP(req) {
  const h = req.headers || {};
  const xff = h['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return h['x-real-ip'] || h['x-vercel-forwarded-for'] || null;
}

let _rlClient = null;
function rlClient() {
  if (_rlClient) return _rlClient;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
  const { createClient } = require('@supabase/supabase-js');
  _rlClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _rlClient;
}

/*  Returns { ok:true, id } to proceed, or { ok:false, reason, retryAfter } to refuse.
    `id` is the ledger row to close in a finally , see rlEnd.  */
async function rlBegin(ip, kind) {
  const sb = rlClient();
  if (!sb || !ip) { console.error('[vv] RATE LIMIT FAILED OPEN , ' + (!ip ? 'no client ip' : 'no service key')); return { ok: true, id: null }; }
  try {
    const hourAgo  = new Date(Date.now() - 3600e3).toISOString();
    const staleAgo = new Date(Date.now() - RL_STALE_MIN * 60e3).toISOString();
    /*  BOTH COUNTS EXCLUDE REFUSAL ROWS. A refused request cost nothing, so counting it
        toward the cap would punish a user for having been refused once.  */
    /*  THE GLOBAL COUNT IS THE SAME QUERY WITHOUT THE IP FILTER , no new table, no new vendor,
        and it runs in the SAME Promise.all so it costs no extra round trip. It is bound as
        `allIPs` rather than `global` because `global` is Node's own object and shadowing a
        host builtin inside the one function that must never throw is not worth the nicer name.  */
    const [hourly, inflight, allIPs] = await Promise.all([
      sb.from('api_rate_events').select('id', { count: 'exact', head: true })
        .eq('ip', ip).in('kind', ['verdict', 'notes']).gte('started_at', hourAgo),
      sb.from('api_rate_events').select('id', { count: 'exact', head: true })
        .eq('ip', ip).in('kind', ['verdict', 'notes']).is('finished_at', null).gte('started_at', staleAgo),
      sb.from('api_rate_events').select('id', { count: 'exact', head: true })
        .in('kind', ['verdict', 'notes']).gte('started_at', hourAgo)
    ]);
    if (hourly.error || inflight.error || allIPs.error) {
      console.error('[vv] RATE LIMIT FAILED OPEN , ledger read error:', (hourly.error || inflight.error || allIPs.error).message);
      return { ok: true, id: null };
    }
    if (hourly.count >= RL_PER_HOUR) {
      await sb.from('api_rate_events').insert({ ip, kind: 'refused:hourly', finished_at: new Date().toISOString() });
      return { ok: false, reason: 'hourly', retryAfter: 600 };
    }
    /*  THE GLOBAL CHECK SITS AFTER THE PER-IP ONE DELIBERATELY. An address that is already over
        its own limit should be told so , 'refused:hourly' names the caller's problem, where
        'refused:global' would blame the platform for something that one address caused.
        IT IS ITS OWN KIND SO THE LEDGER CAN ANSWER "was this abuse or a busy hour" WITHOUT A
        LOG HUNT, exactly as the per-IP refusals already can: group refused:global rows by hour
        and count DISTINCT ips. Many addresses means a real crowd and the ceiling wants raising;
        a few means a pool and the ceiling did its job.  */
    if (allIPs.count >= RL_GLOBAL_PER_HOUR) {
      await sb.from('api_rate_events').insert({ ip, kind: 'refused:global', finished_at: new Date().toISOString() });
      console.error('[vv] GLOBAL CEILING HIT , ' + allIPs.count + ' generations in the last hour across all callers. ' +
                    'If this is real traffic, raise RL_GLOBAL_PER_HOUR; check distinct ips on refused:global first.');
      return { ok: false, reason: 'global', retryAfter: 300 };
    }
    if (inflight.count >= RL_CONCURRENT) {
      await sb.from('api_rate_events').insert({ ip, kind: 'refused:concurrent', finished_at: new Date().toISOString() });
      /*  A SHORT RETRY, BECAUSE THIS ONE CAN CATCH A REAL PERSON. Two tabs open on one
          connection is an ordinary thing to do, and a generation takes roughly 26 seconds, so
          a third tab is refused for at most that long. 30s is longer than the wait it is
          protecting, which is what makes a retry actually succeed.  */
      return { ok: false, reason: 'concurrent', retryAfter: 30 };
    }
    const { data, error } = await sb.from('api_rate_events').insert({ ip, kind }).select('id').single();
    if (error) { console.error('[vv] RATE LIMIT FAILED OPEN , ledger write error:', error.message); return { ok: true, id: null }; }
    /*  Opportunistic retention, ~5% of calls: nothing here is needed beyond the sliding
        window, and a per-call delete would cost more than the limit saves.  */
    if (Math.random() < 0.05) {
      sb.from('api_rate_events').delete().lt('started_at', new Date(Date.now() - 86400e3).toISOString())
        .then(() => {}, () => {});
    }
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('[vv] RATE LIMIT FAILED OPEN , threw:', e && e.message);
    return { ok: true, id: null };
  }
}

/*  CLOSING THE SLOT IS WHAT MAKES CONCURRENCY WORK, so it runs from a finally on EVERY exit
    path , success, upstream error, parse failure. A slot left open blocks the caller for
    RL_STALE_MIN minutes, which is the one way this limiter can break someone who did nothing
    wrong. The staleness floor is the backstop for the case where the function dies before
    reaching the finally at all.  */
async function rlEnd(id) {
  if (!id) return;
  const sb = rlClient();
  if (!sb) return;
  try { await sb.from('api_rate_events').update({ finished_at: new Date().toISOString() }).eq('id', id); }
  catch (e) { console.error('[vv] rate limit: slot not closed, it will expire in ' + RL_STALE_MIN + 'min:', e && e.message); }
}

/*  THE CHECKING PASS OF 2026-10-12 (a second model reading each verdict against its evidence, VV_VERDICT_CHECK)
    IS GONE WITH THE OLD WRITER (2026-10-25). It caught kind 1 only and was never switched on; the cited writer
    makes the reading unnecessary, because a sentence that cites nothing never reaches a reader.  */
const HELD_PAIRS = new Set([
  '141999-143372',  // Messi 11/12 v Ronaldo 14/15       Compare suggestion
  '131585-152972',  // Haaland 22/23 v Lewandowski 20/21 Compare suggestion
  '133095-141575',  // De Bruyne 19/20 v Suarez 15/16    Compare suggestion
  '131585-135556',  // Haaland 22/23 v Suarez 13/14      retired homepage pair, old links
  '151977-152972',  // Kane 23/24 v Lewandowski 20/21    homepage pair (back from 2026-10-19, no prose)
  '130728-158399',  // Salah 24/25 v Mbappe 21/22        retired homepage pair
  '131183-137957',  // Foden 23/24 v Bellingham 23/24    homepage pair (back from 2026-10-19, no prose)
  '131129-131220',  // Saka 23/24 v Palmer 23/24         retired homepage pair
  '130728-157393',  // Salah 24/25 v Dembele 24/25       homepage pair from 2026-10-19
  '131585-164395',  // Haaland 22/23 v Gyokeres 23/24    homepage pair from 2026-10-19
]);
/*  checkVerdictSupport, CHECK_MODEL, CHECK_SYSTEM, notesUserMessage and verdictProse left with the old writer
    (2026-10-25): the cited writer's drop rule and narrow check are what guard the endpoint.  */

/*  CLOSE THE SLOT BEFORE THE RESPONSE LEAVES, NOT AFTER (2026-10-12). The finally that called
    rlEnd ran AFTER res.json, and Vercel stops the function once the response is sent (SS C:
    writes go before the response). Measured on the live site the day it was found: 4 of 4
    finished generations left finished_at null, so RL_CONCURRENT counted every generation of the
    last 90 seconds as still running, and a reader's third new comparison inside that window got
    a 429. The 2026-10-04 note blamed the 35% leak on navigation and dead functions; it was this.
    So res.json is wrapped once per slot: the close is awaited, THEN the body is sent. The finally
    stays as the backstop for a path that throws before any response, and the flag stops a
    second close.  */
function rlCloseOnSend(res, id) {
  if (!id) return;
  const send = res.json.bind(res);
  res.json = async function (body) {
    if (!res._vvSlotClosed) { res._vvSlotClosed = true; await rlEnd(id); }
    return send(body);
  };
}

module.exports = async (req, res) => {
  /*  Fire the model probe WITHOUT awaiting it. It must never add latency to a
      request, and its answer is for the LOG, not for this response , the
      per-call classifier below is what protects the caller. Once per process. */
  if (MODEL_OK === null) { try { probeModel(); } catch (e) {} }
  /*  THE ORIGIN ALLOWLIST , 2026-09-15. READ WHAT IT DOES AND DOES NOT DO BEFORE TRUSTING IT.
      WHAT IT STOPS: another WEBSITE embedding this endpoint and spending our Anthropic credit
      from its visitors' browsers. That is browser-enforced and it is real.
      WHAT IT DOES NOT STOP, AND THIS MUST NOT BE OVERCLAIMED: a scripted client. `Origin` is a
      request header like any other, and curl will send whatever string you tell it to. This
      raises the bar from "POST and it works" to "POST with one extra header", which is a speed
      bump and not a wall. THE RATE LIMIT IS THE ACTUAL CONTROL and it is not built yet.
      ABSENT ORIGIN IS REFUSED, and that is the decision this usually gets wrong. Allowing a
      missing header is a one-flag bypass, which makes the whole list decorative. VERIFIED
      EMPIRICALLY rather than assumed: a same-origin POST from a real browser DOES send Origin
      (measured against an echo server , `origin: http://localhost:8901`, `sec-fetch-site:
      same-origin`), while curl sends none. So refusing costs a normal visitor NOTHING.
      WHAT IT COSTS A REAL PERSON: a browser or extension that strips Origin gets no verdict and
      no notes, and sees the generic failure. That population is very small and the alternative
      is a list that any script walks straight through.
      THE DOMAINS ARE READ OFF THE VERCEL PROJECT, NOT TYPED FROM MEMORY , four, not five:
      vvonderxi.com, www.vvonderxi.com, v-vonder-xi.vercel.app, and vvonderxi-preview.vercel.app
      (pinned to the redesign-compare branch). The wildcard covers Vercel's GENERATED per-branch
      and per-deployment URLs, which are NOT in the domain list , the live branch preview is
      `v-vonder-xi-git-redesign-compare-...vercel.app`, and an allowlist built from the domain
      list alone would block development on every preview deploy.
      LOCALHOST IS ALLOWED AND IT COSTS NOTHING: a script that would spoof `http://localhost`
      could equally spoof `https://vvonderxi.com`, so excluding it buys no security and breaks
      local development.  */
  const ALLOWED_ORIGINS = new Set([
    'https://vvonderxi.com',
    'https://www.vvonderxi.com',
    'https://v-vonder-xi.vercel.app',
    'https://vvonderxi-preview.vercel.app'
  ]);
  /*  [CORRECTED 2026-10-03 , THE WILDCARD NEVER MATCHED A REAL PREVIEW HOST.]
      It was `^https://v-vonder-xi-[a-z0-9-]+\.vercel\.app$`, written against the PROJECT
      SLUG (`v-vonder-xi`) on the assumption that Vercel prefixes generated hosts with it.
      It does not. The live preview is
          v-vonder-by5k2ln3p-lucsa-vanlauwe-s-projects.vercel.app
      , `v-vonder-` then a per-deployment hash, with no `xi` anywhere, so the pattern could
      not match and the endpoint 403'd its own preview. Every AI feature was dead on every
      preview deploy: no verdicts on Compare, no notes or scout report on a card. Measured
      against the live host, not reasoned about.
      SO IT ANCHORS ON THE ACCOUNT SUFFIX, WHICH IS OBSERVED, RATHER THAN ON THE PROJECT
      PREFIX, WHICH WAS GUESSED. `-lucsa-vanlauwe-s-projects.vercel.app` is the account
      scope: Vercel derives it from the account and no other account can produce it, so a
      stranger cannot register a project that satisfies it. The hash regenerates per
      deployment; the suffix does not, which is exactly why it is the half to anchor on.
      IT IS DELIBERATELY NOT `[a-z0-9-]+\.vercel\.app` , that would admit EVERY project
      on the platform, including an attacker's, and turn the allowlist into decoration.  */
  const ALLOWED_PATTERNS = [
    /^https:\/\/[a-z0-9-]+-lucsa-vanlauwe-s-projects\.vercel\.app$/,  // this account's generated hosts
    /^https:\/\/v-vonder-xi-[a-z0-9-]+\.vercel\.app$/,                // kept: older alias shape
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/
  ];
  const origin = req.headers && req.headers.origin;
  const originOK = !!origin && (ALLOWED_ORIGINS.has(origin) || ALLOWED_PATTERNS.some(re => re.test(origin)));
  /*  ECHO THE ORIGIN, NEVER `*`. A wildcard tells every browser the endpoint is public, which
      is the thing being withdrawn. Vary:Origin so a shared cache cannot serve one site's
      allowed response to another.  */
  if (originOK) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(originOK ? 200 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!originOK) {
    console.error('[vv] refused origin:', origin || '(absent)');
    return res.status(403).json({ error: 'origin not allowed' });
  }

  /*  THE PROSE SWITCH, OFF BY DEFAULT (2026-10-17, owner's decision; three-valued since the port of 2026-10-25).
      Absent or anything but the two values below: nothing is generated, billed or served, and each page renders
      the off state as a choice (Compare: the held shape, winner null; the card: { off: true }).
      VV_PROSE=verdicts: the Compare verdict only; notes stay off.   VV_PROSE=on: both.
      WHAT SERVES A VERDICT NOW IS THE CITED WRITER (scripts/calibration/cited.js): a numbered fact list built from
      the request (the two Player lines the page sends, the honour and tag copy in vv-core.js, and the result line
      the page prints under THE VERDICT, rebuilt here and refused if it disagrees), a writer that cites a fact for
      every sentence, code that deletes anything uncited or unsupported, a narrow model check per sentence, and a
      whole-piece rejection that becomes "no prose" rather than a gutted piece. The old writer is gone from this
      file (git history before 2026-10-25). THE SWITCH IS STILL OFF: it moves when the two samples have run through
      the preview deployment and Lucas decides (docs/PROSE_CASE_2026-10-24.md).  */
  const PROSE = process.env.VV_PROSE;
  const isNotes = !!(req.body && req.body.mode === 'notes');
  const verdictsOn = PROSE === 'on' || PROSE === 'verdicts', notesOn = PROSE === 'on';
  if (isNotes ? !notesOn : !verdictsOn) {
    return res.json(isNotes ? { off: true } : { held: true, off: true, winner_card_id: null, cached: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { messages, cardIdA, cardIdB, rtA, rtB, payloadRev, statsRev, resultLine } = req.body;
    /*  THE INPUT BOUND IS UNCHANGED (2026-09-15, 2026-10-03): 12,000 characters on what the request carries into
        the fact list. The output bound is now inside the cited writer (4,000 tokens for the draft, 400 for each
        narrow check), so the caller no longer chooses the bill at all; `max_tokens` from the body is ignored.  */
    const MAX_INPUT_CHARS = 12000;
    if (!isNotes) {
      if (!Array.isArray(messages) || !messages.length)
        return res.status(400).json({ error: 'messages must be a non-empty array' });
      const shaped = messages.every(m => m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
      if (!shaped) return res.status(400).json({ error: 'each message needs a role of user or assistant and string content' });
      let chars = 0;
      try { chars = JSON.stringify(messages).length + (typeof resultLine === 'string' ? resultLine.length : 0); } catch (e) { chars = Infinity; }
      if (!(chars <= MAX_INPUT_CHARS)) return res.status(413).json({ error: 'prompt too large' });
    } else {
      let nchars = 0;
      try { nchars = JSON.stringify(req.body.player == null ? '' : req.body.player).length; } catch (e) { nchars = Infinity; }
      if (!(nchars <= MAX_INPUT_CHARS)) return res.status(413).json({ error: 'prompt too large' });
    }

    /*  THE CACHE VERSION IS DERIVED, AS BEFORE (RULES.md §C): the cited writer's RULES_VERSION (a hand rev for the
        code rules plus a fingerprint of its prompts and formats), then the page's payloadRev (the key set of what
        it sends) and statsRev (the values) for a verdict. Every row written by the old writer carries a version
        this can never equal, so all of them are stale by construction and regenerate on their next view.  */
    const verdictVersion = CITED.RULES_VERSION + (payloadRev ? '-' + payloadRev : '') + (statsRev ? '-' + statsRev : '');
    const hasDb = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
    const db = () => { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); };
    /*  A PIECE THAT CAME BACK FROM UPSTREAM AS AN ERROR ON EVERY ATTEMPT IS NOT "NO PROSE", IT IS AN OUTAGE: it is
        not cached (a cached no-prose row would hide an outage until the version moved) and the page gets its
        outage line. A piece the rules rejected twice IS no prose, by choice, and is cached as such.  */
    const upstreamFailed = out => !!(out && out.attempts && out.attempts.length && out.attempts.every(a => a.error));
    /*  WHY A PIECE DIED, IN THE LOG (2026-10-25, pass 1 of the proof runs): the endpoint returns no attempts, so the
        rejection reasons, the headline and every deleted sentence with its reason are logged here, or the only
        record of a no-prose outcome is the word itself.  */
    const whyLog = out => (out.attempts || []).map(a => a.error ? { attempt: a.attempt, error: String(a.error).slice(0, 120) }
      : { attempt: a.attempt, reasons: a.reasons, deleted: (a.units || []).filter(u => !u.kept).map(u => ({ f: u.field, s: String(u.s).slice(0, 140), why: u.why })) });

    /* ────────────────────────────── NOTES (a card) ────────────────────────────── */
    if (isNotes) {
      const cid = Number(req.body.cardId);
      const player = req.body.player || {};
      const canCache = Number.isFinite(cid) && hasDb;
      const _nRt = Number(player.rt);
      const nRt = Number.isFinite(_nRt) ? _nRt : null;
      const nHash = statsHash(player);
      let nsb = null;
      if (canCache) {
        nsb = db();
        try {
          const { data: row } = await nsb.from('notes_cache')
            .select('notes, model, rt, stats_hash, cache_version').eq('card_id', cid).maybeSingle();
          const fresh = row && row.model === MODEL && row.notes && typeof row.notes === 'object'
                     && row.cache_version === CITED.RULES_VERSION && row.stats_hash != null && nHash != null && row.stats_hash === nHash;
          if (fresh && row.notes._noprose) return res.json({ off: true, cached: true });
          if (fresh && typeof row.notes.glance === 'string' && typeof row.notes.scout === 'string' && Array.isArray(row.notes.notes) && row.notes.notes.length) {
            return res.json({ glance: row.notes.glance, scout: row.notes.scout, notes: row.notes.notes, cached: true });
          }
        } catch (e) { /* cache read failed -> generate */ }
      }
      let pack;
      try { pack = CITED.notesFacts(player); } catch (e) { return res.status(400).json({ error: 'player shape invalid' }); }
      /*  THE RATE LIMIT COUNTS A GENERATION, NOT A MODEL CALL (the cited writer makes about forty of them for one
          piece). A cache hit has already returned above and is never counted or billed.  */
      const _rl = await rlBegin(clientIP(req), 'notes');
      if (!_rl.ok) {
        res.setHeader('Retry-After', String(_rl.retryAfter));
        return res.status(429).json({ error: _rl.reason === 'concurrent'
          ? 'too many generations in flight from this connection, try again shortly'
          : _rl.reason === 'global'
          ? 'the platform is at its hourly generation ceiling, try again shortly'
          : 'hourly generation limit reached for this connection' });
      }
      rlCloseOnSend(res, _rl.id);
      try {
        const out = await CITED.runPiece(pack);
        if (upstreamFailed(out)) {
          console.error('[vv] notes upstream failed card=' + cid + ' ' + String((out.attempts[0] || {}).error || '').slice(0, 160));
          return res.status(502).json({ error: 'upstream error' });
        }
        if (!out.prose) {
          console.error('[vv] notes no-prose card=' + cid + ' why=' + out.why + ' ' + JSON.stringify(whyLog(out)));
          if (canCache) { try { await nsb.from('notes_cache').upsert({ card_id: cid, notes: { _noprose: true, why: out.why, at: new Date().toISOString() }, model: MODEL, rt: nRt, stats_hash: nHash, cache_version: CITED.RULES_VERSION }, { onConflict: 'card_id', ignoreDuplicates: false }); } catch (e) { /* non-fatal */ } }
          return res.json({ off: true, cached: false });
        }
        if (canCache) {
          try {
            await nsb.from('notes_cache').upsert({ card_id: cid, notes: out.prose, model: MODEL, rt: nRt, stats_hash: nHash, cache_version: CITED.RULES_VERSION }, { onConflict: 'card_id', ignoreDuplicates: false });
          } catch (e) { /* non-fatal */ }
        }
        return res.json({ glance: out.prose.glance, scout: out.prose.scout, notes: out.prose.notes, cached: false });
      } finally { if (!res._vvSlotClosed) await rlEnd(_rl.id); }
    }

    /* ────────────────────────────── VERDICT (a comparison) ────────────────────────────── */
    /*  THE FACT LIST COMES FROM THE TWO PLAYER LINES THE PAGE SENDS, and P1, "the page's own result", from the line
        the page prints under THE VERDICT. THE SERVER REBUILDS THAT LINE ITSELF (VVCore.verdictContext on the two
        scores, the ages on the lines and the pair's margin from vv-margin.js, then VVCore.vvResultLine, the same
        function compare.html prints with) and refuses a request whose line disagrees. That is failure kind 3's
        mechanism closed by construction: the writer is bound to the page's own result, never told about the
        separation in instructions and left to argue. The crown and the winner come from the same context, so
        winner_card_id is the engine's and never the model's.  */
    const content = messages.map(m => m.content).join('\n');
    const lineA = content.split('\n').find(l => /^Player A: /.test(l)), lineB = content.split('\n').find(l => /^Player B: /.test(l));
    if (!lineA || !lineB) return res.status(400).json({ error: 'the request must carry the two player lines' });
    const _a = Number(cardIdA), _b = Number(cardIdB), _rtA = Number(rtA), _rtB = Number(rtB);
    if (!Number.isFinite(_a) || !Number.isFinite(_b) || !Number.isFinite(_rtA) || !Number.isFinite(_rtB))
      return res.status(400).json({ error: 'cardIdA, cardIdB, rtA and rtB are required' });
    const ageOf = l => { const m = l.match(/, age (\d+)/); return m ? +m[1] : null; };
    const surOf = l => ((l.match(/^Player [AB]: ([^(]+?) \(/) || [])[1] || '').trim();
    const ctx = VVCore.verdictContext({ vv: _rtA, season_age: ageOf(lineA), card_id: _a }, { vv: _rtB, season_age: ageOf(lineB), card_id: _b });
    const serverLine = VVCore.vvResultLine(ctx, { surname: surOf(lineA), vv: _rtA }, { surname: surOf(lineB), vv: _rtB }, ctx.winner);
    if (typeof resultLine !== 'string' || resultLine.trim() !== serverLine) {
      console.error('[vv] result line disagrees pair=' + _a + 'x' + _b + ' page="' + String(resultLine || '').slice(0, 120) + '" server="' + serverLine + '"');
      return res.status(400).json({ error: 'result line disagrees with the margin' });
    }
    const winnerId = ctx.winner === 'A' ? _a : ctx.winner === 'B' ? _b : null;

    const cacheable = hasDb;
    const swapVerdict = (v) => ({ who: v.who, p1: v.p2, p2: v.p1, h2h: v.h2h, verdict: v.verdict });
    let sb = null, pairKey = null, loId = null, hiId = null, swapped = false, rtLo = null, rtHi = null;
    if (cacheable) {
      sb = db();
      loId = Math.min(_a, _b); hiId = Math.max(_a, _b);
      pairKey = loId + '-' + hiId;
      /*  HELD PAIRS answer with the result and no prose whatever the switch says (2026-10-17; the list is above).
          TO RELEASE A PAIR: take it out of the list once its verdict has been read and passed.  */
      if (HELD_PAIRS.has(pairKey)) return res.json({ held: true, winner_card_id: null, cached: true });
      swapped = (_a !== loId);   // requester's A is the HIGHER id -> their order is swapped vs canonical (RULES.md: the swap trap)
      rtLo = swapped ? _rtB : _rtA; rtHi = swapped ? _rtA : _rtB;
      try {
        const { data: row } = await sb.from('verdict_cache')
          .select('verdict, winner_card_id, model, rt_a, rt_b, cache_version').eq('pair_key', pairKey).maybeSingle();
        const fresh = row && row.model === MODEL && row.verdict && row.cache_version === verdictVersion
                   && row.rt_a === rtLo && row.rt_b === rtHi;
        if (fresh) {
          if (row.verdict._noprose || row.verdict._held) return res.json({ held: true, winner_card_id: winnerId, cached: true });
          const out = swapped ? swapVerdict(row.verdict) : row.verdict;   // remap to requester order
          return res.json({ verdict: out, winner_card_id: winnerId, cached: true });
        }
      } catch (e) { /* cache read failed -> fall through and generate */ }
    }

    const _rl = await rlBegin(clientIP(req), 'verdict');
    if (!_rl.ok) {
      res.setHeader('Retry-After', String(_rl.retryAfter));
      return res.status(429).json({ error: _rl.reason === 'concurrent'
        ? 'too many generations in flight from this connection, try again shortly'
        : _rl.reason === 'global'
        ? 'the platform is at its hourly generation ceiling, try again shortly'
        : 'hourly generation limit reached for this connection' });
    }
    rlCloseOnSend(res, _rl.id);   // the slot closes before the response leaves , see the function
    try {
      const pack = CITED.verdictFactsFrom(lineA, lineB, serverLine);
      const out = await CITED.runPiece(pack);   // a keeper pair returns no prose at once, no model call
      if (upstreamFailed(out)) {
        console.error('[vv] verdict upstream failed pair=' + pairKey + ' ' + String((out.attempts[0] || {}).error || '').slice(0, 160));
        return res.status(502).json({ error: 'upstream error' });
      }
      if (!out.prose) {
        console.error('[vv] verdict no-prose pair=' + (pairKey || _a + 'x' + _b) + ' why=' + out.why + ' ' + JSON.stringify(whyLog(out)));
        if (cacheable) {
          try {
            await sb.from('verdict_cache').upsert({ pair_key: pairKey, card_id_a: loId, card_id_b: hiId, rt_a: rtLo, rt_b: rtHi, cache_version: verdictVersion,
              verdict: { _noprose: true, why: out.why, at: new Date().toISOString() }, winner_card_id: winnerId, model: MODEL }, { onConflict: 'pair_key', ignoreDuplicates: false });
          } catch (e) { /* non-fatal */ }
        }
        return res.json({ held: true, winner_card_id: winnerId, cached: false });
      }
      if (cacheable) {
        const canonical = swapped ? swapVerdict(out.prose) : out.prose;   // store p1<->loId, p2<->hiId
        try {
          await sb.from('verdict_cache').upsert({ pair_key: pairKey, card_id_a: loId, card_id_b: hiId, rt_a: rtLo, rt_b: rtHi, cache_version: verdictVersion,
            verdict: canonical, winner_card_id: winnerId, model: MODEL }, { onConflict: 'pair_key', ignoreDuplicates: false });
        } catch (e) { /* cache write failed -> non-fatal, still return the verdict */ }
      }
      return res.json({ verdict: out.prose, winner_card_id: winnerId, cached: false });
    } finally { if (!res._vvSlotClosed) await rlEnd(_rl.id); }
  } catch (err) {
    /*  THE RESPONSE SAYS IT FAILED AND NOTHING ELSE; the log is where diagnosis belongs.  */
    console.error('analyse error:', err);
    return res.status(500).json({ error: 'generation failed' });
  }
};

/*  Exports for the scripts that pin or read this file (lint-inline pins statsHash and parseModelJSON; lint-ai-cache
    reads the versions; rl_control requires the handler). The three version names are kept for lint-ai-cache and
    all equal the cited writer's RULES_VERSION: there is one writer and one prompt set now.  */
module.exports.probeModel      = probeModel;
module.exports.isModelMissing  = isModelMissing;
module.exports.MODEL           = MODEL;
module.exports.RULES_VERSION   = CITED.RULES_VERSION;
module.exports.VERDICT_VERSION = CITED.RULES_VERSION;
module.exports.VERDICT_VERSION_JUDGE = CITED.RULES_VERSION;
module.exports.NOTES_VERSION   = CITED.RULES_VERSION;
module.exports.verdictVersionFor = (rev, _judge, _custom, statsRev) => CITED.RULES_VERSION + (rev ? '-' + rev : '') + (statsRev ? '-' + statsRev : '');
module.exports.statsHash       = statsHash;   // exported so the linter can pin it , see the note above its definition
module.exports.parseModelJSON = parseModelJSON;   // exported so the linter can pin it against VVCore.vvParseModelJSON
