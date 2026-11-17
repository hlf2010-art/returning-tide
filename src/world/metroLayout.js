// Shanghai Metro Line 2's two stations you can walk: where things are. Pure data and functions (no
// three.js), so the floors, the walls and the ride can be tested in node (tests/metro.test.mjs). The
// visuals are world/metroBuild.js; the trains and the people world/metro.js.
//
// Both stations are built from one template, laid out in a local frame: a = metres along the platform
// (the line's direction, toward Lujiazui), p = metres to the right of its axis. Two levels, as a
// Shanghai station has them:
//   站厅 the concourse, 4.6 m down (the level the exits' stairs come down to): the exits come in on the
//        unpaid side; security (bags on the X-ray belt; nothing to screen, walk past); the gate line
//        (ten channels: six in, four out, tap Alipay's Metro QR code); beyond, the paid side, where a
//        fixed stair between an up and a down escalator goes down to the platform
//   站台 the island platform, 11.2 m down, 186 m long: an 8-car Line 2 train either side behind
//        full-height platform screen doors; eastbound (to Lujiazui, Zhangjiang) on the right of the
//        axis, westbound (to the Bund, People's Square) on the left; doors open on the left
// East Nanjing Road: under Nanjing Road East, between its Exits 2 and 7 (the stairs at Henan Road's
// north corners, world/layout.js METRO): the concourse runs east under the road from Henan Road.
// Lujiazui: under Century Avenue, its axis the avenue's, between Exits 6 (IFC) and 4 (the avenue's north
// side) whose stairs come down either side of it (world/lujiazuiLayout.js METRO_LJZ); Exit 1, by the
// Pearl, is a long passage (taken in one go, by the fade).
// Real: both are island platforms on Line 2 with screen doors, one stop (about 1.7 km) apart, Line 2
// under the river between them; the concourses' furniture is the standard Shanghai fit-out. Not real:
// the stations' exact plans and depths, and the tunnel's line (a smooth curve, engine/metroLine.js).
import { movers, METRO } from './layout.js';
import { METRO_LJZ, wellPt } from './lujiazuiLayout.js';

export const Y = { C: -4.6, ceilC: -0.8, P: -11.2, ceilP: -7.6, rail: -12.28 };
export const RISE = Y.C - Y.P;                                                  // 6.6 m, concourse to platform
export const CONC = { a0: -42, a1: 58, p: 10 };                                 // the concourse box
export const PLAT = { a0: -75, a1: 111, walk: 5.75, edge: 6.0, psd: 5.9, track: 7.65, wall: 9.8, ac: 18 };
// Line 2's A-type cars: 22.8 m, five doors a side, 3 m wide; eight of them
export const CAR = { len: 22.8, n: 8, halfW: 1.5, doors: [-9.12, -4.56, 0, 4.56, 9.12], doorW: 1.4, ceil: 2.15 };
export const TRAIN_LEN = CAR.len * CAR.n;
// the doors of a train stopped at the platform (its centre at PLAT.ac): a along the platform
export const DOOR_AS = (() => { const out = []; for (let k = 0; k < CAR.n; k++) for (const d of CAR.doors) out.push(PLAT.ac + (k - (CAR.n - 1) / 2) * CAR.len + d); return out; })();
// the gate line: ten channels across it, a cabinet between each; channels 0-3 (north/left) are the way out
export const GATE = { a: 12, pitch: 0.9, n: 10, p0: -4.05, out: 4, half: 0.31, depth: 0.8 };
export const gateP = (i) => GATE.p0 + i * GATE.pitch;
// security, just before the gates: a fence with two ways through it: past the X-ray belt with a bag, or the
// open way with nothing to screen. The north half (p < -0.9) is the way out from the out-gates.
export const SEC = { a: 1, divider: -0.9, open: [-0.6, 2.4], belt: { a0: 0.2, a1: 6.2, p0: 2.75, p1: 3.75 }, body: { a0: 2.0, a1: 4.6 }, lane: [3.95, 5.4], infeed: 0.7, outfeed: 5.6 };
// down to the platform: the up escalator (left), the stair, the down escalator (right), 30°
export const ESC = { aT: 20, run: RISE / Math.tan(Math.PI / 6), plate: 1.2, well: 2.95, speed: 0.65,
  lanes: [{ id: 'up', p0: -2.95, p1: -1.4, carry: -1 }, { id: 'stair', p0: -1.4, p1: 1.4, carry: 0 }, { id: 'down', p0: 1.4, p1: 2.95, carry: 1 }] };
