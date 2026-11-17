// Lujiazui, Pudong: where things are. Pure data and pure functions (no three.js), so the ground,
// the collisions and the traffic routes can be tested in node (tests/lujiazui.test.mjs). The visuals
// are world/lujiazui.js.
//
// ---- reference geography and how it is laid into the game ----
// Surveyed: OpenStreetMap (© OpenStreetMap contributors, ODbL), turned into the game's frame by
// tools/osm/ljzosm.mjs (world/lujiazuiOsm.js): x = 640 + (lon - 121.49527) * 95190,
// z = -42 - (lat - 31.2419) * 110860, which puts the Oriental Pearl Tower (OSM way 40778038) at the
// skyline's PEARL (640, -42). From it:
//   the roundabout (陆家嘴环岛, its ways fitted with a circle)   centre (721.5, 138.7), lane centreline r 31.4, island r 24.7
//   the Mingzhu Ring (OSM way 48876367, bridge=yes)              centre (716.4, 151.8), centreline r 58.5: 13 m south-west of the roundabout's
//   the arms, measured from the roundabout's centre               Century Avenue 112° (its axis 8 m north of the centre), Lujiazui Ring Rd
//                                                                  north-east 27°, Fenghe Rd 297°, West Lujiazui Rd 238°, Lujiazui Ring Rd south 178.5°
//   Middle Yincheng Road's surface junction with the avenue      352 m out along it (the road itself dives under in a tunnel)
//   Apple Pudong's paved plaza (way 166128036)                    centre (802.8, 242.3), r 17.5; the store (way 255624910) under it
//   Lujiazui station's entrances (railway=subway_entrance)        1 (817.5, 88.7), 4 (940.8, 187.2), 6 (937.2, 254) ...
//   every building footprint and height in the district          OSM_BUILDINGS (heights: OSM, Wikidata, or guessed: see the generator)
//   the Central Green, its lake, the Pearl's park                 OSM_AREAS
// Game frame: x east, y up, z south, 1 unit = 1 m, true north = -z (the game's Bund runs due north-
// south; the real one bears a few degrees east of north here: ignored). The far skyline seen from the
// Bund (world/skyline.js) keeps its own arrangement; in Pudong the three supertalls stand at their OSM
// positions and the district's own buildings replace the generic far towers.
import { movers } from './layout.js';
import { OSM_POINTS, OSM_AREAS, OSM_BUILDINGS } from './lujiazuiOsm.js';

const D2R = Math.PI / 180;
export const C = { x: OSM_POINTS.roundabout[0], z: OSM_POINTS.roundabout[1] };   // the roundabout's centre
export const RC = { x: OSM_POINTS.ring[0], z: OSM_POINTS.ring[1] };              // the Mingzhu Ring's centre (not quite the roundabout's)
// a compass bearing (degrees clockwise from north) as a unit vector in (x, z)
export const dirOf = (b) => [Math.sin(b * D2R), -Math.cos(b * D2R)];
export const polar = (b, r, o = C) => [o.x + r * Math.sin(b * D2R), o.z - r * Math.cos(b * D2R)];
export const bearingOf = (x, z, o = C) => { const b = Math.atan2(x - o.x, -(z - o.z)) / D2R; return b < 0 ? b + 360 : b; };
export const wrap180 = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
// Century Avenue's frame: a = metres along the avenue from abreast of the roundabout's centre, p = metres
// to the right of its axis (south side positive). The axis runs 8 m north of the roundabout's centre.
export const AVE = 112, AVE_OFF = -8;
const [UX, UZ] = dirOf(AVE), [NX, NZ] = dirOf(AVE + 90);
export const toAP = (x, z) => [(x - C.x) * UX + (z - C.z) * UZ, (x - C.x) * NX + (z - C.z) * NZ - AVE_OFF];
export const fromAP = (a, p) => [C.x + a * UX + (p + AVE_OFF) * NX, C.z + a * UZ + (p + AVE_OFF) * NZ];
export const AVE_ROT = Math.atan2(UZ, UX);                    // the avenue's direction as a rotation of the x axis toward z

