// The people in the metro, at the station you're in and on the trains near you:
//   in      down an exit's stairs; with a bag, onto the X-ray belt and along the lane to pick it up at the
//           other end; without, straight past; tap the phone on a gate (it opens); the escalator (stand on
//           it) or the stair down; to a door's marked waiting place either side of it, phone out; when the
//           train's doors open, a moment for those getting off, then aboard
//   off     out of the doors as they open, to the up escalator or the stair, through an exit gate (tap),
//           to an exit, up its stairs
//   riders  on the train: on the benches (sat: the clips are all standing ones, so the sitting is done
//           here, as world/driverPose.js does it at the wheel) or standing by the doors and the poles
//   staff   the security officer at the end of the X-ray belt, the operator at its screen (sat), a
//           station attendant by the service centre, one on the platform at the foot of the escalators
// A pool of people (Rocketbox avatars, world/people.js), reused; only within about 60 m of you.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { holdPhone } from './pedestriansReal.js';
import { twoBone, turn } from './driverPose.js';
import { groundHeight } from './layout.js';
import { STATIONS, Y, PLAT, GATE, gateP, SEC, ESC, COLS, DOOR_AS, CAR } from './metroLayout.js';
import { carToWorld, worldToCar, CAR_IN, CAR_SEATS, FLOOR } from './metroTrain.js';

const ROLES = ['p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
const POOL = 46;
// how busy the metro is at a minute of the day (0 shut .. 1 the rush): Shanghai's two peaks, a quiet
// middle of the day, an evening that thins out; nobody new comes in after the last train (about 23:00)
export function busyAt(min) {
  const h = min / 60;
  if (h < 5.5 || h >= 23) return 0;
  const peak = (c, w) => Math.exp(-(((h - c) / w) ** 2));
  return Math.min(1, 0.22 + 0.78 * Math.max(peak(8.25, 0.9), peak(18.1, 1.0)) + (h > 11.5 && h < 13.5 ? 0.12 : 0) - (h > 21.5 ? (h - 21.5) * 0.1 : 0));
}
const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
// the heading (world) of a local direction (along, across) in a station's frame
const headingOf = (st, fa, fp) => Math.atan2(fa * st.F.ux - fp * st.F.uz, fa * st.F.uz + fp * st.F.ux);

function bagMesh() {
  const g = new THREE.Group(), col = pick([0x1d1f22, 0x2e3a4a, 0x6b4a32, 0x7a2a2a, 0x3c4a3a, 0xc8b89a]);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.14), new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 })); b.position.y = -0.2; g.add(b);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 4, 10, Math.PI), new THREE.MeshStandardMaterial({ color: 0x18191a, roughness: 0.6 })); h.position.y = -0.05; g.add(h);
  return g;
}
function capMesh() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x1b2433, roughness: 0.6 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.1, 0.07, 16), m); top.position.y = 0.04; g.add(top);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.4 })); brim.position.set(0, 0.012, 0.07); brim.rotation.y = -Math.PI / 2; g.add(brim);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), new THREE.MeshStandardMaterial({ color: 0xd8b84a, metalness: 0.8, roughness: 0.3 })); badge.position.set(0, 0.045, 0.104); g.add(badge);
  return g;
}

// sat on a bench: pelvis to the seat, feet on the floor in front, hands in the lap
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), pole = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function sit(person, hip, fwd) {
  const r = person.root, B = person._sb || (person._sb = { pelvis: r.getObjectByName('Bip01_Pelvis'), spine: r.getObjectByName('Bip01_Spine'),
    L: ['Thigh', 'Calf', 'Foot', 'UpperArm', 'Forearm', 'Hand'].map((n) => r.getObjectByName(`Bip01_L_${n}`)), R: ['Thigh', 'Calf', 'Foot', 'UpperArm', 'Forearm', 'Hand'].map((n) => r.getObjectByName(`Bip01_R_${n}`)) });
  if (!B.pelvis || !B.L[0]) return;
  r.updateMatrixWorld(true);
  B.pelvis.getWorldPosition(v1); r.position.add(v2.subVectors(hip, v1)); r.updateMatrixWorld(true);
  const right = v3.crossVectors(fwd, UP).normalize();
  turn(B.spine, right, -0.08);
  for (const [s, k] of [[B.L, 1], [B.R, -1]]) {
    const foot = v1.copy(hip).addScaledVector(fwd, 0.5).addScaledVector(right, -k * 0.13); foot.y = hip.y - 0.4;
    pole.copy(fwd).addScaledVector(UP, 0.6).normalize(); twoBone(s[0], s[1], s[2], foot, pole);
    const lap = v2.copy(hip).addScaledVector(fwd, 0.3).addScaledVector(right, -k * 0.1); lap.y = hip.y + 0.1;
    pole.set(0, -1, 0).addScaledVector(right, -k * 0.5).normalize(); twoBone(s[3], s[4], s[5], lap, pole);
  }
}

