module.exports = async (req, res) => {
  try {
    const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
    const response = await fetch(url);

    if (!response.ok) {
      res.status(response.status).json({ error: `NOAA API returned ${response.status}` });
      return;
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (e) {
    console.error('kp-forecast proxy error:', e);
    res.status(502).json({ error: e.message });
  }
};
