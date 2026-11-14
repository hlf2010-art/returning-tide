// Headless checks for movement, collision and boundaries (run: npm test)
import { L, colliders, groundHeight } from '../src/world/layout.js';
import { createBody, stepBody, resolve, WALK_SPEED, RUN_SPEED } from '../src/engine/movement.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const inside = (p, shrink = 0.02) => colliders.find((b) =>
  p.x > b.minX + shrink && p.x < b.maxX - shrink && p.z > b.minZ + shrink && p.z < b.maxZ - shrink);
const inBounds = (p) => p.x > L.street.xEnd && p.x < L.deckEdgeX && p.z > L.zNorth && p.z < L.zSouth;

function walk(body, dirX, dirZ, seconds, run = false) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) stepBody(body, dirX, dirZ, run, dt);
  return body;
}

// 1. spawn is free and on the ground
{
  const b = createBody();
  ok(!inside(b) && resolve({ x: b.x, z: b.z }) === null, 'spawn point is not inside any collider');
  ok(b.y === 0, 'spawn is on the Hankou Road carriageway');
}
// 2. the intended route works: street -> across the road -> up the stairs -> railing
{
  const b = createBody();
  walk(b, 1, 0, 60);
  ok(Math.abs(b.x - (L.deckEdgeX - 0.12 - L.radius)) < 0.02, `walking east ends at the river railing (x=${b.x.toFixed(2)})`);
  ok(Math.abs(b.y - L.deckY) < 0.01, `player stands on the promenade deck (y=${b.y.toFixed(2)})`);
  ok(b.hit === 'railing', 'railing reports contact');
}
// 3. speed
{
  const b = createBody();
  walk(b, 1, 0, 4);
  const v = Math.hypot(b.vx, b.vz);
  ok(Math.abs(v - WALK_SPEED) < 0.05, `walk speed settles at ${WALK_SPEED} m/s (${v.toFixed(2)})`);
  walk(b, 1, 0, 3, true);
  ok(Math.abs(Math.hypot(b.vx, b.vz) - RUN_SPEED) < 0.1, `run speed settles at ${RUN_SPEED} m/s`);
  // weight: speeding up and stopping both take time, and winding up into a run is slower again
  const c = createBody(); let tWalk = 0;
  while (Math.hypot(c.vx, c.vz) < WALK_SPEED * 0.9 && tWalk < 5) { stepBody(c, 1, 0, false, 1 / 60); tWalk += 1 / 60; }
  ok(tWalk > 0.25 && tWalk < 0.7, `reaching 90% of walking pace takes a moment (${tWalk.toFixed(2)} s)`);
  let tRun = 0;
  while (Math.hypot(c.vx, c.vz) < RUN_SPEED * 0.9 && tRun < 8) { stepBody(c, 1, 0, true, 1 / 60); tRun += 1 / 60; }
  ok(tRun > 0.8 && tRun < 2.5, `walk to 90% of a run takes longer (${tRun.toFixed(2)} s)`);
  let tStop = 0, dist = 0;
  while (Math.hypot(c.vx, c.vz) > 0.2 && tStop < 5) { const x0 = c.x; stepBody(c, 0, 0, false, 1 / 60); dist += Math.abs(c.x - x0); tStop += 1 / 60; }
  ok(tStop > 0.25 && dist > 0.4 && dist < 1.5, `a running stop carries on for a step or so (${dist.toFixed(2)} m in ${tStop.toFixed(2)} s)`);
  const d = createBody(); for (let i = 0; i < 120; i++) stepBody(d, 1, 0, true, 1 / 60, false, 1.0);
  ok(Math.abs(Math.hypot(d.vx, d.vz) - 1.0) < 0.05, 'a stamina speed cap holds');
}
// 4. the retaining wall cannot be crossed except by the stairs
{
  const b = createBody(); b.x = -10; b.z = 30;
  walk(b, 1, 0, 20, true);
  ok(b.x < L.wallX && b.y < 0.2, `retaining wall blocks at road level (x=${b.x.toFixed(2)})`);
  const d = createBody(); d.x = 15; d.z = 60; d.y = 3;
  walk(d, -1, 0, 20, true);
  ok(d.x > L.wallX && Math.abs(d.y - 3) < 0.01, `deck edge blocks from above (x=${d.x.toFixed(2)})`);
}
// 5. boundaries on all sides
{
  const n = createBody(); n.x = -15; n.z = L.zNorth + 20; walk(n, 0, -1, 30, true);
  ok(n.z > L.zNorth && n.hit === 'boundary', `north barrier holds (z=${n.z.toFixed(2)})`);
  const s = createBody(); s.x = 15; s.z = 60; s.y = 3; walk(s, 0, 1, 30, true);
  ok(s.z < L.zSouth && s.hit === 'boundary', `south barrier holds on the deck (z=${s.z.toFixed(2)})`);
  const w = createBody(); walk(w, -1, 0, 30, true);
  ok(w.x > L.street.xEnd && w.hit === 'boundary', `Hankou Road hoarding holds (x=${w.x.toFixed(2)})`);
}
// 6. sliding: pushing diagonally into a wall still moves along it
{
  const b = createBody(); b.x = -60; b.z = 5;
  walk(b, 0.7071, 0.7071, 3);
  ok(b.x > -57 && b.z < L.street.halfW, `slides along the Customs House wall (x=${b.x.toFixed(2)}, z=${b.z.toFixed(2)})`);
}
// 7. fuzz: a drunk sprint for 40 simulated minutes never escapes or tunnels
{
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const b = createBody();
  let bad = 0, maxY = -1, minY = 9, dir = 0, onDeck = 0;
  for (let i = 0; i < 144000; i++) {
    if (i % 90 === 0) dir = rnd() * Math.PI * 2;
    const dt = i % 500 === 0 ? 0.05 : 1 / 60;       // include frame hitches
    stepBody(b, Math.cos(dir), Math.sin(dir), true, dt);
    if (!inBounds(b) || inside(b)) bad++;
    if (!Number.isFinite(b.x + b.z + b.y)) bad++;
    maxY = Math.max(maxY, b.y); minY = Math.min(minY, b.y);
    if (b.y > 2.9) onDeck++;
  }
  ok(bad === 0, `fuzz walk: 144000 steps, ${bad} escapes/penetrations`);
  ok(minY >= -0.001 && maxY <= L.deckY + 0.001, `height stays within [0, ${L.deckY}] (${minY.toFixed(2)}..${maxY.toFixed(2)})`);
  ok(onDeck > 0, `fuzz walk reached the deck (${onDeck} steps there)`);
}
// 8. ground continuity along the stairs
{
  let maxJump = 0, prev = groundHeight(1.9, 0);
  for (let x = 1.9; x < 10; x += 0.05) { const h = groundHeight(x, 0); maxJump = Math.max(maxJump, Math.abs(h - prev)); prev = h; }
  ok(maxJump < 0.16, `stairs are a continuous climb (max step ${maxJump.toFixed(3)} m per 5 cm)`);
}
// 9. jump: a short hop that lands, and does not get over barriers
{
  const b = createBody(); let peak = 0, steps = 0;
  stepBody(b, 0, 0, false, 1 / 60, true);
  while (b.air && steps++ < 600) { stepBody(b, 0, 0, false, 1 / 60); peak = Math.max(peak, b.y); }
  ok(peak > 0.45 && peak < 0.65 && !b.air && b.y === 0, `jump peaks at ${peak.toFixed(2)} m and lands after ${(steps / 60).toFixed(2)} s`);
  const n = createBody(); n.x = -15; n.z = -55;
  for (let i = 0; i < 600; i++) stepBody(n, 0, -1, true, 1 / 60, i % 20 === 0);
  ok(n.z > L.zNorth, `jumping at the north barrier does not clear it (z=${n.z.toFixed(2)})`);
  const s = createBody(); s.x = 0; s.z = 0;
  for (let i = 0; i < 900; i++) stepBody(s, 1, 0, true, 1 / 60, i % 15 === 0);
  ok(Math.abs(s.y - L.deckY) < 0.6 && s.x > 20, `jumping up the stair still arrives on the deck (x=${s.x.toFixed(1)}, y=${s.y.toFixed(2)})`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
