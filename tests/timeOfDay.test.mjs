// The hour (src/engine/timeOfDay.js): the blue hour the game opens in is exactly the approved look; the
// sun rises and sets when it does over Shanghai in mid-November; the lights follow their schedule
// (floods at dusk, the late-night mode at ten, off after half past midnight); the crowd and the
// traffic thin out at night and the crowd engine and the traffic engine honour their share. npm test.
import { todState, sunDir, passedLateNight, H } from '../src/engine/timeOfDay.js';
import { createCrowd } from '../src/engine/crowd.js';
import { createTraffic } from '../src/engine/traffic.js';
import { crossing } from '../src/world/layout.js';
import { trafficSpecs } from '../src/world/trafficMix.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const at = (h, m = 0) => todState(H(h, m));

const b = at(17, 42);
ok(b.daylight === 0 && b.glow === 1 && b.night === 0 && b.floods === 1 && b.media === 1 && b.lamps === 1 && b.windows === 1 && b.exposure === 1.15, '5:42 pm is the approved blue hour: no daylight, the full afterglow, every light on');
// the sun: rise and set to within ten minutes of the almanac (6:25 / 4:57 for Shanghai, 15 November)
let rise = null, set = null;
for (let m = 0; m < 1440; m++) { const a = sunDir(m).el, c = sunDir(m + 1).el; if (a < 0 && c >= 0) rise = m; if (a >= 0 && c < 0) set = m; }
ok(Math.abs(rise - H(6, 25)) <= 10 && Math.abs(set - H(16, 57)) <= 10, `sunrise ${Math.floor(rise / 60)}:${String(rise % 60).padStart(2, '0')}, sunset ${Math.floor(set / 60)}:${String(set % 60).padStart(2, '0')}`);
const noon = sunDir(H(11, 42));
ok(Math.abs(noon.el - 40.2) < 1.5 && Math.abs(noon.x) < 0.02 && noon.z > 0.7, `noon: ${noon.el.toFixed(1)}° up, due south (+z)`);
ok(sunDir(H(8)).x > 0.5 && sunDir(H(15)).x < -0.5, 'morning sun in the east (over Pudong), afternoon in the west (behind the Bund)');
// daylight and the lights
const n = at(12);
ok(n.daylight === 1 && n.lamps === 0 && n.floods === 0 && n.media === 0 && n.outline === 0 && n.screens === 1 && n.shops === 1, 'noon: full daylight, lamps and floods off, Nanjing Road open with its screens on');
ok(at(19).floods === 1 && at(21, 59).media === 1 && at(22, 1).media === 0 && at(22, 1).floods > 0.1 && at(22, 1).floods < 0.3 && at(22, 1).lateNight === 1, '10 pm: the LED walls go dark, the floods dim to a faint wash (the late-night mode)');
ok(at(0, 29).floods > 0 && at(0, 31).floods === 0 && at(2).outline === 1 && at(2).lamps === 1, 'after half past midnight the floods are off; the outlines and the street lamps stay on all night');
ok(at(9, 59).shops === 0 && at(10).shops === 1 && at(21, 59).shops === 1 && at(22).shops === 0 && at(22, 59).signs === 1 && at(23).signs === 0, 'Nanjing Road: shops 10 am to 10 pm, the neon until 11');
ok(at(5, 29).metro === false && at(5, 30).metro === true && at(22, 59).metro === true && at(23).metro === false, 'the metro: first train 5:30, last about 11 pm');
ok(at(6).dawn && at(8).dawn && !at(9).dawn && !at(5).dawn, 'the dawn hour (joggers, tai chi): about 5:45 to 8:15');
ok(at(6, 15).glow > 0.5 && at(6, 15).side === 1 && at(17, 30).side === -1, 'the twilight glow is over Pudong at dawn and behind the Bund at dusk');
ok(at(3).night === 1 && at(3).daylight === 0 && at(20).night === 1, 'deep night by 6:40 pm, until dawn');
// continuity: no value jumps between neighbouring minutes except the scheduled switches
const keys = ['daylight', 'glow', 'night', 'lamps', 'outline', 'crowd', 'traffic', 'exposure', 'bloom', 'fog'];
let worst = 0, where = '';
for (let m = 0; m < 1440; m++) { const a = todState(m), c = todState(m + 1); for (const k of keys) { const d = Math.abs(a[k] - c[k]); if (d > worst) { worst = d; where = `${k} at ${m}`; } } }
ok(worst < 0.06, `the light changes smoothly minute to minute (largest step ${worst.toFixed(3)}, ${where})`);
ok(at(20).crowd === 1 && at(3).crowd < 0.1 && at(12).crowd > 0.5 && at(3).traffic < 0.4 && at(12).traffic === 1, 'the crowd is biggest in the evening, thin at 3 am; the traffic too');
ok(passedLateNight(H(21, 59), H(22, 0)) && !passedLateNight(H(21, 0), H(22, 30)) && !passedLateNight(H(22, 1), H(22, 2)) && !passedLateNight(H(20), H(23, 30)), 'the 10 pm switch is noticed when the clock passes it, not after a long skip');

// the crowd honours its share
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const c = createCrowd({ density: 0.6, rnd });
const all = c.count(), jog = c.agents.filter((a) => a.kind === 'jogger');
ok(jog.length > 0 && jog.every((a) => a.gone), `${jog.length} joggers, none out in the evening`);
c.setActive(0.1, { dawn: true, instant: true });
for (let i = 0; i < 300; i++) c.update(1 / 10, {});
const early = c.count(), joggers = c.agents.filter((a) => a.kind === 'jogger' && !a.gone).length;
ok(early < all * 0.4 && joggers >= jog.length * 0.5, `at dawn: ${early} out of ${all} evening walkers, ${joggers} of them jogging`);
ok(c.agents.filter((a) => a.kind === 'jogger' && !a.gone).every((a) => a.speed > 2.4 && a.y > 2.5), 'the joggers run on the promenade');
c.setActive(1, { dawn: false, instant: true });
for (let i = 0; i < 60; i++) c.update(1 / 10, {});
ok(c.count() > all * 0.85 && c.agents.filter((a) => a.kind === 'jogger' && !a.gone).length === 0, `back to the evening: ${c.count()} out, no joggers`);

// the traffic honours its share (the crossing's own seven and the buses always run)
const specs = trafficSpecs(1);
const tr = createTraffic({ geom: crossing, vehicles: specs, peds: [] });
tr.setDensity(0.3);
for (let i = 0; i < 20 * 300; i++) tr.update(0.05, {});
const active = tr.vehicles.filter((v) => v.active).length;
ok(active < specs.length * 0.6 && active >= 7, `at 3 am: ${active} of ${specs.length} vehicles on the road`);
tr.setDensity(1);
for (let i = 0; i < 20 * 300; i++) tr.update(0.05, {});
ok(tr.vehicles.filter((v) => v.active).length > specs.length * 0.75, `by day: ${tr.vehicles.filter((v) => v.active).length} on the road`);

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
