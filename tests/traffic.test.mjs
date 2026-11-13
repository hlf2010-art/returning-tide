// The signal-controlled crossing: phases, clearance, yellow, queues, departure, slow
// pedestrians, blocked exits, the player crossing / jaywalking / loitering, pause, recovery.
import { createTraffic, createSignalController, TRAFFIC_CONFIG } from '../src/engine/traffic.js';
import { crossing, underCover } from '../src/world/layout.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const DT = 1 / 30;
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const make = (opts = {}) => createTraffic({ geom: crossing, vehicles: crossing.vehicles, peds: crossing.peds, rng: seeded(opts.seed || 11), ...opts });
const run = (T, seconds, player = null, each = null) => { for (let i = 0; i < seconds / DT; i++) { T.update(DT, { player: typeof player === 'function' ? player() : player }); if (each) each(T); } };
const clean = (T) => T.stats.redEntries === 0 && T.stats.blockedEntries === 0 && T.stats.overlaps === 0 && T.stats.pedConflicts === 0;

// 1. controller alone: order, durations, never two green aspects at once, configurable clearance
{
  const cfg = { ...TRAFFIC_CONFIG, allRedVeh: 4, allRedPed: 3 };
  const c = createSignalController(cfg);
  const seen = []; const at = {}; let t = 0, both = 0;
  c.on((p) => { seen.push(p); at[p] = at[p] || []; at[p].push(t); });
  for (let i = 0; i < 400 / DT; i++) {
    c.update(DT, { boxOccupied: false, crosswalkOccupied: false }); t += DT;
    if (c.vehAspect !== 'red' && c.pedAspect !== 'dont-walk') both++;
  }
  ok(seen.slice(0, 7).join(' ') === 'VGF VY AR1 PW PF AR2 VG', `phase order VG→VGF→VY→AR1→PW→PF→AR2→VG (${seen.slice(0, 7).join(' ')})`);
  ok(both === 0, 'vehicle and pedestrian aspects are never both permissive');
  const ar1 = at.PW[0] - at.AR1[0], ar2 = at.VG[0] - at.AR2[0];
  ok(Math.abs(ar1 - 4) < 0.05 && Math.abs(ar2 - 3) < 0.05, `clearance intervals follow config (all-red ${ar1.toFixed(2)} s / ${ar2.toFixed(2)} s)`);
  const c2 = createSignalController(TRAFFIC_CONFIG); let hold = 0;
  for (let i = 0; i < 120 / DT; i++) { c2.update(DT, { boxOccupied: c2.phase === 'AR1', crosswalkOccupied: false }); if (c2.phase === 'AR1') hold += DT; }
  ok(hold >= TRAFFIC_CONFIG.vehClearMax - 0.1, `all-red holds while a vehicle is still in the junction (${hold.toFixed(1)} s, capped at ${TRAFFIC_CONFIG.vehClearMax})`);
}

// 2. one hour of normal running: safety invariants, every vehicle keeps moving, cycles complete
{
  const T = make();
  let maxDecel = 0, maxJump = 0, lastV = new Map(), lastS = new Map(), maxQueue = 0, wheelsTurn = true, brakeWhenStopped = true;
  run(T, 3600, null, (T) => {
    for (const v of T.vehicles) {
      if (!v.active) { lastS.delete(v.id); continue; }
      if (lastV.has(v.id) && lastS.has(v.id)) {
        maxDecel = Math.max(maxDecel, (lastV.get(v.id) - v.v) / DT);
        maxJump = Math.max(maxJump, Math.abs(v.s - lastS.get(v.id)) - v.v * DT);
      }
      if (v.v < 0.1 && !v.braking && v.acc <= 0.05) brakeWhenStopped = false;
      lastV.set(v.id, v.v); lastS.set(v.id, v.s);
    }
    for (const l of Object.values(T.lanes)) maxQueue = Math.max(maxQueue, l.vehicles.filter((v) => v.active && v.v < 0.3 && v.s <= crossing.stopS + 0.01 && v.s > -80).length);
  });
  ok(T.controller.cycle >= 50, `${T.controller.cycle} complete signal cycles in an hour`);
  ok(T.stats.redEntries === 0, 'no vehicle crosses its stop line on red or on a yellow it chose to stop for');
  ok(T.stats.blockedEntries === 0, 'no vehicle enters the junction without room beyond it');
  ok(T.stats.overlaps === 0 && T.stats.minGap > 1.5, `no overlaps; closest bumper gap ${T.stats.minGap.toFixed(2)} m`);
  ok(T.stats.pedConflicts === 0, 'no pedestrian ever inside a vehicle footprint');
  ok(maxDecel <= TRAFFIC_CONFIG.maxDecel + 1.5 + 1e-6, `braking is bounded (max ${maxDecel.toFixed(2)} m/s²); no snapping`);
  ok(maxJump < 1e-6, 'positions only change by speed × time (no teleports on the road)');
  ok(T.stats.yellowGo > 0 && T.stats.yellowStop > 0, `yellow: some vehicles commit (${T.stats.yellowGo}), others stop (${T.stats.yellowStop})`);
  ok(maxQueue >= 2, `queues form at red (longest ${maxQueue} in one lane)`);
  ok(T.stats.recycled >= 7 * 10, `every vehicle keeps circulating (${T.stats.recycled} far-end recycles)`);
  ok(brakeWhenStopped, 'brake lights are on whenever a vehicle is held stationary');
  ok(wheelsTurn && T.vehicles.every((v) => v.wheelDist > 1000), 'wheel rotation accumulates with distance');
}

