// ============================================================
// Pac-Man - minimal playable version
// HTML5 Canvas + vanilla JS, no build step, no frameworks.
// ============================================================


// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const CELL_SIZE = 32;
const TICK_MS = 150;

const STATE = { PLAYING: 'playing', WON: 'won', LOST: 'lost' };

const CELL = { WALL: 1, PATH: 0 };

// Hardcoded maze layout.
// '#' = wall, '.' = path with a dot, ' ' = empty path (no dot),
// 'P' = Pac-Man start cell, 'G' = ghost start cell.
// Fully enclosed (border is all walls), all rows same length,
// exactly one P and one G, every path cell reachable from P.
const MAZE_LAYOUT = [
  "#############",
  "#P..........#",
  "###.#####.###",
  "#...........#",
  "###.#####.###",
  "#...........#",
  "###.#####.###",
  "#...........#",
  "###.#####.###",
  "#..........G#",
  "#############",
];


// ------------------------------------------------------------
// Maze parsing
// ------------------------------------------------------------

// Parses MAZE_LAYOUT into:
//  - grid: static 2D array of CELL.WALL / CELL.PATH (walls never change)
//  - dots: mutable Set of "row,col" keys for cells that still have a dot
//  - pacStart: {row, col}
//  - ghostStart: {row, col}
//  - rows, cols
function parseMaze(layout) {
  const rows = layout.length;
  const cols = layout[0].length;
  const grid = [];
  const dots = new Set();
  let pacStart = null;
  let ghostStart = null;

  for (let r = 0; r < rows; r++) {
    const gridRow = [];
    for (let c = 0; c < cols; c++) {
      const ch = layout[r][c];
      if (ch === '#') {
        gridRow.push(CELL.WALL);
      } else if (ch === '.') {
        gridRow.push(CELL.PATH);
        dots.add(r + ',' + c);
      } else if (ch === 'P') {
        gridRow.push(CELL.PATH);
        pacStart = { row: r, col: c };
      } else if (ch === 'G') {
        gridRow.push(CELL.PATH);
        ghostStart = { row: r, col: c };
      } else {
        // ' ' (space) - empty path, no dot
        gridRow.push(CELL.PATH);
      }
    }
    grid.push(gridRow);
  }

  return { grid, dots, pacStart, ghostStart, rows, cols };
}


// ------------------------------------------------------------
// Game state (mutable, reset on restart)
// ------------------------------------------------------------

let grid = null;
let dots = null;
let rows = 0;
let cols = 0;

let pacman = { row: 0, col: 0 };
let ghost = { row: 0, col: 0 };

let currentDirection = { dr: 0, dc: 0 };
let nextDirection = { dr: 0, dc: 0 };

let score = 0;
let gameState = STATE.PLAYING;


// ------------------------------------------------------------
// DOM references
// ------------------------------------------------------------

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');


// ------------------------------------------------------------
// Helpers (collision checks, reused by movement + ghost BFS)
// ------------------------------------------------------------

function isInBounds(row, col) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

function isWall(row, col) {
  if (!isInBounds(row, col)) return true;
  return grid[row][col] === CELL.WALL;
}

function cellKey(row, col) {
  return row + ',' + col;
}


// ------------------------------------------------------------
// Input handling
// ------------------------------------------------------------

function handleKeydown(e) {
  const key = e.key.toLowerCase();

  // Restart, active only when not currently playing
  if (gameState !== STATE.PLAYING) {
    if (key === 'r' || key === 'enter') {
      initGame();
    }
    return;
  }

  // Direction buffering: store the desired direction, applied in update()
  switch (key) {
    case 'arrowup':
    case 'w':
      nextDirection = { dr: -1, dc: 0 };
      break;
    case 'arrowdown':
    case 's':
      nextDirection = { dr: 1, dc: 0 };
      break;
    case 'arrowleft':
    case 'a':
      nextDirection = { dr: 0, dc: -1 };
      break;
    case 'arrowright':
    case 'd':
      nextDirection = { dr: 0, dc: 1 };
      break;
    default:
      return;
  }
}

document.addEventListener('keydown', handleKeydown);


// ------------------------------------------------------------
// BFS - shortest path helper (used by ghost AI)
// ------------------------------------------------------------

