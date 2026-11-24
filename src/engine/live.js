// Liveliness: how much life is in view right now, in numbers that can be set against real footage of
// the same street (docs/living-city.md). Pure: world/liveliness.js gathers what is there and what the
// camera can see; this sorts it and counts it. Shown by the overlay (L, or ?live) and returned by
// window.__bund.live().
//
//   people     in view, by how they are drawn: near (full animated people), mid (impostor cards
//              nearer than LIVE.mid m) and impostor (cards further off)
//   vehicles   in view, by type: taxi, car, new-energy (the NEV lookalikes), bus, boat
//   activities the different things the people in view are doing (walking, photographing, ...)
//   audible    sound sources loud enough to hear where the listener is
//   frame      frame time over the last LIVE.window frames: average and 95th percentile
//   draw       draw calls and triangles in the last frame
export const LIVE = { mid: 40, far: 330, vehicles: 400, activityRange: 120, window: 180, audible: 0.01 };   // audible: a source's level at the listener (about -40 dB)

const NEV = new Set(['nio-et5', 'li-l9', 'aito-m9', 'luxeed-r7']);
// a vehicle's model -> the type counted
export function vehicleKind(model) {
  if (model === 'taxi') return 'taxi';
  if (model === 'bus') return 'bus';
  if (model === 'boat' || model === 'cruise') return 'boat';
  if (NEV.has(model)) return 'nev';
  return 'car';
}
// what someone in the crowd (engine/crowd.js agent) or elsewhere is doing, in a word or two.
// Others (not the crowd) can say it themselves: { activity: 'tai chi' }
export function activityOf(a) {
  if (!a) return null;
  if (a.activity) return a.activity;
  const moving = (a.v || 0) > 0.2;
  switch (a.state) {
    case 'act':
      if (a.act === 'photo') return 'photographing';
      if (a.act === 'selfie') return 'taking a selfie';
      if (a.act === 'phone') return 'on the phone';
      if (a.act === 'guide') return 'guiding a tour';
      return a.window ? 'window-shopping' : 'looking at the view';
    case 'kerb': return 'waiting to cross';
    case 'cross': return 'crossing the road';
    case 'bus': return 'waiting for a bus';
    case 'board': return 'boarding a bus';
    case 'shop': return 'in and out of shops';
    case 'goto': return 'stopping to watch';
    default: break;
  }
  if (a.kind === 'jogger') return 'jogging';
  if (a.kind === 'follower' || a.kind === 'guide') return 'on a tour';
  if (!moving) return 'standing';
  if (a.kid || a.leader || a.partner) return 'walking together';
  if (a.phone) return 'walking on the phone';
  return 'walking';
}

// people records { x, y, z, near (drawn as a full person), activity fields... } and a view test
// inView(x, y, z, dist) -> { near, mid, impostor, total, activities: { name: count } }
export function countPeople(list, eye, inView) {
  const out = { near: 0, mid: 0, impostor: 0, total: 0, activities: {} };
  for (const p of list) {
    if (!p || p.gone || p.inside || p.out) continue;
    const d = Math.hypot(p.x - eye.x, p.z - eye.z);
    if (d > LIVE.far || !inView(p.x, (p.y || 0) + 1, p.z, d)) continue;
    if (p.near) out.near++; else if (d < LIVE.mid) out.mid++; else out.impostor++;
    out.total++;
    if (d <= LIVE.activityRange) { const k = activityOf(p); if (k) out.activities[k] = (out.activities[k] || 0) + 1; }
  }
  return out;
}
// vehicle records { x, z, model, active } -> { total, taxi, car, nev, bus, boat }
export function countVehicles(list, eye, inView) {
  const out = { total: 0, taxi: 0, car: 0, nev: 0, bus: 0, boat: 0 };
  for (const v of list) {
    if (!v || v.active === false) continue;
    const d = Math.hypot(v.x - eye.x, v.z - eye.z);
    if (d > LIVE.vehicles || !inView(v.x, (v.y ?? 0.8), v.z, d)) continue;
    out[vehicleKind(v.model)]++; out.total++;
  }
  return out;
}
// the last n frame times -> average and 95th percentile (ms)
export function frameWindow(n = LIVE.window) {
  const ms = new Float32Array(n), cpu = new Float32Array(n);
  let i = 0, full = false;
  return {
    push(frameMs, cpuMs = 0) { ms[i] = frameMs; cpu[i] = cpuMs; i = (i + 1) % n; if (!i) full = true; },
    stats() {
      const len = full ? n : i;
      if (!len) return { avgMs: 0, p95Ms: 0, fps: 0, cpuMs: 0, frames: 0 };
      const xs = Array.from(ms.subarray(0, len)).sort((a, b) => a - b);
      const tot = xs.reduce((s, v) => s + v, 0), ct = Array.from(cpu.subarray(0, len)).reduce((s, v) => s + v, 0);
      const r = (v) => Math.round(v * 10) / 10;
      return { avgMs: r(tot / len), p95Ms: r(xs[Math.min(len - 1, Math.ceil(0.95 * len) - 1)]), fps: r((len * 1000) / tot), cpuMs: r(ct / len), frames: len };
    },
  };
}
// sound sources [{ id, kind, level }] -> the ones loud enough to hear, loudest first, and how many of each kind
export function audibleSummary(sources) {
  const on = sources.filter((s) => s && s.level >= LIVE.audible).sort((a, b) => b.level - a.level);
  const kinds = {};
  for (const s of on) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  return { count: on.length, kinds, top: on.slice(0, 12).map((s) => ({ id: s.id, kind: s.kind, level: Math.round(s.level * 1000) / 1000 })) };
}
// the flat numbers a benchmark keeps per sample (engine/bench.js sampleSummary)
export function flatLive(s) {
  return {
    peopleNear: s.people.near, peopleMid: s.people.mid, peopleImpostor: s.people.impostor, people: s.people.total,
    vehicles: s.vehicles.total, taxi: s.vehicles.taxi, car: s.vehicles.car, nev: s.vehicles.nev, bus: s.vehicles.bus, boat: s.vehicles.boat,
    activities: s.activities.count, audible: s.audible.count, calls: s.draw.calls, triangles: s.draw.triangles,
  };
}
