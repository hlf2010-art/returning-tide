// The Peace Hotel's Jazz Bar, off the hall at the corner of the Bund and Nanjing Road, as the real one
// is: a low, dark, panelled room, a small stage, a bar along the street wall, little tables with
// lamps. The game's own band plays it (the real Old Jazz Band is real people; this is not them):
//   - a piano trio on the stage: the pianist and drummer sat at their instruments (two-bone IK from
//     driverPose.js, hands on the keys and the sticks, feet on the pedals), the bassist stood at an
//     upright bass. Their hands follow what engine/jazzPlayer.js is actually playing: the pianist's
//     left hand on the comping chords, right hand on the line, at the right place on the keyboard;
//     the drummer's stick on the ride; the bassist plucking each note, left hand up and down the neck
//   - open 19:00-01:00, the band 20:00-00:30. On the night Momo asked you to (agenda: momo-gig) he's
//     at the piano: tell the door his name, sit at the table by the stage; on the second number he
//     dedicates it to you; stay to the end of it and you were there (he'll say so in the group chat)
//   - a drink at the bar (fictional money from your phone's wallet) passes twenty minutes
// You hear them through the door in the hall, muffled; in the room, from the stage.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { L, colliders, addDynamicCollider } from './layout.js';
import { createPerson } from './people.js';
import { createSeatedPose, twoBone, turn } from './driverPose.js';
import { createJazzPlayer } from '../engine/jazzPlayer.js';
import { getLang } from '../ui/i18n.js';
import { stamp, nudge, post, skipTo, pay, clockText } from '../engine/life.js';

const Y0 = L.curbH;
export const JAZZ = { x0: -45.3, x1: -35.4, z0: -222.9, z1: -212.6, h: 3.4, door: [-44.6, -43.4], stage: { x0: -40.2, x1: -35.4, z0: -222.9, z1: -219.0, h: 0.3 } };
export const JAZZ_HOURS = { open: 19 * 60, close: 60, band: 20 * 60, bandEnd: 30 };
const J = JAZZ, ST = J.stage, SY = Y0 + ST.h;
const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const TABLES = [[-43.4, -216.6], [-41.0, -216.3], [-43.5, -219.7], [-41.3, -220.0], [-37.6, -216.8], [-36.4, -214.6]];
const RESERVED = 3, SEAT = { x: -42.05, z: -220.0, yaw: -1.34 };
const open = (tod) => tod >= JAZZ_HOURS.open || tod < JAZZ_HOURS.close;
const bandOn = (tod) => tod >= JAZZ_HOURS.band || tod < JAZZ_HOURS.bandEnd;

// ---- the plan (module load: the walls stand on the ground floor only) ----
const solid = (minX, maxX, minZ, maxZ, tag = 'wall') => { const c = { minX, maxX, minZ, maxZ, tag, y0: 0, y1: 8 }; colliders.push(c); return c; };
solid(J.x0 - 0.2, J.x0, J.z0 - 0.2, J.z1);                 // west partition
solid(J.x0 - 0.2, J.door[0], J.z0 - 0.2, J.z0);            // north partition, either side of the door
solid(J.door[1], J.x1, J.z0 - 0.2, J.z0);
solid(ST.x0, ST.x1, ST.z0, ST.z1, 'stage');
solid(J.x0, -39.4, -214.2, J.z1, 'bar');                   // the bar, and behind it
for (const [x, z] of TABLES) solid(x - 0.34, x + 0.34, z - 0.34, z + 0.34, 'table');

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const signTex = (lines, { bg = '#1a1510', fg = '#d9b46a', w = 512, h = 128 } = {}) => canvasTex(w, h, (x) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([t, size], i) => { x.font = `600 ${size}px "Noto Serif SC", serif`; x.fillText(t, w / 2, h * (i + 1) / (lines.length + 1)); });
});
const velvet = () => canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < w; i++) { const k = 0.55 + 0.45 * Math.sin(i / w * Math.PI * 14) ** 2; x.fillStyle = `rgb(${Math.round(120 * k)},${Math.round(14 * k)},${Math.round(18 * k)})`; x.fillRect(i, 0, 1, h); } });
const panelTex = () => canvasTex(256, 256, (x, w) => { x.fillStyle = '#2a170d'; x.fillRect(0, 0, w, w); for (let i = 0; i < 80; i++) { x.strokeStyle = `rgba(${60 + Math.random() * 30},${30 + Math.random() * 15},12,0.35)`; x.beginPath(); x.moveTo(0, Math.random() * w); x.bezierCurveTo(w / 3, Math.random() * w, w * 2 / 3, Math.random() * w, w, Math.random() * w); x.stroke(); } x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, w - 20); });
const photoWall = () => canvasTex(1024, 256, (x, w, h) => {
  x.fillStyle = '#1b120b'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) { const px = 20 + i * 168; x.fillStyle = '#e8e0cc'; x.fillRect(px, 30, 150, 190); const g = x.createLinearGradient(0, 40, 0, 200); g.addColorStop(0, '#6d5a42'); g.addColorStop(1, '#251c13'); x.fillStyle = g; x.fillRect(px + 10, 40, 130, 150);
    x.fillStyle = 'rgba(20,14,8,0.8)'; for (let k = 0; k < 3 + (i % 3); k++) { x.beginPath(); x.arc(px + 30 + k * 30, 110, 11, 0, Math.PI * 2); x.fill(); x.fillRect(px + 22 + k * 30, 122, 18, 60); }
    x.fillStyle = '#3a2e20'; x.font = '600 13px "Noto Serif SC", serif'; x.textAlign = 'center'; x.fillText(['1980', '1986', '1994', '2001', '2010', '2019'][i], px + 75, 210); }
});

