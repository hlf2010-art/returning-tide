// Lujiazui, Pudong: where things are. Pure data and pure functions (no three.js), so the ground,
// the collisions and the traffic routes can be tested in node (tests/lujiazui.test.mjs). The visuals
// are world/lujiazui.js.
//
// ---- reference geography (WGS84) and how it is laid into the game ----
// The network was blocked in the session this was built in (OpenStreetMap's Overpass and Nominatim,
// Wikipedia and Wikidata all refused by the egress proxy), so no footprints could be fetched. The
// figures below are published point coordinates and dimensions as recalled and as returned by web
// search snippets; everything marked ~ is an estimate from memory of the map. See docs/lujiazui.md.
//   Oriental Pearl Tower            31.2417 N, 121.4951 E   (anchor: the skyline's PEARL at x 640, z -42)
//   Mingzhu Ring (明珠环) centre     31.2400 N, 121.4961 E   Structurae gives the bridge's two ends as
//                                    31°14'24.19"N 121°29'43.80"E and 31°14'23.99"N 121°29'48.05"E
//                                    (112 m apart, east-west): diameter ca. 110 m, deck 9 m wide;
//                                    about 5.5 m above the street
//   Shanghai IFC (国金中心)          31.2385 N, 121.4970 E   8 Century Avenue; towers 259.9 m and 249.9 m
//   Apple Pudong                     in the sunken court on IFC's roundabout side; glass cylinder 13 m
//   Jin Mao Tower                    31.2372 N, 121.5014 E   420.5 m
//   Shanghai World Financial Center  31.2367 N, 121.5028 E   492 m
//   Shanghai Tower                   31.2356 N, 121.5011 E   632 m
//   Lujiazui Central Green           ~31.2398 N, 121.5000 E  about 10 ha
//   Century Avenue                   leaves the roundabout east-south-east, bearing ~115°
// Game frame: x east, y up, z south, 1 unit = 1 m, true north = -z (the game's Bund runs due north-
// south; the real one bears a few degrees east of north here: ignored).
//   x = 640 + (lon - 121.4951) * 95200        z = -42 - (lat - 31.2417) * 110900
// which puts the ring's centre at (735, 147), IFC at about (821, 313), Jin Mao at (1240, 457), the World
// Financial Center at (1374, 513) and the Shanghai Tower at (1212, 635). The far skyline seen from the
// Bund (world/skyline.js) keeps its own compressed arrangement; when you are in Pudong the three
// supertalls are moved to these positions and the generic far towers give way to this district's own.
import { movers } from './layout.js';

const D2R = Math.PI / 180;
export const C = { x: 735, z: 147 };                          // the roundabout's centre
// a compass bearing (degrees clockwise from north) as a unit vector in (x, z)
export const dirOf = (b) => [Math.sin(b * D2R), -Math.cos(b * D2R)];
export const polar = (b, r, o = C) => [o.x + r * Math.sin(b * D2R), o.z - r * Math.cos(b * D2R)];
export const bearingOf = (x, z, o = C) => { const b = Math.atan2(x - o.x, -(z - o.z)) / D2R; return b < 0 ? b + 360 : b; };
export const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
// Century Avenue's frame: a = metres along the avenue from the roundabout's centre, p = metres to the
// right of it (south side positive)
export const AVE = 114.7;
const [UX, UZ] = dirOf(AVE), [NX, NZ] = dirOf(AVE + 90);
export const toAP = (x, z) => [(x - C.x) * UX + (z - C.z) * UZ, (x - C.x) * NX + (z - C.z) * NZ];
export const fromAP = (a, p) => [C.x + a * UX + p * NX, C.z + a * UZ + p * NZ];
export const AVE_ROT = Math.atan2(UZ, UX);                    // the avenue's direction as a rotation of the x axis toward z

