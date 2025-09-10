// --- DOM Elements ---
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const loadingText = document.getElementById('loading-text');
const mainInstructions = document.getElementById('main-instructions');
const crosshair = document.getElementById('crosshair');
const infoBar = document.getElementById('info-bar');
const winModal = document.getElementById('win-modal');
const playAgainBtn = document.getElementById('play-again-btn');
const winTimeDisplay = document.getElementById('win-time');
const dayNightToggle = document.getElementById('day-night-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');
const runningAudio = document.getElementById('running-audio');
const nightAudio = document.getElementById('night-audio');
const victoryAudio = document.getElementById('victory-audio');
const jumpAudio = document.getElementById('jump-audio');
const rainAudio = document.getElementById('rain-audio');

// --- Global Variables & Constants ---
let camera, scene, renderer, controls;
let maze, mazeObjects = [], sun, moon, stars, cloudsGroup, handheldTorch, rain;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let dayAmbientLight, hemisphereLight, directionalLight;

const MAZE_COLS = 21;
const MAZE_ROWS = 21;
const TILE_SIZE = 8;
const WALL_HEIGHT = 7;
const PLAYER_RADIUS = TILE_SIZE * 0.3;

const PLAYER_JUMP_VELOCITY = 30;
const GRAVITY = 175.0;

let startTime, timerInterval;
let prevTime = performance.now();
let isTorchOn = false;
let gameWon = false;

const dayColor = new THREE.Color(0x87ceeb);
const nightColor = new THREE.Color(0x02010a);
const duskColor = new THREE.Color(0xff7f50);
const dawnColor = new THREE.Color(0x6a88c1);
const dayCloudColor = new THREE.Color(0xffffff);
const nightCloudColor = new THREE.Color(0x444444);
const sunDayColor = new THREE.Color(0xFFFF00);
const sunDuskColor = new THREE.Color(0xFF8C00);

let gameTime = 0;
const CYCLE_DURATION = 180;

// --- Maze Generation (Prim's Algorithm) ---
function generateMaze(cols, rows) {
    let maze = Array(rows).fill(null).map(() => Array(cols).fill(1));
    let frontier = [];
    let startR = 1;
    let startC = 1;
    maze[startR][startC] = 0;

    const addFrontier = (r, c, fromR, fromC) => {
        if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1 && maze[r][c] === 1) {
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
            maze[fromR][fromC] = 0;
            maze[r][c] = 0;
            addFrontier(r - 2, c, r - 1, c);
            addFrontier(r + 2, c, r + 1, c);
            addFrontier(r, c - 2, r, c - 1);
            addFrontier(r, c + 2, r, c + 1);
        }
    }
    
    maze[1][1] = 'S';
    maze[rows - 2][cols - 2] = 'E';
    return maze;
}

// --- Main Game Logic ---
init();

function init() {
    scene = new THREE.Scene();
    scene.background = dayColor.clone();
    scene.fog = new THREE.Fog(dayColor.clone(), 0, TILE_SIZE * MAZE_COLS * 0.7);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = WALL_HEIGHT / 2;

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    loadAssets();
}

function loadAssets() {
    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);
    const gltfLoader = new THREE.GLTFLoader(loadingManager);
    let allAssets = { textures: {}, models: {} };

    loadingManager.onLoad = () => onAssetsLoaded(allAssets);
    loadingManager.onError = (url) => {
        loadingText.textContent = `Error loading: ${url}.`;
    };

    const textureURLs = {
        grass: "assets/textures/grass.png",
        stone: "assets/textures/wall3.png",
        diamond: "assets/textures/diamond.png",
        cloud: "assets/textures/clouds.png",
        sun: "assets/textures/sun.png",
        moon: "assets/textures/moon.png",
    };
    for (const key in textureURLs) {
        allAssets.textures[key] = textureLoader.load(textureURLs[key], t => { t.magFilter = t.minFilter = THREE.NearestFilter; });
    }
    allAssets.textures.grass.wrapS = allAssets.textures.grass.wrapT = THREE.RepeatWrapping;
    allAssets.textures.grass.repeat.set(MAZE_COLS, MAZE_ROWS);

    gltfLoader.load("assets/models/minecraft_torch.glb", (gltf) => {
        allAssets.models.torch = gltf.scene;
        allAssets.models.torch.traverse(child => {
            if (child.isMesh && child.material.map) {
                child.material.map.magFilter = THREE.NearestFilter;
                child.material.map.minFilter = THREE.NearestFilter;
            }
        });
    });
}