export function createJazzBar({ scene, people, hud, audio, getLife, save, player, travel, onMode }) {
  const group = new THREE.Group(); group.name = 'jazz-bar'; scene.add(group);
  const walnut = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.4, metalness: 0.05, emissive: 0x070302 });
  const panel = new THREE.MeshStandardMaterial({ map: panelTex(), roughness: 0.45, emissive: 0x0d0703 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xead8b8, roughness: 0.9, emissive: 0x3a2814 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.3, metalness: 1, envMapIntensity: 1.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0f0b09, roughness: 0.8 });
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.12, metalness: 0.2, envMapIntensity: 1.5 });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.75, 0.42), side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9d9de, metalness: 1, roughness: 0.18 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb8893a, metalness: 1, roughness: 0.35 });
  const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; group.add(m); return m; };
  const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
  const rbox = (w, h, d, r, mat, x, y, z) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z);
  function wall(ax, az, bx, bz, y0, y1, mat, cx, cz) {
    const len = Math.hypot(bx - ax, bz - az), m = add(new THREE.PlaneGeometry(len, y1 - y0), mat, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
    const nx = -(bz - az) / len, nz = (bx - ax) / len, toward = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1;
    m.rotation.y = Math.atan2(nx * toward, nz * toward);
    if (mat.map) { m.material = mat.clone(); m.material.map = mat.map.clone(); m.material.map.wrapS = m.material.map.wrapT = THREE.RepeatWrapping; m.material.map.repeat.set(len / 1.2, (y1 - y0) / 1.2); m.material.map.needsUpdate = true; }
    return m;
  }
  const lights = [];
  const jcx = (J.x0 + J.x1) / 2, jcz = (J.z0 + J.z1) / 2;

  // ---- the partition, from the hall: wainscot, plaster, a brass-framed door, the name over it ----
  const hallSide = (ax, az, bx, bz, cx, cz) => { wall(ax, az, bx, bz, Y0, Y0 + 1.3, walnut, cx, cz); wall(ax, az, bx, bz, Y0 + 1.3, Y0 + 5.6, plaster, cx, cz); };
  hallSide(J.x0 - 0.2, J.z0 - 0.2, J.x0 - 0.2, J.z1, -50, jcz);
  hallSide(J.x0 - 0.2, J.z0 - 0.2, J.door[0], J.z0 - 0.2, jcx, -230); hallSide(J.door[1], J.z0 - 0.2, J.x1, J.z0 - 0.2, jcx, -230);
  wall(J.door[0], J.z0 - 0.2, J.door[1], J.z0 - 0.2, Y0 + 2.6, Y0 + 5.6, plaster, jcx, -230);
  for (const x of J.door) box(0.08, 2.6, 0.24, brass, x, Y0, J.z0 - 0.1);
  box(J.door[1] - J.door[0] + 0.16, 0.08, 0.24, brass, (J.door[0] + J.door[1]) / 2, Y0 + 2.6, J.z0 - 0.1);
  wall(J.door[0], J.z0 - 0.2, J.door[0], J.z0, Y0, Y0 + 2.6, walnut, (J.door[0] + J.door[1]) / 2, J.z0 - 0.1); wall(J.door[1], J.z0 - 0.2, J.door[1], J.z0, Y0, Y0 + 2.6, walnut, (J.door[0] + J.door[1]) / 2, J.z0 - 0.1);
  add(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshBasicMaterial({ map: signTex([['爵士吧 · JAZZ BAR', 48]], { w: 640, h: 128 }) }), (J.door[0] + J.door[1]) / 2, Y0 + 3.05, J.z0 - 0.21, Math.PI);
  add(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshBasicMaterial({ map: signTex([['爵士乐', 42], ['Jazz nightly', 30], ['20:00 – 00:30', 36]], { bg: '#121212', fg: '#e8d29a', w: 360, h: 512 }) }), J.door[1] + 1.1, Y0 + 1.2, J.z0 - 0.62, Math.PI);
  box(0.06, 1.0, 0.06, brass, J.door[1] + 1.1, Y0, J.z0 - 0.66);
  // the door leaf: stands open while the bar is open
  const hinge = new THREE.Group(); hinge.position.set(J.door[0], Y0, J.z0 - 0.1); group.add(hinge);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(J.door[1] - J.door[0] - 0.04, 2.55, 0.06), panel); leaf.position.set((J.door[1] - J.door[0]) / 2, 1.28, 0); hinge.add(leaf);
  const doorCol = addDynamicCollider('door'); Object.assign(doorCol, { minX: J.door[0], maxX: J.door[1], minZ: J.z0 - 0.2, maxZ: J.z0, y0: 0, y1: 8 });

  // ---- inside: panelling, a low dark ceiling, parquet, the stage with its curtain ----
  const inside = (ax, az, bx, bz) => wall(ax, az, bx, bz, Y0, Y0 + J.h, panel, jcx, jcz);
  inside(J.x0, J.z0, J.x0, J.z1); inside(J.x0, J.z1 - 0.04, J.x1, J.z1 - 0.04); inside(J.x1 - 0.04, J.z1, J.x1 - 0.04, J.z0);
  inside(J.x0, J.z0, J.door[0], J.z0); inside(J.door[1], J.z0, ST.x0, J.z0);
  wall(J.door[0], J.z0, J.door[1], J.z0, Y0 + 2.6, Y0 + J.h, panel, jcx, jcz);
  wall(ST.x0, J.z0 + 0.02, ST.x1, J.z0 + 0.02, SY, Y0 + J.h, new THREE.MeshStandardMaterial({ map: velvet(), roughness: 0.95, emissive: 0x1a0204 }), jcx, jcz);   // the curtain behind the band
  add(new THREE.PlaneGeometry(J.x1 - J.x0, J.z1 - J.z0), dark, jcx, Y0 + J.h, jcz, 0, Math.PI / 2);
  add(new THREE.PlaneGeometry(J.x1 - J.x0, J.z1 - J.z0), new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.35, metalness: 0.05 }), jcx, Y0 + 0.006, jcz, 0, -Math.PI / 2);
  box(ST.x1 - ST.x0, ST.h, ST.z1 - ST.z0, walnut, (ST.x0 + ST.x1) / 2, Y0, (ST.z0 + ST.z1) / 2);
  box(ST.x1 - ST.x0, 0.03, 0.04, brass, (ST.x0 + ST.x1) / 2, Y0 + ST.h - 0.03, ST.z1 + 0.01);
  box(0.04, 0.03, ST.z1 - ST.z0, brass, ST.x0 - 0.01, Y0 + ST.h - 0.03, (ST.z0 + ST.z1) / 2);
  add(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshStandardMaterial({ map: photoWall(), roughness: 0.6, emissive: 0x100a06 }), J.x0 + 0.02, Y0 + 1.75, -217.0, Math.PI / 2);
  add(new THREE.PlaneGeometry(1.6, 0.3), new THREE.MeshBasicMaterial({ map: signTex([['PEACE HOTEL JAZZ BAR', 44]], { bg: '#00000000', w: 640, h: 120 }), transparent: true, color: new THREE.Color(1.3, 1.2, 1.0) }), (ST.x0 + ST.x1) / 2, Y0 + J.h - 0.35, J.z0 + 0.04);
  // downlights: small, warm, over the tables and the stage
  for (let x = J.x0 + 1; x < J.x1; x += 2.2) for (let z = J.z1 - 1.2; z > J.z0; z -= 2.4) add(new THREE.CircleGeometry(0.06, 12), lampMat, x, Y0 + J.h - 0.005, z, 0, Math.PI / 2);
  // ---- the bar: walnut front, marble top, brass rail, stools; the back bar's bottles lit from below ----
  rbox(4.8, 1.08, 0.7, 0.03, walnut, -41.8, Y0, -213.85);
  box(4.9, 0.05, 0.78, new THREE.MeshStandardMaterial({ color: 0x1c2420, roughness: 0.22, envMapIntensity: 1.3 }), -41.8, Y0 + 1.08, -213.85);
  add(new THREE.CylinderGeometry(0.025, 0.025, 4.8, 8), brass, -41.8, Y0 + 0.22, -214.28).rotation.z = Math.PI / 2;
  for (let i = 0; i < 4; i++) { const x = -43.6 + i * 1.2; add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), new THREE.MeshStandardMaterial({ color: 0x5c1f1c, roughness: 0.5 }), x, Y0 + 0.76, -214.75); add(new THREE.CylinderGeometry(0.03, 0.05, 0.74, 8), brass, x, Y0 + 0.37, -214.75); }
  box(4.6, 0.04, 0.3, walnut, -41.8, Y0 + 1.25, -212.78); box(4.6, 0.04, 0.3, walnut, -41.8, Y0 + 1.75, -212.78);
  box(4.6, 0.02, 0.06, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.0, 0.5) }), -41.8, Y0 + 1.27, -212.66);
  { const bottleGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.3, 10), cols = [0x6b3a12, 0x2d5a2a, 0xc8b88a, 0x3a1810, 0x8a5a1a, 0x1e3a4a];
    const mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, emissive: c, emissiveIntensity: 0.6 }));
    for (const y of [1.27, 1.77]) for (let i = 0; i < 26; i++) add(bottleGeo, mats[(i * 7 + (y > 1.5 ? 3 : 0)) % mats.length], -43.95 + i * 0.172 + (Math.random() - 0.5) * 0.03, Y0 + y + 0.15, -212.76); }
  lights.push({ x: -41.8, y: Y0 + 2.9, z: -214.0, intensity: 5, distance: 6, color: new THREE.Color(1.0, 0.7, 0.4) });
  // ---- tables: marble tops, a red-shaded lamp, two bistro chairs ----
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x4a1a14, roughness: 0.55 });
  const chairs = [];
  function chair(x, z, yaw) {
    const g = new THREE.Group(); g.position.set(x, Y0, z); g.rotation.y = yaw; group.add(g);
    const p = (w, h, d, px, py, pz, m = chairMat) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.3), m); o.position.set(px, py + h / 2, pz); g.add(o); };
    p(0.44, 0.07, 0.42, 0, 0.44, 0); p(0.42, 0.42, 0.05, 0, 0.5, -0.2); for (const dx of [-0.18, 0.18]) for (const dz of [-0.17, 0.17]) p(0.03, 0.44, 0.03, dx, 0, dz, brass);
    chairs.push({ x, z, yaw }); return g;
  }
  TABLES.forEach(([x, z], i) => {
    add(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0x1c2420, roughness: 0.25 }), x, Y0 + 0.73, z); add(new THREE.CylinderGeometry(0.04, 0.16, 0.72, 10), brass, x, Y0 + 0.36, z);
    add(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 12, 1, true), lampMat, x + 0.08, Y0 + 0.84, z - 0.06); add(new THREE.CylinderGeometry(0.012, 0.03, 0.06, 8), brass, x + 0.08, Y0 + 0.76, z - 0.06);
    // chairs face the table, placed on its west and east sides (the reserved one: west, toward the stage)
    chair(x - 0.72, z, Math.PI / 2); chair(x + 0.72, z, -Math.PI / 2);
    if (i === RESERVED) add(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshBasicMaterial({ map: signTex([['预留 · Reserved', 40]], { bg: '#f1ece1', fg: '#3a2e20', w: 512, h: 160 }) }), x - 0.08, Y0 + 0.78, z + 0.1, -Math.PI / 2 + 0.3, 0);
  });
  lights.push({ x: -42.4, y: Y0 + 3.0, z: -218.0, intensity: 4, distance: 7, color: new THREE.Color(1.0, 0.62, 0.36) });

  // ---- the instruments ----
  // a baby grand, keyboard to the west (the pianist sits facing the Bund, side-on to the room)
  const PIANO = { kx: -38.0, kz: -221.4, ky: SY + 0.74 };
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.72, 0); sh.lineTo(0.72, 0); sh.lineTo(0.72, 1.0); sh.bezierCurveTo(0.72, 1.6, 0.2, 1.85, -0.1, 1.75); sh.bezierCurveTo(-0.5, 1.6, -0.72, 1.3, -0.72, 1.0); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }); g.rotateX(Math.PI / 2); g.rotateY(Math.PI / 2);   // the case runs east from the keys
    add(g, lacquer, PIANO.kx + 0.12, SY + 0.98, PIANO.kz);
    // the lid: hinged on the straight (bass) side, propped open on the curve, toward the room
    const lg = new THREE.ShapeGeometry(sh); lg.rotateX(Math.PI / 2); lg.rotateY(Math.PI / 2); lg.translate(0, 0, 0.72);
    const pivot = new THREE.Group(); pivot.position.set(PIANO.kx + 0.12, SY + 1.0, PIANO.kz - 0.72); pivot.rotation.x = -0.55; group.add(pivot);
    const lid = new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.12, metalness: 0.2, envMapIntensity: 1.5, side: THREE.DoubleSide })); pivot.add(lid);
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.62, 6), lacquer, PIANO.kx + 1.1, SY + 1.26, PIANO.kz + 0.55).rotation.x = -0.35;   // the prop stick
    for (const [lx, lz] of [[0.25, -0.6], [0.25, 0.6], [1.7, 0.05]]) add(new THREE.CylinderGeometry(0.05, 0.04, 0.68, 8), lacquer, PIANO.kx + lx, SY + 0.34, PIANO.kz + lz);
    box(0.2, 0.05, 1.3, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.4 }), PIANO.kx + 0.06, PIANO.ky - 0.05, PIANO.kz);
    for (let i = 0; i < 36; i++) if ([1, 3, 6, 8, 10].includes(i % 12)) box(0.11, 0.03, 0.012, lacquer, PIANO.kx + 0.1, PIANO.ky, PIANO.kz - 0.62 + (i / 36) * 1.24);
    box(0.5, 0.48, 0.9, lacquer, PIANO.kx - 0.55, SY, PIANO.kz);                                       // the bench
  }
  // the drum kit: kick, snare, a tom, hi-hat, ride; the drummer faces the room
  const DR = { x: -39.55, z: -222.35 };
  const KIT = { snare: new THREE.Vector3(DR.x + 0.02, SY + 0.62, DR.z + 0.48), ride: new THREE.Vector3(DR.x - 0.5, SY + 0.96, DR.z + 0.5), hat: new THREE.Vector3(DR.x + 0.42, SY + 0.86, DR.z + 0.42) };
  {
    const shell = new THREE.MeshStandardMaterial({ color: 0x6a1010, roughness: 0.3, metalness: 0.2, envMapIntensity: 1.2 }), head = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.7 }), front = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.8 });
    const kick = add(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 24), shell, DR.x, SY + 0.29, DR.z + 0.85); kick.rotation.x = Math.PI / 2;
    add(new THREE.CircleGeometry(0.27, 24), front, DR.x, SY + 0.29, DR.z + 1.035);
    add(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 20), shell, KIT.snare.x, KIT.snare.y - 0.08, KIT.snare.z); add(new THREE.CircleGeometry(0.175, 20), head, KIT.snare.x, KIT.snare.y - 0.005, KIT.snare.z, 0, -Math.PI / 2);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 20), shell, DR.x - 0.12, SY + 0.72, DR.z + 0.78).rotation.x = 0.3;
    for (const [v, r] of [[KIT.ride, 0.27], [KIT.hat, 0.17]]) { add(new THREE.CylinderGeometry(r, r * 0.98, 0.01, 28), bronze, v.x, v.y, v.z); add(new THREE.CylinderGeometry(0.01, 0.012, v.y - SY, 6), chrome, v.x, SY + (v.y - SY) / 2, v.z); }
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.01, 28), bronze, KIT.hat.x, KIT.hat.y - 0.03, KIT.hat.z);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), dark, DR.x, SY + 0.46, DR.z);                     // the throne
    add(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 6), chrome, DR.x, SY + 0.21, DR.z);
  }
  // the upright bass: a carved body, neck and scroll, strings; leant toward the bassist
  const BA = { x: -36.9, z: -219.85, yaw: -0.64 };
  const bassGroup = new THREE.Group(); bassGroup.position.set(BA.x, SY, BA.z); bassGroup.rotation.y = BA.yaw; group.add(bassGroup);
  const bass = new THREE.Group(); bass.position.set(0.16, 0, 0.36); bass.rotation.set(-0.16, 0.25, 0.08); bassGroup.add(bass);
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a3a14, roughness: 0.32, metalness: 0.05, envMapIntensity: 1.2 });
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24, y = 0.12 + t * 1.05; const w = 0.06 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (t < 0.45 ? 1 : t < 0.6 ? 0.72 + (t - 0.45) * 0.5 : 0.8 - (t - 0.6) * 0.6); pts.push(new THREE.Vector2(Math.max(0.05, w), y)); }
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), wood); body.scale.set(1, 1, 0.38); bass.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.05), dark); neck.position.set(0, 1.5, 0.08); bass.add(neck);
    const scroll = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.018, 6, 12), wood); scroll.position.set(0, 1.92, 0.06); scroll.rotation.y = Math.PI / 2; bass.add(scroll);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.004, 0.14, 6), chrome); pin.position.y = 0.06; bass.add(pin);
    for (const dx of [-0.018, -0.006, 0.006, 0.018]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 1.45, 3), chrome); s.position.set(dx, 1.12, 0.12); bass.add(s); }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.6 })); bridge.position.set(0, 0.62, 0.12); bass.add(bridge);
  }
  lights.push({ x: -38.0, y: Y0 + J.h - 0.2, z: -220.8, intensity: 7, distance: 6, color: new THREE.Color(1.0, 0.72, 0.42), angle: 0.9 });
  group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; if (!o.material.transparent && !o.material.isMeshBasicMaterial) o.castShadow = true; } });

  // the music first: the musicians' hands read what it struck
  const jz = createJazzPlayer(audio);
  // ================= people =================
  const ppl = {};
  const frameAt = (x, z, yaw, y = SY) => { const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = yaw; group.add(f); return f; };
  function seated(id, role, frame, cabin, opts) {
    if (!people) return null;
    const p = createPerson(people, people.manifest.cast[role] ? role : 'p1'); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    frame.add(p.root); p.play('idle', 0); p.update(0); const pose = createSeatedPose(p, opts);
    ppl[id] = { p, frame, cabin, pose, seated: true, acc: Math.random() }; return ppl[id];
  }
  const v = new THREE.Vector3(), w2 = new THREE.Vector3();
  // the pianist: hands where the notes are (middle C at the keyboard's centre, treble to his right)
  const kbz = (m) => PIANO.kz + (m - 60) * 0.0142;
  const pianist = seated('pianist', 'p1', frameAt(PIANO.kx - 0.55, PIANO.kz, Math.PI / 2, SY + 0.0), {
    hip: new THREE.Vector3(0, 0.52, -0.02), pedals: [new THREE.Vector3(-0.12, 0.06, 0.5), new THREE.Vector3(0.14, 0.06, 0.52)],
    rimPoint(a, out) {
      const H = jz.hits, now = jz.now();
      const lh = a < 0, hitT = lh ? H.comp : H.lead, m = lh ? H.compMidi + 2 : H.leadMidi, s = Math.max(0, now - hitT);
      const lift = Math.min(0.045, s * 0.25) * (s < 1.2 ? 1 : 0.6) + (jz.playing ? 0 : 0.03);
      return out.set(PIANO.kx + 0.12, PIANO.ky + 0.03 + lift, kbz(Math.max(40, Math.min(90, m))) + (lh ? -0.02 : 0.02));
    },
  }, { recline: -0.22, elbows: 0.35 });
  // the drummer: right stick on the ride, left on the snare (brushes), feet on the kick and hi-hat
  const drummer = seated('drummer', 'p4', frameAt(DR.x, DR.z, 0, SY + 0.04), {
    hip: new THREE.Vector3(0, 0.5, 0), pedals: [new THREE.Vector3(0.28, 0.06, 0.42), new THREE.Vector3(-0.02, 0.06, 0.55)],
    rimPoint(a, out) {
      const H = jz.hits, now = jz.now();
      if (a > 0) { const s = Math.max(0, now - H.ride); return out.copy(KIT.ride).add(w2.set(0.18, 0.04 + Math.min(0.12, s * 0.5), -0.22)); }
      const s = Math.max(0, now - H.snare), sweep = Math.sin(now * 2.2) * 0.05;
      return out.copy(KIT.snare).add(w2.set(0.12 + sweep, 0.05 + Math.min(0.08, s * 0.4), -0.24));
    },
  }, { recline: -0.05, elbows: 0.7 });
  const sticks = [0, 1].map(() => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xd8b880, roughness: 0.6 })); s.geometry.rotateX(Math.PI / 2); s.geometry.translate(0, 0, 0.17); group.add(s); return s; });
  // the bassist, stood
  if (people) { const p = createPerson(people, 'p3'); p.root.position.set(BA.x, SY, BA.z); p.root.rotation.y = BA.yaw; p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root); p.play('idle', 0); ppl.bassist = { p, arms: ['L', 'R'].map((s) => ['UpperArm', 'Forearm', 'Hand'].map((n) => p.root.getObjectByName(`Bip01_${s}_${n}`))) }; }
  // the people out front: a host by the door, a bartender, guests at the tables
  const standing = (id, role, x, z, yaw, clip = 'idle') => { if (!people) return null; const p = createPerson(people, people.manifest.cast[role] ? role : 'p1'); p.root.position.set(x, Y0, z); p.root.rotation.y = yaw; p.play(clip, 0); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root); ppl[id] = { p, home: { x, z, yaw } }; return ppl[id]; };
  standing('host', 'p2', -45.0, -222.2, 2.6);
  standing('bartender', 'p3', -42.4, -213.05, Math.PI);
  const guests = [[0, 'west', 'p5'], [0, 'east', 'p1'], [2, 'west', 'p2'], [4, 'west', 'p4'], [4, 'east', 'p5'], [1, 'east', 'p3']];
  guests.forEach(([ti, side, role], i) => {
    const [tx, tz] = TABLES[ti], sx = tx + (side === 'west' ? -0.72 : 0.72), yaw = side === 'west' ? Math.PI / 2 : -Math.PI / 2;
    seated(`guest${i}`, role, frameAt(sx, tz, yaw, Y0), {
      hip: new THREE.Vector3(0, 0.5, -0.04), pedals: [new THREE.Vector3(-0.12, 0.06, 0.4), new THREE.Vector3(0.12, 0.06, 0.38)],
      rimPoint(a, out) { return out.set(tx + (side === 'west' ? -0.25 : 0.25), Y0 + 0.78, tz + a * (side === 'west' ? 0.16 : -0.16)); },
    }, { recline: 0.06, elbows: 0.5 });
  });

  // ================= the music, the night =================
  const S = { heard: 0, inBar: false, dedicated: 0, greeted: false, nodT: 0, seated: false, lookYaw: 0, drinks: 0, nightSeed: 0 };
  const L0 = () => getLife();
  const say = (who, zh, en, secs = 3) => hud.bark({ speaker: who, text: { zh, en }, seconds: secs });
  const gig = () => { const l = L0(), inv = l.invites.find((i) => i.id === 'momo-gig'), now = stamp(l); return inv && inv.status === 'accepted' && !inv.kept && now >= inv.at - 15 && now <= inv.at + 120 ? inv : null; };
  const pianistName = () => (gig() || S.dedicated ? 'Momo' : T('钢琴手', 'Pianist'));
  jz.on((e) => {
    if (e.type === 'tune') {
      if (S.inBar) S.heard++;
      const inv = gig();
      if (inv && S.inBar && S.heard >= 2 && !S.dedicated) {
        S.dedicated = e.no; S.nodT = 7;
        say('Momo', '下一首……送给我兄弟白白，今天刚从旧金山回来。欢迎回家。', "This next one... is for my friend Baibai, just back from San Francisco. Welcome home.", 5);
      }
    } else if (e.type === 'end' && S.dedicated === e.no) {
      const inv = gig();
      if (inv && S.inBar) {
        const l = L0(); inv.kept = true; nudge(l, 'momo', 6, 'kept:momo-gig');
        post(l, 'wuhu', { from: 'momo', kind: 'text', text: '白白今天来了！！第二首就是为他弹的😎' });
        hud.toast(T('Momo 冲你举了举杯。', 'Momo raises a glass to you.'), 3.2); save && save();
      }
    }
  });

  const targets = [
    { id: 'jDoor', x: (J.door[0] + J.door[1]) / 2, y: Y0 + 1.4, z: J.z0 - 0.25, reach: 2.4 },
    { id: 'jSeat', x: SEAT.x, y: Y0 + 0.6, z: SEAT.z, reach: 2.2 },
    { id: 'jBar', x: -41.8, y: Y0 + 1.15, z: -214.25, reach: 2.4 },
  ];
  const PROMPT = {
    jDoor: () => [T('爵士吧', 'Jazz Bar'), T('19:00 开门', 'Opens at 7pm')],
    jSeat: () => [gig() ? T('Momo 留的位置', 'The table Momo kept') : T('靠舞台的桌子', 'A table by the stage'), T('坐下听', 'Sit and listen')],
    jBar: () => [T('吧台', 'The bar'), T('点一杯 ¥128', 'A drink, ¥128')],
  };
  function interact(id) {
    const l = L0();
    if (id === 'jDoor') say(T('门口服务员', 'Host'), '七点开门，先生。乐队八点上台。', "We open at seven, sir. The band's on at eight.", 2.6);
    else if (id === 'jSeat') sit();
    else if (id === 'jBar') {
      const r = pay(l, { method: 'wechat', amount: 128, to: '和平饭店爵士吧', memo: 'Whisky sour', kind: 'purchase' });
      if (!r.ok) { say(T('调酒师', 'Bartender'), '先生，信语好像没付成功。', "Sir, the Xinyu payment didn't go through.", 2.4); return true; }
      S.drinks++;
      say(T('调酒师', 'Bartender'), '威士忌酸，您慢用。', 'A whisky sour, sir. Enjoy.', 2.2);
      const until = stamp(l) + 20;
      travel(async () => { skipTo(l, until); save && save(); }, { line: T(`慢慢喝完一杯 · ${clockText(until)}`, `You take your time over it · ${clockText(until)}`), down: 500, hold: 600, up: 600 });
    }
    return true;
  }
  function sit() { S.seated = true; player.teleport(SEAT.x, SEAT.z, SEAT.yaw, -0.05); onMode && onMode('seat'); }
  function stand() { S.seated = false; player.teleport(SEAT.x - 0.1, SEAT.z + 0.75, SEAT.yaw, -0.05); onMode && onMode('play'); }

  return {
    group, lights, sit, stand,
    get seated() { return S.seated; },
    seatPrompt() { return { target: T('爵士吧', 'Jazz Bar'), action: T('起身', 'Stand up') }; },
    seatCamera(camera) { camera.position.set(SEAT.x, Y0 + 1.18, SEAT.z); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ'); },
    candidates() { const tod = stamp(L0()) % 1440, pp = player.body; if (pp.y > 5) return []; return targets.filter((t) => (t.id === 'jDoor' ? !open(tod) : open(tod))).map((t) => ({ ...t, cone: 0.6 })); },
    prompt(id) { const p = PROMPT[id]; if (!p) return null; const [target, action] = p(); return { target, action }; },
    owns(id) { return targets.some((t) => t.id === id); },
    interact,
    get music() { return jz; },
    talkPairs() {
      const a = ppl.guest0, b = ppl.guest1; if (!a || !b) return [];
      const at = (q) => () => { const v = q.p.bones.head.getWorldPosition(new THREE.Vector3()); return [v.x, v.y, v.z]; };
      return [{ keys: ['a', 'b'], near: () => S.inBar, who: { a: { persona: 'office', card: 'a woman of about thirty on a second date at the Jazz Bar, funny, a little nervous', at: at(a) }, b: { persona: 'youngMan', card: 'her date, an engineer of about thirty, trying hard to seem relaxed', at: at(b) } } }];
    },
    talkables() { return ['host', 'bartender'].filter((k) => ppl[k] && group.visible).map((k) => { const r = ppl[k].p.root.position; return { key: k, persona: k, x: r.x, y: r.y + 1.62, z: r.z, hold() {} }; }); },
    get inBar() { return S.inBar; },
    update(dt, pp, cam) {
      const l = L0(), tod = stamp(l) % 1440;
      const nearHotel = pp.y < 5 && pp.z < -205 && pp.z > -250 && pp.x < -30 && pp.x > -62;
      group.visible = nearHotel;
      const isOpen = open(tod);
      // the door: open in opening hours
      hinge.rotation.y += ((isOpen ? -1.6 : 0) - hinge.rotation.y) * Math.min(1, dt * 2);
      if (isOpen) Object.assign(doorCol, { minX: 1e6, maxX: 1e6 }); else Object.assign(doorCol, { minX: J.door[0], maxX: J.door[1] });
      const inBar = pp.y < 5 && pp.x > J.x0 && pp.x < J.x1 && pp.z > J.z0 && pp.z < J.z1;
      if (inBar && !S.inBar && isOpen && !S.greeted) {
        S.greeted = true;
        if (gig()) say(T('门口服务员', 'Host'), '您是 Momo 的朋友吧？前排给您留了位置，舞台边上那张。', "You must be Momo's friend. We kept you a table at the front, by the stage.", 3.6);
        else say(T('门口服务员', 'Host'), '晚上好，一位吗？这边请。', 'Good evening. Just one? This way, please.', 2.6);
      }
      if (!nearHotel) S.greeted = false;
      S.inBar = inBar;
      // the band: on while it's their hours and you're near enough to hear
      const play = isOpen && bandOn(tod) && nearHotel;
      if (play && !jz.playing) { jz.start(l.clock.day * 17 + 3); S.heard = 0; }
      if (!play && jz.playing) jz.stop();
      if (jz.playing) {
        const dx = -38.2 - pp.x, dz = -221 - pp.z, d = Math.hypot(dx, dz);
        let level, cutoff;
        if (inBar) { level = 0.95; cutoff = 16000; }
        else { const dd = Math.hypot(pp.x - (J.door[0] + J.door[1]) / 2, pp.z - J.z0); level = 0.5 / (1 + dd / 4); cutoff = 900 + 1800 / (1 + dd / 3); }
        const yaw = cam ? cam.rotation.y : player.yaw, rx = Math.cos(yaw), rz = -Math.sin(yaw);
        jz.update(level, cutoff, d > 0.5 ? Math.max(-0.8, Math.min(0.8, (dx * rx + dz * rz) / d)) : 0);
      }
      if (!nearHotel) return;
      // the people: band posed every frame while you can see them; the room at a lower rate
      const look = [pp.x, pp.z];
      for (const [id, q] of Object.entries(ppl)) {
        if (q.seated) {
          const band = id === 'pianist' || id === 'drummer';
          q.acc += dt; if (!band && q.acc < 0.25) continue;
          const step = band ? dt : q.acc; q.acc = 0;
          q.p.root.position.set(0, 0, 0); q.p.update(step, id === 'pianist' && S.nodT > 0 ? look : null);
          q.frame.updateMatrixWorld(true); q.pose(q.cabin, q.frame);
        } else if (id === 'bassist') {
          const p = q.p, H = jz.hits, now = jz.now();
          p.update(dt, null);
          // left hand on the neck (higher up for lower notes), right hand plucking across the strings
          const m = Math.max(33, Math.min(55, H.bassMidi)), s = Math.max(0, now - H.bass);
          bass.updateMatrixWorld(true);
          v.set(0.04, 1.62 - (m - 33) / 22 * 0.42, 0.1); bass.localToWorld(v);
          twoBone(q.arms[0][0], q.arms[0][1], q.arms[0][2], v, w2.set(0, 0.3, 0).add(new THREE.Vector3(Math.cos(BA.yaw), 0, -Math.sin(BA.yaw))).normalize());
          v.set(-0.03 + Math.min(0.06, s * 0.4) * (jz.playing ? 1 : 0), 0.92, 0.16); bass.localToWorld(v);
          twoBone(q.arms[1][0], q.arms[1][1], q.arms[1][2], v, w2.set(-Math.cos(BA.yaw), -1, Math.sin(BA.yaw)).normalize());
        } else q.p.update(dt, Math.hypot(pp.x - q.p.root.position.x, pp.z - q.p.root.position.z) < 5 ? look : null);
      }
      // Momo's nod as he dedicates the tune
      S.nodT = Math.max(0, S.nodT - dt);
      if (pianist && S.nodT > 0 && S.nodT < 6) { const head = pianist.p.bones.head; if (head) turn(head, v.set(0, 0, 1), Math.sin((6 - S.nodT) * 5) * 0.12 * (S.nodT > 4.5 ? 1 : 0)); }
      // the drummer's sticks follow his hands toward what they strike
      if (drummer) for (const [i, toward] of [[0, KIT.ride], [1, KIT.snare]]) {
        const hand = drummer.p.bones[i === 0 ? 'R' : 'L']; if (!hand) continue;
        hand.getWorldPosition(v); sticks[i].position.copy(v); sticks[i].lookAt(toward);
      }
    },
  };
}
