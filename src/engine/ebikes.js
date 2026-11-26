// E-bikes and couriers on the side streets (docs/living-city-architecture.md §5.2, §6.4). Pure logic
// (no three.js), tested in node (tests/ebikes.test.mjs); drawn by world/ebikeView.js.
//
// Where: Henan Road's kerb lanes, Hankou Road and Jiujiang Road. Never on the Bund road (Zhongshan
// East 1st Road is closed to bicycles and e-bikes) nor on the pedestrian street: the lane list is
// data, and nothing leaves it.
// How: each lane has up to three side-by-side slots; a rider follows the one ahead in its slot (the
// Intelligent Driver Model, 0.6 m standstill gap, 0.8 s headway) and slips into a free slot to pass.
// At a red light they fill the slots up to the stop line, ahead of the cars, and go a second early.
// Couriers work: they pull in at a pickup (Linger's takeaway hatch on Hankou Road; the Nanjing Road shops by
// the Henan Road corners, the pedestrian street walked into on foot), get off, hurry to the door, wait
// (at the hatch on their phone, or inside), come back with the order in a bag, open the box, load it,
// shut it and ride off; or pull over just to answer a call or check the next order. Riding, they take
// calls with the phone wedged under the helmet; at a red they look at it, or call one-handed.
//   createEbikes({ lanes, count, rng, signal(id) -> { go, early, toGreen }, canVanish(x, z), blocked(x, z),
//                  doors: [{ x, z, dir }] (Nanjing Road's shop doors), open(hours) -> bool ('cafe' | 'shops') })
//     (go: may cross the stop line; early: the all-red before green, toGreen seconds of it left)
//     .update(dt)            .riders  [{ x, z, yaw, v, kind, fade, active, braking, len, width, ebike,
//                                        phone: null | 'look' | 'call' | 'wedge', phoneN (counts phone moments),
//                                        task: null | { kind: 'pickup' | 'phone', phase, t, stop },
//                                        foot: null | { x, z, yaw, speed, phase, hidden, bag, phoneUp, load } (off the bike),
//                                        lid: 0..1 (the box's lid open) }]
//     .setDensity(0..1)      the hour's share of them out
import { NJ, L, sideStreets, manner } from '../world/layout.js';

export const EBIKE = { s0: 0.6, T: 0.8, a: 1.6, b: 2.6, len: 1.75, width: 0.62, slotW: 0.75, fadeT: 0.6, waitMax: 25 };
// (the couriers in the game's three invented liveries, world/outfits.js RIDER_BRANDS: yellow, Wanji orange, Jingsong blue)
export const KINDS = ['commuter', 'commuter', 'courierY', 'commuter', 'courierB', 'commuter', 'courierW', 'shared'];
// how a courier's pickup goes (seconds; walking speeds m/s, scaled by the rider's hurry)
export const PICKUP = { off: 0.9, load: 3.4, on: 0.8, lidOpen: 0.5, lidShut: 2.7, hatch: [9, 24], inside: [10, 26], phoneStop: [7, 18], walk: 1.75, jog: 2.6, kerb: -0.55 };

