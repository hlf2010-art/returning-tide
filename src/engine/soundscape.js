// The city's sound by place: what you should hear where you stand, and how loud. Pure (no Web Audio):
// engine/ambience.js plays it, tests/soundscape.test.mjs checks it. Every sound it describes is made
// in the browser (procedural) or is a file already in the game (the CC0 shop music, the Kokoro voice
// clips); see docs/sound.md for the list and the licences.
//
//   the river     water at the wall, wind, the boats' horns: loudest at the railing, faint behind the
//                 Bund's buildings, gone halfway down Nanjing Road
//   Nanjing Road  music out of shop doors (engine/speakers.js), door chimes as people go in and out, the
//                 metro's announcements rising out of the exits at Henan Road
//   the road      a traffic bed made from the vehicles actually near you; now and then a horn (rare:
//                 horns have been banned inside Shanghai's Outer Ring Road since June 2007)
//   the arcades   reverb under the Customs House portico, in the Peace Hotel's arcade and the AIA lobby,
//                 down the metro stairs
//   people        chatter that follows how many people are near you, and a few voices placed on the
//                 groups standing closest
//   the clock     the Customs House on the hour
import { L, NJ, METRO, covers } from '../world/layout.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const onNanjing = (x, z) => x < L.facadeX && z > NJ.z0 - 1 && z < NJ.z1 + 1;
const onHankou = (x, z) => x < L.facadeX && Math.abs(z) < L.street.halfW + 0.5;

// ---- the river ----
// how open you are to the river (water at the wall, the boats): 1 at the railing, less across the road,
// a little way down the side streets (open at their east end), nothing behind the buildings
export function riverExposure(x, z, y = 0) {
  if (x > L.deckEdgeX - 4) return 1;
  if (x > L.wallX) return y > 1.5 ? 0.62 + 0.38 * smooth(L.wallX, L.deckEdgeX - 4, x) : 0.5;   // the deck / under it
  if (x > L.facadeX) return y > 1.5 ? 0.5 : 0.18 + 0.22 * smooth(L.facadeX, L.wallX, x);        // the road: the river wall is between
  if (onNanjing(x, z) || onHankou(x, z)) return 0.18 * Math.exp(-(L.facadeX - x) / 70);         // down a street open to the Bund
  return 0;
}
// how much of the wind you get: the open promenade the most, the street canyons much less
export function windExposure(x, z, y = 0) {
  if (x > L.wallX) return y > 1.5 ? 1 : 0.7;
  if (x > L.facadeX) return 0.72;
  if (onNanjing(x, z)) return 0.3 + 0.25 * Math.exp(-(L.facadeX - x) / 60);    // a wide street: a little wind always
  if (onHankou(x, z)) return 0.35 + 0.2 * Math.exp(-(L.facadeX - x) / 30);
  return 0.3;
}
// the river's boats: how often one sounds its horn (per second, per boat within earshot). Rare: on the
// Huangpu between the Yangpu and Xupu bridges ships may sound their horns only in an emergency
// (Shanghai's noise report, 2026), so a horn is an event, minutes apart at the least
export const BOAT_HORN = { range: 650, perBoat: 1 / 2400, minGap: 240 };

// ---- the road ----
// tyre and road noise rise steeply with speed (as engine/audio.js tyreLevel); an idling bus still hums
const tyre = (v) => Math.min(1, Math.pow(Math.max(0, v) / 12, 1.6));
// the traffic bed: every vehicle near you adds to it, weighted by how loud it is and how far.
// -> level 0..1, where it mostly comes from (energy-weighted), and how many vehicles are within 80 m
export function trafficBed(vehicles, lx, lz) {
  let e = 0, sx = 0, sz = 0, n = 0;
  for (const v of vehicles || []) {
    if (!v || v.active === false) continue;
    const d = Math.hypot(v.x - lx, v.z - lz);
    if (d > 160) continue;
    if (d < 80) n++;
    const w = (0.12 + 0.88 * tyre(v.v)) * (v.bus || v.model === 'bus' ? 2 : 1) / (1 + (d / 12) ** 2);
    e += w; sx += v.x * w; sz += v.z * w;
  }
  return { level: 1 - Math.exp(-e / 1.6), x: e ? sx / e : lx, z: e ? sz / e : lz, count: n, energy: e };
}
// a horn, now and then: per second for one vehicle. Horns are banned inside the Outer Ring Road (since
// 1 June 2007; fined, and caught by cameras since 2016), so they're rare: a short tap from someone held
// up for a while, almost never anything else
export const HORN = { perVehicle: 1 / 5400, held: 5, heldMul: 6, range: 90, minGap: 25 };
export function hornRate(v, d) {
  if (!v || v.active === false || d > HORN.range) return 0;
  return HORN.perVehicle * ((v.waited || 0) > HORN.held ? HORN.heldMul : 1) * (v.model === 'taxi' ? 1.5 : 1);
}
// a bus pulling up: the air brakes' sigh when it comes to rest (speed falls through `rest`)
export const BUS_SIGH = { from: 1.2, rest: 0.15, range: 70 };

