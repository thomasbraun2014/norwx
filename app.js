// ===== BT-Wetter - Norwegische Wetter-PWA =====

const NAS_PROXY = 'http://192.168.0.135:3001';
const isGitHubPages = location.hostname.endsWith('.github.io');

const LOCATIONS = [
   { name: 'Nordfjordeid', lat: 61.7890, lon: 5.9870, yrId: '1-168106' },
  { name: 'Narvik', lat: 68.4385, lon: 17.4272, yrId: '1-283156' },
  { name: 'Honningsvag', lat: 70.9813, lon: 25.9706, yrId: '1-328454' },
  { name: 'Nordkapp', lat: 71.1685, lon: 25.7838, yrId: '1-328454' },
  { name: 'Tromsoe', lat: 69.6496, lon: 18.9560, yrId: '1-305409' }, 
  { name: 'Aalesund', lat: 62.4722, lon: 6.1495, yrId: '1-181828' },
  { name: 'Lofoten', lat: 68.2094, lon: 14.5630, yrId: '1-276917' },
  { name: 'Bodoe', lat: 67.2804, lon: 14.4049, yrId: '1-269359' },
  { name: 'Trondheim', lat: 63.4305, lon: 10.3951, yrId: '1-211102' },
  { name: 'Bergen', lat: 60.3913, lon: 5.3221, yrId: '1-92416' },
  { name: 'Stavanger', lat: 58.9700, lon: 5.7331, yrId: '1-15183' },
  { name: 'Oslo', lat: 59.9139, lon: 10.7522, yrId: '1-72837' }
];

// Minimum KP by latitude
function getMinKp(lat) {
  if (lat >= 70) return 1;
  if (lat >= 65) return 2;
  if (lat >= 62) return 3;
  if (lat >= 60) return 4;
  if (lat >= 57) return 5;
  return 6;
}

// Find nearest cached location (for GPS on GitHub Pages)
function findNearestLocation(lat, lon) {
  let nearest = LOCATIONS[0];
  let minDist = Infinity;
  for (const loc of LOCATIONS) {
    const dlat = loc.lat - lat;
    const dlon = (loc.lon - lon) * Math.cos(lat * Math.PI / 180);
    const dist = dlat * dlat + dlon * dlon;
    if (dist < minDist) { minDist = dist; nearest = loc; }
  }
  return nearest;
}

// Radar area mapping for preciptype (area=norway is invalid for preciptype)
function getRadarArea(lat, lon) {
  if (lat >= 70) return 'finnmark';
  if (lat >= 69) return 'troms';
  if (lat >= 65) return 'nordland';
  if (lat >= 62) return 'central_norway';
  if (lon >= 8) return 'southeastern_norway';
  return 'southwestern_norway';
}

// MET Norway symbol code to description
const SYMBOL_MAP = {
  clearsky: 'Klarer Himmel', fair: 'Heiter',
  partlycloudy: 'Teilweise bewoelkt', cloudy: 'Bewoelkt',
  lightrainshowers: 'Leichte Regenschauer', rainshowers: 'Regenschauer',
  heavyrainshowers: 'Starke Regenschauer', lightrain: 'Leichter Regen',
  rain: 'Regen', heavyrain: 'Starker Regen',
  lightrainandthunder: 'Leichter Regen & Gewitter',
  rainandthunder: 'Regen & Gewitter', heavyrainandthunder: 'Starkregen & Gewitter',
  lightsleet: 'Leichter Schneeregen', sleet: 'Schneeregen',
  heavysleet: 'Starker Schneeregen', lightsleetshowers: 'Leichte Schneeregenschauer',
  sleetshowers: 'Schneeregenschauer', heavysleetshowers: 'Starke Schneeregenschauer',
  lightsnow: 'Leichter Schnee', snow: 'Schnee', heavysnow: 'Starker Schnee',
  lightsnowshowers: 'Leichte Schneeschauer', snowshowers: 'Schneeschauer',
  heavysnowshowers: 'Starke Schneeschauer',
  lightsnowandthunder: 'Leichter Schnee & Gewitter',
  snowandthunder: 'Schnee & Gewitter', heavysnowandthunder: 'Starker Schnee & Gewitter',
  lightrainshowersandthunder: 'Leichte Regenschauer & Gewitter',
  rainshowersandthunder: 'Regenschauer & Gewitter',
  heavyrainshowersandthunder: 'Starke Regenschauer & Gewitter',
  lightsleetandthunder: 'Leichter Schneeregen & Gewitter',
  sleetandthunder: 'Schneeregen & Gewitter',
  lightssleetshowersandthunder: 'Leichte Schneeregenschauer & Gewitter',
  sleetshowersandthunder: 'Schneeregenschauer & Gewitter',
  lightsnowshowersandthunder: 'Leichte Schneeschauer & Gewitter',
  snowshowersandthunder: 'Schneeschauer & Gewitter',
  heavysnowshowersandthunder: 'Starke Schneeschauer & Gewitter',
  fog: 'Nebel'
};

function getSymbolDescription(code) {
  if (!code) return '--';
  const base = code.replace(/_day|_night|_polartwilight/g, '');
  return SYMBOL_MAP[base] || base;
}

function getWeatherIconUrl(code) {
  if (!code) return '';
  return `https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/${code}.svg`;
}

function windDirection(deg) {
  const dirs = ['N','NNO','NO','ONO','O','OSO','SO','SSO','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function windyMarkerCode(lat, lon) {
  const ar = [];
  for (let i = 98; i < 123; i++) ar.push(String.fromCharCode(i));
  for (let i = 65; i < 91; i++) ar.push(String.fromCharCode(i));
  for (let i = 0; i < 9; i++) ar.push(i);
  const la = Math.round(100 * (lat + 90));
  const lo = Math.round(100 * (lon + 180));
  return 'm:' + ar[Math.floor(la/3600)] + ar[Math.floor((la%3600)/60)] + ar[la%60] +
    'a' + ar[Math.floor(lo/3600)] + ar[Math.floor((lo%3600)/60)] + ar[lo%60];
}

// ===== Proxy Detection =====
let nasReachable = null;

async function checkNasProxy() {
  if (nasReachable !== null) return nasReachable;

  // HTTPS page cannot fetch HTTP NAS proxy (mixed content - Safari blocks this)
  if (location.protocol === 'https:') {
    nasReachable = false;
    console.log('NAS proxy skipped: HTTPS page cannot fetch HTTP');
    return false;
  }

  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(NAS_PROXY + '/api/kp-index', { signal: ctrl.signal });
    nasReachable = r.ok;
  } catch {
    nasReachable = false;
  }
  console.log('NAS proxy reachable:', nasReachable);
  return nasReachable;
}

// ===== Fetch Helpers =====

// Try multiple URLs in order, return first successful JSON response
async function tryFetch(urls, timeoutMs) {
  let lastError;
  for (const url of urls) {
    try {
      const data = await fetchJson(url, timeoutMs || 10000);
      return data;
    } catch (e) {
      lastError = e;
      console.warn('tryFetch failed for', url, e.message);
    }
  }
  throw lastError;
}

// Build ordered URL list: NAS first when reachable, same-origin /api/ as middle layer, direct as fallback
function buildUrlList(nasUrl, proxyUrl, directUrl) {
  if (nasReachable) {
    return [nasUrl, proxyUrl, directUrl];
  }
  // On HTTPS: never include HTTP NAS URL (mixed content blocked by Safari)
  if (location.protocol === 'https:') {
    return [proxyUrl, directUrl];
  }
  return [proxyUrl, directUrl, nasUrl];
}

// ===== Weather Map URLs =====

// Build image URL list with same-origin proxy as preferred, fallbacks included
function radarUrls(type, format, area) {
  const directUrl = `https://api.met.no/weatherapi/radar/2.0/${type}.${format}?area=${area}`;
  // GitHub Pages: use direct URL only (<img> tags don't need CORS)
  if (isGitHubPages) return [directUrl];
  const proxyUrl = `/api/radar?type=${type}&format=${format}&area=${area}&t=${Date.now()}`;
  const nasUrl = `${NAS_PROXY}/api/radar?type=${type}&format=${format}&area=${area}&t=${Date.now()}`;
  if (nasReachable) return [nasUrl, proxyUrl, directUrl];
  return [proxyUrl, directUrl, nasUrl];
}

