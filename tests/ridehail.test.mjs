// A ride-hail pickup from the passenger's side (src/engine/rideHail.js). npm test.
import { createRide, stepRide, rideAction, RIDE } from '../src/engine/rideHail.js';
import { rng } from './util-rng.mjs';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const DT = 1 / 10;

// a whole ride: the car appears once the ETA is nearly up, drives in at ~8 m/s, stops at the kerb
function ride(seed) {
  const s = createRide(rng(seed)); let car = null, acts = new Set();
  for (let i = 0; i < 20000 && s.phase !== 'gone'; i++) {
    if (!car && s.phase === 'waiting' && s.eta < 12) car = { dist: 100, stopped: false };
    if (car && !car.stopped) { car.dist = Math.max(0, car.dist - 8 * DT); car.stopped = car.dist === 0; }
    stepRide(s, DT, car); acts.add(rideAction(s));
  }
  return { s, acts, kinds: s.events };
}
{
  const { s, acts, kinds } = ride(1);
  ok(s.phase === 'gone', 'the passenger is picked up and leaves');
  const order = ['accepted', 'message', 'spotting', 'plate', 'wave', 'boarding', 'gone'].map((k) => kinds.indexOf(k));
  ok(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), `in the right order: accept -> message the driver -> spot the car -> check the plate -> wave -> board -> gone`);
  ok(kinds.filter((k) => k === 'glance').length >= 3, `looks up the street now and then while waiting (${kinds.filter((k) => k === 'glance').length} times)`);
  ok(['phone', 'lookStreet', 'toDoor', 'enter'].every((a) => acts.has(a)), 'phone, looking up the street, walking to the door, getting in');
}
// impatience: a slipping ETA and a late car make them look more often, and eventually call
{
  const s = createRide(rng(3), { slipChance: 0 }); let t = 0, glancesEarly = 0, glancesLate = 0;
  while (s.phase !== 'waiting') { stepRide(s, DT); t += DT; }
  const due = t + s.quoted;
  for (; t < due + 150; t += DT) { const n = s.events.length; stepRide(s, DT, null); if (s.events.length > n && s.events.at(-1) === 'glance') { if (t < due) glancesEarly++; else if (t > due + 60) glancesLate++; } }
  const rateEarly = glancesEarly / s.quoted, rateLate = glancesLate / 90;
  ok(rateLate > rateEarly * 1.8, `glances more often once the car is late (${(rateEarly * 60).toFixed(1)}/min -> ${(rateLate * 60).toFixed(1)}/min)`);
  ok(s.impatience > 0.9 && s.events.includes('call'), 'and in the end calls the driver');
}
// the quoted ETA is realistic, and the ETA sometimes slips
{
  let slipped = 0, etas = [];
  for (let k = 0; k < 200; k++) { const { kinds, s } = ride(100 + k); if (kinds.includes('eta-slipped')) slipped++; etas.push(s.quoted); }
  ok(Math.min(...etas) >= RIDE.etaMin && Math.max(...etas) <= RIDE.etaMax, `first ETA between ${RIDE.etaMin} and ${RIDE.etaMax} s`);
  ok(slipped > 20 && slipped < 120, `the ETA slips on some rides (${slipped}/200)`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
