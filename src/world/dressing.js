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
const KINDS = {
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
  bin: () => [box(0.82, 0.78, 0.46, 0x4a4f55, 0, 0.39, 0), box(0.4, 0.06, 0.48, 0x1c1d20, -0.205, 0.81, 0), box(0.4, 0.06, 0.48, 0x5c3a22, 0.205, 0.81, 0),
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
    for (const p of props) if (['bin', 'bollard', 'hydrant', 'signpost', 'camera'].includes(p.kind)) {
      const [hx, hz] = FOOT[p.kind], c = Math.abs(Math.cos(p.yaw || 0)), s = Math.abs(Math.sin(p.yaw || 0)), ax = hx * c + hz * s, az = hx * s + hz * c;
      Object.assign(addCollider('post'), { minX: p.x - ax, maxX: p.x + ax, minZ: p.z - az, maxZ: p.z + az });
    }
  }
  return { group, meshes, spots, count: props.length };
}
