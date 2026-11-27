// Street dressing (docs/living-city-architecture.md §6.5): the shared bikes in their bays, bins,
// bollards, utility cabinets, hydrants, street-name posts, enforcement cameras and a police post,
// from world/dressingData.js. One InstancedMesh per kind with one shared vertex-coloured material:
// eight draw calls for all of it, matrices written once. The bikes take their operator's colour per
// instance. The cameras and the police post's lamp are where world/pulse.js flashes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { L, groundHeight } from './layout.js';
import { dressingProps, dressingBoxes, FOOT } from './dressingData.js';

// a primitive, placed and painted (vertex colour), ready to merge
function part(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const box = (w, h, d, hex, x, y, z, ry = 0) => part(new THREE.BoxGeometry(w, h, d), hex, x, y, z, 0, ry);
const cyl = (r, h, hex, x, y, z, seg = 10, rx = 0, rz = 0) => part(new THREE.CylinderGeometry(r, r, h, seg), hex, x, y, z, rx, 0, rz);
// a tube from (ax, ay) to (bx, by) in the x-y plane at z
const tube = (ax, ay, bx, by, r, hex, z = 0) => { const len = Math.hypot(bx - ax, by - ay); return part(new THREE.CylinderGeometry(r, r, len, 6), hex, (ax + bx) / 2, (ay + by) / 2, z, 0, 0, Math.atan2(by - ay, bx - ax) - Math.PI / 2); };

const PAINT = 0xffffff, TYRE = 0x141414, DARK = 0x2a2c30, STEEL = 0x8e949a;
const CREAM = 0xe6e0cc, CREAM2 = 0xd9d2bc, FAN = 0x34373a, BOLT = 0xb8b19c;
// The Bund's planters, as on the photographs: a cream box whose front is a wing. Fluted end blocks hang from
// the rim to about 40 cm off the ground; a broad fluted middle pilaster, bolted down its ribs, runs on down
// to a dark stepped base plate; between them the underside sweeps in a quarter-ellipse from each end block
// down to the pilaster, and four charcoal bands a side sweep the same way up the face, level at the end
// block, steep where they meet the pilaster. Azaleas mounded in it, pansies round the rim, ivy over the edge. Long side along z.
// `chain`: the chain to the next planter, 2.6 m on, hung from rings on the end blocks.
const PL = { top: 1.05, half: 0.75, endIn: 0.58, endBot: 0.43, pil: 0.17, foot: 0.17, cy: 0.25, ea: 0.41, face: 0.31 };
// the bands are quarter-ellipses, each spanning end block to pilaster: band k leaves the end block level at
// `top` and meets the pilaster steeply at `pil` (k = 0 is the underside itself); off thickens it outward.
// Right half, t = 0 at the end block, PI/2 at the pilaster.
const BANDS = [[0.43, 0.25], [0.55, 0.3], [0.71, 0.5], [0.86, 0.67], [0.995, 0.81]];   // [at the end block, at the pilaster]; 0 = the underside
const BAND = (k) => ({ top: BANDS[k][0], pil: BANDS[k][1] });
const ell = (k, t, off = 0) => { const b = BAND(k); return [PL.endIn - (PL.ea + off) * Math.sin(t), b.pil + (b.top - b.pil + off) * Math.cos(t)]; };
function planterBody() {
  const sh = new THREE.Shape(), N = 14;
  sh.moveTo(-PL.half, PL.top); sh.lineTo(PL.half, PL.top); sh.lineTo(PL.half, PL.endBot); sh.lineTo(PL.endIn, PL.endBot);
  for (let i = 1; i <= N; i++) { const [z, y] = ell(0, (i / N) * Math.PI / 2); sh.lineTo(z, y); }
  sh.lineTo(PL.pil, PL.foot); sh.lineTo(-PL.pil, PL.foot);
  for (let i = N - 1; i >= 0; i--) { const [z, y] = ell(0, (i / N) * Math.PI / 2); sh.lineTo(-z, y); }
  sh.lineTo(-PL.half, PL.endBot); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: PL.face * 2, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(-Math.PI / 2); g.translate(PL.face, 0, 0);     // shape x -> world z, extrusion across x
  return g;
}
// one charcoal band (k, see BAND) laid on a face (x = fx), w thick, mirrored by sz
function planterBand(k, d0, w, fx, sz) {
  const pos = [], N = 18, clampP = ([z, y]) => [Math.max(PL.pil, z), Math.min(PL.top - 0.04, y)];
  for (let i = 0; i < N; i++) {
    const ta = (i / N) * Math.PI / 2, tb = ((i + 1) / N) * Math.PI / 2;
    const a0 = clampP(ell(k, ta, d0)), b0 = clampP(ell(k, tb, d0)), a1 = clampP(ell(k, ta, d0 + w)), b1 = clampP(ell(k, tb, d0 + w));
    for (const [z, y] of [a0, b0, b1, a0, b1, a1]) pos.push(fx, y, sz * z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // wind each quad to face out of its face
  if ((fx > 0) !== (sz > 0)) { const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let j = 0; j < 3; j++) { const t = p[i + 3 + j]; p[i + 3 + j] = p[i + 6 + j]; p[i + 6 + j] = t; } }
  g.computeVertexNormals();
  return g;
}
function planter(chain) {
  const p = [part(planterBody(), CREAM)];
  const F = PL.face;
  // the base plate: a low dark stepped pyramid under the middle pilaster
  { const g = new THREE.CylinderGeometry(0.2 * Math.SQRT2, 0.44 * Math.SQRT2, 0.15, 4, 1); g.rotateY(Math.PI / 4); g.scale(0.85, 1, 1); p.push(part(g, 0x4c4f52, 0, 0.075, 0)); }
  p.push(box(0.5, 0.025, 0.46, 0x5a5d60, 0, 0.16, 0));
  p.push(box(F * 2 + 0.05, 0.04, PL.half * 2 + 0.05, CREAM2, 0, PL.top + 0.02, 0));              // the rim
  for (const sx of [-1, 1]) {
    const fx = sx * F;
    // the middle pilaster, proud of the face: three wide flutes, a bolt every 13 cm down the outer two
    p.push(box(0.03, PL.top - PL.foot, PL.pil * 2, CREAM2, fx + sx * 0.015, (PL.top + PL.foot) / 2, 0));
    for (const dz of [-0.105, 0, 0.105]) p.push(box(0.022, PL.top - PL.foot, 0.07, CREAM, fx + sx * 0.035, (PL.top + PL.foot) / 2, dz));
    for (const dz of [-0.105, 0.105]) for (let k = 0; k < 6; k++) p.push(part(new THREE.CylinderGeometry(0.013, 0.013, 0.01, 8).rotateZ(Math.PI / 2), BOLT, fx + sx * 0.049, PL.foot + 0.12 + k * 0.135, dz));
    // the end blocks' flutes
    for (const sz of [-1, 1]) for (const zz of [0.605, 0.665, 0.725]) p.push(box(0.02, PL.top - PL.endBot, 0.036, CREAM2, fx + sx * 0.01, (PL.top + PL.endBot) / 2, sz * zz));
    // the bands, four a side
    for (const sz of [-1, 1]) for (let k = 1; k < 5; k++) p.push(part(planterBand(k, 0, 0.056, fx + sx * 0.003, sz), FAN));
  }
  // the ends: flutes across the end blocks' outer faces, and the ring the chain hangs from
  for (const sz of [-1, 1]) {
    for (const dx of [-0.2, -0.1, 0, 0.1, 0.2]) p.push(box(0.04, PL.top - PL.endBot, 0.02, CREAM2, dx, (PL.top + PL.endBot) / 2, sz * (PL.half + 0.01)));
    p.push(part(new THREE.TorusGeometry(0.03, 0.006, 4, 10), 0x2e3134, 0, 0.78, sz * (PL.half + 0.045)));
  }
  // soil, the azalea mound (green underneath, red-pink blooms), pansies, ivy
  const top = PL.top;
  p.push(box(F * 2 - 0.04, 0.03, PL.half * 2 - 0.06, 0x3a2a1e, 0, top - 0.005, 0));
  const R = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  { const g = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(0.56, 0.7, 1.3); p.push(part(g, 0x2d4424, 0, top, 0)); }
  for (let i = 0; i < 34; i++) {
    const th = R(i, 5) * 6.283, ph = Math.acos(1 - R(i, 6) * 0.92), rr = 0.5;
    const x = Math.sin(ph) * Math.cos(th) * rr * 0.56, y = Math.cos(ph) * rr * 0.7, z = Math.sin(ph) * Math.sin(th) * rr * 1.3;
    const g = new THREE.IcosahedronGeometry(0.055 + R(i, 4) * 0.03, 0); g.scale(1, 0.6, 1);
    p.push(part(g, R(i, 7) < 0.62 ? 0xc8163c : R(i, 7) < 0.86 ? 0xe03565 : 0xa50f2a, x, top + 0.01 + y, z));
  }
  for (let i = 0; i < 20; i++) {
    const sx = i % 2 ? 1 : -1, z = -0.68 + (i >> 1) * 0.15, c = R(i, 9) < 0.65 ? 0xf3c51c : R(i, 9) < 0.9 ? 0x58288a : 0xf2efe6;
    p.push(part(new THREE.CylinderGeometry(0.045, 0.035, 0.012, 6), c, sx * (0.25 + R(i, 11) * 0.03), top + 0.03, z));
  }
  for (let i = 0; i < 6; i++) {
    const sx = i % 2 ? 1 : -1, z0 = (i < 3 ? -1 : 1) * (0.64 + 0.04 * R(i, 12)), n = 3 + Math.floor(R(i, 10) * 3);
    for (let k = 0; k < n; k++) { const g = new THREE.IcosahedronGeometry(0.04, 0); g.scale(0.4, 1, 1); p.push(part(g, k % 2 ? 0x3a5a2c : 0x2c4a22, sx * (F + 0.06 + k * 0.004), top - k * 0.075, z0 + Math.sin(k * 1.7) * 0.03)); }
  }
  if (chain) {
    // a steel chain of oval links between this planter's ring and the next one's, sagging 12 cm
    const za = PL.half + 0.075, zb = 2.6 - za, n = 26, L0 = (zb - za) / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, z = za + (zb - za) * t, y = 0.78 - 0.12 * 4 * t * (1 - t), slope = -0.12 * 4 * (1 - 2 * t) / (zb - za);
      const g = new THREE.TorusGeometry(0.018, 0.006, 3, 8); g.scale(1, 1, 1); g.rotateY(Math.PI / 2); g.scale(1, 0.75, L0 / 0.036 * 1.15);
      if (i % 2) g.rotateZ(Math.PI / 2);
      g.rotateX(-Math.atan(slope));
      p.push(part(g, 0x8a8e93, 0, y, z));
    }
  }
  return p;
}
const KINDS = {
  // a furled café parasol on a weighted base: canopy white here, the instance colour paints it (and darkens the pole)
  parasol: () => [cyl(0.25, 0.08, 0x3a3a3a, 0, 0.04, 0, 14), cyl(0.025, 2.5, 0x3a3a3a, 0, 1.3, 0, 8),
    part(new THREE.CylinderGeometry(0.05, 0.13, 1.5, 10), 0xffffff, 0, 1.75, 0), part(new THREE.ConeGeometry(0.05, 0.16, 8), 0x2a2a2a, 0, 2.58, 0),
    cyl(0.135, 0.06, 0xf0f0f0, 0, 1.6, 0, 10)],
  planter: () => planter(true),
  planterEnd: () => planter(false),
  // granite bench with a timber top (five boards, a shadow gap between)
  kerbBench: () => {
    const p = [box(0.42, 0.38, 1.8, 0x8f8c87, 0, 0.19, 0), box(0.36, 0.02, 1.7, 0x6a6864, 0, 0.385, 0)];
    for (let k = 0; k < 5; k++) p.push(box(0.088, 0.06, 1.92, k % 2 ? 0x8a5a33 : 0x93623a, -0.2 + k * 0.1, 0.42, 0));
    return p;
  },
  // the bronze service cabinet, a Bund skyline etched into its faces (four tower outlines), vents at the ends
  bronze: () => {
    const B = 0x7a6440, E = 0x463420, p = [box(0.5, 1.25, 0.86, B, 0, 0.625, 0), box(0.54, 0.04, 0.9, 0x86693a, 0, 1.27, 0), box(0.54, 0.06, 0.9, 0x5a4a32, 0, 0.03, 0)];
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const zc = -0.3 + k * 0.2, w = 0.13, hh = 0.55 + (k % 2) * 0.22 + (k === 3 ? 0.08 : 0), y0 = 0.22, fx = sx * 0.252;
      p.push(box(0.006, hh, 0.008, E, fx, y0 + hh / 2, zc - w / 2), box(0.006, hh, 0.008, E, fx, y0 + hh / 2, zc + w / 2));
      p.push(box(0.006, 0.008, w, E, fx, y0 + hh, zc));
      p.push(part(new THREE.TorusGeometry(w / 2, 0.004, 3, 8, Math.PI).rotateY(Math.PI / 2), E, fx, y0 + hh, zc));                // its arched top
      for (let f = 1; f < 6; f++) p.push(box(0.006, 0.006, w * 0.7, E, fx, y0 + (hh * f) / 6, zc));                                // floor lines
    }
    for (const sz of [-1, 1]) for (let k = 0; k < 9; k++) p.push(box(0.36, 0.012, 0.006, 0x4a3a22, 0, 0.35 + k * 0.08, sz * 0.432));
    return p;
  },
  // smart pole: slim black mast, radio modules near the top, a camera arm, a small cabinet door
  smartpole: () => [cyl(0.09, 7.0, 0x1f2124, 0, 3.5, 0, 12), box(0.2, 1.1, 0.14, 0x26282b, 0.0, 6.2, 0.13), box(0.2, 1.1, 0.14, 0x26282b, 0.0, 6.2, -0.13),
    box(0.06, 0.06, 0.7, 0x1f2124, 0, 4.4, 0.35), box(0.13, 0.12, 0.28, 0xd9dcdf, 0, 4.3, 0.62), box(0.1, 0.09, 0.02, 0x101214, -0.0, 4.3, 0.765),
    box(0.11, 0.1, 0.24, 0xd9dcdf, -0.1, 4.25, -0.02), box(0.18, 0.4, 0.12, 0x2a2c30, 0.0, 2.6, 0.11), cyl(0.12, 0.08, 0x2a2c30, 0, 0.04, 0, 12)],
  // a street tree's tripod of stakes, tied in a triangle at 1.5 m, and its pit: a cast grate in a stone edge
  stakes: () => {
    const p = [box(1.2, 0.02, 1.2, 0x2b2c2e, 0, 0.012, 0)];
    for (const [w, d, x, z] of [[1.36, 0.08, 0, 0.64], [1.36, 0.08, 0, -0.64], [0.08, 1.2, 0.64, 0], [0.08, 1.2, -0.64, 0]]) p.push(box(w, 0.04, d, 0x8a8781, x, 0.02, z));
    const ring = [];
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094 + 0.5, bx = Math.cos(a) * 0.72, bz = Math.sin(a) * 0.72, tx = Math.cos(a) * 0.2, tz = Math.sin(a) * 0.2;
      const g = new THREE.CylinderGeometry(0.035, 0.04, 1.0, 6); g.translate(0, 0.5, 0);
      const len = Math.hypot(bx - tx, 1.75, bz - tz); g.scale(1, len, 1);
      // lean the pole from its foot at (bx, bz) toward the trunk at 1.75 m
      const tilt = Math.atan2(Math.hypot(bx - tx, bz - tz), 1.75);
      g.rotateZ(tilt); g.rotateY(Math.atan2(bz - tz, -(bx - tx)) + Math.PI);
      p.push(part(g, 0x7d776d, bx, 0, bz));
      ring.push([Math.cos(a) * 0.27, Math.sin(a) * 0.27]);
    }
    for (let k = 0; k < 3; k++) { const [ax, az] = ring[k], [cx, cz] = ring[(k + 1) % 3]; const len = Math.hypot(cx - ax, cz - az); p.push(part(new THREE.BoxGeometry(len, 0.05, 0.03).rotateY(-Math.atan2(cz - az, cx - ax)), 0x6f6a61, (ax + cx) / 2, 1.5, (az + cz) / 2)); }
    return p;
  },
  // a shared bike, length along x: frame in its operator's colour (instance colour), black tyres
  bike: () => {
    const p = [];
    for (const wx of [-0.52, 0.52]) {
      p.push(part(new THREE.TorusGeometry(0.31, 0.028, 6, 18), TYRE, wx, 0.33, 0));
      p.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), STEEL, wx, 0.33, 0, Math.PI / 2));
      p.push(part(new THREE.TorusGeometry(0.35, 0.02, 4, 10, Math.PI * 0.8), PAINT, wx, 0.33, 0, 0, 0, 0.3));
    }
    p.push(tube(-0.52, 0.33, -0.2, 0.36, 0.022, PAINT), tube(-0.2, 0.36, -0.28, 0.84, 0.028, PAINT), tube(-0.2, 0.36, 0.38, 0.8, 0.036, PAINT));
    p.push(tube(0.52, 0.33, 0.38, 0.98, 0.026, PAINT), tube(-0.52, 0.33, -0.27, 0.74, 0.02, PAINT));
    p.push(box(0.26, 0.06, 0.15, DARK, -0.3, 0.86, 0), box(0.04, 0.04, 0.54, DARK, 0.38, 1.0, 0));
    p.push(box(0.28, 0.2, 0.32, PAINT, 0.58, 0.74, 0));                                       // the basket
    p.push(box(0.03, 0.3, 0.03, DARK, -0.06, 0.15, 0.12));                                     // the stand
    return p;
  },
  // two compartments (dry and wet), grey steel with coloured lids
  bin: () => [box(0.82, 0.78, 0.46, 0x4a4f55, 0, 0.39, 0), box(0.4, 0.06, 0.48, 0x1c1d20, -0.205, 0.81, 0), box(0.4, 0.06, 0.48, 0x1c4f8f, 0.205, 0.81, 0),
    box(0.26, 0.12, 0.02, 0xd8d8d0, -0.205, 0.6, 0.235), box(0.26, 0.12, 0.02, 0xd8d8d0, 0.205, 0.6, 0.235)],
  bollard: () => [cyl(0.1, 0.82, 0x3b3e43, 0, 0.41, 0, 12), cyl(0.104, 0.07, 0xe9e9e2, 0, 0.66, 0, 12), cyl(0.11, 0.05, 0x2a2c30, 0, 0.845, 0, 12)],
  cabinet: () => [box(0.9, 1.25, 0.5, 0x6d776a, 0, 0.625, 0), box(0.96, 0.05, 0.56, 0x50584e, 0, 1.275, 0), box(0.02, 0.9, 0.3, 0x5a6358, 0, 0.62, 0.255), box(0.92, 0.08, 0.52, 0x3a3f39, 0, 0.04, 0)],
  // a classic pillar hydrant: a flanged foot, the barrel, a bolted flange at the top of it, the bonnet and its
  // dome with a pentagon nut, two capped hose outlets at the sides and the big pumper outlet facing the road
  hydrant: () => {
    const RED = 0xbf221c, DK = 0x9a1914, p = [];
    p.push(cyl(0.155, 0.035, DK, 0, 0.018, 0, 16), part(new THREE.CylinderGeometry(0.118, 0.14, 0.06, 16), RED, 0, 0.065, 0));
    p.push(part(new THREE.CylinderGeometry(0.108, 0.115, 0.46, 16), RED, 0, 0.325, 0));
    p.push(cyl(0.142, 0.04, RED, 0, 0.575, 0, 16), cyl(0.13, 0.012, DK, 0, 0.552, 0, 16));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; p.push(cyl(0.012, 0.05, DK, Math.cos(a) * 0.128, 0.575, Math.sin(a) * 0.128, 6)); }
    p.push(part(new THREE.CylinderGeometry(0.112, 0.12, 0.13, 16), RED, 0, 0.66, 0));
    p.push(cyl(0.122, 0.02, DK, 0, 0.73, 0, 16));
    { const g = new THREE.SphereGeometry(0.115, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.72, 1); p.push(part(g, RED, 0, 0.738, 0)); }
    p.push(cyl(0.035, 0.05, DK, 0, 0.845, 0, 5), cyl(0.05, 0.012, DK, 0, 0.822, 0, 12));
    for (const sz of [-1, 1]) {   // the hose outlets, along the kerb
      p.push(cyl(0.046, 0.08, RED, 0, 0.62, sz * 0.14, 12, Math.PI / 2), cyl(0.056, 0.03, RED, 0, 0.62, sz * 0.19, 12, Math.PI / 2));
      p.push(cyl(0.024, 0.03, DK, 0, 0.62, sz * 0.218, 5, Math.PI / 2));
    }
    // the pumper outlet, to the road (west, -x), its cap and nut
    p.push(cyl(0.06, 0.09, RED, -0.15, 0.5, 0, 14, 0, Math.PI / 2), cyl(0.072, 0.035, RED, -0.205, 0.5, 0, 14, 0, Math.PI / 2), cyl(0.028, 0.035, DK, -0.235, 0.5, 0, 5, 0, Math.PI / 2));
    return p;
  },
  // a street-name post: two blue blades crossed at the top (Shanghai's are blue with white lettering)
  signpost: () => [cyl(0.04, 2.7, STEEL, 0, 1.35, 0, 8), box(0.95, 0.27, 0.03, 0x1d4c9e, 0.42, 2.5, 0), box(0.03, 0.27, 0.95, 0x1d4c9e, 0, 2.22, 0.42),
    box(0.9, 0.025, 0.035, 0xf2f2f2, 0.42, 2.43, 0), box(0.035, 0.025, 0.9, 0xf2f2f2, 0, 2.15, 0.42)],
  // an enforcement camera on a pole, its arm out over the road along +x; the flash unit beside it
  camera: () => [cyl(0.085, 5.8, 0x9aa0a6, 0, 2.9, 0, 10), cyl(0.05, 3.2, 0x9aa0a6, 1.6, 5.6, 0, 8, 0, Math.PI / 2), box(0.42, 0.2, 0.22, 0xd9dcdf, 3.0, 5.45, 0), box(0.12, 0.12, 0.02, 0x101214, 3.0, 5.45, 0.12),
    box(0.3, 0.16, 0.16, 0xd9dcdf, 2.5, 5.45, 0), box(0.24, 0.12, 0.02, 0xf4f4ff, 2.5, 5.45, 0.09)],
  // a police post: white booth, blue band, dark glass, a lamp bar on the roof
  police: () => [box(2.3, 2.5, 2.1, 0xe7eaed, 0, 1.25, 0), box(2.34, 0.32, 2.14, 0x1c3f8f, 0, 2.15, 0), box(2.32, 0.9, 2.12, 0x1a222c, 0, 1.45, 0),
    box(2.5, 0.12, 2.3, 0xcfd3d7, 0, 2.56, 0), box(0.9, 0.14, 0.26, 0x2a2c30, 0, 2.69, 0), box(0.8, 0.5, 0.02, 0x1a222c, 0, 0.9, 1.06), box(2.34, 0.1, 2.14, 0x7c8186, 0, 0.05, 0)],
};

