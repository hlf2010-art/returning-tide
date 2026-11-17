// Line 2's sound rules (engine/metroAudio.js); the graph itself needs Web Audio, so here only the
// pure helpers and that every method is a safe no-op without a context.
import { motorPitch, motorLevel, trainLevel, pistonLevel, squealLevel, jointInterval, impulseSpec, chimeTimes, escalatorLevel, airCut, JOINT_SPACING, createMetroAudio } from '../src/engine/metroAudio.js';

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const range = (lo, hi, step) => { const r = []; for (let x = lo; x <= hi + 1e-9; x += step) r.push(x); return r; };

// the inverter whine
const accel = range(0, 30, 0.05).map((v) => motorPitch(v, 1));
ok(accel.every((p) => Number.isFinite(p) && p >= 150 && p <= 1500), `whine stays in 150..1500 Hz (${Math.min(...accel).toFixed(0)}..${Math.max(...accel).toFixed(0)})`);
const low = range(0, 4.95, 0.05).map((v) => motorPitch(v, 1)), steps = new Set(low.map((p) => p.toFixed(3)));
ok(steps.size >= 6 && steps.size <= 12 && low.every((p, i) => i === 0 || p >= low[i - 1]), `pulling away: the carrier climbs in ${steps.size} discrete musical steps`);
ok(Math.abs(Math.log2(motorPitch(4.9, 1) / motorPitch(0, 1)) * 12 - 14) < 1e-6, 'the steps span a major ninth');
let drops = 0; for (let i = 1; i < accel.length; i++) if (accel[i] < accel[i - 1] * 0.9) drops++;
ok(drops >= 3, `above that, synchronous-mode sweeps that rise then drop (${drops} drops)`);
let falling = true; for (let v = 0.5; v <= 25; v += 0.5) if (motorPitch(v, -1) <= motorPitch(v - 0.5, -1)) falling = false;
ok(falling && motorPitch(1, -1) < motorPitch(20, -1), 'braking: one smooth whine, falling as the train slows');
ok(motorLevel(0, 0) === 0 && motorLevel(10, 1) > motorLevel(10, 0) && motorLevel(10, 0) > 0 && motorLevel(10, -1) > motorLevel(10, 0), 'whine: silent at rest, loud under power or braking, faint coasting');
ok(motorLevel(0, 1) > 0.5 && range(0, 30, 0.5).every((v) => motorLevel(v, 1.5) <= 1 && motorLevel(v, -1.5) >= 0), 'whine starts with the first pull; level within 0..1');

// roar, piston wind, squeal
let mono = true;
for (let d = 0; d < 400; d += 5) if (trainLevel(d + 5, 15) > trainLevel(d, 15)) mono = false;
for (let v = 0; v < 25; v += 1) if (trainLevel(30, v + 1) < trainLevel(30, v)) mono = false;
ok(mono, 'roar: quieter with distance, louder with speed');
ok(trainLevel(0, 25) === 1 && trainLevel(15, 22) === 1 && trainLevel(150, 22) <= 0.1 + 1e-9 && trainLevel(10, 0) > 0 && trainLevel(1e6, 25) < 0.001, 'roar: 0..1, inverse distance from 15 m, a standing train still hums');
ok(pistonLevel(200, 20) === 0 && pistonLevel(100, 20) < pistonLevel(30, 20) && pistonLevel(30, 20) <= 1 && pistonLevel(30, 0) === 0, 'piston wind builds inside ~150 m, only from a moving train');
ok(squealLevel(3, -1) > 0 && squealLevel(3, 0.5) === 0 && squealLevel(10, -1) === 0 && squealLevel(0, -1) === 0 && squealLevel(1, -1) > squealLevel(5, -1), 'brake squeal: braking below 6 m/s, stronger near the end, gone at rest');
ok(airCut(5) > airCut(50) && airCut(50) > airCut(300) && airCut(1e5) >= 350, 'distance dulls the top end');
ok(escalatorLevel(Infinity) === 0 && escalatorLevel(12) === 0 && escalatorLevel(1) === 1 && escalatorLevel(3) > escalatorLevel(8), 'escalator: within ~10 m, louder close up');

// rail joints
ok(jointInterval(0) === Infinity && jointInterval(2) === Infinity && Math.abs(jointInterval(12.5) - 2) < 1e-9 && jointInterval(20) < jointInterval(10), `joints every ${JOINT_SPACING} m: none below 2 m/s, closer together with speed`);

// reverbs
const [c, p, k, n] = ['concourse', 'platform', 'car', null].map(impulseSpec);
ok(p.seconds > c.seconds && c.seconds > k.seconds && Math.abs(c.seconds - 1.6) < 0.2 && Math.abs(p.seconds - 2.2) < 0.2 && k.seconds < 0.5, 'reverb lengths: platform > concourse > car');
ok([c, p, k].every((s) => s.bright > 0 && s.bright <= 1 && s.decay > 0 && s.wet > 0 && s.early.length > 0) && p.bright > c.bright && c.bright > k.bright, 'tiled platform brightest, the car duller');
ok(n.wet === 0 && n.seconds === 0 && impulseSpec('street').wet === 0, 'no space, no reverb');

// door chime
const ct = chimeTimes();
ok(ct.length === 7 && ct[0] === 0 && ct.every((x, i) => i === 0 || x > ct[i - 1]) && ct[6] > 2 && ct[6] < 3.2, `door chime: 7 beeps over ~3 s (${ct.join(', ')})`);

// without Web Audio, everything is a no-op
const methods = (m) => {
  m.update(0.016, { under: 1, space: 'platform', escalator: 4, trains: [{ d: 40, v: 20, a: -1, side: 0.5 }], car: { v: 10, a: 0.5 }, crowd: 0.5 });
  m.update(0.016); m.update(0.016, null); m.gate(); m.gateFlap(); m.denied(); m.xray(); m.doorChime(); m.doors(true); m.doors(false); m.arrivalTone(); m.dispose(); m.update(0.016, {}); m.gate();
};
let threw = null;
try {
  methods(createMetroAudio({ getContext: () => null, getMaster: () => null }));
  methods(createMetroAudio({}));
} catch (e) { threw = e; }
ok(!threw, `no context: every method is a safe no-op${threw ? ` (${threw.message})` : ''}`);
const m = createMetroAudio({ getContext: () => null, getMaster: () => null });
ok(m.stats && m.stats.builds === 0 && typeof m.stats.gate === 'number', 'stats exposed; nothing built without a context');

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
