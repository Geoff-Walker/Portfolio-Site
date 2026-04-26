/* ========================================================================
   APPFACTORY HERO — Three.js animation
   Phase 1: establishing shot (Archie + 7 agents constellation)
   Phase 2: build pipeline runs (Design → Gate → QA → Dev → Gate → End)
   ======================================================================== */

(function () {
  const canvas = document.getElementById('af-three');
  if (!canvas || !window.THREE) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    bg:     0x09090b,
    rule:   0x1e293b,
    white:  0xf8fafc,
    accent: 0x60a5fa,
    gold:   0xfbbf24,
    amber:  0xf59e0b,
    green:  0x22c55e,
    cyan:   0x67e8f9,
    packet: 0xf0f9ff,
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 22);

  function size() {
    const w = canvas.clientWidth = canvas.parentElement.clientWidth;
    const h = canvas.clientHeight = canvas.clientHeight || window.innerHeight * 0.6;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  size();
  window.addEventListener('resize', size);

  // ----- Helpers ------------------------------------------------------------
  function makeRoundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w/2, y = -h/2;
    s.moveTo(x+r, y);
    s.lineTo(x+w-r, y);
    s.quadraticCurveTo(x+w, y, x+w, y+r);
    s.lineTo(x+w, y+h-r);
    s.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    s.lineTo(x+r, y+h);
    s.quadraticCurveTo(x, y+h, x, y+h-r);
    s.lineTo(x, y+r);
    s.quadraticCurveTo(x, y, x+r, y);
    return s;
  }
  function rectOutline(w, h, r) {
    const shape = makeRoundedRectShape(w, h, r);
    const pts = shape.getPoints(8);
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, 0)));
    return g;
  }
  function diamondOutline(s) {
    const pts = [
      new THREE.Vector3(0, s, 0),
      new THREE.Vector3(s, 0, 0),
      new THREE.Vector3(0, -s, 0),
      new THREE.Vector3(-s, 0, 0),
      new THREE.Vector3(0, s, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  // Node = group with: outline (line), fill panel (mesh), label (sprite)
  function makeNode({ kind = 'agent', label = '', size = [1.7, 0.6], borderColor = 0xffffff, borderOpacity = 0.08 }) {
    const group = new THREE.Group();
    group.userData = { kind, label, restBorderColor: borderColor, restBorderOpacity: borderOpacity };

    const [w, h] = size;
    let geom;
    if (kind === 'gate') {
      geom = diamondOutline(0.45);
    } else {
      geom = rectOutline(w, h, 0.06);
    }
    const lineMat = new THREE.LineBasicMaterial({ color: borderColor, transparent: true, opacity: borderOpacity });
    const line = new THREE.LineLoop(geom, lineMat);
    if (kind === 'gate') {
      line.geometry = diamondOutline(0.45);
      const closing = new THREE.LineBasicMaterial({ color: borderColor, transparent: true, opacity: borderOpacity });
      line.material = closing;
    }
    group.add(line);
    group.userData.line = line;

    // fill panel (very subtle)
    const panelGeom = kind === 'gate'
      ? new THREE.PlaneGeometry(0.9, 0.9)
      : new THREE.PlaneGeometry(w, h);
    if (kind === 'gate') panelGeom.rotateZ(Math.PI / 4);
    const panelMat = new THREE.MeshBasicMaterial({ color: C.bg, transparent: true, opacity: 0.92 });
    const panel = new THREE.Mesh(panelGeom, panelMat);
    panel.position.z = -0.001;
    group.add(panel);
    group.userData.panel = panel;

    // label as canvas texture sprite
    if (label && kind !== 'gate') {
      const sprite = makeLabelSprite(label, '#94a3b8');
      sprite.position.set(0, 0, 0.01);
      group.add(sprite);
      group.userData.labelSprite = sprite;
    }

    return group;
  }

  function makeLabelSprite(text, color = '#94a3b8', size = 13) {
    const cv = document.createElement('canvas');
    const dpr = 2;
    cv.width = 256 * dpr;
    cv.height = 64 * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = `500 ${size}px "Geist", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(2.0, 0.5, 1);
    sp.userData = { ctx, cv, tex, color };
    return sp;
  }
  function setSpriteText(sprite, text, color) {
    const { ctx, cv, tex } = sprite.userData;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.font = `500 13px "Geist", "Helvetica Neue", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 32);
    tex.needsUpdate = true;
    sprite.userData.color = color;
  }

  // Sub-label (smaller, beneath node)
  function makeSubLabel(text) {
    const sp = makeLabelSprite(text, '#475569', 10);
    sp.scale.set(2.4, 0.5, 1);
    return sp;
  }

  // Thread between two nodes — line, with optional travelling glow segment
  function makeThread(from, to) {
    const pts = [from.position.clone(), to.position.clone()];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: C.rule, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(g, mat);
    line.userData = { from, to, glow: 0 };
    return line;
  }
  function updateThreadGeom(line) {
    const pos = line.geometry.attributes.position;
    pos.setXYZ(0, line.userData.from.position.x, line.userData.from.position.y, line.userData.from.position.z);
    pos.setXYZ(1, line.userData.to.position.x, line.userData.to.position.y, line.userData.to.position.z);
    pos.needsUpdate = true;
  }

  // Packet
  function makePacket() {
    const g = new THREE.SphereGeometry(0.10, 12, 12);
    const m = new THREE.MeshBasicMaterial({ color: C.packet });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    // halo
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeRadialTexture('#f0f9ff'), transparent: true, opacity: 0.7, depthTest: false,
    }));
    halo.scale.set(0.7, 0.7, 1);
    mesh.add(halo);
    mesh.userData.halo = halo;
    return mesh;
  }
  function makeRadialTexture(hex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const grd = ctx.createRadialGradient(64,64,0,64,64,64);
    grd.addColorStop(0, hex);
    grd.addColorStop(0.4, hex + '88');
    grd.addColorStop(1, hex + '00');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,128,128);
    return new THREE.CanvasTexture(cv);
  }

  // Sonar ring around a node
  function makeSonar() {
    const g = new THREE.RingGeometry(0.4, 0.42, 64);
    const m = new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0, side: THREE.DoubleSide });
    return new THREE.Mesh(g, m);
  }

  // ----- Build scene --------------------------------------------------------
  // Archie at top-centre
  const archie = makeNode({ kind: 'archie', label: 'Archie', size: [2.2, 0.7], borderColor: C.gold, borderOpacity: 0.85 });
  archie.position.set(0, 4.3, 0);
  // Override: archie label is whiter
  setSpriteText(archie.userData.labelSprite, 'Archie', '#f8fafc');
  scene.add(archie);
  const archieSub = makeSubLabel('ARCHITECT');
  archieSub.position.set(0, 3.65, 0);
  scene.add(archieSub);

  // 7 agents in a loose constellation
  const agentSpecs = [
    { name: 'Design',         x: -6.2, y:  1.2 },
    { name: 'QA',             x:  6.2, y:  1.2 },
    { name: 'Development',    x: -3.5, y: -2.6 },
    { name: 'Infrastructure', x:  3.5, y: -2.6 },
    { name: 'Research',       x: -7.0, y: -0.6 },
    { name: 'Ventures',       x:  7.0, y: -0.6 },
    { name: 'Risk / Ethics',  x:  0.0, y: -3.6 },
  ];
  const agents = {};
  agentSpecs.forEach(spec => {
    const node = makeNode({ kind: 'agent', label: spec.name, size: [2.4, 0.7] });
    node.position.set(spec.x, spec.y, 0);
    node.userData.spec = spec;
    node.userData.homePos = new THREE.Vector3(spec.x, spec.y, 0);
    scene.add(node);
    agents[spec.name] = node;
  });

  // Threads from Archie to every agent
  const threadsFromArchie = {};
  agentSpecs.forEach(spec => {
    const t = makeThread(archie, agents[spec.name]);
    scene.add(t);
    threadsFromArchie[spec.name] = t;
  });

  // Pipeline gate nodes (only used in Phase 2; positions set then)
  const gate1 = makeNode({ kind: 'gate' }); gate1.visible = false; scene.add(gate1);
  const gate2 = makeNode({ kind: 'gate' }); gate2.visible = false; scene.add(gate2);

  // End node
  const endNode = makeNode({ kind: 'agent', label: 'End', size: [1.4, 0.6] });
  endNode.visible = false; scene.add(endNode);

  // Pipeline threads (created lazily during Phase 2)
  let pipeThreads = [];

  // Sub-agent orbitals (Design's internal sub-agents — Research callout)
  const orbitals = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.SphereGeometry(0.07, 8, 8);
    const m = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    scene.add(mesh);
    orbitals.push(mesh);
  }

  // Packet
  const packet = makePacket();
  scene.add(packet);

  // Sonar
  const sonar = makeSonar();
  sonar.visible = false;
  scene.add(sonar);

  // QA "ticket lines" inside its node — small horizontal lines
  const qaLines = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.PlaneGeometry(1.4, 0.04);
    const m = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    scene.add(mesh);
    qaLines.push(mesh);
  }

  // Dev "code fragments" — small angled lines
  const devFrags = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.PlaneGeometry(0.5 + Math.random() * 0.3, 0.04);
    const m = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(g, m);
    mesh.visible = false;
    scene.add(mesh);
    devFrags.push(mesh);
  }

  // Completion caption
  const captionSprite = makeLabelSprite('A project spec goes in. Working software comes out.', '#64748b', 11);
  captionSprite.scale.set(8.0, 0.6, 1);
  captionSprite.position.set(0, -5.2, 0);
  captionSprite.material.opacity = 0;
  scene.add(captionSprite);

  // ----- Animation timeline -------------------------------------------------
  // Total cycle: 0..3 establishing, 3..14 pipeline run, 14..18 idle, then loop
  const TOTAL = 18.0;

  // Pipeline positions (used during Phase 2)
  const PIPE = {
    archie:  new THREE.Vector3(-7.5,  4.3, 0),
    design:  new THREE.Vector3(-5.0,  4.3, 0),
    gate1:   new THREE.Vector3(-2.0,  4.3, 0),
    qa:      new THREE.Vector3( 0.6,  4.3, 0),
    dev:     new THREE.Vector3( 3.4,  4.3, 0),
    gate2:   new THREE.Vector3( 5.6,  4.3, 0),
    end:     new THREE.Vector3( 7.5,  4.3, 0),
  };

  // Helper: smoothstep
  function ss(t) { return t<=0?0:t>=1?1:t*t*(3-2*t); }
  function lerpV(a, b, t) { return a.clone().lerp(b, ss(t)); }

  // Set border color/opacity helper
  function setNodeBorder(node, color, opacity) {
    node.userData.line.material.color.setHex(color);
    node.userData.line.material.opacity = opacity;
  }
  function setNodeLabel(node, color) {
    if (node.userData.labelSprite) setSpriteText(node.userData.labelSprite, node.userData.label, color);
  }

  // Pulse along thread (set glow value 0..1)
  function setThreadGlow(line, glow, color) {
    line.material.color.setHex(color);
    line.material.opacity = 0.18 + 0.7 * glow;
  }

  // ----- Animate ------------------------------------------------------------
  let cycleStart = performance.now();
  let lastT = 0;
  let elapsed = 0;

  // Hide pipeline elements initially
  function setPhase1Visibility() {
    gate1.visible = false; gate2.visible = false; endNode.visible = false;
    packet.visible = false; sonar.visible = false; captionSprite.material.opacity = 0;
    qaLines.forEach(l => l.visible = false);
    devFrags.forEach(f => f.visible = false);
    orbitals.forEach(o => o.visible = false);
  }
  setPhase1Visibility();

  function frame(now) {
    const speed = window.__animSpeed || 1;
    if (!lastT) lastT = now;
    const dt = (now - lastT) * 0.001;
    lastT = now;
    elapsed += dt * speed;
    if (elapsed >= TOTAL) elapsed = 0;
    const t = elapsed;

    // Camera drift — very slow orbital
    const driftAngle = Math.sin(t * 0.06) * 0.06;
    camera.position.x = Math.sin(driftAngle) * 22;
    camera.position.z = Math.cos(driftAngle) * 22;
    camera.position.y = Math.sin(t * 0.04) * 0.4;
    camera.lookAt(0, 0.4, 0);

    // ============ PHASE 1: Establishing (0..3s) ============
    if (t < 3) {
      const phase1 = t / 3;

      // Archie node home position
      archie.position.set(0, 4.3, 0);
      archieSub.position.set(0, 3.65, 0);
      archieSub.material.opacity = 1;

      // Archie subtle pulse
      const arch = 0.85 + 0.15 * Math.sin(t * 1.5);
      setNodeBorder(archie, C.gold, arch);

      // Agents at home positions, pulsing borders
      Object.values(agents).forEach(node => {
        node.position.copy(node.userData.homePos);
        node.userData.line.material.color.setHex(0xffffff);
        const breath = 0.05 + 0.04 * Math.sin(t * 0.8 + node.userData.homePos.x);
        node.userData.line.material.opacity = breath;
        node.userData.panel.material.opacity = 0.92;
        if (node.userData.labelSprite) setSpriteText(node.userData.labelSprite, node.userData.label, '#94a3b8');
      });

      // Threads at rest — heartbeat pulse
      Object.values(threadsFromArchie).forEach(line => {
        updateThreadGeom(line);
        const heart = 0.18 + 0.10 * Math.max(0, Math.sin(t * 1.2 + line.userData.to.position.x * 0.3));
        line.material.color.setHex(C.rule);
        line.material.opacity = heart;
      });

      setPhase1Visibility();
    }

    // ============ TRANSITION: 3..3.6s — packet arrives, sonar ============
    else if (t < 3.6) {
      const k = (t - 3) / 0.6;

      archie.position.set(0, 4.3, 0);
      archieSub.position.set(0, 3.65, 0);
      archieSub.material.opacity = 1 - k * 0.5;

      // Archie pulse + sonar
      setNodeBorder(archie, C.gold, 1);
      sonar.visible = true;
      sonar.position.copy(archie.position);
      sonar.scale.setScalar(1 + k * 4);
      sonar.material.opacity = (1 - k) * 0.6;

      // Spec packet materialises at archie
      packet.visible = true;
      packet.position.copy(archie.position);
      packet.scale.setScalar(0.6 + k * 0.6);

      // Agents still at home, threads dim
      Object.values(agents).forEach(node => {
        node.position.copy(node.userData.homePos);
        node.userData.line.material.opacity = 0.08;
      });

      setPhase1Visibility();
      packet.visible = true;
    }

    // ============ PHASE 2: Pipeline rearrangement & run (3.6..14s) ============
    else if (t < 14) {
      const local = t - 3.6;

      sonar.visible = false;

      // 3.6..4.6s — non-build agents dim, build agents move into pipeline row
      const moveK = ss(Math.min(1, local / 1.0));

      // Dim non-build agents
      const nonBuild = ['Infrastructure', 'Research', 'Ventures', 'Risk / Ethics'];
      const buildAgents = ['Design', 'QA', 'Development'];

      Object.entries(agents).forEach(([name, node]) => {
        if (nonBuild.includes(name)) {
          node.userData.line.material.opacity = 0.08 * (1 - moveK) + 0.04 * moveK;
          node.userData.panel.material.opacity = 0.92 * (1 - moveK * 0.8);
          if (node.userData.labelSprite) {
            const c = `rgba(148,163,184,${(1 - moveK * 0.8) * 0.5})`;
            setSpriteText(node.userData.labelSprite, name, c);
          }
        }
      });
      // Hide threads to non-build agents progressively
      nonBuild.forEach(name => {
        threadsFromArchie[name].material.opacity = 0.18 * (1 - moveK);
      });

      // Move Archie + build agents into pipeline row
      archie.position.copy(lerpV(new THREE.Vector3(0, 4.3, 0), PIPE.archie, moveK));
      archieSub.position.copy(archie.position).add(new THREE.Vector3(0, -0.65, 0));
      archieSub.material.opacity = 1 - moveK;

      agents['Design'].position.copy(lerpV(agents['Design'].userData.homePos, PIPE.design, moveK));
      agents['QA'].position.copy(lerpV(agents['QA'].userData.homePos, PIPE.qa, moveK));
      agents['Development'].position.copy(lerpV(agents['Development'].userData.homePos, PIPE.dev, moveK));

      // Build agents at rest border
      ['Design','QA','Development'].forEach(name => {
        const n = agents[name];
        n.userData.line.material.opacity = 0.12 + 0.05 * moveK;
        n.userData.line.material.color.setHex(0xffffff);
        n.userData.panel.material.opacity = 0.92;
      });

      // Make Archie's thread to Design the prominent one
      updateThreadGeom(threadsFromArchie['Design']);
      threadsFromArchie['Design'].material.opacity = 0.3 + 0.2 * moveK;
      threadsFromArchie['QA'].material.opacity = 0.05 * (1 - moveK);
      threadsFromArchie['Development'].material.opacity = 0.05 * (1 - moveK);

      // Show gate + end nodes after move completes
      if (moveK > 0.5) {
        gate1.visible = true; gate2.visible = true; endNode.visible = true;
        const showK = ss((moveK - 0.5) / 0.5);
        gate1.position.copy(PIPE.gate1);
        gate2.position.copy(PIPE.gate2);
        endNode.position.copy(PIPE.end);
        gate1.userData.line.material.color.setHex(0xffffff);
        gate2.userData.line.material.color.setHex(0xffffff);
        gate1.userData.line.material.opacity = 0.15 * showK;
        gate2.userData.line.material.opacity = 0.15 * showK;
        endNode.userData.line.material.opacity = 0.15 * showK;
        if (endNode.userData.labelSprite) setSpriteText(endNode.userData.labelSprite, 'End', '#94a3b8');

        // Pipeline threads
        if (pipeThreads.length === 0) {
          const seq = [archie, agents['Design'], gate1, agents['QA'], agents['Development'], gate2, endNode];
          for (let i = 0; i < seq.length - 1; i++) {
            const line = makeThread(seq[i], seq[i+1]);
            scene.add(line);
            pipeThreads.push(line);
          }
        }
        pipeThreads.forEach(line => {
          updateThreadGeom(line);
          line.material.color.setHex(C.rule);
          line.material.opacity = 0.6 * showK;
        });
      }

      // ----- Packet timeline (within pipeline phase) -----
      // local seconds for each segment (after 1s of move-in):
      const M = 1.0;
      const SEG = [
        { name: 'a-d',   t0: M+0.0, t1: M+1.0, from: archie,           to: agents['Design'] },
        { name: 'd-g1',  t0: M+2.0, t1: M+2.8, from: agents['Design'], to: gate1 },
        { name: 'g1-qa', t0: M+5.0, t1: M+5.8, from: gate1,            to: agents['QA'] },
        { name: 'qa-dv', t0: M+6.8, t1: M+7.4, from: agents['QA'],     to: agents['Development'] },
        { name: 'dv-g2', t0: M+8.4, t1: M+9.0, from: agents['Development'], to: gate2 },
        { name: 'g2-e',  t0: M+10.5,t1: M+11.1,from: gate2,            to: endNode },
      ];

      // Activation windows:
      const designActive = local >= M+1.0 && local < M+2.0;
      const gate1AmberStart = M+2.8, gate1Green = M+4.8, gate1ResumeAt = M+5.0;
      const gate1Amber = local >= gate1AmberStart && local < gate1Green;
      const gate1IsGreen = local >= gate1Green && local < gate1ResumeAt + 0.3;
      const qaActive = local >= M+5.8 && local < M+6.8;
      const devActive = local >= M+7.4 && local < M+8.4;
      const gate2AmberStart = M+9.0, gate2Green = M+10.3, gate2ResumeAt = M+10.5;
      const gate2Amber = local >= gate2AmberStart && local < gate2Green;
      const gate2IsGreen = local >= gate2Green && local < gate2ResumeAt + 0.3;
      const allDone = local >= M+11.1;

      // Draw active threads (between current packet seg)
      SEG.forEach(seg => {
        const lineIndex = SEG.indexOf(seg);
        const line = pipeThreads[lineIndex];
        if (!line) return;
        if (local >= seg.t0 && local < seg.t1 + 0.5) {
          const fade = local < seg.t1 ? 1 : Math.max(0, 1 - (local - seg.t1) / 0.5);
          line.material.color.setHex(C.accent);
          line.material.opacity = 0.3 + 0.7 * fade;
        } else if (allDone) {
          line.material.color.setHex(C.accent);
          line.material.opacity = 0.5 + 0.3 * Math.sin(t * 2);
        }
      });

      // Move packet
      packet.visible = false;
      SEG.forEach(seg => {
        if (local >= seg.t0 && local < seg.t1) {
          const k = (local - seg.t0) / (seg.t1 - seg.t0);
          packet.visible = true;
          packet.position.lerpVectors(seg.from.position, seg.to.position, k);
          packet.scale.setScalar(0.9 + 0.2 * Math.sin(local * 8));
        }
      });

      // Design active — orbital sub-agents
      if (designActive) {
        const k = (local - (M+1.0)) / 1.0;
        setNodeBorder(agents['Design'], C.accent, 1);
        if (agents['Design'].userData.labelSprite) setSpriteText(agents['Design'].userData.labelSprite, 'Design', '#f8fafc');
        orbitals.forEach((o, i) => {
          o.visible = true;
          const angle = local * 1.5 + i * (Math.PI * 2 / 3);
          const r = i === 0 ? 1.6 + k * 0.6 : 1.0;  // first orbital extends out (Research callout)
          o.position.set(
            agents['Design'].position.x + Math.cos(angle) * r,
            agents['Design'].position.y + Math.sin(angle) * r * 0.5,
            0.02
          );
          o.material.opacity = 0.9;
        });
      } else {
        if (local < M+1.0) {
          setNodeBorder(agents['Design'], 0xffffff, 0.12);
        }
        if (local >= M+2.0 && !allDone) {
          setNodeBorder(agents['Design'], C.accent, 0.5);
        }
        orbitals.forEach(o => { o.visible = false; });
      }

      // Gate 1 states
      if (gate1Amber) {
        setNodeBorder(gate1, C.amber, 1);
      } else if (gate1IsGreen) {
        setNodeBorder(gate1, C.green, 1);
        // rotate quarter turn
        const k = ss((local - gate1Green) / 0.3);
        gate1.rotation.z = k * Math.PI / 2;
      } else if (local >= gate1ResumeAt + 0.3) {
        setNodeBorder(gate1, C.green, 0.6);
      } else {
        setNodeBorder(gate1, 0xffffff, 0.15);
        gate1.rotation.z = 0;
      }

      // QA active — ticket lines appearing
      if (qaActive) {
        setNodeBorder(agents['QA'], C.accent, 1);
        if (agents['QA'].userData.labelSprite) setSpriteText(agents['QA'].userData.labelSprite, 'QA', '#f8fafc');
        const k = (local - (M+5.8)) / 1.0;
        qaLines.forEach((l, i) => {
          const lineK = (k - i * 0.18) / 0.2;
          if (lineK > 0) {
            l.visible = true;
            l.position.set(agents['QA'].position.x, agents['QA'].position.y + 0.2 - i * 0.1, 0.02);
            l.material.opacity = Math.min(1, lineK) * 0.7;
            l.scale.x = Math.min(1, lineK);
          }
        });
      } else {
        if (local >= M+6.8 && !allDone) setNodeBorder(agents['QA'], C.accent, 0.5);
        else if (local < M+5.8) setNodeBorder(agents['QA'], 0xffffff, 0.12);
        qaLines.forEach(l => { l.visible = false; });
      }

      // Dev active — code fragments
      if (devActive) {
        setNodeBorder(agents['Development'], C.accent, 1);
        if (agents['Development'].userData.labelSprite) setSpriteText(agents['Development'].userData.labelSprite, 'Development', '#f8fafc');
        const k = (local - (M+7.4)) / 1.0;
        devFrags.forEach((f, i) => {
          f.visible = true;
          const phase = (k * 4 + i * 0.4) % 1;
          f.position.set(
            agents['Development'].position.x - 0.8 + (i * 0.3) % 1.6,
            agents['Development'].position.y + 0.25 - phase * 0.5,
            0.02
          );
          f.material.opacity = (1 - Math.abs(phase - 0.5) * 2) * 0.8;
          f.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.2;
        });
      } else {
        if (local >= M+8.4 && !allDone) setNodeBorder(agents['Development'], C.accent, 0.5);
        else if (local < M+7.4) setNodeBorder(agents['Development'], 0xffffff, 0.12);
        devFrags.forEach(f => { f.visible = false; });
      }

      // Gate 2 states
      if (gate2Amber) {
        setNodeBorder(gate2, C.amber, 1);
      } else if (gate2IsGreen) {
        setNodeBorder(gate2, C.green, 1);
        const k = ss((local - gate2Green) / 0.2);
        gate2.rotation.z = k * Math.PI / 2;
      } else if (local >= gate2ResumeAt + 0.3) {
        setNodeBorder(gate2, C.green, 0.6);
      } else {
        setNodeBorder(gate2, 0xffffff, 0.15);
        gate2.rotation.z = 0;
      }

      // End node lights when packet arrives
      if (allDone) {
        setNodeBorder(endNode, C.accent, 1);
        if (endNode.userData.labelSprite) setSpriteText(endNode.userData.labelSprite, 'End', '#f8fafc');
        // All pipeline nodes pulse together
        const breath = 0.7 + 0.3 * Math.sin(t * 2);
        ['Design','QA','Development'].forEach(name => {
          setNodeBorder(agents[name], C.accent, breath);
        });
        setNodeBorder(gate1, C.green, breath);
        setNodeBorder(gate2, C.green, breath);
        setNodeBorder(endNode, C.accent, breath);
        // Caption fade in
        captionSprite.material.opacity = Math.min(1, (local - 11.1) / 0.8);
      } else {
        captionSprite.material.opacity = 0;
      }
    }

    // ============ IDLE COMPLETE: 14..18 ============
    else {
      const local = t - 14;
      // Hold in completion state, slow breath
      const breath = 0.7 + 0.3 * Math.sin(t * 1.5);
      ['Design','QA','Development'].forEach(name => setNodeBorder(agents[name], C.accent, breath));
      setNodeBorder(gate1, C.green, breath);
      setNodeBorder(gate2, C.green, breath);
      setNodeBorder(endNode, C.accent, breath);
      setNodeBorder(archie, C.gold, 0.85);
      captionSprite.material.opacity = 1 - Math.max(0, (local - 3.5) / 0.5);
      packet.visible = false;
      // Update pipeline thread positions in case Archie sub moved
      pipeThreads.forEach(updateThreadGeom);
    }

    renderer.render(scene, camera);
    if (!reduced) requestAnimationFrame(frame);
  }

  if (reduced) {
    // Static — show pipeline complete state
    elapsed = 15;
    lastT = performance.now();
    frame(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
})();

