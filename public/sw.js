// Håndskrevet service worker, ingen Workbox. Den cacher kun sider og
// statiske filer (stale-while-revalidate), så scannersiden kan åbnes igen
// uden forbindelse, efter den er besøgt én gang med forbindelse. Selve
// slibningerne går gennem IndexedDB-køen i lib/klient, ikke gennem denne
// cache.
const CACHE_NAVN = "slibekort-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((navne) =>
        Promise.all(
          navne.filter((navn) => navn !== CACHE_NAVN).map((navn) => caches.delete(navn)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;
  if (request.url.includes("/api/")) return;

  event.respondWith(
    caches.open(CACHE_NAVN).then(async (cache) => {
      const cached = await cache.match(request);
      const netvaerk = fetch(request)
        .then((svar) => {
          if (svar.ok) cache.put(request, svar.clone());
          return svar;
        })
        .catch(() => cached);

      return cached ?? netvaerk;
    }),
  );
});
