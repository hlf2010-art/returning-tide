// Mission One's courier: is seeing him a choice? Walking up Hankou Road with your eyes on the
// counter must NOT see him; turning to watch him must; the phone up must not (run: npm test).
import { createWitness, courierRoute, courierAt, WITNESS } from '../src/engine/witness.js';
import { pickTarget } from '../src/engine/targeting.js';
import { stall, colliders } from '../src/world/layout.js';

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failed++; };
const EYE = 1.62, CHEST = 1.35;
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; };

// one walk up the pavement toward the stall; look(eye, courier) -> direction; returns seconds seen
function walk({ from = [-31, -4.8], speed = 1.3, look, phone = () => false, pause = 0 }) {
  const route = courierRoute(stall), w = createWitness();
  let px = from[0], pz = from[1], t = 0, gone = null, saw = false, waited = 0;
  const dt = 1 / 30;
  for (let i = 0; i < 30 * 90 && !saw; i++) {
    t += dt;
    const toStall = Math.hypot(px - stall.x, pz - stall.z);
    if (gone === null && toStall < WITNESS.trigger) gone = t;
    const c = gone === null ? { x: route.wait[0], z: route.wait[1], done: false } : courierAt(route, t - gone);
    if (c.done) break;
    const eye = { x: px, y: EYE, z: pz }, at = { x: c.x, y: CHEST, z: c.z };
    const dir = norm(look(eye, at, t));
    const hit = pickTarget(eye, dir, [{ id: 'courier', ...at, reach: WITNESS.reach, cone: WITNESS.cone }], colliders);
    saw = w.step(dt, !!hit && !phone(t));
    // walk on until the counter, then (optionally) stand there a while
    if (Math.abs(px - (stall.x + 1.4)) > 0.05) px -= Math.min(speed * dt, px - (stall.x + 1.4));
    else if ((waited += dt) > pause) break;
  }
  return { saw, seen: w.seen };
}
const atStall = (eye) => ({ x: stall.x + 0.22 - eye.x, y: 1.1 - eye.y, z: stall.z + 0.08 - eye.z });
const atHim = (eye, at) => ({ x: at.x - eye.x, y: at.y - eye.y, z: at.z - eye.z });

// 1. the route itself
{
  const r = courierRoute(stall), a = courierAt(r, 0), end = courierAt(r, 999);
  ok(Math.abs(a.x - r.wait[0]) < 1e-9 && !a.done, 'he starts at the counter');
  ok(end.done && end.z > 6.5, 'and ends round the corner, off Hankou Road');
  const mid = courierAt(r, 12);
  ok(mid.z > 4 && mid.z < 6.5, 'in between he is on the south pavement');
}

// 2. eyes on the counter all the way: he passes unseen
{
  const r = walk({ look: atStall });
  ok(!r.saw, `walking straight to the pouch, eyes on it, does not see him (looked ${r.seen.toFixed(2)} s)`);
  const slow = walk({ look: atStall, speed: 0.7 });
  ok(!slow.saw, 'nor does dawdling up to it');
}

// 3. turning to watch him does
{
  const r = walk({ look: atHim });
  ok(r.saw, 'turning to keep him in view: Ji Bai remembers him');
  const glance = walk({ look: (e, at, t) => (Math.floor(t * 2) % 2 ? atHim(e, at) : atStall(e)) });
  ok(glance.saw, 'glancing back and forth adds up too');
}

// 4. phone up: you were looking at your phone, not at him
{
  const r = walk({ look: atHim, phone: () => true });
  ok(!r.saw && r.seen === 0, 'with the phone up, nothing is seen');
}

// 5. the witness accumulator itself
{
  const w = createWitness(1);
  ok(!w.step(0.5, true) && !w.step(5, true) && w.seen < 1, 'a long frame counts as a short look');
  for (let i = 0; i < 20; i++) w.step(0.1, true);
  ok(w.done && !w.step(0.1, true), 'fires once');
}

console.log(failed ? `${failed} FAILED` : 'all passed');
process.exit(failed ? 1 : 0);