export const CH = 0.15;                                       // kerb height (as on the Bund)
// the roundabout and the ring bridge over it (the ring's radii about RC, the road's about C)
export const RING = { island: 24.7, road: 37, r0: 54, r1: 63, rc: OSM_POINTS.ring[2], y: 5.5, thick: 0.9 };
export const rpolar = (b, r) => polar(b, r, RC);
// the roads that meet at the roundabout (bearing, half-width of carriageway, lateral offset of its axis, drawn length)
export const ARMS = [
  { id: 'century', b: AVE, hw: 17, off: AVE_OFF, len: 900, zh: '世纪大道', en: 'Century Avenue' },
  { id: 'ringNE', b: 27, hw: 13, off: 0, len: 300, zh: '陆家嘴环路', en: 'Lujiazui Ring Rd' },
  { id: 'fenghe', b: 297, hw: 9, off: 0, len: 300, zh: '丰和路', en: 'Fenghe Rd' },
  { id: 'west', b: 238, hw: 8, off: 0, len: 300, zh: '陆家嘴西路', en: 'West Lujiazui Rd' },
  { id: 'ringS', b: 178.5, hw: 10.5, off: 0, len: 320, zh: '陆家嘴环路', en: 'Lujiazui Ring Rd' },
].map((a) => { const [dx, dz] = dirOf(a.b), [px, pz] = dirOf(a.b + 90); return { ...a, dx, dz, px, pz }; });
// Middle Yincheng Road's surface junction with the avenue (drawn square to it, as it nearly is)
export const YIN = { a0: 343, a1: 361, ac: 352, len: 300 };
// the two signalled zebras at that junction: Z1 across Yincheng (north side), Z2 across the avenue
export const ZEBRAS = [{ id: 'z1', a0: YIN.a0, a1: YIN.a1, p0: -30.5, p1: -24.5 }, { id: 'z2', a0: YIN.a0 - 11, a1: YIN.a0 - 4.5, p0: -17, p1: 17 }];
// stairs down from the deck (top on the ring's outer edge, straight out from RC) and the spur toward
// Apple, whose own stair comes down toward the plaza (OSM shows several stairs and escalators, most on
// the south-west; these five and the spur stand for them)
export const SPUR = { b: 150, s0: RING.r1 - 0.3, s1: 72, hw: 7 };
function ramp(b, rTop, rBot, hw, kind) {
  const [tx, tz] = rpolar(b, rTop), [bx, bz] = rpolar(b, rBot), run = rBot - rTop, [dx, dz] = dirOf(b), [px, pz] = dirOf(b + 90);
  return { b, kind, hw, run, top: [tx, tz], bot: [bx, bz], dx, dz, px, pz, y0: CH, y1: RING.y };
}
export const RAMPS = [...[60, 190, 235, 290, 330].map((b) => ramp(b, RING.r1, RING.r1 + 13, 3.0, 'ring')), ramp(SPUR.b, SPUR.s1, SPUR.s1 + 12, 3.5, 'spur')];
// ---- polygons (flat [x0, z0, x1, z1, ...] or [[x, z], ...]) ----
export const pts2 = (f) => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i], f[i + 1]]); return o; };
export function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
export function polyDist(P, x, z) {                           // distance to the outline, and the nearest point on it
  let bd = 1e9, bx = 0, bz = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [x0, z0] = P[j], [x1, z1] = P[i], dx = x1 - x0, dz = z1 - z0, t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz || 1)));
    const qx = x0 + dx * t, qz = z0 + dz * t, d = Math.hypot(x - qx, z - qz); if (d < bd) { bd = d; bx = qx; bz = qz; }
  }
  return [bd, bx, bz];
}
const centroid = (P) => { let a = 0, cx = 0, cz = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [x0, z0] = P[j], [x1, z1] = P[i], k = x0 * z1 - x1 * z0; a += k; cx += (x0 + x1) * k; cz += (z0 + z1) * k; } return a ? [cx / (3 * a), cz / (3 * a)] : P[0]; };
// the smallest rectangle round a footprint (from its edges' directions): centre, rotation, half sizes
function obb(P) {
  let best = null;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const ang = Math.atan2(P[i][1] - P[j][1], P[i][0] - P[j][0]), c = Math.cos(ang), s = Math.sin(ang);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of P) { const u = x * c + z * s, v = -x * s + z * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const ar = (u1 - u0) * (v1 - v0); if (!best || ar < best.ar) { const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2; best = { ar, rot: ang, c, s, hx: (u1 - u0) / 2, hz: (v1 - v0) / 2, cx: uc * c - vc * s, cz: uc * s + vc * c }; }
  }
  return best;
}

