// One reversible weather transition for the fixed blue-hour scene: clear <-> light drizzle.
// Pure state (no three.js / DOM / audio), unit-tested in node. The renderer, ground materials
// and audio read the three levels below; nothing is created or destroyed when it changes.
//
//   rain  0..1  drops near the player and the rain loop; eases in over `rampIn`, out over `rampOut`
//   haze  0..1  a little extra atmosphere; follows rain, a touch slower
//   wet   0..1  extra wetness on exposed ground; builds only while it rains, dries slowly after
// and, from the day's weather (engine/climate.js, through setTargets): rain at any coverage, and
//   heavy 0..1  how much harder than a drizzle it's coming down (faster, longer, more drops; louder)
//   snow  0..1  snow falling (it wets the ground too, more slowly: it melts)
//   fog   0..1  a morning fog, thicker than haze

export const WEATHER_CONFIG = { rampIn: 14, rampOut: 18, hazeLag: 1.4, wetIn: 40, dryOut: 75 };

const smooth = (x) => x * x * (3 - 2 * x);

export function createWeather(config = {}) {
  const cfg = { ...WEATHER_CONFIG, ...config };
  let target = 'clear', p = 0, h = 0, wet = 0;                 // p, h: linear progress; reported through smoothstep
  let rT = 0, hT = 0, hv = 0, hvT = 0, sn = 0, snT = 0, fg = 0, fgT = 0, cv = 0, cvT = 0;   // what each is heading for
  const cl = (x) => Math.max(0, Math.min(1, x || 0));
  const toward = (v, t, up, down) => (t > v ? Math.min(t, v + up) : Math.max(t, v - down));
  const listeners = new Set();
  return {
    set(next, { instant = false } = {}) {
      if (next !== 'clear' && next !== 'drizzle') throw new Error(`unknown weather "${next}"`);
      const changed = next !== target;
      target = next; rT = hT = next === 'drizzle' ? 1 : 0; hvT = snT = fgT = 0; cvT = rT;
      if (instant) { p = h = rT; wet = p; hv = sn = fg = 0; cv = cvT; }
      if (changed) for (const fn of listeners) fn(target);
      return changed;
    },
    toggle() { this.set(target === 'clear' ? 'drizzle' : 'clear'); return target; },
    // the day's weather (engine/climate.js at()): rain coverage, how heavy, snow, haze, fog; instant after a jump in time
    setTargets({ rain = 0, heavy = 0, snow = 0, haze = 0, fog = 0, cover = 0 } = {}, { instant = false } = {}) {
      rT = cl(rain); hT = cl(Math.max(haze, rain)); hvT = cl(heavy); snT = cl(snow); fgT = cl(fog); cvT = cl(cover);
      const next = rT > 0.05 ? 'drizzle' : 'clear';
      if (next !== target) { target = next; for (const fn of listeners) fn(target); }
      if (instant) { p = rT; h = hT; hv = hvT; sn = snT; fg = fgT; cv = cvT; wet = rT > 0.25 || snT > 0.4 ? Math.max(wet, 0.9) : wet; }
    },
    update(dt) {
      if (!(dt > 0)) return;
      p = toward(p, rT, dt / cfg.rampIn, dt / cfg.rampOut);
      h = toward(h, hT, dt / (cfg.rampIn * cfg.hazeLag), dt / (cfg.rampOut * cfg.hazeLag));
      hv = toward(hv, hvT, dt / 12, dt / 12); sn = toward(sn, snT, dt / cfg.rampIn, dt / cfg.rampOut); fg = toward(fg, fgT, dt / 40, dt / 60); cv = toward(cv, cvT, dt / 30, dt / 45);
      const r = smooth(p);
      if (sn > 0.3) wet = Math.min(1, wet + (dt / cfg.wetIn) * sn * 0.5);       // (snow melting on the paving)
      // the ground only gets wetter while it is actually raining; it dries once the rain has thinned
      if (r > 0.25) wet = Math.min(1, wet + (dt / cfg.wetIn) * r);
      else if (r < 0.1 && sn < 0.2) wet = Math.max(0, wet - dt / cfg.dryOut);
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get target() { return target; },
    get rain() { return smooth(p); },
    get haze() { return smooth(h); },
    get heavy() { return smooth(hv); }, get snow() { return smooth(sn); }, get fog() { return smooth(fg); }, get cover() { return smooth(cv); },
    get wet() { return smooth(wet); },
    get settled() { return p === rT && h === hT && hv === hvT && sn === snT && fg === fgT && cv === cvT && (rT > 0.25 ? wet === 1 : rT === 0 && snT === 0 ? wet === 0 : true); },
  };
}
