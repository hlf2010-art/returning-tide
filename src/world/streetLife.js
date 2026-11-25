// Nanjing Road's working life, west of Henan Road (docs/living-city-details.md; the culture review of
// 25 November 2026):
//   - a police patrol: two officers on foot, at a stroll, down the 金带 between Henan Road and Xizang Road
//     and back, looking about; out round the clock (fewer people to watch at night, same pace)
//   - delivery riders: e-bikes are not allowed on the pedestrian street, so riders park at the mouths of
//     the cross streets (a cluster of e-bikes with quilted windbreaks and branded boxes) and jog in on foot
//     to a shop door, wait a moment inside, and come back out with the order in an insulated bag, then ride
//     off up the side street. Liveries of 2025-26: Meituan yellow, 淘宝闪购 orange and black, JD red.
//   - the queue at 真老大房 (the 1851 cake shop on the Fujian Road corner) for its fresh-meat mooncakes
//     (鲜肉月饼), baked and sold at the street window: a line along the frontage, longest in the afternoon
//     and toward supper, nearly everyone in it on their phone; the one at the front steps up, pays by
//     phone, and walks off with a warm paper bag while the rest shuffle forward and newcomers join the
//     back; a hand-lettered board by the window.
// People exist only while you're near (createPerson is made on approach and let go behind you); the
// patrol's position runs on the clock either way, so it is where it should be when you arrive.
import * as THREE from 'three';
import { NJ } from './layout.js';
import { createPerson } from './people.js';
import { dressPolice } from './officer.js';
import { dressRider, RIDER_BRANDS } from './outfits.js';
import { Batch } from './geo.js';
import { TOD } from './dayNight.js';
import { makeCanvas, tex } from './canvas.js';
import { SIGN_FONTS, loadSignFonts } from './shopSigns.js';
import { xForMetres } from './njShops.js';

const CURB = 0.15, UP = new THREE.Vector3(0, 1, 0);
const PATROL = { xEast: -540, xWest: -1500, z: NJ.zc - 2.3, speed: 0.85 };
const MOUTHS = ['shanxi', 'fujian', 'zhejiang', 'guangxi', 'guizhou'];
const BRANDS = Object.keys(RIDER_BRANDS);
// the mooncake window: 真老大房 is 977-992 m from the Bund (world/njShops.js), the north side; the window
// at its west end, the line running west along the frontage
const QUEUE = { x: xForMetres(988), z: NJ.z0 + 0.95, step: 0.62, dir: -1 };
const QUEUE_ROLES = ['p1', 'p2', 'p4', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
// how long the line is through the day (shop open 10:00-22:00): minute -> people
const queueLength = (min) => (min < 600 || min >= 1320 ? 0 : Math.round(5 + 5 * Math.exp(-(((min - 900) / 120) ** 2)) + 6 * Math.exp(-(((min - 1050) / 70) ** 2))));

// an e-bike with a delivery box and a quilted windbreak on the handlebars (parked)
function bikeParts(B, x, z, yaw, brand) {
  const c = Math.cos(yaw), s = Math.sin(yaw), at = (lx, ly, lz) => ({ x: x + c * lx + s * lz, y: CURB + ly, z: z - s * lx + c * lz, ry: yaw });
  B.tyre.add(new THREE.TorusGeometry(0.25, 0.05, 6, 16).rotateY(Math.PI / 2), at(0, 0.3, 0.55)); B.tyre.add(new THREE.TorusGeometry(0.25, 0.05, 6, 16).rotateY(Math.PI / 2), at(0, 0.3, -0.55));
  B.frame.add(new THREE.BoxGeometry(0.22, 0.32, 1.1), at(0, 0.42, 0)); B.frame.add(new THREE.BoxGeometry(0.26, 0.1, 0.55), at(0, 0.66, -0.15));   // body and seat
  B.frame.add(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), at(0, 0.8, 0.5)); B.frame.add(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6).rotateZ(Math.PI / 2), at(0, 1.1, 0.48));
  B.quilt.add(new THREE.BoxGeometry(0.62, 0.55, 0.08), at(0, 0.82, 0.62));                                                                // the windbreak
  B[`box_${brand}`].add(new THREE.BoxGeometry(0.44, 0.4, 0.42), at(0, 0.92, -0.42));                                                   // the delivery box
}

