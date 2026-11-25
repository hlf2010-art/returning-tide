// The Peace Hotel's sixth floor, up the guest lifts from the hall (world/interiors.js), at its real
// height inside the building: the exterior's storeys (bund.js genericBlock) put 6F at about 23.5 m.
//   - the lift lobby (two brass lifts, a console with flowers)
//   - the corridor south along the Bund side: a carpet runner, Art Deco sconces, old photographs of
//     the hotel, numbered doors. Its southern half is hoarded off: the hotel is being refitted
//   - room 612, the river-view room the front desk gave you: the key card opens it. A king bed with
//     a stepped walnut headboard, lamps, a desk under the television, an armchair at the window,
//     the bathroom (wash your face), a wardrobe. Two tall windows on the Bund: the road and the
//     promenade below, the river, Pudong lit up across it
//   - the bed: sleep (to the morning, at night) or lie down a while
// Layout follows the hotel's published descriptions (Bund-facing river-view rooms off a corridor),
// not its plans; furnishings are the game's own.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colliders, addFloor, addDynamicCollider } from './layout.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo, clockText } from '../engine/life.js';
import { logTime, slept } from '../engine/allot.js';
import { isYear } from '../engine/year.js';
import { passLine, hasFlat } from './career.js';

export const SIX = {
  y: 23.5, h: 3.3,
  lobby: { x0: -53.4, x1: -43.3, z0: -244, z1: -240.2 },
  corridor: { x0: -45.7, x1: -43.3, z0: -240.2, z1: -221 },
  room: { x0: -43.0, x1: -35.4, z0: -233, z1: -225.4, door: [-227.7, -226.7] },
  lifts: [-51.2, -47.6],
  arrive: { x: -49.4, z: -242.4, yaw: -2.3 },          // out of the lift, facing down the corridor
};
const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const bedFrom = (l) => (isYear(l) ? 18 * 60 + 30 : 21 * 60);      // in a year game he can turn in once the working day is over
const F = SIX.y, H = SIX.h;

// ---- the plan: one floor region, walls as colliders that stand only on this storey ----
const solid = (minX, maxX, minZ, maxZ, tag = 'wall') => { const c = { minX, maxX, minZ, maxZ, tag, y0: F - 0.3, y1: F + H }; colliders.push(c); return c; };
addFloor({ id: 'peace-6f', x0: -60, x1: -35.4, z0: -244, z1: -212.6, y: F });
{
  const { lobby: Lb, corridor: C, room: R } = SIX;
  solid(-60, Lb.x0, -244, C.z0);                       // west of the lobby
  solid(-60, C.x0, C.z0, -212.6);                      // the city-side rooms (611, 613, ...)
  solid(C.x1, -35.4, -244, R.z0);                      // 610 and the lobby's east side
  solid(C.x1, R.x0, R.z0, R.door[0]); solid(C.x1, R.x0, R.door[1], R.z1);   // 612's corridor wall, either side of its door
  solid(C.x1, -35.4, R.z1, -212.6);                    // 614 onward
  solid(C.x0, C.x1, C.z1, -212.6, 'hoarding');         // the hoarding across the corridor, and what's behind it
  // in the room: the bathroom, the bed, the desk, the armchair, the wardrobe
  solid(R.x0, -40.3, R.z0, -229.8);
  solid(-39.7, -37.5, R.z0, -230.85, 'furniture'); solid(-40.3, -39.7, R.z0, -232.45, 'furniture'); solid(-37.5, -36.95, R.z0, -232.45, 'furniture');
  solid(-40.25, -38.55, -226.05, R.z1, 'furniture');
  solid(-36.85, -36.0, -229.0, -228.15, 'furniture');
  solid(-42.85, -41.25, -226.0, R.z1, 'furniture');
}

