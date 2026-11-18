// People with somewhere to be, on the northern Bund (the Hankou Road crossing has its own crowd in
// engine/traffic.js). Each walker is given a purpose, which makes a route and what they do on it:
//   tourist      along the promenade; stops at the railing to photograph Pudong (phone up, sideways)
//   shopper      off Nanjing Road with paper shopping bags, south along the pavement, unhurried
//   guest        to the Peace Hotel's door on Nanjing Road, and in
//   office       out of the AIA Building after work: phone out, quick, toward Nanjing Road for a car
//   couple       two together on the promenade, slow, close
// Simulated (and drawn) only within ~80 m of you; when one finishes, a new one starts out of sight.
// They step round you, look at you if you stand in their way, and keep to the right of each other.
import { roleSex, personaFor } from '../engine/streetPeople.js';
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { twoBone } from './driverPose.js';
import { L } from './layout.js';
import { PEACE, AIA } from './interiors.js';

const DECK = L.deckY, CURB = L.curbH;
const ROLES = ['p1', 'p2', 'p3', 'p4', 'p5'];
const door = { x: (PEACE.door[0] + PEACE.door[1]) / 2, z: -210.5 };

// a route: [x, z, y, action?] points; actions: 'photo' (at the railing, toward Pudong), 'enter' (vanish
// through a door), 'phone' (stop and check it)
function plan(kind, rnd) {
  const z = (a, b) => a + rnd() * (b - a);
  switch (kind) {
    case 'tourist': { const z0 = z(-250, -80), dir = rnd() < 0.5 ? 1 : -1, zs = z0 + dir * z(30, 60);
      return { speed: 0.95, pts: [[z(14, 20), z0, DECK], [24.6, (z0 + zs) / 2, DECK, 'photo'], [z(14, 20), zs, DECK]] }; }
    case 'couple': { const z0 = z(-250, -90), zs = z0 + z(40, 80);
      return { speed: 0.8, pair: true, pts: [[z(16, 21), z0, DECK], [z(16, 21), zs, DECK]] }; }
    case 'shopper': return { speed: 1.05, bags: 1 + Math.floor(rnd() * 2), pts: [[-60, -207.5, CURB], [-32.3, -207.5, CURB], [-31.6, z(-185, -150), CURB], [-31.4, z(-110, -70), CURB]] };
    case 'guest': return { speed: 1.1, pts: [[-31.2, z(-150, -100), CURB], [-31.4, -208.6, CURB], [door.x + 4, -208.5, CURB], [door.x, -210.6, CURB, 'enter']] };
    case 'office': return { speed: 1.45, phone: true, pts: [[AIA.x1 - 0.6, -145.5, CURB], [-31.0, -145.5, CURB], [-31.4, z(-175, -160), CURB, 'phone'], [-31.6, -188.6, CURB], [-50, -190.8, CURB]] };
  }
}

function bagMesh() {
  const g = new THREE.Group();
  const col = [0xd8c6a8, 0x1b1b1d, 0xb9312f, 0xe9e6df][Math.floor(Math.random() * 4)];
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.11), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })); b.position.y = -0.24; g.add(b);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 4, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.6 })); h.position.y = -0.06; g.add(h);
  return g;
}

