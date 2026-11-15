// Through-traffic vehicles for the Hankou Road crossing.
//
// FOUR NAMED MODELS ARE PLACEHOLDERS. No licensed or freely licensed 3D assets of the NIO ET5,
// Li Auto L9, Luxeed R7 or AITO M9 were available to this project, so these are procedural
// stand-ins for behaviour testing only. They have the published length / width / height /
// wheelbase / wheel size, the right body type and an approximation of each car's lighting
// layout, but they are NOT faithful models. They carry no manufacturer logos and are
// labelled "占位 PLACEHOLDER" on both sides and the rear. Replace each with a real asset
// (same origin: centre of the footprint at ground level, nose toward +z).
//
// The taxis and dark sedan reuse the street's existing generic car.
import { CAR_BADGE } from '../ui/brands.js';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCar } from './street.js';
import { createInstancer, mergeStatic } from './instancer.js';
import { assembleCar } from './carbody.js';
import { CARS } from './carModels.js';
import { T } from './text.js';
import { makeCanvas, tex, FONT } from './canvas.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const TAIL_RUN = new THREE.Color(0.55, 0.02, 0.015), TAIL_BRAKE = new THREE.Color(4.2, 0.12, 0.06);

// Side profiles: [z as a fraction of length (-0.5 rear .. +0.5 nose), height in m].
// Approximations of each car's silhouette from public photographs, not measured CAD.
const MODELS = {
  'nio-et5': {
    name: 'NIO ET5', zh: '蔚来', paint: 0xb9c0c6, wheelD: 0.70, frontOverhang: 0.93,
    body: [[-0.5, 0.32], [-0.5, 0.62], [-0.47, 0.93], [-0.36, 0.96], [0.2, 0.93], [0.42, 0.78], [0.5, 0.6], [0.49, 0.32]],
    glass: [[-0.37, 0.95], [-0.14, 1.39], [0.03, 1.42], [0.21, 0.93]],
    lidar: 0.05,
    head: [{ y: 0.74, w: 0.36, h: 0.035, x: 0.6, z: 0.44 }, { y: 0.56, w: 0.22, h: 0.05, x: 0.68, z: 0.495 }],
    tail: { y: 0.9, h: 0.04, through: true },
  },
  'li-l9': {
    name: 'Li Auto L9', zh: '理想', paint: 0x8f9a94, wheelD: 0.77, frontOverhang: 0.98,
    body: [[-0.5, 0.36], [-0.5, 1.06], [-0.47, 1.1], [0.27, 1.08], [0.4, 1.02], [0.5, 0.92], [0.5, 0.36]],
    glass: [[-0.475, 1.08], [-0.46, 1.74], [0.11, 1.75], [0.27, 1.08]],
    lidar: 0.1,
    head: [{ y: 0.98, w: 1.82, h: 0.04, x: 0, z: 0.5 }],                     // full-width front light bar
    tail: { y: 1.12, h: 0.06, through: true },
  },
  'luxeed-r7': {
    name: 'Luxeed R7', zh: '智界', paint: 0xc8722f, wheelD: 0.74, frontOverhang: 0.95,
    body: [[-0.5, 0.34], [-0.5, 0.78], [-0.46, 1.04], [-0.38, 1.03], [0.22, 0.99], [0.42, 0.88], [0.5, 0.66], [0.49, 0.34]],
    glass: [[-0.4, 1.02], [-0.12, 1.6], [0.05, 1.62], [0.23, 0.99]],
    lidar: 0.06,
    head: [{ y: 0.86, w: 1.86, h: 0.025, x: 0, z: 0.47 }],                    // thin through-type strip
    tail: { y: 1.0, h: 0.035, through: true },
  },
  'aito-m9': {
    name: 'AITO M9', zh: '问界', paint: 0x45505c, wheelD: 0.77, frontOverhang: 1.0,
    body: [[-0.5, 0.36], [-0.5, 1.0], [-0.46, 1.1], [0.25, 1.07], [0.42, 1.0], [0.5, 0.88], [0.5, 0.36]],
    glass: [[-0.455, 1.09], [-0.42, 1.74], [0.08, 1.76], [0.25, 1.07]],
    lidar: 0.08,
    head: [{ y: 0.95, w: 1.7, h: 0.03, x: 0, z: 0.5 }, { y: 0.78, w: 0.3, h: 0.12, x: 0.66, z: 0.5 }],
    tail: { y: 1.06, h: 0.05, through: true },
  },
};

