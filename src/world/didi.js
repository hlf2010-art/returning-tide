// A DiDi car in the world, and you in it. engine/ride.js keeps the ride's state and the fare; this
// drives one of the real cars in the Zhongshan Road traffic to you and takes you away:
//   - a northbound car is picked well down the road, gets the driver's plate, and works its way up
//     in the ordinary traffic; near the corner it signals, slows and pulls in to the east kerb
//     just north of Hankou Road (the pickup point), hazards on
//   - you walk to its rear door (check the plate on the back!) and E gets you in
//   - inside: the rear right seat (where people sit in a Shanghai taxi), the driver in front of you
//     with their phone on the dash showing the route, the city going past the windows; mouse to
//     look around. The driver talks or doesn't; you answer with 1-4, or don't
//   - on the way: someone steps out looking at their phone, or a car cuts in. Hard braking, and the
//     driver says what they think of it
//   - at the end of the Bund the car goes on into the city (the drive continues as passing light),
//     then you're there
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { makeCanvas, tex, FONT } from './canvas.js';
import { CARS } from './carModels.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PICKUP = { x: -3.2, z: -18.5, kerbX: -5.35 };      // where you stand / where the car's centre stops
const SEAT_EYE = new THREE.Vector3(-0.36, 1.2, -0.66);           // car frame: +z forward, +x the driver's side (left)
const RIDE_END_Z = -330;                                          // the car leaves the modelled Bund here

function std(o) { return new THREE.MeshStandardMaterial(o); }

// the car's interior, built in its own frame; sized for a mid-size EV
function makeCabin(model) {
  const M = CARS[model] || CARS['nio-et5'];
  const g = new THREE.Group(); g.name = 'didi-cabin';
  const W = Math.min(1.56, (M.width || 1.96) - 0.36), roofY = Math.min(1.42, (M.height || 1.5) - 0.06);
  // lit faintly by the city through the glass and by the screens (emissive: a real light here would recompile every material)
  const glow = (r, g, b) => new THREE.Color(r, g, b);
  const dark = std({ color: 0x1d1e22, roughness: 0.8, emissive: glow(0.011, 0.012, 0.016) }), leather = std({ color: 0x2c2b2e, roughness: 0.45, emissive: glow(0.016, 0.015, 0.017) });
  const head = std({ color: 0x55565c, roughness: 0.9, emissive: glow(0.014, 0.014, 0.017) });
  const trim = std({ color: 0x101012, roughness: 0.4, metalness: 0.4, emissive: glow(0.004, 0.004, 0.006) }), wood = std({ color: 0x4a3828, roughness: 0.4, emissive: glow(0.016, 0.011, 0.008) });
  const box = (w, h, d, m, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; };
  const soft = (w, h, d, m, x, y, z, rx = 0, r = 0.04) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, d / 2 - 0.001)), m); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; };
  box(W, 0.04, 2.6, dark, 0, 0.32, 0);                                          // floor
  box(W + 0.1, 0.04, 2.0, head, 0, roofY, -0.15);                               // headliner
  for (const s of [-1, 1]) {
    box(0.06, 0.6, 2.5, dark, s * (W / 2 + 0.03), 0.66, 0);                     // door panels up to the beltline
    box(0.07, 0.03, 2.45, wood, s * (W / 2 - 0.0), 0.97, 0);                    // the beltline trim
    box(0.05, 0.48, 0.07, trim, s * (W / 2 + 0.03), roofY - 0.24, -0.05);       // B pillar
    box(0.07, 0.5, 0.14, trim, s * (W / 2 + 0.02), roofY - 0.25, -1.2, -0.45);   // C pillar, raked
    const a = box(0.06, 0.62, 0.08, trim, s * (W / 2 - 0.02), roofY - 0.2, 1.02, 0.75); a.rotation.z = s * -0.08;   // A pillar
  }
  box(W + 0.1, 0.12, 0.08, trim, 0, roofY - 0.05, 1.18);                        // windscreen header
  box(W + 0.1, 0.07, 0.1, trim, 0, roofY - 0.05, -1.32);                        // rear window header
  // dashboard, wheel, the centre screen and the driver's phone in its clamp
  box(W, 0.2, 0.42, dark, 0, 0.9, 1.08);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 24), trim); wheel.position.set(0.37, 0.98, 0.82); wheel.rotation.x = -0.5; g.add(wheel);
  const [sc, sx] = makeCanvas(256, 160);
  sx.fillStyle = '#0d1520'; sx.fillRect(0, 0, 256, 160);
  sx.strokeStyle = '#2b3a4f'; sx.lineWidth = 6; for (let i = 0; i < 7; i++) { sx.beginPath(); sx.moveTo(-20 + i * 50, 170); sx.lineTo(40 + i * 45, -10); sx.stroke(); }
  sx.strokeStyle = '#22c46b'; sx.lineWidth = 7; sx.beginPath(); sx.moveTo(128, 150); sx.lineTo(128, 90); sx.lineTo(170, 40); sx.lineTo(176, 0); sx.stroke();
  sx.fillStyle = '#fff'; sx.beginPath(); sx.moveTo(128, 120); sx.lineTo(118, 140); sx.lineTo(138, 140); sx.fill();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshBasicMaterial({ map: tex(sc, { repeat: false }), color: new THREE.Color(0.9, 0.9, 0.9) }));
  screen.position.set(0, 1.08, 1.0); screen.rotation.set(-0.35, Math.PI, 0); g.add(screen);
  const phone = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.15), screen.material); phone.position.set(0.12, 1.16, 0.98); phone.rotation.set(-0.2, Math.PI, 0); g.add(phone);
  // front seats (their backs and headrests are most of what you see from behind), the rear bench
  for (const s of [-1, 1]) {
    soft(0.48, 0.5, 0.12, leather, s * 0.37, 0.8, 0.34, -0.14, 0.05);          // seat back, top ~1.05
    soft(0.22, 0.15, 0.09, leather, s * 0.37, 1.17, 0.3, -0.08, 0.04);         // headrest
    for (const k of [-1, 1]) box(0.012, 0.1, 0.012, trim, s * 0.37 + k * 0.06, 1.07, 0.31);   // its two posts
    soft(0.48, 0.12, 0.5, leather, s * 0.37, 0.52, 0.6, 0, 0.05);
  }
  soft(W - 0.1, 0.14, 0.52, leather, 0, 0.5, -0.66, 0, 0.06);
  soft(W - 0.1, 0.62, 0.14, leather, 0, 0.84, -0.95, 0.18, 0.06);
  // a strip of ambient light along the doors (EVs all have one)
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.26, 0.62) });
  for (const s of [-1, 1]) box(0.01, 0.008, 2.0, strip, s * (W / 2 - 0.04), 0.95, 0.05);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, W, roofY };
}

