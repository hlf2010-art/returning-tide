// Procedural surface textures: stone, facade window atlases, paving, asphalt.
import { makeCanvas, tex, rng, grain, tileNoise, normalFromHeight } from './canvas.js';

const STONE = '#a89f8f';

function stoneCourses(ctx, w, h, { course = 64, block = 128, deep = false, seed = 3 } = {}) {
  const r = rng(seed);
  for (let y = 0, row = 0; y < h; y += course, row++) {
    for (let x = -block; x < w + block; x += block) {
      const ox = x + (row % 2 ? block / 2 : 0);
      const v = 150 + Math.floor(r() * 26);
      ctx.fillStyle = `rgb(${v + 12},${v + 4},${v - 10})`;
      ctx.fillRect(ox, y, block, course);
    }
    ctx.fillStyle = deep ? 'rgba(20,16,12,0.75)' : 'rgba(40,34,28,0.4)';
    ctx.fillRect(0, y, w, deep ? 4 : 2);
    ctx.fillStyle = 'rgba(255,250,235,0.16)';
    ctx.fillRect(0, y + (deep ? 4 : 2), w, 2);
    for (let x = -block; x < w + block; x += block) {
      const ox = x + (row % 2 ? block / 2 : 0);
      ctx.fillStyle = deep ? 'rgba(20,16,12,0.7)' : 'rgba(40,34,28,0.32)';
      ctx.fillRect(ox, y, deep ? 3 : 2, course);
    }
  }
}

// 2 m x 2 m of coursed granite, for columns, cornices and plain walls.
export function stoneTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = STONE; ctx.fillRect(0, 0, 512, 512);
  stoneCourses(ctx, 512, 512, { course: 128, block: 256 });
  grain(ctx, 512, 512, 22, 11);
  return tex(c);
}

// Fluted column shaft: vertical grooves, tiles around the circumference.
export function fluteTexture() {
  const [c, ctx] = makeCanvas(256, 64);
  for (let x = 0; x < 256; x++) {
    const t = (x % 16) / 16, v = 150 + Math.sin(t * Math.PI) * 55;
    ctx.fillStyle = `rgb(${v + 10},${v + 3},${v - 10})`;
    ctx.fillRect(x, 0, 1, 64);
  }
  grain(ctx, 256, 64, 14, 5);
  return tex(c);
}

// ---- facade atlases: 8 bays x 4 floors, one window per cell ----
const COLS = 8, ROWS = 4, CELL = 256;

const STYLES = {
  classic: { lit: 0.14, win: { x: 0.29, w: 0.42, top: 0.14, h: 0.66 }, seed: 21 },
  arched: { lit: 0.12, win: { x: 0.27, w: 0.46, top: 0.1, h: 0.72, arch: true }, seed: 22 },
  rustic: { lit: 0.1, win: { x: 0.24, w: 0.52, top: 0.14, h: 0.86, arch: true, door: true }, deep: true, seed: 23 },
  deco: { lit: 0.12, win: { x: 0.22, w: 0.56, top: 0, h: 0.7, strip: true }, seed: 24 },
  brick: { lit: 0.3, win: { x: 0.3, w: 0.4, top: 0.2, h: 0.56 }, brick: true, seed: 25 },
};

function brickFill(ctx, w, h, seed) {
  const r = rng(seed);
  ctx.fillStyle = '#5b4a40'; ctx.fillRect(0, 0, w, h);
  for (let y = 0, row = 0; y < h; y += 8, row++) {
    for (let x = -24; x < w; x += 24) {
      const v = r();
      ctx.fillStyle = `rgb(${118 + v * 34},${68 + v * 20},${52 + v * 14})`;
      ctx.fillRect(x + (row % 2 ? 12 : 0) + 1, y + 1, 22, 6);
    }
  }
}

function windowPath(ctx, x, y, w, h, arch) {
  ctx.beginPath();
  if (arch) {
    const r = w / 2;
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
  } else ctx.rect(x, y, w, h);
  ctx.closePath();
}

