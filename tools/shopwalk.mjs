// Shoppers by DiDi: watch one story through: a car pulls in at the Peace Hotel kerb, someone gets out,
// walks into a Nanjing Road shop, comes out with bags, walks to the pick-up kerb, gets a car and leaves.
// (The shop is set to the nearest one and the time inside cut short, so it runs in a few minutes.)
//   node tools/shopwalk.mjs (URL=, OUT=)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4&nolock&life=0&fresh&lang=en&hour=15:30`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.5; const s = document.createElement('style'); s.textContent = '#hud,#minimap,#dev{display:none!important}'; document.head.appendChild(s);
  const sh = window.__bund.world.shoppers; sh.stories[0].wait = 1; sh.stories[1].wait = 1e9; });
const st = () => p.evaluate(() => { const s = window.__bund.world.shoppers.stories[0]; return { phase: s.phase, x: +s.x.toFixed(1), z: +s.z.toFixed(1), served: s.served, bags: s.nBags, pickZ: s.pick ? s.pick.z : null, shop: s.shop && s.shop.id, ride: s.ride ? s.ride.phase : null, car: s.veh && s.veh.pickup ? { d: +(s.veh.pickup.stopS - s.veh.s).toFixed(1), st: s.veh.pickup.state } : null, log: s.log.join('>') }; });
const view = (x, z, yaw, pitch) => p.evaluate(([x, z, yaw, pitch]) => window.__bund.player.teleport(x, z, yaw, pitch), [x, z, yaw, pitch]);
// stand at (x, z) looking at (tx, tz) (yaw 0 faces north, -z)
const look = (x, z, tx, tz, pitch = -0.1) => view(x, z, Math.atan2(-(tx - x), -(tz - z)), pitch);
await look(-31.2, -212, -28, -230, -0.08);              // facing north along the west pavement, toward the Peace Hotel kerb
const shots = {}; const seen = new Set();
for (let i = 0; i < 360; i++) {
  await p.waitForTimeout(1500);
  const s = await st(); seen.add(s.phase); if (s.car) seen.add(`car:${s.car.st}`);
  if (i % 8 === 0) console.log(JSON.stringify(s));
  // the nearest shop, and not long inside
  if (s.phase === 'riding' && !shots.fix) { shots.fix = 1; await p.evaluate(() => { const sh = window.__bund.world.shoppers, s = sh.stories[0]; s.shop = sh.shops.reduce((a, b) => (b.x > a.x ? b : a)); }); }
  if (s.phase === 'inside') await p.evaluate(() => { const s = window.__bund.world.shoppers.stories[0]; s.t = Math.min(s.t, 2); });
  if (s.phase === 'alight' && !shots.alight) { shots.alight = 1; await p.screenshot({ path: `${dir}shop-alight.png`, timeout: 120000 }); }
  if (s.phase === 'toShop' && !shots.toShop && s.z > -214) { shots.toShop = 1; await look(-40, -196, s.x, s.z); }
  if (s.phase === 'outward' && !shots.out) { shots.out = 1; await look(s.x - 3.5, s.z < -201 ? s.z + 4 : s.z - 4, s.x, s.z, -0.15); await p.waitForTimeout(1200); await p.screenshot({ path: `${dir}shop-bags.png`, timeout: 120000 }); }
  if (s.phase === 'outward' && shots.out === 1 && s.x > -36 && s.pickZ != null) { shots.out = 2; await look(-31.6, s.pickZ + 8, -28.6, s.pickZ - 2, -0.1); }
  if (s.phase === 'wait' && !shots.wait) { shots.wait = 1; await p.waitForTimeout(800); await p.screenshot({ path: `${dir}shop-wait.png`, timeout: 120000 }); }
  if (s.phase === 'board' && !shots.board) { shots.board = 1; await p.screenshot({ path: `${dir}shop-board.png`, timeout: 120000 }); }
  if (s.served >= 1) break;
}
const s = await st();
ok(s.served >= 1, `one shopper through: ${s.log}`);
for (const ph of ['riding', 'alight', 'toShop', 'inside', 'outward', 'wait', 'board', 'leaving']) ok(s.log.includes(ph) || seen.has(ph), `went through ${ph}`);
const car = await p.evaluate(() => window.__bund.world.shoppers.state.stories[0]);
const stuck = await p.evaluate(() => window.__bund.traffic.vehicles.filter((v) => v.pickup && /^shopper/.test(v.pickup.npc || '') && v.pickup.state === 'parked').length);
ok(stuck === 0, `no shopper car left parked (${stuck})`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
