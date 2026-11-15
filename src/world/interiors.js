// Two ground floors you can walk into on the northern Bund (their exteriors are bund.js):
//
// THE PEACE HOTEL (No.20, Sassoon House, 1929), entered from Nanjing Road East through the revolving
// door under the bronze canopy, as the real main entrance is (the Bund door has been shut for decades).
//   - one great hall laid out as the original arcades crossing at an octagon: eight marble pillars,
//     an inlaid octagon in the marble floor, and above it the octagonal drum and the stained-glass
//     rotunda (restored 2010), lit from within
//   - Art Deco: walnut wainscot, cream plaster, brass, frosted glass lights in the Lalique manner
//   - the front desk (they know you: you told your father you're staying here) and the concierge,
//     who holds what couriers left for you
//   - the Jasmine Lounge along the Bund windows; the Jazz Bar's door (world/jazzBar.js)
//   - the lift lobby: guests only, a guard on it; with your key card, up to the sixth floor and your
//     room (world/hotelUpper.js), whose south end is hoarded off for a refit
//   - a staff-only door that the staff will stop you trying, if they see you
// THE AIA BUILDING (No.17, 1924), through the arched door on the Bund:
//   - a granite lobby, the reception desk, a tenant directory, a visitor QR stand
//   - face-recognition speed gates and a guard. Staff badge through now and then; follow one while
//     the guard is busy with his phone and you're in. Let him see you and you're walked back.
//   - beyond: the lift lobby (badge only)
// Everything here is the game's own: layouts follow published descriptions, not plans; the AIA
// lobby isn't publicly documented, so it is plausible rather than accurate. Text in the world
// (the hotel's name, signs) stays as it would be on site.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { L, colliders, addDynamicCollider } from './layout.js';
import { createPerson } from './people.js';
import { getLang } from '../ui/i18n.js';
import { waitingAt } from '../engine/shopping.js';
import { JAZZ } from './jazzBar.js';

export const PEACE = { x0: -60, x1: -35.4, z0: -244, z1: -212.6, h: 5.6, door: [-50, -46], oct: { x: -48, z: -229, r: 6.2, top: 10.5 } };
export const AIA = { x0: -47, x1: -34.6, z0: -152, z1: -139, h: 6.2, door: [-147.2, -143.8], gateX: -41.5, gates: [-147.3, -146.1, -144.9, -143.7] };
const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const Y0 = L.curbH;

// ---- the ground plan: colliders carved out of the solid blocks, roofs over the rain ----
function carve() {
  const zN = L.zNorth - 1, P = PEACE, A = AIA;
  const replace = (tag, boxes) => { const i = colliders.findIndex((c) => c.tag === tag); if (i >= 0) colliders.splice(i, 1, ...boxes.map(([minX, maxX, minZ, maxZ, t]) => ({ minX, maxX, minZ, maxZ, tag: t || tag }))); };
  replace('peace-block', [
    [-140, P.x0, zN, -212], [P.x0, L.facadeX, zN, P.z0], [P.x1, L.facadeX, P.z0, -212],
    [P.x0, P.door[0], P.z1, -212, 'peace-front'], [P.door[1], P.x1, P.z1, -212, 'peace-front'],
    // the front desk and concierge (west), the lift lobby's back wall (north), the lounge piano
    [P.x0 + 1.3, P.x0 + 3.6, -233.2, -224.6, 'desk'], [P.x0 + 1.3, P.x0 + 3.2, -239.6, -235.4, 'desk'],
    [-41.6, -39.2, -242.6, -240.4, 'piano'],
  ]);
  for (let i = 0; i < 8; i++) {                                     // the eight pillars round the octagon
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = P.oct.x + Math.cos(a) * P.oct.r, z = P.oct.z + Math.sin(a) * P.oct.r;
    colliders.push({ minX: x - 0.42, maxX: x + 0.42, minZ: z - 0.42, maxZ: z + 0.42, tag: 'pillar' });
  }
  replace('aia-block', [
    [-140, L.facadeX, -190, A.z0], [-140, L.facadeX, A.z1, -131], [-140, A.x0, A.z0, A.z1],
    [A.x1, L.facadeX, A.z0, A.door[0], 'aia-front'], [A.x1, L.facadeX, A.door[1], A.z1, 'aia-front'],
    [-40.7, -36.3, -140.7, A.z1, 'desk'],                           // reception, on the public side by the south wall
  ]);
  // the gate line: solid but for the gate lanes (each lane has its own flap collider, opened by a badge)
  const lanes = A.gates, w = 0.55;
  const solid = [[A.z0, lanes[0] - w]];
  for (let i = 0; i < lanes.length - 1; i++) solid.push([lanes[i] + w, lanes[i + 1] - w]);
  solid.push([lanes[lanes.length - 1] + w, A.z1]);                   // wall to wall: no way round
  for (const [a, b] of solid) if (b > a) colliders.push({ minX: A.gateX - 0.15, maxX: A.gateX + 0.15, minZ: a, maxZ: b, tag: 'gates' });
}
carve();
// furniture, pillars and gates stand on the ground floor only (the upper storey is world/hotelUpper.js)
for (const c of colliders) if (['desk', 'piano', 'pillar', 'gates'].includes(c.tag)) { c.y0 = 0; c.y1 = 8; }

