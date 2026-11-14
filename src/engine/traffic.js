// The Hankou Road / Zhongshan East 1st Road crossing: signals, through traffic, pedestrians.
// Pure logic (no three.js / DOM), unit-tested in node like conversation.js and wrongHandoff.js.
//
// ONE authority: the controller owns the vehicle aspect, the pedestrian aspect and every
// movement permission (may a vehicle pass its stop line? may a pedestrian step off the kerb?).
// Vehicles and pedestrians only ask. Phases never overlap:
//
//   VG green ─> VGF green flashing (绿闪) ─> VY yellow ─> AR1 all-red, until the junction box
//   is empty ─> PW walk ─> PF walk flashing ─> AR2 all-red, until the crosswalk is empty ─> VG
//
// Along a lane, positions use s = z * dir, so both directions share stop line / box numbers.

import { noticeSights, gawkSpeed } from './sights.js';
import { avoid, SOCIAL, DISTRACTED } from './social.js';
import { startErrand, errandTarget, stepErrand } from './errands.js';
export const TRAFFIC_CONFIG = {
  vehGreen: 16, vehGreenFlash: 3, yellow: 3,
  allRedVeh: 2, vehClearMax: 20,       // all-red after yellow; held while a vehicle is still in the box
  pedWalk: 12, pedFlash: 5,
  allRedPed: 2, pedClearMax: 45,       // all-red after walk; held while anyone is still on the crosswalk
  comfortDecel: 3.0,                   // yellow: stop if this is enough, otherwise carry on through
  maxDecel: 7.5,
};

const VEH_PHASES = { VG: 'green', VGF: 'green-flash', VY: 'yellow' };
const PED_PHASES = { PW: 'walk', PF: 'walk-flash' };

