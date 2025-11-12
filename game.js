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
    carpetLifted: false,
    inBasement: false,
    ended: false,
    narrativeShown: false,
    secretGardenUnlocked: false
};

// ===== SCENE SETUP =====
const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfff8f0); // Warmer, brighter background
scene.fog = new THREE.Fog(0xfff8f0, 15, 40);

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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // Slightly brighter for dreamcore aesthetic

// NOTE: For advanced post-processing effects (bloom, chromatic aberration, depth blur),
// you would need to include the Three.js post-processing libraries:
// - EffectComposer
// - RenderPass
// - UnrealBloomPass
// - ChromaticAberrationShader (custom)
// - BokehPass (for depth blur)
// These require additional script imports from three/examples/jsm/postprocessing/

// Raycaster for interactions
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ===== LIGHTING =====
function setupLighting() {
    // Ambient light for overall illumination - warmer tone
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 0.7);
    scene.add(ambientLight);

    // Main sunlight from window - bright and warm
    const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
    sunLight.position.set(5, 8, 3);
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

    // Warm fill light - faded gold
    const fillLight = new THREE.PointLight(0xffd700, 0.3, 20);
    fillLight.position.set(-3, 3, 0);
    scene.add(fillLight);

    // Sky blue accent light
    const skyLight = new THREE.PointLight(0x87ceeb, 0.2, 15);
    skyLight.position.set(3, 2, -3);
    scene.add(skyLight);

    // Additional warm glow near window
    const glowLight = new THREE.PointLight(0xffe4b5, 0.5, 12);
    glowLight.position.set(4, 2, 0);
    scene.add(glowLight);
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

// ===== DUST PARTICLES =====
function createDustParticles() {
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 10;     // x
        positions[i + 1] = Math.random() * 4;          // y
        positions[i + 2] = (Math.random() - 0.5) * 10; // z

        velocities.push({
            x: (Math.random() - 0.5) * 0.002,
            y: Math.random() * 0.005 + 0.001,
            z: (Math.random() - 0.5) * 0.002
        });
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.3,
        sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Animation function for dust
    function animateDust() {
        const positions = particleSystem.geometry.attributes.position.array;

        for (let i = 0; i < particleCount; i++) {
            const idx = i * 3;

            positions[idx] += velocities[i].x;
            positions[idx + 1] += velocities[i].y;
            positions[idx + 2] += velocities[i].z;

            // Reset particles that go too high
            if (positions[idx + 1] > 4) {
                positions[idx + 1] = 0;
            }

            // Keep particles within room bounds
            if (Math.abs(positions[idx]) > 5) positions[idx] *= -0.9;
            if (Math.abs(positions[idx + 2]) > 5) positions[idx + 2] *= -0.9;
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    return animateDust;
}

// ===== INITIALIZE SCENE =====
let dustAnimation = null;

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
    dustAnimation = createDustParticles();
    document.getElementById('debug').textContent = 'Scene ready! Controls: WASD/Arrows + Mouse';

    // Hide debug after 3 seconds
    setTimeout(() => {
        const debugEl = document.getElementById('debug');
        if (debugEl) debugEl.style.opacity = '0';
        setTimeout(() => {
            if (debugEl) debugEl.style.display = 'none';
        }, 1000);
    }, 3000);

    // Show opening narrative after 4 seconds
    setTimeout(() => {
        showOpeningNarrative();
    }, 4000);
}

// ===== OPENING NARRATIVE =====
function showOpeningNarrative() {
    if (gameState.narrativeShown) return;
    gameState.narrativeShown = true;

    showNarrative(
        '',
        'You awaken in a room that is beautiful, too bright, too still, as if the world has paused to watch you, and every object quietly suggests that you have been here before and will be again.',
        []
    );

    // Auto-hide after 8 seconds
    setTimeout(() => {
        hideNarrative();
    }, 8000);
}

// ===== PLAYER CONTROLS =====
function updatePlayerMovement(delta) {
    if (gameState.ended) return;

    const moveSpeed = 1.5 * delta; // Slower, more floating movement
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
                'A handwritten note rests on the polished wood. The elegant script reads:\n\n"Every door leads somewhere, but not all roads leave the room."\n\nA simple sketch shows: Door A, Door B, the Window, and the Carpet.',
                []
            );
            break;

        case 'carpet':
            if (!gameState.carpetLifted) {
                showNarrative(
                    'The Patterned Carpet',
                    'You notice the carpet seems to rest unevenly on the floor. There might be something underneath...',
                    [
                        { text: 'Lift the carpet', action: () => liftCarpet() },
                        { text: 'Leave it', action: () => hideNarrative() }
                    ]
                );
            } else {
                showNarrative(
                    'The Hidden Trapdoor',
                    'The trapdoor remains open, revealing darkness below. Do you dare descend?',
                    [
                        { text: 'Enter the basement', action: () => enterBasement() },
                        { text: 'Step back', action: () => hideNarrative() }
                    ]
                );
            }
            break;

        case 'window':
            showNarrative(
                'The Sunlit Window',
                'Warm sunlight streams through the glass. Beyond lies a breathtaking view — endless sky, drifting clouds, and a deep valley far below.\n\nA gentle breeze seems to call you. To step outside... or remain?',
                [
                    { text: 'Step through the window', action: () => endingFallOfLight() },
                    { text: 'Stay inside', action: () => hideNarrative() }
                ]
            );
            break;

        case 'doorA':
            showNarrative(
                'Door A - The Left Door',
                'The door is warm to the touch. Beyond it, you sense something vast — a space unlike any room.',
                [
                    { text: 'Open the door', action: () => endingDispersedMemory() },
                    { text: 'Turn back', action: () => hideNarrative() }
                ]
            );
            break;

        case 'doorB':
            showNarrative(
                'Door B - The Right Door',
                'Cool moisture emanates from this door. You hear the faint sound of flowing water.',
                [
                    { text: 'Open the door', action: () => endingWaterOfRebirth() },
                    { text: 'Turn back', action: () => hideNarrative() }
                ]
            );
            break;

        case 'painting':
            showNarrative(
                'The Mysterious Painting',
                'A serene landscape of rolling hills under a pastel sky. As you look closer, you notice the frame seems slightly loose on one side...',
                [
                    { text: 'Look behind the painting', action: () => revealKeypad() },
                    { text: 'Admire and leave', action: () => hideNarrative() }
                ]
            );
            break;

        case 'bookshelf':
            showNarrative(
                'The Bookshelf',
                'Rows of colorful books line the wooden shelves. A golden photo frame catches your eye — it displays the numbers "7853" in elegant script.',
                []
            );
            break;

        case 'picnicMat':
            showNarrative(
                'The Glowing Picnic Mat',
                'You sit on the warm, glowing mat. The breeze is gentle, the rabbits peaceful. This suspended garden feels timeless — a place between dreams and reality.',
                [
                    { text: 'Rest here forever', action: () => finalGardenEnding() },
                    { text: 'Stand up', action: () => hideNarrative() }
                ]
            );
            break;
    }
}

