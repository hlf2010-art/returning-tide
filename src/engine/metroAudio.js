// Shanghai Metro Line 2, synthesised (no recordings): everything heard below the street between
// East Nanjing Road and Lujiazui.
//   station bed   air handling (low-passed noise, slowly drifting), a faint 50/100/150 Hz transformer
//                 and tube hum, and every 30-90 s another line's train rumbling far off. Scaled by
//                 `under`; the platform is a little louder and boomier than the concourse.
//   escalator     a low motor hum and the step chain ticking, within ~10 m.
//   other trains  the two nearest, on persistent voices: piston wind pushed ahead in the tunnel,
//                 wheel/rail roar rising with speed and dulled by distance, the VVVF inverter's whine
//                 (a stepped "musical" carrier when pulling away, synchronous-mode sweeps above that,
//                 one smooth falling whine when braking, faint when coasting), brake squeal in the
//                 last metres and the air brake's psshh as it stops.
//   riding        interior rumble, tunnel roar, the motors muffled through the floor, rail-joint
//                 "da-dum" pairs (one bogie's two axles) every 25 m.
//   one-shots     the gate's 嘀 and its flaps, the refusal, the X-ray belt, the door-closing beeps,
//                 the doors themselves, the platform's do-la-fa arrival chime.
//   space         a reverb per space (concourse hall, long tiled platform, small metal car) from
//                 generated impulses; a new convolver fades in and the old one out on each change.
//
//   [bed, escalator, train voices, car, one-shots] ─┬────────────────────────> out -> audio master
//                                                    └─> send -> convolver(space) -> wet ─┘
// Built lazily (the AudioContext exists only after the first gesture); every call is a no-op before
// that, and in node.

// ---- pure helpers (unit-tested in node) ----
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const JOINT_SPACING = 25;                 // m between rail joints
const BOGIE = 2.5;                               // m between a bogie's two axles: the gap in "da-dum"
export const MOTOR_HZ_PER_MS = 5.2;              // traction motor electrical frequency per m/s
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14];    // the carrier's steps while pulling away (semitones)
const STEP_TOP = 5;                              // m/s where the stepped carrier hands over
const SYNC = [[7.5, 15], [10.5, 9], [15, 5]];    // synchronous modes: [up to m/s, pulses]; then one-pulse
// Hz of the main inverter whine partial
export function motorPitch(v, a = 0) {
  v = clamp(+v || 0, 0, 30);
  if (a < -0.1) return 240 + 30 * v;             // regenerative braking: one long falling whine
  if (v < STEP_TOP) return 330 * Math.pow(2, SCALE[Math.min(SCALE.length - 1, Math.floor((v / STEP_TOP) * SCALE.length))] / 12);
  const fm = MOTOR_HZ_PER_MS * v;
  for (const [top, n] of SYNC) if (v < top) return fm * n;   // rises, then drops at each mode change
  return fm * 3;
}
// how loud the whine is, 0..1: tractive effort, not speed; faint when coasting, nothing at rest
export function motorLevel(v, a = 0) {
  v = Math.max(0, +v || 0); a = +a || 0;
  const start = a > 0.05 ? 1 : clamp(v / 0.5);
  return clamp((0.12 + 0.88 * clamp(Math.abs(a) / 0.9)) * start * (1 - 0.35 * clamp((v - 15) / 10)));
}
// wheel/rail roar, 0..1: inverse distance (ref 15 m) times a speed term (a standing train still hums)
export const trainLevel = (d, v) => clamp((15 / Math.max(15, +d || 0)) * (0.18 + 0.82 * Math.pow(clamp((+v || 0) / 22), 1.2)));
// the air pushed ahead of a train in the tunnel, 0..1, from ~150 m out
export const pistonLevel = (d, v) => Math.pow(clamp(1 - (+d || 0) / 150), 1.6) * clamp((+v || 0) / 10);
// brake squeal, 0..1: braking hard below 6 m/s, gone at a standstill
export const squealLevel = (v, a) => (a < -0.3 && v > 0.15 && v < 6 ? clamp((6 - v) / 4) * clamp(v / 0.6) : 0);
export const airCut = (d) => clamp(14000 / (1 + (+d || 0) / 20), 350, 14000);
export const escalatorLevel = (d) => Math.pow(clamp((10 - (Number.isFinite(+d) ? +d : 99)) / 9), 1.5);
// seconds between rail joints at speed v; none below 2 m/s
export const jointInterval = (v) => (v > 2 ? JOINT_SPACING / v : Infinity);
// reverb impulse: seconds long, decay (exp rate over its length), bright 0..1, pre-delay and early reflections (s), wet level
export function impulseSpec(space) {
  if (space === 'concourse') return { seconds: 1.6, decay: 6.5, bright: 0.55, predelay: 0.018, early: [0.011, 0.019, 0.027, 0.038, 0.052], wet: 0.2 };
  if (space === 'platform') return { seconds: 2.2, decay: 5.6, bright: 0.75, predelay: 0.012, early: [0.007, 0.015, 0.023, 0.031, 0.044, 0.061, 0.083], wet: 0.28 };
  if (space === 'car') return { seconds: 0.35, decay: 7, bright: 0.4, predelay: 0.002, early: [0.0025, 0.004, 0.0065, 0.009], wet: 0.16 };
  return { seconds: 0, decay: 0, bright: 0, predelay: 0, early: [], wet: 0 };
}
// the door-closing warning: 7 rapid beeps over ~3 s
export const chimeTimes = () => Array.from({ length: 7 }, (_, i) => Math.round(i * 0.42 * 100) / 100);

