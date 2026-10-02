# Auditoría del sistema — 2 de octubre de 2026

Alcance: repositorio completo en `main` (commit `2a3225c`), datos, pipeline, base de datos,
despliegue, accesibilidad y reglas de `CLAUDE.md`. Todo lo marcado «verificado» se comprobó
ejecutando el comando o leyendo el archivo; lo que no se pudo ver desde la sesión se indica.

## Resumen

| Área | Estado |
|---|---|
| Reglas de `CLAUDE.md` (1–6) | Cumplidas |
| Fórmula y ranking | Correctos (recalculados de forma independiente) |
| Datos (612 personas, 54 países) | Íntegros; un país con 9 de 10 |
| Seguridad | 1 hallazgo alto (callback de TikTok) |
| Accesibilidad / móvil / RTL | Sin fallos graves; 3 mejoras |
| Calidad del ranking | **Defecto principal:** solo YouTube puntúa |
| Documentación | Desactualizada en README y plan |

Compilación, validación y pruebas: `npm run validate` OK, `npm test` 9/9, `npm run build` 6.704 páginas,
`npm audit` 0 vulnerabilidades.

## Hallazgos

### Alta

**A1. El ranking solo se calcula con YouTube.**
Las cifras de Instagram (35 personas) y TikTok (32) vienen de enero de 2026 y la regla de 30 días
(`FORMULA.md` §8) las deja en 0 puntos. Resultado: 607 cifras vivas, todas de YouTube. Messi, Georgina
Rodríguez, Dybala, Antonela Roccuzzo y Marta Díaz no tienen ninguna red viva y quedan al final con 0
puntos aunque sumen cientos de millones de seguidores. Opciones: carga manual mensual
(`docs/REVISION_MANUAL_REDES.csv` + `npm run import-manual`), conectar las APIs oficiales de Meta y
TikTok, o revisar la regla de los 30 días para redes sin API.

**A2. Callback de TikTok sin protección de `state` ni verificación de la cuenta.**
`supabase/functions/tiktok-callback/index.ts` usa `state` directamente como `influencer_id` y guarda el
token de quien autorice, sin sesión, sin nonce y sin comprobar que la cuenta de TikTok corresponda al
perfil. Quien arme un enlace de autorización con el `state` de otra persona puede asociar su propia
cuenta de TikTok a ese perfil y sobrescribir el token legítimo, lo que alteraría las cifras del ranking.
Corrección: `state` firmado (HMAC con caducidad y nonce), exigir un reclamo aprobado en `profile_claims`
y comparar el `open_id` o el nombre de usuario con el handle del perfil.

### Media

**M1. Criterio de país no documentado.** Los lotes del 26 al 28 de septiembre incluyeron creadores por
nacionalidad aunque el canal declare otro país; los de hoy siguen ese criterio. No está escrito en
ningún documento. Debe quedar en `docs/FUENTES_DE_DATOS.md` o `docs/DESCUBRIMIENTO.md`
(hoy el texto dice que se descartan los de país distinto).

**M2. Emiratos tiene 9 de 10 perfiles.** Falta un creador emiratí con nacionalidad confirmada.

**M3. Textos de perfil sin revisión humana.** Los `topic`/`about` de los lotes de hoy (61 perfiles) se
redactaron en 10 idiomas a partir de títulos recientes, sin hablantes nativos. Conviene revisar
árabe, hindi y ruso.

**M4. Clave de YouTube compartida fuera de los secretos.** Una clave de la API se pegó en la conversación
de trabajo. Se usó y no quedó en el repositorio (verificado en todos los commits). Es un riesgo aceptado
por la persona responsable; se deja anotado.

**M5. Accesibilidad.**
- Dos `<h1>` en la portada y en las fichas de perfil (verificado en `/es/`, `/ar/`, `/en/`, `/ja/`, perfil).
- Entre 2 y 3 elementos interactivos de menos de 24 px por página en 360 px.
- Una sola regla `prefers-reduced-motion` en todo el CSS; hay que comprobar que cubra todas las animaciones.