const loader = new THREE.TextureLoader();
function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); return t; }
// carpet: deep teal ground, gold Art Deco fans in a half-drop repeat, a border line
const carpetTex = (rep) => canvasTex(512, 512, (x, w) => {
  x.fillStyle = '#13302e'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * w, 2, 2); }   // pile
  const fan = (cx, cy, r) => {
    x.strokeStyle = '#b8924a'; x.lineWidth = 4;
    for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(cx, cy, (r * k) / 3, Math.PI, 2 * Math.PI); x.stroke(); }
    for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); }
    x.fillStyle = '#5c1f1c'; x.beginPath(); x.arc(cx, cy, r * 0.18, Math.PI, 2 * Math.PI); x.fill();
  };
  for (const [cx, cy] of [[128, 180], [384, 180], [0, 436], [256, 436], [512, 436]]) fan(cx, cy, 92);
  x.strokeStyle = 'rgba(184,146,74,0.5)'; x.lineWidth = 2; x.strokeRect(4, 4, w - 8, w - 8);
}, rep);
// wallpaper: cream with a faint damask stripe
const paperTex = (rep) => canvasTex(256, 256, (x, w) => {
  x.fillStyle = '#e7d9bd'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(160,130,80,0.10)' : 'rgba(255,255,255,0.08)'; x.fillRect(i * 32, 0, 16, w); }
  x.strokeStyle = 'rgba(150,115,60,0.18)'; x.lineWidth = 2;
  for (let y = 16; y < w; y += 64) for (let c = 16; c < w; c += 64) { x.beginPath(); x.ellipse(c, y, 7, 14, 0, 0, Math.PI * 2); x.stroke(); }
}, rep);
// a framed photograph of the hotel's past: sepia, grain, a white mount
const photoTex = (seed) => canvasTex(256, 320, (x, w, h) => {
  x.fillStyle = '#f2ede2'; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 30, 0, h - 60); g.addColorStop(0, '#8a7558'); g.addColorStop(1, '#3b2f22'); x.fillStyle = g; x.fillRect(24, 28, w - 48, h - 90);
  x.fillStyle = 'rgba(30,22,14,0.75)';
  if (seed % 3 === 0) { x.fillRect(70, 120, 116, 110); x.beginPath(); x.moveTo(60, 122); x.lineTo(128, 50); x.lineTo(196, 122); x.fill(); }      // the green pyramid
  else if (seed % 3 === 1) { for (let i = 0; i < 6; i++) x.fillRect(40 + i * 30, 140 - (i % 3) * 22, 22, 90 + (i % 3) * 22); }                // the Bund front
  else { x.fillRect(50, 170, 156, 60); for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(70 + i * 30, 150, 10, 0, Math.PI * 2); x.fill(); } }  // a band
  for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(255,240,210,${Math.random() * 0.08})`; x.fillRect(24 + Math.random() * (w - 48), 28 + Math.random() * (h - 90), 1, 1); }
  x.fillStyle = '#5a4a36'; x.font = '600 15px "Noto Serif SC", serif'; x.textAlign = 'center'; x.fillText(['華懋飯店 · 1929', '外灘 · 1930s', '爵士樂隊 · 1980'][seed % 3], w / 2, h - 30);
});
const signTex = (lines, { bg = '#f1ece1', fg = '#2a2620', w = 768, h = 384 } = {}) => canvasTex(w, h, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([t, size, col], i) => { x.fillStyle = col || fg; x.font = `600 ${size}px "Noto Sans SC", sans-serif`; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1)); });
});
// drapes: vertical folds, light and shade
const drapeTex = (base) => canvasTex(256, 64, (x, w, h) => {
  for (let i = 0; i < w; i++) { const k = 0.72 + 0.28 * Math.sin(i / w * Math.PI * 12) ** 2; const c = new THREE.Color(base).multiplyScalar(k); x.fillStyle = `#${c.getHexString()}`; x.fillRect(i, 0, 1, h); }
});

