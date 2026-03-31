// FinCalci Service Worker v2.0
// Single version constant controls all cache busting.
// No skipWaiting on install — user chooses when to update via banner.

const APP_VERSION = '2.0.0';
const STATIC_CACHE = `fincalci-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `fincalci-dynamic-${APP_VERSION}`;
const FONT_CACHE = 'fincalci-fonts-v1';
const MAX_DYNAMIC_ENTRIES = 60;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── INSTALL ───
// NOT calling skipWaiting — controlled update flow via 'skip-waiting' message
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
});

// ─── ACTIVATE ───
// Clean ALL old caches except current. Removes zombie Vite chunks.
self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => notifyClients({ type: 'SW_ACTIVATED', version: APP_VERSION }))
  );
});

// ─── FETCH ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Never cache live API calls
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'latest.currency-api.pages.dev' ||
      url.hostname === 'api.mfapi.in' || url.hostname === 'stock.indianapi.in' ||
      url.hostname === 'world.openfoodfacts.org' || url.hostname === 'www.google-analytics.com' ||
      url.hostname.includes('firebase')) return;

  // Fonts: cache-first (long-lived)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || request.destination === 'font') {
    event.respondWith(cacheFirst(request, FONT_CACHE)); return;
  }
  // Images/icons: cache-first
  if (request.destination === 'image' || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE)); return;
  }
  // HTML: network-first
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE)); return;
  }
  // JS/CSS: stale-while-revalidate (Vite hashed filenames make this safe)
  if (request.destination === 'script' || request.destination === 'style' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE)); return;
  }
  // Default: network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ─── STRATEGIES ───

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) { const c = await caches.open(cacheName); c.put(request, response.clone()); }
    return response;
  } catch {
    if (request.destination === 'image') return new Response('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', { headers: { 'Content-Type': 'image/gif' } });
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) { const c = await caches.open(cacheName); c.put(request, response.clone()); }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document') { const shell = await caches.match('/'); if (shell) return shell; }
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FinCalci — Offline</title></head>' +
      '<body style="background:#0B0F1A;color:#F1F5F9;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center">' +
      '<div><div style="font-size:48px;margin-bottom:16px">📱</div><h1 style="font-size:24px;font-weight:500;margin:0 0 8px">FinCalci</h1>' +
      '<p style="color:#94A3B8;font-size:14px">You\'re offline. Check your connection and reload.</p>' +
      '<button onclick="location.reload()" style="margin-top:24px;padding:12px 32px;border-radius:12px;background:#4ECDC4;border:none;color:#0B0F1A;font-weight:500;font-size:16px;cursor:pointer">Reload</button></div></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchP = fetch(request).then((response) => {
    if (response.ok) { cache.put(request, response.clone()); trimCache(cacheName, MAX_DYNAMIC_ENTRIES); }
    return response;
  }).catch(() => cached);
  return cached || fetchP;
}

// ─── CACHE MAINTENANCE ───
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Iterative delete — no recursion, no batch Promise.all failure risk
  while (keys.length > maxItems) {
    await cache.delete(keys.shift());
  }
}

// ─── MESSAGES ───
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  else if (event.data === 'trim-caches') trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ENTRIES);
  else if (event.data === 'get-version') event.source?.postMessage({ type: 'SW_VERSION', version: APP_VERSION });
});

async function notifyClients(msg) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of all) c.postMessage(msg);
}