**M6. Medición.** Cloudflare Web Analytics registra tráfico (26 vistas y 7 visitas en 24 h). La raíz `/`
y las páginas legales no llevan el script.

### Baja

- **B1. Documentación obsoleta.** `README.md` dice «40 perfiles (MX, ES, AR, CO)» y `docs/PLAN_DE_TRABAJO.md`
  habla de 40 perfiles; hoy son 612 en 54 países.
- **B2. Crecimiento del historial.** Cada instantánea pesa unos 430 KB; unos 150 MB al año en git.
  Aceptable ahora; conviene consolidar o recortar a medio plazo.
- **B3. Videos en el repositorio.** `public/videos/intro-*.mp4` suman 8,7 MB en git.
- **B4. Datos estructurados.** Las páginas no incluyen JSON-LD; mejoraría el SEO de los perfiles.
- **B5. Portada pesada.** `/es/index.html` pesa 496 KB sin comprimir.
- **B6. Dependencias.** Astro 7.3.5, dotenv 18.0.5 disponibles (menores). Mayores pendientes: Vitest 5,
  Zod 4, TypeScript 7; no urgentes.
- **B7. Sin `SECURITY.md` ni `LICENSE`.**

## Verificado y correcto

**Reglas de `CLAUDE.md`**
1. Sin scraping: las fuentes usan `googleapis.com/youtube/v3`, `graph.facebook.com` y `open.tiktokapis.com`.
   Las URL de instagram.com y tiktok.com solo se usan para armar enlaces. No hay librerías de lectura de HTML.
2. Secretos: `.env` ignorado, `.env.example` sin valores, ninguna coincidencia de claves ni tokens en
   los 81 commits; la `service_role` solo la usan el pipeline y la función de TikTok.
3. Sin tenis ni ATP: solo aparece en `CLAUDE.md`, en un comentario de `global.css` que lo prohíbe y en
   `docs/prototipo.html` (maqueta fuera del sitio). Nada en el HTML publicado.
4. Trazabilidad: 0 cifras sin `source` y `fetchedAt`; lo desactualizado está marcado `stale`.
5. Accesibilidad y móvil: sin desbordamiento horizontal a 360 px en `/es/`, `/en/`, `/ja/`, `/ar/` (RTL
   con `dir="rtl"`), perfil, país y método; enlace de salto, `:focus-visible`, `alt` en todas las imágenes,
   sin botones ni campos sin nombre. Contraste: texto 17,8:1 y texto secundario 7,5:1 sobre el fondo.
6. Fórmula: 9 pruebas pasan; recomputé los puntos de las 612 personas con la fórmula de `FORMULA.md`:
   desviación máxima 0,000; el orden mundial y la mediana de interacción (3,1525) coinciden.

**Datos**: 612 personas, 0 `channelId` duplicados, 0 nombres repetidos, 0 perfiles con idioma vacío,
54 países, 603 con tasa de interacción de YouTube. Historial diario en `data/history/`.

**Base de datos**: RLS activo en todas las tablas; votos con clave primaria (usuario, perfil, día) y política
que obliga a votar como uno mismo y el día de hoy; `creator_tokens` sin políticas (solo `service_role`).

**Despliegue**: CI valida, prueba y compila en cada PR; el despliegue se dispara al fusionar con `main`
(últimos 4 despliegues en verde); la actualización diaria corre a las 06:00 UTC con permisos mínimos y abre
una incidencia si el token de Meta está por caducar.

**SEO**: sitemap, `robots.txt`, canonical y `hreflang` en los 10 idiomas más `x-default`.

**Diseño**: el trabajo de diseño de Codex sí llegó a `main` (commit `340d0c7`: `ux-refresh.css`,
`ux-copy.json` con los 10 idiomas, sparkline, videos de perfil y transparencia de puntaje).

## Limitaciones de esta auditoría
- No se pudo abrir `fykin.com` desde la sesión; el sitio se probó compilado en local.
- No se vio el panel de Supabase ni los secretos de GitHub (solo sus nombres en los workflows).
- La revisión de accesibilidad fue automática (Chromium a 360 px), no con lector de pantalla.
- Los textos en 10 idiomas no se revisaron lingüísticamente.
