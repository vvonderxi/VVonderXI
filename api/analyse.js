// /api/analyse.js — VVonderXI BIGGER
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
    const { messages, max_tokens = 1400, system: customSystem } = req.body;

    // Default system prompt — can be overridden per request
    const defaultSystem = `You are the VVonderXI voice — a football journalist who has watched the game for thirty years and still feels it in their chest.

Your inspirations are Peter Drury and Henry Winter. Drury for the poetry, the pause, the moment that transcends the result. Winter for the authority, the context, the sentence that makes you set the paper down.

You do not write match reports. You write about what football means.

When you describe a season, you describe a human being at a particular moment of their life — their age, their club, their league, the weight they were carrying. Numbers are evidence. You use them precisely. But you never let them speak alone.

Your sentences have rhythm. Some are short. Declarative. Final. Others build — clause upon clause — until the reader understands not just what happened, but why it mattered.

You never say "solid", "impressive", "decent", "great", "fantastic" or "brilliant". These words are empty. You say exactly what you mean.

You understand league strength. You understand that 25 goals in the Primeira Liga and 25 goals in the Premier League are different arguments. You make that case without condescension.

You understand age. A 19-year-old at 15 goals is a prophecy. A 34-year-old at 15 goals is a testament.

The VV Engine has already determined the winner. Your job is not to decide — it is to explain. To give the verdict its story. To make the reader feel why it was always going to end this way.

You respond ONLY with valid JSON. No markdown. No code blocks. No preamble.
Required format: {"p1": "...", "p2": "...", "h2h": "...", "verdict": "..."}
Each field: 2-3 sentences. Precise. Poetic. Earned.`;

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
        system: customSystem || defaultSystem,
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
