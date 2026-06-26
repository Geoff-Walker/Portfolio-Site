/* Tom — Circle of Fifths (hero)
 * Faithful vanilla-JS port of the real musicTeacher circle-of-fifths component
 * (app/features/circle-of-fifths). Renders the real wheel — three chord rings
 * (major/minor/dim), the mode band (Lydian→Locrian), the diatonic wedge, Roman
 * numerals and the centre practice disc — in the app's own palette + Nunito.
 * Static default state (C Ionian, sharp spelling) with the app's intro spin.
 */
(function () {
  // ── Palette (app's own) ──────────────────────────────────────────────
  const COL = {
    C: '#E85C2A', G: '#E87A2A', D: '#E8A42A', A: '#C8C830', E: '#72C830',
    B: '#2AB862', 'F#': '#2AB8A8', Db: '#2A7AB8', Ab: '#2A4AB8',
    Eb: '#622AB8', Bb: '#A82AB8', F: '#C8306A',
  };
  const DARK_TEXT = new Set(['A', 'E']);
  const PALETTE_KEY = {
    C:'C','B#':'C','C#':'Db',Db:'Db',D:'D','D#':'Eb',Eb:'Eb',
    E:'E',Fb:'E',F:'F','E#':'F','F#':'F#',Gb:'F#',G:'G',
    'G#':'Ab',Ab:'Ab',A:'A','A#':'Bb',Bb:'Bb',B:'B',Cb:'B',
  };
  const colKey = r => PALETTE_KEY[r] || r;
  const noteTextColor = k => DARK_TEXT.has(k) ? '#2D1A00' : '#FFFFFF';

  const SEM_MAP = {
    C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,
    E:4,Fb:4,F:5,'E#':5,'F#':6,Gb:6,G:7,
    'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11,
  };

  // Sharp spelling (hero default)
  const COF        = ['C','G','D','A','E','B','F#','C#','Ab','Eb','Bb','F'];
  const REL_MIN    = ['Am','Em','Bm','F#m','C#m','G#m','D#m','A#m','Fm','Cm','Gm','Dm'];
  const REL_MIN_RT = ['A','E','B','F#','C#','G#','D#','A#','F','C','G','D'];
  const DIM        = ['B°','F#°','C#°','G#°','D#°','A#°','E#°','B#°','G°','D°','A°','E°'];
  const DIM_RT     = ['B','F#','C#','G#','D#','A#','E#','B#','G','D','A','E'];

  const NUMERAL = ['I','♭II','II','♭III','III','IV','♭V','V','♭VI','VI','♭VII','VII'];
  function numeralFor(rootSem, tonicSem, quality) {
    const interval = ((rootSem - tonicSem) % 12 + 12) % 12;
    const n = NUMERAL[interval];
    if (quality === 'major') return n;
    if (quality === 'minor') return n.toLowerCase();
    return n.toLowerCase() + '°';
  }

  // ── Modes ────────────────────────────────────────────────────────────
  const MODE_LABELS = [
    { mode: 'Lydian', offset: -1 }, { mode: 'Ionian', offset: 0 },
    { mode: 'Mixolydian', offset: 1 }, { mode: 'Dorian', offset: 2 },
    { mode: 'Aeolian', offset: 3 }, { mode: 'Phrygian', offset: 4 },
    { mode: 'Locrian', offset: 5 },
  ];
  const modeBrightness = o => 1 - ((o + 1) / 6);
  const modeBg = b => { const v = Math.round(40 + b * 215); return `rgb(${v},${v},${v})`; };
  const modeTxt = b => b > 0.45 ? '#1A1A1A' : '#FFFFFF';

  // ── Geometry ─────────────────────────────────────────────────────────
  const CX = 310, CY = 310;
  const R = {
    majIn: 80, majOut: 138, majMid: 109,
    minIn: 138, minOut: 188, minMid: 163,
    dimIn: 188, dimOut: 228, dimMid: 208,
    modeIn: 228, modeOut: 258, modeMid: 243,
  };
  const HALF_OFFSET = 7.5, MAJ_OFFSET = 5;

  function polar(r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }
  function arcPath(r1, r2, a1, a2) {
    const p1 = polar(r1, a1), p2 = polar(r1, a2);
    const p3 = polar(r2, a2), p4 = polar(r2, a1);
    const lg = (a2 - a1) > 180 ? 1 : 0;
    return `M${p1.x} ${p1.y} A${r1} ${r1} 0 ${lg} 1 ${p2.x} ${p2.y}` +
           ` L${p3.x} ${p3.y} A${r2} ${r2} 0 ${lg} 0 ${p4.x} ${p4.y}Z`;
  }
  function steppedPath(rIn, rMid, rOut, hw, hn) {
    const p1 = polar(rIn, -hw),  p2 = polar(rIn, +hw);
    const p3 = polar(rMid, +hw), p4 = polar(rMid, +hn);
    const p5 = polar(rOut, +hn), p6 = polar(rOut, -hn);
    const p7 = polar(rMid, -hn), p8 = polar(rMid, -hw);
    return `M${p1.x} ${p1.y} A${rIn} ${rIn} 0 0 1 ${p2.x} ${p2.y}` +
           ` L${p3.x} ${p3.y} A${rMid} ${rMid} 0 0 0 ${p4.x} ${p4.y}` +
           ` L${p5.x} ${p5.y} A${rOut} ${rOut} 0 0 0 ${p6.x} ${p6.y}` +
           ` L${p7.x} ${p7.y} A${rMid} ${rMid} 0 0 0 ${p8.x} ${p8.y} Z`;
  }
  function trapPoints(rMid, halfH, wIn, wOut) {
    const yIn = CY - rMid + halfH, yOut = CY - rMid - halfH;
    return `${CX-wIn},${yIn} ${CX+wIn},${yIn} ${CX+wOut},${yOut} ${CX-wOut},${yOut}`;
  }

  const SHADE_LIGHT = '#FCFCFC', SHADE_DARK = '#F1F1F1';
  const WEDGE_FRAME_D = steppedPath(R.majIn, R.minOut, R.dimOut, 45, 15);
  const NON_DIATONIC_SCRIM_D =
    `M ${CX} ${CY - R.dimOut} A ${R.dimOut} ${R.dimOut} 0 1 1 ${CX} ${CY + R.dimOut}` +
    ` A ${R.dimOut} ${R.dimOut} 0 1 1 ${CX} ${CY - R.dimOut} Z` +
    ` M ${CX} ${CY - R.majIn} A ${R.majIn} ${R.majIn} 0 1 1 ${CX} ${CY + R.majIn}` +
    ` A ${R.majIn} ${R.majIn} 0 1 1 ${CX} ${CY - R.majIn} Z ${WEDGE_FRAME_D}`;
  const MAJ_TRAP = trapPoints(R.majMid, 12, 13, 9);
  const MIN_TRAP = trapPoints(R.minMid, 12, 12, 18);
  const CENTRE_OUTER_R = R.majIn - 2, CENTRE_DISC_R = R.majIn - 8;

  const RING_DIVIDERS = [
    { r: R.majIn, stroke: '#C0C0C0', sw: 1 },
    { r: R.minIn, stroke: '#A8A8A8', sw: 1.6 },
    { r: R.dimIn, stroke: '#A8A8A8', sw: 1.6 },
    { r: R.modeIn, stroke: '#A8A8A8', sw: 1.6 },
    { r: R.modeOut, stroke: '#C0C0C0', sw: 1 },
  ];

  function buildBgRingSegs() {
    const segs = [];
    [[0, R.majIn, R.majOut], [1, R.minIn, R.minOut], [2, R.dimIn, R.dimOut]]
      .forEach(([rOff, rIn, rOut]) => {
        for (let i = 0; i < 12; i++) {
          segs.push({
            d: arcPath(rIn, rOut, i * 30 - 15, i * 30 + 15),
            fill: ((i + rOff) % 2 === 0) ? SHADE_LIGHT : SHADE_DARK,
          });
        }
      });
    return segs;
  }
  const WRAPAROUND_FILL = modeBg(modeBrightness(3));
  function buildModeBandBg() {
    const offsets = MODE_LABELS.map(m => m.offset);
    return Array.from({ length: 12 }, (_, i) => {
      const off = i <= 5 ? i : i - 12;
      const fill = offsets.includes(off) ? modeBg(modeBrightness(off)) : WRAPAROUND_FILL;
      return { d: arcPath(R.modeIn, R.modeOut, i * 30 - 15, i * 30 + 15), fill };
    });
  }
  const FIXED_MODE_SEGS = MODE_LABELS.map(({ mode, offset }) => {
    const a = offset * 30, b = modeBrightness(offset), p = polar(R.modeMid, a);
    return {
      mode, textFill: modeTxt(b), d: arcPath(R.modeIn, R.modeOut, a - 15, a + 15),
      fill: modeBg(b), tx: p.x, ty: p.y, rotTransform: `rotate(${a} ${p.x} ${p.y})`,
    };
  });

  // ── Render (default state: C Ionian, sharp) ──────────────────────────
  function render(svg) {
    svg.setAttribute('viewBox', '0 0 620 620');
    svg.style.filter =
      'drop-shadow(0 24px 48px rgba(0,0,0,0.16)) drop-shadow(0 8px 16px rgba(0,0,0,0.10))';
    const p = [];

    buildBgRingSegs().forEach(s => p.push(`<path d="${s.d}" fill="${s.fill}"/>`));
    buildModeBandBg().forEach(s => p.push(`<path d="${s.d}" fill="${s.fill}"/>`));
    RING_DIVIDERS.forEach(d =>
      p.push(`<circle cx="${CX}" cy="${CY}" r="${d.r}" fill="none" stroke="${d.stroke}" stroke-width="${d.sw}"/>`));

    for (let i = 0; i < 12; i++) {
      const aR = i * 30 + HALF_OFFSET, aRmaj = i * 30 + MAJ_OFFSET;
      const majPK = colKey(COF[i]), minPK = colKey(REL_MIN_RT[i]), dimPK = colKey(DIM_RT[i]);
      const dp = polar(R.dimMid, aR);
      const majT = `rotate(${aRmaj} ${CX} ${CY})`, rotT = `rotate(${aR} ${CX} ${CY})`;
      p.push(`<polygon points="${MAJ_TRAP}" fill="${COL[majPK]}" stroke="white" stroke-width="1.5" transform="${majT}"/>`);
      p.push(`<g transform="${majT}"><text x="${CX}" y="201" text-anchor="middle" dominant-baseline="middle" fill="${noteTextColor(majPK)}" font-family="Nunito,sans-serif" font-size="11" font-weight="800">${COF[i]}</text></g>`);
      p.push(`<polygon points="${MIN_TRAP}" fill="${COL[minPK]}" stroke="white" stroke-width="1.5" transform="${rotT}"/>`);
      p.push(`<g transform="${rotT}"><text x="${CX}" y="147" text-anchor="middle" dominant-baseline="middle" fill="${noteTextColor(minPK)}" font-family="Nunito,sans-serif" font-size="12" font-weight="800">${REL_MIN[i]}</text></g>`);
      p.push(`<circle cx="${dp.x}" cy="${dp.y}" r="18" fill="${COL[dimPK]}" stroke="white" stroke-width="1.5"/>`);
      p.push(`<g transform="${rotT}"><text x="${CX}" y="102" text-anchor="middle" dominant-baseline="middle" fill="${noteTextColor(dimPK)}" font-family="Nunito,sans-serif" font-size="11" font-weight="800">${DIM[i]}</text></g>`);
    }

    FIXED_MODE_SEGS.forEach(seg => {
      p.push(`<path d="${seg.d}" fill="${seg.fill}"/>`);
      p.push(`<text x="${seg.tx}" y="${seg.ty}" text-anchor="middle" dominant-baseline="middle" transform="${seg.rotTransform}" fill="${seg.textFill}" font-family="Nunito,sans-serif" font-size="9.5" font-weight="700" letter-spacing="0.4">${seg.mode.toUpperCase()}</text>`);
    });

    // Active mode ring + diatonic wedge (Ionian, slot 0)
    p.push(`<path d="${arcPath(R.modeIn + 1, R.modeOut - 1, -15, 15)}" fill="none" stroke="#C9A227" stroke-width="3" stroke-linejoin="round"/>`);
    const tonicGlow = arcPath(R.majIn, R.majOut, -15, 15);
    p.push(`<g id="wedge-layer"><path d="${NON_DIATONIC_SCRIM_D}" fill="#FFFFFF" fill-opacity="0.42" fill-rule="evenodd"/><path d="${WEDGE_FRAME_D}" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linejoin="round"/><path d="${tonicGlow}" fill="none" stroke="#C9A227" stroke-width="3" stroke-linejoin="round"/></g>`);

    // Numerals (C Ionian)
    const relAngle = i => { const a = i * 30 - HALF_OFFSET; return ((a + 180) % 360 + 360) % 360 - 180; };
    let nums = '';
    for (let i = 0; i < 12; i++) {
      const aL = i * 30 - HALF_OFFSET;
      const inInner = Math.abs(relAngle(i)) <= 45, inOuter = Math.abs(relAngle(i)) <= 15;
      const items = [
        { y: CY - R.majMid, fs: 13, text: numeralFor(SEM_MAP[COF[i]] || 0, 0, 'major'), dim: !inInner },
        { y: CY - R.minMid, fs: 11, text: numeralFor(SEM_MAP[REL_MIN_RT[i]] || 0, 0, 'minor'), dim: !inInner },
        { y: CY - R.dimMid, fs: 10, text: numeralFor(SEM_MAP[DIM_RT[i]] || 0, 0, 'dim'), dim: !inOuter },
      ];
      items.forEach(it => {
        nums += `<g transform="rotate(${aL} ${CX} ${CY})"><text x="${CX}" y="${it.y}" text-anchor="middle" dominant-baseline="middle" fill="#1A1A1A" opacity="${it.dim ? 0.45 : 1}" font-family="Nunito,sans-serif" font-size="${it.fs}" font-weight="800">${it.text}</text></g>`;
      });
    }
    p.push(`<g id="numeral-layer">${nums}</g>`);

    // Centre disc
    const cdc = COL[colKey('C')], ctc = noteTextColor(colKey('C'));
    const pillFill = modeBg(modeBrightness(0)), pillText = modeTxt(modeBrightness(0));
    p.push(`<g id="centre-btn"><circle cx="${CX}" cy="${CY}" r="${CENTRE_OUTER_R}" fill="white" stroke="#E0E0E0" stroke-width="1"/><circle cx="${CX}" cy="${CY}" r="${CENTRE_DISC_R}" fill="${cdc}"/><text x="${CX}" y="274" text-anchor="middle" dominant-baseline="middle" font-family="Nunito,sans-serif" font-size="9" font-weight="800" letter-spacing="1.6" fill="${ctc}" fill-opacity="0.72">PRACTICE</text><text x="${CX}" y="298" text-anchor="middle" dominant-baseline="middle" font-family="Nunito,sans-serif" font-size="32" font-weight="800" fill="${ctc}">C</text><rect x="${CX - 45}" y="324" width="90" height="22" rx="11" fill="${pillFill}" stroke="rgba(255,255,255,0.6)" stroke-width="1"/><text x="${CX}" y="336" text-anchor="middle" dominant-baseline="middle" font-family="Nunito,sans-serif" font-size="11" font-weight="700" fill="${pillText}" letter-spacing="0.6">IONIAN</text></g>`);

    svg.innerHTML = p.join('');
  }

  // ── Intro spin (matches the app) ─────────────────────────────────────
  function animateRotate(el, from, to, ms) {
    el.setAttribute('transform', `rotate(${from} ${CX} ${CY})`);
    const start = performance.now(), ease = t => 1 - Math.pow(1 - t, 3);
    function frame(now) {
      const t = Math.min(1, (now - start) / ms);
      el.setAttribute('transform', `rotate(${from + (to - from) * ease(t)} ${CX} ${CY})`);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function introSpin(svg) {
    const wedge = svg.querySelector('#wedge-layer'), num = svg.querySelector('#numeral-layer');
    if (!wedge || !num) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    animateRotate(wedge, -65, 0, 1100);
    animateRotate(num, -50, 0, 900);
  }

  window.TomWheel = {
    start(svg) { if (!svg) return; render(svg); introSpin(svg); },
  };
})();
