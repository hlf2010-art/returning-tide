// A new game, the player's own way to the wheel: E at the parked Huracán on Hankou Road (Zhixia passes
// on Vivian's card), add Vivian in WeChat, meet her at the car, "Can I take it for a drive?", and drive
// it tens of metres with real key presses; stop, E, and it's back by the kerb with Vivian.
// node tools/testdrivewalk.mjs (URL=, OUT=; LOCK=1 to leave pointer lock on, as a player has it)
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:4173/'}?q=4${process.env.LOCK ? '' : '&nolock'}&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.waitForFunction(() => window.__bund.world.huracan.loaded, null, { timeout: 120000 });
await p.evaluate(() => { window.__bund.dtMax = 0.25; });   // (headless frames are slow: let game time keep up a little)
const prompt = () => p.evaluate(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
const click = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
const hold = async (keys, secs) => { for (const k of keys) await p.keyboard.down(k); await p.waitForTimeout(secs * 1000); for (const k of keys) await p.keyboard.up(k); };
// 1. on the pavement beside the yellow car (south side, where people walk), looking at it
await p.evaluate(() => window.__bund.player.teleport(-40.6, 5.6, 0, -0.35)); await p.waitForTimeout(1500);
let pr = await prompt();
ok(/Huracán/.test(pr), `at the parked car, a prompt: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
let st = await p.evaluate(() => (window.__bund.life.flags.carBuy || {}).stage);
ok(st === 'lead', `E: Zhixia sends Vivian's card (stage ${st})`);
// 2. WeChat: add Vivian; she books the demo car here in twenty minutes
await p.keyboard.press('KeyP'); await p.waitForTimeout(500); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await click('#phone [data-act="decline"]'); await p.waitForTimeout(300);   // a call might be ringing
await click('#phone [data-act="app"][data-id="chats"]'); await p.waitForTimeout(400);
await click('#phone [data-act="openThread"][data-id="zhixia"]'); await p.waitForTimeout(600);
ok(await click('#phone [data-act="addContact"]'), "Zhixia's chat: the card's Add button");
await p.waitForTimeout(500);
st = await p.evaluate(() => window.__bund.life.flags.carBuy);
ok(st.stage === 'booked', `Vivian books the test drive (at ${Math.floor(st.at / 60) % 24}:${String(st.at % 60).padStart(2, '0')})`);
await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
// 3. twenty game minutes on (five real ones): she's there, and says so
await p.evaluate(() => { const L = window.__bund.life, at = L.flags.carBuy.at; L.clock.day = Math.floor(at / 1440); L.clock.minute = at % 1440; });
await p.waitForTimeout(2000);
const here = await p.evaluate(() => ({ present: window.__bund.world.carSale.present, msg: window.__bund.life.threads.vivian.messages.at(-1).text }));
ok(here.present && /汉口路/.test(here.msg), `Vivian is at the car and messages: "${here.msg}"`);
// walk up to her (someone stopping to photograph the car can be in the way: come at her from another side)
for (const [dx, dz] of [[2.2, 0.4], [-2.2, 0.4], [0.3, 2.2], [1.8, -0.5]]) {
  await p.evaluate(([dx, dz]) => window.__bund.player.teleport(-39.4 + dx, 4.71 + dz, Math.atan2(dx, dz), -0.05), [dx, dz]); await p.waitForTimeout(1500);
  pr = await prompt(); if (/Vivian/.test(pr)) break;
}
ok(/Vivian/.test(pr), `beside her: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
const ch = await p.evaluate(() => document.querySelector('#ride-sub .ch').innerText.replace(/\n/g, ' '));
ok(/take it for a drive/i.test(ch), `her answers include the test drive: "${ch}"`);
await p.keyboard.press('Digit2'); await p.waitForTimeout(1500);
let mode = await p.evaluate(() => window.__bund.mode);
ok(mode === 'drive', `at the wheel (mode ${mode})`);
await p.screenshot({ path: `${dir}testdrive-start.png`, timeout: 120000 });
// 4. drive: W, then a little steering, with real key presses
const at0 = await p.evaluate(() => { const d = window.__bund.world.driving.state; return { x: d.x, z: d.z }; });
await hold(['KeyW'], 10);
await hold(['KeyW', 'KeyA'], 1);
await hold(['KeyW', 'KeyD'], 1);
await hold(['KeyW'], 4);
const s1 = await p.evaluate(() => { const d = window.__bund.world.driving.state; return { x: d.x, z: d.z, v: d.v, yaw: d.yaw }; });
const dist = Math.hypot(s1.x - at0.x, s1.z - at0.z);
ok(dist > 20, `drove ${dist.toFixed(1)} m (now ${(s1.v * 3.6).toFixed(0)} km/h at ${s1.x.toFixed(1)}, ${s1.z.toFixed(1)})`);
await p.screenshot({ path: `${dir}testdrive-driving.png`, timeout: 120000 });
// 5. stop, E: back by the kerb, and Vivian asks how it was
for (let i = 0; i < 40; i++) {                          // brake to a stop (S held on once stopped is reverse)
  const v = await p.evaluate(() => window.__bund.world.driving.state.v);
  if (Math.abs(v) < 0.5) break;
  await hold([v > 0 ? 'KeyS' : 'KeyW'], 0.3);
}
await p.keyboard.press('KeyE'); await p.waitForTimeout(1200);
const back = await p.evaluate(() => ({ mode: window.__bund.mode, car: window.__bund.world.huracan.group.position, sub: document.querySelector('#ride-sub .tx').innerText, park: window.__bund.life.flags.carPark }));
ok(back.mode === 'sale' && Math.abs(back.car.x - -40.6) < 0.01 && Math.abs(back.car.z - 2.86) < 0.01 && !back.park, `out: the demo car is back by the kerb, Vivian: "${back.sub}"`);
await p.keyboard.press('Digit3'); await p.waitForTimeout(3500);
mode = await p.evaluate(() => window.__bund.mode);
ok(mode === 'play', `and on foot again (mode ${mode})`);
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
process.exit(failed ? 1 : 0);
