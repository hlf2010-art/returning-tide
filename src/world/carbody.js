// Lofted car bodies: a car is a sequence of cross-sections from tail (t=0) to nose (t=1).
// Every profile below is a function of t, sampled into a smooth, closed mesh. Units: metres,
// origin at the centre of the footprint on the ground, nose toward +z.
import * as THREE from 'three';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// piecewise-linear lookup through [t, value] pairs, eased between points
export function curve(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t <= t1) { const [t0, v0] = points[i - 1]; const u = (t - t0) / (t1 - t0); return lerp(v0, v1, u * u * (3 - 2 * u)); }
    }
    return points[points.length - 1][1];
  };
}

// cross-section of the lower body at station t: closed ring, mirrored, from the underside up
function bodyRing(spec, t, M) {
  const half = spec.halfWidth(t), yb = spec.sill(t), ys = spec.belt(t), deck = spec.deck(t);
  const r = Math.min(0.16, (ys - yb) * 0.35) * spec.round(t);           // corner rounding
  const pts = [];
  // right half: bottom centre -> bottom corner -> side (slight barrel) -> shoulder -> deck centre
  const side = [];
  side.push([0, yb]);
  side.push([half - r, yb]);
  for (let i = 1; i <= 3; i++) { const a = (i / 3) * Math.PI / 2; side.push([half - r + Math.sin(a) * r, yb + r - Math.cos(a) * r]); }
  const barrel = spec.barrel || 0.03;
  for (let i = 1; i <= 4; i++) { const u = i / 5, y = lerp(yb + r, ys - r, u); side.push([half + Math.sin(u * Math.PI) * barrel - (spec.tumble(t) * 0.25) * u * u, y]); }
  const shoulder = half - spec.tumble(t) * 0.25;
  for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI / 2; side.push([shoulder - r + Math.cos(a) * r, ys - r + Math.sin(a) * r]); }
  side.push([shoulder * 0.55, lerp(ys, deck, 0.7)]);
  side.push([0, deck]);
  for (const p of side) pts.push(p);
  for (let i = side.length - 2; i >= 1; i--) pts.push([-side[i][0], side[i][1]]);
  return pts.slice(0, M);
}

