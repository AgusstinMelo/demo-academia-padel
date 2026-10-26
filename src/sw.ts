/// <reference lib="webworker" />
// Service worker de ÉLITE PÁDEL (lo compila vite-plugin-pwa con la estrategia injectManifest).
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute, setCatchHandler } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

// 1. Precarga de la app (HTML, JS, CSS, fuentes, íconos y offline.html)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

// 2. Navegación: siempre responde el app shell, así la app abre sin conexión
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

// 3. Fotos de Unsplash: caché primero, máx. 60 imágenes por 30 días
registerRoute(
  ({ url }) => url.origin === "https://images.unsplash.com",
  new CacheFirst({ cacheName: "images", plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 })] }),
);

// 4. Si algo falla sin conexión y no está en caché: página offline para documentos
setCatchHandler(async ({ request }) => {
  if (request.destination === "document") return (await matchPrecache("/offline.html")) ?? Response.error();
  return Response.error();
});

// 5. Web Push (fase 2). El servidor envía JSON { title, body, url }.
self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data?.json() ?? {};
    } catch {
      return { body: event.data?.text() };
    }
  })() as { title?: string; body?: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(data.title ?? "ÉLITE PÁDEL", {
      body: data.body,
      icon: "/pwa-192.png",
      badge: "/badge-96.png",
      data: { url: data.url ?? "/app" },
    }),
  );
});

// Al tocar la notificación: enfoca la app abierta o la abre en la URL indicada
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).pathname.startsWith("/app"));
      return open ? open.focus().then((c) => c.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