export const CH = 0.15;                                       // kerb height (as on the Bund)
// the roundabout and the ring bridge over it
export const RING = { island: 26, road: 44, r0: 45.5, r1: 54.5, rc: 50, y: 5.5, thick: 0.9 };
// the roads that meet at the roundabout (bearing, half-width of carriageway, drawn length, how far you can walk)
export const ARMS = [
  { id: 'century', b: AVE, hw: 16, len: 800, zh: '世纪大道', en: 'Century Avenue' },
  { id: 'ringNE', b: 50, hw: 10, len: 300, zh: '陆家嘴环路', en: 'Lujiazui Ring Rd' },
  { id: 'fenghe', b: 355, hw: 8, len: 300, zh: '丰和路', en: 'Fenghe Rd' },
  { id: 'west', b: 268, hw: 10, len: 300, zh: '陆家嘴西路', en: 'Lujiazui Rd W' },
  { id: 'ringS', b: 192, hw: 10, len: 320, zh: '陆家嘴环路', en: 'Lujiazui Ring Rd' },
].map((a) => { const [dx, dz] = dirOf(a.b), [px, pz] = dirOf(a.b + 90); return { ...a, dx, dz, px, pz }; });
// Yincheng Middle Road crosses the avenue (drawn square to it) at a = 245
export const YIN = { a0: 236, a1: 254, ac: 245, len: 300 };
// the two signalled zebras at that junction: Z1 across Yincheng (north side), Z2 across the avenue
export const ZEBRAS = [{ id: 'z1', a0: 236, a1: 254, p0: -29.5, p1: -23.5 }, { id: 'z2', a0: 225, a1: 231.5, p0: -16, p1: 16 }];
// columns under the ring (bearings chosen clear of the carriageways)
export const COLUMNS = [15, 28, 72, 84, 147, 171, 214, 247, 290, 336];
// the "Oriental Floating Court" spur toward IFC and the Apple court (a wide deck, then stairs down)
export const SPUR = { b: 148, s0: 50, s1: 62, hw: 7 };
// stairs and escalators down from the deck: top (deck level) and bottom (pavement) points
function ramp(b, rTop, rBot, hw, kind) {
  const [tx, tz] = polar(b, rTop), [bx, bz] = polar(b, rBot), run = rBot - rTop, [dx, dz] = dirOf(b), [px, pz] = dirOf(b + 90);
  return { b, kind, hw, run, top: [tx, tz], bot: [bx, bz], dx, dz, px, pz, y0: CH, y1: RING.y };
}
export const RAMPS = [...[22, 82, 230, 312].map((b) => ramp(b, RING.r1, RING.r1 + 13, 3.0, 'ring')), ramp(SPUR.b, SPUR.s1, SPUR.s1 + 12, 3.5, 'spur')];

// Apple Pudong: a sunken round court, the glass cylinder at its centre, the spiral glass stair inside
// it down to the store under the court. Angles are measured clockwise from the court's entry (which
// faces the roundabout).
const [APX, APZ] = polar(148, 100);
export const APPLE = {
  x: APX, z: APZ, entry: 328, rPlaza: 17, rOut: 21.5, rail: 21.9, yPlaza: -5.2, yStore: -10, rCyl: 5, rCore: 1.7, cylH: 12.5, storeR: 15,
  stairs: { top: 10, foot: 100, land: 113, open: [101, 111.5] },          // the two curved stairs round the court: degrees either side of the entry
  spiral: { start: 25, total: 400, drop: 4.8, r0: 1.95, r1: 4.35 }, landing: [-40, 25], door: 13.5, foot: [57, 88],
  tables: [[140, 10], [185, 10.5], [230, 10], [275, 10.5], [320, 10], [5, 10.5], [112, 10.5]].map(([ang, r]) => ({ ang, r })),   // the store's tables (each along a radius)
};
export const appleAng = (x, z) => wrap180(bearingOf(x, z, APPLE) - APPLE.entry);
export const applePt = (ang, r) => polar(APPLE.entry + ang, r, APPLE);

// Lujiazui station's stairwells (Line 2; Line 14 since 2021). top: the street end; d: the way down.
function well(exit, top, d, name) { const [dx, dz] = d, l = Math.hypot(dx, dz); return { exit, top, dx: dx / l, dz: dz / l, run: 9.6, len: 11.2, hw: 1.8, depth: 4.6, name }; }
export const METRO_LJZ = [
  well(6, fromAP(112, 24), [UX, UZ], { zh: '国金中心', en: 'IFC' }),
  well(2, fromAP(96, -27), [UX, UZ], { zh: '世纪大道北侧', en: 'Century Ave, north side' }),
  well(1, polar(298, 89), dirOf(298 + 180), { zh: '东方明珠 · 正大广场', en: 'Oriental Pearl · Super Brand Mall' }),
];
export const wellLocal = (m, x, z) => [(x - m.top[0]) * m.dx + (z - m.top[1]) * m.dz, -(x - m.top[0]) * m.dz + (z - m.top[1]) * m.dx];
export const wellPt = (m, t, l = 0) => [m.top[0] + m.dx * t - m.dz * l, m.top[1] + m.dz * t + m.dx * l];

