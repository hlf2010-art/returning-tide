// Close-up surface detail, all procedural (canvas, no image files), each texture made once and shared:
//   woodTextures()      oiled walnut / teak: grain, pores, a little figure (map, normal, roughness), 1 m tile
//   plasterTextures()   trowelled lime plaster: soft mottling and fine relief (map, normal), 2 m tile
//   brushedTextures()   brushed metal: fine directional scratches (roughness, normal), 0.5 m tile
//   tileTextures()      glazed white wall tile with grout (map, normal, roughness): 4 x 4 tiles of 15 cm, a 0.6 m tile
//   bundDoorTexture()   a pair of panelled hardwood doors as on the Bund's banks (glazed upper lights behind a bronze
//                       grille, raised-and-fielded panels, bronze kick plates, push plates and pulls), lit shading baked in
//                       for the masonry shader, which has no normal maps
//   liftDoorTexture()   the Peace Hotel's Art Deco brass lift doors: engraved sunburst and chevrons
//   staffDoorTexture()  a painted service door: two flush panels, a kick plate, a lever, a closer's shadow
//   steelDoorTexture()  brushed stainless lift doors with a centre seam
// Texture memory (texCap.js): ~0.25-1.4 MB each with mipmaps; the whole set is under 8 MB.
import * as THREE from 'three';
import { makeCanvas, tex, rng, tileNoise, normalFromHeight, grain } from './canvas.js';

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const clamp = (v, a = 0, b = 255) => Math.max(a, Math.min(b, v));

// ---- wood: rings drawn as wavy vertical lines, pores, a soft figure, as a height for the normal too ----
function woodField(S, seed, { rings = 22, wave = 0.02 } = {}) {
  const n = tileNoise(S, 4, seed, 4), b = tileNoise(S, 2, seed + 3, 2), f = tileNoise(S, 24, seed + 5, 2), r = rng(seed + 9);
  const out = new Float32Array(S * S);
  const phase = Array.from({ length: 8 }, () => r() * 6.28);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, u = x / S, v = y / S;
    // ring position: across the board, bent by low noise; repeats seamlessly in u
    const bend = (b[i] - 0.5) * 2.4 + Math.sin(v * 6.283 * 2 + phase[0]) * wave * 6 + Math.sin(v * 6.283 * 5 + phase[1]) * wave * 2;
    const q = u * rings + bend * 0.9 + (n[i] - 0.5) * 0.5, line = Math.floor(q), t = q - line;
    const lh = ((Math.sin(((line % rings) + rings) % rings * 12.9898) * 43758.5453) % 1 + 1) % 1;   // each ring its own weight
    const ring = Math.pow(Math.abs(Math.sin((t + 1) * Math.PI)), 10 + lh * 14) * (0.35 + 0.9 * lh);
    out[i] = 0.5 * ring + 0.22 * f[i] + 0.28 * n[i];
  }
  return out;
}
function woodCanvas(S, seed, light, dark) {
  const w = woodField(S, seed), r = rng(seed + 33);
  const [c, ctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S), [rc, rctx] = makeCanvas(S, S);
  const img = ctx.createImageData(S, S), him = hctx.createImageData(S, S), rim = rctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const k = w[i], pore = r() < 0.035 ? 0.35 : 0;                          // open pores: tiny dark flecks along the grain
    const m = Math.min(1, k + pore);
    for (let ch = 0; ch < 3; ch++) img.data[i * 4 + ch] = clamp(light[ch] + (dark[ch] - light[ch]) * m);
    img.data[i * 4 + 3] = 255;
    const h = clamp(170 - k * 70 - pore * 120); him.data.set([h, h, h, 255], i * 4);
    const ro = clamp(105 + k * 60 + pore * 80); rim.data.set([ro, ro, ro, 255], i * 4);   // oiled: the grain lines a touch duller
  }
  ctx.putImageData(img, 0, 0); hctx.putImageData(him, 0, 0); rctx.putImageData(rim, 0, 0);
  return { c, hc, rc };
}
export function woodTextures(kind = 'walnut') {
  return once(`wood:${kind}`, () => {
    const tones = { walnut: [[92, 58, 36], [38, 22, 13]], teak: [[120, 78, 44], [58, 34, 18]], oak: [[170, 128, 84], [104, 72, 42]] }[kind] || [[92, 58, 36], [38, 22, 13]];
    const { c, hc, rc } = woodCanvas(512, kind.length * 31 + 7, ...tones);
    return { map: tex(c), normalMap: tex(normalFromHeight(hc, 1.6), { srgb: false }), roughnessMap: tex(rc, { srgb: false }) };
  });
}

