// Lujiazui's structures: the ring bridge and its stairs, the Apple court and its glass cylinder, IFC,
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
  C, RING, ARMS, COLUMNS, SPUR, RAMPS, APPLE, METRO_LJZ, IFC, BUILDINGS, GREEN, LAKE, CANOPY, LOOP, BENCHES, YIN, CH, AVE, AVE_ROT,
  dirOf, polar, fromAP, toAP, applePt, wellPt, carriage, inDistrict, inLake, loopPt, addBox, addCircle, courtStairY, LJZ,
} from './lujiazuiLayout.js';
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
export const LJZ_TEXT = '陆家嘴站 Lujiazui 号口 Exit 进站 Entrance 号线 Line 东方明珠 正大广场 国金中心 世纪大道 环路 西路 丰和路 银城中路 中心绿地 商场 上海 北侧 网约车上下客点 广播电视塔 办公楼大堂 地铁 步行 请勿翻越护栏 注意安全 中银大厦 SUPER BRAND MALL ifc mall Shanghai Century Avenue Central Green Oriental Pearl Tower Metro Ride-hailing pick-up Ring Rd Fenghe Yincheng 人行天桥 明珠环 东 西 南 北 E W S N ↑ ← → 2 14 1 6 8 米 m';

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
    appleGlass: new THREE.MeshPhysicalMaterial({ color: 0xcfe6e6, emissive: 0x1c2a2c, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02 }),
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
  top.arc(C, RING.r0, RING.r1, 0, 360, Y, 120); und.arc(C, RING.r0, RING.r1, 0, 360, yU, 120);
  fas.drum(C, RING.r1 + 0.05, 0, 360, yU, Y + 0.28, 120); fas.drum(C, RING.r0 - 0.05, 0, 360, yU, Y + 0.28, 120);
  led.drum(C, RING.r1 + 0.07, 0, 360, yU + 0.04, yU + 0.14, 120); led.drum(C, RING.r0 - 0.07, 0, 360, yU + 0.04, yU + 0.14, 120);
  // glass balustrades with a steel rail, a light under the rail
  for (let b = 0; b < 360; b += 3) {
    const rail = (r) => { const [x0, z0] = polar(b, r), [x1, z1] = polar(b + 3, r); gl.wall(x0, z0, x1, z1, Y + 0.28, Y + 1.2); const [dx, dz] = dirOf(b + 91.5); obox(st, (x0 + x1) / 2, Y + 1.2, (z0 + z1) / 2, dx, dz, Math.hypot(x1 - x0, z1 - z0) + 0.02, 0.06, 0.09); };
    rail(RING.r0 + 0.14);
    if (!open(b + 1.5)) rail(RING.r1 - 0.14);
  }
  for (let b = 0; b < 360; b += 12) for (const r of [RING.r0 + 0.14, RING.r1 - 0.14]) { if (r > RING.rc && open(b)) continue; const [x, z] = polar(b, r); st.box(x, Y + 0.2, z, 0.06, 1.0, 0.06); }
  // columns: a round shaft flaring into the deck
  for (const b of COLUMNS) { const [x, z] = polar(b, RING.rc); con.cyl(x, CH, z, 0.62, 0.72, 3.3, 20); con.cyl(x, CH + 3.3, z, 2.0, 0.62, yU - CH - 3.3, 20); con.cyl(x, CH, z, 0.95, 1.0, 0.25, 20); }
  // the spur toward IFC: a wide deck
  const sp = (s, l, y) => [C.x + sdx * s + spx * l, y, C.z + sdz * s + spz * l];
  top.quad(sp(RING.r1 - 0.3, -SPUR.hw, Y), sp(SPUR.s1, -SPUR.hw, Y), sp(SPUR.s1, SPUR.hw, Y), sp(RING.r1 - 0.3, SPUR.hw, Y));
  und.quad(sp(RING.r1 - 0.3, -SPUR.hw, yU), sp(SPUR.s1, -SPUR.hw, yU), sp(SPUR.s1, SPUR.hw, yU), sp(RING.r1 - 0.3, SPUR.hw, yU));
  const SR = RAMPS[RAMPS.length - 1];
  for (const s of [-1, 1]) {
    const a = sp(RING.r1, s * SPUR.hw, 0), b = sp(SPUR.s1, s * SPUR.hw, 0), e = sp(SPUR.s1, s * SR.hw, 0);
    fas.wall(a[0], a[2], b[0], b[2], yU, Y + 0.28); gl.wall(a[0], a[2], b[0], b[2], Y + 0.28, Y + 1.2); obox(st, (a[0] + b[0]) / 2, Y + 1.2, (a[2] + b[2]) / 2, sdx, sdz, SPUR.s1 - RING.r1, 0.06, 0.09);
    fas.wall(b[0], b[2], e[0], e[2], yU, Y + 0.28); gl.wall(b[0], b[2], e[0], e[2], Y + 0.28, Y + 1.2);
  }
  { const [x, z] = polar(SPUR.b, SPUR.s1 - 1.2); for (const l of [-4.6, 4.6]) { con.cyl(x + spx * l, CH, z + spz * l, 0.5, 0.6, yU - CH, 16); addCircle(x + spx * l, z + spz * l, 0.6, { y1: 5 }); } }
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
  for (let b = 0; b < 360; b += 30) { const [x, z] = polar(b + 15, RING.rc); lights.push({ x, y: Y + 2.4, z, intensity: 30, distance: 16, color: new THREE.Color(1.0, 0.92, 0.8), out: true }); }
  for (let b = 0; b < 360; b += 45) { const [x, z] = polar(b + 7, RING.rc); lights.push({ x, y: yU - 0.3, z, intensity: 22, distance: 14, color: new THREE.Color(0.85, 0.92, 1.0), out: true }); }
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
export function buildApple(g, m, lights) {
  const A = APPLE, T = A.stairs, yP = A.yPlaza, yS = A.yStore, o = A, E = A.entry;
  const floor = new Tris(1.6), wall = new Tris(), gl = new Tris(), ag = new Tris(), stair = new Tris(), st = new Batch(), wood = new Batch(), soil = new Tris(), ceil = new Tris(), warm = new Tris(), storeWall = new Tris(), treads = new Tris(), dark = new Batch();
  // the court's floor (but for the stair well inside the cylinder), the landing inside the cylinder
  floor.arc(o, A.rCyl, A.rPlaza, 0, 360, yP, 72);
  floor.arc(o, A.rCore, A.rCyl, E + A.landing[0], E + A.landing[1], yP, 12);
  // the two curved stairs, 34 steps each, and their landings
  const n = 34, rise = (CH - yP) / n, span = (T.foot - T.top) / n;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const a0 = E + s * (T.top + i * span), a1 = E + s * (T.top + (i + 1) * span), y = CH - (i + 1) * rise;
      stair.arc(o, A.rPlaza, A.rOut, a0, a1, y, 1);
      const [x0, z0] = polar(a0, A.rPlaza, o), [x1, z1] = polar(a0, A.rOut, o); stair.wall(x0, z0, x1, z1, y, y + rise);
    }
    stair.arc(o, A.rPlaza, A.rOut, E + s * T.foot, E + s * T.land, yP, 4);
    const yStair = (b) => courtStairY(Math.abs(((b - E + 540) % 360) - 180));
    // inner side: the court's wall up to the stair, glass above it (open at the foot); outer side: the retaining wall, glass at street level
    wall.drum(o, A.rPlaza, E + s * T.top, E + s * T.open[0], yP, yStair, 30);
    gl.drum(o, A.rPlaza + 0.1, E + s * T.top, E + s * T.open[0], yStair, (b) => yStair(b) + 1.1, 30);
    wall.drum(o, A.rPlaza, E + s * T.open[1], E + s * T.land, yP, CH, 2);
    wall.drum(o, A.rOut, E + s * T.top, E + s * T.land, yStair, CH, 30);
    { const [x0, z0] = polar(E + s * T.land, A.rPlaza, o), [x1, z1] = polar(E + s * T.land, A.rOut, o); wall.wall(x0, z0, x1, z1, yP, CH + 0.4); }
    gl.drum(o, A.rail - 0.2, E + s * T.top, E + s * 180, CH, CH + 1.15, 44);
    { const [x0, z0] = polar(E + s * T.top, A.rPlaza, o), [x1, z1] = polar(E + s * T.top, A.rail - 0.2, o); gl.wall(x0, z0, x1, z1, CH, CH + 1.15); }
  }
  stair.arc(o, A.rPlaza, A.rOut, E - T.top, E + T.top, CH, 6);                       // the top landing
  wall.drum(o, A.rPlaza, E - T.top, E + T.top, yP, CH, 6);
  gl.drum(o, A.rPlaza + 0.1, E - T.top, E + T.top, CH, CH + 1.15, 6);
  // the mall side: its lower-ground shopfront round the court's back, a planted ledge above
  warm.drum(o, A.rPlaza - 0.02, E + T.land, E + 360 - T.land, yP + 0.2, yP + 3.9, 40, 1);
  wall.drum(o, A.rPlaza, E + T.land, E + 360 - T.land, yP + 3.9, CH + 0.4, 40); wall.drum(o, A.rPlaza, E + T.land, E + 360 - T.land, yP, yP + 0.2, 40);
  soil.arc(o, A.rPlaza, A.rOut + 0.2, E + T.land, E + 360 - T.land, CH + 0.4, 40);
  for (let b = T.land + 4; b < 360 - T.land - 2; b += 5) { const [x, z] = applePt(b, 19.3); soil.arc({ x, z }, 0, 1.5, 0, 360, CH + 1.0, 6); soil.drum({ x, z }, 1.5, 0, 360, CH + 0.4, CH + 1.0, 6); }
  // ---- the glass cylinder: twelve curved panels, a glass roof, the door facing the stairs ----
  const yTop = yP + A.cylH, doorH = 2.7;
  ag.drum(o, A.rCyl, E + A.door, E + 360 - A.door, yP, yP + doorH, 44); ag.drum(o, A.rCyl, 0, 360, yP + doorH, yTop, 48); ag.arc(o, 0, A.rCyl, 0, 360, yTop, 24);
  for (let i = 0; i < 12; i++) { const [x, z] = polar(E + 15 + i * 30, A.rCyl, o); st.box(x, yP, z, 0.025, A.cylH, 0.025); }
  for (const s of [-1, 1]) { const [x, z] = polar(E + s * A.door, A.rCyl, o); st.box(x, yP, z, 0.06, doorH, 0.06); }
  // below the court: the drum goes on down to the store's floor, open at the stair's foot
  ag.drum(o, A.rCyl, E + A.foot[1], E + 360 + A.foot[0], yS, yP - 0.4, 40);
  // the lift's glass core, the spiral stair round it: glass treads, glass balustrade, a steel rail
  const core = new Tris(); core.drum(o, A.rCore, 0, 360, yS, yP + 2.6, 24); core.arc(o, 0, A.rCore, 0, 360, yP + 2.6, 12);
  const SPI = A.spiral, ns = 30, stepA = SPI.total / ns, drop = SPI.drop / ns;
  for (let i = 0; i < ns; i++) {
    const a0 = E + SPI.start + i * stepA, a1 = a0 + stepA, y = yP - (i + 1) * drop;
    treads.arc(o, A.rCore, SPI.r1 + 0.2, a0, a1, y, 2); treads.arc(o, A.rCore, SPI.r1 + 0.2, a0, a1, y - 0.07, 2);
    const [x0, z0] = polar(a0, A.rCore, o), [x1, z1] = polar(a0, SPI.r1 + 0.2, o); treads.wall(x0, z0, x1, z1, y - 0.07, y);
    const [hx, hz] = polar((a0 + a1) / 2, SPI.r1 + 0.2, o), [tx, tz] = dirOf((a0 + a1) / 2 + 90), L = (SPI.r1 + 0.2) * stepA * D2R + 0.04;
    const geo = new THREE.BoxGeometry(L, 0.05, 0.05); geo.rotateZ(-Math.atan2(drop, L)); geo.rotateY(Math.atan2(-tz, tx)); geo.translate(hx, y + drop / 2 + 0.98, hz); st.push(geo);
  }
  ag.drum(o, SPI.r1 + 0.2, E + SPI.start, E + SPI.start + SPI.total, (b) => yP - SPI.drop * (b - E - SPI.start) / SPI.total, (b) => yP - SPI.drop * (b - E - SPI.start) / SPI.total + 0.98, 60);
  { const [x0, z0] = polar(E + A.landing[0], A.rCore, o), [x1, z1] = polar(E + A.landing[0], A.rCyl - 0.3, o); ag.wall(x0, z0, x1, z1, yP, yP + 1.0); }
  // the logo, hung high in the cylinder, facing the stairs (and the Pearl)
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: appleLogo(), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  logo.material.color.setScalar(1.5); logo.material.userData.todSkip = true;
  logo.position.set(A.x, yTop - 2.9, A.z); logo.rotation.y = Math.atan2(...dirOf(E)); logo.name = 'ljz-apple-logo'; logo.renderOrder = 2; g.add(logo);
  // ---- the store under the court: a round room, long oak tables, a ring of light in the ceiling ----
  floor.arc(o, 0, A.storeR, 0, 360, yS, 60);
  storeWall.drum(o, A.storeR - 0.02, 0, 360, yS, yP - 0.4, 60);
  ceil.keepDown = true; ceil.arc(o, A.rCyl, A.storeR, 0, 360, yP - 0.4, 60);
  const glow = new Tris(); glow.keepDown = true;
  for (const r of [8, 12]) glow.arc(o, r - 0.25, r + 0.25, 0, 360, yP - 0.41, 60);
  for (const tb of A.tables) {
    const [x, z] = applePt(tb.ang, tb.r), [rx, rz] = dirOf(E + tb.ang);
    obox(wood, x, yS + 0.82, z, rx, rz, 3.2, 0.09, 1.25); for (const s of [-1.3, 1.3]) obox(wood, x + rx * s, yS, z + rz * s, rx, rz, 0.12, 0.82, 1.1);
    for (let i = 0; i < 5; i++) for (const sd of [-0.36, 0.36]) obox(dark, x + rx * (-1.2 + i * 0.6) - rz * sd, yS + 0.915, z + rz * (-1.2 + i * 0.6) + rx * sd, rx, rz, i % 2 ? 0.16 : 0.26, 0.012, i % 2 ? 0.08 : 0.19);
  }
  lights.push({ x: A.x + 6, y: yP - 0.9, z: A.z + 6, intensity: 16, distance: 18, color: new THREE.Color(1.0, 0.93, 0.82) }, { x: A.x - 7, y: yP - 0.9, z: A.z - 5, intensity: 16, distance: 18, color: new THREE.Color(1.0, 0.93, 0.82) });
  lights.push({ x: A.x, y: yP + 4, z: A.z, intensity: 20, distance: 22, color: new THREE.Color(0.95, 0.97, 1.0) });
  const shop = asLight(new THREE.MeshBasicMaterial({ map: shopfronts(), side: THREE.DoubleSide }), 'shops', 0.3); shop.color.setScalar(1.0);
  const warmWall = std({ color: 0xd9cdb8, roughness: 0.7, emissive: 0x4a4034 });
  const add = (o2, cast = true) => { o2.castShadow = cast; o2.receiveShadow = true; g.add(o2); return o2; };
  add(floor.mesh(m.stone, 'ljz-apple-floor'), false); add(wall.mesh(m.stoneWarm, 'ljz-apple-walls')); add(stair.mesh(m.stone, 'ljz-apple-stairs')); add(st.mesh(m.steel, 'ljz-apple-steel'));
  add(soil.mesh(m.hedge, 'ljz-apple-planting')); add(wood.mesh(m.wood, 'ljz-apple-tables')); add(dark.mesh(m.dark, 'ljz-apple-devices'), false);
  add(ceil.mesh(m.white, 'ljz-apple-ceiling'), false); g.add(glow.mesh(lit(1.8, 1.7, 1.55, { userData: { todSkip: true } }), 'ljz-apple-ceiling-light'));
  g.add(warm.mesh(shop, 'ljz-mall-lg1')); add(storeWall.mesh(warmWall, 'ljz-apple-store-wall'), false);
  const tr = treads.mesh(std({ color: 0xdfeeee, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }), 'ljz-apple-treads'); tr.renderOrder = 4; g.add(tr);
  const cm = core.mesh(std({ color: 0xbfd6d8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.3, depthWrite: false }), 'ljz-apple-lift'); cm.renderOrder = 4; g.add(cm);
  const gm = gl.mesh(m.glass, 'ljz-apple-rails'); gm.renderOrder = 3; g.add(gm);
  const am = ag.mesh(m.appleGlass, 'ljz-apple-cylinder'); am.renderOrder = 5; g.add(am);
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
// the curtain wall's material: by night the atlas (lit rooms, fewer late); by day pale glass in which the
// floors and the lit rooms only just read (dayNight.js glassByDay, with far less contrast: these are seen close)
function curtainMat(map, day, gain = 1, contrast = 0.3, side = THREE.FrontSide) {
  const m = new THREE.MeshBasicMaterial({ map, side }); m.color.setScalar(gain); m.userData.tod = 'glass';
  const glass = { value: new THREE.Color(...day) };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { todDay: TOD.day, todWin: TOD.windows, todAmb: TOD.amb, todGlass: glass });
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float todDay, todWin, todAmb; uniform vec3 todGlass;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float l = clamp(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15)), 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb * mix(0.35, 1.0, todWin), todGlass * todAmb * (0.86 + ${contrast.toFixed(2)} * sqrt(l)), todDay); }`);
  };
  m.customProgramCacheKey = () => `ljz-curtain-${contrast}`;
  return m;
}
// a box tower (any heading) with curtain-wall UVs in metres; its top face dark
function curtainBox(batch, B, y0, h, r) {
  const g = new THREE.BoxGeometry(B.hx * 2, h, B.hz * 2), uv = g.attributes.uv, ou = Math.floor(r() * 16) / 16, ov = Math.floor(r() * 24) / 24;
  const dims = [B.hz * 2, B.hz * 2, 0, 0, B.hx * 2, B.hx * 2];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; if (f === 2 || f === 3) uv.setXY(k, 0.002, 0.002); else uv.setXY(k, ou + (uv.getX(k) * dims[f]) / 24, ov + (y0 + uv.getY(k) * h) / 100.8); }
  g.rotateY(-B.rot); g.translate(B.cx, y0 + h / 2, B.cz); batch.push(g);
}
export function buildIfc(g, m, lights) {
  const r = rng(808), glassB = new Batch(), crown = new Tris(24), edge = new Batch(), stone = new Batch(), st = new Batch(), gl = new Tris(), shops = new Tris(), lob = new Tris();
  const atlas = curtainAtlas(31, { glass: '#10222f', warm: 0.35, occ: 0.2 });
  // the two towers: a square shaft, then the cut-crystal crown (four leaning facets up to a tilted top)
  for (const [T, tall] of [[IFC.north, 259.9], [IFC.south, 249.9]]) {
    const hs = tall - 46; curtainBox(glassB, T, 0, hs, r);
    const P = (lx, lz, y) => [T.cx + lx * T.c - lz * T.s, y, T.cz + lx * T.s + lz * T.c], k = 0.52;
    const base = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(a * T.hx, b * T.hz, hs)), topH = [tall, tall - 14, tall - 30, tall - 14];
    const topP = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], i) => P(a * T.hx * k, b * T.hz * k, topH[i]));
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, w = T.hx * 2 / 24; crown.quad(base[i], base[j], topP[j], topP[i], [[0, hs / 100.8], [w, hs / 100.8], [w * (0.5 + k / 2), topH[j] / 100.8], [w * (0.5 - k / 2), topH[i] / 100.8]]); }
    crown.quad(topP[0], topP[1], topP[2], topP[3], [[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001]]);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; for (const [a, b] of [[base[i], topP[i]], [topP[i], topP[j]]]) { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), geo = new THREE.BoxGeometry(0.7, 0.7, len); geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())); geo.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); edge.push(geo); } }
  }
  // the mall's podium: stone above, shop glass along the street
  const Pd = IFC.podium, PP = (lx, lz) => [Pd.cx + lx * Pd.c - lz * Pd.s, Pd.cz + lx * Pd.s + lz * Pd.c];
  { const geo = new THREE.BoxGeometry(Pd.hx * 2, Pd.h - 6.4, Pd.hz * 2); geo.rotateY(-Pd.rot); geo.translate(Pd.cx, 6.4 + (Pd.h - 6.4) / 2, Pd.cz); stone.push(geo); }
  const front = [[-Pd.hx, -Pd.hz, -Pd.hx, Pd.hz], [-Pd.hx, -Pd.hz, Pd.hx, -Pd.hz], [-Pd.hx, Pd.hz, Pd.hx, Pd.hz]];
  for (const [a0, b0, a1, b1] of front) {
    const [x0, z0] = PP(a0, b0), [x1, z1] = PP(a1, b1), len = Math.hypot(x1 - x0, z1 - z0), nb = Math.round(len / 5.5);
    for (let i = 0; i < nb; i++) { const f0 = i / nb + 0.004, f1 = (i + 1) / nb - 0.004, kk = Math.floor(r() * 8); shops.wall(x0 + (x1 - x0) * f0, z0 + (z1 - z0) * f0, x0 + (x1 - x0) * f1, z0 + (z1 - z0) * f1, CH, 6.4, [kk / 8, 0, (kk + 1) / 8, 1]); }
  }
  // its way in from the court side: glass doors under a canopy, the mall's name over them
  { const [x, z] = PP(-Pd.hx - 0.4, 0), [fx, fz] = [-Pd.c, -Pd.s]; obox(st, x + fx * 2.2, 5.2, z + fz * 2.2, fx, fz, 5.2, 0.22, 16); gl.wall(...PP(-Pd.hx - 0.25, -5), ...PP(-Pd.hx - 0.25, 5), CH, 4.6);
    g.add(sign(['ifc mall', '国金中心商场'], { w: 24, h: 6.5, x: x + fx * 0.2, y: 12, z: z + fz * 0.2, ry: Math.atan2(fx, fz), color: '#f4ead2', bg: null, ch: 'signs' })); }
  // the north tower's lobby on Century Avenue: a tall glass front, a canopy, revolving doors, the address stone
  const T = IFC.north, L = LJZ.ifcLobbyDoor, [ux, uz] = dirOf(AVE);
  { const [x0, z0] = [L.x - ux * 13, L.z - uz * 13], [x1, z1] = [L.x + ux * 13, L.z + uz * 13];
    lob.wall(x0 + L.nx * 0.12, z0 + L.nz * 0.12, x1 + L.nx * 0.12, z1 + L.nz * 0.12, CH, 8.8, [0, 0, 2, 1]);
    obox(st, L.x + L.nx * 2.8, 4.6, L.z + L.nz * 2.8, ux, uz, 16, 0.3, 5.6); for (const s of [-7, 7]) st.cyl(L.x + ux * s + L.nx * 5, CH, L.z + uz * s + L.nz * 5, 0.14, 0.14, 4.45, 12);
    for (const s of [-2.4, 2.4]) { const dm = new Tris(); dm.drum({ x: L.x + ux * s + L.nx * 0.9, z: L.z + uz * s + L.nz * 0.9 }, 1.25, 0, 360, CH, 2.9, 16); gl.p.push(...dm.p); gl.n.push(...dm.n); gl.u.push(...dm.u); st.cyl(L.x + ux * s + L.nx * 0.9, 2.9, L.z + uz * s + L.nz * 0.9, 1.32, 1.32, 0.16, 20); }
    obox(stone, L.x - ux * 11 + L.nx * 6.5, CH, L.z - uz * 11 + L.nz * 6.5, ux, uz, 3.6, 1.5, 0.5);
    g.add(sign(['上海国金中心', 'Shanghai ifc · 世纪大道8号'], { w: 3.3, h: 1.1, x: L.x - ux * 11 + L.nx * 6.77, y: CH + 0.78, z: L.z - uz * 11 + L.nz * 6.77, ry: Math.atan2(L.nx, L.nz), color: '#e9dcb8', bg: '#2a2620', ch: null }));
    lights.push({ x: L.x + L.nx * 2.6, y: 4.2, z: L.z + L.nz * 2.6, intensity: 26, distance: 16, color: new THREE.Color(1.0, 0.9, 0.74) });
    addCircle(L.x + ux * 7 + L.nx * 5, L.z + uz * 7 + L.nz * 5, 0.2); addCircle(L.x - ux * 7 + L.nx * 5, L.z - uz * 7 + L.nz * 5, 0.2);
    addBox(L.x - ux * 11 + L.nx * 6.5, L.z - uz * 11 + L.nz * 6.5, AVE_ROT, 1.8, 0.3, { id: 'stone', y1: 2 }); }
  const towerMat = curtainMat(atlas, [0.5, 0.63, 0.7], 0.95, 0.22, THREE.DoubleSide);
  const lobbyMat = new THREE.MeshBasicMaterial({ map: lobbyTex(), side: THREE.DoubleSide }); lobbyMat.color.setScalar(0.9); lobbyMat.userData.todSkip = true;
  const shopMat = asLight(new THREE.MeshBasicMaterial({ map: shopfronts(), side: THREE.DoubleSide }), 'shops', 0.3);
  const tw = glassB.mesh(towerMat, 'ljz-ifc-towers'), cr = crown.mesh(towerMat, 'ljz-ifc-crowns'), sm = stone.mesh(m.stoneWarm, 'ljz-ifc-podium'), stm = st.mesh(m.steel, 'ljz-ifc-steel');
  for (const o of [tw, cr, sm, stm]) { o.castShadow = true; o.receiveShadow = true; g.add(o); }
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
    { const [x, z] = P(M.len + 0.06, 0); obox(walls, x, -M.depth, z, M.dx, M.dz, 0.12, M.depth + CH, W + 0.24); obox(dark, x, CH, z, M.dx, M.dz, 0.14, 3.0, W + 0.24); }
    { const [x, z] = P(M.len / 2, 0); obox(walls, x, 3.1, z, M.dx, M.dz, M.len + 0.6, 0.12, W + 0.8); obox(gl, x, 3.04, z, M.dx, M.dz, M.len + 0.4, 0.02, W + 0.6); }
    for (const t of [0, M.len]) for (const s of [-1, 1]) { const [x, z] = P(t, s * M.hw); st.box(x, CH, z, 0.1, 3.0, 0.1); }
    const sm = new THREE.MeshBasicMaterial({ map: metroSign(M) }); sm.color.setScalar(1.35); sm.userData.todSkip = true;
    for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, (W + 0.4) / 4), sm), [x, z] = P(-0.15 * s, 0); p.position.set(x, 3.6, z); p.rotation.y = Math.atan2(-M.dx * s, -M.dz * s); p.name = 'ljz-metro-sign'; g.add(p); }
    { const [x, z] = P(M.len / 2, M.hw + 0.5), p = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), sm); p.position.set(x, 3.6, z); p.rotation.y = Math.atan2(-M.dz, M.dx); g.add(p); const q = p.clone(); const [x2, z2] = P(M.len / 2, -M.hw - 0.5); q.position.set(x2, 3.6, z2); q.rotation.y = Math.atan2(M.dz, -M.dx); g.add(q);
      const [bx, bz] = P(M.len / 2, 0); obox(dark, bx, 3.05, bz, M.dx, M.dz, 4.5, 1.15, W + 0.9); }
    const ls = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, (W - 0.2) * 192 / 1024), new THREE.MeshBasicMaterial({ map: lTex })); ls.material.color.setScalar(1.3); ls.material.userData.todSkip = true;
    { const [x, z] = P(M.len - 0.02, 0); ls.position.set(x, -M.depth + 2.5, z); ls.rotation.y = Math.atan2(-M.dx, -M.dz); g.add(ls);
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
  // the lake: water a little below the lawn, a stone edge
  for (const l of LAKE) {
    const pts = []; for (let i = 0; i < 48; i++) { const t = i / 48 * 6.2832; pts.push([l.a + (l.ra + 0.6) * Math.cos(t), l.p + (l.rp + 0.6) * Math.sin(t)]); }
    const [cx, cz] = ap(l.a, l.p);
    for (let i = 0; i < 48; i++) { const [x0, z0] = ap(...pts[i]), [x1, z1] = ap(...pts[(i + 1) % 48]); water.tri([cx, CH - 0.28, cz], [x0, CH - 0.28, z0], [x1, CH - 0.28, z1]); bank.wall(x0, z0, x1, z1, CH - 0.5, CH + 0.06); }
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
  for (const [a, p] of [[270, -60], [286, -84], [300, -120], [316, -164], [527, -80], [512, -118]]) lamp(...ap(a, p));
  // the white canopy on the lawn's west side: three peaks of membrane on steel masts
  for (const [da, dp, h] of [[-5, -3, 9], [4, 2, 11], [-1, 7, 8]]) {
    const [x, z] = ap(CANOPY.a + da, CANOPY.p + dp), n = 10, R = 7.5;
    for (let i = 0; i < n; i++) { const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, ymid = 4.2; mem.tri([x, h, z], [x + Math.cos(a0) * R * 0.45, ymid + 0.6 * Math.cos(i * 3.14), z + Math.sin(a0) * R * 0.45], [x + Math.cos(a1) * R * 0.45, ymid + 0.6 * Math.cos((i + 1) * 3.14), z + Math.sin(a1) * R * 0.45]);
      mem.quad([x + Math.cos(a0) * R * 0.45, ymid + 0.6 * Math.cos(i * 3.14), z + Math.sin(a0) * R * 0.45], [x + Math.cos(a0) * R, 3.0 + 0.5 * Math.cos(i * 3.14), z + Math.sin(a0) * R], [x + Math.cos(a1) * R, 3.0 + 0.5 * Math.cos((i + 1) * 3.14), z + Math.sin(a1) * R], [x + Math.cos(a1) * R * 0.45, ymid + 0.6 * Math.cos((i + 1) * 3.14), z + Math.sin(a1) * R * 0.45]); }
    st.cyl(x, CH, z, 0.1, 0.14, h + 0.6 - CH, 10); addCircle(x, z, 0.2, { y1: 3 });
    lights.push({ x, y: 3.4, z, intensity: 14, distance: 14, color: new THREE.Color(1.0, 0.95, 0.86), out: true });
  }
  // the park's name on a boulder at the corner gate
  { const [x, z] = ap(268.5, -58); const geo = new THREE.DodecahedronGeometry(1.5, 1); geo.scale(1.5, 0.75, 0.6); geo.rotateY(-AVE_ROT + 0.5); geo.translate(x, CH + 0.85, z); stone.push(geo); addCircle(x, z, 1.3, { y1: 3 });
    const d = dirOf(AVE + 270 - 28); g.add(sign(['陆家嘴中心绿地'], { w: 3.0, h: 0.62, x: x + d[0] * 0.62, y: CH + 1.0, z: z + d[1] * 0.62, ry: Math.atan2(d[0], d[1]), color: '#b3221c', bg: null, ch: null, font: FONT.serif, gain: 1 })); }
  // trees: a belt round the Green's edge, clumps on the lawn, clear of the paths, the water and the canopy
  const want = (a, p) => !inLake(a, p, 3) && !parkPath(a, p) && Math.hypot(a - CANOPY.a, p - CANOPY.p) > 16;
  for (let a = GREEN.a0 + 5; a < GREEN.a1 - 3; a += 11) for (const p of [GREEN.p0 + 5, GREEN.p1 - 5]) { const aa = a + r() * 4, pp = p + (r() - 0.5) * 4; if (want(aa, pp) && !(aa < 302 && pp > -114)) { const [x, z] = ap(aa, pp); trees.push({ x, z, h: 9 + r() * 4 }); } }
  for (let p = GREEN.p0 + 14; p < GREEN.p1 - 10; p += 11) for (const a of [GREEN.a0 + 5, GREEN.a1 - 5]) { const aa = a + (r() - 0.5) * 4, pp = p + r() * 4; if (want(aa, pp) && !(aa < 302 && pp > -114)) { const [x, z] = ap(aa, pp); trees.push({ x, z, h: 9 + r() * 4 }); } }
  for (let i = 0; i < 46; i++) { const a = GREEN.a0 + 14 + r() * (GREEN.a1 - GREEN.a0 - 28), p = GREEN.p0 + 14 + r() * (GREEN.p1 - GREEN.p0 - 28), e = Math.hypot((a - LOOP.a) / LOOP.ra, (p - LOOP.p) / LOOP.rp); if (want(a, p) && (e > 1.12 || e < 0.9) && !(a > 330 && a < 372 && p > -190 && p < -120)) { const [x, z] = ap(a, p); trees.push({ x, z, h: 7 + r() * 5 }); } }
  // hedges along the Green's edges (its fence), open at the gates
  const hedgeRun = (a0, p0, a1, p1, skip = () => false) => { const len = Math.hypot(a1 - a0, p1 - p0), n = Math.ceil(len / 3); for (let i = 0; i < n; i++) { const f0 = i / n, f1 = (i + 1) / n, am = a0 + (a1 - a0) * (f0 + f1) / 2, pm = p0 + (p1 - p0) * (f0 + f1) / 2; if (skip(am, pm)) continue; const [x, z] = ap(am, pm), d = [(a1 - a0) / len, (p1 - p0) / len]; obox(hedge, x, CH, z, ux * d[0] + nx * d[1], uz * d[0] + nz * d[1], len / n + 0.05, 1.25, 1.1); } };
  hedgeRun(GREEN.a0 - 0.8, GREEN.p0 - 0.8, GREEN.a1 + 0.8, GREEN.p0 - 0.8); hedgeRun(GREEN.a1 + 0.8, GREEN.p0 - 0.8, GREEN.a1 + 0.8, GREEN.p1 + 26); hedgeRun(GREEN.a0 - 0.8, GREEN.p0 - 0.8, GREEN.a0 - 0.8, GREEN.p1 - 0.5);
  hedgeRun(298.8, GREEN.p1 + 0.8, 519.2, GREEN.p1 + 0.8);
  // the avenue's median: a clipped hedge; the planted strip on its north side: a hedge at the back of the pavement
  hedgeRun(76, 0, 218, 0); hedgeRun(262, 0, 786, 0); hedgeRun(72, -40.9, 234, -40.9);
  // the roundabout's island: lawn, rings of bedding flowers, clipped balls
  fl.red.arc(C, 20.5, 23.5, 0, 360, CH + 0.1, 72); fl.yellow.arc(C, 16, 18.5, 0, 360, CH + 0.12, 60); fl.violet.arc(C, 6, 11, 0, 360, CH + 0.14, 40);
  for (let i = 0; i < 12; i++) { const [x, z] = polar(i * 30 + 15, 13.5); const geo = new THREE.SphereGeometry(1.1, 10, 8); geo.translate(x, CH + 0.8, z); hedge.push(geo); }
  { const geo = new THREE.SphereGeometry(2.6, 14, 10); geo.scale(1, 0.8, 1); geo.translate(C.x, CH + 1.6, C.z); hedge.push(geo); }
  const add = (o, cast = true) => { o.castShadow = cast; o.receiveShadow = true; g.add(o); };
  add(hedge.mesh(m.hedge, 'ljz-hedges')); add(wood.mesh(m.wood, 'ljz-benches')); add(st.mesh(m.steel, 'ljz-park-steel')); add(water.mesh(m.water, 'ljz-lake'), false); add(bank.mesh(m.granite, 'ljz-lake-edge'), false);
  add(mem.mesh(m.membrane, 'ljz-canopy')); add(stone.mesh(m.granite, 'ljz-park-stone'));
  add(fl.red.mesh(m.flowerRed, 'ljz-flowers-r'), false); add(fl.yellow.mesh(m.flowerYellow, 'ljz-flowers-y'), false); add(fl.violet.mesh(m.flowerViolet, 'ljz-flowers-v'), false);
}

// ================= the towers around, the district's edge =================
export function buildSurroundings(g, m, lights, trees) {
  const r = rng(2031), cool = new Batch(), warm = new Batch(), gold = new Batch(), stone = new Batch(), hedge = new Batch(), hoard = new Batch(), st = new Batch();
  // the named neighbours (their footprints are the colliders)
  for (const B of BUILDINGS) {
    if (B.id.startsWith('ifc')) continue;
    if (B.id === 'superbrand') {                               // Super Brand Mall: a long stone-clad block, a glass drum at its corner, its name
      const geo = new THREE.BoxGeometry(B.hx * 2, B.h, B.hz * 2); geo.rotateY(-B.rot); geo.translate(B.cx, B.h / 2, B.cz); stone.push(geo);
      const fx = B.cx - B.c * (B.hx + 0.3), fz = B.cz - B.s * (B.hx + 0.3), ry = Math.atan2(-B.c, -B.s);
      curtainBox(warm, { ...B, cx: B.cx - B.c * (B.hx - 4.4), cz: B.cz - B.s * (B.hx - 4.4), hx: 5, hz: B.hz * 0.6 }, 0, B.h * 0.8, r);
      g.add(sign(['正大广场', 'SUPER BRAND MALL'], { w: 34, h: 8, x: fx, y: B.h * 0.8 + 6, z: fz, ry, color: '#ffe9c0', bg: null, ch: 'signs', gain: 1.5 }));
      continue;
    }
    const batch = B.id === 'boc' ? gold : r() < 0.5 ? cool : warm;
    curtainBox(batch, B, 0, B.h * 0.86, r); curtainBox(batch, { ...B, hx: B.hx * 0.72, hz: B.hz * 0.72 }, B.h * 0.86, B.h * 0.14, r);
  }
  // the wider skyline: towers on the blocks beyond, wherever there is no road, park or walkable ground
  for (let x = 500; x < 1500; x += 62) for (let z = -230; z < 780; z += 62) {
    const cx = x + (r() - 0.5) * 22, cz = z + (r() - 0.5) * 22, hw = 15 + r() * 10, hd = 15 + r() * 10, [a, p] = toAP(cx, cz);
    let ok = Math.hypot(cx - 640, cz + 42) > 105 && Math.hypot(cx - C.x, cz - C.z) > 150;
    for (const [dx, dz] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1], [-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) { const px = cx + dx * (hw + 9), pz = cz + dz * (hd + 9); if (kindAt(px, pz) !== KIND.pave || inDistrict(px, pz)) ok = false; }
    for (const B of BUILDINGS) if (Math.hypot(cx - B.cx, cz - B.cz) < Math.max(B.hx, B.hz) + hw + 18) ok = false;
    for (const t of Object.values(LJZ.towers)) if (Math.hypot(cx - t.x, cz - t.z) < 70) ok = false;
    if (a > 240 && a < 570 && p > -330 && p < -40) ok = false;
    if (!ok) continue;
    const h = 60 + r() * r() * 190, rot = r() < 0.5 ? AVE_ROT : 0, B = { cx, cz, rot, hx: hw, hz: hd };
    curtainBox(r() < 0.55 ? cool : r() < 0.8 ? warm : gold, B, 0, h, r);
  }
  // the district's edge: hedges where the pavement goes on beyond, a hoarding across the far end of each pavement
  const edge = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.5)), tx = (x1 - x0) / len, tz = (z1 - z0) / len;
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f, in1 = inDistrict(x - tz * 0.9, z + tx * 0.9), in2 = inDistrict(x + tz * 0.9, z - tx * 0.9);
      if (in1 === in2) continue; const ox = in1 ? x + tz * 0.9 : x - tz * 0.9, oz = in1 ? z - tx * 0.9 : z + tx * 0.9; if (kindAt(ox, oz) === KIND.road || kindAt(x, z) === KIND.road) continue;
      if (BUILDINGS.some((B) => { const lx = (ox - B.cx) * B.c + (oz - B.cz) * B.s, lz = -(ox - B.cx) * B.s + (oz - B.cz) * B.c; return Math.abs(lx) < B.hx + 0.3 && Math.abs(lz) < B.hz + 0.3; })) continue;
      obox(hedge, ox - (in1 ? tz : -tz) * 0.1, CH, oz + (in1 ? tx : -tx) * 0.1, tx, tz, len / n + 0.06, 1.3, 1.0); } };
  const arcEdge = (rr, b0, b1) => { for (let b = b0; b < b1; b += 1.2) edge(...polar(b, rr), ...polar(Math.min(b1, b + 1.2), rr)); };
  arcEdge(125, 0, 360); arcEdge(98, 274, 349); edge(...polar(274, 98), ...polar(274, 125)); edge(...polar(349, 98), ...polar(349, 125));
  const apEdge = (a0, p0, a1, p1) => edge(...fromAP(a0, p0), ...fromAP(a1, p1));
  apEdge(100, 34, 560, 34); apEdge(30, 108, 236, 108); apEdge(236, 34, 236, 108); apEdge(254, -66, 264, -66); apEdge(298, 34, 254, 34); apEdge(520, -40, 520, -66); apEdge(547, -40, 560, -40);
  { const [x, z] = fromAP(560.4, -3), d = dirOf(AVE + 90); for (const [p0, p1] of [[-40, -16], [16, 34]]) { const [hx, hz] = fromAP(560.4, (p0 + p1) / 2); obox(hoard, hx, CH, hz, d[0], d[1], p1 - p0, 2.4, 0.12); } void x; void z; }
  // trees on the pavements: along the avenue, round the roundabout, in the Pearl's park
  for (let a = 70; a < 556; a += 13) { if (a > 226 && a < 262) continue; for (const p of [-19.5, 19.5]) { const [x, z] = fromAP(a + (p > 0 ? 6 : 0), p); if (inDistrict(x, z) && Math.hypot(x - APPLE.x, z - APPLE.z) > 27 && !METRO_LJZ.some((M) => Math.hypot(x - M.top[0] - M.dx * 5.6, z - M.top[1] - M.dz * 5.6) < 9) && Math.hypot(x - LJZ.kerbPickup.x, z - LJZ.kerbPickup.z) > 9 && !RAMPS.some((R) => Math.hypot(x - R.bot[0], z - R.bot[1]) < 10)) trees.push({ x, z, h: 8 + r() * 2, r: 2.6 }); } }
  for (let b = 0; b < 360; b += 9) { const [x, z] = polar(b, 74 + (b % 18 ? 0 : 6)); if (kindAt(x, z) === KIND.pave && inDistrict(x, z) && !carriage(...polar(b, 68)) && Math.hypot(x - APPLE.x, z - APPLE.z) > 30 && !RAMPS.some((R) => Math.hypot(x - R.bot[0], z - R.bot[1]) < 9) && !METRO_LJZ.some((M) => Math.hypot(x - M.top[0], z - M.top[1]) < 13) && !BUILDINGS.some((B) => Math.hypot(x - B.cx, z - B.cz) < Math.max(B.hx, B.hz) + 6)) trees.push({ x, z, h: 8 + r() * 3 }); }
  for (let i = 0; i < 46; i++) { const b = 276 + r() * 71, rr = 102 + r() * 150, [x, z] = polar(b, rr); if (kindAt(x, z) === KIND.grass && Math.hypot(x - 640, z + 42) > 68) trees.push({ x, z, h: 8 + r() * 5, solid: false }); }
  // the Pearl's fence along its park (a low rail on a stone kerb)
  for (let b = 274; b < 349; b += 1.5) { const [x0, z0] = polar(b, 98.6), [x1, z1] = polar(b + 1.5, 98.6), d = dirOf(b + 90.75); obox(st, (x0 + x1) / 2, CH + 1.0, (z0 + z1) / 2, d[0], d[1], 2.7, 0.05, 0.05); st.box(x0, CH, z0, 0.06, 1.0, 0.06); }
  const mat = (seed, opt, day, gain = 0.95) => curtainMat(curtainAtlas(seed, opt), day, gain, 0.3);
  const meshes = [cool.mesh(mat(41, { glass: '#0e1b2a', warm: 0.25, occ: 0.24 }, [0.4, 0.47, 0.54]), 'ljz-towers-cool'), warm.mesh(mat(42, { glass: '#17140f', warm: 0.75, occ: 0.26, fin: 'rgba(220,200,170,0.45)' }, [0.47, 0.45, 0.42]), 'ljz-towers-warm'),
    gold.mesh(mat(43, { glass: '#241a0a', warm: 0.95, occ: 0.4, fin: 'rgba(255,205,120,0.6)' }, [0.5, 0.44, 0.33], 1.05), 'ljz-towers-gold')];
  for (const o of meshes) { o.castShadow = true; g.add(o); }
  const add = (o) => { o.castShadow = true; o.receiveShadow = true; g.add(o); };
  add(stone.mesh(m.stoneWarm, 'ljz-superbrand')); add(hedge.mesh(m.hedge, 'ljz-edge-hedges')); add(hoard.mesh(m.hoard, 'ljz-hoardings')); add(st.mesh(m.steel, 'ljz-fence'));
}

// ================= street furniture: lamps, signals, signs =================
export function buildStreet(g, m, lights) {
  const st = new Batch(), dark = new Batch(), [ux, uz] = dirOf(AVE), [nx, nz] = dirOf(AVE + 90);
  // street lamps: a tall post, an arm over the carriageway
  const lamp = (x, z, toX, toZ) => { const l = Math.hypot(toX, toZ) || 1, dx = toX / l, dz = toZ / l; st.cyl(x, CH, z, 0.09, 0.14, 9.4, 10); obox(st, x + dx * 1.3, 9.4, z + dz * 1.3, dx, dz, 2.8, 0.1, 0.12); lights.lamp(x + dx * 2.5, 9.3, z + dz * 2.5, 0.34, { intensity: 150, distance: 50, pool: 24, px: x + dx * 3, pz: z + dz * 3, color: [1.0, 0.86, 0.66] }); addCircle(x, z, 0.16, { y1: 3 }); };
  for (let a = 78; a < 556; a += 32) { if (a > 226 && a < 262) continue; for (const s of [-1, 1]) { const [x, z] = fromAP(a + (s > 0 ? 16 : 0), s * 17.2); if (Math.hypot(x - LJZ.kerbPickup.x, z - LJZ.kerbPickup.z) > 5) lamp(x, z, -s * nx, -s * nz); } }
  for (let b = 0; b < 360; b += 20) { const [x, z] = polar(b, 64); if (carriage(x, z) || carriage(...polar(b, 58)) || Math.hypot(x - APPLE.x, z - APPLE.z) < 26 || RAMPS.some((R) => Math.abs(((b - R.b + 540) % 360) - 180) < (R.kind === 'spur' ? 14 : 7))) continue; const d = dirOf(b + 180); lamp(x, z, d[0], d[1]); }
  for (const A of ARMS) { if (A.id === 'century') continue; for (let al = 78; al < 124; al += 30) for (const s of [-1, 1]) { const x = C.x + A.dx * al + A.px * s * (A.hw + 1.2), z = C.z + A.dz * al + A.pz * s * (A.hw + 1.2); if (inDistrict(x, z) && !carriage(x, z)) lamp(x, z, -s * A.px, -s * A.pz); } }
  // the court and IFC's forecourt: low bollard lights
  for (let b = 20; b <= 340; b += 32) { const [x, z] = applePt(b, APPLE.rail + 1.6); if (!inDistrict(x, z) || carriage(x, z)) continue; st.cyl(x, CH, z, 0.07, 0.07, 0.9, 8); lights.lamp(x, CH + 0.95, z, 0.14, { intensity: 7, distance: 9, pool: 6 }); addCircle(x, z, 0.12, { y1: 2 }); }
  // road-name plates at the mouths of the roads (blue, white letters, as Shanghai's are)
  for (const A of ARMS) {
    const al = 70, s = A.id === 'century' ? -1 : 1, x = C.x + A.dx * al + A.px * s * (A.hw + 2.2), z = C.z + A.dz * al + A.pz * s * (A.hw + 2.2);
    if (!inDistrict(x, z) || carriage(x, z)) continue;
    st.cyl(x, CH, z, 0.04, 0.04, 2.9, 8); addCircle(x, z, 0.1, { y1: 3 });
    for (const f of [1, -1]) g.add(sign([A.zh, `${A.en}`], { w: 1.5, h: 0.52, x: x + A.px * 0.03 * f, y: 2.75, z: z + A.pz * 0.03 * f, ry: Math.atan2(A.px * f, A.pz * f), bg: '#1d4f9c', color: '#fff' }));
  }
  // pedestrian wayfinding on the ring, at the head of each stair: what lies that way
  const WAY = { 22: ['丰和路 · 陆家嘴环路', 'Fenghe Rd · Lujiazui Ring Rd'], 82: ['地铁2号线 · 世纪大道 · 中心绿地', 'Metro Line 2 · Century Ave · Central Green'], 230: ['正大广场', 'Super Brand Mall'], 312: ['东方明珠广播电视塔 · 地铁1号口', 'Oriental Pearl Tower · Metro Exit 1'], 148: ['国金中心 · Apple · 地铁6号口', 'IFC · Apple · Metro Exit 6'] };
  for (const R of RAMPS) {
    const sp = R.kind === 'spur', [x, z] = sp ? polar(SPUR.b, RING.r1 + 1.2) : polar(R.b - 6.2, RING.r1 - 0.6), d = dirOf(R.b);
    const px = x + (sp ? dirOf(R.b + 90)[0] * 6.4 : 0), pz = z + (sp ? dirOf(R.b + 90)[1] * 6.4 : 0);
    st.cyl(px, RING.y, pz, 0.04, 0.04, 2.6, 8);
    g.add(sign(WAY[R.b], { w: 2.6, h: 0.62, x: px - d[0] * 0.05, y: RING.y + 2.4, z: pz - d[1] * 0.05, ry: Math.atan2(-d[0], -d[1]), bg: '#14458f', color: '#fff', both: false }));
  }
  // the ride-hailing point at IFC's kerb
  { const K = LJZ.kerbPickup, x = K.x - ux * 3.2, z = K.z - uz * 3.2; st.cyl(x, CH, z, 0.04, 0.04, 2.7, 8); addCircle(x, z, 0.1, { y1: 3 });
    for (const f of [1, -1]) g.add(sign(['网约车上下客点', 'Ride-hailing pick-up'], { w: 1.3, h: 0.56, x: x + ux * 0.03 * f, y: 2.5, z: z + uz * 0.03 * f, ry: Math.atan2(ux * f, uz * f), bg: '#1b2733', color: '#ffb05a' })); }
  // signals at Century Avenue / Yincheng Road: posts with a vehicle head; a green / red man at each end of the zebras
  const heads = { ave: [], yin: [], z1: [], z2: [] }, bulb = new THREE.SphereGeometry(0.13, 10, 8), man = new THREE.PlaneGeometry(0.34, 0.34);
  const veh = (a, p, key, facing) => { const [x, z] = fromAP(a, p); st.cyl(x, CH, z, 0.07, 0.09, 5.6, 8); const f = dirOf(facing); obox(dark, x + f[0] * 0.12, 4.3, z + f[1] * 0.12, f[0], f[1], 0.22, 1.25, 0.36); const set = [0, 1, 2].map((i) => { const b = new THREE.Mesh(bulb, new THREE.MeshBasicMaterial({ color: 0x111111 })); b.material.userData.todSkip = true; b.position.set(x + f[0] * 0.26, 5.3 - i * 0.38, z + f[1] * 0.26); g.add(b); return b.material; }); heads[key].push(set); addCircle(x, z, 0.14, { y1: 3 }); };
  veh(221, 17.2, 'ave', AVE + 180); veh(258, -17.2, 'ave', AVE); veh(YIN.a0 - 1.2, -33, 'yin', AVE + 270); veh(YIN.a1 + 1.2, 20, 'yin', AVE + 90);
  const ped = (a, p, key, facing) => { const [x, z] = fromAP(a, p); st.cyl(x, CH, z, 0.05, 0.05, 2.9, 8); const f = dirOf(facing); obox(dark, x + f[0] * 0.08, 2.35, z + f[1] * 0.08, f[0], f[1], 0.14, 0.85, 0.42); const set = [0, 1].map((i) => { const b = new THREE.Mesh(man, new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })); b.material.userData.todSkip = true; b.position.set(x + f[0] * 0.16, 2.98 - i * 0.4, z + f[1] * 0.16); b.rotation.y = Math.atan2(f[0], f[1]); g.add(b); return b.material; }); heads[key].push(set); addCircle(x, z, 0.1, { y1: 3 }); };
  ped(YIN.a0 - 0.9, -26.5, 'z1', AVE); ped(YIN.a1 + 0.9, -26.5, 'z1', AVE + 180); ped(228.2, 17, 'z2', AVE + 270); ped(228.2, -17, 'z2', AVE + 90);
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
