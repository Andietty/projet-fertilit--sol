const CACHE_NAME = "agrosol-cache-v1";
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
  // Ignorer les requêtes d'API vers l'ESP32 local ou serveur externe
  if (event.request.url.includes("/api/")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
