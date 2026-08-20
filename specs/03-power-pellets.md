# SPEC 03 — Power pellets y modo asustado

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-20
> **Objective:** Añadir 4 power pellets en las esquinas del laberinto que, al comerlos, ponen a los fantasmas en modo asustado temporal y permiten a Pac-Man comérselos.

## Scope

**In:**

- 4 power pellets en las esquinas clásicas: `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)` (celdas que ya tienen dot en el maze).
- Modo asustado global de 360 frames (~6 s), con parpadeo blanco/azul en los últimos 90.
- Fantasmas asustados: color azul, velocidad a la mitad (0.05) y movimiento aleatorio en cada cruce.
- Comer un fantasma: 200/400/800/1600 (doblaje por racha, reseteada con cada pellet).
- Fantasma comido: vuelve a la pen y re-sale por la puerta reutilizando `leaving` (SPEC 02).
- Perder una vida cancela el modo asustado.

**Out of scope (para specs futuros):**

- Ojos volando de vuelta a la pen (dibujo especial).
- Niveles, duración variable por nivel, otros efectos.
- Cambios en la geometría del laberinto.

## Data model

```js
// game.js — constantes nuevas
const POWER_PELLETS = [ { x: 1, y: 3 }, { x: 26, y: 3 }, { x: 1, y: 23 }, { x: 26, y: 23 } ];
const FRIGHTENED_DURATION = 360;   // frames ≈ 6 s
const FRIGHTENED_FLASH = 90;       // frames finales de parpadeo
const FRIGHTENED_SPEED = 0.05;     // mitad de GHOST_SPEED
const GHOST_EAT_SCORES = [ 200, 400, 800, 1600 ];

// Estado de partida: se añaden
{ frightTimer: 0, eatenStreak: 0 }

// Fantasma: se añade frightened
{ x, y, dir, speed, kind, released: false, leaving: true, frightened: false }
```

Las celdas de los pellets siguen siendo `2` (dot) en `game.grid`: cuentan para `dotsRemaining` y la render los dibuja más grandes por coordenada.

## Implementation plan

1. `game.js`: definir las constantes; en `createGame` añadir `frightTimer: 0`, `eatenStreak: 0` y `frightened: false` en cada fantasma.
2. `game.js`: en `movePacman`, al comer en una celda de `POWER_PELLETS` → `+50` puntos y activar el modo (timer 360, streak 0, todos `frightened = true`, `speed = 0.05`).
3. `game.js`: en `moveGhost`, si `g.frightened` → dirección aleatoria en cada cruce (en vez de `decideGhost`); al apagarse el modo se restaura `speed` y `decideGhost`.
4. `game.js`: en `update`, distinguir colisión: fantasma asustado → comérselo (puntos según `GHOST_EAT_SCORES[ eatenStreak++ ]`, devolver a la pen con `leaving = true` y `released = true`); fantasma normal → seguir matando.
5. `game.js`: decrementar `frightTimer` cada frame; al llegar a 0 → limpiar `frightened`, velocidades y `eatenStreak`. `resetPositions` cancela el modo asustado.
6. `render.js`: dibujar pellets más grandes (radio mayor) en las 4 coordenadas; color azul (`#2121ff`) para asustados, alternando blanco/azul cuando `frightTimer <= 90`.
7. Verificación por simulación en Node + manual en navegador.

## Acceptance criteria

- [ ] El juego carga sin errores en consola.
- [ ] Hay 4 pellets visibles en las esquinas, más grandes que los dots, y valen 50 puntos cada uno.
- [ ] Comer un pellet vuelve azules a los 4 fantasmas, a velocidad 0.05 y con dirección aleatoria en cada cruce.
- [ ] Comer un fantasma asustado suma 200/400/800/1600 según la racha del mismo pellet.
- [ ] Un fantasma comido vuelve a la pen y re-sale por la puerta hasta `(13,11)`.
- [ ] El modo asustado termina a los 360 frames; los últimos 90 el fantasma parpadea.
- [ ] Un fantasma no asustado sigue matando a Pac-Man al tocarlo.
- [ ] Perder una vida cancela el modo asustado (fantasmas normales al renacer).
- [ ] `dotsRemaining` sigue incluyendo los pellets.

## Decisions

- **Sí:** 4 pellets en las esquinas clásicas. Son celdas con dot existentes → `MAZE` no se toca.
- **Sí:** 50 puntos por pellet y modo global de 360 frames con parpadeo final. Fiel al arcade.
- **Sí:** movimiento aleatorio en cruces para asustados. Es el clásico; `flee` es otra mecánica.
- **Sí:** velocidad a la mitad. Hace alcanzables a los fantasmas.
- **Sí:** doblaje 200/400/800/1600 con racha por pellet. Fiel al arcade.
- **Sí:** el comido re-sale con `leaving` (SPEC 02) y `released = true`. Reusa la maquinaria existente.
- **No:** ojos volando a la pen. Reusa el dibujo actual; queda para otra spec.
- **No:** timer independiente por fantasma. El modo es global como en el arcade.

## Risks

| Risk | Mitigation |
| --- | --- |
| El timer expira mientras un fantasma comido está re-saliendo | El flag `frightened` no se toca al devolverlo a la pen; si el modo sigue al salir, se mantiene azul. Si expiró, sale con IA normal: no hay estado inválido. |
| El aleatorio puede invertir 180° dentro de la pen | La dirección aleatoria solo se aplica a fantasmas fuera de la pen (`leaving === false`); dentro de ella `leaving` sigue mandando. |

## What is **not** in this spec

- Ojos volando a la pen (spec propia futura).
- Niveles y duración variable.
- Cualquier otro efecto de power-up.

Cada una de esas, si llega, va en su propio spec.