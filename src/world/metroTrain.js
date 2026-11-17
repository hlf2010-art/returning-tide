// Line 2's trains: eight A-type cars, white with the line's green stripe, five plug doors a side, open
// gangways between the cars, a cab at each end. Inside: grey floor, longitudinal stainless benches, glass
// screens at the seat ends, poles and grab rails with hanging straps, two light lines down the ceiling,
// a screen over every door (the line, the next station, which side the doors open).
// Drawn as instanced meshes shared by a few train slots (world/metro.js puts the nearest trains in them):
// one draw call per material for every car of every slot. Car frame: x to the left, y up from the rail
// head, z forward; car 0 leads.
import * as THREE from 'three';
import { Batch } from './geo.js';
import { CAR } from './metroLayout.js';
import { liveryTex, seatTex, carFloorTex, carScreenTex, L2, makeCanvas, tex } from './metroTextures.js';

export const FLOOR = 1.08;                    // the car floor above the rail head (level with the platform)
const HALF = CAR.len / 2 - 0.3, W = CAR.halfW, IN = W - 0.08, ROOF = 3.62, CEIL = FLOOR + CAR.ceil;
const DOOR_H = 1.88, WIN0 = 1.98, WIN1 = 2.86;
// the solid stretches of each side between the doorways
const SOLID = (() => { const out = []; let z = -HALF; for (const d of [...CAR.doors].sort((a, b) => a - b)) { out.push([z, d - CAR.doorW / 2]); z = d + CAR.doorW / 2; } out.push([z, HALF]); return out; })();
// the benches: between the doors, clear of them
const SEATS = (() => { const out = []; let z = -HALF + 0.5; for (const d of [...CAR.doors].sort((a, b) => a - b)) { out.push([z, d - CAR.doorW / 2 - 0.32]); z = d + CAR.doorW / 2 + 0.32; } out.push([z, HALF - 0.5]); return out; })();
export const CAR_SEATS = SEATS;

function leafTex() {
  const [c, x] = makeCanvas(128, 512);
  x.fillStyle = '#eef0f0'; x.fillRect(0, 0, 128, 512);
  x.fillStyle = '#1b2228'; x.fillRect(16, 60, 96, 190);                      // the window
  const g = x.createLinearGradient(16, 60, 112, 250); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(16, 60, 96, 190);
  x.fillStyle = L2; x.fillRect(0, 300, 128, 18);
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, 0, 3, 512); x.fillRect(125, 0, 3, 512);
  return tex(c, { repeat: false });
}
function destTex() {
  const [c, x] = makeCanvas(512, 96);
  x.fillStyle = '#080808'; x.fillRect(0, 0, 512, 96);
  x.fillStyle = '#ffae3a'; x.font = '900 60px "Noto Sans SC", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('2  广兰路 ⇄ 徐泾东', 256, 50);
  return tex(c, { repeat: false });
}

