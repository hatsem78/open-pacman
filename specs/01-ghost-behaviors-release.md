# SPEC 01 — Comportamientos de fantasmas y liberación desde la pen

> **Status:** Draft
> **Depends on:** (ninguna — primer spec)
> **Date:** 2026-08-19
> **Objective:** Configurar 4 fantasmas con comportamientos independientes (perseguidor agresivo, emboscador, flanqueador y tímido) que se liberan de la pen uno a la vez cada 1.5 segundos.

## Scope

**In:**

- Ampliar `GHOST_STARTS` a 4 fantasmas, cada uno con su `kind` propio.
- 4 comportamientos distintos: `hunter` (perseguidor agresivo), `ambusher` (emboscador), `flanker` (flanqueador), `shy` (tímido).
- Liberación escalonada: un fantasma cada 1.5 s, liberando primero al `hunter`.
- Fantasmas no liberados: ocultos y estáticos dentro de la pen.
- Los 4 colores aprobados ya existentes (`GHOST_COLORS`) asignados por rol.
- Reinicio del ciclo de liberación al perder una vida.

**Out of scope (para specs futuros):**

- Power-pellets / modo asustado (spec futura).
- Reajuste de la geometría del laberinto (se reutilizan las celdas actuales de la pen).
- Niveles, velocidades variables u otros roles de IA.

## Data model

```js
// maze.js — GHOST_STARTS pasa a 4 entradas con su kind
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter' },
  { x: 14, y: 14, kind: 'ambusher' },
  { x: 13, y: 15, kind: 'flanker' },
  { x: 14, y: 15, kind: 'shy' },
];

// game.js — constantes nuevas
const GHOST_RELEASE_INTERVAL = 90; // frames ≈ 1.5 s a 60 fps
const GHOST_RELEASE_ORDER = [ 'hunter', 'ambusher', 'flanker', 'shy' ];

// Fantasma: se añade released
{ x, y, dir, speed, kind, released: false }

// Estado de partida: se añaden
{ frame: 0, releasedCount: 0 }

// render.js — color por rol (los 4 ya aprobados)
const GHOST_COLORS_BY_KIND = {
  hunter:   '#ff0000',
  ambusher: '#ffb8ff',
  flanker:  '#00ffff',
  shy:      '#ffb852',
};
```

## Implementation plan

1. `maze.js`: ampliar `GHOST_STARTS` a 4 entradas con sus `kind` (los 2 nuevos dentro de la pen, filas 14-15).
2. `game.js`: añadir `released: false` a cada fantasma en `createGame`; añadir `frame` y `releasedCount` al estado.
3. `game.js`: en `update`, incrementar `frame`; cada `GHOST_RELEASE_INTERVAL` frames liberar al siguiente de `GHOST_RELEASE_ORDER` (primero `hunter`).
4. `game.js`: refactorizar `decideGhost` para despachar por `kind` vía un mapa de comportamientos; implementar `ambusher`, `flanker` y `shy`, manteniendo `hunter` como está.
5. `game.js`: en `resetPositions`, reiniciar `released` (false) y `releasedCount` (0).
6. `render.js`: `draw` salta los fantasmas con `released === false`; `drawGhost` usa `GHOST_COLORS_BY_KIND[ g.kind ]`.
7. Verificación manual completa (no se añade ningún archivo; solo se modifican `maze.js`, `game.js` y `render.js`).

## Acceptance criteria

- [ ] El juego carga sin errores en consola.
- [ ] Hay 4 fantasmas con 4 colores distintos aprobados.
- [ ] Al inicio solo el `hunter` está activo; luego sale uno cada ~1.5 s hasta los 4.
- [ ] Los fantasmas no liberados no se ven y no se mueven.
- [ ] El `hunter` persigue agresivamente a Pac-Man.
- [ ] `ambusher`, `flanker` y `shy` se comportan de forma distinta entre sí y del `hunter`.
- [ ] Al perder una vida, los fantasmas vuelven a la pen y el ciclo de liberación se reinicia.

## Decisions

- **Sí:** 4 roles clásicos (cazador/emboscador/flanqueador/tímido). Son los roles canónicos y encajan con la descripción.
- **Sí:** `hunter` se libera primero. Garantiza la condición de persecución desde el arranque.
- **Sí:** no liberados ocultos y estáticos en la pen. Refuerza la percepción de liberación escalonada.
- **Sí:** el ciclo de liberación se reinicia con cada vida perdida. `resetPositions` ya devuelve todo al lugar.
- **Sí:** temporización por frames (90 frames ≈ 1.5 s). No existe sistema de `dt` en el bucle; es el cambio más pequeño.
- **No:** power-pellets / modo asustado. Spec futura.
- **No:** rediseñar la pen. Se reutilizan las celdas actuales para no tocar el laberinto.

## Risks

| Risk | Mitigation |
| --- | --- |
| Temporización por frames asume ~60 fps | La constante es un único punto de cambio; se puede migrar a tiempo real (`performance.now()`) sin tocar el resto. |
| 4 fantasmas en una pen de 2 columnas pueden superponerse | Liberación secuencial; casi siempre hay 1 dentro, y el `hunter` sale primero. |

## What is **not** in this spec

- Power-pellets y modo asustado (spec propia futura).
- Rediseño del laberinto/pen.
- Niveles y otras mecánicas.

Cada una de esas, si llega, va en su propio spec.