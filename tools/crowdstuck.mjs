// Crowd health in node (no browser): how often passers-by walk into each other, and how many get
// stuck (wanting to walk, barely moving, for more than 2 s) and where. Runs the pure crowd sim
// (engine/crowd.js) with the two signals cycling, a standing player on the Hankou Road crossing's
// east kerb, and the crossing's own pedestrians (engine/traffic.js) as `others`.
//   node tools/crowdstuck.mjs [seconds=180] [density=1]   (PLAYER=walk: you walk the promenade; V=1: what
//   the contacts are and where stuck people stand; CROWD=path: compare another crowd.js)
import { detectBumps } from '../src/engine/social.js';
import { L, NJ, crossing, groundHeight } from '../src/world/layout.js';
import { createTraffic } from '../src/engine/traffic.js';
import { trafficSpecs } from '../src/world/trafficMix.js';

const { createCrowd } = await import(process.env.CROWD || '../src/engine/crowd.js');   // CROWD=path: another version, to compare
const SECS = Number(process.argv[2] || 180), DENS = Number(process.argv[3] || 1);
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const c = createCrowd({ density: DENS, rnd, roles: ['p1', 'p2', 'p3', 'p4', 'p5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'k1'] });
const traffic = createTraffic({ geom: crossing, vehicles: trafficSpecs(1, rnd), peds: crossing.peds, rng: rnd });
traffic.setExtraPeople && traffic.setExtraPeople(() => c.onCarriageway());
const simKinds = {};
if (process.env.V) {
  // what the crowd's own contacts are: who (walking / standing / on a phone / with someone), how (head-on, crossing paths, from behind, into someone standing), where
  const f0 = c.flinch.bind(c); let pend = null;
  c.flinch = (a, ox, oz, hard) => {
    if (!pend) { pend = a; return f0(a, ox, oz, hard); }
    const b = pend; pend = null;
    const kind = (q) => (q.v < 0.2 ? (q.state === 'kerb' ? 'kerbwait' : 'still') : q.phone ? 'phone' : q.kind === 'follower' || q.leader ? 'companion' : 'walker');
    const dot = a.v > 0.2 && b.v > 0.2 ? (a.vx * b.vx + a.vz * b.vz) / (a.v * b.v) : null;
    const how = dot === null ? 'into-still' : dot < -0.5 ? 'head-on' : dot > 0.5 ? 'same-way' : 'crossing';
    const k = `${[kind(a), kind(b)].sort().join('+')} ${how} @ ${zone(a)}`; if (process.env.VV) console.log('sim bump', k, a.x.toFixed(1), a.z.toFixed(1), a.path && a.path[a.i], b.path && b.path[b.i]); simKinds[k] = (simKinds[k] || 0) + 1;
    return f0(a, ox, oz, hard);
  };
}
const dt = 1 / 30, memo = new Map(), still = new Map();
let simMs = 0, bumps = 0, playerBumps = 0, stuckEvents = 0, stuckSecs = 0;
const where = {}, stuckIds = new Set(), bumpKinds = {};
// the player: standing at the crossing's east kerb, or (PLAYER=walk) walking the promenade's main walk
// back and forth at walking pace, straight through whoever is there (2.2 m/s, never giving way)
const WALK = process.env.PLAYER === 'walk';
const player = WALK ? { x: 17.6, z: -60, vx: 0, vz: 2.2, y: groundHeight(17.6, -60, 9) } : { x: -2.6, z: 3.0, vx: 0, vz: 0, y: 0.15 };
const zone = (a) => {
  if (Math.abs(a.x - L.westCurbX) < 1.6 && a.x > -40) return 'west kerb (Zhongshan Rd)';
  if (Math.abs(a.x - L.eastCurbX) < 1.6) return 'east kerb (Zhongshan Rd)';
  if (a.x < L.westCurbX && a.x > -100 && Math.abs(Math.abs(a.z) - L.street.roadHalfW) < 1.4) return 'Hankou Rd kerb';
  if (Math.abs(a.z - NJ.zc) < 12 && Math.abs(a.x - NJ.henan.x0) < 2.5) return 'Henan Rd west kerb';
  if (Math.abs(a.z - NJ.zc) < 12 && Math.abs(a.x - NJ.henan.x1) < 2.5) return 'Henan Rd east kerb';
  if (a.x > L.eastCurbX) return a.y > 1 ? 'promenade' : 'east pavement';
  if (Math.abs(a.z - NJ.zc) < 10) return 'Nanjing Rd';
  if (a.x < -32 && Math.abs(a.z) < 7) return 'Hankou Rd pavement';
  return 'west pavement / Hankou';
};
const together = (a, b) => a === b.partner || a === b.leader || b === a.leader || (a.leader && a.leader === b.leader) || (a.group && a.group === b.group) || a.kid === b || b.kid === a;
for (let f = 0; f < SECS / dt; f++) {
  const t = f * dt;
  if (WALK) { player.z += player.vz * dt; if (player.z > 60 || player.z < -60) player.vz = -player.vz; }
  traffic.update(dt, { player: WALK ? null : player });
  c.setSignal(traffic.controller.pedAspect, dt); c.setSignal(t % 50 < 18 ? 'walk' : 'dont', dt, 'henan');
  for (const a of c.agents) { a._px = a.x; a._pz = a.z; }
  const t0 = performance.now(); c.update(dt, { player, others: traffic.peds }); simMs += performance.now() - t0;
  for (const a of c.agents) a._sp = Math.hypot(a.x - a._px, a.z - a._pz) / dt;
  // contacts: everyone near everyone (by grid), as social.detectBumps sees them
  const live = c.agents.filter((a) => !a.gone);
  const cells = new Map();
  for (const a of live) { const k = `${Math.floor(a.x / 2)},${Math.floor(a.z / 2)}`; (cells.get(k) || cells.set(k, []).get(k)).push(a); }
  const seen = new Set();
  for (const a of live) {
    const cx = Math.floor(a.x / 2), cz = Math.floor(a.z / 2), group = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of cells.get(`${cx + i},${cz + j}`) || []) if (o.id > a.id && !together(a, o) && Math.abs(o.y - a.y) < 1) group.push(o);
    for (const o of group) {
      const ev = detectBumps([{ id: a.id, x: a.x, z: a.z, vx: a.vx, vz: a.vz, r: 0.3 }, { id: o.id, x: o.x, z: o.z, vx: o.vx, vz: o.vz, r: 0.3 }], t, memo);
      bumps += ev.length;
      if (ev.length) { const kind = (q) => (q.v < 0.2 ? 'still' : q.phone ? 'phone' : q.kind === 'follower' || q.leader ? 'companion' : 'walker'); const kk = [kind(a), kind(o)].sort().join('+') + ' @ ' + zone(a); bumpKinds[kk] = (bumpKinds[kk] || 0) + 1; }
    }
    if (Math.abs(a.y - player.y) < 1.2 && Math.abs(a.x - player.x) < 1 && Math.abs(a.z - player.z) < 1) { const n = detectBumps([{ id: a.id, x: a.x, z: a.z, vx: a.vx, vz: a.vz, r: 0.3 }, { id: 'player', ...player, r: 0.42 }], t, memo).length; playerBumps += n; if (n && process.env.V) console.log('player bump', t.toFixed(1), a.id, a.kind, a.state, a.act, a.v.toFixed(2), a.phone, a.x.toFixed(1), a.z.toFixed(1)); }
  }
  // stuck: wants to walk (walking or crossing state, or following someone who is) yet barely moves
  for (const a of live) {
    const boss = a.kind === 'follower' ? a.group.guide : a.leader;
    const wants = (a.state === "walk" || a.state === "cross") && (!boss || boss._sp > 0.3);
    if (wants && a._sp < 0.12) {
      const s = (still.get(a) || 0) + dt; still.set(a, s);
      if (s > 2 && s - dt <= 2) { stuckEvents++; const z = zone(a); where[z] = (where[z] || 0) + 1; stuckIds.add(a.id); if (process.env.V) console.log(t.toFixed(1), a.id, a.kind, a.state, z, a.x.toFixed(2), a.z.toFixed(2), a.path && a.path[a.i], boss ? `boss ${boss.id} ${boss.state} v${boss._sp.toFixed(2)} d${Math.hypot(boss.x - a.x, boss.z - a.z).toFixed(2)} h${boss.heading.toFixed(2)} ${boss.x.toFixed(2)},${boss.z.toFixed(2)}` : ""); }
      if (s > 2) stuckSecs += dt;
    } else still.delete(a);
  }
}
const mins = SECS / 60;
console.log(JSON.stringify({ secs: SECS, people: c.count(), msPerStep: +(simMs / (SECS / dt)).toFixed(2), simBumps: c.stats ? c.stats.bumps : null, unstuck: c.stats ? c.stats.unstuck : null, bumpsPerMin: +(bumps / mins).toFixed(1), playerBumpsPerMin: +(playerBumps / mins).toFixed(2), stuckEvents, stuckPeople: stuckIds.size, stuckPersonSecs: +stuckSecs.toFixed(0), stuckWhere: where, ...(process.env.V ? { simKinds } : {}) }, null, 1));
