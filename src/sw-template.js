// Biblos service worker — generated at build time from src/sw-template.js.
const VERSION = '__VERSION__';
const SHELL = `biblos-shell-${VERSION}`;
const RUNTIME = 'biblos-runtime';
const TEXTS = 'biblos-texts'; // also filled by "Download for offline" (src/lib/offline.js)
const WOOLLY = 'biblos-woolly'; // the lamb's drawings: fetched when first shown, kept across versions
const PRECACHE = __PRECACHE__;

// Built files have hashed names; the page, manifest and icons don't, so those are fetched fresh.
const hashed = (url) => url.startsWith('/assets/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: hashed(url) ? 'default' : 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Keep the previous version too: a page that is still open may ask for its files (a book's
// guide, say) after this version has taken over.
const versionOf = (key) => parseInt(key.slice('biblos-shell-'.length), 36) || 0;

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const older = keys.filter((key) => key.startsWith('biblos-shell-') && key !== SHELL).sort((a, b) => versionOf(b) - versionOf(a));
        return Promise.all([...older.slice(1), ...keys.filter((key) => key === RUNTIME)].map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim()),
  );
});

// The page asks which version is running, to offer a reload when a new one has arrived.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'version') event.source?.postMessage({ type: 'version', version: VERSION });
});

// These files never change under the same name, so a cached copy matches whatever the request's
// headers (a host that adds "Vary: Origin" would otherwise miss it, and the app would not start).
async function cacheFirst(request, cacheName) {
  const hit = await caches.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/** The app this worker installed, at once — no waiting on a weak signal. */
async function appShell(request) {
  const hit = await caches.open(SHELL).then((cache) => cache.match('/'));
  if (hit) return hit;
  try {
    return await fetch(request);
  } catch {
    return caches.match('/', { ignoreSearch: true });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Live answers from our own server (e.g. the NIV) must never come from the cache.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // Pages: open the installed app straight away. New versions arrive as a new worker, and
  // the page then offers to reload (src/lib/update.js).
  if (request.mode === 'navigate') {
    event.respondWith(appShell(request));
    return;
  }

  // App files have hashed names, so a cached copy is always correct.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/woolly-')) {
    event.respondWith(cacheFirst(request, WOOLLY));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  // Bible chapters from bolls.life never change — keep them for offline use. (Not searches:
  // there's no end to those, and they need a connection anyway.)
  if (url.hostname === 'bolls.life' && url.pathname.startsWith('/get-text/')) {
    event.respondWith(cacheFirst(request, TEXTS));
  }
});
