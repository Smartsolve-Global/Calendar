const CACHE = 'verifiabel-v1';
const ASSETS = ['/', '/calendar/', '/calendar/index.html', '/calendar/manifest.json', '/calendar/icon-192.png', '/calendar/icon-512.png', '/calendar/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first, cache fallback
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
