// The inside of a ride-hail EV, fitted to the car it's in (carModels.js curves: where the windscreen
// starts, the beltline, the roof over each row, the width), seen from the rear right seat.
// The car's own body stays visible around it (its glass made see-through), so pillars, doors, the
// roofline and the bonnet through the windscreen are the real car's; this adds what's inside:
//   - contoured seats in light Nappa leather (side bolsters, piping, headrests on posts), a rear bench
//   - a sculpted dashboard, a slim driver display, a big centre screen with the route on it
//   - a three-spoke wheel on its column, rear-view mirror, sun visors
//   - door cards with armrests, pulls and handles; a centre console with a cup in the holder
//   - a soft ambient strip along the doors and dash; headliner; carpet
//   - light from the street lamps sweeping through as you pass each one (cabin.update)
// Frame: +z forward, +x to the driver's side (left), y up from the road; the car's centre at 0.
// No brand marks anywhere.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CARS } from './carModels.js';
import { cup } from './cups.js';
import { roadLamps, ROAD_LAMP_WEST_OFFSET, L } from './layout.js';

// textures shared by every cabin (loaded once)
let leatherTex = null;
function leather() {
  if (leatherTex) return leatherTex;
  const ld = new THREE.TextureLoader(), set = (t, srgb, rep) => { t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t; };
  leatherTex = {
    map: set(ld.load('./textures/leather_white_diff_1k.jpg'), true, 2.5),
    normal: set(ld.load('./textures/leather_white_nor_gl_1k.jpg'), false, 2.5),
    rough: set(ld.load('./textures/leather_white_rough_1k.jpg'), false, 2.5),
  };
  return leatherTex;
}

// the route on the centre screen (dark map, the river, roads, a blue route and you)
function navCanvas() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 384;
  const x = c.getContext('2d');
  return { c, x, draw(p) {
    x.fillStyle = '#10161f'; x.fillRect(0, 0, 640, 384);
    x.save(); x.translate(320, 250); x.rotate(-0.18); x.translate(-320, -250 + p * 220);
    x.fillStyle = '#1c3550'; x.beginPath(); x.moveTo(470, -400); x.bezierCurveTo(520, 0, 430, 300, 520, 700); x.lineTo(640, 700); x.lineTo(640, -400); x.fill();   // the Huangpu
    x.strokeStyle = '#26303d'; x.lineWidth = 9;
    for (let i = -6; i < 10; i++) { x.beginPath(); x.moveTo(0, i * 70); x.lineTo(460, i * 70 + 30); x.stroke(); }
    x.strokeStyle = '#2f3b4a'; x.lineWidth = 16; x.beginPath(); x.moveTo(400, -400); x.lineTo(410, 700); x.stroke();   // Zhongshan Road
    x.strokeStyle = '#2f8cff'; x.lineWidth = 12; x.lineCap = 'round'; x.beginPath(); x.moveTo(405, 600); x.lineTo(402, 60); x.bezierCurveTo(400, -40, 380, -120, 300, -220); x.stroke();
    x.restore();
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(320, 230); x.lineTo(306, 262); x.lineTo(320, 254); x.lineTo(334, 262); x.closePath(); x.fill();   // you
    x.fillStyle = 'rgba(20,26,36,0.92)'; x.fillRect(18, 18, 220, 74); x.fillStyle = '#e8eef6'; x.font = '600 30px sans-serif'; x.fillText('300 m', 34, 58);
    x.fillStyle = '#8fa1b5'; x.font = '500 18px sans-serif'; x.fillText('↰', 150, 58); x.fillText(`${Math.max(1, Math.round(16 - p * 6))} min · ${(4.8 - p * 1.6).toFixed(1)} km`, 34, 84);
  } };
}