function onAssetsLoaded(assets) {
    loadingText.style.display = 'none';
    mainInstructions.style.display = 'block';

    initDayNightElements(assets.textures);
    initHandheldTorch(assets.models.torch);

    const groundGeometry = new THREE.PlaneGeometry(MAZE_COLS * TILE_SIZE, MAZE_ROWS * TILE_SIZE, MAZE_COLS, MAZE_ROWS);
    const groundMaterial = new THREE.MeshLambertMaterial({ map: assets.textures.grass });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const wallMaterial = new THREE.MeshLambertMaterial({ map: assets.textures.stone });
    const endMaterial = new THREE.MeshBasicMaterial({ map: assets.textures.diamond });
    buildMaze3D(wallMaterial, endMaterial);

    setupEventListeners();
    animate();
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    playAgainBtn.addEventListener('click', () => location.reload());
    dayNightToggle.addEventListener('click', () => {
        const cyclePos = (gameTime % CYCLE_DURATION) / CYCLE_DURATION;
        gameTime = (cyclePos < 0.5) ? CYCLE_DURATION * 0.75 : CYCLE_DURATION * 0.25;
    });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    blocker.addEventListener('click', () => controls.lock());
    controls.addEventListener('lock', onControlsLock);
    controls.addEventListener('unlock', onControlsUnlock);
}

function buildMaze3D(wallMat, endMat) {
    maze = generateMaze(MAZE_COLS, MAZE_ROWS);
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    
    for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
            if (maze[r][c] === 1) {
                const x = (c - MAZE_COLS / 2) * TILE_SIZE;
                const z = (r - MAZE_ROWS / 2) * TILE_SIZE;
                const wall = new THREE.Mesh(wallGeo.clone(), wallMat.clone());
                wall.position.set(x, WALL_HEIGHT / 2, z);
                scene.add(wall);
                mazeObjects.push(wall);
            }
        }
    }
    for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
            const x = (c - MAZE_COLS / 2) * TILE_SIZE;
            const z = (r - MAZE_ROWS / 2) * TILE_SIZE;
            if (maze[r][c] === 'S') {
                controls.getObject().position.set(x, WALL_HEIGHT / 2, z);
            } else if (maze[r][c] === 'E') {
                endMat.transparent = true;
                const endBlock = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE), endMat.clone());
                endBlock.position.set(x, WALL_HEIGHT / 2, z);
                endBlock.name = "endBlock";
                scene.add(endBlock);
            }
        }
    }
}

// --- World and Environment ---
function initDayNightElements(textures) {
    sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.sun, fog: false }));
    sun.scale.set(30, 30, 1);
    scene.add(sun);

    moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures.moon, fog: false }));
    moon.scale.set(30, 30, 1);
    scene.add(moon);

    const starGeo = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) starVertices.push(THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000));
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, fog: false, size: 0.5 }));
    scene.add(stars);

    cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.SpriteMaterial({ map: textures.cloud, color: 0xffffff, fog: false, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 25; i++) {
        const cloud = new THREE.Sprite(cloudMat.clone());
        cloud.position.set(Math.random() * 400 - 200, Math.random() * 40 + 60, Math.random() * 400 - 200);
        cloud.scale.set(50, 50, 1);
        cloudsGroup.add(cloud);
    }
    scene.add(cloudsGroup);

    const rainGeo = new THREE.BufferGeometry();
    const rainVertices = [];
    for (let i = 0; i < 15000; i++) {
        rainVertices.push(Math.random() * 400 - 200, Math.random() * 200 - 100, Math.random() * 400 - 200);
    }
    rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
    const rainVelocities = [];
    for (let i = 0; i < 15000; i++) {
        rainVelocities.push(Math.random() * 30 + 20);
    }
    rainGeo.setAttribute('velocity', new THREE.Float32BufferAttribute(rainVelocities, 1));
    rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.3, transparent: true, opacity: 0.7 }));
    rain.visible = false;
    scene.add(rain);

    dayAmbientLight = new THREE.AmbientLight(0xcccccc, 1.0);
    scene.add(dayAmbientLight);
    hemisphereLight = new THREE.HemisphereLight(0x607D8B, 0x080820, 0.4);
    scene.add(hemisphereLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 20);
    scene.add(directionalLight);
}

