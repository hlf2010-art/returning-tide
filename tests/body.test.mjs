// Stamina, head motion and wind on the trees: pure models, run in node (npm test).
import { createStamina, updateStamina, speedCap, canRun, STAMINA } from '../src/engine/stamina.js';
import { createHeadMotion, updateHead, cadence } from '../src/engine/headMotion.js';
import { windOffset, createWind, WIND_LEVELS } from '../src/world/wind.js';
import { WALK_SPEED, RUN_SPEED } from '../src/engine/movement.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const DT = 1 / 60;

// ---- stamina ----
{
  const s = createStamina(); let t = 0, slowedAt = null;
  while (!s.exhausted && t < 60) {
    updateStamina(s, DT, { running: true, moving: true }); t += DT;
    if (slowedAt == null && speedCap(s, WALK_SPEED, RUN_SPEED) < RUN_SPEED * 0.97) slowedAt = t;
  }
  ok(Math.abs(t - STAMINA.runTime) < 0.2, `running flat out runs out after ~${STAMINA.runTime} s (${t.toFixed(1)} s)`);
  ok(slowedAt != null && slowedAt < t - 2, `the run slows before it gives out (from ${slowedAt && slowedAt.toFixed(1)} s)`);
  ok(s.winded > 0 && speedCap(s, WALK_SPEED, RUN_SPEED) === 0 && !canRun(s), 'out of breath: a forced stop, no running');
  ok(s.breath > 0.6, `breathing hard when it runs out (${s.breath.toFixed(2)})`);
  // keep holding run: still stopped for the whole winded spell, then a slow walk, no run
  let stopped = 0; while (s.winded > 0) { updateStamina(s, DT, { running: true, moving: false }); stopped += DT; }
  ok(Math.abs(stopped - STAMINA.windedFor) < 0.1, `catches breath for ${STAMINA.windedFor} s even with the run key held`);
  const cap = speedCap(s, WALK_SPEED, RUN_SPEED);
  ok(!canRun(s) && cap > 0 && cap <= WALK_SPEED, `then can walk (cap ${cap.toFixed(2)}) but not run`);
  let back = 0; while (!canRun(s) && back < 60) { updateStamina(s, DT, { running: true, moving: true }); back += DT; }
  ok(canRun(s) && back > 3 && back < 20, `able to run again after ${back.toFixed(1)} s of walking`);
  const r = createStamina(); r.level = 0.2;
  let idle = 0; while (r.level < 0.99) { updateStamina(r, DT, { moving: false }); idle += DT; }
  const w = createStamina(); w.level = 0.2;
  let walking = 0; while (w.level < 0.99) { updateStamina(w, DT, { moving: true }); walking += DT; }
  ok(idle < walking, `standing recovers faster than walking (${idle.toFixed(1)} s vs ${walking.toFixed(1)} s)`);
  // short sprints with rests never run out
  const q = createStamina(); let out = false;
  for (let k = 0; k < 10; k++) {
    for (let i = 0; i < 5 / DT; i++) updateStamina(q, DT, { running: true, moving: true });
    for (let i = 0; i < 8 / DT; i++) updateStamina(q, DT, { moving: false });
    out = out || q.exhausted;
  }
  ok(!out, '5 s sprints with 8 s rests never exhaust');
  const b = createStamina(); for (let i = 0; i < 30 / DT; i++) updateStamina(b, DT, { moving: true });
  ok(b.breath < 0.05 && b.level === 1, 'walking at full stamina: calm breathing');
}

