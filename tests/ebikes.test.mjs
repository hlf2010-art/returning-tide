// E-bikes on the side streets (engine/ebikes.js): no overlaps, never off their lanes, never through a
// red or onto a busy zebra, bunching ahead of the stop line, couriers pulling in, the hour's density.
import { createEbikes, EBIKE_LANES, EBIKE, courierStops, projectObstacle } from '../src/engine/ebikes.js';
import { createSignalController, TRAFFIC_CONFIG } from '../src/engine/traffic.js';
import { L, NJ, manner } from '../src/world/layout.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const DT = 1 / 30;
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const henanSignal = (ctl) => (id) => id === 'henan'
  ? { go: ctl.vehAspect === 'green' || ctl.vehAspect === 'green-flash', yellow: ctl.vehAspect === 'yellow', early: ctl.phase === 'AR2' && !ctl.extending, toGreen: TRAFFIC_CONFIG.allRedPed - ctl.time }
  : { go: true, early: false };
const onLane = (r) => {
  const l = r.lane, dx = r.x - l.ax, dz = r.z - l.az, along = dx * l.fx + dz * l.fz, across = dx * l.fz - dz * l.fx;
  return along > -0.5 && along < l.len + 5 && across > -0.8 && across < 0.2 + EBIKE.slotW * ((l.slots || 3) - 1) + 0.1;
};

// 1. a long run under a working signal: no overlaps, never off a lane, never through red
{
  const ctl = createSignalController();
  const E = createEbikes({ count: 60, rng: seeded(7), signal: henanSignal(ctl) });
  let overlaps = 0, off = 0, bund = 0, ped = 0, waitAhead = 0, waitAll = 0;
  for (let i = 0; i < 600 / DT; i++) {
    ctl.update(DT, { boxOccupied: false, crosswalkOccupied: false });
    E.update(DT);
    const live = E.riders.filter((r) => r.active && r.fade > 0.5 && r.state !== 'park');
    for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
      const p = live[a], q = live[b]; if (p.lane !== q.lane) continue;
      if (Math.abs(p.s - q.s) < EBIKE.len - 0.15 && Math.abs(p.lat - q.lat) < EBIKE.width - 0.05) overlaps++;
    }
    for (const r of E.riders) {
      if (!r.active) continue;
      if (!onLane(r)) off++;
      if (r.x > L.westCurbX - 0.5 && r.x < L.eastCurbX) bund++;                 // the Bund road
      if (r.z > -212 && r.z < -190 && Math.abs(r.x + 505) > 9) ped++;           // the pedestrian street (Henan's crossing aside)
    }
    // a red light: where do the waiting riders on Henan Road stand?
    if (ctl.vehAspect === 'red' && ctl.time > 6) for (const r of E.riders) {
      if (!r.active || !r.lane.id.startsWith('henan') || r.v > 0.3 || r.state === 'park') continue;
      const d = r.lane.stop - r.s; if (d < 0 || d > 40) continue;
      // the first car's back is 5.4 + 4.6 m before the zebra; the riders' line is 3.6 m before it
      waitAll++; if (d < 6.4 + 0.9) waitAhead++;
    }
  }
  ok(overlaps === 0, `no rider overlaps another (${overlaps})`);
  ok(off === 0, `no rider ever leaves the lane list (${off})`);
  ok(bund === 0 && ped === 0, `none on the Bund road (${bund}) or the pedestrian street (${ped})`);
  ok(E.stats.redRuns === 0, `none crosses the stop line on red (${E.stats.redRuns})`);
  ok(waitAll > 0 && waitAhead / waitAll >= 0.7, `at a red, most waiting riders are beside or ahead of the first car (${waitAhead}/${waitAll})`);
  ok(E.stats.vanished > 5 && E.stats.spawned > 5, `they come and go at the lanes' ends (${E.stats.spawned} in, ${E.stats.vanished} out)`);
}

// 2. they start a little before the cars: some cross in the last second of the all-red
{
  const ctl = createSignalController();
  const E = createEbikes({ count: 60, rng: seeded(3), signal: henanSignal(ctl) });
  let early = 0;
  const before = new Map();
  for (let i = 0; i < 300 / DT; i++) {
    ctl.update(DT, { boxOccupied: false, crosswalkOccupied: false });
    for (const r of E.riders) before.set(r, r.s);
    E.update(DT);
    if (ctl.phase === 'AR2') for (const r of E.riders) if (r.lane.stop != null && before.get(r) <= r.lane.stop && r.s > r.lane.stop) early++;
  }
  ok(early > 0, `riders go a second before the green (${early} crossings in the all-red's last moments)`);
}

