// The V10, synthesised (no recordings): ten cylinders, four-stroke, so it fires rpm / 12 times a
// second. Two detuned saws at the firing note and a sine an octave down, through a waveshaper for the
// rasp, a low-pass that opens with the throttle; intake roar (band-passed noise) rising with the revs;
// a crackle on the overrun when you lift at high revs; tyres complaining when they slip.
export function createCarAudio(audio) {
  let ctx = null, n = null;
  function init() {
    if (ctx) return true;
    ctx = audio.getContext && audio.getContext(); const bus = audio.getMusicBus && audio.getMusicBus();
    if (!ctx || !bus) { ctx = null; return false; }
    const out = ctx.createGain(); out.gain.value = 0; out.connect(bus);
    const shaper = ctx.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.6); } shaper.curve = curve;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 1.2;
    const eng = ctx.createGain(); eng.gain.value = 0.5; eng.connect(shaper).connect(lp).connect(out);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), sub = ctx.createOscillator(); o1.type = o2.type = 'sawtooth'; sub.type = 'sine';
    const g1 = ctx.createGain(), g2 = ctx.createGain(), gs = ctx.createGain(); g1.gain.value = 0.35; g2.gain.value = 0.25; gs.gain.value = 0.6;
    o1.connect(g1).connect(eng); o2.connect(g2).connect(eng); sub.connect(gs).connect(eng); o1.start(); o2.start(); sub.start();
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.8; const ng = ctx.createGain(); ng.gain.value = 0;
    noise.connect(bp).connect(ng).connect(out); noise.start();
    const tyre = ctx.createBufferSource(); tyre.buffer = nb; tyre.loop = true; tyre.playbackRate.value = 0.7;
    const tb = ctx.createBiquadFilter(); tb.type = 'bandpass'; tb.frequency.value = 1300; tb.Q.value = 6; const tg = ctx.createGain(); tg.gain.value = 0;
    tyre.connect(tb).connect(tg).connect(out); tyre.start();
    n = { out, lp, o1, o2, sub, ng, bp, tg, nb, lastThr: 0, lastRpm: 1000 };
    return true;
  }
  function crackle(t) {
    for (let i = 0; i < 4 + Math.random() * 6; i++) {
      const s = ctx.createBufferSource(); s.buffer = n.nb; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 1500; f.Q.value = 2;
      const g = ctx.createGain(), at = t + Math.random() * 0.5; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.2, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, at + 0.04);
      s.connect(f).connect(g).connect(n.out); s.start(at, Math.random(), 0.06);
    }
  }
  return {
    // per frame while the engine runs: rpm, throttle 0..1, tyre slip 0..1, level (0 = off)
    update({ rpm = 1000, throttle = 0, slip = 0, level = 1 }) {
      if (!init()) return;
      const t = ctx.currentTime, f = rpm / 12;
      n.o1.frequency.setTargetAtTime(f, t, 0.03); n.o2.frequency.setTargetAtTime(f * 1.006, t, 0.03); n.sub.frequency.setTargetAtTime(f / 2, t, 0.03);
      n.lp.frequency.setTargetAtTime(500 + throttle * 2600 + rpm * 0.25, t, 0.05);
      n.ng.gain.setTargetAtTime(level * (0.02 + throttle * 0.08) * Math.min(1, rpm / 6000), t, 0.05); n.bp.frequency.setTargetAtTime(400 + rpm * 0.18, t, 0.05);
      n.tg.gain.setTargetAtTime(level * Math.max(0, slip - 0.35) * 0.18, t, 0.08);
      n.out.gain.setTargetAtTime(level * (0.12 + throttle * 0.16), t, 0.06);
      if (n.lastThr > 0.6 && throttle < 0.1 && rpm > 5000) crackle(t);           // lifting off at high revs
      n.lastThr = throttle; n.lastRpm = rpm;
    },
    stop() { if (n) n.out.gain.setTargetAtTime(0, ctx.currentTime, 0.3); },
  };
}
