// Check if THREE.js is loaded
if (typeof THREE === 'undefined') {
    console.error('THREE.js failed to load!');
    alert('Error: THREE.js failed to load. Please refresh the page.');
    throw new Error('THREE.js not loaded');
}

console.log('THREE.js loaded successfully:', THREE.REVISION);
document.getElementById('debug').textContent = 'THREE.js loaded: ' + THREE.REVISION;

// ===== GAME STATE =====
const gameState = {
    playerPosition: { x: 0, y: 1.6, z: 0 },
    cameraRotation: { x: 0, y: 0 },
    keys: {},
    mouseDown: false,
    mouseDelta: { x: 0, y: 0 },
    currentInteractable: null,
    ended: false,
    floatOffset: 0  // For floating camera effect
};

// ===== SCENE SETUP =====
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5e6d3);
scene.fog = new THREE.Fog(0xf5e6d3, 20, 50);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 1.6, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Raycaster for interactions
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ===== AUDIO SYSTEM =====
const audioSystem = {
    listener: null,
    sounds: {},
    initialized: false
};

function initAudio() {
    try {
        // Create audio listener attached to camera
        audioSystem.listener = new THREE.AudioListener();
        camera.add(audioSystem.listener);

        // Create audio loader
        const audioLoader = new THREE.AudioLoader();

        // Clock ticking sound
        audioSystem.sounds.clock = new THREE.Audio(audioSystem.listener);

        // Ambient wind/breeze
        audioSystem.sounds.breeze = new THREE.Audio(audioSystem.listener);

        // Birds chirping
        audioSystem.sounds.birds = new THREE.Audio(audioSystem.listener);

        // Since we don't have audio files, we'll create simple oscillator-based sounds
        // Create AudioContext for procedural sounds
        const audioContext = audioSystem.listener.context;

        // Clock tick sound (short percussive click)
        createClockTick(audioContext);

        // Breeze sound (low frequency filtered noise)
        createBreezeSound(audioContext);

        // Bird chirps (high frequency oscillations)
        createBirdChirps(audioContext);

        audioSystem.initialized = true;
        console.log('Audio system initialized');
    } catch (error) {
        console.warn('Audio initialization failed:', error);
    }
}

function createClockTick(audioContext) {
    // Create a repeating clock tick using gain nodes
    const tickInterval = 1000; // 1 second intervals

    function playTick() {
        if (gameState.ended) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);

        setTimeout(playTick, tickInterval);
    }

    // Start after a short delay
    setTimeout(playTick, 1000);
}

function createBreezeSound(audioContext) {
    // Create a gentle breeze using filtered noise
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.03;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start();
}

function createBirdChirps(audioContext) {
    function playChirp() {
        if (gameState.ended) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Random chirp frequency
        const baseFreq = 1500 + Math.random() * 1000;
        oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.02, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);

        // Random interval between chirps (3-8 seconds)
        const nextChirp = 3000 + Math.random() * 5000;
        setTimeout(playChirp, nextChirp);
    }

    // Start birds after initial delay
    setTimeout(playChirp, 2000);
}

// ===== LIGHTING =====
function setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 0.6);
    scene.add(ambientLight);

    // Main sunlight from window
    const sunLight = new THREE.DirectionalLight(0xfff4d6, 1.0);
    sunLight.position.set(5, 8, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -10;
    sunLight.shadow.camera.right = 10;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    scene.add(sunLight);

    // Warm fill light
    const fillLight = new THREE.PointLight(0xffe4b5, 0.4, 20);
    fillLight.position.set(-3, 3, 0);
    scene.add(fillLight);

    // Additional warm light
    const warmLight = new THREE.PointLight(0xffd7a3, 0.3, 15);
    warmLight.position.set(3, 2, -3);
    scene.add(warmLight);
}

