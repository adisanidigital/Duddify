// EMERGENCY KILLSWITCH SERVICE WORKER
//
// 2026-05-13: SW caching is implicated in a production outage where the
// app fails to load on installed PWAs. This file replaces the previous
// service worker with a single-purpose script that:
//
//   1. Skips waiting and immediately activates.
//   2. Deletes every Cache Storage entry from previous SW versions.
//   3. Unregisters itself so no SW is left in control.
//   4. Tells every open client to navigate to the same URL (forcing a
//      clean reload without going through a SW).
//
// Combined with layout.tsx no longer calling navigator.serviceWorker.register
// for the time being, this restores the app to a "no service worker"
// baseline. Once we've verified the app is back up, we can re-introduce a
// safer SW design (network-first for everything, never cache JS).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          // Force every open tab to reload — this picks up the now-no-SW
          // state and the page renders from network as if freshly opened.
          try {
            client.navigate(client.url);
          } catch {}
        }
      } catch {}
    })()
  );
});

// No fetch handler — let everything go directly to the network until the
// unregister finishes propagating. After clients reload, there is no SW
// at all, so this file's behaviour is irrelevant from that point on.
