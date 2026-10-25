/*  THE SPEND ALARM (Lucas, 2026-10-25; a condition since 2026-10-17). A Vercel cron calls this once a day. It counts
 *  the day's generations in api_rate_events (the rate limiter writes one row per verdict or notes generation; a
 *  cache hit writes nothing; the table prunes itself after 24 hours, which is why the check is daily and late) and
 *  prices them at an upper bound per piece. If the estimate is over SPEND_ALERT_USD it mails ALERT_TO through
 *  Resend (RESEND_API_KEY). Without those three variables it still counts, logs and answers; it just cannot mail.
 *  IT IS AN ESTIMATE, NOT THE BILL: the measured cost on the proof runs was about $0.10 a shipped piece with the
 *  regenerations included; $0.12 is used so the alarm errs loud. The true figure is the Anthropic Console, which
 *  stays Lucas's. Protected by CRON_SECRET: Vercel sends it as a bearer token; anyone else gets 401.  */
const PER_PIECE_USD = 0.12;
module.exports = async (req, res) => {
  const auth = (req.headers && req.headers.authorization) || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorised' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'no database' });
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
  const { data, error } = await sb.from('api_rate_events').select('kind').gte('started_at', dayStart.toISOString());
  if (error) return res.status(500).json({ error: 'count failed' });
  const n = { verdict: 0, notes: 0, refused: 0 };
  for (const r of data || []) { if (r.kind === 'verdict') n.verdict++; else if (r.kind === 'notes') n.notes++; else if (/^refused/.test(r.kind || '')) n.refused++; }
  const estimate = Math.round((n.verdict + n.notes) * PER_PIECE_USD * 100) / 100;
  const threshold = Number(process.env.SPEND_ALERT_USD) || 5;
  const over = estimate > threshold;
  const line = `${dayStart.toISOString().slice(0, 10)} UTC: ${n.verdict} verdict and ${n.notes} notes generations (${n.refused} refused), about $${estimate.toFixed(2)} at $${PER_PIECE_USD} a piece, threshold $${threshold}${over ? ' , OVER' : ''}. VV_PROSE=${process.env.VV_PROSE || 'absent'}.`;
  console.log('[vv] spend check: ' + line);
  let mailed = false;
  if (over && process.env.RESEND_API_KEY && process.env.ALERT_TO) {
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'VVonderXI <hello@vvonderxi.com>', to: [process.env.ALERT_TO], subject: `VVonderXI spend over $${threshold} today (about $${estimate.toFixed(2)})`,
          text: line + '\n\nThe figure is an estimate from the generation count. The Anthropic Console has the bill. To stop prose: remove VV_PROSE from Production and redeploy; to hold one pair: node scripts/prose_hold.js <pair>.' }) });
      mailed = r.ok;
      if (!r.ok) console.error('[vv] spend check: mail failed ' + r.status);
    } catch (e) { console.error('[vv] spend check: mail threw ' + e.message); }
  }
  return res.json({ day: dayStart.toISOString().slice(0, 10), verdict: n.verdict, notes: n.notes, refused: n.refused, estimate_usd: estimate, threshold_usd: threshold, over, mailed, can_mail: !!(process.env.RESEND_API_KEY && process.env.ALERT_TO) });
};
