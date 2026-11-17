// A bump, in the body. Pure (no three.js), shared by the crowd (engine/crowd.js), the crossing's
// pedestrians (engine/traffic.js) and whoever draws them (world/crowdView.js, world/pedestriansReal.js).
//
// When two people touch, each one flinches: the shoulder that was hit swings back (the torso turns
// a little), they lean back, take a half-step away from the other and to the side, glance at them,
// and then carry on, slower for a moment. About 0.7 s in all.
//
//   startFlinch(p, ox, oz, { hard })   p: { x, z, heading }; (ox, oz): where the other one is
//   stepFlinch(p, dt)                  advances it; returns the half-step's velocity [vx, vz] this
//                                      frame (zero once the step is taken), or null when it's over
//   flinchSpeed(p)                     0..1: how much of their walking pace they have back
//   flinchPose(f)                      for the drawing: torso twist, lean, how far in (0..1), and
//                                      where to glance

export const FLINCH = {
  dur: 0.72,          // s: the whole reaction
  step: 0.2,          // m: the half-step away (a hard knock: up to ~0.3)
  stepFor: 0.32,      // s: the half-step itself
  glance: 0.6,        // s the glance lasts after the body has settled
  twist: 0.42,        // rad: the shoulder swinging back
  lean: 0.13,         // rad: leaning back from the other
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function startFlinch(p, ox, oz, { hard = 0.6 } = {}) {
  let dx = p.x - ox, dz = p.z - oz; const d = Math.hypot(dx, dz);
  const fx = Math.sin(p.heading || 0), fz = Math.cos(p.heading || 0);
  if (d < 1e-4) { dx = -fx; dz = -fz; } else { dx /= d; dz /= d; }
  // which shoulder took it: the other one on my right (+1) or left (-1). (right-hand side: (-fz, fx))
  const side = (-dx * -fz + -dz * fx) >= 0 ? 1 : -1;
  const k = clamp(0.75 + hard * 0.25, 0.75, 1.3);
  // the half-step: away from the other, turned a little toward the free side
  let sx = dx + -fz * -side * 0.35, sz = dz + fx * -side * 0.35; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl;
  p.flinch = { t: 0, dur: FLINCH.dur * (0.9 + 0.15 * k), k, side, sx, sz, step: FLINCH.step * k, at: [ox, oz] };
  return p.flinch;
}

export function stepFlinch(p, dt) {
  const f = p.flinch; if (!f) return null;
  f.t += dt;
  if (f.t > f.dur + FLINCH.glance) { p.flinch = null; return null; }
  if (f.t > FLINCH.stepFor) return [0, 0];
  // a quick step that eases out: v = A cos(pi t / 2T), which covers `step` metres in T
  const A = f.step * Math.PI / (2 * FLINCH.stepFor), v = A * Math.cos(Math.PI * Math.min(f.t, FLINCH.stepFor) / (2 * FLINCH.stepFor));
  return [f.sx * v, f.sz * v];
}

export function flinchSpeed(p) {
  const f = p.flinch; if (!f) return 1;
  if (f.t < FLINCH.stepFor) return 0.15;
  return clamp(0.35 + 0.65 * (f.t - FLINCH.stepFor) / Math.max(0.1, f.dur - FLINCH.stepFor), 0.35, 1);
}

// how far into the flinch the body is: up fast (0.1 s), held through the step, then eased away
export function flinchPose(f) {
  if (!f) return null;
  const t = f.t, up = 0.1, hold = FLINCH.stepFor;
  let e = t < up ? t / up : t < hold ? 1 : Math.max(0, 1 - (t - hold) / Math.max(0.1, f.dur - hold));
  e = e * e * (3 - 2 * e);
  return { k: e, twist: -f.side * FLINCH.twist * f.k * e, lean: FLINCH.lean * f.k * e, look: t < f.dur + FLINCH.glance ? f.at : null };
}