function meteogramUrls(yrId) {
  if (!yrId) return [];
  const directUrl = `https://www.yr.no/en/content/${yrId}/meteogram.svg?mode=dark`;
  // GitHub Pages: use direct URL only (<img> tags don't need CORS)
  if (isGitHubPages) return [directUrl];
  const proxyUrl = `/api/meteogram?id=${yrId}&t=${Date.now()}`;
  const nasUrl = `${NAS_PROXY}/api/meteogram?id=${yrId}&t=${Date.now()}`;
  if (nasReachable) return [nasUrl, proxyUrl, directUrl];
  return [proxyUrl, directUrl, nasUrl];
}

// Primary URL for map display (first in the list)
function radarUrl(type, format, area) {
  return radarUrls(type, format, area)[0];
}

function meteogramUrl(yrId) {
  const urls = meteogramUrls(yrId);
  return urls.length > 0 ? urls[0] : '';
}

const WEATHER_MAPS = isGitHubPages ? {
  // GitHub Pages: Meteogram from yr.no + Windy embeds for interactive maps
  meteogram: {
    label: 'Meteogramm',
    getUrls: () => meteogramUrls(getActiveLocation().yrId),
    info: 'Yr.no 3-Tage Meteogramm'
  },
  radar: {
    label: 'Radar',
    windy: { overlay: 'radar', product: 'radar', zoom: 5 },
    info: 'Niederschlagsradar'
  },
  wind: {
    label: 'Wind',
    windy: { overlay: 'wind', product: 'ecmwf', zoom: 5 },
    info: 'Windkarte'
  },
  rain: {
    label: 'Regen',
    windy: { overlay: 'rain', product: 'ecmwf', zoom: 5 },
    info: 'Regenvorhersage'
  },
  temp: {
    label: 'Temperatur',
    windy: { overlay: 'temp', product: 'ecmwf', zoom: 5 },
    info: 'Temperaturkarte'
  },
  clouds: {
    label: 'Wolken',
    windy: { overlay: 'clouds', product: 'ecmwf', zoom: 5 },
    info: 'Wolkenabdeckung & Animation'
  }
} : {
  // NAS/WLAN: MET Norway radar images via proxy
  meteogram: {
    label: 'Meteogramm',
    getUrls: () => meteogramUrls(getActiveLocation().yrId),
    info: 'Yr.no 3-Tage Meteogramm fuer den aktuellen Ort'
  },
  radar: {
    label: 'Radar',
    getUrls: () => radarUrls('reflectivity', 'gif', 'norway'),
    info: 'Niederschlagsradar Norwegen (letzte 3h Animation)'
  },
  radar5: {
    label: 'Radar 5-Stufen',
    getUrls: () => radarUrls('5level_reflectivity', 'gif', 'norway'),
    info: 'Niederschlag in 5 Intensitaetsstufen (Animation)'
  },
  regional: {
    label: 'Regional',
    getUrls: () => {
      const loc = getActiveLocation();
      return radarUrls('reflectivity', 'gif', getRadarArea(loc.lat, loc.lon));
    },
    info: 'Regionaler Radar fuer den aktuellen Ort'
  },
  preciptype: {
    label: 'Niederschlagsart',
    getUrls: () => {
      const loc = getActiveLocation();
      return radarUrls('preciptype', 'gif', getRadarArea(loc.lat, loc.lon));
    },
    info: 'Regen/Schnee/Schneeregen Unterscheidung (Animation)'
  },
  clouds: {
    label: 'Wolken',
    windy: { overlay: 'clouds', product: 'ecmwf', zoom: 5 },
    info: 'Wolkenabdeckung & Animation'
  }
};

const YR_MAP_LINKS = [
  { label: 'Niederschlag', url: 'https://www.yr.no/en/map/radar' },
  { label: 'Wetter', url: 'https://www.yr.no/en/map/weather' },
  { label: 'Wind', url: 'https://www.yr.no/en/map/wind' },
  { label: 'Temperatur', url: 'https://www.yr.no/en/map/temperature' }
];

// ===== State =====
let currentLocationIdx = 0;
let weatherCache = {};
let kpData = null;
let kpForecastCache = null;
let solarWindCache = null;
let ovationCache = null;
let auroraInterval = 1;
let gpsLocation = null;
let isGpsActive = false;
let lastHourlyAuroraData = null;
let forecastTimeseries = null;
let forecastDaily16 = null;
let activeForecastTab = '3d';

function getActiveLocation() {
  if (isGpsActive && gpsLocation) return gpsLocation;
  return LOCATIONS[currentLocationIdx];
}

// ===== Open-Meteo (CORS-friendly, for GPS on GitHub Pages) =====
function wmoToSymbol(code, hour) {
  const sfx = (hour >= 6 && hour < 21) ? '_day' : '_night';
  const map = {
    0: 'clearsky' + sfx, 1: 'fair' + sfx, 2: 'partlycloudy' + sfx, 3: 'cloudy',
    45: 'fog', 48: 'fog',
    51: 'lightrain', 53: 'rain', 55: 'heavyrain',
    56: 'lightsleet', 57: 'sleet',
    61: 'lightrain', 63: 'rain', 65: 'heavyrain',
    66: 'lightsleet', 67: 'sleet',
    71: 'lightsnow', 73: 'snow', 75: 'heavysnow', 77: 'lightsnow',
    80: 'lightrainshowers' + sfx, 81: 'rainshowers' + sfx, 82: 'heavyrainshowers' + sfx,
    85: 'lightsnowshowers' + sfx, 86: 'snowshowers' + sfx,
    95: 'rainandthunder', 96: 'rainandthunder', 99: 'rainandthunder'
  };
  return map[code] || 'cloudy';
}

function convertOpenMeteoToMetNo(om) {
  const h = om.hourly;
  const timeseries = [];
  for (let i = 0; i < h.time.length; i++) {
    const t = h.time[i];
    const hour = new Date(t).getUTCHours();
    // Sum next 6 hours precipitation
    let precip6 = 0;
    for (let j = i; j < Math.min(i + 6, h.time.length); j++) {
      precip6 += (h.precipitation[j] || 0);
    }
    timeseries.push({
      time: t.endsWith('Z') ? t : t + ':00Z',
      data: {
        instant: {
          details: {
            air_temperature: h.temperature_2m[i],
            wind_speed: h.wind_speed_10m[i],
            wind_from_direction: h.wind_direction_10m ? h.wind_direction_10m[i] : 0,
            relative_humidity: h.relative_humidity_2m ? h.relative_humidity_2m[i] : 50,
            air_pressure_at_sea_level: h.surface_pressure ? h.surface_pressure[i] : 1013,
            cloud_area_fraction: h.cloud_cover[i],
            ultraviolet_index_clear_sky: h.uv_index ? h.uv_index[i] : 0
          }
        },
        next_1_hours: {
          summary: { symbol_code: wmoToSymbol(h.weather_code[i], hour) },
          details: { precipitation_amount: h.precipitation[i] || 0 }
        },
        next_6_hours: {
          summary: { symbol_code: wmoToSymbol(h.weather_code[i], hour) },
          details: { precipitation_amount: Math.round(precip6 * 10) / 10 }
        }
      }
    });
  }
  return { properties: { timeseries } };
}

