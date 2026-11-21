const CACHE_NAME = "agrosol-cache-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/agronomy_engine.js",
  "./js/storage_service.js",
  "./js/esp32_simulator.js",
  "./js/ble_service.js",
  "./js/wifi_service.js",
  "./js/app.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes vers l'ESP32 local ou requêtes non-GET
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
    return;
  }

  // Network-First avec fallback Cache (garantit les mises à jour immédiates en ligne)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
