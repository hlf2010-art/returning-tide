// Walkthrough: places (phase 4.4). The shengjian shop on Nanjing Road: order at the counter, pay by
// phone, take the tray, sit, eat (the right way and the wrong way), get up; shut after hours. The river
// cruise: buy a ticket at the pier, walk on board, sail (carried by the boat, kept inside its rails),
// skip to the end, step back off onto the promenade.
//   URL=http://localhost:4174/ OUT=<dir> NODE_PATH=$(npm root -g) node tools/placeswalk.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.env.URL || 'http://localhost:4174/', out = process.env.OUT || '.';
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(`${url}?q=3&nolock&fresh&lang=en&tod&hour=12:10&crowd=0.2`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 400000 });
const ev = (f, a) => p.evaluate(f, a);
await ev(() => { window.__bund.start(); window.__bund.dtMax = 0.25; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
await p.waitForTimeout(2500);
const tp = (x, z, yaw = 0, pitch = 0) => ev(([x, z, y, pt]) => window.__bund.player.teleport(x, z, y, pt), [x, z, yaw, pitch]);
const face = (x, z, pitch = -0.05) => ev(([x, z, pitch]) => { const b = window.__bund.player; b.yaw = Math.atan2(-(x - b.body.x), -(z - b.body.z)); b.pitch = pitch; }, [x, z, pitch]);
const prompt = () => ev(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
const until = async (f, a, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, a)) return true; await p.waitForTimeout(400); } return false; };
const ledger = () => ev(() => window.__bund.life.wallet.ledger.length);
const key = async (k, wait = 500) => { await p.keyboard.press(k); await p.waitForTimeout(wait); };

// ================= the shengjian shop =================
await tp(-145, -194.5, Math.PI, 0.08); await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/shop-front.png` });
await tp(-148.4, -188.3, Math.PI, -0.05); await face(-148.4, -185.85, -0.05); await p.waitForTimeout(1500);
let pr = await prompt();
ok(/Order/.test(pr), `at the counter: "${pr}"`);
const l0 = await ledger();
await key('KeyE', 1200);
ok(await ev(() => window.__bund.mode === 'menu' && !document.getElementById('shop-menu').classList.contains('hidden')), 'the order card is up');
await key('Digit2'); await key('Digit3');
await p.screenshot({ path: `${out}/shop-menu.png` });
await key('Enter', 1500);
const ord = await ev(() => window.__bund.world.dumpling.order);
ok(ord && ord.buns === 8 && ord.soup === 1 && (await ledger()) === l0 + 1 && (await ev(() => window.__bund.mode)) === 'play', `paid by phone (¥37): 8 shengjian and a beef soup, order ${ord && ord.number}`);
ok(await until(() => window.__bund.world.dumpling.ready <= 0, null, 240000), 'the order cooks (the lid comes up)');
await tp(-145.7, -184.6, Math.PI, -0.2); await face(-145.7, -182.3, -0.25);
ok(await until(() => /Take your tray/.test(document.getElementById('prompt').innerText), null, 60000), 'the cook calls it: "Take your tray"');
await key('KeyE', 800);
ok(await ev(() => !!window.__bund.world.dumpling.tray), 'tray in hand');
await tp(-141.3, -189.2, Math.PI, -0.3); await face(-141.3, -188.2, -0.6); await p.waitForTimeout(1200);
pr = await prompt();
ok(/Sit down and eat/.test(pr), `a free seat: "${pr}"`);
await key('KeyE', 1500);
ok(await ev(() => window.__bund.mode === 'seat' && window.__bund.world.dumpling.seated), 'sat down at the table');
await p.screenshot({ path: `${out}/shop-table.png` });
await key('Digit1', 700);                                    // the right way: a small bite, sip the soup
const t1 = await ev(() => document.querySelector('#ride-sub .tx').textContent);
await key('Digit2', 700);                                    // pop one in whole: hot
const t2 = await ev(() => document.querySelector('#ride-sub .tx').textContent);
ok(/sip/i.test(t1) && /Hot/.test(t2) && (await ev(() => window.__bund.life.flags.food.burnt)) === 1, `the first bite: "${t1.slice(0, 50)}…"; whole: "${t2.slice(0, 30)}…"`);
for (let i = 0; i < 6; i++) await key('Digit1', 300);
for (let i = 0; i < 3; i++) await key('Digit1', 300);       // the soup (the only choice left)
const fd = await ev(() => window.__bund.life.flags.food);
ok(fd.shengjian === 8 && fd.meals === 1, `all eaten: ${fd.shengjian} shengjian, the soup, meal ${fd.meals}`);
await key('KeyE', 1200);
ok(await ev(() => window.__bund.mode === 'play' && !window.__bund.world.dumpling.seated), 'E: up from the table');
// after hours
await ev(() => window.__bund.setHour(22, 15)); await tp(-145, -194.5, Math.PI, 0.08); await p.waitForTimeout(2000);
const shut = await ev(() => { const g = window.__bund.scene.getObjectByName('dumpling-shop'); let sh = null; g.traverse((o) => { if (o.isMesh && o.material && o.material.map && o.geometry.parameters && o.geometry.parameters.height === 3.3) sh = o; }); return sh && sh.visible; });
await p.screenshot({ path: `${out}/shop-closed.png` });
await tp(-145, -190.8, Math.PI); await p.waitForTimeout(400);
for (let i = 0; i < 6; i++) { await ev(() => window.__bund.player.update(0.1)); }
const z = await ev(() => { const b = window.__bund.player.body; window.__bund.player.teleport(b.x, b.z); return b.z; });
ok(shut, '10:15 pm: the shutter is down');

// ================= the river cruise =================
await ev(() => window.__bund.setHour(19, 41));
await p.waitForTimeout(1500);
ok(await ev(() => window.__bund.world.cruise.state.status === 'docked' && window.__bund.world.cruise.state.next === 1200), 'the boat is alongside the pier; next sailing 8 pm');
await tp(23.2, 65, -Math.PI / 2, 0); await face(27.1, 65, -0.1); await p.waitForTimeout(1200);
pr = await prompt();
ok(/Buy a ticket/.test(pr), `at the pier gate: "${pr}"`);
await p.screenshot({ path: `${out}/cruise-pier.png` });
const l1 = await ledger();
await key('KeyE', 1200);
ok((await ledger()) === l1 + 1 && (await ev(() => window.__bund.life.flags.cruise.ticket)) === 1200, 'ticket bought (¥120, Alipay)');
// walk out along the pier and on board
for (const x of [26.6, 29, 32, 35, 37.2, 38.6, 40.2, 41.5]) { await ev((x) => { const b = window.__bund.player; b.body.x = x; b.body.z = 65; }, x); await ev(() => window.__bund.player.update(0.05)); await p.waitForTimeout(250); }
await p.waitForTimeout(800);
ok(await ev(() => window.__bund.world.cruise.aboard), 'aboard the boat');
await face(140, -60, 0.05); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/cruise-aboard-docked.png` });
// sailing: just before eight, then on
await ev(() => { const L = window.__bund.life; L.clock.minute = 19 * 60 + 59; L.clock.sec = 56; });
ok(await until(() => window.__bund.world.cruise.state.status === 'out', null, 90000), 'eight o\'clock: she sails');
await p.waitForTimeout(2000);
const r1 = await ev(() => ({ aboard: window.__bund.world.cruise.aboard, rides: window.__bund.life.flags.cruise.rides, x: window.__bund.player.body.x, z: window.__bund.player.body.z }));
ok(r1.aboard && r1.rides === 1, `aboard as she leaves: ride ${r1.rides}`);
// on up the river (the clock moves the boat; you go with it)
await ev(() => { const L = window.__bund.life; L.clock.minute = 20 * 60 + 4; L.clock.sec = 0; });
await p.waitForTimeout(3000);
const r2 = await ev(() => { const c = window.__bund.world.cruise.state, b = window.__bund.player.body; const dx = b.x - c.x, dz = b.z - c.z, n = Math.cos(c.h), s = Math.sin(c.h); return { aboard: window.__bund.world.cruise.aboard, s: c.s, x: b.x, z: b.z, y: b.y, lx: dx * n - dz * s, lz: dx * s + dz * n }; });
ok(r2.aboard && r2.s > 200 && Math.abs(r2.lx) < 4 && r2.z < 0, `carried up the river: ${r2.s.toFixed(0)} m along, you at (${r2.x.toFixed(0)}, ${r2.z.toFixed(0)}), still on deck (${r2.lx.toFixed(1)}, ${r2.lz.toFixed(1)} on board)`);
// walk to the rail and try to keep going: the rail keeps you in
// try to step over the rail: put yourself just past it and take a step; the rail keeps you in
const r3 = await ev(() => { const B = window.__bund, c = B.world.cruise.state, b = B.player.body, n = Math.cos(c.h), s = Math.sin(c.h);
  const at = (lx, lz) => [c.x + lx * n + lz * s, c.z - lx * s + lz * n]; [b.x, b.z] = at(-4.4, -5); B.player.update(0.05);
  const dx = b.x - c.x, dz = b.z - c.z; return { aboard: B.world.cruise.aboard, lx: dx * n - dz * s }; });
