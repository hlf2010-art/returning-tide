// Shanghai's weather by the day (engine/climate.js): the same date always plays the same, and over many years the
// months come out as the city's climate has them.
import { plan, at, nextDay, DAYS_IN } from '../src/engine/climate.js';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

const a = plan(2026, 11, 9), b = plan(2026, 11, 9);
ok(JSON.stringify(a) === JSON.stringify(b), 'the same date gives the same day');
const stats = Array.from({ length: 12 }, () => ({ days: 0, wet: 0, snow: 0, storm: 0, fog: 0, typhoon: 0 }));
for (let y = 2000; y < 2100; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= DAYS_IN(m, y); d++) {
  const p = plan(y, m, d), s = stats[m - 1]; s.days++;
  if (p.events.some((e) => ['rain', 'storm', 'snow', 'typhoon'].includes(e.kind))) s.wet++;
  if (p.events.some((e) => e.kind === 'snow')) s.snow++;
  if (p.events.some((e) => e.kind === 'storm')) s.storm++;
  if (p.events.some((e) => e.kind === 'fog')) s.fog++;
  if (p.events.some((e) => e.kind === 'typhoon')) s.typhoon++;
}
const perMonth = stats.map((s) => +(s.wet / s.days * 30.4).toFixed(1));
console.log('rainy days a month:', perMonth.join(' '));
ok(perMonth[5] === Math.max(...perMonth) && perMonth[5] > 14, 'June (the plum rains) is the wettest month');
ok(perMonth[9] < 9 && perMonth[11] < 9, 'October and December are among the driest');
ok(stats.every((s, i) => (i >= 3 && i <= 9 ? s.snow === 0 : true)), 'no snow from April to October');
const snowDays = stats.reduce((t, s) => t + s.snow, 0) / 100;
ok(snowDays > 0.8 && snowDays < 6, `a little snow most winters (${snowDays.toFixed(1)} days a year)`);
ok(stats[6].storm > stats[0].storm && stats[7].storm > 5 * 100 * 0 && stats[0].storm === 0, 'thunderstorms in summer, none in January');
ok(stats[11].fog > stats[6].fog * 4, 'foggy mornings in winter, hardly any in summer');
ok(stats[0].typhoon === 0 && stats[7].typhoon > 0, 'typhoons only in late summer');
// at(): every level in range, a storm's evening, a dry day's noon
let bad = 0;
for (let k = 0; k < 400; k++) { const p = plan(2027, 1 + (k % 12), 1 + (k % 28)); for (let t = 0; t < 1440; t += 37) { const w = at(p, t); for (const key of ['rain', 'heavy', 'snow', 'haze', 'fog', 'storm']) if (!(w[key] >= 0 && w[key] <= 1)) bad++; } }
ok(bad === 0, 'every level stays within 0..1 at every hour');
let storm = null; for (let d = 1; d < 200 && !storm; d++) { const p = plan(2027, 7, 1 + (d % 31)); if (p.events.some((e) => e.kind === 'storm')) storm = p; }
const e = storm && storm.events.find((x) => x.kind === 'storm');
ok(!!e && at(storm, (e.from + e.to) / 2).heavy > 0.8 && at(storm, (e.from + e.to) / 2).wind === 'gale' && at(storm, e.from - 60).storm === 0, 'a summer thunderstorm: heavy, a gale at its height, nothing an hour before');
ok(JSON.stringify(nextDay(2026, 12, 31)) === '[2027,1,1]' && JSON.stringify(nextDay(2028, 2, 28)) === '[2028,2,29]', 'the next day across a year and a leap day');
ok(typeof a.summary.zh === 'string' && typeof a.summary.en === 'string' && a.hi > a.lo, 'each day has a forecast line and a high above its low');
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
