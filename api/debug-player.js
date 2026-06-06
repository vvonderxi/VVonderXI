module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  const { id, q } = req.query;
  const headers = { 'Authorization': `Token ${process.env.BSD_API_KEY}` };
  const base = 'https://sports.bzzoiro.com/api/v2';
  try {
    if (q) {
      const r = await fetch(`${base}/players/?name=${encodeURIComponent(q)}&limit=5`, { headers });
      return res.end(JSON.stringify(await r.json(), null, 2));
    }
    if (id) {
      const careerRes = await fetch(`${base}/players/${id}/career/`, { headers });
      const career = await careerRes.json();
      const rows = career.seasons || career.results || (Array.isArray(career) ? career : []);

      const seasonDetails = {};
      const leagueDetails = {};
      for (const row of rows) {
        if (row.season_id && !seasonDetails[row.season_id]) {
          const sr = await fetch(`${base}/seasons/${row.season_id}/`, { headers });
          seasonDetails[row.season_id] = await sr.json();
        }
        if (row.league_id && !leagueDetails[row.league_id]) {
          const lr = await fetch(`${base}/leagues/${row.league_id}/`, { headers });
          leagueDetails[row.league_id] = await lr.json();
        }
      }
      return res.end(JSON.stringify({ rows, season_details: seasonDetails, league_details: leagueDetails }, null, 2));
    }
    return res.end(JSON.stringify({ error: 'Need ?id= or ?q=' }));
  } catch(e) {
    return res.end(JSON.stringify({ error: e.message }));
  }
};
