// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

const GHOST_RELEASE_INTERVAL = 90; // frames ≈ 1.5 s a 60 fps
const GHOST_RELEASE_ORDER = [ 'hunter', 'ambusher', 'flanker', 'shy' ];
const GHOST_EXIT_POINT = { x: 13, y: 11 }; // celda justo encima de la puerta

const POWER_PELLETS = [ { x: 1, y: 3 }, { x: 26, y: 3 }, { x: 1, y: 23 }, { x: 26, y: 23 } ];
const FRIGHTENED_DURATION = 360; // frames ≈ 6 s a 60 fps
const FRIGHTENED_FLASH = 90;     // frames finales de parpadeo
const FRIGHTENED_SPEED = 0.05;   // mitad de GHOST_SPEED
const GHOST_EAT_SCORES = [ 200, 400, 800, 1600 ];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    frame: 0,
    releasedCount: 0,
    frightTimer: 0,
    eatenStreak: 0,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      released: false,
      leaving: true,
      frightened: false,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado por pared (1); por puerta (3) salvo que esté saliendo (leaving)
function isWall( grid, x, y, actor, ghostLeaving ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && ( actor === 'pacman' || ( actor === 'ghost' && !ghostLeaving ) ) ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor, ghostLeaving ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor, ghostLeaving );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function isPowerPellet( x, y ) {
  return POWER_PELLETS.some( ( pp ) => pp.x === x && pp.y === y );
}

function activateFrightened( game ) {
  game.frightTimer = FRIGHTENED_DURATION;
  game.eatenStreak = 0;
  game.ghosts.forEach( ( g ) => {
    g.frightened = true;
    g.speed = FRIGHTENED_SPEED;
  } );
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.dotsRemaining--;
      if ( isPowerPellet( p.x, p.y ) ) {
        game.score += 50;
        activateFrightened( game );
      } else {
        game.score += 10;
      }
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Objetivo por rol para la IA de persecución. Devuelve una celda (x,y).
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const d = DIRS[ p.dir ] || { x: 0, y: 0 };
  switch ( g.kind ) {
    case 'ambusher': // se adelanta a donde va Pac-Man
      return { x: px + d.x * 4, y: py + d.y * 4 };
    case 'flanker': // ataca por el flanco (4 adelante, 2 a un lado)
      return { x: px + d.x * 4 - d.y * 2, y: py + d.y * 4 + d.x * 2 };
    default: // hunter: directo a Pac-Man
      return { x: px, y: py };
  }
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost', g.leaving )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  if ( g.leaving ) {
    // Saliendo de la pen: se dirige al punto de salida sobre la puerta.
    g.dir = seek( grid, g, GHOST_EXIT_POINT, choices );
    return;
  }

  if ( g.frightened ) {
    // Asustado: direccion aleatoria en cada cruce (clasico).
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  if ( g.kind === 'shy' ) {
    // timido: se aleja de Pac-Man (maximiza la distancia).
    g.dir = flee( grid, g, game.pacman, choices );
    return;
  }

  // Persecucion (hunter/ambusher/flanker): minimiza la distancia al objetivo.
  const target = ghostTarget( game, g );
  g.dir = seek( grid, g, target, choices );
}

// Elige la direccion de choices que minimiza la distancia (Manhattan) a target.
function seek( grid, g, target, choices ) {
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

// Elige la direccion de choices que maximiza la distancia (Manhattan) a target.
function flee( grid, g, target, choices ) {
  let best = choices[ 0 ];
  let bestDist = -Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist > bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    // Alcanzo el punto de salida: pasa a usar su IA normal.
    if ( g.leaving && g.x === GHOST_EXIT_POINT.x && g.y === GHOST_EXIT_POINT.y ) {
      g.leaving = false;
    }
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost', g.leaving ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.released = false;
    g.leaving = true;
  } );
  game.frame = 0;
  game.releasedCount = 0;
}

// Un fantasma comido vuelve a la pen y re-sale por la puerta (SPEC 02).
function eatGhost( game, g ) {
  const start = GHOST_STARTS.find( ( s ) => s.kind === g.kind ) || GHOST_STARTS[ 0 ];
  g.x = start.x;
  g.y = start.y;
  g.dir = 'up';
  g.leaving = true;
  g.released = true;
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  // Liberacion escalonada: un fantasma cada GHOST_RELEASE_INTERVAL frames.
  if (
    game.releasedCount < GHOST_RELEASE_ORDER.length &&
    game.frame % GHOST_RELEASE_INTERVAL === 0
  ) {
    const kind = GHOST_RELEASE_ORDER[ game.releasedCount ];
    const g = game.ghosts.find( ( ghost ) => ghost.kind === kind );
    if ( g ) g.released = true;
    game.releasedCount++;
  }
  game.frame++;

  movePacman( game );
  game.ghosts.forEach( ( g ) => {
    if ( g.released ) moveGhost( game, g );
  } );

  for ( const g of game.ghosts ) {
    if ( !g.released ) continue;
    if ( collides( game.pacman, g ) ) {
      if ( g.frightened ) {
        // Comer fantasma: doblaje por racha del mismo pellet.
        game.score += GHOST_EAT_SCORES[ Math.min( game.eatenStreak, GHOST_EAT_SCORES.length - 1 ) ];
        game.eatenStreak++;
        eatGhost( game, g );
        break;
      }
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
