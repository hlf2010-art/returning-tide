// Shanghai's weather, day by day: a plan for each date, drawn at random from the city's climate but the same every
// time for the same date (seeded by it), so a day replays as it was and tomorrow's forecast comes true. Pure (no
// three.js, no DOM): node-tested in tests/climate.test.mjs.
//
// From Shanghai's climate normals (rounded): rain on 7-14 days a month, most in June (the plum rains, 梅雨, from
// about mid-June to early July: day after day of rain); summer afternoons bring thunderstorms, and July to September
// the odd typhoon's edge (all day rain, a gale); winter has fog on some mornings, a north-westerly, and once or
// twice a year a little snow or sleet that rarely settles. Spring and autumn are the driest and clearest.
//
//   plan(y, m, d) -> { sky, events: [{ kind, from, to, peak }], wind, windDir, hi, lo, summary: { zh, en, icon } }
//     kinds: 'rain' (peak: 0.3 drizzle .. 1 downpour), 'storm' (a thunderstorm), 'snow', 'fog', 'typhoon'
//   at(plan, minute) -> { rain, heavy, snow, haze, fog, storm, cover, wind } what the sky is doing at that minute (0..1 each;
//     rain is coverage at drizzle strength, heavy how much harder than drizzle; wind a WIND_LEVELS name)

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const RAIN_DAYS = [10, 10, 13, 12, 12, 14, 12, 12, 10, 7, 8, 7];
const SNOW = [0.12, 0.1, 0.02, 0, 0, 0, 0, 0, 0, 0, 0.01, 0.05];            // of the rainy days, the share that falls as snow / sleet
const STORM = [0, 0, 0.03, 0.08, 0.12, 0.2, 0.38, 0.38, 0.18, 0.04, 0, 0];   // of the rainy days, the share with a thunderstorm
const TYPHOON = [0, 0, 0, 0, 0, 0, 0.02, 0.03, 0.02, 0.004, 0, 0];           // chance a day lies under a typhoon's edge
const FOG = [0.16, 0.13, 0.11, 0.06, 0.04, 0.03, 0.01, 0.01, 0.02, 0.05, 0.1, 0.16];   // mornings with fog
const CLOUDY = [0.45, 0.45, 0.45, 0.4, 0.4, 0.5, 0.4, 0.35, 0.35, 0.3, 0.35, 0.4];   // dry days that are cloudy or overcast
export const CLIMATE = [[8, 1], [10, 3], [14, 6], [20, 11], [25, 16], [28, 20], [32, 25], [32, 25], [28, 21], [23, 16], [17, 10], [11, 3]];   // mean high, low (°C)

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const H = 60;

