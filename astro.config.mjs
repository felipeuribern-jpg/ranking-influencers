// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { siteConfig } from "./site.config.ts";

// Dominio propio conectado (docs/PLAN_DE_TRABAJO.md Fase 4): fikin.com,
// comprado en Dynadot. DNS y "custom domain" de GitHub Pages configurados desde
// aquí; hasta que el DNS propague, el sitio sigue accesible también en
// https://felipeuribern-jpg.github.io/ranking-influencers/.
export default defineConfig({
  site: "https://fikin.com",
  base: "/",
  trailingSlash: "always",
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: siteConfig.defaultLanguage,
        locales: Object.fromEntries(siteConfig.languages.map((l) => [l, l])),
      },
    }),
  ],
});
