self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force le SW à prendre le contrôle immédiatement
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      // Supprime TOUS les caches pour éviter les vieux index.html cassés
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      // Désenregistre le service worker
      self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Contourne le cache et va lire sur le réseau
  event.respondWith(fetch(event.request));
});