// Standard BFS over open (non-wall) grid cells from `from` to `to`.
// Returns the first step {row, col} after `from` on the shortest path,
// or `from` unchanged if `from === to` or no path exists.
function bfsNextStep(from, to, grid, rows, cols) {
  if (from.row === to.row && from.col === to.col) {
    return { row: from.row, col: from.col };
  }

  const visited = new Set();
  const parent = new Map();
  const startKey = cellKey(from.row, from.col);
  const targetKey = cellKey(to.row, to.col);

  visited.add(startKey);
  const queue = [{ row: from.row, col: from.col }];
  let found = false;

  const deltas = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = cellKey(current.row, current.col);

    if (currentKey === targetKey) {
      found = true;
      break;
    }

    for (const d of deltas) {
      const nr = current.row + d.dr;
      const nc = current.col + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === CELL.WALL) continue;
      const nKey = cellKey(nr, nc);
      if (visited.has(nKey)) continue;
      visited.add(nKey);
      parent.set(nKey, currentKey);
      queue.push({ row: nr, col: nc });
    }
  }

  if (!found) {
    // No path exists - stay in place
    return { row: from.row, col: from.col };
  }

  // Reconstruct path from target back to start, then take the
  // first step after start.
  let key = targetKey;
  let prevKey = null;
  while (key !== startKey) {
    prevKey = key;
    key = parent.get(key);
  }

  if (prevKey === null) {
    // target === start (already handled above, but guard anyway)
    return { row: from.row, col: from.col };
  }

  const [stepRow, stepCol] = prevKey.split(',').map(Number);
  return { row: stepRow, col: stepCol };
}


// ------------------------------------------------------------
// Update (one fixed tick of game logic)
// ------------------------------------------------------------

function update() {
  // --- Move Pac-Man ---
  let moveDir = null;

  const bufferedRow = pacman.row + nextDirection.dr;
  const bufferedCol = pacman.col + nextDirection.dc;
  if ((nextDirection.dr !== 0 || nextDirection.dc !== 0) && !isWall(bufferedRow, bufferedCol)) {
    // Buffered direction is clear - commit to it (allows cornering)
    moveDir = nextDirection;
  } else {
    const continueRow = pacman.row + currentDirection.dr;
    const continueCol = pacman.col + currentDirection.dc;
    if ((currentDirection.dr !== 0 || currentDirection.dc !== 0) && !isWall(continueRow, continueCol)) {
      moveDir = currentDirection;
    }
  }

  if (moveDir) {
    currentDirection = moveDir;
    pacman = { row: pacman.row + moveDir.dr, col: pacman.col + moveDir.dc };
  }
  // else: stay in place (both buffered and current direction blocked)

  // --- Dot eating ---
  const key = cellKey(pacman.row, pacman.col);
  if (dots.has(key)) {
    dots.delete(key);
    score += 10;
    scoreEl.textContent = String(score);
    if (dots.size === 0) {
      gameState = STATE.WON;
    }
  }

  // --- Move ghost (BFS toward Pac-Man) ---
  if (gameState === STATE.PLAYING) {
    const step = bfsNextStep(ghost, pacman, grid, rows, cols);
    ghost = { row: step.row, col: step.col };
  }

  // --- Collision check ---
  if (pacman.row === ghost.row && pacman.col === ghost.col) {
    gameState = STATE.LOST;
  }

  // --- Show end-of-game message ---
  if (gameState === STATE.WON) {
    showMessage('Du hast gewonnen! R zum Neustarten');
  } else if (gameState === STATE.LOST) {
    showMessage('Game Over! R zum Neustarten');
  }
}


// ------------------------------------------------------------
// Message helpers
// ------------------------------------------------------------

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.remove('hidden');
}

function hideMessage() {
  messageEl.textContent = '';
  messageEl.classList.add('hidden');
}


// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------

function render() {
  // Full clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Walls
  ctx.fillStyle = '#1919a6';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL.WALL) {
        ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // Dots
  ctx.fillStyle = '#ffdd88';
  const dotRadius = CELL_SIZE * 0.08;
  dots.forEach((key) => {
    const [r, c] = key.split(',').map(Number);
    const cx = c * CELL_SIZE + CELL_SIZE / 2;
    const cy = r * CELL_SIZE + CELL_SIZE / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ghost
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath();
  ctx.arc(
    ghost.col * CELL_SIZE + CELL_SIZE / 2,
    ghost.row * CELL_SIZE + CELL_SIZE / 2,
    CELL_SIZE * 0.4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Pac-Man
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(
    pacman.col * CELL_SIZE + CELL_SIZE / 2,
    pacman.row * CELL_SIZE + CELL_SIZE / 2,
    CELL_SIZE * 0.4,
    0,
    Math.PI * 2
  );
  ctx.fill();
}


// ------------------------------------------------------------
// Init / start
// ------------------------------------------------------------

function initGame() {
  const parsed = parseMaze(MAZE_LAYOUT);
  grid = parsed.grid;
  dots = parsed.dots;
  rows = parsed.rows;
  cols = parsed.cols;

  pacman = { row: parsed.pacStart.row, col: parsed.pacStart.col };
  ghost = { row: parsed.ghostStart.row, col: parsed.ghostStart.col };

  currentDirection = { dr: 0, dc: 0 };
  nextDirection = { dr: 0, dc: 0 };

  score = 0;
  scoreEl.textContent = String(score);

  gameState = STATE.PLAYING;
  hideMessage();

  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
}

let lastTime = 0;
let tickAccumulator = 0;

function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState === STATE.PLAYING) {
    tickAccumulator += dt;
    while (tickAccumulator >= TICK_MS) {
      update();
      tickAccumulator -= TICK_MS;
    }
  }

  render();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
