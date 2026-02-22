const CACHE_NAME = 'btwetter-v7';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=6',
  './app.js?v=6',
  './suncalc.js?v=6',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Install - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NAS proxy: always network, no cache - with error handling
  if (url.hostname === '192.168.0.135') {
    event.respondWith(
      fetch(event.request).catch(() => new Response('NAS unreachable', { status: 503 }))
    );
    return;
  }

  // Same-origin /api/* calls: network-first with cache fallback
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
              .catch(err => console.warn('SW cache put failed:', err));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // External API calls: network-first with cache fallback (Safari-safe)
  if (url.hostname === 'api.met.no' || url.hostname === 'services.swpc.noaa.gov') {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          // Only cache successful, non-opaque responses (Safari cross-origin safety)
          if (resp.ok && resp.type !== 'opaque') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
              .catch(err => console.warn('SW cache put failed:', err));
          }
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Weather icons from GitHub: cache-first
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Static assets: network-first with cache fallback (ensures updates arrive)
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
