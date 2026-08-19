# AGENTS.md

Pac-Man clone in vanilla JS/HTML/CSS. No build system, no package.json, no tests, no linter.

## Run

Open `src/index.html` directly in a browser (no server, no build step needed) .

## Architecture

- Globals-based. Files are plain `<script>` tags; **load order in `src/index.html` matters**:
  `maze.js` → `game.js` → `render.js` → `main.js`.
- `maze.js` defines `MAZE` (28x31 numeric grid), `TUNNEL_ROW`, `PACMAN_START`, `GHOST_STARTS` on `window`.
- `game.js` and `render.js` consume those globals; `main.js` uses globals `createGame/update/draw` via `requestAnimationFrame` loop.
- `game.js` copies the pristine `MAZE` into `game.grid` so dots can be eaten per game. `render.js` draws from `game.grid`, never `MAZE`.

## Conventions

- Code comments, UI strings, and README are in **Spanish** — keep new content in Spanish.
- Maze legend (maze.js): `#` wall(1), `.` dot(2), ` ` walkable(0), `-` pen door(3).

## Spec-Driven Workflow

- This repo is a Spec-Driven Development learning project. For new features, use the `spec` skill and save specs to `specs/`.

-`/spec-impl NN-slug` – implements an `Approved` spec; creates/switches to a `spec-NN-slug` git branch (configurable via `specs/.spec-config.yml`, `AutoCreateBranch` defaults `true`).
