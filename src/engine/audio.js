// Procedural sound (no audio files, no music): a restrained waterfront bed, distant city and the
// crossing's traffic placed in 3-D, footsteps on two surfaces, and Mission One's two cues.
// Starts on the first user gesture (Web Audio autoplay rules).
//
//   [wind, river, city bed, vehicles, ship horn] -> env -> duck ┐
//   [footsteps, mission cues]                    -> sfx ────────┼-> pause -> master (mute/level) -> limiter -> out
//   recorded NPC clips (dialogueAudio)  ──────────────────────────────────────> master
//
// `duck` lowers only the environment (never below -7 dB) while an NPC is speaking; `pause`
// fades env + sfx out, then suspends the context, and fades back in on resume.

// ---- pure helpers (unit-tested in node) ----
export const FOOT_SURFACES = ['stone', 'asphalt'];
// granite paving, the promenade deck and its stair all read as stone; the carriageways as asphalt
export const footSurface = (surface) => (surface === 'road' ? 'asphalt' : 'stone');
export const DUCK_DB = -7;
export const duckGain = (level) => Math.pow(10, (DUCK_DB * Math.max(0, Math.min(1, level))) / 20);
// air absorption: distant things lose their top end
export const airCutoff = (dist) => Math.max(600, Math.min(16000, 16000 / (1 + dist / 25)));
// tyre / road noise rises steeply with speed; nothing at standstill
export const tyreLevel = (v) => Math.min(1, Math.pow(Math.max(0, v) / 12, 1.6));

const MASTER_LEVEL = 0.8;