ESC.aB = ESC.aT + ESC.run;
export const rampY = (a) => Y.C - RISE * Math.max(0, Math.min(1, (a - ESC.aT) / ESC.run));
export const TVM = { a0: -30, a1: -19, p: 10 };                                 // ticket machines on the south wall
export const SERVICE = { a0: 9.5, a1: 14.5, p0: -10, p1: -5.2 };                // the service centre, astride the gate line
export const COLS = { conc: [-34, -22, -10, 36, 48].flatMap((a) => [[a, -6.5], [a, 6.5]]), plat: [] };
for (let a = PLAT.a0 + 6; a < PLAT.a1 - 4; a += 12) if (a < ESC.aT - 3 || a > ESC.aB + 3) COLS.plat.push([a, -3.9], [a, 3.9]);

// ---- a frame per station ----
function frame(ox, oz, ux, uz) {
  return { ox, oz, ux, uz, rot: Math.atan2(uz, ux),
    toL: (x, z) => [(x - ox) * ux + (z - oz) * uz, -(x - ox) * uz + (z - oz) * ux],
    toW: (a, p) => [ox + ux * a - uz * p, oz + uz * a + ux * p] };
}
const R = (a0, a1, p0, p1, kind, y0, y1, extra = {}) => ({ a0: Math.min(a0, a1), a1: Math.max(a0, a1), p0: Math.min(p0, p1), p1: Math.max(p0, p1), kind, y0, y1, ...extra });
const BAND = { C: [Y.C - 1.2, Y.C + 3], well: [-7, 2], lane: [Y.P - 0.5, Y.C + 3], P: [Y.P - 0.5, Y.P + 1.2] };

