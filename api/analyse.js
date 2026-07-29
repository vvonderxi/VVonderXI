// /api/analyse.js , VVonderXI BIGGER
// Proxies requests to Anthropic Claude API securely

const crypto = require('crypto');

const MODEL = 'claude-sonnet-4-6';

// ═══ CACHE VERSIONS , derived, not hand-typed ═══════════════════════════════
// TWO SEPARATE versions, one per cache. They were previously a single shared
// constant, which meant editing the NOTES prompt invalidated every VERDICT row
// too (and vice versa) , needless regeneration, real money.
//
// Each version is PROMPT_REV + a fingerprint of the exact system-prompt text it
// governs. The fingerprint means ANY edit to a prompt auto-bumps that cache's
// version, so cached prose written under an older prompt can never survive a
// prompt rewrite , you cannot forget to bump it, because you are not the one
// bumping it. That was the real gap: the old constant was a hand-typed literal
// with nothing in the code linking it to the prompt it was supposed to track.
//
// BUMP PROMPT_REV BY HAND only for changes the fingerprint cannot see, because
// they live in another file:
//   - the VERDICT_TAGS vocabulary (vv-core.js) , tag names/blurbs enter the
//     USER prompt, which is per-pair and so cannot be fingerprinted globally
//   - the user-prompt builder in compare.html / scripts/prewarm_verdicts.js
const PROMPT_REV = 'v2';
const fingerprint = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);

// Complete freshness signal for the notes cache: hash the exact player payload
// the prompt cites, key-sorted so field order can't false-invalidate, tags
// sorted for the same reason.
const statsHash = (p) => {
  if (!p || typeof p !== 'object') return null;
  const norm = {};
  Object.keys(p).sort().forEach(k => {
    norm[k] = Array.isArray(p[k]) ? p[k].slice().map(String).sort() : p[k];
  });
  return crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex').slice(0, 16);
};