// Apple Pudong (No. 1, IFC Mall, OSM way 255624910 under the paved round plaza, way 166128036): the
// plaza at street level, the 13 m glass cylinder (5 m radius, twelve curved panels, a stainless ring and a
// shallow glass dome since the rebuild) at its centre, and inside it the spiral glass stair, cantilevered
// off a second glass drum (the lift), down to the store under the plaza. Angles are measured clockwise
// from the cylinder's door, which faces the Mingzhu Ring and the Pearl.
const [APX, APZ, APR] = OSM_POINTS.applePlaza;
export const APPLE = {
  x: APX, z: APZ, entry: 316, rPlaza: APR, rOut: APR, yPlaza: CH, yStore: CH - 5.6, rCyl: 5, rCore: 1.7, cylH: 13, storeR: 16.2,
  spiral: { start: 25, total: 400, drop: 5.6, r0: 1.95, r1: 4.35 }, landing: [-40, 25], door: 13.5, foot: [57, 88],
  // the store's oak tables (each along a radius): an inner ring and an outer one, clear of the stair's foot and the video wall
  tables: [[125, 9], [165, 9], [205, 9], [295, 9], [330, 9], [10, 9.4], [140, 13.4], [185, 13.4], [225, 13.4], [345, 13.4]].map(([ang, r]) => ({ ang, r })),
  mall: 194,                                                                // the store's back, toward the mall (its lower-ground door)
  store: pts2(OSM_AREAS.appleStore),
};
export const appleAng = (x, z) => wrap180(bearingOf(x, z, APPLE) - APPLE.entry);
export const applePt = (ang, r) => polar(APPLE.entry + ang, r, APPLE);

// Lujiazui station's stairwells (Line 2; Line 14 since 2021), at OSM's entrances. top: the street end; d: the way down.
function well(exit, top, d, name) { const [dx, dz] = d, l = Math.hypot(dx, dz); return { exit, top, dx: dx / l, dz: dz / l, run: 9.6, len: 11.2, hw: 1.8, depth: 4.6, name }; }
const M = OSM_POINTS.metro;
export const METRO_LJZ = [
  well(6, M[6], [UX, UZ], { zh: '国金中心', en: 'IFC' }),
  well(4, M[4], [UX, UZ], { zh: '世纪大道北侧', en: 'Century Ave, north side' }),
  well(1, M[1], [UX, UZ], { zh: '东方明珠 · 陆家嘴环路', en: 'Oriental Pearl · Lujiazui Ring Rd' }),
];
export const wellLocal = (m, x, z) => [(x - m.top[0]) * m.dx + (z - m.top[1]) * m.dz, -(x - m.top[0]) * m.dz + (z - m.top[1]) * m.dx];
export const wellPt = (m, t, l = 0) => [m.top[0] + m.dx * t - m.dz * l, m.top[1] + m.dz * t + m.dx * l];

