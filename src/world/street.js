// Street level: Zhongshan East 1st Road, Hankou Road and what stands on them.
import * as THREE from 'three';
import { L, roadLamps, ROAD_LAMP_WEST_OFFSET, taxi, sedan, bikes, stall, streetTrees, crossing } from './layout.js';
import { batchSet, flush, Batch } from './geo.js';
import { makeCanvas, tex, rng, FONT, glowTexture } from './canvas.js';
import { T } from './text.js';

const FAR = 430, S = L.street, CH = L.curbH;
const std = (o) => new THREE.MeshStandardMaterial(o);

function sign(w, h, draw, { emissive = 0.3, px = 256 } = {}) {
  const [c, ctx] = makeCanvas(Math.round(px * (w / h)), px);
  draw(ctx, c.width, c.height);
  const map = tex(c, { repeat: false });
  const mat = std({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: emissive, roughness: 0.6 });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}
function place(group, mesh, x, y, z, ry = 0) { mesh.position.set(x, y, z); mesh.rotation.y = ry; group.add(mesh); return mesh; }

function ground(B) {
  B.asphalt.floor(L.westCurbX, L.eastCurbX, -FAR, FAR, 0, 6);
  B.asphalt.floor(-200, L.westCurbX, -S.roadHalfW, S.roadHalfW, 0, 6);
  for (const s of [-1, 1]) {
    const zc = s * (FAR + S.roadHalfW) / 2, len = FAR - S.roadHalfW;
    B.sidewalk.box((L.facadeX + L.westCurbX) / 2, -0.3, zc, 6, 0.3 + CH, len, { tile: 2.4 });        // west sidewalk
    const sz = s * (S.halfW + S.roadHalfW) / 2;
    B.sidewalk.box((-200 + L.facadeX) / 2, -0.3, sz, 166, 0.3 + CH, S.halfW - S.roadHalfW, { tile: 2.4 }); // Hankou Rd sidewalks
    B.granite.box(L.westCurbX + 0.08, -0.3, zc, 0.16, 0.3 + CH + 0.005, len);                          // curb stones
    B.granite.box((-200 + L.westCurbX) / 2, -0.3, s * (S.roadHalfW + 0.08), 172, 0.3 + CH + 0.005, 0.16);
  }
  B.sidewalk.box((L.eastCurbX + L.wallX) / 2, -0.3, 0, 6, 0.3 + CH, FAR * 2, { tile: 2.4 });           // east sidewalk
  B.granite.box(L.eastCurbX - 0.08, -0.3, 0, 0.16, 0.3 + CH + 0.005, FAR * 2);

  // markings: six lanes, double yellow, zebra at the foot of the stair
  const y = 0.012, xs = [-23.2, -19.6, -12.4, -8.8];
  for (const s of [-1, 1]) {
    B.paintYellow.floor(-16 + s * 0.2 - 0.075, -16 + s * 0.2 + 0.075, -FAR, -6.5, y);
    B.paintYellow.floor(-16 + s * 0.2 - 0.075, -16 + s * 0.2 + 0.075, 6.5, FAR, y);
  }
  for (const x of xs) for (let z = -FAR; z < FAR; z += 10) {
    if (Math.abs(z + 2) < 9) continue;
    B.paint.floor(x - 0.075, x + 0.075, z, z + 4, y);
  }
  for (let x = -27.3; x < -4.6; x += 0.9) B.paint.floor(x, x + 0.45, -3.2, 3.2, y);                    // zebra
  // stop lines, right-hand traffic: southbound (west half) stops north of the zebra, northbound south of it
  B.paint.floor(-27.3, -16.4, -5.6, -5.2, y); B.paint.floor(-15.6, -4.7, 5.2, 5.6, y);
  for (let z = -3.4; z < 3.2; z += 0.9) B.paint.floor(-33.4, -30.2, z, z + 0.45, y);                   // zebra across Hankou Rd
  // manholes
  for (const [x, z] of [[-20, 9], [-10.5, -22], [-62, 1.2], [-44, -1.5], [-14, 48]]) B.iron.cyl(x, 0.002, z, 0.36, 0.36, 0.012, 20);
}