const VERDICT_SYSTEM = `You are the VVonderXI voice. You have watched football for thirty years and you still feel it in your chest.

Your writing draws from two traditions. Peter Drury: the pause before the word that changes everything, the sentence that finds the human truth inside the statistic, the ability to make a number feel like a life. Henry Winter: the authority of someone who has sat in every press box in Europe, the precision that only comes from watching the same players across a decade, the final line that closes an argument without closing the debate.

You do not summarise. You interpret. You do not list. You build a case.

When you write about a player, you write about a specific human being at a specific moment in their career. Their age matters. A 19-year-old producing at this level is a prophecy; a 32-year-old producing at it is defiance. Their club matters, the system they played in, the quality around them, what was asked of them. Their league matters, and you understand that the same numbers in different competitions tell fundamentally different stories.

You reference VV Tags naturally and meaningfully. Not as decoration. As evidence. If a player is tagged Elite Finisher, you explain what that actually means for this specific player in this specific season. You make the tag earn its place.

You never use these words: solid, impressive, decent, great, fantastic, brilliant, amazing, incredible. These words say nothing. Say what you mean precisely.

STYLE RULES , these override any tendency toward generic prose:
1. NEVER use em-dashes (—) or en-dashes (–). Use commas, periods, or restructure. Absolute.
2. BANNED phrases: "It's not just X, it's Y" / "not just X but Y" / "more than just" / "a testament to" / "stands as" / "a different kind of" / "a masterclass in" / "proof that" / "the kind of X that" / "cements" / "in a league of his own" / "rewrote the book" / "etched". Avoid these and close variants.
3. VOICE , two registers: WINTER (sharp, authoritative, analytical) for engine explanation, dimension analysis, and reasoning; DRURY (poetic, elevated, earned not purple) for the verdict's closing beat. Match register to purpose.
4. Write like a human football expert, not a model describing a player. Concrete over abstract, specific over sweeping.
5. PARAGRAPHS , the longer prose fields (p1, p2) must read as 2, at most 3, short paragraphs, NOT one dense block. Separate paragraphs with a blank line (two newline characters, \n\n) inside the JSON string value. Each paragraph is 1-2 sentences. Do NOT break the short fields (h2h, verdict, who) , those stay single.

When the two players' VV scores DIFFER, the VV Index has already decided the winner: you do not overturn it, you explain why that season prevailed. When the two VV scores are EQUAL, the engine has deliberately left the call to you: break the tie using the full profile , the complete stat line and all five radar dimensions , and pick a narrow, defensible winner. Never declare a flat draw.

CRITICAL INTELLIGENCE LAYER: Role-based weighting
The VV Index scores players across 5 dimensions: Output, Influence, Consistency, League Strength, Role Rarity.
The same raw stats have radically different meaning at different positions:
- 10 assists for a striker = Good. For a full-back = Elite. For a centre-back = S-Tier.
- 20 goals for a striker = Very Good. For a midfielder = Generational.
- Role Rarity bonuses are awarded when a defensive player produces attacking output that breaks expectations.

When the prompt data includes a VV Index breakdown, USE it. Say things like:
"The Role Rarity dimension is what separates this comparison , Alexander-Arnold's creative output scores higher than the raw numbers suggest, precisely because a right-back producing at this rate is a structural rarity in football."

Position labels are passed in the prompt. Reference them. A left-back producing at Elite level for their role should be described as such, not diminished by comparison to a striker. You make the reader understand what happened, and why it was always going to end this way.

OUTPUT FORMAT:
You respond ONLY with valid JSON. No markdown. No code blocks. No preamble. No explanation outside the JSON.

Required format:
{"p1": "...", "p2": "...", "h2h": "...", "verdict": "...", "tag": "...", "who": "..."}

OUTPUT LENGTH:
- p1: 3-4 sentences, split into 2 short paragraphs (blank line between). Club, role, VV tags, what this season meant. Precise and poetic.
- p2: 3-4 sentences, split into 2 short paragraphs (blank line between). Same depth. Equal analytical weight.
- h2h: 2-3 sentences. The real argument. What does context change?
- verdict: 2-3 sentences. Authoritative. Final. One quotable closing sentence.
- tag: when the user prompt provides a VERDICT TAG list, return the single chosen KEY verbatim (one of the provided keys, nothing else). Default to the first key; up-rank only if another clearly fits better. If no tag list is provided, omit this field.
- who: ONE short winner headline, max ~14 words, in the REGISTER OF THE CHOSEN TAG and the TONE given in the prompt. This is a headline, not prose. The margin must MATCH the words: a decisive gap reads decisive and settled; the finest of margins keeps the restraint of "edges it"; a tie reads as unresolved, the argument continuing, never a flat draw. Name the winner and include BOTH VV scores as passed. If AGE tipped a coin-flip, lead with the younger-age feat. Do NOT write "edges it" for a decisive gap. If no verdict tag list is provided, omit this field.
Write tight. Every word earns its place.`;

const NOTES_SYSTEM = VERDICT_SYSTEM + `

YOU ARE NOW WRITING COMMENTATOR'S NOTES for a SINGLE player-season, not a comparison. Take the full card into account: player, age, club, league, position, goals, assists, VV tags, VV score, and the radar dimensions provided. Write in the Peter Drury register: poetic, emotional, the human truth inside the numbers.

OUTPUT FORMAT:
Respond with ONLY a valid JSON object, no markdown, no code blocks, no preamble. Exactly these three keys:
{
  "glance": "ONE single sentence. The essence of this season in one breath, Peter Drury at his most distilled. This is the hero line, it must land instantly.",
  "scout": "TWO to THREE sentences. A scout's verdict on where this season sits in the player's career arc, what it proves, what it costs to deny. Authoritative, the close of an argument.",
  "notes": ["four", "stanzas", "as", "before"]
}
The "notes" value is an array of exactly 4 strings, each a short stanza of 2 to 3 sentences (same rules as before: stanza 1 essence, 2 human/context, 3 tags+numbers as evidence, 4 a closing line that lingers).
Never use em-dashes, use spaced commas. Every word earns its place. Do not wrap the JSON in anything.`;

