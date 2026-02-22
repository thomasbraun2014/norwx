const USER_AGENT = 'BT-Wetter/1.0 github.com/thomasbraun2014/norwx';

module.exports = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      res.status(400).json({ error: 'Missing lat/lon parameters' });
      return;
    }

    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `MET API returned ${response.status}` });
      return;
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (e) {
    console.error('weather proxy error:', e);
    res.status(502).json({ error: e.message });
  }
};