// ---- buildings: oriented boxes (cx, cz, rot of the local x axis from +x toward +z, half sizes, height) ----
const W148 = dirOf(148), ROT148 = Math.atan2(W148[1], W148[0]);
const obox = (id, cx, cz, rot, hx, hz, h, extra = {}) => ({ id, cx, cz, rot, c: Math.cos(rot), s: Math.sin(rot), hx, hz, h, ...extra });
const apBox = (id, a, p, ha, hp, h, extra) => { const [x, z] = fromAP(a, p); return obox(id, x, z, AVE_ROT, ha, hp, h, extra); };
const polBox = (id, b, r, hr, ht, h, extra) => { const [x, z] = polar(b, r), d = dirOf(b); return obox(id, x, z, Math.atan2(d[1], d[0]), hr, ht, h, extra); };
export const IFC = {
  north: apBox('ifc-n', 176, 56, 25, 25, 259.9),
  south: obox('ifc-s', APPLE.x + 77.9 * W148[0] + 49.8 * -W148[1], APPLE.z + 77.9 * W148[1] + 49.8 * W148[0], 0, 25, 25, 249.9),
  podium: obox('ifc-mall', APPLE.x + 66 * W148[0], APPLE.z + 66 * W148[1], ROT148, 40, 44, 30),
};
export const BUILDINGS = [
  IFC.podium, IFC.north, IFC.south,
  polBox('superbrand', 230, 137, 42, 62, 52, { name: { zh: '正大广场', en: 'Super Brand Mall' } }),
  polBox('north-tower', 22, 140, 24, 24, 190),
  polBox('boc', 80, 150, 23, 23, 226, { name: { zh: '中银大厦', en: 'Bank of China Tower' } }),
  apBox('bocom', 195, -86, 22, 28, 230),
  apBox('row-1', 325, -47, 28, 17, 96), apBox('row-2', 405, -47, 28, 17, 120), apBox('row-3', 490, -47, 28, 17, 84),
  apBox('south-1', 330, 76, 30, 30, 150), apBox('south-2', 440, 80, 30, 30, 120),
];

// ---- the Central Green ----
export const GREEN = { a0: 264, a1: 547, p0: -300, p1: -66 };
export const LAKE = [{ a: 432, p: -188, ra: 60, rp: 36 }, { a: 384, p: -214, ra: 30, rp: 22 }];
export const inLake = (a, p, grow = 0) => LAKE.some((l) => ((a - l.a) / (l.ra + grow)) ** 2 + ((p - l.p) / (l.rp + grow)) ** 2 < 1);
export const CANOPY = { a: 318, p: -150 };                     // the white tensile canopy on the lawn's west side
// the loop path round the lake (an ellipse in the avenue's frame) and the ways in
export const LOOP = { a: 420, p: -192, ra: 92, rp: 66 };
export const loopPt = (t) => [LOOP.a + LOOP.ra * Math.cos(t), LOOP.p + LOOP.rp * Math.sin(t)];
export const BENCHES = [0.35, 0.9, 1.55, 2.3, 2.9, 3.7, 4.4, 5.1, 5.8].map((t) => { const [a, p] = [LOOP.a + (LOOP.ra + 2.6) * Math.cos(t), LOOP.p + (LOOP.rp + 2.6) * Math.sin(t)]; const [x, z] = fromAP(a, p); return { x, z, a, p, t }; });

// ---- roads ----
export const FLARE = 58;                                      // an arm's mouth widens from here in to the roundabout (0.42 m a side per metre)
export function carriage(x, z) {
  const dx = x - C.x, dz = z - C.z;
  if (dx * dx + dz * dz < RING.road * RING.road) return true;
  for (let i = 0; i < ARMS.length; i++) {                     // each arm, flared where it meets the roundabout
    const A = ARMS[i], al = dx * A.dx + dz * A.dz;
    if (al > 0 && al < A.len && Math.abs(dx * A.px + dz * A.pz) < A.hw + (al < FLARE ? (FLARE - al) * 0.42 : 0)) return true;
  }
  const a = dx * UX + dz * UZ, p = dx * NX + dz * NZ;
  return a > YIN.a0 && a < YIN.a1 && Math.abs(p) < YIN.len;
}
export function zebra(x, z) {
  const [a, p] = toAP(x, z);
  for (const q of ZEBRAS) if (a >= q.a0 && a <= q.a1 && p >= q.p0 && p <= q.p1) return q.id;
  return null;
}
// where you can walk at street level (before buildings, roads and the lake are taken out)
export function inDistrict(x, z) {
  const dx = x - C.x, dz = z - C.z, r = Math.hypot(dx, dz);
  if (r <= 125) { const b = bearingOf(x, z); return !(r > 98 && b > 274 && b < 349); }            // (the Pearl's park is fenced)
  const a = dx * UX + dz * UZ, p = dx * NX + dz * NZ;
  if (a >= 30 && a <= 560 && p >= -40 && p <= 34) return true;                                     // the avenue and its pavements
  if (a >= 30 && a <= 236 && p >= 16 && p <= 108) return true;                                     // IFC's forecourt
  if (a >= 254 && a <= 298 && p >= -66 && p <= 34) return true;                                    // across Yincheng Road: the Green's corner
  if (a >= 520 && a <= 547 && p >= -66 && p <= -40) return true;                                   // the Green's east gate
  return a >= GREEN.a0 && a <= GREEN.a1 && p >= GREEN.p0 && p <= GREEN.p1;
}
const blocked = (x, z) => !inDistrict(x, z) || (carriage(x, z) && !zebra(x, z)) || inLake(...toAP(x, z));

