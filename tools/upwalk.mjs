// The Peace Hotel's sixth floor: key card, lift up, corridor, room 612's door, the room, the bed, the
// window, back down. node tools/upwalk.mjs (URL= a running build, OUT= where screenshots go)
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
await p.evaluate(() => { window.__bund.dtMax = 0.2; const s = document.createElement('style'); s.textContent = '#minimap,#dev{display:none!important}'; document.head.appendChild(s); });
const S = () => p.evaluate(() => { const b = window.__bund.player.body; return { x: b.x, z: b.z, y: b.y, mode: window.__bund.mode }; });
const prompt = () => p.evaluate(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
const walk = async (secs, key = 'KeyW') => { await p.keyboard.down(key); await p.waitForTimeout(secs * 1000); await p.keyboard.up(key); await p.waitForTimeout(400); };
const settle = () => p.waitForFunction(() => window.__bund.mode === 'play', null, { timeout: 60000 });
const shot = (n) => p.screenshot({ path: `${dir}up-${n}.png`, timeout: 120000 });
// the lifts without a key: refused
await p.evaluate(() => window.__bund.player.teleport(-48, -241.4, 0, 0.05)); await p.waitForTimeout(1500);
let pr = await prompt(); ok(/Lifts/.test(pr), `prompt at the lifts: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
let s = await S(); ok(s.y < 1, 'no key card: the guard keeps you down here');
// key, then up
await p.evaluate(() => { window.__bund.life.flags.hotelKey = true; }); await p.keyboard.press('KeyE');
await p.waitForTimeout(800); s = await S(); ok(s.mode === 'travel', 'the lift: a fade');
await settle(); s = await S();
ok(Math.abs(s.y - 23.5) < 0.05 && s.z < -240, `up on the sixth floor (y=${s.y.toFixed(2)}, z=${s.z.toFixed(1)})`);
await p.waitForTimeout(1500); await shot('lobby');
// down the corridor (the hall's pillars are not up here)
await p.evaluate(() => window.__bund.player.teleport(-44.5, -239.6, Math.PI, 0, 23.5)); await walk(9);
s = await S(); ok(s.z > -233 && Math.abs(s.y - 23.5) < 0.05, `along the corridor (z=${s.z.toFixed(1)}, y=${s.y.toFixed(2)})`);
await walk(9); s = await S(); ok(s.z < -221.2 && s.z > -222.5, `the hoarding stops you (z=${s.z.toFixed(1)})`);
await shot('corridor');
// 612: shut, then the key card
await p.evaluate(() => window.__bund.player.teleport(-44.6, -227.2, -Math.PI / 2, -0.05, 23.5)); await p.waitForTimeout(1500);
pr = await prompt(); ok(/612/.test(pr), `prompt at the door: "${pr}"`);
await walk(1.5); s = await S(); ok(s.x < -43.3, `the door is shut (x=${s.x.toFixed(2)})`);
await p.evaluate(() => window.__bund.player.teleport(-44.6, -227.2, -Math.PI / 2, -0.05, 23.5)); await p.waitForTimeout(800);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
await walk(4); s = await S(); ok(s.x > -43.0, `in through the open door (x=${s.x.toFixed(2)})`);
ok(await p.evaluate(() => window.__bund.world.upper.inRoom), 'in room 612');
// the room and its window
await p.evaluate(() => window.__bund.player.teleport(-41.8, -228.2, -Math.PI / 2 - 0.35, -0.05, 23.5)); await p.waitForTimeout(2500); await shot('room');
await p.evaluate(() => window.__bund.player.teleport(-36.3, -231.2, -Math.PI / 2 + 0.05, -0.12, 23.5)); await p.waitForTimeout(2500); await shot('window');
pr = await prompt(); ok(/window/i.test(pr), `prompt at the window: "${pr}"`);
await p.evaluate(() => window.__bund.player.teleport(-37.0, -227.8, Math.PI + 0.9, -0.2, 23.5)); await p.waitForTimeout(2000); await shot('bed');
// the bed: at night, sleep till the morning
await p.evaluate(() => { const L = window.__bund.life; L.clock.minute = 23 * 60 + 10; window.__bund.player.teleport(-38.6, -229.6, 0, -0.5, 23.5); }); await p.waitForTimeout(1500);
pr = await prompt(); ok(/Sleep/.test(pr), `prompt at the bed (23:10): "${pr}"`);
const day = await p.evaluate(() => window.__bund.life.clock.day);
await p.keyboard.press('KeyE'); await settle();
const ck = await p.evaluate(() => window.__bund.life.clock);
ok(ck.day === day + 1 && ck.minute >= 450 && ck.minute < 470, `slept till the morning (day ${ck.day}, ${Math.floor(ck.minute / 60)}:${String(ck.minute % 60).padStart(2, '0')})`);
// out and down
await p.evaluate(() => window.__bund.player.teleport(-49.4, -242.6, 0, 0.05, 23.5)); await p.waitForTimeout(1500);
pr = await prompt(); ok(/Down/.test(pr), `prompt at the lifts upstairs: "${pr}"`);
await p.keyboard.press('KeyE'); await settle(); s = await S();
ok(s.y < 1 && s.z < -240, `back down in the hall (y=${s.y.toFixed(2)})`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
