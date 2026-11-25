// Lujiazui's structures: the ring bridge and its stairs, the Apple plaza, its glass cylinder and the store under it, IFC,
// the metro's stairwells, the Central Green's furniture, the towers around, lamps and signs. Static
// geometry, merged per material (world/geo.js Batch and the Tris helper below). Where things are comes
// from world/lujiazuiLayout.js; nothing here decides a position you can stand on.
import * as THREE from 'three';
import { siApple } from 'simple-icons';
import { Batch } from './geo.js';
import { makeCanvas, tex, rng, FONT, glowTexture } from './canvas.js';
import { asLight, TOD } from './dayNight.js';
import { markCanvas } from '../ui/brands.js';
import { LINE_COLOR } from './nanjingRoad.js';
import {
  C, RC, RING, ARMS, COLUMNS, SPUR, RAMPS, APPLE, METRO_LJZ, IFC, BUILDINGS, GREEN, LAKE, CANOPY, LOOP, BENCHES, YIN, ZEBRAS, CH, AVE, AVE_ROT, LOBBY, PEARL_PARK,
  dirOf, polar, rpolar, fromAP, toAP, applePt, wellPt, carriage, inDistrict, inLake, inGreen, inPoly, inBuilding, polyDist, loopPt, addBox, addCircle, LJZ, rampY, stepsY,
} from './lujiazuiLayout.js';
import { facadeGlass } from './facade.js';
import { kindAt, KIND, parkPath } from './lujiazuiGround.js';

const D2R = Math.PI / 180;
const std = (o) => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, ...o });
const lit = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide, ...o });