// 3. a busy zebra holds them even on green
{
  const E = createEbikes({ count: 60, rng: seeded(5), signal: () => ({ go: true }), blocked: () => true });
  let entries = 0;
  for (let i = 0; i < 120 / DT; i++) {
    const s0 = E.riders.map((r) => r.s); E.update(DT);
    E.riders.forEach((r, k) => { if (r.lane.stop != null && s0[k] <= r.lane.stop && r.s > r.lane.stop + 0.01) entries++; });
  }
  ok(entries === 0, `none rides onto the zebra while people are on it (${entries})`);
}

// 4. couriers pull in; the hour thins them; nobody watching is needed for the side streets' ends
{
  const E = createEbikes({ count: 80, rng: seeded(9) });
  let parked = 0;
  for (let i = 0; i < 400 / DT; i++) { E.update(DT); parked = Math.max(parked, E.riders.filter((r) => r.state === 'park').length); }
  ok(parked > 0, `couriers stop at the kerb now and then (up to ${parked} at once)`);
  E.setDensity(0.3);
  for (let i = 0; i < 400 / DT; i++) E.update(DT);
  const out = E.riders.filter((r) => r.active).length;
  ok(out <= Math.ceil(80 * 0.3) + 3, `late at night only the hour's share are out (${out} of 80)`);
  const W = createEbikes({ count: 40, rng: seeded(2), canVanish: () => false });
  for (let i = 0; i < 20 / DT; i++) W.update(DT);
  ok(W.stats.spawnedSide === 0, 'with the side streets\' ends in view, no one appears there out of nothing');
  ok(EBIKE_LANES.every((l) => !(l.ax > L.westCurbX && l.ax < L.eastCurbX)), 'no lane is on the Bund road');
}

// 5. pickups: off the bike, to Linger's hatch or round the corner into a Nanjing Road shop, back with a bag,
// the box opened and shut, and away; one courier at a counter at a time; on foot only on the pavements
{
  const doors = [{ x: -530, z: NJ.z0, dir: 1 }, { x: -545, z: NJ.z1, dir: -1 }, { x: -480, z: NJ.z0, dir: 1 }, { x: -470, z: NJ.z1, dir: -1 }, { x: -700, z: NJ.z0, dir: 1 }];
  const stops = courierStops(EBIKE_LANES, doors);
  const all = [...stops.values()].flat();
  ok(all.some((s) => s.id === 'manner') && all.filter((s) => s.kind === 'door').length >= 4, `pickups: Linger's hatch and the Nanjing Road doors by Henan Road (${all.length})`);
  ok(!all.some((s) => s.id.includes('-700')), 'no door too far from the corner to walk to');
  const ctl = createSignalController();
  const E = createEbikes({ count: 80, rng: seeded(11), signal: henanSignal(ctl), doors });
  const seen = new Map(), phases = new Set();
  let atManner = 0, onRoad = 0, hiddenAtHatch = 0, lidLeftOpen = 0, done = 0, bagHome = 0, maxAtCounter = 0, footInHenanRoad = 0, looks = 0, calls = 0;
  const prevPhone = new Map();
  for (let i = 0; i < 900 / DT; i++) {
    ctl.update(DT, { boxOccupied: false, crosswalkOccupied: false });
    E.update(DT);
    const counter = new Map();
    for (const r of E.riders) {
      if (r.phone && prevPhone.get(r) !== r.phoneN) { if (r.phone === 'look') looks++; else calls++; }
      prevPhone.set(r, r.phoneN);
      if (r.task && r.task.kind === 'pickup') { const id = r.task.stop.id; counter.set(id, (counter.get(id) || 0) + 1); }
      const f = r.foot;
      if (!f) { if (seen.has(r)) { done++; if (seen.get(r).bag) bagHome++; seen.delete(r); } if (r.state !== 'park' && r.lid > 0) lidLeftOpen++; continue; }
      phases.add(f.phase);
      seen.set(r, { bag: seen.has(r) && seen.get(r).bag || f.bag || f.phase === 'load' });
      if (r.task.stop.id === 'manner') {
        if (f.phase === 'wait') atManner++;
        if (f.hidden) hiddenAtHatch++;
        if (f.z > -L.street.roadHalfW + 0.9) onRoad++;                     // never out in Hankou Road's traffic
      } else {
        if (f.x > NJ.henan.x0 + 0.9 && f.x < NJ.henan.x1 - 0.9) footInHenanRoad++;
      }
    }
    for (const n of counter.values()) maxAtCounter = Math.max(maxAtCounter, n);
  }
  ok(E.stats.pickups >= 6, `couriers collect orders (${E.stats.pickups} pickups in 15 minutes)`);
  ok(atManner > 0 && hiddenAtHatch === 0, `at Linger they wait at the hatch, in sight (${(atManner * DT).toFixed(0)} s)`);
  ok(['off', 'walk', 'wait', 'back', 'load', 'on'].every((p) => phases.has(p)), `the whole round: ${[...phases].join(' > ')}`);
  ok(done >= 4 && bagHome === done, `every finished pickup came back with the bag and loaded it (${bagHome}/${done})`);
  ok(onRoad === 0 && footInHenanRoad === 0, `on foot only on the pavements (Hankou ${onRoad}, Henan ${footInHenanRoad})`);
  ok(lidLeftOpen === 0, `no box rides off with its lid open (${lidLeftOpen})`);
  ok(maxAtCounter <= 1, `one courier at a counter at a time (${maxAtCounter})`);
  ok(looks > 10 && calls > 5 && E.stats.phoneStops > 0, `phones: ${looks} looks, ${calls} calls, ${E.stats.phoneStops} pull-ins to answer one`);
  // shut: no pickups
  const C = createEbikes({ count: 80, rng: seeded(11), signal: henanSignal(createSignalController()), doors, open: () => false });
  for (let i = 0; i < 300 / DT; i++) C.update(DT);
  ok(C.stats.pickups === 0, `with the shops shut, nobody collects (${C.stats.pickups})`);
}

