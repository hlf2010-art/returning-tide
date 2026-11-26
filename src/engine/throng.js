// Nanjing Road's throng: the thousands on the pedestrian street beyond the simulated crowd. Pure (no
// three.js); world/throngView.js draws them as the far crowd's impostor cards, moved entirely on the GPU
// from a few numbers each, so they cost one draw call and no per-frame work on the main thread.
//
// Why: the simulated crowd (engine/crowd.js) is a few thousand people for the whole map, so the 1.5 km of
// Nanjing Road East shows a couple of hundred at six in the evening. An ordinary evening there is about
// 0.15-0.3 people per m² (docs/living-city.md: holiday peaks near 1 per m², 32,000-65,000 on the street
// at once), so the hero view along the street should hold well over a thousand.
//
// How: each person walks a straight track along the street, east or west, at their own pace and their own
// distance from the shop fronts, with a slight weave; when they reach the end of their stretch they fade
// out and come back in at the other end. The street is cut into stretches at Henan Road (cars cross there),
// so nobody walks through the traffic. Some stand at the shop windows or stop to photograph the neon.
// Couples and friends walk side by side. Within about 15 m of the camera the throng fades out: there the
// simulated crowd, which steers, talks and goes into shops, is what you see.
//
// The same arithmetic runs here (for the liveliness numbers and the tests) and in the vertex shader; keep
// them in step (world/throngView.js THRONG_GLSL).
import { NJ, METRO } from '../world/layout.js';

const Z_N = NJ.z0 + 4.6, Z_S = NJ.z1 - 1.6;   // the walking strip (north edge clear of the metro wells and lamp row)

export const THRONG = {
  near: [14, 19],          // the throng fades in between these distances from the camera (nearer, the simulated crowd's full people)
  far: [420, 470],         // and out again here (fog has taken most of it by then)
  endFade: 6,              // metres of fade at each end of a stretch
  wrap: 10000,             // the clock wraps every this many seconds (float precision on the GPU)
  stride: 1.35,            // metres per walk cycle (as engine/crowd.js)
};

// the stretches of the street people walk: [xEast, xWest] (x falls going west), and the strip across it
// they keep to (clear of the shop steps and the metro wells by the north kerb)
export function throngStretches() {
  const h = NJ.henan;
  // west of Henan Road the sightseeing trams run both ways down the street (world/tram.js TRAM_ROUTE: lanes
  // at zc +- half, cars about 1.8 m wide): nobody walks in a tram's lane, they walk between and beside them
  const tz = NJ.zc + 4.3, th = 2.4, clear = 1.5;
  return [
    { x0: -40, x1: h.x1 + 1.5, bands: [[Z_N, Z_S]] },                 // the Bund end to Henan Road
    { x0: h.x0 - 1.5, x1: NJ.xWest + 3,                                // Henan Road to Xizang Road
      bands: [[Z_N, tz - th - clear], [tz - th + clear, tz + th - clear], [tz + th + clear, Z_S]] },
  ];
}

