/* =========================================
   ALEXIUS DUBEM — Next-Gen Interactive JS Engine
   Custom Cursor, Particle Canvas, 3D Card Tilt, Spotlight Glow, Typewriter & Stat Counters
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------
     1. CUSTOM MAGNETIC CURSOR & HOVER STATES
     ---------------------------------------------------- */
  const cursorDot = document.createElement('div');
  cursorDot.className = 'cursor-dot';
  const cursorRing = document.createElement('div');
  cursorRing.className = 'cursor-ring';
  document.body.appendChild(cursorDot);
  document.body.appendChild(cursorRing);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });

  function renderCursorRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursorRing);
  }
  requestAnimationFrame(renderCursorRing);

  // Add hover enlargement on interactive elements
  const hoverTargets = 'a, button, input, textarea, .service-card, .approach-card, .tech-tag, .btn-solid, .btn-outline, .dock-item';
  document.querySelectorAll(hoverTargets).forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  /* ----------------------------------------------------
     2. RADIAL CURSOR SPOTLIGHT GLOW ON CARDS
     ---------------------------------------------------- */
  const spotlightCards = document.querySelectorAll('.service-card, .approach-card, .about-sidebar, .connect-panel, form');
  spotlightCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  /* ----------------------------------------------------
     3. 3D GYROSCOPIC CARD PERSPECTIVE TILT
     ---------------------------------------------------- */
  const tiltCards = document.querySelectorAll('.service-card, .approach-card, .hero-photo-box');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      if (window.innerWidth <= 900) return; // Disable tilt on mobile touch screens
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotX = ((y - centerY) / centerY) * -8;
      const rotY = ((x - centerX) / centerX) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });

  /* ----------------------------------------------------
     4. INTERACTIVE BACKGROUND PARTICLE MATRIX CANVAS
     ---------------------------------------------------- */
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = Math.min(Math.floor(window.innerWidth / 25), 45);

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 51, 34, 0.4)';
      ctx.fill();

      // Connect particles close to mouse cursor
      const dxMouse = mouseX - p.x;
      const dyMouse = mouseY - p.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      if (distMouse < 140) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = `rgba(255, 51, 34, ${0.25 * (1 - distMouse / 140)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(drawParticles);
  }
  requestAnimationFrame(drawParticles);

  /* ----------------------------------------------------
     5. TYPEWRITER HERO ROLE SWITCHER
     ---------------------------------------------------- */
  const typewriterTarget = document.querySelector('.typewriter-role');
  if (typewriterTarget) {
    const roles = [
      'FULL-STACK DEVELOPER',
      'SYSTEMS ARCHITECT',
      'UI/UX ENGINEER',
      'PROBLEM SOLVER',
      'DEVOPS SPECIALIST'
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let speed = 100;

    function type() {
      const currentRole = roles[roleIndex];
      if (isDeleting) {
        typewriterTarget.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        speed = 40;
      } else {
        typewriterTarget.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        speed = 90;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        speed = 2200; // Pause at full word
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        speed = 400;
      }

      setTimeout(type, speed);
    }
    type();
  }

  /* ----------------------------------------------------
     6. ANIMATED NUMBER COUNTER OBSERVER
     ---------------------------------------------------- */
  const counterEls = document.querySelectorAll('[data-counter]');

  if (counterEls.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetNum = parseFloat(el.getAttribute('data-counter'));
          const isFloat = targetNum % 1 !== 0;
          const duration = 1800;
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const currentNum = easeProgress * targetNum;

            el.textContent = isFloat ? currentNum.toFixed(1) : Math.floor(currentNum);

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              el.textContent = isFloat ? targetNum.toFixed(1) : targetNum;
            }
          }

          requestAnimationFrame(updateCounter);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.2 });

    counterEls.forEach(el => counterObserver.observe(el));
  }

  /* ----------------------------------------------------
     7. SCROLL REVEAL OBSERVER
     ---------------------------------------------------- */
  const animateEls = document.querySelectorAll('[data-animate]');
  if (animateEls.length > 0 && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    animateEls.forEach(el => revealObserver.observe(el));
  } else {
    animateEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ----------------------------------------------------
     8. SMART MOBILE DOCK SCROLL HIDE/SHOW
     ---------------------------------------------------- */
  let lastScrollY = window.scrollY;
  const bottomDock = document.querySelector('.bottom-dock');

  if (bottomDock) {
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        bottomDock.style.transform = 'translate(-50%, 140%)';
      } else {
        bottomDock.style.transform = 'translate(-50%, 0)';
      }
      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  /* ----------------------------------------------------
     9. ACTIVE PAGE HIGHLIGHTING
     ---------------------------------------------------- */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('#') && href === currentPath) link.classList.add('active');
  });

  document.querySelectorAll('.dock-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && !href.includes('#') && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
      item.classList.add('active');
    }
  });

});
