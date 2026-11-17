// What the phone plays: voice notes, video clips and the other side of a call.
//   voice notes  the person's own recorded voice (public/voice, the clips engine/voice.js plays; in
//                the language they'd speak, else the other one). A note nobody recorded shows its
//                transcript and plays a short soft voicemail cue instead; a voicemail left outdoors
//                (meta.ambience 'wind') plays its river wind.
//   videos       a moving clip drawn in a canvas (nobody shot real footage): play / pause, a progress
//                bar you can click to seek, and a soft soundtrack of its own
//   calls        each line in the caller's recorded voice down a phone line, a faint line hiss under
//                it; a line with no recording is carried by its subtitle alone
// Never the browser's synthetic speech (window.speechSynthesis): it isn't used anywhere here.
// Everything goes out through the game's voice bus (so mute and pause apply).

// ---- pure helpers (node-tested) ----
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const VIDEO_TAG = /^\s*\[(视频|video|Video)\]\s*/;
export const isVideo = (m) => !!m && (m.kind === 'video' || (m.kind === 'text' && VIDEO_TAG.test(m.text || '')));
export const videoCaption = (text) => String(text || '').replace(VIDEO_TAG, '');
// how long a clip runs (seconds): steady per message
export const videoLength = (m) => (m.meta && m.meta.secs) || 9 + (hashStr(m.id || m.text || '') % 7);
// what it shows: music (Momo playing) or the street at night (someone filmed it)
export const videoStyle = (m) => (m.meta && m.meta.style) || (/solo|排练|琴|钢琴|弹|piano|rehears|gig|trio/i.test(m.text || '') || (m.from === 'momo' && !/纪白|Ji Bai/.test(m.text || '')) ? 'music' : 'street');
// a voice note's nominal length (seconds), as the bubble shows it
export const voiceSecs = (m) => (m.dur ? Math.max(1, Math.round(m.dur)) : (m.meta && m.meta.secs) || Math.max(2, Math.round((m.text || '').length / 4)));
// the notes of a music clip: [time (s), key 0..13] — the same list drives the sound and the lit keys
export function videoNotes(m) {
  const len = videoLength(m); let s = hashStr(`${m.id}|notes`) || 1;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  const out = []; let t = 0.35, k = 5;
  while (t < len - 0.4) {
    k = Math.max(0, Math.min(13, k + [-2, -1, -1, 1, 1, 2, 3, -3][Math.floor(rnd() * 8)]));
    out.push([t, k]); t += [0.25, 0.375, 0.5, 0.5, 0.75][Math.floor(rnd() * 5)];
  }
  return out;
}
// C major pentatonic-ish across two octaves (white keys only)
const KEY_HZ = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568];
export const fmtTime = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export function createPhoneMedia({ audio = null, voice = null, enText = (t) => t, onChange = null } = {}) {
  let own = null, noise = null, raf = 0, iv = 0, line = null, hiss = null;
  const buffers = new Map();
  const vpos = {};                                   // where each video was left (s)
  // what's playing: { id, kind: 'voice'|'video', dur, t0 (ctx time at position 0), recorded, nodes, stopAt }
  let cur = null;
  const stats = { voice: 0, recorded: 0, cue: 0, video: 0, lines: 0, lineClips: 0 };

  function ctx() {
    const c = (audio && audio.getContext && audio.getContext()) || own || (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext) ? (own = new (window.AudioContext || window.webkitAudioContext)()) : null);
    if (c && c.state === 'suspended') c.resume().catch(() => {});      // called from a tap or a key: allowed to start
    return c;
  }
  const out = (c) => (c !== own && audio && audio.getVoiceBus && audio.getVoiceBus()) || c.destination;
  function noiseBuf(c) {
    if (noise && noise.sampleRate === c.sampleRate) return noise;
    const n = c.sampleRate * 4, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 + w * 0.03; }
    return (noise = b);
  }
  function clipUrl(who, zh, en) {
    if (!voice || !voice.clipUrl) return null;
    const pref = voice.langFor ? voice.langFor(who, zh, en) : 'zh';
    return voice.clipUrl(pref, pref === 'zh' ? zh : en) || voice.clipUrl(pref === 'zh' ? 'en' : 'zh', pref === 'zh' ? en : zh);
  }
  function decode(c, url) {
    if (buffers.has(url)) return buffers.get(url);
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((a) => c.decodeAudioData(a));
    buffers.set(url, p); p.catch(() => buffers.delete(url));
    return p;
  }
  function phoneLine(c, node) {                       // 300-3400 Hz
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300;
    node.connect(hp); hp.connect(lp); return lp;
  }
  function ping(c, dest, t, f, g, d) {
    const o = c.createOscillator(), e = c.createGain(); o.type = 'sine'; o.frequency.value = f;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.012); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(e); e.connect(dest); o.start(t); o.stop(t + d + 0.05); return o;
  }
  function loopNoise(c, dest, t) { const s = c.createBufferSource(); s.buffer = noiseBuf(c); s.loop = true; s.connect(dest); s.start(t, Math.random() * 3); return s; }

  // ---- what's playing ----
  // a voice note follows the audio clock (the sound itself); a clip's pictures the wall clock, so they
  // keep moving whatever the audio device does
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  const position = () => (cur ? Math.min(cur.dur, Math.max(0, cur.wall0 != null ? now() - cur.wall0 : ctx().currentTime - cur.t0)) : 0);
  function halt(keepPos) {
    if (!cur) return;
    const c = cur;
    if (c.kind === 'video' && keepPos) vpos[c.id] = position() >= c.dur - 0.05 ? 0 : position();
    cur = null;
    for (const n of c.nodes) { try { n.onended = null; n.stop(); } catch { /* not started / done */ } }
    if (c.master) { try { c.master.disconnect(); } catch { /* gone */ } }
  }
  function finish() { const c = cur; halt(false); if (c && c.kind === 'video') vpos[c.id] = 0; if (c && c.onEnd) c.onEnd(); if (onChange) onChange(); }
  // frames for the clip; a steady timer too, so the bar and the end never wait on a slow frame
  function tick() {
    if (!cur) { clearInterval(iv); iv = 0; paintAll(); return; }
    const p = position();
    if (p >= cur.dur) { finish(); return; }
    paintProgress(cur.id, p, cur.dur);
    if (cur.kind === 'video') drawVideo(cur.m, p);
  }
  function loop() { raf = 0; tick(); if (cur) raf = requestAnimationFrame(loop); }
  const kick = () => {
    if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
    if (!iv) iv = setInterval(tick, 120);
  };

  // ---- voice notes ----
  async function playVoice(m, { onEnd } = {}) {
    halt(true);
    const c = ctx(); if (!c) return null;
    const zh = m.text || '', en = enText(zh), url = clipUrl(m.from, zh, en);
    const master = c.createGain(); master.connect(out(c));
    const me = { id: m.id, kind: 'voice', m, master, nodes: [], recorded: !!url, dur: voiceSecs(m), t0: c.currentTime, onEnd, loading: !!url };
    cur = me; stats.voice++; m.played = true; if (onChange) onChange();
    if (url) {
      try {
        const buf = await decode(c, url);
        if (cur !== me) return me;                                       // tapped something else meanwhile
        const s = c.createBufferSource(); s.buffer = buf; s.connect(master);
        const t = c.currentTime + 0.02; s.start(t); me.nodes.push(s); me.t0 = t; me.dur = buf.duration; me.loading = false; m.dur = buf.duration;
        stats.recorded++; kick(); if (onChange) onChange();
        return me;
      } catch (e) { console.warn('phone voice note:', e.message || e); if (cur !== me) return me; me.recorded = false; me.loading = false; }
    }
    // nobody recorded it: the transcript carries the words; a soft voicemail cue (or the wind it was left in)
    m.transcribed = true; stats.cue++;
    const t = c.currentTime + 0.02, dur = me.dur; me.t0 = t;
    me.nodes.push(ping(c, master, t, 880, 0.05, 0.35), ping(c, master, t + 0.16, 1174.7, 0.04, 0.5));
    const bed = c.createGain(); bed.connect(master);
    if (m.meta && m.meta.ambience === 'wind') {                        // nine seconds of river wind down a phone line
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6;
      const whistle = c.createBiquadFilter(); whistle.type = 'bandpass'; whistle.frequency.value = 1250; whistle.Q.value = 6;
      const wg = c.createGain(); wg.gain.value = 0.18;
      const src = loopNoise(c, bp, t); src.connect(whistle); whistle.connect(wg); bp.connect(bed); wg.connect(bed); me.nodes.push(src);
      bed.gain.setValueAtTime(0, t); bed.gain.linearRampToValueAtTime(0.32, t + 0.5);
      for (let k = 0.9; k < dur - 0.6; k += 0.6 + Math.random() * 0.8) { bed.gain.linearRampToValueAtTime(0.16 + Math.random() * 0.34, t + k); bp.frequency.linearRampToValueAtTime(380 + Math.random() * 420, t + k); }
      bed.gain.linearRampToValueAtTime(0, t + dur);
    } else {                                                          // a faint, open line under the transcript
      const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1800; hp.Q.value = 0.4;
      const src = loopNoise(c, hp, t); hp.connect(bed); me.nodes.push(src);
      bed.gain.setValueAtTime(0, t); bed.gain.linearRampToValueAtTime(0.025, t + 0.3); bed.gain.setValueAtTime(0.025, t + dur - 0.4); bed.gain.linearRampToValueAtTime(0, t + dur);
    }
    me.nodes.push(ping(c, master, t + dur - 0.25, 660, 0.03, 0.3));
    kick(); if (onChange) onChange();
    return me;
  }

  // ---- videos ----
  function playVideo(m) {
    if (cur && cur.id === m.id) { halt(true); if (onChange) onChange(); return null; }   // tap again: pause
    halt(true);
    const c = ctx(); if (!c) return null;
    const dur = videoLength(m), from = vpos[m.id] || 0, t = c.currentTime + 0.02, t0 = t - from;
    const master = c.createGain(); master.connect(out(c));
    const me = { id: m.id, kind: 'video', m, master, nodes: [], dur, t0, wall0: now() - from, recorded: false };
    master.gain.setValueAtTime(0, t); master.gain.linearRampToValueAtTime(1, t + 0.15);
    if (videoStyle(m) === 'music') {                                  // the solo, on a soft electric piano
      const room = c.createBiquadFilter(); room.type = 'lowpass'; room.frequency.value = 2600; room.connect(master);
      for (const [nt, k] of videoNotes(m)) {
        if (nt < from) continue;
        const at = t0 + nt, f = KEY_HZ[k];
        me.nodes.push(ping(c, room, at, f, 0.06, 1.1), ping(c, room, at, f * 2, 0.015, 0.5));
      }
      const hum = c.createGain(); hum.gain.value = 0.012; hum.connect(master); me.nodes.push(loopNoise(c, hum, t));
    } else {                                                          // the street at night through a phone mic
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.5;
      const g = c.createGain(); g.gain.value = 0.09; bp.connect(g); g.connect(master); me.nodes.push(loopNoise(c, bp, t));
    }
    cur = me; stats.video++; m.played = true; kick(); if (onChange) onChange();
    return me;
  }
  function seek(m, frac) {
    const dur = videoLength(m), p = Math.max(0, Math.min(0.98, frac)) * dur;
    const was = cur && cur.id === m.id;
    halt(false); vpos[m.id] = p;
    if (was) playVideo(m); else { drawVideo(m, p); paintProgress(m.id, p, dur); }
  }

  // ---- calls ----
  function callStart() {
    const c = ctx(); if (!c || hiss) return;
    const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2200; hp.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.006; hp.connect(g); g.connect(out(c));
    hiss = { src: loopNoise(c, hp, c.currentTime), g };
  }
  function callEnd() {
    if (line) { const l = line; line = null; try { l.src.onended = null; l.src.stop(); } catch { /* done */ } clearTimeout(l.timer); }
    if (hiss) { try { hiss.src.stop(); } catch { /* done */ } hiss = null; }
  }
  // one line of the caller's: their recorded voice where there is one; else the subtitle's own timing
  async function say(text, who, done) {
    if (line) { try { line.src && line.src.stop(); } catch { /* done */ } clearTimeout(line.timer); }
    const me = { src: null, timer: 0 }; line = me; stats.lines++;
    const end = () => { if (line === me) { line = null; done && done(); } };
    const c = ctx(), url = c && clipUrl(who, text, enText(text));
    if (url) {
      try {
        const buf = await decode(c, url); if (line !== me) return;
        const s = c.createBufferSource(); s.buffer = buf;
        const g = c.createGain(); g.gain.value = 1.1; phoneLine(c, s).connect(g); g.connect(out(c));
        s.onended = () => setTimeout(end, 350); s.start(); me.src = s; stats.lineClips++;
        return;
      } catch (e) { console.warn('phone call line:', e.message || e); }
    }
    const shown = enText(text) || text, secs = Math.max(1.6, Math.min(9, /[一-鿿]/.test(text) ? text.length / 4.2 : shown.length / 13));
    me.timer = setTimeout(end, secs * 1000);
  }

  // ---- drawing ----
  function els(sel) { return typeof document === 'undefined' ? [] : document.querySelectorAll(sel); }
  function paintProgress(id, p, dur) {
    for (const u of els(`[data-prog="${id}"]`)) u.style.width = `${Math.min(100, (p / dur) * 100).toFixed(1)}%`;
    for (const t of els(`[data-ptime="${id}"]`)) t.textContent = t.dataset.kind === 'video' ? `${fmtTime(p)} / ${fmtTime(dur)}` : `${Math.max(0, Math.ceil(dur - p))}″`;
  }
  function paintAll() {
    for (const cv of els('canvas[data-vid]')) {
      const m = cv.__msg; if (!m) continue;
      const p = cur && cur.id === m.id ? position() : vpos[m.id] != null ? vpos[m.id] : 0;
      drawVideo(m, p || Math.min(1.2, videoLength(m) * 0.1)); paintProgress(m.id, p, videoLength(m));
    }
  }
  function drawVideo(m, p) {
    for (const cv of els(`canvas[data-vid="${m.id}"]`)) {
      const g = cv.getContext('2d', { willReadFrequently: true }); if (!g) continue;   // a small canvas drawn on the CPU: no GPU shader to compile mid-clip
      const w = cv.width, h = cv.height, seed = hashStr(m.id || '');
      g.save();
      if (videoStyle(m) === 'music') drawMusic(g, w, h, p, m, seed); else drawStreet(g, w, h, p, seed);
      g.restore();
    }
  }
  function drawMusic(g, w, h, t, m, seed) {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#140c1c'); bg.addColorStop(1, '#2b1a0e'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const notes = videoNotes(m); let k = -1, age = 9;
    for (const [nt, nk] of notes) { if (nt <= t) { k = nk; age = t - nt; } else break; }
    g.translate(Math.sin(t * 1.3) * w * 0.006, Math.cos(t * 0.9) * h * 0.004);          // handheld
    const glow = 0.55 + 0.35 * Math.exp(-age * 3);
    const sp = g.createRadialGradient(w * 0.5, -h * 0.05, 4, w * 0.5, h * 0.35, h * 0.75);
    sp.addColorStop(0, `rgba(255,214,150,${0.55 * glow})`); sp.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = sp; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {                                    // bokeh drifting behind
      const r = (seed >> (i % 24)) & 7, x = ((i * 97 + r * 13 + t * (6 + (i % 4) * 3)) % (w + 40)) - 20, y = h * (0.08 + ((i * 37) % 50) / 100);
      g.fillStyle = `rgba(${i % 3 ? '255,180,90' : '140,170,255'},${0.08 + 0.06 * Math.sin(t * 1.7 + i)})`; g.beginPath(); g.arc(x, y, w * (0.03 + (i % 3) * 0.015), 0, 7); g.fill();
    }
    // the player, swaying
    const sx = w * 0.5 + Math.sin(t * 2.1) * w * 0.02, sy = h * 0.5;
    g.fillStyle = '#07050a'; g.beginPath(); g.arc(sx, sy - h * 0.12, w * 0.085, 0, 7); g.fill();
    g.beginPath(); g.ellipse(sx, sy + h * 0.06, w * 0.2, h * 0.14, 0, Math.PI, 0); g.fill(); g.fillRect(sx - w * 0.2, sy + h * 0.06, w * 0.4, h * 0.08);
    // the keyboard, the note being played lit
    const ky = h * 0.72, kh = h * 0.28, kw = w / 14;
    g.fillStyle = '#e9e4da'; g.fillRect(0, ky, w, kh);
    for (let i = 0; i < 14; i++) {
      if (i === k) { g.fillStyle = `rgba(255,196,90,${0.4 + 0.6 * Math.exp(-age * 4)})`; g.fillRect(i * kw + 1, ky, kw - 2, kh); }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * kw, ky, 1, kh);
      if (![2, 6, 9, 13].includes(i)) { g.fillStyle = '#111'; g.fillRect(i * kw + kw * 0.68, ky, kw * 0.64, kh * 0.58); }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, ky - 3, w, 3);
  }
  function drawStreet(g, w, h, t, seed) {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0a0e1c'); bg.addColorStop(1, '#1a1622'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.translate(Math.sin(t * 3.1) * w * 0.012 + Math.sin(t * 7.3) * w * 0.004, Math.cos(t * 2.6) * h * 0.01);   // a hand holding a phone up
    const signs = [['#ff3d8b', 0.08, 0.12, 0.3], ['#38e1ff', 0.6, 0.08, 0.32], ['#ffcf40', 0.3, 0.3, 0.18], ['#ff6a3d', 0.72, 0.34, 0.2]];
    for (const [col, x, y, sw] of signs) {
      const flick = 0.75 + 0.25 * Math.sin(t * (5 + x * 9) + seed % 7);
      g.shadowColor = col; g.shadowBlur = w * 0.08; g.fillStyle = col; g.globalAlpha = flick; g.fillRect(w * x, h * y, w * sw, h * 0.05);
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {                                     // street lights, out of focus
      const x = (i / 8) * w, y = h * 0.5 + Math.sin(i * 2.3) * h * 0.04;
      g.fillStyle = 'rgba(255,220,160,0.14)'; g.beginPath(); g.arc(x, y, w * 0.05, 0, 7); g.fill();
    }
    g.fillStyle = '#2a2530'; g.fillRect(0, h * 0.78, w, h * 0.22);                       // the pavement, wet
    g.fillStyle = 'rgba(255,61,139,0.12)'; g.fillRect(w * 0.08, h * 0.8, w * 0.3, h * 0.2);
    for (let i = 0; i < 6; i++) {                                     // people crossing the frame
      const dir = i % 2 ? 1 : -1, speed = 0.06 + (i % 3) * 0.035, x = ((((i * 0.37 + dir * t * speed) % 1.3) + 1.3) % 1.3 - 0.15) * w;
      const ph = h * (0.3 + (i % 3) * 0.05), y = h * 0.8 - ph, bob = Math.abs(Math.sin(t * 6 + i)) * h * 0.01;
      g.fillStyle = '#05060a'; g.beginPath(); g.arc(x, y - bob, w * 0.04, 0, 7); g.fill();
      g.fillRect(x - w * 0.045, y + w * 0.04 - bob, w * 0.09, ph - w * 0.04);
    }
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `${Math.round(h * 0.05)}px sans-serif`; g.fillText(`REC ${fmtTime(t)}`, w * 0.06, h * 0.08);
    if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(w * 0.035, h * 0.065, h * 0.015, 0, 7); g.fill(); }
  }

  return {
    playVoice, playVideo, seek, say, callStart, callEnd,
    toggleVoice(m, o) { if (cur && cur.id === m.id) { halt(false); if (onChange) onChange(); return null; } return playVoice(m, o); },
    stop() { halt(true); },
    isPlaying: (id) => !!cur && (id == null || cur.id === id),
    get current() { return cur ? { id: cur.id, kind: cur.kind, position: position(), duration: cur.dur, recorded: cur.recorded, loading: !!cur.loading } : null; },
    get inLine() { return !!line; },
    get stats() { return { ...stats }; },
    // after the phone redraws: posters on the video tiles, the bars where they were
    paint(host, find) {
      if (!host) return;
      for (const cv of host.querySelectorAll('canvas[data-vid]')) if (!cv.__msg && find) cv.__msg = find(cv.dataset.vid);
      paintAll(); if (cur) { paintProgress(cur.id, position(), cur.dur); kick(); }
    },
  };
}
