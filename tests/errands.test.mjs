// A coffee run at a takeaway window (src/engine/errands.js). npm test.
import { createShop, startErrand, errandTarget, stepErrand } from '../src/engine/errands.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const DT = 0.25;
{
  const shop = createShop({ queue: [{ x: 0, z: 0 }, { x: -0.8, z: 0.3 }, { x: -1.6, z: 0.5 }], pickup: { x: 1.2, z: 0 } });
  const r = rng(4), people = ['a', 'b', 'c'].map((id) => ({ id, x: -6 - Math.random(), z: 2, e: null }));
  people.forEach((p) => { p.e = startErrand(shop, p.id, r); });
  const ordered = [], log = [];
  for (let t = 0; t < 400 && !people.every((p) => p.e.done); t += DT) {
    for (const p of people) {
      const tg = errandTarget(shop, p.e);
      if (tg) { const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz); if (d > 0.05) { const s = Math.min(d, 1.2 * DT); p.x += dx / d * s; p.z += dz / d * s; } }
      const before = p.e.phase;
      stepErrand(shop, p.e, DT, tg ? Math.hypot(tg.x - p.x, tg.z - p.z) < 0.06 : true);
      if (before !== 'order' && p.e.phase === 'order') ordered.push(p.id);
      if (before !== p.e.phase) log.push(`${p.id}:${p.e.phase}`);
    }
    // nobody stands in the same spot as anyone else while queueing
    const spots = people.filter((p) => ['queue', 'order'].includes(p.e.phase)).map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    if (new Set(spots).size !== spots.length) { ok(false, `two people in one queue spot at t=${t}`); break; }
  }
  ok(people.every((p) => p.e.done && p.e.cupFor > 0), 'all three get their coffee and leave with it');
  ok(ordered.join() === 'a,b,c', `they order one at a time, in the order they arrived (${ordered.join(', ')})`);
  ok(shop.line.length === 0 && shop.waiting.length === 0, 'the queue and the pickup spot are empty afterwards');
  ok(log.filter((l) => l.startsWith('b')).slice(0, 2).join() === 'b:queue,b:order', `the second person queues before ordering (${log.filter((l) => l.startsWith('b')).join(' ')})`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
