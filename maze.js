import { MAZE_COLS, MAZE_ROWS } from './config.js';

// --- Uses Prim's Algorithm for more complex mazes ---
export function generateMaze() {
    let maze = Array(MAZE_ROWS).fill(null).map(() => Array(MAZE_COLS).fill(1)); // 1 = wall
    let frontier = [];

    let startR = 1;
    let startC = 1;
    maze[startR][startC] = 0; // Mark as path

    const addFrontier = (r, c, fromR, fromC) => {
        if (r > 0 && r < MAZE_ROWS - 1 && c > 0 && c < MAZE_COLS - 1 && maze[r][c] === 1) {
            frontier.push({ r, c, fromR, fromC });
        }
    };

    addFrontier(startR - 2, startC, startR - 1, startC);
    addFrontier(startR + 2, startC, startR + 1, startC);
    addFrontier(startR, startC - 2, startR, startC - 1);
    addFrontier(startR, startC + 2, startR, startC + 1);

    while (frontier.length > 0) {
        const fIndex = Math.floor(Math.random() * frontier.length);
        const { r, c, fromR, fromC } = frontier.splice(fIndex, 1)[0];

        if (maze[r][c] === 1) {
            maze[fromR][fromC] = 0; // Carve path
            maze[r][c] = 0;

            addFrontier(r - 2, c, r - 1, c);
            addFrontier(r + 2, c, r + 1, c);
            addFrontier(r, c - 2, r, c - 1);
            addFrontier(r, c + 2, r, c + 1);
        }
    }
    
    maze[1][1] = 'S';
    maze[MAZE_ROWS - 2][MAZE_COLS - 2] = 'E';
    return maze;
}

