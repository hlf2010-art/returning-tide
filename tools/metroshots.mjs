// Photographs of Line 2's stations and train (and the Bund doors), for docs and checking: teleports and
// the clock, not walking (tools/metrowalk.mjs walks it).
//   URL=http://localhost:4181/ OUT=<dir> UILANG=en|zh [ONLY=name,name] node tools/metroshots.mjs
import { createRequire } from 'module';
import { STATIONS, GATE, gateP, ESC, PLAT, DOOR_AS, SEC, Y, CONC } from '../src/world/metroLayout.js';
import { nextStop, trainClock } from '../src/engine/metroLine.js';
import { TIME_RATE } from '../src/engine/life.js';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4181/', out = `${process.env.OUT || '.'}/`, lang = process.env.UILANG || 'zh', only = (process.env.ONLY || '').split(',').filter(Boolean);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(`${url}?q=4&nolock&fresh&legacy&lang=${lang}&life=0&hour=10:00`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 300000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#dev,#tip,#hud .objective,#minimap{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(1500);
const [E, L] = STATIONS;
const stand = (x, z, y, tx, ty, tz) => ev(([x, z, y, tx, ty, tz]) => { const B = window.__bund, d = Math.hypot(tx - x, tz - z); B.player.teleport(x, z, Math.atan2(-(tx - x), -(tz - z)), Math.atan2(ty - (y + 1.68), d), y); }, [x, z, y, tx, ty, tz]);
const at = (st, a, pp, y, ta, tp, ty) => stand(...st.F.toW(a, pp), y, ...st.F.toW(ta, tp).flatMap((v, i) => (i === 0 ? [v, ty] : [v])));
// the clock to an absolute game minute (with seconds)
const clockTo = (abs) => ev((abs) => { const l = window.__bund.life; l.clock.day = Math.floor(abs / 1440); const m = abs - l.clock.day * 1440; l.clock.minute = Math.floor(m); l.clock.sec = (m - Math.floor(m)) * 60; }, abs);
const shot = async (name, wait = 3500) => { if (only.length && !only.includes(name)) return; await p.waitForTimeout(wait); await p.screenshot({ path: `${out}metro-${name}.png`, timeout: 300000 }); console.log('shot', name); };
const day = await ev(() => window.__bund.life.clock.day);
// a train standing at a station, eastbound: the minute it stops (+ s seconds of its dwell)
const standing = (st, dir, s = 8) => { const n = nextStop(trainClock(day * 1440 + 10 * 60), st, dir); return (n.T + s) * TIME_RATE / 60; };

await at(E, -10, -11.5, Y.C, GATE.a, 1, Y.C + 1.2); await shot('enr-concourse', 6000);
await at(E, -3, 6.5, Y.C, GATE.a, -1, Y.C + 0.9); await shot('enr-security');
await at(E, GATE.a - 2.6, 3.2, Y.C, GATE.a + 3, -1, Y.C + 0.8); await shot('enr-gates');
await at(E, ESC.aT - 3.5, 0.5, Y.C, ESC.aB, 0, Y.P + 0.8); await shot('enr-escalators');
await clockTo(standing(0, 1, 9));
await at(E, DOOR_AS[17] + 1.5, 3.4, Y.P, DOOR_AS[17] - 6, 7, Y.P + 1.4); await shot('enr-platform-train', 5000);
await at(E, PLAT.a0 + 30, 0, Y.P, PLAT.a1, 0, Y.P + 1.6); await shot('enr-platform-long');
// aboard: step into a car at its door, then let the train take you
await at(E, DOOR_AS[17], 7.4, Y.P, DOOR_AS[17] + 8, 7.6, Y.P + 1.5); await shot('car-inside', 4000);
const t0 = standing(0, 1, 9);
for (let k = 1; k <= 14; k++) { await clockTo(t0 + k * 0.4); await p.waitForTimeout(500); }
await shot('car-tunnel', 1500);
console.log('riding', await ev(() => window.__bund.world.metro.riding), JSON.stringify(await ev(() => window.__bund.player.body)));
await clockTo(day * 1440 + 10 * 60 + 30);
await at(L, CONC.a0 + 8, -4, Y.C, GATE.a, 2, Y.C + 1.3); await shot('ljz-concourse', 6000);
// the Bund doors at night
await clockTo(day * 1440 + 20 * 60);
await stand(-27.5, -142.5, 0.15, -34.6, 2.2, -145.5); await shot('aia-door', 6000);
await stand(-47.0, -205.5, 0.15, -48, 1.6, -212.6); await shot('peace-door', 4000);
await browser.close();
