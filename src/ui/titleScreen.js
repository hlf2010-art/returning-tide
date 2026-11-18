// The title and loading screen: the Bund at blue hour as a painted backdrop (public/title/bund-night.webp),
// brought to life with a light touch: glints on the Huangpu, the promenade lamps breathing, the Pearl's
// spheres pulsing, a slow drift of the whole frame. The gold line under the title doubles as the loading
// bar; once the city is ready it flares and the card rises in. Stops drawing once the game begins.
import * as THREE from 'three';

const IMG = { src: '/title/bund-night.webp', w: 1672, h: 941 };
// light sources in the image's own pixels
const LAMPS = [[588, 566, 46], [493, 651, 26], [426, 687, 18], [361, 478, 14]];
const NEON = [[1319, 468, 22, '255,80,170'], [1318, 621, 26, '255,90,180'], [1588, 372, 10, '255,235,225']];

export function createTitleScreen() {
  const root = document.getElementById('entry');
  const canvas = document.getElementById('entry-fx');
  const line = root.querySelector('.swoosh .sw-line');
  const glow = root.querySelector('.swoosh .sw-glow');
  const flare = root.querySelector('.swoosh .sw-flare');
  const pctEl = document.getElementById('load-pct');
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- loading progress: real asset counts where three.js reports them, a patient creep otherwise ----
  const t0 = performance.now();
  let assets = 0, ready = false, shown = 0, done = false;
  const mgr = THREE.DefaultLoadingManager;
  const prev = mgr.onProgress;
  mgr.onProgress = (url, loaded, total) => { assets = Math.max(assets, total ? loaded / total : 0); if (prev) prev(url, loaded, total); };
  const target = () => {
    if (ready) return 1;
    const creep = 0.9 * (1 - Math.exp(-(performance.now() - t0) / 14000));
    return Math.min(0.96, Math.max(creep, assets * 0.92));
  };
  const lineLen = 1;
  const setLine = (p) => {
    const off = lineLen * (1 - p);
    line.style.strokeDashoffset = off; glow.style.strokeDashoffset = off;
    if (line.getTotalLength) {
      const L = line.getTotalLength(), pt = line.getPointAtLength(L * (ready && p > 0.999 ? 0.56 : p));
      flare.setAttribute('cx', pt.x); flare.setAttribute('cy', pt.y);
    }
    if (pctEl) pctEl.textContent = `${Math.round(p * 100)}%`;
  };

  // ---- glints on the river, seeded from where the image's reflections actually are ----
  const spots = [];
  const img = new Image();
  img.src = IMG.src;
  img.onload = () => {
    const k = 2, w = IMG.w / k | 0, h = IMG.h / k | 0;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 735 / k | 0; y < 935 / k; y++) {
      for (let x = 600 / k | 0; x < w; x++) {
        // the railing cuts across the lower left: keep to open water above it
        const ix = x * k, iy = y * k;
        if (iy > 790 + (ix - 600) * 0.2 && ix < 1500) continue;
        const i = (y * w + x) * 4, l = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (l > 96) spots.push([ix, iy, d[i], d[i + 1], d[i + 2], l]);
      }
    }
  };
  const glints = [];
  const spawn = (g) => {
    const s = spots[(Math.random() * spots.length) | 0];
    const near = (s[1] - 735) / 200;                       // 0 at the far bank, 1 at the railing
    g.x = s[0]; g.y = s[1] + (Math.random() - 0.5) * 3; g.len = 4 + near * 26 * (0.4 + Math.random());
    g.r = Math.min(255, s[2] + 40); g.g = Math.min(255, s[3] + 40); g.b = Math.min(255, s[4] + 40);
    g.a = 0.35 + 0.5 * Math.min(1, (s[5] - 96) / 120); g.t = 0; g.life = 0.5 + Math.random() * 1.6; g.vx = (Math.random() - 0.5) * 6;
    return g;
  };

  let W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0;
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight; dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    sc = Math.max(W / IMG.w, H / IMG.h); ox = (W - IMG.w * sc) / 2; oy = (H - IMG.h * sc) / 2;
  };
  addEventListener('resize', resize); resize();

  const radial = (x, y, r, rgb, a) => {
    const X = ox + x * sc, Y = oy + y * sc, R = r * sc;
    const gr = ctx.createRadialGradient(X, Y, 0, X, Y, R);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, 2 * R, 2 * R);
  };

  let last = performance.now(), raf = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (root.classList.contains('hidden')) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    // the loading line eases towards where loading is
    if (!done) {
      const tg = target(); shown += (tg - shown) * Math.min(1, dt * (ready ? 5 : 2.5));
      if (ready && shown > 0.995) { shown = 1; done = true; root.classList.add('loaded'); }
      setLine(shown);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of LAMPS) radial(x, y, r * (1 + 0.06 * Math.sin(t * 1.3 + x)), '255,214,150', 0.22 + 0.06 * Math.sin(t * 0.9 + y));
    for (const [x, y, r, rgb] of NEON) radial(x, y, r, rgb, 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.1 + x * 0.01)));
    if (spots.length) {
      while (glints.length < (still ? 0 : 170)) glints.push(spawn({}));
      ctx.lineCap = 'round';
      for (const g of glints) {
        g.t += dt; if (g.t > g.life) spawn(g);
        g.x += g.vx * dt;
        const f = Math.sin(Math.PI * g.t / g.life), X = ox + g.x * sc, Y = oy + g.y * sc, half = g.len * sc * 0.5;
        ctx.strokeStyle = `rgba(${g.r},${g.g},${g.b},${g.a * f})`; ctx.lineWidth = Math.max(0.8, 1.6 * sc);
        ctx.beginPath(); ctx.moveTo(X - half, Y); ctx.lineTo(X + half, Y); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; removeEventListener('resize', resize); mgr.onProgress = prev; };
  raf = requestAnimationFrame(frame);

  return {
    // the city has loaded: fill the line, flare, bring the card in
    ready() { ready = true; root.classList.remove('loading'); if (still) { shown = 1; done = true; setLine(1); root.classList.add('loaded'); } },
    fail() { ready = true; root.classList.remove('loading'); root.classList.add('failed'); },
  };
}
