// Line 2 between East Nanjing Road and Lujiazui: the tunnel's line and the trains on it. Pure (no
// three.js), node-tested (tests/metro.test.mjs).
//   the line   a centreline from 300 m west of East Nanjing Road's platform (toward People's Square),
//              along the platform, east under Nanjing Road and the Bund, under the river in a smooth
//              curve, along Lujiazui's platform under Century Avenue and 300 m on (toward Dongchang Road).
//              Sampled every metre; s = metres from the west end. Two tracks 7.65 m either side: eastbound
//              on the right (Shanghai runs on the right), dipping to 27 m down under the river.
//   the trains every HEADWAY real seconds each way from about 5:30 am to 11 pm (game time). Each runs at
//              up to 80 km/h, stops 30 s at each platform (doors open, the chime, doors shut), and goes
//              on out of sight. Positions are a function of the clock alone, so both stations agree and
//              a jump in time (a ride, a sleep) just finds the trains elsewhere.
// Time: the game clock runs at TIME_RATE game seconds a second; trains move in real seconds, so their
// clock is game seconds / TIME_RATE (a 66 s ride between the stations is about four game minutes).
import { STATIONS, PLAT, CAR, TRAIN_LEN, Y } from '../world/metroLayout.js';
import { TIME_RATE } from './life.js';

export const RUN = { vmax: 22, acc: 1.0, dec: 1.0, dwell: 30, headway: 60, first: 5 * 60 + 30, last: 23 * 60 };
// the doors during a dwell (seconds after the train stops)
export const DOORS = { open0: 1.5, open1: 4.0, chime: 23.0, close0: 26.0, close1: 28.5 };
const WEST = 300, EAST = 300;

// ---- the centreline ----
const pts = [];
function seg(ax, az, bx, bz) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) * 4); for (let i = pts.length ? 1 : 0; i <= n; i++) pts.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]); }
function bez(P0, P1, P2, P3) {
  const n = 4000;
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([0, 1].map((k) => u * u * u * P0[k] + 3 * u * u * t * P1[k] + 3 * u * t * t * P2[k] + t * t * t * P3[k])); }
}
const [E, L] = STATIONS;
const eW = E.F.toW(PLAT.a0 - WEST, 0), e0 = E.F.toW(PLAT.a0, 0), e1 = E.F.toW(PLAT.a1, 0);
const l0 = L.F.toW(PLAT.a0, 0), l1 = L.F.toW(PLAT.a1, 0), lE = L.F.toW(PLAT.a1 + EAST, 0);
seg(...eW, ...e0); seg(...e0, ...e1);
bez(e1, [e1[0] + E.F.ux * 520, e1[1] + E.F.uz * 520], [l0[0] - L.F.ux * 420, l0[1] - L.F.uz * 420], l0);
seg(...l0, ...l1); seg(...l1, ...lE);
// resample to one point per metre of arc length
const LINE_PTS = (() => {
  const out = [pts[0]]; let acc = 0, need = 1;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], d = Math.hypot(bx - ax, bz - az);
    while (acc + d >= need) { const f = (need - acc) / d; out.push([ax + (bx - ax) * f, az + (bz - az) * f]); need += 1; }
    acc += d;
  }
  return out;
})();
export const LENGTH = LINE_PTS.length - 1;
export { LINE_PTS };   // (the map draws the line: ui/worldMap.js)
// where each platform's centre (the trains stop with their middle there) falls on the line
const nearestS = (x, z) => { let best = 0, bd = Infinity; for (let i = 0; i < LINE_PTS.length; i++) { const d = (LINE_PTS[i][0] - x) ** 2 + (LINE_PTS[i][1] - z) ** 2; if (d < bd) { bd = d; best = i; } } return best; };
export const STOP_S = [nearestS(...E.F.toW(PLAT.ac, 0)), nearestS(...L.F.toW(PLAT.ac, 0))];
const sE1 = nearestS(...e1), sL0 = nearestS(...l0);
// the rails' height: level through the stations, a smooth dip under the river between them
export function railY(s) {
  if (s <= sE1 || s >= sL0) return Y.rail;
  const t = (s - sE1) / (sL0 - sE1);
  return Y.rail - 15 * Math.pow(Math.sin(Math.PI * t), 2);
}
// a point on the centreline: { x, z, tx, tz (unit tangent toward s+), y (rail) }
export function lineAt(s) {
  const c = Math.max(0, Math.min(LENGTH, s)), i = Math.min(LENGTH - 1, Math.floor(c)), f = c - i;
  const [ax, az] = LINE_PTS[i], [bx, bz] = LINE_PTS[i + 1], tl = Math.hypot(bx - ax, bz - az) || 1;
  return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, tx: (bx - ax) / tl, tz: (bz - az) / tl, y: railY(c) };
}
// a point on a track: dir +1 eastbound (right of the line's axis), -1 westbound; heading the way it runs
export function trackAt(s, dir) {
  const c = lineAt(s), o = dir * PLAT.track;
  return { x: c.x - c.tz * o, z: c.z + c.tx * o, y: c.y, hx: c.tx * dir, hz: c.tz * dir, heading: Math.atan2(c.tx * dir, c.tz * dir) };
}
// the line's tightest curve (m), for the tests
export function minRadius() {
  let r = Infinity;
  for (let s = 10; s < LENGTH - 10; s += 5) { const a = lineAt(s - 10), b = lineAt(s + 10), da = Math.atan2(b.tz, b.tx) - Math.atan2(a.tz, a.tx); const k = Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) / 20; if (k > 1e-6) r = Math.min(r, 1 / k); }
  return r;
}

