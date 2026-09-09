const CACHE_NAME = 'jbj-pwa-cache-v4';
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

    // Network-First: Always fetch fresh content from server first, update cache, fallback to cache if offline
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') return caches.match('/index.html');
            return new Response('Network offline', { status: 503, statusText: 'Offline' });
          });
        })
    );
  } catch (err) {
    // If URL parsing fails, allow standard browser fetch
  }
});
