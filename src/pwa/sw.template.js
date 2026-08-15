/* eslint-disable no-undef */
/**
 * SPILL service worker.
 *
 * Generated at build time by the `spill:service-worker` integration in
 * astro.config.mjs — the version string and precache list below are injected.
 */

const VERSION = '__SW_VERSION__';
const CACHE = `spill-${VERSION}`;
const PRECACHE = "__SW_PRECACHE__";

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll() is atomic — one 404 would abort the whole install and leave the
      // app without an offline copy, so entries are added individually.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (response.ok) await cache.put(url, response);
          } catch {
            /* a single missing asset must not break installation */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('spill-') && key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/**
 * Cache lookup for precached assets.
 *
 * `ignoreVary` is essential, not incidental. Static hosts commonly send
 * `Vary: Origin`, and the precache is populated by fetches from the worker,
 * which carry no `Origin` header. A module script requested by the page *does*
 * send one — so without this, `<script type="module">` misses the cache and the
 * app is a blank screen offline, while stylesheets (no Origin) still work.
 *
 * `ignoreSearch` covers the icons, which are requested with a `?v=` fingerprint
 * but precached at their bare path. It is safe across the board here because
 * every other asset is content-hashed in its filename and carries no query.
 */
function matchPrecache(request) {
  return caches.match(request, { ignoreVary: true, ignoreSearch: true });
}

/**
 * Navigations: network first so a fresh deploy is picked up, falling back to the
 * cached shell when offline. Everything else: cache first, since Astro's assets
 * are content-hashed and therefore immutable.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cached = (await matchPrecache(request)) || (await matchPrecache('/index.html'));
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await matchPrecache(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh.ok && fresh.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        return Response.error();
      }
    })(),
  );
});