// ---- plaster: big soft clouds of tone, a fine trowel relief ----
export function plasterTextures() {
  return once('plaster', () => {
    const S = 512, big = tileNoise(S, 3, 501, 4), mid = tileNoise(S, 14, 502, 3), fine = tileNoise(S, 64, 503, 2);
    const [c, ctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S);
    const img = ctx.createImageData(S, S), him = hctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = 236 + (big[i] - 0.5) * 22 + (mid[i] - 0.5) * 10 + (fine[i] - 0.5) * 6;
      img.data.set([clamp(v), clamp(v - 3), clamp(v - 8), 255], i * 4);
      const h = clamp(128 + (mid[i] - 0.5) * 60 + (fine[i] - 0.5) * 70); him.data.set([h, h, h, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0); hctx.putImageData(him, 0, 0);
    return { map: tex(c), normalMap: tex(normalFromHeight(hc, 0.9), { srgb: false }) };
  });
}

// ---- brushed metal: long fine strokes along u ----
export function brushedTextures() {
  return once('brushed', () => {
    const S = 256, r = rng(611);
    const [rc, rctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S);
    rctx.fillStyle = '#5a5a5a'; rctx.fillRect(0, 0, S, S); hctx.fillStyle = '#808080'; hctx.fillRect(0, 0, S, S);
    for (let k = 0; k < 2200; k++) {
      const y = r() * S, x = r() * S, len = 20 + r() * 160, a = 0.05 + r() * 0.12, v = r() > 0.5 ? 255 : 0;
      for (const [cx, col] of [[rctx, `rgba(${v},${v},${v},${a})`], [hctx, `rgba(${v},${v},${v},${a * 1.4})`]]) {
        cx.fillStyle = col; cx.fillRect(x, y, len, 1); if (x + len > S) cx.fillRect(x - S, y, len, 1);
      }
    }
    return { roughnessMap: tex(rc, { srgb: false }), normalMap: tex(normalFromHeight(hc, 0.6), { srgb: false }) };
  });
}

// ---- glazed wall tile: 15 cm squares, 2 mm grout, each tile a hair different ----
export function tileTextures() {
  return once('tile', () => {
    const S = 512, n = 4, t = S / n, r = rng(707);
    const [c, ctx] = makeCanvas(S, S), [hc, hctx] = makeCanvas(S, S), [rc, rctx] = makeCanvas(S, S);
    ctx.fillStyle = '#b9b6ae'; ctx.fillRect(0, 0, S, S); hctx.fillStyle = '#303030'; hctx.fillRect(0, 0, S, S); rctx.fillStyle = '#d0d0d0'; rctx.fillRect(0, 0, S, S);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 238 + r() * 10, g = 5;
      const gr = ctx.createLinearGradient(x * t, y * t, x * t + t, y * t + t);
      gr.addColorStop(0, `rgb(${v + 4},${v + 4},${v + 2})`); gr.addColorStop(1, `rgb(${v - 6},${v - 6},${v - 9})`);
      ctx.fillStyle = gr; ctx.fillRect(x * t + g, y * t + g, t - 2 * g, t - 2 * g);
      // a pillowed edge: the glaze rounds over into the grout
      const hg = hctx.createRadialGradient(x * t + t / 2, y * t + t / 2, t * 0.3, x * t + t / 2, y * t + t / 2, t * 0.72);
      hg.addColorStop(0, '#e0e0e0'); hg.addColorStop(1, '#a0a0a0'); hctx.fillStyle = hg; hctx.fillRect(x * t + g, y * t + g, t - 2 * g, t - 2 * g);
      rctx.fillStyle = '#262626'; rctx.fillRect(x * t + g, y * t + g, t - 2 * g, t - 2 * g);
    }
    grain(ctx, S, S, 5, 708);
    return { map: tex(c), normalMap: tex(normalFromHeight(hc, 2.5), { srgb: false }), roughnessMap: tex(rc, { srgb: false }) };
  });
}