// loose triangles with flat normals and planar UVs in metres (for everything that isn't a box)
export class Tris {
  constructor(tile = 2) { this.p = []; this.n = []; this.u = []; this.tile = tile; }
  tri(a, b, c, uv = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (this.keepDown ? ny > 0.3 : ny < -0.3) { nx = -nx; ny = -ny; nz = -nz; const q = b; b = c; c = q; if (uv) uv = [uv[0], uv[2], uv[1]]; }   // floors face up (ceilings down), whatever order they came in
    const t = this.tile, h = Math.hypot(nx, nz) || 1, tx = -nz / h, tz = nx / h, flat = Math.abs(ny) > 0.7;
    [a, b, c].forEach((q, i) => {
      this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz);
      if (uv) this.u.push(uv[i][0], uv[i][1]); else if (flat) this.u.push(q[0] / t, -q[2] / t); else this.u.push((q[0] * tx + q[2] * tz) / t, q[1] / t);
    });
    return this;
  }
  quad(a, b, c, d, uv = null) { this.tri(a, b, c, uv && [uv[0], uv[1], uv[2]]); return this.tri(a, c, d, uv && [uv[0], uv[2], uv[3]]); }
  // an upright wall between two ground points; uv: [u0, v0, u1, v1]
  wall(x0, z0, x1, z1, y0, y1, uv = null) { return this.quad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], uv && [[uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]]); }
  // a flat annular sector about o (bearings in degrees), facing up
  arc(o, r0, r1, b0, b1, y, seg = 0) {
    const n = seg || Math.max(1, Math.ceil(Math.abs(b1 - b0) / 4));
    for (let i = 0; i < n; i++) { const a = b0 + (b1 - b0) * i / n, b = b0 + (b1 - b0) * (i + 1) / n, [x0, z0] = polar(a, r0, o), [x1, z1] = polar(a, r1, o), [x2, z2] = polar(b, r1, o), [x3, z3] = polar(b, r0, o); this.quad([x0, y, z0], [x1, y, z1], [x2, y, z2], [x3, y, z3]); }
    return this;
  }
  // a curved upright wall about o; y0 / y1 may be functions of the bearing
  drum(o, r, b0, b1, y0, y1, seg = 0, uvw = null) {
    const n = seg || Math.max(1, Math.ceil(Math.abs(b1 - b0) / 4)), f = (v, b) => (typeof v === 'function' ? v(b) : v);
    for (let i = 0; i < n; i++) {
      const a = b0 + (b1 - b0) * i / n, b = b0 + (b1 - b0) * (i + 1) / n, [x0, z0] = polar(a, r, o), [x1, z1] = polar(b, r, o);
      const uv = uvw ? [[uvw * i / n, 0], [uvw * (i + 1) / n, 0], [uvw * (i + 1) / n, 1], [uvw * i / n, 1]] : null;
      this.quad([x0, f(y0, a), z0], [x1, f(y0, b), z1], [x1, f(y1, b), z1], [x0, f(y1, a), z0], uv);
    }
    return this;
  }
  get empty() { return !this.p.length; }
  geometry() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); return g; }
  mesh(mat, name = '') { const m = new THREE.Mesh(this.geometry(), mat); m.name = name; m.matrixAutoUpdate = false; return m; }
}
// a box turned to any heading: local x along (ux, uz)
function obox(batch, cx, y0, cz, ux, uz, lenX, h, lenZ, tile = 2) { batch.box(cx, y0, cz, lenX, h, lenZ, { rotY: Math.atan2(-uz, ux), tile }); }
const noise = (seed, base, spread, size = 256, blotch = 0) => {
  const [c, x] = makeCanvas(size, size), r = rng(seed); x.fillStyle = `rgb(${base.join(',')})`; x.fillRect(0, 0, size, size);
  const img = x.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * spread; d[i] += n; d[i + 1] += n * 1.1; d[i + 2] += n * 0.8; }
  x.putImageData(img, 0, 0);
  for (let i = 0; i < blotch; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '20,40,10' : '120,140,60'},${0.05 + r() * 0.08})`; x.beginPath(); x.ellipse(r() * size, r() * size, 8 + r() * 30, 6 + r() * 20, r() * 3, 0, 7); x.fill(); }
  return tex(c, { aniso: 8 });
};
// every string drawn into a texture here (so the fonts can be asked for their glyphs before building)
export { LJZ_TEXT } from './lujiazuiLayout.js';   // (kept in the layout so the district's signs can ask for their glyphs before this module loads)

// ================= materials =================
export function ljzMaterials(M) {
  const grassMap = noise(71, [58, 92, 44], 26, 256, 60); grassMap.repeat.set(1 / 3, 1 / 3);
  const pathMap = noise(72, [176, 170, 158], 16);
  // pavement: pale granite setts, 60 cm, as Lujiazui's are (the Bund's own paving is darker stone)
  const paveMap = (() => { const t = noise(73, [150, 149, 144], 18), c = t.image, x = c.getContext('2d'); x.strokeStyle = 'rgba(70,70,68,0.55)'; x.lineWidth = 1.5; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); } t.needsUpdate = true; return t; })();
  const m = {
    road: M.asphalt, pave: std({ map: paveMap, roughness: 0.82, side: THREE.FrontSide }), granite: M.granite,
    grass: std({ map: grassMap, roughness: 0.95, side: THREE.FrontSide }), path: std({ map: pathMap, roughness: 0.8, side: THREE.FrontSide }),
    paint: std({ color: 0xdedcd4, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    yellow: std({ color: 0xcfa21c, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    deck: std({ map: pathMap, color: 0xcfcac0, roughness: 0.7 }), fascia: std({ color: 0xd9dcdf, roughness: 0.35, metalness: 0.55 }), under: std({ color: 0x8e9296, roughness: 0.8 }),
    concrete: std({ color: 0xa9aaa8, roughness: 0.75 }), steel: std({ color: 0xb4babf, roughness: 0.28, metalness: 0.9 }), dark: std({ color: 0x1b1e22, roughness: 0.4, metalness: 0.6 }),
    glass: std({ color: 0xa9c6cc, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.6 }),
    appleGlass: new THREE.MeshPhysicalMaterial({ color: 0xc4e2e0, emissive: 0x1c2a2c, roughness: 0.02, metalness: 0.15, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02 }),
    stone: std({ map: pathMap, color: 0xe2ddd0, roughness: 0.6 }), stoneWarm: std({ color: 0xd9cdb6, roughness: 0.7 }), white: std({ color: 0xf1f0ec, roughness: 0.7 }),
    wood: std({ color: 0xb48a58, roughness: 0.55 }), hedge: std({ color: 0x25401f, roughness: 0.95 }), water: std({ color: 0x24403f, roughness: 0.08, metalness: 0.2, envMapIntensity: 1.4 }),
    tile: std({ color: 0xbfc2c0, roughness: 0.4 }), rubber: std({ color: 0x141416, roughness: 0.7 }), membrane: std({ color: 0xf6f5f0, roughness: 0.85, emissive: 0x30302c }),
    flowerRed: std({ color: 0xb8262c, roughness: 0.9 }), flowerYellow: std({ color: 0xd9a514, roughness: 0.9 }), flowerViolet: std({ color: 0x6c3f9a, roughness: 0.9 }),
    lamp: asLight(lit(2.2, 1.9, 1.5), 'lamps', 0.45), led: asLight(lit(1.2, 1.5, 2.1), 'lamps', 0.25), ledWarm: asLight(lit(2.0, 1.6, 1.1), 'lamps', 0.3),
    hoard: std({ color: 0x2f6aa8, roughness: 0.7 }),
  };
  return m;
}

// ================= the ring bridge =================
export function buildBridge(g, m, lights) {
  const top = new Tris(2.4), fas = new Tris(), und = new Tris(), gl = new Tris(), st = new Batch(), con = new Batch(), led = new Tris(), steps = new Batch(), dark = new Batch();
  const Y = RING.y, yU = Y - RING.thick, [sdx, sdz] = dirOf(SPUR.b), [spx, spz] = dirOf(SPUR.b + 90);
  // where the outer rail is open: the tops of the stairs, the spur
  const gaps = [...RAMPS.filter((r) => r.kind === 'ring').map((r) => [r.b, Math.asin(r.hw / RING.r1) / D2R]), [SPUR.b, Math.asin(SPUR.hw / RING.r1) / D2R]];
  const open = (b) => gaps.some(([c, w]) => Math.abs(((b - c + 540) % 360) - 180) < w);
  top.arc(RC, RING.r0, RING.r1, 0, 360, Y, 120); und.arc(RC, RING.r0, RING.r1, 0, 360, yU, 120);
  fas.drum(RC, RING.r1 + 0.05, 0, 360, yU, Y + 0.28, 120); fas.drum(RC, RING.r0 - 0.05, 0, 360, yU, Y + 0.28, 120);
  led.drum(RC, RING.r1 + 0.07, 0, 360, yU + 0.04, yU + 0.14, 120); led.drum(RC, RING.r0 - 0.07, 0, 360, yU + 0.04, yU + 0.14, 120);
  // glass balustrades with a steel rail, a light under the rail
  for (let b = 0; b < 360; b += 3) {
    const rail = (r) => { const [x0, z0] = rpolar(b, r), [x1, z1] = rpolar(b + 3, r); gl.wall(x0, z0, x1, z1, Y + 0.28, Y + 1.2); const [dx, dz] = dirOf(b + 91.5); obox(st, (x0 + x1) / 2, Y + 1.2, (z0 + z1) / 2, dx, dz, Math.hypot(x1 - x0, z1 - z0) + 0.02, 0.06, 0.09); };
    rail(RING.r0 + 0.14);
    if (!open(b + 1.5)) rail(RING.r1 - 0.14);
  }
  for (let b = 0; b < 360; b += 12) for (const r of [RING.r0 + 0.14, RING.r1 - 0.14]) { if (r > RING.rc && open(b)) continue; const [x, z] = rpolar(b, r); st.box(x, Y + 0.2, z, 0.06, 1.0, 0.06); }
  // columns: a round shaft flaring into the deck
  for (const b of COLUMNS) { const [x, z] = rpolar(b, RING.rc); con.cyl(x, CH, z, 0.62, 0.72, 3.3, 20); con.cyl(x, CH + 3.3, z, 2.0, 0.62, yU - CH - 3.3, 20); con.cyl(x, CH, z, 0.95, 1.0, 0.25, 20); }
  // the spur toward IFC: a wide deck
  const sp = (s, l, y) => [RC.x + sdx * s + spx * l, y, RC.z + sdz * s + spz * l];
  top.quad(sp(RING.r1 - 0.3, -SPUR.hw, Y), sp(SPUR.s1, -SPUR.hw, Y), sp(SPUR.s1, SPUR.hw, Y), sp(RING.r1 - 0.3, SPUR.hw, Y));
  und.quad(sp(RING.r1 - 0.3, -SPUR.hw, yU), sp(SPUR.s1, -SPUR.hw, yU), sp(SPUR.s1, SPUR.hw, yU), sp(RING.r1 - 0.3, SPUR.hw, yU));
  const SR = RAMPS[RAMPS.length - 1];
  for (const s of [-1, 1]) {
    const a = sp(RING.r1, s * SPUR.hw, 0), b = sp(SPUR.s1, s * SPUR.hw, 0), e = sp(SPUR.s1, s * SR.hw, 0);
    fas.wall(a[0], a[2], b[0], b[2], yU, Y + 0.28); gl.wall(a[0], a[2], b[0], b[2], Y + 0.28, Y + 1.2); obox(st, (a[0] + b[0]) / 2, Y + 1.2, (a[2] + b[2]) / 2, sdx, sdz, SPUR.s1 - RING.r1, 0.06, 0.09);
    fas.wall(b[0], b[2], e[0], e[2], yU, Y + 0.28); gl.wall(b[0], b[2], e[0], e[2], Y + 0.28, Y + 1.2);
  }
  { const [x, z] = rpolar(SPUR.b, SPUR.s1 - 1.2); for (const l of [-4.6, 4.6]) { con.cyl(x + spx * l, CH, z + spz * l, 0.5, 0.6, yU - CH, 16); addCircle(x + spx * l, z + spz * l, 0.6, { y1: 5 }); } }
  // stairs (and, on the ring's four, a pair of escalators beside them)
  for (const R of RAMPS) {
    const n = 34, rise = (R.y1 - R.y0) / n, go = R.run / n, P = (t, l, y) => [R.top[0] + R.dx * t + R.px * l, y, R.top[1] + R.dz * t + R.pz * l];
    const yAt = (t) => R.y1 + (R.y0 - R.y1) * (t / R.run), esc = R.kind === 'ring';
    const l0 = -R.hw, l1 = esc ? 0 : R.hw, lc = (l0 + l1) / 2;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) * go, y = R.y1 - (i + 1) * rise, [x, , z] = P(t, lc, 0); obox(steps, x, y - 0.25, z, R.px, R.pz, l1 - l0, 0.25 + rise, go + 0.02); }
    if (esc) {                                               // two escalators: dark treads on a slope, black handrails on glass
      for (const [a, b] of [[0.25, 1.45], [1.65, 2.85]]) {
        und.quad(P(0, a, R.y1 + 0.012), P(R.run, a, R.y0 + 0.012), P(R.run, b, R.y0 + 0.012), P(0, b, R.y1 + 0.012));
        for (const l of [a, b]) { gl.quad(P(0, l, R.y1), P(R.run, l, R.y0), P(R.run, l, R.y0 + 0.95), P(0, l, R.y1 + 0.95)); const mid = P(R.run / 2, l, (R.y0 + R.y1) / 2 + 0.95); const len = Math.hypot(R.run, R.y1 - R.y0); const geo = new THREE.BoxGeometry(0.09, 0.07, len); geo.rotateX(Math.atan2(R.y1 - R.y0, R.run)); geo.rotateY(Math.atan2(R.dx, R.dz)); geo.translate(mid[0], mid[1], mid[2]); dark.push(geo); }
      }
      for (let i = 0; i < 60; i++) { const t = (i + 0.5) * R.run / 60; for (const c of [0.85, 2.25]) { const q = P(t, c, yAt(t) + 0.016), geo = new THREE.BoxGeometry(1.1, 0.012, 0.035); geo.rotateY(Math.atan2(-R.pz, R.px)); geo.translate(q[0], q[1], q[2]); dark.push(geo); } }
    }
    // the flight's flanks (a solid wedge down to the pavement), glass and a rail up each side
    for (const l of [-R.hw, R.hw]) {
      fas.quad(P(0, l, yU), P(0, l, R.y1 + 0.28), P(R.run, l, R.y0 + 0.28), P(R.run, l, R.y0)); fas.tri(P(0, l, yU), P(R.run, l, R.y0), P(0, l, CH));
      gl.quad(P(0, l, R.y1 + 0.28), P(R.run, l, R.y0 + 0.28), P(R.run, l, R.y0 + 1.2), P(0, l, R.y1 + 1.2));
      const mid = P(R.run / 2, l, (R.y0 + R.y1) / 2 + 1.2), len = Math.hypot(R.run, R.y1 - R.y0), geo = new THREE.BoxGeometry(0.09, 0.06, len); geo.rotateX(Math.atan2(R.y1 - R.y0, R.run)); geo.rotateY(Math.atan2(R.dx, R.dz)); geo.translate(mid[0], mid[1], mid[2]); st.push(geo);
    }
    fas.quad(P(0, -R.hw, CH), P(0, R.hw, CH), P(0, R.hw, yU), P(0, -R.hw, yU));
    if (!esc) { const mid = P(R.run / 2, 0, (R.y0 + R.y1) / 2 + 0.95), len = Math.hypot(R.run, R.y1 - R.y0), geo = new THREE.BoxGeometry(0.07, 0.07, len); geo.rotateX(Math.atan2(R.y1 - R.y0, R.run)); geo.rotateY(Math.atan2(R.dx, R.dz)); geo.translate(mid[0], mid[1], mid[2]); st.push(geo); }
    lights.push({ x: R.top[0] + R.dx * R.run * 0.5, y: 5.2, z: R.top[1] + R.dz * R.run * 0.5, intensity: 26, distance: 16, color: new THREE.Color(1.0, 0.93, 0.82), out: true });
  }
  for (let b = 0; b < 360; b += 30) { const [x, z] = rpolar(b + 15, RING.rc); lights.push({ x, y: Y + 2.4, z, intensity: 30, distance: 16, color: new THREE.Color(1.0, 0.92, 0.8), out: true }); }
  for (let b = 0; b < 360; b += 45) { const [x, z] = rpolar(b + 7, RING.rc); lights.push({ x, y: yU - 0.3, z, intensity: 22, distance: 14, color: new THREE.Color(0.85, 0.92, 1.0), out: true }); }
  const meshes = [top.mesh(m.deck, 'ljz-deck'), fas.mesh(m.fascia, 'ljz-fascia'), und.mesh(m.under, 'ljz-under'), st.mesh(m.steel, 'ljz-bridge-steel'), con.mesh(m.concrete, 'ljz-columns'), steps.mesh(m.granite, 'ljz-steps'), dark.mesh(m.rubber, 'ljz-escalators'), led.mesh(m.led, 'ljz-bridge-led')];
  for (const o of meshes) { o.castShadow = true; o.receiveShadow = true; g.add(o); }
  const glass = gl.mesh(m.glass, 'ljz-bridge-glass'); glass.renderOrder = 3; g.add(glass);
}

// ================= Apple Pudong =================
function appleLogo() {
  const [c, x] = makeCanvas(512, 512); x.clearRect(0, 0, 512, 512);
  const s = 512 * 0.8 / 24; x.translate(512 * 0.1, 512 * 0.1); x.scale(s, s); x.fillStyle = '#fff'; x.fill(new Path2D(siApple.path));
  return tex(c, { repeat: false, aniso: 8 });
}
export function buildApple(g, m, lights, trees = []) {
  const A = APPLE, yP = A.yPlaza, yS = A.yStore, o = A, E = A.entry, yCeil = yP - 1.0, T = A.steps, RP = A.ramp;
  const floor = new Tris(1.6), band = new Tris(1.6), ag = new Tris(), seam = new Batch(), st = new Batch(), wood = new Batch(), ceil = new Tris(), storeWall = new Tris(), treads = new Tris(), dark = new Batch(), oak = new Tris(1.2);
  const wallT = new Tris(2), gl = new Tris(), deck = new Tris(1.6), fascia = new Tris(), shopT = new Tris(), soil = new Tris(), glassFloor = new Tris(), stone = new Batch();
  const B = (ang) => E + ang, P3 = (ang, r, y) => { const [x, z] = polar(E + ang, r, o); return [x, y, z]; };
  // ---- the court's floor: pale granite, darker bands; a ring of glass floor round the cylinder's foot, over the store
  floor.arc(o, A.rCyl + 1.5, A.rPlaza, 0, 360, yP, 90);
  floor.arc(o, A.rCore, A.rCyl + 0.6, B(A.landing[0]), B(A.landing[1]), yP, 12);                   // the landing inside the cylinder
  glassFloor.arc(o, A.rCyl + 0.05, A.rCyl + 1.5, 0, 360, yP + 0.003, 72);
  floor.arc(o, A.rPlaza, A.rampIn, B(T.wall), B(360 - T.wall), yP, 60);                           // the floor's edge before the shops
  for (const [r0, r1] of [[A.rCyl + 1.5, A.rCyl + 1.8], [11.7, 12.05], [A.rPlaza - 0.4, A.rPlaza]]) band.arc(o, r0, r1, 0, 360, yP + 0.004, 90);
  for (let i = 0; i < 24; i++) { const b = E + 7.5 + i * 15, [x0, z0] = polar(b, A.rCyl + 1.8, o), [x1, z1] = polar(b, A.rPlaza - 0.4, o), [dx, dz] = dirOf(b); obox(seam, (x0 + x1) / 2, yP - 0.004, (z0 + z1) / 2, dx, dz, Math.hypot(x1 - x0, z1 - z0), 0.012, 0.05); }
  // ---- the broad steps down from the street, toward the ring: 38 treads, side walls with glass on top
  const nS = 38, run = (T.r1 - T.r0) / nS, riseS = (CH - yP) / nS;
  for (let i = 0; i < nS; i++) { const r0 = T.r0 + i * run, y = yP + (i + 1) * riseS; floor.arc(o, r0, r0 + run, B(-T.wall), B(T.wall), y, 18); wallT.drum(o, r0, B(-T.wall), B(T.wall), y - riseS, y, 18); }
  for (const sg of [-1, 1]) {
    const ray = sg * T.wall, yStep = (r) => stepsY(r);
    for (let i = 0; i < 14; i++) { const r0 = T.r0 + (T.r1 - T.r0) * i / 14, r1 = T.r0 + (T.r1 - T.r0) * (i + 1) / 14, a = P3(ray, r0, 0), b = P3(ray, r1, 0);
      wallT.quad([a[0], yP, a[2]], [b[0], yP, b[2]], [b[0], CH + 0.4, b[2]], [a[0], CH + 0.4, a[2]]);
      gl.quad([a[0], yStep(r0) + 0.1, a[2]], [b[0], yStep(r1) + 0.1, b[2]], [b[0], Math.max(CH + 0.4, yStep(r1) + 1.1), b[2]], [a[0], Math.max(CH + 0.4, yStep(r0) + 1.1), a[2]]);
      gl.quad([a[0], CH + 0.4, a[2]], [b[0], CH + 0.4, b[2]], [b[0], CH + 1.2, b[2]], [a[0], CH + 1.2, a[2]]); }
    const s0 = P3(ray, T.r0, 0), s1 = P3(ray, T.r1, 0); obox(st, (s0[0] + s1[0]) / 2, CH + 1.2, (s0[2] + s1[2]) / 2, s1[0] - s0[0], s1[2] - s0[2], Math.hypot(s1[0] - s0[0], s1[2] - s0[2]), 0.05, 0.08);
    // the strip between the steps' wall and the walkway's top: solid, at street level
    wallT.arc(o, A.rPlaza, A.rail, B(sg > 0 ? T.wall : -RP.a0), B(sg > 0 ? RP.a0 : -T.wall), CH + 0.4, 3);
  }
  // planters with trees on the steps
  for (const p of A.stepTrees) { const [x, z] = applePt(p.ang, p.r), y = stepsY(p.r + p.rr); stone.cyl(x, stepsY(p.r - p.rr) - 0.05, z, p.rr, p.rr, y - stepsY(p.r - p.rr) + 0.5, 20); trees.push({ x, z, y: y + 0.45, h: 6.5, r: 2.4, solid: false }); }
  // ---- the curved walkways either side: a deck sloping from the street to a landing at the back, a glass
  // balustrade on the court side, the retaining wall behind; the shops beneath them at the floor
  const nR = 48;
  for (const sg of [-1, 1]) for (let i = 0; i < nR; i++) {
    const a0 = RP.a0 + (180 - RP.a0) * i / nR, a1 = RP.a0 + (180 - RP.a0) * (i + 1) / nR, y0 = rampY(a0), y1 = rampY(a1), b0 = sg * a0, b1 = sg * a1;
    deck.quad(P3(b0, A.rampIn, y0), P3(b0, A.rampOut + 0.05, y0), P3(b1, A.rampOut + 0.05, y1), P3(b1, A.rampIn, y1));
    deck.quad(P3(b0, A.rampIn, y0 - 0.4), P3(b1, A.rampIn, y1 - 0.4), P3(b1, A.rampOut, y1 - 0.4), P3(b0, A.rampOut, y0 - 0.4));
    fascia.quad(P3(b0, A.rampIn, y0 - 1.0), P3(b1, A.rampIn, y1 - 1.0), P3(b1, A.rampIn, y1 + 0.02), P3(b0, A.rampIn, y0 + 0.02));
    gl.quad(P3(b0, A.rampIn + 0.08, y0), P3(b1, A.rampIn + 0.08, y1), P3(b1, A.rampIn + 0.08, y1 + 1.1), P3(b0, A.rampIn + 0.08, y0 + 1.1));
    wallT.quad(P3(b0, A.rampOut + 0.05, yP), P3(b1, A.rampOut + 0.05, yP), P3(b1, A.rampOut + 0.05, CH + 0.3), P3(b0, A.rampOut + 0.05, CH + 0.3));
    if (a0 > T.wall + 2) shopT.quad(P3(b0, A.rShop, yP), P3(b1, A.rShop, yP), P3(b1, A.rShop, y1 - 1.0), P3(b0, A.rShop, y0 - 1.0), [[i / 6, 0], [(i + 1) / 6, 0], [(i + 1) / 6, Math.min(1, (y1 - 1.0 - yP) / 3.6)], [i / 6, Math.min(1, (y0 - 1.0 - yP) / 3.6)]]);
    { const p0 = P3(b0, A.rampIn + 0.08, y0 + 1.1), p1 = P3(b1, A.rampIn + 0.08, y1 + 1.1), dv = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]), L = dv.length() + 0.02, geo = new THREE.BoxGeometry(0.07, 0.06, L);
      geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dv.normalize())); geo.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2); st.push(geo); }
  }
  // the rim: glass balustrade round the top of the wall, open where the walkways and the steps begin; the rim walk's paving; the planted bed
  const open = (ang) => Math.abs(ang) <= T.wall || (Math.abs(ang) >= RP.a0 && Math.abs(ang) <= RP.top);
  for (let i = 0; i < 120; i++) { const a0 = -180 + i * 3, a1 = a0 + 3; if (open(a0 + 1.5)) continue; gl.drum(o, A.rail, B(a0), B(a1), CH, CH + 1.1, 1); const p0 = P3(a0, A.rail, 0), p1 = P3(a1, A.rail, 0); obox(st, (p0[0] + p1[0]) / 2, CH + 1.1, (p0[2] + p1[2]) / 2, p1[0] - p0[0], p1[2] - p0[2], Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) + 0.02, 0.06, 0.09); }
  wallT.arc(o, A.rampOut + 0.05, A.rail + 0.05, B(RP.top), B(360 - RP.top), CH + 0.3, 60);
  floor.arc(o, A.rail, A.rOut, B(T.wall), B(360 - T.wall), CH, 80);
  for (const sg of [-1, 1]) floor.arc(o, A.rampIn, A.rail, B(sg > 0 ? RP.a0 : -RP.top), B(sg > 0 ? RP.top : -RP.a0), CH, 4);
  soil.arc(o, A.plant.r0, A.plant.r1, B(A.plant.a0), B(360 - A.plant.a0), CH + 0.55, 60);
  wallT.drum(o, A.plant.r0, B(A.plant.a0), B(360 - A.plant.a0), CH, CH + 0.55, 60); wallT.drum(o, A.plant.r1, B(A.plant.a0), B(360 - A.plant.a0), CH, CH + 0.55, 60);
  for (let a = A.plant.a0 + 8; a < 360 - A.plant.a0 - 4; a += 7) { const [x, z] = applePt(a, (A.plant.r0 + A.plant.r1) / 2); soil.arc({ x, z }, 0, 1.2, 0, 360, CH + 1.15, 8); soil.drum({ x, z }, 1.2, 0, 360, CH + 0.55, CH + 1.15, 8); }
  for (let a = A.plant.a0 + 18; a < 360 - A.plant.a0; a += 26) { const [x, z] = applePt(a, (A.plant.r0 + A.plant.r1) / 2 + 0.5); trees.push({ x, z, y: CH + 0.55, h: 7.5 + (a % 3), r: 2.6, solid: false }); }
  // lamps on the rim walk: a slim post, a white trumpet of a head
  for (let a = 62; a <= 298; a += 34) { const [x, z] = applePt(a, A.walk - 0.5); st.cyl(x, CH, z, 0.07, 0.09, 5.6, 10); stone.cyl(x, CH + 5.6, z, 0.12, 0.62, 0.75, 16); lights.push({ x, y: CH + 5.9, z, intensity: 18, distance: 16, color: new THREE.Color(1.0, 0.9, 0.75), out: true }); addCircle(x, z, 0.14, { y1: 3 }); }
  // planters on the court's floor: stone drums with timber seats round them, a tree in each
  for (const p of A.planters) { const [x, z] = applePt(p.ang, p.r); stone.cyl(x, yP, z, p.rr, p.rr, 0.42, 24); wood.cyl(x, yP + 0.42, z, p.rr + 0.06, p.rr + 0.06, 0.06, 24); trees.push({ x, z, y: yP + 0.48, h: 6 + (p.r % 2), r: 2.3, solid: false }); }
  // the shops' names over their fronts: an HSBC branch on the right (as you look in from the steps), a Starbucks
  // (letters and mark on the walkway's white fascia above each, as in the photographs)
  const brand = (slug, color, text, ang, w) => { const [c, x] = makeCanvas(1024, 128); x.clearRect(0, 0, 1024, 128); x.drawImage(markCanvas(slug, { color, size: 120, pad: 0.04 }), 10, 4, 120, 120); x.fillStyle = slug === 'hsbc' ? '#222' : color; x.font = `800 92px ${FONT.sans}`; x.textBaseline = 'middle'; x.fillText(text, 150, 68);
    const mat = new THREE.MeshBasicMaterial({ map: tex(c, { repeat: false, aniso: 8 }), transparent: true, side: THREE.DoubleSide, depthWrite: false }); mat.userData.todSkip = true;
    const y = rampY(Math.abs(ang)) - 0.5, [px, pz] = applePt(ang, A.rampIn - 0.34), p = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), mat); p.position.set(px, y, pz); p.rotation.y = Math.atan2(...dirOf(B(ang) + 180)); p.renderOrder = 2; g.add(p); };
  brand('hsbc', '#db0011', 'HSBC 汇丰', 112, 6.4); brand('starbucks', '#00704a', 'STARBUCKS', -128, 6.4);
  // the cylinder's door: a flat glass canopy on a slim stainless frame
  { const c = P3(0, A.rCyl + 1.1, yP + 3.2), [dx, dz] = dirOf(E), [tx, tz] = dirOf(E + 90); obox(st, c[0], c[1], c[2], tx, tz, 5.0, 0.1, 2.2); const cg = new Tris(); cg.quad([c[0] - tx * 2.4 - dx * 1.0, c[1] + 0.11, c[2] - tz * 2.4 - dz * 1.0], [c[0] + tx * 2.4 - dx * 1.0, c[1] + 0.11, c[2] + tz * 2.4 - dz * 1.0], [c[0] + tx * 2.4 + dx * 1.0, c[1] + 0.11, c[2] + tz * 2.4 + dz * 1.0], [c[0] - tx * 2.4 + dx * 1.0, c[1] + 0.11, c[2] - tz * 2.4 + dz * 1.0]); gl.p.push(...cg.p); gl.n.push(...cg.n); gl.u.push(...cg.u);
    for (const s2 of [-2.3, 2.3]) { const hx = c[0] + tx * s2 + dx * 1.9, hz = c[2] + tz * s2 + dz * 1.9, ex = c[0] + tx * s2 * 0.9, ez = c[2] + tz * s2 * 0.9, dv = new THREE.Vector3(ex - hx, 2.2, ez - hz), L = dv.length(), geo = new THREE.BoxGeometry(0.02, 0.02, L); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dv.normalize())); geo.translate((hx + ex) / 2, c[1] + 1.1, (hz + ez) / 2); st.push(geo); } }   // (hung on two rods from the glass)
  const glassFloorMat = new THREE.MeshPhysicalMaterial({ color: 0x24343a, roughness: 0.05, metalness: 0.2, clearcoat: 1, envMapIntensity: 1.5, emissive: 0x3a3226, emissiveIntensity: 0.6 });
  const addC = (o2, cast = true) => { o2.castShadow = cast; o2.receiveShadow = true; g.add(o2); return o2; };
  addC(wallT.mesh(std({ color: 0xcfcbc2, roughness: 0.65 }), 'ljz-apple-court-walls')); addC(deck.mesh(m.stone, 'ljz-apple-walkways')); addC(fascia.mesh(m.white, 'ljz-apple-fascia'));
  addC(soil.mesh(m.hedge, 'ljz-apple-planting')); addC(stone.mesh(std({ color: 0xd9d6cf, roughness: 0.6 }), 'ljz-apple-planters')); addC(glassFloor.mesh(glassFloorMat, 'ljz-apple-glass-floor'), false);
  g.add(shopT.mesh(asLight(new THREE.MeshBasicMaterial({ map: shopfronts(), side: THREE.DoubleSide }), 'shops', 0.3), 'ljz-apple-court-shops'));
  { const gm2 = gl.mesh(m.glass, 'ljz-apple-court-glass'); gm2.renderOrder = 3; g.add(gm2); }
  // ---- the glass cylinder: twelve curved panels butted with no fins or fittings, a stainless ring round the
  // top, and a shallow dome of twelve curved panels meeting a glass disc
  const yTop = yP + A.cylH, doorH = 3.0, rise = 0.55;
  ag.drum(o, A.rCyl, E + A.door, E + 360 - A.door, yP, yP + doorH, 44); ag.drum(o, A.rCyl, 0, 360, yP + doorH, yTop, 48);
  const domeY = (r) => yTop + rise * (1 - (r / A.rCyl) ** 2);
  for (let k = 0; k < 6; k++) { const r0 = A.rCyl * (1 - k / 6), r1 = A.rCyl * (1 - (k + 1) / 6); if (r1 < 0.9) { ag.arc(o, 0, r0, 0, 360, domeY(r0), 24); break; } for (let i = 0; i < 48; i++) { const b0 = i * 7.5, b1 = b0 + 7.5, [x0, z0] = polar(b0, r0, o), [x1, z1] = polar(b1, r0, o), [x2, z2] = polar(b1, r1, o), [x3, z3] = polar(b0, r1, o); ag.quad([x0, domeY(r0), z0], [x1, domeY(r0), z1], [x2, domeY(r1), z2], [x3, domeY(r1), z3]); } }
  const ring = new Tris(); ring.drum(o, A.rCyl + 0.07, 0, 360, yTop - 0.42, yTop + 0.02, 72); ring.arc(o, A.rCyl - 0.1, A.rCyl + 0.07, 0, 360, yTop + 0.02, 72); ring.drum(o, A.rCyl - 0.1, 0, 360, yTop - 0.42, yTop + 0.02, 72);
  ring.drum(o, A.rCyl + 0.05, 0, 360, yP, yP + 0.12, 72);                                        // a stainless shoe at the foot
  for (let i = 0; i < 12; i++) { const [x, z] = polar(E + 15 + i * 30, A.rCyl + 0.005, o); seam.box(x, yP + 0.12, z, 0.018, A.cylH - 0.54, 0.018); }   // the panels' edges (glass to glass)
  for (let i = 0; i < 12; i++) { const b = E + 15 + i * 30; for (let k = 0; k < 6; k++) { const r0 = A.rCyl * (1 - k / 6), r1 = A.rCyl * (1 - (k + 1) / 6); if (r1 < 0.9) break; const [x0, z0] = polar(b, r0, o), [x1, z1] = polar(b, r1, o), d = new THREE.Vector3(x1 - x0, domeY(r1) - domeY(r0), z1 - z0), len = d.length(), geo = new THREE.BoxGeometry(0.02, 0.02, len); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())); geo.translate((x0 + x1) / 2, (domeY(r0) + domeY(r1)) / 2 + 0.01, (z0 + z1) / 2); seam.push(geo); } }
  // the door: a curved glass leaf slid aside behind the panel, a slim stainless head
  ag.drum(o, A.rCyl - 0.12, E + A.door - 0.5, E + A.door + 26, yP, yP + doorH, 8);
  { const hd = new Tris(); hd.drum(o, A.rCyl + 0.03, E - A.door, E + A.door, yP + doorH - 0.02, yP + doorH + 0.14, 8); ring.p.push(...hd.p); ring.n.push(...hd.n); ring.u.push(...hd.u); }
  // below the plaza the drum goes on down to the store's floor, open at the stair's foot
  ag.drum(o, A.rCyl, E + A.foot[1], E + 360 + A.foot[0], yS, yCeil, 40);
  // the lift's glass core, the spiral stair round it: glass treads, glass balustrade, a steel rail
  const core = new Tris(); core.drum(o, A.rCore, 0, 360, yS, yP + 2.9, 24); core.arc(o, 0, A.rCore, 0, 360, yP + 2.9, 12);
  const SPI = A.spiral, ns = 36, stepA = SPI.total / ns, drop = SPI.drop / ns;
  for (let i = 0; i < ns; i++) {
    const a0 = E + SPI.start + i * stepA, a1 = a0 + stepA, y = yP - (i + 1) * drop;
    treads.arc(o, A.rCore, SPI.r1 + 0.2, a0, a1, y, 2); treads.arc(o, A.rCore, SPI.r1 + 0.2, a0, a1, y - 0.07, 2);
    const [x0, z0] = polar(a0, A.rCore, o), [x1, z1] = polar(a0, SPI.r1 + 0.2, o); treads.wall(x0, z0, x1, z1, y - 0.07, y);
    const [hx, hz] = polar((a0 + a1) / 2, SPI.r1 + 0.2, o), [tx, tz] = dirOf((a0 + a1) / 2 + 90), L = (SPI.r1 + 0.2) * stepA * D2R + 0.04;
    const geo = new THREE.BoxGeometry(L, 0.05, 0.05); geo.rotateZ(-Math.atan2(drop, L)); geo.rotateY(Math.atan2(-tz, tx)); geo.translate(hx, y + drop / 2 + 0.98, hz); st.push(geo);
  }
  ag.drum(o, SPI.r1 + 0.2, E + SPI.start, E + SPI.start + SPI.total, (b) => yP - SPI.drop * (b - E - SPI.start) / SPI.total, (b) => yP - SPI.drop * (b - E - SPI.start) / SPI.total + 0.98, 60);
  { const [x0, z0] = polar(E + A.landing[0], A.rCore, o), [x1, z1] = polar(E + A.landing[0], A.rCyl - 0.3, o); ag.wall(x0, z0, x1, z1, yP, yP + 1.0); }
  // the logo, white, hung high in the cylinder, facing the door (and the Pearl)
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: appleLogo(), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  logo.material.color.setScalar(1.5); logo.material.userData.todSkip = true;
  logo.position.set(A.x, yTop - 3.4, A.z); logo.rotation.y = Math.atan2(...dirOf(E)); logo.name = 'ljz-apple-logo'; logo.renderOrder = 2; g.add(logo);
  for (const s of [-0.9, 0.9]) { const [tx, tz] = dirOf(E + 90); seam.box(A.x + tx * s, yTop - 2.1, A.z + tz * s, 0.006, 2.1, 0.006); }          // its two hangers
  // ---- the store under the plaza: a round room in pale stone, oak tables, oak walls of shelving, a ring of light in the white ceiling
  floor.arc(o, 0, A.storeR, 0, 360, yS, 72);
  ceil.keepDown = true; ceil.arc(o, A.rCyl, A.storeR, 0, 360, yCeil, 72);
  const glow = new Tris(); glow.keepDown = true;
  for (const r of [8, 12.5, 16.5]) glow.arc(o, r - 0.22, r + 0.22, 0, 360, yCeil - 0.01, 72);
  // the wall: oak up to 3 m (shelving, with a lit shelf line), white plaster above; the mall's glass shopfront at the back; a video wall (the Forum)
  const back = A.mall, screen = back + 62, gap = (b, c, w) => Math.abs(((b - c + 540) % 360) - 180) < w;
  for (let i = 0; i < 72; i++) {
    const b0 = i * 5, b1 = b0 + 5, mid = b0 + 2.5;
    if (gap(mid, back, 16) || gap(mid, screen, 14)) continue;
    oak.drum(o, A.storeR - 0.04, E + b0, E + b1, yS, yS + 3.0, 1); storeWall.drum(o, A.storeR - 0.02, E + b0, E + b1, yS + 3.0, yCeil, 1);
    for (const h of [1.05, 1.75, 2.45]) { const [x, z] = applePt(mid, A.storeR - 0.3), [dx, dz] = dirOf(E + mid + 90); obox(wood, x, yS + h, z, dx, dz, A.storeR * 5 * D2R, 0.04, 0.5); }
  }
  const mallFront = new Tris(); mallFront.drum(o, A.storeR - 0.03, E + back - 16, E + back + 16, yS, yCeil, 8, 1);
  const shopMat = asLight(new THREE.MeshBasicMaterial({ map: shopfronts(), side: THREE.DoubleSide }), 'shops', 0.3); shopMat.color.setScalar(1.0);
  storeWall.drum(o, A.storeR - 0.02, E + back - 16, E + back + 16, yS + 4.0, yCeil, 4);
  const scr = new Tris(); scr.drum(o, A.storeR - 0.06, E + screen - 14, E + screen + 14, yS + 0.9, yS + 3.9, 8, 1);
  storeWall.drum(o, A.storeR - 0.02, E + screen - 14, E + screen + 14, yS, yS + 0.9, 4); storeWall.drum(o, A.storeR - 0.02, E + screen - 14, E + screen + 14, yS + 3.9, yCeil, 4);
  for (const tb of A.tables) {
    const [x, z] = applePt(tb.ang, tb.r), [rx, rz] = dirOf(E + tb.ang);
    obox(wood, x, yS + 0.82, z, rx, rz, 3.2, 0.09, 1.25); for (const s of [-1.3, 1.3]) obox(wood, x + rx * s, yS, z + rz * s, rx, rz, 0.12, 0.82, 1.1);
    for (let i = 0; i < 5; i++) for (const sd of [-0.36, 0.36]) obox(dark, x + rx * (-1.2 + i * 0.6) - rz * sd, yS + 0.915, z + rz * (-1.2 + i * 0.6) + rx * sd, rx, rz, i % 2 ? 0.16 : 0.26, 0.012, i % 2 ? 0.08 : 0.19);
  }
  // the Forum's benches: oak cubes before the video wall
  for (let i = 0; i < 6; i++) { const [x, z] = applePt(screen - 12 + i * 4.8, A.storeR - 5), [dx, dz] = dirOf(E + screen - 12 + i * 4.8); obox(wood, x, yS, z, dx, dz, 0.6, 0.45, 0.6); }
  lights.push({ x: A.x + 7, y: yCeil - 0.4, z: A.z + 7, intensity: 18, distance: 20, color: new THREE.Color(1.0, 0.95, 0.86) }, { x: A.x - 8, y: yCeil - 0.4, z: A.z - 6, intensity: 18, distance: 20, color: new THREE.Color(1.0, 0.95, 0.86) });
  lights.push({ x: A.x, y: yP + 5, z: A.z, intensity: 22, distance: 24, color: new THREE.Color(0.96, 0.98, 1.0) });
  const warmWall = std({ color: 0xf1efe9, roughness: 0.8, emissive: 0x3a3936 });
  const add = (o2, cast = true) => { o2.castShadow = cast; o2.receiveShadow = true; g.add(o2); return o2; };
  add(floor.mesh(m.stone, 'ljz-apple-plaza'), false); add(band.mesh(std({ color: 0x8d8b86, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 'ljz-apple-bands'), false);
  add(seam.mesh(std({ color: 0x9cc3bd, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 }), 'ljz-apple-glass-edges'), false);
  add(ring.mesh(m.steel, 'ljz-apple-ring')); add(st.mesh(m.steel, 'ljz-apple-steel'));
  add(wood.mesh(m.wood, 'ljz-apple-oak')); add(oak.mesh(std({ color: 0xb98d5c, roughness: 0.6, emissive: 0x2a1c0e }), 'ljz-apple-oak-walls'), false); add(dark.mesh(m.dark, 'ljz-apple-devices'), false);
  add(ceil.mesh(m.white, 'ljz-apple-ceiling'), false); g.add(glow.mesh(lit(1.35, 1.32, 1.25, { userData: { todSkip: true } }), 'ljz-apple-ceiling-light'));
  g.add(mallFront.mesh(shopMat, 'ljz-apple-mall-front')); add(storeWall.mesh(warmWall, 'ljz-apple-store-wall'), false);
  g.add(scr.mesh(new THREE.MeshBasicMaterial({ map: forumTex(), userData: { todSkip: true } }), 'ljz-apple-forum'));
  const tr = treads.mesh(std({ color: 0xdfeeee, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }), 'ljz-apple-treads'); tr.renderOrder = 4; g.add(tr);
  const cm = core.mesh(std({ color: 0xbfd6d8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.3, depthWrite: false }), 'ljz-apple-lift'); cm.renderOrder = 4; g.add(cm);
  const am = ag.mesh(m.appleGlass, 'ljz-apple-cylinder'); am.renderOrder = 5; g.add(am);
  // after dark the cylinder glows: the store's light coming up the stair well, the glass catching it
  const gw = new Tris(); gw.drum(o, A.rCyl - 0.04, 0, 360, yP, yTop, 48);
  const gm = gw.mesh(asLight(lit(0.1, 0.13, 0.15, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 'shops', 0), 'ljz-apple-glow'); gm.renderOrder = 6; g.add(gm);
}
// the Forum's video wall: a soft gradient with a few tiles of light (no imagery, no brand beyond the store's own)
function forumTex() {
  const [c, x] = makeCanvas(1024, 256), gd = x.createLinearGradient(0, 0, 1024, 256);
  gd.addColorStop(0, '#1d2b4a'); gd.addColorStop(0.5, '#5a3f7a'); gd.addColorStop(1, '#d8805a'); x.fillStyle = gd; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = `600 44px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Today at Apple', 512, 128);
  return tex(c, { repeat: false, aniso: 8 });
}
// lit shop windows without any brand: warm rooms, plinths, a figure or two (the mall's fronts)
function shopfronts() {
  const [c, x] = makeCanvas(1024, 256), r = rng(88);
  for (let k = 0; k < 8; k++) {
    const X = k * 128, gd = x.createLinearGradient(0, 0, 0, 256), warm = k % 3 !== 1;
    gd.addColorStop(0, warm ? '#f3e2bf' : '#e6eef2'); gd.addColorStop(0.55, warm ? '#c9a878' : '#b4c2ca'); gd.addColorStop(1, warm ? '#5c4630' : '#48525a');
    x.fillStyle = gd; x.fillRect(X, 0, 128, 256);
    for (let i = 0; i < 3; i++) { const px = X + 22 + i * 40 + r() * 8, ph = 34 + r() * 30; x.fillStyle = warm ? 'rgba(250,244,230,0.9)' : 'rgba(240,246,250,0.9)'; x.fillRect(px - 10, 210 - ph, 20, ph); x.fillStyle = `hsl(${(r() * 360) | 0},30%,${28 + r() * 30}%)`; x.fillRect(px - 6, 198 - ph, 12, 12); }
    if (r() < 0.6) { const px = X + 30 + r() * 70; x.fillStyle = 'rgba(30,24,20,0.8)'; x.beginPath(); x.ellipse(px, 118, 7, 9, 0, 0, 7); x.fill(); x.fillRect(px - 9, 128, 18, 84); }
    x.fillStyle = 'rgba(16,16,18,0.95)'; x.fillRect(X, 0, 3, 256); x.fillRect(X + 125, 0, 3, 256); x.fillRect(X, 0, 128, 8); x.fillRect(X, 236, 128, 20);
  }
  return tex(c, { aniso: 8 });
}