export function createStreetLife({ scene, people, rnd = Math.random }) {
  const group = new THREE.Group(); group.name = 'street-life'; scene.add(group);
  // ---- the parked e-bikes at each mouth (static) ----
  const B = { tyre: new Batch(), frame: new Batch(), quilt: new Batch(), ...Object.fromEntries(BRANDS.map((b) => [`box_${b}`, new Batch()])) };
  const mouths = [];
  for (const id of MOUTHS) {
    const c = NJ.cross.find((q) => q.id === id); if (!c) continue;
    for (const side of c.side ? [c.side] : ['N', 'S']) {
      const zM = side === 'N' ? NJ.z0 - 3.2 : NJ.z1 + 3.2, n = 2 + Math.floor(rnd() * 3), bikes = [];
      for (let i = 0; i < n; i++) { const brand = BRANDS[Math.floor(rnd() * BRANDS.length)], x = c.x0 + 1.4 + i * 0.85, z = zM + (side === 'N' ? -1 : 1) * (rnd() * 0.6); bikeParts(B, x, z, 0.15 * (rnd() - 0.5), brand); bikes.push({ x, z, brand }); }
      mouths.push({ id, side, x: (c.x0 + c.x1) / 2, z: zM, bikes });
    }
  }
  const mats = { tyre: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }), frame: new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.5, metalness: 0.4 }), quilt: new THREE.MeshStandardMaterial({ color: 0x24306a, roughness: 0.95 }) };
  for (const b of BRANDS) mats[`box_${b}`] = new THREE.MeshStandardMaterial({ color: RIDER_BRANDS[b].box, roughness: 0.55 });
  for (const [k, b] of Object.entries(B)) if (b.list.length) { const m = b.mesh(mats[k], `ebikes-${k}`); m.castShadow = true; group.add(m); }

  // ---- the patrol ----
  const patrol = { s: rnd() * 2 * (PATROL.xEast - PATROL.xWest), people: null };
  const patrolAt = (s) => { const L = PATROL.xEast - PATROL.xWest, q = ((s % (2 * L)) + 2 * L) % (2 * L); return q < L ? { x: PATROL.xEast - q, h: -Math.PI / 2 } : { x: PATROL.xWest + (q - L), h: Math.PI / 2 }; };
  function makePerson(role) { const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root); p.play('walk', 0); return p; }
  function drop(p) { group.remove(p.root); p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); }

  // ---- the mooncake queue ----
  const board = (() => {
    const [c, x] = makeCanvas(256, 384), draw = () => {
      x.fillStyle = '#1a1612'; x.fillRect(0, 0, 256, 384); x.strokeStyle = '#8a6a3a'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 374);
      x.fillStyle = '#f4ead2'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `110px ${SIGN_FONTS.kai}`; x.fillText('鲜肉', 128, 92); x.fillText('月饼', 128, 202);
      x.fillStyle = '#e3b04b'; x.font = `44px ${SIGN_FONTS.kai}`; x.fillText('现烤现卖', 128, 290);
      x.fillStyle = '#d9cfb8'; x.font = `34px ${SIGN_FONTS.kai}`; x.fillText('请排队', 128, 344);
    };
    draw(); const t = tex(c, { repeat: false, aniso: 4 }); loadSignFonts().then(() => { draw(); t.needsUpdate = true; });
    const g = new THREE.Group(), face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), leg = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.7 });
    for (const s2 of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.84), face); p.position.set(0, 0.62, s2 * 0.14); p.rotation.set(-s2 * 0.32, s2 > 0 ? 0 : Math.PI, 0); g.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.1, 0.03), leg); l.position.set(0.3, 0.52, s2 * 0.17); l.rotation.x = -s2 * 0.32; g.add(l); const l2 = l.clone(); l2.position.x = -0.3; g.add(l2); }
    g.rotation.y = Math.PI / 2; g.position.set(QUEUE.x + 1.1, CURB, QUEUE.z + 0.35); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(g); return g;
  })();
  const bagMat = new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.85 });
  const queue = { people: [], want: 0, serve: 0, near: false };      // people: { p, slot, x, z, h, phase: 'join'|'wait'|'served', t, phone }
  const slotX = (i) => QUEUE.x + QUEUE.dir * i * QUEUE.step;
  function joiner(i, instant) {
    const p = makePerson(QUEUE_ROLES[Math.floor(rnd() * QUEUE_ROLES.length)]);
    const q = { p, slot: i, x: instant ? slotX(i) : slotX(i) + QUEUE.dir * 6, z: instant ? QUEUE.z : QUEUE.z + 5, h: 0, phase: instant ? 'wait' : 'join', t: rnd() * 5, phone: rnd() < 0.7, bag: null };
    return q;
  }

  // ---- the riders: one at a time per mouth near you ----
  const insulated = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.8 });
  const riders = [];                                                  // { m (mouth), p, bag, phase, x, z, h, t, door }
  function startRider(m) {
    if (!people) return null;
    const brand = m.bikes[0].brand, p = makePerson('p3'); dressRider(p, brand);
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.22), insulated); bag.visible = false; group.add(bag);
    // to a shop door within 50 m along the frontage on the mouth's side
    const door = { x: m.x + (rnd() < 0.5 ? -1 : 1) * (12 + rnd() * 38), z: m.side === 'N' ? NJ.z0 + 0.6 : NJ.z1 - 0.6 };
    return { m, p, bag, brand, phase: 'in', x: m.bikes[0].x, z: m.bikes[0].z, h: 0, t: 0, door };
  }
  const step = (r, tx, tz, speed, dt) => { const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz); if (d < 0.2) return true; const k = Math.min(1, (speed * dt) / d); r.x += dx * k; r.z += dz * k; r.h = Math.atan2(dx, dz); return false; };

  return {
    group,
    others() {
      const out = [];
      if (patrol.people) for (const a of patrol.people) out.push({ x: a.x, z: a.z, vx: Math.sin(a.h) * PATROL.speed, vz: Math.cos(a.h) * PATROL.speed });
      for (const r of riders) if (r.phase !== 'inside') out.push({ x: r.x, z: r.z, vx: 0, vz: 0 });
      for (const q of queue.people) out.push({ x: q.x, z: q.z, vx: 0, vz: 0 });
      return out;
    },
    update(dt, eye, minute = 720) {
      if (!dt || !eye) return;
      const onStreet = Math.abs(eye.z - NJ.zc) < 60 && eye.x < -480;
      group.visible = onStreet;
      // the patrol walks on the clock; drawn within 90 m
      patrol.s += PATROL.speed * dt;
      const pa = patrolAt(patrol.s), near = onStreet && Math.abs(pa.x - eye.x) < 90;
      if (near && !patrol.people && people) {
        patrol.people = [0, 1].map((i) => { const a = { p: makePerson(i ? 'p1' : 'p4'), h: pa.h, x: pa.x, z: PATROL.z }; dressPolice(group, a, '警察'); return a; });
      } else if (!near && patrol.people) { for (const a of patrol.people) { drop(a.p); group.remove(a.extra); } patrol.people = null; }
      if (patrol.people) patrol.people.forEach((a, i) => {
        a.h = pa.h; a.x = pa.x - Math.sin(pa.h) * (i ? 0.2 : 0); a.z = PATROL.z + (i ? 0.75 : -0.15);
        a.p.root.position.set(a.x, CURB, a.z); a.p.root.rotation.y = a.h;
        a.p.play('walk', 0.3); a.p.setGait(PATROL.speed);
        const lookX = a.x + Math.sin(a.h) * 6 + Math.sin(performance.now() / 3100 + i * 2) * 5;
        a.p.update(dt, [lookX, a.z + Math.cos(performance.now() / 2700 + i) * 6]); a.dress();
      });
      // the queue: its length runs on the clock; people exist only while you're within 70 m
      queue.want = queueLength(minute);
      const qNear = onStreet && Math.abs(eye.x - QUEUE.x) < 70;
      board.visible = queue.want > 0;
      if (!qNear && queue.people.length) { for (const q of queue.people) { drop(q.p); if (q.bag) group.remove(q.bag); } queue.people.length = 0; }
      if (qNear && people) {
        const waiting = queue.people.filter((q) => q.phase !== 'served');
        if (!queue.near) { for (let i = 0; i < queue.want; i++) queue.people.push(joiner(i, true)); }          // arriving: the line is already there
        else if (waiting.length < queue.want && rnd() < dt / 9) queue.people.push(joiner(waiting.length, false));
        // the front is served every 25-40 s: pays, takes the bag, walks off east toward Fujian Road
        queue.serve -= dt;
        const front = waiting.find((q) => q.slot === 0 && q.phase === 'wait');
        if (front && queue.serve <= 0) {
          front.phase = 'served'; front.t = 0; queue.serve = 25 + rnd() * 15;
          front.bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.1), bagMat); group.add(front.bag);
          for (const q of waiting) if (q !== front) q.slot = Math.max(0, q.slot - 1);
        }
      }
      queue.near = qNear;
      for (let i = queue.people.length - 1; i >= 0; i--) {
        const q = queue.people[i], root = q.p.root; q.t += dt;
        let moving = false, speed = 0, look = null;
        if (q.phase === 'join') { moving = !step(q, slotX(q.slot), QUEUE.z, 1.2, dt); speed = 1.2; if (!moving) q.phase = 'wait'; }
        else if (q.phase === 'wait') { moving = !step(q, slotX(q.slot), QUEUE.z, 0.9, dt); speed = 0.9; if (!moving) q.h = QUEUE.dir > 0 ? -Math.PI / 2 : Math.PI / 2; look = q.phone ? null : [QUEUE.x + 2, QUEUE.z - 1]; }
        else if (q.phase === 'served') {
          if (q.t < 2.5) { q.h = Math.PI; }                                                 // at the window (north): paying
          else { moving = !step(q, QUEUE.x + 30, NJ.z0 + 6, 1.25, dt); speed = 1.25; if (!moving || q.t > 40) { drop(q.p); if (q.bag) group.remove(q.bag); queue.people.splice(i, 1); continue; } }
        }
        root.position.set(q.x, CURB, q.z); root.rotation.y = q.h;
        const state = moving ? 'walk' : q.phase === 'wait' && q.phone ? 'phone' : 'idle';
        q.p.play(state, 0.3); q.p.setGait(moving ? speed : 0); q.p.update(dt, look);
        if (q.bag) { q.p.bones.R.getWorldPosition(q.bag.position); q.bag.position.y -= 0.16; q.bag.quaternion.setFromAxisAngle(UP, q.h); }
      }
      // riders: while the shops are open (and an hour on, for the late orders), near you
      const open = TOD.shops.value > 0.5;
      for (const m of mouths) {
        const close = onStreet && Math.abs(m.x - eye.x) < 70;
        const r = riders.find((q) => q.m === m);
        if (close && !r && open && rnd() < dt / 8) { const nr = startRider(m); if (nr) riders.push(nr); }
      }
      for (let i = riders.length - 1; i >= 0; i--) {
        const r = riders[i], root = r.p.root; r.t += dt;
        const far = Math.abs(r.m.x - eye.x) > 95 || !onStreet;
        if (far || r.phase === 'gone') { drop(r.p); group.remove(r.bag); riders.splice(i, 1); continue; }
        let moving = false, speed = 0;
        if (r.phase === 'in') { moving = !step(r, r.door.x, r.door.z, 2.6, dt); speed = 2.6; if (!moving) { r.phase = 'inside'; r.t = 0; root.visible = false; } }
        else if (r.phase === 'inside') { if (r.t > 15 + rnd() * 0.2 * 25) { r.phase = 'out'; root.visible = true; r.bag.visible = true; } }
        else if (r.phase === 'out') { moving = !step(r, r.m.bikes[0].x + 0.6, r.m.bikes[0].z, 2.4, dt); speed = 2.4; if (!moving) { r.phase = 'away'; r.t = 0; } }
        else if (r.phase === 'away') { const zt = r.m.side === 'N' ? NJ.z0 - 9 : NJ.z1 + 9; moving = !step(r, r.x, zt, 3.5, dt); speed = 3.5; if (!moving) r.phase = 'gone'; }
        if (!root.visible) continue;
        root.position.set(r.x, CURB, r.z); root.rotation.y = r.h;
        r.p.play(moving ? (speed > 2 ? 'jog' : 'walk') : 'idle', 0.25); r.p.setGait(moving ? speed : 0);
        r.p.update(dt, null);
        if (r.bag.visible) { r.p.bones.R.getWorldPosition(r.bag.position); r.bag.position.y -= 0.22; r.bag.quaternion.setFromAxisAngle(UP, r.h); }
      }
    },
    get state() { return { patrol: patrolAt(patrol.s), drawn: !!patrol.people, riders: riders.map((r) => `${r.brand}:${r.phase}`), mouths: mouths.length, queue: { want: queue.want, people: queue.people.map((q) => `${q.phase}:${q.slot}`) } }; },
  };
}