export function createMetroFolk({ root, people, metro }) {
  const group = new THREE.Group(); group.name = 'metro-folk'; root.add(group);
  const phoneMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.3, metalness: 0.5 });
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const person = createPerson(people, ROLES[i % ROLES.length]); person.root.visible = false; group.add(person.root);
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.15, 0.009), phoneMat); phone.visible = false; group.add(phone);
    const bag = bagMesh(); bag.visible = false; group.add(bag);
    pool.push({ person, phone, bag, free: true, id: i });
  }
  const agents = [], staff = [];
  const S = { spawnT: 1, seeded: new Set(), alit: new Set(), density: 0, st: null };

  function take() { const p = pool.find((q) => q.free); if (!p) return null; p.free = false; p.person.root.visible = true; return p; }
  function free(ag) { const p = ag.body; p.free = true; p.person.root.visible = false; p.phone.visible = false; p.bag.visible = false; const i = agents.indexOf(ag); if (i >= 0) agents.splice(i, 1); }

  // ---- plans: waypoints in the station's frame [a, p, action?] ----
  const exitsOf = (st) => st.ways.exits;
  const stairs = (st, e, down) => {
    // an exit's stair, from part way up to its landing (or the reverse)
    if (st.id === 'enr') { const top = e.exit === 7 ? 6.8 : -37.8, bot = e.land[0]; const mid = bot + (top - bot) * 0.62; return down ? [[mid, e.land[1]], [bot, e.land[1]]] : [[bot, e.land[1]], [mid + (top - bot) * 0.3, e.land[1], 'gone']]; }
    const at = e.land[0] - 10.2, pt = e.land[1]; return down ? [[at + 4.5, pt], [at + 10.2, pt]] : [[at + 10.2, pt], [at + 1.5, pt, 'gone']];
  };
  const fromExit = (st, e) => (st.id === 'enr' ? [[e.exit === 7 ? -6 : -25, -11.4], [-10, -4.5]] : [[e.land[0] + 2.6, e.land[1]], [e.land[0] + 2.6, Math.sign(e.land[1]) * 8], [-6, Math.sign(e.land[1]) * 3]]);
  function planIn(st) {
    const e = pick(exitsOf(st)), bag = rnd() < 0.35, gate = GATE.out + Math.floor(rnd() * (GATE.n - GATE.out)), stair = rnd() < 0.3, pl = stair ? (rnd() - 0.5) * 1.6 : 2.17;
    const pts = [...stairs(st, e, true), ...fromExit(st, e)];
    if (bag) pts.push([SEC.a - 1.2, 4.7], [SEC.infeed - 0.1, 4.7, 'place'], [SEC.a + 0.6, 4.7], [SEC.outfeed - 0.1, 4.7, 'collect'], [SEC.belt.a1 + 0.9, 3.4]);
    else pts.push([SEC.a - 1.4, 0.9], [SEC.a + 1.4, 0.9]);
    pts.push([GATE.a - 1.3, gateP(gate), 'tap'], [GATE.a + 1.3, gateP(gate)], [ESC.aT - 2.4, pl], [ESC.aT - 0.4, pl, stair ? null : 'ride'], [ESC.aB + 0.6, pl], [ESC.aB + 2.6, pl]);
    const side = rnd() < 0.5 ? 1 : -1, door = pickDoor(), off = rnd() < 0.5 ? -0.85 : 0.85;
    pts.push([ESC.aB + 2.6, side * 3.2], [DOOR_AS[door] + off, side * 3.2], [DOOR_AS[door] + off, side * 4.75, 'wait']);
    return { pts, bag, side, door, gate, speed: 1.2 + rnd() * 0.35, phone: rnd() < 0.6 };
  }
  function pickDoor() {
    // people bunch near the escalators; never a door with a column in front of its waiting places
    for (let k = 0; k < 20; k++) {
      const d = Math.floor(Math.max(0, Math.min(DOOR_AS.length - 1, 13 + (rnd() + rnd() + rnd() - 1.5) * 18)));
      if (!COLS.plat.some(([a]) => Math.abs(a - DOOR_AS[d]) < 1.9)) return d;
    }
    return 14;
  }
  function planOut(st, door, side) {
    const e = pick(exitsOf(st)), gate = Math.floor(rnd() * GATE.out), stair = rnd() < 0.3, pl = stair ? (rnd() - 0.5) * 1.6 : -2.17;
    const pts = [[DOOR_AS[door] + (rnd() - 0.5) * 0.5, side * 4.4], [DOOR_AS[door], side * 3.2], [ESC.aB + 2.8, side * 3.2], [ESC.aB + 2.8, pl], [ESC.aB + 0.4, pl, stair ? null : 'ride'], [ESC.aT - 0.6, pl], [ESC.aT - 2.6, pl],
      [GATE.a + 1.3, gateP(gate), 'tap'], [GATE.a - 1.3, gateP(gate)], [SEC.a - 1.0, -3.2], ...fromExit(st, e).reverse(), ...stairs(st, e, false)];
    return { pts, side, gate, speed: 1.25 + rnd() * 0.3, phone: rnd() < 0.3 };
  }

  function spawn(st, plan, at = null) {
    const body = take(); if (!body) return null;
    const ag = { body, st, plan, i: 1, a: 0, p: 0, y: Y.C, heading: 0, act: 0, actKind: null, state: 'walk', ride: null, seat: null, bagOn: false };
    [ag.a, ag.p] = at || plan.pts[0];
    const [x, z] = st.F.toW(ag.a, ag.p); ag.y = at ? Y.P : groundHeight(x, z, 0.2);
    ag.x = x; ag.z = z; body.person.play('walk', 0);
    agents.push(ag); return ag;
  }
  // a rider in a car: seated (seat: lz along a bench) or standing
  function rider(tr, k, seated) {
    const body = take(); if (!body) return null;
    const side = rnd() < 0.5 ? 1 : -1;
    let lx, lz;
    if (seated) { const [z0, z1] = pick(CAR_SEATS); lz = z0 + 0.3 + Math.floor(rnd() * Math.max(1, (z1 - z0 - 0.6) / 0.46)) * 0.46; lx = side * (CAR_IN.x - 0.3); }
    else { const d = pick(CAR.doors); lz = d + (rnd() - 0.5) * 2.2; lx = (rnd() - 0.5) * 1.2; }
    if (agents.some((o) => o.ride && o.ride.tr === tr.id && o.ride.k === k && Math.hypot(o.ride.lx - lx, o.ride.lz - lz) < 0.5)) { body.free = true; body.person.root.visible = false; return null; }
    const ag = { body, st: null, plan: null, i: 0, a: 0, p: 0, y: 0, heading: 0, act: 0, actKind: null, state: seated ? 'seated' : 'standing', ride: { tr: tr.id, k, lx, lz, face: seated ? -side : rnd() * 6.28 }, phone: rnd() < 0.65 };
    body.person.play('idle', 0); agents.push(ag); return ag;
  }

  // ---- staff ----
  function addStaff(st, a, p, face, seated = false) {
    const body = take(); if (!body) return;
    body.person.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    const cap = capMesh(); const head = body.person.bones.head; if (head) { cap.scale.setScalar(100); cap.position.set(9, 2, 0); cap.rotation.set(0, Math.PI / 2, -Math.PI / 2); head.add(cap); }
    const ag = { body, st, a, p, face, seated, staff: true, cap, y: p > 3 && a > ESC.aT ? Y.P : Y.C };
    body.person.play('idle', 0); staff.push(ag);
  }
  function staffFor(st) {
    for (const s of staff.splice(0)) { s.body.free = true; s.body.person.root.visible = false; if (s.cap && s.cap.parent) s.cap.parent.remove(s.cap); }
    addStaff(st, SEC.belt.a1 + 0.9, SEC.lane[1] + 0.45, [-1, 0]);
    addStaff(st, 3.3, SEC.belt.p0 - 1.15, [0, 1], true);
    addStaff(st, GATE.a + 2.6, -5.9, [-1, 0]);
    addStaff(st, ESC.aB + 5, 3.3, [0, 1]);
  }

  // a station already going when you arrive: people waiting at the doors, others on their way through
  function seed(st) {
    const b = busyAt(metro.minute); if (b <= 0) return;      // (shut: nobody about)
    for (let k = 0; k < Math.round(2 + 16 * b); k++) { const P = planIn(st), last = P.pts[P.pts.length - 1], ag = spawn(st, P, [last[0], last[1]]); if (ag) { ag.i = P.pts.length; ag.state = 'wait'; ag.y = Y.P; } }
    for (let k = 0; k < Math.round(1 + 6 * b); k++) { const P = planIn(st), j = 4 + Math.floor(rnd() * 3), q = P.pts[j], ag = spawn(st, P, [q[0], q[1]]); if (ag) { ag.i = j + 1; ag.y = Y.C; const [x, z] = st.F.toW(q[0], q[1]); ag.y = groundHeight(x, z, Y.C + 0.3); } }
  }
  const _h = new THREE.Vector3(), _f = new THREE.Vector3();
  function pose(ag, dt, moving, speed, pp) {
    const P = ag.body.person, r = P.root;
    if (ag.drawn === false) { r.position.set(ag.x, ag.y, ag.z); return; }
    r.position.set(ag.x, ag.y, ag.z);
    let d = ag.heading - r.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; r.rotation.y += d * Math.min(1, dt * 6);
    P.play(moving ? 'walk' : 'idle', 0.3); P.setGait(moving ? speed : 0);
    const phoneUp = !!ag.phoneUp; P.setPhoneHold(phoneUp ? 1 : 0);
    P.update(dt, pp && Math.hypot(pp.x - ag.x, pp.z - ag.z) < 3 ? [pp.x, pp.z] : null);
    if (ag.state === 'seated') { _f.set(Math.sin(r.rotation.y), 0, Math.cos(r.rotation.y)); _h.set(ag.x, ag.y + 0.5, ag.z); sit(P, _h, _f); }
    ag.body.phone.visible = phoneUp; if (phoneUp) holdPhone(ag.body.phone, P, r.rotation.y);
    const bag = ag.body.bag;
    if (ag.plan && ag.plan.bag && !ag.bagOn) { bag.visible = true; P.bones.L.getWorldPosition(_h); bag.position.copy(_h); bag.rotation.y = r.rotation.y; }
  }

  function update(dt, { playing = true } = {}) {
    const pp = playerPos();
    const st = metro.stationNear(pp, 40) && pp.y < -1.6 ? metro.stationNear(pp, 40) : null;
    if (st !== S.st) { S.st = st; for (const ag of [...agents]) if (!ag.ride) free(ag); if (st) { staffFor(st); seed(st); } else for (const s of staff.splice(0)) { s.body.free = true; s.body.person.root.visible = false; } }
    const busy = busyAt(metro.minute);
    S.density = Math.min(1, agents.length / 18);
    // new people coming in
    if (st && playing) {
      S.spawnT -= dt;
      if (S.spawnT <= 0) { S.spawnT = busy > 0 ? (2.2 + rnd() * 3) / (0.25 + busy) : 5; if (busy > 0 && agents.filter((a) => !a.ride && a.st === st).length < 8 + 22 * busy) spawn(st, planIn(st)); }
    }
    // the trains: riders where you can see them, people getting off where one has stopped
    for (const tr of metro.near) {
      const cs = metro.carsOf(tr);
      const ridingThis = metro.riding && metro.stats.rideTrain === tr;
      // the cars near you
      for (let k = 0; k < cs.length; k++) {
        const c = cs[k], dk = Math.hypot(c.x - pp.x, c.z - pp.z);
        const want = ridingThis ? Math.abs(k - metro.stats.ride.k) <= 1 : dk < 40;
        const key = `${tr.id}:${k}`;
        if (want && !S.seeded.has(key)) { S.seeded.add(key); const n = Math.round((ridingThis && k === metro.stats.ride.k ? 4 + 12 * busy : 2 + 5 * busy)); for (let j = 0; j < n; j++) rider(tr, k, rnd() < 0.55); }
      }
      if (tr.phase === 'dwell' && st && tr.station === STATIONS.indexOf(st) && tr.dwellT > 3.6 && tr.dwellT < 14 && !S.alit.has(`${tr.id}:${tr.station}`)) {
        S.alit.add(`${tr.id}:${tr.station}`);
        const n = Math.round(2 + 12 * busy * (0.7 + rnd() * 0.6));
        for (let j = 0; j < n; j++) {
          const door = pickDoor(), side = tr.dir;
          const ag = spawn(st, planOut(st, door, side), [DOOR_AS[door] + (rnd() - 0.5) * 0.6, side * (PLAT.track - 0.9)]);
          if (ag) { ag.y = Y.P; ag.delay = j * 0.6 + rnd() * 0.5; }
        }
      }
    }
    if (S.seeded.size > 300) S.seeded = new Set([...S.seeded].slice(-120));
    if (S.alit.size > 100) S.alit = new Set([...S.alit].slice(-40));
    // everyone
    const nearIds = new Set(metro.near.map((t) => t.id));
    for (const ag of [...agents]) {
      if (ag.ride) { stepRider(ag, dt, pp, nearIds); continue; }
      stepWalker(ag, dt, pp);
    }
    // only the nearest are drawn (a person is a dozen draw calls): the rest stand hidden where they are
    const live = [...agents.filter((a) => a.body.person.root.visible || a.drawn != null)];
    live.sort((u, v) => Math.hypot(u.x - pp.x, u.z - pp.z) - Math.hypot(v.x - pp.x, v.z - pp.z));
    const VISIBLE = Math.round(9 + 11 * busy);                 // (a person is a dozen draw calls: more of them in the rush)
    live.forEach((a, i) => { const on = i < VISIBLE && Math.hypot(a.x - pp.x, a.z - pp.z) < 45 && !(a.delay > 0); a.drawn = on; a.body.person.root.visible = on; if (!on) { a.body.phone.visible = false; a.body.bag.visible = a.bagOn && Math.hypot(a.x - pp.x, a.z - pp.z) < 30; } });
    for (const s of staff) {
      const [x, z] = s.st.F.toW(s.a, s.p); s.x = x; s.z = z; s.heading = headingOf(s.st, s.face[0], s.face[1]);
      s.drawn = Math.hypot(x - pp.x, z - pp.z) < 28 && Math.abs(pp.y - s.y) < 4; s.body.person.root.visible = s.drawn;
      s.state = s.seated ? 'seated' : 'idle';
      pose(s, dt, false, 0, pp);
      if (s.seated) { /* sat at the operator's desk */ }
    }
  }
  function playerPos() { const b = metro.player.body; return { x: b.x, y: b.y, z: b.z }; }

  function stepRider(ag, dt, pp, nearIds) {
    const R = ag.ride;
    if (!nearIds.has(R.tr)) { free(ag); return; }
    const tr = metro.near.find((t) => t.id === R.tr), c = metro.carsOf(tr)[R.k];
    // far from you and not on your train: let them go
    if (!(metro.riding && metro.stats.rideTrain === tr) && Math.hypot(c.x - pp.x, c.z - pp.z) > 70) { S.seeded.delete(`${R.tr}:${R.k}`); free(ag); return; }   // (the car fills again if you come back)
    if (ag.boardTo) { // walking in from the door to a place
      const dx = ag.boardTo[0] - R.lx, dz = ag.boardTo[1] - R.lz, d = Math.hypot(dx, dz);
      if (d < 0.05) ag.boardTo = null; else { const s = Math.min(d, 1.1 * dt); R.lx += dx / d * s; R.lz += dz / d * s; R.face = Math.atan2(dx, dz); }
    }
    const [x, z] = carToWorld(c, R.lx, R.lz); ag.x = x; ag.z = z; ag.y = c.y + FLOOR;
    ag.heading = c.heading + (ag.state === 'seated' ? (R.lx > 0 ? -Math.PI / 2 : Math.PI / 2) : R.face);
    ag.phoneUp = ag.phone;
    pose(ag, dt, !!ag.boardTo, 1.1, pp);
  }
  function stepWalker(ag, dt, pp) {
    const st = ag.st, P = ag.plan;
    if (ag.delay > 0) { ag.delay -= dt; ag.body.person.root.visible = false; return; }
    let moving = false, speed = P.speed;
    if (ag.act > 0) { ag.act -= dt; if (ag.act <= 0) ag.actKind = null; }
    else if (ag.state === 'wait') {
      // waiting at the door: when this side's train has its doors open (and those getting off are off), aboard
      const tr = metro.near.find((t) => t.phase === 'dwell' && t.station === STATIONS.indexOf(st) && t.dir === P.side);
      ag.phoneUp = P.phone;
      if (tr && tr.dwellT > 6.5 + (ag.body.id % 5) * 0.7 && tr.dwellT < 23) { ag.state = 'board'; ag.boardTr = tr; ag.plan = { ...P, pts: [[ag.a, ag.p], [DOOR_AS[P.door] + (rnd() - 0.5) * 0.4, P.side * 5.6], [DOOR_AS[P.door], P.side * 6.9]] }; ag.i = 1; }
      else ag.heading = headingOf(st, 0, P.side);
    } else {
      const tgt = ag.plan.pts[ag.i];
      if (!tgt) { free(ag); return; }
      const da = tgt[0] - ag.a, dp = tgt[1] - ag.p, d = Math.hypot(da, dp);
      const riding = ag.onEsc;
      if (riding) speed = ESC.speed;
      if (d < 0.08) {
        const act = tgt[2];
        ag.onEsc = act === 'ride';
        if (act === 'tap') { ag.act = 0.55; ag.actKind = 'tap'; metro.openGate(st, ag.plan.gate, 2.4, false); metro.gateSound(st, ag.plan.gate); }
        else if (act === 'place') { ag.act = 1.1; ag.bagOn = true; ag.bagT = 0; metro.beltSound(st); }
        else if (act === 'collect') { if (ag.bagT < 3.6) { ag.act = 3.6 - ag.bagT; } }
        else if (act === 'wait') { ag.state = 'wait'; }
        else if (act === 'gone') { free(ag); return; }
        if (ag.plan.pts[ag.i] && ag.plan.pts[ag.i][2] === 'collect' && ag.bagOn && ag.act <= 0.01) ag.bagOn = false;
        ag.i++;
        if (ag.state === 'board' && ag.i >= ag.plan.pts.length) { board(ag); return; }
      } else {
        const s = Math.min(d, speed * dt);
        let na = ag.a + da / d * s, np = ag.p + dp / d * s;
        // give each other (and you) a little room
        for (const o of agents) if (o !== ag && !o.ride && o.st === st && Math.abs(o.y - ag.y) < 1) { const ea = na - o.a, ep = np - o.p, e = Math.hypot(ea, ep); if (e < 0.5 && e > 1e-3) { na += ea / e * (0.5 - e) * 0.5; np += ep / e * (0.5 - e) * 0.5; } }
        { const [lx, lz] = st.F.toL(pp.x, pp.z); if (Math.abs(pp.y - ag.y) < 1.2) { const ea = na - lx, ep = np - lz, e = Math.hypot(ea, ep); if (e < 0.55 && e > 1e-3) { na += ea / e * (0.55 - e) * 0.6; np += ep / e * (0.55 - e) * 0.6; } } }
        ag.a = na; ag.p = np; moving = !riding;
        ag.heading = headingOf(st, da / d, dp / d);
      }
      ag.phoneUp = !!(P.phone && moving && !riding && ag.state !== 'board' && ag.i > 5);
    }
    if (ag.bagOn) {
      ag.bagT = (ag.bagT || 0) + dt;
      const f = Math.min(1, ag.bagT / 3.6), a = SEC.infeed + (SEC.outfeed - SEC.infeed) * f, [x, z] = st.F.toW(a, (SEC.belt.p0 + SEC.belt.p1) / 2);
      ag.body.bag.visible = true; ag.body.bag.position.set(x, Y.C + 0.96, z); ag.body.bag.rotation.y = -st.F.rot;
      if (ag.actKind === null && ag.plan.pts[ag.i - 1] && ag.plan.pts[ag.i - 1][2] === 'collect' && f >= 1) ag.bagOn = false;
    }
    const [x, z] = st.F.toW(ag.a, ag.p);
    ag.x = x; ag.z = z; ag.y = groundHeight(x, z, ag.y + 0.3);
    pose(ag, dt, moving, speed, pp);
  }
  function board(ag) {
    const tr = metro.near.find((t) => t.id === ag.boardTr.id);
    if (!tr) { free(ag); return; }
    const cs = metro.carsOf(tr); let best = 0, bd = Infinity;
    cs.forEach((c, k) => { const d = Math.hypot(c.x - ag.x, c.z - ag.z); if (d < bd) { bd = d; best = k; } });
    const [lx, lz] = worldToCar(cs[best], ag.x, ag.z);
    ag.ride = { tr: tr.id, k: best, lx: Math.min(lx, CAR_IN.x - 0.3), lz, face: 0 }; ag.state = 'standing'; ag.plan = null; ag.st = null; ag.body.bag.visible = false;
    ag.boardTo = [(rnd() - 0.5) * 1.0, lz + (rnd() - 0.5) * 1.6];
  }

  return {
    group, agents, staff,
    get density() { return S.density; },
    update,
  };
}
