// clear -> drizzle -> clear: gradual, reversible, exact restoration, no drift over many toggles.
import { createWeather, WEATHER_CONFIG as C } from '../src/engine/weather.js';
import { covers, underCover, colliders } from '../src/world/layout.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const DT = 1 / 30;
const run = (w, s, each) => { for (let i = 0; i < s / DT; i++) { w.update(DT); if (each) each(w); } };

const w = createWeather();
ok(w.target === 'clear' && w.rain === 0 && w.haze === 0 && w.wet === 0 && w.settled, 'starts clear and settled');
w.set('drizzle');
let maxStep = 0, prev = { r: 0, h: 0, k: 0 };
run(w, 3, () => {});
prev = { r: w.rain, h: w.haze, k: w.wet };
ok(w.rain > 0 && w.rain < 0.2, `rain eases in, not on (${w.rain.toFixed(3)} after 3 s)`);
run(w, C.rampIn * C.hazeLag + C.wetIn + 5, (q) => {
  maxStep = Math.max(maxStep, Math.abs(q.rain - prev.r), Math.abs(q.haze - prev.h), Math.abs(q.wet - prev.k));
  prev = { r: q.rain, h: q.haze, k: q.wet };
});
ok(w.rain === 1 && w.haze === 1 && w.wet === 1 && w.settled, 'reaches full drizzle, full haze, full wetness');
ok(maxStep < 0.01, `no jumps (largest per-frame change ${maxStep.toFixed(4)})`);
w.set('clear');
let wetWhileRaining = true;
run(w, 6, (q) => { if (q.rain > 0.3 && q.wet < 0.999) wetWhileRaining = false; });
ok(wetWhileRaining && w.wet > 0.95, 'ground stays wet while the rain is still thinning');
run(w, C.rampOut * C.hazeLag + C.dryOut + 5);
ok(w.rain === 0 && w.haze === 0 && w.wet === 0 && w.settled, 'clear again: exactly back to the starting values');

// half-way reversals and many quick toggles never drift or overshoot
const q = createWeather();
let bad = 0;
for (let k = 0; k < 40; k++) { q.toggle(); run(q, 1 + (k % 7), (x) => { if (x.rain < 0 || x.rain > 1 || x.wet < 0 || x.wet > 1 || x.haze < 0 || x.haze > 1) bad++; }); }
ok(bad === 0, '40 quick reversals: every level stays within 0..1');
q.set('clear'); run(q, 200);
ok(q.settled && q.rain === 0 && q.wet === 0 && q.haze === 0, 'and settles exactly clear afterwards');
// a brief shower barely wets the ground
const b = createWeather(); b.set('drizzle'); run(b, 5); b.set('clear'); run(b, 3);
ok(b.wet < 0.05, `a 5 s sprinkle leaves the ground almost dry (${b.wet.toFixed(3)})`);
const i = createWeather(); i.set('drizzle', { instant: true });
ok(i.rain === 1 && i.wet === 1 && i.haze === 1, 'instant set for testing');
let threw = false; try { i.set('storm'); } catch { threw = true; }
ok(threw, 'only clear and drizzle exist');
// covered places: the shop canopy, the Customs portico, and indoors (the Peace Hotel hall, the AIA lobby)
ok(covers.length === 6 && underCover(-69.2, -6.0, 1.8) && underCover(-32.5, 27, 5) && !underCover(-69.2, -6.0, 4.5), 'under the canopy / portico counts as covered (below the roof only)');
ok(underCover(-48, -229, 1.7) && underCover(-40, -145, 1.7) && !underCover(-31, -229, 1.7), 'indoors is covered; the pavement outside is not');
ok(!underCover(-69.2, -3.0, 1.8) && !underCover(22, 0, 4.7) && !underCover(-16, 0, 1.7), 'the road, pavement and promenade are open to the sky');
ok(colliders.some((c) => c.tag === 'portico' && c.minX <= -34 && c.maxX >= -31.0), 'portico cover matches its collider footprint');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