// Derived AFTER the prompts, so each fingerprint tracks the exact text it governs.
const VERDICT_VERSION = PROMPT_REV + '-' + fingerprint(VERDICT_SYSTEM);
const NOTES_VERSION   = PROMPT_REV + '-' + fingerprint(NOTES_SYSTEM);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { messages, max_tokens = 1024, system: customSystem, cardIdA, cardIdB, winnerCardId, rtA, rtB } = req.body;

    // ── Verdict self-cache (server-side, service key). Active only when both
    //    card ids are present + numeric; otherwise this stays a generic proxy. ──
    const _a = Number(cardIdA), _b = Number(cardIdB);
    const cacheable = cardIdA != null && cardIdB != null
      && Number.isFinite(_a) && Number.isFinite(_b)
      && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
    // tag is symmetric (describes the matchup, not a slot) , carried through unchanged on swap
    // who is winner-oriented (names the winner + margin), NOT A/B-oriented, so it is carried
    // through the A<->B swap unchanged, same as h2h/verdict/tag.
    const swapVerdict = (v) => ({ p1: v.p2, p2: v.p1, h2h: v.h2h, verdict: v.verdict, tag: v.tag, who: v.who });
    let sb = null, pairKey = null, loId = null, hiId = null, swapped = false, rtLo = null, rtHi = null;
    if (cacheable) {
      const { createClient } = require('@supabase/supabase-js');
      sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      loId = Math.min(_a, _b); hiId = Math.max(_a, _b);
      pairKey = loId + '-' + hiId;
      swapped = (_a !== loId);   // requester's A is the HIGHER id -> their order is swapped vs canonical
      // Live scores, mapped from the requester's slot order into CANONICAL lo/hi
      // order , the same swap the verdict payload goes through. Getting this
      // backwards would compare Player A's score against Player B's stamp and
      // invalidate every swapped-order pair on every read.
      const _rtA = Number(rtA), _rtB = Number(rtB);
      const haveRt = Number.isFinite(_rtA) && Number.isFinite(_rtB);
      if (haveRt) { rtLo = swapped ? _rtB : _rtA; rtHi = swapped ? _rtA : _rtB; }
      try {
        const { data: row } = await sb.from('verdict_cache')
          .select('verdict, winner_card_id, model, rt_a, rt_b, cache_version').eq('pair_key', pairKey).maybeSingle();
        // MISS conditions, in order of what they protect against:
        //  (1) unstamped legacy row      -> always a miss, regenerates on demand
        //  (2) prompt/tag vocab changed  -> prose predates the current contract
        //  (3) either score moved        -> prose would contradict the live panel
        // A request that supplies no rt cannot check (3), but (1) and (2) still
        // apply, so a legacy row is never served as valid.
        const unstamped = !row || row.rt_a == null || row.rt_b == null || row.cache_version == null;
        const staleVersion = !!row && row.cache_version !== VERDICT_VERSION;
        const staleScore = !!row && haveRt && (row.rt_a !== rtLo || row.rt_b !== rtHi);
        if (row && row.model === MODEL && row.verdict && !unstamped && !staleVersion && !staleScore) {
          const out = swapped ? swapVerdict(row.verdict) : row.verdict;   // remap to requester order
          return res.json({ verdict: out, winner_card_id: row.winner_card_id, cached: true });
        }
      } catch (e) { /* cache read failed -> fall through and generate */ }
    }


    // ── Commentator's Notes mode (single player, cached in notes_cache) ──
    if (req.body && req.body.mode === 'notes') {
      const cid = Number(req.body.cardId);
      const player = req.body.player || {};
      const canCache = Number.isFinite(cid) && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
      // Stamps for this card: the score shown beside the prose, plus a hash of
      // EVERY stat the prompt cites (card.html already sends rt inside `player`,
      // so no client change is needed here).
      const _nRt = Number(player.rt);
      const nRt = Number.isFinite(_nRt) ? _nRt : null;
      const nHash = statsHash(player);
      let nsb = null;
      if (canCache) {
        const { createClient } = require('@supabase/supabase-js');
        nsb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        try {
          const { data: row } = await nsb.from('notes_cache')
            .select('notes, model, rt, stats_hash, cache_version').eq('card_id', cid).maybeSingle();
          // Same three miss conditions as the verdict path: unstamped legacy row,
          // prompt-version drift, or any cited stat having changed.
          const unstamped = !row || row.stats_hash == null || row.cache_version == null;
          const staleVersion = !!row && row.cache_version !== NOTES_VERSION;
          const staleStats = !!row && nHash != null && row.stats_hash !== nHash;
          const usable = row && row.model === MODEL && row.notes && typeof row.notes === 'object'
                       && Array.isArray(row.notes.notes) && row.notes.notes.length;
          if (usable && !unstamped && !staleVersion && !staleStats) {
            var cobj = row.notes;
            return res.json({ glance: cobj.glance, scout: cobj.scout, notes: cobj.notes, cached: true });
          }
        } catch (e) { /* cache read failed -> generate */ }
      }


      const notesMessages = [{ role: 'user', content: 'Write the Commentator\'s Notes for this player-season. Card data:\n' + JSON.stringify(player, null, 2) }];

      const nResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        // system sent as a cacheable block: it is byte-identical on every notes
        // call and well over the 1024-token minimum, so reads bill at ~0.1x.
        body: JSON.stringify({
          model: MODEL, max_tokens: 1500, messages: notesMessages,
          system: [{ type: 'text', text: NOTES_SYSTEM, cache_control: { type: 'ephemeral' } }]
        })
      });
      const nData = await nResp.json();
      if (!nResp.ok) return res.status(nResp.status).json({ error: (nData.error && nData.error.message) || 'Anthropic API error' });

      let parsed = null;
      try {
        let t = (nData && nData.content && nData.content[0] && nData.content[0].text) || '';
        t = t.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        parsed = JSON.parse(t);
      } catch (e) { return res.status(502).json({ error: 'notes parse failed' }); }
      if (!parsed || typeof parsed.glance !== 'string' || typeof parsed.scout !== 'string' || !Array.isArray(parsed.notes) || !parsed.notes.length) {
        return res.status(502).json({ error: 'notes shape invalid' });
      }
      if (canCache) {
        try {
          await nsb.from('notes_cache').upsert({
            card_id: cid, notes: parsed, model: MODEL,
            rt: nRt, stats_hash: nHash, cache_version: NOTES_VERSION   // stamps
          }, { onConflict: 'card_id', ignoreDuplicates: false });
        } catch (e) { /* non-fatal */ }
      }
      return res.json({ glance: parsed.glance, scout: parsed.scout, notes: parsed.notes, cached: false });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        // ~1,508-token system prompt, identical on every verdict call -> cache it.
        // Cuts per-verdict cost ~27% ($0.0149 -> $0.0108). A short customSystem
        // below the 1024-token minimum simply won't cache; that is silent + safe.
        system: [{ type: 'text', text: customSystem || VERDICT_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    // Generic path (no card ids): behave exactly as before.
    if (!cacheable) return res.json(data);

    // Cacheable path: parse the verdict JSON, cache it (awaited, Hobby-safe), return normalized.
    let verdict = null;
    try {
      let text = (data && data.content && data.content[0] && data.content[0].text) || '';
      text = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      verdict = JSON.parse(text);
    } catch (e) {
      return res.json(data);   // couldn't parse -> return raw, do not cache garbage
    }
    const _w = (winnerCardId != null) ? Number(winnerCardId) : NaN;
    const winnerId = Number.isFinite(_w) ? _w : null;
    const canonical = swapped ? swapVerdict(verdict) : verdict;   // store p1<->loId, p2<->hiId
    try {
      await sb.from('verdict_cache').upsert({
        pair_key: pairKey, card_id_a: loId, card_id_b: hiId,
        rt_a: rtLo, rt_b: rtHi, cache_version: VERDICT_VERSION,   // stamps (null rt if caller sent none)
        verdict: canonical, winner_card_id: winnerId, model: MODEL
      }, { onConflict: 'pair_key', ignoreDuplicates: false });
    } catch (e) { /* cache write failed -> non-fatal, still return the verdict */ }
    return res.json({ verdict: verdict, winner_card_id: winnerId, cached: false });
  } catch (err) {
    console.error('analyse error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Exported so scripts/prewarm_verdicts.js consumes the REAL values rather than
// re-deriving or parsing them , write and read can never drift.
module.exports.MODEL           = MODEL;
module.exports.VERDICT_SYSTEM  = VERDICT_SYSTEM;
module.exports.NOTES_SYSTEM    = NOTES_SYSTEM;
module.exports.VERDICT_VERSION = VERDICT_VERSION;
module.exports.NOTES_VERSION   = NOTES_VERSION;