export function createAudio() {
  let voiceBus = null;
  let ctx = null, master = null, env = null, duck = null, sfx = null, pauseBus = null, limiter = null, meter = null;
  let muted = false, paused = false, pauseToken = 0, hornTimer = 240, ancF = null, ancG = null, anc = false, inside = 0;
  let buf = null, river = null, wind = null, city = null, rain = null, riverExp = null, windExp = null, lastExp = -1, lastFoot = { pan: 0.12, f: 0 }, lastDuck = -1, lastRain = -1;
  const loops = [];                                          // every looping source ever started (for the duplicate check)
  // the crowd's murmur (tools/voice/walla.py: many people talking at once, recorded voices): fetched
  // and decoded as the page loads, so the loop is there the moment the graph is built
  const synth = { wind: null, river: null, city: null, off: false };
  let murmurBuf = null, murmur = null, lastCrowd = -1, lastStreet = -1, boat = null, lastBoat = -1;
  if (typeof window !== 'undefined' && window.OfflineAudioContext && typeof fetch === 'function') {
    fetch('./ambience/murmur.mp3').then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => ab && new window.OfflineAudioContext(1, 1, 24000).decodeAudioData(ab))
      .then((b) => { if (b) { murmurBuf = b; if (ctx && !murmur) buildMurmur(); } }).catch(() => {});
  }
  // two copies, offset and a hair apart in speed, one per ear: wide, and the loop never lines up with itself
  function buildMurmur() {
    const g = gainNode(0), lp = filt('lowpass', 6000, 0.5), split = ctx.createChannelMerger(2);
    for (let k = 0; k < 2; k++) {
      const s = ctx.createBufferSource(); s.buffer = murmurBuf; s.loop = true; s.playbackRate.value = k ? 0.985 : 1;
      s.connect(split, 0, k); s.start(0, k * murmurBuf.duration * 0.47 + Math.random() * 3); loops.push(s);
    }
    split.connect(lp).connect(g).connect(env);
    murmur = { g, lp };
    // Nanjing Road's din: four more copies of the crowd, offset, a little faster and slower, on top of the
    // ordinary murmur (setStreet), for a pedestrian street packed wall to wall
    const sg = gainNode(0), slp = filt('lowpass', 7000, 0.5), ss = ctx.createChannelMerger(2);
    [[1.03, 0.13, 0], [0.965, 0.31, 1], [1.012, 0.62, 0], [0.99, 0.83, 1]].forEach(([rate, off, ch]) => {
      const s = ctx.createBufferSource(); s.buffer = murmurBuf; s.loop = true; s.playbackRate.value = rate;
      s.connect(ss, 0, ch); s.start(0, off * murmurBuf.duration + Math.random() * 2); loops.push(s);
    });
    ss.connect(slp).connect(sg).connect(env);
    murmur.street = sg;
  }
  const voices = new Map();                                  // vehicle id -> voice
  const stats = { startCalls: 0, cues: { collect: 0, tear: 0 }, steps: { stone: 0, asphalt: 0 }, landings: 0, horns: 0 };

  const noiseBuffer = () => {
    // 6 s of soft brown-ish noise; loops start at random offsets / rates so nothing lines up.
    // Generated 0.25 s long and cross-faded end-into-start, so the loop point has no seam (click).
    const n = ctx.sampleRate * 6, xf = Math.floor(ctx.sampleRate * 0.25), raw = new Float32Array(n + xf);
    let last = 0;
    for (let i = 0; i < raw.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; raw[i] = last * 3.5 + w * 0.02; }
    const b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = raw[i];
    for (let i = 0; i < xf; i++) { const k = i / xf, c = Math.sin(k * Math.PI / 2), e = Math.cos(k * Math.PI / 2); d[i] = raw[i] * c + raw[n + i] * e; }
    return b;
  };
  const whiteBuffer = () => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  let white = null;
  const src = (buffer, loop, rate = 1) => {
    const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = loop; s.playbackRate.value = rate;
    return s;
  };
  const filt = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const gainNode = (g) => { const n = ctx.createGain(); n.gain.value = g; return n; };
  const panner = (ref, rolloff, model = 'equalpower') => {
    const p = ctx.createPanner(); p.panningModel = model; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = 10000;
    return p;
  };
  const place = (p, x, y, z, tau = 0.05) => {
    const t = ctx.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, tau); p.positionY.setTargetAtTime(y, t, tau); p.positionZ.setTargetAtTime(z, t, tau); } else p.setPosition(x, y, z);
  };
  const loop = (buffer, ...chain) => {
    const s = src(buffer, true, 0.9 + Math.random() * 0.2);
    let n = s; for (const c of chain) { n.connect(c); n = c; }
    s.start(0, Math.random() * buffer.duration);
    loops.push(s);
    return s;
  };
  const lfo = (freq, depth, target) => {
    const o = ctx.createOscillator(), g = gainNode(depth); o.frequency.value = freq;
    o.connect(g).connect(target); o.start(); loops.push(o);
    return g;
  };

  function start() {
    stats.startCalls++;
    if (ctx) { if (!paused) ctx.resume(); return; }        // never builds a second graph
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC(); buf = noiseBuffer(); white = whiteBuffer();
    limiter = ctx.createDynamicsCompressor();               // safety only: speech + cues never clip
    limiter.threshold.value = -4; limiter.knee.value = 4; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.25;
    meter = ctx.createAnalyser(); meter.fftSize = 2048;
    master = gainNode(0); master.connect(limiter); limiter.connect(ctx.destination); limiter.connect(meter);
    master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_LEVEL, ctx.currentTime + 3);   // gentle first fade-in
    pauseBus = gainNode(1); pauseBus.connect(master);
    duck = gainNode(1); duck.connect(pauseBus);
    // noise cancelling (headphones): the world's sound through a low-pass and turned down; speech and cues untouched
    ancF = ctx.createBiquadFilter(); ancF.type = 'lowpass'; ancF.frequency.value = 20000; ancF.Q.value = 0.707; ancG = gainNode(1);
    env = gainNode(1); env.connect(ancF); ancF.connect(ancG); ancG.connect(duck);
    sfx = gainNode(1); sfx.connect(pauseBus);
    voiceBus = gainNode(1); voiceBus.connect(pauseBus);                     // people talking (engine/voice.js): never ducked or muffled by ANC

    // wind off the river: two filtered noise layers with slow, unrelated gust cycles, drifting across the stereo field
    // how open you are to the river and the wind (setExposure, engine/soundscape.js): full on the promenade,
    // much less down the street canyons
    windExp = gainNode(1); windExp.connect(env); riverExp = gainNode(1); riverExp.connect(env);
    // the synthesised layers, faded out when the recorded beds take over (useBeds; engine/beds.js)
    synth.wind = gainNode(1); synth.wind.connect(windExp); synth.river = gainNode(1); synth.river.connect(riverExp); synth.city = gainNode(1); synth.city.connect(env);
    const windPan = ctx.createStereoPanner(); windPan.connect(synth.wind);
    const wf = filt('lowpass', 320, 0.4), wg = gainNode(0.26);
    loop(buf, wf, wg, windPan);
    lfo(0.07, 140, wf.frequency); const gust = lfo(0.031, 0.08, wg.gain); lfo(0.017, 0.35, windPan.pan);
    const wf2 = filt('bandpass', 700, 0.6), wg2 = gainNode(0.035);
    loop(buf, wf2, wg2, synth.wind); lfo(0.043, 250, wf2.frequency);
    // leaves in the wind: a dry high rustle, only near the trees and only as strong as the wind
    const lf = filt('bandpass', 3400, 0.5), lg = gainNode(0), lp2 = filt('lowpass', 7000, 0.5);
    loop(white, lf, lp2, lg, env); lfo(0.19, 900, lf.frequency); lfo(0.13, 0.4, lf.Q);
    wind = { wg, leaves: lg, gust };

    // the Huangpu against the river wall: placed out over the water, level with the listener
    const rp = panner(6, 1.0); rp.connect(synth.river);
    const lap = filt('bandpass', 900, 1.2), lapG = gainNode(0.32);
    loop(buf, lap, lapG, rp); lfo(0.31, 350, lap.frequency); lfo(0.11, 0.08, lapG.gain);
    const body = filt('lowpass', 180, 0.5), bodyG = gainNode(0.22);
    loop(buf, body, bodyG, rp);
    river = { p: rp, g: lapG, body: bodyG };

    // the city, far off, behind the Bund buildings (west); a low wash, not a hum
    const cp = panner(40, 1.0); cp.connect(synth.city);
    const cf = filt('lowpass', 240, 0.6), cg = gainNode(0.9);
    loop(buf, cf, cg, cp); lfo(0.023, 0.2, cg.gain);
    city = { p: cp, g: cg };

    // drizzle: ONE loop, built once, silent until the weather asks for it. Fine high hiss on
    // stone and water, with a little body; widened by delaying one ear (same source, no second loop).
    // It goes through env, so it yields to NPC speech like the rest of the bed.
    const rf = filt('highpass', 1100, 0.5), rb = filt('peaking', 4200, 0.8); rb.gain.value = 3;
    const rlp = filt('lowpass', 9000, 0.5), rg = gainNode(0);
    const split = ctx.createChannelMerger(2), dly = ctx.createDelay(0.05); dly.delayTime.value = 0.013;
    loop(white, rf, rb, rlp, rg);
    rg.connect(split, 0, 0); rg.connect(dly).connect(split, 0, 1); split.connect(env);
    rain = { g: rg, lp: rlp };
    // aboard the river cruise: the diesel's low throb through the deck, and the wash along the hull
    const bf = filt('lowpass', 95, 0.9), bg = gainNode(0); loop(buf, bf, bg, env); lfo(0.9, 0.04, bg.gain);
    const wf3 = filt('bandpass', 650, 0.5), wg3 = gainNode(0); loop(white, wf3, wg3, env); lfo(0.21, 220, wf3.frequency);
    boat = { bg, wg: wg3 };
    if (murmurBuf) buildMurmur();
  }

  // one voice per through-traffic vehicle: tyre roar (+ engine for the petrol taxis / sedan)
  function vehicleVoice(v) {
    const p = panner(5, 1.3); p.connect(env);
    const air = filt('lowpass', 8000, 0.5); air.connect(p);
    const tyre = filt('bandpass', 500, 0.6), tg = gainNode(0);
    loop(buf, tyre, tg, air);
    let eg = null;
    if (v.ice) {                                             // a small four-cylinder idling / pulling
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 32 + Math.random() * 6;
      const lp = filt('lowpass', 140, 0.8); eg = gainNode(0);
      o.connect(lp).connect(eg).connect(air); o.start(); loops.push(o);
      return { p, air, tyre, tg, eg, osc: o };
    }
    return { p, air, tyre, tg, eg };
  }

  function updateVehicles(list, lx, lz) {
    const t = ctx.currentTime;
    for (const v of list) {
      let voice = voices.get(v.id);
      if (!voice) { voice = vehicleVoice(v); voices.set(v.id, voice); }
      const lv = v.active ? tyreLevel(v.v) : 0;
      voice.tg.gain.setTargetAtTime(lv * 0.42, t, 0.12);
      voice.tyre.frequency.setTargetAtTime(380 + v.v * 28, t, 0.2);
      if (voice.eg) {
        voice.eg.gain.setTargetAtTime(v.active ? 0.05 + 0.05 * Math.min(1, v.v / 10) : 0, t, 0.15);
        voice.osc.frequency.setTargetAtTime(30 + v.v * 3.2, t, 0.3);
      }
      if (!v.active) continue;
      place(voice.p, v.x, 0.5, v.z);
      voice.air.frequency.setTargetAtTime(airCutoff(Math.hypot(v.x - lx, v.z - lz)), t, 0.2);
    }
  }

  // whoever wants to know a ship sounded (world/pulse.js turns heads toward the river): fn(x, z)
  const hornHeard = new Set();
  const heard = (x, z) => { for (const fn of hornHeard) try { fn(x, z); } catch (e) { /* */ } };
  function horn() {
    // a far ship on the Huangpu: three detuned notes, out over the water
    stats.horns++;
    const t = ctx.currentTime, g = gainNode(0), f = filt('lowpass', 420), p = panner(60, 1);
    const hz = (Math.random() - 0.5) * 600;
    place(p, 220, 2, hz, 0.001); heard(220, hz);
    const peak = 0.5 + Math.random() * 0.3, len = 3.5 + Math.random() * 2.5, base = 0.92 + Math.random() * 0.16;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.5); g.gain.setValueAtTime(peak, t + len - 1); g.gain.exponentialRampToValueAtTime(0.0005, t + len + 2.5);
    for (const hz of [98, 123.5, 147]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz * base; o.connect(f); o.start(t); o.stop(t + len + 2.6); }
    const d = ctx.createDelay(1); d.delayTime.value = 0.42; const fb = gainNode(0.32);
    f.connect(g); g.connect(p); p.connect(env); g.connect(d); d.connect(fb).connect(d); d.connect(p);
    setTimeout(() => { try { p.disconnect(); fb.disconnect(); } catch { /* gone */ } }, (len + 4) * 1000);
  }

  // ---- one-shots ----
  const rnd = (a, b) => a + Math.random() * (b - a);
  function burst(t, { buffer = white, type = 'bandpass', f = 1500, q = 1, gain = 0.2, attack = 0.003, decay = 0.06, rate = 1, pan = 0, sweepTo = null, dest = sfx }) {
    const s = src(buffer, false, rate), fl = filt(type, f, q), g = gainNode(0), sp = ctx.createStereoPanner();
    sp.pan.value = pan;
    if (sweepTo) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + attack + decay);
    s.connect(fl).connect(g).connect(sp).connect(dest);
    s.start(t, Math.random() * (buffer.duration - 0.5), attack + decay + 0.05);
  }
  function thump(t, f, gain, decay = 0.07, pan = 0) {
    const o = ctx.createOscillator(), g = gainNode(0), sp = ctx.createStereoPanner(); sp.pan.value = pan;
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
    o.connect(g).connect(sp).connect(sfx); o.start(t); o.stop(t + decay + 0.02);
  }
  function ping(t, f, gain, decay = 0.03) {
    const o = ctx.createOscillator(), g = gainNode(0); o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
    o.connect(g).connect(sfx); o.start(t); o.stop(t + decay + 0.02);
  }

  // Footsteps: heel then toe, on stone (granite / deck / stair) or asphalt. Every parameter
  // jitters and the centre frequency is kept away from the previous step's, so no two match.
  const FOOT = {
    stone: { f: 2100, q: 1.1, thump: 95, gain: 0.19, decay: 0.05 },
    asphalt: { f: 1050, q: 0.7, thump: 72, gain: 0.15, decay: 0.07 },
  };
  function step(surface, running = false, landing = false) {
    if (!ctx || muted || paused) return;
    const kind = footSurface(surface), P = FOOT[kind], t = ctx.currentTime + 0.005;
    let f = P.f * rnd(0.88, 1.12);
    if (Math.abs(f - lastFoot.f) < P.f * 0.04) f *= 1.07;
    lastFoot.f = f; lastFoot.pan = -lastFoot.pan;                                  // left foot, right foot
    const pan = lastFoot.pan * rnd(0.6, 1), loud = (landing ? 1.7 : running ? 1.35 : 1) * rnd(0.85, 1.1);
    burst(t, { f, q: P.q, gain: P.gain * loud, decay: P.decay * rnd(0.85, 1.15), rate: rnd(0.85, 1.2), pan });
    thump(t, P.thump * rnd(0.9, 1.1), 0.12 * loud * (landing ? 1.6 : 1), landing ? 0.12 : 0.07, pan);
    if (kind === 'asphalt') burst(t + 0.004, { type: 'highpass', f: 4200, q: 0.5, gain: 0.025 * loud, decay: 0.03, pan });   // grit
    if (!landing) burst(t + (running ? rnd(0.035, 0.05) : rnd(0.055, 0.085)), { f: f * 1.25, q: P.q, gain: P.gain * 0.45 * loud, decay: P.decay * 0.7, rate: rnd(0.9, 1.25), pan });
    if (landing) stats.landings++; else stats.steps[kind]++;
  }

  // Mission One's two cues. Collecting: a smooth kraft slide off the counter, a soft lift thump,
  // the string ticking against its button. Breaking the seal: a sharp crack, then an accelerating
  // granular rip, then the flap falling open.
  function cue(name, delay = 0, level = 1) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + 0.01 + delay;
    if (name === 'collect') {
      stats.cues.collect++;
      burst(t, { buffer: buf, f: 1700, q: 0.9, gain: 0.5, attack: 0.04, decay: 0.32, sweepTo: 3300, rate: 2.2 });
      burst(t + 0.02, { buffer: buf, type: 'lowpass', f: 420, q: 0.7, gain: 0.34, attack: 0.01, decay: 0.12, rate: 1.4 });
      ping(t + 0.2, 2350, 0.05); ping(t + 0.27, 3050, 0.035);
    } else if (name === 'shutter') {
      // a phone camera's shutter: two quick clicks of filtered noise
      burst(t, { type: 'highpass', f: 2600, q: 0.8, gain: 0.32 * level, attack: 0.001, decay: 0.03 });
      burst(t + 0.07, { type: 'bandpass', f: 1800, q: 1.2, gain: 0.24 * level, attack: 0.001, decay: 0.045 });
    } else if (name === 'shiphorn') {
      // a ship's horn: a long low chord, swelling and dying, as a boat pulls away
      heard(null, null);
      const g = gainNode(0), lp = filt('lowpass', 520, 0.7); lp.connect(g).connect(env || sfx);
      for (const f of [98, 147, 196]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = Math.random() * 6 - 3; o.connect(lp); o.start(t); o.stop(t + 2.6); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * level, t + 0.25); g.gain.setValueAtTime(0.09 * level, t + 1.9); g.gain.linearRampToValueAtTime(0, t + 2.5);
    } else if (name === 'tramBell') {
      // the sightseeing train's bell: two strokes on a small brass bell (inharmonic partials, a long ring)
      for (const t0 of [t, t + 0.36]) for (const [k, g, d] of [[1, 0.09, 1.3], [2.76, 0.045, 0.7], [5.4, 0.025, 0.35], [8.9, 0.012, 0.18]]) {
        const o = ctx.createOscillator(), e = gainNode(0); o.type = 'sine'; o.frequency.value = 1180 * k;
        e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g * level, t0 + 0.004); e.gain.exponentialRampToValueAtTime(0.0006, t0 + d);
        o.connect(e).connect(sfx); o.start(t0); o.stop(t0 + d + 0.05);
      }
    } else if (name === 'liftBell') {
      // a lift arriving: one soft stroke on the hall lantern's gong (a low bell, its partials dying slowly)
      for (const [k, g, d] of [[1, 0.075, 1.8], [2.01, 0.026, 1.0], [2.93, 0.016, 0.6], [4.16, 0.007, 0.3]]) {
        const o = ctx.createOscillator(), e = gainNode(0); o.type = 'sine'; o.frequency.value = 698 * k;
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * level, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0005, t + d);
        o.connect(e).connect(sfx); o.start(t); o.stop(t + d + 0.05);
      }
    } else if (name === 'click') {
      // a button pressed: a short dry click
      burst(t, { type: 'bandpass', f: 3000, q: 1.4, gain: 0.2 * level, attack: 0.001, decay: 0.016 });
      burst(t + 0.05, { type: 'bandpass', f: 2200, q: 1.2, gain: 0.1 * level, attack: 0.001, decay: 0.012 });
    } else if (name === 'chime') {
      // an achievement: three rising bell notes
      [1047, 1319, 1568].forEach((f, i) => ping(t + i * 0.11, f, 0.06 * level, 0.5));
    } else if (name === 'buzz') {
      // the phone vibrating in your pocket: two short buzzes, a low motor hum with the case's rattle
      stats.cues.buzz = (stats.cues.buzz || 0) + 1;
      for (const t0 of [t, t + 0.42]) {
        const g = ctx.createGain(), lp = ctx.createBiquadFilter(), o = ctx.createOscillator(), am = ctx.createOscillator(), amg = ctx.createGain();
        lp.type = 'lowpass'; lp.frequency.value = 420; o.type = 'sawtooth'; o.frequency.value = 158;
        am.type = 'square'; am.frequency.value = 31; amg.gain.value = 0.35;   // the rattle
        o.connect(lp).connect(g).connect(sfx); am.connect(amg).connect(g.gain);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.16 * level, t0 + 0.03); g.gain.setValueAtTime(0.16 * level, t0 + 0.26); g.gain.linearRampToValueAtTime(0, t0 + 0.31);
        o.start(t0); am.start(t0); o.stop(t0 + 0.33); am.stop(t0 + 0.33);
      }
    } else if (name === 'ping') {
      // a message: two soft notes, a fourth apart
      ping(t, 1318, 0.05 * level, 0.12); ping(t + 0.09, 1760, 0.04 * level, 0.16);
    } else if (name === 'ring') {
      // the phone ringing: a short marimba-ish figure (this is called once per ring)
      [988, 1319, 1175, 1568].forEach((f, i) => ping(t + i * 0.13, f, 0.07 * level, 0.22));
    } else if (name === 'hum') {
      // a closed-mouth "嗯": a low voiced murmur, nasal, a quarter of a second, rising a touch
      const o = ctx.createOscillator(), g = gainNode(0), f = filt('bandpass', 420, 1.2), lp = filt('lowpass', 900, 0.7);
      o.type = 'sawtooth'; const f0 = rnd(118, 150);
      o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.12, t + 0.24);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * level, t + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + 0.3);
      o.connect(f).connect(lp).connect(g).connect(sfx); o.start(t); o.stop(t + 0.34);
      stats.cues.hum = (stats.cues.hum || 0) + 1;
    } else if (name === 'carhorn') {
      // a car horn just ahead: two detuned reeds, a short angry double blast
      stats.cues.carhorn = (stats.cues.carhorn || 0) + 1;
      for (const [at, len] of [[0, 0.32], [0.42, 0.55]]) {
        const g = gainNode(0), f = filt('bandpass', 900, 0.9);
        g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(0.16 * level, t + at + 0.02); g.gain.setValueAtTime(0.16 * level, t + at + len); g.gain.linearRampToValueAtTime(0, t + at + len + 0.05);
        for (const hz of [415, 498]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz; o.connect(f); o.start(t + at); o.stop(t + at + len + 0.08); }
        f.connect(g); g.connect(sfx);
      }
    } else if (name === 'v10') {
      // a V10 starting: the starter, a bark up to ~4000 rpm, then a lumpy idle that fades
      stats.cues.v10 = (stats.cues.v10 || 0) + 1;
      burst(t, { buffer: buf, type: 'bandpass', f: 1400, q: 2, gain: 0.08, attack: 0.01, decay: 0.5, rate: 3 });
      const g = gainNode(0), f = filt('lowpass', 900, 0.9), dist = ctx.createWaveShaper();
      const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.6); } dist.curve = curve;
      for (const [mul, w] of [[1, 'sawtooth'], [0.5, 'square'], [2.02, 'sawtooth']]) {
        const o = ctx.createOscillator(); o.type = w;
        o.frequency.setValueAtTime(28 * mul, t + 0.5); o.frequency.exponentialRampToValueAtTime(160 * mul, t + 0.95); o.frequency.exponentialRampToValueAtTime(40 * mul, t + 1.7);
        o.connect(dist); o.start(t + 0.5); o.stop(t + 5.2);
      }
      dist.connect(f); f.connect(g); g.connect(sfx);
      g.gain.setValueAtTime(0, t + 0.5); g.gain.linearRampToValueAtTime(0.32 * level, t + 0.62); g.gain.linearRampToValueAtTime(0.4 * level, t + 0.95);
      g.gain.linearRampToValueAtTime(0.14 * level, t + 1.8); g.gain.linearRampToValueAtTime(0.0001, t + 5.1);
    } else if (name === 'door') {
      // a car door: the latch, then the heavy shut
      stats.cues.door = (stats.cues.door || 0) + 1;
      burst(t, { f: 2600, q: 1.2, gain: 0.12, attack: 0.002, decay: 0.05, rate: 1.4 });
      thump(t + 0.9, 70, 0.4, 0.14);
      burst(t + 0.9, { buffer: buf, type: 'lowpass', f: 600, q: 0.7, gain: 0.3, attack: 0.003, decay: 0.16, rate: 1.2 });
    } else if (name === 'bump') {
      // shoulder into shoulder: a soft cloth thud and a scuff of feet
      stats.cues.bump = (stats.cues.bump || 0) + 1;
      thump(t, 90, 0.22, 0.09);
      burst(t, { buffer: buf, type: 'lowpass', f: 900, q: 0.6, gain: 0.3, attack: 0.004, decay: 0.12, rate: 1.8 });
      burst(t + 0.05, { f: 2200, q: 0.8, gain: 0.08, attack: 0.01, decay: 0.08, rate: 1.1 });
    } else if (name === 'tear') {
      stats.cues.tear++;
      burst(t, { type: 'highpass', f: 2600, q: 0.6, gain: 0.32, attack: 0.001, decay: 0.012 });
      let k = 0;
      for (let tt = 0.03; tt < 0.7; tt += 0.045 * (1 - tt * 0.9) + Math.random() * 0.012) {
        burst(t + tt, { f: rnd(3200, 6600), q: rnd(1, 2.5), gain: rnd(0.07, 0.2), attack: 0.001, decay: rnd(0.006, 0.016), pan: rnd(-0.2, 0.2) });
        k++;
      }
      burst(t + 0.03, { f: 2400, q: 0.5, gain: 0.07, attack: 0.25, decay: 0.4 });
      burst(t + 0.72, { buffer: buf, type: 'lowpass', f: 500, q: 0.7, gain: 0.22, attack: 0.01, decay: 0.15, rate: 1.6 });
    } else if (name === 'string') {
      // a string drawn round a card button: three soft rasps, each catching on the button's edge
      stats.cues.string = (stats.cues.string || 0) + 1;
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.22 + Math.random() * 0.03;
        burst(tt, { f: rnd(1100, 1500), q: 1.2, gain: 0.09, attack: 0.05, decay: 0.12, pan: rnd(-0.15, 0.15) });
        burst(tt + 0.13, { buffer: buf, type: 'lowpass', f: 700, q: 0.8, gain: 0.08, attack: 0.004, decay: 0.05, rate: 1.4 });
      }
    }
  }

  // Breathing after a run: an exhale (warm, mouth) then an inhale (thinner), at the rate the head
  // motion uses, louder and quicker the more spent you are. Silent at rest.
  let breathPhase = 0, breathLevel = 0, lastWind = -1;
  // catching his breath: two recorded loops (tools/voice/breath.py), heavy (just run out) and easing
  // (recovering), crossfaded by how hard he's breathing. Their loudness envelopes say where in a breath
  // he is now, so the camera rises and falls on the breaths you hear (breathEnvelope, headMotion.js).
  const BR = { heavy: null, ease: null, loading: false };
  const sm = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function loadBreath() {
    BR.loading = true;
    for (const k of ['heavy', 'ease']) {
      Promise.all([fetch(`./ambience/breath/${k}.mp3`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)), fetch(`./ambience/breath/${k}.json`).then((r) => r.json())])
        .then(([buf, env]) => { const sn = ctx.createBufferSource(); sn.buffer = buf; sn.loop = true; const g = gainNode(0); sn.connect(g).connect(sfx); const t0 = ctx.currentTime + 0.05; sn.start(t0); BR[k] = { g, env, t0, dur: buf.duration, w: 0 }; })
        .catch(() => { /* no clips: silence */ });
    }
  }
  function breathe() {
    if (!ctx) return;
    if (breathLevel > 0.1 && !BR.loading) loadBreath();
    const heavy = sm(0.5, 0.85, breathLevel), ease = sm(0.12, 0.42, breathLevel) * (1 - heavy), on = !muted && !paused;
    for (const [k, w, top] of [['heavy', heavy, 0.5], ['ease', ease, 0.34]]) {
      const b = BR[k]; if (!b) continue;
      b.w = w; b.g.gain.setTargetAtTime(on ? top * w : 0, ctx.currentTime, 0.3);
      if (w > 0.02) stats.breaths = (stats.breaths || 0) + 1;
    }
  }
  // 0..1: how far into a breath he is right now (from the recording playing), or null when he isn't
  // breathing hard enough to hear
  function breathEnvelope() {
    if (!ctx) return null;
    let e = 0, w = 0;
    for (const k of ['heavy', 'ease']) {
      const b = BR[k]; if (!b || b.w < 0.02) continue;
      const pos = (((ctx.currentTime - b.t0) % b.dur) + b.dur) % b.dur, i = Math.min(b.env.env.length - 1, Math.floor(pos * b.env.fps));
      e += b.env.env[i] * b.w; w += b.w;
    }
    return w > 0.05 ? e / w : null;
  }


  const muteListeners = new Set();
  return {
    start, step, cue,
    onHorn(fn) { hornHeard.add(fn); return () => hornHeard.delete(fn); },
    // per frame: listener position, the crossing's vehicles, how much an NPC is speaking (0..1)
    update(dt, x, { z = 0, vehicles = null, speech = 0 } = {}) {
      if (!ctx) return;
      hornTimer -= dt;
      const t = ctx.currentTime;
      place(river.p, 32, -1, z, 0.3);
      place(city.p, -150, 4, z * 0.7, 0.5);
      if (vehicles) updateVehicles(vehicles, x, z);
      const d = Math.round(speech * 20) / 20;
      if (d !== lastDuck) { lastDuck = d; duck.gain.setTargetAtTime(duckGain(d), t, 0.3); }   // ~1 s to settle: no abrupt drop
      // far ships on the river: rare (ships may sound their horns here only in an emergency; engine/soundscape.js)
      if (hornTimer < 0) { hornTimer = 420 + Math.random() * 600; if (!muted && !paused && (!riverExp || riverExp.gain.value > 0.1)) horn(); }
      breathe();
    },
    // how hard the player is breathing, 0..1 (stamina.js)
    setBreath(level) { breathLevel = Math.max(0, Math.min(1, level)); },
    breathEnvelope,
    // wind 0..~1.3 (wind.js); nearTree 0..1: how close the nearest tree is
    setWind(level, nearTree = 0) {
      if (!ctx || !wind) return;
      const v = Math.round(level * 50) / 50 + Math.round(nearTree * 20) * 10;
      if (v === lastWind) return;
      lastWind = v;
      const t = ctx.currentTime;
      const base = 0.14 + 0.32 * Math.min(1.3, level);
      wind.wg.gain.setTargetAtTime(base, t, 0.8);
      wind.gust.gain.setTargetAtTime(base * (0.12 + 0.25 * Math.min(1, level)), t, 0.8);   // gusts scale with the wind: calm air is steady
      wind.leaves.gain.setTargetAtTime(0.045 * Math.min(1.3, level) * nearTree, t, 0.5);
    },
    // weather: level 0..1; covered = standing under the canopy / portico (muffled, quieter)
    setAnc(on) { anc = !!on; this.applyMuffle(); },
    // walls between you and the street: 0 out in it, 1 high up behind glass (the hotel room)
    setInside(k) { k = Math.round(Math.max(0, Math.min(1, k)) * 20) / 20; if (k === inside) return; inside = k; this.applyMuffle(); },
    applyMuffle() {
      if (!ctx || !ancF) return;
      const t = ctx.currentTime, f = Math.min(anc ? 520 : 20000, 20000 * Math.pow(0.04, inside)), g = (anc ? 0.32 : 1) * (1 - 0.6 * inside);
      ancF.frequency.setTargetAtTime(f, t, 0.25); ancG.gain.setTargetAtTime(g, t, 0.25);
    },
    get anc() { return anc; },
    setRain(level, covered = false) {
      if (!ctx || !rain) return;
      const v = Math.round(level * 100) / 100 + (covered ? 2 : 0);
      if (v === lastRain) return;
      lastRain = v;
      const t = ctx.currentTime;
      rain.g.gain.setTargetAtTime(0.11 * level * level * (covered ? 0.55 : 1), t, 0.4);
      rain.lp.frequency.setTargetAtTime(covered ? 2600 : 9000, t, 0.4);
    },
    // aboard the cruise: on 0..1 (how far aboard), speed in m/s
    setBoat(on, speed = 0) {
      if (!ctx || !boat) return;
      const v = Math.round(on * 20) / 20 + Math.round(speed * 2) * 10;
      if (v === lastBoat) return;
      lastBoat = v;
      const t = ctx.currentTime;
      boat.bg.gain.setTargetAtTime(on * (0.42 + 0.05 * speed), t, 0.6);
      boat.wg.gain.setTargetAtTime(on * 0.05 * (0.25 + speed / 4), t, 0.6);
    },
    // the crowd round you: 0 nobody .. 1 the evening crush on the promenade
    setCrowd(level) {
      if (!ctx || !murmur) return;
      const v = Math.round(Math.max(0, Math.min(1.2, level)) * 40) / 40;
      if (v === lastCrowd) return;
      lastCrowd = v;
      const t = ctx.currentTime;
      murmur.g.gain.setTargetAtTime(synth.off ? 0 : 0.5 * Math.pow(v, 1.3), t, 0.9);
      murmur.lp.frequency.setTargetAtTime(2200 + 4500 * Math.min(1, v), t, 0.9);   // a few people far off: duller
    },
    get crowdLevel() { return murmur ? murmur.g.gain.value : 0; },
    // on Nanjing Road: 0..1 how much of its din you're in
    setStreet(level) {
      if (!ctx || !murmur || !murmur.street) return;
      const v = Math.round(Math.max(0, Math.min(1, level)) * 20) / 20;
      if (v === lastStreet) return;
      lastStreet = v;
      murmur.street.gain.setTargetAtTime(synth.off ? 0 : 0.55 * v, ctx.currentTime, 1.2);
    },
    setPaused(p) {
      paused = !!p;
      if (!ctx) return;
      const tok = ++pauseToken, t = ctx.currentTime;
      if (paused) {
        pauseBus.gain.setTargetAtTime(0, t, 0.08);
        setTimeout(() => { if (tok === pauseToken && paused) ctx.suspend(); }, 450);
      } else {
        ctx.resume().then(() => { if (tok === pauseToken) pauseBus.gain.setTargetAtTime(1, ctx.currentTime, 0.18); });
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, ctx.currentTime, 0.1);
      for (const fn of muteListeners) fn(muted);
      return muted;
    },
    onMute(fn) { muteListeners.add(fn); return () => muteListeners.delete(fn); },
    getContext() { return ctx; },
    getMaster() { return master; },
    getMusicBus() { return duck; },
    getEnvBus() { return env; },                 // the street's sounds: ducked under speech, muffled indoors (engine/ambience.js)
    getSfxBus() { return sfx; },                 // footsteps and cues (the reverb listens to these)
    getOutBus() { return pauseBus; },            // straight to the output (the reverb's return)
    get murmurBuffer() { return murmurBuf; },
    // the recorded beds are playing (engine/ambience.js): the synthesised wind, river and city wash and the
    // murmur loop fade out (and come back if the beds stop). The leaves, rain, steps and cues stay.
    useBeds(on) {
      synth.off = !!on;
      if (!ctx || !synth.wind) return;
      const t = ctx.currentTime, v = on ? 0 : 1;
      for (const g of [synth.wind, synth.river, synth.city]) g.gain.setTargetAtTime(v, t, 1.5);
      if (murmur) { murmur.g.gain.setTargetAtTime(on ? 0 : murmur.g.gain.value, t, 1.5); if (murmur.street) murmur.street.gain.setTargetAtTime(on ? 0 : murmur.street.gain.value, t, 1.5); }
      lastCrowd = -1; lastStreet = -1;
    },    // the crowd's murmur, for the voices placed nearby
    // how open the listener is to the river (0..1) and to the wind (0..1)
    setExposure(rv, wd) {
      if (!ctx || !riverExp) return;
      const v = Math.round(rv * 40) / 40 + Math.round(wd * 40) * 10;
      if (v === lastExp) return;
      lastExp = v;
      riverExp.gain.setTargetAtTime(Math.max(0, Math.min(1, rv)), ctx.currentTime, 0.8);
      windExp.gain.setTargetAtTime(Math.max(0, Math.min(1, wd)), ctx.currentTime, 0.8);
    },
    // what is sounding and how loud at the listener (x, z), roughly (for the liveliness numbers):
    // [{ id, kind, level }], before the master level and the indoor muffling
    audible(lx, lz) {
      const out = [];
      if (!ctx || !wind) return out;
      const att = (d, ref, ro) => ref / (ref + ro * (Math.max(d, ref) - ref));
      const wx = windExp ? windExp.gain.value : 1, rx = riverExp ? riverExp.gain.value : 1;
      out.push({ id: 'wind', kind: 'wind', level: wind.wg.gain.value * 0.6 * wx });
      if (wind.leaves.gain.value > 0.001) out.push({ id: 'leaves', kind: 'wind', level: wind.leaves.gain.value });
      out.push({ id: 'river', kind: 'water', level: 0.4 * rx * att(Math.abs(32 - lx), 6, 1) });
      out.push({ id: 'city', kind: 'traffic', level: 0.9 * 0.05 * att(Math.hypot(-150 - lx, 0.3 * lz), 40, 1) });
      if (murmur) { out.push({ id: 'murmur', kind: 'chatter', level: murmur.g.gain.value }); if (murmur.street) out.push({ id: 'nanjing-din', kind: 'chatter', level: murmur.street.gain.value }); }
      if (rain) out.push({ id: 'rain', kind: 'rain', level: rain.g.gain.value });
      if (boat) out.push({ id: 'boat', kind: 'boat', level: boat.bg.gain.value * 0.3 });
      for (const [id, v] of voices) {
        const pos = v.p.positionX ? [v.p.positionX.value, v.p.positionZ.value] : null;
        if (!pos) continue;
        const lvl = (v.tg.gain.value + (v.eg ? v.eg.gain.value : 0)) * att(Math.hypot(pos[0] - lx, pos[1] - lz), 5, 1.3);
        out.push({ id: `vehicle:${id}`, kind: 'vehicle', level: lvl });
      }
      return out;
    },
    getVoiceBus() { return voiceBus; }, 
    get muted() { return muted; },
    get paused() { return paused; },
    suspend() { this.setPaused(true); }, resume() { this.setPaused(false); },
    get running() { return !!ctx && ctx.state === 'running'; },
    // verification hooks (tools only): live meter on the final output, graph census
    get meter() { return meter; },
    get output() { return limiter; },
    census() { return { loops: loops.length, rainGain: rain ? rain.g.gain.value : 0, vehicleVoices: voices.size, state: ctx ? ctx.state : 'none', ...stats, duck: duck ? duck.gain.value : 1, pause: pauseBus ? pauseBus.gain.value : 1 }; },
  };
}