// ---- the arcades: reverb ----
// where the walls and ceiling give your steps and the street an echo. wet: how much reverb; tone: how
// bright its return is (marble halls ring, a portico open on one side less so); edge: metres to fade in
const cover = (id) => covers.find((c) => c.id === id);
export const REVERB_ZONES = [
  { id: 'customs-portico', ...pick(cover('customs-portico')), wet: 0.3, tone: 2600, edge: 2.5 },   // stone, open to the street on one side
  { id: 'peace-arcade', ...pick(cover('peace-hall')), wet: 0.42, tone: 4200, edge: 1.5 },          // the Peace Hotel's marble arcades
  { id: 'aia-lobby', ...pick(cover('aia-lobby')), wet: 0.36, tone: 3800, edge: 1.5 },
  ...METRO.map((m) => ({ id: `metro-${m.exit}`, x0: m.x0, x1: m.x1, z0: m.z0, z1: m.z1, top: 4, wet: 0.34, tone: 3200, edge: 1, below: true })),   // tiled stairwells
];
function pick(c) { return c ? { x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1, top: c.top } : { x0: 0, x1: 0, z0: 0, z1: 0, top: 0 }; }
// -> { wet 0..1, tone Hz, id } for a listener at (x, z), y (feet)
export function reverbAt(x, z, y = 0) {
  let best = { wet: 0, tone: 3000, id: null };
  for (const r of REVERB_ZONES) {
    if (!r.below && y > r.top) continue;
    const inX = Math.min(x - r.x0, r.x1 - x), inZ = Math.min(z - r.z0, r.z1 - z);
    if (inX < -r.edge || inZ < -r.edge) continue;
    const k = smooth(-r.edge, r.edge * 0.5, Math.min(inX, inZ));
    const w = r.wet * (r.below ? smooth(0.15, -2.5, y) : 1) * k;       // the stairwells: more the further down you are
    if (w > best.wet) best = { wet: w, tone: r.tone, id: r.id };
  }
  return best;
}