function station(id, name, F, ways) {
  const regions = [
    R(CONC.a0, CONC.a1, -CONC.p, CONC.p, 'C', ...BAND.C),
    R(PLAT.a0, PLAT.a1, -PLAT.walk, PLAT.walk, 'P', ...BAND.P),
    ...ESC.lanes.map((l) => R(ESC.aT - ESC.plate - 0.6, ESC.aB + ESC.plate + 0.6, l.p0, l.p1, 'lane', ...BAND.lane, { lane: l })),
    ...ways.regions,
  ];
  // the doorways in the screen doors, open only while a train stands there with its doors open
  DOOR_AS.forEach((a, i) => { for (const side of [1, -1]) regions.push(R(a - 0.68, a + 0.68, side * 5.0, side * 6.55, 'door', ...BAND.P, { side, door: i })); });
  // floors you stand on: the concourse round the escalator well, the corridors, the lanes, the platform
  const floors = [
    R(CONC.a0, ESC.aT, -CONC.p, CONC.p, 'C'), R(ESC.aB, CONC.a1, -CONC.p, CONC.p, 'C'),
    R(ESC.aT, ESC.aB, -CONC.p, -ESC.well, 'C'), R(ESC.aT, ESC.aB, ESC.well, CONC.p, 'C'),
    ...ways.regions.filter((r) => r.kind === 'C').map((r) => ({ ...r })),
    ...ESC.lanes.map((l) => R(ESC.aT - ESC.plate - 0.6, ESC.aB + ESC.plate + 0.6, l.p0, l.p1, 'ramp')),
    R(PLAT.a0, PLAT.a1, -6.6, 6.6, 'P'),
  ];
  for (const f of floors) f.y = f.kind === 'P' ? Y.P : f.kind === 'ramp' ? null : Y.C;
  // things in the way (local boxes, with the heights they stand between)
  const ob = [];
  const box = (a0, a1, p0, p1, id, y0 = Y.C - 0.5, y1 = Y.C + 3, extra = {}) => ob.push({ a0: Math.min(a0, a1), a1: Math.max(a0, a1), p0: Math.min(p0, p1), p1: Math.max(p0, p1), id, y0, y1, ...extra });
  const cy0 = Y.C - 0.5, cy1 = Y.C + 3, py0 = Y.P - 0.5, py1 = Y.P + 3;
  // the gate line: cabinets, the flaps of each channel (open when told), fences out to the walls
  for (let k = 0; k <= GATE.n; k++) { const p = GATE.p0 - GATE.pitch / 2 + k * GATE.pitch; box(GATE.a - GATE.depth, GATE.a + GATE.depth, p - 0.14, p + 0.14, 'gate-cabinet'); }
  for (let i = 0; i < GATE.n; i++) box(GATE.a - 0.1, GATE.a + 0.1, gateP(i) - GATE.half, gateP(i) + GATE.half, 'gate-flap', cy0, cy1, { gate: i });
  const gN = GATE.p0 - GATE.pitch / 2 - 0.14, gS = GATE.p0 + (GATE.n - 0.5) * GATE.pitch + 0.14;
  box(GATE.a - 0.05, GATE.a + 0.05, SERVICE.p1, gN, 'gate-fence'); box(GATE.a - 0.05, GATE.a + 0.05, gS, CONC.p, 'gate-fence');
  box(SERVICE.a0, SERVICE.a1, SERVICE.p0, SERVICE.p1, 'service');
  // security: the fence, the X-ray machine and its belts, the bag lane's far side; the in and out halves
  box(SEC.a - 0.05, SEC.a + 0.05, SEC.divider, SEC.open[0], 'sec-fence'); box(SEC.a - 0.05, SEC.a + 0.05, SEC.open[1], SEC.belt.p0, 'sec-fence');
  box(SEC.a - 0.05, SEC.a + 0.05, SEC.lane[1], CONC.p, 'sec-fence');
  box(SEC.belt.a0, SEC.belt.a1, SEC.belt.p0, SEC.belt.p1, 'xray');
  box(SEC.a, SEC.belt.a1, SEC.lane[1], SEC.lane[1] + 0.1, 'sec-fence');
  box(SEC.a, GATE.a - GATE.depth, SEC.divider - 0.05, SEC.divider + 0.05, 'divider');
  // with a bag you haven't put through: the staff stand in both ways through
  box(SEC.a - 0.15, SEC.a + 0.15, SEC.open[0], SEC.open[1], 'sec-hold', cy0, cy1, { hold: true });
  box(SEC.belt.a1 - 0.15, SEC.belt.a1 + 0.15, SEC.belt.p1, SEC.lane[1], 'sec-hold', cy0, cy1, { hold: true });
  box(TVM.a0, TVM.a1, TVM.p - 0.8, TVM.p, 'tvm');
  for (const [a, p] of COLS.conc) box(a - 0.45, a + 0.45, p - 0.45, p + 0.45, 'column');
  // the escalator well: balustrades round it (concourse), between the lanes (all the way down), and the
  // space under the flights (platform)
  box(ESC.aT, ESC.aB, -ESC.well - 0.08, -ESC.well + 0.04, 'balustrade', cy0, cy1); box(ESC.aT, ESC.aB, ESC.well - 0.04, ESC.well + 0.08, 'balustrade', cy0, cy1);
  box(ESC.aB - 0.04, ESC.aB + 0.08, -ESC.well, ESC.well, 'balustrade', cy0, cy1);
  for (const p of [-1.4, 1.4]) box(ESC.aT - ESC.plate, ESC.aB + ESC.plate, p - 0.07, p + 0.07, 'balustrade', py0, cy1);
  for (const p of [-ESC.well, ESC.well]) box(ESC.aT - ESC.plate, ESC.aB + ESC.plate, p - 0.08, p + 0.08, 'balustrade', py0, Y.C - 1.4);
  box(ESC.aT - ESC.plate, ESC.aT + 8.4, -ESC.well, ESC.well, 'under-stair', py0, Y.P + 1.0);
  for (const [a, p] of COLS.plat) box(a - 0.36, a + 0.36, p - 0.36, p + 0.36, 'column', py0, py1);
  ob.push(...ways.obstacles);
  const xs = [], zs = [];
  for (const r of regions) for (const [a, p] of [[r.a0, r.p0], [r.a1, r.p1], [r.a0, r.p1], [r.a1, r.p0]]) { const [x, z] = F.toW(a, p); xs.push(x); zs.push(z); }
  return { id, name, F, regions, floors, ob, ways, box: { x0: Math.min(...xs) - 2, x1: Math.max(...xs) + 2, z0: Math.min(...zs) - 2, z1: Math.max(...zs) + 2 } };
}

