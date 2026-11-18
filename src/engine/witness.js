// Seeing something happen, as a choice the player makes with their eyes (Mission One's courier).
//
// The rule, borrowed as logic from a short we studied: attention is spent, not prompted. Nothing on
// screen says "look": the man who left the pouch on Zhou's counter walks off as you come up Hankou
// Road, and only if you turn from what you came for (the pouch, straight ahead) and keep him in
// view, close enough to make out what he carries, does Ji Bai remember him. Later that memory is an
// answer he can give Zhou's daughter (world/career.js). Missing him costs nothing but that answer;
// a thought afterwards (missionOne.js) says someone walked off, so a second playthrough knows.
//
// Pure (no three.js): main.js decides each frame whether he is seen (engine/targeting.js pickTarget:
// within WITNESS.reach, inside the WITNESS.cone, not hidden behind a wall or a person, phone down).

export const WITNESS = {
  reach: 12,      // m: near enough to make out a cap and the printing on a paper bag
  cone: 0.93,     // cos of ~22°: looked at, not just somewhere on screen
  need: 1.2,      // s of looking, added up (glances count; a single frame does not)
  trigger: 22,    // m from the stall when he sets off (you are on Hankou Road and coming)
};

// accumulate looking time; true once (on the frame the memory is made)
export function createWitness(need = WITNESS.need) {
  let seen = 0, done = false;
  return {
    step(dt, looking) {
      if (done || !looking || !(dt > 0)) return false;
      seen += Math.min(dt, 0.1);                       // a long frame is not a long look
      if (seen >= need) { done = true; return true; }
      return false;
    },
    reset() { seen = 0; done = false; },
    get seen() { return seen; },
    get done() { return done; },
  };
}

// The courier's walk, from the counter to the corner of the Bund, on Hankou Road's pavements
// (x east, z south; the north pavement is z -6.5..-4, the road -4..4, the south pavement 4..6.5).
// He leaves the way that keeps his back to the stall and his face from you: across to the south
// side, then east past you toward Zhongshan Road, and round the corner out of sight. Coming up the
// north pavement with your eyes on the counter, he crosses your view at the edge and passes on the
// other side of the road: seeing him means turning your head.
export function courierRoute(stall) {
  return {
    wait: [stall.x + 0.9, stall.z + 1.0],              // at the counter, facing it (north)
    speed: 1.4,
    pts: [
      [stall.x + 2.6, -4.2],                           // to the kerb
      [stall.x + 9.0, 4.9],                            // across, on the diagonal
      [-32.0, 5.2],                                    // east along the south pavement
      [-30.8, 14.0],                                   // round the corner onto Zhongshan Road's pavement: gone
    ],
  };
}

// where he is after `t` seconds of walking (pure, for tests and for the scene): { x, z, heading, done }
export function courierAt(route, t) {
  let [x, z] = route.wait, left = Math.max(0, t) * route.speed;
  for (const [px, pz] of route.pts) {
    const dx = px - x, dz = pz - z, d = Math.hypot(dx, dz);
    if (left <= d) { const f = d ? left / d : 0; return { x: x + dx * f, z: z + dz * f, heading: Math.atan2(dx, dz), done: false }; }
    left -= d; x = px; z = pz;
  }
  const n = route.pts.length, a = route.pts[n - 2], b = route.pts[n - 1];
  return { x, z, heading: Math.atan2(b[0] - a[0], b[1] - a[1]), done: true };
}
