// /api/analyse.js
// Proxies requests to Anthropic Claude API securely
// API key never exposed to frontend

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
    const { messages, max_tokens = 1400 } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens,
        system: `You are an elite football scout and data analyst with 20+ years of experience at top European clubs. 
You think like the best minds in the game — Pep Guardiola's analytics team, Moneyball-style data departments, Ralf Rangnick's pressing philosophy meets cold hard numbers.
You write scouting reports for sporting directors who need clear, evidence-based recommendations.
Your reports are direct, specific, and always reference exact numbers. You never use vague phrases like "solid" or "impressive" — you say exactly WHY the output matters, what it means positionally, and what it predicts about the player's future.
You always respond with valid JSON only — no markdown, no code blocks, no preamble.`,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    return res.json(data);
  } catch (err) {
    console.error('analyse error:', err);
    return res.status(500).json({ error: err.message });
  }
};