// ===== MATERIALS =====
const materials = {
    wall: new THREE.MeshStandardMaterial({
        color: 0xf5e6d3,
        roughness: 0.8,
        metalness: 0.1
    }),
    floor: new THREE.MeshStandardMaterial({
        color: 0xd4b896,
        roughness: 0.7,
        metalness: 0.2
    }),
    wood: new THREE.MeshStandardMaterial({
        color: 0x8b6f47,
        roughness: 0.6,
        metalness: 0.1
    }),
    darkWood: new THREE.MeshStandardMaterial({
        color: 0x654321,
        roughness: 0.5,
        metalness: 0.1
    }),
    carpet: new THREE.MeshStandardMaterial({
        color: 0xb8860b,
        roughness: 0.9,
        metalness: 0
    }),
    window: new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.9
    }),
    door: new THREE.MeshStandardMaterial({
        color: 0xa0826d,
        roughness: 0.6,
        metalness: 0.1
    }),
    glow: new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.3
    })
};

// ===== INTERACTIVE OBJECTS =====
const interactables = [];

function createGlowEffect(object) {
    const glowGeometry = object.geometry.clone();
    const glowMesh = new THREE.Mesh(glowGeometry, materials.glow);
    glowMesh.scale.multiplyScalar(1.05);
    glowMesh.renderOrder = -1;
    object.add(glowMesh);

    // Pulsing animation
    const startScale = 1.05;
    const endScale = 1.1;
    let growing = true;

    function animateGlow() {
        if (growing) {
            glowMesh.scale.multiplyScalar(1.001);
            if (glowMesh.scale.x >= endScale) growing = false;
        } else {
            glowMesh.scale.multiplyScalar(0.999);
            if (glowMesh.scale.x <= startScale) growing = true;
        }
    }

    return animateGlow;
}

const glowAnimations = [];

// ===== ROOM CREATION =====
function createRoom() {
    const roomGroup = new THREE.Group();

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floor = new THREE.Mesh(floorGeometry, materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(floorGeometry, materials.wall);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    ceiling.receiveShadow = true;
    roomGroup.add(ceiling);

    // Walls
    const wallGeometry = new THREE.PlaneGeometry(10, 4);

    // Back wall
    const backWall = new THREE.Mesh(wallGeometry, materials.wall);
    backWall.position.set(0, 2, -5);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(wallGeometry, materials.wall);
    frontWall.position.set(0, 2, 5);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, materials.wall);
    leftWall.position.set(-5, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, materials.wall);
    rightWall.position.set(5, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    scene.add(roomGroup);
    return roomGroup;
}

// ===== FURNITURE =====
function createDesk() {
    const deskGroup = new THREE.Group();

    // Desk top
    const topGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const top = new THREE.Mesh(topGeometry, materials.wood);
    top.position.y = 0.8;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const positions = [
        [-0.9, 0.4, -0.4],
        [0.9, 0.4, -0.4],
        [-0.9, 0.4, 0.4],
        [0.9, 0.4, 0.4]
    ];

    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, materials.wood);
        leg.position.set(...pos);
        leg.castShadow = true;
        deskGroup.add(leg);
    });

    // Note on desk
    const noteGeometry = new THREE.PlaneGeometry(0.3, 0.2);
    const noteMaterial = new THREE.MeshStandardMaterial({ color: 0xfffef0 });
    const note = new THREE.Mesh(noteGeometry, noteMaterial);
    note.rotation.x = -Math.PI / 2;
    note.position.set(0, 0.86, 0);
    note.castShadow = true;
    deskGroup.add(note);

    deskGroup.position.set(-3, 0, -4);
    deskGroup.userData = {
        type: 'desk',
        interactable: true,
        name: 'Writing Desk'
    };

    const glowAnim = createGlowEffect(top);
    glowAnimations.push(glowAnim);
    interactables.push(deskGroup);

    scene.add(deskGroup);
    return deskGroup;
}

function createCarpet() {
    const carpetGeometry = new THREE.PlaneGeometry(3, 2);
    const carpet = new THREE.Mesh(carpetGeometry, materials.carpet);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, 0);
    carpet.receiveShadow = true;
    carpet.userData = {
        type: 'carpet',
        interactable: true,
        name: 'Patterned Carpet'
    };

    // Add decorative pattern (simple lines)
    const patternGeometry = new THREE.PlaneGeometry(2.8, 1.8);
    const patternMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b7355,
        transparent: true,
        opacity: 0.5
    });
    const pattern = new THREE.Mesh(patternGeometry, patternMaterial);
    pattern.position.set(0, 0.001, 0);
    carpet.add(pattern);

    const glowAnim = createGlowEffect(carpet);
    glowAnimations.push(glowAnim);
    interactables.push(carpet);

    scene.add(carpet);
    return carpet;
}

