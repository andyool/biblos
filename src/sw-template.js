// Biblos service worker — generated at build time from src/sw-template.js.
const VERSION = '__VERSION__';
const SHELL = `biblos-shell-${VERSION}`;
const RUNTIME = 'biblos-runtime';
const TEXTS = 'biblos-texts';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => (key.startsWith('biblos-shell-') && key !== SHELL) || key === RUNTIME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Pages: try the network first so new versions arrive, fall back to the cached app.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/', { ignoreSearch: true })),
    );
    return;
  }

  // Live answers from our own server (e.g. the NIV) must never come from the cache.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // App files have hashed names, so a cached copy is always correct.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  // Bible chapters from bolls.life never change — keep them for offline use.
  if (url.hostname === 'bolls.life') {
    event.respondWith(cacheFirst(request, TEXTS));
  }
});