/* ========================================================================
   MOBILE FALLBACK — simplified 2D pipeline
   ======================================================================== */
(function () {
  const canvas = document.getElementById('af-three-2d');
  if (!canvas) return;
  if (window.innerWidth > 720 && !window.matchMedia('(max-width: 720px)').matches) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth = canvas.parentElement.clientWidth;
    const h = canvas.clientHeight = canvas.parentElement.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  size();
  window.addEventListener('resize', size);

  let start = performance.now();
  function frame(now) {
    const speed = window.__animSpeed || 1;
    const t = ((now - start) * 0.001 * speed) % 8;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#60a5fa';
    ctx.clearRect(0,0,w,h);

    const cy = h * 0.5;
    const xs = [w*0.12, w*0.32, w*0.52, w*0.72, w*0.88];
    // line
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xs[0], cy); ctx.lineTo(xs[xs.length-1], cy); ctx.stroke();
    // nodes
    xs.forEach((x, i) => {
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = i === Math.floor(t*0.6 % xs.length) ? accent : '#1e293b';
      ctx.lineWidth = 1;
      const sz = 18;
      ctx.fillRect(x-sz/2, cy-sz/2, sz, sz);
      ctx.strokeRect(x-sz/2, cy-sz/2, sz, sz);
    });
    // packet
    const seg = Math.floor(t / 1.5) % (xs.length - 1);
    const k = (t / 1.5) % 1;
    const px = xs[seg] + (xs[seg+1] - xs[seg]) * k;
    ctx.fillStyle = '#f0f9ff';
    ctx.beginPath(); ctx.arc(px, cy, 4, 0, Math.PI*2); ctx.fill();

    if (!reduced) requestAnimationFrame(frame);
  }
  if (!reduced) requestAnimationFrame(frame); else frame(performance.now());
})();