// the plate on the back of the picked car, swapped for the driver's
function plateCanvas(text) {
  const [c, ctx] = makeCanvas(256, 80);
  const g = ctx.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#e8f5e9'); g.addColorStop(1, '#5fbf6a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 80); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 74);
  ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 46px ${FONT.sans}`; ctx.fillText(text, 128, 44);
  return tex(c, { repeat: false });
}

export function createDidi({ scene, people, traffic, vehicles, camera, player }) {
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
    if (people) {
      const role = driverSpec.sex === 'f' ? 'p2' : driverSpec.id === 'shi-gu' ? 'lin' : 'p1';
      S.driver = createPerson(people, role); S.cabin.group.add(S.driver.root);
      // sat: the head at about 1.25 m, in front of the seat back; legs go under the dash out of sight
      S.driver.root.position.set(0.37, driverSpec.sex === 'f' ? -0.36 : -0.44, 0.56); S.driver.root.rotation.y = 0;
      S.driver.root.traverse((o) => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0.018, 0.018, 0.02); } });
    }
    S.veh.hidden = true; S.state = 'boarding'; S.t = 0;
    player.lookOnly = true; player.enabled = false;
    player.yaw = S.veh.yaw + Math.PI; player.pitch = -0.08;                      // looking forward, past the driver
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
        S.cabin.group.updateMatrixWorld(true);
        if (S.driver) S.driver.update(dt, S.look > 0 ? [camera.position.x, camera.position.z] : null);
        _v.copy(SEAT_EYE).applyMatrix4(S.cabin.group.matrixWorld);
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
      if (S.cabin) { scene.remove(S.cabin.group); S.cabin = null; S.driver = null; }
      if (S.veh) { S.veh.hidden = false; if (S.veh.pickup) S.veh.pickup = null; S.veh.forceBrake = 0; }
      S.veh = null; S.state = 'idle'; hazards.visible = false; S.ped = null; S.cut = null; S.cutBraked = false;
      if (walker) { walker.root.visible = false; walkerPhone.visible = false; }
      player.lookOnly = false;
    },
  };
}
