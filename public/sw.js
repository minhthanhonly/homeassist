const CACHE_NAME = "home-assist-v2";
const APP_SHELL = ["/", "/login", "/dashboard", "/manifest.webmanifest", "/icons/icon-192.svg"];

function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((path) =>
          cache.add(path).catch(() => {
            /* ignore individual prefetch failures (e.g. dev / cold start) */
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  if (!isCacheableRequest(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          void caches.open(CACHE_NAME).then((cache) => {
            if (isCacheableRequest(event.request)) {
              return cache.put(event.request, cloned);
            }
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/dashboard"))),
  );
});