function profileGeometry(pts, L, depth) {
  const sh = new THREE.Shape();
  pts.forEach(([f, y], i) => (i ? sh.lineTo(f * L, y) : sh.moveTo(f * L, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2);                     // profile along z, extruded across x
  return g;
}

function labelMaterial(text1, text2) {
  const [c, ctx] = makeCanvas(512, 110);
  ctx.fillStyle = 'rgba(12,14,18,0.82)'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#ffcf3a'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, c.width - 8, c.height - 8);
  ctx.fillStyle = '#ffcf3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${c.height * 0.34}px ${FONT.sans}`; ctx.fillText(text1, c.width / 2, c.height * 0.33);
  ctx.fillStyle = '#f2f2f2'; ctx.font = `700 ${c.height * 0.28}px ${FONT.sans}`; ctx.fillText(text2, c.width / 2, c.height * 0.72);
  const map = tex(c, { repeat: false });
  return std({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.55, roughness: 0.6 });
}
// shared by every placeholder: vertex colours carry paint / glass / trim
const shellMat = std({ vertexColors: true, roughness: 0.34, metalness: 0.12, envMapIntensity: 0.6 });
const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.5, 2.7) });

// Wheel: tyre + five-spoke rim in one geometry (vertex colours), so it costs one draw call.
const wheelCache = new Map();
const wheelMat = std({ vertexColors: true, roughness: 0.55, metalness: 0.5 });
function wheelGeometry(d) {
  if (wheelCache.has(d)) return wheelCache.get(d);
  const r = d / 2, parts = [];
  const paint = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g.index ? g.toNonIndexed() : g;
  };
  const tyre = new THREE.CylinderGeometry(r, r, 0.24, 22); tyre.rotateZ(Math.PI / 2);
  parts.push(paint(tyre, 0x0b0b0c));
  const rim = new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.245, 22); rim.rotateZ(Math.PI / 2);
  parts.push(paint(rim, 0x2a2d31));
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.BoxGeometry(0.03, r * 1.2, 0.07); sp.translate(0.115, 0, 0); sp.rotateX((i / 5) * Math.PI * 2);
    parts.push(paint(sp, 0xa8adb3));
  }
  const hub = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 10); hub.rotateZ(Math.PI / 2);
  parts.push(paint(hub, 0xc8ccd0));
  const g = mergeGeometries(parts.map((p) => { for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'color'].includes(k)) p.deleteAttribute(k); return p; }));
  wheelCache.set(d, g);
  return g;
}
// wheels are pivots; the instancer draws all wheels of one size in a single call
let wheels = null;
const wheelPivot = (d) => () => wheels.add(`wheel-${d}`, wheelGeometry(d), wheelMat, new THREE.Object3D());