// ---- head motion ----
{
  const run = (speed, secs, extra = {}) => {
    const h = createHeadMotion(); let stride = 0, minY = 1, maxY = -1, minX = 1, maxX = -1, maxRoll = 0;
    for (let i = 0; i < secs / DT; i++) {
      stride += cadence(speed) * DT;
      updateHead(h, DT, { stride, speed, walk: WALK_SPEED, run: RUN_SPEED, lateral: 0, forwardAccel: 0, yawRate: 0, impact: 0, breath: 0, winded: false, air: false, ...extra });
      if (i > 2 / DT) { minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y); minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x); maxRoll = Math.max(maxRoll, Math.abs(h.rollOut)); }
    }
    return { bob: maxY - minY, sway: maxX - minX, roll: maxRoll, h };
  };
  const still = run(0, 4), walk = run(WALK_SPEED, 4), sprint = run(RUN_SPEED, 4);
  ok(still.bob < 0.01 && still.sway < 0.012, `standing: barely moving (${still.bob.toFixed(3)} m)`);
  ok(walk.bob > 0.035 && walk.bob < 0.07, `walking bob ${walk.bob.toFixed(3)} m`);
  ok(sprint.bob > walk.bob * 1.5 && sprint.sway > walk.sway, `running bobs and sways more (${sprint.bob.toFixed(3)} / ${sprint.sway.toFixed(3)} m)`);
  ok(walk.roll > 0.002 && walk.roll < 0.02, `a little roll with each step (${walk.roll.toFixed(4)} rad)`);
  ok(cadence(WALK_SPEED) > 1.6 && cadence(WALK_SPEED) < 2.2 && cadence(RUN_SPEED) > 2.6 && cadence(RUN_SPEED) < 3.4, 'step cadence: ~1.9/s walking, ~3/s running');
  // landing: a dip that springs back
  const h = createHeadMotion(); let min = 0;
  updateHead(h, DT, { stride: 0, speed: 0, walk: WALK_SPEED, run: RUN_SPEED, lateral: 0, forwardAccel: 0, yawRate: 0, impact: 3.3, breath: 0, winded: false, air: false });
  for (let i = 0; i < 60; i++) { updateHead(h, DT, { stride: 0, speed: 0, walk: WALK_SPEED, run: RUN_SPEED, lateral: 0, forwardAccel: 0, yawRate: 0, impact: 0, breath: 0, winded: false, air: false }); min = Math.min(min, h.dip); }
  ok(min < -0.03 && Math.abs(h.dip) < 0.005, `landing dips the head (${min.toFixed(3)} m) and recovers`);
  // braking nods forward, strafing leans
  const brake = run(0, 1, { forwardAccel: -6 }), strafe = run(WALK_SPEED, 2, { lateral: 2 });
  ok(brake.h.pitch < -0.015, `braking nods the head forward (${brake.h.pitch.toFixed(3)} rad)`);
  ok(strafe.h.roll < -0.005, `strafing right leans into it (${strafe.h.roll.toFixed(3)} rad)`);
  const tired = run(0, 4, { breath: 1 });
  ok(tired.bob > still.bob * 3, `heavy breathing moves the head (${tired.bob.toFixed(3)} vs ${still.bob.toFixed(3)} m)`);
  const bent = run(0, 3, { winded: true, breath: 1 });
  ok(bent.h.pitch < -0.4 && bent.h.y < -0.2, 'winded: bent over, looking down');
}

