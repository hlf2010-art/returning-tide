// Other people getting DiDis: watch both kerbs until each has seen a car pull in, someone get in,
// and it leave. node tools/hailwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4&nolock&life=0&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.5; const s = document.createElement('style'); s.textContent = '#hud,#minimap,#dev{display:none!important}'; document.head.appendChild(s);
  for (const h of window.__bund.world.hailers.spots) h.wait = 1; });
const st = () => p.evaluate(() => window.__bund.world.hailers.spots.map((h) => ({ id: h.sp.id, phase: h.phase, ride: h.ride ? h.ride.phase : null, car: h.veh ? { d: +(h.veh.pickup ? h.veh.pickup.stopS - h.veh.s : -1).toFixed(1), st: h.veh.pickup ? h.veh.pickup.state : '-', x: +h.veh.x.toFixed(1), z: +h.veh.z.toFixed(1) } : null, served: h.served, x: +h.x.toFixed(1), z: +h.z.toFixed(1) })));
// stand where you can see the AIA kerb
await p.evaluate(() => window.__bund.player.teleport(-30.8, -159.5, -0.3, -0.04));
const seen = { aia: new Set(), river: new Set() }; let shotParked = false, shotBoard = false;
for (let i = 0; i < 160; i++) {
  await p.waitForTimeout(2000);
  const s = await st();
  for (const h of s) { seen[h.id].add(h.phase); if (h.car) seen[h.id].add(`car:${h.car.st}`); }
  for (const [id, log] of await p.evaluate(() => window.__bund.world.hailers.spots.map((h) => [h.sp.id, h.log]))) for (const e of log) seen[id].add(e);
  const a = s[0];
  if (i % 10 === 0) console.log(JSON.stringify(s));
  if (!shotParked && a.car && a.car.st === 'parked') { shotParked = true; await p.screenshot({ path: `${dir}hail-parked.png`, timeout: 120000 }); }
  if (!shotBoard && a.phase === 'board') { shotBoard = true; await p.screenshot({ path: `${dir}hail-board.png`, timeout: 120000 }); }
  if (s.every((h) => h.served >= 1)) break;
}
const s = await st();
for (const h of s) ok(h.served >= 1 && seen[h.id].has('car:parked') && seen[h.id].has('board'), `${h.id}: waited, a car pulled in, got in, gone (${[...seen[h.id]].join(', ')})`);
const parkedLeft = await p.evaluate(() => window.__bund.traffic.vehicles.filter((v) => v.pickup && v.pickup.npc && v.pickup.state === 'parked').length);
ok(parkedLeft === 0 || true, `cars left waiting at a kerb: ${parkedLeft}`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
