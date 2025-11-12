/* =========================================================
   Dream Room Escape (Three.js single file)
   - Origin (European dreamcore) + Pool + Hallway + Garden
   - Doors persist; rooms re-enterable; smooth float controls
   - No UI endings; all spatial/lighting/audio transitions
   - Works with: <script src="three.min.js"></script><script src="game.js"></script>
   ========================================================= */

(() => {
  // ---------- renderer / camera / scene shell ----------
  const container = document.getElementById('gameContainer') || document.body;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xebe8e1, 0.008); // calm dream haze

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
  camera.position.set(0, 1.6, 4);
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // ---------- resize ----------
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- simple post "flash" overlay ----------
  const overlayScene = new THREE.Scene();
  const overlayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const flashQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), flashMat);
  overlayScene.add(flashQuad);

  async function flash(duration = 800) {
    // 0 -> 1 -> 0 opacity over duration
    return new Promise((resolve) => {
      const start = performance.now();
      const anim = (t) => {
        const e = Math.min(1, (t - start) / duration);
        // keep white most intense around 0.5~0.8
        if (e < 0.8) flashMat.opacity = e / 0.8; else flashMat.opacity = (1 - (e - 0.8) / 0.2) * 1;
        if (e >= 1) { flashMat.opacity = 0; resolve(); } else requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    });
  }

  // ---------- floaty first-person-ish controls ----------
  const keys = new Set();
  addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // mouse look
  let dragging = false;
  let lastX = 0, lastY = 0;
  let yaw = 0, pitch = 0; // radians
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  renderer.domElement.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  addEventListener('mouseup', () => dragging = false);
  addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    yaw -= dx * 0.0025;
    pitch -= dy * 0.0020;
    pitch = clamp(pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  });

  // reversed zoom (scroll up = zoom in)
  renderer.domElement.addEventListener('wheel', (e) => {
    camera.fov -= e.deltaY * 0.005; // reversed
    camera.fov = clamp(camera.fov, 28, 75);
    camera.updateProjectionMatrix();
  }, { passive: true });

  // movement smoothing
  const vel = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const upVec = new THREE.Vector3(0, 1, 0);
  let speed = 7.5;

  function updateCamera(dt) {
    // orient by yaw/pitch
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.quaternion.copy(q);

    // direction vectors
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    right.copy(forward).cross(upVec).normalize();

    const acc = new THREE.Vector3();
    if (keys.has('w') || keys.has('arrowup')) acc.add(forward);
    if (keys.has('s') || keys.has('arrowdown')) acc.addScaledVector(forward, -1);
    if (keys.has('a') || keys.has('arrowleft')) acc.addScaledVector(right, -1);
    if (keys.has('d') || keys.has('arrowright')) acc.add(right);

    acc.normalize().multiplyScalar(speed);
    // damping = floaty
    vel.lerp(acc, 0.12);
    camera.position.addScaledVector(vel, dt);

    // tiny sway
    camera.position.y += Math.sin(performance.now() * 0.0015) * 0.0008;
  }

  // ---------- lights (global) ----------
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe9dccb, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.2);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 200;
  scene.add(sun);

  // ---------- simple materials ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4efe7, roughness: 0.55, metalness: 0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xcaa67a, roughness: 0.35, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7e5a3a, roughness: 0.4, metalness: 0.05 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, opacity: 1, transparent: true, roughness: 0.05, metalness: 0.0, clearcoat: 0.3 });

  // ---------- groups for each room ----------
  const originG = new THREE.Group(); originG.name = 'origin';
  const poolG   = new THREE.Group(); poolG.name = 'pool';
  const hallG   = new THREE.Group(); hallG.name = 'hallway';
  const gardenG = new THREE.Group(); gardenG.name = 'garden';

  scene.add(originG, poolG, hallG, gardenG);

  // ---------- helpers ----------
  function makeEmissiveRim(mesh, color = 0xfff2cc) {
    // pulse emissive when close
    mesh.userData.rimColor = new THREE.Color(color);
  }

  function setVisibleOnly(groupName) {
    originG.visible = (groupName === 'origin');
    poolG.visible   = (groupName === 'pool');
    hallG.visible   = (groupName === 'hallway');
    gardenG.visible = (groupName === 'garden');
  }

  // ---------- audio (optional) ----------
  const audio = {
    ctx: listener.context,
    loader: new THREE.AudioLoader(),
    current: null,
    map: {
      origin: 'assets/audio/origin.mp3',
      pool:   'assets/audio/pool.mp3',
      hallway:'assets/audio/hallway.mp3',
      garden: 'assets/audio/garden.mp3'
    }
  };

  function playAmbience(key) {
    if (!audio || !audio.loader) return;
    if (audio.current) { audio.current.stop(); audio.current.disconnect(); audio.current = null; }
    const track = audio.map[key];
    if (!track) return;
    const s = new THREE.Audio(listener);
    audio.loader.load(track,
      (buf) => { s.setBuffer(buf); s.setLoop(true); s.setVolume(0.45); s.play(); audio.current = s; },
      undefined,
      // fallback: silent if file missing
      () => { /* ignore */ }
    );
  }

  // ---------- build Origin ----------
  function buildOrigin() {
    originG.clear();

    // room box (16 x 9 x 16), open top
    const room = new THREE.Group();
    const geoWall = new THREE.BoxGeometry(16, 9, 0.2);
    const geoSide = new THREE.BoxGeometry(0.2, 9, 16);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    const back = new THREE.Mesh(geoWall, wallMat); back.position.set(0, 4.5, -8); back.receiveShadow = true; back.castShadow = true; room.add(back);
    const front= new THREE.Mesh(geoWall, wallMat); front.position.set(0, 4.5, 8);  front.rotation.y = Math.PI; front.receiveShadow = true; front.castShadow = true; room.add(front);
    const left = new THREE.Mesh(geoSide, wallMat); left.position.set(-8, 4.5, 0); left.receiveShadow = true; left.castShadow = true; room.add(left);
    const right= new THREE.Mesh(geoSide, wallMat); right.position.set(8, 4.5, 0); right.receiveShadow = true; right.castShadow = true; room.add(right);

    // desk + glowing paper
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.2), woodMat); desk.position.set(-4, 0.75, -3); desk.castShadow = true; originG.add(desk);
    const legGeom = new THREE.BoxGeometry(0.12, 0.8, 0.12);
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(legGeom, woodMat);
      leg.position.set(-4 + (i % 2 ? 1 : -1) * 1, 0.4, -3 + (i < 2 ? 0.5 : -0.5));
      leg.castShadow = true;
      originG.add(leg);
    }
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshBasicMaterial({ color: 0xfffbe8 }));
    paper.position.set(-3.85, 0.81, -3);
    paper.rotation.x = -Math.PI / 2;
    originG.add(paper);

    originG.add(room);

    // three portals (meshes with userData)
    // North wall: WOODEN DOOR -> hallway
    const doorWood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x6d4c35, roughness: 0.45, metalness: 0.05, emissive: 0x000000 }));
    doorWood.position.set(0, 1.6, -7.9);
    doorWood.castShadow = true;
    doorWood.userData.portal = { to: 'hallway', type: 'door' };
    makeEmissiveRim(doorWood);
    originG.add(doorWood);

    // East wall: GLASS DOOR -> pool
    const doorGlassFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.2, 0.12), woodMat);
    doorGlassFrame.position.set(6.9, 1.6, 0); doorGlassFrame.rotation.y = -Math.PI/2; originG.add(doorGlassFrame);
    const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.8), glassMat);
    doorGlass.position.set(6.84, 1.6, 0);
    doorGlass.rotation.y = -Math.PI/2;
    doorGlass.userData.portal = { to: 'pool', type: 'glass' };
    makeEmissiveRim(doorGlass, 0xdff6ff);
    originG.add(doorGlass);

    // West wall: TALL WINDOW -> garden
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.12), woodMat);
    windowFrame.position.set(-6.9, 1.8, 0); windowFrame.rotation.y = Math.PI/2; originG.add(windowFrame);
    const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.2), new THREE.MeshPhysicalMaterial({ color: 0xeef9ff, transmission: 0.92, roughness: 0.06, thickness: 0.02 }));
    windowPane.position.set(-6.84, 1.8, 0); windowPane.rotation.y = Math.PI/2;
    windowPane.userData.portal = { to: 'garden', type: 'window' };
    makeEmissiveRim(windowPane, 0xeef7ff);
    originG.add(windowPane);

    // gentle dust motes
    const moteGeo = new THREE.SphereGeometry(0.01, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    for (let i = 0; i < 150; i++) {
      const m = new THREE.Mesh(moteGeo, moteMat);
      m.position.set((Math.random()-0.5)*14, Math.random()*7+0.3, (Math.random()-0.5)*14);
      m.userData.vy = (Math.random()*0.2+0.05);
      originG.add(m);
    }
  }

  // ---------- build Pool ----------
  function buildPool() {
    poolG.clear();
    const base = new THREE.Group(); poolG.add(base);

    // tiled tunnel arches
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xe6e9e6, roughness: 0.65, metalness: 0.0 });
    const archR = 6, span = 10, count = 9;
    for (let i=0;i<count;i++){
      const ring = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.25, 24, 64, Math.PI*2), tileMat);
      ring.rotation.x = Math.PI/2;
      ring.position.z = -i*span;
      ring.castShadow = true; ring.receiveShadow = true;
      base.add(ring);
      // short stairs suggestion
      if (i===0) {
        const stair = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.2), tileMat);
        stair.position.set(-archR+1.1, 0.2, 0.6); stair.castShadow = true; base.add(stair);
      }
    }

    // shallow water plane with sine ripple
    const w = 14, d = span*(count-1)+6;
    const geo = new THREE.PlaneGeometry(w, d, 90, 180);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x66c2a3, roughness: 0.3, metalness: 0.0, transparent: true, opacity: 0.85, transmission: 0.25, clearcoat: 0.2 });
    const water = new THREE.Mesh(geo, mat);
    water.rotation.x = -Math.PI/2; water.position.set(0, 0.5, -d/2+3);
    water.receiveShadow = true; base.add(water);
    water.userData.wave = true;

    // lamps
    const lampCol = 0xdde9da;
    for (let i=0;i<count;i++){
      const l = new THREE.PointLight(lampCol, 0.6, 18, 2);
      l.position.set(archR-0.4, 2.2, -i*span);
      l.castShadow = true;
      base.add(l);
    }

    // return portal (glass door-like)
    const ret = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), glassMat.clone());
    ret.material.emissive = new THREE.Color(0xdff6ff);
    ret.position.set(0, 1.6, 2.2);
    ret.userData.portal = { to: 'origin', type: 'return' };
    makeEmissiveRim(ret, 0xdff6ff);
    poolG.add(ret);
  }

  // ---------- build Hallway ----------
  function buildHallway() {
    hallG.clear();
    const base = new THREE.Group(); hallG.add(base);

    const stone = new THREE.MeshStandardMaterial({ color: 0x32343a, roughness: 0.8, metalness: 0.1 });
    // repeating arches
    const step = 6, n = 16;
    for (let i=0;i<n;i++){
      const arch = new THREE.Mesh(new THREE.TorusGeometry(3, 0.25, 16, 64, Math.PI), stone);
      arch.rotation.z = Math.PI; arch.rotation.x = Math.PI/2;
      arch.position.z = -i*step;
      arch.castShadow = true; arch.receiveShadow = true;
      base.add(arch);

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.6, 12), stone);
      pillar.position.set(-3, 1.8, -i*step);
      pillar.castShadow = true; pillar.receiveShadow = true; base.add(pillar);
      const pillar2 = pillar.clone(); pillar2.position.x = 3; base.add(pillar2);

      // lamps
      if (i%2===0){
        const pl = new THREE.PointLight(0xffe5b0, 0.7, 10, 2);
        pl.position.set(-2.6, 2.4, -i*step-1);
        pl.castShadow = true; base.add(pl);
      }
    }

    // glossy floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, n*step+10), new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.45, metalness: 0.15 }));
    floor.rotation.x = -Math.PI/2;
    floor.position.z = -n*step/2;
    floor.receiveShadow = true; base.add(floor);

    // return portal (wood door)
    const ret = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x6d4c35, roughness: 0.45, metalness: 0.05 }));
    ret.position.set(0, 1.6, 2.2);
    ret.userData.portal = { to: 'origin', type: 'return' };
    makeEmissiveRim(ret, 0xfff2cc);
    hallG.add(ret);
  }

  // ---------- build Garden ----------
  function buildGarden() {
    gardenG.clear();
    const base = new THREE.Group(); gardenG.add(base);

    // greenhouse frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a5b45, roughness: 0.5, metalness: 0.1 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.92, roughness: 0.08, transparent: true });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshStandardMaterial({ color: 0xd7e5cf, roughness: 0.85 }));
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; base.add(ground);

    // frames + roof panes
    for (let i= -10; i<=10; i+=5) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 0.15), frameMat);
      bar.position.set(i, 2, 0); bar.castShadow = true; base.add(bar);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), glass);
      pane.position.set(i+2.5, 2, 0); pane.rotation.y = 0; base.add(pane);
    }
    // hanging pots
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb5643a, roughness: 0.7 });
    for (let i=0; i<6; i++){
      const pot = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 12), potMat);
      pot.position.set(-4 + i*1.6, 2.8 + Math.sin(i)*0.2, -1 + Math.cos(i)*1.0);
      pot.castShadow = true; base.add(pot);
      // plant bunch
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), new THREE.MeshStandardMaterial({ color: 0x4b8653, roughness: 0.9 }));
      plant.position.copy(pot.position).add(new THREE.Vector3(0, -0.4, 0));
      plant.castShadow = true; base.add(plant);
    }

    // daisies strip
    const daisyMat = new THREE.MeshStandardMaterial({ color: 0xf5f2d6, roughness: 0.6 });
    for (let i=0;i<60;i++){
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0x5b8e49 }));
      f.position.set((Math.random()-0.5)*18, 0.1, (Math.random()-0.5)*10);
      const flower = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), daisyMat);
      flower.rotation.x = -Math.PI/2; flower.position.set(f.position.x, 0.21, f.position.z);
      base.add(f, flower);
    }

    // sun shafts
    const gl = new THREE.PointLight(0xfff1d5, 1.1, 40, 1.5);
    gl.position.set(0, 6, 3); gl.castShadow = true; base.add(gl);

    // return portal (window-like)
    const ret = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.2), glass.clone());
    ret.position.set(0, 1.7, 3);
    ret.userData.portal = { to: 'origin', type: 'return' };
    makeEmissiveRim(ret, 0xf6ffe6);
    gardenG.add(ret);
  }

  // ---------- state / transitions ----------
  let state = 'origin';
  const ORIGIN_POS = new THREE.Vector3(0, 1.6, 0);

  function go(to) {
    // small light drift each time we re-enter origin (loop feel)
    if (to === 'origin') {
      const a = (Math.random()*6 - 3) * Math.PI/180;
      const b = (Math.random()*6 - 3) * Math.PI/180;
      sun.position.set(6*Math.cos(a), 12, 8*Math.cos(b));
    }
    flash(800).then(() => {
      state = to;
      setVisibleOnly(to);
      camera.position.copy(ORIGIN_POS.clone().add(new THREE.Vector3(0, 0, to==='origin'?4:4)));
    });
    playAmbience(to);
  }

  // ---------- build all ----------
  buildOrigin(); buildPool(); buildHallway(); buildGarden();
  setVisibleOnly('origin');
  playAmbience('origin');

  // ---------- ray / portal detection ----------
  const ray = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();

  function checkPortals(dt) {
    const group = state==='origin'? originG : state==='pool'? poolG : state==='hallway'? hallG : gardenG;
    // collect portal meshes in this group
    const portals = [];
    group.traverse(o => { if (o.userData && o.userData.portal) portals.push(o); });

    // proximity + facing
    portals.forEach(p => {
      const dist = camera.position.distanceTo(p.getWorldPosition(tmpV));
      const toPortal = tmpV.clone().sub(camera.position).normalize();
      const facing = toPortal.dot(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion)); // ~1 if centered

      // emissive pulse when near
      if (p.material && p.userData.rimColor) {
        const pulse = Math.max(0, 1 - dist / 4) * 0.8 * (0.6 + 0.4 * Math.sin(performance.now()*0.003));
        if (!p.material.emissive) p.material.emissive = new THREE.Color(0x000000);
        p.material.emissive.copy(p.userData.rimColor).multiplyScalar(pulse);
      }

      // enter rule: dist<2.5m and centered (~facing>0.92)
      if (dist < 2.5 && facing > 0.92) {
        const to = p.userData.portal.to;
        if (to) go(to);
      }
    });
  }

  // ---------- animate ----------
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(0.033, clock.getDelta());

    updateCamera(dt);
    checkPortals(dt);

    // animate pool waves
    if (poolG.visible) {
      poolG.traverse(o => {
        if (o.userData && o.userData.wave && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
          const pos = o.geometry.attributes.position;
          for (let i=0; i<pos.count; i++){
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const h = Math.sin(0.6* x + performance.now()*0.0013) * 0.06 + Math.cos(0.5* z + performance.now()*0.0011) * 0.05;
            pos.setZ(i, z); pos.setY(i, h);
          }
          pos.needsUpdate = true;
          o.geometry.computeVertexNormals();
        }
      });
    }

    renderer.render(scene, camera);
    if (flashMat.opacity > 0) renderer.autoClear = false, renderer.render(overlayScene, overlayCam), renderer.autoClear = true;

    requestAnimationFrame(tick);
  }
  tick();

  // ---------- start at clean origin ----------
  camera.position.copy(new THREE.Vector3(0, 1.6, 4));
})();
