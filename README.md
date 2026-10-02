# Fykin — ranking mundial de influencia en redes

Sitio web público que clasifica a las personas más influyentes en redes sociales: un top 10 por país
y un ranking mundial, con fichas en 10 idiomas. Los datos se actualizan solos cada día.
Las reglas del proyecto están en `CLAUDE.md`; empieza por ahí.

## Estado

- 612 personas en 54 países; textos de cada ficha en 10 idiomas (`es`, `en`, `pt`, `fr`, `de`, `ru`, `ar`, `hi`, `zh`, `ja`).
- Sitio estático con Astro y TypeScript, desplegado en GitHub Pages (`https://fykin.com`).
- Actualización diaria con GitHub Actions (`.github/workflows/update.yml`, 06:00 UTC).
- Votos y vínculo de TikTok con Supabase (Postgres, Auth y Edge Functions).

## Dónde está cada cosa

- `docs/` — especificación, fórmula, fuentes de datos, arquitectura, idiomas, plan y auditorías
  (`docs/AUDITORIA-2026-10-02.md`).
- `data/influencers.json` — catálogo de personas (fuente editorial: país, textos y handles).
- `data/ranking.json` y `data/history/` — resultado diario y su historial.
- `data/manual.json` — cifras cargadas a mano (LinkedIn, Snapchat y redes sin API).
- `data/candidates.json` — cola de candidatos descubiertos, pendientes de revisión.
- `pipeline/` — cálculo de la fórmula (`score.ts`) y lectura de fuentes oficiales.
- `supabase/` — esquema, políticas RLS y Edge Functions.
- `i18n/` — textos de la interfaz.

## Comandos

- `npm run dev` — sitio en local · `npm run build` — build estático.
- `npm run pipeline` — actualización completa (usa `.env`; `-- --dry-run` calcula sin escribir).
- `npm test` — fórmula, estado firmado de TikTok y validación de datos.
- `npm run validate` — falla si falta una traducción, un país inválido o un campo obligatorio.
- `npm run import-manual -- docs/REVISION_MANUAL_REDES.csv "Nombre"` — carga cifras revisadas a mano.

Secretos: solo en GitHub Secrets y en los secretos de las Edge Functions; nunca en el repo
(ver `.env.example` y `SECURITY.md`).
