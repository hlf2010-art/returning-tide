// The four background pedestrians as real people (Rocketbox avatars, see people.js). Same
// contract as pedestrians.js: behaviour comes from engine/traffic.js, this only draws and animates.
import * as THREE from 'three';
import { groundHeight } from './layout.js';
import { createPerson } from './people.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const UMB_COLORS = { p1: 0x1d2a44, p2: 0x3a1420, p3: 0x202024, p4: 0x141416 };
const canopyGeo = new THREE.ConeGeometry(0.55, 0.3, 14, 1, true), shaftGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.72, 6);
const phoneGeo = new THREE.BoxGeometry(0.07, 0.145, 0.009), screenGeo = new THREE.PlaneGeometry(0.062, 0.128);
const phoneMat = std({ color: 0x101012, roughness: 0.3, metalness: 0.4 });
const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.5, 1.8) });

// The Customs House portico stands on a plinth (0.40 m, then 0.75 m): the sheltering walker steps up onto it.
export function pedGround(x, z) {
  if (x > -34 && x < -31.0 && z > 18 && z < 36) return x < -31.2 && z > 18.4 && z < 35.6 ? 0.75 : 0.4;
  return groundHeight(x, z);
}

export function createRealPedestrians(simPeds, people) {
  const group = new THREE.Group(); group.name = 'crossing-pedestrians';
  const _e = new THREE.Euler(), _q = new THREE.Quaternion();
  const list = simPeds.map((p) => {
    const person = createPerson(people, p.id);
    person.root.name = `person-${p.id}`;
    const umb = new THREE.Group(); umb.name = `umbrella-${p.id}`; umb.visible = false;
    const shaft = new THREE.Mesh(shaftGeo, std({ color: 0x1a1a1a, roughness: 0.5 })); shaft.position.y = 0.36;
    const canopy = new THREE.Mesh(canopyGeo, std({ color: UMB_COLORS[p.id] || 0x202024, roughness: 0.45, side: THREE.DoubleSide })); canopy.position.y = 0.7;
    umb.add(shaft, canopy);
    const phone = new THREE.Group(); phone.name = `phone-${p.id}`; phone.visible = false;
    const screen = new THREE.Mesh(screenGeo, screenMat); screen.position.z = 0.0052;
    phone.add(new THREE.Mesh(phoneGeo, phoneMat), screen);
    group.add(person.root, umb, phone);
    return { person, umb, canopy, phone };
  });
  return {
    group,
    people: list.map((l) => l.person),
    update(sim, dt) {
      for (let i = 0; i < list.length; i++) {
        const { person, umb, canopy, phone } = list[i], p = sim[i], r = person.root;
        r.position.set(p.x, pedGround(p.x, p.z), p.z);
        let d = p.heading - r.rotation.y;                                          // turn smoothly, never snap
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        r.rotation.y += d * Math.min(1, dt * 6);
        const speed = Math.hypot(p.vx, p.vz);
        let state;
        if (speed > 1.6) state = 'jog';
        else if (speed > 0.15) state = 'walk';
        else if (p.react === 'phoning') state = 'phone';
        else if (p.umbrella > 0.5) state = 'umbrella';
        else state = p.react === 'sheltered' || p.state === 'waiting' ? 'look' : 'idle';
        person.play(state, 0.4);
        person.setGait(speed);
        person.setUmbrella(state === 'phone' ? 0 : p.umbrella);
        person.update(dt);
        // umbrella: in the raised hand, kept upright, opening with the simulation's amount
        const u = p.umbrella;
        umb.visible = u > 0.02;
        if (umb.visible) {
          umb.position.copy(person.anchors.umbrella.position);
          umb.quaternion.copy(_q.setFromEuler(_e.set(0.06, r.rotation.y, 0, 'YXZ')));
          canopy.scale.set(0.15 + 0.85 * u, 0.5 + 0.5 * u, 0.15 + 0.85 * u);
        }
        // phone: in the right palm, following the hand
        phone.visible = p.phone > 0.02;
        if (phone.visible) {
          phone.position.copy(person.anchors.phone.position);
          phone.quaternion.copy(person.anchors.phone.quaternion);
          phone.translateY(-0.02); phone.translateZ(0.05);
        }
      }
    },
  };
}
