/* Sheet-music diff animation — Bach-ish 4-voice fragment, 8 bars
 * Pre-rendered SVG; a playhead sweeps across, colouring chords as it passes:
 *   green = correct, amber/bronze = timing off, red = wrong note, grey = missed.
 */
(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // 8 bars × 4 beats = 32 beats. Each "chord" event sits on a beat with a verdict.
  // We hand-pick 4 voices (S/A/T/B) per beat so the staves render plausibly.
  // Stave coords: treble staff baseline ~80, bass staff baseline ~200.
  // Y positions are MIDI-ish — lower y = higher pitch. We'll keep it stylised, not exact.

  const VERDICTS = ["correct", "correct", "correct", "timing", "correct", "wrong", "correct", "correct",
                    "correct", "correct", "missed", "correct", "correct", "timing", "correct", "correct",
                    "correct", "wrong", "correct", "correct", "correct", "correct", "correct", "missed",
                    "correct", "correct", "timing", "correct", "correct", "correct", "wrong", "correct"];

  const VERDICT_COLOR = {
    correct: "#00C000",
    timing:  "#CD7F32",
    wrong:   "#8B0000",
    missed:  "#B7B7B7",
  };

  // Chord shapes — soprano line is a gentle Bach-ish contour
  // values are step indices on a diatonic ladder; we map to y later
  const SOPRANO = [4,5,6,5,4,3,4,5, 6,7,8,7,6,5,4,3, 4,5,6,5,4,5,6,7, 8,7,6,5,4,3,2,1];
  const ALTO    = [1,2,3,2,1,0,1,2, 3,4,5,4,3,2,1,0, 1,2,3,2,1,2,3,4, 5,4,3,2,1,0,-1,-2];
  // Tenor and bass on the bass clef, lower
  const TENOR   = [0,1,2,1,0,-1,0,1, 2,3,4,3,2,1,0,-1, 0,1,2,1,0,1,2,3, 4,3,2,1,0,-1,-2,-3];
  const BASS    = [-3,-2,-1,-2,-3,-4,-3,-2, -1,0,1,0,-1,-2,-3,-4, -3,-2,-1,-2,-3,-2,-1,0, 1,0,-1,-2,-3,-4,-5,-6];

  function build(svg) {
    const W = 1100, H = 280;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "diff-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "A short fragment of sheet music. As a playhead sweeps across, each note is overlaid with a colour: green for correct, bronze for timing off, deep red for wrong note, grey for missed.");

    const STAVE_X = 70;
    const STAVE_RIGHT = W - 30;
    const STAVE_W = STAVE_RIGHT - STAVE_X;
    const TREBLE_TOP = 50;
    const BASS_TOP   = 170;
    const STAFF_H = 40; // 5 lines, 10px apart

    // Defs — a soft drop on note heads
    const defs = document.createElementNS(SVG_NS, "defs");
    defs.innerHTML = `
      <linearGradient id="playheadGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1A1A1A" stop-opacity="0"/>
        <stop offset=".5" stop-color="#1A1A1A" stop-opacity=".7"/>
        <stop offset="1" stop-color="#1A1A1A" stop-opacity="0"/>
      </linearGradient>
    `;
    svg.appendChild(defs);

    // Brace
    const brace = document.createElementNS(SVG_NS, "path");
    brace.setAttribute("d", `M ${STAVE_X - 20} ${TREBLE_TOP - 4}
      C ${STAVE_X - 35} ${TREBLE_TOP + 30}, ${STAVE_X - 35} ${TREBLE_TOP + 60}, ${STAVE_X - 18} ${(TREBLE_TOP + BASS_TOP + STAFF_H) / 2}
      C ${STAVE_X - 35} ${BASS_TOP + 10}, ${STAVE_X - 35} ${BASS_TOP + STAFF_H}, ${STAVE_X - 20} ${BASS_TOP + STAFF_H + 4}`);
    brace.setAttribute("fill", "none");
    brace.setAttribute("stroke", "#1A1A1A");
    brace.setAttribute("stroke-width", "2");
    svg.appendChild(brace);

    // Vertical join line at start
    const startBar = document.createElementNS(SVG_NS, "line");
    startBar.setAttribute("x1", STAVE_X); startBar.setAttribute("x2", STAVE_X);
    startBar.setAttribute("y1", TREBLE_TOP); startBar.setAttribute("y2", BASS_TOP + STAFF_H);
    startBar.setAttribute("stroke", "#1A1A1A");
    startBar.setAttribute("stroke-width", "1.4");
    svg.appendChild(startBar);

    // Draw 5-line staves (treble + bass)
    function drawStaff(top) {
      for (let i = 0; i < 5; i++) {
        const y = top + i * (STAFF_H / 4);
        const ln = document.createElementNS(SVG_NS, "line");
        ln.setAttribute("x1", STAVE_X);
        ln.setAttribute("x2", STAVE_RIGHT);
        ln.setAttribute("y1", y); ln.setAttribute("y2", y);
        ln.setAttribute("stroke", "#1A1A1A");
        ln.setAttribute("stroke-width", "0.8");
        svg.appendChild(ln);
      }
    }
    drawStaff(TREBLE_TOP);
    drawStaff(BASS_TOP);

    // Bar lines (8 bars => 8 divisions)
    for (let b = 1; b <= 8; b++) {
      const x = STAVE_X + (STAVE_W / 8) * b;
      const ln = document.createElementNS(SVG_NS, "line");
      ln.setAttribute("x1", x); ln.setAttribute("x2", x);
      ln.setAttribute("y1", TREBLE_TOP); ln.setAttribute("y2", BASS_TOP + STAFF_H);
      ln.setAttribute("stroke", "#1A1A1A");
      ln.setAttribute("stroke-width", b === 8 ? 2.2 : 0.8);
      svg.appendChild(ln);
    }
    // Final double bar
    const finalBar = document.createElementNS(SVG_NS, "line");
    finalBar.setAttribute("x1", STAVE_RIGHT - 4); finalBar.setAttribute("x2", STAVE_RIGHT - 4);
    finalBar.setAttribute("y1", TREBLE_TOP); finalBar.setAttribute("y2", BASS_TOP + STAFF_H);
    finalBar.setAttribute("stroke", "#1A1A1A");
    finalBar.setAttribute("stroke-width", "0.8");
    svg.appendChild(finalBar);

    // Treble & bass clef glyphs (simplified)
    function trebleClef(x, top) {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", top + STAFF_H + 5);
      t.setAttribute("font-family", "serif");
      t.setAttribute("font-size", "60");
      t.setAttribute("fill", "#1A1A1A");
      t.textContent = "𝄞";
      svg.appendChild(t);
    }
    function bassClef(x, top) {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", top + STAFF_H - 4);
      t.setAttribute("font-family", "serif");
      t.setAttribute("font-size", "48");
      t.setAttribute("fill", "#1A1A1A");
      t.textContent = "𝄢";
      svg.appendChild(t);
    }
    trebleClef(STAVE_X + 6, TREBLE_TOP);
    bassClef(STAVE_X + 6, BASS_TOP);

    // Time signature 4/4
    function timeSig(x, top) {
      const t = document.createElementNS(SVG_NS, "text");
      t.setAttribute("x", x); t.setAttribute("y", top + STAFF_H * 0.55);
      t.setAttribute("font-family", "serif");
      t.setAttribute("font-weight", "700");
      t.setAttribute("font-size", "26");
      t.setAttribute("fill", "#1A1A1A");
      t.textContent = "4";
      svg.appendChild(t);
      const t2 = t.cloneNode(true);
      t2.setAttribute("y", top + STAFF_H + 2);
      svg.appendChild(t2);
    }
    timeSig(STAVE_X + 50, TREBLE_TOP);
    timeSig(STAVE_X + 50, BASS_TOP);

    // === Note glyphs ===
    // Map step index to y. Treble: middle line is step 4 (≈ B4); each step = 5px.
    // Bass: middle line is step 0 (≈ D3).
    function trebleY(step) { return TREBLE_TOP + STAFF_H / 2 - step * 5; }
    function bassY(step)   { return BASS_TOP   + STAFF_H / 2 - step * 5; }

    const NOTE_START_X = STAVE_X + 90;
    const NOTE_AREA = STAVE_RIGHT - 10 - NOTE_START_X;
    const STEP = NOTE_AREA / 32;

    const noteGroups = []; // each beat collects 4 noteheads (S/A/T/B) for verdict colouring

    for (let i = 0; i < 32; i++) {
      const x = NOTE_START_X + i * STEP + STEP * 0.4;
      const beatGroup = document.createElementNS(SVG_NS, "g");
      beatGroup.setAttribute("class", "beat");
      beatGroup.dataset.beat = i;
      svg.appendChild(beatGroup);

      // Soprano (treble, stem up)
      const s = drawNote(x, trebleY(SOPRANO[i]), "up");
      // Alto (treble, stem down)
      const a = drawNote(x, trebleY(ALTO[i]), "down");
      // Tenor (bass, stem up)
      const t = drawNote(x, bassY(TENOR[i]), "up");
      // Bass (bass, stem down)
      const b = drawNote(x, bassY(BASS[i]), "down");
      [s, a, t, b].forEach(n => beatGroup.appendChild(n));
      noteGroups.push(beatGroup);
    }

    function drawNote(x, y, stemDir) {
      const g = document.createElementNS(SVG_NS, "g");
      // notehead (filled ellipse, slightly tilted)
      const head = document.createElementNS(SVG_NS, "ellipse");
      head.setAttribute("cx", x); head.setAttribute("cy", y);
      head.setAttribute("rx", 4.3); head.setAttribute("ry", 3.1);
      head.setAttribute("transform", `rotate(-18 ${x} ${y})`);
      head.setAttribute("fill", "#1A1A1A");
      head.setAttribute("class", "head");
      g.appendChild(head);
      // stem
      const stem = document.createElementNS(SVG_NS, "line");
      const len = 26;
      const sx = stemDir === "up" ? x + 4 : x - 4;
      const sy1 = y;
      const sy2 = stemDir === "up" ? y - len : y + len;
      stem.setAttribute("x1", sx); stem.setAttribute("x2", sx);
      stem.setAttribute("y1", sy1); stem.setAttribute("y2", sy2);
      stem.setAttribute("stroke", "#1A1A1A");
      stem.setAttribute("stroke-width", "1.2");
      g.appendChild(stem);
      return g;
    }

    // === Playhead ===
    const playhead = document.createElementNS(SVG_NS, "rect");
    playhead.setAttribute("x", NOTE_START_X);
    playhead.setAttribute("y", TREBLE_TOP - 18);
    playhead.setAttribute("width", 2.5);
    playhead.setAttribute("height", BASS_TOP + STAFF_H + 36 - TREBLE_TOP);
    playhead.setAttribute("fill", "url(#playheadGrad)");
    playhead.setAttribute("class", "playhead");
    svg.appendChild(playhead);

    return { noteGroups, playhead, NOTE_START_X, NOTE_AREA, STEP };
  }

  function reset(parts) {
    parts.noteGroups.forEach(g => {
      g.dataset.painted = "";
      g.querySelectorAll(".head").forEach(h => {
        h.style.transition = "fill .4s ease, stroke .4s ease";
        h.style.fill = "#1A1A1A";
        h.style.stroke = "none";
      });
    });
  }

  function start(svg) {
    const parts = build(svg);
    const total = 32;
    const cycleMs = 12000; // 12s for full sweep
    let raf, t0, started = false;

    function tick(now) {
      const t = (now - t0) / cycleMs;
      const wrapped = t % 1;
      const idx = Math.min(total - 1, Math.floor(wrapped * total));

      // Move playhead
      const x = parts.NOTE_START_X + wrapped * parts.NOTE_AREA;
      parts.playhead.setAttribute("x", x - 1);

      // Light up beats up to idx; reset at wrap
      if (wrapped < 0.01) reset(parts);

      for (let i = 0; i <= idx; i++) {
        const g = parts.noteGroups[i];
        if (g.dataset.painted !== "1") {
          const verdict = VERDICTS[i];
          const color = VERDICT_COLOR[verdict];
          g.querySelectorAll(".head").forEach(h => {
            h.style.fill = color;
            h.style.stroke = color;
            h.style.strokeWidth = "1";
          });
          g.dataset.painted = "1";
        }
      }
      raf = requestAnimationFrame(tick);
    }

    function go() {
      if (started) return;
      started = true;
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    }

    // Kick off animation immediately and on scroll-into-view.
    go();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { go(); io.disconnect(); }
      });
    }, { threshold: 0.15 });
    io.observe(svg);

    return parts;
  }

  window.TomDiff = { start };
})();