async function fetchWeatherOpenMeteo(lat, lon) {
  const params = 'current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,surface_pressure' +
    '&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,surface_pressure' +
    '&timezone=UTC&forecast_days=7';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${params}`;
  const data = await fetchJson(url, 12000);
  return convertOpenMeteoToMetNo(data);
}

// ===== API Functions =====
async function fetchJson(url, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchWeather(lat, lon) {
  const key = `${lat},${lon}`;
  const cached = weatherCache[key];
  if (cached && Date.now() - cached.time < 600000) return cached.data;

  let urls;
  if (isGitHubPages) {
    // GitHub Pages: api.met.no has no CORS support
    const loc = LOCATIONS.find(l => l.lat === lat && l.lon === lon);
    if (loc) {
      // Fixed location: use pre-cached static data
      const slug = loc.name.toLowerCase();
      urls = [`./data/weather-${slug}.json`];
    } else {
      // GPS: use Open-Meteo API (has CORS, works directly from browser)
      const data = await fetchWeatherOpenMeteo(lat, lon);
      weatherCache[key] = { data, time: Date.now() };
      return data;
    }
  } else {
    const directUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    const proxyUrl = `/api/weather?lat=${lat}&lon=${lon}`;
    const nasUrl = `${NAS_PROXY}/api/weather?lat=${lat}&lon=${lon}`;
    urls = buildUrlList(nasUrl, proxyUrl, directUrl);
  }

  const data = await tryFetch(urls, 12000);
  weatherCache[key] = { data, time: Date.now() };
  return data;
}

async function fetchKpIndex() {
  if (kpData && Date.now() - kpData.time < 300000) return kpData.data;

  const directUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

  let urls;
  if (isGitHubPages) {
    // NOAA has CORS - fetch directly, static cache as fallback
    urls = [directUrl, './data/kp.json'];
  } else {
    const proxyUrl = '/api/kp-index';
    const nasUrl = `${NAS_PROXY}/api/kp-index`;
    urls = buildUrlList(nasUrl, proxyUrl, directUrl);
  }

  const data = await tryFetch(urls, 10000);
  kpData = { data, time: Date.now() };
  return data;
}

async function fetchKpForecast() {
  if (kpForecastCache && Date.now() - kpForecastCache.time < 300000) return kpForecastCache.data;

  const directUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

  let urls;
  if (isGitHubPages) {
    urls = [directUrl, './data/kp-forecast.json'];
  } else {
    const proxyUrl = '/api/kp-forecast';
    const nasUrl = `${NAS_PROXY}/api/kp-forecast`;
    urls = buildUrlList(nasUrl, proxyUrl, directUrl);
  }

  const data = await tryFetch(urls, 10000);
  kpForecastCache = { data, time: Date.now() };
  return data;
}

// ===== Solar Wind (Bz + Speed + Density) =====
async function fetchSolarWind() {
  if (solarWindCache && Date.now() - solarWindCache.time < 300000) return solarWindCache.data;

  const directMag = 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json';
  const directPlasma = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json';

  let result;
  if (isGitHubPages) {
    // NOAA has CORS - try direct fetch, static as fallback
    try {
      const [magData, plasmaData] = await Promise.all([
        fetchJson(directMag, 10000),
        fetchJson(directPlasma, 10000)
      ]);
      result = parseSolarWindData(magData, plasmaData);
    } catch {
      result = await fetchJson('./data/solar-wind.json', 5000);
    }
  } else {
    // NAS/Proxy: try combined endpoint first
    const proxyUrl = '/api/solar-wind';
    const nasUrl = `${NAS_PROXY}/api/solar-wind`;
    try {
      const urls = buildUrlList(nasUrl, proxyUrl, null);
      result = await tryFetch(urls.filter(Boolean), 10000);
    } catch {
      // Fallback: direct NOAA fetch
      try {
        const [magData, plasmaData] = await Promise.all([
          fetchJson(directMag, 10000),
          fetchJson(directPlasma, 10000)
        ]);
        result = parseSolarWindData(magData, plasmaData);
      } catch {
        result = { bz: null, bt: null, speed: null, density: null, timestamp: null };
      }
    }
  }

  solarWindCache = { data: result, time: Date.now() };
  return result;
}

function parseSolarWindData(magData, plasmaData) {
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
  return { bz, bt, speed, density, timestamp };
}

// ===== OVATION Aurora Model =====
async function fetchOvation(lat, lon) {
  if (ovationCache && Date.now() - ovationCache.time < 900000) {
    return getOvationForLocation(ovationCache.data, lat, lon);
  }

  const directUrl = 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';

  let data;
  if (isGitHubPages) {
    try {
      data = await fetchJson(directUrl, 15000);
    } catch {
      try {
        data = await fetchJson('./data/ovation.json', 5000);
      } catch {
        return 0;
      }
    }
  } else {
    const proxyUrl = '/api/ovation';
    const nasUrl = `${NAS_PROXY}/api/ovation`;
    try {
      const urls = buildUrlList(nasUrl, proxyUrl, directUrl);
      data = await tryFetch(urls, 15000);
    } catch {
      return 0;
    }
  }

  ovationCache = { data, time: Date.now() };
  return getOvationForLocation(data, lat, lon);
}

function getOvationForLocation(ovationData, lat, lon) {
  if (!ovationData || !ovationData.coordinates) return 0;
  const coords = ovationData.coordinates;
  let nearest = 0;
  let minDist = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    const cLon = c[0] > 180 ? c[0] - 360 : c[0];
    const cLat = c[1];
    const dlat = cLat - lat;
    const dlon = (cLon - lon) * Math.cos(lat * Math.PI / 180);
    const dist = dlat * dlat + dlon * dlon;
    if (dist < minDist) {
      minDist = dist;
      nearest = c[2] || 0;
    }
  }
  return nearest;
}

// ===== 16-Tage Vorhersage (Open-Meteo Daily API) =====
async function fetchDailyForecast16(lat, lon) {
  const key = `daily16_${lat},${lon}`;
  const cached = weatherCache[key];
  if (cached && Date.now() - cached.time < 600000) return cached.data;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
    `&timezone=auto&forecast_days=16`;
  const data = await fetchJson(url, 12000);
  weatherCache[key] = { data, time: Date.now() };
  return data;
}

function getKpForTime(kpForecast, targetTime) {
  if (!kpForecast || kpForecast.length < 2) return null;
  const target = targetTime.getTime();
  let closest = null;
  let closestDiff = Infinity;
  for (let i = 1; i < kpForecast.length; i++) {
    const t = new Date(kpForecast[i][0]).getTime();
    const diff = Math.abs(t - target);
    if (diff < closestDiff) { closestDiff = diff; closest = kpForecast[i]; }
  }
  return closest ? parseFloat(closest[1]) || 0 : null;
}

function getSunData(lat, lon) {
  const now = new Date();
  const times = SunCalc.getTimes(now, lat, lon);
  const sunPos = SunCalc.getPosition(now, lat, lon);
  const moonIllum = SunCalc.getMoonIllumination(now);
  return { times, sunPos, moonIllum, now };
}

// ===== GPS Location =====
async function requestGpsLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS nicht verfuegbar'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        const nearest = findNearestLocation(lat, lon);
        gpsLocation = {
          name: 'Standort',
          lat,
          lon,
          yrId: nearest.yrId,
          nearestName: nearest.name
        };
        resolve(gpsLocation);
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ===== Render Functions =====
function renderLocationTabs() {
  const tabs = document.getElementById('locationTabs');
  let gpsLabel = '\uD83D\uDCCD Standort';
  if (isGpsActive && gpsLocation) {
    gpsLabel = `\uD83D\uDCCD ${gpsLocation.lat.toFixed(2)}, ${gpsLocation.lon.toFixed(2)}`;
  }
  const gpsTab = `<button class="loc-tab gps-tab${isGpsActive ? ' active' : ''}" data-gps="1">${gpsLabel}</button>`;
  const locTabs = LOCATIONS.map((loc, i) =>
    `<button class="loc-tab${!isGpsActive && i === currentLocationIdx ? ' active' : ''}" data-idx="${i}">${loc.name}</button>`
  ).join('');
  tabs.innerHTML = gpsTab + locTabs;

  tabs.querySelector('.gps-tab').addEventListener('click', async () => {
    try {
      if (!gpsLocation) await requestGpsLocation();
      isGpsActive = true;
      renderLocationTabs();
      loadData();
    } catch (e) {
      alert('GPS Fehler: ' + e.message);
    }
  });

  tabs.querySelectorAll('.loc-tab:not(.gps-tab)').forEach(btn => {
    btn.addEventListener('click', () => {
      isGpsActive = false;
      currentLocationIdx = parseInt(btn.dataset.idx);
      renderLocationTabs();
      loadData();
    });
  });
}

function renderCurrentWeather(ts) {
  const d = ts.data.instant.details;
  const sym = ts.data.next_1_hours?.summary?.symbol_code ||
              ts.data.next_6_hours?.summary?.symbol_code || '';

  document.getElementById('currentTemp').textContent = `${Math.round(d.air_temperature)}\u00B0`;
  document.getElementById('currentDesc').textContent = getSymbolDescription(sym);
  document.getElementById('currentFeelsLike').textContent =
    `Fuehlt sich an: ${Math.round(d.air_temperature - (d.wind_speed * 0.7))}\u00B0`;
  document.getElementById('currentWind').textContent = `Wind: ${d.wind_speed} m/s`;

  const iconEl = document.getElementById('currentIcon');
  const iconUrl = getWeatherIconUrl(sym);
  if (iconUrl) {
    iconEl.innerHTML = `<img src="${iconUrl}" alt="${sym}" onerror="this.style.display='none'">`;
  }

  document.getElementById('detailWind').textContent = `${d.wind_speed} m/s`;
  document.getElementById('detailWindDir').textContent = windDirection(d.wind_from_direction);
  document.getElementById('detailHumidity').textContent = `${Math.round(d.relative_humidity)}%`;
  document.getElementById('detailPressure').textContent = `${Math.round(d.air_pressure_at_sea_level)} hPa`;

  const uv = d.ultraviolet_index_clear_sky;
  document.getElementById('detailUV').textContent = uv !== undefined ? Math.round(uv) : '--';
}

function renderHourly(timeseries) {
  const container = document.getElementById('hourlyScroll');
  const now = new Date();
  const next24 = timeseries.filter(ts => {
    const t = new Date(ts.time);
    return t >= now && t <= new Date(now.getTime() + 86400000);
  }).slice(0, 24);

  container.innerHTML = next24.map((ts, i) => {
    const t = new Date(ts.time);
    const d = ts.data.instant.details;
    const sym = ts.data.next_1_hours?.summary?.symbol_code || '';
    const precip = ts.data.next_1_hours?.details?.precipitation_amount || 0;
    const isNow = i === 0;

    return `<div class="hourly-item${isNow ? ' now' : ''}">
      <span class="hourly-time">${isNow ? 'Jetzt' : t.getHours().toString().padStart(2, '0')}</span>
      <span class="hourly-icon"><img src="${getWeatherIconUrl(sym)}" alt="" onerror="this.style.display='none'"></span>
      <span class="hourly-temp">${Math.round(d.air_temperature)}\u00B0</span>
      ${precip > 0 ? `<span class="hourly-precip">${precip}mm</span>` : ''}
    </div>`;
  }).join('');
}

function renderDaily(timeseries) {
  const container = document.getElementById('dailyList');
  const days = {};
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  timeseries.forEach(ts => {
    const t = new Date(ts.time);
    const key = t.toISOString().slice(0, 10);
    if (!days[key]) days[key] = { temps: [], syms: [], precip: 0, date: t };
    days[key].temps.push(ts.data.instant.details.air_temperature);
    const sym = ts.data.next_6_hours?.summary?.symbol_code || ts.data.next_1_hours?.summary?.symbol_code;
    if (sym) days[key].syms.push(sym);
    const p = ts.data.next_6_hours?.details?.precipitation_amount || 0;
    days[key].precip += p;
  });

  const dayEntries = Object.values(days).slice(0, 7);
  const allTemps = dayEntries.flatMap(d => d.temps);
  const globalMin = Math.min(...allTemps);
  const globalMax = Math.max(...allTemps);
  const range = globalMax - globalMin || 1;

  container.innerHTML = dayEntries.map((day, i) => {
    const min = Math.round(Math.min(...day.temps));
    const max = Math.round(Math.max(...day.temps));
    const sym = day.syms[Math.floor(day.syms.length / 3)] || day.syms[0] || '';
    const dayName = i === 0 ? 'Heute' : dayNames[day.date.getDay()];
    const left = ((Math.min(...day.temps) - globalMin) / range * 100);
    const width = ((Math.max(...day.temps) - Math.min(...day.temps)) / range * 100);
    const precip = day.precip > 0 ? `${Math.round(day.precip * 10) / 10}mm` : '';

    return `<div class="daily-item">
      <span class="daily-day">${dayName}</span>
      <span class="daily-icon"><img src="${getWeatherIconUrl(sym)}" alt="" onerror="this.style.display='none'"></span>
      <span class="daily-precip">${precip}</span>
      <div class="daily-temps">
        <span class="daily-min">${min}\u00B0</span>
        <div class="daily-temp-bar">
          <div class="daily-temp-fill" style="left:${left}%;width:${Math.max(width, 5)}%"></div>
        </div>
        <span class="daily-max">${max}\u00B0</span>
      </div>
    </div>`;
  }).join('');
}

function renderDaily16(omData) {
  const container = document.getElementById('dailyList');
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const d = omData.daily;

  const allMin = Math.min(...d.temperature_2m_min);
  const allMax = Math.max(...d.temperature_2m_max);
  const range = allMax - allMin || 1;

  container.innerHTML = d.time.map((t, i) => {
    const date = new Date(t + 'T12:00:00');
    const min = Math.round(d.temperature_2m_min[i]);
    const max = Math.round(d.temperature_2m_max[i]);
    const sym = wmoToSymbol(d.weather_code[i], 12);
    const dayName = i === 0 ? 'Heute' : dayNames[date.getDay()];
    const dateStr = `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const left = ((d.temperature_2m_min[i] - allMin) / range * 100);
    const width = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / range * 100);
    const precip = (d.precipitation_sum[i] || 0) > 0 ? `${Math.round(d.precipitation_sum[i] * 10) / 10}mm` : '';

    return `<div class="daily-item">
      <div class="daily-day-col">
        <span class="daily-day">${dayName}</span>
        <span class="daily-date">${dateStr}</span>
      </div>
      <span class="daily-icon"><img src="${getWeatherIconUrl(sym)}" alt="" onerror="this.style.display='none'"></span>
      <span class="daily-precip">${precip}</span>
      <div class="daily-temps">
        <span class="daily-min">${min}\u00B0</span>
        <div class="daily-temp-bar">
          <div class="daily-temp-fill" style="left:${left}%;width:${Math.max(width, 5)}%"></div>
        </div>
        <span class="daily-max">${max}\u00B0</span>
      </div>
    </div>`;
  }).join('');
}

