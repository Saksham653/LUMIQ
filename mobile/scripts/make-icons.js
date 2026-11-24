// Draws LUMIQ's app icon, the Android adaptive-icon layers, the splash image
// and the favicon from the prism logo (the same art as ../public/lumiq-icon.svg),
// and a preview sheet showing them in launcher masks, at small sizes, themed,
// and on light and dark splash screens.
//
//   npm run icons            (from mobile/; preview goes to the temp folder)
//   node scripts/make-icons.js <preview folder>
//
// It renders the SVG with the Playwright browser the web app already has
// for its tests (run `npm install` in the repo root first). If the logo
// changes, update the shapes below and run it again.
const fs = require('fs');
const os = require('os');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const out = path.join(mobileRoot, 'assets', 'images');
const previewDir = process.argv[2] ?? os.tmpdir();

let chromium;
try {
  ({ chromium } = require(path.join(repoRoot, 'node_modules', 'playwright-core')));
} catch {
  console.error('Needs the web app\'s Playwright: run `npm install` and `npx playwright install chromium` in the repo root.');
  process.exit(1);
}

const NAVY = '#050914';

// ---- The prism, in the logo's own 100x100 units (no background) ----------
const DEFS = `
  <linearGradient id="face" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#00D4FF" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#0055aa" stop-opacity="0.6"/>
  </linearGradient>
  <linearGradient id="side" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#7B4FE8" stop-opacity="0.8"/>
    <stop offset="100%" stop-color="#0a0f2c" stop-opacity="0.9"/>
  </linearGradient>`;

