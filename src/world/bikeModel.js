// A shared bike (共享单车), modelled after the city's dockless bikes rather than any one operator's: a step-through
// aluminium frame with one big curved down tube, 24-inch solid (airless) tyres on spoked alloy rims with drum-brake hubs,
// a plastic front basket with a grid of holes and the operator's name on its front, a front lamp under it, swept-back
// city bars with grips, brake levers and a bell, a smart panel on the bars with the QR code facing you, a padded saddle
// on a quick-release post, the smart lock over the rear wheel with a solar panel on top and a second QR code behind,
// an enclosed chain case, mudguards, reflectors and a side stand. In the operator's colours (world/sharedBikes.js).
//
//   buildBike(op, { lod, stand, wheels, crank }) -> BufferGeometry with groups, for BIKE_MATERIALS()
//   wheelGeo(rear, lod), crankGeo() -> the parts that turn, for the one you ride
// The bike's frame: +z forward, +y up, the ground at y = 0 under its middle; the rider's left is +x.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const R = 0.31;                                   // 24-inch wheels
export const REAR = V(0, R, -0.52), FRONT = V(0, R, 0.55), BB = V(0, 0.27, -0.06);
const SLOT = { paint: 0, metal: 1, rubber: 2, plastic: 3, basket: 4, decal: 5 };
const SILVER = 0xc4c8cc, ALLOY = 0xa9aeb3, DARKMETAL = 0x4a4d52, RUBBER = 0x131315, PLASTIC = 0x26282b, SADDLE = 0x1b1b1d;

