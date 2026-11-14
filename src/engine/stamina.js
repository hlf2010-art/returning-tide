// Stamina: pure, no three.js / DOM. Running spends it; walking and standing give it back. Run
// long enough and the body slows, then runs out: a forced stop to catch your breath, then a
// walk until there is enough back to run again. `breath` (0..1) is how hard you are breathing,
// for the camera, the body and the panting sound; it climbs while running and settles slowly.
export const STAMINA = {
  runTime: 15,          // s of continuous running from full
  regenWalk: 1 / 28,    // per second while walking
  regenIdle: 1 / 11,    // per second while standing
  windedFor: 3.2,       // s of forced stop when it runs out
  runAgainAt: 0.4,      // after running out, no running until this much is back
  tireBelow: 0.3,       // below this the run fades toward a jog
};

export function createStamina() {
  return { level: 1, winded: 0, exhausted: false, breath: 0, runningFor: 0 };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// running: the player is asking to run and actually moving at speed; moving: any movement.
export function updateStamina(s, dt, { running = false, moving = false } = {}) {
  if (dt <= 0) return s;
  const spending = running && moving && !s.exhausted && s.winded <= 0;
  if (spending) {
    s.level -= dt / STAMINA.runTime; s.runningFor += dt;
    if (s.level <= 0) { s.level = 0; s.exhausted = true; s.winded = STAMINA.windedFor; s.runningFor = 0; }
  } else {
    s.runningFor = 0;
    if (s.winded > 0) s.winded = Math.max(0, s.winded - dt);
    // bent over catching your breath recovers like standing; walking is slower to recover
    s.level = clamp01(s.level + dt * (moving && s.winded <= 0 ? STAMINA.regenWalk : STAMINA.regenIdle));
    if (s.exhausted && s.level >= STAMINA.runAgainAt) s.exhausted = false;
  }
  // breathing effort: rises with running and with how spent you are; eases off slowly
  const target = s.winded > 0 ? 1 : spending ? 0.25 + 0.75 * (1 - s.level) : (1 - s.level) * (moving ? 0.8 : 0.65);
  const rate = target > s.breath ? 1.4 : 0.22;
  s.breath += (target - s.breath) * (1 - Math.exp(-rate * dt));
  return s;
}

// The speed this body can manage right now (m/s), given the walk and run speeds.
export function speedCap(s, walk, run) {
  if (s.winded > 0) return 0;                                         // hands on knees
  if (s.exhausted) return walk * (0.75 + 0.25 * smooth(0, STAMINA.runAgainAt, s.level));
  return walk + (run - walk) * (0.55 + 0.45 * smooth(0, STAMINA.tireBelow, s.level));   // a tiring run slows toward a jog
}

// Can the run key do anything right now?
export const canRun = (s) => !s.exhausted && s.winded <= 0;
