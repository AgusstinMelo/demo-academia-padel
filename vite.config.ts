import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { business, site } from "./src/config.ts";

/** Título, descripción, Open Graph y JSON-LD a partir de src/config.ts */
function seoFromConfig(): Plugin {
  const image = `${site.hero.image}?auto=format&fit=crop&w=1200&h=630&q=70`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: business.name,
    description: business.description,
    url: business.url,
    image,
    telephone: business.phone,
    email: business.email,
    priceRange: "$$",
    currenciesAccepted: business.currency,
    address: { "@type": "PostalAddress", streetAddress: business.address.street, addressLocality: business.address.city, addressRegion: business.address.region, addressCountry: business.address.country },
    geo: { "@type": "GeoCoordinates", latitude: business.geo.lat, longitude: business.geo.lng },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "06:00", closes: "22:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "07:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "08:00", closes: "13:00" },
    ],
    sameAs: business.socials.map((s) => s.href),
  };
  const title = `${business.name} · Clases de pádel en Medellín`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  // Mismas URLs que el <img> del hero (src/public/Landing.tsx): el preload no descarga otra imagen
  const heroSrcSet = [480, 828, 1200, 1600, 2000].map((w) => `${site.hero.image}?auto=format&fit=crop&w=${w}&h=${Math.round((w * 1333) / 2000)}&q=60 ${w}w`).join(", ");
  return {
    name: "seo-from-config",
    transformIndexHtml(html) {
      return html
        .replaceAll("%TITLE%", esc(title))
        .replaceAll("%DESCRIPTION%", esc(business.description))
        .replaceAll("%URL%", business.url)
        .replaceAll("%OG_IMAGE%", esc(image))
        .replaceAll("%HERO_SRCSET%", esc(heroSrcSet))
        .replaceAll("%HERO_SRC%", esc(`${site.hero.image}?auto=format&fit=crop&w=1200&h=800&q=60`))
        .replaceAll("%HERO_ALT%", esc(site.hero.imageAlt))
        .replaceAll("%HERO_EYEBROW%", esc(site.hero.eyebrow))
        .replaceAll("%HERO_TOP%", esc(site.hero.titleTop))
        .replaceAll("%HERO_ROTATING%", esc(site.hero.rotating[0]))
        .replaceAll("%HERO_BOTTOM%", esc(site.hero.titleBottom))
        .replaceAll("%HERO_SUBTITLE%", esc(site.hero.subtitle))
        .replaceAll("%HERO_CTA%", esc(site.hero.cta))
        .replaceAll("%HERO_SECONDARY%", esc(site.hero.secondary))
        .replaceAll("%DEMO_BANNER%", esc(business.demoBanner))
        .replaceAll("%BRAND_1%", esc(business.name.split(" ")[0]))
        .replaceAll("%BRAND_2%", esc(business.name.split(" ")[1] ?? ""))
        .replace("%JSON_LD%", JSON.stringify(jsonLd).replace(/</g, "\\u003c"));
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    seoFromConfig(),
    VitePWA({
      // Service worker propio (src/sw.ts): app offline, página offline y manejadores de Web Push
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: "script-defer", // el registro no bloquea el primer pintado
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "badge-96.png", "offline.html"],
      // iife: service worker como script clásico (máxima compatibilidad)
      injectManifest: { rollupFormat: "iife", globPatterns: ["**/*.{js,css,html,woff2,svg,png}"], maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 },
      manifest: {
        id: "/app",
        name: `${business.name} · Academia de pádel`,
        short_name: business.shortName,
        description: "Reserva clases, compra packs y recibe recordatorios de tu academia de pádel.",
        lang: "es-CO",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#080c18",
        background_color: "#080c18",
        categories: ["sports", "lifestyle"],
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Reservar clase", url: "/app/alumno/reservar", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
          { name: "Mis reservas", url: "/app/alumno/reservas", icons: [{ src: "/pwa-192.png", sizes: "192x192" }] },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Librerías en chunks propios (se cachean entre despliegues)
        codeSplitting: {
          groups: [
            { name: "charts", test: /node_modules[\\/](recharts|d3-|victory-vendor|@reduxjs|immer|reselect|es-toolkit|react-redux|use-sync-external-store)/ },
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
});
