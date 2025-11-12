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
    targetPosition: { x: 0, y: 1.6, z: 0 }, // For delayed movement
    cameraRotation: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 }, // For delayed rotation
    keys: {},
    mouseDown: false,
    mouseDelta: { x: 0, y: 0 },
    currentInteractable: null,
    ended: false,
    floatOffset: 0,  // For floating camera effect
    breatheOffset: 0  // For breathing walls effect
};

// ===== SCENE SETUP =====
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfff9f0); // Pale, oversaturated cream-white
scene.fog = new THREE.Fog(0xfff9f0, 15, 40); // Denser, closer fog for dreamlike atmosphere

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
    // Create an IRREGULAR clock tick - dreamcore aesthetic
    let tickIntervals = [800, 1200, 900, 1100, 1300, 850, 1050]; // Irregular patterns
    let tickIndex = 0;
    let isReversed = false;

    function playTick() {
        if (gameState.ended) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Slightly different pitch each time for unsettling effect
        oscillator.frequency.value = 750 + Math.random() * 100;
        gainNode.gain.setValueAtTime(0.06, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.08);

        // Irregular interval
        tickIndex = (tickIndex + 1) % tickIntervals.length;
        const nextInterval = tickIntervals[tickIndex];

        // Occasionally reverse the ticking sound direction
        if (Math.random() < 0.15) {
            isReversed = !isReversed;
            // Play a reversed-sounding tick (higher to lower pitch)
            setTimeout(() => {
                if (gameState.ended) return;
                const revOsc = audioContext.createOscillator();
                const revGain = audioContext.createGain();
                revOsc.connect(revGain);
                revGain.connect(audioContext.destination);

                revOsc.frequency.setValueAtTime(850, audioContext.currentTime);
                revOsc.frequency.exponentialRampToValueAtTime(700, audioContext.currentTime + 0.1);
                revGain.gain.setValueAtTime(0.04, audioContext.currentTime);
                revGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

                revOsc.start(audioContext.currentTime);
                revOsc.stop(audioContext.currentTime + 0.1);
            }, 150);
        }

        setTimeout(playTick, nextInterval);
    }

    // Start after a short delay
    setTimeout(playTick, 1500);
}

function createBreezeSound(audioContext) {
    // Create a LOW FREQUENCY HUM/DRONE - dreamcore ambient
    const bufferSize = audioContext.sampleRate * 4;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate low-frequency drone noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Very low pass filter for deep drone
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    filter.Q.value = 2;

    // Add reverb/echo effect with delay
    const delay = audioContext.createDelay();
    delay.delayTime.value = 0.3;

    const feedbackGain = audioContext.createGain();
    feedbackGain.gain.value = 0.2;

    const mainGain = audioContext.createGain();
    mainGain.gain.value = 0.04;

    noise.connect(filter);
    filter.connect(delay);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay); // Feedback loop for echo
    delay.connect(mainGain);
    filter.connect(mainGain);
    mainGain.connect(audioContext.destination);

    noise.start();

    // Add slowly oscillating bass drone
    const bassOsc = audioContext.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 55; // Very low frequency
    const bassGain = audioContext.createGain();
    bassGain.gain.value = 0.02;

    // Slowly modulate the bass frequency for unease
    const lfo = audioContext.createOscillator();
    lfo.frequency.value = 0.1;
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 5;

    lfo.connect(lfoGain);
    lfoGain.connect(bassOsc.frequency);

    bassOsc.connect(bassGain);
    bassGain.connect(audioContext.destination);

    bassOsc.start();
    lfo.start();
}