export function createSignalController(cfg = TRAFFIC_CONFIG) {
  let phase = 'VG', t = 0, cycle = 0, extending = false;
  const listeners = new Set();
  const next = { VG: 'VGF', VGF: 'VY', VY: 'AR1', AR1: 'PW', PW: 'PF', PF: 'AR2', AR2: 'VG' };
  function go(p) {
    const from = phase; phase = p; t = 0; extending = false;
    if (p === 'VG') cycle++;
    for (const fn of listeners) fn(p, from);
  }
  const redRemainder = () => cfg.pedWalk + cfg.pedFlash + cfg.allRedPed;
  return {
    // occupancy: { boxOccupied, crosswalkOccupied }
    update(dt, occ) {
      if (dt <= 0) return;
      t += dt;
      switch (phase) {
        case 'VG': if (t >= cfg.vehGreen) go('VGF'); break;
        case 'VGF': if (t >= cfg.vehGreenFlash) go('VY'); break;
        case 'VY': if (t >= cfg.yellow) go('AR1'); break;
        case 'AR1':
          extending = t >= cfg.allRedVeh && occ.boxOccupied;
          if (t >= cfg.allRedVeh && (!occ.boxOccupied || t >= cfg.vehClearMax)) go('PW');
          break;
        case 'PW': if (t >= cfg.pedWalk) go('PF'); break;
        case 'PF': if (t >= cfg.pedFlash) go('AR2'); break;
        case 'AR2':
          extending = t >= cfg.allRedPed && occ.crosswalkOccupied;
          if (t >= cfg.allRedPed && (!occ.crosswalkOccupied || t >= cfg.pedClearMax)) go('VG');
          break;
        default: break;
      }
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get phase() { return phase; },
    get time() { return t; },
    get cycle() { return cycle; },
    get extending() { return extending; },
    get vehAspect() { return VEH_PHASES[phase] || 'red'; },
    get pedAspect() { return PED_PHASES[phase] || 'dont-walk'; },
    // whole seconds left in the current aspect, for the countdown displays (null while held)
    get vehCountdown() {
      if (phase === 'VG') return Math.ceil(cfg.vehGreen + cfg.vehGreenFlash - t);
      if (phase === 'VGF') return Math.ceil(cfg.vehGreenFlash - t);
      if (phase === 'VY') return Math.ceil(cfg.yellow - t);
      if (extending) return null;
      if (phase === 'AR1') return Math.ceil(cfg.allRedVeh - t + redRemainder());
      if (phase === 'PW') return Math.ceil(cfg.pedWalk - t + cfg.pedFlash + cfg.allRedPed);
      if (phase === 'PF') return Math.ceil(cfg.pedFlash - t + cfg.allRedPed);
      return Math.max(1, Math.ceil(cfg.allRedPed - t));
    },
    get pedCountdown() {
      if (phase === 'PW') return Math.ceil(cfg.pedWalk + cfg.pedFlash - t);
      if (phase === 'PF') return Math.ceil(cfg.pedFlash - t);
      return null;                                   // red: no countdown (common on Shanghai ped heads)
    },
  };
}

// ---- car following: Intelligent Driver Model ----
function idm(v, v0, gap, dv, p, s0 = p.s0) {
  const sStar = s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
  const free = 1 - Math.pow(v / v0, 4);
  if (gap === Infinity) return p.a * free;
  return p.a * (free - Math.pow(sStar / Math.max(gap, 0.05), 2));
}

/**
 * geom: layout.crossing; vehicles: [{ id, lane, len, width, v0?, s }]; peds: layout.crossing.peds
 * rng: deterministic in tests. Returns the live state plus update(dt, { player }).
 */
export function createTraffic({ geom, vehicles: vSpecs, peds: pSpecs = [], config = TRAFFIC_CONFIG, rng = Math.random, shop = null }) {
  const cfg = { ...TRAFFIC_CONFIG, ...config };
  const ctl = createSignalController(cfg);
  const lanes = Object.fromEntries(geom.lanes.map((l) => [l.id, { ...l, vehicles: [] }]));
  const cw = geom.crosswalk, road = geom.road;
  let sights = [];
  const stats = { redEntries: 0, blockedEntries: 0, yellowGo: 0, yellowStop: 0, minGap: Infinity, overlaps: 0, pedConflicts: 0, recycled: 0 };

  const vehicles = vSpecs.map((sp) => {
    const v0 = sp.v0 ?? 10.5 + rng() * 2.5;
    const veh = {
      id: sp.id, lane: lanes[sp.lane], len: sp.len, width: sp.width,
      v0, p: { a: 1.4 + rng() * 0.5, b: 2.4, s0: 2.2, T: 1.2 + rng() * 0.4 },
      reaction: 0.55 + rng() * 0.6, waited: 0,
      s: sp.s, v: sp.v ?? 0, acc: 0, active: sp.active !== false, hold: 0,
      committed: false, braking: false, wheelDist: 0, x: 0, z: 0, yaw: 0, why: '',
    };
    veh.lane.vehicles.push(veh);
    return veh;
  });

  // yellow onset: each vehicle short of its stop line decides once, stop or go
  ctl.on((phase) => {
    if (phase === 'VG' || phase === 'VGF') for (const v of vehicles) v.committed = false;
    if (phase !== 'VY') return;
    for (const v of vehicles) {
      if (!v.active || v.s > geom.stopS) continue;
      const d = geom.stopS - v.s;
      v.committed = d > 0 && (v.v * v.v) / (2 * d) > cfg.comfortDecel;
      if (v.committed) stats.yellowGo++; else if (v.v > 1) stats.yellowStop++;
    }
  });

  // ---- pedestrians ----
  const peds = pSpecs.map((sp) => {
    const WC = [-29.3, sp.corner * 5.0], WZ = [cw.x0, sp.zc], EC = [-3.3, sp.zc];
    const nodes = [
      { p: sp.westWander }, { p: WC, curb: true }, { p: WZ, cross: true }, { p: EC, cross: true },
      { p: sp.eastWander }, { p: EC, curb: true }, { p: WZ, cross: true }, { p: WC, cross: true },
    ];
    const east = !!sp.startEast;
    return {
      id: sp.id, look: sp.look, speed: sp.speed, nodes, idx: east ? 5 : 1,
      x: east ? sp.eastWander[0] : sp.westWander[0], z: east ? sp.eastWander[1] : sp.westWander[1], vx: 0, vz: 0, heading: 0,
      state: 'walk', crossing: false, delay: 0, blocked: 0, detour: null, walkPhase: rng() * 6,
      // rain: 'umbrella' (keeps walking), 'shelter' (jogs under the portico), 'cab' (books one at the kerb)
      rain: sp.rain || 'umbrella', react: 'none', path: [], jog: false, umbrella: 0, phone: 0, side: 0,
      // how they take a bump (engine/social.js), and a reaction in progress: stop for a moment,
      // turn to the other person, be knocked a little off line
      persona: sp.persona || 'office', pause: 0, faceTo: null, faceFor: 0, gesture: null, shove: null,
      // eyes on a phone while walking (messages, short videos, a drama episode): decided leg by leg
      phoneHabit: sp.phoneHabit ?? 0.2, phoneWalk: false, phoneKind: 'chat', phoneW: 0,
      coffee: sp.coffee || 0, errand: null, cup: sp.startCup || 0, cupBrand: sp.startCup ? 'starbucks' : 'manner',   // some arrive with a coffee from elsewhere                          // a coffee run now and then (errands.js)
    };
  });

  const inCrosswalk = (x, z, m = 0) => x > cw.x0 - m && x < cw.x1 + m && z > cw.z0 - m && z < cw.z1 + m;
  const onCarriageway = (x) => x > road.x0 - 0.2 && x < road.x1 + 0.2;

  function people(player) {
    const list = peds.map((p) => ({ x: p.x, z: p.z, vx: p.vx, vz: p.vz, crossing: p.crossing, ai: p }));
    if (player) list.push({ x: player.x, z: player.z, vx: player.vx || 0, vz: player.vz || 0, crossing: false, player: true });
    return list;
  }

  // s-range a vehicle occupies; rear = s - len
  const overlapsS = (veh, s0, s1) => veh.active && veh.s > s0 && veh.s - veh.len < s1;

  function exitSpace(veh, list = []) {
    // room on the far side of the box: the next vehicle ahead, or a person in the lane beyond it
    let limit = Infinity;
    const half = veh.width / 2 + 0.7;
    for (const h of list) {
      if (!onCarriageway(h.x) || Math.abs(h.x - veh.lane.x) >= half) continue;
      const hs = h.z * veh.lane.dir;
      if (hs > geom.boxEndS - 1) limit = Math.min(limit, hs - 0.45 - 1.6);      // where the vehicle would have to stop
    }
    for (const o of veh.lane.vehicles) {
      if (o === veh || !o.active || o.s <= veh.s) continue;
      const rear = o.s - o.len;
      if (rear >= geom.boxEndS - 0.5) limit = Math.min(limit, rear + Math.max(0, o.v) * 1.0);
      else if (rear > veh.s) limit = Math.min(limit, rear);                    // someone ahead is still in the box
    }
    return limit - geom.boxEndS;
  }

  function personInPath(veh, list, horizon = 60) {
    // nearest person ahead in (or about to step into) this vehicle's corridor -> s of obstacle
    const half = veh.width / 2 + 0.7;
    let best = Infinity;
    for (const h of list) {
      if (!onCarriageway(h.x)) continue;
      let hit = false;
      for (const tt of [0, 0.75, 1.5]) if (Math.abs(h.x + h.vx * tt - veh.lane.x) < half) { hit = true; break; }
      if (!hit) continue;
      const s = h.z * veh.lane.dir;
      if (s < veh.s - 0.6 || s - veh.s > horizon) continue;                     // beside or behind the bumper
      best = Math.min(best, s - 0.45);
    }
    return best;
  }

  function crosswalkCorridorBusy(veh, list) {
    // anyone on the crosswalk near this lane, or heading into it within ~3 s
    for (const h of list) {
      if (!inCrosswalk(h.x, h.z, 0.3)) continue;
      for (const tt of [0, 1, 2, 3]) if (Math.abs(h.x + h.vx * tt - veh.lane.x) < veh.width / 2 + 1.6) return true;
    }
    return false;
  }

  // THE movement permission for vehicles: may this vehicle pass its stop line now?
  function vehiclePermission(veh, list) {
    if (veh.s > geom.stopS) return { ok: true, why: 'in junction' };
    const a = ctl.vehAspect;
    if (a === 'red') return { ok: false, why: 'red' };
    if (a === 'yellow' && !veh.committed) return { ok: false, why: 'yellow: stopping' };
    if (crosswalkCorridorBusy(veh, list)) return { ok: false, why: 'pedestrian on crosswalk' };
    if (exitSpace(veh, list) < veh.len + 1.5) return { ok: false, why: 'exit blocked' };
    return { ok: true, why: a === 'yellow' ? 'yellow: committed' : 'green' };
  }
  // THE movement permission for pedestrians: may this person step off the kerb now?
  function pedestrianPermission() {
    if (ctl.pedAspect !== 'walk') return false;                                // never on flash or red
    return !vehicles.some((v) => overlapsS(v, cw.z0 - 0.3, cw.z1 + 0.3));      // nothing left on the zebra
  }

  function stepVehicles(dt, list) {
    for (const lane of Object.values(lanes)) {
      lane.vehicles.sort((a, b) => b.s - a.s);                                 // front-most first
      const act = lane.vehicles.filter((v) => v.active && !(v.pickup && v.pickup.state === 'parked' && Math.abs(v.dx || 0) > 2.5));
      for (let i = 0; i < act.length; i++) {
        const veh = act[i], lead = act[i - 1] || null;
        let acc = idm(veh.v, veh.v0, Infinity, 0, veh.p), why = 'free';
        if (lead) {
          const gap = lead.s - lead.len - veh.s;
          const a = idm(veh.v, veh.v0, gap, veh.v - lead.v, veh.p);
          if (a < acc) { acc = a; why = 'following'; }
        }
        const perm = vehiclePermission(veh, list);
        if (!perm.ok) {
          const d = geom.stopS - veh.s;
          // an exit that clogs up inside braking distance is ridden through (stopping across the
          // line is worse); red and pedestrians always get full braking
          const tooLate = perm.why === 'exit blocked' && (veh.v * veh.v) / (2 * Math.max(d, 0.01)) > cfg.maxDecel;
          if (!tooLate) {
            const a = idm(veh.v, veh.v0, d, veh.v, veh.p, 0.6);
            if (a < acc) { acc = a; why = perm.why; }
          }
        }
        const ps = personInPath(veh, list);
        if (ps < Infinity) {
          const a = idm(veh.v, veh.v0, ps - veh.s, veh.v, veh.p, 1.6);
          if (a < acc) { acc = a; why = 'yielding to pedestrian'; }
        }
        // a ride-hail pickup: slow to a stop at the kerb and wait there; then pull away
        const pk = veh.pickup;
        if (pk && pk.state === 'approach') {
          const d = pk.stopS - veh.s;
          const a = idm(veh.v, veh.v0, Math.max(0.01, d + 2.2), veh.v, veh.p, 0.6);
          if (a < acc) { acc = a; why = 'pulling in'; }
          if (d < 0.6 && veh.v < 0.4) { pk.state = 'parked'; veh.v = 0; acc = 0; }
        }
        if (pk && pk.state === 'parked') { acc = 0; veh.v = 0; why = 'waiting at the kerb'; }
        if (veh.forceBrake) { acc = Math.min(acc, -veh.forceBrake); why = 'emergency stop'; }
        acc = Math.max(-cfg.maxDecel - 1.5, veh.forceBrake ? -veh.forceBrake : -Infinity, acc);
        // progressive departure: from standstill, wait a reaction time before moving off
        if (veh.v < 0.05 && acc > 0.05) { veh.waited += dt; if (veh.waited < veh.reaction) acc = 0; } else if (veh.v < 0.05) veh.waited = 0;
        const before = veh.s;
        veh.v = Math.max(0, veh.v + acc * dt);
        veh.s += veh.v * dt;
        if (lead) {                                                             // hard guarantee, never needed in practice
          const limit = lead.s - lead.len - 0.4;
          if (veh.s > limit) { stats.overlaps++; veh.s = Math.max(before, limit); veh.v = Math.min(veh.v, lead.v); }
          stats.minGap = Math.min(stats.minGap, lead.s - lead.len - veh.s);
        }
        if (before <= geom.stopS && veh.s > geom.stopS) {                       // audit every stop-line crossing
          const a = ctl.vehAspect;
          if (a === 'red' || (a === 'yellow' && !veh.committed)) stats.redEntries++;
          if (exitSpace(veh, list) < veh.len + 1.5 - 0.6) stats.blockedEntries++;
        }
        veh.acc = acc; veh.why = why;
        veh.braking = acc < -0.6 || (veh.v < 0.3 && acc <= 0.05);
        veh.wheelDist += veh.v * dt;
        if (veh.s - veh.len > geom.exitS && !veh.hidden) { veh.active = false; veh.hold = 1 + rng() * 9; veh.v = 0; stats.recycled++; }
      }
      // rejoin at the far end once the entry is clear (>= 320 m from the player's reachable area)
      for (const veh of lane.vehicles) {
        if (veh.active) continue;
        veh.hold -= dt;
        if (veh.hold > 0) continue;
        const rear = lane.vehicles.filter((o) => o.active).reduce((m, o) => Math.min(m, o.s - o.len), Infinity);
        if (rear < geom.entryS + 30) continue;
        veh.active = true; veh.s = geom.entryS; veh.v = veh.v0 * 0.85; veh.committed = false; veh.waited = 0;
        break;                                                                  // one at a time per lane
      }
    }
    for (const veh of vehicles) {
      // sideways: a pickup easing in to the kerb and back out; a lane change
      const pk = veh.pickup;
      let want = 0;
      if (pk) {
        const d = pk.stopS - veh.s, sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        want = pk.state === 'go' ? pk.dx * (1 - sm(0, 28, -d)) : pk.dx * sm(34, 4, d);
      }
      if (veh.laneChange) {
        const lc = veh.laneChange; lc.t += dt;
        want = (lc.to.x - veh.lane.x) * Math.min(1, lc.t / lc.dur);
        if (lc.t >= lc.dur) {                                                   // arrived in the new lane
          veh.lane.vehicles.splice(veh.lane.vehicles.indexOf(veh), 1); lc.to.vehicles.push(veh); veh.lane = lc.to; veh.laneChange = null; want = 0; veh.dx = 0;
        }
      }
      const prev = veh.dx || 0; veh.dx = want;
      veh.x = veh.lane.x + veh.dx; veh.z = veh.s * veh.lane.dir - (veh.len / 2) * veh.lane.dir;   // z of the body centre
      const ds = Math.max(0.05, veh.v * dt);
      veh.yaw = (veh.lane.dir > 0 ? 0 : Math.PI) + (veh.v > 0.1 ? Math.atan2(veh.dx - prev, ds) * veh.lane.dir : 0);
    }
  }

  // ---- rain reactions ----
  let rainy = false;                                                            // hysteresis on the drizzle level
  const RS = geom.rainSpots;
  const onZhongshan = (p) => p.x > road.x0 - 0.2 && p.x < road.x1 + 0.2;
  function react(p, dt) {
    // umbrella: open / close it while walking on (no detour)
    if (p.rain === 'umbrella') { p.umbrella = Math.max(0, Math.min(1, p.umbrella + (rainy ? dt : -dt) / 1.3)); return; }
    p.phone = Math.max(0, Math.min(1, p.phone + ((p.react === 'phoning') ? dt : -dt) / 0.8));
    const free = !p.crossing && !onZhongshan(p) && !p.detour;                  // never divert mid-crossing
    const west = p.x < -16;
    if (rainy && p.react === 'none' && free) {
      if (!west) {                                                              // the shelter / kerb is on the other side: cross first
        if (p.rain === 'shelter' && p.idx === 4) p.idx = 5;
        if (p.rain === 'cab' && p.state !== 'waiting') { p.path = [RS.cab.east]; p.react = 'cab'; p.side = 1; }
        return;
      }
      p.state = 'walk';
      const corner = p.x < -30.5 ? [[RS.hankouCorner[0], Math.sign(p.z || 1) * Math.abs(RS.hankouCorner[1])]] : [];
      if (p.rain === 'shelter') { p.path = [...corner, ...(p.z < 16 ? [RS.shelter.via[0]] : []), RS.shelter.via[1], RS.shelter.spot]; p.react = 'shelter'; p.jog = true; }
      else { p.path = [...corner, RS.cab.west]; p.react = 'cab'; p.side = -1; }
    } else if (!rainy && p.react !== 'none' && p.react !== 'return') {
      if (p.react === 'shelter' || p.react === 'sheltered') {
        const wc = p.nodes[1].p;
        p.path = [...(p.x < -31 ? [RS.shelter.via[1]] : []), RS.shelter.via[0], wc]; p.react = 'return'; p.jog = false;
      } else { p.path = []; p.react = 'none'; p.state = 'walk'; p.idx = p.side > 0 ? 5 : 1; }
    }
  }

  function stepPeds(dt, player) {
    // everyone on foot, for anticipatory avoidance (people don't walk into each other on purpose)
    const others = peds.map((q) => ({ x: q.x, z: q.z, vx: q.vx, vz: q.vz, r: 0.3, ref: q }));
    if (player) others.push({ x: player.x, z: player.z, vx: player.vx || 0, vz: player.vz || 0, r: 0.36, ref: null });
    for (const p of peds) {
      react(p, dt);
      if (p.faceFor > 0) p.faceFor -= dt; else p.faceTo = null;
      // a sight worth a look (a supercar at the kerb): heads turn, some stop for a photo (sights.js)
      if (sights.length && !p.crossing && !p.errand && p.react === 'none' && !p.jog) noticeSights(p, sights, dt, rng); else if (!p.photo) p.gaze = null;
      if (p.shove) {                                                          // knocked off line by a bump
        const k = Math.min(1, dt / p.shove.t);
        p.x += p.shove.x * k; p.z += p.shove.z * k; p.shove.t -= dt;
        if (p.shove.t <= 0) p.shove = null;
      }
      if (p.pause > 0 && !p.crossing) {                                      // stopped for a moment (never in the road)
        p.pause -= dt; p.vx = p.vz = 0;
        if (p.faceTo) p.heading = Math.atan2(p.faceTo[0] - p.x, p.faceTo[1] - p.z);
        continue;
      }
      if (p.react === 'sheltered' || p.react === 'phoning') {                   // standing: under the portico / at the kerb
        p.vx = p.vz = 0;
        p.heading = p.react === 'phoning' ? (p.side > 0 ? -Math.PI / 2 : Math.PI / 2) : Math.PI / 2;
        continue;
      }
      if (p.cup > 0) p.cup = Math.max(0, p.cup - dt);
      // on a coffee run: walk to the queue / pickup, stand while ordering and waiting
      if (p.errand) {
        const e = p.errand, tg = errandTarget(shop, e);
        if (tg && e.phase !== 'leave') {
          const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz), arrived = d < 0.08;
          if (!arrived) {
            let [vx, vz] = [dx / d * Math.min(p.speed, d / Math.max(dt, 1e-3)), dz / d * Math.min(p.speed, d / Math.max(dt, 1e-3))];
            const me = others.find((o) => o.ref === p);
            [vx, vz] = avoid({ x: p.x, z: p.z, r: 0.3 }, [vx, vz], others.filter((o) => o !== me), { space: 0.1 });
            const vl = Math.hypot(vx, vz), st = Math.min(d, vl * dt);
            if (vl > 1e-6) { p.x += vx / vl * st; p.z += vz / vl * st; }
            p.vx = vx; p.vz = vz; if (vl > 0.05) p.heading = Math.atan2(vx, vz);
            p.walkPhase += st * 4.5;
          } else { p.vx = p.vz = 0; p.heading = Math.PI; }                    // facing the shop (north)
          stepErrand(shop, e, dt, arrived);
          continue;
        }
        p.cup = e.cupFor; p.cupBrand = 'manner'; p.errand = null; p.idx = (p.idx + 1) % p.nodes.length;   // back on the way, coffee in hand
      }
      const node = p.nodes[p.idx];
      if (p.state === 'waiting' && !p.path.length) {
        p.vx = p.vz = 0;
        if (pedestrianPermission()) { p.delay -= dt; if (p.delay <= 0) { p.state = 'walk'; p.idx = (p.idx + 1) % p.nodes.length; } } else p.delay = 0.4 + rng() * 1.2;
        continue;
      }
      const onPath = p.path.length > 0;
      const target = p.detour || (onPath ? p.path[0] : node.p);
      let dx = target[0] - p.x, dz = target[1] - p.z;
      const dist = Math.hypot(dx, dz);
      dx /= dist || 1; dz /= dist || 1;
      // make way for the player: pause, then step round
      let blocked = false;
      if (player) {
        const px = player.x - p.x, pz = player.z - p.z, pd = Math.hypot(px, pz);
        if (pd < 0.85 && (px * dx + pz * dz) / (pd || 1) > 0.3) blocked = true;
        if (blocked) {
          p.blocked += dt;
          if (p.blocked > 1.0 && !p.detour) {
            const side = dx * pz - dz * px > 0 ? -1 : 1;                         // pass on the side away from the player
            p.detour = [player.x - dz * side * 1.1 + dx * 0.4, player.z + dx * side * 1.1 + dz * 0.4];
          }
        } else p.blocked = 0;
      }
      const base = p.jog ? Math.max(1.9, p.speed * 1.5) : p.speed * (p.umbrella > 0 && p.umbrella < 1 ? 0.6 : 1);   // a slow jog / slowing to open the umbrella
      // a new leg: phone up or not (put away for the road itself more often than not)
      if (p.legIdx !== p.idx) {
        p.legIdx = p.idx;
        const crossingLeg = !!(p.nodes[p.idx] && p.nodes[p.idx].cross);
        p.phoneWalk = !p.jog && p.react === 'none' && rng() < p.phoneHabit * (crossingLeg ? 0.45 : 1);
        if (p.phoneWalk) p.phoneKind = rng() < 0.55 ? 'video' : 'chat';
      }
      p.phoneW = Math.max(0, Math.min(1, p.phoneW + (p.phoneWalk ? dt : -dt) / 0.6));
      const sp = blocked && !p.detour ? 0 : base * (1 - 0.15 * p.phoneW) * gawkSpeed(p);
      // steer round anyone about to be in the way (off the crosswalk lines only a little)
      let vx = dx * sp, vz = dz * sp;
      if (sp > 0 && !p.detour) {
        const me = others.find((o) => o.ref === p);
        [vx, vz] = avoid({ x: p.x, z: p.z, r: 0.3 }, [vx, vz], others.filter((o) => o !== me), p.phoneW > 0.5 ? DISTRACTED : { space: p.crossing ? 0.15 : SOCIAL.space });
      }
      const vl = Math.hypot(vx, vz), step = Math.min(dist, vl * dt);
      if (vl > 1e-6) { p.x += vx / vl * step; p.z += vz / vl * step; }
      p.vx = vx; p.vz = vz;
      if (vl > 0.05) p.heading = Math.atan2(vx, vz);                     // (a glance back at someone is the head's job)
      p.walkPhase += step * 4.5;                                              // ~1.4 m per gait cycle
      if (dist - step < 0.03) {
        if (p.detour) { p.detour = null; p.blocked = 0; continue; }
        if (onPath) {
          p.path.shift();
          if (!p.path.length) {
            if (p.react === 'shelter') p.react = 'sheltered';
            else if (p.react === 'cab') p.react = 'phoning';
            else if (p.react === 'return') { p.react = 'none'; p.idx = 1; p.state = 'walk'; }
          }
          p.crossing = false;
          continue;
        }
        if (node.curb) { p.state = 'waiting'; p.delay = 0.4 + rng() * 1.2; p.crossing = false; }
        else if (shop && p.idx === 0 && p.coffee && p.react === 'none' && !p.cup && rng() < p.coffee) { p.errand = startErrand(shop, p.id, rng); p.phoneWalk = false; }
        else p.idx = (p.idx + 1) % p.nodes.length;
      }
      const nn = p.nodes[p.idx];
      p.crossing = !onPath && !!nn.cross && p.state !== 'waiting';
    }
  }

  function occupancy(list) {
    return {
      boxOccupied: vehicles.some((v) => overlapsS(v, geom.stopS + 0.2, geom.boxEndS)),
      crosswalkOccupied: list.some((h) => inCrosswalk(h.x, h.z) || (h.ai && h.ai.crossing && onCarriageway(h.x))),
    };
  }

  function update(dt, { player = null, rain = 0 } = {}) {
    if (dt <= 0) return;
    if (rain > 0.3) rainy = true; else if (rain < 0.08) rainy = false;
    let left = dt;
    while (left > 1e-6) {                                                       // fixed small steps: stable at any frame rate
      const h = Math.min(left, 0.05);
      const list = people(player);
      ctl.update(h, occupancy(list));
      stepVehicles(h, list);
      stepPeds(h, player);
      // audit: a person on the carriageway inside a vehicle's footprint
      for (const q of people(player)) for (const v of vehicles) {
        if (!v.active) continue;
        const zf = v.s * v.lane.dir, zr = (v.s - v.len) * v.lane.dir;
        if (Math.abs(q.x - v.x) < v.width / 2 + 0.25 && q.z > Math.min(zf, zr) - 0.25 && q.z < Math.max(zf, zr) + 0.25) stats.pedConflicts++;
      }
      left -= h;
    }
  }

  return {
    controller: ctl, vehicles, peds, lanes, stats, config: cfg, shop,
    // things worth stopping to look at: [{ id, x, z }]
    setSights(list) { sights = list || []; },
    // a car moves over into the next lane over `dur` seconds (a cut-in)
    changeLane(veh, toId, dur = 1.5) { if (!veh.laneChange && lanes[toId] && veh.lane !== lanes[toId]) veh.laneChange = { to: lanes[toId], t: 0, dur }; },
    update, vehiclePermission: (v, player) => vehiclePermission(v, people(player)), pedestrianPermission,
    occupancy: (player) => occupancy(people(player)),
    inCrosswalk, exitSpace,
    get rainy() { return rainy; },
  };
}