// ---- the textures: the basket's grid of holes, and one atlas for the decals (names, QR codes, the solar panel) ----
let TEX = null;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rrect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const AW = 2048, AH = 1024;
// atlas regions (pixels): per operator i, a wordmark (white on clear) and a QR sticker; one solar panel; a lamp lens
const RECT = {
  word: (i) => [0, i * 84, 512, 84],
  qr: (i) => [i * 330, 300, 320, 410],
  panel: (i) => [1024, i * 330, 560, 320],
  solar: [1600, 0, 168, 168],
  lens: [1600, 200, 64, 64],
};
function textures(ops) {
  if (TEX) return TEX;
  if (typeof document === 'undefined') return (TEX = { grid: null, atlas: null });
  // the grid: one hole per tile (rounded), the plastic around it
  const [gc, g] = canvas(64, 64);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.globalCompositeOperation = 'destination-out'; rrect(g, 11, 9, 42, 46, 9); g.fill();
  const grid = new THREE.CanvasTexture(gc); grid.wrapS = grid.wrapT = THREE.RepeatWrapping; grid.anisotropy = 4; grid.colorSpace = THREE.SRGBColorSpace;
  const [ac, x] = canvas(AW, AH);
  x.clearRect(0, 0, AW, AH);
  ops.forEach((o, i) => {
    const hex = '#' + o.color.toString(16).padStart(6, '0');
    // the wordmark: the name in white, bold, with the latin under it
    { const [X, Y, W, H] = RECT.word(i); x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'center';
      x.font = `900 ${H * 0.62}px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif`; x.fillText(o.zh, X + W * 0.33, Y + H * 0.52);
      x.font = `800 italic ${H * 0.42}px "Helvetica Neue",Arial,sans-serif`; x.fillText(o.en.toUpperCase(), X + W * 0.72, Y + H * 0.55); }
    // the QR sticker: a band in the operator's colour with its name, the code, the bike's number
    { const [X, Y, W, H] = RECT.qr(i); x.fillStyle = '#fbfbf8'; rrect(x, X + 2, Y + 2, W - 4, H - 4, 16); x.fill();
      x.fillStyle = hex; x.fillRect(X + 2, Y + 2, W - 4, 62); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `800 36px "PingFang SC","Noto Sans SC",sans-serif`; x.fillText(`${o.zh}单车 · 扫码用车`, X + W / 2, Y + 34);
      drawQR(x, X + 22, Y + 74, W - 44, 91 + i * 13);
      x.fillStyle = '#222'; x.font = '700 26px "Helvetica Neue",Arial,sans-serif'; x.fillText(`NO. ${2100 + i * 377} ${3800 + i * 911} ${i + 4}`, X + W / 2, Y + H - 30); }
    // the bar panel's face: the code on a white card at the left (about 6.5 cm across, facing you), the name, 扫码用车,
    // the bike's number, a battery gauge; a strip of the operator's colour along the bottom
    { const [X, Y, W, H] = RECT.panel(i); x.fillStyle = '#17191c'; rrect(x, X, Y, W, H, 26); x.fill(); x.fillStyle = hex; rrect(x, X + 10, Y + H - 22, W - 20, 12, 6); x.fill();
      x.fillStyle = '#fff'; rrect(x, X + 16, Y + 14, 270, 270, 14); x.fill(); drawQR(x, X + 24, Y + 22, 254, 7 + i * 31);
      x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.font = `900 66px "PingFang SC","Noto Sans SC",sans-serif`; x.fillText(o.zh, X + 306, Y + 66);
      x.fillStyle = '#c8ccd0'; x.font = `700 34px "PingFang SC","Noto Sans SC",sans-serif`; x.fillText('扫码用车', X + 306, Y + 136);
      x.fillStyle = '#9aa0a6'; x.font = '700 26px "Helvetica Neue",Arial,sans-serif'; x.fillText(`No.${2100 + i * 377}${3800 + i * 911}`, X + 306, Y + 190);
      x.strokeStyle = '#8fd18f'; x.lineWidth = 4; x.strokeRect(X + 306, Y + 222, 92, 34); x.fillStyle = '#8fd18f'; x.fillRect(X + 400, Y + 232, 7, 14); x.fillRect(X + 312, Y + 228, 60, 22); }
  });
  // the solar panel: dark blue cells in a silver grid
  { const [X, Y, W, H] = RECT.solar; x.fillStyle = '#c9ccd0'; x.fillRect(X, Y, W, H); const n = 6, c = (W - 8) / n;
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const gr = x.createLinearGradient(X + 4 + a * c, Y + 4 + b * c, X + 4 + (a + 1) * c, Y + 4 + (b + 1) * c); gr.addColorStop(0, '#1d2f5c'); gr.addColorStop(1, '#0d1631'); x.fillStyle = gr; x.fillRect(X + 5 + a * c, Y + 5 + b * c, c - 2, c - 2); } }
  // the lamp's lens: a bright disc
  { const [X, Y, W] = RECT.lens; const gr = x.createRadialGradient(X + W / 2, Y + W / 2, 2, X + W / 2, Y + W / 2, W / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e8eef2'); gr.addColorStop(1, '#9aa3aa'); x.fillStyle = gr; x.beginPath(); x.arc(X + W / 2, Y + W / 2, W / 2 - 1, 0, Math.PI * 2); x.fill(); }
  const atlas = new THREE.CanvasTexture(ac); atlas.anisotropy = 16; atlas.colorSpace = THREE.SRGBColorSpace;
  return (TEX = { grid, atlas });
}
// a QR code that reads as one: 25 x 25 modules in a quiet zone, the three finder squares, the timing rows, the alignment
// square, data at random (seeded: each bike's own)
function drawQR(x, ox, oy, size, seed) {
  const N = 25, q = size / (N + 2), r = rng(seed), on = (a, b) => x.fillRect(ox + (a + 1) * q, oy + (b + 1) * q, q + 0.6, q + 0.6);
  x.fillStyle = '#fff'; x.fillRect(ox, oy, size, size); x.fillStyle = '#0c0c0e';
  const reserved = (a, b) => (a < 9 && b < 9) || (a > N - 9 && b < 9) || (a < 9 && b > N - 9) || a === 6 || b === 6 || (a >= 16 && a <= 20 && b >= 16 && b <= 20);
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) if (!reserved(a, b) && r() < 0.48) on(a, b);
  const finder = (fa, fb) => { for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) { const ring = a === 0 || a === 6 || b === 0 || b === 6, core = a >= 2 && a <= 4 && b >= 2 && b <= 4; if (ring || core) on(fa + a, fb + b); } };
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  for (let k = 8; k < N - 8; k += 2) { on(k, 6); on(6, k); }                                   // timing
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a === 0 || a === 4 || b === 0 || b === 4 || (a === 2 && b === 2)) on(16 + a, 16 + b);   // alignment
  for (let k = 0; k < 9; k++) { if (k !== 6 && r() < 0.5) on(k, 8); if (k !== 6 && r() < 0.5) on(8, k); }   // format bits
}
let MATS = null;
// paint, metal, rubber, plastic, basket (the holes), decals: one set for every bike
export function BIKE_MATERIALS(ops) {
  if (MATS) return MATS;
  const t = textures(ops);
  MATS = [
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.18, name: 'bike-paint' }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85, name: 'bike-metal' }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, name: 'bike-rubber' }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02, name: 'bike-plastic' }),
    new THREE.MeshStandardMaterial({ vertexColors: true, map: t.grid, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0, name: 'bike-basket' }),
    new THREE.MeshStandardMaterial({ vertexColors: true, map: t.atlas, alphaTest: 0.45, roughness: 0.45, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'bike-decal' }),
  ];
  return MATS;
}

