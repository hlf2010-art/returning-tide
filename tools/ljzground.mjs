// how big is Lujiazui's ground mesh, how long does it take to build?  node tools/ljzground.mjs
import { buildGround, buildMarkings } from '../src/world/lujiazuiGround.js';
const t0 = performance.now(), g = buildGround(), t1 = performance.now(), m = buildMarkings();
const n = (x) => x.attributes.position.count / 3;
console.log(`ground ${(t1 - t0).toFixed(0)} ms: road ${n(g.road)} pave ${n(g.pave)} grass ${n(g.grass)} path ${n(g.path)} kerb ${n(g.kerb)} rails ${n(g.rails)} tris; paint ${n(m.white) + n(m.yellow)}`);
