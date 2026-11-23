/* ====================================================
   ALEXIUS DUBEM — 3D CYBERNETIC WEBGL ENGINE
   Holographic 3D Face Particle Cloud & Fiber Matrix
   Interactive 360° Orbit / Spin / Tilt Controls
   Scroll-Driven Fiber Dispersion & Magnetic Re-crystallization
   Multi-Layer 3D Perspective Card Tilt & Specular Glare
   ==================================================== */

(function () {
  'use strict';

  // State
  let scene, camera, renderer;
  let faceGroup, pointsMesh, linesMesh;
  let positionsArray, colorsArray, originalPositions, scatterPositions;
  let isDragging = false;
  let prevMouseX = 0, prevMouseY = 0;
  let targetRotX = 0, targetRotY = 0;
  let currentRotX = 0, currentRotY = 0;
  let autoSpin = false;
  let showFibers = true;
  let is3DMode = true;
  let isHeroVisible = true;
  let scrollDispersion = 0;
  let particleCount = 0;
  let clock;
  let stageContainer;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DEngine);
  } else {
    init3DEngine();
  }

  function init3DEngine() {
    stageContainer = document.getElementById('hero-3d-stage');
    if (!stageContainer) return;

    // Load Three.js if not already present
    if (typeof THREE === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = () => {
        setup3DScene();
        setup3DCardTilt();
        setupAmbientFibers();
      };
      script.onerror = () => {
        console.warn('Three.js CDN failed to load; using 2D fallback.');
      };
      document.head.appendChild(script);
    } else {
      setup3DScene();
      setup3DCardTilt();
      setupAmbientFibers();
    }
  }

  /* ----------------------------------------------------
     1. CREATE GENERATIVE GLOWING PARTICLE TEXTURE
     ---------------------------------------------------- */
  function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(200, 255, 0, 0.9)');
    grad.addColorStop(0.5, 'rgba(200, 255, 0, 0.35)');
    grad.addColorStop(1, 'rgba(200, 255, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /* ----------------------------------------------------
     2. SETUP 3D WEBGL HERO STAGE
     ---------------------------------------------------- */
  function setup3DScene() {
    if (!stageContainer) return;

    clock = new THREE.Clock();

    // Scene & Camera
    scene = new THREE.Scene();
    const width = stageContainer.clientWidth || 320;
    const height = stageContainer.clientHeight || 340;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 160);

    // WebGL Renderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('WebGL not supported on this device');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.className = 'hero-3d-webgl-canvas';
    stageContainer.appendChild(canvas);

    // Group for 3D face object
    faceGroup = new THREE.Group();
    scene.add(faceGroup);

    // Lighting (for any mesh reflections)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const limeLight = new THREE.PointLight(0xc8ff00, 2.5, 300);
    limeLight.position.set(60, 80, 120);
    scene.add(limeLight);

    const blueLight = new THREE.PointLight(0x00d2ff, 1.8, 300);
    blueLight.position.set(-60, -60, 80);
    scene.add(blueLight);

    // Load and scan me.jpg into 3D face model
    build3DFaceModel();

    // Event Listeners
    setupInteraction(canvas);
    setupControls();

    // Responsive Resize
    window.addEventListener('resize', onWindowResize, { passive: true });

    // Scroll Observer for Dispersion
    window.addEventListener('scroll', onScrollDispersion, { passive: true });

    // IntersectionObserver to pause rendering when hero is out of view
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        isHeroVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      observer.observe(stageContainer);
    }

    // Tab visibility handling
    document.addEventListener('visibilitychange', () => {
      isHeroVisible = !document.hidden;
    });

    // Start 60-120 FPS Animation Loop
    animate();
  }

  /* ----------------------------------------------------
     3. SCAN 'me.jpg' INTO 3D PARTICLES & FIBER MESH
     ---------------------------------------------------- */
  function build3DFaceModel() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/me.jpg';

    img.onload = () => {
      const isMobile = window.innerWidth <= 640;
      // High density grid for ultra-detailed recognizable face
      const sampleW = isMobile ? 80 : 105;
      const sampleH = isMobile ? 80 : 105;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = sampleW;
      offCanvas.height = sampleH;
      const ctx = offCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sampleW, sampleH);

      const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;

      const points = [];
      const colors = [];
      const scatters = [];
      const lineIndices = [];

      // Grid index map to quickly connect neighboring fibers
      const grid = new Int32Array(sampleW * sampleH).fill(-1);

      const scale = isMobile ? 0.95 : 1.15;
      const depthScale = isMobile ? 26 : 34;

      for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
          const idx = (y * sampleW + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          // Compute luminance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          // Skip very dark outer margins to focus on face portrait
          if (a < 50 || lum < 18) continue;

          // Centered 2D coordinates
          const posX = (x - sampleW / 2) * scale;
          const posY = -(y - sampleH / 2) * scale;

          // Natural human facial contour spherical volume
          const distFromCenter = Math.sqrt(posX * posX + posY * posY);
          const maxRadius = (sampleW * scale) * 0.52;
          const sphereFactor = Math.max(0, 1 - Math.min(1, distFromCenter / maxRadius));
          const sphereDepth = Math.sin(sphereFactor * Math.PI * 0.5) * 18;

          // Facial feature relief from pixel brightness (nose, cheeks, brow project forward)
          const featureDepth = (lum / 255) * depthScale - (depthScale * 0.35);
          const posZ = sphereDepth + featureDepth;

          const pointIdx = points.length / 3;
          grid[y * sampleW + x] = pointIdx;

          points.push(posX, posY, posZ);

          // Aesthetic Cyber Palette:
          // Preserve authentic skin & photo tones, with electric lime (#c8ff00) on bright highlights
          const limeFactor = Math.pow(lum / 255, 1.8);
          const cr = (r / 255) * (1 - limeFactor * 0.45) + (200 / 255) * (limeFactor * 0.45);
          const cg = (g / 255) * (1 - limeFactor * 0.6) + (255 / 255) * (limeFactor * 0.6);
          const cb = (b / 255) * (1 - limeFactor * 0.8) + (0 / 255) * (limeFactor * 0.8);

          colors.push(cr, cg, cb);

          // Scatter position for scroll dispersion (flowing fiber vortex)
          const angle = Math.random() * Math.PI * 2;
          const scatterDist = 90 + Math.random() * 240;
          scatters.push(
            posX + Math.cos(angle) * scatterDist,
            posY - 120 - Math.random() * 320, // flows downward into the page
            posZ + (Math.random() - 0.5) * 180
          );

          // Connect adjacent neighbors with fiber lines (step 2 to keep lines crisp and clean)
          if (x > 1 && grid[y * sampleW + (x - 2)] !== -1 && Math.random() < 0.42) {
            lineIndices.push(pointIdx, grid[y * sampleW + (x - 2)]);
          }
          if (y > 1 && grid[(y - 2) * sampleW + x] !== -1 && Math.random() < 0.42) {
            lineIndices.push(pointIdx, grid[(y - 2) * sampleW + x]);
          }
        }
      }

      particleCount = points.length / 3;
      originalPositions = new Float32Array(points);
      scatterPositions = new Float32Array(scatters);
      positionsArray = new Float32Array(points);
      colorsArray = new Float32Array(colors);

      // Points BufferGeometry
      const pointsGeo = new THREE.BufferGeometry();
      pointsGeo.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
      pointsGeo.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

      const particleTex = createParticleTexture();
      const pointsMat = new THREE.PointsMaterial({
        size: isMobile ? 2.3 : 2.7,
        vertexColors: true,
        map: particleTex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      pointsMesh = new THREE.Points(pointsGeo, pointsMat);
      faceGroup.add(pointsMesh);

      // Lines BufferGeometry (Fibers)
      if (lineIndices.length > 0) {
        const linesGeo = new THREE.BufferGeometry();
        linesGeo.setAttribute('position', pointsGeo.getAttribute('position'));
        linesGeo.setIndex(lineIndices);

        const linesMat = new THREE.LineBasicMaterial({
          color: 0xc8ff00,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        linesMesh = new THREE.LineSegments(linesGeo, linesMat);
        faceGroup.add(linesMesh);
      }

      // Hide loading spinner or static fallback once WebGL is ready
      const fallbackPhoto = stageContainer.querySelector('.photo-frame-fallback');
      if (fallbackPhoto) {
        fallbackPhoto.style.opacity = '0';
        fallbackPhoto.style.pointerEvents = 'none';
      }

      // Reveal 3D controls badge
      const badge = stageContainer.querySelector('.canvas-3d-badge');
      if (badge) badge.classList.add('active');
    };

    img.onerror = () => {
      console.warn('Could not load /me.jpg for 3D model.');
    };
  }

  /* ----------------------------------------------------
     4. INTERACTION (DRAG TO ROTATE, MOUSE PARALLAX, TOUCH)
     ---------------------------------------------------- */
  function setupInteraction(canvas) {
    let startX = 0, startY = 0;

    // Mouse Dragging
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        targetRotY += deltaX * 0.008;
        targetRotX += deltaY * 0.008;
        autoSpin = false;
        updateSpinButton();
      } else {
        // Subtle mouse parallax tilt when not dragging
        const rect = canvas.getBoundingClientRect();
        if (
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom
        ) {
          const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          targetRotY = normX * 0.45;
          targetRotX = -normY * 0.35;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (canvas) canvas.style.cursor = 'grab';
      }
    });

    // Touch Support for Mobile (Samsung S21, iPhone, etc.)
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - prevMouseX;
        const deltaY = e.touches[0].clientY - prevMouseY;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;

        targetRotY += deltaX * 0.01;
        targetRotX += deltaY * 0.01;
        autoSpin = false;
        updateSpinButton();
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      isDragging = false;
    });

    canvas.style.cursor = 'grab';
  }

  /* ----------------------------------------------------
     5. 3D STAGE CONTROLS (SPIN, FIBERS, RESET, 3D/PHOTO)
     ---------------------------------------------------- */
  function setupControls() {
    const btnSpin = document.getElementById('btn-spin-3d');
    const btnFibers = document.getElementById('btn-fibers-3d');
    const btnReset = document.getElementById('btn-reset-3d');
    const btnMode = document.getElementById('btn-mode-3d');

    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        autoSpin = !autoSpin;
        updateSpinButton();
      });
    }

    if (btnFibers) {
      btnFibers.addEventListener('click', () => {
        showFibers = !showFibers;
        if (linesMesh) linesMesh.visible = showFibers;
        btnFibers.classList.toggle('active', showFibers);
      });
      btnFibers.classList.add('active');
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        targetRotX = 0;
        targetRotY = 0;
        autoSpin = false;
        updateSpinButton();
      });
    }

    if (btnMode) {
      btnMode.addEventListener('click', () => {
        is3DMode = !is3DMode;
        const fallback = stageContainer.querySelector('.photo-frame-fallback');
        const canvas = stageContainer.querySelector('.hero-3d-webgl-canvas');
        if (fallback && canvas) {
          if (is3DMode) {
            fallback.style.opacity = '0';
            fallback.style.pointerEvents = 'none';
            canvas.style.opacity = '1';
            canvas.style.pointerEvents = 'auto';
            btnMode.innerHTML = '<i class="fa-solid fa-cube"></i> 3D Hologram';
          } else {
            fallback.style.opacity = '1';
            fallback.style.pointerEvents = 'auto';
            canvas.style.opacity = '0';
            canvas.style.pointerEvents = 'none';
            btnMode.innerHTML = '<i class="fa-solid fa-image"></i> HD Photo';
          }
        }
      });
    }
  }

  function updateSpinButton() {
    const btnSpin = document.getElementById('btn-spin-3d');
    if (btnSpin) {
      btnSpin.classList.toggle('active', autoSpin);
    }
  }

  /* ----------------------------------------------------
     6. SCROLL DISPERSION & RE-CRYSTALLIZATION
     ---------------------------------------------------- */
  function onScrollDispersion() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const heroHeight = stageContainer ? stageContainer.offsetHeight + 100 : 500;
    // Map scroll to 0..1
    scrollDispersion = Math.min(1, Math.max(0, scrollY / heroHeight));
  }

  /* ----------------------------------------------------
     7. WINDOW RESIZE HANDLER
     ---------------------------------------------------- */
  function onWindowResize() {
    if (!renderer || !camera || !stageContainer) return;
    const width = stageContainer.clientWidth || 320;
    const height = stageContainer.clientHeight || 340;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  /* ----------------------------------------------------
     8. ANIMATION LOOP (60 - 120 FPS SMOOTH)
     ---------------------------------------------------- */
  function animate() {
    requestAnimationFrame(animate);

    if (!isHeroVisible || !renderer || !scene || !camera) return;

    const delta = clock ? clock.getDelta() : 0.016;
    const elapsedTime = clock ? clock.getElapsedTime() : 0;

    // Auto-spin logic
    if (autoSpin) {
      targetRotY += 0.012;
    }

    // Smooth inertia interpolation
    currentRotX += (targetRotX - currentRotX) * 0.08;
    currentRotY += (targetRotY - currentRotY) * 0.08;

    if (faceGroup) {
      faceGroup.rotation.x = currentRotX;
      faceGroup.rotation.y = currentRotY;

      // Subtle cybernetic float idle bobbing
      faceGroup.position.y = Math.sin(elapsedTime * 1.6) * 3.5;
    }

    // Interpolate particle positions based on scroll dispersion
    if (pointsMesh && originalPositions && scatterPositions) {
      const posAttr = pointsMesh.geometry.attributes.position;
      const pos = posAttr.array;
      const t = scrollDispersion;

      // Add gentle dynamic wave when partially dispersed
      const wave = Math.sin(elapsedTime * 2.5) * 1.8;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const ox = originalPositions[i3];
        const oy = originalPositions[i3 + 1];
        const oz = originalPositions[i3 + 2];

        const sx = scatterPositions[i3];
        const sy = scatterPositions[i3 + 1];
        const sz = scatterPositions[i3 + 2];

        // Linear interpolation with dynamic organic sine drift
        pos[i3] = ox + (sx - ox) * t + Math.sin(elapsedTime + i * 0.05) * (t * 4);
        pos[i3 + 1] = oy + (sy - oy) * t + wave * t;
        pos[i3 + 2] = oz + (sz - oz) * t + Math.cos(elapsedTime + i * 0.05) * (t * 4);
      }

      posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  /* ----------------------------------------------------
     9. MULTI-LAYER 3D PERSPECTIVE CARD TILT & SPECULAR GLARE
     ---------------------------------------------------- */
  function setup3DCardTilt() {
    const cards = document.querySelectorAll('.project-card, .x-post-card, .service-card');
    if (!cards.length) return;

    cards.forEach((card) => {
      // Add dynamic 3D glare overlay if not present
      let glare = card.querySelector('.card-3d-glare');
      if (!glare) {
        glare = document.createElement('div');
        glare.className = 'card-3d-glare';
        card.appendChild(glare);
      }

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = -((y - centerY) / centerY) * 10;
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(12px)`;

        // Move dynamic specular light reflection
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(200, 255, 0, 0.15) 0%, rgba(255,255,255,0.05) 30%, transparent 70%)`;
        glare.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
        glare.style.opacity = '0';
      });
    });
  }

  /* ----------------------------------------------------
     10. AMBIENT 3D CYBER FIBER BACKGROUND MESH
     ---------------------------------------------------- */
  function setupAmbientFibers() {
    const bgContainer = document.getElementById('ambient-3d-bg');
    if (!bgContainer) return;

    const bgScene = new THREE.Scene();
    const bgCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    bgCamera.position.z = 200;

    let bgRenderer;
    try {
      bgRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch (e) {
      return;
    }

    bgRenderer.setSize(window.innerWidth, window.innerHeight);
    bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    bgContainer.appendChild(bgRenderer.domElement);

    // Floating 3D Node Mesh
    const count = window.innerWidth <= 640 ? 55 : 110;
    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      coords[i] = (Math.random() - 0.5) * 500;
      coords[i + 1] = (Math.random() - 0.5) * 500;
      coords[i + 2] = (Math.random() - 0.5) * 200;
    }

    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(coords, 3));

    const bgTex = createParticleTexture();
    const bgMat = new THREE.PointsMaterial({
      size: 3,
      color: 0xc8ff00,
      map: bgTex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const bgPoints = new THREE.Points(bgGeo, bgMat);
    bgScene.add(bgPoints);

    function animateBg() {
      requestAnimationFrame(animateBg);
      if (document.hidden) return;
      bgPoints.rotation.y += 0.0006;
      bgPoints.rotation.x += 0.0003;
      bgRenderer.render(bgScene, bgCamera);
    }
    animateBg();

    window.addEventListener('resize', () => {
      bgCamera.aspect = window.innerWidth / window.innerHeight;
      bgCamera.updateProjectionMatrix();
      bgRenderer.setSize(window.innerWidth, window.innerHeight);
    }, { passive: true });
  }

  // Export engine to window for console experimentation or studio controls
  window.Alexius3D = {
    setSpin: (val) => { autoSpin = val; updateSpinButton(); },
    toggleFibers: () => {
      showFibers = !showFibers;
      if (linesMesh) linesMesh.visible = showFibers;
    },
    resetAngle: () => { targetRotX = 0; targetRotY = 0; autoSpin = false; }
  };

})();
