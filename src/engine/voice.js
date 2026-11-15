// People's voices. Every scripted line has a real voice recorded for it ahead of time
// (tools/voice/generate.py: Kokoro-82M, an open neural speech model; each character has their own
// voice), in Mandarin and in English. Lines nobody could record in advance (numbers in them, what an
// AI-driven conversation says) go to a local voice server if one is running (tools/voice/server.py,
// the same model live), and only then to the browser's own speech, picking its most natural voice.
//
// Which language you hear (settings, 'voices'):
//   original   everyone speaks as they would: Mandarin, and the tourists English (the default)
//   dubbed     everyone speaks your language
// Subtitles are always in your language.
//
// say({ zh, en, who, at, phone, gain, onEnd }) -> { duration, stop } (or null when silent)
//   at     [x, y, z]: said there (positional: it fades with distance and comes from that side)
//   phone  through a phone (band-limited)
const store = (() => { try { return window.localStorage; } catch { return null; } })();
const get = (k, d) => { try { return (store && store.getItem(k)) ?? d; } catch { return d; } };
const set = (k, v) => { try { store && store.setItem(k, v); } catch { /* private mode */ } };

export function voiceKey(lang, text) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(`${lang}|${String(text).trim()}`)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
const CJK = /[一-鿿]/;

// a browser voice that sounds least like a machine: the neural / natural / premium ones first
export function rankVoices(voices, lang, sex = null) {
  const want = lang === 'zh' ? /^(zh[-_]?(cn|hans|sg)?|cmn)/i : /^en/i;
  const score = (v) => {
    let s = 0; const n = v.name.toLowerCase();
    if (!want.test(v.lang || '')) return -1;
    if (/hk|tw|yue|hant/i.test(v.lang)) s -= 5;
    if (/natural|neural|online/.test(n)) s += 10;            // Edge: Microsoft "Online (Natural)" voices
    if (/premium|enhanced|siri/.test(n)) s += 8;              // macOS / iOS downloaded voices
    if (/google/.test(n)) s += 4;
    if (sex === 'm' && /(male|yunxi|yunjian|yunyang|kangkang|daniel|alex|aaron|arthur|liang|男)/.test(n) && !/female/.test(n)) s += 3;
    if (sex === 'f' && /(female|xiaoxiao|xiaoyi|tingting|meijia|huihui|samantha|karen|serena|女)/.test(n)) s += 3;
    return s;
  };
  return voices.map((v) => [score(v), v]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, v]) => v);
}