/* ========================================================================
   GATE DIAGRAM — small canvas illustrating the human-in-the-loop pause
   ======================================================================== */
(function () {
  const canvas = document.getElementById('gate-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth = canvas.parentElement.clientWidth;
    const h = canvas.clientHeight = canvas.parentElement.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  size();
  window.addEventListener('resize', size);

  const C = { rule:'#1e293b', dim:'#475569', fg:'#f8fafc', amber:'#f59e0b', green:'#22c55e' };
  function getAccent() { return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#60a5fa'; }

  let start = performance.now();
  let lastT = 0; let elapsed = 0;
  function frame(now) {
    const speed = window.__animSpeed || 1;
    if (!lastT) lastT = now;
    elapsed += (now - lastT) * 0.001 * speed; lastT = now;
    if (elapsed > 8) elapsed = 0;
    const t = elapsed;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const A = getAccent();
    ctx.clearRect(0,0,w,h);

    const cy = h * 0.5;
    const a = { x: w*0.18, y: cy, label: 'Agent' };
    const g = { x: w*0.5,  y: cy };
    const b = { x: w*0.82, y: cy, label: 'Next' };

    // Phase: 0-1.5 packet to gate; 1.5-4 gate amber pause + Archie callout; 4-4.5 green; 4.5-5.5 packet to next
    const toGate   = t < 1.5;
    const amber    = t >= 1.5 && t < 4;
    const green    = t >= 4 && t < 4.5;
    const toNext   = t >= 4.5 && t < 5.5;
    const post     = t >= 5.5;

    // threads
    ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(g.x-22, g.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.x+22, g.y); ctx.lineTo(b.x, b.y); ctx.stroke();

    if (amber || green || toGate) {
      ctx.strokeStyle = A; ctx.globalAlpha = toGate ? 1 : 0.4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(g.x-22, g.y); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (toNext || post) {
      ctx.strokeStyle = A; ctx.globalAlpha = post ? 0.5 : 1;
      ctx.beginPath(); ctx.moveTo(g.x+22, g.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Agent box
    function box(x, y, label, accent) {
      const bw = 80, bh = 28;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(x-bw/2, y-bh/2, bw, bh);
      ctx.strokeStyle = accent || C.rule;
      ctx.lineWidth = 1;
      ctx.strokeRect(x-bw/2, y-bh/2, bw, bh);
      ctx.fillStyle = accent ? C.fg : C.dim;
      ctx.font = '11px "Geist", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y);
    }
    box(a.x, a.y, 'Design', (toGate || amber || green) ? A : null);
    box(b.x, b.y, 'QA', (toNext || post) ? A : null);

    // Gate diamond
    const gateColor = green || post ? C.green : amber ? C.amber : C.rule;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(green ? Math.PI/4 * Math.min(1, (t-4)/0.5) : (post ? Math.PI/4 : 0));
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeStyle = gateColor;
    ctx.lineWidth = 1.5;
    if (amber) { ctx.shadowColor = C.amber; ctx.shadowBlur = 10; }
    if (green) { ctx.shadowColor = C.green; ctx.shadowBlur = 12; }
    ctx.strokeRect(-16, -16, 32, 32);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = C.dim;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GATE', g.x, g.y + 30);

    // Archie callout during amber
    if (amber) {
      const k = Math.min(1, (t - 1.5) / 0.4);
      const tx = g.x, ty = g.y - 80;
      ctx.globalAlpha = k;
      // box
      const bw = 180, bh = 50;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(tx - bw/2, ty - bh/2, bw, bh);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - bw/2, ty - bh/2, bw, bh);
      // text
      ctx.fillStyle = '#fbbf24';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('// ARCHIE — APPROVAL GATE', tx, ty - 10);
      ctx.fillStyle = C.fg;
      ctx.font = '11px "Geist", sans-serif';
      ctx.fillText('Design output ready. Approve?', tx, ty + 8);
      // connector line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2,3]);
      ctx.beginPath(); ctx.moveTo(tx, ty + bh/2); ctx.lineTo(g.x, g.y - 22); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Packet
    function packet(x, y) {
      const grd = ctx.createRadialGradient(x,y,0,x,y,10);
      grd.addColorStop(0, '#f0f9ff'); grd.addColorStop(1, 'rgba(96,165,250,0)');
      ctx.fillStyle = grd; ctx.fillRect(x-10, y-10, 20, 20);
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    }
    if (toGate) {
      const k = t / 1.5;
      packet(a.x + (g.x - 22 - a.x) * k, cy);
    }
    if (toNext) {
      const k = (t - 4.5) / 1.0;
      packet(g.x + 22 + (b.x - g.x - 22) * k, cy);
    }

    if (!reduced) requestAnimationFrame(frame);
  }
  if (reduced) { elapsed = 2; lastT = performance.now(); frame(performance.now()); }
  else requestAnimationFrame(frame);
})();
