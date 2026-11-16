// Lujiazui layout sanity: are the routes on the road, the columns, stairs and exits off it?
//   node tools/ljzcheck.mjs
import { RAMPS, COLUMNS, ROUTES, polar, carriage, METRO_LJZ, wellPt } from '../src/world/lujiazuiLayout.js';
for (const R of ROUTES) { const bad = R.pts.filter(([x, z]) => !carriage(x, z)); console.log(R.id, R.len, 'off', bad.length); }
for (const r of [47, 50, 56, 60, 68]) { let run = [], out = []; for (let b = 0; b < 360; b += 0.5) { const c = carriage(...polar(b, r)); if (!c) run.push(b); else if (run.length) { out.push(`${run[0]}-${run[run.length - 1]}`); run = []; } } if (run.length) out.push(`${run[0]}-${run[run.length - 1]}`); console.log('pavement at r', r, out.join('  ')); }
for (const b of COLUMNS) { let m = 99; for (let d = -3; d <= 3; d += 0.5) for (let rr = 48.5; rr <= 51.5; rr += 0.5) if (carriage(...polar(b + d, rr))) m = Math.min(m, Math.abs(d)); console.log('col', b, m === 99 ? 'clear' : 'NEAR ' + m); }
for (const R of RAMPS) { let bad = 0; for (let t = 0; t <= R.run + 3; t += 0.5) for (const l of [-R.hw - 1, 0, R.hw + 1]) if (carriage(R.top[0] + R.dx * t + R.px * l, R.top[1] + R.dz * t + R.pz * l)) bad++; console.log('ramp', R.b, 'bad', bad); }
for (const m of METRO_LJZ) { let bad = 0; for (let t = -3; t <= m.len + 1; t += 0.5) for (const l of [-3, 0, 3]) if (carriage(...wellPt(m, t, l))) bad++; console.log('exit', m.exit, 'bad', bad); }
