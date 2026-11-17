// Line 2's two stations and the line between them (world/metroLayout.js, engine/metroLine.js): the floors,
// the walls, the gates and security, the escalators, the timetable, the doors.
import { STATIONS, Y, CONC, PLAT, GATE, gateP, SEC, ESC, DOOR_AS, CAR, HOOK, metroGroundAt, metroKeep, metroZone, rampY } from '../src/world/metroLayout.js';
import { trainsAt, trainClock, nextStop, tripAt, TRIPS, LENGTH, STOP_S, minRadius, railY, carAt, RUN, DOORS } from '../src/engine/metroLine.js';
import { groundHeight } from '../src/world/layout.js';
import { stepBody } from '../src/engine/movement.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const [E, L] = STATIONS;
const body = (st, a, p, y) => { const [x, z] = st.F.toW(a, p); return { x, z, y, vx: 0, vz: 0, vy: 0, air: false }; };
const local = (st, b) => st.F.toL(b.x, b.z);

// ---- floors ----
for (const st of STATIONS) {
  const [x, z] = st.F.toW(-5, 0);
  ok(metroGroundAt(x, z, Y.C) === Y.C, `${st.id}: the concourse floor is ${Y.C} m down`);
  const [px, pz] = st.F.toW(60, 2);
  ok(metroGroundAt(px, pz, Y.P) === Y.P, `${st.id}: the platform floor is ${Y.P} m down`);
  const [ex, ez] = st.F.toW(ESC.aT + ESC.run / 2, 0);
  ok(Math.abs(metroGroundAt(ex, ez, -7.8) - rampY(ESC.aT + ESC.run / 2)) < 1e-6, `${st.id}: half way down the stair`);
  ok(metroGroundAt(x, z, 0.15) === null, `${st.id}: at street level the station has no say`);
}
// ---- walking: down an exit into the concourse, and down the escalator to the platform ----
{
  const m = E.ways.exits.find((e) => e.exit === 7), b = body(E, m.land[0], m.land[1], Y.C); HOOK.dt = 1 / 30;
  for (let i = 0; i < 90; i++) { const [a, p] = local(E, b), dx = -8 - a, dz = -6 - p, d = Math.hypot(dx, dz) || 1; const [wx, wz] = [dx / d * E.F.ux - dz / d * E.F.uz, dx / d * E.F.uz + dz / d * E.F.ux]; stepBody(b, wx, wz, false, 1 / 30); }
  const z = metroZone(b.x, b.z, b.y); ok(z && z.level === 'unpaid' && Math.abs(b.y - Y.C) < 0.05, `from Exit 7's landing into the concourse (${z && z.level})`);
}
for (const st of STATIONS) {
  const b = body(st, ESC.aT - 1, 2.17, Y.C); HOOK.dt = 1 / 30;
  for (let i = 0; i < 400; i++) stepBody(b, st.F.ux, st.F.uz, false, 1 / 30);
  ok(Math.abs(b.y - Y.P) < 0.05, `${st.id}: down the escalator to the platform (y ${b.y.toFixed(2)})`);
  // standing still on the down escalator, it carries you
  const s = body(st, ESC.aT + 2, 2.17, rampY(ESC.aT + 2)); for (let i = 0; i < 60; i++) stepBody(s, 0, 0, false, 1 / 30);
  ok(local(st, s)[0] > ESC.aT + 2.5, `${st.id}: the down escalator carries you down (${local(st, s)[0].toFixed(2)})`);
}
// ---- the gate line and security ----
{
  const b = body(E, GATE.a - 1.2, gateP(6), Y.C); HOOK.gateOpen = () => false;
  for (let i = 0; i < 60; i++) stepBody(b, 1, 0, false, 1 / 30);
  ok(local(E, b)[0] < GATE.a, 'a shut gate stops you');
  HOOK.gateOpen = (st, i) => i === 6;
  for (let i = 0; i < 60; i++) stepBody(b, 1, 0, false, 1 / 30);
  ok(local(E, b)[0] > GATE.a + 0.5, 'an open gate lets you through');
  HOOK.gateOpen = () => false;
  // with a bag you haven't screened, the open way past the X-ray is held
  HOOK.mustScreen = () => true;
  const c = body(E, SEC.a - 1, 0.9, Y.C); for (let i = 0; i < 60; i++) stepBody(c, 1, 0, false, 1 / 30);
  ok(local(E, c)[0] < SEC.a, 'with a bag: stopped at security');
  HOOK.mustScreen = () => false;
  for (let i = 0; i < 60; i++) stepBody(c, 1, 0, false, 1 / 30);
  ok(local(E, c)[0] > SEC.a + 0.5, 'without one: straight past');
  // the way out side can't reach the way in
  const d = body(E, GATE.a - 2, -2, Y.C); for (let i = 0; i < 60; i++) stepBody(d, 0, 1, false, 1 / 30);
  ok(local(E, d)[1] < SEC.divider, 'the divider keeps the way out from the way in');
}
// ---- the screen doors ----
{
  const b = body(E, DOOR_AS[10], 4.5, Y.P); HOOK.doorOpen = () => false;
  for (let i = 0; i < 60; i++) stepBody(b, 0, 1, false, 1 / 30);
  ok(local(E, b)[1] < PLAT.psd - 0.2, 'shut screen doors keep you on the platform');
}
// ---- the line and the timetable ----
ok(minRadius() > 300, `the tunnel's tightest curve is ${Math.round(minRadius())} m (> 300)`);
ok(Math.min(...Array.from({ length: 100 }, (_, i) => railY(i * LENGTH / 100))) < -25, 'under the river the line is more than 25 m down');
ok(STOP_S[1] - STOP_S[0] > 1300 && STOP_S[1] - STOP_S[0] < 2000, `the stations are ${Math.round(STOP_S[1] - STOP_S[0])} m apart`);
{
  const T = trainClock(10 * 60), n = nextStop(T, 0, 1);
  ok(n && n.wait <= RUN.headway, `at 10 am the next eastbound train at East Nanjing Road is within a headway (${n.wait.toFixed(0)} s)`);
  const tr = trainsAt(n.T + 10).find((t) => t.dir === 1 && t.phase === 'dwell' && t.station === 0);
  ok(!!tr && tr.doors === 1, 'ten seconds after it stops, its doors are open');
  // its doors line up with the screen doors
  const c = carAt(tr, 3), [, p] = E.F.toL(c.x, c.z);
  ok(Math.abs(p - PLAT.track) < 0.05, 'it stands on the eastbound track');
  const doors = []; for (let k = 0; k < CAR.n; k++) { const ck = carAt(tr, k); for (const d of CAR.doors) { const lz = d, x = ck.x + Math.sin(ck.heading) * lz, z = ck.z + Math.cos(ck.heading) * lz; doors.push(E.F.toL(x, z)[0]); } }
  ok(doors.every((a) => DOOR_AS.some((b) => Math.abs(a - b) < 0.1)), 'every train door is at a screen door');
  ok(trainsAt(trainClock(2 * 60)).length === 0, 'none at 2 am');
  ok(TRIPS[1].phases.filter((p) => p.kind === 'dwell').length === 2, 'each train stops at both stations');
  const run = TRIPS[1].phases.filter((p) => ['accel', 'run', 'brake'].includes(p.kind)).slice(2, 5).reduce((s, p) => s + p.dur, 0);
  ok(run > 60 && run < 120, `the ride between them takes ${run.toFixed(0)} s`);
  ok(DOORS.close1 < RUN.dwell, 'the doors are shut before it leaves');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed'); process.exit(failed ? 1 : 0);
