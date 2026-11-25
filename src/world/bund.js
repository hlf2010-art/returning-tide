// The Bund's west side: the stone banks and trading houses, floodlit gold.
// The four blocks around Hankou Road are modelled with some care; the rest of the
// row continues north and south as simpler massing so the waterfront never just ends.
import * as THREE from 'three';
import { L, lions } from './layout.js';
import { batchSet, flush, Batch } from './geo.js';
import { makeCanvas, tex, rng, FONT } from './canvas.js';
import { towerAtlas } from './skyline.js';
import { DOOR_COL, RUSTIC_WIN, DOOR_TOP } from './textures.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---- the classical kit, modelled in Blender (tools/blender/bund_kit.py, public/models/bund-kit.glb): an Attic
// base, a fluted shaft, a Roman Doric capital, a moulded cornice, a vase baluster. Loaded before the Bund is built
// (main.js); without it the columns and cornices are the plain shapes they were ----
let KIT = null;
export async function loadBundKit(url = './models/bund-kit.glb') {
  try {
    const g = await new GLTFLoader().loadAsync(url), kit = {};
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (!geo.attributes.uv) {                                  // (stone tiles by metre: a simple wrap is enough at this scale)
        const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
        for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + p.getZ(i)) * 0.5; uv[i * 2 + 1] = p.getY(i) * 0.5; }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      if (!geo.attributes.normal) geo.computeVertexNormals();
      kit[o.name] = geo;
    });
    KIT = kit.colShaft && kit.colBase && kit.colCap ? kit : null;
  } catch (e) { console.warn('bund kit unavailable, plain columns', e); KIT = null; }
  return !!KIT;
}

const FX = L.facadeX;
const NAMES = ['stone', 'stoneDark', 'flute', 'classic', 'arched', 'rustic', 'deco', 'brick', 'roof', 'copper', 'bronze', 'glassDark', 'door'];

export function facade(B, style, ax, az, bx, bz, y0, y1, { bay = 4, floors = 1, f0 = 1, f1 = 0.6, seed = 0, holes = null } = {}) {
  const len = Math.hypot(bx - ax, bz - az);
  let uv;
  if (style === 'stone' || style === 'stoneDark') uv = [0, y0 / 2, len / 2, y1 / 2];
  else { const bays = Math.max(1, Math.round(len / bay)), uo = (seed * 3) % 8, vo = (seed * 5) % 4; uv = [uo / 8, vo / 4, (uo + bays) / 8, (vo + floors) / 4]; }
  if (style === 'rustic' && B.door && y0 < 0.5) rusticDoors(B, ax, az, bx, bz, y0, y1, uv, f0, f1, holes);
  if (!holes || !holes.length) { B[style].wall(ax, az, bx, bz, y0, y1, uv, [f0, f1]); return; }
  // a face with doorways cut out of it ([t0, t1] along it as fractions, open up to height h): the pieces round them
  const P = (t) => [ax + (bx - ax) * t, az + (bz - az) * t], U = (t) => uv[0] + (uv[2] - uv[0]) * t;
  const V = (y) => uv[1] + (uv[3] - uv[1]) * (y - y0) / (y1 - y0), Fl = (y) => f0 + (f1 - f0) * (y - y0) / (y1 - y0);
  const piece = (t0, t1, ya, yb) => { if (t1 - t0 > 1e-4 && yb - ya > 1e-4) B[style].wall(...P(t0), ...P(t1), ya, yb, [U(t0), V(ya), U(t1), V(yb)], [Fl(ya), Fl(yb)]); };
  let t = 0;
  for (const [h0, h1, h] of [...holes].sort((a, b) => a[0] - b[0])) { piece(t, h0, y0, y1); piece(h0, h1, Math.min(y1, Math.max(y0, h)), y1); t = h1; }
  piece(t, 1, y0, y1);
}

