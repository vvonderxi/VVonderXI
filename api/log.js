// /api/log.js — VVonderXI Analytics
// Fire-and-forget logging for comparisons and searches.
// Non-blocking: always returns 200 so frontend never waits on this.
// Tables created on first use via upsert — no migration needed.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ ok: true }); // silent pass

  // Always return 200 immediately — never block the user
  res.status(200).json({ ok: true });

  // Log async after response sent
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.log('log.js: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env var');
      return;
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const body = req.body || {};
    const type = body.type; // 'comparison' or 'search'

    if (type === 'comparison') {
      await supabase.from('comparison_log').insert({
        p1_name:        body.p1_name     || null,
        p2_name:        body.p2_name     || null,
        p1_season:      body.p1_season   || null,
        p2_season:      body.p2_season   || null,
        p1_vv_score:    body.p1_vv_score || null,
        p2_vv_score:    body.p2_vv_score || null,
        winner_name:    body.winner_name || null,
        margin_band:    body.margin_band || null,
        deciding_factor:body.deciding_factor || null,
        mode:           body.mode        || 'standard',
        session_id:     body.session_id  || null,
        created_at:     new Date().toISOString(),
      });
    } else if (type === 'search') {
      await supabase.from('search_log').insert({
        query:       body.query       || null,
        result_count:body.result_count != null ? body.result_count : null,
        source:      body.source      || null, // 'local' | 'supabase' | 'bsd' | 'zero'
        session_id:  body.session_id  || null,
        created_at:  new Date().toISOString(),
      });
    }
  } catch (e) {
    // Silent — never surface errors to user
    console.log('log.js error (non-critical):', e.message);
  }
};