function createWindow() {
    const windowGroup = new THREE.Group();

    // Window frame
    const frameGeometry = new THREE.BoxGeometry(2.5, 2.5, 0.2);
    const frame = new THREE.Mesh(frameGeometry, materials.wood);
    frame.castShadow = true;
    windowGroup.add(frame);

    // Window panes
    const paneGeometry = new THREE.PlaneGeometry(1.1, 1.1);
    const positions = [
        [-0.6, 0.6, 0.11],
        [0.6, 0.6, 0.11],
        [-0.6, -0.6, 0.11],
        [0.6, -0.6, 0.11]
    ];

    positions.forEach(pos => {
        const pane = new THREE.Mesh(paneGeometry, materials.window);
        pane.position.set(...pos);
        windowGroup.add(pane);
    });

    // Curtains
    const curtainGeometry = new THREE.PlaneGeometry(0.6, 2.5);
    const curtainMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8d5c4,
        side: THREE.DoubleSide
    });

    const leftCurtain = new THREE.Mesh(curtainGeometry, curtainMaterial);
    leftCurtain.position.set(-1.5, 0, 0.15);
    windowGroup.add(leftCurtain);

    const rightCurtain = new THREE.Mesh(curtainGeometry, curtainMaterial);
    rightCurtain.position.set(1.5, 0, 0.15);
    windowGroup.add(rightCurtain);

    windowGroup.position.set(4.9, 2, 0);
    windowGroup.rotation.y = -Math.PI / 2;
    windowGroup.userData = {
        type: 'window',
        interactable: true,
        name: 'Sunlit Window'
    };

    const glowAnim = createGlowEffect(frame);
    glowAnimations.push(glowAnim);
    interactables.push(windowGroup);

    scene.add(windowGroup);
    return windowGroup;
}

function createDoor(type, position, rotation) {
    const doorGroup = new THREE.Group();

    // Door frame
    const frameThickness = 0.1;
    const frameWidth = 1.2;
    const frameHeight = 2.5;

    // Door panel
    const doorGeometry = new THREE.BoxGeometry(frameWidth, frameHeight, 0.1);
    const door = new THREE.Mesh(doorGeometry, materials.door);
    door.castShadow = true;
    door.receiveShadow = true;
    doorGroup.add(door);

    // Door handle
    const handleGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0.4, 0, 0.1);
    doorGroup.add(handle);

    doorGroup.position.set(...position);
    doorGroup.rotation.y = rotation;
    doorGroup.userData = {
        type: type,
        interactable: true,
        name: type === 'doorA' ? 'Door A - Left' : 'Door B - Right'
    };

    const glowAnim = createGlowEffect(door);
    glowAnimations.push(glowAnim);
    interactables.push(doorGroup);

    scene.add(doorGroup);
    return doorGroup;
}