// ================= towers =================
// a glass curtain wall in metres: 24 m across, 100.8 m up (24 storeys of 4.2 m), lit rooms in runs
function curtainAtlas(seed, { glass = '#0f1f2e', warm = 0.4, fin = 'rgba(190,210,225,0.5)', occ = 0.22 } = {}) {
  const [c, x] = makeCanvas(256, 1024), r = rng(seed); x.fillStyle = glass; x.fillRect(0, 0, 256, 1024);
  const fh = 1024 / 24;
  for (let f = 0; f < 24; f++) {
    let run = 0, col = '#000';
    for (let b = 0; b < 16; b++) {
      if (run <= 0 && r() < occ * 0.6) { run = 1 + Math.floor(r() * 4); const t = r(), k = 0.3 + r() * 0.5; const cc = t < warm ? [255, 214, 160] : [205, 228, 255]; col = `rgb(${cc.map((v) => (v * k) | 0).join(',')})`; }
      if (run > 0) { run--; x.fillStyle = col; x.fillRect(b * 16 + 1, f * fh + 6, 14, fh - 14); }
    }
    x.fillStyle = 'rgba(8,12,18,0.85)'; x.fillRect(0, f * fh, 256, 5);
  }
  x.fillStyle = fin; for (let b = 0; b < 16; b++) x.fillRect(b * 16, 0, 1.6, 1024);
  return tex(c, { aniso: 8 });
}
// ---- footprints: walls and roofs from OSM outlines (anticlockwise in x, z), UVs in curtain-atlas units
// (u = metres round the outline / 24, v = metres up / 100.8) ----
function walls(tris, P, y0, y1, u0 = 0) {
  let u = u0;
  for (let i = 0; i < P.length; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length], len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) continue;
    tris.wall(x1, z1, x0, z0, y0, y1, [(u + len) / 24, y0 / 100.8, u / 24, y1 / 100.8]);        // (outward: the outline runs anticlockwise)
    u += len;
  }
  return u;
}
function cap(tris, P, y) {
  const tri = THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), []);
  for (const [i, j, k] of tri) tris.tri([P[i][0], y, P[i][1]], [P[j][0], y, P[j][1]], [P[k][0], y, P[k][1]], [[0.001, 0.001], [0.002, 0.001], [0.002, 0.002]]);
}
const shrink = (P, k, [cx, cz]) => P.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
// the facing edge of a footprint toward a point: its midpoint, outward normal and direction
function faceToward(P, tx, tz) {
  let best = null;
  for (let i = 0; i < P.length; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length], l = Math.hypot(x1 - x0, z1 - z0); if (l < 4) continue;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, nx = (z1 - z0) / l, nz = -(x1 - x0) / l, d = Math.hypot(tx - mx, tz - mz), facing = ((tx - mx) * nx + (tz - mz) * nz) / d;
    const score = facing * 2 - d / 60 + Math.min(l, 30) / 60; if (facing > 0.3 && (!best || score > best.score)) best = { score, x: mx, z: mz, nx, nz, ex: (x1 - x0) / l, ez: (z1 - z0) / l, len: l };
  }
  return best;
}