// 3. queueing at red: stop behind the line, safe spacing; progressive departure on green
{
  const T = make({ seed: 3 });
  // run until a queue of >= 2 forms in some lane at red
  let lane = null;
  for (let i = 0; i < 600 / DT && !lane; i++) {
    T.update(DT);
    if (T.controller.vehAspect === 'red') for (const l of Object.values(T.lanes)) {
      const q = l.vehicles.filter((v) => v.active && v.v < 0.05 && v.s < crossing.stopS + 0.01 && v.s > -60);
      if (q.length >= 2) lane = l;
    }
  }
  ok(!!lane, 'a two-vehicle queue forms at red');
  const q = lane.vehicles.filter((v) => v.active && v.v < 0.05 && v.s > -60).sort((a, b) => b.s - a.s);
  ok(q[0].s <= crossing.stopS - 0.3 && q[0].s > crossing.stopS - 3, `queue head waits just behind the stop line (front at ${q[0].s.toFixed(2)}, line ${crossing.stopS})`);
  const gap = q[0].s - q[0].len - q[1].s;
  ok(gap > 1.6 && gap < 4.5, `queued spacing ${gap.toFixed(2)} m`);
  const starts = new Map();
  let t = 0;
  while (T.controller.vehAspect !== 'green' && t < 120) { T.update(DT); t += DT; }
  const t0 = t;
  for (let i = 0; i < 20 / DT; i++) { T.update(DT); t += DT; for (const v of q) if (!starts.has(v.id) && v.v > 0.2) starts.set(v.id, t - t0); }
  const s0 = starts.get(q[0].id), s1 = starts.get(q[1].id);
  ok(s0 > 0.4 && s1 > s0 + 0.4, `progressive departure: head moves off at +${s0?.toFixed(2)} s, next at +${s1?.toFixed(2)} s`);
  ok(clean(T), 'invariants hold through the queue and departure');
}

// 4. slow pedestrian: the elderly walker (0.62 m/s) always finishes before traffic resumes
{
  const T = make({ seed: 5 });
  let violated = 0, extended = 0, crossings = 0, wasCrossing = false;
  const slow = T.peds.find((p) => p.speed < 0.8);
  run(T, 1800, null, (T) => {
    const onRoad = slow.x > crossing.road.x0 && slow.x < crossing.road.x1;
    if (onRoad && T.controller.vehAspect !== 'red') violated++;
    if (T.controller.phase === 'AR2' && T.controller.extending) extended++;
    if (slow.crossing && !wasCrossing) crossings++;
    wasCrossing = slow.crossing;
  });
  ok(crossings >= 4, `slow pedestrian crossed ${crossings} times in 30 min`);
  ok(violated === 0, 'vehicles never get green while the slow pedestrian is on the carriageway');
  ok(extended > 0, `the pedestrian clearance was extended for them (${(extended * DT).toFixed(0)} s total)`);
  ok(clean(T), 'invariants hold');
  // nobody starts on a flashing or red man
  const T2 = make({ seed: 9 }); let badStart = 0;
  const prev = new Map(T2.peds.map((p) => [p.id, p.state]));
  run(T2, 900, null, (T) => { for (const p of T.peds) { if (prev.get(p.id) === 'waiting' && p.state === 'walk' && T.controller.pedAspect !== 'walk') badStart++; prev.set(p.id, p.state); } });
  ok(badStart === 0, 'pedestrians only step off the kerb on a steady green figure');
}