const h = NJ.henan, jj = sideStreets.find((s) => s.id === 'jiujiang');
// a lane: a straight from (ax, az) to (bx, bz); stop: distance along it of the stop line (or null);
// signal: whose light; kerb: which side the kerb is (+1: the rider's right); share of the riders;
// stops: where couriers pull in (distance along); vanishA/B: whether its ends need hiding from view
export const EBIKE_LANES = [
  { id: 'henan-s', slots: 2, ax: h.xc - 7.6, az: NJ.zc - 410, bx: h.xc - 7.6, bz: NJ.zc + 410, stop: 410 - 3.6, box: 410 + 5.6, signal: 'henan', share: 0.27, stops: [410 - 14, 410 + 16], far: true },
  { id: 'henan-n', slots: 2, ax: h.xc + 7.6, az: NJ.zc + 410, bx: h.xc + 7.6, bz: NJ.zc - 410, stop: 410 - 3.6, box: 410 + 5.6, signal: 'henan', share: 0.27, stops: [410 - 14, 410 + 16], far: true },
  { id: 'hankou-e', ax: L.street.xEnd + 2, az: 3.0, bx: L.facadeX - 1.2, bz: 3.0, stop: null, signal: 'bund', share: 0.15, stops: [] },
  { id: 'hankou-w', ax: L.facadeX - 1.2, az: -3.0, bx: L.street.xEnd + 2, bz: -3.0, stop: null, signal: 'bund', share: 0.12, stops: [] },
  { id: 'jiujiang-e', ax: jj.xEnd + 2, az: jj.zc + 2.3, bx: L.facadeX - 1.2, bz: jj.zc + 2.3, stop: null, signal: 'bund', share: 0.1, stops: [] },
  { id: 'jiujiang-w', ax: L.facadeX - 1.2, az: jj.zc - 2.3, bx: jj.xEnd + 2, bz: jj.zc - 2.3, stop: null, signal: 'bund', share: 0.09, stops: [] },
].map((l) => { const dx = l.bx - l.ax, dz = l.bz - l.az, len = Math.hypot(dx, dz); return { ...l, len, fx: dx / len, fz: dz / len, yaw: Math.atan2(dx, dz) }; });

// Where couriers stop to collect. Each: the place along its lane where the bike pulls in (s), and the
// way on foot from the bike to the counter or the door (path: points, the last one where they wait;
// inside: whether they go in out of sight), and whose opening hours matter.
//   Hankou Road: Linger's takeaway hatch (world/shops.js, layout.js `manner`), on the north side: they wait at its right-hand
//   end, out of the customers' queue, which runs off to the left.
//   Henan Road: the bike at the kerb by the corner (e-bikes are not allowed on Nanjing Road), then on foot
//   round the corner into the pedestrian street to a shop door within 6-36 m, in through it.
const laneAt = (l, s, lat) => ({ x: l.ax + l.fx * s + l.fz * lat, z: l.az + l.fz * s - l.fx * lat });
export function courierStops(lanes = EBIKE_LANES, doors = null) {
  const out = new Map(lanes.map((l) => [l, []]));
  for (const l of lanes) {
    if (l.id === 'hankou-w') {
      const hatch = { x: manner.pickup.x + 1.3, z: manner.pickup.z - 0.02 }, bikeX = manner.x + manner.width / 2 + 0.6;
      const s = l.ax - bikeX, bike = laneAt(l, s, PICKUP.kerb);
      out.get(l).push({ id: 'manner', lane: l, s, kind: 'hatch', hours: 'cafe', yaw: Math.PI, bike,
        path: [{ x: bike.x - 0.35, z: -L.street.roadHalfW - 0.55 }, { x: hatch.x + 0.25, z: hatch.z + 0.45 }, hatch] });
    }
    if (l.id.startsWith('henan')) {
      const h = NJ.henan, west = l.id === 'henan-s', kerbX = west ? h.x0 : h.x1, pavX = kerbX + (west ? -1.15 : 1.15);
      for (const s of l.stops) {
        const bike = laneAt(l, s, PICKUP.kerb), north = bike.z < NJ.zc, frontZ = north ? NJ.z0 : NJ.z1, dir = north ? 1 : -1;
        // the doors on that side of the street, that side of Henan Road, a short walk from the corner
        const near = (doors || []).filter((d) => Math.abs(d.z - frontZ) < 1.6 && (d.dir == null || d.dir === dir) && (west ? kerbX - d.x : d.x - kerbX) > 6 && (west ? kerbX - d.x : d.x - kerbX) < 36);
        const picks = near.length ? near : [{ x: kerbX + (west ? -14 : 14), z: frontZ, dir }];
        for (const d of picks.slice(0, 4)) {
          const outZ = frontZ + dir * 1.25;
          out.get(l).push({ id: `henan:${Math.round(d.x)}:${north ? 'N' : 'S'}`, lane: l, s, kind: 'door', hours: 'shops', bike, inside: true,
            path: [{ x: pavX, z: bike.z }, { x: pavX, z: frontZ + dir * 2.2 }, { x: d.x, z: outZ }, { x: d.x, z: frontZ - dir * 0.45 }] });
        }
      }
    }
  }
  return out;
}