// ===== Forecast Tabs =====
function render3DayForecast(timeseries) {
  const container = document.getElementById('forecastContent');
  if (!container) return;
  const now = new Date();
  const end = new Date(now.getTime() + 72 * 3600000);
  const hours = timeseries.filter(ts => {
    const t = new Date(ts.time);
    return t >= now && t <= end;
  });

  const dayGroups = {};
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  hours.forEach(ts => {
    const t = new Date(ts.time);
    const key = t.toISOString().slice(0, 10);
    if (!dayGroups[key]) dayGroups[key] = { date: t, items: [] };
    dayGroups[key].items.push(ts);
  });

  let html = '';
  Object.values(dayGroups).forEach((group, gi) => {
    const d = group.date;
    const label = gi === 0 ? 'Heute' : dayNames[d.getDay()];
    const dateStr = `${d.getDate()}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
    html += `<div class="forecast-day-block">
      <div class="forecast-day-header">${label} ${dateStr}</div>
      <div class="forecast-3d-scroll">`;
    group.items.forEach((ts, i) => {
      const t = new Date(ts.time);
      const det = ts.data.instant.details;
      const sym = ts.data.next_1_hours?.summary?.symbol_code || '';
      const precip = ts.data.next_1_hours?.details?.precipitation_amount || 0;
      const isNow = gi === 0 && i === 0;
      html += `<div class="hourly-item${isNow ? ' now' : ''}">
        <span class="hourly-time">${isNow ? 'Jetzt' : t.getHours().toString().padStart(2,'0')}</span>
        <span class="hourly-icon"><img src="${getWeatherIconUrl(sym)}" alt="" onerror="this.style.display='none'"></span>
        <span class="hourly-temp">${Math.round(det.air_temperature)}\u00B0</span>
        ${precip > 0 ? `<span class="hourly-precip">${precip}mm</span>` : ''}
        <span class="hourly-wind">${Math.round(det.wind_speed)}m/s</span>
      </div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

function render7DayForecast(timeseries) {
  const container = document.getElementById('forecastContent');
  if (!container) return;
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const slotHours = [6, 12, 18, 0];
  const slotLabels = ['Morgen', 'Mittag', 'Abend', 'Nacht'];

  // Group timeseries by date
  const byDate = {};
  timeseries.forEach(ts => {
    const t = new Date(ts.time);
    const key = t.toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = {};
    byDate[key][t.getUTCHours()] = ts;
  });

  const dates = Object.keys(byDate).sort().slice(0, 7);
  let html = `<div class="forecast-7d-table">
    <div class="forecast-7d-header">
      <span class="forecast-7d-day-label"></span>
      ${slotLabels.map(l => `<span class="forecast-7d-slot-label">${l}</span>`).join('')}
    </div>`;

  dates.forEach((dateKey, i) => {
    const d = new Date(dateKey + 'T12:00:00');
    const label = i === 0 ? 'Heute' : dayNames[d.getDay()];
    const dateStr = `${d.getDate()}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
    html += `<div class="forecast-7d-row">
      <div class="forecast-7d-day-col">
        <span class="forecast-7d-day">${label}</span>
        <span class="forecast-7d-date">${dateStr}</span>
      </div>`;

    slotHours.forEach(h => {
      const ts = byDate[dateKey][h];
      if (ts) {
        const det = ts.data.instant.details;
        const sym = ts.data.next_1_hours?.summary?.symbol_code || ts.data.next_6_hours?.summary?.symbol_code || '';
        html += `<div class="forecast-7d-slot">
          <img src="${getWeatherIconUrl(sym)}" alt="" class="forecast-7d-icon" onerror="this.style.display='none'">
          <span class="forecast-7d-temp">${Math.round(det.air_temperature)}\u00B0</span>
        </div>`;
      } else {
        html += `<div class="forecast-7d-slot"><span class="forecast-7d-temp">--</span></div>`;
      }
    });

    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderForecastTab(tab) {
  activeForecastTab = tab;
  document.querySelectorAll('.forecast-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  if (tab === '3d' && forecastTimeseries) {
    render3DayForecast(forecastTimeseries);
  } else if (tab === '7d' && forecastTimeseries) {
    render7DayForecast(forecastTimeseries);
  } else if (tab === '16d' && forecastDaily16) {
    const container = document.getElementById('forecastContent');
    if (container) {
      container.innerHTML = '<div class="daily-list" id="dailyList16"></div>';
      renderDaily16Into(forecastDaily16, 'dailyList16');
    }
  }
}

function renderDaily16Into(omData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const d = omData.daily;
  const allMin = Math.min(...d.temperature_2m_min);
  const allMax = Math.max(...d.temperature_2m_max);
  const range = allMax - allMin || 1;

  container.innerHTML = d.time.map((t, i) => {
    const date = new Date(t + 'T12:00:00');
    const min = Math.round(d.temperature_2m_min[i]);
    const max = Math.round(d.temperature_2m_max[i]);
    const sym = wmoToSymbol(d.weather_code[i], 12);
    const dayName = i === 0 ? 'Heute' : dayNames[date.getDay()];
    const dateStr = `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const left = ((d.temperature_2m_min[i] - allMin) / range * 100);
    const width = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / range * 100);
    const precip = (d.precipitation_sum[i] || 0) > 0 ? `${Math.round(d.precipitation_sum[i] * 10) / 10}mm` : '';

    return `<div class="daily-item">
      <div class="daily-day-col">
        <span class="daily-day">${dayName}</span>
        <span class="daily-date">${dateStr}</span>
      </div>
      <span class="daily-icon"><img src="${getWeatherIconUrl(sym)}" alt="" onerror="this.style.display='none'"></span>
      <span class="daily-precip">${precip}</span>
      <div class="daily-temps">
        <span class="daily-min">${min}\u00B0</span>
        <div class="daily-temp-bar">
          <div class="daily-temp-fill" style="left:${left}%;width:${Math.max(width, 5)}%"></div>
        </div>
        <span class="daily-max">${max}\u00B0</span>
      </div>
    </div>`;
  }).join('');
}

function initForecastTabs() {
  const tabsEl = document.getElementById('forecastTabs');
  if (!tabsEl) return;
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.forecast-tab');
    if (!btn) return;
    renderForecastTab(btn.dataset.tab);
  });
}

