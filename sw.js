const CACHE_NAME = 'lulum-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // az új verzió ne várjon, azonnal aktiválódjon
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // A Google Apps Script (iframe) és minden külső kérés megy a saját útján.
  if (url.origin !== location.origin) return;

  // index.html / navigáció: először a hálózat (így az iframe URL változása is azonnal átjön),
  // a cache csak offline tartalék.
  const isPage = req.mode === 'navigate' ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');
  if (isPage) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Ikonok, manifest: cache-first
  e.respondWith(
    caches.match(req).then((res) => res || fetch(req))
  );
});