// ---- buildings: OSM's footprints, extruded (h: top, min: base), with a bounding box each for quick tests ----
const obox = (id, cx, cz, rot, hx, hz, h, extra = {}) => ({ id, cx, cz, rot, c: Math.cos(rot), s: Math.sin(rot), hx, hz, h, ...extra });
export const BUILDINGS = OSM_BUILDINGS.filter((b) => b.kind !== 'tent').map((b) => {   // (the Green's tent is world/lujiazuiBuild.js's membrane canopy)
  const P = pts2(b.p), xs = P.map((q) => q[0]), zs = P.map((q) => q[1]), [cx, cz] = centroid(P);
  return { id: `osm-${b.id}`, osm: b.id, name: b.n || b.en ? { zh: b.n, en: b.en } : null, kind: b.kind, mat: b.mat, roof: b.roof, part: !!b.part, guessed: !!b.g, h: b.h, min: b.min, P, cx, cz,
    x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), r: Math.max(...P.map(([x, z]) => Math.hypot(x - cx, z - cz))) };
});
const byOsm = (id) => BUILDINGS.find((b) => b.osm === id);
// Shanghai IFC (Pelli Clarke Pelli; Sun Hung Kai Properties): the north tower (Two IFC, 259.9 m, 56 floors,
// way 423304682), the south tower (the HSBC Building, 249.9 m, 58 floors; the Ritz-Carlton in its top
// eighteen; way 164968674), the mall between them (way 526005642) and IFC Residence behind (way 165166878)
export const IFC = { north: byOsm(423304682), south: byOsm(164968674), mall: byOsm(526005642), residence: byOsm(165166878) };
for (const T of [IFC.north, IFC.south]) T.box = obb(T.P);
// the north tower's door: the middle of the face that looks out on to the avenue
export const LOBBY = (() => {
  const P = IFC.north.P; let best = null;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [x0, z0] = P[j], [x1, z1] = P[i], l = Math.hypot(x1 - x0, z1 - z0), nx = (z1 - z0) / l, nz = -(x1 - x0) / l;   // outward (anticlockwise outline in x, z)
    const score = -(nx * NX + nz * NZ) * Math.min(1, l / 12); if (!best || score > best.score) best = { score, x: (x0 + x1) / 2, z: (z0 + z1) / 2, nx, nz, len: l, ex: (x1 - x0) / l, ez: (z1 - z0) / l };
  }
  return best;
})();
export const inBuilding = (x, z, pad = 0) => BUILDINGS.some((B) => B.min < 3 && x > B.x0 - pad && x < B.x1 + pad && z > B.z0 - pad && z < B.z1 + pad && (inPoly(B.P, x, z) || (pad > 0 && polyDist(B.P, x, z)[0] < pad)));

// ---- the Central Green (OSM way 40779542), its lake, the Pearl's park ----
const GP = pts2(OSM_AREAS.green), GAP = GP.map(([x, z]) => toAP(x, z));
export const GREEN = { P: GP, a0: Math.min(...GAP.map((q) => q[0])), a1: Math.max(...GAP.map((q) => q[0])), p0: Math.min(...GAP.map((q) => q[1])), p1: Math.max(...GAP.map((q) => q[1])) };
export const inGreen = (x, z) => inPoly(GP, x, z);
export const LAKE = OSM_AREAS.lakes.map((f) => ({ P: pts2(f) }));
// in the lake (or within `grow` m of its edge), given avenue-frame coordinates
export const inLake = (a, p, grow = 0) => { const [x, z] = fromAP(a, p); return LAKE.some((l) => inPoly(l.P, x, z) || (grow > 0 && polyDist(l.P, x, z)[0] < grow)); };
export const PEARL_PARK = pts2(OSM_AREAS.pearlPark);
export const CANOPY = { a: 427.3, p: -193.2 };                 // the white tensile canopy by the lake's west shore (OSM way 166544770, building=tent)
// the loop path round the lake (an ellipse in the avenue's frame) and the ways in
export const LOOP = { a: 480, p: -222, ra: 100, rp: 81 };
export const loopPt = (t) => [LOOP.a + LOOP.ra * Math.cos(t), LOOP.p + LOOP.rp * Math.sin(t)];
export const BENCHES = [0.35, 0.9, 1.55, 2.3, 2.9, 3.7, 4.4, 5.1, 5.8].map((t) => { const [a, p] = [LOOP.a + (LOOP.ra + 2.6) * Math.cos(t), LOOP.p + (LOOP.rp + 2.6) * Math.sin(t)]; const [x, z] = fromAP(a, p); return { x, z, a, p, t }; });

