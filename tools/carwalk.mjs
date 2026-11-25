import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [lang = 'en', base = process.env.URL || 'http://localhost:5173/'] = process.argv.slice(2);
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${base}?q=4&nolock&fresh&lang=${lang}`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.25; const L = window.__bund.life; L.flags.carCurious = true; L.flags.carCuriousAt = L.clock.day * 1440 + L.clock.minute - 30; });
await p.waitForFunction(() => window.__bund.life.flags.carBuy && window.__bund.life.flags.carBuy.stage === 'lead', null, { timeout: 60000 });
ok(true, "Zhixia's card arrives");
// the phone: Zhixia's chat, add Vivian
const click = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
await p.keyboard.press('KeyP'); await p.waitForTimeout(500); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await click('#phone [data-act="app"][data-id="chats"]'); await p.waitForTimeout(400);
await click('#phone [data-act="openThread"][data-id="zhixia"]'); await p.waitForTimeout(600);
await p.screenshot({ path: `${dir}car-${lang}-card.png`, timeout: 120000 });
ok(await click('#phone [data-act="addContact"]'), 'the card has an Add button');
await p.waitForTimeout(500);
let st = await p.evaluate(() => ({ stage: window.__bund.life.flags.carBuy.stage, at: window.__bund.life.flags.carBuy.at }));
ok(st.stage === 'booked', `Vivian answers and books the demo car (${JSON.stringify(st)})`);
await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
await p.evaluate(() => { const L = window.__bund.life, at = L.flags.carBuy.at; L.clock.day = Math.floor(at / 1440); L.clock.minute = at % 1440; });
await p.waitForTimeout(1500);
// walk up to her
await p.evaluate(() => { const v = window.__bund.world.carSale; window.__bund.player.teleport(-39.4 + 2.2, 4.71 + 0.4, Math.atan2(2.2, 0.4), -0.05); });
await p.waitForTimeout(2500);
const prompt = await p.evaluate(() => document.getElementById('prompt').classList.contains('on') ? document.getElementById('prompt').innerText : '');
ok(/Vivian/.test(prompt), `prompt: "${prompt.replace(/\n/g, ' ')}"`);
await p.screenshot({ path: `${dir}car-${lang}-vivian.png`, timeout: 120000 });
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
await p.screenshot({ path: `${dir}car-${lang}-talk.png`, timeout: 120000 });
await p.keyboard.press('Digit1'); await p.waitForTimeout(1500);                       // sit in
await p.screenshot({ path: `${dir}car-${lang}-seat.png`, timeout: 120000 });
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);                          // out; she starts the engine
await p.keyboard.press('Digit2'); await p.waitForTimeout(600);                        // colours
await p.keyboard.press('Digit4'); await p.waitForTimeout(500);                        // verde
await p.keyboard.press('Digit2'); await p.waitForTimeout(500);                        // terracotta
await p.keyboard.press('Digit1'); await p.waitForTimeout(800);                        // deposit today
st = await p.evaluate(() => window.__bund.life.flags.carBuy);
ok(st.stage === 'deposit' && st.colour === 'verde', `spec and deposit: ${st.stage}, ${st.colour}/${st.interior}`);
await p.keyboard.press('Digit1'); await p.waitForTimeout(3000);
// Xinyu: plate, then finance
await p.keyboard.press('KeyP'); await p.waitForTimeout(500);
await click('#phone [data-act="decline"]'); await p.waitForTimeout(400);   // Dad might be calling right now
await click('#phone [data-act="back"]'); await p.waitForTimeout(300); await click('#phone [data-act="back"]'); await p.waitForTimeout(300);
await click('#phone [data-act="app"][data-id="chats"]'); await p.waitForTimeout(400);
await click('#phone [data-act="openThread"][data-id="vivian"]'); await p.waitForTimeout(600);
await click('#phone [data-act="decline"]'); await p.waitForTimeout(300);
await p.screenshot({ path: `${dir}car-${lang}-wechat.png`, timeout: 120000 });
await click('#phone .chip[data-act="reply"][data-i="0"]'); await p.waitForTimeout(800);   // 苏A
await click('#phone .chip[data-act="reply"][data-i="1"]'); await p.waitForTimeout(800);   // finance
st = await p.evaluate(() => window.__bund.life.flags.carBuy);
ok(st.stage === 'paid' && st.paid.how === 'finance' && st.plate.how === 'nanjing', `plate ${st.plate && st.plate.how}, paid by ${st.paid && st.paid.how}`);
await p.keyboard.press('KeyP'); await p.waitForTimeout(400);
// two weeks on
await p.evaluate(() => { const L = window.__bund.life, at = L.flags.carBuy.deliverAt + 2; L.clock.day = Math.floor(at / 1440); L.clock.minute = at % 1440; });
await p.waitForTimeout(2500);
await p.evaluate(() => window.__bund.player.teleport(-39.4 + 2.2, 4.71 + 0.4, Math.atan2(2.2, 0.4), -0.05));
await p.waitForTimeout(2000);
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500);
st = await p.evaluate(() => ({ car: window.__bund.life.flags.car, stage: window.__bund.life.flags.carBuy.stage }));
ok(st.stage === 'delivered' && st.car && st.car.plate.startsWith('苏A'), `delivered: ${JSON.stringify(st.car)}`);
await p.evaluate(() => window.__bund.player.teleport(-46.5, 5.3, Math.atan2(-(-40.6 + 46.5), -(2.86 - 5.3)), -0.12));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${dir}car-${lang}-yours.png`, timeout: 120000 });
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