export function buildIfc(g, m, lights) {
  const r = rng(808), glassT = new Tris(24), edge = new Batch(), stone = new Batch(), st = new Batch(), gl = new Tris(), shops = new Tris(), lob = new Tris(), mallG = new Tris(24), stoneT = new Tris(), roofT = new Tris();
  // ---- the two towers: OSM's footprints (squares with their corners cut), silvery glass with close
  // mullions, rising to the cut-crystal crown: the outline leans in to a smaller copy of itself whose top
  // is tilted, each tower's toward the other; its edges lit at night ----
  const towers = [[IFC.north, 259.9, IFC.south], [IFC.south, 249.9, IFC.north]];
  for (const [T, tall, other] of towers) {
    const P = T.P, c = [T.cx, T.cz], hs = tall - 40;
    const u1 = walls(glassT, P, 0, hs);
    const toward = Math.atan2(other.cz - T.cz, other.cx - T.cx), k = 0.55;
    const top = shrink(P, k, c).map(([x, z]) => { const ang = Math.atan2(z - T.cz, x - T.cx), h = tall - 26 * (0.5 - 0.5 * Math.cos(ang - toward)); return [x, z, h]; });
    let u = 0;
    for (let i = 0; i < P.length; i++) {
      const j = (i + 1) % P.length, [x0, z0] = P[i], [x1, z1] = P[j], len = Math.hypot(x1 - x0, z1 - z0), t0 = top[i], t1 = top[j];
      glassT.quad([x1, hs, z1], [x0, hs, z0], [t0[0], t0[2], t0[1]], [t1[0], t1[2], t1[1]], [[(u + len) / 24, hs / 100.8], [u / 24, hs / 100.8], [u / 24 + len * (1 - k) / 48, t0[2] / 100.8], [(u + len) / 24 - len * (1 - k) / 48, t1[2] / 100.8]]);
      u += len;
      for (const [a, b] of [[[x0, hs, z0], [t0[0], t0[2], t0[1]]], [[t0[0], t0[2], t0[1]], [t1[0], t1[2], t1[1]]]]) { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len2 = d.length(), geo = new THREE.BoxGeometry(0.6, 0.6, len2); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())); geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); edge.push(geo); }
    }
    { const tri = THREE.ShapeUtils.triangulateShape(top.map(([x, z]) => new THREE.Vector2(x, z)), []); for (const [i, j, k2] of tri) roofT.tri([top[i][0], top[i][2], top[i][1]], [top[j][0], top[j][2], top[j][1]], [top[k2][0], top[k2][2], top[k2][1]]); }
    void u1;
  }
  // ---- the mall: OSM's outline, four levels of glass over shopfronts at street level, a planted roof ----
  const MP = IFC.mall.P, MH = IFC.mall.h;
  walls(mallG, MP, 6.4, MH);
  { let uu = 0; for (let i = 0; i < MP.length; i++) { const [x0, z0] = MP[i], [x1, z1] = MP[(i + 1) % MP.length], len = Math.hypot(x1 - x0, z1 - z0), nb = Math.max(1, Math.round(len / 5.5)); for (let q = 0; q < nb; q++) { const f0 = q / nb + 0.004, f1 = (q + 1) / nb - 0.004, kk = Math.floor(r() * 8); shops.wall(x1 + (x0 - x1) * f0, z1 + (z0 - z1) * f0, x1 + (x0 - x1) * f1, z1 + (z0 - z1) * f1, CH, 6.4, [kk / 8, 0, (kk + 1) / 8, 1]); } uu += len; } }
  { const band = new Tris(); for (let i = 0; i < MP.length; i++) { const [x0, z0] = MP[i], [x1, z1] = MP[(i + 1) % MP.length], l = Math.hypot(x1 - x0, z1 - z0) || 1, nx = (z1 - z0) / l * 0.12, nz = -(x1 - x0) / l * 0.12; for (const y of [6.4, 12.9, 19.4]) band.wall(x1 + nx, z1 + nz, x0 + nx, z0 + nz, y - 0.25, y + 0.45); band.wall(x1 + nx, z1 + nz, x0 + nx, z0 + nz, MH - 0.6, MH + 0.9); }
    stoneT.p.push(...band.p); stoneT.n.push(...band.n); stoneT.u.push(...band.u); }
  cap(roofT, MP, MH);
  // its way in from the Apple plaza: the face of the mall nearest the cylinder; glass doors under a canopy, the name above
  const F = faceToward(MP, APPLE.x, APPLE.z);
  if (F) {
    const ex = F.x + F.nx * 0.2, ez = F.z + F.nz * 0.2, ry = Math.atan2(F.nx, F.nz);
    obox(st, ex + F.nx * 2.2, 5.0, ez + F.nz * 2.2, F.ex, F.ez, 12, 0.22, 4.4);
    for (const s2 of [-4.2, 4.2]) st.box(ex + F.nx * 4.2 + F.ex * s2, CH, ez + F.nz * 4.2 + F.ez * s2, 0.12, 4.85, 0.12);
    gl.wall(ex - F.ex * 5, ez - F.ez * 5, ex + F.ex * 5, ez + F.ez * 5, CH, 4.6);
    g.add(sign(['ifc mall'], { w: 13, h: 3.6, x: ex + F.nx * 0.5, y: MH - 8.5, z: ez + F.nz * 0.5, ry, color: '#f6f3ec', bg: null, ch: 'signs', gain: 1.45 }));
    g.add(sign(['上海国金中心商场'], { w: 9, h: 1.3, x: ex + F.nx * 0.5, y: MH - 12.4, z: ez + F.nz * 0.5, ry, color: '#f6f3ec', bg: null, ch: 'signs', gain: 1.3 }));
    // a directory totem on the plaza side: the mall, Apple, the hotel in the south tower, the metro
    const tx = ex + F.nx * 6 + F.ex * 7.5, tz = ez + F.nz * 6 + F.ez * 7.5;
    if (!inBuilding(tx, tz, 1)) { obox(stone, tx, CH, tz, F.ex, F.ez, 1.1, 2.6, 0.3); addCircle(tx, tz, 0.6, { y1: 2 });
      g.add(sign(['国金中心商场 · ifc mall', 'Apple · 浦东丽思卡尔顿酒店 Ritz-Carlton · 地铁2号线 Metro'], { w: 1.0, h: 1.9, x: tx + F.nx * 0.16, y: CH + 1.5, z: tz + F.nz * 0.16, ry, color: '#f2ede2', bg: '#2b2d31', ch: null, gain: 1.1 })); }
    lights.push({ x: ex + F.nx * 3, y: 4.6, z: ez + F.nz * 3, intensity: 22, distance: 16, color: new THREE.Color(1.0, 0.92, 0.8) });
  }
  // the mall's glass toward the Apple court is braced by a giant steel X in each bay (as the photographs show)
  { const xb = new Batch(), mem = (a, b) => { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), geo = new THREE.BoxGeometry(0.45, 0.45, L); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())); geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); xb.push(geo); };
    for (let i = 0; i < MP.length; i++) {
      const [x0, z0] = MP[i], [x1, z1] = MP[(i + 1) % MP.length], l = Math.hypot(x1 - x0, z1 - z0); if (l < 6) continue;
      const nx = (z1 - z0) / l, nz = -(x1 - x0) / l, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, d = Math.hypot(APPLE.x - mx, APPLE.z - mz);
      if (d > 75 || ((APPLE.x - mx) * nx + (APPLE.z - mz) * nz) / d < 0.25) continue;
      const nb = Math.max(1, Math.round(l / 16)), o2 = 0.35, Pt = (f, y) => [x0 + (x1 - x0) * f + nx * o2, y, z0 + (z1 - z0) * f + nz * o2];
      for (let k = 0; k < nb; k++) { const f0 = k / nb, f1 = (k + 1) / nb; mem(Pt(f0, 6.4), Pt(f1, MH - 0.6)); mem(Pt(f1, 6.4), Pt(f0, MH - 0.6)); mem(Pt(f0, 6.4), Pt(f0, MH - 0.6)); }
    }
    if (!xb.empty) { const o3 = xb.mesh(m.steel, 'ljz-ifc-mall-braces'); o3.castShadow = true; g.add(o3); } }
  // the same name where the mall meets the avenue
  { const F2 = faceToward(MP, ...fromAP(260, 0)); if (F2) g.add(sign(['ifc mall', '上海国金中心商场'], { w: 16, h: 4.4, x: F2.x + F2.nx * 0.4, y: MH - 8, z: F2.z + F2.nz * 0.4, ry: Math.atan2(F2.nx, F2.nz), color: '#f6f3ec', bg: null, ch: 'signs', gain: 1.4 })); }
  // the north tower's lobby on Century Avenue: a tall glass front, a canopy, revolving doors, the address stone
  const L = LJZ.ifcLobbyDoor, ux = LOBBY.ex, uz = LOBBY.ez, LROT = Math.atan2(uz, ux);
  { const [x0, z0] = [L.x - ux * 8.6, L.z - uz * 8.6], [x1, z1] = [L.x + ux * 8.6, L.z + uz * 8.6];
    lob.wall(x0 + L.nx * 0.12, z0 + L.nz * 0.12, x1 + L.nx * 0.12, z1 + L.nz * 0.12, CH, 8.8, [0, 0, 2, 1]);
    obox(st, L.x + L.nx * 2.8, 4.6, L.z + L.nz * 2.8, ux, uz, 14, 0.3, 5.6); for (const s of [-6, 6]) st.cyl(L.x + ux * s + L.nx * 5, CH, L.z + uz * s + L.nz * 5, 0.14, 0.14, 4.45, 12);
    for (const s of [-2.4, 2.4]) { const dm = new Tris(); dm.drum({ x: L.x + ux * s + L.nx * 0.9, z: L.z + uz * s + L.nz * 0.9 }, 1.25, 0, 360, CH, 2.9, 16); gl.p.push(...dm.p); gl.n.push(...dm.n); gl.u.push(...dm.u); st.cyl(L.x + ux * s + L.nx * 0.9, 2.9, L.z + uz * s + L.nz * 0.9, 1.32, 1.32, 0.16, 20); }
    obox(stone, L.x - ux * 7.6 + L.nx * 6.5, CH, L.z - uz * 7.6 + L.nz * 6.5, ux, uz, 3.6, 1.5, 0.5);
    g.add(sign(['上海国金中心 二期', 'Two IFC · 世纪大道8号'], { w: 3.3, h: 1.1, x: L.x - ux * 7.6 + L.nx * 6.77, y: CH + 0.78, z: L.z - uz * 7.6 + L.nz * 6.77, ry: Math.atan2(L.nx, L.nz), color: '#e9dcb8', bg: '#2a2620', ch: null }));
    lights.push({ x: L.x + L.nx * 2.6, y: 4.2, z: L.z + L.nz * 2.6, intensity: 26, distance: 16, color: new THREE.Color(1.0, 0.9, 0.74) });
    addCircle(L.x + ux * 6 + L.nx * 5, L.z + uz * 6 + L.nz * 5, 0.2); addCircle(L.x - ux * 6 + L.nx * 5, L.z - uz * 6 + L.nz * 5, 0.2);
    addBox(L.x - ux * 7.6 + L.nx * 6.5, L.z - uz * 7.6 + L.nz * 6.5, LROT, 1.8, 0.3, { id: 'stone', y1: 2 }); }
  const towerMat = facadeGlass(curtainAtlas(31, { glass: '#122634', warm: 0.3, occ: 0.18, fin: 'rgba(214,226,236,0.6)' }), { tint: [0.8, 0.88, 0.95], f0: 0.34, frame: [0.7, 0.73, 0.76], seed: 3 });
  const mallMat = facadeGlass(curtainAtlas(57, { glass: '#3a2c1c', warm: 0.9, occ: 0.85, fin: 'rgba(230,220,200,0.5)' }), { tint: [0.9, 0.93, 0.95], f0: 0.12, frame: [0.78, 0.76, 0.72], spandrel: 0.1, body: [0.09, 0.075, 0.06], seed: 9 });
  const lobbyMat = new THREE.MeshBasicMaterial({ map: lobbyTex(), side: THREE.DoubleSide }); lobbyMat.color.setScalar(0.9); lobbyMat.userData.todSkip = true;
  const shopMat = asLight(new THREE.MeshBasicMaterial({ map: shopfronts(), side: THREE.DoubleSide }), 'shops', 0.3);
  const stoneMat = std({ color: 0xd8d2c6, roughness: 0.55 });
  const out = [glassT.mesh(towerMat, 'ljz-ifc-towers'), mallG.mesh(mallMat, 'ljz-ifc-mall-glass'), stone.mesh(stoneMat, 'ljz-ifc-stone'), stoneT.mesh(stoneMat, 'ljz-ifc-mall-bands'), st.mesh(m.steel, 'ljz-ifc-steel'), roofT.mesh(std({ color: 0x5d625f, roughness: 0.9 }), 'ljz-ifc-roofs')];
  for (const o of out) { o.castShadow = true; o.receiveShadow = true; g.add(o); }
  g.add(edge.mesh(asLight(lit(1.5, 1.7, 2.2), 'outline', 0.3), 'ljz-ifc-edges'), shops.mesh(shopMat, 'ljz-ifc-shops'), lob.mesh(lobbyMat, 'ljz-ifc-lobby'));
  const gm = gl.mesh(m.glass, 'ljz-ifc-glass'); gm.renderOrder = 3; g.add(gm);
}
function lobbyTex() {
  const [c, x] = makeCanvas(1024, 512), gd = x.createLinearGradient(0, 0, 0, 512);
  gd.addColorStop(0, '#f1dfb8'); gd.addColorStop(0.5, '#c7a877'); gd.addColorStop(1, '#4a3a28'); x.fillStyle = gd; x.fillRect(0, 0, 1024, 512);
  x.fillStyle = 'rgba(255,246,220,0.9)'; for (let i = 0; i < 9; i++) x.fillRect(40 + i * 112, 40, 60, 5);
  x.fillStyle = '#3b2f22'; x.fillRect(420, 428, 184, 64);                                    // the reception desk
  x.fillStyle = 'rgba(255,240,205,0.85)'; x.fillRect(420, 424, 184, 5);
  for (const px of [150, 250, 760, 880]) { x.fillStyle = 'rgba(28,22,18,0.85)'; x.beginPath(); x.ellipse(px, 398, 5, 7, 0, 0, 7); x.fill(); x.fillRect(px - 7, 406, 14, 86); }
  x.fillStyle = 'rgba(20,22,26,0.9)'; for (let i = 0; i <= 12; i++) x.fillRect(i * 85.3 - 2, 0, 4, 512); x.fillRect(0, 250, 1024, 4); x.fillRect(0, 0, 1024, 6);
  return tex(c, { aniso: 8 });
}

