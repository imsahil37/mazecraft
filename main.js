import { Player } from './player.js';
import { World } from './world.js';
import { generateMaze } from './maze.js';
import { MAZE_COLS, MAZE_ROWS, TILE_SIZE, WALL_HEIGHT } from './config.js';

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.player = null;
        this.maze = null;
        this.mazeObjects = [];
        this.startTime = null;
        this.timerInterval = null;
        this.prevTime = performance.now();
        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.player = new Player(this.camera, this.renderer.domElement, this);
        this.world = new World(this.scene);

        this.setupEventListeners();
        this.loadAssets();
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.getElementById('play-again-btn').addEventListener('click', () => location.reload());
    }

    loadAssets() {
        const loadingManager = new THREE.LoadingManager();
        const textureLoader = new THREE.TextureLoader(loadingManager);
        const gltfLoader = new THREE.GLTFLoader(loadingManager);
        let allAssets = { textures: {}, models: {} };

        loadingManager.onLoad = () => this.onAssetsLoaded(allAssets);
        loadingManager.onError = (url) => {
            console.error('Error loading asset:', url);
            document.getElementById('loading-text').textContent = `Error loading: ${url}.`;
        };

        const textureURLs = {
            grass: "https://raw.githubusercontent.com/imsahil37/pixel/main/grass.png",
            stone: "https://raw.githubusercontent.com/imsahil37/pixel/main/wall3.png",
            diamond: "https://assets.mcasset.cloud/1.21.8/assets/minecraft/textures/item/nether_star.png",
            cloud: "https://raw.githubusercontent.com/imsahil37/pixel/main/clouds.png",
            sun: "https://raw.githubusercontent.com/imsahil37/pixel/main/sun.png",
            moon: "https://raw.githubusercontent.com/imsahil37/pixel/main/moon.png",
        };

        for (const key in textureURLs) {
            allAssets.textures[key] = textureLoader.load(textureURLs[key], (texture) => {
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
            });
        }
        allAssets.textures.grass.wrapS = THREE.RepeatWrapping;
        allAssets.textures.grass.wrapT = THREE.RepeatWrapping;
        allAssets.textures.grass.repeat.set(MAZE_COLS, MAZE_ROWS);

        gltfLoader.load(
            "https://raw.githubusercontent.com/imsahil37/pixel/main/minecraft_torch.glb",
            (gltf) => {
                allAssets.models.torch = gltf.scene;
                allAssets.models.torch.traverse(child => {
                    if (child.isMesh && child.material.map) {
                        child.material.map.magFilter = THREE.NearestFilter;
                        child.material.map.minFilter = THREE.NearestFilter;
                    }
                });
            }
        );
    }

    onAssetsLoaded(assets) {
        document.getElementById('loading-text').style.display = 'none';
        document.getElementById('main-instructions').style.display = 'block';

        this.world.init(assets.textures);
        this.player.initHandheldTorch(assets.models.torch);
        
        const groundGeometry = new THREE.PlaneGeometry(MAZE_COLS * TILE_SIZE, MAZE_ROWS * TILE_SIZE, MAZE_COLS, MAZE_ROWS);
        const groundMaterial = new THREE.MeshLambertMaterial({ map: assets.textures.grass });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        const wallMaterial = new THREE.MeshLambertMaterial({ map: assets.textures.stone });
        const endMaterial = new THREE.MeshBasicMaterial({ map: assets.textures.diamond });
        this.buildMaze3D(wallMaterial, endMaterial);
        
        this.player.setControlsCallback(this.onControlsLock.bind(this), this.onControlsUnlock.bind(this));

        this.animate();
    }

    buildMaze3D(wallMat, endMat) {
        this.maze = generateMaze();
        const wallGeometry = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
        
        for(let r = 0; r < MAZE_ROWS; r++) {
            for(let c = 0; c < MAZE_COLS; c++) {
                const x = (c - MAZE_COLS / 2) * TILE_SIZE;
                const z = (r - MAZE_ROWS / 2) * TILE_SIZE;
                
                if(this.maze[r][c] === 1) {
                    const wall = new THREE.Mesh(wallGeometry.clone(), wallMat.clone());
                    wall.position.set(x, WALL_HEIGHT / 2, z);
                    this.scene.add(wall);
                    this.mazeObjects.push(wall);
                } else if (this.maze[r][c] === 'S') {
                    this.player.getControls().getObject().position.set(x, WALL_HEIGHT / 2, z);
                } else if (this.maze[r][c] === 'E') {
                    const endBlock = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE), endMat.clone());
                    endBlock.position.set(x, WALL_HEIGHT / 2, z);
                    endBlock.name = "endBlock";
                    this.scene.add(endBlock);
                }
            }
        }
    }

    onControlsLock() {
        document.getElementById('blocker').style.display = 'none';
        if (!this.startTime) {
            this.startTime = Date.now();
            this.timerInterval = setInterval(this.updateTimer.bind(this), 100);
        }
    }

    onControlsUnlock() {
        document.getElementById('blocker').style.display = 'flex';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateTimer() {
        if (this.player.getControls().isLocked) {
            const elapsedTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
            document.getElementById('info-bar').textContent = `Time: ${elapsedTime}s`;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        this.world.update(delta, this.player.getControls().isLocked);
        this.player.update(delta, this.mazeObjects, this.world.isNight());

        const endBlock = this.scene.getObjectByName("endBlock");
        if (endBlock && this.player.getControls().getObject().position.distanceTo(endBlock.position) < TILE_SIZE * 0.8) {
            this.player.win();
            clearInterval(this.timerInterval);
            const finalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
            document.getElementById('win-time').textContent = `Your time: ${finalTime} seconds.`;
            document.getElementById('win-modal').style.display = 'flex';
        }

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}

new Game();

