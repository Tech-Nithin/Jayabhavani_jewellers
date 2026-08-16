const CACHE_NAME = 'jbj-pwa-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/JB_logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  try {
    const url = new URL(event.request.url);

    // Bypass API calls, SSE streams, cross-origin backend ports, non-GET requests
    if (
      url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('/stream') ||
      event.request.method !== 'GET' ||
      !url.protocol.startsWith('http')
    ) {
      return;
    }

    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match('/index.html'))
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  } catch (err) {
    // If URL parsing fails, allow standard browser fetch
  }
});