function roadLamp(B, x, z, armDir) {
  B.granite.box(x, CH, z, 0.5, 0.45, 0.5);
  B.iron.cyl(x, CH + 0.45, z, 0.085, 0.14, 8.2, 10);
  B.iron.cyl(x, CH + 2.6, z, 0.17, 0.17, 0.12, 10);
  for (const s of [-1, 1]) {
    B.iron.box(x + s * 0.85, CH + 8.3, z, 1.7, 0.07, 0.07);
    const arc = new THREE.TorusGeometry(0.5, 0.025, 6, 10, Math.PI / 2);
    B.iron.add(arc, { x: x + s * 0.35, y: CH + 7.8, z, ry: s > 0 ? 0 : Math.PI });
    B.iron.cyl(x + s * 1.6, CH + 7.98, z, 0.16, 0.2, 0.3, 10);
    B.lampGlass.add(new THREE.SphereGeometry(0.26, 12, 8), { x: x + s * 1.6, y: CH + 7.82, z });
  }
  B.lampGlass.add(new THREE.SphereGeometry(0.2, 10, 8), { x, y: CH + 8.85, z });
}

function car(group, { x, z, yaw }, paint, isTaxi) {
  const { g } = buildCar(paint, isTaxi);
  g.position.set(x, x < L.eastCurbX ? 0 : CH, z); g.rotation.y = yaw;
  group.add(g);
}

