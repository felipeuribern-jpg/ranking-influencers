# Modelo de negocios y monetización

Traducción al repositorio de `Plan_de_Negocios_y_Monetizacion_Fykin_para_Claude.docx`
(preparado para Grupo Vortex, versión septiembre de 2026). Ese documento es la
fuente completa; esto resume lo que es accionable para el código y separa
**decisiones ya tomadas** de **supuestos todavía sin validar**, tal como pide el
propio documento en su sección 9 ("sin copiar supuestos como hechos confirmados").

## Tesis

Fykin no vende posiciones en el ranking. El ranking público es el motor de
descubrimiento y confianza; la monetización pasa por las herramientas de trabajo
que se construyen alrededor de él (perfiles verificados, análisis, listas,
exportaciones, patrocinios rotulados, acceso a datos).

## Decisiones ya tomadas (no requieren validación adicional)

- **Ningún pago, verificación o patrocinio modifica el puntaje, la posición ni la
  frecuencia de actualización de un perfil.** Esta regla ya está protegida por una
  prueba de integridad en `pipeline/score.test.ts` (ver abajo).
- Queda gratis para siempre: el ranking mundial y por país, la ficha pública de
  cada perfil, la metodología completa, la votación comunitaria y las
  correcciones de errores factuales.
- El voto público sigue limitado al 10 % de `puntos_redes` (`docs/FORMULA.md` §5),
  sin excepción por plan de pago.
- Todo contenido patrocinado debe llevar una etiqueta visible; no existen
  "rankings patrocinados".
- Proveedor de pagos: **sin decidir**. No se integra Stripe, Mercado Pago ni
  ningún otro sin aprobación explícita — ver "Fuera de esta entrega".

## Líneas de producto (propuesta de precios, `src/config/plans.config.ts`)

| Plan | Precio orientativo | Para quién |
|---|---|---|
| Creador Verificado | US$9,90/mes | Reclamar el perfil y confirmar datos |
| Creador Pro | US$19/mes | Historial, media kit, comparables, alertas |
| Brand Starter | US$99/mes | Marcas pequeñas: búsqueda, filtros, listas |
| Agency Pro | US$249/mes | Agencias: equipos, informes, más exportaciones |
| Enterprise / API | Desde US$750/mes | Datos, SLA, licencia, soporte |

Los precios son orientativos, no definitivos — la página `/precios` lo dice
explícitamente y no tiene checkout activo, solo una lista de espera por correo.

## Supuestos por validar (no tratar como hechos)

- RPM de publicidad, conversión a pago y disposición a pagar de creadores/marcas:
  cifras de planificación del documento original, no mediciones propias.
- Que exista una vía sostenible y permitida para actualizar las métricas de cada
  red (esto ya depende de `docs/FUENTES_DE_DATOS.md`, no de este documento).
- Que el tráfico se concentre en geografías compatibles con los RPM asumidos.
- Titularidad, DNS y protección de marca de `fykin.com` — DNS conectado esta
  sesión; falta cualquier registro marcario formal.

## Hoja de ruta (resumen)

1. **Confianza (0–3 meses):** ranking, perfiles, método, SEO, voto, analítica
   documentada, reclamo básico — esta entrega cubre la base visual y de
   configuración, no el flujo de reclamo real.
2. **Primer ingreso (4–6 meses):** Creador Verificado/Pro, historial, media kit,
   primer patrocinio.
3. **B2B (7–12 meses):** filtros, listas, equipos, exportación, informes, API
   beta.
4. **Escala (13–24 meses):** más idiomas (ya cubiertos, son 10 desde el inicio),
   API empresarial, reportes, ventas repetibles.

## Qué se construyó en esta entrega

- Rebrand visual completo a la identidad Fykin (`src/styles/global.css`,
  `src/components/Layout.astro`, `src/components/RankingRow.astro`).
- Sección "Para marcas" en la portada y página `/precios` en los 10 idiomas, sin
  checkout — el CTA es un `mailto:` a `contacto@fykin.com`.
- `src/config/plans.config.ts`: planes tipados, sin secretos.
- `src/lib/analytics.ts`: eventos documentados (`view_profile`, `vote_submitted`,
  `claim_started`, `claim_completed`, `pricing_viewed`, `checkout_started`,
  `checkout_activated`, `list_created`, `export_requested`), sin proveedor
  conectado.
- `supabase/business_model.sql`: propuesta de tablas para reclamo de perfil,
  organizaciones, suscripciones, listas guardadas, patrocinios y disputas —
  **no aplicada**, Supabase todavía no existe como proyecto real (Fase 5 del
  plan original sigue bloqueada en espera de que se cree la cuenta).

## Explícitamente fuera de esta entrega

- Cobro real (Stripe, Mercado Pago o cualquier otro) — requiere aprobación
  expresa y ni siquiera está decidido cuál usar.
- Correo transaccional, CRM o proveedor de analítica conectado.
- Flujo real de reclamo de perfil con verificación de identidad.
- Panel funcional de creador o de marca.

Antes de construir cualquiera de estos, seguir el orden que pide el documento
original: proponer un plan de cambios acotado y pedir aprobación explícita,
nunca implementar el roadmap completo de una sola vez.
