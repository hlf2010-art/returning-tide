// The year in the world (the rules and the words are world/career.js and its scene files):
//   THE FIRM     Marlowe Finch's floor, IFC Tower 2, 28F: four storeys under the robot-arm start-up
//                (world/destinations.js), the same footprint and the same windows back across the
//                river. Open desks, a glass meeting room, the pantry, two lifts. Arrive on a working
//                day (metro or DiDi to Lujiazui) and the day's scene plays (1-4 to answer); then the
//                desk: E works you through to 18:30. One lift goes down (Line 2 back to the Bund),
//                the other up to 32F when you're expected there
//   32F          the start-up's days happen at the two desks Zhou lends you upstairs: that floor is
//                destinations.js's; this module only plays its own scene there
//   A SCENE CARD the days at Yushen Technology and at the works in Nanjing are played over a card
//                (the place, the date, the conversation): those interiors are not built
//   THE FLAT     whichever he rents: one room, a bed (sleep), a desk (the notebook), a door (a DiDi
//                back to the Bund, or straight to work). Three listings, one plan at three heights
//   THE STALL    January to April, the watch-repairer's daughter at the stall on Hankou Road
//   and the calendar's part on screen: the date chip, the new day's announcement (how long has
//   passed, what was paid), the routing of arrivals at Lujiazui / Hongqiao / home.
// For others: OFFICE and FLATS (positions), yearWorld.enter('firm' | 'flat'), .here, .arrive(id, info).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import './../ui/year.css';
import { colliders, addFloor, addDynamicCollider, stall as STALL_SPOT, L as LAYOUT } from './layout.js';
import { createPerson } from './people.js';
import { getLang } from '../ui/i18n.js';
import { stamp, skipTo, pay, clockText } from '../engine/life.js';
import { logTime, slept } from '../engine/allot.js';
import { DESTINATIONS, dest, fare } from '../engine/ride.js';
import { isYear, career, actOf } from '../engine/year.js';
import { PICKUP } from './didi.js';
import { PLACES } from './destinations.js';
import { work, todaysWork, arriveAtWork, enterScene, partScript, finishScene, workFull, rollover, runCareer, recordHandoff, zhouMinHere, zhouMinScript, playScene,
  shortDate, passLine, hasFlat, home, LISTINGS, FIRM, CAREER_NAMES, WORK_HOURS, inLimbo, startup } from './career.js';

const T = (zh, en) => (getLang() === 'zh' ? zh : en);
const TB = (b) => (b ? T(b.zh, b.en) : '');
// ---- where things are (exported: the district's doors and anyone else's scenes can use them) ----
export const OFFICE = {
  y: 120.0, h: 3.4, x0: 668.6, x1: 690, z0: 39, z1: 58,
  spawn: { x: 687.6, z: 54.2, yaw: Math.PI / 2 }, meetingSpawn: { x: 677.6, z: 54.9, yaw: Math.PI / 2 },
  lift: { x: 689.9, z: 55.6 }, liftUp: { x: 689.9, z: 52.6 },
  desk: { x: 682.2, z: 46.95 }, coffee: { x: 681.5, z: 57.5 }, window: { x: 668.8, z: 45 },
  meeting: { x0: 669.2, x1: 676.4, z0: 50.9, z1: 57.6, door: [54.2, 55.6], table: { x: 672.8, z: 54.3 } },
  stand: { zhiwei: [684.6, 48.6, 1.3], taoke: [679.4, 47.6, 0.6], shaofeng: [676.2, 44.3, 1.2], partner: [686.2, 45.2, 1.9] },
  seats: { feng: [671.4, 52.7, 3.14], chair: [672.8, 52.7, 3.14], gu: [674.2, 52.7, 3.14], hr: [672.0, 52.7, 3.14], partner: [671.6, 56.0, 0], zhiwei: [673.0, 56.0, 0], shaofeng: [674.4, 56.0, 0], taoke: [675.3, 56.3, 0.4] },
};
export const FLATS = {
  x0: 36, x1: 43, z0: -706, z1: -700.4, h: 2.9,
  y: { tilanqiao: 9, dianchi: 30, northbund: 70 },
  spawn: { x: 42.0, z: -705.0, yaw: Math.PI / 2 }, door: { x: 42.95, z: -705.0 }, hook: { x: 42.95, z: -703.6 },
  bed: { x: 37.6, z: -704.6 }, desk: { x: 39.9, z: -700.75 }, window: { x: 38.5, z: -700.45 },
};
// Zhiwei is c4 in the street too (romance/zhiwei.js): one body for one person
const AVATAR = { zhiwei: 'c4', taoke: 'c2', shaofeng: 'c5', partner: 'c6', feng: 'su', gu: 'p1', chair: 'c7', hr: 'c8', zhoumin: 'c3' };
// floors and walls (module load: movement reads the colliders as they are)
{
  const P = OFFICE; addFloor({ id: 'firm-28f', x0: P.x0, x1: P.x1, z0: P.z0, z1: P.z1, y: P.y });
  const w = (minX, maxX, minZ, maxZ, tag = 'wall', top = P.h) => colliders.push({ minX, maxX, minZ, maxZ, tag, y0: P.y - 0.3, y1: P.y + top });
  w(P.x0 - 0.4, P.x0, P.z0 - 0.4, P.z1 + 0.4); w(P.x1, P.x1 + 0.4, P.z0 - 0.4, P.z1 + 0.4); w(P.x0 - 0.4, P.x1 + 0.4, P.z0 - 0.4, P.z0); w(P.x0 - 0.4, P.x1 + 0.4, P.z1, P.z1 + 0.4);
  const M = P.meeting;
  w(M.x0, M.x1, M.z0 - 0.06, M.z0 + 0.06); w(M.x1 - 0.06, M.x1 + 0.06, M.z0, M.door[0]); w(M.x1 - 0.06, M.x1 + 0.06, M.door[1], M.z1);        // the meeting room's glass, with its doorway
  w(M.table.x - 2.1, M.table.x + 2.1, M.table.z - 0.75, M.table.z + 0.75, 'furniture', 1.0);
  for (const z of [42.4, 46.2]) w(671.5, 683.5, z - 0.7, z + 0.7, 'furniture', 1.2);                                                          // the two benches of desks
  w(678.6, 684.4, 57.2, 58, 'furniture', 1.2);                                                                                                // the pantry counter
}
for (const y of Object.values(FLATS.y)) {
  const P = FLATS; addFloor({ id: `flat-${y}`, x0: P.x0, x1: P.x1, z0: P.z0, z1: P.z1, y });
  const w = (minX, maxX, minZ, maxZ, tag = 'wall', top = P.h) => colliders.push({ minX, maxX, minZ, maxZ, tag, y0: y - 0.3, y1: y + top });
  w(P.x0 - 0.4, P.x0, P.z0 - 0.4, P.z1 + 0.4); w(P.x1, P.x1 + 0.4, P.z0 - 0.4, P.z1 + 0.4); w(P.x0 - 0.4, P.x1 + 0.4, P.z0 - 0.4, P.z0); w(P.x0 - 0.4, P.x1 + 0.4, P.z1, P.z1 + 0.4);
  w(36.2, 38.4, -705.9, -703.7, 'furniture', 0.9); w(39.0, 40.9, -701.0, -700.4, 'furniture', 1.0); w(36.1, 36.7, -702.6, -700.6, 'furniture', 2.0); w(40.2, 42.4, -702.2, -701.3, 'furniture', 0.8);
}
// DiDi: the IFC is somewhere he walks into now; his own door and the station appear when they mean something
dest('lujiazui').walkIn = true;
const HOME_KM = { tilanqiao: [2.4, 10], northbund: [2.0, 9], dianchi: [0.7, 4] };
function syncDestinations(L) {
  const want = (id, on, make) => { const i = DESTINATIONS.findIndex((d) => d.id === id); if (on && i < 0) DESTINATIONS.push(make()); else if (!on && i >= 0) DESTINATIONS.splice(i, 1); else if (on && i >= 0) Object.assign(DESTINATIONS[i], make()); };
  const yr = isYear(L), H = yr ? home(L) : null, F = H && LISTINGS[H.id];
  want('home', !!F, () => ({ id: 'home', zh: `我的住处 · ${F.zh.split(' · ')[1]}`, en: `My flat · ${F.where}`, km: HOME_KM[H.id][0], mins: HOME_KM[H.id][1], walkIn: true }));
  want('hongqiao', yr && career(L).track === 'family', () => ({ id: 'hongqiao', zh: '虹桥火车站（高铁去南京）', en: 'Hongqiao Station (trains to Nanjing)', km: 18.5, mins: 38, walkIn: true }));
}

