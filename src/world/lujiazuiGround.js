// Lujiazui's ground: carriageways, pavements, lawns, the park's paths, kerbs, road markings and the
// kerb-side guard rails, meshed from the same functions the collisions use (world/lujiazuiLayout.js),
// so what you see is what you can stand on. The ground is sampled along scanlines (rays out from the
// roundabout's centre, then lines across Century Avenue); where two neighbouring scanlines disagree
// about what they cross, a scanline is put between them, until the gap is a few centimetres.
import * as THREE from 'three';
import { C, RING, ARMS, YIN, ZEBRAS, APPLE, METRO_LJZ, GREEN, LOOP, CANOPY, FLARE, AVE, CH, dirOf, fromAP, toAP, polar, bearingOf, carriage, zebra, inLake, inDistrict, inGreen, inPoly, PEARL_PARK, ROUTES } from './lujiazuiLayout.js';
import { PEARL } from './skyline.js';

const D2R = Math.PI / 180;
export const KIND = { void: 0, road: 1, pave: 2, grass: 3, path: 4 };
const segDist = (a, p, a0, p0, a1, p1) => { const da = a1 - a0, dp = p1 - p0, t = Math.max(0, Math.min(1, ((a - a0) * da + (p - p0) * dp) / (da * da + dp * dp))); return Math.hypot(a - a0 - da * t, p - p0 - dp * t); };
// the Green's paths (avenue frame): the loop round the lake, the corner plaza, the ways in, the canopy's pad
export const PARK_WAYS = [[372, -56, 404, -150], [560, -48, 548, -146], [655, -100, 572, -190], [CANOPY.a + 10, CANOPY.p, 384, -205]];
export function parkPath(a, p) {
  const h = Math.hypot(a - LOOP.a, p - LOOP.p), e = Math.hypot((a - LOOP.a) / LOOP.ra, (p - LOOP.p) / LOOP.rp);
  if (e > 0.5 && Math.abs(h * (1 - 1 / e)) < 2.0) return true;
  if (a < 392 && p > -96) return true;                                          // the paved corner by the junction
  if (Math.hypot(a - CANOPY.a, p - CANOPY.p) < 11) return true;
  for (const [a0, p0, a1, p1] of PARK_WAYS) if (segDist(a, p, a0, p0, a1, p1) < 1.9) return true;
  return false;
}
export function kindAt(x, z) {
  const ax = x - APPLE.x, az = z - APPLE.z;
  if (ax * ax + az * az < APPLE.rOut * APPLE.rOut) return KIND.void;                 // the Apple plaza (its own paving: lujiazuiBuild.js)
  for (let i = 0; i < METRO_LJZ.length; i++) { const m = METRO_LJZ[i], t = (x - m.top[0]) * m.dx + (z - m.top[1]) * m.dz; if (t >= 0 && t <= m.len && Math.abs(-(x - m.top[0]) * m.dz + (z - m.top[1]) * m.dx) <= m.hw) return KIND.void; }
  const dx = x - C.x, dz = z - C.z, r2 = dx * dx + dz * dz;
  if (r2 < RING.island * RING.island) return KIND.grass;
  const [a, p] = toAP(x, z);
  if (carriage(x, z)) return Math.abs(p) < 1.5 && ((a > 72 && a < 220) || (a > 260 && a < 790)) ? KIND.grass : KIND.road;   // (the avenue's planted median)
  if (a >= GREEN.a0 - 1 && a <= GREEN.a1 + 1 && p >= GREEN.p0 - 1 && p <= GREEN.p1 + 1 && inGreen(x, z)) return inLake(a, p) ? KIND.void : parkPath(a, p) ? KIND.path : KIND.grass;
  if (inPoly(PEARL_PARK, x, z)) return Math.hypot(x - PEARL.x, z - PEARL.z) < 64 ? KIND.path : KIND.grass;   // the Pearl's park
  if (p < -38 && p > -50 && a > 70 && a < YIN.a0 - 12) return KIND.grass;                // planting along the avenue's north side
  return KIND.pave;
}