export function createVoice({ audio, getLang, camera = null }) {
  let manifest = null, ctx = null, server = null, serverChecked = 0;
  const cache = new Map();
  const S = { mode: get('bund.voices', 'original'), active: new Set(), clipHits: 0, serverHits: 0, synthHits: 0, last: null };
  fetch('./voice/manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => { manifest = m; }).catch(() => {});
  const serverUrl = () => get('bund.voiceServer', 'http://localhost:8790');
  async function checkServer() {
    if (Date.now() - serverChecked < 30000) return server;
    serverChecked = Date.now();
    try { const r = await fetch(`${serverUrl()}/health`, { signal: AbortSignal.timeout(800) }); server = r.ok; } catch { server = false; }
    return server;
  }
  checkServer();
  function bus() {
    ctx = ctx || (audio.getContext && audio.getContext());
    return ctx && audio.getVoiceBus ? audio.getVoiceBus() : null;
  }
  async function buffer(url) {
    if (cache.has(url)) return cache.get(url);
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((b) => ctx.decodeAudioData(b));
    cache.set(url, p); p.catch(() => cache.delete(url));
    return p;
  }
  // what language this person speaks in this mode
  function langFor(who, zh, en) {
    if (S.mode === 'dubbed') return getLang() === 'zh' ? (zh ? 'zh' : 'en') : (en ? 'en' : 'zh');
    if (zh && CJK.test(zh) && !/^bump:visitor|^tourist/.test(who || '')) return 'zh';
    return en ? 'en' : 'zh';
  }
  function play(buf, { at, phone, gain = 1, onEnd }) {
    const out = bus(); if (!out) return null;
    const src = ctx.createBufferSource(); src.buffer = buf;
    let node = src;
    if (phone) {                                                          // a phone line: 300-3400 Hz, a touch of grit
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300;
      node.connect(hp); hp.connect(lp); node = lp;
    }
    const g = ctx.createGain(); g.gain.value = gain; node.connect(g); node = g;
    let pan = null;
    if (at) {
      pan = ctx.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 1.6; pan.rolloffFactor = 1.1; pan.maxDistance = 60;
      if (pan.positionX) { pan.positionX.value = at[0]; pan.positionY.value = at[1]; pan.positionZ.value = at[2]; } else pan.setPosition(...at);
      node.connect(pan); node = pan;
    }
    node.connect(out);
    const h = { src, at, pan, duration: buf.duration, stop: () => { try { src.stop(); } catch { /* done */ } } };
    src.onended = () => { S.active.delete(h); onEnd && onEnd(); };
    src.start(); S.active.add(h);
    return h;
  }
  function listener() {
    if (!ctx || !camera) return;
    const l = ctx.listener, p = camera.position, t = ctx.currentTime;
    const f = { x: -Math.sin(camera.rotation.y), z: -Math.cos(camera.rotation.y) };
    if (l.positionX) { l.positionX.setTargetAtTime(p.x, t, 0.05); l.positionY.setTargetAtTime(p.y, t, 0.05); l.positionZ.setTargetAtTime(p.z, t, 0.05); l.forwardX.setTargetAtTime(f.x, t, 0.05); l.forwardY.setTargetAtTime(0, t, 0.05); l.forwardZ.setTargetAtTime(f.z, t, 0.05); l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
    else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, 0, f.z, 0, 1, 0); }
  }
  // the browser's own speech, as natural as it has (last resort)
  function synthSay(text, lang, { sex, onEnd, gain = 1 }) {
    const syn = typeof window !== 'undefined' && window.speechSynthesis; if (!syn) { onEnd && setTimeout(onEnd, 1500); return null; }
    const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'zh' ? 'zh-CN' : 'en-GB';
    const v = rankVoices(syn.getVoices() || [], lang, sex)[0]; if (v) u.voice = v;
    u.rate = lang === 'zh' ? 1.02 : 1.0; u.volume = Math.max(0.1, Math.min(1, gain));
    u.onend = () => onEnd && onEnd(); u.onerror = () => onEnd && onEnd();
    try { syn.speak(u); } catch { onEnd && onEnd(); }
    S.synthHits++;
    return { duration: Math.max(1, text.length / (lang === 'zh' ? 4.5 : 14)), stop: () => syn.cancel() };
  }
  return {
    get mode() { return S.mode; },
    setMode(m) { S.mode = m === 'dubbed' ? 'dubbed' : 'original'; set('bund.voices', S.mode); },
    get stats() { return { clips: S.clipHits, server: S.serverHits, synth: S.synthHits, loaded: !!manifest, size: manifest ? Object.keys(manifest.clips).length : 0, last: S.last, serverUp: server }; },
    has(lang, text) { return !!(manifest && manifest.clips[voiceKey(lang, text)]); },
    clipUrl(lang, text) { const c = manifest && manifest.clips[voiceKey(lang, text)]; return c ? `./voice/${c[0]}` : null; },
    langFor,
    update() { listener(); for (const h of S.active) if (h.at && h.pan && h.follow) { const p = h.follow(); if (p) { h.pan.positionX.value = p[0]; h.pan.positionY.value = p[1]; h.pan.positionZ.value = p[2]; } } },
    stopAll() { for (const h of [...S.active]) h.stop(); S.active.clear(); try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch { /* none */ } },
    // { zh, en, who, sex, at, phone, gain, onEnd, voice (server voice id) }
    async say(o) {
      const lang = o.lang || langFor(o.who, o.zh, o.en), text = (lang === 'zh' ? o.zh : o.en) || o.zh || o.en;
      if (!text) { o.onEnd && o.onEnd(); return null; }
      S.last = { lang, text: text.slice(0, 40), who: o.who };
      if (!bus()) return synthSay(text, lang, o);
      const url = this.clipUrl(lang, text);
      try {
        if (url) { const b = await buffer(url); S.clipHits++; return play(b, o); }
        if (await checkServer()) {
          const r = await fetch(`${serverUrl()}/tts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang, who: o.who || '', voice: o.voice || '' }), signal: AbortSignal.timeout(20000) });
          if (r.ok) { const b = await ctx.decodeAudioData(await r.arrayBuffer()); S.serverHits++; return play(b, o); }
        }
      } catch (e) { console.warn('voice:', e.message || e); }
      return synthSay(text, lang, o);
    },
  };
}