// ===== FINAL GARDEN ENDING =====
function finalGardenEnding() {
    hideNarrative();
    gameState.ended = true;

    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        showEnding(
            'You Have Found Peace',
            'In this suspended garden, time loses meaning. The rabbits hop silently. The wind whispers secrets of forgotten dreams.\n\nYou close your eyes...\n\nPerhaps this is the true escape... or the gentlest cage of all.'
        );
    }, 2000);
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
function liftCarpet() {
    gameState.carpetLifted = true;
    hideNarrative();

    setTimeout(() => {
        showNarrative(
            'A Hidden Trapdoor',
            'Beneath the carpet lies a small wooden trapdoor. The wood is old but sturdy. A faint light glows from the cracks.',
            [
                { text: 'Open and descend', action: () => enterBasement() },
                { text: 'Cover it back up', action: () => hideNarrative() }
            ]
        );
    }, 500);
}

function enterBasement() {
    hideNarrative();
    gameState.inBasement = true;

    // Fade transition
    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        showEnding(
            'Ending A: Room of Echoes',
            'You descend into the basement. The light turns muted but not dark.\n\nA diary rests on a stone table. Its pages reveal a single phrase:\n\n"The exit is in the wall."\n\nYou walk forward, searching. But no matter how far you go, the same layout repeats endlessly.\n\nThe room echoes with your footsteps... forever.'
        );
    }, 2000);
}

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
            'The keypad beeps softly. The code is incorrect. Perhaps there is a clue somewhere in the room?',
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
            'Ending B: Fall of Light',
            'You step forward through the window.\n\nThe world dissolves into brilliant white light. Sky and room blend together.\n\nGravity releases you. You float, weightless, into an endless expanse of clouds and sunlight.\n\nEverything fades... into pure radiance.'
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
            'Ending C: Dispersed Memory',
            'Beyond Door A lies a hallway of glowing light.\n\nWith each step, the floor becomes more transparent. Gravity gently fades.\n\nYour footsteps leave no sound. The room behind you dims and blurs.\n\nSoon, even your own form feels distant — dissolving into particles of light.\n\nThe room becomes a fading memory, scattered into infinity.'
        );
    }, 2000);
}

function endingWaterOfRebirth() {
    hideNarrative();

    // Quick fade transition
    const overlay = document.getElementById('ending-overlay');
    overlay.classList.add('active', 'fade');

    setTimeout(() => {
        // Reset player position immediately
        camera.position.set(0, 1.6, 0);
        gameState.cameraRotation = { x: 0, y: 0 };
        camera.rotation.set(0, 0, 0);

        // Clear fade
        overlay.classList.remove('active', 'fade');

        // Show brief message
        showNarrative(
            'Ending D: Water of Rebirth',
            'The whirlpool draws you in... and you return to where you began.',
            []
        );

        setTimeout(() => {
            hideNarrative();
        }, 3000);
    }, 1500);
}

