const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'db.json');
    const data = fs.readFileSync(dbPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(data);
  } catch (err) {
    res.status(500).json({ error: 'Could not load database', detail: err.message });
  }
};