export function makeCabin(model) {
  const M = CARS[model] || CARS['nio-et5'], Lc = M.length, zAt = (t) => -Lc / 2 + t * Lc, tAt = (z) => (z + Lc / 2) / Lc;
  const g = new THREE.Group(); g.name = 'cabin';
  const T = leather();
  // ---- materials ----
  const cream = new THREE.MeshStandardMaterial({ color: 0xcfc2ab, map: T.map, normalMap: T.normal, roughnessMap: T.rough, roughness: 0.9, normalScale: new THREE.Vector2(0.6, 0.6) });
  const creamPiping = new THREE.MeshStandardMaterial({ color: 0x8c7d68, roughness: 0.6 });
  const soft = new THREE.MeshStandardMaterial({ color: 0x2b2c30, map: T.map, normalMap: T.normal, roughness: 0.78, normalScale: new THREE.Vector2(0.35, 0.35) });   // dark soft-touch
  const piano = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.1, metalness: 0.2, envMapIntensity: 1.2 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xbfc3c9, roughness: 0.32, metalness: 1 });
  const head = new THREE.MeshStandardMaterial({ color: 0x77736c, roughness: 0.97 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 1 });
  const mirror = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.02, metalness: 1, envMapIntensity: 1.6 });
  const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.62, 0.26) });
  const lit = [cream, creamPiping, soft, head, carpet];          // these pick up the street lamps going by
  for (const m of lit) { m.emissive = new THREE.Color(0, 0, 0); m.userData.base = m.color.clone(); }

  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const rbox = (w, h, d, r, mat, x, y, z, rx = 0, ry = 0, rz = 0) => add(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), mat, x, y, z, rx, ry, rz);
  // a strut between two points (pillars, posts)
  const strut = (a, b, w, d, mat) => { const v = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new RoundedBoxGeometry(w, v.length(), d, 2, Math.min(w, d) / 2 - 0.001), mat); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(m); return m; };

  // ---- where things go, from the body curves ----
  const zA = zAt(M.tA), beltA = M.belt(M.tA);
  const floorY = M.sill(0.5) + 0.13, hipY = floorY + 0.3;
  const zH = zA - 0.78, zR = zH - 0.3 * M.wheelbase;                      // front and rear hip points
  const hw = (t) => M.halfWidth(t) - M.tumble(t) * 0.25 - 0.1;            // inner half-width at the beltline
  const roofAt = (z) => M.roof(Math.min(M.tA - 0.02, Math.max(M.tC + 0.02, tAt(z))));
  const xD = 0.37 * (hw(tAt(zH)) / 0.78), xP = -xD;                       // driver / passenger seat centres
  const eye = new THREE.Vector3(-0.31, Math.min(hipY + 0.64, roofAt(zR) - 0.15), zR - 0.02);   // sat back, a little low (fastback headroom)

  // ---- floor, headliner ----
  add(new THREE.PlaneGeometry(2 * hw(0.4), zA - zR + 0.8).rotateX(-Math.PI / 2), carpet, 0, floorY, (zA + zR) / 2 - 0.2);
  {
    const N = 14, pos = [], idx = [], z0 = zR - 0.55, z1 = zA - 0.25;
    for (let i = 0; i <= N; i++) {
      const z = z0 + (z1 - z0) * (i / N), y = roofAt(z) - 0.035, h = hw(tAt(z)) + 0.04;
      for (const [xx, dy] of [[-h, -0.06], [-h * 0.6, -0.008], [0, 0], [h * 0.6, -0.008], [h, -0.06]]) pos.push(xx, y + dy, z);
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < 4; j++) { const a = i * 5 + j, b = a + 5; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const liner = new THREE.Mesh(geo, head); liner.material.side = THREE.DoubleSide; g.add(liner);
  }
  // pillars (trimmed in headliner fabric) and the window-sill trim
  for (const s of [-1, 1]) {
    const tTop = M.tA - 0.07;
    strut(new THREE.Vector3(s * (hw(M.tA) - 0.02), beltA, zA - 0.02), new THREE.Vector3(s * (hw(tTop) - 0.02), roofAt(zAt(tTop)) - 0.04, zAt(tTop)), 0.07, 0.09, head);   // A
    const zB = (zH + zR) / 2 + 0.05;
    strut(new THREE.Vector3(s * (hw(tAt(zB)) + 0.01), M.belt(tAt(zB)), zB), new THREE.Vector3(s * (hw(tAt(zB)) - 0.03), roofAt(zB) - 0.05, zB), 0.06, 0.11, head);       // B
    const zC = zR - 0.45;
    strut(new THREE.Vector3(s * (hw(tAt(zC)) - 0.01), M.belt(tAt(zC)), zC), new THREE.Vector3(s * (hw(tAt(zC)) - 0.06), roofAt(zC) - 0.05, zC - 0.12), 0.07, 0.16, head); // C
    // door cards: lower panel, armrest, pull, handle, speaker, ambient strip, sill trim
    for (const [z0, z1] of [[zB + 0.04, zA - 0.12], [zR - 0.45, zB - 0.04]]) {
      const zc = (z0 + z1) / 2, len = z1 - z0, xin = s * (hw(tAt(zc)) + 0.02);
      const by = M.belt(tAt(zc));
      rbox(0.05, by - floorY - 0.02, len, 0.02, soft, xin, (by + floorY) / 2, zc);
      rbox(0.05, 0.16, len - 0.06, 0.02, cream, xin - s * 0.012, by - 0.14, zc);                 // upper door insert in leather
      rbox(0.09, 0.05, len * 0.55, 0.02, cream, xin - s * 0.05, hipY + 0.17, zc - len * 0.1);   // armrest
      rbox(0.012, 0.03, 0.12, 0.006, alu, xin - s * 0.035, by - 0.06, z1 - 0.16);                // handle
      add(new THREE.CircleGeometry(0.07, 20), piano, xin - s * 0.028, floorY + 0.14, zc - len * 0.2, 0, s * -Math.PI / 2);   // speaker grille
      rbox(0.008, 0.006, len - 0.08, 0.003, strip, xin - s * 0.03, by - 0.03, zc);              // ambient light line
      rbox(0.06, 0.02, len, 0.01, piano, xin, by + 0.005, zc);                                   // window sill trim
    }
  }
  // ---- dashboard: one sculpted piece from the windscreen back to the cabin ----
  {
    const sh = new THREE.Shape(), dz = 0.56;
    sh.moveTo(0, 0); sh.lineTo(0, 0.02);                                     // at the windscreen base
    sh.bezierCurveTo(-0.15, 0.05, -0.38, 0.06, -dz, 0.03);                    // the top, rolling over
    sh.bezierCurveTo(-dz - 0.06, 0.0, -dz - 0.05, -0.12, -dz + 0.02, -0.2);  // the lip and face
    sh.lineTo(-0.2, -0.3); sh.lineTo(0, -0.25); sh.closePath();
    const w = 2 * hw(M.tA - 0.02) + 0.04;
    const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 16 });
    geo.translate(0, 0, -w / 2); geo.rotateY(-Math.PI / 2);                  // shape x -> -z (backward), extrusion -> x
    const dash = add(geo, soft, 0, beltA - 0.02, zA);
    // a strip of the ambient light under the lip, the full width
    rbox(w - 0.1, 0.006, 0.006, 0.003, strip, 0, beltA - 0.08, zA - dz + 0.03);
    rbox(w - 0.12, 0.02, 0.012, 0.006, piano, 0, beltA - 0.04, zA - dz + 0.0);
    void dash;
  }
  // displays: a slim driver cluster and the big centre screen on its stalk
  const nav = navCanvas(); nav.draw(0);
  const navTex = new THREE.CanvasTexture(nav.c); navTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: navTex, color: new THREE.Color(1.05, 1.05, 1.05) });
  rbox(0.34, 0.21, 0.018, 0.012, piano, 0.02, beltA + 0.11, zA - 0.5, -0.18);
  add(new THREE.PlaneGeometry(0.325, 0.195), screenMat, 0.02, beltA + 0.11, zA - 0.5 - 0.0105, -0.18, Math.PI, 0);
  rbox(0.05, 0.1, 0.04, 0.01, piano, 0.02, beltA + 0.02, zA - 0.47);
  const clusterC = document.createElement('canvas'); clusterC.width = 256; clusterC.height = 64;
  { const x = clusterC.getContext('2d'); x.fillStyle = '#07090c'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#dfe7f1'; x.font = '700 34px sans-serif'; x.fillText('42', 22, 46); x.font = '500 13px sans-serif'; x.fillStyle = '#8fa1b5'; x.fillText('km/h', 70, 46); x.fillStyle = '#2f8cff'; x.fillRect(120, 28, 116, 6); x.fillStyle = '#5ee47a'; x.fillText('D', 230, 20); }
  const clusterTex = new THREE.CanvasTexture(clusterC); clusterTex.colorSpace = THREE.SRGBColorSpace;
  rbox(0.27, 0.075, 0.015, 0.008, piano, xD, beltA + 0.06, zA - 0.4, -0.25);
  add(new THREE.PlaneGeometry(0.255, 0.064), new THREE.MeshBasicMaterial({ map: clusterTex, color: new THREE.Color(0.9, 0.9, 0.9) }), xD, beltA + 0.06, zA - 0.4 - 0.009, -0.25, Math.PI, 0);
  // ---- the wheel: rim, three spokes, hub, column ----
  const wheel = new THREE.Group(); wheel.name = 'steering-wheel';
  const pivot = new THREE.Group(); pivot.position.set(xD, hipY + 0.36, zH + 0.4); pivot.rotation.x = -0.42; g.add(pivot); pivot.add(wheel);
  const R = 0.185;
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.017, 10, 48), soft));
  for (const a of [Math.PI / 2 + 0.05, -Math.PI / 2 - 0.05, Math.PI]) {           // left, right, bottom spokes
    const sp = new THREE.Mesh(new RoundedBoxGeometry(R * 0.95, 0.03, 0.02, 2, 0.008), alu);
    sp.position.set(Math.cos(a - Math.PI / 2) * R * 0.48, Math.sin(a - Math.PI / 2) * R * 0.48, 0); sp.rotation.z = a - Math.PI / 2; wheel.add(sp);
  }
  wheel.add(new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.09, 0.05, 3, 0.02), soft));
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 14), soft); col.rotation.x = Math.PI / 2; col.position.z = 0.16; pivot.add(col);
  // mirror, visors
  const yTopA = roofAt(zAt(M.tA - 0.07)) - 0.06;
  rbox(0.025, 0.08, 0.02, 0.008, piano, 0, yTopA - 0.02, zAt(M.tA - 0.07) - 0.02);
  rbox(0.25, 0.065, 0.035, 0.02, piano, 0, yTopA - 0.08, zAt(M.tA - 0.07) - 0.05);
  add(new THREE.PlaneGeometry(0.235, 0.05), mirror, 0, yTopA - 0.08, zAt(M.tA - 0.07) - 0.069, 0, Math.PI, 0);
  for (const s of [-1, 1]) rbox(0.32, 0.015, 0.16, 0.007, head, s * 0.3, yTopA + 0.005, zAt(M.tA - 0.07) - 0.12, 0.08);
  // ---- seats ----
  function seat(x, zh, back = true) {
    rbox(0.5, 0.11, 0.5, 0.05, cream, x, hipY - 0.07, zh + 0.12, -0.06);                     // cushion
    for (const s of [-1, 1]) rbox(0.08, 0.13, 0.46, 0.035, cream, x + s * 0.22, hipY - 0.03, zh + 0.12, -0.06);   // its bolsters
    rbox(0.52, 0.06, 0.04, 0.02, soft, x, hipY - 0.16, zh + 0.36);                            // front trim
    if (!back) return;
    const bk = new THREE.Group(); bk.position.set(x, hipY - 0.08, zh - 0.12); bk.rotation.x = -0.26; g.add(bk);
    const part = (w, h, d, r, mat, px, py, pz, rx = 0, ry = 0) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, 0); bk.add(m); };
    part(0.44, 0.6, 0.1, 0.045, cream, 0, 0.32, 0);                                           // back
    for (const s of [-1, 1]) part(0.09, 0.56, 0.13, 0.04, cream, s * 0.23, 0.3, 0.02, 0, s * -0.3);   // side bolsters
    part(0.46, 0.62, 0.035, 0.015, soft, 0, 0.32, -0.065);                                    // hard back panel (what the rear sees)
    part(0.4, 0.008, 0.02, 0.003, creamPiping, 0, 0.42, 0.052); part(0.4, 0.008, 0.02, 0.003, creamPiping, 0, 0.22, 0.052);   // piping
    part(0.26, 0.16, 0.1, 0.045, cream, 0, 0.74, 0.0);                                        // headrest
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), alu); p.position.set(s * 0.07, 0.64, 0); bk.add(p); }
  }
  seat(xD, zH); seat(xP, zH);
  // rear bench (you sit on its right), with a fold-down armrest in the middle
  rbox(2 * hw(tAt(zR)) - 0.06, 0.12, 0.5, 0.05, cream, 0, hipY - 0.07, zR + 0.12, -0.06);
  {
    const bk = new THREE.Group(); bk.position.set(0, hipY - 0.08, zR - 0.15); bk.rotation.x = -0.3; g.add(bk);
    const wb = 2 * hw(tAt(zR)) - 0.08;
    const m = new THREE.Mesh(new RoundedBoxGeometry(wb, 0.6, 0.12, 3, 0.05), cream); m.position.y = 0.3; bk.add(m);
    for (const x of [-wb / 3, wb / 3]) { const h = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.15, 0.09, 3, 0.04), cream); h.position.set(x, 0.66, 0); bk.add(h); }
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.08, 0.36, 3, 0.03), cream); arm.position.set(0, 0.14, 0.2); arm.rotation.x = 0.3; bk.add(arm);
  }
  // ---- centre console between the front seats: armrest, charging pad, cup holders (a cup in one) ----
  const zc0 = zH - 0.22, zc1 = zA - 0.56, cz = (zc0 + zc1) / 2, cl = zc1 - zc0;
  rbox(0.24, hipY + 0.1 - floorY, cl, 0.03, soft, 0, (hipY + 0.1 + floorY) / 2, cz);
  rbox(0.22, 0.05, 0.32, 0.03, cream, 0, hipY + 0.13, zc0 + 0.18);                            // armrest
  rbox(0.18, 0.008, 0.16, 0.004, piano, 0, hipY + 0.105, zc1 - 0.14);                         // charging pad
  for (const x of [-0.05, 0.05]) add(new THREE.CylinderGeometry(0.043, 0.043, 0.012, 20), piano, x, hipY + 0.104, zc0 + 0.42);
  try { const c = cup('manner'); c.scale.setScalar(1); c.position.set(0.05, hipY + 0.06, zc0 + 0.42); c.rotation.y = Math.PI * 0.8; g.add(c); } catch { /* no canvas */ }
  // pedals (the driver's feet go here)
  const pedals = [new THREE.Vector3(xD - 0.08, floorY + 0.09, zH + 0.86), new THREE.Vector3(xD + 0.1, floorY + 0.09, zH + 0.84)];
  for (const p of pedals) rbox(0.06, 0.1, 0.02, 0.008, alu, p.x, p.y + 0.03, p.z + 0.04, -0.4);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  // ---- per frame: street light sweeping through, the screen's route moving on ----
  let navT = 0, prog = 0;
  const _w = new THREE.Vector3();
  // the part of the car's own body to cut away so the inside shows (its closed shell has a deck across
  // the cabin at seat height): between the door skins, floor to below the roof, cowl to behind the bench
  let roofMin = Infinity; for (let z = zR - 0.6; z < zA - 0.3; z += 0.1) roofMin = Math.min(roofMin, roofAt(z));
  const clipBox = { x: hw(0.4) + 0.06, y0: floorY - 0.05, y1: roofMin - 0.05, z0: zR - 0.75, z1: zA - 0.02 };
  return {
    group: g, eye, wheel, pivot, wheelRadius: R, pedals, clipBox,
    hip: new THREE.Vector3(xD, hipY + 0.02, zH - 0.02),
    driverSide: xD,
    update(dt, car, steer = 0) {
      // the lamps on both kerbs of Zhongshan Road: how close is the nearest few (a warm pulse as each goes by)
      g.getWorldPosition(_w);
      let k = 0;
      for (const z of roadLamps) {
        for (const [lx, lz] of [[L.eastCurbX + 0.5, z], [L.westCurbX - 0.5, z + ROAD_LAMP_WEST_OFFSET]]) {
          const dz = _w.z - lz; if (Math.abs(dz) > 14) continue;
          const dx = _w.x - lx; k += Math.exp(-(dz * dz) / 18) / (1 + dx * dx / 40);
        }
      }
      k = Math.min(1.4, k);
      const base = 0.025 + 0.07 * k;                                           // night: dim; a lamp overhead: a warm lift, no more
      for (const m of lit) m.emissive.copy(m.userData.base).multiplyScalar(base).add(new THREE.Color(0.012 * k, 0.007 * k, 0.002 * k));
      wheel.rotation.z = steer;
      navT += dt; if (navT > 1) { navT = 0; prog = Math.min(1, prog + 0.01 + (car ? car.v : 0) * 0.002); nav.draw(prog); navTex.needsUpdate = true; }
      return k;
    },
    // the wheel rim point at angle a (0 = top, + = toward the passenger side), world space
    rimPoint(a, out) { return out.set(-Math.sin(a) * R, Math.cos(a) * R, 0).applyMatrix4(wheel.matrixWorld); },
  };
}
