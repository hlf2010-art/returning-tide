// The Nanjing Road sightseeing trains (南京路步行街观光车, the "当当车"): a small tractor dressed as an old tram
// pulling open trailers, slowly down the middle of the pedestrian street and back, ringing its bell. Two
// of them on a loop: westbound on the north half of the street, eastbound on the south (traffic keeps
// right), turning round at each end; they stop at the stops for people to get on and off. The trailers
// follow the tractor's path (a road train), so they swing round the turns as real ones do.
//   - people in the way: the crowd steps aside (the cars are in main.js's `others`, with their speed);
//     the train slows and rings for them, and stops for you if you stand in front of it
//   - you can't walk through it (a box per car, engine/movement.js)
//   - passengers sat on the benches and a driver at the front (createPerson + a sitting pose by IK)
// Look and route: docs/nanjing-road-tram.md (what's known, what's assumed).
import * as THREE from 'three';
import { Batch } from './geo.js';
import { NJ } from './layout.js';
import { createPerson } from './people.js';
import { twoBone } from './driverPose.js';
import { asLight } from './dayNight.js';
import { makeCanvas, tex, FONT } from './canvas.js';

// the loop: two lanes either side of the centre line, turned at each end (radius = half the spacing)
export const TRAM_ROUTE = { xEast: -566, xWest: -1488, half: 3.5, stops: [-600, -1100, -1450], cruise: 1.7, dwell: 18 };
// the livery (docs/nanjing-road-tram.md)
export const TRAM_LOOK = { body: 0x8c1d1d, trim: 0xd9b45f, roof: 0xf1e9d8, seat: 0x7a4a2a, frame: 0x2a2420, cars: 3 };
const LOCO = { len: 3.4, w: 1.55, h: 2.55 }, CAR = { len: 4.0, w: 1.62, h: 2.45 }, GAP = 0.55;

// ---- the path: s (m) round the loop -> position and heading ----
function makePath(R) {
  const L = R.xEast - R.xWest, r = R.half, zN = NJ.zc - r, zS = NJ.zc + r, arc = Math.PI * r, total = 2 * L + 2 * arc;
  // 0..L westbound along zN; then the west turn; then eastbound along zS; then the east turn
  function at(s, out) {
    s = ((s % total) + total) % total;
    if (s < L) { out.x = R.xEast - s; out.z = zN; out.yaw = -Math.PI / 2; }
    else if (s < L + arc) { const a = (s - L) / r; out.x = R.xWest - Math.sin(a) * r; out.z = NJ.zc - Math.cos(a) * r; out.yaw = -Math.PI / 2 + a; }
    else if (s < 2 * L + arc) { out.x = R.xWest + (s - L - arc); out.z = zS; out.yaw = Math.PI / 2; }
    else { const a = (s - 2 * L - arc) / r; out.x = R.xEast + Math.sin(a) * r; out.z = NJ.zc + Math.cos(a) * r; out.yaw = Math.PI / 2 + a; }
    return out;
  }
  // the path s at a stop (both directions): the stop's x on each straight
  const stopS = R.stops.flatMap((x) => [R.xEast - x, L + arc + (x - R.xWest)]).sort((a, b) => a - b);
  return { at, total, L, arc, stopS };
}

