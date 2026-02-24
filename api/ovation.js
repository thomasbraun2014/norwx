module.exports = async (req, res) => {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json');

    if (!response.ok) {
      res.status(response.status).json({ error: `NOAA OVATION API returned ${response.status}` });
      return;
    }

    const data = await response.json();

    // Optional: filter to northern hemisphere (lat >= 50) to reduce payload
    let filtered = data;
    if (data.coordinates) {
      filtered = {
        ...data,
        coordinates: data.coordinates.filter(c => c[1] >= 50)
      };
    }

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(filtered);
  } catch (e) {
    console.error('ovation proxy error:', e);
    res.status(502).json({ error: e.message });
  }
};
