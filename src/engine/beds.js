// The city's background beds (tools/voice/ambience.py, public/ambience/beds/): crowds, traffic, the river at
// the wall, boats out on the river, wind. Each bed has a few takes; one plays at a time, starting at a random
// point and a slightly different speed, and before it ends another take (never the same one twice running)
// fades in over it, so the loop never comes round to the same place. engine/ambience.js sets each bed's
// level and, for the placed ones, where it comes from.
// Takes are decoded only when a bed is first wanted and let go after a minute of silence (decoded audio is
// big: ~4 MB for a 20 s mono take).
const XF = 4;          // s of crossfade between takes
const IDLE = 60;       // s of silence before a bed's decoded takes are let go

export function createBeds(ctx, { dest, base = './ambience/beds/', placeNode = null, rnd = Math.random } = {}) {
  const beds = {};
  let manifest = null, loading = null;
  function load() {
    if (!loading) loading = fetch(base + 'beds.json').then((r) => (r.ok ? r.json() : null)).then((m) => { manifest = m; }).catch(() => { manifest = null; });
    return loading;
  }
  // name -> { list (files), bufs, g (level), out (gain -> optional panner -> dest), cur, last, want, quiet }
  function bed(name, { placed = false } = {}) {
    if (beds[name]) return beds[name];
    const g = ctx.createGain(); g.gain.value = 0;
    let out = g;
    if (placed && placeNode) { const p = placeNode(); g.connect(p); p.connect(dest); out = p; } else g.connect(dest);
    return (beds[name] = { name, g, out, placed: placed && !!placeNode, bufs: null, decoding: false, cur: null, last: -1, want: 0, quiet: 0 });
  }
  function decode(b) {
    if (b.decoding || b.bufs || !manifest || !manifest[b.name]) return;
    b.decoding = true;
    Promise.all(manifest[b.name].map((t) => fetch(base + t.file).then((r) => r.arrayBuffer()).then((x) => ctx.decodeAudioData(x))))
      .then((bufs) => { b.bufs = bufs; b.decoding = false; })
      .catch(() => { b.decoding = false; b.bufs = []; });
  }
  function start(b, t, fadeIn) {
    const n = b.bufs.length; if (!n) return;
    let i = Math.floor(rnd() * n); if (n > 1 && i === b.last) i = (i + 1) % n;
    b.last = i;
    const buf = b.bufs[i], s = ctx.createBufferSource(), e = ctx.createGain();
    s.buffer = buf; s.playbackRate.value = 0.96 + rnd() * 0.08;
    const off = rnd() * buf.duration * 0.5, len = (buf.duration - off) / s.playbackRate.value;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1, t + fadeIn);
    s.connect(e).connect(b.g); s.start(t, off);
    const cur = { s, e, end: t + len };
    s.onended = () => { try { e.disconnect(); } catch { /* gone */ } };
    if (b.cur) { const o = b.cur; o.e.gain.cancelScheduledValues(t); o.e.gain.setValueAtTime(o.e.gain.value, t); o.e.gain.linearRampToValueAtTime(0, t + fadeIn); try { o.s.stop(t + fadeIn + 0.05); } catch { /* */ } }
    b.cur = cur;
  }
  function stop(b) { if (b.cur) { try { b.cur.s.stop(); } catch { /* */ } b.cur = null; } }

  return {
    load,
    // level 0..1 (smoothed over `tau` s)
    set(name, level, { placed = false, tau = 0.8 } = {}) {
      const b = bed(name, { placed }), v = Math.max(0, Math.min(1.5, level));
      if (Math.abs(v - b.want) > 0.004) { b.want = v; b.g.gain.setTargetAtTime(v, ctx.currentTime, tau); }
    },
    // where a placed bed comes from
    place(name, x, y, z) {
      const b = beds[name]; if (!b || !b.placed) return;
      const p = b.out, t = ctx.currentTime;
      if (p.positionX) { p.positionX.setTargetAtTime(x, t, 0.4); p.positionY.setTargetAtTime(y, t, 0.4); p.positionZ.setTargetAtTime(z, t, 0.4); } else p.setPosition(x, y, z);
    },
    // per frame: start, cross to the next take, let go of what's been silent a while
    update(dt) {
      if (!manifest) { load(); return; }
      const t = ctx.currentTime;
      for (const b of Object.values(beds)) {
        if (b.want > 0.003) { b.quiet = 0; if (!b.bufs) { decode(b); continue; } }
        else if ((b.quiet += dt) > IDLE && b.bufs) { stop(b); b.bufs = null; continue; }
        if (!b.bufs || !b.bufs.length) continue;
        if (!b.cur) { if (b.want > 0.003) start(b, t + 0.05, 2.5); }
        else if (t > b.cur.end - XF - 0.1) start(b, t + 0.05, XF);
      }
    },
    get ready() { return !!manifest; },
    level: (name) => (beds[name] ? beds[name].g.gain.value : 0),
    names: () => Object.keys(beds),
    playing: (name) => !!(beds[name] && beds[name].cur),
  };
}
