// Draws LUMIQ's launcher artwork from the brand's own SVG files (the L and the
// sun on the blue tile): the app icon, the Android adaptive-icon layers, the
// start-screen image and the favicon. Nothing is redrawn here: every PNG is a
// brand file rendered at size, so a correction to a brand file reaches the app
// by running this again. It also writes a preview sheet that shows the icon in
// the launcher's masks, at small sizes, themed, and on the light and dark
// start screens, and it measures the art so a mark that leaves Android's safe
// circle stops the run.
//
//   npm run icons                                 (from mobile/)
//   node scripts/make-icons.js <preview folder>   (preview somewhere else)
//
// The brand folder is LUMIQ-rebuild-work/brand beside this checkout; set
// LUMIQ_BRAND_DIR if it lives elsewhere. The SVGs are rendered with the
// Playwright browser the web app already has for its tests (run `npm install`
// in the repo root first).
const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const out = path.join(mobileRoot, 'assets', 'images');
const brandDir = process.env.LUMIQ_BRAND_DIR ?? path.resolve(repoRoot, '..', 'LUMIQ-rebuild-work', 'brand');
const previewDir = process.argv[2] ?? path.resolve(brandDir, '..', 'showcase', 'img', 'phase1');
const previewFile = path.join(previewDir, 'icons-preview.png');

let chromium;
try {
  ({ chromium } = require(path.join(repoRoot, 'node_modules', 'playwright-core')));
} catch {
  console.error('Needs the web app\'s Playwright: run `npm install` and `npx playwright install chromium` in the repo root.');
  process.exit(1);
}

// ---- The brand files ------------------------------------------------------
const brand = (name) => {
  try {
    return fs.readFileSync(path.join(brandDir, name), 'utf8');
  } catch {
    console.error(`Cannot read ${name} in ${brandDir}. Set LUMIQ_BRAND_DIR to the brand folder.`);
    process.exit(1);
  }
};
const svgUri = (name) => `data:image/svg+xml;base64,${Buffer.from(brand(name)).toString('base64')}`;
const pngUri = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

const tokens = JSON.parse(brand('tokens.json'));
const TILE = tokens.color.light.action; // the tile blue, the adaptive icon's back layer
const GROUND = { light: tokens.color.light.ground, dark: tokens.color.dark.ground };

