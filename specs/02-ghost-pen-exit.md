# SPEC 02 — Salida de los fantasmas desde la pen

> **Status:** Draft
> **Depends on:** SPEC 01
> **Date:** 2026-08-19
> **Objective:** Hacer que cada fantasma, al ser liberado, salga de la pen por la puerta hasta un punto fijo y luego active su IA normal, sin poder volver a entrar.

## Scope

**In:**

- Estado `leaving` en cada fantasma; mientras esté activo, la IA se sobreescribe para dirigirse a la salida.
- Punto fijo de salida sobre la puerta: celda `(13,11)`.
- Al alcanzar el punto, `leaving = false` y el fantasma usa su IA normal (persigue o huye según su `kind`).
- Un fantasma ya fuera de la pen no vuelve a entrar (la puerta se trata como muro para él).
- Al perder una vida (`resetPositions`), los fantasmas vuelven a la pen con `leaving = true` para el próximo ciclo de liberación.

**Out of scope (para specs futuros):**

- Power-pellets / modo asustado.
- Rediseño de la geometría de la pen o del laberinto.
- Otras mecánicas (niveles, velocidades variables, más roles).

## Data model

```js
// game.js — punto de salida (celda justo encima de la puerta, fila 11)
const GHOST_EXIT_POINT = { x: 13, y: 11 };

// Fantasma: se añade leaving
{ x, y, dir, speed, kind, released: false, leaving: true }

// isWall/canMove: para actor 'ghost', la puerta (3) bloquea salvo que leaving === true
```

## Implementation plan

1. `game.js`: definir `GHOST_EXIT_POINT = { x: 13, y: 11 }`.
2. `game.js`: añadir `leaving: true` a cada fantasma en `createGame` y en `resetPositions`.
3. `game.js`: en `decideGhost`, si `g.leaving` → objetivo `GHOST_EXIT_POINT` (sobreescribe la persecución y la huida); si no → objetivo normal por rol.
4. `game.js`: en `moveGhost`, al llegar alineado a `GHOST_EXIT_POINT` con `leaving` activo → `leaving = false`.
5. `game.js`: pasar `g.leaving` a `canMove`/`isWall` para que, en un fantasma ya fuera, la puerta (3) se trate como muro y no re-entre.
6. Verificación manual en navegador + simulación (todos los fantasmas deben salir).

## Acceptance criteria

- [ ] El juego carga sin errores en consola.
- [ ] Al liberarse, cada fantasma sale de la pen por la puerta y llega a `(13,11)` sin quedarse atascado.
- [ ] Los 4 fantasmas logran salir (verificado: no solo `shy`).
- [ ] Al alcanzar `(13,11)`, el fantasma usa su IA normal según su rol.
- [ ] Un fantasma ya fuera de la pen no vuelve a entrar por la puerta.
- [ ] Al perder una vida, los fantasmas vuelven a la pen y la salida se repite en la próxima liberación.

## Decisions

- **Sí:** estado `leaving` que sobreescribe la IA dentro de la pen. Enfoque canónico de Pac-Man; garantiza salir pese a que el greedy apunta a Pac-Man (que arranca debajo de la pen).
- **Sí:** punto fijo `(13,11)` sobre la puerta como destino intermedio; al alcanzarlo se activa la IA normal.
- **Sí:** la puerta es muro para un fantasma fuera → no re-entra. Evita que se vuelva a atascar si persigue a Pac-Man cerca de la puerta.
- **No:** teletransporte al liberar. Más simple pero omite la mecánica de salida.
- **No:** bounding box de la pen para detectar el interior. Acopla geometría en la lógica; el flag es más claro y depurable.
- **No:** permitir re-entrada libre. Riesgo de re-atascarse.

## Risks

| Risk | Mitigation |
| --- | --- |
| Empates en el greedy pueden alargar la salida dentro de la pen | `(13,11)` está justo encima de la puerta; todos salen en pocos frames. Verificable en simulación. |
| `canMove`/`isWall` suman un flag | Solo afecta al actor `'ghost'`; Pac-Man y el resto no cambian su firma. |

## What is **not** in this spec

- Power-pellets y modo asustado (spec propia futura).
- Rediseño de la pen o del laberinto.
- Niveles y otras mecánicas.

Cada una de esas, si llega, va en su propio spec.