/* AppFactory hero animation — SVG-driven, no Three.js.
 *
 * Composition: a single full-bleed SVG.
 *   • Phase 1 (0..4s)   constellation — Archie at centre, 7 agents in a tight ring,
 *                       threads pulsing, ambient stars drifting
 *   • Phase 2 (4..14s)  pipeline — non-build agents fade out + drift away,
 *                       build agents (Design, QA, Development) glide into a
 *                       centred horizontal flow with two gates and an End node.
 *                       A packet runs the line; gates pause amber → green;
 *                       Design spawns 3 orbital sub-agents.
 *   • Phase 3 (14..18s) idle complete — all pipeline nodes lit, gentle breath.
 *   • Loop back to Phase 1.
 *
 * Reduced-motion: render the completion state, statically.
 */
(function () {
  const root = document.getElementById('hero-anim');
  if (!root) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Logical viewport
  const VW = 1600, VH = 900;
  // Constellation centre — lifted above the hero wordmark area
  const CX = VW / 2, CY = VH * 0.42;

  // Colours (read from CSS so accent tweaks propagate)
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  const C = {
    bg: '#09090b',
    fg: '#f8fafc',
    dim: '#94a3b8',
    rule: '#1e293b',
    accent: () => cssVar('--accent', '#60a5fa'),
    gold: '#fbbf24',
    amber: '#f59e0b',
    green: '#22c55e',
    cyan: '#67e8f9',
    panel: '#0c0d10',
  };

  // ----- Build SVG ----------------------------------------------------------
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'block';
  svg.style.position = 'absolute';
  svg.style.inset = '0';

  // Defs — gradients, filters, glow
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `
    <radialGradient id="archieFill" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1a1410" stop-opacity="1"/>
      <stop offset="100%" stop-color="${C.bg}" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="archieGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.gold}" stop-opacity="0.20"/>
      <stop offset="60%" stop-color="${C.gold}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${C.gold}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${C.accent()}" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="${C.accent()}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${C.accent()}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="threadGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.accent()}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${C.accent()}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${C.accent()}" stop-opacity="0"/>
    </linearGradient>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="hardGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  `;
  svg.appendChild(defs);

  // Star layer (slow drift, ambient depth)
  const stars = document.createElementNS(SVG_NS, 'g');
  stars.setAttribute('class', 'stars');
  const STAR_COUNT = 80;
  const starData = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = Math.random() * VW;
    const y = Math.random() * VH;
    const r = Math.random() * 1.2 + 0.3;
    const tw = Math.random() * 4 + 4;
    starData.push({ x, y, r, tw, phase: Math.random() * Math.PI * 2 });
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('r', r);
    c.setAttribute('fill', '#cbd5e1');
    c.setAttribute('opacity', 0.15);
    stars.appendChild(c);
  }
  svg.appendChild(stars);

  // Group containers (z-order)
  const gThreads = document.createElementNS(SVG_NS, 'g'); svg.appendChild(gThreads);
  const gPipeThreads = document.createElementNS(SVG_NS, 'g'); svg.appendChild(gPipeThreads);
  const gNodes = document.createElementNS(SVG_NS, 'g'); svg.appendChild(gNodes);
  const gPacket = document.createElementNS(SVG_NS, 'g'); svg.appendChild(gPacket);

  // ----- Node factory --------------------------------------------------------
  // node = { kind, label, sub?, x, y, w, h, role: 'archie'|'build'|'aux'|'gate'|'end' }
  function makeNode(opts) {
    const { kind = 'rect', label = '', sub = '', w = 220, h = 76, role = 'aux' } = opts;
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'node');

    // glow halo (behind)
    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('cx', 0);
    halo.setAttribute('cy', 0);
    halo.setAttribute('r', Math.max(w, h) * 0.9);
    halo.setAttribute('fill', role === 'archie' ? 'url(#archieGlow)' : 'url(#nodeGlow)');
    halo.setAttribute('opacity', role === 'archie' ? 1 : 0);
    g.appendChild(halo);

    let shape;
    if (kind === 'gate') {
      // Diamond
      const s = 44;
      shape = document.createElementNS(SVG_NS, 'polygon');
      shape.setAttribute('points', `0,-${s} ${s},0 0,${s} -${s},0`);
    } else {
      shape = document.createElementNS(SVG_NS, 'rect');
      shape.setAttribute('x', -w/2);
      shape.setAttribute('y', -h/2);
      shape.setAttribute('width', w);
      shape.setAttribute('height', h);
      shape.setAttribute('rx', 6);
    }
    shape.setAttribute('fill', role === 'archie' ? 'url(#archieFill)' : C.panel);
    shape.setAttribute('stroke', role === 'archie' ? C.gold : '#ffffff');
    shape.setAttribute('stroke-width', role === 'archie' ? 1.2 : 1);
    shape.setAttribute('stroke-opacity', role === 'archie' ? 0.85 : 0.18);
    g.appendChild(shape);

    // label
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', 0);
    t.setAttribute('y', sub ? -4 : 6);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', 'Geist, "Helvetica Neue", sans-serif');
    t.setAttribute('font-size', role === 'archie' ? 22 : 18);
    t.setAttribute('font-weight', role === 'archie' ? 500 : 400);
    t.setAttribute('fill', role === 'archie' ? C.fg : C.dim);
    t.setAttribute('letter-spacing', '0.01em');
    t.textContent = label;
    g.appendChild(t);

    let subEl = null;
    if (sub) {
      subEl = document.createElementNS(SVG_NS, 'text');
      subEl.setAttribute('x', 0);
      subEl.setAttribute('y', 18);
      subEl.setAttribute('text-anchor', 'middle');
      subEl.setAttribute('font-family', 'JetBrains Mono, monospace');
      subEl.setAttribute('font-size', 10);
      subEl.setAttribute('fill', C.gold);
      subEl.setAttribute('letter-spacing', '0.18em');
      subEl.textContent = sub;
      g.appendChild(subEl);
    }

    g.dataset.role = role;
    return { g, shape, label: t, sub: subEl, halo, w, h, kind, role };
  }

  // ----- Build constellation -------------------------------------------------
  const archie = makeNode({ kind: 'rect', label: 'Archie', sub: 'ARCHITECT', w: 240, h: 84, role: 'archie' });
  archie.g.setAttribute('transform', `translate(${CX} ${CY})`);
  archie._home = { x: CX, y: CY };
  gNodes.appendChild(archie.g);

  // 7 agents in a wide ring around Archie — vertically squashed so bottom row clears the wordmark
  const RING_RX = 580;
  const RING_RY = 240;
  const agentSpecs = [
    { name: 'Design',         angle: -Math.PI * 0.5 },           // top
    { name: 'QA',             angle: -Math.PI * 0.5 + Math.PI * 0.286 },
    { name: 'Infrastructure', angle: -Math.PI * 0.5 + Math.PI * 0.572 },
    { name: 'Risk / Ethics',  angle: -Math.PI * 0.5 + Math.PI * 0.858 },
    { name: 'Development',    angle: -Math.PI * 0.5 + Math.PI * 1.144 },
    { name: 'Ventures',       angle: -Math.PI * 0.5 + Math.PI * 1.43 },
    { name: 'Research',       angle: -Math.PI * 0.5 + Math.PI * 1.716 },
  ];
  const agents = {};
  agentSpecs.forEach(spec => {
    const x = CX + Math.cos(spec.angle) * RING_RX;
    const y = CY + Math.sin(spec.angle) * RING_RY;
    const node = makeNode({ kind: 'rect', label: spec.name, w: 200, h: 64, role: 'aux' });
    node.g.setAttribute('transform', `translate(${x} ${y})`);
    node._home = { x, y };
    gNodes.appendChild(node.g);
    agents[spec.name] = node;
  });

  // Threads from Archie to every agent (constellation mode)
  const constellationThreads = {};
  agentSpecs.forEach(spec => {
    const a = agents[spec.name];
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', archie._home.x);
    line.setAttribute('y1', archie._home.y);
    line.setAttribute('x2', a._home.x);
    line.setAttribute('y2', a._home.y);
    line.setAttribute('stroke', C.rule);
    line.setAttribute('stroke-width', 1);
    line.setAttribute('stroke-opacity', 0.5);
    gThreads.appendChild(line);
    // Pulse dot
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', 2.5);
    dot.setAttribute('fill', C.accent());
    dot.setAttribute('opacity', 0.7);
    gThreads.appendChild(dot);
    constellationThreads[spec.name] = { line, dot, from: archie._home, to: a._home, phase: Math.random() };
  });

  // ----- Pipeline elements (built once, hidden by default) ------------------
  const PIPE_Y = CY;
  const PIPE_PAD_X = 280;
  const PIPE_W = VW - PIPE_PAD_X * 2;
  const PIPE_X0 = PIPE_PAD_X;
  const PIPE_X1 = VW - PIPE_PAD_X;
  // 7 stops: archie, design, gate1, qa, dev, gate2, end — evenly spaced
  const stops = [];
  for (let i = 0; i < 7; i++) {
    stops.push({ x: PIPE_X0 + (PIPE_W * i / 6), y: PIPE_Y });
  }
  const PIPE = {
    archie: stops[0],
    design: stops[1],
    gate1:  stops[2],
    qa:     stops[3],
    dev:    stops[4],
    gate2:  stops[5],
    end:    stops[6],
  };

  const gate1 = makeNode({ kind: 'gate', label: '', role: 'gate' });
  gate1.g.setAttribute('transform', `translate(${PIPE.gate1.x} ${PIPE.gate1.y})`);
  gate1.g.style.opacity = 0;
  gNodes.appendChild(gate1.g);

  const gate2 = makeNode({ kind: 'gate', label: '', role: 'gate' });
  gate2.g.setAttribute('transform', `translate(${PIPE.gate2.x} ${PIPE.gate2.y})`);
  gate2.g.style.opacity = 0;
  gNodes.appendChild(gate2.g);

  const endNode = makeNode({ kind: 'rect', label: 'End', w: 140, h: 64, role: 'end' });
  endNode.g.setAttribute('transform', `translate(${PIPE.end.x} ${PIPE.end.y})`);
  endNode.g.style.opacity = 0;
  gNodes.appendChild(endNode.g);

  // Pipeline thread (single horizontal path; segments revealed as packet progresses)
  const pipeBaseLine = document.createElementNS(SVG_NS, 'line');
  pipeBaseLine.setAttribute('x1', PIPE.archie.x);
  pipeBaseLine.setAttribute('y1', PIPE_Y);
  pipeBaseLine.setAttribute('x2', PIPE.end.x);
  pipeBaseLine.setAttribute('y2', PIPE_Y);
  pipeBaseLine.setAttribute('stroke', C.rule);
  pipeBaseLine.setAttribute('stroke-width', 1);
  pipeBaseLine.setAttribute('stroke-opacity', 0);
  gPipeThreads.appendChild(pipeBaseLine);

  // Active glow segment that follows the packet
  const pipeGlow = document.createElementNS(SVG_NS, 'line');
  pipeGlow.setAttribute('y1', PIPE_Y);
  pipeGlow.setAttribute('y2', PIPE_Y);
  pipeGlow.setAttribute('stroke', C.accent());
  pipeGlow.setAttribute('stroke-width', 2);
  pipeGlow.setAttribute('stroke-opacity', 0);
  pipeGlow.setAttribute('filter', 'url(#softGlow)');
  gPipeThreads.appendChild(pipeGlow);

  // Packet
  const packet = document.createElementNS(SVG_NS, 'g');
  packet.style.opacity = 0;
  const packetTrail = document.createElementNS(SVG_NS, 'rect');
  packetTrail.setAttribute('x', -28);
  packetTrail.setAttribute('y', -1);
  packetTrail.setAttribute('width', 28);
  packetTrail.setAttribute('height', 2);
  packetTrail.setAttribute('fill', C.accent());
  packetTrail.setAttribute('opacity', 0.6);
  packet.appendChild(packetTrail);
  const packetCore = document.createElementNS(SVG_NS, 'circle');
  packetCore.setAttribute('r', 5);
  packetCore.setAttribute('fill', '#f0f9ff');
  packetCore.setAttribute('filter', 'url(#softGlow)');
  packet.appendChild(packetCore);
  gPacket.appendChild(packet);

  // Sonar ring around Archie when spec arrives
  const sonar = document.createElementNS(SVG_NS, 'circle');
  sonar.setAttribute('r', 50);
  sonar.setAttribute('fill', 'none');
  sonar.setAttribute('stroke', C.gold);
  sonar.setAttribute('stroke-width', 1);
  sonar.setAttribute('opacity', 0);
  gPacket.appendChild(sonar);

  // QA tickets — 5 horizontal lines that appear inside QA node
  const qaLines = [];
  for (let i = 0; i < 5; i++) {
    const l = document.createElementNS(SVG_NS, 'rect');
    l.setAttribute('x', -50);
    l.setAttribute('y', -22 + i * 9);
    l.setAttribute('width', 0);
    l.setAttribute('height', 1.5);
    l.setAttribute('fill', C.accent());
    l.setAttribute('opacity', 0);
    qaLines.push(l);
  }

  // Dev iteration trace — a stroke that traces the perimeter of the dev node twice
  // Built as an SVG rect with stroke-dasharray; the dashoffset is animated.
  const devTrace = document.createElementNS(SVG_NS, 'rect');
  // Match dev node body geometry (200 × 64, rx 6)
  devTrace.setAttribute('width', 200);
  devTrace.setAttribute('height', 64);
  devTrace.setAttribute('rx', 6);
  devTrace.setAttribute('fill', 'none');
  devTrace.setAttribute('stroke', C.accent());
  devTrace.setAttribute('stroke-width', 2);
  devTrace.setAttribute('stroke-linecap', 'round');
  devTrace.setAttribute('opacity', 0);
  devTrace.setAttribute('filter', 'url(#softGlow)');
  // Approx perimeter for rounded rect: 2*(w+h) - small corner correction
  const TRACE_PERIM = 2 * (200 + 64) - 8 * (6 - Math.PI * 6 / 4);
  // Dash pattern: short bright segment + a gap as long as the rest
  const TRACE_DASH_LEN = 60;
  devTrace.setAttribute('stroke-dasharray', `${TRACE_DASH_LEN} ${TRACE_PERIM - TRACE_DASH_LEN}`);

  // (Legacy devFrags removed — replaced by perimeter trace)

  // Orbital sub-agents around Design
  const orbitals = [];
  for (let i = 0; i < 3; i++) {
    const o = document.createElementNS(SVG_NS, 'circle');
    o.setAttribute('r', 3.5);
    o.setAttribute('fill', C.cyan);
    o.setAttribute('opacity', 0);
    o.setAttribute('filter', 'url(#softGlow)');
    orbitals.push(o);
  }

  // Mount QA/Dev decorations & orbitals into gPacket so they sit above nodes
  qaLines.forEach(l => gPacket.appendChild(l));
  gPacket.appendChild(devTrace);
  orbitals.forEach(o => gPacket.appendChild(o));

  root.appendChild(svg);

  // ----- Animation drivers --------------------------------------------------
  // Helpers
  const ss = (t) => t<=0?0:t>=1?1:t*t*(3-2*t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function lerpXY(p1, p2, t) { return { x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t) }; }

  function setNodePos(node, x, y) {
    node.g.setAttribute('transform', `translate(${x} ${y})`);
  }
  function setNodeBorder(node, color, opacity, width) {
    node.shape.setAttribute('stroke', color);
    node.shape.setAttribute('stroke-opacity', opacity);
    if (width != null) node.shape.setAttribute('stroke-width', width);
  }
  function setNodeLabel(node, color) {
    node.label.setAttribute('fill', color);
  }
  function setNodeOpacity(node, op) { node.g.style.opacity = op; }
  function setNodeHalo(node, op) { node.halo.setAttribute('opacity', op); }

  // Timeline plan (seconds)
  // 0..0.5  : entry (everything fades in)
  // 0.5..4.0 : constellation breath
  // 4.0..4.6 : sonar burst at archie
  // 4.6..6.0 : non-build dim, build agents glide into pipeline row, archie glides too
  // 6.0..7.2 : packet archie→design, design activates with orbitals
  // 7.2..7.9 : design→gate1, gate1 amber pause
  // 7.9..8.6 : gate1 green, packet→qa, qa activates with tickets
  // 8.6..9.3 : qa→dev, dev activates with code fragments
  // 9.3..10.0: dev→gate2, gate2 amber pause
  // 10.0..10.7: gate2 green, packet→end, completion glow
  // 10.7..14.0: idle hold (all lit, slow breath)
  // 14.0..15.0: gentle dissolve back to constellation
  // loop

  const TOTAL = 20.0;
  let elapsed = 0;
  let lastT = 0;

  // Precompute pipeline target positions for build agents
  const buildTargets = {
    Design: PIPE.design,
    QA: PIPE.qa,
    Development: PIPE.dev,
  };
  // Where non-build agents drift to (off-frame, dim) during pipeline phase
  const auxDriftDirs = {};
  ['Infrastructure','Risk / Ethics','Ventures','Research'].forEach(name => {
    const home = agents[name]._home;
    const dx = home.x - CX;
    const dy = home.y - CY;
    const len = Math.hypot(dx, dy) || 1;
    auxDriftDirs[name] = { dx: (dx/len) * 240, dy: (dy/len) * 240 };
  });

  function frame(now) {
    const speed = window.__animSpeed || 1;
    if (!lastT) lastT = now;
    const dt = (now - lastT) * 0.001;
    lastT = now;
    elapsed += dt * speed;
    if (elapsed >= TOTAL) elapsed = 0;
    const t = elapsed;

    // Stars — gentle twinkle
    for (let i = 0; i < STAR_COUNT; i++) {
      const s = starData[i];
      const c = stars.children[i];
      const op = 0.10 + 0.18 * (0.5 + 0.5 * Math.sin(t / s.tw + s.phase));
      c.setAttribute('opacity', op);
    }

    // Constellation thread heartbeat (always running, dimmed when in pipeline)
    const constOpacity = t < 4.6 ? 1 : t < 6.0 ? Math.max(0, 1 - (t - 4.6) / 1.4) : 0;
    Object.values(constellationThreads).forEach(({ line, dot, from, to, phase }) => {
      const beat = 0.30 + 0.20 * Math.sin(t * 1.1 + phase * 6.28);
      line.setAttribute('stroke-opacity', constOpacity * beat);
      // travelling dot 0..1 along line
      const k = ((t * 0.18) + phase) % 1;
      dot.setAttribute('cx', lerp(from.x, to.x, k));
      dot.setAttribute('cy', lerp(from.y, to.y, k));
      dot.setAttribute('opacity', constOpacity * 0.7);
    });

    // ============ PHASE 1 — Constellation (0..4.6s) ============
    if (t < 4.6) {
      setNodePos(archie, archie._home.x, archie._home.y);
      // Archie breathing border + halo
      const arch = 0.7 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.2));
      setNodeBorder(archie, C.gold, arch, 1.2);
      setNodeHalo(archie, 0.8 + 0.2 * Math.sin(t * 1.2));

      // Agents at home, breathing border
      Object.values(agents).forEach((node, i) => {
        setNodePos(node, node._home.x, node._home.y);
        const breath = 0.18 + 0.10 * Math.sin(t * 0.9 + i);
        setNodeBorder(node, '#ffffff', breath, 1);
        setNodeOpacity(node, 1);
        setNodeHalo(node, 0);
        setNodeLabel(node, C.dim);
      });

      // Hide pipeline elements
      setNodeOpacity(gate1, 0);
      setNodeOpacity(gate2, 0);
      setNodeOpacity(endNode, 0);
      pipeBaseLine.setAttribute('stroke-opacity', 0);
      pipeGlow.setAttribute('stroke-opacity', 0);
      packet.style.opacity = 0;
      qaLines.forEach(l => l.setAttribute('opacity', 0));
      devTrace.setAttribute('opacity', 0);
      orbitals.forEach(o => o.setAttribute('opacity', 0));

      // Sonar burst at the very end of phase 1 (4..4.6)
      if (t >= 4.0) {
        const k = (t - 4.0) / 0.6;
        sonar.setAttribute('cx', archie._home.x);
        sonar.setAttribute('cy', archie._home.y);
        sonar.setAttribute('r', 50 + k * 280);
        sonar.setAttribute('opacity', (1 - k) * 0.6);
      } else {
        sonar.setAttribute('opacity', 0);
      }
    }

    // ============ PHASE 2a — Rearrange (4.6..6.0s) ============
    else if (t < 6.0) {
      const k = ss((t - 4.6) / 1.4);
      sonar.setAttribute('opacity', 0);

      // Archie glides to pipeline start
      const ap = lerpXY(archie._home, PIPE.archie, k);
      setNodePos(archie, ap.x, ap.y);
      setNodeBorder(archie, C.gold, 0.85, 1.2);
      setNodeHalo(archie, 1 - k * 0.5);

      // Build agents glide to pipeline positions
      ['Design','QA','Development'].forEach(name => {
        const from = agents[name]._home;
        const to = buildTargets[name];
        const p = lerpXY(from, to, k);
        setNodePos(agents[name], p.x, p.y);
        setNodeBorder(agents[name], '#ffffff', 0.20, 1);
        setNodeOpacity(agents[name], 1);
      });

      // Aux agents drift away + fade
      ['Infrastructure','Risk / Ethics','Ventures','Research'].forEach(name => {
        const home = agents[name]._home;
        const drift = auxDriftDirs[name];
        const x = home.x + drift.dx * k;
        const y = home.y + drift.dy * k;
        setNodePos(agents[name], x, y);
        setNodeOpacity(agents[name], 1 - k * 0.95);
      });

      // Reveal pipeline base line + gates + end
      pipeBaseLine.setAttribute('stroke-opacity', k * 0.5);
      setNodeOpacity(gate1, k);
      setNodeOpacity(gate2, k);
      setNodeOpacity(endNode, k);
      setNodeBorder(gate1, '#ffffff', 0.25, 1);
      setNodeBorder(gate2, '#ffffff', 0.25, 1);
      setNodeBorder(endNode, '#ffffff', 0.20, 1);
    }

    // ============ PHASE 2b — Pipeline run (6.0..15.5s) ============
    else if (t < 15.5) {
      const local = t - 6.0;

      // Hold positions
      setNodePos(archie, PIPE.archie.x, PIPE.archie.y);
      setNodePos(agents.Design, PIPE.design.x, PIPE.design.y);
      setNodePos(agents.QA, PIPE.qa.x, PIPE.qa.y);
      setNodePos(agents.Development, PIPE.dev.x, PIPE.dev.y);
      setNodeBorder(archie, C.gold, 0.85, 1.2);
      setNodeHalo(archie, 0.5);

      // Aux: held off-frame, faded
      ['Infrastructure','Risk / Ethics','Ventures','Research'].forEach(name => {
        const home = agents[name]._home;
        const drift = auxDriftDirs[name];
        setNodePos(agents[name], home.x + drift.dx, home.y + drift.dy);
        setNodeOpacity(agents[name], 0.05);
      });

      pipeBaseLine.setAttribute('stroke-opacity', 0.5);
      setNodeOpacity(gate1, 1);
      setNodeOpacity(gate2, 1);
      setNodeOpacity(endNode, 1);

      // Packet timeline:
      // local 0..1.2   : archie → design  (design active 1.2..1.6)
      // local 1.6..2.3 : design → gate1   (gate1 amber 2.3..2.9)
      // local 2.9..3.6 : gate1 → qa       (qa active 3.6..4.2 with tickets)
      // local 4.2..4.9 : qa → dev         (dev active 4.9..5.3)
      // local 5.3..5.6 : dev → qa         [QA/Dev loop 1 — back]
      // local 5.9..6.2 : qa → dev         [QA/Dev loop 1 — forward]
      // local 6.2..6.5 : dev active       [loop 2 trace]
      // local 6.5..6.8 : dev → qa         [QA/Dev loop 2 — back]
      // local 7.1..7.4 : qa → dev         [QA/Dev loop 2 — forward]
      // local 7.4..7.6 : dev active       [settling trace]
      // local 7.6..8.3 : dev → gate2      (gate2 amber 8.3..8.9)
      // local 8.9..9.6 : gate2 → end      (completion 9.6+)
      packet.style.opacity = 1;
      let pos = null;

      function setPacket(p1, p2, k) {
        pos = lerpXY(p1, p2, k);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
        packet.setAttribute('transform', `translate(${pos.x} ${pos.y}) rotate(${angle})`);
      }

      // Default: hide and show only when in a packet segment
      let packetVisible = false;
      if (local < 1.2) {
        setPacket(PIPE.archie, PIPE.design, local / 1.2);
        packetVisible = true;
      } else if (local < 1.6) {
        packetVisible = false;
      } else if (local < 2.3) {
        setPacket(PIPE.design, PIPE.gate1, (local - 1.6) / 0.7);
        packetVisible = true;
      } else if (local < 2.9) {
        packetVisible = false;
      } else if (local < 3.6) {
        setPacket(PIPE.gate1, PIPE.qa, (local - 2.9) / 0.7);
        packetVisible = true;
      } else if (local < 4.2) {
        packetVisible = false;
      } else if (local < 4.9) {
        setPacket(PIPE.qa, PIPE.dev, (local - 4.2) / 0.7);
        packetVisible = true;
      } else if (local < 5.3) {
        packetVisible = false;                                    // dev active 1
      } else if (local < 5.6) {
        setPacket(PIPE.dev, PIPE.qa, (local - 5.3) / 0.3);      // loop 1 back
        packetVisible = true;
      } else if (local < 5.9) {
        packetVisible = false;                                    // qa loop 1 pause
      } else if (local < 6.2) {
        setPacket(PIPE.qa, PIPE.dev, (local - 5.9) / 0.3);      // loop 1 forward
        packetVisible = true;
      } else if (local < 6.5) {
        packetVisible = false;                                    // dev active 2
      } else if (local < 6.8) {
        setPacket(PIPE.dev, PIPE.qa, (local - 6.5) / 0.3);      // loop 2 back
        packetVisible = true;
      } else if (local < 7.1) {
        packetVisible = false;                                    // qa loop 2 pause
      } else if (local < 7.4) {
        setPacket(PIPE.qa, PIPE.dev, (local - 7.1) / 0.3);      // loop 2 forward
        packetVisible = true;
      } else if (local < 7.6) {
        packetVisible = false;                                    // dev active 3 (settle)
      } else if (local < 8.3) {
        setPacket(PIPE.dev, PIPE.gate2, (local - 7.6) / 0.7);   // dev → gate2
        packetVisible = true;
      } else if (local < 8.9) {
        packetVisible = false;                                    // gate2 amber
      } else if (local < 9.6) {
        setPacket(PIPE.gate2, PIPE.end, (local - 8.9) / 0.7);   // gate2 → end
        packetVisible = true;
      } else {
        packetVisible = false;
      }
      packet.style.opacity = packetVisible ? 1 : 0;

      // Active glow line — extend along the path the packet has covered
      // Compute progress along pipeline as fraction 0..1
      const totalRunDuration = 9.6;
      const runK = Math.min(1, local / totalRunDuration);
      pipeGlow.setAttribute('x1', PIPE.archie.x);
      pipeGlow.setAttribute('x2', lerp(PIPE.archie.x, PIPE.end.x, runK));
      pipeGlow.setAttribute('stroke-opacity', 0.7);

      // Node states
      // Design active: 1.2 .. 1.6  + lingers lit after
      const designActive = local >= 1.2 && local < 1.6;
      const designLit = local >= 1.2;
      if (designActive) {
        setNodeBorder(agents.Design, C.accent(), 1, 1.5);
        setNodeLabel(agents.Design, C.fg);
        setNodeHalo(agents.Design, 0.8);
        // Orbitals
        const k = (local - 1.2) / 0.4;
        orbitals.forEach((o, i) => {
          const angle = local * 2.4 + i * (Math.PI * 2 / 3);
          const r = i === 0 ? 60 + k * 30 : 38;
          o.setAttribute('cx', PIPE.design.x + Math.cos(angle) * r);
          o.setAttribute('cy', PIPE.design.y + Math.sin(angle) * r * 0.55);
          o.setAttribute('opacity', 0.9);
        });
      } else if (designLit) {
        setNodeBorder(agents.Design, C.accent(), 0.55, 1.2);
        setNodeLabel(agents.Design, C.fg);
        setNodeHalo(agents.Design, 0.3);
        orbitals.forEach(o => o.setAttribute('opacity', 0));
      } else {
        setNodeBorder(agents.Design, '#ffffff', 0.20, 1);
        setNodeLabel(agents.Design, C.dim);
        setNodeHalo(agents.Design, 0);
        orbitals.forEach(o => o.setAttribute('opacity', 0));
      }

      // Gate 1 states: amber 2.3..2.9; green flash 2.9..3.05
      if (local >= 2.3 && local < 2.9) {
        setNodeBorder(gate1, C.amber, 1, 1.5);
        gate1.shape.setAttribute('fill', C.bg);
      } else if (local >= 2.9 && local < 3.4) {
        const k = ss((local - 2.9) / 0.4);
        setNodeBorder(gate1, C.green, 1, 1.5);
        gate1.g.setAttribute('transform', `translate(${PIPE.gate1.x} ${PIPE.gate1.y}) rotate(${k * 90})`);
      } else if (local >= 3.4) {
        setNodeBorder(gate1, C.green, 0.75, 1.2);
        gate1.g.setAttribute('transform', `translate(${PIPE.gate1.x} ${PIPE.gate1.y}) rotate(90)`);
      } else {
        setNodeBorder(gate1, '#ffffff', 0.25, 1);
        gate1.g.setAttribute('transform', `translate(${PIPE.gate1.x} ${PIPE.gate1.y})`);
      }

      // QA active: 3.6..4.2 + brief re-lights during dev/qa loops
      const qaActive  = local >= 3.6 && local < 4.2;
      const qaLoop1   = local >= 5.3 && local < 5.9;   // packet transiting dev↔qa loop 1
      const qaLoop2   = local >= 6.5 && local < 7.1;   // packet transiting dev↔qa loop 2
      const qaLit     = local >= 3.6;
      if (qaActive) {
        setNodeBorder(agents.QA, C.accent(), 1, 1.5);
        setNodeLabel(agents.QA, C.fg);
        setNodeHalo(agents.QA, 0.8);
        const k = (local - 3.6) / 0.6;
        qaLines.forEach((l, i) => {
          const lk = Math.max(0, Math.min(1, (k - i * 0.15) / 0.15));
          l.setAttribute('x', PIPE.qa.x - 50);
          l.setAttribute('y', PIPE.qa.y - 18 + i * 8);
          l.setAttribute('width', 100 * lk);
          l.setAttribute('opacity', lk * 0.7);
        });
      } else if (qaLoop1 || qaLoop2) {
        // Electric re-light as packet bounces through — no ticket animation
        setNodeBorder(agents.QA, C.accent(), 0.9, 1.4);
        setNodeLabel(agents.QA, C.fg);
        setNodeHalo(agents.QA, 0.55);
        qaLines.forEach(l => l.setAttribute('opacity', 0));
      } else if (qaLit) {
        setNodeBorder(agents.QA, C.accent(), 0.55, 1.2);
        setNodeLabel(agents.QA, C.fg);
        setNodeHalo(agents.QA, 0.3);
        qaLines.forEach(l => l.setAttribute('opacity', 0));
      } else {
        setNodeBorder(agents.QA, '#ffffff', 0.20, 1);
        setNodeLabel(agents.QA, C.dim);
        setNodeHalo(agents.QA, 0);
        qaLines.forEach(l => l.setAttribute('opacity', 0));
      }

      // Dev — three activations: initial + 2 loop returns + settling
      const devActive1 = local >= 4.9 && local < 5.3;
      const devActive2 = local >= 6.2 && local < 6.5;
      const devActive3 = local >= 7.4 && local < 7.6;
      const devLit     = local >= 4.9;

      devTrace.setAttribute('x', PIPE.dev.x - 100);
      devTrace.setAttribute('y', PIPE.dev.y - 32);

      if (devActive1) {
        setNodeBorder(agents.Development, C.accent(), 1, 1.5);
        setNodeLabel(agents.Development, C.fg);
        setNodeHalo(agents.Development, 0.7);
        devTrace.setAttribute('opacity', 1);
        const k = (local - 4.9) / 0.4;
        devTrace.setAttribute('stroke-dashoffset', -k * 2 * TRACE_PERIM);
      } else if (devActive2) {
        setNodeBorder(agents.Development, C.accent(), 1, 1.5);
        setNodeLabel(agents.Development, C.fg);
        setNodeHalo(agents.Development, 0.7);
        devTrace.setAttribute('opacity', 1);
        const k = (local - 6.2) / 0.3;
        devTrace.setAttribute('stroke-dashoffset', -k * 1.5 * TRACE_PERIM);
      } else if (devActive3) {
        setNodeBorder(agents.Development, C.accent(), 0.8, 1.3);
        setNodeLabel(agents.Development, C.fg);
        setNodeHalo(agents.Development, 0.5);
        devTrace.setAttribute('opacity', 1);
        const k = (local - 7.4) / 0.2;
        devTrace.setAttribute('stroke-dashoffset', -k * TRACE_PERIM);
      } else if (devLit) {
        setNodeBorder(agents.Development, C.accent(), 0.55, 1.2);
        setNodeLabel(agents.Development, C.fg);
        setNodeHalo(agents.Development, 0.3);
        devTrace.setAttribute('opacity', 0);
      } else {
        setNodeBorder(agents.Development, '#ffffff', 0.20, 1);
        setNodeLabel(agents.Development, C.dim);
        setNodeHalo(agents.Development, 0);
        devTrace.setAttribute('opacity', 0);
      }

      // Gate 2: amber 8.3..8.9; green 8.9..9.4
      if (local >= 8.3 && local < 8.9) {
        setNodeBorder(gate2, C.amber, 1, 1.5);
      } else if (local >= 8.9 && local < 9.4) {
        const k = ss((local - 8.9) / 0.4);
        setNodeBorder(gate2, C.green, 1, 1.5);
        gate2.g.setAttribute('transform', `translate(${PIPE.gate2.x} ${PIPE.gate2.y}) rotate(${k * 90})`);
      } else if (local >= 9.4) {
        setNodeBorder(gate2, C.green, 0.75, 1.2);
        gate2.g.setAttribute('transform', `translate(${PIPE.gate2.x} ${PIPE.gate2.y}) rotate(90)`);
      } else {
        setNodeBorder(gate2, '#ffffff', 0.25, 1);
        gate2.g.setAttribute('transform', `translate(${PIPE.gate2.x} ${PIPE.gate2.y})`);
      }

      // End node: lights once packet has crossed gate2
      if (local >= 9.6) {
        setNodeBorder(endNode, C.accent(), 1, 1.5);
        setNodeLabel(endNode, C.fg);
        setNodeHalo(endNode, 0.6);
      } else {
        setNodeBorder(endNode, '#ffffff', 0.20, 1);
        setNodeLabel(endNode, C.dim);
        setNodeHalo(endNode, 0);
      }
    }

    // ============ PHASE 3 — Idle complete (15.5..18.8s) ============
    else if (t < 18.8) {
      const local = t - 15.5;
      const breath = 0.6 + 0.3 * Math.sin(t * 1.5);

      setNodePos(archie, PIPE.archie.x, PIPE.archie.y);
      setNodeBorder(archie, C.gold, 0.85, 1.2);
      setNodeHalo(archie, 0.5);

      setNodePos(agents.Design, PIPE.design.x, PIPE.design.y);
      setNodePos(agents.QA, PIPE.qa.x, PIPE.qa.y);
      setNodePos(agents.Development, PIPE.dev.x, PIPE.dev.y);
      ['Design','QA','Development'].forEach(name => {
        setNodeBorder(agents[name], C.accent(), breath, 1.3);
        setNodeLabel(agents[name], C.fg);
        setNodeHalo(agents[name], 0.3);
      });
      setNodeBorder(gate1, C.green, breath * 0.95, 1.3);
      setNodeBorder(gate2, C.green, breath * 0.95, 1.3);
      gate1.g.setAttribute('transform', `translate(${PIPE.gate1.x} ${PIPE.gate1.y}) rotate(90)`);
      gate2.g.setAttribute('transform', `translate(${PIPE.gate2.x} ${PIPE.gate2.y}) rotate(90)`);
      setNodeBorder(endNode, C.accent(), breath, 1.3);
      setNodeLabel(endNode, C.fg);
      setNodeHalo(endNode, 0.4);

      pipeBaseLine.setAttribute('stroke-opacity', 0.5);
      pipeGlow.setAttribute('x1', PIPE.archie.x);
      pipeGlow.setAttribute('x2', PIPE.end.x);
      pipeGlow.setAttribute('stroke-opacity', 0.7);
      packet.style.opacity = 0;

      ['Infrastructure','Risk / Ethics','Ventures','Research'].forEach(name => {
        setNodeOpacity(agents[name], 0.05);
      });

      // Subtle outward pulse on completion (first second)
      if (local < 1.2) {
        const k = local / 1.2;
        sonar.setAttribute('cx', PIPE.end.x);
        sonar.setAttribute('cy', PIPE.end.y);
        sonar.setAttribute('r', 30 + k * 200);
        sonar.setAttribute('stroke', C.accent());
        sonar.setAttribute('opacity', (1 - k) * 0.5);
      } else {
        sonar.setAttribute('opacity', 0);
        sonar.setAttribute('stroke', C.gold);
      }
    }

    // ============ PHASE 4 — Reset to constellation (18.8..20.0s) ============
    else {
      const k = ss((t - 18.8) / 1.2);

      // Archie glides back to centre
      const ap = lerpXY(PIPE.archie, archie._home, k);
      setNodePos(archie, ap.x, ap.y);
      setNodeBorder(archie, C.gold, 0.85, 1.2);
      setNodeHalo(archie, 0.5 + 0.5 * k);

      // Build agents glide back to ring positions
      ['Design','QA','Development'].forEach(name => {
        const from = buildTargets[name];
        const to = agents[name]._home;
        const p = lerpXY(from, to, k);
        setNodePos(agents[name], p.x, p.y);
        // Fade their accent border back to white
        setNodeBorder(agents[name], '#ffffff', 0.20, 1);
        setNodeLabel(agents[name], C.dim);
        setNodeHalo(agents[name], 0.3 * (1 - k));
      });

      // Aux agents drift back + fade in
      ['Infrastructure','Risk / Ethics','Ventures','Research'].forEach(name => {
        const home = agents[name]._home;
        const drift = auxDriftDirs[name];
        const fromX = home.x + drift.dx;
        const fromY = home.y + drift.dy;
        const x = lerp(fromX, home.x, k);
        const y = lerp(fromY, home.y, k);
        setNodePos(agents[name], x, y);
        setNodeOpacity(agents[name], 0.05 + (1 - 0.05) * k);
        setNodeBorder(agents[name], '#ffffff', 0.20, 1);
        setNodeLabel(agents[name], C.dim);
      });

      // Pipeline elements fade out
      pipeBaseLine.setAttribute('stroke-opacity', 0.5 * (1 - k));
      pipeGlow.setAttribute('stroke-opacity', 0.7 * (1 - k));
      setNodeOpacity(gate1, 1 - k);
      setNodeOpacity(gate2, 1 - k);
      setNodeOpacity(endNode, 1 - k);
      packet.style.opacity = 0;
      sonar.setAttribute('opacity', 0);
    }

    if (!reduced) requestAnimationFrame(frame);
  }

  if (reduced) {
    // Static — show the completion state
    elapsed = 12;
    lastT = performance.now();
    frame(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
})();
