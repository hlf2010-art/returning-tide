// E-bikes on the side streets (engine/ebikes.js): no overlaps, never off their lanes, never through a
// red or onto a busy zebra, bunching ahead of the stop line, couriers pulling in, the hour's density.
import { createEbikes, EBIKE_LANES, EBIKE } from '../src/engine/ebikes.js';
import { createSignalController, TRAFFIC_CONFIG } from '../src/engine/traffic.js';
import { L } from '../src/world/layout.js';

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

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
