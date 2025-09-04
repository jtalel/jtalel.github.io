const CACHE_NAME = 'tasa-pwa-v2';

self.addEventListener('install', (event) => {
  // Activate new service worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove any previously cached data
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always fetch from network to avoid stale caches
  event.respondWith(fetch(event.request));
});
