import { TILE_SIZE, WALL_HEIGHT, PLAYER_RADIUS } from './config.js';

export class Player {
    constructor(camera, domElement, game) {
        this.camera = camera;
        this.controls = new THREE.PointerLockControls(camera, domElement);
        this.game = game;

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.isTorchOn = false;
        
        this.handheldTorch = null;
        
        this.audio = {
            running: document.getElementById('running-audio'),
            jump: document.getElementById('jump-audio'),
            victory: document.getElementById('victory-audio'),
            night: document.getElementById('night-audio'),
            rain: document.getElementById('rain-audio')
        };

        this.initEventListeners();
    }

    getControls() {
        return this.controls;
    }

    setControlsCallback(onLock, onUnlock) {
        this.controls.addEventListener('lock', onLock);
        this.controls.addEventListener('unlock', onUnlock);
    }
    
    initHandheldTorch(model) {
        if (!model) return;
        this.handheldTorch = new THREE.Group();

        const torch = model.clone();
        torch.scale.set(0.6, 0.6, 0.6);
        torch.rotation.z = Math.PI / 8;
        this.handheldTorch.add(torch);
        
        const torchLight = new THREE.PointLight(0xffaa33, 1.0, TILE_SIZE * 5, 2);
        torchLight.position.set(0, 0.4, 0.1);
        this.handheldTorch.add(torchLight);

        this.handheldTorch.position.set(0.5, -0.4, -0.8);
        this.handheldTorch.visible = false;
        this.camera.add(this.handheldTorch);
    }
    
    initEventListeners() {
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': this.moveForward = true; break;
            case 'ArrowLeft': case 'KeyA': this.moveLeft = true; break;
            case 'ArrowDown': case 'KeyS': this.moveBackward = true; break;
            case 'ArrowRight': case 'KeyD': this.moveRight = true; break;
            case 'Space': 
                if (this.canJump) {
                    this.velocity.y += 30;
                    this.audio.jump.currentTime = 0;
                    this.audio.jump.play().catch(e => {});
                }
                this.canJump = false;
                break;
            case 'KeyT':
                if (this.game.world && this.game.world.isNight() && this.handheldTorch) {
                    this.isTorchOn = !this.isTorchOn;
                    this.handheldTorch.visible = this.isTorchOn;
                }
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': this.moveForward = false; break;
            case 'ArrowLeft': case 'KeyA': this.moveLeft = false; break;
            case 'ArrowDown': case 'KeyS': this.moveBackward = false; break;
            case 'ArrowRight': case 'KeyD': this.moveRight = false; break;
        }
    }
    
    win() {
        this.controls.unlock();
        this.moveForward = this.moveBackward = this.moveLeft = this.moveRight = false;
        this.audio.victory.play().catch(e => {});
        this.audio.running.pause();
        this.audio.night.pause();
        this.audio.rain.pause();
    }

    update(delta, mazeObjects, isNight) {
        this.isNight = isNight;
        if (!this.controls.isLocked) {
             if (!this.audio.running.paused) this.audio.running.pause();
            return;
        }

        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) {
            if (this.audio.running.paused && this.canJump) {
                this.audio.running.play().catch(e => {});
            }
        } else {
            this.audio.running.pause();
            this.audio.running.currentTime = 0;
        }

        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 9.8 * 18.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 150.0 * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 150.0 * delta;
        
        const playerObject = this.controls.getObject();
        const oldPosition = playerObject.position.clone();
        
        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);
        
        const newPosition = playerObject.position.clone();
        playerObject.position.copy(oldPosition);
        
        playerObject.position.x = newPosition.x;
        for (const wall of mazeObjects) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const playerBox = new THREE.Box3().setFromCenterAndSize(playerObject.position, new THREE.Vector3(PLAYER_RADIUS * 2, WALL_HEIGHT, PLAYER_RADIUS * 2));
            if (playerBox.intersectsBox(wallBox)) {
                playerObject.position.x = oldPosition.x;
                break;
            }
        }
        
        playerObject.position.z = newPosition.z;
        for (const wall of mazeObjects) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const playerBox = new THREE.Box3().setFromCenterAndSize(playerObject.position, new THREE.Vector3(PLAYER_RADIUS * 2, WALL_HEIGHT, PLAYER_RADIUS * 2));
            if (playerBox.intersectsBox(wallBox)) {
                playerObject.position.z = oldPosition.z;
                break;
            }
        }

        playerObject.position.y += this.velocity.y * delta;
        if (playerObject.position.y < WALL_HEIGHT / 2) {
            this.velocity.y = 0;
            playerObject.position.y = WALL_HEIGHT / 2;
            this.canJump = true;
        }

        if (!isNight && this.isTorchOn) {
            this.isTorchOn = false;
            if(this.handheldTorch) this.handheldTorch.visible = false;
        }
    }
}

