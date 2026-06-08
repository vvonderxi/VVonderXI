// /api/log.js — VVonderXI Analytics
// Logs comparisons and searches to Supabase.
// Does the DB write FIRST, then returns 200.
// Fast enough (<500ms) that users won't notice.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.log('log.js: missing env vars');
      return res.status(200).json({ ok: true });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const body = req.body || {};
    const type = body.type;

    console.log('log.js: type=' + type + ' p1=' + body.p1_name + ' p2=' + body.p2_name);

    if (type === 'comparison') {
      const { error } = await supabase.from('comparison_log').insert({
        p1_name:         body.p1_name        || null,
        p2_name:         body.p2_name        || null,
        p1_season:       body.p1_season      || null,
        p2_season:       body.p2_season      || null,
        p1_vv_score:     body.p1_vv_score    || null,
        p2_vv_score:     body.p2_vv_score    || null,
        winner_name:     body.winner_name    || null,
        margin_band:     body.margin_band    || null,
        deciding_factor: body.deciding_factor || null,
        mode:            body.mode           || 'standard',
        session_id:      body.session_id     || null,
        created_at:      new Date().toISOString(),
      });
      if (error) console.log('log.js: insert error:', JSON.stringify(error));
      else console.log('log.js: comparison_log SUCCESS');

    } else if (type === 'search') {
      const { error } = await supabase.from('search_log').insert({
        query:        body.query        || null,
        result_count: body.result_count != null ? body.result_count : null,
        source:       body.source       || null,
        session_id:   body.session_id   || null,
        created_at:   new Date().toISOString(),
      });
      if (error) console.log('log.js: search insert error:', JSON.stringify(error));
      else console.log('log.js: search_log SUCCESS');
    }

  } catch (e) {
    console.log('log.js error:', e.message);
  }

  // Return AFTER the DB write completes
  return res.status(200).json({ ok: true });
};