function endingGentleCage() {
    hideNarrative();
    gameState.secretGardenUnlocked = true;

    // Create secret garden scene
    createSecretGarden();

    showNarrative(
        'Ending E: Gentle Cage',
        'The keypad accepts the code. A hidden panel slides open, revealing a suspended garden of green grass and soft wind. Silent white rabbits hop peacefully. A glowing picnic mat awaits you.',
        []
    );

    setTimeout(() => {
        hideNarrative();
    }, 5000);
}

// ===== SECRET GARDEN =====
function createSecretGarden() {
    // Clear existing room objects (fade them out)
    scene.children.forEach(child => {
        if (child.userData && child.userData.type !== 'light') {
            child.visible = false;
        }
    });

    // Create garden ground
    const grassGeometry = new THREE.PlaneGeometry(15, 15);
    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cfc00,
        roughness: 0.9
    });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0;
    grass.receiveShadow = true;
    scene.add(grass);

    // Add some flowers (small colored spheres)
    const flowerColors = [0xff69b4, 0xffff00, 0xffffff, 0xff6347];
    for (let i = 0; i < 20; i++) {
        const flowerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flowerMaterial = new THREE.MeshStandardMaterial({
            color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
            emissive: flowerColors[Math.floor(Math.random() * flowerColors.length)],
            emissiveIntensity: 0.3
        });
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.set(
            (Math.random() - 0.5) * 12,
            0.1,
            (Math.random() - 0.5) * 12
        );
        scene.add(flower);
    }

    // Create white rabbits
    for (let i = 0; i < 5; i++) {
        const rabbit = createRabbit();
        rabbit.position.set(
            (Math.random() - 0.5) * 10,
            0.3,
            (Math.random() - 0.5) * 10
        );
        scene.add(rabbit);
    }

    // Create glowing picnic mat
    const matGeometry = new THREE.PlaneGeometry(2, 2);
    const matMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.5,
        roughness: 0.7
    });
    const picnicMat = new THREE.Mesh(matGeometry, matMaterial);
    picnicMat.rotation.x = -Math.PI / 2;
    picnicMat.position.set(0, 0.01, -3);
    picnicMat.userData = {
        type: 'picnicMat',
        interactable: true,
        name: 'Glowing Picnic Mat'
    };
    scene.add(picnicMat);
    interactables.push(picnicMat);

    // Update sky
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 50);

    // Move camera to garden entrance
    camera.position.set(0, 1.6, 5);
}

function createRabbit() {
    const rabbitGroup = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const rabbitMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, rabbitMaterial);
    body.scale.set(1, 0.8, 1.2);
    rabbitGroup.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const head = new THREE.Mesh(headGeometry, rabbitMaterial);
    head.position.set(0, 0.2, 0.25);
    rabbitGroup.add(head);

    // Ears
    const earGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const leftEar = new THREE.Mesh(earGeometry, rabbitMaterial);
    leftEar.scale.set(0.5, 1.5, 0.5);
    leftEar.position.set(-0.08, 0.35, 0.25);
    rabbitGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, rabbitMaterial);
    rightEar.scale.set(0.5, 1.5, 0.5);
    rightEar.position.set(0.08, 0.35, 0.25);
    rabbitGroup.add(rightEar);

    return rabbitGroup;
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

// ===== AMBIENT AUDIO =====
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

function initAudio() {
    if (audioInitialized) return;
    audioInitialized = true;

    // Bird sounds (using oscillators to create bird-like chirps)
    function createBirdSound() {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.frequency.value = 1500 + Math.random() * 1000;
        gain.gain.value = 0.02;

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        osc.stop(audioContext.currentTime + 0.5);
    }

    setInterval(() => {
        if (Math.random() > 0.7) createBirdSound();
    }, 3000);

    // Reversed clock ticking (low frequency pulse)
    const clockOsc = audioContext.createOscillator();
    const clockGain = audioContext.createGain();
    const clockFilter = audioContext.createBiquadFilter();

    clockOsc.type = 'square';
    clockOsc.frequency.value = 1; // 1 Hz pulse
    clockFilter.type = 'lowpass';
    clockFilter.frequency.value = 200;

    clockOsc.connect(clockFilter);
    clockFilter.connect(clockGain);
    clockGain.connect(audioContext.destination);

    clockGain.gain.value = 0.01;
    clockOsc.start();

    // Soft wind (pink noise)
    const windBufferSize = audioContext.sampleRate * 2;
    const windBuffer = audioContext.createBuffer(1, windBufferSize, audioContext.sampleRate);
    const windData = windBuffer.getChannelData(0);

    // Generate pink noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < windBufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        windData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
    }

    const windSource = audioContext.createBufferSource();
    const windGain = audioContext.createGain();
    const windFilter = audioContext.createBiquadFilter();

    windSource.buffer = windBuffer;
    windSource.loop = true;
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 800;

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(audioContext.destination);

    windGain.gain.value = 0.03;
    windSource.start();
}

// Initialize audio on first user interaction
document.addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    initAudio();
}, { once: true });

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

    // Animate dust
    if (dustAnimation) dustAnimation();

    renderer.render(scene, camera);
}

// ===== START GAME =====
initScene();
animate(0);