// ---- geometry helpers ----
function prep(geo, color) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const c = new THREE.Color(color), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  g.morphAttributes = {};
  return g;
}
function parts() {
  const b = [[], [], [], [], [], []];
  return {
    add(slot, geo, color = 0xffffff) { b[slot].push(prep(geo, color)); },
    build() {
      const geos = [], idx = [];
      b.forEach((list, i) => { if (list.length) { geos.push(mergeGeometries(list)); idx.push(i); } });
      const g = mergeGeometries(geos, true); g.groups.forEach((gr, k) => { gr.materialIndex = idx[k]; });
      return g;
    },
  };
}
// a closed profile [[sx, wy]...] (counter-clockwise) swept along points; sx runs along `up` (projected square to the path)
function sweep(pts, profile, { up = V(1, 0, 0), caps = true } = {}) {
  const n = pts.length, m = profile.length, pos = [], idx = [], T = new THREE.Vector3(), S = new THREE.Vector3(), W = new THREE.Vector3(), frames = [];
  for (let i = 0; i < n; i++) {
    T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    S.copy(up).addScaledVector(T, -up.dot(T)); if (S.lengthSq() < 1e-8) S.set(0, 1, 0).addScaledVector(T, -T.y); S.normalize();
    W.crossVectors(T, S);
    frames.push([T.clone(), S.clone(), W.clone()]);
    for (const [px, py] of profile) { const p = pts[i]; pos.push(p.x + S.x * px + W.x * py, p.y + S.y * px + W.y * py, p.z + S.z * px + W.z * py); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) { const a = i * m + j, b = i * m + ((j + 1) % m), c = (i + 1) * m + ((j + 1) % m), d = (i + 1) * m + j; idx.push(a, b, c, a, c, d); }
  const side = new THREE.BufferGeometry(); side.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); side.setIndex(idx); side.computeVertexNormals();
  const out = [side.toNonIndexed()];
  if (caps) for (const [i, sgn] of [[0, -1], [n - 1, 1]]) {
    const cp = [], [Tt] = frames[i], ring = []; for (let j = 0; j < m; j++) ring.push(V(pos[(i * m + j) * 3], pos[(i * m + j) * 3 + 1], pos[(i * m + j) * 3 + 2]));
    const c = ring.reduce((s, v) => s.add(v), V(0, 0, 0)).multiplyScalar(1 / m);
    for (let j = 0; j < m; j++) { const a = ring[j], b = ring[(j + 1) % m]; if (sgn > 0) cp.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z); else cp.push(c.x, c.y, c.z, b.x, b.y, b.z, a.x, a.y, a.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
    const nn = new Float32Array(cp.length); for (let k = 0; k < cp.length; k += 3) { nn[k] = Tt.x * sgn; nn[k + 1] = Tt.y * sgn; nn[k + 2] = Tt.z * sgn; } g.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
    out.push(g);
  }
  return mergeGeometries(out);
}
const circ = (r, n = 10, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [Math.cos(a) * r * sx, Math.sin(a) * r * sy]; });
const bez = (a, b, c, d, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return V(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t); });
const line = (a, b, n = 1) => Array.from({ length: n + 1 }, (_, i) => a.clone().lerp(b, i / n));
const tube = (a, b, r, seg = 10, up) => sweep(line(a, b), circ(r, seg), { up: up || (Math.abs(b.x - a.x) > Math.abs(b.y - a.y) + Math.abs(b.z - a.z) ? V(0, 1, 0) : V(1, 0, 0)) });
const arc = (c, r, a0, a1, n, x = 0) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * (i / n); return V(c.x + x, c.y + Math.sin(a) * r, c.z + Math.cos(a) * r); });
// a flat card (w x h) facing +z, its uv a region of the atlas
function decal(w, h, [X, Y, W, H]) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (X + uv.getX(i) * W) / AW, 1 - (Y + (1 - uv.getY(i)) * H) / AH);
  return g;
}
function quad(a, b, c, d, uvScale) {   // a quad a-b-c-d (counter-clockwise from the front), uv in metres / uvScale
  const g = new THREE.BufferGeometry(); const p = [a, b, c, a, c, d];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flatMap((v) => [v.x, v.y, v.z]), 3));
  const ux = b.clone().sub(a), w = ux.length(); ux.normalize(); const uy = d.clone().sub(a).addScaledVector(ux, -d.clone().sub(a).dot(ux)), hh = uy.length(); uy.normalize();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(p.flatMap((v) => { const q = v.clone().sub(a); return [q.dot(ux) / uvScale, q.dot(uy) / uvScale]; }), 2));
  g.computeVertexNormals(); void w; void hh;
  return g;
}

