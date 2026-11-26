// E-bikes, drawn (docs/living-city-architecture.md §6.4): engine/ebikes.js moves them, this draws
// them. Every rider is one rigid mesh: a crowd avatar posed once on the seat at load (hips on the
// saddle, feet on the board, hands on the bars, a little forward lean) and frozen into plain
// geometry, simplified and packed into one texture (world/crowdLod.js). The scooter is a few dozen
// primitives in vertex colours: a low step-through 电动车 with a quilted windbreak over the bars (it
// is November), and for couriers a delivery box on the back. Helmet, box and the commuters' bodywork
// take a colour per bike; the jacket takes one per rider (couriers in their company's yellow or blue).
// Four draw calls for every e-bike in the city; a screen-door fade where they come and go.
//   createEbikeView({ scene, people, roles }) -> { update(riders, eye), stats }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPerson } from './people.js';
import { groundHeight } from './layout.js';

const MAX = 128, FAR = 170;
const COURIER = { courierY: 0xf2c200, courierB: 0x1f7fe0 };
const JACKETS = [0x23262c, 0x3a3f48, 0x4a3b33, 0x1f2a3a, 0x5a2f2f, 0x2f3d33, 0x6b6e73, 0x2a2a2e];
const BODIES = [0xf1f1ee, 0xb3262a, 0x9dc3e0, 0x1c1d20, 0xa8d8c4, 0xe8e2d0, 0x2b4f8f, 0xf1f1ee];
const SHARED = [0x1d7fe0, 0x2fae5a];

// ---- the scooter (length along +z, ground at y 0) ----
const PAINT = 0xffffff;
function part(geo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(n).fill(hex === PAINT ? 1 : 0), 1));   // (only the paint takes the bike's colour)
  return g;
}
const box = (w, h, d, hex, x, y, z, rx = 0) => part(new THREE.BoxGeometry(w, h, d), hex, x, y, z, rx);
const TYRE = 0x161616, DARK = 0x26282c, CHROME = 0x9aa0a6, SEAT = 0x1b1b1d, QUILT = 0x1e2433;
function scooter(courier, head) {
  const p = [];
  for (const z of [-0.6, 0.62]) {
    p.push(part(new THREE.CylinderGeometry(0.27, 0.27, 0.1, 16), TYRE, 0, 0.27, z, 0, 0, Math.PI / 2));
    p.push(part(new THREE.CylinderGeometry(0.15, 0.15, 0.115, 12), CHROME, 0, 0.27, z, 0, 0, Math.PI / 2));
  }
  const body = courier ? DARK : PAINT;
  p.push(box(0.34, 0.1, 0.62, DARK, 0, 0.3, 0.06));                                        // the floorboard
  p.push(box(0.36, 0.42, 0.62, body, 0, 0.56, -0.38, -0.12));                              // the rear body under the seat
  p.push(box(0.3, 0.1, 0.62, SEAT, 0, 0.8, -0.32));                                        // the saddle
  p.push(box(0.3, 0.62, 0.16, body, 0, 0.62, 0.42, 0.38));                                 // the leg shield / front column
  p.push(box(0.2, 0.18, 0.5, body, 0, 0.42, 0.62, 0));                                     // front mudguard
  p.push(part(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), CHROME, 0, 1.02, 0.52, 0, 0, Math.PI / 2));   // the handlebar
  p.push(box(0.2, 0.12, 0.1, body, 0, 0.98, 0.58));                                        // the lamp housing
  p.push(box(0.12, 0.06, 0.02, 0xf4f2e8, 0, 0.98, 0.635));                                 // the head lamp
  p.push(box(0.14, 0.05, 0.02, 0x8a1010, 0, 0.62, -0.72));                                 // the tail lamp
  for (const s of [-1, 1]) p.push(part(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 4), CHROME, s * 0.26, 1.14, 0.5), part(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 10), CHROME, s * 0.27, 1.27, 0.5, Math.PI / 2));   // mirrors
  // the quilted windbreak over the bars and the rider's knees
  p.push(box(0.6, 0.55, 0.08, QUILT, 0, 0.78, 0.5, 0.25), box(0.66, 0.06, 0.12, QUILT, 0, 1.06, 0.48));
  if (courier) {
    p.push(box(0.46, 0.4, 0.44, PAINT, 0, 1.06, -0.62), box(0.48, 0.04, 0.46, 0xe9e9e9, 0, 1.27, -0.62), box(0.34, 0.12, 0.012, 0x1a1a1a, 0, 1.1, -0.395));   // the box, its lid, its label
  }
  // the helmet, fitted to this rider's skull (measured off the posed mesh): a shell a centimetre or so
  // proud of the hair, its rim at the brow, a short visor over the eyes, straps down past the ears
  // (tipped back a little, as helmets sit: the rim at the brow in front, down over the nape behind)
  const { cx, cz, top, rx, rz } = head.skull, ry = 0.11, tip = 0.22, base = top + 0.016 - ry * Math.cos(tip);
  const at = (y, z) => [base + y * Math.cos(tip) - z * Math.sin(tip), cz + y * Math.sin(tip) + z * Math.cos(tip)];   // a point of the helmet, tipped
  p.push(part(new THREE.SphereGeometry(1, 18, 9, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(rx, ry, rz), PAINT, cx, base, cz, tip));
  p.push(part(new THREE.CylinderGeometry(1, 1, 0.014, 18, 1, true).scale(rx + 0.003, 1, rz + 0.003), DARK, cx, ...at(0.004, 0), tip));   // the rim
  p.push(part(new THREE.BoxGeometry(rx * 1.3, 0.012, 0.045), 0x101418, cx, ...at(0.006, rz + 0.012), tip - 0.1));   // the visor
  for (const sd of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.008, 0.075, 0.012), 0x141414, cx + sd * (rx - 0.004), ...at(-0.035, rz * 0.15)));   // the straps
  return mergeGeometries(p, false);
}

