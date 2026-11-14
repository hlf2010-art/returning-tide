// The courier at the kerb (engine/shopping.js decides when he comes). He parks his e-bike on the
// Hankou Road pavement near Manner, the way couriers do, messages you, and waits: checking his
// phone, glancing up the street, looking at you when you come close, a small wave when you're
// near. E takes the parcel from him; then he's back on his phone for the next drop, and he and the
// bike are gone once you've walked away. If you never come, he gives up and leaves for the hotel.
// A generic e-bike with a delivery box: no company colours, no logos.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { L } from './layout.js';
import { holdPhone } from './pedestriansReal.js';

export const COURIER_SPOT = { x: -66.2, z: -5.2, yaw: 0, bike: { x: -67.75, z: -4.5 } };   // north pavement, by the kerb

function std(o) { return new THREE.MeshStandardMaterial(o); }

function makeBike() {
  const g = new THREE.Group(); g.name = 'courier-ebike';
  const dark = std({ color: 0x1b1d22, roughness: 0.55, metalness: 0.3 }), body = std({ color: 0x3b4250, roughness: 0.4, metalness: 0.2 });
  const tyre = std({ color: 0x0c0c0d, roughness: 0.9 }), box = std({ color: 0x2c3a52, roughness: 0.65 }), chrome = std({ color: 0xb8bcc4, roughness: 0.25, metalness: 1 });
  for (const x of [-0.62, 0.62]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 8, 20), tyre); w.position.set(x, 0.25, 0); g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 10), chrome); hub.rotation.x = Math.PI / 2; hub.position.set(x, 0.25, 0); g.add(hub);
  }
  const cap = (r, len, mat, x, y, rz) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat); m.position.set(x, y, 0); m.rotation.z = rz; m.scale.z = 1.25; g.add(m); return m; };
  cap(0.08, 0.5, dark, 0.02, 0.3, Math.PI / 2);                     // footboard
  cap(0.15, 0.42, body, -0.42, 0.52, Math.PI / 2 + 0.12);           // rear body over the battery
  cap(0.1, 0.5, body, 0.42, 0.62, -0.32);                            // front shield / leg guard
  const seat = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 4, 10), dark); seat.rotation.z = Math.PI / 2; seat.scale.set(1, 1, 1.15); seat.position.set(-0.36, 0.72, 0); g.add(seat);
  for (const x of [-0.62, 0.62]) { const fender = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 6, 14, Math.PI * 0.9), body); fender.position.set(x, 0.25, 0); fender.rotation.z = Math.PI * 0.05; g.add(fender); }
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), chrome); fork.position.set(0.55, 0.72, 0); fork.rotation.z = -0.28; g.add(fork);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), dark); bar.position.set(0.66, 1.14, 0); bar.rotation.x = Math.PI / 2; g.add(bar);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) })); lamp.position.set(0.71, 0.98, 0); g.add(lamp);
  const holder = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.08), dark); holder.position.set(0.62, 1.2, 0.12); g.add(holder);   // phone clamp
  // the delivery box on the rack, and the windproof quilt draped over the handlebars (they all have one in November)
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.46), box); crate.position.set(-0.5, 1.0, 0); g.add(crate);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.48), dark); lid.position.set(-0.5, 1.235, 0); g.add(lid);
  const quilt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.56), std({ color: 0x23262d, roughness: 0.95 })); quilt.position.set(0.5, 0.86, 0); quilt.rotation.z = -0.3; g.add(quilt);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function makeParcel(size = 1) {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.26 * size, 0.12 * size, 0.2 * size), std({ color: 0xb8925f, roughness: 0.92 }));
  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.262 * size, 0.122 * size, 0.045 * size), std({ color: 0xc9a774, roughness: 0.4 }));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * size, 0.07 * size), std({ color: 0xf4f2ee, roughness: 0.8 }));
  label.rotation.x = -Math.PI / 2; label.position.set(0.06 * size, 0.0605 * size, 0.04 * size);
  g.add(card, tape, label);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createCourier({ scene, people }) {
  const group = new THREE.Group(); group.name = 'courier'; group.visible = false; scene.add(group);
  const bike = makeBike(); bike.position.set(COURIER_SPOT.bike.x, L.curbH, COURIER_SPOT.bike.z); bike.rotation.y = Math.PI; group.add(bike);
  let person = null, parcel = makeParcel(), phoneProp = null;
  if (people) {
    person = createPerson(people, 'p3');
    person.root.position.set(COURIER_SPOT.x, L.curbH, COURIER_SPOT.z); person.root.name = 'courier-person';
    person.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(person.root);
    phoneProp = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), std({ color: 0x151517, roughness: 0.3, metalness: 0.5 }));
    group.add(phoneProp);
  }
  group.add(parcel);
  const S = { active: false, orders: [], state: 'idle', t: 0, waved: false, handed: false, awayT: 0, look: 0 };
  const _v = new THREE.Vector3(), _f = new THREE.Vector3();

  return {
    group,
    get active() { return S.active; },
    get waiting() { return S.active && !S.handed; },
    get orders() { return S.orders.slice(); },
    spot: COURIER_SPOT,
    // where the prompt points (chest height)
    get focus() { return { x: COURIER_SPOT.x, y: L.curbH + 1.25, z: COURIER_SPOT.z }; },
    dispatch(orderId) {
      if (!S.orders.includes(orderId)) S.orders.push(orderId);
      if (S.active && !S.handed) return;
      Object.assign(S, { active: true, state: 'wait', t: 0, waved: false, handed: false, awayT: 0 });
      group.visible = true; parcel.visible = true;
    },
    // he gave up (the shop sends it to the hotel)
    leave(orderId) {
      S.orders = S.orders.filter((o) => o !== orderId);
      if (!S.orders.length && !S.handed) { S.active = false; group.visible = false; }
    },
    // E: he hands you the parcel; returns the order ids now yours
    handOver() {
      if (!S.active || S.handed) return [];
      const got = S.orders.slice(); S.orders = []; S.handed = true; S.state = 'handing'; S.t = 0;
      parcel.visible = false;
      return got;
    },
    update(dt, player, camera) {
      if (!S.active) return;
      S.t += dt;
      const dx = player.x - COURIER_SPOT.x, dz = player.z - COURIER_SPOT.z, dist = Math.hypot(dx, dz);
      let lookAt = null;
      if (person) {
        const r = person.root;
        // facing: the street while he waits; you once you're close
        const want = dist < 7 ? Math.atan2(dx, dz) : COURIER_SPOT.yaw + Math.sin(S.t * 0.13) * 0.5;
        let d = want - r.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        r.rotation.y += d * Math.min(1, dt * 2.5);
        if (dist < 9) lookAt = [player.x, player.z];
        if (S.state === 'wait') {
          if (!S.waved && dist < 6) { S.waved = true; person.play('wave', 0.3); S.waveT = 2.2; }
          if (S.waveT > 0) { S.waveT -= dt; if (S.waveT <= 0) person.play('idle', 0.4); }
          // on his phone when nobody's near; glances up the street every so often
          const glance = (S.t % 11) > 9.3;
          person.setPhoneHold(dist > 4 && !glance && !(S.waveT > 0) ? 1 : 0);
        } else if (S.state === 'handing') {
          if (S.t < 0.1) person.play('wave', 0.2);
          if (S.t > 1.4) { S.state = 'after'; person.play('idle', 0.4); }
          person.setPhoneHold(0);
        } else person.setPhoneHold(1);                                  // next drop
        person.update(dt, lookAt);
        // props: the parcel at his side in the free hand; the phone in the right palm when it's up
        person.bones.L.getWorldPosition(_v);
        parcel.position.set(_v.x, Math.max(L.curbH + 0.1, _v.y - 0.08), _v.z); parcel.rotation.y = r.rotation.y;
        if (phoneProp) {
          const up = S.state !== 'handing' && !(S.waveT > 0) && (S.state === 'after' || dist > 4);
          phoneProp.visible = up;
          if (up) holdPhone(phoneProp, person, r.rotation.y);
        }
      }
      // once he's handed it over and you've walked away (or turned away), he's gone
      if (S.handed) {
        camera.getWorldDirection(_f);
        const seen = _f.dot(_v.set(COURIER_SPOT.x - camera.position.x, 1 - camera.position.y, COURIER_SPOT.z - camera.position.z).normalize()) > 0.55;
        S.awayT = (dist > 22 || !seen) && S.t > 4 ? S.awayT + dt : 0;
        if (S.awayT > 2.5) { S.active = false; group.visible = false; }
      }
    },
  };
}