// a sign: lines of text on a plate (or cut-out letters when bg is null), lit on a channel of the hour
export function sign(lines, { w, h, x, y, z, ry = 0, color = '#fff', bg = '#1d4f9c', ch = null, gain = 1.25, font = FONT.sans, both = false, arrow = '' }) {
  const [c, cx] = makeCanvas(1024, Math.round(1024 * h / w)), H = c.height;
  if (bg) { cx.fillStyle = bg; cx.fillRect(0, 0, 1024, H); } else cx.clearRect(0, 0, 1024, H);
  cx.fillStyle = color; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  const fit = (s, px, wt) => { let f = px; do { cx.font = `${wt} ${f}px ${font}`; f -= 4; } while (cx.measureText(s).width > 960 && f > 12); };
  if (lines.length === 1) { fit(lines[0], H * 0.62, 800); cx.fillText(lines[0], 512, H * 0.53); }
  else { fit(lines[0], H * 0.46, 800); cx.fillText(lines[0], 512, H * 0.34); fit(lines[1], H * 0.24, 600); cx.fillText(lines[1], 512, H * 0.76); }
  const mat = new THREE.MeshBasicMaterial({ map: tex(c, { repeat: false, aniso: 8 }), transparent: !bg, side: both ? THREE.DoubleSide : THREE.FrontSide }); mat.color.setScalar(gain);
  if (ch) asLight(mat, ch, 0.5); else mat.userData.todSkip = true;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x, y, z); p.rotation.y = ry; p.name = 'ljz-sign';
  return p;
}

