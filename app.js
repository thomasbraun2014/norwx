// ===== BT-Wetter - Norwegian Weather PWA =====

const NAS_PROXY = 'http://192.168.0.135:3001';

const LOCATIONS = [
  { name: 'Tromsoe', lat: 69.6496, lon: 18.9560, yrId: '1-305409' },
  { name: 'Nordfjordeid', lat: 61.7890, lon: 5.9870, yrId: '1-168106' },
  { name: 'Narvik', lat: 68.4385, lon: 17.4272, yrId: '1-283156' },
  { name: 'Aalesund', lat: 62.4722, lon: 6.1495, yrId: '1-181828' },
  { name: 'Honningsvag', lat: 70.9813, lon: 25.9706, yrId: '1-328454' },
  { name: 'Nordkapp', lat: 71.1685, lon: 25.7838, yrId: '1-328454' },
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

// ===== Proxy Detection =====
let nasReachable = null;

async function checkNasProxy() {
  if (nasReachable !== null) return nasReachable;
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

// ===== Weather Map URLs =====
function radarUrl(type, format, area) {
  if (nasReachable) {
    return `${NAS_PROXY}/api/radar?type=${type}&format=${format}&area=${area}&t=${Date.now()}`;
  }
  return `https://api.met.no/weatherapi/radar/2.0/${type}.${format}?area=${area}`;
}

function meteogramUrl(yrId) {
  if (!yrId) return '';
  if (nasReachable) {
    return `${NAS_PROXY}/api/meteogram?id=${yrId}&t=${Date.now()}`;
  }
  return `https://www.yr.no/en/content/${yrId}/meteogram.svg?mode=dark`;
}

const WEATHER_MAPS = {
  meteogram: {
    type: 'svg',
    label: 'Meteogramm',
    getUrl: () => meteogramUrl(getActiveLocation().yrId),
    info: 'Yr.no 3-Tage Meteogramm fuer den aktuellen Ort'
  },
  radar: {
    type: 'image',
    label: 'Radar',
    getUrl: () => radarUrl('reflectivity', 'gif', 'norway'),
    info: 'Niederschlagsradar Norwegen (letzte 3h Animation)'
  },
  radar5: {
    type: 'image',
    label: 'Radar 5-Stufen',
    getUrl: () => radarUrl('5level_reflectivity', 'gif', 'norway'),
    info: 'Niederschlag in 5 Intensitaetsstufen (Animation)'
  },
  preciptype: {
    type: 'image',
    label: 'Niederschlagsart',
    getUrl: () => radarUrl('preciptype', 'gif', 'norway'),
    info: 'Regen/Schnee/Schneeregen Unterscheidung (Animation)'
  },
  nordland: {
    type: 'image',
    label: 'Nordland',
    getUrl: () => radarUrl('reflectivity', 'gif', 'nordland'),
    info: 'Radar Nordland (Lofoten, Bodoe)'
  },
  finnmark: {
    type: 'image',
    label: 'Finnmark',
    getUrl: () => radarUrl('reflectivity', 'gif', 'finnmark'),
    info: 'Radar Finnmark (Nordkapp, Tromsoe)'
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
let auroraInterval = 1;
let gpsLocation = null;
let isGpsActive = false;
let lastHourlyAuroraData = null;

function getActiveLocation() {
  if (isGpsActive && gpsLocation) return gpsLocation;
  return LOCATIONS[currentLocationIdx];
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

  const directUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const proxyUrl = `${NAS_PROXY}/api/weather?lat=${lat}&lon=${lon}`;

  let data;
  if (nasReachable) {
    try { data = await fetchJson(proxyUrl, 12000); }
    catch { data = await fetchJson(directUrl, 12000); }
  } else {
    try { data = await fetchJson(directUrl, 12000); }
    catch { data = await fetchJson(proxyUrl, 12000); }
  }

  weatherCache[key] = { data, time: Date.now() };
  return data;
}

async function fetchKpIndex() {
  if (kpData && Date.now() - kpData.time < 300000) return kpData.data;

  const directUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
  const proxyUrl = `${NAS_PROXY}/api/kp-index`;

  let data;
  if (nasReachable) {
    try { data = await fetchJson(proxyUrl, 10000); }
    catch { data = await fetchJson(directUrl, 10000); }
  } else {
    try { data = await fetchJson(directUrl, 10000); }
    catch { data = await fetchJson(proxyUrl, 10000); }
  }

  kpData = { data, time: Date.now() };
  return data;
}

async function fetchKpForecast() {
  if (kpForecastCache && Date.now() - kpForecastCache.time < 300000) return kpForecastCache.data;

  const directUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
  const proxyUrl = `${NAS_PROXY}/api/kp-forecast`;

  let data;
  if (nasReachable) {
    try { data = await fetchJson(proxyUrl, 10000); }
    catch { data = await fetchJson(directUrl, 10000); }
  } else {
    try { data = await fetchJson(directUrl, 10000); }
    catch { data = await fetchJson(proxyUrl, 10000); }
  }

  kpForecastCache = { data, time: Date.now() };
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
        gpsLocation = {
          name: 'Standort',
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
          yrId: null
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
  const gpsTab = `<button class="loc-tab gps-tab${isGpsActive ? ' active' : ''}" data-gps="1">\uD83D\uDCCD Standort</button>`;
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

// ===== Aurora Rating Algorithm =====
function computeAuroraRating(kp, cloudFrac, sunAltDeg, lat) {
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

function renderAurora(weather, kpArr, sunData) {
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

  const rating = computeAuroraRating(kpVal, cloudFrac, sunAlt, loc.lat);

  const ratingLabels = [
    'Keine Chance', 'Sehr unwahrscheinlich', 'Unwahrscheinlich',
    'Moeglich', 'Gute Chancen', 'Ausgezeichnet'
  ];
  const ratingColors = ['#666', '#ff5252', '#ff5252', '#ffab40', '#00e676', '#7c4dff'];

  let summary = [];
  if (darknessLevel === 'day') summary.push('Es ist zu hell fuer Nordlichter');
  else {
    if (kpVal >= minKp) summary.push(`KP ${kpVal} reicht fuer ${loc.name}`);
    else summary.push(`KP ${kpVal} ist zu niedrig (min. KP ${minKp} fuer ${loc.name})`);
    if (cloudFrac > 60) summary.push('zu viele Wolken');
    else if (cloudFrac < 25) summary.push('klarer Himmel');
    if (moonPhase > 0.7) summary.push('heller Mond reduziert Kontrast');
  }

  document.getElementById('auroraStars').innerHTML =
    Array.from({length: 5}, (_, i) =>
      `<span style="color:${i < rating ? ratingColors[rating] : '#333'}">${i < rating ? '\u2605' : '\u2606'}</span>`
    ).join('');

  document.getElementById('auroraLabel').textContent = ratingLabels[rating];
  document.getElementById('auroraLabel').style.color = ratingColors[rating];
  document.getElementById('auroraSummary').textContent = summary.join(' \u2022 ');

  document.getElementById('kpValue').textContent = kpVal.toFixed(1);
  document.getElementById('kpValue').style.color = kpVal >= minKp ? 'var(--accent-green)' : 'var(--danger)';
  document.querySelectorAll('.kp-segment').forEach(seg => {
    const level = parseInt(seg.dataset.level);
    seg.classList.toggle('active', level <= Math.ceil(kpVal));
  });
  document.getElementById('kpInfo').textContent =
    `Misst die Sonnenwind-Aktivitaet. Ab KP ${minKp} hier in ${loc.name} sichtbar.`;

  document.getElementById('cloudValue').textContent = `${Math.round(cloudFrac)}%`;
  document.getElementById('cloudValue').style.color = cloudFrac < 30 ? 'var(--accent-green)' :
    cloudFrac < 60 ? 'var(--warning)' : 'var(--danger)';
  document.getElementById('cloudFill').style.width = `${cloudFrac}%`;
  document.getElementById('cloudFill').style.background = cloudFrac < 30 ? 'var(--accent-green)' :
    cloudFrac < 60 ? 'var(--warning)' : 'var(--danger)';

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
function computeHourlyAurora(timeseries, kpForecast, currentKp, lat, lon) {
  const now = new Date();
  const result = [];
  const interval = auroraInterval;

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
    const rating = computeAuroraRating(kp, clouds, sunAlt, lat);

    result.push({
      time: t,
      rating,
      kp: Math.round(kp * 10) / 10,
      clouds: Math.round(clouds),
      sunAlt,
      isDark: sunAlt < -6,
      isNow: i === 0
    });
  }

  return result;
}

function renderHourlyAurora(hourlyData) {
  const container = document.getElementById('auroraHourlyScroll');
  if (!container) return;

  lastHourlyAuroraData = hourlyData;

  const ratingColors = ['#555', '#ff5252', '#ff5252', '#ffab40', '#00e676', '#7c4dff'];
  const ratingLabels = ['--', 'Gering', 'Gering', 'Mittel', 'Gut', 'Top'];

  container.innerHTML = hourlyData.map(h => {
    const hour = h.isNow ? 'Jetzt' : h.time.getHours().toString().padStart(2, '0') + ':00';
    const color = ratingColors[h.rating];
    const dimClass = h.isDark ? '' : ' daylight';

    return `<div class="aurora-hour${h.isNow ? ' now' : ''}${dimClass}">
      <span class="aurora-hour-time">${hour}</span>
      <div class="aurora-hour-circle" style="background:${color}22;border:2px solid ${color}">
        <span style="color:${color};font-weight:700;font-size:16px">${h.rating}</span>
      </div>
      <span class="aurora-hour-label" style="color:${color}">${ratingLabels[h.rating]}</span>
      <span class="aurora-hour-clouds">\u2601 ${h.clouds}%</span>
      <span class="aurora-hour-kp">KP ${h.kp}</span>
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
  const url = config.getUrl();

  if (!url) {
    container.innerHTML = '<div class="map-loading">Nicht verfuegbar fuer GPS-Standort</div>';
    info.textContent = '';
    return;
  }

  if (config.type === 'svg') {
    container.innerHTML = `<div class="map-loading" id="mapLoading">Laden...</div>
      <object type="image/svg+xml" data="${url}" class="weather-map-svg"
        onload="this.previousElementSibling.classList.add('hidden')"
        onerror="this.previousElementSibling.textContent='Nicht verfuegbar'">
      </object>`;
  } else {
    container.innerHTML = `<div class="map-loading" id="mapLoading">Laden...</div>
      <img class="weather-map-img" src="${url}" alt="Wetterkarte"
        onload="this.previousElementSibling.classList.add('hidden')"
        onerror="this.previousElementSibling.textContent='Karte nicht verfuegbar'">`;
  }
  info.textContent = config.info;
}

function renderYrMapLinks() {
  const container = document.getElementById('yrMapLinks');
  if (!container) return;
  container.innerHTML = YR_MAP_LINKS.map(link =>
    `<a href="${link.url}" target="_blank" class="yr-map-link">${link.label}</a>`
  ).join('');
}

// ===== Main Load =====
async function loadData() {
  const loc = getActiveLocation();
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  try {
    const [weatherData, kpArr, kpForecast] = await Promise.all([
      fetchWeather(loc.lat, loc.lon),
      fetchKpIndex().catch(() => null),
      fetchKpForecast().catch(() => null)
    ]);

    const ts = weatherData.properties.timeseries;
    const sunData = getSunData(loc.lat, loc.lon);

    let currentKp = 0;
    if (kpArr && kpArr.length > 1) {
      currentKp = parseFloat(kpArr[kpArr.length - 1][1]) || 0;
    }

    renderCurrentWeather(ts[0]);
    renderHourly(ts);
    renderDaily(ts);
    renderAurora(ts[0], kpArr, sunData);

    // Hourly Aurora Forecast
    const hourlyAurora = computeHourlyAurora(ts, kpForecast, currentKp, loc.lat, loc.lon);
    renderHourlyAurora(hourlyAurora);

    document.getElementById('updateTime').textContent =
      `Zuletzt aktualisiert: ${new Date().toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}`;

  } catch (err) {
    console.error('Load error:', err);
    document.getElementById('currentDesc').textContent = 'Fehler beim Laden: ' + err.message;
  }

  btn.classList.remove('spinning');
}

// ===== Init =====
async function init() {
  renderLocationTabs();
  renderYrMapLinks();

  await checkNasProxy();

  initMapTabs();
  loadData();

  document.getElementById('refreshBtn').addEventListener('click', () => {
    weatherCache = {};
    kpData = null;
    kpForecastCache = null;
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
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW reg failed:', e));
  }
}

document.addEventListener('DOMContentLoaded', init);
