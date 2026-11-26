// Stamina: pure, no three.js / DOM. Running spends it; walking and standing give it back. Run
// long enough and the body slows, then runs out: a forced stop to catch your breath, then a
// walk until there is enough back to run again. `breath` (0..1) is how hard you are breathing,
// for the camera, the body and the panting sound; it climbs while running and settles slowly.
// Tuned for getting about a city, not a sprint race: a long hurry, quick to come back (the HUD shows
// it as a slim bar while you run or recover).
export const STAMINA = {
  runTime: 45,          // s of continuous running from full
  regenWalk: 1 / 18,    // per second while walking (empty to full in 18 s)
  regenIdle: 1 / 7,     // per second while standing
  windedFor: 3.0,       // s of forced stop when it runs out (hands on knees, panting)
  runAgainAt: 0.6,      // after running out, no running until this much is back (a few seconds of walking it off)
  tireBelow: 0.2,       // below this the run fades toward a jog
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
  // (fresh, a run is light breathing; it gets heavy only as you tire)
  const spent = 1 - s.level;
  // run out, he keeps panting while he gets it back: heavy until about half is back, then easing
  const target = s.winded > 0 ? 1 : spending ? 0.1 + 0.85 * spent ** 1.5
    : s.exhausted ? 0.45 + 0.5 * (1 - s.level / STAMINA.runAgainAt) : spent * (moving ? 0.7 : 0.55);
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
