module.exports = async (req, res) => {
  try {
    const [magResp, plasmaResp] = await Promise.all([
      fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json'),
      fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json')
    ]);

    if (!magResp.ok || !plasmaResp.ok) {
      res.status(502).json({ error: `NOAA API error: mag=${magResp.status} plasma=${plasmaResp.status}` });
      return;
    }

    const [magData, plasmaData] = await Promise.all([magResp.json(), plasmaResp.json()]);

    // Get latest valid entries (skip header row)
    let bz = null, bt = null, speed = null, density = null, timestamp = null;

    for (let i = magData.length - 1; i >= 1; i--) {
      const row = magData[i];
      if (row[3] !== null && row[3] !== '') {
        bz = parseFloat(row[3]);
        bt = parseFloat(row[6]) || null;
        timestamp = row[0];
        break;
      }
    }

    for (let i = plasmaData.length - 1; i >= 1; i--) {
      const row = plasmaData[i];
      if (row[1] !== null && row[1] !== '' && row[2] !== null && row[2] !== '') {
        density = parseFloat(row[1]);
        speed = parseFloat(row[2]);
        if (!timestamp) timestamp = row[0];
        break;
      }
    }

    const result = { bz, bt, speed, density, timestamp };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(result);
  } catch (e) {
    console.error('solar-wind proxy error:', e);
    res.status(502).json({ error: e.message });
  }
};
