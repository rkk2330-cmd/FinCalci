// FinCalci — Service Worker NUKE
// Unregisters itself and clears all caches.
// Deploy this once → all users get clean state.
// Add proper SW back when ready for Play Store PWA.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
      .then(() => {
        // Tell all open tabs to reload with fresh code
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_NUKED' }));
        });
      })
  );
});

// Pass through all fetches — no caching, no interception
self.addEventListener('fetch', () => {});