function createBirdChirps(audioContext) {
    // Create DISTANT ECHOING SOUNDS - dreamcore ambient
    function playChirp() {
        if (gameState.ended) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Add delay for echo effect
        const delay = audioContext.createDelay();
        delay.delayTime.value = 0.5; // Half-second delay for dreamlike echo

        const delayFeedback = audioContext.createGain();
        delayFeedback.gain.value = 0.4;

        oscillator.connect(gainNode);
        gainNode.connect(delay);
        delay.connect(delayFeedback);
        delayFeedback.connect(delay); // Feedback
        delay.connect(audioContext.destination);
        gainNode.connect(audioContext.destination);

        // More distant, ethereal frequency
        const baseFreq = 1800 + Math.random() * 800;
        oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.015, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        // Much longer intervals - more sparse and unsettling (5-12 seconds)
        const nextChirp = 5000 + Math.random() * 7000;
        setTimeout(playChirp, nextChirp);
    }

    // Start distant sounds after longer delay
    setTimeout(playChirp, 4000);
}

// ===== LIGHTING =====
function setupLighting() {
    // OVERSATURATED ambient light - dreamcore
    const ambientLight = new THREE.AmbientLight(0xfffff0, 0.85);
    scene.add(ambientLight);

    // Main sourceless light - brighter, no clear origin
    const sunLight = new THREE.DirectionalLight(0xfffef8, 1.4);
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
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    // Faint pink light leak - dreamcore aesthetic
    const pinkLight = new THREE.PointLight(0xffd5e5, 0.35, 25);
    pinkLight.position.set(-4, 2, 0);
    scene.add(pinkLight);

    // Pale blue accent - liminal quality
    const blueAccent = new THREE.PointLight(0xe8f4ff, 0.25, 20);
    blueAccent.position.set(4, 2, -2);
    scene.add(blueAccent);

    // Subtle golden glow from nowhere
    const goldenGlow = new THREE.PointLight(0xfff5d0, 0.3, 18);
    goldenGlow.position.set(0, 3, 4);
    scene.add(goldenGlow);
}

// ===== MATERIALS =====
const materials = {
    wall: new THREE.MeshStandardMaterial({
        color: 0xfffef5, // Pale, almost white
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.98 // Slightly translucent
    }),
    floor: new THREE.MeshStandardMaterial({
        color: 0xf0e8d8, // Faded wood tone
        roughness: 0.75,
        metalness: 0.15,
        transparent: true,
        opacity: 0.95
    }),
    wood: new THREE.MeshPhysicalMaterial({
        color: 0xc4a880, // Lighter, dreamlike wood
        roughness: 0.6,
        metalness: 0.08,
        transparent: true,
        opacity: 0.92, // Translucent wood - dreamcore
        transmission: 0.05
    }),
    darkWood: new THREE.MeshPhysicalMaterial({
        color: 0x9d8066, // Muted brown
        roughness: 0.5,
        metalness: 0.08,
        transparent: true,
        opacity: 0.90,
        transmission: 0.08
    }),
    carpet: new THREE.MeshStandardMaterial({
        color: 0xd4af7a, // Faded gold
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0.88
    }),
    window: new THREE.MeshPhysicalMaterial({
        color: 0xfff9f9,
        transparent: true,
        opacity: 0.2,
        roughness: 0.05,
        metalness: 0.05,
        transmission: 0.95,
        ior: 1.5
    }),
    door: new THREE.MeshPhysicalMaterial({
        color: 0xb89876, // Pale wood door
        roughness: 0.65,
        metalness: 0.05,
        transparent: true,
        opacity: 0.93,
        transmission: 0.03
    }),
    glow: new THREE.MeshBasicMaterial({
        color: 0xffeac5, // Soft golden glow
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
    })
};

