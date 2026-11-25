// The two baristas in Manner's window on Hankou Road (world/shops.js), at work behind the glass.
// The avatar set has no barista clips, so the work is posed by hand over the idle (as world/dawn.js
// does tai chi): two-bone IK for the arms toward points on the machine and the counter, a lean from
// the hips, a turn of the waist, and the body sliding along the aisle (the riser under the window
// hides the feet). Both follow one 24-second loop, so the drink one makes is the drink the other
// hands out:
//   at the machine  grind, tamp, lock the portafilter in, start the shot, steam the milk, pour,
//                   set the cup on the pass, wipe the wand
//   at the hatch    (where you order) hands on the sill, looking out at whoever's there; tidies the
//                   cup stacks; points out the order code; turns to the pass for the finished cup and
//                   sets it on the ledge outside, where someone takes it a few seconds later
// Dressed in the shop's black apron and cap (made here: there are no uniforms in the set; the
// apron is shaped to the avatar's own body, sampled from its skinned mesh, and rides on its bones).
// The shop has no closing time in the game (you can order any hour), so they're always there.
import * as THREE from 'three';
import { createPerson } from './people.js';
import { twoBone, turn } from './driverPose.js';
import { cup as makeCup, holdCup } from './cups.js';
import { makeCanvas, tex } from './canvas.js';

