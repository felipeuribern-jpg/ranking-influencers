# Fuentes de datos

Antes de implementar cada integración, **consulta la documentación oficial vigente**:
los permisos, cuotas y nombres de campos de estas APIs cambian con frecuencia.
Lo que sigue es el diseño previsto; confirma cada punto marcado con (verificar).

## Resumen

| Red | Vía | Automática | Coste | Interacción |
|---|---|---|---|---|
| YouTube | YouTube Data API v3 | Sí | Gratis (cuota diaria) | Sí |
| Instagram | Instagram Graph API · Business Discovery | Sí, para cuentas profesionales | Gratis | Sí |
| Facebook | Graph API de páginas | Sí, para páginas públicas | Gratis | Parcial (verificar permisos) |
| TikTok | Login Kit + Display API (el creador autoriza) | Sí, tras vincular | Gratis | Sí |
| LinkedIn | Manual (`data/manual.json`) | No | — | No |
| Snapchat | Manual (`data/manual.json`) | No | — | No |

## YouTube

- Clave de API de Google Cloud (proyecto propio, API «YouTube Data API v3» activada).
- Secreto: `YOUTUBE_API_KEY`.
- Resolver el canal: `handles.youtube` puede ser `@handle` o `channelId`.
  Si es handle, usar `channels.list` con `forHandle` (verificar) y guardar el `channelId`
  resultante en `data/resolved.json` para no gastar cuota cada día.
- Datos: `channels.list` (part=statistics,contentDetails) → suscriptores.
  Playlist de subidas → últimos vídeos → `videos.list` (part=statistics) → vistas,
  me gusta, comentarios.
- Presupuesto de cuota: ~3 unidades por canal y día. Documenta el cálculo en el código.
- Si un canal oculta el número de suscriptores, `followers = null` para esa red.

## Instagram

- Requiere una cuenta profesional propia de Instagram vinculada a una página de Facebook
  y una app de Meta. Token de larga duración.
- Secretos: `IG_BUSINESS_ACCOUNT_ID`, `META_ACCESS_TOKEN`.
- Business Discovery sobre `handles.instagram` → `followers_count`, `media_count` y las
  últimas publicaciones con `like_count` y `comments_count`.
- Solo funciona con cuentas profesionales (casi todos los creadores lo son).
  Si la cuenta es personal o no existe, registrar el error y mantener el último valor.
- El token de larga duración caduca: crea una Action mensual que lo renueve
  o una alerta (issue automático) 7 días antes de caducar. (verificar duración vigente)
- Respetar límites de llamadas: procesar en lotes con pausa y reintentos exponenciales.

## Facebook

- Mismo token de Meta. Para páginas públicas: `followers_count` / `fan_count`.
- Leer publicaciones de páginas ajenas puede requerir el permiso
  «Page Public Content Access» con revisión de Meta (verificar). Si no se obtiene,
  Facebook puntúa solo por seguidores (`er = null`).

## TikTok

- La API de investigación de TikTok está restringida a investigadores; no usarla.
- Vía prevista: el creador entra en «Soy este creador», inicia sesión con TikTok
  (Login Kit) y autoriza los permisos de lectura de perfil, estadísticas y vídeos
  (verificar nombres de *scopes*: `user.info.stats`, `video.list`).
- Guardar el *refresh token* cifrado en Supabase (tabla `creator_tokens`, solo accesible con
  `service_role`). El pipeline lo usa para leer `follower_count` y las métricas de vídeos.
- Mientras un creador no vincule su cuenta, TikTok usa el último dato de
  `baseline` o `manual.json`, marcado como desactualizado según `FORMULA.md` §8.
- La app de TikTok necesita revisión de la plataforma antes de salir a producción.

## Manual (LinkedIn, Snapchat y respaldos)

`data/manual.json`: `{ id, platform, followers, er?, source, date }`.
El pipeline lo trata igual que cualquier otra fuente, con la misma regla de caducidad.

## Datos base

`data/influencers.json` contiene 40 perfiles (México, España, Argentina y Colombia) con
seguidores de enero de 2026 tomados de los rankings por país de TreceBits (`baseline`).
**Los handles no están verificados** (`handlesVerified: false`), salvo algunos de Instagram
que también requieren confirmación.

### Verificación automática de YouTube (`pipeline/resolve-youtube.ts`)

En vez de abrir cada perfil a mano (como decía la versión original de este documento),
el handle de YouTube de 35 de los 40 perfiles se resolvió con una herramienta de un
solo uso: busca el nombre con `search.list` y solo acepta el canal candidato cuyo
número de suscriptores actual está a ±35 % del `baseline.followers.youtube` ya
cargado — así no se asigna un canal al azar (CLAUDE.md #4). Los 5 restantes no
tienen baseline de YouTube (su presencia principal es TikTok/Instagram) y quedan
sin resolver para revisión manual si corresponde. No se marcó `handlesVerified:
true`: ese campo sigue significando "las redes del perfil están confirmadas", y
solo se confirmó YouTube, no las demás. Ejecutar de nuevo con
`npx tsx pipeline/resolve-youtube.ts` si se agregan perfiles nuevos sin handle.

## Supabase: secretos

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (navegador).
- `SUPABASE_SERVICE_ROLE_KEY` (solo pipeline, en GitHub Secrets).
