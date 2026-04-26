/* App glue: Archie tooltip, Tweaks panel (vanilla, host-protocol-compliant) */
(function () {
  // ---------- Archie tooltip (once per session) ----------
  const tip = document.querySelector(".archie-tooltip");
  const archieBtn = document.querySelector(".archie-btn");
  if (tip && archieBtn) {
    const SEEN_KEY = "tom.archie.tooltip.shown";
    const seen = sessionStorage.getItem(SEEN_KEY);
    if (!seen) {
      setTimeout(() => {
        tip.classList.add("show");
        setTimeout(() => tip.classList.remove("show"), 5500);
      }, 2400);
      sessionStorage.setItem(SEEN_KEY, "1");
    }
  }
  archieBtn?.addEventListener("click", () => {
    tip?.classList.remove("show");
    // Placeholder behaviour — site-wide chat lives elsewhere.
  });

  // ---------- Tweaks panel ----------
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "fontPair": "fraunces-source",
    "wheelSpeed": 1.0,
    "stateMarker": "pill"
  }/*EDITMODE-END*/;

  const FONT_PAIRS = {
    "fraunces-source": {
      label: "Fraunces · Source Serif",
      display: '"Fraunces", Georgia, serif',
      body: '"Source Serif 4", Georgia, serif',
    },
    "playfair-literata": {
      label: "Playfair · Literata",
      display: '"Playfair Display", Georgia, serif',
      body: '"Literata", Georgia, serif',
    },
    "yeseva-lora": {
      label: "Yeseva One · Lora",
      display: '"Yeseva One", Georgia, serif',
      body: '"Lora", Georgia, serif',
    },
    "ptserif": {
      label: "PT Serif Caption · PT Serif",
      display: '"PT Serif Caption", Georgia, serif',
      body: '"PT Serif", Georgia, serif',
    },
  };

  let state = { ...TWEAK_DEFAULTS };
  let tweakOpen = false;

  function applyState() {
    const pair = FONT_PAIRS[state.fontPair] || FONT_PAIRS["fraunces-source"];
    document.documentElement.style.setProperty("--font-display", pair.display);
    document.documentElement.style.setProperty("--font-body", pair.body);

    // Wheel speed — communicate via a custom event; wheel.js reads on next cycle
    window.__tomSpeed = state.wheelSpeed;

    // State markers in the modality stack
    const markers = document.querySelectorAll(".state");
    markers.forEach(m => {
      const kind = m.dataset.kind; // live | partial | arch
      if (state.stateMarker === "pill") {
        m.style.display = "";
        m.dataset.glyph = "";
        m.textContent = kind === "live" ? "Live today"
          : kind === "partial" ? "Partially live" : "Architected";
      } else if (state.stateMarker === "dot") {
        m.dataset.glyph = "dot";
        m.innerHTML = `<i class="dot dot-${kind}" aria-hidden="true"></i><span class="vh">${
          kind === "live" ? "Live today" : kind === "partial" ? "Partially live" : "Architected"
        }</span>`;
      } else if (state.stateMarker === "glyph") {
        m.dataset.glyph = "glyph";
        const g = kind === "live" ? "✓" : kind === "partial" ? "◐" : "○";
        m.innerHTML = `<span aria-hidden="true">${g}</span><span class="vh">${
          kind === "live" ? "Live today" : kind === "partial" ? "Partially live" : "Architected"
        }</span>`;
      }
    });
  }

  // Vanilla Tweaks panel
  const panel = document.createElement("div");
  panel.className = "tweaks-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Tweaks");
  panel.innerHTML = `
    <h3>Tweaks <button class="tw-close" aria-label="Close">×</button></h3>
    <label for="tw-font">Type pairing</label>
    <select id="tw-font">
      <option value="fraunces-source">Fraunces · Source Serif</option>
      <option value="playfair-literata">Playfair · Literata</option>
      <option value="yeseva-lora">Yeseva One · Lora</option>
      <option value="ptserif">PT Serif Caption · PT Serif</option>
    </select>
    <label for="tw-speed">Wheel speed</label>
    <input id="tw-speed" type="range" min="0.5" max="2" step="0.1" />
    <div class="tw-row"><span>slower</span><span id="tw-speed-val">1.0×</span><span>faster</span></div>
    <label for="tw-marker">State markers</label>
    <select id="tw-marker">
      <option value="pill">Pill labels</option>
      <option value="dot">Coloured dots</option>
      <option value="glyph">Glyphs (✓ ◐ ○)</option>
    </select>
  `;
  document.body.appendChild(panel);

  function syncControls() {
    panel.querySelector("#tw-font").value = state.fontPair;
    panel.querySelector("#tw-speed").value = state.wheelSpeed;
    panel.querySelector("#tw-speed-val").textContent = (+state.wheelSpeed).toFixed(1) + "×";
    panel.querySelector("#tw-marker").value = state.stateMarker;
  }

  function persist(edits) {
    state = { ...state, ...edits };
    applyState();
    syncControls();
    try {
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits }, "*");
    } catch (_) {}
  }

  panel.querySelector("#tw-font").addEventListener("change", e => persist({ fontPair: e.target.value }));
  panel.querySelector("#tw-speed").addEventListener("input", e => persist({ wheelSpeed: +e.target.value }));
  panel.querySelector("#tw-marker").addEventListener("change", e => persist({ stateMarker: e.target.value }));
  panel.querySelector(".tw-close").addEventListener("click", () => {
    panel.classList.remove("open");
    tweakOpen = false;
    try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (_) {}
  });

  // Host protocol — register listener BEFORE announcing availability
  window.addEventListener("message", (e) => {
    const t = e.data && e.data.type;
    if (t === "__activate_edit_mode") {
      panel.classList.add("open");
      tweakOpen = true;
    } else if (t === "__deactivate_edit_mode") {
      panel.classList.remove("open");
      tweakOpen = false;
    }
  });
  try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (_) {}

  // Initial application
  applyState();
  syncControls();
})();