export function createYearWorld({ scene, people, player, hud, audio, voice = null, travel, sceneTalk, dests, getLife, save, freeze = () => {}, onWork = null, onSeason = null, lifeOn = true }) {
  Object.assign(sceneTalk.names, CAREER_NAMES);
  const groups = {}, ppl = {}, L0 = () => getLife();
  let here = null, flatId = null, running = null, card = null, beatIn = 0, chipIn = 0, hintAt = 0, f32 = null;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glassMat = std({ color: 0x9fb2b8, roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const white = std({ color: 0xf2f0ec, roughness: 0.85, emissive: 0x1c1a17 }), ceil = std({ color: 0xf4f2ee, roughness: 0.9, emissive: 0x24221e, side: THREE.DoubleSide });
  const mullion = std({ color: 0x2a2c30, roughness: 0.4, metalness: 0.7 }), lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.38, 1.15) });
  const steel = std({ color: 0x9a9690, metalness: 0.9, roughness: 0.3 });
  function kit(g) {
    const add = (geo, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; g.add(m); return m; };
    return { add, box: (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry), rbox: (w, h, d, r, mat, x, y, z) => add(new RoundedBoxGeometry(w, h, d, 3, r), mat, x, y + h / 2, z) };
  }
  function shell(g, P, F, glassSides, floorMat, wallMat = white) {
    const { add, box } = kit(g), cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, W = P.x1 - P.x0, Dp = P.z1 - P.z0;
    add(new THREE.PlaneGeometry(W, Dp), floorMat, cx, F + 0.002, cz, 0, -Math.PI / 2);
    add(new THREE.PlaneGeometry(W, Dp), ceil, cx, F + P.h, cz, 0, Math.PI / 2);
    const sides = { N: [P.x1, P.z0, P.x0, P.z0], S: [P.x0, P.z1, P.x1, P.z1], E: [P.x1, P.z1, P.x1, P.z0], W: [P.x0, P.z0, P.x0, P.z1] };
    for (const [k, [ax, az, bx, bz]] of Object.entries(sides)) {
      const len = Math.hypot(bx - ax, bz - az), gl = glassSides.includes(k), m = add(new THREE.PlaneGeometry(len, P.h), gl ? glassMat : wallMat, (ax + bx) / 2, F + P.h / 2, (az + bz) / 2);
      const nx = -(bz - az) / len, nz = (bx - ax) / len, toward = (cx - m.position.x) * nx + (cz - m.position.z) * nz > 0 ? 1 : -1; m.rotation.y = Math.atan2(nx * toward, nz * toward);
      if (gl) { const n = Math.max(2, Math.round(len / 1.8)); for (let i = 0; i <= n; i++) { const t = i / n; box(0.06, P.h, 0.06, mullion, ax + (bx - ax) * t, F, az + (bz - az) * t); } box(Math.abs(bx - ax) + 0.06, 0.08, Math.abs(bz - az) + 0.06, mullion, (ax + bx) / 2, F, (az + bz) / 2); }
    }
  }
  function sign(lines, w, h, { bg = '#f4f2ee', fg = '#1d2733', accent = '#b08a3c' } = {}) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach(([text, size, weight, col], i) => { x.fillStyle = col === 'accent' ? accent : fg; x.font = `${weight || 600} ${size}px "Noto Serif SC", "Inter", serif`; x.fillText(text, c.width / 2, c.height * (i + 1) / (lines.length + 1)); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  }
  const person = (id, x, y, z, yaw, g) => { if (!people) return null; const role = people.manifest.cast[id] ? id : people.manifest.cast[AVATAR[id]] ? AVATAR[id] : 'p1'; const p = createPerson(people, role); p.root.position.set(x, y, z); p.root.rotation.y = yaw; p.play('idle', 0); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(p.root); ppl[id] = p; return p; };

  // ================= the firm, 28F =================
  function buildFirm() {
    const P = OFFICE, F = P.y, g = new THREE.Group(); g.name = 'year-firm'; scene.add(g); groups.firm = g;
    const { add, box, rbox } = kit(g);
    shell(g, P, F, ['W', 'N'], std({ color: 0x4d5560, roughness: 0.95 }));
    for (const z of [P.lift.z, P.liftUp.z]) { box(0.06, 2.5, 1.4, steel, P.x1 - 0.04, F, z); box(0.02, 2.5, 0.02, mullion, P.x1 - 0.08, F, z); }
    for (const [z, zh, en] of [[P.lift.z, '下行', 'DOWN'], [P.liftUp.z, '32F', '32F']]) { const s = sign([[`${zh}`, 150, 700]], 0.5, 0.2, { bg: '#20242a', fg: '#e8e2d2' }); s.position.set(P.x1 - 0.09, F + 2.72, z); s.rotation.y = -Math.PI / 2; g.add(s); void en; }
    // the name on the wall you see as the lift opens
    const logo = sign([['迈 芬 咨 询', 150, 900], ['MARLOWE  FINCH', 76, 600, 'accent'], ['Technology Consulting · Shanghai', 40, 400]], 4.6, 1.7); logo.position.set(P.x1 - 0.05, F + 1.75, 47.2); logo.rotation.y = -Math.PI / 2; g.add(logo);
    // two benches of desks, screens, chairs
    const top = std({ color: 0xe8e6e0, roughness: 0.5 }), dark = std({ color: 0x15171a, roughness: 0.3 }), chair = std({ color: 0x2d3640, roughness: 0.8 });
    for (const z of [42.4, 46.2]) {
      box(12.0, 0.04, 1.4, top, 677.5, F + 0.72, z);
      for (const dx of [-5.8, -2, 2, 5.8]) box(0.06, 0.72, 1.2, mullion, 677.5 + dx, F, z);
      box(12.0, 0.36, 0.03, std({ color: 0xd2d0c8, roughness: 0.9 }), 677.5, F + 0.76, z);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
        const x = 672.6 + i * 1.92;
        box(0.56, 0.34, 0.03, dark, x, F + 0.9, z + s * 0.22); add(new THREE.PlaneGeometry(0.52, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.15, 0.22).multiplyScalar(1 + ((i * 7 + (s > 0 ? 3 : 0)) % 5) * 0.25) }), x, F + 1.07, z + s * 0.237, s > 0 ? 0 : Math.PI);
        rbox(0.5, 0.46, 0.5, 0.06, chair, x, F, z + s * 1.15); box(0.46, 0.5, 0.06, chair, x, F + 0.46, z + s * 1.38);
      }
    }
    const mine = sign([['纪 白', 120, 700], ['JI BAI', 60, 500, 'accent']], 0.3, 0.1); mine.position.set(P.desk.x, F + 0.752, 46.75); mine.rotation.x = -Math.PI / 2; g.add(mine);
    // the meeting room: glass on two sides, a table, a screen on the south wall
    const M = P.meeting, mh = P.h;
    for (const [ax, az, bx, bz] of [[M.x0, M.z0, M.x1, M.z0], [M.x1, M.z0, M.x1, M.door[0]], [M.x1, M.door[1], M.x1, M.z1]]) {
      const len = Math.hypot(bx - ax, bz - az), pane = add(new THREE.PlaneGeometry(len, mh), glassMat, (ax + bx) / 2, F + mh / 2, (az + bz) / 2, ax === bx ? Math.PI / 2 : 0);
      void pane; box(ax === bx ? 0.05 : len, 0.05, ax === bx ? len : 0.05, mullion, (ax + bx) / 2, F + 2.3, (az + bz) / 2); box(0.05, mh, 0.05, mullion, ax, F, az); box(0.05, mh, 0.05, mullion, bx, F, bz);
      add(new THREE.PlaneGeometry(len, 0.5), new THREE.MeshBasicMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), (ax + bx) / 2, F + 1.25, (az + bz) / 2, ax === bx ? Math.PI / 2 : 0);   // the frosted band
    }
    rbox(4.2, 0.05, 1.5, 0.02, std({ color: 0x3a2e24, roughness: 0.35 }), M.table.x, F + 0.72, M.table.z);
    for (const dx of [-1.8, 1.8]) box(0.08, 0.72, 1.1, mullion, M.table.x + dx, F, M.table.z);
    box(2.6, 1.5, 0.05, dark, M.table.x, F + 1.0, P.z1 - 0.05);
    const slide = sign([['理赔助手 · 东澜保险', 86, 700], ['Claims assistant · Donglan Insurance', 46, 400, 'accent']], 2.4, 1.3, { bg: '#0f1a2a', fg: '#e8eef6', accent: '#8fb4e0' }); slide.position.set(M.table.x, F + 1.75, P.z1 - 0.085); slide.rotation.y = Math.PI; g.add(slide);
    // the pantry
    box(5.6, 0.9, 0.7, std({ color: 0xdedad2, roughness: 0.5 }), 681.5, F, P.z1 - 0.38); box(0.34, 0.42, 0.4, dark, P.coffee.x, F + 0.9, P.z1 - 0.38); box(0.6, 0.5, 0.5, std({ color: 0xc8ccd0, metalness: 0.6, roughness: 0.4 }), 683.4, F + 0.9, P.z1 - 0.36);
    for (let x = P.x0 + 2; x < P.x1; x += 3.2) add(new THREE.PlaneGeometry(0.12, P.z1 - P.z0 - 1), lamp, x, F + P.h - 0.004, (P.z0 + P.z1) / 2, 0, Math.PI / 2);
    for (const id of ['zhiwei', 'taoke', 'shaofeng', 'partner', 'feng', 'gu', 'chair', 'hr']) { const s = P.stand[id] || P.seats[id]; person(id, s[0], F, s[1], s[2], g); }
    g.visible = false;
  }
  // who is on the floor, and where they stand, for today's scene
  function castFirm(def) {
    const P = OFFICE, cast = def ? def.cast : [], meeting = cast.includes('feng') || cast.includes('hr');
    for (const id of ['zhiwei', 'taoke', 'shaofeng', 'partner', 'feng', 'gu', 'chair', 'hr']) {
      const p = ppl[id]; if (!p) continue;
      const on = cast.includes(id); p.root.visible = on; if (!on) continue;
      const inRoom = meeting && P.seats[id] && (def.id !== 'd12' || ['hr', 'partner'].includes(id)), s = inRoom ? P.seats[id] : P.stand[id] || P.seats[id];
      p.root.position.set(s[0], P.y, s[1]); p.root.rotation.y = s[2];
    }
    return meeting;
  }

  // ================= the flat =================
  function buildFlat(id) {
    const P = FLATS, F = P.y[id], g = new THREE.Group(); g.name = `year-flat-${id}`; scene.add(g); groups[`flat:${id}`] = g;
    const { add, box, rbox } = kit(g), view = id === 'northbund';
    const floorMat = std({ color: id === 'tilanqiao' ? 0x8a6a48 : id === 'dianchi' ? 0x9c958a : 0xb39878, roughness: 0.6 });
    const wall = std({ color: id === 'tilanqiao' ? 0xe9e2cf : 0xf0eee9, roughness: 0.9, emissive: 0x1e1c18 });
    shell(g, { ...P, y: F }, F, view ? ['N', 'E'] : ['N'], floorMat, wall);
    if (!view) { add(new THREE.PlaneGeometry(P.x1 - P.x0 - 0.2, P.h - 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.86, 0.8, 0.68), transparent: true, opacity: 0.93 }), (P.x0 + P.x1) / 2, F + P.h / 2, P.z0 + 0.12); }   // a drawn curtain: no view from here
    else add(new THREE.PlaneGeometry(1.6, P.h - 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.76, 0.68), transparent: true, opacity: 0.9, side: THREE.DoubleSide }), P.x1 - 0.12, F + P.h / 2, P.z0 + 0.9, Math.PI / 2);
    // the door, the bed, the desk, a wardrobe, a sofa (and Yu'an's lamp, if she sent one)
    box(0.06, 2.1, 0.95, std({ color: 0x6b5138, roughness: 0.6 }), P.x1 - 0.04, F, P.door.z); box(0.04, 0.5, 0.3, mullion, P.x1 - 0.06, F + 1.3, P.hook.z);
    rbox(2.1, 0.36, 2.1, 0.06, std({ color: 0x4a3a2c, roughness: 0.7 }), 37.3, F, -704.8); rbox(2.0, 0.2, 2.0, 0.08, std({ color: 0xf4f1ea, roughness: 0.95 }), 37.3, F + 0.36, -704.8); rbox(0.9, 0.14, 0.5, 0.06, std({ color: 0xffffff, roughness: 0.9 }), 37.3, F + 0.54, -705.5); box(2.1, 0.9, 0.08, std({ color: 0x4a3a2c, roughness: 0.7 }), 37.3, F + 0.2, -705.9);
    box(1.8, 0.04, 0.6, std({ color: 0xd9c9a8, roughness: 0.5 }), 39.95, F + 0.74, P.z1 - 0.32); for (const dx of [-0.85, 0.85]) box(0.04, 0.74, 0.5, mullion, 39.95 + dx, F, P.z1 - 0.32);
    box(0.34, 0.22, 0.02, std({ color: 0x111111, roughness: 0.3 }), 39.95, F + 0.78, P.z1 - 0.2); add(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.32, 0.42) }), 39.95, F + 0.89, P.z1 - 0.212, Math.PI);
    box(0.55, 2.0, 2.0, std({ color: 0xcfc6b4, roughness: 0.8 }), 36.4, F, -701.6);
    rbox(2.2, 0.42, 0.9, 0.1, std({ color: id === 'dianchi' ? 0x50606c : 0x7c7468, roughness: 0.9 }), 41.3, F, -701.75); rbox(2.2, 0.4, 0.22, 0.08, std({ color: id === 'dianchi' ? 0x50606c : 0x7c7468, roughness: 0.9 }), 41.3, F + 0.42, -701.38);
    const lampG = new THREE.Group(); lampG.name = 'yuan-lamp'; g.add(lampG);
    { const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8), mullion); m1.position.set(42.55, F + 0.75, -701.6); const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.8), side: THREE.DoubleSide })); m2.position.set(42.55, F + 1.6, -701.6); const m3 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), mullion); m3.position.set(42.55, F + 0.01, -701.6); lampG.add(m1, m2, m3); }
    add(new THREE.CircleGeometry(0.09, 12), lamp, 39.5, F + P.h - 0.004, -703.2, 0, Math.PI / 2); add(new THREE.CircleGeometry(0.09, 12), lamp, 41.6, F + P.h - 0.004, -704.4, 0, Math.PI / 2);
    g.userData.lamp = lampG; g.visible = false;
    return g;
  }

  // ================= the stall on Hankou Road: his daughter, January to April =================
  const Y0 = LAYOUT.curbH, ZM = { x: STALL_SPOT.x + 1.3, z: STALL_SPOT.z + 1.15 };
  let zm = null, zmBox = null;
  function zhouMin(on) {
    if (on && !zm && people) { const g = new THREE.Group(); g.name = 'year-zhoumin'; scene.add(g); zm = person('zhoumin', ZM.x, Y0, ZM.z, 0.5, g); zm.group = g; zmBox = addDynamicCollider('npc'); }
    if (!zm) return;
    zm.group.visible = on;
    Object.assign(zmBox, { minX: 1e6, maxX: 1e6, minZ: 1e6, maxZ: 1e6 });   // (not solid: a box of her own would hide her from the prompt's line of sight)
  }

  // ================= playing a day's scene =================
  function runScene(def, at, onDone) {
    const L = L0(), n = enterScene(L, def), rec = work(L).days[L.clock.day];
    running = { def, onDone };
    const next = () => {
      if (!running || running.def !== def) return;
      const i = rec.part || 0;
      if (i >= n) { running = null; finishScene(L, def); save && save(); onDone && onDone(); return; }
      const script = partScript(L, def, i);
      const after = () => { rec.part = i + 1; save && save(); next(); };
      if (!script.length) { after(); return; }
      sceneTalk.play(script, { at, onDone: after });
    };
    setTimeout(next, 1800);
  }
  const headOf = (who) => { const p = ppl[who]; return p && p.root.visible ? [p.root.position.x, p.root.position.y + 1.6, p.root.position.z] : null; };
  const afterScene = (t) => () => hud.toast(t.where === 'card' ? '' : T('今天的事谈完了。回到工位，干到下班（或坐电梯走）。', "That's the day's business. Back to your desk to work on to the evening, or take the lift."), 5);

  // ================= arriving =================
  // An arrival can come inside someone else's fade (the metro's gate fades, then calls arrive): a
  // second fade is refused while one is running, so in that case do the arriving in the dark that is already there.
  const veilOn = () => { const v = document.getElementById('veil'); return !!v && v.classList.contains('on'); };
  const fade = (during, opts = {}) => { if (veilOn()) { if (opts.line) document.getElementById('veil').dataset.line = opts.line; Promise.resolve().then(during); } else travel(during, opts); };
  const upstairs = (id, info) => { const nested = veilOn(), ok = a0(id, info); if (ok && nested && PLACES[id]) { const P = PLACES[id]; player.teleport(P.spawn.x, P.spawn.z, P.spawn.yaw, 0, P.y); } return ok; };
  const hide = () => { for (const g of Object.values(groups)) g.visible = false; here = null; flatId = null; };
  function enterFirm(info = {}) {
    const L = L0(), P = OFFICE; if (!groups.firm) buildFirm();
    const t = arriveAtWork(L), meeting = castFirm(t && !t.tooLate ? t.def : t ? { cast: ['taoke'], id: 'late' } : { cast: L.clock.minute >= 8 * 60 && L.clock.minute < 20 * 60 && L.clock.day <= 16 && !inLimbo(L) ? ['taoke', 'shaofeng'] : [], id: 'none' });
    const sp = meeting && t && !t.done ? P.meetingSpawn : P.spawn;
    fade(async () => { hide(); groups.firm.visible = true; here = 'firm'; player.teleport(sp.x, sp.z, sp.yaw, 0, P.y); save && save(); }, { line: TB(FIRM.place), hold: 900, to: 'play' });
    if (t && !t.done && !t.tooLate) {
      setTimeout(() => { if (here !== 'firm') return; if (t.late) hud.toast(T('十点多了。你迟到了，大家都看见了。', "Past ten. You're late, and everyone has seen it."), 3.5); else if (t.hurt) hud.toast(T('你带着伤来上班。没人问，都看见了。', 'You have come to work hurt. Nobody asks. Everybody sees.'), 3.5); runScene(t.def, headOf, afterScene(t)); }, 1700);
    } else if (t && t.tooLate) setTimeout(() => hud.toast(T('快下班了。今天的会早就开完了，没有你。', 'Nearly the end of the day. The meeting happened hours ago, without you.'), 4.5), 2200);
    else if (!t) setTimeout(() => hud.toast(T('今天不用上班。办公室里没几个人。', 'No work today. The floor is nearly empty.'), 4), 2200);
    return true;
  }
  function enterFlat(info = {}) {
    const L = L0(); if (!hasFlat(L)) return false;
    const id = home(L).id, P = FLATS; if (!LISTINGS[id]) return false;
    const g = groups[`flat:${id}`] || buildFlat(id);
    fade(async () => { hide(); g.visible = true; g.userData.lamp.visible = !!L.flags.yuanLamp; here = 'flat'; flatId = id; player.teleport(P.spawn.x, P.spawn.z, P.spawn.yaw, 0, P.y[id]); save && save(); }, { line: T(LISTINGS[id].zh, LISTINGS[id].en), hold: 900, to: 'play' });
    return true;
  }
  // the start-up's day upstairs: 32F is destinations.js's floor; its own scene is set aside, ours played in it
  function enter32(t, info) {
    if (!upstairs('lujiazui', { ...info, invite: t && t.def.cast.includes('wang') ? 'xuan-demo' : 'xuan-arm' })) return false;
    const sc = dests.scene; if (sc) { sc.done = true; sc.queue.length = 0; sc.ask = null; sc.wait = 0; }
    const box = document.getElementById('ride-sub'); if (box) box.classList.remove('on');
    if (here) { if (veilOn()) hide(); else setTimeout(hide, 700); }                 // (coming straight from the flat or the 28th floor: that room is put away once it's dark)
    f32 = { t, started: false, at: performance.now() };
    return true;
  }
  const at32 = (who) => { const k = who === 'wang' ? 'investor' : who; const q = dests.talkables().find((x) => x.key === k); return q ? [q.x, q.y, q.z] : null; };
  // a day somewhere that isn't built: the place, the date and the conversation over a card
  const cardEl = document.createElement('div'); cardEl.id = 'year-card'; document.body.appendChild(cardEl);
  function openCard(t) {
    const L = L0(); arriveAtWork(L);
    fade(async () => {
      hide(); player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0);
      card = { t, over: false }; freeze(true); document.body.classList.add('year-card');
      cardEl.innerHTML = `<div class="in"><div class="k">${T('工作日', 'A working day')} · ${shortDate(L, getLang())}</div><h1></h1><h2></h2><p class="note">${T('（这个地方没有建模：这一天以对话的方式过。按 1-4 回答。）', '(This place is not modelled: the day is played as a conversation. 1-4 to answer.)')}</p><div class="acts"></div></div>`;
      cardEl.querySelector('h1').textContent = TB(t.def.place); cardEl.querySelector('h2').textContent = TB(t.def.title);
      cardEl.classList.add('on'); save && save();
    }, { line: t.via === 'hongqiao' ? T('虹桥 → 南京南 · G7012 · 1 小时 9 分', 'Hongqiao → Nanjing South · G7012 · 1 h 9 min') : TB(t.def.place), hold: 1100, to: 'play' });
    setTimeout(() => { if (card && card.t === t) runScene(t.def, () => null, () => { if (!card) return; card.over = true; const b = document.createElement('button'); b.className = 'mbtn primary'; b.textContent = T('干到下班，回外滩（E）', 'Work to the evening and go back to the Bund (E)'); b.addEventListener('click', closeCard); cardEl.querySelector('.acts').appendChild(b); }); }, 2200);
    return true;
  }
  function closeCard() {
    if (!card || !card.over) return; const L = L0(), t = card.t; card.over = false;
    const back = t.via === 'hongqiao' ? 150 : 24, until = workFull(L) + back;
    travel(async () => {
      skipTo(L, until);
      const r = t.via === 'hongqiao' ? pay(L, { method: 'alipay', amount: 289, to: '铁路 12306', memo: '虹桥 ⇄ 南京南 二等座', kind: 'transport' }) : pay(L, { method: 'alipay', amount: 6, to: '上海地铁 Shanghai Metro', memo: '2号线 往返', kind: 'transport' });
      if (r.ok) r.entry.memoEn = t.via === 'hongqiao' ? 'Hongqiao ⇄ Nanjing South, second class' : 'Line 2, there and back';
      cardEl.classList.remove('on'); document.body.classList.remove('year-card'); card = null; freeze(false); save && save();
    }, { line: T(`${clockText(until)} · 回到外滩`, `${clockText(until)} · back on the Bund`), hold: 1200, to: 'play' });
  }
  window.addEventListener('keydown', (e) => { if (!card) return; if ((e.code === 'KeyE' || e.code === 'Enter') && card.over) { closeCard(); e.stopImmediatePropagation(); e.preventDefault(); return; } if (!/^Digit[1-4]$/.test(e.code) && e.code !== 'Escape') { e.stopImmediatePropagation(); } }, true);

  // where an arrival goes: -> true if it was taken up (here, or by the floor upstairs); false leaves it to the caller
  const a0 = dests.arrive.bind(dests);
  function route(id, info = {}) {
    const L = L0();
    if (id === 'home') return isYear(L) ? enterFlat(info) : false;
    if (id === 'hongqiao') { const t = isYear(L) ? todaysWork(L) : null; if (t && t.via === 'hongqiao' && !t.done && L.clock.minute < WORK_HOURS.last + 120) return openCard(t); if (isYear(L)) hud.toast(T('今天没有要坐的车。', 'No train to catch today.'), 3); return false; }
    if (id !== 'lujiazui') return upstairs(id, info);
    if (!info.up) return a0(id, info);                                                               // from outside (a ride, the metro): street level in the district (world/lujiazui.js); the lobby's lift comes back here with up
    if (!isYear(L)) return upstairs(id, info);                                                       // a six-day game: the lobby's lift goes to the room on 32        // a six-day game: as it always was
    if (info.invite) return upstairs(id, info);                                                       // expected on 32F
    const t = todaysWork(L), c = career(L), atFirm = L.clock.day <= 12 ? !work(L).applied || c.track === 'consulting' : c.track === 'consulting';
    if (t && t.where === 'card' && !t.done && L.clock.minute < WORK_HOURS.last) return openCard(t);
    if (c.track === 'startup' && L.clock.day > 12) return enter32(t && !t.done ? t : null, info);
    if (atFirm) return enterFirm(info);
    if (info.method === 'metro') { const ok = upstairs(id, info); const sc = dests.scene; if (ok && sc && L.invites.some((i) => i.id === 'xuan-arm' && (i.kept || i.status !== 'pending'))) { sc.done = true; sc.queue.length = 0; sc.ask = null; setTimeout(() => { const b = document.getElementById('ride-sub'); if (b) b.classList.remove('on'); hud.toast(T('陆家嘴今天没有你要办的事。32 楼的人你都认识。', 'Nothing of yours to do in Lujiazui today. You know everyone on the 32nd floor.'), 4); }, 2500); } return ok; }
    return info.up ? upstairs(id, info) : false;                                                    // nothing of his own up there today: the room on 32, as it was
  }
  dests.arrive = route;

  // ================= leaving =================
  function goDown() {
    const L = L0();
    travel(async () => { skipTo(L, stamp(L) + 22); const r = pay(L, { method: 'alipay', amount: 3, to: '上海地铁 Shanghai Metro', memo: '2号线 陆家嘴→南鲸送路', kind: 'transport' }); if (r.ok) r.entry.memoEn = 'Line 2, Lujiazui to East Nanjing Road';
      hide(); player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0); save && save(); }, { line: T('2 号线 · 陆家嘴 → 南鲸送路 · ¥3', 'Line 2 · Lujiazui → East Nanjing Road · ¥3'), hold: 1300, to: 'play' });
  }
  function leaveFlat() {
    const L = L0(), d = dest('home') || { km: 2, mins: 9 }, cost = fare(d, L.clock.minute);
    travel(async () => { skipTo(L, stamp(L) + d.mins + 4); const r = pay(L, { method: 'wechat', amount: cost, to: '快马出行', memo: '快车 → 外滩', kind: 'ride' }); if (r.ok) r.entry.memoEn = 'Kuaima Express to the Bund';
      hide(); player.teleport(PICKUP.x, PICKUP.z - 1.2, Math.PI / 2, 0); save && save(); }, { line: T(`一辆快马把你送到了外滩 · ¥${cost}`, `A Kuaima takes you to the Bund · ¥${cost}`), hold: 1300, to: 'play' });
  }
  function commute() {
    const L = L0(), t = todaysWork(L); if (!t) return;
    skipTo(L, stamp(L) + (t.via === 'hongqiao' ? 45 : 28)); const r = pay(L, { method: 'alipay', amount: 4, to: '上海地铁 Shanghai Metro', memo: '地铁', kind: 'transport' }); if (r.ok) r.entry.memoEn = 'Metro';
    route(t.via, { method: 'commute' });
  }
  function sleep(night) {
    const L = L0(), now = stamp(L), tod = now % 1440;
    const until = night ? (tod >= 5 * 60 ? now - tod + 1440 + 7 * 60 + 30 : now - tod + 7 * 60 + 30) : now + 40;
    const gap = passLine(L, until, getLang());
    travel(async () => { slept(L, (until - now) / 60); skipTo(L, until); if (night) work(L).sleptHome = true; if (player.stamina) { player.stamina.energy = 1; player.stamina.winded = 0; } save && save(); },
      { line: night ? (gap || T(`一夜好眠 · ${clockText(until)}`, `A good night's sleep · ${clockText(until)}`)) : T(`躺了一会儿 · ${clockText(until)}`, `You lie down a while · ${clockText(until)}`), hold: night ? (gap ? 2400 : 1600) : 900 });
  }
  const nightNow = (L) => { const tod = stamp(L) % 1440; return tod >= 18 * 60 + 30 || tod < 5 * 60; };
  const expected32 = (L) => L.invites.find((i) => ['xuan-arm', 'xuan-demo'].includes(i.id) && Math.abs(stamp(L) - i.at) <= 120 && i.status !== 'declined' && !i.kept);

  // ================= the new day, on screen =================
  // the chapter title, as the Uncharted games do it: centred, no panel, it fades up as an act begins (and
  // when you come back to the game), holds, and dissolves; nothing else on screen is covered for long
  const chip = document.createElement('div'); chip.id = 'chapter-card'; (document.getElementById('hud') || document.body).appendChild(chip);
  let chapterKey = null;
  function showChapter(L) {
    const a = actOf(L); if (!a) return;
    const [num, title] = T(a.zh, a.en).split(' · ');
    chip.innerHTML = `<div class="cc-num">${num}</div><div class="cc-title">${title || ''}</div><div class="cc-rule"></div><div class="cc-date">${shortDate(L, getLang())}</div>`;
    hud.present({ prio: 0, dur: 4400, fade: 2400, show: () => { chip.classList.remove('on'); void chip.offsetWidth; chip.classList.add('on'); }, hide: () => chip.classList.remove('on') });
  }
  const yuan = (n) => `¥${Math.round(n).toLocaleString('en-US')}`;
  function announce(r) {
    const L = L0(), lang = getLang(), sum = (type) => r.paid.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);
    const bits = [TB(r.gap), shortDate(L, lang)].filter(Boolean);
    const sal = sum('salary'), rent = sum('rent'), burnt = sum('burn'), rev = sum('revenue'), top = sum('topup');
    if (sal) bits.push(T(`工资 +${yuan(sal)}`, `salary +${yuan(sal)}`));
    if (rent) bits.push(T(`${home(L).kind === 'hotel' ? '饭店' : '房租'} −${yuan(rent)}`, `${home(L).kind === 'hotel' ? 'hotel' : 'rent'} −${yuan(rent)}`));
    if (r.paid.some((p) => p.type === 'rent-short')) bits.push(T('房租没付上：银行卡余额不足', 'the rent bounced: not enough in the bank'));
    if (burnt) bits.push(T(`公司开支 −${yuan(burnt)}`, `company costs −${yuan(burnt)}`));
    if (rev) bits.push(T(`回款 +${yuan(rev)}`, `paid in +${yuan(rev)}`));
    if (top) bits.push(T(`自己垫了 ${yuan(top)}`, `covered ${yuan(top)} yourself`));
    if (r.absent.length) bits.push(T(`缺勤 ${r.absent.length} 天`, `${r.absent.length} working ${r.absent.length === 1 ? 'day' : 'days'} missed`));
    if (r.act) hud.achievement(T(r.act.zh, r.act.en), shortDate(L, lang));
    hud.toast(bits.join(' · '), r.days > 1 || sal || rent ? 8 : 4);
    if (r.days >= 14 && onSeason) onSeason(r.days, TB(r.gap));          // weeks went by: how were the evenings spent? (ui/season.js)
    hintAt = performance.now() + (r.days > 1 ? 9000 : 5000);
    save && save();
  }
  function todayHint() {
    const L = L0(), t = todaysWork(L); if (!t || t.done || L.clock.minute > WORK_HOURS.late) return;
    hud.toast(T(`今天上班：${TB(t.def.place)} · ${TB(t.def.title)}${t.via === 'hongqiao' ? '（快马 → 虹桥火车站）' : '（地铁 2 号线，或快马 → 陆家嘴）'}`, `Work today: ${TB(t.def.place)} · ${TB(t.def.title)} ${t.via === 'hongqiao' ? '(Kuaima → Hongqiao Station)' : '(Line 2, or Kuaima → Lujiazui)'}`), 7);
  }

  // ================= what you can act on =================
  const targets = () => {
    const L = L0(), out = [];
    if (here === 'firm') { const P = OFFICE, y = P.y;
      out.push({ id: 'yLift', x: P.lift.x, y: y + 1.4, z: P.lift.z, reach: 2.6 }, { id: 'yDesk', x: P.desk.x, y: y + 0.95, z: P.desk.z, reach: 2.3 }, { id: 'yCoffee', x: P.coffee.x, y: y + 1.1, z: P.coffee.z, reach: 2.2 }, { id: 'yWindow', x: P.window.x, y: y + 1.5, z: P.window.z, reach: 2.6 });
      if (expected32(L)) out.push({ id: 'yLiftUp', x: P.liftUp.x, y: y + 1.4, z: P.liftUp.z, reach: 2.6 });
    } else if (here === 'flat') { const P = FLATS, y = P.y[flatId];
      out.push({ id: 'yBed', x: P.bed.x, y: y + 0.6, z: P.bed.z, reach: 2.6 }, { id: 'yDoor', x: P.door.x, y: y + 1.2, z: P.door.z, reach: 2.2 }, { id: 'yHomeDesk', x: P.desk.x, y: y + 0.9, z: P.desk.z, reach: 2.0 }, { id: 'yHomeWindow', x: P.window.x, y: y + 1.5, z: P.window.z, reach: 2.2 });
      const t = todaysWork(L); if (t && !t.done && L.clock.minute < WORK_HOURS.last) out.push({ id: 'yCommute', x: P.hook.x, y: y + 1.3, z: P.hook.z, reach: 2.2 });
    } else if (f32 && dests.here === 'lujiazui' && f32.t) out.push({ id: 'yDesk32', x: 683.7, y: 134.4 + 0.95, z: 50.2, reach: 2.6 });
    if (zm && zm.group.visible) out.push({ id: 'yZhouMin', x: ZM.x, y: Y0 + 1.5, z: ZM.z, reach: 3.2 });
    return out;
  };
  const PROMPT = {
    yLift: () => [T('电梯 · 下行', 'Lift · down'), running ? T('会还没开完', "The meeting isn't over") : T('下楼，地铁回外滩（¥3）', 'Down, and Line 2 back to the Bund (¥3)')],
    yLiftUp: () => [T('电梯 · 32 层', 'Lift · 32F'), T('上楼，明轩在等', 'Up: Mingxuan is expecting you')],
    yDesk: () => { const L = L0(), t = todaysWork(L), rec = work(L).days[L.clock.day] || {}; return [T('你的工位', 'Your desk'), running ? T('先把会开完', 'Finish the meeting first') : rec.full ? T('今天的活干完了', "Today's work is done") : t && t.done ? T('干到下班（18:30）', 'Work on to 18:30') : T('坐一会儿', 'Sit a moment')]; },
    yDesk32: () => { const L = L0(), rec = work(L).days[L.clock.day] || {}; return [T('借来的桌子', 'The borrowed desk'), running ? T('先把话说完', 'Finish talking first') : rec.full ? T('今天的活干完了', "Today's work is done") : T('干到晚上，打车回外滩', 'Work on to the evening, then a car to the Bund')]; },
    yCoffee: () => [T('咖啡机', 'Coffee machine'), T('接一杯', 'Pour one')],
    yWindow: () => [T('窗外', 'The window'), T('看看', 'Look out')],
    yBed: () => [T('床', 'Bed'), nightNow(L0()) ? T('睡到早上', 'Sleep till morning') : T('躺一会儿', 'Lie down a while')],
    yDoor: () => [T('门', 'Door'), T('出门，打车去外滩', 'Out, and a Kuaima to the Bund')],
    yCommute: () => [T('外套和包', 'Coat and bag'), T('去上班', 'Go to work')],
    yHomeDesk: () => [T('书桌', 'Desk'), T('翻开本子', 'Open your notebook')],
    yHomeWindow: () => [T('窗', 'Window'), T('看看', 'Look out')],
    yZhouMin: () => [T('修表摊前的人', 'Someone at the stall'), T('她好像在等人', 'She seems to be waiting for someone')],
  };
  function interact(id) {
    const L = L0();
    if (id === 'yLift') { if (running) hud.toast(T('会还没开完，现在走不合适。', "The meeting isn't over. This isn't the moment to leave."), 2.6); else goDown(); }
    else if (id === 'yLiftUp') { const inv = expected32(L); if (inv) { setTimeout(() => { if (groups.firm) groups.firm.visible = false; here = null; }, 700); a0('lujiazui', { invite: inv.id, method: 'lift' }); } }
    else if (id === 'yDesk' || id === 'yDesk32') {
      const t = todaysWork(L), rec = work(L).days[L.clock.day] || {};
      if (running) hud.toast(T('先把眼前的事谈完。', 'Finish what is in front of you first.'), 2.4);
      else if (rec.full) hud.toast(T('今天的活干完了。', "Today's work is done."), 2.4);
      else if (!t || !t.done) hud.toast(id === 'yDesk' ? T('你的电脑，你的工牌，一盆别人留下的绿萝。', 'Your laptop, your badge, a pothos somebody left behind.') : T('靠窗的两张桌子。', 'Two desks by the window.'), 3);
      else if (id === 'yDesk32') { logTime(L, 'work', Math.max(0, workFull(L) - stamp(L))); skipTo(L, workFull(L)); const sc = dests.scene; if (sc) sc.done = false; f32 = null; save && save(); dests.leave(); }
      else { const until = workFull(L); travel(async () => { logTime(L, 'work', Math.max(0, until - stamp(L))); skipTo(L, until); save && save(); }, { line: T(`干到下班 · ${clockText(until)}`, `You work on to the evening · ${clockText(until)}`), hold: 1300 }); }
    } else if (id === 'yCoffee') { audio && audio.cue && audio.cue('ping', 0, 0.2); hud.toast(T('美式，纸杯。茶水间是这层楼消息最灵的地方。', 'An americano in a paper cup. The pantry is the best-informed place on the floor.'), 3.2); }
    else if (id === 'yWindow') hud.toast(T('隔着江，是你每天早上出门的那一排老楼。从这儿看，很小。', 'Across the river, the row of old buildings you leave every morning. From here they are small.'), 4);
    else if (id === 'yBed') sleep(nightNow(L));
    else if (id === 'yDoor') leaveFlat();
    else if (id === 'yCommute') commute();
    else if (id === 'yHomeDesk') { if (onWork) onWork(); }
    else if (id === 'yHomeWindow') hud.toast(flatId === 'northbund' ? T('二十二楼。外滩在右手边，陆家嘴在江对面。房租的一半，付的是这个。', 'Twenty-second floor. The Bund to the right, Lujiazui across the water. Half the rent is for this.') : flatId === 'dianchi' ? T('窗外是滇池路的背面，空调外机，一小条天。', 'Outside, the back of Dianchi Road: air-conditioning units and a strip of sky.') : T('窗外是晾衣杆和对面人家的厨房。有人在炒菜。', "Outside, drying poles and the kitchen of the flat opposite. Somebody is frying something."), 4);
    else if (id === 'yZhouMin') { running = { def: { id: 'zhoumin' } }; sceneTalk.play(zhouMinScript(L), { at: () => [ZM.x, Y0 + 1.6, ZM.z], onDone: () => { running = null; save && save(); hud.toast(T('日志（J）里记下了这件事。', 'The journal (J) has a note of this.'), 3); } }); }
    return true;
  }

  const api = {
    OFFICE, FLATS, rules: { todaysWork, arriveAtWork, playScene, workFull, rollover, runCareer },   // (the pure rules, for tools: tools/yearwalk.mjs plays the days it doesn't walk through with them)
    get here() { return here; }, get flat() { return flatId; }, get card() { return card; }, get running() { return running ? running.def.id : null; },
    arrive: route, enter(what, info) { return what === 'firm' ? enterFirm(info) : what === 'flat' ? enterFlat(info) : false; },
    handoff(outcome, extra) { const h = recordHandoff(L0(), outcome, extra); save && save(); return h; },
    sceneText(clock) { return here === 'firm' ? `${clock}. The 28th floor of IFC Tower 2 in Lujiazui: the open-plan Shanghai office of Marlowe Finch, a technology consulting firm; desks, screens, a glass meeting room, the Bund across the river through the west windows.` : `${clock}. Ji Bai's rented flat (${LISTINGS[flatId] ? LISTINGS[flatId].en : 'a small flat'}).`; },
    talkables() { if (here !== 'firm' || running) return []; return ['taoke', 'shaofeng', 'partner', 'zhiwei', 'feng', 'gu'].filter((k) => ppl[k] && ppl[k].root.visible).map((k) => ({ key: `firm:${k}`, persona: k, x: ppl[k].root.position.x, y: ppl[k].root.position.y + 1.62, z: ppl[k].root.position.z, hold() {} })); },
    candidates() { return targets().map((t) => ({ ...t, cone: 0.6 })); },
    owns(id) { return !!PROMPT[id]; },
    prompt(id) { const p = PROMPT[id]; if (!p) return null; const [target, action] = p(); return { target, action }; },
    interact,
    // each frame
    update(dt, pp) {
      const L = L0();
      if (card && player.enabled) { player.enabled = false; player.clearInput && player.clearInput(); }      // a day over a card: nobody walks about under it
      if (here === 'firm') for (const [id, p] of Object.entries(ppl)) { if (id === 'zhoumin' || !p.root.visible) continue; const talking = sceneTalk.active && sceneTalk.speaking === id; p.play(talking ? 'talk1' : 'idle', 0.4); p.update(dt, Math.hypot(pp.x - p.root.position.x, pp.z - p.root.position.z) < 9 ? [pp.x, pp.z] : null); }
      if (zm && zm.group.visible) { zm.play(sceneTalk.active && running && running.def.id === 'zhoumin' ? 'talk1' : 'idle', 0.4); zm.update(dt, Math.hypot(pp.x - ZM.x, pp.z - ZM.z) < 6 ? [pp.x, pp.z] : null); }
      // 32F: once you are there and the fade has cleared, the day's talk begins
      if (f32) {
        if (dests.here !== 'lujiazui' && performance.now() - f32.at > 4000) { if (running && sceneTalk.active) { sceneTalk.stop(); running = null; } f32 = null; }
        else if (f32.t && !f32.started && dests.here === 'lujiazui' && performance.now() - f32.at > 2600) { f32.started = true; arriveAtWork(L); runScene(f32.t.def, at32, () => hud.toast(T('今天的事谈完了。回桌子上干到晚上，或坐电梯走。', "That's the day's talking. Back to the desk to work on to the evening, or take the lift."), 5)); }
      }
    },
    // with the clock (main.js updateLife): the new day, the messages, the date
    tick(dt) {
      const L = L0();
      if (!isYear(L)) { if ((chipIn -= dt) <= 0) { chipIn = 2; syncDestinations(L); } return; }
      const r = rollover(L); if (r) announce(r);
      if (hintAt && performance.now() > hintAt) { hintAt = 0; todayHint(); }
      if ((beatIn -= dt) <= 0) { beatIn = 0.5; if (lifeOn) { if (runCareer(L).length) save && save(); } syncDestinations(L); zhouMin(zhouMinHere(L) || (!!running && running.def.id === 'zhoumin')); }
      if ((chipIn -= dt) <= 0) {
        chipIn = 1; const a = actOf(L), key = a ? a.id : null;
        // a new act (or the first moment of play): its title, once the scene cards are out of the way
        if (key && key !== chapterKey && !document.body.classList.contains('year-card')) { chapterKey = key; showChapter(L); }
      }
    },
  };
  work(L0());
  return api;
}
