const CACHE_NAME = 'cms-cache-v1';
const urlsToCache = ['./CMS.html', './CMS.css', './CMS.js', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./CMS.html')))
  );
});

self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.text() : 'Ada artikel baru';
  const title = 'CMS Update';
  const options = { body: payload, icon: 'https://img.icons8.com/color/48/000000/news.png' };
  event.waitUntil(self.registration.showNotification(title, options));
});