// ---- the deck ----
const SP = { d: dirOf(SPUR.b), p: dirOf(SPUR.b + 90) };
const spurLocal = (x, z) => [(x - C.x) * SP.d[0] + (z - C.z) * SP.d[1], (x - C.x) * SP.p[0] + (z - C.z) * SP.p[1]];
export function onDeck(x, z) {
  const r = Math.hypot(x - C.x, z - C.z);
  if (r >= RING.r0 && r <= RING.r1) return true;
  if (r > RING.r1 && r < 70) { const [s, l] = spurLocal(x, z); return s >= SPUR.s0 && s <= SPUR.s1 && Math.abs(l) <= SPUR.hw; }
  return false;
}
// t: metres from the top along the way down; l: metres to the side
const rampLocal = (R, x, z) => [(x - R.top[0]) * R.dx + (z - R.top[1]) * R.dz, (x - R.top[0]) * R.px + (z - R.top[1]) * R.pz];

// ---- the ground ----
function spiralY(ang, y) {
  const S = APPLE.spiral, rel = (((ang - S.start) % 360) + 360) % 360;
  let best = APPLE.yStore, bd = ang > S.start + S.total - 360 && ang <= APPLE.foot[1] ? Math.abs(APPLE.yStore - y) : 1e9;   // (the store's floor: only past the stair's last step)
  const tryH = (h) => { const d = Math.abs(h - y); if (d < bd) { bd = d; best = h; } };
  tryH(APPLE.yPlaza - S.drop * rel / S.total);
  if (rel + 360 <= S.total) tryH(APPLE.yPlaza - S.drop * (rel + 360) / S.total);
  if (ang >= APPLE.landing[0] && ang <= APPLE.landing[1]) tryH(APPLE.yPlaza);
  return best;
}
export function courtStairY(absAng) {
  const S = APPLE.stairs;
  return absAng <= S.top ? CH : absAng >= S.foot ? APPLE.yPlaza : CH + (APPLE.yPlaza - CH) * (absAng - S.top) / (S.foot - S.top);
}
export function ljzGround(x, z, y = 0) {
  if (!(x > 500 && x < 1500 && z > -260 && z < 780) || y > 60) return null;      // not here (the 32nd floor is destinations.js's)
  const ax = x - APPLE.x, az = z - APPLE.z, ra2 = ax * ax + az * az;
  if (ra2 < APPLE.rOut * APPLE.rOut) {
    const ra = Math.sqrt(ra2), ang = appleAng(x, z);
    if (ra < APPLE.rCyl) return y > -0.6 ? APPLE.yPlaza : spiralY(ang, y);
    if (ra < APPLE.rPlaza) return y < -7.6 && ra < APPLE.storeR + 0.5 ? APPLE.yStore : APPLE.yPlaza;
    return Math.abs(ang) <= APPLE.stairs.land ? courtStairY(Math.abs(ang)) : CH;
  }
  for (let i = 0; i < METRO_LJZ.length; i++) {
    const m = METRO_LJZ[i], t = (x - m.top[0]) * m.dx + (z - m.top[1]) * m.dz;
    if (t < 0 || t > m.len) continue;
    if (Math.abs(-(x - m.top[0]) * m.dz + (z - m.top[1]) * m.dx) > m.hw) continue;
    return t >= m.run ? -m.depth : CH - (CH + m.depth) * (t / m.run);
  }
  if (y > 3.4 && onDeck(x, z)) return RING.y;
  for (let i = 0; i < RAMPS.length; i++) {
    const R = RAMPS[i], t = (x - R.top[0]) * R.dx + (z - R.top[1]) * R.dz;
    if (t < 0 || t > R.run) continue;
    if (Math.abs((x - R.top[0]) * R.px + (z - R.top[1]) * R.pz) > R.hw) continue;
    return R.y1 + (R.y0 - R.y1) * (t / R.run);
  }
  return carriage(x, z) ? 0 : CH;
}