export function createMetroAudio(audio) {
  const stats = { builds: 0, updates: 0, gate: 0, gateFlap: 0, denied: 0, xray: 0, doorChime: 0, doors: 0, arrivalTone: 0, joints: 0, airBrake: 0, rumbles: 0, spaces: 0, trainVoices: 0 };
  let ctx = null, out = null, sfx = null, send = null, brown = null, white = null, dead = false;
  let bed = null, esc = null, car = null, verb = null, space = null, rumbleIn = 20 + Math.random() * 40, jointPhase = 0;
  const voices = [], loops = [], fading = [], impulses = new Map(), last = new WeakMap();

  const filt = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const gainNode = (g) => { const n = ctx.createGain(); n.gain.value = g; return n; };
  // setTargetAtTime only when the value really moved (no automation event per frame for nothing)
  const set = (p, v, tau = 0.1) => { const o = last.get(p); if (o !== undefined && Math.abs(o - v) <= Math.abs(v) * 0.004 + 1e-5) return; last.set(p, v); p.setTargetAtTime(v, ctx.currentTime, tau); };
  const loop = (buffer, rate, ...chain) => {
    const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; s.playbackRate.value = rate * (0.95 + Math.random() * 0.1);
    let n = s; for (const c of chain) n = n.connect(c);
    s.start(0, Math.random() * buffer.duration); loops.push(s); return s;
  };
  const osc = (type, f, dest) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(dest); o.start(); loops.push(o); return o; };
  const lfo = (f, depth, target) => { const g = gainNode(depth); osc('sine', f, g); g.connect(target); return g; };
  // 4 s of noise (brown-ish or white), cross-faded end-into-start so the loop has no seam
  function noise(brownish) {
    const sr = ctx.sampleRate, n = sr * 4, xf = Math.floor(sr * 0.2), raw = new Float32Array(n + xf); let lp = 0;
    for (let i = 0; i < raw.length; i++) { const w = Math.random() * 2 - 1; lp = (lp + 0.02 * w) / 1.02; raw[i] = brownish ? lp * 3.5 + w * 0.02 : w * 0.5; }
    const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = raw[i];
    for (let i = 0; i < xf; i++) { const k = i / xf; d[i] = raw[i] * Math.sin(k * Math.PI / 2) + raw[n + i] * Math.cos(k * Math.PI / 2); }
    return b;
  }
  // exponentially decaying stereo noise (each ear its own), darkening as it decays, after a few
  // discrete early reflections off the walls; normalised to unit energy per ear
  function impulse(sp) {
    if (impulses.has(sp)) return impulses.get(sp);
    const P = impulseSpec(sp), sr = ctx.sampleRate, n = Math.max(2, Math.floor(P.seconds * sr)), b = ctx.createBuffer(2, n, sr), pre = Math.floor(P.predelay * sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0, e = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / sr, k = t / P.seconds, c = 0.08 + 0.85 * P.bright * (1 - 0.7 * k);
        lp += c * (Math.random() * 2 - 1 - lp);
        d[i] = lp * Math.exp(-P.decay * k) * Math.min(1, t / 0.004);
      }
      P.early.forEach((s, j) => { const i = Math.floor((s * (1 + (ch ? 0.07 : -0.05) * ((j % 3) - 1))) * sr); if (i < n) d[i] += (j % 2 ? -1 : 1) * 0.5 * Math.pow(0.82, j); });
      for (let i = 0; i < n; i++) e += d[i] * d[i];
      const g = 1 / Math.sqrt(e || 1); for (let i = 0; i < n; i++) d[i] *= g;
    }
    impulses.set(sp, b); return b;
  }

  function motor(dest) {
    const bp = filt('bandpass', 500, 1.1), g = gainNode(0); bp.connect(g).connect(dest);
    const o1 = osc('sawtooth', 330, bp), g2 = gainNode(0.45), o2 = osc('triangle', 340, g2); g2.connect(bp);   // carrier + a sideband
    const lp = filt('lowpass', 380, 0.7), g3 = gainNode(0.8), o3 = osc('sawtooth', 40, lp); lp.connect(g3).connect(g);   // the motor's own hum
    return { bp, g, o1, o2, o3 };
  }
  function driveMotor(m, v, a, level) {
    const p = motorPitch(v, a), fm = MOTOR_HZ_PER_MS * v;
    set(m.o1.frequency, p, 0.03); set(m.o2.frequency, p + 2 * fm + 3, 0.03); set(m.o3.frequency, Math.max(25, 2 * fm), 0.08);
    set(m.bp.frequency, p * 1.15, 0.05); set(m.g.gain, motorLevel(v, a) * level, 0.12);
  }

  function build() {
    stats.builds++;
    brown = noise(true); white = noise(false);
    out = gainNode(1); out.connect(audio.getMaster());
    send = gainNode(1);
    sfx = gainNode(1); sfx.connect(out); sfx.connect(send);
    // station bed: duct rumble, a deeper throb, vent hiss, mains hum
    { const g = gainNode(0); g.connect(out); const s = gainNode(0.35); g.connect(s).connect(send);
      const lp = filt('lowpass', 260, 0.5), hg = gainNode(0.08); loop(brown, 0.8, lp, hg, g); lfo(0.05, 70, lp.frequency); lfo(0.021, 0.025, hg.gain);
      const lo = filt('bandpass', 140, 0.7), lg = gainNode(0.09); loop(brown, 0.6, lo, lg, g); lfo(0.013, 0.025, lg.gain);
      const vent = filt('bandpass', 1900, 0.5), vg = gainNode(0.007); loop(white, 1, vent, vg, g); lfo(0.033, 0.0025, vg.gain);
      for (const [f, a] of [[50, 0.003], [100, 0.004], [150, 0.0018], [200, 0.0008]]) { const hg2 = gainNode(a); osc('sine', f * (1 + (Math.random() - 0.5) * 0.002), hg2); hg2.connect(g); }
      bed = { g, lp }; }
    // escalator: motor hum and the step chain (a looped 2 s buffer of ticks, one heavier than the next)
    { const g = gainNode(0); g.connect(out);
      const lp = filt('lowpass', 260, 0.9), mg = gainNode(0.035); lp.connect(mg).connect(g); osc('sawtooth', 49.6, lp); const wg = gainNode(0.12); osc('triangle', 412, wg); wg.connect(mg);   // + gear whine
      const sr = ctx.sampleRate, tb = ctx.createBuffer(1, sr * 2, sr), d = tb.getChannelData(0);
      for (let k = 0; k < 8; k++) { const at = Math.floor((0.01 + k * 0.25 + (Math.random() - 0.5) * 0.01) * sr), amp = (k % 2 ? 0.5 : 1) * (0.7 + Math.random() * 0.3); for (let i = 0; i < 200; i++) d[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / 30); }
      const tf = filt('bandpass', 2400, 1.2), tg = gainNode(0.07); loop(tb, 1, tf, tg, g);
      esc = { g }; }
    // two voices for passing trains
    for (let k = 0; k < 2; k++) {
      const g = gainNode(0), air = filt('lowpass', 8000, 0.5), pan = ctx.createStereoPanner(), sg = gainNode(0.8);
      g.connect(air).connect(pan); pan.connect(out); pan.connect(sg).connect(send);
      const roarF = filt('lowpass', 400, 0.7), roarG = gainNode(0); loop(brown, 1, roarF, roarG, g);
      const railF = filt('bandpass', 900, 0.5), railG = gainNode(0); loop(white, 1, railF, railG, g);
      const pistF = filt('lowpass', 600, 0.4), pistG = gainNode(0); loop(brown, 1.3, pistF, pistG, g);
      const sq = gainNode(0), sqAm = gainNode(0.6); sq.connect(g); sqAm.connect(sq);
      const so = osc('sine', 3200, sqAm); lfo(5.3, 35, so.frequency); lfo(1.7, 0.4, sqAm.gain);
      const sqn = filt('bandpass', 3300, 25), sqnG = gainNode(0.5); loop(white, 1, sqn, sqnG, sq);
      voices.push({ g, air, pan, roarF, roarG, railF, railG, pistF, pistG, sq, so, m: motor(g), used: false, lastD: 0, lastV: 0, approach: 0, braking: 0 });
    }
    // riding: rumble through the floor, tunnel roar (with a slow flutter), motors under a muffling low-pass
    { const g = gainNode(0); g.connect(out); const s = gainNode(0.4); g.connect(s).connect(send);
      const rf = filt('lowpass', 120, 0.7), rg = gainNode(0); loop(brown, 0.7, rf, rg, g);
      const tf = filt('bandpass', 400, 0.8), tg = gainNode(0), am = gainNode(1); loop(white, 1, tf, tg, am, g); lfo(0.37, 0.15, am.gain);
      const muff = filt('lowpass', 1100, 0.6); muff.connect(g);
      car = { g, rf, rg, tf, tg, m: motor(muff) }; }
  }
  function ready() {
    if (dead) return false;
    if (ctx) return true;
    const c = audio && audio.getContext && audio.getContext(), m = c && audio.getMaster && audio.getMaster();
    if (!c || !m) return false;
    ctx = c; build(); return true;
  }

  // ---- one-shot helpers ----
  const now = () => ctx.currentTime + 0.01;
  function env(g, t, peak, attack, hold, release) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.setValueAtTime(peak, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0005, t + attack + hold + release);
    return t + attack + hold + release;
  }
  function tone(t, type, f, peak, attack, hold, release, dest = sfx, f2 = null) {
    const o = ctx.createOscillator(), g = gainNode(0); o.type = type; o.frequency.setValueAtTime(f, t);
    const end = env(g, t, peak, attack, hold, release); if (f2) o.frequency.exponentialRampToValueAtTime(f2, end);
    o.connect(g).connect(dest); o.start(t); o.stop(end + 0.02); return o;
  }
  function burst(t, { buffer = white, type = 'bandpass', f = 1500, q = 1, gain = 0.1, attack = 0.003, hold = 0, decay = 0.06, sweepTo = null, dest = sfx }) {
    const s = ctx.createBufferSource(), fl = filt(type, f, q), g = gainNode(0), len = attack + hold + decay; s.buffer = buffer;
    if (sweepTo) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(sweepTo, t + len); }
    env(g, t, gain, attack, hold, decay); s.connect(fl).connect(g).connect(dest);
    s.start(t, Math.random() * Math.max(0, buffer.duration - len - 0.1), len + 0.05);
  }
  function thump(t, f, gain, decay = 0.08, dest = sfx) {
    const o = ctx.createOscillator(), g = gainNode(0);
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    env(g, t, gain, 0.004, 0, decay); o.connect(g).connect(dest); o.start(t); o.stop(t + decay + 0.03);
  }
  function rumble() {                             // another line's train, far off through the rock
    stats.rumbles++;
    const t = now(), len = 4, s = ctx.createBufferSource(), lp = filt('lowpass', 80, 0.8), g = gainNode(0.0001); s.buffer = brown;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + len * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    lp.frequency.setValueAtTime(80, t); lp.frequency.linearRampToValueAtTime(170, t + len * 0.45); lp.frequency.linearRampToValueAtTime(70, t + len);
    s.connect(lp).connect(g).connect(bed.g); s.start(t, Math.random() * 2, len + 0.1);
  }
  function airBrake(vc) {                         // the brake cylinders venting as the train stops
    stats.airBrake++;
    const t = now();
    burst(t, { type: 'highpass', f: 1800, q: 0.6, gain: 0.5, attack: 0.02, hold: 0.25, decay: 1.1, sweepTo: 3200, dest: vc.g });
    burst(t, { type: 'bandpass', f: 4200, q: 0.7, gain: 0.25, attack: 0.01, decay: 0.6, dest: vc.g });
  }
  function clack(t, v) {                          // a wheel over a rail joint
    const k = 0.5 + 0.5 * clamp(v / 22);
    burst(t, { buffer: brown, type: 'lowpass', f: 700, q: 0.8, gain: 0.2 * k, attack: 0.002, decay: 0.06, dest: car.g });
    burst(t, { type: 'bandpass', f: 1800, q: 1.2, gain: 0.03 * k, attack: 0.001, decay: 0.025, dest: car.g });
    thump(t, 70, 0.06 * k, 0.09, car.g);
  }
  function setSpace(sp) {
    if (sp === space) return;
    space = sp; stats.spaces++;
    const spec = impulseSpec(sp), t = ctx.currentTime;
    if (verb) { verb.g.gain.setTargetAtTime(0, t, 0.12); fading.push({ ...verb, until: t + 1.2 }); verb = null; }
    if (!spec.wet) return;
    const c = ctx.createConvolver(), g = gainNode(0); c.normalize = false; c.buffer = impulse(sp);
    send.connect(c); c.connect(g).connect(out); g.gain.setTargetAtTime(spec.wet, t, 0.12);
    verb = { c, g };
  }

  function driveVoice(vc, tr, dt, inCar) {
    if (!tr) { if (vc.used) set(vc.g.gain, 0, 0.4); vc.used = false; return; }
    const d = Math.max(0, +tr.d || 0), v = clamp(+tr.v || 0, 0, 30), a = +tr.a || 0;
    if (!vc.used) { vc.used = true; vc.lastD = d; vc.lastV = v; vc.approach = 0; vc.braking = 0; }
    const rate = dt > 0 ? (vc.lastD - d) / dt : 0; vc.approach += (rate - vc.approach) * Math.min(1, dt * 3);
    const near = 15 / Math.max(15, d), go = trainLevel(15, v), pl = vc.approach > 1 ? pistonLevel(d, v) : 0;
    set(vc.g.gain, near * (inCar ? 0.22 : 0.45), 0.08);   // from inside a car: through its body
    set(vc.air.frequency, airCut(d) * (inCar ? 0.25 : 1), 0.1);
    set(vc.pan.pan, clamp(+tr.side || 0, -1, 1) * 0.85, 0.1);
    set(vc.roarG.gain, go * 0.9, 0.1); set(vc.roarF.frequency, 200 + 40 * v, 0.15);
    set(vc.railG.gain, Math.pow(v / 25, 1.5) * 0.45, 0.12); set(vc.railF.frequency, 600 + 70 * v, 0.15);
    set(vc.pistG.gain, (pl * 0.5) / near, 0.25); set(vc.pistF.frequency, 300 + 900 * pl, 0.25);
    driveMotor(vc.m, v, a, 0.11);
    const sl = squealLevel(v, a); set(vc.sq.gain, sl * 0.05, sl > 0 ? 0.25 : 0.04); set(vc.so.frequency, 2900 + 110 * v, 0.3);
    vc.braking = a < -0.1 ? 1.5 : Math.max(0, vc.braking - dt);
    if (vc.lastV >= 0.2 && v < 0.2 && vc.braking > 0) airBrake(vc);
    vc.lastD = d; vc.lastV = v;
  }

  return {
    update(dt = 0, s = {}) {
      if (!ready()) return;
      stats.updates++;
      s = s || {}; dt = Math.max(0, Math.min(0.25, +dt || 0));
      const t = ctx.currentTime, under = clamp(+s.under || 0), crowd = clamp(+s.crowd || 0);
      setSpace(s.space === 'concourse' || s.space === 'platform' || s.space === 'car' ? s.space : null);
      for (let i = fading.length - 1; i >= 0; i--) if (t > fading[i].until) { const f = fading.splice(i, 1)[0]; try { send.disconnect(f.c); f.g.disconnect(); } catch { /* gone */ } }
      // the bed
      const plat = space === 'platform';
      set(bed.g.gain, under * (plat ? 1 : space === 'car' ? 0.35 : 0.75) * (1 - 0.3 * crowd), 0.6);
      set(bed.lp.frequency, plat ? 330 : 240, 1);
      rumbleIn -= dt;
      if (rumbleIn <= 0) { rumbleIn = 30 + Math.random() * 60; if (under > 0.05) rumble(); }
      set(esc.g.gain, escalatorLevel(s.escalator == null ? Infinity : s.escalator), 0.3);
      // other trains: the two nearest; each voice stays on the train it was following
      const list = (Array.isArray(s.trains) ? s.trains : []).filter((x) => x && Number.isFinite(+x.d)).sort((x, y) => x.d - y.d).slice(0, 2);
      const cost = (vc, tr) => (!tr ? (vc.used ? 50 : 0) : vc.used ? Math.abs(vc.lastD - tr.d) : 20);
      const A = [list[0], list[1]], B = [list[1], list[0]];
      const pick = cost(voices[0], B[0]) + cost(voices[1], B[1]) < cost(voices[0], A[0]) + cost(voices[1], A[1]) ? B : A;
      voices.forEach((vc, i) => driveVoice(vc, pick[i], dt, !!s.car));
      stats.trainVoices = voices.filter((vc) => vc.used).length;
      // riding
      if (s.car) {
        const v = clamp(+s.car.v || 0, 0, 30), a = +s.car.a || 0, vn = v / 25;
        set(car.g.gain, 1, 0.3);
        set(car.rg.gain, 0.06 + 0.2 * vn, 0.2); set(car.rf.frequency, 90 + 8 * v, 0.2);
        set(car.tg.gain, 0.3 * Math.pow(vn, 1.4), 0.2); set(car.tf.frequency, 300 + 24 * v, 0.2);
        driveMotor(car.m, v, a, 0.035);
        const iv = jointInterval(v);
        if (iv < Infinity) {
          jointPhase += dt / iv;
          if (jointPhase >= 1) { jointPhase %= 1; const at = now(); clack(at, v); clack(at + BOGIE / v, v); stats.joints++; }
        }
      } else set(car.g.gain, 0, 0.5);
    },
    gate() {                                      // 嘀: a tick, then a short bright tone
      if (!ready()) return; stats.gate++;
      const t = now();
      burst(t, { type: 'highpass', f: 3000, q: 0.7, gain: 0.05, attack: 0.0005, decay: 0.006 });
      tone(t, 'sine', 2350, 0.07, 0.004, 0.09, 0.03); tone(t, 'triangle', 2350, 0.012, 0.004, 0.09, 0.03); tone(t, 'sine', 4700, 0.006, 0.004, 0.06, 0.02);
    },
    gateFlap() {                                  // the servo whirrs, the flaps swing and stop on rubber
      if (!ready()) return; stats.gateFlap++;
      const t = now(), o = ctx.createOscillator(), bp = filt('bandpass', 1100, 3), g = gainNode(0); o.type = 'sawtooth';
      o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(230, t + 0.12); o.frequency.linearRampToValueAtTime(170, t + 0.34);
      const end = env(g, t, 0.03, 0.03, 0.22, 0.08); o.connect(bp).connect(g).connect(sfx); o.start(t); o.stop(end + 0.02);
      burst(t, { f: 2600, q: 0.8, gain: 0.012, attack: 0.05, hold: 0.2, decay: 0.1 });
      thump(t + 0.33, 120, 0.12, 0.09); burst(t + 0.33, { buffer: brown, type: 'lowpass', f: 500, gain: 0.25, decay: 0.07 });
    },
    denied() {                                    // two low, rough beeps
      if (!ready()) return; stats.denied++;
      const t = now(), lp = filt('lowpass', 1800, 0.7); lp.connect(sfx);
      for (const at of [0, 0.26]) for (const f of [370, 392]) tone(t + at, 'square', f, 0.025, 0.006, 0.15, 0.03, lp);
    },
    xray() {                                      // the belt motor spins up, the belt rumbles over its rollers, a soft beep
      if (!ready()) return; stats.xray++;
      const t = now(), len = 3, lp = filt('lowpass', 520, 0.9), mg = gainNode(0); lp.connect(mg).connect(sfx);
      mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(0.025, t + 0.4); mg.gain.setValueAtTime(0.025, t + len - 0.3); mg.gain.linearRampToValueAtTime(0, t + len + 0.2);
      for (const [type, mul, a] of [['sawtooth', 1, 1], ['sine', 2, 0.6], ['triangle', 6.3, 0.15]]) {
        const o = ctx.createOscillator(), og = gainNode(a); o.type = type;
        o.frequency.setValueAtTime(30 * mul, t); o.frequency.exponentialRampToValueAtTime(98 * mul, t + 0.5); o.frequency.setValueAtTime(98 * mul, t + len - 0.3); o.frequency.exponentialRampToValueAtTime(40 * mul, t + len + 0.2);
        o.connect(og).connect(lp); o.start(t); o.stop(t + len + 0.25);
      }
      const s = ctx.createBufferSource(), bp = filt('bandpass', 160, 0.8), bg = gainNode(0), am = gainNode(0.7), ao = ctx.createOscillator(), ag = gainNode(0.3); s.buffer = brown;
      ao.frequency.value = 9; ao.connect(ag).connect(am.gain); s.connect(bp).connect(bg).connect(am).connect(sfx);
      bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.25, t + 0.5); bg.gain.setValueAtTime(0.25, t + len - 0.3); bg.gain.linearRampToValueAtTime(0, t + len + 0.2);
      s.start(t, 0, len + 0.3); ao.start(t); ao.stop(t + len + 0.3);
      tone(t + len, 'sine', 1200, 0.03, 0.005, 0.12, 0.08);
    },
    doorChime() {                                 // rapid two-tone beeps while the doors are about to close
      if (!ready()) return; stats.doorChime++;
      const t = now(), lp = filt('lowpass', 4000, 0.7); lp.connect(sfx);
      chimeTimes().forEach((at, i) => { const f = i % 2 ? 1460 : 1560; tone(t + at, 'square', f, 0.028, 0.004, 0.17, 0.04, lp); tone(t + at, 'sine', f * 1.003, 0.04, 0.004, 0.17, 0.04, lp); });
    },
    doors(open = true) {                          // the leaves sliding (air hiss, rollers, drive motor), then the stop
      if (!ready()) return; stats.doors++;
      const t = now(), len = open ? 1.9 : 2.3;
      if (open) burst(t, { type: 'highpass', f: 3000, q: 0.6, gain: 0.05, attack: 0.005, decay: 0.25 });
      burst(t + 0.05, { f: open ? 2200 : 1400, sweepTo: open ? 900 : 2400, q: 0.7, gain: 0.04, attack: 0.25, hold: len - 0.6, decay: 0.35 });
      burst(t + 0.05, { buffer: brown, type: 'lowpass', f: 220, q: 0.7, gain: 0.2, attack: 0.2, hold: len - 0.5, decay: 0.3 });
      const o = ctx.createOscillator(), mlp = filt('lowpass', 400, 0.8), g = gainNode(0); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t); o.frequency.linearRampToValueAtTime(150, t + len * 0.6); o.frequency.linearRampToValueAtTime(120, t + len);
      const end = env(g, t + 0.05, 0.02, 0.15, len - 0.4, 0.2); o.connect(mlp).connect(g).connect(sfx); o.start(t); o.stop(end + 0.02);
      if (open) thump(t + len, 85, 0.1, 0.1);
      else { thump(t + len, 70, 0.12, 0.12); burst(t + len, { buffer: brown, type: 'lowpass', f: 600, gain: 0.22, decay: 0.12 }); burst(t + len + 0.06, { f: 900, q: 1, gain: 0.04, decay: 0.05 }); }
    },
    arrivalTone() {                               // do-la-fa, descending, on bells
      if (!ready()) return; stats.arrivalTone++;
      const t = now();
      [1047, 880, 698].forEach((f, i) => { for (const [m, a, dec] of [[1, 1, 1.1], [2, 0.35, 0.6], [2.76, 0.18, 0.4], [4.07, 0.08, 0.25], [5.4, 0.04, 0.15]]) tone(t + i * 0.36, 'sine', f * m, 0.06 * a, 0.003, 0, dec); });
    },
    stats,
    dispose() {
      dead = true;
      if (!ctx) return;
      for (const s of loops) { try { s.stop(); } catch { /* already stopped */ } }
      try { out.disconnect(); } catch { /* gone */ }
      loops.length = 0; voices.length = 0; fading.length = 0; impulses.clear(); ctx = null; verb = null;
    },
  };
}
