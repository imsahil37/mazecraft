# Mazecraft 3D 速い 🚀

An immersive 3D maze game built with Three.js, featuring procedurally generated levels and a dynamic day/night cycle, all wrapped in a classic Minecraft aesthetic.

![Mazecraft Screenshot](mazecraft.png)

---

## ✨ Features

* **Infinite Mazes:** A new, complex maze is procedurally generated every time you play using **Prim's Algorithm**.
* **Immersive 3D World:** A complete first-person experience built with **Three.js**, featuring `PointerLockControls` for intuitive mouse and keyboard movement.
* **Dynamic Day/Night Cycle:** The world seamlessly transitions between day, dusk, night, and dawn, with corresponding changes in sky color, lighting, and ambient sound.
* **Real-time Physics:** A simple but effective physics engine handles gravity, jumping, and collision detection with maze walls.
* **Interactive Environment:**
    * 🔦 Toggle a handheld torch during the night for better visibility.
    * 🌧️ Experience rain and listen to crickets when night falls.
    * ☀️ Watch the sun and moon traverse the sky.
* **Minecraft-Inspired Assets:** Features pixelated textures and a 3D torch model to create a familiar, blocky aesthetic.
* **Game UI:** Includes a start screen, a timer to track your speed, and a victory modal when you reach the end.

---

## 🛠️ How to Play

1.  **Clone or download** this repository.
2.  Since the project uses ES6 modules, it needs to be served by a local web server to avoid CORS errors.
    * If you have Python: `python -m http.server`
    * If you have Node.js: `npm install -g serve` and then `serve`
3.  Open your browser and navigate to the provided local server address (e.g., `http://localhost:8000`).
4.  Click the screen to lock the pointer and start playing!

**Controls:**
* **W, A, S, D:** Move
* **Mouse:** Look around
* **Spacebar:** Jump
* **T:** Toggle Torch (at night)
* **Escape:** Pause and unlock the cursor

---

## 🔧 Code Overview

* **`main.js`**: The main game class. Initializes the Three.js scene, loads assets, and runs the game loop.
* **`maze.js`**: Contains the Prim's Algorithm logic for generating the maze data structure.
* **`world.js`**: Manages all environmental aspects, including the day/night cycle, sky, lighting, and weather effects.
* **`player.js`**: Handles player controls, movement, physics, collision detection, and interactions.
* **`config.js`**: Centralizes all key game variables for easy tuning.