function idm(v, v0, gap, dv, p) {
  const sStar = p.s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
  const free = 1 - Math.pow(v / v0, 4);
  if (gap === Infinity) return p.a * free;
  return p.a * (free - Math.pow(sStar / Math.max(gap, 0.05), 2));
}

export function createEbikes({ lanes = EBIKE_LANES, count = 60, rng = Math.random, signal = () => ({ go: true, early: false }), canVanish = () => true, blocked = () => false, doors = null, open = () => true } = {}) {
  const stats = { spawned: 0, spawnedSide: 0, vanished: 0, redRuns: 0, zebraEntries: 0, overlaps: 0, pickups: 0, phoneStops: 0, calls: 0 };
  let density = 1;
  const pickups = courierStops(lanes, doors), busy = new Set();      // busy: the counters someone is already heading for
  // riders are dealt to lanes by share
  const riders = [];
  let k = 0;
  for (const lane of lanes) {
    const n = Math.max(1, Math.round(count * lane.share));
    for (let i = 0; i < n && riders.length < count; i++) {
      const kind = KINDS[k++ % KINDS.length], courier = kind.startsWith('courier');
      // hurry: how pressed this one is (couriers on the clock most of all): their speed on the road and on foot
      const hurry = courier ? 0.85 + rng() * 0.35 : 0.7 + rng() * 0.3;
      riders.push({
        id: riders.length, kind, courier, lane, slot: i % (lane.slots || 3), s: lane.len * (0.08 + 0.84 * (i + 0.5) / n), v: 0, v0: (courier ? 5.4 + hurry * 1.2 : 4.6) + rng() * 1.2,
        p: { ...EBIKE, a: EBIKE.a + rng() * 0.4 + (courier ? 0.25 : 0), T: courier ? EBIKE.T * 0.85 : EBIKE.T }, early: courier ? 0.9 + rng() * 0.8 : 0.5 + rng(), lat: 0, latT: 0, fade: 1, state: 'ride', wait: 0, park: 0, parkAt: null, stop: null,
        x: 0, z: 0, yaw: lane.yaw, active: true, braking: false, len: EBIKE.len, width: EBIKE.width, ebike: true, rank: (riders.length * 0.618034) % 1,
        hurry, phone: null, phoneT: 0, phoneN: 0, rolled: false, task: null, foot: null, lid: 0,
      });
    }
  }
  const byLane = new Map(lanes.map((l) => [l, []]));
  const place = (r) => {
    // lat: metres from the lane's kerb-side line toward the road's middle, which is on the rider's left,
    // (fz, -fx) in this frame (+x east, +z south, yaw measured from +z)
    const l = r.lane;
    r.x = l.ax + l.fx * r.s + l.fz * r.lat; r.z = l.az + l.fz * r.s - l.fx * r.lat; r.yaw = l.yaw;
  };
  const slotLat = (slot) => 0.2 + slot * EBIKE.slotW;
  const release = (r) => { if (r.stop) busy.delete(r.stop); r.stop = null; };
  // where a courier will stop next on this run: a pickup (a counter nobody's heading for, open now), or
  // a pull-in to take a call / check the order, or nowhere
  function planCourier(r) {
    release(r); r.parkAt = null;
    if (!r.courier) return;
    const free = pickups.get(r.lane).filter((st) => st.s > r.s + 12 && !busy.has(st) && open(st.hours));
    if (free.length && rng() < 0.65) { const st = free[Math.floor(rng() * free.length)]; r.stop = st; busy.add(st); r.parkAt = st.s; return; }
    if (rng() < 0.3) { const s = r.lane.len * (0.25 + rng() * 0.5); if (s > r.s + 15) r.parkAt = s; }
  }
  for (const r of riders) { r.lat = slotLat(r.slot); planCourier(r); place(r); }
  function respawn(r) {
    r.s = 0; r.v = r.v0 * 0.7; r.fade = 0; r.state = 'in'; r.wait = 0; r.slot = Math.floor(rng() * (r.lane.slots || 3)); r.lat = slotLat(r.slot);
    r.phone = null; r.task = null; r.foot = null; r.lid = 0; planCourier(r);
    stats.spawned++; if (!r.lane.far) stats.spawnedSide++;
  }
  const rr = (a) => a[0] + rng() * (a[1] - a[0]);
  function phoneOn(r, kind, secs) { r.phone = kind; r.phoneT = secs; r.phoneN++; if (kind !== 'look') stats.calls++; }

  // ---- off the bike: the pickup, step by step ----
  function startTask(r) {
    const st = r.stop;
    if (st) {
      r.task = { kind: 'pickup', phase: 'off', t: 0, stop: st, k: 0, wait: rr(st.inside ? PICKUP.inside : PICKUP.hatch) };
      // (off on the kerb side, by the back of the seat)
      const side = { x: r.x - r.lane.fz * 0.5 - r.lane.fx * 0.25, z: r.z + r.lane.fx * 0.5 - r.lane.fz * 0.25 };
      r.foot = { x: side.x, z: side.z, yaw: r.yaw + Math.PI / 2, speed: 0, phase: 'off', hidden: false, bag: false, phoneUp: false, load: 0 };
      stats.pickups++;
    } else {
      // just pulled in: the next order, or a call (the customer, the shop, home)
      r.task = { kind: 'phone', phase: 'sit', t: 0, stop: null, wait: rr(PICKUP.phoneStop) };
      phoneOn(r, rng() < 0.45 ? 'call' : 'look', r.task.wait); stats.phoneStops++;
    }
  }
  // walk the foot along a list of points; true when there
  function walk(f, pts, k, speed, dt) {
    let left = speed * dt;
    while (left > 0 && k.i < pts.length) {
      const p = pts[k.i], dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz);
      if (d > 1e-3) f.yaw = Math.atan2(dx, dz);
      if (d <= left) { f.x = p.x; f.z = p.z; left -= d; k.i++; } else { f.x += dx / d * left; f.z += dz / d * left; left = 0; }
    }
    return k.i >= pts.length;
  }
  function stepTask(r, dt) {
    const T = r.task; T.t += dt;
    if (T.kind === 'phone') { if (T.t >= T.wait) { T.phase = 'done'; } return; }
    // (back to the bike: to the kerb side of its box, a step behind, to face it and load it)
    const f = r.foot, st = T.stop, l = r.lane, behind = { x: r.x - l.fx * 1.0 - l.fz * 0.12, z: r.z - l.fz * 1.0 + l.fx * 0.12 };
    if (!r.backPath) r.backPath = [...st.path.slice(0, -1).reverse(), behind];
    const pace = (r.hurry > 1.0 ? PICKUP.jog : PICKUP.walk) * (0.85 + r.hurry * 0.2);
    f.speed = 0;
    if (T.phase === 'off') {
      if (T.t >= PICKUP.off) { T.phase = 'walk'; T.t = 0; T.k = { i: 0 }; r.foot0x = f.x; r.foot0z = f.z; r.backPath = null; f.phoneUp = rng() < 0.5; }
    } else if (T.phase === 'walk') {
      f.speed = pace; f.phase = 'walk';
      if (walk(f, st.path, T.k, pace, dt)) { T.phase = 'wait'; T.t = 0; f.speed = 0; f.yaw = st.inside ? f.yaw : st.yaw; f.hidden = !!st.inside; f.phoneUp = !st.inside; }
    } else if (T.phase === 'wait') {
      f.phase = 'wait';
      if (T.t >= T.wait) { T.phase = 'back'; T.t = 0; T.k = { i: 0 }; f.hidden = false; f.bag = true; f.phoneUp = false; }
    } else if (T.phase === 'back') {
      f.speed = pace * 1.05; f.phase = 'back';
      if (walk(f, r.backPath, T.k, f.speed, dt)) { T.phase = 'load'; T.t = 0; f.speed = 0; f.yaw = r.yaw; }   // behind the bike, facing the box
    } else if (T.phase === 'load') {
      f.phase = 'load';
      // the lid up, the bag in (the hand into the box), the lid down
      const t = T.t, P = PICKUP;
      r.lid = t < P.lidOpen ? t / P.lidOpen : t < P.lidShut ? 1 : Math.max(0, 1 - (t - P.lidShut) / 0.45);
      f.load = t > P.lidOpen * 0.6 && t < P.lidShut ? 1 : 0;
      if (t > (P.lidOpen + P.lidShut) / 2) f.bag = false;
      if (t >= P.load) { T.phase = 'on'; T.t = 0; r.lid = 0; f.load = 0; T.k = { i: 0 }; }
    } else if (T.phase === 'on') {
      // round to the seat and on
      f.phase = 'on'; f.speed = 1.4;
      const there = walk(f, [{ x: r.foot0x, z: r.foot0z }], T.k, 1.4, dt);
      if (there) { f.speed = 0; f.yaw = r.yaw; }
      if (T.t >= PICKUP.on && there) { T.phase = 'done'; r.foot = null; }
    }
    if (r.foot) r.foot.phase = T.phase;
  }

  return {
    riders, stats, lanes, pickups,
    setDensity(d) { density = Math.max(0, Math.min(1, d)); },
    update(dt) {
      if (dt <= 0) return;
      dt = Math.min(dt, 0.1);
      for (const arr of byLane.values()) arr.length = 0;
      for (const r of riders) if (r.active && r.state !== 'gone') byLane.get(r.lane).push(r);
      for (const [lane, arr] of byLane) {
        arr.sort((a, b) => b.s - a.s);
        const sig = signal(lane.signal) || { go: true, early: false };
        for (let i = 0; i < arr.length; i++) {
          const r = arr[i];
          if (r.state === 'out') { r.fade -= dt / EBIKE.fadeT; r.s += r.v * dt; if (r.fade <= 0) { r.state = 'gone'; r.fade = 0; stats.vanished++; release(r); r.phone = null; } place(r); continue; }
          if (r.state === 'in') { r.fade = Math.min(1, r.fade + dt / EBIKE.fadeT); if (r.fade >= 1) r.state = 'ride'; }
          // the phone: put away (or left wedged on a call) once moving; a call while riding now and then
          if (r.phone) { r.phoneT -= dt; if (r.phoneT <= 0) r.phone = null; }
          if (r.state === 'park') {
            r.v = 0; r.braking = false; r.lat += (PICKUP.kerb - r.lat) * Math.min(1, dt * 2);
            if (!r.task) startTask(r);
            if (r.task.phase !== 'done') stepTask(r, dt);
            // (back out into the lane only when it's done and clear beside and behind)
            if (r.task.phase === 'done' && arr.every((o) => o === r || o.state === 'gone' || o.state === 'park' || o.lat > slotLat(0) + EBIKE.slotW * 0.8 || o.s > r.s + EBIKE.len + 1 || o.s < r.s - EBIKE.len - 6)) {
              r.state = 'ride'; r.parkAt = null; r.slot = 0; r.task = null; r.foot = null; r.lid = 0; release(r);
              if (r.phone === 'look') r.phone = null; else if (r.phone === 'call') r.phone = 'wedge';
            }
            place(r); continue;
          }
          // the one ahead in my slot (and anyone parked in it, or anyone half into it)
          let gap = Infinity, dv = 0;
          for (let j = i - 1; j >= 0; j--) {
            const o = arr[j]; if (o.state === 'gone') continue;
            if (Math.abs(o.lat - r.lat) > EBIKE.slotW * 0.8) continue;
            gap = o.s - r.s - EBIKE.len; dv = r.v - o.v; break;
          }
          const slotFree = (ns) => { const want = slotLat(ns); return arr.every((o) => o === r || o.state === 'gone' || Math.abs(o.lat - want) > EBIKE.slotW * 0.8 || o.s < r.s - EBIKE.len - 1.2 || o.s > r.s + EBIKE.len + Math.max(4, r.v * 1.2)); };
          // heading for the kerb to pull in: over into the kerb slot when it's free
          if (r.parkAt != null && r.parkAt - r.s < 30 && r.slot > 0 && r.latT <= 0 && slotFree(r.slot - 1)) { r.slot--; r.latT = 1.2; }
          // slip into a free slot to pass someone slow
          else if (gap < 6 && r.v0 - r.v > 0.8 && r.latT <= 0) {
            for (const ns of [r.slot - 1, r.slot + 1]) {
              if (ns < 0 || ns >= (lane.slots || 3)) continue;
              if (slotFree(ns)) { r.slot = ns; r.latT = 1.5; break; }
            }
          }
          r.latT -= dt;
          // the stop line: red (or yellow and able to stop) holds them; they go a second early
          let stopGap = Infinity;
          r.go = true;
          if (lane.stop != null && r.s < lane.stop + 0.5) {
            const d = lane.stop - r.s - EBIKE.len / 2;
            // (on yellow: through if too close to stop comfortably, as the cars decide)
            const go = r.go = sig.go || (sig.early && sig.toGreen <= r.early) || (sig.yellow && d < r.v * r.v / 6 + 0.3);
            if (!go) stopGap = d;
            // never into the zebra while anyone is on it
            if (go && d < 3 && blocked(lane.ax + lane.fx * (lane.stop + 3), lane.az + lane.fz * (lane.stop + 3))) stopGap = d;
          }
          // a courier's stop at the kerb (given up if they've overshot it, boxed in the outer slots)
          if (r.parkAt != null && r.s > r.parkAt + 1) planCourierLater(r);
          if (r.parkAt != null && r.s < r.parkAt) { const d = r.parkAt - r.s; if (d < 10 && r.slot === 0) { stopGap = Math.min(stopGap, d); if (d < EBIKE.s0 + 0.6 && r.v < 0.8) { r.state = 'park'; r.task = null; place(r); continue; } } }
          // the end of the lane: Henan's are out of sight; the side streets' ends wait until no one's looking
          const endGap = r.s > lane.len - 8 ? lane.len - r.s : Infinity;
          let acc = idm(r.v, r.v0, Math.min(gap, stopGap), stopGap < gap ? r.v : dv, r.p);
          if (endGap < Infinity && !lane.far) {
            const ex = lane.bx, ez = lane.bz;
            if (canVanish(ex, ez) || r.wait > EBIKE.waitMax) { r.state = 'out'; }
            else acc = Math.min(acc, idm(r.v, r.v0, Math.max(0, endGap - 0.5), r.v, r.p));
          } else if (endGap < 1) r.state = 'out';
          r.v = Math.max(0, r.v + Math.max(-7.5, acc) * dt);
          if (r.v < 0.2) r.wait += dt; else r.wait = 0;
          // stopped a moment (a red, a queue): out comes the phone, or not; moving off, it goes away
          if (r.wait > 1.2 && !r.rolled) {
            r.rolled = true;
            const x = rng();
            if (r.courier ? x < 0.55 : x < 0.3) { if (r.phone !== 'wedge') phoneOn(r, 'look', 6 + rng() * 30); }
            else if (r.courier && x < 0.7 && !r.phone) phoneOn(r, 'call', 8 + rng() * 20);
          }
          if (r.v > 1.5) { r.rolled = false; if (r.phone === 'look') r.phone = null; else if (r.phone === 'call') r.phone = 'wedge'; }
          if (r.courier && !r.phone && r.v > 2 && rng() < dt / 75) phoneOn(r, 'wedge', 10 + rng() * 22);
          r.braking = acc < -1;
          const before = r.s;
          r.s += r.v * dt;
          if (lane.stop != null && before <= lane.stop && r.s > lane.stop && !r.go) stats.redRuns++;
          r.lat += (slotLat(r.slot) - r.lat) * Math.min(1, dt * 1.6);
          place(r);
        }
        // whoever's gone comes back at the start (if there's room, and nobody watching the side streets' ends)
        for (const r of arr) {
          if (r.state !== 'gone') continue;
          if (r.rank > density) continue;
          const room = arr.every((o) => o === r || o.state === 'gone' || o.s > EBIKE.len + 2.5);
          if (room && (lane.far || canVanish(lane.ax, lane.az))) { respawn(r); place(r); }
        }
      }
      // the hour: the riders ranked past the density finish their trip and don't come back
      for (const r of riders) r.active = r.state !== 'gone';
    },
  };
  // overshot the stop: no second try this run
  function planCourierLater(r) { release(r); r.parkAt = null; }
}