const STEP = 1.0;
function segments(L) {
  const at = (t) => kindAt(L.ox + L.dx * t, L.oz + L.dz * t), out = [];
  let k = at(L.t0 + 1e-3), start = L.t0;
  for (let s = L.t0 + STEP; ; s += STEP) {
    const tt = Math.min(s, L.t1);
    if (at(tt) !== k) {
      let lo = Math.max(L.t0, s - STEP), hi = tt;
      for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; if (at(m) === k) lo = m; else hi = m; }
      out.push([start, hi, k]); start = hi; k = at(Math.min(L.t1, hi + 0.02));
    }
    if (tt >= L.t1) break;
  }
  out.push([start, L.t1, k]);
  return out;
}

export function buildGround() {
  const bufs = { 1: [], 2: [], 3: [], 4: [] }, kerb = [], rails = [];
  const Y = { 1: 0, 2: CH, 3: CH + 0.02, 4: CH + 0.012 };
  const tri = (buf, y, ax, az, bx, bz, cx, cz) => { if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0) buf.push(ax, y, az, cx, y, cz, bx, y, bz); else buf.push(ax, y, az, bx, y, bz, cx, y, cz); };
  const pt = (L, t) => [L.ox + L.dx * t, L.oz + L.dz * t];
  function join(A, B, mk, depth) {
    const sa = A.segs, sb = B.segs;
    if (sa.length !== sb.length || sa.some((s, i) => s[2] !== sb[i][2])) {
      if (depth < 7) { const M = mk((A.u + B.u) / 2); join(A, M, mk, depth + 1); join(M, B, mk, depth + 1); }
      return;
    }
    for (let i = 0; i < sa.length; i++) {
      const k = sa[i][2];
      if (k !== KIND.void) {
        const [x0, z0] = pt(A, sa[i][0]), [x1, z1] = pt(A, sa[i][1]), [x2, z2] = pt(B, sb[i][1]), [x3, z3] = pt(B, sb[i][0]);
        tri(bufs[k], Y[k], x0, z0, x1, z1, x2, z2); tri(bufs[k], Y[k], x0, z0, x2, z2, x3, z3);
      }
      if (i + 1 < sa.length) {                                // the edge between this and the next: a kerb, if one side is road
        const k2 = sa[i + 1][2], road = k === KIND.road ? 1 : k2 === KIND.road ? -1 : 0;
        if (road && k !== KIND.void && k2 !== KIND.void) {
          const [x0, z0] = pt(A, sa[i][1]), [x1, z1] = pt(B, sb[i][1]);
          kerb.push(x0, z0, x1, z1);
          const [rx0, rz0] = pt(A, sa[i][1] + road * 0.45), [rx1, rz1] = pt(B, sb[i][1] + road * 0.45);
          if ((k === KIND.road ? k2 : k) === KIND.pave) rails.push(rx0, rz0, rx1, rz1);
        }
      }
    }
  }
  // rays out from the roundabout's centre (as far as the line a = 140 along the avenue, 340 m elsewhere)
  const ray = (b) => { const [dx, dz] = dirOf(b), c = Math.cos((b - AVE) * D2R), L = { u: b, ox: C.x, oz: C.z, dx, dz, t0: 0, t1: c > 0.4118 ? 140 / c : 360 }; L.segs = segments(L); return L; };
  let prev = ray(0);
  for (let b = 0.5; b <= 360.001; b += 0.5) { const cur = ray(Math.min(360, b)); join(prev, cur, ray, 0); prev = cur; }
  // lines across the avenue, from a = 140 out east
  const [nx, nz] = dirOf(AVE + 90);
  const cross = (a) => { const [ox, oz] = fromAP(a, 0), L = { u: a, ox, oz, dx: nx, dz: nz, t0: -420, t1: 420 }; L.segs = segments(L); return L; };
  prev = cross(140);
  for (let a = 142; a <= 900.001; a += 2) { const cur = cross(a); join(prev, cur, cross, 0); prev = cur; }

  const geo = (arr) => {
    const g = new THREE.BufferGeometry(), n = arr.length / 3, pos = new Float32Array(arr), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { nor[i * 3 + 1] = 1; uv[i * 2] = pos[i * 3] / 2.4; uv[i * 2 + 1] = -pos[i * 3 + 2] / 2.4; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  };
  // kerb faces (granite, 15 cm) and the guard rails standing on the pavement side (a banded card)
  const kp = [], kn = [], ku = [];
  for (let i = 0; i < kerb.length; i += 4) {
    const [x0, z0, x1, z1] = kerb.slice(i, i + 4), l = Math.hypot(x1 - x0, z1 - z0) || 1, nxk = -(z1 - z0) / l, nzk = (x1 - x0) / l;
    kp.push(x0, 0, z0, x1, 0, z1, x1, CH + 0.02, z1, x0, 0, z0, x1, CH + 0.02, z1, x0, CH + 0.02, z0);
    for (let k = 0; k < 6; k++) kn.push(nxk, 0, nzk);
    ku.push(0, 0, l, 0, l, 0.1, 0, 0, l, 0.1, 0, 0.1);
  }
  const kg = new THREE.BufferGeometry();
  kg.setAttribute('position', new THREE.Float32BufferAttribute(kp, 3)); kg.setAttribute('normal', new THREE.Float32BufferAttribute(kn, 3)); kg.setAttribute('uv', new THREE.Float32BufferAttribute(ku, 2));
  const rp = [], rn = [], ru = [];
  for (let i = 0; i < rails.length; i += 4) {
    const [x0, z0, x1, z1] = rails.slice(i, i + 4), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (!railHere(mx, mz)) continue;
    const l = Math.hypot(x1 - x0, z1 - z0) || 1, tx = (x1 - x0) / l, tz = (z1 - z0) / l, u0 = x0 * tx + z0 * tz, u1 = u0 + l, y0 = CH, y1 = CH + 1.1;
    rp.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0);
    for (let k = 0; k < 6; k++) rn.push(-tz, 0, tx);
    ru.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('normal', new THREE.Float32BufferAttribute(rn, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2));
  return { road: geo(bufs[1]), pave: geo(bufs[2]), grass: geo(bufs[3]), path: geo(bufs[4]), kerb: kg, rails: rg, tris: (bufs[1].length + bufs[2].length + bufs[3].length + bufs[4].length) / 9 + kerb.length / 2 + rp.length / 9 };
}
// rails stand where you could otherwise step off the kerb: inside the district, not at a zebra's ends
function railHere(x, z) {
  if (!inDistrict(x, z)) return false;
  const [a, p] = toAP(x, z);
  for (const q of ZEBRAS) if (a > q.a0 - 0.8 && a < q.a1 + 0.8 && p > q.p0 - 0.8 && p < q.p1 + 0.8) return false;
  return true;
}
// the rail as a card: posts, a top and a bottom bar, thin uprights between (white steel, as on Shanghai's kerbs)
export function railTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 128); x.fillStyle = '#e9ecee';
  x.fillRect(0, 6, 256, 9); x.fillRect(0, 98, 256, 7);
  for (let i = 0; i < 256; i += 16) x.fillRect(i + 6, 12, 4, 90);
  x.fillStyle = '#cfd4d8'; x.fillRect(0, 0, 9, 128); x.fillRect(128, 0, 9, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(1 / 3, 1);
  return t;
}

