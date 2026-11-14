// A DiDi car in the world, and you in it. engine/ride.js keeps the ride's state and the fare; this
// drives one of the real cars in the Zhongshan Road traffic to you and takes you away:
//   - a northbound car is picked well down the road, gets the driver's plate, and works its way up
//     in the ordinary traffic; near the corner it signals, slows and pulls in to the east kerb
//     just north of Hankou Road (the pickup point), hazards on
//   - you walk to its rear door (check the plate on the back!) and E gets you in
//   - inside (world/cabin.js): the rear right seat (where people sit in a Shanghai taxi), the car's
//     own body around you with its glass see-through, the driver sat at the wheel (world/driverPose.js:
//     hands on the rim, feet on the pedals), the route on the centre screen, street light sweeping
//     through; mouse to look around. The driver talks or doesn't; you answer with 1-4, or don't
//   - on the way: someone steps out looking at their phone, or a car cuts in. Hard braking, and the
//     driver says what they think of it
//   - at the end of the Bund the car goes on into the city (the drive continues as passing light),
//     then you're there
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { makeCanvas, tex, FONT } from './canvas.js';
import { CARS } from './carModels.js';
import { makeCabin } from './cabin.js';
import { createSeatedPose } from './driverPose.js';

export const PICKUP = { x: -3.2, z: -18.5, kerbX: -5.35 };      // where you stand / where the car's centre stops
const RIDE_END_Z = -330;                                          // the car leaves the modelled Bund here

function std(o) { return new THREE.MeshStandardMaterial(o); }