// Fictional Shanghai new-energy plate (green gradient, 沪A + D...), rear only.
function plateMaterial(text) {
  const [c, ctx] = makeCanvas(256, 80);
  const g = ctx.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#e8f5e9'); g.addColorStop(1, '#5fbf6a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 80); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 74);
  ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `700 46px ${FONT.sans}`; ctx.fillText(text, 128, 44);
  const map = tex(c, { repeat: false });
  return std({ map, roughness: 0.4, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.25 });
}
// a maker's wordmark in chrome letters, for the tail
const badgeCache = new Map();
function badgeMaterial(word) {
  if (badgeCache.has(word)) return badgeCache.get(word);
  const c = document.createElement('canvas'); c.width = 64 * word.length + 64; c.height = 64; const x = c.getContext('2d');
  x.font = `700 46px "Helvetica Neue", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const g = x.createLinearGradient(0, 10, 0, 54); g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.5, '#9aa2aa'); g.addColorStop(1, '#e6e9ec');
  x.fillStyle = g; x.save(); x.translate(c.width / 2, 34); x.scale(1, 0.92); x.fillText(word.split('').join(String.fromCharCode(8202)), 0, 0); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = std({ map: t, transparent: true, metalness: 0.9, roughness: 0.2, alphaTest: 0.2 }); badgeCache.set(word, m); return m;
}
const trimShared = std({ color: 0x0d0e10, roughness: 0.55, side: THREE.DoubleSide });
const chromeShared = std({ color: 0xc8ccd0, metalness: 1, roughness: 0.18 });
const glassShared = std({ color: 0x0a0e13, roughness: 0.06, metalness: 0.0, envMapIntensity: 0.7, side: THREE.DoubleSide });

// The four named EVs: lofted lookalikes (carbody.js / carModels.js). Published dimensions, body
// type, silhouette and light signature; NOT licensed models. They carry their maker's name as the
// real cars do, a chrome wordmark across the tail (ui/brands.js CAR_BADGE).
function buildLookalike(spec, plateText) {
  const M = CARS[spec.model];
  const paintMat = std({ color: M.paint, roughness: 0.3, metalness: 0.15, envMapIntensity: 0.65, side: THREE.DoubleSide });   // paint under a clear coat, not chrome
  const tailMat = new THREE.MeshBasicMaterial({ color: TAIL_RUN.clone() });
  const brakeOnly = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0, 0) });
  const head = Object.assign(headMat.clone(), { userData: { chrome: chromeShared } });
  const { group, wheels: wl } = assembleCar(M, { paintMat, glassMat: glassShared, trimMat: trimShared, headMat: head, tailMat, brakeMat: brakeOnly, wheelFactory: wheelPivot(M.wheelD) });
  // merge everything static that shares a material: fewer draw calls per car
  const byMat = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh) continue;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o); group.remove(o);
  }
  for (const [mat, list] of byMat) group.add(new THREE.Mesh(mergeStatic(list, { uv: !!mat.map }), mat));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.14), plateMaterial(plateText));
  plate.position.set(0, M.sill(0) + 0.22, -M.length / 2 - 0.02); plate.rotation.y = Math.PI; group.add(plate);
  const word = CAR_BADGE[spec.model];
  if (word) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.06 * word.length + 0.08, 0.06), badgeMaterial(word)); b.position.set(0, M.sill(0) + 0.5, -M.length / 2 - 0.03); b.rotation.y = Math.PI; group.add(b); }
  return { g: group, wheels: wl, wheelRadius: M.wheelD / 2, setBraking(b) { tailMat.color.copy(b ? TAIL_BRAKE : TAIL_RUN); brakeOnly.color.setRGB(b ? 4 : 0.05, b ? 0.1 : 0, b ? 0.05 : 0); } };
}

function buildGeneric(spec) {
  const taxi = spec.model === 'taxi';
  const c = buildCar(taxi ? 0x0c8f8a : spec.paint ?? 0x101216, taxi, { moving: true, wheelMesh: wheelPivot(0.66) });
  c.tailMat.color.copy(TAIL_RUN);
  // the parked model has no lit headlamps; moving cars at dusk need them
  const lamps = [-1, 1].map((s) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.03)); h.position.set(s * 0.62, 0.62, 2.35); return h; });
  c.g.add(new THREE.Mesh(mergeStatic(lamps), headMat));
  return { g: c.g, wheels: c.wheels, wheelRadius: 0.33, setBraking(b) { c.tailMat.color.copy(b ? TAIL_BRAKE : TAIL_RUN); } };
}

// A Shanghai city bus: a 12 m low-floor electric single-decker (the type that runs the Bund routes),
// white with a green skirt, tinted glass with the cabin lit behind it, amber LED route signs front,
// side and rear, batteries in a roof pod. Doors on the kerb side (front and middle) slide open at stops.
// Built from boxes; the livery is generic, not any one operator's.
function ledSign(text, w = 512, h = 96, small = '') {
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffae2a'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${h * 0.78}px ${FONT.sans}`; ctx.textAlign = small ? 'left' : 'center';
  ctx.fillText(text, small ? h * 0.25 : w / 2, h * 0.54);
  if (small) { ctx.font = `700 ${h * 0.38}px ${FONT.sans}`; ctx.textAlign = 'right'; ctx.fillText(small, w - h * 0.2, h * 0.54); }
  const img = ctx.getImageData(0, 0, w, h);                                   // LED dots
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x % 4 === 3 || y % 4 === 3) { const i = (y * w + x) * 4; img.data[i] *= 0.2; img.data[i + 1] *= 0.2; img.data[i + 2] *= 0.2; }
  ctx.putImageData(img, 0, 0);
  const m = new THREE.MeshBasicMaterial({ map: tex(c, { repeat: false }) }); m.color.setScalar(1.7);
  return m;
}
const busPaint = std({ color: 0xeef0f2, roughness: 0.4, metalness: 0.05, envMapIntensity: 0.6 });
const busSkirt = std({ color: 0x0f7d63, roughness: 0.45, metalness: 0.05, envMapIntensity: 0.6 });
const busGlass = std({ color: 0x0c1014, roughness: 0.06, metalness: 0.7, emissive: new THREE.Color(0.42, 0.4, 0.34), emissiveIntensity: 1 });
const busCabin = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) });
function buildBus(spec) {
  const g = new THREE.Group(), Ln = spec.len, W = spec.width, H = spec.height, hl = Ln / 2, hw = W / 2;
  const box = (mat, x, y, z, w, h, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); return m; };
  const statics = { paint: [], skirt: [], glass: [], trim: [] };
  statics.skirt.push(box(busSkirt, 0, 0.32, 0, W, 0.55, Ln));                     // lower body
  statics.paint.push(box(busPaint, 0, 0.87, 0, W, 0.28, Ln));                     // waist
  statics.glass.push(box(busGlass, 0, 1.15, 0, W - 0.02, 1.35, Ln - 0.3));          // the window band, all round
  statics.paint.push(box(busPaint, 0, 2.5, 0, W, 0.5, Ln));                       // cant rail and roof
  statics.paint.push(box(busPaint, 0, 3.0, -0.6, W - 0.5, 0.2, 7.5));               // battery pod
  for (let z = -hl + 1.1; z < hl - 1.6; z += 1.45) for (const sx of [-1, 1]) statics.trim.push(box(trimShared, sx * (hw + 0.005), 1.15, z, 0.02, 1.35, 0.09));   // window pillars
  statics.trim.push(box(trimShared, 0, 0.18, hl - 0.15, W, 0.32, 0.3), box(trimShared, 0, 0.18, -hl + 0.15, W, 0.32, 0.3));      // bumpers
  statics.glass.push(box(busGlass, 0, 0.95, hl + 0.01, W - 0.12, 1.75, 0.04));    // windscreen
  const parts = new THREE.Group();
  for (const [k, list] of Object.entries(statics)) { const mat = { paint: busPaint, skirt: busSkirt, glass: busGlass, trim: trimShared }[k]; parts.add(new THREE.Mesh(mergeStatic(list), mat)); }
  g.add(parts);
  // signs: front destination, side by the front door, rear number
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.3, 0.32), ledSign(`${spec.route || '55'}路`)); front.position.set(0, 2.78, hl + 0.04); g.add(front);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), ledSign(`${spec.route || '55'}`, 512, 96, '路')); side.position.set(-hw - 0.02, 2.2, hl - 2.4); side.rotation.y = -Math.PI / 2; g.add(side);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.36), ledSign(`${spec.route || '55'}`)); rear.position.set(0, 2.6, -hl - 0.03); rear.rotation.y = Math.PI; g.add(rear);
  // lamps
  const lamps = [-1, 1].map((sx) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.04)); h.position.set(sx * (hw - 0.3), 0.62, hl + 0.02); return h; });
  g.add(new THREE.Mesh(mergeStatic(lamps), headMat));
  const tailMat = new THREE.MeshBasicMaterial({ color: TAIL_RUN.clone() });
  const tails = [-1, 1].map((sx) => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.04)); h.position.set(sx * (hw - 0.12), 0.75, -hl - 0.02); return h; });
  g.add(new THREE.Mesh(mergeStatic(tails), tailMat));
  // doors (kerb side = the bus's right = -x): glass leaves that slide open, the lit step inside
  const doorMat = std({ color: 0x0d1115, roughness: 0.1, metalness: 0.6, emissive: new THREE.Color(0.25, 0.24, 0.2) });
  const doors = [], doorZ = [hl - 1.1, -0.35];
  for (const dz of doorZ) {
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.0), busCabin); glow.position.set(-hw + 0.06, 1.25, dz); glow.rotation.y = -Math.PI / 2; g.add(glow);
    for (const sz of [-1, 1]) { const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.1, 0.6), doorMat); leaf.position.set(-hw - 0.01, 1.3, dz + sz * 0.3); g.add(leaf); doors.push({ leaf, z: dz + sz * 0.3, sz }); }
  }
  // the indicator on the kerb side, for pulling in and out
  const blinkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.08, 0) });
  for (const z of [hl - 0.1, -hl + 0.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.1), blinkMat); b.position.set(-hw + 0.02, 0.95, z); g.add(b); }
  const wl = [];
  for (const z of [hl - 2.45, hl - 2.45 - spec.wheelbase]) for (const sx of [-1, 1]) { const w = wheelPivot(1.0)(); w.position.set(sx * (hw - 0.28), 0.5, z); if (sx < 0) w.rotation.y = Math.PI; g.add(w); wl.push(w); }
  let open = 0;
  return {
    g, wheels: wl, wheelRadius: 0.5,
    setBraking(b) { tailMat.color.copy(b ? TAIL_BRAKE : TAIL_RUN); },
    // 0..1 doors open; blink: indicator on
    setDoors(k) { open = k; for (const d of doors) { d.leaf.position.x = -hw - 0.01 - 0.08 * Math.min(1, k * 3); d.leaf.position.z = d.z + d.sz * 0.52 * k; } },
    setBlink(on) { blinkMat.color.setRGB(on ? 3.2 : 0.2, on ? 1.4 : 0.08, 0); },
    get doorsOpen() { return open; },
  };
}

