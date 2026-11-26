// The Peace Hotel's sixth floor, up the guest lifts from the hall (world/interiors.js), at its real
// height inside the building: the exterior's storeys (bund.js genericBlock) put 6F at about 23.5 m.
//   - the lift lobby (two brass lifts, a console with flowers)
//   - the corridor south along the Bund side: a carpet runner, Art Deco sconces, old photographs of
//     the hotel, numbered doors. Its southern half is hoarded off: the hotel is being refitted
//   - room 612, the river-view room the front desk gave you: the key card opens it. Built in
//     world/room612.js after what guests describe of the hotel's rooms: herringbone parquet at the
//     entry, a dark-gold carpet, a leather headboard, pink glass lamps, a walnut desk, a corduroy
//     sofa, the black-and-white marble bathroom with a free-standing tub (wash your face). Two tall
//     windows on the Bund: the road and the promenade below, the river, Pudong lit up across it
//   - the bed: sleep (to the morning, at night) or lie down a while
// Layout follows the hotel's published descriptions (Bund-facing river-view rooms off a corridor),
// not its plans; furnishings are the game's own.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { colliders, addFloor, addDynamicCollider } from './layout.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo, clockText, pay } from '../engine/life.js';
import { logTime, slept } from '../engine/allot.js';
import { isYear, dateOf } from '../engine/year.js';
import { rng } from './canvas.js';
import { passLine, hasFlat } from './career.js';
import { ROOM, room612Colliders, buildRoom612 } from './room612.js';