// ---- drawing helpers for the doors ----
// a raised-and-fielded panel: the flat field, the bevels round it lit from above-left (the sun, floodlights)
function fieldedPanel(ctx, x, y, w, h, b, base) {
  const [R, G, B] = base, s = (k) => `rgb(${clamp(R * k)},${clamp(G * k)},${clamp(B * k)})`;
  ctx.fillStyle = s(0.72); ctx.fillRect(x, y, w, h);                                            // the sunk margin
  ctx.fillStyle = s(1.25); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - b, y + b); ctx.lineTo(x + b, y + b); ctx.closePath(); ctx.fill();   // top bevel, lit
  ctx.fillStyle = s(1.08); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + b, y + b); ctx.lineTo(x + b, y + h - b); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();         // left bevel
  ctx.fillStyle = s(0.55); ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + b, y + h - b); ctx.lineTo(x + w - b, y + h - b); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();   // bottom, in shade
  ctx.fillStyle = s(0.68); ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - b, y + h - b); ctx.lineTo(x + w - b, y + b); ctx.closePath(); ctx.fill();   // right
  ctx.fillStyle = s(1.0); ctx.fillRect(x + b, y + b, w - 2 * b, h - 2 * b);                     // the field
  ctx.strokeStyle = s(0.5); ctx.lineWidth = 1.5; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);      // the bolection's shadow line
  ctx.strokeStyle = s(1.35); ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, y - 3.5, w + 7, h + 7);   // its lit edge
}
// cast bronze: a vertical sheen, darker edges
function bronze(ctx, x, y, w, h, { horiz = false } = {}) {
  const g = horiz ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#3b2a14'); g.addColorStop(0.3, '#a07a3c'); g.addColorStop(0.5, '#d6ad62'); g.addColorStop(0.7, '#8a6630'); g.addColorStop(1, '#2e200f');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
// overlay the wood grain (multiply) on what's been drawn, clipped to a rectangle, grain running one way
function grainOver(ctx, wood, x, y, w, h, horiz = false, alpha = 0.55) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = alpha;
  if (horiz) { ctx.translate(x, y + h); ctx.rotate(-Math.PI / 2); ctx.drawImage(wood, 0, 0, h + 2, Math.max(w, 512)); }
  else ctx.drawImage(wood, x, y, Math.max(w, 256), Math.max(h, 512));
  ctx.restore();
}