// ---- paint: lane lines, the zebras, stop lines ----
export function buildMarkings() {
  const white = [], yellow = [], y = 0.014;
  const quad = (buf, x0, z0, x1, z1, w) => {
    const l = Math.hypot(x1 - x0, z1 - z0) || 1, px = -(z1 - z0) / l * w / 2, pz = (x1 - x0) / l * w / 2;
    buf.push(x0 - px, y, z0 - pz, x0 + px, y, z0 + pz, x1 + px, y, z1 + pz, x0 - px, y, z0 - pz, x1 + px, y, z1 + pz, x1 - px, y, z1 - pz);
  };
  // round the island: an edge line, dashed lane lines
  const arc = (buf, r, b0, b1, w) => { const n = Math.max(1, Math.round((b1 - b0) / 3)); for (let i = 0; i < n; i++) { const [x0, z0] = polar(b0 + (b1 - b0) * i / n, r), [x1, z1] = polar(b0 + (b1 - b0) * (i + 1) / n, r); quad(buf, x0, z0, x1, z1, w); } };
  arc(white, RING.island + 0.5, 0, 360, 0.15);
  for (const r of [28.8, 32.8]) { const stepDeg = 9 / r / D2R; for (let b = 0; b < 360; b += stepDeg) arc(white, r, b, b + stepDeg * 0.42, 0.14); }
  // the arms: a centre line (double yellow), lane dashes, a give-way line where each joins the roundabout
  for (const A of ARMS) {
    const P = (al, pe) => [C.x + A.dx * al + A.px * (pe + A.off), C.z + A.dz * al + A.pz * (pe + A.off)], far = A.id === 'century' ? 890 : A.len - 6;
    const lanes = A.id === 'century' ? [5.4, 9.2, 13] : A.hw > 11 ? [A.hw / 3, A.hw * 2 / 3] : [A.hw / 2 + 0.2];
    if (A.id !== 'century') for (const s of [-0.16, 0.16]) quad(yellow, ...P(FLARE + 4, s), ...P(far, s), 0.12);
    for (const side of [-1, 1]) {
      quad(white, ...P(FLARE + 2, side * (A.hw - 0.35)), ...P(far, side * (A.hw - 0.35)), 0.14);
      if (A.id === 'century') quad(white, ...P(74, side * 1.75), ...P(far, side * 1.75), 0.14);
      for (const ln of lanes) for (let al = FLARE + 6; al < far - 4; al += 12) { if (A.id === 'century' && al > YIN.a0 - 30 && al < YIN.a1 + 10) continue; quad(white, ...P(al, side * ln), ...P(al + 4.5, side * ln), 0.14); }
    }
    for (let pe = -A.hw + 1; pe < -0.6; pe += 1.2) quad(white, ...P(FLARE + 1.5, pe), ...P(FLARE + 1.5, pe + 0.7), 0.4);   // give way (inbound side)
  }
  // Yincheng Road and the junction
  const ap = (buf, a0, p0, a1, p1, w) => quad(buf, ...fromAP(a0, p0), ...fromAP(a1, p1), w);
  for (const s of [-1, 1]) { for (const d of [-0.16, 0.16]) ap(yellow, YIN.ac + d, s * 36, YIN.ac + d, s * 290, 0.12); for (const e of [YIN.a0 + 0.35, YIN.a1 - 0.35]) ap(white, e, s * 34, e, s * 290, 0.14); }
  for (const q of ZEBRAS) {
    if (q.id === 'z1') for (let a = q.a0 + 0.5; a < q.a1 - 0.5; a += 1.0) ap(white, a + 0.25, q.p0, a + 0.25, q.p1, 0.5);
    else for (let p = q.p0 + 0.5; p < q.p1 - 0.5; p += 1.0) { if (Math.abs(p + 0.25) < 1.4) continue; ap(white, q.a0, p + 0.25, q.a1, p + 0.25, 0.5); }
  }
  ap(white, YIN.a0 - 14.4, 1.8, YIN.a0 - 14.4, 16.6, 0.4); ap(white, YIN.a1 + 3.4, -1.8, YIN.a1 + 3.4, -16.6, 0.4);   // stop lines on the avenue
  ap(white, YIN.a0 + 0.4, -33.4, YIN.ac - 0.4, -33.4, 0.4); ap(white, YIN.ac + 0.4, 20.4, YIN.a1 - 0.4, 20.4, 0.4);
  const mk = (arr) => { const g = new THREE.BufferGeometry(), n = arr.length / 3, nor = new Float32Array(n * 3); for (let i = 0; i < n; i++) nor[i * 3 + 1] = 1; g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); return g; };
  return { white: mk(white), yellow: mk(yellow) };
}
export { zebra, ROUTES };
