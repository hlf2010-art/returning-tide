// Driving the Strale once it's yours: in at the driver's door, along Hankou Road, the kerb stops you,
// traffic queues behind you on Zhongshan Road, park, out; it stays where you left it.
// node tools/drivewalk.mjs (URL=, OUT=)
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
await p.waitForFunction(() => window.__bund.world.huracan.loaded, null, { timeout: 120000 });
await p.evaluate(() => { window.__bund.dtMax = 0.1; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s);
  const L = window.__bund.life; L.flags.car = { model: 'huracan', plate: '沪A·D9527' }; L.flags.carBuy = { stage: 'delivered', log: [] }; });
const D = () => p.evaluate(() => { const d = window.__bund.world.driving.state; return d ? { x: d.x, z: d.z, yaw: d.yaw, v: d.v, gear: d.gear, mode: window.__bund.mode } : { mode: window.__bund.mode }; });
const hold = async (keys, secs) => { for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(secs * 1000); for (const k of keys) await p.keyboard.up(k); };
// to the driver's door (north side: the car faces east, left-hand drive)
await p.evaluate(() => window.__bund.player.teleport(-40.9, 0.2, Math.PI, -0.3)); await p.waitForTimeout(1500);
let pr = await p.evaluate(() => document.getElementById('prompt').innerText.replace(/\n/g, ' '));
ok(/Strale.*Drive/.test(pr), `at the driver's door: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
let s = await D(); ok(s.mode === 'drive', 'in the driver\'s seat');
await p.screenshot({ path: `${dir}drive-start.png`, timeout: 120000 });
// east along Hankou Road
await hold(['KeyW'], 6); s = await D();
ok(s.x > -38 && Math.abs(s.z - 2.86) < 0.6, `off along Hankou Road (x ${s.x.toFixed(1)}, ${(s.v * 3.6).toFixed(0)} km/h, gear ${s.gear})`);
await p.screenshot({ path: `${dir}drive-chase.png`, timeout: 120000 });
// steer into the south kerb (back on Hankou Road): it holds
await p.evaluate(() => { const d = window.__bund.world.driving.state; d.x = -75; d.z = 2.0; d.yaw = 0; d.v = 0; });
await hold(['KeyD', 'KeyW'], 4); await hold(['KeyS'], 3); s = await D();
const edge = await p.evaluate(() => { const d = window.__bund.world.driving.state; return Math.max(...[0, 1, 2, 3].map((i) => { const c = Math.cos(d.yaw), sn = Math.sin(d.yaw), f = i < 2 ? 2.23 : -2.23, l = i % 2 ? -0.965 : 0.965; return d.z - sn * f - c * l; })); });
ok(edge < 4.0, `the kerb stops it (the body's south edge at z ${edge.toFixed(2)}; kerb at 4)`);
// the driver's seat view
await p.keyboard.press('KeyV'); await p.waitForTimeout(1500); await p.screenshot({ path: `${dir}drive-seat.png`, timeout: 120000 }); await p.keyboard.press('KeyV');
// on Zhongshan Road in the northbound lane, stopped: the traffic queues behind, nobody drives through
await p.evaluate(() => { const d = window.__bund.world.driving.state; d.x = -14.2; d.z = -60; d.yaw = Math.PI / 2; d.v = 0; });
let worst = 99;
for (let i = 0; i < 25; i++) {
  await p.waitForTimeout(1000);
  const g = await p.evaluate(() => { const d = window.__bund.world.driving.state; return Math.min(99, ...window.__bund.traffic.vehicles.filter((v) => v.active && Math.abs(v.x - d.x) < 1.5 && v.z > d.z).map((v) => (v.z - v.len / 2) - (d.z + 2.23))); });
  worst = Math.min(worst, g);
}
ok(worst > 0.3, `northbound traffic stops behind you (closest gap ${worst.toFixed(2)} m)`);
await p.evaluate(() => window.__bund.player.teleport(-14.2, -60, 0, 0)); 
await p.screenshot({ path: `${dir}drive-queue.png`, timeout: 120000 });
// park and get out
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
s = await D();
const park = await p.evaluate(() => ({ park: window.__bund.life.flags.carPark, pos: window.__bund.player.body, car: window.__bund.world.huracan.group.position }));
ok(s.mode === 'play' && park.park && Math.abs(park.park.x - -14.2) < 0.1 && Math.hypot(park.pos.x - park.car.x, park.pos.z - park.car.z) < 2.5, `parked where you stopped, out beside it (${park.park.x}, ${park.park.z})`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
