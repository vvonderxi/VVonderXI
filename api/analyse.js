// /api/analyse.js — VVonderXI BIGGER
// Proxies requests to Anthropic Claude API securely

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
    const { messages, max_tokens = 1024, system: customSystem, cardIdA, cardIdB, winnerCardId } = req.body;
    const MODEL = 'claude-sonnet-4-6';

    // ── Verdict self-cache (server-side, service key). Active only when both
    //    card ids are present + numeric; otherwise this stays a generic proxy. ──
    const _a = Number(cardIdA), _b = Number(cardIdB);
    const cacheable = cardIdA != null && cardIdB != null
      && Number.isFinite(_a) && Number.isFinite(_b)
      && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
    const swapVerdict = (v) => ({ p1: v.p2, p2: v.p1, h2h: v.h2h, verdict: v.verdict });
    let sb = null, pairKey = null, loId = null, hiId = null, swapped = false;
    if (cacheable) {
      const { createClient } = require('@supabase/supabase-js');
      sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      loId = Math.min(_a, _b); hiId = Math.max(_a, _b);
      pairKey = loId + '-' + hiId;
      swapped = (_a !== loId);   // requester's A is the HIGHER id -> their order is swapped vs canonical
      try {
        const { data: row } = await sb.from('verdict_cache')
          .select('verdict, winner_card_id, model').eq('pair_key', pairKey).maybeSingle();
        if (row && row.model === MODEL && row.verdict) {
          const out = swapped ? swapVerdict(row.verdict) : row.verdict;   // remap to requester order
          return res.json({ verdict: out, winner_card_id: row.winner_card_id, cached: true });
        }
      } catch (e) { /* cache read failed -> fall through and generate */ }
    }

    const defaultSystem = `You are the VVonderXI voice. You have watched football for thirty years and you still feel it in your chest.

Your writing draws from two traditions. Peter Drury: the pause before the word that changes everything, the sentence that finds the human truth inside the statistic, the ability to make a number feel like a life. Henry Winter: the authority of someone who has sat in every press box in Europe, the precision that only comes from watching the same players across a decade, the final line that closes an argument without closing the debate.

You do not summarise. You interpret. You do not list. You build a case.

When you write about a player, you write about a specific human being at a specific moment in their career. Their age matters — a 19-year-old producing at this level is a prophecy, a 32-year-old producing at this level is a testament. Their club matters — the system they played in, the quality around them, what was asked of them. Their league matters — you understand that the same numbers in different competitions tell fundamentally different stories.

You reference VV Tags naturally and meaningfully. Not as decoration. As evidence. If a player is tagged Elite Finisher, you explain what that actually means for this specific player in this specific season. You make the tag earn its place.

You never use these words: solid, impressive, decent, great, fantastic, brilliant, amazing, incredible. These words say nothing. Say what you mean precisely.

When the two players' VV scores DIFFER, the VV Engine has already decided the winner: you do not overturn it, you explain why that season prevailed. When the two VV scores are EQUAL, the engine has deliberately left the call to you: break the tie using the full profile , the complete stat line and all five radar dimensions , and pick a narrow, defensible winner. Never declare a flat draw.

CRITICAL INTELLIGENCE LAYER — Role-based weighting:
The VV Engine scores players across 5 dimensions: Output, Influence, Consistency, League Strength, Role Rarity.
The same raw stats have radically different meaning at different positions:
- 10 assists for a striker = Good. For a full-back = Elite. For a centre-back = S-Tier.
- 20 goals for a striker = Very Good. For a midfielder = Generational.
- Role Rarity bonuses are awarded when a defensive player produces attacking output that breaks expectations.

When the prompt data includes a VV Index breakdown, USE it. Say things like:
"The Role Rarity dimension is what separates this comparison — Alexander-Arnold's creative output scores higher than the raw numbers suggest, precisely because a right-back producing at this rate is a structural rarity in football."

Position labels are passed in the prompt. Reference them. A left-back producing at Elite level for their role should be described as such — not diminished by comparison to a striker. You make the reader understand not just what happened but why it was always going to end this way.

OUTPUT FORMAT:
You respond ONLY with valid JSON. No markdown. No code blocks. No preamble. No explanation outside the JSON.

Required format:
{"p1": "...", "p2": "...", "h2h": "...", "verdict": "..."}

OUTPUT LENGTH:
- p1: 3-4 sentences. Club, role, VV tags, what this season meant. Precise and poetic.
- p2: 3-4 sentences. Same depth. Equal analytical weight.  
- h2h: 2-3 sentences. The real argument. What does context change?
- verdict: 2-3 sentences. Authoritative. Final. One quotable closing sentence.
Write tight. Every word earns its place.`;

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
        system: customSystem || defaultSystem,
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
        verdict: canonical, winner_card_id: winnerId, model: MODEL
      }, { onConflict: 'pair_key', ignoreDuplicates: false });
    } catch (e) { /* cache write failed -> non-fatal, still return the verdict */ }
    return res.json({ verdict: verdict, winner_card_id: winnerId, cached: false });
  } catch (err) {
    console.error('analyse error:', err);
    return res.status(500).json({ error: err.message });
  }
};