// ---- the wheels: solid tyre, alloy rim, 24 spokes, hub flanges; a drum brake on the hub's side ----
export function wheelGeo(rear, lod = false) {
  const P = parts();
  const tyre = new THREE.TorusGeometry(R - 0.027, 0.027, lod ? 6 : 12, lod ? 24 : 44); tyre.scale(1, 1, 1.08); tyre.rotateY(Math.PI / 2); P.add(SLOT.rubber, tyre, RUBBER);
  const rim = new THREE.TorusGeometry(R - 0.06, 0.012, 6, lod ? 24 : 44); rim.scale(1, 1, 1.5); rim.rotateY(Math.PI / 2); P.add(SLOT.metal, rim, ALLOY);
  const hub = new THREE.CylinderGeometry(0.022, 0.022, 0.1, 12); hub.rotateZ(Math.PI / 2); P.add(SLOT.metal, hub, SILVER);
  for (const s of [-1, 1]) { const f = new THREE.CylinderGeometry(0.036, 0.036, 0.005, 16); f.rotateZ(Math.PI / 2); f.translate(s * 0.032, 0, 0); P.add(SLOT.metal, f, SILVER); }
  const drum = new THREE.CylinderGeometry(rear ? 0.06 : 0.042, rear ? 0.06 : 0.042, rear ? 0.018 : 0.008, 20); drum.rotateZ(Math.PI / 2); drum.translate(rear ? -0.045 : 0.04, 0, 0); P.add(SLOT.plastic, drum, DARKMETAL);
  const arm = new THREE.BoxGeometry(0.008, 0.022, 0.1); arm.translate(rear ? -0.056 : 0.045, 0, 0.05); P.add(SLOT.metal, arm, DARKMETAL);   // the brake's reaction arm
  if (!lod) for (let k = 0; k < 24; k++) {
    const s = k % 2 ? 1 : -1, ah = (k / 24) * Math.PI * 2, ar = ah + (k % 4 < 2 ? 0.42 : -0.42);
    P.add(SLOT.metal, sweep([V(s * 0.032, Math.sin(ah) * 0.033, Math.cos(ah) * 0.033), V(s * 0.004, Math.sin(ar) * (R - 0.066), Math.cos(ar) * (R - 0.066))], circ(0.0019, 4), { caps: false }), SILVER);
  }
  if (!lod) for (const a of [0.4, 0.4 + Math.PI]) { const r = new THREE.BoxGeometry(0.006, 0.05, 0.016); r.translate(0, R * 0.55, 0); r.rotateX(a); P.add(SLOT.plastic, r, 0xf0a020); }   // the spoke reflectors
  return P.build();
}
// the cranks and pedals, round the bottom bracket (origin); the right one down
export function crankGeo() {
  const P = parts();
  for (const s of [-1, 1]) {
    const x = s < 0 ? -0.112 : 0.085, ye = s * 0.165;
    P.add(SLOT.metal, tube(V(x, 0, 0), V(x, ye, 0), 0.011, 8, V(1, 0, 0)), SILVER);
    const ped = new THREE.BoxGeometry(0.095, 0.022, 0.065); ped.translate(x + s * 0.06, ye, 0); P.add(SLOT.plastic, ped, 0x1c1c1e);
    for (const z of [-0.034, 0.034]) { const r = new THREE.BoxGeometry(0.05, 0.012, 0.004); r.translate(x + s * 0.06, ye, z); P.add(SLOT.plastic, r, 0xf0a020); }
    const spindle = new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6); spindle.rotateZ(Math.PI / 2); spindle.translate(x + s * 0.025, ye, 0); P.add(SLOT.metal, spindle, SILVER);
  }
  const ax = new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8); ax.rotateZ(Math.PI / 2); ax.translate(-0.012, 0, 0); P.add(SLOT.metal, ax, SILVER);
  return P.build();
}

