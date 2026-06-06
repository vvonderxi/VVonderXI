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
      const seasonsRes = await fetch(`${base}/seasons/?limit=50`, { headers });
      const seasons = await seasonsRes.json();
      return res.end(JSON.stringify({
        career_raw: career,
        first_row: Array.isArray(career) ? career[0] : (career.results||career.seasons||[])[0],
        row_count: Array.isArray(career) ? career.length : (career.results||career.seasons||[]).length,
        seasons_sample: Array.isArray(seasons) ? seasons.slice(0,10) : (seasons.results||seasons.seasons||[]).slice(0,10)
      }, null, 2));
    }
    return res.end(JSON.stringify({ error: 'Need ?id= or ?q=' }));
  } catch(e) {
    return res.end(JSON.stringify({ error: e.message }));
  }
};
