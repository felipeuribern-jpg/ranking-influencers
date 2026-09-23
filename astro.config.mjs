// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { siteConfig } from "./site.config.ts";

// GitHub Pages sirve el sitio en /ranking-influencers/ hasta que se conecte un
// dominio propio (docs/PLAN_DE_TRABAJO.md Fase 4, paso [usuario]). Cuando eso
// pase, `site` cambia al dominio y `base` vuelve a "/".
export default defineConfig({
  site: "https://felipeuribern-jpg.github.io",
  base: "/ranking-influencers",
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
