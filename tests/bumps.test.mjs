// Bumps between people (src/world/bumps.js): passers-by brushing past each other say nothing; people
// walking together never bump each other; when you bump someone they may say something, but not over
// and over (one line at a time, each person once in a while), in their own pitch, never the browser's
// synthetic voice. npm test.
import { createBumps } from '../src/world/bumps.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const barks = [];
const hud = { bark: (o) => barks.push(o) };
let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const B = createBumps({ hud, audio: null, rnd });
const person = (id, x, z, vx, vz, extra = {}) => ({ id, persona: 'office', x, z, vx, vz, r: 0.3, apply() {}, ...extra });
// two strangers walking into each other, again and again
for (let k = 0; k < 40; k++) B.update(k * 2, [person('a', 0, 0, 1.2, 0), person('b', 0.45, 0, -1.2, 0), person('player', 50, 50, 0, 0)], { x: 0, z: 0 });
ok(barks.length === 0, `strangers brushing past each other 40 times: ${barks.length} lines said`);
// a couple side by side, moving together and nudging
const n0 = B.log.length;
for (let k = 0; k < 20; k++) B.update(100 + k * 2, [person('c', 0, 0, 1, 0.3, { group: 'with7' }), person('d', 0.4, 0, 0.6, -0.4, { group: 'with7' }), person('player', 50, 50, 0, 0)], { x: 0, z: 0 });
ok(B.log.slice(n0).every((e) => e.with !== 'd' && e.with !== 'c'), 'two people walking together never count as bumping each other');
// you, bumping one person repeatedly, and then several in a row
barks.length = 0;
for (let k = 0; k < 12; k++) B.update(200 + k * 2, [person('e', 0.5, 0, -0.5, 0, { persona: 'student' }), { id: 'player', x: 0, z: 0, vx: 2.5, vz: 0, r: 0.42 }], { x: 0, z: 0 });
ok(barks.length >= 1 && barks.length <= 1, `bumping the same person 12 times in 24 s: ${barks.length} line (not a stream of sorries)`);
const t0 = 300; barks.length = 0;
for (let k = 0; k < 6; k++) B.update(t0 + k * 0.5, [person(`f${k}`, 0.5, 0, -0.5, 0), { id: 'player', x: 0, z: 0, vx: 2.5, vz: 0, r: 0.42 }], { x: 0, z: 0 });
ok(barks.length <= 1, `six people in three seconds: ${barks.length} line at a time`);
const all = []; const hud2 = { bark: (o) => all.push(o) }; const B2 = createBumps({ hud: hud2, audio: null, rnd: () => 0.01 });
for (let k = 0; k < 8; k++) B2.update(k * 40, [person(`g${k}`, 0.5, 0, -0.5, 0, { persona: 'student' }), { id: 'player', x: 0, z: 0, vx: 2.5, vz: 0, r: 0.42 }], { x: 0, z: 0 });
ok(all.length > 1 && new Set(all.map((b) => b.rate.toFixed(3))).size > 1 && all.every((b) => b.rate > 0.9 && b.rate < 1.1), `each person has their own pitch (${[...new Set(all.map((b) => b.rate.toFixed(2)))].join(', ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