export function facadeAtlas(styleName) {
  const st = STYLES[styleName], W = COLS * CELL, H = ROWS * CELL;
  const [c, ctx] = makeCanvas(W, H);
  const [ec, ectx] = makeCanvas(W / 4, H / 4);
  ectx.fillStyle = '#000'; ectx.fillRect(0, 0, W / 4, H / 4);
  const r = rng(st.seed);

  if (st.brick) brickFill(ctx, W, H, st.seed);
  else {
    ctx.fillStyle = STONE; ctx.fillRect(0, 0, W, H);
    stoneCourses(ctx, W, H, st.deep ? { course: 32, block: 64, deep: true } : { course: 32, block: 96 });
  }

  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const cx = col * CELL, cy = row * CELL, wn = st.win;
    const x = cx + wn.x * CELL, w = wn.w * CELL, y = cy + wn.top * CELL, h = wn.h * CELL;
    const lit = r() < st.lit;

    if (st.win.strip) {
      // art-deco pier grooves either side of a continuous window strip
      ctx.fillStyle = 'rgba(30,26,22,0.35)';
      for (const gx of [0.06, 0.12, 0.84, 0.9]) ctx.fillRect(cx + gx * CELL, cy, 5, CELL);
      ctx.fillStyle = '#3a2f24'; ctx.fillRect(x, cy + wn.h * CELL, w, CELL - wn.h * CELL); // bronze spandrel
      ctx.fillStyle = 'rgba(160,140,90,0.35)';
      for (let k = 1; k < 5; k++) ctx.fillRect(x + (w * k) / 5 - 2, cy + wn.h * CELL + 10, 4, CELL - wn.h * CELL - 20);
    } else if (!st.win.door) {
      // stone surround + sill
      ctx.fillStyle = st.brick ? '#b7ad9c' : 'rgba(215,206,188,0.9)';
      windowPath(ctx, x - 12, y - 12, w + 24, h + 20, wn.arch); ctx.fill();
      ctx.fillRect(x - 22, y + h + 6, w + 44, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x - 22, y + h + 18, w + 44, 7);
      if (wn.arch) { ctx.fillStyle = 'rgba(225,216,198,1)'; ctx.fillRect(x + w / 2 - 9, y - 22, 18, 26); }
    } else {
      ctx.fillStyle = 'rgba(15,12,10,0.6)';
      windowPath(ctx, x - 8, y - 8, w + 16, h + 8, true); ctx.fill();
    }

    // glass: a little of the blue-hour sky at the top, deep interior below
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (lit) { g.addColorStop(0, '#6b5a3c'); g.addColorStop(1, '#4a3c28'); }
    else { g.addColorStop(0, '#34486a'); g.addColorStop(0.4, '#1a2434'); g.addColorStop(1, '#0d1219'); }
    ctx.fillStyle = g; windowPath(ctx, x, y, w, h, wn.arch); ctx.fill();

    ctx.save(); windowPath(ctx, x, y, w, h, wn.arch); ctx.clip();
    // recess shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, w, 14); ctx.fillRect(x, y, 9, h);
    // glazing bars / door leaves
    ctx.fillStyle = wn.door ? '#3b2f22' : '#221f1c';
    if (wn.door) {
      const isDoor = col % 4 === 1;
      if (isDoor) {
        ctx.fillStyle = '#2a2018'; ctx.fillRect(x, y + h * 0.42, w, h);
        ctx.fillStyle = '#6a5433'; ctx.fillRect(x + w / 2 - 3, y + h * 0.42, 6, h);
        ctx.strokeStyle = '#7a6238'; ctx.lineWidth = 4;
        ctx.strokeRect(x + 12, y + h * 0.5, w / 2 - 22, h * 0.4); ctx.strokeRect(x + w / 2 + 10, y + h * 0.5, w / 2 - 22, h * 0.4);
      } else {
        ctx.fillStyle = '#1a1714';
        for (let k = 1; k < 7; k++) ctx.fillRect(x + (w * k) / 7 - 2, y, 4, h);       // iron grille
        for (let k = 1; k < 5; k++) ctx.fillRect(x, y + (h * k) / 5, w, 4);
        ctx.fillStyle = STONE; ctx.fillRect(x - 4, y + h * 0.78, w + 8, h);            // dado under the window
      }
    } else {
      const bars = wn.strip ? 3 : 2;
      for (let k = 1; k < bars; k++) ctx.fillRect(x + (w * k) / bars - 3, y, 6, h);
      for (let k = 1; k < 3; k++) ctx.fillRect(x, y + (h * k) / 3 - 2, w, 5);
    }
    ctx.restore();

    if (lit) {
      const s = 0.25, ex = x * s, ey = y * s, ew = w * s, eh = h * s;
      const warm = r();
      const eg = ectx.createLinearGradient(0, ey, 0, ey + eh);
      eg.addColorStop(0, warm > 0.3 ? '#ffd9a0' : '#e8f0ff'); eg.addColorStop(1, warm > 0.3 ? '#c98a3e' : '#9fb4d8');
      ectx.fillStyle = eg;
      ectx.save(); windowPath(ectx, ex, ey, ew, eh, wn.arch); ectx.clip();
      ectx.fillRect(ex, ey, ew, eh);
      ectx.fillStyle = 'rgba(0,0,0,0.55)';
      if (r() > 0.5) ectx.fillRect(ex, ey, ew * (0.3 + r() * 0.3), eh);               // half-drawn curtain
      ectx.fillStyle = 'rgba(0,0,0,0.8)';
      ectx.fillRect(ex + ew / 2 - 1, ey, 2, eh); ectx.fillRect(ex, ey + eh / 3, ew, 1.5); ectx.fillRect(ex, ey + (2 * eh) / 3, ew, 1.5);
      ectx.restore();
    }
  }
  grain(ctx, W, H, 16, st.seed);
  return { map: tex(c), emissiveMap: tex(ec) };
}