// ---- What the app config will do with the images ---------------------------
const expo = require(path.join(mobileRoot, 'app.json')).expo;
const splashConfig = (expo.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen')?.[1] ?? {};
const SPLASH_IMAGE_DP = splashConfig.imageWidth ?? 100; // the start-screen image is shown this wide
const splashGround = {
  light: splashConfig.backgroundColor ?? GROUND.light,
  dark: splashConfig.dark?.backgroundColor ?? GROUND.dark,
};

const SIZE = 1024;
// Android adaptive icon: each layer is 108 dp, the launcher's mask shows the
// middle 72 dp, and only a 66 dp circle is safe in every mask.
const LAYER_DP = 108;
const MASK_DP = 72;
const SAFE_DP = 66;
// Start screen (brand spec, Launch): the tile is 112 dp wide at the centre of
// the screen. The phone shows the whole image SPLASH_IMAGE_DP wide, so the
// tile takes 112 / SPLASH_IMAGE_DP of the image and the rest stays clear. If
// imageWidth changes in app.json, run this again. Android 12 and later show
// the image on a 288 dp canvas and cut it with a 192 dp circle.
const START_TILE_DP = 112;
const SPLASH_CANVAS_DP = 288;
const SPLASH_MASK_DP = 192;
if (START_TILE_DP > SPLASH_IMAGE_DP) {
  console.error(`app.json shows the start-screen image ${SPLASH_IMAGE_DP} wide, less than the ${START_TILE_DP} the tile needs.`);
  process.exit(1);
}
const tilePx = 2 * Math.round((SIZE * START_TILE_DP) / SPLASH_IMAGE_DP / 2); // even, so it centres on whole pixels

const image = (src, px, style = '') => `<img src="${src}" style="display:block;width:${px}px;height:${px}px;${style}">`;

const ASSETS = [
  // The store icon and iPhone icon: the full square tile, the phone cuts its own shape.
  { key: 'icon', file: 'icon.png', size: SIZE, html: image(svgUri('app-icon.svg'), SIZE) },
  { key: 'bg', file: 'android-icon-background.png', size: SIZE, html: `<div style="width:${SIZE}px;height:${SIZE}px;background:${TILE}"></div>` },
  { key: 'fg', file: 'android-icon-foreground.png', size: SIZE, html: image(svgUri('adaptive-foreground.svg'), SIZE) },
  { key: 'mono', file: 'android-icon-monochrome.png', size: SIZE, html: image(svgUri('adaptive-monochrome.svg'), SIZE) },
  // The tile with the still L and no sun, clear around it.
  {
    key: 'splash', file: 'splash-icon.png', size: SIZE,
    html: `<div style="width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center">${image(svgUri('start-screen.svg'), tilePx)}</div>`,
  },
  // The flat tile of the lockup (its first 48 units), at the size it is drawn for.
  {
    key: 'favicon', file: 'favicon.png', size: 48,
    html: `<div style="width:48px;height:48px;overflow:hidden"><img src="${svgUri('lockup.svg')}" style="display:block;height:48px"></div>`,
  },
];

// ---- The launcher's cut of the adaptive layers, `px` wide -------------------
const MASKS = { circle: '50%', squircle: '32%', 'rounded square': '16%', teardrop: '50% 50% 15% 50%' };
const layerStyle = (px) => {
  const layer = (px * LAYER_DP) / MASK_DP;
  const offset = (px - layer) / 2;
  return `position:absolute;display:block;width:${layer}px;height:${layer}px;left:${offset}px;top:${offset}px`;
};
const maskStyle = (px, radius) => `position:relative;overflow:hidden;flex:none;width:${px}px;height:${px}px;border-radius:${radius}`;
const adaptive = (png, px, radius, over = '') => `<div style="${maskStyle(px, radius)}">
  <img src="${png.bg}" style="${layerStyle(px)}"><img src="${png.fg}" style="${layerStyle(px)}">${over}</div>`;
// Android 13 themed icon: the phone tints the one-colour layer and its tile.
const themed = (png, px, tile, tint) => `<div style="${maskStyle(px, '50%')};background:${tile}">
  <div style="${layerStyle(px)};background:${tint};-webkit-mask:url(${png.mono}) center/contain no-repeat;mask:url(${png.mono}) center/contain no-repeat"></div></div>`;
// Centre lines and the safe circle, drawn in the opposite of what is under them.
const guides = (px) => {
  const safe = (px * SAFE_DP) / MASK_DP;
  const base = 'position:absolute;display:block;mix-blend-mode:difference';
  return `<i style="${base};background:#fff;left:0;top:${px / 2 - 0.5}px;width:${px}px;height:1px"></i>
    <i style="${base};background:#fff;top:0;left:${px / 2 - 0.5}px;width:1px;height:${px}px"></i>
    <i style="${base};box-sizing:border-box;border:1px dashed #fff;border-radius:50%;left:${(px - safe) / 2}px;top:${(px - safe) / 2}px;width:${safe}px;height:${safe}px"></i>`;
};

// ---- Where the drawn art sits in a PNG: its box, its weight, its reach ------
const measure = (page, uri) => page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = width, x1 = -1, y0 = height, y1 = -1, reach = 0, mass = 0, mx = 0, my = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      mass += alpha; mx += alpha * (x + 0.5); my += alpha * (y + 0.5);
      if (alpha < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      reach = Math.max(reach, Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2));
    }
  }
  return {
    width: x1 + 1 - x0, height: y1 + 1 - y0,
    boxX: (x0 + x1 + 1) / 2 - width / 2, boxY: (y0 + y1 + 1) / 2 - height / 2, // box centre, from the image centre
    weightX: mx / mass - width / 2, weightY: my / mass - height / 2, // centre of weight, from the image centre
    reach, // the farthest drawn point from the image centre
  };
}, uri);
const off = (x, y) => `${Math.abs(x).toFixed(1)} ${x < 0 ? 'left' : 'right'}, ${Math.abs(y).toFixed(1)} ${y < 0 ? 'up' : 'down'}`;

