// The city's sound by place, played (engine/soundscape.js decides what, where and how loud). Built on
// engine/audio.js's graph: street sounds go into its environment bus (so they duck under speech and are
// muffled indoors and by noise cancelling), the reverb's return goes straight to the output.
//
//   reverb       one convolver (a generated stone-hall impulse), fed by your footsteps and, more
//                lightly, the street; how much by where you stand (the arcades, the stairwells)
//   traffic bed  a low wash and tyre hiss placed where the nearby traffic is, as loud as it is
//   horns        a short tap from a held-up car, now and then (rare: horns are banned here)
//   bus sigh     the air brakes as a bus comes to rest
//   water        the river slapping at the wall, near the railing
//   boat horns   from the boats on the river, rare
//   door chimes  a shop's door greeter as someone in the crowd goes in or comes out
//   metro PA     the station's announcements rising out of the exits at Henan Road (recorded clips)
//   talkers      a few voices placed on the groups standing nearest (grains of the crowd's murmur)
//   the clock    the Customs House: "The East Is Red" on the quarters, the hour struck
// Everything is synthesised here except the murmur (tools/voice/walla.py) and the PA clips (Kokoro).
import { riverExposure, windExposure, trafficBed, hornRate, HORN, BUS_SIGH, BOAT_HORN, reverbAt, pickTalkers,
  DOOR_CHIME, METRO_PA, paGain, CLOCK, clockChime, clockGain, EAST_IS_RED, degreeHz, PAYBOX, payTokens, crowdPayment } from './soundscape.js';

