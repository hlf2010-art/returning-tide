// Wind on the trees: pure math, no three.js, so it can be tested in Node. trees.js runs the same
// formula on the GPU (WIND_GLSL below is the line-for-line twin of windOffset).
//
// The motion is hierarchical, the way a real tree moves:
//   trunk    a slow lean with the wind plus a gentle sway, growing with height (∝ height²)
//   limbs    (level 1) each with its own phase, ~0.2-0.35 Hz, along the wind and a little vertical
//   branches (level 2) each with its own phase, faster and crosswise, inheriting the limb's motion
//   leaves   flutter about their stems at 1-1.6 Hz, each leaf with its own phase
// The strength is the weather's wind times a gust field that travels across the trees, so
// neighbours don't move in step and stronger wind moves everything further. Rain weighs the
// leaves and branch tips down a little and knocks individual leaves as drops land.

export const GUST = { a: 0.37, b: 0.23, along: 0.045, across: 0.02 };

// gust factor 0..1 at a tree (bx, bz) at time t, wind direction (dx, dz)
export function gustAt(bx, bz, t, dx, dz) {
  const along = bx * dx + bz * dz;
  return 0.5 + 0.5 * Math.sin(t * GUST.a - along * GUST.along) * Math.sin(t * GUST.b + along * GUST.across + 1.3);
}

const TAU = 6.2832;
// p: vertex position (world), base: [bx, by, bz, h], br: [p1, p2, w1, w2] (limb / branch phase
// and flex weight), leaf: [lw, lph] (0 for wood), W: wind 0..~1.5, rain 0..1. Returns [dx, dy, dz] m.
export function windOffset(p, base, br, leaf, t, W, dir, rain) {
  const [bx, by, bz, h] = base, [p1, p2, w1, w2] = br, [lw, lph] = leaf, [dx, dz] = dir;
  const S = W * (0.65 + 0.7 * gustAt(bx, bz, t, dx, dz));
  const hN = Math.min(1.4, Math.max(0, (p[1] - by) / h));
  const treePh = bx * 0.37 + bz * 0.23;
  const trunk = h * hN * hN * (0.012 * S + 0.01 * S * Math.sin(t * 0.8 + treePh));
  let ox = dx * trunk, oy = 0, oz = dz * trunk;
  const o1 = Math.sin(t * 1.3 + p1 * TAU) * 0.6 + Math.sin(t * 2.1 + p1 * 17.0) * 0.4;
  const a1 = w1 * S * (0.05 + 0.07 * o1);
  ox += dx * a1; oz += dz * a1; oy += w1 * S * 0.04 * o1;
  const o2 = Math.sin(t * 2.7 + p2 * TAU) * 0.6 + Math.sin(t * 4.3 + p2 * 11.0) * 0.4;
  const px = -dz, pz = dx;
  const a2 = w2 * S * 0.05 * o2, s2 = w2 * S * 0.03;
  ox += px * a2 + dx * s2; oz += pz * a2 + dz * s2; oy += w2 * S * 0.05 * o2 - w2 * rain * 0.03;
  const fl = Math.sin(t * (6.0 + lph * 4.0) + lph * 40.0);
  const hit = rain * Math.pow(Math.max(0, Math.sin(t * (3.1 + lph * 2.3) + lph * 91.0)), 12.0);
  oy += lw * ((0.03 + 0.1 * S) * fl - 0.05 * rain - 0.08 * hit);
  const side = lw * (0.02 + 0.08 * S) * Math.cos(t * (5.0 + lph * 3.0) + lph * 23.0);
  ox += px * side; oz += pz * side;
  return [ox, oy, oz];
}

