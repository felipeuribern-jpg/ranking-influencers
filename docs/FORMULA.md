# Fórmula de puntuación

Esta es la fuente de verdad. Implementa `pipeline/score.ts` como funciones puras
y cubre cada caso de la sección «Pruebas».

## 1. Datos de entrada por persona y red

| Campo | Significado |
|---|---|
| `followers` | seguidores o suscriptores actuales |
| `followers30` | seguidores hace 30 días (de `data/history/`); `null` si no hay historial |
| `er` | tasa de interacción en % (ver sección 3); `null` si no hay dato |

## 2. Pesos por red

| Red | Peso | Motivo |
|---|---|---|
| YouTube | 1,2 | Contenido largo y búsqueda: más influencia por seguidor |
| TikTok | 1,0 | Referencia |
| Instagram | 1,0 | Referencia |
| LinkedIn | 1,3 | Audiencia profesional con capacidad de decisión |
| Facebook | 0,7 | Alcance orgánico bajo para su número de seguidores |
| Snapchat | 0,6 | Métricas públicas limitadas |

Los pesos viven en `pipeline/config.ts` para poder ajustarlos sin tocar la lógica.

## 3. Tasa de interacción (`er`)

Se calcula sobre las últimas 12 publicaciones con al menos 48 h de antigüedad
(las más recientes aún están creciendo):

- **YouTube:** media de (me gusta + comentarios) ÷ vistas × 100.
  Se usan vistas porque muchos suscriptores ya no ven los vídeos.
- **Instagram:** media de (me gusta + comentarios) ÷ seguidores × 100.
- **TikTok:** media de (me gusta + comentarios + compartidos) ÷ vistas × 100.
- **Facebook:** media de (reacciones + comentarios + compartidos) ÷ seguidores × 100,
  solo si la API lo permite (ver `FUENTES_DE_DATOS.md`).
- **LinkedIn y Snapchat:** `null` salvo dato manual.

Si hay menos de 3 publicaciones válidas, `er = null`.

## 4. Puntos por red

```
alcance      = log10(1 + followers / 10_000)

mediana_red  = mediana de er de TODAS las personas del ranking en esa red (ignorando null)
ratio        = er / mediana_red
f_interac    = er == null || mediana_red == null ? 1 : sqrt(clamp(ratio, 0.25, 4))   // 0,5 … 2

crec         = followers30 == null ? 0 : (followers - followers30) / followers30
f_impulso    = 1 + clamp(crec, -0.20, 0.50)                                          // 0,8 … 1,5

puntos_red   = peso × 1000 × alcance × f_interac × f_impulso
```

La mediana hace que la interacción se compare dentro de cada red (TikTok con TikTok),
sin depender de valores de referencia externos, y se recalibra sola cada día.

## 5. Puntos de redes y voto del público

```
puntos_redes   = suma de puntos_red
votos30        = «me gusta» recibidos en los últimos 30 días
puntos_publico = min(0.10 × puntos_redes, 800 × log10(1 + votos30))
total          = puntos_redes + puntos_publico
```

El voto ayuda a subir, pero nunca puede aportar más del 10 % de lo que la persona ya
consigue en redes. Así una campaña de votos no compra el primer puesto.

## 6. Orden y desempates

1. `total` descendente.
2. Empate: más `puntos_redes`.
3. Empate: más seguidores sumados.
4. Empate: orden alfabético del nombre.

Ranking de país = ranking mundial filtrado por país (top 10).
Movimiento = posición de ayer − posición de hoy (de la instantánea anterior).
Si no existía ayer: «nuevo».

## 7. Red principal

La red con más `followers` (no la de más puntos). Empate: la de más puntos.

## 8. Datos desactualizados

Si una red no se pudo actualizar, se usa el último valor válido y se marca `stale: true`.
Pasados 30 días sin actualizar, esa red deja de puntuar (`puntos_red = 0`) y se muestra
«sin datos recientes».

## Pruebas (mínimo)

1. 1 000 000 seguidores, er y crecimiento nulos, Instagram → 1000 × log10(101) ≈ 2004,3.
2. Mismo caso en YouTube → ≈ 2405,2.
3. `er` = 4 × mediana → f_interac = 2. `er` = 0,01 × mediana → 0,5 (tope).
4. Crecimiento +80 % → f_impulso = 1,5. −50 % → 0,8.
5. `puntos_redes` = 10 000 y 1 000 000 de votos → `puntos_publico` = 1 000 (tope del 10 %).
6. 0 votos → `puntos_publico` = 0.
7. Desempate por nombre funciona con acentos (usar `localeCompare` con `sensitivity: 'base'`).
8. Red `stale` hace 31 días → aporta 0 puntos.