// The street's generic car (Shanghai taxi / dark sedan). `moving` keeps the wheels as separate
// meshes (so traffic can spin them) and gives this car its own tail-lamp material (brake lights).
export function buildCar(paint, isTaxi, { moving = false, wheelMesh = null } = {}) {
  const g = new THREE.Group();
  const prof = (pts, depth) => {
    const sh = new THREE.Shape(); pts.forEach(([a, b], i) => (i ? sh.lineTo(a, b) : sh.moveTo(a, b)));
    const e = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
    e.translate(0, 0, -depth / 2); e.rotateY(-Math.PI / 2);   // profile runs along z, extruded across x
    return e;
  };
  const body = prof([[-2.25, 0.3], [-2.3, 0.72], [-2.0, 0.93], [-1.3, 0.97], [1.15, 0.97], [1.95, 0.82], [2.3, 0.62], [2.28, 0.3]], 1.68);
  const cabin = prof([[-1.45, 0.95], [-0.95, 1.43], [0.45, 1.43], [1.2, 0.95]], 1.5);
  const glass = prof([[-1.36, 0.98], [-0.93, 1.38], [0.42, 1.38], [1.1, 0.98]], 1.585);
  const bodyMat = std({ color: paint, roughness: 0.28, metalness: 0.55 });
  const glassMat = std({ color: 0x06090d, roughness: 0.06, metalness: 0.9 });
  g.add(new THREE.Mesh(body, bodyMat), new THREE.Mesh(cabin, bodyMat), new THREE.Mesh(glass, glassMat));
  const parts = batchSet(['rubber', 'steel', 'tail', 'head']);
  const wheels = [];
  for (const sx of [-1, 1]) for (const sz of [-1.42, 1.4]) {
    if (moving && wheelMesh) {
      const w = wheelMesh(); w.position.set(sx * 0.8, 0.33, sz); w.rotation.y = sx < 0 ? Math.PI : 0; g.add(w); wheels.push(w);
    } else {
      const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18); w.rotateZ(Math.PI / 2);
      parts.rubber.add(w, { x: sx * 0.8, y: 0.33, z: sz });
      const h = new THREE.CylinderGeometry(0.19, 0.19, 0.25, 12); h.rotateZ(Math.PI / 2);
      parts.steel.add(h, { x: sx * 0.81, y: 0.33, z: sz });
    }
    parts.tail.box(sx * 0.62, 0.68, -2.33, 0.36, 0.14, 0.06);
    parts.head.box(sx * 0.62, 0.62, 2.31, 0.4, 0.13, 0.06);
  }
  parts.rubber.box(0, 0.28, 0, 1.7, 0.14, 4.3);
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.04, 0.03) });
  flush(parts, {
    rubber: std({ color: 0x0a0a0b, roughness: 0.85 }), steel: std({ color: 0x8a8f95, roughness: 0.35, metalness: 0.9 }),
    tail: tailMat,
    head: std({ color: 0xcfd6dc, roughness: 0.15, metalness: 0.6 }),
  }, g);
  if (isTaxi) {
    const roof = sign(0.62, 0.2, (c, w, h) => {
      c.fillStyle = '#fff6d8'; c.fillRect(0, 0, w, h); c.fillStyle = '#0c5c5c';
      c.font = `700 ${h * 0.62}px ${FONT.sans}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${T.taxi} TAXI`, w / 2, h * 0.54);
    }, { emissive: 1.6, px: 128 });
    const back = roof.clone(); back.rotation.y = Math.PI;
    roof.position.set(0, 1.56, -0.19); back.position.set(0, 1.56, -0.21);
    const hire = sign(0.26, 0.11, (c, w, h) => {
      c.fillStyle = '#120000'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3a2a';
      c.font = `700 ${h * 0.8}px ${FONT.sans}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T.forHire, w / 2, h * 0.55);
    }, { emissive: 2.2, px: 64 });
    hire.position.set(0.45, 1.12, 0.95); hire.rotation.x = -1.0;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.03), std({ color: 0x222222 })); box.position.set(0, 1.56, -0.2);
    g.add(roof, back, hire, box);
  }
  return { g, wheels, tailMat, wheelRadius: 0.33 };
}

function bike(Bf, Bd, x, z, lean, ry) {
  // one shared bike, built around the origin then leaned and placed
  const f = new Batch(), d = new Batch();
  const tube = (b, ax, ay, bx, by, r = 0.022, zz = 0) => {
    const len = Math.hypot(bx - ax, by - ay), g = new THREE.CylinderGeometry(r, r, len, 6);
    g.rotateZ(Math.atan2(by - ay, bx - ax) - Math.PI / 2);
    b.add(g, { x: (ax + bx) / 2, y: (ay + by) / 2, z: zz });
  };
  for (const wx of [-0.52, 0.52]) {
    d.add(new THREE.TorusGeometry(0.31, 0.024, 6, 20), { x: wx, y: 0.33 });
    d.add(new THREE.TorusGeometry(0.06, 0.02, 4, 8), { x: wx, y: 0.33 });
    const fender = new THREE.TorusGeometry(0.35, 0.018, 4, 10, Math.PI * 0.8); fender.rotateZ(0.3);
    f.add(fender, { x: wx, y: 0.33, sz: 2.4 });
  }
  tube(f, -0.52, 0.33, -0.2, 0.36); tube(f, -0.2, 0.36, -0.28, 0.84, 0.026); tube(f, -0.2, 0.36, 0.38, 0.78, 0.034);
  tube(f, 0.52, 0.33, 0.36, 0.98, 0.024); tube(f, -0.52, 0.33, -0.27, 0.74);
  d.box(-0.3, 0.84, 0, 0.26, 0.06, 0.14); d.box(0.34, 0.98, 0, 0.04, 0.04, 0.52);
  f.box(0.56, 0.72, 0, 0.26, 0.2, 0.32);                                              // basket
  d.box(-0.05, 0.02, 0.12, 0.03, 0.3, 0.03);                                          // kickstand
  const opts = { x, y: CH, z, rx: lean, ry };
  Bf.add(f.geometry(), opts); Bd.add(d.geometry(), opts);
}

function barrierRow(B, x0, x1, y, z) {
  // steel crowd barriers, the kind that appear overnight before a holiday
  for (let x = x0; x + 2 <= x1 + 0.01; x += 2.08) {
    const cx = x + 1;
    B.steel.box(cx, y + 1.06, z, 2.0, 0.04, 0.04); B.steel.box(cx, y + 0.2, z, 2.0, 0.04, 0.04);
    for (const s of [-1, 1]) { B.steel.box(cx + s * 0.98, y, z, 0.04, 1.1, 0.04); B.steel.box(cx + s * 0.8, y, z, 0.05, 0.03, 0.6); }
    for (let k = 1; k < 12; k++) B.steel.box(cx - 0.98 + k * 0.163, y + 0.22, z, 0.02, 0.84, 0.02);
  }
}

export function createStreet(M) {
  const group = new THREE.Group(); group.name = 'street';
  const B = batchSet(['asphalt', 'sidewalk', 'granite', 'paint', 'paintYellow', 'iron', 'lampGlass', 'steel', 'wood',
    'hoarding', 'red', 'white', 'bikeY', 'bikeB', 'rubber', 'bark', 'leafAutumn', 'leafLitter', 'canvas', 'glassDark2', 'shutter']);
  ground(B);
  for (const z of roadLamps) { roadLamp(B, L.eastCurbX + 0.5, z); roadLamp(B, L.westCurbX - 0.5, z + ROAD_LAMP_WEST_OFFSET); }

  // ---- boundaries you can read at a glance ----
  const controlSign = () => sign(1.5, 0.6, (c, w, h) => {
    c.fillStyle = '#12449a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 ${h * 0.36}px ${FONT.sans}`; c.fillText(T.control, w / 2, h * 0.33);
    c.font = `700 ${h * 0.15}px ${FONT.sans}`; c.fillText(T.controlSub, w / 2, h * 0.63);
    c.font = `700 ${h * 0.12}px ${FONT.sans}`; c.fillText(T.controlEn, w / 2, h * 0.83);
  }, { emissive: 0.35 });
  for (const [z, face] of [[L.zNorth, 0], [L.zSouth, Math.PI]]) {
    const zz = z + (face ? 0.5 : -0.5), out = face ? 1 : -1;
    // the closure keeps the pavements and curb lanes; the inner through lanes stay open for traffic
    const ol = crossing.openLanes;
    barrierRow(B, L.facadeX, L.westCurbX - 0.1, CH, zz);
    barrierRow(B, L.westCurbX + 0.1, ol.x0 - 0.1, 0, zz); barrierRow(B, ol.x1 + 0.1, L.eastCurbX - 0.1, 0, zz);
    barrierRow(B, L.eastCurbX, L.wallX - 0.4, CH, zz); barrierRow(B, 4.1, L.deckEdgeX - 0.1, L.deckY, zz);
    for (let x = -26; x < -5; x += 3.2) {                           // water-filled barriers behind, on the carriageway
      if (x + 0.75 > ol.x0 && x - 0.75 < ol.x1) continue;
      const m = (Math.round(x) % 2 ? B.red : B.white);
      m.box(x, 0, zz + out * 1.6, 1.5, 0.8, 0.5); m.box(x, 0.8, zz + out * 1.6, 1.2, 0.12, 0.3);
    }
    for (const x of [-25.6, -6.4, 9.5, 20]) place(group, controlSign(), x, (x > 0 ? L.deckY : 0) + 0.66, zz - out * 0.035, face);
    place(group, controlSign(), -31, CH + 0.66, zz - out * 0.035, face);
  }
  // Hankou Road ends at a construction hoarding
  const hx = S.xEnd - 0.5;
  B.hoarding.box(hx, 0, 0, 0.12, 2.5, S.halfW * 2);
  for (let z = -S.halfW; z <= S.halfW; z += 1.85) B.steel.box(hx + 0.08, 0, z, 0.06, 2.6, 0.06);
  B.paintYellow.box(hx + 0.07, 2.3, 0, 0.02, 0.2, S.halfW * 2);
  place(group, sign(7.2, 1.25, (c, w, h) => {
    c.fillStyle = '#1b4c9c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 ${h * 0.5}px ${FONT.sans}`; c.fillText(T.hoarding, w / 2, h * 0.5);
  }, { emissive: 0.18 }), hx + 0.075, 1.45, 0, Math.PI / 2);
  place(group, sign(1.5, 1.0, (c, w, h) => {
    c.fillStyle = '#f2c81a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#111'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 ${h * 0.2}px ${FONT.sans}`; T.hoardingSub.split('　').forEach((s, i) => c.fillText(s, w / 2, h * (0.3 + i * 0.26)));
    c.font = `700 ${h * 0.085}px ${FONT.sans}`; c.fillText(T.hoardingEn, w / 2, h * 0.82);
  }, { emissive: 0.3 }), hx + 0.6, 1.3, -5.0, Math.PI / 2);
  B.steel.box(hx + 0.58, 0, -5.0, 0.04, 0.8, 1.0);
  // amber beacons on the hoarding (they blink)
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff8a00 });
  const beacons = new Batch();
  for (const z of [-4.6, 4.6]) { beacons.add(new THREE.SphereGeometry(0.09, 10, 8), { x: hx + 0.08, y: 2.72, z }); B.steel.cyl(hx + 0.08, 2.5, z, 0.05, 0.06, 0.16, 8); }
  group.add(beacons.mesh(beaconMat, 'beacons'));

  // ---- street name plates at the corner ----
  const plate = (zh, en, l, r) => sign(1.5, 0.42, (c, w, h) => {
    c.fillStyle = '#123f9a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 5; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `700 ${h * 0.44}px ${FONT.sans}`; c.fillText(zh, w / 2, h * 0.38);
    c.font = `700 ${h * 0.19}px ${FONT.sans}`; c.fillText(en, w / 2, h * 0.77);
    c.font = `700 ${h * 0.3}px ${FONT.sans}`; c.fillText(l, h * 0.42, h * 0.5); c.fillText(r, w - h * 0.42, h * 0.5);
  }, { emissive: 0.4 });
  const px = L.facadeX + 0.9, pz = -S.halfW + 0.7;
  B.steel.cyl(px, CH, pz, 0.04, 0.04, 3.1, 8);
  place(group, plate(T.hankou, T.hankouEn, T.west, T.east), px, 2.95, pz + 0.06, 0);
  place(group, plate(T.hankou, T.hankouEn, T.east, T.west), px, 2.95, pz - 0.06, Math.PI);
  place(group, plate(T.zhongshan, T.zhongshanEn, T.south, T.north), px + 0.06, 2.45, pz, Math.PI / 2);
  place(group, plate(T.zhongshan, T.zhongshanEn, T.north, T.south), px - 0.06, 2.45, pz, -Math.PI / 2);

  // ---- parked vehicles ----
  car(group, taxi, 0x0c8f8a, true);
  car(group, sedan, 0x101216, false);
  for (let i = 0; i < bikes.n; i++) {
    if (i === 3) continue;                                                       // one bike is out on a ride
    bike(i % 3 === 1 ? B.bikeB : B.bikeY, B.rubber, bikes.x, bikes.z0 + i * bikes.gap, 0.14, 0.12 * Math.sin(i * 2.3));
  }

  // ---- Hankou Road, north side: the sundries shop, shuttered fronts, and Old Zhou's stall ----
  const wz = -S.halfW + 0.02;
  const shopGlass = sign(4.6, 2.5, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff1c8'); g.addColorStop(1, '#e2b877');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let row = 0; row < 4; row++) {                                          // shelves of bottles, cartons, instant noodles
      const y = h * (0.2 + row * 0.19);
      c.fillStyle = '#4a3320'; c.fillRect(w * 0.03, y, w * 0.6, 6);
      for (let x = w * 0.04; x < w * 0.62; x += 10 + r() * 10) {
        const bh = 14 + r() * 26; c.fillStyle = `hsl(${Math.floor(r() * 360)},${40 + r() * 40}%,${30 + r() * 30}%)`;
        c.fillRect(x, y - bh, 8 + r() * 7, bh);
      }
    }
    c.fillStyle = '#3a2a1c'; c.fillRect(0, h * 0.8, w * 0.64, h * 0.2);          // counter
    c.fillStyle = '#20150e'; c.fillRect(w * 0.64, 0, 10, h); c.fillRect(0, 0, w, 8); c.fillRect(w * 0.31, 0, 6, h * 0.8);
    c.fillStyle = 'rgba(40,24,10,0.55)'; c.fillRect(w * 0.66, h * 0.08, w * 0.32, h * 0.92);   // door, ajar and dim
    c.fillStyle = '#d33'; c.font = `700 ${h * 0.07}px ${FONT.sans}`; c.fillText(T.shopOpen, w * 0.72, h * 0.3);
  }, { emissive: 0.9 });
  place(group, shopGlass, -69.2, CH + 1.35, wz + 0.02, 0);
  place(group, sign(4.8, 0.8, (c, w, h) => {
    c.fillStyle = '#5a1512'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffe9b0'; c.textBaseline = 'middle';
    c.font = `900 ${h * 0.56}px ${FONT.serif}`; c.textAlign = 'left'; c.fillText(T.shop, w * 0.04, h * 0.52);
    c.font = `700 ${h * 0.22}px ${FONT.sans}`; c.textAlign = 'right'; c.fillText(T.shopSub, w * 0.97, h * 0.55);
  }, { emissive: 0.75 }), -69.2, CH + 3.15, wz + 0.1, 0);
  B.wood.box(-69.2, CH + 3.6, wz + 0.5, 5.0, 0.06, 1.0);                         // canopy
  B.shutter.box(-86.2, CH, wz + 0.02, 4.4, 2.9, 0.06);                         // (-77.3 is Manner's front now: shops.js)
  B.shutter.box(-60.6, CH, wz + 0.02, 2.2, 2.4, 0.05);
  // crates and a stool outside the shop
  B.red.box(-72.4, CH, wz + 0.5, 0.5, 0.32, 0.36); B.red.box(-72.4, CH + 0.32, wz + 0.5, 0.5, 0.32, 0.36); B.wood.box(-66.2, CH, wz + 0.55, 0.32, 0.42, 0.32);

  // Zhou's watch-repair stall: a locked cabinet, a folded umbrella, a hand-painted board
  const sx = stall.x, sz = stall.z;
  B.wood.box(sx, CH, sz, 1.5, 0.82, 0.62);
  B.glassDark2.box(sx, CH + 0.82, sz, 1.46, 0.2, 0.58);
  B.wood.box(sx, CH + 1.02, sz, 1.5, 0.03, 0.62);
  B.steel.box(sx, CH + 0.45, sz + 0.32, 0.07, 0.09, 0.03);                        // padlock
  B.wood.box(sx + 1.0, CH, sz + 0.05, 0.3, 0.44, 0.3);                           // his stool, tucked in
  B.canvas.cyl(sx - 0.86, CH, sz - 0.2, 0.07, 0.11, 2.2, 8);                     // umbrella, tied shut
  B.iron.cyl(sx - 0.86, CH, sz - 0.2, 0.2, 0.24, 0.1, 10);
  place(group, sign(1.5, 0.62, (c, w, h) => {
    c.fillStyle = '#e9dfc6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a1d18'; c.lineWidth = 6; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#7a1d18'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${h * 0.46}px ${FONT.hand}`; c.fillText(T.stall, w / 2, h * 0.36);
    c.fillStyle = '#2a2420'; c.font = `700 ${h * 0.15}px ${FONT.sans}`; c.fillText(T.stallSub, w / 2, h * 0.76);
  }, { emissive: 0.5 }), sx, CH + 2.25, wz + 0.03, 0);
  place(group, sign(0.3, 0.21, (c, w, h) => {
    c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#1c1c1c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${h * 0.42}px ${FONT.hand}`; c.fillText(T.stallClosed, w / 2, h * 0.52);
  }, { emissive: 0.45, px: 128 }), sx - 0.2, CH + 0.52, sz + 0.322, 0);

  // his wall clock, stopped
  place(group, sign(0.46, 0.46, (c, w, h) => {
    c.fillStyle = '#2b2118'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#efe6d0'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.43, 0, 7); c.fill();
    c.fillStyle = '#1b1b1b';
    for (let i = 0; i < 12; i++) { c.save(); c.translate(w / 2, h / 2); c.rotate((i / 12) * Math.PI * 2); c.fillRect(-2, -w * 0.4, 4, i % 3 ? 10 : 22); c.restore(); }
    const hand = (a, len, t) => { c.save(); c.translate(w / 2, h / 2); c.rotate(a); c.fillRect(-t / 2, -len, t, len + 8); c.restore(); };
    hand(((6 + 10 / 60) / 12) * Math.PI * 2, w * 0.22, 8); hand((10 / 60) * Math.PI * 2, w * 0.34, 5);
  }, { emissive: 0.4, px: 128 }), sx + 1.25, CH + 2.3, wz + 0.04, 0);

  // wall lanterns, and the warm patches they throw on the masonry
  const lanterns = [{ x: sx - 1.7, y: 3.7, z: wz, n: 1 }, { x: -44, y: 4.2, z: S.halfW - 0.02, n: -1 }, { x: -78, y: 4.2, z: S.halfW - 0.02, n: -1 }];
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(128, [[0, 0.9], [0.3, 0.42], [0.7, 0.08], [1, 0]]), color: new THREE.Color(1.0, 0.6, 0.28).multiplyScalar(0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const l of lanterns) {
    B.iron.box(l.x, l.y, l.z + l.n * 0.2, 0.06, 0.06, 0.4); B.iron.box(l.x, l.y - 0.42, l.z + l.n * 0.4, 0.22, 0.04, 0.22);
    B.lampGlass.box(l.x, l.y - 0.38, l.z + l.n * 0.4, 0.17, 0.3, 0.17); B.iron.box(l.x, l.y - 0.07, l.z + l.n * 0.4, 0.26, 0.06, 0.26);
    const gq = new THREE.Mesh(new THREE.PlaneGeometry(6, 5.6), glowMat);
    place(group, gq, l.x, l.y - 0.9, l.z + l.n * 0.03, l.n > 0 ? 0 : Math.PI);
  }
  const shopSpill = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4), glowMat);
  shopSpill.rotation.x = -Math.PI / 2; shopSpill.position.set(-69.2, CH + 0.02, wz + 1.6); group.add(shopSpill);

  // plane trees in their November yellow, and what they've dropped
  const lr = rng(404);
  streetTrees.forEach((t, i) => {
    // (the tree itself comes from trees.js)
    B.iron.box(t.x, CH, t.z, 1.2, 0.012, 1.2);
    for (let k = 0; k < 70; k++) {
      const a = lr() * 6.283, d = 0.4 + lr() * lr() * 6, lx = t.x + Math.cos(a) * d, lz = t.z + Math.sin(a) * d * 0.7;
      if (Math.abs(lz) > S.halfW - 0.1) continue;
      const y = (Math.abs(lz) > S.roadHalfW ? CH : 0) + 0.014, s = 0.07 + lr() * 0.06;
      const g = new THREE.CircleGeometry(s, 5); g.rotateX(-Math.PI / 2); g.rotateY(lr() * 6.283);
      B.leafLitter.add(g, { x: lx, y, z: lz, sx: 1.5 });
    }
  });

  const shutterTex = (() => {
    const [c, ctx] = makeCanvas(64, 256);
    for (let y = 0; y < 256; y += 8) { const g = ctx.createLinearGradient(0, y, 0, y + 8); g.addColorStop(0, '#8b9094'); g.addColorStop(1, '#3f4447'); ctx.fillStyle = g; ctx.fillRect(0, y, 64, 8); }
    return tex(c);
  })();
  flush(B, {
    ...M, hoarding: std({ color: 0x1b4c9c, roughness: 0.45, metalness: 0.3 }),
    red: std({ color: 0xb3261c, roughness: 0.5 }), white: std({ color: 0xcfcfc8, roughness: 0.5 }),
    bikeY: std({ color: 0xe9bd12, roughness: 0.4, metalness: 0.2 }), bikeB: std({ color: 0x1778d6, roughness: 0.4, metalness: 0.2 }),
    bark: std({ color: 0x77705e, roughness: 0.9 }), leafAutumn: std({ color: 0xa88a2c, roughness: 0.8, emissive: 0x2a1d06 }),
    leafLitter: std({ color: 0x9a7a1e, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    canvas: std({ color: 0x24406a, roughness: 0.9 }), glassDark2: std({ color: 0x0b1014, roughness: 0.08, metalness: 0.8 }),
    shutter: std({ map: shutterTex, roughness: 0.5, metalness: 0.5 }),
  }, group, 'street-');

  return {
    group, lanterns,
    update(t) { const k = Math.sin(t * 5) > 0.2 ? 3 : 0.25; beaconMat.color.setRGB(k, k * 0.45, 0); },
  };
}
