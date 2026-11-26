// E-bikes, drawn (docs/living-city-architecture.md §6.4): engine/ebikes.js moves them, this draws
// them. Every seated rider is one rigid mesh: a crowd avatar posed on the seat at load (hips on the
// saddle, feet on the board, hands on the bars, a little forward lean) and frozen into plain geometry,
// simplified and packed into one texture (world/crowdLod.js). Each avatar is frozen three ways: riding
// (both hands on the bars), on a call (the right hand up at the ear, the phone under the helmet's rim)
// and looking at the phone (held low over the bars, stopped at a light or pulled in).
// The scooter is a few dozen primitives in vertex colours: a low step-through 电动车 with a quilted
// windbreak over the bars (it is November); the couriers' has a delivery box on the back in their
// company's colour, its lid a part of its own (it opens), and a phone in a clamp on the bars, its screen
// lit with the map. Commuters are the crowd's avatars, their jackets a colour each; couriers are the
// crowd body in the track jacket re-dyed in the game's three invented liveries (world/outfits.js:
// yellow, Wanji orange, Jingsong blue), the same people who walk Nanjing Road's deliveries.
// Off the bike (a pickup: engine/ebikes.js), the courier near you becomes a full animated person: gets
// off, hurries to Linger's hatch or round the corner into a Nanjing Road shop, waits on the phone,
// comes back with the bag, opens the box, puts it in, shuts it and gets back on (the seated rider and
// the person dissolve into each other getting off and on). How many at once follows the Crowds setting.
// Near you, they talk: on the phone to customers, the shop, home; at the hatch; to someone in the way
// (world/riderLines.js), through the talk callback.
// Draw calls: a rider mesh per avatar per pose in use, a scooter per avatar, the lids and the phones.
//   createEbikeView({ scene, people, roles, footMax() -> 0.., poses: bool, talk(evt) })
//     -> { update(riders, eye, dt), others(), stats }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPerson, reachArm } from './people.js';
import { groundHeight } from './layout.js';
import { dyeRider, dressRider, RIDER_BRANDS } from './outfits.js';
import { holdPhone } from './pedestriansReal.js';
import { PICKUP } from '../engine/ebikes.js';
import { RIDER_CALLS, RIDER_APP, RIDER_HATCH, RIDER_HURRY, BARISTA_HANDOVER, RIDER_THANKS, RIDER_OUT, RIDER_PASS, RIDER_WUU } from './riderLines.js';

