// /api/debug-player.js — shows raw BSD API responses
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { id, q } = req.query;

  try {
    const headers = { 'Authorization': `Token ${process.env.BSD_API_KEY}` };
    const base = 'https://sports.bzzoiro.com/api/v2';

    if (q) {
      // Search by name
      const r = await fetch(`${base}/players/?name=${encodeURIComponent(q)}&limit=5`, { headers });
      const d = await r.json();
      return res.end(JSON.stringify({ search_results: d, query: q }, null, 2));
    }

    if (id) {
      // Get career for player ID
      const [career, seasons, player] = await Promise.all([
        fetch(`${base}/players/${id}/career/`, { headers }).then(r => r.json()),
        fetch(`${base}/seasons/?limit=100`, { headers }).then(r => r.json()),
        fetch(`${base}/players/${id}/`, { headers }).then(r => r.json()),
      ]);
      return res.end(JSON.stringify({
        player_detail: player,
        career_response: career,
        career_row_count: (career.results || career.seasons || career || []).length,
        first_career_row: (career.results || career.seasons || career || [])[0],
        seasons_response_sample: (seasons.results || seasons || []).slice(0, 10),
      }, null, 2));
    }

    // Default: show seasons list
    const seasons = await fetch(`${base}/seasons/?limit=100`, { headers }).then(r => r.json());
    return res.end(JSON.stringify({ seasons_sample: (seasons.results || seasons || []).slice(0, 20) }, null, 2));

  } catch (e) {
    return res.end(JSON.stringify({ error: e.message }));
  }
};
