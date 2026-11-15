// The benchmark's statistics and route (src/engine/bench.js). npm test.
import { benchStats, benchAt, BENCH_ROUTE } from '../src/engine/bench.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const steady = benchStats(Array(600).fill(1000 / 60));
ok(Math.abs(steady.avgFps - 60) < 0.01 && Math.abs(steady.low1 - 60) < 0.01, 'a steady 60: average 60, 1% low 60');
const hitchy = benchStats([...Array(594).fill(10), ...Array(6).fill(50)]);
ok(Math.abs(hitchy.avgFps - 600 / 6.24) < 0.01 && Math.abs(hitchy.low1 - 20) < 0.01 && hitchy.worstMs === 50, `100 fps with six 50 ms hitches: average ${hitchy.avgFps.toFixed(1)}, 1% low ${hitchy.low1.toFixed(1)}`);
ok(benchStats([]) === null, 'no frames: no result');
const a = benchAt(0), b = benchAt(1);
ok(a.pos.every((v, i) => Math.abs(v - BENCH_ROUTE[0].p[i]) < 1e-9) && b.pos.every((v, i) => Math.abs(v - BENCH_ROUTE[BENCH_ROUTE.length - 1].p[i]) < 1e-9), 'the route starts and ends where it says');
let jump = 0; for (let u = 0; u < 1; u += 0.001) { const p = benchAt(u).pos, q = benchAt(u + 0.001).pos; jump = Math.max(jump, Math.hypot(p[0] - q[0], p[2] - q[2])); }
ok(jump < 1.2, `smooth: never more than ${jump.toFixed(2)} m per thousandth`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
