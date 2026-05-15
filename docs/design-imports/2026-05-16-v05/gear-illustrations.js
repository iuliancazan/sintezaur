/* ============================================================
   gear-illustrations.js
   ============================================================
   Hand-crafted SVG illustrations per gear model. Each is keyed
   off a string id like "juno-60" / "prophet-6" / "tr-808".
   These look intentional and editorial — they're meant as
   stand-ins until real photos arrive.
   ============================================================ */
(function (root) {
  // common helpers ---------------------------------------------------------
  const KEYS = (count, x, y, w, h) => {
    // simple piano-key strip
    const kw = w / count;
    const whites = Array.from({ length: count }, (_, i) =>
      `<rect x="${x + i * kw}" y="${y}" width="${kw - 0.6}" height="${h}" fill="var(--gear-key)" stroke="var(--gear-line)" stroke-width="0.4"/>`
    ).join('');
    const blackPattern = [0, 1, 3, 4, 5]; // 2nd of each octave skipped
    const blacks = Array.from({ length: count - 1 }, (_, i) => {
      const mod = i % 7;
      if (mod === 2 || mod === 6) return '';
      return `<rect x="${x + (i + 1) * kw - kw * 0.3}" y="${y}" width="${kw * 0.6}" height="${h * 0.62}" fill="var(--gear-black)"/>`;
    }).join('');
    return whites + blacks;
  };

  const KNOBS_ROW = (xs, y, color = 'var(--gear-knob)') => xs.map(x =>
    `<g><circle cx="${x}" cy="${y}" r="2.8" fill="${color}" stroke="var(--gear-line)" stroke-width="0.4"/><line x1="${x}" y1="${y - 2.8}" x2="${x}" y2="${y - 1.2}" stroke="var(--gear-line)" stroke-width="0.6"/></g>`
  ).join('');

  const SLIDER_ROW = (xs, y, color = 'var(--gear-slider)') => xs.map(x =>
    `<g><line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}" stroke="var(--gear-line)" stroke-width="0.4"/><rect x="${x - 2.4}" y="${y - 1.4}" width="4.8" height="2.8" fill="${color}" stroke="var(--gear-line)" stroke-width="0.3"/></g>`
  ).join('');

  const wrap = (vb, inner, opts = {}) => `
    <svg class="gear-svg" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
         style="--gear-body:${opts.body || 'var(--bg-card-2)'};--gear-face:${opts.face || 'var(--bg-card)'};--gear-line:${opts.line || 'var(--line-strong)'};--gear-knob:${opts.knob || 'var(--fg-muted)'};--gear-slider:${opts.slider || 'var(--accent)'};--gear-key:${opts.key || 'var(--fg)'};--gear-black:${opts.black || 'var(--bg)'};--gear-screen:${opts.screen || 'var(--accent)'};--gear-wood:${opts.wood || 'var(--line-strong)'}">
      ${inner}
    </svg>`;

  // gear definitions -------------------------------------------------------
  const G = {};

  // -- Roland Juno-60 — wood sides, cream face, sliders + a few knobs, full keyboard
  G['juno-60'] = () => wrap('0 0 200 100', `
    <rect x="0" y="20" width="200" height="62" fill="var(--gear-wood)"/>
    <rect x="12" y="22" width="176" height="58" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="18" y="32" font-family="JetBrains Mono" font-size="5" fill="var(--gear-line)" letter-spacing="0.3">ROLAND JUNO-60</text>
    ${SLIDER_ROW([24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176], 56)}
    <rect x="14" y="68" width="170" height="6" fill="none" stroke="var(--gear-line)" stroke-width="0.3" stroke-dasharray="2 1.5"/>
    ${KEYS(28, 0, 82, 200, 18)}
  `, { face: '#f0e6cf', wood: '#3a2516', body: '#3a2516', key: '#f5f0e3', black: '#1a1410', slider: '#d4a017' });

  // -- Sequential Prophet-6 (desktop) — black, dense knob grid
  G['prophet-6'] = () => wrap('0 0 200 100', `
    <rect x="0" y="10" width="200" height="80" fill="var(--gear-body)"/>
    <rect x="4" y="14" width="192" height="72" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="10" y="24" font-family="JetBrains Mono" font-size="5" fill="var(--gear-line)" letter-spacing="0.3">SEQUENTIAL PROPHET-6 DESKTOP</text>
    <rect x="10" y="30" width="20" height="10" fill="var(--gear-screen)" opacity="0.85"/>
    ${KNOBS_ROW([42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 36)}
    ${KNOBS_ROW([12,22,32,42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 52)}
    ${KNOBS_ROW([12,22,32,42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 68)}
    <rect x="10" y="78" width="180" height="4" fill="none" stroke="var(--gear-line)" stroke-width="0.3"/>
  `, { face: '#1a1611', body: '#0d0a07', knob: '#d4a017', line: '#3d3522' });

  // -- Moog Subsequent 37 — chunky, sliders + knobs, mini-key
  G['subsequent-37'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="64" fill="var(--gear-body)"/>
    <rect x="6" y="18" width="188" height="58" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="28" font-family="JetBrains Mono" font-size="5" fill="#aaa" letter-spacing="0.3">MOOG SUBSEQUENT 37</text>
    <rect x="12" y="32" width="24" height="9" fill="var(--gear-screen)" opacity="0.8"/>
    ${KNOBS_ROW([44,54,64,74,84,94,104,114,124,134,144,154,164,174,184], 38)}
    ${KNOBS_ROW([14,24,34,44,54,64,74,84,94,104,114,124,134,144,154,164,174,184], 54)}
    ${SLIDER_ROW([22,34,46,58,70,82], 68, '#d4a017')}
    ${KEYS(20, 0, 78, 200, 16)}
  `, { face: '#1a1410', body: '#0a0806', knob: '#c9a26b', screen: '#d4a017', key: '#e8e0d0', black: '#080604' });

  // -- Behringer Pro-1 — small mono, narrow
  G['pro-1'] = () => wrap('0 0 200 100', `
    <rect x="0" y="22" width="200" height="56" fill="var(--gear-body)"/>
    <rect x="8" y="26" width="184" height="50" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="14" y="34" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">BEHRINGER PRO-1</text>
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 44)}
    ${SLIDER_ROW([20,32,44,56,68,80,92,104,116,128,140,152,164,176], 60)}
    ${KEYS(20, 0, 78, 200, 18)}
  `, { face: '#cfc6b0', body: '#2a241a', knob: '#1a1611', slider: '#d4a017', key: '#f0e8d4', black: '#1a1410' });

  // -- Korg Volca FM — tiny rectangle, screen, step keys
  G['volca-fm'] = () => wrap('0 0 200 100', `
    <rect x="20" y="20" width="160" height="60" fill="var(--gear-body)" rx="2"/>
    <rect x="24" y="24" width="152" height="52" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="30" y="32" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">KORG VOLCA FM</text>
    <rect x="30" y="38" width="40" height="10" fill="var(--gear-screen)"/>
    ${KNOBS_ROW([80,92,104,116,128,140,152,164], 43)}
    ${KNOBS_ROW([30,42,54,66,78,90,102,114,126,138,150,162], 56)}
    <g>${[30,42,54,66,78,90,102,114,126,138,150,162].map(x => `<rect x="${x-3}" y="66" width="6" height="4" fill="var(--gear-knob)" rx="0.5"/>`).join('')}</g>
  `, { face: '#3a3528', body: '#1a1611', screen: '#d4a017', knob: '#c0b890' });

  // -- Roland TR-808 — iconic colored pads, red/orange/yellow/white
  G['tr-808'] = () => wrap('0 0 200 100', `
    <rect x="0" y="10" width="200" height="80" fill="var(--gear-body)"/>
    <rect x="6" y="14" width="188" height="72" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="24" font-family="JetBrains Mono" font-size="5" fill="var(--gear-line)" letter-spacing="0.3">ROLAND TR-808</text>
    <rect x="10" y="28" width="60" height="14" fill="#1a1410"/>
    <text x="14" y="38" font-family="JetBrains Mono" font-size="6" fill="#e84747">88</text>
    ${KNOBS_ROW([76,86,96,106,116,126,136,146,156,166,176,186], 35)}
    ${KNOBS_ROW([12,22,32,42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 52)}
    <g>
      ${[14,26,38,50].map(x => `<rect x="${x}" y="66" width="9" height="6" fill="#e84747" rx="0.5"/>`).join('')}
      ${[64,76,88,100].map(x => `<rect x="${x}" y="66" width="9" height="6" fill="#f0830d" rx="0.5"/>`).join('')}
      ${[114,126,138,150].map(x => `<rect x="${x}" y="66" width="9" height="6" fill="#e8c517" rx="0.5"/>`).join('')}
      ${[164,176].map(x => `<rect x="${x}" y="66" width="9" height="6" fill="#f5f0e3" rx="0.5"/>`).join('')}
      ${[14,26,38,50,64,76,88,100,114,126,138,150,164,176].map(x => `<rect x="${x}" y="76" width="9" height="4" fill="#f5f0e3" rx="0.5"/>`).join('')}
    </g>
  `, { face: '#cfc6b0', body: '#3a2a1a', knob: '#1a1410' });

  // -- Korg MS-20 — semi-modular, patch jacks
  G['ms-20'] = () => wrap('0 0 200 100', `
    <rect x="0" y="10" width="200" height="68" fill="var(--gear-body)"/>
    <rect x="6" y="14" width="188" height="62" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="24" font-family="JetBrains Mono" font-size="5" fill="var(--gear-line)" letter-spacing="0.3">KORG MS-20</text>
    ${KNOBS_ROW([16,28,40,52,64,76,88,100], 38)}
    ${KNOBS_ROW([16,28,40,52,64,76,88,100], 56)}
    <g fill="var(--gear-line)" opacity="0.4">
      ${[112,124,136,148,160,172,184].map(x => `<circle cx="${x}" cy="38" r="2"/>`).join('')}
      ${[112,124,136,148,160,172,184].map(x => `<circle cx="${x}" cy="48" r="2"/>`).join('')}
      ${[112,124,136,148,160,172,184].map(x => `<circle cx="${x}" cy="58" r="2"/>`).join('')}
      ${[112,124,136,148,160,172,184].map(x => `<circle cx="${x}" cy="68" r="2"/>`).join('')}
    </g>
    ${KEYS(20, 0, 78, 200, 18)}
  `, { face: '#1a1611', body: '#0a0806', knob: '#cfc6b0', line: '#3a3528', key: '#e8e0d0', black: '#080604' });

  // -- Teenage Engineering OP-1 Field — small, white, orange tape
  G['op-1-field'] = () => wrap('0 0 200 100', `
    <rect x="10" y="22" width="180" height="58" fill="var(--gear-body)" rx="3"/>
    <rect x="14" y="26" width="172" height="50" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <rect x="18" y="30" width="64" height="22" fill="#1a1410"/>
    <line x1="22" y1="36" x2="78" y2="36" stroke="#d4a017" stroke-width="0.8"/>
    <line x1="22" y1="44" x2="58" y2="44" stroke="#d4a017" stroke-width="0.6" opacity="0.6"/>
    <g>
      <circle cx="100" cy="38" r="4" fill="#f0830d"/><circle cx="116" cy="38" r="4" fill="#f0830d"/>
      <circle cx="132" cy="38" r="4" fill="#f0830d"/><circle cx="148" cy="38" r="4" fill="#f0830d"/>
    </g>
    <g fill="var(--gear-line)">${[18,30,42,54,66,78,90,102,114,126,138,150,162,174].map(x => `<rect x="${x}" y="58" width="9" height="14" fill="#f5f0e3" stroke="var(--gear-line)" stroke-width="0.3"/>`).join('')}</g>
  `, { face: '#f0ece0', body: '#d4cdb4' });

  // -- Yamaha DX7 — black, gray buttons, slim
  G['dx7'] = () => wrap('0 0 200 100', `
    <rect x="0" y="16" width="200" height="62" fill="var(--gear-body)"/>
    <rect x="6" y="20" width="188" height="56" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="29" font-family="JetBrains Mono" font-size="5" fill="#888" letter-spacing="0.3">YAMAHA DX7</text>
    <rect x="12" y="34" width="56" height="10" fill="var(--gear-screen)" opacity="0.7"/>
    <g>${Array.from({length: 16}, (_, i) => `<rect x="${12 + (i%8)*16}" y="${50 + Math.floor(i/8)*12}" width="13" height="8" fill="#444" stroke="var(--gear-line)" stroke-width="0.3"/>`).join('')}</g>
    <g>${Array.from({length: 16}, (_, i) => `<rect x="${152 + (i%4)*10}" y="${30 + Math.floor(i/4)*10}" width="8" height="7" fill="#3a3a3a" stroke="var(--gear-line)" stroke-width="0.3"/>`).join('')}</g>
    ${KEYS(25, 0, 78, 200, 18)}
  `, { face: '#1a1410', body: '#0a0806', screen: '#d4a017', key: '#f5f0e3', black: '#080604' });

  // -- Elektron Digitakt II — grid of pads + screen
  G['digitakt-ii'] = () => wrap('0 0 200 100', `
    <rect x="14" y="14" width="172" height="72" fill="var(--gear-body)"/>
    <rect x="18" y="18" width="164" height="64" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="24" y="28" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">ELEKTRON DIGITAKT II</text>
    <rect x="24" y="32" width="50" height="22" fill="var(--gear-screen)" opacity="0.7"/>
    ${KNOBS_ROW([84,96,108,120,132,144,156,168], 38)}
    ${KNOBS_ROW([84,96,108,120,132,144,156,168], 52)}
    <g>${Array.from({length: 16}, (_, i) => `<rect x="${24 + (i%8)*20}" y="${60 + Math.floor(i/8)*10}" width="17" height="8" fill="var(--gear-knob)" stroke="var(--gear-line)" stroke-width="0.3" rx="1"/>`).join('')}</g>
  `, { face: '#0e0c08', body: '#050403', knob: '#3a3528', screen: '#d4a017' });

  // -- Korg Minilogue XD — silver/wood mini synth
  G['minilogue-xd'] = () => wrap('0 0 200 100', `
    <rect x="0" y="20" width="200" height="50" fill="var(--gear-wood)"/>
    <rect x="6" y="22" width="188" height="46" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="30" font-family="JetBrains Mono" font-size="4.5" fill="#3a3528" letter-spacing="0.3">KORG MINILOGUE XD</text>
    <rect x="12" y="34" width="36" height="9" fill="#0a0806"/>
    ${KNOBS_ROW([56,68,80,92,104,116,128,140,152,164,176], 38, '#3a3528')}
    ${KNOBS_ROW([12,24,36,48,60,72,84,96,108,120,132,144,156,168,180], 54, '#3a3528')}
    ${KEYS(22, 0, 70, 200, 16)}
  `, { face: '#dcd5be', body: '#3a2516', wood: '#3a2516', key: '#f5f0e3', black: '#0a0806' });

  // -- Arturia MicroFreak — touch keyboard, navy face
  G['microfreak'] = () => wrap('0 0 200 100', `
    <rect x="0" y="20" width="200" height="48" fill="var(--gear-wood)"/>
    <rect x="6" y="22" width="188" height="44" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="30" font-family="JetBrains Mono" font-size="4.5" fill="#f0e6cf" letter-spacing="0.3">ARTURIA MICROFREAK</text>
    <rect x="12" y="34" width="36" height="11" fill="#d4a017" opacity="0.85"/>
    ${KNOBS_ROW([56,68,80,92,104,116,128,140,152,164,176], 38)}
    ${KNOBS_ROW([12,24,36,48,60,72,84,96,108,120,132,144,156,168,180], 52)}
    <g>${Array.from({length: 25}, (_, i) => `<rect x="${4 + i*8}" y="70" width="7" height="14" fill="#d4cdb4" stroke="var(--gear-line)" stroke-width="0.3"/>`).join('')}</g>
  `, { face: '#1a2a3a', body: '#3a2516', wood: '#3a2516', knob: '#f0e6cf' });

  // -- Behringer Model D — Minimoog clone, slim
  G['model-d'] = () => wrap('0 0 200 100', `
    <rect x="0" y="22" width="200" height="56" fill="var(--gear-wood)"/>
    <rect x="6" y="26" width="188" height="48" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="34" font-family="JetBrains Mono" font-size="4.5" fill="#3a3528" letter-spacing="0.3">BEHRINGER MODEL D</text>
    ${KNOBS_ROW([18,30,42,54,66,78,90,102,114,126,138,150,162,174,186], 44)}
    ${KNOBS_ROW([18,30,42,54,66,78,90,102,114,126,138,150,162,174,186], 60)}
  `, { face: '#cfc6b0', body: '#3a2516', wood: '#3a2516', knob: '#1a1410' });

  // -- Make Noise 0-Coast — eurorack-style vertical panel
  G['0-coast'] = () => wrap('0 0 200 100', `
    <rect x="20" y="6" width="160" height="88" fill="var(--gear-body)"/>
    <rect x="24" y="10" width="152" height="80" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="30" y="20" font-family="JetBrains Mono" font-size="5" fill="var(--gear-line)" letter-spacing="0.3">MAKE NOISE 0-COAST</text>
    ${KNOBS_ROW([34,52,70,88,106,124,142,160], 32)}
    ${KNOBS_ROW([34,52,70,88,106,124,142,160], 48)}
    <g fill="none" stroke="var(--gear-line)" stroke-width="0.5">
      ${[34,52,70,88,106,124,142,160].map(x => `<circle cx="${x}" cy="64" r="2.6"/>`).join('')}
      ${[34,52,70,88,106,124,142,160].map(x => `<circle cx="${x}" cy="78" r="2.6"/>`).join('')}
    </g>
  `, { face: '#f0ece0', body: '#d4cdb4', knob: '#3a3528' });

  // -- Sequential Take 5 — black, similar to prophet
  G['take-5'] = () => wrap('0 0 200 100', `
    <rect x="0" y="20" width="200" height="50" fill="var(--gear-body)"/>
    <rect x="6" y="22" width="188" height="46" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="30" font-family="JetBrains Mono" font-size="4.5" fill="#888" letter-spacing="0.3">SEQUENTIAL TAKE 5</text>
    <rect x="12" y="34" width="30" height="9" fill="var(--gear-screen)" opacity="0.85"/>
    ${KNOBS_ROW([50,62,74,86,98,110,122,134,146,158,170,182], 38)}
    ${KNOBS_ROW([12,24,36,48,60,72,84,96,108,120,132,144,156,168,180], 54)}
    ${KEYS(20, 0, 70, 200, 16)}
  `, { face: '#1a1410', body: '#0a0806', knob: '#d4a017', screen: '#d4a017', key: '#e8e0d0', black: '#080604' });

  // -- Moog Matriarch — large with patch bay, semi-modular
  G['matriarch'] = () => wrap('0 0 200 100', `
    <rect x="0" y="16" width="200" height="60" fill="var(--gear-wood)"/>
    <rect x="6" y="18" width="188" height="56" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="26" font-family="JetBrains Mono" font-size="4.5" fill="#3a3528" letter-spacing="0.3">MOOG MATRIARCH</text>
    ${KNOBS_ROW([14,26,38,50,62,74,86,98,110,122,134,146,158,170,182], 34)}
    ${KNOBS_ROW([14,26,38,50,62,74,86,98,110,122,134,146,158,170,182], 50)}
    <g fill="var(--gear-line)" opacity="0.5">${Array.from({length:24}, (_,i) => `<circle cx="${14 + i*7.5}" cy="64" r="1.8"/>`).join('')}</g>
    ${KEYS(28, 0, 76, 200, 20)}
  `, { face: '#cfc6b0', body: '#3a2516', wood: '#3a2516', knob: '#1a1410', key: '#f5f0e3', black: '#1a1410' });

  // -- Elektron Octatrack MKII — grid of pads + larger screen
  G['octatrack-mk2'] = () => wrap('0 0 200 100', `
    <rect x="10" y="14" width="180" height="72" fill="var(--gear-body)"/>
    <rect x="14" y="18" width="172" height="64" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="20" y="26" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">ELEKTRON OCTATRACK MKII</text>
    <rect x="20" y="30" width="60" height="20" fill="var(--gear-screen)" opacity="0.7"/>
    ${KNOBS_ROW([90,102,114,126,138,150,162,174], 36)}
    ${KNOBS_ROW([90,102,114,126,138,150,162,174], 48)}
    <g>${Array.from({length: 16}, (_, i) => `<rect x="${20 + (i%8)*20}" y="${56 + Math.floor(i/8)*12}" width="17" height="9" fill="var(--gear-knob)" stroke="var(--gear-line)" stroke-width="0.3" rx="1"/>`).join('')}</g>
  `, { face: '#0a0806', body: '#050403', knob: '#3a3528', screen: '#d4a017' });

  // -- Portrait — abstract studio/person silhouette for editorial photos
  G['portrait-studio'] = () => wrap('0 0 200 120', `
    <g fill="var(--gear-line)" opacity="0.18">
      <line x1="0" y1="100" x2="200" y2="100" stroke="var(--gear-line)" stroke-width="0.4"/>
      <rect x="0" y="100" width="200" height="20" fill="var(--gear-line)" opacity="0.06"/>
    </g>
    <g opacity="0.7">
      <circle cx="100" cy="50" r="14" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.5"/>
      <path d="M70 100c0-18 13-32 30-32s30 14 30 32" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.5"/>
    </g>
    <g opacity="0.55">
      <rect x="20" y="86" width="50" height="14" fill="var(--gear-knob)" stroke="var(--gear-line)" stroke-width="0.4"/>
      <rect x="130" y="80" width="50" height="20" fill="var(--gear-knob)" stroke="var(--gear-line)" stroke-width="0.4"/>
      ${KNOBS_ROW([26,36,46,56,66], 93)}
      ${KNOBS_ROW([136,146,156,166,176], 90)}
    </g>
  `, { face: '#2a241a', knob: '#1a1611' });

  // -- Live performance — cityscape + synth
  G['portrait-live'] = () => wrap('0 0 200 120', `
    <g opacity="0.3">
      ${[10,30,50,70,90,110,130,150,170].map((x, i) => `<rect x="${x}" y="${40 + (i%3)*10}" width="14" height="${80 - (i%3)*10}" fill="var(--gear-line)" opacity="0.5"/>`).join('')}
    </g>
    <g fill="var(--accent)" opacity="0.85">
      <circle cx="50" cy="30" r="2"/><circle cx="120" cy="20" r="2"/><circle cx="160" cy="35" r="2"/>
    </g>
    <rect x="40" y="92" width="120" height="20" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.5"/>
    ${KNOBS_ROW([54,68,82,96,110,124,138,152], 102)}
  `, { face: '#1a1611' });

  // ---- Additional models for Tezaur catalog ----

  // -- Roland TB-303 — bassline, small box with cv jacks
  G['tb-303'] = () => wrap('0 0 200 100', `
    <rect x="20" y="20" width="160" height="60" fill="var(--gear-body)" rx="2"/>
    <rect x="24" y="24" width="152" height="52" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="30" y="32" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">ROLAND TB-303</text>
    <rect x="30" y="38" width="34" height="9" fill="#1a1410"/>
    ${KNOBS_ROW([76, 92, 108, 124, 140, 156, 170], 42)}
    ${SLIDER_ROW([76, 92, 108, 124, 140, 156, 170], 60)}
    <g fill="var(--gear-line)" opacity="0.4">${[30,40,50,60].map(x => `<circle cx="${x}" cy="68" r="2"/>`).join('')}</g>
  `, { face: '#d4cfb8', body: '#3a3022', knob: '#1a1410', slider: '#d4a017' });

  // -- Roland TR-909 — drum machine sibling to 808
  G['tr-909'] = () => wrap('0 0 200 100', `
    <rect x="0" y="10" width="200" height="80" fill="var(--gear-body)"/>
    <rect x="6" y="14" width="188" height="72" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="24" font-family="JetBrains Mono" font-size="5" fill="var(--gear-line)" letter-spacing="0.3">ROLAND TR-909</text>
    <rect x="10" y="28" width="56" height="14" fill="#1a1410"/>
    <text x="14" y="38" font-family="JetBrains Mono" font-size="6" fill="#5a8de8">88</text>
    ${KNOBS_ROW([76,86,96,106,116,126,136,146,156,166,176,186], 35)}
    ${SLIDER_ROW([14,24,34,44,54,64,74,84,94,104,114], 56)}
    <g>
      ${[14,26,38,50].map(x => `<rect x="${x}" y="68" width="9" height="6" fill="#5a8de8" rx="0.5"/>`).join('')}
      ${[64,76,88,100].map(x => `<rect x="${x}" y="68" width="9" height="6" fill="#f0830d" rx="0.5"/>`).join('')}
      ${[114,126,138,150].map(x => `<rect x="${x}" y="68" width="9" height="6" fill="#e8c517" rx="0.5"/>`).join('')}
      ${[164,176].map(x => `<rect x="${x}" y="68" width="9" height="6" fill="#f5f0e3" rx="0.5"/>`).join('')}
      ${[14,26,38,50,64,76,88,100,114,126,138,150,164,176].map(x => `<rect x="${x}" y="78" width="9" height="4" fill="#f5f0e3" rx="0.5"/>`).join('')}
    </g>
  `, { face: '#3a3530', body: '#1a1611', knob: '#cfc6b0' });

  // -- Roland Jupiter-8 — flagship, dense slider field, large keys
  G['jupiter-8'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="64" fill="var(--gear-wood)"/>
    <rect x="8" y="16" width="184" height="60" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="14" y="24" font-family="JetBrains Mono" font-size="4.5" fill="#888" letter-spacing="0.3">ROLAND JUPITER-8</text>
    ${KNOBS_ROW([16,26,36,46,56,66,76,86,96,106,116,126,136,146,156,166,176,186], 32)}
    ${SLIDER_ROW([16,26,36,46,56,66,76,86,96,106,116,126,136,146,156,166,176,186], 48, '#d4a017')}
    ${SLIDER_ROW([16,26,36,46,56,66,76,86,96,106,116,126,136,146,156,166,176,186], 64, '#d4a017')}
    ${KEYS(28, 0, 78, 200, 18)}
  `, { face: '#0e0c08', body: '#1a1208', wood: '#1a1208', knob: '#d4cfb8', key: '#f5f0e3', black: '#0a0806' });

  // -- Roland SH-101 — slim mono, classic strap handle
  G['sh-101'] = () => wrap('0 0 200 100', `
    <rect x="0" y="32" width="200" height="44" fill="var(--gear-body)"/>
    <rect x="6" y="34" width="188" height="40" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="42" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">ROLAND SH-101</text>
    ${SLIDER_ROW([18,28,38,48,58,68,78,88,98,108,118,128,138,148,158,168,180], 56, '#d4a017')}
    ${KEYS(20, 0, 76, 200, 16)}
  `, { face: '#cfc6b0', body: '#2a241a', key: '#f5f0e3', black: '#0a0806' });

  // -- Sequential Prophet-5 Rev 4 — wood sides + many knobs + keyboard
  G['prophet-5'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="64" fill="var(--gear-wood)"/>
    <rect x="8" y="16" width="184" height="60" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="14" y="24" font-family="JetBrains Mono" font-size="4.5" fill="#888" letter-spacing="0.3">SEQUENTIAL PROPHET-5</text>
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 32)}
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 48)}
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 62)}
    ${KEYS(28, 0, 78, 200, 18)}
  `, { face: '#0e0c08', body: '#3a2516', wood: '#3a2516', knob: '#d4a017', key: '#f5f0e3', black: '#0a0806' });

  // -- Oberheim OB-X8 — modern flagship, blue accent
  G['ob-x8'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="64" fill="var(--gear-wood)"/>
    <rect x="8" y="16" width="184" height="60" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="14" y="24" font-family="JetBrains Mono" font-size="4.5" fill="#888" letter-spacing="0.3">OBERHEIM OB-X8</text>
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 32, '#5a8de8')}
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 48, '#5a8de8')}
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 62, '#5a8de8')}
    ${KEYS(28, 0, 78, 200, 18)}
  `, { face: '#0e0c08', body: '#3a2516', wood: '#3a2516', key: '#f5f0e3', black: '#0a0806' });

  // -- Arturia PolyBrute — black with Morphée touchpad
  G['polybrute'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="64" fill="var(--gear-body)"/>
    <rect x="6" y="16" width="188" height="60" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="24" font-family="JetBrains Mono" font-size="4.5" fill="var(--gear-line)" letter-spacing="0.3">ARTURIA POLYBRUTE</text>
    ${KNOBS_ROW([14,26,38,50,62,74,86,98,110,122,134,146,158,170,182], 32)}
    ${KNOBS_ROW([14,26,38,50,62,74,86,98,110,122,134,146,158,170,182], 48)}
    <rect x="14" y="58" width="22" height="14" fill="#5a8de8" opacity="0.5"/>
    ${KEYS(24, 36, 78, 164, 18)}
  `, { face: '#1a1611', body: '#0a0806', knob: '#cfc6b0', key: '#e8e0d0', black: '#080604' });

  // -- Yamaha CS-80 — vintage flagship with ribbon controller
  G['cs-80'] = () => wrap('0 0 200 100', `
    <rect x="0" y="10" width="200" height="60" fill="var(--gear-wood)"/>
    <rect x="6" y="12" width="188" height="56" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <text x="12" y="22" font-family="JetBrains Mono" font-size="4.5" fill="#888" letter-spacing="0.3">YAMAHA CS-80</text>
    ${SLIDER_ROW([16,26,36,46,56,66,76,86,96,106,116,126,136,146,156,166,176,186], 36, '#d4a017')}
    ${SLIDER_ROW([16,26,36,46,56,66,76,86,96,106,116,126,136,146,156,166,176,186], 56, '#d4a017')}
    ${KEYS(36, 0, 70, 200, 22)}
  `, { face: '#1a1611', body: '#3a2516', wood: '#3a2516', key: '#f5f0e3', black: '#0a0806' });

  // -- Generic fallbacks for unknown gear ----

  G['generic-mono'] = () => wrap('0 0 200 100', `
    <rect x="0" y="28" width="200" height="50" fill="var(--gear-body)"/>
    <rect x="6" y="30" width="188" height="46" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    ${KNOBS_ROW([16,28,40,52,64,76,88,100,112,124,136,148,160,172,184], 44)}
    ${SLIDER_ROW([22,38,54,70,86,102,118,134,150,166,182], 60, '#d4a017')}
    ${KEYS(20, 0, 78, 200, 16)}
  `, { face: '#1a1611', body: '#0a0806' });

  G['generic-poly'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="64" fill="var(--gear-body)"/>
    <rect x="6" y="16" width="188" height="60" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <rect x="12" y="22" width="22" height="10" fill="var(--gear-screen)" opacity="0.85"/>
    ${KNOBS_ROW([42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 28)}
    ${KNOBS_ROW([12,22,32,42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 46)}
    ${KNOBS_ROW([12,22,32,42,52,62,72,82,92,102,112,122,132,142,152,162,172,182], 62)}
    ${KEYS(28, 0, 78, 200, 18)}
  `, { face: '#1a1611', body: '#0a0806' });

  G['generic-desktop'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="74" fill="var(--gear-body)"/>
    <rect x="6" y="18" width="188" height="66" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <rect x="12" y="24" width="40" height="12" fill="var(--gear-screen)" opacity="0.85"/>
    ${KNOBS_ROW([62,76,90,104,118,132,146,160,174,186], 30)}
    ${KNOBS_ROW([12,26,40,54,68,82,96,110,124,138,152,166,180], 50)}
    ${KNOBS_ROW([12,26,40,54,68,82,96,110,124,138,152,166,180], 66)}
    ${KNOBS_ROW([12,26,40,54,68,82,96,110,124,138,152,166,180], 78)}
  `, { face: '#1a1611', body: '#0a0806' });

  G['generic-drum'] = () => wrap('0 0 200 100', `
    <rect x="0" y="14" width="200" height="74" fill="var(--gear-body)"/>
    <rect x="6" y="18" width="188" height="66" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <rect x="12" y="24" width="40" height="14" fill="var(--gear-screen)" opacity="0.85"/>
    ${KNOBS_ROW([62,76,90,104,118,132,146,160,174,186], 31)}
    <g>${Array.from({length: 16}, (_, i) => `<rect x="${14 + (i%8)*22}" y="${48 + Math.floor(i/8)*15}" width="18" height="10" fill="var(--gear-knob)" rx="1"/>`).join('')}</g>
  `, { face: '#0e0c08', body: '#050403', knob: '#3a3528' });

  G['generic-groovebox'] = () => wrap('0 0 200 100', `
    <rect x="14" y="14" width="172" height="74" fill="var(--gear-body)"/>
    <rect x="18" y="18" width="164" height="66" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>
    <rect x="22" y="22" width="50" height="20" fill="var(--gear-screen)" opacity="0.7"/>
    ${KNOBS_ROW([84,96,108,120,132,144,156,168], 32)}
    ${KNOBS_ROW([84,96,108,120,132,144,156,168], 48)}
    <g>${Array.from({length: 16}, (_, i) => `<rect x="${22 + (i%8)*20}" y="${56 + Math.floor(i/8)*12}" width="17" height="9" fill="var(--gear-knob)" rx="1"/>`).join('')}</g>
  `, { face: '#0a0806', body: '#050403', knob: '#3a3528' });

  G['generic-eurorack'] = () => wrap('0 0 200 100', `
    <rect x="6" y="14" width="188" height="74" fill="var(--gear-body)"/>
    <g>
      ${Array.from({length: 5}, (_, c) => {
        const x = 10 + c * 38;
        return `<rect x="${x}" y="18" width="34" height="66" fill="var(--gear-face)" stroke="var(--gear-line)" stroke-width="0.4"/>` +
          KNOBS_ROW([x+8, x+18, x+28], 30) +
          KNOBS_ROW([x+8, x+18, x+28], 46) +
          [x+8, x+18, x+28].map(j => `<circle cx="${j}" cy="62" r="2" fill="none" stroke="var(--gear-line)" stroke-width="0.5"/>`).join('') +
          [x+8, x+18, x+28].map(j => `<circle cx="${j}" cy="76" r="2" fill="none" stroke="var(--gear-line)" stroke-width="0.5"/>`).join('');
      }).join('')}
    </g>
  `, { face: '#cfc6b0', body: '#3a2516', knob: '#1a1410' });

  // exposed lookup
  root.GearSvg = G;
})(window);
