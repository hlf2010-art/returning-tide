// Shoppers who come and go by ride-hail. A car (a real one from the traffic, a BYD Han where one is
// coming) pulls in at a kerb by the Peace Hotel with its hazards on; someone gets out of the rear door
// on the kerb side and walks round the corner into Nanjing Road, along it and in through a shop door
// (the crowd's own shop fronts and paths, engine/crowd.js); a minute or two later they come out with
// shopping bags, walk back to the Bund and down its pavement to a pick-up point further south, order
// a car on their phone (engine/rideHail.js: accepted, the wait, glances up the street, a wave), get in
// with their bags and are driven away. Then someone else. Up to two of these at a time.
// The cars pull in the way the player's DiDi and the hailers' do (engine/traffic.js pickup).
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { twoBone } from './driverPose.js';
import { createRide, stepRide, rideAction } from '../engine/rideHail.js';
import { L, NJ } from './layout.js';
import { buildNet, route } from '../engine/crowd.js';

const CURB = L.curbH;
const kerb = (z, face = 2.5) => ({ dir: 1, z, kerbX: L.westCurbX + 1.4, stand: { x: L.westCurbX - 0.65, z: z - 0.6 }, face });
// the west kerb (southbound cars): drop-offs in front of the Peace Hotel and No.23, pick-ups past the
// Nanjing Road bus stop (z -180) and the AIA hailer (z -168)
export const SHOPPER_KERBS = { drop: [kerb(-226), kerb(-246)], pick: [kerb(-150), kerb(-104)] };
const ROLES = ['p1', 'p2', 'p3', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
// paper carrier bags: white, black, kraft, red, cream, navy (the colours of the big shops' bags)
const BAG_COLORS = [0xf3f1ec, 0x1a1a1c, 0xb98a55, 0xb3262e, 0xe7d9c4, 0x2b4a7a];
const MAX = 2;

function bagMesh() {
  const g = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), cord = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.11), paper); b.position.y = -0.27; b.castShadow = true; g.add(b);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 4, 12, Math.PI), cord); h.position.y = -0.1; g.add(h);
  g.userData.paper = paper;
  return g;
}