// ---- people ----
// how many people are round you, nearer ones counting more (each is 1 at your shoulder, 0 at `reach` m)
export const CHATTER = { reach: 24, full: 12 };
export function peopleNear(list, lx, lz, ly = 0, reach = CHATTER.reach) {
  let k = 0, n = 0;
  for (const p of list || []) {
    if (!p || p.gone || p.inside) continue;
    const d = Math.hypot(p.x - lx, p.z - lz, ((p.y ?? ly) - ly) * 1.5);
    if (d < reach) { k += 1 - d / reach; n++; }
  }
  return { weight: k, count: n, level: k / CHATTER.full };
}
// the voices you pick out: up to n people standing or in company close by (not walking alone), nearest
// first, at least `min` m apart so two voices don't come from one spot
export function pickTalkers(list, lx, lz, { n = 3, near = 2.2, far = 14, min = 3 } = {}) {
  const cand = [];
  for (const p of list || []) {
    if (!p || p.gone || p.inside) continue;
    const together = p.partner || p.leader || p.kid || p.kind === 'follower' || p.kind === 'guide' || p.talk;
    const still = p.state && p.state !== 'walk' && p.state !== 'cross';
    if (!together && !still) continue;
    const d = Math.hypot(p.x - lx, p.z - lz);
    if (d >= near && d <= far) cand.push([d, p]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [, p] of cand) {
    if (out.length >= n) break;
    if (out.every((q) => Math.hypot(q.x - p.x, q.z - p.z) >= min)) out.push(p);
  }
  return out;
}

// ---- Nanjing Road ----
// a shop's automatic door greeter: the two-note chime as someone walks in or out (most of the street's
// smaller shops have one). Notes in Hz, then the gap
export const DOOR_CHIME = { notes: [[1318.5, 0], [1046.5, 0.32]], range: 26, minGap: 2.5 };
// the station below Henan Road: its announcements rise out of the two exits' stairwells. The lines are
// the ones the game already has recorded (tools/voice/lines.json; Kokoro voices)
export const METRO_PA = {
  lines: [
    '开往广兰路方向的列车即将进站，请站在黄色安全线以内候车，先下后上。',
    '开往徐泾东方向的列车即将进站，请站在黄色安全线以内候车，先下后上。',
    '各位乘客，请照看好您的随身物品，注意安全。',
  ],
  at: METRO.map((m) => ({ id: m.exit, x: m.bottom, y: -3.4, z: (m.z0 + m.z1) / 2 })),   // the foot of each stairwell
  range: 55, every: [40, 75],
};
// how loud the station's announcement is up in the street, `d` m from the stairwell's foot (the stairwell
// shields it: you hear it properly only near the top or on the stairs)
export const paGain = (d) => (d >= METRO_PA.range ? 0 : 0.9 / (1 + (d / 6) ** 2) * (1 - d / METRO_PA.range));

// ---- the Customs House clock ----
// The clock (1927; bells by John Taylor, the hour bell about 366 Hz) chimed the Westminster Quarters
// until 1966, then "The East Is Red" (东方红); Westminster again from 1986, "The East Is Red" again since
// 2003 (some say 1997). Today (People's Daily 2017, Sina 2019): the tune on the quarters, building up
// through the hour: one section at a quarter past, two at half past, three at a quarter to, the whole
// tune on the hour, then the hour struck (one stroke at one o'clock, twelve at twelve). Since 2018-19 the
// tune and the strokes are played electronically from the tower. After 22:00 the strokes go on without
// the tune until 07:00 (one resident's account, 2019; no official schedule found). docs/sound.md.
export const CLOCK = { x: -46, y: 52, z: 27.25, first: 7, last: 22, strikeGap: 2.6, tuneBeat: 0.5, bellHz: 366 };
// what the clock plays between minute-of-day m0 (exclusive) and m1 (inclusive):
// -> { quarter 1..4 (4: the hour), sections (of the tune, 0 = none), strikes (0 = none), hour } or null
export function clockChime(m0, m1) {
  if (!(m1 > m0) || m1 - m0 > 30) return null;                          // a jump in time (sleep, a ride) rings nothing
  const q = Math.floor(m1 / 15);
  if (Math.floor(m0 / 15) === q) return null;                            // no quarter crossed
  const quarter = ((q % 4) + 4) % 4 || 4, hour = ((Math.floor(m1 / 60) % 24) + 24) % 24;
  const minute = q * 15 % 1440, music = minute >= CLOCK.first * 60 && minute <= CLOCK.last * 60;
  const strikes = quarter === 4 ? hour % 12 || 12 : 0;
  if (!music && !strikes) return null;
  return { quarter, sections: music ? quarter : 0, strikes, hour };
}
// "The East Is Red": a Shaanbei folk tune (the melody of 骑白马), public domain, in four sections of four
// bars (东方红，太阳升 / 中国出了个毛泽东 / 他为人民谋幸福 / 呼儿嗨哟，他是人民大救星). Scale degrees in
// the numbered notation (1 = the tonic, 8 = 1 an octave up, negative = the octave below) and lengths in
// beats. Sections one and two are the tune everyone knows; three and four were written down from memory
// and have not been checked against a score (docs/sound.md).
export const EAST_IS_RED = [
  [[5, 1], [5, 0.5], [6, 0.5], [2, 2], [1, 1], [1, 0.5], [-6, 0.5], [2, 2]],
  [[5, 1], [5, 1], [6, 0.5], [8, 0.5], [6, 0.5], [5, 0.5], [1, 1], [1, 0.5], [-6, 0.5], [2, 2]],
  [[-5, 1], [2, 1], [1, 0.5], [-7, 0.5], [-6, 0.5], [-5, 0.5], [-5, 1], [2, 1], [3, 0.5], [2, 0.5], [1, 1]],
  [[1, 0.5], [1, 0.5], [-6, 1], [2, 0.5], [3, 0.5], [2, 0.5], [1, 0.5], [1, 0.25], [-6, 0.25], [1, 0.25], [2, 0.25], [3, 0.25], [2, 0.25], [1, 0.25], [-6, 0.25], [-5, 2]],
];
const MAJOR = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 8: 12 };
// scale degree -> Hz, in a major key on `tonic` (negative degrees: the octave below)
export const degreeHz = (deg, tonic = CLOCK.bellHz) => tonic * Math.pow(2, (deg < 0 ? MAJOR[-deg] - 12 : MAJOR[deg]) / 12);
// the length of the tune in seconds at the clock's tempo
export const tuneSeconds = (sections = 4) => EAST_IS_RED.slice(0, sections).flat().reduce((s, [, b]) => s + b, 0) * CLOCK.tuneBeat;
// how loud the clock is `d` m from the tower (a big bell carries: still clear on the promenade, faint
// halfway down Nanjing Road, where the buildings stand between)
export function clockGain(d, x, z) {
  const shield = x < L.facadeX - 6 && !(Math.abs(z) < L.street.halfW + 4) ? (onNanjing(x, z) ? 0.35 : 0.2) : 1;
  return Math.min(1, 60 / Math.max(60, d)) * shield;
}