// ---- the rider, posed and frozen ----
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _ax = new THREE.Vector3();
function rotWorld(bone, ax, ang) {                            // turn a bone about a world axis through its own pivot
  if (!bone) return;
  bone.parent.getWorldQuaternion(_pq);
  _q.setFromAxisAngle(_ax.copy(ax), ang);
  const local = _pq.clone().invert().multiply(_q).multiply(_pq);
  bone.quaternion.premultiply(local);
  bone.updateMatrixWorld(true);
}
const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
async function riderGeometry(people, role) {
  const { buildLod, lodReady } = await import('./crowdLod.js');
  await lodReady;
  const p = createPerson(people, role);
  p.root.position.set(0, 0, 0); p.root.rotation.set(0, 0, 0);
  // stand still in the idle's first frame, then sit
  p.mixer.stopAllAction(); const a = p.actions.base.idle; a.reset(); a.setEffectiveWeight(1); a.play(); a.time = 0; p.mixer.update(0);
  p.root.updateMatrixWorld(true);
  const bone = (n) => p.root.getObjectByName(`Bip01_${n}`);
  for (const s of ['L', 'R']) {
    rotWorld(bone(`${s}_Thigh`), X, -1.35);                   // thighs forward
    rotWorld(bone(`${s}_Calf`), X, 1.45);                     // shins back down
    rotWorld(bone(`${s}_Foot`), X, -0.1);
    rotWorld(bone(`${s}_Thigh`), Z, s === 'L' ? 0.08 : -0.08);   // knees a little apart
  }
  rotWorld(bone('Spine'), X, 0.16);                          // a little forward
  for (const s of ['L', 'R']) {
    rotWorld(bone(`${s}_UpperArm`), X, -0.95);                 // arms out to the bars
    rotWorld(bone(`${s}_UpperArm`), Z, s === 'L' ? -0.18 : 0.18);
    rotWorld(bone(`${s}_Forearm`), X, -0.35);
  }
  p.root.updateMatrixWorld(true);
  const lod = buildLod(p.root, { tris: 1600 });
  if (!lod) return null;
  // freeze: skin every vertex with the posed bones (as three does), into metres about the feet
  const ref = []; p.root.traverse((o) => { if (o.isSkinnedMesh) ref.push(o); });
  const sm = ref[0], bones = sm.skeleton.bones, inv = sm.skeleton.boneInverses;
  const mats = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]).premultiply(new THREE.Matrix4().multiplyMatrices(sm.matrixWorld, sm.bindMatrixInverse)).multiply(sm.bindMatrix));
  const g = lod.geometry, P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), acc = new THREE.Vector3(), accN = new THREE.Vector3(), t = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i); acc.set(0, 0, 0); accN.set(0, 0, 0);
    for (let c = 0; c < 4; c++) {
      const w = SW.getComponent(i, c); if (!w) continue;
      const m = mats[SI.getComponent(i, c)];
      acc.addScaledVector(t.copy(v).applyMatrix4(m), w);
      accN.addScaledVector(t.copy(n).applyMatrix3(nm.setFromMatrix4(m)), w);
    }
    P.setXYZ(i, acc.x, acc.y, acc.z); N.setXYZ(i, accN.x, accN.y, accN.z);
  }
  g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight'); N.needsUpdate = P.needsUpdate = true;
  // onto the saddle: the pelvis just above it, a little behind the middle
  const pelvis = new THREE.Vector3(), head = new THREE.Vector3();
  bone('Pelvis').getWorldPosition(pelvis); bone('Head').getWorldPosition(head);
  const dx = -pelvis.x, dy = 0.9 - pelvis.y, dz = -0.3 - pelvis.z;
  g.translate(dx, dy, dz); head.add(new THREE.Vector3(dx, dy, dz));
  g.computeBoundingSphere();
  // the skull: the top of the head, and its width and depth across the band where a helmet sits
  let top = -Infinity;
  for (let i = 0; i < P.count; i++) if (Math.abs(P.getX(i) - head.x) < 0.14 && Math.abs(P.getZ(i) - head.z) < 0.16 && P.getY(i) > top) top = P.getY(i);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (y < top - 0.085 || Math.abs(x - head.x) > 0.14 || Math.abs(z - head.z) > 0.16) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  head.skull = x0 < x1
    ? { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 - 0.006, top, rx: (x1 - x0) / 2 + 0.012, rz: (z1 - z0) / 2 + 0.02 }
    : { cx: head.x, cz: head.z, top: head.y + 0.2, rx: 0.095, rz: 0.11 };
  p.mixer.stopAllAction(); for (const m of ref) m.skeleton.dispose();
  return { geometry: g, map: lod.map, head };
}