// 5. blocked exit: someone standing in lane sb1 beyond the junction
{
  const T = make({ seed: 21 });
  const sb1 = T.lanes.sb1;
  const blocker = { x: sb1.x, z: 12, vx: 0, vz: 0 };                         // 6.4 m past the far edge of the box
  let entered = 0, othersEntered = 0, heldAtLine = 0;
  const before = new Map();
  run(T, 240, blocker, (T) => {
    for (const v of T.vehicles) {
      const was = before.get(v.id); before.set(v.id, v.s);
      if (!v.active || was === undefined) continue;
      if (was <= crossing.stopS && v.s > crossing.stopS) { if (v.lane === sb1) entered++; else othersEntered++; }
      if (v.lane === sb1 && v.active && v.v < 0.05 && Math.abs(v.s - (crossing.stopS - 0.6)) < 0.5 && T.controller.vehAspect === 'green') heldAtLine++;
    }
  });
  ok(entered === 0, 'with the exit blocked, sb1 traffic never enters the junction (even on green)');
  ok(heldAtLine > 0, 'it waits at the stop line on green instead');
  ok(othersEntered > 0, `other lanes keep flowing (${othersEntered} entries)`);
  ok(T.stats.pedConflicts === 0 && T.stats.overlaps === 0, 'no contact with the blocker');
  // recovery: blocker leaves, sb1 flows again within two cycles, nothing teleported
  const sbIds = sb1.vehicles.map((v) => v.id), dist0 = new Map(sb1.vehicles.map((v) => [v.id, v.wheelDist]));
  run(T, 140, null);
  ok(sbIds.every((id) => { const v = T.vehicles.find((q) => q.id === id); return v.wheelDist - dist0.get(id) > 30; }), 'deadlock recovery: every sb1 vehicle moves on once the exit clears');
}

// 6. the player: crossing on the green figure, jaywalking on vehicle green, loitering
{
  const T = make({ seed: 4 });
  // wait for walk, then cross east→west at 1.4 m/s
  while (T.controller.pedAspect !== 'walk') T.update(DT);
  const p = { x: -3.3, z: 0.5, vx: -1.4, vz: 0 };
  let resumedWhileOnRoad = 0;
  for (let i = 0; i < 40 / DT; i++) {
    if (p.x > -29) p.x += p.vx * DT; else p.vx = 0;
    T.update(DT, { player: p });
    if (p.x > crossing.road.x0 && p.x < crossing.road.x1 && T.controller.vehAspect !== 'red') resumedWhileOnRoad++;
  }
  ok(resumedWhileOnRoad === 0, 'player crossing on the green figure: traffic waits until they reach the far kerb');
  ok(clean(T), 'invariants hold for the player crossing');

  // jaywalk: step into nb1 in front of approaching traffic while vehicles have green
  const T2 = make({ seed: 8 });
  while (!(T2.controller.vehAspect === 'green' && T2.controller.time > 3)) T2.update(DT);
  const nb1 = T2.lanes.nb1;
  // walk in from the east kerb at z = 20 once no nb1 vehicle is within 30 m of that spot
  const j = { x: -3.6, z: 20, vx: 0, vz: 0 };
  const clear = () => nb1.vehicles.every((v) => !v.active || Math.abs(v.s - -20) > 30);
  while (!clear()) T2.update(DT);
  let minAhead = Infinity, stopped = false;
  run(T2, 60, () => { if (j.x > nb1.x) { j.vx = -1.4; j.x += j.vx * DT; } else j.vx = 0; return j; }, (T) => {
    for (const v of nb1.vehicles) if (v.active && j.x <= nb1.x + 0.1) { const d = j.z * v.lane.dir - v.s; if (d > -0.5) { minAhead = Math.min(minAhead, d); if (v.v < 0.05 && d < 6) stopped = true; } }
  });
  ok(T2.stats.pedConflicts === 0, 'jaywalking player is never hit');
  ok(stopped && minAhead > 1.0 && minAhead < 4, `a vehicle stops ${minAhead.toFixed(2)} m short of the player standing in its lane`);
  ok(nb1.vehicles.some((v) => v.active && v.braking && v.v < 0.05), 'the stopped vehicle shows brake lights');

  // loiter on the crosswalk in lane sb2: the clearance holds, then times out; sb2 stays held, others flow
  const T3 = make({ seed: 12 });
  const l = { x: T3.lanes.sb2.x, z: 0, vx: 0, vz: 0 };
  let sb2In = 0, othersIn = 0; const prev = new Map();
  run(T3, 300, l, (T) => {
    for (const v of T.vehicles) { const w = prev.get(v.id); prev.set(v.id, v.s); if (w !== undefined && w <= crossing.stopS && v.s > crossing.stopS) (v.lane.id === 'sb2' ? sb2In++ : othersIn++); }
  });
  ok(T3.controller.cycle >= 3, `the controller does not deadlock on a loitering player (${T3.controller.cycle} cycles in 5 min)`);
  ok(sb2In === 0 && othersIn > 0, `the lane they stand in stays held (${sb2In} entries); far lanes flow (${othersIn})`);
  ok(T3.stats.pedConflicts === 0, 'loitering player never touched');
}

