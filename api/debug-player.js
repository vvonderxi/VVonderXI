// /api/debug-player.js
// Debug endpoint - shows raw BSD career data for a player ID
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id) return res.json({ error: 'Need ?id=BSD_PLAYER_ID' });
  
  try {
    const career = await fetch(
      `https://sports.bzzoiro.com/api/v2/players/${id}/career/`,
      { headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` } }
    );
    const data = await career.json();
    
    // Also get player detail
    const detail = await fetch(
      `https://sports.bzzoiro.com/api/v2/players/${id}/`,
      { headers: { 'Authorization': `Token ${process.env.BSD_API_KEY}` } }
    );
    const playerData = await detail.json();
    
    return res.json({
      player: playerData,
      career_raw: data,
      sample_row: Array.isArray(data.seasons) ? data.seasons[0] : 
                  Array.isArray(data.results) ? data.results[0] :
                  Array.isArray(data) ? data[0] : null,
      total_rows: Array.isArray(data.seasons) ? data.seasons.length :
                  Array.isArray(data.results) ? data.results.length :
                  Array.isArray(data) ? data.length : 0
    });
  } catch(e) {
    return res.json({ error: e.message });
  }
};
