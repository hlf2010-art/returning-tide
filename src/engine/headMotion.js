// Head motion for the first-person camera: pure, no three.js / DOM, so it can be tested in Node.
// Everything here is an offset added to the eye: the stride bob and the side-to-side weight shift
// of each step, a lean into strafes and turns, a nod when braking, a spring-damped dip on landing,
// breathing that deepens with effort, and the bend of catching your breath after running out.
export const HEAD = {
  bobWalk: 0.024, bobRun: 0.05,        // m, vertical, one cycle per step
  swayWalk: 0.016, swayRun: 0.026,     // m, sideways, one cycle per two steps
  stepRoll: 0.32,                      // rad of roll per metre of sway
  strafeRoll: 0.006,                   // rad per m/s of sideways speed
  turnRoll: 0.0035,                    // rad per rad/s of turning while moving
  brakeNod: 0.0045,                    // rad per m/s² of forward acceleration
  landKick: 0.22,                      // m/s of dip velocity per m/s of landing speed
  bendDrop: 0.3, bendPitch: 0.75, bendFwd: 0.2,   // winded: hands-on-knees (with a body, the eye follows its head instead)
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));

// steps per second at a given speed (m/s): ~1.9 at a brisk walk, ~3 at a run
export const cadence = (speed) => (speed > 0.05 ? 1.0 + 0.4 * speed : 0);

export function createHeadMotion() {
  return {
    t: 0, bob: 0, runK: 0, dip: 0, dipV: 0, nod: 0, roll: 0, breathPhase: 0, bend: 0,
    // outputs (metres / radians, in the view's frame: x right, y up, z forward)
    x: 0, y: 0, z: 0, pitch: 0, rollOut: 0,
  };
}

// s: { stride, speed, walk, run, lateral, forwardAccel, yawRate, impact, breath, winded, air }
export function updateHead(h, dt, s) {
  if (dt <= 0) return h;
  h.t += dt;
  const moving = s.air ? 0 : clamp(s.speed / s.walk, 0, 1);
  h.bob = ease(h.bob, moving, 8, dt);
  h.runK = ease(h.runK, smooth(s.walk, s.run, s.speed), 5, dt);
  const ampY = HEAD.bobWalk + (HEAD.bobRun - HEAD.bobWalk) * h.runK;
  const ampX = HEAD.swayWalk + (HEAD.swayRun - HEAD.swayWalk) * h.runK;
  const twoPi = Math.PI * 2;
  // footfall where the bob bottoms out (stride ≡ 0.75); the weight is over that foot at the time
  const bobY = Math.sin(s.stride * twoPi) * ampY * h.bob;
  const swayX = Math.sin((s.stride - 0.75) * Math.PI + Math.PI / 2) * ampX * h.bob;

  // landing: a damped spring kicked downward by the landing speed
  if (s.impact > 0) h.dipV -= Math.min(s.impact, 7) * HEAD.landKick;
  const k = 90, c = 12;                                    // ~1.5 Hz, a little under critically damped
  h.dipV += (-k * h.dip - c * h.dipV) * dt; h.dip += h.dipV * dt;
  h.dip = clamp(h.dip, -0.14, 0.05);

  // the head lags acceleration: tips back speeding up, nods forward braking
  h.nod = ease(h.nod, clamp(s.forwardAccel * HEAD.brakeNod, -0.035, 0.035), 6, dt);
  // lean into strafes and turns, plus the roll of each step's weight shift
  const lean = -s.lateral * HEAD.strafeRoll - clamp(s.yawRate, -4, 4) * HEAD.turnRoll * moving;
  h.roll = ease(h.roll, lean, 5, dt);

  // breathing: slow and shallow at rest, fast and deep when spent
  const rate = 0.24 + 0.75 * s.breath;                                  // breaths per second
  h.breathPhase += rate * dt * twoPi;
  const breathAmp = 0.003 + 0.026 * s.breath * s.breath;               // up to ~3 cm when spent: you see it
  // with the recording playing (engine/audio.js breathEnvelope), rise on each breath you hear
  if (s.breathEnv != null) h.env = ease(h.env ?? 0, s.breathEnv, 14, dt);
  const breathe = s.breathEnv != null ? (h.env ?? 0) * 2 - 1 : Math.sin(h.breathPhase);

  // winded: bend over, hands toward knees; eases in quicker than it eases out
  h.bend = ease(h.bend, s.winded ? 1 : 0, s.winded ? 2.6 : 1.3, dt);
  const bend = smooth(0, 1, h.bend);

  // a little weight-shifting when standing still
  const idle = (1 - h.bob) * (Math.sin(h.t * 0.53) * 0.6 + Math.sin(h.t * 0.31 + 1.7) * 0.4);

  h.x = swayX + idle * 0.005;
  h.y = bobY + h.dip + breathe * breathAmp - bend * HEAD.bendDrop;
  h.z = bend * HEAD.bendFwd;
  h.pitch = h.nod + breathe * breathAmp * 0.9 - bend * HEAD.bendPitch;
  h.rollOut = h.roll + swayX * HEAD.stepRoll + idle * 0.002;
  return h;
}
