// Driving the Strale: pure (no three.js, no DOM), node-tested (tests/drive.test.mjs).
// A kinematic bicycle model with the car's own numbers, tuned to feel right rather than simulated:
//   - LP 610-4: 449 kW, 0-100 km/h in about 3.2 s, all-wheel drive; seven-speed dual clutch
//   - steering lock eases off with speed (no 180-degree spins at 100 km/h); the handbrake lets the
//     rear step out a little
//   - brakes: about 1 g from speed; reverse is slow
//   - gears and revs come out of the speed, for the sound (engine/carAudio.js) and the dial
// Collisions are the caller's: blocked(x, z, yaw) says whether the car's body may be there (the road,
// not the kerb, not another car, not a person). A hit stops the car where it was, with a little
// bounce, and reports how hard it was.
export const CAR = {
  wheelbase: 2.62, length: 4.46, width: 1.93,
  maxSteer: 0.62, steerRate: 2.4,
  launch: 9.5, power: 290,          // m/s² from rest; and the power-limited part (a = power / v)
  maxV: 45,                         // the town limit we allow: 162 km/h (the car would do 325)
  brake: 10.5, reverseAccel: 3.0, reverseMax: 6,
  drag: 0.00042, rolling: 0.18,
  gears: [0, 15.5, 23.5, 31, 38, 44, 50, 56],        // top speed in each gear at the limiter (m/s)
  idle: 1000, redline: 8250,
};

export function createDrive({ x = 0, z = 0, yaw = 0 } = {}) {
  return { x, z, yaw, v: 0, steer: 0, gear: 1, rpm: CAR.idle, throttle: 0, braking: false, slip: 0, hit: 0, odo: 0, shiftT: 0 };
}

// input: { throttle 0..1, brake 0..1, steer -1 (left) .. 1 (right), handbrake bool }
// The car's forward is (cos yaw, -sin yaw) in x/z (yaw 0 faces +x, the way it's parked on Hankou Road).
export function stepDrive(s, input, dt, blocked = () => false) {
  const C = CAR, sp = Math.abs(s.v);
  // steering: lock eases off with speed, the wheel takes a moment to turn
  const lock = C.maxSteer / (1 + sp / 11);
  const want = -(input.steer || 0) * lock;                                // + yaw turns left
  s.steer += Math.max(-C.steerRate * dt, Math.min(C.steerRate * dt, want - s.steer));
  // longitudinal
  let a = 0; s.braking = false;
  const thr = input.throttle || 0, brk = input.brake || 0;
  if (thr > 0 && s.v >= -0.3) a += thr * Math.min(C.launch, C.power / Math.max(1, s.v)) * (1 - Math.pow(Math.max(0, s.v) / C.maxV, 4));
  s.stopT = Math.abs(s.v) < 0.02 ? (s.stopT || 0) + dt : 0;
  if (brk > 0) {
    if (s.v > 0) { a -= brk * C.brake; s.braking = true; }
    else if (thr === 0 && (s.stopT > 0.3 || s.v < 0)) a -= brk * C.reverseAccel;   // stopped a moment: S is reverse
  }
  if (thr > 0 && s.v < -0.05) { a += thr * C.brake; s.braking = true; }               // W while rolling back: brakes
  if (input.handbrake) { a -= Math.sign(s.v) * Math.min(6, sp / dt); s.braking = true; }
  a -= Math.sign(s.v) * (C.rolling + C.drag * s.v * s.v);
  const before = s.v;
  s.v += a * dt;
  // brakes and friction bring you to a stop; they never carry you through it into the other direction
  if (before > 0 && s.v < 0 && !(thr > 0)) s.v = 0;
  if (before < 0 && s.v > 0 && !(brk > 0 && thr === 0)) s.v = 0;
  s.v = Math.max(-C.reverseMax, s.v);
  if (thr === 0 && brk === 0 && Math.abs(s.v) < 0.05) s.v = 0;
  // yaw: bicycle model; the handbrake lets the rear come round a bit more
  const rate = (s.v / C.wheelbase) * Math.tan(s.steer) * (input.handbrake && sp > 4 ? 1.35 : 1);
  s.slip = Math.min(1, Math.abs(rate) * sp / 22 + (input.handbrake && sp > 4 ? 0.5 : 0));
  const nyaw = s.yaw + rate * dt, mid = (s.yaw + nyaw) / 2;
  const nx = s.x + Math.cos(mid) * s.v * dt, nz = s.z - Math.sin(mid) * s.v * dt;
  s.hit = 0;
  if (blocked(nx, nz, nyaw)) {
    s.hit = Math.abs(s.v);
    s.v = -s.v * 0.18;                                                     // a knock back, then stopped
    if (Math.abs(s.v) < 0.4) s.v = 0;
  } else { s.odo += Math.hypot(nx - s.x, nz - s.z) * Math.sign(s.v || 1); s.x = nx; s.z = nz; s.yaw = nyaw; }
  // gearbox: up at the redline, down when the revs sag; the revs follow the gear
  s.shiftT = Math.max(0, s.shiftT - dt);
  const vf = Math.max(0, s.v), G = C.gears;
  if (s.v < -0.3) s.gear = -1;
  else {
    if (s.gear < 1) s.gear = 1;
    const up = vf > G[s.gear] * 0.97 && s.gear < G.length - 1, down = s.gear > 1 && vf < G[s.gear - 1] * 0.62;
    if (up) { s.gear++; s.shiftT = 0.12; } else if (down) { s.gear--; s.shiftT = 0.1; }
  }
  const top = s.gear < 0 ? 12 : G[s.gear];
  const loaded = C.idle + (Math.abs(s.v) / top) * (C.redline - C.idle);
  s.rpm += ((s.v === 0 ? C.idle + thr * 5200 : loaded) - s.rpm) * Math.min(1, dt * 9);
  s.throttle = thr;
  return s;
}

// the car's footprint at a pose: corners and side midpoints (for the road / kerb test)
export function footprint(x, z, yaw, inset = 0) {
  const hl = CAR.length / 2 - inset, hw = CAR.width / 2 - inset, c = Math.cos(yaw), sn = Math.sin(yaw);
  const pt = (f, l) => [x + c * f - sn * l, z - sn * f - c * l];             // f along the nose, l to the left
  return [pt(hl, hw), pt(hl, -hw), pt(-hl, hw), pt(-hl, -hw), pt(0, hw), pt(0, -hw), pt(hl, 0), pt(-hl, 0)];
}
export const kmh = (v) => Math.round(Math.abs(v) * 3.6);