// ---- wind ----
{
  const base = [-46, 0.15, 5.2, 8.4], dir = [-0.848, 0.53];
  const series = (p, br, leaf, W, rain = 0, secs = 30) => { const out = []; for (let t = 0; t < secs; t += 0.05) out.push(windOffset(p, base, br, leaf, t, W, dir, rain)); return out; };
  const range = (s) => { const m = s.map((o) => Math.hypot(...o)); return Math.max(...m) - Math.min(...m); };
  const top = [-46, 8, 5.2], foot = [-46, 0.15, 5.2];
  ok(range(series(foot, [0, 0, 0, 0], [0, 0], 1)) < 1e-9, 'the foot of the trunk never moves');
  const trunk = series(top, [0, 0, 0, 0], [0, 0], 0.35), limb = series(top, [0.3, 0, 1, 0], [0, 0], 0.35);
  const twig = series(top, [0.3, 0.7, 1, 1], [0, 0], 0.35), leaf = series(top, [0.3, 0.7, 1, 1], [0.6, 0.4], 0.35);
  ok(range(trunk) < range(limb) && range(limb) < range(twig) && range(twig) < range(leaf), `motion grows down the hierarchy: trunk ${range(trunk).toFixed(3)} < limb ${range(limb).toFixed(3)} < branch ${range(twig).toFixed(3)} < leaf ${range(leaf).toFixed(3)} m`);
  // branches move independently: two limbs of the same tree, different phases
  const a = series(top, [0.1, 0.2, 1, 1], [0, 0], 0.5).map((o) => o[1]), b = series(top, [0.6, 0.85, 1, 1], [0, 0], 0.5).map((o) => o[1]);
  const mean = (x) => x.reduce((s, v) => s + v, 0) / x.length, ma = mean(a), mb = mean(b);
  const corr = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
  ok(Math.abs(corr) < 0.6, `two branches don't move in step (correlation ${corr.toFixed(2)})`);
  // stronger wind, more movement, at every level
  const levels = Object.values(WIND_LEVELS).map((W) => range(series(top, [0.3, 0.7, 1, 1], [0.6, 0.4], W)));
  ok(levels.every((v, i) => i === 0 || v > levels[i - 1] * 1.3), `calm < breeze < windy < gale (${levels.map((v) => v.toFixed(3)).join(' < ')} m)`);
  const calmTrunk = range(series(top, [0, 0, 0, 0], [0, 0], WIND_LEVELS.calm)), galeTrunk = range(series(top, [0, 0, 0, 0], [0, 0], WIND_LEVELS.gale));
  ok(galeTrunk > calmTrunk * 10 && galeTrunk < 0.6, `even the trunk sways in a gale (${galeTrunk.toFixed(3)} m at the crown), but stays a tree`);
  // neighbouring trees don't move in step (travelling gusts)
  const t2 = [-72, 0.15, -5.2, 8.4];
  const s1 = series(top, [0, 0, 0, 0], [0, 0], 0.8, 0, 60).map((o) => o[0]);
  const s2 = []; for (let t = 0; t < 60; t += 0.05) s2.push(windOffset([-72, 8, -5.2], t2, [0, 0, 0, 0], [0, 0], t, 0.8, dir, 0)[0]);
  const m1 = mean(s1), m2 = mean(s2);
  const c2 = s1.reduce((s, v, i) => s + (v - m1) * (s2[i] - m2), 0) / Math.sqrt(s1.reduce((s, v) => s + (v - m1) ** 2, 0) * s2.reduce((s, v) => s + (v - m2) ** 2, 0));
  ok(c2 < 0.9, `two trees 26 m apart sway differently (correlation ${c2.toFixed(2)})`);
  // rain: leaves weighed down and knocked by drops
  const dry = series(top, [0.3, 0.7, 1, 1], [0.6, 0.4], 0.35, 0), wet = series(top, [0.3, 0.7, 1, 1], [0.6, 0.4], 0.35, 1);
  ok(mean(wet.map((o) => o[1])) < mean(dry.map((o) => o[1])) - 0.02, 'rain weighs the leaves down');
  ok(range(wet) > range(dry), 'raindrops knock the leaves about');
  // the weather's wind: rises with rain, eased, overridable
  const w = createWind(); for (let i = 0; i < 20 / DT; i++) w.update(DT, 0);
  const dryW = w.level; for (let i = 0; i < 20 / DT; i++) w.update(DT, 1);
  ok(Math.abs(dryW - WIND_LEVELS.breeze) < 0.01 && w.level > dryW + 0.25, `breeze ${dryW.toFixed(2)} picks up in the drizzle (${w.level.toFixed(2)})`);
  w.setOverride('gale'); const before = w.level; w.update(DT, 1);
  ok(w.level - before < 0.02, 'wind changes ease in, never jump');
  for (let i = 0; i < 20 / DT; i++) w.update(DT, 1);
  ok(Math.abs(w.level - WIND_LEVELS.gale) < 0.01, 'override pins the wind');
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