// The Bund's closed doors: two leaves, read from the street at 1-10 m. 512 x 1024 for ~2.1 x 4.5 m.
export function bundDoorTexture() {
  return once('bundDoor', () => {
    const W = 512, H = 1024, [c, ctx] = makeCanvas(W, H);
    const { c: woodC } = woodCanvas(512, 913, [230, 214, 196], [120, 96, 78]);   // a pale grain field, multiplied over the stain
    const stain = [86, 52, 30];
    ctx.fillStyle = `rgb(${stain})`; ctx.fillRect(0, 0, W, H);
    const leafW = W / 2, st = 30, top = 34, bot = 120, mid = 26;
    for (let L = 0; L < 2; L++) {
      const x0 = L * leafW;
      // stiles and rails (frame), grain along their length
      grainOver(ctx, woodC, x0, 0, st, H); grainOver(ctx, woodC, x0 + leafW - st, 0, st, H);
      grainOver(ctx, woodC, x0, 0, leafW, top, true); grainOver(ctx, woodC, x0, H - bot, leafW, bot, true);
      const ix = x0 + st, iw = leafW - 2 * st;
      // the glazed upper light: dark glass behind a bronze lattice
      const gy = top, gh = 360;
      const glass = ctx.createLinearGradient(0, gy, 0, gy + gh); glass.addColorStop(0, '#2c3846'); glass.addColorStop(0.35, '#11161d'); glass.addColorStop(1, '#07090c');
      ctx.fillStyle = glass; ctx.fillRect(ix, gy, iw, gh);
      ctx.fillStyle = 'rgba(160,190,215,0.12)'; ctx.beginPath(); ctx.moveTo(ix, gy + 40); ctx.lineTo(ix + iw * 0.7, gy); ctx.lineTo(ix + iw, gy); ctx.lineTo(ix, gy + gh * 0.75); ctx.closePath(); ctx.fill();   // a sky streak on the glass
      ctx.save(); ctx.beginPath(); ctx.rect(ix, gy, iw, gh); ctx.clip();
      ctx.lineWidth = 6; ctx.strokeStyle = '#2a1d0e';
      const step = iw / 3;
      for (let k = -4; k < 12; k++) { ctx.beginPath(); ctx.moveTo(ix + k * step, gy); ctx.lineTo(ix + k * step + gh * 0.5, gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ix + k * step, gy); ctx.lineTo(ix + k * step - gh * 0.5, gy + gh); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.strokeStyle = '#b48a46';
      for (let k = -4; k < 12; k++) { ctx.beginPath(); ctx.moveTo(ix + k * step - 1, gy); ctx.lineTo(ix + k * step + gh * 0.5 - 1, gy + gh); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ix + k * step - 1, gy); ctx.lineTo(ix + k * step - gh * 0.5 - 1, gy + gh); ctx.stroke(); }
      // rosettes where the bars cross
      for (let k = -4; k < 12; k++) for (let j = 0; j < 8; j++) { const cx = ix + k * step + (j % 2) * step / 2, cy = gy + j * gh / 7.2; if (cx < ix || cx > ix + iw) continue; ctx.fillStyle = '#c99d52'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#3a2810'; ctx.beginPath(); ctx.arc(cx + 1, cy + 1, 1.5, 0, 7); ctx.fill(); }
      ctx.restore();
      // the glazing bead round it
      ctx.strokeStyle = '#2a190c'; ctx.lineWidth = 4; ctx.strokeRect(ix + 2, gy + 2, iw - 4, gh - 4);
      ctx.strokeStyle = 'rgba(255,225,180,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(ix - 2, gy - 2, iw + 4, gh + 4);
      // the lock rail, then two fielded panels below it
      const ry = gy + gh; grainOver(ctx, woodC, x0, ry, leafW, mid + 64, true);
      const p1 = ry + mid + 64, p1h = 210, p2 = p1 + p1h + mid, p2h = H - bot - mid - p2;
      fieldedPanel(ctx, ix + 8, p1, iw - 16, p1h, 18, stain); grainOver(ctx, woodC, ix + 8, p1, iw - 16, p1h, false, 0.5);
      fieldedPanel(ctx, ix + 8, p2, iw - 16, p2h, 18, stain); grainOver(ctx, woodC, ix + 8, p2, iw - 16, p2h, false, 0.5);
      // the frame's mouldings: a lit arris on each stile's inner edge, a shadow on the outer
      ctx.fillStyle = 'rgba(255,220,170,0.18)'; ctx.fillRect(x0 + st - 3, 0, 2, H); ctx.fillRect(x0 + leafW - st + 1, 0, 2, H);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0, 0, 3, H); ctx.fillRect(x0 + leafW - 3, 0, 3, H);
      // bronze kick plate, its screws
      const ky = H - 92; bronze(ctx, x0 + 10, ky, leafW - 20, 80, { horiz: true });
      ctx.fillStyle = '#2a1c0c'; for (const sx of [x0 + 18, x0 + leafW - 22]) for (const sy of [ky + 8, ky + 70]) { ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, 7); ctx.fill(); }
      // push plate and pull at the meeting stile, at hand height (~1.05 m of 4.5 m)
      const mx = L === 0 ? x0 + leafW - st - 18 : x0 + st + 2, hy = H - Math.round(H * 1.05 / 4.5);
      bronze(ctx, mx, hy - 150, 16, 120); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(mx + 16, hy - 146, 4, 120);   // the pull, its shadow
      bronze(ctx, mx - 4, hy - 160, 24, 10, { horiz: true }); bronze(ctx, mx - 4, hy - 34, 24, 10, { horiz: true });
      // the escutcheon and keyhole below the pull
      ctx.fillStyle = '#b38a48'; ctx.beginPath(); ctx.ellipse(mx + 8, hy + 10, 8, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#120c06'; ctx.beginPath(); ctx.arc(mx + 8, hy + 6, 2.5, 0, 7); ctx.fill(); ctx.fillRect(mx + 7, hy + 6, 2, 9);
      // wear: hands darken the stile round the pull; the foot of the door is dustier
      const wg = ctx.createRadialGradient(mx + 8, hy - 80, 4, mx + 8, hy - 80, 110); wg.addColorStop(0, 'rgba(20,10,4,0.25)'); wg.addColorStop(1, 'rgba(20,10,4,0)');
      ctx.fillStyle = wg; ctx.fillRect(x0, hy - 220, leafW, 300);
    }
    // the meeting stiles' astragal: a bronze strip down the middle
    bronze(ctx, W / 2 - 5, 0, 10, H);
    // dust settling along the bottom, and a little damp creeping up the kick plates
    const dg = ctx.createLinearGradient(0, H - 30, 0, H); dg.addColorStop(0, 'rgba(120,110,95,0)'); dg.addColorStop(1, 'rgba(120,110,95,0.35)'); ctx.fillStyle = dg; ctx.fillRect(0, H - 30, W, 30);
    grain(ctx, W, H, 7, 914);
    const t = tex(c, { repeat: false, aniso: 8 });
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  });
}