// ---- East Nanjing Road: the concourse under Nanjing Road East, its west end at the exits ----
const ENR_F = frame(-490, -197.7, 1, 0);
const enrWays = (() => {
  const regions = [], exits = [];
  for (const m of METRO) {
    const [a0, p0] = ENR_F.toL(m.x0, m.z0), [a1, p1] = ENR_F.toL(m.x1, m.z1);
    regions.push(R(a0, a1, p0, p1, 'well', ...BAND.well, { exit: m.exit }));
    const land = ENR_F.toL(m.bottom + Math.sign(m.bottom - m.top) * 0.9, (m.z0 + m.z1) / 2);
    exits.push({ exit: m.exit, land, up: m.top > m.bottom ? 1 : -1, name: m.exit === 7 ? { zh: '天津路 · 外滩', en: 'Tianjin Rd · the Bund' } : { zh: '河南中路 · 南京东路', en: 'Henan Rd M · Nanjing Rd E' } });
  }
  // between the two landings: the concourse reaches up to them under Henan Road
  regions.push(R(-27.4, -3.6, -13.6, -9.4, 'C', ...BAND.C));
  return { regions, obstacles: [], exits, passages: [] };
})();
export const ENR = station('enr', { zh: '南京东路', en: 'East Nanjing Road', py: 'Nanjing Donglu' }, ENR_F, enrWays);

// ---- Lujiazui: under Century Avenue, Exits 6 and 4 either side ----
const W6 = METRO_LJZ.find((w) => w.exit === 6), W4 = METRO_LJZ.find((w) => w.exit === 4), W1 = METRO_LJZ.find((w) => w.exit === 1);
const LJZ_F = (() => {
  const [ax, az] = wellPt(W6, 10.4), [bx, bz] = wellPt(W4, 10.4), ux = W6.dx, uz = W6.dz;
  return frame((ax + bx) / 2 + ux * 26, (az + bz) / 2 + uz * 26, ux, uz);
})();
const ljzWays = (() => {
  const regions = [], exits = [];
  for (const W of [W6, W4]) {
    const [at, pt] = LJZ_F.toL(W.top[0], W.top[1]), s = Math.sign(pt);
    regions.push(R(at, at + W.len, pt - W.hw, pt + W.hw, 'well', ...BAND.well, { exit: W.exit }));
    // on past the landing, then in under the avenue to the concourse
    regions.push(R(at + W.run, at + W.len + 3.9, pt - W.hw, pt + W.hw, 'C', ...BAND.C, { corridor: W.exit }));
    regions.push(R(at + W.len + 0.3, at + W.len + 3.9, s * (CONC.p - 1), pt + s * W.hw, 'C', ...BAND.C, { corridor: W.exit }));
    exits.push({ exit: W.exit, land: [at + W.run + 0.6, pt], up: -1, name: W.name });
  }
  const ex1 = [CONC.a0 + 0.9, 0];                       // Exit 1's long passage leaves from the concourse's west end
  return { regions, obstacles: [], exits, passages: [{ exit: 1, at: ex1, name: W1.name, well: W1 }] };
})();
export const LJZS = station('ljz', { zh: '陆家嘴', en: 'Lujiazui', py: 'Lujiazui' }, LJZ_F, ljzWays);
export const STATIONS = [ENR, LJZS];

// ---- what the moving parts tell the layout (set by world/metro.js) ----
export const HOOK = {
  dt: 0,
  gateOpen: (st, i) => false,              // a gate's flaps are open
  doorOpen: (st, side, i) => false,        // a screen door is open (side +1 eastbound track, -1 westbound)
  mustScreen: (st) => false,               // you're carrying a bag that hasn't been through the X-ray here
  inTrain: (b) => false,                   // you're inside a train car (its own rules apply)
  onHit: null,                             // (station, obstacle) you walked into something that talks back
};

