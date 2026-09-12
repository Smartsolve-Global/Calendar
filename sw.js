// Bump this on deploys where you've renamed/removed cached files (e.g. new icons).
// It is NOT required for normal content updates — see the fetch handler below,
// which always revalidates against the network and keeps the cache fresh itself.
const CACHE_VERSION = 'v10';
const CACHE_NAME = 'verifiabel-shell-' + CACHE_VERSION;

// Everything needed to boot the app with no network. index.html carries its
// own CSS/JS inline and the manifest is an embedded data URI, so this list
// is short by design — just the shell + icons.
const APP_SHELL = [
  '/Calendar/',
  '/Calendar/index.html',
  '/Calendar/icon-192.png',
  '/Calendar/icon-512.png',
  '/Calendar/icon-180.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // cache.addAll() is all-or-nothing — one bad path (wrong case, missing
      // file) would fail the entire install and leave you with no offline
      // support at all. Cache each file independently instead, so a typo in
      // one icon path can't take down the rest of the shell.
      Promise.all(APP_SHELL.map(url =>
        cache.add(url).catch(err => console.warn('[SW] Precache skipped:', url, err))
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // Only manage requests to our own app shell. Everything else — Google
  // Sign-In, the Apps Script sync endpoint, fonts, the Calendar template
  // URL — goes straight to the network, untouched.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Online: always use the live response, and refresh the offline
        // copy with it. This is what keeps the cache from ever going
        // stale — no manual cache-clearing, no version bump needed.
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return resp;
      })
      .catch(() =>
        // Offline: serve the last good copy of this exact file, or —
        // for a page navigation specifically — fall back to the cached
        // app shell so the app still opens rather than showing a browser
        // error page. Non-navigation requests (e.g. an image) with no
        // cached copy are allowed to fail rather than resolving to HTML.
        caches.match(e.request).then(cached => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') return caches.match('/Calendar/index.html');
          return undefined;
        })
      )
  );
});