const MAX = 128, MAXP = 40, FAR = 170, FOOT_NEAR = 45;
const BRAND_OF = { courierY: 'yellow', courierW: 'wanji', courierB: 'jingsong' };
const JACKETS = [0x23262c, 0x3a3f48, 0x4a3b33, 0x1f2a3a, 0x5a2f2f, 0x2f3d33, 0x6b6e73, 0x2a2a2e];
const BODIES = [0xf1f1ee, 0xb3262a, 0x9dc3e0, 0x1c1d20, 0xa8d8c4, 0xe8e2d0, 0x2b4f8f, 0xf1f1ee];
const SHARED = [0x1d7fe0, 0x2fae5a];
const LID = { yellow: 0xeeeeea, wanji: 0x202022, jingsong: 0xeeeeea };
// what the phones' screens show: the map (navigation), the order list, a call
const SCREENS = [new THREE.Color(0.62, 0.78, 0.98), new THREE.Color(0.86, 0.9, 0.96), new THREE.Color(0.45, 0.85, 0.6)];
const POSES = ['ride', 'call', 'look'];

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
// the box on a courier's rack: centre, size (the lid sits on top, hinged at the front edge)
const BOX = { y: 1.06, z: -0.62, w: 0.46, h: 0.4, d: 0.44 }, HINGE = { y: BOX.y + BOX.h / 2 + 0.01, z: BOX.z + BOX.d / 2 };
// the phone clamp on the bars (couriers): where the phone sits, screen up toward the rider
const MOUNT = new THREE.Matrix4().compose(new THREE.Vector3(0.0, 1.17, 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.75, 0, 0)), new THREE.Vector3(1, 1, 1));
function scooter(brand) {
  const p = [], courier = !!brand;
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
    const B = RIDER_BRANDS[brand];
    // the box (its lid is drawn on its own, it opens), a dark label on its back; the rack's frame under it;
    // the phone clamp's arm and cradle on the bars
    p.push(box(BOX.w, BOX.h, BOX.d, B.box, 0, BOX.y, BOX.z), box(0.34, 0.12, 0.012, brand === 'wanji' ? 0xf2672a : 0x1a1a1a, 0, BOX.y + 0.04, BOX.z - BOX.d / 2 - 0.006));
    p.push(box(0.4, 0.03, 0.36, DARK, 0, BOX.y - BOX.h / 2 - 0.02, BOX.z), box(0.03, 0.2, 0.03, DARK, -0.17, BOX.y - BOX.h / 2 - 0.12, BOX.z + 0.12), box(0.03, 0.2, 0.03, DARK, 0.17, BOX.y - BOX.h / 2 - 0.12, BOX.z + 0.12));
    p.push(part(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 5), DARK, 0, 1.09, 0.56, 0.5));
    const cradle = new THREE.BoxGeometry(0.084, 0.16, 0.014).applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -0.008)).applyMatrix4(MOUNT);
    p.push(part(cradle, 0x111214));
  }
  return mergeGeometries(p, false);
}
// the helmet, fitted to this rider's skull (measured off the posed mesh): a shell a centimetre or so
// proud of the hair, its rim at the brow, a short visor over the eyes, straps down past the ears
// (tipped back a little, as helmets sit: the rim at the brow in front, down over the nape behind).
// Drawn with the seated rider, not the bike: it gets off with them.
function helmet(head) {
  const p = [];
  const { cx, cz, top, rx, rz } = head.skull, ry = 0.122, tip = 0.22, base = top + 0.022 - ry * Math.cos(tip);   // (deep enough that no hair shows through the crown)
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
// a phone's place: its centre, and its screen facing `face` with its top toward `up` (rider-local metres)
function phoneAt(pos, face, up) {
  const z = face.clone().normalize(), y = up.clone().addScaledVector(z, -up.dot(z)).normalize(), x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}
async function riderGeometry(people, role, brand = null) {
  const { buildLod, lodReady } = await import('./crowdLod.js');
  await lodReady;
  const p = createPerson(people, role);
  if (brand) dyeRider(p, brand);
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
  // (the dyed jacket's material keeps its name ending, so the bake packs it as the clothes)
  const renamed = [];
  p.root.traverse((o) => { if (o.isMesh && /:rider-/.test(o.material.name)) { renamed.push([o.material, o.material.name]); o.material.name = o.material.name.replace(/:rider-.*$/, ''); } });
  const lod = buildLod(p.root, { tris: 1600 });
  for (const [m, n] of renamed) m.name = n;
  if (!lod) return null;
  // freeze: skin every vertex with the posed bones (as three does), into metres about the feet
  const ref = []; p.root.traverse((o) => { if (o.isSkinnedMesh) ref.push(o); });
  const sm = ref[0], bones = sm.skeleton.bones, inv = sm.skeleton.boneInverses;
  const src = lod.geometry, SI = src.attributes.skinIndex, SW = src.attributes.skinWeight;
  function freeze() {
    p.root.updateMatrixWorld(true);
    const mats = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]).premultiply(new THREE.Matrix4().multiplyMatrices(sm.matrixWorld, sm.bindMatrixInverse)).multiply(sm.bindMatrix));
    const g = src.clone(), P = g.attributes.position, N = g.attributes.normal, P0 = src.attributes.position, N0 = src.attributes.normal;
    const v = new THREE.Vector3(), n = new THREE.Vector3(), acc = new THREE.Vector3(), accN = new THREE.Vector3(), t = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P0, i); n.fromBufferAttribute(N0, i); acc.set(0, 0, 0); accN.set(0, 0, 0);
      for (let c = 0; c < 4; c++) {
        const w = SW.getComponent(i, c); if (!w) continue;
        const m = mats[SI.getComponent(i, c)];
        acc.addScaledVector(t.copy(v).applyMatrix4(m), w);
        accN.addScaledVector(t.copy(n).applyMatrix3(nm.setFromMatrix4(m)), w);
      }
      P.setXYZ(i, acc.x, acc.y, acc.z); N.setXYZ(i, accN.x, accN.y, accN.z);
    }
    g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight');
    return g;
  }
  // onto the saddle: the pelvis just above it, a little behind the middle
  const pelvis = new THREE.Vector3(), head = new THREE.Vector3(), chest = new THREE.Vector3();
  bone('Pelvis').getWorldPosition(pelvis); bone('Head').getWorldPosition(head); bone('Spine2').getWorldPosition(chest);
  const off = new THREE.Vector3(-pelvis.x, 0.9 - pelvis.y, -0.3 - pelvis.z);
  const ride = freeze().translate(off.x, off.y, off.z); head.add(off); chest.add(off);
  // the skull: the top of the head, and its width and depth across the band where a helmet sits
  const P = ride.attributes.position;
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
  const sk = head.skull, ear = top - 0.125;
  // (the rider faces +z; their right hand is toward -x)
  const keep = bones.map((b) => b.quaternion.clone());
  const restore = () => { bones.forEach((b, i) => b.quaternion.copy(keep[i])); p.root.updateMatrixWorld(true); };
  const W = (v) => v.clone().sub(off);                         // a rider-local point, in the posing frame
  // on a call: the right hand at the ear, the elbow out and down
  const earR = new THREE.Vector3(sk.cx - sk.rx + 0.02, ear - 0.03, sk.cz + 0.045);
  reachArm(p.root, 'R', W(earR), 1, new THREE.Vector3(-1, -0.6, -0.2));
  const call = freeze().translate(off.x, off.y, off.z); restore();
  // looking at it: the right hand low over the bars in front of the chest, the left still on the grip
  const lookAt = new THREE.Vector3(sk.cx - 0.07, chest.y + 0.04, chest.z + 0.36);
  reachArm(p.root, 'R', W(lookAt), 1, new THREE.Vector3(-0.6, -1, 0));
  const look = freeze().translate(off.x, off.y, off.z); restore();
  const eye = new THREE.Vector3(sk.cx, top - 0.1, sk.cz + sk.rz * 0.8);
  const phone = {
    call: phoneAt(new THREE.Vector3(sk.cx - sk.rx - 0.006, ear - 0.045, sk.cz + 0.05), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.75, -0.66)),
    wedge: phoneAt(new THREE.Vector3(sk.cx + sk.rx + 0.002, ear - 0.005, sk.cz - 0.005), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0.93, -0.36)),   // (its top tucked up under the helmet's rim, over the ear)
    look: phoneAt(lookAt.clone().add(new THREE.Vector3(0.01, 0.035, 0.02)), eye.clone().sub(lookAt), new THREE.Vector3(0, 0.3, 1)),
  };
  for (const g of [ride, call, look]) g.computeBoundingSphere();
  p.mixer.stopAllAction(); for (const m of ref) m.skeleton.dispose();
  return { poses: { ride, call, look }, map: lod.map, head, phone };
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

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createEbikeView({ scene, people, roles = [], footMax = () => 2, poses = () => true, talk = null }) {
  const group = new THREE.Group(); group.name = 'ebikes'; scene.add(group);
  const stats = { drawn: 0, ready: false, onFoot: 0, poses: { ride: 0, call: 0, look: 0 }, phones: 0 };
  const commuters = [], couriers = {};                       // sets: { rider: { pose: { mesh, fade } }, bike: { mesh, fade }, phone: { pose: Matrix4 } }
  const fadeAttr = (n = MAX) => new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
  function inst(geo, mat, name, max = MAX, cast = true) {
    const fade = fadeAttr(max), g = geo.clone(); g.setAttribute('iFade', fade);
    const m = new THREE.InstancedMesh(g, mat, max); m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = true; m.name = name;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3).setUsage(THREE.DynamicDrawUsage);
    group.add(m); return { mesh: m, fade, n: 0, max };
  }
  const bikeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15 }); bikeMat.userData.tinted = true; fading(bikeMat, 'ebike');
  // the lids and the phones: one mesh each for every bike
  const lidGeo = new THREE.BoxGeometry(BOX.w + 0.02, 0.04, BOX.d + 0.02).translate(0, 0.02, -(BOX.d + 0.02) / 2);
  const lids = inst(lidGeo, fading(new THREE.MeshStandardMaterial({ roughness: 0.45 }), 'ebikeLid'), 'ebike-lids');
  const phoneBody = inst(new THREE.BoxGeometry(0.072, 0.15, 0.009), fading(new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.3, metalness: 0.5 }), 'ebikePhone'), 'ebike-phones', 160, false);
  const phoneScreen = inst(new THREE.PlaneGeometry(0.064, 0.136).translate(0, 0, 0.0047), fading(new THREE.MeshBasicMaterial({ color: 0xffffff }), 'ebikeScreen'), 'ebike-screens', 160, false);
  (async () => {
    const make = async (role, brand) => {
      const r = await riderGeometry(people, role, brand); if (!r) return null;
      const riderMat = new THREE.MeshStandardMaterial({ map: r.map, roughness: 0.85, alphaTest: 0.5 }); riderMat.userData.tinted = true; fading(riderMat, 'ebikeRider');
      const rider = {};
      for (const k of POSES) rider[k] = inst(r.poses[k], riderMat, `ebike-rider-${k}`, k === 'ride' ? MAX : MAXP);
      return { rider, bike: inst(scooter(brand), bikeMat, brand ? `ebike-courier-${brand}` : 'ebike-commuter'), helmet: inst(helmet(r.head), bikeMat, 'ebike-helmets'), phone: r.phone };
    };
    for (const role of roles) {
      if (!people || !people.avatars[role]) continue;
      try { const s = await make(role, null); if (s) commuters.push(s); } catch (err) { console.warn('ebike rider', role, err); }
      await new Promise((res) => setTimeout(res, 0));          // (a frame between avatars: no long stall at load)
    }
    if (people && people.avatars.p3) for (const brand of Object.keys(RIDER_BRANDS)) {
      try { const s = await make('p3', brand); if (s) couriers[brand] = s; } catch (err) { console.warn('ebike courier', brand, err); }
      await new Promise((res) => setTimeout(res, 0));
    }
    stats.ready = commuters.length > 0;
  })();

  // ---- couriers on foot: full people, made when first needed and kept (a few, by brand) ----
  const pool = [];                                            // { p, brand, phone, bags: { hatch, door }, rider: id | null }
  const assigned = new Map();                                 // rider id -> pool entry
  const phoneGeo = new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.3, metalness: 0.5 });
  const kraft = new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9 }), plastic = new THREE.MeshStandardMaterial({ color: 0xeeeee8, roughness: 0.55 });
  function footFor(brand) {
    let e = pool.find((q) => q.rider == null && q.brand === brand);
    if (!e && pool.length < 6 && people && people.avatars.p3) {
      const p = createPerson(people, 'p3'); dressRider(p, brand);
      p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      p.root.visible = false; group.add(p.root);
      const phone = new THREE.Mesh(phoneGeo, phoneMat); phone.visible = false; group.add(phone);
      // Linger's kraft paper bag (a cup carrier in it); a shop's white carrier bag, knotted
      const hatch = new THREE.Group(); hatch.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.15).translate(0, -0.13, 0), kraft));
      for (const dx of [-0.05, 0.05]) { const lidC = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.05, 10), plastic); lidC.position.set(dx, 0.02, 0); hatch.add(lidC); }
      const door = new THREE.Group(); door.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.2).translate(0, -0.15, 0), plastic), new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 5, 10), plastic));
      for (const b of [hatch, door]) { b.visible = false; b.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(b); }
      e = { p, brand, phone, bags: { hatch, door }, rider: null, yaw: 0, reach: 0 };
      pool.push(e);
    }
    return e || null;
  }
  function free(e) { e.rider = null; e.p.root.visible = false; e.phone.visible = false; e.bags.hatch.visible = e.bags.door.visible = false; e.p.setReach('L', null, 0); e.p.setPhoneHold(0); }

  // ---- talk ----
  const T = { gap: 0, last: new Map(), queue: [] };            // last: rider id -> what we last noticed (phone moment, phase)
  function say(line, at, opts = {}) {
    if (!talk) return;
    const o = Array.isArray(line) ? { who: line[0], zh: line[1], en: line[2] } : { who: 'rider', zh: line.t, en: line.en, lang: 'wuu', gloss: line.gloss };
    talk({ ...o, at, ...opts });
  }
  const _v = new THREE.Vector3(), _box = new THREE.Vector3();
  function footUpdate(e, r, eye, dt) {
    const f = r.foot, p = e.p, root = p.root, task = r.task;
    const show = !f.hidden && !(f.phase === 'on' && task.t > PICKUP.on * 0.75);
    root.visible = show;
    const bag = f.bag ? e.bags[task.stop.inside ? 'door' : 'hatch'] : null;
    e.bags.hatch.visible = bag === e.bags.hatch && show; e.bags.door.visible = bag === e.bags.door && show;
    if (!show) { e.phone.visible = false; return; }
    root.position.set(f.x, groundHeight(f.x, f.z, 1), f.z);
    let d = f.yaw - e.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    e.yaw += d * Math.min(1, dt * (f.speed > 0 ? 10 : 5)); root.rotation.y = e.yaw;
    const moving = f.speed > 0.1, atHatch = f.phase === 'wait' && !task.stop.inside;
    p.play(moving ? (f.speed > 2.05 ? 'jog' : 'walk') : atHatch ? 'phone' : 'idle', 0.25); p.setGait(moving ? f.speed : 0);
    const phoneUp = (moving && f.phoneUp && f.speed < 2.05) || atHatch;
    p.setPhoneHold(moving && f.phoneUp && f.speed < 2.05 ? 1 : 0);
    // loading: the left hand (the bag in it) into the box
    e.reach += ((f.load ? 1 : 0) - e.reach) * Math.min(1, dt * 6);
    if (e.reach > 0.01) { _box.set(r.x - Math.sin(r.yaw) * 0.6, groundHeight(r.x, r.z, 1) + HINGE.y + 0.02, r.z - Math.cos(r.yaw) * 0.6); p.setReach('L', _box, e.reach); } else p.setReach('L', null, 0);
    // a glance: at the hatch now and then; at you when you're close and they aren't rushing
    const dx = eye.x - f.x, dz = eye.z - f.z, near = dx * dx + dz * dz < 16;
    const look = atHatch && (performance.now() / 1000 + r.id) % 7 > 5.6 ? [task.stop.path[task.stop.path.length - 1].x, task.stop.path[task.stop.path.length - 1].z - 2] : near && !moving ? [eye.x, eye.z] : null;
    p.update(dt, look);
    e.phone.visible = phoneUp; if (phoneUp) holdPhone(e.phone, p, e.yaw);
    if (bag) { p.bones.L.getWorldPosition(bag.position); bag.position.y -= 0.04; bag.quaternion.setFromAxisAngle(_v.set(0, 1, 0), e.yaw); }
  }

  const _hp = new THREE.Vector3(), _m = new THREE.Matrix4(), _l = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _qq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _c = new THREE.Color(), _r = new THREE.Matrix4();
  const put = (I, m, color, fade) => { if (I.n >= I.max) return; I.mesh.setMatrixAt(I.n, m); I.mesh.instanceColor.setXYZ(I.n, color.r, color.g, color.b); I.fade.array[I.n] = fade; I.n++; };
  const all = () => [...commuters, ...Object.values(couriers)];
  return {
    group, stats,
    // the couriers on foot, for the crowd to walk round and the automatic doors to open for
    others() { const out = []; for (const e of pool) if (e.rider != null && e.p.root.visible) out.push({ x: e.p.root.position.x, z: e.p.root.position.z, vx: 0, vz: 0 }); return out; },
    update(riders, eye, dt = 1 / 60) {
      if (!commuters.length) return;
      const sets = all();
      for (const S of sets) { for (const k of POSES) S.rider[k].n = 0; S.bike.n = S.helmet.n = 0; }
      lids.n = phoneBody.n = phoneScreen.n = 0;
      const usePoses = poses(), cap = footMax();
      stats.poses.ride = stats.poses.call = stats.poses.look = 0; stats.phones = 0;
      T.gap -= dt;
      for (const [t, fn] of T.queue) if (t <= performance.now()) fn();
      T.queue = T.queue.filter(([t]) => t > performance.now());
      // on foot: let go of whoever's back on the bike (or gone); take on new pickups near you
      for (const e of pool) if (e.rider != null) { const r = riders[e.rider]; if (!r || !r.foot || r.state !== 'park') { assigned.delete(e.rider); free(e); } }
      let onFoot = 0;
      for (const r of riders) {
        if (!r.active || r.fade <= 0.01) continue;
        if (eye && Math.abs(r.x - eye.x) + Math.abs(r.z - eye.z) > FAR * 1.4) continue;
        const courier = r.kind.startsWith('courier'), brand = BRAND_OF[r.kind];
        const S = courier ? couriers[brand] || null : commuters[r.id % commuters.length];
        if (!S) continue;
        const dE = eye ? Math.hypot(r.x - eye.x, r.z - eye.z) : 999;
        // off the bike near you: a person
        let e = assigned.get(r.id) || null;
        if (!e && r.foot && r.foot.phase === 'off' && r.task.t < 0.25 && dE < FOOT_NEAR && assigned.size < cap) {
          e = footFor(brand); if (e) { e.rider = r.id; e.yaw = r.foot.yaw; assigned.set(r.id, e); }
        }
        let seat = r.fade;
        if (e && r.foot) {
          const t = r.task.t;
          seat *= r.foot.phase === 'off' ? Math.max(0, 1 - t / PICKUP.off) : r.foot.phase === 'on' ? Math.min(1, t / (PICKUP.on * 0.8)) : 0;
          footUpdate(e, r, eye, dt); onFoot++;
        }
        _p.set(r.x, groundHeight(r.x, r.z, 0.5), r.z); _qq.setFromAxisAngle(_up, r.yaw);
        _m.compose(_p, _qq, _s);
        // the seated rider, in the pose the phone puts them in
        let pose = 'ride';
        if (usePoses && r.phone === 'call') pose = 'call';
        else if (usePoses && r.phone === 'look' && r.v < 0.3) pose = 'look';
        if (seat > 0.01) {
          _c.set(courier ? 0xffffff : JACKETS[r.id % JACKETS.length]);
          put(S.rider[pose], _m, _c, seat); stats.poses[pose]++;
        }
        // the bike: its paint; the helmet (couriers': in the livery; commuters': the bike's colour), the box's lid
        _c.set(courier ? RIDER_BRANDS[brand].helmet : r.kind === 'shared' ? SHARED[r.id % 2] : BODIES[(r.id * 3) % BODIES.length]);
        put(S.bike, _m, _c, r.fade);
        if (seat > 0.01) put(S.helmet, _m, _c, seat);
        if (courier) {
          const open = e ? r.lid : 0;
          _l.compose(_hp.set(0, HINGE.y, HINGE.z), _qq.setFromAxisAngle(X, open * 1.75), _s); _r.multiplyMatrices(_m, _l);
          put(lids, _r, _c.set(LID[brand]), r.fade);
        }
        // the phone: in the hand, under the helmet, or in its clamp on the bars (couriers'), screen lit
        let pm = null;
        if (seat > 0.01 && pose !== 'ride') pm = S.phone[pose];
        else if (seat > 0.01 && r.phone === 'wedge') pm = S.phone.wedge;
        else if (courier) pm = MOUNT;
        if (pm && dE < 60) {
          _r.multiplyMatrices(_m, pm);
          put(phoneBody, _r, _c.set(0xffffff), r.fade);
          // (at the ear the screen goes dark, as phones do)
          const scr = pm === MOUNT ? SCREENS[0] : r.phone === 'look' ? SCREENS[1] : SCREENS[2];
          put(phoneScreen, _r, _c.copy(scr).multiplyScalar(pm === MOUNT || r.phone === 'look' ? 1 : 0.04), r.fade); stats.phones++;
        }
        // ---- what they say, near you ----
        if (!talk || !eye) continue;
        const last = T.last.get(r.id) || {}, at = [r.x, _p.y + 1.5, r.z];
        if (r.phoneN !== last.phoneN) {
          if (last.phoneN != null && dE < 14 && T.gap <= 0 && r.phone) {
            if (r.phone === 'look') { if (courier && Math.random() < 0.35) { say(pick(RIDER_APP), at, { phone: true, d: dE, speakerKind: 'app' }); T.gap = 7; } }
            else if (courier) { say(Math.random() < 0.12 ? pick(RIDER_WUU) : pick(RIDER_CALLS), at, { d: dE }); T.gap = 9; }
          }
          last.phoneN = r.phoneN;
        }
        const fph = r.foot ? r.foot.phase : null, f = r.foot;
        if (f && fph !== last.phase && e) {
          const fat = [f.x, _p.y + 1.6, f.z], d = Math.hypot(f.x - eye.x, f.z - eye.z);
          if (fph === 'wait' && !r.task.stop.inside && d < 12) { say(pick(RIDER_HATCH), fat, { d }); T.gap = 6; last.hurry = r.task.wait * 0.6; }
          if (fph === 'back' && !r.task.stop.inside && d < 12) {
            const h = r.task.stop.path[r.task.stop.path.length - 1];
            say(pick(BARISTA_HANDOVER), [h.x, 1.6, h.z - 1.0], { d, speakerKind: 'barista' });
            T.queue.push([performance.now() + 1500, () => say(pick(RIDER_THANKS), [f.x, 1.6, f.z], { d })]); T.gap = 6;
          }
          if (fph === 'back' && r.task.stop.inside && d < 14 && T.gap <= 0 && Math.random() < 0.5) { say(pick(RIDER_OUT), fat, { d }); T.gap = 8; }
          last.phase = fph;
        }
        if (!f) last.phase = null;
        if (f && fph === 'wait' && !r.task.stop.inside && last.hurry != null && r.task.t > last.hurry) {
          const d = Math.hypot(f.x - eye.x, f.z - eye.z);
          if (d < 10 && T.gap <= 0 && Math.random() < 0.6) { say(pick(RIDER_HURRY), [f.x, 1.6, f.z], { d }); T.gap = 6; }
          last.hurry = null;
        }
        // someone in the way: you, close in front of a moving rider
        if (r.v > 2.5 && dE < 3.2 && (last.passT || 0) < performance.now()) {
          const ahead = (eye.x - r.x) * Math.sin(r.yaw) + (eye.z - r.z) * Math.cos(r.yaw);
          if (ahead > 0.3 && ahead < 3.2) { say(pick(RIDER_PASS), at, { d: dE, urgent: true }); last.passT = performance.now() + 8000; }
        }
        T.last.set(r.id, last);
      }
      stats.onFoot = onFoot;
      let drawn = 0;
      for (const I of [lids, phoneBody, phoneScreen, ...sets.flatMap((S) => [...POSES.map((k) => S.rider[k]), S.bike, S.helmet])]) {
        const m = I.mesh; m.count = I.n; m.visible = I.n > 0; if (!I.n) continue;
        m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; I.fade.needsUpdate = true;
      }
      for (const S of sets) for (const k of POSES) drawn += S.rider[k].n;
      stats.drawn = drawn;
    },
  };
}