// ---- textures ----
const loader = new THREE.TextureLoader();
function tx(name, rep, srgb) { const t = loader.load(`./textures/${name}`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
// stained glass: concentric rings of amber, green and blue panes in a leaded octagon pattern
const stainedGlass = () => canvasTex(1024, 1024, (x, w) => {
  const c = w / 2; x.fillStyle = '#1a1208'; x.fillRect(0, 0, w, w);
  const cols = ['#f0b33c', '#d98a28', '#6fae6a', '#3d7fb0', '#e8d29a', '#c25a3a'];
  for (let ring = 9; ring >= 0; ring--) {
    const r = (ring + 1) * c / 10, n = 8 * (ring + 1);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      x.beginPath(); x.moveTo(c, c); x.arc(c, c, r, a0, a1); x.closePath();
      x.fillStyle = cols[(ring * 3 + i * (ring % 2 ? 1 : 2)) % cols.length]; x.globalAlpha = 0.75 + 0.25 * ((i * 7 + ring) % 3) / 2; x.fill();
    }
  }
  x.globalAlpha = 1; x.strokeStyle = '#15100a'; x.lineWidth = 5;
  for (let ring = 1; ring <= 10; ring++) { x.beginPath(); x.arc(c, c, ring * c / 10, 0, Math.PI * 2); x.stroke(); }
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; x.beginPath(); x.moveTo(c + Math.cos(a) * c * 0.2, c + Math.sin(a) * c * 0.2); x.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); x.stroke(); }
  const g = x.createRadialGradient(c, c, 0, c, c, c * 0.25); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, 'rgba(255,230,160,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w);
});
// the octagon inlaid in the floor: dark green marble ring, brass lines, a star
const floorInlay = () => canvasTex(1024, 1024, (x, w) => {
  const c = w / 2; x.clearRect(0, 0, w, w);
  const oct = (r) => { x.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const px = c + Math.cos(a) * r, py = c + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  oct(c * 0.98); x.fillStyle = 'rgba(28,52,44,0.92)'; x.fill();
  oct(c * 0.86); x.fillStyle = 'rgba(214,206,190,0.95)'; x.fill();
  x.strokeStyle = '#b8924a'; x.lineWidth = 7; oct(c * 0.98); x.stroke(); oct(c * 0.86); x.stroke(); oct(c * 0.5); x.stroke();
  x.fillStyle = 'rgba(28,52,44,0.9)';
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(a - 0.12) * c * 0.48, c + Math.sin(a - 0.12) * c * 0.48); x.lineTo(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8); x.lineTo(c + Math.cos(a + 0.12) * c * 0.48, c + Math.sin(a + 0.12) * c * 0.48); x.closePath(); x.fill(); }
});
const signTex = (lines, { bg = '#1a1510', fg = '#d9b46a', w = 512, h = 128 } = {}) => canvasTex(w, h, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([t, size], i) => { x.font = `600 ${size}px "Noto Serif SC", serif`; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1)); });
});

