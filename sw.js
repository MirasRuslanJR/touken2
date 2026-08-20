// sw.js — precaches the app shell so ТАМЫР keeps working with the network off.
const CACHE = 'tamyr-v1';
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

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
