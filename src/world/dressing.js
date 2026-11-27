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
const CREAM = 0xe9e3d2, CREAM2 = 0xd8d1bd, FAN = 0x1c1d1f;
// The Bund's planters: a cream art-deco box on a stepped neck and a dark base plate, fluted pilasters at the
// ends and the middle, a black art-deco fan (three curved stripes a side) spreading from the foot of the middle
// pilaster; red azaleas mounded in it, yellow and violet pansies round the rim, ivy over the edge. Long side
// along z. `chain`: the chain to the next planter, 2.6 m on.
function planter(chain) {
  const p = [];
  p.push(box(0.86, 0.05, 1.74, 0x55585b, 0, 0.025, 0), box(0.56, 0.12, 1.1, 0x5f6265, 0, 0.11, 0));           // base plate, plinth
  p.push(box(0.4, 0.12, 0.7, CREAM2, 0, 0.23, 0), box(0.6, 0.05, 1.34, CREAM, 0, 0.315, 0));                   // the neck, its step
  p.push(box(0.72, 0.6, 1.5, CREAM, 0, 0.64, 0), box(0.78, 0.05, 1.56, CREAM2, 0, 0.965, 0));                   // the box, its rim
  for (const sx of [-1, 1]) {
    const fx = sx * 0.36;
    for (const zc of [-0.7, 0.7]) p.push(box(0.03, 0.6, 0.1, CREAM2, fx + sx * 0.012, 0.64, zc));                 // end pilasters
    for (const dz of [-0.05, 0, 0.05]) p.push(box(0.034, 0.6, 0.03, CREAM2, fx + sx * 0.014, 0.64, dz));           // the fluted middle
    for (const yy of [0.46, 0.64, 0.82]) p.push(part(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 10).rotateZ(Math.PI / 2), 0xcfc7b0, fx + sx * 0.034, yy, 0));   // its rosettes
    // the fan: on each side of the middle pilaster, three black stripes curving up and out from its foot
    // to the rim, thin at the pivot and broadening as they spread
    for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) {
      const p0 = [sg * 0.085, 0.37], p2 = [sg * (0.24 + 0.205 * k), 0.93], p1 = [sg * (0.16 + 0.27 * k), 0.47 + 0.03 * k], n = 6;
      const at = (t) => [0, 1].map((j) => (1 - t) * (1 - t) * p0[j] + 2 * (1 - t) * t * p1[j] + t * t * p2[j]);
      for (let i = 0; i < n; i++) {
        const [za, ya] = at(i / n), [zb, yb] = at((i + 1) / n), len = Math.hypot(zb - za, yb - ya), wd = 0.026 + 0.05 * ((i + 0.5) / n);
        const g = new THREE.BoxGeometry(0.006, len * 1.08, wd); g.rotateX(Math.atan2(zb - za, yb - ya));
        p.push(part(g, FAN, fx + sx * 0.004, (ya + yb) / 2, (za + zb) / 2));
      }
    }
  }
  for (const sz of [-1, 1]) for (const dx of [-0.24, 0, 0.24]) p.push(box(0.05, 0.6, 0.03, CREAM2, dx, 0.64, sz * 0.762));   // ribs on the ends
  // soil, the azalea mound (green underneath, a scatter of red-pink blooms), pansies, ivy
  p.push(box(0.66, 0.04, 1.44, 0x3a2a1e, 0, 0.93, 0));
  const R = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
  // the azalea: a low dome of dark leaves, the blooms packed over its top and sides (crimson, a few pinks)
  { const g = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(0.62, 0.62, 1.32); p.push(part(g, 0x2d4424, 0, 0.94, 0)); }
  for (let i = 0; i < 34; i++) {
    const th = R(i, 5) * 6.283, ph = Math.acos(1 - R(i, 6) * 0.92), rr = 0.5;
    const x = Math.sin(ph) * Math.cos(th) * rr * 0.62, y = Math.cos(ph) * rr * 0.62, z = Math.sin(ph) * Math.sin(th) * rr * 1.32;
    const g = new THREE.IcosahedronGeometry(0.055 + R(i, 4) * 0.03, 0); g.scale(1, 0.6, 1);
    p.push(part(g, R(i, 7) < 0.62 ? 0xc8163c : R(i, 7) < 0.86 ? 0xe03565 : 0xa50f2a, x, 0.95 + y, z));
  }
  // pansies round the rim, faces up: yellow mostly, some violet, a white
  for (let i = 0; i < 20; i++) {
    const sx = i % 2 ? 1 : -1, z = -0.68 + (i >> 1) * 0.15, c = R(i, 9) < 0.65 ? 0xf3c51c : R(i, 9) < 0.9 ? 0x58288a : 0xf2efe6;
    const g = new THREE.CylinderGeometry(0.045, 0.035, 0.012, 6); p.push(part(g, c, sx * (0.31 + R(i, 11) * 0.03), 0.985, z));
  }
  // ivy trailing over the long sides: strings of small leaves
  for (let i = 0; i < 6; i++) {
    const sx = i % 2 ? 1 : -1, z0 = -0.6 + i * 0.24, n = 3 + Math.floor(R(i, 10) * 3);
    for (let k = 0; k < n; k++) { const g = new THREE.IcosahedronGeometry(0.04, 0); g.scale(0.4, 1, 1); p.push(part(g, k % 2 ? 0x3a5a2c : 0x2c4a22, sx * (0.4 + k * 0.004), 0.95 - k * 0.075, z0 + Math.sin(k * 1.7) * 0.03)); }
  }
  if (chain) {
    // a short-link chain hung between the two planters' ends: 0.8 m up, sagging 10 cm
    const za = 0.79, zb = 2.6 - 0.79, n = 16;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, z = za + (zb - za) * t, y = 0.8 - 0.1 * 4 * t * (1 - t);
      p.push(part(new THREE.BoxGeometry(i % 2 ? 0.012 : 0.03, i % 2 ? 0.03 : 0.012, (zb - za) / n * 1.25), 0x2e3134, 0, y, z));
    }
    for (const z of [za - 0.03, zb + 0.03]) p.push(box(0.04, 0.04, 0.04, 0x2e3134, 0, 0.8, z));             // the eyes it hangs from
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
  hydrant: () => [cyl(0.11, 0.55, 0xb3231e, 0, 0.3, 0, 12), cyl(0.14, 0.06, 0xb3231e, 0, 0.04, 0, 12), cyl(0.08, 0.1, 0x8d1a16, 0, 0.62, 0, 10), cyl(0.045, 0.12, 0xc6c6c0, 0.12, 0.38, 0, 8, 0, Math.PI / 2), cyl(0.045, 0.12, 0xc6c6c0, -0.12, 0.38, 0, 8, 0, Math.PI / 2)],
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
