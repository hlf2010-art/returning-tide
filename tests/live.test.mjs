// The liveliness numbers (src/engine/live.js) and the hero shots (src/engine/bench.js). npm test.
import { LIVE, vehicleKind, activityOf, countPeople, countVehicles, frameWindow, audibleSummary, flatLive, bedSources, BED_KIND } from '../src/engine/live.js';
import { HERO_SHOTS, percentile, frameSummary, sampleSummary, shotsReport } from '../src/engine/bench.js';
import { NJ, L, groundHeight } from '../src/world/layout.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

ok(['taxi', 'bus', 'boat', 'nio-et5', 'li-l9', 'aito-m9', 'luxeed-r7', 'sedan', null].map(vehicleKind).join() === 'taxi,bus,boat,nev,nev,nev,nev,car,car', 'vehicle types: taxi, bus, boat, the four NEV lookalikes, everything else a car');
const acts = [
  [{ state: 'act', act: 'photo' }, 'photographing'], [{ state: 'act', act: 'selfie' }, 'taking a selfie'], [{ state: 'act', act: 'look', window: true }, 'window-shopping'],
  [{ state: 'act', act: 'look' }, 'looking at the view'], [{ state: 'kerb' }, 'waiting to cross'], [{ state: 'bus' }, 'waiting for a bus'], [{ state: 'shop' }, 'in and out of shops'],
  [{ state: 'walk', kind: 'jogger', v: 2.5 }, 'jogging'], [{ state: 'walk', kind: 'follower', v: 0.9 }, 'on a tour'], [{ state: 'walk', v: 1.2, partner: {} }, 'walking together'],
  [{ state: 'walk', v: 1.2, phone: true }, 'walking on the phone'], [{ state: 'walk', v: 1.2 }, 'walking'], [{ state: 'walk', v: 0 }, 'standing'], [{ activity: 'tai chi' }, 'tai chi'],
];
ok(acts.every(([a, want]) => activityOf(a) === want), 'what people are doing, in a word or two (crowd states, and others that say it themselves)');

const eye = { x: 0, y: 1.7, z: 0 }, all = () => true, front = (x) => x > 0;   // a view test: only what's in front (x > 0)
const people = [
  { x: 5, z: 0, near: true, state: 'act', act: 'photo' }, { x: 20, z: 0, state: 'walk', v: 1 }, { x: 39, z: 0, state: 'walk', v: 1 },
  { x: 100, z: 0, state: 'walk', v: 1 }, { x: 200, z: 0, state: 'kerb' }, { x: LIVE.far + 5, z: 0 }, { x: -10, z: 0, near: true }, { x: 8, z: 0, gone: true }, { x: 9, z: 0, inside: true },
];
const c = countPeople(people, eye, front);
ok(c.near === 1 && c.mid === 2 && c.impostor === 2 && c.total === 5, `people in view by tier: near ${c.near}, mid ${c.mid} (< ${LIVE.mid} m), impostor ${c.impostor}; behind, gone, indoors or past ${LIVE.far} m not counted`);
ok(c.activities.photographing === 1 && c.activities.walking === 3 && !c.activities['waiting to cross'], `activities counted within ${LIVE.activityRange} m only (the one waiting 200 m off is a dot)`);
const v = countVehicles([{ x: 10, z: 0, model: 'taxi' }, { x: 20, z: 0, model: 'bus' }, { x: 30, z: 0, model: 'li-l9' }, { x: 40, z: 0, model: 'sedan', active: false }, { x: -5, z: 0, model: 'taxi' }, { x: 300, z: 0, model: 'boat' }], eye, front);
ok(v.total === 4 && v.taxi === 1 && v.bus === 1 && v.nev === 1 && v.boat === 1 && v.car === 0, 'vehicles in view by type (parked-off and behind not counted)');