// ---- collisions ----
// Solid things at street level: the buildings, the stairwells' walls, benches, planters ... (boxes),
// and columns, trunks, posts (circles). The visuals add theirs (addBox / addCircle).
export const boxes = [...BUILDINGS];
export const circles = [];
export const addBox = (cx, cz, rot, hx, hz, extra = {}) => { const b = obox(extra.id || 'box', cx, cz, rot, hx, hz, 0, extra); boxes.push(b); return b; };
export const addCircle = (x, z, r, extra = {}) => { const c = { x, z, r, ...extra }; circles.push(c); return c; };
for (const b of COLUMNS) { const [x, z] = polar(b, RING.rc); addCircle(x, z, 0.75, { y1: 5 }); }
for (const m of METRO_LJZ) {                                  // each stairwell: walls on both sides and at the far end
  const rot = Math.atan2(m.dz, m.dx);
  for (const s of [-1, 1]) { const [x, z] = wellPt(m, m.len / 2, s * (m.hw + 0.12)); addBox(x, z, rot, m.len / 2 + 0.24, 0.12, { id: 'metro-wall' }); }
  const [x, z] = wellPt(m, m.len + 0.12, 0); addBox(x, z, rot, 0.12, m.hw + 0.24, { id: 'metro-wall' });
}
const RAD = 0.36;
function pushBox(p, B, rad) {
  const dx = p.x - B.cx, dz = p.z - B.cz;
  let lx = dx * B.c + dz * B.s, lz = -dx * B.s + dz * B.c;
  if (Math.abs(lx) > B.hx + rad || Math.abs(lz) > B.hz + rad) return false;
  const qx = lx < -B.hx ? -B.hx : lx > B.hx ? B.hx : lx, qz = lz < -B.hz ? -B.hz : lz > B.hz ? B.hz : lz;
  const ex = lx - qx, ez = lz - qz, d2 = ex * ex + ez * ez;
  if (d2 >= rad * rad) return false;
  if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (rad - d) / d; lx += ex * k; lz += ez * k; }
  else {                                                      // centre inside: out through the nearest face
    const l = lx + B.hx, r = B.hx - lx, n = lz + B.hz, s = B.hz - lz, m = Math.min(l, r, n, s);
    if (m === l) lx = -B.hx - rad; else if (m === r) lx = B.hx + rad; else if (m === n) lz = -B.hz - rad; else lz = B.hz + rad;
  }
  p.x = B.cx + lx * B.c - lz * B.s; p.z = B.cz + lx * B.s + lz * B.c;
  return true;
}
// keep a point at radius [lo, hi] from a centre
function clampR(p, o, lo, hi) {
  const dx = p.x - o.x, dz = p.z - o.z, r = Math.hypot(dx, dz) || 1e-6;
  const k = r < lo ? lo / r : r > hi ? hi / r : 1;
  if (k !== 1) { p.x = o.x + dx * k; p.z = o.z + dz * k; }
}
// put a point at a given court angle (same radius)
function setAppleAng(p, ang) { const r = Math.hypot(p.x - APPLE.x, p.z - APPLE.z), [x, z] = applePt(ang, r); p.x = x; p.z = z; }

