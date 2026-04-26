/* Shared utilities: nav scroll, reveal, tweaks panel */

(function () {
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ===========================================================
  // TWEAKS PANEL
  // ===========================================================
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#60a5fa",
    "typeScale": 1,
    "animSpeed": 1
  }/*EDITMODE-END*/;

  const SWATCHES = [
    { name: 'Electric blue', value: '#60a5fa' },
    { name: 'Mint',          value: '#34d399' },
    { name: 'Amber',         value: '#fbbf24' },
    { name: 'Rose',          value: '#fb7185' },
    { name: 'Violet',        value: '#a78bfa' },
    { name: 'Slate',         value: '#cbd5e1' }
  ];

  let state = { ...TWEAK_DEFAULTS };

  function applyState() {
    document.documentElement.style.setProperty('--accent', state.accent);
    document.documentElement.style.setProperty('--type-scale', state.typeScale);
    document.documentElement.style.setProperty('--anim-speed', state.animSpeed);
    window.__animSpeed = state.animSpeed;
    window.dispatchEvent(new CustomEvent('tweaks-changed', { detail: state }));
  }
  applyState();

  function persist(edits) {
    Object.assign(state, edits);
    applyState();
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*');
    } catch (e) {}
  }

  function buildPanel() {
    const panel = document.createElement('div');
    panel.className = 'tweaks';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Tweaks');
    panel.innerHTML = `
      <div class="tweaks-head">
        <span>// tweaks</span>
        <button class="tweaks-close" aria-label="Close tweaks">×</button>
      </div>
      <div class="tweaks-body">
        <div class="tweak-row">
          <label>Accent</label>
          <div class="swatches" id="tw-swatches">
            ${SWATCHES.map(s => `<button class="swatch" title="${s.name}" data-color="${s.value}" style="background:${s.value}"></button>`).join('')}
          </div>
        </div>
        <div class="tweak-row">
          <label>Type scale</label>
          <div class="row">
            <input type="range" id="tw-type" min="0.85" max="1.2" step="0.01" value="${state.typeScale}">
            <span class="val" id="tw-type-val">${(state.typeScale).toFixed(2)}×</span>
          </div>
        </div>
        <div class="tweak-row">
          <label>Animation speed</label>
          <div class="row">
            <input type="range" id="tw-speed" min="0.25" max="2" step="0.05" value="${state.animSpeed}">
            <span class="val" id="tw-speed-val">${(state.animSpeed).toFixed(2)}×</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    function refreshSwatches() {
      panel.querySelectorAll('.swatch').forEach(b => {
        b.classList.toggle('active', b.dataset.color === state.accent);
      });
    }
    refreshSwatches();

    panel.querySelectorAll('.swatch').forEach(b => {
      b.addEventListener('click', () => {
        persist({ accent: b.dataset.color });
        refreshSwatches();
      });
    });
    panel.querySelector('#tw-type').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      panel.querySelector('#tw-type-val').textContent = v.toFixed(2) + '×';
      persist({ typeScale: v });
    });
    panel.querySelector('#tw-speed').addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      panel.querySelector('#tw-speed-val').textContent = v.toFixed(2) + '×';
      persist({ animSpeed: v });
    });
    panel.querySelector('.tweaks-close').addEventListener('click', () => {
      panel.classList.remove('open');
      try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
    });
    return panel;
  }

  const panel = buildPanel();

  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.type === '__activate_edit_mode') panel.classList.add('open');
    if (d.type === '__deactivate_edit_mode') panel.classList.remove('open');
  });

  try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
})();