// ================= the metro's stairwells =================
function metroSign(m) {
  const [c, x] = makeCanvas(1024, 256);
  x.fillStyle = '#16181c'; x.fillRect(0, 0, 1024, 256);
  x.drawImage(markCanvas('shanghaimetro', { color: '#EC1C24', bg: '#ffffff', size: 200, pad: 0.12 }), 28, 28, 200, 200);
  x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.textAlign = 'left';
  x.font = `900 84px ${FONT.sans}`; x.fillText('陆家嘴站', 262, 92); x.font = `600 38px ${FONT.sans}`; x.fillText('Lujiazui', 266, 176);
  [[2, LINE_COLOR[2], '#fff'], [14, '#827A04', '#fff']].forEach(([n, col, fg], i) => { const X = 690 + i * 88; x.fillStyle = col; x.fillRect(X, 140, 76, 76); x.fillStyle = fg; x.font = `900 ${n > 9 ? 44 : 56}px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(String(n), X + 38, 180); });
  x.fillStyle = '#ffd400'; x.fillRect(880, 20, 124, 108); x.fillStyle = '#111'; x.font = `900 92px ${FONT.sans}`; x.textAlign = 'center'; x.fillText(String(m.exit), 942, 78);
  x.fillStyle = '#fff'; x.font = `700 30px ${FONT.sans}`; x.fillText(`${m.exit}号口 Exit ${m.exit}`, 942, 180);
  return tex(c, { repeat: false, aniso: 8 });
}
function landingSign() {
  const [c, x] = makeCanvas(1024, 192); x.fillStyle = '#16181c'; x.fillRect(0, 0, 1024, 192);
  [[2, '2号线', 'Line 2', LINE_COLOR[2]], [14, '14号线', 'Line 14', '#827A04']].forEach(([n, zh, en, col], i) => {
    const X = 40 + i * 400; x.fillStyle = col; x.fillRect(X, 46, 100, 100); x.fillStyle = '#fff'; x.font = `900 ${n > 9 ? 52 : 64}px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), X + 50, 98);
    x.textAlign = 'left'; x.font = `800 50px ${FONT.sans}`; x.fillText(zh, X + 120, 78); x.font = `500 30px ${FONT.sans}`; x.fillText(en, X + 122, 128);
  });
  x.fillStyle = '#fff'; x.textAlign = 'right'; x.font = `800 60px ${FONT.sans}`; x.fillText('进站 →', 990, 82); x.font = `500 30px ${FONT.sans}`; x.fillText('Entrance', 990, 132);
  return tex(c, { repeat: false, aniso: 8 });
}
function concourse() {
  const [c, x] = makeCanvas(256, 256), r = rng(10), gd = x.createLinearGradient(0, 0, 0, 256); gd.addColorStop(0, '#9aa3ab'); gd.addColorStop(0.45, '#6f777f'); gd.addColorStop(1, '#3a3e42');
  x.fillStyle = gd; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(255,255,255,0.95)'; for (let i = 0; i < 5; i++) x.fillRect(10 + i * 50, 30 + i * 2, 36, 4);
  x.fillStyle = '#16181c'; x.fillRect(0, 120, 256, 26); x.fillStyle = LINE_COLOR[2]; x.fillRect(16, 124, 18, 18); x.fillStyle = '#827A04'; x.fillRect(40, 124, 18, 18);
  for (let i = 0; i < 6; i++) { x.fillStyle = '#2a2e33'; x.fillRect(8 + i * 42, 182, 30, 40); x.fillStyle = '#4cd964'; x.fillRect(16 + i * 42, 188, 10, 6); }
  for (let i = 0; i < 5; i++) { const px = 20 + r() * 216, h = 50 + r() * 16; x.fillStyle = 'rgba(30,30,34,0.85)'; x.beginPath(); x.ellipse(px, 236 - h, 5, 6, 0, 0, 7); x.fill(); x.fillRect(px - 6, 242 - h, 12, h - 8); }
  return tex(c, { repeat: false });
}
export function buildMetro(g, m, lights) {
  const steps = new Batch(), tile = new Batch(), walls = new Batch(), st = new Batch(), dark = new Batch(), gl = new Batch(), strips = new Batch();
  const cTex = concourse(), lTex = landingSign();
  for (const M of METRO_LJZ) {
    const P = (t, l) => wellPt(M, t, l), n = Math.round((CH + M.depth) / 0.155), tread = M.run / n, rise = (CH + M.depth) / n, W = M.hw * 2, ry = Math.atan2(-M.dz, M.dx);
    for (let i = 0; i < n; i++) { const [x, z] = P((i + 0.5) * tread, 0), y = CH - (i + 1) * rise; obox(steps, x, y - 0.2, z, M.dx, M.dz, tread + 0.02, 0.2 + rise, W); const [sx, sz] = P(i * tread + 0.05, 0); obox(strips, sx, y + rise - 0.004, sz, M.dx, M.dz, 0.04, 0.01, W - 0.3); }
    { const [x, z] = P((M.run + M.len) / 2, 0); obox(tile, x, -M.depth - 0.3, z, M.dx, M.dz, M.len - M.run, 0.3, W); }
    for (const s of [-1, 1]) { const [x, z] = P(M.len / 2, s * (M.hw + 0.06)); obox(walls, x, -M.depth, z, M.dx, M.dz, M.len, M.depth + CH, 0.12); obox(gl, x, CH, z, M.dx, M.dz, M.len, 1.1, 0.03); obox(st, x, CH + 1.1, z, M.dx, M.dz, M.len, 0.05, 0.06); }
    { const [x, z] = P(M.len + 0.06, 0); if (M.exit === 1) obox(walls, x, -M.depth, z, M.dx, M.dz, 0.12, M.depth + CH, W + 0.24); else obox(walls, x, -0.8, z, M.dx, M.dz, 0.12, 0.8 + CH, W + 0.24); obox(dark, x, CH, z, M.dx, M.dz, 0.14, 3.0, W + 0.24); }
    { const [x, z] = P(M.len / 2, 0); obox(walls, x, 3.1, z, M.dx, M.dz, M.len + 0.6, 0.12, W + 0.8); obox(gl, x, 3.04, z, M.dx, M.dz, M.len + 0.4, 0.02, W + 0.6); }
    for (const t of [0, M.len]) for (const s of [-1, 1]) { const [x, z] = P(t, s * M.hw); st.box(x, CH, z, 0.1, 3.0, 0.1); }
    const sm = new THREE.MeshBasicMaterial({ map: metroSign(M) }); sm.color.setScalar(1.35); sm.userData.todSkip = true;
    for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, (W + 0.4) / 4), sm), [x, z] = P(-0.15 * s, 0); p.position.set(x, 3.6, z); p.rotation.y = Math.atan2(-M.dx * s, -M.dz * s); p.name = 'ljz-metro-sign'; g.add(p); }
    { const [x, z] = P(M.len / 2, M.hw + 0.5), p = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), sm); p.position.set(x, 3.6, z); p.rotation.y = Math.atan2(-M.dz, M.dx); g.add(p); const q = p.clone(); const [x2, z2] = P(M.len / 2, -M.hw - 0.5); q.position.set(x2, 3.6, z2); q.rotation.y = Math.atan2(M.dz, -M.dx); g.add(q);
      const [bx, bz] = P(M.len / 2, 0); obox(dark, bx, 3.05, bz, M.dx, M.dz, 4.5, 1.15, W + 0.9); }
    const ls = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, (W - 0.2) * 192 / 1024), new THREE.MeshBasicMaterial({ map: lTex })); ls.material.color.setScalar(1.3); ls.material.userData.todSkip = true;
    if (M.exit === 1) { const [x, z] = P(M.len - 0.02, 0); ls.position.set(x, -M.depth + 2.5, z); ls.rotation.y = Math.atan2(-M.dx, -M.dz); g.add(ls);
      const door = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, 2.2), new THREE.MeshBasicMaterial({ map: cTex })); door.material.userData.todSkip = true; const [dx, dz] = P(M.len - 0.015, 0); door.position.set(dx, -M.depth + 1.1, dz); door.rotation.y = ls.rotation.y; g.add(door); }
    { const [x, z] = P(M.run + 0.8, 0); lights.push({ x, y: -M.depth + 2.6, z, color: new THREE.Color(0.95, 0.97, 1.0), intensity: 2.4, distance: 8 }); const [x2, z2] = P(M.len / 2, 0); lights.push({ x: x2, y: 2.8, z: z2, color: new THREE.Color(0.92, 0.96, 1.0), intensity: 5, distance: 9 }); }
    void ry;
  }
  const add = (o) => { o.castShadow = true; o.receiveShadow = true; g.add(o); };
  add(steps.mesh(m.granite, 'ljz-metro-steps')); add(tile.mesh(m.tile, 'ljz-metro-landing')); add(walls.mesh(m.tile, 'ljz-metro-walls')); add(st.mesh(m.steel, 'ljz-metro-steel')); add(dark.mesh(m.dark, 'ljz-metro-panels'));
  const gm = gl.mesh(m.glass, 'ljz-metro-glass'); gm.renderOrder = 3; g.add(gm); g.add(strips.mesh(lit(1.6, 1.6, 1.7, { userData: { todSkip: true } }), 'ljz-metro-strips'));
}

// ================= trees: trunks and cards of leaves, one mesh each for the whole district =================
function leafCard() {
  const [c, x] = makeCanvas(256, 256), r = rng(5); x.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 150; i++) {
    const a = r() * 6.283, d = Math.sqrt(r()) * 104, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d * 0.92, s = 9 + r() * 10;
    x.fillStyle = `hsl(${92 + r() * 34},${38 + r() * 22}%,${15 + r() * 22 + (py < 128 ? 8 : 0)}%)`;
    x.beginPath(); x.ellipse(px, py, s, s * 0.5, r() * 3.14, 0, 6.3); x.fill();
  }
  return tex(c, { repeat: false, aniso: 4 });
}
export function buildTrees(g, spots) {
  const trunk = new Batch(), P = [], N = [], U = [], r = rng(404);
  for (const t of spots) {
    const h = t.h || 7 + r() * 3, cr = t.r || h * 0.36, y0 = t.y ?? CH, cy = y0 + h * 0.68;
    trunk.cyl(t.x, y0, t.z, 0.08, 0.15, h * 0.55, 7);
    const n = t.cards || 34;
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * 6.283, rr = Math.cbrt(0.25 + 0.75 * r()), s = Math.sqrt(1 - u * u), ox = s * Math.cos(th) * cr * rr, oy = u * cr * 0.72 * rr, oz = s * Math.sin(th) * cr * rr;
      const size = cr * (0.46 + r() * 0.26), ya = r() * 6.283, tilt = (r() - 0.5) * 1.0, ax = Math.cos(ya), az = Math.sin(ya);
      const nl = Math.hypot(ox, oy + cr * 0.5, oz) || 1, nx = ox / nl, ny = (oy + cr * 0.5) / nl, nz = oz / nl;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [t.x + ox + ax * a * size - az * Math.sin(tilt) * b * size, cy + oy + Math.cos(tilt) * b * size * 0.8, t.z + oz + az * a * size + ax * Math.sin(tilt) * b * size]);
      for (const k of [0, 1, 2, 0, 2, 3]) { P.push(...corners[k]); N.push(nx, ny, nz); U.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1); }
    }
    if (t.solid !== false) addCircle(t.x, t.z, 0.28, { y1: 3 });
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  const map = leafCard(), leaves = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, emissive: 0x0a1206 }));
  leaves.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
  leaves.name = 'ljz-leaves'; leaves.castShadow = true; leaves.receiveShadow = true; leaves.matrixAutoUpdate = false;
  const tm = trunk.mesh(new THREE.MeshStandardMaterial({ color: 0x4a3c30, roughness: 0.9 }), 'ljz-trunks'); tm.castShadow = true;
  g.add(tm, leaves);
  return P.length / 9;
}

// ================= the Central Green, the island, planting =================
export function buildGreen(g, m, lights, trees) {
  const r = rng(909), hedge = new Batch(), wood = new Batch(), st = new Batch(), water = new Tris(4), bank = new Tris(), mem = new Tris(), stone = new Batch(), fl = { red: new Tris(), yellow: new Tris(), violet: new Tris() };
  const ap = (a, p) => fromAP(a, p), [ux, uz] = dirOf(AVE), [nx, nz] = dirOf(AVE + 90);
  // the lake (OSM's outline): water a little below the lawn, a stone edge
  for (const l of LAKE) {
    const P = l.P, tri = THREE.ShapeUtils.triangulateShape(P.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [i, j, k] of tri) water.tri([P[i][0], CH - 0.28, P[i][1]], [P[j][0], CH - 0.28, P[j][1]], [P[k][0], CH - 0.28, P[k][1]]);
    for (let i = 0; i < P.length; i++) { const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length]; bank.wall(x0, z0, x1, z1, CH - 0.5, CH + 0.06); bank.wall(x1, z1, x0, z0, CH - 0.5, CH + 0.06); }
  }
  // benches along the loop path (slatted wood on steel), facing the water
  for (const b of BENCHES) {
    const [cx, cz] = ap(LOOP.a, LOOP.p), fx = cx - b.x, fz = cz - b.z, fl2 = Math.hypot(fx, fz), dx = fx / fl2, dz = fz / fl2, tx = -dz, tz = dx;
    for (let i = 0; i < 3; i++) obox(wood, b.x + dx * (i * 0.15 - 0.15), CH + 0.42, b.z + dz * (i * 0.15 - 0.15), tx, tz, 1.8, 0.04, 0.12);
    for (let i = 0; i < 2; i++) obox(wood, b.x - dx * 0.3, CH + 0.56 + i * 0.16, b.z - dz * 0.3, tx, tz, 1.8, 0.11, 0.035);
    for (const s of [-0.75, 0.75]) { obox(st, b.x + tx * s, CH, b.z + tz * s, tx, tz, 0.05, 0.42, 0.4); obox(st, b.x + tx * s - dx * 0.3, CH + 0.4, b.z + tz * s - dz * 0.3, tx, tz, 0.05, 0.42, 0.04); }
    addBox(b.x, b.z, Math.atan2(tz, tx), 0.95, 0.3, { id: 'bench', y1: 2 });
  }
  // lamps along the loop and the ways in
  const lamp = (x, z, h = 4.2) => { st.cyl(x, CH, z, 0.05, 0.08, h, 8); lights.lamp(x, CH + h + 0.1, z, 0.26, { intensity: 16, distance: 18, pool: 11 }); addCircle(x, z, 0.12, { y1: 3 }); };
  for (let i = 0; i < 22; i++) { const t = i / 22 * 6.2832 + 0.14; const [x, z] = ap(LOOP.a + (LOOP.ra - 2.8) * Math.cos(t), LOOP.p + (LOOP.rp - 2.8) * Math.sin(t)); if (!inLake(LOOP.a + (LOOP.ra - 2.8) * Math.cos(t), LOOP.p + (LOOP.rp - 2.8) * Math.sin(t), 2)) lamp(x, z); }
  for (const [a, p] of [[374, -62], [386, -96], [396, -128], [559, -70], [555, -110], [640, -120]]) lamp(...ap(a, p));
  // the white canopy on the lawn's west side: three peaks of membrane on steel masts
  for (const [da, dp, h] of [[-5, -3, 9], [4, 2, 11], [-1, 7, 8]]) {
    const [x, z] = ap(CANOPY.a + da, CANOPY.p + dp), n = 10, R = 7.5;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, ymid = 4.2; mem.tri([x, h, z], [x + Math.cos(a0) * R * 0.45, ymid + 0.6 * Math.cos(i * 3.14), z + Math.sin(a0) * R * 0.45], [x + Math.cos(a1) * R * 0.45, ymid + 0.6 * Math.cos((i + 1) * 3.14), z + Math.sin(a1) * R * 0.45]);
      mem.quad([x + Math.cos(a0) * R * 0.45, ymid + 0.6 * Math.cos(i * 3.14), z + Math.sin(a0) * R * 0.45], [x + Math.cos(a0) * R, 3.0 + 0.5 * Math.cos(i * 3.14), z + Math.sin(a0) * R], [x + Math.cos(a1) * R, 3.0 + 0.5 * Math.cos((i + 1) * 3.14), z + Math.sin(a1) * R], [x + Math.cos(a1) * R * 0.45, ymid + 0.6 * Math.cos((i + 1) * 3.14), z + Math.sin(a1) * R * 0.45]); }
    st.cyl(x, CH, z, 0.1, 0.14, h + 0.6 - CH, 10); addCircle(x, z, 0.2, { y1: 3 });
    lights.push({ x, y: 3.4, z, intensity: 14, distance: 14, color: new THREE.Color(1.0, 0.95, 0.86), out: true });
  }
  // the park's name on a boulder at the corner gate
  { const [x, z] = ap(364, -60); const geo = new THREE.DodecahedronGeometry(1.5, 1); geo.scale(1.5, 0.75, 0.6); geo.rotateY(-AVE_ROT + 0.5); geo.translate(x, CH + 0.85, z); stone.push(geo); addCircle(x, z, 1.3, { y1: 3 });
    const d = dirOf(AVE + 270 - 28); g.add(sign(['陆家嘴中心绿地'], { w: 3.0, h: 0.62, x: x + d[0] * 0.62, y: CH + 1.0, z: z + d[1] * 0.62, ry: Math.atan2(d[0], d[1]), color: '#b3221c', bg: null, ch: null, font: FONT.serif, gain: 1 })); }
  // trees: a belt just inside the Green's edge, clumps on the lawn, clear of the paths, the water and the canopy
  const want = (a, p) => !inLake(a, p, 3) && !parkPath(a, p) && Math.hypot(a - CANOPY.a, p - CANOPY.p) > 16 && inGreen(...ap(a, p));
  for (let i = 0; i < GREEN.P.length; i++) {
    const [x0, z0] = GREEN.P[i], [x1, z1] = GREEN.P[(i + 1) % GREEN.P.length], len = Math.hypot(x1 - x0, z1 - z0), nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
    for (let k = 4; k < len - 2; k += 11) { const x = x0 + (x1 - x0) * k / len - nx * (5 + r() * 3), z = z0 + (z1 - z0) * k / len - nz * (5 + r() * 3), [a, p] = toAP(x, z); if (want(a, p) && !(a < 392 && p > -100)) trees.push({ x, z, h: 9 + r() * 4 }); }
  }
  for (let i = 0; i < 70; i++) { const a = GREEN.a0 + 14 + r() * (GREEN.a1 - GREEN.a0 - 28), p = GREEN.p0 + 14 + r() * (GREEN.p1 - GREEN.p0 - 28), e = Math.hypot((a - LOOP.a) / LOOP.ra, (p - LOOP.p) / LOOP.rp); if (want(a, p) && (e > 1.12 || e < 0.9) && !(a < 392 && p > -100)) { const [x, z] = ap(a, p); trees.push({ x, z, h: 7 + r() * 5 }); } }
  // a clipped hedge along the Green's edge (its fence), open at the gates (the corner by the junction, the avenue gate)
  for (let i = 0; i < GREEN.P.length; i++) {
    const [x0, z0] = GREEN.P[i], [x1, z1] = GREEN.P[(i + 1) % GREEN.P.length], len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(len / 3));
    for (let k = 0; k < n; k++) { const xm = x0 + (x1 - x0) * (k + 0.5) / n, zm = z0 + (z1 - z0) * (k + 0.5) / n, [am, pm] = toAP(xm, zm); if ((am < 392 && pm > -100) || (Math.abs(am - 556) < 7 && pm > -60) || parkPath(am, pm)) continue; obox(hedge, xm, CH, zm, (x1 - x0) / len, (z1 - z0) / len, len / n + 0.05, 1.25, 1.1); }
  }
  // the avenue's median: a clipped hedge; the planted strip at the back of the north pavement
  const hedgeRun = (a0, p0, a1, p1) => { const len = Math.hypot(a1 - a0, p1 - p0), n = Math.ceil(len / 3); for (let i = 0; i < n; i++) { const f0 = i / n, f1 = (i + 1) / n, am = a0 + (a1 - a0) * (f0 + f1) / 2, pm = p0 + (p1 - p0) * (f0 + f1) / 2, [x, z] = ap(am, pm); if (inBuilding(x, z, 0.8)) continue; const d = [(a1 - a0) / len, (p1 - p0) / len]; obox(hedge, x, CH, z, ux * d[0] + nx * d[1], uz * d[0] + nz * d[1], len / n + 0.05, 1.25, 1.1); } };
  hedgeRun(66, 0, YIN.a0 - 16, 0); hedgeRun(YIN.a1 + 6, 0, 886, 0); hedgeRun(72, -50.4, YIN.a0 - 12, -50.4);
  // the roundabout's island: lawn, rings of bedding flowers, clipped balls
  fl.red.arc(C, 20, 23, 0, 360, CH + 0.1, 72); fl.yellow.arc(C, 15.5, 18, 0, 360, CH + 0.12, 60); fl.violet.arc(C, 6, 10.5, 0, 360, CH + 0.14, 40);
  for (let i = 0; i < 12; i++) { const [x, z] = polar(i * 30 + 15, 13); const geo = new THREE.SphereGeometry(1.1, 10, 8); geo.translate(x, CH + 0.8, z); hedge.push(geo); }
  { const geo = new THREE.SphereGeometry(2.6, 14, 10); geo.scale(1, 0.8, 1); geo.translate(C.x, CH + 1.6, C.z); hedge.push(geo); }
  const add = (o, cast = true) => { o.castShadow = cast; o.receiveShadow = true; g.add(o); };
  add(hedge.mesh(m.hedge, 'ljz-hedges')); add(wood.mesh(m.wood, 'ljz-benches')); add(st.mesh(m.steel, 'ljz-park-steel')); add(water.mesh(m.water, 'ljz-lake'), false); add(bank.mesh(m.granite, 'ljz-lake-edge'), false);
  add(mem.mesh(m.membrane, 'ljz-canopy')); add(stone.mesh(m.granite, 'ljz-park-stone'));
  add(fl.red.mesh(m.flowerRed, 'ljz-flowers-r'), false); add(fl.yellow.mesh(m.flowerYellow, 'ljz-flowers-y'), false); add(fl.violet.mesh(m.flowerViolet, 'ljz-flowers-v'), false);
}