// what the body is on (a bridge stair, down in the Apple court), remembered from step to step
const S = { x: NaN, z: NaN, y: 0, ramp: -1, pit: false };
export const ljzState = S;
function infer(b) {
  S.ramp = -1; S.pit = false;
  for (let i = 0; i < RAMPS.length; i++) { const [t, l] = rampLocal(RAMPS[i], b.x, b.z); if (t >= 0 && t <= RAMPS[i].run && Math.abs(l) < RAMPS[i].hw) S.ramp = i; }
  const ra = Math.hypot(b.x - APPLE.x, b.z - APPLE.z);
  if (ra < APPLE.rOut + 0.2 && (ra < APPLE.rPlaza + 0.2 || Math.abs(appleAng(b.x, b.z)) <= APPLE.stairs.land)) S.pit = true;
}
function keepPit(b) {
  const A = APPLE, T = A.stairs;
  let ra = Math.hypot(b.x - A.x, b.z - A.z), ang = appleAng(b.x, b.z), aa = Math.abs(ang);
  if (b.y < -9.0) {                                           // ---- the store, under the court
    if (ra < A.rCyl + 0.1) {                                  // at the foot of the spiral stair, inside its drum
      clampR(b, A, A.spiral.r0, ang >= A.foot[0] && ang <= A.foot[1] ? 99 : A.spiral.r1);
      if (ang > A.foot[1] || ang < -120) setAppleAng(b, A.foot[1]);
    } else if (ra < A.rCyl + RAD + 0.15 && !(ang >= A.foot[0] && ang <= A.foot[1])) clampR(b, A, A.rCyl + RAD + 0.15, 99);
    clampR(b, A, 0, A.storeR - RAD);
    for (const t of A.tables) for (const k of [-1, 0, 1]) { const [x, z] = applePt(t.ang, t.r + k * 1.05), dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz); if (d < 0.75 + RAD && d > 1e-6) { b.x = x + dx / d * (0.75 + RAD); b.z = z + dz / d * (0.75 + RAD); } }
    return;
  }
  if (ra < A.rCyl) {                                          // ---- inside the glass cylinder
    clampR(b, A, A.spiral.r0, A.rCyl - RAD - 0.1 + (aa < A.door && b.y > -5.6 ? 1.5 : 0));
    if (b.y > -5.45 && ang < A.landing[0]) setAppleAng(b, A.landing[0]);            // the landing's back rail
    if (b.y <= -5.45) clampR(b, A, A.spiral.r0, A.spiral.r1);
    return;
  }
  if (ra < A.rPlaza) {                                        // ---- the court's floor
    if (ra < A.rCyl + RAD + 0.1 && aa > A.door) clampR(b, A, A.rCyl + RAD + 0.1, 99);       // the glass, but for its door
    const open = aa >= T.open[0] && aa <= T.open[1];
    if (!open) clampR(b, A, 0, A.rPlaza - RAD);
    return;
  }
  // ---- the curved stairs and their landings (17 .. 21.5 m out)
  const open = aa >= T.open[0] && aa <= T.open[1];
  if (aa > T.land - 1) { setAppleAng(b, Math.sign(ang) * (T.land - 1)); }
  if (ra > A.rOut - 0.3) { if (aa <= T.top) { if (ra > A.rail) S.pit = false; } else clampR(b, A, 0, A.rOut - 0.3); }
  if (ra < A.rPlaza + 0.3 && !open) clampR(b, A, A.rPlaza + 0.3, 99);
}
function keepRamp(b) {
  const R = RAMPS[S.ramp], [t, l] = rampLocal(R, b.x, b.z);
  if (t < -0.05 || t > R.run + 0.05) { S.ramp = -1; return false; }
  const lim = R.hw - 0.3;
  if (Math.abs(l) > lim) { const k = (l > 0 ? lim : -lim) - l; b.x += R.px * k; b.z += R.pz * k; }
  return true;
}
function keepDeck(b) {
  const r = Math.hypot(b.x - C.x, b.z - C.z);
  if (r < RING.r0 + 0.3) { clampR(b, C, RING.r0 + 0.3, 999); return; }
  if (r <= RING.r1 - 0.3) return;
  // at the outer rail: open where a stair leaves, and where the spur's deck goes on
  for (let i = 0; i < RAMPS.length; i++) {
    const R = RAMPS[i]; if (R.kind !== 'ring') continue;
    const [t, l] = rampLocal(R, b.x, b.z);
    if (Math.abs(l) < R.hw - 0.25 && t > -3) { if (t >= 0) S.ramp = i; return; }
  }
  const [s, l] = spurLocal(b.x, b.z);
  if (s > 0 && Math.abs(l) <= SPUR.hw) {
    const lim = SPUR.hw - 0.3, R = RAMPS[RAMPS.length - 1];
    if (r > RING.r1 + 0.3 && Math.abs(l) > lim) { const k = (l > 0 ? lim : -lim) - l; b.x += SP.p[0] * k; b.z += SP.p[1] * k; }
    if (s > SPUR.s1 - 0.3) { if (Math.abs(l) < R.hw - 0.25) { if (s >= SPUR.s1) S.ramp = RAMPS.length - 1; } else { const k = SPUR.s1 - 0.3 - s; b.x += SP.d[0] * k; b.z += SP.d[1] * k; } }
    return;
  }
  clampR(b, C, 0, RING.r1 - 0.3);
}
export function ljzKeep(b) {
  if (!(b.x > 520) || b.y > 60) { S.x = NaN; return; }
  if (!(Math.hypot(b.x - S.x, b.z - S.z) < 2.5)) infer(b);     // arrived here (or teleported): where are we?
  step(b);
  S.x = b.x; S.z = b.z; S.y = b.y;
}
function step(b) {
  const A = APPLE, ra = Math.hypot(b.x - A.x, b.z - A.z);
  // the Apple court: in by the top of its stairs only; a glass rail round the rest of it
  if (S.pit) { if (ra > A.rail + 1) S.pit = false; else { keepPit(b); return; } }
  else if (ra < A.rail) {
    if (Math.abs(appleAng(b.x, b.z)) <= A.stairs.top - 0.6 && ra >= A.rPlaza + 0.3) { if (ra < A.rOut) S.pit = true; }
    else clampR(b, A, A.rail, 999);
  }
  // the bridge's stairs
  if (S.ramp >= 0 && keepRamp(b)) return;
  for (let i = 0; i < RAMPS.length; i++) {
    const R = RAMPS[i], [t, l] = rampLocal(R, b.x, b.z);
    if (t < -RAD || t > R.run + RAD || Math.abs(l) > R.hw + RAD) continue;
    if (Math.abs(l) < R.hw - 0.25 && ((t > R.run - 1.2 && b.y < 1.5) || (t < 1.2 && b.y > 3.4))) { if (t >= 0 && t <= R.run) { S.ramp = i; return; } continue; }
    if (b.y < 3.4 && t > 0 && t < R.run + RAD) {                // from the side, at street level: it's a solid flight
      const side = R.hw + RAD - Math.abs(l), end = R.run + RAD - t;
      if (end < side && Math.abs(l) < R.hw) { b.x += R.dx * end; b.z += R.dz * end; }
      else { const k = (l >= 0 ? 1 : -1) * side; b.x += R.px * k; b.z += R.pz * k; }
    }
  }
  if (b.y > 3.4) { keepDeck(b); return; }
  // street level (and the metro stairs): buildings, walls, posts
  for (let k = 0; k < 2; k++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) { const B = boxes[i]; if (B.y1 !== undefined && b.y > B.y1) continue; if (pushBox(b, B, RAD)) { moved = true; b.hit = B.id; } }
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i], dx = b.x - c.x, dz = b.z - c.z, rr = c.r + RAD;
      if (dx > rr || dx < -rr || dz > rr || dz < -rr || (c.y1 !== undefined && b.y > c.y1)) continue;
      const d = Math.hypot(dx, dz); if (d < rr && d > 1e-6) { b.x = c.x + dx / d * rr; b.z = c.z + dz / d * rr; moved = true; }
    }
    if (!moved) break;
  }
  if (b.y < -0.5) return;                                     // down a stairwell: its walls are enough
  // kerbs (railed, but for the zebras), the district's edge, the lake: back to where you were, sliding along
  if (blocked(b.x, b.z) && S.x === S.x) {
    const edge = !inDistrict(b.x, b.z);
    if (!blocked(b.x, S.z)) b.z = S.z; else if (!blocked(S.x, b.z)) b.x = S.x; else { b.x = S.x; b.z = S.z; }
    b.hit = edge ? 'boundary' : 'kerb';
  }
}
// registered with the movement code as a "mover": a ground height and a keep-inside rule
export const ljzMover = { ground: ljzGround, keep: ljzKeep };
if (!movers.includes(ljzMover)) movers.push(ljzMover);

