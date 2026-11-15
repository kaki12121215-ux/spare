const CACHE = 'spare-v1.1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'fonts/InterDisplay-ExtraLight.woff', 'fonts/InterDisplay-Light.woff', 'fonts/Inter-Regular.woff', 'fonts/Inter-SemiBold.woff',
  'img/papel-claro.jpg', 'img/papel-oscuro.jpg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