// ===== Aurora Rating Algorithm (Extended 7-Factor) =====
function computeSpaceWeatherScore(kp, bz, speed, density, ovationProb, lat) {
  const minKp = getMinKp(lat);
  let score = 0;

  // KP contribution (0-3.5)
  const kpExcess = kp - minKp;
  if (kpExcess >= 2) score += 3.5;
  else if (kpExcess >= 1) score += 2.5;
  else if (kpExcess >= 0) score += 1.5;
  else if (kpExcess >= -1) score += 0.5;

  // Bz contribution (0-3) - negative = good
  if (bz !== null) {
    if (bz <= -10) score += 3;
    else if (bz <= -5) score += 2;
    else if (bz <= -2) score += 1;
    else if (bz <= 0) score += 0.3;
  }

  // Solar wind coupling (0-2)
  if (bz !== null && speed !== null) {
    const couplingFactor = speed * Math.max(0, -bz) / 1000;
    if (couplingFactor > 5) score += 2;
    else if (couplingFactor > 2) score += 1.5;
    else if (couplingFactor > 1) score += 1;
    else if (couplingFactor > 0.3) score += 0.5;
  }

  // OVATION bonus (0-1.5)
  if (ovationProb > 30) score += 1.5;
  else if (ovationProb > 15) score += 1;
  else if (ovationProb > 5) score += 0.5;

  return Math.min(10, score);
}

function computeVisibilityScore(sunAlt, cloudFrac, moonFrac) {
  let score = 0;

  // Darkness (0-3)
  if (sunAlt < -18) score += 3;
  else if (sunAlt < -12) score += 2;
  else if (sunAlt < -6) score += 1;

  // Clouds (0-1.5)
  if (cloudFrac < 20) score += 1.5;
  else if (cloudFrac < 40) score += 1;
  else if (cloudFrac < 60) score += 0.5;

  // Moon (0-0.5) - only relevant when dark
  if (sunAlt < -6) {
    if (moonFrac < 0.3) score += 0.5;
    else if (moonFrac < 0.6) score += 0.25;
  }

  return score;
}

function computeAuroraRating(kp, cloudFrac, sunAltDeg, lat, bz, speed, density, ovationProb, moonFrac) {
  if (sunAltDeg >= -6) return 0; // Daylight = 0 stars

  // If no extended data, fall back to simple algorithm
  if ((bz === null || bz === undefined) && (ovationProb === undefined || ovationProb === 0)) {
    const minKp = getMinKp(lat);
    let rating = 0;
    if (kp >= minKp) rating += 2;
    else if (kp >= minKp - 1) rating += 1;
    if (sunAltDeg < -18) rating += 2;
    else if (sunAltDeg < -12) rating += 1.5;
    else if (sunAltDeg < -6) rating += 0.5;
    if (cloudFrac < 25) rating += 1;
    else if (cloudFrac < 50) rating += 0.5;
    return Math.min(5, Math.round(rating));
  }

  const space = computeSpaceWeatherScore(kp, bz, speed, density, ovationProb || 0, lat);
  const vis = computeVisibilityScore(sunAltDeg, cloudFrac, moonFrac || 0);

  // Weighted combination: Space (60%) + Visibility (40%)
  const combined = (space / 10) * 3 + (vis / 5) * 2;
  return Math.min(5, Math.round(combined));
}

