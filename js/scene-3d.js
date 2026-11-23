/* ====================================================
   ALEXIUS DUBEM — 3D CINEMATIC WORLD ENGINE
   Full-Site Scroll-Choreographed 3D World
   Real Solid Objects: PBR Laptop Rig, 3D Project Monoliths,
   Rotating Cyber Gimbal Server Core & Holographic Beacon
   Cinematic Camera Spline & Studio Lighting
   ==================================================== */

(function () {
  'use strict';

  // Core Three.js components
  let scene, camera, renderer;
  let canvas;
  let clock;
  let isReady = false;

  // 3D Objects
  let worldGroup;
  let laptopGroup, laptopScreenCtx, laptopScreenTexture;
  let projectSlabsGroup, projectSlabs = [];
  let serverCoreGroup, gimbalRings = [];
  let beaconGroup, beaconRings = [];

  // Interaction & Scroll State
  let scrollProgress = 0;
  let targetScrollProgress = 0;
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let userRotation = { x: 0, y: 0 };
  let isLowPower = false;

  // Camera spline waypoints for cinematic scroll choreography
  // Each stage represents: [Hero, Projects, Services, Contact]
  const cameraWaypoints = [
    // 0. Hero (Top): Focus on Sleek 3D Laptop Workstation
    {
      camPos: new THREE.Vector3(0, 0.6, 9.2),
      lookAt: new THREE.Vector3(0, 0, 0),
      laptopRot: new THREE.Vector3(0.25, -0.35, 0.08),
      laptopPos: new THREE.Vector3(2.2, -0.2, 0)
    },
    // 1. Projects: Camera swoops back & side, 3D Project Monoliths glide in
    {
      camPos: new THREE.Vector3(1.5, -9.5, 11),
      lookAt: new THREE.Vector3(0, -10, 0),
      laptopRot: new THREE.Vector3(0.6, 0.8, -0.2),
      laptopPos: new THREE.Vector3(6, -6, -4)
    },
    // 2. Services / Expertise: Camera dives around rotating Cyber Server Core
    {
      camPos: new THREE.Vector3(-2.2, -19.5, 9.8),
      lookAt: new THREE.Vector3(0, -20, 0),
      laptopRot: new THREE.Vector3(0, 1.2, 0),
      laptopPos: new THREE.Vector3(10, -15, -8)
    },
    // 3. Contact: Camera centers dramatically on Holographic Beacon
    {
      camPos: new THREE.Vector3(0, -29.8, 8.5),
      lookAt: new THREE.Vector3(0, -30, 0),
      laptopRot: new THREE.Vector3(0, 2.5, 0),
      laptopPos: new THREE.Vector3(12, -25, -10)
    }
  ];

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCinematic3D);
  } else {
    initCinematic3D();
  }

  function initCinematic3D() {
    canvas = document.getElementById('cinematic-3d-canvas');
    if (!canvas) return;

    // Load Three.js if needed
    if (typeof THREE === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = build3DWorld;
      document.head.appendChild(script);
    } else {
      build3DWorld();
    }
  }

  function build3DWorld() {
    clock = new THREE.Clock();

    // 1. Scene & Camera
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0d11, 0.012);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.copy(cameraWaypoints[0].camPos);

    // 2. WebGL Renderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('WebGL not supported:', e);
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    const maxDPR = window.innerWidth <= 640 ? 1.5 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(maxDPR);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 3. Studio Lighting
    setupStudioLights();

    // 4. World Group
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 5. Construct Real Solid 3D Objects
    create3DLaptopWorkstation();
    create3DProjectMonoliths();
    create3DCyberServerCore();
    create3DHolographicBeacon();
    createFloatingGridFloor();

    // 6. Event Listeners
    setupScrollAndMouse();
    window.addEventListener('resize', onWindowResize, { passive: true });

    isReady = true;
    animate();
  }

  /* ----------------------------------------------------
     STUDIO LIGHTING (DUAL-TONE HIGH-CRAFT REFLECTIONS)
     ---------------------------------------------------- */
  function setupStudioLights() {
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Main Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(12, 18, 14);
    scene.add(keyLight);

    // Electric Lime Neon Rim Light (#c8ff00)
    const limeRimLight = new THREE.PointLight(0xc8ff00, 3.5, 45);
    limeRimLight.position.set(-8, 5, 6);
    scene.add(limeRimLight);

    // Cyber Cyan Fill Light (#00d2ff)
    const cyanLight = new THREE.PointLight(0x00d2ff, 2.4, 45);
    cyanLight.position.set(8, -8, 6);
    scene.add(cyanLight);

    // Deep Purple Secondary Rim Light for cinematic depth
    const purpleLight = new THREE.PointLight(0x7928ca, 2.0, 50);
    purpleLight.position.set(0, -22, 10);
    scene.add(purpleLight);
  }

  /* ----------------------------------------------------
     OBJECT 1: SLEEK 3D DEVELOPER LAPTOP & CODE TERMINAL
     ---------------------------------------------------- */
  function create3DLaptopWorkstation() {
    laptopGroup = new THREE.Group();

    // Materials
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x161920,
      metalness: 0.92,
      roughness: 0.22
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      metalness: 0.7,
      roughness: 0.4
    });

    const limeGlowMat = new THREE.MeshBasicMaterial({
      color: 0xc8ff00
    });

    // 1. Laptop Base Unibody
    const baseGeo = new THREE.BoxGeometry(4.8, 0.16, 3.3);
    const baseMesh = new THREE.Mesh(baseGeo, titaniumMat);
    laptopGroup.add(baseMesh);

    // 2. Trackpad
    const trackpadGeo = new THREE.BoxGeometry(1.6, 0.02, 1.1);
    const trackpadMesh = new THREE.Mesh(trackpadGeo, darkTrimMat);
    trackpadMesh.position.set(0, 0.085, 0.85);
    laptopGroup.add(trackpadMesh);

    // 3. Keyboard Bed & Backlit Key Area
    const keyboardGeo = new THREE.BoxGeometry(4.3, 0.02, 1.8);
    const keyboardMesh = new THREE.Mesh(keyboardGeo, darkTrimMat);
    keyboardMesh.position.set(0, 0.085, -0.45);
    laptopGroup.add(keyboardMesh);

    // Emissive Keyboard Glow Strip
    const keyGlowGeo = new THREE.BoxGeometry(4.2, 0.01, 1.7);
    const keyGlowMat = new THREE.MeshBasicMaterial({ color: 0x223311 });
    const keyGlowMesh = new THREE.Mesh(keyGlowGeo, keyGlowMat);
    keyGlowMesh.position.set(0, 0.09, -0.45);
    laptopGroup.add(keyGlowMesh);

    // 4. Laptop Hinge
    const hingeGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.4, 16);
    hingeGeo.rotateZ(Math.PI / 2);
    const hingeMesh = new THREE.Mesh(hingeGeo, darkTrimMat);
    hingeMesh.position.set(0, 0.1, -1.65);
    laptopGroup.add(hingeMesh);

    // 5. Laptop Lid & Screen (Rotated open at ~108°)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, 0.1, -1.65);

    // Lid Back Chassis
    const lidBackGeo = new THREE.BoxGeometry(4.8, 3.2, 0.12);
    lidBackGeo.translate(0, 1.6, 0);
    const lidBackMesh = new THREE.Mesh(lidBackGeo, titaniumMat);
    lidGroup.add(lidBackMesh);

    // Glowing Alexius DEV Logo on back of lid
    const logoGeo = new THREE.BoxGeometry(0.45, 0.45, 0.02);
    logoGeo.translate(0, 1.6, -0.07);
    const logoMesh = new THREE.Mesh(logoGeo, limeGlowMat);
    lidGroup.add(logoMesh);

    // Screen Glass & Interactive Live Terminal Canvas
    const screenGeo = new THREE.BoxGeometry(4.5, 2.9, 0.02);
    screenGeo.translate(0, 1.6, 0.06);

    createTerminalCanvasTexture();
    const screenMat = new THREE.MeshBasicMaterial({
      map: laptopScreenTexture
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    lidGroup.add(screenMesh);

    // Open Screen Angle
    lidGroup.rotation.x = -Math.PI * 0.58;
    laptopGroup.add(lidGroup);

    // Initial position & scale
    laptopGroup.position.copy(cameraWaypoints[0].laptopPos);
    laptopGroup.rotation.set(
      cameraWaypoints[0].laptopRot.x,
      cameraWaypoints[0].laptopRot.y,
      cameraWaypoints[0].laptopRot.z
    );
    laptopGroup.scale.set(1.15, 1.15, 1.15);

    worldGroup.add(laptopGroup);
  }

  /* ----------------------------------------------------
     DYNAMIC TERMINAL TEXTURE FOR LAPTOP SCREEN
     ---------------------------------------------------- */
  function createTerminalCanvasTexture() {
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 1024;
    tCanvas.height = 640;
    laptopScreenCtx = tCanvas.getContext('2d');

    laptopScreenTexture = new THREE.CanvasTexture(tCanvas);
    laptopScreenTexture.minFilter = THREE.LinearFilter;

    renderTerminalFrame(0);
  }

  function renderTerminalFrame(time) {
    if (!laptopScreenCtx) return;
    const ctx = laptopScreenCtx;
    const w = 1024;
    const h = 640;

    // Terminal Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Top Window Header Bar
    ctx.fillStyle = '#141822';
    ctx.fillRect(0, 0, w, 44);

    // Window Dots (Red, Yellow, Lime)
    ctx.fillStyle = '#ff5f56';
    ctx.beginPath(); ctx.arc(28, 22, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbd2e';
    ctx.beginPath(); ctx.arc(52, 22, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8ff00';
    ctx.beginPath(); ctx.arc(76, 22, 7, 0, Math.PI * 2); ctx.fill();

    // Terminal Title
    ctx.fillStyle = '#8e94a0';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText('alexius@systems-core:~ (zsh)', 120, 28);

    // Code lines
    ctx.fillStyle = '#c8ff00';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('⚡ ALEXIUS DUBEM // SYSTEMS ARCHITECT', 40, 95);

    ctx.fillStyle = '#f4f3ee';
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillText('> Initializing High-Throughput Engineering Stack...', 40, 140);

    ctx.fillStyle = '#8e94a0';
    ctx.fillText('  ├─ Architecture: Clean Hexagonal Modular Domain', 40, 180);
    ctx.fillText('  ├─ Runtime: Node.js / TypeScript / React / Next.js', 40, 215);
    ctx.fillText('  ├─ Storage: Distributed PostgreSQL & Redis Cache', 40, 250);
    ctx.fillText('  └─ Telemetry: 99.99% Production Uptime Verified', 40, 285);

    // Live Metrics Pulse
    const pulseVal = Math.floor(640 + Math.sin(time * 3) * 45);
    ctx.fillStyle = '#00d2ff';
    ctx.fillText(`> [CLUSTER LOAD]: ${pulseVal} req/sec · 0.12ms Latency`, 40, 345);

    ctx.fillStyle = '#c8ff00';
    ctx.fillText('> ALL SYSTEMS OPERATIONAL <READY_FOR_DEPLOYMENT>', 40, 400);

    // Blinking Prompt Cursor
    if (Math.floor(time * 2) % 2 === 0) {
      ctx.fillStyle = '#c8ff00';
      ctx.fillRect(40, 435, 14, 24);
    }
    ctx.fillStyle = '#f4f3ee';
    ctx.fillText('alexius@prod:~$ ', 65, 454);

    laptopScreenTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     OBJECT 2: 3D PROJECT MONOLITHS (SOLID GLASS & TITANIUM)
     ---------------------------------------------------- */
  function create3DProjectMonoliths() {
    projectSlabsGroup = new THREE.Group();
    projectSlabsGroup.position.set(0, -10, 0);

    const textureLoader = new THREE.TextureLoader();
    const projectImages = [
      '/images/gridless.png',
      '/images/ark-global.png',
      '/images/smart-eches.png',
      '/images/aikon-commercial.png'
    ];

    // Spatial layout of 3D floating project screens
    const positions = [
      { x: -3.4, y: 1.5, z: 2.2, rotY: 0.28 },
      { x: 3.4, y: 0.2, z: 0.8, rotY: -0.28 },
      { x: -3.2, y: -2.0, z: 1.2, rotY: 0.22 },
      { x: 3.2, y: -3.5, z: -0.5, rotY: -0.22 }
    ];

    const slabFrameMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      metalness: 0.88,
      roughness: 0.24
    });

    const edgeGlowMat = new THREE.MeshBasicMaterial({
      color: 0xc8ff00
    });

    positions.forEach((pos, i) => {
      const slab = new THREE.Group();
      slab.position.set(pos.x, pos.y, pos.z);
      slab.rotation.y = pos.rotY;

      // Solid Beveled Frame
      const frameGeo = new THREE.BoxGeometry(4.2, 2.5, 0.12);
      const frameMesh = new THREE.Mesh(frameGeo, slabFrameMat);
      slab.add(frameMesh);

      // Emissive Border Accents
      const borderTopGeo = new THREE.BoxGeometry(4.22, 0.03, 0.14);
      borderTopGeo.translate(0, 1.25, 0);
      const borderTopMesh = new THREE.Mesh(borderTopGeo, edgeGlowMat);
      slab.add(borderTopMesh);

      // High-Res Project Screenshot Screen Face
      const screenGeo = new THREE.PlaneGeometry(4.0, 2.3);
      screenGeo.translate(0, 0, 0.07);

      textureLoader.load(
        projectImages[i],
        (tex) => {
          tex.minFilter = THREE.LinearFilter;
          const screenMat = new THREE.MeshBasicMaterial({ map: tex });
          const screenMesh = new THREE.Mesh(screenGeo, screenMat);
          slab.add(screenMesh);
        },
        undefined,
        () => {
          // Fallback if image fails to load
          const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x1f2430 });
          const screenMesh = new THREE.Mesh(screenGeo, fallbackMat);
          slab.add(screenMesh);
        }
      );

      projectSlabs.push(slab);
      projectSlabsGroup.add(slab);
    });

    worldGroup.add(projectSlabsGroup);
  }

  /* ----------------------------------------------------
     OBJECT 3: 3D CYBER GIMBAL SERVER CORE (SERVICES)
     ---------------------------------------------------- */
  function create3DCyberServerCore() {
    serverCoreGroup = new THREE.Group();
    serverCoreGroup.position.set(0, -20, 0);

    const metalRingMat = new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      metalness: 0.95,
      roughness: 0.18
    });

    const coreGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8ff00,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.75,
      thickness: 1.2,
      emissive: 0x224400,
      emissiveIntensity: 0.4
    });

    // 3 Concentric Gimbal Rings
    const ringRadii = [3.2, 2.4, 1.7];
    ringRadii.forEach((rad, i) => {
      const ringGeo = new THREE.TorusGeometry(rad, 0.07, 16, 72);
      const ringMesh = new THREE.Mesh(ringGeo, metalRingMat);
      gimbalRings.push(ringMesh);
      serverCoreGroup.add(ringMesh);
    });

    // Inner Glowing Octahedron Core
    const innerGeo = new THREE.OctahedronGeometry(1.0, 0);
    const innerMesh = new THREE.Mesh(innerGeo, coreGlassMat);
    serverCoreGroup.add(innerMesh);

    // Orbiting Micro Data Cubes
    for (let k = 0; k < 12; k++) {
      const cubeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const cubeMat = new THREE.MeshBasicMaterial({ color: 0xc8ff00 });
      const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
      const angle = (k / 12) * Math.PI * 2;
      cubeMesh.position.set(Math.cos(angle) * 3.6, Math.sin(angle) * 3.6, (Math.random() - 0.5) * 1.5);
      serverCoreGroup.add(cubeMesh);
    }

    worldGroup.add(serverCoreGroup);
  }

  /* ----------------------------------------------------
     OBJECT 4: 3D HOLOGRAPHIC COMMUNICATION BEACON (CONTACT)
     ---------------------------------------------------- */
  function create3DHolographicBeacon() {
    beaconGroup = new THREE.Group();
    beaconGroup.position.set(0, -30, 0);

    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x1f2633,
      metalness: 0.92,
      roughness: 0.2
    });

    const beaconPillarGeo = new THREE.CylinderGeometry(0.8, 1.4, 2.5, 32);
    const beaconPillarMesh = new THREE.Mesh(beaconPillarGeo, beaconMat);
    beaconGroup.add(beaconPillarMesh);

    // Pulsing Concentric Energy Rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc8ff00,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });

    for (let j = 0; j < 4; j++) {
      const ringGeo = new THREE.RingGeometry(1.6 + j * 0.5, 1.66 + j * 0.5, 48);
      ringGeo.rotateX(Math.PI / 2);
      const rMesh = new THREE.Mesh(ringGeo, ringMat);
      rMesh.position.y = 1.2 + j * 0.35;
      beaconRings.push(rMesh);
      beaconGroup.add(rMesh);
    }

    worldGroup.add(beaconGroup);
  }

  /* ----------------------------------------------------
     SUBTLE 3D VOLUMETRIC GRID FLOOR FOR HORIZON DEPTH
     ---------------------------------------------------- */
  function createFloatingGridFloor() {
    const gridHelper = new THREE.GridHelper(80, 40, 0xc8ff00, 0x1a2233);
    gridHelper.position.set(0, -3.5, 0);
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    worldGroup.add(gridHelper);
  }

  /* ----------------------------------------------------
     SCROLL & MOUSE INTERACTION (SMOOTH PARALLAX)
     ---------------------------------------------------- */
  function setupScrollAndMouse() {
    // Window scroll tracking
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetScrollProgress = docHeight > 0 ? (window.pageYOffset || document.documentElement.scrollTop) / docHeight : 0;
    }, { passive: true });

    // Mouse movement parallax
    window.addEventListener('mousemove', (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

      if (isDragging) {
        userRotation.y += (e.clientX - dragOffset.x) * 0.005;
        userRotation.x += (e.clientY - dragOffset.y) * 0.005;
        dragOffset.x = e.clientX;
        dragOffset.y = e.clientY;
      }
    });

    // Dragging to rotate active 3D focus
    window.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffset.x = e.clientX;
      dragOffset.y = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for mobile (Samsung S21)
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        dragOffset.x = e.touches[0].clientX;
        dragOffset.y = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        userRotation.y += (e.touches[0].clientX - dragOffset.x) * 0.008;
        userRotation.x += (e.touches[0].clientY - dragOffset.y) * 0.008;
        dragOffset.x = e.touches[0].clientX;
        dragOffset.y = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  function onWindowResize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /* ----------------------------------------------------
     ANIMATION LOOP & CINEMATIC SCROLL TRANSITIONS
     ---------------------------------------------------- */
  function animate() {
    requestAnimationFrame(animate);
    if (!isReady || document.hidden) return;

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Smooth scroll interpolation
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

    // Smooth mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.06;
    mouse.y += (mouse.targetY - mouse.y) * 0.06;

    // Update Live Terminal Screen on Laptop
    if (Math.floor(elapsedTime * 30) % 2 === 0) {
      renderTerminalFrame(elapsedTime);
    }

    // 1. Calculate Camera Waypoint Interpolation based on Scroll Progress
    // We have 4 stages: [0: Hero, 1: Projects, 2: Services, 3: Contact]
    const numStages = cameraWaypoints.length - 1;
    const stagePos = scrollProgress * numStages;
    const currentStage = Math.min(numStages - 1, Math.floor(stagePos));
    const nextStage = Math.min(numStages, currentStage + 1);
    const stageFactor = stagePos - currentStage;

    // Ease stage factor smoothly (cubic)
    const smoothFactor = stageFactor * stageFactor * (3 - 2 * stageFactor);

    const wpA = cameraWaypoints[currentStage];
    const wpB = cameraWaypoints[nextStage];

    // Interpolate camera position
    const targetCamX = wpA.camPos.x + (wpB.camPos.x - wpA.camPos.x) * smoothFactor + mouse.x * 0.8;
    const targetCamY = wpA.camPos.y + (wpB.camPos.y - wpA.camPos.y) * smoothFactor + mouse.y * 0.5;
    const targetCamZ = wpA.camPos.z + (wpB.camPos.z - wpA.camPos.z) * smoothFactor;

    camera.position.x += (targetCamX - camera.position.x) * 0.08;
    camera.position.y += (targetCamY - camera.position.y) * 0.08;
    camera.position.z += (targetCamZ - camera.position.z) * 0.08;

    // Interpolate camera lookAt target
    const targetLookX = wpA.lookAt.x + (wpB.lookAt.x - wpA.lookAt.x) * smoothFactor;
    const targetLookY = wpA.lookAt.y + (wpB.lookAt.y - wpA.lookAt.y) * smoothFactor;
    const targetLookZ = wpA.lookAt.z + (wpB.lookAt.z - wpA.lookAt.z) * smoothFactor;

    camera.lookAt(targetLookX, targetLookY, targetLookZ);

    // 2. Animate 3D Laptop Workstation
    if (laptopGroup) {
      // Idle floating bob
      const hoverBob = Math.sin(elapsedTime * 1.8) * 0.12;

      const targetLapX = wpA.laptopPos.x + (wpB.laptopPos.x - wpA.laptopPos.x) * smoothFactor;
      const targetLapY = wpA.laptopPos.y + (wpB.laptopPos.y - wpA.laptopPos.y) * smoothFactor + hoverBob;
      const targetLapZ = wpA.laptopPos.z + (wpB.laptopPos.z - wpA.laptopPos.z) * smoothFactor;

      laptopGroup.position.set(targetLapX, targetLapY, targetLapZ);

      // Rotation blending + user drag
      const baseRotX = wpA.laptopRot.x + (wpB.laptopRot.x - wpA.laptopRot.x) * smoothFactor;
      const baseRotY = wpA.laptopRot.y + (wpB.laptopRot.y - wpA.laptopRot.y) * smoothFactor;
      const baseRotZ = wpA.laptopRot.z + (wpB.laptopRot.z - wpA.laptopRot.z) * smoothFactor;

      laptopGroup.rotation.x = baseRotX + userRotation.x * 0.5 - mouse.y * 0.15;
      laptopGroup.rotation.y = baseRotY + userRotation.y * 0.5 + mouse.x * 0.25;
      laptopGroup.rotation.z = baseRotZ;
    }

    // 3. Animate 3D Project Monolith Slabs
    if (projectSlabs.length > 0) {
      projectSlabs.forEach((slab, idx) => {
        // Individual float offset
        const slabBob = Math.sin(elapsedTime * 1.5 + idx * 1.2) * 0.08;
        slab.position.y += (slabBob - (slab.position.y % 0.08)) * 0.05;
        // Interactive tilt response
        slab.rotation.x = -mouse.y * 0.12;
      });
    }

    // 4. Animate 3D Cyber Gimbal Server Core
    if (gimbalRings.length === 3) {
      gimbalRings[0].rotation.x += 0.012;
      gimbalRings[0].rotation.y += 0.008;

      gimbalRings[1].rotation.y -= 0.015;
      gimbalRings[1].rotation.z += 0.010;

      gimbalRings[2].rotation.x -= 0.018;
      gimbalRings[2].rotation.z -= 0.012;
    }

    // 5. Animate 3D Holographic Beacon
    if (beaconRings.length > 0) {
      beaconRings.forEach((r, idx) => {
        r.rotation.z += 0.008 * (idx % 2 === 0 ? 1 : -1);
        r.material.opacity = 0.3 + Math.sin(elapsedTime * 3 + idx) * 0.25;
      });
    }

    // Decay user manual rotation smoothly back toward equilibrium
    userRotation.x *= 0.95;
    userRotation.y *= 0.95;

    renderer.render(scene, camera);
  }

  // Global API for console controls or slash triggers
  window.Cinematic3D = {
    jumpToSection: (index) => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const target = (index / (cameraWaypoints.length - 1)) * docHeight;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  };

})();