export function createInteriors({ scene, people, hud, audio, getLife, save, player, onCard, onLift }) {
  const group = new THREE.Group(); group.name = 'interiors'; scene.add(group);
  const marble = new THREE.MeshStandardMaterial({ map: tx('marble_01_diff_1k.jpg', 3, true), normalMap: tx('marble_01_nor_gl_1k.jpg', 3, false), roughnessMap: tx('marble_01_rough_1k.jpg', 3, false), roughness: 0.6, color: 0xe8e2d6, envMapIntensity: 1.1 });
  const marbleDark = new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, roughness: 0.25, color: 0x3d4a44, envMapIntensity: 1.3 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.4, metalness: 0.05, emissive: 0x070302 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xead8b8, roughness: 0.9, emissive: 0x3a2814 });   // warm: lamplight, not the blue night outside
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.3, metalness: 1, envMapIntensity: 1.4 });
  const granite = new THREE.MeshStandardMaterial({ map: tx('granite_tile_04_diff_1k.jpg', 1, true), color: 0xb9b2a6, roughness: 0.5, emissive: 0x0d0c0a });
  const frosted = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.22, 0.9) });             // lit glass (bloom makes it glow)
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fb2b8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.7 });
  const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; group.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
  const rbox = (w, h, d, r, mat, x, y, z) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z);
  // an inward-facing wall from (ax, az) to (bx, bz), y0..y1, facing the point (cx, cz)
  function wall(ax, az, bx, bz, y0, y1, mat, cx, cz) {
    const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, y1 - y0), mat, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    const nx = -(bz - az) / len, nz = (bx - ax) / len, toward = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1;
    m.rotation.y = Math.atan2(nx * toward, nz * toward); return m;
  }
  // a wall with openings [a, b] along it (door height dh), wainscot to 1.3 m, plaster above
  function walls(ax, az, bx, bz, h, cx, cz, openings = [], dh = 3.2, wain = walnut, upper = plaster) {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const at = (t) => [ax + ux * t, az + uz * t];
    let t0 = 0;
    for (const [o0, o1] of [...openings, [len, len]]) {
      if (o0 > t0) { const [x0, z0] = at(t0), [x1, z1] = at(o0); wall(x0, z0, x1, z1, Y0, Y0 + 1.3, wain, cx, cz); wall(x0, z0, x1, z1, Y0 + 1.3, Y0 + h, upper, cx, cz); }
      if (o1 > o0 && o1 < len) { const [x0, z0] = at(o0), [x1, z1] = at(o1); wall(x0, z0, x1, z1, Y0 + dh, Y0 + h, upper, cx, cz); }
      t0 = o1;
    }
  }
  const lights = [];   // extra light sources for world/lighting.js's pool
  const clerestory = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.62, 0.45) });   // dim glazing round the drum
  // a club armchair: seat, rolled back, two arms, in burgundy leather
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x5c1f1c, roughness: 0.5 });
  function armchair(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, Y0, z); g.rotation.y = ry; group.add(g);
    const part = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.35), chairMat); m.position.set(px, py + h / 2, pz); g.add(m); };
    part(0.62, 0.42, 0.62, 0, 0, 0.04); part(0.62, 0.42, 0.18, 0, 0.36, -0.26); part(0.14, 0.26, 0.6, -0.3, 0.38, 0.02); part(0.14, 0.26, 0.6, 0.3, 0.38, 0.02);
  }

  // ================= THE PEACE HOTEL =================
  const P = PEACE, pcx = (P.x0 + P.x1) / 2, pcz = (P.z0 + P.z1) / 2;
  add(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), marble, pcx, Y0 + 0.004, pcz, 0, -Math.PI / 2);
  add(new THREE.PlaneGeometry(P.oct.r * 2.6, P.oct.r * 2.6), new THREE.MeshStandardMaterial({ map: floorInlay(), transparent: true, roughness: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), P.oct.x, Y0 + 0.008, P.oct.z, 0, -Math.PI / 2);
  // walls: south (Nanjing Rd, the door), east (the Bund, windows on the lounge), north (lifts), west (desk, staff door)
  walls(P.x0, P.z1, P.x1, P.z1, P.h, pcx, pcz, [[P.door[0] - P.x0, P.door[1] - P.x0]]);
  walls(P.x1, P.z1, P.x1, P.z0, P.h, pcx, pcz, [[16, 19], [22, 25], [27.5, 30.5]], 3.6);                 // windows onto the Bund (glazed below)
  walls(P.x1, P.z0, P.x0, P.z0, P.h, pcx, pcz);
  walls(P.x0, P.z0, P.x0, P.z1, P.h, pcx, pcz, [[20.4, 21.8]], 2.4);                                    // the staff door
  for (const [a, b] of [[16, 19], [22, 25], [27.5, 30.5]]) {
    const z0 = P.z1 - a, z1 = P.z1 - b;
    add(new THREE.PlaneGeometry(Math.abs(z1 - z0), 3.6), glass, P.x1 + 0.05, Y0 + 1.8, (z0 + z1) / 2, Math.PI / 2);
    box(0.1, 0.12, Math.abs(z1 - z0) + 0.2, brass, P.x1 - 0.05, Y0 + 3.6, (z0 + z1) / 2);
  }
  // ceiling with the octagon open to the drum and the rotunda
  {
    // (shape y becomes world z once turned face-down by +90° about x)
    const sh = new THREE.Shape(); sh.moveTo(P.x0, P.z0); sh.lineTo(P.x1, P.z0); sh.lineTo(P.x1, P.z1); sh.lineTo(P.x0, P.z1); sh.closePath();
    const hole = new THREE.Path(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const x = P.oct.x + Math.cos(a) * (P.oct.r + 0.6), z = P.oct.z + Math.sin(a) * (P.oct.r + 0.6); i ? hole.lineTo(x, z) : hole.moveTo(x, z); }
    sh.holes.push(hole);
    const ceil = add(new THREE.ShapeGeometry(sh), plaster, 0, Y0 + P.h, 0, 0, Math.PI / 2); ceil.material = plaster.clone(); ceil.material.side = THREE.DoubleSide;
    // coffers: brass-lined frosted panels in a grid (the Lalique-style light)
    for (let x = P.x0 + 3; x < P.x1 - 2; x += 4.4) for (let z = P.z1 - 3; z > P.z0 + 2; z -= 4.4) {
      if (Math.hypot(x - P.oct.x, z - P.oct.z) < P.oct.r + 2) continue;
      add(new THREE.PlaneGeometry(1.1, 1.1), frosted, x, Y0 + P.h - 0.02, z, 0, Math.PI / 2);
      box(1.3, 0.06, 0.06, brass, x, Y0 + P.h - 0.08, z - 0.62); box(1.3, 0.06, 0.06, brass, x, Y0 + P.h - 0.08, z + 0.62);
    }
    // the drum: eight panels rising from the ceiling to the rotunda, clerestory glazing near the top
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8, a1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8, r = P.oct.r + 0.6;
      const ax = P.oct.x + Math.cos(a0) * r, az = P.oct.z + Math.sin(a0) * r, bx = P.oct.x + Math.cos(a1) * r, bz = P.oct.z + Math.sin(a1) * r;
      wall(ax, az, bx, bz, Y0 + P.h, Y0 + P.oct.top - 0.9, plaster, P.oct.x, P.oct.z);
      wall(ax, az, bx, bz, Y0 + P.oct.top - 0.9, Y0 + P.oct.top - 0.45, clerestory, P.oct.x, P.oct.z);
      wall(ax, az, bx, bz, Y0 + P.oct.top - 0.45, Y0 + P.oct.top, plaster, P.oct.x, P.oct.z);
    }
    // the rotunda: a shallow dome of stained glass, its pattern laid on flat from above (as a laylight
    // reads from below), lit from behind
    const dg = new THREE.SphereGeometry(P.oct.r + 0.6, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), R0 = P.oct.r + 0.6, pos = dg.attributes.position, uv = dg.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * R0 * 0.92), 0.5 + pos.getZ(i) / (2 * R0 * 0.92));
    const dome = add(dg, new THREE.MeshBasicMaterial({ map: stainedGlass(), side: THREE.BackSide, color: new THREE.Color(1.25, 1.12, 0.95) }), P.oct.x, Y0 + P.oct.top - 0.3, P.oct.z);
    dome.scale.y = 0.45;
    const cap = add(new THREE.CircleGeometry(P.oct.r + 0.75, 8, Math.PI / 8), plaster, P.oct.x, Y0 + P.oct.top + 0.02, P.oct.z, 0, Math.PI / 2);   // the drum's ceiling round the glass
    cap.material = plaster.clone(); cap.material.side = THREE.DoubleSide;
  }
  // the eight marble pillars, brass capitals and bases
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = P.oct.x + Math.cos(a) * P.oct.r, z = P.oct.z + Math.sin(a) * P.oct.r;
    add(new THREE.CylinderGeometry(0.36, 0.38, P.h - 0.6, 20), marbleDark, x, Y0 + 0.3 + (P.h - 0.6) / 2, z);
    box(0.95, 0.3, 0.95, brass, x, Y0, z); box(0.95, 0.3, 0.95, brass, x, Y0 + P.h - 0.3, z);
  }
  // wall lights: frosted Art Deco fans on brass, along every wall
  const sconce = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, Y0 + 2.6, z); g.rotation.y = ry; const f = new THREE.Mesh(new THREE.CircleGeometry(0.32, 3, -Math.PI / 6, Math.PI / 3 * 2), frosted); f.rotation.z = Math.PI; f.position.z = 0.05; g.add(f); const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), brass); b.position.set(0, 0.1, 0.03); g.add(b); group.add(g); };
  for (let x = P.x0 + 4; x < P.x1 - 3; x += 5) { sconce(x, P.z0 + 0.03, 0); }
  for (let z = P.z1 - 4; z > P.z0 + 3; z -= 5) sconce(P.x0 + 0.03, z, Math.PI / 2);
  // Art Deco detail: brass-capped walnut pilasters along the walls, a stepped cornice under the ceiling
  for (let x = P.x0 + 2; x < P.x1 - 1; x += 4) for (const z of [P.z0 + 0.12, P.z1 - 0.12]) { if (z > -213 && ((x > P.door[0] - 1 && x < P.door[1] + 1) || x > JAZZ.x0 - 0.5)) continue; box(0.34, P.h - 0.4, 0.14, walnut, x, Y0, z); box(0.4, 0.14, 0.18, brass, x, Y0 + P.h - 0.54, z); }
  for (const [ax, az, bx, bz] of [[P.x0, P.z0, P.x1, P.z0], [P.x0, P.z1, P.x1, P.z1]]) box(Math.abs(bx - ax), 0.22, 0.3, walnut, (ax + bx) / 2, Y0 + P.h - 0.26, az + (az < -230 ? 0.15 : -0.15));
  for (const x of [P.x0, P.x1]) box(0.3, 0.22, P.z1 - P.z0, walnut, x + (x < -50 ? 0.15 : -0.15), Y0 + P.h - 0.26, pcz);
  box(0.06, 0.05, P.z1 - P.z0, brass, P.x0 + 0.33, Y0 + P.h - 0.3, pcz); box(0.06, 0.05, P.z1 - P.z0, brass, P.x1 - 0.33, Y0 + P.h - 0.3, pcz);
  // the front desk and concierge: walnut, marble tops, brass rails, a backlit panel with the name
  rbox(2.2, 1.1, 8.2, 0.04, walnut, P.x0 + 2.4, Y0, -228.9); box(2.3, 0.06, 8.4, marbleDark, P.x0 + 2.4, Y0 + 1.1, -228.9);
  box(0.05, 0.05, 8.2, brass, P.x0 + 3.53, Y0 + 0.95, -228.9);
  add(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: signTex([['和平饭店', 64], ['PEACE HOTEL · 1929', 26]], { w: 768, h: 160 }), color: new THREE.Color(1.3, 1.3, 1.3) }), P.x0 + 0.06, Y0 + 3.4, -228.9, Math.PI / 2);
  rbox(1.8, 1.1, 4, 0.04, walnut, P.x0 + 2.2, Y0, -237.5); box(1.9, 0.06, 4.2, marbleDark, P.x0 + 2.2, Y0 + 1.1, -237.5);
  for (let i = 0; i < 6; i++) box(0.36, 0.24, 0.3, new THREE.MeshStandardMaterial({ color: 0xa88458, roughness: 0.9 }), P.x0 + 0.35, Y0 + 0.4 + (i % 3) * 0.5, -236 - Math.floor(i / 3) * 0.6);   // parcels on the shelf
  // the lift lobby: three brass lift doors in the north wall, dials over them
  for (const x of [-52, -48, -44]) {
    box(1.4, 2.6, 0.08, brass, x, Y0, P.z0 + 0.06);
    add(new THREE.CircleGeometry(0.28, 24, 0, Math.PI), brass, x, Y0 + 2.95, P.z0 + 0.06);
    box(1.8, 0.12, 0.12, walnut, x, Y0 + 2.62, P.z0 + 0.08);
  }
  // the Jasmine Lounge: round tables, chairs, a grand piano by the windows
  for (const [x, z] of [[-38.2, -230], [-38.4, -234.5], [-38.2, -238], [-41.5, -232], [-41.6, -236.4]]) {
    add(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), marbleDark, x, Y0 + 0.74, z); add(new THREE.CylinderGeometry(0.05, 0.12, 0.72, 10), brass, x, Y0 + 0.36, z);
    for (const a of [0, Math.PI]) armchair(x + Math.sin(a) * 0.85, z + Math.cos(a) * 0.85, a + Math.PI);
  }
  // the grand piano: curved case, raised lid, three legs
  {
    const lacquer = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.12, metalness: 0.2, envMapIntensity: 1.5 });
    const sh = new THREE.Shape(); sh.moveTo(-0.75, 0); sh.lineTo(0.75, 0); sh.lineTo(0.75, 1.2); sh.bezierCurveTo(0.75, 1.9, 0.2, 2.2, -0.1, 2.1); sh.bezierCurveTo(-0.5, 1.95, -0.75, 1.6, -0.75, 1.2); sh.closePath();
    const caseGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }); caseGeo.rotateX(Math.PI / 2);
    add(caseGeo, lacquer, -40.4, Y0 + 1.0, -242.6);
    const lid = add(new THREE.ShapeGeometry(sh), lacquer, -40.4, Y0 + 1.02, -242.6); lid.rotation.set(-Math.PI / 2 + 0.55, 0, 0); lid.material = lacquer;
    for (const [lx, lz] of [[-0.6, 0.2], [0.6, 0.2], [0, 1.9]]) add(new THREE.CylinderGeometry(0.05, 0.04, 0.68, 8), lacquer, -40.4 + lx, Y0 + 0.34, -242.6 + lz);
    box(1.4, 0.06, 0.22, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.4 }), -40.4, Y0 + 0.72, -242.55);   // the keys
  }
  // (the Jazz Bar, in the hall's south-east corner, is world/jazzBar.js)
  // the staff door
  box(0.1, 2.3, 1.3, dark, P.x0 + 0.06, Y0, P.z1 - 21.1);
  add(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: signTex([['员工通道  STAFF ONLY', 40]], { bg: '#2a2a2a', fg: '#ddd', w: 512, h: 120 }) }), P.x0 + 0.13, Y0 + 2.55, P.z1 - 21.1, Math.PI / 2);
  // outside on Nanjing Road: the bronze canopy, the revolving door, the name in bronze letters
  const doorX = (P.door[0] + P.door[1]) / 2;
  box(6.4, 0.25, 2.6, brass, doorX, Y0 + 3.6, -211.0);
  for (const x of [doorX - 3, doorX + 3]) add(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), brass, x, Y0 + 1.8, -209.9);
  const glowTex = canvasTex(256, 256, (x, w, h) => { const g = x.createRadialGradient(w / 2, h * 0.7, 10, w / 2, h * 0.6, w * 0.7); g.addColorStop(0, '#c9935a'); g.addColorStop(0.5, '#6b4524'); g.addColorStop(1, '#1d130b'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,220,160,0.5)'; for (let i = 0; i < 3; i++) x.fillRect(w * (0.2 + i * 0.25), h * 0.08, w * 0.12, h * 0.05); });
  add(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ map: glowTex }), doorX, Y0 + 1.6, -211.93, 0);   // the warm lobby seen through the door
  const drum = new THREE.Group(); drum.position.set(doorX, Y0, -212.2); group.add(drum);
  const vanes = new THREE.Group(); drum.add(vanes);
  for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.6), glass); v.position.set(Math.cos(i * Math.PI / 2) * 0.62, 1.3, Math.sin(i * Math.PI / 2) * 0.62); v.rotation.y = -i * Math.PI / 2; vanes.add(v); }
  const drumTop = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.25, 32), brass); drumTop.position.y = 2.75; drum.add(drumTop);
  add(new THREE.PlaneGeometry(5.6, 0.7), new THREE.MeshBasicMaterial({ map: signTex([['和 平 饭 店', 70]], { bg: '#00000000', fg: '#d9b46a', w: 800, h: 100 }), transparent: true }), doorX, Y0 + 4.4, -211.86);
  // light: the hall's own lamps join the lighting pool (only the nearest get real lights)
  for (const [x, z] of [[-48, -229], [-56, -218], [-40, -218], [-56, -240], [-40, -238], [-48, -240.5], [-57, -229]]) lights.push({ x, y: Y0 + P.h - 0.4, z, intensity: 14, distance: 11, color: new THREE.Color(1.0, 0.82, 0.58) });

  // ================= THE AIA BUILDING =================
  const A = AIA, acx = (A.x0 + A.x1) / 2, acz = (A.z0 + A.z1) / 2;
  add(new THREE.PlaneGeometry(A.x1 - A.x0, A.z1 - A.z0), marble, acx, Y0 + 0.004, acz, 0, -Math.PI / 2).material = marble.clone();
  walls(A.x0, A.z0, A.x1, A.z0, A.h, acx, acz, [], 3, granite, granite);
  walls(A.x1, A.z1, A.x0, A.z1, A.h, acx, acz, [], 3, granite, granite);
  walls(A.x0, A.z1, A.x0, A.z0, A.h, acx, acz, [], 3, granite, granite);
  walls(A.x1, A.z0, A.x1, A.z1, A.h, acx, acz, [[A.door[0] - A.z0, A.door[1] - A.z0]], 4.6, granite, granite);
  add(new THREE.PlaneGeometry(A.x1 - A.x0, A.z1 - A.z0), new THREE.MeshStandardMaterial({ color: 0xd8d2c6, roughness: 0.8, emissive: 0x1a1814, side: THREE.DoubleSide }), acx, Y0 + A.h, acz, 0, Math.PI / 2);
  const slot = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.85, 0.82) });
  for (let x = A.x0 + 2; x < A.x1 - 1; x += 3) add(new THREE.PlaneGeometry(0.12, A.z1 - A.z0 - 2), slot, x, Y0 + A.h - 0.02, acz, 0, Math.PI / 2);   // linear light slots
  add(new THREE.PlaneGeometry(3.4, 4.4), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.8, 0.85, 0.9) }), L.facadeX + 0.07, Y0 + 2.2, (A.door[0] + A.door[1]) / 2, Math.PI / 2);   // the lobby seen through the open door
  // reception: a long granite desk on the south side; a tenant directory; a visitor QR stand
  rbox(4.2, 1.1, 1.4, 0.05, granite, -38.5, Y0, -139.9);                                                 // reception, south side of the public lobby
  box(4.3, 0.05, 1.5, marbleDark, -38.5, Y0 + 1.1, -139.9);
  add(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: signTex([['友邦大厦 · 楼层指引', 34], ['10F  恒岳资本 Hengyue Capital', 26], ['8F  澄观设计 Chengguan Design', 26], ['5F  远航律师事务所 Yuanhang Law', 26], ['1–3F  友邦保险 AIA', 26]], { bg: '#121417', fg: '#e8e2d6', w: 768, h: 480 }) }), -38, Y0 + 2.4, A.z0 + 0.06, 0);
  box(0.4, 1.2, 0.3, dark, -36, Y0, -150.6);
  add(new THREE.PlaneGeometry(0.34, 0.5), new THREE.MeshBasicMaterial({ map: signTex([['访客预约', 40], ['扫码登记', 30], ['Visitor sign-in', 26]], { bg: '#f4f4f4', fg: '#222', w: 300, h: 420 }) }), -36, Y0 + 1.3, -150.44);
  // the doors stand open: two bronze leaves folded back into the arched reveal
  for (const s of [-1, 1]) box(0.08, 4.4, 1.6, brass, L.facadeX + 0.3, Y0, (A.door[0] + A.door[1]) / 2 + s * 2.4);
  // the speed gates: glass flaps between steel cabinets
  const flaps = [];
  for (const z of A.gates) {
    for (const s of [-1, 1]) box(1.2, 1.0, 0.18, new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 1, roughness: 0.25 }), A.gateX, Y0, z + s * 0.64);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.7), glass); const piv = new THREE.Group(); piv.position.set(A.gateX, Y0 + 0.55, z); piv.add(fl); fl.position.z = 0; fl.scale.set(1, 1, 1);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.7, 1.0), glass); piv.add(pane); group.add(piv);
    const light = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 0.4) })); light.position.set(A.gateX - 0.61, Y0 + 1.02, z + 0.64); light.rotation.x = -Math.PI / 2; group.add(light);
    const col = addDynamicCollider('gate'); Object.assign(col, { y0: 0, y1: 8, minX: A.gateX - 0.1, maxX: A.gateX + 0.1, minZ: z - 0.5, maxZ: z + 0.5 });
    flaps.push({ z, piv, pane, light, col, open: 0, until: 0 });
  }
  for (const z of [-148.5, -145.5, -142.5]) box(1.4, 2.7, 0.08, new THREE.MeshStandardMaterial({ color: 0x8b9096, metalness: 1, roughness: 0.3 }), A.x0 + 0.06, Y0, z, Math.PI / 2);   // lift doors
  for (const [x, z] of [[-41, -145.5], [-44.5, -149], [-37.5, -149]]) lights.push({ x, y: Y0 + A.h - 0.4, z, intensity: 12, distance: 10, color: new THREE.Color(0.95, 0.93, 0.88) });

  group.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  // ================= people =================
  const ppl = {};
  const placePerson = (id, role, x, z, yaw, clip = 'idle') => {
    if (!people) return null;
    const p = createPerson(people, people.manifest.cast[role] ? role : 'p1'); p.root.position.set(x, Y0, z); p.root.rotation.y = yaw; p.play(clip, 0);
    p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(p.root); ppl[id] = p; p.home = { x, z, yaw }; return p;
  };
  placePerson('receptionist', 'p2', P.x0 + 0.7, -227.6, Math.PI / 2);
  placePerson('concierge', 'p3', P.x0 + 0.7, -237.5, Math.PI / 2);
  placePerson('liftGuard', 'p4', -46, P.z0 + 1.6, 0);
  placePerson('doorman', 'p1', doorX + 2.6, -210.4, Math.PI);
  placePerson('guestA', 'vivian', -54.6, -221.0, -2.4, 'talk1');
  placePerson('guestB', 'p5', -55.8, -222.1, 0.8, 'talk2');
  placePerson('aiaDesk', 'p2', -38.5, -139.35, Math.PI);
  placePerson('aiaGuard', 'p4', A.gateX + 0.9, -141.9, Math.PI + 0.9);
  const worker = placePerson('aiaWorker', 'p3', A.x1 + 3, -145.5, -Math.PI / 2, 'walk');
  if (worker) worker.root.visible = false;

  const S = { key: false, said: {}, workerT: 20, workerPhase: 'away', guardPhone: 0, guardT: 0, caught: 0, inside: null, drumSpin: 0 };
  const L0 = () => getLife();
  const say = (who, zh, en, secs = 3) => hud.bark({ speaker: who, text: { zh, en }, seconds: secs });

  // ---------- AIA: the badge-in loop, the guard's attention, tailgating ----------
  function updateAia(dt, pp) {
    // a worker comes in from the street every ~45 s, badges through gate 2, walks to the lifts, rides up
    const w = worker; S.workerT -= dt;
    if (w) {
      const lane = A.gates[1];
      if (S.workerPhase === 'away' && S.workerT <= 0) { S.workerPhase = 'in'; w.root.visible = true; w.root.position.set(L.facadeX + 3, Y0, -145.5); w.play('walk', 0.2); }
      const go = (tx, tz, speed = 1.3) => { const dx = tx - w.root.position.x, dz = tz - w.root.position.z, d = Math.hypot(dx, dz); if (d < 0.08) return true; const st = Math.min(d, speed * dt); w.root.position.x += dx / d * st; w.root.position.z += dz / d * st; w.root.rotation.y = Math.atan2(dx, dz); w.setGait(speed); return false; };
      if (S.workerPhase === 'in' && go(A.gateX + 1.2, lane)) { S.workerPhase = 'badge'; S.workerT = 0.8; w.play('idle', 0.2); }
      if (S.workerPhase === 'badge') { if (S.workerT <= 0) { const f = flaps.find((q) => q.z === lane); f.until = 2.8; S.workerPhase = 'through'; w.play('walk', 0.2); audio && audio.cue && audio.cue('ping', 0, 0.3); } }
      if (S.workerPhase === 'through' && go(A.x0 + 1.8, -145.5)) { S.workerPhase = 'lift'; S.workerT = 3; w.play('idle', 0.3); }
      if (S.workerPhase === 'lift' && S.workerT <= 0) { w.root.visible = false; S.workerPhase = 'away'; S.workerT = 35 + Math.random() * 25; }
      if (w.root.visible) w.update(dt);
    }
    // the gates: flaps fold away while open
    for (const f of flaps) {
      f.until = Math.max(0, f.until - dt); const want = f.until > 0 ? 1 : 0;
      f.open += (want - f.open) * Math.min(1, dt * 8); f.pane.scale.z = 1 - 0.92 * f.open; f.pane.position.z = 0;
      f.light.material.color.setRGB(f.until > 0 ? 0.2 : 1.6, f.until > 0 ? 1.6 : 0.25, 0.3);
      if (f.open > 0.6) Object.assign(f.col, { minX: 1e6, maxX: 1e6 }); else Object.assign(f.col, { minX: A.gateX - 0.1, maxX: A.gateX + 0.1, minZ: f.z - 0.5, maxZ: f.z + 0.5 });
    }
    // the guard: watches the gates, but every so often he's on his phone
    const g = ppl.aiaGuard;
    if (g) {
      S.guardT -= dt;
      if (S.guardT <= 0) { S.guardPhone = S.guardPhone > 0 ? 0 : 1; S.guardT = S.guardPhone ? 6 + Math.random() * 4 : 9 + Math.random() * 8; }
      g.setPhoneHold(S.guardPhone ? 1 : 0); g.play(S.guardPhone ? 'idle' : 'look', 0.5);
      g.update(dt, S.guardPhone ? null : [pp.x, pp.z]);
      // through the gate line without a badge: seen (unless he's on his phone) -> walked back
      S.caught = Math.max(0, S.caught - dt);
      if (pp.x < A.gateX - 0.3 && pp.x > A.x0 && pp.z > A.z0 && pp.z < A.z1 && !S.passedAia) {
        const d = Math.hypot(pp.x - g.root.position.x, pp.z - g.root.position.z);
        if (!S.guardPhone && d < 9 && S.caught <= 0) {
          S.caught = 4; say(T('保安', 'Security'), '先生，先生！请刷卡，没有预约不能进去。', 'Sir! Sir, you need to badge in. No entry without an appointment.', 3.2);
          player.teleport(A.gateX + 1.6, -145.5, -Math.PI / 2, 0);
        } else if (S.caught <= 0) { S.passedAia = true; hud.toast(T('你跟着别人混了进去', 'You slipped in behind someone'), 3); L0().flags.aiaTailgated = true; save && save(); }
      }
      if (pp.x > A.gateX + 0.3) S.passedAia = false;
    }
    for (const id of ['aiaDesk']) if (ppl[id]) ppl[id].update(dt, Math.hypot(pp.x - ppl[id].root.position.x, pp.z - ppl[id].root.position.z) < 6 ? [pp.x, pp.z] : null);
  }

  // ---------- the Peace Hotel: staff watching, the revolving door ----------
  function updatePeace(dt, pp) {
    const near = (p, d) => p && Math.hypot(pp.x - p.root.position.x, pp.z - p.root.position.z) < d;
    for (const id of ['receptionist', 'concierge', 'liftGuard', 'doorman', 'guestA', 'guestB']) { const p = ppl[id]; if (p) p.update(dt, near(p, 6) && !id.startsWith('guest') ? [pp.x, pp.z] : null); }
    // the revolving door turns as you go through
    const inDoor = Math.abs(pp.x - doorX) < 1.4 && Math.abs(pp.z - -212.2) < 1.6;
    S.drumSpin += ((inDoor ? 1.6 : 0) - S.drumSpin) * Math.min(1, dt * 2); vanes.rotation.y += S.drumSpin * dt;
    if (inDoor && !S.doormanSaid && ppl.doorman) { S.doormanSaid = true; say(T('门童', 'Doorman'), '晚上好，沈先生。', 'Good evening, Mr Shen.', 2.2); }
    if (!inDoor && pp.z > -209) S.doormanSaid = false;
  }

  // ---------- what E does ----------
  const targets = [
    { id: 'pReception', x: P.x0 + 3.6, y: Y0 + 1.4, z: -227.6, reach: 2.6 },
    { id: 'pConcierge', x: P.x0 + 3.3, y: Y0 + 1.4, z: -237.5, reach: 2.6 },
    { id: 'pLifts', x: -48, y: Y0 + 1.6, z: P.z0 + 0.2, reach: 3.2 },
    { id: 'pStaff', x: P.x0 + 0.1, y: Y0 + 1.3, z: P.z1 - 21.1, reach: 2.2 },
    { id: 'aDesk', x: -38.5, y: Y0 + 1.4, z: -140.7, reach: 2.6 },
    { id: 'aQR', x: -36, y: Y0 + 1.3, z: -150.4, reach: 2.0 },
    ...A.gates.map((z, i) => ({ id: `aGate${i}`, x: A.gateX + 0.6, y: Y0 + 1.0, z, reach: 1.6 })),
    { id: 'aLifts', x: A.x0 + 0.8, y: Y0 + 1.6, z: -149.7, reach: 2.6 },
  ];
  const PROMPT = {
    pReception: () => [T('前台', 'Front desk'), T('交谈', 'Talk')], pConcierge: () => [T('礼宾部', 'Concierge'), waitingAt(L0(), 'hotel').length ? T('取快递', 'Collect your parcels') : T('交谈', 'Talk')],
    pLifts: () => [T('电梯', 'Lifts'), T('上楼', 'Go up')], pStaff: () => [T('员工通道', 'Staff only'), T('推门', 'Try the door')],
    aDesk: () => [T('前台', 'Reception'), T('交谈', 'Talk')], aQR: () => [T('访客预约', 'Visitor sign-in'), T('扫码', 'Scan')], aLifts: () => [T('电梯', 'Lifts'), T('呼叫', 'Call')],
  };
  // the desk staff look up now and then; busy with a guest or the screen otherwise
  const staffSees = () => (performance.now() / 1000) % 14 > 8;
  function interact(id) {
    const l = L0();
    if (id === 'pReception') {
      if (!S.key) { S.key = true; l.flags.hotelKey = true; say(T('前台', 'Front desk'), '沈先生，晚上好，欢迎回来。这是您的房卡，612，江景房。', "Good evening, Mr Shen, welcome back. Here's your key card: 612, a river-view room.", 3.6); hud.toast(T('拿到房卡 612', 'Key card for room 612'), 3); }
      else say(T('前台', 'Front desk'), '爵士吧九点半开始，今晚是老年爵士乐队，要帮您留位吗？', 'The Jazz Bar starts at half past nine. The Old Jazz Band tonight. Shall I hold a table for you?', 3.6);
    } else if (id === 'pConcierge') {
      const items = waitingAt(l, 'hotel');
      if (items.length) { for (const it of items) it.where = 'me'; say(T('礼宾部', 'Concierge'), `沈先生，您的快递，一共${items.length}件，都在这儿。`, `Mr Shen, your parcels: ${items.length}, all here.`, 3); hud.toast(T(`取回：${items.map((i) => i.name).join('、')}`, `Collected: ${items.map((i) => i.en).join(', ')}`), 3.6); save && save(); }
      else say(T('礼宾部', 'Concierge'), '目前没有您的快递哦。需要叫车的话我帮您约。', "Nothing waiting for you at the moment. If you need a car, I can book one.", 3);
    } else if (id === 'pLifts') {
      if (!(S.key || l.flags.hotelKey)) say(T('保安', 'Security'), '先生，电梯需要刷房卡，住客才能上去。', 'Sorry, sir, the lifts need a room card. Guests only.', 3);
      else {
        if (!S.said.lift) { S.said.lift = true; say(T('保安', 'Security'), '沈先生，六楼南边在装修，您那间不受影响。', "Mr Shen. The south end of six is being refitted, sir; your room's not affected.", 3.4); }
        onLift && onLift();
      }
    } else if (id === 'pStaff') {
      if (staffSees()) say(T('前台', 'Front desk'), '先生，那边是员工通道哦。', "Sir, that's the staff corridor.", 2.6);
      else hud.toast(T('门锁着。刷卡的。', "Locked. It takes a staff card."), 2.6);
    } else if (id === 'aDesk') {
      say(T('前台', 'Reception'), '您好，请问您找哪家公司？没有预约的话需要先在小程序上登记，被访人确认后人脸就能过闸机。上个月刚换的新闸机。', 'Hello, which company are you visiting? Without an appointment you register on the mini-program first; once your host confirms, your face opens the gates. They put the new gates in last month.', 5);
    } else if (id === 'aQR') {
      hud.toast(T('访客预约：请填写被访人手机号（你没有预约）', 'Visitor sign-in: enter your host\'s phone number (you have no appointment)'), 3.6);
    } else if (id.startsWith('aGate')) {
      hud.toast(T('人脸识别失败 · 请到前台登记', 'Face not recognised · please register at reception'), 2.6); audio && audio.cue && audio.cue('bump', 0, 0.3);
    } else if (id === 'aLifts') hud.toast(T('电梯需刷工卡', 'The lifts need a staff badge'), 2.4);
    return true;
  }

  return {
    group, lights,
    candidates() { return targets.map((t) => ({ ...t, cone: 0.6 })); },
    prompt(id) { const p = PROMPT[id] || (id.startsWith('aGate') ? () => [T('闸机', 'Gate'), T('刷脸', 'Face scan')] : null); if (!p) return null; const [target, action] = p(); return { target, action }; },
    owns(id) { return targets.some((t) => t.id === id); },
    interact,
    // the two guests talking in the hall (world/ambient.js gives them new things to say)
    talkPairs() {
      const a = ppl.guestA, b = ppl.guestB; if (!a || !b) return [];
      const at = (p) => () => [p.root.position.x, p.root.position.y + 1.6, p.root.position.z];
      return [{ keys: ['a', 'b'], near: (pp) => pp.y < 5 && Math.hypot(pp.x - a.root.position.x, pp.z - a.root.position.z) < 9,
        who: { a: { persona: 'office', card: 'a woman in her forties from Hong Kong staying at the Peace Hotel for a family wedding, chatty', at: at(a) }, b: { persona: 'office', card: 'her younger sister who lives in Shanghai, dry, practical', at: at(b) } } }];
    },
    talkables() {
      const P2 = { receptionist: 'receptionist', concierge: 'concierge', liftGuard: 'liftGuard', doorman: 'doorman', aiaDesk: 'aiaDesk', aiaGuard: 'aiaGuard' };
      return Object.entries(P2).filter(([k]) => ppl[k] && ppl[k].root.visible).map(([k, persona]) => { const r = ppl[k].root.position; return { key: k, persona, x: r.x, y: r.y + 1.62, z: r.z, hold() {} }; });
    },
    update(dt, pp) {
      const nearPeace = pp.z < -200 && pp.z > -262, nearAia = pp.z < -125 && pp.z > -165;
      if (nearPeace) updatePeace(dt, pp);
      if (nearAia) updateAia(dt, pp);
      for (const p of Object.values(ppl)) if (p !== worker) p.root.visible = p.home.z < -200 ? pp.z < -170 : Math.abs(pp.z - -145) < 60;   // only when you could see them
    },
  };
}