function renderAurora(weather, kpArr, sunData, solarWind, ovationProb) {
  const loc = getActiveLocation();
  const minKp = getMinKp(loc.lat);

  let kpVal = 0;
  if (kpArr && kpArr.length > 1) {
    const last = kpArr[kpArr.length - 1];
    kpVal = parseFloat(last[1]) || 0;
  }

  const cloudFrac = weather.data.instant.details.cloud_area_fraction || 0;
  const sunAlt = sunData.sunPos.altitude * (180 / Math.PI);
  let darknessLevel, darknessText, darknessEmoji;
  if (sunAlt < -18) {
    darknessLevel = 'night'; darknessText = 'Nacht'; darknessEmoji = '\uD83C\uDF11';
  } else if (sunAlt < -12) {
    darknessLevel = 'nautical'; darknessText = 'Nautische Daemmerung'; darknessEmoji = '\uD83C\uDF12';
  } else if (sunAlt < -6) {
    darknessLevel = 'civil'; darknessText = 'Buergerliche Daemmerung'; darknessEmoji = '\uD83C\uDF13';
  } else {
    darknessLevel = 'day'; darknessText = 'Tageslicht'; darknessEmoji = '\u2600\uFE0F';
  }

  const moonPhase = sunData.moonIllum.fraction;
  const moonEmoji = moonPhase < 0.1 ? '\uD83C\uDF11' : moonPhase < 0.4 ? '\uD83C\uDF12' :
                    moonPhase < 0.6 ? '\uD83C\uDF13' : moonPhase < 0.9 ? '\uD83C\uDF14' : '\uD83C\uDF15';

  const fmt = d => {
    if (!d || isNaN(d.getTime())) return '--:--';
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  // Extended data
  const bz = solarWind ? solarWind.bz : null;
  const speed = solarWind ? solarWind.speed : null;
  const density = solarWind ? solarWind.density : null;
  const ovProb = ovationProb || 0;

  const rating = computeAuroraRating(kpVal, cloudFrac, sunAlt, loc.lat, bz, speed, density, ovProb, moonPhase);

  const ratingLabels = [
    'Keine Chance', 'Sehr unwahrscheinlich', 'Unwahrscheinlich',
    'Moeglich', 'Gute Chancen', 'Ausgezeichnet'
  ];
  const ratingColors = ['#666', '#ff1744', '#ff9100', '#ffea00', '#00e676', '#00e5ff'];

  // Build detailed summary
  let summary = [];
  if (darknessLevel === 'day') {
    summary.push('Es ist zu hell fuer Nordlichter');
  } else {
    if (kpVal >= minKp) summary.push(`KP ${kpVal} reicht fuer ${loc.name}`);
    else summary.push(`KP ${kpVal} ist zu niedrig (min. KP ${minKp})`);

    if (bz !== null) {
      if (bz <= -10) summary.push('Bz stark suedwaerts - sehr gut!');
      else if (bz <= -5) summary.push('Bz suedwaerts - guenstig');
      else if (bz <= 0) summary.push('Bz leicht suedwaerts');
      else summary.push('Bz nordwaerts - ungeunstig');
    }

    if (speed !== null) {
      if (speed > 600) summary.push('sehr hoher Sonnenwind');
      else if (speed > 500) summary.push('erhoehter Sonnenwind');
    }

    if (ovProb > 15) summary.push(`OVATION: ${Math.round(ovProb)}% Wahrscheinlichkeit`);

    if (cloudFrac > 60) summary.push('zu viele Wolken');
    else if (cloudFrac < 25) summary.push('klarer Himmel');
    if (moonPhase > 0.7) summary.push('heller Mond');
  }

  document.getElementById('auroraStars').innerHTML =
    Array.from({length: 5}, (_, i) =>
      `<span style="color:${i < rating ? ratingColors[rating] : '#333'}">${i < rating ? '\u2605' : '\u2606'}</span>`
    ).join('');

  document.getElementById('auroraLabel').textContent = ratingLabels[rating];
  document.getElementById('auroraLabel').style.color = ratingColors[rating];
  document.getElementById('auroraSummary').textContent = summary.join(' \u2022 ');

  // KP Panel
  document.getElementById('kpValue').textContent = kpVal.toFixed(1);
  document.getElementById('kpValue').style.color = kpVal >= minKp ? 'var(--accent-green)' : 'var(--danger)';
  document.querySelectorAll('.kp-segment').forEach(seg => {
    const level = parseInt(seg.dataset.level);
    seg.classList.toggle('active', level <= Math.ceil(kpVal));
  });
  document.getElementById('kpInfo').textContent =
    `Misst die Sonnenwind-Aktivitaet. Ab KP ${minKp} hier in ${loc.name} sichtbar.`;

  // Bz Panel
  const bzEl = document.getElementById('bzValue');
  const bzBar = document.getElementById('bzBar');
  const bzInfo = document.getElementById('bzInfo');
  if (bzEl) {
    if (bz !== null) {
      bzEl.textContent = `${bz.toFixed(1)} nT`;
      bzEl.style.color = bz <= -5 ? 'var(--accent-green)' : bz <= 0 ? 'var(--accent-blue)' : 'var(--danger)';
      // Bar: -20 (left=0%) to +20 (left=100%), zero at 50%
      const bzClamped = Math.max(-20, Math.min(20, bz));
      const bzPct = ((bzClamped + 20) / 40) * 100;
      if (bzBar) {
        // Bar from zero (50%) to current position
        if (bz <= 0) {
          bzBar.style.left = bzPct + '%';
          bzBar.style.width = (50 - bzPct) + '%';
          bzBar.style.background = bz <= -10 ? 'var(--accent-green)' : bz <= -5 ? '#4caf50' : 'var(--accent-blue)';
        } else {
          bzBar.style.left = '50%';
          bzBar.style.width = (bzPct - 50) + '%';
          bzBar.style.background = 'var(--danger)';
        }
      }
      if (bzInfo) {
        if (bz <= -10) bzInfo.textContent = 'Stark suedwaerts - Magnetosphaere weit offen. Beste Bedingungen!';
        else if (bz <= -5) bzInfo.textContent = 'Suedwaerts - gute Bedingungen fuer Aurora.';
        else if (bz <= 0) bzInfo.textContent = 'Leicht suedwaerts - maessige Bedingungen.';
        else bzInfo.textContent = 'Nordwaerts - Magnetosphaere geschlossen. Ungeunstig.';
      }
    } else {
      bzEl.textContent = '-- nT';
      bzEl.style.color = 'var(--text-dim)';
      if (bzBar) { bzBar.style.width = '0%'; }
      if (bzInfo) bzInfo.textContent = 'Keine Daten verfuegbar.';
    }
  }

  // Solar Wind Panel
  const swValue = document.getElementById('solarWindValue');
  const swDetails = document.getElementById('solarWindDetails');
  if (swValue) {
    if (speed !== null) {
      swValue.textContent = `${Math.round(speed)} km/s`;
      swValue.style.color = speed > 600 ? '#00e5ff' : speed > 500 ? 'var(--accent-green)' :
        speed > 400 ? 'var(--warning)' : 'var(--text-dim)';
    } else {
      swValue.textContent = '-- km/s';
      swValue.style.color = 'var(--text-dim)';
    }
  }
  if (swDetails) {
    const speedText = speed !== null ? `${Math.round(speed)} km/s` : '--';
    const densityText = density !== null ? `${density.toFixed(1)} p/cm\u00B3` : '--';
    swDetails.innerHTML = `<span class="sw-speed">Geschwindigkeit: ${speedText}</span>` +
      `<span class="sw-density">Dichte: ${densityText}</span>`;
  }

  // OVATION Panel
  const ovValue = document.getElementById('ovationValue');
  const ovFill = document.getElementById('ovationFill');
  const ovInfo = document.getElementById('ovationInfo');
  if (ovValue) {
    if (ovProb > 0) {
      ovValue.textContent = `${Math.round(ovProb)}%`;
      ovValue.style.color = ovProb > 30 ? 'var(--accent-green)' : ovProb > 15 ? 'var(--warning)' : 'var(--text-dim)';
    } else {
      ovValue.textContent = '--%';
      ovValue.style.color = 'var(--text-dim)';
    }
  }
  if (ovFill) {
    ovFill.style.width = `${Math.min(100, ovProb)}%`;
    ovFill.style.background = ovProb > 30 ? 'var(--accent-green)' : ovProb > 15 ? 'var(--warning)' : 'var(--text-dim)';
  }
  if (ovInfo) {
    if (ovProb > 30) ovInfo.textContent = 'Hohe Aurora-Wahrscheinlichkeit laut NOAA-Modell!';
    else if (ovProb > 15) ovInfo.textContent = 'Maessige Wahrscheinlichkeit fuer Aurora an diesem Standort.';
    else if (ovProb > 5) ovInfo.textContent = 'Geringe Wahrscheinlichkeit. Moeglich bei klarem Himmel.';
    else ovInfo.textContent = 'NOAA-Vorhersagemodell fuer diesen Standort.';
  }

  // Cloud Panel
  document.getElementById('cloudValue').textContent = `${Math.round(cloudFrac)}%`;
  document.getElementById('cloudValue').style.color = cloudFrac < 30 ? 'var(--accent-green)' :
    cloudFrac < 60 ? 'var(--warning)' : 'var(--danger)';
  document.getElementById('cloudFill').style.width = `${cloudFrac}%`;
  document.getElementById('cloudFill').style.background = cloudFrac < 30 ? 'var(--accent-green)' :
    cloudFrac < 60 ? 'var(--warning)' : 'var(--danger)';

  // Darkness Panel
  document.getElementById('darknessValue').textContent = darknessText;
  document.getElementById('darknessValue').style.color =
    darknessLevel === 'night' ? 'var(--accent-green)' :
    darknessLevel === 'nautical' ? 'var(--accent-blue)' :
    darknessLevel === 'civil' ? 'var(--warning)' : 'var(--danger)';

  document.getElementById('darknessIndicator').innerHTML = `${darknessEmoji} ${moonEmoji}`;
  document.getElementById('darknessInfo').innerHTML =
    `Nordlichter brauchen Dunkelheit. Beste Zeit: 21-02 Uhr.<br>` +
    `\u2600\uFE0F Auf: ${fmt(sunData.times.sunrise)} | Unter: ${fmt(sunData.times.sunset)} | ` +
    `Mond: ${Math.round(moonPhase * 100)}% beleuchtet`;
}

// ===== Hourly Aurora Forecast =====
function computeHourlyAurora(timeseries, kpForecast, currentKp, lat, lon, solarWind, ovationProb) {
  const now = new Date();
  const result = [];
  const interval = auroraInterval;

  const bz = solarWind ? solarWind.bz : null;
  const speed = solarWind ? solarWind.speed : null;
  const density = solarWind ? solarWind.density : null;
  const ovProb = ovationProb || 0;

  const future = timeseries.filter(ts => {
    const t = new Date(ts.time);
    return t >= now && t <= new Date(now.getTime() + 86400000);
  });

  for (let i = 0; i < future.length; i++) {
    const ts = future[i];
    const t = new Date(ts.time);

    if (i > 0) {
      const hoursSinceFirst = Math.round((t - new Date(future[0].time)) / 3600000);
      if (hoursSinceFirst % interval !== 0) continue;
    }

    const clouds = ts.data.instant.details.cloud_area_fraction || 0;

    let kp = currentKp;
    if (kpForecast) {
      const fKp = getKpForTime(kpForecast, t);
      if (fKp !== null) kp = fKp;
    }

    const sunPos = SunCalc.getPosition(t, lat, lon);
    const sunAlt = sunPos.altitude * (180 / Math.PI);
    const moonIllum = SunCalc.getMoonIllumination(t);
    const rating = computeAuroraRating(kp, clouds, sunAlt, lat, bz, speed, density, ovProb, moonIllum.fraction);

    result.push({
      time: t,
      rating,
      kp: Math.round(kp * 10) / 10,
      clouds: Math.round(clouds),
      sunAlt,
      isDark: sunAlt < -6,
      isNow: i === 0,
      bz: bz !== null ? Math.round(bz * 10) / 10 : null,
      ovation: ovProb > 0 ? Math.round(ovProb) : null
    });
  }

  return result;
}

function renderHourlyAurora(hourlyData) {
  const container = document.getElementById('auroraHourlyScroll');
  if (!container) return;

  lastHourlyAuroraData = hourlyData;

  const ratingColors = ['#555', '#ff1744', '#ff9100', '#ffea00', '#00e676', '#00e5ff'];
  const ratingLabels = ['--', 'Sehr gering', 'Gering', 'Moeglich', 'Gut', 'Sehr gut'];

  container.innerHTML = hourlyData.map(h => {
    const hour = h.isNow ? 'Jetzt' : h.time.getHours().toString().padStart(2, '0') + ':00';
    const color = ratingColors[h.rating];
    const dimClass = h.isDark ? '' : ' daylight';

    let extraInfo = '';
    if (h.bz !== null) {
      const bzColor = h.bz <= -5 ? 'var(--accent-green)' : h.bz <= 0 ? 'var(--accent-blue)' : 'var(--danger)';
      extraInfo += `<span class="aurora-hour-bz" style="color:${bzColor}">Bz ${h.bz}</span>`;
    }
    if (h.ovation !== null && h.ovation > 0) {
      extraInfo += `<span class="aurora-hour-ov">${h.ovation}%</span>`;
    }

    return `<div class="aurora-hour${h.isNow ? ' now' : ''}${dimClass}">
      <span class="aurora-hour-time">${hour}</span>
      <div class="aurora-hour-circle" style="background:${color}22;border:2px solid ${color}">
        <span style="color:${color};font-weight:700;font-size:16px">${h.rating}</span>
      </div>
      <span class="aurora-hour-label" style="color:${color}">${ratingLabels[h.rating]}</span>
      <span class="aurora-hour-clouds">\u2601 ${h.clouds}%</span>
      <span class="aurora-hour-kp">KP ${h.kp}</span>
      ${extraInfo}
      ${!h.isDark ? '<span class="aurora-hour-day">\u2600\uFE0F</span>' : ''}
    </div>`;
  }).join('');
}

// ===== Weather Maps =====
function initMapTabs() {
  renderMapTabs();
  const tabs = document.getElementById('mapTabs');
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.map-tab');
    if (!btn) return;
    tabs.querySelectorAll('.map-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadMap(btn.dataset.map);
  });
  loadMap('meteogram');
}

