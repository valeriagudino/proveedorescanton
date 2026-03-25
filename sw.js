// ── Service Worker — Feria China PWA ─────────────────────────────────────
// Versión: incrementar este número para forzar actualización de caché
var CACHE_NAME = 'feria-china-v1';

// Archivos que se guardan en caché para uso offline
var ARCHIVOS = [
  '/proveedorescanton/',
  '/proveedorescanton/index.html',
  '/proveedorescanton/manifest.json'
];

// ── Instalación: guardar archivos en caché ────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARCHIVOS);
    }).then(function() {
      // Activarse inmediatamente sin esperar a que se cierre la pestaña
      return self.skipWaiting();
    })
  );
});

// ── Activación: limpiar cachés viejas ─────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: estrategia "cache first, network fallback" ─────────────────────
// Si hay caché → responde desde caché (funciona offline)
// Si no hay caché → intenta la red
// Esto garantiza que la app funcione sin internet una vez instalada
self.addEventListener('fetch', function(e) {

  // Las peticiones al Apps Script (sync) van siempre a la red
  // No interferir con el fetch de sincronización
  if(e.request.url.includes('script.google.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if(cached) {
        // Tenemos caché — devolver inmediatamente
        // En paralelo, intentar actualizar la caché en background
        var networkFetch = fetch(e.request).then(function(response) {
          if(response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {
          // Sin red — no pasa nada, ya tenemos caché
        });
        return cached;
      }

      // No hay caché — ir a la red
      return fetch(e.request).then(function(response) {
        if(!response || response.status !== 200) {
          return response;
        }
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        // Sin red y sin caché — mostrar página de error mínima
        return new Response(
          '<html><body style="font-family:sans-serif;text-align:center;padding:3rem">' +
          '<h2>Sin conexión</h2>' +
          '<p>Abrí la app una vez con internet para instalarla.</p>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});
