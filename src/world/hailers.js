// Other people getting DiDis. At two kerbs on Zhongshan Road someone comes out, stands at the edge
// with their phone, and waits for a car (engine/rideHail.js runs the wait: accepted, the ETA, a text
// to the driver, glances up the street, getting impatient, a call). A real car in the traffic is
// sent to them (the same pull-in the player's DiDi uses, engine/traffic.js pickup); as it comes up
// they look for it, check the plate, wave; it stops at the kerb with its hazards on; they go to the
// rear door and get in; it pulls away. A little later someone else comes out.
//   - west kerb by the AIA Building: southbound cars; people from the office, phone already out
//   - east kerb north of Hankou Road (the river side): northbound cars
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { twoBone } from './driverPose.js';
import { createRide, stepRide, rideAction } from '../engine/rideHail.js';
import { L } from './layout.js';

export const HAIL_SPOTS = [
  { id: 'aia', dir: 1, z: -168, face: 2.5, kerbX: L.westCurbX + 1.4, stand: { x: L.westCurbX - 0.7, z: -168.6 }, from: { x: L.facadeX + 0.6, z: -145.5 }, role: 'p3' },
  { id: 'river', dir: -1, z: -62, face: -0.64, kerbX: L.eastCurbX - 1.35, stand: { x: L.eastCurbX + 0.7, z: -61.2 }, from: { x: L.eastCurbX + 1.6, z: -88 }, role: 'p2' },
];
const CURB = L.curbH;