// ---- roads ----
export const FLARE = 52;                                      // an arm's mouth widens from here in to the roundabout (0.42 m a side per metre)
export function carriage(x, z) {
  const dx = x - C.x, dz = z - C.z;
  if (dx * dx + dz * dz < RING.road * RING.road) return true;
  for (let i = 0; i < ARMS.length; i++) {                     // each arm, flared where it meets the roundabout
    const A = ARMS[i], al = dx * A.dx + dz * A.dz;
    if (al > 0 && al < A.len && Math.abs(dx * A.px + dz * A.pz - A.off) < A.hw + (al < FLARE ? (FLARE - al) * 0.42 : 0)) return true;
  }
  const [a, p] = toAP(x, z);
  return a > YIN.a0 && a < YIN.a1 && Math.abs(p) < YIN.len;
}
export function zebra(x, z) {
  const [a, p] = toAP(x, z);
  for (const q of ZEBRAS) if (a >= q.a0 && a <= q.a1 && p >= q.p0 && p <= q.p1) return q.id;
  return null;
}
// where you can walk at street level (before buildings, roads and the lake are taken out)
export function inDistrict(x, z) {
  const r = Math.hypot(x - C.x, z - C.z);
  if (r <= 135) return !inPoly(PEARL_PARK, x, z);                                                 // round the roundabout (the Pearl's park is fenced)
  const [a, p] = toAP(x, z);
  if (a >= 30 && a <= 760 && p >= -66 && p <= 40) return true;                                     // the avenue, its pavements, the strip along the Green
  if (a >= 30 && a <= 362 && p >= 16 && p <= 140) return true;                                     // IFC's block: the Apple plaza, the towers' forecourts
  return inGreen(x, z);
}
const blocked = (x, z) => !inDistrict(x, z) || (carriage(x, z) && !zebra(x, z)) || inLake(...toAP(x, z));