export function createTrainSet(root, { slots = 3 } = {}) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    body: std({ color: 0xf0f2f2, roughness: 0.28, metalness: 0.15 }),
    green: std({ color: new THREE.Color(L2), roughness: 0.35 }),
    glass: std({ color: 0x1a2128, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }),
    dark: std({ color: 0x24272a, roughness: 0.7, metalness: 0.3 }),
    panel: std({ color: 0xdfe2e3, roughness: 0.45 }),
    floor: std({ map: carFloorTex(), roughness: 0.75 }),
    seat: std({ map: seatTex(), color: 0xd8dde0, roughness: 0.22, metalness: 0.85 }),
    steel: std({ color: 0xd6dadc, roughness: 0.18, metalness: 0.95 }),
    rubber: std({ color: 0x1d1f21, roughness: 0.6 }),
    yellow: std({ color: 0xe7c11c, roughness: 0.5 }),
    light: Object.assign(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 2.3, 2.35) }), { userData: { todSkip: true } }),
    leaf: std({ map: leafTex(), roughness: 0.3, metalness: 0.1 }),
    head: Object.assign(new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.8) }), { userData: { todSkip: true } }),
    tail: Object.assign(new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.12, 0.1) }), { userData: { todSkip: true } }),
    dest: Object.assign(new THREE.MeshBasicMaterial({ map: destTex(), color: new THREE.Color(1.6, 1.6, 1.6) }), { userData: { todSkip: true } }),
  };
  void liveryTex;
  const B = {}; const b = (k) => B[k] || (B[k] = new Batch());
  const bx = (k, x0, x1, y0, y1, z0, z1) => b(k).box((x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, { tile: 1 });
  const rod = (k, x, y, z, len, r, axis) => b(k).add(new THREE.CylinderGeometry(r, r, len, 8), { x, y, z, rx: axis === 'z' ? Math.PI / 2 : 0, rz: axis === 'x' ? Math.PI / 2 : 0 });
  // ---- outside ----
  for (const s of [-1, 1]) {
    const xo = s * W;
    for (const [z0, z1] of SOLID) {
      bx('body', xo - 0.03, xo + 0.03, 0.95, WIN0, z0, z1);
      bx('body', xo - 0.03, xo + 0.03, WIN1, ROOF - 0.1, z0, z1);
      bx('body', xo - 0.03, xo + 0.03, WIN0, WIN1, z0, z0 + 0.16); bx('body', xo - 0.03, xo + 0.03, WIN0, WIN1, z1 - 0.16, z1);
      bx('glass', xo - 0.01, xo + 0.01, WIN0, WIN1, z0 + 0.16, z1 - 0.16);
      bx('green', xo - 0.035 + s * 0.01, xo + 0.035 + s * 0.01, 1.72, 1.86, z0, z1);
      // inside: the lining below and above the windows, the pillars
      bx('panel', s * IN - 0.02, s * IN + 0.02, FLOOR, WIN0, z0, z1); bx('panel', s * IN - 0.02, s * IN + 0.02, WIN1, CEIL, z0, z1);
      bx('panel', s * IN - 0.02, s * IN + 0.02, WIN0, WIN1, z0, z0 + 0.16); bx('panel', s * IN - 0.02, s * IN + 0.02, WIN0, WIN1, z1 - 0.16, z1);
      bx('panel', Math.min(s * IN, xo), Math.max(s * IN, xo), WIN0 - 0.02, WIN0, z0, z1); bx('panel', Math.min(s * IN, xo), Math.max(s * IN, xo), WIN1, WIN1 + 0.02, z0, z1);
    }
    for (const d of CAR.doors) {
      bx('body', xo - 0.03, xo + 0.03, FLOOR + DOOR_H, ROOF - 0.1, d - CAR.doorW / 2, d + CAR.doorW / 2);
      bx('panel', s * IN - 0.02, s * IN + 0.02, FLOOR + DOOR_H, CEIL, d - CAR.doorW / 2, d + CAR.doorW / 2);
      bx('dark', Math.min(s * IN, xo), Math.max(s * IN, xo), FLOOR - 0.02, FLOOR + 0.005, d - CAR.doorW / 2, d + CAR.doorW / 2);   // the threshold
      bx('yellow', Math.min(s * (IN - 0.12), s * IN), Math.max(s * (IN - 0.12), s * IN), FLOOR, FLOOR + 0.006, d - CAR.doorW / 2, d + CAR.doorW / 2);
      for (const e of [-1, 1]) bx('dark', Math.min(s * IN, xo), Math.max(s * IN, xo), FLOOR, FLOOR + DOOR_H, d + e * CAR.doorW / 2 - 0.03, d + e * CAR.doorW / 2 + 0.03);
    }
  }
  // roof, its air-conditioning units; the underframe, two bogies, wheels
  bx('body', -W + 0.05, W - 0.05, ROOF - 0.1, ROOF, -HALF, HALF); bx('body', -W + 0.35, W - 0.35, ROOF, ROOF + 0.12, -HALF, HALF);
  for (const z of [-6.2, 6.2]) bx('panel', -1.0, 1.0, ROOF + 0.12, ROOF + 0.42, z - 1.6, z + 1.6);
  bx('dark', -W + 0.1, W - 0.1, 0.4, 0.95, -HALF + 0.2, HALF - 0.2);
  for (const zb of [-7.85, 7.85]) { bx('dark', -1.1, 1.1, 0.28, 0.62, zb - 1.3, zb + 1.3); for (const za of [-1.05, 1.05]) for (const xw of [-0.7175, 0.7175]) rod('dark', xw, 0.42, zb + za, 0.12, 0.42, 'x'); }
  // ---- inside ----
  bx('floor', -IN, IN, FLOOR - 0.05, FLOOR, -HALF, HALF);
  bx('panel', -IN, IN, CEIL, CEIL + 0.04, -HALF, HALF);
  bx('panel', -0.35, 0.35, CEIL - 0.1, CEIL, -HALF, HALF);                             // the air duct down the middle
  for (const s of [-1, 1]) bx('light', s * 0.36, s * 0.6, CEIL - 0.012, CEIL, -HALF + 0.3, HALF - 0.3);
  for (const s of [-1, 1]) for (const [z0, z1] of SEATS) {
    const xi = s * IN, xs = s * (IN - 0.44);
    bx('seat', Math.min(xi, xs), Math.max(xi, xs), FLOOR + 0.4, FLOOR + 0.45, z0, z1);
    bx('seat', Math.min(xi, s * (IN - 0.06)), Math.max(xi, s * (IN - 0.06)), FLOOR + 0.45, FLOOR + 0.95, z0, z1);
    bx('dark', Math.min(s * (IN - 0.04), s * (IN - 0.4)), Math.max(s * (IN - 0.04), s * (IN - 0.4)), FLOOR, FLOOR + 0.4, z0 + 0.05, z1 - 0.05);
    for (const ze of [z0, z1]) {
      if (Math.abs(ze) > HALF - 0.6) continue;
      bx('glass', Math.min(xi, s * (IN - 0.5)), Math.max(xi, s * (IN - 0.5)), FLOOR + 0.48, FLOOR + 1.72, ze - 0.01, ze + 0.01);
      rod('steel', s * (IN - 0.52), (FLOOR + CEIL) / 2, ze, CEIL - FLOOR, 0.019);
    }
    rod('steel', s * 0.8, FLOOR + 1.86, (z0 + z1) / 2, z1 - z0 + 0.3, 0.016, 'z');
    for (let z = z0 + 0.25; z < z1 - 0.1; z += 0.42) { bx('rubber', s * 0.8 - 0.012, s * 0.8 + 0.012, FLOOR + 1.6, FLOOR + 1.86, z - 0.015, z + 0.015); b('rubber').add(new THREE.TorusGeometry(0.06, 0.012, 4, 10), { x: s * 0.8, y: FLOOR + 1.54, z, ry: Math.PI / 2 }); }
  }
  // a pole in the middle of each doorway's vestibule
  for (const d of CAR.doors) rod('steel', 0, (FLOOR + CEIL) / 2, d, CEIL - FLOOR, 0.02);
  const geo = Object.fromEntries(Object.entries(B).map(([k, v]) => [k, v.geometry()]));
  // ---- the gangway between two cars (its own instance: two end frames and the bellows) ----
  const G = new Batch(), Gd = new Batch();
  for (const z of [-0.32, 0.32]) {
    G.box(0, FLOOR, z, 0.02, 0.01, 0.02);
    for (const s of [-1, 1]) G.box(s * (IN + 0.72) / 2 + s * 0.0, FLOOR - 0.05, z, IN - 0.72, CEIL - FLOOR + 0.05, 0.06);
    G.box(0, FLOOR + 1.98, z, 1.44, CEIL - FLOOR - 1.98, 0.06);
  }
  for (const s of [-1, 1]) Gd.box(s * 0.84, 0.95, 0, 0.08, 2.3, 0.6); Gd.box(0, 3.2, 0, 1.76, 0.1, 0.6); Gd.box(0, FLOOR - 0.06, 0, 1.4, 0.06, 0.64);
  const gapGeo = { panel: G.geometry(), rubber: Gd.geometry() };
  // ---- a cab (at the +z end of a car) ----
  const Cb = new Batch(), Cg = new Batch(), Cd = new Batch(), Cgr = new Batch();
  Cb.box(0, 0.95, HALF + 0.4, 2 * W, 1.1, 0.8); Cgr.box(0, 1.72, HALF + 0.41, 2 * W + 0.02, 0.14, 0.8);
  Cb.box(0, ROOF - 0.15, HALF + 0.15, 2 * W - 0.1, 0.27, 0.3);
  { const a = new THREE.Vector3(-W + 0.12, 2.05, HALF + 0.8), c = new THREE.Vector3(W - 0.12, ROOF - 0.15, HALF + 0.3);
    const g = new THREE.PlaneGeometry(c.x - a.x, Math.hypot(c.y - a.y, c.z - a.z)); g.rotateX(-Math.atan2(a.z - c.z, c.y - a.y)); g.translate(0, (a.y + c.y) / 2, (a.z + c.z) / 2); Cg.push(g); }
  for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(0.8, 1.6); g.rotateY(s * Math.PI / 2); g.translate(s * W, 2.7, HALF + 0.4); Cb.push(g); }
  Cd.box(0, 0.5, HALF + 0.85, 0.5, 0.35, 0.3);
  Cb.box(0, FLOOR, HALF - 0.05, 2 * IN, CEIL - FLOOR, 0.06);                           // the cab's back wall, seen from the car
  const cabGeo = { body: Cb.geometry(), glass: Cg.geometry(), dark: Cd.geometry(), green: Cgr.geometry() };
  const lampGeo = new THREE.PlaneGeometry(0.34, 0.12), destGeo = new THREE.PlaneGeometry(1.6, 0.3);
  // ---- instanced meshes ----
  const N = slots * CAR.n, group = new THREE.Group(); group.name = 'metro-trains'; root.add(group);
  const inst = (g, m, n, name) => { const o = new THREE.InstancedMesh(g, m, n); o.name = name; o.count = 0; o.frustumCulled = false; o.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(o); return o; };
  const cars = Object.entries(geo).map(([k, g]) => inst(g, M[k], N, `metro-car-${k}`));
  const gaps = Object.entries(gapGeo).map(([k, g]) => inst(g, M[k], slots * (CAR.n - 1), `metro-gap-${k}`));
  const cabs = Object.entries(cabGeo).map(([k, g]) => inst(g, M[k], slots * 2, `metro-cab-${k}`));
  const heads = inst(lampGeo, M.head, slots * 2, 'metro-headlights'), tails = inst(lampGeo, M.tail, slots * 2, 'metro-taillights'), dests = inst(destGeo, M.dest, slots * 2, 'metro-dest');
  const leaves = inst(new THREE.BoxGeometry(0.05, DOOR_H, CAR.doorW / 2).translate(0, DOOR_H / 2, 0), M.leaf, N * CAR.doors.length * 4, 'metro-leaves');
  // the screens over the doors: one canvas a slot
  const screens = [];
  for (let i = 0; i < slots; i++) {
    const [c, x] = makeCanvas(1024, 384), t = tex(c, { repeat: false }); const mat = new THREE.MeshBasicMaterial({ map: t }); mat.color.setScalar(1.05); mat.userData.todSkip = true;
    const o = inst(new THREE.PlaneGeometry(0.66, 0.25), mat, CAR.n * CAR.doors.length * 2, `metro-screens-${i}`);
    screens.push({ c, x, t, o, key: '' });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
  const local = new THREE.Matrix4(), carM = [];
  let used = 0;
  return {
    group, M, FLOOR, slots,
    // a slot's train this frame: cars [{ x, y, z, heading, pitch }] (from engine/metroLine.js carAt), doors 0..1 (left side), screen info
    begin() { used = 0; for (const o of [...cars, ...gaps, ...cabs, heads, tails, dests, leaves]) o.count = 0; for (const s of screens) s.o.count = 0; },
    place(slot, carsAt, doors, screen) {
      used = Math.max(used, slot + 1);
      carM.length = 0;
      for (let k = 0; k < carsAt.length; k++) {
        const c = carsAt[k]; e.set(-c.pitch, c.heading, 0, 'YXZ'); q.setFromEuler(e); p.set(c.x, c.y, c.z);
        const mm = new THREE.Matrix4().compose(p, q, one); carM.push(mm);
        const idx = slot * CAR.n + k;
        for (const o of cars) { o.setMatrixAt(idx, mm); o.count = Math.max(o.count, idx + 1); }
        // the doors: the left side (+x) slides open; the right stays shut
        let li = idx * CAR.doors.length * 4;
        for (const d of CAR.doors) for (const s of [-1, 1]) for (const h of [-1, 1]) {
          const open = s > 0 ? doors : 0, off = h * (CAR.doorW / 4 + open * CAR.doorW / 2 * 0.98);
          local.makeTranslation(s * (W + 0.005 + open * 0.06), FLOOR, d + off); m4.multiplyMatrices(mm, local); leaves.setMatrixAt(li++, m4);
        }
        leaves.count = Math.max(leaves.count, li);
        // the screens over the doors, both sides, facing in
        const so = screens[slot].o; let si = k * CAR.doors.length * 2;
        for (const d of CAR.doors) for (const s of [-1, 1]) { local.compose(sc.set(s * (IN - 0.03), FLOOR + DOOR_H + 0.16, d), q.setFromEuler(e.set(0, -s * Math.PI / 2, 0)), one); m4.multiplyMatrices(mm, local); so.setMatrixAt(si++, m4); }
        so.count = Math.max(so.count, si);
      }
      for (let k = 0; k < carsAt.length - 1; k++) {
        const a = carsAt[k], c = carsAt[k + 1]; p.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2); q.setFromEuler(e.set(-(a.pitch + c.pitch) / 2, Math.atan2(a.x - c.x, a.z - c.z), 0, 'YXZ'));
        m4.compose(p, q, one); const idx = slot * (CAR.n - 1) + k; for (const o of gaps) { o.setMatrixAt(idx, m4); o.count = Math.max(o.count, idx + 1); }
      }
      // cabs: car 0's front, the last car's back (turned round); white lights ahead, red behind
      const ends = [[carM[0], 0], [carM[carM.length - 1], Math.PI]];
      ends.forEach(([mm, rot], j) => {
        local.makeRotationY(rot); m4.multiplyMatrices(mm, local); const idx = slot * 2 + j;
        for (const o of cabs) { o.setMatrixAt(idx, m4); o.count = Math.max(o.count, idx + 1); }
        for (const [o, xs] of [[j === 0 ? heads : tails, 1]]) { void xs; }
        const lamp = j === 0 ? heads : tails; let n = lamp.count;
        for (const s of [-1, 1]) { local.compose(sc.set(s * 0.95, 1.42, HALF + 0.81), q.identity(), one); const r = new THREE.Matrix4().makeRotationY(rot); const t2 = new THREE.Matrix4().multiplyMatrices(mm, r).multiply(local); if (n < lamp.instanceMatrix.count) { lamp.setMatrixAt(n++, t2); } }
        lamp.count = n;
        local.compose(sc.set(0, ROOF - 0.42, HALF + 0.42), q.setFromEuler(e.set(-0.78, 0, 0)), one); const r = new THREE.Matrix4().makeRotationY(rot); const t3 = new THREE.Matrix4().multiplyMatrices(mm, r).multiply(local); dests.setMatrixAt(dests.count, t3); dests.count++;
      });
      if (screen) this.screen(slot, screen);
    },
    // the screens' picture for a slot (redrawn when it changes; the current station blinks)
    screen(slot, info) {
      const s = screens[slot], key = `${info.dir}|${info.next}|${info.here}|${Math.floor(info.t * 2) % 2}`;
      if (key === s.key) return; s.key = key; carScreenTex(s.c, s.x, info); s.t.needsUpdate = true;
    },
    end() { for (const o of [...cars, ...gaps, ...cabs, heads, tails, dests, leaves]) o.instanceMatrix.needsUpdate = true; for (const s of screens) s.o.instanceMatrix.needsUpdate = true; },
    get used() { return used; },
  };
}
// a point in a car's frame -> world, and back (for whoever rides): car { x, y, z, heading }
export function carToWorld(c, lx, lz) { const ch = Math.cos(c.heading), sh = Math.sin(c.heading); return [c.x + lx * ch + lz * sh, c.z - lx * sh + lz * ch]; }
export function worldToCar(c, x, z) { const dx = x - c.x, dz = z - c.z, ch = Math.cos(c.heading), sh = Math.sin(c.heading); return [dx * ch - dz * sh, dx * sh + dz * ch]; }
export const CAR_IN = { half: HALF, x: IN - 0.05, seatX: IN - 0.44, floor: FLOOR, ceil: CEIL };
