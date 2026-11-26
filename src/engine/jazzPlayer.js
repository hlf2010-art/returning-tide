// The trio, played: engine/jazzScore.js's tunes through Web Audio, synthesised (no samples):
//   piano  a hammer click, two detuned partials and an octave, decaying faster up high; the sustain
//          pedal lets comped chords ring a little
//   bass   a plucked upright: a thump, a round fundamental, a woody second partial, low-passed
//   drums  ride (filtered noise, a long shimmer), hi-hat foot, a feathered kick, brushes
//   room   a short generated reverb; applause between tunes
// Scheduling runs ahead of the clock from the game loop (update), so a slow frame never drops notes.
// It also keeps what was struck when, for the band on the stage to follow (hits).
import { makeTune, midiHz, BOOK } from './jazzScore.js';

// solo: one pianist on his own (the Peace Hotel's Jasmine Lounge at afternoon tea): the walking bass becomes his left
// hand an octave up, no drums, a slower tempo, no applause, a longer room
export function createJazzPlayer(audio, { solo = false } = {}) {
  let ctx = null, out = null, lp = null, pan = null, wet = null, noise = null;
  let tune = null, t0 = 0, idx = 0, playing = false, gap = 0, tuneNo = 0, seed = 1;
  const hits = { piano: [], lead: -1, leadMidi: 72, comp: -1, compMidi: 60, bass: -1, bassMidi: 40, ride: -1, snare: -1, kick: -1, hat: -1, tuneStart: -1, tuneEnd: -1, applause: -1 };
  const listeners = new Set();
  function init() {
    if (ctx) return true;
    ctx = audio.getContext && audio.getContext(); const bus = audio.getMusicBus && audio.getMusicBus();
    if (!ctx || !bus) { ctx = null; return false; }
    out = ctx.createGain(); out.gain.value = 0;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000;
    pan = ctx.createStereoPanner();
    const dry = ctx.createGain(); dry.gain.value = 1;
    const conv = ctx.createConvolver(); wet = ctx.createGain(); wet.gain.value = 0.22;
    const len = Math.floor(ctx.sampleRate * 1.3), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    conv.buffer = ir; if (solo) wet.gain.value = 0.32;
    lp.connect(dry).connect(pan); lp.connect(conv).connect(wet).connect(pan); pan.connect(out); out.connect(bus);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  const env = (g, t, peak, attack, decay, end) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.setTargetAtTime(0, t + attack, decay); if (end) g.gain.setTargetAtTime(0, end, 0.06); };
  function osc(type, f, t, stop, dest, detune = 0) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stop); return o; }
  function noiseHit(t, { type = 'highpass', f = 6000, q = 0.7, peak = 0.1, decay = 0.1, len = 0.6 }) {
    const s = ctx.createBufferSource(); s.buffer = noise; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); env(g, t, peak, 0.002, decay); s.connect(fl).connect(g).connect(lp); s.start(t, Math.random() * 0.5, len); }
  function piano(m, t, dur, vel) {
    const f = midiHz(m), g = ctx.createGain(), tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1400 + vel * 2600 + f * 1.5;
    const decay = Math.max(0.25, 1.1 - (m - 48) * 0.016), end = t + dur + 0.25;
    env(g, t, 0.075 * vel, 0.004, decay, t + dur); g.connect(tone).connect(lp);
    const g2 = ctx.createGain(); g2.gain.value = 0.35; g2.connect(g);
    osc('triangle', f, t, end + 0.5, g, -3); osc('sine', f, t, end + 0.5, g, 4); osc('sine', f * 2, t, end + 0.5, g2, 2);
    noiseHit(t, { type: 'bandpass', f: 2600 + f, q: 1.2, peak: 0.012 * vel, decay: 0.012, len: 0.05 });
  }
  function bass(m, t, dur, vel) {
    const f = midiHz(m), g = ctx.createGain(), tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 650;
    env(g, t, 0.22 * vel, 0.008, 0.32, t + dur); g.connect(tone).connect(lp);
    const g2 = ctx.createGain(); g2.gain.value = 0.3; g2.connect(g);
    osc('sine', f, t, t + dur + 0.5, g); osc('triangle', f * 2, t, t + dur + 0.5, g2, 5);
    noiseHit(t, { type: 'lowpass', f: 300, peak: 0.05 * vel, decay: 0.02, len: 0.08 });
  }
  function ride(t, vel) { noiseHit(t, { f: 5200, peak: 0.05 * vel, decay: 0.32, len: 1.2 }); noiseHit(t, { type: 'bandpass', f: 8800, q: 3, peak: 0.03 * vel, decay: 0.12, len: 0.4 }); }
  const hat = (t, vel) => noiseHit(t, { f: 7500, peak: 0.035 * vel, decay: 0.035, len: 0.1 });
  const snare = (t, vel) => noiseHit(t, { type: 'bandpass', f: 2200, q: 0.6, peak: 0.05 * vel, decay: 0.07, len: 0.25 });
  function kick(t, vel) { const g = ctx.createGain(); env(g, t, 0.28 * vel, 0.004, 0.06); g.connect(lp); const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.08); o.connect(g); o.start(t); o.stop(t + 0.4); }
  function applause(t, secs = 4.5) {
    // a room of people clapping: many short bright bursts, thickening then thinning
    for (let i = 0; i < secs * 38; i++) { const k = i / (secs * 38), at = t + k * secs + Math.random() * 0.05, dens = Math.sin(Math.min(1, k * 1.6) * Math.PI) ** 0.6;
      if (Math.random() > dens) continue; noiseHit(at, { type: 'bandpass', f: 1400 + Math.random() * 1600, q: 1.5, peak: 0.03 + Math.random() * 0.03, decay: 0.018, len: 0.06 }); }
    hits.applause = t;
  }
  function begin(at) {
    tuneNo++; tune = makeTune(seed * 3 + tuneNo, seed * 31 + tuneNo, solo ? { choruses: 3 } : undefined); if (solo) tune.bpm = Math.round(tune.bpm * 0.72); t0 = at; idx = 0; hits.tuneStart = at; hits.tuneEnd = at + tune.beats * 60 / tune.bpm;
    for (const fn of listeners) fn({ type: 'tune', no: tuneNo, title: tune.title, at, end: hits.tuneEnd });
  }
  return {
    get tune() { return tune; }, get tuneNo() { return tuneNo; }, get playing() { return playing; }, hits,
    now() { return ctx ? ctx.currentTime : 0; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    // start the set (seed: the night, so the same night plays the same)
    start(nightSeed = 1) { if (!init() || playing) return; seed = nightSeed; playing = true; tuneNo = 0; begin(ctx.currentTime + 0.6); },
    // (tools) jump to the end of the tune now playing
    skipToEnd() { if (!tune) return; const i = tune.events.findIndex((e) => e.part === 'end'); idx = i; t0 = ctx.currentTime + 0.3 - tune.events[i].t * 60 / tune.bpm; },
    stop() { playing = false; tune = null; if (out && ctx) out.gain.setTargetAtTime(0, ctx.currentTime, 0.4); },
    // per frame: how loud and how muffled it reaches you (0..1, Hz), and from where (pan -1..1)
    update(level = 1, cutoff = 18000, panTo = 0) {
      if (!ctx || !playing) return;
      const now = ctx.currentTime, ahead = 0.7;
      out.gain.setTargetAtTime(level, now, 0.25); lp.frequency.setTargetAtTime(cutoff, now, 0.25); pan.pan.setTargetAtTime(panTo, now, 0.25);
      wet.gain.setTargetAtTime((solo ? 0.32 : 0.22) + (1 - Math.min(1, cutoff / 6000)) * 0.2, now, 0.3);
      if (!tune) { if (now >= gap) begin(now + 0.3); return; }
      const spb = 60 / tune.bpm;
      while (idx < tune.events.length) {
        const e = tune.events[idx], t = t0 + e.t * spb;
        if (t > now + ahead) break;
        idx++;
        if (t < now - 0.05 && e.part !== 'end') continue;                       // a stall: skip, don't pile up
        const dur = e.dur * spb;
        if (solo && ['ride', 'hat', 'kick', 'snare'].includes(e.part)) continue;
        if (e.part === 'bass') { if (solo) piano(e.midi + 12, t, dur * 0.9, e.vel * 0.55); else bass(e.midi, t, dur, e.vel); hits.bass = t; hits.bassMidi = e.midi; }
        else if (e.part === 'lead') { piano(e.midi, t, dur, e.vel); hits.lead = t; hits.leadMidi = e.midi; }
        else if (e.part === 'comp') { for (const n of e.notes) piano(n, t + Math.random() * 0.012, dur, e.vel * 0.8); hits.comp = t; hits.compMidi = e.notes[0]; }
        else if (e.part === 'ride') { ride(t, e.vel); hits.ride = t; }
        else if (e.part === 'hat') { hat(t, e.vel); hits.hat = t; }
        else if (e.part === 'kick') { kick(t, e.vel); hits.kick = t; }
        else if (e.part === 'snare') { snare(t, e.vel); hits.snare = t; }
        else if (e.part === 'end') {
          if (!solo) applause(t - 1.2); const no = tuneNo; tune = null; gap = t + (solo ? 3 : 5) + Math.random() * 4;
          for (const fn of listeners) fn({ type: 'end', no, at: t });
          break;
        }
      }
    },
    books: BOOK.length,
  };
}