function previewHtml(png, cuts, notes) {
  const S = 150, BIG = 280, DP = 0.75;
  const fig = (body, label) => `<figure>${body}<figcaption>${label}</figcaption></figure>`;
  const wall = (color, items) => `<div class="wall" style="background:${color}">${items.join('')}</div>`;
  const real = (name, px) => fig(`<img src="${cuts[name]}" style="display:block;width:${px}px;height:${px}px">`, `${px}`);
  const zoom = (name, label) => fig(`<img src="${cuts[name]}" class="zoom" style="display:block;width:192px;height:192px">`, label);
  const shown = SPLASH_IMAGE_DP * DP;
  const phone = (ground, label) => fig(`<div class="phone" style="width:${360 * DP}px;height:${720 * DP}px;background:${ground}">
      <img src="${png.splash}" style="display:block;width:${shown}px;height:${shown}px;clip-path:circle(${(SPLASH_MASK_DP / 2) * DP}px at 50% 50%)"></div>`, label);
  const edge = (SPLASH_CANVAS_DP - SPLASH_IMAGE_DP) / 2, ring = (SPLASH_CANVAS_DP - SPLASH_MASK_DP) / 2;
  const maskCheck = (ground) => `<div style="position:relative;width:${SPLASH_CANVAS_DP}px;height:${SPLASH_CANVAS_DP}px;background:${ground}">
      <img src="${png.splash}" style="position:absolute;display:block;width:${SPLASH_IMAGE_DP}px;height:${SPLASH_IMAGE_DP}px;left:${edge}px;top:${edge}px">
      <i style="position:absolute;box-sizing:border-box;border:1px dashed #d12;border-radius:50%;left:${ring}px;top:${ring}px;width:${SPLASH_MASK_DP}px;height:${SPLASH_MASK_DP}px"></i></div>`;
  return `<!doctype html><html><head><style>
    body{margin:0;padding:24px;background:#e5e7eb;color:#1f2937;font:14px system-ui,sans-serif;display:flex;flex-direction:column;gap:18px}
    h3{margin:6px 0 0;font-size:15px}
    p{margin:0;color:#4b5563}
    .row{display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap}
    figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}
    figcaption{color:#4b5563}
    .wall{display:flex;align-items:flex-end;gap:18px;padding:16px 18px;border-radius:12px}
    .wall figcaption{color:#8b93a1}
    .phone{display:flex;align-items:center;justify-content:center;border:6px solid #6b7280;border-radius:28px}
    .zoom{image-rendering:pixelated}
  </style></head><body>
    <h3>App icon in the phone's masks</h3>
    <div class="row">
      ${fig(image(png.icon, S, `border-radius:${S * 0.2237}px`), 'iPhone')}
      ${Object.entries(MASKS).map(([name, radius]) => fig(adaptive(png, S, radius), `Android ${name}`)).join('')}
      ${fig(themed(png, S, '#d3e3fd', '#041e49'), 'themed, light')}${fig(themed(png, S, '#004a77', '#c2e7ff'), 'themed, dark')}
    </div>
    <h3>Centring: the round mask, with the centre lines and Android's safe circle</h3>
    <div class="row">
      ${fig(adaptive(png, BIG, MASKS.circle), 'as shown')}
      ${fig(adaptive(png, BIG, MASKS.circle, guides(BIG)), 'centre and safe circle')}
      ${fig(adaptive(png, BIG, MASKS.squircle, guides(BIG)), 'squircle')}
      ${fig(image(png.icon, BIG, `border-radius:${BIG * 0.2237}px`), 'iPhone')}
    </div>
    <p>${notes.join('<br>')}</p>
    <h3>Small sizes, pixel for pixel, and the 48 cut four times larger</h3>
    <div class="row">
      ${wall('#f1f5f9', [real('circle48', 48), real('circle72', 72), real('circle96', 96), real('squircle48', 48), real('themed48', 48), real('favicon', 48)])}
      ${wall('#111827', [real('circle48', 48), real('circle72', 72), real('circle96', 96), real('squircle48', 48), real('themedDark48', 48), real('favicon', 48)])}
    </div>
    <div class="row">
      ${wall('#f1f5f9', [zoom('circle48', 'circle 48'), zoom('squircle48', 'squircle 48'), zoom('themed48', 'themed 48')])}
      ${wall('#111827', [zoom('circle48', 'circle 48'), zoom('favicon', 'favicon 48')])}
    </div>
    <h3>Start screen, light and dark: the tile ${START_TILE_DP} dp wide on a 360 dp phone, cut as Android 12 and later cut it</h3>
    <p>Beside the phones: Android's ${SPLASH_CANVAS_DP} dp start-screen canvas at 1 px to 1 dp, with its ${SPLASH_MASK_DP} dp round mask drawn as a dashed line.</p>
    <div class="row">
      ${phone(splashGround.light, `light ${splashGround.light}`)}${phone(splashGround.dark, `dark ${splashGround.dark}`)}
      ${fig(maskCheck(splashGround.light), 'round mask, light')}${fig(maskCheck(splashGround.dark), 'round mask, dark')}
    </div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    // Renders `html` on a clear page and returns it as a PNG (also written to `file`, if given).
    const shoot = async (html, width, height, file) => {
      await page.setViewportSize({ width, height });
      await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent}</style></head><body>${html}</body></html>`);
      await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
      return page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width, height } });
    };

    const png = {};
    for (const asset of ASSETS) {
      png[asset.key] = pngUri(await shoot(asset.html, asset.size, asset.size, path.join(out, asset.file)));
      console.log(`wrote assets/images/${asset.file}`);
    }

    // ---- Checks, measured from the PNGs just written ------------------------
    const problems = [];
    const notes = [];
    const safeRadius = (SIZE * SAFE_DP) / LAYER_DP / 2;
    const maskRadius = (SIZE * MASK_DP) / LAYER_DP / 2;
    const layers = { 'android-icon-foreground.png': await measure(page, png.fg), 'android-icon-monochrome.png': await measure(page, png.mono) };
    for (const [file, m] of Object.entries(layers)) {
      notes.push(`${file}: art ${m.width} by ${m.height} px (${((100 * m.width) / (2 * maskRadius)).toFixed(1)} percent of what shows); `
        + `its box sits ${off(m.boxX, m.boxY)} of centre, its weight ${off(m.weightX, m.weightY)}; `
        + `farthest point ${m.reach.toFixed(1)} px from centre, safe circle ${safeRadius.toFixed(1)}, round mask ${maskRadius.toFixed(1)}`);
      if (m.reach > safeRadius) problems.push(`${file}: the art leaves Android's safe circle (${m.reach.toFixed(1)} > ${safeRadius.toFixed(1)} px)`);
    }
    const [fg, mono] = Object.values(layers);
    if (Math.abs(fg.boxX - mono.boxX) > 1 || Math.abs(fg.boxY - mono.boxY) > 1 || Math.abs(fg.width - mono.width) > 1) {
      problems.push('The themed (one-colour) layer does not sit where the colour layer sits.');
    }
    const splash = await measure(page, png.splash);
    const dp = SPLASH_IMAGE_DP / SIZE;
    notes.push(`splash-icon.png: tile ${splash.width} px of ${SIZE}, shown ${(splash.width * dp).toFixed(1)} dp wide at imageWidth ${SPLASH_IMAGE_DP}; `
      + `its corner reaches ${(splash.reach * dp).toFixed(1)} dp from centre, Android's round mask ${SPLASH_MASK_DP / 2}`);
    if (Math.abs(splash.boxX) > 0.5 || Math.abs(splash.boxY) > 0.5) problems.push('splash-icon.png: the tile is not centred.');
    if (splash.reach * dp > SPLASH_MASK_DP / 2) problems.push('splash-icon.png: Android\'s round start-screen mask would cut the tile.');
    const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    for (const [key, have, want] of [
      ['android.adaptiveIcon.backgroundColor', expo.android?.adaptiveIcon?.backgroundColor, TILE],
      ['expo-splash-screen backgroundColor', splashConfig.backgroundColor, GROUND.light],
      ['expo-splash-screen dark.backgroundColor', splashConfig.dark?.backgroundColor, GROUND.dark],
    ]) {
      if (!same(have, want)) problems.push(`app.json ${key} is ${have}; the brand tokens say ${want}.`);
    }

    // ---- The launcher's real small cuts, then the sheet -----------------------
    const cuts = { favicon: png.favicon };
    for (const px of [48, 72, 96]) cuts[`circle${px}`] = pngUri(await shoot(adaptive(png, px, MASKS.circle), px, px));
    cuts.squircle48 = pngUri(await shoot(adaptive(png, 48, MASKS.squircle), 48, 48));
    cuts.themed48 = pngUri(await shoot(themed(png, 48, '#d3e3fd', '#041e49'), 48, 48));
    cuts.themedDark48 = pngUri(await shoot(themed(png, 48, '#004a77', '#c2e7ff'), 48, 48));

    fs.mkdirSync(previewDir, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.setContent(previewHtml(png, cuts, notes));
    await page.screenshot({ path: previewFile, fullPage: true });

    for (const note of notes) console.log(note);
    console.log(`preview: ${previewFile}`);
    if (problems.length) {
      for (const problem of problems) console.error(`PROBLEM: ${problem}`);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
