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

  // Selve siderne (HTML): netværk først, så en ny udgivelse altid slår
  // igennem med det samme for den, der har forbindelse — cachen bruges
  // kun som fallback, hvis der reelt ingen forbindelse er. Den oprindelige
  // udgave viste altid den cachede side først (ægte
  // stale-while-revalidate), hvilket betød at en ny udgivelse først slog
  // igennem ved et ANDET genbesøg, ikke det første — forvirrende for en
  // sliber, der har åbnet siden før og ikke ved, at der findes en
  // service worker.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((svar) => {
          if (svar.ok) {
            caches.open(CACHE_NAVN).then((cache) => cache.put(request, svar.clone()));
          }
          return svar;
        })
        .catch(() => caches.open(CACHE_NAVN).then((cache) => cache.match(request))),
    );
    return;
  }

  // Statiske filer (fx /_next/static/...): deres adresse indeholder et
  // indholds-hash og ændrer sig derfor aldrig for den samme fil — her er
  // det trygt at vise fra cachen først, ingen risiko for en forældet
  // udgave af netop den fil.
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
