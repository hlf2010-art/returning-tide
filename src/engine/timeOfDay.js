// What the hour does to the city: one pure function of the clock (minute of the day, 0-1439) that
// the sky, the lamps, the façades, Lujiazui's LED walls, the shops, the crowd and the traffic read.
// Mid-November in Shanghai (31.2° N): sunrise about 6:25, sunset about 4:55 pm, dark by 5:40.
//   daylight   0 at night .. 1 in the (clear, sunny) day
//   glow       the twilight band on the horizon (1 = the blue hour the game opens in, at 5:42 pm)
//   side       where that glow is: -1 west at dusk (behind the Bund), +1 east at dawn (over Pudong)
//   night      0 in the blue hour .. 1 in the deep night (a city sky: never black, a brown-orange glow)
//   floods     the Bund's façade lighting: on as the sky darkens (reports give 7 pm in summer; in
//              November it's dark by 5:40), dimmed to a faint wash in the late-night mode, off after 0:30
//   lateNight  the late-night lighting mode (since the 2018 upgrade the Bund and Lujiazui have one in
//              which only the skyline's outlines stay lit). The switch time is the game's choice: 10 pm
//   media      Lujiazui's LED walls and the Pearl's colour show (off in the late-night mode)
//   outline    tower outlines, rooftop names, aircraft lights (all night)
//   lamps      street and promenade lamps;  windows   lit office / hotel windows
//   signs      Nanjing Road's neon (to 11 pm); screens  its LED screens (7 am to 11 pm)
//   shops      Nanjing Road open (10 am to 10 pm)
//   crowd      share of the evening crowd that's out;   traffic   share of the traffic
//   metro      trains running (first about 5:30, last about 11 pm)
const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
export const H = (h, m = 0) => h * 60 + m;
// piecewise-linear lookup over [minute, value] points covering 0..1440
function curve(points, t) {
  for (let i = 0; i < points.length - 1; i++) {
    const [a, va] = points[i], [b, vb] = points[i + 1];
    if (t >= a && t <= b) return va + (vb - va) * ramp(t, a, b);
  }
  return points[points.length - 1][1];
}
const CROWD = [[0, 0.16], [H(1), 0.07], [H(5), 0.05], [H(6), 0.14], [H(8), 0.3], [H(10), 0.55], [H(16), 0.6], [H(17, 30), 0.85], [H(18, 30), 1], [H(21, 30), 1], [H(22, 30), 0.6], [H(23, 30), 0.3], [H(24), 0.16]];
const TRAFFIC = [[0, 0.35], [H(5), 0.25], [H(7), 0.9], [H(9), 1], [H(20), 1], [H(23), 0.6], [H(24), 0.35]];
const WINDOWS = [[0, 0.5], [H(1), 0.3], [H(5), 0.2], [H(7), 0.35], [H(16, 30), 0.5], [H(17, 30), 1], [H(21, 30), 1], [H(22, 30), 0.6], [H(24), 0.5]];

// the sun over Shanghai in mid-November: elevation and direction in the game's frame (x east, y up, z south)
const D2R = Math.PI / 180, LAT = 31.23 * D2R, DEC = -18.6 * D2R, SOLAR_NOON = H(11, 42);
export function sunDir(minute) {
  const h = ((minute - SOLAR_NOON) / 60) * 15 * D2R;
  const sinEl = Math.sin(LAT) * Math.sin(DEC) + Math.cos(LAT) * Math.cos(DEC) * Math.cos(h);
  const el = Math.asin(sinEl), ce = Math.max(1e-6, Math.cos(el));
  let az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(DEC) - sinEl * Math.sin(LAT)) / (ce * Math.cos(LAT)))));
  if (h > 0) az = 2 * Math.PI - az;                              // afternoon: west of south
  return { x: ce * Math.sin(az), y: sinEl, z: -ce * Math.cos(az), el: el / D2R, az: az / D2R };
}

export function todState(minute) {
  const t = ((minute % 1440) + 1440) % 1440, am = t < H(12);
  const daylight = am ? ramp(t, H(6), H(7, 10)) : 1 - ramp(t, H(16, 30), H(17, 35));
  const glow = am ? ramp(t, H(5, 30), H(6, 5)) * (1 - ramp(t, H(6, 45), H(7, 25))) : ramp(t, H(16, 20), H(16, 55)) * (1 - ramp(t, H(17, 45), H(18, 30)));
  const night = am ? 1 - ramp(t, H(5, 15), H(6)) : ramp(t, H(17, 45), H(18, 40));
  const lateNight = t >= H(22) || t < H(5) ? 1 : 0;
  // façade floods: up as the sky darkens, the late-night wash from 10, off from half past midnight
  const floods = t >= H(17, 10) ? (t < H(22) ? ramp(t, H(17, 10), H(17, 30)) : 0.22) : t < H(0, 30) ? 0.22 : 0;
  const media = t >= H(17, 25) && t < H(22) ? ramp(t, H(17, 25), H(17, 35)) : 0;
  const outline = 1 - ramp(daylight, 0.2, 0.6);
  const lamps = 1 - ramp(daylight, 0.25, 0.7);
  return {
    minute: t, daylight, glow, side: am ? 1 : -1, night, lateNight, floods, media, outline, lamps,
    windows: curve(WINDOWS, t),
    signs: t >= H(17, 10) && t < H(23) ? ramp(t, H(17, 10), H(17, 25)) : 0,
    screens: t >= H(7) && t < H(23) ? 1 : 0,
    shops: t >= H(10) && t < H(22) ? 1 : 0,
    crowd: curve(CROWD, t), traffic: curve(TRAFFIC, t),
    metro: t >= H(5, 30) && t < H(23),
    dawn: t >= H(5, 45) && t < H(8, 15),
    exposure: 1.15 - 0.37 * daylight, bloom: 0.24 - 0.14 * daylight,
    fog: 1 - 0.85 * daylight,                      // clear, sunny days: the far bank sharp
    sun: sunDir(t),
  };
}
// the moment the late-night mode starts (the event people notice): did the clock just pass 10 pm?
export const LATE_NIGHT_AT = H(22);
export function passedLateNight(prevMinute, minute) {
  const a = ((prevMinute % 1440) + 1440) % 1440, b = ((minute % 1440) + 1440) % 1440;
  return a < LATE_NIGHT_AT && b >= LATE_NIGHT_AT && b - a < 30;
}
