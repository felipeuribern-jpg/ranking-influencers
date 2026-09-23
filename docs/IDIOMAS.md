# Idiomas

## Idiomas de la primera versión

| Código | Idioma | Dirección |
|---|---|---|
| es | Español (idioma base) | LTR |
| en | Inglés | LTR |
| pt | Portugués | LTR |
| fr | Francés | LTR |
| de | Alemán | LTR |
| ru | Ruso | LTR |
| ar | Árabe | **RTL** |
| hi | Hindi | LTR |
| zh | Chino simplificado | LTR |
| ja | Japonés | LTR |

## Qué se traduce

1. **Interfaz:** `i18n/{codigo}.json`, con claves idénticas en todos los archivos.
   `npm run validate` falla si falta una clave en cualquier idioma.
2. **Contenido de cada perfil:** `topic` y `about` en `data/influencers.json` son objetos
   `{ "es": "...", "en": "...", ... }`. Hoy solo existe `es`; la tarea 2 del plan es
   traducir los 40 perfiles a los otros nueve idiomas.
3. **Nombres de países:** usa `Intl.DisplayNames` del navegador/Node, no los traduzcas a mano.
4. **Números y fechas:** `Intl.NumberFormat` (con notación compacta: «83,8 M», «83.8M»,
   «8380万») y `Intl.DateTimeFormat` según el idioma.

Los nombres propios de personas y de redes no se traducen.

## Reglas de traducción

- Tono claro y neutro, sin jerga local; frases cortas.
- Mantén la misma longitud aproximada; revisa que nada se corte a 360 px.
- «Me gusta» se traduce por el término nativo habitual de cada idioma
  (Like, Curtir, J'aime, Gefällt mir, Нравится, أعجبني, पसंद, 点赞, いいね).
- Al añadir un perfil nuevo, es obligatorio incluir las 10 traducciones.

## Técnica

- Rutas `/{codigo}/...` generadas estáticamente por Astro, con `hreflang` y `canonical`.
- En `/`, redirección según `navigator.languages` al idioma soportado más cercano
  (por defecto `es`), guardando la elección en `localStorage`.
- `<html lang dir>` correctos. Para árabe usa propiedades lógicas de CSS
  (`margin-inline-start`, `padding-inline`, etc.) para que el diseño se invierta solo.
  Las flechas de movimiento ▲▼ no se invierten.
- Tipografías con respaldo para devanagari, árabe, chino y japonés
  (por ejemplo Noto Sans en sus variantes).
