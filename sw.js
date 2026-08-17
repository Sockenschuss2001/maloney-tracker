const CACHE = 'maloney-tracker-v7-20260817';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=6',
  './config.js?v=6',
  './app.js?v=7',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

const NETWORK_FIRST_NAMES = new Set([
  '',
  'index.html',
  'episodes.json',
  'private-audio.json',
  'youtube.json',
  'config.js',
  'app.js',
  'styles.css',
  'manifest.webmanifest'
]);

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const url of APP_SHELL) {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response.ok) await cache.put(url, response.clone());
        } catch (_) {}
      }
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return (await cache.match(request)) ||
           (request.mode === 'navigate' ? await cache.match('./index.html') : Response.error());
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cross-origin media (SRF/private audio/YouTube) must go directly to its origin.
  if (url.origin !== self.location.origin) return;

  const name = url.pathname.split('/').pop();

  if (event.request.mode === 'navigate' || NETWORK_FIRST_NAMES.has(name)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
