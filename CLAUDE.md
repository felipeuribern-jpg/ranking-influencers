# CLAUDE.md — Ranking mundial de influencia en redes

Lee este archivo completo antes de escribir código. Después lee, en este orden:
`docs/ESPECIFICACION.md`, `docs/FORMULA.md`, `docs/FUENTES_DE_DATOS.md`,
`docs/ARQUITECTURA.md`, `docs/IDIOMAS.md` y `docs/PLAN_DE_TRABAJO.md`.

## Qué es

Un sitio web público que clasifica a las personas más influyentes en redes sociales:
un top 10 por país y un ranking mundial. Cada perfil explica de qué habla la persona y
enlaza a la red donde tiene más seguidores. Los visitantes pueden dar «me gusta», y eso
suma (con tope) a la posición. Los datos se actualizan solos cada día.

`docs/prototipo.html` es la maqueta funcional hecha en Claude. Sirve como referencia de
diseño y de comportamiento, pero su código de datos (`claude.use("db")`) NO se reutiliza.

## Nombre de la marca

Todavía no está decidido. Todo texto de marca sale de `site.config.ts`
(`brandName`, `domain`, `tagline`). No escribas el nombre a mano en ningún otro sitio.

## Stack (decidido, no cambiar sin preguntar)

- **Sitio:** Astro (salida estática) + TypeScript, desplegado en GitHub Pages.
  Una ruta por idioma (`/es/`, `/en/`, …) para SEO.
- **Actualización diaria:** script Node/TypeScript en `pipeline/` ejecutado por
  GitHub Actions (cron diario). Escribe JSON en `data/` y hace commit.
- **Votos:** Supabase (plan gratuito): Postgres + Auth con Google + RLS.
- **Historial:** instantáneas diarias en `data/history/AAAA-MM-DD.json` (git es la base de datos).

## Reglas que no se negocian

1. **Nada de scraping.** Solo APIs oficiales y permitidas. Si una red no tiene API
   gratuita (LinkedIn, Snapchat), el dato se mantiene a mano en `data/manual.json`.
   No uses librerías que lean HTML de perfiles de TikTok, Instagram, LinkedIn ni Snapchat.
2. **Secretos solo en GitHub Secrets / variables de entorno.** Nunca en el repo.
   La clave `service_role` de Supabase solo la usa el pipeline, nunca el navegador.
3. **Sin referencias al tenis ni al ATP** en textos, nombres de variables visibles o UI.
4. **Los datos deben poder rastrearse:** cada cifra guarda `source` y `fetchedAt`.
   Si una llamada falla, se conserva el último valor válido y se marca como desactualizado;
   nunca se inventa ni se pone a cero.
5. **Accesibilidad y móvil primero:** navegación por teclado, contraste AA,
   `prefers-reduced-motion`, diseño correcto a 360 px de ancho y en árabe (RTL).
6. La fórmula de `docs/FORMULA.md` es la fuente de verdad. Implementa sus pruebas
   (`pipeline/score.test.ts`) antes que el resto del pipeline.

## Comandos esperados (créalos)

- `npm run dev` — sitio en local.
- `npm run build` — build estático.
- `npm run pipeline` — ejecuta la actualización completa en local (usa `.env`).
- `npm run pipeline -- --dry-run` — calcula sin escribir archivos.
- `npm test` — pruebas de fórmula, validación de datos y traducciones.
- `npm run validate` — falla si falta una traducción, un país inválido o un campo obligatorio.

## Estilo de código

TypeScript estricto. Funciones puras para el cálculo. Nada de dependencias pesadas si hay
alternativa nativa. Commits pequeños y descriptivos. Pregunta antes de añadir un servicio de
pago o cambiar el stack.
