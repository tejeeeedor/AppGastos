const CACHE_NAME = 'finanzas-v5'; // Sube la versión
const urlsToCache = [
    '/', '/index.html', '/style.css', '/script.js', 
    '/moneda.mp3', '/gasto.mp3', '/alerta.mp3', '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            let descargado = 0;
            // Descargamos los archivos uno a uno para medir el progreso
            for (const url of urlsToCache) {
                await cache.add(url);
                descargado++;
                const porcentaje = (descargado / urlsToCache.length) * 100;
                
                // Enviamos el porcentaje a la App
                const clientes = await self.clients.matchAll();
                clientes.forEach(cliente => {
                    cliente.postMessage({
                        type: 'PWA_INSTALL_PROGRESS',
                        percent: porcentaje
                    });
                });
            }
        })
    );
});