// The closed doors of the rusticated ground floors, as real pieces in front of the atlas's painted ones (which
// are what's seen from afar and where nothing stands in front): the two leaves (surfaceDetail.js bundDoorTexture),
// stone jambs and a head with a little cornice, a granite threshold step. Where the atlas puts a door (every 4th
// column, the arch's lower part), so the painted fanlight above lines up; never in a doorway cut through the wall.
function rusticDoors(B, ax, az, bx, bz, y0, y1, uv, f0, f1, holes) {
  const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz, nz = dx;
  const cells = Math.round((uv[2] - uv[0]) * 8), cellW = len / cells, h = y1 - y0, rot = Math.atan2(-dz, dx);
  const ground = L.curbH, top = y0 + h * RUSTIC_WIN.h * (1 - DOOR_TOP), Fl = (y) => f0 + (f1 - f0) * (y - y0) / h;
  for (let k = 0; k < cells; k++) {
    const col = ((Math.floor(uv[0] * 8 + 1e-6) + k) % 8 + 8) % 8;
    if (!DOOR_COL(col)) continue;
    const t0 = (k + RUSTIC_WIN.x) / cells, t1 = (k + RUSTIC_WIN.x + RUSTIC_WIN.w) / cells;
    if (holes && holes.some(([a, b]) => t1 > a - 0.02 && t0 < b + 0.02)) continue;
    const w = (t1 - t0) * len, tc = (t0 + t1) / 2, cx = ax + dx * len * tc, cz = az + dz * len * tc;
    const at = (s, out) => [cx + dx * s + nx * out, cz + dz * s + nz * out];
    // the leaves, a hand's breadth proud of the wall so the frame round them reads as a reveal
    B.door.wall(...at(-w / 2, 0.04), ...at(w / 2, 0.04), ground, top, [0, 0, 1, 1], [Fl(ground) * 0.9, Fl(top) * 0.9]);
    const fl = Fl(ground + 1);
    // jambs, the head and its cornice
    for (const s of [-1, 1]) { const [jx, jz] = at(s * (w / 2 + 0.1), 0.08); B.stone.box(jx, y0, jz, 0.2, top - y0 + 0.02, 0.16, { flood: fl, rotY: rot }); }
    { const [hx, hz] = at(0, 0.09); B.stone.box(hx, top, hz, w + 0.4, 0.3, 0.18, { flood: Fl(top), rotY: rot }); }
    { const [hx, hz] = at(0, 0.13); B.stone.box(hx, top + 0.3, hz, w + 0.62, 0.09, 0.26, { flood: Fl(top) * 1.1, rotY: rot }); }
    // the threshold: a worn granite step
    { const [sx, sz] = at(0, 0.2); B.stoneDark.box(sx, y0, sz, w + 0.5, ground - y0 + 0.07, 0.4, { flood: fl * 0.8, rotY: rot }); }
  }
}

// Stack of storeys on a rectangular footprint {x0 (west), x1 (east), z0 (north), z1 (south)}.
// faceGain lets a face sit in shadow (side streets are lamp-lit, not floodlit).
export function tiers(B, fp, y0, list, faces = 'ENS', seed = 0, faceGain = {}) {
  let y = y0;
  for (const t of list) {
    const i = t.inset || 0;
    const x0 = fp.x0 + i, x1 = fp.x1 - i, z0 = fp.z0 + i, z1 = fp.z1 - i, y1 = y + t.h;
    const o = (face) => {
      const g = faceGain[face] ?? 1;
      return { bay: t.bay || 4, floors: t.floors || 1, f0: (t.f0 ?? 1) * g, f1: (t.f1 ?? 0.62) * g, seed: seed++ };
    };
    // doorways (fp.holes: { E: [[zA, zB, h]], S: [[xA, xB, h]] } from the ground), in the bottom tier's faces
    const H = (f) => (fp.holes && fp.holes[f] && y === y0 && !i ? fp.holes[f].map(([a, b, h]) => (f === 'E' ? [(z1 - Math.max(a, b)) / (z1 - z0), (z1 - Math.min(a, b)) / (z1 - z0), h] : [(Math.min(a, b) - x0) / (x1 - x0), (Math.max(a, b) - x0) / (x1 - x0), h])) : null);
    if (faces.includes('E')) facade(B, t.style, x1, z1, x1, z0, y, y1, { ...o('E'), holes: H('E') });
    if (faces.includes('N')) facade(B, t.style, x1, z0, x0, z0, y, y1, o('N'));
    if (faces.includes('S')) facade(B, t.style, x0, z1, x1, z1, y, y1, { ...o('S'), holes: H('S') });
    if (faces.includes('W')) facade(B, t.style, x0, z0, x0, z1, y, y1, o('W'));
    if (t.cornice) {
      const c = t.cornice;
      // a ring round the edges, not a slab through the building (interiors live inside some of them)
      const fl = { flood: (t.f1 ?? 0.62) + 0.25 }, d = 2 * c.out + 1.2, W = x1 - x0 + 2 * c.out, D = z1 - z0 + 2 * c.out, yy = y1 - c.h;
      if (KIT && KIT.cornice) {
        // the kit's moulded cornice along each face, its back on the wall, run past the corners to close them
        const o = c.out + 0.15, f = fl.flood, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        B.stone.add(KIT.cornice, { x: cx, y: yy, z: z0, ry: 0, sx: W + 2 * o, sy: c.h, sz: o, flood: f });
        B.stone.add(KIT.cornice, { x: cx, y: yy, z: z1, ry: Math.PI, sx: W + 2 * o, sy: c.h, sz: o, flood: f });
        B.stone.add(KIT.cornice, { x: x1, y: yy, z: cz, ry: -Math.PI / 2, sx: D + 2 * o, sy: c.h, sz: o, flood: f });
        B.stone.add(KIT.cornice, { x: x0, y: yy, z: cz, ry: Math.PI / 2, sx: D + 2 * o, sy: c.h, sz: o, flood: f });
        y = y1; continue;
      }
      B.stone.box((x0 + x1) / 2, yy, z0 - c.out + d / 2, W, c.h, d, fl); B.stone.box((x0 + x1) / 2, yy, z1 + c.out - d / 2, W, c.h, d, fl);
      B.stone.box(x0 - c.out + d / 2, yy, (z0 + z1) / 2, d, c.h, D - 2 * d, fl); B.stone.box(x1 + c.out - d / 2, yy, (z0 + z1) / 2, d, c.h, D - 2 * d, fl);
    }
    y = y1;
  }
  const last = list[list.length - 1], i = last.inset || 0;
  B.roof.floor(fp.x0 + i, fp.x1 - i, fp.z0 + i, fp.z1 - i, y + 0.02);
  return y;
}

