// People and a nice car (src/engine/sights.js). npm test.
import { noticeSights, INTEREST, SIGHT } from '../src/engine/sights.js';
import { rng } from './util-rng.mjs';
import { createTraffic } from '../src/engine/traffic.js';
import { crossing, manner } from '../src/world/layout.js';
import { createShop } from '../src/engine/errands.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const car = { id: 'huracan', x: 0, z: 0 };

// walk someone past the car along a pavement 2.5 m from it; their pause (if any) is honoured
function passBy(persona, seed) {
  const r = rng(seed), p = { x: -25, z: 2.5, vx: 1.3, vz: 0, persona, pause: 0, faceTo: null, faceFor: 0 };
  let looked = false, photo = null, minSpeedPhase = Infinity, flash = false;
  for (let i = 0; i < 600; i++) {
    const dt = 0.05;
    noticeSights(p, [car], dt, r);
    if (p.gaze) looked = true;
    if (p.photo) { photo = photo || { at: p.x, dist: Math.hypot(p.x, p.z), faces: p.faceTo }; if (p.photo.flashAt > 0) flash = true; }
    if (p.pause > 0) { p.pause -= dt; p.vx = 0; continue; }
    p.vx = 1.3; p.x += p.vx * dt;
    if (p.x > 25) break;
    minSpeedPhase = Math.min(minSpeedPhase, p.x);
  }
  return { looked, photo, flash, end: p.x };
}
{
  let looks = 0, photos = 0, flashes = 0, okDist = true, faced = true;
  for (let s = 1; s <= 200; s++) {
    const r = passBy('youngMan', s);
    if (r.looked) looks++;
    if (r.photo) { photos++; if (r.photo.dist < SIGHT.photoNear || r.photo.dist > SIGHT.photoFar) okDist = false; if (!r.photo.faces) faced = false; }
    if (r.flash) flashes++;
  }
  ok(looks > 160, `young men passing a supercar: most look (${looks}/200)`);
  ok(photos > 60 && photos < 130, `and a fair few stop for a photo (${photos}/200)`);
  ok(okDist && faced, 'photos are taken from a few metres off, turned to face the car');
  ok(flashes > 10 && flashes < photos, `sometimes with the flash (${flashes})`);
}
{
  let photos = 0, looks = 0;
  for (let s = 1; s <= 200; s++) { const r = passBy('elder', s); if (r.photo) photos++; if (r.looked) looks++; }
  ok(photos < 15 && looks > 100, `older people mostly just look (${looks} looked, ${photos} photos)`);
}
{
  // walking away from it: nobody turns round to notice it behind them
  const r = rng(3), p = { x: 1, z: 2.5, vx: 1.3, vz: 0, persona: 'visitor', pause: 0 };
  let noticed = false;
  for (let i = 0; i < 200; i++) { if (noticeSights(p, [car], 0.05, r) === 'noticed') noticed = true; p.x += 0.065; }
  ok(!noticed, 'it has to be ahead of you to be noticed');
  ok(Object.keys(INTEREST).every((k) => INTEREST[k].look >= INTEREST[k].photo), 'nobody photographs what they did not look at');
}
{
  // an office worker pacing back and forth past it for ten minutes: notices it again now and then
  const r = rng(21), p = { x: -14, z: 2.5, vx: 1.2, vz: 0, persona: 'office', pause: 0 };
  let notices = 0, dir = 1;
  for (let i = 0; i < 12000; i++) {
    if (noticeSights(p, [car], 0.05, r) === 'noticed') notices++;
    if (p.pause > 0) { p.pause -= 0.05; continue; }
    p.x += dir * 1.2 * 0.05; p.vx = dir * 1.2; if (p.x > 14 || p.x < -14) dir = -dir;
  }
  ok(notices >= 3 && notices <= 9, `pacing past it for ten minutes, noticed it ${notices} times (not every pass)`);
}
{
  // the real Hankou Road crowd with the Huracán at the kerb: nobody walks through it; some photos
  const t = createTraffic({ geom: crossing, vehicles: crossing.vehicles, peds: crossing.peds, shop: createShop({ queue: manner.queue, pickup: manner.pickup }), rng: rng(4) });
  const car = { x: -40.6, z: 2.86 }, circles = [-1.5, 0, 1.5].map((dx) => ({ x: car.x + dx, z: car.z, r: 1.15 }));
  t.setSights([{ id: 'huracan', ...car }]); t.setObstacles(circles);
  let closest = 99, photos = 0;
  for (let i = 0; i < 20 * 60 * 20; i++) {
    t.update(0.05);
    for (const q of t.peds) { for (const c of circles) closest = Math.min(closest, Math.hypot(q.x - c.x, q.z - c.z) - c.r); if (q.photo && q.photo.t < 0.06) photos++; }
  }
  ok(closest > 0.15, `twenty minutes of the Hankou Road crowd: nobody walks through the parked car (closest ${closest.toFixed(2)} m from its body)`);
  console.log(`INFO  photos of it in those twenty minutes: ${photos}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
