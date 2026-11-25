// Nanjing Road's working life, west of Henan Road (docs/living-city-details.md; the culture review of
// 25 November 2026):
//   - a police patrol: two officers on foot, at a stroll, down the 金带 between Henan Road and Xizang Road
//     and back, looking about; out round the clock (fewer people to watch at night, same pace)
//   - delivery riders: e-bikes are not allowed on the pedestrian street, so riders park at the mouths of
//     the cross streets (a cluster of e-bikes with quilted windbreaks and branded boxes) and jog in on foot
//     to a shop door, wait a moment inside, and come back out with the order in an insulated bag, then ride
//     off up the side street. Liveries of 2025-26: Meituan yellow, 淘宝闪购 orange and black, JD red.
// People exist only while you're near (createPerson is made on approach and let go behind you); the
// patrol's position runs on the clock either way, so it is where it should be when you arrive.
import * as THREE from 'three';
import { NJ } from './layout.js';
import { createPerson } from './people.js';
import { dressPolice } from './officer.js';
import { dressRider, RIDER_BRANDS } from './outfits.js';
import { Batch } from './geo.js';
import { TOD } from './dayNight.js';

const CURB = 0.15, UP = new THREE.Vector3(0, 1, 0);
const PATROL = { xEast: -540, xWest: -1500, z: NJ.zc - 2.3, speed: 0.85 };
const MOUTHS = ['shanxi', 'fujian', 'zhejiang', 'guangxi', 'guizhou'];
const BRANDS = Object.keys(RIDER_BRANDS);

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
      return out;
    },
    update(dt, eye) {
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
    get state() { return { patrol: patrolAt(patrol.s), drawn: !!patrol.people, riders: riders.map((r) => `${r.brand}:${r.phase}`), mouths: mouths.length }; },
  };
}