// a fade per instance, as the crowd's middle tier does (screen-door dither, no blending)
function fading(mat, key) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float iFade;\nvarying float vFade;' + (mat.userData.tinted ? '\nattribute float tint;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = iFade;');
    // (the instance colour only where tint is 1, over the vertex colours if there are any)
    if (mat.userData.tinted) sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vec3 ebBase = vec3(1.0);\n #ifdef USE_COLOR\n ebBase = color.xyz;\n #endif\n vColor.xyz = ebBase * mix(vec3(1.0), instanceColor.xyz, tint);\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vFade < 0.999) { float dz = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (dz >= vFade) discard; }');
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export function createEbikeView({ scene, people, roles = [] }) {
  const group = new THREE.Group(); group.name = 'ebikes'; scene.add(group);
  const stats = { drawn: 0, ready: false };
  const sets = [];                                            // per rider avatar: { rider, commuter, courier }
  const fadeAttr = () => new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage);
  function inst(geo, mat, name, iFade) {
    const g = geo.clone(); g.setAttribute('iFade', iFade);
    const m = new THREE.InstancedMesh(g, mat, MAX); m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.name = name;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
    group.add(m); return m;
  }
  const bikeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 }); bikeMat.userData.tinted = true; fading(bikeMat, 'ebike');
  (async () => {
    for (const role of roles) {
      if (!people || !people.avatars[role]) continue;
      try {
        const r = await riderGeometry(people, role); if (!r) continue;
        const riderMat = new THREE.MeshStandardMaterial({ map: r.map, roughness: 0.85, alphaTest: 0.5 }); riderMat.userData.tinted = true; fading(riderMat, 'ebikeRider');
        const fRider = fadeAttr(), fCommute = fadeAttr(), fCourier = fadeAttr();
        sets.push({
          rider: inst(r.geometry, riderMat, 'ebike-rider', fRider), fRider,
          commuter: inst(scooter(false, r.head), bikeMat, 'ebike-commuter', fCommute), fCommute,
          courier: inst(scooter(true, r.head), bikeMat, 'ebike-courier', fCourier), fCourier,
        });
      } catch (err) { console.warn('ebike rider', role, err); }
    }
    stats.ready = sets.length > 0;
  })();
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _qq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
  return {
    group, stats,
    update(riders, eye) {
      if (!sets.length) return;
      const n = sets.map(() => ({ r: 0, a: 0, b: 0 }));
      for (const r of riders) {
        if (!r.active || r.fade <= 0.01) continue;
        if (eye && Math.abs(r.x - eye.x) + Math.abs(r.z - eye.z) > FAR * 1.4) continue;
        const k = r.id % sets.length, S = sets[k], c = n[k];
        if (c.r >= MAX) continue;
        _p.set(r.x, groundHeight(r.x, r.z, 0.5), r.z); _qq.setFromAxisAngle(_up, r.yaw);
        _m.compose(_p, _qq, _s);
        const courier = r.kind.startsWith('courier');
        const jacket = courier ? COURIER[r.kind] : JACKETS[r.id % JACKETS.length];
        S.rider.setMatrixAt(c.r, _m); S.rider.instanceColor.setXYZ(c.r, ...(_c.set(jacket).toArray())); S.fRider.array[c.r] = r.fade; c.r++;
        if (courier) { S.courier.setMatrixAt(c.b, _m); _c.set(COURIER[r.kind]); S.courier.instanceColor.setXYZ(c.b, _c.r, _c.g, _c.b); S.fCourier.array[c.b] = r.fade; c.b++; }
        else { S.commuter.setMatrixAt(c.a, _m); _c.set(r.kind === 'shared' ? SHARED[r.id % 2] : BODIES[(r.id * 3) % BODIES.length]); S.commuter.instanceColor.setXYZ(c.a, _c.r, _c.g, _c.b); S.fCommute.array[c.a] = r.fade; c.a++; }
      }
      let drawn = 0;
      sets.forEach((S, k) => {
        for (const [m, f, cnt] of [[S.rider, S.fRider, n[k].r], [S.commuter, S.fCommute, n[k].a], [S.courier, S.fCourier, n[k].b]]) {
          m.count = cnt; m.visible = cnt > 0; if (!cnt) continue;
          m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; f.needsUpdate = true;
        }
        drawn += n[k].r;
      });
      stats.drawn = drawn;
    },
  };
}