function renderMapTabs() {
  const tabs = document.getElementById('mapTabs');
  tabs.innerHTML = Object.entries(WEATHER_MAPS).map(([key, cfg], i) =>
    `<button class="map-tab${i === 0 ? ' active' : ''}" data-map="${key}">${cfg.label}</button>`
  ).join('');
}

function loadMap(type) {
  const config = WEATHER_MAPS[type];
  if (!config) return;

  const container = document.getElementById('mapContainer');
  const info = document.getElementById('mapInfo');

  // Windy embed (GitHub Pages)
  if (config.windy) {
    const loc = getActiveLocation();
    const w = config.windy;
    const src = `https://embed.windy.com/embed2.html?lat=${loc.lat}&lon=${loc.lon}` +
      `&detailLat=${loc.lat}&detailLon=${loc.lon}&zoom=${w.zoom || 5}` +
      `&level=surface&overlay=${w.overlay}&product=${w.product}` +
      `&menu=&message=true&marker=${windyMarkerCode(loc.lat, loc.lon)}&calendar=now&type=map&location=coordinates` +
      `&metricWind=m%2Fs&metricTemp=%C2%B0C&radarRange=-1`;
    container.innerHTML = `<iframe src="${src}" class="weather-map-iframe" allowfullscreen loading="lazy"></iframe>`;
    info.textContent = config.info;
    return;
  }

  // Image loading (NAS / direct)
  const urls = config.getUrls ? config.getUrls() : [];
  const url = urls[0];

  if (!url) {
    container.innerHTML = '<div class="map-loading">Nicht verfuegbar fuer GPS-Standort</div>';
    info.textContent = '';
    return;
  }

  const fallbacks = urls.slice(1);

  container.innerHTML = `<div class="map-loading" id="mapLoading">Laden...</div>
    <img class="weather-map-img" src="${url}" alt="${config.label}"
      onload="this.previousElementSibling.classList.add('hidden')"
      onerror="mapImageFallback(this)">`;

  const img = container.querySelector('.weather-map-img');
  img._fallbackUrls = fallbacks;

  info.textContent = config.info;
}

// Global fallback handler for map images
function mapImageFallback(img) {
  if (img._fallbackUrls && img._fallbackUrls.length > 0) {
    const nextUrl = img._fallbackUrls.shift();
    console.warn('Map image failed, trying fallback:', nextUrl);
    img.src = nextUrl;
  } else {
    // All URLs exhausted - show yr.no link as alternative
    const loading = img.previousElementSibling;
    if (loading) {
      loading.innerHTML = 'Karte nicht verfuegbar<br>' +
        '<a href="https://www.yr.no/en/map/radar" target="_blank" ' +
        'style="color:var(--accent-blue);font-size:13px;text-decoration:underline">' +
        'Yr.no Radar oeffnen</a>';
      loading.classList.remove('hidden');
    }
    img.style.display = 'none';
  }
}

function renderYrMapLinks() {
  const container = document.getElementById('yrMapLinks');
  if (!container) return;
  container.innerHTML = YR_MAP_LINKS.map(link =>
    `<a href="${link.url}" target="_blank" class="yr-map-link">${link.label}</a>`
  ).join('');
}