const RAD = 0.3;
// the station a point is in (by its box), and its local coordinates
export function stationAt(x, z) {
  for (const S of STATIONS) { const B = S.box; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1) return S; }
  return null;
}
const inR = (r, a, p, m = 0) => a >= r.a0 + m && a <= r.a1 - m && p >= r.p0 + m && p <= r.p1 - m;
const live = (S, r) => r.kind !== 'door' || HOOK.doorOpen(S, r.side, r.door);
// the floor's height at (x, z) for a body at height y: the highest under you within a step; null where
// the station has no say (the stairwells, the street)
export function metroGroundAt(x, z, y) {
  if (y == null || y > -1.6) return null;
  const S = stationAt(x, z); if (!S) return null;
  const [a, p] = S.F.toL(x, z);
  for (const r of S.regions) if (r.kind === 'well' && inR(r, a, p) && y > Y.C - 0.8) return null;
  let best = null;
  for (const f of S.floors) {
    if (!inR(f, a, p)) continue;
    const h = f.y == null ? rampY(a) : f.y;
    if (h <= y + 0.6 && (best == null || h > best)) best = h;
  }
  return best;
}
// keep a body inside the station's spaces and out of its furniture; carry it on an escalator
export function metroKeep(b) {
  if (b.y > -1.6) return;
  const S = stationAt(b.x, b.z); if (!S || HOOK.inTrain(b)) return;
  let [a, p] = S.F.toL(b.x, b.z);
  const cand = S.regions.filter((r) => b.y >= r.y0 && b.y <= r.y1 && live(S, r));
  if (!cand.length) return;
  // on a ramp, nothing but the lanes; on the flat, the level's own spaces
  if (!cand.some((r) => inR(r, a, p, RAD))) {
    let bd = Infinity, ba = a, bp = p;
    for (const r of cand) {
      const ca = Math.max(r.a0 + RAD, Math.min(r.a1 - RAD, a)), cp = Math.max(r.p0 + RAD, Math.min(r.p1 - RAD, p)), d = (ca - a) ** 2 + (cp - p) ** 2;
      if (d < bd) { bd = d; ba = ca; bp = cp; }
    }
    a = ba; p = bp;
  }
  b.hit = null;
  for (let it = 0; it < 2; it++) for (const o of S.ob) {
    if (b.y < o.y0 || b.y > o.y1) continue;
    if (o.gate != null && HOOK.gateOpen(S, o.gate)) continue;
    if (o.hold && !HOOK.mustScreen(S)) continue;
    const ca = Math.max(o.a0, Math.min(o.a1, a)), cp = Math.max(o.p0, Math.min(o.p1, p)), da = a - ca, dp = p - cp, d2 = da * da + dp * dp;
    if (d2 >= RAD * RAD) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); a = ca + da / d * RAD; p = cp + dp / d * RAD; }
    else { const m = Math.min(a - o.a0, o.a1 - a, p - o.p0, o.p1 - p); if (m === a - o.a0) a = o.a0 - RAD; else if (m === o.a1 - a) a = o.a1 + RAD; else if (m === p - o.p0) p = o.p0 - RAD; else p = o.p1 + RAD; }
    b.hit = o.id; if (HOOK.onHit) HOOK.onHit(S, o);
  }
  // the escalators carry you (the stair doesn't)
  const lane = ESC.lanes.find((l) => l.carry && p > l.p0 && p < l.p1);
  if (lane && a > ESC.aT - ESC.plate + 0.2 && a < ESC.aB + ESC.plate - 0.2 && b.y < Y.C + 0.3 && b.y > Y.P - 0.3) a += lane.carry * ESC.speed * HOOK.dt;
  [b.x, b.z] = S.F.toW(a, p);
}
// where a body is, coarsely: { st, level: 'unpaid' | 'paid' | 'escalator' | 'platform' | 'way' } or null
export function metroZone(x, z, y) {
  if (y > -1.6) return null;
  const S = stationAt(x, z); if (!S) return null;
  const [a, p] = S.F.toL(x, z);
  const inside = S.regions.some((r) => r.kind !== 'door' && inR(r, a, p, -0.4) && y >= r.y0 - 0.5 && y <= r.y1);
  if (!inside && !(y < Y.P + 1.4 && Math.abs(p) < PLAT.wall && a > PLAT.a0 - 2 && a < PLAT.a1 + 2)) return null;
  if (S.regions.some((r) => r.kind === 'well' && inR(r, a, p))) return { st: S, level: 'way', a, p };
  if (y < Y.P + 1.2) return { st: S, level: 'platform', a, p };
  if (y < Y.C - 0.8) return { st: S, level: 'escalator', a, p };
  if (a < CONC.a0 || Math.abs(p) > CONC.p) return { st: S, level: 'way', a, p };
  return { st: S, level: a > GATE.a ? 'paid' : 'unpaid', a, p };
}
export const metroMover = { ground: metroGroundAt, keep: metroKeep };
if (!movers.includes(metroMover)) movers.unshift(metroMover);
