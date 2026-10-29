const CACHE_PREFIX = "de-moda-pwa-";
const CACHE_VERSION = "v1";
const SHELL_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/product-fallback.js",
  "./data/products.json",
  "./assets/favicon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/hero-model.jpg",
  "./assets/products/panty-01.jpg",
  "./assets/products/panty-02.jpg",
  "./assets/products/panty-03.jpg",
  "./assets/products/panty-04.jpg",
  "./assets/products/panty-05.jpg",
  "./assets/products/panty-06.jpg",
  "./assets/products/panty-07.jpg",
  "./assets/products/panty-08.jpg",
  "./assets/products/brasier-01.jpg",
  "./assets/products/brasier-02.jpg",
  "./assets/products/brasier-03.jpg",
  "./assets/products/brasier-04.jpg",
  "./assets/products/brasier-05.jpg",
  "./assets/products/brasier-06.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;
  const isNavigation = request.mode === "navigate";
  const isRefreshableAsset = /\.(?:html|css|js|json|webmanifest)$/i.test(pathname);

  if (isNavigation || isRefreshableAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request) || await cache.match("./index.html");
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    } catch (error) {
      return new Response("Recurso no disponible sin conexión.", { status: 503, statusText: "Offline" });
    }
  })());
});
