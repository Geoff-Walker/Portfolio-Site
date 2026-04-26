/* Shared nav controls — scroll state, projects dropdown, burger/tray.
   Works for both #pf-nav (project pages) and #nav (AppFactory/home). */

(function () {
  /* ── scroll state ── */
  const navEl = document.getElementById('pf-nav') || document.getElementById('nav');
  if (navEl) {
    window.addEventListener('scroll', () => {
      navEl.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ── projects dropdown ── */
  const projBtn = document.querySelector('.pf-projects-btn');
  if (projBtn) {
    const projDrop = projBtn.nextElementSibling;
    projBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = projBtn.getAttribute('aria-expanded') !== 'true';
      projBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => {
      projBtn.setAttribute('aria-expanded', 'false');
    });
    if (projDrop) projDrop.addEventListener('click', (e) => e.stopPropagation());
  }

  /* ── burger + tray ── */
  const burger = document.querySelector('.pf-burger');
  const tray   = document.querySelector('.pf-tray');
  if (burger && tray) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      tray.classList.toggle('open', open);
    });
    tray.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.setAttribute('aria-expanded', 'false');
        tray.classList.remove('open');
      });
    });
  }
})();
