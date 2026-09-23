# Especificación funcional

## Público

Cualquier persona que quiera saber quién influye más en redes, en su país y en el mundo.
Uso mayoritario desde el móvil.

## Páginas

### 1. Ranking mundial (portada)
- Lista de todas las personas ordenadas por puntos totales (se muestran las 100 primeras,
  con «Ver más»).
- Cada fila: posición, movimiento frente a ayer (▲n, ▼n, =, «nuevo»), bandera, nombre,
  tema, red principal, puntos y número de «me gusta» de los últimos 30 días.
- Filtros: por tema y por red principal.
- La primera posición tiene un tratamiento visual destacado.

### 2. Por país
- Selector de país (solo países con datos) y top 10 de ese país.
- URL propia por país: `/{idioma}/pais/{codigo}` (por ejemplo `/es/pais/mx`).

### 3. Perfil de cada persona
- URL: `/{idioma}/p/{id}`.
- Posición mundial y en su país, puntos, desglose de puntos por red.
- «De qué habla»: tema y descripción traducidos.
- Por cada red: seguidores, interacción (o «sin dato»), crecimiento a 30 días,
  fecha de la última actualización y fuente.
- Botón principal: «Ver en {red}» hacia la red con más seguidores.
- Botón «Me gusta» (ver votos).
- Gráfico pequeño de evolución de puntos (últimos 90 días) a partir de `data/history/`.
- Etiquetas Open Graph para que el perfil se vea bien al compartirlo.

### 4. Cómo se calcula
- Explicación en lenguaje llano de `docs/FORMULA.md`, con los pesos de cada red.
- Lista de fuentes y fecha de la última actualización general.

### 5. Soy este creador
- Página donde un creador inicia sesión con TikTok (Login Kit) para vincular su cuenta.
  Así se obtienen sus datos de TikTok de forma autorizada. Ver `FUENTES_DE_DATOS.md`.
- También permite pedir correcciones (formulario que abre un *issue* de GitHub o guarda
  la petición en Supabase).

## Votos («me gusta»)

- Requiere iniciar sesión con Google (Supabase Auth) para frenar bots.
- Un voto por persona, por influencer y por día natural (UTC). Se aplica en la base de datos
  con una restricción única, no solo en la interfaz.
- El contador visible es en tiempo real (vista `vote_counts_30d`).
- El efecto en el ranking se aplica en el cálculo diario, con el tope de `FORMULA.md`.
- Protección extra opcional: Cloudflare Turnstile (gratis) antes de votar.

## Actualización

- Cada día a las 06:00 UTC. Si una red falla, se mantiene el último dato válido,
  se marca «desactualizado» en el perfil y el fallo queda en el log de la Action.
- Un aviso en la cabecera muestra «Actualizado el {fecha}».

## Idiomas

Diez idiomas; ver `IDIOMAS.md`. El idioma se detecta por el navegador en la primera visita
y se puede cambiar desde un selector siempre visible.

## Fuera de alcance en la primera versión

- Descubrir automáticamente nuevos influencers (se añaden por *pull request* a
  `data/influencers.json`).
- Panel de administración web (la administración es el propio repositorio).
- Datos automáticos de LinkedIn y Snapchat.
