const USER_AGENT = 'BT-Wetter/1.0 github.com/thomasbraun2014/norwx';

module.exports = async (req, res) => {
  try {
    const type = req.query.type || 'reflectivity';
    const format = req.query.format || 'gif';
    const area = req.query.area || 'norway';

    const url = `https://api.met.no/weatherapi/radar/2.0/${type}.${format}?area=${area}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow'
    });

    if (!response.ok) {
      res.status(response.status).send(`Radar API returned ${response.status}`);
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (e) {
    console.error('radar proxy error:', e);
    res.status(502).send('Radar nicht verfuegbar');
  }
};