// ================= the buildings around (OSM's footprints), the district's edge =================
// low and mid-rise blocks: stone or render with bands of windows, lit by the sun; their windows lit after dark
function blockTex(seed, { wall = '#c9c2b4', glass = '#3a4550', bay = 16, style = 0 } = {}) {
  const [c, x] = makeCanvas(256, 1024), r = rng(seed); x.fillStyle = wall; x.fillRect(0, 0, 256, 1024);
  const fh = 1024 / 24, w = 256 / bay, img = x.getImageData(0, 0, 256, 1024), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(img, 0, 0);
  const pane = (x0, y0, ww, hh) => { const gd = x.createLinearGradient(0, y0, 0, y0 + hh); gd.addColorStop(0, '#6f7c88'); gd.addColorStop(0.35, glass); gd.addColorStop(1, '#1f262d'); x.fillStyle = gd; x.fillRect(x0, y0, ww, hh); };
  for (let f = 0; f < 24; f++) {
    const y = f * fh;
    if (style === 0) {                                          // ribbon windows: a band of glass across each floor, slim mullions
      pane(0, y + fh * 0.34, 256, fh * 0.46); x.fillStyle = 'rgba(60,62,64,0.85)'; for (let b = 0; b <= bay; b++) x.fillRect(b * w - 1, y + fh * 0.34, 2, fh * 0.46);
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, y + fh * 0.8, 256, 2);
    } else if (style === 1) {                                   // punched windows with a reveal
      for (let b = 0; b < bay; b++) { pane(b * w + w * 0.24, y + fh * 0.3, w * 0.52, fh * 0.5); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(b * w + w * 0.24, y + fh * 0.3, w * 0.52, 2); x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(b * w + w * 0.2, y + fh * 0.8, w * 0.6, 2); }
    } else {                                                    // glass between stone piers
      for (let b = 0; b < bay; b++) pane(b * w + w * 0.14, y + fh * 0.12, w * 0.72, fh * 0.76);
      x.fillStyle = 'rgba(230,226,218,0.9)'; x.fillRect(0, y, 256, fh * 0.12);
    }
  }
  return tex(c, { aniso: 8 });
}
function blockLit(seed, bay = 16) {
  const [c, x] = makeCanvas(256, 1024), r = rng(seed); x.fillStyle = '#000'; x.fillRect(0, 0, 256, 1024);
  const fh = 1024 / 24;
  for (let f = 0; f < 24; f++) for (let b = 0; b < bay; b++) if (r() < 0.32) { const w = 256 / bay, k = 0.5 + r() * 0.5; x.fillStyle = r() < 0.6 ? `rgb(${255 * k | 0},${200 * k | 0},${140 * k | 0})` : `rgb(${200 * k | 0},${220 * k | 0},${250 * k | 0})`; x.fillRect(b * w + w * 0.18, f * fh + fh * 0.28, w * 0.64, fh * 0.52); }
  return tex(c, { aniso: 4 });
}
function blockMat(seed, opt) {
  const m = std({ map: blockTex(seed, opt), emissiveMap: blockLit(seed + 1, opt.bay || 16), emissive: 0xffffff, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.6, side: THREE.FrontSide });
  m.onBeforeCompile = (sh) => { sh.uniforms.todWin = TOD.windows; sh.uniforms.todDay = TOD.day; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float todWin, todDay;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= todWin * (1.0 - todDay) * 0.8;'); };
  m.customProgramCacheKey = () => 'ljz-block';
  return m;
}
export function buildSurroundings(g, m, lights, trees) {
  const r = rng(2031), hedge = new Batch(), hoard = new Batch(), st = new Batch(), roofs = new Tris(), plant = new Batch();
  // glass towers: four kinds of glass seen in Lujiazui; blocks: three kinds of facade
  const GLASS = [
    { tint: [0.72, 0.84, 0.96], f0: 0.32, atlas: { glass: '#0e1b2a', warm: 0.25, occ: 0.22 }, frame: [0.62, 0.66, 0.7] },            // blue reflective
    { tint: [0.86, 0.89, 0.91], f0: 0.36, atlas: { glass: '#141a20', warm: 0.4, occ: 0.2 }, frame: [0.74, 0.75, 0.76] },             // silver
    { tint: [0.74, 0.88, 0.84], f0: 0.27, atlas: { glass: '#0f201c', warm: 0.35, occ: 0.24 }, frame: [0.55, 0.6, 0.58] },            // green-grey
    { tint: [0.92, 0.82, 0.66], f0: 0.26, atlas: { glass: '#241a0a', warm: 0.9, occ: 0.3, fin: 'rgba(255,205,120,0.5)' }, frame: [0.7, 0.62, 0.48] },   // bronze
  ].map((k, i) => ({ ...k, tris: new Tris(24), mat: null, i }));
  const BLOCK = [{ wall: '#a9aaa6', glass: '#3c4855', style: 0 }, { wall: '#c4bdb0', glass: '#38434e', style: 1, bay: 12 }, { wall: '#bfc1c0', glass: '#34414d', style: 2, bay: 12 }].map((k, i) => ({ ...k, tris: new Tris(24), i }));
  const skip = new Set([IFC.north, IFC.south, IFC.mall].map((B) => B.osm));
  for (const B of BUILDINGS) {
    if (skip.has(B.osm) || B.h - B.min < 2) continue;
    const hsh = (B.osm * 2654435761 % 997) / 997, glassy = B.mat === 'glass' || (B.h >= 45 && B.kind !== 'apartments') || (B.part && B.h >= 40);
    const K = glassy ? GLASS[Math.floor(hsh * 4)] : BLOCK[Math.floor(hsh * 3)];
    walls(K.tris, B.P, B.min, B.h, hsh * 24);
    cap(roofs, B.P, B.h);
    // on a tall roof: the plant room, set in from the edge
    if (B.h > 60 && B.P.length >= 4) { const inner = shrink(B.P, 0.45, [B.cx, B.cz]); walls(roofs, inner, B.h, B.h + 4 + hsh * 4); cap(roofs, inner, B.h + 4 + hsh * 4); }
  }
  for (const K of GLASS) { if (K.tris.empty) continue; const o = K.tris.mesh(facadeGlass(curtainAtlas(41 + K.i, { ...K.atlas, fin: K.atlas.fin || 'rgba(200,215,228,0.5)' }), { tint: K.tint, f0: K.f0, frame: K.frame, seed: 11 + K.i * 7 }), `ljz-osm-glass-${K.i}`); o.castShadow = true; o.receiveShadow = true; g.add(o); }
  for (const K of BLOCK) { if (K.tris.empty) continue; const o = K.tris.mesh(blockMat(61 + K.i * 3, K), `ljz-osm-blocks-${K.i}`); o.castShadow = true; o.receiveShadow = true; g.add(o); }
  { const o = roofs.mesh(std({ color: 0x6b6e6c, roughness: 0.9 }), 'ljz-osm-roofs'); o.castShadow = true; o.receiveShadow = true; g.add(o); }
  // Super Brand Mall's name, on its face toward the roundabout
  { const SB = BUILDINGS.find((B) => /正大广场/.test(B.name?.zh || '')); const F = SB && faceToward(SB.P, C.x, C.z);
    if (F) g.add(sign(['正大广场', 'SUPER BRAND MALL'], { w: 34, h: 8, x: F.x + F.nx * 0.4, y: SB.h - 8, z: F.z + F.nz * 0.4, ry: Math.atan2(F.nx, F.nz), color: '#ffe9c0', bg: null, ch: 'signs', gain: 1.5 })); }
  // the district's edge: hedges where the pavement goes on beyond, a hoarding across the far end of each pavement
  const edge = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.5)), tx = (x1 - x0) / len, tz = (z1 - z0) / len;
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f, in1 = inDistrict(x - tz * 0.9, z + tx * 0.9), in2 = inDistrict(x + tz * 0.9, z - tx * 0.9);
      if (in1 === in2) continue; const ox = in1 ? x + tz * 0.9 : x - tz * 0.9, oz = in1 ? z - tx * 0.9 : z + tx * 0.9; if (kindAt(ox, oz) === KIND.road || kindAt(x, z) === KIND.road) continue;
      if (inBuilding(ox, oz, 0.4)) continue;
      obox(hedge, ox - (in1 ? tz : -tz) * 0.1, CH, oz + (in1 ? tx : -tx) * 0.1, tx, tz, len / n + 0.06, 1.3, 1.0); } };
  for (let b = 0; b < 360; b += 1.2) edge(...polar(b, 135), ...polar(b + 1.2, 135));
  const apEdge = (a0, p0, a1, p1) => { const n = Math.ceil(Math.hypot(a1 - a0, p1 - p0) / 3); for (let i = 0; i < n; i++) edge(...fromAP(a0 + (a1 - a0) * i / n, p0 + (p1 - p0) * i / n), ...fromAP(a0 + (a1 - a0) * (i + 1) / n, p0 + (p1 - p0) * (i + 1) / n)); };
  apEdge(30, -66, 760, -66); apEdge(30, 40, 760, 40); apEdge(30, 140, 362, 140); apEdge(362, 40, 362, 140); apEdge(30, 16, 30, 140);
  for (let i = 0; i < GREEN.P.length; i++) { const [x0, z0] = GREEN.P[i], [x1, z1] = GREEN.P[(i + 1) % GREEN.P.length], n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 3); for (let k = 0; k < n; k++) edge(x0 + (x1 - x0) * k / n, z0 + (z1 - z0) * k / n, x0 + (x1 - x0) * (k + 1) / n, z0 + (z1 - z0) * (k + 1) / n); }
  { const d = dirOf(AVE + 90); for (const [p0, p1] of [[-66, -17], [17, 40]]) { const [hx, hz] = fromAP(760.4, (p0 + p1) / 2); obox(hoard, hx, CH, hz, d[0], d[1], p1 - p0, 2.4, 0.12); } }
  // the Pearl's park fence, where it comes near the street (a low rail on a stone kerb)
  for (let i = 0; i < PEARL_PARK.length; i++) { const [x0, z0] = PEARL_PARK[i], [x1, z1] = PEARL_PARK[(i + 1) % PEARL_PARK.length]; if (Math.hypot((x0 + x1) / 2 - C.x, (z0 + z1) / 2 - C.z) > 260) continue; const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.5) continue; obox(st, (x0 + x1) / 2, CH + 1.0, (z0 + z1) / 2, (x1 - x0) / len, (z1 - z0) / len, len, 0.05, 0.05); for (let k = 0; k < len; k += 2.5) st.box(x0 + (x1 - x0) * k / len, CH, z0 + (z1 - z0) * k / len, 0.06, 1.0, 0.06); }
  // trees on the pavements: along the avenue, round the roundabout, in the Pearl's park
  const clear = (x, z, rr = 3) => !inBuilding(x, z, rr) && Math.hypot(x - APPLE.x, z - APPLE.z) > APPLE.rOut + 4 && !METRO_LJZ.some((M) => Math.hypot(x - M.top[0] - M.dx * 5.6, z - M.top[1] - M.dz * 5.6) < 9) && Math.hypot(x - LJZ.kerbPickup.x, z - LJZ.kerbPickup.z) > 9 && !RAMPS.some((R) => Math.hypot(x - R.bot[0], z - R.bot[1]) < 10 || Math.hypot(x - (R.top[0] + R.bot[0]) / 2, z - (R.top[1] + R.bot[1]) / 2) < 8);
  for (let a = 70; a < 756; a += 13) { if (a > YIN.a0 - 22 && a < YIN.a1 + 12) continue; for (const p of [-20.5, 20.5]) { const [x, z] = fromAP(a + (p > 0 ? 6 : 0), p); if (inDistrict(x, z) && !carriage(x, z) && clear(x, z)) trees.push({ x, z, h: 8 + r() * 2, r: 2.6 }); } }
  for (let b = 0; b < 360; b += 8) { const [x, z] = polar(b, 96 + (b % 16 ? 0 : 8)); if (kindAt(x, z) === KIND.pave && inDistrict(x, z) && !carriage(...polar(b, 90)) && clear(x, z, 4)) trees.push({ x, z, h: 8 + r() * 3 }); }
  for (let i = 0; i < 70; i++) { const xs = PEARL_PARK.map((q) => q[0]), zs = PEARL_PARK.map((q) => q[1]), x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs)); if (inPoly(PEARL_PARK, x, z) && kindAt(x, z) === KIND.grass && Math.hypot(x - 640, z + 42) > 68 && !inBuilding(x, z, 2)) trees.push({ x, z, h: 8 + r() * 5, solid: false }); }
  const add = (o) => { o.castShadow = true; o.receiveShadow = true; g.add(o); };
  add(hedge.mesh(m.hedge, 'ljz-edge-hedges')); add(hoard.mesh(m.hoard, 'ljz-hoardings')); add(st.mesh(m.steel, 'ljz-fence')); void plant;
}