ok(r3.aboard && Math.abs(r3.lx) <= 3.65, `walking at the rail: kept inside it (${r3.lx.toFixed(2)} m from the centreline)`);
await face(640, -42, 0.12); await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/cruise-river.png` });
// skip to the end at the wheelhouse door
const door = await ev(() => { const c = window.__bund.world.cruise.state, n = Math.cos(c.h), s = Math.sin(c.h); const at = (lx, lz) => [c.x + lx * n + lz * s, c.z - lx * s + lz * n]; return { stand: at(0, 11.4), door: at(0, 13.5) }; });
await tp(door.stand[0], door.stand[1], 0, 0, 3); await face(door.door[0], door.door[1], -0.05); await p.waitForTimeout(1200);
pr = await prompt();
ok(/skip/.test(pr), `at the wheelhouse door: "${pr}"`);
await key('KeyE', 500);
ok(await until(() => window.__bund.world.cruise.state.status === 'docked' && window.__bund.mode === 'play', null, 60000), 'back alongside the pier');
await p.waitForTimeout(1500);
ok(await ev(() => window.__bund.world.cruise.aboard), 'still aboard (carried home)');
// step off through the gate
const gate = await ev(() => { const c = window.__bund.world.cruise.state, n = Math.cos(c.h), s = Math.sin(c.h); return [c.x + 0 * n + 0 * s, c.z]; });
for (const x of [41.5, 40, 38.9, 37.5, 34, 30, 27.5, 25.5, 23]) { await ev((x) => { const b = window.__bund.player; b.body.x = x; b.body.z = 65; }, x); await ev(() => window.__bund.player.update(0.05)); await p.waitForTimeout(200); }
const r4 = await ev(() => ({ aboard: window.__bund.world.cruise.aboard, x: window.__bund.player.body.x, y: window.__bund.player.body.y }));
ok(!r4.aboard && r4.x < 26 && Math.abs(r4.y - 3) < 0.2, `back on the promenade (x ${r4.x.toFixed(1)}, y ${r4.y.toFixed(2)})`);

ok(errors.length === 0, `no errors (${errors.slice(0, 3).join(' | ')})`);
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
await browser.close();
process.exit(failed ? 1 : 0);