export function createDressing({ scene, addCollider = null }) {
  const group = new THREE.Group(); group.name = 'dressing'; scene.add(group);
  const props = dressingProps();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2 });
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  const meshes = {}, spots = { camera: [], police: [] };
  for (const [kind, build] of Object.entries(KINDS)) {
    const list = props.filter((p) => p.kind === kind); if (!list.length) continue;
    const geo = mergeGeometries(build(), false); geo.computeBoundingSphere();
    const im = new THREE.InstancedMesh(geo, mat, list.length); im.name = `dressing-${kind}`;
    im.castShadow = kind !== 'bollard'; im.receiveShadow = true;
    list.forEach((p, i) => {
      const y = groundHeight(p.x, p.z, p.x > L.wallX ? 4 : 0.5);
      _p.set(p.x, y, p.z); _q.setFromAxisAngle(_up, p.yaw || 0);
      im.setMatrixAt(i, _m.compose(_p, _q, _s));
      if (p.colour != null) im.setColorAt(i, new THREE.Color(p.colour));
      if (spots[kind]) spots[kind].push({ x: p.x, y, z: p.z, yaw: p.yaw || 0 });
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();                            // (so a kind out of view is skipped)
    group.add(im); meshes[kind] = im;
  }
  if (addCollider) {
    for (const b of dressingBoxes()) Object.assign(addCollider('bikes'), b);          // (the crowd walks round these too)
    for (const p of props) if (['bin', 'bollard', 'hydrant', 'signpost', 'camera', 'planter', 'planterEnd', 'kerbBench', 'bronze', 'smartpole', 'parasol'].includes(p.kind)) {
      const [hx, hz] = FOOT[p.kind], c = Math.abs(Math.cos(p.yaw || 0)), s = Math.abs(Math.sin(p.yaw || 0)), ax = hx * c + hz * s, az = hx * s + hz * c;
      Object.assign(addCollider('post'), { minX: p.x - ax, maxX: p.x + ax, minZ: p.z - az, maxZ: p.z + az });
    }
  }
  return { group, meshes, spots, count: props.length };
}