// ================= street furniture: lamps, signals, signs =================
export function buildStreet(g, m, lights) {
  const st = new Batch(), dark = new Batch(), [ux, uz] = dirOf(AVE), [nx, nz] = dirOf(AVE + 90);
  // street lamps: a tall post, an arm over the carriageway
  const lamp = (x, z, toX, toZ) => { const l = Math.hypot(toX, toZ) || 1, dx = toX / l, dz = toZ / l; st.cyl(x, CH, z, 0.09, 0.14, 9.4, 10); obox(st, x + dx * 1.3, 9.4, z + dz * 1.3, dx, dz, 2.8, 0.1, 0.12); lights.lamp(x + dx * 2.5, 9.3, z + dz * 2.5, 0.34, { intensity: 150, distance: 50, pool: 24, px: x + dx * 3, pz: z + dz * 3, color: [1.0, 0.86, 0.66] }); addCircle(x, z, 0.16, { y1: 3 }); };
  for (let a = 78; a < 756; a += 32) { if (a > YIN.a0 - 20 && a < YIN.a1 + 6) continue; for (const s of [-1, 1]) { const [x, z] = fromAP(a + (s > 0 ? 16 : 0), s * 18.2); if (Math.hypot(x - LJZ.kerbPickup.x, z - LJZ.kerbPickup.z) > 5 && !inBuilding(x, z, 1) && inDistrict(x, z)) lamp(x, z, -s * nx, -s * nz); } }
  for (let b = 0; b < 360; b += 18) { const [x, z] = polar(b, 84); if (carriage(x, z) || carriage(...polar(b, 79)) || Math.hypot(x - APPLE.x, z - APPLE.z) < APPLE.rOut + 6 || inBuilding(x, z, 1.5) || RAMPS.some((R) => Math.hypot(x - R.bot[0], z - R.bot[1]) < 7 || Math.hypot(x - (R.top[0] + R.bot[0]) / 2, z - (R.top[1] + R.bot[1]) / 2) < 7)) continue; const d = dirOf(b + 180); lamp(x, z, d[0], d[1]); }
  for (const A of ARMS) { if (A.id === 'century') continue; for (let al = 78; al < 124; al += 30) for (const s of [-1, 1]) { const x = C.x + A.dx * al + A.px * s * (A.hw + 1.2), z = C.z + A.dz * al + A.pz * s * (A.hw + 1.2); if (inDistrict(x, z) && !carriage(x, z)) lamp(x, z, -s * A.px, -s * A.pz); } }
  // round the Apple plaza's edge: low bollard lights (open toward the roundabout)
  for (let b = 45; b <= 315; b += 30) { const [x, z] = applePt(b, APPLE.rOut - 0.25); if (!inDistrict(x, z) || carriage(x, z)) continue; st.cyl(x, CH, z, 0.07, 0.07, 0.9, 8); lights.lamp(x, CH + 0.95, z, 0.14, { intensity: 7, distance: 9, pool: 6 }); addCircle(x, z, 0.12, { y1: 2 }); }
  // road-name plates at the mouths of the roads (blue, white letters, as Shanghai's are)
  for (const A of ARMS) {
    const al = 70, s = A.id === 'century' ? -1 : 1, x = C.x + A.dx * al + A.px * s * (A.hw + 2.2), z = C.z + A.dz * al + A.pz * s * (A.hw + 2.2);
    if (!inDistrict(x, z) || carriage(x, z)) continue;
    st.cyl(x, CH, z, 0.04, 0.04, 2.9, 8); addCircle(x, z, 0.1, { y1: 3 });
    for (const f of [1, -1]) g.add(sign([A.zh, `${A.en}`], { w: 1.5, h: 0.52, x: x + A.px * 0.03 * f, y: 2.75, z: z + A.pz * 0.03 * f, ry: Math.atan2(A.px * f, A.pz * f), bg: '#1d4f9c', color: '#fff' }));
  }
  // pedestrian wayfinding on the ring, at the head of each stair: what lies that way
  const WAY = { 60: ['地铁2号线 1号口 · 世纪大道北侧 · 中心绿地', 'Metro Line 2 Exit 1 · Century Ave north · Central Green'], 190: ['陆家嘴环路 · 香格里拉', 'Lujiazui Ring Rd · Shangri-La'], 235: ['正大广场 · 陆家嘴西路', 'Super Brand Mall · West Lujiazui Rd'], 290: ['丰和路 · 国际会议中心', 'Fenghe Rd · Intl Convention Center'], 330: ['东方明珠广播电视塔', 'Oriental Pearl Tower'], 150: ['国金中心 · Apple · 地铁6号口', 'IFC · Apple · Metro Exit 6'] };
  for (const R of RAMPS) {
    const sp = R.kind === 'spur', [x, z] = sp ? rpolar(SPUR.b, RING.r1 + 1.2) : rpolar(R.b - 5.4, RING.r1 - 0.6), d = dirOf(R.b);
    const px = x + (sp ? dirOf(R.b + 90)[0] * 6.4 : 0), pz = z + (sp ? dirOf(R.b + 90)[1] * 6.4 : 0);
    st.cyl(px, RING.y, pz, 0.04, 0.04, 2.6, 8);
    g.add(sign(WAY[R.b], { w: 2.6, h: 0.62, x: px - d[0] * 0.05, y: RING.y + 2.4, z: pz - d[1] * 0.05, ry: Math.atan2(-d[0], -d[1]), bg: '#14458f', color: '#fff', both: false }));
  }
  // the ferry's sign, where the way down to the Dongchang Road pier leaves West Lujiazui Road
  { const F = LJZ.ferrySign, d = dirOf(65); st.cyl(F.x, CH, F.z, 0.05, 0.05, 2.8, 8); addCircle(F.x, F.z, 0.12, { y1: 3 });
    for (const f of [1, -1]) g.add(sign(['轮渡 · 东昌路码头 → 外滩', 'Ferry · Dongchang Rd pier → the Bund'], { w: 1.8, h: 0.6, x: F.x + d[0] * 0.03 * f, y: 2.55, z: F.z + d[1] * 0.03 * f, ry: Math.atan2(d[0] * f, d[1] * f), bg: '#0f2a24', color: '#ffe08a' })); }
  // the ride-hailing point at IFC's kerb
  { const K = LJZ.kerbPickup, x = K.x - ux * 3.2, z = K.z - uz * 3.2; st.cyl(x, CH, z, 0.04, 0.04, 2.7, 8); addCircle(x, z, 0.1, { y1: 3 });
    for (const f of [1, -1]) g.add(sign(['网约车上下客点', 'Ride-hailing pick-up'], { w: 1.3, h: 0.56, x: x + ux * 0.03 * f, y: 2.5, z: z + uz * 0.03 * f, ry: Math.atan2(ux * f, uz * f), bg: '#1b2733', color: '#ffb05a' })); }
  // signals at Century Avenue / Yincheng Road: posts with a vehicle head; a green / red man at each end of the zebras
  const heads = { ave: [], yin: [], z1: [], z2: [] }, bulb = new THREE.SphereGeometry(0.13, 10, 8), man = new THREE.PlaneGeometry(0.34, 0.34);
  const veh = (a, p, key, facing) => { const [x, z] = fromAP(a, p); st.cyl(x, CH, z, 0.07, 0.09, 5.6, 8); const f = dirOf(facing); obox(dark, x + f[0] * 0.12, 4.3, z + f[1] * 0.12, f[0], f[1], 0.22, 1.25, 0.36); const set = [0, 1, 2].map((i) => { const b = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: 0x111111 })); b.material.userData.todSkip = true; b.position.set(x + f[0] * 0.26, 5.3 - i * 0.38, z + f[1] * 0.26); g.add(b); return b.material; }); heads[key].push(set); addCircle(x, z, 0.14, { y1: 3 }); };
  veh(YIN.a0 - 15, 18.2, 'ave', AVE + 180); veh(YIN.a1 + 4, -18.2, 'ave', AVE); veh(YIN.a0 - 1.2, -34, 'yin', AVE + 270); veh(YIN.a1 + 1.2, 21, 'yin', AVE + 90);
  const ped = (a, p, key, facing) => { const [x, z] = fromAP(a, p); st.cyl(x, CH, z, 0.05, 0.05, 2.9, 8); const f = dirOf(facing); obox(dark, x + f[0] * 0.08, 2.35, z + f[1] * 0.08, f[0], f[1], 0.14, 0.85, 0.42); const set = [0, 1].map((i) => { const b = new THREE.Mesh(man, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })); b.material.userData.todSkip = true; b.position.set(x + f[0] * 0.16, 2.98 - i * 0.4, z + f[1] * 0.16); b.rotation.y = Math.atan2(f[0], f[1]); g.add(b); return b.material; }); heads[key].push(set); addCircle(x, z, 0.1, { y1: 3 }); };
  const zc = (ZEBRAS[1].a0 + ZEBRAS[1].a1) / 2; ped(YIN.a0 - 0.9, -27.5, 'z1', AVE); ped(YIN.a1 + 0.9, -27.5, 'z1', AVE + 180); ped(zc, 18, 'z2', AVE + 270); ped(zc, -18, 'z2', AVE + 90);
  const a1 = st.mesh(m.steel, 'ljz-street-steel'), a2 = dark.mesh(m.dark, 'ljz-street-dark'); a1.castShadow = a2.castShadow = true; g.add(a1, a2);
  return heads;
}

// the lamps' glass, their halos and the pools of light under them: one mesh / one set of points each
export function lampKit(m) {
  const glass = new Batch(), halos = [], pools = [], sources = [];
  sources.lamp = (x, y, z, r, { intensity, distance, pool = 0, px = x, pz = z, color = [1.0, 0.88, 0.7], py = CH } = {}) => {
    glass.add(new THREE.SphereGeometry(r, 10, 8), { x, y, z }); halos.push(x, y, z);
    if (pool) pools.push(px, py, pz, pool);
    sources.push({ x, y: y - 0.2, z, intensity, distance, color: new THREE.Color(...color), out: true });
  };
  sources.finish = (g) => {
    if (!glass.empty) g.add(glass.mesh(m.lamp, 'ljz-lamps'));
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(halos, 3));
    const hp = new THREE.Points(hg, asLight(new THREE.PointsMaterial({ map: glowTexture(128), color: new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(0.3), size: 1.7, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 'lamps', 0));
    hp.name = 'ljz-halos'; hp.frustumCulled = false; g.add(hp);
    const pg = [], pu = [];
    for (let i = 0; i < pools.length; i += 4) { const [x, y, z, s] = pools.slice(i, i + 4), h = s / 2, yy = y + 0.035; pg.push(x - h, yy, z + h, x + h, yy, z + h, x + h, yy, z - h, x - h, yy, z + h, x + h, yy, z - h, x - h, yy, z - h); pu.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pg, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(pu, 2));
    const pm = new THREE.Mesh(geo, asLight(new THREE.MeshBasicMaterial({ map: glowTexture(128, [[0, 0.5], [0.4, 0.2], [1, 0]]), color: new THREE.Color(1.0, 0.7, 0.42).multiplyScalar(0.13), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), 'lamps', 0));
    pm.name = 'ljz-light-pools'; g.add(pm);
  };
  return sources;
}
