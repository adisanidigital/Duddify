// EMERGENCY KILLSWITCH SERVICE WORKER (revised — no auto-reload).
//
// The earlier version of this file forced clients to reload on activate,
// which combined with the SW registration in layout.tsx produced an
// infinite reload loop (every reload re-installed the killswitch which
// reloaded again). This revision just unregisters itself and clears
// caches — pages already open keep working until the user navigates
// naturally, at which point there is no SW at all.

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
      // Intentionally NO client.navigate() — that produced a reload loop
      // when paired with SW registration in layout.tsx. Users get the
      // fully clean state on their next manual navigation / reload.
    })()
  );
});

// No fetch handler — anything that hits this SW goes straight to the
// network. After unregister propagates, the SW is removed entirely.
