// Background pedestrians at the crossing: same low-poly style as Old Lin and Ms. Su, but with
// hip / shoulder pivots so they can walk. Behaviour lives in engine/traffic.js; this only draws.
import * as THREE from 'three';
import { groundHeight } from './layout.js';
import { createInstancer } from './instancer.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const LOOKS = [
  { coat: 0x2f3a2e, pants: 0x1b1c20, skin: 0xd8ab8f, hair: 0x141214, h: 1.76 },                 // office worker, olive jacket
  { coat: 0x7a2630, pants: 0x202024, skin: 0xe0b498, hair: 0x1a1517, h: 1.62, bag: 0xd9c9a8 },  // red coat, tote bag
  { coat: 0xb8b2a6, pants: 0x30343c, skin: 0xd2a487, hair: 0x231c18, h: 1.71 },                 // light trench
  { coat: 0x4a4038, pants: 0x2a2a2c, skin: 0xcc9f86, hair: 0xb9b9b6, h: 1.6, elderly: true },  // grey-haired, with a stick
];

// One shared white material; each instance carries its own colour (coat, skin, hair...).
const mat = std({ color: 0xffffff, roughness: 0.82 });
const G = {
  thigh: new THREE.CylinderGeometry(0.07, 0.056, 0.44, 8), shin: new THREE.CylinderGeometry(0.054, 0.043, 0.42, 8),
  foot: new THREE.BoxGeometry(0.095, 0.06, 0.23), skirt: new THREE.CylinderGeometry(0.15, 0.2, 0.3, 10),
  chest: new THREE.CylinderGeometry(0.17, 0.148, 0.46, 10), neck: new THREE.CylinderGeometry(0.045, 0.05, 0.1, 8),
  head: new THREE.SphereGeometry(0.102, 12, 10), cap: new THREE.SphereGeometry(0.106, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  upper: new THREE.CylinderGeometry(0.046, 0.04, 0.27, 8), fore: new THREE.CylinderGeometry(0.039, 0.032, 0.24, 8),
  hand: new THREE.SphereGeometry(0.033, 8, 6), bag: new THREE.BoxGeometry(0.06, 0.3, 0.3), stick: new THREE.CylinderGeometry(0.012, 0.012, 0.86, 6),
};

function build(look, inst) {
  const s = look.h / 1.7;
  // a pivot that the instancer draws as `key`, coloured `color`
  const piece = (parent, key, color, x = 0, y = 0, z = 0) => {
    const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o);
    inst.add(key, G[key], mat, o, color);
    return o;
  };
  const root = new THREE.Group(); root.scale.setScalar(s);
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.095, 0.88, 0);
    piece(hip, 'thigh', look.pants, 0, -0.22, 0);
    const knee = new THREE.Group(); knee.position.y = -0.44;
    piece(knee, 'shin', look.pants, 0, -0.21, 0); piece(knee, 'foot', 0x0d0d0e, 0, -0.41, 0.04);
    hip.add(knee); root.add(hip); legs.push({ hip, knee });
  }
  const torso = new THREE.Group(); torso.position.y = 0.88; root.add(torso);
  piece(torso, 'skirt', look.coat, 0, -0.05, 0).scale.set(1.12, 1, 0.8);
  piece(torso, 'chest', look.coat, 0, 0.24, 0).scale.set(1.15, 1, 0.78);
  piece(torso, 'neck', look.skin, 0, 0.5, 0);
  piece(torso, 'head', look.skin, 0, 0.64, 0).scale.set(0.9, 1.12, 0.97);
  piece(torso, 'cap', look.hair, 0, 0.655, -0.01).rotation.x = -0.2;
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.205, 0.43, 0);
    piece(sh, 'upper', look.coat, 0, -0.135, 0);
    const el = new THREE.Group(); el.position.y = -0.27;
    piece(el, 'fore', look.coat, 0, -0.12, 0); piece(el, 'hand', look.skin, 0, -0.255, 0);
    sh.add(el); torso.add(sh); arms.push({ sh, el });
  }
  if (look.bag) piece(arms[0].el, 'bag', look.bag, 0, -0.34, 0);
  if (look.elderly) {
    torso.rotation.x = 0.16;                                                     // a slight stoop
    piece(arms[0].el, 'stick', 0x3b2a1c, 0, -0.62, 0.05);
  }
  return { root, legs, arms, torso, elderly: !!look.elderly };
}

export function createPedestrians(simPeds) {
  const inst = createInstancer('crossing-pedestrians');
  const group = inst.group;                                                      // pivots live here too; only the instanced meshes draw
  const list = simPeds.map((p) => { const b = build(LOOKS[p.look % LOOKS.length], inst); group.add(b.root); return b; });
  inst.build();
  return {
    group,
    update(sim, dt) {
      for (let i = 0; i < list.length; i++) {
        const b = list[i], p = sim[i];
        b.root.position.set(p.x, groundHeight(p.x, p.z), p.z);
        let d = p.heading - b.root.rotation.y;                                   // turn smoothly, never snap
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        b.root.rotation.y += d * Math.min(1, dt * 8);
        const moving = Math.min(1, Math.hypot(p.vx, p.vz) / 0.5);
        const ph = p.walkPhase, amp = (b.elderly ? 0.32 : 0.5) * moving;
        b.legs.forEach((l, k) => {
          const sw = Math.sin(ph + k * Math.PI);
          l.hip.rotation.x = sw * amp;
          l.knee.rotation.x = Math.max(0, -Math.cos(ph + k * Math.PI)) * amp * 1.3;
        });
        b.arms.forEach((a, k) => { a.sh.rotation.x = -Math.sin(ph + k * Math.PI) * amp * 0.7; a.el.rotation.x = -0.2 - 0.2 * moving; });
        b.root.position.y += Math.abs(Math.sin(ph)) * 0.025 * moving;
        b.root.updateMatrixWorld(true);
      }
      inst.sync();
    },
  };
}
