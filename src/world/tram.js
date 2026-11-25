// The Nanjing Road sightseeing trains (南京路步行街观光车, the "铛铛车", named for the bell): battery road trains
// on the pedestrian street between Henan Road and Xizang Road (not on the 2020 extension to the Bund), in the
// 7 m lane along the south side of the red granite 金带; white bodies, green arched canopies with a scalloped
// valance, green skirts, fleet numbers on the back (a photo of November 2025). Two of them on a loop,
// westbound on the lane's north half and eastbound on its south (traffic keeps right), turning at each
// end, stopping at the ends and at Century Square, about 6 km/h; 08:30 to 22:00. The trailers follow the
// tractor's path (a road train), so they swing round the turns as real ones do.
//   - people in the way: the crowd steps aside (the cars are in main.js's `others`, with their speed);
//     the train slows and rings for them, and stops for you if you stand in front of it
//   - you can't walk through it (a box per car, engine/movement.js)
//   - passengers sat on the benches and a driver at the front (createPerson + a sitting pose by IK)
// Look and route: docs/nanjing-road-tram.md (what's known, what's assumed).
import * as THREE from 'three';
import { Batch } from './geo.js';
import { NJ, L as LAY } from './layout.js';
import { createPerson } from './people.js';
import { twoBone } from './driverPose.js';
import { asLight } from './dayNight.js';
import { makeCanvas, tex, FONT } from './canvas.js';

// the loop: two lanes either side of the centre line, turned at each end (radius = half the spacing)
export const TRAM_ROUTE = { xEast: -548, xWest: -1500, zc: NJ.zc + 4.3, half: 2.4, stops: [-560, -1105, -1488], cruise: 1.7, dwell: 18, open: [510, 1320] };
// the livery (docs/nanjing-road-tram.md)
export const TRAM_LOOK = { body: 0xf2f1ec, trim: 0x1f6e3a, roof: 0x2f8a4c, seat: 0x8a5a34, frame: 0xf4f4f0, cars: 3, numbers: ['11', '12'] };
const LOCO = { len: 3.4, w: 1.55, h: 2.55 }, CAR = { len: 4.0, w: 1.62, h: 2.45 }, GAP = 0.55;