// 6. the Strale parked on Hankou Road (world/huracan.js HURACAN_SPOT, nose east): ridden round, never through;
// someone standing in the road: round them too; someone crossing: waited for
{
  const car = { x: -40.6, z: 2.86, hl: 2.28, hw: 1.015, fx: 1, fz: 0, kind: 'car' };
  const inside = (r, o) => {
    if (!r.active || r.fade < 0.5 || r.state === 'gone') return false;
    const p = projectObstacle(r.lane, o), m = 0.02;
    return p.s1 > r.s - EBIKE.len + m && p.s0 < r.s - m && p.l1 > r.lat - EBIKE.width / 2 + m && p.l0 < r.lat + EBIKE.width / 2 - m;
  };
  // (watched: nobody vanishes at the lane's end early, so they all have to get by it)
  const run = (obs, secs, seed, each, watched = false, px = obs[0].x) => {
    const E = createEbikes({ count: 60, rng: seeded(seed), obstacles: () => obs, canVanish: () => !watched });
    let hits = 0, passed = 0, moving = 0;
    const was = new Map();
    for (let i = 0; i < secs / DT; i++) {
      if (each) each(i * DT, obs);
      E.update(DT);
      for (const r of E.riders) {
        if (i * DT > 3) for (const o of obs) if (inside(r, o)) { hits++; if (r.v > 0.3) moving++; }   // (anyone it appeared on top of has slid out by then)
        if (r.lane.id === 'hankou-e' && r.active) { const x0 = was.get(r); if (x0 != null && x0 < px - 3 && r.x >= px + 2.6) passed++; if (r.x < px - 3 || r.x >= px + 2.6) was.set(r, r.x); }
      }
    }
    return { E, hits, passed, moving };
  };
  const a = run([car], 300, 13, null, true);
  ok(a.hits === 0 && a.E.stats.dodges > 0, `no rider goes through the parked Strale, watched (${a.hits} frames inside it, ${a.E.stats.dodges} moves out round it)`);
  const free = run([{ x: -62, z: 50, hl: 0.1, hw: 0.1 }], 300, 13, null, false, -62), mid = run([{ ...car, x: -62 }], 300, 13);
  ok(mid.hits === 0 && mid.passed >= free.passed * 0.5, `parked mid-street, the flow goes on round it (${mid.passed} past it, ${free.passed} with the street clear, ${mid.hits} hits)`);
  const man = { x: -60, z: 2.2, hl: 0.3, hw: 0.3, kind: 'person' };
  const b = run([man], 200, 17);
  ok(b.hits === 0 && b.passed >= free.passed * 0.3, `someone standing in the road: ridden round, never into (${b.hits} hits, ${b.passed} past)`);
  // a person walking across Hankou Road and back, over and over
  const walker = { x: -55, z: -4.5, hl: 0.3, hw: 0.3, vx: 0, vz: 1.3, kind: 'person' };
  const c = run([walker], 240, 19, (t) => { const k = (t * 1.3) % 18, back = k > 9; walker.z = back ? 4.5 - (k - 9) : -4.5 + k; walker.vz = back ? -1.3 : 1.3; });
  ok(c.moving === 0, `someone crossing: waited for, never ridden into (${c.moving} frames a moving bike touched them; ${c.hits} with them walking into a stopped one)`);
  // a car parked over Linger's kerb stop: couriers don't pull in on top of it
  const d = run([{ x: manner.x + manner.width / 2 + 0.6, z: -3.4, hl: 2.28, hw: 1.015, fx: 1, fz: 0, kind: 'car' }], 400, 11);
  ok(d.hits === 0, `couriers never park inside a car over their stop (${d.hits})`);
}

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
