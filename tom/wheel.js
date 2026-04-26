/* Circle-of-fifths wheel — zoom & cycle animation
 * Three rings:
 *   outer  — modes (Ionian … Locrian)
 *   middle — diatonic chord qualities for the current key (I, ii, iii, IV, V, vi, vii°)
 *   inner  — three primary chords (IV, I, V) of the current key
 * Outer key labels fixed by circle of fifths; the diatonic "window" is a thick arc
 * that rotates to frame the seven chords belonging to the current key.
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Circle of fifths order, starting at 12 o'clock = C
  // Scriabin colour for the *root* of each key cell is the root colour.
  const KEYS = [
    { name: "C",  pc: 0,  color: "#FF0000" },
    { name: "G",  pc: 7,  color: "#FF7F50" },
    { name: "D",  pc: 2,  color: "#FFFF00" },
    { name: "A",  pc: 9,  color: "#00C000" },
    { name: "E",  pc: 4,  color: "#87CEEB" },
    { name: "B",  pc: 11, color: "#A0D8EF" },
    { name: "F♯", pc: 6,  color: "#0066FF" },
    { name: "D♭", pc: 1,  color: "#8B00FF" },
    { name: "A♭", pc: 8,  color: "#B284BE" },
    { name: "E♭", pc: 3,  color: "#5F9EA0" },
    { name: "B♭", pc: 10, color: "#CD7F32" },
    { name: "F",  pc: 5,  color: "#8B0000" },
  ];

  const MODES = ["Ionian","Dorian","Phrygian","Lydian","Mixolydian","Aeolian","Locrian"];
  // Chord qualities in a major key, in scale-degree order
  const QUALITIES = ["I","ii","iii","IV","V","vi","vii°"];

  // Pop progression: I–V–vi–IV (degrees 0,4,5,3 in QUALITIES order)
  const PROGRESSION = [0, 4, 5, 3];

  // Geometry
  const SIZE = 600;
  const CX = SIZE / 2, CY = SIZE / 2;
  const R_OUTER_OUT = 290;      // outermost
  const R_OUTER_IN  = 235;      // mode ring inner
  const R_MID_OUT   = 220;      // chord ring outer (this is the "window" ring)
  const R_MID_IN    = 130;
  const R_CENTER    = 110;      // primary chords disc

  // 12-segment angles (each 30°), with C at 12 o'clock
  function segAngles(i) {
    const start = -90 + (i * 30) - 15;
    const end   = start + 30;
    return [start, end];
  }
  const polar = (cx, cy, r, deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  function arcPath(cx, cy, rOut, rIn, a1, a2) {
    const [x1, y1] = polar(cx, cy, rOut, a1);
    const [x2, y2] = polar(cx, cy, rOut, a2);
    const [x3, y3] = polar(cx, cy, rIn,  a2);
    const [x4, y4] = polar(cx, cy, rIn,  a1);
    const large = (a2 - a1) <= 180 ? 0 : 1;
    return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2}
            L ${x3} ${y3} A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4} Z`;
  }
  function midAngle(i) { const [a, b] = segAngles(i); return (a + b) / 2; }

  // For a key at slot k (0..11), the diatonic chords are scale-degree 0..6:
  //   degree d sits at slot ((k + offset[d]) mod 12) on the wheel,
  //   where offsets in fifths-order are [0, 2, 4, -1, 1, 3, 5]
  //   ( I=root, ii=+2 fifths, iii=+4, IV=-1, V=+1, vi=+3, vii°=+5 )
  const DEGREE_OFFSETS = [0, 2, 4, -1, 1, 3, 5];

  function build(svg) {
    svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "Circle of fifths showing keys, modes, and diatonic chords. The selected key cycles automatically.");

    // Defs — soft drop shadow for the focused window
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.innerHTML = `
      <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
    svg.appendChild(defs);

    // Root group — we'll scale this for the zoom effect
    const root = document.createElementNS(SVG_NS, "g");
    root.setAttribute("class", "wheel-root");
    root.setAttribute("transform-origin", `${CX} ${CY}`);
    svg.appendChild(root);

    // ==== Outer ring: KEY cells (12) — Scriabin fills, low opacity ====
    const keysGroup = document.createElementNS(SVG_NS, "g");
    keysGroup.setAttribute("class", "ring ring-keys");
    root.appendChild(keysGroup);

    KEYS.forEach((k, i) => {
      const [a1, a2] = segAngles(i);
      // Filled key cell on outermost ring (very low opacity so it reads as paper)
      const cell = document.createElementNS(SVG_NS, "path");
      cell.setAttribute("d", arcPath(CX, CY, R_OUTER_OUT, R_OUTER_IN, a1, a2));
      cell.setAttribute("fill", k.color);
      cell.setAttribute("fill-opacity", "0.10");
      cell.setAttribute("stroke", "#1A1A1A");
      cell.setAttribute("stroke-width", "0.6");
      cell.dataset.slot = i;
      keysGroup.appendChild(cell);

      // Mode label (rotate text to sit along arc — but keep upright by flipping past 6 o'clock)
      const ang = midAngle(i);
      const [tx, ty] = polar(CX, CY, (R_OUTER_OUT + R_OUTER_IN) / 2, ang);
      const upright = ang > 0 && ang < 180; // bottom half
      const rot = upright ? ang - 90 : ang + 90;

      const modeText = document.createElementNS(SVG_NS, "text");
      modeText.setAttribute("x", tx);
      modeText.setAttribute("y", ty);
      modeText.setAttribute("text-anchor", "middle");
      modeText.setAttribute("dominant-baseline", "middle");
      modeText.setAttribute("transform", `rotate(${rot} ${tx} ${ty})`);
      modeText.setAttribute("class", "wheel-mode");
      // Mode label rotates *with the key* — show the mode of degree i for the current root.
      // For a clean look on initial render, we put the key letter outside (rotates with selection)
      modeText.textContent = k.name;
      modeText.dataset.role = "key";
      modeText.dataset.slot = i;
      keysGroup.appendChild(modeText);
    });

    // ==== Middle ring: CHORD CELLS — also 12 slots, but only 7 are diatonic at a time ====
    const chordGroup = document.createElementNS(SVG_NS, "g");
    chordGroup.setAttribute("class", "ring ring-chords");
    root.appendChild(chordGroup);

    KEYS.forEach((k, i) => {
      const [a1, a2] = segAngles(i);
      const cell = document.createElementNS(SVG_NS, "path");
      cell.setAttribute("d", arcPath(CX, CY, R_MID_OUT, R_MID_IN, a1, a2));
      cell.setAttribute("fill", k.color);
      cell.setAttribute("fill-opacity", "0");
      cell.setAttribute("stroke", "#1A1A1A");
      cell.setAttribute("stroke-width", "0.5");
      cell.setAttribute("stroke-opacity", "0.35");
      cell.dataset.slot = i;
      cell.dataset.role = "chord-cell";
      chordGroup.appendChild(cell);

      // Chord-quality text (filled in dynamically per key)
      const ang = midAngle(i);
      const [tx, ty] = polar(CX, CY, (R_MID_OUT + R_MID_IN) / 2, ang);
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", tx);
      t.setAttribute("y", ty);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.setAttribute("class", "wheel-quality");
      t.dataset.slot = i;
      chordGroup.appendChild(t);
    });

    // ==== "Diatonic window" arc — thick dark stroke spanning 7 slots ====
    const window = document.createElementNS(SVG_NS, "path");
    window.setAttribute("class", "wheel-window");
    window.setAttribute("fill", "none");
    window.setAttribute("stroke", "#1A1A1A");
    window.setAttribute("stroke-width", "3.5");
    window.setAttribute("stroke-linecap", "round");
    window.setAttribute("filter", "url(#softGlow)");
    root.appendChild(window);

    // ==== Inner disc: primary chords IV–I–V ====
    const inner = document.createElementNS(SVG_NS, "g");
    inner.setAttribute("class", "ring ring-inner");
    root.appendChild(inner);

    const innerBg = document.createElementNS(SVG_NS, "circle");
    innerBg.setAttribute("cx", CX); innerBg.setAttribute("cy", CY);
    innerBg.setAttribute("r", R_CENTER);
    innerBg.setAttribute("fill", "#FFFFFF");
    innerBg.setAttribute("stroke", "#1A1A1A");
    innerBg.setAttribute("stroke-width", "0.8");
    inner.appendChild(innerBg);

    // 3 primary chord cells: IV (left third), I (middle third), V (right third)
    // We split the inner circle into three sectors at 120° each, oriented with I at top.
    const primarySegs = [
      { name: "IV", start: -90 - 60, end: -90 + 60, role: "IV" }, // top spanning ±60 — actually we want left/center/right
    ];
    // Easier layout: split full 360° into three 120° wedges, with I centered at top.
    const wedges = [
      { name: "IV", start: -210, end: -90,  role: "IV" }, // upper-left
      { name: "I",  start: -90,  end:  30,  role: "I" },  // upper-right (will be at top center after rotation)
    ];
    // Use simple split-at-top: I top, V bottom-right, IV bottom-left
    const tri = [
      { name: "I",  start: -90 - 60, end: -90 + 60 }, // top
      { name: "V",  start: -90 + 60, end: -90 + 180 },
      { name: "IV", start: -90 - 180, end: -90 - 60 },
    ];
    tri.forEach((w, idx) => {
      const p = document.createElementNS(SVG_NS, "path");
      const [x1, y1] = polar(CX, CY, R_CENTER, w.start);
      const [x2, y2] = polar(CX, CY, R_CENTER, w.end);
      p.setAttribute("d", `M ${CX} ${CY} L ${x1} ${y1} A ${R_CENTER} ${R_CENTER} 0 0 1 ${x2} ${y2} Z`);
      p.setAttribute("fill", "#fff");
      p.setAttribute("stroke", "#1A1A1A");
      p.setAttribute("stroke-width", "0.6");
      p.dataset.role = "primary";
      p.dataset.name = w.name;
      inner.appendChild(p);

      const ang = (w.start + w.end) / 2;
      const [tx, ty] = polar(CX, CY, R_CENTER * 0.55, ang);
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", tx);
      t.setAttribute("y", ty);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.setAttribute("class", "wheel-primary-label");
      t.textContent = w.name;
      inner.appendChild(t);
    });

    // Center key label
    const keyLabel = document.createElementNS(SVG_NS, "text");
    keyLabel.setAttribute("x", CX);
    keyLabel.setAttribute("y", CY - R_CENTER - 22);
    keyLabel.setAttribute("text-anchor", "middle");
    keyLabel.setAttribute("class", "wheel-keylabel");
    keyLabel.dataset.role = "keylabel";
    keyLabel.textContent = "C major";
    root.appendChild(keyLabel);

    return { svgRoot: root, windowPath: window, keysGroup, chordGroup, inner, keyLabel };
  }

  function updateForKey(parts, keyIndex) {
    const { windowPath, chordGroup, keyLabel, inner, svgRoot } = parts;
    const k = KEYS[keyIndex];

    // Update center label
    keyLabel.textContent = `${k.name} major`;

    // Compute the 7 diatonic slot indices for this key
    const diatonicSlots = DEGREE_OFFSETS.map(off => ((keyIndex + off) % 12 + 12) % 12);
    // window spans IV (offset -1) clockwise through V's neighbours; in fifths-order,
    // diatonic slots span offsets -1..+5 contiguously, so the window arc is from
    // offset -1 to offset +5.
    const winStartSlot = ((keyIndex - 1) % 12 + 12) % 12;
    const winEndSlot   = (keyIndex + 5) % 12;
    const [a1] = segAngles(winStartSlot);
    const [, a2Raw] = segAngles(winEndSlot);
    // Make sure arc goes the short way clockwise (7 segments = 210°)
    let a2 = a2Raw;
    if (a2 < a1) a2 += 360;

    // Compute window path on the chord ring's outer radius (slightly outside it for clarity)
    const r = R_MID_OUT + 6;
    const [x1, y1] = polar(CX, CY, r, a1);
    const [x2, y2] = polar(CX, CY, r, a2);
    const large = (a2 - a1) > 180 ? 1 : 0;
    windowPath.setAttribute("d",
      `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);

    // Update chord-quality cells: the 7 diatonic slots get filled with the *root's* color,
    // others fade.
    const cells = chordGroup.querySelectorAll('path[data-role="chord-cell"]');
    const labels = chordGroup.querySelectorAll('text[data-slot]');
    cells.forEach(c => {
      const slot = +c.dataset.slot;
      const degree = diatonicSlots.indexOf(slot);
      if (degree >= 0) {
        // Use Scriabin colour of the chord ROOT (the key at that slot)
        c.setAttribute("fill", KEYS[slot].color);
        c.setAttribute("fill-opacity", "0.0"); // animated in via active class
        c.dataset.degree = degree;
        c.classList.add("diatonic");
      } else {
        c.setAttribute("fill", "#fff");
        c.setAttribute("fill-opacity", "0");
        c.dataset.degree = "";
        c.classList.remove("diatonic", "active");
      }
    });
    labels.forEach(t => {
      const slot = +t.dataset.slot;
      const degree = diatonicSlots.indexOf(slot);
      if (degree >= 0) {
        t.textContent = QUALITIES[degree];
        t.setAttribute("opacity", "1");
      } else {
        t.textContent = "";
      }
    });

    // Update inner-disc fills with primary triad colours
    const primaries = inner.querySelectorAll('path[data-role="primary"]');
    const ITextMap = { I: keyIndex, V: (keyIndex + 1) % 12, IV: (keyIndex - 1 + 12) % 12 };
    primaries.forEach(p => {
      const slot = ITextMap[p.dataset.name];
      p.setAttribute("fill", KEYS[slot].color);
      p.setAttribute("fill-opacity", "0.18");
    });

    // Subtle pulse only — no pan. The whole wheel stays visible at all times;
    // emphasis comes from chord-cell highlighting, not from camera movement.
    svgRoot.style.transition = "transform 1.6s cubic-bezier(.5,.05,.2,1)";
    svgRoot.style.transform = `scale(1.0)`;
  }

  function pulseProgression(parts) {
    const { chordGroup } = parts;
    const cells = Array.from(chordGroup.querySelectorAll('path.diatonic'));
    const cellByDegree = {};
    cells.forEach(c => { cellByDegree[+c.dataset.degree] = c; });

    let idx = 0;
    function step() {
      // Clear all
      cells.forEach(c => {
        c.setAttribute("fill-opacity", "0");
        c.classList.remove("active");
      });
      const degree = PROGRESSION[idx % PROGRESSION.length];
      const cell = cellByDegree[degree];
      if (cell) {
        cell.setAttribute("fill-opacity", "0.85");
        cell.classList.add("active");
      }
      idx++;
    }
    return { step, total: PROGRESSION.length };
  }

  function start(svg, opts = {}) {
    const speedMul = opts.speed || 1; // 1 = normal
    const parts = build(svg);
    let keyIndex = 0;
    updateForKey(parts, keyIndex);
    const prog = pulseProgression(parts);

    // Pulse step every ~1100ms; full cycle = 4 chords; key change every cycle
    let stepInterval, keyTimer;
    let stepIdx = 0;

    function startCycle() {
      prog.step(); stepIdx = 1;
      stepInterval = setInterval(() => {
        prog.step();
        stepIdx++;
        if (stepIdx >= prog.total * 3) {
          // After 3 trips through the progression (~13s), change key
          clearInterval(stepInterval);
          setTimeout(() => {
            keyIndex = (keyIndex + 5) % 12; // jump by 5 fifths so each new key feels distinct
            updateForKey(parts, keyIndex);
            // Re-bind progression cells for new diatonic positions
            const newProg = pulseProgression(parts);
            // small pause for the zoom to settle
            setTimeout(startCycleFor.bind(null, newProg), 1400 / speedMul);
          }, 600 / speedMul);
        }
      }, 900 / speedMul);
    }
    function startCycleFor(p) {
      let i = 0;
      p.step(); i = 1;
      stepInterval = setInterval(() => {
        p.step(); i++;
        if (i >= p.total * 3) {
          clearInterval(stepInterval);
          setTimeout(() => {
            keyIndex = (keyIndex + 5) % 12;
            updateForKey(parts, keyIndex);
            const np = pulseProgression(parts);
            setTimeout(() => startCycleFor(np), 1400 / speedMul);
          }, 600 / speedMul);
        }
      }, 900 / speedMul);
    }

    startCycle();

    // Pause on tab hidden (nice citizen)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && stepInterval) clearInterval(stepInterval);
    });

    return parts;
  }

  window.TomWheel = { start };
})();
