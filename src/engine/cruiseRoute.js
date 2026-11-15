// The river cruise's route and timetable (world/cruise.js draws and rides it). Pure: no three.js.
// From the pier at the south end of the promenade, out into the river, north along the Bund side
// past Lujiazui, round in a wide turn, south along the Pudong side, round again and back up to the
// pier. Hourly sailings, 10 am to 9 pm. Where the boat is depends only on the clock, so waiting,
// sleeping or skipping to the end of the trip all put it in the right place.
import { TIME_RATE } from './life.js';

export const DOCK = { x: 43, z: 65 };                          // alongside the pier's end (layout.js PIER), bow north
export const DEPARTURES = Array.from({ length: 12 }, (_, i) => (10 + i) * 60);
export const VMAX = 6, ACCEL = 0.15;                           // m/s (about 12 knots), m/s²
export const FARE = 120;                                       // yuan: a typical night-cruise ticket

const WP = [
  [43, 65], [43, 52], [45, 34], [54, 12], [68, -14], [75, -50], [75, -380],
  [80, -410], [96, -432], [120, -440], [144, -432], [160, -410], [165, -380],
  [165, 200], [160, 230], [144, 252], [120, 260], [96, 252], [80, 230], [75, 200],
  [75, 150], [71, 122], [60, 100], [48, 84], [43, 74], [43, 65],
];
// Catmull-Rom through the waypoints, sampled densely, with the distance along it
// (the long straights are cut into ~20 m pieces first: a spline through very uneven spans loops back
// on itself at the corners)
const DENSE = WP.flatMap((p, i) => {
  if (i === 0) return [p];
  const q = WP[i - 1], n = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / 20));
  return Array.from({ length: n }, (_, k) => [q[0] + ((p[0] - q[0]) * (k + 1)) / n, q[1] + ((p[1] - q[1]) * (k + 1)) / n]);
});
const SAMPLES = (() => {
  const P = [DENSE[0], ...DENSE, DENSE[DENSE.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(4, Math.ceil(seg / 1.5));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(DENSE[DENSE.length - 1]);
  // then eased: a moving average over ~35 m, so a 44 m boat swings round its corners (the ends stay put)
  const W = 12, sm = out.map((p, i) => { const k = Math.min(W, i, out.length - 1 - i); let x = 0, z = 0; for (let j = -k; j <= k; j++) { x += out[i + j][0]; z += out[i + j][1]; } return [x / (2 * k + 1), z / (2 * k + 1)]; });
  let s = 0; return sm.map((p, i) => { if (i) s += Math.hypot(p[0] - sm[i - 1][0], p[1] - sm[i - 1][1]); return { x: p[0], z: p[1], s }; });
})();
export const LENGTH = SAMPLES[SAMPLES.length - 1].s;
// a trapezoid speed profile: ease out of the pier, cruise, ease in
const T_ACC = VMAX / ACCEL, S_ACC = 0.5 * ACCEL * T_ACC * T_ACC;
export const TRIP_SECONDS = 2 * T_ACC + (LENGTH - 2 * S_ACC) / VMAX;
export const TRIP_MINUTES = (TRIP_SECONDS * TIME_RATE) / 60;   // on the game clock
export function distanceAt(t) {
  if (t <= 0) return 0;
  if (t >= TRIP_SECONDS) return LENGTH;
  if (t < T_ACC) return 0.5 * ACCEL * t * t;
  if (t > TRIP_SECONDS - T_ACC) { const r = TRIP_SECONDS - t; return LENGTH - 0.5 * ACCEL * r * r; }
  return S_ACC + (t - T_ACC) * VMAX;
}
export function speedAt(t) { if (t <= 0 || t >= TRIP_SECONDS) return 0; return Math.min(VMAX, ACCEL * t, ACCEL * (TRIP_SECONDS - t)); }
// where along the route: position and heading (heading: atan2 of the direction, x over z, as people)
export function pointAt(s) {
  s = Math.max(0, Math.min(LENGTH, s));
  if (s > LENGTH - 3) { const p = pointAt(LENGTH - 3.5), q = pointAt(LENGTH - 3); const f = (s - (LENGTH - 3)) / 3; return { x: q.x + (DOCK.x - q.x) * f, z: q.z + (DOCK.z - q.z) * f, h: q.h + (Math.PI * Math.sign(q.h || 1) - q.h) * f }; }
  let lo = 0, hi = SAMPLES.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (SAMPLES[m].s < s) lo = m; else hi = m; }
  const a = SAMPLES[lo], b = SAMPLES[hi], f = (s - a.s) / Math.max(1e-6, b.s - a.s);
  // heading from a little span either side (smooth through the samples)
  const i0 = Math.max(0, lo - 2), i1 = Math.min(SAMPLES.length - 1, hi + 2);
  let dx = SAMPLES[i1].x - SAMPLES[i0].x, dz = SAMPLES[i1].z - SAMPLES[i0].z;
  if (Math.hypot(dx, dz) < 1e-6) { dx = 0; dz = -1; }
  return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, h: Math.atan2(dx, dz) };
}
// the boat at a moment of the game clock (minute of the day, with fractions)
export function cruiseAt(minute) {
  const m = ((minute % 1440) + 1440) % 1440;
  for (const d of DEPARTURES) {
    if (m >= d && m < d + TRIP_MINUTES) {
      const t = ((m - d) * 60) / TIME_RATE, s = distanceAt(t), p = pointAt(s);
      return { status: 'out', dep: d, t, s, v: speedAt(t), ...p };
    }
  }
  const next = DEPARTURES.find((d) => d > m) ?? null;
  return { status: 'docked', dep: null, next, t: 0, s: 0, v: 0, x: DOCK.x, z: DOCK.z, h: Math.PI };
}
// what the announcer says, and where along the route
export const PA_AT = [
  { at: 'board', s: -1 }, { at: 'welcome', s: 8 }, { at: 'bund', s: 120 }, { at: 'lujiazui', s: 330 },
  { at: 'turn', s: 560 }, { at: 'back', s: 1300 }, { at: 'arrive', s: LENGTH - 140 },
];