function createBookshelf() {
    const shelfGroup = new THREE.Group();

    // Main structure
    const backGeometry = new THREE.BoxGeometry(2, 2.5, 0.1);
    const back = new THREE.Mesh(backGeometry, materials.darkWood);
    back.castShadow = true;
    back.receiveShadow = true;
    shelfGroup.add(back);

    // Shelves
    for (let i = 0; i < 5; i++) {
        const shelfGeometry = new THREE.BoxGeometry(2, 0.05, 0.3);
        const shelf = new THREE.Mesh(shelfGeometry, materials.darkWood);
        shelf.position.set(0, -1 + i * 0.6, 0.1);
        shelf.castShadow = true;
        shelfGroup.add(shelf);
    }

    // Books (simple colored boxes)
    const bookColors = [0x8b0000, 0x00008b, 0x006400, 0x8b8b00, 0x4b0082];
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
            const bookGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.25);
            const bookMaterial = new THREE.MeshStandardMaterial({
                color: bookColors[Math.floor(Math.random() * bookColors.length)]
            });
            const book = new THREE.Mesh(bookGeometry, bookMaterial);
            book.position.set(-0.6 + j * 0.6, -0.8 + i * 0.6, 0.2);
            book.castShadow = true;
            shelfGroup.add(book);
        }
    }

    // Photo frame with code
    const frameGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.05);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    const photoFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    photoFrame.position.set(0.6, 0.8, 0.2);
    photoFrame.castShadow = true;

    // Add glowing effect to frame
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.6
    });
    const glowFrame = new THREE.Mesh(frameGeometry, glowMat);
    glowFrame.scale.multiplyScalar(1.1);
    photoFrame.add(glowFrame);

    shelfGroup.add(photoFrame);

    shelfGroup.position.set(-4.85, 1.25, 2);
    shelfGroup.rotation.y = Math.PI / 2;
    shelfGroup.userData = {
        type: 'bookshelf',
        interactable: true,
        name: 'Bookshelf with Photo Frame'
    };

    const glowAnim = createGlowEffect(back);
    glowAnimations.push(glowAnim);
    interactables.push(shelfGroup);

    scene.add(shelfGroup);
    return shelfGroup;
}

function createPainting() {
    const paintingGroup = new THREE.Group();

    // Frame
    const frameGeometry = new THREE.BoxGeometry(1.5, 1.2, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.castShadow = true;
    paintingGroup.add(frame);

    // Canvas
    const canvasGeometry = new THREE.PlaneGeometry(1.3, 1.0);
    const canvasMaterial = new THREE.MeshStandardMaterial({
        color: 0x87ceeb,
        roughness: 0.8
    });
    const canvas = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvas.position.z = 0.06;
    paintingGroup.add(canvas);

    paintingGroup.position.set(-4.85, 2.5, -2);
    paintingGroup.rotation.y = Math.PI / 2;
    paintingGroup.userData = {
        type: 'painting',
        interactable: true,
        name: 'Mysterious Painting'
    };

    const glowAnim = createGlowEffect(frame);
    glowAnimations.push(glowAnim);
    interactables.push(paintingGroup);

    scene.add(paintingGroup);
    return paintingGroup;
}

// ===== INITIALIZE SCENE =====
function initScene() {
    document.getElementById('debug').textContent = 'Building scene...';
    setupLighting();
    createRoom();
    createDesk();
    createCarpet();
    createWindow();
    createDoor('doorA', [-4.9, 1.25, -2], Math.PI / 2);
    createDoor('doorB', [-4.9, 1.25, 2], Math.PI / 2);
    createBookshelf();
    createPainting();
    document.getElementById('debug').textContent = 'Scene ready! Controls: WASD/Arrows + Mouse';

    // Initialize audio on first user interaction (required by browsers)
    const startAudio = () => {
        if (!audioSystem.initialized) {
            initAudio();
            document.removeEventListener('click', startAudio);
            document.removeEventListener('keydown', startAudio);
        }
    };
    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);

    // Hide debug after 3 seconds
    setTimeout(() => {
        const debugEl = document.getElementById('debug');
        if (debugEl) debugEl.style.opacity = '0';
        setTimeout(() => {
            if (debugEl) debugEl.style.display = 'none';
        }, 1000);
    }, 3000);
}

// ===== PLAYER CONTROLS =====
function updatePlayerMovement(delta) {
    if (gameState.ended) return;

    const moveSpeed = 2.5 * delta;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get camera direction
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    right.normalize();

    const movement = new THREE.Vector3();

    // WASD and Arrow keys
    if (gameState.keys['w'] || gameState.keys['W'] || gameState.keys['ArrowUp']) {
        movement.add(forward);
    }
    if (gameState.keys['s'] || gameState.keys['S'] || gameState.keys['ArrowDown']) {
        movement.sub(forward);
    }
    if (gameState.keys['a'] || gameState.keys['A'] || gameState.keys['ArrowLeft']) {
        movement.sub(right);
    }
    if (gameState.keys['d'] || gameState.keys['D'] || gameState.keys['ArrowRight']) {
        movement.add(right);
    }

    if (movement.length() > 0) {
        movement.normalize().multiplyScalar(moveSpeed);
        camera.position.add(movement);

        // Keep player within room bounds
        camera.position.x = Math.max(-4.5, Math.min(4.5, camera.position.x));
        camera.position.z = Math.max(-4.5, Math.min(4.5, camera.position.z));
    }

    // Gentle floating camera motion (dreamlike effect)
    gameState.floatOffset += delta * 0.8;
    const floatY = Math.sin(gameState.floatOffset) * 0.02; // Subtle vertical bobbing
    camera.position.y = 1.6 + floatY;
}

