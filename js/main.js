/* ----------------------------------------------------
   0. LIGHT / DARK THEME INITIALIZATION (INSTANT PAINT)
   ---------------------------------------------------- */
const savedTheme = localStorage.getItem('alexius_theme');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
}

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------
     1. THEME TOGGLE LISTENER (Desktop + Mobile Floating)
     ---------------------------------------------------- */
  const themeBtns = document.querySelectorAll('.theme-toggle-pill, #theme-toggle-btn, .mobile-top-theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('alexius_theme', isLight ? 'light' : 'dark');
    });
  });

  /* ----------------------------------------------------
     2. TOP SCROLL PROGRESS BAR
     ---------------------------------------------------- */
  let progressBar = document.getElementById('scroll-progress-bar');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress-bar';
    document.body.prepend(progressBar);
  }

  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    if (progressBar) progressBar.style.width = scrolled + '%';
  }, { passive: true });

  /* ----------------------------------------------------
     3. PROJECT CATEGORY FILTER SWITCHER
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
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* ----------------------------------------------------
     4. MOBILE FLOATING DOCK ACTIVE OBSERVER
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
     5. ANIMATED NUMBER COUNTER (CLEAN & NON-INTRUSIVE)
     ---------------------------------------------------- */
  const counterEls = document.querySelectorAll('[data-counter]');

  if (counterEls.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetNum = parseFloat(el.getAttribute('data-counter'));
          const isFloat = targetNum % 1 !== 0;
          const duration = 1200;
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
     6. ACTIVE PAGE HIGHLIGHTING IN NAV
     ---------------------------------------------------- */
  const currentPath = window.location.pathname.split('/').filter(Boolean).pop() || '';
  document.querySelectorAll('.nav-links a, .mobile-dock-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('#')) {
      const linkPath = href.split('/').filter(Boolean).pop() || '';
      if (currentPath === linkPath) {
        link.classList.add('active');
      }
    }
  });

});