const fw = frameWindow(10);
ok(fw.stats().frames === 0, 'no frames yet: zeros');
for (let i = 0; i < 9; i++) fw.push(10, 4); fw.push(40, 20);
const fs = fw.stats();
ok(fs.frames === 10 && fs.avgMs === 13 && fs.p95Ms === 40 && fs.cpuMs === 5.6, `rolling frame time: avg ${fs.avgMs} ms, p95 ${fs.p95Ms} ms, main thread ${fs.cpuMs} ms`);
for (let i = 0; i < 10; i++) fw.push(16, 4);
ok(fw.stats().avgMs === 16 && fw.stats().p95Ms === 16, 'it only keeps the last n frames');
const au = audibleSummary([{ id: 'wind', kind: 'wind', level: 0.2 }, { id: 'a', kind: 'vehicle', level: 0.05 }, { id: 'b', kind: 'vehicle', level: 0.0001 }, { id: 'clock', kind: 'clock', level: 0.1 }]);
ok(au.count === 3 && au.kinds.vehicle === 1 && au.top[0].id === 'wind', 'audible: only sources above the threshold, loudest first, counted by kind');
const bs = bedSources({ crowd: 0.6, traffic: 0.2, river: 0.005, boats: 0.1, wind: 0.3, mystery: 1 });
ok(bs.length === 5 && bs.find((s) => s.id === 'bed:crowd').kind === 'chatter' && bs.find((s) => s.id === 'bed:boats').kind === 'boat', 'the recorded beds count as sources of their kind; unknown beds are left out');
const bau = audibleSummary(bs);
ok(bau.kinds.chatter === 1 && bau.kinds.wind === 1 && !bau.kinds.water && Object.keys(BED_KIND).length === 5, 'a bed below the threshold is not audible (the river far from the railing)');
const flat = flatLive({ people: { near: 1, mid: 2, impostor: 3, total: 6 }, vehicles: v, activities: { count: 4 }, audible: au, draw: { calls: 100, triangles: 2e5 } });
ok(flat.people === 6 && flat.vehicles === 4 && flat.audible === 3 && flat.calls === 100, 'a sample flattens to plain numbers for the benchmark');

// the hero shots
ok(HERO_SHOTS.length === 4 && new Set(HERO_SHOTS.map((s) => s.id)).size === 4, 'four hero shots, each its own id');
const want = { nanjing: [18, 0], customs: [17, 45], hankou: [18, 15], morning: [8, 0] };
ok(HERO_SHOTS.every((s) => want[s.id] && s.hour[0] === want[s.id][0] && s.hour[1] === want[s.id][1]), 'at the asked hours: Nanjing Road 18:00, the Customs House 17:45, Hankou Road 18:15, the Bund 8:00');
const eyeOk = HERO_SHOTS.every((s) => Math.abs(s.pos[1] - (groundHeight(s.pos[0], s.pos[2], s.pos[1]) + L.eye)) < 0.25);
ok(eyeOk, `every camera at a person's eye height over the ground there (${HERO_SHOTS.map((s) => `${s.id} ${(s.pos[1] - groundHeight(s.pos[0], s.pos[2], s.pos[1])).toFixed(2)} m`).join(', ')})`);
const nj = HERO_SHOTS.find((s) => s.id === 'nanjing');
ok(nj.pos[2] > NJ.z0 && nj.pos[2] < NJ.z1 && nj.pos[0] > NJ.henan.x1 && nj.pos[0] - NJ.henan.x1 < 40, 'the Nanjing Road shot stands on the street, just east of Henan Road');
ok(percentile([5, 1, 4, 2, 3], 50) === 3 && percentile([], 50) === null && percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95) === 10, 'percentiles (nearest rank)');
const fsum = frameSummary([10, 10, 10, 30]);
ok(fsum.avgMs === 15 && fsum.p95Ms === 30 && fsum.fps === 66.67 && frameSummary([]) === null, 'frame summary: average, p95, frame rate');
const ss = sampleSummary([{ people: 10, calls: 100 }, { people: 20, calls: 120 }]);
ok(ss.people.mean === 15 && ss.people.max === 20 && ss.calls.mean === 110, 'samples: mean and most');
const rep = shotsReport({ shots: [], settings: { preset: 'mac' } });
ok(rep.benchmark && rep.version === 1 && rep.settings.preset === 'mac' && JSON.parse(JSON.stringify(rep)).settings.preset === 'mac', 'the report is plain JSON');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
