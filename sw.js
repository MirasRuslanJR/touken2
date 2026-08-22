// sw.js — precaches the app shell so ТАМЫР keeps working with the network off.
//
// BUMP THIS on every deploy that changes a shell file. `activate` deletes every
// cache whose key differs, so a new name is what forces returning visitors off
// the old copy. Leaving it alone means anyone who opened the site before keeps
// being served the previous build forever, no matter what you ship.
const CACHE = 'tamyr-v2';
const SHELL = [
  './', './index.html', './app.html', './config.js', './manifest.webmanifest',
  './assets/css/tokens.css', './assets/css/base.css', './assets/css/components.css',
  './assets/css/graph.css', './assets/css/views.css',
  './assets/js/main.js', './assets/js/landing.js', './assets/js/router.js', './assets/js/store.js',
  './assets/js/db.js', './assets/js/ai.js', './assets/js/graph.js', './assets/js/mastery.js',
  './assets/js/offline.js', './assets/js/i18n.js', './assets/js/a11y.js', './assets/js/ui.js',
  './assets/js/demo-data.js',
  './assets/js/views/dashboard.js', './assets/js/views/onboarding.js', './assets/js/views/diagnostic.js',
  './assets/js/views/xray.js', './assets/js/views/module.js', './assets/js/views/task.js',
  './assets/js/views/tutor.js', './assets/js/views/feynman.js', './assets/js/views/scan.js',
  './assets/js/views/teacher.js', './assets/js/views/class.js', './assets/js/views/student.js',
  './assets/js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // network-first for Supabase/Gemini calls (handled by ai.js/db.js fallbacks), cache-first for the app shell
  if (req.url.includes('supabase.co') || req.url.includes('generativelanguage.googleapis.com')) return;

  // Stale-while-revalidate: answer instantly from cache (so offline and slow
  // venue wifi both work), but always refresh the entry in the background. A
  // pure cache-first shell can never self-heal — one stale file stays stale
  // until the cache name changes. This way a reload is enough.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const fromNetwork = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(fromNetwork); // keep the worker alive for the refresh
      return cached;
    }
    // Never cached and the network is gone — respond properly instead of
    // resolving with undefined, which would surface as a confusing TypeError.
    return (await fromNetwork) || new Response('Офлайн', {
      status: 503, statusText: 'Offline', headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  })());
});