export function createShoppers({ scene, people, traffic, vehicles, audio, rnd = Math.random, max = MAX }) {
  if (!people || !traffic) return { update() {}, others: () => [], state: { stories: [] } };
  const net = buildNet();
  // shop fronts near the Bund end of Nanjing Road, west of the two hotels (the Peace Hotel and the Swatch
  // run to x -84: world/nanjingRoad.js); people taking a car to shop don't walk 400 m
  const shops = (net.shops || []).map((id) => ({ id, n: net.by[id] })).filter(({ n }) => n.x < -86 && n.x > -250).map(({ id, n }) => {
    const side = n.z < NJ.zc ? -1 : 1, front = side < 0 ? NJ.z0 : NJ.z1;
    return { id, x: n.x, z: n.z, step: { x: n.x, z: front - side * 0.45 }, door: { x: n.x, z: front + side * 1.2 } };
  });
  const wNodes = net.nodes.filter((n) => /^W\d+$/.test(n.id));
  const nearestW = (z) => wNodes.reduce((b, n) => (Math.abs(n.z - z) < Math.abs(b.z - z) ? n : b));
  // a path along the crowd's network, each node a little off its line (within the node's width)
  const along = (from, to) => (route(net, from, to) || []).map((id) => { const n = net.by[id], j = (rnd() - 0.5) * Math.min(1.6, n.w); return [n.x + (n.id.startsWith('W') ? j * 0.5 : 0), n.z + (n.id.startsWith('W') ? 0 : j)]; });

  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.3, metalness: 0.5 });
  const hazardMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.2, 0.1) });
  const _h = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
  const released = [];          // drop-off cars on their way out: let go of once clear of the kerb
  const stories = [];
  for (let i = 0; i < max; i++) {
    const hz = new THREE.Group(); hz.visible = false; scene.add(hz);
    for (const [x, z] of [[-0.78, 2.3], [0.78, 2.3], [-0.8, -2.35], [0.8, -2.35]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.05), hazardMat); m.position.set(x, 0.78, z); hz.add(m); }
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); phone.visible = false; scene.add(phone);
    const bags = [bagMesh(), bagMesh(), bagMesh()]; for (const b of bags) { b.visible = false; scene.add(b); }
    stories.push({ i, phase: 'off', wait: 6 + i * 25 + rnd() * 15, person: null, x: 0, z: 0, yaw: 0, vx: 0, vz: 0, veh: null, route: [], shop: null, t: 0, ride: null, drop: null, pick: null, nBags: 2, speed: 1.2, hz, phone, bags, served: 0, log: [] });
  }
  const takenKerb = (k, me) => stories.some((s) => s !== me && (s.drop === k || s.pick === k));

  function sendCar(k, npc) {
    const stopS = k.dir > 0 ? k.z + 2.4 : -k.z + 2.4;
    const list = traffic.vehicles.map((v, i) => ({ v, i })).filter(({ v }) => v.active && !v.bus && v.lane.dir === k.dir && !v.pickup && !v.hidden && stopS - v.s > 70 && stopS - v.s < 330);
    // a ride-hail car by preference (the BYDs), then the kerb lane, then the nearest
    const fleet = (i) => (vehicles && vehicles.list[i] && vehicles.list[i].fleetCar ? 1 : 0);
    list.sort((a, b) => fleet(b.i) - fleet(a.i) || (a.v.lane.id.endsWith('2') ? 1 : 0) - (b.v.lane.id.endsWith('2') ? 1 : 0) || b.v.s - a.v.s);
    const pick = list[0]; if (!pick) return null;
    const veh = pick.v;
    veh.pickup = { stopS, dx: k.kerbX - veh.lane.x, state: 'approach', npc };
    veh.v0 = Math.min(veh.v0, 10);
    return veh;
  }
  function body(s, role) {
    if (s.person && s.person.role === role) return s.person;
    if (s.person) { scene.remove(s.person.root); s.person.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); }
    const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); p.root.visible = false; scene.add(p.root);
    s._arm = null;
    return (s.person = p);
  }
  // along the route, slowing for you if you're right in front
  function walk(s, dt, speed, pp) {
    let g = s.route[0];
    while (g && Math.hypot(g[0] - s.x, g[1] - s.z) < 0.15) { s.route.shift(); g = s.route[0]; }
    if (!g) { s.vx = s.vz = 0; return false; }
    const dx = g[0] - s.x, dz = g[1] - s.z, d = Math.hypot(dx, dz);
    if (pp) { const px = pp.x - s.x, pz = pp.z - s.z, pd = Math.hypot(px, pz); if (pd < 1.1 && pd > 1e-3 && (px * dx + pz * dz) / (d * pd) > 0.5) speed *= 0.25; }
    const st = Math.min(d, speed * dt); s.vx = (dx / d) * speed; s.vz = (dz / d) * speed;
    s.x += (dx / d) * st; s.z += (dz / d) * st; s.yaw = Math.atan2(dx, dz); return true;
  }
  const doorCue = (s, pp) => { const d = Math.hypot(pp.x - s.x, pp.z - s.z); if (audio && audio.cue && d < 30) audio.cue('door', 0, 0.5 / (1 + d / 6)); };
  const wave = (s, k) => {
    const b = s._arm || (s._arm = ['Bip01_R_UpperArm', 'Bip01_R_Forearm', 'Bip01_R_Hand'].map((n) => s.person.root.getObjectByName(n)));
    if (!b[2]) return; s.person.bones.head.getWorldPosition(_e);
    const sn = Math.sin(s.yaw), c = Math.cos(s.yaw);
    _t.set(_e.x + sn * 0.25 - c * 0.3 + Math.sin(k * 9) * 0.06 * c, _e.y + 0.28, _e.z + c * 0.25 + sn * 0.3 - Math.sin(k * 9) * 0.06 * sn); _p.set(-c, -0.4, sn).normalize();
    twoBone(b[0], b[1], b[2], _t, _p);
  };

  function step(s, dt, pp) {
    if (s.log.at(-1) !== s.phase) { s.log.push(s.phase); if (s.log.length > 40) s.log.splice(0, 10); }
    let moving = false, look = null, act = null;
    if (s.phase === 'off') {
      if ((s.wait -= dt) > 0) return null;
      const free = SHOPPER_KERBS.drop.filter((k) => !takenKerb(k, s));
      if (!free.length || !shops.length) { s.wait = 5; return null; }
      s.drop = free[Math.floor(rnd() * free.length)];
      s.veh = sendCar(s.drop, `shopper${s.i}-drop`); if (!s.veh) { s.drop = null; s.wait = 3; return null; }
      body(s, ROLES[Math.floor(rnd() * ROLES.length)]);
      s.shop = shops[Math.floor(rnd() * shops.length)];
      s.nBags = 1 + Math.floor(rnd() * 3);
      for (const b of s.bags) b.userData.paper.color.setHex(BAG_COLORS[Math.floor(rnd() * BAG_COLORS.length)]);
      s.speed = 1.15 + rnd() * 0.25;
      s.phase = 'riding';
    } else if (s.phase === 'riding') {
      // in the car until it has stopped at the kerb
      const v = s.veh;
      if (!v || !v.active || !v.pickup) { if (v && v.pickup) v.pickup = null; s.phase = 'off'; s.wait = 5; s.veh = null; s.drop = null; return null; }
      if (v.pickup.state === 'parked') { s.phase = 'alight'; s.t = 0; s.x = v.x - 1.0; s.z = v.z - 0.65; s.yaw = -Math.PI / 2; s.person.root.visible = true; s.person.play('idle', 0); doorCue(s, pp); s.route = [[s.drop.stand.x - 0.4, s.drop.stand.z + 0.8]]; }
    } else if (s.phase === 'alight') {
      // out of the rear door on to the kerb, the door shut behind; the car pulls away
      s.t += dt;
      moving = walk(s, dt, 0.9, pp);
      if (s.t > 1.5 && s.veh && s.veh.pickup && s.veh.pickup.state === 'parked') { doorCue(s, pp); s.veh.pickup.state = 'go'; s.veh.v0 = 9; released.push(s.veh); }
      if (s.t > 2.2) {
        s.veh = null; s.drop = null;
        const sh = s.shop, path = along(nearestW(s.z + 4).id, sh.id);
        s.route = [...path, [sh.step.x, sh.step.z], [sh.door.x, sh.door.z]];
        s.phase = 'toShop';
      }
    } else if (s.phase === 'toShop') {
      moving = walk(s, dt, s.speed, pp);
      // through the doorway: out of sight
      if (!moving) { s.phase = 'inside'; s.t = 50 + rnd() * 80; s.person.root.visible = false; }
    } else if (s.phase === 'inside') {
      if ((s.t -= dt) <= 0) {
        const free = SHOPPER_KERBS.pick.filter((k) => !takenKerb(k, s));
        if (!free.length) { s.t = 10; return null; }
        s.pick = free[Math.floor(rnd() * free.length)];
        const sh = s.shop;
        s.phase = 'outward'; s.x = sh.step.x; s.z = sh.step.z; s.person.root.visible = true;
        s.route = [...along(sh.id, nearestW(s.pick.stand.z - 8).id), [s.pick.stand.x, s.pick.stand.z]];
      }
    } else if (s.phase === 'outward') {
      moving = walk(s, dt, s.speed * 0.95, pp);
      if (!moving) { s.phase = 'wait'; s.yaw = s.pick.face; s.ride = createRide(rnd); s.veh = null; s.t = 0; }
    } else if (s.phase === 'wait') {
      const r = s.ride, k = s.pick;
      if (s.veh && !s.veh.active) { s.veh.pickup = null; s.veh = null; }
      const car = s.veh && s.veh.pickup ? { dist: Math.max(0, s.veh.pickup.stopS - s.veh.s), stopped: s.veh.pickup.state === 'parked' } : null;
      stepRide(r, dt, car);
      for (const e of r.events.splice(0)) if (e === 'accepted' && !s.veh) s.veh = sendCar(k, `shopper${s.i}-pick`);
      if (r.phase !== 'request' && !s.veh && (s.t += dt) > 3) { s.t = 0; s.veh = sendCar(k, `shopper${s.i}-pick`); }
      act = rideAction(r);
      if (act === 'lookStreet') look = [k.stand.x, k.stand.z - 40];
      if (r.phase === 'spotting' && s.veh) look = [s.veh.x, s.veh.z];
      if (r.phase === 'boarding' && s.veh) { s.phase = 'board'; s.t = 0; s.route = []; }
    } else if (s.phase === 'board') {
      const v = s.veh; s.t += dt;
      if (!v || !v.pickup) { s.phase = 'off'; s.wait = 20; s.person.root.visible = false; s.pick = null; return null; }
      if (s.t < 2.4) { s.route = [[v.x - 1.0, v.z - 0.65]]; moving = walk(s, dt, 1.1, null); if (!moving) s.yaw = Math.atan2(v.x - s.x, v.z - s.z); }
      if (s.t > 2.6 && s.person.root.visible) { s.person.root.visible = false; doorCue(s, pp); }
      if (s.t > 3.6) { v.pickup.state = 'go'; v.v0 = 9; s.phase = 'leaving'; s.served++; }
    } else if (s.phase === 'leaving') {
      const v = s.veh;
      if (!v || !v.pickup || v.s > v.pickup.stopS + 32 || !v.active) {
        if (v && v.pickup && v.pickup.npc === `shopper${s.i}-pick`) v.pickup = null;
        s.veh = null; s.pick = null; s.phase = 'off'; s.wait = 25 + rnd() * 50;
      }
    }
    return { moving, look, act };
  }

  function draw(s, dt, pp, st) {
    // the car's hazards while it pulls in and waits
    const v = s.veh, pk = v && v.pickup;
    s.hz.visible = !!(pk && (pk.state === 'parked' || (pk.state === 'approach' && pk.stopS - v.s < 30))) && (performance.now() % 1000 < 520);
    if (s.hz.visible) { s.hz.position.set(v.x, 0, v.z); s.hz.rotation.y = v.yaw; }
    s.phone.visible = false; for (const b of s.bags) b.visible = false;
    const P = s.person, root = P && P.root;
    if (!st || !root || !root.visible || Math.hypot(pp.x - s.x, pp.z - s.z) > 110) return;
    const { moving, look, act } = st;
    root.position.set(s.x, s.x > L.westCurbX + 0.05 ? 0 : CURB, s.z);
    let a = s.yaw - root.rotation.y; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; root.rotation.y += a * Math.min(1, dt * 6);
    P.play(moving ? 'walk' : 'idle', 0.3); P.setGait(moving ? s.speed : 0);
    const phoneUp = s.phase === 'wait' && (act === 'phone' || act === 'call');
    P.setPhoneHold(phoneUp ? 1 : 0);
    P.update(dt, look);
    const waving = s.phase === 'wait' && s.ride && s.ride.waved && s.ride.phase === 'spotting';
    if (waving) wave(s, s.ride.t);
    if (phoneUp) { s.phone.visible = true; holdPhone(s.phone, P, root.rotation.y); }
    if (s.phase === 'outward' || s.phase === 'wait' || s.phase === 'board') {
      // the bags: all in the left hand while the right holds the phone or waves, otherwise shared
      const busyRight = phoneUp || waving;
      const sn = Math.sin(root.rotation.y), c = Math.cos(root.rotation.y);
      for (let i = 0; i < s.nBags; i++) {
        const right = !busyRight && i % 2 === 0, bone = right ? P.bones.R : P.bones.L; if (!bone) continue;
        bone.getWorldPosition(_h);
        const k = right ? i >> 1 : busyRight ? i : i >> 1, off = k * 0.08 * (right ? -1 : 1);   // side by side in one hand
        const b = s.bags[i];
        b.position.set(_h.x + c * off, _h.y, _h.z - sn * off);
        b.rotation.set(moving ? Math.sin(performance.now() / 260 + i) * 0.08 : 0, root.rotation.y + (right ? -0.15 : 0.2) + i * 0.1, 0);
        b.visible = true;
      }
    }
  }

  return {
    stories, shops,             // (for tools/shopwalk.mjs)
    get state() { return { stories: stories.map((s) => ({ phase: s.phase, served: s.served, log: s.log.slice(-14), x: s.x, z: s.z, shop: s.shop && s.shop.id, bags: s.nBags, veh: s.veh && s.veh.id, carState: s.veh && s.veh.pickup && s.veh.pickup.state })) }; },
    // for the crowd to walk round (main.js `others`)
    others() { return stories.filter((s) => s.person && s.person.root.visible).map((s) => ({ x: s.x, z: s.z, vx: s.vx, vz: s.vz })); },
    update(dt, pp) {
      for (let i = released.length - 1; i >= 0; i--) {
        const v = released[i];
        if (!v.active || !v.pickup || v.s > v.pickup.stopS + 32) { if (v.pickup && /^shopper\d-drop$/.test(v.pickup.npc)) v.pickup = null; released.splice(i, 1); }
      }
      if (!dt) return;
      for (const s of stories) draw(s, dt, pp, step(s, dt, pp));
    },
  };
}