function updateWorldAppearance(cycleProgress) {
    const tempColor = new THREE.Color();
    let currentSkyColor;

    let lightIntensityFactor = 0;
    if (cycleProgress < 0.05) {      // Sunrise
        lightIntensityFactor = cycleProgress / 0.05;
    } else if (cycleProgress < 0.40) { // Full Day
        lightIntensityFactor = 1.0;
    } else if (cycleProgress < 0.50) { // Sunset
        lightIntensityFactor = 1.0 - ((cycleProgress - 0.40) / 0.10);
    } else if (cycleProgress < 0.55) { // Twilight
        lightIntensityFactor = 0.0;
    } else if (cycleProgress < 0.95) { // Full Night
        lightIntensityFactor = 0.0;
    } else {                         // Dawn
        lightIntensityFactor = 0.0;
    }

    if (cycleProgress < 0.05) {      // Sunrise (Dawn -> Day)
        currentSkyColor = tempColor.copy(dawnColor).lerp(dayColor, cycleProgress / 0.05);
        sun.material.color.copy(sunDayColor);
    } else if (cycleProgress < 0.40) { // Full Day
        currentSkyColor = dayColor;
        sunIcon.style.display = 'none'; moonIcon.style.display = 'block';
    } else if (cycleProgress < 0.50) { // Sunset (Day -> Dusk)
        const sunsetProgress = (cycleProgress - 0.40) / 0.10;
        currentSkyColor = tempColor.copy(dayColor).lerp(duskColor, sunsetProgress);
        sun.material.color.copy(sunDayColor).lerp(sunDuskColor, sunsetProgress);
    } else if (cycleProgress < 0.55) { // Twilight (Dusk -> Night)
        const twilightProgress = (cycleProgress - 0.50) / 0.05;
        currentSkyColor = tempColor.copy(duskColor).lerp(nightColor, twilightProgress);
        sunIcon.style.display = 'block'; moonIcon.style.display = 'none';
    } else if (cycleProgress < 0.95) { // Full Night
        currentSkyColor = nightColor;
    } else {                         // Dawn (Night -> Dawn)
        const dawnProgress = (cycleProgress - 0.95) / 0.05;
        currentSkyColor = tempColor.copy(nightColor).lerp(dawnColor, dawnProgress);
        sun.material.color.copy(sunDuskColor).lerp(sunDayColor, dawnProgress);
    }
    scene.background.copy(currentSkyColor);
    scene.fog.color.copy(currentSkyColor);
    cloudsGroup.children.forEach(c => c.material.color.copy(nightCloudColor).lerp(dayCloudColor, lightIntensityFactor));

    const isFullNight = cycleProgress >= 0.55 && cycleProgress < 0.95;
    dayAmbientLight.intensity = 0.1 + lightIntensityFactor * 0.9;
    directionalLight.intensity = lightIntensityFactor * 0.8;
    hemisphereLight.intensity = 0.1 + (1.0 - lightIntensityFactor) * 0.4;
    
    const sunSetTime = 0.50; 
    const sunRiseTime = 0.95;
    if (cycleProgress > sunSetTime && cycleProgress < sunRiseTime) {
        sun.visible = false;
    } else {
        sun.visible = true;
        let sunDayProgress = 0;
        const sunDuration = (1.0 - sunRiseTime) + sunSetTime;
        if (cycleProgress >= sunRiseTime) {
            sunDayProgress = (cycleProgress - sunRiseTime) / sunDuration;
        } else {
            sunDayProgress = ((1.0 - sunRiseTime) + cycleProgress) / sunDuration;
        }
        const sunAngle = sunDayProgress * Math.PI;
        sun.position.set(250 * Math.cos(sunAngle), 250 * Math.sin(sunAngle), -250);
    }

    const moonRiseStart = 0.45; 
    const moonSetEnd = 1.0;
    if (cycleProgress > moonRiseStart && cycleProgress < moonSetEnd) {
        moon.visible = true;
        const moonDuration = moonSetEnd - moonRiseStart;
        const normalizedMoonProgress = (cycleProgress - moonRiseStart) / moonDuration;
        const moonAngle = normalizedMoonProgress * Math.PI;
        moon.position.set(-250 * Math.cos(moonAngle), 250 * Math.sin(moonAngle), 250);
    } else {
        moon.visible = false;
    }

    stars.visible = lightIntensityFactor < 0.3;

    let nightAmbiancePotential = 0;
    if (cycleProgress > 0.45 && cycleProgress < 0.55) {
        nightAmbiancePotential = (cycleProgress - 0.45) / 0.10;
    } else if (cycleProgress >= 0.55 && cycleProgress < 0.95) {
        nightAmbiancePotential = 1.0;
    } else if (cycleProgress >= 0.95 && cycleProgress < 1.0) {
        nightAmbiancePotential = 1.0 - ((cycleProgress - 0.95) / 0.05);
    }
    
    rain.visible = nightAmbiancePotential > 0.1;
    if (rain.visible) {
        rainAudio.volume = nightAmbiancePotential * 0.8;
        nightAudio.volume = nightAmbiancePotential * 0.2;
    } else {
        rainAudio.volume = 0;
        nightAudio.volume = 0;
    }
    
    if (!isFullNight && isTorchOn) {
        isTorchOn = false;
        if(handheldTorch) handheldTorch.visible = false;
    }
}

// --- Player Logic ---
function onControlsLock() {
    blocker.style.display = 'none';
    crosshair.style.display = 'block';
    infoBar.style.display = 'block';
    dayNightToggle.style.display = 'flex';
    if (!startTime) {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 100);
        nightAudio.play().catch(e => {});
        rainAudio.play().catch(e => {});
    }
}

