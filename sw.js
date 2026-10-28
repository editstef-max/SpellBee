// Offline support: serve the app from the cache, refresh the cache in the background.
// Bump VERSION whenever you change any file so phones pick up the new version.
const VERSION = "spellbee-2";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "words.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the browser's own HTTP cache so we really get the new files.
  const requests = FILES.map((f) => new Request(f, { cache: "reload" }));
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
