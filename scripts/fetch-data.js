// Fetches weather data for all locations + KP data from APIs
// Run by GitHub Actions every 15 minutes, writes to data/ directory
// These static JSON files are served same-origin on GitHub Pages (no CORS issues)

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOCATIONS = [
  { name: 'tromsoe', lat: 69.6496, lon: 18.9560 },
  { name: 'nordfjordeid', lat: 61.789, lon: 5.987 },
  { name: 'narvik', lat: 68.4385, lon: 17.4272 },
  { name: 'aalesund', lat: 62.4722, lon: 6.1495 },
  { name: 'honningsvag', lat: 70.9813, lon: 25.9706 },
  { name: 'nordkapp', lat: 71.1685, lon: 25.7838 },
  { name: 'lofoten', lat: 68.2094, lon: 14.563 },
  { name: 'bodoe', lat: 67.2804, lon: 14.4049 },
  { name: 'trondheim', lat: 63.4305, lon: 10.3951 },
  { name: 'bergen', lat: 60.3913, lon: 5.3221 },
  { name: 'stavanger', lat: 58.97, lon: 5.7331 },
  { name: 'oslo', lat: 59.9139, lon: 10.7522 }
];

const USER_AGENT = 'BT-Wetter/1.0 github.com/thomasbraun2014/norwx';
const DATA_DIR = path.join(__dirname, '..', 'data');

function httpsGet(url, userAgent) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': userAgent || USER_AGENT } };
    const req = https.get(url, options, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  // Fetch weather for each location
  for (const loc of LOCATIONS) {
    try {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${loc.lat}&lon=${loc.lon}`;
      const data = await httpsGet(url);
      const filePath = path.join(DATA_DIR, `weather-${loc.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data));
      console.log(`OK: ${loc.name} (${loc.lat}, ${loc.lon})`);
      success++;
    } catch (e) {
      console.error(`FAIL: ${loc.name} - ${e.message}`);
      failed++;
    }
    // Rate limit: MET Norway asks for max 20 req/sec, we use 600ms to be safe
    await sleep(600);
  }

  // Fetch KP index from NOAA
  try {
    const data = await httpsGet('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', 'BT-Wetter/1.0');
    fs.writeFileSync(path.join(DATA_DIR, 'kp.json'), JSON.stringify(data));
    console.log('OK: KP Index');
    success++;
  } catch (e) {
    console.error('FAIL: KP Index -', e.message);
    failed++;
  }

  // Fetch KP forecast from NOAA
  try {
    const data = await httpsGet('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', 'BT-Wetter/1.0');
    fs.writeFileSync(path.join(DATA_DIR, 'kp-forecast.json'), JSON.stringify(data));
    console.log('OK: KP Forecast');
    success++;
  } catch (e) {
    console.error('FAIL: KP Forecast -', e.message);
    failed++;
  }

  // Write update timestamp
  fs.writeFileSync(path.join(DATA_DIR, 'updated.json'), JSON.stringify({
    updated: new Date().toISOString(),
    success,
    failed
  }));

  console.log(`\nDone: ${success} OK, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