// ---- the bike ----
// op: { color, basket, guard, accent }; lod: fewer segments, no small parts; stand: 'down' (parked) or 'up';
// wheels / crank: merge them in (a parked bike) or leave them to turn (the one you ride)
export function buildBike(op, ops, { lod = false, stand = 'down', wheels = true, crank = true } = {}) {
  textures(ops);
  const P = parts(), i = ops.indexOf(op), paint = op.color, seg = lod ? 6 : 12, nseg = lod ? 6 : 16;
  // the frame: one big curved down tube from the head tube sweeping low to the bottom bracket (step-through), the seat
  // tube up from it, chain stays and seat stays to the rear axle
  const down = bez(V(0, 0.84, 0.372), V(0, 0.54, 0.335), V(0, 0.3, 0.16), V(0, 0.285, -0.03), nseg);
  P.add(SLOT.paint, sweep(down, circ(1, seg, 0.027, 0.037)), paint);
  P.add(SLOT.paint, sweep(line(V(0, 0.25, -0.065), V(0, 0.845, -0.262), 4), circ(0.025, seg)), paint);
  const bbS = new THREE.CylinderGeometry(0.032, 0.032, 0.088, seg); bbS.rotateZ(Math.PI / 2); bbS.translate(BB.x, BB.y, BB.z); P.add(SLOT.paint, bbS, paint);
  P.add(SLOT.paint, sweep(line(V(0, 0.715, 0.418), V(0, 0.93, 0.35), 2), circ(0.028, seg)), paint);                                           // head tube
  for (const s of [-1, 1]) {
    P.add(SLOT.paint, sweep(bez(V(s * 0.03, 0.27, -0.09), V(s * 0.06, 0.28, -0.25), V(s * 0.062, 0.3, -0.42), V(s * 0.062, R, -0.515), lod ? 3 : 8), circ(0.012, lod ? 5 : 8)), paint);   // chain stays
    P.add(SLOT.paint, sweep(bez(V(s * 0.022, 0.77, -0.24), V(s * 0.045, 0.62, -0.33), V(s * 0.06, 0.45, -0.45), V(s * 0.062, R + 0.02, -0.51), lod ? 3 : 8), circ(0.011, lod ? 5 : 8)), paint);   // seat stays
    const drop = new THREE.BoxGeometry(0.008, 0.05, 0.045); drop.translate(s * 0.064, R, -0.515); P.add(SLOT.paint, drop, paint);
    // the fork's blades, from the crown to the front axle, a little forward at the foot
    P.add(SLOT.paint, sweep(bez(V(s * 0.05, 0.705, 0.426), V(s * 0.052, 0.58, 0.468), V(s * 0.052, 0.42, 0.512), V(s * 0.05, R, FRONT.z), lod ? 3 : 8), circ(1, lod ? 5 : 8, 0.012, 0.016)), paint);
  }
  const crown = new THREE.BoxGeometry(0.13, 0.03, 0.055); crown.translate(0, 0.705, 0.424); P.add(SLOT.paint, crown, paint);
  // the operator's name along both sides of the down tube
  if (!lod) for (const s of [-1, 1]) {
    const p = down[Math.round(nseg * 0.5)], q = down[Math.round(nseg * 0.5) + 1]; let dy = q.y - p.y, dz = q.z - p.z; if (dz < 0) { dy = -dy; dz = -dz; }
    const d = decal(0.25, 0.041, RECT.word(i)); d.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2); d.rotateX(-Math.atan2(dy, dz));   // (laid along the tube, upright on both sides)
    d.translate(s * 0.0285, p.y, p.z); P.add(SLOT.decal, d, 0xffffff);
  }

  // the seat post (quick release, the height marked), the saddle
  P.add(SLOT.metal, tube(V(0, 0.83, -0.258), V(0, 0.975, -0.302), 0.0135, seg), SILVER);
  { const ring = new THREE.TorusGeometry(0.03, 0.007, 6, seg * 2); ring.rotateX(Math.PI / 2 - 0.3); ring.translate(0, 0.84, -0.262); P.add(SLOT.metal, ring, DARKMETAL);
    const lever = new THREE.BoxGeometry(0.012, 0.016, 0.07); lever.rotateX(-0.3); lever.translate(0.034, 0.83, -0.24); P.add(SLOT.paint, lever, op.accent); }
  if (!lod) for (let k = 0; k < 4; k++) { const m = new THREE.BoxGeometry(0.0285, 0.0018, 0.004); m.rotateX(-0.29); m.translate(0, 0.875 + k * 0.022, -0.274 - k * 0.0066); P.add(SLOT.plastic, m, 0x202022); }   // (the height marks on the post)
  {
    const sh = new THREE.Shape(), pts = [[0, 0.15], [0.045, 0.13], [0.055, 0.05], [0.09, -0.04], [0.118, -0.09], [0.112, -0.125], [0.06, -0.14], [0, -0.135]];
    const full = [...pts, ...pts.slice(1, -1).reverse().map(([x, y]) => [-x, y])].map(([x, y]) => new THREE.Vector2(x, y));
    sh.moveTo(full[0].x, full[0].y); sh.splineThru([...full.slice(1), full[0]]);
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: lod ? 1 : 3, curveSegments: lod ? 6 : 14 });
    sg.rotateX(-Math.PI / 2); sg.rotateY(Math.PI); sg.scale(0.84, 0.9, 0.86); sg.rotateX(-0.06); sg.translate(0, 0.985, -0.3); P.add(SLOT.plastic, sg, SADDLE);
    const base = new THREE.BoxGeometry(0.12, 0.022, 0.16); base.translate(0, 0.978, -0.315); P.add(SLOT.plastic, base, 0x2d2e31);
    if (!lod) for (const s of [-1, 1]) P.add(SLOT.metal, sweep(arc(V(0, 0.95, -0.36), 0.03, Math.PI * 0.5, Math.PI * 1.4, 6, s * 0.04), circ(0.004, 5), { caps: false }), SILVER);   // the springs' coils, behind
  }

  // the bars: the stem, swept-back city bars, grips, brake levers, a bell, the cables down to the brakes
  P.add(SLOT.metal, tube(V(0, 0.92, 0.354), V(0, 1.005, 0.334), 0.016, seg), SILVER);
  { const cl = new THREE.BoxGeometry(0.05, 0.034, 0.04); cl.translate(0, 1.012, 0.334); P.add(SLOT.metal, cl, SILVER); }
  const barPts = new THREE.CatmullRomCurve3([V(0.315, 1.042, 0.196), V(0.24, 1.042, 0.222), V(0.165, 1.033, 0.298), V(0.07, 1.02, 0.333), V(0, 1.018, 0.338), V(-0.07, 1.02, 0.333), V(-0.165, 1.033, 0.298), V(-0.24, 1.042, 0.222), V(-0.315, 1.042, 0.196)]).getPoints(lod ? 10 : 32);
  P.add(SLOT.metal, sweep(barPts, circ(0.011, lod ? 6 : 10), { up: V(0, 1, 0) }), SILVER);
  for (const s of [-1, 1]) {
    const a = V(s * 0.226, 1.042, 0.227), b = V(s * 0.322, 1.042, 0.194);
    P.add(SLOT.rubber, sweep(line(a, b, 3), circ(0.0175, lod ? 6 : 12), { up: V(0, 1, 0) }), RUBBER);
    if (!lod) { const end = new THREE.TorusGeometry(0.016, 0.005, 6, 12); end.lookAt(b.clone().sub(a)); end.translate(b.x, b.y, b.z); P.add(SLOT.rubber, end, RUBBER); }
    const house = new THREE.BoxGeometry(0.034, 0.03, 0.038); house.translate(s * 0.195, 1.04, 0.258); P.add(SLOT.plastic, house, 0x1e1f22);
    P.add(SLOT.metal, sweep([V(s * 0.2, 1.033, 0.279), V(s * 0.25, 1.028, 0.259), V(s * 0.295, 1.024, 0.236), V(s * 0.31, 1.03, 0.226)], circ(1, lod ? 4 : 6, 0.006, 0.0042), { up: V(0, 1, 0) }), DARKMETAL);
    // the brake cables: out of the levers, a loop forward over the head tube, down to the drums
    if (!lod) P.add(SLOT.rubber, sweep(new THREE.CatmullRomCurve3(s > 0 ? [V(0.19, 1.04, 0.275), V(0.12, 1.0, 0.42), V(0.04, 0.88, 0.43), V(0.05, 0.6, 0.48), V(0.06, 0.36, FRONT.z)]
      : [V(-0.19, 1.04, 0.275), V(-0.11, 0.99, 0.41), V(-0.02, 0.86, 0.33), V(-0.03, 0.55, 0.15), V(-0.045, 0.4, -0.22), V(-0.06, 0.34, -0.47)]).getPoints(24), circ(0.0035, 5), { caps: false, up: V(0, 1, 0) }), 0x111113);
  }
  if (!lod) { // the bell, on the left
    const base = new THREE.CylinderGeometry(0.012, 0.012, 0.024, 8); base.rotateZ(Math.PI / 2); base.translate(0.14, 1.03, 0.31); P.add(SLOT.metal, base, DARKMETAL);
    const dome = new THREE.SphereGeometry(0.025, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.62, 1); dome.translate(0.14, 1.047, 0.31); P.add(SLOT.metal, dome, SILVER);
    const lev = new THREE.BoxGeometry(0.006, 0.006, 0.026); lev.translate(0.14, 1.044, 0.288); P.add(SLOT.metal, lev, SILVER);
  }
  // the smart panel on the bars: a housing tilted up to you, its face the code, the name, the battery
  {
    const tilt = -0.42, house = new THREE.BoxGeometry(0.162, 0.034, 0.1, 1, 1, 1); house.rotateX(tilt); house.translate(0, 1.046, 0.322); P.add(SLOT.plastic, house, PLASTIC);
    const lip = new THREE.BoxGeometry(0.166, 0.012, 0.104); lip.rotateX(tilt); lip.translate(0, 1.033, 0.326); P.add(SLOT.paint, lip, paint);
    const face = decal(0.152, 0.0869, RECT.panel(i)); face.rotateX(-Math.PI / 2); face.rotateY(Math.PI); face.rotateX(tilt); face.translate(0, 1.046 + 0.0172 * Math.cos(tilt), 0.322 - 0.0172 * Math.sin(-tilt)); P.add(SLOT.decal, face, 0xffffff);
  }

  // the basket: plastic, wider at the top, a grid of holes; a solid rim and corners, a plate on the front with the name; on a
  // bracket off the head tube and two stays down to the fork ends
  {
    const bc = op.basket, t0 = { y: 1.06, x: 0.19, z0: 0.445, z1: 0.735 }, b0 = { y: 0.85, x: 0.158, z0: 0.47, z1: 0.705 }, U = 0.032;
    const TL = V(t0.x, t0.y, t0.z0), TR = V(-t0.x, t0.y, t0.z0), FL = V(t0.x, t0.y, t0.z1), FR = V(-t0.x, t0.y, t0.z1);
    const tl = V(b0.x, b0.y, b0.z0), tr = V(-b0.x, b0.y, b0.z0), fl = V(b0.x, b0.y, b0.z1), fr = V(-b0.x, b0.y, b0.z1);
    P.add(SLOT.basket, quad(fr, fl, FL, FR, U), bc);              // front
    P.add(SLOT.basket, quad(tl, tr, TR, TL, U), bc);              // back
    P.add(SLOT.basket, quad(fl, tl, TL, FL, U), bc);              // left
    P.add(SLOT.basket, quad(tr, fr, FR, TR, U), bc);              // right
    P.add(SLOT.basket, quad(tl, fl, fr, tr, U), bc);              // floor
    const rimP = [V(t0.x, t0.y, t0.z0), V(t0.x, t0.y, t0.z1), V(-t0.x, t0.y, t0.z1), V(-t0.x, t0.y, t0.z0), V(t0.x, t0.y, t0.z0)];
    const rounded = (ps, r) => { const out = []; for (let k = 0; k < ps.length - 1; k++) { const a = ps[k], b = ps[k + 1], d = b.clone().sub(a), L = d.length(); d.normalize(); out.push(a.clone().addScaledVector(d, r), b.clone().addScaledVector(d, -r)); } out.push(out[0].clone()); return out; };
    P.add(SLOT.plastic, sweep(rounded(rimP, 0.02), circ(1, lod ? 4 : 8, 0.008, 0.014), { up: V(0, 1, 0) }), bc);
    const botP = [V(b0.x, b0.y, b0.z0), V(b0.x, b0.y, b0.z1), V(-b0.x, b0.y, b0.z1), V(-b0.x, b0.y, b0.z0), V(b0.x, b0.y, b0.z0)];
    P.add(SLOT.plastic, sweep(rounded(botP, 0.015), circ(0.008, lod ? 4 : 6), { up: V(0, 1, 0) }), bc);
    for (const [a, b] of [[TL, tl], [TR, tr], [FL, fl], [FR, fr]]) P.add(SLOT.plastic, sweep(line(a, b), circ(0.011, lod ? 4 : 6)), bc);
    if (!lod) for (const [a, b] of [[TL, FL], [TR, FR]]) { const mid = a.clone().lerp(b, 0.5), mb = (a === TL ? tl : tr).clone().lerp(a === TL ? fl : fr, 0.5); P.add(SLOT.plastic, sweep(line(mid, mb), circ(0.006, 5)), bc); }   // a rib down each side
    // the plate on the front: solid, with the name in white
    const pl = new THREE.BoxGeometry(0.27, 0.085, 0.008), slope = Math.atan2(t0.z1 - b0.z1, t0.y - b0.y), pc = V(0, (t0.y + b0.y) / 2 + 0.01, (t0.z1 + b0.z1) / 2 + 0.006);
    pl.rotateX(slope); pl.translate(pc.x, pc.y, pc.z); P.add(SLOT.plastic, pl, bc);
    const wm = decal(0.25, 0.041, RECT.word(i)); wm.rotateX(slope); wm.translate(pc.x, pc.y - 0.0046 * Math.sin(slope), pc.z + 0.0046 * Math.cos(slope)); P.add(SLOT.decal, wm, 0xffffff);
    // the bracket off the head tube, and the stays
    const br = new THREE.BoxGeometry(0.06, 0.035, 0.09); br.translate(0, 0.88, 0.42); P.add(SLOT.plastic, br, 0x1d1e21);
    for (const s of [-1, 1]) P.add(SLOT.metal, tube(V(s * 0.11, b0.y, b0.z1 - 0.02), V(s * 0.056, R + 0.015, FRONT.z + 0.005), 0.0055, 6), DARKMETAL);
    // the lamp under the front of the basket, the lens a bright disc
    const lamp = new THREE.CylinderGeometry(0.026, 0.03, 0.05, 12); lamp.rotateX(Math.PI / 2); lamp.translate(0, 0.815, 0.705); P.add(SLOT.plastic, lamp, 0x1a1b1e);
    const lens = decal(0.046, 0.046, RECT.lens); lens.translate(0, 0.815, 0.7305); P.add(SLOT.decal, lens, 0xffffff);
    const lb = new THREE.BoxGeometry(0.02, 0.04, 0.03); lb.translate(0, 0.84, 0.69); P.add(SLOT.plastic, lb, 0x1a1b1e);
  }

  // mudguards: a shallow U, round each wheel; the rear one longer, a red reflector at its end
  const guard = (c, a0, a1, w) => { const prof = []; const N = lod ? 3 : 6; for (let k = 0; k <= N; k++) { const t = -1 + (2 * k) / N; prof.push([t * w, -0.014 * (1 - t * t)]); } for (let k = N; k >= 0; k--) { const t = -1 + (2 * k) / N; prof.push([t * w, -0.014 * (1 - t * t) + 0.004]); } return sweep(arc(c, R + 0.035, a0, a1, lod ? 10 : 28), prof); };
  P.add(SLOT.plastic, guard(FRONT, 0.45, Math.PI * 0.98, 0.038), op.guard);
  P.add(SLOT.plastic, guard(REAR, Math.PI * 0.32, Math.PI * 1.2, 0.04), op.guard);
  for (const s of [-1, 1]) { P.add(SLOT.metal, tube(V(s * 0.05, R, FRONT.z), V(s * 0.036, R + 0.27, FRONT.z - 0.19), 0.0035, 5), SILVER); P.add(SLOT.metal, tube(V(s * 0.06, R, -0.52), V(s * 0.038, R + 0.12, -0.83), 0.0035, 5), SILVER); }   // the guards' stays
  { const a = Math.PI * 1.17, p = V(0, REAR.y + Math.sin(a) * (R + 0.05), REAR.z + Math.cos(a) * (R + 0.05)); const rr = new THREE.BoxGeometry(0.05, 0.03, 0.012); rr.rotateX(-(a - Math.PI)); rr.translate(p.x, p.y, p.z); P.add(SLOT.plastic, rr, 0xb3121a); }

  // the smart lock over the rear wheel, a solar panel on its top, the second QR code on its back
  {
    const lk = new THREE.BoxGeometry(0.115, 0.095, 0.17); lk.translate(0, 0.718, -0.405); P.add(SLOT.plastic, lk, PLASTIC);
    const cap = new THREE.BoxGeometry(0.125, 0.012, 0.18); cap.translate(0, 0.771, -0.405); P.add(SLOT.paint, cap, paint);
    const sol = decal(0.1, 0.15, RECT.solar); sol.rotateX(-Math.PI / 2); sol.translate(0, 0.7775, -0.405); P.add(SLOT.decal, sol, 0xffffff);
    const qr = decal(0.068, 0.068 * 410 / 320, RECT.qr(i)); qr.rotateY(Math.PI); qr.translate(0, 0.718, -0.4905); P.add(SLOT.decal, qr, 0xffffff);
    const ring = new THREE.TorusGeometry(R - 0.045, 0.011, 6, lod ? 8 : 16, 0.5); ring.rotateY(Math.PI / 2); ring.rotateX(Math.PI * 0.36); ring.translate(REAR.x, REAR.y, REAR.z); P.add(SLOT.plastic, ring, PLASTIC);   // the ring lock's bolt across the rim
    for (const s of [-1, 1]) P.add(SLOT.metal, tube(V(s * 0.05, 0.676, -0.33), V(s * 0.03, 0.74, -0.255), 0.006, 5), DARKMETAL);
  }
  // the chain case, enclosing the chain on the right: the hull of the chainring and the sprocket, in plastic
  {
    const c1 = new THREE.Vector2(BB.z, BB.y), r1 = 0.1, c2 = new THREE.Vector2(REAR.z, REAR.y), r2 = 0.056, d = c2.clone().sub(c1), L = d.length(), phi = Math.atan2(d.y, d.x), al = Math.acos((r1 - r2) / L);
    const pts = []; const N = lod ? 8 : 20;
    for (let k = 0; k <= N; k++) { const a = phi + al + ((2 * Math.PI - 2 * al) * k) / N; pts.push(new THREE.Vector2(c1.x + Math.cos(a) * r1, c1.y + Math.sin(a) * r1)); }
    for (let k = 0; k <= N; k++) { const a = phi - al + (2 * al * k) / N; pts.push(new THREE.Vector2(c2.x + Math.cos(a) * r2, c2.y + Math.sin(a) * r2)); }
    const sh = new THREE.Shape(pts), cg = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 4 });
    cg.rotateY(-Math.PI / 2); cg.translate(-0.058, 0, 0); P.add(SLOT.plastic, cg, op.guard === 0xd9dde2 ? 0x2b2d30 : PLASTIC);
    if (!lod) { const wm = decal(0.2, 0.033, RECT.word(i)); wm.rotateY(-Math.PI / 2); wm.translate(-0.0955, (BB.y + REAR.y) / 2 + 0.01, (BB.z + REAR.z) / 2 + 0.02); P.add(SLOT.decal, wm, 0xffffff); }
  }
  // the side stand, on the left: down to the ground (the bike leans on it a little) or folded along the chain stay
  {
    const top = V(0.045, 0.26, -0.18), foot = stand === 'down' ? V(0.15, 0.014, -0.245) : V(0.075, 0.29, -0.43);
    P.add(SLOT.metal, tube(top, foot, 0.009, 6), DARKMETAL);
    const f = new THREE.BoxGeometry(0.03, 0.01, 0.045); if (stand !== 'down') f.rotateX(1.2); f.translate(foot.x, foot.y, foot.z); P.add(SLOT.metal, f, DARKMETAL);
  }
  const g = P.build();
  if (!wheels && !crank) return g;
  const extra = [g];
  if (wheels) { extra.push(wheelGeo(true, lod).translate(REAR.x, REAR.y, REAR.z), wheelGeo(false, lod).translate(FRONT.x, FRONT.y, FRONT.z)); }
  if (crank) { const c = crankGeo(); c.rotateX(0.7); c.translate(BB.x, BB.y, BB.z); extra.push(c); }
  return mergeByGroups(extra);
}
// merge geometries that carry material groups, keeping one group per material
function mergeByGroups(list) {
  const per = [[], [], [], [], [], []];
  for (const g of list) for (const gr of g.groups) {
    const sub = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv', 'color']) { const a = g.attributes[k]; sub.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); }
    per[gr.materialIndex].push(sub);
  }
  const geos = [], idx = [];
  per.forEach((l, k) => { if (l.length) { geos.push(mergeGeometries(l)); idx.push(k); } });
  const out = mergeGeometries(geos, true); out.groups.forEach((gr, k) => { gr.materialIndex = idx[k]; });
  return out;
}