// ---- traffic: routes through the roundabout (right-hand traffic: anticlockwise round the island) ----
function bez(P0, P1, P2, P3, n, out) { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]); } }
const armPt = (A, along, perp) => [C.x + A.dx * along + A.px * perp, C.z + A.dz * along + A.pz * perp];
// in by one arm (its inbound lane is on the left of the arm's outward direction), round the island at
// radius rc with the bearing falling, out by another
function through(inId, inLane, outId, outLane, rc) {
  const I = ARMS.find((a) => a.id === inId), O = ARMS.find((a) => a.id === outId), pts = [];
  const far = (A) => Math.min(A.len, A.id === 'century' ? 760 : 290);
  pts.push(armPt(I, far(I), -inLane));
  const J = 66, p0 = armPt(I, J, -inLane), bIn = I.b - 26, c0 = polar(bIn, rc), tIn = [-Math.cos(bIn * D2R), -Math.sin(bIn * D2R)];
  pts.push(p0);
  bez(p0, [p0[0] - I.dx * 14, p0[1] - I.dz * 14], [c0[0] - tIn[0] * 12, c0[1] - tIn[1] * 12], c0, 10, pts);
  let sweep = (((bIn - (O.b + 26)) % 360) + 360) % 360; if (sweep < 20) sweep += 360;
  const n = Math.max(2, Math.round(sweep / 6));
  for (let i = 1; i <= n; i++) pts.push(polar(bIn - sweep * i / n, rc));
  const bOut = bIn - sweep, c1 = polar(bOut, rc), tOut = [-Math.cos(bOut * D2R), -Math.sin(bOut * D2R)], p1 = armPt(O, J, outLane);
  bez(c1, [c1[0] + tOut[0] * 12, c1[1] + tOut[1] * 12], [p1[0] - O.dx * 14, p1[1] - O.dz * 14], p1, 10, pts);
  pts.push(armPt(O, far(O), outLane));
  return pts;
}
function resample(pts, step = 2) {
  const out = [pts[0]]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], d = Math.hypot(bx - ax, bz - az); let s = step - carry;
    while (s <= d) { out.push([ax + (bx - ax) * s / d, az + (bz - az) * s / d]); s += step; }
    carry = d - (s - step);
  }
  return out;
}
function route(id, raw, stops = []) {
  const pts = resample(raw, 2), n = pts.length, yaw = new Array(n), limit = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    yaw[i] = Math.atan2(b[0] - a[0], b[1] - a[1]);                      // facing +z at 0, as the vehicles are built
  }
  for (let i = 0; i < n; i++) {
    const turn = Math.abs(wrap180((yaw[Math.min(n - 1, i + 2)] - yaw[Math.max(0, i - 2)]) / D2R)) * D2R / 8;   // radians per metre
    limit[i] = Math.max(5.5, Math.min(12, Math.sqrt(1.6 / Math.max(1e-4, turn))));
  }
  return { id, pts, yaw, limit, len: (n - 1) * 2, stops };
}
// where along a route (metres) it first comes within `tol` of an avenue-frame line a = const
const whereA = (R, a, tol = 1.2) => { for (let i = 0; i < R.pts.length; i++) { const [ra, rp] = toAP(...R.pts[i]); if (Math.abs(ra - a) < tol && Math.abs(rp) < 16) return i * 2; } return null; };
export const ROUTES = [
  route('e-w', through('century', 6.4, 'west', 4.6, 38)), route('w-e', through('west', 4.6, 'century', 6.4, 38)),
  route('s-ne', through('ringS', 4.6, 'ringNE', 4.6, 33)), route('ne-s', through('ringNE', 4.6, 'ringS', 4.6, 33)),
  route('e-n', through('century', 10.4, 'fenghe', 4, 41)), route('n-e', through('fenghe', 4, 'century', 10.4, 41)),
  route('e-s', through('century', 2.6, 'ringS', 4.6, 30)), route('s-e', through('ringS', 4.6, 'century', 2.6, 30)),
  route('yin-s', [fromAP(YIN.ac - 4.5, -290), fromAP(YIN.ac - 4.5, 290)]), route('yin-n', [fromAP(YIN.ac + 4.5, 290), fromAP(YIN.ac + 4.5, -290)]),
];
// signals at Century Avenue / Yincheng Road: 'ave' phase (the avenue runs, Z1's green man), then 'yin'
// (Yincheng runs, Z2's green man across the avenue), each ending on an all-red
for (const R of ROUTES) {
  if (R.id.startsWith('yin')) { const s = R.id === 'yin-s' ? 290 - 33 : 290 - 20; R.stops.push({ s, on: 'yin' }); continue; }
  const inbound = R.id.startsWith('e-'), at = whereA(R, inbound ? 258 : 221);
  if (at != null) R.stops.push({ s: at, on: 'ave' });
}
export const SIGNAL = { ave: 34, clear1: 4, yin: 20, clear2: 4 };
export function signalAt(t) {
  const c = SIGNAL.ave + SIGNAL.clear1 + SIGNAL.yin + SIGNAL.clear2, k = ((t % c) + c) % c;
  const ave = k < SIGNAL.ave, yin = k >= SIGNAL.ave + SIGNAL.clear1 && k < SIGNAL.ave + SIGNAL.clear1 + SIGNAL.yin;
  // z1 (across Yincheng) walks with the avenue's green, z2 (across the avenue) with Yincheng's
  return { ave, yin, z1: ave && k < SIGNAL.ave - 5, z2: yin && k < SIGNAL.ave + SIGNAL.clear1 + SIGNAL.yin - 6 };
}