// The Peace Hotel's lift doors: brass, engraved with an Art Deco sunburst over chevrons. 512 x 1024 (1.4 x 2.6 m).
export function liftDoorTexture() {
  return once('liftDoor', () => {
    const W = 512, H = 1024, [c, ctx] = makeCanvas(W, H);
    const base = ctx.createLinearGradient(0, 0, W, 0);
    base.addColorStop(0, '#7a5a24'); base.addColorStop(0.25, '#c9a057'); base.addColorStop(0.5, '#e3c27c'); base.addColorStop(0.75, '#b88f45'); base.addColorStop(1, '#6e5020');
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    const engrave = (draw) => { ctx.save(); ctx.strokeStyle = 'rgba(40,24,6,0.85)'; ctx.lineWidth = 3; draw(); ctx.restore(); ctx.save(); ctx.translate(1.5, 1.5); ctx.strokeStyle = 'rgba(255,236,190,0.55)'; ctx.lineWidth = 1.5; draw(); ctx.restore(); };
    for (const L of [0, 1]) {
      const x0 = L * W / 2, cx = x0 + W / 4;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 + 34, 34, W / 2 - 68, H - 68); ctx.clip();
      engrave(() => { ctx.strokeRect(x0 + 22, 22, W / 2 - 44, H - 44); ctx.strokeRect(x0 + 34, 34, W / 2 - 68, H - 68); });
      // the sunburst: a half-disc of rays rising from a lintel band
      const sy = 360;
      engrave(() => {
        ctx.beginPath(); ctx.moveTo(x0 + 34, sy); ctx.lineTo(x0 + W / 2 - 34, sy); ctx.stroke();
        for (let k = 0; k <= 12; k++) { const a = Math.PI + (k / 12) * Math.PI; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 26, sy + Math.sin(a) * 26); ctx.lineTo(cx + Math.cos(a) * 190, sy + Math.sin(a) * 190); ctx.stroke(); }
        for (const r of [26, 60, 110]) { ctx.beginPath(); ctx.arc(cx, sy, r, Math.PI, 0); ctx.stroke(); }
      });
      // stepped chevrons down the lower door
      engrave(() => { for (let k = 0; k < 7; k++) { const y = 470 + k * 64; ctx.beginPath(); ctx.moveTo(x0 + 48, y + 40); ctx.lineTo(cx, y); ctx.lineTo(x0 + W / 2 - 48, y + 40); ctx.stroke(); } });
      engrave(() => { ctx.beginPath(); ctx.moveTo(cx, 400); ctx.lineTo(cx, 940); ctx.stroke(); });
      ctx.restore();
      engrave(() => { ctx.strokeRect(x0 + 22, 22, W / 2 - 44, H - 44); ctx.strokeRect(x0 + 34, 34, W / 2 - 68, H - 68); });
    }
    // the meeting edges: a dark seam with lit lips
    ctx.fillStyle = '#20150a'; ctx.fillRect(W / 2 - 2, 0, 4, H); ctx.fillStyle = 'rgba(255,230,170,0.6)'; ctx.fillRect(W / 2 + 2, 0, 1.5, H); ctx.fillRect(W / 2 - 4, 0, 1.5, H);
    // fingermarks round hand height, a fine polish haze
    for (const fx of [W / 2 - 60, W / 2 + 40]) { const g = ctx.createRadialGradient(fx, 600, 2, fx, 600, 70); g.addColorStop(0, 'rgba(90,60,20,0.18)'); g.addColorStop(1, 'rgba(90,60,20,0)'); ctx.fillStyle = g; ctx.fillRect(fx - 80, 520, 160, 160); }
    grain(ctx, W, H, 6, 915);
    const t = tex(c, { repeat: false }); return t;
  });
}