const RAYS = `
  <line x1="12" y1="75" x2="4" y2="62" stroke="#FFB627" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <line x1="12" y1="75" x2="3" y2="75" stroke="#00E5A0" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <line x1="12" y1="75" x2="4" y2="88" stroke="#7B4FE8" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;

// `underlay` paints the faces navy first, so the see-through gradients look
// the same on any background (the splash is light in light mode).
const prism = ({ underlay = false } = {}) => `
  ${underlay ? `<polygon points="50,8 88,75 12,75" fill="${NAVY}"/><polygon points="50,8 88,75 50,85" fill="${NAVY}"/>` : ''}
  <polygon points="50,8 88,75 12,75" fill="url(#face)" stroke="#00D4FF" stroke-width="1.5"/>
  <polygon points="50,8 88,75 50,85" fill="url(#side)" stroke="#7B4FE8" stroke-width="1"/>
  ${RAYS}
  <circle cx="50" cy="8" r="3" fill="#00D4FF" opacity="0.8"/>`;

// Android 13+ themed icon: one colour, shading by opacity only. The left half
// of the front face is solid, the side face lighter, the rays solid.
const MONO = `
  <polygon points="50,8 50,75 12,75" fill="#fff"/>
  <polygon points="50,8 88,75 50,85" fill="#fff" fill-opacity="0.55"/>
  <line x1="12" y1="75" x2="4" y2="62" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="12" y1="75" x2="3" y2="75" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="75" x2="4" y2="88" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <circle cx="50" cy="8" r="3" fill="#fff"/>`;

// ---- Outline of the drawn prism: corners with their strokes, the dot and
// the rounded ray ends, sampled as points -----------------------------------
const BLOBS = [
  [50, 8, 3], [88, 75, 1.6], [12, 75, 1.6], [50, 85, 0.9],
  [4, 62, 1.25], [3, 75, 1], [4, 88, 1],
];
const PTS = BLOBS.flatMap(([x, y, r]) =>
  Array.from({ length: 24 }, (_, i) => [x + r * Math.cos((i / 12) * Math.PI), y + r * Math.sin((i / 12) * Math.PI)]),
);
const BOX = {
  x0: Math.min(...PTS.map((p) => p[0])), x1: Math.max(...PTS.map((p) => p[0])),
  y0: Math.min(...PTS.map((p) => p[1])), y1: Math.max(...PTS.map((p) => p[1])),
};
// Centred on its outline box (that looks centred); sized by the box width.
const CENTER = { x: (BOX.x0 + BOX.x1) / 2, y: (BOX.y0 + BOX.y1) / 2 };
const REACH = Math.max(...PTS.map(([x, y]) => Math.hypot(x - CENTER.x, y - CENTER.y)));

// Places the prism centred on (cx, cy), `w` pixels wide.
const place = (inner, cx, cy, w) => {
  const s = w / (BOX.x1 - BOX.x0);
  return `<g transform="translate(${(cx - s * CENTER.x).toFixed(3)} ${(cy - s * CENTER.y).toFixed(3)}) scale(${s.toFixed(5)})">${inner}</g>`;
};

// ---- The icon scene. `k` is the share of the canvas that shows: 1 for the
// iOS icon; 72/108 for Android adaptive layers, whose outer third is hidden
// behind the launcher's mask. The same picture appears either way.
const ART_W = 0.6; // prism width, as a share of the visible square
const OPTICAL_LIFT = 0.01; // a triangle looks low when centred exactly
const ADAPTIVE_K = 72 / 108;

function scene({ size, k = 1, background = false, art = false, mono = false }) {
  const v = size * k; // visible square
  const o = (size - v) / 2; // its offset
  const at = (fx, fy) => [o + fx * v, o + fy * v];
  const [gx, gy] = at(0.5, 0.43);
  const [vx, vy] = at(0.68, 0.74);
  const [cx, cy] = at(0.5, 0.5 - OPTICAL_LIFT);
  const glow = `
    <radialGradient id="glowCyan" cx="${gx}" cy="${gy}" r="${0.52 * v}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00D4FF" stop-opacity="0.30"/>
      <stop offset="0.45" stop-color="#00D4FF" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#00D4FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowViolet" cx="${vx}" cy="${vy}" r="${0.42 * v}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7B4FE8" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#7B4FE8" stop-opacity="0"/>
    </radialGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">
    <defs>${DEFS}${glow}</defs>
    ${background ? `<rect width="${size}" height="${size}" fill="${NAVY}"/>
      <rect width="${size}" height="${size}" fill="url(#glowCyan)"/>
      <rect width="${size}" height="${size}" fill="url(#glowViolet)"/>` : ''}
    ${art ? place(prism(), cx, cy, ART_W * v) : ''}
    ${mono ? place(MONO, cx, cy, ART_W * v) : ''}
  </svg>`;
}

// Splash: the prism alone on transparent, 72% of the image wide; the app
// config shows it 200 dp wide on #f8fafc (light) or navy (dark).
const splash = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block">
  <defs>${DEFS}</defs>
  ${place(prism({ underlay: true }), size / 2, size * (0.5 - OPTICAL_LIFT), 0.72 * size)}
</svg>`;

// Android shows everything inside a 66 dp circle of the 108 dp layer.
const reachPx = REACH * ((ART_W * 1024 * ADAPTIVE_K) / (BOX.x1 - BOX.x0)) + 1024 * ADAPTIVE_K * OPTICAL_LIFT;
const safePx = (33 / 108) * 1024;
if (reachPx > safePx) throw new Error(`The prism leaves Android's safe zone: ${reachPx} > ${safePx} px`);

const ASSETS = [
  { file: 'icon.png', size: 1024, svg: scene({ size: 1024, background: true, art: true }) },
  { file: 'android-icon-background.png', size: 1024, svg: scene({ size: 1024, k: ADAPTIVE_K, background: true }) },
  { file: 'android-icon-foreground.png', size: 1024, svg: scene({ size: 1024, k: ADAPTIVE_K, art: true }) },
  { file: 'android-icon-monochrome.png', size: 1024, svg: scene({ size: 1024, k: ADAPTIVE_K, mono: true }) },
  { file: 'splash-icon.png', size: 1024, svg: splash(1024) },
  { file: 'favicon.png', size: 48, svg: scene({ size: 48, background: true, art: true }) },
];