export const WIND_GLSL = /* glsl */ `
uniform float uWindTime, uWind, uWindRain;
uniform vec2 uWindDir;
float gustAt(vec2 b) {
  float along = dot(b, uWindDir);
  return 0.5 + 0.5 * sin(uWindTime * ${GUST.a} - along * ${GUST.along}) * sin(uWindTime * ${GUST.b} + along * ${GUST.across} + 1.3);
}
vec3 windOffset(vec3 p, vec4 base, vec4 br, vec2 leaf) {
  float t = uWindTime, rain = uWindRain;
  float S = uWind * (0.65 + 0.7 * gustAt(base.xz));
  float hN = clamp((p.y - base.y) / base.w, 0.0, 1.4);
  float treePh = base.x * 0.37 + base.z * 0.23;
  float trunk = base.w * hN * hN * (0.012 * S + 0.01 * S * sin(t * 0.8 + treePh));
  vec3 o = vec3(uWindDir.x * trunk, 0.0, uWindDir.y * trunk);
  float o1 = sin(t * 1.3 + br.x * 6.2832) * 0.6 + sin(t * 2.1 + br.x * 17.0) * 0.4;
  float a1 = br.z * S * (0.05 + 0.07 * o1);
  o.xz += uWindDir * a1; o.y += br.z * S * 0.04 * o1;
  float o2 = sin(t * 2.7 + br.y * 6.2832) * 0.6 + sin(t * 4.3 + br.y * 11.0) * 0.4;
  vec2 perp = vec2(-uWindDir.y, uWindDir.x);
  o.xz += perp * (br.w * S * 0.05 * o2) + uWindDir * (br.w * S * 0.03);
  o.y += br.w * S * 0.05 * o2 - br.w * rain * 0.03;
  float fl = sin(t * (6.0 + leaf.y * 4.0) + leaf.y * 40.0);
  float hit = rain * pow(max(0.0, sin(t * (3.1 + leaf.y * 2.3) + leaf.y * 91.0)), 12.0);
  o.y += leaf.x * ((0.03 + 0.1 * S) * fl - 0.05 * rain - 0.08 * hit);
  o.xz += perp * (leaf.x * (0.02 + 0.08 * S) * cos(t * (5.0 + leaf.y * 3.0) + leaf.y * 23.0));
  return o;
}
`;

// The weather's wind: a breeze off the river that picks up with the drizzle, eased so changes are
// never sudden. `override` (dev control) pins it to calm / breeze / windy / gale.
export const WIND_LEVELS = { calm: 0.05, breeze: 0.35, windy: 0.8, gale: 1.3 };
export function createWind() {
  let level = WIND_LEVELS.breeze, override = null, day = null;
  const dir = [-0.848, 0.53], dirWant = [-0.848, 0.53];
  return {
    update(dt, rain = 0) {
      // a dev override, else the day's wind (engine/climate.js), else a breeze stiffening with the rain; gusting a little
      const base = override != null ? WIND_LEVELS[override] : day != null ? WIND_LEVELS[day] : WIND_LEVELS.breeze + 0.3 * rain;
      level += (base - level) * (1 - Math.exp(-dt / 3));
      const k = 1 - Math.exp(-dt / 20); dir[0] += (dirWant[0] - dir[0]) * k; dir[1] += (dirWant[1] - dir[1]) * k;
      const l = Math.hypot(dir[0], dir[1]) || 1; dir[0] /= l; dir[1] /= l;
      return level;
    },
    setOverride(name) { if (name != null && !(name in WIND_LEVELS)) throw new Error(`unknown wind "${name}"`); override = name; },
    // the day's weather: its wind and where it blows from (a direction it turns toward over a few seconds)
    setDay(name, d = null) { if (name != null && !(name in WIND_LEVELS)) throw new Error(`unknown wind "${name}"`); day = name; if (d) { dirWant[0] = d[0]; dirWant[1] = d[1]; } },
    cycle() { const k = [null, 'calm', 'breeze', 'windy', 'gale'], i = k.indexOf(override); override = k[(i + 1) % k.length]; return override; },
    get level() { return level; }, get override() { return override; },
    dir,                                                  // blowing off the Huangpu (east) inland, bending a little south (north is -z), or the day's
  };
}