function updateCameraRotation() {
    if (gameState.ended) return;

    if (gameState.mouseDown && (Math.abs(gameState.mouseDelta.x) > 0 || Math.abs(gameState.mouseDelta.y) > 0)) {
        const sensitivity = 0.002;

        gameState.cameraRotation.y -= gameState.mouseDelta.x * sensitivity;
        gameState.cameraRotation.x -= gameState.mouseDelta.y * sensitivity;

        // Limit vertical rotation
        gameState.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.cameraRotation.x));

        // Apply rotation
        camera.rotation.set(0, 0, 0);
        camera.rotateY(gameState.cameraRotation.y);
        camera.rotateX(gameState.cameraRotation.x);

        gameState.mouseDelta.x = 0;
        gameState.mouseDelta.y = 0;
    }
}

// ===== INTERACTION SYSTEM =====
function checkInteractables() {
    if (gameState.ended) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactables, true);

    const hint = document.getElementById('interaction-hint');

    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.interactable) {
            obj = obj.parent;
        }

        if (obj.userData.interactable) {
            gameState.currentInteractable = obj;
            hint.textContent = `Click to examine: ${obj.userData.name}`;
            hint.classList.add('show');
            document.body.style.cursor = 'pointer';
            return;
        }
    }

    gameState.currentInteractable = null;
    hint.classList.remove('show');
    document.body.style.cursor = 'default';
}

function handleInteraction() {
    if (!gameState.currentInteractable || gameState.ended) return;

    const type = gameState.currentInteractable.userData.type;

    switch(type) {
        case 'desk':
            showNarrative(
                'The Writing Desk',
                'A beautiful wooden desk with smooth, polished surfaces. On it rests a single handwritten note on cream-colored paper.\n\nThe elegant script reads:\n\n"Every door leads somewhere, but not all roads leave the room.\n\nSeek the light, follow the water, or discover what hides in plain sight.\n\nThe choice is yours, dreamer."\n\nA simple sketch at the bottom shows: Door A, Door B, the Window, and what appears to be a painting.',
                []
            );
            break;

        case 'carpet':
            showNarrative(
                'The Patterned Carpet',
                'An elegant patterned carpet with golden and brown hues. Its intricate design depicts swirling vines and ancient symbols.\n\nSoft and warm beneath your feet, it adds comfort to the wooden floor.',
                []
            );
            break;

        case 'window':
            showNarrative(
                'The Sunlit Window',
                'Warm golden sunlight streams through the glass panes, illuminating dancing dust motes in the air.\n\nBeyond the window lies a breathtaking view: endless blue sky, white clouds drifting lazily above a wide valley far below. The world outside seems to shimmer with an ethereal glow.\n\nA gentle breeze whispers through the glass. You feel drawn to step forward... into the light.',
                [
                    { text: 'Step through the window', action: () => endingFallOfLight() },
                    { text: 'Turn back to the room', action: () => hideNarrative() }
                ]
            );
            break;

        case 'doorA':
            showNarrative(
                'Door A - The Corridor of Light',
                'The heavy wooden door is warm to the touch, almost humming with energy.\n\nWhen you press your ear against it, you hear nothing — yet sense something vast beyond. A corridor of infinite light, perhaps? A space where gravity itself might fade away.\n\nThe brass handle gleams, waiting.',
                [
                    { text: 'Open the door and enter', action: () => endingDispersedMemory() },
                    { text: 'Step away', action: () => hideNarrative() }
                ]
            );
            break;

        case 'doorB':
            showNarrative(
                'Door B - The Water\'s Edge',
                'This door feels cool and slightly damp to the touch. You catch the faint scent of fresh water and hear the gentle sound of flowing streams.\n\nSomewhere beyond lies water — peaceful, inviting, and mysterious. You imagine a tranquil pool shimmering with sunlight, a whirlpool spinning slowly at its center...\n\nDo you dare to see what awaits?',
                [
                    { text: 'Open the door', action: () => endingWaterOfRebirth() },
                    { text: 'Leave it closed', action: () => hideNarrative() }
                ]
            );
            break;

        case 'painting':
            showNarrative(
                'The Mysterious Painting',
                'An exquisite landscape painting: rolling green hills beneath a pastel sky of soft pinks and blues. The brushstrokes are delicate, dreamlike.\n\nSomething about it draws you in. As you examine the ornate wooden frame, you notice it sits slightly loose against the wall, as if concealing something behind...\n\nCuriosity stirs within you.',
                [
                    { text: 'Look behind the painting', action: () => revealKeypad() },
                    { text: 'Simply admire it', action: () => hideNarrative() }
                ]
            );
            break;

        case 'bookshelf':
            showNarrative(
                'The Bookshelf',
                'Rows of leather-bound books line the dark wooden shelves — volumes of poetry, philosophy, and forgotten tales. Their spines show rich colors: deep crimson, navy blue, forest green.\n\nAmong them, a golden photo frame stands out prominently. Inside the frame, elegant calligraphy displays four numbers:\n\n"7853"\n\nA code? A date? A clue?',
                []
            );
            break;
    }
}

