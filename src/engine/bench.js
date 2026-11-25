// The built-in benchmark (Settings → Graphics): a fixed 30-second camera route through the evening
// city with your settings: down Hankou Road, over the crossing, up onto the promenade looking across
// at Lujiazui, north along the river, round onto Nanjing Road. The clock is held at 8 pm (the busiest
// hour: the full crowd, every light on). Reported: average fps and the 1% low (the frame rate of the
// slowest 1% of frames), with the resolution and the preset. Pure: the route and the statistics.
export const BENCH_SECONDS = 30, BENCH_WARMUP = 2.5, BENCH_HOUR = [20, 0];
// [x, eye height, z] and where to look, at each point (the route is a smooth curve through them)
export const BENCH_ROUTE = [
  { p: [-92, 1.7, 1.5], look: [-40, 2, 0] },
  { p: [-50, 1.7, 2.5], look: [0, 3, -4] },
  { p: [-20, 1.7, 3.5], look: [10, 4, 0] },
  { p: [3, 3.6, 0.5], look: [60, 8, -20] },
  { p: [18, 4.7, -12], look: [640, 60, -42] },
  { p: [19, 4.7, -90], look: [500, 40, -160] },
  { p: [16, 4.7, -170], look: [-60, 10, -230] },
  { p: [-18, 1.7, -199], look: [-120, 4, -201] },
  { p: [-90, 1.7, -201], look: [-200, 5, -201] },
];
// frame times (ms, in order) -> what the player is told
export function benchStats(ms) {
  if (!ms.length) return null;
  const total = ms.reduce((s, v) => s + v, 0), sorted = [...ms].sort((a, b) => b - a);
  const worst = sorted.slice(0, Math.max(1, Math.round(ms.length * 0.01)));
  const p99 = worst[worst.length - 1];
  return {
    frames: ms.length, seconds: total / 1000,
    avgFps: (ms.length * 1000) / total,
    low1: 1000 / (worst.reduce((s, v) => s + v, 0) / worst.length),   // the average of the slowest 1% of frames
    p99ms: p99, worstMs: sorted[0],
  };
}
// where the camera is at fraction u (0..1) of the route: Catmull-Rom through the points
export function benchAt(u) {
  const R = BENCH_ROUTE, n = R.length - 1, f = Math.max(0, Math.min(1, u)) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const P = (k) => R[Math.max(0, Math.min(n, k))];
  const cr = (key, c) => { const a = P(i - 1)[key][c], b = P(i)[key][c], d = P(i + 1)[key][c], e = P(i + 2)[key][c], t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t2 + (-a + 3 * b - 3 * d + e) * t3); };
  return { pos: [0, 1, 2].map((c) => cr('p', c)), look: [0, 1, 2].map((c) => cr('look', c)) };
}

// ---- the hero shots (docs/living-city.md) ----
// Four fixed views at fixed hours, each one a place and time there is real footage of, so the game
// can be put side by side with it. pos: the camera [x, y, z] (a person's eye height above the ground
// there, as handheld footage is shot); look: the point it looks at; hour: [h, m].
export const HERO_SHOTS = [
  { id: 'nanjing', name: 'Nanjing Road East near Henan Road', zh: '南京东路·近河南中路', hour: [18, 0], pos: [-478, 1.83, -198.5], look: [-380, 6.5, -201.5] },
  { id: 'customs', name: 'The promenade at the Customs House', zh: '海关大楼前的观景平台', hour: [17, 45], pos: [21, 4.68, 2], look: [-36, 13, 34] },
  { id: 'hankou', name: 'The Hankou Road crossing', zh: '汉口路路口', hour: [18, 15], pos: [0.4, 1.83, 3.5], look: [-40, 3, -0.5] },
  { id: 'morning', name: 'The Bund at 8 am', zh: '早上八点的外滩', hour: [8, 0], pos: [21, 4.68, -38], look: [-24, 12, -160] },
];
// per shot: seconds to let the hour settle (lights, crowd, traffic), then seconds measured
export const SHOT_SETTLE = 4, SHOT_MEASURE = 12;
// the p-th percentile (0..100) of a list of numbers (nearest rank)
export function percentile(xs, p) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}
// frame times (ms) -> average, p95, p99, worst, and the frame rate they make
export function frameSummary(ms) {
  if (!ms.length) return null;
  const total = ms.reduce((s, v) => s + v, 0), r = (v) => Math.round(v * 100) / 100;
  return { frames: ms.length, avgMs: r(total / ms.length), p95Ms: r(percentile(ms, 95)), p99Ms: r(percentile(ms, 99)), worstMs: r(Math.max(...ms)), fps: r((ms.length * 1000) / total) };
}
// the liveliness samples taken during a shot -> one line per number: the mean (rounded) and the most
export function sampleSummary(samples) {
  const out = {};
  for (const s of samples) for (const [k, v] of Object.entries(s)) {
    if (typeof v !== 'number') continue;
    const o = out[k] || (out[k] = { sum: 0, n: 0, max: -Infinity });
    o.sum += v; o.n++; o.max = Math.max(o.max, v);
  }
  return Object.fromEntries(Object.entries(out).map(([k, o]) => [k, { mean: Math.round((o.sum / o.n) * 10) / 10, max: o.max }]));
}
// the whole run -> the JSON the player copies and sends back
export function shotsReport({ shots, settings, version = 1 }) {
  return { benchmark: 'returning-tide hero shots', version, settings, shots };
}