export function createWalkers({ scene, people, count = 12, rnd = Math.random }) {
  if (!people) return { update() {} };
  const group = new THREE.Group(); group.name = 'walkers'; scene.add(group);
  const kinds = ['tourist', 'tourist', 'shopper', 'shopper', 'guest', 'office', 'office', 'couple', 'tourist', 'shopper', 'guest', 'office'];
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.3, metalness: 0.5 });
  const list = [];
  for (let i = 0; i < count; i++) {
    const person = createPerson(people, ROLES[i % ROLES.length]); person.root.visible = false;
    person.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(person.root);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); phone.visible = false; group.add(phone);
    const bags = [bagMesh(), bagMesh()]; for (const b of bags) { b.visible = false; group.add(b); }
    const w = { role: ROLES[i % ROLES.length], person, phone, bags, kind: kinds[i % kinds.length], route: null, i: 0, x: 0, z: 0, y: 0, act: 0, actKind: null, done: true, wait: rnd() * 6, buddy: null };
    list.push(w);
  }
  // couples: pair walker 7 with the one after it
  const start = (w) => {
    const r = plan(w.kind, rnd); w.route = r; w.i = 1; [w.x, w.z, w.y] = r.pts[0]; w.done = false; w.act = 0; w.actKind = null;
    w.person.root.visible = true; w.person.play('walk', 0);
    if (r.pair && !w.buddy) { const b = list.find((o) => o !== w && o.done && o.kind !== 'couple'); if (b) { b.buddy = w; b.done = false; b.kind = 'buddy'; b.person.root.visible = true; b.person.play('walk', 0); w.buddy = b; } }
  };
  const _e = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3(), _h = new THREE.Vector3();
  function raise(w, tx, tz) {
    const b = w._bones || (w._bones = ['Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand'].map((n) => w.person.root.getObjectByName(n)));
    if (!b[2]) return; w.person.bones.head.getWorldPosition(_e);
    const dx = tx - _e.x, dz = tz - _e.z, d = Math.hypot(dx, dz) || 1, fx = dx / d, fz = dz / d;
    _t.set(_e.x + fx * 0.3 - fz * 0.04, _e.y - 0.06, _e.z + fz * 0.3 + fx * 0.04); _p.set(-fz * 0.8, -1, fx * 0.8).normalize();
    twoBone(b[0], b[1], b[2], _t, _p);
  }
  const PERSONA = { tourist: ['visitor', 'student', 'youngMan'], shopper: ['auntie', 'office'], guest: ['office', 'youngMan'], office: ['office', 'youngMan'], couple: ['student', 'youngMan'], buddy: ['student'] };
  list.forEach((w, i) => { w.id = `walker${i}`; w.pick = i; });
  return {
    group,
    // people you could stop and talk to: [{ key, persona, x, y, z, hold(on, pp) }]
    talkables() {
      return list.filter((w) => !w.done && w.person.root.visible).map((w) => {
        const opts = PERSONA[w.kind] || ['office'];
        return { key: w.id, persona: personaFor(opts[w.pick % opts.length], roleSex(w.role)), x: w.x, y: w.y + 1.62, z: w.z,
          hold(on, pp) { if (on) { w.act = 999; w.actKind = 'chat'; w.heading = Math.atan2(pp.x - w.x, pp.z - w.z); } else { w.act = 0.2; w.actKind = null; } } };
      });
    },
    update(dt, pp) {
      for (const w of list) {
        if (w.kind === 'buddy') continue;                                   // moved by its partner
        if (w.done) { w.wait -= dt; if (w.wait <= 0 && Math.abs(pp.z - -160) < 140) start(w); continue; }
        const far = Math.hypot(w.x - pp.x, w.z - pp.z) > 85;
        const r = w.route, tgt = r.pts[w.i];
        let moving = true;
        if (w.act > 0) { w.act -= dt; moving = false; if (w.act <= 0) w.actKind = null; }
        else {
          const dx = tgt[0] - w.x, dz = tgt[1] - w.z, d = Math.hypot(dx, dz);
          // make way: someone standing in the path (you) -> slow, step to the right
          const px = pp.x - w.x, pz = pp.z - w.z, pd = Math.hypot(px, pz);
          let sx = 0, sz = 0, sp = r.speed;
          if (pd < 1.6 && (px * dx + pz * dz) / (pd * (d || 1)) > 0.5) { sp *= 0.5; sx = -dz / (d || 1) * 0.9; sz = dx / (d || 1) * 0.9; }
          if (d < 0.15) {
            const a = tgt[3];
            if (a === 'photo') { w.act = 3 + rnd() * 3; w.actKind = 'photo'; }
            else if (a === 'phone') { w.act = 2 + rnd() * 3; w.actKind = 'phone'; }
            else if (a === 'enter') { w.done = true; w.wait = 8 + rnd() * 20; w.person.root.visible = false; if (w.buddy) { w.buddy.person.root.visible = false; w.buddy.done = true; w.buddy.kind = 'tourist'; w.buddy = null; } continue; }
            w.i++;
            if (w.i >= r.pts.length) { w.done = true; w.wait = 4 + rnd() * 14; w.person.root.visible = false; if (w.buddy) { w.buddy.person.root.visible = false; w.buddy.done = true; w.buddy.kind = 'tourist'; w.buddy = null; } continue; }
          } else {
            const st = Math.min(d, sp * dt);
            w.x += (dx / d) * st + sx * dt; w.z += (dz / d) * st + sz * dt; w.y += (tgt[2] - w.y) * Math.min(1, dt * 3);
            w.heading = Math.atan2(dx / d + sx * 0.3, dz / d + sz * 0.3);
          }
        }
        const root = w.person.root;
        root.visible = !far;
        if (far) continue;
        root.position.set(w.x, w.y, w.z);
        if (w.actKind === 'photo') w.heading = Math.PI / 2;                 // toward Pudong
        let a = (w.heading ?? 0) - root.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; root.rotation.y += a * Math.min(1, dt * 5);
        w.person.play(moving && !w.actKind ? 'walk' : 'idle', 0.3);
        w.person.setGait(moving ? r.speed : 0);
        const phoneUp = w.actKind === 'phone' || (r.phone && moving);
        w.person.setPhoneHold(phoneUp && w.actKind !== 'photo' ? 1 : 0);
        w.person.update(dt, Math.hypot(pp.x - w.x, pp.z - w.z) < 4 ? [pp.x, pp.z] : null);
        if (w.actKind === 'photo') raise(w, 400, w.z);
        w.phone.visible = phoneUp || w.actKind === 'photo';
        if (w.phone.visible) { holdPhone(w.phone, w.person, root.rotation.y); if (w.actKind === 'photo') w.phone.rotateZ(Math.PI / 2); }
        // bags in the left hand (one or two)
        for (let k = 0; k < 2; k++) { const b = w.bags[k]; b.visible = !!r.bags && k < r.bags; if (b.visible) { w.person.bones.L.getWorldPosition(_h); b.position.set(_h.x + k * 0.05, _h.y, _h.z + k * 0.04); b.rotation.y = root.rotation.y; } }
        // a couple: the partner walks at their side, on the right
        if (w.buddy) {
          const b = w.buddy, br = b.person.root, h = root.rotation.y;
          br.visible = true; br.position.set(w.x + Math.cos(h) * -0.55, w.y, w.z - Math.sin(h) * -0.55); br.rotation.y = h;
          b.person.play(moving ? 'walk' : 'idle', 0.3); b.person.setGait(moving ? r.speed : 0); b.person.update(dt, null);
        }
      }
    },
  };
}