// ===== INTERACTIVE OBJECTS =====
const interactables = [];
const breathingWalls = []; // Store wall references for breathing animation

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
    backWall.userData.initialZ = -5; // Store initial position
    roomGroup.add(backWall);
    breathingWalls.push(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(wallGeometry, materials.wall);
    frontWall.position.set(0, 2, 5);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    frontWall.userData.initialZ = 5;
    roomGroup.add(frontWall);
    breathingWalls.push(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, materials.wall);
    leftWall.position.set(-5, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.userData.initialX = -5;
    roomGroup.add(leftWall);
    breathingWalls.push(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, materials.wall);
    rightWall.position.set(5, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.userData.initialX = 5;
    roomGroup.add(rightWall);
    breathingWalls.push(rightWall);

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

    const moveSpeed = 1.8 * delta; // Slower for underwater feel
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

        // Update target position
        gameState.targetPosition.x += movement.x;
        gameState.targetPosition.z += movement.z;

        // Keep target within room bounds
        gameState.targetPosition.x = Math.max(-4.5, Math.min(4.5, gameState.targetPosition.x));
        gameState.targetPosition.z = Math.max(-4.5, Math.min(4.5, gameState.targetPosition.z));
    }

    // DELAYED MOVEMENT - smooth lerp for underwater/dreamlike feel
    const smoothFactor = 0.08; // Lower = more delay/smoothness
    camera.position.x += (gameState.targetPosition.x - camera.position.x) * smoothFactor;
    camera.position.z += (gameState.targetPosition.z - camera.position.z) * smoothFactor;

    // Floating camera motion with slightly irregular pattern (dreamcore)
    gameState.floatOffset += delta * 0.6;
    const floatY = Math.sin(gameState.floatOffset) * 0.025 + Math.sin(gameState.floatOffset * 0.7) * 0.015;
    const targetY = 1.6 + floatY;
    camera.position.y += (targetY - camera.position.y) * 0.05; // Smooth vertical float
}

function updateCameraRotation() {
    if (gameState.ended) return;

    if (gameState.mouseDown && (Math.abs(gameState.mouseDelta.x) > 0 || Math.abs(gameState.mouseDelta.y) > 0)) {
        const sensitivity = 0.0015; // Slightly slower

        // Update target rotation
        gameState.targetRotation.y -= gameState.mouseDelta.x * sensitivity;
        gameState.targetRotation.x -= gameState.mouseDelta.y * sensitivity;

        // Limit vertical rotation
        gameState.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gameState.targetRotation.x));

        gameState.mouseDelta.x = 0;
        gameState.mouseDelta.y = 0;
    }

    // DELAYED CAMERA ROTATION - smooth lerp for dreamlike feel
    const rotSmooth = 0.12; // Smooth rotation delay
    gameState.cameraRotation.x += (gameState.targetRotation.x - gameState.cameraRotation.x) * rotSmooth;
    gameState.cameraRotation.y += (gameState.targetRotation.y - gameState.cameraRotation.y) * rotSmooth;

    // Apply smoothed rotation
    camera.rotation.set(0, 0, 0);
    camera.rotateY(gameState.cameraRotation.y);
    camera.rotateX(gameState.cameraRotation.x);
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
                '',
                'A note.\nThe ink is still wet.\n\n"every door leads somewhere\nbut not all roads leave"\n\nThe handwriting looks like yours.\nYou don\'t remember writing it.',
                []
            );
            break;

        case 'carpet':
            showNarrative(
                '',
                'The pattern shifts when you look away.\n\nPulses. Remembers.\n\nYou can feel something underneath, but it isn\'t moving.',
                []
            );
            break;

        case 'window':
            showNarrative(
                '',
                'The glass is open but still there.\n\nClouds hang motionless.\nThe valley has no bottom.\n\nYour reflection moves half a second before you do.',
                [
                    { text: 'step through', action: () => endingFallOfLight() },
                    { text: 'step back', action: () => hideNarrative() }
                ]
            );
            break;

        case 'doorA':
            showNarrative(
                '',
                'Warm to touch. Humming.\n\nYou hear footsteps on the other side.\nThey match yours.\nAlmost.',
                [
                    { text: 'open', action: () => endingDispersedMemory() },
                    { text: 'wait', action: () => hideNarrative() }
                ]
            );
            break;

        case 'doorB':
            showNarrative(
                '',
                'Cool. Damp.\n\nWater sounds.\nSomething spinning.\n\nThe clock behind you is ticking backwards now.',
                [
                    { text: 'open', action: () => endingWaterOfRebirth() },
                    { text: 'wait', action: () => hideNarrative() }
                ]
            );
            break;

        case 'painting':
            showNarrative(
                '',
                'Hills. Sky. Soft colors.\n\nThe frame tilts slightly.\nYou didn\'t touch it.\n\nSomething glows behind.',
                [
                    { text: 'look behind', action: () => revealKeypad() },
                    { text: 'look away', action: () => hideNarrative() }
                ]
            );
            break;

        case 'bookshelf':
            showNarrative(
                '',
                'Books without titles.\nColors fading.\n\nA frame glows faintly.\nFour numbers written by no one.\n\n7853',
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
            '',
            'Wrong.\n\nThe keypad blinks.\nWaiting.\n\nThe numbers are written somewhere.\nYou\'ve already seen them.',
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
            '',
            'You step through.\n\nThe glass was never there.\n\n.\n\n.\n\n.\n\nGravity forgets you.\n\nThe room dissolves upward.\n\nClouds. Light. White.\n\n.\n\n.\n\nYou are falling\nor floating\nor both\nor neither\n\n.\n\nThe valley has no bottom.\nYou have no shape.\n\n.\n\nEverything is light now.'
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
            '',
            'The corridor hums.\n\n.\n\nYour footsteps echo\nhalf a second late.\n\n.\n\nThe floor becomes glass\nthen air\nthen stars.\n\n.\n\nYou look at your hands.\nLight passes through.\n\n.\n\nThe room behind you\nblurs\nshimmers\nforgets.\n\n.\n\nYou are\nparticles\nmemory\nlight\nscattered\n\n.\n\n.\n\nYou were never solid.'
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
            '',
            'Water.\n\n.\n\nA pool that doesn\'t reflect you.\n\nSomething spinning at the center.\nGlowing.\n\n.\n\nYou wade in.\nThe water is warm.\n\n.\n\nCloser.\nThe whirlpool pulls.\nGentle.\nIrresistible.\n\n.\n\nEverything spins—\nwater\nlight\ntime\n\n.\n\nYou close your eyes.\n\n.\n\n.\n\n.\n\nYou open them.\n\nYou are in the room again.\n\nThe clock is ticking.\n\nYou have always been here.'
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
            '',
            'The panel opens.\nYou didn\'t enter the code.\n\nIt knew.\n\n.\n\nA garden.\nSuspended above clouds.\n\nGrass that casts golden reflections.\n\n.\n\nWhite rabbits watch.\nUnblinking.\nPerfectly still.\n\n.\n\nA willow tree.\nA picnic mat.\nWaiting.\n\n.\n\nYou lie down.\nThe sun never sets here.\n\nWarm.\nSafe.\nGentle.\n\n.\n\n.\n\nYour eyes close.\n\n.\n\nThis is escape\nor\nthe softest cage\nor\nboth\nor\nneither\n\n.\n\nYou forget which.'
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

    // BREATHING WALLS - dreamcore effect
    gameState.breatheOffset += delta * 0.5;
    breathingWalls.forEach((wall, index) => {
        // Each wall breathes slightly out of phase
        const phaseOffset = index * 0.5;
        const breathe = Math.sin(gameState.breatheOffset + phaseOffset) * 0.015;

        // Animate walls breathing in/out
        if (wall.userData.initialX !== undefined) {
            wall.position.x = wall.userData.initialX + (wall.userData.initialX > 0 ? breathe : -breathe);
        }
        if (wall.userData.initialZ !== undefined) {
            wall.position.z = wall.userData.initialZ + (wall.userData.initialZ > 0 ? breathe : -breathe);
        }
    });

    renderer.render(scene, camera);
}

// ===== START GAME =====
initScene();
animate(0);