export function createHailers({ scene, people, traffic, vehicles, audio, rnd = Math.random, busy = () => null }) {
  if (!people) return { update() {}, spots: [] };
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.3, metalness: 0.5 });
  const hazardMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.2, 0.1) });
  const _t = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Vector3();
  const spots = HAIL_SPOTS.map((sp) => {
    const person = createPerson(people, sp.role); person.root.visible = false; person.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(person.root);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); phone.visible = false; scene.add(phone);
    const hz = new THREE.Group(); hz.visible = false; scene.add(hz);
    for (const [x, z] of [[-0.78, 2.3], [0.78, 2.3], [-0.8, -2.35], [0.8, -2.35]]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.05), hazardMat); h.position.set(x, 0.78, z); hz.add(h); }
    return { sp, person, phone, hz, phase: 'off', wait: 6 + rnd() * 20, x: sp.from.x, z: sp.from.z, yaw: 0, ride: null, veh: null, view: null, t: 0, retry: 0, served: 0, log: [] };
  });
  // a car for this kerb: the right direction, upstream far enough to arrive, not anyone else's
  function sendCar(h) {
    const sp = h.sp, stopS = sp.dir > 0 ? sp.z + 2.4 : -sp.z + 2.4;
    const taken = busy();
    const list = traffic.vehicles.map((v, i) => ({ v, i })).filter(({ v }) => v.active && v.lane.dir === sp.dir && !v.pickup && v !== taken && !v.hidden && stopS - v.s > 70 && stopS - v.s < 330);
    list.sort((a, b) => (a.v.lane.id.endsWith('2') ? 1 : 0) - (b.v.lane.id.endsWith('2') ? 1 : 0) || b.v.s - a.v.s);
    const pick = list[0]; if (!pick) return false;
    const veh = pick.v;
    veh.pickup = { stopS, dx: sp.kerbX - veh.lane.x, state: 'approach', npc: sp.id };
    veh.v0 = Math.min(veh.v0, 10);
    h.veh = veh; h.view = vehicles.list[pick.i]; return true;
  }
  const near = (a, b, d) => Math.hypot(a.x - b.x, a.z - b.z) < d;
  function walkTo(h, tx, tz, speed, dt) {
    const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
    if (d < 0.08) return true;
    const st = Math.min(d, speed * dt); h.x += (dx / d) * st; h.z += (dz / d) * st; h.yaw = Math.atan2(dx, dz); return false;
  }
  const wave = (h, k) => {
    const b = h._arm || (h._arm = ['Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand'].map((n) => h.person.root.getObjectByName(n)));
    if (!b[2]) return; h.person.bones.head.getWorldPosition(_e);
    const s = Math.sin(h.yaw), c = Math.cos(h.yaw);
    _t.set(_e.x + s * 0.25 - c * 0.3 + Math.sin(k * 9) * 0.06 * c, _e.y + 0.28, _e.z + c * 0.25 + s * 0.3 - Math.sin(k * 9) * 0.06 * s); _p.set(-c, -0.4, s).normalize();
    twoBone(b[0], b[1], b[2], _t, _p);
  };
  return {
    spots,
    update(dt, pp) {
      for (const h of spots) {
        const sp = h.sp, P = h.person, root = P.root;
        // ---- the story ----
        if (h.phase === 'off') {
          h.wait -= dt;
          if (h.wait <= 0) { h.phase = 'walk'; h.x = sp.from.x; h.z = sp.from.z; h.ride = createRide(rnd); h.veh = null; root.visible = true; P.play('walk', 0); }
          else continue;
        }
        if (h.log.at(-1) !== h.phase) h.log.push(h.phase);
        if (h.veh && h.veh.pickup && h.log.at(-1) !== `car:${h.veh.pickup.state}`) h.log.push(`car:${h.veh.pickup.state}`);
        if (h.log.length > 60) h.log.splice(0, 20);
        let moving = false, look = null, act = 'phone';
        if (h.phase === 'walk') {
          moving = !walkTo(h, sp.stand.x, sp.stand.z, 1.3, dt);
          if (!moving) { h.phase = 'wait'; h.yaw = sp.face; }                      // half to the road, half up it
        } else if (h.phase === 'wait') {
          if (h.veh && !h.veh.active) { h.veh.pickup = null; h.veh = null; h.retry = 2; }
          const r = h.ride, car = h.veh && h.veh.pickup ? { dist: Math.max(0, h.veh.pickup.stopS - h.veh.s), stopped: h.veh.pickup.state === 'parked' } : null;
          stepRide(r, dt, car);
          for (const e of r.events.splice(0)) if (e === 'accepted') { if (!sendCar(h)) h.retry = 3; }
          if (r.phase !== 'request' && !h.veh) { h.retry -= dt; if (h.retry <= 0) { if (!sendCar(h)) h.retry = 4; } }
          act = rideAction(r);
          if (act === 'lookStreet') look = [sp.stand.x, sp.stand.z + (sp.dir > 0 ? -40 : 40)];
          if (r.phase === 'spotting' && h.veh) look = [h.veh.x, h.veh.z];
          if (r.phase === 'boarding') { h.phase = 'board'; h.t = 0; }
        } else if (h.phase === 'board') {
          // to the rear door on the kerb side, in, door shut
          const v = h.veh, side = sp.dir > 0 ? -1 : 1, door = { x: v.x + side * (1.05), z: v.z - sp.dir * 0.65 };
          h.t += dt;
          if (h.t < 2.2) { moving = !walkTo(h, door.x, door.z, 1.2, dt); if (!moving) h.yaw = Math.atan2(v.x - h.x, v.z - h.z); }
          if (h.t > 2.4 && root.visible) { root.visible = false; h.phone.visible = false; if (near(pp, h, 30) && audio && audio.cue) audio.cue('door', 0, 0.5 / (1 + Math.hypot(pp.x - h.x, pp.z - h.z) / 6)); }
          if (h.t > 3.4) { v.pickup.state = 'go'; v.v0 = 9; h.phase = 'leaving'; h.served++; }
        } else if (h.phase === 'leaving') {
          const v = h.veh;
          if (!v.pickup || v.s > v.pickup.stopS + 32 || !v.active) { if (v.pickup && v.pickup.npc === sp.id) v.pickup = null; h.veh = null; h.phase = 'off'; h.wait = 35 + rnd() * 60; }
        }
        // the car's hazards while it pulls in and waits
        const v = h.veh, pk = v && v.pickup;
        h.hz.visible = !!(pk && (pk.state === 'parked' || (pk.state === 'approach' && pk.stopS - v.s < 30))) && (performance.now() % 1000 < 520);
        if (h.hz.visible) { h.hz.position.set(v.x, 0, v.z); h.hz.rotation.y = v.yaw; }
        // ---- the body ----
        if (!root.visible) continue;
        const far = Math.hypot(pp.x - h.x, pp.z - h.z) > 90;
        if (far) continue;
        root.position.set(h.x, CURB, h.z);
        let a = h.yaw - root.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; root.rotation.y += a * Math.min(1, dt * 6);
        P.play(moving ? 'walk' : 'idle', 0.3); P.setGait(moving ? 1.3 : 0);
        const phoneUp = (act === 'phone' || act === 'call' || h.phase === 'walk') && h.phase !== 'board';
        P.setPhoneHold(phoneUp ? 1 : 0);
        P.update(dt, look);
        if (h.phase === 'wait' && h.ride.waved && h.ride.phase === 'spotting') wave(h, h.ride.t);
        h.phone.visible = phoneUp || act === 'call';
        if (h.phone.visible) holdPhone(h.phone, P, root.rotation.y);
      }
    },
  };
}