// A painted service door (0.9-1.3 x 2.3 m): flush panels, a stainless kick plate and lever, scuffs. 256 x 512.
export function staffDoorTexture(paint = [62, 66, 70]) {
  return once(`staffDoor:${paint}`, () => {
    const W = 256, H = 512, [c, ctx] = makeCanvas(W, H), [R, G, B] = paint;
    ctx.fillStyle = `rgb(${R},${G},${B})`; ctx.fillRect(0, 0, W, H);
    const n = tileNoise(128, 6, 717, 3), img = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (n[((y >> 2) % 128) * 128 + ((x >> 1) % 128)] - 0.5) * 10, i = (y * W + x) * 4; img.data[i] += k; img.data[i + 1] += k; img.data[i + 2] += k; }
    ctx.putImageData(img, 0, 0);
    // two shallow recessed panels
    for (const [y, h] of [[34, 200], [262, 170]]) { ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(28, y, W - 56, h); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.strokeRect(30, y + 2, W - 56, h); }
    // kick plate
    const kg = ctx.createLinearGradient(0, H - 60, 0, H - 8); kg.addColorStop(0, '#c5c8cb'); kg.addColorStop(1, '#7c8084'); ctx.fillStyle = kg; ctx.fillRect(10, H - 60, W - 20, 50);
    for (let k = 0; k < 30; k++) { ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.08})`; ctx.fillRect(12 + Math.random() * (W - 40), H - 58 + Math.random() * 46, 6 + Math.random() * 30, 1); }
    // lever and rose at 1.05 m
    const hy = H - Math.round(H * 1.05 / 2.3);
    ctx.fillStyle = '#9ea2a6'; ctx.beginPath(); ctx.arc(W - 36, hy, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#d7dadd'; ctx.fillRect(W - 92, hy - 5, 58, 10); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W - 92, hy + 5, 58, 4);
    ctx.fillStyle = '#2a2d30'; ctx.fillRect(W - 40, hy + 26, 8, 14);                 // the lock cylinder
    // the door closer's arm at the head, scuffs where trolleys meet it
    ctx.fillStyle = '#b6b9bc'; ctx.fillRect(40, 6, 120, 14); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(40, 20, 120, 4);
    for (let k = 0; k < 14; k++) { ctx.strokeStyle = `rgba(20,20,20,${0.08 + Math.random() * 0.1})`; ctx.lineWidth = 1 + Math.random() * 2; const y = H - 90 - Math.random() * 120, x = 20 + Math.random() * 180; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 + Math.random() * 30, y + (Math.random() - 0.5) * 6); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, 3, H); ctx.fillRect(W - 3, 0, 3, H);
    return tex(c, { repeat: false });
  });
}

// Brushed stainless lift doors (1.4 x 2.7 m): grain across, a centre seam, a call-floor plate. 256 x 512.
export function steelDoorTexture() {
  return once('steelDoor', () => {
    const W = 256, H = 512, [c, ctx] = makeCanvas(W, H), r = rng(719);
    const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#8d9297'); g.addColorStop(0.5, '#c4c8cc'); g.addColorStop(1, '#8a8f94');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 2400; k++) { const v = r() > 0.5 ? 255 : 0; ctx.fillStyle = `rgba(${v},${v},${v},${0.03 + r() * 0.06})`; ctx.fillRect(r() * W, r() * H, 1, 8 + r() * 60); }
    ctx.fillStyle = '#2b2e31'; ctx.fillRect(W / 2 - 1.5, 0, 3, H); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(W / 2 + 1.5, 0, 1, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, H - 6, W, 6);
    return tex(c, { repeat: false });
  });
}
