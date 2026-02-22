const USER_AGENT = 'BT-Wetter/1.0 github.com/thomasbraun2014/norwx';

module.exports = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      res.status(400).send('Missing id parameter');
      return;
    }

    const url = `https://www.yr.no/en/content/${id}/meteogram.svg?mode=dark`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow'
    });

    if (!response.ok) {
      res.status(response.status).send(`Yr.no returned ${response.status}`);
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/svg+xml';
    const text = await response.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(text);
  } catch (e) {
    console.error('meteogram proxy error:', e);
    res.status(502).send('Meteogramm nicht verfuegbar');
  }
};
