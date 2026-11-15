// Early morning on the promenade: a tai chi group facing the river (from about 5:45 to 8:15, as on
// the real Bund). The avatar set has no tai chi clip, so the form is posed by hand over the idle:
// two-handed IK for the arms, the hips sinking as the knees bend, the waist turning. A slow loop of
// two movements: the opening (起势: arms float up to shoulder height, draw in, press down as you sink)
// and cloud hands (云手: one hand at the face, one at the waist, sweeping side to side with the waist).
import * as THREE from 'three';
import { createPerson } from './people.js';
import { twoBone, turn } from './driverPose.js';
import { L } from './layout.js';

const SPOT = { x: 19.6, z: -69 };
const ROLES = ['p5', 'p4', 'p5', 'p2', 'p4', 'p5', 'p3', 'p5'];
const CYCLE = 22;                                    // seconds: the opening (10), cloud hands (12)
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));

export function createDawn({ scene, people, addCollider = null }) {
  const group = new THREE.Group(); group.name = 'dawn-taichi'; group.visible = false; scene.add(group);
  const members = [];
  if (people) {
    // a teacher at the front, facing the others; the rest in two rows facing the river (and the teacher)
    const spots = [{ x: SPOT.x + 3.2, z: SPOT.z, yaw: -Math.PI / 2, lead: true }];
    for (let r = 0; r < 2; r++) for (let k = 0; k < (r ? 4 : 3); k++) spots.push({ x: SPOT.x - r * 1.9, z: SPOT.z + (k - (r ? 1.5 : 1)) * 1.8, yaw: Math.PI / 2 });
    spots.forEach((s, i) => {
      const role = people.manifest.cast[ROLES[i]] ? ROLES[i] : Object.keys(people.manifest.cast).find((r) => /^p\d/.test(r));
      if (!role) return;
      const p = createPerson(people, role);
      p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      p.root.position.set(s.x, L.deckY, s.z); p.root.rotation.y = s.yaw; p.root.scale.setScalar(0.01 * (0.96 + (i % 3) * 0.02));
      p.play('idle', 0); group.add(p.root);
      const bone = (n) => p.root.getObjectByName(n);
      const arms = ['R', 'L'].map((side) => ['UpperArm', 'Forearm', 'Hand'].map((b) => bone(`Bip01_${side}_${b}`)));
      const box = addCollider ? addCollider('npc') : null;
      members.push({ p, s, arms, spine: bone('Bip01_Spine1') || bone('Bip01_Spine'), lag: i === 0 ? 0 : 0.25 + (i % 4) * 0.12, box });
    });
  }
  const _t = new THREE.Vector3(), _pole = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let on = false, clock = 0;
  function pose(m, t) {
    const { p, s, arms } = m, yaw = p.root.rotation.y;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;      // forward, and to the person's right
    const c = ((t % CYCLE) + CYCLE) % CYCLE;
    let sink = 0, waist = 0;
    const hands = [];                                                   // [R, L]: { f forward, r right, y height above the deck }
    if (c < 10) {
      // the opening: float up (0-3.5), draw in (3.5-5), press down and sink (5-8.5), rest
      const up = ease(c / 3.5) * (1 - ease((c - 5) / 3.5)), draw = ease((c - 3.5) / 1.5) * (1 - ease((c - 5) / 3.5));
      sink = ease((c - 5) / 3.5) * (1 - ease((c - 8.5) / 1.5)) * 0.09;
      const y = 0.95 + up * 0.48 - sink, f = 0.22 + up * 0.24 - draw * 0.12;
      hands.push({ f, r: 0.2, y }, { f, r: -0.2, y });
    } else {
      // cloud hands: two sweeps; the upper hand passes the face, the lower the waist, the waist turns with them
      const k = (c - 10) / 6, ph = Math.sin(Math.PI * 2 * k * 0.5 * 2 - Math.PI / 2);   // -1..1, twice
      const fade = ease((c - 10) / 1.2) * (1 - ease((c - 20.8) / 1.2));
      waist = ph * 0.35 * fade; sink = 0.05 * fade;
      const hi = 1.38 - sink, lo = 1.0 - sink, sw = ph * 0.3;
      const rHi = Math.sin(Math.PI * k * 2) > 0;
      hands.push({ f: 0.3, r: 0.12 + sw, y: THREE.MathUtils.lerp(1.0, rHi ? hi : lo, fade) }, { f: 0.3, r: -0.12 + sw, y: THREE.MathUtils.lerp(1.0, rHi ? lo : hi, fade) });
    }
    p.root.position.set(s.x, L.deckY - sink, s.z);
    p.root.updateMatrixWorld(true);
    if (m.spine && waist) turn(m.spine, UP, waist);
    arms.forEach(([a, b, h], i) => {
      if (!h) return;
      const H = hands[i], side = i === 0 ? 1 : -1;
      _t.set(s.x + fx * H.f + rx * H.r, L.deckY + H.y, s.z + fz * H.f + rz * H.r);
      _pole.set(rx * side * 0.6, -1, rz * side * 0.6).normalize();          // elbows down and a little out
      twoBone(a, b, h, _t, _pole);
    });
  }
  return {
    group,
    get on() { return on; },
    // the people the crowd walks round
    others() { return on ? members.map((m) => ({ x: m.s.x, z: m.s.z, vx: 0, vz: 0 })) : []; },
    update(dt, { dawn = false, eye = null } = {}) {
      if (dawn !== on) {
        on = dawn; group.visible = on;
        for (const m of members) if (m.box) { const b = m.box; if (on) { b.minX = m.s.x - 0.25; b.maxX = m.s.x + 0.25; b.minZ = m.s.z - 0.25; b.maxZ = m.s.z + 0.25; b.y0 = L.deckY - 0.5; b.y1 = L.deckY + 1.8; } else { b.minX = b.maxX = 1e6; } }
      }
      if (!on) return;
      clock += dt;
      const far = eye && Math.hypot(eye.x - SPOT.x, eye.z - SPOT.z) > 120;
      for (const m of members) {
        m.p.update(far ? 0 : dt);
        if (!far) pose(m, clock - m.lag);
      }
    },
  };
}
