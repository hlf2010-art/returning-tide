// One reversible weather transition for the fixed blue-hour scene: clear <-> light drizzle.
// Pure state (no three.js / DOM / audio), unit-tested in node. The renderer, ground materials
// and audio read the three levels below; nothing is created or destroyed when it changes.
//
//   rain  0..1  drops near the player and the rain loop; eases in over `rampIn`, out over `rampOut`
//   haze  0..1  a little extra atmosphere; follows rain, a touch slower
//   wet   0..1  extra wetness on exposed ground; builds only while it rains, dries slowly after

export const WEATHER_CONFIG = { rampIn: 14, rampOut: 18, hazeLag: 1.4, wetIn: 40, dryOut: 75 };

const smooth = (x) => x * x * (3 - 2 * x);

export function createWeather(config = {}) {
  const cfg = { ...WEATHER_CONFIG, ...config };
  let target = 'clear', p = 0, h = 0, wet = 0;                 // p, h: linear progress; reported through smoothstep
  const listeners = new Set();
  return {
    set(next, { instant = false } = {}) {
      if (next !== 'clear' && next !== 'drizzle') throw new Error(`unknown weather "${next}"`);
      const changed = next !== target;
      target = next;
      if (instant) { p = h = target === 'drizzle' ? 1 : 0; wet = p; }
      if (changed) for (const fn of listeners) fn(target);
      return changed;
    },
    toggle() { this.set(target === 'clear' ? 'drizzle' : 'clear'); return target; },
    update(dt) {
      if (!(dt > 0)) return;
      const up = target === 'drizzle';
      p = Math.max(0, Math.min(1, p + (up ? dt / cfg.rampIn : -dt / cfg.rampOut)));
      h = Math.max(0, Math.min(1, h + (up ? dt / (cfg.rampIn * cfg.hazeLag) : -dt / (cfg.rampOut * cfg.hazeLag))));
      const r = smooth(p);
      // the ground only gets wetter while it is actually raining; it dries once the rain has thinned
      if (r > 0.25) wet = Math.min(1, wet + (dt / cfg.wetIn) * r);
      else if (r < 0.1) wet = Math.max(0, wet - dt / cfg.dryOut);
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get target() { return target; },
    get rain() { return smooth(p); },
    get haze() { return smooth(h); },
    get wet() { return smooth(wet); },
    get settled() { return target === 'clear' ? p === 0 && h === 0 && wet === 0 : p === 1 && h === 1 && wet === 1; },
  };
}
