// Procedural ambience (no audio files): river wind, water against the wall, a far
// ship's horn now and then, and wet footsteps. Starts on the first user gesture.
export function createAudio() {
  let ctx = null, master = null, lap = null, muted = false, hornTimer = 35, lapTimer = 0;
  const noiseBuffer = () => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 + w * 0.02; }
    return b;
  };
  let buf = null;
  const loop = (freq, q, gain, type = 'lowpass') => {
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master); src.start();
    return { f, g };
  };
  function start() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC(); buf = noiseBuffer();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 3);
    const wind = loop(320, 0.4, 0.55);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140;
    lfo.connect(lg).connect(wind.f.frequency); lfo.start();
    loop(90, 0.7, 0.5);                                   // the city, far off
    lap = loop(900, 1.2, 0.0, 'bandpass');                // water on stone, faded in near the railing
    const l2 = ctx.createOscillator(), l2g = ctx.createGain(); l2.frequency.value = 0.31; l2g.gain.value = 350;
    l2.connect(l2g).connect(lap.f.frequency); l2.start();
  }
  function horn() {
    const t = ctx.currentTime, g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.4); g.gain.setValueAtTime(0.11, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0005, t + 5.5);
    for (const hz of [98, 123.5, 147]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.connect(f); o.start(t); o.stop(t + 5.6); }
    const d = ctx.createDelay(1); d.delayTime.value = 0.42; const fb = ctx.createGain(); fb.gain.value = 0.38;
    f.connect(g); g.connect(master); g.connect(d); d.connect(fb).connect(d); d.connect(master);
  }
  function step(surface, running) {
    if (!ctx || muted) return;
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = buf;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.value = surface === 'road' ? 700 : surface === 'stairs' ? 1500 : 1150;
    const g = ctx.createGain(), peak = (running ? 0.5 : 0.32) * (0.8 + Math.random() * 0.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(f).connect(g).connect(master); src.start(t, Math.random() * 2, 0.2);
  }
  const muteListeners = new Set();
  return {
    start, step,
    update(dt, x) {
      if (!ctx) return;
      hornTimer -= dt; lapTimer -= dt;
      if (lapTimer < 0) {                                        // a few times a second is plenty
        lapTimer = 0.3;
        const near = Math.max(0, Math.min(1, (x - 6) / 18));     // 0 in the street, 1 at the railing
        lap.g.gain.setTargetAtTime(0.02 + near * 0.3, ctx.currentTime, 0.4);
      }
      if (hornTimer < 0) { hornTimer = 50 + Math.random() * 60; if (!muted) horn(); }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.1);
      for (const fn of muteListeners) fn(muted);
      return muted;
    },
    onMute(fn) { muteListeners.add(fn); return () => muteListeners.delete(fn); },
    getContext() { return ctx; },
    getMaster() { return master; },
    get muted() { return muted; },
    suspend() { if (ctx) ctx.suspend(); }, resume() { if (ctx) ctx.resume(); },
    get running() { return !!ctx && ctx.state === 'running'; },
  };
}
