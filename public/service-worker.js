// FinCalci — Clean-slate Service Worker
// Clears all old caches on activate, then does nothing.
// No caching, no interception — Vercel serves everything fresh.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// No fetch interception — all requests go straight to network
self.addEventListener('fetch', () => {});