export const SIX = {
  y: 23.5, h: 3.3,
  lobby: { x0: -53.4, x1: -43.3, z0: -244, z1: -240.2 },
  corridor: { x0: -45.7, x1: -43.3, z0: -240.2, z1: -221 },
  room: ROOM,
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
  // in the room: the bathroom's walls, the furniture (world/room612.js)
  room612Colliders(solid);
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
// wallpaper: the corridors' green (as guests describe them: green walls, dark wooden doors, openwork sconces), a faint
// damask stripe
const paperTex = (rep) => canvasTex(256, 256, (x, w) => {
  x.fillStyle = '#3e5a48'; x.fillRect(0, 0, w, w);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? 'rgba(20,34,26,0.16)' : 'rgba(255,255,240,0.05)'; x.fillRect(i * 32, 0, 16, w); }
  x.strokeStyle = 'rgba(190,170,110,0.16)'; x.lineWidth = 2;
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
// tomorrow in Shanghai, for the turndown card and the television: the month's usual range, a day's own swing, and
// skies that keep to what the game's weather can show (no rain promised)
const CLIMATE = [[8, 1], [10, 3], [14, 6], [20, 11], [25, 16], [28, 20], [32, 25], [32, 25], [28, 21], [23, 16], [17, 10], [11, 3]];   // mean high, low (°C)
const SKIES = [['晴', 'Sunny', 'sun'], ['多云', 'Cloudy', 'cloud'], ['晴转多云', 'Sunny, then cloudy', 'suncloud'], ['阴', 'Overcast', 'cloud']];
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function forecast(L) {
  const t = dateOf(L), d = new Date(Date.UTC(t.y, t.m - 1, t.d) + 86400000), m = d.getUTCMonth(), r = rng(d.getUTCFullYear() * 400 + m * 31 + d.getUTCDate());
  const [hi, lo] = CLIMATE[m], sky = SKIES[Math.floor(r() * SKIES.length)], dh = Math.round((r() - 0.5) * 4), dl = Math.round((r() - 0.5) * 4);
  return { m: m + 1, d: d.getUTCDate(), w: d.getUTCDay(), hi: hi + dh, lo: Math.min(lo + dl, hi + dh - 4), zh: sky[0], en: sky[1], icon: sky[2] };
}
function skyIcon(x, cx, cy, r, icon) {
  if (icon !== 'cloud') { x.fillStyle = '#f2b632'; x.beginPath(); x.arc(cx - (icon === 'suncloud' ? r * 0.35 : 0), cy - (icon === 'suncloud' ? r * 0.3 : 0), r * 0.55, 0, 6.283); x.fill(); }
  if (icon !== 'sun') { x.fillStyle = '#c9d1d8'; for (const [dx, dy, rr] of [[-0.3, 0.15, 0.4], [0.1, 0.0, 0.5], [0.45, 0.2, 0.35]]) { x.beginPath(); x.arc(cx + dx * r, cy + dy * r, rr * r, 0, 6.283); x.fill(); } x.fillRect(cx - 0.6 * r, cy + 0.15 * r, 1.2 * r, 0.35 * r); }
}

export function createHotelUpper({ scene, hud, audio, getLife, save, player, travel, getWorld = () => null }) {
  const group = new THREE.Group(); group.name = 'peace-6f'; scene.add(group);
  const lights = [];
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.38, metalness: 0.05, emissive: 0x080402 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.28, metalness: 1, envMapIntensity: 1.4 });
  const paper = new THREE.MeshStandardMaterial({ map: paperTex([3, 1]), roughness: 0.8, emissive: 0x0e140f, emissiveIntensity: 1 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf1e6d0, roughness: 0.9, emissive: 0x3a2a18, side: THREE.DoubleSide });
  const lampLit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, 0.85) });
  const paint = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.6 });
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
  add(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ map: signTex([['施工中 · 敬请谅解', 64, '#1f3d36'], ['六楼南侧客房改造 2026.9 – 2027.3', 34], ['Refurbishment in progress', 40, '#1f3d36'], ['We apologise for any inconvenience', 30]], { h: 494 }), roughness: 0.6, emissive: 0x191512 }), ccx, F + 1.5, C.z1 - 0.065, Math.PI);
  for (const [x, z] of [[lcx, lcz], [ccx, -236], [ccx, -226]]) lights.push({ x, y: F + H - 0.3, z, intensity: 6, distance: 8, color: new THREE.Color(1.0, 0.8, 0.56) });

  // ================= room 612 (world/room612.js) =================
  const room = buildRoom612({ group, F, H, lights });
  group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; if (!o.material.transparent && !o.material.isMeshBasicMaterial) o.castShadow = true; } });

  // ================= what happens =================
  const S = { door: 0, doorWant: 0, doorT: 0, liftOpen: 0, said: {}, applied: false, tvT: 0, tvN: 0, wasIn: false };
  // the room's own state, kept in the save: lamps, drapes, the evening's turndown, an order of in-room dining
  const R6 = () => { const l = getLife(); return (l.flags.r612 ||= { lamps: true, curtains: false, turnAt: null, turnDay: null, order: null, tray: null }); };
  const part = (m) => (m < 4 * 60 ? 'evening' : m < 11 * 60 ? 'morning' : m < 13 * 60 ? 'noon' : m < 18 * 60 ? 'afternoon' : 'evening');
  const CONC_HELLO = {
    morning: ['hotelconcierge', '礼宾部，早上好。纪先生，有什么可以帮您？', 'Concierge, good morning. Mr Ji, how can I help?'],
    noon: ['hotelconcierge', '礼宾部，中午好。纪先生，有什么可以帮您？', 'Concierge, good afternoon. Mr Ji, how can I help?'],
    afternoon: ['hotelconcierge', '礼宾部，下午好。纪先生，有什么可以帮您？', 'Concierge, good afternoon. Mr Ji, how can I help?'],
    evening: ['hotelconcierge', '礼宾部，晚上好。纪先生，有什么可以帮您？', 'Concierge, good evening. Mr Ji, how can I help?'],
  };
  // in-room dining: what it is, what it costs (charged to the room), how it's set down, what eating it is like
  const MENU = {
    sandwich: { zh: '总汇三明治配薯条，一壶红茶', en: 'A club sandwich with fries, a pot of black tea', price: 198, ate: ['三明治还是热的，红茶泡得正好。', 'The sandwich still warm, the tea just right.'] },
    wonton: { zh: '鲜肉小馄饨和生煎', en: 'Pork wontons in broth and pan-fried buns', price: 138, ate: ['小馄饨的汤很鲜，生煎底子脆。', 'The wonton broth clean and rich, the buns crisp underneath.'] },
    borscht: { zh: '罗宋汤配炸猪排', en: 'Shanghai borscht with a pork cutlet', price: 168, ate: ['老上海的罗宋汤，酸甜，猪排蘸辣酱油。', 'Old Shanghai borscht, sweet and sour; the cutlet with Worcestershire.'] },
  };
  function drawCard(x, w, h) {
    const f = forecast(L0());
    x.fillStyle = '#f6f0e2'; x.fillRect(0, 0, w, h); x.strokeStyle = '#b8955a'; x.lineWidth = 4; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#7a5c2e'; x.textAlign = 'center'; x.font = '600 22px "Noto Serif SC", serif'; x.fillText('和平饭店 · 明日天气', w / 2, 44);
    x.font = '500 18px "Noto Serif SC", serif'; x.fillText(`${f.m} 月 ${f.d} 日 ${WEEK[f.w]} · 上海`, w / 2, 74);
    skyIcon(x, 92, 150, 46, f.icon);
    x.fillStyle = '#2a2a2a'; x.textAlign = 'left'; x.font = '600 34px "Noto Serif SC", serif'; x.fillText(f.zh, 160, 140); x.font = '500 28px "Noto Serif SC", serif'; x.fillText(`${f.lo} – ${f.hi} ℃`, 160, 182);
    x.fillStyle = '#7a5c2e'; x.textAlign = 'center'; x.font = 'italic 18px "Noto Serif SC", serif'; x.fillText('祝您晚安 · Good night', w / 2, h - 26);
  }
  const NEWS = [
    ['外滩今晚灯光照常开启，22 时关闭', 'The Bund lights come on as usual tonight, off at 22:00'],
    ['黄浦江游船今晚正常运营', 'Huangpu River cruises are running as normal tonight'],
    ['南京路步行街周末客流预计增加，请错峰出行', 'Nanjing Road expects weekend crowds: go early or late'],
    ['地铁 2 号线、10 号线今日运营正常', 'Metro Lines 2 and 10 are running normally today'],
  ];
  function drawTv(x, w, h) {
    const f = forecast(L0()), [zh, en] = NEWS[S.tvN % NEWS.length], m = L0().clock.minute;
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f2a4a'); g.addColorStop(1, '#081626'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c8202a'; x.fillRect(16, 14, 118, 30); x.fillStyle = '#fff'; x.font = '700 20px "Noto Sans SC", sans-serif'; x.textAlign = 'left'; x.fillText('申城新闻', 28, 37);   // (the game's own channel)
    x.font = '600 16px "Noto Sans SC", sans-serif'; x.textAlign = 'right'; x.fillText(clockText(m), w - 16, 36);
    // the city at night behind the presenter's desk, as a backdrop
    x.fillStyle = 'rgba(255,200,120,0.18)'; for (let i = 0; i < 18; i++) x.fillRect(20 + i * 17, 120 - (i * 37 % 60), 12, 60 + (i * 37 % 60));
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.fillRect(0, 186, w * 0.64, 54); x.fillStyle = '#c8202a'; x.fillRect(0, 186, 8, 54);
    x.fillStyle = '#10223a'; x.textAlign = 'left'; x.font = '700 19px "Noto Sans SC", sans-serif'; x.fillText(getLang() === 'zh' ? zh : en, 18, 220, w * 0.6);
    // tomorrow's weather, on the right
    x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(w * 0.67, 60, w * 0.3, 180);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '600 15px "Noto Sans SC", sans-serif'; x.fillText(getLang() === 'zh' ? `明日 ${f.m}/${f.d} ${WEEK[f.w]}` : `Tomorrow ${WEEK_EN[f.w]} ${f.d}/${f.m}`, w * 0.82, 84);
    skyIcon(x, w * 0.82, 130, 30, f.icon);
    x.fillStyle = '#fff'; x.font = '700 20px "Noto Sans SC", sans-serif'; x.fillText(getLang() === 'zh' ? f.zh : f.en, w * 0.82, 190, w * 0.28); x.font = '600 18px "Noto Sans SC", sans-serif'; x.fillText(`${f.lo}–${f.hi}℃`, w * 0.82, 220);
    x.fillStyle = '#c8202a'; x.fillRect(0, h - 34, w, 34); x.fillStyle = '#fff'; x.textAlign = 'left'; x.font = '500 15px "Noto Sans SC", sans-serif';
    x.fillText(getLang() === 'zh' ? '上海 · 申城新闻 · 实时资讯   |   黄浦区 · 外滩 · 南京东路' : 'Shanghai · Shencheng News · live   |   Huangpu · the Bund · Nanjing Road East', 12, h - 12);
  }
  const say2 = ([who, zh, en], secs = 3.6) => say(who === 'roomservice' ? T('客房送餐', 'In-room dining') : T('礼宾部', 'Concierge'), zh, en, secs);   // (latin keys: tools/voice)
  function phoneCall() {
    const W = getWorld(), talk = W && W.sceneTalk; if (!talk || talk.active) return;
    talk.addNames({ hotelconcierge: ['礼宾部', 'Concierge'], roomservice: ['客房送餐', 'In-room dining'] });
    audio && audio.cue && audio.cue('click', 0, 0.5);
    const at = () => null, l = L0();
    talk.play([CONC_HELLO[part(l.clock.minute)], { ask: [
      { zh: '帮我叫辆车。', en: 'Could you get me a car?', set: 'car' },
      { zh: '我想点客房送餐。', en: "I'd like to order in-room dining.", set: 'food' },
      { zh: '没事了，谢谢。', en: "That's all, thank you.", set: 'bye', then: [['hotelconcierge', '好的，有需要随时打给我们。', 'Of course. Call us any time.']] },
    ] }], { at, onDone: (set) => {
      if (set === 'car') {
        const rf = W.rideFlow;
        if (!rf || rf.active) { talk.play([['hotelconcierge', '您已经约了一辆车，还在路上。', "You've a car booked already, sir; it's on its way."]], { at }); return; }
        talk.play([['hotelconcierge', '好的。您想去哪里？', 'Of course. Where to?'], { ask: [
          { zh: '去陆家嘴，国金中心。', en: 'Lujiazui, the IFC.', set: 'lujiazui' },
          { zh: '去新天地。', en: 'Xintiandi.', set: 'xintiandi' },
          { zh: '去静安嘉里中心。', en: "Jing'an Kerry Centre.", set: 'jingan' },
          { zh: '算了，先不用了。', en: 'Never mind, not yet.', set: 'none', then: [['hotelconcierge', '好的，需要的时候再打给我们。', 'Of course. Call us when you need one.']] },
        ] }], { at, onDone: (to) => {
          if (!to || to === 'none') return;
          if (rf.request(to)) talk.play([['hotelconcierge', '好的，我用快马帮您叫了一辆。司机接单后，您手机上会收到消息。上车点在中山东一路汉口路口。', "Done: I've booked you a Kuaima. You'll get a message when the driver accepts. The pick-up is on Zhongshan Road at Hankou Road."]], { at });
        } });
      } else if (set === 'food') {
        talk.play([['roomservice', '客房送餐，您好。想吃点什么？', 'In-room dining, good evening. What would you like?'], { ask: [
          ...Object.entries(MENU).map(([k, v]) => ({ zh: `${v.zh}（¥${v.price}）`, en: `${v.en} (¥${v.price})`, set: k })),
          { zh: '算了，我再想想。', en: "Never mind, I'll think about it.", set: 'none', then: [['roomservice', '好的，随时为您服务。', "Of course. We're here any time."]] },
        ] }], { at, onDone: (kind) => {
          if (!MENU[kind]) return;
          const r = R6(), L = L0(), paid = pay(L, { method: 'card', amount: MENU[kind].price, to: '和平饭店 客房送餐', memo: `挂房账 · ${MENU[kind].zh}`, kind: 'food' });
          if (!paid.ok) { talk.play([['roomservice', '抱歉，纪先生，房账这边暂时挂不上，麻烦您到前台确认一下。', "I'm sorry, Mr Ji, we can't put it on the room just now. Could you check with the front desk?"]], { at }); return; }
          r.order = { kind, due: stamp(L) + 25 }; save && save();
          talk.play([['roomservice', '好的，大约二十五分钟送到，费用挂在您的房账上。', 'Very good: about twenty-five minutes, and it goes on your room bill.']], { at });
        } });
      }
    } });
  }
  const L0 = () => getLife();
  const say = (who, zh, en, secs = 3) => hud.bark({ speaker: who, text: { zh, en }, seconds: secs });
  const here = (pp) => pp.y > F - 1 && pp.y < F + 3;
  const inRoom = (pp) => here(pp) && pp.x > R.x0 && pp.z > R.z0 && pp.z < R.z1;
  const targets = [
    { id: 'uLift', x: (SIX.lifts[0] + SIX.lifts[1]) / 2, y: F + 1.4, z: Lb.z0 + 0.2, reach: 3.0 },
    { id: 'uDoorOut', x: C.x1 - 0.05, y: F + 1.1, z: (R.door[0] + R.door[1]) / 2, reach: 2.0 },
    { id: 'uDoorIn', x: R.x0 + 0.1, y: F + 1.1, z: (R.door[0] + R.door[1]) / 2, reach: 2.0 },
    { id: 'uBed', x: R.bed.x, y: F + 0.7, z: R.z0 + 1.4, reach: 2.6 },
    { id: 'uWindow', x: R.x1 - 0.2, y: F + 1.6, z: -231.4, reach: 2.6 },          // each of the two windows
    { id: 'uWindowB', x: R.x1 - 0.2, y: F + 1.6, z: -227.6, reach: 2.6 },
    { id: 'uBath', x: -41.8, y: F + 1.0, z: R.bath.z0 + 0.45, reach: 1.8 },
    { id: 'uCoffee', x: -40.95, y: F + 1.05, z: R.z1 - 0.3, reach: 1.8 },
    { id: 'uLetter', x: R.sofa.x + 0.22, y: F + 0.45, z: -227.0, reach: 1.9 },
    ...[['uTub', 'tub', 1.9], ['uTV', 'tv', 2.6], ['uPhone', 'phone', 1.8], ['uLamp', 'lamp', 1.8], ['uCurtain', 'curtain', 1.8], ['uCard', 'card', 1.8], ['uTray', 'tray', 1.8]]
      .map(([id, k, reach]) => ({ id, x: room.spots[k][0], y: room.spots[k][1], z: room.spots[k][2], reach })),
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
    uBath: () => [T('洗手台', 'Basin'), T('洗把脸', 'Wash your face')],
    uCoffee: () => [T('咖啡机', 'Coffee machine'), T('冲一杯', 'Make a cup')],
    uLetter: () => [T('欢迎信', 'A letter'), T('看看', 'Read it')],
    uTub: () => [T('浴缸', 'Bathtub'), T('泡个澡', 'Take a bath')],
    uTV: () => [T('电视', 'Television'), room.tvOn ? T('关电视', 'Turn it off') : T('看电视', 'Turn it on')],
    uPhone: () => [T('房间电话', 'Room phone'), T('打给礼宾部', 'Call the concierge')],
    uLamp: () => [T('床头开关', 'Bedside switch'), room.lamps ? T('关灯', 'Lights off') : T('开灯', 'Lights on')],
    uCurtain: () => [T('窗帘', 'Curtains'), room.curtainsDrawn ? T('拉开', 'Open them') : T('拉上', 'Draw them')],
    uCard: () => [T('天气卡', 'Weather card'), T('看看', 'Read it')],
    uTray: () => [T('客房送餐', 'In-room dining'), T('吃饭', 'Eat')],
    uHoard: () => [T('围挡', 'Hoarding'), T('看告示', 'Read the notice')],
    u610: () => [T('610 房', 'Room 610'), T('敲门', 'Knock')],
  };
  function setDoor(open) { S.doorWant = open ? 1 : 0; S.doorT = open ? 8 : 0; audio && audio.cue && audio.cue(open ? 'door' : 'bump', 0, 0.25); }
  function interact(id) {
    const l = L0();
    if (id === 'uLift') {
      travel(async () => { player.teleport(-48, -241.6, Math.PI, 0.02); setDoor(false); S.door = 0; }, { line: T('G 层 · 大堂', 'G · the lobby') });
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
      travel(async () => { slept(l, (until - now) / 60); skipTo(l, until); if (player.stamina) { player.stamina.energy = 1; player.stamina.winded = 0; }
        if (night) { const r = R6(); r.turnAt = null; r.tray = null; room.setTurndown(false); room.setTray(null); }   // (slept in; housekeeping makes it up again)
        save && save(); },
        { line: gap || (night ? T(`一夜好眠 · ${clockText(until)}`, `A good night's sleep · ${clockText(until)}`) : T(`躺了一会儿 · ${clockText(until)}`, `You lie down a while · ${clockText(until)}`)), hold: gap ? 2400 : night ? 1600 : 900 });
    } else if (id === 'uWindow' || id === 'uWindowB') {
      const lines = [
        ['江对面，东方明珠和陆家嘴的灯都亮着。楼下是外滩的人，一直到江边。', 'Across the river, the Pearl Tower and Lujiazui all lit. Below, people along the Bund all the way to the water.'],
        ['一艘游船慢慢地从北边开过来，灯一层一层的。', 'A cruise boat comes slowly down from the north, lit deck by deck.'],
        ['从这儿看，中山东一路的车流像一条亮着的河。', 'From up here the traffic on Zhongshan Road is a river of its own.'],
      ][(S.windowN = ((S.windowN ?? -1) + 1) % 3)];
      hud.toast(T(lines[0], lines[1]), 4.2);
    } else if (id === 'uBath') { travel(async () => { skipTo(l, stamp(l) + 6); }, { line: T('冷水洗了把脸', 'Cold water on your face'), down: 400, hold: 300, up: 500 }); }
    else if (id === 'uCoffee') { audio && audio.cue && audio.cue('click', 0, 0.5); travel(async () => { skipTo(l, stamp(l) + 4); }, { line: T('胶囊咖啡机嗡嗡响了一阵：一杯热美式', 'The capsule machine hums a while: a hot americano'), down: 400, hold: 500, up: 500 }); }
    else if (id === 'uLetter') hud.toast(T('手写的：“纪先生：欢迎回到和平饭店。愿您在外滩的每一天都顺心。—— 礼宾部 敬上”', 'Handwritten: "Mr Ji, welcome back to the Peace Hotel. May every day on the Bund go well for you. The Concierge"'), 5);
    else if (id === 'uTub') {
      travel(async () => { skipTo(l, stamp(l) + 30); logTime(l, 'rest', 30); if (player.stamina) { player.stamina.energy = 1; player.stamina.winded = 0; } save && save(); },
        { line: T('放了一缸热水，泡了半个小时', 'A hot bath, run deep: half an hour'), down: 500, hold: 900, up: 600 });
    } else if (id === 'uTV') {
      const on = !room.tvOn; room.setTv(on); audio && audio.cue && audio.cue('click', 0, 0.4);
      if (on) { S.tvN = Math.floor(Math.random() * 4); room.drawTv(drawTv); S.tvT = 0; }
    } else if (id === 'uPhone') phoneCall();
    else if (id === 'uLamp') { const r = R6(); r.lamps = !room.lamps; room.setLamps(r.lamps); audio && audio.cue && audio.cue('click', 0, 0.5); save && save(); }
    else if (id === 'uCurtain') { const r = R6(); r.curtains = !room.curtainsDrawn; room.setCurtains(r.curtains); save && save(); }
    else if (id === 'uCard') { const f = forecast(l); hud.toast(T(`明日天气：${f.m} 月 ${f.d} 日 ${WEEK[f.w]}，${f.zh}，${f.lo}–${f.hi} ℃。和平饭店祝您晚安。`, `Tomorrow: ${WEEK_EN[f.w]} ${f.d}/${f.m}, ${f.en.toLowerCase()}, ${f.lo}–${f.hi} °C. Good night from the Peace Hotel.`), 5); }
    else if (id === 'uTray') {
      const r = R6(), d = MENU[r.tray]; if (!d) return true;
      travel(async () => { skipTo(l, stamp(l) + 20); logTime(l, 'rest', 20); r.tray = null; room.setTray(null); save && save(); }, { line: T(d.ate[0], d.ate[1]), down: 500, hold: 1200, up: 600 });
    }
    else if (id === 'uHoard') hud.toast(T('施工中，六楼南侧客房改造，2026年9月至2027年3月。', 'Refurbishment in progress: 6F south rooms, September 2026 to March 2027.'), 3.6);
    else if (id === 'u610') { audio && audio.cue && audio.cue('bump', 0, 0.4); say(T('门里', 'Through the door'), '……谁啊？我们没叫客房服务。', "...Who is it? We didn't order room service.", 2.8); }
    return true;
  }
  // ---- the room's life: its saved state shown, the turndown, the order arriving, the news moving on ----
  function updateRoom(dt, pp) {
    const r = R6(), l = L0(), now = stamp(l), tod = l.clock.minute, inside = inRoom(pp);
    if (!S.applied) { S.applied = true; room.setLamps(r.lamps, !!r.turnAt); room.setCurtains(r.curtains, true); room.setTray(r.tray); room.setTurndown(!!r.turnAt, drawCard); }
    room.update(dt);
    // the turndown: from half past six in the evening, while you're out; once a night. The drapes drawn, only the
    // bedside lamps left on, the corner of the duvet turned back, water and the card by the bed
    if (r.turnAt && now - r.turnAt > 14 * 60) { r.turnAt = null; room.setTurndown(false); }
    if (!inside && r.turnDay !== l.clock.day && tod >= 18 * 60 + 30) {
      r.turnDay = l.clock.day; r.turnAt = now; r.curtains = true; r.lamps = true; S.turnSeen = false;
      room.setCurtains(true, true); room.setLamps(true, true); room.setTurndown(true, drawCard); save && save();
    }
    if (inside && !S.wasIn && r.turnAt && !S.turnSeen) { S.turnSeen = true; hud.toast(T('夜床服务做好了：窗帘拉上了，床头留着灯，枕边放了明天的天气卡。', 'The turndown is done: curtains drawn, the bedside lamps on, tomorrow\'s weather on the pillow.'), 4.5); }
    // the order: a knock and the waiter's voice if you're in; set down on the desk either way
    if (r.order && now >= r.order.due) {
      r.tray = r.order.kind; r.order = null; room.setTray(r.tray); save && save();
      if (inside) { audio && audio.cue && audio.cue('bump', 0, 0.5); audio && audio.cue && audio.cue('bump', 0.35, 0.5); say2(['roomservice', '您好，客房送餐。给您放在书桌上了，请慢用。', 'Good evening, in-room dining. I\'ve set it on the desk for you. Enjoy your meal.'], 4); }
      else S.trayNote = true;
    }
    if (inside && !S.wasIn && S.trayNote) { S.trayNote = false; hud.toast(T('送餐已经放在书桌上了。', 'Your order is on the desk.'), 3); }
    S.wasIn = inside;
    // the news moves on every few seconds while the set is on
    if (room.tvOn && (S.tvT += dt) > 7) { S.tvT = 0; S.tvN++; room.drawTv(drawTv); }
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
    candidates() { return here(player.body) ? targets.filter((t) => (t.id !== 'uCard' || room.turndown) && (t.id !== 'uTray' || room.tray)).map((t) => ({ ...t, cone: 0.6 })) : []; },
    prompt(id) { const p = PROMPT[id]; if (!p) return null; const [target, action] = p(); return { target, action }; },
    owns(id) { return targets.some((t) => t.id === id); },
    interact,
    update(dt, pp) {
      group.visible = pp.y > F - 6;                                          // only drawn when you're up here
      if (!group.visible) return;
      updateRoom(dt, pp);
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