// ---- the path: s (m) round the loop -> position and heading ----
function makePath(R) {
  const L = R.xEast - R.xWest, r = R.half, zc = R.zc ?? NJ.zc, zN = zc - r, zS = zc + r, arc = Math.PI * r, total = 2 * L + 2 * arc;
  // 0..L westbound along zN; then the west turn; then eastbound along zS; then the east turn
  function at(s, out) {
    s = ((s % total) + total) % total;
    if (s < L) { out.x = R.xEast - s; out.z = zN; out.yaw = -Math.PI / 2; }
    else if (s < L + arc) { const a = (s - L) / r; out.x = R.xWest - Math.sin(a) * r; out.z = zc - Math.cos(a) * r; out.yaw = -Math.PI / 2 + a; }
    else if (s < 2 * L + arc) { out.x = R.xWest + (s - L - arc); out.z = zS; out.yaw = Math.PI / 2; }
    else { const a = (s - 2 * L - arc) / r; out.x = R.xEast + Math.sin(a) * r; out.z = zc + Math.cos(a) * r; out.yaw = Math.PI / 2 + a; }
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
// the ticket kiosk's faces: front (toward the lane) with its service window, the fare board and the QR
// codes taped by the counter (everyone pays by phone); back and ends with the route and the green stripe
function kioskFaces() {
  const face = (w, h, draw) => { const [c, x] = makeCanvas(w, h); draw(x, w, h); return tex(c, { repeat: false, aniso: 4 }); };
  const base = (x, w, h) => {
    x.fillStyle = '#eceae4'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 64) { x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(i, 0, 2, h); }      // panel joints
    x.fillStyle = '#1f6e3a'; x.fillRect(0, h - 70, w, 70); x.fillStyle = '#c9a24a'; x.fillRect(0, h - 74, w, 4);   // the green skirt, a gilt line
  };
  const qr = (x, X, Y, s, seed) => { let r = seed; const rn = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    x.fillStyle = '#fff'; x.fillRect(X - 6, Y - 6, s + 12, s + 12); x.fillStyle = '#111'; const n = 21, k = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const fin = (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13);
      if (fin ? (i % 6 === 0 || j % 6 === 0 || (i % 14 > 1 && i % 14 < 5 && j % 14 > 1 && j % 14 < 5)) : rn() < 0.5) x.fillRect(X + i * k, Y + j * k, k + 0.5, k + 0.5); } };
  const front = face(512, 640, (x, w, h) => {
    base(x, w, h);
    x.fillStyle = '#0d1419'; x.fillRect(56, 120, 400, 250);                                              // the service window
    x.fillStyle = 'rgba(255,236,200,0.22)'; x.fillRect(70, 134, 372, 222);
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.moveTo(90, 134); x.lineTo(170, 134); x.lineTo(110, 356); x.lineTo(70, 356); x.fill();
    x.fillStyle = '#9aa0a6'; x.fillRect(40, 370, 432, 18);                                               // the counter
    x.fillStyle = '#c8102e'; x.fillRect(56, 20, 400, 84); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 44px ${FONT.sans}`; x.fillText('售票处', 256, 52); x.font = `600 18px ${FONT.sans}`; x.fillText('TICKETS', 256, 88);
    x.fillStyle = '#1c1c1c'; x.font = `700 30px ${FONT.sans}`; x.fillText('观光车 每位 5元', 256, 425);
    x.font = `500 18px ${FONT.sans}`; x.fillText('Sightseeing Tram  ¥5 per person', 256, 458);
    x.font = `500 17px ${FONT.sans}`; x.fillText('营业时间 08:30 – 22:00', 256, 490);
    qr(x, 60, 500, 54, 7); qr(x, 398, 500, 54, 11);
    x.fillStyle = '#1677ff'; x.fillRect(54, 494, 66, 4); x.fillStyle = '#07c160'; x.fillRect(392, 494, 66, 4);   // Alipay blue, WeChat green
  });
  const side = face(512, 640, (x, w, h) => {
    base(x, w, h);
    x.fillStyle = '#1c1c1c'; x.textAlign = 'center'; x.font = `700 28px ${FONT.sans}`; x.fillText('线路图  ROUTE', 256, 70);
    x.strokeStyle = '#1f6e3a'; x.lineWidth = 8; x.beginPath(); x.moveTo(60, 200); x.lineTo(452, 200); x.stroke();
    [['西藏中路', 60], ['世纪广场', 256], ['河南中路', 452]].forEach(([n, X]) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(X, 200, 14, 0, 7); x.fill(); x.strokeStyle = '#1f6e3a'; x.lineWidth = 5; x.stroke();
      x.fillStyle = '#1c1c1c'; x.font = `600 20px ${FONT.sans}`; x.fillText(n, X, 246); });
    x.font = `500 18px ${FONT.sans}`; x.fillStyle = '#444'; x.fillText('请勿在车道内停留  Please keep clear of the lane', 256, 330);
  });
  const glow = face(512, 640, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 512, 640); x.fillStyle = '#fff'; x.fillRect(70, 134, 372, 222); x.fillStyle = '#888'; x.fillRect(56, 20, 400, 84); });   // the lit window and the red header
  return { front, side, glow };
}
function locoParts() {
  const b = { body: new Batch(), trim: new Batch(), roof: new Batch(), frame: new Batch(), glass: new Batch(), lamp: new Batch(), tyre: new Batch(), sign: new Batch() };
  const { len, w, h } = LOCO, hl = len / 2;
  b.frame.box(0, 0.22, 0, w - 0.1, 0.16, len - 0.2);                                   // chassis
  b.body.box(0, 0.38, 0, w, 0.75, len);                                                // lower body
  b.trim.box(0, 0.26, 0, w + 0.02, 0.24, len + 0.02);                                  // the green skirt
  b.trim.box(0, 1.1, 0, w + 0.02, 0.06, len + 0.02);                                   // the waist rail
  // the cab: corner posts, glazing, a front with a big windscreen
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.body.box(sx * (w / 2 - 0.05), 1.13, sz * (hl - 0.05), 0.1, h - 1.13 - 0.18, 0.1);
  for (const sx of [-1, 1]) { b.glass.box(sx * (w / 2 - 0.02), 1.2, 0, 0.02, 0.95, len - 0.3); b.body.box(sx * (w / 2 - 0.03), 2.15, 0, 0.06, 0.22, len); }
  b.glass.box(0, 1.2, hl - 0.02, w - 0.2, 1.0, 0.02);                                  // windscreen
  b.body.box(0, 2.15, hl - 0.03, w, 0.22, 0.06);
  b.sign.add(new THREE.PlaneGeometry(w - 0.25, 0.2), { x: 0, y: 2.26, z: hl + 0.035 });          // the destination board
  // the roof: an arched clerestory, a lantern on top, the bell at the front
  b.roof.add(new THREE.CylinderGeometry(1.05, 1.05, len + 0.25, 16, 1, true, -0.82, 1.64).rotateX(-Math.PI / 2), { y: h - 0.95 });   // the arched roof
  b.roof.box(0, h - 0.24, 0, w + 0.16, 0.12, len + 0.26);
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
  b.roof.add(new THREE.CylinderGeometry(1.1, 1.1, len + 0.15, 16, 1, true, -0.82, 1.64).rotateX(-Math.PI / 2), { y: h - 0.95 });   // the arched canopy
  for (const sx of [-1, 1]) for (let z = -hl; z < hl; z += 0.4) b.roof.add(new THREE.CircleGeometry(0.2, 8, Math.PI, Math.PI).rotateY(sx * Math.PI / 2), { x: sx * (w / 2 + 0.11), y: h - 0.24, z: z + 0.2 });   // its scalloped valance
  b.roof.box(0, h - 0.24, 0, w + 0.22, 0.12, len + 0.16);
  b.trim.box(0, 0.26, 0, w + 0.02, 0.24, len + 0.02);                                  // the green skirt
  // benches facing forward, a back to each
  for (const z of [-1.35, -0.45, 0.45, 1.35]) { b.seat.box(0, 0.8, z, w - 0.2, 0.06, 0.42); b.seat.box(0, 0.86, z - 0.21, w - 0.2, 0.42, 0.05); b.frame.box(0, 0.44, z, 0.08, 0.36, 0.3); }
  b.frame.box(0, 0.3, hl + GAP / 2, 0.08, 0.06, GAP + 0.2);                            // the drawbar
  for (const sx of [-1, 1]) for (const z of [-hl + 0.65, hl - 0.65]) b.tyre.add(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12).rotateZ(Math.PI / 2), { x: sx * (w / 2 - 0.1), y: 0.24, z });
  for (const sx of [-1, 1]) b.lamp.box(sx * (w / 2 - 0.12), 0.55, -hl - 0.01, 0.12, 0.08, 0.02);   // tail lamps
  return b;
}

export function createTrams({ scene, people, audio, addCollider, rnd = Math.random, n = 2, route = TRAM_ROUTE, look = TRAM_LOOK }) {
  const P = makePath(route), group = new THREE.Group(); group.name = 'trams'; scene.add(group);
  let kioskGlow = null;                                   // the kiosk's window, lit while it's selling after dark
  const mats = {
    body: new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.42, metalness: 0.15 }),
    trim: new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.3, metalness: 0.85 }),
    roof: new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.6, side: THREE.DoubleSide }),
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
  // fleet numbers on the back of each train's last trailer
  const numMats = look.numbers.map((n) => { const [c, x] = makeCanvas(128, 96); x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 128, 96); x.fillStyle = '#1f6e3a'; x.fillRect(0, 70, 128, 26); x.fillStyle = '#1c1c1c'; x.font = `800 60px ${FONT.sans}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 64, 38); return new THREE.MeshStandardMaterial({ map: tex(c, { repeat: false }), roughness: 0.5 }); });
  trains.forEach((t, i) => { t.num = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), numMats[i % numMats.length]); group.add(t.num); });
  // ticket kiosks at the stops, on the 金带 beside the lane: a white booth with its window to the lane, a
  // fare board and pay-by-phone codes, a dark roof cap and the line's name on top
  { const kt = new Batch(), sign = new THREE.MeshBasicMaterial({ map: signTexture() }), F = kioskFaces();
    const fm = new THREE.MeshStandardMaterial({ map: F.front, roughness: 0.45, emissive: 0xffe6c0, emissiveIntensity: 0, emissiveMap: F.glow });
    const sm = new THREE.MeshStandardMaterial({ map: F.side, roughness: 0.45 }), plain = new THREE.MeshStandardMaterial({ color: 0xeceae4, roughness: 0.5 });
    kioskGlow = fm;
    for (const x of route.stops) {
      const kz = NJ.zc - 1.3 - 2.1 - 0.9;                                                 // (north of the 金带, clear of the crowd's middle walk)
      const booth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 1.3), [sm, sm, plain, plain, fm, sm]);   // +z (the lane side) is the front
      booth.position.set(x, 0.15 + 1.15, kz); booth.castShadow = booth.receiveShadow = true; group.add(booth);
      kt.box(x, 2.45, kz, 2.2, 0.16, 1.7); kt.box(x, 0.15, kz, 1.84, 0.08, 1.34);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), sign); pl.position.set(x, 2.78, kz); group.add(pl);
      const pl2 = pl.clone(); pl2.rotation.y = Math.PI; group.add(pl2);
      if (addCollider) { const b = addCollider('shop'); b.minX = x - 0.95; b.maxX = x + 0.95; b.minZ = kz - 0.7; b.maxZ = kz + 0.7; }
    }
    group.add(kt.mesh(new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.4, metalness: 0.6 }), 'tram-kiosk-trim')); }

  // ---- people aboard: a driver, and a few on the benches of each trailer (near you only) ----
  const SEATS = []; for (const z of [-1.35, -0.45, 0.45, 1.35]) for (const x of [-0.48, 0, 0.48]) SEATS.push({ x, z });
  const ROLES = ['p1', 'p2', 'p3', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'k1', 'k2'];
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), pole = new THREE.Vector3(), right = new THREE.Vector3();
  function board(t) {
    if (!people || t.driver) return;
    const mk = (role) => { const p = createPerson(people, role); p.root.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(p.root); p.play('idle', 0); return p; };
    t.driver = { p: mk('p4'), car: 0, seat: { x: 0, z: 0.55 }, drive: true };
    t.boarding = [];
    for (let c = 1; c <= nCars; c++) {
      const free = SEATS.slice(); const k = 2 + Math.floor(rnd() * 4);
      for (let j = 0; j < k; j++) { const seat = free.splice(Math.floor(rnd() * free.length), 1)[0]; t.boarding.push({ role: ROLES[Math.floor(rnd() * ROLES.length)], car: c, seat }); }
    }
    t.mk = mk;
  }
  function alight(t) {
    for (const r of [t.driver, ...t.riders]) if (r) { group.remove(r.p.root); r.p.root.traverse((o) => { if (o.isSkinnedMesh) o.skeleton.dispose(); }); }
    t.driver = null; t.riders = []; t.boarding = [];
  }
  // sit someone on a bench (world space, after their idle clip): pelvis on the seat, thighs forward,
  // feet on the floor, hands on the knees (or forward to the tiller, for the driver)
  function sit(r, carPos, dt, eye) {
    const p = r.p, root = p.root, c = Math.cos(carPos.yaw), s = Math.sin(carPos.yaw);
    fwd.set(s, 0, c); right.set(-c, 0, s);
    const seatY = (r.drive ? 0.95 : 0.86) + LAY.curbH, hip = v1.set(carPos.x + c * r.seat.x + s * r.seat.z, seatY, carPos.z - s * r.seat.x + c * r.seat.z);
    root.position.copy(hip); root.rotation.y = carPos.yaw;
    p.update(dt, r.drive ? null : (eye && Math.hypot(eye.x - hip.x, eye.z - hip.z) < 12 ? [eye.x, eye.z] : null));
    const B = r.B || (r.B = Object.fromEntries(['Pelvis', 'L_Thigh', 'L_Calf', 'L_Foot', 'R_Thigh', 'R_Calf', 'R_Foot', 'L_UpperArm', 'L_Forearm', 'L_Hand', 'R_UpperArm', 'R_Forearm', 'R_Hand'].map((nm) => [nm, root.getObjectByName(`Bip01_${nm}`)])));
    if (!B.Pelvis || !B.L_Thigh) return;
    root.updateMatrixWorld(true);
    const pw = B.Pelvis.getWorldPosition(v2);
    root.position.add(v2.set(hip.x - pw.x, hip.y + 0.06 - pw.y, hip.z - pw.z)); root.updateMatrixWorld(true);
    for (const [sd, k] of [['L', 1], ['R', -1]]) {
      const foot = v2.copy(hip).addScaledVector(fwd, 0.5).addScaledVector(right, -k * 0.12); foot.y = 0.5 + LAY.curbH;
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
  // ---- you, aboard: E at a stopped train to get on (a free seat in the nearest trailer), E to get off,
  // F to ride on to the next stop (main.js fades and moves the clock on) ----
  let rider = null, lastOpen = true;                      // { t, car, seat }; running now
  const seatWorld = (t, car, seat, out) => { const q = t.pos[car], c = Math.cos(q.yaw), s = Math.sin(q.yaw); out.x = q.x + c * seat.x + s * seat.z; out.z = q.z - s * seat.x + c * seat.z; out.yaw = q.yaw; return out; };
  const _sw = { x: 0, z: 0, yaw: 0 };
  function nearTrailer(pp) {
    let best = null;
    for (const t of trains) { if (t.v > 0.3) continue; for (let k = 1; k <= nCars; k++) { const q = t.pos[k], d = Math.hypot(pp.x - q.x, pp.z - q.z); if (d < 3.4 && (!best || d < best.d)) best = { t, k, d, q }; } }
    return best;
  }
  return {
    group, trains, path: P,
    get riding() { return !!rider; },
    // the interaction target (main.js places): a stopped train's trailer within reach
    candidates(pp) { if (rider || !pp || pp.y > 1.5 || !lastOpen) return []; const n = nearTrailer(pp); return n ? [{ id: 'tram', x: n.q.x, y: 1.2, z: n.q.z, reach: 3.6, cone: 0.45 }] : []; },
    board(pp) {
      const n = nearTrailer(pp); if (!n) return false;
      const taken = new Set(n.t.riders.filter((r) => r.car === n.k).map((r) => `${r.seat.x},${r.seat.z}`));
      const free = SEATS.filter((q) => !taken.has(`${q.x},${q.z}`)); if (!free.length) return false;
      let seat = free[0], bd = Infinity;
      for (const q of free) { seatWorld(n.t, n.k, q, _sw); const d = Math.hypot(_sw.x - pp.x, _sw.z - pp.z); if (d < bd) { bd = d; seat = q; } }
      rider = { t: n.t, car: n.k, seat }; bell(n.t, pp, 0.8);
      return true;
    },
    // the camera on your seat; your body goes with it (so the world knows where you are)
    seatCamera(camera, player) {
      if (!rider) return;
      seatWorld(rider.t, rider.car, rider.seat, _sw);
      camera.position.set(_sw.x, 0.86 + 0.78 + LAY.curbH, _sw.z); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
      player.body.x = _sw.x; player.body.z = _sw.z;
    },
    seatPrompt(lang = 'zh') {
      const t = rider && rider.t, west = t && t.pos[0].z < (route.zc ?? NJ.zc), stopped = t && t.v < 0.3;
      const zh = `观光车 · 往${west ? '西藏路' : '河南路'}`, en = `Sightseeing tram · to ${west ? 'Xizang Road' : 'Henan Road'}`;
      return { target: lang === 'zh' ? zh : en, action: lang === 'zh' ? (stopped ? '下车 (E) · 坐到下一站 (F)' : '坐到下一站 (F) · 停车后可下车') : (stopped ? 'Get off (E) · Ride to the next stop (F)' : 'Ride to the next stop (F) · get off when it stops') };
    },
    get canGetOff() { return !!rider && rider.t.v < 0.3; },
    // off at the kerb side of your car: returns where to stand
    getOff() {
      if (!rider) return null;
      const q = rider.t.pos[rider.car], c = Math.cos(q.yaw), s = Math.sin(q.yaw), side = -1;                 // (out to the right)
      const x = q.x + side * c * (CAR.w / 2 + 0.75), z = Math.min(NJ.z1 - 1, Math.max(NJ.z0 + 1, q.z - side * s * (CAR.w / 2 + 0.75)));
      rider = null; return { x, z, yaw: q.yaw };
    },
    // straight on to the next stop (for the fade): returns the seconds the ride would have taken
    rideToNextStop() {
      if (!rider) return 0;
      const t = rider.t, ahead = ((P.stopS[t.nextStop] - t.s) % P.total + P.total) % P.total;
      if (t.dwell > 0 || ahead < 1) { t.dwell = 0; t.nextStop = (t.nextStop + 1) % P.stopS.length; }
      t.atEnd = false;
      // not onto a stop the other train is at or pulling into
      for (let n = 0; n < P.stopS.length; n++) { const ss = P.stopS[t.nextStop]; if (!trains.some((o) => o !== t && Math.abs(((ss - o.s) % P.total + P.total) % P.total - P.total / 2) > P.total / 2 - 40)) break; t.nextStop = (t.nextStop + 1) % P.stopS.length; }
      const d = ((P.stopS[t.nextStop] - t.s) % P.total + P.total) % P.total;
      t.s = (P.stopS[t.nextStop] - 0.2 + P.total) % P.total; t.v = 0; t.dwell = route.dwell; t.pos.forEach((q, k) => P.at(t.s - offsets[k] + LOCO.len / 2, q));
      return d / route.cruise + route.dwell;
    },
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
    // ... and the minute of the day (they run 08:30 to 22:00; out of hours they wait at the ends)
    update(dt, player, agents, eye, minute = 720) {
      if (!dt) return;
      const open = minute >= route.open[0] && minute < route.open[1]; lastOpen = open;
      if (kioskGlow) kioskGlow.emissiveIntensity = open && (minute < 420 || minute > 1035) ? 0.45 : 0;
      // far from both: nothing to draw (the instanced meshes aren't frustum-culled)
      group.visible = !eye || trains.some((t) => Math.abs(eye.x - t.pos[0].x) < 260) || Math.abs(eye.z - NJ.zc) < 40 && eye.x < -480;
      for (const t of trains) {
        t.bellT = Math.max(0, t.bellT - dt);
        const head = t.pos[0], c = Math.cos(head.yaw), s = Math.sin(head.yaw);
        // who's in front: you stop it; people slow it (and get the bell)
        let block = Infinity, crowd = Infinity;
        const ahead = (x, z) => { const dx = x - head.x, dz = z - head.z, f = dx * s + dz * c, lat = Math.abs(dx * c - dz * s); return f > 0 && f < 6 && lat < 1.15 ? f : Infinity; };
        if (player && player.y < 1.5 && !(rider && rider.t === t)) block = ahead(player.x, player.z);
        if (agents && Math.abs(head.z - NJ.zc) < 14 && (!eye || Math.abs(eye.x - head.x) < 150)) for (const a of agents) { if (a.inside || a.gone || a.out) continue; const f = ahead(a.x, a.z); if (f < crowd) crowd = f; }
        // the stops
        if (t.dwell > 0) { if (open || !t.atEnd) t.dwell -= dt; t.want = 0; if (t.dwell <= 0) { bell(t, eye); t.nextStop = (t.nextStop + 1) % P.stopS.length; t.atEnd = false; } }
        else {
          const toStop = ((P.stopS[t.nextStop] - t.s) % P.total + P.total) % P.total;
          t.want = route.cruise;
          if (toStop < 6) t.want = Math.min(t.want, 0.25 + toStop * 0.25);
          if (toStop < 0.3) { t.dwell = route.dwell; t.v = 0; const sx = t.pos[0].x; t.atEnd = !open && (Math.abs(sx - route.stops[0]) < 3 || Math.abs(sx - route.stops[route.stops.length - 1]) < 3); }
        }
        for (const o of trains) if (o !== t) { const gap = ((o.s - offsets[offsets.length - 1] - CAR.len / 2 - t.s) % P.total + P.total) % P.total; if (gap < 8) t.want = 0; else if (gap < 20) t.want = Math.min(t.want, 0.6); }
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
        if (t.driver && t.boarding && t.boarding.length) { const b = t.boarding.shift(); t.riders.push({ p: t.mk(b.role), car: b.car, seat: b.seat }); }
        if (t.driver) { sit(t.driver, t.pos[0], dt, eye); for (const r of t.riders) sit(r, t.pos[r.car], dt, eye); }
      }
      // the instances
      trains.forEach((t, i) => t.pos.forEach((q, k) => {
        _q.setFromAxisAngle(up, q.yaw); _m.compose(_p.set(q.x, LAY.curbH + 0.01, q.z), _q, _s);
        if (k === 0) for (const im of locoIM) im.setMatrixAt(i, _m);
        else for (const im of carIM) im.setMatrixAt(i * nCars + k - 1, _m);
      }));
      for (const im of [...locoIM, ...carIM]) im.instanceMatrix.needsUpdate = true;
      for (const t of trains) { const q = t.pos[t.pos.length - 1], c = Math.cos(q.yaw), s = Math.sin(q.yaw), back = CAR.len / 2 + 0.05; t.num.position.set(q.x - s * back, 0.72 + LAY.curbH, q.z - c * back); t.num.rotation.y = q.yaw + Math.PI; }
    },
    get state() { return trains.map((t) => ({ x: +t.pos[0].x.toFixed(1), z: +t.pos[0].z.toFixed(1), v: +t.v.toFixed(2), dwell: +t.dwell.toFixed(1), riders: t.riders.length })); },
  };
}
