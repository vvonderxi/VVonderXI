// /api/refresh-players.js — VVonderXI BIGGER
// RETIRED. The BSD career feed was writing wrong teams, positions and ages for
// 2025/26 and overwriting the accurate API-Football cards. One table, one source
// of truth: all season data now comes solely from scripts/import/import-players.js.
// This endpoint is intentionally a no-op so the nightly cron does nothing.
// If a daily live-season updater is ever needed, rewrite it using the importer's
// season-stats logic (real team + position from the season), not the BSD feed.

module.exports = async (req, res) => {
  return res.status(200).json({ message: 'refresh paused — BSD writer retired' });
};
