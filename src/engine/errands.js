// A coffee run, as people actually do it at a takeaway window: pure, node-tested.
//   walk   to the end of the queue (or straight to the hatch if nobody's there)
//   queue  shuffle forward as the people ahead finish ordering
//   order  at the hatch: phone out, scan the code, a word with the barista (~6-12 s)
//   wait   step aside to wait for the drink, eyes on the phone (~20-60 s)
//   collect  take the cup from the pass, a nod
//   leave  back to wherever they were going, cup in hand (for a while)
// shop: { queue: [{x,z}...], pickup: {x,z} }; one shared shop state tracks who's in the queue.
export const COFFEE = { order: [6, 12], wait: [20, 60], collect: 1.5, carry: 90 };

export function createShop(spec) { return { ...spec, line: [], waiting: [] }; }

const lerp = (a, b, t) => a + (b - a) * t;

// returns the errand state for one person
export function startErrand(shop, who, rnd = Math.random) {
  shop.line.push(who);
  return { phase: 'walk', who, t: 0, orderFor: lerp(...COFFEE.order, rnd()), waitFor: lerp(...COFFEE.wait, rnd()), done: false, cupFor: 0 };
}

// where this person should be standing / walking to right now
export function errandTarget(shop, e) {
  if (e.phase === 'walk' || e.phase === 'queue' || e.phase === 'order') {
    const i = Math.max(0, shop.line.indexOf(e.who));
    return shop.queue[Math.min(i, shop.queue.length - 1)];
  }
  if (e.phase === 'wait' || e.phase === 'collect') {
    const k = shop.waiting.indexOf(e.who);
    return { x: shop.pickup.x + (k > 0 ? 0.7 * k : 0), z: shop.pickup.z + (k > 0 ? 0.35 : 0) };
  }
  return null;
}

// arrived: the person is standing at errandTarget. Returns the phase after this step.
export function stepErrand(shop, e, dt, arrived) {
  e.t += dt;
  switch (e.phase) {
    case 'walk':
      if (arrived) { e.phase = shop.line.indexOf(e.who) === 0 ? 'order' : 'queue'; e.t = 0; }
      break;
    case 'queue':
      if (shop.line.indexOf(e.who) === 0 && arrived) { e.phase = 'order'; e.t = 0; }
      break;
    case 'order':
      if (e.t >= e.orderFor) {
        shop.line.splice(shop.line.indexOf(e.who), 1); shop.waiting.push(e.who);
        e.phase = 'wait'; e.t = 0;
      }
      break;
    case 'wait':
      if (e.t >= e.waitFor && arrived) { e.phase = 'collect'; e.t = 0; }
      break;
    case 'collect':
      if (e.t >= COFFEE.collect) {
        shop.waiting.splice(shop.waiting.indexOf(e.who), 1);
        e.phase = 'leave'; e.t = 0; e.cupFor = COFFEE.carry; e.done = true;
      }
      break;
    case 'leave':
      e.cupFor = Math.max(0, e.cupFor - dt);
      break;
  }
  return e.phase;
}

// what the body does in each phase
export const ERRAND_ACTION = { walk: 'walk', queue: 'phone', order: 'order', wait: 'phone', collect: 'collect', leave: 'walk' };
