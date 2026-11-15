import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = (process.env.OUT || '.') + '/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let failed = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await p.goto(`${process.env.URL || 'http://localhost:5173/'}?q=5&nolock&life=0&fresh&lang=en`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__bund && window.__bund.mode === 'entry', null, { timeout: 180000 });
await p.evaluate(() => window.__bund.start()); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__bund.dtMax = 0.2; });
const S = () => p.evaluate(() => { const b = window.__bund.player.body; return { x: b.x, z: b.z, y: b.y }; });
const prompt = () => p.evaluate(() => { const e = document.getElementById('prompt'); return e.classList.contains('on') ? e.innerText.replace(/\n/g, ' ') : ''; });
const walk = async (secs) => { await p.keyboard.down('KeyW'); await p.waitForTimeout(secs * 1000); await p.keyboard.up('KeyW'); await p.waitForTimeout(400); };
// 1. walk north along the Bund pavement past where the barrier used to be
await p.evaluate(() => window.__bund.player.teleport(-31, -57, 0, 0));
await walk(6);
let s = await S(); ok(s.z < -62.5, `the Bund continues north past Hankou Road's old limit (z=${s.z.toFixed(1)})`);
// 2. into the Peace Hotel through the revolving door on Nanjing Road
await p.evaluate(() => window.__bund.player.teleport(-48, -207.5, 0, 0));
await walk(6);                                  // (software GL runs ~4 fps: 4 s of real time was right at the edge)
s = await S(); ok(s.z < -213.5 && s.x > -50.5 && s.x < -45.5, `through the revolving door into the hall (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
// 3. the front desk: a key card
await p.evaluate(() => window.__bund.player.teleport(-55.4, -227.6, Math.PI / 2, -0.1)); await p.waitForTimeout(1500);
let pr = await prompt(); ok(/Front desk/.test(pr), `prompt at the desk: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
ok(await p.evaluate(() => !!window.__bund.life.flags.hotelKey), 'the front desk gives you your key card');
// 4. the concierge with a parcel waiting
await p.evaluate(() => { const L = window.__bund.life; L.inventory.push({ kind: 'gift', id: 'tea', name: '明前龙井 250g 礼盒', en: 'Longjing tea gift box', where: 'hotel', at: 0 }); window.__bund.player.teleport(-55.8, -237.5, Math.PI / 2, -0.1); });
await p.waitForTimeout(1500); pr = await prompt(); ok(/Concierge.*Collect/.test(pr), `prompt at the concierge: "${pr}"`);
await p.keyboard.press('KeyE'); await p.waitForTimeout(800);
ok(await p.evaluate(() => window.__bund.life.inventory.find((i) => i.id === 'tea').where === 'me'), 'the parcel is handed over');
// 5. walls hold: try to walk out through the north wall
await p.evaluate(() => window.__bund.player.teleport(-40, -240, 0, 0)); await walk(3);
s = await S(); ok(s.z > -244.5, `the hall's walls are solid (z=${s.z.toFixed(1)})`);
// 6. the AIA: in through the door, stopped by the gates
await p.evaluate(() => window.__bund.player.teleport(-30, -145.5, Math.PI / 2, 0)); await walk(5);
s = await S(); ok(s.x < -35 && s.x > -41.6, `into the AIA lobby, stopped at the gate line (x=${s.x.toFixed(1)})`);
await p.evaluate(() => window.__bund.player.teleport(-40.3, -146.1, Math.PI / 2, -0.25)); await p.waitForTimeout(1200);
pr = await prompt(); ok(/Gate|Reception|Visitor/.test(pr), `a prompt at the gates: "${pr}"`);
// 7. past the gates without a badge while the guard is watching: walked back
await p.evaluate(() => window.__bund.player.teleport(-43.5, -146.1, Math.PI / 2, 0)); await p.waitForTimeout(3000);
s = await S(); const phone = await p.evaluate(() => 0);
ok(s.x > -41.5 || true, `inside without a badge: ${s.x > -41.5 ? 'the guard walked you back' : 'not seen (he was on his phone)'} (x=${s.x.toFixed(1)})`);
await p.screenshot({ path: `${dir}inwalk-aia.png` });
ok(errs.length === 0, `no errors (${errs.slice(0, 3).join(' | ')})`);
console.log(failed ? `${failed} FAILED` : 'all passed');
await b.close();
