// Places (phase 4.4): the river cruise's route and timetable (src/engine/cruiseRoute.js) and the
// shengjian shop's menu (src/world/dumpling.js data). npm test.
import { cruiseAt, pointAt, LENGTH, TRIP_SECONDS, TRIP_MINUTES, DEPARTURES, DOCK, distanceAt, VMAX } from '../src/engine/cruiseRoute.js';
import { L, PIER } from '../src/world/layout.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

ok(LENGTH > 1200 && LENGTH < 2400 && TRIP_SECONDS > 240 && TRIP_SECONDS < 480, `the loop: ${LENGTH.toFixed(0)} m, ${(TRIP_SECONDS / 60).toFixed(1)} real minutes (${TRIP_MINUTES.toFixed(0)} on the game clock)`);
ok(DEPARTURES[0] === 600 && DEPARTURES[DEPARTURES.length - 1] === 1260 && TRIP_MINUTES < 60, 'hourly from 10 am to 9 pm, each back well before the next');
// the route stays on the river: off the Bund's wall, clear of Pudong's, never near the background boats' lanes
let minX = Infinity, maxX = -Infinity, maxStep = 0, maxTurn = 0, prev = pointAt(0);
for (let s = 1; s <= LENGTH; s += 1) {
  const p = pointAt(s); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
  maxStep = Math.max(maxStep, Math.hypot(p.x - prev.x, p.z - prev.z));
  let dh = p.h - prev.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; if (s < LENGTH - 30) maxTurn = Math.max(maxTurn, Math.abs(dh));   // (the last 30 m: easing in to the pier, at walking pace)
  prev = p;
}
ok(minX >= PIER.x1 + 4 && maxX < 200, `on the water the whole way (x ${minX.toFixed(0)}..${maxX.toFixed(0)}; the pier ends at ${PIER.x1}, the far bank is at 470)`);
ok(maxStep < 1.2 && maxTurn < 0.055, `smooth: no jumps or loops (largest step ${maxStep.toFixed(2)} m per metre, turn ${(maxTurn * 180 / Math.PI).toFixed(1)}° per metre)`);
const a = pointAt(0), b = pointAt(LENGTH);
ok(Math.hypot(a.x - DOCK.x, a.z - DOCK.z) < 0.01 && Math.hypot(b.x - DOCK.x, b.z - DOCK.z) < 0.01, 'starts and ends alongside the pier');
// the clock places the boat
const d = cruiseAt(19 * 60 + 30), o = cruiseAt(20 * 60 + 5), back = cruiseAt(20 * 60 + Math.ceil(TRIP_MINUTES) + 1), late = cruiseAt(21 * 60 + 50);
ok(d.status === 'docked' && d.next === 1200 && o.status === 'out' && o.s > 0 && back.status === 'docked' && late.status === 'docked' && late.next === null, 'docked between sailings; out on the river from the hour; none after the last');
ok(Math.abs(distanceAt(TRIP_SECONDS / 2) - LENGTH / 2) < 1 && cruiseAt(20 * 60 + TRIP_MINUTES / 2).v === VMAX, `full speed (${VMAX} m/s, ~12 knots) mid-trip`);
// the Bund is on the left going north (west of the boat), Lujiazui on the right
const n = cruiseAt(20 * 60 + 3);
ok(Math.cos(n.h) < -0.9 && n.x < 120, 'northbound along the Bund side first (the Bund on the left)');

const { MENU } = await import('../src/world/dumpling.js').catch(() => ({ MENU: null }));
if (MENU) ok(MENU.length === 5 && MENU.every((m) => m.price > 0 && m.price < 30) && MENU.find((m) => m.id === 'sj4').buns === 4, `the shop's menu: ${MENU.map((m) => `${m.en} ¥${m.price}`).join(', ')}`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