// ---- ground ----
// Granite promenade slabs. Returns colour + normal; 4.8 m tile.
export function pavingTextures() {
  const S = 1024, slab = 128; // 0.6 m slabs
  const [c, ctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S);
  const r = rng(77);
  hctx.fillStyle = '#b4b4b4'; hctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += slab) for (let x = 0; x < S; x += slab) {
    const band = (y / slab) % 8 === 0;
    const v = band ? 58 + r() * 10 : 96 + r() * 22;
    ctx.fillStyle = `rgb(${v + 4},${v + 2},${v})`;
    ctx.fillRect(x, y, slab, slab);
    const hv = 150 + r() * 50; hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
    hctx.fillRect(x + 3, y + 3, slab - 6, slab - 6);
  }
  ctx.fillStyle = 'rgba(18,18,20,0.75)'; hctx.fillStyle = '#404040';
  for (let i = 0; i <= S; i += slab) {
    ctx.fillRect(i - 1, 0, 3, S); ctx.fillRect(0, i - 1, S, 3);
    hctx.fillRect(i - 2, 0, 5, S); hctx.fillRect(0, i - 2, S, 5);
  }
  grain(ctx, S, S, 20, 78); grain(hctx, S, S, 26, 79);
  return { map: tex(c, { aniso: 16 }), normalMap: tex(normalFromHeight(hc, 2.2), { srgb: false, aniso: 16 }) };
}

// Small concrete pavers for sidewalks. 2.4 m tile.
export function sidewalkTextures() {
  const S = 512, bw = 64, bh = 32;
  const [c, ctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S);
  const r = rng(91);
  ctx.fillStyle = '#3c3a38'; ctx.fillRect(0, 0, S, S);
  hctx.fillStyle = '#505050'; hctx.fillRect(0, 0, S, S);
  for (let y = 0, row = 0; y < S; y += bh, row++) for (let x = -bw; x < S; x += bw) {
    const ox = x + (row % 2 ? bw / 2 : 0), v = 104 + r() * 30;
    ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    ctx.fillRect(ox + 1, y + 1, bw - 2, bh - 2);
    const hv = 150 + r() * 60; hctx.fillStyle = `rgb(${hv},${hv},${hv})`;
    hctx.fillRect(ox + 2, y + 2, bw - 4, bh - 4);
  }
  grain(ctx, S, S, 22, 92); grain(hctx, S, S, 30, 93);
  return { map: tex(c, { aniso: 16 }), normalMap: tex(normalFromHeight(hc, 2), { srgb: false, aniso: 16 }) };
}

// Asphalt: dark aggregate + patched seams. 6 m tile.
export function asphaltTextures() {
  const S = 1024;
  const [c, ctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S);
  const n = tileNoise(S, 6, 31, 5), r = rng(32);
  const img = ctx.createImageData(S, S), himg = hctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const sp = r();
    const v = 34 + n[i] * 26 + (sp > 0.93 ? 34 : sp < 0.1 ? -10 : 0);
    img.data.set([v, v + 1, v + 3, 255], i * 4);
    const hv = 120 + (sp - 0.5) * 150 + n[i] * 40;
    himg.data.set([hv, hv, hv, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0); hctx.putImageData(himg, 0, 0);
  // repair seams
  ctx.strokeStyle = 'rgba(8,8,10,0.6)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 300); ctx.bezierCurveTo(300, 280, 600, 340, S, 300); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(620, 0); ctx.bezierCurveTo(640, 300, 600, 700, 620, S); ctx.stroke();
  return { map: tex(c, { aniso: 16 }), normalMap: tex(normalFromHeight(hc, 1.6), { srgb: false, aniso: 16 }) };
}

// Wetness after rain: green channel = roughness. Low values are standing water.
// The pattern is large (tile ~ 30 m) so puddles don't visibly repeat underfoot.
export function wetnessTexture(seed, { puddle = 0.52, dry = 0.62, wet = 0.07 } = {}) {
  const S = 512, n = tileNoise(S, 5, seed, 5), fine = tileNoise(S, 48, seed + 9, 2);
  const [c, ctx] = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const t = Math.min(1, Math.max(0, (n[i] - puddle + 0.06) / 0.1));    // 0 in puddles, 1 on damp stone
    const s = t * t * (3 - 2 * t);
    const rough = wet + (dry - wet) * s * (0.75 + fine[i] * 0.5);
    const v = Math.min(255, rough * 255);
    img.data.set([v, v, v, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return tex(c, { srgb: false, aniso: 8 });
}