// the plate on the back of the picked car, swapped for the driver's
function plateCanvas(text) {
  const [c, ctx] = makeCanvas(256, 80);
  const g = ctx.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#e8f5e9'); g.addColorStop(1, '#5fbf6a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 80); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 74);
  ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 46px ${FONT.sans}`; ctx.fillText(text, 128, 44);
  return tex(c, { repeat: false });
}

export function createDidi({ scene, people, traffic, vehicles, camera, player, renderer = null }) {
  if (renderer) renderer.localClippingEnabled = true;                       // the cut-away in the ride car's body (costs nothing elsewhere)
  const S = { veh: null, view: null, cabin: null, driver: null, state: 'idle', t: 0, events: [], plate: '', look: 0, hazard: 0, ped: null, cut: null, scheduled: [] };
  const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  const hazardMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.2, 0.1) });
  const hazards = new THREE.Group(); hazards.visible = false; scene.add(hazards);
  for (const [x, z] of [[-0.78, 2.3], [0.78, 2.3], [-0.8, -2.35], [0.8, -2.35]]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.05), hazardMat); h.position.set(x, 0.78, z); hazards.add(h); }
  // the person who steps out without looking
  let walker = null, walkerPhone = null;
  if (people) {
    walker = createPerson(people, 'p4'); walker.root.visible = false; scene.add(walker.root);
    walkerPhone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), std({ color: 0x18181a, roughness: 0.3 })); walkerPhone.visible = false; scene.add(walkerPhone);
  }
  const ev = (e) => S.events.push(e);

  // pick a northbound car down the road and send it to the pickup point
  function dispatch(plate) {
    const nb = traffic.vehicles.map((v, i) => ({ v, i })).filter(({ v, i }) => v.active && v.lane.dir < 0 && vehicles.list[i].lookalike && !v.pickup && v.s < -60);
    nb.sort((a, b) => (a.v.lane.id === 'nb2' ? 0 : 1) - (b.v.lane.id === 'nb2' ? 0 : 1) || b.v.s - a.v.s);
    let pick = nb[0];
    if (!pick) {                                                               // nobody suitable on the road: one joins from the south, out of sight
      const idle = traffic.vehicles.map((v, i) => ({ v, i })).find(({ v, i }) => !v.active && v.lane.dir < 0 && vehicles.list[i].lookalike && !v.pickup);
      if (!idle) return null;
      const lane = idle.v.lane, rear = lane.vehicles.filter((o) => o.active).reduce((m, o) => Math.min(m, o.s - o.len), Infinity);
      if (rear < -150) return null;                                            // no room at the back of the queue yet
      Object.assign(idle.v, { active: true, s: -170, v: 9, hold: 0, committed: false, waited: 0 });
      pick = idle;
    }
    const veh = pick.v, view = vehicles.list[pick.i];
    const stopS = -PICKUP.z + veh.len / 2;                                     // northbound: z = -s + len/2
    veh.pickup = { stopS, dx: PICKUP.kerbX - veh.lane.x, state: 'approach' };
    veh.v0 = Math.min(veh.v0, 9.5);
    S.veh = veh; S.view = view; S.state = 'coming'; S.plate = plate; S.t = 0;
    // the plate: this car is now the driver's
    const plateMesh = view.g.children.find((c) => c.isMesh && c.material && c.material.map && c.geometry.parameters && c.geometry.parameters.height === 0.14);
    if (plateMesh) { plateMesh.material = plateMesh.material.clone(); plateMesh.material.map = plateMesh.material.emissiveMap = plateCanvas(plate); }
    return { model: view.model || null, id: veh.id };
  }

  function board(driverSpec) {
    if (S.state !== 'waiting') return false;
    S.cabin = makeCabin(S.view.model); scene.add(S.cabin.group);
    // the car stays as it is around you: its glass made see-through and its closed shell cut open
    // where the cabin is (this car only; the planes follow the car, see update)
    const B = S.cabin.clipBox;
    S.clipLocal = [[1, 0, 0, -B.x], [-1, 0, 0, -B.x], [0, 1, 0, -B.y1], [0, -1, 0, B.y0], [0, 0, 1, -B.z1], [0, 0, -1, B.z0]].map(([a, b, c, d]) => new THREE.Plane(new THREE.Vector3(a, b, c), d));
    S.clipWorld = S.clipLocal.map((p) => p.clone());
    S.glass = [];
    S.view.g.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      S.glass.push([o, o.material]);
      if (o.material.roughness === 0.04 && o.material.metalness === 0.9) {
        o.material = new THREE.MeshStandardMaterial({ color: 0x0c1116, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 });
      } else {
        o.material = o.material.clone(); o.material.clippingPlanes = S.clipWorld; o.material.clipIntersection = true;
      }
    });
    if (people) {
      const role = driverSpec.sex === 'f' ? 'p2' : driverSpec.id === 'shi-gu' ? 'lin' : 'p1';
      S.driver = createPerson(people, role); S.cabin.group.add(S.driver.root);
      S.pose = createSeatedPose(S.driver);
      S.driver.root.position.set(S.cabin.driverSide, 0, S.cabin.hip.z); S.driver.root.rotation.y = 0;   // seated properly by the pose each frame
      S.driver.root.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0.018, 0.018, 0.02); } });
    }
    S.state = 'boarding'; S.t = 0; S.steer = 0; S.prevYaw = S.veh.yaw;
    player.lookOnly = true; player.enabled = false;
    player.yaw = S.veh.yaw + Math.PI + 0.14; player.pitch = -0.1;               // forward, toward the gap by the driver
    ev({ type: 'door' });
    return true;
  }

  // things happen on the road (once each, at a random point in the drive)
  function schedule(rnd) {
    S.scheduled = [];
    if (rnd() < 0.6) S.scheduled.push({ kind: 'jaywalk', at: 6 + rnd() * 12 });
    if (rnd() < 0.5) S.scheduled.push({ kind: 'cutIn', at: 4 + rnd() * 18 });
  }

  function startJaywalk() {
    if (!walker) return false;
    const z = S.veh.z - 26;
    if (z < RIDE_END_Z + 40) return false;
    S.ped = { x: -16.5, z, t: 0 };
    walker.root.visible = true; walkerPhone.visible = true;
    walker.root.position.set(S.ped.x, 0, z); walker.root.rotation.y = Math.PI / 2;   // walking east, head down
    walker.play('walk'); walker.setPhoneHold(1);
    return true;
  }
  function startCutIn() {
    const me = S.veh, other = me.lane.id === 'nb2' ? 'nb1' : 'nb2';
    const cand = traffic.vehicles.find((v) => v.active && v !== me && v.lane.id === other && v.s > me.s + 7 && v.s < me.s + 22);
    if (!cand) return false;
    traffic.changeLane(cand, me.lane.id, 1.2);
    S.cut = cand;
    return true;
  }

  return {
    get state() { return S.state; },
    get car() { return S.veh; },
    get riding() { return S.state === 'riding' || S.state === 'boarding'; },
    events: S.events,
    dispatch, board, schedule,
    // where the rear door is (for the prompt), world space
    doorFocus() {
      if (!S.veh || S.state !== 'waiting') return null;
      return { x: S.veh.x + 1.05, y: 1.1, z: S.veh.z + 0.3 };
    },
    distance() { return S.veh ? Math.abs(S.veh.pickup ? S.veh.pickup.stopS - S.veh.s : 0) : Infinity; },
    stopped() { return !!(S.veh && S.veh.pickup && S.veh.pickup.state === 'parked'); },
    go() { if (S.veh && S.veh.pickup) { S.veh.pickup.state = 'go'; S.veh.v0 = 8; } },
    cancel() {
      if (S.veh) { if (S.veh.pickup) S.veh.pickup.state = 'go'; S.veh = null; }
      S.state = 'idle'; hazards.visible = false;
    },
    // per frame
    update(dt, rnd = Math.random) {
      if (!S.veh) return;
      S.t += dt;
      const veh = S.veh;
      if (S.state === 'coming' && veh.pickup.state === 'parked') { S.state = 'waiting'; ev({ type: 'parked' }); }
      // hazards blink while it waits at the kerb
      hazards.visible = (S.state === 'waiting' || (S.state === 'coming' && veh.pickup.stopS - veh.s < 25)) && (S.t % 0.9) < 0.45;
      if (hazards.visible || S.state === 'waiting') { hazards.position.set(veh.x, 0, veh.z); hazards.rotation.y = veh.yaw; }
      if (S.state === 'boarding' && S.t > 1.4) { S.state = 'riding'; S.t = 0; this.go(); schedule(rnd); ev({ type: 'pulling-away' }); }
      if (S.state === 'riding') {
        for (const e of S.scheduled) if (!e.done && S.t >= e.at) { e.done = true; if (e.kind === 'jaywalk' ? startJaywalk() : startCutIn()) ev({ type: 'hazard-ahead', kind: e.kind }); }
        // the jaywalker: steps out, the driver brakes hard, then they shuffle across
        if (S.ped) {
          S.ped.t += dt;
          const dz = veh.z - S.ped.z;                                           // metres ahead of the car (northbound)
          if (!S.ped.braked && dz < 18 && S.ped.x > -13.2) { S.ped.braked = true; veh.forceBrake = 6.8; ev({ type: 'brake', kind: 'jaywalk', brake: 6.8 }); }
          if (veh.forceBrake && (veh.v < 0.2 || S.ped.x > -8)) veh.forceBrake = 0;
          const speed = S.ped.braked && S.ped.t < 3.2 ? 0.6 : 1.35;            // a startled half-stop, then on
          S.ped.x += speed * dt;
          walker.root.position.set(S.ped.x, 0, S.ped.z); walker.setGait(speed); walker.update(dt, S.ped.braked && S.ped.t < 3 ? [veh.x, veh.z] : null);
          holdPhone(walkerPhone, walker, Math.PI / 2);
          if (S.ped.x > -3.5) { S.ped = null; walker.root.visible = false; walkerPhone.visible = false; }
        }
        if (S.cut && !S.cut.laneChange && S.cut.lane === veh.lane && !S.cutBraked) {
          S.cutBraked = true; veh.forceBrake = 5.6; ev({ type: 'brake', kind: 'cutIn', brake: 5.6 });
          setTimeout(() => { if (S.veh) S.veh.forceBrake = 0; }, 900);
        }
        if (veh.z < RIDE_END_Z) { S.state = 'beyond'; ev({ type: 'left-bund' }); }
      }
      // the cabin rides with the car; the camera sits in the rear right seat
      if (S.cabin) {
        S.cabin.group.position.set(veh.x, 0, veh.z); S.cabin.group.rotation.y = veh.yaw;
        // the wheel turns with the car (yaw rate), a little
        const yr = dt > 0 ? (veh.yaw - S.prevYaw) / dt : 0; S.prevYaw = veh.yaw;
        S.steer += (Math.max(-0.9, Math.min(0.9, yr * 6)) - S.steer) * Math.min(1, dt * 4);
        S.cabin.update(dt, veh, S.steer);
        S.cabin.group.updateMatrixWorld(true);
        if (S.clipWorld) for (let i = 0; i < 6; i++) S.clipWorld[i].copy(S.clipLocal[i]).applyMatrix4(S.cabin.group.matrixWorld);
        if (S.driver) { S.driver.update(dt, S.look > 0 ? [camera.position.x, camera.position.z] : null); S.pose(S.cabin, S.cabin.group); }
        _v.copy(S.cabin.eye).applyMatrix4(S.cabin.group.matrixWorld);
        // braking pitches you forward a little
        const pitchKick = Math.max(-0.06, Math.min(0.06, (veh.acc || 0) * -0.008));
        camera.position.copy(_v);
        const rel = ((player.yaw - veh.yaw - Math.PI) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        player.yaw = veh.yaw + Math.PI + Math.max(-2.2, Math.min(2.2, rel));
        camera.rotation.set(player.pitch - pitchKick, player.yaw, 0, 'YXZ');
      }
    },
    // the driver glances back now and then when talking to you
    glance(sec = 1.5) { S.look = sec; setTimeout(() => { S.look = 0; }, sec * 1000); },
    // the ride is over: you're out, the car goes on its way
    end() {
      if (S.cabin) { scene.remove(S.cabin.group); S.cabin = null; S.driver = null; S.pose = null; }
      for (const [o, m] of S.glass || []) o.material = m; S.glass = [];
      if (S.veh) { if (S.veh.pickup) S.veh.pickup = null; S.veh.forceBrake = 0; }
      S.veh = null; S.state = 'idle'; hazards.visible = false; S.ped = null; S.cut = null; S.cutBraked = false;
      if (walker) { walker.root.visible = false; walkerPhone.visible = false; }
      player.lookOnly = false;
    },
  };
}