export const PLACEHOLDER_MODELS = Object.keys(MODELS);

export function createVehicles(specs) {
  const group = new THREE.Group(); group.name = 'traffic-vehicles';
  wheels = createInstancer('traffic-wheels');
  const list = specs.map((spec, i) => {
    const v = CARS[spec.model] ? buildLookalike(spec, T.plates[i % T.plates.length]) : spec.model === 'bus' ? buildBus(spec) : buildGeneric(spec);
    v.g.name = `vehicle-${spec.id}`;
    group.add(v.g);
    return { ...v, id: spec.id, model: spec.model, lookalike: !!CARS[spec.model], bus: spec.model === 'bus', braking: null };
  });
  wheels.build(); group.add(wheels.group);
  const instancer = wheels;
  return {
    group, list,
    // sim: traffic.vehicles (same order as specs)
    update(sim, eye = null) {
      for (let i = 0; i < list.length; i++) {
        const v = list[i], s = sim[i];
        v.g.visible = s.active && !s.hidden && !(eye && Math.abs(s.z - eye.z) > 340);   // hidden: you're inside it (world/didi.js draws the cabin)
        for (const w of v.wheels) w.visibleOwner = s.active && !s.hidden;
        if (!s.active) continue;
        v.g.position.set(s.x, 0, s.z); v.g.rotation.y = s.yaw;
        const ang = s.wheelDist / v.wheelRadius;
        for (const w of v.wheels) w.rotation.x = ang;                        // Euler XYZ: spins about the axle even when mirrored
        v.g.updateMatrixWorld(true);
        if (s.braking !== v.braking) { v.braking = s.braking; v.setBraking(s.braking); }
      }
      instancer.sync();
    },
  };
}
