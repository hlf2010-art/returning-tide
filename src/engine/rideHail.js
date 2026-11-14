// A ride-hail pickup (滴滴), from the passenger's side: pure, node-tested. No three.js / DOM.
//
// Waiting at a pickup point is a sequence everyone in Shanghai knows:
//   request   tap the app; wait for a driver to accept (a few seconds)
//   waiting   phone in hand, checking the map; looking up the street now and then; the ETA ticks
//             down (and sometimes jumps up: the driver missed a turn). The longer it takes past
//             the first ETA, the more impatient they get (glancing more, pacing, a sigh, a call).
//   message   a quick text to the driver: where exactly they are, what they're wearing
//   spotting  the car is close: they look for it, compare plates, step to the kerb edge, move a
//             few metres along to where it will stop, maybe a small wave
//   boarding  the car stops: walk to the rear door, open it, get in, door shuts
//   gone      the car pulls away with them
//
// The car itself is driven by the traffic sim; this only needs to know how far away it is (m)
// and whether it has stopped at the kerb.
export const RIDE = {
  acceptMin: 3, acceptMax: 12,     // s for a driver to accept
  etaMin: 40, etaMax: 150,         // s first quoted
  slipChance: 0.35,                // chance the ETA slips once
  spotAt: 60,                      // m: close enough to start looking for the car
  glanceEvery: [9, 3],             // s between looks up the street: calm .. impatient
  boardTime: 3.2,                  // s from opening the door to the door shutting
};

const lerp = (a, b, t) => a + (b - a) * t;

// who: { id, plate, color, model } of the assigned car comes in on accept
export function createRide(rnd = Math.random, opts = {}) {
  const R = { ...RIDE, ...opts };
  return {
    phase: 'request', t: 0, accept: lerp(R.acceptMin, R.acceptMax, rnd()), eta: 0, quoted: 0, slipped: false,
    impatience: 0, glance: 4, looking: 0, messaged: false, plateChecked: false, waved: false, board: 0,
    events: [], rnd, R,
  };
}

// car: { dist (m along the road to the pickup), stopped (at this kerb) } or null before it exists
export function stepRide(s, dt, car = null) {
  const R = s.R, ev = (e) => s.events.push(e);
  s.t += dt;
  s.looking = Math.max(0, s.looking - dt);
  switch (s.phase) {
    case 'request':
      if (s.t >= s.accept) { s.phase = 'waiting'; s.quoted = s.eta = lerp(R.etaMin, R.etaMax, s.rnd()); ev('accepted'); }
      break;
    case 'waiting': {
      s.eta = Math.max(0, s.eta - dt);
      // the ETA slips once in a while (wrong turn, a red light, a one-way street)
      if (!s.slipped && s.eta < s.quoted * 0.5 && s.rnd() < R.slipChance * dt / (s.quoted * 0.5)) { s.slipped = true; s.eta += 30 + s.rnd() * 60; ev('eta-slipped'); }
      const late = Math.max(0, (s.t - s.accept) - s.quoted);
      s.impatience = Math.min(1, (s.slipped ? 0.25 : 0) + late / 90);
      if (!s.messaged && s.t - s.accept > 8) { s.messaged = true; ev('message'); }
      s.glance -= dt;
      if (s.glance <= 0) { s.looking = 1.6; s.glance = lerp(R.glanceEvery[0], R.glanceEvery[1], s.impatience) * (0.7 + s.rnd() * 0.6); ev('glance'); }
      if (s.impatience > 0.6 && !s.called) { s.called = true; ev('call'); }
      if (car && car.dist < R.spotAt) { s.phase = 'spotting'; ev('spotting'); }
      break;
    }
    case 'spotting':
      s.looking = 1;
      if (!s.plateChecked && car && car.dist < R.spotAt * 0.5) { s.plateChecked = true; ev('plate'); }
      if (!s.waved && car && car.dist < 18) { s.waved = true; ev('wave'); }
      if (car && car.stopped) { s.phase = 'boarding'; s.board = 0; ev('boarding'); }
      break;
    case 'boarding':
      s.board += dt;
      if (s.board > R.boardTime) { s.phase = 'gone'; ev('gone'); }
      break;
  }
  return s;
}

// What the passenger's body is doing right now, for the animation layer.
export function rideAction(s) {
  switch (s.phase) {
    case 'request': return 'phone';
    case 'waiting': return s.looking > 0 ? 'lookStreet' : s.impatience > 0.6 && s.called ? 'call' : 'phone';
    case 'spotting': return 'lookStreet';
    case 'boarding': return s.board < 1.2 ? 'toDoor' : 'enter';
    default: return 'none';
  }
}
