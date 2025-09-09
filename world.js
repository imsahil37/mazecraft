import { dayColor, nightColor, duskColor, dawnColor, dayCloudColor, nightCloudColor, CYCLE_DURATION } from './config.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.gameTime = 0;
        this.nightAudio = document.getElementById('night-audio');
        this.rainAudio = document.getElementById('rain-audio');
    }

    init(textures) {
        const sunMaterial = new THREE.SpriteMaterial({ map: textures.sun, fog: false });
        this.sun = new THREE.Sprite(sunMaterial);
        this.sun.scale.set(30, 30, 1);
        this.scene.add(this.sun);

        const moonMaterial = new THREE.SpriteMaterial({ map: textures.moon, fog: false });
        this.moon = new THREE.Sprite(moonMaterial);
        this.moon.scale.set(30, 30, 1);
        this.scene.add(this.moon);

        const starVertices = [];
        for (let i = 0; i < 10000; i++) {
            starVertices.push(THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000), THREE.MathUtils.randFloatSpread(2000));
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        this.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, fog: false, size: 0.5 }));
        this.scene.add(this.stars);
        
        this.cloudsGroup = new THREE.Group();
        const cloudMaterial = new THREE.SpriteMaterial({ map: textures.cloud, color: 0xffffff, fog: false, transparent: true, opacity: 0.8 });
        for (let i = 0; i < 25; i++) {
            const cloud = new THREE.Sprite(cloudMaterial.clone());
            cloud.position.set(Math.random() * 400 - 200, Math.random() * 40 + 60, Math.random() * 400 - 200);
            cloud.scale.set(50, 50, 1);
            this.cloudsGroup.add(cloud);
        }
        this.scene.add(this.cloudsGroup);

        const rainVertices = [];
        for (let i = 0; i < 15000; i++) {
            rainVertices.push(Math.random() * 400 - 200, Math.random() * 200 - 100, Math.random() * 400 - 200);
        }
        const rainGeometry = new THREE.BufferGeometry();
        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
        this.rain = new THREE.Points(rainGeometry, new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.3, transparent: true, opacity: 0.7 }));
        this.rain.visible = false;
        this.scene.add(this.rain);
        
        this.dayAmbientLight = new THREE.AmbientLight(0xcccccc, 1.0);
        this.scene.add(this.dayAmbientLight);
        
        this.hemisphereLight = new THREE.HemisphereLight(0x607D8B, 0x080820, 0.4);
        this.scene.add(this.hemisphereLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 100, 20);
        this.scene.add(this.directionalLight);
    }
    
    isNight() {
        const cycleProgress = (this.gameTime % CYCLE_DURATION) / CYCLE_DURATION;
        return cycleProgress >= 0.35 && cycleProgress < 0.95;
    }

    update(delta, isLocked) {
        if(isLocked) {
            this.gameTime += delta;
        }
        const cycleProgress = (this.gameTime % CYCLE_DURATION) / CYCLE_DURATION;

        this.updateSky(cycleProgress);
        this.updateClouds(delta);
        this.updateRain(delta);
    }

    updateSky(cycleProgress) {
        const tempColor = new THREE.Color();
        let subProgress;
        let currentSkyColor;
        const isNight = this.isNight();
        
        const tempCloudColor = new THREE.Color();
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');

        if (cycleProgress < 0.30) { 
            currentSkyColor = dayColor;
            sunIcon.style.display = 'none'; moonIcon.style.display = 'block';
            tempCloudColor.copy(dayCloudColor);
        } else if (cycleProgress < 0.35) {
            subProgress = (cycleProgress - 0.30) / 0.05;
            currentSkyColor = tempColor.copy(dayColor).lerp(duskColor, subProgress);
            tempCloudColor.copy(dayCloudColor).lerp(nightCloudColor, subProgress);
            sunIcon.style.display = 'none'; moonIcon.style.display = 'block';
        } else if (cycleProgress < 0.95) {
            subProgress = (cycleProgress - 0.35) / 0.60;
            currentSkyColor = tempColor.copy(duskColor).lerp(nightColor, subProgress);
            tempCloudColor.copy(nightCloudColor);
            sunIcon.style.display = 'block'; moonIcon.style.display = 'none';
        } else {
            subProgress = (cycleProgress - 0.95) / 0.05;
            currentSkyColor = tempColor.copy(nightColor).lerp(dawnColor, subProgress);
            tempCloudColor.copy(nightCloudColor).lerp(dayCloudColor, subProgress);
            sunIcon.style.display = 'block'; moonIcon.style.display = 'none';
        }
        
        if (cycleProgress > 0.98) {
            subProgress = (cycleProgress - 0.98) / 0.02;
            currentSkyColor = tempColor.copy(dawnColor).lerp(dayColor, subProgress);
            tempCloudColor.copy(dayCloudColor);
        }
        
        this.scene.background.copy(currentSkyColor);
        this.scene.fog.color.copy(currentSkyColor);
        this.cloudsGroup.children.forEach(c => c.material.color.copy(tempCloudColor));

        const angle = cycleProgress * 2 * Math.PI + Math.PI / 2;
        this.sun.position.set(250 * Math.cos(angle), 250 * Math.sin(angle), -250);
        this.moon.position.set(-250 * Math.cos(angle), -250 * Math.sin(angle), 250);

        this.dayAmbientLight.intensity = Math.max(0, 0.5 + 0.5 * Math.sin(angle));
        this.directionalLight.intensity = Math.max(0, 0.8 * Math.sin(angle));
        this.hemisphereLight.intensity = Math.max(0, 0.4 * -Math.sin(angle));

        this.stars.visible = Math.sin(angle) < 0; 
        
        let nightVolume = 0;
        if(cycleProgress > 0.30 && cycleProgress < 0.40) {
            nightVolume = (cycleProgress - 0.30) / 0.10;
        } else if (isNight) {
            nightVolume = 1.0;
        } else if (cycleProgress > 0.95 && cycleProgress < 1.0) {
             nightVolume = 1.0 - ((cycleProgress - 0.95) / 0.05);
        }
        this.nightAudio.volume = Math.max(0, Math.min(1, nightVolume));
        this.rainAudio.volume = this.nightAudio.volume * 0.5;
        if (this.rain) this.rain.visible = isNight;
    }
    
    updateClouds(delta) {
        this.cloudsGroup.children.forEach(cloud => {
            cloud.position.x += 2 * delta;
            if (cloud.position.x > 200) {
                cloud.position.x = -200;
                cloud.position.z = Math.random() * 400 - 200;
            }
        });
    }
    
    updateRain(delta) {
        if (this.rain && this.rain.visible) {
            const positions = this.rain.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] -= 30 * delta;
                if (positions[i] < -10) {
                    positions[i] = 100;
                }
            }
            this.rain.geometry.attributes.position.needsUpdate = true;
        }
    }
}

