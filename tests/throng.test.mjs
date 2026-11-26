// Nanjing Road's throng (engine/throng.js): where its people walk, stand and fade.   node tests/throng.test.mjs
import { NJ, METRO, colliders } from '../src/world/layout.js';
import { THRONG, buildThrong, throngAt, throngStretches, throngDistanceFade, throngPeople } from '../src/engine/throng.js';
import { TRAM_ROUTE } from '../src/world/tram.js';
import { LOD } from '../src/engine/gfx.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const T = buildThrong({ count: 6000, roles: 16 });
ok(T.n === 6000 && T.track.length === 24000 && T.look.every((v, i) => i % 4 !== 0 || (v >= 0 && v < 16)), 'as many people as asked, each dressed as one of the atlas avatars');
const again = buildThrong({ count: 6000, roles: 16 });
ok(again.track.every((v, i) => v === T.track[i]) && again.phase.every((v, i) => v === T.phase[i]), 'the same street every load (seeded)');

// over a few minutes of the evening: everyone drawn is on the pedestrian street, off Henan Road's
// carriageway, out of the metro wells and out of the trams' lanes
const h = NJ.henan, tramHalf = 0.9 + 0.25;
let bad = { street: 0, henan: 0, metro: 0, tram: 0, wall: 0 }, drawn = 0;
const walls = colliders.filter((b) => b.tag === 'nj-north' || b.tag === 'nj-south');
for (const t of [0, 37, 410, 1999, 7321]) for (let i = 0; i < T.n; i += 3) {
  const p = throngAt(T, i, t, 1); if (p.fade <= 0) continue; drawn++;
  if (p.x > -36 || p.x < NJ.xWest || p.z < NJ.z0 + 0.6 || p.z > NJ.z1 - 0.6) bad.street++;
  if (p.x > h.x0 - 1 && p.x < h.x1 + 1) bad.henan++;
  if (METRO.some((m) => p.x > m.x0 && p.x < m.x1 && p.z > m.z0 - 0.3 && p.z < m.z1 + 0.3)) bad.metro++;
  if (p.x < TRAM_ROUTE.xEast && p.x > TRAM_ROUTE.xWest && [TRAM_ROUTE.zc - TRAM_ROUTE.half, TRAM_ROUTE.zc + TRAM_ROUTE.half].some((lz) => Math.abs(p.z - lz) < tramHalf)) bad.tram++;
  if (walls.some((b) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ)) bad.wall++;
}
ok(drawn > 5000, `plenty drawn over the evening (${drawn} samples)`);
ok(Object.values(bad).every((n) => n === 0), `nobody off the street, on Henan Road, in a metro well, in a tram's lane or inside a building (${JSON.stringify(bad)})`);

// walking: along the street at a walking pace, facing the way they go, stepping through the walk
const w = [...Array(T.n).keys()].find((i) => T.track[i * 4 + 3] !== 0);
const a = throngAt(T, w, 100), b = throngAt(T, w, 101), v = T.track[w * 4 + 3];
ok(Math.abs(Math.abs(b.x - a.x) - Math.abs(v)) < 0.01 && Math.sign(b.x - a.x) === Math.sign(v) && a.heading === Math.sign(v) * Math.PI / 2, 'a walker moves along the street at their own pace, facing the way they go');
ok(Math.abs(v) >= 0.85 && Math.abs(v) <= 1.35 && a.pose >= 0 && a.pose < 8, 'a strolling pace (0.85-1.35 m/s) and a step of the walk cycle');
const standers = [...Array(T.n).keys()].filter((i) => T.track[i * 4 + 3] === 0);
ok(standers.length > T.n * 0.03 && standers.every((i) => { const p = throngAt(T, i, 50); return !p.moving && (p.pose === 8 || p.pose === 9); }), 'some stand at the shop windows or photograph the street');
ok([...Array(T.n).keys()].filter((i) => T.look[i * 4 + 2] === -2).length > T.n * 0.3, 'about a third or more walk with someone');

// they come and go at the ends of their stretch instead of popping
const st = throngStretches();
ok(st.length === 2 && st[0].x1 > h.x1 && st[1].x0 < h.x0, 'two stretches, cut at Henan Road');
let pops = 0;
for (let i = 0; i < 400; i++) if (T.track[i * 4 + 3] !== 0) for (let t = 0; t < 600; t += 0.5) { const p = throngAt(T, i, t), q = throngAt(T, i, t + 0.5); if (Math.abs(q.x - p.x) > 5 && (p.fade > 0.05 || q.fade > 0.05)) pops++; }
ok(pops === 0, 'wrapping round to the start of a stretch happens only while faded out');

// the hour: the share of the evening that's out
const out = (share) => { let n = 0; for (let i = 0; i < T.n; i++) if (throngAt(T, i, 200, share).fade > 0.5) n++; return n; };
const o0 = out(0), o3 = out(0.3), o1 = out(1);
ok(o0 === 0 && o3 > 0.2 * o1 && o3 < 0.4 * o1, `out by the hour (0: ${o0}, 0.3: ${o3}, 1: ${o1})`);

// the camera: the simulated crowd near, the throng beyond it, gone in the distance
ok(throngDistanceFade({ x: 0, z: 0 }, 5, 0) === 0 && throngDistanceFade({ x: 0, z: 0 }, 60, 0) === 1 && throngDistanceFade({ x: 0, z: 0 }, 500, 0) === 0, 'faded out near the camera and far off, whole in between');
ok(THRONG.near[1] <= 30, 'whole by 30 m, where the simulated crowd turns to cards anyway');

// the hero view along Nanjing Road at six on a weekday evening (share about 0.69) with the medium preset
const M = buildThrong({ count: LOD.medium.throng, roles: 16 });
const seen = throngPeople(M, 300, 0.69, -478, -198.5).filter((p) => p.x > -478);
ok(seen.length > 1300, `the hero view east from Henan Road holds well over a thousand of them (${seen.length})`);
ok(new Set(seen.map((p) => p.activity)).size >= 4, 'walking, walking together, window-shopping and photographing among them');

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