function loft(rings, zs) {
  // rings: array of [[x,y],...] all same length; zs: station z. Builds a smooth closed tube + end caps.
  const n = rings[0].length, m = rings.length, pos = [], idx = [];
  for (let j = 0; j < m; j++) for (const [x, y] of rings[j]) pos.push(x, y, zs[j]);
  for (let j = 0; j < m - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n), c = (j + 1) * n + i, d = (j + 1) * n + ((i + 1) % n);
    idx.push(a, c, b, b, c, d);
  }
  // caps (fan from the ring centroid)
  for (const [j, flip] of [[0, true], [m - 1, false]]) {
    let cx = 0, cy = 0; for (const [x, y] of rings[j]) { cx += x; cy += y; }
    pos.push(cx / n, cy / n, zs[j]); const c = pos.length / 3 - 1;
    for (let i = 0; i < n; i++) { const a = j * n + i, b = j * n + ((i + 1) % n); if (flip) idx.push(c, a, b); else idx.push(c, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// greenhouse ring between the beltline and the roof at station t (only where t in [tC, tA])
function glassRing(spec, t) {
  const half = spec.halfWidth(t) - spec.tumble(t) * 0.25, ys = spec.belt(t), yr = spec.roof(t);
  const topHalf = half - spec.tumble(t);
  const pts = [];
  const right = [[half - 0.02, ys - 0.01], [lerp(half, topHalf, 0.5) + 0.01, lerp(ys, yr, 0.55)], [topHalf + 0.03, yr - 0.05], [topHalf * 0.6, yr - 0.005], [0, yr]];
  for (const p of right) pts.push(p);
  for (let i = right.length - 2; i >= 0; i--) pts.push([-right[i][0], right[i][1]]);
  return pts;
}

export function buildCarBody(spec) {
  const L = spec.length, N = 44, zs = [], ring = [], glassRings = [], gz = [];
  for (let j = 0; j < N; j++) {
    const t = j / (N - 1);
    zs.push(lerp(-L / 2, L / 2, t));
    ring.push(bodyRing(spec, t, 40));
  }
  const nG = 24;
  for (let j = 0; j < nG; j++) {
    const t = lerp(spec.tC, spec.tA, j / (nG - 1));
    gz.push(lerp(-L / 2, L / 2, t)); glassRings.push(glassRing(spec, t));
  }
  return { body: loft(ring, zs), glass: loft(glassRings, gz) };
}

// A strip of light following the body surface across the car at station t, height y (ends inset).
export function lightStrip(spec, t, y, { x0 = -1, x1 = 1, thick = 0.018, inset = 0.03 } = {}) {
  const L = spec.length, z = lerp(-L / 2, L / 2, t), half = spec.halfWidth(t) - inset;
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, x = lerp(x0 * half, x1 * half, u);
    // the strip wraps slightly around the corners: pull z back near the edges
    const edge = Math.pow(Math.abs(x) / Math.max(half, 1e-3), 4);
    const dz = (t > 0.5 ? -1 : 1) * edge * 0.12;
    pts.push(new THREE.Vector3(x, y, z + dz + (t > 0.5 ? 0.012 : -0.012)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, thick, 6, false);
}
export { smooth, lerp };

// Everything that makes a body read as a car: flush wheels in dark wheel wells, a body-coloured
// roof over the glass (pillars), mirrors, the roof LiDAR, dark lower cladding, light signatures.
// Returns { group, wheels: [Object3D pivots], tailMat, brakeMat, headMat } for the traffic renderer.
export function assembleCar(spec, { paintMat, glassMat, trimMat, headMat, tailMat, brakeMat, wheelFactory }) {
  const g = new THREE.Group();
  const { body, glass } = buildCarBody(spec);
  g.add(new THREE.Mesh(body, paintMat), new THREE.Mesh(glass, glassMat));
  const L = spec.length, zAt = (t) => lerp(-L / 2, L / 2, t), tAt = (z) => (z + L / 2) / L;
  // roof skin: body colour (or black) panel over the top of the glass, leaving the side glass visible
  const roofPts = [], roofZ = [];
  const nR = 18;
  for (let j = 0; j < nR; j++) {
    const t = lerp(spec.tC + (spec.tA - spec.tC) * 0.18, spec.tA - (spec.tA - spec.tC) * 0.2, j / (nR - 1));
    const half = spec.halfWidth(t) - spec.tumble(t) * 0.25 - spec.tumble(t) + 0.02, y = spec.roof(t) + 0.012;
    roofPts.push([[half, y - 0.06], [half * 0.6, y], [0, y + 0.008], [-half * 0.6, y], [-half, y - 0.06], [-half * 0.6, y - 0.03], [0, y - 0.03], [half * 0.6, y - 0.03]]);
    roofZ.push(zAt(t));
  }
  g.add(new THREE.Mesh(loftOpen(roofPts, roofZ), spec.blackRoof ? trimMat : paintMat));
  // wheels: flush with the body side, in dark wheel wells
  const R = spec.wheelD / 2, fz = L / 2 - spec.frontOverhang, wheels = [];
  for (const z of [fz, fz - spec.wheelbase]) {
    const half = spec.halfWidth(tAt(z));
    for (const sx of [-1, 1]) {
      // wheel well: a dark half-disc over the top of the tyre, on the body side
      const shape = new THREE.Shape(); const RW = R + 0.06;
      shape.moveTo(-RW, 0); for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; shape.lineTo(Math.cos(a) * RW, Math.sin(a) * RW); } shape.lineTo(-RW, 0);
      const well = new THREE.Mesh(new THREE.ShapeGeometry(shape), trimMat);
      well.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;        // shape's x -> car's z, normal -> +-x
      well.position.set(sx * (half + 0.006), R - 0.02, z);
      g.add(well);
      const w = wheelFactory(); w.position.set(sx * (half - 0.1), R, z); w.rotation.y = sx < 0 ? Math.PI : 0;
      g.add(w); wheels.push(w);
    }
  }
  // lower cladding band (rocker panels) between the wells
  const ySill = spec.sill(0.5);
  for (const sx of [-1, 1]) {
    const len = spec.wheelbase - 2 * R - 0.2, half = spec.halfWidth(0.5);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, len), trimMat); c.position.set(sx * (half + 0.005), ySill + 0.07, fz - spec.wheelbase / 2); g.add(c);
  }
  // window-base trim: a thin bright line along the beltline from C- to A-pillar, both sides
  if (spec.beltTrim !== false) for (const sx of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 20; i++) { const t = lerp(spec.tC + 0.01, spec.tA - 0.005, i / 20); pts.push(new THREE.Vector3(sx * (spec.halfWidth(t) - spec.tumble(t) * 0.25 + 0.004), spec.belt(t) + 0.004, zAt(t))); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.009, 5, false), spec.trimBright ? headMat.userData.chrome || trimMat : trimMat));
  }
  // mirrors at the base of the A-pillar
  const tM = spec.tA - 0.015, hm = spec.halfWidth(tM);
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.08), trimMat); m.position.set(sx * (hm + 0.04), spec.belt(tM) + 0.1, zAt(tM)); g.add(m); }
  // roof LiDAR pod above the windscreen header
  const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 4, 8), trimMat); pod.rotation.z = Math.PI / 2;
  pod.position.set(0, spec.roof(spec.lidar) + 0.05, zAt(spec.lidar)); g.add(pod);
  // lights
  for (const h of spec.head) g.add(new THREE.Mesh(lightStrip(spec, h.t, h.y, h), headMat));
  for (const h of spec.tail) g.add(new THREE.Mesh(lightStrip(spec, h.t, h.y, h), tailMat));
  const third = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.025, 0.02), brakeMat);
  third.position.set(0, spec.roof(spec.tC + 0.03) - 0.02, zAt(spec.tC + 0.02)); g.add(third);
  // dark lower front intake / rear diffuser
  for (const [t, y, w] of [[0.996, spec.sill(1) + 0.08, 0.7], [0.004, spec.sill(0) + 0.06, 0.8]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(spec.halfWidth(t) * 2 * w, 0.1, 0.04), trimMat); b.position.set(0, y, zAt(t)); g.add(b);
  }
  return { group: g, wheels };
}

function loftOpen(rings, zs) {
  const n = rings[0].length, m = rings.length, pos = [], idx = [];
  for (let j = 0; j < m; j++) for (const [x, y] of rings[j]) pos.push(x, y, zs[j]);
  for (let j = 0; j < m - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n), c = (j + 1) * n + i, d = (j + 1) * n + ((i + 1) % n);
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