function previewHtml() {
  const uri = (file) => `data:image/png;base64,${fs.readFileSync(path.join(out, file)).toString('base64')}`;
  const icon = uri('icon.png'), bg = uri('android-icon-background.png');
  const fg = uri('android-icon-foreground.png'), mono = uri('android-icon-monochrome.png');
  const spl = uri('splash-icon.png');
  const S = 150, L = S / ADAPTIVE_K, off = -(L - S) / 2;
  const layer = `width:${L}px;left:${off}px;top:${off}px`;
  const adaptive = (radius, label) => `<figure><div class="mask" style="border-radius:${radius}">
      <img src="${bg}" style="${layer}"><img src="${fg}" style="${layer}"></div><figcaption>${label}</figcaption></figure>`;
  const themed = (tile, tint, label) => `<figure><div class="mask" style="border-radius:50%;background:${tile}">
      <div style="position:absolute;width:${L}px;height:${L}px;left:${off}px;top:${off}px;background:${tint};-webkit-mask:url(${mono}) center/contain no-repeat"></div></div><figcaption>${label}</figcaption></figure>`;
  const small = (px, wall) => `<div class="wall" style="background:${wall}"><img src="${icon}" style="width:${px}px;border-radius:${px * 0.2237}px"><span>${px}px</span></div>`;
  const phone = (bgc, label) => `<figure><div class="phone" style="background:${bgc}"><img src="${spl}" style="width:200px"></div><figcaption>${label}</figcaption></figure>`;
  return `<!doctype html><html><head><style>
    body{margin:0;padding:24px;background:#e5e7eb;font:14px system-ui;display:flex;flex-direction:column;gap:20px}
    .row{display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap}
    figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}
    .mask{position:relative;width:${S}px;height:${S}px;overflow:hidden}
    .mask img{position:absolute;height:auto}
    .wall{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 16px;border-radius:12px;color:#888}
    .phone{width:240px;height:480px;border-radius:28px;display:flex;align-items:center;justify-content:center;border:6px solid #111}
    h3{margin:0}
  </style></head><body>
    <h3>App icon (iOS mask) and Android launcher masks</h3>
    <div class="row">
      <figure><img src="${icon}" style="width:${S}px;border-radius:${S * 0.2237}px"><figcaption>iOS</figcaption></figure>
      ${adaptive('50%', 'Android circle')}${adaptive('32%', 'squircle')}${adaptive('16%', 'rounded square')}${adaptive('50% 50% 50% 16%', 'teardrop')}
      ${themed('#d3e3fd', '#041e49', 'themed (light)')}${themed('#004a77', '#c2e7ff', 'themed (dark)')}
    </div>
    <h3>Small sizes on light and dark wallpapers</h3>
    <div class="row">${[48, 72, 96].map((px) => small(px, '#f1f5f9')).join('')}${[48, 72, 96].map((px) => small(px, '#111827')).join('')}${small(24, '#f1f5f9')}</div>
    <h3>Splash screen (light, dark)</h3>
    <div class="row">${phone('#f8fafc', 'light')}${phone(NAVY, 'dark')}</div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const asset of ASSETS) {
    await page.setViewportSize({ width: asset.size, height: asset.size });
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}</style></head><body>${asset.svg}</body></html>`);
    await page.screenshot({
      path: path.join(out, asset.file),
      omitBackground: true,
      clip: { x: 0, y: 0, width: asset.size, height: asset.size },
    });
    console.log(`wrote assets/images/${asset.file}`);
  }
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.setContent(previewHtml());
  const preview = path.join(previewDir, 'lumiq-icon-preview.png');
  await page.screenshot({ path: preview, fullPage: true });
  console.log(`preview: ${preview}`);
  console.log(`Android safe zone: prism reaches ${reachPx.toFixed(1)} of ${safePx.toFixed(1)} px`);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
