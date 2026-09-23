# Plan de trabajo

Trabaja en orden. Cada tarea termina con pruebas en verde y un commit.
Pregunta al usuario cuando una tarea diga **[usuario]**.

## Fase 0 · Base del proyecto
1. Crear el proyecto Astro + TypeScript, `site.config.ts` con `brandName: "Por definir"`.
2. Configurar `npm test`, `npm run validate` y el workflow `ci.yml`.
   **Hecho cuando:** `npm test` pasa en GitHub Actions en un PR vacío.

## Fase 1 · Datos
1. Añadir el campo `handles` verificado de los 40 perfiles. **[usuario]** Confirmar cada
   handle abriendo el perfil real; poner `handlesVerified: true` solo cuando esté confirmado.
2. Traducir `topic` y `about` de los 40 perfiles a los 10 idiomas (`IDIOMAS.md`).
3. `pipeline/validate.ts`: esquema de `influencers.json`, países ISO válidos, ids únicos,
   traducciones completas.
   **Hecho cuando:** `npm run validate` pasa y detecta un perfil sin traducción.

## Fase 2 · Fórmula
1. `pipeline/config.ts` con pesos y constantes de `FORMULA.md`.
2. `pipeline/score.ts` + `score.test.ts` con todos los casos de la sección «Pruebas».
   **Hecho cuando:** las 8 pruebas pasan.

## Fase 3 · Fuentes automáticas
1. YouTube (`sources/youtube.ts`), con caché de `channelId` en `resolved.json`.
2. Instagram (`sources/instagram.ts`) vía Business Discovery. **[usuario]** Crear la
   cuenta profesional, la página de Facebook y la app de Meta; guardar secretos.
3. Facebook (`sources/facebook.ts`).
4. `sources/manual.ts` para `data/manual.json`.
5. `pipeline/run.ts` con reintentos, `--dry-run`, regla de datos desactualizados e
   instantánea diaria en `data/history/`.
   **Hecho cuando:** `npm run pipeline -- --dry-run` produce un `ranking.json` válido
   con datos reales de YouTube para al menos 30 perfiles.

## Fase 4 · Sitio
1. Páginas de `ESPECIFICACION.md` leyendo `data/ranking.json`, en los 10 idiomas.
   Usa `docs/prototipo.html` como referencia visual (paleta, tipografía, filas del ranking),
   sin textos de tenis.
2. SEO: `hreflang`, Open Graph por perfil, `sitemap.xml`.
3. `deploy.yml` a GitHub Pages. **[usuario]** Conectar el dominio `.com` cuando se compre.
   **Hecho cuando:** el sitio se ve bien a 360 px en `es` y en `ar` (RTL) y pasa Lighthouse
   accesibilidad ≥ 95.

## Fase 5 · Votos
1. **[usuario]** Crear el proyecto de Supabase y activar Google como proveedor de inicio de sesión.
2. Aplicar `supabase/schema.sql`; botón «Me gusta» con estado «ya votaste hoy».
3. El pipeline lee `vote_counts_30d` y aplica `puntos_publico`.
   **Hecho cuando:** un segundo voto del mismo usuario el mismo día es rechazado por la
   base de datos (prueba de integración).

## Fase 6 · Automatización diaria
1. `update.yml` (cron 06:00 UTC + ejecución manual), commit de datos y aviso por issue si falla.
2. Renovación o alerta de caducidad del token de Meta.
   **Hecho cuando:** tres ejecuciones diarias seguidas terminan sin intervención.

## Fase 7 · Creadores (TikTok)
1. **[usuario]** Registrar la app en TikTok for Developers y pedir la revisión.
2. Página «Soy este creador»: Login Kit, guardado cifrado del token, verificación de que el
   usuario de TikTok coincide con `handles.tiktok` del perfil.
3. `sources/tiktok.ts` usando los tokens vinculados.