export function createHotelUpper({ scene, hud, audio, getLife, save, player, travel }) {
  const group = new THREE.Group(); group.name = 'peace-6f'; scene.add(group);
  const lights = [];
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.38, metalness: 0.05, emissive: 0x080402 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.28, metalness: 1, envMapIntensity: 1.4 });
  const paper = new THREE.MeshStandardMaterial({ map: paperTex([3, 1]), roughness: 0.85, emissive: 0x2a1c0e, emissiveIntensity: 1 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf1e6d0, roughness: 0.9, emissive: 0x3a2a18, side: THREE.DoubleSide });
  const linen = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.85, emissive: 0x1a1612 });
  const lampLit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, 0.85) });
  const glass = new THREE.MeshStandardMaterial({ color: 0xa9bcc4, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const paint = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.6 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x5c1f1c, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.25, metalness: 0.4 });
  const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; group.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
  const rbox = (w, h, d, r, mat, x, y, z, ry = 0) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z, ry);
  function panel(ax, az, bx, bz, y0, y1, mat, cx, cz) {
    const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, y1 - y0), mat, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    const nx = -(bz - az) / len, nz = (bx - ax) / len, toward = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1;
    m.rotation.y = Math.atan2(nx * toward, nz * toward);
    if (mat.map) { m.material = mat.clone(); m.material.map = mat.map.clone(); m.material.map.repeat.set(len / 1.6, (y1 - y0) / 1.6); m.material.map.needsUpdate = true; }
    return m;
  }
  // a wall facing (cx, cz) with openings [[t0, t1, sill, head]] along it: walnut skirting, papered above
  function walls(ax, az, bx, bz, cx, cz, openings = []) {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, at = (t) => [ax + ux * t, az + uz * t];
    let t0 = 0;
    for (const [o0, o1, sill = 0, head = 2.2] of [...openings.sort((a, b) => a[0] - b[0]), [len, len, 0, 0]]) {
      if (o0 > t0) { const [x0, z0] = at(t0), [x1, z1] = at(o0); panel(x0, z0, x1, z1, F, F + 0.16, walnut, cx, cz); panel(x0, z0, x1, z1, F + 0.16, F + H, paper, cx, cz); }
      if (o1 > o0 && o1 <= len && o0 < len) {
        const [x0, z0] = at(o0), [x1, z1] = at(o1);
        if (head < H) panel(x0, z0, x1, z1, F + head, F + H, paper, cx, cz);
        if (sill > 0) { panel(x0, z0, x1, z1, F, F + 0.16, walnut, cx, cz); panel(x0, z0, x1, z1, F + 0.16, F + sill, paper, cx, cz); }
      }
      t0 = o1;
    }
  }
  const floorRect = (x0, x1, z0, z1, mat) => add(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat, (x0 + x1) / 2, F + 0.003, (z0 + z1) / 2, 0, -Math.PI / 2);
  const ceilRect = (x0, x1, z0, z1, y = F + H) => add(new THREE.PlaneGeometry(x1 - x0, z1 - z0), ceilMat, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, Math.PI / 2);
  const { lobby: Lb, corridor: C, room: R } = SIX;

  // ================= the lift lobby and the corridor =================
  const parquet = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.35, metalness: 0.02 });
  floorRect(Lb.x0, Lb.x1, Lb.z0, Lb.z1, parquet); floorRect(C.x0, C.x1, C.z0, C.z1, parquet);
  const runner = new THREE.MeshStandardMaterial({ map: carpetTex([1, 9]), roughness: 0.95 });
  add(new THREE.PlaneGeometry(1.7, C.z1 - C.z0 + 3.4), runner, (C.x0 + C.x1) / 2, F + 0.008, (C.z0 + C.z1) / 2 - 1.7, 0, -Math.PI / 2);
  ceilRect(Lb.x0, Lb.x1, Lb.z0, Lb.z1); ceilRect(C.x0, C.x1, C.z0, C.z1);
  const lcx = (Lb.x0 + Lb.x1) / 2, lcz = (Lb.z0 + Lb.z1) / 2, ccx = (C.x0 + C.x1) / 2;
  walls(Lb.x1, Lb.z0, Lb.x0, Lb.z0, lcx, lcz, SIX.lifts.map((x) => [Lb.x1 - x - 0.75, Lb.x1 - x + 0.75, 0, 2.5]));   // north, the lifts
  walls(Lb.x0, Lb.z0, Lb.x0, Lb.z1, lcx, lcz);
  walls(Lb.x0, Lb.z1, C.x0, Lb.z1, lcx, lcz);
  walls(Lb.x1, Lb.z1, Lb.x1, Lb.z0, lcx, lcz);
  // corridor: west wall (city-side rooms), east wall (the river rooms, 612's door open), the hoarding
  walls(C.x0, C.z0, C.x0, C.z1, ccx, -230);
  walls(C.x1, C.z0, C.x1, C.z1, ccx, -230, [[R.door[0] - C.z0, R.door[1] - C.z0, 0, 2.2]]);
  // 612's doorway through the wall's thickness: threshold, reveals, head
  floorRect(C.x1, R.x0, R.door[0], R.door[1], walnut);
  for (const z of R.door) panel(C.x1, z, R.x0, z, F, F + 2.2, paint, C.x1, (R.door[0] + R.door[1]) / 2);
  add(new THREE.PlaneGeometry(R.x0 - C.x1, R.door[1] - R.door[0]), paint, (C.x1 + R.x0) / 2, F + 2.2, (R.door[0] + R.door[1]) / 2, 0, Math.PI / 2);
  // the lifts: brass doors, a floor dial above each, a call button
  const liftDoors = [];
  for (const x of SIX.lifts) {
    const l = box(0.72, 2.5, 0.06, brass, x - 0.37, F, Lb.z0 + 0.04), r = box(0.72, 2.5, 0.06, brass, x + 0.37, F, Lb.z0 + 0.04);
    liftDoors.push({ l, r, x });
    box(1.7, 0.1, 0.1, walnut, x, F + 2.5, Lb.z0 + 0.06);
    add(new THREE.CircleGeometry(0.24, 24, 0, Math.PI), brass, x, F + 2.82, Lb.z0 + 0.02);
    add(new THREE.CircleGeometry(0.035, 12), lampLit, x + 1.0, F + 1.1, Lb.z0 + 0.03);
  }
  // a console with flowers between the lifts, a mirror over it
  rbox(1.1, 0.82, 0.4, 0.02, walnut, -49.4, F, Lb.z0 + 0.25);
  add(new THREE.CylinderGeometry(0.1, 0.07, 0.28, 16), brass, -49.4, F + 0.96, Lb.z0 + 0.25);
  for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 8, 6), new THREE.MeshStandardMaterial({ color: [0xf2efe6, 0xe9b8c0, 0xd4dcb0][i % 3], roughness: 0.8 }), -49.4 + (Math.random() - 0.5) * 0.3, F + 1.15 + Math.random() * 0.18, Lb.z0 + 0.25 + (Math.random() - 0.5) * 0.18);
  // sconces down the corridor, photographs between them
  const sconce = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, F + 1.9, z); g.rotation.y = ry; const f = new THREE.Mesh(new THREE.CircleGeometry(0.2, 3, -Math.PI / 6, Math.PI / 3 * 2), lampLit); f.rotation.z = Math.PI; f.position.z = 0.04; g.add(f); const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.04), brass); b.position.set(0, 0.08, 0.02); g.add(b); group.add(g); };
  for (const z of [-238.4, -233.4, -228.4, -223.6]) { sconce(C.x0 + 0.02, z, Math.PI / 2); }
  for (const z of [-238.4, -233.4]) sconce(C.x1 - 0.02, z, -Math.PI / 2);
  sconce(Lb.x0 + 0.02, lcz, Math.PI / 2);
  [-235.9, -230.9, -226.1].forEach((z, i) => { add(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: photoTex(i), roughness: 0.7, emissive: 0x201810, emissiveMap: null }), C.x0 + 0.03, F + 1.55, z, Math.PI / 2); box(0.03, 0.58, 0.48, walnut, C.x0 + 0.01, F + 1.26, z); });
  // doors: walnut, brass numbers; 612 is the one that opens
  const plate = (n, x, z, ry) => add(new THREE.PlaneGeometry(0.26, 0.12), new THREE.MeshBasicMaterial({ map: signTex([[String(n), 230]], { bg: '#20170f', fg: '#d9b46a', w: 512, h: 240 }) }), x, F + 1.62, z, ry);
  for (const [n, z] of [[611, -237.2], [613, -231.2], [615, -225.2]]) { box(0.06, 2.2, 1.0, walnut, C.x0 + 0.03, F, z); plate(n, C.x0 + 0.07, z - 0.75, Math.PI / 2); add(new THREE.SphereGeometry(0.03, 10, 8), brass, C.x0 + 0.08, F + 1.0, z + 0.38); }
  for (const [n, z] of [[610, -236.6], [614, -223.0]]) { box(0.06, 2.2, 1.0, walnut, C.x1 - 0.03, F, z); plate(n, C.x1 - 0.07, z + 0.75, -Math.PI / 2); add(new THREE.SphereGeometry(0.03, 10, 8), brass, C.x1 - 0.08, F + 1.0, z - 0.38); }
  { const s = add(new THREE.PlaneGeometry(0.26, 0.12), new THREE.MeshBasicMaterial({ map: signTex([['612', 230]], { bg: '#20170f', fg: '#d9b46a', w: 512, h: 240 }) }), C.x1 - 0.04, F + 1.62, R.door[1] + 0.32, -Math.PI / 2); s.renderOrder = 1; }
  // 612's door: a leaf hinged at its south edge, swinging into the room; a card reader
  const hinge = new THREE.Group(); hinge.position.set(R.x0 - 0.12, F, R.door[1]); group.add(hinge);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.2, R.door[1] - R.door[0]), walnut); leaf.position.set(0, 1.1, -(R.door[1] - R.door[0]) / 2); hinge.add(leaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), brass); knob.position.set(-0.05, 1.0, -(R.door[1] - R.door[0]) + 0.1); hinge.add(knob);
  const reader = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.08), dark); reader.position.set(C.x1 - 0.04, F + 1.1, R.door[1] + 0.18); group.add(reader);
  const readerLed = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.2, 0.15) })); readerLed.position.set(C.x1 - 0.052, F + 1.15, R.door[1] + 0.18); readerLed.rotation.y = -Math.PI / 2; group.add(readerLed);
  const doorCol = addDynamicCollider('door'); Object.assign(doorCol, { minX: C.x1, maxX: R.x0, minZ: R.door[0], maxZ: R.door[1], y0: F - 0.3, y1: F + H });
  // the hoarding: white boards across the corridor, a printed notice
  box(C.x1 - C.x0, H, 0.06, paint, ccx, F, C.z1 - 0.03);
  add(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ map: signTex([['施工中 · 敬请谅解', 64, '#1f3d36'], ['六楼南侧客房改造 2026.9 – 2027.3', 34], ['Refurbishment in progress', 40, '#1f3d36'], ['We apologise for any inconvenience', 30]]), roughness: 0.6, emissive: 0x191512 }), ccx, F + 1.5, C.z1 - 0.065, Math.PI);
  for (const [x, z] of [[lcx, lcz], [ccx, -236], [ccx, -226]]) lights.push({ x, y: F + H - 0.3, z, intensity: 6, distance: 8, color: new THREE.Color(1.0, 0.8, 0.56) });

  // ================= room 612 =================
  const rcx = (R.x0 + R.x1) / 2, rcz = (R.z0 + R.z1) / 2;
  const carpet = new THREE.MeshStandardMaterial({ map: carpetTex([5, 5]), roughness: 0.95, color: 0xd8d0c4 });
  floorRect(R.x0, R.x1, R.z0, R.z1, carpet);
  ceilRect(R.x0, R.x1, R.z0, R.z1);
  box(R.x1 - R.x0 - 1.0, 0.04, R.z1 - R.z0 - 1.0, lampLit, rcx, F + H - 0.2, rcz).material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.42, 0.28) });   // the cove's glow
  ceilRect(R.x0 + 0.5, R.x1 - 0.5, R.z0 + 0.5, R.z1 - 0.5, F + H - 0.16);
  walls(R.x0, R.z0, R.x1, R.z0, rcx, rcz);                                                        // north (the headboard)
  walls(R.x1, R.z1, R.x0, R.z1, rcx, rcz);                                                        // south (desk, television)
  walls(R.x0, R.z1, R.x0, R.z0, rcx, rcz, [[R.z1 - R.door[1], R.z1 - R.door[0], 0, 2.2]]);        // west (the door)
  const WIN = [[-232.2, -230.6], [-228.4, -226.8]], SILL = 0.55, HEAD = 2.95;
  walls(R.x1, R.z0, R.x1, R.z1, rcx, rcz, WIN.map(([a, b]) => [a - R.z0, b - R.z0, SILL, HEAD]));     // east: the windows on the Bund
  for (const [a, b] of WIN) {
    const zc = (a + b) / 2, w = b - a, gx = -34.75;
    // deep reveals (the old walls are thick), the glass, a painted frame with a transom
    panel(R.x1, a, gx, a, F + SILL, F + HEAD, paint, R.x1, zc); panel(R.x1, b, gx, b, F + SILL, F + HEAD, paint, R.x1, zc);
    add(new THREE.PlaneGeometry(R.x1 - gx, w), paint, (R.x1 + gx) / 2, F + HEAD, zc, 0, Math.PI / 2);
    add(new THREE.PlaneGeometry(R.x1 - gx + 0.1, w), walnut, (R.x1 + gx) / 2 - 0.05, F + SILL + 0.002, zc, 0, -Math.PI / 2);
    add(new THREE.PlaneGeometry(w, HEAD - SILL), glass, gx, F + (SILL + HEAD) / 2, zc, -Math.PI / 2);
    box(0.05, HEAD - SILL, 0.05, paint, gx - 0.02, F + SILL, zc); box(0.05, 0.05, w, paint, gx - 0.02, F + HEAD - 0.55, zc);
    // drapes either side, a sheer half drawn
    for (const s of [-1, 1]) add(new THREE.PlaneGeometry(0.5, H - 0.3), new THREE.MeshStandardMaterial({ map: drapeTex(0x7a5a2a), roughness: 0.9, side: THREE.DoubleSide, emissive: 0x140c04 }), R.x1 - 0.12, F + (H - 0.3) / 2, zc + s * (w / 2 + 0.22), -Math.PI / 2);
    add(new THREE.PlaneGeometry(w * 0.5, HEAD - SILL + 0.2), new THREE.MeshStandardMaterial({ color: 0xf6f2e8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }), R.x1 - 0.18, F + (SILL + HEAD) / 2, a + w * 0.25, -Math.PI / 2);
    box(0.06, 0.06, w + 1.4, brass, R.x1 - 0.14, F + H - 0.3, zc);
  }
  // the bathroom: its walls into the room, a door left ajar onto the light
  const bx0 = R.x0, bx1 = -40.3, bz1 = -229.8;
  panel(bx0, bz1, bx1, bz1, F, F + H, paper, rcx, rcz); panel(bx1, bz1, bx1, R.z0, F, F + H, paper, rcx, rcz);
  box(0.82, 2.15, 0.05, paint, -41.6, F, bz1 + 0.03);
  add(new THREE.PlaneGeometry(0.06, 2.1), lampLit, -41.17, F + 1.06, bz1 + 0.06);                                  // light at the crack of the door
  // the bed: a walnut base, stepped Art Deco headboard with brass lines, white linen, a gold runner
  {
    const bxc = -38.6;
    rbox(2.0, 0.38, 2.05, 0.03, walnut, bxc, F, R.z0 + 1.15);
    rbox(1.96, 0.26, 2.0, 0.08, linen, bxc, F + 0.38, R.z0 + 1.15);
    rbox(2.04, 0.1, 1.5, 0.05, linen, bxc, F + 0.6, R.z0 + 1.42);
    box(2.08, 0.02, 0.42, new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.6 }), bxc, F + 0.7, R.z0 + 1.7);
    for (const dx of [-0.48, 0.48]) { rbox(0.7, 0.18, 0.4, 0.08, linen, bxc + dx, F + 0.62, R.z0 + 0.38); rbox(0.66, 0.16, 0.36, 0.08, linen, bxc + dx, F + 0.72, R.z0 + 0.5).rotation.x = -0.35; }
    box(2.2, 1.3, 0.08, walnut, bxc, F, R.z0 + 0.06); box(1.4, 0.22, 0.08, walnut, bxc, F + 1.3, R.z0 + 0.06); box(0.7, 0.16, 0.08, walnut, bxc, F + 1.52, R.z0 + 0.06);
    for (const dx of [-0.35, 0, 0.35]) box(0.02, 1.0, 0.02, brass, bxc + dx, F + 0.42, R.z0 + 0.11);
    // a welcome card on the pillow
    add(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshStandardMaterial({ map: signTex([['欢迎回来', 100], ['纪先生', 80]], { bg: '#f7f3ea', fg: '#6b5428', w: 512, h: 340 }), roughness: 0.8 }), bxc + 0.1, F + 0.73, R.z0 + 1.0, 0.2, -Math.PI / 2);
    // nightstands, lamps
    for (const nx of [-40.0, -37.22]) {
      rbox(0.55, 0.56, 0.48, 0.02, walnut, nx, F, R.z0 + 0.3);
      add(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 16), brass, nx, F + 0.71, R.z0 + 0.28);
      add(new THREE.CylinderGeometry(0.13, 0.17, 0.22, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.1, 0.78), side: THREE.DoubleSide }), nx, F + 0.97, R.z0 + 0.28);
    }
    lights.push({ x: -38.6, y: F + 1.2, z: R.z0 + 0.6, intensity: 4.5, distance: 6, color: new THREE.Color(1.0, 0.78, 0.52) });
  }
  // desk under the television, a chair, a tea tray; the wardrobe by the door
  rbox(1.7, 0.04, 0.6, 0.01, walnut, -39.4, F + 0.74, R.z1 - 0.32);
  for (const dx of [-0.78, 0.78]) box(0.06, 0.74, 0.56, walnut, -39.4 + dx, F, R.z1 - 0.32);
  box(1.3, 0.75, 0.04, dark, -39.4, F + 1.25, R.z1 - 0.04);                                          // the television (off)
  { const c = new THREE.Group(); c.position.set(-39.4, F, R.z1 - 0.95); group.add(c);
    const part = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.03), leather); m.position.set(x, y + h / 2, z); c.add(m); };
    part(0.48, 0.08, 0.46, 0, 0.44, 0); part(0.46, 0.5, 0.06, 0, 0.52, 0.22); for (const dx of [-0.2, 0.2]) for (const dz of [-0.19, 0.19]) part(0.04, 0.44, 0.04, dx, 0, dz); }
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 18), new THREE.MeshStandardMaterial({ color: 0xd8d8dc, metalness: 1, roughness: 0.2 }), -39.9, F + 0.88, R.z1 - 0.32);
  for (const dx of [0, 0.14]) add(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 14), linen, -39.55 + dx, F + 0.82, R.z1 - 0.3);
  rbox(1.6, 2.2, 0.6, 0.02, walnut, -42.05, F, R.z1 - 0.31);
  box(0.01, 2.0, 0.6, brass, -42.05, F + 0.1, R.z1 - 0.62).scale.set(1, 1, 0.02);
  // the armchair at the window, a side table
  { const g = new THREE.Group(); g.position.set(-36.4, F, -228.6); g.rotation.y = Math.PI / 2 + 0.5; group.add(g);
    const part = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.35), leather); m.position.set(px, py + h / 2, pz); g.add(m); };
    part(0.66, 0.42, 0.66, 0, 0, 0.04); part(0.66, 0.48, 0.18, 0, 0.36, -0.28); part(0.14, 0.26, 0.64, -0.32, 0.38, 0.02); part(0.14, 0.26, 0.64, 0.32, 0.38, 0.02); }
  add(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 24), walnut, -36.5, F + 0.55, -230.0); add(new THREE.CylinderGeometry(0.03, 0.05, 0.55, 10), brass, -36.5, F + 0.27, -230.0);
  // the pendant: a frosted glass bowl on brass rods
  add(new THREE.SphereGeometry(0.32, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.05, 0.8), side: THREE.DoubleSide }), rcx, F + H - 0.55, rcz);
  for (const a of [0, 2.1, 4.2]) { const r = add(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 4), brass, rcx + Math.cos(a) * 0.2, F + H - 0.36, rcz + Math.sin(a) * 0.2); r.rotation.z = 0; }
  lights.push({ x: rcx, y: F + H - 0.5, z: rcz, intensity: 6, distance: 8, color: new THREE.Color(1.0, 0.82, 0.58) });
  group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; if (!o.material.transparent && !o.material.isMeshBasicMaterial) o.castShadow = true; } });

  // ================= what happens =================
  const S = { door: 0, doorWant: 0, doorT: 0, liftOpen: 0, said: {} };
  const L0 = () => getLife();
  const say = (who, zh, en, secs = 3) => hud.bark({ speaker: who, text: { zh, en }, seconds: secs });
  const here = (pp) => pp.y > F - 1 && pp.y < F + 3;
  const inRoom = (pp) => here(pp) && pp.x > R.x0 && pp.z > R.z0 && pp.z < R.z1;
  const targets = [
    { id: 'uLift', x: (SIX.lifts[0] + SIX.lifts[1]) / 2, y: F + 1.4, z: Lb.z0 + 0.2, reach: 3.0 },
    { id: 'uDoorOut', x: C.x1 - 0.05, y: F + 1.1, z: (R.door[0] + R.door[1]) / 2, reach: 2.0 },
    { id: 'uDoorIn', x: R.x0 + 0.1, y: F + 1.1, z: (R.door[0] + R.door[1]) / 2, reach: 2.0 },
    { id: 'uBed', x: -38.6, y: F + 0.7, z: R.z0 + 1.3, reach: 2.6 },
    { id: 'uWindow', x: R.x1 - 0.2, y: F + 1.6, z: -231.4, reach: 2.6 },          // each of the two windows
    { id: 'uWindowB', x: R.x1 - 0.2, y: F + 1.6, z: -227.6, reach: 2.6 },
    { id: 'uBath', x: -41.6, y: F + 1.2, z: bz1 + 0.05, reach: 1.9 },
    { id: 'uHoard', x: ccx, y: F + 1.5, z: C.z1 - 0.1, reach: 2.6 },
    { id: 'u610', x: C.x1 - 0.05, y: F + 1.2, z: -236.6, reach: 1.6 },
  ];
  const PROMPT = {
    uLift: () => [T('电梯', 'Lifts'), T('下楼到大堂', 'Down to the lobby')],
    uDoorOut: () => [T('612 房', 'Room 612'), S.door > 0.5 ? T('关门', 'Close') : T('刷房卡', 'Key card')],
    uDoorIn: () => [T('房门', 'Door'), S.door > 0.5 ? T('关门', 'Close') : T('开门', 'Open')],
    uBed: () => { const tod = stamp(L0()) % 1440; return [T('床', 'Bed'), tod >= bedFrom(L0()) || tod < 5 * 60 ? T('睡到早上', 'Sleep till morning') : T('躺一会儿', 'Lie down a while')]; },
    uWindow: () => [T('窗外', 'The window'), T('看看', 'Look out')],
    uWindowB: () => [T('窗外', 'The window'), T('看看', 'Look out')],
    uBath: () => [T('卫生间', 'Bathroom'), T('洗把脸', 'Wash your face')],
    uHoard: () => [T('围挡', 'Hoarding'), T('看告示', 'Read the notice')],
    u610: () => [T('610 房', 'Room 610'), T('敲门', 'Knock')],
  };
  function setDoor(open) { S.doorWant = open ? 1 : 0; S.doorT = open ? 8 : 0; audio && audio.cue && audio.cue(open ? 'door' : 'bump', 0, 0.25); }
  function interact(id) {
    const l = L0();
    if (id === 'uLift') {
      travel(async () => { player.teleport(-48, -241.6, Math.PI, 0.02); setDoor(false); S.door = 0; }, { line: T('一楼 · 大堂', 'Ground floor · the lobby') });
      audio && audio.cue && audio.cue('ping', 1.3, 0.5);
    } else if (id === 'uDoorOut') {
      if (S.door > 0.5) setDoor(false);
      else if (hasFlat(l)) { hud.toast(T('房卡失效了：你已经退房，搬去了租的房子（快马 → “我的住处”）。', 'The card no longer works: you have checked out and moved to the flat you rent (Kuaima → "My flat").'), 4); audio && audio.cue && audio.cue('bump', 0, 0.3); }
      else if (!l.flags.hotelKey) { hud.toast(T('需要房卡（在前台取）', 'It needs a key card (from the front desk)'), 2.6); audio && audio.cue && audio.cue('bump', 0, 0.3); }
      else { readerLed.material.color.setRGB(0.2, 1.6, 0.4); audio && audio.cue && audio.cue('ping', 0, 0.3); setDoor(true); if (!S.said.room) { S.said.room = true; l.flags.room612 = true; if (l.flags.room612At == null) l.flags.room612At = stamp(l); save && save(); } }
    } else if (id === 'uDoorIn') setDoor(S.door < 0.5);
    else if (id === 'uBed') {
      const now = stamp(l), tod = now % 1440, night = tod >= bedFrom(l) || tod < 5 * 60;
      const until = night ? (tod >= 5 * 60 ? now - tod + 1440 + 7 * 60 + 30 : now - tod + 7 * 60 + 30) : now + 40;
      const gap = night ? passLine(l, until, getLang()) : '';                           // a year game: weeks can pass in this night (world/career.js)
      travel(async () => { slept(l, (until - now) / 60); skipTo(l, until); if (player.stamina) { player.stamina.energy = 1; player.stamina.winded = 0; } save && save(); },
        { line: gap || (night ? T(`一夜好眠 · ${clockText(until)}`, `A good night's sleep · ${clockText(until)}`) : T(`躺了一会儿 · ${clockText(until)}`, `You lie down a while · ${clockText(until)}`)), hold: gap ? 2400 : night ? 1600 : 900 });
    } else if (id === 'uWindow' || id === 'uWindowB') {
      const lines = [
        ['江对面，东方明珠和陆家嘴的灯都亮着。楼下是外滩的人，一直到江边。', 'Across the river, the Pearl Tower and Lujiazui all lit. Below, people along the Bund all the way to the water.'],
        ['一艘游船慢慢地从北边开过来，灯一层一层的。', 'A cruise boat comes slowly down from the north, lit deck by deck.'],
        ['从这儿看，中山东一路的车流像一条亮着的河。', 'From up here the traffic on Zhongshan Road is a river of its own.'],
      ][(S.windowN = ((S.windowN ?? -1) + 1) % 3)];
      hud.toast(T(lines[0], lines[1]), 4.2);
    } else if (id === 'uBath') { travel(async () => { skipTo(l, stamp(l) + 6); }, { line: T('冷水洗了把脸', 'Cold water on your face'), down: 400, hold: 300, up: 500 }); }
    else if (id === 'uHoard') hud.toast(T('施工中，六楼南侧客房改造，2026年9月至2027年3月。', 'Refurbishment in progress: 6F south rooms, September 2026 to March 2027.'), 3.6);
    else if (id === 'u610') { audio && audio.cue && audio.cue('bump', 0, 0.4); say(T('门里', 'Through the door'), '……谁啊？我们没叫客房服务。', "...Who is it? We didn't order room service.", 2.8); }
    return true;
  }
  // from the hall: the lift up (world/interiors.js calls this)
  function goUp() {
    travel(async () => { player.teleport(SIX.arrive.x, SIX.arrive.z, SIX.arrive.yaw, 0.02, F); S.liftOpen = 1; }, { line: T('六楼', 'Sixth floor') });
    audio && audio.cue && audio.cue('ping', 1.3, 0.5);
  }
  return {
    group, lights, goUp,
    get here() { return here(player.body); },
    get inRoom() { return inRoom(player.body); },
    candidates() { return here(player.body) ? targets.map((t) => ({ ...t, cone: 0.6 })) : []; },
    prompt(id) { const p = PROMPT[id]; if (!p) return null; const [target, action] = p(); return { target, action }; },
    owns(id) { return targets.some((t) => t.id === id); },
    interact,
    update(dt, pp) {
      group.visible = pp.y > F - 6;                                          // only drawn when you're up here
      if (!group.visible) return;
      // 612's door: swings in, closes itself once you're through
      S.doorT = Math.max(0, S.doorT - dt);
      const inDoorway = Math.abs(pp.x - (R.x0 - 0.15)) < 0.7 && pp.z > R.door[0] - 0.4 && pp.z < R.door[1] + 0.4;
      if (S.doorWant && S.doorT <= 0 && !inDoorway) { S.doorWant = 0; audio && audio.cue && audio.cue('bump', 0, 0.2); readerLed.material.color.setRGB(1.6, 0.2, 0.15); }
      S.door += (S.doorWant - S.door) * Math.min(1, dt * 3.2);
      hinge.rotation.y = -S.door * 1.45;
      if (S.door > 0.35) Object.assign(doorCol, { minX: 1e6, maxX: 1e6 }); else Object.assign(doorCol, { minX: C.x1, maxX: R.x0 });
      // the lift you came up in: doors open, then close behind you
      S.liftOpen = Math.max(0, S.liftOpen - dt * 0.25);
      const o = Math.min(1, S.liftOpen * 3) * 0.7;
      for (const d of liftDoors) { const k = d.x === SIX.lifts[0] ? 0 : o; d.l.position.x = d.x - 0.37 - k; d.r.position.x = d.x + 0.37 + k; }
    },
  };
}