export function plan(y, m, d) {
  const r = rng(y * 1000 + m * 40 + d + 7), mi = m - 1, events = [];
  const plum = (m === 6 && d >= 12) || (m === 7 && d <= 8);
  const [mh, ml] = CLIMATE[mi];
  let hi = Math.round(mh + (r() - 0.5) * 5), lo = Math.round(ml + (r() - 0.5) * 4);
  let sky = 'clear', wind = pickWind(r, mi), main = null;
  if (r() < TYPHOON[mi]) {
    events.push({ kind: 'typhoon', from: 0, to: 24 * H, peak: 1 }); sky = 'overcast'; wind = 'gale'; hi -= 3; main = 'typhoon';
  } else {
    const p = plum ? 0.68 : RAIN_DAYS[mi] / DAYS[mi];
    if (r() < p) {
      sky = 'overcast';
      if (!plum && r() < STORM[mi]) {
        const from = Math.round((13.5 + r() * 4) * H);
        events.push({ kind: 'storm', from, to: from + Math.round((0.8 + r() * 1.4) * H), peak: 0.9 + r() * 0.1 }); main = 'storm';
      } else if (r() < SNOW[mi]) {
        const from = Math.round(r() * 20 * H);
        events.push({ kind: 'snow', from, to: Math.min(24 * H, from + Math.round((2 + r() * 6) * H)), peak: 0.35 + r() * 0.6 }); main = 'snow';
        hi = Math.min(hi, 3 + Math.round(r() * 2)); lo = Math.min(lo, -1 - Math.round(r() * 2));
      } else {
        const from = plum ? Math.round(r() * 6 * H) : Math.round(r() * 21 * H), len = plum ? (8 + r() * 10) : (2 + r() * 7);
        const k = r(), peak = plum ? 0.4 + r() * 0.45 : k < 0.45 ? 0.3 + r() * 0.15 : k < 0.85 ? 0.55 + r() * 0.25 : 0.85 + r() * 0.15;
        events.push({ kind: 'rain', from, to: Math.min(24 * H, Math.round(from + len * H)), peak }); main = 'rain';
      }
      hi -= 2;
    } else if (r() < CLOUDY[mi]) sky = r() < 0.5 ? 'cloudy' : 'overcast';
  }
  if (r() < FOG[mi] && main !== 'storm' && main !== 'typhoon') events.push({ kind: 'fog', from: 4 * H, to: Math.round((8.8 + r() * 2) * H), peak: 0.55 + r() * 0.45 });
  if (lo > hi - 3) lo = hi - 3;
  const windDir = mi >= 10 || mi <= 2 ? [0.62, 0.78] : mi >= 4 && mi <= 8 ? [-0.7, -0.71] : [-0.848, 0.53];   // winter from the NW, summer from the SE, else off the river (north is -z)
  return { y, m, d, sky, events, wind, windDir, hi, lo, summary: summary(sky, events) };
}
function pickWind(r, mi) {
  const k = r(), winter = mi >= 10 || mi <= 2;
  return k < (winter ? 0.12 : 0.22) ? 'calm' : k < (winter ? 0.55 : 0.75) ? 'breeze' : k < (winter ? 0.93 : 0.97) ? 'windy' : 'gale';
}
function summary(sky, events) {
  const ev = events.find((e) => e.kind !== 'fog'), fog = events.find((e) => e.kind === 'fog');
  if (ev && ev.kind === 'typhoon') return { zh: '台风，暴雨大风', en: 'Typhoon: heavy rain, gales', icon: 'storm' };
  if (ev && ev.kind === 'storm') return { zh: '多云，午后雷阵雨', en: 'Cloudy, thunderstorms in the afternoon', icon: 'storm' };
  if (ev && ev.kind === 'snow') return { zh: ev.peak > 0.7 ? '小雪' : '雨夹雪', en: ev.peak > 0.7 ? 'Light snow' : 'Sleet', icon: 'snow' };
  if (ev && ev.kind === 'rain') {
    const late = ev.from > 12 * H, [zh, en] = ev.peak < 0.46 ? ['小雨', 'light rain'] : ev.peak < 0.82 ? ['中雨', 'rain'] : ['大雨', 'heavy rain'];
    return late ? { zh: `多云转${zh}`, en: `Cloudy, ${en} later`, icon: 'rain' } : { zh, en: en[0].toUpperCase() + en.slice(1), icon: 'rain' };
  }
  if (fog) return { zh: sky === 'clear' ? '晨雾，转晴' : '晨雾，转多云', en: sky === 'clear' ? 'Morning fog, then sunny' : 'Morning fog, then cloudy', icon: 'fog' };
  return sky === 'clear' ? { zh: '晴', en: 'Sunny', icon: 'sun' } : sky === 'cloudy' ? { zh: '多云', en: 'Cloudy', icon: 'suncloud' } : { zh: '阴', en: 'Overcast', icon: 'cloud' };
}

// how strongly an event is on at a minute: ramps of half an hour (a storm's of ten minutes) in and out
const amount = (e, t) => { const ramp = e.kind === 'storm' ? 10 : 30; if (t < e.from || t > e.to) return 0; return Math.min(1, (t - e.from) / ramp, (e.to - t) / ramp) * e.peak; };
export function at(P, minute) {
  const t = ((minute % 1440) + 1440) % 1440, o = { rain: 0, heavy: 0, snow: 0, haze: P.sky === 'overcast' ? 0.35 : P.sky === 'cloudy' ? 0.15 : 0, fog: 0, storm: 0, cover: P.sky === 'overcast' ? 0.8 : P.sky === 'cloudy' ? 0.4 : 0, wind: P.wind };
  for (const e of P.events) {
    const a = amount(e, t); if (a <= 0) continue;
    if (e.kind === 'rain') { o.rain = Math.max(o.rain, Math.min(1, a / 0.45)); o.heavy = Math.max(o.heavy, Math.max(0, (a - 0.45) / 0.55)); }
    if (e.kind === 'storm' || e.kind === 'typhoon') { o.rain = Math.max(o.rain, Math.min(1, a * 1.5)); o.heavy = Math.max(o.heavy, a); o.storm = Math.max(o.storm, e.kind === 'storm' ? a : a * 0.5); o.wind = a > 0.5 ? 'gale' : 'windy'; }
    if (e.kind === 'snow') { o.snow = Math.max(o.snow, a); if (e.peak <= 0.7) o.rain = Math.max(o.rain, a * 0.6); }   // (sleet: some of it rain)
    if (e.kind === 'fog') o.fog = Math.max(o.fog, a);
  }
  o.haze = Math.max(o.haze, Math.min(1, o.rain * 0.9 + o.snow * 0.7));
  o.cover = Math.max(o.cover, Math.min(1, o.rain * 1.2 + o.snow + o.storm), o.fog * 0.6);   // (how much of the sky is cloud: the sun's light goes with it)
  if (o.rain > 0.3 && o.wind === 'calm') o.wind = 'breeze';
  return o;
}
// the date after (y, m, d)
export function nextDay(y, m, d) { const t = new Date(Date.UTC(y, m - 1, d) + 86400000); return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]; }
export const DAYS_IN = (m, y) => (m === 2 && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : DAYS[m - 1]);