// a seeded random sequence (so the street is the same each load and in the tests)
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// count: how many people when the street is at its busiest. roles: how many avatars the atlas has.
// Returns per person (Float32Arrays, `n` long, the layouts world/throngView.js uploads):
//   track [xEast, xWest, z, speed]    speed in m/s, signed: < 0 walks west, > 0 east, 0 stands
//   phase [start (m along), weave phase, stride phase, hash]   hash: when in the evening they're out (0..1)
//   look  [role, scale, pose, heading]   pose: -1 walking, -2 walking together, 8 standing, 9 photographing
export function buildThrong({ count = 4000, roles = 16, seed = 2026 } = {}) {
  const rnd = rng(seed), st = throngStretches();
  const len = st.map((s) => s.x0 - s.x1), total = len.reduce((a, b) => a + b, 0);
  const n = Math.max(0, Math.round(count));
  const track = new Float32Array(n * 4), phase = new Float32Array(n * 4), look = new Float32Array(n * 4);
  const inMetro = (x) => METRO.some((m) => x > m.x0 - 1.5 && x < m.x1 + 1.5);
  const inCross = (x) => NJ.cross.some((c) => x > c.x0 - 1.5 && x < c.x1 + 1.5) || (x > NJ.henan.x0 - 4 && x < NJ.henan.x1 + 4);
  for (let i = 0; i < n;) {
    // which stretch: by its length (the street is as busy all along)
    let r = rnd() * total, k = 0; while (k < st.length - 1 && r > len[k]) { r -= len[k]; k++; }
    const S = st[k], hash = rnd(), role = Math.floor(rnd() * roles), scale = 0.93 + rnd() * 0.12;
    const kind = rnd();
    if (kind < 0.07) {
      // at a shop window, or photographing the street's neon from the edge of it
      const x = S.x0 - 3 - rnd() * (len[k] - 6);
      if (inMetro(x) || inCross(x)) continue;
      const north = rnd() < 0.5, photo = rnd() < 0.3;
      const z = photo ? (north ? Z_N : Z_S) : north ? NJ.z0 + 1.3 : NJ.z1 - 1.3;
      const heading = photo ? (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : north ? Math.PI : 0;   // facing the window (north: -z), or along the street
      set(i, S, z, 0, x, hash, role, scale, photo ? 9 : 8, heading); i++;
      continue;
    }
    // walking: west on the north half more often, east on the south (keeping right, loosely)
    const bw = S.bands.map(([a, b]) => b - a), bt = bw.reduce((a, b) => a + b, 0);
    let zr = rnd() * bt, bi = 0; while (bi < bw.length - 1 && zr > bw[bi]) { zr -= bw[bi]; bi++; }
    const band = S.bands[bi], z = band[0] + zr;
    const south = (z - Z_N) / (Z_S - Z_N);
    const west = rnd() < 0.65 - 0.3 * south;
    const v = (0.85 + rnd() * 0.5) * (west ? -1 : 1);
    const at = rnd() * len[k];
    // with a companion beside them, at their pace (a couple, two friends; now and then three)
    const more = rnd() < 0.38 ? (rnd() < 0.2 ? 2 : 1) : 0, tag = more ? -2 : -1;
    set(i, S, z, v, at, hash, role, scale, tag, 0); i++;
    for (let c = 0; c < more && i < n; c++) {
      const side = z + 0.62 < band[1] - 0.25 ? 1 : -1, zc = Math.min(band[1] - 0.25, Math.max(band[0] + 0.25, z + (c + 1) * 0.62 * side));   // (beside them, inside their band)
      set(i, S, zc, v, at + (rnd() - 0.5) * 0.4, hash, Math.floor(rnd() * roles), 0.93 + rnd() * 0.12, tag, 0); i++;
    }
  }
  function set(i, S, z, v, at, hash, role, scale, pose, heading) {
    track.set([S.x0, S.x1, z, v], i * 4);
    phase.set([at, rnd() * Math.PI * 2, rnd(), hash], i * 4);
    look.set([role, scale, pose, heading], i * 4);
  }
  return { n, track, phase, look };
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// person i at time t (s): { x, z, heading, pose (0-9), fade (0..1, before the camera's distance), moving }
// active: the share of the evening throng that's out (engine/timeOfDay.js crowd, as the simulated crowd)
export function throngAt(T, i, t, active = 1) {
  const o = i * 4, [x0, x1, z0, v] = T.track.subarray(o, o + 4), [s0, wv, sp, hash] = T.phase.subarray(o, o + 4), pose0 = T.look[o + 2];
  const len = x0 - x1, tt = t % THRONG.wrap;
  let out = Math.min(1, Math.max(0, (active - hash) * 25));          // (out or not by the hour, eased over a few % of the crowd)
  if (v === 0) return { x: s0, z: z0, heading: T.look[o + 3], pose: pose0, fade: out, moving: false };
  const s = (((s0 + Math.abs(v) * tt) % len) + len) % len;
  const x = v < 0 ? x0 - s : x1 + s;
  const z = z0 + 0.22 * Math.sin(0.35 * tt + wv);
  out *= smooth(0, THRONG.endFade, s) * smooth(0, THRONG.endFade, len - s);
  const step = Math.floor((((sp + Math.abs(v) * tt / THRONG.stride) % 1) + 1) % 1 * 8) % 8;
  return { x, z, heading: v < 0 ? -Math.PI / 2 : Math.PI / 2, pose: step, fade: out, moving: true, together: pose0 === -2 };
}

// how much of person p the camera at (ex, ez) sees for distance alone (the near and far fades)
export function throngDistanceFade(p, ex, ez) {
  const d = Math.hypot(p.x - ex, p.z - ez);
  return smooth(THRONG.near[0], THRONG.near[1], d) * (1 - smooth(THRONG.far[0], THRONG.far[1], d));
}

// everyone drawn at all from (ex, ez) at time t, for the liveliness numbers: [{ x, z, activity }]
export function throngPeople(T, t, active, ex, ez) {
  const out = [];
  for (let i = 0; i < T.n; i++) {
    const p = throngAt(T, i, t, active);
    if (p.fade * throngDistanceFade(p, ex, ez) < 0.5) continue;
    out.push({ x: p.x, z: p.z, activity: !p.moving ? (p.pose === 9 ? 'photographing' : 'window-shopping') : p.together ? 'walking together' : 'walking' });
  }
  return out;
}