// ---- positions other modules need (the workplace scenes, the map, arriving and leaving) ----
const P2 = (x, z, extra = {}) => ({ x, z, ...extra });
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);               // the player's yaw looking along (dx, dz)
const lobby = fromAP(176, 30.4), kerb = fromAP(176, 18.2), m6 = METRO_LJZ[0];
export const LJZ = {
  centre: P2(C.x, C.z),
  ring: { x: C.x, z: C.z, r0: RING.r0, r1: RING.r1, y: RING.y },
  ifcLobbyDoor: P2(lobby[0], lobby[1], { y: CH, nx: -NX, nz: -NZ }),                    // the north tower's door on Century Avenue; nx, nz: the way out
  ifcLobbyStand: P2(lobby[0] - NX * 2.2, lobby[1] - NZ * 2.2, { y: CH, yaw: yawTo(-NX, -NZ) }),   // where you stand, back to the door
  officeLift: P2(689.9, 55.6, { y: 134.4 }),                                             // the lift on 32F (world/destinations.js PLACES.lujiazui.lift)
  kerbPickup: P2(kerb[0], kerb[1], { y: CH, yaw: yawTo(NX, NZ) }),                       // DiDi set-down and pick-up, Century Avenue's south kerb at IFC
  appleEntrance: P2(...applePt(0, APPLE.rail + 1.2), { y: CH }),                          // the top of the sunken court's stairs
  appleCylinderDoor: P2(...applePt(0, APPLE.rCyl + 0.8), { y: APPLE.yPlaza }),
  appleStore: P2(...applePt(75, 9), { y: APPLE.yStore }),
  metroExits: METRO_LJZ.map((m) => { const [x, z] = wellPt(m, -1.4), [lx, lz] = wellPt(m, m.len - 1.3); return { exit: m.exit, x, z, y: CH, landing: { x: lx, z: lz, y: -m.depth }, name: m.name }; }),
  metroArrive: P2(...wellPt(m6, m6.run + 0.6), { y: -m6.depth, yaw: yawTo(-m6.dx, -m6.dz) }),   // up Exit 6's stairs, toward IFC
  greenGate: P2(...fromAP(272, -52), { y: CH }),
  greenBenches: BENCHES.map((b) => ({ x: b.x, z: b.z, y: CH })),
  greenLawn: P2(...fromAP(330, -200), { y: CH }),
  ringStairs: RAMPS.map((R) => ({ x: R.bot[0], z: R.bot[1], bearing: R.b })),
  towers: { pearl: P2(640, -42), jinmao: P2(1240, 457), swfc: P2(1374, 513), shanghaiTower: P2(1212, 635), ifcNorth: P2(IFC.north.cx, IFC.north.cz), ifcSouth: P2(IFC.south.cx, IFC.south.cz) },
};
// are you in the district (anywhere in Pudong at street level: used to show / hide it)
export const inPudong = (x, y = 0) => x > 480 && y < 60;
// a coarse name for where you are in it
export function ljzZone(x, z, y = 0) {
  if (y < -7) return 'apple';
  const ra = Math.hypot(x - APPLE.x, z - APPLE.z);
  if (ra < APPLE.rail + 3) return 'apple';
  for (const m of METRO_LJZ) { const [t, l] = wellLocal(m, x, z); if (t > -3 && t < m.len + 1 && Math.abs(l) < m.hw + 1.5) return 'ljzMetro'; }
  if (y > 3.4) return 'ring';
  const [a, p] = toAP(x, z);
  if (a >= GREEN.a0 - 2 && p <= GREEN.p1 + 2) return 'green';
  if (Math.hypot(x - C.x, z - C.z) < 80 && !(a > 60 && p > 16)) return 'roundabout';
  if (p > 12 && a < 240) return 'ifc';
  return 'century';
}