// ---- the deck ----
const SP = { d: dirOf(SPUR.b), p: dirOf(SPUR.b + 90) };
const spurLocal = (x, z) => [(x - RC.x) * SP.d[0] + (z - RC.z) * SP.d[1], (x - RC.x) * SP.p[0] + (z - RC.z) * SP.p[1]];
export function onDeck(x, z) {
  const r = Math.hypot(x - RC.x, z - RC.z);
  if (r >= RING.r0 && r <= RING.r1) return true;
  if (r > RING.r1 && r < SPUR.s1 + 2) { const [s, l] = spurLocal(x, z); return s >= SPUR.s0 && s <= SPUR.s1 && Math.abs(l) <= SPUR.hw; }
  return false;
}
// columns under the ring: every 12° where the foot is clear of the carriageways and the stairs
export const COLUMNS = [];
for (let b = 3; b < 360; b += 12) {
  const [x, z] = rpolar(b, RING.rc); if (carriage(x, z) || [-1.6, 1.6].some((k) => carriage(...rpolar(b, RING.rc + k)))) continue;
  if (RAMPS.some((R) => Math.abs(wrap180(b - R.b)) < 8)) continue;
  COLUMNS.push(b);
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
export function ljzGround(x, z, y = 0) {
  if (!(x > 500 && x < 1500 && z > -260 && z < 780) || y > 60) return null;      // not here (the 32nd floor is destinations.js's)
  const ax = x - APPLE.x, az = z - APPLE.z, ra2 = ax * ax + az * az;
  if (ra2 < APPLE.rOut * APPLE.rOut) {
    const ra = Math.sqrt(ra2), ang = appleAng(x, z);
    if (ra < APPLE.rCyl) return spiralY(ang, y);
    return y < APPLE.yPlaza - 3 && ra < APPLE.storeR + 0.5 ? APPLE.yStore : APPLE.yPlaza;
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
export const boxes = [];
// buildings that reach the ground near where you can walk: their outlines are walls
export const polys = BUILDINGS.filter((B) => B.min < 3 && B.x1 > 560 && B.x0 < 1520 && B.z1 > -120 && B.z0 < 560);
export const circles = [];
export const addBox = (cx, cz, rot, hx, hz, extra = {}) => { const b = obox(extra.id || 'box', cx, cz, rot, hx, hz, 0, extra); boxes.push(b); return b; };
export const addCircle = (x, z, r, extra = {}) => { const c = { x, z, r, ...extra }; circles.push(c); return c; };
for (const b of COLUMNS) { const [x, z] = rpolar(b, RING.rc); addCircle(x, z, 0.75, { y1: 5 }); }
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
// out of a footprint, to `rad` from its outline
function pushPoly(p, B, rad) {
  if (p.x < B.x0 - rad || p.x > B.x1 + rad || p.z < B.z0 - rad || p.z > B.z1 + rad) return false;
  const inside = inPoly(B.P, p.x, p.z), [d, qx, qz] = polyDist(B.P, p.x, p.z);
  if (!inside && d >= rad) return false;
  const dx = p.x - qx, dz = p.z - qz, l = Math.hypot(dx, dz) || 1e-6, k = inside ? -1 : 1;
  p.x = qx + dx / l * rad * k; p.z = qz + dz / l * rad * k;
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

// what the body is on (a bridge stair), remembered from step to step
const S = { x: NaN, z: NaN, y: 0, ramp: -1 };
export const ljzState = S;
function infer(b) {
  S.ramp = -1;
  for (let i = 0; i < RAMPS.length; i++) { const [t, l] = rampLocal(RAMPS[i], b.x, b.z); if (t >= 0 && t <= RAMPS[i].run && Math.abs(l) < RAMPS[i].hw) S.ramp = i; }
}
// Apple Pudong: inside the cylinder and down in the store it has its own walls; out on the plaza only the
// cylinder's glass (but for its door). True when it has dealt with the body.
const inStore = (b) => b.y < APPLE.yPlaza - 3 && Math.hypot(b.x - APPLE.x, b.z - APPLE.z) < APPLE.storeR + 1;
function keepApple(b) {
  const A = APPLE, yP = A.yPlaza;
  let ra = Math.hypot(b.x - A.x, b.z - A.z), ang = appleAng(b.x, b.z), aa = Math.abs(ang);
  if (inStore(b)) {                                           // ---- the store, under the plaza
    if (ra < A.rCyl + 0.1) {                                  // at the foot of the spiral stair, inside its drum
      clampR(b, A, A.spiral.r0, ang >= A.foot[0] && ang <= A.foot[1] ? 99 : A.spiral.r1);
      if (ang > A.foot[1] || ang < -120) setAppleAng(b, A.foot[1]);
    } else if (ra < A.rCyl + RAD + 0.15 && !(ang >= A.foot[0] && ang <= A.foot[1])) clampR(b, A, A.rCyl + RAD + 0.15, 99);
    clampR(b, A, 0, A.storeR - RAD);
    for (const t of A.tables) for (const k of [-1, 0, 1]) { const [x, z] = applePt(t.ang, t.r + k * 1.05), dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz); if (d < 0.75 + RAD && d > 1e-6) { b.x = x + dx / d * (0.75 + RAD); b.z = z + dz / d * (0.75 + RAD); } }
    return true;
  }
  if (ra < A.rCyl) {                                          // ---- inside the glass cylinder
    clampR(b, A, A.spiral.r0, A.rCyl - RAD - 0.1 + (aa < A.door && b.y > yP - 0.4 ? 1.5 : 0));
    if (b.y > yP - 0.25 && ang < A.landing[0]) setAppleAng(b, A.landing[0]);        // the landing's back rail
    if (b.y <= yP - 0.25) clampR(b, A, A.spiral.r0, A.spiral.r1);
    return true;
  }
  if (ra < A.rCyl + RAD + 0.1 && aa > A.door) clampR(b, A, A.rCyl + RAD + 0.1, 99);   // the glass, but for its door
  return false;
}
function keepRamp(b) {
  const R = RAMPS[S.ramp], [t, l] = rampLocal(R, b.x, b.z);
  if (t < -0.05 || t > R.run + 0.05) { S.ramp = -1; return false; }
  const lim = R.hw - 0.3;
  if (Math.abs(l) > lim) { const k = (l > 0 ? lim : -lim) - l; b.x += R.px * k; b.z += R.pz * k; }
  return true;
}
function keepDeck(b) {
  const r = Math.hypot(b.x - RC.x, b.z - RC.z);
  if (r < RING.r0 + 0.3) { clampR(b, RC, RING.r0 + 0.3, 999); return; }
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
  clampR(b, RC, 0, RING.r1 - 0.3);
}
export function ljzKeep(b) {
  if (!(b.x > 520) || b.y > 60) { S.x = NaN; return; }
  if (!(Math.hypot(b.x - S.x, b.z - S.z) < 2.5)) infer(b);     // arrived here (or teleported): where are we?
  step(b);
  S.x = b.x; S.z = b.z; S.y = b.y;
}
function step(b) {
  const A = APPLE, ra = Math.hypot(b.x - A.x, b.z - A.z);
  // Apple: the cylinder, its stair and the store under the plaza
  if ((inStore(b) || ra < A.rCyl + RAD + 0.2) && keepApple(b)) return;
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
    for (let i = 0; i < polys.length; i++) if (pushPoly(b, polys[i], RAD)) { moved = true; b.hit = polys[i].id; }
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
const armPt = (A, along, perp) => [C.x + A.dx * along + A.px * (perp + A.off), C.z + A.dz * along + A.pz * (perp + A.off)];
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
const whereA = (R, a, tol = 1.2) => { for (let i = 0; i < R.pts.length; i++) { const [ra, rp] = toAP(...R.pts[i]); if (Math.abs(ra - a) < tol && Math.abs(rp) < 17) return i * 2; } return null; };
export const ROUTES = [
  route('e-w', through('century', 6.4, 'west', 4.2, 32.5)), route('w-e', through('west', 4.2, 'century', 6.4, 32.5)),
  route('s-ne', through('ringS', 4.6, 'ringNE', 5.5, 29.5)), route('ne-s', through('ringNE', 5.5, 'ringS', 4.6, 29.5)),
  route('e-n', through('century', 10.4, 'fenghe', 4.2, 34.5)), route('n-e', through('fenghe', 4.2, 'century', 10.4, 34.5)),
  route('e-s', through('century', 2.6, 'ringS', 4.6, 27.5)), route('s-e', through('ringS', 4.6, 'century', 2.6, 27.5)),
  route('yin-s', [fromAP(YIN.ac - 4.5, -290), fromAP(YIN.ac - 4.5, 290)]), route('yin-n', [fromAP(YIN.ac + 4.5, 290), fromAP(YIN.ac + 4.5, -290)]),
];
// signals at Century Avenue / Yincheng Road: 'ave' phase (the avenue runs, Z1's green man), then 'yin'
// (Yincheng runs, Z2's green man across the avenue), each ending on an all-red
for (const R of ROUTES) {
  if (R.id.startsWith('yin')) { const s = R.id === 'yin-s' ? 290 - 33 : 290 - 20; R.stops.push({ s, on: 'yin' }); continue; }
  const inbound = R.id.startsWith('e-'), at = whereA(R, inbound ? YIN.a1 + 3.5 : YIN.a0 - 14.5);
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
const [lobA] = toAP(LOBBY.x, LOBBY.z), kerb = fromAP(lobA, 18.6), m6 = METRO_LJZ[0];
export const LJZ = {
  centre: P2(C.x, C.z),
  ring: { x: RC.x, z: RC.z, r0: RING.r0, r1: RING.r1, y: RING.y },
  ifcLobbyDoor: P2(LOBBY.x + LOBBY.nx * 0.3, LOBBY.z + LOBBY.nz * 0.3, { y: CH, nx: LOBBY.nx, nz: LOBBY.nz }),          // Two IFC's door, on the face toward the avenue; nx, nz: the way out
  ifcLobbyStand: P2(LOBBY.x + LOBBY.nx * 2.5, LOBBY.z + LOBBY.nz * 2.5, { y: CH, yaw: yawTo(LOBBY.nx, LOBBY.nz) }),       // where you stand, back to the door
  officeLift: P2(689.9, 55.6, { y: 134.4 }),                                             // the lift on 32F (world/destinations.js PLACES.lujiazui.lift)
  kerbPickup: P2(kerb[0], kerb[1], { y: CH, yaw: yawTo(NX, NZ) }),                       // DiDi set-down and pick-up, Century Avenue's south kerb by Two IFC
  appleEntrance: P2(...applePt(0, APPLE.rCyl + 7), { y: CH }),                          // on the plaza, in front of the cylinder's door
  appleCylinderDoor: P2(...applePt(0, APPLE.rCyl + 0.8), { y: APPLE.yPlaza }),
  appleStore: P2(...applePt(75, 9), { y: APPLE.yStore }),
  metroExits: METRO_LJZ.map((m) => { const [x, z] = wellPt(m, -1.4), [lx, lz] = wellPt(m, m.len - 1.3); return { exit: m.exit, x, z, y: CH, landing: { x: lx, z: lz, y: -m.depth }, name: m.name }; }),
  metroArrive: P2(...wellPt(m6, m6.run + 0.6), { y: -m6.depth, yaw: yawTo(-m6.dx, -m6.dz) }),   // up Exit 6's stairs, by IFC
  greenGate: P2(...fromAP(372, -56), { y: CH }),
  greenBenches: BENCHES.map((b) => ({ x: b.x, z: b.z, y: CH })),
  greenLawn: P2(...fromAP(430, -120), { y: CH }),
  ringStairs: RAMPS.map((R) => ({ x: R.bot[0], z: R.bot[1], bearing: R.b })),
  // the supertalls at their OSM centroids (Jin Mao 376075961, SWFC 10691100, Shanghai Tower 165792123)
  towers: { pearl: P2(640, -42), jinmao: P2(1222.5, 472.4), swfc: P2(1374.8, 546.7), shanghaiTower: P2(1214.8, 663.1), ifcNorth: P2(IFC.north.cx, IFC.north.cz), ifcSouth: P2(IFC.south.cx, IFC.south.cz) },
};
// are you in the district (anywhere in Pudong at street level: used to show / hide it)
export const inPudong = (x, y = 0) => x > 480 && y < 60;
// a coarse name for where you are in it
export function ljzZone(x, z, y = 0) {
  if (y < APPLE.yPlaza - 3) return 'apple';
  const ra = Math.hypot(x - APPLE.x, z - APPLE.z);
  if (ra < APPLE.rOut) return 'apple';
  for (const m of METRO_LJZ) { const [t, l] = wellLocal(m, x, z); if (t > -3 && t < m.len + 1 && Math.abs(l) < m.hw + 1.5) return 'ljzMetro'; }
  if (y > 3.4) return 'ring';
  const [a, p] = toAP(x, z);
  if (inGreen(x, z) || (a >= GREEN.a0 && p < -40)) return 'green';
  if (Math.hypot(x - C.x, z - C.z) < 95 && !(a > 70 && p > 16)) return 'roundabout';
  if (p > 12 && a < YIN.a0) return 'ifc';
  return 'century';
}
