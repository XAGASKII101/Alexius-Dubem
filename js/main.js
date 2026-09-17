/* ----------------------------------------------------
   0. LIGHT / DARK THEME INITIALIZATION (INSTANT PAINT)
   ---------------------------------------------------- */
const savedTheme = localStorage.getItem('alexius_theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
}

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------
     THEME TOGGLE LISTENER
     ---------------------------------------------------- */
  const themeBtns = document.querySelectorAll('.theme-toggle-pill, #theme-toggle-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('alexius_theme', isLight ? 'light' : 'dark');
    });
  });

  /* ----------------------------------------------------
     1. PROJECT CATEGORY FILTER SWITCHER
     ---------------------------------------------------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  if (filterBtns.length > 0 && projectCards.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        projectCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'flex';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* ----------------------------------------------------
     2. MOBILE FLOATING DOCK ACTIVE OBSERVER
     ---------------------------------------------------- */
  const dockItems = document.querySelectorAll('.mobile-dock-item');
  const sections = document.querySelectorAll('section[id]');

  if (dockItems.length > 0 && sections.length > 0 && 'IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -50% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          dockItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href && href.includes('#' + id)) {
              dockItems.forEach(i => i.classList.remove('active'));
              item.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(sec => sectionObserver.observe(sec));
  }

  /* ----------------------------------------------------
     3. CUSTOM MAGNETIC CURSOR & HOVER STATES
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

  const hoverTargets = 'a, button, input, textarea, .service-card, .approach-card, .tech-tag, .btn-solid, .btn-outline, .project-card, .contact-option-row';
  document.querySelectorAll(hoverTargets).forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  /* ----------------------------------------------------
     4. RADIAL CURSOR SPOTLIGHT GLOW ON CARDS
     ---------------------------------------------------- */
  const spotlightCards = document.querySelectorAll('.service-card, .approach-card, .about-sidebar, .testimonial-card, .project-card, .contact-section-card');
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
     5. INTERACTIVE BACKGROUND PARTICLE MATRIX CANVAS
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
      ctx.fillStyle = 'rgba(200, 255, 0, 0.45)';
      ctx.fill();

      const dxMouse = mouseX - p.x;
      const dyMouse = mouseY - p.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      if (distMouse < 140) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = `rgba(200, 255, 0, ${0.28 * (1 - distMouse / 140)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(drawParticles);
  }
  requestAnimationFrame(drawParticles);

  /* ----------------------------------------------------
     6. TYPEWRITER HERO ROLE SWITCHER
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
        speed = 2200;
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
     7. ANIMATED NUMBER COUNTER OBSERVER
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
            const easeProgress = 1 - Math.pow(1 - progress, 3);
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
     8. SCROLL REVEAL OBSERVER
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
     9. ACTIVE PAGE HIGHLIGHTING
     ---------------------------------------------------- */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-dock-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('#') && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });

});
