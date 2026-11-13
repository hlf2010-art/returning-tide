// Canvas-texture helpers. Everything in this slice is procedural: no image assets.
import * as THREE from 'three';

export const FONT = {
  serif: '"Noto Serif SC", "Songti SC", "SimSun", serif',
  sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
  hand: '"Ma Shan Zheng", "Kaiti SC", "KaiTi", cursive',
};

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

export function tex(canvas, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Per-pixel grain so flat fills read as stone / asphalt rather than plastic.
export function grain(ctx, w, h, amount, seed = 1, mono = true) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += mono ? n : (r() - 0.5) * amount; d[i + 2] += mono ? n : (r() - 0.5) * amount;
  }
  ctx.putImageData(img, 0, 0);
}

// Tileable fractal value noise in [0,1], size x size.
export function tileNoise(size, cells, seed, octaves = 4) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o, r = rng(seed + o * 101), lat = new Float32Array(n * n);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const a = lat[(y0 % n) * n + (x0 % n)], b = lat[(y0 % n) * n + ((x0 + 1) % n)];
        const c = lat[((y0 + 1) % n) * n + (x0 % n)], d = lat[((y0 + 1) % n) * n + ((x0 + 1) % n)];
        out[y * size + x] += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
      }
    }
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

// Height canvas (red channel = height) -> tangent-space normal map canvas.
export function normalFromHeight(src, strength = 2) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => s[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Soft round glow, used for lamp halos and light pools.
export function glowTexture(size = 128, stops = [[0, 1], [0.25, 0.45], [0.6, 0.1], [1, 0]]) {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [p, a] of stops) g.addColorStop(p, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return tex(c, { repeat: false });
}

// Wait for the bundled CJK webfonts needed by canvas-drawn signage. Falls back to
// system fonts if anything fails (offline, blocked) rather than holding up the game.
export async function loadFonts(requests) {
  if (!document.fonts) return;
  const jobs = requests.map(([font, text]) => document.fonts.load(font, text).catch(() => null));
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 6000))]);
}
