const CACHE_NAME = 'finanzas-v3'; // Cambia el número de v1 a v2 cuando quieras forzar un cambio
const assets = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'https://cdn.jsdelivr.net/npm/chart.js' // <--- Asegúrate de que esto esté aquí
];

self.addEventListener('install', e => {
    // Esto obliga al Service Worker nuevo a activarse sin esperar
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', e => {
    // Limpia las versiones viejas de la caché automáticamente
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
        })
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});