// ===== Webcams =====
const WEBCAMS = {
  'Tromsoe': [
    { label: 'Panorama', url: 'https://www.youtube.com/embed/3y7_fkAzzps?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Nordfjordeid': [
    { label: 'Hafen', url: 'https://www.youtube.com/embed/0V59F4M3o88?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Narvik': [
    { label: 'Marina', url: 'https://www.youtube.com/embed/OJneSeFqaaw?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Aalesund': [
    { label: 'Hafen', link: 'https://www.skylinewebcams.com/en/webcam/norge/western-norway/alesund/alesund.html', source: 'SkylineWebcams' }
  ],
  'Honningsvag': [
    { label: 'Panorama', url: 'https://www.youtube.com/embed/iXLaEkB3J0I?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Nordkapp': [
    { label: 'Honningsvag', url: 'https://www.youtube.com/embed/iXLaEkB3J0I?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Lofoten': [
    { label: 'Henningsvaer', link: 'https://www.skylinewebcams.com/en/webcam/norge/nordland/lofoten/henningsvaer.html', source: 'SkylineWebcams' },
    { label: 'Reine', link: 'https://www.skylinewebcams.com/en/webcam/norge/nordland/lofoten/reine.html', source: 'SkylineWebcams' }
  ],
  'Bodoe': [
    { label: 'Stadt', url: 'https://www.youtube.com/embed/ZbKYp5ulmCM?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Trondheim': [
    { label: 'Hafen', url: 'https://www.youtube.com/embed/cQUw882F6aE?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Bergen': [
    { label: 'Hafen', link: 'https://www.skylinewebcams.com/en/webcam/norge/western-norway/bergen/bergen.html', source: 'SkylineWebcams' }
  ],
  'Stavanger': [
    { label: 'Hafen', url: 'https://www.youtube.com/embed/RA6Jm7sv_F4?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ],
  'Oslo': [
    { label: 'Skyline', url: 'https://www.youtube.com/embed/7VXn9NpuSZk?autoplay=1&mute=1', source: 'SkylineWebcams' }
  ]
};

let activeWebcamIdx = -1;

function renderWebcams() {
  const container = document.getElementById('webcamContent');
  if (!container) return;
  const loc = getActiveLocation();
  const locName = loc.nearestName || loc.name;
  const cams = WEBCAMS[locName] || [];

  if (cams.length === 0) {
    container.innerHTML = '<div class="webcam-empty">Keine Webcams fuer diesen Ort</div>';
    return;
  }

  activeWebcamIdx = -1;
  let html = '<div class="webcam-buttons">';
  cams.forEach((cam, i) => {
    if (cam.url) {
      html += `<button class="webcam-btn" data-idx="${i}">\uD83D\uDCF7 ${cam.label} <span class="webcam-source">${cam.source}</span></button>`;
    } else if (cam.link) {
      html += `<a class="webcam-btn webcam-link" href="${cam.link}" target="_blank">\uD83D\uDCF7 ${cam.label} <span class="webcam-source">${cam.source} \u2197</span></a>`;
    }
  });
  html += '</div><div class="webcam-viewer" id="webcamViewer"></div>';
  container.innerHTML = html;
}

function toggleWebcam(idx) {
  const loc = getActiveLocation();
  const locName = loc.nearestName || loc.name;
  const cams = WEBCAMS[locName] || [];
  const viewer = document.getElementById('webcamViewer');
  if (!viewer || !cams[idx]) return;

  const btns = document.querySelectorAll('.webcam-btn[data-idx]');
  if (activeWebcamIdx === idx) {
    viewer.innerHTML = '';
    activeWebcamIdx = -1;
    btns.forEach(b => b.classList.remove('active'));
    return;
  }

  activeWebcamIdx = idx;
  btns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.idx) === idx));
  const cam = cams[idx];
  viewer.innerHTML = `<div class="webcam-iframe-wrap">
    <div class="webcam-loading">Laden...</div>
    <iframe src="${cam.url}" class="webcam-iframe" allowfullscreen allow="autoplay" loading="lazy"
      onload="this.previousElementSibling.classList.add('hidden')"></iframe>
    <button class="webcam-close-btn" id="webcamCloseBtn">\u2715</button>
  </div>`;
}

// Event delegation for webcam buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('.webcam-btn[data-idx]');
  if (btn) {
    toggleWebcam(parseInt(btn.dataset.idx));
    return;
  }
  if (e.target.id === 'webcamCloseBtn' || e.target.closest('#webcamCloseBtn')) {
    toggleWebcam(activeWebcamIdx);
  }
});

// ===== Main Load =====
async function loadData() {
  const loc = getActiveLocation();
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  try {
    const [weatherData, kpArr, kpForecast, solarWind, ovationProb] = await Promise.all([
      fetchWeather(loc.lat, loc.lon),
      fetchKpIndex().catch(() => null),
      fetchKpForecast().catch(() => null),
      fetchSolarWind().catch(() => null),
      fetchOvation(loc.lat, loc.lon).catch(() => 0)
    ]);

    const ts = weatherData.properties.timeseries;
    const sunData = getSunData(loc.lat, loc.lon);

    let currentKp = 0;
    if (kpArr && kpArr.length > 1) {
      currentKp = parseFloat(kpArr[kpArr.length - 1][1]) || 0;
    }

    renderCurrentWeather(ts[0]);
    renderHourly(ts);
    renderAurora(ts[0], kpArr, sunData, solarWind, ovationProb);

    // Forecast-Tabs: Daten in State speichern
    forecastTimeseries = ts;
    try {
      forecastDaily16 = await fetchDailyForecast16(loc.lat, loc.lon);
    } catch {
      forecastDaily16 = null;
    }
    renderForecastTab(activeForecastTab);

    // Webcams aktualisieren
    renderWebcams();

    // Hourly Aurora Forecast
    const hourlyAurora = computeHourlyAurora(ts, kpForecast, currentKp, loc.lat, loc.lon, solarWind, ovationProb);
    renderHourlyAurora(hourlyAurora);

    // Refresh active map (meteogram/regional depend on location)
    const activeMapTab = document.querySelector('.map-tab.active');
    if (activeMapTab) loadMap(activeMapTab.dataset.map);

    // Show update time - fetch static data timestamp on GitHub Pages
    let timeStr = new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
    if (isGitHubPages) {
      try {
        const meta = await fetchJson('./data/updated.json', 5000);
        if (meta && meta.updated) {
          const d = new Date(meta.updated);
          timeStr = d.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) + ' (Cache)';
        }
      } catch {}
    }
    document.getElementById('updateTime').textContent = `Zuletzt aktualisiert: ${timeStr}`;

  } catch (err) {
    console.error('Load error:', err);
    const desc = document.getElementById('currentDesc');
    if (isGitHubPages) {
      desc.innerHTML = 'Daten werden geladen...<br><small>Wetterdaten werden alle 5 Min. aktualisiert.</small>';
    } else {
      const isNetErr = err.message.includes('Failed to fetch') || err.name === 'AbortError' || err.message.includes('NetworkError');
      if (isNetErr && !nasReachable) {
        desc.innerHTML = 'API nicht erreichbar.<br><small style="color:var(--accent-blue)">Zuhause: http://192.168.0.135:3001 nutzen</small>';
      } else {
        desc.textContent = 'Fehler: ' + err.message;
      }
    }
  }

  btn.classList.remove('spinning');
}

// ===== Init =====
async function init() {
  renderLocationTabs();
  renderYrMapLinks();
  initForecastTabs();

  await checkNasProxy();

  initMapTabs();
  loadData();

  document.getElementById('refreshBtn').addEventListener('click', () => {
    weatherCache = {};
    kpData = null;
    kpForecastCache = null;
    solarWindCache = null;
    ovationCache = null;
    loadData();
  });

  // Aurora interval buttons
  const intervalBtns = document.getElementById('auroraIntervalBtns');
  if (intervalBtns) {
    intervalBtns.addEventListener('click', e => {
      const btn = e.target.closest('.interval-btn');
      if (!btn) return;
      intervalBtns.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      auroraInterval = parseInt(btn.dataset.interval);
      // Re-render without re-fetching
      if (lastHourlyAuroraData) {
        // Need to recompute with new interval - trigger full reload
        loadData();
      }
    });
  }

  setInterval(loadData, 600000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => { setInterval(() => reg.update(), 300000); })
      .catch(e => console.warn('SW reg failed:', e));
  }
}

document.addEventListener('DOMContentLoaded', init);
