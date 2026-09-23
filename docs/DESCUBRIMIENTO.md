# Descubrimiento automático de personas nuevas

`docs/ESPECIFICACION.md` deja el descubrimiento automático fuera de la v1 original
("se añaden por pull request a `data/influencers.json`"). A pedido explícito del
usuario ("quiero que el sistema funcione completo por sí solo"), se amplía el
alcance para automatizarlo — pero sin romper la regla no negociable #1 de
`CLAUDE.md`: **nada de scraping, solo APIs oficiales**.

## Qué se puede automatizar y qué no

La única red con una API pública de **búsqueda** de perfiles ajenos es YouTube
(`search.list`). El resto de las redes no ofrece forma de descubrir gente nueva sin
leer HTML de perfiles (scraping), que está prohibido:

| Red | Descubrimiento de gente nueva | Por qué |
|---|---|---|
| YouTube | **Sí**, automático | `search.list` es una API pública de búsqueda |
| Instagram | Solo **verificación**, no descubrimiento | Business Discovery necesita saber el `username` de antemano; no busca por tema |
| Facebook | Solo **verificación**, no descubrimiento | Igual que Instagram: hay que saber el nombre de la página |
| TikTok | No | Sin API pública de lectura de terceros; requiere que el propio creador vincule su cuenta (Login Kit, Fase 7) |
| LinkedIn / Snapchat | No | Sin API pública para esto, punto — se mantienen 100 % manuales en `data/manual.json`, como ya establecía el diseño original |

## Cómo funciona (`pipeline/discover.ts`)

1. `DISCOVERY_QUERIES` define combinaciones de país + tema a buscar (arrancamos
   con MX/ES/AR/CO, los mismos países de los 40 perfiles base; se puede ampliar).
2. Por cada combinación, `search.list` (YouTube) trae canales candidatos.
3. Se descarta cualquier canal cuyo `channelId` ya esté en `data/resolved.json`
   (persona que ya está en el ranking).
4. Del canal candidato se lee su descripción oficial (`channels.list`, campo
   `snippet.description`) — texto que el propio creador publicó a través de la
   API, no HTML de un perfil ajeno — y se extraen con expresiones regulares los
   enlaces a Instagram/TikTok/Facebook/LinkedIn/Snapchat que haya puesto ahí.
5. Si aparece un handle de Instagram y ya está configurado `META_ACCESS_TOKEN`, se
   verifica al instante con Business Discovery (consultar por `username` una
   cuenta profesional ajena es un uso soportado de esa API).
6. Un candidato solo se guarda si sus seguidores de YouTube superan
   `AUTO_DISCOVERY_MIN_FOLLOWERS` (`pipeline/config.ts`) — evita ruido.
7. El candidato se agrega a **`data/candidates.json`** (no a `influencers.json`).

## Por qué hay una cola (`data/candidates.json`) en vez de entrar directo

Cada persona en `data/influencers.json` necesita `topic` y `about` traducidos a
los 10 idiomas (`IDIOMAS.md`). Ninguna API oficial provee ese texto — es contenido
editorial, no un dato verificable. Ningún proceso puede automatizar redactar una
descripción de calidad sin inventar información, y `CLAUDE.md` regla #4 prohíbe
inventar datos.

Por eso `data/candidates.json` guarda lo que sí es 100 % verificable y automático
(seguidores, handles, país, fragmento de la descripción oficial de YouTube), y
queda pendiente `needsContent: true` hasta que alguien —Felipe, o Claude cuando se
le pida— le escriba `topic`/`about` en los 10 idiomas y lo mueva a
`data/influencers.json` con `discoveredAuto: true`. Esa es la única parte del
proceso de "agregar gente nueva" que sigue necesitando una revisión de contenido,
por diseño del proyecto (nada inventado, todo trazable), no por una limitación
técnica evitable.

Una vez en `data/influencers.json`, esa persona entra al pipeline diario normal:
sus métricas se actualizan solas para siempre, igual que las de los 40 perfiles
base.

## Cuota de YouTube

`search.list` cuesta 100 unidades por llamada (muy caro frente a las ~3 unidades
de una actualización normal de canal). Con la cuota gratuita diaria (10.000
unidades) y las 4 búsquedas de `DISCOVERY_QUERIES`, el descubrimiento usa ~400
unidades/día — deja margen de sobra para actualizar decenas de canales existentes
el mismo día. Si se amplía la lista de búsquedas, revisar este presupuesto.