// Row of columns along z at a given x, lit from the street side.
function colonnade(B, x, zA, zB, n, y0, h, r, fluted = true) {
  const lit = (bx, by, bz, nx) => (0.62 + 0.55 * Math.max(0, nx)) * (1.2 - 0.5 * ((by - y0) / h));
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? zA : zA + ((zB - zA) * i) / (n - 1);
    if (KIT) {
      // the kit's column: Attic base and capital at the shaft's scale, the fluted shaft stretched between them
      const bh = 1.26 * r, ch = 0.98 * r, sh = h - bh - ch;
      B.stone.add(KIT.colBase, { x, y: y0, z, sx: r, sy: r, sz: r, flood: 1.1 });
      B.stone.add(KIT.colShaft, { x, y: y0 + bh, z, sx: r, sy: sh, sz: r, flood: lit });
      B.stone.add(KIT.colCap, { x, y: y0 + bh + sh, z, sx: r, sy: r, sz: r, flood: 0.9 });
      continue;
    }
    B.stone.box(x, y0, z, r * 2.7, 0.45, r * 2.7, { flood: 1.1 });
    (fluted ? B.flute : B.stone).cyl(x, y0 + 0.45, z, r * 0.86, r, h - 1.1, 18, { flood: lit, tileU: 1.5, tileV: 1, open: true });
    B.stone.box(x, y0 + h - 0.65, z, r * 2.9, 0.65, r * 2.9, { flood: 0.9 });
  }
}

function dialTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#1a1612'; ctx.beginPath(); ctx.arc(256, 256, 256, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff1cf'; ctx.beginPath(); ctx.arc(256, 256, 236, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(256, 256, 170, 0, 7); ctx.stroke();
  ctx.fillStyle = '#1a1612'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 46px ${FONT.serif}`;
  const num = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  num.forEach((s, i) => {
    const a = (i / 12) * Math.PI * 2;
    ctx.save(); ctx.translate(256 + Math.sin(a) * 203, 256 - Math.cos(a) * 203); ctx.rotate(a); ctx.fillText(s, 0, 0); ctx.restore();
  });
  const hand = (a, len, w) => { ctx.save(); ctx.translate(256, 256); ctx.rotate(a); ctx.fillRect(-w / 2, -len, w, len + 26); ctx.restore(); };
  hand(((5 + 42 / 60) / 12) * Math.PI * 2, 120, 18);   // 5:42 - blue hour in November
  hand((42 / 60) * Math.PI * 2, 178, 11);
  ctx.beginPath(); ctx.arc(256, 256, 16, 0, 7); ctx.fill();
  return tex(c, { repeat: false });
}

// ---------- the four near buildings ----------

function customsHouse(B, extra) {
  const z0 = L.street.halfW, z1 = 47.7, zc = 27;
  const body = { x0: -150, x1: FX, z0, z1 };
  const top = tiers(B, body, 0, [
    { h: 9, style: 'rustic', bay: 4.1, f0: 1.05, f1: 0.85, cornice: { out: 0.45, h: 0.7 } },
    { h: 17, style: 'classic', floors: 4, bay: 4.1, f0: 0.95, f1: 0.6, cornice: { out: 0.95, h: 1.0 } },
    { h: 7.5, style: 'classic', floors: 2, bay: 4.1, inset: 0.5, f0: 0.9, f1: 0.62, cornice: { out: 0.5, h: 0.6 } },
  ], 'ENS', 1, { N: 0.42 });
  // central avant-corps behind the portico
  tiers(B, { x0: -42, x1: -32.9, z0: zc - 10, z1: zc + 10 }, 0, [
    { h: 9, style: 'rustic', bay: 5, f0: 1.25, f1: 1.0 },
    { h: 5.5, style: 'stone', f0: 1.2, f1: 0.95, cornice: { out: 0.5, h: 0.9 } },
    { h: 11.5, style: 'classic', floors: 3, bay: 5, f0: 0.95, f1: 0.65, cornice: { out: 0.9, h: 1.0 } },
    { h: 8.5, style: 'classic', floors: 2, bay: 5, inset: 0.4, f0: 0.9, f1: 0.65, cornice: { out: 0.5, h: 0.7 } },
  ], 'ENS', 4);
  // Doric portico
  B.stone.box(-32.5, 0, zc, 3.0, 0.4, 18, { flood: 1.0 });
  B.stone.box(-32.6, 0.4, zc, 2.8, 0.35, 17.2, { flood: 1.0 });
  colonnade(B, -31.95, zc - 6.3, zc + 6.3, 4, 0.75, 12.6, 0.95);
  B.stone.box(-32.0, 13.35, zc, 2.4, 2.3, 17.4, { flood: 0.95 });
  B.stone.box(-32.0, 15.65, zc, 3.0, 0.5, 18.2, { flood: 0.9 });

  // clock tower, set back from the front
  const tx = -46, tz = zc, lit = 1.15;
  let y = tiers(B, { x0: tx - 8.5, x1: tx + 8.5, z0: tz - 8.5, z1: tz + 8.5 }, top - 0.5, [
    { h: 17, style: 'classic', floors: 3, bay: 4.2, f0: lit, f1: 0.8, cornice: { out: 0.7, h: 0.9 } },
  ], 'ENSW', 9);
  B.stone.box(tx, y, tz, 13.6, 17, 13.6, { flood: (x, yy) => lit - 0.35 * ((yy - y) / 17) });
  for (const s of [-1, 1]) for (const q of [-1, 1]) B.stone.box(tx + s * 6.6, y, tz + q * 6.6, 1.6, 17, 1.6, { flood: 1.0 });
  const dialY = y + 9.2;
  B.stone.box(tx, y + 17, tz, 15.4, 0.9, 15.4, { flood: 1.1 }); y += 17.9;
  B.stone.box(tx, y, tz, 10.4, 5.2, 10.4, { flood: 1.1 }); y += 5.2;
  B.stone.box(tx, y, tz, 11.2, 0.5, 11.2, { flood: 1.1 }); y += 0.5;
  B.stone.box(tx, y, tz, 7, 3.4, 7, { flood: 1.15 }); y += 3.4;
  const cap = new THREE.ConeGeometry(4.6, 3.2, 4); cap.rotateY(Math.PI / 4);
  B.stone.add(cap, { x: tx, y: y + 1.6, z: tz, flood: 1.0 }); y += 3.2;
  extra.flags.push({ x: tx, y, z: tz, h: 9 });
  extra.clock = { x: tx, y: dialY, z: tz, half: 6.83 };
  return top;
}

function hsbc(B, extra) {
  const z0 = 48.3, z1 = 118, zc = 83;
  const top = tiers(B, { x0: -150, x1: FX, z0, z1 }, 0, [
    { h: 7.5, style: 'rustic', bay: 4.35, f0: 1.05, f1: 0.85, cornice: { out: 0.4, h: 0.6 } },
    { h: 13.5, style: 'classic', floors: 3, bay: 4.35, f0: 0.95, f1: 0.62, cornice: { out: 1.0, h: 1.1 } },
    { h: 4.6, style: 'classic', floors: 1, bay: 4.35, inset: 0.6, f0: 0.85, f1: 0.7, cornice: { out: 0.45, h: 0.5 } },
  ], 'ENS', 2);
  // central pavilion: three arched portals, six columns over them, raised attic
  const pav = { x0: -44, x1: -32.2, z0: zc - 15, z1: zc + 15 };
  let y = tiers(B, pav, 0, [
    { h: 7.5, style: 'rustic', bay: 10, f0: 1.2, f1: 0.95, cornice: { out: 0.35, h: 0.7 } },
  ], 'ENS', 5);
  tiers(B, { ...pav, x1: -34.4 }, y, [
    { h: 13.6, style: 'arched', floors: 2, bay: 5, f0: 1.35, f1: 1.0 },
  ], 'ENS', 7);
  colonnade(B, -33.1, zc - 12.4, zc + 12.4, 6, y, 13.6, 0.85);
  y += 13.6;
  B.stone.box(-38.1, y, zc, 12.2, 2.2, 30.6, { flood: 0.95 });
  B.stone.box(-38.1, y + 2.2, zc, 13.4, 0.7, 31.8, { flood: 0.95 }); y += 2.9;
  y = tiers(B, { x0: -52, x1: -33.2, z0: zc - 13, z1: zc + 13 }, y, [
    { h: 5.6, style: 'classic', floors: 1, bay: 4.3, f0: 0.9, f1: 0.72, cornice: { out: 0.5, h: 0.6 } },
  ], 'ENSW', 3);
  // drum, dome, lantern
  const dx = -43, glow = (x, yy, z, nx, ny) => 1.05 - 0.45 * Math.max(0, ny);
  B.stone.cyl(dx, y, zc, 10.4, 10.4, 6.5, 32, { flood: 1.1, tileU: 16, tileV: 3 });
  B.stone.cyl(dx, y + 6.5, zc, 11.0, 11.0, 0.8, 32, { flood: 1.1, tileU: 16 });
  const dome = new THREE.SphereGeometry(10, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  B.stone.add(dome, { x: dx, y: y + 7.3, z: zc, sy: 0.92, flood: glow });
  B.stone.cyl(dx, y + 16.2, zc, 1.7, 2.0, 3.6, 12, { flood: 1.2 });
  B.stone.add(new THREE.SphereGeometry(1.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { x: dx, y: y + 19.8, z: zc, flood: 1.0 });
  extra.flags.push({ x: dx, y: y + 21.6, z: zc, h: 8 });
  // the two bronze lions keeping the door, looking out at the river
  const ball = new THREE.SphereGeometry(0.5, 14, 10);
  for (const l of lions) {
    const { x, z } = l, f = 0.75;
    B.stone.box(x - 0.1, 0, z, 2.7, 1.0, 1.25, { flood: 1.0 });
    B.stone.box(x - 0.1, 1.0, z, 2.5, 0.12, 1.05, { flood: 1.0 });
    B.bronze.add(ball, { x: x - 0.85, y: 1.52, z, sx: 1.0, sy: 0.85, sz: 1.0, flood: f });       // haunches
    B.bronze.add(ball, { x: x - 0.25, y: 1.5, z, sx: 1.7, sy: 0.74, sz: 0.86, flood: f });       // back
    B.bronze.add(ball, { x: x + 0.4, y: 1.64, z, sx: 0.95, sy: 1.0, sz: 0.92, flood: f });       // chest
    B.bronze.add(ball, { x: x + 0.55, y: 1.98, z, sx: 1.0, sy: 1.08, sz: 1.08, flood: f });      // mane
    B.bronze.add(ball, { x: x + 0.82, y: 2.06, z, sx: 0.68, sy: 0.7, sz: 0.66, flood: f });      // head
    B.bronze.box(x + 1.06, 1.86, z, 0.2, 0.2, 0.3, { flood: f });                               // muzzle
    for (const s of [-1, 1]) {
      B.bronze.box(x + 0.75, 1.12, z + s * 0.27, 0.95, 0.2, 0.22, { flood: f });                // forepaws
      B.bronze.box(x - 0.8, 1.12, z + s * 0.36, 0.6, 0.22, 0.2, { flood: f });
    }
  }
  return top;
}

function bankOfCommunications(B, extra) {
  // No.14: late art deco, all verticals
  const z0 = -36.5, z1 = -L.street.halfW, bay = 3.75;
  const fp = { x0: -64, x1: FX, z0, z1 };
  tiers(B, fp, 0, [
    { h: 6.5, style: 'classic', bay, f0: 1.1, f1: 0.95, cornice: { out: 0.3, h: 0.5 } },
    { h: 21, style: 'deco', floors: 5, bay, f0: 0.95, f1: 0.6, cornice: { out: 0.3, h: 0.6 } },
  ], 'ENS', 3, { S: 0.5 });
  const y = tiers(B, { x0: -58, x1: FX - 0.01, z0: z0 + 7.5, z1: z1 - 7.5 }, 27.5, [
    { h: 8.4, style: 'deco', floors: 2, bay, f0: 0.95, f1: 0.7, cornice: { out: 0.25, h: 0.5 } },
    { h: 3.2, style: 'stone', inset: 3.75, f0: 0.9, f1: 0.8 },
  ], 'ENSW', 6);
  // piers running the full height
  for (let i = 0; i <= 8; i++) {
    const z = z0 + i * bay, tall = i >= 2 && i <= 6;
    B.stone.box(FX + 0.2, 0, z, 0.5, tall ? 36.3 : 27.9, 0.75, { flood: (x, yy) => 1.15 - 0.55 * (yy / 36) });
  }
  // bronze entrance
  B.bronze.box(FX + 0.12, 0, (z0 + z1) / 2, 0.25, 4.6, 3.2, { flood: 1.3 });
  B.stone.box(FX + 0.3, 4.6, (z0 + z1) / 2, 0.7, 0.6, 4.4, { flood: 1.2 });
  extra.flags.push({ x: -40, y, z: (z0 + z1) / 2, h: 8 });
}

function russoChinese(B, extra) {
  // No.15: three tall storeys, giant Ionic order over a rusticated base
  const z0 = -65, z1 = -36.9, zc = (z0 + z1) / 2;
  tiers(B, { x0: -70, x1: FX, z0, z1 }, 0, [
    { h: 6.8, style: 'rustic', bay: 4.0, f0: 1.1, f1: 0.9, cornice: { out: 0.4, h: 0.6 } },
  ], 'ENS', 4);
  tiers(B, { x0: -70, x1: FX - 1.5, z0, z1 }, 6.8, [
    { h: 11.2, style: 'arched', floors: 2, bay: 4.0, f0: 1.3, f1: 0.95 },
  ], 'ENS', 2);
  colonnade(B, FX - 0.75, z0 + 3.2, z1 - 3.2, 6, 6.8, 11.2, 0.72);
  for (const z of [z0 + 0.9, z1 - 0.9]) B.stone.box(FX - 0.75, 6.8, z, 1.5, 11.2, 1.8, { flood: 1.0 });
  B.stone.box(-52, 18, zc, 36.6, 1.9, z1 - z0 + 0.6, { flood: 0.95 });
  B.stone.box(-52, 19.9, zc, 37.8, 0.6, z1 - z0 + 1.8, { flood: 0.95 });
  const y = tiers(B, { x0: -70, x1: FX, z0, z1 }, 20.5, [
    { h: 1.3, style: 'stone', inset: 0.3, f0: 0.8, f1: 0.75 },
  ], 'ENS', 0);
  extra.flags.push({ x: -40, y, z: zc, h: 7 });
}

function hankouRoadNorth(B) {
  // 1920s brick office block with shops at street level (shopfronts are added in street.js)
  const fp = { x0: -150, x1: -64.2, z0: -42, z1: -L.street.halfW };
  tiers(B, fp, 0, [
    { h: 4.3, style: 'stoneDark', f0: 0.5, f1: 0.5, cornice: { out: 0.25, h: 0.35 } },
    { h: 14.4, style: 'brick', floors: 4, bay: 3.4, f0: 0.55, f1: 0.2, cornice: { out: 0.5, h: 0.6 } },
    { h: 3.6, style: 'brick', floors: 1, bay: 3.4, inset: 0.4, f0: 0.25, f1: 0.18 },
  ], 'SE', 2);
  // drainpipes and a few air-conditioner boxes: the street is lived in
  for (const x of [-71.2, -81.4, -88.2]) B.roof.box(x, 4.3, fp.z1 + 0.12, 0.16, 14.4, 0.16);
  for (const [x, y] of [[-68.5, 6.2], [-75.3, 9.8], [-78.7, 6.2], [-85.5, 13.4], [-89, 9.8]]) {
    B.stone.box(x, y, fp.z1 + 0.3, 0.9, 0.65, 0.5, { flood: 0.35 });
    B.roof.box(x, y - 0.12, fp.z1 + 0.3, 1.0, 0.1, 0.6);
  }
}

// ---------- the rest of the row ----------

function genericBlock(B, extra, z0, z1, h, { style = 'classic', seed = 0, feature = null, x0 = -84, gain = 1, holes = null } = {}) {
  const base = 7, attic = 4.2, floors = Math.max(1, Math.round((h - base - attic) / 4.4));
  const y = tiers(B, { x0, x1: FX, z0, z1, holes }, 0, [
    { h: base, style: style === 'brick' ? 'rustic' : style === 'deco' ? 'deco' : 'rustic', bay: 4.2, f0: 1.05 * gain, f1: 0.85 * gain, cornice: { out: 0.4, h: 0.6 } },
    { h: h - base - attic, style, floors, bay: 4.2, f0: 0.95 * gain, f1: 0.6 * gain, cornice: { out: 0.85, h: 0.9 } },
    { h: attic, style: style === 'deco' ? 'deco' : 'classic', floors: 1, bay: 4.2, inset: 0.5, f0: 0.85 * gain, f1: 0.7 * gain, cornice: { out: 0.4, h: 0.5 } },
  ], 'ENS', seed);
  const zc = (z0 + z1) / 2;
  if (feature === 'cupolas') {
    for (const z of [z0 + 3.5, z1 - 3.5]) {
      B.stone.cyl(FX - 3.5, y, z, 2.6, 2.6, 5, 12, { flood: 1.1, tileU: 4, tileV: 2 });
      B.copper.add(new THREE.SphereGeometry(2.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), { x: FX - 3.5, y: y + 5, z, flood: 0.9 });
    }
  } else if (feature === 'pediment') {
    const g = new THREE.CylinderGeometry(7, 7, 1.2, 3); g.rotateZ(Math.PI / 2); g.rotateX(Math.PI / 2); g.scale(1, 0.45, 1);
    B.stone.add(g, { x: FX - 1, y: y + 1.5, z: zc, flood: 1.0 });
  } else if (feature === 'tower') {
    const ty = tiers(B, { x0: FX - 13, x1: FX - 1, z0: zc - 6, z1: zc + 6 }, y, [
      { h: 12, style, floors: 3, bay: 4, f0: 1.0, f1: 0.75, cornice: { out: 0.5, h: 0.6 } }], 'ENSW', seed + 3);
    B.copper.add(new THREE.ConeGeometry(5.2, 6, 4).rotateY(Math.PI / 4), { x: FX - 7, y: ty + 3, z: zc, flood: 0.9 });
  }
  extra.flags.push({ x: FX - 6, y, z: zc, h: 7 });
  return y;
}

function aiaBuilding(B, extra, z0, z1) {
  // No.17, the AIA Building (former North China Daily News, 1924): granite neo-Renaissance, a two-storey
  // rusticated base, five storeys under a giant order, a heavy cornice, then the two baroque towers
  // that crown the Bund corners. Its entrance, a tall arched doorway at the centre of the Bund front,
  // opens on the lobby (world/interiors/aia.js).
  const zc = (z0 + z1) / 2;
  tiers(B, { x0: -84, x1: FX, z0, z1, holes: { E: [[zc - 1.7, zc + 1.7, 4.75]] } }, 0, [         // the doorway is a real opening (the lobby: world/interiors.js)
    { h: 8.2, style: 'rustic', bay: 4.1, f0: 1.15, f1: 0.95, cornice: { out: 0.45, h: 0.7 } },
  ], 'ENS', 21);
  tiers(B, { x0: -84, x1: FX - 1.2, z0, z1 }, 8.2, [
    { h: 18.4, style: 'arched', floors: 5, bay: 4.1, f0: 1.25, f1: 0.75 },
  ], 'ENS', 22);
  colonnade(B, FX - 0.6, z0 + 6.2, z1 - 6.2, 4, 8.2, 18.4, 0.62);                       // the giant order, framing the centre bays
  for (const z of [z0 + 1.2, z1 - 1.2]) B.stone.box(FX - 0.6, 8.2, z, 1.4, 18.4, 2.4, { flood: 1.05 });   // corner piers
  B.stone.box(-59, 26.6, zc, 50.4, 1.6, z1 - z0 + 0.8, { flood: 0.95 });                 // the cornice
  const y = tiers(B, { x0: -84, x1: FX, z0, z1 }, 28.2, [
    { h: 4.4, style: 'classic', floors: 1, bay: 4.1, inset: 0.8, f0: 0.9, f1: 0.7, cornice: { out: 0.35, h: 0.5 } },
  ], 'ENS', 23);
  // the two corner towers: square drums, then small domes and lanterns
  for (const z of [z0 + 4, z1 - 4]) {
    const ty = tiers(B, { x0: FX - 8, x1: FX - 1, z0: z - 3.5, z1: z + 3.5 }, y, [
      { h: 6, style: 'arched', floors: 1, bay: 3.5, f0: 1.15, f1: 0.9, cornice: { out: 0.4, h: 0.5 } }], 'ENSW', 24);
    B.copper.add(new THREE.SphereGeometry(3.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { x: FX - 4.5, y: ty, z, flood: 0.95 });
    B.stone.cyl(FX - 4.5, ty + 3.2, z, 0.8, 0.8, 2.2, 10, { flood: 1.0, tileU: 2, tileV: 1 });
    B.copper.add(new THREE.ConeGeometry(0.9, 1.6, 10), { x: FX - 4.5, y: ty + 6.2, z, flood: 0.9 });
  }
  // the entrance: a tall opening in the rusticated base framed by stone jambs and a heavy lintel
  for (const s of [-1, 1]) B.stone.box(FX + 0.25, 0, zc + s * 2.15, 0.6, 7.2, 0.9, { flood: 1.3 });
  B.stone.box(FX + 0.25, 4.75, zc, 0.6, 2.45, 5.2, { flood: 1.3 });
  extra.flags.push({ x: FX - 4.5, y: y + 9, z: zc, h: 6 });
  return y;
}

function peaceHotel(B, extra, z0, z1) {
  // Sassoon House: the green copper pyramid that everyone knows
  genericBlock(B, extra, z0, z1, 40, { style: 'deco', seed: 5, holes: { S: [[-50, -46, 3.2]] } });   // the revolving door on Nanjing Road is a real opening (world/interiors.js)
  const zc = z1 - 9;
  const y = tiers(B, { x0: FX - 17, x1: FX - 1, z0: zc - 8, z1: zc + 8 }, 40, [
    { h: 13, style: 'deco', floors: 3, bay: 4, f0: 1.1, f1: 0.85, cornice: { out: 0.4, h: 0.6 } }], 'ENSW', 2);
  const pyr = new THREE.ConeGeometry(11.6, 22, 4); pyr.rotateY(Math.PI / 4);
  B.copper.add(pyr, { x: FX - 9, y: y + 11, z: zc, flood: (x, yy) => 1.35 - 0.6 * ((yy - y) / 22) });
}

function backdrop(group) {
  // taller, later towers standing behind the old row
  const b = new Batch(), r = rng(88);
  const add = (x, z, w, h) => {
    const g = new THREE.BoxGeometry(w, h, w), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 3 / 64 + r(), (uv.getY(i) * h) / 4 / 64);
    g.translate(x, h / 2, z); b.push(g);
  };
  add(-250, 150, 46, 190); add(-210, -120, 40, 130); add(-300, -20, 44, 160); add(-230, 300, 42, 140);
  add(-280, -260, 46, 170); add(-200, 30, 36, 96); add(-340, 220, 50, 150);
  const mat = new THREE.MeshBasicMaterial({ map: towerAtlas(14, 0.5) }); mat.color.setScalar(0.8);
  group.add(b.mesh(mat, 'backdrop'));
  // crown on the tallest (a nod to the Bund Center's lotus)
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(30, 20, 14, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.55, 0.3), side: THREE.DoubleSide }));
  crown.position.set(-250, 197, 150); group.add(crown);
}

export function createBund(M) {
  const group = new THREE.Group(); group.name = 'bund';
  const B = batchSet(NAMES);
  const extra = { flags: [], clock: null };

  customsHouse(B, extra);
  hsbc(B, extra);
  bankOfCommunications(B, extra);
  russoChinese(B, extra);
  hankouRoadNorth(B);

  // north of No.15, up to and past Nanjing Road
  genericBlock(B, extra, -91, -65.4, 20, { style: 'arched', seed: 1, feature: 'pediment' });
  genericBlock(B, extra, -117, -91.4, 33, { style: 'classic', seed: 2, feature: 'cupolas' });
  aiaBuilding(B, extra, -160, -131);
  genericBlock(B, extra, -190, -160.4, 28, { style: 'brick', seed: 4, feature: 'cupolas', gain: 1.5 });
  peaceHotel(B, extra, -252, -212);
  const boc = genericBlock(B, extra, -292, -253, 58, { style: 'deco', seed: 6 });
  B.roof.add(new THREE.ConeGeometry(22, 7, 4).rotateY(Math.PI / 4), { x: FX - 20, y: boc + 3.5, z: -272.5 });
  genericBlock(B, extra, -332, -294, 30, { style: 'classic', seed: 7, feature: 'tower' });
  genericBlock(B, extra, -372, -333, 26, { style: 'arched', seed: 8 });
  genericBlock(B, extra, -430, -373, 34, { style: 'classic', seed: 9 });
  // south of HSBC, past Fuzhou Road
  genericBlock(B, extra, 132, 170, 30, { style: 'arched', seed: 10, feature: 'cupolas' });
  genericBlock(B, extra, 170.4, 206, 39, { style: 'classic', seed: 11, feature: 'tower' });
  genericBlock(B, extra, 206.4, 250, 26, { style: 'arched', seed: 12, feature: 'pediment' });
  genericBlock(B, extra, 262, 302, 44, { style: 'deco', seed: 13 });
  genericBlock(B, extra, 302.4, 350, 28, { style: 'classic', seed: 14 });
  genericBlock(B, extra, 350.4, 430, 35, { style: 'arched', seed: 15, feature: 'cupolas' });
  // what closes the view down Hankou Road, beyond the hoarding
  tiers(B, { x0: -190, x1: -162, z0: -40, z1: 40 }, 0, [
    { h: 6, style: 'rustic', bay: 4, f0: 0.9, f1: 0.7, cornice: { out: 0.3, h: 0.5 } },
    { h: 17, style: 'classic', floors: 4, bay: 4, f0: 0.8, f1: 0.45, cornice: { out: 0.6, h: 0.7 } },
  ], 'E', 3);

  flush(B, M, group, 'bund-');
  backdrop(group);

  // clock dials on all four faces of the Customs House tower
  const c = extra.clock, dials = new Batch(), dial = new THREE.CircleGeometry(3.3, 40);
  dials.add(dial, { x: c.x + c.half, y: c.y, z: c.z, ry: Math.PI / 2 });
  dials.add(dial, { x: c.x - c.half, y: c.y, z: c.z, ry: -Math.PI / 2 });
  dials.add(dial, { x: c.x, y: c.y, z: c.z + c.half });
  dials.add(dial, { x: c.x, y: c.y, z: c.z - c.half, ry: Math.PI });
  const dm = new THREE.MeshBasicMaterial({ map: dialTexture() }); dm.color.setScalar(1.25);
  group.add(dials.mesh(dm, 'clock-dials'));

  // roof flags
  const poles = new Batch(), flags = [];
  const flagMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.07, 0.05), side: THREE.DoubleSide });
  const flagGeo = new THREE.PlaneGeometry(3.6, 2.4, 6, 1); flagGeo.translate(1.8, 0, 0);
  for (const f of extra.flags) {
    poles.cyl(f.x, f.y, f.z, 0.07, 0.1, f.h, 6);
    if (Math.abs(f.z) > 300) continue;
    const m = new THREE.Mesh(flagGeo.clone(), flagMat);
    m.position.set(f.x, f.y + f.h - 1.3, f.z); m.rotation.y = 0.9;
    flags.push(m); group.add(m);
  }
  group.add(poles.mesh(M.iron, 'flag-poles'));

  return {
    group,
    update(t) {
      // a light river breeze: ripple travels along each flag
      for (let k = 0; k < flags.length; k++) {
        const p = flags[k].geometry.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 1.7 - t * 3.2 + k) * 0.11 * x); }
        p.needsUpdate = true;
        flags[k].rotation.y = 0.9 + Math.sin(t * 0.21 + k) * 0.25;
      }
    },
  };
}