export function createAmbience(audio, { clipUrl = null } = {}) {
  let ctx = null, env = null, sfx = null, out = null;
  let brown = null, white = null, rev = null, bed = null;
  const S = { pays: 0, horns: 0, sighs: 0, slaps: 0, boatHorns: 0, chimes: 0, pa: 0, clock: 0, strikes: 0, talkerGrains: 0 };
  const shots = [];                        // one-shots sounding now: { id, kind, x, y, z, until, level, ref }
  let lastHorn = -1e9, lastBoat = -1e9, slapIn = 2, paIn = 20, lastMinute = null, tNow = 0;
  const busV = new Map(), shopPhase = new Map(), lastChime = new Map();
  const talkers = [];
  const paBufs = new Map(), payBufs = new Map(), lastPay = new Map();
  let lastL = { x: 0, z: 0 };

  function makeNoise(seconds, brownish) {
    const n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brownish) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    const xf = Math.floor(ctx.sampleRate * 0.1);                         // fold the end into the start: no click at the loop
    for (let i = 0; i < xf; i++) { const k = i / xf; d[i] = d[i] * k + d[n - xf + i] * (1 - k); }
    return b;
  }
  // a stone hall's impulse: a few early reflections, then a dense decaying tail, darker as it dies
  function impulse(seconds = 2.4) {
    const n = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / ctx.sampleRate, k = Math.exp(-t * 6.9 / seconds);    // -60 dB at `seconds`
        const a = 0.25 + 0.7 * Math.exp(-t * 3);                            // the tail loses its top end
        lp += a * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * k * (t < 0.012 ? t / 0.012 : 1);
      }
      for (const [ms, g] of [[11, 0.5], [19, 0.36], [29, 0.3], [43, 0.22], [61, 0.16]]) { const i = Math.floor((ms + ch * 3.7) * ctx.sampleRate / 1000); if (i < n) d[i] += g * (ch ? -1 : 1); }
    }
    return b;
  }
  const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filt = (type, f, q = 0.7) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  function panAt(x, y, z, { ref = 6, rolloff = 1, model = 'equalpower', linear = false } = {}) {
    const p = ctx.createPanner(); p.panningModel = model;
    if (linear) { p.distanceModel = 'linear'; p.refDistance = 1; p.maxDistance = 1e4; p.rolloffFactor = 0; }   // (loudness is ours)
    else { p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = 1e4; }
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    return p;
  }
  const att = (d, ref, rolloff) => ref / (ref + rolloff * (Math.max(d, ref) - ref));   // what an inverse panner does
  const shot = (o, secs) => { shots.push({ ...o, until: tNow + secs }); };

  function build() {
    ctx = audio.getContext(); env = audio.getEnvBus && audio.getEnvBus(); sfx = audio.getSfxBus && audio.getSfxBus(); out = audio.getOutBus && audio.getOutBus();
    if (!ctx || !env || !sfx || !out) { ctx = null; return false; }
    brown = makeNoise(4, true); white = makeNoise(2, false);
    // reverb: footsteps (sfx) and the street (env) -> one convolver -> a tone filter -> the output
    const conv = ctx.createConvolver(); conv.buffer = impulse(2.4);
    const sfxSend = gain(0), envSend = gain(0), tone = filt('lowpass', 3000, 0.5), ret = gain(0.9);
    sfx.connect(sfxSend); env.connect(envSend); sfxSend.connect(conv); envSend.connect(conv); conv.connect(tone).connect(ret).connect(out);
    rev = { sfxSend, envSend, tone, wet: 0, id: null };
    // the traffic bed: a low wash and a band of tyre hiss, placed where the traffic is (loudness: ours)
    const p = panAt(0, 0.6, 0, { linear: true }); p.connect(env);
    const low = filt('lowpass', 260, 0.6), hiss = filt('bandpass', 1100, 0.5), g = gain(0), hg = gain(0);
    const s1 = ctx.createBufferSource(); s1.buffer = brown; s1.loop = true; s1.playbackRate.value = 0.8; s1.connect(low).connect(g).connect(p); s1.start(0, Math.random() * 3);
    const s2 = ctx.createBufferSource(); s2.buffer = white; s2.loop = true; s2.connect(hiss).connect(hg).connect(p); s2.start(0, Math.random());
    bed = { p, g, hg, level: 0, count: 0, x: 0, z: 0 };
    return true;
  }
  function place(p, x, y, z, tau = 0.2) {
    const t = ctx.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, tau); p.positionY.setTargetAtTime(y, t, tau); p.positionZ.setTargetAtTime(z, t, tau); } else p.setPosition(x, y, z);
  }

  // ---- one-shots ----
  function carHorn(v) {
    S.horns++;
    const t = ctx.currentTime + 0.02, p = panAt(v.x, 1, v.z, { ref: 8, rolloff: 1.2 }), f = filt('bandpass', 850, 0.8), g = gain(0);
    const taps = Math.random() < 0.75 ? [[0, 0.16]] : [[0, 0.12], [0.2, 0.18]];                 // a tap, now and then two
    const pitch = v.model === 'bus' ? 0.6 : 0.9 + Math.random() * 0.25;
    for (const [at, len] of taps) {
      g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(0.12, t + at + 0.015); g.gain.setValueAtTime(0.12, t + at + len); g.gain.linearRampToValueAtTime(0, t + at + len + 0.04);
      for (const hz of [415, 498]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz * pitch; o.connect(f); o.start(t + at); o.stop(t + at + len + 0.06); }
    }
    f.connect(g).connect(p).connect(env);
    shot({ id: `horn:${v.id}`, kind: 'horn', x: v.x, y: 1, z: v.z, level: 0.12, ref: 8, rolloff: 1.2 }, 0.6);
  }
  function busSigh(v) {
    S.sighs++;
    const t = ctx.currentTime + 0.02, p = panAt(v.x, 0.8, v.z, { ref: 6, rolloff: 1.2 }), s = ctx.createBufferSource(); s.buffer = white;
    const f = filt('highpass', 2600, 0.6), g = gain(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    s.connect(f).connect(g).connect(p).connect(env); s.start(t); s.stop(t + 1.4);
    shot({ id: `sigh:${v.id}`, kind: 'bus', x: v.x, y: 0.8, z: v.z, level: 0.16, ref: 6, rolloff: 1.2 }, 1.3);
  }
  function slap(x, z) {
    S.slaps++;
    const t = ctx.currentTime + 0.01, p = panAt(x, -1.5, z, { ref: 4, rolloff: 1.4 }), s = ctx.createBufferSource(); s.buffer = brown;
    const f = filt('bandpass', 320 + Math.random() * 380, 1.4), g = gain(0), len = 0.25 + Math.random() * 0.35;
    s.playbackRate.value = 1.5 + Math.random();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f).connect(g).connect(p).connect(env); s.start(t, Math.random() * 3); s.stop(t + len + 0.05);
  }
  function boatHorn(b) {
    S.boatHorns++;
    const t = ctx.currentTime + 0.05, p = panAt(b.x, 4, b.z, { ref: 60, rolloff: 1 }), f = filt('lowpass', 600, 0.7), g = gain(0);
    const len = 1.2 + Math.random() * 1.4, base = 0.9 + Math.random() * 0.2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.2); g.gain.setValueAtTime(0.3, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.6);
    for (const hz of [110, 165]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz * base; o.connect(f); o.start(t); o.stop(t + len + 0.7); }
    f.connect(g).connect(p).connect(env);
    shot({ id: 'boat-horn', kind: 'boat', x: b.x, y: 4, z: b.z, level: 0.3, ref: 60, rolloff: 1 }, len + 0.6);
  }
  function chime(x, z) {
    S.chimes++;
    const t = ctx.currentTime + 0.02, p = panAt(x, 2.4, z, { ref: 3, rolloff: 1.3 }), g = gain(1);
    for (const [hz, at] of DOOR_CHIME.notes) {
      const o = ctx.createOscillator(), e = gain(0); o.type = 'sine'; o.frequency.value = hz;
      e.gain.setValueAtTime(0, t + at); e.gain.linearRampToValueAtTime(0.12, t + at + 0.01); e.gain.exponentialRampToValueAtTime(0.0008, t + at + 0.9);
      o.connect(e).connect(g); o.start(t + at); o.stop(t + at + 1);
    }
    g.connect(p).connect(env);
    shot({ id: `chime:${Math.round(x)}`, kind: 'shop', x, y: 2.4, z, level: 0.12, ref: 3, rolloff: 1.3 }, 1.3);
  }
  async function announce(at, lx, lz) {
    if (!clipUrl) return;
    const text = METRO_PA.lines[Math.floor(Math.random() * METRO_PA.lines.length)], url = clipUrl('zh', text);
    if (!url) return;
    try {
      if (!paBufs.has(url)) paBufs.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)));
      const buf = await paBufs.get(url);
      const d = Math.hypot(at.x - lx, at.z - lz), lvl = paGain(d);
      if (lvl < 0.005) return;
      S.pa++;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const hp = filt('highpass', 380, 0.7), lp = filt('lowpass', 3400, 0.7), pk = filt('peaking', 1800, 1); pk.gain.value = 5;   // a ceiling speaker down a stairwell
      const g = gain(lvl), p = panAt(at.x, at.y + 3, at.z, { linear: true }), send = gain(0.5);
      s.connect(hp).connect(lp).connect(pk).connect(g).connect(p).connect(env);
      g.connect(send).connect(rev.sfxSend);                                                  // it rings in the stairwell
      s.start();
      shot({ id: `metro-pa:${at.id}`, kind: 'announcement', x: at.x, y: at.y + 3, z: at.z, at: (x, z) => paGain(Math.hypot(at.x - x, at.z - z)) }, buf.duration);
    } catch { /* no clip: nothing */ }
  }
  // the counter's payment speaker: "支付宝到账二十五元", the recorded pieces back to back through a small
  // plastic box on the counter (public/ambience/pay/, tools/voice/paybox.py)
  const payBuf = (id) => { const url = `./ambience/pay/${id}.mp3`; if (!payBufs.has(url)) payBufs.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))); return payBufs.get(url); };
  async function payment(x, z, { amount, method }, { own = false } = {}) {
    if (!ctx) return;
    const k = `${Math.round(x)}:${Math.round(z)}`;
    if (Math.hypot(x - lastL.x, z - lastL.z) > PAYBOX.range || (!own && tNow - (lastPay.get(k) ?? -1e9) < PAYBOX.minGap)) return;
    lastPay.set(k, tNow);
    try {
      const bufs = await Promise.all(payTokens(amount, method).map(payBuf));
      S.pays++;
      const t0 = ctx.currentTime + 0.05; let t = t0;
      const hp = filt('highpass', 520, 0.8), lp = filt('lowpass', 3800, 0.8), pk = filt('peaking', 2300, 1.2); pk.gain.value = 6;
      const g = gain(own ? 0.6 : 0.42), p = panAt(x, 1.1, z, { ref: 2.5, rolloff: 1.4 });
      hp.connect(lp).connect(pk).connect(g).connect(p).connect(env);
      for (const b of bufs) { const s = ctx.createBufferSource(); s.buffer = b; s.connect(hp); s.start(t); t += b.duration + PAYBOX.gap; }
      shot({ id: `pay:${k}`, kind: 'shop', x, y: 1.1, z, level: 0.42, ref: 2.5, rolloff: 1.4 }, t - t0);
      setTimeout(() => { try { p.disconnect(); } catch { /* gone */ } }, (t - t0 + 2) * 1000);
    } catch { /* no clips: nothing */ }
  }
  // a bell: a struck note with a bell's partials (hum, prime, tierce, quint, nominal), each dying away
  function bell(t, hz, level, dest, big = false) {
    const parts = big ? [[0.5, 1, 9], [1, 0.8, 6], [1.2, 0.45, 4], [1.5, 0.3, 3.5], [2, 0.5, 3], [2.5, 0.2, 2], [3, 0.12, 1.4]]
      : [[1, 1, 2.8], [2.76, 0.42, 1.3], [5.4, 0.22, 0.7], [8.93, 0.1, 0.4]];                 // the tune: a tubular chime's partials
    for (const [m, a, decay] of parts) {
      const o = ctx.createOscillator(), e = gain(0); o.type = 'sine'; o.frequency.value = hz * m * (1 + (Math.random() - 0.5) * 0.002);
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(level * a, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0005, t + decay);
      o.connect(e).connect(dest); o.start(t); o.stop(t + decay + 0.05);
    }
  }
  function clock(c, lx, lz) {
    const d = Math.hypot(CLOCK.x - lx, CLOCK.z - lz), lvl = clockGain(d, lx, lz);
    if (lvl < 0.01) return;
    S.clock++;
    const t0 = ctx.currentTime + 0.1, p = panAt(CLOCK.x, CLOCK.y, CLOCK.z, { linear: true }), g = gain(lvl), air = filt('lowpass', Math.max(1800, 12000 - d * 18), 0.5);
    g.connect(air).connect(p).connect(env);
    const echo = ctx.createDelay(1); echo.delayTime.value = 0.38; const eg = gain(0.22); g.connect(echo).connect(eg).connect(air);   // off the façades across the road
    let t = t0;
    for (const section of EAST_IS_RED.slice(0, c.sections)) for (const [deg, beats] of section) { bell(t, degreeHz(deg, CLOCK.bellHz), 0.16, g); t += beats * CLOCK.tuneBeat; }
    if (c.sections) t += 1.6;
    for (let k = 0; k < c.strikes; k++) { bell(t, CLOCK.bellHz, 0.34, g, true); t += CLOCK.strikeGap; S.strikes++; }
    shot({ id: 'customs-clock', kind: 'clock', x: CLOCK.x, y: CLOCK.y, z: CLOCK.z, at: (x, z) => 0.3 * clockGain(Math.hypot(CLOCK.x - x, CLOCK.z - z), x, z) }, t - t0 + 6);
    setTimeout(() => { try { p.disconnect(); } catch { /* gone */ } }, (t - t0 + 12) * 1000);
  }

  // talkers: a few voices placed on the people standing or in company nearest you, each a short grain
  // of the crowd's murmur through a voice band, faded in and out, then another
  function talkerSlot() {
    const p = panAt(0, 1.6, 0, { ref: 2, rolloff: 1.3, model: 'HRTF' }), band = filt('bandpass', 1100, 0.6), g = gain(0);
    band.connect(g).connect(p).connect(env);
    return { p, band, g, who: null, until: 0, rest: Math.random() * 2, src: null };
  }
  function grain(slot, buf, who) {
    const t = ctx.currentTime, len = 2.5 + Math.random() * 3, s = ctx.createBufferSource();
    s.buffer = buf; s.playbackRate.value = 0.92 + Math.random() * 0.16; s.connect(slot.band);
    slot.g.gain.cancelScheduledValues(t); slot.g.gain.setValueAtTime(0, t); slot.g.gain.linearRampToValueAtTime(0.32, t + 0.35); slot.g.gain.setValueAtTime(0.32, t + len - 0.4); slot.g.gain.linearRampToValueAtTime(0, t + len);
    s.start(t, Math.random() * Math.max(0, buf.duration - len - 1)); s.stop(t + len + 0.05);
    place(slot.p, who.x, (who.y || 0) + 1.6, who.z, 0.05);
    slot.who = who; slot.until = tNow + len; slot.rest = 0.6 + Math.random() * 2.5; S.talkerGrains++;
  }

  return {
    stats: S,
    // someone paid at a counter at (x, z): { amount, method: 'alipay' | 'wechat' }; own: it was you
    payment,
    // per frame. listener: { x, y (feet), z }; vehicles: the road's (as engine/audio.js gets them);
    // boats: [{ x, z }]; people: the crowd's agents and others near; minute: minute of the day (float);
    // metroOpen; shops: crowd agents in shops are read off people (state 'shop')
    update(dt, listener, { vehicles = [], boats = [], people = [], minute = null, metroOpen = true, paused = false } = {}) {
      if (!ctx && !(audio.getContext() && build())) return;
      if (paused || dt <= 0) return;
      tNow += dt;
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].until < tNow) shots.splice(i, 1);
      const { x: lx, z: lz } = listener, ly = listener.y || 0, t = ctx.currentTime;
      lastL = { x: lx, z: lz };
      // where you stand: the river's and the wind's share (engine/audio.js plays those)
      audio.setExposure && audio.setExposure(riverExposure(lx, lz, ly), windExposure(lx, lz, ly));
      // reverb
      const r = reverbAt(lx, lz, ly);
      if (Math.abs(r.wet - rev.wet) > 0.005 || r.id !== rev.id) {
        rev.wet = r.wet; rev.id = r.id;
        rev.sfxSend.gain.setTargetAtTime(r.wet * 1.3, t, 0.25); rev.envSend.gain.setTargetAtTime(r.wet * 0.25, t, 0.4);
        rev.tone.frequency.setTargetAtTime(r.tone, t, 0.3);
      }
      // the traffic bed
      const tb = trafficBed(vehicles, lx, lz);
      bed.level = tb.level; bed.count = tb.count; bed.x = tb.x; bed.z = tb.z;
      bed.g.gain.setTargetAtTime(0.42 * tb.level, t, 0.5); bed.hg.gain.setTargetAtTime(0.035 * tb.level, t, 0.5);
      place(bed.p, tb.x, 0.6, tb.z, 0.6);
      // horns (rare) and buses sighing to a stop
      for (const v of vehicles) {
        if (!v || v.active === false) continue;
        const d = Math.hypot(v.x - lx, v.z - lz);
        if (tNow - lastHorn > HORN.minGap && Math.random() < hornRate(v, d) * dt) { lastHorn = tNow; carHorn(v); }
        if (v.bus || v.model === 'bus') {
          const was = busV.get(v.id) ?? v.v; busV.set(v.id, v.v);
          if (was > BUS_SIGH.from * 0.5 && v.v <= BUS_SIGH.rest && d < BUS_SIGH.range) busSigh(v);
        }
      }
      // water at the wall, near the railing
      const rx = riverExposure(lx, lz, ly);
      if (rx > 0.6 && (slapIn -= dt) <= 0) { slapIn = 0.4 + Math.random() * 1.6 / rx; slap(26.5 + Math.random() * 2, lz + (Math.random() - 0.5) * 24); }
      // a boat's horn, rarely
      if (tNow - lastBoat > BOAT_HORN.minGap) for (const b of boats) {
        if (Math.hypot(b.x - lx, b.z - lz) < BOAT_HORN.range && Math.random() < BOAT_HORN.perBoat * dt) { lastBoat = tNow; boatHorn(b); break; }
      }
      // shop doors: someone in the crowd going in, or coming out
      const seen = new Set();
      for (const a of people) {
        if (a.state !== 'shop' || !a.shop) continue;
        seen.add(a.id);
        const ph = a.shop.phase, was = shopPhase.get(a.id);
        shopPhase.set(a.id, ph);
        if (was && was !== ph && (ph === 'inside' || ph === 'outward')) {
          const door = a.shop.door, d = Math.hypot(door.x - lx, door.z - lz), k = `${Math.round(door.x)}:${Math.round(door.z)}`;
          if (d < DOOR_CHIME.range && tNow - (lastChime.get(k) ?? -1e9) > DOOR_CHIME.minGap) { lastChime.set(k, tNow); chime(door.x, door.z); }
          if (ph === 'outward' && Math.random() < PAYBOX.crowdChance) payment(door.x, door.z, crowdPayment());   // they paid on the way out
        }
      }
      for (const id of shopPhase.keys()) if (!seen.has(id)) shopPhase.delete(id);
      // the station's announcements, out of the exits
      if (metroOpen && (paIn -= dt) <= 0) {
        paIn = METRO_PA.every[0] + Math.random() * (METRO_PA.every[1] - METRO_PA.every[0]);
        const at = METRO_PA.at.map((a) => [Math.hypot(a.x - lx, a.z - lz), a]).sort((p, q) => p[0] - q[0])[0];
        if (at && at[0] < METRO_PA.range) announce(at[1], lx, lz);
      }
      // talkers
      const buf = audio.murmurBuffer;
      if (buf) {
        while (talkers.length < 3) talkers.push(talkerSlot());
        const want = pickTalkers(people, lx, lz, { n: 3 });
        for (const s of talkers) {
          if (s.who && (tNow < s.until)) { if (!want.includes(s.who) && Math.hypot(s.who.x - lx, s.who.z - lz) > 16) s.g.gain.setTargetAtTime(0, t, 0.2); else place(s.p, s.who.x, (s.who.y || 0) + 1.6, s.who.z, 0.1); continue; }
          if ((s.rest -= dt) > 0) continue;
          const who = want.find((w) => !talkers.some((o) => o !== s && o.who === w && tNow < o.until));
          if (who) grain(s, buf, who); else { s.who = null; s.rest = 1; }
        }
      }
      // the clock
      if (minute != null) {
        if (lastMinute != null) { const c = clockChime(lastMinute, minute); if (c) clock(c, lx, lz); }
        lastMinute = minute;
      }
    },
    // what of this is sounding now, and how loud at the listener: [{ id, kind, level }]
    audible(lx, lz, ly = 1.7) {
      const out = [];
      if (!ctx) return out;
      if (bed && bed.level > 0.01) out.push({ id: 'traffic-bed', kind: 'traffic', level: 0.42 * bed.level });
      for (const s of shots) { const d = Math.hypot(s.x - lx, s.z - lz, s.y - ly); out.push({ id: s.id, kind: s.kind, level: s.at ? s.at(lx, lz) : s.level * att(d, s.ref, s.rolloff) }); }
      for (const s of talkers) if (s.who && tNow < s.until) out.push({ id: `talker:${s.who.id ?? '?'}`, kind: 'chatter', level: 0.32 * att(Math.hypot(s.who.x - lx, s.who.z - lz), 2, 1.3) });
      return out;
    },
    get reverb() { return rev ? { wet: +rev.wet.toFixed(3), id: rev.id } : null; },
    get bed() { return bed ? { level: +bed.level.toFixed(3), count: bed.count } : null; },
    // the clock was set, not lived through (a hero shot, the benchmark): ring nothing for the jump
    syncClock() { lastMinute = null; },
    // tools: the station's announcement now, from the exit nearest (x, z); a shop door's chime at (x, z)
    testPA(x, z) { if (!ctx) return false; const at = METRO_PA.at.map((a) => [Math.hypot(a.x - x, a.z - z), a]).sort((p, q) => p[0] - q[0])[0][1]; announce(at, x, z); return true; },
    testChime(x, z) { if (ctx) chime(x, z); },
    // tools: ring the clock now, as at minute m of the day
    testClock(m = 18 * 60) { if (ctx) clock(clockChime(m - 1, m) || { sections: 4, strikes: 6 }, CLOCK.x + 60, CLOCK.z); },
  };
}