// ---- a train's trip: q = metres along its way from where it comes into sight ----
// eastbound: s = q; westbound: s = LENGTH - q. Phases [{ t0, q0, v0, a, dur }]
function buildTrip(dir) {
  const stops = (dir > 0 ? STOP_S : [...STOP_S].reverse()).map((s) => (dir > 0 ? s : LENGTH - s));
  const P = []; let t = 0, q = 0, v = RUN.vmax;
  const push = (a, dur, kind, stop = null) => { if (dur <= 1e-6) return; P.push({ t0: t, q0: q, v0: v, a, dur, kind, stop }); q += v * dur + 0.5 * a * dur * dur; v += a * dur; t += dur; };
  // in at full speed, brake for the first stop
  const brake = RUN.vmax * RUN.vmax / (2 * RUN.dec);
  push(0, (stops[0] - brake) / RUN.vmax, 'run'); push(-RUN.dec, RUN.vmax / RUN.dec, 'brake'); v = 0; q = stops[0];
  push(0, RUN.dwell, 'dwell', dir > 0 ? 0 : 1);
  // to the second: up to speed, cruise, brake
  const D = stops[1] - stops[0], up = RUN.vmax * RUN.vmax / (2 * RUN.acc);
  push(RUN.acc, RUN.vmax / RUN.acc, 'accel'); push(0, (D - up - brake) / RUN.vmax, 'run'); push(-RUN.dec, RUN.vmax / RUN.dec, 'brake'); v = 0; q = stops[1];
  push(0, RUN.dwell, 'dwell', dir > 0 ? 1 : 0);
  // and away
  push(RUN.acc, RUN.vmax / RUN.acc, 'accel'); push(0, (LENGTH - q) / RUN.vmax, 'run');
  return { phases: P, dur: t, stops };
}
export const TRIPS = { 1: buildTrip(1), [-1]: buildTrip(-1) };
// where a trip is, t real seconds after it came into sight
export function tripAt(dir, t) {
  const T = TRIPS[dir]; if (t < 0 || t > T.dur) return null;
  let ph = T.phases[0];
  for (const p of T.phases) { if (t >= p.t0) ph = p; else break; }
  const u = Math.min(ph.dur, t - ph.t0), q = ph.q0 + ph.v0 * u + 0.5 * ph.a * u * u, v = Math.max(0, ph.v0 + ph.a * u);
  const s = dir > 0 ? q : LENGTH - q;
  let doors = 0, chime = false, dwellT = null;
  if (ph.kind === 'dwell') {
    dwellT = u;
    doors = u < DOORS.open0 ? 0 : u < DOORS.open1 ? (u - DOORS.open0) / (DOORS.open1 - DOORS.open0) : u < DOORS.close0 ? 1 : u < DOORS.close1 ? 1 - (u - DOORS.close0) / (DOORS.close1 - DOORS.close0) : 0;
    chime = u >= DOORS.chime && u < DOORS.close1;
  }
  return { s, q, v, a: ph.kind === 'dwell' ? 0 : ph.a, phase: ph.kind, station: ph.stop, dwellT, doors, chime, t };
}
// the clock trains run by: real seconds since day 0 (game seconds / TIME_RATE)
export const trainClock = (absGameMinutes) => absGameMinutes * 60 / TIME_RATE;
const DAY = 1440 * 60 / TIME_RATE;
// every train on the line at train-clock time T: { id, dir, k, ...tripAt }
export function trainsAt(T) {
  const out = [];
  for (const dir of [1, -1]) {
    const off = dir > 0 ? 0 : RUN.headway * 0.43, dur = TRIPS[dir].dur;
    for (let k = Math.floor((T - dur - off) / RUN.headway); k <= Math.floor((T - off) / RUN.headway); k++) {
      const t0 = k * RUN.headway + off, gm = ((t0 % DAY) + DAY) % DAY / (60 / TIME_RATE);   // the game minute it came into sight
      if (gm < RUN.first || gm >= RUN.last) continue;
      const st = tripAt(dir, T - t0); if (st) out.push({ id: `${dir > 0 ? 'E' : 'W'}${k}`, dir, k, ...st });
    }
  }
  return out;
}
// the next train to stop at a station going one way, after train-clock time T: { T: when it stops, wait }
export function nextStop(T, station, dir) {
  const off = dir > 0 ? 0 : RUN.headway * 0.43, ph = TRIPS[dir].phases.find((p) => p.kind === 'dwell' && p.stop === station);
  for (let k = Math.floor((T - ph.t0 - off) / RUN.headway); k < Math.floor((T - ph.t0 - off) / RUN.headway) + 2000; k++) {
    const t0 = k * RUN.headway + off, at = t0 + ph.t0, gm = ((t0 % DAY) + DAY) % DAY / (60 / TIME_RATE);
    if (at + RUN.dwell < T || gm < RUN.first || gm >= RUN.last) continue;
    return { T: at, wait: Math.max(0, at - T), standing: at <= T };
  }
  return null;
}
// a car's centre and heading on the line (car 0 leads)
export function carAt(train, k) {
  const s = train.s - train.dir * ((k - (CAR.n - 1) / 2) * CAR.len);
  const tr = trackAt(s, train.dir), ahead = trackAt(s + train.dir * 2, train.dir), behind = trackAt(s - train.dir * 2, train.dir);
  return { x: tr.x, z: tr.z, y: tr.y, heading: Math.atan2(ahead.x - behind.x, ahead.z - behind.z), pitch: Math.atan2(ahead.y - behind.y, 4), s };
}
export { TRAIN_LEN };
