// E-bikes and couriers on the side streets (docs/living-city-architecture.md §5.2, §6.4). Pure logic
// (no three.js), tested in node (tests/ebikes.test.mjs); drawn by world/ebikeView.js.
//
// Where: Henan Road's kerb lanes, Hankou Road and Jiujiang Road. Never on the Bund road (Zhongshan
// East 1st Road is closed to bicycles and e-bikes) nor on the pedestrian street: the lane list is
// data, and nothing leaves it.
// How: each lane has up to three side-by-side slots; a rider follows the one ahead in its slot (the
// Intelligent Driver Model, 0.6 m standstill gap, 0.8 s headway) and slips into a free slot to pass.
// At a red light they fill the slots up to the stop line, ahead of the cars, and go a second early;
// couriers pull in to the kerb for 20-90 s now and then, phone in hand.
//   createEbikes({ lanes, count, rng, signal(id) -> { go, early, toGreen }, canVanish(x, z), blocked(x, z) })
//     (go: may cross the stop line; early: the all-red before green, toGreen seconds of it left)
//     .update(dt)            .riders  [{ x, z, yaw, v, kind, fade, active, braking, len, width, ebike }]
//     .setDensity(0..1)      the hour's share of them out
import { NJ, L, sideStreets } from '../world/layout.js';

export const EBIKE = { s0: 0.6, T: 0.8, a: 1.6, b: 2.6, len: 1.75, width: 0.62, slotW: 0.75, fadeT: 0.6, waitMax: 25 };
export const KINDS = ['commuter', 'commuter', 'courierY', 'commuter', 'courierB', 'commuter', 'courierY', 'shared'];

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

function idm(v, v0, gap, dv, p) {
  const sStar = p.s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
  const free = 1 - Math.pow(v / v0, 4);
  if (gap === Infinity) return p.a * free;
  return p.a * (free - Math.pow(sStar / Math.max(gap, 0.05), 2));
}

export function createEbikes({ lanes = EBIKE_LANES, count = 60, rng = Math.random, signal = () => ({ go: true, early: false }), canVanish = () => true, blocked = () => false } = {}) {
  const stats = { spawned: 0, spawnedSide: 0, vanished: 0, redRuns: 0, zebraEntries: 0, overlaps: 0 };
  let density = 1;
  // riders are dealt to lanes by share
  const riders = [];
  let k = 0;
  for (const lane of lanes) {
    const n = Math.max(1, Math.round(count * lane.share));
    for (let i = 0; i < n && riders.length < count; i++) {
      const kind = KINDS[k++ % KINDS.length], courier = kind.startsWith('courier');
      riders.push({
        id: riders.length, kind, lane, slot: i % (lane.slots || 3), s: lane.len * (0.08 + 0.84 * (i + 0.5) / n), v: 0, v0: (courier ? 6.0 : 4.6) + rng() * 1.4,
        p: { ...EBIKE, a: EBIKE.a + rng() * 0.4 }, early: 0.5 + rng(), lat: 0, latT: 0, fade: 1, state: 'ride', wait: 0, park: 0, parkAt: null,
        x: 0, z: 0, yaw: lane.yaw, active: true, braking: false, len: EBIKE.len, width: EBIKE.width, ebike: true, rank: (riders.length * 0.618034) % 1,
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
  function planCourier(r) { r.parkAt = r.kind.startsWith('courier') && r.lane.stops.length && rng() < 0.5 ? r.lane.stops[Math.floor(rng() * r.lane.stops.length)] + (rng() - 0.5) * 6 : null; }
  for (const r of riders) { r.lat = slotLat(r.slot); planCourier(r); place(r); }
  function respawn(r) {
    r.s = 0; r.v = r.v0 * 0.7; r.fade = 0; r.state = 'in'; r.wait = 0; r.slot = Math.floor(rng() * (r.lane.slots || 3)); r.lat = slotLat(r.slot); planCourier(r);
    stats.spawned++; if (!r.lane.far) stats.spawnedSide++;
  }

  return {
    riders, stats, lanes,
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
          if (r.state === 'out') { r.fade -= dt / EBIKE.fadeT; r.s += r.v * dt; if (r.fade <= 0) { r.state = 'gone'; r.fade = 0; stats.vanished++; } place(r); continue; }
          if (r.state === 'in') { r.fade = Math.min(1, r.fade + dt / EBIKE.fadeT); if (r.fade >= 1) r.state = 'ride'; }
          if (r.state === 'park') {
            r.park -= dt; r.v = 0; r.braking = false; r.lat += (-0.55 - r.lat) * Math.min(1, dt * 2);
            // (back out into the lane only when it's clear beside and behind)
            if (r.park <= 0 && arr.every((o) => o === r || o.state === 'gone' || o.state === 'park' || o.lat > slotLat(0) + EBIKE.slotW * 0.8 || o.s > r.s + EBIKE.len + 1 || o.s < r.s - EBIKE.len - 6)) { r.state = 'ride'; r.parkAt = null; r.slot = 0; }
            place(r); continue;
          }
          // the one ahead in my slot (and anyone parked in it, or anyone half into it)
          let gap = Infinity, dv = 0;
          for (let j = i - 1; j >= 0; j--) {
            const o = arr[j]; if (o.state === 'gone') continue;
            if (Math.abs(o.lat - r.lat) > EBIKE.slotW * 0.8) continue;
            gap = o.s - r.s - EBIKE.len; dv = r.v - o.v; break;
          }
          // slip into a free slot to pass someone slow
          if (gap < 6 && r.v0 - r.v > 0.8 && r.latT <= 0) {
            for (const ns of [r.slot - 1, r.slot + 1]) {
              if (ns < 0 || ns >= (lane.slots || 3)) continue;
              const want = slotLat(ns);
              const free = arr.every((o) => o === r || o.state === 'gone' || Math.abs(o.lat - want) > EBIKE.slotW * 0.8 || o.s < r.s - EBIKE.len - 1.2 || o.s > r.s + EBIKE.len + Math.max(4, r.v * 1.2));
              if (free) { r.slot = ns; r.latT = 1.5; break; }
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
          // a courier's stop at the kerb
          if (r.parkAt != null && r.s < r.parkAt) { const d = r.parkAt - r.s; if (d < 10) { stopGap = Math.min(stopGap, d); if (d < EBIKE.s0 + 0.6 && r.v < 0.8) { r.state = 'park'; r.park = 20 + rng() * 70; place(r); continue; } } }
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
}