// ===== NARRATIVE SYSTEM =====
function showNarrative(title, text, choices) {
    const narrative = document.getElementById('narrative');
    const narrativeTitle = document.getElementById('narrative-title');
    const narrativeText = document.getElementById('narrative-text');
    const narrativeChoices = document.getElementById('narrative-choices');

    narrativeTitle.textContent = title;
    narrativeText.textContent = text;

    narrativeChoices.innerHTML = '';
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.onclick = choice.action;
        narrativeChoices.appendChild(btn);
    });

    if (choices.length === 0) {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = 'Close';
        btn.onclick = () => hideNarrative();
        narrativeChoices.appendChild(btn);
    }

    narrative.classList.add('show');
}

function hideNarrative() {
    document.getElementById('narrative').classList.remove('show');
}

// ===== SPECIAL ACTIONS =====
function revealKeypad() {
    hideNarrative();
    const codePanel = document.getElementById('code-input-panel');
    codePanel.classList.add('show');
    document.getElementById('code-input').value = '';
    document.getElementById('code-input').focus();
}

function submitCode() {
    const code = document.getElementById('code-input').value;
    const codePanel = document.getElementById('code-input-panel');

    if (code === '7853') {
        codePanel.classList.remove('show');
        endingGentleCage();
    } else {
        showNarrative(
            'Incorrect Code',
            'The keypad beeps softly. The code is incorrect. Perhaps there\'s a clue somewhere in the room?',
            []
        );
        codePanel.classList.remove('show');
    }
}

function cancelCode() {
    document.getElementById('code-input-panel').classList.remove('show');
}

// ===== ENDINGS =====
function endingFallOfLight() {
    hideNarrative();
    gameState.ended = true;

    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        showEnding(
            'Fall of Light',
            'You step forward through the window frame.\n\nThe moment your foot crosses the threshold, the world transforms.\n\nGlass dissolves. The room fades. Sky and stone blend into pure luminescence.\n\nGravity releases its hold. You float — weightless, peaceful — into an endless expanse of clouds and golden sunlight.\n\nThe valley below becomes distant, then vanishes entirely.\n\nYou are light. You are sky. You are everywhere and nowhere.\n\nEverything fades into pure, brilliant radiance.\n\nYou have escaped.'
        );
    }, 2000);
}

