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
