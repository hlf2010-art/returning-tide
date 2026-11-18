// Music in the world, played (engine/speakers.js decides what, where, when and how loud). Each venue is an
// <audio> element fed through Web Audio: a low-pass (distance, walls), a gain, and, in the street, a panner
// at the speaker, so it comes from its door and the listener (moved with the camera by engine/voice.js)
// hears it from the right side. The driver's radio is in the cabin: no panner, a car speaker's band.
// Venues are only built when you come within earshot, and paused when you leave. Files that are not
// there (public/music/, see docs/music.md) are skipped; with none at all, it is silent and does nothing.
import { TRACKS, PLAYLISTS, VENUES, trackAt, gainAt, cutoffAt } from '../engine/speakers.js';

const store = (() => { try { return window.localStorage; } catch { return null; } })();
const KEY = 'bund.music';

export function createWorldMusic(audio, { base = './music/' } = {}) {
  let on = (() => { try { return (store && store.getItem(KEY)) !== 'off'; } catch { return true; } })();
  let available = null;                                   // the track ids whose files exist
  const live = new Map();                                 // venue id -> its nodes
  const now = () => Date.now() / 1000;                    // playlists run in real time, like a shop's

  // which files are there (once; a missing file is a 404 and is left out of every playlist)
  const probe = Promise.all(Object.entries(TRACKS).map(([id, t]) => fetch(base + t.file, { method: 'HEAD' })
    .then((r) => (r.ok && !/text\/html/.test(r.headers.get('content-type') || '') ? id : null)).catch(() => null)))
    .then((ids) => { available = new Set(ids.filter(Boolean)); });

  function build(v) {
    const ctx = audio.getContext && audio.getContext(), bus = audio.getMusicBus && audio.getMusicBus();
    if (!ctx || !bus) return null;
    const el = new Audio(); el.crossOrigin = 'anonymous'; el.preload = 'auto';
    const src = ctx.createMediaElementSource(el);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8000;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(lp).connect(g);
    let pan = null;
    if (v.cabin) {                                        // a car's door speakers: no deep bass, no air
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
      g.connect(hp).connect(bus);
    } else {
      pan = ctx.createPanner(); pan.panningModel = 'equalpower'; pan.distanceModel = 'linear'; pan.refDistance = 1; pan.maxDistance = 1e4; pan.rolloffFactor = 0;   // (loudness is ours: gainAt)
      if (pan.positionX) { pan.positionX.value = v.x; pan.positionY.value = v.y; pan.positionZ.value = v.z; } else pan.setPosition(v.x, v.y, v.z);
      g.connect(pan).connect(bus);
    }
    const n = { v, el, g, lp, pan, id: null, quiet: 0 };
    el.addEventListener('ended', () => cue(n, true));
    el.addEventListener('error', () => { n.loading = false; if (available && n.id) available.delete(n.id); cue(n, true); });
    return n;
  }
  // coming within earshot: join the playlist where it has got to (it runs in real time). After that the
  // tracks simply follow each other, so a file a second longer or shorter than listed never stutters
  function cue(n, next = false) {
    let at = null;
    if (next && n.id && available && available.size) {
      const ids = PLAYLISTS[n.v.playlist].filter((id) => available.has(id));
      if (ids.length) at = { id: ids[(ids.indexOf(n.id) + 1) % ids.length], offset: 0 };
    }
    if (!at) at = available && trackAt(n.v.playlist, now() + (n.v.offset || 0), available);
    if (!at) { n.el.pause(); n.id = null; return; }
    n.id = at.id; n.loading = true;                     // (left alone until it can play: re-cueing every frame would restart the load forever)
    n.el.src = base + TRACKS[at.id].file;
    const seek = () => {
      n.loading = false;
      if (at.offset && n.el.duration && at.offset >= n.el.duration - 1) { cue(n, true); return; }   // the schedule ran past this file's real end
      try { if (at.offset) n.el.currentTime = at.offset; } catch { /* not seekable yet */ }
      n.el.play().then(() => { n.err = null; }).catch((e) => { n.err = e && e.name; });   // (a browser may refuse until the player has interacted; the next frame tries again)
    };
    if (n.el.readyState >= 1) seek(); else n.el.addEventListener('loadedmetadata', seek, { once: true });
  }

  return {
    get on() { return on; },
    setOn(v) { on = !!v; try { store && store.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ } if (!on) for (const n of live.values()) { n.el.pause(); n.g.gain.value = 0; } },
    ready: probe,
    get available() { return available ? [...available] : []; },
    // per frame: where the listener is, the game's minute of the day, how far indoors (0..1), in a DiDi?
    update(dt, p, { minute = 0, inside = 0, ride = false, paused = false } = {}) {
      if (!available || !available.size) return;
      const ctx = audio.getContext && audio.getContext(); if (!ctx) return;
      for (const v of VENUES) {
        const dist = v.cabin ? 0 : Math.hypot(p.x - v.x, (p.y || 0) + 1.6 - v.y, p.z - v.z);
        const want = on && !paused && (v.cabin ? ride : true) ? gainAt(v, dist, minute, v.cabin ? 0 : (ride ? Math.max(inside, 0.7) : inside)) : 0;
        let n = live.get(v.id);
        if (!n) { if (want <= 0.001) continue; n = build(v); if (!n) return; live.set(v.id, n); }
        const t = ctx.currentTime;
        n.g.gain.setTargetAtTime(want, t, want > n.g.gain.value ? 0.6 : 0.35);
        n.lp.frequency.setTargetAtTime(cutoffAt(v, dist, inside), t, 0.3);
        if (want > 0.001) { n.quiet = 0; if ((n.el.paused || !n.id) && !n.loading) { if (n.id && n.el.readyState >= 2 && n.err) n.el.play().then(() => { n.err = null; }).catch(() => {}); else cue(n); } }
        else if ((n.quiet += dt) > 3 && !n.el.paused) n.el.pause();       // out of earshot: stop fetching
      }
    },
    // for tools: what is playing where, and how loud it is meant to be
    debug() { return [...live.values()].map((n) => ({ venue: n.v.id, track: n.id, gain: +n.g.gain.value.toFixed(3), paused: n.el.paused, time: +n.el.currentTime.toFixed(1), err: n.err || null, ready: n.el.readyState, ctx: audio.getContext() ? audio.getContext().state : null })); },
  };
}