// 7. pause: dt = 0 changes nothing at all
{
  const T = make({ seed: 2 });
  run(T, 37);
  const snap = JSON.stringify([T.controller.phase, T.controller.time, T.vehicles.map((v) => [v.s, v.v]), T.peds.map((p) => [p.x, p.z, p.state])]);
  for (let i = 0; i < 300; i++) T.update(0, { player: { x: -10, z: 0, vx: 0, vz: 0 } });
  const snap2 = JSON.stringify([T.controller.phase, T.controller.time, T.vehicles.map((v) => [v.s, v.v]), T.peds.map((p) => [p.x, p.z, p.state])]);
  ok(snap === snap2, 'paused (dt = 0): signals, vehicles and pedestrians all hold exactly');
  run(T, 30);
  ok(clean(T), 'and resume cleanly');
}

// 8. long frames: one 0.5 s step behaves like many small ones (sub-stepping)
{
  const T = make({ seed: 31 });
  for (let i = 0; i < 600; i++) T.update(0.5);
  ok(clean(T), 'safety invariants hold with 2 fps frames (internal sub-steps)');
}

// 9. drizzle: umbrella / shelter / cab, safely, and back to normal afterwards
{
  const T = make({ seed: 17 });
  const byRain = (r) => T.peds.filter((p) => p.rain === r);
  let offZebra = 0, divertedMidCrossing = 0, umbrellaMoved = 0;
  const wasCrossing = new Map(), lastPos = new Map();
  const watch = (T) => {
    for (const p of T.peds) {
      if (p.x > crossing.road.x0 + 0.05 && p.x < crossing.road.x1 - 0.05 && !(p.z > crossing.crosswalk.z0 - 1.2 && p.z < crossing.crosswalk.z1 + 1.2)) offZebra++;
      if (wasCrossing.get(p.id) && p.path.length && p.x > crossing.road.x0 && p.x < crossing.road.x1) divertedMidCrossing++;
      wasCrossing.set(p.id, p.crossing);
      if (p.rain === 'umbrella' && p.umbrella === 1) { const l = lastPos.get(p.id); if (l) umbrellaMoved += Math.hypot(p.x - l[0], p.z - l[1]); }
      lastPos.set(p.id, [p.x, p.z]);
    }
  };
  for (let i = 0; i < 60 / DT; i++) { T.update(DT); watch(T); }
  for (let i = 0; i < 150 / DT; i++) { T.update(DT, { rain: 1 }); watch(T); }
  const sh = byRain('shelter')[0], cab = byRain('cab')[0];
  ok(sh.react === 'sheltered' && underCover(sh.x, sh.z, 1.6), `shelter: jogged to the Customs portico and stands under its roof (${sh.x.toFixed(1)}, ${sh.z.toFixed(1)})`);
  ok(cab.react === 'phoning' && cab.phone === 1 && (cab.x < crossing.road.x0 - 0.15 || cab.x > crossing.road.x1 + 0.15), `cab: waiting at the kerb with the phone out, on the pavement (x=${cab.x.toFixed(2)}, ${cab.react}, phone ${cab.phone})`);
  ok(byRain('umbrella').every((p) => p.umbrella === 1) && umbrellaMoved > 60, `umbrella: both opened them and kept walking (${umbrellaMoved.toFixed(0)} m under umbrellas)`);
  ok(offZebra === 0, 'nobody stepped onto Zhongshan Road outside the crossing');
  ok(divertedMidCrossing === 0, 'nobody abandoned a crossing half-way to get out of the rain');
  for (let i = 0; i < 240 / DT; i++) { T.update(DT, { rain: 0 }); watch(T); }
  ok(T.peds.every((p) => p.react === 'none' && p.umbrella === 0 && p.phone === 0 && !p.path.length), 'clear again: umbrellas closed, phone away, everyone back on their usual walk');
  const crossed = new Set(); for (let i = 0; i < 300 / DT; i++) { T.update(DT); for (const p of T.peds) if (p.crossing) crossed.add(p.id); }
  ok(crossed.size === T.peds.length, 'and every one of them crosses the road again');
  ok(clean(T) && offZebra === 0, 'traffic safety invariants held throughout the shower');
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
