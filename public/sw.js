// Service worker — offline-first, but never blocks the user on stale code.
//
// Strategy:
//  - HTML: network-first, falls back to cached shell when offline.
//  - _next/static/* and _next/image: BYPASS the SW entirely. Filenames are
//    content-hashed by Next.js so the browser HTTP cache handles them
//    correctly; serving them from the SW just risks pinning an old build's
//    chunks across deploys ("the app is stuck on a grey grid screen" bug).
//  - Other static assets (icons, manifest): stale-while-revalidate.
//  - Cross-origin (Supabase, Google): never cache.
//
// CACHE name MUST be bumped whenever the SW strategy or app shell changes,
// so the activate step purges the old cache and existing PWAs pull the
// fresh code.

const CACHE = "duddify-v3-2026-05-13";
const APP_SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {}))
  );
  // Take over from any older waiting worker immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Tell any open tabs that we activated so they can self-reload once
      // and pick up the fresh JS chunks.
      const all = await self.clients.matchAll({ type: "window" });
      for (const client of all) {
        try {
          client.postMessage({ type: "SW_ACTIVATED" });
        } catch {}
      }
    })()
  );
});

// Allow pages to ask a freshly-installed SW to skip the waiting state.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache cross-origin (Supabase, Google) — let network handle.
  if (url.origin !== location.origin) return;

  // Bypass SW entirely for hashed Next.js bundles and the image optimiser.
  // The browser HTTP cache handles these perfectly via Cache-Control headers.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // Other same-origin static assets (icons, manifest, etc.)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetcher = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetcher;
    })
  );
});
