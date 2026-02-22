// Fetch weather data via NAS proxy (for local use when api.met.no DNS fails)
const http = require('http');
const fs = require('fs');
const path = require('path');

const NAS = 'http://192.168.0.135:3001';
const DATA_DIR = path.join(__dirname, '..', 'data');

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

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const loc of LOCATIONS) {
    try {
      const url = `${NAS}/api/weather?lat=${loc.lat}&lon=${loc.lon}`;
      const data = await httpGet(url);
      fs.writeFileSync(path.join(DATA_DIR, `weather-${loc.name}.json`), JSON.stringify(data));
      console.log(`OK: ${loc.name}`);
    } catch (e) {
      console.error(`FAIL: ${loc.name} - ${e.message}`);
    }
    await sleep(500);
  }

  console.log('Done');
}

main();