// ---- the model: built once per car kind, then instanced ----
function signTexture() {
  const [c, x] = makeCanvas(512, 96);
  x.fillStyle = '#1b1410'; x.fillRect(0, 0, 512, 96);
  x.fillStyle = '#f2d27a'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 46px ${FONT.serif}`; x.fillText('南京路步行街  观光车', 256, 40);
  x.font = `500 20px ${FONT.sans}`; x.fillStyle = '#e8dcc0'; x.fillText('NANJING ROAD SIGHTSEEING TRAM', 256, 78);
  return tex(c, { repeat: false, aniso: 4 });
}
function locoParts() {
  const b = { body: new Batch(), trim: new Batch(), roof: new Batch(), frame: new Batch(), glass: new Batch(), lamp: new Batch(), tyre: new Batch(), sign: new Batch() };
  const { len, w, h } = LOCO, hl = len / 2;
  b.frame.box(0, 0.22, 0, w - 0.1, 0.16, len - 0.2);                                   // chassis
  b.body.box(0, 0.38, 0, w, 0.75, len);                                                // lower body
  b.trim.box(0, 1.1, 0, w + 0.02, 0.06, len + 0.02);                                   // the waist rail
  // the cab: corner posts, glazing, a front with a big windscreen
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.body.box(sx * (w / 2 - 0.05), 1.13, sz * (hl - 0.05), 0.1, h - 1.13 - 0.18, 0.1);
  for (const sx of [-1, 1]) { b.glass.box(sx * (w / 2 - 0.02), 1.2, 0, 0.02, 0.95, len - 0.3); b.body.box(sx * (w / 2 - 0.03), 2.15, 0, 0.06, 0.22, len); }
  b.glass.box(0, 1.2, hl - 0.02, w - 0.2, 1.0, 0.02);                                  // windscreen
  b.body.box(0, 2.15, hl - 0.03, w, 0.22, 0.06);
  b.sign.add(new THREE.PlaneGeometry(w - 0.25, 0.2), { x: 0, y: 2.26, z: hl + 0.035 });          // the destination board
  // the roof: an arched clerestory, a lantern on top, the bell at the front
  b.roof.box(0, h - 0.18, 0, w + 0.14, 0.1, len + 0.25);
  b.roof.box(0, h - 0.08, 0, w * 0.55, 0.16, len * 0.8);
  b.trim.cyl(0, h + 0.08, hl - 0.35, 0.1, 0.14, 0.18, 10);                            // the bell
  // headlamps, a cow-catcher fender, the wheels
  for (const sx of [-1, 1]) b.lamp.cyl(sx * 0.5, 0.75, hl + 0.02, 0.09, 0.09, 0.05, 12);
  b.trim.box(0, 0.12, hl + 0.08, w - 0.1, 0.12, 0.12);
  for (const sx of [-1, 1]) for (const z of [-hl + 0.6, hl - 0.6]) b.tyre.add(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14).rotateZ(Math.PI / 2), { x: sx * (w / 2 - 0.12), y: 0.28, z });
  return b;
}
function trailerParts() {
  const b = { body: new Batch(), trim: new Batch(), roof: new Batch(), frame: new Batch(), seat: new Batch(), tyre: new Batch(), lamp: new Batch() };
  const { len, w, h } = CAR, hl = len / 2;
  b.frame.box(0, 0.22, 0, w - 0.12, 0.16, len - 0.1);
  b.body.box(0, 0.38, 0, w, 0.12, len);                                                // the floor
  for (const sx of [-1, 1]) b.body.box(sx * (w / 2 - 0.03), 0.5, 0, 0.06, 0.48, len);  // low sides (open above)
  for (const sz of [-1, 1]) b.body.box(0, 0.5, sz * (hl - 0.03), w, 0.62, 0.06);       // ends
  for (const sx of [-1, 1]) b.trim.box(sx * (w / 2 - 0.02), 0.98, 0, 0.05, 0.05, len); // the rail along the top of the sides
  // posts holding up the roof, the roof with its fringe
  for (const sx of [-1, 1]) for (const z of [-hl + 0.05, -hl / 3, hl / 3, hl - 0.05]) b.frame.box(sx * (w / 2 - 0.04), 0.98, z, 0.06, h - 0.98 - 0.12, 0.06);
  b.roof.box(0, h - 0.12, 0, w + 0.2, 0.08, len + 0.15);
  b.trim.box(0, h - 0.26, 0, w + 0.21, 0.14, len + 0.16);                              // the valance round the roof
  // benches facing forward, a back to each
  for (const z of [-1.35, -0.45, 0.45, 1.35]) { b.seat.box(0, 0.8, z, w - 0.2, 0.06, 0.42); b.seat.box(0, 0.86, z - 0.21, w - 0.2, 0.42, 0.05); b.frame.box(0, 0.44, z, 0.08, 0.36, 0.3); }
  b.frame.box(0, 0.3, hl + GAP / 2, 0.08, 0.06, GAP + 0.2);                            // the drawbar
  for (const sx of [-1, 1]) for (const z of [-hl + 0.65, hl - 0.65]) b.tyre.add(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12).rotateZ(Math.PI / 2), { x: sx * (w / 2 - 0.1), y: 0.24, z });
  for (const sx of [-1, 1]) b.lamp.box(sx * (w / 2 - 0.12), 0.55, -hl - 0.01, 0.12, 0.08, 0.02);   // tail lamps
  return b;
}

export function createTrams({ scene, people, audio, addCollider, rnd = Math.random, n = 2, route = TRAM_ROUTE, look = TRAM_LOOK }) {
  const P = makePath(route), group = new THREE.Group(); group.name = 'trams'; scene.add(group);
  const mats = {
    body: new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.42, metalness: 0.15 }),
    trim: new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.3, metalness: 0.85 }),
    roof: new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.6 }),
    frame: new THREE.MeshStandardMaterial({ color: look.frame, roughness: 0.5, metalness: 0.5 }),
    seat: new THREE.MeshStandardMaterial({ color: look.seat, roughness: 0.55 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }),
    lamp: asLight(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6) }), 'lamps', 0.3),
    sign: asLight(new THREE.MeshBasicMaterial({ map: signTexture() }), 'signs', 0.8),
  };
  const nCars = look.cars;
  const inst = (parts, count) => Object.entries(parts).filter(([, b]) => b.list.length).map(([k, b]) => {
    const g = b.mesh(mats[k]).geometry, im = new THREE.InstancedMesh(g, mats[k], count);
    im.castShadow = k !== 'glass' && k !== 'lamp'; im.receiveShadow = true; im.frustumCulled = false; im.name = `tram-${k}`; group.add(im); return im;
  });
  const locoIM = inst(locoParts(), n), carIM = inst(trailerParts(), n * nCars);
  const sizes = [LOCO, ...Array(nCars).fill(CAR)];
  // car centres behind the tractor's front, along the path
  const offsets = []; { let d = LOCO.len / 2; offsets.push(d); for (let i = 0; i < nCars; i++) { d += (i ? CAR.len : LOCO.len) / 2 + GAP + CAR.len / 2; offsets.push(d); } }
  const trains = Array.from({ length: n }, (_, i) => ({
    i, s: (P.total / n) * i + 40, v: 0, want: route.cruise, dwell: 0, nextStop: 0, bellT: 0, boxes: sizes.map(() => (addCollider ? addCollider('tram') : null)),
    pos: sizes.map(() => ({ x: 0, z: 0, yaw: 0 })), riders: [], driver: null, lit: 1,
  }));
  for (const t of trains) t.nextStop = P.stopS.findIndex((ss) => ss > t.s + 1) % P.stopS.length;

  // ---- people aboard: a driver, and a few on the benches of each trailer (near you only) ----
  const SEATS = []; for (const z of [-1.35, -0.45, 0.45, 1.35]) for (const x of [-0.48, 0, 0.48]) SEATS.push({ x, z });
  const ROLES = ['p1', 'p2', 'p3', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'k1', 'k2'];
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), pole = new THREE.Vector3(), right = new THREE.Vector3();
  function board(t) {
    if (!people || t.driver) return;
    const mk = (role) => { const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root); p.play('idle', 0); return p; };
    t.driver = { p: mk('p4'), car: 0, seat: { x: 0, z: 0.55 }, drive: true };
    for (let c = 1; c <= nCars; c++) {
      const free = SEATS.slice(); const k = 2 + Math.floor(rnd() * 4);
      for (let j = 0; j < k; j++) { const seat = free.splice(Math.floor(rnd() * free.length), 1)[0]; t.riders.push({ p: mk(ROLES[Math.floor(rnd() * ROLES.length)]), car: c, seat, look: rnd() * 2 - 1 }); }
    }
  }
  function alight(t) {
    for (const r of [t.driver, ...t.riders]) if (r) { group.remove(r.p.root); r.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); }
    t.driver = null; t.riders = [];
  }
  // sit someone on a bench (world space, after their idle clip): pelvis on the seat, thighs forward,
  // feet on the floor, hands on the knees (or forward to the tiller, for the driver)
  function sit(r, carPos, dt, eye) {
    const p = r.p, root = p.root, c = Math.cos(carPos.yaw), s = Math.sin(carPos.yaw);
    fwd.set(s, 0, c); right.set(-c, 0, s);
    const seatY = r.drive ? 0.95 : 0.86, hip = v1.set(carPos.x + c * r.seat.x + s * r.seat.z, seatY, carPos.z - s * r.seat.x + c * r.seat.z);
    root.position.copy(hip); root.rotation.y = carPos.yaw;
    p.update(dt, r.drive ? null : (eye && Math.hypot(eye.x - hip.x, eye.z - hip.z) < 12 ? [eye.x, eye.z] : null));
    const B = r.B || (r.B = Object.fromEntries(['Pelvis', 'L_Thigh', 'L_Calf', 'L_Foot', 'R_Thigh', 'R_Calf', 'R_Foot', 'L_UpperArm', 'L_Forearm', 'L_Hand', 'R_UpperArm', 'R_Forearm', 'R_Hand'].map((nm) => [nm, root.getObjectByName(`Bip01_${nm}`)])));
    if (!B.Pelvis || !B.L_Thigh) return;
    root.updateMatrixWorld(true);
    const pw = B.Pelvis.getWorldPosition(v2);
    root.position.add(v2.set(hip.x - pw.x, hip.y + 0.06 - pw.y, hip.z - pw.z)); root.updateMatrixWorld(true);
    for (const [sd, k] of [['L', 1], ['R', -1]]) {
      const foot = v2.copy(hip).addScaledVector(fwd, 0.5).addScaledVector(right, -k * 0.12); foot.y = 0.5;
      pole.copy(fwd).add(up).normalize();
      twoBone(B[`${sd}_Thigh`], B[`${sd}_Calf`], B[`${sd}_Foot`], foot, pole);
      const hand = v2.copy(hip).addScaledVector(fwd, r.drive ? 0.55 : 0.36).addScaledVector(right, -k * (r.drive ? 0.18 : 0.16)); hand.y = hip.y + (r.drive ? 0.38 : 0.14);
      pole.set(0, -1, 0).addScaledVector(right, -k * 0.5).normalize();
      twoBone(B[`${sd}_UpperArm`], B[`${sd}_Forearm`], B[`${sd}_Hand`], hand, pole);
    }
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  function bell(t, eye, level = 1) {
    if (!audio || !audio.cue || t.bellT > 0) return;
    const d = eye ? Math.hypot(eye.x - t.pos[0].x, eye.z - t.pos[0].z) : 99;
    if (d < 60) audio.cue('tramBell', 0, level * 0.9 / (1 + d / 8));
    t.bellT = 3.5;
  }
  return {
    group, trains, path: P,
    // the cars, as points with their speed, for the crowd to walk round
    others() {
      const out = [];
      for (const t of trains) for (let k = 0; k < t.pos.length; k++) {
        const q = t.pos[k], c = Math.cos(q.yaw), s = Math.sin(q.yaw), half = sizes[k].len / 2;
        for (let d = -half + 0.4; d <= half; d += 1.1) for (const lx of [-0.45, 0.45]) out.push({ x: q.x + s * d - c * lx, z: q.z + c * d + s * lx, vx: s * t.v, vz: c * t.v });
      }
      return out;
    },
    // dt; the player's body; the crowd's agents (for slowing); eye (for the bell's loudness, who to seat)
    update(dt, player, agents, eye) {
      if (!dt) return;
      for (const t of trains) {
        t.bellT = Math.max(0, t.bellT - dt);
        const head = t.pos[0], c = Math.cos(head.yaw), s = Math.sin(head.yaw);
        // who's in front: you stop it; people slow it (and get the bell)
        let block = Infinity, crowd = Infinity;
        const ahead = (x, z) => { const dx = x - head.x, dz = z - head.z, f = dx * s + dz * c, lat = Math.abs(dx * c - dz * s); return f > 0 && f < 6 && lat < 1.15 ? f : Infinity; };
        if (player && player.y < 1.5) block = ahead(player.x, player.z);
        if (agents && Math.abs(head.z - NJ.zc) < 12 && (!eye || Math.abs(eye.x - head.x) < 150)) for (const a of agents) { if (a.inside) continue; const f = ahead(a.x, a.z); if (f < crowd) crowd = f; }
        // the stops
        if (t.dwell > 0) { t.dwell -= dt; t.want = 0; if (t.dwell <= 0) { bell(t, eye); t.nextStop = (t.nextStop + 1) % P.stopS.length; } }
        else {
          const toStop = ((P.stopS[t.nextStop] - t.s) % P.total + P.total) % P.total;
          t.want = route.cruise;
          if (toStop < 6) t.want = Math.min(t.want, 0.25 + toStop * 0.25);
          if (toStop < 0.3) { t.dwell = route.dwell; t.v = 0; }
        }
        if (block < 4.5) { t.want = 0; bell(t, eye, 1.2); }
        else if (crowd < 3.5) { t.want = Math.min(t.want, 0.55); if (crowd < 2.2) bell(t, eye); }
        const a = t.want > t.v ? 0.5 : 1.8;
        t.v += Math.sign(t.want - t.v) * Math.min(Math.abs(t.want - t.v), a * dt);
        t.s = (t.s + t.v * dt) % P.total;
        // each car on the path behind the tractor's front
        t.pos.forEach((q, k) => P.at(t.s - offsets[k] + LOCO.len / 2, q));
        // their boxes (axis-aligned round each car, a little inside its corners)
        t.pos.forEach((q, k) => {
          const b = t.boxes[k]; if (!b) return;
          const hl = sizes[k].len / 2 - 0.1, hw = sizes[k].w / 2 - 0.05, ac = Math.abs(Math.cos(q.yaw)), as = Math.abs(Math.sin(q.yaw));
          const ex = as * hl + ac * hw, ez = ac * hl + as * hw;
          b.minX = q.x - ex; b.maxX = q.x + ex; b.minZ = q.z - ez; b.maxZ = q.z + ez;
        });
        // people aboard while you're near
        const near = eye && Math.hypot(eye.x - head.x, eye.z - head.z) < 70;
        if (near && !t.driver) board(t); else if (!near && t.driver && (!eye || Math.hypot(eye.x - head.x, eye.z - head.z) > 90)) alight(t);
        if (t.driver) for (const r of [t.driver, ...t.riders]) sit(r, t.pos[r.car], dt, eye);
      }
      // the instances
      trains.forEach((t, i) => t.pos.forEach((q, k) => {
        _q.setFromAxisAngle(up, q.yaw); _m.compose(_p.set(q.x, 0.02, q.z), _q, _s);
        if (k === 0) for (const im of locoIM) im.setMatrixAt(i, _m);
        else for (const im of carIM) im.setMatrixAt(i * nCars + k - 1, _m);
      }));
      for (const im of [...locoIM, ...carIM]) im.instanceMatrix.needsUpdate = true;
    },
    get state() { return trains.map((t) => ({ x: +t.pos[0].x.toFixed(1), z: +t.pos[0].z.toFixed(1), v: +t.v.toFixed(2), dwell: +t.dwell.toFixed(1), riders: t.riders.length })); },
  };
}
