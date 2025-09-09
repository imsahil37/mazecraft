// --- CRITICAL FIX: Import THREE to define Color objects ---
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

// --- Maze Dimensions ---
export const MAZE_COLS = 21;
export const MAZE_ROWS = 21;
export const TILE_SIZE = 8;
export const WALL_HEIGHT = 7;

// --- Player Settings ---
export const PLAYER_RADIUS = TILE_SIZE * 0.4;

// --- Day/Night Cycle ---
export const CYCLE_DURATION = 180; // Total cycle length in seconds
export const dayColor = new THREE.Color(0x87ceeb);
export const nightColor = new THREE.Color(0x02010a); 
export const duskColor = new THREE.Color(0xff7f50); 
export const dawnColor = new THREE.Color(0x6a88c1);

// --- Cloud Colors ---
export const dayCloudColor = new THREE.Color(0xffffff);
export const nightCloudColor = new THREE.Color(0x444444);

