const CACHE_NAME = "auxilio-ai-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon/favicon.ico",
  "/favicon/favicon-96x96.png",
  "/favicon/favicon.svg",
  "/favicon/apple-touch-icon.png",
  "/favicon/web-app-manifest-192x192.png",
  "/favicon/web-app-manifest-512x512.png",
  "/manifest.json"
];

// Install Event - Pre-cache core assets (robust fallback)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static PWA shell assets");
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Failed to cache asset: ${asset}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing deprecated cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic caching strategies for native-like performance
self.addEventListener("fetch", (event) => {
  // Only process GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip browser extensions, internal APIs, hot module reloading (development), and WebSockets
  if (
    url.pathname.startsWith("/api") || 
    url.pathname.startsWith("/ws") || 
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.includes("hot-update") ||
    url.protocol.startsWith("chrome-extension") ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // Page navigations: Network-first, fallback to cache for offline capabilities
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone and cache it
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then(async (cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            const appShell = await caches.match("/");
            return appShell || new Response("Aplicación sin conexión.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS, Fonts, Images): Stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response("Recurso no disponible sin conexión.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Web Push Events
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push event received");
  let data = { title: "Auxilio Vial", body: "Nueva actualización del servicio" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Auxilio Vial", body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    data: {
      url: data.url || "/"
    },
    vibrate: [100, 50, 100],
    tag: data.tag || "general"
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification click received");
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and redirect
      for (const client of clientList) {
        if ("navigate" in client) {
          try {
            client.focus();
            return client.navigate(targetUrl);
          } catch (e) {
            console.error("[Service Worker] Failed to navigate existing window:", e);
          }
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