function endingDispersedMemory() {
    hideNarrative();
    gameState.ended = true;

    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        showEnding(
            'Dispersed Memory',
            'You open Door A and step into a corridor bathed in soft, radiant light.\n\nThe hallway stretches endlessly ahead, glowing with warmth. Each step you take feels lighter than the last.\n\nBeneath your feet, the floor becomes translucent — then transparent. You see stars below, galaxies swirling in the depths.\n\nGravity loosens its grip. Your footsteps make no sound.\n\nBehind you, the room grows distant, blurred, as if viewed through frosted glass. It shimmers... then fades entirely.\n\nYour own body feels lighter, less solid. You look at your hands and see light passing through them.\n\nYou are dissolving — not into nothing, but into everything.\n\nParticles of memory, scattered into infinity.\n\nPeaceful. Free. Dispersed.'
        );
    }, 2000);
}

function endingWaterOfRebirth() {
    hideNarrative();
    gameState.ended = true;

    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        showEnding(
            'Water of Rebirth',
            'You push open Door B and step into brilliant sunlight.\n\nBefore you lies a tranquil pool of crystal-clear water, shimmering like liquid glass. Gentle ripples dance across its surface, catching the light.\n\nAt the pool\'s center, water spirals slowly downward into a luminous whirlpool — glowing with soft blue and white light.\n\nYou feel drawn to it. An invisible pull, gentle but irresistible.\n\nYour feet carry you forward. The water is warm as you wade in. Peaceful. Safe.\n\nThe whirlpool grows closer. Its light intensifies.\n\nYou reach the center.\n\nThe world begins to spin — water, light, warmth, everything swirling together.\n\nYou close your eyes...\n\n...and when you open them again, you stand in the sunlit room.\n\nAs if awakening from a dream.\n\nThe cycle begins anew.'
        );

        // Special: restart after this ending
        setTimeout(() => {
            location.reload();
        }, 8000);
    }, 2000);
}

function endingGentleCage() {
    gameState.ended = true;

    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        showEnding(
            'Gentle Cage',
            'The keypad beeps softly — a pleasant, melodic tone.\n\nYou hear a mechanical click. A hidden panel in the wall slides open, revealing a secret passage.\n\nCurious, you step through.\n\nBeyond lies a hidden garden, bathed in perpetual golden afternoon light.\n\nLush green grass spreads beneath your feet. A gentle breeze carries the scent of wildflowers. In the distance, white rabbits hop peacefully between patches of clover.\n\nA graceful willow tree sways at the garden\'s heart. Beneath its branches lies a soft picnic mat, as if waiting just for you.\n\nYou walk over and lie down. The grass cushions you. The breeze whispers through the willow leaves.\n\nWarm sunlight filters through the branches. Your eyes grow heavy. Peace settles over you like a soft blanket.\n\nPerhaps this is the true escape...\n\nOr perhaps the gentlest cage of all.\n\nYou close your eyes and drift away.'
        );
    }, 2000);
}

function showEnding(title, description) {
    const overlay = document.getElementById('ending-overlay');
    const endingText = document.getElementById('ending-text');
    const endingTitle = document.getElementById('ending-title');
    const endingDescription = document.getElementById('ending-description');

    endingTitle.textContent = title;
    endingDescription.textContent = description;

    setTimeout(() => {
        endingText.classList.add('show');
    }, 500);
}

function restartGame() {
    location.reload();
}

// ===== EVENT LISTENERS =====
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        if (gameState.currentInteractable) {
            handleInteraction();
        } else {
            gameState.mouseDown = true;
        }
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        gameState.mouseDown = false;
    }
});

window.addEventListener('mousemove', (e) => {
    if (gameState.mouseDown) {
        gameState.mouseDelta.x += e.movementX;
        gameState.mouseDelta.y += e.movementY;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('submit-code').addEventListener('click', submitCode);
document.getElementById('cancel-code').addEventListener('click', cancelCode);
document.getElementById('code-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitCode();
});
document.getElementById('restart-btn').addEventListener('click', restartGame);

// ===== ANIMATION LOOP =====
let lastTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);

    const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    updatePlayerMovement(delta);
    updateCameraRotation();
    checkInteractables();

    // Animate glows
    glowAnimations.forEach(anim => anim());

    renderer.render(scene, camera);
}

// ===== START GAME =====
initScene();
animate(0);