function onControlsUnlock() {
    if (!gameWon) {
        blocker.style.display = 'flex';
    }
    crosshair.style.display = 'none';
    infoBar.style.display = 'none';
    runningAudio.pause();
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = true; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
        case 'ArrowDown': case 'KeyS': moveBackward = true; break;
        case 'ArrowRight': case 'KeyD': moveRight = true; break;
        case 'Space':
            if (canJump) {
                velocity.y += PLAYER_JUMP_VELOCITY;
                jumpAudio.currentTime = 0;
                jumpAudio.play().catch(e => {});
            }
            canJump = false;
            break;
        case 'KeyT':
            const cycleProgress = (gameTime % CYCLE_DURATION) / CYCLE_DURATION;
            const isNightTime = cycleProgress >= 0.55 && cycleProgress < 0.95;
            if (isNightTime && handheldTorch) {
                isTorchOn = !isTorchOn;
                handheldTorch.visible = isTorchOn;
            }
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward = false; break;
        case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
}

function initHandheldTorch(model) {
    if (!model) return;
    handheldTorch = new THREE.Group();
    const torch = model.clone();
    torch.scale.set(0.6, 0.6, 0.6);
    torch.rotation.z = Math.PI / 8;
    handheldTorch.add(torch);
    const torchLight = new THREE.PointLight(0xffaa33, 1.0, TILE_SIZE * 5, 2);
    torchLight.position.set(0, 0.4, 0.1);
    handheldTorch.add(torchLight);
    handheldTorch.position.set(0.5, -0.4, -0.8);
    handheldTorch.visible = false;
    camera.add(handheldTorch);
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    
    if (controls.isLocked) {
        gameTime += delta;
    }
    
    const cycleProgress = (gameTime % CYCLE_DURATION) / CYCLE_DURATION;
    updateWorldAppearance(cycleProgress);

    if (rain && rain.visible) {
        const positions = rain.geometry.attributes.position.array;
        const velocities = rain.geometry.attributes.velocity.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i+1] -= velocities[i/3] * delta;
            if (positions[i+1] < -10) {
                positions[i] = Math.random() * 400 - 200;
                positions[i+1] = Math.random() * 100 + 100;
                positions[i+2] = Math.random() * 400 - 200;
            }
        }
        rain.geometry.attributes.position.needsUpdate = true;
    }

    if (cloudsGroup) {
        cloudsGroup.children.forEach(c => {
            c.position.x += 2 * delta;
            if (c.position.x > 200) c.position.x = -200;
        });
    }

    if (controls.isLocked) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= GRAVITY * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 150.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 150.0 * delta;

        const player = controls.getObject();
        const oldPosition = player.position.clone();

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        const newPosition = player.position.clone();
        player.position.copy(oldPosition);

        player.position.x = newPosition.x;
        for (const wall of mazeObjects) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const playerBox = new THREE.Box3().setFromCenterAndSize(player.position, new THREE.Vector3(PLAYER_RADIUS * 2, WALL_HEIGHT, PLAYER_RADIUS * 2));
            if (playerBox.intersectsBox(wallBox)) {
                player.position.x = oldPosition.x;
                break;
            }
        }
        player.position.z = newPosition.z;
        for (const wall of mazeObjects) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const playerBox = new THREE.Box3().setFromCenterAndSize(player.position, new THREE.Vector3(PLAYER_RADIUS * 2, WALL_HEIGHT, PLAYER_RADIUS * 2));
            if (playerBox.intersectsBox(wallBox)) {
                player.position.z = oldPosition.z;
                break;
            }
        }

        player.position.y += velocity.y * delta;
        if (player.position.y < WALL_HEIGHT / 2) {
            velocity.y = 0;
            player.position.y = WALL_HEIGHT / 2;
            canJump = true;
        }
        
        if (moveForward || moveBackward || moveLeft || moveRight) {
            if (runningAudio.paused && canJump) runningAudio.play().catch(e => {});
        } else {
            runningAudio.pause();
            runningAudio.currentTime = 0;
        }

        const endBlock = scene.getObjectByName("endBlock");
        if (endBlock && player.position.distanceTo(endBlock.position) < TILE_SIZE * 0.8 && !gameWon) {
            gameWon = true;
            controls.unlock();
            clearInterval(timerInterval);
            const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            winTimeDisplay.textContent = `Your time: ${finalTime} seconds.`;
            winModal.style.display = 'flex';
            
            victoryAudio.play().catch(e => {});
            runningAudio.pause();
            nightAudio.pause();
            rainAudio.pause();
        }
    }
    prevTime = time;
    renderer.render(scene, camera);
}

// --- Utility Functions ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateTimer() {
    if (startTime && !gameWon) {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
        infoBar.textContent = `Time: ${elapsedTime}s`;
    }
}