const CYCLE = 24;
const UP = new THREE.Vector3(0, 1, 0);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, t) => a + (b - a) * t;
const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ---- the uniform
const apronMat = (() => {
  const [c, x] = makeCanvas(128, 256);
  x.fillStyle = '#151515'; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`; x.fillRect(Math.random() * 128, Math.random() * 256, 1, 2); }   // canvas weave
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.textAlign = 'center'; x.font = '800 15px "Inter", sans-serif'; x.fillText('LINGER', 64, 52);
  x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(22, 150, 84, 2); x.fillRect(22, 150, 2, 40); x.fillRect(104, 150, 2, 40); x.fillRect(64, 150, 1, 40);   // the front pocket's stitching
  return new THREE.MeshStandardMaterial({ map: tex(c, { repeat: false }), roughness: 0.92, side: THREE.DoubleSide });
})();
const capMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });

// the person's own front surface, sampled from the skinned body as it stands: for a grid of
// heights and offsets across the body, how far forward the body reaches (person frame, metres)
function frontProfile(p, rows, cols) {
  p.root.updateMatrixWorld(true);
  const yaw = p.root.rotation.y, o = p.root.position, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;
  const grid = rows.map(() => cols.map(() => -1));
  const v = new THREE.Vector3();
  p.root.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 2) {
      m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld);
      const dx = v.x - o.x, dz = v.z - o.z, h = v.y - o.y, f = dx * fx + dz * fz, r = dx * rx + dz * rz;
      for (let a = 0; a < rows.length; a++) {
        if (Math.abs(h - rows[a]) > 0.03) continue;
        for (let b = 0; b < cols.length; b++) if (Math.abs(r - cols[b]) < 0.03 && f > grid[a][b]) grid[a][b] = f;
      }
    }
  });
  // fill gaps from neighbours
  for (let a = 0; a < rows.length; a++) for (let b = 0; b < cols.length; b++) if (grid[a][b] < 0) {
    const n = [grid[a][b - 1], grid[a][b + 1], grid[a - 1]?.[b], grid[a + 1]?.[b]].filter((q) => q != null && q >= 0);
    grid[a][b] = n.length ? Math.max(...n) : 0.1;
  }
  return grid;
}
// the apron's bib and skirt: a sheet laid over the front of the body, a little proud of it
function dress(p, headTop) {
  const bone = (n) => p.root.getObjectByName(n);
  const chest = bone('Bip01_Spine2') || bone('Bip01_Spine1'), pelvis = bone('Bip01_Pelvis'), head = bone('Bip01_Head');
  if (!chest || !pelvis) return;
  const neck = (bone('Bip01_Neck') || head).getWorldPosition(new THREE.Vector3()).y - p.root.position.y;
  const waist = pelvis.getWorldPosition(new THREE.Vector3()).y - p.root.position.y + 0.08;
  const yaw = p.root.rotation.y, o = p.root.position, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;
  const sheet = (y0, y1, halfTop, halfBot, nr, nc, flare = 0) => {
    const rows = Array.from({ length: nr }, (_, i) => lerp(y1, y0, i / (nr - 1)));
    const colsU = Array.from({ length: nc }, (_, j) => -1 + (2 * j) / (nc - 1));
    const widest = Math.max(halfTop, halfBot);
    const prof = frontProfile(p, rows, colsU.map((u) => u * Math.min(widest, 0.14)));   // (the centre of the body only: not the arms at its sides)
    const pos = [], uv = [], idx = [];
    rows.forEach((h, a) => {
      const t = a / (nr - 1), half = lerp(halfTop, halfBot, t);
      colsU.forEach((u, b) => {
        const r = u * half;
        let f = prof[a][b] + 0.014 + flare * t * t;
        if (Math.abs(u) > 0.85) f -= 0.02 * (Math.abs(u) - 0.85) / 0.15;     // the edges wrap round a touch
        pos.push(o.x + fx * f + rx * r, o.y + h, o.z + fz * f + rz * r);
        uv.push((1 - u) / 2, 1 - (y1 - h) / (y1 - y0) * 0.999);                 // (u = -1 is the wearer's left: the viewer's right)
      });
    });
    for (let a = 0; a < nr - 1; a++) for (let b = 0; b < nc - 1; b++) { const i = a * nc + b; idx.push(i, i + nc, i + 1, i + 1, i + nc, i + nc + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  const bibTop = neck - 0.12;
  const bib = new THREE.Mesh(sheet(waist, bibTop, 0.13, 0.17, 9, 7), apronMat);
  const skirtG = sheet(Math.max(0.42, waist - 0.5), waist, 0.2, 0.22, 8, 9, 0.05);
  // the skirt carries the lower part of the same texture
  const uvA = skirtG.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setY(i, uvA.getY(i) * 0.55);
  const skirt = new THREE.Mesh(skirtG, apronMat);
  for (const m of [bib, skirt]) { m.castShadow = true; m.frustumCulled = false; }
  p.root.parent.add(bib, skirt); chest.attach(bib); pelvis.attach(skirt);
  // the neck strap and waist ties: thin dark bands
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 4, 16, Math.PI), apronMat);
  strap.position.set(o.x + fx * 0.02, o.y + neck - 0.02, o.z + fz * 0.02); strap.rotation.set(-Math.PI / 2 + 0.5, yaw, 0, 'YXZ');
  p.root.parent.add(strap); chest.attach(strap);
  // the cap: a crown over the top of the head and a peak to the front
  if (head && headTop) {
    const cap = new THREE.Group();
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), capMat); crown.scale.set(1, 0.62, 1.12);
    const peak = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.008, 16, 1, false, -Math.PI / 2.4, Math.PI / 1.2), capMat); peak.position.set(0, 0.0, 0.07); peak.rotation.x = 0.12;
    cap.add(crown, peak);
    cap.position.set(headTop.x - fx * 0.005, headTop.y - 0.055, headTop.z - fz * 0.005); cap.rotation.y = yaw;
    cap.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    p.root.parent.add(cap); head.attach(cap);
  }
}
function headTopOf(p) {
  const head = p.root.getObjectByName('Bip01_Head'); if (!head) return null;
  const hp = head.getWorldPosition(new THREE.Vector3()), v = new THREE.Vector3(), top = hp.clone();
  p.root.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); if (Math.hypot(v.x - hp.x, v.z - hp.z) < 0.09 && v.y > top.y) top.copy(v); }
  });
  return top;
}

// ---- the script: keys reach a pose (x along the aisle, yaw, lean, twist, hand targets) over `dur`
// seconds from `t`, and hold it until the next; `act` adds a working motion while a key holds
function script(keys) {
  let prev = { x: 0, yaw: 0, lean: 0, twist: 0, R: null, L: null, look: false };
  const out = keys.map((k) => (prev = { ...prev, dur: 0.7, act: null, look: false, ...k }));
  return out;
}
function sample(keys, t, pose) {
  let k = keys.length - 1;
  for (let i = 0; i < keys.length; i++) if (keys[i].t <= t) k = i;
  const K = keys[k], P = keys[(k - 1 + keys.length) % keys.length];
  const since = t - K.t, u = ease(since / K.dur);
  pose.x = lerp(P.x, K.x, u); pose.yaw = P.yaw + wrapAngle(K.yaw - P.yaw) * u;
  pose.lean = lerp(P.lean, K.lean, u); pose.twist = lerp(P.twist, K.twist, u);
  for (const h of ['R', 'L']) {
    const a = P[h], b = K[h], w = lerp(a ? 1 : 0, b ? 1 : 0, u);
    const p = a && b ? [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)] : (b || a);
    pose[h] = p ? { p: [...p], w } : null;
  }
  pose.look = K.look && u > 0.5;
  pose.act = K.act; pose.actT = since; pose.actW = u;
  return pose;
}
const ACTS = {
  tamp: (t, o) => { o.R[1] -= 0.035 * Math.max(0, Math.sin(t * 5.2)); },
  lock: (t, o) => { o.R[0] += 0.06 * ease(t / 0.9); o.L[0] += 0.03 * ease(t / 0.9); },
  grind: (t, o) => { o.L[1] += 0.006 * Math.sin(t * 22); },
  steam: (t, o) => { const a = t * 6.5, d = -0.035 * Math.min(1, t / 3.5); o.R[0] += 0.012 * Math.cos(a); o.R[2] += 0.012 * Math.sin(a); o.R[1] += d; o.L[1] += d; },
  pour: (t, o) => { const k = Math.min(1, t / 3); o.R[1] += 0.05 - 0.07 * k + 0.012 * Math.sin(t * 9) * (t > 1.4 ? 1 : 0); o.R[0] += 0.015 * Math.sin(t * 9) * (t > 1.4 ? 1 : 0); o.L[1] += 0.02 * k; },
  wipe: (t, o) => { o.R[1] += 0.05 * Math.sin(t * 6); },
  tidy: (t, o) => { o.R[0] += 0.06 * Math.sin(t * 1.7); o.R[1] += 0.03 * Math.max(0, Math.sin(t * 3.4)); o.L[2] += 0.03 * Math.sin(t * 2.3 + 1); },
};

export function createBaristas({ scene, people, work }) {
  const group = new THREE.Group(); group.name = 'manner-baristas'; scene.add(group);
  const S = { on: !!(people && work), clock: 0, staff: [], cups: {} };
  if (!S.on) return { group, update() {}, greet() {}, staff: [] };
  const { y0, top: CT, zc, aisle, zf, machine: mx, grinder: gx, tamp: tx, pass: px, hatch: hx, qr: qx, sill, ledge, pitcherRest } = work;
  const FRONT = 0, BACK = Math.PI;

  // ---- moving props: the milk pitcher, the drink that goes from the machine to the ledge
  const pitcher = new THREE.Group();
  { const steel = new THREE.MeshStandardMaterial({ color: 0xd2d5d8, metalness: 1, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.1, 16, 1, true), steel); body.position.y = 0.05;
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16).rotateX(Math.PI / 2), steel);
    const spout = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 8), steel); spout.rotation.x = Math.PI / 2 + 0.6; spout.position.set(0, 0.095, 0.036);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 6, 12, Math.PI), steel); handle.rotation.z = -Math.PI / 2; handle.position.set(0, 0.055, -0.04); handle.rotation.y = Math.PI / 2;
    pitcher.add(body, base, spout, handle); group.add(pitcher); }
  const drink = makeCup('manner'); group.add(drink);
  S.pitcher = 'rest'; S.drink = 'none';

  // ---- the two of them
  const roles = Object.keys(people.manifest.cast);
  const pick = (want, sex) => (people.manifest.cast[want] ? want : roles.find((r) => people.manifest.cast[r].sex === sex && /^[pc]\d/.test(r)) || roles[0]);
  const zA = aisle, zH = aisle - 0.03;
  // where things are (world): hand targets sit a hand's length short of what they touch
  const T = {
    grindBtn: [gx - 0.02, CT + 0.25, zc - 0.08], underSpout: [gx - 0.04, CT + 0.2, zc + 0.02],
    tampR: [tx - 0.02, CT + 0.17, zc - 0.07], tampL: [tx - 0.14, CT + 0.1, zc - 0.04],
    lockR: [mx - 0.16, CT + 0.17, zc + 0.0], lockL: [mx - 0.27, CT + 0.21, zc - 0.01],
    shotBtn: [mx - 0.17, CT + 0.34, zc - 0.03], cupDown: [mx - 0.2, CT + 0.09, zc - 0.0],
    pitcherGrab: [pitcherRest.x - 0.02, CT + 0.14, pitcherRest.z + 0.08],
    steamR: [mx + 0.4, CT + 0.17, zc + 0.0], steamL: [mx + 0.31, CT + 0.15, zc + 0.03],
    cupUp: [mx - 0.2, CT + 0.1, zc + 0.0], pourR: [mx - 0.15, CT + 0.28, zc - 0.01], pourL: [mx - 0.25, CT + 0.14, zc - 0.03],
    holdL: [mx + 0.02, CT + 0.13, zc + 0.02], passPut: [px, CT + 0.1, zc - 0.07],
    wipeR: [mx + 0.39, CT + 0.24, zc - 0.01], wipeL: [mx + 0.3, CT + 0.2, zc + 0.02],
    sillR: [hx - 0.15, sill.y + 0.06, sill.z], sillL: [hx + 0.17, sill.y + 0.06, sill.z - 0.02],
    tidyR: [hx + 0.28, CT + 0.14, zc - 0.08], tidyL: [hx + 0.5, CT + 0.17, zc - 0.1],
    qr: [qx + 0.12, sill.y + 0.16, zf + 0.0], passTake: [px, CT + 0.11, zc - 0.05], ledgePut: [ledge.x, ledge.y + 0.1, ledge.z + 0.02],
  };
  const machineKeys = script([
    { t: 0, x: gx - 0.2, yaw: BACK, lean: 0.12, twist: -0.12, R: T.grindBtn, L: T.underSpout, dur: 0.9, act: 'grind' },
    { t: 2.6, x: tx + 0.06, twist: 0, lean: 0.22, R: T.tampR, L: T.tampL, dur: 0.8, act: 'tamp' },
    { t: 4.8, x: mx - 0.18, lean: 0.14, R: T.lockR, L: T.lockL, dur: 0.7, act: 'lock' },
    { t: 6.6, R: T.shotBtn, L: T.cupDown, lean: 0.1, dur: 0.6 },
    { t: 8.0, x: mx + 0.28, twist: -0.12, R: T.pitcherGrab, L: null, dur: 0.7 },
    { t: 8.9, x: mx + 0.26, twist: -0.05, lean: 0.1, R: T.steamR, L: T.steamL, dur: 0.6, act: 'steam' },
    { t: 13.4, x: mx - 0.08, twist: 0.08, R: [mx - 0.02, CT + 0.24, zc - 0.0], L: T.cupUp, dur: 0.8 },
    { t: 14.5, twist: 0.24, lean: 0.16, R: T.pourR, L: T.pourL, dur: 0.6, act: 'pour' },
    { t: 18.2, x: mx + 0.26, twist: -0.1, lean: 0.1, R: T.pitcherGrab, L: T.holdL, dur: 0.7 },
    { t: 19.1, x: px + 0.42, twist: 0.22, lean: 0.14, R: null, L: T.passPut, dur: 0.9 },
    { t: 20.4, x: mx + 0.15, twist: -0.04, lean: 0.08, R: null, L: null, dur: 1.0 },
    { t: 21.6, x: mx + 0.22, R: T.wipeR, L: T.wipeL, lean: 0.1, dur: 0.6, act: 'wipe' },
    { t: 23.0, x: gx - 0.3, R: null, L: null, lean: 0.06, twist: -0.05, dur: 0.9 },
  ]);
  const hatchKeys = script([
    { t: 0, x: hx, yaw: FRONT, lean: 0.06, twist: 0, R: T.sillR, L: T.sillL, dur: 0.8, look: true },
    { t: 6.0, x: hx + 0.32, yaw: BACK, lean: 0.16, R: T.tidyR, L: T.tidyL, dur: 1.0, act: 'tidy' },
    { t: 11.0, x: hx, yaw: FRONT, lean: 0.06, R: T.sillR, L: T.sillL, dur: 1.0, look: true },
    { t: 15.0, R: T.qr, dur: 0.6, look: true },
    { t: 16.6, R: T.sillR, dur: 0.6, look: true },
    { t: 20.0, x: px - 0.47, yaw: BACK, lean: 0.1, R: null, L: null, dur: 1.0 },
    { t: 21.0, twist: -0.15, lean: 0.16, R: T.passTake, dur: 0.5 },
    { t: 21.6, x: hx, yaw: FRONT, twist: 0, lean: 0.05, R: null, dur: 1.0 },
    { t: 22.6, R: T.ledgePut, lean: 0.14, dur: 0.6 },
    { t: 23.3, R: T.sillR, L: T.sillL, lean: 0.06, dur: 0.6, look: true },
  ]);
  // who has the props when (seconds into the loop)
  const drinkAt = (t) => (t >= 14.1 && t < 19.95 ? 'B.L' : t >= 19.95 && t < 21.45 ? 'pass' : t >= 21.45 && t < 23.15 ? 'A.R' : t >= 23.15 || t < 4.6 ? 'ledge' : 'none');
  const pitcherAt = (t) => (t >= 8.65 && t < 18.85 ? 'hand' : 'rest');
  const make = (role, keys, z, scaleK) => {
    const p = createPerson(people, role);
    p.root.scale.setScalar(0.01 * scaleK);
    p.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    p.root.position.set(keys[0].x, y0, z); p.root.rotation.y = keys[0].yaw;
    p.play('idle', 0); group.add(p.root); p.update(0); p.root.updateMatrixWorld(true);
    // dress them standing in their opening pose's facing
    dress(p, headTopOf(p));
    const bone = (n) => p.root.getObjectByName(n);
    const arms = { R: ['UpperArm', 'Forearm', 'Hand'].map((b) => bone(`Bip01_R_${b}`)), L: ['UpperArm', 'Forearm', 'Hand'].map((b) => bone(`Bip01_L_${b}`)) };
    return { p, keys, z, arms, spine: bone('Bip01_Spine'), spine1: bone('Bip01_Spine1') || bone('Bip01_Spine'), pose: {}, greet: 0 };
  };
  const B = make(pick('c3', 'f'), machineKeys, zA, 0.97);                     // at the machine
  const A = make(pick('c5', 'm'), hatchKeys, zH, 0.98);                       // at the hatch, where you order
  S.staff = [A, B];

  const _t = new THREE.Vector3(), _pole = new THREE.Vector3(), _n = new THREE.Vector3(), _r = new THREE.Vector3(), _h = new THREE.Vector3();
  const off = { R: [0, 0, 0], L: [0, 0, 0] };
  function pose(m, t, dt, look) {
    const P = sample(m.keys, t, m.pose), p = m.p;
    if (m.greet > 0 && m === A) {                                             // greeted: turn to the window and look at you
      const g = Math.min(1, m.greet * 2);
      P.x = lerp(P.x, hx, g); P.yaw = P.yaw + wrapAngle(FRONT - P.yaw) * g; P.look = true; P.twist *= 1 - g;
    }
    p.root.position.set(P.x, y0, m.z); p.root.rotation.y = P.yaw;
    p.update(dt, P.look ? look : null);
    const yaw = P.yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw), fx = Math.sin(yaw), fz = Math.cos(yaw);
    _r.set(rx, 0, rz);
    if (m.spine && P.lean) turn(m.spine, _r, -P.lean * 0.6);
    if (m.spine1 && (P.lean || P.twist)) { if (P.lean) turn(m.spine1, _r, -P.lean * 0.4); if (P.twist) turn(m.spine1, UP, P.twist); }
    off.R[0] = off.R[1] = off.R[2] = off.L[0] = off.L[1] = off.L[2] = 0;
    if (P.act && ACTS[P.act]) ACTS[P.act](P.actT, off);
    for (const [h, side] of [['R', 1], ['L', -1]]) {
      const H = P[h], [a, b, c] = m.arms[h];
      if (!H || !c || H.w < 0.01) continue;
      c.getWorldPosition(_n);                                                 // where the idle has the hand
      const k = P.actW;
      _t.set(H.p[0] + off[h][0] * k, H.p[1] + off[h][1] * k, H.p[2] + off[h][2] * k);
      _t.lerpVectors(_n, _t, H.w);
      _pole.set(rx * side * 0.55 - fx * 0.35, -1, rz * side * 0.55 - fz * 0.35).normalize();   // elbows down, out and back
      twoBone(a, b, c, _t, _pole);
    }
  }
  // a prop in a hand: a little beyond the wrist, along the hand
  const inHand = (m, h, obj, up = 0) => {
    const [, fore, hand] = m.arms[h]; if (!hand) return;
    hand.getWorldPosition(_h); fore.getWorldPosition(_n);
    _n.subVectors(_h, _n).normalize();
    obj.position.copy(_h).addScaledVector(_n, 0.06); obj.position.y += up;
  };

  let near = false;
  const api = {
    group, staff: S.staff,
    _jump: null,                                                              // (tools: set a time in the loop)
    get clock() { return S.clock; },
    // the player orders: the one at the hatch turns to the window
    greet() { A.greet = 3; },
    update(dt, pp) {
      const d = pp ? Math.hypot(pp.x - (hx + 1.2), pp.z - zf) : 0;
      near = d < 70; group.visible = d < 140;
      if (!near) return;
      if (api._jump != null) { S.clock = api._jump; api._jump = null; }
      S.clock += dt;
      const t = ((S.clock % CYCLE) + CYCLE) % CYCLE;
      S.drink = drinkAt(t); S.pitcher = pitcherAt(t);
      A.greet = Math.max(0, A.greet - dt);
      const look = pp && Math.hypot(pp.x - hx, pp.z - zf) < 7 ? [pp.x, pp.z] : null;
      pose(B, t, dt, null);
      pose(A, t, dt, look);
      // props
      if (S.pitcher === 'hand') { inHand(B, 'R', pitcher, -0.07); pitcher.rotation.set(B.pose.act === 'pour' ? (0.35 + 0.35 * Math.min(1, B.pose.actT / 2.5)) * B.pose.actW : 0, B.pose.yaw - 0.9, 0, 'YXZ'); }
      else { pitcher.position.set(pitcherRest.x, CT, pitcherRest.z); pitcher.rotation.set(0, -0.6, 0); }
      drink.visible = S.drink !== 'none';
      if (S.drink === 'B.L') { B.arms.L[2].getWorldPosition(_h); holdCup(drink, _h, B.pose.yaw); }
      else if (S.drink === 'A.R') { A.arms.R[2].getWorldPosition(_h); holdCup(drink, _h, A.pose.yaw); }
      else if (S.drink === 'pass') { drink.position.set(px, CT, zc - 0.08); drink.rotation.set(0, 0.4, 0); }
      else if (S.drink === 'ledge') { drink.position.set(ledge.x, ledge.y, ledge.z); drink.rotation.set(0, 0.2, 0); }
    },
  };
  return api;
}
